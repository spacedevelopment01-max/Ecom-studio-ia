/**
 * Choix du propriétaire (15/10/2026) :
 *  - toutes les publications conçues par l'IA visent un rendu digne des plus grandes campagnes ; AUCUNE mise en page
 *    imposée (logo, produit et textes placés librement, différemment à chaque fois), produit fidèle sous le même angle ;
 *  - le VRAI logo de la marque est transmis à l'IA d'images et contrôlé contre l'original (jamais réinventé) ;
 *  - Qwen-Image 3.0 Pro devient le modèle d'images par défaut, mais seulement une fois confirmé par
 *    l'administration : avant, le défaut historique reste en place (aucune création sans modèle).
 */
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: () => "cle-de-test-1234567890abcdef" }));

describe("Ligne « campagne » et Qwen-Image 3.0 Pro par défaut", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject, saveBrand } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { setJsonSetting } = await import("@/lib/settings");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { designPostWithAi, aiPostPrompt } = await import("@/lib/social-v2/ai-post");
  const routing = await import("@/lib/ai/media-routing");
  const png = (c = "#335544") => sharp({ create: { width: 64, height: 64, channels: 3, background: c } }).png().toBuffer();
  const post = { id: "post-camp-1", network: "instagram", format: "image", title: "Le temps", caption: "", pillar: "Produit", objective: "sell", headline: "Le temps vous va bien", scheduled_at: null };

  it("consigne : niveau des plus grandes campagnes, mise en page libre, même angle que la photo, aucun texte dans le décor", async () => {
    const u = await createUser(`camp-${Date.now()}@test.fr`, "motdepasse-test", "P");
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const withLogo = aiPostPrompt(p, post as any, { aspect: "9:16", hasReference: true, hasLogo: true });
    expect(withLogo).toMatch(/SAME angle and viewpoint/);
    expect(withLogo).toMatch(/brand logo from the second reference image, reproduced faithfully/);
    // Aucune mise en page imposée : seul le niveau est exigé.
    expect(withLogo).toMatch(/never a fixed template/);
    expect(withLogo).toMatch(/greatest advertising campaigns/);
    expect(withLogo).not.toMatch(/from top to bottom|Top center/);
    expect(withLogo).toMatch(/No text, letters or signs anywhere in the decor/);
    const noLogo = aiPostPrompt(p, post as any, { aspect: "1:1", hasReference: true, hasLogo: false });
    expect(noLogo).toMatch(/brand name ".*", elegantly typeset/);
  });

  it("le vrai logo est transmis à l'IA et contrôlé contre l'original (le nom de la marque n'est plus exigé en texte libre)", async () => {
    const u = await createUser(`camp2-${Date.now()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "cosmetic");
    const logo = await saveAsset({ projectId: pid, userId: u.id, data: await png("#111214"), name: "logo.png", mime: "image/png", role: "logo", folderKey: "brand.logo", origin: "generated", status: "approved", meta: {} });
    const p0 = loadProject(pid);
    saveBrand(pid, { ...p0.brand!, logo: { ...(p0.brand?.logo ?? {}), assetId: logo.id } } as any);
    const p = loadProject(pid);
    const ref = await saveAsset({ projectId: pid, userId: u.id, data: await png(), name: "ref.png", mime: "image/png", role: "cutout", folderKey: "images.cutouts", origin: "generated", status: "approved", meta: {} });
    const seen: { logo: Buffer | null | undefined; reviewLogo: Buffer | null | undefined; expected: string[] } = { logo: undefined, reviewLogo: undefined, expected: [] };
    const deps = {
      generate: async (_pr: string, _a: string, _r: Buffer | null, _k: string, l?: Buffer | null) => ((seen.logo = l), png()),
      review: async (_i: Buffer, _r: Buffer | null, texts: string[], _k: string, _pp?: boolean, l?: Buffer | null) => ((seen.reviewLogo = l), (seen.expected = texts), { transcribed: texts, person: false, anatomyOk: true, productFaithful: true, textsExact: true, legible: true, score: 8.5, issues: [], fix: "" }),
      spentMicro: () => 0,
      maxMicro: () => 50_000,
    };
    const r = await designPostWithAi(p, post as any, { aspect: "9:16", maxCostEur: 1, reference: ref.id }, deps as any);
    expect(r.assetId).toBeTruthy();
    expect(seen.logo).toBeInstanceOf(Buffer);
    expect(seen.reviewLogo).toBeInstanceOf(Buffer);
    // Titre, ligne du produit, bouton : le nom de la marque est vérifié dans le logo, pas en texte libre.
    expect(seen.expected).toHaveLength(3);
  });

  it("Qwen-Image 3.0 Pro par défaut seulement une fois confirmé ; sinon le défaut historique", () => {
    for (const k of ["ai.routes", "ai.media.models", "ai.prices", "ai.media.usage"]) setJsonSetting(k, {});
    expect(routing.mediaPrimary("image")).toEqual({ provider: "openai", model: "gpt-image-1" });
    setJsonSetting("ai.media.models", { "alibaba:qwen-image-3.0-pro": { confirmedAt: Date.now(), enabled: true } });
    expect(routing.mediaPrimary("image")).toEqual({ provider: "alibaba", model: "qwen-image-3.0-pro" });
    // Un choix de l'administration reste prioritaire.
    setJsonSetting("ai.routes", { image_generation: { provider: "google", model: "gemini-2.5-flash-image" } });
    expect(routing.mediaPrimary("image").provider).toBe("google");
    for (const k of ["ai.routes", "ai.media.models"]) setJsonSetting(k, {});
  });
});
