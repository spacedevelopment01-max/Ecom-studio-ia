import { afterAll, describe, expect, it, vi } from "vitest";
const isolated = vi.hoisted(() => {
  const fs = process.getBuiltinModule("fs"), os = process.getBuiltinModule("os"), path = process.getBuiltinModule("path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-test-142-billing-"));
  vi.stubEnv("DATA_DIR", dir);
  return { dir };
});
afterAll(() => {
  (globalThis as { __ecomDb?: { close(): void } }).__ecomDb?.close();
  delete (globalThis as { __ecomDb?: unknown }).__ecomDb;
  vi.unstubAllEnvs();
  process.getBuiltinModule("fs").rmSync(isolated.dir, { recursive: true, force: true });
});
import { createUser } from "@/lib/auth";
import { all, db, one, run } from "@/lib/db";
import { alignPeriod, balance, creditPackBudget, getSubscription, reconcileReservation, recordUsage, reserve, settle, settleUncertain } from "@/lib/billing";
import { withTrace } from "@/lib/ai/trace";
import { aiUsage, assertAiAllowed } from "@/lib/ai/access";
import { spawn } from "node:child_process";

let number = 0;
async function client() {
  const user = await createUser(`budget-142-${++number}@example.invalid`, "isolated-test-password", "Budget test");
  getSubscription(user.id);
  run("UPDATE subscriptions SET status='active',plan='dominer',billing='month' WHERE user_id=?", user.id);
  alignPeriod(user.id, Date.now());
  return user.id;
}
const meta = { task: "copywriting", provider: "synthetic", model: "test-rate" };
const usage = (userId: string, key: string, costMicro = 80_000) => ({ userId, ...meta, unit: "tokens" as const, costMicro, estimated: false, idempotencyKey: key });
const wallet = (uid: string) => one<{ monthly_used: number; topup_period_used: number; topup_balance: number }>("SELECT * FROM wallets WHERE user_id=?", uid)!;

