/**
 * Planche d'identité de marque « comme en agence » (références AUREVO, LUXORA, VELLUM & CO., AURA BOTANICA…) :
 * une seule grille où TOUT vient du même système — logo principal, logo secondaire empilé, sceau rond, couleurs
 * nommées avec leurs codes, duo typographique, jeu d'icônes au trait, motif tiré du symbole, et applications
 * (papeterie, sac ou produit, profil Instagram, site sur ordinateur). Rendu local (Skia), sans IA.
 *
 * Ligne directrice de cohésion (appliquée ici et rappelée dans `BRAND_RULES`) :
 * 1. une couleur d'ancrage sombre, une couleur de marque, un accent, deux neutres clairs — jamais plus de cinq ;
 * 2. deux familles de polices seulement : une pour les titres, une pour les textes ;
 * 3. le symbole est la signature : il revient dans le sceau, le motif, l'avatar, la carte de visite ;
 * 4. icônes d'un seul style (trait fin, angles arrondis, même épaisseur) ;
 * 5. beaucoup d'air, alignements nets, ombres douces, aucun effet gratuit ;
 * 6. aucune donnée inventée (pas de chiffres, d'abonnés ni d'avis sur les maquettes).
 */
import sharp from "sharp";
import { createCanvas, loadImage, Path2D, type Canvas, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { contrast, distinctColors, hsl, isDark, luminance, mix, onColor } from "../color";
import { ensureFonts, font } from "./fonts";
import { iconOutlinePath } from "./icon-library";
import { C, contentLang } from "../i18n-server";

export const BRAND_RULES = [
  "Une couleur d'ancrage sombre, une couleur de marque, un accent et deux neutres clairs : cinq couleurs au plus.",
  "Deux familles de polices : une pour les titres, une pour les textes.",
  "Le symbole est la signature : il revient dans le sceau, le motif, l'avatar et la papeterie.",
  "Des icônes d'un seul style : trait fin, angles arrondis, même épaisseur.",
  "De l'air, des alignements nets, des ombres douces ; aucun effet gratuit.",
  "Rien d'inventé sur les maquettes : ni chiffres, ni abonnés, ni avis.",
];

export type IdentityBoardInput = {
  name: string;
  tagline?: string | null;
  business: "products" | "services";
  /** Logo principal (fond transparent). */
  logo: Buffer;
  /** Symbole seul (fond transparent), facultatif. */
  mark?: Buffer | null;
  palette: { primary: string; secondary: string; accent: string; light: string; dark: string };
  fonts: { heading: string; body: string; headingWeight?: number };
  /** Noms d'icônes (Tabler, version au trait) : métier d'abord. */
  icons: string[];
  /** Vraies photos du projet (profil Instagram, site) ; jamais d'images de démonstration. */
  photos?: Buffer[];
  /** Produit détouré (produits) : posé sur un socle à côté du sac. */
  product?: Buffer | null;
  year?: number;
};

const W = 2400, P = 56, G = 20;

type Ctx = SKRSContext2D;

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function contain(ctx: Ctx, img: Image | Canvas | null | undefined, x: number, y: number, w: number, h: number) {
  if (!img) return;
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Comme `contain`, mais l'image est POSÉE sur le bas du cadre (produit sur son socle, jamais en l'air). */
export function containBottom(ctx: Ctx, img: Image | null | undefined, x: number, y: number, w: number, h: number) {
  if (!img) return;
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + h - dh, dw, dh);
}

function cover(ctx: Ctx, img: Image, x: number, y: number, w: number, h: number, r = 0) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

/**
 * Logo ou symbole sans transparence (fond blanc) : le fond clair est rendu transparent, sinon les versions d'une
 * seule teinte (blanc sur couleur, ton sur ton) deviendraient un simple carré.
 */
export async function knockoutWhite(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 250) opaque++;
  if (opaque < (data.length / 4) * 0.97) return buf;
  for (let i = 0; i < data.length; i += 4) {
    const m = Math.min(data[i], data[i + 1], data[i + 2]);
    if (m > 235) data[i + 3] = Math.max(0, Math.round(255 - (m - 235) * 12.75));
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/**
 * Symbole « plein et détaillé » (écusson, emblème avec chiffres ou dessin intérieur) : recoloré d'une seule teinte,
 * il deviendrait une tache sans détail (constaté : l'écusson des Tribunes). Mesure : part couverte de son cadre et
 * contraste intérieur. Un symbole au trait (fleur, arbre stylisé) reste recolorable.
 */
export async function isDetailedSolidMark(buf: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buf).ensureAlpha().resize({ width: 200, height: 200, fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 128) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  if (maxX < 0) return false;
  let opaque = 0, sum = 0, sum2 = 0;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] <= 128) continue;
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    opaque++; sum += l; sum2 += l * l;
  }
  const coverage = opaque / ((maxX - minX + 1) * (maxY - minY + 1));
  const sd = Math.sqrt(Math.max(0, sum2 / opaque - (sum / opaque) ** 2));
  return coverage > 0.55 && sd > 28;
}
/** Symboles à garder dans leurs couleurs (voir isDetailedSolidMark). */
const KEEP_COLORS = new WeakSet<object>();

