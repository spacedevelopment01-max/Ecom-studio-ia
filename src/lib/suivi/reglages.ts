/**
 * LES RÉGLAGES DU SUIVI DANS LA DURÉE (22 novembre 2026, recherche 08). Une fonction nouvelle qui montre quelque chose
 * au client se construit, mais reste ÉTEINTE tant que le propriétaire n'a pas dit oui : chacune a son réglage
 * `suivi.<nom>`, éteint par défaut, qui ne s'allume que dans Administration (jamais par le code).
 *
 * « Ta journée est prête » et « le point du mois » (engagements 6 et 1, acceptés le 15 novembre 2026) ne passent pas par
 * ici : ils sont allumés (décision relayée par le chef d'orchestre le 22 novembre 2026).
 */
import { getSetting } from "../settings";

export const FONCTIONS_DU_SUIVI = {
  assistante: "L'assistante du site, qui se présente comme une IA (engagement 7)",
  envoiGeste: "Les réponses prêtes envoyées d'un geste : SMS, WhatsApp, e-mail (engagement 7)",
  studioPhoto: "Le studio photo qui garde le vrai produit (engagements 2 et 8)",
  ficheGoogle: "Le guide de la fiche Google et les réponses aux avis (engagements 4 et 12)",
  devis: "Le devis contrôlé et sa page de signature (engagement 9)",
  carnet: "Le carnet de clients qui sépare « relation » et « offre » (engagements 11 et 12)",
  brasDroit: "Le bras droit qui informe sans consulter (engagement 17)",
} as const;
export type FonctionDuSuivi = keyof typeof FONCTIONS_DU_SUIVI;

/** Allumée seulement si l'administration a écrit « 1 » (ou « true ») dans `suivi.<nom>`. Éteinte sinon. */
export function suiviAllume(nom: FonctionDuSuivi): boolean {
  const v = (getSetting(`suivi.${nom}`) ?? "").trim().toLowerCase();
  return v === "1" || v === "true";
}
