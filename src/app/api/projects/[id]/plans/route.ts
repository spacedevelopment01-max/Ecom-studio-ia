import { z } from "zod";
import { all, id, now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ plans: all<any>("SELECT id, params, strategy, status, job_id, created_at FROM content_plans WHERE project_id = ? ORDER BY created_at DESC LIMIT 20", p.id).map((r) => ({ ...r, params: JSON.parse(r.params) })) });
});

/** Génération anticipée : plusieurs jours ou semaines de publications complètes. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(
    req,
    z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      days: z.number().int().min(1).max(60),
      perDay: z.number().int().min(1).max(5),
      slots: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(5),
      timezone: z.string(),
      networks: z.array(z.object({ network: z.enum(["instagram", "facebook", "tiktok", "youtube", "pinterest"]), connectionId: z.string().nullable().optional() })).min(1),
      goals: z.string().max(600).default(""),
      tone: z.string().max(200).default(""),
      mix: z.object({ photo: z.number().min(0).max(100), video: z.number().min(0).max(100), text: z.number().min(0).max(100) }),
      link: z.string().max(300).optional(),
      approval: z.enum(["manual", "auto"]).default("manual"),
      products: z.string().max(300).optional(),
    }),
  );
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: b.timezone });
  } catch {
    throw new HttpError(400, "Fuseau horaire inconnu.");
  }
  for (const n of b.networks) if (n.connectionId && !one("SELECT 1 FROM connections WHERE id = ? AND user_id = ?", n.connectionId, user.id)) throw new HttpError(400, "Compte social inconnu.");
  if (b.days * b.perDay > 150) throw new HttpError(400, "150 publications au maximum par plan.");
  const pid = id();
  run("INSERT INTO content_plans (id, project_id, params, status, created_at) VALUES (?,?,?,?,?)", pid, p.id, JSON.stringify(b), "planning", now());
  const job = enqueue({ userId: user.id, projectId: p.id, type: "calendar.plan", label: `Calendrier de ${b.days} jour(s)`, payload: { projectId: p.id, planId: pid, params: b } });
  run("UPDATE content_plans SET job_id = ? WHERE id = ?", job.id, pid);
  return ok({ planId: pid, jobId: job.id });
});
