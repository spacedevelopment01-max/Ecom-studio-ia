/**
 * Bibliothèque de modèles — lot L (publicités « signature » sur la photo entière du client), d'après les
 * références du propriétaire : la photo en plein cadre, la marque en capitales très espacées en tête, un grand titre,
 * une rangée d'atouts confirmés marqués d'un anneau, un bouton pilule. La photo n'est jamais découpée,
 * voilée au centre ou décolorée : seuls des dégradés sombres sur les bords portent le texte. Aucun texte inventé :
 * les atouts sont les faits confirmés du projet (sinon la rangée n'apparaît pas).
 */
import { rgba, type Box, type Kit } from "../kit";
import type { Layer } from "../../../ad-doc/types";
import type { Template } from "../types";

const WHITE = "#FFFFFF";
const SOFT = "rgba(255,255,255,0.82)";

/** Décale verticalement un groupe de calques déjà posés. */
const shift = (ls: Layer[], dy: number) => ls.forEach((l) => (l.y += dy));

/** Marque en capitales très espacées, et la signature dessous en petites capitales. Renvoie la hauteur occupée. */
function wordmark(k: Kit, b: { x: number; y: number; w: number }, align: "left" | "center"): number {
  const size = Math.max(26, k.U * k.pick(0.05, 0.05, 0.05, 0.055));
  const m = k.text("body", k.i.brand, b, { family: k.i.art.heading, weight: Math.min(600, k.i.art.headingWeight), size, align, color: WHITE, upper: true, spacing: Math.round(size * 0.42), maxLines: 1, minSize: 24 }, "brand", "Marque");
  let h = m.h;
  const tag = k.i.tagline?.trim();
  if (tag && tag.length <= 46) {
    const s = Math.max(22, k.U * 0.02);
    const t = k.text("body", tag, { x: b.x, y: b.y + h + s * 0.5, w: b.w }, { size: s, align, color: SOFT, upper: true, spacing: Math.round(s * 0.24), weight: 500, maxLines: 1, minSize: 22 }, "tagline", "Signature");
    h += s * 0.5 + t.h;
  }
  return h;
}

/** Anneau de repère d'un atout (trait fin et point de couleur d'accent au centre). */
function ring(k: Kit, cx: number, cy: number, d: number) {
  k.ellipse({ x: cx - d / 2, y: cy - d / 2, w: d, h: d }, null, { stroke: { color: "rgba(255,255,255,0.9)", width: Math.max(2, Math.round(d * 0.045)) }, name: "Anneau" });
  const p = d * 0.26;
  k.ellipse({ x: cx - p / 2, y: cy - p / 2, w: p, h: p }, k.i.palette.accent || k.c.accent, { name: "Repère" });
}

/** Rangée d'atouts (2 ou 3) : anneau au-dessus, libellé centré dessous. Posée à partir de `y`, renvoie sa hauteur. */
function featureRow(k: Kit, b: { x: number; y: number; w: number }, feats: string[]): number {
  const n = feats.length;
  const cw = b.w / n;
  const d = Math.max(34, k.U * k.pick(0.06, 0.07, 0.07, 0.075));
  const s = Math.max(22, k.U * 0.022);
  let h = 0;
  feats.forEach((f, i) => {
    const cx = b.x + cw * i + cw / 2;
    ring(k, cx, b.y + d / 2, d);
    const t = k.text("body", f, { x: b.x + cw * i + cw * 0.06, y: b.y + d + s * 0.6, w: cw * 0.88 }, { size: s, align: "center", color: WHITE, weight: 500, maxLines: 2, minSize: 22, lineHeight: 1.15 }, undefined, "Atout");
    h = Math.max(h, d + s * 0.6 + t.h);
  });
  return h;
}

