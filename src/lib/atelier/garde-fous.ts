/**
 * LES GARDE-FOUS D'ENTRÉE DE L'ATELIER (rapport 10, point 2 et partie 5).
 *
 *  1. Chaque demande libre et chaque image déposée par le client passe par la modération GRATUITE d'OpenAI
 *     (`omni-moderation-latest`, « The moderation endpoint is free to use »). Sans elle (clé absente, panne), rien
 *     n'est lancé : l'atelier ne crée rien qui n'a pas été vérifié.
 *  2. Le contrôle des personnes déjà écrit (`people-policy.ts`) : une demande qui parle d'une personne n'est faite
 *     qu'avec une photo de cette personne fournie par le client ET son accord écrit, gardé avec la photo.
 *  3. Une page de conditions de l'atelier, acceptée une fois (elle reprend les obligations des fournisseurs).
 *  4. La modération des images d'OpenAI n'est jamais mise au niveau « low » (`niveauModeration`).
 *
 * La modération d'OpenAI ne lit sur les images que six familles (automutilation, sexuel, violence) ; elle ne dit rien
 * des vraies personnes, des marques d'autrui ni des mineurs : le juge de l'image finale le vérifie ensuite. Module pur
 * pour la lecture ; l'appel passe par une fonction donnée par l'appelant (jamais d'appel dans les essais).
 */
import { mentionsPerson } from "../people-policy";

export const MODERATION_URL = "https://api.openai.com/v1/moderations";
export const MODERATION_MODEL = "omni-moderation-latest";

/** Niveau de modération des images d'OpenAI : toujours « auto » (le défaut). « low » est refusé. */
export function niveauModeration(n?: string | null): "auto" {
  if (n === "low") throw new Error("La modération « low » d'OpenAI n'est jamais employée dans le Studio.");
  return "auto";
}

export type EntreeModeree = { texte?: string | null; images?: { mime: string; base64: string }[] };

/** Corps de la demande de modération (texte et images dans la même demande). */
export function demandeModeration(e: EntreeModeree): { model: string; input: unknown[] } {
  const input: unknown[] = [];
  if (e.texte?.trim()) input.push({ type: "text", text: e.texte.trim().slice(0, 4000) });
  for (const i of e.images ?? []) input.push({ type: "image_url", image_url: { url: `data:${i.mime};base64,${i.base64}` } });
  return { model: MODERATION_MODEL, input };
}

/** Familles refusées, avec la phrase dite au client (simple, sans mot d'initié). */
const FAMILLES: Record<string, readonly [string, string]> = {
  sexual: ["contenu sexuel", "sexual content"],
  "sexual/minors": ["contenu qui touche des mineurs", "content involving minors"],
  violence: ["violence", "violence"],
  "violence/graphic": ["violence choquante", "graphic violence"],
  "self-harm": ["automutilation", "self-harm"],
  "self-harm/intent": ["automutilation", "self-harm"],
  "self-harm/instructions": ["automutilation", "self-harm"],
  harassment: ["harcèlement", "harassment"],
  "harassment/threatening": ["menace", "threats"],
  hate: ["haine", "hate"],
  "hate/threatening": ["haine", "hate"],
  illicit: ["activité illégale", "illegal activity"],
  "illicit/violent": ["activité illégale", "illegal activity"],
};

export type Verdict = { ok: true } | { ok: false; raison: string; familles: string[] };

/** Lecture de la réponse de modération : refusée si une famille est signalée. */
export function lireModeration(j: any, lang: "fr" | "en"): Verdict {
  const r = j?.results?.[0];
  if (!r || typeof r !== "object") throw new Error("Réponse de modération illisible.");
  if (!r.flagged) return { ok: true };
  const familles = Object.entries(r.categories ?? {}).filter(([, v]) => v === true).map(([k]) => k);
  const mots = [...new Set(familles.map((k) => (FAMILLES[k] ?? [k, k])[lang === "fr" ? 0 : 1]))];
  return {
    ok: false,
    familles,
    raison: lang === "fr"
      ? `Je ne peux pas faire cette création : la vérification a trouvé ${mots.join(", ") || "un contenu refusé"}. Change ta demande ou ta photo, et je m'y remets.`
      : `I can't make this: the check found ${mots.join(", ") || "refused content"}. Change your request or your photo and I'll get back to it.`,
  };
}

/** Phrase dite quand la vérification est indisponible : rien n'est lancé. */
export const MODERATION_INDISPONIBLE: readonly [string, string] = [
  "La vérification de ta demande est indisponible pour l'instant : rien n'est lancé, rien n'est compté. Réessaie dans un moment.",
  "The check of your request is unavailable right now: nothing started, nothing charged. Try again in a moment.",
];

/**
 * Modère une entrée : `appel` envoie la demande (par la clé d'OpenAI du Studio) et rend le JSON ; null quand aucune
 * clé n'est saisie. Rien de vérifié, rien de lancé.
 */
