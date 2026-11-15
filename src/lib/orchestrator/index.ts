/**
 * Enveloppe des tâches de fond : ACTION DU STUDIO → INTENTION → PETIT PLAN → ROUTEUR → MOTEUR → RÉSULTAT CONTRÔLÉ.
 * Ici : l'état acquis du projet et le contexte d'une étape. Les demandes en texte libre passent par SINA.
 */
import type { Project } from "../projects";
import { one } from "../db";
import { brainContext } from "../brain/facade";
import { brainSnapshot } from "../brain/snapshot";
import { isLocked } from "../brain/brand-locks";
import type { PlanStep, ProjectState } from "./planner";

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
    // Image V2 (phase 5A) : un produit est compris par sa famille (modèle des catégories), un service par son métier.
    genericTrade: (() => {
      const s = brainSnapshot(p);
      return p.business === "services" ? s.trade.source === "generic" : (s.category?.source ?? "generic") === "generic";
    })(),
  };
}

/** Contexte d'une étape : toujours le scope du Project Brain (le planner ne construit jamais son propre contexte). */
export const stepContext = (p: Project, step: Pick<PlanStep, "requiredContext">) => (step.requiredContext ? brainContext(p, step.requiredContext) : "");
