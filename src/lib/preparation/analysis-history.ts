/** Consultation administrative ciblée, lecture seule : coûts enregistrés, pas une facture fournisseur. */
import { all } from "../db";

type Row = {
  id: string; created_at: number; job_id: string; provider: string; requested_model: string;
  served_model: string | null; effort: string | null; usage_key: string; status: string;
  call_try: number; http_attempts: number | null; latency_ms: number | null; cost: number;
  billed_actual: number | null; estimated: number; billing_dedup: number; usage_event_id: string | null;
};
export function analysisHistory(projectId: string) {
  const jobs = all<{ id: string; status: string; created_at: number; finished_at: number | null }>("SELECT id,status,created_at,finished_at FROM jobs WHERE project_id=? AND type='project.prepare' AND json_extract(payload,'$.action')='analyze' ORDER BY created_at,rowid", projectId);
  const rows = all<Row>(`SELECT c.*,u.billed AS billed_actual FROM ai_calls c LEFT JOIN usage_events u ON u.id=c.usage_event_id AND u.project_id=c.project_id AND u.user_id=c.user_id JOIN jobs j ON j.id=c.job_id AND j.project_id=c.project_id
    WHERE c.project_id=? AND j.type='project.prepare' AND json_extract(j.payload,'$.action')='analyze'
    AND c.usage_key IN (j.id||':brief',j.id||':brief:fix1',j.id||':brief:fix2',j.id||':brief:fix3')
    ORDER BY c.created_at,c.rowid`, projectId);
  const seen = new Set<string>();
  const charged = new Map<string, number>();
  for (const c of rows) {
    const key = c.usage_event_id;
    const amount = !c.billing_dedup && key && !seen.has(key) ? c.billed_actual ?? 0 : 0;
    charged.set(c.id, amount);
    if (!c.billing_dedup && key) seen.add(key);
  }
  const billed = (c: Row) => charged.get(c.id) ?? 0;
  return {
    readOnly: true, source: "recorded_ai_calls_not_provider_invoice", projectId,
    totals: { requests: jobs.length, calls: rows.length, recordedCostMicro: rows.reduce((n, r) => n + r.cost, 0), billedCostMicro: rows.reduce((n, r) => n + billed(r), 0) },
    analyses: jobs.map(j => {
      const calls = rows.filter(r => r.job_id === j.id);
      return { jobId: j.id, status: j.status, createdAt: j.created_at, finishedAt: j.finished_at,
        elapsedMs: j.finished_at == null ? null : j.finished_at - j.created_at,
        calls: calls.map(c => ({ id: c.id, at: c.created_at, provider: c.provider, requestedModel: c.requested_model,
          servedModel: c.served_model, effort: c.effort, status: c.status, jsonRetry: c.call_try,
          httpAttempts: c.http_attempts, latencyMs: c.latency_ms, costMicro: c.cost, estimated: !!c.estimated,
          billedCostMicro: billed(c), billingLinked: c.billed_actual != null, billingDedup: !!c.billing_dedup })),
        recordedCostMicro: calls.reduce((n, c) => n + c.cost, 0), billedCostMicro: calls.reduce((n, c) => n + billed(c), 0),
      };
    }),
    limits: ["A rejected confirmation without an enqueued job is not a provider call.", "Elapsed time includes the queue and storage; each call has its own recorded latency, never an average.", "Missing receipts or uncertain reservations require billing reconciliation; no missing cost is inferred here."],
  };
}
