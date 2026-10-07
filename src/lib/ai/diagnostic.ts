/**
 * Diagnostic de l'IA (lecture seule) : à partir des appels réellement envoyés (`ai_calls`) et des verdicts de la
 * barrière de qualité (`quality_checks`), répond à « qu'a coûté chaque appel, a-t-il servi, la reprise valait-elle
 * son prix ? ». Jamais de prompt complet, de raisonnement du modèle, d'image encodée ni de secret : seuls la clé du
 * prompt (`prompt_key`) et son empreinte (`prompt_hash`) sont lus ; tout texte libre passe par `redact`.
 *
 * Classement d'un appel (`outcome`) :
 *  - useful : son candidat est FINAL (ou l'appel n'a pas de candidat contrôlé et a abouti → « unscored ») ;
 *  - provisional : candidat PROVISIONAL (gardé, marqué provisoire) ;
 *  - superseded : essai RETRY remplacé par une reprise ;
 *  - rejected : candidat REJECTED (payé, jamais utilisé) ;
 *  - duplicate : rejeu déjà facturé (billing_dedup) ou appel identique déjà fait dans la même tâche ;
 *  - error : appel en échec (refus, panne, délai) ;
 *  - unscored : abouti, sans contrôle de qualité rattaché.
 * `retry` (booléen) : reprise d'un candidat (attempt > 0) ou nouvel essai technique (call_try > 0).
 */
import { all } from "../db";
import { redact } from "../redact";

export type DiagFilter = { projectId?: string; jobId?: string; userId?: string; since?: number; limit?: number };
export type Outcome = "useful" | "provisional" | "superseded" | "rejected" | "duplicate" | "error" | "unscored";
export type Verdict = "FINAL" | "RETRY" | "PROVISIONAL" | "REJECTED";

