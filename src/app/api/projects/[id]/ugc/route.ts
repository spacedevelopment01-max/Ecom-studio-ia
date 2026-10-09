import { handle } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requireCreationPlan } from "@/lib/plan-gates";
import { L } from "@/lib/i18n-server";

/**
 * Ancien moteur UGC : plus de nouvelle production. Les vidéos UGC se créent avec Video & UGC Engine V2 (onglet Vidéos,
 * type « UGC » : personnage synthétique signalé) ; les vidéos déjà produites restent dans la bibliothèque.
 */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { user } = await projectFromCtx(ctx);
  requireCreationPlan(user, "ugc");
  throw new HttpError(410, L("Les vidéos UGC se créent avec le moteur vidéo de l'onglet Vidéos (type « UGC »).", "UGC videos are created with the video engine in the Videos tab (\"UGC\" type)."));
});
