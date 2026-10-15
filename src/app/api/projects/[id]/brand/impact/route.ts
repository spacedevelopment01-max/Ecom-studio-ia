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

/**
 * Mise à jour CONTRÔLÉE des créations choisies : nouvelle version de chacune, locale et gratuite ; les visuels faits
 * par l'IA seulement avec le prix total accepté (sinon laissés tels quels).
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ keys: z.array(z.string().max(120)).max(500), includeEdited: z.boolean().optional(), approvedPaidMicro: z.number().int().min(0).nullable().optional() }));
  const r = await applyBrandUpdate(p.id, b.keys, { includeEdited: b.includeEdited, userId: user.id, approvedPaidMicro: b.approvedPaidMicro ?? null });
  return ok({ ...r, impact: brandImpact((await import("@/lib/projects")).loadProject(p.id)) });
});
