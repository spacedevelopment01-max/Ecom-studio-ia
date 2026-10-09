/**
 * Accès aux fonctions « sur mesure » du thème, selon le forfait (source de vérité : PLANS[plan].theme) :
 *  - Créer (« composed ») : thème composé avec la bibliothèque de sections ;
 *  - Vendre (« custom-sections ») : en plus, sections sur mesure écrites par l'IA (« Générer ») ;
 *  - Dominer (« fully-custom ») : en plus, thème entièrement sur mesure (chaque section écrite par l'IA).
 * L'administrateur n'est jamais bloqué. Messages clairs, sans crédits ni euros d'IA.
 */
import { HttpError, type User } from "../auth";
import { one } from "../db";
import { currentPeriod, getSubscription, planOf } from "../billing";
import { CUSTOM_THEMES_PER_MONTH, PLANS, type PlanId } from "../plans";
import { L } from "../i18n-server";

export { CUSTOM_THEMES_PER_MONTH };

const planFor = (user: Pick<User, "id" | "role">): PlanId | null => planOf(getSubscription(user.id));

/** Génération d'une section par l'IA : forfaits Vendre et Dominer. */
export function sectionGenerationAllowed(user: Pick<User, "id" | "role">): boolean {
  const plan = planFor(user);
  return !!plan && PLANS[plan].theme !== "composed";
}

export function assertSectionGeneration(user: Pick<User, "id" | "role">) {
  if (sectionGenerationAllowed(user)) return;
  throw new HttpError(
    402,
    L(
      "Les sections sur mesure écrites par l'IA sont incluses dans les forfaits Vendre et Dominer. Vous pouvez ajouter toutes les sections de la bibliothèque, ou changer de forfait dans « Mon compte ».",
      "Custom sections written by AI are included in the Sell and Dominate plans. You can add any section from the library, or change your plan in “My account”.",
    ),
    "plan_required",
  );
}

/** Thèmes entièrement sur mesure lancés ce mois-ci (tâches en cours, en pause ou terminées ; les échecs et annulations ne comptent pas). */
export function customThemesUsed(userId: string): number {
  const { start } = currentPeriod(userId);
  return one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE user_id = ? AND type = 'theme.custom' AND created_at >= ? AND status NOT IN ('failed','cancelled')", userId, start)!.n;
}

export type CustomThemeAccess = { allowed: boolean; blocked: "plan" | "limit" | null; reason: string | null; used: number; limit: number; renewsAt: number };

export function customThemeAccess(user: Pick<User, "id" | "role">): CustomThemeAccess {
  const plan = planFor(user);
  const used = customThemesUsed(user.id);
  const renewsAt = currentPeriod(user.id).end;
  if (!plan || PLANS[plan].theme !== "fully-custom") {
    return {
      allowed: false,
      blocked: "plan",
      reason: L("Le thème entièrement sur mesure est inclus dans le forfait Dominer. Changez de forfait dans « Mon compte ».", "The fully custom theme is included in the Dominate plan. Change your plan in “My account”."),
      used,
      limit: CUSTOM_THEMES_PER_MONTH,
      renewsAt,
    };
  }
  if (used >= CUSTOM_THEMES_PER_MONTH) {
    const end = new Date(renewsAt).toLocaleDateString(L("fr-FR", "en-GB"), { day: "numeric", month: "long" });
    return {
      allowed: false,
      blocked: "limit",
      reason: L(
        `Vous avez déjà créé ${CUSTOM_THEMES_PER_MONTH} thèmes entièrement sur mesure ce mois-ci. Vous pourrez en créer un nouveau le ${end}. D'ici là, retouchez votre thème par la discussion.`,
        `You've already created ${CUSTOM_THEMES_PER_MONTH} fully custom themes this month. You can create a new one on ${end}. Until then, refine your theme through the chat.`,
      ),
      used,
      limit: CUSTOM_THEMES_PER_MONTH,
      renewsAt,
    };
  }
  return { allowed: true, blocked: null, reason: null, used, limit: CUSTOM_THEMES_PER_MONTH, renewsAt };
}

/** Refus clair (402) hors forfait Dominer ou au-delà de la limite mensuelle. */
export function assertFullyCustomTheme(user: Pick<User, "id" | "role">) {
  const a = customThemeAccess(user);
  if (!a.allowed) throw new HttpError(402, a.reason!, a.blocked === "limit" ? "limit_reached" : "plan_required");
}
