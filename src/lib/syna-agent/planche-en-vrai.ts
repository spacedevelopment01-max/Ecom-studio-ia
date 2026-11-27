/**
 * LA PLANCHE EN VRAI (demande du propriétaire du 25 novembre 2026, mot pour mot : « En soit c'est juste une planche de
 * démonstration et une fois que le client à choisi sa planche sina doit lui refaire à l'identique mais cette fois ci en
 * vrai sur son studio. Tu vois ça que je veux dire et ça doit être à l'identique en visuel » ; « Le clients pourra
 * télécharger les logo image au besoin et les code couleur seront la aussi en copier coller ? », puis « Oui lance la
 * construction »).
 *
 * Une fois la planche de démonstration choisie, le Studio la refait EN VRAI : chaque image est découpée sur la planche
 * choisie (son aperçu), refaite en haute définition à l'identique par OpenAI, relue face à son aperçu ; le reste (les dix
 * versions du logo, la palette, les polices, les textes) est fait par le code ; l'assemblage se fait en 3072 × 4608.
 *
 * Preuves (branche du chef d'orchestre, docs/studio/essais-logos-api/racine-planche-en-vrai/) : lancer.py (la règle REGLE,
 * les requêtes et les tailles), refaire-elements.py, assembler-planche.py (TUILES, POSTS, logos, palette, polices,
 * assemblage), boites.json, comparaison-demonstration-en-vrai.jpg.
 *
 * Derrière le réglage `sina.planche.envrai`, éteint par défaut ; seulement pour les nouveaux projets (ceux qui ont une
 * planche de marque). Ce module est pur (aucune base, aucun appel payant) : les cases fixes et leur recalage, la découpe
 * des aperçus, le texte envoyé, l'inventaire, la relecture et la reprise unique. Le code sans OpenAI est dans
 * planche-en-vrai-code.ts ; la tâche de fond dans planche-en-vrai-tache.ts ; l'appel d'image dans media-providers.ts
 * (`aiElementDeLaPlanche`).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { L } from "../i18n-server";
import { getJsonSetting } from "../settings";
import { NOTE_DU_PROPRIETAIRE } from "./note-du-proprietaire";
import { DOSSIER_DE_LA_PLANCHE, motQuiDitUnFait, motsDuProduit, nomDeProduitPermis, nomDuProduitALEcran } from "./planche-de-marque";
import { libelleDeLElement } from "./planche-en-vrai-libelles";

// ---------------------------------------------------------------- 0. le réglage

export const REGLAGE_PLANCHE_EN_VRAI = "sina.planche.envrai";
/** La planche en vrai est-elle allumée ? Éteinte par défaut : rien ne change tant que le propriétaire ne l'a pas allumée. */
export const plancheEnVraiActive = (): boolean => getJsonSetting<boolean>(REGLAGE_PLANCHE_EN_VRAI, false) === true;

// ---------------------------------------------------------------- 1. les cases fixes

/** Les cases des deux dispositions, mesurées une fois (assets/planche-de-marque/cases.json) ; empreinte vérifiée. */
export const CASES = { fichier: "cases.json", sha256: "fefa814fd23bb3890c8ea12c17e05912ceaa50dfa99247e8560bb825b397cecc" } as const;
export type Boite = [number, number, number, number];
export type Laquelle = "standard" | "animaux";
export type CasesDUneDisposition = { cases: Record<string, Boite>; pastilles: [number, number, number][] };
/** La taille de la planche de démonstration (celle des cases) et celle de la planche en vrai. */
export const TAILLE_DEMO = { w: 1536, h: 2304 } as const;
export const ECHELLE = 2;
export const TAILLE_EN_VRAI = { w: TAILLE_DEMO.w * ECHELLE, h: TAILLE_DEMO.h * ECHELLE } as const;

let casesEnMemoire: Record<Laquelle, CasesDUneDisposition> | null = null;
/** Les cases d'une disposition. Un fichier changé n'est jamais lu : la découpe serait autre que celle des preuves. */
export function lesCases(laquelle: Laquelle): CasesDUneDisposition {
  if (!casesEnMemoire) {
    const data = fs.readFileSync(path.join(process.cwd(), DOSSIER_DE_LA_PLANCHE, CASES.fichier));
    if (crypto.createHash("sha256").update(data).digest("hex") !== CASES.sha256) throw new Error(`Fichier fixe de la planche changé : ${CASES.fichier}. Rien n'est découpé.`);
    const j = JSON.parse(data.toString("utf8")) as { dispositions: Record<Laquelle, CasesDUneDisposition> };
    casesEnMemoire = { standard: j.dispositions.standard, animaux: j.dispositions.animaux };
  }
  return casesEnMemoire[laquelle];
}

// ---------------------------------------------------------------- 2. les 17 images

export const GROUPES = ["publications", "site", "produits", "references"] as const;
export type Groupe = (typeof GROUPES)[number];
export const NOM_DU_GROUPE: Record<Groupe, string> = { publications: "publications", site: "ouvertures et site", produits: "produits et emballage", references: "références" };

export type DefElement = {
  /** La taille demandée à OpenAI (tailles des preuves). */
  taille: string;
  /** Le format final : recadré au centre (publications) ou RÉDUIT sans jamais être rogné (ouverture du site). Sinon la taille reçue. */
  final?: { w: number; h: number; mode: "recadrer" | "reduire" };
  /** Ce qu'est l'élément, dit en une ligne (sans aucun nom de client ni d'essai). */
  quoi: string;
  groupe: Groupe;
  /** Format large : une marge généreuse est demandée, pour qu'aucun texte ne touche les bords. */
  large?: boolean;
  /** Les bandes blanches ajoutées en haut et en bas sont rognées par le code AVANT la relecture (`rognerLesMargesBlanches`). */
  sansMargesBlanches?: boolean;
};
const MARGE_LARGE = "Garde des marges généreuses : aucun texte ne touche les bords.";
export const ELEMENTS = {
  "publication-1x1": { taille: "1088x1088", final: { w: 1080, h: 1080, mode: "recadrer" }, quoi: "C'est une publication carrée pour les réseaux sociaux, 1080 × 1080.", groupe: "publications" },
  "publication-4x5": { taille: "1088x1360", final: { w: 1080, h: 1350, mode: "recadrer" }, quoi: "C'est une publication portrait pour les réseaux sociaux, 1080 × 1350.", groupe: "publications" },
  "publication-9x16": { taille: "1088x1936", final: { w: 1080, h: 1920, mode: "recadrer" }, quoi: "C'est une story pour les réseaux sociaux, 1080 × 1920.", groupe: "publications" },
  "ouverture-site": { taille: "2048x768", final: { w: 1920, h: 720, mode: "reduire" }, quoi: "C'est la grande image d'ouverture du site, au format bandeau 1920 × 720 ; garde chaque élément à sa place.", groupe: "site", large: true },
  "ouverture-planche": { taille: "2304x768", quoi: "C'est le bandeau d'ouverture de la planche ; garde des marges généreuses en haut et en bas, rien ne touche les bords.", groupe: "site", large: true, sansMargesBlanches: true },
  "site-ordinateur": { taille: "1520x1024", quoi: "C'est la page d'accueil du site, montrée sur un ordinateur portable ; tous les textes de l'écran restent nets et lisibles.", groupe: "site" },
  "site-telephone": { taille: "768x1712", quoi: "C'est la page d'accueil du site, montrée sur un téléphone ; tous les textes de l'écran restent nets et lisibles.", groupe: "site" },
  "produit-1": { taille: "912x1088", quoi: "C'est une photo produit de la marque.", groupe: "produits" },
  "produit-2": { taille: "912x1088", quoi: "C'est une photo produit de la marque.", groupe: "produits" },
  "produit-3": { taille: "912x1088", quoi: "C'est une photo produit de la marque.", groupe: "produits" },
  "emballage": { taille: "1344x1024", quoi: "C'est la photo des supports de marque (carton, sac, ruban adhésif, carte de remerciement).", groupe: "produits" },
  "reference-1": { taille: "1024x912", quoi: "C'est une photo d'ambiance de la marque.", groupe: "references" },
  "reference-2": { taille: "1024x912", quoi: "C'est une photo d'ambiance de la marque.", groupe: "references" },
  "reference-3": { taille: "1024x912", quoi: "C'est une photo d'ambiance de la marque.", groupe: "references" },
  "reference-4": { taille: "1024x912", quoi: "C'est une photo d'ambiance de la marque.", groupe: "references" },
  "reference-5": { taille: "1024x912", quoi: "C'est une photo d'ambiance de la marque.", groupe: "references" },
  "reference-6": { taille: "1024x912", quoi: "C'est une photo d'ambiance de la marque.", groupe: "references" },
} as const satisfies Record<string, DefElement>;
export type NomElement = keyof typeof ELEMENTS;
export const NOMS_DES_ELEMENTS = Object.keys(ELEMENTS) as NomElement[];
export const def = (n: NomElement): DefElement => ELEMENTS[n];
/** Les cases faites par le code seul (sans OpenAI), lues par l'inventaire. */
export const CASES_DU_CODE = ["haut", "palette", "typographies", "ton", "seo"] as const;
export const TUILES_DU_LOGO = Array.from({ length: 10 }, (_, i) => `logo-${i + 1}`);
export const TITRES = Array.from({ length: 10 }, (_, i) => `titre-${String(i + 1).padStart(2, "0")}`);
export const TAILLES_DE_LA_PLANCHE_EN_VRAI: readonly string[] = [...new Set(NOMS_DES_ELEMENTS.map((n) => ELEMENTS[n].taille))];

// ---------------------------------------------------------------- 3. le recalage et la découpe

/**
 * Chaque case est recalée sur les bords de son panneau, dans la planche choisie : la planche de démonstration suit la
 * disposition, sans être au pixel près. Chaque bord est cherché à RECALAGE_MAX pixels au plus, sur le plus fort saut de
 * luminosité moyenne ; sans saut net, le bord mesuré reste.
 */
export const RECALAGE_MAX = 30;
/**
 * LA RECHERCHE ÉLARGIE (essai réel d'Écume, 26 novembre 2026 : la story commençait 36 pixels plus à droite que sa case fixe,
 * la publication portrait finissait 38 pixels plus loin ; la case de la story prenait la fin du sous-titre du bloc 07 et le
 * bord de la publication voisine, celle de la publication portrait coupait ses textes). Après le recalage, chaque bord d'une
 * photo ou d'une publication est cherché jusqu'à RECALAGE_ELARGI pixels : une gouttière de la page (au moins 3 colonnes,
 * ou lignes, de la couleur de la page à 4 niveaux près sur 95 % de leurs points) à l'intérieur de la case ramène le bord
 * à elle ; une image coupée par le bord (la colonne juste dehors est texturée, pas la page) le pousse jusqu'à la
 * gouttière suivante. Sans gouttière nette dans la recherche, le bord ne bouge pas.
 */
export const RECALAGE_ELARGI = 60;
/** La couleur de la page de la planche : le gris le plus fréquent. */
export function couleurDeLaPage(g: Gris): number {
  const h = new Array(256).fill(0);
  for (let i = 0; i < g.data.length; i += 7) h[g.data[i]]++;
  return h.indexOf(Math.max(...h));
}
export function ajusterAuxGouttieres(g: Gris, b: Boite, page: number, r = RECALAGE_ELARGI, bandes: readonly Boite[] = []): Boite {
  const [x0, y0, x1, y1] = b;
  const iy0 = Math.round(y0 + (y1 - y0) / 5), iy1 = Math.round(y1 - (y1 - y0) / 5), ix0 = Math.round(x0 + (x1 - x0) / 5), ix1 = Math.round(x1 - (x1 - x0) / 5);
  const ligneDe = (vertical: boolean, v: number) => { const out: number[] = []; if (vertical) { if (v < 0 || v >= g.w) return out; for (let y = iy0; y < iy1; y++) out.push(g.data[y * g.w + v]); } else { if (v < 0 || v >= g.h) return out; for (let x = ix0; x < ix1; x++) out.push(g.data[v * g.w + x]); } return out; };
  // Une gouttière : une colonne (ou ligne) claire et unie, la page ou le fond d'un panneau (écart type de 3 au plus, moyenne
  // de 235 au moins, ou la couleur de la page à 4 niveaux près sur 95 % de ses points).
  const estPage = (vertical: boolean, v: number) => {
    const l = ligneDe(vertical, v);
    if (!l.length) return false;
    const m = l.reduce((a, c) => a + c, 0) / l.length, et = Math.sqrt(l.reduce((a, c) => a + (c - m) ** 2, 0) / l.length);
    return (et <= 3 && m >= 235) || l.filter((p) => Math.abs(p - page) <= 4).length >= l.length * 0.95;
  };
  const texturee = (vertical: boolean, v: number) => { const l = ligneDe(vertical, v); if (!l.length) return false; const m = l.reduce((a, c) => a + c, 0) / l.length; return Math.sqrt(l.reduce((a, c) => a + (c - m) ** 2, 0) / l.length) > 8 && !estPage(vertical, v); };
  /** Un bord : `pas` vaut +1 quand l'intérieur est vers les valeurs croissantes (bord gauche ou haut). */
  const bord = (vertical: boolean, c: number, pas: 1 | -1, max: number) => {
    const dedans = (v: number) => (pas === 1 ? v : v - 1), dehors = (v: number) => (pas === 1 ? v - 1 : v);
    // Une gouttière dans la case, près du bord : le bord va au bout de la gouttière, côté image.
    for (let d = 0; d <= r; d++) {
      const v = dedans(c + pas * d);
      if (v < 0 || v >= max || !estPage(vertical, v)) continue;
      let n = 0; while (n < r && estPage(vertical, v + pas * n)) n++;
      const apres = v + pas * n;
      // Une vraie séparation entre deux images : une gouttière d'au moins 8 colonnes, la partie coupée texturée (une autre
      // image) sur au moins la moitié de ses colonnes, et l'image juste après (une colonne de transition permise).
      const coupees = Array.from({ length: Math.abs(v - c) + (pas === 1 ? 0 : 0) }, (_, k) => c + pas * k).map((u) => dedans(u));
      const autreImage = coupees.length >= 3 && coupees.filter((u) => texturee(vertical, u)).length >= coupees.length / 2;
      if (n >= 8 && autreImage && [0, 1, 2].some((k) => texturee(vertical, apres + pas * k))) return pas === 1 ? apres : apres + 1;
      break;
    }
    // Une image coupée par le bord : le bord va jusqu'à la gouttière suivante, dehors, jamais dans la bande d'un titre.
    if (estPage(vertical, dehors(c)) || !texturee(vertical, dehors(c))) return c;
    const dansUneBande = (v: number) => bandes.some((t) => (vertical ? v >= t[0] && v < t[2] && y1 > t[1] && y0 < t[3] : v >= t[1] && v < t[3] && x1 > t[0] && x0 < t[2]));
    for (let d = 1; d <= r; d++) {
      const v = dehors(c - pas * d + (pas === 1 ? 0 : 0));
      if (v < 0 || v >= max || dansUneBande(v)) return c;
      if (estPage(vertical, v) && estPage(vertical, v - pas) && estPage(vertical, v - 2 * pas)) return pas === 1 ? v + 1 : v;
    }
    return c;
  };
  return [bord(true, x0, 1, g.w), bord(false, y0, 1, g.h), bord(true, x1, -1, g.w), bord(false, y1, -1, g.h)];
}
type Gris = { data: Buffer; w: number; h: number };
const gris = async (png: Buffer): Promise<Gris> => { const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };

