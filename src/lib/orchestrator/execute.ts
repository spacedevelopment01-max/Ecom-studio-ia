/**
 * Branchement de l'orchestrateur sur les vrais parcours du studio (phase 3B).
 *
 * INTENTION → PLAN → ROUTEUR → MOTEUR EXISTANT → BARRIÈRE DE QUALITÉ → DÉCISION → ÉTAPE SUIVANTE.
 *
 * Les moteurs ne sont pas réécrits : ce sont les exécuteurs des étapes. Le résultat d'une étape est le verdict que
 * la barrière de qualité du moteur a enregistré pendant l'étape (rien n'est re-noté). Chaque exécution d'étape est
 * un point de reprise de la tâche de fond (Phase 1) : une reprise ne refait ni ne repaie une étape terminée, et le
 * plan enregistré reste cohérent avec la tâche (même clé : « job:<id> »).
 */
import type { JobContext } from "../jobs";
import { activeProviderKey } from "../ai/config";
import { aiActiveFor } from "../ai/access";
import { loadProject, remember, type Project } from "../projects";
import type { Deliverable } from "../quality/policies";
import { intentsFromAction, understand, aiIntentClassifier, type Intent, type IntentResult } from "./intent";
import * as planner from "./planner";
import { loadOrCreatePlan, runPlan, savePlan, type PlanStep, type StepKind, type StepResult, type TaskPlan } from "./planner";
import { stepOutcome } from "./history";
import { projectState } from "./index";
import type { RouteDecision } from "./router";

/** Livrables contrôlés dont le verdict fait le résultat d'une étape. */
export const STEP_DELIVERABLES: Record<StepKind, Deliverable[]> = {
  understand: ["cutout"],
  brand_strategy: [],
  logo: ["logo_route", "logo_full", "logo_v2"],
  mockups: [],
  stock_search: ["stock_photo", "stock_v2"],
  image_generate: ["image_product", "image_lifestyle", "image_ambiance", "image_v2"],
  copy: ["copy_shop"],
  seo: ["seo_meta"],
  theme: ["theme_home", "theme_custom"],
  theme_edit: [],
  blog: ["blog_article"],
  social: ["social_plan", "social_post"],
  ad: ["ad_copy", "ad_v2"],
  video: ["video_clip", "ugc_clip", "ugc_frame", "video_v2", "video_shot_v2"],
  quality_review: [],
  organize: [],
  publish: [],
};

/** Étapes réellement exécutées par chaque action du studio : une action simple reste un petit plan. */
export const ACTION_STEPS: Record<string, StepKind[]> = {
  "brand.build": ["brand_strategy", "logo", "mockups"],
  "brand.logo": ["logo"],
  "brand.fulllogo": ["logo"],
  "brand.logo.v2": ["logo"],
  "brand.logo.v2.choose": ["logo"],
  "copy.build": ["copy"],
  "images.generate": ["image_generate"],
  "image.single": ["image_generate"],
  "image.v2": ["image_generate"],
  "stock.search": ["stock_search"],
  "shop.build": ["theme"],
  "shop.direction": ["theme"],
  "theme.custom": ["theme"],
  "shop.chat": ["theme_edit"],
  "video.render": ["video"],
  "video.ugc": ["video"],
  "ugc.script": ["video"],
  "blog.write": ["blog"],
  "calendar.plan": ["social"],
  "post.regenerate": ["social"],
  "ads.draft": ["ad"],
  "ads.v2": ["ad"],
  "video.v2": ["video"],
};

/** Actions qui demandent EXPRESSÉMENT une image générée (aucune recherche de photo libre imposée avant). */
const GENERATED_IMAGE_ACTIONS = new Set(["images.generate", "image.single"]);

/** Environnement de routage du compte (IA active, fournisseurs disponibles). */
export function routingEnv(p: Pick<Project, "userId">) {
  return { aiActive: aiActiveFor(p.userId) && !!activeProviderKey("anthropic"), available: (x: string) => !!activeProviderKey(x as never) };
}

/** Résultat d'une étape exécutée par un moteur existant (verdicts de sa barrière pendant l'étape). */
function outcome(jobId: string | null, kind: StepKind, since: number): StepResult {
  const r = jobId ? stepOutcome(jobId, STEP_DELIVERABLES[kind], since) : null;
  // Le moteur a fait ses propres reprises ciblées : le plan n'en relance pas une seconde série.
  return r ? { ...r, ownedRetries: true } : { note: "done (no quality verdict recorded for this step)" };
}

