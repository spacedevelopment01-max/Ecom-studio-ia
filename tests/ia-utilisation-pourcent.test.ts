import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { creditTopup, EUR, getSubscription, recordUsage, reserve, settle, syncAllowance } from "@/lib/billing";
import { aiUsage } from "@/lib/ai/access";

const spend = (userId: string, eur: number, key: string) =>
  recordUsage({ userId, task: "copywriting", provider: "anthropic", model: "m", unit: "tokens", inputUnits: 1, outputUnits: 1, costMicro: eur * EUR, estimated: false, idempotencyKey: key });

describe("Barres d'utilisation de l'IA (forfait et crédits achetés, en %, sans prix)", () => {
  it("sans forfait : aucune barre (l'IA n'est pas incluse)", async () => {
    const u = await createUser(`pct0${Date.now()}@test.fr`, "motdepasse-test", "P");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    expect(aiUsage(u.id)).toBeNull();
  });

  it("forfait : 0 %, puis la part utilisée ; crédits achetés dans une seconde barre ; pause quand les deux sont épuisés", async () => {
    const u = await createUser(`pct1${Date.now()}@test.fr`, "motdepasse-test", "P");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    getSubscription(u.id); // crée l'abonnement (découverte) avant de l'activer
    run("UPDATE subscriptions SET status = 'manual', plan = 'creer' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    expect(aiUsage(u.id)).toEqual({ plan: { used: 0 }, credits: null, paused: false });
    // Créer : 49,90 € TTC → 41,58 € HT → budget 16,63 € ; la moitié consommée ≈ 50 %.
    spend(u.id, 8.3, "a");
    expect(aiUsage(u.id)).toEqual({ plan: { used: 50 }, credits: null, paused: false });
    // Crédits achetés : seconde barre, intacte tant que le forfait n'est pas épuisé.
    creditTopup(u.id, 24, "pay_pct"); // 10 € de budget
    expect(aiUsage(u.id)).toEqual({ plan: { used: 50 }, credits: { used: 0 }, paused: false });
    // Forfait épuisé : la barre du forfait est à 100 %, les crédits prennent le relais (l'IA continue).
    spend(u.id, 8.33 + 5, "b");
    const mid = aiUsage(u.id)!;
    expect(mid.plan.used).toBe(100);
    expect(mid.credits!.used).toBe(50);
    expect(mid.paused).toBe(false);
    // Crédits épuisés aussi : les deux barres à 100 %, l'IA en pause.
    spend(u.id, 5, "c");
    expect(aiUsage(u.id)).toEqual({ plan: { used: 100 }, credits: { used: 100 }, paused: true });
  });

  it("une action en cours ne fait pas bouger la barre : seul le coût réel compte, dès la fin de l'appel", async () => {
    const u = await createUser(`pct2${Date.now()}@test.fr`, "motdepasse-test", "P");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'manual', plan = 'creer' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    spend(u.id, 8.3, "d");
    // Réserve du coût maximal (environ 25 % du budget) pendant l'appel : la barre reste à 50 %.
    const r = reserve(u.id, 4 * EUR, { task: "copywriting", provider: "anthropic", model: "m" });
    expect(aiUsage(u.id)!.plan.used).toBe(50);
    // Fin de l'appel : seul le coût réel (environ 1 %) est compté, sans retour en arrière ensuite.
    settle(r, 0.17 * EUR, null, "test");
    expect(aiUsage(u.id)!.plan.used).toBe(51);
  });
});
