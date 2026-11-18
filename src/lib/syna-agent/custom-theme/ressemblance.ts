/**
 * Le contrôle par l'image (point 5 validé par le propriétaire le 17 novembre 2026, « Fait les 5 ») : avant que le client
 * voie son site, le Studio prend une capture de l'accueil (téléphone et ordinateur) et la compare aux captures des
 * derniers sites montés. Si deux accueils se ressemblent trop à l'œil, le site est corrigé avant d'être montré.
 * « C'est la seule garantie qui juge comme toi, en regardant. » Sans IA, gratuit.
 *
 * L'empreinte d'un accueil (ce que l'œil retient d'une page vue de loin) :
 *  - la page est découpée en bandes horizontales de hauteur fixe, chaque bande en quelques colonnes ;
 *  - chaque case garde sa couleur moyenne (clarté, et les deux axes de couleur, comme l'œil les perçoit) et son
 *    « grain » (l'écart de clarté à l'intérieur : une photo ou un titre très gras en ont, un aplat n'en a pas).
 * La ressemblance de deux accueils (0 à 100) :
 *  - le haut (les deux premiers écrans), comparé case à case, à quelques bandes près : la première impression ;
 *  - la page entière, comparée bande à bande en laissant les sections s'allonger ou se raccourcir (alignement souple,
 *    comme l'œil qui reconnaît le même enchaînement de masses même quand une section est plus haute) : le rythme ;
 *  - les couleurs dominantes de toute la page (leurs parts) : l'ambiance.
 * Même site contre lui-même : 100. Le seuil est calibré sur les sites de l'essai (voir LOT-4-LE-SITE.md, « Le contrôle
 * par l'image ») : Bécane contre Atelier Vasco, et les cinq tenues de Vasco, que le propriétaire juge trop proches.
 *
 * Règle du propriétaire, sans porte de sortie : « elle doit y arriver ». Le contrôle ne dit jamais « non vérifié, on livre
 * quand même » en silence : sans navigateur, ou si la correction sans IA ne suffit pas, c'est écrit en tête du compte
 * rendu, à dire au client, et le site n'est pas présenté comme fini (site-job.ts).
 */
import sharp from "sharp";

/** Les deux vues capturées : largeur de l'écran, hauteur d'un écran, hauteur d'une bande, colonnes, hauteur capturée au plus. */
export const VUES = {
  telephone: { width: 390, ecran: 844, bande: 48, cols: 4, max: 16000 },
  ordinateur: { width: 1280, ecran: 900, bande: 60, cols: 8, max: 10000 },
} as const;
export type VueId = keyof typeof VUES;

/** Une section de l'accueil vue de loin : sa hauteur, et sa vignette (LIGNES lignes × colonnes de la vue, [clarté, a, b, grain]). */
export type SectionVue = { uid: string; role: string; h: number; c: number[] };
/**
 * L'empreinte d'un accueil dans une vue : `c` = pour chaque bande, pour chaque colonne, [clarté, a, b, grain] (entiers) ;
 * `sections` : la vignette de chaque section, de haut en bas.
 */
export type EmpreinteVue = {
  v: 1; bandes: number; cols: number; c: number[]; sections: SectionVue[];
  /** Les couleurs dominantes de la page, photos comprises : [clarté, a, b, part] des plus présentes. */
  pal: number[][];
  /** L'épaisseur des traits d'encre (lettres, filets, pictogrammes) : part de l'encre dans chaque classe d'épaisseur. */
  encre: number[];
};
/** Une section capturée : où elle est dans la page (pixels de l'écran). */
export type PlaceSection = { uid: string; role: string; top: number; height: number };
/** Lignes de la vignette d'une section. */
export const LIGNES = 8;
export type Empreinte = { v: 1; at: number; telephone: EmpreinteVue | null; ordinateur: EmpreinteVue | null };

const PX = 10; // pixels par côté de case, après réduction

