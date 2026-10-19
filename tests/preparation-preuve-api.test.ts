/** Journaux synthétiques réels en SQLite ; aucun appel fournisseur. */
import { it, expect } from "vitest";
import { fixture } from "./preparation-fixtures";
import { apiEvidence } from "@/lib/preparation/evidence";
import { id, now, run } from "@/lib/db";
it("le reçu trace le modèle réellement servi par la dernière correction JSON réussie du même appel/projet", async () => {
  const f = await fixture();
  const trace = (pid: string, key: string, served: string, status = "ok") => run("INSERT INTO ai_calls (id,created_at,user_id,project_id,task,provider,requested_model,served_model,unit,usage_key,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)", id(),now(),f.uid,pid,"copywriting","simulation","requested-model",served,"tokens",key,status);
  trace(f.pid,"usage_key","first");
  trace(f.pid,"usage_key:fix1","final-served");
  trace(f.pid,"usage_key:fix2","failed","error");
  trace("foreign-project","usage_key:fix3","foreign");
  trace(f.pid,"usage_key:fix10","unrelated");
  expect(apiEvidence(f.pid,"usage_key",true)).toMatchObject({ provider:"simulation", model:"final-served", usageKey:"usage_key:fix1", vision:true });
});
it("aucun reçu final fabriqué à partir d'une erreur ou d'une autre clé", async () => {
  const f = await fixture();
  expect(() => apiEvidence(f.pid,"absent")).toThrow(/sans trace/);
});