/** Liste verticale d'atouts : anneau à gauche, libellé à droite. Renvoie la hauteur occupée. */
function featureList(k: Kit, b: { x: number; y: number; w: number }, feats: string[]): number {
  const d = Math.max(34, k.U * k.pick(0.058, 0.062, 0.062, 0.066));
  const s = Math.max(22, k.U * 0.026);
  let y = b.y;
  for (const f of feats) {
    ring(k, b.x + d / 2, y + d / 2, d);
    const t = k.text("body", f, { x: b.x + d * 1.45, y: y + d / 2 - s * 0.62, w: b.w - d * 1.45 }, { size: s, align: "left", color: WHITE, weight: 500, maxLines: 2, minSize: 22, lineHeight: 1.15 }, undefined, "Atout");
    y += Math.max(d, t.h) + d * 0.42;
  }
  return y - b.y - d * 0.42;
}

/** Titre (signature ou titre donné), le nom du produit dessous en couleur d'accent. Posés à `y`, renvoie la hauteur. */
function headline(k: Kit, b: { x: number; y: number; w: number }, align: "left" | "center", size: number): number {
  const { title, sub } = k.heroText();
  const t = k.title(b, { size, text: title, align, color: WHITE, maxLines: k.cls === "land" ? 3 : 4, lineHeight: 1.02 });
  let h = t.h;
  if (sub) {
    const s = Math.max(24, k.U * 0.032);
    const l = k.text("subtitle", sub, { x: b.x, y: b.y + h + s * 0.45, w: b.w }, { size: s, align, color: k.i.palette.accent || SOFT, weight: 600, maxLines: 2, minSize: 22 }, "subline", "Ligne");
    h += s * 0.45 + l.h;
  }
  return h;
}

const btnSize = (k: Kit) => Math.max(24, k.U * k.pick(0.036, 0.032, 0.032, 0.036));

