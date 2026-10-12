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

/**
 * Fond de schéma de ton moyen (orange, rouge vif…) sur lequel aucune encre n'atteint 4,6:1 : il est assombri vers la
 * couleur sombre de la marque, pour que les textes posés à même le fond restent lisibles sans voile ajouté.
 */
function legible(k: Kit) {
  const c = k.c;
  const best = (bg: string) => Math.max(contrast("#FFFFFF", bg), contrast("#111111", bg));
  let bg = c.bg;
  for (let n = 0; n < 10 && best(bg) < 5; n++) bg = mix(bg, c.dark, 0.12);
  if (bg === c.bg) return;
  c.bg = bg;
  const ink = contrast(c.light, bg) >= contrast(c.dark, bg) ? c.light : c.dark;
  c.ink = contrast(ink, bg) >= 4.6 ? ink : contrast("#FFFFFF", bg) >= contrast("#111111", bg) ? "#FFFFFF" : "#111111";
  c.soft = mix(c.ink, bg, 0.25);
  c.surface = isDark(bg) ? mix(bg, "#FFFFFF", 0.08) : mix(bg, "#000000", 0.05);
}

type TitleOpts = { max: number; display?: boolean; italic?: boolean; align?: TextLayer["align"]; upper?: boolean; maxLines?: number; color?: string; lineHeight?: number };

/**
 * Titre au plus grand qui tienne dans la boîte (largeur, hauteur, nombre de lignes) : contrairement au titre du kit,
 * qui vise une seule ligne, il occupe vraiment la surface prévue (affiche typographique).
 */