/** sRGB (0-255) → Lab (clarté 0-100, a et b), la façon dont l'œil sépare clair, rouge-vert et jaune-bleu. */
export function lab(r: number, g: number, b: number): [number, number, number] {
  const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Gris des photos dans l'image des masses (shots.ts peint chaque photo en gris moyen). */
export const GRIS_PHOTO = 128;

/**
 * L'empreinte d'une capture (JPEG ou PNG) prise à la largeur de la vue. `masses` : la même capture, chaque photo peinte
 * en gris (shots.ts, shootAccueil) : la disposition se lit sur elle (où sont les photos, pas ce qu'elles montrent) ; les
 * couleurs dominantes se lisent sur la capture telle quelle, photos comprises.
 */
export async function empreinteDe(image: Buffer, vue: VueId, places: PlaceSection[] = [], masses: Buffer = image): Promise<EmpreinteVue> {
  const o = VUES[vue];
  const meta = await sharp(image).metadata();
  const scale = (meta.width ?? o.width) / o.width;
  const full = meta.height ?? 0;
  const h = Math.min(full, Math.round(o.max * scale));
  const bandes = Math.max(1, Math.floor(h / (o.bande * scale)));
  const W = o.cols * PX;
  const reduite = (img: Buffer, top: number, height: number, rows: number) => sharp(img).extract({ left: 0, top, width: meta.width!, height }).removeAlpha().resize(W, rows * PX, { fit: "fill", kernel: "cubic" }).raw().toBuffer();
  const haut = Math.round(bandes * o.bande * scale);
  const raw = await reduite(masses, 0, haut, bandes);
  const sections: SectionVue[] = [];
  for (const p of places) {
    const top = Math.round(p.top * scale), height = Math.min(Math.round(p.height * scale), full - top);
    if (top < 0 || height < 8) continue;
    sections.push({ uid: p.uid, role: p.role, h: p.height, c: cases(await reduite(masses, top, height, LIGNES), o.cols, LIGNES) });
  }
  const couleurs = cases(await reduite(image, 0, haut, bandes), o.cols, bandes);
  const gris = await sharp(masses).extract({ left: 0, top: 0, width: meta.width!, height: haut }).greyscale().resize(Math.round(meta.width! / scale)).raw().toBuffer({ resolveWithObject: true });
  return { v: 1, bandes, cols: o.cols, c: cases(raw, o.cols, bandes), sections, pal: paletteDe(couleurs, bandes * o.cols), encre: encreDe(gris.data, gris.info.width, gris.info.height) };
}

/** Classes d'épaisseur d'un trait d'encre, en pixels de l'écran (filet, texte courant, titre, très gros titre…). */
export const EPAISSEURS = [2, 4, 7, 11, 17, 26, Infinity];
/**
 * L'allure de la typographie, lue sur l'image comme l'œil la lit de loin : sur chaque petit carré de la page, le fond
 * est la teinte de gris la plus présente ; l'encre est ce qui s'en écarte nettement ; chaque trait horizontal d'encre est
 * rangé par épaisseur. Une police très grasse donne des traits épais, une police fine des traits minces. Les photos
 * (peintes en gris dans l'image des masses) ne comptent pas.
 */
function encreDe(g: Buffer, W: number, H: number): number[] {
  const B = 32, hist = new Array(EPAISSEURS.length).fill(0);
  let total = 0;
  const q = new Array(16);
  for (let by = 0; by < H; by += B) for (let bx = 0; bx < W; bx += B) {
    const x1 = Math.min(W, bx + B), y1 = Math.min(H, by + B);
    q.fill(0);
    for (let y = by; y < y1; y++) for (let x = bx; x < x1; x++) q[g[y * W + x] >> 4]++;
    const fond = q.indexOf(Math.max(...q));
    if (fond === GRIS_PHOTO >> 4) continue;
    for (let y = by; y < y1; y++) {
      let run = 0;
      for (let x = bx; x <= x1; x++) {
        if (x < x1 && Math.abs((g[y * W + x] >> 4) - fond) >= 5) { run++; continue; }
        if (run) { hist[EPAISSEURS.findIndex((e) => run <= e)] += run; total += run; run = 0; }
      }
    }
  }
  return hist.map((v) => Math.round((v / Math.max(1, total)) * 1000) / 1000);
}

/** Les cases d'une image réduite (PX pixels par côté de case) : [clarté, a, b, grain] par case, ligne par ligne. */
function cases(raw: Buffer, cols: number, rows: number): number[] {
  const W = cols * PX, c: number[] = [];
  for (let bi = 0; bi < rows; bi++) for (let ci = 0; ci < cols; ci++) {
    let sl = 0, sa = 0, sb = 0, sl2 = 0;
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
      const i = ((bi * PX + y) * W + ci * PX + x) * 3;
      const [l, a, b] = lab(raw[i], raw[i + 1], raw[i + 2]);
      sl += l; sa += a; sb += b; sl2 += l * l;
    }
    const n = PX * PX, ml = sl / n;
    c.push(Math.round(ml), Math.round(sa / n), Math.round(sb / n), Math.round(Math.sqrt(Math.max(0, sl2 / n - ml * ml))));
  }
  return c;
}

