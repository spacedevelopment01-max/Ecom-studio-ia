/**
 * LA PLANCHE EN VRAI : CE QUE FAIT LE CODE SEUL, SANS OPENAI (plan accepté du 25 novembre 2026 ; voir planche-en-vrai.ts).
 *
 * - les dix versions du logo, d'après assembler-planche.py (preuves, branche du chef d'orchestre), tirées du logo au fond
 *   retiré par le Studio (`logoDetoure` : creux des lettres compris) ;
 * - la séparation du symbole et du nom, sur le masque d'encre d'assembler-planche.py (le masque du fond retiré ne sert
 *   qu'au fond) ; si elle n'est pas fiable, le symbole complet est gardé, et c'est dit ;
 * - les favicons 32, 64 et 512, et l'avatar ;
 * - la palette : la médiane des pixels de chaque pastille de la planche choisie (ces codes font foi), les rôles donnés
 *   par le code ;
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
export type PoliceChoisie = { cle: string; famille: string; fichier: string; poids: number; handle: string; lue: string; remplacee: boolean };
const plat = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const AFFICHE = new Set(["anton", "bebas_neue", "archivo_black", "alfa_slab_one", "abril_fatface", "righteous", "unbounded", "oswald", "yeseva_one"]);
function genreDu(cle: string): PoliceDeLInventaire["genre"] {
  if (AFFICHE.has(cle)) return "affiche";
  const fb = FONT_FILES[cle]?.fallback;
  return fb === "serif" ? "serif" : fb === "cursive" ? "manuscrite" : fb === "monospace" ? "chasse-fixe" : "sans";
}
/** Quelques polices courantes hors du catalogue, et la plus proche du catalogue (dessin voisin). */
const VOISINES: Record<string, string> = {
  helvetica: "inter", helveticaneue: "inter", arial: "inter", roboto: "inter", sfpro: "inter", lato: "lato", opensans: "open_sans", gothambook: "montserrat", gotham: "montserrat",
  proximanova: "montserrat", futura: "jost", avenir: "nunito_sans", avenirnext: "nunito_sans", gillsans: "work_sans", sourcesanspro: "source_sans_3", nunito: "nunito",
  garamond: "cormorant_garamond", ebgaramond: "cormorant_garamond", georgia: "lora", timesnewroman: "libre_baskerville", baskerville: "libre_baskerville", didot: "bodoni_moda",
  bodoni: "bodoni_moda", cormorantgaramond: "cormorant_garamond", playfair: "playfair_display", dmserif: "dm_serif_display", ptserif: "merriweather", sourceserifpro: "merriweather",
  greatvibes: "allura", parisienne: "allura", lobster: "pacifico", amatic: "caveat", couriernew: "ibm_plex_mono", courier: "ibm_plex_mono",
};
const DEFAUT_DU_GENRE: Record<PoliceDeLInventaire["genre"], string> = { serif: "lora", sans: "inter", manuscrite: "dancing_script", "chasse-fixe": "ibm_plex_mono", affiche: "bebas_neue" };
const trigrammes = (t: string) => { const s = new Set<string>(); for (let i = 0; i + 3 <= t.length; i++) s.add(t.slice(i, i + 3)); return s; };
const dice = (a: string, b: string) => { const A = trigrammes(a), B = trigrammes(b); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return (2 * n) / (A.size + B.size); };
/**
 * La police lue sur la planche, cherchée dans le catalogue du Studio : trouvée, elle est prise telle quelle ; absente, la
 * plus proche du catalogue (une voisine connue, puis le nom le plus proche du même genre, puis la police de base du genre),
 * et c'est dit (`remplacee`). Aucune source en ligne.
 */
