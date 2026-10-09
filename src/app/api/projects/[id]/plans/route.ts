import { all } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ plans: all<any>("SELECT id, params, strategy, status, job_id, created_at FROM content_plans WHERE project_id = ? ORDER BY created_at DESC LIMIT 20", p.id).map((r) => ({ ...r, params: JSON.parse(r.params) })) });
});

/**
 * Ancienne génération de calendrier (V1) : plus de nouveau calendrier par l'ancien moteur. Les calendriers se
 * préparent avec Social V2 (onglet Calendrier : demande en clair, approbation par version, barrière) ; les anciens
 * calendriers restent consultables (GET).
 */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  await projectFromCtx(ctx);
  throw new HttpError(410, L("Les calendriers se préparent dans le nouveau calendrier de l'onglet Calendrier.", "Calendars are prepared in the new calendar in the Calendar tab."));
});
