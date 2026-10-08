/**
 * Adaptation d'un document à un autre format (1:1, 4:5, 9:16, 16:9, bannières) sans perdre une modification :
 * textes, couleurs, images, polices et calques ajoutés par le client sont conservés ; seule la géométrie change.
 *  - fond et calques « stretch » : recouvrent le nouveau cadre ;
 *  - autres calques : échelle commune (la plus petite des deux), position gardée par rapport au bord d'ancrage ;
 *  - tailles de police réduites dans la même proportion ;
 *  - tout calque de contenu est ramené dans les zones de sécurité (jamais de texte ni de produit coupé).
 */
import type { AdDocument, Layer } from "./types";

export function reflow(doc: AdDocument, target: { width: number; height: number; safe: AdDocument["safe"]; aspect: string; platform?: string | null }): AdDocument {
  const sx = target.width / doc.width;
  const sy = target.height / doc.height;
  const s = Math.min(sx, sy);
  const W = target.width;
  const H = target.height;
  const S = target.safe;
  const layers = doc.layers.map((l): Layer => {
    const full = l.anchor.h === "stretch" && l.anchor.v === "stretch";
    if (full) return { ...l, x: l.x * sx, y: l.y * sy, w: l.w * sx, h: l.h * sy };
    let w = l.anchor.h === "stretch" ? l.w * sx : l.w * s;
    let h = l.anchor.v === "stretch" ? l.h * sy : l.h * s;
    const x = l.anchor.h === "left" || l.anchor.h === "stretch" ? l.x * (l.anchor.h === "stretch" ? sx : s) : l.anchor.h === "right" ? W - (doc.width - (l.x + l.w)) * s - w : (l.x + l.w / 2) * sx - w / 2;
    const y = l.anchor.v === "top" || l.anchor.v === "stretch" ? l.y * (l.anchor.v === "stretch" ? sy : s) : l.anchor.v === "bottom" ? H - (doc.height - (l.y + l.h)) * s - h : (l.y + l.h / 2) * sy - h / 2;
    let out: Layer = { ...l, x, y, w, h };
    if (out.kind === "text" || out.kind === "button") out = { ...out, font: { ...out.font, size: Math.max(10, Math.round(out.font.size * s)) }, ...(out.kind === "text" && out.autoFit ? { autoFit: { minSize: Math.max(8, Math.round(out.autoFit.minSize * s)) } } : {}), ...(out.kind === "button" ? { radius: out.radius * s } : {}) } as Layer;
    // Contenu (texte, bouton, logo, produit) : toujours entier dans la zone sûre.
    if (["title", "subtitle", "body", "cta", "logo", "product"].includes(l.role)) {
      const maxW = W - S.side * 2;
      const maxH = H - S.top - S.bottom;
      if (out.w > maxW || out.h > maxH) {
        const k = Math.min(maxW / out.w, maxH / out.h);
        w = out.w * k;
        h = out.h * k;
        out = { ...out, w, h, ...(out.kind === "text" || out.kind === "button" ? { font: { ...out.font, size: Math.max(10, Math.round(out.font.size * k)) } } : {}) } as Layer;
      }
      out = { ...out, x: Math.min(Math.max(out.x, S.side), W - S.side - out.w), y: Math.min(Math.max(out.y, S.top), H - S.bottom - out.h) };
    }
    return out;
  });
  return { ...doc, width: W, height: H, safe: S, format: { platform: target.platform ?? doc.format.platform, aspect: target.aspect }, layers };
}
