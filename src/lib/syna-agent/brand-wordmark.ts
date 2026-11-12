/**
 * Le nom dessiné en code (décision du propriétaire du 12 novembre 2026) : le Studio compose lui-même le nom de la
 * marque avec la VRAIE police de titres de l'identité, converti en tracés. Le nom est donc toujours exact à la lettre
 * (accents compris), sur la planche comme en image : c'est aussi le logo de secours, pour que le client finisse
 * toujours avec un logo.
 *
 * Le modèle ne fournit qu'une recette (`Wordmark` : casse, espacement, mise en lignes, point final, petit signe
 * nettoyé). Aucun dessin libre, aucun texte du modèle n'arrive à l'écran sans passer par ici.
 */
import fs from "node:fs";
import * as opentypeModule from "opentype.js";
import sharp from "sharp";
import { fontFilePath } from "../theme/render";
import type { BoardSymbol, Wordmark } from "./brand-board";
import { fontFace } from "./identities";

// opentype.js 2 : exports nommés sous Next.js, export par défaut sous Node (voir `logo-v2/construct.ts`).
const opentypeExports: Record<string, unknown> = opentypeModule;
const parseFont = ("parse" in opentypeExports ? opentypeExports.parse : (opentypeExports["default"] as { parse?: unknown } | undefined)?.parse) as typeof opentypeModule.parse;

export type DrawnShape = { d: string; tone: "main" | "accent"; paint: "fill" | "stroke"; width?: number; rule?: "nonzero" | "evenodd" };
/** Dessin prêt à afficher : des tracés seuls, dans un cadre `width` × `height`. Les couleurs se choisissent à l'affichage. */
export type DrawnWordmark = { width: number; height: number; shapes: DrawnShape[]; text: string; family: string; symbol?: PlacedSymbol };
/** Petit signe posé avec le nom : gardé dans son propre repère, placé par une boîte (aucune transformation de tracé). */
export type PlacedSymbol = { x: number; y: number; size: number; viewBox: [number, number, number]; shapes: BoardSymbol["shapes"] };

