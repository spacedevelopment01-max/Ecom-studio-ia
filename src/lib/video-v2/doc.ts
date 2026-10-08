/**
 * Document vidéo V2 : timeline éditable (plans, calques par-dessus, sous-titres, pistes audio). Tout ce qui est
 * dessiné (titres, packshot, carte de fin) est fait de calques de l'éditeur publicitaire (`ad-doc/`) : mêmes
 * opérations, même moteur de rendu, un seul système de calques dans le studio.
 */
import type { AdDocument, Layer, ShapeLayer, TextLayer, ImageLayer, ButtonLayer } from "../ad-doc/types";
import { DOC_VERSION } from "../ad-doc/types";
import { PLATFORM_SPECS } from "./intent";
import { WORDS_PER_SECOND } from "./script";
import type { AudioClip, Clip, SubtitleCue, SubtitleStyle, VideoAspect, VideoDocument, VideoPlatform } from "./types";

export const VIDEO_DOC_VERSION = 1;
export const SIZES: Record<VideoAspect, { w: number; h: number }> = { "9:16": { w: 1080, h: 1920 }, "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "4:5": { w: 1080, h: 1350 } };

export type Palette = { primary: string; secondary: string; accent: string; dark: string; light: string };
export type Typo = { heading: string; body: string; headingWeight?: number; uppercase?: boolean };

export function safeZone(aspect: VideoAspect, platform: VideoPlatform) {
  const { w, h } = SIZES[aspect];
  const s = PLATFORM_SPECS[platform].safe;
  return { top: Math.round(h * s.top), bottom: Math.round(h * s.bottom), side: Math.round(w * s.side) };
}

/** Début de chaque plan (secondes) et durée totale. */
export function timeline(doc: Pick<VideoDocument, "clips">): { starts: number[]; total: number } {
  const starts: number[] = [];
  let t = 0;
  for (const c of doc.clips) {
    starts.push(Math.round(t * 1000) / 1000);
    t += c.durationS;
  }
  return { starts, total: Math.round(t * 1000) / 1000 };
}

/** Sous-titres en temps absolus (export SRT / VTT, rendu). */
export function absoluteCues(doc: Pick<VideoDocument, "clips" | "subtitles">): { start: number; end: number; text: string; cueId: string }[] {
  const { starts } = timeline(doc);
  const at = new Map(doc.clips.map((c, k) => [c.id, { start: starts[k], dur: c.durationS }]));
  return doc.subtitles.cues
    .filter((q) => at.has(q.clipId))
    .map((q) => {
      const c = at.get(q.clipId)!;
      return { cueId: q.id, start: c.start + Math.max(0, Math.min(q.fromS, c.dur)), end: c.start + Math.max(0, Math.min(q.toS, c.dur)), text: q.text };
    })
    .filter((q) => q.end - q.start > 0.05)
    .sort((a, b) => a.start - b.start);
}

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, "0");
const stamp = (s: number, sep: "," | ".") => `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}${sep}${pad(Math.round((s % 1) * 1000), 3)}`;
export const toSrt = (doc: Pick<VideoDocument, "clips" | "subtitles">) => absoluteCues(doc).map((q, i) => `${i + 1}\n${stamp(q.start, ",")} --> ${stamp(q.end, ",")}\n${q.text}\n`).join("\n");
export const toVtt = (doc: Pick<VideoDocument, "clips" | "subtitles">) => `WEBVTT\n\n${absoluteCues(doc).map((q) => `${stamp(q.start, ".")} --> ${stamp(q.end, ".")}\n${q.text}\n`).join("\n")}`;

