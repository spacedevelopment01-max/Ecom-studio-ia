/**
 * Les réglages par défaut d'Administration pour la méthode des graphistes (24 novembre 2026), dans le code : GPT-6.2 Astra
 * confirmé et allumé à son tarif officiel (8 $, 0,40 $ en cache, 40 $ le million), les trois modèles d'images à leur tarif
 * officiel avec la formule officielle des jetons, tous allumés ; un choix fait à la main dans l'administration n'est
 * jamais écrasé. Aucun appel.
 */
import fs from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_PRICES, PRIX_PAR_IMAGE_GPT_IMAGE_26, priceFor } from "@/lib/ai/config";
import { modelStatus, textModel } from "@/lib/ai/text-models";
import { mediaModel } from "@/lib/ai/media-models";
import { mediaStatus } from "@/lib/ai/media-routing";
import { jetonsDeSortieGptImage } from "@/lib/ai/media-providers";
import { getJsonSetting, setJsonSetting } from "@/lib/settings";

const IMAGES = ["gpt-image-2.5-sunburst", "gpt-image-2.6-sunburst", "gpt-image-2.6-flare"];
const avant = { prices: getJsonSetting("ai.prices", {}), text: getJsonSetting("ai.textModels", {}), media: getJsonSetting("ai.media.models", {}) };
afterEach(() => { setJsonSetting("ai.prices", avant.prices); setJsonSetting("ai.textModels", avant.text); setJsonSetting("ai.media.models", avant.media); });

describe("GPT-6.2 Astra : confirmé, allumé, à son tarif officiel", () => {
  it("identifiant et tarif confirmés sur la page officielle d'OpenAI ; 8 $ en entrée, 0,40 $ en cache, 40 $ en sortie", () => {
    const m = textModel("openai", "gpt-6.2-astra")!;
    expect(m).toMatchObject({ label: "GPT-6.2 Astra", tier: "strong", verified: true, enabledByDefault: true, source: "https://developers.openai.com/api/docs/pricing" });
    expect(DEFAULT_PRICES["openai:gpt-6.2-astra"]).toEqual({ unit: "tokens", inputPerM: 8, cachedInputPerM: 0.4, outputPerM: 40 });
    // L'entrée lue en cache est comptée à son tarif officiel (jamais au-dessous du coût réel quand il est inconnu).
    expect(fs.readFileSync("src/lib/ai/llm.ts", "utf8")).toContain("requested.cachedInputPerM != null && served.cachedInputPerM != null ? Math.max(requested.cachedInputPerM, served.cachedInputPerM) : p.inputPerM");
  });
  it("allumé par défaut, confirmé sans geste de l'administration ; un choix fait à la main n'est jamais écrasé", () => {
    const m = textModel("openai", "gpt-6.2-astra")!;
    expect(modelStatus(m, {})).toMatchObject({ enabled: true, confirmed: true });
    expect(modelStatus(m, { "openai:gpt-6.2-astra": { enabled: false } }).enabled).toBe(false);
    // Les autres modèles d'OpenAI restent éteints par défaut.
    expect(modelStatus(textModel("openai", "gpt-5.6-terra")!, {}).enabled).toBe(false);
  });
});

describe("les trois modèles d'images de la méthode : tarif officiel, formule officielle, allumés", () => {
  it("30 $ le million en sortie image, 8 $ en entrée image, 5 $ en entrée texte", () => {
    expect(DEFAULT_PRICES["openai:gpt-image-2.5-sunburst"]).toEqual({ unit: "tokens", inputPerM: 5, outputPerM: 30, imageInputPerM: 8, imageOutputPerM: 30 });
    for (const m of ["gpt-image-2.6-sunburst", "gpt-image-2.6-flare"]) expect(DEFAULT_PRICES[`openai:${m}`]).toEqual({ unit: "image", perImage: PRIX_PAR_IMAGE_GPT_IMAGE_26, inputPerM: 5, imageInputPerM: 8, outputPerM: 30 });
  });
  it("la formule officielle : les chiffres du calculateur d'OpenAI et des mesures (docs/studio/couts/03-couts-des-images.md)", () => {
    expect(jetonsDeSortieGptImage("gpt-image-2.6-sunburst", "1024x1024", "high")).toBe(1756);
    expect(jetonsDeSortieGptImage("gpt-image-2.6-flare", "1536x1024", "high")).toBe(1372);
    expect(jetonsDeSortieGptImage("gpt-image-2.6-flare", "1536x1024", "medium")).toBe(1132);
    expect(jetonsDeSortieGptImage("gpt-image-2.6-sunburst", "1024x1024", "medium")).toBe(1449);
    expect(jetonsDeSortieGptImage("gpt-image-2.6-sunburst", "1152x2048", "high")).toBe(1413);
    expect(jetonsDeSortieGptImage("gpt-image-2.6-sunburst", "1824x1024", "high")).toBe(1254);
    expect(jetonsDeSortieGptImage("gpt-image-2.5-sunburst", "1536x1024", "medium")).toBe(343);
    expect(jetonsDeSortieGptImage("gpt-image-2.6-sunburst", "auto", "high")).toBe(1756);
    expect(jetonsDeSortieGptImage("gpt-image-1", "1024x1024", "high")).toBeNull();
  });
  it("là où un seul prix par image est lu : le coût réel le plus haut parmi les tailles et qualités demandées (carré « high »)", () => {
    const tailles = ["1024x1024", "1024x1536", "1536x1024", "1824x1024", "1152x2048", "auto"], plus = Math.max(...tailles.flatMap((t) => ["medium", "high"].map((q) => jetonsDeSortieGptImage("gpt-image-2.6-sunburst", t, q)!)));
    expect(plus).toBe(1756);
    expect(PRIX_PAR_IMAGE_GPT_IMAGE_26).toBeGreaterThanOrEqual((plus * 30) / 1e6);
    expect(PRIX_PAR_IMAGE_GPT_IMAGE_26).toBeLessThan((plus * 30) / 1e6 + 0.0001);
  });
  it("tous allumés par défaut ; un choix fait à la main n'est jamais écrasé", () => {
    for (const id of IMAGES) {
      const m = mediaModel("openai", id)!;
      expect(m.verified, id).toEqual({ id: true, price: true });
      expect(mediaStatus(m, {}).enabled, id).toBe(true);
      expect(mediaStatus(m, { [`openai:${id}`]: { enabled: false } }).enabled, id).toBe(false);
    }
  });
  it("un tarif saisi à la main dans l'administration prime sur le défaut", () => {
    setJsonSetting("ai.prices", { "openai:gpt-6.2-astra": { unit: "tokens", inputPerM: 9, outputPerM: 45 }, "openai:gpt-image-2.6-flare": { unit: "image", perImage: 0.2 } });
    expect(priceFor("openai", "gpt-6.2-astra")).toEqual({ unit: "tokens", inputPerM: 9, outputPerM: 45 });
    expect(priceFor("openai", "gpt-image-2.6-flare")).toEqual({ unit: "image", perImage: 0.2 });
    expect(priceFor("openai", "gpt-image-2.6-sunburst")).toEqual(DEFAULT_PRICES["openai:gpt-image-2.6-sunburst"]);
  });
});
