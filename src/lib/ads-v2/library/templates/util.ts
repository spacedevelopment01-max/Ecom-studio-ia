/**
 * Outils communs des lots E à I de la bibliothèque : colonnes de texte gardées dans les marges, partages photo /
 * texte selon le format, voiles de lecture, filets, ombres. Les textes passent toujours par la pile du kit
 * (marque, surtitre, titre, ligne, bouton) : jamais de texte inventé, jamais de chevauchement avec le bouton.
 */
import type { TextLayer } from "../../../ad-doc/types";
import { isDark, mix } from "../../../color";
import type { Box, Kit } from "../kit";

/** Filet fin. */
export const hair = (k: Kit) => Math.max(2, Math.round(k.U * 0.0025));
/** Ombre douce portée. */
export const soft = (k: Kit, a = 0.28) => ({ color: `rgba(0,0,0,${a})`, blur: Math.round(k.U * 0.045), x: 0, y: Math.round(k.U * 0.016) });
/** Ombre franche décalée (effet « pop »), sans flou. */
export const hard = (k: Kit, color: string, d = 0.02) => ({ color, blur: 0, x: Math.round(k.U * d), y: Math.round(k.U * d) });

/** Boîte ramenée dans les marges de la publication (zone sûre de la plateforme comprise). */
export function clampBox(k: Kit, b: Box): Box {
  const x = Math.max(b.x, k.m.side);
  const y = Math.max(b.y, k.m.top);
  const r = Math.min(b.x + b.w, k.W - k.m.side);
  const bt = Math.min(b.y + b.h, k.H - k.m.bottom);
  return { x, y, w: Math.max(10, r - x), h: Math.max(10, bt - y) };
}

/** Boîte réduite d'une marge intérieure. */
export const pad = (b: Box, p: number, py = p): Box => ({ x: b.x + p, y: b.y + py, w: b.w - p * 2, h: b.h - py * 2 });

type ColOpts = { align?: TextLayer["align"]; valign?: "top" | "middle" | "bottom"; title: number; display?: boolean; italic?: boolean; upper?: boolean; mark?: boolean; eyebrow?: boolean; sub?: boolean; subUpper?: boolean; cta?: boolean; ctaStyle?: "pill" | "rounded" | "square" | "block"; gap?: number; onDark?: boolean; maxLines?: number };

/** Colonne de texte (marque, surtitre, titre, ligne, bouton) dans les marges. */
export function col(k: Kit, b: Box, o: ColOpts) {
  return k.stack(clampBox(k, b), { gap: k.U * 0.03, ...o });
}

/** Taille de titre selon le format (paysage, carré, portrait, story). */
export const tsize = (k: Kit, land: number, square: number, portrait = square, story = portrait) => k.U * k.pick(land * 1.35, square * 1.22, portrait * 1.22, story * 1.2);

/**
 * Partage photo / texte : en paysage la photo prend une part de la largeur (à gauche ou à droite), dans les formats
 * hauts une part de la hauteur (en haut ou en bas). Renvoie la boîte de la photo et celle laissée au texte.
 */
export function halves(k: Kit, frac: number, o: { photoEnd?: boolean } = {}): { pic: Box; txt: Box; vertical: boolean } {
  if (k.cls === "land") {
    const pw = k.W * frac;
    const pic = o.photoEnd ? { x: k.W - pw, y: 0, w: pw, h: k.H } : { x: 0, y: 0, w: pw, h: k.H };
    const txt = o.photoEnd ? { x: 0, y: 0, w: k.W - pw, h: k.H } : { x: pw, y: 0, w: k.W - pw, h: k.H };
    return { pic, txt, vertical: false };
  }
  // Story : le bas est couvert par l'interface de la plateforme, la photo cède de la hauteur au texte.
  const ph = k.H * frac * (k.cls === "story" ? 0.8 : 1);
  const pic = o.photoEnd ? { x: 0, y: k.H - ph, w: k.W, h: ph } : { x: 0, y: 0, w: k.W, h: ph };
  const txt = o.photoEnd ? { x: 0, y: 0, w: k.W, h: k.H - ph } : { x: 0, y: ph, w: k.W, h: k.H - ph };
  return { pic, txt, vertical: true };
}

/** Voile de lecture sous une zone de texte posée sur la photo (du bas, du haut, de gauche ou de droite). */
export function readVeil(k: Kit, from: "bottom" | "top" | "left" | "right", frac: number, color = k.c.dark, alpha = 0.82) {
  const b = from === "bottom" ? { x: 0, y: k.H * (1 - frac), w: k.W, h: k.H * frac } : from === "top" ? { x: 0, y: 0, w: k.W, h: k.H * frac } : from === "left" ? { x: 0, y: 0, w: k.W * frac, h: k.H } : { x: k.W * (1 - frac), y: 0, w: k.W * frac, h: k.H };
  const angle = from === "bottom" ? 270 : from === "top" ? 90 : from === "left" ? 0 : 180;
  return k.veil(b, angle, color, alpha);
}

/** Couleur sombre de lecture (sombre de la marque, ou presque noir). */
export const deep = (k: Kit) => (isDark(k.c.dark) ? k.c.dark : "#141414");
/** Couleur claire de surface (carte posée sur la photo). */
export const paper = (k: Kit) => (isDark(k.c.light) ? "#F7F4EF" : k.c.light);
/** Accent légèrement adouci. */
export const tint = (k: Kit, a = 0.3) => mix(k.c.accent, k.c.bg, a);
/** Points d'intérêt pratiques. */
export const center = { u: 0.5, v: 0.5 };
