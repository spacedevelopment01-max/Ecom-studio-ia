/**
 * Le nom dessiné en code (décision du propriétaire du 12 novembre 2026) : le Studio compose lui-même le nom de la
 * marque avec la VRAIE police de titres de l'identité, converti en tracés. Le nom est donc toujours exact à la lettre
 * (accents compris), sur la planche comme en image : c'est aussi le logo de secours, pour que le client finisse
 * toujours avec un logo.
 *
 * Le modèle ne fournit qu'une recette (`Wordmark`) : casse, espacement, mise en lignes, point final, petit signe, et
 * des GESTES de lettrage (retour du propriétaire après l'essai réel : « mieux travailler la base des logos ») : taille
 * et inclinaison de chaque ligne, mots en couleur d'accent, ligne ondulée qui coupe le nom, lettre remplacée par un
 * dessin, mots écrits à la main, trait à la main. Aucun dessin libre du nom, aucun texte du modèle sans passer par ici.
 */
import fs from "node:fs";
import * as opentypeModule from "opentype.js";
import sharp from "sharp";
import { fontFilePath } from "../theme/render";
import { artSvg, type Art } from "./brand-art";
import type { BoardSymbol, Wordmark } from "./brand-board";
import { fontFace } from "./identities";

// opentype.js 2 : exports nommés sous Next.js, export par défaut sous Node (voir `logo-v2/construct.ts`).
const opentypeExports: Record<string, unknown> = opentypeModule;
const parseFont = ("parse" in opentypeExports ? opentypeExports.parse : (opentypeExports["default"] as { parse?: unknown } | undefined)?.parse) as typeof opentypeModule.parse;

export type DrawnShape = { d: string; tone: "main" | "accent"; paint: "fill" | "stroke"; width?: number; rule?: "nonzero" | "evenodd"; transform?: string; /** Mots écrits à la main : retirés quand le nom est montré en petit. */ part?: "note" };
/** Petit signe posé avec le nom : gardé dans son propre repère, placé par une boîte (aucune transformation de tracé). */
export type PlacedSymbol = { x: number; y: number; size: number; viewBox: [number, number, number]; shapes: BoardSymbol["shapes"] };
/** Dessin placé dans le nom (lettre remplacée) : une boîte carrée et le dessin sûr. */
export type PlacedArt = { x: number; y: number; size: number; art: Art; transform?: string };
/** Dessin prêt à afficher : des tracés seuls, dans un cadre `width` × `height`. Les couleurs se choisissent à l'affichage. */
export type DrawnWordmark = {
  width: number; height: number; shapes: DrawnShape[]; text: string; family: string; symbol?: PlacedSymbol;
  /** Ligne qui coupe le nom : au-dessous de `y`, les lettres prennent la couleur d'accent ; `wave` est son tracé. */
  cut?: { y: number; wave: string };
  arts?: PlacedArt[];
  /** Cadre du nom sans les mots écrits à la main (illisibles en petit : bande d'un sachet, haut d'un site). */
  core?: { width: number; height: number };
};

type OpenFont = ReturnType<typeof parseFont>;
const fonts = new Map<string, OpenFont>();
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

