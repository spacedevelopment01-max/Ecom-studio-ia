/**
 * Banque d'images (onglet Images) — « Chercher des photos libres » : même comportement que la banque de vidéos.
 *  - le texte tapé par le client est cherché tel quel ; recherche élargie et silhouettes sur demande ;
 *  - une photo gardée grâce à la silhouette, ou créée par l'IA et publiée sur Pixabay, est signalée ;
 *  - quand rien n'est retenu : combien de photos ont été trouvées, pourquoi elles ont été écartées, quoi cocher.
 */
import { C, L } from "../i18n-server";
import type { VisualBrief } from "../image-v2/types";

/** Ce que la recherche a trouvé puis écarté (dit au client quand aucune photo n'est retenue). */
export type BankPhotoDiag = { noKey: boolean; found: number; errors: string[]; already: number; people: number; offTopic: number; rejected: number; untried: number };
export const emptyBankPhotoDiag = (): BankPhotoDiag => ({ noKey: false, found: 0, errors: [], already: 0, people: 0, offTopic: 0, rejected: 0, untried: 0 });

/** Pourquoi aucune photo n'a été retenue, dit simplement (jamais un échec muet). Modèle : noClipMessage (vidéos). */
export function noPhotoMessage(d: BankPhotoDiag, topic: string, broad: boolean, silhouettes = false): string {
  if (d.noKey) return L("Recherche impossible : aucune clé Pixabay active (Administration › Fournisseurs IA, clé gratuite). Importez vos photos en attendant.", "Search unavailable: no active Pixabay key (Administration › AI providers, free key). Upload your photos meanwhile.");
  if (!d.found && d.errors.length) return L(`Pixabay ne répond pas pour le moment (${d.errors[0]}). Réessayez dans quelques minutes.`, `Pixabay isn't responding right now (${d.errors[0]}). Try again in a few minutes.`);
  if (!d.found) return L(`Pixabay n'a aucune photo pour « ${topic} ». Essayez d'autres mots (en anglais, c'est souvent plus riche : ex. « escape room », « old key »).`, `Pixabay has no photo for "${topic}". Try other words (e.g. "escape room", "old key").`);
  const why: string[] = [];
  if (d.already) why.push(L(`${d.already} déjà dans votre banque ou déjà refusées`, `${d.already} already in your bank or already refused`));
  if (d.people) why.push(L(`${d.people} avec des personnes (votre projet n'autorise pas les personnes${silhouettes ? "" : " ; cochez « Accepter les silhouettes » pour les photos de dos ou dans l'ombre"})`, `${d.people} showing people (your project doesn't allow people${silhouettes ? "" : "; tick \"Allow silhouettes\" for photos seen from behind or in shadow"})`));
  if (d.offTopic) why.push(L(`${d.offTopic} hors sujet (mots-clés sans rapport avec « ${topic} » ni votre activité)`, `${d.offTopic} off-topic (keywords unrelated to "${topic}" or your business)`));
  if (d.rejected) why.push(L(`${d.rejected} refusées au contrôle de l'image`, `${d.rejected} refused by the image check`));
  if (d.untried) why.push(L(`${d.untried} non contrôlées (4 contrôles au plus par photo demandée)`, `${d.untried} not checked (at most 4 checks per requested photo)`));
  return L(
    `Aucune photo retenue pour « ${topic} » : ${d.found} photos trouvées sur Pixabay, écartées${why.length ? ` (${why.join(", ")})` : ""}. ${broad ? "Essayez d'autres mots ou importez vos propres photos." : "Cochez « Recherche élargie » ou essayez d'autres mots."}`,
    `No photo kept for "${topic}": ${d.found} photos found on Pixabay, set aside${why.length ? ` (${why.join(", ")})` : ""}. ${broad ? "Try other words or upload your own photos." : "Tick \"Broader search\" or try other words."}`,
  );
}

/**
 * Brief de contrôle d'une photo gardée grâce à la silhouette : une personne y est permise SEULEMENT en silhouette
 * (de dos ou dans l'ombre, visage non visible) ; un visage reconnaissable rend la photo hors sujet, donc refusée.
 */
export function silhouetteBrief(b: VisualBrief): VisualBrief {
  return {
    ...b,
    people: true,
    facts: [...b.facts.filter((f) => !/^no people/i.test(f)), "a person is accepted ONLY as a silhouette (seen from behind or in shadow, face not visible); if a face can be recognised, set offTopic to true"],
  };
}

/** Mention ajoutée au crédit d'une photo libre : créée par l'IA (publiée sur la banque), silhouette. */
export function stockFlagsNote(c: { aiGenerated?: boolean; silhouette?: boolean }): string {
  return `${c.aiGenerated ? C(" — photo créée par l'IA (publiée sur la banque), pas une prise de vue réelle", " — AI-made photo (published on the stock library), not a real shot") : ""}${c.silhouette ? C(" — silhouette (personne de dos ou dans l'ombre, visage non visible)", " — silhouette (seen from behind or in shadow, face not visible)") : ""}`;
}
