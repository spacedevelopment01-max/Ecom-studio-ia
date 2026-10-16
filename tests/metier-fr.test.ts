import { describe, expect, it } from "vitest";
import { resolveTrade, tradePromptExpressions, tradeText } from "../src/lib/brain/trade";
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

describe("consigne d'images d'une entreprise de services : gestes et décors du métier en français", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { buildBrief, generationPrompt } = await import("@/lib/image-v2/brief");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const u = await createUser(`metier-fr-${Date.now()}@test.fr`, "motdepasse-test", "M");
  const p = loadProject(seedImageFixture(u.id, "artisan"));
  const all = tradePromptExpressions();

  const { toFr } = await import("@/lib/image-v2/prompt-fr");
  const registry = new Set(all);
  // Même métier que celui du brief (projet sans prestation demandée).
  const trade = resolveTrade(tradeText(p), p.product.sector ?? null);

  for (const people of [true, false]) {
    it(people ? "avec personne" : "sans personne", () => {
      for (const variant of [0, 1, 2]) {
        const b = buildBrief(p, { kind: "trade_photo", support: "site", variant }, { peopleAllowed: people });
        const fr = b.fr!;
        const gesture = trade.actions[variant % trade.actions.length];
        // Le geste du métier arrive traduit dans la consigne (avec ou sans personne).
        expect(fr.action).toContain(tradeFr(gesture));
        if (tradeFr(gesture) !== gesture) expect(fr.action).not.toContain(gesture);
        // Décor du registre : traduit lui aussi.
        if (b.environment && registry.has(b.environment)) expect(fr.environment).toBe(tradeFr(b.environment));
        // Interdits du métier : chacun passe par la table française.
        expect(fr.negative).toEqual(b.negative.map((n) => toFr(tradeFr(n))));
        expect(untranslatedTrade(b.negative.filter((n) => registry.has(n)))).toEqual([]);
        const prompt = generationPrompt(b);
        expect(prompt).toContain(tradeFr(gesture));
      }
    });
  }
});
