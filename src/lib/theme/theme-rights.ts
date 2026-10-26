/**
 * Droits d'accès aux thèmes, par thème et par forfait (mission #190) — remplacent les quotas « 1, 3 ou 5 thèmes par
 * famille » et le classement des thèmes en familles pour le choix et l'accès.
 *
 * Thomas choisira plus tard les thèmes ouverts aux forfaits à 49 € (Créer) et 89 € (Développer) : tant qu'un forfait
 * n'a pas reçu sa liste (`plans[plan]` absent ou null), AUCUNE répartition n'est inventée — tous les thèmes proposés lui
 * restent ouverts, et l'administration le signale (« Répartition à choisir »). Le forfait Dominer (129 €) ouvre tous les
 * thèmes proposés tant qu'aucune liste ne lui est donnée.
 *
 * Module pur (aucun accès à la base) : il est aussi lu par l'interface. La lecture et l'enregistrement du réglage sont
 * dans theme-rights-store.ts, côté serveur.
 */
import type { PlanId } from "../plans";
import { isActiveThemeId, ACTIVE_THEMES } from "./theme-fit";

export const PLAN_IDS: readonly PlanId[] = ["creer", "vendre", "dominer"];

/** Réglage « themes.rights » : liste des thèmes ouverts à chaque forfait ; null ou absent = répartition à choisir. */
export type ThemeRights = { plans: Partial<Record<PlanId, string[] | null>>; updatedAt?: number; updatedBy?: string };

export const DEFAULT_THEME_RIGHTS: ThemeRights = { plans: {} };

/** Forfaits dont la liste n'a pas encore été choisie (tous les thèmes proposés leur restent ouverts en attendant). */
export const undecidedPlans = (rights: ThemeRights = DEFAULT_THEME_RIGHTS): PlanId[] => PLAN_IDS.filter((p) => !Array.isArray(rights.plans[p]));

/** Thèmes ouverts à un forfait : sa liste choisie (thèmes proposés seulement), ou tous les thèmes proposés. */
export function themesOpenTo(plan: PlanId, rights: ThemeRights = DEFAULT_THEME_RIGHTS): string[] {
  const list = rights.plans[plan];
  return Array.isArray(list) ? ACTIVE_THEMES.filter((id) => list.includes(id)) : [...ACTIVE_THEMES];
}

/** Le forfait ouvre-t-il ce thème ? Jamais sans forfait, jamais un thème qui n'est pas proposé au catalogue. */
export function planOpensTheme(plan: PlanId | null, themeId: string, rights: ThemeRights = DEFAULT_THEME_RIGHTS): boolean {
  return !!plan && isActiveThemeId(themeId) && themesOpenTo(plan, rights).includes(themeId);
}

/** Forfaits qui ouvrent ce thème (dans l'ordre des prix). */
export const plansOpening = (themeId: string, rights: ThemeRights = DEFAULT_THEME_RIGHTS): PlanId[] => PLAN_IDS.filter((p) => planOpensTheme(p, themeId, rights));

/** Nettoie un réglage reçu : identifiants connus et proposés seulement, sans doublon ; null garde « à choisir ». */
export function normalizeThemeRights(input: { plans?: Partial<Record<string, unknown>> }): ThemeRights {
  const plans: ThemeRights["plans"] = {};
  for (const p of PLAN_IDS) {
    const v = input.plans?.[p];
    if (v === null || v === undefined) continue;
    if (!Array.isArray(v)) continue;
    plans[p] = ACTIVE_THEMES.filter((id) => v.includes(id));
  }
  return { plans };
}
