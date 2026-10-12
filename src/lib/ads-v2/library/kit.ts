/**
 * Kit de conception de la bibliothèque de modèles de publications : chaque modèle (templates/*.ts) dessine sa
 * composition avec ces outils — photo (pleine page, cadrée dans une forme, recadrée sur un détail), formes (aplats,
 * cercles, filets, anneaux, dégradés), textes mesurés (titre d'affiche, marque, surtitre, ligne), bouton, logo — et
 * le kit garantit la qualité commune : tailles minimales, textes dans les marges, contraste mesuré sur ce qui est
 * réellement dessiné sous chaque texte (encre corrigée, voile ajouté au besoin).
 * Les couleurs viennent d'un « schéma » (sombre, clair, marque, accent, noir et blanc) tiré de la palette du projet.
 */
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { contrast, ensureContrast, isDark, mix } from "../../color";
import { layoutText, renderDoc, type RenderEnv } from "../../ad-doc/render";
import { serverFont } from "../../ad-doc/server";
import { DOC_VERSION, type AdDocument, type ButtonLayer, type Fill, type ImageLayer, type Layer, type ShapeLayer, type TextLayer } from "../../ad-doc/types";
import type { Palette, Typo } from "../../media/compose";
import { TREATMENT_FILTER, type AdArt, type Treatment } from "../art";
import type { FormatSpec } from "../types";

export type Box = { x: number; y: number; w: number; h: number };
export type Cls = "land" | "square" | "portrait" | "story";
export const SCHEMES = ["dark", "light", "brand", "accent", "mono"] as const;
export type Scheme = (typeof SCHEMES)[number];
type Anchor = Layer["anchor"];

export type KitInput = {
  format: FormatSpec;
  palette: Palette;
  typo: Typo;
  art: AdArt;
  brand: string;
  headline: string;
  subline: string | null;
  eyebrow: string | null;
  cta: string;
  scheme: Scheme;
  treatment: Treatment;
  photo: { id: string; width: number; height: number; points: { u: number; v: number }[] } | null;
  logo: { id: string; width: number; height: number; lightId: string | null } | null;
  images: RenderEnv["images"];
};

const satOf = (hex: string) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
  const mx = Math.max(r, g, b);
  return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
};
export const rgba = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};

/** Couleurs d'un schéma : fond, surface (cartes), encre, encre douce, accent, bouton. */
export function schemeColors(s: Scheme, pal: Palette) {
  const light = isDark(pal.light) ? "#F6F3EE" : pal.light;
  const dark = isDark(pal.dark) ? pal.dark : "#161616";
  const vivid = [pal.accent, pal.secondary, pal.primary].sort((a, b) => satOf(b) - satOf(a))[0];
  const bg = s === "dark" ? mix(dark, "#000000", 0.15) : s === "light" ? light : s === "brand" ? pal.primary : s === "accent" ? vivid : isDark(dark) ? "#111111" : "#F2EFEA";
  const ink = contrast(light, bg) >= contrast(dark, bg) ? light : dark;
  const inkOk = contrast(ink, bg) >= 4.6 ? ink : contrast("#FFFFFF", bg) >= contrast("#111111", bg) ? "#FFFFFF" : "#111111";
  let accent = [vivid, pal.accent, pal.secondary, pal.primary].find((c) => contrast(c, bg) >= 2.2 && c.toLowerCase() !== bg.toLowerCase()) ?? (isDark(bg) ? mix(vivid, "#FFFFFF", 0.5) : mix(vivid, "#000000", 0.4));
  if (contrast(accent, bg) < 2.2) accent = ensureContrast(accent, bg, 2.2);
  const surface = isDark(bg) ? mix(bg, "#FFFFFF", 0.08) : mix(bg, "#000000", 0.05);
  const btn = contrast(accent, bg) >= 2.4 ? accent : inkOk;
  const btnInk0 = contrast("#FFFFFF", btn) >= contrast("#111111", btn) ? "#FFFFFF" : "#111111";
  const btnFill = contrast(btnInk0, btn) >= 4.6 ? btn : ensureContrast(btn, btnInk0, 4.6);
  return { bg, surface, ink: inkOk, soft: mix(inkOk, bg, 0.25), accent, btn: btnFill, btnInk: btnInk0, light, dark, vivid };
}
export type Colors = ReturnType<typeof schemeColors>;

