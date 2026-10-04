import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { UgcOptionsSchema } from "../schema";
import { L } from "@/lib/i18n-server";

/** Écrit le script d'une vidéo UGC (tâche de fond) ; le marchand le relit avant la génération. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, L("Créez d'abord la marque.", "Create the brand first."));
  const options = await body(req, UgcOptionsSchema);
  const job = enqueue({ userId: user.id, projectId: p.id, type: "ugc.script", label: L("Script de vidéo UGC", "UGC video script"), payload: { options } });
  return ok({ jobId: job.id });
});
