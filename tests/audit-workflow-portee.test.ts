import { it, expect } from "vitest";
import { fixture } from "./preparation-fixtures";
import { prepareWorkflow, startWorkflow } from "@/lib/workflow";
import { loadPlan } from "@/lib/orchestrator/planner";
import { all } from "@/lib/db";
it("workflow : texte intégral conservé, restriction transmise, aucune création complète ajoutée", async () => {
  const f = await fixture();
  const text = "Rédige la description. " + "Contexte du client. ".repeat(350) + "Ne change pas le logo.";
  const w = await prepareWorkflow(f.pid, f.uid, text, { aiActive: false });
  expect(w.request).toBe(text);
  expect(w.estimate.needsCreation).toBe(false);
  const p = loadPlan(w.planId!)!;
  expect(p.steps.map(s => s.kind)).toEqual(["copy"]);
  expect((p.steps[0].input.requestScope as any).preserved).toContain("logo");
  startWorkflow(w.id);
  expect(all("SELECT id FROM jobs WHERE project_id=? AND type='pipeline.run'", f.pid)).toHaveLength(0);
});
it("workflow : une consigne citée ne rajoute pas de création de boutique", async () => {
  const f = await fixture();
  const w = await prepareWorkflow(f.pid, f.uid, 'Rédige une description avec la citation « crée ma boutique Shopify ».', { aiActive: false });
  expect(w.intents).toEqual(["WRITE_PRODUCT_COPY"]);
  expect(loadPlan(w.planId!)!.steps.map(s => s.kind)).toEqual(["copy"]);
});
