/**
 * Bibliothèque des 30 thèmes, rangée par forfait : Créer utilise les 10 premiers, Développer les 20 premiers,
 * Dominer les 30. La galerie montre les 30 (et la découverte gratuite les prévisualise tous) ; seuls ceux du forfait
 * du projet sont sélectionnables — contrôle côté serveur (choix, recomposition, chat, export).
 * Un projet qui garde un thème hors de son forfait (après un changement de forfait à la baisse) le conserve : seule
 * la sélection d'un NOUVEAU thème hors forfait est refusée.
 */
import { DIRECTIONS, type DirectionId } from "./directions";
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
];

/** Rang du thème (1 à 30), ou null s'il n'existe pas. */
export function themeRank(id: string): number | null {
  const i = THEME_ORDER.indexOf(id as DirectionId);
  return i >= 0 ? i + 1 : null;
}

/** Nombre de thèmes que le forfait peut sélectionner (0 sans forfait : prévisualisation seulement). */
export const themesFor = (plan: PlanId | null) => (plan ? PLANS[plan].themes : 0);

/** Le forfait permet-il de sélectionner ce thème ? */
export function themeAllowed(plan: PlanId | null, id: string): boolean {
  const r = themeRank(id);
  return r != null && r <= themesFor(plan);
}

/** Premier forfait qui ouvre ce thème. */
export function planForTheme(id: string): PlanId | null {
  const r = themeRank(id);
  if (r == null) return null;
  return (["creer", "vendre", "dominer"] as PlanId[]).find((p) => r <= PLANS[p].themes) ?? null;
}

/** Contrôle de cohérence : l'ordre couvre exactement les 30 thèmes existants. */
export function themeOrderComplete(): boolean {
  const all = new Set(DIRECTIONS.map((d) => d.id));
  return THEME_ORDER.length === all.size && THEME_ORDER.every((id) => all.has(id));
}
