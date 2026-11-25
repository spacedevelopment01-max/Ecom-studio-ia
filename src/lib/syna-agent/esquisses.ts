/**
 * LA MÉTHODE DES GRAPHISTES, temps 3 : la découpe et le contrôle des esquisses (24 novembre 2026, plan accepté par le
 * chef d'orchestre).
 *
 * Par le code, gratuit (sharp), sur chaque planche de recherche (six esquisses sur trois colonnes et deux lignes) :
 *  - la quantité d'encre par rangée, puis par colonne dans chaque rangée ; la bande la plus blanche près de y ≈ 1/2, puis
 *    de x ≈ 1/3 et 2/3, à ±15 % d'une case (grille décalée d'une rangée à l'autre comprise) ;
 *  - pas de grille 3 × 2 : la planche est refusée ;
 *  - un bout de la voisine, séparé par du blanc et collé au bord, est retiré par recadrage ;
 *  - un dessin qui touche le bord : l'esquisse est refusée ;
 *  - une case vide ou d'une seule couleur : refusée ;
 *  - recadrage carré d'environ 512 px, avec une marge.
 * LE FOND MESURÉ (25 novembre 2026, essai réel d'Écume : la case 6 de la planche 2.5 avait sa grande forme beige pâle
 * tranchée en haut par la découpe, pas par le modèle) : l'encre n'est plus comparée à un seuil fixe (« plus clair que 215 »
 * passait le beige très clair pour du fond), mais à la vraie couleur du fond, mesurée sur le pourtour de la planche
 * (médiane) ; tout ce qui s'en écarte visiblement est du dessin. Aucune forme visible n'est coupée ; une marge de sécurité
 * (`PAS_DE_SECURITE`) est gardée autour du dessin, dans sa case.
 * Puis UN appel au relecteur le plus fort, effort moyen, pour toutes les esquisses numérotées : entière, morceau de
 * voisine, nom lu (comparé par le code au nom exact), ok, pourquoi, et la piste en quelques mots (elle sert à
 * « Évite ces pistes déjà présentées », sans autre appel). Une esquisse refusée n'est jamais montrée ni jointe à SINA ; les
 * gardées sont renumérotées sans trou. Chaque esquisse écartée est remplacée par le même modèle jusqu'à 12 correctes
 * (`rechercheDesEsquisses`, 25 novembre 2026). Une panne du fournisseur n'est jamais relancée toute seule.
 * Une planche-contact numérotée est faite par le code, gratuitement, pour SINA.
 */
import sharp from "sharp";
import { z } from "zod";
import { MODELES_DE_RECHERCHE, demandeDeRecherche, lancerLesPlanches, type Metier, type PlancheManquee, type PlancheRecue } from "./logo-recherche";
import { phraseDeLEsquisse, type PhraseDeLEsquisse } from "./phrase-sous-le-nom";

// ---------------------------------------------------------------- la découpe (gratuite)

/** Taille du côté d'une esquisse recadrée. */
export const COTE_ESQUISSE = 512;
/** Marge autour du dessin, en part de son plus grand côté. */
const MARGE = 0.12;
/** Tolérance de la recherche d'une bande blanche : 15 % d'une case. */
const TOLERANCE = 0.15;

type Brut = { data: Buffer; w: number; h: number; fond: [number, number, number] };
/**
 * L'écart visible au fond : au-delà, c'est du dessin. Mesuré sur les planches réelles d'Écume (fond 254, 254, 254) : le
 * grain du fond reste sous 9, un beige très pâle (240, 235, 230) s'en écarte de 24.
 */
