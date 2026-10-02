import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { createFolder } from "@/lib/library";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ name: z.string().trim().min(1).max(120), parentId: z.string().nullable().optional() }));
  const f = createFolder(p.id, b.name, b.parentId ?? null);
  return ok({ folder: { id: f.id, name: f.name, parentId: f.parent_id, system: false, count: 0 } });
});