export async function modererEntree(e: EntreeModeree, appel: (body: unknown) => Promise<any | null>, lang: "fr" | "en"): Promise<Verdict> {
  const body = demandeModeration(e);
  if (!body.input.length) return { ok: true };
  let j: any;
  try {
    j = await appel(body);
  } catch {
    j = null;
  }
  if (!j) return { ok: false, raison: MODERATION_INDISPONIBLE[lang === "fr" ? 0 : 1], familles: [] };
  try {
    return lireModeration(j, lang);
  } catch {
    return { ok: false, raison: MODERATION_INDISPONIBLE[lang === "fr" ? 0 : 1], familles: [] };
  }
}

/** Preuve de l'accord écrit de la personne montrée, gardée avec sa photo. */
export type AccordPersonne = { nom: string; phrase: string; par: string; at: number };

/** Phrase d'accord écrite par la personne montrée (ou pour elle, par le client qui l'a recueillie). */
export const PHRASE_ACCORD: readonly [string, string] = [
  "J'accepte que ma photo serve à créer des images et des vidéos pour cette marque.",
  "I agree that my photo may be used to create images and videos for this brand.",
];

/** L'accord est-il complet (nom écrit, phrase recopiée par la personne) ? */
export function accordValide(a: Partial<AccordPersonne> | null | undefined): a is AccordPersonne {
  const plie = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  return !!a && typeof a.nom === "string" && a.nom.trim().length >= 2 && typeof a.phrase === "string" && PHRASE_ACCORD.some((p) => plie(a.phrase!) === plie(p)) && typeof a.at === "number";
}

/**
 * Une demande qui parle d'une personne n'est faite qu'avec la photo de cette personne et son accord écrit. Rend la
 * phrase dite au client quand la demande est refusée, null sinon.
 */
/** Mots français qui désignent une personne ou une partie du corps (la liste du Studio, `PERSON_RE`, est en anglais). */
export const PERSONNE_FR_RE = /\b(personnes?|gens|femmes?|hommes?|enfants?|bebes?|filles?|garcons?|ados?|adolescente?s?|mains?|doigts?|visages?|levres|cheveux|silhouettes?|portraits?|clients?|clientes?|mannequins?|modeles? vivants?|couples?|familles?|maman|papa|mere|pere|soeur|frere|amie?s?|copines?|copains?|dames?|messieurs?|monsieur|madame|artisane?s?|coiffeuses?|coiffeurs?|vendeuses?|vendeurs?|equipe|quelqu'un|moi-meme|selfie)\b/i;
const plier = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
/** Le texte parle-t-il d'une personne, en français ou en anglais ? */
export const parleDUnePersonne = (texte: string) => !!texte && (mentionsPerson(texte) || PERSONNE_FR_RE.test(plier(texte)));

export function controlePersonnes(texte: string, photoAvecAccord: boolean, lang: "fr" | "en"): string | null {
  if (!parleDUnePersonne(texte) || photoAvecAccord) return null;
  return lang === "fr"
    ? "Je ne mets jamais de personne dans une image sans sa photo et son accord écrit. Ajoute sa photo avec son accord, ou je fais la scène sans personne."
    : "I never put a person in an image without their photo and written consent. Add their photo with their consent, or I'll make the scene without anyone.";
}

/** Version du texte des conditions : une nouvelle version demande un nouvel accord. */
export const CONDITIONS_VERSION = "2026-11-22";

/** Les conditions de l'atelier, lues et acceptées une fois (obligations des fournisseurs accordés). */
export const CONDITIONS: readonly (readonly [string, string])[] = [
  ["Tu ne déposes que des photos sur lesquelles tu as les droits.", "You only upload photos you have the rights to."],
  ["Aucune personne n'apparaît sans sa photo et son accord écrit ; jamais une personne inventée.", "No person appears without their photo and written consent; never an invented person."],
  ["Pas de marque, de logo ni de produit d'une autre entreprise dans tes créations.", "No other company's brand, logo or product in your creations."],
  ["Chaque demande et chaque photo sont vérifiées avant toute création ; une demande refusée n'est pas comptée.", "Every request and photo is checked before anything is made; a refused request is not charged."],
  ["Tes créations t'appartiennent. Les images faites par l'IA portent la marque « faite par l'IA » de leur fabricant, et la mention que la loi demande quand il le faut.", "Your creations are yours. AI images carry their maker's \"made by AI\" marking, and the notice the law requires when needed."],
  ["Les outils de Black Forest Labs, Google, Kling, BytePlus et Alibaba ont leurs propres règles : les respecter fait partie de ces conditions.", "The Black Forest Labs, Google, Kling, BytePlus and Alibaba tools have their own rules: following them is part of these terms."],
];
