/**
 * Publications animées : la création en calques s'anime (sans IA, sans nouvelle image) — la photo avance lentement
 * (effet caméra), le logo et le titre arrivent, la ligne apparaît, le bouton surgit puis « bat » régulièrement pour
 * appeler le clic, la pastille tourne. Dernière seconde fixe : la vidéo boucle proprement sur les réseaux.
 * Isomorphe (aucune dépendance Node) : l'aperçu du studio et l'export vidéo calculent la MÊME image à chaque instant.
 */
import type { AdDocument, Layer } from "./types";

export const ANIM_STYLES = ["pop", "slide", "zoom"] as const;
export type AnimStyle = (typeof ANIM_STYLES)[number];
export const ANIM_DURATION_S = 7;

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
/** Arrivée avec léger rebond (bouton qui « surgit »). */
const backOut = (x: number) => {
  const t = clamp(x);
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/** Calques animés un à un ; le reste (photo, voiles, aplats, cartes) forme le décor, qui avance lentement. */
export const isAnimatedLayer = (l: Layer) => l.kind === "text" || l.kind === "button" || l.role === "logo" || l.id === "sticker";

/** Grossissement du décor (effet caméra) à l'instant t. */
export function backdropZoom(style: AnimStyle, t: number, durationS = ANIM_DURATION_S): number {
  const p = clamp(t / (durationS - 0.4));
  if (style === "zoom") return 1.14 - 0.14 * easeOut(p * 1.6); // la photo arrive de près, puis se pose
  return 1 + 0.07 * p * (2 - p); // avance lente et continue
}

function scaled<T extends Layer>(l: T, k: number): T {
  const w = l.w * k;
  const h = l.h * k;
  const out = { ...l, x: l.x + (l.w - w) / 2, y: l.y + (l.h - h) / 2, w, h } as T;
  if (out.kind === "text" || out.kind === "button") (out as any).font = { ...out.font, size: out.font.size * k };
  if (out.kind === "button") (out as any).radius = out.radius * k;
  return out;
}

/** Calques animés à l'instant t (les autres sont rendus tels quels dans le décor). */
export function animatedLayers(doc: AdDocument, style: AnimStyle, t: number): Layer[] {
  const W = doc.width;
  const H = doc.height;
  const order = ["logo", "brand", "eyebrow", "title", "subline", "sticker", "sticker-text", "cta"];
  const rank = (l: Layer) => {
    const k = order.indexOf(l.id);
    return k < 0 ? 3 : k;
  };
  return doc.layers.filter(isAnimatedLayer).map((l): Layer => {
    const start = 0.15 + rank(l) * 0.18;
    const p = (t - start) / 0.6;
    if (l.id === "cta" || l.role === "cta") {
      // Le bouton surgit, puis bat toutes les 1,4 s (appel au clic).
      const enter = t - start;
      if (enter < 0) return { ...l, opacity: 0 };
      const k0 = 0.55 + 0.45 * backOut(enter / 0.5);
      const beat = enter > 1 ? Math.sin(Math.PI * clamp(((enter - 1) % 1.4) / 0.45)) : 0;
      return { ...scaled(l, k0 * (1 + 0.075 * beat)), opacity: l.opacity * clamp(enter / 0.2) };
    }
    if (l.id === "sticker" || l.id === "sticker-text") {
      // La pastille arrive en tournant, puis oscille doucement.
      if (p <= 0) return { ...l, opacity: 0 };
      return { ...scaled(l, Math.max(0.05, backOut(p))), rotation: l.rotation - (1 - easeOut(p)) * 30 + Math.sin(t * 2.2) * 2.5 };
    }
    const e = easeOut(p);
    const op = l.opacity * e;
    if (style === "slide" && (l.role === "title" || l.role === "subtitle")) return { ...l, opacity: op, x: l.x - (1 - e) * W * 0.08 };
    if (style === "zoom" && l.role === "title") return { ...scaled(l, 1.18 - 0.18 * e), opacity: op };
    return { ...l, opacity: op, y: l.y + (1 - e) * H * 0.035 };
  });
}
