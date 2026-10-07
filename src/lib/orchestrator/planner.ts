/**
 * Task Planner (phase 3A) : une demande (intentions) devient un plan d'étapes avec dépendances, contexte du Brain
 * requis, objectif de qualité et classe de coût. Le plan est DYNAMIQUE : une étape inutile est sautée, une étape
 * corrigeable est reprise, une direction rejetée arrête ce qui en dépend, et le plan peut être complété (replan).
 *
 * Il n'exécute rien de coûteux par lui-même : chaque étape est confiée à un exécuteur (branché en 3B) après le
 * choix du routeur. Il est enregistré à chaque étape (table task_plans) : une reprise ne refait pas ce qui est fait.
 */
import crypto from "node:crypto";
import type { TaskId } from "../ai/config";
import { withTrace } from "../ai/trace";
import { json, now, one, run } from "../db";
import type { Scope } from "../brain/views";
import { POLICIES, type Deliverable } from "../quality/policies";
import type { Verdict } from "../quality/gate";
import type { Intent } from "./intent";
import { nextAction, route, type RouteDecision, type RouteRequest, type RoutingHistory } from "./router";

export type StepKind =
  | "understand"
  | "brand_strategy"
  | "logo"
  | "mockups"
  | "stock_search"
  | "image_generate"
  | "copy"
  | "seo"
  | "theme"
  | "theme_edit"
  | "blog"
  | "social"
  | "ad"
  | "video"
  | "quality_review"
  | "organize"
  | "publish";

export type StepStatus = "pending" | "done" | "skipped" | "rejected" | "failed";
export type CostClass = "free" | "low" | "medium" | "high";

export type StepResult = {
  verdict?: Verdict;
  score?: number | null;
  fatal?: boolean;
  fatalCodes?: string[];
  /** Le fournisseur a échoué (panne, délai) : rien n'est accepté ; repli ou reprise. */
  providerError?: boolean;
  note?: string;
};

export type PlanStep = {
  id: string;
  kind: StepKind;
  /** Tâche du routage (« local » : moteur du studio ; « search » : banques de photos libres). */
  task: TaskId | "local" | "search";
  /** Dépendances DURES : leur rejet arrête cette étape (ex. maquettes ← logo). */
  dependencies: string[];
  /** Ordre seulement : attend que ces étapes soient terminées, quel que soit leur résultat (ex. image IA après photos libres). */
  after: string[];
  input: Record<string, unknown>;
  /** Scope du Project Brain lu par l'étape (le planner ne construit jamais son propre contexte). */
  requiredContext: Exclude<Scope, "all"> | null;
  deliverable: Deliverable | null;
  qualityTarget: number | null;
  costClass: CostClass;
  status: StepStatus;
  /** Demandée explicitement par le client (jamais sautée parce qu'un résultat existe déjà). */
  explicit: boolean;
  attempts: number;
  /** Pannes de fournisseur (n'entament pas les reprises de qualité). */
  providerFailures: number;
  reason?: string;
  route?: Pick<RouteDecision, "mode" | "provider" | "model" | "reason" | "fallback" | "escalation">;
  result?: StepResult;
};

export type TaskPlan = {
  id: string;
  projectId: string;
  userId: string;
  requestKey: string;
  intents: Intent[];
  steps: PlanStep[];
  status: "active" | "done" | "stopped";
  /** Limites connues qui pèsent sur ce plan (jamais masquées). */
  warnings: string[];
};

type Template = { task: PlanStep["task"]; scope: PlanStep["requiredContext"]; deliverable: Deliverable | null; cost: CostClass; deps: StepKind[]; after?: StepKind[] };

