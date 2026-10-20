/**
 * Audit de stabilisation : tâches de fond. Chaque test rejoue un défaut démontré (bail perdu, reprise sans fin,
 * appel payant interrompu, annulation, dépendances, échecs invisibles).
 */
import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { all, now, one, run } from "@/lib/db";
import * as billing from "@/lib/billing";
import { alignPeriod, reserve, syncAllowance } from "@/lib/billing";
import { cancelJob, claimNext, completeJob, enqueue, failJob, getJob, JobContext, LeaseLost, pauseJob, retryJob, WORKER_ID } from "@/lib/jobs";
import { stopInterruptedPaidJob } from "@/lib/job-recovery";

const user = async () => createUser(`tf${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "T");
const T = (s: string) => `test.robust.${s}`;

describe("Tâches de fond : robustesse", () => {
  it("bail perdu : un worker dont la tâche a été reprise ailleurs s'arrête sans rien écrire, terminer ni remettre en file", async () => {
    const u = await user();
    const j = enqueue({ userId: u.id, type: T("lease"), payload: {} });
    const mine = claimNext([T("lease")])!;
    const ctx = new JobContext(mine);
    run("UPDATE jobs SET locked_by = 'autre-worker' WHERE id = ?", j.id);
    expect(() => ctx.progress(0.5, "x")).toThrow(LeaseLost);
    expect(() => ctx.save("etape", 1)).toThrow(LeaseLost);
    completeJob(j.id, { by: "moi" });
    failJob(getJob(j.id)!, new Error("transitoire"));
    const after = getJob(j.id)!;
    expect(after.status).toBe("running");
    expect(after.locked_by).toBe("autre-worker");
    expect(after.result).toBeNull();
    expect(after.checkpoint).not.toMatch(/etape/);
  });

  it("reprise après plantage bornée par le nombre d'essais : échec visible au lieu d'une boucle « en cours »", async () => {
    const u = await user();
    const j = enqueue({ userId: u.id, type: T("crash"), payload: {}, maxAttempts: 3 });
    run("UPDATE jobs SET status='running', attempts=3, locked_by='mort', locked_until=? WHERE id=?", now() - 1000, j.id);
    expect(claimNext([T("crash")])).toBeNull();
    const after = getJob(j.id)!;
    expect(after.status).toBe("failed");
    expect(after.error).toMatch(/Interrompue à répétition/);
    // Sous la limite : reprise normale, marquée comme reprise.
    const k = enqueue({ userId: u.id, type: T("crash"), payload: {}, maxAttempts: 3 });
    run("UPDATE jobs SET status='running', attempts=1, locked_by='mort', locked_until=? WHERE id=?", now() - 1000, k.id);
    const again = claimNext([T("crash")])!;
    expect(again.id).toBe(k.id);
    expect(again.recovered).toBe(true);
    expect(again.locked_by).toBe(WORKER_ID);
  });

  it("appel payant interrompu : jamais relancé d'office ; réservation réglée (incertaine), échec expliqué, notification", async () => {
    const u = await user();
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'dominer', billing = 'month' WHERE user_id = ?", u.id);
    alignPeriod(u.id, Date.now());
    syncAllowance(u.id);
    const j = enqueue({ userId: u.id, type: T("paid"), label: "Logo", payload: {} });
    const rid = reserve(u.id, 500_000, { task: "image", provider: "openai", model: "m", jobId: j.id });
    run("UPDATE jobs SET status='running', attempts=1, locked_by='mort', locked_until=? WHERE id=?", now() - 1000, j.id);
    const job = claimNext([T("paid")])!;
    expect(job.recovered).toBe(true);
    expect(stopInterruptedPaidJob(job)).toBe(true);
    expect(one<{ status: string }>("SELECT status FROM ai_reservations WHERE id = ?", rid)!.status).toBe("uncertain");
    const after = getJob(j.id)!;
    expect(after.status).toBe("failed");
    expect(after.error).toMatch(/Interrompue pendant un appel IA payant/);
    expect(all<{ title: string; level: string }>("SELECT title, level FROM notifications WHERE user_id = ?", u.id)).toEqual([{ title: "Échec : Logo", level: "error" }]);
    // Sans réservation ouverte : reprise normale.
    const k = enqueue({ userId: u.id, type: T("paid"), payload: {} });
    run("UPDATE jobs SET status='running', attempts=1, locked_by='mort', locked_until=? WHERE id=?", now() - 1000, k.id);
    expect(stopInterruptedPaidJob(claimNext([T("paid")])!)).toBe(false);
  });

  it("« Arrêter » annule aussi les sous-tâches en cours ; une tâche en pause peut être annulée ; la pause gagne les sous-tâches en cours", async () => {
    const u = await user();
    const parent = enqueue({ userId: u.id, type: T("parent"), payload: {} });
    const child = enqueue({ userId: u.id, type: T("child"), payload: {}, parentId: parent.id });
    run("UPDATE jobs SET status='running' WHERE id IN (?,?)", parent.id, child.id);
    cancelJob(parent.id);
    expect(getJob(child.id)!.status).toBe("cancelled");
    const p2 = enqueue({ userId: u.id, type: T("parent"), payload: {} });
    const c2 = enqueue({ userId: u.id, type: T("child"), payload: {}, parentId: p2.id });
    run("UPDATE jobs SET status='running' WHERE id IN (?,?)", p2.id, c2.id);
    pauseJob(p2.id);
    expect(getJob(c2.id)!.status).toBe("paused");
    cancelJob(p2.id);
    expect(getJob(p2.id)!.status).toBe("cancelled");
  });

  it("dépendances : relancer une étape échouée débloque celles qui l'attendaient ; un prérequis bloqué bloque", async () => {
    const u = await user();
    const pre = enqueue({ userId: u.id, type: T("pre"), payload: {} });
    const wait = enqueue({ userId: u.id, type: T("wait"), payload: {}, dependsOn: [pre.id] });
    run("UPDATE jobs SET status='failed' WHERE id=?", pre.id);
    expect(claimNext([T("wait")])).toBeNull();
    expect(getJob(wait.id)!.status).toBe("blocked");
    retryJob(pre.id);
    expect(getJob(wait.id)!.status).toBe("queued");
    const third = enqueue({ userId: u.id, type: T("third"), payload: {}, dependsOn: [wait.id] });
    run("UPDATE jobs SET status='blocked' WHERE id=?", wait.id);
    expect(claimNext([T("third")])).toBeNull();
    expect(getJob(third.id)!.status).toBe("blocked");
  });

  it("même clé d'idempotence : une seule tâche", async () => {
    const u = await user();
    const key = `cle-${Math.random()}`;
    const a = enqueue({ userId: u.id, type: T("idem"), payload: {}, idempotencyKey: key });
    const b = enqueue({ userId: u.id, type: T("idem"), payload: {}, idempotencyKey: key });
    expect(b.id).toBe(a.id);
    expect(all("SELECT id FROM jobs WHERE idempotency_key = ?", a.idempotency_key)).toHaveLength(1);
  });
});
