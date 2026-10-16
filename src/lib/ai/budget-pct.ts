/**
 * Coûts d'IA en % du budget du mois du compte (côté serveur) : devis, messages des tâches, notifications. Jamais
 * d'euros montrés au client (règle du propriétaire) ; même base que la jauge « Reste … % » (`aiPctBaseMicro`).
 */
import { aiPctBaseMicro } from "../billing";
import { accountKeyFor } from "../project-billing";
import { formatBudgetPct, pctOfBudget, pctToMicro } from "../budget-pct";
import { L } from "../i18n-server";

/** Base des % pour ce compte (abonnement du projet s'il y en a un). */
export const pctBaseFor = (userId: string, projectId?: string | null): number => aiPctBaseMicro(accountKeyFor(userId, projectId));

/** Part d'un coût dans le budget du mois, en % (null sans budget). */
export const budgetPctOf = (userId: string, micro: number, projectId?: string | null) => pctOfBudget(micro, pctBaseFor(userId, projectId));

/** « ≈ 3 % de votre budget IA » dans la langue de la demande. */
export const budgetPctText = (userId: string, micro: number, projectId?: string | null) => formatBudgetPct(budgetPctOf(userId, micro, projectId), L("fr", "en") as "fr" | "en");

/**
 * Reprise débitée (le contrôle a refusé le 1er essai) : le client en est averti, avec ce que la création a coûté en
 * tout (% du budget IA). null : un seul essai, rien à annoncer.
 */
export function retryNotice(userId: string, projectId: string | null | undefined, attempts: number, totalMicro: number): string | null {
  if (!(attempts > 1)) return null;
  const pct = budgetPctText(userId, totalMicro, projectId);
  return attempts === 2
    ? L(`Une 2e image a été nécessaire (la 1re a été refusée par le contrôle) : ${pct} au total.`, `A 2nd image was needed (the 1st was rejected by the check): ${pct} in total.`)
    : L(`${attempts} images ont été nécessaires (les précédentes ont été refusées par le contrôle) : ${pct} au total.`, `${attempts} images were needed (the previous ones were rejected by the check): ${pct} in total.`);
}

/** Plafond saisi en % du budget → micro-euros. */
export const capPctToMicro = (userId: string, pct: number, projectId?: string | null) => pctToMicro(pct, pctBaseFor(userId, projectId));
