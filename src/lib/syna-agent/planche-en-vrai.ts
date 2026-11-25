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
import { DOSSIER_DE_LA_PLANCHE } from "./planche-de-marque";
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
export type Decoupe = { apercus: Map<string, Buffer>; boites: Map<string, Boite>; refus: { case: string; raison: string }[] };
/**
 * LA DÉCOUPE DES APERÇUS (gratuite, sans appel) : chaque case de la disposition, recalée sur la planche choisie, puis
 * contrôlée. Une planche qui n'est pas à la taille des cases est ramenée à cette taille avant la découpe.
 */
export async function decouperLesApercus(planche: Buffer, laquelle: Laquelle, noms?: readonly string[]): Promise<Decoupe> {
  const m = await sharp(planche).metadata();
  const png = m.width === TAILLE_DEMO.w && m.height === TAILLE_DEMO.h ? planche : await sharp(planche).resize(TAILLE_DEMO.w, TAILLE_DEMO.h, { fit: "fill" }).png().toBuffer();
  const g = await gris(png), c = lesCases(laquelle);
  const apercus = new Map<string, Buffer>(), boites = new Map<string, Boite>(), refus: Decoupe["refus"] = [];
  for (const [nom, mesuree] of Object.entries(c.cases)) {
    if (noms && !noms.includes(nom)) continue;
    // Seules les photos et les publications se recalent sur les bords de leur panneau (RECALEES).
    const b = RECALEES.has(nom) ? recalerUneCase(g, mesuree) : mesuree;
    const r = await refusDUneCase(g, b, mesuree, { auBord: AU_BORD.has(nom) });
    if (r) { refus.push({ case: nom, raison: r }); continue; }
    boites.set(nom, b);
    apercus.set(nom, await sharp(png).extract({ left: b[0], top: b[1], width: b[2] - b[0], height: b[3] - b[1] }).png().toBuffer());
  }
  return { apercus, boites, refus };
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
/** La ligne qui dit ce qu'est l'élément (marge des formats larges ; sans accord du client, aucune personne). */
export function ligneDeLElement(n: NomElement, personnes: boolean): string {
  const d = def(n);
  return [d.quoi, d.large && !/marges généreuses/.test(d.quoi) ? MARGE_LARGE : "", personnes ? "" : SANS_PERSONNE_EN_VRAI].filter(Boolean).join(" ");
}
export const finDeRepriseEnVrai = (raisons: readonly string[]) => `À corriger : ${raisons.join(" ; ")}.`;
/** LE TEXTE ENVOYÉ : REGLE mot pour mot (sa phrase du logo seulement si le logo est joint), la photo du produit, la ligne. */
export function texteDeLElement(o: { element: NomElement; nom: string; logo: boolean; photo: boolean; personnes: boolean; raisons?: readonly string[]; /** Le symbole seul est joint (jamais avec le logo complet). */ symbole?: boolean }): string {
  const parts = [REGLE_APERCU];
  if (o.logo) parts.push(regleDuLogo(o.nom));
  else if (o.symbole) parts.push(regleDuSymbole(o.nom));
  if (o.photo) parts.push(phraseDuProduit(o.logo || o.symbole ? 3 : 2));
  parts.push(ligneDeLElement(o.element, o.personnes));
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
const PoliceLue = z.object({ nom: z.string().max(80).catch(""), genre: z.enum(["serif", "sans", "manuscrite", "chasse-fixe", "affiche"]).catch("sans") });
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
- polices : le nom de la police des titres et celui de la police des textes, tels qu'ils sont écrits dans la case « typographies », avec leur genre (serif, sans, manuscrite, chasse-fixe ou affiche) ;
- couleurs : pour chaque pastille de la case « palette », de gauche à droite, son nom et les mots écrits dessous (sans le code de la couleur) ;
- icone et favicon : ce que montrent l'icône seule et le favicon de la case « logos », en quelques mots ;
- iconeReprendLeLogo : l'icône et le favicon montrent le symbole du logo (ou une lettre dessinée comme dans le logo).`;

/** Les cases relues par l'inventaire : les 17 aperçus, puis les blocs du code, puis la rangée des logos et les titres. */
export const demandeDeLInventaire = (nom: string) => `Marque : « ${nom.trim()} ». Relève chaque case, mot pour mot.`;

/** Ce qui manque à un inventaire : une case d'image qui n'y est pas relue est une faute (rien ne part sans elle). */
export function inventaireIncomplet(inv: Inventaire, attendues: readonly string[]): string[] {
  const lues = new Set(inv.cases.map((c) => c.case));
  return attendues.filter((n) => !lues.has(n));
}
export const caseLue = (inv: Inventaire | null | undefined, n: string): CaseLue | undefined => inv?.cases.find((c) => c.case === n);

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
  /** La note de fidélité à l'aperçu, de 0 à 10. */
  note: z.number().min(0).max(10).catch(0),
  pourquoi: z.string().max(500).catch(""),
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
- note : ta note de fidélité à l'aperçu, de 0 à 10 ; une image fidèle, nette, sans défaut visible vaut 8 ou plus ;
- pourquoi : une ou deux phrases simples.
Ne juge que ce que tu vois.`;

export function demandeAuRelecteurEnVrai(o: { nom: string; personnes: boolean; groupe: Groupe; cases: { element: NomElement; photo: boolean }[] }): string {
  return [
    `Marque : « ${o.nom.trim()} ». Groupe : ${NOM_DU_GROUPE[o.groupe]}.`,
    o.personnes ? "Le client a donné son accord pour des personnes." : "Le client n'a donné ni photo de personne ni accord : aucune personne ne doit être visible.",
    `Cases : ${o.cases.map((c) => `${c.element}${c.photo ? " (photo du produit jointe)" : ""}`).join(", ")}.`,
  ].join("\n");
}

/** Un texte ramené à ses mots, lettre pour lettre (apostrophes, guillemets et espaces unifiés ; casse et accents gardés). */
export const motsDe = (t: string): string[] => t.normalize("NFC").replace(/[’ʼ‘]/g, "'").replace(/[«»“”"]/g, " ").replace(/[–—]/g, "-").split(/\s+/).map((w) => w.replace(/^[.,;:!?…]+|[.,;:!?…]+$/g, "")).filter(Boolean);
/** Les textes refaits sont-ils ceux de l'inventaire, lettre pour lettre ? Rend les mots manquants et les mots en trop. */
export function comparerLesTextes(attendus: readonly string[], lus: readonly string[]): { manquants: string[]; enTrop: string[] } {
  const reste = new Map<string, number>();
  for (const w of attendus.flatMap(motsDe)) reste.set(w, (reste.get(w) ?? 0) + 1);
  const enTrop: string[] = [];
  for (const w of lus.flatMap(motsDe)) { const n = reste.get(w) ?? 0; if (n > 0) reste.set(w, n - 1); else enTrop.push(w); }
  const manquants = [...reste.entries()].flatMap(([w, n]) => Array(n).fill(w) as string[]);
  return { manquants, enTrop };
}

/**
 * Les raisons du refus d'une image refaite : pas identique ; textes différents de ceux de l'inventaire (comparés lettre
 * pour lettre par le code) ; logo ajouté ; personne sans accord ; logo foncé sur fond sombre ; autre produit que celui de
 * la photo jointe ; texte coupé ou collé au bord ; note de fidélité sous 8. Vide : gardée.
 */
export function raisonsDuRefusEnVrai(v: ImageRelue | undefined, o: { inventaire: CaseLue | undefined; personnes: boolean; photo: boolean }): string[] {
  if (!v) return ["le relecteur ne l'a pas relue"];
  const r: string[] = [];
  if (!v.identique) r.push("elle n'est pas identique à son aperçu");
  const t = comparerLesTextes(o.inventaire?.textes ?? [], v.textesLus);
  if (t.manquants.length || t.enTrop.length) r.push(`ses textes ne sont pas ceux de l'aperçu, lettre pour lettre${t.manquants.length ? ` (manquent : ${t.manquants.slice(0, 8).map((w) => `« ${w} »`).join(", ")})` : ""}${t.enTrop.length ? ` (en trop ou mal écrits : ${t.enTrop.slice(0, 8).map((w) => `« ${w} »`).join(", ")})` : ""}`);
  if (v.logoPresent && !o.inventaire?.logo) r.push("un logo a été ajouté là où l'aperçu n'en a pas");
  if (v.personne && !o.personnes) r.push("une personne est visible sans l'accord du client");
  if (v.logoFonceSurFondSombre) r.push("un logo foncé est posé sur un fond sombre : il doit y être clair");
  if (o.photo && v.produitFidele === false) r.push("le produit montré n'est pas celui de la photo du client");
  if (v.texteCoupe) r.push("un texte est coupé ou collé au bord");
  if (v.note < NOTE_DU_PROPRIETAIRE) r.push(`sa fidélité n'est pas au niveau (${v.note}/10, il faut ${NOTE_DU_PROPRIETAIRE})`);
  return r;
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
  nom: string; personnes: boolean; logo: Buffer; photo: Buffer | null; apercus: Map<string, Buffer>; inventaire: Inventaire; elements?: readonly NomElement[];
  /** Le symbole seul, sur fond blanc (séparation fiable du code), joint là où l'inventaire ne voit que lui ; null : jamais joint. */
  symbole?: Buffer | null;
}): Promise<Map<NomElement, ResultatDElement>> {
  const noms = (o.elements ?? NOMS_DES_ELEMENTS).filter((n) => o.apercus.has(n));
  const res = new Map<NomElement, ResultatDElement>();
  const demande = (n: NomElement, raisons?: string[]): DemandeDElement => {
    const inv = caseLue(o.inventaire, n), jointes = jointesDeLElement({ apercu: o.apercus.get(n)!, logo: o.logo, photo: o.photo, inventaire: inv, symbole: o.symbole ?? null });
    const logo = jointes.some((j) => j.role === "logo"), symbole = jointes.some((j) => j.role === "symbole"), photo = jointes.some((j) => j.role === "produit");
    return { element: n, texte: texteDeLElement({ element: n, nom: o.nom, logo, photo, personnes: o.personnes, raisons, symbole }), taille: def(n).taille, jointes };
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
        demandeAuRelecteurEnVrai({ nom: o.nom, personnes: o.personnes, groupe: g, cases: items.map((n) => ({ element: n, photo: faits.get(n)!.d.jointes.some((j) => j.role === "produit") })) }), tour) : { images: [] };
      for (const n of liste.filter((x) => def(x).groupe === g)) {
        const f = faits.get(n)!, photo = f.d.jointes.some((j) => j.role === "produit");
        const v = verdicts.images.find((x) => x.case === n);
        const raisons = f.png ? raisonsDuRefusEnVrai(v, { inventaire: caseLue(o.inventaire, n), personnes: o.personnes, photo }) : [f.raison ?? "image illisible"];
        const avant = res.get(n);
        const essai: EssaiDElement = { tour, texte: f.d.texte, png: f.png, raisons, ...(v ? { verdict: v } : {}) };
        const m = f.png ? await sharp(f.png).metadata() : null;
        res.set(n, { element: n, ok: !raisons.length, png: raisons.length ? null : f.png, ...(m && !raisons.length ? { w: m.width, h: m.height } : {}), photo, essais: [...(avant?.essais ?? []), essai], ...(raisons.length ? { raison: raisons.join(" ; ") } : {}) });
      }
    }
  };
  await unTour(noms, 1, () => undefined);
  const refusees = noms.filter((n) => !res.get(n)!.ok);
  if (refusees.length) await deps.aLaChargeDuStudio(() => unTour(refusees, 2, (n) => res.get(n)!.essais.at(-1)!.raisons));
  return res;
}

