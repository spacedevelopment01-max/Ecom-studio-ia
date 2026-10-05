import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { getSubscription, syncAllowance } from "@/lib/billing";
import { assertQuota, consumeQuota, creditPack, launchPackBought, quotaView, userPlan } from "@/lib/quotas";
import { packPrice, PLANS } from "@/lib/plans";

async function subscriber(plan: "creer" | "vendre" | "dominer") {
  const u = await createUser(`q${plan}${Date.now()}${Math.random()}@test.fr`, "motdepasse-test", "Q");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
  syncAllowance(u.id);
  return u.id;
}

describe("quotas des forfaits", () => {
  it("sans forfait : aucun quota, message qui invite à choisir un forfait", async () => {
    const u = await createUser(`qfree${Date.now()}@test.fr`, "motdepasse-test", "Q");
    expect(userPlan(u.id)).toBe(null);
    expect(quotaView(u.id, "visuals").left).toBe(0);
    expect(() => assertQuota(u.id, "visuals")).toThrow(/Choisissez un forfait/);
  });

  it("décompte le mois d'abord, puis les packs ; sans double décompte ; message avec le pack adapté", async () => {
    const u = await subscriber("creer");
    expect(quotaView(u, "visuals")).toMatchObject({ included: 30, used: 0, pack: 0, left: 30 });
    consumeQuota(u, "visuals", 29, "a");
    consumeQuota(u, "visuals", 29, "a"); // reprise d'une tâche : pas de double décompte
    expect(quotaView(u, "visuals").left).toBe(1);
    creditPack(u, "visuals", "stripe:1");
    creditPack(u, "visuals", "stripe:1"); // même paiement reçu deux fois
    expect(quotaView(u, "visuals")).toMatchObject({ pack: 20, left: 21 });
    consumeQuota(u, "visuals", 3, "b");
    expect(quotaView(u, "visuals")).toMatchObject({ used: 30, pack: 18, left: 18 });
    consumeQuota(u, "visuals", 18, "c");
    expect(() => assertQuota(u, "visuals")).toThrow(/Pack Visuels/);
  });

  it("report des quotas non utilisés (Vendre), au plus un mois ; pas de report sur Créer", async () => {
    for (const [plan, expected] of [["vendre", 80], ["creer", 0]] as const) {
      const u = await subscriber(plan);
      consumeQuota(u, "visuals", plan === "vendre" ? 0 : 5, "x");
      quotaView(u, "visuals");
      // Mois suivant : on avance l'enveloppe.
      run("UPDATE wallets SET period_start = period_start - 40*86400000, period_end = period_end - 40*86400000 WHERE user_id = ?", u);
      run("UPDATE quota_usage SET period_start = period_start - 40*86400000 WHERE user_id = ?", u);
      const v = quotaView(u, "visuals");
      expect(v.rollover).toBe(expected);
      expect(v.included).toBe(PLANS[plan].quotas.visuals);
    }
  });

  it("pack Lancement : ajoute visuels, vidéos IA et UGC ; remise du forfait sur les packs", async () => {
    const u = await subscriber("dominer");
    expect(launchPackBought(u)).toBe(false);
    creditPack(u, "launch", "stripe:launch");
    expect(launchPackBought(u)).toBe(true);
    expect(quotaView(u, "aiVideos").left).toBe(10 + 5);
    expect(quotaView(u, "ugc").left).toBe(2 + 1);
    expect(packPrice("videos", "dominer")).toBe(15.92);
    expect(packPrice("videos", "vendre")).toBe(17.91);
    expect(packPrice("videos", null)).toBe(19.9);
  });
});

describe("paiements Stripe : forfait et packs", () => {
  it("abonnement à un forfait puis achat d'un pack, sans double crédit si l'événement revient", async () => {
    const { handleStripeEvent } = await import("@/lib/payments");
    const u = await createUser(`stripe${Date.now()}@test.fr`, "motdepasse-test", "S");
    handleStripeEvent({ type: "checkout.session.completed", data: { object: { id: "cs_1", client_reference_id: u.id, customer: "cus_1", subscription: "sub_1", amount_total: 79900, metadata: { kind: "subscription", plan: "vendre", billing: "year" } } } });
    const sub = getSubscription(u.id);
    expect(sub).toMatchObject({ status: "active", plan: "vendre", billing: "year", stripe_subscription_id: "sub_1" });
    expect(quotaView(u.id, "visuals").included).toBe(80);
    const pack = { type: "checkout.session.completed", data: { object: { id: "cs_2", client_reference_id: u.id, payment_status: "paid", amount_total: 1791, metadata: { kind: "pack", pack: "videos" } } } };
    handleStripeEvent(pack);
    handleStripeEvent(pack);
    expect(quotaView(u.id, "aiVideos").pack).toBe(5);
    // Événement tardif d'un ancien abonnement : sans effet.
    handleStripeEvent({ type: "customer.subscription.deleted", data: { object: { id: "sub_0", metadata: { user_id: u.id } } } });
    expect(getSubscription(u.id).status).toBe("active");
    handleStripeEvent({ type: "customer.subscription.deleted", data: { object: { id: "sub_1", metadata: { user_id: u.id } } } });
    expect(getSubscription(u.id).status).toBe("canceled");
    expect(userPlan(u.id)).toBe(null);
  });
});
