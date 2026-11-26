/**
 * Essai réel du 18 novembre 2026 (Atelier Vasco) : la carte de la création du site a été confirmée alors que le budget
 * d'IA du mois de la cliente ne couvrait plus son plafond ; la création s'est arrêtée en route (4,48 € dépensés pour
 * rien). Le budget restant doit couvrir le plafond AVANT la carte ; sinon rien n'est lancé ni payé, et SINA le dit au
 * client (en pourcentages, jamais en euros). Sans IA.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("la carte de prix : le budget du mois doit couvrir le plafond", async () => {
  const { run } = await import("@/lib/db");
  const { account } = await import("./conversation209-fixtures");
  const { balance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { budgetInsuffisant } = await import("@/lib/syna-agent/loop");
  const fr = <R,>(fn: () => R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  it("assez de budget : rien n'est dit ; pas assez : pas lancé, rien de payé, la recharge est proposée, sans euros", async () => {
    const u = await account();
    run("UPDATE wallets SET monthly_allowance = 43000000, monthly_used = 37000000, topup_balance = 0, reserved = 0, reserved_topup = 0 WHERE user_id = ?", u.id);
    expect(balance(u.id, null).available).toBe(6_000_000);
    expect(await fr(() => budgetInsuffisant(u.id, null, 5_000_000))).toBeNull();
    const msg = await fr(() => budgetInsuffisant(u.id, null, 16_180_000));
    expect(msg).toMatch(/^Pas lancé, rien n'est payé/);
    expect(msg).toMatch(/recharger l'IA de son projet \(Mon compte\)/);
    expect(msg).toMatch(/%/);
    expect(msg).not.toMatch(/€/);
  });

  it("la vérification passe avant la carte de prix, pour tout travail payant", () => {
    const src = fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8");
    const i = src.indexOf("const manque = budgetInsuffisant(r.user_id, r.project_id, est.maxMicro, annonceDuDevis(est));"), j = src.indexOf('return askConfirmation(r, t, parsed.data, tctx, "cost", est.maxMicro, est);');
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(j);
  });
});
