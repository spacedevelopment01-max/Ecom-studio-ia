/**
 * LA PLANCHE EN VRAI : CE QUE FAIT LE CODE SEUL, SANS OPENAI (plan accepté du 25 novembre 2026 ; voir planche-en-vrai.ts).
 *
 * - les dix versions du logo, d'après assembler-planche.py (preuves, branche du chef d'orchestre), tirées du logo au fond
 *   retiré par le Studio (`logoDetoure` : creux des lettres compris) ;
 * - la séparation du symbole et du nom, sur le masque d'encre d'assembler-planche.py (le masque du fond retiré ne sert
 *   qu'au fond) ; si elle n'est pas fiable, le symbole complet est gardé, et c'est dit ;
 * - les favicons 32, 64 et 512, et l'avatar ;
 * - la palette : la médiane des pixels de chaque pastille de la planche choisie, puis le code écrit sous la pastille sur
 *   l'aperçu quand la couleur peinte en est proche (`paletteRetenue`, 26 novembre 2026 : ces codes retenus font foi) ;
 *   les rôles donnés par le code ;
 * - la police de mise en page de l'aperçu (Nunito Sans) pour tout ce qui n'est pas le spécimen des polices de la marque ;
 * - les polices : le nom lu sur la planche, cherché dans le catalogue du Studio (FONT_FILES, assets/fonts) ; absente,
 *   la plus proche du catalogue, et SINA le dit ; aucune source en ligne ;
 * - les blocs de texte, redessinés avec les textes de l'inventaire ;
 * - le badge : un anneau et un texte autour du symbole du logo, jamais un pictogramme inventé ;
 * - l'assemblage en 3072 × 4608 : le décor agrandi deux fois, les images posées dans leurs cases, les publications entières.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { FONT_FILES } from "../theme/render";
import { FONT_DIR } from "../media/fonts";
import { lignesDuTexte } from "./phrase-sous-le-nom";
import { ECHELLE, TAILLE_DEMO, TAILLE_EN_VRAI, rognerLesMargesBlanches, type Boite, type NomElement, type PoliceDeLInventaire } from "./planche-en-vrai";

// ---------------------------------------------------------------- couleurs

export type RGB = [number, number, number];
export const hexDe = (c: readonly number[]) => `#${c.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
export const rgbDe = (h: string): RGB => { const n = parseInt(h.replace("#", "").slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const luminance = (h: string) => { const [r, g, b] = rgbDe(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const saturation = (h: string) => { const [r, g, b] = rgbDe(h); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
const mediane = (v: number[]) => { if (!v.length) return 0; const s = [...v].sort((a, b) => a - b); return s[s.length >> 1]; };

// ---------------------------------------------------------------- le logo : masque, symbole et nom

type Rgba = { data: Buffer; w: number; h: number };
const rgba = async (png: Buffer): Promise<Rgba> => { const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
const versPng = (r: Rgba) => sharp(r.data, { raw: { width: r.w, height: r.h, channels: 4 } }).png().toBuffer();
function boiteOpaque(r: Rgba, x0 = 0, y0 = 0, x1 = r.w, y1 = r.h): [number, number, number, number] | null {
  let a = x1, b = y1, c = -1, d = -1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (r.data[(y * r.w + x) * 4 + 3] >= 20) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; }
  return c < 0 ? null : [a, b, c + 1, d + 1];
}
function decouper(r: Rgba, b: [number, number, number, number]): Rgba {
  const w = b[2] - b[0], h = b[3] - b[1], out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) r.data.copy(out, y * w * 4, ((b[1] + y) * r.w + b[0]) * 4, ((b[1] + y) * r.w + b[2]) * 4);
  return { data: out, w, h };
}

export type Separation = { symbole: Buffer; nom: Buffer | null; fiable: boolean; raison: string | null; sens: "dessus" | "gauche" | null };

/**
 * LE MASQUE D'ENCRE du logo (assembler-planche.py, branche du chef d'orchestre) : le logo posé sur du blanc, puis chaque
 * point compté comme encre selon sa noirceur (plus clair que 235 : rien ; plus foncé que 120 : de l'encre pleine ; entre
 * les deux, en proportion). Il ne sert qu'à TROUVER le symbole et le nom : les pixels gardés viennent toujours du logo au
 * fond retiré (`logoDetoure`), dont le masque ne sert qu'au fond (ses franges presque transparentes empêchaient de voir le
 * blanc entre le symbole et le nom). Un logo très clair, sans encre lisible ainsi, prend son masque d'opacité (au moins 128).
 */
function masqueDEncre(r: Rgba): Uint8Array {
  const m = new Uint8Array(r.w * r.h);
  let n = 0;
  for (let i = 0; i < r.w * r.h; i++) {
    const a = r.data[i * 4 + 3] / 255;
    // Le point posé sur du blanc, en gris.
    const v = 255 * (1 - a) + a * (0.299 * r.data[i * 4] + 0.587 * r.data[i * 4 + 1] + 0.114 * r.data[i * 4 + 2]);
    m[i] = v > 235 ? 0 : v < 120 ? 255 : Math.round(((235 - v) * 255) / 115);
    if (m[i] >= 20) n++;
  }
  if (n < r.w * r.h * 0.002) for (let i = 0; i < r.w * r.h; i++) m[i] = r.data[i * 4 + 3] >= 128 ? 255 : 0;
  return m;
}
const ENCRE = 20;
function boiteDEncre(m: Uint8Array, w: number, b: [number, number, number, number]): [number, number, number, number] | null {
  let a = b[2], c = b[3], d = -1, e = -1;
  for (let y = b[1]; y < b[3]; y++) for (let x = b[0]; x < b[2]; x++) if (m[y * w + x] >= ENCRE) { if (x < a) a = x; if (y < c) c = y; if (x > d) d = x; if (y > e) e = y; }
  return d < 0 ? null : [a, c, d + 1, e + 1];
}

/**
 * LE SYMBOLE ET LE NOM, séparés comme dans assembler-planche.py : sur le masque d'encre, la plus grande bande vide entre
 * le symbole et le nom ; HORIZONTALE pour un logo empilé (le symbole au-dessus du nom), VERTICALE pour un logo en ligne (le
 * symbole à gauche du nom). Une ligne (ou une colonne) est vide quand aucun point n'y atteint l'encre. Les bandes sont
 * essayées de la plus grande à la plus petite, dans les deux sens ; la première qui donne une séparation fiable est
 * gardée. Fiable seulement si la bande fait au moins 1,5 % du côté, si les deux parties pèsent chacune au moins 8 % de
 * l'encre, si le nom est nettement plus large que haut et si le symbole est d'une forme ramassée. Sinon : le symbole
 * complet (le logo entier), et c'est dit.
 */
export async function separerSymbole(logoDetoure: Buffer): Promise<Separation> {
  const r0 = await rgba(logoDetoure), m0 = masqueDEncre(r0), bb = boiteDEncre(m0, r0.w, [0, 0, r0.w, r0.h]);
  if (!bb) return { symbole: logoDetoure, nom: null, fiable: false, raison: "logo vide", sens: null };
  const r = decouper(r0, bb), m = new Uint8Array(r.w * r.h);
  for (let y = 0; y < r.h; y++) m.set(m0.subarray((bb[1] + y) * r0.w + bb[0], (bb[1] + y) * r0.w + bb[2]), y * r.w);
  const encreDe = (b: [number, number, number, number]) => { let s = 0; for (let y = b[1]; y < b[3]; y++) for (let x = b[0]; x < b[2]; x++) s += m[y * r.w + x]; return s; };
  const total = encreDe([0, 0, r.w, r.h]);
  const entier = async (raison: string): Promise<Separation> => ({ symbole: await versPng(r), nom: null, fiable: false, raison, sens: null });
  /** Les bandes vides intérieures (jamais au bord), de la plus grande à la plus petite. */
  const bandes = (n: number, vide: (i: number) => boolean) => {
    const out: [number, number][] = [];
    let deb = -1;
    for (let i = 0; i <= n; i++) {
      const v = i < n && vide(i);
      if (v && deb < 0) deb = i;
      if (!v && deb >= 0) { if (deb > 0 && i < n) out.push([deb, i]); deb = -1; }
    }
    return out.sort((a, b) => b[1] - b[0] - (a[1] - a[0]));
  };
  const ligneVide = (y: number) => { for (let x = 0; x < r.w; x++) if (m[y * r.w + x] >= ENCRE) return false; return true; };
  const colonneVide = (x: number) => { for (let y = 0; y < r.h; y++) if (m[y * r.w + x] >= ENCRE) return false; return true; };
  const essais: { sens: "dessus" | "gauche"; a: [number, number, number, number]; b: [number, number, number, number]; part: number }[] = [
    ...bandes(r.h, ligneVide).map(([d, f]) => ({ sens: "dessus" as const, a: [0, 0, r.w, d] as [number, number, number, number], b: [0, f, r.w, r.h] as [number, number, number, number], part: (f - d) / r.h })),
    ...bandes(r.w, colonneVide).map(([d, f]) => ({ sens: "gauche" as const, a: [0, 0, d, r.h] as [number, number, number, number], b: [f, 0, r.w, r.h] as [number, number, number, number], part: (f - d) / r.w })),
  ].sort((x, y) => y.part - x.part);
  for (const e of essais) {
    if (e.part < 0.015) continue;
    const ba = boiteDEncre(m, r.w, e.a), bb2 = boiteDEncre(m, r.w, e.b);
    if (!ba || !bb2) continue;
    const pa = encreDe(ba) / total, pb = encreDe(bb2) / total;
    const rapportA = (ba[2] - ba[0]) / (ba[3] - ba[1]), rapportB = (bb2[2] - bb2[0]) / (bb2[3] - bb2[1]);
    if (pa < 0.08 || pb < 0.08) continue;
    if (rapportB < 1.8 || rapportA < 0.33 || rapportA > 3) continue;
    // Les pixels du logo au fond retiré, découpés aux boîtes d'encre (les franges du fond retiré n'y entrent pas).
    return { symbole: await versPng(decouper(r, ba)), nom: await versPng(decouper(r, bb2)), fiable: true, raison: null, sens: e.sens };
  }
  return entier("aucune séparation nette entre un symbole et le nom");
}

/**
 * LA MARQUE ET SA PHRASE (essai réel d'Écume, 26 novembre 2026) : quand le symbole ne se sépare pas du nom (un mot-symbole
 * avec ses bulles et sa vague), la phrase écrite sous le logo se sépare souvent, elle : la plus basse bande vide
 * horizontale, sous laquelle il ne reste que des lignes de texte fines (au moins deux fois et demie plus larges que hautes,
 * moins d'un tiers de la hauteur). Le logo horizontal de l'aperçu met alors la marque à gauche et la phrase à droite.
 * Null quand il n'y a pas de phrase nette.
 */
