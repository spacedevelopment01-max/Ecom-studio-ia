import { handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

/** Réécriture des textes de la boutique (avec contrôle qualité). */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const job = enqueue({ userId: user.id, projectId: p.id, type: "copy.build", label: "Rédaction des textes", payload: { projectId: p.id } });
  return ok({ jobId: job.id });
});