/** Points d'intérêt de la photo (zones les plus détaillées), pour recadrer sur un détail (collages, loupes). */
export async function interestPoints(buf: Buffer): Promise<{ u: number; v: number }[]> {
  const n = 6;
  const { data, info } = await sharp(buf).rotate().resize(48, 48, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => data[Math.min(info.height - 1, y) * info.width + Math.min(info.width - 1, x)] / 255;
  const cells: { u: number; v: number; e: number }[] = [];
  for (let cy = 0; cy < n; cy++)
    for (let cx = 0; cx < n; cx++) {
      let e = 0;
      for (let y = cy * 8; y < cy * 8 + 8; y++) for (let x = cx * 8; x < cx * 8 + 8; x++) e += Math.abs(at(x, y) - at(x + 1, y)) + Math.abs(at(x, y) - at(x, y + 1));
      cells.push({ u: (cx + 0.5) / n, v: (cy + 0.5) / n, e: e * (1 - 0.5 * Math.hypot((cx + 0.5) / n - 0.5, (cy + 0.5) / n - 0.5)) });
    }
  cells.sort((a, b) => b.e - a.e);
  const out: { u: number; v: number }[] = [];
  for (const c of cells) if (out.every((o) => Math.hypot(o.u - c.u, o.v - c.v) > 0.3)) out.push({ u: c.u, v: c.v });
  return out.slice(0, 4);
}

type TextStyle = { family?: string; weight?: number; size: number; italic?: boolean; align?: TextLayer["align"]; upper?: boolean; spacing?: number; lineHeight?: number; maxLines?: number; color?: string; minSize?: number; shadow?: TextLayer["shadow"] };

export class Kit {
  readonly W: number;
  readonly H: number;
  readonly cls: Cls;
  readonly U: number;
  readonly m: { top: number; bottom: number; side: number };
  readonly c: Colors;
  readonly layers: Layer[] = [];
  readonly fx: Partial<ImageLayer>;
  private ctx = createCanvas(8, 8).getContext("2d");
  private n = 0;
  constructor(readonly i: KitInput) {
    const { width: W, height: H } = i.format;
    this.W = W;
    this.H = H;
    const r = W / H;
    this.cls = r >= 1.4 ? "land" : r > 0.9 ? "square" : r > 0.7 ? "portrait" : "story";
    this.U = this.cls === "land" ? H : W;
    const safe = { top: Math.round(H * i.format.safe.top), bottom: Math.round(H * i.format.safe.bottom), side: Math.round(W * i.format.safe.side) };
    this.m = { top: Math.max(safe.top, Math.round(H * (this.cls === "land" ? 0.09 : 0.06))), bottom: Math.max(safe.bottom, Math.round(H * (this.cls === "land" ? 0.09 : 0.06))), side: Math.max(safe.side, Math.round(W * (this.cls === "land" ? 0.055 : 0.07))) };
    this.c = schemeColors(i.scheme, i.palette);
    const pal = i.palette;
    this.fx = i.treatment === "duotone" ? { filter: TREATMENT_FILTER.duotone, duotone: { dark: mix(mix(isDark(pal.dark) ? pal.dark : "#1A1A1A", pal.primary, 0.35), "#000000", 0.2), light: mix(this.c.light, pal.accent, 0.45) } } : TREATMENT_FILTER[i.treatment] ? { filter: TREATMENT_FILTER[i.treatment] } : {};
  }
  get wide() {
    return this.cls === "land" || this.cls === "square";
  }
  get tall() {
    return this.cls === "portrait" || this.cls === "story";
  }
  get hasPhoto() {
    return !!this.i.photo;
  }
  /** Valeur selon le format (paysage, carré, portrait, story). */
  pick<T>(land: T, square: T, portrait: T, story: T = portrait): T {
    return { land, square, portrait, story }[this.cls];
  }
  private id(p: string) {
    return `t-${p}-${++this.n}`;
  }
  private base(id: string, name: string, role: Layer["role"], b: Box, anchor: Anchor) {
    return { id, name, role, x: b.x, y: b.y, w: b.w, h: b.h, rotation: 0, opacity: 1, visible: true, locked: false, anchor };
  }
  anchorOf(b: Box): Anchor {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const h = b.w >= this.W * 0.95 ? "stretch" : cx < this.W * 0.38 ? "left" : cx > this.W * 0.62 ? "right" : "center";
    const v = b.h >= this.H * 0.95 ? "stretch" : cy < this.H * 0.38 ? "top" : cy > this.H * 0.62 ? "bottom" : "middle";
    return { h, v };
  }

  // ------------------------------------------------------------------ fonds, formes
  fill(color: Fill = this.c.bg) {
    const l: ShapeLayer = { ...this.base("bg-fill", "Fond", "background", { x: 0, y: 0, w: this.W, h: this.H }, { h: "stretch", v: "stretch" }), kind: "shape", shape: "rect", fill: color, stroke: null, radius: 0, shadow: null };
    this.layers.push(l);
    return l;
  }
  rect(b: Box, fill: Fill | null, o: { radius?: number; rotation?: number; stroke?: ShapeLayer["stroke"]; shadow?: ShapeLayer["shadow"]; opacity?: number; name?: string; role?: Layer["role"]; id?: string } = {}) {
    const l: ShapeLayer = { ...this.base(o.id ?? this.id("rect"), o.name ?? "Forme", o.role ?? "decor", b, this.anchorOf(b)), kind: "shape", shape: "rect", fill, stroke: o.stroke ?? null, radius: o.radius ?? 0, shadow: o.shadow ?? null, rotation: o.rotation ?? 0, opacity: o.opacity ?? 1 };
    this.layers.push(l);
    return l;
  }
  ellipse(b: Box, fill: Fill | null, o: { rotation?: number; stroke?: ShapeLayer["stroke"]; shadow?: ShapeLayer["shadow"]; opacity?: number; name?: string } = {}) {
    const l = this.rect(b, fill, { ...o, name: o.name ?? "Cercle" });
    l.shape = "ellipse";
    return l;
  }
  line(x: number, y: number, w: number, color: string, width = Math.max(2, Math.round(this.U * 0.003))) {
    const l = this.rect({ x, y, w, h: width }, null, { stroke: { color, width }, name: "Filet" });
    l.shape = "line";
    return l;
  }
  /** Dégradé (voile) vers une couleur : angle 0 = de gauche, 90 = du haut, 180 = de droite, 270 = du bas. */
  veil(b: Box, angle: number, color: string, alpha: number, o: { id?: string } = {}) {
    return this.rect(b, { type: "linear", angle, stops: [{ offset: 0, color: rgba(color, alpha) }, { offset: 0.55, color: rgba(color, alpha * 0.6) }, { offset: 1, color: rgba(color, 0) }] }, { name: "Voile", role: "scrim", id: o.id });
  }

  // ------------------------------------------------------------------ photo
  /** Recadrage normalisé de la photo pour remplir une forme `b`, centré sur un point (u, v) avec un zoom. */
  cropFor(b: Box, focus: { u: number; v: number } = { u: 0.5, v: 0.5 }, zoom = 1): ImageLayer["crop"] {
    const p = this.i.photo;
    if (!p) return null;
    const ar = b.w / b.h;
    let cw = p.width;
    let ch = cw / ar;
    if (ch > p.height) ((ch = p.height), (cw = ch * ar));
    cw /= zoom;
    ch /= zoom;
    const x = Math.max(0, Math.min(p.width - cw, focus.u * p.width - cw / 2));
    const y = Math.max(0, Math.min(p.height - ch, focus.v * p.height - ch / 2));
    return { x: x / p.width, y: y / p.height, w: cw / p.width, h: ch / p.height };
  }
  /** Point d'intérêt n° k de la photo (0 = le plus détaillé). */
  point(k: number) {
    const pts = this.i.photo?.points ?? [];
    return pts.length ? pts[k % pts.length] : { u: 0.5, v: 0.5 };
  }
  photo(b: Box, o: { radius?: number; rotation?: number; focus?: { u: number; v: number }; zoom?: number; shadow?: ImageLayer["shadow"]; full?: boolean; fx?: boolean; filter?: string; name?: string } = {}) {
    if (!this.i.photo) return null;
    const crop = o.full || (!o.focus && !o.zoom) ? null : this.cropFor(b, o.focus, o.zoom ?? 1);
    const l: ImageLayer = { ...this.base(o.full ? "bg-photo" : this.id("photo"), o.name ?? "Photo", o.full ? "background" : "image", b, o.full ? { h: "stretch", v: "stretch" } : this.anchorOf(b)), kind: "image", assetId: this.i.photo.id, fit: "cover", crop, radius: o.radius ?? 0, shadow: o.shadow ?? null, rotation: o.rotation ?? 0, ...(o.fx === false ? {} : this.fx), ...(o.filter ? { filter: o.filter } : {}) };
    this.layers.push(l);
    return l;
  }
  fullPhoto() {
    return this.photo({ x: 0, y: 0, w: this.W, h: this.H }, { full: true });
  }

  // ------------------------------------------------------------------ textes
  private measure(l: TextLayer, maxLines: number) {
    while (l.font.size > (l.autoFit?.minSize ?? 22) && layoutText(this.ctx, l, { font: serverFont }).lines.length > maxLines) l.font.size = Math.round(l.font.size * 0.94);
    const t = layoutText(this.ctx, l, { font: serverFont });
    l.font.size = t.size;
    l.h = Math.ceil(t.lines.length * t.size * l.lineHeight + t.size * 0.12);
    return t.lines.length;
  }
  text(role: Layer["role"], text: string, b: { x: number; y: number; w: number }, s: TextStyle, id?: string, name?: string): TextLayer {
    const size = Math.max(22, Math.round(s.size));
    const l: TextLayer = { ...this.base(id ?? this.id("text"), name ?? "Texte", role, { ...b, h: size * 1.3 }, { h: s.align === "center" ? "center" : s.align === "right" ? "right" : "left", v: "top" }), kind: "text", text, font: { family: s.family ?? this.i.art.body, weight: s.weight ?? 400, size, italic: !!s.italic }, color: s.color ?? this.c.ink, align: s.align ?? "left", lineHeight: s.lineHeight ?? 1.2, letterSpacing: s.spacing ?? 0, uppercase: !!s.upper, autoFit: { minSize: Math.max(22, s.minSize ?? Math.round(size * 0.6)) }, shadow: s.shadow ?? null, balance: true };
    this.measure(l, s.maxLines ?? 3);
    l.anchor = { ...l.anchor, v: this.anchorOf(l).v === "bottom" ? "bottom" : "top" };
    this.layers.push(l);
    return l;
  }
  /** Titre d'affiche : police de titre (ou d'affiche « display »), graisse franche, interlignage serré. */
  title(b: { x: number; y: number; w: number }, o: { size: number; display?: boolean; italic?: boolean; align?: TextLayer["align"]; upper?: boolean; maxLines?: number; color?: string; text?: string; lineHeight?: number; spacing?: number } ) {
    const a = this.i.art;
    const fam = o.display ? a.display : a.heading;
    const l = this.text("title", o.text ?? this.i.headline, b, { family: fam, weight: o.display ? a.displayWeight : a.headingWeight, size: o.size, italic: o.italic && /Cormorant|Instrument Serif/.test(fam), align: o.align, upper: o.upper ?? (o.display ? true : a.uppercase), lineHeight: o.lineHeight ?? (o.display ? 0.95 : 1.04), spacing: o.spacing ?? -Math.round(o.size * (o.display ? 0.005 : 0.01)), maxLines: o.maxLines ?? (this.cls === "story" ? 4 : 3), color: o.color, minSize: Math.round(o.size * 0.55) }, "title", "Titre");
    return l;
  }
  /** Ligne secondaire (« Peinture • Enduits ») : sur une ligne, jamais coupée dans un segment. */
  subline(b: { x: number; y: number; w: number }, o: { size?: number; align?: TextLayer["align"]; color?: string; upper?: boolean; spacing?: number } = {}) {
    const t = this.i.subline?.trim();
    if (!t) return null;
    const size = o.size ?? this.U * (this.cls === "land" ? 0.04 : 0.032);
    const text = / [•·|] /.test(t) ? t.split(/ ([•·|]) /).map((x, k) => (k % 2 ? ` ${x} ` : x.replace(/ /g, " "))).join("") : t;
    return this.text("subtitle", text, b, { size, align: o.align, color: o.color, upper: o.upper, spacing: o.spacing ?? (o.upper ? Math.round(size * 0.14) : 0), weight: o.upper ? 500 : 400, maxLines: 2, minSize: 22 }, "subline", "Ligne");
  }
  /** Marque en capitales espacées (quand il n'y a pas de logo) ou surtitre. */
  label(text: string, b: { x: number; y: number; w: number }, o: { size?: number; align?: TextLayer["align"]; color?: string; id?: string; weight?: number; serif?: boolean } = {}) {
    const size = o.size ?? Math.max(24, this.U * 0.03);
    return this.text("body", text, b, { family: o.serif ? this.i.art.heading : this.i.art.body, weight: o.weight ?? 600, size, align: o.align, color: o.color, upper: true, spacing: Math.round(size * 0.28), maxLines: 1, minSize: 22 }, o.id ?? "brand", o.id === "eyebrow" ? "Surtitre" : "Marque");
  }
  /** Logo (version claire sur fond sombre) ou, sans logo, la marque en capitales. Renvoie le calque posé. */
  brandMark(b: { x: number; y: number; w: number }, o: { height?: number; align?: TextLayer["align"]; onDark?: boolean; color?: string } = {}) {
    const lg = this.i.logo;
    const hgt = o.height ?? Math.round(this.pick(this.H * 0.075, this.W * 0.06, this.W * 0.06, this.W * 0.07));
    if (lg) {
      // Fond sombre sous le logo (mesuré sur ce qui est déjà dessiné) : version claire du logo.
      const dark = o.onDark ?? isDark(this.under({ x: b.x, y: b.y, w: Math.min(b.w, this.W * 0.3), h: hgt }, this.layers.filter((l) => l.kind !== "text" && l.kind !== "button")));
      const id = dark && lg.lightId ? lg.lightId : lg.id;
      const im = this.i.images.get(id)!;
      const lw = Math.min((im.width / im.height) * hgt, b.w, this.W * 0.36);
      const lh = (im.height / im.width) * lw;
      const x = o.align === "center" ? b.x + (b.w - lw) / 2 : o.align === "right" ? b.x + b.w - lw : b.x;
      const l: ImageLayer = { ...this.base("logo", "Logo", "logo", { x, y: b.y, w: lw, h: lh }, { h: o.align === "center" ? "center" : o.align === "right" ? "right" : "left", v: "top" }), kind: "image", assetId: id, fit: "contain", crop: null, radius: 0, shadow: null };
      this.layers.push(l);
      return l;
    }
    return this.label(this.i.brand, b, { align: o.align, color: o.color, serif: true, weight: Math.min(700, this.i.art.headingWeight) });
  }
  /** Bouton (pilule, arrondi, carré, ou plein-largeur) mesuré sur son texte. */
  button(x: number, y: number, o: { maxW: number; align?: "left" | "center" | "right"; style?: "pill" | "rounded" | "square" | "block"; fill?: string; ink?: string; size?: number; arrow?: boolean; shadow?: boolean } ) {
    const size = Math.round(Math.max(24, o.size ?? this.U * this.pick(0.042, 0.032, 0.032, 0.036)));
    const label = (o.arrow ?? this.i.art.arrow) ? `${this.i.cta}  →` : this.i.cta;
    this.ctx.font = serverFont(this.i.art.body, 600, size, false);
    const bh = Math.round(size * 2.5);
    const bw = o.style === "block" ? o.maxW : Math.min(this.ctx.measureText(label).width + size * 3, o.maxW);
    const fill0 = o.fill ?? this.c.btn;
    const ink0 = o.ink ?? (contrast("#FFFFFF", fill0) >= contrast("#111111", fill0) ? "#FFFFFF" : "#111111");
    const fill = contrast(ink0, fill0) >= 4.6 ? fill0 : ensureContrast(fill0, ink0, 4.6);
    const bx = o.align === "center" ? x - bw / 2 : o.align === "right" ? x - bw : x;
    const style = o.style ?? (this.i.art.cta === "pill" ? "pill" : "rounded");
    const l: ButtonLayer = { ...this.base("cta", "Bouton", "cta", { x: bx, y, w: bw, h: bh }, { h: o.align === "center" ? "center" : o.align === "right" ? "right" : "left", v: y > this.H / 2 ? "bottom" : "top" }), kind: "button", text: label, font: { family: this.i.art.body, weight: 600, size, italic: false }, fill, color: ink0, radius: style === "pill" ? bh / 2 : style === "square" ? 0 : Math.round(bh * 0.18), stroke: null, shadow: o.shadow ? { color: "rgba(0,0,0,0.25)", blur: Math.round(bh * 0.4), x: 0, y: Math.round(bh * 0.12) } : null };
    this.layers.push(l);
    return l;
  }

  /**
   * Pile de texte (marque/logo, surtitre, titre, ligne, bouton) dans une colonne, alignée en haut, au centre ou en
   * bas de la colonne. Les tailles baissent si la pile ne tient pas.
   */
  stack(col: Box, o: { align?: TextLayer["align"]; valign?: "top" | "middle" | "bottom"; title: number; display?: boolean; italic?: boolean; upper?: boolean; mark?: boolean; eyebrow?: boolean; sub?: boolean; subUpper?: boolean; cta?: boolean; ctaStyle?: "pill" | "rounded" | "square" | "block"; gap?: number; onDark?: boolean; maxLines?: number; markColor?: string }) {
    const align = o.align ?? "left";
    const gap = o.gap ?? this.U * 0.035;
    // Ne tient pas : le titre rétrécit, puis la ligne secondaire est retirée (jamais un texte hors cadre).
    for (let k = 0, size = o.title; k < 7; k++, size *= 0.9) {
      const withSub = o.sub !== false && k < 5;
      const start = this.layers.length;
      let y = col.y;
      const xw = { x: col.x, w: col.w };
      if (o.mark !== false) {
        const l = this.brandMark({ ...xw, y }, { align, onDark: o.onDark, color: o.markColor });
        y += l.h + gap * 1.3;
      }
      if (o.eyebrow && this.i.eyebrow) {
        const l = this.label(this.i.eyebrow, { ...xw, y }, { size: Math.max(22, this.U * 0.024), align, color: this.c.accent, id: "eyebrow" });
        y += l.h + gap * 0.6;
      }
      const t = this.title({ ...xw, y }, { size, display: o.display, italic: o.italic, align, upper: o.upper, maxLines: o.maxLines });
      y += t.h + gap * 0.8;
      if (withSub) {
        const s = this.subline({ ...xw, y }, { align, upper: o.subUpper });
        if (s) y += s.h + gap;
      }
      if (o.cta !== false) {
        const bx = align === "center" ? col.x + col.w / 2 : align === "right" ? col.x + col.w : col.x;
        const b = this.button(bx, y + gap * 0.3, { maxW: col.w, align, style: o.ctaStyle });
        y = b.y + b.h;
      }
      const used = y - col.y;
      if (used <= col.h || k === 6) {
        const dy = o.valign === "bottom" ? col.h - used : o.valign === "middle" ? (col.h - used) / 2 : 0;
        for (const l of this.layers.slice(start)) l.y += Math.max(0, dy);
        return { y: col.y + Math.max(0, dy), h: used };
      }
      this.layers.splice(start);
    }
    return { y: col.y, h: 0 };
  }

  // ------------------------------------------------------------------ effets graphiques
  /** Fait pivoter un groupe de calques autour d'un point (bandeau incliné et son texte, carte et sa légende). */
  rotateGroup(group: Layer[], deg: number, cx: number, cy: number) {
    const a = (deg * Math.PI) / 180;
    for (const l of group) {
      const lx = l.x + l.w / 2 - cx;
      const ly = l.y + l.h / 2 - cy;
      l.x = cx + lx * Math.cos(a) - ly * Math.sin(a) - l.w / 2;
      l.y = cy + lx * Math.sin(a) + ly * Math.cos(a) - l.h / 2;
      l.rotation = (l.rotation ?? 0) + deg;
    }
  }
  /** Surligneur derrière chaque ligne d'un titre (aligné à gauche) : placé juste sous le titre. */
  markers(t: TextLayer, color: string, o: { pad?: number; skew?: number } = {}) {
    const lt = layoutText(this.ctx, t, { font: serverFont });
    this.ctx.font = serverFont(t.font.family, t.font.weight, lt.size, t.font.italic);
    this.ctx.letterSpacing = `${t.letterSpacing}px`;
    const pad = o.pad ?? lt.size * 0.18;
    const out: ShapeLayer[] = [];
    lt.lines.forEach((line, k) => {
      const w = this.ctx.measureText(t.uppercase ? line.toUpperCase() : line).width;
      const x = t.align === "center" ? t.x + (t.w - w) / 2 : t.align === "right" ? t.x + t.w - w : t.x;
      out.push(this.rect({ x: x - pad, y: t.y + k * lt.size * t.lineHeight + lt.size * 0.42, w: w + pad * 2, h: lt.size * 0.56 }, color, { rotation: o.skew ?? 0, name: "Surligneur" }));
    });
    this.ctx.letterSpacing = "0px";
    // Les surligneurs passent sous le titre.
    for (const r of out) this.layers.splice(this.layers.indexOf(r), 1);
    this.layers.splice(this.layers.indexOf(t), 0, ...out);
    return out;
  }
  /** Pastille en étoile (trois carrés tournés) avec un mot court ; null s'il n'y a pas de mot confirmé. */
  burst(cx0: number, cy0: number, r: number, fill: string, word: string | null, o: { rotation?: number } = {}) {
    if (!word) return null;
    // Le texte de la pastille reste dans les marges de la plateforme.
    const cx = Math.max(this.m.side + r * 0.75, Math.min(this.W - this.m.side - r * 0.75, cx0));
    const cy = Math.max(this.m.top + r * 0.5, Math.min(this.H - this.m.bottom - r * 0.5, cy0));
    const side = r * 1.42;
    for (const d of [0, 30, 60]) this.rect({ x: cx - side / 2, y: cy - side / 2, w: side, h: side }, fill, { rotation: d + (o.rotation ?? 0), name: "Étoile" });
    const size = Math.max(22, r * 0.26);
    const t = this.text("body", word, { x: cx - r * 0.72, y: cy, w: r * 1.44 }, { weight: 700, size, align: "center", upper: true, spacing: Math.round(size * 0.05), lineHeight: 1.05, maxLines: 3, minSize: 22 }, this.id("burst-text"), "Texte de la pastille");
    t.y = cy - t.h / 2;
    t.rotation = o.rotation ?? -8;
    return t;
  }
  /** Mot court confirmé pour une pastille : le surtitre (métier, catégorie) ou le premier segment de la ligne. */
  shortWord(max = 20): string | null {
    const segs = (this.i.subline ?? "").split(/\s+[•·|]\s+/).map((x) => x.trim()).filter(Boolean);
    return [this.i.eyebrow?.trim() ?? "", segs[0] ?? ""].find((x) => x && x.length <= max) ?? null;
  }

  // ------------------------------------------------------------------ finition : lisibilité garantie
  private doc(layers: Layer[]): AdDocument {
    const i = this.i;
    return { version: DOC_VERSION, width: this.W, height: this.H, background: this.c.bg, safe: { top: Math.round(this.H * i.format.safe.top), bottom: Math.round(this.H * i.format.safe.bottom), side: Math.round(this.W * i.format.safe.side) }, format: { platform: i.format.platform, aspect: i.format.aspect }, layers, brand: { palette: { ...i.palette }, fonts: { heading: i.typo.heading, body: i.typo.body }, name: i.brand }, meta: { conceptId: null, source: "engine", createdFrom: null } };
  }
  private under(b: Box, behind: Layer[]): string {
    const c = createCanvas(this.W, this.H);
    const ctx = c.getContext("2d");
    renderDoc(ctx, this.doc(behind), { font: serverFont, images: this.i.images });
    const x = Math.max(0, Math.min(this.W - 1, Math.round(b.x)));
    const y = Math.max(0, Math.min(this.H - 1, Math.round(b.y)));
    const d = ctx.getImageData(x, y, Math.max(1, Math.min(Math.round(b.w), this.W - x)), Math.max(1, Math.min(Math.round(b.h), this.H - y))).data;
    let r = 0, g = 0, bl = 0, n = 0;
    for (let k = 0; k < d.length; k += 32) ((r += d[k]), (g += d[k + 1]), (bl += d[k + 2]), n++);
    return `#${[r, g, bl].map((v) => Math.round(v / Math.max(1, n)).toString(16).padStart(2, "0")).join("")}`;
  }
  /**
   * Chaque texte est mesuré sur ce qui est dessiné dessous : encre corrigée (claire / sombre de la marque) ; si
   * aucune encre n'atteint 4,6:1 (photo chargée), un voile doux est glissé sous le bloc de texte.
   */
  finalize(): AdDocument {
    const ink = (bg: string) => {
      const pick = contrast(this.c.light, bg) >= contrast(this.c.dark, bg) ? this.c.light : this.c.dark;
      const adj = ensureContrast(pick, bg, 5.2);
      return contrast(adj, bg) >= 4.6 ? adj : contrast("#FFFFFF", bg) >= contrast("#111111", bg) ? "#FFFFFF" : "#111111";
    };
    const texts = this.layers.filter((l): l is TextLayer => l.kind === "text");
    for (const t of texts) {
      const idx = this.layers.indexOf(t);
      const behind = this.layers.slice(0, idx).filter((l) => l.kind !== "text" && l.kind !== "button");
      const bg = this.under(t, behind);
      if (contrast(t.color, bg) >= 4.6) continue;
      const c = ink(bg);
      if (contrast(c, bg) >= 4.6) {
        t.color = c;
        continue;
      }
      // Photo trop chargée sous ce texte : voile local adouci, couleur sombre de la marque.
      const pad = Math.round(this.U * 0.03);
      const v: ShapeLayer = { ...this.base(this.id("scrim"), "Voile du texte", "scrim", { x: t.x - pad, y: t.y - pad, w: t.w + pad * 2, h: t.h + pad * 2 }, t.anchor), kind: "shape", shape: "rect", fill: rgba(this.c.dark, 0.62), stroke: null, radius: pad, shadow: null };
      this.layers.splice(idx, 0, v);
      t.color = ink(this.under(t, [...behind, v]));
    }
    return this.doc(this.layers);
  }
}
