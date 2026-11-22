/**
 * LES RÉGLAGES DU SUIVI DANS LA DURÉE (22 novembre 2026, recherche 08). Chaque fonction du suivi a son réglage
 * `suivi.<nom>`, qui se règle dans Administration (jamais écrit par le code).
 *
 * Allumées par défaut (décision du chef d'orchestre du 22 novembre 2026, au nom des engagements acceptés le 15 novembre,
 * référence partie 14) : l'assistante du site, la boîte des demandes triées et résumées (e-mail et « copier »), le
 * contrôle gratuit des photos et de la fidélité au produit, le guide de la fiche Google, le bras droit. « 0 » ou
 * « false » dans le réglage les éteint.
 *
 * Éteintes par défaut, allumées seulement par « 1 » ou « true » : les liens SMS et WhatsApp (tant que l'essai sur de vrais
 * téléphones n'est pas fait), le devis et le carnet de clients.
 *
 * « Ta journée est prête » et « le point du mois » (engagements 6 et 1) ne passent pas par ici : ils sont allumés.
 */
import { getSetting } from "../settings";

export const FONCTIONS_DU_SUIVI = {
  assistante: "L'assistante du site, qui se présente comme une IA (engagement 7)",
  demandes: "Les demandes triées et résumées, avec l'e-mail et « copier » (engagement 7)",
  envoiGeste: "Les liens SMS et WhatsApp pour répondre d'un geste (engagement 7)",
  studioPhoto: "Le contrôle gratuit des photos et de la fidélité au produit (engagements 2 et 8)",
  ficheGoogle: "Le guide de la fiche Google et les réponses aux avis (engagements 4 et 12)",
  devis: "Le devis contrôlé et sa page de signature (engagement 9)",
  carnet: "Le carnet de clients qui sépare « relation » et « offre » (engagements 11 et 12)",
  brasDroit: "Le bras droit qui informe sans consulter (engagement 17)",
} as const;
export type FonctionDuSuivi = keyof typeof FONCTIONS_DU_SUIVI;

/** Les fonctions allumées tant que l'administration n'a pas écrit « 0 » ou « false ». */
export const ALLUMEES_PAR_DEFAUT: ReadonlySet<FonctionDuSuivi> = new Set<FonctionDuSuivi>(["assistante", "demandes", "studioPhoto", "ficheGoogle", "brasDroit"]);

/** L'état d'une fonction : le réglage de l'administration s'il est écrit (« 1 »/« true » ou « 0 »/« false »), sinon son état par défaut. */
export function suiviAllume(nom: FonctionDuSuivi): boolean {
  const v = (getSetting(`suivi.${nom}`) ?? "").trim().toLowerCase();
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return ALLUMEES_PAR_DEFAUT.has(nom);
}