// ---------------------------------------------------------------- 9. ce que SINA dit

export const phraseDeLImageGardeeEnApercu = (cases: readonly string[]) => { const elements = cases.map(libelleDeLElement); return L(
  `Sur ta planche en vrai, ${elements.length > 1 ? `${elements.length} images n'ont pas passé ma relecture, même refaites` : "une image n'a pas passé ma relecture, même refaite"} (${elements.join(", ")}) : ${elements.length > 1 ? "leurs cases gardent" : "sa case garde"} l'aperçu de ta planche choisie, sans fichier en haute définition. Je peux ${elements.length > 1 ? "les" : "la"} refaire à ma charge : rien n'est compté sur ton budget.`,
  `On your full-resolution board, ${elements.length} image(s) did not pass my review, even redone (${elements.join(", ")}): their slot keeps the preview of your chosen board. I can redo them at my expense.`); };
export const phraseDeLaPoliceRemplacee = (lue: string, prise: string) => L(
  `La police « ${lue} » de ta planche n'est pas dans le catalogue du Studio : j'ai pris la plus proche, « ${prise} ».`,
  `The “${lue}” font of your board is not in the Studio catalogue: I used the closest one, “${prise}”.`);
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
  elements: { element: NomElement; id: string | null; w?: number; h?: number; ambiance?: boolean; raison?: string; essais: number; description?: string }[];
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
};
