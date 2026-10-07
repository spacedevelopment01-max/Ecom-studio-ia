/**
 * Orchestrateur (phase 3A) : DEMANDE → INTENTION → PLAN → ÉTAPE → ROUTEUR → EXÉCUTION → RÉSULTAT CONTRÔLÉ →
 * CONTINUER / REPRENDRE / ARRÊTER. Branché sur les moteurs en 3B ; ici : comprendre, planifier, router, tracer.
 */
import type { Project } from "../projects";
import { one } from "../db";
import { activeProviderKey } from "../ai/config";
import { aiActiveFor } from "../ai/access";
import { brainContext } from "../brain/facade";
import { brainSnapshot } from "../brain/snapshot";
import { isLocked } from "../brain/brand-locks";
import { aiIntentClassifier, understand, type IntentResult } from "./intent";
import { loadOrCreatePlan, type PlanStep, type ProjectState, type TaskPlan } from "./planner";

export * from "./intent";
export * from "./planner";
export * from "./router";
export * from "./policy";
export * from "./capabilities";

/** Ce qui est déjà acquis dans le projet (lu dans le projet, le Brain et les verdicts de qualité ; aucun appel). */
export function projectState(p: Project): ProjectState {
  const copy = one<{ verdict: string }>("SELECT verdict FROM quality_checks WHERE project_id = ? AND deliverable = 'copy_shop' ORDER BY created_at DESC, rowid DESC LIMIT 1", p.id);
  return {
    analyzed: !!(p.product.name || p.product.facts.length || p.product.summary),
    brandReady: !!p.brand,
    logoLocked: isLocked(p.brand, "logo"),
    copyFinal: copy?.verdict === "FINAL",
    genericTrade: brainSnapshot(p).trade.source === "generic",
  };
}

/** Contexte d'une étape : toujours le scope du Project Brain (le planner ne construit jamais son propre contexte). */
export const stepContext = (p: Project, step: Pick<PlanStep, "requiredContext">) => (step.requiredContext ? brainContext(p, step.requiredContext) : "");

/**
 * Comprendre puis planifier une demande d'un projet. Action connue : aucun appel à l'IA. Demande libre ambiguë :
 * classement par l'IA seulement si elle est active pour le compte (sinon une question de clarification).
 */
export async function planRequest(p: Project, req: { action?: string; payload?: { regenerate?: boolean }; text?: string; requestKey: string }, opts: { classify?: Parameters<typeof understand>[1]["classify"] } = {}): Promise<{ intent: IntentResult; plan: TaskPlan | null }> {
  const aiActive = aiActiveFor(p.userId) && !!activeProviderKey("anthropic");
  const intent = await understand(req, { aiActive, classify: opts.classify ?? aiIntentClassifier({ userId: p.userId, projectId: p.id }) });
  if (!intent.intents.length) return { intent, plan: null };
  return { intent, plan: loadOrCreatePlan({ projectId: p.id, userId: p.userId, requestKey: req.requestKey, intents: intent.intents, state: projectState(p) }) };
}