/** Découpe une phrase en sous-titres lisibles (au plus `maxChars` par carton, coupure aux mots, jamais au milieu). */
export function splitCaption(text: string, maxChars: number): string[] {
  // Une ponctuation de liaison en fin de carton (« : », « , », « ; ») ne s'affiche pas.
  const words = text.replace(/\s+/g, " ").trim().replace(/\s*[:;,]\s*$/, "").replace(/\.{2,}$/, ".").split(" ").filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > maxChars) {
      out.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Sous-titres d'un plan à partir de sa voix : cartons au prorata des mots, mais jamais affichés moins longtemps que
 * le temps de lecture (≈ 15 caractères par seconde, 0,8 s au moins) — dans la limite de la durée du plan.
 */
export function cuesForVoice(clipId: string, voice: string, clipS: number, maxChars: number, idBase: string): SubtitleCue[] {
  const parts = splitCaption(voice, maxChars);
  if (!parts.length) return [];
  const words = parts.map((p) => p.split(" ").length);
  const total = words.reduce((a, b) => a + b, 0);
  const speech = total / WORDS_PER_SECOND;
  const room = Math.max(0.3, clipS - 0.2);
  let want = parts.map((p, k) => Math.max((words[k] / total) * speech, p.length / 15, 0.8));
  const sum = want.reduce((a, b) => a + b, 0);
  if (sum > room) want = want.map((d) => (d * room) / sum);
  let t = 0.1;
  return parts.map((text, k) => {
    const q = { id: `${idBase}-${k + 1}`, clipId, fromS: Math.round(t * 100) / 100, toS: Math.round(Math.min(clipS - 0.05, t + want[k]) * 100) / 100, text };
    t += want[k];
    return q;
  });
}

export function defaultSubtitleStyle(doc: { width: number; height: number }, typo: Typo, pal: Palette): SubtitleStyle {
  const short = Math.min(doc.width, doc.height);
  return { enabled: true, family: typo.body, weight: 700, size: Math.round(short * 0.052), color: "#FFFFFF", background: "rgba(0,0,0,0.62)", position: "bottom", offsetY: 0, maxChars: doc.width > doc.height ? 42 : 28, uppercase: false };
}

// ------------------------------------------------------------------------------------------- calques (ad-doc)

const base = (id: string, name: string, role: Layer["role"], b: { x: number; y: number; w: number; h: number }) => ({ id, name, role, ...b, rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "center", v: "middle" } as Layer["anchor"] });

export function textLayer(id: string, name: string, role: TextLayer["role"], b: { x: number; y: number; w: number; h: number }, text: string, o: { family: string; weight: number; size: number; color: string; align?: TextLayer["align"]; uppercase?: boolean }): TextLayer {
  return { ...base(id, name, role, b), kind: "text", text, font: { family: o.family, weight: o.weight, size: o.size, italic: false }, color: o.color, align: o.align ?? "center", lineHeight: 1.12, letterSpacing: 0, uppercase: !!o.uppercase, autoFit: { minSize: Math.round(o.size * 0.55) }, shadow: null };
}

export function rectLayer(id: string, name: string, role: ShapeLayer["role"], b: { x: number; y: number; w: number; h: number }, fill: ShapeLayer["fill"], radius = 0): ShapeLayer {
  return { ...base(id, name, role, b), kind: "shape", shape: "rect", fill, stroke: null, radius, shadow: null };
}

export function imageLayer(id: string, name: string, role: ImageLayer["role"], b: { x: number; y: number; w: number; h: number }, assetId: string, fit: ImageLayer["fit"] = "contain"): ImageLayer {
  return { ...base(id, name, role, b), kind: "image", assetId, fit, crop: null, radius: 0, shadow: null };
}

function buttonLayer(id: string, b: { x: number; y: number; w: number; h: number }, text: string, o: { family: string; size: number; fill: string; color: string }): ButtonLayer {
  return { ...base(id, "Bouton", "cta", b), kind: "button", text, font: { family: o.family, weight: 600, size: o.size, italic: false }, fill: o.fill, color: o.color, radius: b.h / 2, stroke: null, shadow: null };
}

function frame(w: number, h: number, pal: Palette, typo: Typo, brand: string, layers: Layer[], background: string): AdDocument {
  return { version: DOC_VERSION, width: w, height: h, background, safe: { top: 0, bottom: 0, side: 0 }, format: { platform: null, aspect: `${w}x${h}` }, layers, brand: { palette: { ...pal }, fonts: { heading: typo.heading, body: typo.body }, name: brand }, meta: { conceptId: null, source: "engine", createdFrom: null } };
}

