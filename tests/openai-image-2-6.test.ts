/**
 * GPT Image 2.6 (demande du propriétaire du 10 novembre 2026) : modèles connus du Studio, jamais choisis par défaut,
 * tarif non vérifié (aucun appel tant qu'un tarif n'est pas saisi) ; le 2.5 Flare reste le modèle des photos du site.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mediaModel } from "@/lib/ai/media-models";
import { DEFAULT_PRICES } from "@/lib/ai/config";

describe("GPT Image 2.6", () => {
  it("connus du Studio, sans tarif par défaut ni rôle par défaut", () => {
    for (const id of ["gpt-image-2.6-flare", "gpt-image-2.6-sunburst"]) {
      const m = mediaModel("openai", id)!;
      expect(m, id).toBeTruthy();
      expect(m.verified.price).toBe(false);
      expect((m as { defaultFor?: unknown }).defaultFor).toBeUndefined();
      expect(DEFAULT_PRICES[`openai:${id}`]).toBeUndefined();
    }
    expect(fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/mockup-code/tools.ts"), "utf8")).toContain('"openai:gpt-image-2.5-flare"');
  });
});