/** Gabarits des étapes : tâche de routage, scope du Brain, livrable contrôlé, coût, dépendances dures et d'ordre (si présentes). */
export const STEP_TEMPLATES: Record<StepKind, Template> = {
  understand: { task: "vision_analysis", scope: null, deliverable: null, cost: "medium", deps: [] },
  brand_strategy: { task: "strategy", scope: "brand", deliverable: null, cost: "high", deps: ["understand"] },
  logo: { task: "logo_symbol", scope: "logo", deliverable: "logo_route", cost: "high", deps: ["brand_strategy"] },
  mockups: { task: "image_generation", scope: "image", deliverable: "image_product", cost: "high", deps: ["logo"] },
  stock_search: { task: "search", scope: "stock", deliverable: "stock_photo", cost: "free", deps: ["understand"] },
  image_generate: { task: "image_generation", scope: "image", deliverable: "image_lifestyle", cost: "high", deps: ["brand_strategy"], after: ["stock_search"] },
  copy: { task: "copywriting", scope: "shop_copy", deliverable: "copy_shop", cost: "medium", deps: ["brand_strategy", "understand"] },
  seo: { task: "copywriting", scope: "seo", deliverable: "seo_meta", cost: "low", deps: ["copy"] },
  // Le thème peut utiliser un logo provisoire : le logo et les visuels ne sont qu'un ordre, pas une condition.
  theme: { task: "theme_design", scope: "theme", deliverable: "theme_home", cost: "high", deps: ["copy"], after: ["logo", "image_generate", "stock_search"] },
  theme_edit: { task: "theme_edit", scope: "theme", deliverable: null, cost: "low", deps: [] },
  blog: { task: "blog_writing", scope: "blog", deliverable: "blog_article", cost: "medium", deps: ["brand_strategy"] },
  social: { task: "social_planning", scope: "social", deliverable: "social_plan", cost: "medium", deps: ["brand_strategy"] },
  ad: { task: "ad_creative", scope: "advertising", deliverable: "ad_copy", cost: "medium", deps: ["brand_strategy"], after: ["image_generate", "stock_search"] },
  video: { task: "video_direction", scope: "video", deliverable: "video_clip", cost: "high", deps: ["brand_strategy"], after: ["image_generate", "stock_search"] },
  quality_review: { task: "quality_control", scope: "qc", deliverable: null, cost: "low", deps: [], after: ["copy", "seo", "theme", "blog", "social", "ad", "video"] },
  organize: { task: "classification", scope: null, deliverable: null, cost: "low", deps: [] },
  publish: { task: "local", scope: null, deliverable: null, cost: "free", deps: ["theme", "quality_review"] },
};

/** Étapes de chaque intention (dans l'ordre). Les visuels passent TOUJOURS par la recherche de photos libres d'abord. */
const INTENT_STEPS: Record<Intent, StepKind[]> = {
  ANALYZE_PRODUCT: ["understand"],
  CREATE_BRAND: ["understand", "brand_strategy", "logo", "mockups"],
  CREATE_LOGO: ["logo"],
  IMPROVE_LOGO: ["logo"],
  FIND_STOCK_IMAGE: ["stock_search"],
  GENERATE_IMAGE: ["stock_search", "image_generate"],
  WRITE_PRODUCT_COPY: ["copy"],
  SEO: ["seo"],
  CREATE_SHOP: ["understand", "stock_search", "image_generate", "copy", "theme"],
  CREATE_THEME: ["theme"],
  EDIT_THEME: ["theme_edit"],
  BLOG: ["blog"],
  SOCIAL: ["social"],
  CREATE_AD: ["ad"],
  CREATE_VIDEO: ["video"],
  ORGANIZE_FILES: ["organize"],
  PUBLISH: ["publish"],
};

/** Étapes que l'intention vise directement (jamais sautées parce qu'un résultat existe déjà). */
const EXPLICIT: Partial<Record<Intent, StepKind[]>> = {
  CREATE_LOGO: ["logo"],
  IMPROVE_LOGO: ["logo"],
  WRITE_PRODUCT_COPY: ["copy"],
  SEO: ["seo"],
  CREATE_THEME: ["theme"],
  EDIT_THEME: ["theme_edit"],
  GENERATE_IMAGE: ["image_generate"],
  FIND_STOCK_IMAGE: ["stock_search"],
  BLOG: ["blog"],
  SOCIAL: ["social"],
  CREATE_AD: ["ad"],
  CREATE_VIDEO: ["video"],
  ANALYZE_PRODUCT: ["understand"],
  CREATE_BRAND: ["brand_strategy"],
};