type Handler = (ctx: JobContext) => Promise<unknown>;

/**
 * Tâche de fond orchestrée : l'action devient un petit plan (ses seules étapes), routé et tracé ; le moteur existant
 * est l'exécuteur ; son résultat (inchangé) est rendu à la tâche. Reprise : le plan et les points de reprise de la
 * tâche sont relus, rien de terminé n'est relancé.
 */
export function orchestrated(action: string, handler: Handler): Handler {
  return async (ctx) => {
    const projectId: string | undefined = ctx.payload?.projectId ?? ctx.job.project_id ?? undefined;
    const intents = intentsFromAction(action, ctx.payload);
    if (!projectId || !intents) return handler(ctx);
    const p = loadProject(projectId);
    const plan = loadOrCreatePlan({
      projectId,
      userId: p.userId,
      requestKey: `job:${ctx.job.id}`,
      intents,
      state: projectState(p),
      only: ACTION_STEPS[action],
      forceGenerate: GENERATED_IMAGE_ACTIONS.has(action),
      // Une action du client est explicite : jamais sautée parce qu'un résultat existe déjà.
      regenerate: ACTION_STEPS[action],
    });
    const key = (s: PlanStep) => `plan:${s.id}:${s.attempts}`;
    const main = (ACTION_STEPS[action] ?? [])[0];
    let out: unknown;
    await runPlan(
      plan,
      async (s) => {
        const sinceKey = `${key(s)}:since`;
        const since = (ctx.checkpoint[sinceKey] as number | undefined) ?? (ctx.save(sinceKey, Date.now()), Date.now());
        // L'étape principale exécute le moteur de l'action ; les autres étapes de l'action sont faites par lui.
        if (s.kind === main) {
          out = await ctx.step(key(s), () => handler(ctx));
          const r = outcome(ctx.job.id, s.kind, since);
          const covered: StepResult["covered"] = {};
          for (const k of ACTION_STEPS[action].slice(1)) covered[k] = outcome(ctx.job.id, k, since);
          return { ...r, covered };
        }
        return { note: `done by ${main}` };
      },
      routingEnv(p),
      { onNone: "execute" },
    );
    // Reprise d'une tâche dont l'étape était déjà faite : son résultat vient du point de reprise.
    if (out === undefined) {
      const done = plan.steps.find((s) => s.kind === main);
      if (done) out = ctx.checkpoint[`plan:${done.id}:${Math.max(0, done.attempts - 1)}`];
    }
    return out;
  };
}

/**
 * Action immédiate (hors tâche de fond, ex. brouillon de publicités) : même chemin intention → plan → routeur → moteur,
 * plan enregistré sous une clé de demande.
 */
export async function orchestrateNow<T>(p: Project, action: string, requestKey: string, fn: () => Promise<T>): Promise<T> {
  const intents = intentsFromAction(action);
  if (!intents) return fn();
  const plan = loadOrCreatePlan({ projectId: p.id, userId: p.userId, requestKey, intents, state: projectState(p), only: ACTION_STEPS[action], regenerate: ACTION_STEPS[action] });
  let out: T | undefined;
  await runPlan(plan, async () => ((out = await fn()), { note: "done" }), routingEnv(p), { onNone: "execute" });
  return out as T;
}

// ---------------------------------------------------------------- création complète (pipeline.run)

/** Étape du pipeline → étape du plan (sources et détourage préparent l'analyse : pas d'étape à part). */
export const PIPELINE_KINDS: Record<string, StepKind | null> = { sources: null, cutout: null, analysis: "understand", brand: "brand_strategy", copy: "copy", images: "image_generate", video: "video", shop: "theme", calendar: "social", organize: "organize" };

/**
 * Plan de la création complète, d'après l'état RÉEL du projet : une marque déjà construite n'est pas refaite (sauf
 * relance expresse depuis l'étape « marque ») ; des textes déjà FINAL ne sont pas réécrits si la marque est gardée.
 * L'analyse est toujours refaite (relire les sources est le rôle de la création) ; les faits du client restent
 * protégés (Project Brain). Le pipeline reste l'exécuteur : ses étapes et points de reprise sont inchangés.
 */
