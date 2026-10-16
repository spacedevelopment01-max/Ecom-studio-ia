import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { all, now } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { L } from "@/lib/i18n-server";
import { aiActiveFor } from "@/lib/ai/access";
import { assertCalendarDays, assertPerDayRequest, planOfUserId, requirePlan } from "@/lib/plan-gates";
import { PLANS } from "@/lib/plans";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { createPlanV2, publishingDates } from "@/lib/social-v2/planner";
import { applySocialEdit, approve, planFromAsk, projectAccounts } from "@/lib/social-v2/engine";
import { socialStrategy } from "@/lib/social-v2/strategy";
import { longTermStrategy } from "@/lib/social-v2/strategy-long";
import { verifiedFacts } from "@/lib/seo-v2/facts";
import { mainCity } from "@/lib/seo-v2/keywords";
import { PLATFORM_SPECS, PLATFORMS } from "@/lib/social-v2/platforms";
import { estimateProduction, postsOfPlan, probableOf, produceBatch } from "@/lib/social-v2/production";
import { budgetPctOf, capPctToMicro } from "@/lib/ai/budget-pct";
import { realSocialDeps } from "@/lib/social-v2/deps";
import { schedulePosts, setPlanPaused, unschedule } from "@/lib/social-v2/scheduler";
import { checkPost, varietyReport } from "@/lib/social-v2/quality";
import { socialStats } from "@/lib/social-v2/analytics";
import { AUTOMATION_KINDS, createAutomation, listAutomations, setAutomationStatus } from "@/lib/social-v2/automations";
import { postViewV2 } from "@/lib/social-v2/view";
import { createOnePost, produceParams, quoteOne } from "@/lib/social-v2/single";
import { getAsset } from "@/lib/library";
import { resolveSubject, subjectOptions } from "@/lib/creative-subject";

export const runtime = "nodejs";

/** Tableau de bord social : stratégie, calendriers, publications de la période, comptes, statistiques réelles. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const u = new URL(req.url).searchParams;
  const from = Number(u.get("from") ?? now() - 7 * 86_400_000);
  const to = Number(u.get("to") ?? now() + 62 * 86_400_000);
  const rows = all<any>("SELECT p.*, c.name AS connection_name FROM posts p LEFT JOIN connections c ON c.id = p.connection_id WHERE p.project_id = ? AND p.status != 'cancelled' AND ((p.scheduled_at >= ? AND p.scheduled_at < ?) OR p.scheduled_at IS NULL) ORDER BY COALESCE(p.scheduled_at, p.created_at) LIMIT 800", p.id, from, to);
  const plans = all<{ id: string; params: string; status: string; engine: string; paused: number; created_at: number }>("SELECT id, params, status, engine, paused, created_at FROM content_plans WHERE project_id = ? ORDER BY created_at DESC LIMIT 20", p.id);
  const latest = plans.find((x) => x.engine === "v2");
  const lang = p.settings.language === "en" ? "en" : "fr";
  const facts = verifiedFacts(p);
  // Temps forts des 90 prochains jours (dates réelles) et stratégie à 12 mois.
  const strategy = socialStrategy(p, { lang, startDate: new Date().toISOString().slice(0, 10), days: 90, facts });
  const perDay = Number(JSON.parse(latest?.params || "{}").perDay) || 1;
  return ok({
    strategy,
    longTerm: longTermStrategy(p, strategy, { lang, perDay, city: mainCity(facts.area), declaredAudience: facts.audience ?? null, connected: projectAccounts(p).filter((a) => a.status === "active").length }),
    plans: plans.map((x) => ({ id: x.id, engine: x.engine, paused: !!x.paused, createdAt: x.created_at, params: JSON.parse(x.params || "{}") })),
    posts: rows.map((r) => postViewV2(p, r, { gate: r.engine === "v2" })),
    variety: latest ? varietyReport(p.id, latest.id) : null,
    accounts: projectAccounts(p),
    platforms: PLATFORMS.map((pl) => ({ ...PLATFORM_SPECS[pl] })),
    stats: socialStats(p.id, user.id),
    automations: listAutomations(p.id),
    ai: aiActiveFor(p.userId, p.id),
    /** Produits ou services du projet pour la création guidée (photo de référence comprise). */
    subjects: subjectOptions(p).map((x) => ({ kind: x.kind, key: x.key, name: x.name, hasPhoto: !!x.referenceAssetId, photoId: x.referenceAssetId })),
    canPublish: !!planOfUserId(user.id, p.id),
    limits: (() => {
      const pl = planOfUserId(user.id, p.id);
      return pl ? { perDay: PLANS[pl].postsPerDay, calendarDays: PLANS[pl].calendarDays } : null;
    })(),
    timezone: p.settings.timezone,
  });
});

