/**
 * Bibliothèque de modèles — lot C (10 modèles) : graphiques et typographiques. Grande typographie, motifs (points,
 * rayures, taches de couleur), blocs, anneaux, cartes en éventail. La plupart restent belles sans photo : la
 * composition tient par les formes et les couleurs de la marque.
 */
import { createCanvas } from "@napi-rs/canvas";
import { contrast, isDark, mix } from "../../../color";
import { wrap } from "../../../ad-doc/render";
import { serverFont } from "../../../ad-doc/server";
import type { Layer, TextLayer } from "../../../ad-doc/types";
import { rgba, type Box, type Kit } from "../kit";
import type { Template } from "../types";

const ctx = createCanvas(8, 8).getContext("2d");

/** Couleur de la liste la plus éloignée (contraste) de toutes les couleurs données. */
const farthest = (cands: string[], from: string[]) => [...cands].sort((a, b) => Math.min(...from.map((f) => contrast(b, f))) - Math.min(...from.map((f) => contrast(a, f))))[0];

type TitleOpts = { max: number; display?: boolean; italic?: boolean; align?: TextLayer["align"]; upper?: boolean; maxLines?: number; color?: string; lineHeight?: number };

/**
 * Titre au plus grand qui tienne dans la boîte (largeur, hauteur, nombre de lignes) : contrairement au titre du kit,
 * qui vise une seule ligne, il occupe vraiment la surface prévue (affiche typographique).
 */
function fitTitle(k: Kit, b: Box, o: TitleOpts): TextLayer {
  const t = k.title({ x: b.x, y: b.y, w: b.w }, { size: o.max, display: o.display, italic: o.italic, align: o.align, upper: o.upper, maxLines: o.maxLines, color: o.color, lineHeight: o.lineHeight });
  const maxLines = o.maxLines ?? (k.cls === "story" ? 4 : 3);
  const text = t.uppercase ? t.text.toUpperCase() : t.text;
  const ratio = (o.display ? -0.005 : -0.01) * (o.lineHeight === undefined ? 1 : 1);
  const fits = (s: number) => {
    ctx.font = serverFont(t.font.family, t.font.weight, s, t.font.italic);
    ctx.letterSpacing = `${Math.round(s * ratio)}px`;
    const lines = wrap(ctx, text, b.w);
    const ok = lines.length <= maxLines && lines.every((x) => ctx.measureText(x).width <= b.w) && lines.length * s * t.lineHeight + s * 0.12 <= b.h;
    ctx.letterSpacing = "0px";
    return ok ? lines.length : 0;
  };
  let s = Math.round(o.max);
  let n = fits(s);
  while (!n && s > 26) n = fits((s = Math.max(26, Math.floor(s * 0.96))));
  t.font.size = s;
  t.letterSpacing = Math.round(s * ratio);
  t.autoFit = { minSize: Math.max(22, Math.round(s * 0.6)) };
  t.h = Math.ceil(Math.max(1, n || maxLines) * s * t.lineHeight + s * 0.12);
  return t;
}

type ColOpts = Omit<TitleOpts, "max" | "color"> & { title: number; min?: number; valign?: "top" | "middle" | "bottom"; mark?: boolean; eyebrow?: boolean; sub?: boolean; subUpper?: boolean; cta?: boolean; ctaStyle?: "pill" | "rounded" | "square" | "block"; gap?: number; onDark?: boolean; markColor?: string };

/**
 * Colonne de texte (marque, surtitre, titre, ligne, bouton) : le titre prend toute la hauteur laissée libre, au plus
 * `title` ; s'il passe sous `min`, la ligne secondaire est retirée. Renvoie les calques posés.
 */
function column(k: Kit, col: Box, o: ColOpts) {
  const align = o.align ?? "left";
  const gap = o.gap ?? k.U * 0.03;
  const build = (y0: number, withSub: boolean) => {
    const start = k.layers.length;
    const xw = { x: col.x, w: col.w };
    const items: { l: Layer; after: number }[] = [];
    if (o.mark !== false) items.push({ l: k.brandMark({ ...xw, y: y0 }, { align, onDark: o.onDark, color: o.markColor }), after: gap * 1.2 });
    if (o.eyebrow && k.i.eyebrow) items.push({ l: k.label(k.i.eyebrow, { ...xw, y: y0 }, { size: Math.max(22, k.U * 0.026), align, color: k.c.accent, id: "eyebrow" }), after: gap * 0.5 });
    const head = items.reduce((a, it) => a + it.l.h + it.after, 0);
    const s = withSub ? k.subline({ ...xw, y: y0 }, { align, upper: o.subUpper }) : null;
    const bx = align === "center" ? col.x + col.w / 2 : align === "right" ? col.x + col.w : col.x;
    const b = o.cta === false ? null : k.button(bx, y0, { maxW: col.w, align, style: o.ctaStyle });
    const gs = gap * 0.7;
    const gb = gap * (s ? 1.1 : 1);
    const tail = (s ? gs + s.h : 0) + (b ? gb + b.h : 0);
    const t = fitTitle(k, { x: col.x, y: y0, w: col.w, h: col.h - head - tail }, { ...o, max: o.title });
    k.layers.splice(k.layers.indexOf(t), 1);
    k.layers.splice(start + items.length, 0, t);
    let y = y0;
    for (const it of items) ((it.l.y = y), (y += it.l.h + it.after));
    ((t.y = y), (y += t.h));
    if (s) ((y += gs), (s.y = y), (y += s.h));
    if (b) ((y += gb), (b.y = y), (y += b.h));
    return { start, used: y - y0, t };
  };
  let withSub = o.sub !== false;
  let r = build(col.y, withSub);
  if (withSub && k.i.subline && r.t.font.size < (o.min ?? o.title * 0.5)) {
    k.layers.splice(r.start);
    withSub = false;
    r = build(col.y, false);
  }
  const dy = Math.max(0, o.valign === "bottom" ? col.h - r.used : o.valign === "middle" ? (col.h - r.used) / 2 : 0);
  if (dy > 1) {
    k.layers.splice(r.start);
    r = build(col.y + dy, withSub);
  }
  const placed = k.layers.slice(r.start);
  for (const l of placed) {
    if (l.kind === "text") l.anchor = { ...l.anchor, v: k.anchorOf(l).v === "bottom" ? "bottom" : "top" };
    if (l.kind === "button") l.anchor = { ...l.anchor, v: l.y > k.H / 2 ? "bottom" : "top" };
  }
  return { y: col.y + dy, h: r.used, title: r.t, layers: placed };
}