export function policeDuCatalogue(lue: PoliceDeLInventaire, poidsVoulu: number): PoliceChoisie {
  const n = plat(lue.nom);
  let cle = Object.keys(FONT_FILES).find((k) => plat(FONT_FILES[k].family) === n);
  const remplacee = !cle;
  if (!cle) {
    const voisine = Object.entries(VOISINES).find(([k]) => n === k || (k.length >= 5 && n.startsWith(k)))?.[1];
    if (voisine && FONT_FILES[voisine]) cle = voisine;
  }
  if (!cle) {
    const memeGenre = Object.keys(FONT_FILES).filter((k) => genreDu(k) === lue.genre);
    const best = memeGenre.map((k) => ({ k, s: dice(n, plat(FONT_FILES[k].family)) })).sort((a, b) => b.s - a.s)[0];
    cle = best && best.s >= 0.25 ? best.k : DEFAUT_DU_GENRE[lue.genre];
  }
  const f = FONT_FILES[cle], poids = Object.keys(f.files).map(Number).sort((a, b) => Math.abs(a - poidsVoulu) - Math.abs(b - poidsVoulu))[0];
  return { cle, famille: f.family, fichier: f.files[poids], poids, handle: `${cle}_n${String(poids)[0]}`, lue: lue.nom.trim(), remplacee };
}
const fonte = (p: Pick<PoliceChoisie, "cle" | "poids">, taille: number, poids?: number) => {
  enregistrerLesPolices();
  const f = FONT_FILES[p.cle], w = poids == null ? p.poids : Object.keys(f.files).map(Number).sort((a, b) => Math.abs(a - poids) - Math.abs(b - poids))[0];
  return `${Math.round(taille)}px "${ALIAS(p.cle, w)}"`;
};

// ---------------------------------------------------------------- le badge

/**
 * LE TEXTE DU BAS DU BADGE, comme sur la planche : la ligne descriptive du logo (la phrase sous le nom choisie par le
 * client) si elle existe ; sinon le métier court (« les plantes d'intérieur » : écrit sans son article sur le sceau) ; à
 * défaut des deux, la signature de la marque. Vide : rien en bas.
 */