export async function separerLaPhrase(logoDetoure: Buffer): Promise<{ marque: Buffer; phrase: Buffer } | null> {
  const r0 = await rgba(logoDetoure), m0 = masqueDEncre(r0), bb = boiteDEncre(m0, r0.w, [0, 0, r0.w, r0.h]);
  if (!bb) return null;
  const r = decouper(r0, bb), m = new Uint8Array(r.w * r.h);
  for (let y = 0; y < r.h; y++) m.set(m0.subarray((bb[1] + y) * r0.w + bb[0], (bb[1] + y) * r0.w + bb[2]), y * r.w);
  const vide = (y: number) => { for (let x = 0; x < r.w; x++) if (m[y * r.w + x] >= ENCRE) return false; return true; };
  // Les blocs de lignes pleines, de haut en bas (séparés par des lignes vides).
  const blocs: [number, number][] = [];
  let deb = -1;
  for (let y = 0; y <= r.h; y++) { const v = y >= r.h || vide(y); if (!v && deb < 0) deb = y; if (v && deb >= 0) { blocs.push([deb, y]); deb = -1; } }
  // Depuis le bas : les blocs qui sont des lignes de texte (au moins deux fois et demie plus larges que hautes, chacune
  // sous 20 % de la hauteur du logo) forment la phrase ; le premier bloc qui n'en est pas une arrête.
  let i = blocs.length;
  while (i > 1) {
    const [y0, y1] = blocs[i - 1], b = boiteDEncre(m, r.w, [0, y0, r.w, y1]);
    if (!b || (b[2] - b[0]) / (b[3] - b[1]) < 2.5 || b[3] - b[1] > r.h * 0.2) break;
    i--;
  }
  if (i >= blocs.length || i < 1) return null;
  const d = blocs[i - 1][1], f = blocs[i][0];
  if (f - d < r.h * 0.012) return null;
  const a = boiteDEncre(m, r.w, [0, 0, r.w, d]), b = boiteDEncre(m, r.w, [0, f, r.w, r.h]);
  if (!a || !b || b[3] - b[1] > (a[3] - a[1]) / 2) return null;
  return { marque: await versPng(decouper(r, a)), phrase: await versPng(decouper(r, b)) };
}
/** Le logo horizontal sans symbole séparé : la marque à gauche, la phrase à droite, centrée sur sa hauteur. */
async function marqueEtPhrase(marque: Buffer, phrase: Buffer): Promise<Buffer> {
  const a = await img(marque), p = await img(phrase), hp = Math.round(a.height * 0.34), wp = Math.round((p.width * hp) / p.height), g = Math.round(a.height * 0.12);
  const c = createCanvas(a.width + g + wp, a.height), x = c.getContext("2d");
  dessiner(x, a, 0, 0, a.width, a.height); dessiner(x, p, a.width + g, (a.height - hp) / 2, wp, hp);
  return c.encode("png");
}
/**
 * UNE VERSION REPRISE DE L'APERÇU (essai réel d'Écume, 26 novembre 2026) : sans symbole séparable, le compact, l'icône, le
 * favicon et le badge de la planche choisie sont des dessins que le logo seul ne donne pas (« É » et ses bulles, la vague,
 * le sceau). Ils sont repris de leur tuile de l'aperçu, agrandis quatre fois, le fond de la tuile retiré (le fond est la
 * couleur médiane du pourtour ; un point s'en écartant de plus de 40 niveaux est plein, en fondu entre 12 et 40).
 */
export async function versionDepuisLApercu(tuile: Buffer): Promise<Buffer> {
  const m = await sharp(tuile).metadata(), w = (m.width ?? 1) * 4, h = (m.height ?? 1) * 4;
  const { data } = await sharp(tuile).resize(w, h, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const c: number[][] = [[], [], []], add = (x: number, y: number) => { const i = (y * w + x) * 3; for (let k = 0; k < 3; k++) c[k].push(data[i + k]); };
  for (let x = 0; x < w; x += 2) { add(x, 2); add(x, h - 3); }
  for (let y = 0; y < h; y += 2) { add(2, y); add(w - 3, y); }
  const f = c.map(mediane), out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const d = Math.max(Math.abs(data[i * 3] - f[0]), Math.abs(data[i * 3 + 1] - f[1]), Math.abs(data[i * 3 + 2] - f[2]));
    out[i * 4] = data[i * 3]; out[i * 4 + 1] = data[i * 3 + 1]; out[i * 4 + 2] = data[i * 3 + 2];
    out[i * 4 + 3] = d >= 40 ? 255 : d <= 12 ? 0 : Math.round(((d - 12) * 255) / 28);
  }
  const r: Rgba = { data: out, w, h }, b = boiteOpaque(r);
  return versPng(b ? decouper(r, [Math.max(0, b[0] - 4), Math.max(0, b[1] - 4), Math.min(w, b[2] + 4), Math.min(h, b[3] + 4)]) : r);
}
/** Les versions reprises de l'aperçu quand le symbole ne se sépare pas : leurs tuiles (logo-4, logo-5, logo-6, logo-10). */
export const VERSIONS_DE_L_APERCU = ["logo-compact", "icone", "favicon", "badge"] as const satisfies readonly VersionDuLogoPre[];
type VersionDuLogoPre = "logo-compact" | "icone" | "favicon" | "badge";
export const TUILE_DE_LA_VERSION: Record<VersionDuLogoPre, string> = { "logo-compact": "logo-4", icone: "logo-5", favicon: "logo-6", badge: "logo-10" };

/** La couleur du logo : la médiane de ses pixels opaques (son encre principale). */
export async function couleurDuLogo(logo: Buffer): Promise<string> {
  const r = await rgba(logo), c: number[][] = [[], [], []];
  for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] >= 200) { c[0].push(r.data[i]); c[1].push(r.data[i + 1]); c[2].push(r.data[i + 2]); }
  return hexDe(c.map(mediane));
}

// ---------------------------------------------------------------- les dix versions

export const VERSIONS_DU_LOGO = ["logo-principal", "logo-horizontal", "logo-empile", "logo-compact", "icone", "favicon", "monochrome-fonce", "monochrome-clair", "inverse", "badge"] as const;
export type VersionDuLogo = (typeof VERSIONS_DU_LOGO)[number];
export const LIBELLE_DES_VERSIONS: Record<VersionDuLogo, { fr: string; en: string }> = {
  "logo-principal": { fr: "Logo principal", en: "Main logo" }, "logo-horizontal": { fr: "Logo horizontal", en: "Horizontal logo" }, "logo-empile": { fr: "Logo empilé", en: "Stacked logo" },
  "logo-compact": { fr: "Logo compact", en: "Compact logo" }, icone: { fr: "Icône seule", en: "Icon" }, favicon: { fr: "Favicon", en: "Favicon" },
  "monochrome-fonce": { fr: "Monochrome foncé", en: "Dark monochrome" }, "monochrome-clair": { fr: "Monochrome clair", en: "Light monochrome" },
  inverse: { fr: "Inversé sur fond sombre", en: "Reversed on dark" }, badge: { fr: "Badge / sceau", en: "Badge / seal" },
};

type Img = Awaited<ReturnType<typeof loadImage>>;
const img = (b: Buffer) => loadImage(b);
async function teinte(png: Buffer, couleur: string): Promise<Buffer> {
  const i = await img(png), c = createCanvas(i.width, i.height), x = c.getContext("2d");
  x.drawImage(i, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = couleur; x.fillRect(0, 0, i.width, i.height);
  return c.encode("png");
}
const dessiner = (x: SKRSContext2D, i: Img, dx: number, dy: number, w: number, h: number) => x.drawImage(i, dx, dy, w, h);
function arrondi(x: SKRSContext2D, x0: number, y0: number, w: number, h: number, r: number) {
  x.beginPath(); x.moveTo(x0 + r, y0); x.arcTo(x0 + w, y0, x0 + w, y0 + h, r); x.arcTo(x0 + w, y0 + h, x0, y0 + h, r); x.arcTo(x0, y0 + h, x0, y0, r); x.arcTo(x0, y0, x0 + w, y0, r); x.closePath();
}
async function empile(sym: Buffer, nom: Buffer, ecart: number): Promise<Buffer> {
  const s = await img(sym), n = await img(nom), g = Math.round(s.height * ecart), w = Math.max(s.width, n.width), h = s.height + g + n.height;
  const c = createCanvas(w, h), x = c.getContext("2d");
  dessiner(x, s, (w - s.width) / 2, 0, s.width, s.height); dessiner(x, n, (w - n.width) / 2, s.height + g, n.width, n.height);
  return c.encode("png");
}
async function horizontal(sym: Buffer, nom: Buffer): Promise<Buffer> {
  const s = await img(sym), n = await img(nom), h = Math.round(n.height * 1.35), sw = Math.round((s.width * h) / s.height), g = Math.round(n.height * 0.35);
  const c = createCanvas(sw + g + n.width, h), x = c.getContext("2d");
  dessiner(x, s, 0, 0, sw, h); dessiner(x, n, sw + g, (h - n.height) / 2, n.width, n.height);
  return c.encode("png");
}
async function carre(signe: Buffer, fond: string, rayon: number, marge: number, t = 1024): Promise<Buffer> {
  const s = await img(signe), c = createCanvas(t, t), x = c.getContext("2d");
  arrondi(x, 0, 0, t, t, t * rayon); x.fillStyle = fond; x.fill();
  const k = (t * (1 - 2 * marge)) / Math.max(s.width, s.height);
  dessiner(x, s, (t - s.width * k) / 2, (t - s.height * k) / 2, s.width * k, s.height * k);
  return c.encode("png");
}
async function inverse(logoClair: Buffer, fond: string): Promise<Buffer> {
  const l = await img(logoClair), w = Math.round(l.width * 1.35), h = Math.round(l.height * 1.45), c = createCanvas(w, h), x = c.getContext("2d");
  arrondi(x, 0, 0, w, h, w * 0.06); x.fillStyle = fond; x.fill();
  dessiner(x, l, (w - l.width) / 2, (h - l.height) / 2, l.width, l.height);
  return c.encode("png");
}

// ---------------------------------------------------------------- les polices du catalogue

let enregistrees = false;
const ALIAS = (cle: string, poids: number) => `envrai-${cle}-${poids}`;
function enregistrerLesPolices() {
  if (enregistrees) return;
  for (const [cle, f] of Object.entries(FONT_FILES)) for (const [poids, fichier] of Object.entries(f.files)) {
    const p = path.join(FONT_DIR, fichier);
    if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, ALIAS(cle, Number(poids)));
  }
  enregistrees = true;
}
/**
 * `remplacee` : la police prise n'est pas celle nommée sur la planche ; `pourquoi` : « absente » (pas dans le catalogue) ou
 * « genre » (nommée, mais son spécimen montrait un autre genre d'écriture : la police suit l'aperçu que le client a vu).
 * `genreLu` : le genre lu sur le spécimen, quand il contredit la police nommée.
 */
