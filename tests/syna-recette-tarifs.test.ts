/**
 * Recette SINA (#492) : les tarifs vérifiés du 06/11/2026 réappliqués au démarrage du Studio privé rendent les logos
 * (Sunburst) et les maquettes (Flare) chiffrables, avec un plafond borné — aucun appel payant ici.
 */
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-recette-tarifs-"));
});

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "openai" || p === "anthropic" ? "cle-simulee" : null) }));

import { appliquerTarifsVerifies, DATE_VERIFICATION_TARIFS } from "../scripts/syna-recette/tarifs-verifies";
import { priceFor, usdToEur } from "@/lib/ai/config";
import { mediaRouteFor, openaiImageMax } from "@/lib/ai/media-providers";
import { getSetting, setSetting } from "@/lib/settings";

describe("Studio privé de recette : tarifs vérifiés", () => {
  it("rend la recherche web Claude, les logos et les maquettes chiffrables, aux tarifs officiels au jeton et au taux du Studio", async () => {
    // Une version d'avant posait un taux de 0,90 : retiré, il ne reste que celui du Studio.
    const { setJsonSetting } = await import("@/lib/settings");
    setJsonSetting("billing.usdToEur", 0.9);
    await appliquerTarifsVerifies();
    expect(priceFor("anthropic", "web_search")).toEqual({ unit: "call", perCall: 0.01 });
    expect(usdToEur()).toBe(0.86);
    // Les tarifs officiels au jeton, les mêmes que la configuration du Studio : plus aucun prix par image.
    const { DEFAULT_PRICES } = await import("@/lib/ai/config");
    for (const m of ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"]) expect(priceFor("openai", m)).toEqual({ unit: "tokens", inputPerM: 5, outputPerM: 30, imageInputPerM: 8, imageOutputPerM: 30 });
    expect(priceFor("openai", "gpt-image-2.5-sunburst")).toEqual(DEFAULT_PRICES["openai:gpt-image-2.5-sunburst"]);
    // L'essai réel des planches : 343 jetons de sortie comptés à leur prix, environ 0,0098 €, jamais 0,081 €.
    const { cost } = await import("@/lib/ai/media-providers");
    const planche = cost("openai", "gpt-image-2.5-sunburst", { input: 0, imageIn: 0, imageOut: 343 }).micro;
    expect(planche).toBe(Math.round(((343 * 30) / 1e6) * 0.86 * 1e6));
    expect(planche).toBeLessThan(0.01e6);
    expect(mediaRouteFor("logo", { text: true })).toMatchObject({ provider: "openai", model: "gpt-image-2.5-sunburst" });
    const { logoQuality } = await import("@/lib/ai/media-providers");
    expect(logoQuality()).toBe("high"); // logos en qualité haute (demande du propriétaire du 7 novembre)
    expect(mediaRouteFor("text_layout", { text: true, references: 2 })).toMatchObject({ provider: "openai", model: "gpt-image-2.5-flare" });
    // Bornés par la formule officielle des jetons, jamais nuls : un carré « medium » (439 jetons) et un portrait « high »
    // (1 372 jetons) avec deux images jointes, aperçus du flux compris.
    const logo = openaiImageMax("gpt-image-2.5-sunburst", { prompt: "logo", images: 0, size: "1024x1024", quality: "medium" });
    const maquette = openaiImageMax("gpt-image-2.5-flare", { prompt: "maquette", images: 2, size: "1024x1536", quality: "high" });
    expect(logo).toBeGreaterThanOrEqual(Math.round(((439 * 30) / 1e6) * 0.86 * 1e6));
    expect(logo).toBeLessThan(0.02e6);
    expect(maquette).toBeGreaterThanOrEqual(Math.round(((1372 * 30 + 3000 * 8) / 1e6) * 0.86 * 1e6));
    expect(maquette).toBeLessThan(0.07e6);
  });

  it("ne remplace pas une vérification plus récente faite dans l'administration", async () => {
    const recente = DATE_VERIFICATION_TARIFS + 86_400_000;
    setSetting("ai.prices.checkedAt", String(recente));
    await appliquerTarifsVerifies();
    expect(Number(getSetting("ai.prices.checkedAt"))).toBe(recente);
  });
});