/** Image recolorée d'une seule teinte (logo blanc sur couleur, symbole ton sur ton). */
function tint(img: Image | null | undefined, color: string): Canvas | null {
  if (!img) return null;
  const c = createCanvas(img.width, img.height);
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, img.width, img.height);
  return c;
}

function shadow(ctx: Ctx, blur = 40, y = 18, a = 0.18) {
  ctx.shadowColor = `rgba(20,16,12,${a})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = y;
  ctx.shadowOffsetX = 0;
}
function noShadow(ctx: Ctx) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/** Texte espacé (petites capitales des étiquettes). */
function spaced(ctx: Ctx, s: string, x: number, y: number, track: number, align: "left" | "center" | "right" = "left") {
  const chars = [...s];
  const w = chars.reduce((a, ch) => a + ctx.measureText(ch).width + track, -track);
  let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.textAlign = "left";
  for (const ch of chars) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + track;
  }
  return w;
}

function fitText(ctx: Ctx, s: string, family: string, weight: number, max: number, maxW: number, min = 12) {
  let size = max;
  ctx.font = font(family, weight, size);
  while (ctx.measureText(s).width > maxW && size > min) {
    size -= 2;
    ctx.font = font(family, weight, size);
  }
  return size;
}

function wrap(ctx: Ctx, text: string, maxW: number, maxLines = 3): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  if (out.length > maxLines) {
    const kept = out.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s,.;:]+$/, "")}…`;
    return kept;
  }
  return out;
}

/** Initiale(s) de la marque, quand il n'y a pas de symbole. */
const initials = (name: string) => (name.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join("") || name.slice(0, 1)).toLocaleUpperCase("fr-FR");

/** Symbole (ou monogramme) dessiné centré dans un carré, d'une seule couleur. */
function drawMark(ctx: Ctx, mark: Image | null, b: IdentityBoardInput, cx: number, cy: number, size: number, color: string) {
  if (mark) {
    contain(ctx, KEEP_COLORS.has(mark) ? mark : tint(mark, color), cx - size / 2, cy - size / 2, size, size);
    return;
  }
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  const s = fitText(ctx, initials(b.name), b.fonts.heading, b.fonts.headingWeight ?? 600, size * 0.9, size * 0.95);
  ctx.font = font(b.fonts.heading, b.fonts.headingWeight ?? 600, s);
  ctx.textAlign = "center";
  ctx.fillText(initials(b.name), cx, cy + s * 0.04);
  ctx.textBaseline = "alphabetic";
}

/** Sceau rond : nom de la marque répété en couronne, symbole au centre. */
function drawSeal(ctx: Ctx, mark: Image | null, b: IdentityBoardInput, cx: number, cy: number, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.018);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.008);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.64, 0, Math.PI * 2);
  ctx.stroke();
  const ring = `${b.name.toLocaleUpperCase("fr-FR")} · ${(b.tagline || C("Maison", "House")).toLocaleUpperCase("fr-FR")} · `;
  const size = r * 0.13;
  ctx.font = font(b.fonts.body, 500, size);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const rad = r * 0.82;
  const text = ring.length * size * 0.62 > Math.PI * 2 * rad ? `${b.name.toLocaleUpperCase("fr-FR")} · ` : ring;
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width + size * 0.28);
  const total = widths.reduce((a, w) => a + w, 0);
  // Couronne complète : le texte est répété tant qu'il tient, espacé régulièrement.
  const reps = Math.max(1, Math.floor((Math.PI * 2 * rad) / total));
  const step = (Math.PI * 2) / (total * reps);
  let a = -Math.PI / 2;
  for (let k = 0; k < reps; k++)
    chars.forEach((ch, i) => {
      const half = (widths[i] / 2) * step;
      a += half;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      a += half;
    });
  ctx.textBaseline = "alphabetic";
  drawMark(ctx, mark, b, cx, cy, r * 0.78, color);
}

function label(ctx: Ctx, s: string, x: number, y: number, color: string, family: string, align: "left" | "center" | "right" = "left") {
  ctx.font = font(family, 500, 15);
  ctx.fillStyle = color;
  spaced(ctx, s.toLocaleUpperCase(contentLang() === "en" ? "en-US" : "fr-FR"), x, y, 3, align);
}

function icon(ctx: Ctx, name: string, cx: number, cy: number, size: number, color: string, weight = 1.4) {
  const d = iconOutlinePath(name);
  if (!d) return false;
  const s = size / 24;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(d));
  ctx.restore();
  return true;
}