export function recalerUneCase(g: Gris, b: Boite, r = RECALAGE_MAX): Boite {
  const [x0, y0, x1, y1] = b;
  const iy0 = Math.round(y0 + (y1 - y0) / 5), iy1 = Math.round(y1 - (y1 - y0) / 5), ix0 = Math.round(x0 + (x1 - x0) / 5), ix1 = Math.round(x1 - (x1 - x0) / 5);
  // Le bord d'une photo : le plus fort saut de luminosité moyenne (plus de 12 niveaux) où le grain est plus fort DEDANS que
  // dehors (une photo texturée contre un fond lisse). Le sens compte : le bord du panneau voisin, à quelques pixels de là,
  // a son grain de l'autre côté et n'est jamais pris. Sans bord net, la case mesurée reste.
  const F = 6;
  const bord = (c: number, max: number, lum: (v: number) => number, grain: (v: number) => number, debut: boolean) => {
    const cache = <T,>(f: (v: number) => T) => { const m = new Map<number, T>(); return (v: number) => (m.has(v) ? m.get(v)! : (m.set(v, f(v)), m.get(v)!)); };
    const L0 = cache(lum), G0 = cache((v: number) => (v < 0 || v >= max - 1 ? 0 : grain(v)));
    const moy = (a: number, b: number) => { let s = 0; for (let v = a; v < b; v++) s += G0(v); return s / (b - a); };
    let meilleur = c, score = 12;
    for (let v = Math.max(F, c - r); v <= Math.min(max - F - 1, c + r); v++) {
      const dedans = debut ? moy(v, v + F) : moy(v - F, v), dehors = debut ? moy(v - F, v) : moy(v, v + F);
      if (dedans - dehors < -1) continue;
      // Un bord lointain doit être nettement plus franc : 3 niveaux de moins par pixel d'écart à la case mesurée.
      const s = Math.abs(L0(Math.min(max - 1, v + 1)) - L0(Math.max(0, v - 2))) - 3 * Math.abs(v - c);
      if (s > score || (s === score && Math.abs(v - c) < Math.abs(meilleur - c))) { score = s; meilleur = v; }
    }
    return meilleur;
  };
  const moyColonne = (x: number) => { let s = 0; for (let y = iy0; y < iy1; y++) s += g.data[y * g.w + x]; return s / Math.max(1, iy1 - iy0); };
  const moyLigne = (y: number) => { let s = 0; for (let x = ix0; x < ix1; x++) s += g.data[y * g.w + x]; return s / Math.max(1, ix1 - ix0); };
  const grainColonne = (x: number) => { let s = 0; for (let y = iy0; y < iy1; y++) s += Math.abs(g.data[y * g.w + x] - g.data[(y + 1) * g.w + x]); return s / Math.max(1, iy1 - iy0); };
  const grainLigne = (y: number) => { let s = 0; for (let x = ix0; x < ix1; x++) s += Math.abs(g.data[y * g.w + x] - g.data[y * g.w + x + 1]); return s / Math.max(1, ix1 - ix0); };
  const nx0 = bord(x0, g.w, moyColonne, grainColonne, true), nx1 = bord(x1, g.w, moyColonne, grainColonne, false);
  const ny0 = bord(y0, g.h, moyLigne, grainLigne, true), ny1 = bord(y1, g.h, moyLigne, grainLigne, false);
  return [nx0, ny0, nx1, ny1];
}

/**
 * Le refus d'une case découpée (comme pour les esquisses) : vide (presque une seule couleur), coupée (hors de la planche,
 * ou rétrécie de plus d'un quart au recalage), collée au bord de la planche sans y être prévue. Null : gardée.
 */
export async function refusDUneCase(g: Gris, b: Boite, mesuree: Boite, o: { auBord?: boolean } = {}): Promise<string | null> {
  const [x0, y0, x1, y1] = b;
  if (x0 < 0 || y0 < 0 || x1 > g.w || y1 > g.h || x1 - x0 < 8 || y1 - y0 < 8) return "coupée (hors de la planche)";
  const aire = (q: Boite) => (q[2] - q[0]) * (q[3] - q[1]);
  if (aire(b) < aire(mesuree) * 0.75) return "coupée (bien plus petite que la case prévue)";
  if (!o.auBord && (x0 <= 1 || y0 <= 1 || x1 >= g.w - 1 || y1 >= g.h - 1)) return "collée au bord de la planche";
  let s = 0, s2 = 0, n = 0;
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const v = g.data[y * g.w + x]; s += v; s2 += v * v; n++; }
  const ecart = Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
  return ecart < 6 ? "vide (presque une seule couleur)" : null;
}

/** Les cases qui touchent le bord de la planche par construction (le bandeau du haut). */
const AU_BORD = new Set(["ouverture-planche", "haut"]);
/** Les cases recalées : les photos et les publications (un grain net) ; les écrans (et l'ouverture dans l'écran de l'ordinateur), les tuiles, les blocs du code et les titres gardent leur case mesurée. */
const RECALEES = new Set<string>(["publication-1x1", "publication-4x5", "publication-9x16", "produit-1", "produit-2", "produit-3", "emballage", "reference-1", "reference-2", "reference-3", "reference-4", "reference-5", "reference-6"]);
/**
 * LES BANDES DES TITRES DE BLOC (essai réel d'Écume, 26 novembre 2026 : la case de la publication portrait, recalée vers
 * le haut, prenait la fin du sous-titre du bloc 07, « s contenus qui inspirent au quoti », et la story son « en » ;
 * l'inventaire les relevait comme textes de la case, et la relecture les réclamait). La bande d'un titre : la ligne du
 * titre (4 pixels de marge en haut et en bas), de son début jusqu'au titre suivant de la même ligne, sinon jusqu'au bord
 * droit de la page : le titre et son sous-titre y sont écrits.
 */
export function bandesDesTitres(laquelle: Laquelle): Map<string, Boite> {
  const c = lesCases(laquelle).cases, out = new Map<string, Boite>();
  const titres = TITRES.filter((t) => c[t]).map((t) => [t, c[t]] as const);
  for (const [t, b] of titres) {
    const suivants = titres.filter(([u, x]) => u !== t && x[0] > b[0] && x[1] < b[3] && x[3] > b[1]).map(([, x]) => x[0]);
    out.set(t, [b[0], b[1] - 4, suivants.length ? Math.min(...suivants) - 1 : TAILLE_DEMO.w - 16, b[3] + 4]);
  }
  return out;
}
/**
 * La part d'une case qui entre dans la bande d'un titre de bloc, quand cette part est la page (le fond et les lettres du
 * sous-titre) et non l'image : au moins 70 % de ses points à 20 niveaux de gris au plus du fond de la page, lu sur la
 * ligne juste au-dessus de la bande. Rend la bande touchée, ou null.
 */
export function bandeDeTitreTouchee(g: { data: Buffer; w: number; h: number }, laquelle: Laquelle, b: Boite): Boite | null {
  for (const [, t] of bandesDesTitres(laquelle)) {
    const x0 = Math.max(b[0], t[0]), x1 = Math.min(b[2], t[2]);
    if (x1 - x0 < 8 || !(b[1] < t[3] && b[3] > t[3] && b[1] >= t[1] - 6)) continue;
    const yf = Math.max(0, t[1] - 3), fond: number[] = [];
    for (let x = x0; x < x1; x++) fond.push(g.data[yf * g.w + x]);
    fond.sort((a, c) => a - c);
    const f = fond[fond.length >> 1];
    let n = 0, proches = 0;
    for (let y = Math.max(0, b[1]); y < t[3]; y++) for (let x = x0; x < x1; x++) { n++; if (Math.abs(g.data[y * g.w + x] - f) <= 20) proches++; }
    if (n && proches / n >= 0.7) return t;
  }
  return null;
}
/** La boîte d'une case touche-t-elle la bande d'un titre de bloc (au moins 4 pixels de chaque côté) ? */
export const entreDansUneBandeDeTitre = (laquelle: Laquelle, b: Boite): boolean =>
  [...bandesDesTitres(laquelle).values()].some((t) => Math.min(b[2], t[2]) - Math.max(b[0], t[0]) >= 4 && Math.min(b[3], t[3]) - Math.max(b[1], t[1]) >= 4);
/**
 * `debordes` : les cases dont l'aperçu touche encore la bande d'un titre de bloc (un bout du titre ou du sous-titre peut
 * y être lu, sur un côté). Quand la part prise dans la bande est la page, le haut de la case est d'abord ramené sous la bande.
 */
export type Decoupe = { apercus: Map<string, Buffer>; boites: Map<string, Boite>; refus: { case: string; raison: string }[]; debordes?: string[] };
/**
 * LA DÉCOUPE DES APERÇUS (gratuite, sans appel) : chaque case de la disposition, recalée sur la planche choisie, puis
 * contrôlée. Une planche qui n'est pas à la taille des cases est ramenée à cette taille avant la découpe.
 */
export async function decouperLesApercus(planche: Buffer, laquelle: Laquelle, noms?: readonly string[]): Promise<Decoupe> {
  const m = await sharp(planche).metadata();
  const png = m.width === TAILLE_DEMO.w && m.height === TAILLE_DEMO.h ? planche : await sharp(planche).resize(TAILLE_DEMO.w, TAILLE_DEMO.h, { fit: "fill" }).png().toBuffer();
  const g = await gris(png), c = lesCases(laquelle), page = couleurDeLaPage(g);
  const apercus = new Map<string, Buffer>(), boites = new Map<string, Boite>(), refus: Decoupe["refus"] = [], debordes: string[] = [];
  for (const [nom, mesuree] of Object.entries(c.cases)) {
    if (noms && !noms.includes(nom)) continue;
    // Seules les photos et les publications se recalent sur les bords de leur panneau (RECALEES).
    let b = RECALEES.has(nom) ? recalerUneCase(g, mesuree) : mesuree;
    // Jamais le titre ni le sous-titre d'un bloc dans l'aperçu d'une image : son haut est ramené sous la bande du titre.
    const image = !TITRES.includes(nom) && !(CASES_DU_CODE as readonly string[]).includes(nom) && !nom.startsWith("logo-");
    const bande = image ? bandeDeTitreTouchee(g, laquelle, b) : null;
    if (bande) b = [b[0], bande[3] + 1, b[2], b[3]];
    // Puis la recherche élargie, sur les gouttières de la page, jamais dans la bande d'un titre.
    if (RECALEES.has(nom)) b = ajusterAuxGouttieres(g, b, page, RECALAGE_ELARGI, [...bandesDesTitres(laquelle).values()]);
    if (image && entreDansUneBandeDeTitre(laquelle, b)) debordes.push(nom);
    const r = await refusDUneCase(g, b, mesuree, { auBord: AU_BORD.has(nom) });
    if (r) { refus.push({ case: nom, raison: r }); continue; }
    boites.set(nom, b);
    apercus.set(nom, await sharp(png).extract({ left: b[0], top: b[1], width: b[2] - b[0], height: b[3] - b[1] }).png().toBuffer());
  }
  return { apercus, boites, refus, debordes };
}

// ---------------------------------------------------------------- 4. le texte envoyé

/**
 * LA RÈGLE DES PREUVES (lancer.py, REGLE), mot pour mot. Seul le nom de la marque change (le nom d'essai n'est jamais
 * envoyé) ; la phrase du logo n'est dite que lorsque le logo est joint.
 */
export const REGLE_APERCU = "La première image est un aperçu en petit, découpé sur la planche d'identité que le client a choisie. "
  + "Refais-la à l'identique, en haute définition et à son vrai format : même composition, mêmes couleurs, même photographie, "
  + "mêmes textes au mot près, même typographie, mêmes placements. Améliore seulement la netteté et les détails.";