/** Les trois écarts entre deux vignettes de section : la disposition des masses, le ton d'ensemble, la hauteur. */
export function ecartsSections(a: SectionVue, b: SectionVue): { masses: number; ton: number; hauteur: number } {
  const n = a.c.length / 4;
  const moy = (s: SectionVue) => { let l = 0, x = 0, y = 0; for (let i = 0; i < n; i++) { l += s.c[i * 4]; x += s.c[i * 4 + 1]; y += s.c[i * 4 + 2]; } return [l / n, x / n, y / n]; };
  const [la, aa, ba] = moy(a), [lb, ab, bb] = moy(b);
  let m = 0;
  for (let i = 0; i < n; i++) m += Math.abs((a.c[i * 4] - la) - (b.c[i * 4] - lb)) + 0.8 * Math.abs(a.c[i * 4 + 3] - b.c[i * 4 + 3]);
  return { masses: m / n, ton: Math.abs(la - lb) + 0.5 * Math.hypot(aa - ab, ba - bb), hauteur: Math.abs(Math.log(Math.max(1, a.h) / Math.max(1, b.h))) };
}

const cell = (e: EmpreinteVue, bi: number, ci: number) => { const i = (bi * e.cols + ci) * 4; return [e.c[i], e.c[i + 1], e.c[i + 2], e.c[i + 3]]; };
/** Écart entre deux cases : écart de couleur perçu (ΔE), plus l'écart de grain (photo, gros titre, ou aplat). */
const ecartCase = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) + 0.8 * Math.abs(p[3] - q[3]);
/** Écart entre deux bandes : moyenne de leurs cases, colonne par colonne. */
function ecartBande(a: EmpreinteVue, i: number, b: EmpreinteVue, j: number): number {
  let s = 0;
  for (let ci = 0; ci < a.cols; ci++) s += ecartCase(cell(a, i, ci), cell(b, j, ci));
  return s / a.cols;
}

/** Le haut de la page (les `n` premières bandes), comparé bande à bande, chaque bande avec la plus proche à ±2 près. */
function ecartHaut(a: EmpreinteVue, b: EmpreinteVue, n: number): number {
  const m = Math.min(n, a.bandes, b.bandes);
  if (!m) return 100;
  let s = 0;
  for (let i = 0; i < m; i++) { let best = Infinity; for (let j = Math.max(0, i - 2); j <= Math.min(b.bandes - 1, i + 2); j++) best = Math.min(best, ecartBande(a, i, b, j)); s += best; }
  return s / m;
}

/**
 * La page entière : alignement souple des bandes (une section plus haute d'un côté s'aligne sur la même section de
 * l'autre), dans une fenêtre limitée, chaque saut payé : deux pages de rythme différent ne s'alignent pas pour rien.
 */
