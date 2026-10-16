import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requireCreationPlan } from "@/lib/plan-gates";
import { addWordingRule, loadWordingRules, removeWordingRule } from "@/lib/client-wording";

/** Consignes de vocabulaire du client (« montre » et jamais « chronographe »), appliquées à chaque création. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ rules: loadWordingRules(p.id) });
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requireCreationPlan(user, p.id, "images");
  const b = await body(req, z.object({ avoid: z.string().min(1).max(60), use: z.string().max(60).default(""), remove: z.boolean().optional(), note: z.string().max(200).optional() }));
  return ok({ rules: b.remove ? removeWordingRule(p.id, b.avoid) : addWordingRule(p.id, { avoid: b.avoid, use: b.use, note: b.note }) });
});
