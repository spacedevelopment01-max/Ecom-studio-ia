import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { all, now } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { L } from "@/lib/i18n-server";
import { aiActiveFor } from "@/lib/ai/access";
import { assertCalendarDays, planOfUserId, requirePlan } from "@/lib/plan-gates";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { createPlanV2, publishingDates } from "@/lib/social-v2/planner";
import { applySocialEdit, approve, planFromAsk, projectAccounts } from "@/lib/social-v2/engine";
import { socialStrategy } from "@/lib/social-v2/strategy";
import { PLATFORM_SPECS, PLATFORMS } from "@/lib/social-v2/platforms";
import { estimateProduction, postsOfPlan, produceBatch } from "@/lib/social-v2/production";
import { realSocialDeps } from "@/lib/social-v2/deps";
import { schedulePosts, setPlanPaused, unschedule } from "@/lib/social-v2/scheduler";
import { checkPost, varietyReport } from "@/lib/social-v2/quality";
import { socialStats } from "@/lib/social-v2/analytics";
import { AUTOMATION_KINDS, createAutomation, listAutomations, setAutomationStatus } from "@/lib/social-v2/automations";
import { postViewV2 } from "@/lib/social-v2/view";

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
  return ok({
    strategy: socialStrategy(p, { lang: p.settings.language === "en" ? "en" : "fr" }),
    plans: plans.map((x) => ({ id: x.id, engine: x.engine, paused: !!x.paused, createdAt: x.created_at, params: JSON.parse(x.params || "{}") })),
    posts: rows.map((r) => postViewV2(p, r, { gate: r.engine === "v2" })),
    variety: latest ? varietyReport(p.id, latest.id) : null,
    accounts: projectAccounts(p),
    platforms: PLATFORMS.map((pl) => ({ ...PLATFORM_SPECS[pl] })),
    stats: socialStats(p.id, user.id),
    automations: listAutomations(p.id),
    ai: aiActiveFor(p.userId),
    canPublish: !!planOfUserId(user.id),
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
      z.object({ action: z.literal("estimate"), ids, planId: z.string().max(80).optional(), allowPaid: z.boolean().default(false) }),
      z.object({ action: z.literal("produce"), ids, planId: z.string().max(80).optional(), allowPaid: z.boolean().default(false), maxCostEur: z.number().min(0).max(100).default(0), approvedEstimateMicro: z.number().int().min(0).nullable().optional() }),
      z.object({ action: z.literal("approve"), ids, planId: z.string().max(80).optional(), from: z.number().optional(), to: z.number().optional() }),
      z.object({ action: z.literal("schedule"), ids, planId: z.string().max(80).optional() }),
      z.object({ action: z.literal("unschedule"), ids }),
      z.object({ action: z.literal("pause"), planId: z.string().max(80) }),
      z.object({ action: z.literal("resume"), planId: z.string().max(80) }),
      z.object({ action: z.literal("edit"), text: z.string().min(3).max(600), confirm: z.boolean().optional(), maxCostEur: z.number().min(0).max(20).optional(), planId: z.string().max(80).optional() }),
      z.object({ action: z.literal("automation"), kind: z.enum(AUTOMATION_KINDS), config: z.record(z.string(), z.unknown()).optional() }),
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
      assertCalendarDays(user, span);
      if (!publishingDates(b.request).length) throw new HttpError(400, L("Aucun jour de publication dans cette période.", "No publishing day in this period."));
      for (const x of b.request.platforms) if (x.connectionId && !projectAccounts(p).some((a) => a.id === x.connectionId)) throw new HttpError(400, L("Compte inconnu.", "Unknown account."));
      return ok(createPlanV2(p, { ...b.request, lang: p.settings.language === "en" ? "en" : "fr" }));
    }
    case "ask": {
      const r = planFromAsk(p, b.text, { lang: p.settings.language === "en" ? "en" : "fr" });
      return ok(r);
    }
    case "estimate":
      return ok(estimateProduction(p, own(b.ids, b.planId), { estimate: realSocialDeps(null, p, aiActiveFor(p.userId)).estimate, aiActive: aiActiveFor(p.userId) }, { allowPaid: b.allowPaid }));
    case "produce": {
      const list = own(b.ids, b.planId);
      if (b.allowPaid && aiActiveFor(p.userId)) {
        const job = enqueue({ userId: user.id, projectId: p.id, type: "social.v2.produce", label: L("Production des publications", "Producing posts"), payload: { projectId: p.id, ids: list, allowPaid: true, maxCostEur: b.maxCostEur, approvedEstimateMicro: b.approvedEstimateMicro ?? null } });
        return ok({ jobId: job.id });
      }
      // Gratuit (bibliothèque, rendu local) : immédiat, par lots de 30.
      return ok(await produceBatch(p, list, realSocialDeps(null, p, false), { allowPaid: false, maxCostEur: 0, batchSize: 30 }));
    }
    case "approve": {
      let list = own(b.ids, b.planId);
      if (!list.length && b.from != null && b.to != null) list = all<{ id: string }>("SELECT id FROM posts WHERE project_id = ? AND scheduled_at >= ? AND scheduled_at < ?", p.id, b.from, b.to).map((r) => r.id);
      return ok(approve(p, list, user.id));
    }
    case "schedule":
      requirePlan(user);
      return ok(schedulePosts(own(b.ids, b.planId), (pid) => checkPost(p, pid)));
    case "unschedule":
      unschedule(own(b.ids));
      return ok({ ok: true });
    case "pause":
    case "resume":
      planOwned(b.planId);
      setPlanPaused(b.planId, b.action === "pause");
      return ok({ ok: true });
    case "edit":
      return ok(await applySocialEdit(p, b.text, realSocialDeps(null, p, aiActiveFor(p.userId)), { confirm: b.confirm, maxCostEur: b.maxCostEur, planId: b.planId }));
    case "automation":
      return ok({ id: createAutomation(p.id, b.kind, b.config ?? {}) });
    case "automation_status":
      setAutomationStatus(p.id, b.automationId, b.status);
      return ok({ ok: true });
  }
});
