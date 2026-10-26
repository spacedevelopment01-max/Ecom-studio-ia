/** Ordre d'affichage des biens (glisser-déposer dans l'onglet « Biens »). */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { listBiens, reorderBiens } from "@/lib/biens";

export const runtime = "nodejs";

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const { ids } = await body(req, z.object({ ids: z.array(z.string()).max(2000) }));
  const own = new Set(listBiens(p.id, { archived: true }).map((b) => b.id));
  reorderBiens(p.id, ids.filter((x) => own.has(x)));
  return ok({ ok: true });
});