/** Grille de points réguliers dans une zone (motif). */
function dots(k: Kit, zone: Box, step: number, d: number, color: string) {
  const nx = Math.floor(zone.w / step);
  const ny = Math.floor(zone.h / step);
  const ox = zone.x + (zone.w - (nx - 1) * step) / 2;
  const oy = zone.y + (zone.h - (ny - 1) * step) / 2;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) k.ellipse({ x: ox + x * step - d / 2, y: oy + y * step - d / 2, w: d, h: d }, color, { name: "Point" });
}

/** Tache de couleur floue (dégradé radial vers le transparent). */
const blob = (k: Kit, cx: number, cy: number, r: number, color: string, a = 0.9) =>
  k.rect({ x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, { type: "radial", angle: 0, stops: [{ offset: 0, color: rgba(color, a) }, { offset: 0.32, color: rgba(color, a * 0.7) }, { offset: 0.7, color: rgba(color, 0) }, { offset: 1, color: rgba(color, 0) }] }, { name: "Tache de couleur" });

export const TEMPLATES_C: Template[] = [
  {
    id: "giant-type",
    name: ["Titre géant", "Giant headline"],
    family: "type",
    photo: "optional",
    styles: ["bold", "warm", "craft"],
    schemes: ["accent", "brand", "dark", "light"],
    treatments: ["natural", "punch", "mono"],
    build(k) {
      k.fill();
      const { side, top, bottom } = k.m;
      const pic = k.hasPhoto;
      const gap = k.U * 0.035;
      if (k.cls === "land") {
        const pw = k.H * 0.44;
        const ph = k.H - top - bottom;
        const px = k.W - side - pw;
        if (pic) {
          k.rect({ x: px - pw * 0.2, y: top + ph * 0.1, w: pw, h: ph }, k.c.accent === k.c.bg ? k.c.ink : k.c.accent, { radius: pw / 2, name: "Pilule de couleur" });
          k.photo({ x: px, y: top, w: pw, h: ph }, { radius: pw / 2, focus: k.point(0) });
        } else k.ellipse({ x: k.W - k.H * 0.62, y: -k.H * 0.22, w: k.H * 0.9, h: k.H * 0.9 }, k.c.accent, { name: "Disque" });
        const w = (pic ? px - pw * 0.2 : k.W - k.H * 0.62) - side - k.W * 0.04;
        const mk = k.brandMark({ x: side, y: top, w });
        column(k, { x: side, y: top + mk.h + gap, w, h: k.H - top - bottom - mk.h - gap }, { mark: false, valign: "bottom", title: k.H * 0.22, display: true, maxLines: 4, gap: k.U * 0.035 });
        return;
      }
      const pw = k.W * k.pick(0, 0.25, 0.27, 0.3);
      const ph = pw * k.pick(1, 1.35, 1.45, 1.55);
      const mk = k.brandMark({ x: side, y: top, w: k.W * 0.5 });
      let y0 = top + mk.h + gap * 2;
      if (pic) {
        const px = k.W - side - pw;
        k.rect({ x: px - pw * 0.16, y: top + pw * 0.16, w: pw, h: ph }, k.c.accent === k.c.bg ? k.c.ink : k.c.accent, { radius: pw / 2, name: "Pilule de couleur" });
        k.photo({ x: px, y: top, w: pw, h: ph }, { radius: pw / 2, focus: k.point(0) });
        y0 = top + ph + pw * 0.16 + gap;
      } else {
        const d = k.W * 0.5;
        k.ellipse({ x: k.W - d * 0.72, y: y0 - gap - d, w: d, h: d }, k.c.accent, { name: "Disque" });
      }
      column(k, { x: side, y: y0, w: k.W - side * 2, h: k.H - bottom - y0 }, { mark: false, valign: "bottom", title: k.U * 0.24, display: true, maxLines: k.cls === "story" ? 5 : 4, gap: k.U * 0.035 });
    },
  },
];