export const TEMPLATES_L: Template[] = [
  {
    id: "signature-row",
    name: ["Signature et rangée d'atouts", "Signature and feature row"],
    family: "photo",
    photo: "required",
    schemes: ["dark"],
    treatments: ["natural", "moody", "warm"],
    build(k) {
      k.fill(k.c.dark);
      k.fullPhoto();
      const land = k.cls === "land";
      if (land) k.veil({ x: 0, y: 0, w: k.W * 0.62, h: k.H }, 0, k.c.dark, 0.9);
      else {
        k.veil({ x: 0, y: 0, w: k.W, h: k.H * 0.26 }, 90, k.c.dark, 0.7);
        k.veil({ x: 0, y: k.H * 0.4, w: k.W, h: k.H * 0.6 }, 270, k.c.dark, 0.94);
      }
      const col: Box = land ? { x: k.m.side, y: k.m.top, w: k.W * 0.46, h: k.H - k.m.top - k.m.bottom } : { x: k.m.side, y: k.m.top, w: k.W - k.m.side * 2, h: k.H - k.m.top - k.m.bottom };
      wordmark(k, { x: col.x, y: col.y, w: col.w }, "left");
      // Bas de l'affiche, du bas vers le haut : bouton, atouts, titre.
      const start = k.layers.length;
      let y = 0;
      const h1 = headline(k, { x: col.x, y, w: col.w }, "left", k.U * k.pick(0.085, 0.092, 0.095, 0.1));
      y += h1 + k.U * 0.045;
      const feats = k.features(3);
      if (feats.length >= 2) y += featureRow(k, { x: col.x, y, w: col.w }, feats) + k.U * 0.05;
      const b = k.button(col.x + (land ? 0 : col.w / 2), y, { maxW: col.w, align: land ? "left" : "center", style: "pill", arrow: false, size: btnSize(k), fill: k.i.palette.accent || k.c.btn });
      y += b.h;
      shift(k.layers.slice(start), col.y + col.h - y);
    },
  },
  {
    id: "feature-column",
    name: ["Colonne d'atouts", "Feature column"],
    family: "photo",
    photo: "required",
    schemes: ["dark"],
    treatments: ["natural", "moody", "cool"],
    build(k) {
      k.fill(k.c.dark);
      k.fullPhoto();
      const wide = k.wide;
      if (wide) k.veil({ x: 0, y: 0, w: k.W * 0.7, h: k.H }, 0, k.c.dark, 0.92);
      else k.veil({ x: 0, y: 0, w: k.W, h: k.H * 0.72 }, 90, k.c.dark, 0.9);
      const col = { x: k.m.side, y: k.m.top, w: wide ? k.W * 0.5 : k.W - k.m.side * 2 };
      let y = col.y + wordmark(k, col, "left") + k.U * 0.06;
      y += headline(k, { ...col, y }, "left", k.U * k.pick(0.08, 0.08, 0.088, 0.095)) + k.U * 0.05;
      // Autant d'atouts que la place le permet au-dessus du bouton (jamais hors des marges).
      const limit = k.H - k.m.bottom - btnSize(k) * 2.5 - k.U * 0.04;
      for (let n = Math.min(4, k.features(4).length); n > 0; n--) {
        const at = k.layers.length;
        const h = featureList(k, { x: col.x, y, w: col.w * (wide ? 1 : 0.8) }, k.features(n));
        if (y + h <= limit) {
          y += h + k.U * 0.06;
          break;
        }
        k.layers.splice(at);
      }
      if (wide) k.button(col.x, Math.min(y, k.H - k.m.bottom - Math.ceil(btnSize(k) * 2.5) - 2), { maxW: col.w, align: "left", style: "pill", arrow: false, size: btnSize(k), fill: k.i.palette.accent || k.c.btn });
      else {
        const b = k.button(k.W / 2, 0, { maxW: col.w, align: "center", style: "pill", arrow: false, size: btnSize(k), fill: k.i.palette.accent || k.c.btn });
        b.y = k.H - k.m.bottom - b.h;
      }
    },
  },
  {
    id: "centered-signature",
    name: ["Marque centrée, titre en bas", "Centred brand, headline at bottom"],
    family: "photo",
    photo: "required",
    schemes: ["dark"],
    treatments: ["natural", "warm", "moody"],
    build(k) {
      k.fill(k.c.dark);
      k.fullPhoto();
      k.veil({ x: 0, y: 0, w: k.W, h: k.H * (k.cls === "land" ? 0.4 : 0.28) }, 90, k.c.dark, 0.72);
      k.veil({ x: 0, y: k.H * 0.45, w: k.W, h: k.H * 0.55 }, 270, k.c.dark, 0.92);
      const w = k.W - k.m.side * 2;
      wordmark(k, { x: k.m.side, y: k.m.top, w }, "center");
      const start = k.layers.length;
      const cw = Math.min(w, k.W * k.pick(0.62, 0.86, 0.86, 0.86));
      const cx = (k.W - cw) / 2;
      let y = headline(k, { x: cx, y: 0, w: cw }, "center", k.U * k.pick(0.08, 0.088, 0.092, 0.098)) + k.U * 0.045;
      const b = k.button(k.W / 2, y, { maxW: cw, align: "center", style: "pill", arrow: false, size: btnSize(k), fill: k.i.palette.accent || k.c.btn });
      y += b.h;
      // Atouts confirmés en pied de page, en petites capitales espacées (« Supra-auriculaire · Arceau rembourré »).
      const feats = k.features(3).filter((f) => f.length <= 26);
      if (feats.length >= 2) {
        const s = Math.max(22, k.U * 0.019);
        const sp = Math.round(s * 0.22);
        const gap = s * 2.2;
        const ws = feats.map((f) => k.textWidth(f, { size: s, spacing: sp, upper: true, weight: 500 }) + s * 0.4);
        const total = ws.reduce((a, b) => a + b, 0) + gap * (feats.length - 1);
        if (total <= w) {
          let x = (k.W - total) / 2;
          const fy = y + k.U * 0.04;
          feats.forEach((f, i) => {
            if (i) k.ellipse({ x: x - gap / 2 - s * 0.12, y: fy + s * 0.5, w: s * 0.24, h: s * 0.24 }, rgba(WHITE, 0.7), { name: "Point" });
            k.text("body", f, { x, y: fy, w: ws[i] }, { size: s, align: "center", color: rgba(WHITE, 0.78), upper: true, spacing: sp, weight: 500, maxLines: 1, minSize: 22 }, undefined, "Atout");
            x += ws[i] + gap;
          });
          y = fy + s * 1.4;
        }
      }
      shift(k.layers.slice(start), k.H - k.m.bottom - y);
    },
  },
];
