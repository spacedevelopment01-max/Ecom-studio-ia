import { HttpError } from "@/lib/auth";
import { one } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { hasProductInput, launchPipeline, readStartForm, saveStartFiles } from "@/lib/project-start";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

export const runtime = "nodejs";

/** Démarre la création d'un projet créé sans entrée produit (photo, lien ou description ajoutés maintenant). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'pipeline.run' AND status IN ('queued','running','paused')", p.id)) {
    throw new HttpError(409, "Une création est déjà en cours pour ce projet.");
  }
  const { input, files, logo } = readStartForm(await req.formData());
  const existing = one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND role = 'original' AND deleted_at IS NULL", p.id)!.n;
  if (!hasProductInput(input, files) && !existing) throw new HttpError(400, "Ajoutez au moins une photo, un lien ou une description de quelques lignes.");
  await saveStartFiles(p.id, user.id, files, logo);
  const job = launchPipeline(p.id, user.id, input, files.length || existing);
  return ok({ jobId: job.id });
});
