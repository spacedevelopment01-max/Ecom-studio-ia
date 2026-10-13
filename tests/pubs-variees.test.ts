/**
 * Publicités et publications variées et TRAVAILLÉES : la photo est traitée (étalonnage, noir et blanc, bichromie aux
 * couleurs de la marque, verre dépoli), les compositions graphiques (capsule, carte inclinée et pastille, titre
 * géant, loupe sur le détail, verre dépoli) alternent avec les compositions photo, le logo change de place, et deux
 * publications qui se suivent ne reprennent ni la composition ni le traitement. Le traitement est calculé pixel
 * par pixel par le même code dans l'éditeur du client et à l'export (rendu identique). Aucun appel à l'IA.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Publicités variées et travaillées", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { composeAd, relayoutDoc } = await import("@/lib/ads-v2/compose");
  const { composePoster, savePosterDoc, pickPosterLook } = await import("@/lib/ads-v2/poster");
  const { adArt, treatmentsFor, AD_LAYOUTS } = await import("@/lib/ads-v2/art");
  const { applyFx, parseFilter } = await import("@/lib/ad-doc/image-fx");
  const { AdDocumentSchema } = await import("@/lib/ad-doc/store");
  const { brandTypo, palette } = await import("@/lib/engine/images");
  const { mockImage } = await import("./image-v2-mock");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`pubvar-${Date.now()}@test.fr`, "motdepasse-test", "V");
  const F = { platform: "meta_feed", aspect: "4:5", width: 1080, height: 1350, label: "4:5", safe: { top: 0.05, bottom: 0.06, side: 0.05 } } as const;

  it("traitements calculés pixel par pixel (mêmes formules que les filtres CSS) : noir et blanc, contraste, bichromie, flou", () => {
    const px = () => new Uint8ClampedArray([200, 40, 40, 255, 20, 120, 220, 255]);
    const g = px();
    applyFx(g, 2, 1, "grayscale(1)", null);
    expect(g[0]).toBe(g[1]);
    expect(g[1]).toBe(g[2]);
    // Bichromie : un noir devient la couleur sombre de la marque, un blanc sa couleur claire.
    const d = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    applyFx(d, 2, 1, null, { dark: "#102030", light: "#F0E0D0" });
    expect([...d.slice(0, 3)].map((x) => Math.round(x))).toEqual([16, 32, 48]);
    expect([...d.slice(4, 7)].map((x) => Math.round(x))).toEqual([240, 224, 208]);
    // Flou : un point isolé s'étale, sans liseré sombre sur les bords.
    const w = 21;
    const b = new Uint8ClampedArray(w * w * 4).fill(255);
    for (let k = 0; k < w * w; k++) (b[k * 4] = b[k * 4 + 1] = b[k * 4 + 2] = k === (w * w - 1) / 2 ? 0 : 255);
    applyFx(b, w, w, "blur(3px)", null);
    expect(b[((w * w - 1) / 2) * 4]).toBeGreaterThan(150);
    expect(b[0]).toBe(255);
    expect(parseFilter("contrast(1.1) blur(4px) hue-rotate(-10deg)").map((o) => o.fn)).toEqual(["contrast", "blur", "hue-rotate"]);
  });

  it("chaque nouvelle composition est lisible, dans les marges, et garde son traitement dans le document (éditeur)", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const art = adArt(p, brandTypo(p));
    const photo = await mockImage(5, 1600, 1600);
    const logo = await sharp({ create: { width: 400, height: 120, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } }).png().toBuffer();
    for (const layout of ["capsule", "tilt", "bigtype", "detail", "glass"] as const) {
      expect(AD_LAYOUTS).toContain(layout);
      const treatment = treatmentsFor(layout, art.style)[0];
      const r = await fr(() => composeAd({ format: F as never, layout, palette: palette(p), typo: brandTypo(p), art, brand: "Sérum Éclat", headline: "Le rituel qui change tout.", subline: "Sérum visage • Texture légère", eyebrow: "Soin visage", cta: "Découvrir", background: photo, product: null, logo, variant: { treatment, logo: "column" } }));
      expect(r.metrics.textContrast, layout).toBeGreaterThanOrEqual(4.5);
      expect(r.metrics.safeOverflow, layout).toBe(false);
      expect(r.metrics.textOverlap, layout).toBe(false);
      expect(r.metrics.minFontPx, layout).toBeGreaterThanOrEqual(22);
      expect(r.doc.meta.recipe?.layout).toBe(layout);
      expect(r.doc.meta.recipe?.variant?.treatment).toBe(treatment);
      // Le document validé à l'enregistrement depuis l'éditeur garde le traitement et la recette.
      const parsed = AdDocumentSchema.parse(JSON.parse(JSON.stringify(r.doc)));
      const photoLayer = parsed.layers.find((l) => l.kind === "image" && l.id === "bg-photo") as any;
      if (treatment === "duotone") expect(photoLayer.duotone).toBeTruthy();
      else if (treatment !== "natural") expect(photoLayer.filter).toBeTruthy();
      expect(parsed.meta.recipe?.variant?.treatment).toBe(treatment);
      // Autre format : recomposé avec le même traitement.
      const story = await relayoutDoc(r.doc, { ...F, aspect: "9:16", width: 1080, height: 1920, label: "9:16", safe: { top: 0.14, bottom: 0.2, side: 0.06 } } as never, (id) => (id === "logo" ? logo : photo));
      expect(story?.meta.recipe?.variant?.treatment, layout).toBe(treatment);
    }
    // Pastille (carte inclinée), loupe (détail), verre dépoli (photo floutée sous le texte).
    const tilt = await fr(() => composeAd({ format: F as never, layout: "tilt", palette: palette(p), typo: brandTypo(p), art, brand: "Sérum", headline: "Le rituel.", subline: "Sérum visage • Texture légère", eyebrow: "Soin visage", cta: "Découvrir", background: photo, product: null }));
    expect(tilt.doc.layers.find((l) => l.id === "sticker-text")).toMatchObject({ kind: "text", text: "Soin visage" });
    const detail = await fr(() => composeAd({ format: F as never, layout: "detail", palette: palette(p), typo: brandTypo(p), art, brand: "Sérum", headline: "Le rituel.", subline: null, cta: "Découvrir", background: photo, product: null }));
    expect(detail.doc.layers.find((l) => l.id === "detail")).toMatchObject({ kind: "image", crop: expect.objectContaining({ w: expect.any(Number) }) });
    const glass = await fr(() => composeAd({ format: F as never, layout: "glass", palette: palette(p), typo: brandTypo(p), art, brand: "Sérum", headline: "Le rituel.", subline: null, cta: "Découvrir", background: photo, product: null }));
    expect((glass.doc.layers.find((l) => l.id === "glass") as any).filter).toMatch(/blur\(\d+px\)/);
  }, 120_000);

  it("anti-répétition : composition, traitement et place du logo changent d'une publication à la suivante", async () => {
    const p = loadProject(seedImageFixture(u.id, "artisan"));
    const art = adArt(p, brandTypo(p));
    const a = pickPosterLook(art, 3, [], true);
    const b = pickPosterLook(art, 3, [{ layout: a.layout, treatment: a.variant.treatment!, logo: a.variant.logo! }], true);
    expect(b.layout).not.toBe(a.layout);
    expect(b.variant.logo).not.toBe(a.variant.logo);
    // Parcours réel du studio : six publications de suite, enregistrées comme dans le studio.
    const bg = await saveAsset({ projectId: p.id, userId: u.id, data: await mockImage(8, 1600, 1200), name: "photo.jpg", mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "upload", meta: {} });
    const looks: string[] = [];
    for (let k = 0; k < 6; k++) {
      const r = await fr(() => composePoster(p, { aspect: "4:5", headline: "Des murs nets, sans poussière.", subline: "Peinture • Enduits", cta: "Demander un devis", background: bg, seed: `post-${k}` }));
      const asset = await saveAsset({ projectId: p.id, userId: u.id, data: r.jpg, name: `pub-${k}.jpg`, mime: "image/jpeg", role: "social", folderKey: "images.social", origin: "generated", meta: {} });
      savePosterDoc(p.id, r.docKey, r.doc, asset.id);
      looks.push(`${r.layout}|${r.doc.meta.recipe?.variant?.treatment}`);
      expect(r.metrics.textContrast).toBeGreaterThanOrEqual(4.5);
    }
    const layouts = looks.map((x) => x.split("|")[0]);
    for (let k = 1; k < looks.length; k++) {
      expect(layouts[k], looks.join(" ")).not.toBe(layouts[k - 1]);
      expect(looks[k].split("|")[1], looks.join(" ")).not.toBe(looks[k - 1].split("|")[1]);
    }
    expect(new Set(layouts).size).toBeGreaterThanOrEqual(5);
  }, 120_000);
});
