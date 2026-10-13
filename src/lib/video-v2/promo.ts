/**
 * Habillage « publicité » d'une vidéo (comme les modèles des agences) : chaque plan garde une VRAIE image ou vidéo
 * en fond, et reçoit par-dessus des calques graphiques nets, aux couleurs de la marque :
 *  - ouverture : logo ou nom, grand titre (2e ligne dans la couleur d'accent), formes d'angle, vignettes ;
 *  - prestations (ou points forts du produit) : panneau translucide avec trois éléments numérotés ;
 *  - message : titre empilé, une ligne surlignée ;
 *  - fin : carte blanche « Contactez-nous » avec les coordonnées RÉELLES du projet (jamais inventées).
 * Les calques restent ceux de l'éditeur publicitaire : tout est modifiable ensuite, comme une publicité.
 */
import { createCanvas } from "@napi-rs/canvas";
import { serverFont } from "../ad-doc/server";
import type { Layer, ShapeLayer, TextLayer } from "../ad-doc/types";
import type { Project } from "../projects";
import { C } from "../i18n-server";
import { songStyleFor } from "../media/song";
import { resolveProductCategory } from "../image-v2/categories";
import { buttonLayer, imageLayer, inkOn, rectLayer, textLayer, type Palette, type Typo } from "./doc";
import type { Clip, ShotPlan, Transition, VideoDocument } from "./types";
import type { VideoLook } from "../art-direction";

export type PromoInput = {
  p: Project;
  pal: Palette;
  typo: Typo;
  w: number;
  h: number;
  safe: VideoDocument["safe"];
  brand: string;
  logoId: string | null;
  /** Images des vignettes (images extraites des plans, photos du projet). */
  thumbs: string[];
  /** Vraies photos du produit (boutique) : un plan de démonstration les montre en plein écran. */
  productPhotos?: string[];
  /** Pictogrammes des éléments du panneau (un par prestation ou point fort), dans l'ordre ; sinon des numéros. */
  icons?: string[];
  cta: string;
  message: string;
  /** Direction artistique de la marque (typographie, élément graphique, mot fort, rythme) ; sinon habillage franc. */
  look?: VideoLook;
};

