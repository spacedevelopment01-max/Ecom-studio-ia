/**
 * L'HONNÊTETÉ SUR LA DÉPENSE (26 novembre 2026). Ses mots : « Il faut arrêter de montrer des plafond aussi haut ça va faire
 * peur aux clients ». La carte d'accord n'annonce plus que le coût probable (« environ 18 % de ton budget IA du mois ») ;
 * le plafond reste en coulisses, chaque appel est réservé avant de partir.
 *
 * En échange, SINA ne dépasse jamais en silence : si une tâche allait dépasser le double de ce qui a été annoncé, elle
 * s'arrête avant l'appel suivant (src/lib/ai/trace.ts, `DepassementDeLAnnonce`), le worker la met en attente, et le Studio
 * écrit lui-même la phrase de SINA, sans appel payant : où elle en est, puis s'il veut continuer. Oui : la tâche reprend là
 * où elle s'est arrêtée (jobs.ts, `leverLAttenteDAccord`). Non : elle est arrêtée, ce qui est fait est gardé.
 */
import { coutProbableTu } from "../ai/budget-pct";
import { L } from "../i18n-server";

/** L'action de la carte « je continue ? » : réservée au Studio, jamais un outil que SINA peut appeler elle-même. */
export const TRAVAIL_CONTINUER = "travail.continuer";

/**
 * La phrase de SINA, une seule, claire, tutoyée, sans mot technique : ce que le travail a déjà pris, ce qui avait été
 * annoncé, ce qui est gardé, et la question.
 */
export function phraseDuDepassement(userId: string, projectId: string | null, a: { depenseMicro: number; annonceMicro: number }): string {
  const deja = coutProbableTu(userId, a.depenseMicro, projectId), annonce = coutProbableTu(userId, a.annonceMicro, projectId);
  return L(
    `Ce travail me demande plus que prévu : il a déjà pris ${deja}, alors que je t'avais annoncé ${annonce} ; je me suis arrêtée avant d'aller plus loin, ce qui est fait est gardé, et je continue seulement si tu me dis oui : tu veux que je continue ?`,
    `This work is taking more than planned: it has already used ${deja}, while I had announced ${annonce}; I stopped before going further, what is done is kept, and I only go on if you say yes: do you want me to continue?`,
  );
}

/** Le texte de la carte : ce que fait le oui (aucun plafond, aucun pire cas). */
export function previewDeLaSuite(): string {
  return L(
    "Continuer ce travail là où je me suis arrêtée. Ce qui est fait est gardé ; si la suite devait encore coûter bien plus que prévu, je m'arrête de nouveau et je te demande.",
    "Continue this work where I stopped. What is done is kept; if the rest were to cost much more again, I stop again and ask you.",
  );
}
