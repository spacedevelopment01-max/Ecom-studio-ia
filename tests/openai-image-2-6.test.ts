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
      // Compté à ses jetons réels (formule officielle) ; le prix par image, quand seul lui est lu : le carré « high », 0,0527 $.
      expect(DEFAULT_PRICES[`openai:${id}`]).toEqual({ unit: "image", perImage: 0.0527, inputPerM: 5, imageInputPerM: 8, outputPerM: 30 });
    }
    // Les images de SINA : toujours OpenAI, 2.6 Flare par défaut (route commune depuis le 23 novembre 2026).
    expect(fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/mockup-code/tools.ts"), "utf8")).toContain("return routeDesImagesDeSina();");
    expect(fs.readFileSync(path.join(process.cwd(), "src/lib/ai/social-image-policy.ts"), "utf8")).toContain('export const DEFAULT_SOCIAL_IMAGE_MODEL = "gpt-image-2.6-flare";');
  });
});
