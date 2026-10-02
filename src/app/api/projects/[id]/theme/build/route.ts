import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { DIRECTIONS } from "@/lib/theme/directions";
import { HttpError } from "@/lib/auth";

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, "La marque doit être créée avant la boutique.");
  const b = await body(req, z.object({ direction: z.enum(DIRECTIONS.map((d) => d.id) as [string, ...string[]]).optional(), useAi: z.boolean().optional() }));
  const job = b.direction
    ? enqueue({ userId: user.id, projectId: p.id, type: "shop.direction", label: `Direction ${b.direction}`, payload: { projectId: p.id, direction: b.direction } })
    : enqueue({ userId: user.id, projectId: p.id, type: "shop.build", label: "Nouvelle composition de la boutique", payload: { projectId: p.id, useAi: b.useAi } });
  return ok({ jobId: job.id });
});
