/** Traces synthétiques SQLite : consultation exacte, lecture seule et sans moyennes. */
import { expect, it } from "vitest";
import { fixture } from "./preparation-fixtures";
import { analysisHistory } from "@/lib/preparation/analysis-history";
import { id, now, run, all } from "@/lib/db";
import { enqueue } from "@/lib/jobs";

it("sépare chaque demande, reprise JSON, latence, route servie et coût ; cumul dédoublonné des vrais débits", async () => {
  const f = await fixture("services");
  const job = () => enqueue({ userId: f.uid, projectId: f.pid, type: "project.prepare", payload: { action: "analyze" } });
  const j1 = job(), j2 = job(), noCall = job();
  const usage = id();
  run("INSERT INTO usage_events(id,user_id,project_id,job_id,task,provider,model,unit,cost,billed,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)", usage, f.uid, f.pid, j1.id, "vision_analysis", "simulation", "fake", "tokens", 12345, 13580, now());
  const trace = (jid: string, suffix: string, cost: number, latency: number | null, event: string | null = null, dedup = 0) => run("INSERT INTO ai_calls(id,created_at,user_id,project_id,job_id,task,provider,requested_model,served_model,unit,usage_key,status,cost,latency_ms,http_attempts,call_try,effort,usage_event_id,billing_dedup) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", id(), now(), f.uid, f.pid, jid, "vision_analysis", "simulation", "fake-requested", "fake-served", "tokens", `${jid}:brief${suffix}`, "ok", cost, latency, suffix ? 2 : 1, suffix ? 1 : 0, "medium", event, dedup);
  trace(j1.id, "", 12345, 15123, usage);
  trace(j1.id, ":fix1", 23456, 8012);
  trace(j2.id, "", 12345, null, usage, 1);
  trace(j2.id, ":fix10", 999999, 9999); // Clé voisine non liée : surtout ne pas la compter.
  const before = all("SELECT id FROM ai_calls");
  const r = analysisHistory(f.pid);
  expect(r.totals).toEqual({ requests: 3, calls: 3, recordedCostMicro: 48146, billedCostMicro: 13580 });
  const first = r.analyses.find(a => a.jobId === j1.id)!;
  expect(first.recordedCostMicro).toBe(35801);
  expect(first.calls.map(c => c.latencyMs)).toEqual([15123, 8012]);
  expect(first.calls.map(c => c.jsonRetry)).toEqual([0, 1]);
  expect(first.calls[1].httpAttempts).toBe(2);
  expect(first.calls[0]).toMatchObject({ provider: "simulation", requestedModel: "fake-requested", servedModel: "fake-served", effort: "medium", costMicro: 12345, billedCostMicro: 13580 });
  expect(r.analyses.find(a => a.jobId === noCall.id)?.calls).toEqual([]);
  expect(all("SELECT id FROM ai_calls")).toEqual(before);
  expect(analysisHistory("foreign-project").totals.calls).toBe(0);
});
