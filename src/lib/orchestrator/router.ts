/**
 * Router V2 (phase 3A) : choisit l'outil (local, recherche, IA texte, image, vidéo), le fournisseur et le modèle
 * d'une étape à partir de la TÂCHE, de l'ÉTAPE, de la DIFFICULTÉ, du TYPE D'ENTRÉE, de l'OBJECTIF DE QUALITÉ et de
 * l'HISTORIQUE (note précédente, verdict, cause d'échec). Il décide aussi de la suite d'un résultat contrôlé :
 * continuer, corriger, abandonner, s'arrêter.
 *
 * Règles :
 *  - qualité avant prix : le niveau vient de la politique (policy.ts), le coût ne sert qu'à départager des modèles
 *    de même niveau ; jamais d'essai « bon marché » quand la tâche demande d'emblée un modèle fort ;
 *  - déterministe d'abord : une demande simple qui le permet passe par le moteur local (0 €) ; sans IA active
 *    (forfait Découverte, fournisseur désactivé), toujours le local ;
 *  - repli : un autre fournisseur CAPABLE, et la barrière de qualité reste la même (jamais un résultat médiocre
 *    accepté parce qu'un fournisseur est en panne) ; aucun fournisseur capable → l'étape n'est pas faite ;
 *  - raisons synthétiques seulement (jamais de raisonnement détaillé).
 */
import type { ProviderId, Route, TaskId } from "../ai/config";
import { all } from "../db";
import { POLICIES, type Deliverable } from "../quality/policies";
import type { GateDecision, Verdict } from "../quality/gate";
import { MODELS, TIER_RANK, capableModels, modelInfo, type Capability, type Tier } from "./capabilities";
import { MEDIA_DEFAULTS, TEXT_MODEL_BY_TIER, routingPolicy, type TaskPolicy } from "./policy";

export type Difficulty = "simple" | "standard" | "complex";
export type InputType = "text" | "image" | "mixed" | "mask" | "video";
export type FailureKind = "quality" | "provider_error" | "parse" | "refusal";

/** Ce qui s'est passé aux tentatives précédentes de la même étape. */
export type RoutingHistory = {
  attempt?: number;
  lastScore?: number | null;
  lastVerdict?: Verdict;
  lastProvider?: string;
  lastModel?: string;
  failure?: FailureKind;
};

export type RouteRequest = {
  task: TaskId;
  step?: string;
  difficulty?: Difficulty;
  inputType?: InputType;
  deliverable?: Deliverable;
  /** Note visée (par défaut : seuil FINAL de la politique de qualité du livrable). */
  qualityTarget?: number;
  history?: RoutingHistory;
  /** L'IA est-elle active pour ce compte (forfait, fournisseur non désactivé) ? Sinon : moteur local. */
  aiActive: boolean;
  /** Fournisseur utilisable (clé configurée, non désactivé). */
  available: (p: ProviderId) => boolean;
  /** Routes fixées par l'administration (« ai.routes ») : priment hors escalade. */
  overrides?: Partial<Record<TaskId, Partial<Route>>>;
  /** Le moteur peut-il faire cette étape sans IA ? (faux pour un appel déjà engagé vers l'IA) */
  allowLocal?: boolean;
  policy?: Record<TaskId, TaskPolicy>;
};

export type RouteMode = "local" | "search" | "llm" | "image" | "video" | "none";

export type RouteDecision = {
  mode: RouteMode;
  provider: string;
  model: string;
  effort?: Route["effort"];
  tier: Tier;
  /** Raison synthétique tracée (ex. « complex creative direction »). */
  reason: string;
  fallback: boolean;
  escalation: boolean;
  /** Objectif de qualité inchangé par un repli ou une escalade. */
  qualityTarget: number | null;
};

const modeOf = (needs: Capability[]): RouteMode =>
  needs.includes("video_generation") ? "video" : needs.includes("image_generation") || needs.includes("image_edit") ? "image" : needs.includes("stock_search") ? "search" : "llm";

