/**
 * Coûts d'IA en % du budget du mois du compte (côté serveur) : devis, messages des tâches, notifications. Jamais
 * d'euros montrés au client (règle du propriétaire) ; même base que la jauge « Reste … % » (`aiPctBaseMicro`).
 */
import { aiPctBaseMicro } from "../billing";
import { accountKeyFor } from "../project-billing";
import { formatBudgetPct, formatPct, pctOfBudget, pctToMicro } from "../budget-pct";
import { L } from "../i18n-server";

/** Base des % pour ce compte (abonnement du projet s'il y en a un). */
export const pctBaseFor = (userId: string, projectId?: string | null): number => aiPctBaseMicro(accountKeyFor(userId, projectId));

/** Part d'un coût dans le budget du mois, en % (null sans budget). */
export const budgetPctOf = (userId: string, micro: number, projectId?: string | null) => pctOfBudget(micro, pctBaseFor(userId, projectId));

/** « ≈ 3 % de votre budget IA » dans la langue de la demande. */
export const budgetPctText = (userId: string, micro: number, projectId?: string | null) => formatBudgetPct(budgetPctOf(userId, micro, projectId), L("fr", "en") as "fr" | "en");

/**
 * La même part, dite en tutoyant (« ≈ 3 % de ton budget IA ») : SINA tutoie le client partout, cartes d'accord comprises
 * (essai réel « Les essais complets », Nadia, 22 novembre 2026 : la carte de dépense vouvoyait).
 */
export const budgetPctTu = (userId: string, micro: number, projectId?: string | null) => tutoie(budgetPctText(userId, micro, projectId));
/**
 * LE COÛT PROBABLE, SEUL CHIFFRE MONTRÉ AU CLIENT (26 novembre 2026, ses mots : « Il faut arrêter de montrer des plafond
 * aussi haut ça va faire peur aux clients ») : « environ 18 % de ton budget IA du mois », en tutoyant. Ni « au plus », ni
 * fourchette, ni pire cas. Sans budget connu : « une part de ton budget IA du mois ».
 */
export function coutProbableTu(userId: string, micro: number, projectId?: string | null): string {
  const pct = budgetPctOf(userId, micro, projectId), fr = L("fr", "en") === "fr";
  if (pct == null) return fr ? "une part de ton budget IA du mois" : "part of your monthly AI budget";
  const v = formatPct(pct, fr ? "fr" : "en");
  if (v.startsWith("<")) return fr ? `moins de ${v.slice(2)} de ton budget IA du mois` : `less than ${v.slice(2)} of your monthly AI budget`;
  return fr ? `environ ${v} de ton budget IA du mois` : `about ${v} of your monthly AI budget`;
}

/** Les mots du budget dits en tutoyant. */
export const tutoie = (t: string) => t.replace(/\bde votre budget\b/g, "de ton budget").replace(/\bsur votre budget\b/g, "sur ton budget");

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