type CallRow = {
  id: string; created_at: number; user_id: string; project_id: string | null; job_id: string | null; job_type: string | null;
  task: string; step: string | null; candidate_id: string | null; attempt: number; call_try: number;
  provider: string; requested_model: string; served_model: string | null; unit: string;
  input_tokens: number; cache_read_tokens: number; cache_write_tokens: number; output_tokens: number; quantity: number;
  latency_ms: number | null; http_attempts: number | null; stop_reason: string | null; cost: number; estimated: number;
  usage_event_id: string | null; billing_dedup: number; status: string; error_kind: string | null;
  prompt_key: string | null; prompt_hash: string | null; quality_check_id: string | null;
};
type CheckRow = {
  id: string; created_at: number; project_id: string | null; job_id: string | null; step: string | null; deliverable: string;
  candidate_id: string | null; attempt: number; checker: string; checked: number; score: number | null;
  verdict: Verdict; fatal: number; feedback: string; reason: string; previous_check_id: string | null;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const clip = (s: string | null | undefined, n = 240) => (s ? redact(s).slice(0, n) : "");
/** Module = premier segment de l'étape (« logos », « visuels »…), sinon type de la tâche de fond, sinon tâche IA. */
export const moduleOf = (c: { step: string | null; job_type: string | null; task: string }) => (c.step ? c.step.split("/")[0].split(":")[0] : c.job_type ?? c.task);

function where(f: DiagFilter, alias: string) {
  const w: string[] = [];
  const args: unknown[] = [];
  if (f.projectId) w.push(`${alias}.project_id = ?`), args.push(f.projectId);
  if (f.jobId) w.push(`${alias}.job_id = ?`), args.push(f.jobId);
  if (f.userId) w.push(`${alias}.user_id = ?`), args.push(f.userId);
  if (f.since) w.push(`${alias}.created_at >= ?`), args.push(f.since);
  return { sql: w.length ? `WHERE ${w.join(" AND ")}` : "", args };
}

type Agg = { calls: number; cost: number; billedCost: number; errors: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; latencyMs: number; latencyN: number; httpAttempts: number };
const emptyAgg = (): Agg => ({ calls: 0, cost: 0, billedCost: 0, errors: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, latencyMs: 0, latencyN: 0, httpAttempts: 0 });
function add(map: Map<string, Agg>, key: string, c: CallRow) {
  const a = map.get(key) ?? emptyAgg();
  a.calls++;
  a.cost += c.cost;
  if (!c.billing_dedup) a.billedCost += c.cost;
  if (c.status !== "ok") a.errors++;
  a.inputTokens += c.input_tokens;
  a.outputTokens += c.output_tokens;
  a.cacheReadTokens += c.cache_read_tokens;
  a.cacheWriteTokens += c.cache_write_tokens;
  if (c.latency_ms != null) (a.latencyMs += c.latency_ms), a.latencyN++;
  a.httpAttempts += c.http_attempts ?? 1;
  map.set(key, a);
}
const finish = (map: Map<string, Agg>) =>
  [...map.entries()]
    .map(([key, a]) => {
      const promptIn = a.inputTokens + a.cacheReadTokens + a.cacheWriteTokens;
      return { key, calls: a.calls, costMicro: a.cost, billedCostMicro: a.billedCost, errors: a.errors, inputTokens: a.inputTokens, outputTokens: a.outputTokens, cacheReadTokens: a.cacheReadTokens, cacheWriteTokens: a.cacheWriteTokens, cacheHitRate: promptIn ? r2(a.cacheReadTokens / promptIn) : null, avgLatencyMs: a.latencyN ? Math.round(a.latencyMs / a.latencyN) : null, httpAttempts: a.httpAttempts };
    })
    .sort((x, y) => y.costMicro - x.costMicro);

export function aiDiagnostic(f: DiagFilter = {}) {
  const wc = where(f, "c");
  const calls = all<CallRow>(
    `SELECT c.id, c.created_at, c.user_id, c.project_id, c.job_id, j.type AS job_type, c.task, c.step, c.candidate_id, c.attempt, c.call_try,
            c.provider, c.requested_model, c.served_model, c.unit, c.input_tokens, c.cache_read_tokens, c.cache_write_tokens, c.output_tokens,
            c.quantity, c.latency_ms, c.http_attempts, c.stop_reason, c.cost, c.estimated, c.usage_event_id, c.billing_dedup, c.status,
            c.error_kind, c.prompt_key, c.prompt_hash, c.quality_check_id
       FROM ai_calls c LEFT JOIN jobs j ON j.id = c.job_id ${wc.sql} ORDER BY c.created_at, c.id LIMIT ?`,
    ...wc.args,
    Math.min(Math.max(f.limit ?? 5000, 1), 20000),
  );
  const wq = where(f, "q");
  const checks = all<CheckRow>(
    `SELECT q.id, q.created_at, q.project_id, q.job_id, q.step, q.deliverable, q.candidate_id, q.attempt, q.checker, q.checked, q.score, q.verdict, q.fatal, q.feedback, q.reason, q.previous_check_id
       FROM quality_checks q ${wq.sql} ORDER BY q.created_at, q.id`,
    ...wq.args,
  );
  const checkById = new Map(checks.map((q) => [q.id, q]));
  // Dernier contrôle de chaque (candidat, tentative) et dernier contrôle du candidat (son verdict final).
  const checkOf = new Map<string, CheckRow>();
  const lastOfCandidate = new Map<string, CheckRow>();
  for (const q of checks) {
    if (!q.candidate_id) continue;
    checkOf.set(`${q.candidate_id}#${q.attempt}`, q);
    const prev = lastOfCandidate.get(q.candidate_id);
    if (!prev || q.attempt > prev.attempt || (q.attempt === prev.attempt && q.created_at >= prev.created_at)) lastOfCandidate.set(q.candidate_id, q);
  }
  const prevScore = (q: CheckRow): number | null => {
    if (q.previous_check_id) return checkById.get(q.previous_check_id)?.score ?? null;
    if (!q.candidate_id || q.attempt === 0) return null;
    return checkOf.get(`${q.candidate_id}#${q.attempt - 1}`)?.score ?? null;
  };

  // Appels identiques (même tâche de fond, même tâche IA, même prompt, même candidat et tentative) : seul le premier compte.
  const seen = new Set<string>();
  const rows = calls.map((c) => {
    const q = (c.quality_check_id && checkById.get(c.quality_check_id)) || (c.candidate_id ? checkOf.get(`${c.candidate_id}#${c.attempt}`) : undefined);
    const fin = c.candidate_id ? lastOfCandidate.get(c.candidate_id) : undefined;
    const sig = c.prompt_hash && c.job_id ? `${c.job_id}|${c.task}|${c.prompt_hash}|${c.candidate_id ?? ""}|${c.attempt}|${c.call_try}` : null;
    const repeated = c.status === "ok" && sig != null && seen.has(sig);
    if (c.status === "ok" && sig) seen.add(sig);
    let outcome: Outcome;
    if (c.status !== "ok") outcome = "error";
    else if (c.billing_dedup || repeated) outcome = "duplicate";
    else if (!q) outcome = fin?.verdict === "REJECTED" ? "rejected" : "unscored";
    else if (q.verdict === "RETRY") outcome = fin?.verdict === "REJECTED" ? "rejected" : "superseded";
    else outcome = q.verdict === "FINAL" ? "useful" : q.verdict === "PROVISIONAL" ? "provisional" : "rejected";
    const before = q ? prevScore(q) : null;
    return {
      id: c.id,
      createdAt: c.created_at,
      projectId: c.project_id,
      jobId: c.job_id,
      jobType: c.job_type,
      module: moduleOf(c),
      task: c.task,
      step: c.step,
      candidateId: c.candidate_id,
      attempt: c.attempt,
      callTry: c.call_try,
      provider: c.provider,
      requestedModel: c.requested_model,
      servedModel: c.served_model,
      modelMismatch: !!c.served_model && !c.served_model.startsWith(c.requested_model) && !c.requested_model.startsWith(c.served_model),
      unit: c.unit,
      tokens: { input: c.input_tokens, cacheRead: c.cache_read_tokens, cacheWrite: c.cache_write_tokens, output: c.output_tokens },
      quantity: c.quantity,
      latencyMs: c.latency_ms,
      httpAttempts: c.http_attempts,
      stopReason: c.stop_reason,
      costMicro: c.cost,
      estimated: !!c.estimated,
      billed: !c.billing_dedup && !!c.usage_event_id,
      billingDedup: !!c.billing_dedup,
      status: c.status,
      error: clip(c.error_kind, 200),
      promptKey: c.prompt_key,
      promptHash: c.prompt_hash,
      qualityScore: q?.score ?? null,
      verdict: q?.verdict ?? null,
      finalVerdict: fin?.verdict ?? null,
      qualityBefore: before,
      qualityDelta: q && before != null && q.score != null ? r2(q.score - before) : null,
      retry: c.attempt > 0 || c.call_try > 0,
      outcome,
    };
  });

  // Agrégats.
  const by = { project: new Map<string, Agg>(), job: new Map<string, Agg>(), step: new Map<string, Agg>(), task: new Map<string, Agg>(), module: new Map<string, Agg>(), providerModel: new Map<string, Agg>(), servedModel: new Map<string, Agg>() };
  calls.forEach((c, i) => {
    add(by.project, c.project_id ?? "(sans projet)", c);
    add(by.job, c.job_id ? `${c.job_id} (${c.job_type ?? "?"})` : "(hors tâche de fond)", c);
    add(by.step, c.step ?? "(sans étape)", c);
    add(by.task, c.task, c);
    add(by.module, rows[i].module, c);
    add(by.providerModel, `${c.provider}/${c.requested_model}`, c);
    add(by.servedModel, `${c.provider}/${c.served_model ?? c.requested_model}`, c);
  });

  const sum = (pred: (r: (typeof rows)[number]) => boolean) => rows.filter(pred).reduce((s, r) => ({ calls: s.calls + 1, costMicro: s.costMicro + r.costMicro }), { calls: 0, costMicro: 0 });
  const outcomes = Object.fromEntries((["useful", "provisional", "superseded", "rejected", "duplicate", "error", "unscored"] as Outcome[]).map((o) => [o, sum((r) => r.outcome === o)])) as Record<Outcome, { calls: number; costMicro: number }>;

  // Suivi de chaque candidat : notes par tentative, coûts, consignes de reprise, gain de qualité, coût total.
  const candidateIds = [...new Set([...checks.map((q) => q.candidate_id), ...calls.map((c) => c.candidate_id)].filter(Boolean) as string[])];
  const candidates = candidateIds.map((id) => {
    const qs = checks.filter((q) => q.candidate_id === id);
    const cs = rows.filter((r) => r.candidateId === id);
    const attempts = [...new Set([...qs.map((q) => q.attempt), ...cs.map((r) => r.attempt)])].sort((a, b) => a - b).map((n) => {
      const q = checkOf.get(`${id}#${n}`);
      const before = q ? prevScore(q) : null;
      return {
        attempt: n,
        score: q?.score ?? null,
        verdict: q?.verdict ?? null,
        checker: q?.checker ?? null,
        checked: q ? !!q.checked : null,
        costMicro: cs.filter((r) => r.attempt === n).reduce((s, r) => s + r.costMicro, 0),
        calls: cs.filter((r) => r.attempt === n).length,
        feedback: clip(q?.feedback),
        reason: clip(q?.reason),
        qualityDelta: q && before != null && q.score != null ? r2(q.score - before) : null,
      };
    });
    const scored = attempts.filter((a) => a.score != null);
    const qualityBefore = scored[0]?.score ?? null;
    const qualityAfter = scored.at(-1)?.score ?? null;
    const retryCostMicro = attempts.filter((a) => a.attempt > 0).reduce((s, a) => s + a.costMicro, 0);
    const qualityGain = scored.length > 1 && qualityBefore != null && qualityAfter != null ? r2(qualityAfter - qualityBefore) : null;
    return {
      candidateId: id,
      deliverable: qs[0]?.deliverable ?? null,
      projectId: qs[0]?.project_id ?? cs[0]?.projectId ?? null,
      finalVerdict: lastOfCandidate.get(id)?.verdict ?? null,
      attempts,
      qualityBefore,
      qualityAfter,
      qualityGain,
      retryCostMicro,
      totalCostMicro: attempts.reduce((s, a) => s + a.costMicro, 0),
      // Coût de la reprise par point de qualité gagné (null si pas de reprise notée).
      retryCostPerPointMicro: qualityGain && qualityGain > 0 && retryCostMicro ? Math.round(retryCostMicro / qualityGain) : null,
    };
  });

  const costByVerdict = { FINAL: { candidates: 0, costMicro: 0 }, PROVISIONAL: { candidates: 0, costMicro: 0 }, REJECTED: { candidates: 0, costMicro: 0 }, RETRY: { candidates: 0, costMicro: 0 }, UNCHECKED: { candidates: 0, costMicro: 0 } };
  for (const c of candidates) {
    const k = (c.finalVerdict ?? "UNCHECKED") as keyof typeof costByVerdict;
    costByVerdict[k].candidates++;
    costByVerdict[k].costMicro += c.totalCostMicro;
  }

  const retries = {
    candidateRetries: sum((r) => r.attempt > 0),
    technicalRetries: sum((r) => r.callTry > 0),
    httpRetries: rows.reduce((s, r) => s + Math.max(0, (r.httpAttempts ?? 1) - 1), 0),
    // Reprises de candidats : ont-elles amélioré la note ?
    improved: candidates.filter((c) => c.qualityGain != null && c.qualityGain > 0).length,
    notImproved: candidates.filter((c) => c.qualityGain != null && c.qualityGain <= 0).length,
  };
  const duplicates = {
    replaysNotBilled: sum((r) => r.billingDedup),
    identicalCalls: sum((r) => r.outcome === "duplicate" && !r.billingDedup),
  };

  return {
    filter: { projectId: f.projectId ?? null, jobId: f.jobId ?? null, since: f.since ?? null },
    totals: { calls: rows.length, costMicro: rows.reduce((s, r) => s + r.costMicro, 0), billedCostMicro: rows.filter((r) => !r.billingDedup).reduce((s, r) => s + r.costMicro, 0), errors: rows.filter((r) => r.status !== "ok").length },
    outcomes,
    costByVerdict,
    retries,
    duplicates,
    byProject: finish(by.project),
    byJob: finish(by.job),
    byStep: finish(by.step),
    byTask: finish(by.task),
    byModule: finish(by.module),
    byProviderModel: finish(by.providerModel),
    byServedModel: finish(by.servedModel),
    candidates,
    calls: rows,
    shopifySeo: shopifySeoStatus(f),
  };
}

/** SEO envoyé à Shopify (tâches « shopify.push ») : envoyé / accepté / refusé / inconnu — mécanisme NON VÉRIFIÉ. */
function shopifySeoStatus(f: DiagFilter) {
  const w = where({ projectId: f.projectId, userId: f.userId, since: f.since }, "j");
  const jobs = all<{ id: string; project_id: string | null; result: string | null; created_at: number }>(
    `SELECT j.id, j.project_id, j.result, j.created_at FROM jobs j ${w.sql ? `${w.sql} AND` : "WHERE"} j.type = 'shopify.push' AND j.status = 'done' ORDER BY j.created_at DESC LIMIT 50`,
    ...w.args,
  );
  const counts = { sent: 0, accepted: 0, refused: 0, unknown: 0, none: 0 };
  const details: { jobId: string; product: string; status: string; detail: string }[] = [];
  for (const j of jobs) {
    let res: any;
    try {
      res = JSON.parse(j.result ?? "{}");
    } catch {
      continue;
    }
    for (const [handle, s] of Object.entries<any>(res?.product?.seo ?? {})) {
      // Ancien format (avant 1C) : « sent » sans confirmation, « refused: … », « none ».
      const status = typeof s === "string" ? (s.startsWith("refused") ? "refused" : s === "none" ? "none" : "sent") : String(s?.status ?? "unknown");
      if (status in counts) counts[status as keyof typeof counts]++;
      details.push({ jobId: j.id, product: handle, status, detail: clip(typeof s === "string" ? s : s?.detail, 200) });
    }
  }
  return { mechanism: "metafieldsSet global.title_tag / global.description_tag", verified: false, counts, details: details.slice(0, 100) };
}
