/**
 * Historique de qualité transmis au routeur (phase 3B), et résultat contrôlé d'une étape.
 *
 * Deux sources, sans rien changer aux signatures des moteurs :
 *  - reprise d'un CANDIDAT par un moteur (piste de logo, logo complet… : withCandidate(id, tentative)) → dernier verdict
 *    de ce candidat dans quality_checks et dernier modèle de la même tâche dans ai_calls ;
 *  - reprise d'une ÉTAPE du plan → historique de l'étape porté par la trace (withTrace({ history })).
 * Seules les tâches qui PRODUISENT le livrable en tiennent compte : un échec du candidat n'est pas un échec du
 * contrôleur (la relecture n'est jamais escaladée parce que le logo relu était mauvais).
 */
import type { TaskId } from "../ai/config";
import { currentTrace } from "../ai/trace";
import { all, one } from "../db";
import type { Verdict } from "../quality/gate";
import type { Deliverable } from "../quality/policies";
import type { RoutingHistory } from "./router";
import type { StepResult } from "./planner";

const CHECKERS: TaskId[] = ["quality_control", "cutout_check", "classification", "photo_triage"];

/** Historique de la tentative en cours (null : première tentative ou tâche de contrôle). */
export function routingHistoryFor(task: TaskId): RoutingHistory | undefined {
  if (CHECKERS.includes(task)) return undefined;
  const t = currentTrace();
  if (t.jobId && t.candidateId && (t.attempt ?? 0) > 0) {
    const q = one<{ score: number | null; verdict: Verdict; attempt: number }>(
      "SELECT score, verdict, attempt FROM quality_checks WHERE job_id = ? AND candidate_id = ? AND attempt < ? ORDER BY attempt DESC, created_at DESC, rowid DESC LIMIT 1",
      t.jobId,
      t.candidateId,
      t.attempt,
    );
    if (q) {
      const c = one<{ provider: string; requested_model: string }>(
        "SELECT provider, requested_model FROM ai_calls WHERE job_id = ? AND candidate_id = ? AND task = ? AND attempt < ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
        t.jobId,
        t.candidateId,
        task,
        t.attempt,
      );
      return { attempt: t.attempt, lastScore: q.score, lastVerdict: q.verdict, lastProvider: c?.provider, lastModel: c?.requested_model, failure: q.verdict === "RETRY" ? "quality" : undefined };
    }
  }
  return t.history;
}

/**
 * Résultat contrôlé d'une étape exécutée par un moteur existant : verdicts enregistrés par sa propre barrière de
 * qualité pendant l'étape (rien n'est re-noté ici). Un candidat FINAL suffit ; sinon le meilleur verdict ; la
 * tentative la plus haute du moteur est remontée (le plan n'ajoute jamais une reprise déjà faite).
 */
export function stepOutcome(jobId: string, deliverables: Deliverable[], since: number): StepResult | null {
  if (!deliverables.length) return null;
  const rows = all<{ verdict: Verdict; score: number | null; attempt: number; fatal: number; fatal_json: string }>(
    `SELECT verdict, score, attempt, fatal, fatal_json FROM quality_checks WHERE job_id = ? AND created_at >= ? AND deliverable IN (${deliverables.map(() => "?").join(",")})`,
    jobId,
    since,
    ...deliverables,
  );
  if (!rows.length) return null;
  const rank: Record<Verdict, number> = { FINAL: 3, PROVISIONAL: 2, RETRY: 1, REJECTED: 0 };
  const best = [...rows].sort((a, b) => rank[b.verdict] - rank[a.verdict] || (b.score ?? -1) - (a.score ?? -1))[0];
  const attempt = Math.max(...rows.map((r) => r.attempt));
  return { verdict: best.verdict, score: best.score, attempt, fatal: best.verdict === "REJECTED" && !!best.fatal, fatalCodes: best.fatal ? JSON.parse(best.fatal_json || "[]") : [] };
}