const ids = z.array(z.string().max(40)).max(1000).optional();
const Plan = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  days: z.number().int().min(1).max(366).optional(),
  perDay: z.number().int().min(1).max(5),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  slots: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(5).optional(),
  timezone: z.string().min(1).max(60),
  platforms: z.array(z.object({ platform: z.enum(PLATFORMS), connectionId: z.string().max(40).nullable().optional() })).min(1).max(6),
  distribution: z.enum(["rotate", "all"]).optional(),
  formatMix: z.record(z.enum(["image", "carousel", "video", "text"]), z.number().min(0).max(100)).optional(),
  priority: z.array(z.string().max(40)).max(10).optional(),
  exclude: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(366).optional(),
  link: z.string().max(500).nullable().optional(),
  approval: z.enum(["each", "week", "plan"]).optional(),
  structure: z.enum(["weekly", "pillars"]).optional(),
  goal: z.enum(["awareness", "sales", "community", "balanced"]).optional(),
  commercial: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  focus: z.array(z.string().max(80)).max(10).optional(),
});

/**
 * Actions : « plan » / « ask » (niveau 1, gratuit) ; « estimate » puis « produce » (niveau 2 : gratuit, ou payant
 * seulement avec l'estimation acceptée) ; « approve », « schedule », « unschedule », « pause », « resume »
 * (niveau 3) ; « edit » (retouche en conversation) ; « automation » / « automation_status ».
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(
    req,
    z.discriminatedUnion("action", [
      z.object({ action: z.literal("plan"), request: Plan }),
      z.object({ action: z.literal("ask"), text: z.string().min(5).max(600) }),
      z.object({ action: z.literal("estimate"), ids, planId: z.string().max(80).optional(), allowPaid: z.boolean().default(false), aiImages: z.number().int().min(0).max(60).nullable().optional(), aiBackground: z.boolean().optional(), replace: z.boolean().optional() }),
      z.object({ action: z.literal("produce"), ids, planId: z.string().max(80).optional(), allowPaid: z.boolean().default(false), maxCostEur: z.number().min(0).max(100).default(0), /** Plafond saisi par le client en % de son budget IA (prioritaire sur maxCostEur). */ maxCostPct: z.number().min(0).max(100).optional(), approvedEstimateMicro: z.number().int().min(0).nullable().optional(), distinctImages: z.number().int().min(1).max(60).nullable().optional(), aiImages: z.number().int().min(0).max(60).nullable().optional(), aiBackground: z.boolean().optional(), replace: z.boolean().optional() }),
      z.object({ action: z.literal("approve"), ids, planId: z.string().max(80).optional(), from: z.number().optional(), to: z.number().optional() }),
      z.object({ action: z.literal("schedule"), ids, planId: z.string().max(80).optional() }),
      z.object({ action: z.literal("unschedule"), ids }),
      z.object({ action: z.literal("pause"), planId: z.string().max(80) }),
      z.object({ action: z.literal("resume"), planId: z.string().max(80) }),
      z.object({ action: z.literal("edit"), text: z.string().min(3).max(600), confirm: z.boolean().optional(), maxCostEur: z.number().min(0).max(20).optional(), maxCostPct: z.number().min(0).max(100).optional(), planId: z.string().max(80).optional() }),
      z.object({ action: z.literal("automation"), kind: z.enum(AUTOMATION_KINDS), config: z.record(z.string(), z.unknown()).optional() }),
      z.object({ action: z.literal("quote_one"), kind: z.enum(["image", "video"]), mode: z.enum(["free", "ai_image", "ai_post", "ai_video"]), networks: z.number().int().min(1).max(6) }),
      z.object({
        action: z.literal("create_one"),
        kind: z.enum(["image", "video"]),
        mode: z.enum(["free", "ai_image", "ai_post", "ai_video"]),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        timezone: z.string().min(1).max(60),
        platforms: z.array(z.object({ platform: z.enum(PLATFORMS), connectionId: z.string().max(40).nullable().optional() })).min(1).max(6),
        pillar: z.string().max(40).optional(),
        headline: z.string().max(120).optional(),
        /** Ancien champ (photo de la banque posée sous une mise en page du studio) : ignoré, images finales 100 % IA. */
        backgroundId: z.string().max(64).optional(),
        /** Produit (clé, « main » pour le principal) ou service choisi pour le visuel (création guidée). */
        subject: z.discriminatedUnion("kind", [z.object({ kind: z.literal("product"), key: z.string().min(1).max(80) }), z.object({ kind: z.literal("service"), name: z.string().min(1).max(120) })]).optional(),
        /** Demande libre du client pour ce visuel. */
        request: z.string().max(600).optional(),
        /** Prix vu et accepté par le client (payant). */
        approvedEstimateMicro: z.number().int().min(0).nullable().optional(),
      }),
      z.object({ action: z.literal("automation_status"), automationId: z.string().max(40), status: z.enum(["active", "paused"]) }),
    ]),
  );
  const own = (list: string[] | undefined, planId?: string) => {
    const xs = list?.length ? list : planId ? postsOfPlan(planId) : [];
    return xs.filter((x) => all("SELECT 1 FROM posts WHERE id = ? AND project_id = ?", x, p.id).length);
  };
  const planOwned = (planId: string) => {
    if (!all("SELECT 1 FROM content_plans WHERE id = ? AND project_id = ?", planId, p.id).length) throw new HttpError(404, L("Calendrier introuvable.", "Calendar not found."));
  };
  switch (b.action) {
    case "plan": {
      // Période demandée (jours de calendrier, jours exclus compris) : limite du forfait, comme le calendrier existant.
      const span = b.request.endDate ? Math.round((Date.parse(b.request.endDate) - Date.parse(b.request.startDate)) / 86_400_000) + 1 : (b.request.days ?? 30);
      assertCalendarDays(user, p.id, span);
      // 1, 3 ou 5 publications par jour selon le forfait : jamais plus, même en modifiant la requête.
      assertPerDayRequest(p.id, b.request.perDay);
      if (!publishingDates(b.request).length) throw new HttpError(400, L("Aucun jour de publication dans cette période.", "No publishing day in this period."));
      for (const x of b.request.platforms) if (x.connectionId && !projectAccounts(p).some((a) => a.id === x.connectionId)) throw new HttpError(400, L("Compte inconnu.", "Unknown account."));
      return ok(createPlanV2(p, { ...b.request, lang: p.settings.language === "en" ? "en" : "fr" }));
    }
    case "ask": {
      // Demande écrite : mêmes limites que le formulaire (jours de calendrier et publications par jour du forfait).
      const plan = requirePlan(user, p.id);
      const r = planFromAsk(p, b.text, { lang: p.settings.language === "en" ? "en" : "fr", maxDays: PLANS[plan].calendarDays, maxPerDay: PLANS[plan].postsPerDay });
      return ok(r);
    }
    case "estimate": {
      // Coût probable et plafond conseillé, en % du budget IA du mois (jamais en euros).
      const est = estimateProduction(p, own(b.ids, b.planId), realSocialDeps(null, p, aiActiveFor(p.userId, p.id)), { allowPaid: b.allowPaid, aiImages: b.aiImages ?? null, aiBackground: !!b.aiBackground, replace: !!b.replace });
      return ok({ ...est, pct: budgetPctOf(p.userId, est.estimateMicro, p.id), capPct: budgetPctOf(p.userId, est.capMicro, p.id) });
    }
    case "produce": {
      const list = own(b.ids, b.planId);
      if (b.allowPaid && aiActiveFor(p.userId, p.id)) {
        const job = enqueue({ userId: user.id, projectId: p.id, type: "social.v2.produce", label: L("Production des publications", "Producing posts"), payload: { projectId: p.id, ids: list, allowPaid: true, maxCostEur: b.maxCostPct != null ? capPctToMicro(p.userId, b.maxCostPct, p.id) / 1e6 : b.maxCostEur, approvedEstimateMicro: b.approvedEstimateMicro ?? null, distinctImages: b.distinctImages ?? null, aiImages: b.aiImages ?? null, aiBackground: !!b.aiBackground, replace: !!b.replace } });
        return ok({ jobId: job.id });
      }
      // Gratuit (bibliothèque, rendu local) : immédiat, par lots de 30.
      return ok(await produceBatch(p, list, realSocialDeps(null, p, false), { allowPaid: false, maxCostEur: 0, batchSize: 30, distinctImages: b.distinctImages ?? null, replace: !!b.replace }));
    }
    case "approve": {
      let list = own(b.ids, b.planId);
      if (!list.length && b.from != null && b.to != null) list = all<{ id: string }>("SELECT id FROM posts WHERE project_id = ? AND scheduled_at >= ? AND scheduled_at < ?", p.id, b.from, b.to).map((r) => r.id);
      return ok(approve(p, list, user.id));
    }
    case "schedule":
      requirePlan(user, p.id);
      return ok(schedulePosts(own(b.ids, b.planId), (pid) => checkPost(p, pid)));
    case "unschedule":
      unschedule(own(b.ids));
      return ok({ ok: true });
    case "pause":
    case "resume":
      planOwned(b.planId);
      return ok({ ok: true, ...setPlanPaused(b.planId, b.action === "pause") });
    case "edit":
      return ok(await applySocialEdit(p, b.text, realSocialDeps(null, p, aiActiveFor(p.userId, p.id)), { confirm: b.confirm, maxCostEur: b.maxCostPct != null ? capPctToMicro(p.userId, b.maxCostPct, p.id) / 1e6 : b.maxCostEur, planId: b.planId }));
    case "automation":
      requirePlan(user, p.id);
      return ok({ id: createAutomation(p.id, b.kind, b.config ?? {}) });
    case "quote_one":
    {
      // Devis au coût probable (un essai), montré en % du budget IA du mois ; jamais en euros.
      const deps = realSocialDeps(null, p, aiActiveFor(p.userId, p.id));
      const estimateMicro = quoteOne(b.kind, b.mode, b.networks, (k) => probableOf(deps, k));
      return ok({ ai: aiActiveFor(p.userId, p.id), estimateMicro, pct: budgetPctOf(p.userId, estimateMicro, p.id) });
    }
    case "create_one": {
      // Une publication (image ou vidéo) : gratuite (reprise d'une image IA déjà validée, sinon en attente — jamais un
      // gabarit), ou payante seulement avec l'IA active et le prix accepté.
      assertPerDayRequest(p.id, 1);
      for (const x of b.platforms) if (x.connectionId && !projectAccounts(p).some((a) => a.id === x.connectionId)) throw new HttpError(400, L("Compte inconnu.", "Unknown account."));
      if (b.mode === "ai_video" && b.kind !== "video") throw new HttpError(400, L("Mode réservé aux vidéos.", "Mode for videos only."));
      if ((b.mode === "ai_image" || b.mode === "ai_post") && b.kind !== "image") throw new HttpError(400, L("Mode réservé aux images.", "Mode for images only."));
      const ai = aiActiveFor(p.userId, p.id);
      const deps = realSocialDeps(null, p, ai);
      const quote = quoteOne(b.kind, b.mode, b.platforms.length, (k) => probableOf(deps, k));
      // Plafond de la tâche (reprises comprises) : seul le coût réel est débité.
      const capOne = quoteOne(b.kind, b.mode, b.platforms.length, deps.estimate);
      if (b.mode !== "free") {
        if (!ai) throw new HttpError(402, L("L'IA n'est pas active pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé) : choisissez la version gratuite.", "AI isn't active for this project (Discovery plan, AI budget used up or provider disabled): choose the free version."));
        if (b.approvedEstimateMicro == null || b.approvedEstimateMicro < quote) throw new HttpError(409, L("Prix à accepter avant de lancer (il a pu changer) : vérifiez-le puis relancez.", "Price to accept before starting (it may have changed): check it and start again."));
      }
      // Sujet vérifié contre le projet (jamais un produit ou service d'un autre projet).
      const subject = b.subject ? resolveSubject(p, b.subject) : null;
      if (b.subject && (!subject || subject.kind !== b.subject.kind || subject.key !== (b.subject.kind === "service" ? b.subject.name.trim() : b.subject.key))) throw new HttpError(400, L("Produit ou service introuvable dans ce projet.", "Product or service not found in this project."));
      const one = createOnePost(p, { kind: b.kind, date: b.date, time: b.time, timezone: b.timezone, platforms: b.platforms, pillar: b.pillar, headline: b.headline, lang: p.settings.language === "en" ? "en" : "fr", subject: b.subject ?? null, request: b.request ?? null });
      const params = produceParams(b.kind, b.mode);
      if (params.allowPaid) {
        const job = enqueue({ userId: user.id, projectId: p.id, type: "social.v2.produce", label: b.kind === "video" ? L("Publication vidéo", "Video post") : L("Publication image", "Image post"), payload: { projectId: p.id, ids: one.ids, allowPaid: true, maxCostEur: capOne / 1e6, approvedEstimateMicro: quote, aiImages: params.aiImages ?? null, aiBackground: !!params.aiBackground } });
        return ok({ ...one, jobId: job.id, estimateMicro: quote });
      }
      const produced = await produceBatch(p, one.ids, realSocialDeps(null, p, false), { allowPaid: false, maxCostEur: 0, batchSize: 6 });
      return ok({ ...one, produced: produced.produced, notes: produced.notes, estimateMicro: 0 });
    }
    case "automation_status":
      setAutomationStatus(p.id, b.automationId, b.status);
      return ok({ ok: true });
  }
});
