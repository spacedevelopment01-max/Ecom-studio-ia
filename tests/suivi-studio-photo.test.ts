/**
 * Le studio photo qui garde le vrai produit (recherche 08, point 6), sans aucun appel réel : la photo du téléphone jugée
 * par le code (avec un conseil plutôt qu'une image payée), la méthode selon le texte sur le produit, et le contrôle de
 * fidélité qui refuse un produit changé (forme, proportions, couleur).
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("suivi : le studio photo qui garde le vrai produit", async () => {
  const { runWithLang } = await import("@/lib/i18n-server");
  const S = await import("@/lib/suivi/studio-photo");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  /** Une photo nette : un damier fin et bien éclairé. */
  async function nette(w = 1200, h = 1200, fond = 170) {
    const tile = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = ((x >> 3) + (y >> 3)) % 2 ? fond + 40 : fond - 40; tile.set([v, v, v], (y * w + x) * 3); }
    return sharp(tile, { raw: { width: w, height: h, channels: 3 } }).jpeg().toBuffer();
  }
  /** Un détourage : un rectangle opaque de couleur donnée sur fond transparent. */
  const decoupe = (w: number, h: number, pw: number, ph: number, left: number, top: number, color = { r: 180, g: 60, b: 40 }) =>
    sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: { create: { width: pw, height: ph, channels: 4, background: { ...color, alpha: 1 } } }, left, top }]).png().toBuffer();

  it("une bonne photo passe ; une photo sombre, floue, petite ou au produit coupé reçoit un conseil en une phrase", async () => {
    expect((await S.jugerPhoto(await nette())).ok).toBe(true);
    const p = await sharp({ create: { width: 1200, height: 1200, channels: 3, background: "#101010" } }).jpeg().toBuffer();
    const j = await fr(() => S.jugerPhoto(p));
    expect(j.defauts).toEqual(expect.arrayContaining(["sombre", "floue"]));
    expect(j.conseil).toMatch(/^Je préfère que tu refasses la photo : .*fenêtre/);
    const petite = await fr(async () => S.jugerPhoto(await nette(400, 400)));
    expect(petite.defauts).toContain("petite");
    const coupe = await decoupe(400, 400, 400, 200, 0, 100);
    expect(await S.produitCoupe(coupe)).toBe(true);
    expect(await S.produitCoupe(await decoupe(400, 400, 200, 200, 100, 100))).toBe(false);
    expect((await fr(async () => S.jugerPhoto(await nette(), coupe))).defauts).toEqual(["coupee"]);
  });

  it("la méthode : un produit avec texte est toujours posé tel quel", () => {
    expect(S.methodePhoto({ texteSurProduit: true })).toBe("pose-tel-quel");
    expect(S.methodePhoto({ texteSurProduit: false })).toBe("refait-et-controle");
  });

  it("la fidélité : même produit à une autre taille accepté ; forme, proportions ou couleur changées refusées", async () => {
    const origine = await decoupe(400, 400, 100, 200, 150, 100);
    expect(await S.controleFidelite(origine, await decoupe(800, 800, 200, 400, 100, 200))).toEqual({ fidele: true, ecarts: [] });
    const large = await fr(async () => S.controleFidelite(origine, await decoupe(400, 400, 160, 200, 100, 100)));
    expect(large.fidele).toBe(false);
    expect(large.ecarts).toContain("les proportions du produit ont changé");
    const couleur = await fr(async () => S.controleFidelite(origine, await decoupe(400, 400, 100, 200, 150, 100, { r: 40, g: 90, b: 200 })));
    expect(couleur.ecarts).toEqual(["la couleur du produit a changé"]);
    const ronde = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200"><ellipse cx="50" cy="100" rx="50" ry="100" fill="rgb(180,60,40)"/></svg>`)).png().toBuffer();
    expect((await fr(() => S.controleFidelite(origine, ronde))).ecarts).toContain("la forme du produit a changé");
  });

  // Décision du 22 novembre 2026 : le contrôle de fidélité est branché dans le moteur des images (gratuit). Une image dont
  // le produit a changé est dite ratée, jamais montrée, et n'est PAS refaite toute seule (une nouvelle image se paierait).
  it("moteur des images : un produit changé rend l'image ratée, sans nouvelle génération ; un produit fidèle passe", async () => {
    const { createUser } = await import("@/lib/auth");
    const { loadProject } = await import("@/lib/projects");
    const { getAsset } = await import("@/lib/library");
    const { runImageEngineV2 } = await import("@/lib/image-v2/engine");
    const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
    const { mockDeps, review } = await import("./image-v2-mock");
    const { grantProjectPlan } = await import("@/lib/project-subscriptions");
    const u = await createUser(`fidelite-${Date.now()}@test.fr`, "motdepasse-test", "F");
    const cut = await sharp({ create: { width: 300, height: 600, channels: 4, background: { r: 199, g: 123, b: 48, alpha: 1 } } }).png().toBuffer();
    for (const fidele of [false, true]) {
      const p = loadProject(seedImageFixture(u.id, "cosmetic"));
      grantProjectPlan(p.id, "dominer");
      const cutId = await seedCutout(u.id, p.id);
      const { deps, log } = mockDeps({ providers: [], reference: cut, reviewFor: () => review(8.8) });
      let controles = 0;
      deps.fidelity = async () => (controles++, fidele ? { fidele: true, ecarts: [] } : { fidele: false, ecarts: ["la forme du produit a changé"] });
      const r = await fr(() => runImageEngineV2(null, p.id, { kind: "lifestyle", support: "ad", aspect: "1:1", references: [cutId], noStock: true } as any, deps));
      expect(controles).toBe(1);
      expect(log.generations.length).toBe(1);
      if (fidele) { expect(r.outcomes[0].verdict).toBe("FINAL"); expect(r.outcomes[0].assetId).toBeTruthy(); continue; }
      expect(r.outcomes[0]).toMatchObject({ verdict: "REJECTED", assetId: null });
      expect(r.outcomes[0].codes).toContain("product_changed");
      expect(r.notes.join(" ")).toMatch(/Image ratée : la forme du produit a changé .*n'est pas refaite toute seule/);
      expect(getAsset(r.outcomes[0].diagnosticAssetId!)!.status).toBe("rejected");
    }
  });

  it("le contrôle de fidélité du Studio est allumé par défaut, gratuit, et « 0 » dans le réglage l'éteint", async () => {
    const { setSetting } = await import("@/lib/settings");
    const { fideliteLocale, realImageDeps } = await import("@/lib/image-v2/deps");
    const a = await decoupe(400, 400, 200, 200, 100, 100), b = await decoupe(400, 400, 100, 300, 150, 50);
    expect(await fr(() => fideliteLocale(a, a))).toEqual({ fidele: true, ecarts: [] });
    expect((await fr(() => fideliteLocale(a, b)))!.fidele).toBe(false);
    setSetting("suivi.studioPhoto", "0");
    try { expect(await fideliteLocale(a, b)).toBeNull(); } finally { setSetting("suivi.studioPhoto", null); }
    expect(realImageDeps({ id: "x", userId: "u" } as any, { jobId: null, aiActive: false }).fidelity).toBe(fideliteLocale);
  });
});