export const ECART_AU_FOND = 12;
/** La marge de sécurité gardée autour du dessin, dans sa case, avant la marge du recadrage (en pixels de la planche). */
export const PAS_DE_SECURITE = 6;
/** La couleur du fond, mesurée : la médiane de chaque canal sur le pourtour de la planche (2 pixels d'épaisseur). */
export function fondMesure(data: Buffer, w: number, h: number): [number, number, number] {
  const c: number[][] = [[], [], []];
  const prendre = (x: number, y: number) => { const i = (y * w + x) * 3; c[0].push(data[i]); c[1].push(data[i + 1]); c[2].push(data[i + 2]); };
  for (let k = 0; k < 2; k++) {
    for (let x = 0; x < w; x++) { prendre(x, k); prendre(x, h - 1 - k); }
    for (let y = 2; y < h - 2; y++) { prendre(k, y); prendre(w - 1 - k, y); }
  }
  return c.map((v) => v.sort((a, b) => a - b)[v.length >> 1]) as [number, number, number];
}
const encreEn = (b: Brut, x: number, y: number): boolean => {
  const i = (y * b.w + x) * 3;
  return Math.abs(b.data[i] - b.fond[0]) > ECART_AU_FOND || Math.abs(b.data[i + 1] - b.fond[1]) > ECART_AU_FOND || Math.abs(b.data[i + 2] - b.fond[2]) > ECART_AU_FOND;
};

/** Le masque d'encre de la planche, sans les traits de grille (une ligne qui court sur presque toute la planche). */
function masqueDEncre(b: Brut): Uint8Array {
  const m = new Uint8Array(b.w * b.h);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) m[y * b.w + x] = encreEn(b, x, y) ? 1 : 0;
  for (let x = 0; x < b.w; x++) { let n = 0; for (let y = 0; y < b.h; y++) n += m[y * b.w + x]; if (n > 0.85 * b.h) for (let y = 0; y < b.h; y++) m[y * b.w + x] = 0; }
  for (let y = 0; y < b.h; y++) { let n = 0; for (let x = 0; x < b.w; x++) n += m[y * b.w + x]; if (n > 0.85 * b.w) for (let x = 0; x < b.w; x++) m[y * b.w + x] = 0; }
  return m;
}

/** La bande la plus blanche près de `attendu` (± tolérance), dans le profil d'encre donné ; null si aucune n'est blanche. */
function bandeBlanche(profil: number[], attendu: number, tol: number, longueur: number): number | null {
  const lo = Math.max(1, Math.floor(attendu - tol)), hi = Math.min(profil.length - 2, Math.ceil(attendu + tol));
  const largeur = Math.max(3, Math.round(profil.length / 200));
  let best = -1, bestV = Infinity;
  for (let x = lo; x <= hi; x++) {
    let s = 0; for (let k = -largeur; k <= largeur; k++) s += profil[Math.min(profil.length - 1, Math.max(0, x + k))];
    const v = s / (2 * largeur + 1);
    if (v < bestV || (v === bestV && Math.abs(x - attendu) < Math.abs(best - attendu))) { bestV = v; best = x; }
  }
  // Blanche : au plus un pour mille de la longueur couverte (un point isolé, une poussière).
  return best >= 0 && bestV <= Math.max(1, longueur * 0.001) ? best : null;
}

export type CaseDecoupee = { index: number; png?: Buffer; refus?: string; recadree?: boolean };
export type Decoupe = { ok: true; cases: CaseDecoupee[]; grille: { lignes: number[]; colonnes: number[][] } } | { ok: false; raison: string };

/** Les segments d'encre d'un profil (suites non vides), fusionnés quand le blanc entre eux est plus court que `ecart`. */
function segments(profil: number[], ecart: number): [number, number][] {
  const out: [number, number][] = [];
  let debut = -1, fin = -1;
  for (let i = 0; i < profil.length; i++) {
    if (!profil[i]) continue;
    if (debut < 0) { debut = fin = i; continue; }
    if (i - fin - 1 < ecart) fin = i; else { out.push([debut, fin]); debut = fin = i; }
  }
  if (debut >= 0) out.push([debut, fin]);
  return out;
}

/**
 * Une case : le bout d'une voisine collé au bord et séparé par du blanc est retiré ; puis le dessin qui touche encore le
 * bord est refusé ; une case vide ou d'une seule couleur aussi.
 */
