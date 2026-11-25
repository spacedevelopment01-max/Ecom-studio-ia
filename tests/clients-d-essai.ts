/**
 * Les clients inventés des essais simulés des scripts d'essai (scripts/syna-recette/). Racine n'est qu'un exemple de test :
 * les scripts n'ont aucun client par défaut. Écume est lu dans le fichier donné aux scripts (clients/ecume.json).
 */
import { clientDeLEssai, type ClientDeLEssai } from "../scripts/syna-recette/client-de-l-essai";

/** L'exemple de test des premiers essais (pépiniériste), donné explicitement à chaque essai simulé. */
export const RACINE: ClientDeLEssai = { nom: "Racine", metier: "pépiniériste qui vend des plantes en ligne", kind: "produits", produits: ["plantes d'intérieur", "arbustes", "jeunes arbres"], descripteur: null };

export const FICHIER_ECUME = "scripts/syna-recette/clients/ecume.json";
/** Écume, savonnerie artisanale, telle que les scripts la lisent (CLIENT_JSON). */
export const ECUME: ClientDeLEssai = clientDeLEssai({ CLIENT_JSON: FICHIER_ECUME });

/** Aucune trace de Racine (ni de son métier) dans un texte envoyé à l'IA. */
export const sansRacine = (t: string) => !/Racine|RACINE|racine-officiel|racine\.(fr|com)|[Pp]épini|[Pp]epini|plantes? d'intérieur|arbustes|jeunes arbres/.test(t);
