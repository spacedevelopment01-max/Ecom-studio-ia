import { handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const job = enqueue({ userId: user.id, projectId: p.id, type: "files.classify", label: L("Classement des fichiers", "Sorting files"), payload: { projectId: p.id } });
  return ok({ jobId: job.id });
});
