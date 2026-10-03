import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { UgcOptionsSchema } from "../schema";

/** Écrit le script d'une vidéo UGC (tâche de fond) ; le marchand le relit avant la génération. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, "Créez d'abord la marque.");
  const options = await body(req, UgcOptionsSchema);
  const job = enqueue({ userId: user.id, projectId: p.id, type: "ugc.script", label: "Script de vidéo UGC", payload: { options } });
  return ok({ jobId: job.id });
});
