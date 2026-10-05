import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { assertCanSpend, balance, creditTopup, CREATION_BUDGET_EUR, EUR, getSubscription, monthlyAllowanceMicro, monthlyPriceEur, recordUsage, syncAllowance } from "@/lib/billing";

describe("forfaits et budget IA caché", () => {
  it("prix mensuel du forfait (équivalent mensuel en annuel) et budget IA caché du forfait", () => {
    expect(monthlyPriceEur({ plan: "creer", billing: "month" })).toBe(49.9);
    expect(monthlyPriceEur({ plan: "vendre", billing: "year" })).toBeCloseTo(66.58, 2);
    expect(monthlyPriceEur({ plan: null, billing: null })).toBe(49.9); // ancien abonnement → « Créer »
    expect(monthlyAllowanceMicro({ status: "active", plan: "dominer" } as any) / EUR).toBe(45);
    expect(monthlyAllowanceMicro({ status: "none", plan: "dominer" } as any)).toBe(0);
  });

  it("découverte gratuite : petit budget unique ; une consommation n'est jamais débitée deux fois", async () => {
    const u = await createUser(`b${Date.now()}@test.fr`, "motdepasse-test", "B");
    expect(balance(u.id).available).toBe(1.5 * EUR);
    expect(() => assertCanSpend(u.id, 2 * EUR)).toThrow(/limite d'utilisation équitable/);
    creditTopup(u.id, 20, "pay_1"); // ancienne recharge : 50 % au budget
    expect(balance(u.id).available).toBe(11.5 * EUR);
    recordUsage({ userId: u.id, task: "copywriting", provider: "anthropic", model: "m", unit: "tokens", inputUnits: 1, outputUnits: 1, costMicro: 8.5 * EUR, estimated: false, idempotencyKey: "u1" });
    recordUsage({ userId: u.id, task: "copywriting", provider: "anthropic", model: "m", unit: "tokens", inputUnits: 1, outputUnits: 1, costMicro: 8.5 * EUR, estimated: false, idempotencyKey: "u1" });
    expect(balance(u.id).available).toBe(3 * EUR);
  });

  it("l'activation d'un forfait ajoute son budget mensuel et, une seule fois, le budget de création de la boutique", async () => {
    const u = await createUser(`c${Date.now()}@test.fr`, "motdepasse-test", "C");
    const before = balance(u.id).available;
    run("UPDATE subscriptions SET status = 'manual', plan = 'vendre' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    expect(balance(u.id).available).toBe(before + 34 * EUR + CREATION_BUDGET_EUR * EUR);
    syncAllowance(u.id);
    expect(balance(u.id).available).toBe(before + 34 * EUR + CREATION_BUDGET_EUR * EUR);
    expect(getSubscription(u.id).plan).toBe("vendre");
  });
});

describe("protection de la marge", () => {
  it("refuse toute génération avec un modèle sans tarif (sinon comptée 0 € hors enveloppe)", async () => {
    const { requirePrice, priceValid } = await import("@/lib/ai/config");
    expect(() => requirePrice("google", "modele-inconnu")).toThrow(/Tarif inconnu/);
    expect(requirePrice("google", "veo-3.0-generate-001")).toMatchObject({ unit: "video_second" });
    expect(priceValid({ unit: "tokens", inputPerM: 3, outputPerM: 0 } as any)).toBe(false);
    expect(priceValid({ unit: "image", perImage: 0.04 })).toBe(true);
  });

  it("refuse un tarif incomplet saisi dans l'administration", async () => {
    const { setJsonSetting } = await import("@/lib/settings");
    const { requirePrice } = await import("@/lib/ai/config");
    setJsonSetting("ai.prices", { "fal:modele-gratuit": { unit: "video_second" } });
    expect(() => requirePrice("fal", "modele-gratuit")).toThrow(/Tarif inconnu/);
    setJsonSetting("ai.prices", {});
  });
});

describe("découverte gratuite, forfait et budget épuisé", () => {
  it("découverte : l'IA écrit (marque, textes) mais ne crée ni images ni vidéos ; avec un forfait, tout est ouvert ; budget épuisé : moteur local", async () => {
    const { setSetting } = await import("@/lib/settings");
    const { runForUser } = await import("@/lib/ai/access");
    const { llmConfigured } = await import("@/lib/ai/llm");
    const { imageProviderAvailable } = await import("@/lib/ai/media-providers");
    setSetting("provider.anthropic.apiKey", "sk-test", true);
    setSetting("provider.google.apiKey", "g-test", true);
    const free = await createUser(`essai${Date.now()}@test.fr`, "motdepasse-test", "Essai");
    expect(await runForUser(free.id, async () => llmConfigured())).toBe(true);
    expect(await runForUser(free.id, async () => imageProviderAvailable())).toBe(null);
    run("UPDATE subscriptions SET status = 'manual', plan = 'creer' WHERE user_id = ?", free.id);
    syncAllowance(free.id);
    expect(await runForUser(free.id, async () => imageProviderAvailable())).not.toBe(null);
    run("UPDATE wallets SET monthly_used = monthly_allowance, topup_balance = 0 WHERE user_id = ?", free.id);
    expect(await runForUser(free.id, async () => llmConfigured())).toBe(false);
    expect(await runForUser(free.id, async () => imageProviderAvailable())).toBe(null);
    setSetting("provider.anthropic.apiKey", null, true);
    setSetting("provider.google.apiKey", null, true);
  });
});

describe("avertissement avant une action IA gourmande", () => {
  it("estime la part des crédits et classe l'action (légère, gourmande, insuffisante)", async () => {
    const { estimateFor, estimateMicro } = await import("@/lib/ai/estimate");
    const u = await createUser(`estim${Date.now()}@test.fr`, "motdepasse-test", "Estimation");
    creditTopup(u.id, 40, "pay_estim"); // 20 € de budget IA (+ 1,5 € de découverte)
    expect(estimateMicro("ugc", { beats: 3 })).toBeGreaterThan(estimateMicro("image"));
    expect(estimateMicro("ugc", { beats: 5 })).toBeGreaterThan(estimateMicro("ugc", { beats: 2 }));
    const ugc = estimateFor(u.id, "ugc", { beats: 3 });
    expect(["heavy", "very-heavy"]).toContain(ugc.level);
    expect(ugc.pctOfAvailable).toBeGreaterThan(25);
    expect(estimateFor(u.id, "ugc", { beats: 5 }).leftAfterPct).toBeLessThan(ugc.leftAfterPct);
    const poor = await createUser(`pauvre${Date.now()}@test.fr`, "motdepasse-test", "Sans crédit"); // découverte seule (1,5 €)
    expect(estimateFor(poor.id, "ugc", { beats: 3 }).level).toBe("insufficient");
  });
});
