/**
 * Enveloppe des tâches de fond du studio : chaque action devient un petit plan tracé.
 *
 * ACTION → PLAN → ROUTEUR → MOTEUR EXISTANT → BARRIÈRE DE QUALITÉ → RÉSULTAT.
 *
 * Les moteurs ne sont pas réécrits : ce sont les exécuteurs des étapes. Le résultat d'une étape est le verdict que
 * la barrière de qualité du moteur a enregistré pendant l'étape (rien n'est re-noté). Chaque exécution d'étape est
 * un point de reprise de la tâche de fond (Phase 1) : une reprise ne refait ni ne repaie une étape terminée, et le
 * plan enregistré reste cohérent avec la tâche (même clé : « job:<id> »).
 */
import type { JobContext } from "../jobs";
import { activeProviderKey } from "../ai/config";
import { aiActiveFor } from "../ai/access";
import { loadProject, type Project } from "../projects";
import type { Deliverable } from "../quality/policies";
import { intentsFromAction } from "./intent";
import { loadOrCreatePlan, runPlan, type PlanStep, type StepKind, type StepResult } from "./planner";
import { stepOutcome } from "./history";
import { projectState } from "./index";

/** Livrables contrôlés dont le verdict fait le résultat d'une étape. */
export const STEP_DELIVERABLES: Record<StepKind, Deliverable[]> = {
  understand: ["cutout"],
  brand_strategy: [],
  logo: ["logo_route", "logo_full", "logo_v2", "logo_artwork"],
  mockups: [],
  stock_search: ["stock_photo", "stock_v2"],
  image_generate: ["image_product", "image_lifestyle", "image_ambiance", "image_v2"],
  copy: ["copy_shop"],
  seo: ["seo_meta", "seo_product_v2", "seo_service_v2", "seo_category_v2", "seo_home_v2", "seo_metadata_v2"],
  theme: ["theme_home", "theme_custom"],
  theme_edit: [],
  blog: ["blog_article", "seo_article_v2"],
  social: ["social_plan", "social_post", "social_post_v2"],
  ad: ["ad_copy", "ad_v2"],
  video: ["video_clip", "ugc_clip", "ugc_frame", "video_v2", "video_shot_v2"],
  quality_review: [],
  organize: [],
  cms_export: ["cms_export_v2"],
  publish: [],
};

/** Étapes réellement exécutées par chaque action du studio : une action simple reste un petit plan. */
export const ACTION_STEPS: Record<string, StepKind[]> = {
  "brand.build": ["brand_strategy", "logo", "mockups"],
  "brand.logo": ["logo"],
  "brand.fulllogo": ["logo"],
  "brand.logo.v2": ["logo"],
  "brand.logo.v2.choose": ["logo"],
  "brand.logo.v2.redraw": ["logo"],
  "copy.build": ["copy"],
  "images.generate": ["image_generate"],
  "image.single": ["image_generate"],
  "image.v2": ["image_generate"],
  "image.ai_post": ["image_generate"],
  "video.bank.stock": ["video"],
  "video.bank.ai": ["video"],
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
  "video.scenes": ["video"],
  "content.v2": ["seo"],
  "social.v2.produce": ["social"],
};

/** Actions qui demandent EXPRESSÉMENT une image générée (aucune recherche de photo libre imposée avant). */
const GENERATED_IMAGE_ACTIONS = new Set(["images.generate", "image.single", "image.ai_post"]);

/** Environnement de routage du compte (IA active, fournisseurs disponibles). */
export function routingEnv(p: Pick<Project, "userId" | "id">) {
  return { aiActive: aiActiveFor(p.userId, p.id) && !!activeProviderKey("anthropic"), available: (x: string) => !!activeProviderKey(x as never) };
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
