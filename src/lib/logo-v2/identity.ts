/**
 * Identité tirée d'un LOGO COMPLET dessiné par l'IA d'images (sans IA, après le choix) : couleurs réellement
 * présentes dans le logo (codes HEX mesurés) → palette de la marque, et symbole seul découpé dans l'image originale
 * (favicon, avatar, tampon) au lieu d'une initiale générique construite par le studio.
 */
import sharp from "sharp";
import { contrast, hsl, hslToHex, isDark, luminance, rgbToHex, withLightness } from "../color";
import type { TextBox } from "./types";

type Palette = { primary: string; secondary: string; accent: string; light: string; dark: string };
export type Ink = { hex: string; share: number };

/** Saturation perçue (0 pour un gris, un noir ou un blanc). */
const vividness = (hex: string) => {
  const [, s, l] = hsl(hex);
  return s * (1 - Math.abs(2 * l - 1));
};

/**
 * Encres du logo : pixels opaques regroupés par couleur proche (le blanc du fond et les bords adoucis sont ignorés),
 * couleur MOYENNE réelle de chaque groupe, part de la surface dessinée. Les plus présentes d'abord.
 */
export async function artworkInks(png: Buffer, max = 5): Promise<Ink[]> {
  const { data } = await sharp(png).ensureAlpha().resize({ width: 400, height: 400, fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const groups: { r: number; g: number; b: number; n: number }[] = [];
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 230) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r > 236 && g > 236 && b > 236) continue;
    total++;
    let best = -1;
    let bestD = 40 * 40 * 3;
    for (const [k, c] of groups.entries()) {
      const d = (c.r / c.n - r) ** 2 + (c.g / c.n - g) ** 2 + (c.b / c.n - b) ** 2;
      if (d < bestD) (bestD = d), (best = k);
    }
    if (best < 0) groups.push({ r, g, b, n: 1 });
    else (groups[best].r += r), (groups[best].g += g), (groups[best].b += b), groups[best].n++;
  }
  if (!total) return [];
  return groups
    .filter((c) => c.n / total >= 0.03)
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((c) => ({ hex: rgbToHex([Math.round(c.r / c.n), Math.round(c.g / c.n), Math.round(c.b / c.n)]).toUpperCase(), share: Math.round((c.n / total) * 1000) / 1000 }));
}

/**
 * Palette de la marque tirée des encres du logo : la couleur principale (boutons, titres) est une couleur DU LOGO
 * lisible sur fond clair — la couleur franche du logo si elle l'est, sinon son encre sombre ; l'accent est l'autre
 * couleur du logo, exacte. Fond clair et fond sombre de la même famille. Null si le logo n'a pas d'encre exploitable.
 */
export function paletteFromInks(inks: Ink[]): Palette | null {
  if (!inks.length) return null;
  const darkInk = inks.filter((i) => isDark(i.hex) && contrast(i.hex, "#FFFFFF") >= 7)[0]?.hex ?? null;
  const vivid = inks.filter((i) => vividness(i.hex) >= 0.12).map((i) => i.hex);
  const readable = vivid.find((h) => contrast(h, "#FFFFFF") >= 4.5);
  const primary = readable ?? darkInk ?? withLightness(inks[0].hex, 0.3);
  const accent = vivid.find((h) => h !== primary) ?? (vivid[0] && vivid[0] !== primary ? vivid[0] : null) ?? primary;
  const ref = accent !== primary ? accent : primary;
  const [h, s] = hsl(ref);
  const dark = darkInk && luminance(darkInk) <= 0.03 ? darkInk : withLightness(darkInk ?? primary, 0.1);
  return {
    primary: primary.toUpperCase(),
    secondary: hslToHex(h, Math.min(0.35, s), 0.86).toUpperCase(),
    accent: accent.toUpperCase(),
    light: hslToHex(h, Math.min(0.3, s), 0.97).toUpperCase(),
    dark: dark.toUpperCase(),
  };
}

/** Bandes d'encre le long d'un axe (lignes ou colonnes), séparées par des vides d'au moins `gap` pixels. */
function bands(profile: number[], gap: number): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  let empty = 0;
  for (let i = 0; i < profile.length; i++) {
    if (profile[i] > 0) {
      if (start < 0) start = i;
      else if (empty >= gap) {
        out.push([start, i - empty - 1]);
        start = i;
      }
      empty = 0;
    } else if (start >= 0) empty++;
  }
  if (start >= 0) out.push([start, profile.length - 1 - empty]);
  return out;
}

/**
 * Symbole seul, découpé dans le logo complet (image nettoyée, fond transparent) : la zone au-dessus du nom (logo
 * empilé) ou à sa gauche (logo horizontal). Zone du nom relevée par la relecture si elle est connue, sinon bandes
 * d'encre : le symbole est la première bande, nettement plus haute que les lignes de texte. Null pour un logo sans
 * symbole distinct (logotype seul) : la version simplifiée du studio reste alors la marque réduite.
 * Rendu carré 1024 px, fond transparent, marges égales ; le dessin n'est pas retouché.
 */