export type PoliceChoisie = { cle: string; famille: string; fichier: string; poids: number; handle: string; lue: string; remplacee: boolean; pourquoi?: "absente" | "genre" | "apercu"; genreLu?: PoliceDeLInventaire["genre"] };
const plat = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const AFFICHE = new Set(["anton", "bebas_neue", "archivo_black", "alfa_slab_one", "abril_fatface", "righteous", "unbounded", "oswald", "yeseva_one"]);
/**
 * LE GENRE DE CHAQUE POLICE DU CATALOGUE, tiré de façon sûre du catalogue lui-même (FONT_FILES, src/lib/theme/render.ts) :
 * sa famille de secours (« serif », « cursive » pour une écriture manuscrite, « monospace » pour la chasse fixe, sinon sans
 * empattements), et les polices d'affiche nommées ici. Aucune police n'est devinée à son nom.
 */
export function genreDu(cle: string): PoliceDeLInventaire["genre"] {
  if (AFFICHE.has(cle)) return "affiche";
  const fb = FONT_FILES[cle]?.fallback;
  return fb === "serif" ? "serif" : fb === "cursive" ? "manuscrite" : fb === "monospace" ? "chasse-fixe" : "sans";
}
const GENRES: PoliceDeLInventaire["genre"][] = ["serif", "sans", "manuscrite", "chasse-fixe", "affiche"];
/**
 * LA LISTE DES POLICES DU CATALOGUE, PAR GENRE, donnée à l'inventaire (26 novembre 2026) : seulement les noms des
 * polices, rangés par genre ; aucun exemple d'essai.
 */
export function catalogueDesPolicesParGenre(): string {
  const parGenre = GENRES.map((g) => `${g} : ${Object.keys(FONT_FILES).filter((k) => genreDu(k) === g).map((k) => FONT_FILES[k].family).join(", ")}`);
  return `Les polices du catalogue du Studio, par genre (pour procheDuCatalogue) :\n${parGenre.join("\n")}`;
}
/** Quelques polices courantes hors du catalogue, et la plus proche du catalogue (dessin voisin). */
const VOISINES: Record<string, string> = {
  helvetica: "inter", helveticaneue: "inter", arial: "inter", roboto: "inter", sfpro: "inter", lato: "lato", opensans: "open_sans", gothambook: "montserrat", gotham: "montserrat",
  proximanova: "montserrat", futura: "jost", avenir: "nunito_sans", avenirnext: "nunito_sans", gillsans: "work_sans", sourcesanspro: "source_sans_3", nunito: "nunito",
  garamond: "cormorant_garamond", ebgaramond: "cormorant_garamond", georgia: "lora", timesnewroman: "libre_baskerville", baskerville: "libre_baskerville", didot: "bodoni_moda",
  bodoni: "bodoni_moda", cormorantgaramond: "cormorant_garamond", playfair: "playfair_display", dmserif: "dm_serif_display", ptserif: "merriweather", sourceserifpro: "merriweather",
  greatvibes: "allura", parisienne: "allura", lobster: "pacifico", amatic: "caveat", couriernew: "ibm_plex_mono", courier: "ibm_plex_mono",
};
/**
 * Le genre lu sur le spécimen contredit-il celui de la police nommée ? Une écriture manuscrite ou à chasse fixe ne se
 * confond avec rien d'autre ; une police d'affiche se lit aussi bien comme une police à empattements ou sans : pas de
 * contradiction entre elles. Le même genre : jamais.
 */
export function genresContradictoires(lu: PoliceDeLInventaire["genre"], catalogue: PoliceDeLInventaire["genre"]): boolean {
  if (lu === catalogue) return false;
  const souple = (g: string) => g === "serif" || g === "sans";
  if ((lu === "affiche" && souple(catalogue)) || (catalogue === "affiche" && souple(lu))) return false;
  return true;
}
const DEFAUT_DU_GENRE: Record<PoliceDeLInventaire["genre"], string> = { serif: "lora", sans: "inter", manuscrite: "dancing_script", "chasse-fixe": "ibm_plex_mono", affiche: "bebas_neue" };
const trigrammes = (t: string) => { const s = new Set<string>(); for (let i = 0; i + 3 <= t.length; i++) s.add(t.slice(i, i + 3)); return s; };
const dice = (a: string, b: string) => { const A = trigrammes(a), B = trigrammes(b); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return (2 * n) / (A.size + B.size); };
/**
 * La police lue sur la planche, cherchée dans le catalogue du Studio : trouvée, elle est prise telle quelle ; absente, la
 * plus proche du catalogue (une voisine connue, puis le nom le plus proche du même genre, puis la police de base du genre),
 * et c'est dit (`remplacee`). Aucune source en ligne.
 *
 * LA POLICE SUIT L'APERÇU QUE LE CLIENT A VU (chef d'orchestre, 26 novembre 2026, essai réel d'Écume : « Nunito » écrit
 * sur la planche B, mais son spécimen montré en écriture manuscrite). Quand le genre lu sur le spécimen contredit celui de
 * la police nommée (`genresContradictoires`), ou celui de sa voisine connue, la police prise est celle du catalogue la plus
 * proche du spécimen : le nom le plus proche dans le genre lu, sinon la police de base de ce genre ; son vrai nom est
 * affiché (`famille`), elle est comptée remplacée (`pourquoi` : « genre ») et SINA le dit. Le genre concorde : rien ne change.
 */
export function policeDuCatalogue(lue: PoliceDeLInventaire, poidsVoulu: number): PoliceChoisie {
  const n = plat(lue.nom);
  const nommee = Object.keys(FONT_FILES).find((k) => plat(FONT_FILES[k].family) === n);
  // LE CHOIX DE L'INVENTAIRE (26 novembre 2026, « identique en visuel ») : la police de la liste du catalogue qui ressemble
  // le plus au spécimen montré. Pris seulement s'il est dans le catalogue et dans le genre lu ; sinon, la règle d'avant.
  const choisie = lue.procheDuCatalogue ? Object.keys(FONT_FILES).find((k) => plat(FONT_FILES[k].family) === plat(lue.procheDuCatalogue!)) : undefined;
  if (choisie && !genresContradictoires(lue.genre, genreDu(choisie))) {
    const pourquoiChoix: PoliceChoisie["pourquoi"] = !nommee ? "absente" : genresContradictoires(lue.genre, genreDu(nommee)) ? "genre" : choisie !== nommee ? "apercu" : undefined;
    const fc = FONT_FILES[choisie], pc = Object.keys(fc.files).map(Number).sort((a, b) => Math.abs(a - poidsVoulu) - Math.abs(b - poidsVoulu))[0];
    return { cle: choisie, famille: fc.family, fichier: fc.files[pc], poids: pc, handle: `${choisie}_n${String(pc)[0]}`, lue: lue.nom.trim(), remplacee: !!pourquoiChoix, ...(pourquoiChoix === "genre" ? { pourquoi: pourquoiChoix, genreLu: lue.genre } : pourquoiChoix ? { pourquoi: pourquoiChoix } : {}) };
  }
  let cle = nommee;
  let pourquoi: PoliceChoisie["pourquoi"] = cle ? undefined : "absente";
  if (cle && genresContradictoires(lue.genre, genreDu(cle))) { cle = undefined; pourquoi = "genre"; }
  if (!cle && pourquoi === "absente") {
    const voisine = Object.entries(VOISINES).find(([k]) => n === k || (k.length >= 5 && n.startsWith(k)))?.[1];
    if (voisine && FONT_FILES[voisine] && !genresContradictoires(lue.genre, genreDu(voisine))) cle = voisine;
  }
  const remplacee = !!pourquoi;
  if (!cle) {
    const memeGenre = Object.keys(FONT_FILES).filter((k) => genreDu(k) === lue.genre);
    const best = memeGenre.map((k) => ({ k, s: dice(n, plat(FONT_FILES[k].family)) })).sort((a, b) => b.s - a.s)[0];
    cle = best && best.s >= 0.25 ? best.k : DEFAUT_DU_GENRE[lue.genre];
  }
  const f = FONT_FILES[cle], poids = Object.keys(f.files).map(Number).sort((a, b) => Math.abs(a - poidsVoulu) - Math.abs(b - poidsVoulu))[0];
  return { cle, famille: f.family, fichier: f.files[poids], poids, handle: `${cle}_n${String(poids)[0]}`, lue: lue.nom.trim(), remplacee, ...(pourquoi === "genre" ? { pourquoi, genreLu: lue.genre } : pourquoi ? { pourquoi } : {}) };
}
const fonte = (p: Pick<PoliceChoisie, "cle" | "poids">, taille: number, poids?: number) => {
  enregistrerLesPolices();
  const f = FONT_FILES[p.cle], w = poids == null ? p.poids : Object.keys(f.files).map(Number).sort((a, b) => Math.abs(a - poids) - Math.abs(b - poids))[0];
  return `${Math.round(taille)}px "${ALIAS(p.cle, w)}"`;
};

/**
 * LA POLICE DE MISE EN PAGE (essai réel d'Écume, 26 novembre 2026 : la police des textes de la marque, une écriture
 * manuscrite, servait aussi aux titres des blocs, aux noms et aux codes de la palette, aux légendes et au badge ; tout
 * devenait illisible). Les titres de blocs, les libellés, les codes, les légendes et le badge gardent la police de la mise
 * en page de l'aperçu, en lettres simples : la disposition est la même pour toutes les marques, écrite dans une linéale
 * ronde ; la plus proche du catalogue du Studio est Nunito Sans. Les polices de la marque ne servent que dans leur
 * spécimen (bloc 03).
 */
export const POLICE_DE_MISE_EN_PAGE = { cle: "nunito_sans", poids: 400 } as const;
/** Les graisses de la mise en page : titres des blocs, noms des couleurs et badge en gras ; codes et légendes en normal. */
export const GRAISSE_DE_MISE_EN_PAGE = { titre: 800, nom: 800, code: 600, legende: 400 } as const;
/** La police de mise en page, à une taille et une graisse (toujours une police du catalogue, jamais celle de la marque). */
export const fonteDeMiseEnPage = (taille: number, poids: number = POLICE_DE_MISE_EN_PAGE.poids) => fonte(POLICE_DE_MISE_EN_PAGE, taille, poids);

