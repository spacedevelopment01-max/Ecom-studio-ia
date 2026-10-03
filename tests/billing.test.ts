import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { assertCanSpend, balance, creditTopup, EUR, getSubscription, monthlyAllowanceMicro, monthlyPriceEur, recordUsage, syncAllowance } from "@/lib/billing";

describe("offre et enveloppe IA", () => {
  it("applique les tarifs : 49,90 € puis 40 € par boutique supplémentaire, 1/3 vers l'IA", () => {
    expect(monthlyPriceEur(1)).toBe(49.9);
    expect(monthlyPriceEur(3)).toBe(129.9);
    expect(monthlyAllowanceMicro(1) / EUR).toBeCloseTo(16.63, 2);
  });

  it("recharge par multiples de 10 € dont 50 % à l'IA, alerte à 80 %, pause à 0", async () => {
    const u = await createUser(`b${Date.now()}@test.fr`, "motdepasse-test", "B");
    expect(() => creditTopup(u.id, 15, "x")).toThrow();
    expect(balance(u.id).available).toBe(0);
    expect(() => assertCanSpend(u.id, 1000)).toThrow();
    creditTopup(u.id, 20, "pay_1");
    expect(balance(u.id).available).toBe(10 * EUR);
    recordUsage({ userId: u.id, task: "copywriting", provider: "anthropic", model: "m", unit: "tokens", inputUnits: 1, outputUnits: 1, costMicro: 8.5 * EUR, estimated: false, idempotencyKey: "u1" });
    recordUsage({ userId: u.id, task: "copywriting", provider: "anthropic", model: "m", unit: "tokens", inputUnits: 1, outputUnits: 1, costMicro: 8.5 * EUR, estimated: false, idempotencyKey: "u1" });
    const b = balance(u.id);
    expect(b.available).toBe(1.5 * EUR); // la même consommation n'est jamais débitée deux fois
    expect(b.alert).toBe(true);
  });

  it("l'activation d'un abonnement ajoute l'enveloppe mensuelle", async () => {
    const u = await createUser(`c${Date.now()}@test.fr`, "motdepasse-test", "C");
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'manual', stores = 2 WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    expect(balance(u.id).available).toBe(monthlyAllowanceMicro(2));
  });
});