/**
 * Nom évocateur d'une couleur de marque (« Vert sapin », « Or doux », « Sable »), comme sur les planches d'agence.
 * Purement descriptif : aucune référence de nuancier n'est inventée.
 */
export function brandColorName(hex: string, lang: "fr" | "en" = "fr"): string {
  const [h, s, l] = hsl(hex);
  const en = lang === "en";
  const pick = (fr: [string, string, string], eng: [string, string, string]) => (en ? eng : fr)[l < 0.32 ? 0 : l < 0.68 ? 1 : 2];
  const warm = h >= 15 && h < 60;
  if (s < 0.12 || l < 0.16 || l > 0.96) {
    if (l < 0.12) return en ? "Ink black" : "Noir d'encre";
    if (l < 0.3) return en ? "Charcoal" : "Anthracite";
    if (l < 0.55) return en ? "Slate grey" : "Gris ardoise";
    if (l < 0.85) return en ? "Pearl grey" : "Gris perle";
    return warm || l < 0.97 ? (en ? "Cream" : "Crème") : en ? "White" : "Blanc";
  }
  if (warm && s < 0.5 && l >= 0.38 && l < 0.66 && h >= 28 && h < 50) return en ? "Soft gold" : "Or doux";
  if (warm && s < 0.45) return l > 0.86 ? (en ? "Cream" : "Crème") : pick(["Brun chocolat", "Taupe", "Sable"], ["Chocolate", "Taupe", "Sand"]);
  if (h < 15 || h >= 345) return pick(["Bordeaux", "Rouge", "Rose poudré"], ["Burgundy", "Red", "Powder pink"]);
  if (h >= 320) return pick(["Prune", "Framboise", "Rose pâle"], ["Plum", "Raspberry", "Pale pink"]);
  if (h < 40) return pick(["Rouille", "Terracotta", "Pêche"], ["Rust", "Terracotta", "Peach"]);
  if (h < 70) return pick(["Olive", "Moutarde", "Vanille"], ["Olive", "Mustard", "Vanilla"]);
  if (h < 160) return s < 0.35 ? pick(["Vert forêt", "Sauge", "Vert tilleul"], ["Forest green", "Sage", "Lime blossom"]) : pick(["Vert forêt", "Vert", "Vert d'eau"], ["Forest green", "Green", "Mint"]);
  if (h < 195) return pick(["Vert sapin", "Bleu canard", "Céladon"], ["Pine green", "Teal", "Celadon"]);
  if (h < 245) return pick(["Bleu nuit", "Bleu", "Bleu ciel"], ["Midnight blue", "Blue", "Sky blue"]);
  return pick(["Aubergine", "Violet", "Lilas"], ["Aubergine", "Violet", "Lilac"]);
}

/**
 * Noms des couleurs de la planche, chacun une seule fois : deux couleurs proches qui recevraient le même nom
 * (« Crème » et « Crème ») sont distinguées par leur clarté (« Crème clair »), jamais affichées deux fois pareil.
 */
export function uniqueColorNames(hexes: string[], lang: "fr" | "en" = "fr"): string[] {
  const out: string[] = [];
  hexes.forEach((hex, i) => {
    const base = brandColorName(hex, lang);
    let name = base;
    const twin = hexes.findIndex((h, j) => j < i && brandColorName(h, lang) === base);
    if (twin >= 0) {
      const lighter = hsl(hex)[2] >= hsl(hexes[twin])[2];
      name = lang === "en" ? `${lighter ? "Light" : "Deep"} ${base.toLowerCase()}` : `${base} ${lighter ? "clair" : "profond"}`;
    }
    for (let k = 2; out.includes(name); k++) name = `${base} ${k}`;
    out.push(name);
  });
  return out;
}

/**
 * Nuancier de la planche : ancrage sombre, marque, second ton, accent, neutre clair — cinq au plus, SANS DOUBLON
 * (une marque dont la couleur principale est aussi la couleur sombre, comme ARVEN, n'a pas deux fois son anthracite).
 */
export function boardSwatches(col: ReturnType<typeof boardColors>): string[] {
  return distinctColors([col.ink, col.brand, col.second, col.accent, col.cream]).slice(0, 5);
}

/** Rôles de couleur de la planche (ancrage sombre, marque, accent, neutres). */
export function boardColors(pal: IdentityBoardInput["palette"]) {
  const ink = isDark(pal.dark) ? pal.dark : "#1C1A17";
  const cream = luminance(pal.light) > 0.75 ? pal.light : "#F5F1EA";
  const brand = contrast(pal.primary, cream) >= 1.6 ? pal.primary : mix(pal.primary, ink, 0.45);
  const second = pal.secondary && contrast(pal.secondary, brand) > 1.2 ? pal.secondary : mix(brand, cream, 0.55);
  const accent = pal.accent || mix(brand, "#C9A86A", 0.5);
  const paper = mix(cream, "#FFFFFF", 0.55);
  return { ink, cream, brand, second, accent, paper };
}