export async function artworkSymbol(png: Buffer, box?: TextBox | null): Promise<Buffer | null> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const ink = (x: number, y: number) => data[(y * W + x) * 4 + 3] >= 128;
  let region: { left: number; top: number; width: number; height: number } | null = null;
  if (box && box.y > 0.25) region = { left: 0, top: 0, width: W, height: Math.floor(box.y * H) };
  else if (box && box.x > 0.2) region = { left: 0, top: 0, width: Math.floor(box.x * W), height: H };
  else {
    const rows = Array.from({ length: H }, (_, y) => {
      let n = 0;
      for (let x = 0; x < W; x++) if (ink(x, y)) n++;
      return n;
    });
    const rb = bands(rows, Math.max(4, Math.round(H * 0.012)));
    const inkH = rb.length ? rb[rb.length - 1][1] - rb[0][0] + 1 : 0;
    const hOf = (b: [number, number]) => b[1] - b[0] + 1;
    if (rb.length >= 2 && hOf(rb[0]) >= inkH * 0.4 && rb.slice(1).every((b) => hOf(rb[0]) >= hOf(b) * 1.6)) {
      region = { left: 0, top: rb[0][0], width: W, height: hOf(rb[0]) };
    } else {
      const cols = Array.from({ length: W }, (_, x) => {
        let n = 0;
        for (let y = 0; y < H; y++) if (ink(x, y)) n++;
        return n;
      });
      const cb = bands(cols, Math.max(6, Math.round(W * 0.03)));
      const colH = (b: [number, number]) => {
        let top = H;
        let bottom = 0;
        for (let x = b[0]; x <= b[1]; x++) for (let y = 0; y < H; y++) if (ink(x, y)) (top = Math.min(top, y)), (bottom = Math.max(bottom, y));
        return bottom - top + 1;
      };
      if (cb.length >= 2 && cb[0][1] - cb[0][0] + 1 <= W * 0.45 && cb.slice(1).every((b) => colH(cb[0]) >= colH(b) * 1.2)) region = { left: cb[0][0], top: 0, width: cb[0][1] - cb[0][0] + 1, height: H };
    }
  }
  if (!region || region.width < 8 || region.height < 8) return null;
  const crop = await sharp(png).extract(region).png().toBuffer();
  const trimmed = await sharp(crop).trim({ threshold: 5 }).png().toBuffer().catch(() => null);
  if (!trimmed) return null;
  const m = await sharp(trimmed).metadata();
  // Trop petit par rapport au logo : ce n'est pas un symbole (accent, filet, point).
  if ((m.width ?? 0) * (m.height ?? 0) < W * H * 0.06) return null;
  const side = Math.round(Math.max(m.width!, m.height!) * 1.16);
  const square = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: trimmed, gravity: "center" }]).png().toBuffer();
  return sharp(square).resize(1024, 1024).png().toBuffer();
}

/** Favicon (192 px) tiré du symbole : même dessin, marges réduites. */
export async function symbolFavicon(symbol: Buffer): Promise<Buffer> {
  return sharp(symbol).resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

/**
 * Forme de remplissage, pas un logo : le symbole (hors nom) n'est qu'UNE forme géométrique de base pleine, d'une seule
 * couleur, sans détail (disque, carré, triangle…). Mesuré sans IA : un seul aplat, une seule pièce, et sa surface
 * remplit presque toute son enveloppe convexe. Un monogramme, une illustration, une forme découpée ou texturée ne
 * sont jamais concernés (liberté du style intacte).
 */
export async function isPlaceholderShape(png: Buffer, box?: TextBox | null): Promise<boolean> {
  const sym = await artworkSymbol(png, box);
  if (!sym) return false;
  const S = 128;
  const { data } = await sharp(sym).resize(S, S, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const inked: [number, number][] = [];
  const cols = new Map<string, number>();
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      if (data[i + 3] < 128) continue;
      inked.push([x, y]);
      const k = `${data[i] >> 5},${data[i + 1] >> 5},${data[i + 2] >> 5}`;
      cols.set(k, (cols.get(k) ?? 0) + 1);
    }
  if (inked.length < 50) return false;
  // Une seule couleur (95 % de l'encre dans une teinte quantifiée).
  if (Math.max(...cols.values()) / inked.length < 0.95) return false;
  // Une seule pièce.
  const on = new Uint8Array(S * S);
  for (const [x, y] of inked) on[y * S + x] = 1;
  const seen = new Uint8Array(S * S);
  const stack = [inked[0][1] * S + inked[0][0]];
  seen[stack[0]] = 1;
  let reached = 0;
  while (stack.length) {
    const p = stack.pop()!;
    reached++;
    const x = p % S;
    const y = (p / S) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
      const q = ny * S + nx;
      if (on[q] && !seen[q]) (seen[q] = 1), stack.push(q);
    }
  }
  if (reached < inked.length * 0.98) return false;
  // Pleine : surface ≥ 96 % de l'enveloppe convexe (aucune découpe, aucun creux, aucune lettre).
  const pts = [...inked].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const h: [number, number][] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    return h;
  };
  const lower = half(pts);
  const upper = half([...pts].reverse());
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  let area2 = 0;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i];
    const [x2, y2] = hull[(i + 1) % hull.length];
    area2 += x1 * y2 - x2 * y1;
  }
  const hullArea = Math.abs(area2) / 2 + hull.length / 2 + 1; // pixels du bord compris
  return inked.length / hullArea >= 0.96;
}

/** Empreinte visuelle (64 bits) d'un logo : deux images quasi identiques ont des empreintes très proches. */
export async function visualHash(png: Buffer): Promise<string> {
  const { data } = await sharp(png).flatten({ background: "#FFFFFF" }).resize(9, 8, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
  return bits;
}
export const hashDistance = (a: string, b: string) => [...a].reduce((n, c, i) => n + (c !== b[i] ? 1 : 0), 0);
/** Seuil : au plus 4 bits différents sur 64 = même dessin (recadrage ou compression près). */
export const SAME_LOGO_BITS = 4;