function lireLaCase(m: Uint8Array, w: number, x0: number, x1: number, y0: number, y1: number): { refus?: string; zone?: [number, number, number, number]; recadree: boolean } {
  const cw = x1 - x0, ch = y1 - y0;
  let kx0 = x0, kx1 = x1 - 1, ky0 = y0, ky1 = y1 - 1, recadree = false;
  const total = () => { let n = 0; for (let y = ky0; y <= ky1; y++) for (let x = kx0; x <= kx1; x++) n += m[y * w + x]; return n; };
  const n0 = total();
  if (n0 < cw * ch * 0.0015) return { refus: "case vide", recadree };
  if (n0 > cw * ch * 0.9) return { refus: "case d'une seule couleur", recadree };
  const bord = 2;
  for (let tour = 0; tour < 3; tour++) {
    const col: number[] = [], lig: number[] = [];
    for (let x = kx0; x <= kx1; x++) { let n = 0; for (let y = ky0; y <= ky1; y++) n += m[y * w + x]; col.push(n); }
    for (let y = ky0; y <= ky1; y++) { let n = 0; for (let x = kx0; x <= kx1; x++) n += m[y * w + x]; lig.push(n); }
    let change = false;
    const couper = (prof: number[], debut: number, ecart: number): [number, number] | null => {
      const seg = segments(prof, ecart);
      if (seg.length < 2) return null;
      const poids = seg.map(([a, b]) => prof.slice(a, b + 1).reduce((s, v) => s + v, 0));
      const principal = poids.indexOf(Math.max(...poids));
      let a = 0, b = seg.length - 1;
      // Un BOUT collé au bord : petit (moins de 15 % de l'encre du dessin principal, moins d'un quart de la case) et séparé
      // par du blanc. Retiré. Une grande partie du dessin collée au bord n'est jamais retirée : l'esquisse est refusée.
      const bout = (k: number) => poids[k] < 0.15 * poids[principal] && seg[k][1] - seg[k][0] < prof.length / 4;
      while (a < principal && seg[a][0] <= bord && bout(a)) a++;
      while (b > principal && seg[b][1] >= prof.length - 1 - bord && bout(b)) b--;
      if (a === 0 && b === seg.length - 1) return null;
      return [debut + seg[a][0], debut + seg[b][1]];
    };
    const cx = couper(col, kx0, Math.max(6, Math.round(cw * 0.04)));
    if (cx) { kx0 = cx[0]; kx1 = cx[1]; change = recadree = true; }
    const cy = couper(lig, ky0, Math.max(6, Math.round(ch * 0.04)));
    if (cy) { ky0 = cy[0]; ky1 = cy[1]; change = recadree = true; }
    if (!change) break;
  }
  // La boîte du dessin gardé.
  let bx0 = Infinity, bx1 = -1, by0 = Infinity, by1 = -1;
  for (let y = ky0; y <= ky1; y++) for (let x = kx0; x <= kx1; x++) if (m[y * w + x]) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
  if (bx1 < 0) return { refus: "case vide", recadree };
  if (bx0 - x0 <= bord || x1 - 1 - bx1 <= bord || by0 - y0 <= bord || y1 - 1 - by1 <= bord) return { refus: "le dessin touche le bord de sa case", recadree };
  // La marge de sécurité : quelques pixels de plus autour du dessin (bords adoucis, traits très pâles), sans sortir de ce
  // qui a été gardé de la case.
  const p = PAS_DE_SECURITE;
  return { zone: [Math.max(kx0, bx0 - p), Math.min(kx1, bx1 + p), Math.max(ky0, by0 - p), Math.min(ky1, by1 + p)], recadree };
}

