/**
 * Budget autorisé du fil SINA : il couvre les RÉPONSES de SINA (ses pas de réflexion). Chaque création payante (identités,
 * logos, angles, thème, photos…) passe en plus par la carte d'accord du client (prix d'abord, accord écrit) : son coût
 * n'entame pas ce budget, sinon SINA ne pourrait plus répondre après une création approuvée.
 */
import { all, now, one, run } from "../db";
import { budgetPctOf, pctBaseFor } from "../ai/budget-pct";
import { pctToMicro } from "../budget-pct";
import { authorizedBudget, setAuthorizedBudget } from "./store";

/** Dépense engagée d'une tâche : mêmes règles que le plafond natif (réservations, usages, appels). */
export function jobSpentMicro(jobId: string): number {
  return one<{ c: number }>(`SELECT
    COALESCE((SELECT SUM(CASE WHEN status='held' THEN amount ELSE COALESCE(actual,amount) END)
      FROM ai_reservations WHERE job_id=? AND status IN ('held','settled','uncertain','reconciled') AND usage_event_id IS NULL),0)
    + COALESCE((SELECT SUM(billed) FROM usage_events WHERE job_id=?),0)
    + COALESCE((SELECT SUM(cost) FROM ai_calls WHERE job_id=? AND usage_event_id IS NULL AND billing_dedup=0 AND status='ok'),0) AS c`, jobId, jobId, jobId)?.c ?? 0;
}

export function trackJob(conversationId: string, runId: string, jobId: string, kind: "agent" | "native") {
  run("INSERT OR IGNORE INTO syna_jobs(conversation_id,job_id,run_id,kind,created_at) VALUES(?,?,?,?,?)", conversationId, jobId, runId, kind, now());
}

export function conversationSpentMicro(conversationId: string, kind?: "agent" | "native"): number {
  return all<{ job_id: string }>(`SELECT job_id FROM syna_jobs WHERE conversation_id=?${kind ? " AND kind=?" : ""}`, ...(kind ? [conversationId, kind] : [conversationId])).reduce((s, j) => s + jobSpentMicro(j.job_id), 0);
}

/** Budget par défaut des réponses de SINA : 10 % du budget IA du forfait, modifiable par le client dans le fil. */
export const DEFAULT_BUDGET_PCT = 10;

export function budgetState(userId: string, projectId: string | null, conversationId: string) {
  const authorized = authorizedBudget(conversationId);
  const spent = conversationSpentMicro(conversationId);
  const replies = conversationSpentMicro(conversationId, "agent");
  const pct = (m: number | null) => (m == null ? null : budgetPctOf(userId, m, projectId));
  return { authorizedMicro: authorized, spentMicro: spent, remainingMicro: authorized == null ? 0 : Math.max(0, authorized - replies), authorizedPct: pct(authorized), spentPct: pct(spent) };
}

/** Le client fixe son budget en % du budget IA de son forfait (conversion par le barème natif). */
export function authorizeBudgetPct(userId: string, projectId: string | null, conversationId: string, pct: number) {
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new Error("budget_pct_invalid");
  const micro = pctToMicro(pct, pctBaseFor(userId, projectId));
  if (micro == null || !Number.isFinite(micro)) throw new Error("budget_unavailable");
  setAuthorizedBudget(conversationId, micro);
  return budgetState(userId, projectId, conversationId);
}
