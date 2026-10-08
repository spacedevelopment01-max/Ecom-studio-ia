/**
 * Éditeur visuel des publicités — logique de l'interface (pure, sans navigateur) : sélection au point, poignées,
 * rotation, repères magnétiques, alignement, historique (fusion des réglages continus), polices identiques au serveur.
 */
import { describe, expect, it } from "vitest";
import { alignBox, angleAt, hitTest, inside, newLayerId, resizeBox, snapBox } from "@/lib/ad-doc/geometry";
import { History } from "@/lib/ad-doc/ops";
import { docFonts, fontString } from "@/lib/ad-doc/fonts-client";
import { font, fontCatalog, fontFileByName } from "@/lib/media/fonts";
import type { AdDocument, Layer } from "@/lib/ad-doc/types";

const base = { rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "left", v: "top" } } as const;
function doc(): AdDocument {
  const layers: Layer[] = [
    { ...base, id: "bg", name: "Fond", role: "background", kind: "shape", shape: "rect", x: 0, y: 0, w: 1080, h: 1080, fill: "#ffffff", stroke: null, radius: 0, shadow: null },
    { ...base, id: "title", name: "Titre", role: "title", kind: "text", x: 80, y: 100, w: 600, h: 200, text: "Bonjour", font: { family: "Inter", weight: 700, size: 64, italic: false }, color: "#111111", align: "left", lineHeight: 1.1, letterSpacing: 0, uppercase: false, autoFit: null, shadow: null },
    { ...base, id: "cta", name: "Bouton", role: "cta", kind: "button", x: 80, y: 900, w: 300, h: 90, text: "Acheter", font: { family: "Inter", weight: 600, size: 32, italic: false }, fill: "#000000", color: "#ffffff", radius: 40, stroke: null, shadow: null },
  ];
  return { version: 1, width: 1080, height: 1080, background: "#ffffff", safe: { top: 60, bottom: 60, side: 60 }, format: { platform: "meta_feed", aspect: "1:1" }, layers, brand: { palette: {}, fonts: { heading: "Inter", body: "Inter" }, name: "Test" } } as unknown as AdDocument;
}

describe("Éditeur visuel — géométrie", () => {
  it("sélection au point : calque au premier plan, le fond pleine page en dernier, rotation prise en compte", () => {
    const d = doc();
    expect(hitTest(d, 100, 120)?.id).toBe("title");
    expect(hitTest(d, 1000, 500)?.id).toBe("bg");
    expect(hitTest(d, 100, 950)?.id).toBe("cta");
    // Un calque masqué n'est pas sélectionnable au clic.
    d.layers[1].visible = false;
    expect(hitTest(d, 100, 120)?.id).toBe("bg");
    // Rectangle tourné de 90° : le point hors du cadre d'origine mais dans le cadre tourné est dedans.
    const r = { x: 0, y: 450, w: 1000, h: 100, rotation: 90 };
    expect(inside(r, 500, 100)).toBe(true);
    expect(inside(r, 50, 500)).toBe(false);
  });

  it("poignées : redimensionnement par bord ou coin, proportions gardées, taille minimale", () => {
    const b = { x: 100, y: 100, w: 200, h: 100 };
    expect(resizeBox(b, "e", 50, 0)).toEqual({ x: 100, y: 100, w: 250, h: 100 });
    expect(resizeBox(b, "nw", 20, 10)).toEqual({ x: 120, y: 110, w: 180, h: 90 });
    const k = resizeBox(b, "se", 100, 0, true);
    expect(k.w / k.h).toBeCloseTo(2);
    const kn = resizeBox(b, "nw", -100, 0, true);
    expect(kn.x + kn.w).toBe(300);
    expect(kn.y + kn.h).toBe(200);
    expect(resizeBox(b, "w", 500, 0).w).toBe(8);
  });

  it("rotation : angle autour du centre, pas de 15° au doigt ou avec Maj", () => {
    const b = { x: 0, y: 0, w: 100, h: 100 };
    expect(angleAt(b, 50, -100)).toBe(0);
    expect(angleAt(b, 200, 50)).toBe(90);
    expect(angleAt(b, 200, 40, true)).toBe(90);
  });

  it("repères magnétiques : centre de page, zone de sécurité et autres calques", () => {
    const d = doc();
    const c = snapBox(d, { x: 437, y: 500, w: 200, h: 50 }, null, 8);
    expect(c.dx).toBe(3); // centre 537 → 540
    expect(c.guides).toContainEqual({ axis: "x", at: 540 });
    const s = snapBox(d, { x: 64, y: 400, w: 100, h: 50 }, "title", 8);
    expect(s.dx).toBe(-4); // bord gauche sur la zone de sécurité (60)
    const far = snapBox(d, { x: 300, y: 333, w: 10, h: 10 }, null, 2);
    expect(far).toEqual({ dx: 0, dy: 0, guides: [] });
  });

  it("alignement sur la page dans la zone de sécurité ; identifiants uniques", () => {
    const d = doc();
    const b = { x: 300, y: 300, w: 200, h: 100 };
    expect(alignBox(d, b, "center")).toEqual({ x: 440, y: 300 });
    expect(alignBox(d, b, "right")).toEqual({ x: 820, y: 300 });
    expect(alignBox(d, b, "bottom")).toEqual({ x: 300, y: 920 });
    d.layers.push({ ...d.layers[0], id: "text-1" } as Layer);
    expect(newLayerId(d, "text")).toBe("text-2");
  });
});

