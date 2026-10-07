/**
 * Trace des appels aux fournisseurs (observabilité) : une ligne `ai_calls` par appel réellement envoyé, reprises
 * comprises. Le contexte (tâche de fond, étape, candidat, tentative) suit le code asynchrone sans changer les
 * signatures : `ctx.step()` ouvre l'étape, `withCandidate()` précise le candidat évalué.
 *
 * Ce qui n'est JAMAIS enregistré : texte du prompt, images, clés, jetons d'accès. Seuls la clé du prompt système
 * et son empreinte le sont.
 */
import { redact } from "../redact";
import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import { id, now, run } from "../db";

export type TraceScope = {
  jobId?: string | null;
  projectId?: string | null;
  step?: string;
  candidateId?: string;
  attempt?: number;
  /** Orchestration (phase 3A) : intention(s) de la demande, plan et étape en cours, routage choisi pour l'étape. */
  intent?: string;
  planId?: string;
  stepId?: string;
  routing?: { reason: string; fallback: boolean; escalation: boolean };
};
const store = new AsyncLocalStorage<TraceScope>();

export function currentTrace(): TraceScope {
  return store.getStore() ?? {};
}

/** Exécute `fn` dans un contexte de trace (fusionné avec le contexte courant ; les étapes s'imbriquent en « a/b »). */
export function withTrace<T>(scope: TraceScope, fn: () => Promise<T>): Promise<T> {
  const cur = currentTrace();
  const step = scope.step ? (cur.step ? `${cur.step}/${scope.step}` : scope.step) : cur.step;
  return store.run({ ...cur, ...scope, step }, fn);
}

/** Candidat évalué (piste de logo, image…) et sa tentative : les appels faits dans `fn` lui sont rattachés. */
export function withCandidate<T>(candidateId: string, attempt: number, fn: () => Promise<T>): Promise<T> {
  return store.run({ ...currentTrace(), candidateId, attempt }, fn);
}

/** Empreinte courte d'un texte (version de fait d'un prompt système), sans le conserver. */
export const shortHash = (text: string) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);

/** Masque les secrets connus dans un texte destiné aux journaux (clés API, jetons, paramètres « key= »). */
export { redact };

export type CallRow = {
  userId: string;
  projectId?: string | null;
  jobId?: string | null;
  task: string;
  provider: string;
  requestedModel: string;
  servedModel?: string | null;
  unit: "tokens" | "image" | "video_second" | "request";
  inputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  outputTokens?: number;
  quantity?: number;
  latencyMs?: number | null;
  httpAttempts?: number | null;
  stopReason?: string | null;
  effort?: string | null;
  costMicro?: number;
  estimated?: boolean;
  usageKey?: string | null;
  usageEventId?: string | null;
  billingDedup?: boolean;
  status: "ok" | "error" | "refused" | "timeout";
  errorKind?: string | null;
  promptKey?: string | null;
  promptHash?: string | null;
  callTry?: number;
  qualityCheckId?: string | null;
  /** Project Brain : portée (ex. « legacy:images »), empreinte du contexte stable et version du Brain. */
  brainScope?: string | null;
  brainHash?: string | null;
  brainVersion?: string | null;
  /** Router V2 : raison synthétique du choix, repli de fournisseur, escalade de niveau (sinon ceux de l'étape). */
  routingReason?: string | null;
  fallback?: boolean;
  escalation?: boolean;
};

/**
 * Enregistre un appel. Ne lève jamais d'erreur : une trace manquante ne doit pas faire échouer une génération
 * déjà payée. Étape, candidat et tentative viennent du contexte courant.
 */
export function recordCall(c: CallRow): string | null {
  const t = currentTrace();
  const rid = id();
  try {
    run(
      `INSERT INTO ai_calls (id, created_at, user_id, project_id, job_id, task, step, candidate_id, attempt, call_try, provider, requested_model, served_model, unit, input_tokens, cache_read_tokens, cache_write_tokens, output_tokens, quantity, latency_ms, http_attempts, stop_reason, effort, cost, estimated, usage_key, usage_event_id, billing_dedup, status, error_kind, prompt_key, prompt_hash, quality_check_id, brain_scope, brain_hash, brain_version, intent, plan_id, step_id, routing_reason, routing_fallback, routing_escalation)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      rid,
      now(),
      c.userId,
      c.projectId ?? t.projectId ?? null,
      c.jobId ?? t.jobId ?? null,
      c.task,
      t.step ?? null,
      t.candidateId ?? null,
      t.attempt ?? 0,
      c.callTry ?? 0,
      c.provider,
      c.requestedModel,
      c.servedModel ?? null,
      c.unit,
      Math.round(c.inputTokens ?? 0),
      Math.round(c.cacheReadTokens ?? 0),
      Math.round(c.cacheWriteTokens ?? 0),
      Math.round(c.outputTokens ?? 0),
      c.quantity ?? 0,
      c.latencyMs ?? null,
      c.httpAttempts ?? null,
      c.stopReason ?? null,
      c.effort ?? null,
      Math.round(c.costMicro ?? 0),
      c.estimated ? 1 : 0,
      c.usageKey ?? null,
      c.usageEventId ?? null,
      c.billingDedup ? 1 : 0,
      c.status,
      c.errorKind ? redact(c.errorKind).slice(0, 300) : null,
      c.promptKey ?? null,
      c.promptHash ?? null,
      c.qualityCheckId ?? null,
      c.brainScope ?? null,
      c.brainHash ?? null,
      c.brainVersion ?? null,
      t.intent ?? null,
      t.planId ?? null,
      t.stepId ?? null,
      (c.routingReason ?? t.routing?.reason ?? null)?.slice(0, 200) ?? null,
      (c.fallback ?? t.routing?.fallback) ? 1 : 0,
      (c.escalation ?? t.routing?.escalation) ? 1 : 0,
    );
    return rid;
  } catch (e) {
    console.warn("[trace] appel non enregistré :", redact((e as Error).message));
    return null;
  }
}
