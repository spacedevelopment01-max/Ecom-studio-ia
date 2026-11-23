import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { photoRightsAt, projectCreations, withdrawCreation } from "@/lib/video-v2/journal";

export const runtime = "nodejs";

/** Journal des vidéos créées par l'IA pour ce projet (rapport 09, point 11) : qui, quoi, quand, quel modèle, droits. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({
    rightsConfirmedAt: photoRightsAt(p.id),
    creations: projectCreations(p.id).map((c) => ({ id: c.id, assetId: c.asset_id, sourceAssetId: c.source_asset_id, model: `${c.provider}:${c.model}`, rightsConfirmedAt: c.rights_confirmed_at, status: c.status, reason: c.report_reason, reportedAt: c.reported_at, at: c.created_at })),
  });
});

/** Signalement et retrait d'un plan créé par l'IA : retiré tout de suite, la raison et l'auteur restent dans le journal. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ action: z.literal("withdraw"), creationId: z.string().min(1).max(40), reason: z.string().min(3).max(500) }));
  const c = withdrawCreation(p.id, b.creationId, { by: user.id, reason: b.reason });
  if (!c) throw new HttpError(404, L("Création introuvable dans ce projet.", "Creation not found in this project."));
  return ok({ id: c.id, status: c.status });
});
