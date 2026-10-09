/**
 * Garde-fou budgétaire de l'IA (correctifs post-audit) — aucun appel réel :
 *  - budget = 40 % du prix mensuel HT du forfait (annuel compris), sans enveloppe de création en plus ;
 *  - packs et recharges : budget distinct = 50 % de leur prix HT payé ;
 *  - réservation atomique du coût maximal avant tout appel, appels simultanés, estimation trop basse,
 *    délai dépassé, refus du fournisseur, appel facturé après une erreur, budget épuisé, reprise d'un worker,
 *    changement de forfait, séparation des comptes, mise en conformité des anciens portefeuilles ;
 *  - jamais de solde négatif ; aucun passe-droit pour l'administrateur.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Mode = "ok" | "slow" | "status429" | "timeout" | "huge";
const llm: { mode: Mode; calls: number; waiting: (() => void)[] } = { mode: "ok", calls: 0, waiting: [] };
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      llm.calls++;
      const done = { model: params.model, stop_reason: "end_turn", content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1000, output_tokens: 500 } };
      const finalMessage = async () => {
        if (llm.mode === "slow") await new Promise<void>((r) => llm.waiting.push(r));
        if (llm.mode === "status429") throw Object.assign(new Error("rate limited"), { status: 429 });
        if (llm.mode === "timeout") throw new Error("Request timed out.");
        // Estimation trop basse : le fournisseur facture bien plus que le maximum réservé (cas anormal).
        if (llm.mode === "huge") return { ...done, usage: { input_tokens: 40_000_000, output_tokens: 10 } };
        return done;
      };
      return { finalMessage };
    }
    messages = { stream: (p: any) => this.stream(p) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "openai" ? null : "cle-de-test-1234567890abcdef") }));

let fetchImpl: (url: string) => Promise<Response> = async () => new Response("{}", { status: 500 });
let fetchCalls = 0;
beforeEach(() => {
  llm.mode = "ok";
  llm.calls = 0;
  fetchCalls = 0;
  vi.stubGlobal("fetch", async (url: string) => {
    fetchCalls++;
    return fetchImpl(String(url));
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("budget IA : règle des 40 % / 50 % et réservations", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, one, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { EUR, balance, monthlyAllowanceMicro, syncAllowance, alignPeriod, reserve, settle, release, settleUncertain, sweepStaleReservations, reconcileReservation, creditPackBudget, adminAdjust, RESERVATION_TTL_MS } = billing;
  const { llmText } = await import("@/lib/ai/llm");
  const { ambianceImage } = await import("@/lib/ai/media-providers");
  const { runForUser } = await import("@/lib/ai/access");
  const { handleStripeEvent } = await import("@/lib/payments");

  async function client(plan: "creer" | "vendre" | "dominer" | null, billingMode: "month" | "year" = "month") {
    const u = await createUser(`budget${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "B");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = ?, plan = ?, billing = ? WHERE user_id = ?", plan ? "active" : "none", plan, billingMode, u.id);
    alignPeriod(u.id, Date.now());
    syncAllowance(u.id);
    return u;
  }
  const wallet = (uid: string) => one<{ monthly_allowance: number; monthly_used: number; topup_balance: number; reserved: number }>("SELECT * FROM wallets WHERE user_id = ?", uid)!;
  const reservations = (uid: string) => all<{ id: string; amount: number; status: string; actual: number | null }>("SELECT * FROM ai_reservations WHERE user_id = ? ORDER BY created_at", uid);
  const text = (uid: string, usageKey?: string) => runForUser(uid, () => llmText({ task: "copywriting", userId: uid, system: "Rédige.", prompt: "Une phrase sur le produit.", usageKey }));
  /** Disponible fixé à `micro` (budget mensuel seul). */
  const setAvailable = (uid: string, micro: number) => run("UPDATE wallets SET monthly_used = monthly_allowance - ?, topup_balance = 0 WHERE user_id = ?", micro, uid);

  it("budget mensuel = 40 % du prix HT ; annuel = 40 % de l'équivalent mensuel HT ; ≤ 40 % pour toutes les formules", () => {
    const cases = [
      ["creer", "month", 49.9], ["creer", "year", 499 / 12], ["vendre", "month", 79.9], ["vendre", "year", 799 / 12], ["dominer", "month", 99.9], ["dominer", "year", 999 / 12],
    ] as const;
    for (const [plan, b, ttc] of cases) {
      const m = monthlyAllowanceMicro({ status: "active", plan, billing: b });
      // Équivalent mensuel arrondi au centime (prix affiché), jamais au-dessus du prix réel.
      expect(m).toBe(Math.floor(0.4 * (billing.monthlyPriceEur({ plan, billing: b }) / 1.2) * EUR));
      expect(m / EUR).toBeLessThanOrEqual(0.4 * (ttc / 1.2));
    }
    expect(monthlyAllowanceMicro({ status: "none", plan: "dominer", billing: "month" })).toBe(0);
  });

  it("première création : aucune enveloppe en plus du budget mensuel ; découverte : 0 €", async () => {
    const u = await client("vendre");
    expect(balance(u.id).available).toBe(Math.floor(0.4 * (79.9 / 1.2) * EUR));
    expect(one("SELECT 1 FROM ledger WHERE user_id = ? AND type IN ('creation','discovery')", u.id)).toBeFalsy();
    const free = await client(null);
    expect(balance(free.id).available).toBe(0);
    await expect(text(free.id)).rejects.toThrow(/découverte gratuite/);
    expect(llm.calls).toBe(0);
  });

  it("abonnement annuel : budget mensuel plus bas (équivalent mensuel remisé)", async () => {
    const m = await client("vendre", "month");
    const y = await client("vendre", "year");
    expect(wallet(y.id).monthly_allowance).toBeLessThan(wallet(m.id).monthly_allowance);
    expect(wallet(y.id).monthly_allowance).toBeLessThanOrEqual(Math.floor(0.4 * (799 / 12 / 1.2) * EUR));
    expect(wallet(y.id).monthly_allowance).toBeGreaterThan(Math.floor(0.4 * (799 / 12 / 1.2) * EUR) - EUR / 100);
  });

  it("appel réussi : coût maximal réservé avant l'envoi, puis réglé au coût réel ; réservation rendue", async () => {
    const u = await client("creer");
    const before = balance(u.id).available;
    await text(u.id);
    const [r] = reservations(u.id);
    expect(r.status).toBe("settled");
    expect(r.actual!).toBeLessThan(r.amount); // le maximum couvrait le coût réel
    expect(wallet(u.id).reserved).toBe(0);
    expect(balance(u.id).available).toBe(before - r.actual!);
  });

  it("appels simultanés : seuls ceux dont le coût maximal tient dans le reste partent ; jamais de dépassement", async () => {
    const u = await client("creer");
    await text(u.id);
    const max = reservations(u.id)[0].amount;
    // Reste = 2 maximums + le seuil minimal d'IA (0,50 €) − 1 µ€ : exactement deux appels peuvent partir.
    setAvailable(u.id, 2 * max + 500_000 - 1);
    llm.mode = "slow";
    llm.calls = 0;
    const runs = Array.from({ length: 5 }, () => text(u.id).then(() => "ok", (e) => String(e.message)));
    await new Promise((r) => setTimeout(r, 50));
    expect(llm.calls).toBe(2); // deux réservations seulement : les trois autres refusées avant l'envoi
    expect(reservations(u.id).filter((r) => r.status === "held")).toHaveLength(2);
    expect(balance(u.id).available).toBeLessThan(500_000); // sous le seuil minimal : plus aucun appel ne part
    for (const r of llm.waiting.splice(0)) r();
    const out = await Promise.all(runs);
    expect(out.filter((o) => o === "ok")).toHaveLength(2);
    expect(out.filter((o) => /limite d'utilisation équitable|budget IA de votre forfait est épuisé/.test(o))).toHaveLength(3);
    expect(wallet(u.id).reserved).toBe(0);
    expect(wallet(u.id).monthly_used).toBeLessThanOrEqual(wallet(u.id).monthly_allowance);
  });

  it("réservations concurrentes : le reste ne peut jamais être réservé deux fois", async () => {
    const u = await client("creer");
    setAvailable(u.id, 2_500_000);
    const got = Array.from({ length: 5 }, () => {
      try {
        return reserve(u.id, 1_000_000, { task: "t", provider: "p", model: "m" });
      } catch {
        return null;
      }
    });
    expect(got.filter(Boolean)).toHaveLength(2);
    expect(wallet(u.id).reserved).toBe(2_000_000);
    expect(balance(u.id).available).toBe(500_000);
    for (const r of got) if (r) settle(r, 1_000_000, `ref-${r}`, "test");
    expect(balance(u.id).available).toBe(500_000);
    expect(wallet(u.id).reserved).toBe(0);
  });

  it("budget épuisé : l'appel est bloqué avant l'envoi (coût maximal non couvert)", async () => {
    const u = await client("creer");
    setAvailable(u.id, 1000); // 0,001 €
    await expect(text(u.id)).rejects.toThrow(/limite d'utilisation équitable|budget IA de votre forfait est épuisé/);
    expect(llm.calls).toBe(0);
    expect(llm.calls).toBe(0);
    expect(reservations(u.id)).toHaveLength(0);
  });

  it("refus du fournisseur (429) : rien n'est facturé, la réservation est rendue", async () => {
    const u = await client("creer");
    const before = balance(u.id).available;
    llm.mode = "status429";
    await expect(text(u.id)).rejects.toThrow();
    expect(reservations(u.id).every((r) => r.status === "released")).toBe(true);
    expect(balance(u.id).available).toBe(before);
  });

  it("délai dépassé : résultat incertain, coût maximal retenu par prudence ; réconciliation avec la facture", async () => {
    const u = await client("creer");
    const before = balance(u.id).available;
    llm.mode = "timeout";
    await expect(text(u.id)).rejects.toThrow(/timed out/);
    const [r] = reservations(u.id);
    expect(r.status).toBe("uncertain");
    expect(balance(u.id).available).toBe(before - r.amount);
    expect(one("SELECT 1 FROM ledger WHERE user_id = ? AND ref = ?", u.id, `uncertain:${r.id}`)).toBeTruthy();
    // La facture du fournisseur montre 0,01 € : la différence est rendue.
    reconcileReservation(r.id, 10_000);
    expect(balance(u.id).available).toBe(before - 10_000);
    expect(reservations(u.id)[0].status).toBe("reconciled");
  });

  it("estimation trop basse : débit limité au disponible (jamais négatif), dépassement inscrit à part", async () => {
    const u = await client("creer");
    llm.mode = "huge";
    await text(u.id);
    const w = wallet(u.id);
    expect(w.monthly_used).toBeLessThanOrEqual(w.monthly_allowance);
    expect(w.topup_balance).toBeGreaterThanOrEqual(0);
    expect(balance(u.id).available).toBe(0);
    expect(one("SELECT 1 FROM ledger WHERE user_id = ? AND type = 'overrun'", u.id)).toBeTruthy();
    // Budget épuisé : plus aucun appel ne part.
    llm.mode = "ok";
    const calls = llm.calls;
    await expect(text(u.id)).rejects.toThrow();
    expect(llm.calls).toBe(calls);
  });

  it("image : refus du fournisseur → rendu ; image facturée mais inexploitable (réponse sans image) → coût maximal retenu", async () => {
    const u = await client("creer");
    const ctx = { userId: u.id, projectId: "p-test" };
    const before = balance(u.id).available;
    fetchImpl = async () => new Response("quota", { status: 429 });
    await expect(runForUser(u.id, () => ambianceImage(ctx, { prompt: "atelier", aspect: "1:1" }))).rejects.toThrow();
    expect(reservations(u.id).at(-1)!.status).toBe("released");
    expect(balance(u.id).available).toBe(before);
    // Réponse 200 sans image : le fournisseur a travaillé (et facturé) — résultat incertain, maximum retenu.
    fetchImpl = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [] } }] }), { status: 200 });
    await expect(runForUser(u.id, () => ambianceImage(ctx, { prompt: "atelier", aspect: "1:1" }))).rejects.toThrow(/pas renvoyé d'image/);
    const r = reservations(u.id).at(-1)!;
    expect(r.status).toBe("uncertain");
    expect(balance(u.id).available).toBe(before - r.amount);
  });

  it("reprise de worker : réservation orpheline traitée comme incertaine ; la tâche relancée réserve à nouveau", async () => {
    const u = await client("creer");
    const rid = reserve(u.id, 200_000, { task: "copywriting", provider: "anthropic", model: "m" });
    expect(wallet(u.id).reserved).toBe(200_000);
    run("UPDATE ai_reservations SET created_at = ? WHERE id = ?", Date.now() - RESERVATION_TTL_MS - 1000, rid);
    sweepStaleReservations(u.id);
    expect(reservations(u.id)[0].status).toBe("uncertain");
    expect(wallet(u.id).reserved).toBe(0);
    await text(u.id);
    expect(reservations(u.id).at(-1)!.status).toBe("settled");
    // Même usage rejoué (même clé) : déjà compté, la nouvelle réservation est rendue sans second débit.
    await text(u.id, "cle-reprise");
    const after = balance(u.id).available;
    await text(u.id, "cle-reprise");
    expect(balance(u.id).available).toBe(after);
    expect(reservations(u.id).at(-1)!.status).toBe("released");
  });

  it("recharge / pack : budget distinct de 50 % du prix HT payé, une seule fois par paiement", async () => {
    const u = await client("creer");
    const before = balance(u.id).available;
    const evt = { id: `evt_${Date.now()}`, type: "checkout.session.completed", created: Math.floor(Date.now() / 1000), data: { object: { id: `cs_${Date.now()}`, client_reference_id: u.id, payment_status: "paid", amount_total: 1490, metadata: { kind: "pack", pack: "visuals" } } } };
    await handleStripeEvent(evt);
    await handleStripeEvent({ ...evt, id: `${evt.id}b` }); // même paiement relivré sous un autre événement
    expect(balance(u.id).available - before).toBe(Math.floor(0.5 * (14.9 / 1.2) * EUR));
    expect(wallet(u.id).topup_balance).toBe(Math.floor(0.5 * (14.9 / 1.2) * EUR));
    creditPackBudget(u.id, 14.9, "ref-x", "test");
    creditPackBudget(u.id, 14.9, "ref-x", "test");
    expect(wallet(u.id).topup_balance).toBe(2 * Math.floor(0.5 * (14.9 / 1.2) * EUR));
  });

  it("changement de forfait en cours de période : budget au prorata ; résiliation : plus d'IA", async () => {
    const u = await client("creer");
    const w = wallet(u.id);
    // Moitié de la période écoulée.
    const span = 30 * 86_400_000;
    run("UPDATE wallets SET period_start = ?, period_end = ? WHERE user_id = ?", Date.now() - span / 2, Date.now() + span / 2, u.id);
    run("UPDATE subscriptions SET plan = 'dominer' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    const target = monthlyAllowanceMicro({ status: "active", plan: "dominer", billing: "month" });
    const got = wallet(u.id).monthly_allowance;
    expect(got).toBeGreaterThan(w.monthly_allowance);
    expect(got).toBeLessThan(target);
    expect(Math.abs(got - (w.monthly_allowance + (target - w.monthly_allowance) / 2))).toBeLessThan(EUR / 100);
    run("UPDATE subscriptions SET status = 'canceled' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    await expect(text(u.id)).rejects.toThrow();
    expect(llm.calls).toBe(0);
  });

  it("séparation des comptes : la réservation et le débit d'un compte ne touchent jamais un autre", async () => {
    const a = await client("creer");
    const b = await client("creer");
    const bBefore = wallet(b.id);
    const rid = reserve(a.id, 300_000, { task: "t", provider: "p", model: "m" });
    expect(wallet(b.id).reserved).toBe(0);
    settle(rid, 120_000, "ref-a", "test");
    expect(wallet(b.id)).toEqual(bBefore);
    expect(wallet(a.id).monthly_used).toBe(120_000);
    // Une réservation déjà réglée n'est jamais rejouée.
    settle(rid, 999_999, "ref-a2", "test");
    release(rid);
    settleUncertain(rid, "x");
    expect(wallet(a.id).monthly_used).toBe(120_000);
  });

  it("anciens portefeuilles : budget ramené à 40 % du HT et enveloppe de création retirée (relevé conservé)", async () => {
    const u = await client("vendre");
    run("UPDATE wallets SET monthly_allowance = ?, topup_balance = ?, rule_version = 0 WHERE user_id = ?", 34 * EUR, 12 * EUR, u.id);
    const b = balance(u.id);
    expect(wallet(u.id).monthly_allowance).toBe(Math.floor(0.4 * (79.9 / 1.2) * EUR));
    expect(wallet(u.id).topup_balance).toBe(0);
    expect(b.available).toBeLessThanOrEqual(0.4 * (79.9 / 1.2) * EUR);
    expect(all("SELECT 1 FROM ledger WHERE user_id = ? AND type = 'adjustment'", u.id).length).toBe(2);
  });

  it("administrateur : aucun passe-droit (sans forfait, pas d'IA ; pas de budget ajouté à la main)", async () => {
    const admin = await client(null);
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    await expect(text(admin.id)).rejects.toThrow(/découverte gratuite/);
    expect(llm.calls).toBe(0);
    expect(() => adminAdjust(admin.id, 5 * EUR, "geste")).toThrow(/ne peut pas être augmenté/);
    const u = await client("creer");
    const before = balance(u.id).available;
    adminAdjust(u.id, -1 * EUR, "retrait");
    expect(balance(u.id).available).toBe(before - EUR);
  });
});