function ecartRythme(a: EmpreinteVue, b: EmpreinteVue): number {
  const n = a.bandes, m = b.bandes;
  const w = Math.max(Math.abs(n - m) + 2, Math.round(Math.max(n, m) * 0.15));
  const SAUT = 6;
  const INF = 1e12;
  let prev = new Float64Array(m + 1).fill(INF), cur = new Float64Array(m + 1).fill(INF);
  let prevLen = new Float64Array(m + 1), curLen = new Float64Array(m + 1);
  prev[0] = 0;
  for (let i = 1; i <= n; i++) {
    cur.fill(INF);
    const jc = Math.round((i * m) / n);
    for (let j = Math.max(1, jc - w); j <= Math.min(m, jc + w); j++) {
      const d = ecartBande(a, i - 1, b, j - 1);
      const diag = prev[j - 1], up = prev[j] + SAUT, left = cur[j - 1] + SAUT;
      if (diag <= up && diag <= left) { cur[j] = diag + d; curLen[j] = prevLen[j - 1] + 1; }
      else if (up <= left) { cur[j] = up + d; curLen[j] = prevLen[j] + 1; }
      else { cur[j] = left + d; curLen[j] = curLen[j - 1] + 1; }
    }
    [prev, cur] = [cur, prev];
    [prevLen, curLen] = [curLen, prevLen];
  }
  return prev[m] >= INF ? 100 : prev[m] / Math.max(1, prevLen[m]);
}

/** Les couleurs dominantes de la page (photos comprises) : les cases rangées par teinte proche (pas de 6), les 32 plus présentes. */
function paletteDe(c: number[], n: number): number[][] {
  const groupes = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const k = [0, 1, 2].map((j) => Math.round(c[i * 4 + j] / 6)).join("|");
    const g = groupes.get(k) ?? [0, 0, 0, 0];
    g[0] += c[i * 4]; g[1] += c[i * 4 + 1]; g[2] += c[i * 4 + 2]; g[3]++;
    groupes.set(k, g);
  }
  return [...groupes.values()].sort((x, y) => y[3] - x[3]).slice(0, 32).map((g) => [Math.round(g[0] / g[3]), Math.round(g[1] / g[3]), Math.round(g[2] / g[3]), Math.round((g[3] / n) * 1000) / 1000]);
}
/**
 * Couleurs communes de deux pages (0 à 1) : chaque couleur de l'une est rapprochée des couleurs de l'autre avec
 * indulgence (deux crèmes voisines se ressemblent pour l'œil), puis la somme est ramenée à celle de chaque page avec
 * elle-même : une page contre elle-même vaut 1.
 */
