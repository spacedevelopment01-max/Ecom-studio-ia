/**
 * Bibliothèque de modèles — lot K (affiches « produit héros ») d'après de vraies publicités produit (audio, soin,
 * café) : le VRAI produit détouré en très grand, dans un décor dessiné aux couleurs de la marque (scène lumineuse
 * avec ondes et sol brillant, pierre au soleil, pièce monochrome traversée d'un rai de lumière), un titre qui
 * accroche (la signature de la marque), le nom du produit dessous et un seul bouton. Aucune photo d'ambiance collée,
 * aucune image générée, aucun texte inventé.
 */
import { isDark, mix } from "../../../color";
import { rgba, type Box, type Kit } from "../kit";
import type { Template } from "../types";

/** Saturation d'une couleur (0 gris, 1 couleur pure). */
const sat = (hex: string) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b);
  return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
};

/**
 * Couleur du décor : la plus franche des couleurs de la marque (principale, secondaire, accent). Une marque noire
 * et dorée a donc un décor doré foncé, jamais un simple noir ; une marque sans couleur garde sa principale.
 */
const toneOf = (k: Kit) => {
  const p = k.i.palette;
  const c = [p.primary, p.secondary, p.accent].filter((x) => /^#[0-9a-f]{6}$/i.test(x ?? ""));
  const best = c.reduce((a, b) => (sat(b) > sat(a) + 0.08 ? b : a), c[0] ?? p.primary);
  return sat(best) >= 0.18 ? best : p.primary;
};

/**
 * Bloc de texte d'une affiche héros : titre (signature), nom du produit, centré ou aligné à gauche.
 * Renvoie la boîte occupée (le titre réduit s'il ne tient pas).
 */
function heroCopy(k: Kit, b: Box, o: { align: "left" | "center"; size: number; color: string; subColor: string; display?: boolean; upper?: boolean; maxLines?: number; subUpper?: boolean; mark?: boolean; markColor?: string }): Box {
  const { title, sub } = k.heroText();
  let y = b.y;
  if (o.mark) {
    const m = k.brandMark({ x: b.x, y, w: b.w }, { align: o.align, height: k.logoHeight(0.62), color: o.markColor ?? o.color });
    y += m.h + k.U * 0.035;
  }
  const t = k.title({ x: b.x, y, w: b.w }, { size: o.size, text: title, align: o.align, color: o.color, display: o.display, upper: o.upper, maxLines: o.maxLines ?? 3, lineHeight: o.display ? 0.92 : 1.0 });
  y += t.h + k.U * 0.022;
  if (sub) {
    const size = Math.max(24, k.U * (o.subUpper ? 0.026 : 0.034));
    const s = k.text("subtitle", sub, { x: b.x, y, w: b.w }, { size, align: o.align, color: o.subColor, upper: o.subUpper, spacing: o.subUpper ? Math.round(size * 0.22) : 0, weight: o.subUpper ? 500 : 400, maxLines: 2, minSize: 22 }, "subline", "Ligne");
    y += s.h;
  }
  return { x: b.x, y: b.y, w: b.w, h: y - b.y };
}

/** Hauteur du bouton du kit (pour réserver sa place avant de le poser). */
const ctaH = (k: Kit) => Math.round(Math.max(24, k.U * k.pick(0.042, 0.032, 0.032, 0.036)) * 2.5);

export const TEMPLATES_K: Template[] = [
  {
    id: "light-stage",
    name: ["Scène lumineuse", "Light stage"],
    family: "lux",
    photo: "optional",
    product: true,
    schemes: ["dark"],
    treatments: ["natural"],
    build(k) {
      // Fond profond de la couleur de la marque, ondes lumineuses derrière le produit, sol brillant avec reflet.
      const tone = toneOf(k);
      const deep = mix(tone, "#000000", 0.8);
      const mid = mix(tone, "#000000", 0.3);
      const light = mix(k.i.palette.accent, "#FFFFFF", 0.6);
      k.fill(deep);
      k.rect({ x: -k.W * 0.2, y: -k.H * 0.1, w: k.W * 1.4, h: k.H * 1.1 }, { type: "radial", angle: 0, stops: [{ offset: 0, color: rgba(mid, 0.95) }, { offset: 0.7, color: rgba(deep, 0.4) }, { offset: 1, color: rgba(deep, 0) }] }, { name: "Lumière de fond" });
      const ink = "#FFFFFF";
      const sub = rgba("#FFFFFF", 0.82);
      if (k.cls === "land") {
        const txt = { x: k.m.side, y: k.m.top, w: k.W * 0.42, h: k.H - k.m.top - k.m.bottom };
        const floor = k.H * 0.8;
        k.waves({ x: k.W * 0.3, y: k.H * 0.22, w: k.W * 0.75, h: k.H * 0.5 }, rgba(light, 0.9), { glow: k.i.palette.accent });
        k.rect({ x: 0, y: floor, w: k.W, h: k.H - floor }, { type: "linear", angle: 90, stops: [{ offset: 0, color: rgba(light, 0.16) }, { offset: 1, color: rgba(deep, 0) }] }, { name: "Sol" });
        k.glow(k.W * 0.7, floor, k.W * 0.32, k.U * 0.025, light, 0.75);
        k.glow(k.W * 0.7, k.H * 0.5, k.W * 0.26, k.H * 0.34, mix(tone, "#FFFFFF", 0.25), 0.55);
        k.productShot({ x: k.W * 0.48, y: k.H * 0.1, w: k.W * 0.46, h: floor - k.H * 0.1 }, { reflection: 0.75 });
        const c = heroCopy(k, { ...txt, h: txt.h * 0.7 }, { align: "left", size: k.U * 0.11, color: ink, subColor: sub, mark: true, markColor: ink });
        const dy = (txt.h - c.h - ctaH(k) - k.U * 0.06) / 2;
        for (const l of k.layers.slice(-3)) if (l.kind === "text" || l.role === "logo") l.y += Math.max(0, dy);
        k.button(k.m.side, c.y + c.h + Math.max(0, dy) + k.U * 0.06, { maxW: txt.w, style: "pill", fill: "#FFFFFF", ink: deep, arrow: false, shadow: true });
        return;
      }
      const c = heroCopy(k, { x: k.m.side, y: k.m.top + k.U * 0.02, w: k.W - k.m.side * 2, h: k.H * 0.3 }, { align: "center", size: k.U * k.pick(0.12, 0.085, 0.112, 0.118), color: ink, subColor: sub, maxLines: 2 });
      const bh = ctaH(k);
      const by = k.H - k.m.bottom - bh - k.U * (k.cls === "story" ? 0.06 : 0.02);
      const py = c.y + c.h + k.U * 0.05;
      const floor = by - k.U * k.pick(0.1, 0.07, 0.13, 0.16);
      const ph = floor - py;
      k.waves({ x: -k.W * 0.08, y: py + ph * 0.12, w: k.W * 1.16, h: ph * 0.6 }, rgba(light, 0.9), { glow: k.i.palette.accent });
      k.rect({ x: 0, y: floor, w: k.W, h: k.H - floor }, { type: "linear", angle: 90, stops: [{ offset: 0, color: rgba(light, 0.18) }, { offset: 1, color: rgba(deep, 0) }] }, { name: "Sol" });
      k.glow(k.W / 2, floor, k.W * 0.62, k.U * 0.03, light, 0.8);
      k.glow(k.W / 2, py + ph * 0.55, k.W * 0.46, ph * 0.5, mix(tone, "#FFFFFF", 0.25), 0.55);
      k.productShot({ x: k.W * 0.08, y: py, w: k.W * 0.84, h: ph }, { reflection: 0.75 });
      k.button(k.W / 2, by, { maxW: k.W * 0.7, align: "center", style: "pill", fill: "#FFFFFF", ink: deep, arrow: false, shadow: true });
    },
  },
  {
    id: "sunlit-stone",
    name: ["Pierre au soleil", "Sunlit stone"],
    family: "lux",
    photo: "optional",
    product: true,
    schemes: ["light"],
    treatments: ["warm"],
    build(k) {
      // Fond crème chaud, ombres de fenêtre en biais, bloc de pierre sur lequel le produit est posé.
      const warm = mix(k.i.palette.light ?? "#F6EFE6", "#F1E2CC", 0.45);
      const stone = mix(warm, "#D9C4A3", 0.55);
      const ink = mix(k.i.palette.dark ?? "#1A1A1A", "#000000", 0.2);
      k.fill(warm);
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, { type: "radial", angle: 0, stops: [{ offset: 0, color: rgba("#FFF6E5", 0.9) }, { offset: 1, color: rgba(warm, 0) }] }, { name: "Soleil" });
      // Ombres d'une fenêtre (lames en biais), très douces.
      for (let i = 0; i < 4; i++) k.rect({ x: k.W * (0.1 + i * 0.2), y: -k.H * 0.25, w: k.W * (0.04 + (i % 2) * 0.03), h: k.H * 1.1 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: rgba(ink, 0.07) }, { offset: 0.7, color: rgba(ink, 0.02) }, { offset: 1, color: rgba(ink, 0) }] }, { rotation: 32, name: `Ombre ${i + 1}` });
      const land = k.cls === "land";
      const tall = k.tall;
      // Bloc de pierre : plateau (lumière sur le dessus) et face avant plus sombre.
      const top = k.H * (land ? 0.74 : tall ? 0.8 : 0.76);
      const bx = land ? k.W * 0.46 : tall ? k.W * 0.18 : k.W * 0.4;
      k.rect({ x: bx, y: top, w: k.W - bx + k.W * 0.05, h: k.H - top }, { type: "linear", angle: 90, stops: [{ offset: 0, color: mix(stone, "#FFFFFF", 0.35) }, { offset: 0.06, color: stone }, { offset: 1, color: mix(stone, "#000000", 0.18) }] }, { radius: k.U * 0.01, name: "Pierre" });
      k.rect({ x: k.W * 0.86, y: k.H * (tall ? 0.42 : 0.28), w: k.W * 0.2, h: top - k.H * (tall ? 0.42 : 0.28) }, { type: "linear", angle: 0, stops: [{ offset: 0, color: mix(stone, "#FFFFFF", 0.2) }, { offset: 1, color: mix(stone, "#000000", 0.1) }] }, { radius: k.U * 0.01, name: "Pierre (mur)" });
      // Produit sur la pierre, lumière chaude derrière lui et ombre portée allongée.
      // Le produit repose sur le plateau (sa base enfoncée d'un rien dans la lumière du dessus).
      const sink = k.U * 0.012;
      const pb = land ? { x: k.W * 0.5, y: k.H * 0.1, w: k.W * 0.36, h: top + sink - k.H * 0.1 } : tall ? { x: k.W * 0.2, y: k.H * 0.36, w: k.W * 0.66, h: top + sink - k.H * 0.36 } : { x: k.W * 0.5, y: k.H * 0.14, w: k.W * 0.42, h: top + sink - k.H * 0.14 };
      k.glow(pb.x + pb.w * 0.6, pb.y + pb.h * 0.4, pb.w * 0.8, pb.h * 0.6, "#FFE3B3", 0.55);
      const shot = k.productShot(pb, { align: "bottom" });
      if (shot) k.ellipse({ x: shot.x - shot.w * 0.55, y: shot.y + shot.h - shot.h * 0.05, w: shot.w * 1.1, h: shot.h * 0.08 }, { type: "radial", angle: 0, stops: [{ offset: 0, color: rgba("#3A2A18", 0.22) }, { offset: 1, color: rgba("#3A2A18", 0) }] }, { rotation: -6, name: "Ombre portée" });
      const txt = land ? { x: k.m.side, y: k.m.top, w: k.W * 0.42, h: k.H - k.m.top - k.m.bottom } : tall ? { x: k.m.side, y: k.m.top, w: k.W - k.m.side * 2, h: k.H * 0.36 } : { x: k.m.side, y: k.m.top, w: k.W * 0.44, h: k.H - k.m.top - k.m.bottom };
      const c = heroCopy(k, txt, { align: "left", size: k.U * k.pick(0.1, 0.085, 0.1, 0.105), color: ink, subColor: rgba(ink, 0.78), mark: true, markColor: ink });
      k.button(txt.x, c.y + c.h + k.U * 0.045, { maxW: txt.w, style: "pill", fill: ink, ink: warm, arrow: false });
    },
  },
  {
    id: "color-room",
    name: ["Pièce monochrome", "Colour room"],
    family: "lux",
    photo: "optional",
    product: true,
    schemes: ["brand"],
    treatments: ["natural"],
    build(k) {
      // Pièce entière de la couleur de la marque (mur et sol), traversée d'un rai de lumière ; titre en très grand.
      const tone = toneOf(k);
      const room = isDark(tone) ? tone : mix(tone, "#000000", 0.45);
      const cream = mix(k.i.palette.light ?? "#F4EADB", "#F3E7D3", 0.5);
      k.fill(mix(room, "#000000", 0.12));
      const floor = k.H * (k.cls === "land" ? 0.66 : 0.6);
      k.rect({ x: 0, y: floor, w: k.W, h: k.H - floor }, { type: "linear", angle: 90, stops: [{ offset: 0, color: mix(room, "#FFFFFF", 0.06) }, { offset: 1, color: mix(room, "#000000", 0.3) }] }, { name: "Sol" });
      k.rect({ x: -k.W * 0.1, y: k.H * 0.45, w: k.W * 1.4, h: k.U * 0.22 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: rgba("#FFFFFF", 0) }, { offset: 0.5, color: rgba("#FFFFFF", 0.09) }, { offset: 1, color: rgba("#FFFFFF", 0) }] }, { rotation: -24, name: "Rai de lumière" });
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, { type: "radial", angle: 0, stops: [{ offset: 0.55, color: rgba("#000000", 0) }, { offset: 1, color: rgba("#000000", 0.35) }] }, { name: "Vignette", role: "scrim" });
      if (k.cls === "land") {
        const txt = { x: k.m.side, y: k.m.top, w: k.W * 0.46, h: k.H - k.m.top - k.m.bottom };
        k.productShot({ x: k.W * 0.54, y: k.H * 0.1, w: k.W * 0.38, h: floor + k.H * 0.12 - k.H * 0.1 }, { align: "bottom" });
        const c = heroCopy(k, txt, { align: "left", size: k.U * 0.14, color: cream, subColor: rgba(cream, 0.85), display: true, subUpper: true, maxLines: 3 });
        k.button(k.m.side, c.y + c.h + k.U * 0.06, { maxW: txt.w, style: "pill", fill: cream, ink: room, arrow: false });
        return;
      }
      const c = heroCopy(k, { x: k.m.side, y: k.m.top, w: k.W - k.m.side * 2, h: k.H * 0.3 }, { align: "center", size: k.U * k.pick(0.15, 0.11, 0.15, 0.16), color: cream, subColor: rgba(cream, 0.85), display: true, subUpper: true, maxLines: 2 });
      const bh = ctaH(k);
      const by = k.H - k.m.bottom - bh - k.U * (k.cls === "story" ? 0.06 : 0.02);
      const py = c.y + c.h + k.U * 0.06;
      const base = Math.min(by - k.U * 0.06, floor + (by - floor) * 0.55);
      k.productShot({ x: k.W * 0.12, y: py, w: k.W * 0.76, h: base - py }, { align: "bottom" });
      k.button(k.W / 2, by, { maxW: k.W * 0.7, align: "center", style: "pill", fill: cream, ink: room, arrow: false, shadow: true });
    },
  },
];