export function pipelinePlan(ctx: JobContext, p: Project, payload: { from?: string }) {
  const st = projectState(p);
  const regenerate = payload.from && PIPELINE_KINDS[payload.from] ? [PIPELINE_KINDS[payload.from] as StepKind] : [];
  const brandKept = st.brandReady && !regenerate.includes("brand_strategy");
  const plan = loadOrCreatePlan({
    projectId: p.id,
    userId: p.userId,
    requestKey: `job:${ctx.job.id}`,
    intents: intentsFromAction("pipeline.run") ?? [],
    state: { ...st, analyzed: false, copyFinal: st.copyFinal && brandKept },
    only: Object.values(PIPELINE_KINDS).filter((k): k is StepKind => !!k),
    implicit: true,
    regenerate,
    // Les visuels du pipeline : jeu de scènes du produit, ou jeu d'un service qui cherche lui-même les photos libres d'abord.
    forceGenerate: true,
  });
  const stepOf = (id: string) => (PIPELINE_KINDS[id] ? plan.steps.find((s) => s.kind === PIPELINE_KINDS[id]) : undefined);
  return {
    plan,
    /** Raison d'un saut décidé par le plan (null : l'étape s'exécute). */
    skipped(id: string): "brand" | "copy" | null {
      const s = stepOf(id);
      return s?.status === "skipped" && (s.kind === "brand_strategy" || s.kind === "copy") ? (s.kind === "brand_strategy" ? "brand" : "copy") : null;
    },
    since(id: string) {
      const k = `plan:${id}:since`;
      return (ctx.checkpoint[k] as number | undefined) ?? (ctx.save(k, Date.now()), Date.now());
    },
    /** Résultat contrôlé d'une étape du pipeline reporté sur le plan (enregistré). */
    record(id: string, since: number, skippedByEngine: boolean) {
      const s = stepOf(id);
      if (!s || s.status !== "pending") return;
      if (skippedByEngine) Object.assign(s, { status: "skipped", reason: "skipped by the engine (see step note)" });
      else {
        const { applyResult } = planner;
        applyResult(plan, s.id, outcome(ctx.job.id, s.kind, since));
      }
      savePlan(plan);
    },
  };
}

// ---------------------------------------------------------------- exécuteurs des étapes (plans libres)

export type StepExecutorFn = (ctx: JobContext, p: Project, step: PlanStep, decision: RouteDecision) => Promise<StepResult>;

/**
 * Photos libres de droits (gratuites), contrôlées : métier pour un service, univers pour un produit.
 * Image V2 (phase 5A) : même moteur que toutes les images (brief local, recherche multisource, barrière V2,
 * bibliothèque). Recherche seule : la génération payante est une autre étape du plan.
 */
export async function findStockPhotos(ctx: JobContext, projectId: string, n = 2) {
  const p = loadProject(projectId);
  const { runImageEngineV2 } = await import("../image-v2/engine");
  const outcomes: { assetId: string | null; verdict: string }[] = [];
  if (p.business === "services") {
    const { stockPhotoSlots, serviceItems } = await import("../engine/service-media");
    for (const slot of stockPhotoSlots(p).slice(0, n)) {
      const m = /^service:(\d+)$/.exec(slot);
      const s = m ? serviceItems(p)[Number(m[1])] : undefined;
      const r = await ctx.step(`stock-v2:${slot}`, async () =>
        (await runImageEngineV2(ctx, projectId, { kind: "trade_photo", support: slot.startsWith("service:") ? "service_page" : slot === "banner" ? "banner" : "site", aspect: slot === "hero" || slot === "banner" ? "16:9" : "4:5", service: s ? { name: s.name, description: s.description } : null, slot, allowGenerate: false, name: `${p.brand?.name ?? "photo"}-${slot.replace(":", "-")}` })).outcomes.map((o) => ({ assetId: o.assetId, verdict: o.verdict })),
      );
      outcomes.push(...r);
    }
  } else {
    const r = await ctx.step("stock-v2:universe", async () => (await runImageEngineV2(ctx, projectId, { kind: "ambiance", support: "site", aspect: "16:9", count: n, allowGenerate: false })).outcomes.map((o) => ({ assetId: o.assetId, verdict: o.verdict })));
    outcomes.push(...r);
  }
  const kept = outcomes.filter((o) => o.assetId && (o.verdict === "FINAL" || o.verdict === "PROVISIONAL"));
  return { assets: kept.map((o) => o.assetId!), final: kept.some((o) => o.verdict === "FINAL"), provisional: kept.some((o) => o.verdict === "PROVISIONAL") };
}