const nextTier = (t: Tier, max: Tier): Tier => {
  const order: Tier[] = ["light", "standard", "strong"];
  const i = Math.max(0, order.indexOf(t));
  const n = order[Math.min(i + 1, order.length - 1)];
  return TIER_RANK[n] <= TIER_RANK[max] ? n : max;
};

/** Coût moyen observé par modèle pour une tâche (ai_calls, 90 jours) : départage seulement, jamais le niveau. */
export function observedCost(task: TaskId): Record<string, { calls: number; avgCostMicro: number }> {
  try {
    const rows = all<{ m: string; n: number; c: number }>(
      "SELECT provider || ':' || requested_model m, COUNT(*) n, AVG(cost) c FROM ai_calls WHERE task = ? AND status = 'ok' AND created_at > ? GROUP BY m",
      task,
      Date.now() - 90 * 86_400_000,
    );
    return Object.fromEntries(rows.map((r) => [r.m, { calls: r.n, avgCostMicro: Math.round(r.c ?? 0) }]));
  } catch {
    return {};
  }
}

/** Choisit l'outil et le modèle d'une étape. */
export function route(req: RouteRequest): RouteDecision {
  const policy = (req.policy ?? routingPolicy())[req.task];
  const target = req.qualityTarget ?? (req.deliverable ? POLICIES[req.deliverable].final : null);
  const base = { fallback: false, escalation: false, qualityTarget: target };
  const local = (reason: string): RouteDecision => ({ mode: "local", provider: "local", model: "local-engine", tier: "local", reason, ...base });

  // Déterministe d'abord : sans IA active, ou demande simple faisable par le moteur local.
  if (!req.aiActive) return local("AI not active for this account: local engine");
  if (req.allowLocal !== false && req.difficulty === "simple" && policy.localWhenSimple) return local("deterministic local task");

  const needs = [...policy.needs];
  if ((req.inputType === "image" || req.inputType === "mixed") && !needs.includes("vision") && needs.includes("text")) needs.push("vision");
  // Retouche par masque autour du produit réel : seul un modèle d'édition convient.
  if (req.inputType === "mask") needs.splice(0, needs.length, ...needs.filter((c) => c !== "image_generation"), "image_edit");
  const mode = modeOf(needs);

  // Niveau : celui de la politique ; directement le plus fort permis si la demande est complexe (pas d'essai
  // faible voué à l'échec) ; un cran au-dessus après un échec de QUALITÉ (ou de format) au niveau précédent.
  const h = req.history ?? {};
  const max = policy.escalateTo ?? policy.tier;
  let tier: Tier = policy.tier;
  let escalation = false;
  let reason = policy.why;
  if (req.difficulty === "complex" && TIER_RANK[max] > TIER_RANK[tier]) {
    tier = max;
    reason = "complex request: strongest permitted model directly";
  }
  const lastTier = h.lastModel ? (modelInfo(h.lastProvider ?? "anthropic", h.lastModel)?.tier ?? tier) : tier;
  // Après un échec de qualité ou de format, jamais de retour à un niveau plus faible que celui déjà essayé.
  if ((h.failure === "quality" || h.failure === "parse") && TIER_RANK[lastTier] > TIER_RANK[tier]) tier = lastTier;
  if ((h.failure === "quality" || h.failure === "parse") && (h.attempt ?? 0) > 0 && TIER_RANK[max] > TIER_RANK[lastTier]) {
    tier = nextTier(lastTier, max);
    escalation = true;
    reason = h.failure === "parse" ? `invalid output at ${lastTier} tier, escalate to ${tier}` : `previous attempt ${h.lastScore ?? "?"}${target != null ? ` below target ${target}` : ""} at ${lastTier} tier, escalate to ${tier}`;
  } else if (h.failure === "quality" && h.lastScore != null && (h.attempt ?? 0) > 0) {
    reason = `previous attempt ${h.lastScore}, targeted correction`;
  }

  // Route fixée par l'administration : respectée (sauf escalade décidée sur un échec de qualité).
  const ov = req.overrides?.[req.task];
  const failed = h.failure === "provider_error" ? `${h.lastProvider}:${h.lastModel}` : null;
  if (ov?.provider && ov.model && !escalation && `${ov.provider}:${ov.model}` !== failed && req.available(ov.provider)) {
    return { mode, provider: ov.provider, model: ov.model, effort: ov.effort ?? policy.effort, tier: modelInfo(ov.provider, ov.model)?.tier ?? tier, reason: `admin route · ${reason}`, ...base, escalation: false };
  }

  // Modèle préféré du niveau (texte) ou fournisseur par défaut (média) ; sinon repli sur un fournisseur capable.
  const preferred = mode === "llm" ? { provider: "anthropic", model: TEXT_MODEL_BY_TIER[tier === "local" ? "light" : tier] } : MEDIA_DEFAULTS[req.task] ?? null;
  const usable = (m: { provider: string; model: string }) => m.provider !== "local" && req.available(m.provider as ProviderId) && `${m.provider}:${m.model}` !== failed;
  const prefInfo = preferred ? modelInfo(preferred.provider, preferred.model) : null;
  if (preferred && prefInfo && needs.every((c) => prefInfo.capabilities.includes(c)) && usable(preferred)) {
    return { mode, provider: preferred.provider, model: preferred.model, effort: prefInfo.effort ? policy.effort : undefined, tier: prefInfo.tier, reason, ...base, escalation };
  }
  // Repli : même niveau ou plus fort d'abord, puis le meilleur niveau restant ; à niveau égal, le coût observé départage.
  const cost = observedCost(req.task);
  const candidates = capableModels(needs)
    .filter(usable)
    .sort((a, b) => {
      const da = TIER_RANK[a.tier] >= TIER_RANK[tier] ? 0 : 1;
      const db = TIER_RANK[b.tier] >= TIER_RANK[tier] ? 0 : 1;
      if (da !== db) return da - db;
      if (a.tier !== b.tier) return da === 0 ? TIER_RANK[a.tier] - TIER_RANK[b.tier] : TIER_RANK[b.tier] - TIER_RANK[a.tier];
      return (cost[`${a.provider}:${a.model}`]?.avgCostMicro ?? Infinity) - (cost[`${b.provider}:${b.model}`]?.avgCostMicro ?? Infinity);
    });
  const pick = candidates[0];
  if (!pick) return { mode: "none", provider: "none", model: "none", tier, reason: `no available provider with ${needs.join("+")}`, ...base, escalation };
  return {
    mode,
    provider: pick.provider,
    model: pick.model,
    effort: pick.effort ? policy.effort : undefined,
    tier: pick.tier,
    reason: `fallback: ${failed ? `${failed} failed` : `${preferred?.provider ?? "preferred"} unavailable`} → ${pick.provider}:${pick.model} (same quality gate)`,
    ...base,
    fallback: true,
    escalation,
  };
}

