/**
 * Benchmarks déterministes de l'orchestrateur (phase 3B) : vraies intentions, vrais plans (état réel des projets
 * fixtures), vrai routeur ; seules les exécutions des moteurs sont simulées (résultat de qualité scénarisé, aucun
 * appel payant). Partagé par tests/orchestrateur-3b.test.ts et scripts/orchestrator-bench.ts.
 */
import { loadProject } from "@/lib/projects";
import * as o from "@/lib/orchestrator";
import { explicitGeneration } from "@/lib/orchestrator/execute";

export type ScenarioResult = {
  id: string;
  title: string;
  request: string;
  intent: o.IntentResult;
  plan: string[];
  executed: string[];
  skipped: { step: string; reason: string }[];
  routing: { step: string; mode: string; provider: string; model: string; reason: string; fallback: boolean; escalation: boolean }[];
  quality: { step: string; status: string; reason: string }[];
  fallback: boolean;
  costClasses: Record<string, string>;
  warnings: string[];
};

type Script = Partial<Record<o.StepKind, o.StepResult[]>>;

const ALL = (p: string) => p === "anthropic" || p === "openai" || p === "google" || p === "fal";

export async function runScenario(a: {
  id: string;
  title: string;
  projectId: string;
  request: string;
  script: Script;
  available?: (p: string) => boolean;
  /** Interruption simulée à cette étape (scénario F), puis reprise. */
  crashAt?: o.StepKind;
  requestKey?: string;
}): Promise<ScenarioResult & { executions: Record<string, number> }> {
  const p = loadProject(a.projectId);
  const intent = await o.understand({ text: a.request }, { aiActive: true, classify: async () => ({ intents: [], confidence: 0 }) });
  const env = { aiActive: true, available: a.available ?? ALL };
  const args = { projectId: p.id, userId: p.userId, requestKey: a.requestKey ?? `bench:${a.id}:${Date.now()}`, intents: intent.intents, state: o.projectState(p), forceGenerate: explicitGeneration(a.request) };
  let plan = o.loadOrCreatePlan(args);
  const executions: Record<string, number> = {};
  const queue: Script = Object.fromEntries(Object.entries(a.script).map(([k, v]) => [k, [...(v ?? [])]]));
  const exec = async (s: o.PlanStep): Promise<o.StepResult> => {
    if (a.crashAt === s.kind && !executions[`crash:${s.kind}`]) {
      executions[`crash:${s.kind}`] = 1;
      throw new Error("interruption simulée (redémarrage)");
    }
    executions[s.kind] = (executions[s.kind] ?? 0) + 1;
    return queue[s.kind]?.shift() ?? { note: "done" };
  };
  try {
    await o.runPlan(plan, exec, env);
  } catch {
    // Reprise : le plan enregistré est relu, rien de terminé n'est relancé.
    plan = o.loadOrCreatePlan(args);
    await o.runPlan(plan, exec, env);
  }
  return {
    id: a.id,
    title: a.title,
    request: a.request,
    intent,
    plan: plan.steps.map((s) => s.kind),
    executed: Object.entries(executions).filter(([k]) => !k.startsWith("crash:")).map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)),
    skipped: plan.steps.filter((s) => s.status === "skipped").map((s) => ({ step: s.kind, reason: s.reason ?? "" })),
    routing: plan.steps.filter((s) => s.route).map((s) => ({ step: s.kind, ...s.route! })),
    quality: plan.steps.map((s) => ({ step: s.kind, status: s.status, reason: s.reason ?? "" })),
    fallback: plan.steps.some((s) => s.route?.fallback),
    costClasses: Object.fromEntries(plan.steps.map((s) => [s.kind, s.costClass])),
    warnings: plan.warnings,
    executions,
  };
}

/** Les six scénarios du rapport (A à F). */
export async function allScenarios(ids: { sb: string; serum: string }) {
  return [
    await runScenario({
      id: "A",
      title: "Sébastien Blanc — « Crée ma marque et ma boutique »",
      projectId: ids.sb,
      request: "Crée ma marque et ma boutique",
      script: { brand_strategy: [{ note: "brand built", covered: { logo: { verdict: "FINAL", score: 8.4 }, mockups: { note: "brand book done" } } }], stock_search: [{ verdict: "FINAL", score: 8 }], copy: [{ verdict: "FINAL", score: 8.3 }], theme: [{ verdict: "PROVISIONAL", score: 6.5 }] },
    }),
    await runScenario({
      id: "B",
      title: "Sérum Éclat — « Crée ma boutique et une publicité »",
      projectId: ids.serum,
      request: "Crée ma boutique et une publicité",
      script: { stock_search: [{ verdict: "REJECTED", score: 4, note: "no FINAL stock photo" }], image_generate: [{ verdict: "FINAL", score: 7.6 }], copy: [{ verdict: "RETRY", score: 7.4 }, { verdict: "FINAL", score: 8.2 }], theme: [{ verdict: "FINAL", score: 8.1 }], ad: [{ verdict: "FINAL", score: 8 }] },
    }),
    await runScenario({ id: "C", title: "« Améliore uniquement mon logo »", projectId: ids.sb, request: "Améliore uniquement mon logo", script: { logo: [{ verdict: "RETRY", score: 7.8 }, { verdict: "FINAL", score: 8.5 }] } }),
    await runScenario({ id: "D", title: "« Trouve-moi une photo libre de droits »", projectId: ids.sb, request: "Trouve-moi une photo libre de droits d'un chantier", script: { stock_search: [{ verdict: "FINAL", score: 8 }] } }),
    await runScenario({
      id: "E",
      title: "Fournisseur principal indisponible — « Génère une image de bannière »",
      projectId: ids.serum,
      request: "Génère une image de bannière pour ma boutique",
      available: (x) => x === "anthropic" || x === "google",
      script: { image_generate: [{ verdict: "RETRY", score: 6.2 }, { verdict: "REJECTED", score: 4.5 }] },
    }),
    await runScenario({
      id: "F",
      title: "Interruption puis reprise — « Crée ma marque et ma boutique »",
      projectId: ids.sb,
      request: "Crée ma marque et ma boutique",
      crashAt: "copy",
      script: { brand_strategy: [{ note: "brand built", covered: { logo: { verdict: "FINAL", score: 8.2 }, mockups: { note: "brand book done" } } }], stock_search: [{ verdict: "FINAL", score: 8 }], copy: [{ verdict: "FINAL", score: 8.4 }], theme: [{ verdict: "FINAL", score: 8.2 }] },
    }),
  ];
}