const CONTENT: StepKind[] = ["copy", "seo", "theme", "blog", "social", "ad", "video"];

/** Ce qui est déjà acquis dans le projet (le plan ne refait pas un résultat FINAL ou validé). */
export type ProjectState = {
  analyzed: boolean;
  brandReady: boolean;
  logoLocked: boolean;
  copyFinal: boolean;
  /** Compréhension métier issue du repli générique (produit sans entrée dans le registre). */
  genericTrade: boolean;
};

const ALREADY: Partial<Record<StepKind, (s: ProjectState) => string | null>> = {
  understand: (s) => (s.analyzed ? "already analyzed" : null),
  brand_strategy: (s) => (s.brandReady ? "brand already exists" : null),
  logo: (s) => (s.logoLocked ? "logo validated by the client (locked)" : null),
  copy: (s) => (s.copyFinal ? "copy already FINAL: not rewritten" : null),
};

export const planId = (projectId: string, requestKey: string) => `plan_${crypto.createHash("sha256").update(`${projectId}|${requestKey}`).digest("hex").slice(0, 20)}`;

function makeStep(kind: StepKind, explicit: boolean, input: Record<string, unknown>): PlanStep {
  const t = STEP_TEMPLATES[kind];
  return { id: kind, kind, task: t.task, dependencies: [], after: [], input, requiredContext: t.scope, deliverable: t.deliverable, qualityTarget: t.deliverable ? POLICIES[t.deliverable].final : null, costClass: t.cost, status: "pending", explicit, attempts: 0, providerFailures: 0 };
}

/** Relie les dépendances aux seules étapes présentes, puis saute ce qui est déjà acquis (sauf demande explicite). */
function finalize(steps: PlanStep[], state: ProjectState) {
  const kinds = new Set(steps.map((s) => s.kind));
  for (const s of steps) {
    s.dependencies = STEP_TEMPLATES[s.kind].deps.filter((d) => kinds.has(d));
    s.after = (STEP_TEMPLATES[s.kind].after ?? []).filter((d) => kinds.has(d));
    const already = s.status === "pending" && !s.explicit ? ALREADY[s.kind]?.(state) : null;
    if (already) Object.assign(s, { status: "skipped", reason: already });
  }
  return steps;
}

/** Plan d'une demande (intentions) pour un projet. Déterministe : même demande → même plan, même identifiant. */
export function buildPlan(a: { projectId: string; userId: string; requestKey: string; intents: Intent[]; state: ProjectState; input?: Record<string, unknown> }): TaskPlan {
  const steps: PlanStep[] = [];
  for (const intent of a.intents)
    for (const kind of INTENT_STEPS[intent]) {
      const explicit = !!EXPLICIT[intent]?.includes(kind);
      const ex = steps.find((s) => s.kind === kind);
      if (ex) ex.explicit ||= explicit;
      else steps.push(makeStep(kind, explicit, { ...(a.input ?? {}), ...(intent === "IMPROVE_LOGO" && kind === "logo" ? { mode: "improve" } : {}) }));
    }
  // Relecture finale seulement quand plusieurs contenus sont produits ensemble.
  if (steps.filter((s) => CONTENT.includes(s.kind)).length >= 2) steps.push(makeStep("quality_review", false, {}));
  const warnings: string[] = [];
  if (a.state.genericTrade && steps.some((s) => s.kind === "stock_search" || s.kind === "image_generate"))
    warnings.push("product category understood through the GENERIC trade fallback (Phase 2 limitation): stock queries and scene hints are not specific to this product");
  return { id: planId(a.projectId, a.requestKey), projectId: a.projectId, userId: a.userId, requestKey: a.requestKey, intents: a.intents, steps: finalize(steps, a.state), status: "active", warnings };
}

