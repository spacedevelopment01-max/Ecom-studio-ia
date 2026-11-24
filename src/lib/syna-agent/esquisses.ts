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
 * Puis UN appel au relecteur le plus fort, effort moyen, pour toutes les esquisses numérotées : entière, morceau de
 * voisine, nom lu (comparé par le code au nom exact), arche, ok, pourquoi, et la piste en quelques mots (elle sert à
 * « Évite ces pistes déjà présentées », sans autre appel). Une esquisse refusée n'est jamais montrée ni jointe à SINA ; les
 * gardées sont renumérotées sans trou. S'il en reste moins de 8, les deux planches sont refaites UNE fois, à la charge du
 * Studio, avec « Évite ces pistes déjà présentées : … ». Une panne du fournisseur n'est jamais relancée toute seule.
 * Une planche-contact numérotée est faite par le code, gratuitement, pour SINA.
 */
import sharp from "sharp";
import { z } from "zod";
import { demandeDeRecherche, lancerLesPlanches, type Metier, type PlancheManquee, type PlancheRecue } from "./logo-recherche";

// ---------------------------------------------------------------- la découpe (gratuite)

/** Taille du côté d'une esquisse recadrée. */
export const COTE_ESQUISSE = 512;
/** Marge autour du dessin, en part de son plus grand côté. */
const MARGE = 0.12;
/** Tolérance de la recherche d'une bande blanche : 15 % d'une case. */
const TOLERANCE = 0.15;

type Brut = { data: Buffer; w: number; h: number };
const encreEn = (b: Brut, x: number, y: number): boolean => {
  const i = (y * b.w + x) * 3, r = b.data[i], g = b.data[i + 1], bl = b.data[i + 2];
  const mn = Math.min(r, g, bl), mx = Math.max(r, g, bl);
  return mn < 215 || mx - mn > 35;
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
  return { zone: [bx0, bx1, by0, by1], recadree };
}

/** La découpe d'une planche en six esquisses carrées (gratuite, sans IA). */
export async function decouperLaPlanche(png: Buffer): Promise<Decoupe> {
  const { data, info } = await sharp(png).flatten({ background: "#FFFFFF" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const b: Brut = { data, w: info.width, h: info.height };
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
    arche: z.boolean().catch(true),
    ok: z.boolean().catch(false),
    pourquoi: z.string().max(300).default(""),
    /** La piste graphique en quelques mots (« un R dont la boucle dessine une voiture ») : sert à « Évite ces pistes ». */
    piste: z.string().max(160).default(""),
  })).max(60).default([]),
});
export type RelectureEsquisses = z.infer<typeof RelectureEsquissesSchema>;

export const RELECTEUR_DES_ESQUISSES = `Tu es le relecteur d'un studio de création de marques. On te montre des esquisses de logo numérotées, découpées dans des planches de recherche. Pour CHAQUE esquisse, réponds en JSON :
- numero : son numéro ;
- entiere : l'esquisse est entière (rien de coupé, aucune lettre ni aucun signe tronqué au bord) ;
- morceauDeVoisine : on voit un bout d'une autre esquisse (un fragment de lettre ou de dessin qui n'appartient pas à celle-ci) ;
- nomLu : le nom de la marque tel qu'il est écrit dans l'esquisse, lettre pour lettre, accents compris (vide s'il n'y est pas) ;
- arche : le dessin est posé dans une arche, une demi-lune ou un cadre arrondi en arc (interdit au Studio) ;
- ok : l'esquisse peut devenir une vraie marque commerciale (un dessin net, lisible, une idée graphique claire) ;
- pourquoi : une phrase simple qui dit ce qui ne va pas, ou ce qui fait sa force ;
- piste : la piste graphique en quelques mots (par exemple « un R dont la boucle dessine une voiture »).
Ne juge que ce que tu vois. Ne propose rien.`;
export const demandeAuRelecteurDesEsquisses = (nom: string, n: number) => `Marque : « ${nom} ». Voici ${n} esquisse(s), dans l'ordre : l'image n°1 est l'esquisse 1, et ainsi de suite.`;

