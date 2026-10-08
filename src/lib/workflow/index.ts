/**
 * Studio Workflow V2 (phase 12A) — UNE demande du client devient un parcours complet, préparé, chiffré, autorisé,
 * exécuté et suivi. Ce n'est PAS un second orchestrateur : la demande passe par l'Intent Engine, le Task Planner et
 * le Router V2 existants (src/lib/orchestrator) ; chaque étape est exécutée par le moteur V2 déjà développé (marque,
 * images, textes / SEO, thème, publicités, vidéo, réseaux sociaux, export CMS). Ce module ajoute seulement :
 *  - la lecture des paramètres de la demande (réseaux et durée du calendrier, plateformes d'export) ;
 *  - le DEVIS avant exécution (par étape et par module, local gratuit ou IA payante) et l'AUTORISATION ;
 *  - un plafond global de dépense, vérifié avant chaque étape payante ;
 *  - l'enchaînement avec la création complète (pipeline) quand le projet n'est pas encore construit, sans refaire ce
 *    qu'elle a fait (aucun doublon) ;
 *  - le suivi : étapes, résultats, reprises, éléments à valider, coûts réels par module, liens vers les éditeurs.
 * Les modifications manuelles restent gratuites ; une étape payante n'est jamais lancée sans autorisation.
 */
import { all, json, now, one, run } from "../db";
import { id } from "../db";
import { enqueue, getJob, pipelineActive, type JobContext } from "../jobs";
import { loadProject, type Project } from "../projects";
import { aiActiveFor } from "../ai/access";
import { activeProviderKey } from "../ai/config";
import { estimateMicro, estimateTaskMicro } from "../ai/estimate";
import { EUR } from "../billing";
import { understand, type Intent } from "../orchestrator/intent";
import { buildPlan, loadOrCreatePlan, loadPlan, runPlan, savePlan, applyResult, type PlanStep, type StepKind, type TaskPlan } from "../orchestrator/planner";
import { projectState } from "../orchestrator/index";
import { routingEnv, STEP_EXECUTORS, PIPELINE_KINDS } from "../orchestrator/execute";
import { parseSocialAsk } from "../social-v2/intent";
import { CMS_PLATFORMS } from "../cms-v2/export";
import type { CmsPlatform } from "../cms-v2/types";
import { L } from "../i18n-server";
import { planOfUserId } from "../plan-gates";
import { PLANS } from "../plans";

export type WorkflowStatus = "draft" | "needs_clarification" | "queued" | "running" | "done" | "failed" | "cancelled";

export type WorkflowParams = {
  social: { days: number; perDay: number; platforms: string[] } | null;
  cmsPlatforms: CmsPlatform[];
  video: boolean;
};

export type EstimateLine = { kind: StepKind | "pipeline"; label: { fr: string; en: string }; module: string; mode: "local" | "ai" | "search" | "done"; paid: boolean; estimateMicro: number; note?: string };
export type WorkflowEstimate = { lines: EstimateLine[]; totalMicro: number; aiActive: boolean; needsCreation: boolean };