/** Complète un plan avec de nouvelles intentions : ce qui est fait reste fait. */
export function replan(plan: TaskPlan, intents: Intent[], state: ProjectState): TaskPlan {
  const fresh = buildPlan({ projectId: plan.projectId, userId: plan.userId, requestKey: plan.requestKey, intents: [...new Set([...plan.intents, ...intents])], state });
  const steps = fresh.steps.map((s) => {
    const old = plan.steps.find((o) => o.kind === s.kind);
    return old && old.status !== "pending" ? old : old ? { ...old, explicit: old.explicit || s.explicit } : s;
  });
  return { ...plan, intents: fresh.intents, steps: finalize(steps, state), status: "active", warnings: fresh.warnings };
}

const SATISFIED: StepStatus[] = ["done", "skipped"];

/** Étapes prêtes : en attente, dépendances dures faites ou sautées, étapes « après » terminées (quel que soit leur résultat). */
export function readySteps(plan: TaskPlan): PlanStep[] {
  const st = (id: string) => plan.steps.find((x) => x.id === id)!.status;
  return plan.steps.filter((s) => s.status === "pending" && s.dependencies.every((d) => SATISFIED.includes(st(d))) && s.after.every((d) => st(d) !== "pending"));
}

/** Arrête ce qui dépend (directement ou non) d'une étape rejetée ou en échec. */
function blockDependents(plan: TaskPlan, from: PlanStep) {
  const blocked = new Set([from.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const s of plan.steps)
      if (s.status === "pending" && s.dependencies.some((d) => blocked.has(d)) && !blocked.has(s.id)) {
        // Seules les dépendances DURES arrêtent une étape (une étape « après » attend, puis continue).
        Object.assign(s, { status: "skipped", reason: `${from.kind} ${from.status}: not needed / not possible` });
        blocked.add(s.id);
        changed = true;
      }
  }
}

/**
 * Applique le résultat d'une étape : FINAL → fait (aucune reprise) ; RETRY corrigeable → reprise ciblée ;
 * REJECTED / défaut fatal → abandon et arrêt de ce qui en dépend ; panne du fournisseur → rien n'est accepté.
 * Règles conditionnelles : photo libre FINAL → aucune image IA générée pour ce besoin.
 */
export function applyResult(plan: TaskPlan, stepId: string, r: StepResult): TaskPlan {
  const s = plan.steps.find((x) => x.id === stepId);
  if (!s) return plan;
  s.result = r;
  if (r.providerError) {
    // Rien n'est accepté. Une nouvelle tentative passe par un fournisseur de repli (même barrière de qualité) ;
    // après deux pannes, l'étape échoue (jamais un résultat médiocre gardé faute de mieux).
    s.providerFailures++;
    s.status = s.providerFailures >= 2 ? "failed" : "pending";
    s.reason = s.status === "failed" ? "provider unavailable twice: step failed, nothing accepted" : "provider error: nothing accepted, fallback provider on next attempt";
    if (s.status === "failed") blockDependents(plan, s);
    if (plan.steps.every((x) => x.status !== "pending")) plan.status = "done";
    return plan;
  }
  if (!s.deliverable || !r.verdict) {
    Object.assign(s, { status: "done", reason: r.note ?? "done" });
  } else {
    const next = nextAction({ deliverable: s.deliverable, verdict: r.verdict, score: r.score ?? null, fatal: !!r.fatal, attempt: s.attempts, fatalCodes: r.fatalCodes });
    s.reason = next.reason;
    if (next.action === "stop" || next.action === "keep_best") s.status = "done";
    else if (next.action === "correct") s.status = "pending";
    else {
      s.status = "rejected";
      blockDependents(plan, s);
    }
  }
  s.attempts++;
  // Photo libre jugée FINALE : la génération d'une image IA pour le même besoin est inutile.
  if (s.kind === "stock_search" && s.status === "done" && r.verdict === "FINAL") {
    const gen = plan.steps.find((x) => x.kind === "image_generate" && x.status === "pending");
    if (gen) Object.assign(gen, { status: "skipped", reason: "stock photo FINAL: no AI image needed" });
  }
  if (plan.steps.every((x) => x.status !== "pending")) plan.status = "done";
  return plan;
}