export function texteDuBasDuBadge(o: { ligneDuLogo?: string | null; metierCourt?: string | null; signature?: string | null }): string {
  const ligne = (o.ligneDuLogo ?? "").trim();
  if (ligne) return ligne;
  const court = (o.metierCourt ?? "").trim().replace(/^(la|le|les)\s+|^l['’]/i, "").trim();
  if (court) return court;
  return (o.signature ?? "").trim();
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
export async function versionsDuLogo(o: { logo: Buffer; separation: Separation; couleur: string; sombre: string; clair: string; monoClair: string; nom: string; bas: string; police: Pick<PoliceChoisie, "cle" | "poids"> }): Promise<{ versions: Record<VersionDuLogo, Buffer>; symboleComplet: boolean; symbole: Buffer }> {
  const sep = o.separation.fiable && o.separation.nom ? o.separation : null;
  const r = await rgba(o.logo), bb = boiteOpaque(r), logo = bb ? await versPng(decouper(r, bb)) : o.logo;
  const symbole = sep ? sep.symbole : logo, nom = sep?.nom ?? null;
  const blanc = "#FFFFFF";
  const versions: Record<VersionDuLogo, Buffer> = {
    "logo-principal": logo,
    "logo-horizontal": sep && nom ? (sep.sens === "gauche" ? logo : await horizontal(symbole, nom)) : logo,
    "logo-empile": sep && nom ? await empile(symbole, nom, 0.14) : logo,
    "logo-compact": symbole,
    icone: await carre(await teinte(symbole, blanc), o.sombre, 0.18, 0.2),
    favicon: await carre(await teinte(symbole, blanc), o.sombre, 0.22, 0.16),
    "monochrome-fonce": await teinte(logo, "#222222"),
    "monochrome-clair": await teinte(logo, o.monoClair),
    // Sur fond sombre, le logo est toujours clair.
    inverse: await inverse(await teinte(logo, blanc), o.sombre),
    badge: await badge(symbole, o.couleur, o.nom, o.bas, o.police),
  };
  return { versions, symboleComplet: !sep, symbole };
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
};
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
  const grand = await sharp(demoPng).resize(TAILLE_EN_VRAI.w, TAILLE_EN_VRAI.h, { kernel: "lanczos3" }).png().toBuffer();
  const c = createCanvas(TAILLE_EN_VRAI.w, TAILLE_EN_VRAI.h), x = c.getContext("2d");
  x.drawImage(await img(grand), 0, 0);
  const B = (n: string) => o.boites.get(n);
  const pT = o.polices.titres, pX = o.polices.textes, gris = "#5A605C";

  // Le haut : le logo principal et la signature.
  const haut = B("haut");
  if (haut) {
    const h = X(haut), W = h[2] - h[0], H = h[3] - h[1], f = fond(haut);
    // Sans signature lue, seule la place du logo est effacée : la ligne de la démonstration sous le logo est gardée telle
    // quelle (jamais une case vidée de son texte).
    x.fillStyle = f; x.fillRect(h[0], h[1], W, o.signature.some((l) => l.trim()) ? H : H * HAUT_DU_LOGO);
    await poser(x, o.versions["logo-principal"], [h[0] + W * 0.146, h[1] + H * 0.078, h[2] - W * 0.142, h[1] + H * 0.727]);
    o.signature.slice(0, 2).forEach((l, i) => texte(x, l, h[0] + W / 2, h[1] + H * (0.794 + i * 0.067), fonte(pX, H * 0.044, 600), o.encre, "center", W * 0.9));
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
  for (const [i, v] of VERSIONS_DU_LOGO.entries()) {
    const t = B(`logo-${i + 1}`);
    if (!t) continue;
    const f = fond(t), b = X(t);
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
      if (p.nom) texte(x, p.nom, cx * S, (cy + 68) * S, fonte(pX, 26, 700), o.encre, "center", r * 2.4 * S);
      texte(x, p.hex, cx * S, (cy + 89) * S, fonte(pX, 24, 500), gris, "center");
      p.mots.slice(0, 2).forEach((m, k) => texte(x, m, cx * S, (cy + 112 + k * 18) * S, fonte(pX, 23, 400), gris, "center", r * 2.4 * S));
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
    x.fillStyle = fond(b); arrondi(x, bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1], 18); x.fill();
    await poser(x, im, bb);
  }
  // Les titres, redessinés avec les textes de l'inventaire.
  for (const [n, t] of o.titres) {
    const b = B(n);
    if (!b || !t.trim()) continue;
    const bb = X(b), H = bb[3] - bb[1];
    x.fillStyle = fond(b); x.fillRect(bb[0], bb[1], bb[2] - bb[0], H);
    // La case du titre est mesurée sur le texte lui-même : le titre redessiné en reprend la largeur (lettres espacées), sans
    // dépasser la hauteur de la ligne.
    const T = t.toUpperCase(), Wt = bb[2] - bb[0] - 4 * S;
    x.font = fonte(pX, 100, 500);
    const brut = x.measureText(T).width, taille = Math.min(H * 0.72, (100 * Wt) / Math.max(1, brut * 1.08));
    x.font = fonte(pX, taille, 500); (x as unknown as { letterSpacing: string }).letterSpacing = `${Math.max(0, (Wt - x.measureText(T).width) / Math.max(1, T.length - 1)).toFixed(1)}px`;
    texte(x, T, bb[0] + 2 * S, bb[1] + H / 2, fonte(pX, taille, 500), o.encre, "left", Wt);
    (x as unknown as { letterSpacing: string }).letterSpacing = "0px";
  }
  // Les blocs de texte qui n'ont pas passé le contrôle : redessinés avec les textes corrigés.
  for (const [n, bloc] of o.blocs) {
    const b = B(n);
    const lignes = (bloc?.lignes ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 12);
    // Un bloc sans aucune ligne n'est jamais effacé : le décor de la démonstration reste.
    if (!b || !lignes.length) continue;
    const bb = X(b), W = bb[2] - bb[0], H = bb[3] - bb[1];
    x.fillStyle = fond(b); x.fillRect(bb[0], bb[1], W, H);
    const pas = Math.min(H / (lignes.length + 1), 34 * S);
    lignes.forEach((l, i) => texte(x, l, bb[0] + 20 * S, bb[1] + pas * (i + 0.9), i === 0 ? fonte(pT, pas * 0.62, pT.poids) : fonte(pX, pas * 0.5, 400), i === 0 ? o.encre : gris, "left", W - 40 * S));
  }
  return c.encode("png");
}

/** Une petite planche de test, fabriquée par le code (pour les essais) : un fond, des pastilles aux couleurs données. */
export async function plancheDeTest(pastilles: readonly [number, number, number][], couleurs: readonly string[], fond = "#F9F8F4"): Promise<Buffer> {
  const c = createCanvas(TAILLE_DEMO.w, TAILLE_DEMO.h), x = c.getContext("2d");
  x.fillStyle = fond; x.fillRect(0, 0, TAILLE_DEMO.w, TAILLE_DEMO.h);
  pastilles.forEach(([cx, cy, r], i) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = couleurs[i] ?? "#888888"; x.fill(); });
  return c.encode("png");
}