const rgba = (hex: string, a: number) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return `rgba(0,0,0,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Police d'affiche : bâton très gras pour les services et les marques directes, titre de la marque sinon. */
function display(o: PromoInput): { family: string; weight: number; upper: boolean } {
  if (o.look) return o.look.type === "brand" ? { family: o.typo.heading, weight: o.typo.headingWeight ?? 600, upper: false } : o.look.type === "sans" ? { family: "Montserrat", weight: 800, upper: false } : { family: "Montserrat", weight: 800, upper: true };
  const premium = (o.p.brand?.personality ?? []).some((x) => /premium|raffin|luxe|élégan|epur|épur/i.test(x));
  return premium ? { family: o.typo.heading, weight: o.typo.headingWeight ?? 600, upper: false } : { family: "Montserrat", weight: 800, upper: true };
}

/** Couleur d'accent lisible sur une vidéo assombrie (la plus vive des couleurs de la marque). */
export function accentOf(pal: Palette): string {
  const sat = (hex: string) => {
    const m = /^#?([0-9a-f]{6})/i.exec(hex);
    if (!m) return 0;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx === 0 ? 0 : ((mx - mn) / mx) * (0.4 + mx / 425);
  };
  return [pal.accent, pal.primary, pal.secondary].sort((a, b) => sat(b) - sat(a))[0];
}

const STOP = new Set(["à", "a", "de", "du", "des", "et", "le", "la", "les", "l'", "en", "pour", "avec", "sur", "un", "une", "au", "aux", "par", "d'", "the", "of", "and", "to", "for", "with", "in", "on", "a", "an"]);

/** Coupe un texte en lignes équilibrées (au plus `max` lignes, mots entiers ; « ? », « : » restent collés au mot). */
export function splitLines(text: string, max: number): string[] {
  const words = text.replace(/[ \t\n\u00A0]+/g, " ").replace(/ ([:;!?»])/g, "\u00A0$1").replace(/« /g, "«\u00A0").trim().split(" ").filter(Boolean);
  const total = words.join(" ").length;
  // Un texte court tient sur moins de lignes (jamais un mot seul par ligne quand on peut l'éviter).
  const n = Math.max(1, Math.min(max, words.length, Math.ceil(total / 13)));
  if (n <= 1) return [words.join(" ")];
  const lines: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    const len = [...cur, w].join(" ").length;
    if (cur.length && len > total / n + 2 && lines.length < n - 1) {
      lines.push(cur.join(" "));
      cur = [w];
    } else cur.push(w);
  }
  if (cur.length) lines.push(cur.join(" "));
  // Jamais un petit mot (« et », « à ») seul sur sa ligne : il rejoint la suivante.
  for (let i = 0; i < lines.length - 1; i++) if (STOP.has(lines[i].toLowerCase())) lines.splice(i, 2, `${lines[i]} ${lines[i + 1]}`);
  return lines;
}

/** Texte court pour un titre : la phrase si elle est courte, sinon ses premiers mots, jamais coupée sur « à », « de »… */
export function headline(text: string, maxWords = 10): string {
  const t = text.replace(/[ \t\n]+/g, " ").trim().replace(/[.!…,;:]+$/, "");
  const first = (t.split(/(?<=[.!?])\s/)[0] ?? t).replace(/[.!…,;:]+$/, "").trim();
  let words = first.split(" ");
  if (words.length > maxWords) {
    const cut = words.slice(0, maxWords);
    const comma = cut.findLastIndex((w) => /[,;]$/.test(w));
    words = comma >= 1 ? cut.slice(0, comma + 1) : cut;
  }
  while (words.length > 1 && STOP.has(words[words.length - 1].toLowerCase().replace(/[,;]$/, ""))) words.pop();
  return words.join(" ").replace(/[,;:]+$/, "");
}

/** Texte utilisable tel quel à l'écran : assez long, sans repère « [À compléter] », sans consigne. */
export function usable(text: string | null | undefined): text is string {
  const t = (text ?? "").trim();
  return t.length >= 6 && !/\[|\]/.test(t) && t.split(/\s+/).length >= 2;
}

/** Prix confirmé, en euros (montant stocké en centimes). */
export function priceLabel(p: Project): string | null {
  const pr = p.product.price;
  if (pr.status !== "confirmed" || pr.amount == null) return null;
  return `${(pr.amount / 100).toFixed(2).replace(".", ",").replace(",00", "")} ${pr.currency === "EUR" ? "€" : pr.currency}`;
}

/** Ville principale d'une zone (« Mâcon et 30 km autour » → « Mâcon »). */
const cityOf = (area: string) => area.split(/,| et | and |\(/)[0].trim();

const measureCtx = createCanvas(4, 4).getContext("2d");
/** Largeur réelle d'un texte (police du rendu), pour ajuster le surlignage. */
function textWidth(text: string, family: string, weight: number, size: number, upper: boolean): number {
  measureCtx.font = serverFont(family, weight, size, false);
  return measureCtx.measureText(upper ? text.toUpperCase() : text).width;
}

const shadow = { color: "rgba(0,0,0,0.45)", blur: 18, x: 0, y: 4 };

/** Animation d'entrée d'un calque (la sortie est automatique au rendu, juste avant le plan suivant). */
function A<T extends Layer>(l: T, kind: NonNullable<Layer["anim"]>["in"], delay: number, dur?: number): T {
  return { ...l, anim: { in: kind, delay: Math.round(delay * 1000) / 1000, ...(dur ? { dur } : {}) } };
}

function txt(id: string, name: string, b: { x: number; y: number; w: number; h: number }, text: string, o: { family: string; weight: number; size: number; color: string; align?: TextLayer["align"]; upper?: boolean; spacing?: number; shadow?: boolean }): TextLayer {
  const l = textLayer(id, name, "title", b, text, { family: o.family, weight: o.weight, size: o.size, color: o.color, align: o.align ?? "left", uppercase: o.upper });
  return { ...l, letterSpacing: o.spacing ?? 0, lineHeight: 1.05, shadow: o.shadow ? shadow : null };
}

function rect(id: string, name: string, b: { x: number; y: number; w: number; h: number }, fill: ShapeLayer["fill"], o: { radius?: number; rotation?: number; stroke?: ShapeLayer["stroke"]; role?: ShapeLayer["role"]; shadow?: boolean } = {}): ShapeLayer {
  const l = rectLayer(id, name, o.role ?? "decor", b, fill, o.radius ?? 0);
  return { ...l, rotation: o.rotation ?? 0, stroke: o.stroke ?? null, shadow: o.shadow ? shadow : null };
}

/** Vignettage léger (bords assombris) : donne de la profondeur à l'image, comme une prise de vue de cinéma. */
function vignette(o: PromoInput, id: string): Layer {
  return rect(`${id}-vig`, "Vignettage", { x: -o.w * 0.1, y: -o.h * 0.05, w: o.w * 1.2, h: o.h * 1.1 }, { type: "radial", angle: 0, stops: [{ offset: 0.55, color: "rgba(0,0,0,0)" }, { offset: 1, color: "rgba(0,0,0,0.5)" }] }, { role: "scrim" });
}

/** Logo (image) ou nom de la marque, centré en haut. */
function brandMark(o: PromoInput, id: string, color = "#FFFFFF", delay = 0.1): Layer[] {
  const { w, h, safe } = o;
  if (o.logoId) return [A({ ...imageLayer(`${id}-logo`, "Logo", "logo", { x: w * 0.25, y: safe.top + h * 0.005, w: w * 0.5, h: h * 0.085 }, o.logoId, "contain") }, "drop", delay)];
  return [A(txt(`${id}-brand`, "Marque", { x: safe.side, y: safe.top + h * 0.01, w: w - safe.side * 2, h: h * 0.04 }, o.brand, { family: "Montserrat", weight: 800, size: Math.round(w * 0.04), color, align: "center", upper: true, spacing: w * 0.006, shadow: true }), "drop", delay)];
}

/** Rangée de trois vignettes encadrées (elles rebondissent l'une après l'autre). */
function thumbRow(o: PromoInput, id: string, y: number, accent: string, skip = 0, delay = 0.6): Layer[] {
  const { w, h, safe } = o;
  const ids = [...o.thumbs.slice(skip), ...o.thumbs.slice(0, skip)].slice(0, 3);
  if (ids.length < 3) return [];
  const gap = w * 0.03;
  const tw = (w - safe.side * 2 - gap * 2) / 3;
  const th = h * 0.11;
  const out: Layer[] = [];
  ids.forEach((a, k) => {
    const x = safe.side + k * (tw + gap);
    out.push(A(rect(`${id}-tf${k}`, `Cadre ${k + 1}`, { x: x - 5, y: y - 5, w: tw + 10, h: th + 10 }, accent, { radius: w * 0.014, shadow: true }), "pop", delay + k * 0.09, 0.4));
    out.push(A({ ...imageLayer(`${id}-t${k}`, `Vignette ${k + 1}`, "image", { x, y, w: tw, h: th }, a, "cover"), radius: w * 0.01 }, "pop", delay + k * 0.09, 0.4));
  });
  return out;
}

/** Ouverture : titre en deux couleurs, accroche, formes d'angle, vignettes. */
export function heroOverlay(o: PromoInput, title: string | string[], sub: string, tagline: string): Layer[] {
  const { w, h, safe, pal } = o;
  const acc = accentOf(pal);
  const f = display(o);
  const lines = Array.isArray(title) ? title.filter(Boolean).slice(0, 2) : splitLines(headline(title, 6), 2);
  const size = Math.round(w * (f.upper ? 0.088 : 0.1));
  const y0 = safe.top + h * 0.1;
  const L: Layer[] = [
    vignette(o, "h"),
    rect("h-scrim-top", "Voile haut", { x: 0, y: 0, w, h: h * 0.5 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: "rgba(0,0,0,0.8)" }, { offset: 0.6, color: "rgba(0,0,0,0.5)" }, { offset: 1, color: "rgba(0,0,0,0)" }] }, { role: "scrim" }),
    rect("h-scrim-bottom", "Voile bas", { x: 0, y: h * 0.55, w, h: h * 0.45 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: "rgba(0,0,0,0)" }, { offset: 1, color: "rgba(0,0,0,0.75)" }] }, { role: "scrim" }),
    A(rect("h-corner-a", "Angle", { x: -w * 0.28, y: -h * 0.06, w: w * 0.62, h: h * 0.09 }, acc, { rotation: -32 }), "left", 0.05, 0.5),
    A(rect("h-corner-b", "Angle", { x: w * 0.72, y: h * 0.86, w: w * 0.6, h: h * 0.08 }, acc, { rotation: -32 }), "right", 0.15, 0.5),
    A(rect("h-corner-c", "Angle", { x: w * 0.8, y: h * 0.82, w: w * 0.5, h: h * 0.025 }, "#FFFFFF", { rotation: -32 }), "right", 0.25, 0.5),
    ...brandMark(o, "h"),
    A(rect("h-bar", "Trait", { x: safe.side, y: y0 + size * 0.1, w: w * 0.012, h: size * lines.length * 1.1 }, acc), "drop", 0.2),
  ];
  lines.forEach((t, k) => {
    const hi = k === lines.length - 1 && lines.length > 1;
    const x = safe.side + w * 0.04;
    const y = y0 + k * size * 1.12;
    if (hi) L.push(A(rect(`h-hl${k}`, "Surlignage", { x: x - w * 0.015, y: y - size * 0.06, w: Math.min(w - x - safe.side * 0.5, textWidth(t, f.family, f.weight, size, f.upper) + w * 0.035), h: size * 1.14 }, acc, { radius: w * 0.008 }), "grow", 0.3 + k * 0.12, 0.4));
    L.push(A(txt(`h-title${k}`, `Titre ${k + 1}`, { x, y, w: w - safe.side * 2 - w * 0.04, h: size * 1.1 }, t, { family: f.family, weight: f.weight, size, color: hi ? inkOn(acc) : "#FFFFFF", upper: f.upper, shadow: !hi }), "left", 0.25 + k * 0.12, 0.5));
  });
  if (sub) L.push(A(txt("h-sub", "Accroche", { x: safe.side + w * 0.04, y: y0 + lines.length * size * 1.12 + h * 0.014, w: w - safe.side * 2 - w * 0.04, h: h * 0.03 }, sub, { family: "Montserrat", weight: 600, size: Math.round(w * 0.032), color: "#FFFFFF", upper: true, spacing: 2, shadow: true }), "rise", 0.55));
  L.push(...thumbRow(o, "h", h * 0.7, acc, 0, 0.7));
  if (tagline) L.push(A(txt("h-tag", "Signature", { x: safe.side, y: h * 0.835, w: w - safe.side * 2, h: h * 0.035 }, tagline, { family: "Montserrat", weight: 700, size: Math.round(w * 0.034), color: "#FFFFFF", align: "center", upper: true, spacing: 2, shadow: true }), "rise", 1));
  return L;
}

/** Prestations (ou points forts) : panneau translucide, trois éléments avec pictogramme. */
export function servicesOverlay(o: PromoInput, title: string, items: string[], tagline: string): Layer[] {
  const { w, h, safe, pal } = o;
  const acc = accentOf(pal);
  const ink = inkOn(acc);
  const f = display(o);
  const px = safe.side * 0.8;
  const pw = w - px * 2;
  const py = h * 0.3;
  const ph = h * 0.24;
  const L: Layer[] = [
    vignette(o, "s"),
    rect("s-scrim", "Voile", { x: 0, y: 0, w, h }, "rgba(0,0,0,0.18)", { role: "scrim" }),
    ...brandMark(o, "s", "#FFFFFF", 0.05),
    A(rect("s-panel", "Panneau", { x: px, y: py, w: pw, h: ph }, rgba(acc, 0.9), { radius: w * 0.035, shadow: true }), "rise", 0.05, 0.5),
    A(txt("s-title", "Titre du panneau", { x: px, y: py + ph * 0.07, w: pw, h: ph * 0.2 }, title, { family: f.family, weight: f.weight, size: Math.round(w * 0.062), color: ink, align: "center", upper: false }), "rise", 0.2),
  ];
  const n = Math.min(3, items.length);
  const cw = pw / n;
  items.slice(0, n).forEach((it, k) => {
    const cx = px + cw * k + cw / 2;
    const d = w * 0.1;
    const t0 = 0.4 + k * 0.14;
    L.push(A({ ...rect(`s-dot${k}`, `Pastille ${k + 1}`, { x: cx - d / 2, y: py + ph * 0.34, w: d, h: d }, ink === "#FFFFFF" ? "rgba(255,255,255,0.95)" : pal.dark), shape: "ellipse" as const }, "pop", t0, 0.45));
    const icon = o.icons?.[k];
    if (icon) L.push(A(imageLayer(`s-icon${k}`, `Pictogramme ${k + 1}`, "decor", { x: cx - d * 0.3, y: py + ph * 0.34 + d * 0.2, w: d * 0.6, h: d * 0.6 }, icon, "contain"), "pop", t0 + 0.06, 0.45));
    else L.push(A(txt(`s-num${k}`, `Numéro ${k + 1}`, { x: cx - d / 2, y: py + ph * 0.34 + d * 0.16, w: d, h: d * 0.7 }, String(k + 1), { family: "Montserrat", weight: 800, size: Math.round(d * 0.55), color: ink === "#FFFFFF" ? acc : "#FFFFFF", align: "center" }), "pop", t0 + 0.06, 0.45));
    L.push(A(txt(`s-item${k}`, `Élément ${k + 1}`, { x: px + cw * k + w * 0.015, y: py + ph * 0.34 + d + h * 0.012, w: cw - w * 0.03, h: ph * 0.3 }, it, { family: "Montserrat", weight: 700, size: Math.round(w * 0.031), color: ink, align: "center" }), "rise", t0 + 0.1));
  });
  L.push(...thumbRow(o, "s", h * 0.6, acc, 1, 0.9));
  if (tagline) L.push(A(txt("s-tag", "Signature", { x: safe.side, y: h * 0.735, w: w - safe.side * 2, h: h * 0.035 }, tagline, { family: "Montserrat", weight: 700, size: Math.round(w * 0.036), color: "#FFFFFF", align: "center", upper: true, spacing: 2, shadow: true }), "rise", 1.15));
  return L;
}

/** Une prestation par plan (format long) : grand numéro, pictogramme, nom, étiquette — en bas de l'image. */
export function stepOverlay(o: PromoInput, n: number, label: string, title: string, icon: string | null, id = "st"): Layer[] {
  const { w, h, safe, pal } = o;
  const acc = accentOf(pal);
  const f = display(o);
  const size = Math.round(w * (f.upper ? 0.075 : 0.085));
  const lines = splitLines(headline(title, 8), 2);
  const y0 = h * 0.6;
  const L: Layer[] = [
    vignette(o, id),
    rect(`${id}-scrim`, "Voile bas", { x: 0, y: h * 0.42, w, h: h * 0.58 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: "rgba(0,0,0,0)" }, { offset: 0.45, color: "rgba(0,0,0,0.6)" }, { offset: 1, color: "rgba(0,0,0,0.85)" }] }, { role: "scrim" }),
    ...brandMark(o, id, "#FFFFFF", 0.05),
    A(txt(`${id}-num`, "Numéro", { x: safe.side, y: y0 - size * 2.2, w: w * 0.5, h: size * 2 }, String(n).padStart(2, "0"), { family: "Montserrat", weight: 800, size: Math.round(size * 1.9), color: acc, shadow: true }), "pop", 0.1, 0.5),
    A(rect(`${id}-rule`, "Trait", { x: safe.side, y: y0 - size * 0.25, w: w * 0.22, h: Math.max(6, w * 0.008) }, acc), "grow", 0.3, 0.4),
    A(txt(`${id}-label`, "Étiquette", { x: safe.side + w * 0.25, y: y0 - size * 0.5, w: w * 0.6, h: h * 0.03 }, label, { family: "Montserrat", weight: 700, size: Math.round(w * 0.03), color: "#FFFFFF", upper: true, spacing: 3, shadow: true }), "left", 0.35),
  ];
  lines.forEach((t, k) => L.push(A(txt(`${id}-t${k}`, `Titre ${k + 1}`, { x: safe.side, y: y0 + k * size * 1.12 + h * 0.01, w: w - safe.side * 2 - (icon ? w * 0.2 : 0), h: size * 1.1 }, t, { family: f.family, weight: f.weight, size, color: "#FFFFFF", upper: f.upper, shadow: true }), "left", 0.4 + k * 0.12, 0.5)));
  if (icon) {
    const d = w * 0.16;
    // Pastille claire : le pictogramme (couleur d'accent ou blanc selon la marque) y reste toujours visible.
    L.push(A({ ...rect(`${id}-dot`, "Pastille", { x: w - safe.side - d, y: y0 - size * 2.0, w: d, h: d }, inkOn(acc) === "#FFFFFF" ? "rgba(255,255,255,0.95)" : pal.dark, { shadow: true }), shape: "ellipse" as const }, "pop", 0.25, 0.5));
    L.push(A(imageLayer(`${id}-icon`, "Pictogramme", "decor", { x: w - safe.side - d * 0.8, y: y0 - size * 2.0 + d * 0.2, w: d * 0.6, h: d * 0.6 }, icon, "contain"), "pop", 0.32, 0.5));
  }
  return L;
}

/** Message, quatre mises en page (alternées pour ne jamais répéter le même habillage d'un plan à l'autre). */
export type StatementLayout = "stack" | "lower" | "panel" | "center";

export function statementOverlay(o: PromoInput, text: string, id = "m", layout: StatementLayout = "stack", eyebrow = ""): Layer[] {
  const { w, h, safe, pal } = o;
  const acc = accentOf(pal);
  const ink = inkOn(acc);
  const f = display(o);
  if (layout === "lower") {
    // Bandeau en bas : trait d'accent, petite étiquette, texte qui glisse depuis la gauche.
    const size = Math.round(w * (f.upper ? 0.07 : 0.08));
    const lines = splitLines(headline(text, 10), 3);
    const y0 = h * 0.7 - lines.length * size * 1.12;
    const L: Layer[] = [
      vignette(o, id),
      rect(`${id}-scrim`, "Voile bas", { x: 0, y: h * 0.4, w, h: h * 0.6 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: "rgba(0,0,0,0)" }, { offset: 0.5, color: "rgba(0,0,0,0.55)" }, { offset: 1, color: "rgba(0,0,0,0.8)" }] }, { role: "scrim" }),
      ...brandMark(o, id, "#FFFFFF", 0.05),
      A(rect(`${id}-bar`, "Trait", { x: safe.side, y: y0, w: w * 0.014, h: lines.length * size * 1.12 }, acc), "drop", 0.1, 0.4),
    ];
    if (eyebrow) L.push(A(txt(`${id}-eye`, "Étiquette", { x: safe.side + w * 0.045, y: y0 - h * 0.045, w: w * 0.8, h: h * 0.03 }, eyebrow, { family: "Montserrat", weight: 700, size: Math.round(w * 0.03), color: acc, upper: true, spacing: 3, shadow: true }), "left", 0.15));
    lines.forEach((t, k) => L.push(A(txt(`${id}-l${k}`, `Ligne ${k + 1}`, { x: safe.side + w * 0.045, y: y0 + k * size * 1.12, w: w - safe.side * 2 - w * 0.045, h: size * 1.1 }, t, { family: f.family, weight: f.weight, size, color: "#FFFFFF", upper: f.upper, shadow: true }), "left", 0.22 + k * 0.1, 0.5)));
    L.push(A(rect(`${id}-under`, "Soulignement", { x: safe.side + w * 0.045, y: y0 + lines.length * size * 1.12 + h * 0.015, w: w * 0.3, h: Math.max(5, w * 0.006) }, acc), "grow", 0.5, 0.45));
    return L;
  }
  if (layout === "panel") {
    // Panneau couleur de la marque qui monte du bas ; l'image reste visible au-dessus.
    const size = Math.round(w * (f.upper ? 0.068 : 0.078));
    const lines = splitLines(headline(text, 10), 3);
    const ph = h * 0.14 + lines.length * size * 1.15 + (eyebrow ? h * 0.04 : 0);
    const py = h - safe.bottom * 0.6 - ph;
    const L: Layer[] = [
      vignette(o, id),
      ...brandMark(o, id, "#FFFFFF", 0.05),
      A(rect(`${id}-panel`, "Panneau", { x: safe.side * 0.6, y: py, w: w - safe.side * 1.2, h: ph }, rgba(acc, 0.94), { radius: w * 0.04, shadow: true }), "rise", 0.05, 0.5),
    ];
    if (eyebrow) L.push(A(txt(`${id}-eye`, "Étiquette", { x: safe.side * 1.4, y: py + h * 0.035, w: w * 0.8, h: h * 0.03 }, eyebrow, { family: "Montserrat", weight: 700, size: Math.round(w * 0.03), color: ink, upper: true, spacing: 3 }), "rise", 0.2));
    lines.forEach((t, k) => L.push(A(txt(`${id}-l${k}`, `Ligne ${k + 1}`, { x: safe.side * 1.4, y: py + h * (eyebrow ? 0.085 : 0.05) + k * size * 1.15, w: w - safe.side * 2.8, h: size * 1.1 }, t, { family: f.family, weight: f.weight, size, color: ink, upper: f.upper }), "rise", 0.28 + k * 0.1)));
    return L;
  }
  if (layout === "center") {
    // Grand texte centré qui rebondit, soulignement d'accent qui se déroule.
    const size = Math.round(w * (f.upper ? 0.1 : 0.11));
    const lines = splitLines(headline(text, 8), 3);
    const y0 = h * 0.45 - (lines.length * size * 1.12) / 2;
    const L: Layer[] = [
      vignette(o, id),
      rect(`${id}-scrim`, "Voile", { x: 0, y: 0, w, h }, "rgba(0,0,0,0.38)", { role: "scrim" }),
      ...brandMark(o, id, "#FFFFFF", 0.05),
    ];
    lines.forEach((t, k) => L.push(A(txt(`${id}-l${k}`, `Ligne ${k + 1}`, { x: safe.side * 0.6, y: y0 + k * size * 1.12, w: w - safe.side * 1.2, h: size * 1.1 }, t, { family: f.family, weight: f.weight, size, color: k === lines.length - 1 && lines.length > 1 ? acc : "#FFFFFF", align: "center", upper: f.upper, shadow: true }), "pop", 0.1 + k * 0.12, 0.5)));
    L.push(A(rect(`${id}-under`, "Soulignement", { x: w * 0.35, y: y0 + lines.length * size * 1.12 + h * 0.02, w: w * 0.3, h: Math.max(6, w * 0.008) }, acc), "grow", 0.45, 0.45));
    return L;
  }
  // Empilé : une ligne surlignée (la plus forte).
  const lines = splitLines(headline(text, 10), 3);
  const size = Math.round(w * (f.upper ? 0.085 : 0.095));
  const y0 = h * 0.42 - (lines.length * size * 1.15) / 2;
  const hi = lines.length >= 3 && !STOP.has(lines[1].toLowerCase()) ? 1 : lines.length - 1;
  const L: Layer[] = [
    vignette(o, id),
    rect(`${id}-scrim`, "Voile", { x: 0, y: h * 0.2, w, h: h * 0.6 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: "rgba(0,0,0,0)" }, { offset: 0.5, color: "rgba(0,0,0,0.55)" }, { offset: 1, color: "rgba(0,0,0,0)" }] }, { role: "scrim" }),
    ...brandMark(o, id),
  ];
  lines.forEach((t, k) => {
    const y = y0 + k * size * 1.15;
    const est = Math.min(w - safe.side * 2 + w * 0.04, textWidth(t, f.family, f.weight, size, f.upper) + w * 0.05);
    if (k === hi) L.push(A(rect(`${id}-hl`, "Surlignage", { x: safe.side - w * 0.02, y: y - size * 0.08, w: est, h: size * 1.16 }, acc, { radius: w * 0.008 }), "grow", 0.2 + k * 0.1, 0.4));
    L.push(A(txt(`${id}-l${k}`, `Ligne ${k + 1}`, { x: safe.side, y, w: w - safe.side * 2, h: size * 1.1 }, t, { family: f.family, weight: f.weight, size, color: k === hi ? ink : "#FFFFFF", upper: f.upper, shadow: k !== hi }), "left", 0.15 + k * 0.1, 0.5));
  });
  return L;
}

/** Fin : titre sur la vidéo, carte blanche avec bouton et coordonnées réelles. */
export function contactOverlay(o: PromoInput, title: string, lines: string[], button: string): Layer[] {
  const { w, h, safe, pal } = o;
  const acc = accentOf(pal);
  const rows = lines.slice(0, 4);
  const rowH = h * 0.05;
  const cardH = h * 0.075 + Math.max(1, rows.length) * rowH;
  const cardY = Math.min(h * 0.66, h - safe.bottom - cardH);
  const L: Layer[] = statementOverlay(o, title, "c").map((l) => (l.id === "c-scrim" ? { ...l, y: 0, h: cardY } : l.kind === "text" || l.id === "c-hl" ? { ...l, y: l.y - (h * 0.42 - cardY * 0.45) } : l));
  L.push(A(rect("c-card", "Carte", { x: safe.side * 0.6, y: cardY, w: w - safe.side * 1.2, h: cardH }, "#FFFFFF", { radius: w * 0.05, shadow: true }), "rise", 0.3, 0.5));
  const bw = Math.min(w * 0.7, textWidth(button, "Montserrat", 800, Math.round(w * 0.045), false) + w * 0.14);
  // Vrai bouton de l'éditeur (modifiable comme celui d'une publicité).
  const btn = buttonLayer("c-btn", { x: (w - bw) / 2, y: cardY - h * 0.032, w: bw, h: h * 0.064 }, button, { family: "Montserrat", size: Math.round(w * 0.045), fill: acc, color: inkOn(acc) });
  L.push(A({ ...btn, font: { ...btn.font, weight: 800 }, shadow }, "pop", 0.55, 0.5));
  rows.forEach((t, k) => {
    const y = cardY + h * 0.058 + k * rowH;
    if (k > 0) L.push(A(rect(`c-sep${k}`, `Séparateur ${k}`, { x: w * 0.3, y: y - rowH * 0.18, w: w * 0.4, h: 2 }, rgba(pal.dark, 0.12)), "grow", 0.6 + k * 0.08));
    L.push(A(txt(`c-line${k}`, `Coordonnée ${k + 1}`, { x: safe.side, y, w: w - safe.side * 2, h: h * 0.036 }, t, { family: "Montserrat", weight: k === 0 ? 800 : 600, size: Math.round(w * (k === 0 ? 0.046 : 0.038)), color: pal.dark, align: "center" }), "rise", 0.6 + k * 0.08));
  });
  return L;
}

/** Coordonnées affichables (uniquement celles saisies ; rien d'inventé). */
export function contactLines(p: Project): string[] {
  const s = p.services;
  const out: string[] = [];
  if (s?.phone?.trim()) out.push(s.phone.trim());
  if (s?.address?.trim()) out.push(s.address.trim());
  else if (s?.area?.trim()) out.push(s.area.trim());
  if (s?.email?.trim()) out.push(s.email.trim());
  if (s?.bookingUrl?.trim()) out.push(s.bookingUrl.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""));
  return out;
}

/** Points forts d'un produit : faits CONFIRMÉS (jamais déduits), courts. */
export function productPoints(p: Project): string[] {
  return (p.product.facts ?? []).filter((f) => f.status === "confirmed" && f.value?.trim()).map((f) => `${f.label}\u00A0: ${f.value}`.slice(0, 40)).slice(0, 3);
}

/**
 * Habille les plans : chaque plan composé sans image reprend un passage d'un plan vidéo réel (jamais un aplat seul
 * quand des plans réels existent), puis reçoit son calque d'habillage selon son rôle dans le récit.
 */
/** Mode de contact principal, dit simplement (uniquement ce que le client a choisi). */
function contactPhrase(mode: string | undefined): string {
  if (mode === "quote") return C("Devis sur demande", "Quotes on request");
  if (mode === "booking") return C("Réservation en ligne", "Book online");
  if (mode === "call") return C("Sur simple appel", "Just give us a call");
  return C("Écrivez-nous", "Write to us");
}

/**
 * Textes d'une vidéo, tous tirés du projet (rien d'inventé) : prestations (et leur prix s'il est donné), zone,
 * horaires, mode de contact, téléphone, adresse, résumé découpé en points, signature, positionnement ; boutique :
 * produit et catégorie, prix confirmé, faits confirmés, déclinaisons, usages de la catégorie. Courts, sans doublon,
 * jamais le texte du bouton de fin ni le seul nom de la marque.
 */
export function projectTexts(p: Project, x: { services: boolean; items: string[]; longForm: boolean; tagline: string; area: string; city: string; price: string | null; cta: string; brand: string; shots: ShotPlan[] }): string[] {
  const sv = p.services;
  const summaryBits = (p.product.summary ?? "").split(/[,.;]/).map((t) => t.trim()).filter((t) => t.split(/\s+/).length >= 2 && t.length <= 60);
  const raw: string[] = x.services
    ? [
        ...(x.longForm ? [] : x.items),
        x.city && p.product.category ? C(`Votre ${p.product.category.toLowerCase()} à ${x.city}`, `Your ${p.product.category.toLowerCase()} in ${x.city}`) : "",
        ...(sv?.services ?? []).filter((it) => it.price?.trim()).map((it) => `${it.name} : ${it.price}`),
        x.area ? C(`Intervention : ${x.area}`, `Service area: ${x.area}`) : "",
        sv?.hours?.trim() ? C(`Ouvert ${sv.hours.trim()}`, `Open ${sv.hours.trim()}`) : "",
        contactPhrase(sv?.contactMode),
        sv?.phone?.trim() ? C(`Appelez le ${sv.phone.trim()}`, `Call ${sv.phone.trim()}`) : "",
        sv?.address?.trim() ?? "",
        x.tagline,
        usable(p.brand?.positioning) ? p.brand!.positioning : "",
        ...summaryBits,
      ]
    : [
        p.product.category ? `${p.product.name} · ${p.product.category}` : "",
        usable(p.product.summary) ? p.product.summary : "",
        ...productPoints(p),
        x.price ? C(`Prix : ${x.price}`, `Price: ${x.price}`) : "",
        ...(p.product.variants ?? []).filter((v) => v.values?.length > 1).map((v) => C(`${v.values.length} ${v.name.toLowerCase()} au choix`, `${v.values.length} ${v.name.toLowerCase()} options`)),
        x.tagline,
        usable(p.brand?.positioning) ? p.brand!.positioning : "",
        ...summaryBits,
        // Usages de la catégorie (« Une routine du matin en quelques gestes ») : des idées d'usage, jamais une promesse
        // de résultat (textes français seulement : la version anglaise n'a pas d'équivalent rédigé).
        ...(C("fr", "en") === "fr" ? resolveProductCategory(p.product).usageFr.slice(0, 3).map((u) => u.charAt(0).toUpperCase() + u.slice(1)) : []),
      ];
  raw.push(...x.shots.map((s) => s?.onScreen ?? "").filter((t) => usable(t) && t.split(/\s+/).length <= 10));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t0 of raw) {
    if (!t0) continue;
    const t = headline(t0, 10);
    const low = t.toLowerCase();
    if (t.length < 4 || /\[|\]/.test(t) || seen.has(low)) continue;
    if (low === (x.cta ?? "").trim().toLowerCase() || low === x.brand.trim().toLowerCase()) continue;
    if (x.longForm && x.items.some((it) => it.toLowerCase() === low)) continue;
    seen.add(low);
    out.push(t);
  }
  return out;
}

const RHYTHM = ["wipe", "cut", "slide", "cut", "wipe", "zoom"] as const;
const LAYOUTS: StatementLayout[] = ["lower", "stack", "panel", "center"];
/** Rythme des transitions selon la direction artistique : posé (fondus), franc (coupes et volets), doux. */
const MOTION_RHYTHM: Record<VideoLook["motion"], readonly Transition[]> = {
  slow: ["fade", "cut", "fade", "zoom"],
  punchy: RHYTHM,
  gentle: ["fade", "slide", "cut", "fade", "wipe"],
};

/**
 * Applique la direction artistique aux calques d'un plan :
 *  - élément graphique : les formes inclinées (aplats francs) sont réservées à la ligne « affiche » ; la ligne
 *    « éditoriale » reçoit un cadre de filets fins, la ligne « douce » des panneaux plus arrondis ;
 *  - mot fort : souligné d'un filet (le texte reste blanc) au lieu d'un aplat ;
 *  - rythme : animations plus lentes et posées (fondu, montée) ou douces, jamais de rebond pour une ligne raffinée.
 */
export function applyLook(layers: Layer[], o: PromoInput): Layer[] {
  const look = o.look;
  if (!look) return layers;
  const acc = accentOf(o.pal);
  let out = layers.filter((l) => look.motif === "block" || l.name !== "Angle");
  if (look.highlight === "underline")
    out = out.map((l, i, arr) => {
      if (l.kind === "shape" && l.name === "Surlignage") {
        const t = Math.max(4, Math.round(o.w * 0.006));
        return { ...l, y: l.y + l.h - t * 0.5, h: t, radius: 0, fill: acc };
      }
      const prev = arr[i - 1];
      if (l.kind === "text" && prev?.kind === "shape" && prev.name === "Surlignage") return { ...l, color: "#FFFFFF", shadow: shadow };
      return l;
    });
  if (look.motif === "soft") {
    // Ligne douce : formes arrondies partout (panneaux, cartes, mot fort en pastille, vignettes), accroche dans une pastille.
    out = out.map((l) => {
      if (l.kind !== "shape") return l;
      if (l.name === "Panneau" || l.name === "Carte") return { ...l, radius: Math.round(o.w * 0.06) };
      if (l.name === "Surlignage") return { ...l, radius: Math.round(l.h / 2), x: l.x - o.w * 0.01, w: l.w + o.w * 0.02 };
      if (l.name.startsWith("Cadre ")) return { ...l, radius: Math.round(o.w * 0.04) };
      if (l.name === "Trait") return { ...l, radius: Math.round(l.w / 2) };
      return l;
    });
    out = out.map((l) => (l.kind === "image" && l.name.startsWith("Vignette ") ? { ...l, radius: Math.round(o.w * 0.035) } : l));
    const sub = out.findIndex((l) => l.id === "h-sub");
    if (sub >= 0) {
      const s0 = out[sub] as TextLayer;
      const pw = Math.min(o.w - o.safe.side * 2, textWidth(s0.text, s0.font.family, s0.font.weight, s0.font.size, s0.uppercase) + s0.font.size * 2.2);
      // L'accroche descend un peu : la pastille ne touche jamais le titre.
      const sy = s0.y + s0.font.size * 0.9;
      const pill = A(rect("h-sub-pill", "Pastille", { x: s0.x - s0.font.size * 1.1, y: sy - s0.font.size * 0.55, w: pw, h: s0.font.size * 2.1 }, rgba(acc, 0.92), { radius: s0.font.size * 1.05 }), s0.anim?.in ?? "rise", Math.max(0, (s0.anim?.delay ?? 0.5) - 0.05));
      out.splice(sub, 1, pill, { ...s0, y: sy, color: inkOn(acc), shadow: null });
    }
  }
  // Nom de la marque (sans logo) dans la police des titres pour les lignes « marque ».
  if (look.type === "brand") out = out.map((l) => (l.kind === "text" && l.name === "Marque" ? { ...l, font: { ...l.font, family: o.typo.heading, weight: Math.min(700, o.typo.headingWeight ?? 600) } } : l));
  if (look.motif === "rule") out = out.map((l) => (l.kind === "shape" && l.name.startsWith("Cadre ") ? { ...l, fill: "rgba(255,255,255,0.92)", radius: 0 } : l.kind === "image" && l.name.startsWith("Vignette ") ? { ...l, radius: 0 } : l));
  if (look.motif === "rule" && out.some((l) => l.id.startsWith("h-title"))) {
    // Ouverture : cadre de filets fins dans les marges, qui se dessine.
    const t = Math.max(2, Math.round(o.w * 0.0025));
    const m = o.safe.side * 0.6, top = o.safe.top * 0.6, bottom = o.h - o.safe.bottom * 0.6;
    const c = "rgba(255,255,255,0.75)";
    out.push(
      A(rect("h-frame-t", "Filet", { x: m, y: top, w: o.w - m * 2, h: t }, c), "grow", 0.3, 0.9),
      A(rect("h-frame-b", "Filet", { x: m, y: bottom, w: o.w - m * 2, h: t }, c), "grow", 0.4, 0.9),
      A(rect("h-frame-l", "Filet", { x: m, y: top, w: t, h: bottom - top }, c), "fade", 0.5, 0.9),
      A(rect("h-frame-r", "Filet", { x: o.w - m - t, y: top, w: t, h: bottom - top }, c), "fade", 0.5, 0.9),
    );
  }
  if (look.motion !== "punchy")
    out = out.map((l) => {
      if (!l.anim) return l;
      const k = look.motion === "slow" ? 1.6 : 1.25;
      const kind = l.anim.in === "pop" || l.anim.in === "drop" ? (look.motion === "slow" ? "fade" : "rise") : look.motion === "slow" && (l.anim.in === "left" || l.anim.in === "right") ? "rise" : l.anim.in;
      return { ...l, anim: { in: kind, delay: Math.round(l.anim.delay * (look.motion === "slow" ? 1.3 : 1.1) * 1000) / 1000, dur: Math.round((l.anim.dur ?? 0.45) * k * 1000) / 1000 } };
    });
  return out;
}

export function dressPromo(clips: Clip[], shots: ShotPlan[], o: PromoInput): Clip[] {
  const videos = clips.filter((c) => c.source.kind === "video");
  if (!videos.length) return clips;
  const p = o.p;
  const services = p.business === "services";
  const items = services ? (p.services?.services ?? []).map((s) => s.name.trim()).filter(Boolean).slice(0, 3) : productPoints(p);
  // Format long (20 s et plus) : une prestation par plan après le panneau.
  const longForm = clips.reduce((t, c) => t + c.durationS, 0) >= 20;
  const area = (p.services?.area ?? "").trim();
  const city = area ? cityOf(area) : "";
  const tagline = usable(p.brand?.tagline) ? headline(p.brand!.tagline, 7) : "";
  const price = services ? null : priceLabel(p);
  // Titres de l'ouverture : le métier et sa ville (services), le produit et sa catégorie (boutique).
  const heroLines = services ? [p.product.category || o.brand, city ? C(`à ${city}`, `in ${city}`) : ""] : [p.product.name || o.brand, p.product.category || ""];
  const heroSub = services ? items.slice(0, 2).join(" · ") : usable(p.brand?.positioning) ? headline(p.brand!.positioning, 10) : "";
  // Messages des plans suivants : uniquement des informations du projet (rien d'inventé), sans répétition.
  const pool = projectTexts(p, { services, items, longForm, tagline, area, city, price, cta: o.cta, brand: o.brand, shots });
  let next = 0;
  // Chaque plan porte un texte : d'abord chaque message une fois ; s'il en manque, les plus forts reviennent, jamais
  // deux fois de suite (un plan sans texte faisait « vide »).
  const say = (): string | null => (pool.length ? pool[next++ % pool.length] : null);
  let reuse = 0;
  const uses = new Map<string, number>();
  const out: Clip[] = [];
  const imageUses = new Map<string, number>();
  let photoNext = 0;
  let panelDone = false;
  let stepNext = 0;
  let layoutNext = 0;
  // Petite étiquette au-dessus des messages : le métier (services) ou la catégorie (boutique).
  const eyebrow = (p.product.category || "").trim().slice(0, 40);
  for (const [k, c] of clips.entries()) {
    const s = shots[k];
    let source = c.source;
    // Une même photo n'apparaît jamais plus de deux fois : au-delà, un passage d'un plan réel la remplace.
    if (source.kind === "image") {
      const n = (imageUses.get(source.assetId) ?? 0) + 1;
      imageUses.set(source.assetId, n);
      const sameAsPrev = k > 0 && out[k - 1]?.source.kind === "image" && (out[k - 1].source as { assetId: string }).assetId === source.assetId;
      if (n > 2 || sameAsPrev) {
        imageUses.set(source.assetId, n - 1);
        source = { kind: "doc", doc: { layers: [] } as never, animate: "none" } as Clip["source"];
      }
    }
    if (source.kind === "doc" && !(s?.method === "packshot")) {
      // Reprise d'un plan réel : le moins utilisé, jamais celui du plan précédent, à un autre moment du plan.
      const prevId = k > 0 && out[k - 1]?.source.kind === "video" ? (out[k - 1].source as { assetId: string }).assetId : null;
      const pool2 = videos.filter((v) => v.source.kind === "video" && (v.source as { assetId: string }).assetId !== prevId);
      const v = [...(pool2.length ? pool2 : videos)].sort((a, b) => (uses.get((a.source as { assetId: string }).assetId) ?? 0) - (uses.get((b.source as { assetId: string }).assetId) ?? 0))[0];
      if (v?.source.kind === "video") {
        const n = uses.get(v.source.assetId) ?? 1;
        const inS = Math.max(0, v.source.outS + (n - 1) * (c.durationS + 0.4));
        source = { ...v.source, inS, outS: inS + c.durationS };
      }
      reuse++;
    }
    if (source.kind === "video") uses.set(source.assetId, (uses.get(source.assetId) ?? 0) + 1);
    // Boutique : le plan de démonstration montre le VRAI produit (sa photo), en léger mouvement de caméra.
    const photo = !services && c.part === "demonstration" && o.productPhotos?.[photoNext];
    if (photo && source.kind !== "image" && (imageUses.get(photo) ?? 0) < 2 && !(k > 0 && out[k - 1]?.source.kind === "image")) {
      source = { kind: "image", assetId: photo, motion: "push_in", crop: null };
      imageUses.set(photo, (imageUses.get(photo) ?? 0) + 1);
      photoNext++;
    }
    const isVideo = source.kind === "video" || source.kind === "image";
    let overlays = c.overlays;
    if (c.part === "cta") {
      const lines = services ? contactLines(p) : [price ? `${p.product.name} — ${price}` : p.product.name, o.brand].filter((x, i, a) => x && !a.slice(0, i).some((y) => y.toLowerCase().includes(x.toLowerCase())));
      // Fin adaptée au métier : on invite à table un client de restaurant, on propose d'en parler à un client d'artisan.
      const hospitality = songStyleFor(p) === "bistro";
      const title = services ? (hospitality ? C("À bientôt à table", "See you at the table") : C("Un projet ? Parlons-en.", "A project? Let's talk.")) : tagline || p.product.name;
      overlays = contactOverlay(o, title, lines, o.cta?.trim() || (services ? C("Contactez-nous", "Contact us") : C("Découvrir", "Discover")));
    } else if (!isVideo) overlays = c.overlays;
    else if (k === 0) overlays = heroOverlay(o, heroLines, heroSub, services ? tagline : "");
    else if (!panelDone && items.length >= 3 && (c.part === "development" || c.part === "demonstration")) {
      panelDone = true;
      overlays = servicesOverlay(o, services ? C("Nos prestations", "Our services") : C("Les points forts", "Highlights"), items, area || tagline);
    } else if (longForm && panelDone && stepNext < items.length && c.part !== "conclusion") {
      // Format long : chaque prestation a son plan (numéro, pictogramme, nom).
      overlays = stepOverlay(o, stepNext + 1, services ? C("Prestation", "Service") : C("Point fort", "Highlight"), items[stepNext], o.icons?.[stepNext] ?? null, `st${k}`);
      stepNext++;
    } else {
      const text = say();
      overlays = text ? statementOverlay(o, text, `m${k}`, LAYOUTS[layoutNext++ % LAYOUTS.length], eyebrow) : [vignette(o, `b${k}`), ...brandMark(o, `b${k}`, "#FFFFFF", 0.1)];
    }
    // Rythme varié (glissement, coupe franche, volet, zoom) : jamais le même effet à chaque plan ; la fin glisse.
    const rhythm = o.look ? MOTION_RHYTHM[o.look.motion] : RHYTHM;
    const kind: Transition = k === 0 ? "cut" : c.part === "cta" ? (o.look?.motion === "slow" ? "fade" : "wipe") : rhythm[(k - 1) % rhythm.length];
    const slow = o.look?.motion === "slow" ? 1.6 : o.look?.motion === "gentle" ? 1.25 : 1;
    out.push({ ...c, source, overlays: o.look ? applyLook(overlays, o) : overlays, transitionIn: { kind, durationS: kind === "cut" ? 0 : Math.round((kind === "wipe" ? 0.5 : 0.35) * slow * 100) / 100 } });
  }
  void reuse;
  return out;
}
