/** Adaptateur d'analyse et stockage réels ; API et preuve d'appel injectées, aucune dépense. */
import { it, expect, vi } from "vitest";
vi.mock("@/lib/preparation/evidence", async original => ({ ...await original<object>(), assertAnalysisRoute: () => {}, apiEvidence: () => ({ provider: "simulation", model: "injected", usageKey: "test", vision: true, at: 1 }) }));
vi.mock("@/lib/ai/tasks", async original => ({ ...await original<object>(), aiAnalyzeProduct: async () => ({ category: "Carnet", sector: "Dessin", summary: "Analyse simulée", facts: [{ key: "usage", label: "Usage", value: "Réponse contradictoire injectée", source: "ai", status: "confirmed" }], visual: {}, variants: [], questions: [{ id: "new-usage", factKey: "usage", question: "Quel usage ?", required: true, why: "Faits" }], claimsToAvoid: [] }) }));
import { fixture, initializeSynthetic } from "./preparation-fixtures";
import { answerBriefQuestion, stateOf } from "@/lib/preparation/engine";
import { commitState } from "@/lib/preparation/store";
import { inspectBrief } from "@/lib/preparation/inspect";
import { loadProject } from "@/lib/projects";
import { enqueue, JobContext } from "@/lib/jobs";
import { runForUser } from "@/lib/ai/access";

it("une réanalyse ne perd ni réponse ni fait client, même si l'API change l'identifiant de question", async () => {
  const f = await fixture(); initializeSynthetic(f.pid, f.input);
  commitState(f.pid, stateOf(f.pid)!.revision, s => { s.stages.brief!.data.profile.questions = [{ id: "usage", factKey: "usage", question: "Quel usage ?", required: true, why: "Confirmer" }]; });
  answerBriefQuestion(f.pid, stateOf(f.pid)!.revision, "usage", "Croquis au crayon.");
  const ctx = new JobContext(enqueue({ userId: f.uid, projectId: f.pid, type: "project.prepare", payload: {}, maxAttempts: 1 }));
  const result = await runForUser(f.uid, () => inspectBrief(loadProject(f.pid), stateOf(f.pid)!.stages.brief!.data, ctx, true), "normal", f.pid);
  expect(result.profile.facts.find(f => f.key === "usage")).toMatchObject({ value: "Croquis au crayon.", status: "confirmed", source: "user" });
  expect(result.profile.questions.find(q => q.factKey === "usage")?.answer).toBe("Croquis au crayon.");
  expect(result.missing).not.toContain("Quel usage ?");
});
