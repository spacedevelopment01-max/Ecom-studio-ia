/**
 * Le propriétaire (administrateur) teste le studio avec ses propres clés : il n'est jamais bridé comme une
 * découverte gratuite (budget IA de 1,50 €, pas d'images ni de vidéos IA), sinon le studio bascule en silence
 * sur le moteur local et le rendu s'effondre.
 */
import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { aiActiveFor, hasAiCredits } from "@/lib/ai/access";
import { assertCanSpend, EUR } from "@/lib/billing";
import { assertQuota, userPlan } from "@/lib/quotas";

const mail = (t: string) => `owner-${t}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.fr`;

describe("compte propriétaire", () => {
  it("budget de découverte épuisé : l'IA reste active, images et vidéos permises, aucun plafond", async () => {
    const admin = await createUser(mail("a"), "motdepasse-test", "Admin");
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    hasAiCredits(admin.id); // crée le portefeuille
    run("UPDATE wallets SET monthly_allowance = 0, monthly_used = 0, topup_balance = 0 WHERE user_id = ?", admin.id);
    expect(hasAiCredits(admin.id)).toBe(false);
    expect(aiActiveFor(admin.id)).toBe(true);
    expect(userPlan(admin.id)).toBe("dominer");
    expect(() => assertCanSpend(admin.id, 5 * EUR)).not.toThrow();
    expect(() => assertQuota(admin.id, "visuals", 10_000)).not.toThrow();
  });

  it("client en découverte : toujours limité", async () => {
    const u = await createUser(mail("c"), "motdepasse-test", "Client");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    expect(userPlan(u.id)).toBeNull();
    expect(() => assertCanSpend(u.id, 50 * EUR)).toThrow();
  });
});
