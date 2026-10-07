/**
 * Enregistrement des verdicts de la barrière (table quality_checks) et lecture de l'historique d'un candidat :
 * note de chaque essai, défauts relevés, gain de qualité d'une reprise (calculé) et coût de cette reprise.
 */
import { all, id, now, one, run } from "../db";
import { currentTrace } from "../ai/trace";
import type { GateDecision } from "./gate";
import { L } from "../i18n-server";

export type CheckRefs = { userId: string; projectId?: string | null; jobId?: string | null; candidateId?: string | null; assetId?: string | null; previousCheckId?: string | null };

/** Enregistre un verdict ; renvoie son identifiant (null si l'écriture échoue : le verdict reste valable en mémoire). */
export function saveCheck(d: GateDecision, refs: CheckRefs): string | null {
  const t = currentTrace();
  const cid = id();
  try {
    run(
      `INSERT INTO quality_checks (id, created_at, user_id, project_id, job_id, step, deliverable, candidate_id, asset_id, attempt, checker, checked, confidence, score, criteria_json, blocking_json, fatal_json, feedback, verdict, fatal, action, reason, policy_version, previous_check_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      cid,
      now(),
      refs.userId,
      refs.projectId ?? t.projectId ?? null,
      refs.jobId ?? t.jobId ?? null,
      t.step ?? null,
      d.deliverable,
      refs.candidateId ?? t.candidateId ?? null,
      refs.assetId ?? null,
      d.attempt,
      d.checker,
      d.checked ? 1 : 0,
      d.confidence,
      d.score,
      JSON.stringify(Object.fromEntries(d.weakCriteria.map((k) => [k, "weak"]))),
      JSON.stringify(d.blockingCodes),
      JSON.stringify(d.fatalCodes),
      d.feedback.slice(0, 2000),
      d.verdict,
      d.fatal ? 1 : 0,
      d.action,
      d.reason.slice(0, 500),
      d.policyVersion,
      refs.previousCheckId ?? null,
    );
    return cid;
  } catch (e) {
    console.warn("[qualité] verdict non enregistré :", (e as Error).message);
    return null;
  }
}

/** Champ court écrit dans assets.meta.gate : ce que les autres modules lisent pour décider d'une réutilisation. */
export function gateMeta(d: GateDecision, checkId: string | null) {
  return {
    verdict: d.verdict,
    fatal: d.fatal,
    score: d.score,
    checked: d.checked,
    deliverable: d.deliverable,
    reason: d.reason,
    policyVersion: d.policyVersion,
    checkId,
    ...(d.provisional ? { provisional: d.provisional } : {}),
  };
}
export type GateMeta = ReturnType<typeof gateMeta>;

/** Statut d'asset correspondant à un verdict (FINAL : le statut habituel du module est conservé). */
export function statusFor(d: Pick<GateDecision, "verdict">, finalStatus: "ready" | "review" | "approved" = "review"): "ready" | "review" | "approved" | "rejected" {
  return d.verdict === "FINAL" ? finalStatus : d.verdict === "REJECTED" ? "rejected" : "review";
}

export type TrailStep = { checkId: string; attempt: number; score: number | null; verdict: string; feedback: string; reason: string; qualityDelta: number | null; costMicro: number };

/**
 * Historique d'un candidat, essai par essai : note, défauts relevés (consigne de la reprise suivante), gain de
 * qualité par rapport à l'essai précédent (score après − score avant) et coût des appels de cet essai.
 */
export function qualityTrail(candidateId: string): TrailStep[] {
  const rows = all<{ id: string; attempt: number; score: number | null; verdict: string; feedback: string; reason: string; previous_check_id: string | null }>(
    "SELECT id, attempt, score, verdict, feedback, reason, previous_check_id FROM quality_checks WHERE candidate_id = ? ORDER BY attempt, created_at",
    candidateId,
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  return rows.map((r, i) => {
    const prev = r.previous_check_id ? byId.get(r.previous_check_id) ?? one<{ score: number | null }>("SELECT score FROM quality_checks WHERE id = ?", r.previous_check_id) : i > 0 ? rows[i - 1] : null;
    const cost = one<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE candidate_id = ? AND attempt = ?", candidateId, r.attempt)?.c ?? 0;
    return {
      checkId: r.id,
      attempt: r.attempt,
      score: r.score,
      verdict: r.verdict,
      feedback: r.feedback,
      reason: r.reason,
      qualityDelta: prev && prev.score != null && r.score != null ? Math.round((r.score - prev.score) * 10) / 10 : null,
      costMicro: cost,
    };
  });
}

/**
 * Enregistre le verdict d'un asset produit (image, photo libre…) et renvoie son statut et ses mentions : meta.gate
 * (lu par la réutilisation automatique) et, si le verdict n'est pas FINAL, un avertissement toujours explicite.
 */
export function gateSave(refs: Omit<CheckRefs, "previousCheckId">, d: GateDecision) {
  const checkId = saveCheck(d, refs);
  const reason = d.verdict === "FINAL" ? "" : [d.reason, d.feedback].filter(Boolean).join(L(" — ", " — "));
  return { status: statusFor(d, "review") as "rejected" | "review", meta: { gate: gateMeta(d, checkId), ...(reason ? { qcWarning: reason } : {}) } };
}