export const regleDuLogo = (nom: string) => `La deuxième image est le logo officiel de ${nom.trim()} : là où il apparaît, reproduis-le exactement, sans le redessiner.`;
/** REGLE mot pour mot (logo joint). */
export const regle = (nom: string) => `${REGLE_APERCU} ${regleDuLogo(nom)}`;
/**
 * LE SYMBOLE SEUL (essai réel du 25 novembre 2026, sixième image de référence : le logo complet joint, le dessinateur a
 * ajouté le nom sous le monogramme et changé sa couleur). Quand l'inventaire ne voit que le symbole dans la case, c'est le
 * symbole seul qui est joint, avec cette phrase à la place de celle du logo : sa forme exacte, la couleur et la matière
 * qu'il a sur l'aperçu, aucun nom ajouté.
 */
export const regleDuSymbole = (nom: string) => `La deuxième image est le symbole du logo officiel de ${nom.trim()}, seul, sans son nom : là où il apparaît, reproduis sa forme exactement, avec la couleur et la matière qu'il a sur l'aperçu, sans le redessiner ; n'ajoute ni le nom ni aucun texte à côté de lui.`;
const RANG = ["première", "deuxième", "troisième"];
export const phraseDuProduit = (rang: number) => `La ${RANG[rang - 1]} image est la photo du vrai produit du client : remplace le produit par celui de la photo jointe, garde la mise en scène à l'identique.`;
export const SANS_PERSONNE_EN_VRAI = "Aucune personne n'apparaît.";
/**
 * LES TEXTES DES ÉTIQUETTES (26 novembre 2026, essai réel du torréfacteur, étape 5 ; constat du chef d'orchestre : « Produits
 * et faits inventés dans les images refaites en HD. On y lit « L'ARABY DE PÉROU », « 100% ARABICA », des origines Brésil et
 * Pérou, et « CAFÉ DEPUIS 1928 ». L'aperçu A n'en avait pas. »). Sur l'aperçu, les petites étiquettes sont illisibles ; en
 * haute définition, le dessinateur les remplissait de noms, d'origines, de dates et de chiffres. La règle du propriétaire :
 * « SINA n'invente jamais les biens à vendre ». Dite en positif, dans la ligne qui dit l'élément (la règle des preuves reste
 * mot pour mot) : les étiquettes et les emballages ne portent que les textes de l'aperçu, le nom de la marque, la phrase de
 * son logo et les noms des produits de la fiche ; rien n'y est ajouté qui dise une date, une origine ou un chiffre.
 */
export const ligneDesTextesEnVrai = (produits: readonly string[]): string =>
  `Les étiquettes et les emballages ne portent que les textes de l'aperçu, le nom de la marque, la phrase de son logo et les noms des produits du client : ${produits.map((p) => `« ${nomDuProduitALEcran(p)} »`).join(", ")} ; aucune date, aucune origine, aucun chiffre n'y est ajouté.`;
/**
 * LES PETITS TEXTES ILLISIBLES DE L'APERÇU (27 novembre 2026, essai réel de Mouture, reprise des trois images ; constat du
 * chef d'orchestre : sur les étiquettes, une plaque ou un emballage, l'aperçu en petit ne montre que des traits ; en haute
 * définition, le dessinateur y écrivait des mots plausibles, une origine, un chiffre, un nom de lieu). Dite en positif, pour
 * tout client, dans la ligne qui dit l'élément (la règle des preuves reste mot pour mot) : ces petits textes restent des
 * traits ou une texture, sans aucun mot lisible ; seuls les mots déjà lisibles sur l'aperçu sont écrits.
 */
export const MICRO_TEXTES_EN_VRAI = "Les petits textes illisibles de l'aperçu restent de simples traits ou une texture, sans aucun mot lisible ; seuls les mots déjà lisibles sur l'aperçu sont écrits.";
/** La ligne qui dit ce qu'est l'élément (petits textes illisibles ; marge des formats larges ; textes des étiquettes ; sans accord du client, aucune personne). */
export function ligneDeLElement(n: NomElement, personnes: boolean, produits?: readonly string[]): string {
  const d = def(n);
  return [d.quoi, MICRO_TEXTES_EN_VRAI, d.large && !/marges généreuses/.test(d.quoi) ? MARGE_LARGE : "", produits?.length ? ligneDesTextesEnVrai(produits) : "", personnes ? "" : SANS_PERSONNE_EN_VRAI].filter(Boolean).join(" ");
}
/**
 * Le texte d'une image envoyé AVANT la ligne des étiquettes et celle des petits textes (une passe d'essai reçue avant ces
 * corrections) : le même texte, ces lignes retirées. Sert seulement à reconnaître une image déjà reçue et payée, jamais à
 * envoyer.
 */
export const texteSansLaLigneDesTextes = (texte: string, produits: readonly string[] | undefined): string => {
  const t = texte.replace(` ${MICRO_TEXTES_EN_VRAI}`, "");
  return produits?.length ? t.replace(` ${ligneDesTextesEnVrai(produits)}`, "") : t;
};
/** Le texte d'une image envoyé avant la ligne des petits textes seulement (la ligne des étiquettes y était déjà). */
export const texteSansLaLigneDesPetitsTextes = (texte: string): string => texte.replace(` ${MICRO_TEXTES_EN_VRAI}`, "");
export const finDeRepriseEnVrai = (raisons: readonly string[]) => `À corriger : ${raisons.join(" ; ")}.`;
/** LE TEXTE ENVOYÉ : REGLE mot pour mot (sa phrase du logo seulement si le logo est joint), la photo du produit, la ligne. */
export function texteDeLElement(o: { element: NomElement; nom: string; logo: boolean; photo: boolean; personnes: boolean; raisons?: readonly string[]; /** Le symbole seul est joint (jamais avec le logo complet). */ symbole?: boolean;
  /** Les produits de la fiche du client : la ligne des étiquettes s'ajoute à la ligne de l'élément (`ligneDesTextesEnVrai`). */
  produits?: readonly string[] }): string {
  const parts = [REGLE_APERCU];
  if (o.logo) parts.push(regleDuLogo(o.nom));
  else if (o.symbole) parts.push(regleDuSymbole(o.nom));
  if (o.photo) parts.push(phraseDuProduit(o.logo || o.symbole ? 3 : 2));
  parts.push(ligneDeLElement(o.element, o.personnes, o.produits));
  const t = parts.join(" ");
  return o.raisons?.length ? `${t}\n\n${finDeRepriseEnVrai(o.raisons)}` : t;
}
export type RoleDUneJointe = "apercu" | "logo" | "symbole" | "produit";
/**
 * Les images jointes, dans l'ordre : l'aperçu, le logo s'il est présent, la photo du produit s'il se voit et qu'elle existe.
 * Quand l'inventaire ne voit que le SYMBOLE dans la case (`logoVu` « symbole »), c'est le symbole seul qui est joint, tiré
 * de la séparation du code ; sans séparation fiable, rien n'est joint, jamais le logo complet. Une réponse d'avant ce champ
 * (`logoVu` absent) garde la règle d'avant : le logo complet.
 */
export function jointesDeLElement(o: { apercu: Buffer; logo: Buffer; photo: Buffer | null; inventaire: CaseLue | undefined; symbole?: Buffer | null }): { role: RoleDUneJointe; data: Buffer }[] {
  const out: { role: RoleDUneJointe; data: Buffer }[] = [{ role: "apercu", data: o.apercu }];
  if (o.inventaire?.logo) {
    if (o.inventaire.logoVu !== "symbole") out.push({ role: "logo", data: o.logo });
    else if (o.symbole?.length) out.push({ role: "symbole", data: o.symbole });
  }
  if (o.photo && o.inventaire?.produit) out.push({ role: "produit", data: o.photo });
  return out;
}

// ---------------------------------------------------------------- 5. le format final

/** Le format final : publications recadrées au centre ; ouverture du site RÉDUITE, jamais rognée ; le reste tel quel. */
export async function auFormatFinal(n: NomElement, png: Buffer): Promise<{ ok: true; png: Buffer; w: number; h: number } | { ok: false; raison: string }> {
  const d = def(n), m = await sharp(png).metadata(), w = m.width ?? 0, h = m.height ?? 0;
  if (!w || !h) return { ok: false, raison: "image illisible" };
  if (!d.final) return { ok: true, png, w, h };
  const { w: W, h: H } = d.final;
  if (d.final.mode === "recadrer") {
    if (w < W || h < H) return { ok: false, raison: `image reçue en ${w}x${h}, plus petite que ${W}x${H} : jamais agrandie` };
    return { ok: true, png: await sharp(png).extract({ left: Math.floor((w - W) / 2), top: Math.floor((h - H) / 2), width: W, height: H }).png().toBuffer(), w: W, h: H };
  }
  // Réduite, jamais rognée : le rapport des côtés reçu doit être celui du format (à 1 % près).
  if (Math.abs(w / h - W / H) / (W / H) > 0.01) return { ok: false, raison: `image reçue en ${w}x${h} : son rapport n'est pas celui de ${W}x${H}, elle serait rognée` };
  if (w < W) return { ok: false, raison: `image reçue en ${w}x${h}, plus petite que ${W}x${H} : jamais agrandie` };
  return { ok: true, png: await sharp(png).resize(W, H, { fit: "fill", kernel: "lanczos3" }).png().toBuffer(), w: W, h: H };
}

/**
 * LES MARGES BLANCHES D'UN BANDEAU, rognées par le code (essai réel du 25 novembre 2026 : le bandeau d'ouverture de la
 * planche, demandé en 2304 × 768, soit 3 pour 1, est revenu deux fois avec de larges bandes blanches en haut et en bas, et
 * a été refusé deux fois pour elles ; l'essai du chef d'orchestre les retirait en gardant les lignes dont la moitié droite
 * est plus sombre que 245).
 *
 * La règle, adaptée : une ligne est une MARGE quand elle est blanche sur TOUTE sa largeur (moyenne de gris au-dessus de
 * 245 et au moins 97 % de ses points au-dessus de 240), pas seulement sur sa moitié droite : un bandeau dont la photo est à
 * gauche et un fond clair à droite n'est jamais rogné dans son dessin. Seules les marges continues depuis le bord haut et
 * depuis le bord bas sont retirées, jamais une ligne blanche du milieu. Un bord n'est pas rogné quand l'aperçu a lui-même
 * une bande blanche de ce côté (au moins 8 % de sa hauteur) : c'est alors le dessin de la planche. Si les marges font plus
 * de la moitié de la hauteur, rien n'est rogné (l'image serait vidée). La largeur n'est jamais touchée ; l'image n'est
 * jamais déformée.
 */