const SIGMA_COULEUR = 10;
function proches(a: number[][], b: number[][]): number {
  let s = 0;
  for (const x of a) for (const y of b) s += x[3] * y[3] * Math.exp(-((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2) / (2 * SIGMA_COULEUR ** 2));
  return s;
}
function palettesCommunes(a: EmpreinteVue, b: EmpreinteVue): number {
  const d = Math.sqrt(proches(a.pal, a.pal) * proches(b.pal, b.pal));
  return d ? Math.min(1, proches(a.pal, b.pal) / d) : 0;
}
/** Même allure de lettres et de traits (0 à 1) : part commune des épaisseurs d'encre. */
function encreCommune(a: EmpreinteVue, b: EmpreinteVue): number {
  let s = 0;
  a.encre.forEach((v, i) => (s += Math.min(v, b.encre[i] ?? 0)));
  return Math.min(1, s);
}

/** Un écart de bande à partir duquel deux bandes n'ont plus rien de commun pour l'œil (ΔE + grain). */
export const ECART_NUL = 45;
const note = (ecart: number) => Math.max(0, Math.min(1, 1 - ecart / ECART_NUL));

/** Écart de deux sections au-dessous duquel l'œil les voit jumelles (même disposition des masses, même ton, même hauteur). */
export const JUMELLE_MAX = 10;
const ecartSection = (a: SectionVue, b: SectionVue) => { const e = ecartsSections(a, b); return e.masses + 0.5 * e.ton + 10 * e.hauteur; };
/**
 * Les sections jumelles à l'œil entre deux accueils (pièces de la page seulement : l'en-tête et le pied de page suivent
 * leur famille). Chaque section n'a qu'une jumelle au plus : les paires les plus proches d'abord.
 */
export function jumelles(a: EmpreinteVue, b: EmpreinteVue, max = JUMELLE_MAX): { a: string; b: string; ecart: number }[] {
  const A = a.sections.filter((x) => x.role === "page"), B = b.sections.filter((x) => x.role === "page");
  const paires: [number, number, number][] = [];
  A.forEach((x, i) => B.forEach((y, j) => { const e = ecartSection(x, y); if (e < max) paires.push([e, i, j]); }));
  paires.sort((x, y) => x[0] - y[0]);
  const ua = new Set<number>(), ub = new Set<number>(), out: { a: string; b: string; ecart: number }[] = [];
  for (const [e, i, j] of paires) if (!ua.has(i) && !ub.has(j)) { ua.add(i); ub.add(j); out.push({ a: A[i].uid, b: B[j].uid, ecart: Math.round(e * 10) / 10 }); }
  return out;
}

/**
 * Les parts de la note d'ensemble (leur somme fait 1), calibrées le 17 novembre 2026 sur les sites de l'essai (voir
 * LOT-4-LE-SITE.md, « Le contrôle par l'image ») : la mise en page vue de loin (le haut, le rythme), les couleurs, l'allure
 * des lettres et les sections jumelles. Les deux dernières font la différence entre « trop proche » et « différent » :
 * Bécane et Atelier Vasco n'ont presque rien de commun à la règle, mais la même allure de lettres et des sections
 * jumelles (les questions, la phrase sur une photo pleine) ; c'est ce que l'œil du propriétaire a vu.
 */
export const POIDS = { haut: 0.1, rythme: 0.1, couleurs: 0.05, lettres: 0.35, jumelles: 0.4 } as const;
/**
 * Au-dessus de ce seuil (moyenne du téléphone et de l'ordinateur), deux accueils se ressemblent trop. Calibrage : le
 * plus bas des cas jugés trop proches par le propriétaire (Bécane contre Vasco) fait 48,8 ; le plus haut des cas
 * nettement différents fabriqués pour l'essai fait 46,2 ; le seuil est entre les deux.
 */
export const SEUIL = 48;
/** Le détail d'une comparaison dans une vue (chaque part de 0 à 100) et la note d'ensemble (0 à 100). */
export type DetailVue = { haut: number; rythme: number; couleurs: number; lettres: number; jumelles: number; note: number; paires: { a: string; b: string; ecart: number }[] };
export function ressemblanceVue(a: EmpreinteVue, b: EmpreinteVue): DetailVue {
  if (a.cols !== b.cols) throw new Error("empreintes de vues différentes");
  const vue = VUES[a.cols === VUES.telephone.cols ? "telephone" : "ordinateur"];
  const haut = note(ecartHaut(a, b, Math.round((2 * vue.ecran) / vue.bande))), rythme = note(ecartRythme(a, b)), couleurs = palettesCommunes(a, b), lettres = encreCommune(a, b);
  const paires = jumelles(a, b);
  const n = Math.max(1, Math.min(a.sections.filter((x) => x.role === "page").length, b.sections.filter((x) => x.role === "page").length));
  const jum = Math.min(1, paires.length / n);
  const total = POIDS.haut * haut + POIDS.rythme * rythme + POIDS.couleurs * couleurs + POIDS.lettres * lettres + POIDS.jumelles * jum;
  const pc = (x: number) => Math.round(x * 100);
  return { haut: pc(haut), rythme: pc(rythme), couleurs: pc(couleurs), lettres: pc(lettres), jumelles: pc(jum), note: Math.round(total * 1000) / 10, paires };
}

/** La ressemblance de deux accueils : la moyenne des vues que les deux empreintes ont (téléphone, ordinateur). */
export function ressemblance(a: Empreinte, b: Empreinte): { note: number; vues: Partial<Record<VueId, DetailVue>> } {
  const vues: Partial<Record<VueId, DetailVue>> = {};
  for (const v of ["telephone", "ordinateur"] as const) { const x = a[v], y = b[v]; if (x && y) vues[v] = ressemblanceVue(x, y); }
  const notes = Object.values(vues).map((d) => d!.note);
  return { note: notes.length ? Math.round((notes.reduce((s, x) => s + x, 0) / notes.length) * 10) / 10 : 0, vues };
}
/** Trop proche à l'œil ? */
export const tropProche = (note: number) => note >= SEUIL;
