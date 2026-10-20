/**
 * Accès aux thèmes. Depuis le 19 octobre (issue #137, commentaire 6264783184), le catalogue actif est réduit aux quatre
 * thèmes de référence (fraise, onde, orbe, rive). Les droits #150 sont appliqués par famille depuis plan-entitlements.ts, chacun pour sa catégorie
 * de projet. Les trente anciens thèmes ne sont plus sélectionnables ni recommandés ; `THEME_ORDER` les garde avec leur
 * rang historique pour lire les projets existants (un projet qui en utilise un le conserve : seule la sélection d'un
 * NOUVEAU thème retiré est refusée — contrôle côté serveur : choix, recomposition, chat, export).
 */
import { DIRECTIONS, type DirectionId } from "./directions";
import { isActiveThemeId, isReferenceThemeId, themeStatus as status } from "./theme-fit";
import { planAllowsTheme } from "../plan-entitlements";
import { PLANS, type PlanId } from "../plans";

/**
 * Ordre des 30 thèmes (1 → 30). Les 10 premiers sont des compositions déjà excellentes et sobres ; 11 à 20 ajoutent
 * des mises en page éditoriales et des sections plus riches ; 21 à 30 les compositions les plus immersives
 * (animations, narration, sections plein écran).
 */
export const THEME_ORDER: DirectionId[] = [
  // 1 à 10 — Créer
  "atelier", "clinique", "brut", "terroir", "nocturne", "pop", "galerie", "elan", "flux", "gourmand",
  // 11 à 20 — Développer
  "joaillerie", "vitrine", "magazine", "lookbook", "marche", "jardin", "reception", "cabinet", "recre", "epure",
  // 21 à 30 — Dominer
  "manifeste", "laboratoire", "cinema", "rituel", "horizon", "signal", "tribu", "etabli", "velours", "lancement",
  // 31 à 34 — Thèmes de référence (issue #137), droits par famille centralisés (#150).
  "fraise", "onde", "orbe", "rive",
];

/** Rang du thème (1 à 30), ou null s'il n'existe pas. */
export function themeRank(id: string): number | null {
  const i = THEME_ORDER.indexOf(id as DirectionId);
  return i >= 0 ? i + 1 : null;
}

/** Nombre de thèmes que le forfait peut sélectionner (0 sans forfait : prévisualisation seulement). */
export const themesFor = (plan: PlanId | null) => (plan ? PLANS[plan].themes : 0);

/** Statut d'un thème : actif (proposé), retiré (ancien catalogue, lecture seule) ou inconnu. */
export const themeStatus = (id: string) => status(id, themeRank(id) != null);

/** Le forfait permet-il de sélectionner ce thème ? Thèmes actifs autorisés par la grille de leur famille ; jamais un thème retiré. */
export function themeAllowed(plan: PlanId | null, id: string): boolean {
  return isActiveThemeId(id) && themeRank(id) != null && planAllowsTheme(plan, id);
}

/** Premier forfait qui ouvre ce thème (null pour un thème retiré ou inconnu). */
export function planForTheme(id: string): PlanId | null {
  return isReferenceThemeId(id) && themeRank(id) != null ? (["creer","vendre","dominer"] as PlanId[]).find(p=>planAllowsTheme(p,id)) ?? null : null;
}

/** Contrôle de cohérence : l'ordre couvre exactement les thèmes existants (30 du catalogue + 4 de référence). */
export function themeOrderComplete(): boolean {
  const all = new Set(DIRECTIONS.map((d) => d.id));
  return THEME_ORDER.length === all.size && THEME_ORDER.every((id) => all.has(id));
}
