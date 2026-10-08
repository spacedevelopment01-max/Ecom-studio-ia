import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { applyBrandUpdate, brandImpact } from "@/lib/workflow/propagation";

export const runtime = "nodejs";

/** Créations faites avec une ancienne identité de marque (rien n'est modifié). */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(brandImpact(p));
});

/** Mise à jour CONTRÔLÉE des créations choisies : locale, gratuite, nouvelle version de chacune. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ keys: z.array(z.string().max(120)).max(500), includeEdited: z.boolean().optional() }));
  const r = await applyBrandUpdate(p.id, b.keys, { includeEdited: b.includeEdited, userId: user.id });
  return ok({ ...r, impact: brandImpact((await import("@/lib/projects")).loadProject(p.id)) });
});