export const SEUIL_DE_LA_MARGE = { moyenne: 245, point: 240, part: 0.97, partDeLApercu: 0.08 } as const;
async function lignesDeMarge(png: Buffer): Promise<{ h: number; haut: number; bas: number }> {
  const { data, info } = await sharp(png).flatten({ background: "#FFFFFF" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, pas = Math.max(1, Math.floor(W / 600));
  const marge = (y: number) => {
    let s = 0, n = 0, clairs = 0;
    for (let x = 0; x < W; x += pas) { const v = data[y * W + x]; s += v; n++; if (v >= SEUIL_DE_LA_MARGE.point) clairs++; }
    return s / n > SEUIL_DE_LA_MARGE.moyenne && clairs / n >= SEUIL_DE_LA_MARGE.part;
  };
  let haut = 0; while (haut < H && marge(haut)) haut++;
  let bas = 0; while (bas < H - haut && marge(H - 1 - bas)) bas++;
  return { h: H, haut, bas };
}
export async function rognerLesMargesBlanches(png: Buffer, apercu?: Buffer): Promise<Buffer> {
  const m = await lignesDeMarge(png);
  const a = apercu ? await lignesDeMarge(apercu) : null;
  const haut = a && a.haut >= a.h * SEUIL_DE_LA_MARGE.partDeLApercu ? 0 : m.haut;
  const bas = a && a.bas >= a.h * SEUIL_DE_LA_MARGE.partDeLApercu ? 0 : m.bas;
  if (!haut && !bas) return png;
  if (haut + bas > m.h / 2) return png;
  const { width } = await sharp(png).metadata();
  return sharp(png).extract({ left: 0, top: haut, width: width!, height: m.h - haut - bas }).png().toBuffer();
}

// ---------------------------------------------------------------- 6. l'inventaire (un appel, avant toute retouche)

export const CaseLueSchema = z.object({
  case: z.string().max(40),
  logo: z.boolean().catch(false),
  /**
   * Ce que la case montre du logo : « complet » (le symbole et le nom), « symbole » (le symbole seul, sans le nom écrit à
   * côté) ; null sans logo, ou dans une réponse d'avant ce champ (écartée sans risque : la règle d'avant s'applique).
   */
  logoVu: z.enum(["complet", "symbole"]).nullable().optional().catch(null),
  /** Les textes lisibles, mot pour mot, un par ligne. */
  textes: z.array(z.string().max(300)).max(40).catch([]),
  produit: z.boolean().catch(false),
  personne: z.boolean().catch(false),
  /** Pour les trois publications : compréhensible par quelqu'un qui ne connaît pas la marque. */
  comprehensible: z.boolean().nullable().catch(null),
  /** Ce que montre l'image, en une phrase (pour reprendre la photo sur le site). */
  description: z.string().max(300).catch(""),
});
export type CaseLue = z.infer<typeof CaseLueSchema>;
/**
 * `procheDuCatalogue` (26 novembre 2026, « identique en visuel ») : la police de la liste du catalogue du Studio qui
 * ressemble le plus au spécimen montré, choisie par l'inventaire ; vide si elle n'est pas dite (un verdict d'avant).
 */
const PoliceLue = z.object({ nom: z.string().max(80).catch(""), genre: z.enum(["serif", "sans", "manuscrite", "chasse-fixe", "affiche"]).catch("sans"), procheDuCatalogue: z.string().max(80).optional().catch(undefined) });
export const InventaireSchema = z.object({
  cases: z.array(CaseLueSchema).max(40).catch([]),
  polices: z.object({ titres: PoliceLue, textes: PoliceLue }),
  /** Les noms et les mots écrits sous chaque pastille de la palette, de gauche à droite. */
  couleurs: z.array(z.object({ nom: z.string().max(40).catch(""), mots: z.array(z.string().max(40)).max(3).catch([]) })).max(8).catch([]),
  icone: z.string().max(200).catch(""),
  favicon: z.string().max(200).catch(""),
  /**
   * L'icône et le favicon de la planche montrent le symbole du logo (ou une lettre dessinée comme dans le logo). Relevé pour
   * le compte rendu seulement : depuis l'essai réel du 25 novembre 2026, il ne décide plus du symbole (seule la fiabilité de
   * la séparation en décide).
   */
  iconeReprendLeLogo: z.boolean().catch(false),
});
export type Inventaire = z.infer<typeof InventaireSchema>;
export type PoliceDeLInventaire = Inventaire["polices"]["titres"];

export const INVENTAIRE_SYSTEM = `Tu fais l'inventaire d'une planche d'identité visuelle, découpée en cases, AVANT qu'elle soit refaite en haute définition. Chaque image porte le nom de sa case ; la dernière, « logo », est le logo officiel de la marque. Ne juge rien : relève ce que tu vois. Réponds en JSON :
- cases : pour chaque case (son nom exact) : logo (le logo de la marque y apparaît), logoVu (seulement quand le logo y apparaît : « complet » si on y voit le symbole et le nom de la marque, « symbole » si on n'y voit que le symbole, sans le nom écrit à côté ; null sinon), textes (chaque texte lisible, mot pour mot, une ligne par élément, sans rien corriger), produit (un produit de la marque est visible), personne (une personne, un visage ou une main est visible), comprehensible (seulement pour les cases « publication-… » : quelqu'un qui ne connaît pas la marque comprend ce qu'elle propose ; null pour les autres cases), description (ce que montre l'image, en une phrase simple) ;
- polices : le nom de la police des titres et celui de la police des textes, tels qu'ils sont écrits dans la case « typographies », avec leur genre (serif, sans, manuscrite, chasse-fixe ou affiche) tel que le montre le dessin du spécimen, et procheDuCatalogue : le nom exact, recopié de la liste des polices du catalogue donnée dans la demande, de celle qui ressemble le plus au dessin du spécimen montré, dans le genre que tu as lu (la police nommée si elle est dans la liste et que son dessin est bien celui du spécimen) ;
- couleurs : pour chaque pastille de la case « palette », de gauche à droite, son nom et les mots écrits dessous (sans le code de la couleur) ;
- icone et favicon : ce que montrent l'icône seule et le favicon de la case « logos », en quelques mots ;
- iconeReprendLeLogo : l'icône et le favicon montrent le symbole du logo (ou une lettre dessinée comme dans le logo).`;

/** Les cases relues par l'inventaire : les 17 aperçus, puis les blocs du code, puis la rangée des logos et les titres. */
export const demandeDeLInventaire = (nom: string, catalogue?: string) => `Marque : « ${nom.trim()} ». Relève chaque case, mot pour mot.${catalogue ? `\n${catalogue}` : ""}`;

/** Ce qui manque à un inventaire : une case d'image qui n'y est pas relue est une faute (rien ne part sans elle). */
export function inventaireIncomplet(inv: Inventaire, attendues: readonly string[]): string[] {
  const lues = new Set(inv.cases.map((c) => c.case));
  return attendues.filter((n) => !lues.has(n));
}
export const caseLue = (inv: Inventaire | null | undefined, n: string): CaseLue | undefined => inv?.cases.find((c) => c.case === n);
/**
 * LES RÔLES DES POLICES SE LISENT SUR LA PLACE DANS L'APERÇU (27 novembre 2026, essai réel de Mouture, étape 5 ; constat du
 * chef d'orchestre : « L'aperçu montre Montserrat à gauche (titres) et Playfair Display à droite. La planche en vrai écrit
 * « Playfair Display / Nunito » »). L'inventaire avait rangé Playfair Display en titres. Ici, dans la case « typographies »
 * telle que l'inventaire l'a relevée (de gauche à droite, de haut en bas) : la police nommée la première est celle des
 * titres, la seconde celle des textes ; sauf si l'aperçu le dit autrement (une ligne qui nomme une police avec le mot
 * « titre », ou le mot « titre » seul sur la ligne juste avant son nom). Sans les deux noms dans la case, rien ne change.
 */
export function policesDeLApercu(inv: Inventaire): Inventaire["polices"] {
  const t = caseLue(inv, "typographies")?.textes.map((x) => x.trim()) ?? [];
  const plat = (x: string) => x.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const { titres, textes } = inv.polices;
  if (!titres.nom.trim() || !textes.nom.trim() || plat(titres.nom) === plat(textes.nom)) return inv.polices;
  // La ligne du nom : le nom seul, ou une ligne qui le contient (« Titres : Montserrat »).
  const place = (nom: string) => { const n = plat(nom), i = t.findIndex((x) => plat(x) === n); return i >= 0 ? i : t.findIndex((x) => plat(x).includes(n)); };
  const a = place(titres.nom), b = place(textes.nom);
  if (a < 0 || b < 0) return inv.polices;
  const ditTitre = (i: number) => /titre|heading/i.test(t[i]) || (i > 0 && /^\s*(titres?|headings?)\s*:?\s*$/i.test(t[i - 1]));
  // L'aperçu le dit autrement : son mot fait foi.
  if (ditTitre(a) && !ditTitre(b)) return inv.polices;
  if (ditTitre(b) && !ditTitre(a)) return { titres: textes, textes: titres };
  return a <= b ? inv.polices : { titres: textes, textes: titres };
}

// ---------------------------------------------------------------- 7. la relecture, par groupe

export const ImageRelueSchema = z.object({
  case: z.string().max(40),
  /** L'image refaite est l'aperçu à l'identique (composition, couleurs, photographie, placements). */
  identique: z.boolean().catch(false),
  /** Chaque texte lisible de l'image refaite, mot pour mot (comparés par le code à ceux de l'inventaire). */
  textesLus: z.array(z.string().max(300)).max(40).catch([]),
  logoPresent: z.boolean().catch(false),
  personne: z.boolean().catch(true),
  logoFonceSurFondSombre: z.boolean().catch(true),
  /** Quand une photo du produit est jointe : le produit montré est bien le sien. Null sans photo. */
  produitFidele: z.boolean().nullable().catch(null),
  /** Un texte coupé, ou collé au bord de l'image. */
  texteCoupe: z.boolean().catch(true),
  /**
   * LA COUPE FIDÈLE À L'APERÇU (27 novembre 2026, essai réel de Mouture, reference-4 : « Le sachet de droite est coupé par
   * le bord de l'image, ce qui tronque son logo et son étiquette, comme sur l'aperçu. », refusée quand même) : seulement
   * quand texteCoupe est vrai, la coupe est déjà sur l'aperçu, au même bord. Elle n'est jamais une faute. Absent d'un
   * verdict d'avant ce champ : le code lit alors le pourquoi (`coupeFideleALApercu`).
   */
  coupeCommeSurLApercu: z.boolean().nullable().optional().catch(undefined),
  /** La note de fidélité à l'aperçu, de 0 à 10. */
  note: z.number().min(0).max(10).catch(0),
  pourquoi: z.string().max(500).catch(""),
  /**
   * Les textes inventés relevés à part (26 novembre 2026, essai réel du torréfacteur, étape 5) : un nom de produit, une
   * origine, une date, une année ou un chiffre lisibles, absents de l'aperçu et des produits de la fiche. Le code les
   * compare à la fiche (`faitsInventesEnVrai`). Absent d'un verdict d'avant ce champ.
   */
  inventes: z.array(z.object({ ou: z.string().max(200).catch(""), texte: z.string().max(200).catch("") })).max(20).optional().catch(undefined),
  /**
   * Les textes lus sur l'image refaite que le relecteur voit aussi, lisibles, sur l'aperçu de la case (27 novembre 2026,
   * essai réel de Mouture : « Saveurs intenses » écrit sur l'étiquette du sachet de la 4:5, compté en trop). Le code ne les
   * compte jamais en trop (`textesExcusesEnVrai`). Absent d'un verdict d'avant ce champ.
   */
  aussiSurLApercu: z.array(z.string().max(300)).max(40).optional().catch(undefined),
});
export type ImageRelue = z.infer<typeof ImageRelueSchema>;
export const RelectureDuGroupeSchema = z.object({ images: z.array(ImageRelueSchema).max(20).catch([]) });
export type RelectureDuGroupe = z.infer<typeof RelectureDuGroupeSchema>;

export const RELECTEUR_EN_VRAI = `Tu es le relecteur le plus exigeant d'un studio de création de marques. Chaque image refaite en haute définition (« <case> refaite ») est jugée face à son aperçu (« <case> aperçu »), découpé sur la planche que le client a choisie ; quand elle est jointe, « <case> produit » est la photo du VRAI produit du client. Réponds en JSON, une entrée par case :
- identique : l'image refaite reprend l'aperçu à l'identique (même composition, mêmes couleurs, même photographie, mêmes placements) ;
- textesLus : chaque texte lisible de l'image refaite, mot pour mot, une ligne par élément, sans rien corriger ;
- logoPresent : le logo de la marque apparaît dans l'image refaite ;
- personne : une personne, un visage ou une main est visible ;
- logoFonceSurFondSombre : un logo foncé est posé sur un fond sombre (il doit y être clair) ;
- produitFidele : seulement si la photo du produit est jointe : le produit montré est le sien, reconnaissable au premier regard (même forme, même contenant, même matière) ; null sinon ;
- texteCoupe : un texte est coupé, ou collé au bord de l'image ;
- coupeCommeSurLApercu : seulement quand texteCoupe est vrai : la même coupe est déjà sur l'aperçu, au même bord (un objet, une étiquette ou un texte coupé par le bord exactement comme sur l'aperçu) ; une coupe fidèle à l'aperçu n'est jamais une faute ; null quand rien n'est coupé ;
- note : ta note de fidélité à l'aperçu, de 0 à 10 ; une image fidèle, nette, sans défaut visible vaut 8 ou plus ;
- pourquoi : une ou deux phrases simples ;
- inventes : chaque texte lisible de l'image refaite qui donne un nom de produit, une origine, une date, une année ou un chiffre absents de son aperçu et des produits de la marque donnés dans la demande (sur une étiquette, un emballage, une plaque, partout) ; pour chacun, « ou » (l'objet qui le porte) et « texte » (recopié lettre pour lettre) ; vide s'il n'y en a pas. Le nom de la marque et la phrase de son logo ne sont jamais inventés ;
- aussiSurLApercu : chaque texte de textesLus que tu lis aussi, écrit de la même façon, sur l'aperçu de la case (à n'importe quelle place de l'aperçu), recopié comme dans textesLus ; vide s'il n'y en a pas.
Le nom de la marque et la phrase de son logo, écrits exactement, ne sont jamais une faute, où que le logo soit posé (une étiquette, un sachet, une enseigne, une page), même quand l'aperçu est trop petit pour les lire : recopie-les dans textesLus sans les reprocher. Un petit texte de l'aperçu, illisible, doit rester des traits ou une texture : un mot lisible écrit à sa place est un texte inventé.
Ne juge que ce que tu vois.`;

export function demandeAuRelecteurEnVrai(o: { nom: string; personnes: boolean; groupe: Groupe; cases: { element: NomElement; photo: boolean }[]; produits?: readonly string[]; phrase?: readonly string[] }): string {
  return [
    `Marque : « ${o.nom.trim()} ». Groupe : ${NOM_DU_GROUPE[o.groupe]}.`,
    o.personnes ? "Le client a donné son accord pour des personnes." : "Le client n'a donné ni photo de personne ni accord : aucune personne ne doit être visible.",
    ...(o.phrase?.length ? [`Le logo porte le nom « ${o.nom.trim()} » et la phrase ${o.phrase.map((l) => `« ${l} »`).join(" puis ")} : partout où le logo apparaît, ces textes sont attendus.`] : []),
    ...(o.produits?.length ? [`Les produits que la marque vend, donnés par le client : ${o.produits.map((p) => `« ${p.trim()} »`).join(", ")}. Tout autre nom de produit, toute origine, date, année ou chiffre lisible absent de l'aperçu va dans inventes.`] : []),
    `Cases : ${o.cases.map((c) => `${c.element}${c.photo ? " (photo du produit jointe)" : ""}`).join(", ")}.`,
  ].join("\n");
}

/** Un texte ramené à ses mots, lettre pour lettre (apostrophes, guillemets et espaces unifiés ; casse et accents gardés). */
export const motsDe = (t: string): string[] => t.normalize("NFC").replace(/[’ʼ‘]/g, "'").replace(/[«»“”"]/g, " ").replace(/[–—]/g, "-").split(/\s+/).map((w) => w.replace(/^[.,;:!?…]+|[.,;:!?…]+$/g, "")).filter(Boolean);
/** Les textes refaits sont-ils ceux de l'inventaire, lettre pour lettre ? Rend les mots manquants et les mots en trop. */
export function comparerLesTextes(attendus: readonly string[], lus: readonly string[]): { manquants: string[]; enTrop: string[] } {
  const reste = new Map<string, number>();
  for (const w of attendus.flatMap(motsDe)) reste.set(w, (reste.get(w) ?? 0) + 1);
  let enTrop: string[] = [];
  for (const w of lus.flatMap(motsDe)) { const n = reste.get(w) ?? 0; if (n > 0) reste.set(w, n - 1); else enTrop.push(w); }
  let manquants = [...reste.entries()].flatMap(([w, n]) => Array(n).fill(w) as string[]);
  // UN MOT COUPÉ PAR LE BORD DE L'APERÇU (26 novembre 2026 : « nature » pour « naturels », « fa » pour « famille ») : le
  // dernier mot d'une ligne attendue, coupé à droite, est le début d'un mot lu ; le premier, coupé à gauche, en est la fin.
  // Ils vont ensemble ; aucun autre mot n'est excusé.
  const bouts = new Set(attendus.flatMap((l) => { const m = motsDe(l); return m.length ? [`fin:${m.at(-1)}`, `debut:${m[0]}`] : []; }));
  for (const w of [...manquants]) {
    const i = enTrop.findIndex((x) => x !== w && ((bouts.has(`fin:${w}`) && x.startsWith(w)) || (bouts.has(`debut:${w}`) && x.endsWith(w))));
    if (i < 0) continue;
    enTrop = enTrop.filter((_, k) => k !== i);
    const j = manquants.indexOf(w); manquants = manquants.filter((_, k) => k !== j);
  }
  return { manquants, enTrop };
}

/**
 * Les raisons du refus d'une image refaite : pas identique ; textes différents de ceux de l'inventaire (comparés lettre
 * pour lettre par le code) ; logo ajouté ; personne sans accord ; logo foncé sur fond sombre ; autre produit que celui de
 * la photo jointe ; texte coupé ou collé au bord ; note de fidélité sous 8. Vide : gardée.
 */
/** Les cases qui montrent un téléphone avec sa barre d'état : l'heure n'y est jamais comparée ni reprochée. */
export const CASES_AVEC_BARRE_D_ETAT: ReadonlySet<string> = new Set(["site-telephone"]);
/** L'heure d'une barre d'état (« 9:41 », « 12.01 », « 9h41 ») : un micro-texte décoratif, jamais jugé. */
export const estUneHeure = (t: string) => /^\s*\d{1,2}\s*[:.h]\s*\d{2}\s*$/i.test(t);
/**
 * LES TEXTES ATTENDUS D'UNE CASE : seulement ceux de sa zone (essai réel d'Écume, 26 novembre 2026). `deborde` : l'aperçu
 * relu par l'inventaire entrait dans la bande d'un titre de bloc (`bandeDeTitreTouchee`, une découpe d'avant la règle) ;
 * alors les premières lignes de l'inventaire dont aucun mot n'est dans l'image refaite sont le titre ou le sous-titre du
 * bloc, hors de la case, et ne sont pas attendues. Dans une case à barre d'état, l'heure n'est ni attendue ni reprochée.
 */
export function textesDeLaZone(attendus: readonly string[], lus: readonly string[], o: { element?: string; deborde?: boolean } = {}): { attendus: string[]; lus: string[] } {
  let a = [...attendus], l = [...lus];
  if (o.deborde) {
    // Seulement les premières lignes qui commencent au milieu d'un mot (une minuscule : un texte coupé par le bord de la
    // case) et dont aucun mot n'est dans l'image refaite ; un vrai titre de la case, qui commence par une majuscule, reste attendu.
    const vus = new Set(l.flatMap(motsDe));
    while (a.length && /^\s*\p{Ll}/u.test(a[0]) && !motsDe(a[0]).some((w) => vus.has(w))) a = a.slice(1);
  }
  if (o.element && CASES_AVEC_BARRE_D_ETAT.has(o.element)) { a = a.filter((t) => !estUneHeure(t)); l = l.filter((t) => !estUneHeure(t)); }
  // UN MOT ENTIER PERDU AU BORD GAUCHE (essai réel du torréfacteur, 26 novembre 2026) : le bandeau de la planche est découpé
  // au bord de la page, et l'aperçu y perd parfois un mot entier (« la tasse, » pour « à la tasse, »). Une ligne refaite qui
  // est exactement une ligne attendue précédée d'un seul mot n'est pas reprochée, dans ces cases seulement.
  if (o.element && AU_BORD.has(o.element)) {
    const lignes = new Set(a.map((t) => motsDe(t).join(" ")));
    l = l.map((t) => { const m = motsDe(t); return m.length > 1 && lignes.has(m.slice(1).join(" ")) ? m.slice(1).join(" ") : t; });
  }
  return { attendus: a, lus: l };
}

/** Le logo de la marque : son nom et sa phrase, toutes ses lignes (les textes que le logo porte, partout où il apparaît). */
export type TextesDuLogo = { nom: string; phrase?: readonly string[] };
const enCapitales = (w: string) => w.toLocaleUpperCase("fr");
/**
 * LES TEXTES DU LOGO NE SONT JAMAIS EN TROP (26 novembre 2026, essai réel du torréfacteur, étape 5 ; constat du chef
 * d'orchestre : « Faux refus « en trop : TORRÉFACTION, ARTISANALE ». C'est la phrase du logo, imprimée sous le logo sur les
 * sachets. »). L'inventaire ne relève pas toujours la phrase écrite en petit sous le logo de l'aperçu ; l'image refaite
 * l'écrit nettement. Là où le logo est (dans l'aperçu ou dans l'image refaite), les mots du nom et de la phrase, écrits
 * exactement, sont attendus : ils sont retirés des mots en trop, un pour un. Un mot mal écrit reste en trop.
 */
export function sansLesTextesDuLogo(enTrop: readonly string[], logo: TextesDuLogo | undefined): string[] {
  if (!logo) return [...enTrop];
  // Les lettres du logo sont souvent dessinées en capitales : la casse ne compte pas ici, chaque lettre et chaque accent, si.
  const permis = new Set([logo.nom, ...(logo.phrase ?? [])].flatMap(motsDe).map(enCapitales));
  return enTrop.filter((w) => !permis.has(enCapitales(w)));
}
/**
 * LES FAITS ET LES PRODUITS INVENTÉS d'une image refaite (26 novembre 2026, essai réel du torréfacteur, étape 5) : les lignes
 * lues qui ne sont pas dans l'aperçu et qui donnent un chiffre, un pays, une origine, une variété ou une gamme (reconnus par
 * le code, `motQuiDitUnFait`), plus celles que le relecteur a relevées dans `inventes`, sauf le nom d'un produit de la fiche,
 * un texte de l'aperçu ou un texte du logo. Rend les lignes, telles qu'elles sont lues.
 */
export function faitsInventesEnVrai(v: ImageRelue, o: { attendus: readonly string[]; lus: readonly string[]; produits?: readonly string[]; logo?: TextesDuLogo }): string[] {
  const attendus = new Set(o.attendus.flatMap(motsDe));
  const duLogo = new Set(o.logo ? [o.logo.nom, ...(o.logo.phrase ?? [])].flatMap(motsDe).map(enCapitales) : []);
  const nouveau = (w: string) => !attendus.has(w) && !duLogo.has(enCapitales(w));
  const lignes = o.lus.filter((t) => motsDe(t).some((w) => nouveau(w) && motQuiDitUnFait(w)));
  const aPart = (v.inventes ?? []).map((x) => x.texte.trim()).filter((t) => t && motsDe(t).some(nouveau) && !nomDeProduitPermis(t, o.produits));
  return [...new Set([...lignes, ...aPart])];
}
/**
 * LES TEXTES QUI NE SONT JAMAIS EN TROP (27 novembre 2026, essai réel de Mouture, étape 5 ; constat du chef d'orchestre :
 * « Les noms des produits de la fiche posés sur les sachets (« Cafés en grains », « Cafés moulus », « Coffrets », au singulier
 * comme au pluriel, quelle que soit la casse) ne sont jamais du « texte en trop ». » et « L'inventaire a raté « Saveurs
 * intenses » sur la 4:5 »). Rend les mots excusés, un pour un, parmi les mots en trop et les mots manquants :
 * - une ligne lue qui est le nom d'un produit de la fiche (`nomDeProduitPermis`) n'est jamais en trop ; une ligne attendue qui
 *   est le nom d'un produit, rendue par le même produit au singulier ou au pluriel, ne manque pas ;
 * - une ligne lue dont chaque mot est déjà un texte attendu de la case (un texte de l'aperçu écrit une seconde fois, par
 *   exemple sur une étiquette) n'est pas en trop : c'est le code qui le vérifie, mot pour mot, lettre pour lettre ;
 * - une ligne lue que le relecteur voit aussi sur l'aperçu de la case (`aussiSurLApercu`), quand l'inventaire ne l'a pas
 *   recopiée : seulement si elle est bien dans ses textes lus, et jamais un fait inventé (un chiffre, une origine, une date,
 *   un nom de produit hors de la fiche restent refusés, par le code et par `inventes`, avant cette excuse).
 * Pourquoi ce mécanisme : le relecteur a l'aperçu et l'image refaite sous les yeux, dans le même appel ; il est le seul à
 * pouvoir dire qu'un texte de l'aperçu, trop petit pour l'inventaire, est bien le même. Le code garde le dernier mot sur
 * tout ce qu'il sait vérifier seul (produits de la fiche, répétition d'un texte attendu, faits inventés).
 */
export function textesExcusesEnVrai(v: ImageRelue, o: { attendus: readonly string[]; lus: readonly string[]; produits?: readonly string[] }): { enTrop: string[]; manquants: string[] } {
  const enTrop: string[] = [], manquants: string[] = [];
  const attendus = new Set(o.attendus.flatMap(motsDe));
  const memeProduit = (a: string, b: string) => { const x = [...new Set(motsDuProduit(a))].sort().join(" "), y = [...new Set(motsDuProduit(b))].sort().join(" "); return !!x && x === y; };
  const produitsLus = o.lus.filter((l) => nomDeProduitPermis(l, o.produits));
  const pris = new Set<number>();
  for (const a of o.attendus) {
    if (!nomDeProduitPermis(a, o.produits)) continue;
    const i = produitsLus.findIndex((l, k) => !pris.has(k) && memeProduit(a, l));
    if (i >= 0) { pris.add(i); manquants.push(...motsDe(a)); }
  }
  for (const l of produitsLus) enTrop.push(...motsDe(l));
  const vus = new Set((v.aussiSurLApercu ?? []).map((t) => motsDe(t).join(" ")).filter(Boolean));
  for (const l of o.lus) {
    if (nomDeProduitPermis(l, o.produits)) continue;
    const m = motsDe(l);
    if (!m.length) continue;
    if (m.every((w) => attendus.has(w)) || vus.has(m.join(" "))) enTrop.push(...m);
  }
  return { enTrop, manquants };
}
/** Retire d'une liste de mots, un pour un, les mots excusés. */
const sansLesMots = (mots: readonly string[], excuses: readonly string[]) => {
  const reste = new Map<string, number>();
  for (const w of excuses) reste.set(w, (reste.get(w) ?? 0) + 1);
  return mots.filter((w) => { const n = reste.get(w) ?? 0; if (n > 0) { reste.set(w, n - 1); return false; } return true; });
};
/** Le début de la raison des faits inventés (le compte rendu garde les textes exacts ; le dessinateur ne les reçoit jamais). */
export const DEBUT_FAITS_INVENTES_EN_VRAI = "faits ou produits inventés, absents de l'aperçu et de la fiche du client : ";
export function raisonsDuRefusEnVrai(v: ImageRelue | undefined, o: { inventaire: CaseLue | undefined; personnes: boolean; photo: boolean; element?: string; deborde?: boolean;
  /** Le nom et la phrase du logo : jamais en trop là où le logo est. */ logo?: TextesDuLogo;
  /** Les produits de la fiche du client : les seuls noms de produits permis. */ produits?: readonly string[] }): string[] {
  if (!v) return ["le relecteur ne l'a pas relue"];
  const r: string[] = [];
  if (!v.identique) r.push("elle n'est pas identique à son aperçu");
  const z = textesDeLaZone(o.inventaire?.textes ?? [], v.textesLus, { element: o.element ?? o.inventaire?.case, deborde: o.deborde });
  const c = comparerLesTextes(z.attendus, z.lus);
  // LE NOM ET LA PHRASE DU LOGO, OÙ QUE LE LOGO SOIT POSÉ (27 novembre 2026, essai réel de Mouture, reprise : la phrase du
  // logo encore comptée en trop dans le logo posé sur un sachet, parce que la reprise ne recevait pas la phrase) : écrits
  // exactement, ils ne sont jamais une faute là où le logo est, dans l'aperçu ou dans l'image refaite, quelle que soit sa
  // place ; la comparaison reste lettre pour lettre (`sansLesTextesDuLogo`). Toute reprise reçoit la phrase.
  const logoLa = o.logo && (v.logoPresent || o.inventaire?.logo) ? o.logo : undefined;
  const inventes = faitsInventesEnVrai(v, { attendus: z.attendus, lus: z.lus, produits: o.produits, logo: logoLa });
  // Les mots des lignes inventées sont dits dans leur propre raison, pas deux fois.
  const dansLesInventes = new Set(inventes.flatMap(motsDe));
  const excuses = textesExcusesEnVrai(v, { attendus: z.attendus, lus: z.lus, produits: o.produits });
  const fidele = v.texteCoupe && coupeFideleALApercu(v);
  const coupes = fidele ? motsCoupesCommeSurLApercu(z.attendus, z.lus, logoLa) : { enTrop: [], manquants: [] };
  const t = { manquants: sansLesMots(sansLesMots(c.manquants, excuses.manquants), coupes.manquants), enTrop: sansLesMots(sansLesMots(sansLesTextesDuLogo(c.enTrop, logoLa).filter((w) => !dansLesInventes.has(w)), excuses.enTrop), coupes.enTrop) };
  if (inventes.length) r.push(`${DEBUT_FAITS_INVENTES_EN_VRAI}${inventes.map((l) => `« ${l} »`).join(", ")}`);
  if (t.manquants.length || t.enTrop.length) r.push(`ses textes ne sont pas ceux de l'aperçu, lettre pour lettre${t.manquants.length ? ` (manquent : ${t.manquants.slice(0, 8).map((w) => `« ${w} »`).join(", ")})` : ""}${t.enTrop.length ? ` (en trop ou mal écrits : ${t.enTrop.slice(0, 8).map((w) => `« ${w} »`).join(", ")})` : ""}`);
  if (v.logoPresent && !o.inventaire?.logo) r.push("un logo a été ajouté là où l'aperçu n'en a pas");
  if (v.personne && !o.personnes) r.push("une personne est visible sans l'accord du client");
  if (v.logoFonceSurFondSombre) r.push("un logo foncé est posé sur un fond sombre : il doit y être clair");
  if (o.photo && v.produitFidele === false) r.push("le produit montré n'est pas celui de la photo du client");
  if (v.texteCoupe && !fidele) r.push("un texte est coupé ou collé au bord");
  if (v.note < NOTE_DU_PROPRIETAIRE) r.push(`sa fidélité n'est pas au niveau (${v.note}/10, il faut ${NOTE_DU_PROPRIETAIRE})`);
  return r;
}

/**
 * UNE COUPE AU BORD FIDÈLE À L'APERÇU NE FAIT JAMAIS REFUSER (27 novembre 2026, essai réel de Mouture, reference-4 : le
 * relecteur écrit lui-même « coupé par le bord de l'image, […] comme sur l'aperçu » et coche texteCoupe). Vraie quand le
 * relecteur le dit dans `coupeCommeSurLApercu` ; dans un verdict sans ce champ, quand chaque proposition de son pourquoi qui
 * parle d'une coupe ou d'un bord dit aussi qu'elle est comme sur l'aperçu (« comme sur l'aperçu », « comme dans l'aperçu »,
 * « déjà coupé sur l'aperçu »…). Une phrase qui dit seulement que l'image est « fidèle à l'aperçu » ne suffit pas : elle ne
 * parle pas de la coupe (« La composition est fidèle à l'aperçu, mais « naturels » touche le bord » reste une faute).
 */
const DIT_UNE_COUPE = /\bcoup[ée]+s?\b|\bcoupé|tronqu|\bbords?\b|rogn/iu;
const COMME_SUR_L_APERCU = /comme (?:sur|dans) l['’]aper[çc]u|(?:d[ée]j[àa]|aussi|[ée]galement) (?:coup[ée]+s?|tronqu[ée]+s?|rogn[ée]+s?) (?:sur|dans) l['’]aper[çc]u|(?:d[ée]j[àa]|aussi|[ée]galement) (?:sur|dans) l['’]aper[çc]u|(?:m[êe]me|identique [àa] la) coupe (?:que (?:sur|dans) l['’]aper[çc]u|de l['’]aper[çc]u)/iu;
export function coupeFideleALApercu(v: Pick<ImageRelue, "texteCoupe" | "pourquoi"> & { coupeCommeSurLApercu?: boolean | null }): boolean {
  if (!v.texteCoupe) return false;
  if (typeof v.coupeCommeSurLApercu === "boolean") return v.coupeCommeSurLApercu;
  const propositions = v.pourquoi.split(/[.;!?\n]+|\bmais\b|\ben revanche\b|\bcependant\b|\btoutefois\b|\bpar contre\b/iu).map((x) => x.trim()).filter(Boolean);
  const coupes = propositions.filter((x) => DIT_UNE_COUPE.test(x));
  return coupes.length > 0 && coupes.every((x) => COMME_SUR_L_APERCU.test(x));
}
/**
 * LES MOTS COUPÉS PAR UN BORD FIDÈLE À L'APERÇU : une ligne lue qui est le début d'une ligne attendue ou d'un texte du logo,
 * coupée par le bord (« CAFÉ E » pour « CAFÉ EN GRAINS », « MOU » pour « MOUTURE », « TORRÉF » pour « TORRÉFACTION
 * ARTISANALE ») : son dernier mot, début d'un mot de la ligne, n'est pas en trop ; les mots de la ligne attendue qui suivent
 * la coupe ne manquent pas. Seulement quand la coupe est fidèle à l'aperçu ; la casse ne compte pas pour les textes du logo
 * (dessinés en capitales), chaque lettre et chaque accent si. Rend les mots excusés, un pour un.
 */
export function motsCoupesCommeSurLApercu(attendus: readonly string[], lus: readonly string[], logo?: TextesDuLogo): { enTrop: string[]; manquants: string[] } {
  const enTrop: string[] = [], manquants: string[] = [];
  const lignes: { mots: string[]; attendue: boolean }[] = [
    ...attendus.map((t) => ({ mots: motsDe(t), attendue: true })),
    ...(logo ? [logo.nom, ...(logo.phrase ?? [])].map((t) => ({ mots: motsDe(t), attendue: false })) : []),
  ].filter((l) => l.mots.length);
  const pareil = (a: string, b: string) => enCapitales(a) === enCapitales(b);
  for (const lu of lus) {
    const m = motsDe(lu);
    if (!m.length) continue;
    for (const l of lignes) {
      const n = m.length, dernier = m[n - 1], celui = l.mots[n - 1];
      if (n > l.mots.length || !celui) continue;
      if (!m.slice(0, -1).every((w, i) => pareil(w, l.mots[i]))) continue;
      const entier = pareil(dernier, celui), debut = !entier && enCapitales(celui).startsWith(enCapitales(dernier));
      if (!entier && !debut) continue;
      if (entier && n === l.mots.length) continue; // la ligne entière : rien de coupé
      if (debut) enTrop.push(dernier);
      if (l.attendue) manquants.push(...l.mots.slice(debut ? n - 1 : n));
      break;
    }
  }
  return { enTrop, manquants };
}

/**
 * LES RAISONS ENVOYÉES AU DESSINATEUR POUR LA REPRISE D'UNE IMAGE EN VRAI (26 novembre 2026, sur le principe de la planche
 * de marque, `raisonsPourLeDessinateur`) : un texte inventé n'y est jamais recopié. La raison des faits inventés dit
 * seulement qu'un texte absent de l'aperçu et de la fiche est écrit, et rappelle les noms permis. Les mots en trop ne sont
 * jamais recopiés non plus (un nom inventé sans chiffre ni pays, « L'ARABICA SIGNATURE », n'est reconnu par aucun code) :
 * la raison des textes garde les mots qui manquent, ceux de l'aperçu, et dit seulement que des mots absents de l'aperçu
 * sont écrits. Le compte rendu garde les raisons exactes.
 */
export function raisonsPourLeDessinateurEnVrai(raisons: readonly string[], o: { produits?: readonly string[] } = {}): string[] {
  const ses = o.produits?.length ? ` : ${o.produits.map((p) => `« ${nomDuProduitALEcran(p)} »`).join(", ")}` : "";
  return raisons.map((r) => r.startsWith(DEBUT_FAITS_INVENTES_EN_VRAI)
    ? `un texte absent de l'aperçu est écrit sur une étiquette, un emballage ou un objet : retire-le ; les étiquettes ne portent que les textes de l'aperçu, le nom de la marque, la phrase de son logo et les noms des produits du client${ses}`
    : r.replace(/\(en trop ou mal écrits : [^)]*\)/u, "(des mots absents de l'aperçu sont écrits : garde seulement ses textes, lettre pour lettre)"));
}

// ---------------------------------------------------------------- 8. les 17 images : refaites, relues, une reprise

export type DemandeDElement = { element: NomElement; texte: string; taille: string; jointes: { role: RoleDUneJointe; data: Buffer }[] };
export type ElementsDeps = {
  /** POST /v1/images/edits : image[] = les jointes dans l'ordre ; le texte tel quel. Rend l'image brute. */
  refaire: (d: DemandeDElement, tour: number) => Promise<Buffer>;
  /** Le relecteur le plus fort : un appel par groupe et par tour. */
  relire: (groupe: Groupe, items: { element: NomElement; apercu: Buffer; image: Buffer; photo: Buffer | null }[], demande: string, tour: number) => Promise<RelectureDuGroupe>;
  aLaChargeDuStudio: <T>(fn: () => Promise<T>) => Promise<T>;
};
export type EssaiDElement = { tour: number; texte: string; png: Buffer | null; raisons: string[]; verdict?: ImageRelue };
export type ResultatDElement = { element: NomElement; ok: boolean; png: Buffer | null; w?: number; h?: number; photo: boolean; essais: EssaiDElement[]; raison?: string };

/**
 * Les images de la planche en vrai : chacune refaite à partir de son aperçu, mise à son format final, relue face à lui par
 * groupe ; refusée, refaite UNE fois à la charge du Studio avec ses raisons ; refusée deux fois, elle n'a pas de fichier
 * en haute définition (l'aperçu agrandi garde sa case : la planche n'est jamais incomplète). Une panne n'est jamais
 * relancée toute seule : l'erreur remonte.
 */
export async function refaireLesElements(deps: ElementsDeps, o: {
  nom: string; personnes: boolean; logo: Buffer; photo: Buffer | null;
  /** Les produits de la fiche du client (la ligne des étiquettes, la relecture des faits inventés) ; la phrase du logo, toutes ses lignes. */
  produits?: readonly string[]; phrase?: readonly string[]; apercus: Map<string, Buffer>; inventaire: Inventaire; elements?: readonly NomElement[];
  /** Le symbole seul, sur fond blanc (séparation fiable du code), joint là où l'inventaire ne voit que lui ; null : jamais joint. */
  symbole?: Buffer | null;
  /** Les cases dont l'aperçu touche la bande d'un titre de bloc (`Decoupe.debordes`). */
  debordes?: readonly string[];
  /**
   * UNE REPRISE SEULE, à la charge du Studio (le réassemblage d'un essai, 26 novembre 2026) : les cases données sont refaites
   * une fois, avec leurs raisons au début du texte, puis relues ; il n'y a pas d'autre tour.
   */
  reprise?: ReadonlyMap<NomElement, readonly string[]>;
}): Promise<Map<NomElement, ResultatDElement>> {
  const noms = (o.elements ?? NOMS_DES_ELEMENTS).filter((n) => o.apercus.has(n));
  const res = new Map<NomElement, ResultatDElement>();
  const demande = (n: NomElement, raisons?: string[]): DemandeDElement => {
    const inv = caseLue(o.inventaire, n), jointes = jointesDeLElement({ apercu: o.apercus.get(n)!, logo: o.logo, photo: o.photo, inventaire: inv, symbole: o.symbole ?? null });
    const logo = jointes.some((j) => j.role === "logo"), symbole = jointes.some((j) => j.role === "symbole"), photo = jointes.some((j) => j.role === "produit");
    return { element: n, texte: texteDeLElement({ element: n, nom: o.nom, logo, photo, personnes: o.personnes, raisons: raisons && raisonsPourLeDessinateurEnVrai(raisons, { produits: o.produits }), symbole, produits: o.produits }), taille: def(n).taille, jointes };
  };
  const unTour = async (liste: NomElement[], tour: number, raisonsDe: (n: NomElement) => string[] | undefined) => {
    const faits = new Map<NomElement, { d: DemandeDElement; png: Buffer | null; raison?: string }>();
    for (const n of liste) {
      const d = demande(n, raisonsDe(n));
      const brut = await deps.refaire(d, tour);
      const f = await auFormatFinal(n, brut);
      // Les marges blanches d'un bandeau sont rognées par le code AVANT la relecture : c'est l'image rognée qui est relue
      // face à son aperçu, gardée en haute définition et posée dans sa case.
      const png = f.ok ? (def(n).sansMargesBlanches ? await rognerLesMargesBlanches(f.png, o.apercus.get(n)) : f.png) : null;
      faits.set(n, png ? { d, png } : { d, png: null, raison: f.ok ? "image illisible" : f.raison });
    }
    for (const g of GROUPES) {
      const items = liste.filter((n) => def(n).groupe === g && faits.get(n)?.png);
      const verdicts = items.length ? await deps.relire(g, items.map((n) => ({ element: n, apercu: o.apercus.get(n)!, image: faits.get(n)!.png!, photo: faits.get(n)!.d.jointes.some((j) => j.role === "produit") ? o.photo : null })),
        demandeAuRelecteurEnVrai({ nom: o.nom, personnes: o.personnes, groupe: g, cases: items.map((n) => ({ element: n, photo: faits.get(n)!.d.jointes.some((j) => j.role === "produit") })), produits: o.produits, phrase: o.phrase }), tour) : { images: [] };
      for (const n of liste.filter((x) => def(x).groupe === g)) {
        const f = faits.get(n)!, photo = f.d.jointes.some((j) => j.role === "produit");
        const v = verdicts.images.find((x) => x.case === n);
        const raisons = f.png ? raisonsDuRefusEnVrai(v, { inventaire: caseLue(o.inventaire, n), personnes: o.personnes, photo, element: n, deborde: o.debordes?.includes(n), logo: { nom: o.nom, phrase: o.phrase }, produits: o.produits }) : [f.raison ?? "image illisible"];
        const avant = res.get(n);
        const essai: EssaiDElement = { tour, texte: f.d.texte, png: f.png, raisons, ...(v ? { verdict: v } : {}) };
        const m = f.png ? await sharp(f.png).metadata() : null;
        res.set(n, { element: n, ok: !raisons.length, png: raisons.length ? null : f.png, ...(m && !raisons.length ? { w: m.width, h: m.height } : {}), photo, essais: [...(avant?.essais ?? []), essai], ...(raisons.length ? { raison: raisons.join(" ; ") } : {}) });
      }
    }
  };
  if (o.reprise) {
    const aReprendre = noms.filter((n) => o.reprise!.has(n));
    if (aReprendre.length) await deps.aLaChargeDuStudio(() => unTour(aReprendre, 2, (n) => [...(o.reprise!.get(n) ?? [])]));
    return res;
  }
  await unTour(noms, 1, () => undefined);
  const refusees = noms.filter((n) => !res.get(n)!.ok);
  if (refusees.length) await deps.aLaChargeDuStudio(() => unTour(refusees, 2, (n) => res.get(n)!.essais.at(-1)!.raisons));
  return res;
}

// ---------------------------------------------------------------- 8 bis. les quatre petites versions du logo en HD

/**
 * LES QUATRE PETITES VERSIONS DU LOGO EN HAUTE DÉFINITION (26 novembre 2026 ; décision du propriétaire relayée par le chef
 * d'orchestre : oui pour les refaire en haute définition, identiques à l'aperçu). Sans symbole séparable, le compact,
 * l'icône, le favicon et le badge sont repris de leur tuile de l'aperçu, agrandis quatre fois (`versionDepuisLApercu`) :
 * c'est la règle de base, gratuite. En option payante, chacune est refaite en haute définition à partir de sa tuile, avec
 * le logo officiel joint (le logo fini choisi), par le modèle d'images des logos, comme les autres images de la planche
 * en vrai : la règle des preuves mot pour mot (REGLE_APERCU et la phrase du logo), plus une ligne qui dit l'élément ; la
 * taille carrée, la plus grande des tailles permises (1088 × 1088). Relue face à sa tuile ; refusée, refaite une fois à la
 * charge du Studio avec ses raisons ; refusée deux fois, l'agrandissement de l'aperçu est gardé, et SINA le dit.
 */
export const LOGOS_EN_HD = {
  "logo-compact": { tuile: "logo-4", quoi: "C'est la version compacte du logo.", libelle: ["la version compacte du logo", "the compact logo"] },
  icone: { tuile: "logo-5", quoi: "C'est l'icône seule.", libelle: ["l'icône seule", "the icon"] },
  favicon: { tuile: "logo-6", quoi: "C'est le favicon.", libelle: ["le favicon", "the favicon"] },
  badge: { tuile: "logo-10", quoi: "C'est le badge rond.", libelle: ["le badge rond", "the round badge"] },
} as const;
export type VersionEnHd = keyof typeof LOGOS_EN_HD;
export const VERSIONS_EN_HD = Object.keys(LOGOS_EN_HD) as VersionEnHd[];
/** Carrée, la plus grande des tailles permises de la planche en vrai (media-providers.ts, TAILLES_DE_LA_PLANCHE_EN_VRAI). */
export const TAILLE_DES_LOGOS_EN_HD = "1088x1088";
/** LE TEXTE ENVOYÉ : REGLE mot pour mot (l'aperçu, puis le logo officiel joint), puis la ligne qui dit l'élément. */
export function texteDuLogoEnHd(o: { version: VersionEnHd; nom: string; personnes: boolean; raisons?: readonly string[] }): string {
  const t = [REGLE_APERCU, regleDuLogo(o.nom), LOGOS_EN_HD[o.version].quoi, o.personnes ? "" : SANS_PERSONNE_EN_VRAI].filter(Boolean).join(" ");
  return o.raisons?.length ? `${t}\n\n${finDeRepriseEnVrai(o.raisons)}` : t;
}
export type DemandeDeLogoEnHd = { element: VersionEnHd; texte: string; taille: string; jointes: { role: "apercu" | "logo"; data: Buffer }[] };
/** La demande d'une version : sa tuile de l'aperçu d'abord, puis le logo officiel ; le texte ; la taille carrée. */
export const demandeDuLogoEnHd = (o: { version: VersionEnHd; nom: string; personnes: boolean; tuile: Buffer; logo: Buffer; raisons?: readonly string[] }): DemandeDeLogoEnHd => ({
  element: o.version, texte: texteDuLogoEnHd(o), taille: TAILLE_DES_LOGOS_EN_HD, jointes: [{ role: "apercu", data: o.tuile }, { role: "logo", data: o.logo }],
});

export const LogoEnHdReluSchema = z.object({
  version: z.string().max(40),
  /** Même forme que l'aperçu (silhouette, cadre, proportions, placement). */
  memeForme: z.boolean().catch(false),
  /** Mêmes lettres, dessinées comme sur l'aperçu. */
  memesLettres: z.boolean().catch(false),
  /** Le texte circulaire : identique, différent, illisible sur l'aperçu (un micro-texte décoratif, jamais jugé), ou aucun. */
  texteCirculaire: z.enum(["identique", "different", "illisible-sur-l-apercu", "aucun"]).catch("different"),
  /** Les textes lisibles sur l'aperçu, mot pour mot (sans le texte circulaire illisible). */
  textesDeLApercu: z.array(z.string().max(200)).max(12).catch([]),
  /** Les textes lisibles de la version refaite, mot pour mot (sans le texte circulaire quand il est illisible sur l'aperçu). */
  textesLus: z.array(z.string().max(200)).max(12).catch([]),
  memesCouleurs: z.boolean().catch(false),
  /** Quelque chose a été ajouté qui n'est pas sur l'aperçu (un élément, un texte, un cadre, une ombre, un décor). */
  ajout: z.boolean().catch(true),
  texteCoupe: z.boolean().catch(true),
  note: z.number().min(0).max(10).catch(0),
  pourquoi: z.string().max(500).catch(""),
});
export type LogoEnHdRelu = z.infer<typeof LogoEnHdReluSchema>;
export const RelectureDesLogosEnHdSchema = z.object({ versions: z.array(LogoEnHdReluSchema).max(8).catch([]) });
export type RelectureDesLogosEnHd = z.infer<typeof RelectureDesLogosEnHdSchema>;

export const RELECTEUR_DES_LOGOS_EN_HD = `Tu es le relecteur le plus exigeant d'un studio de création de marques. Chaque petite version d'un logo refaite en haute définition (« <version> refaite ») est jugée face à son aperçu (« <version> aperçu »), découpé sur la planche que le client a choisie. Elle doit rester identique à l'aperçu : seule la netteté change. Réponds en JSON, une entrée par version :
- memeForme : même forme que l'aperçu (silhouette, cadre, proportions, placement des éléments) ;
- memesLettres : mêmes lettres, dessinées comme sur l'aperçu (aucune lettre fausse, manquante ou ajoutée) ;
- texteCirculaire : « identique » si l'aperçu porte un texte circulaire lisible et que la version refaite porte le même ; « different » s'il est lisible sur l'aperçu et que la version refaite en porte un autre, ou aucun ; « illisible-sur-l-apercu » si le texte circulaire de l'aperçu ne se lit pas (un micro-texte décoratif : ne le juge pas) ; « aucun » si l'aperçu n'a pas de texte circulaire ;
- textesDeLApercu : chaque texte lisible de l'aperçu, mot pour mot, une ligne par élément (sans un texte circulaire illisible) ;
- textesLus : chaque texte lisible de la version refaite, mot pour mot, une ligne par élément, sans rien corriger (sans le texte circulaire quand il est illisible sur l'aperçu) ;
- memesCouleurs : mêmes couleurs que l'aperçu ;
- ajout : quelque chose a été ajouté qui n'est pas sur l'aperçu (un élément, un texte, un cadre, une ombre, un décor) ;
- texteCoupe : un texte ou une forme est coupé, ou collé au bord de l'image ;
- note : ta note de fidélité à l'aperçu, de 0 à 10 ; une version fidèle, nette, sans défaut visible vaut 8 ou plus ;
- pourquoi : une ou deux phrases simples.
Ne juge que ce que tu vois.`;
export const demandeAuRelecteurDesLogosEnHd = (o: { nom: string; versions: readonly VersionEnHd[] }) =>
  `Marque : « ${o.nom.trim()} ».\nVersions : ${o.versions.map((v) => `${v} (${LOGOS_EN_HD[v].libelle[0]})`).join(", ")}.`;

/**
 * Les raisons du refus d'une version refaite (vide : gardée) : pas la même forme, pas les mêmes lettres, un texte circulaire
 * lisible sur l'aperçu qui n'est plus le même, des textes qui ne sont pas ceux de l'aperçu lettre pour lettre (comparés par
 * le code), d'autres couleurs, un ajout, un texte coupé, une note sous 8. Un texte circulaire illisible sur l'aperçu est un
 * micro-texte décoratif : jamais jugé.
 */
export function raisonsDuRefusDuLogoEnHd(v: LogoEnHdRelu | undefined): string[] {
  if (!v) return ["le relecteur ne l'a pas relue"];
  const r: string[] = [];
  if (!v.memeForme) r.push("sa forme n'est pas celle de l'aperçu");
  if (!v.memesLettres) r.push("ses lettres ne sont pas celles de l'aperçu");
  if (v.texteCirculaire === "different") r.push("son texte circulaire n'est pas celui de l'aperçu");
  const t = comparerLesTextes(v.textesDeLApercu, v.textesLus);
  if (t.manquants.length || t.enTrop.length) r.push(`ses textes ne sont pas ceux de l'aperçu, lettre pour lettre${t.manquants.length ? ` (manquent : ${t.manquants.slice(0, 8).map((w) => `« ${w} »`).join(", ")})` : ""}${t.enTrop.length ? ` (en trop ou mal écrits : ${t.enTrop.slice(0, 8).map((w) => `« ${w} »`).join(", ")})` : ""}`);
  if (!v.memesCouleurs) r.push("ses couleurs ne sont pas celles de l'aperçu");
  if (v.ajout) r.push("quelque chose a été ajouté qui n'est pas sur l'aperçu");
  if (v.texteCoupe) r.push("un texte ou une forme est coupé ou collé au bord");
  if (v.note < NOTE_DU_PROPRIETAIRE) r.push(`sa fidélité n'est pas au niveau (${v.note}/10, il faut ${NOTE_DU_PROPRIETAIRE})`);
  return r;
}

export type LogosEnHdDeps = {
  /** POST /v1/images/edits : image[] = la tuile de l'aperçu, puis le logo officiel ; le texte tel quel. Rend l'image brute. */
  refaire: (d: DemandeDeLogoEnHd, tour: number) => Promise<Buffer>;
  /** Le relecteur des images de la planche en vrai : un appel pour toutes les versions d'un tour. */
  relire: (items: { version: VersionEnHd; apercu: Buffer; image: Buffer }[], demande: string, tour: number) => Promise<RelectureDesLogosEnHd>;
  aLaChargeDuStudio: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Le fond retiré par le code, creux compris (`detourerLeLogo`) ; rend la raison quand il ne sait pas le retirer. */
  sansFond: (png: Buffer) => Promise<{ ok: true; png: Buffer } | { ok: false; raison: string }>;
};
export type EssaiDuLogoEnHd = { tour: number; texte: string; brute: Buffer | null; raisons: string[]; verdict?: LogoEnHdRelu };
/** Le résultat d'une version : gardée (`png`, fond retiré) ou non (l'agrandissement de l'aperçu reste). */
export type ResultatDuLogoEnHd = { version: VersionEnHd; ok: boolean; png: Buffer | null; essais: EssaiDuLogoEnHd[]; raison?: string };

/**
 * LES VERSIONS EN HAUTE DÉFINITION : chacune refaite à partir de sa tuile (logo officiel joint), son fond retiré par le
 * code, relues ensemble face à leur tuile ; une refusée est refaite UNE fois, à la charge du Studio, avec ses raisons au
 * début de son texte, puis relue ; refusée deux fois, elle n'est pas gardée (l'agrandissement de l'aperçu reste). Une
 * version sans tuile n'est pas tentée. Une panne n'est jamais relancée toute seule : l'erreur remonte.
 */
export async function refaireLesLogosEnHd(deps: LogosEnHdDeps, o: { nom: string; personnes: boolean; logo: Buffer; tuiles: ReadonlyMap<string, Buffer>; versions?: readonly VersionEnHd[] }): Promise<Map<VersionEnHd, ResultatDuLogoEnHd>> {
  const res = new Map<VersionEnHd, ResultatDuLogoEnHd>();
  const versions = (o.versions ?? VERSIONS_EN_HD).filter((v) => o.tuiles.has(LOGOS_EN_HD[v].tuile));
  const unTour = async (liste: VersionEnHd[], tour: number) => {
    const faites = new Map<VersionEnHd, { texte: string; brute: Buffer; png: Buffer | null; raison?: string }>();
    for (const v of liste) {
      const raisons = tour > 1 ? res.get(v)?.essais.at(-1)?.raisons : undefined;
      const d = demandeDuLogoEnHd({ version: v, nom: o.nom, personnes: o.personnes, tuile: o.tuiles.get(LOGOS_EN_HD[v].tuile)!, logo: o.logo, raisons });
      const brute = await deps.refaire(d, tour);
      const f = await deps.sansFond(brute);
      faites.set(v, f.ok ? { texte: d.texte, brute, png: f.png } : { texte: d.texte, brute, png: null, raison: `son fond ne peut pas être retiré proprement (${f.raison})` });
    }
    // Relue sur l'image reçue (avec son fond, comme la tuile de l'aperçu) ; une version sans fond retirable n'est pas relue.
    const items = liste.filter((v) => faites.get(v)!.png);
    const verdicts = items.length ? await deps.relire(items.map((v) => ({ version: v, apercu: o.tuiles.get(LOGOS_EN_HD[v].tuile)!, image: faites.get(v)!.brute })), demandeAuRelecteurDesLogosEnHd({ nom: o.nom, versions: items }), tour) : { versions: [] };
    for (const v of liste) {
      const f = faites.get(v)!, verdict = verdicts.versions.find((x) => x.version === v);
      const raisons = f.png ? raisonsDuRefusDuLogoEnHd(verdict) : [f.raison!];
      const essai: EssaiDuLogoEnHd = { tour, texte: f.texte, brute: f.brute, raisons, ...(verdict ? { verdict } : {}) };
      res.set(v, { version: v, ok: !raisons.length, png: raisons.length ? null : f.png, essais: [...(res.get(v)?.essais ?? []), essai], ...(raisons.length ? { raison: raisons.join(" ; ") } : {}) });
    }
  };
  if (!versions.length) return res;
  await unTour(versions, 1);
  const refusees = versions.filter((v) => !res.get(v)!.ok);
  if (refusees.length) await deps.aLaChargeDuStudio(() => unTour(refusees, 2));
  return res;
}

// ---------------------------------------------------------------- 9. ce que SINA dit

export const phraseDeLImageGardeeEnApercu = (cases: readonly string[]) => { const elements = cases.map(libelleDeLElement); return L(
  `Sur ta planche en vrai, ${elements.length > 1 ? `${elements.length} images n'ont pas passé ma relecture, même refaites` : "une image n'a pas passé ma relecture, même refaite"} (${elements.join(", ")}) : ${elements.length > 1 ? "leurs cases gardent" : "sa case garde"} l'aperçu de ta planche choisie, sans fichier en haute définition. Je peux ${elements.length > 1 ? "les" : "la"} refaire à ma charge : rien n'est compté sur ton budget.`,
  `On your full-resolution board, ${elements.length} image(s) did not pass my review, even redone (${elements.join(", ")}): their slot keeps the preview of your chosen board. I can redo them at my expense.`); };
const GENRE_DIT: Record<string, [string, string]> = { manuscrite: ["écriture manuscrite", "handwriting"], serif: ["écriture à empattements", "a serif type"], sans: ["écriture sans empattements", "a sans-serif type"], "chasse-fixe": ["écriture à chasse fixe", "a monospaced type"], affiche: ["écriture d'affiche", "a display type"] };
/**
 * La police remplacée, dite au client : absente du catalogue (deux paramètres, la phrase d'avant), ou, avec `genreLu`,
 * nommée sur la planche mais montrée dans un autre genre d'écriture (26 novembre 2026) : la police suit ce qu'il a vu.
 */
export const phraseDeLaPoliceRemplacee = (lue: string, prise: string, genreLu?: string, apercu?: boolean) => apercu ? L(
  `Sur ta planche, la police nommée « ${lue} » n'avait pas tout à fait le dessin montré : j'ai pris celle du catalogue du Studio qui ressemble le plus à ce que tu as vu, « ${prise} ».`,
  `On your board, the font named “${lue}” did not quite match the type shown: I used the Studio catalogue font closest to what you saw, “${prise}”.`) : genreLu ? L(
  `Sur ta planche, la police nommée « ${lue} » était montrée en ${GENRE_DIT[genreLu]?.[0] ?? genreLu} : j'ai pris celle du catalogue du Studio qui ressemble le plus à ce que tu as vu, « ${prise} ».`,
  `On your board, the font named “${lue}” was shown as ${GENRE_DIT[genreLu]?.[1] ?? genreLu}: I used the Studio catalogue font closest to what you saw, “${prise}”.`) : L(
  `La police « ${lue} » de ta planche n'est pas dans le catalogue du Studio : j'ai pris la plus proche, « ${prise} ».`,
  `The “${lue}” font of your board is not in the Studio catalogue: I used the closest one, “${prise}”.`);
/** Les versions du logo reprises de la planche choisie, agrandies (aucune séparation fiable du symbole). */
export const phraseDesLogosDeLApercu = (versions: readonly string[]) => L(
  `Ton logo ne se sépare pas proprement en un symbole et un nom : ${versions.length > 1 ? "ces versions sont reprises" : "cette version est reprise"} de ta planche choisie, agrandie${versions.length > 1 ? "s" : ""}, telle${versions.length > 1 ? "s" : ""} que tu ${versions.length > 1 ? "les " : "l'"}as vue${versions.length > 1 ? "s" : ""} (${versions.map((v) => LIBELLE_VERSION_FR[v] ?? v).join(", ")}). Je peux ${versions.length > 1 ? "les" : "la"} refaire en haute définition, je t'annonce le prix avant.`,
  `Your logo does not split cleanly into a symbol and a name: ${versions.length > 1 ? "these versions are" : "this version is"} taken from your chosen board, enlarged, as you saw ${versions.length > 1 ? "them" : "it"} (${versions.join(", ")}). I can redo ${versions.length > 1 ? "them" : "it"} in high definition; I give you the price first.`);
const LIBELLE_VERSION_FR: Record<string, string> = { "logo-compact": "le logo compact", icone: "l'icône", favicon: "le favicon", badge: "le badge" };
const LIBELLE_VERSION_EN: Record<string, string> = { "logo-compact": "the compact logo", icone: "the icon", favicon: "the favicon", badge: "the badge" };
/**
 * Les versions refaites en haute définition qui n'ont pas passé la relecture, même refaites : leur agrandissement de
 * l'aperçu est gardé, et c'est dit simplement (aucune promesse de plus).
 */
export const phraseDesLogosEnHdRefuses = (versions: readonly string[]) => {
  const n = versions.length, liste = versions.map((v) => LIBELLE_VERSION_FR[v] ?? v).join(", ");
  return L(
    `J'ai refait en haute définition ${liste}, mais ${n > 1 ? "ces versions n'ont" : "cette version n'a"} pas passé ma relecture, même refaite${n > 1 ? "s" : ""} : ${n > 1 ? "elles ne sont" : "elle n'est"} pas identique${n > 1 ? "s" : ""} à ta planche choisie. Je garde donc ${n > 1 ? "celles de ta planche, agrandies, telles que tu les as vues" : "celle de ta planche, agrandie, telle que tu l'as vue"}.`,
    `I redid ${versions.map((v) => LIBELLE_VERSION_EN[v] ?? v).join(", ")} in high definition, but ${n > 1 ? "they" : "it"} did not pass my review, even redone: not identical to your chosen board. I keep the enlarged version${n > 1 ? "s" : ""} from your board, as you saw ${n > 1 ? "them" : "it"}.`);
};
export const phraseDuSymboleComplet = () => L(
  "Je n'ai pas pu séparer proprement le symbole et le nom de ton logo : ton icône et ton favicon reprennent ton logo complet.",
  "I could not cleanly separate your logo's symbol from its name: your icon and favicon use your full logo.");
export const phraseDeLaPublicationIncomprehensible = (n: number) => L(
  `La publication ${n} de ta planche reste sur ta planche, mais je ne la mets pas à ton calendrier : quelqu'un qui ne connaît pas ta marque ne comprendrait pas ce qu'elle propose.`,
  `Post ${n} stays on your board, but I do not put it in your calendar: someone who does not know your brand would not understand it.`);
export const ETIQUETTE_AMBIANCE = { fr: "image d'ambiance, ce n'est pas ton produit", en: "mood image, this is not your product" } as const;
export const phraseDuProduitImagine = () => L(
  `Tes produits sur la planche en vrai sont des images d'ambiance (« ${ETIQUETTE_AMBIANCE.fr} ») : ils ne vont jamais sur les emplacements produit de ton site, où « Ta photo ici » attend tes photos. Quand tu m'envoies tes photos, je peux refaire ces cases avec ton vrai produit, je t'annonce le prix avant.`,
  `Your products on the board are mood images (“${ETIQUETTE_AMBIANCE.en}”): they never go on your site's product slots. Send me your photos and I can redo these slots with your real product.`);
export const phraseDuMelangeRefuse = () => L(
  "Ta planche de marque est faite : le mélange de deux identités n'est plus possible. Tu choisis une planche telle qu'elle est ; je peux ensuite retoucher ta marque avec tes mots.",
  "Your brand board is done: mixing two identities is no longer possible. You choose a board as it is; I can then adjust your brand with your words.");

/** Les promesses mesurables d'un bloc de texte (le code refuse de les poser telles quelles) ; `permis` : l'année et le domaine vérifiés. */
const PROMESSE_DU_BLOC = /\p{N}|gratuit|offert|rembours|garanti|satisfait|avis|étoile|délai|livraison (offerte|gratuite|en)|meilleur|n°\s*1/iu;
export const promessesDuBloc = (lignes: readonly string[], permis: readonly string[] = []) => lignes.filter((l) => PROMESSE_DU_BLOC.test(l) && !permis.some((x) => x && l.includes(x)));

// ---------------------------------------------------------------- 10. l'état gardé dans le parcours

/** La planche en vrai de l'identité choisie, telle que l'onglet Marque, le site et le calendrier la lisent. */
export type EtatPlancheEnVrai = {
  key: string; demo: string; logo: string; laquelle: Laquelle; at: number;
  /** La planche en vrai entière (3072 × 4608), rangée comme planche de marque (« brand-board », mention « planche-en-vrai »). */
  planche?: { id: string; w: number; h: number };
  /** Chaque image : son fichier en haute définition (null : refusée deux fois, l'aperçu agrandi garde sa case). */
  elements: { element: NomElement; id: string | null; w?: number; h?: number; ambiance?: boolean; raison?: string; essais: number; description?: string;
    /** L'image telle qu'elle est posée sur la planche (avant le rognage au contenu de `id`, qui est montrée et téléchargée). */
    idPlanche?: string }[];
  /**
   * Le site en une seule image (l'ordinateur et le téléphone, tout le bloc du site sans son titre), prise sur la planche en
   * vrai assemblée : c'est elle que l'onglet Marque montre et que le zip donne, à la place des deux images séparées, qui
   * restent en coulisses pour le site.
   */
  siteEntier?: { id: string; w: number; h: number };
  logos: { version: import("./planche-en-vrai-code").VersionDuLogo; id: string }[];
  favicons?: { f32: string; f64: string; f512: string; avatar: string };
  palette: { hex: string; nom: string; mots: string[] }[];
  polices?: { titres: import("./planche-en-vrai-code").PoliceChoisie; textes: import("./planche-en-vrai-code").PoliceChoisie };
  symboleComplet: boolean;
  /** Les trois publications refaites ; une incompréhensible reste sur la planche, jamais au calendrier. */
  publications: { element: NomElement; id: string; texte: string; comprehensible: boolean; format: "1:1" | "4:5" | "9:16" }[];
  issues: string[]; notes: string[];
  /** L'inventaire fait avant toute retouche : il sert au réassemblage (produits refaits avec ses photos) sans être repayé. */
  inventaire?: Inventaire;
  /** Les versions du logo reprises de leur tuile de l'aperçu (sans symbole séparable) : leur case garde l'aperçu agrandi. */
  logosDeLApercu?: import("./planche-en-vrai-code").VersionDuLogo[];
  /** Les versions refaites en haute définition et gardées : leur fichier (téléchargement, zip, favicons) est celui-là. */
  logosEnHd?: import("./planche-en-vrai-code").VersionDuLogo[];
  /** Les versions refaites en haute définition refusées deux fois : l'agrandissement de l'aperçu est gardé, et c'est dit. */
  logosEnHdRefuses?: import("./planche-en-vrai-code").VersionDuLogo[];
};

/** Le site en une seule image (26 novembre 2026, le propriétaire : « L'ordi et le téléphone ne sont pas obligés d'être découpés si ? »). */
export const LIBELLE_DU_SITE = { fr: "Le site sur ordinateur et téléphone", en: "The site on desktop and phone" } as const;
/**
 * Les images montrées dans l'onglet Marque et données dans le zip : avec le site en une seule image, l'ordinateur et le
 * téléphone séparés n'y sont plus (ils restent en coulisses pour le site) ; le site entier prend la place de l'ordinateur.
 */
export function imagesMontrees(ev: EtatPlancheEnVrai): { element: string; id: string; w?: number; h?: number; ambiance?: boolean }[] {
  const out: { element: string; id: string; w?: number; h?: number; ambiance?: boolean }[] = [];
  const site = () => { if (ev.siteEntier && !out.some((x) => x.element === "site")) out.push({ element: "site", id: ev.siteEntier.id, w: ev.siteEntier.w, h: ev.siteEntier.h }); };
  for (const e of ev.elements) {
    if (ev.siteEntier && (e.element === "site-ordinateur" || e.element === "site-telephone")) { site(); continue; }
    if (e.id) out.push({ element: e.element, id: e.id, w: e.w, h: e.h, ...(e.ambiance ? { ambiance: true } : {}) });
  }
  site();
  return out;
}