const lum = (hex: string) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};
export const inkOn = (bg: string) => (lum(bg) > 0.55 ? "#111111" : "#FFFFFF");

/** Packshot du produit RÉEL (détourage aux pixels d'origine) sur le fond de la marque, titre facultatif. */
export function packshotDoc(o: { w: number; h: number; safe: VideoDocument["safe"]; pal: Palette; typo: Typo; brand: string; cutoutId: string; title?: string }): AdDocument {
  const { w, h, pal } = o;
  const layers: Layer[] = [rectLayer("bg", "Fond", "background", { x: 0, y: 0, w, h }, { type: "linear", angle: 90, stops: [{ offset: 0, color: pal.light }, { offset: 1, color: pal.secondary }] })];
  const box = { x: w * 0.18, y: h * 0.2, w: w * 0.64, h: h * 0.58 };
  layers.push({ ...imageLayer("product", "Produit", "product", box, o.cutoutId, "contain"), contactShadow: true });
  if (o.title) layers.push(textLayer("title", "Titre", "title", { x: o.safe.side, y: o.safe.top + h * 0.02, w: w - o.safe.side * 2, h: h * 0.14 }, o.title, { family: o.typo.heading, weight: o.typo.headingWeight ?? 600, size: Math.round(Math.min(w, h) * 0.075), color: inkOn(pal.light) }));
  return frame(w, h, pal, o.typo, o.brand, layers, pal.light);
}

/** Typographie animée (accroche, preuve) : texte court, grand, sur un aplat de la charte. */
export function kineticDoc(o: { w: number; h: number; safe: VideoDocument["safe"]; pal: Palette; typo: Typo; brand: string; text: string; sub?: string; dark?: boolean }): AdDocument {
  const { w, h, pal } = o;
  const bg = o.dark ? pal.dark : pal.primary;
  const ink = inkOn(bg);
  const short = Math.min(w, h);
  const layers: Layer[] = [rectLayer("bg", "Fond", "background", { x: 0, y: 0, w, h }, bg)];
  layers.push(textLayer("title", "Texte", "title", { x: o.safe.side, y: h * 0.32, w: w - o.safe.side * 2, h: h * 0.24 }, o.text, { family: o.typo.heading, weight: o.typo.headingWeight ?? 700, size: Math.round(short * 0.09), color: ink }));
  if (o.sub) layers.push(textLayer("sub", "Sous-titre", "subtitle", { x: o.safe.side, y: h * 0.58, w: w - o.safe.side * 2, h: h * 0.1 }, o.sub, { family: o.typo.body, weight: 500, size: Math.round(short * 0.042), color: ink }));
  return frame(w, h, pal, o.typo, o.brand, layers, bg);
}

/** Animation d'interface locale (sans capture fournie) : fenêtre, barres de données, titre — clairement schématique. */
export function interfaceDoc(o: { w: number; h: number; safe: VideoDocument["safe"]; pal: Palette; typo: Typo; brand: string; text: string }): AdDocument {
  const { w, h, pal } = o;
  const layers: Layer[] = [rectLayer("bg", "Fond", "background", { x: 0, y: 0, w, h }, pal.light)];
  const win = { x: w * 0.1, y: h * 0.22, w: w * 0.8, h: h * 0.5 };
  layers.push(rectLayer("window", "Fenêtre", "shape", win, "#FFFFFF", Math.round(Math.min(w, h) * 0.02)));
  layers.push(rectLayer("bar", "Barre", "shape", { x: win.x, y: win.y, w: win.w, h: win.h * 0.1 }, pal.primary, 0));
  for (let k = 0; k < 4; k++) {
    const bh = win.h * (0.2 + 0.12 * ((k * 7) % 4));
    layers.push(rectLayer(`data-${k}`, `Donnée ${k + 1}`, "decor", { x: win.x + win.w * (0.12 + k * 0.2), y: win.y + win.h * 0.9 - bh, w: win.w * 0.12, h: bh }, k % 2 ? pal.accent : pal.secondary, 6));
  }
  layers.push(textLayer("title", "Texte", "title", { x: o.safe.side, y: h * 0.76, w: w - o.safe.side * 2, h: h * 0.1 }, o.text, { family: o.typo.heading, weight: 600, size: Math.round(Math.min(w, h) * 0.055), color: inkOn(pal.light) }));
  return frame(w, h, pal, o.typo, o.brand, layers, pal.light);
}

