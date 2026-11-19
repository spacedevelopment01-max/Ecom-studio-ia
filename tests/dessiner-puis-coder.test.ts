/**
 * Essai « dessiner puis coder » (19 novembre 2026) : une page du site dessinée par OpenAI en plusieurs images qui se
 * suivent, par le circuit normal du Studio (réservation, comptage), avec le logo, les photos du site et les morceaux
 * déjà dessinés en références. Sans IA.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("le dessin d'une page en plusieurs images", async () => {
  const M = await import("@/lib/ai/media-providers");
  it("passe par le circuit des images à texte du Studio, chaque référence jointe comme essentielle", () => {
    expect(typeof M.aiSitePageMockup).toBe("function");
    const src = fs.readFileSync("src/lib/ai/media-providers.ts", "utf8");
    expect(src).toContain('references: input.references.map((r) => ({ ...r, essential: true })), quality: "high", strictQuality: true, usage: "text_layout"');
    // Un morceau déjà dessiné est joint comme « style » : il guide l'allure, il n'est pas recopié comme une photo.
    expect(M.imageReferencePrompt("x", ["logo", "style"])).toContain("image 2: style");
  });
});

describe("Sol 6.2 (OpenAI), candidat pour écrire le code des sites", async () => {
  const T = await import("@/lib/ai/text-models");
  it("est déclaré, mais verrouillé tant que l'administration n'a pas confirmé son tarif et ses limites", () => {
    const m = T.textModel("openai", "gpt-6.2-sol");
    expect(m).toBeTruthy();
    expect(m!.verified).toBe(false);
    expect(m!.limits.context).toBeLessThanOrEqual(272_000);
    const st = T.modelStatus(m!, {});
    expect(st.usable).toBe(false);
    expect(st.enabled).toBe(false);
  });
});
