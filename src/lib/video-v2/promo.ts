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
import { buttonLayer, imageLayer, inkOn, rectLayer, textLayer, type Palette, type Typo } from "./doc";
import type { Clip, ShotPlan, VideoDocument } from "./types";

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
  cta: string;
  message: string;
};

const rgba = (hex: string, a: number) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return `rgba(0,0,0,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Police d'affiche : bâton très gras pour les services et les marques directes, titre de la marque sinon. */
function display(o: PromoInput): { family: string; weight: number; upper: boolean } {
  const premium = (o.p.brand?.personality ?? []).some((x) => /premium|raffin|luxe|élégan|epur|épur/i.test(x));
  return premium ? { family: o.typo.heading, weight: o.typo.headingWeight ?? 600, upper: false } : { family: "Montserrat", weight: 800, upper: true };
}

/** Couleur d'accent lisible sur une vidéo assombrie (la plus vive des couleurs de la marque). */
function accentOf(pal: Palette): string {
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

function txt(id: string, name: string, b: { x: number; y: number; w: number; h: number }, text: string, o: { family: string; weight: number; size: number; color: string; align?: TextLayer["align"]; upper?: boolean; spacing?: number; shadow?: boolean }): TextLayer {
  const l = textLayer(id, name, "title", b, text, { family: o.family, weight: o.weight, size: o.size, color: o.color, align: o.align ?? "left", uppercase: o.upper });
  return { ...l, letterSpacing: o.spacing ?? 0, lineHeight: 1.05, shadow: o.shadow ? shadow : null };
}

function rect(id: string, name: string, b: { x: number; y: number; w: number; h: number }, fill: ShapeLayer["fill"], o: { radius?: number; rotation?: number; stroke?: ShapeLayer["stroke"]; role?: ShapeLayer["role"]; shadow?: boolean } = {}): ShapeLayer {
  const l = rectLayer(id, name, o.role ?? "decor", b, fill, o.radius ?? 0);
  return { ...l, rotation: o.rotation ?? 0, stroke: o.stroke ?? null, shadow: o.shadow ? shadow : null };
}

/** Logo (image) ou nom de la marque, centré en haut. */
function brandMark(o: PromoInput, id: string, color = "#FFFFFF"): Layer[] {
  const { w, h, safe } = o;
  if (o.logoId) return [{ ...imageLayer(`${id}-logo`, "Logo", "logo", { x: w * 0.3, y: safe.top + h * 0.005, w: w * 0.4, h: h * 0.07 }, o.logoId, "contain") }];
  return [txt(`${id}-brand`, "Marque", { x: safe.side, y: safe.top + h * 0.01, w: w - safe.side * 2, h: h * 0.04 }, o.brand, { family: "Montserrat", weight: 800, size: Math.round(w * 0.04), color, align: "center", upper: true, spacing: w * 0.006, shadow: true })];
}

/** Rangée de trois vignettes encadrées. */
function thumbRow(o: PromoInput, id: string, y: number, accent: string, skip = 0): Layer[] {
  const { w, h, safe } = o;
  const ids = [...o.thumbs.slice(skip), ...o.thumbs.slice(0, skip)].slice(0, 3);
  if (ids.length < 3) return [];
  const gap = w * 0.03;
  const tw = (w - safe.side * 2 - gap * 2) / 3;
  const th = h * 0.11;
  const out: Layer[] = [];
  ids.forEach((a, k) => {
    const x = safe.side + k * (tw + gap);
    out.push(rect(`${id}-tf${k}`, `Cadre ${k + 1}`, { x: x - 5, y: y - 5, w: tw + 10, h: th + 10 }, accent, { radius: w * 0.014, shadow: true }));
    out.push({ ...imageLayer(`${id}-t${k}`, `Vignette ${k + 1}`, "image", { x, y, w: tw, h: th }, a, "cover"), radius: w * 0.01 });
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
    rect("h-scrim-top", "Voile haut", { x: 0, y: 0, w, h: h * 0.5 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: "rgba(0,0,0,0.8)" }, { offset: 0.6, color: "rgba(0,0,0,0.5)" }, { offset: 1, color: "rgba(0,0,0,0)" }] }, { role: "scrim" }),
    rect("h-scrim-bottom", "Voile bas", { x: 0, y: h * 0.55, w, h: h * 0.45 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: "rgba(0,0,0,0)" }, { offset: 1, color: "rgba(0,0,0,0.75)" }] }, { role: "scrim" }),
    rect("h-corner-a", "Angle", { x: -w * 0.28, y: -h * 0.06, w: w * 0.62, h: h * 0.09 }, acc, { rotation: -32 }),
    rect("h-corner-b", "Angle", { x: w * 0.72, y: h * 0.86, w: w * 0.6, h: h * 0.08 }, acc, { rotation: -32 }),
    rect("h-corner-c", "Angle", { x: w * 0.8, y: h * 0.82, w: w * 0.5, h: h * 0.025 }, "#FFFFFF", { rotation: -32 }),
    ...brandMark(o, "h"),
    rect("h-bar", "Trait", { x: safe.side, y: y0 + size * 0.1, w: w * 0.012, h: size * lines.length * 1.05 }, acc),
  ];
  lines.forEach((t, k) => {
    const hi = k === lines.length - 1 && lines.length > 1;
    const x = safe.side + w * 0.04;
    const y = y0 + k * size * 1.12;
    if (hi) L.push(rect(`h-hl${k}`, "Surlignage", { x: x - w * 0.015, y: y - size * 0.06, w: Math.min(w - x - safe.side * 0.5, textWidth(t, f.family, f.weight, size, f.upper) + w * 0.035), h: size * 1.14 }, acc, { radius: w * 0.008 }));
    L.push(txt(`h-title${k}`, `Titre ${k + 1}`, { x, y, w: w - safe.side * 2 - w * 0.04, h: size * 1.1 }, t, { family: f.family, weight: f.weight, size, color: hi ? inkOn(acc) : "#FFFFFF", upper: f.upper, shadow: !hi }));
  });
  if (sub) L.push(txt("h-sub", "Accroche", { x: safe.side + w * 0.04, y: y0 + lines.length * size * 1.12 + h * 0.014, w: w - safe.side * 2 - w * 0.04, h: h * 0.03 }, sub, { family: "Montserrat", weight: 600, size: Math.round(w * 0.032), color: "#FFFFFF", upper: true, spacing: 2, shadow: true }));
  L.push(...thumbRow(o, "h", h * 0.7, acc));
  if (tagline) L.push(txt("h-tag", "Signature", { x: safe.side, y: h * 0.835, w: w - safe.side * 2, h: h * 0.035 }, tagline, { family: "Montserrat", weight: 700, size: Math.round(w * 0.034), color: "#FFFFFF", align: "center", upper: true, spacing: 2, shadow: true }));
  return L;
}

/** Prestations (ou points forts) : panneau translucide, trois éléments numérotés. */
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
    rect("s-scrim", "Voile", { x: 0, y: 0, w, h }, "rgba(0,0,0,0.18)", { role: "scrim" }),
    ...brandMark(o, "s"),
    rect("s-panel", "Panneau", { x: px, y: py, w: pw, h: ph }, rgba(acc, 0.9), { radius: w * 0.035, shadow: true }),
    txt("s-title", "Titre du panneau", { x: px, y: py + ph * 0.07, w: pw, h: ph * 0.2 }, title, { family: f.family, weight: f.weight, size: Math.round(w * 0.062), color: ink, align: "center", upper: false }),
  ];
  const n = Math.min(3, items.length);
  const cw = pw / n;
  items.slice(0, n).forEach((it, k) => {
    const cx = px + cw * k + cw / 2;
    const d = w * 0.085;
    L.push({ ...rect(`s-dot${k}`, `Pastille ${k + 1}`, { x: cx - d / 2, y: py + ph * 0.34, w: d, h: d }, ink === "#FFFFFF" ? "rgba(255,255,255,0.95)" : pal.dark), shape: "ellipse" });
    L.push(txt(`s-num${k}`, `Numéro ${k + 1}`, { x: cx - d / 2, y: py + ph * 0.34 + d * 0.16, w: d, h: d * 0.7 }, String(k + 1), { family: "Montserrat", weight: 800, size: Math.round(d * 0.55), color: ink === "#FFFFFF" ? acc : "#FFFFFF", align: "center" }));
    L.push(txt(`s-item${k}`, `Élément ${k + 1}`, { x: px + cw * k + w * 0.015, y: py + ph * 0.34 + d + h * 0.012, w: cw - w * 0.03, h: ph * 0.3 }, it, { family: "Montserrat", weight: 700, size: Math.round(w * 0.031), color: ink, align: "center" }));
  });
  L.push(...thumbRow(o, "s", h * 0.6, acc, 1));
  if (tagline) L.push(txt("s-tag", "Signature", { x: safe.side, y: h * 0.735, w: w - safe.side * 2, h: h * 0.035 }, tagline, { family: "Montserrat", weight: 700, size: Math.round(w * 0.036), color: "#FFFFFF", align: "center", upper: true, spacing: 2, shadow: true }));
  return L;
}

/** Message : titre empilé, une ligne sur fond d'accent. */
export function statementOverlay(o: PromoInput, text: string, id = "m"): Layer[] {
  const { w, h, safe, pal } = o;
  const acc = accentOf(pal);
  const f = display(o);
  const lines = splitLines(headline(text, 10), 3);
  const size = Math.round(w * (f.upper ? 0.085 : 0.095));
  const y0 = h * 0.42 - (lines.length * size * 1.15) / 2;
  // Ligne surlignée : la dernière (souvent le mot fort), jamais une ligne faite d'un seul petit mot.
  const hi = lines.length >= 3 && !STOP.has(lines[1].toLowerCase()) ? 1 : lines.length - 1;
  const L: Layer[] = [
    rect(`${id}-scrim`, "Voile", { x: 0, y: h * 0.2, w, h: h * 0.6 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: "rgba(0,0,0,0)" }, { offset: 0.5, color: "rgba(0,0,0,0.55)" }, { offset: 1, color: "rgba(0,0,0,0)" }] }, { role: "scrim" }),
    ...brandMark(o, id),
  ];
  lines.forEach((t, k) => {
    const y = y0 + k * size * 1.15;
    const est = Math.min(w - safe.side * 2 + w * 0.04, textWidth(t, f.family, f.weight, size, f.upper) + w * 0.05);
    if (k === hi) L.push(rect(`${id}-hl`, "Surlignage", { x: safe.side - w * 0.02, y: y - size * 0.08, w: est, h: size * 1.16 }, acc, { radius: w * 0.008 }));
    L.push(txt(`${id}-l${k}`, `Ligne ${k + 1}`, { x: safe.side, y, w: w - safe.side * 2, h: size * 1.1 }, t, { family: f.family, weight: f.weight, size, color: k === hi ? inkOn(acc) : "#FFFFFF", upper: f.upper, shadow: k !== hi }));
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
  L.push(rect("c-card", "Carte", { x: safe.side * 0.6, y: cardY, w: w - safe.side * 1.2, h: cardH }, "#FFFFFF", { radius: w * 0.05, shadow: true }));
  const bw = Math.min(w * 0.7, textWidth(button, "Montserrat", 800, Math.round(w * 0.045), false) + w * 0.14);
  // Vrai bouton de l'éditeur (modifiable comme celui d'une publicité).
  const btn = buttonLayer("c-btn", { x: (w - bw) / 2, y: cardY - h * 0.032, w: bw, h: h * 0.064 }, button, { family: "Montserrat", size: Math.round(w * 0.045), fill: acc, color: inkOn(acc) });
  L.push({ ...btn, font: { ...btn.font, weight: 800 }, shadow });
  rows.forEach((t, k) => {
    const y = cardY + h * 0.058 + k * rowH;
    if (k > 0) L.push(rect(`c-sep${k}`, `Séparateur ${k}`, { x: w * 0.3, y: y - rowH * 0.18, w: w * 0.4, h: 2 }, rgba(pal.dark, 0.12)));
    L.push(txt(`c-line${k}`, `Coordonnée ${k + 1}`, { x: safe.side, y, w: w - safe.side * 2, h: h * 0.036 }, t, { family: "Montserrat", weight: k === 0 ? 800 : 600, size: Math.round(w * (k === 0 ? 0.046 : 0.038)), color: pal.dark, align: "center" }));
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
const RHYTHM = ["slide", "cut", "wipe", "cut", "zoom", "cut"] as const;

export function dressPromo(clips: Clip[], shots: ShotPlan[], o: PromoInput): Clip[] {
  const videos = clips.filter((c) => c.source.kind === "video");
  if (!videos.length) return clips;
  const p = o.p;
  const services = p.business === "services";
  const items = services ? (p.services?.services ?? []).map((s) => s.name.trim()).filter(Boolean).slice(0, 3) : productPoints(p);
  const area = (p.services?.area ?? "").trim();
  const city = area ? cityOf(area) : "";
  const tagline = usable(p.brand?.tagline) ? headline(p.brand!.tagline, 7) : "";
  const price = services ? null : priceLabel(p);
  // Titres de l'ouverture : le métier et sa ville (services), le produit et sa catégorie (boutique).
  const heroLines = services ? [p.product.category || o.brand, city ? C(`à ${city}`, `in ${city}`) : ""] : [p.product.name || o.brand, p.product.category || ""];
  const heroSub = services ? items.slice(0, 2).join(" · ") : usable(p.brand?.positioning) ? headline(p.brand!.positioning, 10) : "";
  // Messages des plans suivants : uniquement des informations du projet (rien d'inventé), sans répétition.
  const pool = [
    ...(services ? items : []),
    tagline,
    usable(p.brand?.positioning) ? headline(p.brand!.positioning, 10) : "",
    usable(p.product.summary) ? headline(p.product.summary, 10) : "",
    ...(services ? [area, p.services?.hours ?? ""] : productPoints(p)),
    ...shots.map((s) => s?.onScreen ?? "").filter((t) => usable(t) && t.split(/\s+/).length <= 10),
  ].map((t) => (t ? headline(t, 10) : "")).filter((t, i, a) => usable(t) && a.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);
  let next = 0;
  const say = () => pool[next++ % Math.max(1, pool.length)] ?? o.brand;
  let reuse = 0;
  let photoNext = 0;
  let panelDone = false;
  return clips.map((c, k) => {
    const s = shots[k];
    let source = c.source;
    if (source.kind === "doc" && !(s?.method === "packshot")) {
      // Reprise d'un plan réel, à un autre moment du plan, pour ne jamais montrer deux fois la même image.
      const v = videos[reuse++ % videos.length];
      if (v.source.kind === "video") {
        const inS = Math.max(0, v.source.outS + 0.2 * (reuse - 1));
        source = { ...v.source, inS, outS: inS + c.durationS };
      }
    }
    // Boutique : le plan de démonstration montre le VRAI produit (sa photo), en léger mouvement de caméra.
    const photo = !services && c.part === "demonstration" && o.productPhotos?.[photoNext];
    if (photo && source.kind !== "image") {
      source = { kind: "image", assetId: photo, motion: "push_in", crop: null };
      photoNext++;
    }
    const isVideo = source.kind === "video" || source.kind === "image";
    let overlays = c.overlays;
    if (c.part === "cta") {
      const lines = services ? contactLines(p) : [price ? `${p.product.name} — ${price}` : p.product.name, o.brand].filter((x, i, a) => x && !a.slice(0, i).some((y) => y.toLowerCase().includes(x.toLowerCase())));
      overlays = contactOverlay(o, services ? C("Un projet ? Parlons-en.", "A project? Let's talk.") : tagline || p.product.name, lines, services ? C("Contactez-nous", "Contact us") : o.cta);
    } else if (!isVideo) overlays = c.overlays;
    else if (k === 0) overlays = heroOverlay(o, heroLines, heroSub, services ? tagline : "");
    else if (!panelDone && items.length >= 3 && (c.part === "development" || c.part === "demonstration")) {
      panelDone = true;
      overlays = servicesOverlay(o, services ? C("Nos prestations", "Our services") : C("Les points forts", "Highlights"), items, area || tagline);
    } else overlays = statementOverlay(o, say(), `m${k}`);
    // Rythme varié (glissement, coupe franche, volet, zoom) : jamais le même effet à chaque plan ; la fin glisse.
    const kind = k === 0 ? "cut" : c.part === "cta" ? "slide" : RHYTHM[(k - 1) % RHYTHM.length];
    return { ...c, source, overlays, transitionIn: { kind, durationS: kind === "cut" ? 0 : 0.35 } };
  });
}