/** La découpe d'une planche en six esquisses carrées (gratuite, sans IA). */
export async function decouperLaPlanche(png: Buffer): Promise<Decoupe> {
  const { data, info } = await sharp(png).flatten({ background: "#FFFFFF" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const b: Brut = { data, w: info.width, h: info.height, fond: fondMesure(data, info.width, info.height) };
  const m = masqueDEncre(b);
  const lignesProfil: number[] = [];
  for (let y = 0; y < b.h; y++) { let n = 0; for (let x = 0; x < b.w; x++) n += m[y * b.w + x]; lignesProfil.push(n); }
  const yMil = bandeBlanche(lignesProfil, b.h / 2, TOLERANCE * (b.h / 2), b.w);
  if (yMil == null) return { ok: false, raison: "pas de grille de trois colonnes et deux lignes (aucune bande blanche entre les deux rangées)" };
  // Une bande blanche sur toute la hauteur au milieu de la planche : deux colonnes, pas trois (la case du milieu est vide
  // ou absente). Planche refusée.
  const colonnesProfil: number[] = [];
  for (let x = 0; x < b.w; x++) { let n = 0; for (let y = 0; y < b.h; y++) n += m[y * b.w + x]; colonnesProfil.push(n); }
  if (bandeBlanche(colonnesProfil, b.w / 2, 0.03 * b.w, b.h) != null) return { ok: false, raison: "pas de grille de trois colonnes et deux lignes (le milieu de la planche est blanc de haut en bas)" };
  const rangees: [number, number][] = [[0, yMil], [yMil + 1, b.h]];
  const colonnes: number[][] = [];
  for (const [y0, y1] of rangees) {
    const prof: number[] = [];
    for (let x = 0; x < b.w; x++) { let n = 0; for (let y = y0; y < y1; y++) n += m[y * b.w + x]; prof.push(n); }
    const g1 = bandeBlanche(prof, b.w / 3, TOLERANCE * (b.w / 3), y1 - y0), g2 = bandeBlanche(prof, (2 * b.w) / 3, TOLERANCE * (b.w / 3), y1 - y0);
    if (g1 == null || g2 == null) return { ok: false, raison: "pas de grille de trois colonnes et deux lignes (aucune bande blanche entre les colonnes)" };
    colonnes.push([g1, g2]);
  }
  const cases: CaseDecoupee[] = [];
  for (let r = 0; r < 2; r++) {
    const [y0, y1] = rangees[r], [g1, g2] = colonnes[r], bornes: [number, number][] = [[0, g1], [g1 + 1, g2], [g2 + 1, b.w]];
    for (let c = 0; c < 3; c++) {
      const [x0, x1] = bornes[c], index = r * 3 + c;
      const lu = lireLaCase(m, b.w, x0, x1, y0, y1);
      if (lu.refus || !lu.zone) { cases.push({ index, refus: lu.refus ?? "case vide" }); continue; }
      cases.push({ index, png: await recadrer(b, m, lu.zone), ...(lu.recadree ? { recadree: true } : {}) });
    }
  }
  return { ok: true, cases, grille: { lignes: [yMil], colonnes } };
}

/** Le dessin gardé, sur un carré blanc avec sa marge, à 512 px (rien d'autre que lui : un bout de voisine retiré est blanc). */
async function recadrer(b: Brut, m: Uint8Array, [x0, x1, y0, y1]: [number, number, number, number]): Promise<Buffer> {
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, out = Buffer.alloc(bw * bh * 3, 255);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const sx = x0 + x, sy = y0 + y, si = (sy * b.w + sx) * 3, di = (y * bw + x) * 3;
    // Les pixels hors du dessin gardé restent tels quels (anticrénelage, couleurs claires) : seule la zone est prise.
    out[di] = b.data[si]; out[di + 1] = b.data[si + 1]; out[di + 2] = b.data[si + 2];
  }
  void m;
  const cote = Math.ceil(Math.max(bw, bh) * (1 + 2 * MARGE));
  const left = Math.floor((cote - bw) / 2), top = Math.floor((cote - bh) / 2);
  // Deux temps : sharp redimensionne toujours avant d'agrandir le cadre dans une même chaîne.
  const carre = await sharp(out, { raw: { width: bw, height: bh, channels: 3 } })
    .extend({ left, right: cote - bw - left, top, bottom: cote - bh - top, background: "#FFFFFF" }).png().toBuffer();
  return sharp(carre).resize(COTE_ESQUISSE, COTE_ESQUISSE, { fit: "fill" }).png().toBuffer();
}

// ---------------------------------------------------------------- la relecture (un seul appel)

export const RelectureEsquissesSchema = z.object({
  esquisses: z.array(z.object({
    numero: z.number().int().min(1).max(60),
    entiere: z.boolean().catch(false),
    morceauDeVoisine: z.boolean().catch(true),
    nomLu: z.string().max(80).default(""),
    ok: z.boolean().catch(false),
    pourquoi: z.string().max(300).default(""),
    /** La piste graphique en quelques mots (« un R dont la boucle dessine une voiture ») : sert à « Évite ces pistes ». */
    piste: z.string().max(160).default(""),
    /**
     * La petite phrase écrite sous le nom, relevée mot pour mot (24 novembre 2026, le propriétaire : « ça donne des idées
     * de slogan, […] si le client veux le slogan de la 5 et le logo 1, sina doit pouvoir le faire »). Depuis le 25 novembre
     * 2026 (essai d'Écume : la seconde ligne n'était pas relevée), TOUT le texte sous le nom, une ligne par élément, dans
     * l'ordre ([] s'il n'y en a pas). Une réponse d'avant, en une chaîne (« aucune » ou la phrase), se lit encore.
     */
    phraseSousLeNom: z.union([z.array(z.string().max(200)).max(8), z.string().max(200)]).optional().catch(undefined),
    /** Le relecteur juge-t-il ces lignes sans aucune faute (orthographe, accents, accords) ? */
    phraseBienEcrite: z.boolean().optional().catch(false),
  })).max(60).default([]),
});
export type RelectureEsquisses = z.infer<typeof RelectureEsquissesSchema>;

export const RELECTEUR_DES_ESQUISSES = `Tu es le relecteur d'un studio de création de marques. On te montre des esquisses de logo numérotées, découpées dans des planches de recherche. Pour CHAQUE esquisse, réponds en JSON :
- numero : son numéro ;
- entiere : l'esquisse est entière (rien de coupé, aucune lettre ni aucun signe tronqué au bord) ;
- morceauDeVoisine : on voit un bout d'une autre esquisse (un fragment de lettre ou de dessin qui n'appartient pas à celle-ci) ;
- nomLu : le nom de la marque tel qu'il est écrit dans l'esquisse, lettre pour lettre, accents compris (vide s'il n'y est pas) ;
- ok : l'esquisse peut devenir une vraie marque commerciale (un dessin net, lisible, une idée graphique claire) ;
- pourquoi : une phrase simple qui dit ce qui ne va pas, ou ce qui fait sa force ;
- piste : la piste graphique en quelques mots (par exemple « un R dont la boucle dessine une voiture ») ;
- phraseSousLeNom : la petite phrase écrite sous le nom, recopiée mot pour mot, lettre pour lettre, accents et ponctuation compris, sans rien corriger : TOUT le texte écrit sous le nom, ligne par ligne, dans l'ordre, une ligne par élément de la liste, sans en oublier aucune ([] s'il n'y en a pas) ;
- phraseBienEcrite : chacune de ces lignes est en bon français, sans aucune faute d'orthographe, d'accent ni d'accord, sans lettre en trop ni en moins (faux s'il n'y en a pas, ou si une seule ligne a un doute).
Ne juge que ce que tu vois. Ne propose rien.`;
export const demandeAuRelecteurDesEsquisses = (nom: string, n: number) => `Marque : « ${nom} ». Voici ${n} esquisse(s), dans l'ordre : l'image n°1 est l'esquisse 1, et ainsi de suite.`;

const normNom = (t: string) => t.normalize("NFC").replace(/[’']/g, "'").toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
/** Le nom lu est-il le nom exact (casse et espaces mis à part ; accents compris) ? */
export const nomExact = (lu: string, nom: string) => normNom(lu) === normNom(nom);

export type Candidate = { modele: string; index: number; png: Buffer; requestId: string | null };
/**
 * `phrase` : le texte sous le nom, relevé mot pour mot (ses lignes dans l'ordre, à partir de deux), et s'il peut être
 * proposé tel quel (absente : aucune).
 */
export type EsquisseGardee = Candidate & { numero: number; piste: string; pourquoi: string; tour: number; phrase?: PhraseDeLEsquisse };
/** `enPlus` : correcte, mais pas nécessaire (les 6 de ce modèle étaient déjà là) ; jamais montrée. */
export type EsquisseRefusee = { modele: string; index: number; raison: string; tour: number; enPlus?: boolean };

/** Les verdicts du relecteur, appliqués par le code (le nom est toujours comparé par lui). */
export function appliquerLaRelecture(nom: string, candidates: Candidate[], r: RelectureEsquisses | null, tour: number): { gardees: Omit<EsquisseGardee, "numero">[]; refusees: EsquisseRefusee[] } {
  const gardees: Omit<EsquisseGardee, "numero">[] = [], refusees: EsquisseRefusee[] = [];
  candidates.forEach((c, i) => {
    const v = r?.esquisses.find((x) => x.numero === i + 1);
    const refus = (raison: string) => refusees.push({ modele: c.modele, index: c.index, raison, tour });
    if (!v) return refus("non relue");
    if (!v.entiere) return refus(`pas entière${v.pourquoi ? ` : ${v.pourquoi}` : ""}`);
    if (v.morceauDeVoisine) return refus("un morceau de la voisine");
    // Une arche, un médaillon ou un badge rond sont permis pour un logo (25 novembre 2026) : jamais une raison d'écarter.
    if (!nomExact(v.nomLu, nom)) return refus(v.nomLu ? `nom mal écrit : « ${v.nomLu} »` : "le nom n'y est pas");
    if (!v.ok) return refus(v.pourquoi || "pas au niveau d'une vraie marque");
    // La phrase sous le nom, toutes ses lignes : gardée avec l'esquisse ; proposée telle quelle seulement si l'orthographe
    // de chaque ligne est sûre.
    const phrase = phraseDeLEsquisse(v.phraseSousLeNom, v.phraseBienEcrite);
    gardees.push({ ...c, piste: v.piste.trim(), pourquoi: v.pourquoi.trim(), tour, ...(phrase ? { phrase } : {}) });
  });
  return { gardees, refusees };
}

// ---------------------------------------------------------------- la planche-contact (gratuite)

const echapper = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
/** La planche-contact numérotée des esquisses gardées, pour SINA (et l'onglet Marque). */
export async function plancheContact(esquisses: { numero: number; png: Buffer }[], colonnes = 4, cote = 256): Promise<Buffer> {
  const n = Math.max(1, esquisses.length), lignes = Math.ceil(n / colonnes), pas = cote + 16;
  const W = colonnes * pas + 16, H = lignes * pas + 16;
  const tuiles = await Promise.all(esquisses.map(async (e, i) => {
    const x = 16 + (i % colonnes) * pas, y = 16 + Math.floor(i / colonnes) * pas;
    const img = await sharp(e.png).resize(cote, cote, { fit: "contain", background: "#FFFFFF" }).png().toBuffer();
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="34"><rect width="44" height="34" rx="8" fill="#111111"/><text x="22" y="24" font-family="sans-serif" font-size="20" font-weight="700" fill="#FFFFFF" text-anchor="middle">${echapper(String(e.numero))}</text></svg>`);
    return [{ input: img, left: x, top: y }, { input: svg, left: x + 6, top: y + 6 }];
  }));
  return sharp({ create: { width: W, height: H, channels: 3, background: "#F2F2F0" } }).composite(tuiles.flat()).png().toBuffer();
}

// ---------------------------------------------------------------- la recherche entière

/**
 * LES 12 ESQUISSES TOUJOURS CORRECTES (25 novembre 2026, le propriétaire, mot pour mot : « La création de la planche de
 * logo, et jamais au grand jamais on propose une planche de logo sans les 12 logos fait correctement », puis « Non sina
 * doit réussir à faire les 12 logos correctement sur la planche »). Elle remplace « moins de huit : les deux planches
 * refaites une fois ».
 *  - Le client voit toujours exactement 12 esquisses correctes : 6 de chaque modèle de la recherche.
 *  - Chaque esquisse écartée est remplacée, avec LE MÊME MODÈLE (6 et 6 restent la règle), puis relue.
 *  - La façon la moins chère qui donne de vraies pistes différentes : une NOUVELLE PLANCHE de six du modèle à qui il en
 *    manque, avec la demande exacte suivie de « Évite ces pistes déjà présentées : … » (les pistes gardées). Chiffres de la
 *    formule officielle des jetons (« medium ») : une planche de six en 1536 × 1024 produit 343 jetons en 2.5 Sunburst
 *    (1 132 en 2.6 Flare), une seule esquisse en 1024 × 1024, la plus petite image carrée, 439 (1 449) : une planche
 *    entière coûte moins qu'une esquisse seule, et donne six pistes au lieu d'une. On y prend, dans l'ordre, ce qui manque.
 *  - Une borne : `REMPLACEMENTS_MAX` tours de remplacement au plus (chaque tour : au plus une planche par modèle à qui il
 *    en manque, et une relecture), dans la borne du Studio de la tâche. Atteinte, ou une panne, un plafond : la recherche
 *    est INCOMPLÈTE ; la tâche s'arrête en erreur visible au Studio, et rien n'est montré au client (jamais moins de 12).
 *  - Les remplacements sont payés par le Studio (`aLaChargeDuStudio`), comme les autres reprises.
 * Une panne du fournisseur n'est jamais relancée toute seule.
 */
export const ESQUISSES_PAR_MODELE = 6;
/** Le nombre d'esquisses montrées au client : 6 par modèle de la recherche, 12 en tout. */
export const ESQUISSES_MONTREES = ESQUISSES_PAR_MODELE * MODELES_DE_RECHERCHE.length;
/** Au plus trois tours de remplacement (chacun : une planche par modèle à qui il en manque, une relecture). */
export const REMPLACEMENTS_MAX = 3;

export type RechercheDeps = {
  /** Une planche de recherche (la demande exacte, sans secours). */
  planche: (modele: string, prompt: string, tour: number) => Promise<Omit<PlancheRecue, "modele" | "texteEnvoye">>;
  /** UN appel au relecteur le plus fort, effort moyen, pour toutes les esquisses numérotées du tour. */
  relire: (images: Buffer[], nom: string, tour: number) => Promise<RelectureEsquisses>;
  /** Ce qui suit est à la charge du Studio (les remplacements). */
  aLaChargeDuStudio: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Plafond de dépense atteint (jamais une panne du fournisseur). */
  estPlafond?: (e: unknown) => boolean;
};
export type ResultatDeRecherche = {
  esquisses: EsquisseGardee[]; refusees: EsquisseRefusee[]; planches: PlancheRecue[]; manquees: PlancheManquee[];
  planchesRefusees: { modele: string; raison: string; tour: number }[];
  /** Vrai dès qu'il a fallu remplacer au moins une esquisse. */
  reprise: boolean;
  /** Les 12 esquisses correctes sont là (6 par modèle). Faux : rien n'est montré au client. */
  complete: boolean;
  /** Le vrai résultat : combien des 12 étaient correctes dès les deux premières planches. */
  correctesDesLesPlanches: number;
  /** Combien ont dû être remplacées (12 moins les correctes du premier tour), et lesquelles, avec leur raison. */
  remplacees: EsquisseRefusee[];
  /** Les tours de remplacement faits (0 à `REMPLACEMENTS_MAX`). */
  tours: number;
  notes: string[]; contact: Buffer | null;
};

/**
 * La recherche : deux planches en même temps (une par modèle), découpées, relues en un seul appel ; chaque esquisse
 * écartée est remplacée par le même modèle jusqu'à 6 par modèle, au plus `REMPLACEMENTS_MAX` tours, à la charge du
 * Studio. `depart` : le premier numéro (la numérotation continue pour « d'autres pistes ») ; `eviter` : les pistes déjà
 * présentées au client. Les gardées sont numérotées modèle par modèle (les 6 du premier, puis les 6 du second).
 */
export async function rechercheDesEsquisses(deps: RechercheDeps, o: { nom: string; metier: Pick<Metier, "metier" | "court" | "piste">; depart?: number; eviter?: readonly string[]; remplacementsMax?: number }): Promise<ResultatDeRecherche> {
  const notes: string[] = [], planches: PlancheRecue[] = [], manquees: PlancheManquee[] = [], refusees: EsquisseRefusee[] = [], planchesRefusees: ResultatDeRecherche["planchesRefusees"] = [];
  const modeles: string[] = [...MODELES_DE_RECHERCHE];
  const parModele = new Map<string, Omit<EsquisseGardee, "numero">[]>(modeles.map((m) => [m, []]));
  const manque = (m: string) => ESQUISSES_PAR_MODELE - (parModele.get(m)?.length ?? 0);
  const unTour = async (tour: number, pour: readonly string[], eviter: readonly string[]) => {
    const prompt = demandeDeRecherche({ nom: o.nom, metier: o.metier, eviter });
    const r = await lancerLesPlanches((m, p) => deps.planche(m, p, tour), prompt, deps.estPlafond, pour);
    planches.push(...r.planches); manquees.push(...r.manquees);
    const candidates: Candidate[] = [];
    for (const p of r.planches) {
      const d = await decouperLaPlanche(p.png);
      if (!d.ok) { planchesRefusees.push({ modele: p.modele, raison: d.raison, tour }); notes.push(`planche ${p.modele} refusée (contrôle sans IA) : ${d.raison}`); continue; }
      for (const c of d.cases) {
        if (c.png) candidates.push({ modele: p.modele, index: c.index, png: c.png, requestId: p.requestId });
        else refusees.push({ modele: p.modele, index: c.index, raison: c.refus ?? "refusée", tour });
      }
    }
    if (!candidates.length) return;
    let lu: RelectureEsquisses | null = null;
    try { lu = await deps.relire(candidates.map((c) => c.png), o.nom, tour); }
    catch (e) { notes.push(`relecture des esquisses impossible : ${String((e as Error)?.message ?? e).slice(0, 200)} ; aucune esquisse non relue n'est montrée`); if (deps.estPlafond?.(e)) manquees.push({ modele: "relecture", raison: "plafond", plafond: true }); else manquees.push({ modele: "relecture", raison: String((e as Error)?.message ?? e).slice(0, 200) }); }
    if (!lu) { for (const c of candidates) refusees.push({ modele: c.modele, index: c.index, raison: "non relue", tour }); return; }
    const a = appliquerLaRelecture(o.nom, candidates, lu, tour);
    refusees.push(...a.refusees);
    // Dans l'ordre des cases : on prend ce qui manque à ce modèle ; une esquisse correcte en plus n'est pas montrée.
    for (const g of a.gardees) {
      if (manque(g.modele) > 0) parModele.get(g.modele)!.push(g);
      else refusees.push({ modele: g.modele, index: g.index, raison: `correcte, mais pas nécessaire : les ${ESQUISSES_PAR_MODELE} de ce modèle étaient déjà là`, tour, enPlus: true });
    }
  };
  const eviter = [...(o.eviter ?? [])];
  await unTour(1, modeles, eviter);
  const correctesDesLesPlanches = modeles.reduce((n, m) => n + (parModele.get(m)?.length ?? 0), 0);
  // Celles qui ont dû être remplacées : les écartées du premier tour (cases refusées par la découpe ou le relecteur,
  // planche refusée entière ou venue en panne), dans la limite de ce qui manquait.
  const remplacees: EsquisseRefusee[] = [
    ...refusees.filter((x) => x.tour === 1 && !x.enPlus),
    ...planchesRefusees.filter((x) => x.tour === 1).flatMap((x) => Array.from({ length: ESQUISSES_PAR_MODELE }, (_v, i) => ({ modele: x.modele, index: i, raison: `planche entière refusée : ${x.raison}`, tour: 1 }))),
  ].sort((x, y) => modeles.indexOf(x.modele) - modeles.indexOf(y.modele) || x.index - y.index);
  const max = o.remplacementsMax ?? REMPLACEMENTS_MAX;
  let tours = 0;
  while (modeles.some((m) => manque(m) > 0) && tours < max) {
    if (manquees.length) { notes.push(`il manque des esquisses, mais une planche ou la relecture n'est pas venue (${manquees.map((m) => m.modele).join(", ")}) : rien n'est relancé tout seul`); break; }
    tours += 1;
    const pour = modeles.filter((m) => manque(m) > 0);
    notes.push(`remplacement ${tours} : ${pour.map((m) => `${manque(m)} esquisse(s) de ${m}`).join(", ")}, à la charge du Studio`);
    const dejaGardees = modeles.flatMap((m) => parModele.get(m)!.map((g) => g.piste)).filter(Boolean);
    await deps.aLaChargeDuStudio(() => unTour(tours + 1, pour, [...eviter, ...dejaGardees]));
  }
  const complete = modeles.every((m) => manque(m) <= 0);
  if (!complete) notes.push(`recherche incomplète : ${modeles.map((m) => `${parModele.get(m)!.length}/${ESQUISSES_PAR_MODELE} de ${m}`).join(", ")} après ${tours} tour(s) de remplacement (borne : ${max}) ; rien n'est montré au client`);
  const depart = o.depart ?? 1;
  const ordre = modeles.flatMap((m) => parModele.get(m)!);
  const esquisses = complete ? ordre.map((g, i) => ({ ...g, numero: depart + i })) : [];
  const contact = complete ? await plancheContact(esquisses) : null;
  return { esquisses, refusees, planches, manquees, planchesRefusees, reprise: tours > 0, complete, correctesDesLesPlanches, remplacees, tours, notes, contact };
}
