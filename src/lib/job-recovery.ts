/**
 * Reprise d'une tâche interrompue (worker arrêté ou tué) PENDANT un appel payant : une réservation de budget est
 * encore ouverte, le fournisseur a donc pu facturer sans que le résultat arrive. La tâche n'est jamais relancée
 * d'office (ce serait payer deux fois sans l'accord du client) : la réservation est réglée comme incertaine (coût
 * maximal retenu, rendu après réconciliation avec la facture du fournisseur) et la tâche échoue avec une explication.
 * Les étapes terminées restent enregistrées : « Réessayer » reprend à partir de là, avec l'accord du client.
 */
import { settleUncertain } from "./billing";
import { all } from "./db";
import { failJob, PermanentError, type Job } from "./jobs";
import { L } from "./i18n-server";

/** Vrai si la tâche était interrompue pendant un appel payant (et a donc été arrêtée ici). */
export function stopInterruptedPaidJob(job: Job): boolean {
  const held = all<{ id: string }>("SELECT id FROM ai_reservations WHERE job_id = ? AND status = 'held'", job.id);
  if (!held.length) return false;
  for (const r of held) settleUncertain(r.id, "tâche interrompue pendant l'appel (worker arrêté)");
  failJob(
    job,
    new PermanentError(
      L(
        "Interrompue pendant un appel IA payant (le traitement s'est arrêté avant l'arrivée du résultat). Par prudence, le coût maximal a été compté ; il est rendu après réconciliation avec la facture du fournisseur. Les étapes terminées sont gardées : « Réessayer » reprend à partir de là.",
        'Interrupted during a paid AI call (processing stopped before the result arrived). For safety the maximum cost was counted; it is refunded once reconciled with the provider\'s invoice. Completed steps are kept: "Retry" resumes from there.',
      ),
    ),
  );
  return true;
}