export type Workflow = {
  id: string;
  projectId: string;
  userId: string;
  request: string;
  intents: Intent[];
  params: WorkflowParams;
  estimate: WorkflowEstimate;
  approvedMicro: number | null;
  capMicro: number | null;
  status: WorkflowStatus;
  clarification: string | null;
  planId: string | null;
  pipelineJobId: string | null;
  jobId: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

/** Libellé, module et éditeur de chaque étape (affichage du suivi ; liens vers les onglets du studio). */
export const STEP_INFO: Record<StepKind, { fr: string; en: string; module: string; tab: string }> = {
  understand: { fr: "Analyse du produit ou de l'activité", en: "Product or business analysis", module: "Project Brain", tab: "produit" },
  brand_strategy: { fr: "Marque (nom, positionnement, palette, typographies)", en: "Brand (name, positioning, palette, fonts)", module: "Brand & Logo V2", tab: "marque" },
  logo: { fr: "Logo", en: "Logo", module: "Brand & Logo V2", tab: "marque" },
  mockups: { fr: "Charte et maquettes de marque", en: "Brand book and mockups", module: "Brand & Logo V2", tab: "marque" },
  stock_search: { fr: "Photos libres de droits", en: "Royalty-free photos", module: "Image V2", tab: "images" },
  image_generate: { fr: "Visuels", en: "Visuals", module: "Image V2", tab: "images" },
  copy: { fr: "Textes de la boutique ou du site", en: "Store or website copy", module: "SEO & Copy V2", tab: "produit" },
  seo: { fr: "Page principale optimisée (SEO)", en: "SEO main page", module: "SEO & Copy V2", tab: "produit" },
  theme: { fr: "Boutique / site (thème)", en: "Store / website (theme)", module: "Theme V2", tab: "boutique" },
  theme_edit: { fr: "Retouche du site", en: "Website edit", module: "Theme V2", tab: "boutique" },
  blog: { fr: "Article de blog", en: "Blog post", module: "SEO & Copy V2", tab: "blog" },
  social: { fr: "Calendrier de publications", en: "Post calendar", module: "Social V2", tab: "calendrier" },
  ad: { fr: "Campagne publicitaire", en: "Ad campaign", module: "Advertising V2", tab: "publicites" },
  video: { fr: "Vidéo", en: "Video", module: "Video V2", tab: "videos" },
  quality_review: { fr: "Relecture qualité", en: "Quality review", module: "Quality Gate", tab: "pilote" },
  organize: { fr: "Rangement des fichiers", en: "File organization", module: "Bibliothèque", tab: "fichiers" },
  cms_export: { fr: "Export du thème (plateforme)", en: "Theme export (platform)", module: "CMS V2", tab: "boutique" },
  publish: { fr: "Publication", en: "Publishing", module: "Connexions", tab: "connexions" },
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const sameAsk = (a: string, b: string) => norm(a).replace(/[\s.!]+/g, " ").trim() === norm(b).replace(/[\s.!]+/g, " ").trim();

/** Paramètres lus dans la demande (rien n'est supposé au-delà de ce qui est écrit ; défauts annoncés). */
export function parseWorkflowRequest(text: string, intents: Intent[]): { intents: Intent[]; params: WorkflowParams } {
  const t = norm(text);
  const out = [...intents];
  const cms = CMS_PLATFORMS.filter((pf) => t.includes(pf) || (pf === "woocommerce" && /\bwordpress\b/.test(t)));
  // « Ma boutique Shopify » : le thème est livré prêt à importer dans Shopify (export contrôlé, jamais envoyé seul).
  if (cms.length && !out.includes("EXPORT_CMS") && (out.includes("CREATE_SHOP") || out.includes("CREATE_THEME"))) out.push("EXPORT_CMS");
  let social: WorkflowParams["social"] = null;
  if (out.includes("SOCIAL")) {
    const a = parseSocialAsk(text);
    social = { days: a.days, perDay: a.perDay, platforms: a.platforms ?? [] };
  }
  return { intents: out, params: { social, cmsPlatforms: cms, video: out.includes("CREATE_VIDEO") } };
}

/** L'IA réelle est-elle disponible pour ce compte (forfait, interrupteur, clé) ? Sinon : moteurs locaux, 0 €. */
export const workflowAiActive = (userId: string) => aiActiveFor(userId) && !!activeProviderKey("anthropic");

/** Coût IA estimé d'une étape (micro-euros) si elle passe par l'IA ; 0 pour une étape locale ou de recherche. */
export function stepEstimateMicro(kind: StepKind, params: WorkflowParams): number {
  switch (kind) {
    case "understand":
      return estimateTaskMicro("vision_analysis", { input: 8000, output: 2000 });
    case "brand_strategy":
      return estimateTaskMicro("strategy", { input: 20000, output: 8000 }, 1.3) + estimateTaskMicro("logo_symbol", { input: 6000, output: 3000 }, 3);
    case "logo":
      return estimateTaskMicro("logo_symbol", { input: 6000, output: 3000 }, 3);
    case "image_generate":
      return estimateMicro("images");
    case "copy":
      return estimateTaskMicro("copywriting", { input: 34000, output: 12000 }, 1.5) + estimateTaskMicro("quality_control", { input: 26000, output: 2500 }, 1.5);
    case "seo":
      return estimateTaskMicro("copywriting", { input: 16000, output: 5000 }, 1.3);
    case "theme":
      return estimateMicro("theme");
    case "blog":
      return estimateMicro("blog");
    case "social": {
      const n = Math.max(1, (params.social?.days ?? 30) * (params.social?.perDay ?? 1));
      // Textes : rédaction locale gratuite ; IA seulement pour la stratégie et une relecture par lot.
      return estimateTaskMicro("social_planning", { input: 20000, output: 8000 }) + estimateTaskMicro("social_copy", { input: 6000, output: 2000 }, Math.ceil(n / 10));
    }
    case "ad":
      return estimateTaskMicro("ad_creative", { input: 14000, output: 5000 }, 1.3) + estimateMicro("image") * 2;
    case "video":
      return estimateMicro("video-clip");
    case "quality_review":
      return estimateTaskMicro("quality_control", { input: 8000, output: 1500 });
    case "organize":
      return estimateTaskMicro("classification", { input: 2000, output: 500 });
    default:
      return 0;
  }
}

/** Devis : par étape, local (gratuit) ou IA (payant, montant estimé), avec la création complète si le projet n'est pas construit. */
export function estimateWorkflow(p: Project, plan: TaskPlan, params: WorkflowParams, o: { aiActive: boolean; needsCreation: boolean; videos?: "ai" | "edited" | "none" }): WorkflowEstimate {
  const lines: EstimateLine[] = [];
  const covered = new Set<StepKind>(o.needsCreation ? (Object.values(PIPELINE_KINDS).filter(Boolean) as StepKind[]) : []);
  if (o.needsCreation) {
    const micro = o.aiActive ? estimateMicro("pipeline", { videos: o.videos ?? (params.video ? "edited" : "none") }) : 0;
    lines.push({ kind: "pipeline", label: { fr: "Création complète (analyse, marque, logo, textes, visuels, boutique)", en: "Full creation (analysis, brand, logo, copy, visuals, store)" }, module: "Pipeline", mode: o.aiActive ? "ai" : "local", paid: micro > 0, estimateMicro: micro });
  }
  for (const s of plan.steps) {
    const info = STEP_INFO[s.kind];
    if (s.status === "skipped" || (covered.has(s.kind) && !s.explicit)) {
      lines.push({ kind: s.kind, label: { fr: info.fr, en: info.en }, module: info.module, mode: "done", paid: false, estimateMicro: 0, note: s.reason ?? (covered.has(s.kind) ? "création complète" : undefined) });
      continue;
    }
    if (covered.has(s.kind)) {
      lines.push({ kind: s.kind, label: { fr: info.fr, en: info.en }, module: info.module, mode: "done", paid: false, estimateMicro: 0, note: "création complète" });
      continue;
    }
    const gate = planGate(s.kind, p.userId);
    if (gate) {
      lines.push({ kind: s.kind, label: { fr: info.fr, en: info.en }, module: info.module, mode: "done", paid: false, estimateMicro: 0, note: gate.fr });
      continue;
    }
    const local = s.task === "local" || s.task === "search" || !o.aiActive;
    const micro = local ? 0 : stepEstimateMicro(s.kind, params);
    lines.push({ kind: s.kind, label: { fr: info.fr, en: info.en }, module: info.module, mode: s.task === "search" ? "search" : local ? "local" : "ai", paid: micro > 0, estimateMicro: micro });
  }
  return { lines, totalMicro: lines.reduce((a, l) => a + l.estimateMicro, 0), aiActive: o.aiActive, needsCreation: o.needsCreation };
}

/**
 * Règles des forfaits appliquées aux étapes (mêmes règles que les écrans) : la découverte gratuite montre l'analyse,
 * la marque, le logo, les textes et l'aperçu de la boutique ; export, visuels, vidéos et calendrier sont réservés aux
 * forfaits. Renvoie la raison d'un blocage (null : permis).
 */
export function planGate(kind: StepKind | "pipeline", userId: string): { fr: string; en: string } | null {
  const plan = planOfUserId(userId);
  if (plan) return null;
  if (kind === "cms_export" || kind === "publish") return { fr: "export et publication réservés aux forfaits (la découverte gratuite reste un aperçu)", en: "export and publishing are included in the plans (the free discovery is a preview)" };
  if (kind === "image_generate" || kind === "video" || kind === "ad") return { fr: "visuels, vidéos et publicités inclus dans les forfaits", en: "visuals, videos and ads are included in the plans" };
  if (kind === "social") return { fr: "calendrier de publications inclus dans les forfaits", en: "post calendar included in the plans" };
  return null;
}

/** Jours de calendrier préparés d'un coup par le forfait (7 avec Créer, 30 avec Vendre et Dominer). */
export const planCalendarDays = (userId: string) => {
  const plan = planOfUserId(userId);
  return plan ? PLANS[plan].calendarDays : 0;
};

/** Le projet doit d'abord passer par la création complète (rien d'analysé ni de marque). */
export const needsCreation = (p: Project) => {
  const st = projectState(p);
  return !st.analyzed || !st.brandReady;
};

// ---------------------------------------------------------------- enregistrement

function rowToWorkflow(r: any): Workflow {
  return {
    id: r.id,
    projectId: r.project_id,
    userId: r.user_id,
    request: r.request,
    intents: json(r.intents_json, []),
    params: json(r.params_json, { social: null, cmsPlatforms: [], video: false }),
    estimate: json(r.estimate_json, { lines: [], totalMicro: 0, aiActive: false, needsCreation: false }),
    approvedMicro: r.approved_micro,
    capMicro: r.cap_micro,
    status: r.status,
    clarification: r.clarification,
    planId: r.plan_id,
    pipelineJobId: r.pipeline_job_id,
    jobId: r.job_id,
    error: r.error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const loadWorkflow = (wid: string) => {
  const r = one<any>("SELECT * FROM workflows WHERE id = ?", wid);
  return r ? rowToWorkflow(r) : null;
};
export const projectWorkflows = (projectId: string, limit = 10) => all<any>("SELECT * FROM workflows WHERE project_id = ? ORDER BY created_at DESC LIMIT ?", projectId, limit).map(rowToWorkflow);

function update(wid: string, patch: Partial<Record<"status" | "approved_micro" | "cap_micro" | "plan_id" | "pipeline_job_id" | "job_id" | "error" | "estimate_json", unknown>>) {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  run(`UPDATE workflows SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, ...keys.map((k) => (patch as any)[k]), now(), wid);
}

const planKey = (wid: string) => `wf:${wid}`;

/**
 * Prépare une demande : intentions (règles, IA seulement si active et la demande ambiguë), paramètres, plan
 * (enregistré, déterministe), devis. Rien n'est lancé ni dépensé.
 */
export async function prepareWorkflow(projectId: string, userId: string, text: string, o: { aiActive?: boolean; videos?: "ai" | "edited" | "none"; creationJobId?: string } = {}): Promise<Workflow> {
  const p = loadProject(projectId);
  // Même demande déjà préparée, lancée ou terminée dans les dernières 24 h : on la reprend au lieu de tout refaire
  // (pas de deuxième calendrier, campagne ni export identiques). Une autre formulation crée une nouvelle demande.
  const same = all<{ id: string; request: string }>("SELECT id, request FROM workflows WHERE project_id = ? AND status IN ('draft','queued','running','done') AND created_at > ? ORDER BY created_at DESC", projectId, now() - 86_400_000).find((w) => sameAsk(w.request, text));
  if (same) return loadWorkflow(same.id)!;
  const aiActive = o.aiActive ?? workflowAiActive(userId);
  const wid = id();
  const t = now();
  const intent = await understand({ text }, { aiActive: false });
  if (!intent.intents.length) {
    run("INSERT INTO workflows (id, project_id, user_id, request, intents_json, params_json, estimate_json, status, clarification, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", wid, projectId, userId, text.slice(0, 4000), "[]", "{}", "{}", "needs_clarification", intent.clarification ?? null, t, t);
    return loadWorkflow(wid)!;
  }
  const { intents, params } = parseWorkflowRequest(text, intent.intents);
  const creation = needsCreation(p);
  const plan = loadOrCreatePlan({ projectId, userId, requestKey: planKey(wid), intents, state: projectState(p), input: stepInput(text, params) });
  const estimate = estimateWorkflow(p, plan, params, { aiActive, needsCreation: creation, videos: o.videos });
  // Création complète déjà lancée (formulaire de démarrage, coût accepté à ce moment-là) : pas comptée deux fois.
  if (o.creationJobId) for (const l of estimate.lines) if (l.kind === "pipeline") Object.assign(l, { mode: "done", paid: false, estimateMicro: 0, note: "création complète déjà lancée" });
  estimate.totalMicro = estimate.lines.reduce((a, l) => a + l.estimateMicro, 0);
  run(
    "INSERT INTO workflows (id, project_id, user_id, request, intents_json, params_json, estimate_json, status, plan_id, pipeline_job_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    wid, projectId, userId, text.slice(0, 4000), JSON.stringify(intents), JSON.stringify(params), JSON.stringify(estimate), "draft", plan.id, o.creationJobId ?? null, t, t,
  );
  return loadWorkflow(wid)!;
}

/**
 * Demande écrite dans le formulaire de démarrage : préparée et reliée à la création complète qui vient d'être
 * lancée ; démarrée d'office si elle ne coûte rien (moteurs locaux), sinon laissée au devis à accepter.
 */
export async function attachStartRequest(projectId: string, userId: string, text: string, creationJobId: string): Promise<Workflow | null> {
  if (!text.trim()) return null;
  const wf = await prepareWorkflow(projectId, userId, text, { creationJobId });
  if (wf.status === "draft" && wf.estimate.totalMicro === 0) return startWorkflow(wf.id, {});
  return wf;
}

/** La demande remplace-t-elle le calendrier de 7 jours de la création (publications demandées) ? */
export const requestReplacesCalendar = (text: string) => /\b(instagram|tiktok|facebook|pinterest|linkedin|publications?|posts?|reseaux sociaux|calendrier)\b/.test(norm(text));

/** Entrées communes des étapes (texte de la demande, paramètres du calendrier, plateformes d'export). */
function stepInput(text: string, params: WorkflowParams, extra: Record<string, unknown> = {}) {
  return { text, socialText: text, cmsPlatforms: params.cmsPlatforms.length ? params.cmsPlatforms : undefined, ...extra };
}

export class WorkflowError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Lance un parcours préparé. Une dépense estimée > 0 exige une autorisation d'au moins ce montant et un plafond ;
 * sans IA active, tout passe par les moteurs locaux (0 €). La création complète passe d'abord si nécessaire ; la
 * suite attend qu'elle soit terminée (dépendance de tâche). Relancer ne crée aucune tâche en double.
 */
export function startWorkflow(wid: string, o: { approveMicro?: number | null; capEur?: number | null; videos?: "ai" | "edited" | "none" } = {}): Workflow {
  const wf = loadWorkflow(wid);
  if (!wf) throw new WorkflowError(404, L("Demande introuvable.", "Request not found."));
  if (wf.status === "needs_clarification") throw new WorkflowError(409, wf.clarification ?? L("Précisez votre demande.", "Please clarify your request."));
  if (wf.status !== "draft") return wf;
  const total = wf.estimate.totalMicro;
  const cap = o.capEur != null ? Math.round(o.capEur * EUR) : total;
  if (total > 0 && (o.approveMicro == null || o.approveMicro < total)) throw new WorkflowError(402, L("Cette demande utilise l'IA payante : acceptez le devis avant de lancer.", "This request uses paid AI: accept the estimate before starting."));
  if (total > 0 && cap < total) throw new WorkflowError(402, L("Le plafond est inférieur au devis : augmentez-le ou retirez des étapes.", "The cap is below the estimate: raise it or remove steps."));
  const p = loadProject(wf.projectId);
  let pipelineJobId: string | null = wf.pipelineJobId;
  if (!pipelineJobId && wf.estimate.needsCreation && needsCreation(p)) {
    const active = one<{ id: string }>("SELECT id FROM jobs WHERE project_id = ? AND type = 'pipeline.run' AND status IN ('queued','running','paused') ORDER BY created_at DESC LIMIT 1", p.id);
    pipelineJobId = active?.id ?? null;
    if (!pipelineJobId) {
      // Le calendrier de 7 jours de la création est remplacé par celui de la demande (Social V2) : pas de doublon.
      const skip = wf.intents.includes("SOCIAL") ? ["calendar"] : [];
      const job = enqueue({ userId: wf.userId, projectId: p.id, type: "pipeline.run", label: L("Création complète", "Full creation"), payload: { projectId: p.id, mode: "autopilot", input: { videos: o.videos ?? (wf.params.video ? "edited" : "none") }, skip, workflowId: wid }, idempotencyKey: `${planKey(wid)}:pipeline` });
      pipelineJobId = job.id;
    }
  }
  const job = enqueue({ userId: wf.userId, projectId: p.id, type: "workflow.run", label: L("Votre demande", "Your request"), payload: { projectId: p.id, workflowId: wid }, idempotencyKey: `${planKey(wid)}:run`, dependsOn: pipelineJobId ? [pipelineJobId] : [] });
  update(wid, { status: "queued", approved_micro: o.approveMicro ?? (total ? null : 0), cap_micro: cap, pipeline_job_id: pipelineJobId, job_id: job.id });
  return loadWorkflow(wid)!;
}

export function cancelWorkflow(wid: string) {
  const wf = loadWorkflow(wid);
  if (!wf) return null;
  if (wf.jobId) run("UPDATE jobs SET status = 'cancelled', updated_at = ? WHERE id = ? AND status IN ('queued','paused')", now(), wf.jobId);
  if (["draft", "queued", "needs_clarification"].includes(wf.status)) update(wid, { status: "cancelled" });
  return loadWorkflow(wid);
}

/** Dépense IA réelle (micro-euros) des tâches du parcours (création complète, suite, sous-tâches), par étape. */
export function workflowSpend(wf: Pick<Workflow, "jobId" | "pipelineJobId">): { totalMicro: number; byStep: Record<string, number> } {
  const roots = [wf.jobId, wf.pipelineJobId].filter(Boolean) as string[];
  if (!roots.length) return { totalMicro: 0, byStep: {} };
  const jobs = new Set(roots);
  for (const r of all<{ id: string }>(`SELECT id FROM jobs WHERE parent_id IN (${roots.map(() => "?").join(",")})`, ...roots)) jobs.add(r.id);
  const ids = [...jobs];
  const rows = all<{ step: string | null; cost: number; job_id: string }>(`SELECT step, cost, job_id FROM ai_calls WHERE job_id IN (${ids.map(() => "?").join(",")})`, ...ids);
  const byStep: Record<string, number> = {};
  for (const r of rows) {
    const k = r.job_id === wf.pipelineJobId ? `pipeline:${(r.step ?? "").split(/[:/]/)[0]}` : (/^plan:([a-z_]+)/.exec(r.step ?? "")?.[1] ?? "autre");
    byStep[k] = (byStep[k] ?? 0) + r.cost;
  }
  return { totalMicro: rows.reduce((a, r) => a + r.cost, 0), byStep };
}

/**
 * Tâche « workflow.run » : exécute le plan de la demande par l'orchestrateur et les moteurs V2. Les étapes faites
 * par la création complète de ce parcours sont reportées comme faites (jamais refaites) ; chaque étape payante est
 * précédée d'une vérification du plafond ; tout est enregistré après chaque étape (reprise sans doublon).
 */
export async function runWorkflow(ctx: JobContext) {
  const wf = loadWorkflow(String(ctx.payload.workflowId));
  if (!wf) throw new Error("workflow introuvable");
  update(wf.id, { status: "running" });
  try {
    const p = loadProject(wf.projectId);
    const allowPaid = wf.estimate.totalMicro > 0 && (wf.approvedMicro ?? 0) >= wf.estimate.totalMicro;
    const plan = loadOrCreatePlan({ projectId: p.id, userId: p.userId, requestKey: planKey(wf.id), intents: wf.intents, state: projectState(p), input: stepInput(wf.request, wf.params) });
    // Étapes de l'entrée enrichies de l'autorisation (montant accepté, plafond) : lues par les moteurs qui produisent.
    for (const s of plan.steps) {
      s.input = { ...s.input, allowPaid, approvedMicro: wf.approvedMicro ?? 0, maxCostEur: (wf.capMicro ?? 0) / EUR, maxSocialDays: planCalendarDays(p.userId) || undefined, socialPlanId: `wf-social-${wf.id}` };
      // Règle du forfait : l'étape n'est pas faite, la raison est affichée (jamais contournée).
      const gate = s.status === "pending" ? planGate(s.kind, p.userId) : null;
      if (gate) Object.assign(s, { status: "skipped", reason: `plan: ${gate.en}` });
    }
    markCoveredByCreation(plan, wf.pipelineJobId);
    savePlan(plan);
    const cap = wf.capMicro ?? 0;
    const est = new Map(wf.estimate.lines.map((l) => [l.kind, l.estimateMicro] as const));
    const n = plan.steps.length;
    let i = 0;
    await runPlan(
      plan,
      async (s, d) => {
        ctx.progress(Math.min(0.95, i++ / Math.max(1, n)), `${STEP_INFO[s.kind].fr}…`);
        // Plafond global : une étape payante qui le dépasserait n'est pas lancée (rien de payé au-delà).
        if ((d.mode === "llm" || d.mode === "image" || d.mode === "video") && (est.get(s.kind) ?? 0) > 0) {
          const spent = workflowSpend(loadWorkflow(wf.id)!).totalMicro;
          if (spent + (est.get(s.kind) ?? 0) > cap) return { verdict: "REJECTED", note: `budget cap reached (${(spent / EUR).toFixed(2)} € spent of ${(cap / EUR).toFixed(2)} €): step not started` };
        }
        const ex = STEP_EXECUTORS[s.kind];
        if (!ex) return { note: `${s.kind}: done by the creation or not needed here` };
        return ex(ctx, loadProject(p.id), s, d);
      },
      routingEnv(p),
      { onNone: "execute" },
    );
    update(wf.id, { status: plan.steps.some((s) => s.status === "failed") ? "failed" : "done", error: plan.steps.filter((s) => s.status === "failed").map((s) => `${s.kind}: ${s.reason}`).join(" ; ") || null });
    return { planId: plan.id, steps: plan.steps.map((s) => ({ kind: s.kind, status: s.status, reason: s.reason })) };
  } catch (e) {
    // Panne ou interruption : la tâche sera reprise (points de reprise) ; le statut reflète l'échec en attendant.
    update(wf.id, { status: "failed", error: (e as Error).message.slice(0, 400) });
    throw e;
  }
}

/** Étapes déjà réalisées par la création complète de CE parcours : reportées, jamais refaites. */
function markCoveredByCreation(plan: TaskPlan, pipelineJobId: string | null) {
  if (!pipelineJobId) return;
  const job = getJob(pipelineJobId);
  if (!job || job.status !== "done") return;
  const steps = (json<Record<string, any>>(job.checkpoint, {}).__steps ?? {}) as Record<string, { status: string }>;
  for (const [pid, st] of Object.entries(steps)) {
    const kind = PIPELINE_KINDS[pid];
    if (!kind) continue;
    const s = plan.steps.find((x) => x.kind === kind && x.status === "pending");
    if (!s) continue;
    if (st.status === "done") applyResult(plan, s.id, { note: `done by the full creation (job ${pipelineJobId.slice(0, 8)})` });
    else if (st.status === "skipped") Object.assign(s, { status: "skipped", reason: "skipped by the full creation" });
  }
  // Photos libres : la création complète a déjà cherché et composé les visuels.
  if (steps.images?.status === "done") {
    const s = plan.steps.find((x) => x.kind === "stock_search" && x.status === "pending");
    if (s) applyResult(plan, s.id, { note: "visuals already searched and made by the full creation" });
  }
  // La création complète fait aussi le logo et la charte avec la marque.
  for (const k of ["logo", "mockups"] as StepKind[]) {
    const s = plan.steps.find((x) => x.kind === k && x.status === "pending");
    if (s && plan.steps.find((x) => x.kind === "brand_strategy")?.status !== "pending" && steps.brand?.status === "done") applyResult(plan, s.id, { note: "done with the brand by the full creation" });
  }
}

// ---------------------------------------------------------------- suivi

export type Validation = { key: string; label: { fr: string; en: string }; tab: string; count?: number };

/** Ce qui attend une décision du client (jamais validé à sa place). */
export function pendingValidations(p: Project, wf?: Workflow | null): Validation[] {
  const out: Validation[] = [];
  const open = (p.product.questions ?? []).filter((q) => !q.answer).length;
  if (open) out.push({ key: "questions", label: { fr: "Répondre aux questions sur votre produit ou activité", en: "Answer the questions about your product or business" }, tab: "pilote", count: open });
  if (p.brand && p.brand.logo?.status !== "validated") out.push({ key: "logo", label: { fr: "Choisir ou valider votre logo", en: "Choose or validate your logo" }, tab: "marque" });
  const posts = one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id = ? AND engine = 'v2' AND status IN ('planned','review','draft')", p.id)?.n ?? 0;
  if (posts) out.push({ key: "posts", label: { fr: "Relire et approuver les publications (rien n'est publié sans votre accord)", en: "Review and approve the posts (nothing is published without your approval)" }, tab: "calendrier", count: posts });
  const ads = one<{ n: number }>("SELECT COUNT(DISTINCT doc_key) n FROM ad_documents WHERE project_id = ?", p.id)?.n ?? 0;
  if (ads) out.push({ key: "ads", label: { fr: "Relire les publicités avant toute diffusion", en: "Review the ads before running them" }, tab: "publicites", count: ads });
  const exp = all<{ meta: string }>("SELECT meta FROM assets WHERE project_id = ? AND role = 'theme-export' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 5", p.id).map((r) => json<any>(r.meta, {}));
  if (exp.some((m) => m.gate?.verdict === "PROVISIONAL")) out.push({ key: "export", label: { fr: "Installer le thème exporté sur votre boutique et vérifier (installation réelle non vérifiée par le studio)", en: "Install the exported theme on your store and check it (real installation not verified by the studio)" }, tab: "boutique" });
  if (wf && wf.status === "draft" && wf.estimate.totalMicro > 0) out.unshift({ key: "estimate", label: { fr: "Accepter le devis avant le lancement", en: "Accept the estimate before starting" }, tab: "pilote" });
  return out;
}

/** Vue complète d'un parcours pour le studio. */
export function workflowView(wid: string) {
  const wf = loadWorkflow(wid);
  if (!wf) return null;
  const p = loadProject(wf.projectId);
  const plan = wf.planId ? loadPlan(wf.planId) : null;
  const job = wf.jobId ? getJob(wf.jobId) : null;
  const pipe = wf.pipelineJobId ? getJob(wf.pipelineJobId) : null;
  const spend = workflowSpend(wf);
  const steps = (plan?.steps ?? []).map((s: PlanStep) => ({ kind: s.kind, status: s.status, reason: s.reason ?? null, verdict: s.result?.verdict ?? null, note: s.result?.note ?? null, attempts: s.attempts, label: { fr: STEP_INFO[s.kind].fr, en: STEP_INFO[s.kind].en }, module: STEP_INFO[s.kind].module, tab: STEP_INFO[s.kind].tab, mode: s.route?.mode ?? null, spentMicro: spend.byStep[s.kind] ?? 0 }));
  return {
    workflow: wf,
    steps,
    job: job ? { id: job.id, status: job.status, progress: job.progress, message: job.message, error: job.error, attempts: job.attempts } : null,
    pipeline: pipe ? { id: pipe.id, status: pipe.status, progress: pipe.progress, message: pipe.message } : null,
    spentMicro: spend.totalMicro,
    spentByStep: spend.byStep,
    validations: pendingValidations(p, wf),
    warnings: plan?.warnings ?? [],
  };
}

export { buildPlan };