/** Carte de fin : logo (ou nom), phrase, bouton d'appel à l'action — modifiable comme une publicité. */
export function endCardDoc(o: { w: number; h: number; safe: VideoDocument["safe"]; pal: Palette; typo: Typo; brand: string; cta: string; line?: string; logoId?: string | null }): AdDocument {
  const { w, h, pal } = o;
  const short = Math.min(w, h);
  const ink = inkOn(pal.dark);
  const layers: Layer[] = [rectLayer("bg", "Fond", "background", { x: 0, y: 0, w, h }, pal.dark)];
  if (o.logoId) layers.push(imageLayer("logo", "Logo", "logo", { x: w * 0.25, y: h * 0.26, w: w * 0.5, h: h * 0.14 }, o.logoId, "contain"));
  else layers.push(textLayer("brand", "Marque", "title", { x: o.safe.side, y: h * 0.28, w: w - o.safe.side * 2, h: h * 0.12 }, o.brand, { family: o.typo.heading, weight: o.typo.headingWeight ?? 600, size: Math.round(short * 0.085), color: ink, uppercase: o.typo.uppercase }));
  if (o.line) layers.push(textLayer("line", "Phrase", "subtitle", { x: o.safe.side, y: h * 0.45, w: w - o.safe.side * 2, h: h * 0.1 }, o.line, { family: o.typo.body, weight: 500, size: Math.round(short * 0.045), color: ink }));
  const bw = Math.min(w - o.safe.side * 2, short * 0.62);
  const bh = short * 0.11;
  layers.push(buttonLayer("cta", { x: (w - bw) / 2, y: h * 0.6, w: bw, h: bh }, o.cta, { family: o.typo.body, size: Math.round(short * 0.042), fill: pal.accent, color: inkOn(pal.accent) }));
  return frame(w, h, pal, o.typo, o.brand, layers, pal.dark);
}

/** Texte posé sur un plan (photo, vidéo) : bandeau lisible dans la zone de sécurité. */
export function overlayText(o: { w: number; h: number; safe: VideoDocument["safe"]; typo: Typo; text: string; place: "top" | "lower" }): Layer[] {
  const { w, h } = o;
  const short = Math.min(w, h);
  const size = Math.round(short * 0.062);
  const bh = size * 2.9;
  const y = o.place === "top" ? o.safe.top + h * 0.02 : h * 0.62;
  return [
    rectLayer("ov-scrim", "Voile du texte", "scrim", { x: 0, y: y - size * 0.6, w, h: bh + size * 1.2 }, { type: "linear", angle: 90, stops: [{ offset: 0, color: "rgba(0,0,0,0)" }, { offset: 0.5, color: "rgba(0,0,0,0.55)" }, { offset: 1, color: "rgba(0,0,0,0)" }] }),
    textLayer("ov-text", "Texte à l'écran", "title", { x: o.safe.side, y, w: w - o.safe.side * 2, h: bh }, o.text, { family: o.typo.heading, weight: o.typo.headingWeight ?? 700, size, color: "#FFFFFF" }),
  ];
}

/** Voix d'un plan (texte à enregistrer) : décalage et durée de parole naturelle. */
export function voiceClip(clip: Clip, text: string): AudioClip | null {
  if (!text.trim()) return null;
  const words = text.trim().split(/\s+/).length;
  return { id: `voice-${clip.id}`, clipId: clip.id, assetId: null, text, offsetS: 0.15, durationS: Math.min(clip.durationS - 0.2, Math.round((words / WORDS_PER_SECOND) * 100) / 100), gainDb: 0 };
}
