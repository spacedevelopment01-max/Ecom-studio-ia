import { describe, expect, it } from "vitest";
import { resolveTrade, tradePromptExpressions } from "../src/lib/brain/trade";
import { TRADE_FR, tradeFr, untranslatedTrade } from "../src/lib/brain/trade-fr";

describe("registre des métiers en français (consignes d'images)", () => {
  it("chaque geste, scène et interdit du registre a sa traduction française", () => {
    expect(untranslatedTrade(tradePromptExpressions())).toEqual([]);
  });

  it("aucune traduction vide ni restée en anglais par erreur", () => {
    const sameOk = new Set(["installation", "massage", "service", "graffiti", "consultation"]);
    for (const [en, fr] of Object.entries(TRADE_FR)) {
      expect(fr.trim(), en).not.toBe("");
      if (!sameOk.has(en)) expect(fr, en).not.toBe(en);
    }
  });

  it("paysagiste (Racines & Pierres) : gestes et scènes traduits", () => {
    const t = resolveTrade("Paysagiste — création et entretien de jardins", "batiment");
    const fr = [...t.actions, ...t.visuals.positive].map((s) => tradeFr(s));
    expect(fr).toContain("taille de haie");
    expect(fr).toContain("paysagiste qui taille une haie");
    expect(untranslatedTrade([...t.actions, ...t.visuals.positive, ...t.visuals.negative])).toEqual([]);
  });

  it("repli générique : le libellé du client est gardé, le reste en français", () => {
    const t = resolveTrade("Fleuriste événementiel");
    expect(t.source).not.toBe("core");
    expect(t.visuals.positive.map((s) => tradeFr(s))).toEqual(["Fleuriste événementiel, professionnel au travail"]);
    expect(tradeFr(null)).toBeNull();
    expect(tradeFr("expression inconnue")).toBe("expression inconnue");
  });
});