/** Petits mots qui restent en minuscules dans un nom écrit « à l'anglaise » (« Plein les Yeux », jamais « Plein Les Yeux »). */
const SMALL_WORDS = new Set(["le", "la", "les", "de", "du", "des", "et", "à", "au", "aux", "en", "un", "une", "sur", "sous", "pour", "par", "dans", "chez", "ou"]);
const titleCase = (s: string) => s.replace(/(^|[\s'’-])(\p{L}+)/gu, (_m, a: string, w: string, at: number) => a + (at > 0 && a.trim() === "" && SMALL_WORDS.has(w.toLocaleLowerCase("fr-FR")) ? w.toLocaleLowerCase("fr-FR") : w.charAt(0).toLocaleUpperCase("fr-FR") + w.slice(1)));
const applyCase = (s: string, c: Wordmark["case"]) => (c === "upper" ? s.toLocaleUpperCase("fr-FR") : c === "lower" ? s.toLocaleLowerCase("fr-FR") : c === "title" ? titleCase(s) : s);
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
/** Police des mots écrits à la main (accents et signatures seulement). */
const NOTE_HANDLE = "caveat_n7";

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

type Piece = { d: string; accent: boolean };
/**
 * Une ligne composée LETTRE PAR LETTRE (glyphe, avance, crénage de la police, espacement de la recette), mot par mot
 * pour qu'un mot puisse prendre la couleur d'accent. La mise en ligne « tout en un » de la bibliothèque abîme certains
 * tracés ou échoue sur plusieurs polices du catalogue (constat du 12 novembre 2026 : Playfair Display, Fraunces, Nunito).
 * `swap` : la lettre de ce rang (compté sur tout le nom, espaces exclus) n'est pas tracée ; sa place est rendue.
 */
function composeLine(font: OpenFont, text: string, x0: number, baseline: number, size: number, trackingEm: number, o: { firstWord?: number; firstLetter?: number; accentWords?: Set<number>; swap?: number } = {}) {
  const scale = size / font.unitsPerEm;
  const capHeight = ((font.tables as { os2?: { sCapHeight?: number } }).os2?.sCapHeight || font.unitsPerEm * 0.7) * scale;
  let x = x0, prev: ReturnType<OpenFont["charToGlyph"]> | null = null, word = o.firstWord ?? 0, letter = o.firstLetter ?? 0;
  const pieces: Piece[] = [];
  let hole: { x: number; y: number; size: number } | null = null;
  const chars = [...text];
  chars.forEach((ch, i) => {
    if (!ch.trim()) { if (i > 0 && chars[i - 1].trim()) word++; }
    const g = font.charToGlyph(ch);
    if (prev) { let k = 0; try { k = font.getKerningValue(prev, g); } catch { k = 0; } if (Number.isFinite(k)) x += k * scale; }
    const advance = (g.advanceWidth ?? font.unitsPerEm / 2) * scale;
    if (ch.trim() && letter === o.swap) {
      // Lettre remplacée par un dessin : une boîte carrée à la hauteur des capitales, posée sur la ligne de base.
      const box = Math.max(capHeight, advance * 0.9);
      hole = { x, y: baseline - box, size: box };
      x += box + (i < chars.length - 1 ? trackingEm * size : 0);
      prev = null;
    } else {
      const part = pathData(g.getPath(x, baseline, size).commands);
      if (part == null) throw new Error(`Tracé illisible pour « ${ch} » dans cette police`);
      const accent = !!o.accentWords?.has(word);
      const lastPiece = pieces[pieces.length - 1];
      if (part) { if (lastPiece && lastPiece.accent === accent) lastPiece.d += part; else pieces.push({ d: part, accent }); }
      x += advance + (i < chars.length - 1 ? trackingEm * size : 0);
      prev = g;
    }
    if (ch.trim()) letter++;
  });
  return { pieces, width: x - x0, hole: hole as { x: number; y: number; size: number } | null, words: word + (chars.length && chars[chars.length - 1].trim() ? 1 : 0), letters: letter };
}

/** Ligne ondulée dessinée à la main (ligne d'eau, soulignement). */
function wave(x0: number, x1: number, y: number, amp: number, step: number): string {
  let d = `M${round(x0)} ${round(y)}`, x = x0, up = true;
  while (x < x1 - 0.01) { const nx = Math.min(x1, x + step); d += `Q${round((x + nx) / 2)} ${round(y + (up ? -amp : amp))} ${round(nx)} ${round(y)}`; x = nx; up = !up; }
  return d;
}

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const countLetters = (s: string) => [...s].filter((c) => c.trim()).length;

/**
 * Compose le nom : lignes dans la police de titres (taille et inclinaison par ligne), mots en couleur d'accent, lettre
 * remplacée par un dessin, point final, ligne qui coupe le nom, trait et mots à la main, petit signe. Rend des tracés
 * (jamais de texte) : le même dessin sert à l'écran et en image. Un réglage hors du nom est ignoré, jamais deviné.
 */
export function drawWordmark(name: string, recipe: Wordmark, headingHandle: string): DrawnWordmark {
  const handle = drawableHandle(name, headingHandle);
  const face = fontFace(handle);
  if (!face) throw new Error(`Police de titres inconnue : ${headingHandle}`);
  const font = loadFont(face.file);
  const lines = (recipe.lines?.length ? recipe.lines : [name.trim()]).map((l) => applyCase(l.trim(), recipe.case));
  const totalWords = lines.reduce((n, l) => n + countWords(l), 0), totalLetters = lines.reduce((n, l) => n + countLetters(l), 0);
  const accentWords = new Set((recipe.accentWords ?? []).filter((w) => w < totalWords));
  const swap = recipe.swap && recipe.swap.letter < totalLetters ? recipe.swap : undefined;
  const sizeOf = (i: number) => SIZE * (recipe.scale?.[i] ?? 1);
  const tiltOf = (i: number) => recipe.tilt?.[i] ?? 0;
  const lead = recipe.case === "upper" ? 0.98 : 1.08;
  // Première passe : largeurs (et rangs de mots et de lettres au début de chaque ligne).
  const starts: { word: number; letter: number }[] = [];
  let w0 = 0, l0 = 0;
  const widths = lines.map((l, i) => { starts.push({ word: w0, letter: l0 }); const r = composeLine(font, l, 0, 0, sizeOf(i), recipe.tracking, { firstWord: w0, firstLetter: l0, swap: swap?.letter }); w0 += countWords(l); l0 += countLetters(l); return r.width; });
  const ascentOf = (i: number) => (font.ascender / font.unitsPerEm) * sizeOf(i), descentOf = (i: number) => (-font.descender / font.unitsPerEm) * sizeOf(i);
  const dotR = recipe.dot ? sizeOf(lines.length - 1) * 0.085 : 0;
  const textWidth = Math.max(...widths.map((w, i) => w + (recipe.dot && i === lines.length - 1 ? dotR * 2.6 : 0)));
  const sym = recipe.symbol, above = !!sym && recipe.symbolPlace === "dessus";
  const blockHeight = lines.reduce((h, _l, i) => h + (i === 0 ? ascentOf(0) : sizeOf(i) * lead), 0) + descentOf(lines.length - 1);
  const symSize = sym ? (above ? SIZE * 1.1 : Math.min(SIZE * 1.15, blockHeight * 0.9)) : 0, gap = sym ? SIZE * 0.28 : 0;
  // Marge : un peu plus quand des lignes penchent (elles sortiraient du cadre).
  const maxTilt = Math.max(0, ...lines.map((_l, i) => Math.abs(tiltOf(i))));
  const pad = SIZE * (0.12 + maxTilt * 0.02);
  // Une ligne penchée sort de sa place : la première peut monter, la dernière descendre ; le cadre leur fait de la place.
  const sinOf = (i: number) => Math.sin((tiltOf(i) * Math.PI) / 180), lastLine = lines.length - 1;
  const rise = Math.max(0, -sinOf(0) * widths[0]), drop = Math.max(0, sinOf(lastLine) * widths[lastLine]);
  const left = pad + (sym && !above ? symSize + gap : 0), top = pad + rise + (above ? symSize + gap : 0);
  const shapes: DrawnShape[] = [], arts: PlacedArt[] = [];
  let baseline = top;
  lines.forEach((l, i) => {
    baseline += i === 0 ? ascentOf(0) : sizeOf(i) * lead;
    const extra = recipe.dot && i === lines.length - 1 ? dotR * 2.6 : 0;
    const x = left + (recipe.align === "centre" ? (textWidth - extra - widths[i]) / 2 : 0);
    const r = composeLine(font, l, x, baseline, sizeOf(i), recipe.tracking, { firstWord: starts[i].word, firstLetter: starts[i].letter, accentWords, swap: swap?.letter });
    const transform = tiltOf(i) ? `rotate(${round(tiltOf(i))} ${round(x)} ${round(baseline)})` : undefined;
    for (const p of r.pieces) shapes.push({ d: p.d, tone: p.accent ? "accent" : "main", paint: "fill", ...(transform ? { transform } : {}) });
    if (r.hole && swap) arts.push({ x: round(r.hole.x), y: round(r.hole.y), size: round(r.hole.size), art: swap.art, ...(transform ? { transform } : {}) });
    if (recipe.dot && i === lines.length - 1) {
      const cx = x + widths[i] + dotR * 1.5, cy = baseline - dotR;
      shapes.push({ d: `M${round(cx - dotR)} ${round(cy)}a${round(dotR)} ${round(dotR)} 0 1 0 ${round(dotR * 2)} 0a${round(dotR)} ${round(dotR)} 0 1 0 ${round(-dotR * 2)} 0Z`, tone: "accent", paint: "fill", ...(transform ? { transform } : {}) });
    }
  });
  let bottom = baseline + descentOf(lastLine) + drop;
  if (recipe.underline) {
    const y = baseline + drop + SIZE * 0.16;
    shapes.push({ d: wave(left, left + widths[lines.length - 1], y, SIZE * 0.05, SIZE * 0.42), tone: "accent", paint: "stroke", width: round(SIZE * 0.06) });
    bottom = Math.max(bottom, y + SIZE * 0.12);
  }
  let width = left + textWidth + pad;
  let core: { width: number; height: number } | undefined;
  if (recipe.note) {
    // Mots écrits à la main : sous le nom, un peu penchés, dans la couleur d'accent (toujours tracés par le Studio).
    const noteFace = fontFace(drawableHandle(recipe.note, NOTE_HANDLE));
    if (noteFace) {
      const nf = loadFont(noteFace.file), ns = SIZE * 0.46, y = bottom + ns * 0.62;
      const r = composeLine(nf, recipe.note.trim(), left + SIZE * 0.06, y, ns, 0);
      core = { width: round(width), height: round(bottom + pad) };
      for (const p of r.pieces) shapes.push({ d: p.d, tone: "accent", paint: "fill", transform: `rotate(-3 ${round(left)} ${round(y)})`, part: "note" });
      bottom = y + ns * 0.42;
      width = Math.max(width, left + SIZE * 0.06 + r.width + pad);
    }
  }
  const height = bottom + pad;
  const cutY = recipe.cut ? top + blockHeight * recipe.cut.at : null;
  return {
    width: round(width), height: round(height), shapes, text: lines.join("\n"), family: face.family,
    ...(sym ? { symbol: placeSymbol(sym, above ? (width - symSize) / 2 : pad, above ? pad : top + (blockHeight - symSize) / 2, symSize) } : {}),
    ...(cutY != null ? { cut: { y: round(cutY), wave: wave(pad * 0.4, width - pad * 0.4, cutY, SIZE * 0.035, SIZE * 0.5) } } : {}),
    ...(arts.length ? { arts } : {}),
    ...(core ? { core } : {}),
  };
}

const placeSymbol = (s: BoardSymbol, x: number, y: number, size: number): PlacedSymbol => ({ x: round(x), y: round(y), size: round(size), viewBox: s.viewBox, shapes: s.shapes });

const paintAttrs = (s: { paint: "fill" | "stroke"; tone: "main" | "accent"; width?: number; rule?: string; transform?: string }, main: string, accent: string) => {
  const c = s.tone === "accent" ? accent : main, t = s.transform ? ` transform="${s.transform}"` : "";
  return (s.paint === "stroke" ? `fill="none" stroke="${c}" stroke-width="${s.width ?? 4}" stroke-linecap="round" stroke-linejoin="round"` : `fill="${c}"${s.rule ? ` fill-rule="${s.rule}"` : ""}`) + t;
};

/** SVG du nom dessiné (tracés seuls, écrit par le Studio) dans les couleurs données. */
export function wordmarkSvg(w: DrawnWordmark, colors: { main: string; accent: string; background?: string }): string {
  const sym = w.symbol ? `<svg x="${w.symbol.x}" y="${w.symbol.y}" width="${w.symbol.size}" height="${w.symbol.size}" viewBox="${w.symbol.viewBox[0]} ${w.symbol.viewBox[1]} ${w.symbol.viewBox[2]} ${w.symbol.viewBox[2]}">${w.symbol.shapes.map((s) => `<path d="${s.d}" ${paintAttrs(s, colors.main, colors.accent)}/>`).join("")}</svg>` : "";
  const fills = w.shapes.filter((s) => s.paint === "fill"), strokes = w.shapes.filter((s) => s.paint === "stroke");
  const draw = (list: DrawnShape[], main: string, accent: string) => list.map((s) => `<path d="${s.d}" ${paintAttrs(s, main, accent)}/>`).join("");
  // Nom coupé par une ligne : le haut dans ses couleurs, le bas tout en couleur d'accent, la ligne par-dessus.
  const letters = w.cut
    ? `<defs><clipPath id="wm-haut"><rect x="0" y="0" width="${w.width}" height="${w.cut.y}"/></clipPath><clipPath id="wm-bas"><rect x="0" y="${w.cut.y}" width="${w.width}" height="${round(w.height - w.cut.y)}"/></clipPath></defs><g clip-path="url(#wm-haut)">${draw(fills, colors.main, colors.accent)}</g><g clip-path="url(#wm-bas)">${draw(fills, colors.accent, colors.accent)}</g><path d="${w.cut.wave}" fill="none" stroke="${colors.main}" stroke-width="3" stroke-linecap="round"/>`
    : draw(fills, colors.main, colors.accent);
  const arts = (w.arts ?? []).map((a, i) => `<g${a.transform ? ` transform="${a.transform}"` : ""}><svg x="${a.x}" y="${a.y}" width="${a.size}" height="${a.size}" viewBox="${a.art.box.join(" ")}" color="${colors.main}">${artSvg(a.art, { prefix: `wm${i}-` }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></g>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.width} ${w.height}" width="${w.width}" height="${w.height}">${colors.background ? `<rect width="100%" height="100%" fill="${colors.background}"/>` : ""}${sym}${letters}${arts}${draw(strokes, colors.main, colors.accent)}</svg>`;
}

/** Image du nom dessiné (fond transparent par défaut) : logo de secours et modèle remis au dessinateur du logo. */
export async function wordmarkPng(w: DrawnWordmark, colors: { main: string; accent: string; background?: string }, widthPx = 1600): Promise<Buffer> {
  return sharp(Buffer.from(wordmarkSvg(w, colors)), { density: Math.min(2400, Math.max(72, Math.round((72 * widthPx) / w.width))) }).resize({ width: widthPx }).png().toBuffer();
}