const normNom = (t: string) => t.normalize("NFC").replace(/[’']/g, "'").toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
/** Le nom lu est-il le nom exact (casse et espaces mis à part ; accents compris) ? */
export const nomExact = (lu: string, nom: string) => normNom(lu) === normNom(nom);

export type Candidate = { modele: string; index: number; png: Buffer; requestId: string | null };
export type EsquisseGardee = Candidate & { numero: number; piste: string; pourquoi: string; tour: number };
export type EsquisseRefusee = { modele: string; index: number; raison: string; tour: number };

/** Les verdicts du relecteur, appliqués par le code (le nom est toujours comparé par lui). */
export function appliquerLaRelecture(nom: string, candidates: Candidate[], r: RelectureEsquisses | null, tour: number): { gardees: Omit<EsquisseGardee, "numero">[]; refusees: EsquisseRefusee[] } {
  const gardees: Omit<EsquisseGardee, "numero">[] = [], refusees: EsquisseRefusee[] = [];
  candidates.forEach((c, i) => {
    const v = r?.esquisses.find((x) => x.numero === i + 1);
    const refus = (raison: string) => refusees.push({ modele: c.modele, index: c.index, raison, tour });
    if (!v) return refus("non relue");
    if (!v.entiere) return refus(`pas entière${v.pourquoi ? ` : ${v.pourquoi}` : ""}`);
    if (v.morceauDeVoisine) return refus("un morceau de la voisine");
    if (v.arche) return refus("une arche");
    if (!nomExact(v.nomLu, nom)) return refus(v.nomLu ? `nom mal écrit : « ${v.nomLu} »` : "le nom n'y est pas");
    if (!v.ok) return refus(v.pourquoi || "pas au niveau d'une vraie marque");
    gardees.push({ ...c, piste: v.piste.trim(), pourquoi: v.pourquoi.trim(), tour });
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

/** Il faut au moins 8 esquisses gardées ; en dessous, les deux planches sont refaites une fois (à la charge du Studio). */
export const ESQUISSES_MIN = 8;

export type RechercheDeps = {
  /** Une planche de recherche (la demande exacte, sans secours). */
  planche: (modele: string, prompt: string, tour: number) => Promise<Omit<PlancheRecue, "modele" | "texteEnvoye">>;
  /** UN appel au relecteur le plus fort, effort moyen, pour toutes les esquisses numérotées. */
  relire: (images: Buffer[], nom: string, tour: number) => Promise<RelectureEsquisses>;
  /** Ce qui suit est à la charge du Studio (la reprise quand il reste moins de 8 esquisses). */
  aLaChargeDuStudio: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Plafond de dépense atteint (jamais une panne du fournisseur). */
  estPlafond?: (e: unknown) => boolean;
};
export type ResultatDeRecherche = {
  esquisses: EsquisseGardee[]; refusees: EsquisseRefusee[]; planches: PlancheRecue[]; manquees: PlancheManquee[];
  planchesRefusees: { modele: string; raison: string; tour: number }[]; reprise: boolean; notes: string[]; contact: Buffer | null;
};

/**
 * La recherche : deux planches en même temps, découpées, relues en un seul appel ; moins de 8 esquisses gardées : une
 * seule reprise des deux planches, à la charge du Studio, avec « Évite ces pistes déjà présentées : … ». Jamais de reprise
 * après une panne ou un plafond (une panne n'est jamais relancée toute seule). `depart` : le premier numéro (la
 * numérotation continue pour « d'autres pistes ») ; `eviter` : les pistes déjà présentées au client.
 */
export async function rechercheDesEsquisses(deps: RechercheDeps, o: { nom: string; metier: Pick<Metier, "metier" | "court" | "piste">; depart?: number; eviter?: readonly string[]; repriseSiMoinsDe8?: boolean }): Promise<ResultatDeRecherche> {
  const notes: string[] = [], planches: PlancheRecue[] = [], manquees: PlancheManquee[] = [], refusees: EsquisseRefusee[] = [], planchesRefusees: ResultatDeRecherche["planchesRefusees"] = [];
  const gardees: Omit<EsquisseGardee, "numero">[] = [];
  const unTour = async (tour: number, eviter: readonly string[]) => {
    const prompt = demandeDeRecherche({ nom: o.nom, metier: o.metier, eviter });
    const r = await lancerLesPlanches((m, p) => deps.planche(m, p, tour), prompt, deps.estPlafond);
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
    const a = appliquerLaRelecture(o.nom, candidates, lu, tour);
    gardees.push(...a.gardees); refusees.push(...a.refusees);
  };
  const eviter = [...(o.eviter ?? [])];
  await unTour(1, eviter);
  let reprise = false;
  if (gardees.length < ESQUISSES_MIN && o.repriseSiMoinsDe8 !== false) {
    if (manquees.length) notes.push(`moins de ${ESQUISSES_MIN} esquisses, mais une planche ou la relecture n'est pas venue (${manquees.map((m) => m.modele).join(", ")}) : rien n'est relancé tout seul`);
    else {
      reprise = true;
      notes.push(`${gardees.length} esquisse(s) gardée(s) sur ${ESQUISSES_MIN} au moins : les deux planches sont refaites une fois, à la charge du Studio`);
      await deps.aLaChargeDuStudio(() => unTour(2, [...eviter, ...gardees.map((g) => g.piste).filter(Boolean)]));
    }
  }
  const depart = o.depart ?? 1;
  const esquisses = gardees.map((g, i) => ({ ...g, numero: depart + i }));
  const contact = esquisses.length ? await plancheContact(esquisses) : null;
  return { esquisses, refusees, planches, manquees, planchesRefusees, reprise, notes, contact };
}
