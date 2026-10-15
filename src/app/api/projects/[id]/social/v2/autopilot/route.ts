import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { aiActiveFor } from "@/lib/ai/access";
import { planOfProject, requirePlan } from "@/lib/plan-gates";
import { PLANS } from "@/lib/plans";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { autopilotLog, CONSENT_TEXT, disableAutopilot, enableAutopilot, getSettings, pauseAll, runAutopilot, saveSettings, SUGGESTED_SLOTS } from "@/lib/social-v2/autopilot";
import { networkStatuses } from "@/lib/social-v2/networks";
import { memorySummary } from "@/lib/social-v2/memory";
import { realSocialDeps } from "@/lib/social-v2/deps";
import { PLATFORMS } from "@/lib/social-v2/platforms";
import { GOALS, weekPreview, type Goal } from "@/lib/social-v2/editorial";

export const runtime = "nodejs";

function view(p: Parameters<typeof getSettings>[0]) {
  const plan = planOfProject(p.id);
  const s = getSettings(p);
  return {
    week: weekPreview(s.config.perDay, s.config.goal, s.config.commercial, s.config.language),
    settings: s,
    networks: networkStatuses(p),
    limits: plan ? { plan, perDay: PLANS[plan].postsPerDay, calendarDays: PLANS[plan].calendarDays, autopublish: PLANS[plan].autopublish } : null,
    consentText: CONSENT_TEXT,
    suggestedSlots: SUGGESTED_SLOTS,
    memory: memorySummary(p.id),
    log: autopilotLog(p.id, 40),
    ai: aiActiveFor(p.userId, p.id),
  };
}

/** « Ma communication automatique » : réglages, état réel des réseaux, limites du forfait, consentement, historique. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  // Aperçu de la semaine type pour les choix EN COURS (avant enregistrement) : suit l'écran immédiatement.
  const q = new URL(req.url).searchParams;
  if (q.get("preview") === "week") {
    const perDay = Math.max(1, Math.min(5, Number(q.get("perDay")) || 1));
    const goal = (GOALS as string[]).includes(q.get("goal") ?? "") ? (q.get("goal") as Goal) : "balanced";
    const commercial = (Math.max(0, Math.min(2, Number(q.get("commercial") ?? 1))) || 0) as 0 | 1 | 2;
    return ok({ week: weekPreview(perDay, goal, commercial, q.get("lang") === "en" ? "en" : "fr") });
  }
  return ok(view(p));
});

const Config = z
  .object({
    active: z.boolean(),
    goal: z.enum(GOALS as [string, ...string[]]),
    platforms: z.array(z.enum(PLATFORMS)).max(6),
    perDay: z.number().int().min(1).max(5),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7),
    slots: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(5),
    timezone: z.string().min(1).max(60),
    tone: z.string().max(200),
    language: z.enum(["fr", "en"]),
    commercial: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    focus: z.array(z.string().max(80)).max(10),
    formats: z.object({ image: z.number().min(0).max(100), carousel: z.number().min(0).max(100), video: z.number().min(0).max(100), text: z.number().min(0).max(100) }).partial(),
    approval: z.enum(["manual", "auto"]),
    autoKinds: z.array(z.enum(["main", "info", "demo", "more", "engage", "convert"])).max(6),
    exclude: z.array(z.string().max(60)).max(30),
    suspended: z.array(z.enum(PLATFORMS)).max(6),
    horizonDays: z.number().int().min(1).max(90),
    produceDays: z.number().int().min(1).max(7),
    paidCapEurWeek: z.number().min(0).max(50),
    visual: z.enum(["free", "ai_image", "ai_post"]),
  })
  .partial();

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(
    req,
    z.discriminatedUnion("action", [
      z.object({ action: z.literal("save"), config: Config }),
      z.object({ action: z.literal("enable"), consent: z.string().min(20).max(1000) }),
      z.object({ action: z.literal("disable") }),
      z.object({ action: z.literal("pause_all") }),
      z.object({ action: z.literal("resume_all") }),
      z.object({ action: z.literal("run_now") }),
    ]),
  );
  switch (b.action) {
    case "save": {
      // Le mode « auto » ne s'active jamais par un simple enregistrement : il faut le consentement (« enable »).
      const { approval, ...rest } = b.config;
      if (approval === "manual" && getSettings(p).autopilot) disableAutopilot(p, user.id);
      saveSettings(p, rest as never);
      return ok(view(p));
    }
    case "enable":
      enableAutopilot(p, user.id, b.consent);
      return ok(view(p));
    case "disable":
      return ok({ ...view(p), ...disableAutopilot(p, user.id) });
    case "pause_all":
    case "resume_all":
      return ok({ ...view(p), result: pauseAll(p, b.action === "pause_all") });
    case "run_now": {
      requirePlan(user, p.id);
      const r = await runAutopilot(p, realSocialDeps(null, p, aiActiveFor(p.userId, p.id)));
      return ok({ ...view(p), run: r });
    }
  }
});
