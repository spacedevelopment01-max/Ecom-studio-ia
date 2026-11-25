/**
 * LA MÉTHODE DES PUBLICATIONS (validée par le propriétaire le 24 novembre 2026, mot pour mot : « Les trois dernières
 * publications … correspondent au niveau graphique recherché pour SINA. Conserve intégralement la méthode, les paramètres
 * API, le modèle utilisé et la structure des prompts » ; plan accepté : « Oui au plan des publications, tel quel »).
 *
 * Une publication par appel, indépendante : le texte envoyé est ASSEMBLÉ PAR LE CODE, en cinq parties dans l'ordre, sans
 * aucun modèle de texte :
 *   1. « Crée une publication pour les réseaux sociaux de {marque}, {métier}. Format {nom} {L × H}. »
 *   2. « Accroche, écrite exactement : « … » »
 *   3. l'objectif, en une ou deux phrases (la seule partie libre, écrite avec les textes des publications de la planche) ;
 *   4. la phrase d'identité, faite par le code : palette avec ses codes, typographies, ton ;
 *   5. les exigences communes, recopiées mot pour mot de l'essai validé.
 * L'appel (media-providers.ts, `aiPublicationMethode`) : POST /v1/images/edits, le logo officiel joint en premier, puis
 * les vraies photos du produit ; taille demandée juste au-dessus du format final (multiple de 16), puis recadrage central
 * exact, jamais d'agrandissement.
 *
 * Éteint par défaut (`sina.publications.methode`) : rien ne change tant que le propriétaire ne l'a pas allumé. Module pur
 * (aucune base, aucun appel), sauf la lecture du réglage et le recadrage (sharp).
 */
import sharp from "sharp";
import { getJsonSetting } from "../settings";
import { PUBLICATIONS_METHODE_ROUTE } from "../ai/social-image-policy";
import { estUnOrdre } from "../social-v2/fin-de-legende";
import { parleDePersonnes } from "./fiche";
import { fontFamily } from "./identities";
import { uniqueColorNames } from "../media/identity-board";

/** Le réglage qui allume la méthode. Éteint par défaut ; rien n'est allumé en ligne par ce code. */
export const REGLAGE_METHODE = "sina.publications.methode";
export const methodeActive = (): boolean => getJsonSetting<boolean>(REGLAGE_METHODE, false) === true;

/** Le modèle de la méthode (celui de l'essai validé), sur le seul chemin direct permis (logo-policy.ts). */
export const MODELE_DES_PUBLICATIONS = PUBLICATIONS_METHODE_ROUTE.model;

export type FormatPublication = "1:1" | "4:5" | "9:16";
/** Chaque format : son nom dans le texte, le format final exact, la taille demandée (multiple de 16 juste au-dessus). */
export const FORMATS: Record<FormatPublication, { nom: string; w: number; h: number; demande: string }> = {
  "1:1": { nom: "carré", w: 1080, h: 1080, demande: "1088x1088" },
  "4:5": { nom: "portrait", w: 1080, h: 1350, demande: "1088x1360" },
  "9:16": { nom: "story", w: 1080, h: 1920, demande: "1088x1936" },
};
export const TAILLES_DEMANDEES: readonly string[] = Object.values(FORMATS).map((f) => f.demande);
/** Les trois publications de la planche, chacune à son format (dans l'ordre de l'essai validé). */
export const FORMAT_DES_PLACES = { post0: "1:1", post1: "4:5", post2: "9:16" } as const satisfies Record<string, FormatPublication>;
export type PlacePublication = keyof typeof FORMAT_DES_PLACES;
export const estUnePlaceDePublication = (s: string): s is PlacePublication => s in FORMAT_DES_PLACES;

/** Taille au plus du texte envoyé (borne le devis ; un texte plus long n'est jamais envoyé). */
export const TEXTE_MAX_OCTETS = 4000;
/** Photos du produit jointes au plus, après le logo. */
export const PHOTOS_MAX = 3;