/** Moteur existant de chaque étape (aucune logique dupliquée). */
export const STEP_EXECUTORS: Partial<Record<StepKind, StepExecutorFn>> = {
  brand_strategy: async (ctx, p, s) => {
    const since = Date.now();
    const { buildBrand } = await import("../engine/brand");
    await ctx.step(`plan:${s.id}`, async () => (await buildBrand(ctx, p.id, {})).name);
    // La création de marque fait aussi les pistes de logo et la charte : résultats reportés, pas de second moteur.
    const logo = outcome(ctx.job.id, "logo", since);
    const provisional = !!loadProject(p.id).brand?.logo.provisional;
    return { note: "brand built", covered: { logo, mockups: { note: provisional ? "logo provisional: brand book deferred until a real logo" : "brand book done by brand_strategy" } } };
  },
  logo: async (ctx, p, s) => {
    const since = Date.now();
    const { runLogoJob } = await import("../engine/logo-job");
    await ctx.step(`plan:${s.id}`, () => runLogoJob(ctx, p.id, { proposalId: null, regenerate: true }));
    return outcome(ctx.job.id, "logo", since);
  },
  stock_search: async (ctx, p, s) => {
    const since = Date.now();
    const r = await ctx.step(`plan:${s.id}`, () => findStockPhotos(ctx, p.id, 2));
    const o = outcome(ctx.job.id, "stock_search", since);
    // Aucune photo libre FINALE : la génération d'une image IA prend le relais (étape suivante du plan).
    // Photo retenue sur sa seule description (sans contrôle visuel) : PROVISOIRE, jamais présentée comme finale.
    // Point de reprise d'une version précédente (sans « final ») : une photo retenue valait FINAL.
    const cached = r as { assets: string[]; final?: boolean; provisional?: boolean };
    const final = cached.final ?? cached.assets.length > 0;
    return final ? { ...o, verdict: "FINAL" } : cached.provisional ? { ...o, verdict: "PROVISIONAL", note: "stock photo kept on metadata only" } : { verdict: "REJECTED", score: o.score ?? null, note: "no FINAL stock photo" };
  },
  image_generate: async (ctx, p, s) => {
    const since = Date.now();
    const { generateImageSet } = await import("../engine/images");
    await ctx.step(`plan:${s.id}`, async () => (await generateImageSet(ctx, p.id)).created.length);
    return outcome(ctx.job.id, "image_generate", since);
  },
  copy: async (ctx, p, s) => {
    const since = Date.now();
    const { aiShopCopyChecked } = await import("../ai/tasks");
    const { llmConfigured } = await import("../ai/llm");
    const { localCopy } = await import("../engine/local-copy");
    await ctx.step(`plan:${s.id}`, async () => {
      const fresh = loadProject(p.id);
      if (llmConfigured()) {
        const r = await aiShopCopyChecked({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${ctx.job.id}:copy` }, fresh, (m) => ctx.progress(0.5, m), (k, fn) => ctx.step(k, fn));
        remember(p.id, { kind: "artifact", key: "shop_copy", value: JSON.stringify(r.copy), source: "ai" });
      } else remember(p.id, { kind: "artifact", key: "shop_copy", value: JSON.stringify(localCopy(fresh.product, fresh.brand!, fresh)), source: "local" });
      return true;
    });
    return outcome(ctx.job.id, "copy", since);
  },
  theme: async (ctx, p, s) => {
    const since = Date.now();
    const { buildShop } = await import("../engine/shop");
    await ctx.step(`plan:${s.id}`, async () => (await buildShop(ctx, p.id)).number);
    return outcome(ctx.job.id, "theme", since);
  },
  social: async (ctx, p, s) => {
    const { startWeekCalendar } = await import("../engine/pipeline");
    await startWeekCalendar(ctx, p.id, `plan-calendar:${ctx.job.id}`);
    return { note: "7-day calendar started (child job)" };
  },
  blog: async (ctx, p, s) => {
    const since = Date.now();
    const { assertBlogWrite, writeBlogArticle } = await import("../engine/blog");
    assertBlogWrite(p.userId);
    await ctx.step(`plan:${s.id}`, async () => ((await writeBlogArticle(ctx, p.id, { topic: String(s.input.text ?? "") })) as { id?: string } | undefined)?.id ?? null);
    return outcome(ctx.job.id, "blog", since);
  },
  // Publicités (phase 6A) : Advertising Engine V2 — textes contrôlés ET créations composées (Image Engine V2).
  ad: async (ctx, p, s) => {
    const since = Date.now();
    const { runAdEngineV2 } = await import("../ads-v2/engine");
    const r = await ctx.step(`plan:${s.id}`, async () => {
      const run = await runAdEngineV2(ctx, p.id, {});
      // Annonces au format des brouillons existants (onglet Publicités) : rien n'est perdu pour l'interface actuelle.
      const ads = run.concepts.map((c) => ({ angle: c.angle.type, lever: c.angle.lever, hook: c.copy.hook, primary: c.copy.primary, headline: c.copy.headline, description: c.copy.description, cta: c.copy.cta }));
      return { ads, by: run.concepts.some((c) => c.copyBy === "ai") ? "ai" : "local", strategy: run.strategy, creatives: run.outcomes.map((o) => ({ assetId: o.assetId, verdict: o.verdict, platform: o.platform, aspect: o.aspect })) };
    });
    remember(p.id, { kind: "artifact", key: "ad_drafts", value: JSON.stringify(r), source: r.by === "ai" ? "ai" : "local" });
    return outcome(ctx.job.id, "ad", since);
  },
  // Vidéo (phase 7A) : Video Engine V2 — intention, script, storyboard, plans (génération seulement si utile et
  // dans le plafond), document éditable, barrière vidéo. Même consentement que l'ancien moteur (plan IA demandé).
  video: async (ctx, p, s) => {
    const since = Date.now();
    const { runVideoEngineV2 } = await import("../video-v2/engine");
    await ctx.step(`plan:${s.id}`, async () => (await runVideoEngineV2(ctx, p.id, { ask: { text: String(s.input.text ?? ""), platform: "reels" }, approveGeneration: true })).videoAssetId);
    return outcome(ctx.job.id, "video", since);
  },
};

/**
 * Demande libre du client (tâche « plan.run ») : comprendre → planifier → exécuter par les moteurs existants.
 * Un projet pas encore analysé passe par la création complète (pipeline.run) : jamais deux moteurs en parallèle.
 */
export async function runRequestPlan(ctx: JobContext): Promise<{ intent: IntentResult; plan: TaskPlan | null; delegated?: string }> {
  const { projectId, text } = ctx.payload as { projectId: string; text: string };
  const p = loadProject(projectId);
  const env = routingEnv(p);
  const intent = await understand({ text }, { aiActive: env.aiActive, classify: aiIntentClassifier({ userId: p.userId, projectId, jobId: ctx.job.id }) });
  if (!intent.intents.length) return { intent, plan: null };
  const state = projectState(p);
  const plan = loadOrCreatePlan({ projectId, userId: p.userId, requestKey: `job:${ctx.job.id}`, intents: intent.intents, state, input: { text }, forceGenerate: explicitGeneration(text) });
  if (plan.steps.some((s) => s.kind === "understand" && s.status === "pending")) {
    plan.status = "stopped";
    plan.warnings.push("project not analyzed yet: delegated to the creation pipeline (pipeline.run)");
    savePlan(plan);
    return { intent, plan, delegated: "pipeline.run" };
  }
  await runPlan(
    plan,
    async (s, d) => {
      const ex = STEP_EXECUTORS[s.kind];
      if (!ex) return { note: `${s.kind}: no engine step here (done elsewhere)` };
      return ex(ctx, loadProject(projectId), s, d);
    },
    env,
    { onNone: "execute" },
  );
  return { intent, plan };
}

/** La demande exige une image GÉNÉRÉE (pas de recherche de photo libre imposée avant). */
export const explicitGeneration = (text: string) => /\b(g[eé]n[eè]re|g[eé]n[eé]r(er|ation)|generate|generated|cr[eé]{1,2}e?s? par l'?ia|ia d'images?|ai[- ]generated|dessine|illustration)\b/i.test(text);

export type { Intent };
