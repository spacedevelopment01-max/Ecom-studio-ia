/**
 * Recette SYNA (#492) : les tarifs vérifiés du 06/11/2026 réappliqués au démarrage du Studio privé rendent les logos
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
  it("rend la recherche web Claude, les logos et les maquettes chiffrables, avec le taux prudent", async () => {
    await appliquerTarifsVerifies();
    expect(priceFor("anthropic", "web_search")).toEqual({ unit: "call", perCall: 0.01 });
    expect(usdToEur()).toBe(0.9);
    expect(mediaRouteFor("logo", { text: true })).toMatchObject({ provider: "openai", model: "gpt-image-2.5-sunburst" });
    expect(mediaRouteFor("text_layout", { text: true, references: 2 })).toMatchObject({ provider: "openai", model: "gpt-image-2.5-flare" });
    const logo = openaiImageMax("gpt-image-2.5-sunburst", { prompt: "logo", images: 0, size: "1024x1024", quality: "medium" });
    const maquette = openaiImageMax("gpt-image-2.5-flare", { prompt: "maquette", images: 2, size: "1024x1536", quality: "high" });
    // 0,09 $ × 0,90 × 1,05 (aperçus en flux) ≈ 0,085 € : borné et jamais nul.
    for (const micro of [logo, maquette]) {
      expect(micro).toBeGreaterThan(0.08e6);
      expect(micro).toBeLessThan(0.09e6);
    }
  });

  it("ne remplace pas une vérification plus récente faite dans l'administration", async () => {
    const recente = DATE_VERIFICATION_TARIFS + 86_400_000;
    setSetting("ai.prices.checkedAt", String(recente));
    await appliquerTarifsVerifies();
    expect(Number(getSetting("ai.prices.checkedAt"))).toBe(recente);
  });
});