/** Partie 5 : les exigences communes, mot pour mot (essai validé du 24 novembre 2026). */
export const EXIGENCES_COMMUNES = "Le logo de l'image jointe signe la publication sans monopoliser l'image ; ne le redessine pas. "
  + "Un sujet principal, une accroche forte, une hiérarchie visuelle claire. Pas d'accumulation de slogans, de pictogrammes, de blocs de réassurance ni de textes secondaires. "
  + "N'invente aucune caractéristique technique, garantie, certification ou performance produit. Textes en français.";

const sansPointFinal = (t: string) => t.replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
/** « Bougies coulées à la main » devient « bougies coulées à la main » (un sigle reste tel quel). */
const minusculeEnTete = (t: string) => (/^\p{Lu}\p{Lu}/u.test(t) ? t : t.charAt(0).toLocaleLowerCase("fr-FR") + t.slice(1));
/** « a, b et c » */
const enListe = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}` : l[0] ?? "");

/** Le métier dit dans la partie 1 : la ligne de métier de la planche, en mots simples. Vide : aucune publication. */
export const metierDe = (descriptor?: string | null): string => minusculeEnTete(sansPointFinal(descriptor ?? ""));

/** Ce que la phrase d'identité lit d'une identité (une route de la planche). */
export type IdentiteDeMarque = { name: string; palette: { dark: string; primary: string; secondary: string; accent: string; light: string }; fonts: { heading: string; body: string }; tone: { adjectives: string[] } };

/** Partie 4 : « Identité {marque} à conserver : palette {nom} {code}, … ; typographies {A} et {B} ; ton {…}. » Faite par le code. */
export function phraseIdentite(x: IdentiteDeMarque): string {
  const codes = [...new Set([x.palette.dark, x.palette.primary, x.palette.secondary, x.palette.accent, x.palette.light].map((h) => h.toUpperCase()))];
  const noms = uniqueColorNames(codes, "fr").map((n) => n.charAt(0).toLocaleLowerCase("fr-FR") + n.slice(1));
  const polices = [...new Set([fontFamily(x.fonts.heading), fontFamily(x.fonts.body)])];
  const ton = x.tone.adjectives.map((a) => sansPointFinal(a).toLocaleLowerCase("fr-FR")).filter(Boolean);
  return `Identité ${x.name} à conserver : palette ${codes.map((c, i) => `${noms[i]} ${c}`).join(", ")} ; typographies ${enListe(polices)} ; ton ${enListe(ton)}.`;
}

/** Le texte envoyé, en cinq parties dans l'ordre, séparées d'une espace (comme l'essai validé). Aucun modèle de texte. */
export function textePublication(o: { marque: string; metier: string; format: FormatPublication; accroche: string; objectif: string; identite: string }): string {
  const f = FORMATS[o.format];
  const parties = [
    `Crée une publication pour les réseaux sociaux de ${o.marque}, ${o.metier}. Format ${f.nom} ${f.w} × ${f.h}.`,
    `Accroche, écrite exactement : « ${o.accroche.replace(/\s+/g, " ").trim()} »`,
    o.objectif.replace(/\s+/g, " ").trim(),
    o.identite,
    EXIGENCES_COMMUNES,
  ];
  if (parties.some((p) => !p.trim())) throw new Error("Publication : une des cinq parties est vide, rien n'est envoyé.");
  return parties.join(" ");
}

// ---------------------------------------------------------------- l'objectif (partie 3), contrôlé gratuitement

/** Sans photo d'une personne fournie par le client ni son accord écrit : l'objectif le dit lui-même. */
export const SANS_PERSONNE = "Aucune personne n'apparaît dans l'image.";
const PHRASE_SANS_PERSONNE = /(aucune personne|aucun personnage|sans personne|personne n'appara[iî]t)[^.!?]*[.!?]?/giu;
const phrasesDe = (t: string) => t.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);
/** Mots d'un appel au lecteur demandé dans l'image (bouton, lien, « commande »…). */
const APPEL_AU_LECTEUR = /(appel à l'action|bouton|lien en bio|code promo|clique|commande maintenant|réserve maintenant)/iu;

/**
 * La consigne ajoutée à l'appel qui écrit déjà les textes des publications (direction de la planche), seulement quand la
 * méthode est allumée : chaque publication reçoit son objectif, la partie libre de la demande.
 */
export function consigneDesObjectifs(personnes: boolean): string {
  return `- board.posts[].objectif : pour chaque publication, son objectif en UNE ou DEUX phrases, adressées au graphiste qui la crée (par exemple « Crée … L'objectif est de … ») : ce que la publication doit faire ressentir ou provoquer (une émotion, un désir du produit, un sourire qui donne envie de la partager…) et la liberté de composition. Trois objectifs très différents. Jamais un texte à écrire dans l'image, jamais un bouton ni un appel au lecteur, aucun ordre donné au lecteur.${personnes ? "" : ` Aucune personne : chaque objectif finit par « ${SANS_PERSONNE} »`} 400 caractères au plus.`;
}

/**
 * Le contrôle gratuit des trois objectifs : une ou deux phrases ; trois objectifs différents ; aucun ordre au lecteur ni
 * texte à écrire en plus ; aucune personne demandée sans photo d'une personne ni accord écrit. Sans cet accord, la phrase
 * « Aucune personne n'apparaît dans l'image. » est ajoutée par le code quand l'objectif ne la dit pas. Rend, place par
 * place, l'objectif gardé (ou null) et la raison d'un refus.
 */
export function controleDesObjectifs(objectifs: readonly (string | null | undefined)[], personnes: boolean): { objectifs: (string | null)[]; raisons: (string | null)[] } {
  const vus = new Set<string>();
  const out: (string | null)[] = [], raisons: (string | null)[] = [];
  for (const brut of objectifs) {
    const t = (brut ?? "").replace(/\s+/g, " ").trim();
    const sansLaPhrase = t.replace(PHRASE_SANS_PERSONNE, " ").replace(/\s+/g, " ").trim();
    const cle = sansLaPhrase.toLocaleLowerCase("fr-FR").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const phrases = phrasesDe(sansLaPhrase);
    const raison = !sansLaPhrase ? "objectif manquant"
      : phrases.length > 2 ? "objectif de plus de deux phrases"
      : t.length > 400 ? "objectif trop long"
      : /[«»“”"]/.test(t) ? "objectif qui demande un texte en plus dans l'image"
      : phrases.some(estUnOrdre) || APPEL_AU_LECTEUR.test(t) ? "objectif qui donne un ordre au lecteur"
      : !personnes && parleDePersonnes(sansLaPhrase) ? "objectif qui demande une personne sans photo ni accord écrit du client"
      : vus.has(cle) ? "objectif identique à celui d'une autre publication"
      : null;
    if (raison) { out.push(null); raisons.push(raison); continue; }
    vus.add(cle);
    const fin = /[.!?…]$/.test(sansLaPhrase) ? sansLaPhrase : `${sansLaPhrase}.`;
    out.push(personnes ? t : `${fin} ${SANS_PERSONNE}`);
    raisons.push(null);
  }
  return { objectifs: out, raisons };
}

// ---------------------------------------------------------------- le recadrage exact

/**
 * Recadrage central EXACT au format final (1080 × 1080, 1080 × 1350 ou 1080 × 1920), sans agrandissement ni déformation.
 * Une image reçue plus petite que le format final est refusée (erreur), jamais agrandie.
 */
export async function recadrer(png: Buffer, format: FormatPublication): Promise<Buffer> {
  const { w: W, h: H } = FORMATS[format];
  const m = await sharp(png).metadata();
  const w = m.width ?? 0, h = m.height ?? 0;
  if (w < W || h < H) throw new ImageTropPetite(`${w}x${h}`, `${W}x${H}`);
  return sharp(png).extract({ left: Math.floor((w - W) / 2), top: Math.floor((h - H) / 2), width: W, height: H }).png().toBuffer();
}
export class ImageTropPetite extends Error {
  constructor(public recue: string, public attendue: string) {
    super(`Image reçue en ${recue}, plus petite que le format final ${attendue} : refusée, jamais agrandie.`);
    this.name = "ImageTropPetite";
  }
}
