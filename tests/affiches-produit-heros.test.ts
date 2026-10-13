/**
 * Affiches « produit héros » : le vrai produit détouré en très grand dans un décor dessiné à la marque (scène
 * lumineuse avec ondes et reflet, pierre au soleil, pièce monochrome), la signature de la marque en titre.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Affiches produit héros", () => {
  it("les trois modèles existent, sont des modèles produit, et passent avant les autres", async () => {
    const { templateById, HERO_TEMPLATES } = await import("@/lib/ads-v2/library");
    for (const id of ["light-stage", "sunlit-stone", "color-room"]) {
      expect(templateById(id)?.product, id).toBe(true);
      expect(HERO_TEMPLATES).toContain(id);
    }
    const { pickPosterLook } = await import("@/lib/ads-v2/poster");
    const art = { style: "warm", heading: "Inter", headingWeight: 700, body: "Inter", display: "Inter", displayWeight: 800, uppercase: false, cta: "pill", arrow: true, cycle: ["editorial"] } as any;
    for (let n = 0; n < 60; n++) {
      const l = pickPosterLook(art, n * 104729, [], false, true).layout;
      expect(HERO_TEMPLATES.map((x) => `tpl:${x}`), l).toContain(l);
    }
  });

  it("rendu : reflet sous le produit et ondes lumineuses, titre = signature quand le titre n'est que le nom du produit", async () => {
    const { buildTemplateDocument } = await import("@/lib/ads-v2/library");
    const product = await sharp({ create: { width: 400, height: 300, channels: 4, background: { r: 230, g: 60, b: 90, alpha: 1 } } }).png().toBuffer();
    const { doc } = await buildTemplateDocument({ format: { platform: "instagram", aspect: "4:5", width: 1080, height: 1350, safe: { top: 0.05, bottom: 0.05, side: 0.05 } } as any, layout: "tpl:light-stage", palette: { primary: "#1E3A8A", secondary: "#3B82F6", accent: "#60A5FA", light: "#F5F7FF", dark: "#0B1020" }, typo: { heading: "Inter", body: "Inter" } as any, brand: "Onde", headline: "Casque sans fil", productName: "Casque sans fil", tagline: "Votre monde. Votre rythme.", cta: "Découvrir", background: null, product }, "light-stage");
    const title = doc.layers.find((l) => l.role === "title") as any;
    expect(title.text).toBe("Votre monde. Votre rythme.");
    const sub = doc.layers.find((l) => l.role === "subtitle") as any;
    expect(sub.text).toBe("Casque sans fil");
    expect(doc.layers.some((l) => l.kind === "shape" && (l as any).shape === "waves")).toBe(true);
    const prod = doc.layers.find((l) => l.role === "product") as any;
    expect(prod.reflection).toBeGreaterThan(0);
  });

  it("le reflet et les ondes s'impriment (pixels sous le produit, couleur claire des ondes)", async () => {
    const { createCanvas, loadImage } = await import("@napi-rs/canvas");
    const { renderDoc } = await import("@/lib/ad-doc/render");
    const img = await loadImage(await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer());
    const base = { rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "center", v: "middle" } } as const;
    const doc: any = { version: 1, width: 300, height: 300, background: "#000000", safe: { top: 0, bottom: 0, side: 0 }, format: { platform: null, aspect: "1:1" }, brand: { palette: {}, fonts: { heading: "Inter", body: "Inter" }, name: "x" }, meta: { conceptId: null, source: "engine", createdFrom: null },
      layers: [{ ...base, id: "p", name: "Produit", role: "product", kind: "image", assetId: "a", fit: "contain", crop: null, radius: 0, shadow: null, x: 100, y: 50, w: 100, h: 100, reflection: 1 },
        { ...base, id: "w", name: "Ondes", role: "decor", kind: "shape", shape: "waves", fill: null, stroke: { color: "#FFFFFF", width: 3 }, radius: 0, shadow: null, x: 0, y: 220, w: 300, h: 60 }] };
    const c = createCanvas(300, 300);
    renderDoc(c.getContext("2d") as any, doc, { font: () => "16px sans-serif", images: new Map([["a", img as any]]) } as any);
    const px = (x: number, y: number) => Array.from(c.getContext("2d").getImageData(x, y, 1, 1).data);
    expect(px(150, 155)[0]).toBeGreaterThan(40);
    const row = Array.from({ length: 300 }, (_, x) => Array.from({ length: 60 }, (_, y) => px(x, 220 + y)[1])).flat();
    expect(Math.max(...row)).toBeGreaterThan(120);
  });
});