/** Suite d'un résultat contrôlé par la barrière de qualité. */
export type NextAction = { action: "stop" | "correct" | "abandon" | "keep_best"; reason: string };

export function nextAction(d: Pick<GateDecision, "deliverable" | "verdict" | "score" | "fatal" | "attempt"> & { fatalCodes?: string[] }): NextAction {
  const p = POLICIES[d.deliverable];
  const s = d.score == null ? "?" : String(d.score);
  if (d.verdict === "FINAL") return { action: "stop", reason: `final at ${s} (target ${p.final}): no retry` };
  if (d.verdict === "PROVISIONAL") return { action: "stop", reason: `provisional at ${s}: usable as placeholder, no paid retry` };
  if (d.verdict === "REJECTED" || d.fatal) return { action: "abandon", reason: d.fatal ? `fatal defect${d.fatalCodes?.length ? ` (${d.fatalCodes.join(", ")})` : ""}: abandon direction` : `score ${s} below floor ${p.retryFloor}: abandon direction` };
  if (d.attempt < p.maxRetries) return { action: "correct", reason: `previous attempt ${s}, targeted correction` };
  return { action: "keep_best", reason: `retries exhausted (${p.maxRetries}): keep best, flagged` };
}

/** Modèles connus (diagnostic). */
export const knownModels = () => MODELS.map((m) => `${m.provider}:${m.model} (${m.tier})`);
