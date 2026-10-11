import { handle } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requirePlan } from "@/lib/plan-gates";
import { L } from "@/lib/i18n-server";

/**
 * Ancien moteur vidéo (motion design V1) : plus de nouvelle production. Les vidéos se créent avec Video & UGC Engine
 * V2 (onglet Vidéos, `/videos/v2`) ; les vidéos déjà produites restent dans la bibliothèque.
 */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { user, project } = await projectFromCtx(ctx);
  requirePlan(user, project.id);
  throw new HttpError(410, L("Les nouvelles vidéos se créent avec le moteur vidéo de l'onglet Vidéos (documents modifiables).", "New videos are created with the video engine in the Videos tab (editable documents)."));
});