const fonts = new Map<string, ReturnType<typeof parseFont>>();
function loadFont(file: string) {
  const hit = fonts.get(file);
  if (hit) return hit;
  const p = fontFilePath(file);
  if (!p) throw new Error(`Police introuvable pour dessiner le nom : ${file}`);
  const buf = fs.readFileSync(p);
  const f = parseFont(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  fonts.set(file, f);
  return f;
}

const applyCase = (s: string, c: Wordmark["case"]) => (c === "upper" ? s.toLocaleUpperCase("fr-FR") : c === "lower" ? s.toLocaleLowerCase("fr-FR") : c === "title" ? s.replace(/(^|[\s'’-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toLocaleUpperCase("fr-FR")) : s);
const round = (n: number) => Math.round(n * 100) / 100;

/** Lettres que la police ne sait pas écrire (le nom serait faux) : la police est alors écartée. */
export function missingLetters(text: string, headingHandle: string): string[] {
  const face = fontFace(headingHandle);
  if (!face) return [...new Set([...text].filter((c) => c.trim()))];
  const f = loadFont(face.file);
  return [...new Set([...text].filter((ch) => ch.trim() && f.charToGlyphIndex(ch) === 0))];
}

/** Police de secours capable d'écrire tout le nom (jamais une lettre remplacée par un carré vide). */
const SAFE_HANDLES = ["inter_n7", "dm_sans_n7", "playfair_display_n7"];
export function drawableHandle(name: string, headingHandle: string): string {
  // Toutes les casses possibles du nom : une recette peut l'écrire en capitales.
  const all = `${name}${name.toLocaleUpperCase("fr-FR")}${name.toLocaleLowerCase("fr-FR")}`;
  for (const h of [headingHandle, ...SAFE_HANDLES]) { try { if (!missingLetters(all, h).length) return h; } catch { /* police illisible : la suivante */ } }
  return headingHandle;
}

const SIZE = 100;

type OpenFont = ReturnType<typeof parseFont>;
type Command = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
/**
 * Tracé SVG écrit ici, commande par commande : l'écriture « optimisée » de la bibliothèque rend parfois une coordonnée
 * manquante (« NaN ») alors que les points du glyphe sont justes. null : un point du glyphe est réellement invalide.
 */
function pathData(commands: Command[]): string | null {
  let out = "";
  for (const c of commands) {
    const pts = c.type === "M" || c.type === "L" ? [c.x, c.y] : c.type === "C" ? [c.x1, c.y1, c.x2, c.y2, c.x, c.y] : c.type === "Q" ? [c.x1, c.y1, c.x, c.y] : [];
    if (!["M", "L", "C", "Q", "Z"].includes(c.type) || pts.some((v) => typeof v !== "number" || !Number.isFinite(v))) return null;
    out += c.type + pts.map((v) => round(v as number)).join(" ");
  }
  return out;
}
/**
 * Une ligne composée LETTRE PAR LETTRE (glyphe, avance, crénage de la police, espacement de la recette). La mise en
 * ligne « tout en un » de la bibliothèque abîme certains tracés (coordonnées manquantes) ou échoue sur les fonctions
 * typographiques de plusieurs polices du catalogue (constat du 12 novembre 2026 : Playfair Display, Fraunces, Nunito).
 */
function composeLine(font: OpenFont, text: string, x0: number, baseline: number, trackingEm: number): { d: string; width: number } {
  const scale = SIZE / font.unitsPerEm;
  let x = x0, d = "", prev: ReturnType<OpenFont["charToGlyph"]> | null = null;
  const chars = [...text];
  chars.forEach((ch, i) => {
    const g = font.charToGlyph(ch);
    if (prev) { let k = 0; try { k = font.getKerningValue(prev, g); } catch { k = 0; } if (Number.isFinite(k)) x += k * scale; }
    const part = pathData(g.getPath(x, baseline, SIZE).commands);
    if (part == null) throw new Error(`Tracé illisible pour « ${ch} » dans cette police`);
    d += part;
    x += (g.advanceWidth ?? font.unitsPerEm / 2) * scale + (i < chars.length - 1 ? trackingEm * SIZE : 0);
    prev = g;
  });
  return { d, width: x - x0 };
}
/**
 * Compose le nom : une ou plusieurs lignes dans la police de titres, espacement de la recette, point final et petit
 * signe éventuels. Rend des tracés (jamais de texte) : le même dessin sert à l'écran et en image.
 */
export function drawWordmark(name: string, recipe: Wordmark, headingHandle: string): DrawnWordmark {
  const handle = drawableHandle(name, headingHandle);
  const face = fontFace(handle);
  if (!face) throw new Error(`Police de titres inconnue : ${headingHandle}`);
  const font = loadFont(face.file);
  const lines = (recipe.lines?.length ? recipe.lines : [name.trim()]).map((l) => applyCase(l.trim(), recipe.case));
  const widths = lines.map((l) => composeLine(font, l, 0, 0, recipe.tracking).width);
  const ascent = (font.ascender / font.unitsPerEm) * SIZE, descent = (-font.descender / font.unitsPerEm) * SIZE;
  const lineHeight = (recipe.case === "upper" ? 0.98 : 1.08) * SIZE;
  const dotR = recipe.dot ? SIZE * 0.085 : 0;
  const textWidth = Math.max(...widths) + (recipe.dot ? dotR * 2.6 : 0);
  const sym = recipe.symbol, symSize = sym ? (recipe.symbolPlace === "dessus" ? SIZE * 1.1 : Math.min(SIZE * 1.15, lines.length * lineHeight)) : 0, gap = sym ? SIZE * 0.28 : 0;
  const above = !!sym && recipe.symbolPlace === "dessus";
  const pad = SIZE * 0.12;
  const left = pad + (sym && !above ? symSize + gap : 0), top = pad + (above ? symSize + gap : 0);
  const width = left + textWidth + pad, height = top + ascent + (lines.length - 1) * lineHeight + descent + pad;
  const shapes: DrawnShape[] = [];
  lines.forEach((l, i) => {
    const x = left + (recipe.align === "centre" ? (textWidth - (recipe.dot && i === lines.length - 1 ? dotR * 2.6 : 0) - widths[i]) / 2 : 0);
    const d = composeLine(font, l, x, top + ascent + i * lineHeight, recipe.tracking).d;
    if (d) shapes.push({ d, tone: "main", paint: "fill" });
    if (recipe.dot && i === lines.length - 1) {
      const cx = x + widths[i] + dotR * 1.5, cy = top + ascent + i * lineHeight - dotR;
      shapes.push({ d: `M${round(cx - dotR)} ${round(cy)}a${round(dotR)} ${round(dotR)} 0 1 0 ${round(dotR * 2)} 0a${round(dotR)} ${round(dotR)} 0 1 0 ${round(-dotR * 2)} 0Z`, tone: "accent", paint: "fill" });
    }
  });
  return { width: round(width), height: round(height), shapes, text: lines.join("\n"), family: face.family, ...(sym ? { symbol: placeSymbol(sym, above ? (width - symSize) / 2 : pad, above ? pad : (height - symSize) / 2, symSize) } : {}) };
}

const placeSymbol = (s: BoardSymbol, x: number, y: number, size: number): PlacedSymbol => ({ x: round(x), y: round(y), size: round(size), viewBox: s.viewBox, shapes: s.shapes });

const paintAttrs = (s: { paint: "fill" | "stroke"; tone: "main" | "accent"; width?: number; rule?: string }, main: string, accent: string) => {
  const c = s.tone === "accent" ? accent : main;
  return s.paint === "stroke" ? `fill="none" stroke="${c}" stroke-width="${s.width ?? 4}" stroke-linecap="round" stroke-linejoin="round"` : `fill="${c}"${s.rule ? ` fill-rule="${s.rule}"` : ""}`;
};

/** SVG du nom dessiné (tracés seuls, écrit par le Studio) dans les couleurs données. */
export function wordmarkSvg(w: DrawnWordmark, colors: { main: string; accent: string; background?: string }): string {
  const sym = w.symbol ? `<svg x="${w.symbol.x}" y="${w.symbol.y}" width="${w.symbol.size}" height="${w.symbol.size}" viewBox="${w.symbol.viewBox[0]} ${w.symbol.viewBox[1]} ${w.symbol.viewBox[2]} ${w.symbol.viewBox[2]}">${w.symbol.shapes.map((s) => `<path d="${s.d}" ${paintAttrs(s, colors.main, colors.accent)}/>`).join("")}</svg>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.width} ${w.height}" width="${w.width}" height="${w.height}">${colors.background ? `<rect width="100%" height="100%" fill="${colors.background}"/>` : ""}${sym}${w.shapes.map((s) => `<path d="${s.d}" ${paintAttrs(s, colors.main, colors.accent)}/>`).join("")}</svg>`;
}

/** Image du nom dessiné (fond transparent par défaut) : logo de secours et modèle remis au dessinateur du logo. */
export async function wordmarkPng(w: DrawnWordmark, colors: { main: string; accent: string; background?: string }, widthPx = 1600): Promise<Buffer> {
  return sharp(Buffer.from(wordmarkSvg(w, colors)), { density: Math.min(2400, Math.max(72, Math.round((72 * widthPx) / w.width))) }).resize({ width: widthPx }).png().toBuffer();
}
