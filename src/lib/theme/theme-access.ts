/**
 * Accès aux thèmes. Le catalogue proposé est limité aux thèmes refaits d'après les maquettes de Thomas (mission #190,
 * theme-fit.ts) ; les droits sont réglés par thème et par forfait (theme-rights.ts), sans aucune famille. Les trente anciens thèmes ne sont plus sélectionnables ni recommandés ; `THEME_ORDER` les garde avec leur
 * rang historique pour lire les projets existants (un projet qui en utilise un le conserve : seule la sélection d'un
 * NOUVEAU thème retiré est refusée — contrôle côté serveur : choix, recomposition, chat, export).
 */
import { DIRECTIONS, type DirectionId } from "./directions";
import { isActiveThemeId, isReferenceThemeId, themeStatus as status } from "./theme-fit";
import { planAllowsTheme } from "../plan-entitlements";
import { DEFAULT_THEME_RIGHTS, plansOpening, type ThemeRights } from "./theme-rights";
import type { PlanId } from "../plans";

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
  // 31 à 41 — Thèmes de référence (issue #137, SILLON : issue #148, NOCTIL et TRAVERSE : issue #152, HEUREN et ALCÔVE :
  // issue #155, MUSEAU CLUB et SOUPLE : issue #158), droits par thème et par forfait depuis la mission #190 (theme-rights.ts).
  "fraise", "onde", "orbe", "rive", "sillon", "noctil", "traverse", "heuren", "alcove", "museau-club", "souple",
  // 42 — TABLE SAISON (issue #175), restaurant de la famille Services.
  "table-saison",
  // 43 — ATELIER NUANCE (issue #177), salon de coiffure de la famille Services.
  "atelier-nuance",
  // 44 — PARENTHÈSE (PR #179), cabinet de sophrologie de la famille Services.
  "parenthese",
  // 45 — PHASE — Électricité (PR documentaire #188), artisan électricien de la famille Services.
  "phase",
  // 46 et 47 — MAISON & HORIZON (issue #172) et APLAT (PR #187), famille Services.
  "maison-horizon", "aplat",
];

/** Rang du thème (1 à 30), ou null s'il n'existe pas. */
export function themeRank(id: string): number | null {
  const i = THEME_ORDER.indexOf(id as DirectionId);
  return i >= 0 ? i + 1 : null;
}

/** Statut d'un thème : actif (proposé), retiré (ancien catalogue, lecture seule) ou inconnu. */
export const themeStatus = (id: string) => status(id, themeRank(id) != null);

/** Le forfait permet-il de sélectionner ce thème ? Thème proposé et ouvert à ce forfait (droits par thème) ; jamais un thème retiré. */
export function themeAllowed(plan: PlanId | null, id: string, rights: ThemeRights = DEFAULT_THEME_RIGHTS): boolean {
  return isActiveThemeId(id) && themeRank(id) != null && planAllowsTheme(plan, id, rights);
}

/** Forfaits qui ouvrent ce thème, du moins cher au plus cher (vide pour un thème retiré ou inconnu). */
export function plansForTheme(id: string, rights: ThemeRights = DEFAULT_THEME_RIGHTS): PlanId[] {
  return isReferenceThemeId(id) && themeRank(id) != null ? plansOpening(id, rights) : [];
}

/** Premier forfait qui ouvre ce thème (null pour un thème retiré, inconnu ou fermé à tous les forfaits). */
export function planForTheme(id: string, rights: ThemeRights = DEFAULT_THEME_RIGHTS): PlanId | null {
  return plansForTheme(id, rights)[0] ?? null;
}

/** Contrôle de cohérence : l'ordre couvre exactement les thèmes existants (30 du catalogue + 11 de référence). */
export function themeOrderComplete(): boolean {
  const all = new Set(DIRECTIONS.map((d) => d.id));
  return THEME_ORDER.length === all.size && THEME_ORDER.every((id) => all.has(id));
}