/** Historique de routage d'une étape (pour l'escalade ou la correction ciblée). */
export function stepHistory(s: PlanStep): RoutingHistory | undefined {
  if (!s.result) return undefined;
  return {
    attempt: s.attempts + s.providerFailures,
    lastScore: s.result.score ?? null,
    lastVerdict: s.result.verdict,
    lastProvider: s.route?.provider,
    lastModel: s.route?.model,
    failure: s.result.providerError ? "provider_error" : s.result.verdict === "RETRY" ? "quality" : undefined,
  };
}

// ---------------------------------------------------------------- enregistrement et exécution

export function savePlan(plan: TaskPlan) {
  run(
    "INSERT INTO task_plans (id, project_id, user_id, request_key, intents_json, steps_json, warnings_json, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET intents_json = excluded.intents_json, steps_json = excluded.steps_json, warnings_json = excluded.warnings_json, status = excluded.status, updated_at = excluded.updated_at",
    plan.id, plan.projectId, plan.userId, plan.requestKey, JSON.stringify(plan.intents), JSON.stringify(plan.steps), JSON.stringify(plan.warnings), plan.status, now(), now(),
  );
}

export function loadPlan(id: string): TaskPlan | null {
  const r = one<{ id: string; project_id: string; user_id: string; request_key: string; intents_json: string; steps_json: string; warnings_json: string; status: TaskPlan["status"] }>("SELECT * FROM task_plans WHERE id = ?", id);
  return r ? { id: r.id, projectId: r.project_id, userId: r.user_id, requestKey: r.request_key, intents: json(r.intents_json, []), steps: json(r.steps_json, []), warnings: json(r.warnings_json, []), status: r.status } : null;
}

/** Plan existant (reprise) ou nouveau plan enregistré. */
export function loadOrCreatePlan(a: Parameters<typeof buildPlan>[0]): TaskPlan {
  const existing = loadPlan(planId(a.projectId, a.requestKey));
  if (existing) return existing;
  const plan = buildPlan(a);
  savePlan(plan);
  return plan;
}

export type StepExecutor = (step: PlanStep, decision: RouteDecision) => Promise<StepResult>;

/**
 * Exécute un plan étape par étape : routage (Router V2) → exécution → résultat contrôlé → suite (continuer,
 * reprendre, sauter, arrêter). Enregistré après chaque étape : une reprise ne refait (ni ne repaie) rien de fait.
 * Les appels d'IA d'une étape sont tracés avec l'intention, le plan et l'étape.
 */
export async function runPlan(plan: TaskPlan, execute: StepExecutor, env: Pick<RouteRequest, "aiActive" | "available" | "overrides" | "policy">, opts: { maxRounds?: number } = {}): Promise<TaskPlan> {
  const max = opts.maxRounds ?? 50;
  for (let round = 0; round < max && plan.status === "active"; round++) {
    const ready = readySteps(plan);
    if (!ready.length) {
      plan.status = plan.steps.some((s) => s.status === "pending") ? "stopped" : "done";
      break;
    }
    for (const s of ready) {
      const decision: RouteDecision =
        s.task === "local"
          ? { mode: "local", provider: "local", model: "local-engine", tier: "local", reason: "deterministic local task", fallback: false, escalation: false, qualityTarget: s.qualityTarget }
          : s.task === "search"
            ? { mode: "search", provider: "stock", model: "stock-search", tier: "local", reason: "free stock search before any paid image", fallback: false, escalation: false, qualityTarget: s.qualityTarget }
            : route({ task: s.task, deliverable: s.deliverable ?? undefined, qualityTarget: s.qualityTarget ?? undefined, history: stepHistory(s), step: s.kind, ...env });
      s.route = { mode: decision.mode, provider: decision.provider, model: decision.model, reason: decision.reason, fallback: decision.fallback, escalation: decision.escalation };
      if (decision.mode === "none") {
        Object.assign(s, { status: "failed", reason: decision.reason });
        blockDependents(plan, s);
        continue;
      }
      const result = await withTrace({ intent: plan.intents.join("+"), planId: plan.id, stepId: s.id, routing: s.route }, () => execute(s, decision));
      applyResult(plan, s.id, result);
      savePlan(plan);
    }
  }
  savePlan(plan);
  return plan;
}