function fitTitle(k: Kit, b: Box, o: TitleOpts): TextLayer {
  const t = k.title({ x: b.x, y: b.y, w: b.w }, { size: o.max, display: o.display, italic: o.italic, align: o.align, upper: o.upper, maxLines: o.maxLines, color: o.color, lineHeight: o.lineHeight });
  const maxLines = o.maxLines ?? (k.cls === "story" ? 4 : 3);
  const text = t.uppercase ? t.text.toUpperCase() : t.text;
  const ratio = o.display ? -0.005 : -0.01;
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
    if (o.eyebrow && k.i.eyebrow) items.push({ l: k.label(k.i.eyebrow, { ...xw, y: y0 }, { size: Math.max(22, k.U * 0.026), align, color: k.c.accent, id: "eyebrow" }), after: gap * 0.75 });
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

/**
 * Tache de couleur floue (dégradé radial vers le transparent). Son intensité est bornée pour que l'encre du schéma
 * reste lisible partout où la tache passe (aucun voile ajouté sous les textes).
 */
function blob(k: Kit, cx: number, cy: number, r: number, color: string, a0 = 0.9) {
  let a = a0;
  while (a > 0.15 && contrast(k.c.ink, mix(k.c.bg, color, a)) < 5.6) a -= 0.05;
  return k.rect({ x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, { type: "radial", angle: 0, stops: [{ offset: 0, color: rgba(color, a) }, { offset: 0.32, color: rgba(color, a * 0.7) }, { offset: 0.7, color: rgba(color, 0) }, { offset: 1, color: rgba(color, 0) }] }, { name: "Tache de couleur" });
}

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
      legible(k);
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
      const pw = k.W * k.pick(0, 0.26, 0.29, 0.3);
      const ph = pw * k.pick(1, 1.3, 1.45, 1.3);
      const mk = k.brandMark({ x: side, y: top, w: k.W * 0.5 });
      let y0 = top + mk.h + gap * 2;
      if (pic) {
        const px = k.W - side - pw;
        k.rect({ x: px - pw * 0.16, y: top + pw * 0.16, w: pw, h: ph }, k.c.accent === k.c.bg ? k.c.ink : k.c.accent, { radius: pw / 2, name: "Pilule de couleur" });
        k.photo({ x: px, y: top, w: pw, h: ph }, { radius: pw / 2, focus: k.point(0) });
        y0 = top + ph + pw * 0.16 + gap;
      }
      const col = column(k, { x: side, y: y0, w: k.W - side * 2, h: k.H - bottom - y0 }, { mark: false, valign: "bottom", title: k.U * 0.24, min: k.U * 0.08, display: true, maxLines: k.cls === "story" ? 5 : 4, gap: k.U * 0.035 });
      if (!pic) {
        // Sans photo : un grand disque de couleur occupe l'espace au-dessus du titre (contrepoint graphique).
        const room = col.y - gap - top;
        const d = Math.min(k.W * 0.86, Math.max(k.W * 0.4, room * 1.25));
        const disc = k.ellipse({ x: k.W - d * 0.78, y: col.y - gap - d, w: d, h: d }, k.c.accent, { name: "Disque" });
        k.layers.splice(k.layers.indexOf(disc), 1);
        k.layers.splice(k.layers.indexOf(col.layers[0]), 0, disc);
      }
    },
  },
  {
    id: "dot-grid",
    name: ["Motif de points", "Dot grid"],
    family: "frame",
    photo: "optional",
    schemes: ["light", "brand", "dark"],
    treatments: ["natural", "warm", "cool"],
    build(k) {
      legible(k);
      k.fill();
      const { side, top, bottom } = k.m;
      const gap = k.U * 0.05;
      // Zone à motif de points (moitié droite en paysage, haut de l'image sinon) et disque centré dedans.
      const zone = k.cls === "land" ? { x: k.W * 0.5, y: 0, w: k.W * 0.5, h: k.H } : { x: 0, y: 0, w: k.W, h: k.H * k.pick(0.5, 0.46, 0.48, 0.45) };
      const zt = k.cls === "land" ? 0 : top * 0.7;
      const d = k.cls === "land" ? k.H * 0.7 : Math.min(k.W * 0.6, (zone.h - zt) * 0.86);
      const cx = zone.x + zone.w / 2;
      const cy = k.cls === "land" ? k.H / 2 : zt + (zone.h - zt) / 2;
      dots(k, zone, k.U * k.pick(0.06, 0.055, 0.055, 0.058), k.U * 0.014, mix(k.c.bg, k.c.accent, isDark(k.c.bg) ? 0.6 : 0.55));
      k.ellipse({ x: cx - d * 0.6, y: cy - d * 0.6, w: d * 1.2, h: d * 1.2 }, k.c.bg, { name: "Réserve" });
      k.ellipse({ x: cx - d * 0.54, y: cy - d * 0.54, w: d * 1.08, h: d * 1.08 }, null, { stroke: { color: k.c.accent, width: Math.max(3, Math.round(k.U * 0.006)) }, name: "Anneau" });
      if (k.hasPhoto) k.photo({ x: cx - d / 2, y: cy - d / 2, w: d, h: d }, { radius: d / 2, focus: k.point(0), zoom: 1.1 });
      else {
        k.ellipse({ x: cx - d / 2, y: cy - d / 2, w: d, h: d }, k.c.accent, { name: "Disque" });
        k.ellipse({ x: cx - d * 0.05, y: cy - d * 0.45, w: d * 0.5, h: d * 0.5 }, mix(k.c.accent, k.c.bg, 0.45), { name: "Disque clair" });
      }
      const col = k.cls === "land" ? { x: side, y: top, w: zone.x - side - k.W * 0.05, h: k.H - top - bottom } : { x: side, y: zone.h + gap * 0.6, w: k.W - side * 2, h: k.H - bottom - zone.h - gap * 0.6 };
      column(k, col, { valign: "middle", title: k.U * k.pick(0.11, 0.1, 0.12, 0.13), eyebrow: k.cls !== "square", align: k.cls === "land" ? "left" : "center" });
    },
  },
  {
    id: "gradient-blobs",
    name: ["Taches de couleur", "Colour blobs"],
    family: "type",
    photo: "optional",
    styles: ["premium", "warm", "bold"],
    schemes: ["dark", "brand", "light"],
    treatments: ["natural", "warm", "cool"],
    build(k) {
      legible(k);
      k.fill();
      const { side, top, bottom } = k.m;
      const pal = k.i.palette;
      const a = k.c.accent;
      const b = farthest([pal.primary, pal.secondary, pal.accent, k.c.vivid], [k.c.bg, a]);
      const pic = k.hasPhoto;
      // Grandes taches floues aux couleurs de la marque, surtout autour de la photo.
      const U = k.U;
      if (k.cls === "land") {
        blob(k, k.W * 0.62, k.H * 0.1, U * 0.8, a, 0.85);
        blob(k, k.W * 0.98, k.H * 0.92, U * 0.85, b, 0.8);
        blob(k, k.W * 0.05, k.H * 1.05, U * 0.5, mix(a, b, 0.5), 0.4);
      } else {
        blob(k, k.W * 0.12, k.H * 0.12, U * 0.75, a, 0.85);
        blob(k, k.W * 0.95, k.H * 0.38, U * 0.7, b, 0.8);
        blob(k, k.W * 0.1, k.H * 0.98, U * 0.55, mix(a, b, 0.5), 0.4);
      }
      if (!pic) {
        const w = k.W * k.pick(0.66, 0.84, 0.84, 0.84);
        column(k, { x: (k.W - w) / 2, y: top, w, h: k.H - top - bottom }, { align: "center", valign: "middle", title: U * k.pick(0.15, 0.14, 0.15, 0.16), eyebrow: true, ctaStyle: "pill" });
        return;
      }
      if (k.cls === "land") {
        const pw = k.H * 0.5;
        const pic0 = { x: k.W * 0.78 - pw / 2, y: top, w: pw, h: k.H - top - bottom };
        k.rect({ x: pic0.x - U * 0.02, y: pic0.y - U * 0.02, w: pic0.w + U * 0.04, h: pic0.h + U * 0.04 }, null, { radius: pic0.w / 2 + U * 0.02, stroke: { color: rgba(k.c.ink, 0.6), width: Math.max(2, Math.round(U * 0.003)) }, name: "Contour" });
        k.photo(pic0, { radius: pw / 2, focus: k.point(0) });
        column(k, { x: side, y: top, w: pic0.x - side - k.W * 0.07, h: k.H - top - bottom }, { valign: "middle", title: U * 0.12, eyebrow: true, ctaStyle: "pill" });
        return;
      }
      const pw = k.W * k.pick(0, 0.42, 0.46, 0.5);
      const ph = pw * k.pick(1, 1.15, 1.3, 1.25);
      const pic0 = { x: (k.W - pw) / 2, y: top + U * 0.02, w: pw, h: ph };
      k.rect({ x: pic0.x - U * 0.022, y: pic0.y - U * 0.022, w: pic0.w + U * 0.044, h: pic0.h + U * 0.044 }, null, { radius: pic0.w / 2 + U * 0.022, stroke: { color: rgba(k.c.ink, 0.6), width: Math.max(2, Math.round(U * 0.003)) }, name: "Contour" });
      k.photo(pic0, { radius: pw / 2, focus: k.point(0) });
      const y = pic0.y + ph + U * 0.07;
      column(k, { x: side, y, w: k.W - side * 2, h: k.H - bottom - y }, { align: "center", valign: "middle", title: U * k.pick(0.1, 0.09, 0.1, 0.11), ctaStyle: "pill" });
    },
  },
  {
    id: "color-blocks",
    name: ["Blocs de couleur", "Colour blocks"],
    family: "split",
    photo: "optional",
    styles: ["bold", "craft", "warm"],
    schemes: ["light", "brand", "dark"],
    treatments: ["natural", "punch", "mono"],
    build(k) {
      legible(k);
      const pal = k.i.palette;
      const a = k.c.accent;
      const b = farthest([pal.primary, pal.secondary, pal.accent, k.c.light, k.c.dark], [k.c.bg, a, k.c.ink]);
      const third = farthest([pal.primary, pal.secondary, pal.accent, k.c.vivid, k.c.light, k.c.dark, mix(a, k.c.dark, 0.5)], [k.c.bg, a, b]);
      // Composition à la Mondrian : des blocs séparés par des filets épais de la couleur d'encre.
      k.fill(k.c.ink);
      const g = Math.max(6, Math.round(k.U * 0.014));
      const h2 = g / 2;
      const { side, top, bottom } = k.m;
      let text: { x: number; y: number; w: number; h: number };
      let pic: { x: number; y: number; w: number; h: number };
      let disc: { x: number; y: number; w: number; h: number };
      if (k.cls === "land") {
        const W = k.W;
        const H = k.H;
        text = { x: 0, y: 0, w: W * 0.47 - h2, h: H };
        pic = { x: W * 0.47 + h2, y: 0, w: W * 0.35 - g, h: H * 0.68 - h2 };
        k.rect({ x: W * 0.82 + h2, y: 0, w: W * 0.18 - h2, h: H * 0.38 - h2 }, b, { name: "Bloc" });
        disc = { x: W * 0.82 + h2, y: H * 0.38 + h2, w: W * 0.18 - h2, h: H * 0.62 - h2 };
        k.rect(disc, a, { name: "Bloc" });
        k.rect({ x: W * 0.47 + h2, y: H * 0.68 + h2, w: W * 0.35 - g, h: H * 0.32 - h2 }, k.c.bg, { name: "Bloc" });
        k.rect({ x: W * 0.47 + h2, y: H * 0.68 + h2, w: W * 0.12, h: H * 0.32 - h2 }, third, { name: "Bloc" });
      } else {
        const W = k.W;
        const H = k.H;
        const ht = H * k.pick(0.5, 0.5, 0.5, 0.4);
        pic = { x: 0, y: 0, w: W * 0.64 - h2, h: ht - h2 };
        k.rect({ x: W * 0.64 + h2, y: 0, w: W * 0.36 - h2, h: ht * 0.42 - h2 }, a, { name: "Bloc" });
        disc = { x: W * 0.64 + h2, y: ht * 0.42 + h2, w: W * 0.36 - h2, h: ht * 0.58 - g };
        k.rect(disc, b, { name: "Bloc" });
        const sx = W * k.pick(0.8, 0.8, 0.82, 0.86);
        text = { x: 0, y: ht + h2, w: sx - h2, h: H - ht - h2 };
        k.rect({ x: sx + h2, y: ht + h2, w: W - sx - h2, h: (H - ht) * 0.3 - g }, third, { name: "Bloc" });
        k.rect({ x: sx + h2, y: ht + (H - ht) * 0.3, w: W - sx - h2, h: (H - ht) * 0.7 }, a, { name: "Bloc" });
      }
      k.rect(text, k.c.bg, { name: "Bloc du texte" });
      // Cercle (Bauhaus) dans un bloc de couleur.
      const dd = Math.min(disc.w, disc.h) * 0.62;
      k.ellipse({ x: disc.x + (disc.w - dd) / 2, y: disc.y + (disc.h - dd) / 2, w: dd, h: dd }, k.cls === "land" ? k.c.bg : a, { name: "Cercle" });
      if (k.hasPhoto) k.photo(pic, { focus: k.point(0) });
      else {
        k.rect(pic, third, { name: "Bloc" });
        const d = Math.min(pic.w, pic.h) * 0.78;
        k.ellipse({ x: pic.x + (pic.w - d) / 2, y: pic.y + (pic.h - d) / 2, w: d, h: d }, a, { name: "Cercle" });
        k.rect({ x: pic.x + (pic.w - d) / 2, y: pic.y + pic.h / 2, w: d, h: d / 2 }, b, { name: "Demi-cercle" });
      }
      const pad = k.U * 0.06;
      const x = Math.max(side, text.x + pad);
      const y = Math.max(top, text.y + pad);
      const col = { x, y, w: text.x + text.w - pad - x, h: Math.min(text.y + text.h - pad, k.H - bottom) - y };
      column(k, col, { valign: "middle", title: k.U * k.pick(0.11, 0.085, 0.1, 0.12), display: true, ctaStyle: "square", maxLines: k.cls === "story" ? 5 : 4 });
    },
  },
  {
    id: "ring-frame",
    name: ["Grand anneau", "Bold ring"],
    family: "frame",
    photo: "optional",
    styles: ["premium", "bold"],
    schemes: ["dark", "brand", "accent"],
    treatments: ["natural", "moody", "cool"],
    build(k) {
      legible(k);
      k.fill();
      const { side, top, bottom } = k.m;
      const U = k.U;
      if (k.hasPhoto) {
        // Photo en fond, floutée et assombrie : l'ambiance, sans gêner la lecture.
        k.photo({ x: 0, y: 0, w: k.W, h: k.H }, { full: true, fx: false, filter: "blur(18px) brightness(0.62) saturate(1.15)" });
        k.rect({ x: 0, y: 0, w: k.W, h: k.H }, rgba(k.c.dark, 0.35), { role: "scrim", name: "Voile" });
      } else {
        let t = 0.3;
        while (t > 0.04 && contrast(k.c.ink, mix(k.c.bg, k.c.accent, t)) < 5.6) t -= 0.04;
        k.rect({ x: 0, y: 0, w: k.W, h: k.H }, { type: "radial", angle: 0, stops: [{ offset: 0, color: mix(k.c.bg, k.c.accent, t) }, { offset: 0.75, color: k.c.bg }] }, { name: "Lumière" });
      }
      const ringW = Math.max(8, Math.round(U * 0.024));
      const ring = (cx: number, cy: number, d: number) => {
        k.ellipse({ x: cx - d / 2 - U * 0.035, y: cy - d / 2 - U * 0.035, w: d + U * 0.07, h: d + U * 0.07 }, null, { stroke: { color: rgba(k.c.light, 0.5), width: Math.max(2, Math.round(U * 0.003)) }, name: "Anneau fin" });
        k.ellipse({ x: cx - d / 2, y: cy - d / 2, w: d, h: d }, null, { stroke: { color: k.c.accent, width: ringW }, name: "Anneau" });
      };
      const inner = (cx: number, cy: number, d: number) =>
        column(k, { x: cx - d * 0.37, y: cy - d * 0.34, w: d * 0.74, h: d * 0.68 }, { align: "center", valign: "middle", mark: false, cta: false, title: d * 0.16, italic: true, maxLines: 4 });
      if (k.cls === "land") {
        const d = k.H * 0.84;
        const cx = side + d / 2;
        ring(cx, k.H / 2, d);
        inner(cx, k.H / 2, d);
        const x = cx + d / 2 + k.W * 0.06;
        const w = k.W - side - x;
        const mk = k.brandMark({ x, y: 0, w });
        const bt = k.button(x, 0, { maxW: w });
        const h = mk.h + U * 0.08 + bt.h;
        mk.y = (k.H - h) / 2;
        bt.y = mk.y + mk.h + U * 0.08;
        return;
      }
      const mk = k.brandMark({ x: side, y: top, w: k.W - side * 2 }, { align: "center" });
      const bt = k.button(k.W / 2, 0, { maxW: k.W - side * 2, align: "center" });
      // L'anneau et le bouton forment un groupe centré entre la marque et la marge basse.
      const y0 = mk.y + mk.h + U * 0.07;
      const yb = k.H - bottom;
      const g = U * 0.06;
      const d = Math.min(k.W * 0.84, yb - y0 - bt.h - g);
      const start = y0 + (yb - y0 - (d + g + bt.h)) / 2;
      const cy = start + d / 2;
      bt.y = start + d + g;
      bt.anchor = { ...bt.anchor, v: "bottom" };
      ring(k.W / 2, cy, d);
      inner(k.W / 2, cy, d);
    },
  },
  {
    id: "corner-ribbon",
    name: ["Ruban en coin", "Corner ribbon"],
    family: "promo",
    photo: "required",
    styles: ["bold", "warm", "craft"],
    schemes: ["light", "brand", "accent"],
    treatments: ["natural", "punch", "warm"],
    build(k) {
      legible(k);
      k.fill();
      const { side, top, bottom } = k.m;
      const U = k.U;
      const card = k.cls === "land" ? { x: k.W * 0.47, y: top, w: k.W * 0.53 - side, h: k.H - top - bottom } : { x: side, y: top, w: k.W - side * 2, h: k.H * k.pick(0, 0.46, 0.48, 0.36) };
      k.rect({ x: card.x - U * 0.02, y: card.y + U * 0.02, w: card.w, h: card.h }, k.c.accent, { name: "Ombre décalée" });
      k.photo(card, { focus: k.point(0) });
      const word = k.shortWord();
      if (word) {
        // Ruban en travers du coin : mesuré sur le mot, le texte reste entièrement sur le ruban.
        const size = Math.max(24, Math.round(U * k.pick(0.036, 0.032, 0.032, 0.032)));
        const t = k.text("body", word, { x: 0, y: 0, w: U * 0.36 }, { weight: 700, size, align: "center", upper: true, spacing: Math.round(size * 0.12), lineHeight: 1.1, maxLines: 2, minSize: 22 }, "ribbon", "Ruban");
        ctx.font = serverFont(t.font.family, t.font.weight, t.font.size, false);
        ctx.letterSpacing = `${t.letterSpacing}px`;
        const wt = Math.max(...wrap(ctx, word.toUpperCase(), t.w).map((x) => ctx.measureText(x).width));
        ctx.letterSpacing = "0px";
        t.w = Math.ceil(wt + size * 0.3);
        const ht = t.h;
        const pad = size * 0.35;
        const band = (t.w + ht) / Math.SQRT2 + pad * 2;
        const s = t.w / 2 + pad;
        const cx = card.x + card.w;
        const cy = card.y;
        const px = cx - s;
        const py = cy + s;
        const uf = 2 * s - band / Math.SQRT2;
        const q = Math.max(0, uf) * Math.SQRT2;
        const ribbon = k.c.btn;
        if (q > 0) k.rect({ x: cx - q / 2, y: cy - q / 2, w: q, h: q }, mix(ribbon, "#000000", 0.35), { rotation: 45, name: "Pli du ruban" });
        const L = (2 * s + band) * 2;
        k.rect({ x: px - L / 2, y: py - band / 2, w: L, h: band }, ribbon, { rotation: 45, name: "Ruban", shadow: { color: "rgba(0,0,0,0.25)", blur: Math.round(U * 0.02), x: 0, y: Math.round(U * 0.006) } });
        // Le ruban s'arrête net aux bords de la photo (caches de la couleur du fond).
        k.rect({ x: cx - 2 * s - band * 2, y: cy - L, w: L * 2, h: L }, k.c.bg, { name: "Cache" });
        k.rect({ x: cx, y: cy - U * 0.05, w: L, h: L * 2 }, k.c.bg, { name: "Cache" });
        k.layers.splice(k.layers.indexOf(t), 1);
        t.x = px - t.w / 2;
        t.y = py - t.h / 2;
        t.rotation = 45;
        t.color = k.c.btnInk;
        k.layers.push(t);
      }
      const col = k.cls === "land" ? { x: side, y: top, w: card.x - side - k.W * 0.06, h: k.H - top - bottom } : { x: side, y: card.y + card.h + U * 0.07, w: k.W - side * 2, h: k.H - bottom - card.y - card.h - U * 0.07 };
      column(k, col, { valign: "middle", title: U * k.pick(0.11, 0.1, 0.1, 0.11), display: true, ctaStyle: "square", maxLines: 4 });
    },
  },
  {
    id: "half-circle",
    name: ["Demi-cercle de couleur", "Colour half-circle"],
    family: "frame",
    photo: "required",
    styles: ["warm", "premium", "craft"],
    schemes: ["light", "dark", "brand"],
    treatments: ["natural", "warm", "punch"],
    build(k) {
      legible(k);
      k.fill();
      const { side, top, bottom } = k.m;
      const U = k.U;
      const ringW = Math.max(6, Math.round(U * 0.012));
      if (k.cls === "land") {
        const D = k.H * 1.5;
        const d = k.H * 0.68;
        const pcx = k.W - side - d / 2 - k.W * 0.03;
        k.ellipse({ x: pcx - D * 0.42, y: k.H / 2 - D / 2, w: D, h: D }, k.c.accent, { name: "Demi-cercle" });
        k.ellipse({ x: pcx - D * 0.42 - U * 0.06, y: k.H / 2 - D / 2 - U * 0.06, w: D + U * 0.12, h: D + U * 0.12 }, null, { stroke: { color: k.c.accent, width: Math.max(2, Math.round(U * 0.004)) }, name: "Arc" });
        k.ellipse({ x: pcx - d / 2 - ringW, y: k.H / 2 - d / 2 - ringW, w: d + ringW * 2, h: d + ringW * 2 }, k.c.bg, { name: "Liseré" });
        k.photo({ x: pcx - d / 2, y: k.H / 2 - d / 2, w: d, h: d }, { radius: d / 2, focus: k.point(0), zoom: 1.1 });
        const x1 = pcx - D * 0.42 - U * 0.1;
        column(k, { x: side, y: top, w: x1 - side, h: k.H - top - bottom }, { valign: "middle", title: U * 0.12, eyebrow: true });
        return;
      }
      const d = k.W * k.pick(0, 0.46, 0.58, 0.7);
      const py = k.H - d - k.H * k.pick(0, 0.06, 0.06, 0.09);
      const D = k.W * 1.3;
      const dy = py + d * 0.4;
      k.ellipse({ x: k.W / 2 - D / 2, y: dy, w: D, h: D }, k.c.accent, { name: "Demi-cercle" });
      k.ellipse({ x: k.W / 2 - D / 2 - U * 0.05, y: dy - U * 0.05, w: D + U * 0.1, h: D + U * 0.1 }, null, { stroke: { color: k.c.accent, width: Math.max(2, Math.round(U * 0.004)) }, name: "Arc" });
      k.ellipse({ x: (k.W - d) / 2 - ringW, y: py - ringW, w: d + ringW * 2, h: d + ringW * 2 }, k.c.bg, { name: "Liseré" });
      k.photo({ x: (k.W - d) / 2, y: py, w: d, h: d }, { radius: d / 2, focus: k.point(0), zoom: 1.1 });
      const y1 = py - U * 0.06;
      column(k, { x: side, y: top, w: k.W - side * 2, h: y1 - top }, { align: "center", valign: "middle", title: U * k.pick(0.1, 0.1, 0.12, 0.13), eyebrow: true });
    },
  },
  {
    id: "fanned-cards",
    name: ["Cartes en éventail", "Fanned cards"],
    family: "collage",
    photo: "required",
    styles: ["warm", "bold", "craft"],
    schemes: ["brand", "light", "dark"],
    treatments: ["natural", "warm", "punch"],
    build(k) {
      legible(k);
      k.fill();
      const { side, top, bottom } = k.m;
      const U = k.U;
      k.rect({ x: 0, y: 0, w: k.W, h: k.H }, { type: "radial", angle: 0, stops: [{ offset: 0, color: mix(k.c.bg, "#FFFFFF", isDark(k.c.bg) ? 0.1 : 0.25) }, { offset: 1, color: k.c.bg }] }, { name: "Lumière" });
      const land = k.cls === "land";
      const cw = land ? k.H * 0.44 : k.W * k.pick(0, 0.3, 0.34, 0.36);
      const ch = cw * 1.25;
      const ccx = land ? k.W * 0.715 : k.W / 2;
      const cy = land ? (k.H - ch) / 2 : top + U * k.pick(0, 0.04, 0.04, 0.12);
      const pad = cw * 0.045;
      // Emprise réelle des cartes après rotation (pour placer le texte à côté, sans chevauchement).
      const ext = { x0: k.W, x1: 0, y1: 0 };
      const card = (dx: number, deg: number, focus: { u: number; v: number }, zoom: number) => {
        const x = ccx - cw / 2 + dx;
        const fr = k.rect({ x, y: cy, w: cw, h: ch }, "#FFFFFF", { radius: U * 0.01, name: "Carte", shadow: { color: "rgba(0,0,0,0.28)", blur: Math.round(U * 0.035), x: 0, y: Math.round(U * 0.012) } });
        const ph = k.photo({ x: x + pad, y: cy + pad, w: cw - pad * 2, h: ch - pad * 2 }, { radius: U * 0.006, focus, zoom })!;
        k.rotateGroup([fr, ph], deg, ccx + dx * 0.3, cy + ch * 1.3);
        const a = (fr.rotation * Math.PI) / 180;
        const ex = (Math.abs(Math.cos(a)) * fr.w + Math.abs(Math.sin(a)) * fr.h) / 2;
        const ey = (Math.abs(Math.sin(a)) * fr.w + Math.abs(Math.cos(a)) * fr.h) / 2;
        ext.x0 = Math.min(ext.x0, fr.x + fr.w / 2 - ex);
        ext.x1 = Math.max(ext.x1, fr.x + fr.w / 2 + ex);
        ext.y1 = Math.max(ext.y1, fr.y + fr.h / 2 + ey);
      };
      card(-cw * 0.6, -8, k.point(1), 1.9);
      card(cw * 0.6, 8, k.point(2), 1.9);
      card(0, 0, k.point(0), 1);
      const col = land ? { x: side, y: top, w: ext.x0 - side - k.W * 0.04, h: k.H - top - bottom } : { x: side, y: ext.y1 + U * 0.06, w: k.W - side * 2, h: k.H - bottom - ext.y1 - U * 0.06 };
      column(k, col, { valign: "middle", title: U * k.pick(0.11, 0.1, 0.11, 0.12), align: land ? "left" : "center" });
    },
  },
  {
    id: "type-minimal",
    name: ["Épuré", "Minimal"],
    family: "type",
    photo: "optional",
    styles: ["premium", "craft"],
    schemes: ["light", "dark", "mono"],
    treatments: ["natural", "mono", "warm"],
    build(k) {
      legible(k);
      k.fill();
      const { side, top, bottom } = k.m;
      const U = k.U;
      const land = k.cls === "land";
      const pic = k.hasPhoto;
      // Paysage avec photo : petite photo à gauche, le reste centré dans l'espace libre.
      const ps = land ? k.H * 0.5 : k.W * k.pick(0, 0.2, 0.26, 0.32);
      const area = land && pic ? { x: side + ps + k.W * 0.06, w: k.W - side * 2 - ps - k.W * 0.06 } : { x: side, w: k.W - side * 2 };
      const cx = area.x + area.w / 2;
      const mk = k.brandMark({ x: area.x, y: top, w: area.w }, { align: "center" });
      const bt = k.button(cx, 0, { maxW: area.w, align: "center", style: "square", size: U * k.pick(0.034, 0.028, 0.028, 0.03), arrow: false });
      bt.y = k.H - bottom - bt.h;
      bt.anchor = { ...bt.anchor, v: "bottom" };
      const tw = Math.min(area.w, k.W * k.pick(0.5, 0.7, 0.72, 0.76));
      const lw = U * 0.1;
      const gap = U * 0.045;
      const t = fitTitle(k, { x: cx - tw / 2, y: 0, w: tw, h: k.H * 0.4 }, { max: U * k.pick(0.085, 0.075, 0.085, 0.1), italic: true, align: "center", maxLines: 3 });
      const s = k.subline({ x: cx - tw / 2, y: 0, w: tw }, { align: "center", upper: true, size: Math.max(22, U * 0.024) });
      const showPic = pic && !land;
      const h = (showPic ? ps + gap * 1.4 : 0) + gap + t.h + gap + (s ? gap * 0.8 + s.h : 0);
      const y0 = mk.y + mk.h + (bt.y - mk.y - mk.h - h) / 2;
      let y = y0;
      if (showPic) {
        k.photo({ x: cx - ps / 2, y, w: ps, h: ps }, { radius: ps / 2, focus: k.point(0), zoom: 1.15 });
        y += ps + gap * 1.4;
      }
      k.line(cx - lw / 2, y, lw, k.c.accent);
      y += gap;
      t.y = y;
      y += t.h + gap;
      k.line(cx - lw / 2, y, lw, k.c.accent);
      if (s) s.y = y + gap * 0.8;
      if (land && pic) k.photo({ x: side, y: (k.H - ps * 1.3) / 2, w: ps, h: ps * 1.3 }, { radius: ps / 2, focus: k.point(0) });
      for (const l of [t, s]) if (l) l.anchor = { ...l.anchor, v: "top" };
    },
  },
  {
    id: "stripes-bold",
    name: ["Rayures franches", "Bold stripes"],
    family: "promo",
    photo: "optional",
    styles: ["bold", "warm"],
    schemes: ["accent", "brand", "dark"],
    treatments: ["punch", "natural", "warm"],
    build(k) {
      legible(k);
      k.fill();
      const { side, top, bottom } = k.m;
      const U = k.U;
      // Grandes rayures diagonales franches (fond et accent de la marque).
      const sw = U * 0.075;
      const D = (k.W + k.H) * 1.5;
      for (let x = -k.H; x < k.W + k.H; x += sw * 2) k.rect({ x: x - sw / 2, y: k.H / 2 - D / 2, w: sw, h: D }, k.c.accent, { rotation: 45, name: "Rayure" });
      const cardC = farthest([k.c.light, k.c.dark, "#FFFFFF"], [k.c.bg, k.c.accent]);
      const card = k.pick({ x: k.W * 0.08, y: k.H * 0.1, w: k.W * 0.84, h: k.H * 0.8 }, { x: k.W * 0.085, y: k.H * 0.08, w: k.W * 0.83, h: k.H * 0.84 }, { x: k.W * 0.1, y: k.H * 0.09, w: k.W * 0.8, h: k.H * 0.82 }, { x: k.W * 0.1, y: top - k.H * 0.025, w: k.W * 0.8, h: k.H - top - bottom + k.H * 0.05 });
      const off = U * 0.022;
      k.rect({ x: card.x + off, y: card.y + off, w: card.w, h: card.h }, k.c.dark, { name: "Ombre décalée" });
      k.rect(card, cardC, { name: "Carte" });
      const pad = U * 0.045;
      const inside = { x: card.x + pad, y: card.y + pad, w: card.w - pad * 2, h: card.h - pad * 2 };
      let col = inside;
      if (k.hasPhoto) {
        if (k.cls === "land") {
          const pw = inside.w * 0.44;
          k.photo({ x: inside.x, y: inside.y, w: pw, h: inside.h }, { focus: k.point(0) });
          col = { x: inside.x + pw + pad, y: inside.y, w: inside.w - pw - pad, h: inside.h };
        } else {
          const ph = inside.h * k.pick(0, 0.36, 0.46, 0.44);
          k.photo({ x: inside.x, y: inside.y, w: inside.w, h: ph }, { focus: k.point(0) });
          col = { x: inside.x, y: inside.y + ph + pad, w: inside.w, h: inside.h - ph - pad };
        }
      }
      const y = Math.max(col.y, top);
      const y1 = Math.min(col.y + col.h, k.H - bottom);
      const x = Math.max(col.x, side);
      column(k, { x, y, w: Math.min(col.x + col.w, k.W - side) - x, h: y1 - y }, { valign: "middle", align: k.hasPhoto && k.cls === "land" ? "left" : "center", title: U * (k.hasPhoto ? k.pick(0.1, 0.09, 0.1, 0.13) : k.pick(0.14, 0.13, 0.15, 0.17)), display: true, ctaStyle: "square", eyebrow: !k.hasPhoto, maxLines: 4 });
    },
  },
];
