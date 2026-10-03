import { handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const job = enqueue({ userId: user.id, projectId: p.id, type: "files.classify", label: "Classement des fichiers", payload: { projectId: p.id } });
  return ok({ jobId: job.id });
});
