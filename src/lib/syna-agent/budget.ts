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

/**
 * Le reste d'un accord donné sur la carte (essai réel du 16 novembre 2026 : juste après un site payé avec l'accord du
 * client, « Budget des réponses de SINA atteint » ; elle n'a pu ni présenter son site ni dire ses défauts).
 * Le client a accepté par écrit une dépense « au plus » : ce que la création n'a pas dépensé de ce plafond sert à en
 * rendre compte, dans la même demande, et rien d'autre. Création + compte rendu ne dépassent donc jamais le plafond
 * accepté ; aucune dépense non accordée n'est permise (sans carte acceptée dans la demande, le reste est nul).
 */
export function approvedRemainderMicro(conversationId: string, runId: string): number {
  const events = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND run_id=? AND role='event'", conversationId, runId)
    .map((m) => { try { return JSON.parse(m.content_json) as { kind?: string; pendingId?: string; pending?: { id?: string; reason?: string; costMaxMicro?: number } }; } catch { return {}; } });
  const approved = new Set(events.filter((e) => e.kind === "approved" && e.pendingId).map((e) => e.pendingId!));
  const ceiling = events.filter((e) => e.kind === "confirmation" && e.pending?.reason === "cost" && e.pending.id && approved.has(e.pending.id)).reduce((s, e) => s + Math.max(0, Number(e.pending!.costMaxMicro) || 0), 0);
  if (!ceiling) return 0;
  const spentOf = (kind: "agent" | "native") => all<{ job_id: string }>("SELECT job_id FROM syna_jobs WHERE conversation_id=? AND run_id=? AND kind=?", conversationId, runId, kind).reduce((s, j) => s + jobSpentMicro(j.job_id), 0);
  // Ce que les réponses ont déjà pris au-delà du budget des réponses (donc sur ce reste), compté une seule fois.
  const authorized = authorizedBudget(conversationId) ?? 0;
  const beyond = Math.min(spentOf("agent"), Math.max(0, conversationSpentMicro(conversationId, "agent") - authorized));
  return Math.max(0, ceiling - spentOf("native") - beyond);
}

/** Ce que SINA peut encore dépenser pour répondre dans cette demande : le budget des réponses, plus le reste d'un accord. */
export function replyAllowanceMicro(userId: string, projectId: string | null, conversationId: string, runId: string): number {
  return budgetState(userId, projectId, conversationId).remainingMicro + approvedRemainderMicro(conversationId, runId);
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