/**
 * Grille du téléphone (réseaux sociaux) : chaque photo n'y figure QU'UNE fois (jamais la même image répétée) ;
 * la case du milieu de chaque ligne et les cases restantes sont des tuiles aux couleurs de la marque.
 * Renvoie, pour chaque case, l'index de la photo ou null (tuile de marque).
 */
export function phoneGridPlan(cells: number, photos: number): (number | null)[] {
  let used = 0;
  return Array.from({ length: cells }, (_, i) => (i % 3 !== 1 && used < photos ? used++ : null));
}

/**
 * Cases aux couleurs de la marque dans la grille du téléphone (dans l'ordre où elles apparaissent) : le slogan n'y
 * est écrit qu'UNE fois, les autres portent le symbole, sur des fonds qui alternent sans deux identiques de suite.
 */
export function phoneBrandTiles(count: number, colors: string[], hasTagline: boolean): { kind: "tagline" | "mark"; bg: string }[] {
  const bgs = distinctColors(colors);
  return Array.from({ length: count }, (_, k) => ({ kind: k === 0 && hasTagline ? "tagline" : "mark", bg: bgs[k % Math.max(1, bgs.length)] ?? colors[0] }));
}

export async function renderIdentityBoard(b: IdentityBoardInput): Promise<Buffer> {
  ensureFonts();
  const col = boardColors(b.palette);
  const HF = b.fonts.heading, BF = b.fonts.body, HW = b.fonts.headingWeight ?? 600;
  const logo = await loadImage(await knockoutWhite(b.logo));
  const markBuf = b.mark ? await knockoutWhite(b.mark) : null;
  const mark = markBuf ? await loadImage(markBuf) : null;
  if (mark && markBuf && (await isDetailedSolidMark(markBuf))) KEEP_COLORS.add(mark);
  const photos: Image[] = [];
  for (const p of (b.photos ?? []).slice(0, 8)) photos.push(await loadImage(p).catch(() => null as unknown as Image));
  const pics = photos.filter(Boolean);
  // Produit détouré, marges transparentes retirées : il repose vraiment sur son socle.
  const product = b.product ? await loadImage(await sharp(b.product).trim({ threshold: 1 }).png().toBuffer().catch(() => b.product!)).catch(() => null) : null;
  const tagline = (b.tagline ?? "").replace(/[.\s]+$/, "");

  const HEAD = 120, RA = 560, RB = 500, RC = 640;
  const H = P + HEAD + RA + G + RB + G + RC + P;
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = mix(col.cream, "#FFFFFF", 0.25);
  ctx.fillRect(0, 0, W, H);
  const IW = W - P * 2;

  // En-tête : nom, « Identité de marque », signature.
  ctx.fillStyle = col.ink;
  ctx.font = font(BF, 600, 18);
  spaced(ctx, C("IDENTITÉ DE MARQUE", "BRAND IDENTITY"), P, P + 34, 5);
  const ns = fitText(ctx, b.name, HF, HW, 64, 1100);
  ctx.font = font(HF, HW, ns);
  ctx.textAlign = "left";
  ctx.fillText(b.name, P, P + 100);
  if (tagline) {
    ctx.fillStyle = mix(col.ink, col.cream, 0.35);
    const ts = fitText(ctx, tagline, HF, 400, 34, 1000);
    ctx.font = font(HF, 400, ts);
    ctx.textAlign = "right";
    ctx.fillText(tagline, W - P, P + 100);
  }
  ctx.fillStyle = mix(col.ink, col.cream, 0.5);
  ctx.font = font(BF, 500, 16);
  spaced(ctx, `${C("Système visuel", "Visual system")} · ${b.year ?? new Date().getFullYear()}`, W - P, P + 34, 4, "right");

  // ── Ligne A : logo principal, logo secondaire (empilé), sceau.
  let y = P + HEAD;
  const a1 = Math.round(IW * 0.43), a2 = Math.round(IW * 0.29), a3 = IW - a1 - a2 - G * 2;
  rr(ctx, P, y, a1, RA, 8, col.paper);
  contain(ctx, logo, P + a1 * 0.14, y + RA * 0.2, a1 * 0.72, RA * 0.52);
  label(ctx, C("Logo principal", "Primary logo"), P + 32, y + RA - 30, mix(col.ink, col.paper, 0.45), BF);
  // Zone de protection discrète (repères d'angle).
  ctx.strokeStyle = mix(col.ink, col.paper, 0.75);
  ctx.lineWidth = 1.5;
  for (const [x0, y0, dx, dy] of [[P + 40, y + 40, 1, 1], [P + a1 - 40, y + 40, -1, 1], [P + 40, y + RA - 70, 1, -1], [P + a1 - 40, y + RA - 70, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 26 * dy);
    ctx.lineTo(x0, y0);
    ctx.lineTo(x0 + 26 * dx, y0);
    ctx.stroke();
  }

  const x2 = P + a1 + G;
  rr(ctx, x2, y, a2, RA, 8, col.brand);
  const onBrand = onColor(col.brand, col.ink, "#FFFFFF");
  // Logo secondaire : symbole au-dessus du nom composé dans la police des titres, signature espacée.
  drawMark(ctx, mark, b, x2 + a2 / 2, y + RA * 0.36, Math.min(a2 * 0.34, 170), onBrand);
  ctx.fillStyle = onBrand;
  const s2 = fitText(ctx, b.name.toLocaleUpperCase("fr-FR"), HF, HW, 54, a2 * 0.8);
  ctx.font = font(HF, HW, s2);
  spaced(ctx, b.name.toLocaleUpperCase("fr-FR"), x2 + a2 / 2, y + RA * 0.36 + Math.min(a2 * 0.34, 170) / 2 + s2 + 30, s2 * 0.12, "center");
  if (tagline) {
    ctx.font = font(BF, 500, 15);
    ctx.fillStyle = mix(onBrand, col.brand, 0.2);
    spaced(ctx, tagline.toLocaleUpperCase("fr-FR").slice(0, 38), x2 + a2 / 2, y + RA * 0.36 + Math.min(a2 * 0.34, 170) / 2 + s2 + 72, 3.5, "center");
  }
  label(ctx, C("Logo secondaire", "Secondary logo"), x2 + 32, y + RA - 30, mix(onBrand, col.brand, 0.35), BF);

  const x3 = x2 + a2 + G;
  rr(ctx, x3, y, a3, RA, 8, col.ink);
  const sealC = mix(col.accent, col.cream, isDark(col.accent) ? 0.55 : 0.1);
  drawSeal(ctx, mark, b, x3 + a3 / 2, y + RA * 0.46, Math.min(a3, RA) * 0.33, sealC);
  label(ctx, C("Sceau · monogramme", "Submark · monogram"), x3 + 32, y + RA - 30, mix(col.cream, col.ink, 0.45), BF);

  // ── Ligne B : couleurs, typographies, icônes, motif.
  y += RA + G;
  const b1 = Math.round(IW * 0.33), b2 = Math.round(IW * 0.26), b3 = Math.round(IW * 0.19), b4 = IW - b1 - b2 - b3 - G * 3;
  const lang = contentLang() === "en" ? "en" : "fr";
  const swatches = boardSwatches(col);
  const names = uniqueColorNames(swatches, lang);
  const sw = b1 / swatches.length;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(P, y, b1, RB, 8);
  ctx.clip();
  swatches.forEach((hex, i) => {
    ctx.fillStyle = hex;
    ctx.fillRect(P + i * sw, y, sw + 1, RB);
    const on = onColor(hex, col.ink, "#FFFFFF");
    ctx.save();
    ctx.translate(P + i * sw + 30, y + RB - 34);
    ctx.fillStyle = on;
    ctx.font = font(BF, 600, 15);
    ctx.fillText(hex.toUpperCase(), 0, 0);
    ctx.rotate(-Math.PI / 2);
    ctx.font = font(HF, HW, 26);
    ctx.fillText(names[i], 30, 0);
    ctx.restore();
  });
  ctx.restore();

  const xb2 = P + b1 + G;
  rr(ctx, xb2, y, b2, RB, 8, col.paper);
  ctx.fillStyle = col.ink;
  ctx.font = font(HF, HW, 150);
  ctx.textAlign = "left";
  ctx.fillText("Aa", xb2 + 34, y + 170);
  ctx.font = font(HF, HW, 28);
  ctx.fillText(HF, xb2 + 34, y + 222);
  ctx.font = font(BF, 400, 17);
  ctx.fillStyle = mix(col.ink, col.paper, 0.4);
  ctx.fillText(C("Titres", "Headings"), xb2 + 34, y + 250);
  ctx.fillStyle = col.ink;
  ctx.font = font(BF, 500, 64);
  ctx.fillText("Aa", xb2 + 34, y + 345);
  ctx.font = font(BF, 600, 22);
  ctx.fillText(BF, xb2 + 140, y + 318);
  ctx.font = font(BF, 400, 17);
  ctx.fillStyle = mix(col.ink, col.paper, 0.4);
  ctx.fillText(C("Textes", "Body text"), xb2 + 140, y + 344);
  ctx.fillStyle = col.ink;
  ctx.font = font(BF, 400, 19);
  ctx.fillText("ABCDEFGHIJKLMNOPQRSTUVWXYZ", xb2 + 34, y + 400);
  ctx.fillText("abcdefghijklmnopqrstuvwxyz  0123456789", xb2 + 34, y + 430);
  label(ctx, C("Typographies", "Typography"), xb2 + 34, y + RB - 30, mix(col.ink, col.paper, 0.45), BF);

  const xb3 = xb2 + b2 + G;
  rr(ctx, xb3, y, b3, RB, 8, mix(col.cream, col.second, 0.18));
  const icons = b.icons.filter((n) => iconOutlinePath(n)).slice(0, 6);
  const cw = b3 / 2, ch = (RB - 80) / 3;
  icons.forEach((n, i) => {
    const cx = xb3 + cw * (i % 2) + cw / 2, cy = y + 30 + ch * Math.floor(i / 2) + ch / 2;
    ctx.fillStyle = mix(col.paper, "#FFFFFF", 0.5);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(cw, ch) * 0.36, 0, Math.PI * 2);
    ctx.fill();
    icon(ctx, n, cx, cy, Math.min(cw, ch) * 0.36, col.ink, 1.3);
  });
  label(ctx, C("Icônes", "Icons"), xb3 + 30, y + RB - 30, mix(col.ink, col.cream, 0.45), BF);

  const xb4 = xb3 + b3 + G;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(xb4, y, b4, RB, 8);
  ctx.clip();
  ctx.fillStyle = col.second;
  ctx.fillRect(xb4, y, b4, RB);
  const tone = mix(col.second, onColor(col.second, col.ink, "#FFFFFF"), 0.22);
  const step = 96;
  for (let r = 0, yy = y - 20; yy < y + RB + step; r++, yy += step * 0.75)
    for (let xx = xb4 - 20 + (r % 2 ? step / 2 : 0); xx < xb4 + b4 + step; xx += step) drawMark(ctx, mark, b, xx, yy, 44, tone);
  ctx.restore();
  rr(ctx, xb4 + 26, y + RB - 58, 110, 36, 18, mix(col.second, col.ink, 0.25));
  label(ctx, C("Motif", "Pattern"), xb4 + 81, y + RB - 34, onColor(mix(col.second, col.ink, 0.25), col.ink, "#FFFFFF"), BF, "center");

  // ── Ligne C : applications.
  y += RB + G;
  const c1 = Math.round(IW * 0.32), c2 = Math.round(IW * 0.2), c3 = Math.round(IW * 0.18), c4 = IW - c1 - c2 - c3 - G * 3;
  // Papeterie : enveloppe, papier à en-tête, deux cartes de visite.
  rr(ctx, P, y, c1, RC, 8, mix(col.cream, col.ink, 0.06));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(P, y, c1, RC, 8);
  ctx.clip();
  // Enveloppe.
  shadow(ctx);
  const ex = P + c1 * 0.08, ey = y + RC * 0.6, ew = c1 * 0.5, eh = ew * 0.5;
  rr(ctx, ex, ey, ew, eh, 4, col.brand);
  noShadow(ctx);
  ctx.strokeStyle = mix(col.brand, col.ink, 0.2);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex + ew / 2, ey + eh * 0.55);
  ctx.lineTo(ex + ew, ey);
  ctx.stroke();
  drawMark(ctx, mark, b, ex + ew / 2, ey + eh * 0.55, 34, mix(col.accent, col.cream, 0.2));
  // Papier à en-tête.
  shadow(ctx);
  const lx = P + c1 * 0.42, ly = y + RC * 0.08, lw = c1 * 0.42, lh = lw * 1.414;
  rr(ctx, lx, ly, lw, lh, 3, "#FFFFFF");
  noShadow(ctx);
  contain(ctx, logo, lx + lw * 0.5, ly + lh * 0.05, lw * 0.4, lh * 0.08);
  ctx.fillStyle = "#E7E3DC";
  for (let i = 0; i < 9; i++) ctx.fillRect(lx + lw * 0.1, ly + lh * 0.24 + i * lh * 0.05, lw * (i % 3 === 2 ? 0.5 : 0.8), 5);
  ctx.fillStyle = col.brand;
  ctx.fillRect(lx, ly + lh - 10, lw, 10);
  // Cartes de visite : recto foncé (sceau), verso clair (nom).
  const cwid = c1 * 0.42, chei = cwid * 0.58;
  ctx.save();
  ctx.translate(P + c1 * 0.12, y + RC * 0.12);
  ctx.rotate(-0.08);
  shadow(ctx, 30, 14, 0.25);
  rr(ctx, 0, 0, cwid, chei, 6, col.ink);
  noShadow(ctx);
  drawMark(ctx, mark, b, cwid / 2, chei / 2, chei * 0.42, sealC);
  ctx.restore();
  ctx.save();
  ctx.translate(P + c1 * 0.06, y + RC * 0.36);
  ctx.rotate(0.05);
  shadow(ctx, 30, 14, 0.22);
  rr(ctx, 0, 0, cwid, chei, 6, col.paper);
  noShadow(ctx);
  contain(ctx, logo, cwid * 0.1, chei * 0.14, cwid * 0.5, chei * 0.3);
  ctx.fillStyle = mix(col.ink, col.paper, 0.6);
  ctx.fillRect(cwid * 0.1, chei * 0.62, cwid * 0.4, 5);
  ctx.fillRect(cwid * 0.1, chei * 0.72, cwid * 0.3, 5);
  ctx.fillRect(cwid * 0.1, chei * 0.82, cwid * 0.35, 5);
  ctx.fillStyle = col.brand;
  ctx.fillRect(cwid - 12, 0, 12, chei);
  ctx.restore();
  ctx.restore();
  label(ctx, C("Papeterie", "Stationery"), P + 30, y + RC - 28, mix(col.ink, col.cream, 0.45), BF);

  // Sac (et produit réel sur un socle) ou carnet et tasse (services).
  const xc2 = P + c1 + G;
  rr(ctx, xc2, y, c2, RC, 8, mix(col.second, col.cream, 0.55));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(xc2, y, c2, RC, 8);
  ctx.clip();
  const bw = c2 * 0.62, bh = bw * 1.15, bx = xc2 + c2 * 0.1, by = y + RC - bh - 70;
  ctx.strokeStyle = mix(col.ink, col.cream, 0.15);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(bx + bw / 2, by + 4, bw * 0.22, Math.PI, 0);
  ctx.stroke();
  shadow(ctx, 40, 20, 0.22);
  rr(ctx, bx, by, bw, bh, 4, b.business === "products" ? col.cream : col.brand);
  noShadow(ctx);
  const bagInk = b.business === "products" ? col.ink : onBrand;
  if (b.business === "products") contain(ctx, logo, bx + bw * 0.14, by + bh * 0.36, bw * 0.72, bh * 0.22);
  else contain(ctx, tint(logo, bagInk), bx + bw * 0.14, by + bh * 0.36, bw * 0.72, bh * 0.22);
  if (product) {
    const px = xc2 + c2 * 0.52, pw = c2 * 0.44, ph = RC * 0.42;
    rr(ctx, px - 6, y + RC - 92, pw + 12, 26, 13, mix(col.ink, col.cream, 0.7));
    shadow(ctx, 24, 10, 0.2);
    containBottom(ctx, product, px, y + RC - 90 - ph, pw, ph);
    noShadow(ctx);
  } else {
    // Tasse aux couleurs de la marque.
    const tx = xc2 + c2 * 0.66, tw = c2 * 0.24, th = tw * 1.05, ty = y + RC - th - 70;
    shadow(ctx, 24, 10, 0.2);
    rr(ctx, tx, ty, tw, th, 10, col.ink);
    noShadow(ctx);
    ctx.strokeStyle = col.ink;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(tx + tw, ty + th * 0.45, th * 0.2, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    drawMark(ctx, mark, b, tx + tw / 2, ty + th * 0.5, tw * 0.5, sealC);
  }
  ctx.restore();
  label(ctx, product ? C("Sac et produit", "Bag and product") : C("Sac et tasse", "Bag and cup"), xc2 + 30, y + RC - 28, mix(col.ink, col.cream, 0.45), BF);

  // Profil Instagram sur téléphone (vraies photos du projet, sinon tuiles de la marque ; aucun chiffre).
  const xc3 = xc2 + c2 + G;
  rr(ctx, xc3, y, c3, RC, 8, mix(col.brand, col.cream, 0.7));
  const fw = c3 * 0.74, fh = Math.min(RC - 60, fw * 2.05), fx = xc3 + (c3 - fw) / 2, fy = y + (RC - fh) / 2;
  shadow(ctx, 50, 24, 0.3);
  rr(ctx, fx, fy, fw, fh, 38, "#111111");
  noShadow(ctx);
  const sx = fx + 10, sy = fy + 10, sW = fw - 20, sH = fh - 20;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(sx, sy, sW, sH, 30);
  ctx.clip();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(sx, sy, sW, sH);
  const av = sW * 0.12;
  ctx.fillStyle = col.brand;
  ctx.beginPath();
  ctx.arc(sx + 22 + av, sy + 56 + av, av, 0, Math.PI * 2);
  ctx.fill();
  drawMark(ctx, mark, b, sx + 22 + av, sy + 56 + av, av * 1.15, onBrand);
  ctx.fillStyle = "#111";
  ctx.font = font("Inter", 700, 15);
  ctx.textAlign = "left";
  const handle = `@${b.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "")}`;
  ctx.fillText(handle.slice(0, 18), sx + 40 + av * 2, sy + 62 + av * 0.6);
  ctx.font = font("Inter", 400, 12);
  ctx.fillStyle = "#555";
  if (tagline) ctx.fillText(tagline.slice(0, 26), sx + 40 + av * 2, sy + 82 + av * 0.6);
  const gy = sy + 80 + av * 2, cell = (sW - 4) / 3;
  let cells = 0;
  while (gy + Math.floor(cells / 3) * (cell + 2) < sy + sH) cells++;
  const plan = phoneGridPlan(cells, pics.length);
  const tiles = phoneBrandTiles(plan.filter((x) => x === null).length, [col.brand, col.ink, col.second], !!tagline);
  let tileN = 0;
  for (let i = 0; i < cells; i++) {
    const gx = sx + (i % 3) * (cell + 2), gyy = gy + Math.floor(i / 3) * (cell + 2);
    const pic = plan[i] === null ? null : pics[plan[i] as number];
    // Une case sur trois aux couleurs de la marque : la grille garde son rythme et sa cohérence (slogan une seule fois).
    if (pic) cover(ctx, pic, gx, gyy, cell, cell);
    else {
      const tile = tiles[tileN++];
      const bg = tile.bg;
      ctx.fillStyle = bg;
      ctx.fillRect(gx, gyy, cell, cell);
      if (tile.kind === "tagline") {
        ctx.fillStyle = onColor(bg, col.ink, "#FFFFFF");
        ctx.font = font(HF, HW, 15);
        ctx.textAlign = "center";
        wrap(ctx, tagline, cell - 16, 3).forEach((l, k) => ctx.fillText(l, gx + cell / 2, gyy + cell / 2 - 10 + k * 18));
      } else drawMark(ctx, mark, b, gx + cell / 2, gyy + cell / 2, cell * 0.4, mix(bg, onColor(bg, col.ink, "#FFFFFF"), 0.8));
    }
  }
  ctx.restore();

  // Site sur ordinateur : en-tête avec le logo, grande photo, titre et bouton de la marque.
  const xc4 = xc3 + c3 + G;
  rr(ctx, xc4, y, c4, RC, 8, mix(col.cream, col.accent, 0.12));
  const lpw = c4 * 0.84, lph = lpw * 0.6, lpx = xc4 + (c4 - lpw) / 2, lpy = y + (RC - lph) / 2 - 30;
  shadow(ctx, 50, 24, 0.25);
  rr(ctx, lpx, lpy, lpw, lph, 14, "#1A1A1A");
  noShadow(ctx);
  rr(ctx, lpx - lpw * 0.06, lpy + lph, lpw * 1.12, 22, 8, "#C9C6C0");
  const vx = lpx + 12, vy = lpy + 12, vw = lpw - 24, vh = lph - 24;
  ctx.save();
  ctx.beginPath();
  ctx.rect(vx, vy, vw, vh);
  ctx.clip();
  ctx.fillStyle = col.paper;
  ctx.fillRect(vx, vy, vw, vh);
  contain(ctx, logo, vx + 18, vy + 10, vw * 0.22, 36);
  ctx.fillStyle = mix(col.ink, col.paper, 0.65);
  for (let i = 0; i < 3; i++) rr(ctx, vx + vw * 0.5 + i * 64, vy + 24, 48, 8, 4, ctx.fillStyle as string);
  rr(ctx, vx + vw - 104, vy + 14, 88, 28, 14, col.brand);
  const hy = vy + 56, hh = vh - 56;
  if (pics.length) {
    cover(ctx, pics[0], vx + vw * 0.48, hy, vw * 0.52, hh);
  } else {
    ctx.fillStyle = col.second;
    ctx.fillRect(vx + vw * 0.48, hy, vw * 0.52, hh);
    drawMark(ctx, mark, b, vx + vw * 0.74, hy + hh / 2, hh * 0.4, mix(col.second, onColor(col.second, col.ink, "#FFFFFF"), 0.5));
  }
  ctx.fillStyle = col.ink;
  ctx.textAlign = "left";
  const head = tagline || b.name;
  ctx.font = font(HF, HW, 30);
  const hl = wrap(ctx, head, vw * 0.4, 3);
  hl.forEach((l, k) => ctx.fillText(l, vx + 24, hy + 60 + k * 36));
  ctx.fillStyle = mix(col.ink, col.paper, 0.7);
  ctx.fillRect(vx + 24, hy + 80 + hl.length * 36, vw * 0.3, 6);
  ctx.fillRect(vx + 24, hy + 96 + hl.length * 36, vw * 0.24, 6);
  const cta = b.business === "products" ? C("Découvrir", "Discover") : C("Rendez-vous", "Book now");
  ctx.font = font(BF, 600, 14);
  const bwid = ctx.measureText(cta).width + 44;
  rr(ctx, vx + 24, hy + 124 + hl.length * 36, bwid, 36, 18, col.brand);
  ctx.fillStyle = onBrand;
  ctx.textAlign = "center";
  ctx.fillText(cta, vx + 24 + bwid / 2, hy + 147 + hl.length * 36);
  ctx.restore();
  label(ctx, C("Site internet", "Website"), xc4 + 30, y + RC - 28, mix(col.ink, col.cream, 0.45), BF);

  return c.encode("png");
}
