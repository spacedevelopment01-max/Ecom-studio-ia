/**
 * Animation choisie élément par élément dans l'éditeur (titre, texte, bouton, logo) : entrée, départ, durée et effet
 * continu (bouton qui bat, texte qui flotte). L'aperçu du studio et la vidéo exportée font le même calcul ; sans
 * réglage, l'animation automatique du studio s'applique. Gratuit, sans IA.
 */
import { describe, expect, it } from "vitest";
import { animatedLayers, customLayer } from "@/lib/ad-doc/animate";
import { AdDocumentSchema, LayerSchema } from "@/lib/ad-doc/store";
import type { AdDocument, Layer } from "@/lib/ad-doc/types";

const base = { name: "x", rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "left", v: "top" } } as const;
const title: Layer = { ...base, id: "title", role: "title", kind: "text", x: 100, y: 200, w: 600, h: 120, text: "Le bouquet prend forme.", font: { family: "Inter", weight: 700, size: 80, italic: false }, color: "#111111", align: "left", lineHeight: 1, letterSpacing: 0, uppercase: false } as unknown as Layer;
const cta: Layer = { ...base, id: "cta", role: "cta", kind: "button", x: 100, y: 500, w: 300, h: 80, text: "Nous contacter", font: { family: "Inter", weight: 600, size: 30, italic: false }, color: "#FFFFFF", fill: "#A0102A", radius: 40, stroke: null, shadow: null } as unknown as Layer;
const doc = (layers: Layer[]) => ({ width: 1080, height: 1080, layers }) as unknown as AdDocument;

describe("animation par élément", () => {
  it("entrée « depuis la gauche » avec départ et durée choisis", () => {
    const a = { in: "left", delay: 1, dur: 0.5 } as const;
    expect(customLayer(title, a, 0.5, 1080, 1080).opacity).toBe(0); // pas encore parti
    const mid = customLayer(title, a, 1.2, 1080, 1080);
    expect(mid.x).toBeLessThan(title.x);
    const end = customLayer(title, a, 2, 1080, 1080);
    expect(end.x).toBeCloseTo(title.x, 5);
    expect(end.opacity).toBe(1);
  });

  it("« aucune » : présent dès le début, sans mouvement", () => {
    const l = customLayer(title, { in: "none", delay: 0 }, 0, 1080, 1080);
    expect(l.opacity).toBe(1);
    expect([l.x, l.y, l.w]).toEqual([title.x, title.y, title.w]);
  });

  it("bouton qui bat après son entrée ; texte qui flotte", () => {
    const a = { in: "pop", delay: 0, dur: 0.5, loop: "pulse" } as const;
    const sizes = [0.6, 0.7, 0.75, 0.8, 2.0].map((t) => customLayer(cta, a, t, 1080, 1080).w);
    expect(Math.max(...sizes)).toBeGreaterThan(cta.w + 5);
    const ys = [1, 1.3, 1.6, 1.9].map((t) => customLayer(title, { in: "rise", delay: 0, dur: 0.5, loop: "float" }, t, 1080, 1080).y);
    expect(new Set(ys.map((y) => Math.round(y))).size).toBeGreaterThan(1);
  });

  it("le réglage du client remplace l'animation automatique ; sans réglage, l'automatique reste", () => {
    const d = doc([{ ...title, anim: { in: "none", delay: 0 } }, cta]);
    const at0 = Object.fromEntries(animatedLayers(d, "pop", 0).map((l) => [l.id, l]));
    expect(at0.title.opacity).toBe(1); // choisi : présent dès le début
    expect(at0.cta.opacity).toBe(0); // automatique : le bouton arrive plus tard
  });

  it("les réglages sont acceptés à l'enregistrement", () => {
    const ok = LayerSchema.safeParse({ ...cta, anim: { in: "right", delay: 0.8, dur: 0.4, loop: "pulse" } });
    expect(ok.success).toBe(true);
    expect(LayerSchema.safeParse({ ...cta, anim: { in: "none", delay: 0, loop: "float" } }).success).toBe(true);
    expect(LayerSchema.safeParse({ ...cta, anim: { in: "spin", delay: 0 } }).success).toBe(false);
    expect(AdDocumentSchema).toBeTruthy();
  });
});
