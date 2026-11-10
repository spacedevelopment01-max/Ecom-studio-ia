/**
 * GPT Image 2.6 (demande du propriétaire du 10 novembre 2026) : modèles connus du Studio, jamais choisis par défaut,
 * tarif officiel inscrit (borne de 0,12 $ par image) ; le 2.6 Flare est le modèle des images des thèmes (décision du
 * 10 novembre 2026, après la comparaison réelle 2.5 / 2.6).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mediaModel } from "@/lib/ai/media-models";
import { DEFAULT_PRICES } from "@/lib/ai/config";

describe("GPT Image 2.6", () => {
  it("connus du Studio, tarif inscrit, 2.6 Flare pour les images des thèmes", () => {
    for (const id of ["gpt-image-2.6-flare", "gpt-image-2.6-sunburst"]) {
      const m = mediaModel("openai", id)!;
      expect(m, id).toBeTruthy();
      expect(m.verified.price).toBe(true);
      expect((m as { defaultFor?: unknown }).defaultFor).toBeUndefined();
      expect(DEFAULT_PRICES[`openai:${id}`]).toEqual({ unit: "image", perImage: 0.12, inputPerM: 5 });
    }
    expect(fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/mockup-code/tools.ts"), "utf8")).toContain('"openai:gpt-image-2.6-flare"');
  });
});