describe("Éditeur visuel — historique", () => {
  it("un réglage continu (curseur, saisie) fait UN pas ; annuler / rétablir ; plusieurs opérations = un pas", () => {
    const h = new History(doc());
    for (const s of [66, 70, 74, 80]) h.apply({ op: "font", id: "title", font: { size: s } }, "title:size");
    expect(h.canUndo).toBe(true);
    h.undo();
    expect((h.current.layers[1] as any).font.size).toBe(64);
    expect(h.canUndo).toBe(false);
    h.redo();
    expect((h.current.layers[1] as any).font.size).toBe(80);
    // Une autre propriété crée un nouveau pas.
    h.apply({ op: "color", id: "title", color: "#ff0000" }, "title:color");
    h.applyAll([{ op: "move", id: "cta", x: 100, y: 880 }, { op: "text", id: "cta", text: "Découvrir" }]);
    h.undo();
    expect((h.current.layers[2] as any).text).toBe("Acheter");
    expect(h.current.layers[2].x).toBe(80);
    h.undo();
    expect((h.current.layers[1] as any).color).toBe("#111111");
    // Chargement / enregistrement : pas d'historique.
    h.reset(doc());
    expect(h.canUndo || h.canRedo).toBe(false);
  });
});

describe("Éditeur visuel — polices identiques au serveur", () => {
  const cat = fontCatalog();
  it("la chaîne de police du navigateur est exactement celle du rendu serveur (graisse la plus proche, famille inconnue → Inter)", () => {
    const cases: [string, number, boolean][] = [["Inter", 700, false], ["Inter", 650, false], ["Famille inconnue", 400, false]];
    for (const fam of Object.keys(cat).slice(0, 6)) cases.push([fam, 500, false], [fam, 800, true]);
    for (const [f, w, i] of cases) expect(fontString(cat, f, w, 40, i)).toBe(font(f, w, 40, i));
  });
  it("polices à charger d'un document ; fichiers servis sur liste blanche seulement", () => {
    const need = docFonts(cat, doc().layers as never);
    expect(need.size).toBeGreaterThan(0);
    for (const file of need.values()) expect(fontFileByName(file)).toBeTruthy();
    expect(fontFileByName("../../.env")).toBeNull();
    expect(fontFileByName("passwd")).toBeNull();
  });
});