// ---------------------------------------------------------------- le badge

/**
 * LE TEXTE DU BAS DU BADGE, comme sur la planche : la ligne descriptive du logo (la phrase sous le nom choisie par le
 * client) si elle existe ; sinon le métier court (« les plantes d'intérieur » : écrit sans son article sur le sceau) ; à
 * défaut des deux, la signature de la marque. Vide : rien en bas.
 */
export function texteDuBasDuBadge(o: { ligneDuLogo?: string | readonly string[] | null; metierCourt?: string | null; signature?: string | readonly string[] | null }): string {
  // Une phrase de plusieurs lignes (« A / B », des retours à la ligne, ou ses lignes) : ses lignes, à la suite, jamais le « / ».
  const enLignes = (t: string | readonly string[] | null | undefined) => (typeof t === "string" ? [t] : [...(t ?? [])]).flatMap((x) => lignesDuTexte(String(x))).join(" ");
  const ligne = enLignes(o.ligneDuLogo);
  if (ligne) return ligne;
  const court = (o.metierCourt ?? "").trim().replace(/^(la|le|les)\s+|^l['’]/i, "").trim();
  if (court) return court;
  return enLignes(o.signature);
}

/** LE BADGE, refait par le code : un anneau et un texte autour du symbole du logo ; jamais un pictogramme inventé. */
export async function badge(symbole: Buffer, couleur: string, haut: string, bas: string, police: Pick<PoliceChoisie, "cle" | "poids">, t = 1024): Promise<Buffer> {
  const c = createCanvas(t, t), x = c.getContext("2d");
  x.strokeStyle = couleur; x.lineWidth = t * 0.011; x.beginPath(); x.arc(t / 2, t / 2, t / 2 - t * 0.012, 0, Math.PI * 2); x.stroke();
  const s = await img(await teinte(symbole, couleur)), k = (t * 0.36) / Math.max(s.width, s.height);
  dessiner(x, s, (t - s.width * k) / 2, (t - s.height * k) / 2, s.width * k, s.height * k);
  const arc = (texte0: string, rayon: number, taille0: number, enHaut: boolean) => {
    if (!texte0) return;
    // Un texte long est écrit plus petit (jusqu'aux deux tiers), puis coupé à un mot entier : il tient toujours sur son
    // arc, sans lettres serrées les unes sur les autres.
    const largeur = (t: string, taille: number) => { x.font = fonte(police, taille, 700); return [...t].reduce((s, l) => s + x.measureText(l).width + taille * 0.12, 0); };
    const place = rayon * Math.PI * 0.9;
    let texte = texte0, taille = taille0;
    if (largeur(texte, taille) > place) taille = Math.max(taille0 * 0.66, (taille0 * place) / largeur(texte, taille0));
    while (largeur(texte, taille) > place && texte.includes(" ")) texte = texte.slice(0, texte.lastIndexOf(" ")).replace(/[\s,;:–—-]+$/, "");
    x.font = fonte(police, taille, 700); x.fillStyle = couleur; x.textAlign = "center"; x.textBaseline = "middle";
    const lettres = [...texte], larg = lettres.map((l) => x.measureText(l).width + taille * 0.12), total = larg.reduce((a, b) => a + b, 0);
    const angle = Math.min(total / rayon, Math.PI * 0.95);
    let a = (enHaut ? -Math.PI / 2 : Math.PI / 2) + (enHaut ? -angle / 2 : angle / 2);
    for (let i = 0; i < lettres.length; i++) {
      const pas = (larg[i] / total) * angle, m = a + (enHaut ? pas / 2 : -pas / 2);
      x.save(); x.translate(t / 2 + rayon * Math.cos(m), t / 2 + rayon * Math.sin(m)); x.rotate(enHaut ? m + Math.PI / 2 : m - Math.PI / 2); x.fillText(lettres[i], 0, 0); x.restore();
      a += enHaut ? pas : -pas;
    }
  };
  arc(haut.toUpperCase(), t * 0.39, t * 0.07, true);
  arc(bas.toUpperCase(), t * 0.4, t * 0.045, false);
  return c.encode("png");
}

/**
 * LES DIX VERSIONS DU LOGO (assembler-planche.py), en PNG haute définition sur fond transparent, à partir du logo au fond
 * retiré. Avec une séparation fiable : le compact, l'icône et le favicon montrent le symbole seul, l'horizontal le symbole
 * à gauche du nom, l'empilé le symbole au-dessus du nom (essai réel du 25 novembre 2026 : la condition d'avant, « l'icône
 * de la planche reprend le logo », gardait le logo complet partout dès que l'icône de la démonstration montrait un autre
 * dessin). Sans séparation fiable, le symbole est le logo complet (`symboleComplet`), et c'est dit.
 * `bas` : le texte du bas du badge (`texteDuBasDuBadge`).
 */
export async function versionsDuLogo(o: {
  logo: Buffer; separation: Separation; couleur: string; sombre: string; clair: string; monoClair: string; nom: string; bas: string; police: Pick<PoliceChoisie, "cle" | "poids">;
  /** Les tuiles du bloc 01 de l'aperçu (logo-1 à logo-10) : sans symbole séparable, le compact, l'icône, le favicon et le badge en sont repris. */
  tuiles?: ReadonlyMap<string, Buffer>;
}): Promise<{ versions: Record<VersionDuLogo, Buffer>; symboleComplet: boolean; symbole: Buffer; depuisLApercu: VersionDuLogo[] }> {
  const sep = o.separation.fiable && o.separation.nom ? o.separation : null;
  const r = await rgba(o.logo), bb = boiteOpaque(r), logo = bb ? await versPng(decouper(r, bb)) : o.logo;
  const symbole = sep ? sep.symbole : logo, nom = sep?.nom ?? null;
  const blanc = "#FFFFFF";
  // Sans symbole séparable : la marque et sa phrase pour l'horizontal ; le compact, l'icône, le favicon et le badge repris
  // de leur tuile de l'aperçu (jamais le logo entier en tout petit).
  const phrase = sep ? null : await separerLaPhrase(o.logo);
  const depuisLApercu: VersionDuLogo[] = [];
  const apercu = async (v: VersionDuLogoPre, sinon: () => Promise<Buffer>) => {
    const t = sep ? undefined : o.tuiles?.get(TUILE_DE_LA_VERSION[v]);
    if (!t) return sinon();
    depuisLApercu.push(v);
    return versionDepuisLApercu(t);
  };
  const versions: Record<VersionDuLogo, Buffer> = {
    "logo-principal": logo,
    "logo-horizontal": sep && nom ? (sep.sens === "gauche" ? logo : await horizontal(symbole, nom)) : phrase ? await marqueEtPhrase(phrase.marque, phrase.phrase) : logo,
    "logo-empile": sep && nom ? await empile(symbole, nom, 0.14) : logo,
    "logo-compact": await apercu("logo-compact", async () => symbole),
    icone: await apercu("icone", async () => carre(await teinte(symbole, blanc), o.sombre, 0.18, 0.2)),
    favicon: await apercu("favicon", async () => carre(await teinte(symbole, blanc), o.sombre, 0.22, 0.16)),
    "monochrome-fonce": await teinte(logo, "#222222"),
    "monochrome-clair": await teinte(logo, o.monoClair),
    // Sur fond sombre, le logo est toujours clair.
    inverse: await inverse(await teinte(logo, blanc), o.sombre),
    badge: await apercu("badge", async () => badge(symbole, o.couleur, o.nom, o.bas, o.police)),
  };
  // Le symbole de la marque (le site, l'avatar) : le compact repris de l'aperçu quand il l'est.
  return { versions, symboleComplet: !sep, symbole: depuisLApercu.includes("logo-compact") ? versions["logo-compact"] : symbole, depuisLApercu };
}

/** Les favicons 32, 64 et 512, et l'avatar des réseaux (le symbole sur le fond clair de la marque). */
export async function faviconsEtAvatar(favicon: Buffer, symbole: Buffer, clair: string): Promise<{ f32: Buffer; f64: Buffer; f512: Buffer; avatar: Buffer }> {
  const taille = (t: number) => sharp(favicon).resize(t, t, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" }).png().toBuffer();
  const s = await img(symbole), t = 1024, c = createCanvas(t, t), x = c.getContext("2d");
  x.fillStyle = clair; x.fillRect(0, 0, t, t);
  const k = (t * 0.62) / Math.max(s.width, s.height);
  dessiner(x, s, (t - s.width * k) / 2, (t - s.height * k) / 2, s.width * k, s.height * k);
  return { f32: await taille(32), f64: await taille(64), f512: await taille(512), avatar: await c.encode("png") };
}

// ---------------------------------------------------------------- la palette mesurée

/**
 * LA PALETTE MESURÉE sur la planche choisie (taille des cases) : pour chaque pastille, le disque est retrouvé autour de
 * sa place (les pixels qui s'écartent du fond du panneau), puis sa couleur est la MÉDIANE de ses pixels, canal par canal,
 * au cœur du disque. Ces codes font foi.
 */
export async function mesurerLaPalette(planche: Buffer, pastilles: readonly [number, number, number][]): Promise<string[]> {
  const m = await sharp(planche).metadata();
  const png = m.width === TAILLE_DEMO.w && m.height === TAILLE_DEMO.h ? planche : await sharp(planche).resize(TAILLE_DEMO.w, TAILLE_DEMO.h, { fit: "fill" }).png().toBuffer();
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = (x: number, y: number) => { const i = (y * W + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  return pastilles.map(([cx, cy, r]) => {
    const R = Math.round(r * 1.6), x0 = Math.max(0, cx - R), x1 = Math.min(W - 1, cx + R), y0 = Math.max(0, cy - R), y1 = Math.min(H - 1, cy + R);
    const bord: number[][] = [];
    for (let x = x0; x <= x1; x++) { bord.push(px(x, y0), px(x, y1)); }
    for (let y = y0; y <= y1; y++) { bord.push(px(x0, y), px(x1, y)); }
    const fond = [0, 1, 2].map((k) => mediane(bord.map((p) => p[k])));
    let sx = 0, sy = 0, n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const p = px(x, y); if (Math.hypot(p[0] - fond[0], p[1] - fond[1], p[2] - fond[2]) > 25) { sx += x; sy += y; n++; } }
    // Un disque presque de la couleur du fond (un blanc cassé sur un panneau clair) : sa place mesurée.
    const ccx = n > r * r ? sx / n : cx, ccy = n > r * r ? sy / n : cy, cr = r * 0.6;
    const c: number[][] = [[], [], []];
    for (let y = Math.round(ccy - cr); y <= Math.round(ccy + cr); y++) for (let x = Math.round(ccx - cr); x <= Math.round(ccx + cr); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || Math.hypot(x - ccx, y - ccy) > cr) continue;
      const p = px(x, y); c[0].push(p[0]); c[1].push(p[1]); c[2].push(p[2]);
    }
    return hexDe(c.map(mediane));
  });
}

/** Le passage en Lab (D65) d'un code couleur. */
function lab(h: string): [number, number, number] {
  const f = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = rgbDe(h).map(f);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const t = (v: number) => (v > 216 / 24389 ? Math.cbrt(v) : (24389 / 27 * v + 16) / 116);
  return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
}
/** L'écart perceptuel entre deux couleurs (CIEDE2000) : sous 2,3 l'œil ne voit pas la différence. */
export function ecartPerceptuel(a: string, b: string): number {
  const [L1, a1, b1] = lab(a), [L2, a2, b2] = lab(b), rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2, G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2, Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const hp = (x: number, y: number) => { if (x === 0 && y === 0) return 0; const h = Math.atan2(y, x) / rad; return h < 0 ? h + 360 : h; };
  const h1 = hp(ap1, b1), h2 = hp(ap2, b2), dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0; if (Cp1 * Cp2 !== 0) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh * rad) / 2), Lm = (L1 + L2) / 2, Cpm = (Cp1 + Cp2) / 2;
  let hm = h1 + h2; if (Cp1 * Cp2 !== 0) hm = Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const dTh = 30 * Math.exp(-(((hm - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), Sc = 1 + 0.045 * Cpm, Sh = 1 + 0.015 * Cpm * T, Rt = -Math.sin(2 * dTh * rad) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}
/**
 * LE SEUIL DES CODES ÉCRITS (26 novembre 2026) : un code écrit sous une pastille est gardé quand la couleur peinte en est
 * à un écart perceptuel de 10 au plus. Le dessinateur peint la pastille avec un grain, une lumière et une compression qui
 * la déplacent de quelques unités (sur l'essai réel d'Écume, de 0,7 à 3,2 entre les codes écrits et les couleurs
 * mesurées) ; 10, c'est encore la même couleur pour l'œil, la même famille de teinte ; au-delà, le code écrit ne décrit
 * plus la pastille (un code d'une autre pastille, une faute de frappe) et la mesure fait foi.
 */
export const SEUIL_DU_CODE_ECRIT = 10;
/** Les codes couleur écrits sur la case de la palette, lus par l'inventaire, dans l'ordre (de gauche à droite). */
export const codesEcritsDeLaPalette = (textes: readonly string[]): string[] => textes.flatMap((t) => [...t.matchAll(/#[0-9A-F]{6}\b/gi)].map((m) => m[0].toUpperCase()));
/**
 * LA PALETTE RETENUE (essai réel d'Écume, 26 novembre 2026 : l'aperçu écrivait #C44912, #D97A52, #F6E8DA, #A7B89B,
 * #8C6F4E, la planche en vrai écrivait les mesures, #C7470C… ; le client a vu les premiers). Pour chaque pastille : le code
 * écrit dessous sur l'aperçu, quand la couleur peinte en est proche (`SEUIL_DU_CODE_ECRIT`), et la pastille est peinte de
 * ce code ; la mesure seulement si l'aperçu n'écrit pas de code, ou si le code écrit est loin de la couleur peinte. Ces
 * codes font foi partout ensuite (la marque, le site, l'onglet Marque).
 */
export function paletteRetenue(mesurees: readonly string[], ecrits: readonly string[]): { hex: string[]; source: ("ecrit" | "mesure")[]; ecarts: (number | null)[] } {
  const hex: string[] = [], source: ("ecrit" | "mesure")[] = [], ecarts: (number | null)[] = [];
  // Les codes écrits ne valent, dans l'ordre, que s'il y en a un par pastille.
  const parPastille = ecrits.length === mesurees.length ? ecrits : [];
  mesurees.forEach((m, i) => {
    const e = parPastille[i], d = e ? ecartPerceptuel(m, e) : null;
    ecarts.push(d == null ? null : Math.round(d * 10) / 10);
    if (e && d != null && d <= SEUIL_DU_CODE_ECRIT) { hex.push(e); source.push("ecrit"); } else { hex.push(m.toUpperCase()); source.push("mesure"); }
  });
  return { hex, source, ecarts };
}

export type RolesDeLaPalette = { light: string; dark: string; primary: string; secondary: string; accent: string };
/**
 * LES RÔLES, donnés par le code : le fond est la plus claire ; le bouton est la plus saturée des autres (la couleur qui
 * porte la marque) ; le texte est la plus foncée de ce qui reste, ou l'encre de la planche si elle est trop claire pour
 * être lue (luminance au-dessus de 0,35) ; la surface est la plus claire du reste, l'accent la dernière.
 */
export function rolesDeLaPalette(hex: readonly string[], encre = "#1C2A24"): RolesDeLaPalette {
  const l = [...new Set(hex.map((h) => h.toUpperCase()))];
  while (l.length < 5) l.push(l.length % 2 ? "#FFFFFF" : encre);
  const light = [...l].sort((a, b) => luminance(b) - luminance(a))[0];
  const primary = l.filter((h) => h !== light).sort((a, b) => saturation(b) - saturation(a) || luminance(a) - luminance(b))[0];
  const reste = l.filter((h) => h !== light && h !== primary).sort((a, b) => luminance(a) - luminance(b));
  const dark0 = reste[0], reste2 = reste.slice(1).sort((a, b) => luminance(b) - luminance(a));
  return { light, dark: luminance(dark0) > 0.35 ? encre : dark0, primary, secondary: reste2[0] ?? light, accent: reste2[1] ?? dark0 };
}
/** La couleur du monochrome clair : la couleur de la palette entre clair et foncé la plus proche d'une teinte douce. */
export const monoClairDe = (hex: readonly string[]) => [...hex].filter((h) => luminance(h) > 0.4 && luminance(h) < 0.85).sort((a, b) => Math.abs(luminance(a) - 0.62) - Math.abs(luminance(b) - 0.62))[0] ?? "#A0A0A0";

// ---------------------------------------------------------------- l'assemblage en 3072 × 4608

export type BlocDeTexte = { lignes: string[] };
export type AssemblageEntree = {
  /** La planche de démonstration choisie (1536 × 2304). */
  demo: Buffer;
  /** Les cases recalées, sur la démonstration. */
  boites: ReadonlyMap<string, Boite>;
  pastilles: readonly [number, number, number][];
  /** Les images refaites et gardées, au format final ; une image absente garde l'aperçu agrandi. */
  images: ReadonlyMap<NomElement, Buffer>;
  versions: Record<VersionDuLogo, Buffer>;
  palette: { hex: string; nom: string; mots: string[] }[];
  polices: { titres: PoliceChoisie; textes: PoliceChoisie };
  signature: string[];
  titres: ReadonlyMap<string, string>;
  /** Les blocs à redessiner (null : le décor est gardé, ses textes ayant passé le contrôle). */
  blocs: ReadonlyMap<"ton" | "seo", BlocDeTexte | null>;
  encre: string;
  /** Les versions reprises de l'aperçu (`versionsDuLogo`, `depuisLApercu`) : leur tuile garde l'aperçu agrandi, comme le décor. */
  tuilesDeLApercu?: readonly VersionDuLogo[];
  /** Tous les textes du haut sont portés par le logo (son nom, sa phrase) : le haut est effacé en entier, rien n'y est ajouté. */
  hautDansLeLogo?: boolean;
  /** Les phrases de présentation des deux polices, lues sous leur nom dans le spécimen de l'aperçu (titres, textes). */
  typos?: readonly [string | null | undefined, string | null | undefined];
};
/**
 * LA ZONE D'UN TITRE À REDESSINER, mesurée sur l'aperçu (essai réel d'Écume, 26 novembre 2026 : aux blocs 08 et 09,
 * l'ancien titre restait visible sous le nouveau, et au bloc 10 un « r » égaré traînait au bout ; la planche choisie ne
 * pose pas ses titres au pixel près de la case fixe). Partant de la case du titre : les lignes voisines qui portent de
 * l'encre (un point à plus de 50 niveaux du fond) sont prises, jusqu'à 10 pixels au-dessus et au-dessous ; puis, vers la
 * droite, les colonnes d'encre qui suivent avec un écart de 3 pixels au plus (une lettre du même mot ; l'espace avant le
 * tiret du sous-titre est plus large), jusqu'à 120 pixels. Rend la zone (taille de l'aperçu) ; elle est effacée en entier,
 * avec 2 pixels de marge, avant d'écrire.
 */
export function zoneDuTitre(data: Buffer, W: number, H: number, b: Boite, fond: string): Boite {
  const f = rgbDe(fond), encre = (x: number, y: number) => { const i = (y * W + x) * 3; return Math.max(Math.abs(data[i] - f[0]), Math.abs(data[i + 1] - f[1]), Math.abs(data[i + 2] - f[2])) > 50; };
  const ligne = (y: number, x0: number, x1: number) => { for (let x = x0; x < x1; x++) if (encre(x, y)) return true; return false; };
  const [x0, , x1] = b;
  let y0 = b[1], y1 = b[3];
  for (let k = 0; k < 10 && y0 > 0 && ligne(y0 - 1, x0, x1); k++) y0--;
  for (let k = 0; k < 10 && y1 < H && ligne(y1, x0, x1); k++) y1++;
  const colonne = (x: number) => { for (let y = y0; y < y1; y++) if (encre(x, y)) return true; return false; };
  // L'encre réelle : de sa première colonne dans la case à sa dernière, au-delà de la case tant que les lettres se suivent.
  let debut = -1, fin = -1, vide = 0;
  for (let x = x0; x < Math.min(W, b[2] + 120); x++) {
    if (colonne(x)) { if (debut < 0) debut = x; fin = x + 1; vide = 0; } else if (x >= x1 && ++vide > 3) break;
  }
  return debut < 0 ? [x0, y0, x1, y1] : [debut, y0, fin, y1];
}
/**
 * La hauteur des lettres de l'ancien titre : les lignes de la zone où l'encre est dense (au moins 8 % de la ligne la plus
 * chargée ; un accent isolé n'en fait pas partie). Rend le haut et le bas des capitales, en pixels de l'aperçu.
 */
export function lettresDuTitre(data: Buffer, W: number, z: Boite, fond: string): { haut: number; bas: number } {
  const f = rgbDe(fond), compte: number[] = [];
  for (let y = z[1]; y < z[3]; y++) { let n = 0; for (let x = z[0]; x < z[2]; x++) { const i = (y * W + x) * 3; if (Math.max(Math.abs(data[i] - f[0]), Math.abs(data[i + 1] - f[1]), Math.abs(data[i + 2] - f[2])) > 50) n++; } compte.push(n); }
  const max = Math.max(1, ...compte), dense = compte.map((n) => n >= max * 0.08);
  // Le plus long bloc de lignes denses (les capitales).
  let best: [number, number] = [0, compte.length], deb = -1;
  for (let i = 0; i <= dense.length; i++) { if (i < dense.length && dense[i]) { if (deb < 0) deb = i; } else if (deb >= 0) { if (i - deb > best[1] - best[0] || best[1] - best[0] === compte.length) best = [deb, i]; deb = -1; } }
  return { haut: z[1] + best[0], bas: z[1] + best[1] };
}
/**
 * LE FOND DE L'APERÇU, SANS SON ENCRE (26 novembre 2026, essai réel d'Écume : le haut effacé en aplat perdait les ombres de
 * feuillage). Une zone de l'aperçu à nettoyer garde son fond : les points d'encre (à plus de `seuil` niveaux du fond, élargis
 * de 4 pixels) sont remplacés par le fond voisin (moyenne floue des seuls points de fond, rayon d'une douzaine de pixels, puis d'une quarantaine au cœur des grandes lettres) ;
 * les autres points restent ceux de l'aperçu. Rend la zone agrandie deux fois (PNG), prête à poser.
 */
/**
 * UN POINT D'ENCRE sur le fond d'une case de l'aperçu : loin du fond (plus de `seuil` niveaux) ET d'une autre couleur (la
 * vivacité, écart entre le plus fort et le plus faible canal, différente de plus de 60) ou nettement plus foncé ou plus
 * clair (plus de 120 niveaux de luminosité). Une ombre douce de feuillage, de la même couleur que le fond en plus sombre,
 * n'est pas de l'encre : elle reste.
 */
export function estEncre(r: number, g: number, b: number, f: readonly number[], seuil: number): boolean {
  if (Math.max(Math.abs(r - f[0]), Math.abs(g - f[1]), Math.abs(b - f[2])) <= seuil) return false;
  const viv = Math.max(r, g, b) - Math.min(r, g, b), vivF = Math.max(f[0], f[1], f[2]) - Math.min(f[0], f[1], f[2]);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b, lumF = 0.299 * f[0] + 0.587 * f[1] + 0.114 * f[2];
  return Math.abs(viv - vivF) > 60 || Math.abs(lum - lumF) > 120;
}
export async function fondSansEncre(data: Buffer, W: number, b: Boite, fond: string, seuil = 40): Promise<Buffer> {
  const w = b[2] - b[0], h = b[3] - b[1], f = rgbDe(fond), n = w * h;
  const px = Buffer.alloc(n * 3), encre = new Uint8Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((b[1] + y) * W + b[0] + x) * 3, j = y * w + x;
    px[j * 3] = data[i]; px[j * 3 + 1] = data[i + 1]; px[j * 3 + 2] = data[i + 2];
    encre[j] = estEncre(data[i], data[i + 1], data[i + 2], f, seuil) ? 1 : 0;
  }
  const masque = new Uint8Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (encre[y * w + x]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w) masque[yy * w + xx] = 1; }
  const connu = Buffer.alloc(n * 3), poids = Buffer.alloc(n * 3);
  for (let j = 0; j < n; j++) if (!masque[j]) { connu[j * 3] = px[j * 3]; connu[j * 3 + 1] = px[j * 3 + 1]; connu[j * 3 + 2] = px[j * 3 + 2]; poids.fill(255, j * 3, j * 3 + 3); }
  const flou = async (buf: Buffer, sigma: number) => { const r = await sharp(buf, { raw: { width: w, height: h, channels: 3 } }).blur(sigma).raw().toBuffer({ resolveWithObject: true }); if (r.info.channels !== 3) throw new Error("flou : 3 canaux attendus"); return r.data; };
  // Deux rayons : le proche (une douzaine de pixels), puis le large (une quarantaine) au cœur des grandes lettres.
  const A = await flou(connu, 12), K = await flou(poids, 12), A2 = await flou(connu, 40), K2 = await flou(poids, 40);
  const out = Buffer.alloc(n * 3);
  for (let j = 0; j < n; j++) for (let k = 0; k < 3; k++) out[j * 3 + k] = !masque[j] ? px[j * 3 + k] : K[j * 3] > 24 ? Math.min(255, Math.round((A[j * 3 + k] * 255) / K[j * 3])) : K2[j * 3] > 2 ? Math.min(255, Math.round((A2[j * 3 + k] * 255) / K2[j * 3])) : f[k];
  return sharp(out, { raw: { width: w, height: h, channels: 3 } }).resize(w * S, h * S, { kernel: "lanczos3" }).png().toBuffer();
}
/** Pose le fond de l'aperçu sans son encre sur une zone de la planche en vrai. */
async function nettoyer(x: SKRSContext2D, data: Buffer, W: number, b: Boite, fond: string, seuil?: number) {
  const z: Boite = [Math.max(0, Math.round(b[0])), Math.max(0, Math.round(b[1])), Math.min(W, Math.round(b[2])), Math.round(b[3])];
  if (z[2] - z[0] < 2 || z[3] - z[1] < 2) return;
  x.drawImage(await img(await fondSansEncre(data, W, z, fond, seuil)), z[0] * S, z[1] * S, (z[2] - z[0]) * S, (z[3] - z[1]) * S);
}
/** La boîte de l'encre d'une case de l'aperçu (un point à plus de 60 niveaux de son fond) ; null si presque rien. */
function boiteDEncreDeLApercu(data: Buffer, W: number, b: Boite, fond: string): Boite | null {
  const f = rgbDe(fond);
  let a = b[2], c = b[3], d = -1, e = -1;
  for (let y = b[1]; y < b[3]; y++) for (let x = b[0]; x < b[2]; x++) {
    const i = (y * W + x) * 3;
    if (estEncre(data[i], data[i + 1], data[i + 2], f, 60)) { if (x < a) a = x; if (y < c) c = y; if (x > d) d = x; if (y > e) e = y; }
  }
  return d < 0 ? null : [a, c, d + 1, e + 1];
}
const S = ECHELLE;
const X = (b: Boite): Boite => [b[0] * S, b[1] * S, b[2] * S, b[3] * S];
/** La couleur médiane du pourtour intérieur d'une case : le fond de son panneau. */
function fondDe(data: Buffer, W: number, b: Boite): string {
  const c: number[][] = [[], [], []], add = (x: number, y: number) => { const i = (y * W + x) * 3; c[0].push(data[i]); c[1].push(data[i + 1]); c[2].push(data[i + 2]); };
  for (let x = b[0] + 2; x < b[2] - 2; x += 2) { add(x, b[1] + 2); add(x, b[3] - 3); }
  for (let y = b[1] + 2; y < b[3] - 2; y += 2) { add(b[0] + 2, y); add(b[2] - 3, y); }
  return hexDe(c.map(mediane));
}
/** La marge la plus petite d'une version du logo dans sa tuile (part de chaque côté). */
export const MARGE_MIN_DE_TUILE = 0.05;
/**
 * La place d'une version du logo dans sa tuile : réduite si besoin, jamais agrandie au-delà de la tuile, jamais déformée
 * (même rapport des côtés), jamais coupée ; elle tient entière dans la tuile moins sa marge (au moins MARGE_MIN_DE_TUILE),
 * en pixels entiers, pour qu'aucun bord adouci ne déborde.
 */
export function poseDansLaTuile(w: number, h: number, b: Boite, marge = MARGE_MIN_DE_TUILE): { x: number; y: number; w: number; h: number; interieur: Boite } {
  const W = b[2] - b[0], H = b[3] - b[1], m = Math.max(marge, MARGE_MIN_DE_TUILE);
  const ix0 = Math.ceil(b[0] + W * m), iy0 = Math.ceil(b[1] + H * m), ix1 = Math.floor(b[2] - W * m), iy1 = Math.floor(b[3] - H * m);
  const k = Math.min((ix1 - ix0) / w, (iy1 - iy0) / h);
  const pw = Math.max(1, Math.floor(w * k)), ph = Math.max(1, Math.floor(h * k));
  return { x: ix0 + Math.floor((ix1 - ix0 - pw) / 2), y: iy0 + Math.floor((iy1 - iy0 - ph) / 2), w: pw, h: ph, interieur: [ix0, iy0, ix1, iy1] };
}
async function poserDansLaTuile(x: SKRSContext2D, png: Buffer, b: Boite, marge: number) {
  const i = await img(png), r = poseDansLaTuile(i.width, i.height, b, marge);
  x.save(); x.beginPath(); x.rect(r.interieur[0], r.interieur[1], r.interieur[2] - r.interieur[0], r.interieur[3] - r.interieur[1]); x.clip();
  dessiner(x, i, r.x, r.y, r.w, r.h); x.restore();
}
/** Une version posée seule dans sa tuile, sur fond transparent (canevas de la tuile et d'un pourtour) : pour les contrôles. */
export async function rendreDansLaTuile(png: Buffer, tuile: Boite, marge: number, pourtour = 16): Promise<{ png: Buffer; interieur: Boite }> {
  const b: Boite = [pourtour, pourtour, pourtour + tuile[2] - tuile[0], pourtour + tuile[3] - tuile[1]];
  const c = createCanvas(b[2] + pourtour, b[3] + pourtour), x = c.getContext("2d");
  await poserDansLaTuile(x, png, b, marge);
  return { png: await c.encode("png"), interieur: poseDansLaTuile(1, 1, b, marge).interieur };
}
async function poser(x: SKRSContext2D, png: Buffer, b: Boite, marge = 0) {
  const i = await img(png), W = b[2] - b[0], H = b[3] - b[1], k = Math.min((W * (1 - 2 * marge)) / i.width, (H * (1 - 2 * marge)) / i.height);
  dessiner(x, i, b[0] + (W - i.width * k) / 2, b[1] + (H - i.height * k) / 2, i.width * k, i.height * k);
}
async function couvrir(x: SKRSContext2D, png: Buffer, b: Boite, rayon = 14 * S) {
  const i = await img(png), W = b[2] - b[0], H = b[3] - b[1], k = Math.max(W / i.width, H / i.height), sw = W / k, sh = H / k;
  x.save(); arrondi(x, b[0], b[1], W, H, rayon); x.clip();
  x.drawImage(i, (i.width - sw) / 2, (i.height - sh) / 2, sw, sh, b[0], b[1], W, H); x.restore();
}
/** La part coupée de chaque côté quand une image de w × h couvre une case de W × H (sans être déformée). */
export const coupeDuPleinCadre = (w: number, h: number, W: number, H: number) => { const k = Math.max(W / w, H / h); return Math.max(1 - W / k / w, 1 - H / k / h) / 2; };
/** Le bandeau d'ouverture n'est posé en plein cadre que s'il n'y perd pas plus de 1,5 % de chaque côté. */
export const COUPE_MAX_DU_BANDEAU = 0.015;
/** Les mots d'une couleur, séparés par des virgules, renvoyés à la ligne pour tenir dans la largeur donnée (trois lignes au plus). */
export function lignesDesMots(x: SKRSContext2D, mots: readonly string[], f: string, largeur: number): string[] {
  x.font = f;
  const out: string[] = [];
  for (const [i, m] of mots.map((w) => w.trim()).filter(Boolean).entries()) {
    const suite = i < mots.length - 1 ? `${m},` : m, cur = out.at(-1);
    if (cur != null && x.measureText(`${cur} ${suite}`).width <= largeur) out[out.length - 1] = `${cur} ${suite}`; else out.push(suite);
  }
  return out.slice(0, 3).map((l, i, a) => (i === a.length - 1 ? l.replace(/,$/, "") : l));
}
function texte(x: SKRSContext2D, t: string, px: number, py: number, f: string, couleur: string, align: CanvasTextAlign = "left", maxW?: number) {
  x.font = f; x.fillStyle = couleur; x.textAlign = align; x.textBaseline = "middle";
  if (maxW) x.fillText(t, px, py, maxW); else x.fillText(t, px, py);
}

/**
 * L'ASSEMBLAGE (assembler-planche.py) : la démonstration agrandie deux fois sert de décor ; le haut (logo et signature),
 * les dix versions du logo, la palette mesurée et les typographies sont posés par le code ; les images refaites sont
 * posées dans leurs cases (photos en plein cadre, écrans et publications ENTIERS, à leurs proportions) ; les titres et les
 * blocs à redessiner le sont avec les textes de l'inventaire. Rend la planche en vrai, 3072 × 4608.
 */
/** La part haute de la case « haut » réservée au logo (la signature commence en dessous, vers 79 %). */
export const HAUT_DU_LOGO = 0.76;
export async function assemblerLaPlanche(o: AssemblageEntree): Promise<Buffer> {
  const demoPng = (await sharp(o.demo).metadata()).width === TAILLE_DEMO.w ? o.demo : await sharp(o.demo).resize(TAILLE_DEMO.w, TAILLE_DEMO.h, { fit: "fill" }).png().toBuffer();
  const { data: d0, info } = await sharp(demoPng).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const fond = (b: Boite) => fondDe(d0, info.width, b);
  const fondAutour = (b: Boite) => fondDe(d0, info.width, [Math.max(0, b[0] - 5), Math.max(0, b[1] - 5), Math.min(info.width, b[2] + 5), Math.min(info.height, b[3] + 5)]);
  const grand = await sharp(demoPng).resize(TAILLE_EN_VRAI.w, TAILLE_EN_VRAI.h, { kernel: "lanczos3" }).png().toBuffer();
  const c = createCanvas(TAILLE_EN_VRAI.w, TAILLE_EN_VRAI.h), x = c.getContext("2d");
  x.drawImage(await img(grand), 0, 0);
  const B = (n: string) => o.boites.get(n);
  // Les polices de la marque ne servent que dans leur spécimen (bloc 03) ; tout le reste est écrit dans la police de mise
  // en page de l'aperçu, en lettres simples.
  const pT = o.polices.titres, pX = o.polices.textes, gris = "#5A605C", mp = fonteDeMiseEnPage, G = GRAISSE_DE_MISE_EN_PAGE;

  // Le haut : le logo principal et la signature.
  const haut = B("haut");
  if (haut) {
    const h = X(haut), W = h[2] - h[0], H = h[3] - h[1], f = fond(haut), signature = o.signature.filter((l) => l.trim());
    // Sans signature lue, seule la place du logo est effacée : la ligne de la démonstration sous le logo est gardée telle
    // quelle (jamais une case vidée de son texte). Quand tous les textes du haut sont portés par le logo, le haut est
    // effacé en entier et le logo est posé à la place exacte du logo de l'aperçu (la boîte de son encre) : rien ne s'ajoute.
    const ink = o.hautDansLeLogo && !signature.length ? boiteDEncreDeLApercu(d0, info.width, haut, f) : null;
    // Le fond de l'aperçu (ses ombres de feuillage) est gardé : seule l'encre de l'ancien logo et de ses lignes est retirée.
    await nettoyer(x, d0, info.width, [haut[0], haut[1], haut[2], haut[1] + (signature.length || o.hautDansLeLogo ? haut[3] - haut[1] : (haut[3] - haut[1]) * HAUT_DU_LOGO)], f);
    const plausible = ink && (ink[2] - ink[0]) * (ink[3] - ink[1]) >= (haut[2] - haut[0]) * (haut[3] - haut[1]) * 0.1;
    await poser(x, o.versions["logo-principal"], plausible ? X(ink!) : [h[0] + W * 0.146, h[1] + H * 0.078, h[2] - W * 0.142, h[1] + H * 0.727]);
    signature.slice(0, 2).forEach((l, i) => texte(x, l, h[0] + W / 2, h[1] + H * (0.794 + i * 0.067), mp(H * 0.044, G.code), o.encre, "center", W * 0.9));
  }
  // Le bandeau d'ouverture de la planche.
  const ob = B("ouverture-planche"), ouv = o.images.get("ouverture-planche");
  // Déjà rogné avant sa relecture (`rognerLesMargesBlanches`), puis posé sans jamais être déformé : en plein cadre quand
  // le plein cadre n'en coupe presque rien ; sinon entier, sur le fond de la case, pour qu'aucun texte près d'un bord ne
  // soit coupé.
  if (ob && ouv) {
    const r = await rognerLesMargesBlanches(ouv), m = await sharp(r).metadata(), b = X(ob);
    if (coupeDuPleinCadre(m.width!, m.height!, b[2] - b[0], b[3] - b[1]) <= COUPE_MAX_DU_BANDEAU) await couvrir(x, r, b, 0);
    else { x.fillStyle = fond(ob); x.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); await poser(x, r, b); }
  }
  // Les dix versions du logo.
  const MARGES: Partial<Record<VersionDuLogo, number>> = { favicon: 0.3, icone: 0.2, badge: 0.06, inverse: 0.05 };
  // La rangée des tuiles est d'abord effacée (fond de la page, un peu au-delà des tuiles) : un logo de la démonstration
  // plus grand que sa tuile n'en dépasse plus ; le trait entre le favicon et les monochromes est redessiné.
  const tuiles = VERSIONS_DU_LOGO.map((_, i) => B(`logo-${i + 1}`)).filter((t): t is Boite => !!t);
  if (tuiles.length) {
    const u: Boite = [Math.max(0, Math.min(...tuiles.map((t) => t[0])) - 8), Math.max(0, Math.min(...tuiles.map((t) => t[1])) - 6), Math.min(TAILLE_DEMO.w, Math.max(...tuiles.map((t) => t[2])) + 8), Math.min(TAILLE_DEMO.h, Math.max(...tuiles.map((t) => t[3])) + 6)];
    const ux = X(u);
    x.fillStyle = fond(u); x.fillRect(ux[0], ux[1], ux[2] - ux[0], ux[3] - ux[1]);
    const t6 = B("logo-6"), t7 = B("logo-7");
    if (t6 && t7 && t7[0] - t6[2] > 6) { const sx = ((t6[2] + t7[0]) / 2) * S; x.strokeStyle = "#D7D3CB"; x.lineWidth = 2; x.beginPath(); x.moveTo(sx, (t6[1] + 6) * S); x.lineTo(sx, (t6[3] + 14) * S); x.stroke(); }
  }
  const grandImg = o.tuilesDeLApercu?.length ? await img(grand) : null;
  for (const [i, v] of VERSIONS_DU_LOGO.entries()) {
    const t = B(`logo-${i + 1}`);
    if (!t) continue;
    const f = fond(t), b = X(t);
    // Une version reprise de l'aperçu : sa tuile agrandie, telle que le client l'a vue.
    if (grandImg && o.tuilesDeLApercu!.includes(v)) { x.drawImage(grandImg, b[0], b[1], b[2] - b[0], b[3] - b[1], b[0], b[1], b[2] - b[0], b[3] - b[1]); continue; }
    x.fillStyle = f; arrondi(x, b[0], b[1], b[2] - b[0], b[3] - b[1], 20 * S); x.fill();
    // Chaque version tient entière dans sa tuile, avec sa marge : réduite si besoin, jamais déformée ni coupée.
    await poserDansLaTuile(x, o.versions[v], b, MARGES[v] ?? 0.14);
  }
  // La palette, couleurs mesurées sur la planche.
  const pal = B("palette");
  if (pal) {
    const b = X(pal);
    x.fillStyle = fond(pal); x.fillRect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    o.pastilles.forEach(([cx, cy, r], i) => {
      const p = o.palette[i];
      if (!p) return;
      x.beginPath(); x.arc(cx * S, cy * S, r * S, 0, Math.PI * 2); x.fillStyle = p.hex; x.fill();
      if (luminance(p.hex) > 0.9) { x.strokeStyle = "#E4E0D8"; x.lineWidth = 2; x.stroke(); }
      if (p.nom) texte(x, p.nom, cx * S, (cy + 68) * S, mp(26, G.nom), o.encre, "center", r * 2.4 * S);
      texte(x, p.hex, cx * S, (cy + 89) * S, mp(24, G.code), gris, "center");
      // Les mots de l'aperçu, tous (« Chaleur, énergie, bienveillance »), à la suite, renvoyés à la ligne comme sur l'aperçu.
      lignesDesMots(x, p.mots, mp(23, G.legende), r * 2.4 * S).forEach((m, k) => texte(x, m, cx * S, (cy + 112 + k * 18) * S, mp(23, G.legende), gris, "center", r * 2.4 * S));
    });
  }
  // Les typographies, avec les vraies polices du catalogue.
  const ty = B("typographies");
  if (ty) {
    const b = X(ty), W = b[2] - b[0], H = b[3] - b[1];
    x.fillStyle = fond(ty); x.fillRect(b[0], b[1], W, H);
    for (const [k, p] of [[0, pT], [1, pX]] as const) {
      const x0 = b[0] + (k === 0 ? 22 * S : W * 0.567);
      texte(x, p.famille, x0, b[1] + 30 * S, fonte(p, 64, k === 0 ? p.poids : 500), o.encre, "left", W * 0.42);
      // Sa phrase de présentation, comme sur l'aperçu, en police de mise en page.
      const desc = o.typos?.[k]?.trim();
      if (desc) texte(x, desc, x0, b[1] + 62 * S, mp(24, G.legende), gris, "left", W * 0.42);
      for (const [i, l] of ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz", "0123456789"].entries()) texte(x, l, x0, b[1] + (122 + i * 22) * S, fonte(p, 28, 400), o.encre, "left", W * 0.42);
    }
    x.strokeStyle = "#D7D3CB"; x.lineWidth = 2; x.beginPath(); x.moveTo(b[0] + W * 0.519, b[1] + 22 * S); x.lineTo(b[0] + W * 0.519, b[3] - 15 * S); x.stroke();
  }
  // Les images refaites : photos en plein cadre ; écrans et publications entiers, à leurs proportions.
  for (const n of ["produit-1", "produit-2", "produit-3", "emballage", "reference-1", "reference-2", "reference-3", "reference-4", "reference-5", "reference-6"] as const) {
    const b = B(n), im = o.images.get(n);
    if (b && im) await couvrir(x, im, X(b));
  }
  for (const n of ["site-ordinateur", "site-telephone", "publication-1x1", "publication-4x5", "publication-9x16"] as const) {
    const b = B(n), im = o.images.get(n);
    if (!b || !im) continue;
    const bb = X(b);
    // Le fond de la case : celui qui l'entoure sur l'aperçu (la page ou le panneau), jamais une couleur prise dans l'image.
    x.fillStyle = fondAutour(b); arrondi(x, bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1], 18); x.fill();
    await poser(x, im, bb);
  }
  // Les titres, redessinés avec les textes de l'inventaire.
  for (const [n, t] of o.titres) {
    const b = B(n);
    if (!b || !t.trim()) continue;
    const f = fond(b), z = zoneDuTitre(d0, info.width, info.height, b, f), l = lettresDuTitre(d0, info.width, z, f);
    // Le titre redessiné a la hauteur de capitales de l'ancien, posé sur sa ligne de base, sans lettres espacées.
    const T = t.toUpperCase(), capH = Math.max(4, l.bas - l.haut) * S;
    x.font = mp(100, G.titre);
    const m100 = x.measureText(T), cap100 = Math.max(1, x.measureText("H").actualBoundingBoxAscent);
    let taille = (100 * capH) / cap100;
    const largeur = (m100.width * taille) / 100, place = (z[2] - z[0]) * S;
    // Un ancien titre qui dépasse à droite de sa case a été lu coupé par l'inventaire (« PACKAGING & SUPPORT » pour
    // « PACKAGING & SUPPORTS ») ; un texte lu nettement plus court que lui aussi : il ne le remplace jamais, l'aperçu garde
    // son titre tel quel, rien n'est perdu ni inventé.
    if (z[2] > b[2] + 2 || largeur < place * 0.9) continue;
    if (largeur > place) taille *= place / largeur;
    // La zone de l'ancien titre, mesurée sur l'aperçu, et sa case sont effacées en entier (2 pixels de marge) avant d'écrire.
    const zz = X([Math.min(z[0], b[0]) - 2, Math.min(z[1], b[1]) - 2, Math.max(z[2], b[2]) + 2, Math.max(z[3], b[3]) + 2]);
    await nettoyer(x, d0, info.width, [zz[0] / S, zz[1] / S, zz[2] / S, zz[3] / S], f, 50);
    x.font = mp(taille, G.titre); x.fillStyle = o.encre; x.textAlign = "left"; x.textBaseline = "alphabetic";
    x.fillText(T, z[0] * S, l.bas * S, (z[2] - z[0]) * S);
  }
  // Les blocs de texte qui n'ont pas passé le contrôle : redessinés avec les textes corrigés.
  for (const [n, bloc] of o.blocs) {
    const b = B(n);
    const lignes = (bloc?.lignes ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 12);
    // Un bloc sans aucune ligne n'est jamais effacé : le décor de la démonstration reste.
    if (!b || !lignes.length) continue;
    const bb = X(b), W = bb[2] - bb[0], H = bb[3] - bb[1];
    await nettoyer(x, d0, info.width, b, fond(b), 50);
    const pas = Math.min(H / (lignes.length + 1), 34 * S);
    lignes.forEach((l, i) => texte(x, l, bb[0] + 20 * S, bb[1] + pas * (i + 0.9), i === 0 ? mp(pas * 0.62, G.titre) : mp(pas * 0.5, G.legende), i === 0 ? o.encre : gris, "left", W - 40 * S));
  }
  return c.encode("png");
}

/**
 * LE ROGNAGE AU CONTENU (26 novembre 2026, onglet Marque d'Écume ; le propriétaire : « Sinon c'est pas trop mal juste mieux
 * découper les images ») : une image à télécharger ou à montrer est découpée au plus juste de son contenu. Le fond est mesuré
 * (la couleur médiane du pourtour) ; les lignes et les colonnes du bord qui n'ont que ce fond (à 14 niveaux près sur 98 % de
 * leurs points) partent, jamais une ligne du milieu ; il reste une marge minime (`marge` pixels, de son vrai fond). Une
 * image sans fond autour (une photo pleine) ne change pas.
 */
export async function rognerAuContenu(png: Buffer, marge = 6): Promise<Buffer> {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // Le fond mesuré : la couleur la plus fréquente du pourtour (par paliers de 8 niveaux), puis la médiane de ses points.
  const compte = new Map<number, number[][]>();
  const add = (x: number, y: number) => { const i = (y * W + x) * 3, k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3); const l = compte.get(k) ?? []; l.push([data[i], data[i + 1], data[i + 2]]); compte.set(k, l); };
  for (let x = 0; x < W; x += 2) { add(x, 0); add(x, 1); add(x, H - 1); add(x, H - 2); }
  for (let y = 0; y < H; y += 2) { add(0, y); add(1, y); add(W - 1, y); add(W - 2, y); }
  const dominante = [...compte.values()].sort((a, b) => b.length - a.length)[0] ?? [[255, 255, 255]];
  const pourtour = [...compte.values()].reduce((n, l) => n + l.length, 0);
  // Une image pleine (aucune couleur ne domine son pourtour) ne change pas.
  if (dominante.length < pourtour * 0.25) return png;
  const f = [0, 1, 2].map((k) => mediane(dominante.map((p) => p[k])));
  // Le contenu : un point à plus de 24 niveaux du fond (un léger changement de teinte, la page autour d'un panneau, n'en est pas).
  const contenu = (x: number, y: number) => { const i = (y * W + x) * 3; return Math.max(Math.abs(data[i] - f[0]), Math.abs(data[i + 1] - f[1]), Math.abs(data[i + 2] - f[2])) > 24; };
  const parLigne = new Array<number>(H).fill(0), parColonne = new Array<number>(W).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (contenu(x, y)) { parLigne[y]++; parColonne[x]++; }
  // Une ligne ou une colonne ne compte que si elle porte au moins 3 points de contenu (un grain isolé n'en est pas).
  const y0 = parLigne.findIndex((n) => n >= 3), x0 = parColonne.findIndex((n) => n >= 3);
  if (y0 < 0 || x0 < 0) return png;
  const y1 = H - [...parLigne].reverse().findIndex((n) => n >= 3), x1 = W - [...parColonne].reverse().findIndex((n) => n >= 3);
  if (y0 === 0 && x0 === 0 && y1 === H && x1 === W) return png;
  const a = Math.max(0, x0 - marge), b = Math.max(0, y0 - marge), r = Math.min(W, x1 + marge), d = Math.min(H, y1 + marge);
  if (r - a < 8 || d - b < 8) return png;
  return sharp(png).extract({ left: a, top: b, width: r - a, height: d - b }).png().toBuffer();
}
/**
 * LE SITE EN UNE SEULE IMAGE (26 novembre 2026, le propriétaire devant l'onglet Marque d'Écume : « L'ordi et le téléphone
 * ne sont pas obligés d'être découpés si ? ») : tout le contenu du bloc du site, l'ordinateur, le téléphone et ce qui les
 * accompagne, pris sur la planche en vrai assemblée, sans son titre ; puis rogné au contenu. Null sans les deux cases.
 */
export async function imageDuSite(planche: Buffer, boites: ReadonlyMap<string, Boite>, titre?: Boite | null, voisins: { droite?: Boite | null; dessous?: Boite | null } = {}): Promise<Buffer | null> {
  const o = boites.get("site-ordinateur"), t = boites.get("site-telephone");
  if (!o || !t) return null;
  const m = await sharp(planche).metadata(), k = (m.width ?? TAILLE_EN_VRAI.w) / TAILLE_DEMO.w;
  // Le bloc du site : sous la ligne de son titre et de sa pastille (12 pixels), jusqu'au bloc voisin à droite et au titre du
  // bloc suivant en dessous, sinon 40 pixels autour des deux cases ; puis rogné au contenu.
  const haut = titre ? titre[3] + 12 : Math.min(o[1], t[1]) - 40;
  const droite = voisins.droite ? voisins.droite[0] - 4 : Math.max(o[2], t[2]) + 40, bas = voisins.dessous ? voisins.dessous[1] - 8 : Math.max(o[3], t[3]) + 40;
  const b: Boite = [Math.max(0, Math.min(o[0], t[0]) - 20), Math.max(0, Math.min(haut, Math.min(o[1], t[1]))), Math.max(droite, Math.max(o[2], t[2])), Math.max(bas, Math.max(o[3], t[3]))];
  const z = b.map((v) => Math.round(v * k)) as Boite;
  const W = m.width ?? 0, H = m.height ?? 0;
  const [a, c, r, d] = [Math.max(0, z[0]), Math.max(0, z[1]), Math.min(W, z[2]), Math.min(H, z[3])];
  return rognerAuContenu(await sharp(planche).extract({ left: a, top: c, width: r - a, height: d - c }).png().toBuffer());
}

/** Une petite planche de test, fabriquée par le code (pour les essais) : un fond, des pastilles aux couleurs données. */
export async function plancheDeTest(pastilles: readonly [number, number, number][], couleurs: readonly string[], fond = "#F9F8F4"): Promise<Buffer> {
  const c = createCanvas(TAILLE_DEMO.w, TAILLE_DEMO.h), x = c.getContext("2d");
  x.fillStyle = fond; x.fillRect(0, 0, TAILLE_DEMO.w, TAILLE_DEMO.h);
  pastilles.forEach(([cx, cy, r], i) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = couleurs[i] ?? "#888888"; x.fill(); });
  return c.encode("png");
}
