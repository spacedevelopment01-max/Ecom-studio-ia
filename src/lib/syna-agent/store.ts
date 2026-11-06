/** Fil SYNA : messages (client, SYNA, résultats d'outils), exécutions reprenables, pièces jointes, changements, budget. */
import { all, id, json, now, one, run, tx } from "../db";
import type { Change } from "./types";

export type SynaRole = "user" | "assistant" | "tool" | "event";
export type SynaMessage = { id: string; seq: number; role: SynaRole; runId: string | null; content: any; createdAt: number };
export type RunStatus = "queued" | "running" | "waiting_jobs" | "waiting_confirmation" | "waiting_user" | "done" | "failed" | "cancelled";
export type SynaRun = {
  id: string; conversation_id: string; user_id: string; project_id: string | null; request_id: string; status: RunStatus;
  step: number; pending_json: string | null; waiting_jobs: string; job_id: string | null; error: string | null; created_at: number; updated_at: number;
};
/** Action en attente d'accord : exactement les arguments validés, jamais réinterprétés. */
export type PendingAction = { id: string; tool: string; args: unknown; reason: "sensitive" | "budget"; preview: string; costMaxMicro?: number; createdAt: number };

export function addMessage(conversationId: string, role: SynaRole, content: unknown, runId: string | null = null): SynaMessage {
  return tx(() => {
    const seq = (one<{ s: number }>("SELECT MAX(seq) s FROM syna_messages WHERE conversation_id=?", conversationId)?.s ?? 0) + 1;
    const m = { id: id(), seq, role, runId, content, createdAt: now() };
    run("INSERT INTO syna_messages(id,conversation_id,seq,role,run_id,content_json,created_at) VALUES(?,?,?,?,?,?,?)", m.id, conversationId, seq, role, runId, JSON.stringify(content), m.createdAt);
    run("UPDATE agent_conversations SET updated_at=? WHERE id=?", m.createdAt, conversationId);
    return m;
  });
}

export function messages(conversationId: string, afterSeq = 0, limit = 400): SynaMessage[] {
  return all<{ id: string; seq: number; role: SynaRole; run_id: string | null; content_json: string; created_at: number }>(
    "SELECT * FROM syna_messages WHERE conversation_id=? AND seq>? ORDER BY seq LIMIT ?", conversationId, afterSeq, limit,
  ).map((r) => ({ id: r.id, seq: r.seq, role: r.role, runId: r.run_id, content: json(r.content_json, {}), createdAt: r.created_at }));
}

export function lastMessages(conversationId: string, limit: number): SynaMessage[] {
  return all<{ id: string; seq: number; role: SynaRole; run_id: string | null; content_json: string; created_at: number }>(
    "SELECT * FROM (SELECT * FROM syna_messages WHERE conversation_id=? ORDER BY seq DESC LIMIT ?) ORDER BY seq", conversationId, limit,
  ).map((r) => ({ id: r.id, seq: r.seq, role: r.role, runId: r.run_id, content: json(r.content_json, {}), createdAt: r.created_at }));
}

export const getRun = (rid: string) => one<SynaRun>("SELECT * FROM syna_runs WHERE id=?", rid);
export const activeRun = (cid: string) => one<SynaRun>("SELECT * FROM syna_runs WHERE conversation_id=? AND status IN ('queued','running','waiting_jobs','waiting_confirmation') ORDER BY created_at DESC LIMIT 1", cid);
export const runByRequest = (cid: string, requestId: string) => one<SynaRun>("SELECT * FROM syna_runs WHERE conversation_id=? AND request_id=?", cid, requestId);

export function createRun(input: { conversationId: string; userId: string; projectId: string | null; requestId: string }): SynaRun {
  const t = now(), rid = id();
  run("INSERT INTO syna_runs(id,conversation_id,user_id,project_id,request_id,status,created_at,updated_at) VALUES(?,?,?,?,?,'queued',?,?)", rid, input.conversationId, input.userId, input.projectId, input.requestId, t, t);
  return getRun(rid)!;
}

export function updateRun(rid: string, patch: Partial<Pick<SynaRun, "status" | "step" | "pending_json" | "waiting_jobs" | "job_id" | "error">>) {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (!keys.length) return;
  run(`UPDATE syna_runs SET ${keys.map((k) => `${k}=?`).join(",")},updated_at=? WHERE id=?`, ...keys.map((k) => patch[k] ?? null), now(), rid);
}

export function pendingOf(r: SynaRun): PendingAction | null {
  return r.pending_json ? json<PendingAction | null>(r.pending_json, null) : null;
}

export function recordChanges(conversationId: string, runId: string, tool: string, changes: Change[]) {
  for (const c of changes)
    run("INSERT INTO syna_changes(id,conversation_id,run_id,module,tool,object,summary,before_json,after_json,verified,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      id(), conversationId, runId, c.module, tool, c.object, c.summary, c.before === undefined ? null : JSON.stringify(c.before), c.after === undefined ? null : JSON.stringify(c.after), c.verified ? 1 : 0, now());
}

export function changesOf(conversationId: string, runId?: string) {
  return all<{ id: string; run_id: string; module: string; tool: string; object: string; summary: string; before_json: string | null; after_json: string | null; verified: number; created_at: number }>(
    `SELECT * FROM syna_changes WHERE conversation_id=? ${runId ? "AND run_id=?" : ""} ORDER BY created_at`, conversationId, ...(runId ? [runId] : []),
  ).map((c) => ({ id: c.id, runId: c.run_id, module: c.module, tool: c.tool, object: c.object, summary: c.summary, before: json(c.before_json, null), after: json(c.after_json, null), verified: !!c.verified, at: c.created_at }));
}

export function authorizedBudget(conversationId: string): number | null {
  return one<{ authorized_micro: number }>("SELECT authorized_micro FROM syna_budgets WHERE conversation_id=?", conversationId)?.authorized_micro ?? null;
}

export function setAuthorizedBudget(conversationId: string, micro: number) {
  run("INSERT INTO syna_budgets(conversation_id,authorized_micro,updated_at) VALUES(?,?,?) ON CONFLICT(conversation_id) DO UPDATE SET authorized_micro=excluded.authorized_micro,updated_at=excluded.updated_at", conversationId, Math.max(0, Math.round(micro)), now());
}