describe("Mission 142 : frontières de comptabilisation", () => {
  it("récupération : aucun nouvel engagement, même si une sous-étape tente de désactiver la protection",async()=>{
    const uid=await client(),before=balance(uid);
    await withTrace({recoveryOnly:true},()=>withTrace({recoveryOnly:false},async()=>{expect(()=>reserve(uid,100_000,meta)).toThrow(/nécessite son devis/);}));
    expect(balance(uid)).toEqual(before);expect(all("SELECT id FROM ai_reservations WHERE user_id=?",uid)).toHaveLength(0);
  });
  it("incident d'écriture du débit : l'événement et le règlement sont atomiques, puis la reprise facture une seule fois", async () => {
    const uid = await client(), reservation = reserve(uid, 100_000, meta), before = balance(uid).available;
    db().exec("CREATE TRIGGER test142_debit_failure BEFORE UPDATE OF monthly_used ON wallets WHEN NEW.monthly_used > OLD.monthly_used BEGIN SELECT RAISE(ABORT,'synthetic storage incident'); END");
    try { expect(() => recordUsage(usage(uid, "atomic"), { reservationId: reservation })).toThrow(/storage incident/); }
    finally { db().exec("DROP TRIGGER test142_debit_failure"); }
    expect(all("SELECT id FROM usage_events WHERE user_id=?", uid)).toHaveLength(0);
    recordUsage(usage(uid, "atomic"), { reservationId: reservation });
    expect(wallet(uid).monthly_used).toBe(80_000);
    expect(balance(uid).available).toBe(before + 100_000 - 80_000);
  });

  it("une clé commune à deux comptes ne masque pas le coût du second", async () => {
    const first = await client(), second = await client();
    recordUsage(usage(first, "same-client-key"));
    expect(recordUsage(usage(second, "same-client-key")).dedup).toBe(false);
    expect(wallet(first).monthly_used).toBe(80_000);
    expect(wallet(second).monthly_used).toBe(80_000);
  });

  it("un callback tardif réconcilie le coût déjà retenu au lieu de perdre son règlement", async () => {
    const uid = await client(), reservation = reserve(uid, 100_000, meta);
    settleUncertain(reservation, "synthetic timeout");
    recordUsage(usage(uid, "late-result", 40_000), { reservationId: reservation });
    expect(wallet(uid).monthly_used).toBe(40_000);
    expect(one<{ status: string }>("SELECT status FROM ai_reservations WHERE id=?", reservation)?.status).toBe("reconciled");
  });

  it("la réconciliation d'une ancienne période ne rembourse pas les nouvelles dépenses mensuelles", async () => {
    const uid = await client(), reservation = reserve(uid, 100_000, meta);
    settleUncertain(reservation, "synthetic timeout before renewal");
    run("UPDATE ai_reservations SET settled_at=? WHERE id=?", Date.now() - 3600_000, reservation);
    alignPeriod(uid, Date.now() + 1);
    const current = reserve(uid, 120_000, meta);
    settle(current, 120_000, "current-period", "new period expense");
    reconcileReservation(reservation, 20_000);
    expect(wallet(uid).monthly_used).toBe(120_000);
  });

  it("la réconciliation d'une ancienne recharge rend son reste sans effacer l'usage des recharges de la nouvelle période", async () => {
    const uid = await client();
    creditPackBudget(uid, 12, "synthetic-topup", "Synthetic top-up");
    run("UPDATE wallets SET monthly_used=monthly_allowance WHERE user_id=?", uid);
    const reservation = reserve(uid, 100_000, meta);
    settleUncertain(reservation, "synthetic timeout");
    run("UPDATE ai_reservations SET settled_at=? WHERE id=?", Date.now() - 3600_000, reservation);
    alignPeriod(uid, Date.now() + 1);
    run("UPDATE wallets SET monthly_used=monthly_allowance WHERE user_id=?", uid);
    settle(reserve(uid, 120_000, meta), 120_000, "current-topup", "new period top-up expense");
    const before = wallet(uid).topup_balance;
    reconcileReservation(reservation, 20_000);
    expect(wallet(uid).topup_period_used).toBe(120_000);
    expect(wallet(uid).topup_balance).toBe(before + 80_000);
  });

  it("le plafond d'une tâche compte les engagements simultanés avant leur envoi", async () => {
    const uid = await client();
    await withTrace({ jobId: "cap-concurrent", costCapMicro: 150_000 }, async () => {
      reserve(uid, 100_000, { ...meta, jobId: "cap-concurrent" });
      expect(() => reserve(uid, 100_000, { ...meta, jobId: "cap-concurrent" })).toThrow(/plafond/);
    });
  });

  it("le coût incertain d'un premier essai reste dans le plafond de sa tâche", async () => {
    const uid = await client();
    await withTrace({ jobId: "cap-uncertain", costCapMicro: 150_000 }, async () => {
      settleUncertain(reserve(uid, 100_000, { ...meta, jobId: "cap-uncertain" }), "synthetic timeout");
      expect(() => reserve(uid, 100_000, { ...meta, jobId: "cap-uncertain" })).toThrow(/plafond/);
    });
  });
  it("un appel encore engagé à la clôture reste affecté à l'ancienne période", async () => {
    const uid = await client(), reservation = reserve(uid, 100_000, meta);
    alignPeriod(uid, Date.now() + 2);
    settle(reserve(uid, 120_000, meta), 120_000, "new-month", "new month");
    settle(reservation, 40_000, "late-old-month", "late result");
    expect(wallet(uid).monthly_used).toBe(120_000);
    expect(balance(uid).reserved).toBe(0);
    expect(one<{ actual: number }>("SELECT actual FROM ai_reservations WHERE id=?", reservation)?.actual).toBe(40_000);
  });
  it("double callback : un seul usage et débit, y compris après résultat incertain", async () => {
    const uid = await client(), reservation = reserve(uid, 100_000, meta);
    settleUncertain(reservation, "synthetic lost response");
    const first = recordUsage(usage(uid, "callback", 40_000), { reservationId: reservation });
    const duplicate = recordUsage(usage(uid, "callback", 40_000), { reservationId: reservation });
    expect(duplicate).toEqual({ eventId: first.eventId, dedup: true });
    expect(wallet(uid).monthly_used).toBe(40_000);
    expect(all("SELECT id FROM usage_events WHERE user_id=?", uid)).toHaveLength(1);
  });
  it("un règlement étranger ne touche jamais la réservation d'un autre compte", async () => {
    const a = await client(), b = await client(), reservation = reserve(a, 100_000, meta);
    expect(() => recordUsage(usage(b, "foreign-settlement"), { reservationId: reservation })).toThrow(/ne correspond pas/);
    expect(balance(a).reserved).toBe(100_000);
    expect(wallet(a).monthly_used).toBe(0);
    expect(wallet(b).monthly_used).toBe(0);
  });
  it("un budget engagé n'est pas affiché comme consommé : attente claire, puis solde rapproché", async () => {
    const uid = await client(), before = balance(uid), reservation = reserve(uid, before.available, meta);
    const view = aiUsage(uid)!;
    expect(view.plan.used).toBe(0);
    expect(view.pending).toBe(true);
    expect(view.paused).toBe(false);
    expect(() => assertAiAllowed(uid)).toThrow(/temporairement/);
    settle(reservation, 40_000, "finished", "finished");
    expect(aiUsage(uid)!.pending).toBe(false);
    expect(wallet(uid).monthly_used).toBe(40_000);
  });
  it("la portée native d'une étape est conservée même sans jobId répété par l'adaptateur", async () => {
    const uid = await client();
    await withTrace({ jobId: "implicit-scope", costCapMicro: 150_000 }, async () => {
      reserve(uid, 100_000, meta);
      expect(() => reserve(uid, 100_000, meta)).toThrow(/plafond/);
    });
  });
  it("un usage payé avant migration ne déclenche pas une nouvelle génération masquée par déduplication", async () => {
    const uid = await client();
    recordUsage(usage(uid,"paid-before-migration"));
    expect(()=>reserve(uid,100_000,{...meta,usageKey:"paid-before-migration"})).toThrow(/déjà été envoyée/);
    expect(balance(uid).reserved).toBe(0);
    expect(wallet(uid).monthly_used).toBe(80_000);
  });
  it("trois processus SQLite simultanés ne peuvent engager deux fois le même reste", async () => {
    const uid = await client();
    run("UPDATE wallets SET monthly_used=monthly_allowance-100000 WHERE user_id=?", uid);
    const child = () => new Promise<string>((resolve, reject) => {
      const processChild = spawn(process.execPath, ["--import", "tsx", "scripts/verify-budget-concurrency.ts", uid], { env: { ...process.env, DATA_DIR: isolated.dir }, stdio: ["ignore", "pipe", "pipe"] });
      let output = "", error = "";
      processChild.stdout.on("data", v => output += v);
      processChild.stderr.on("data", v => error += v);
      processChild.on("error", reject);
      processChild.on("exit", code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
    });
    const results = await Promise.all([child(), child(), child()]);
    expect(results.filter(x => x === "reserved")).toHaveLength(1);
    expect(results.filter(x => x === "blocked")).toHaveLength(2);
    expect(balance(uid).available).toBe(40_000);
    expect(balance(uid).reserved).toBe(60_000);
  });
});
