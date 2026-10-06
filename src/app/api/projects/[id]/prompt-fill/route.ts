import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { fillPrompt } from "@/lib/prompts-library";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { missingVars, promptVars } from "@/lib/prompt-vars";

/** Complète un prompt avec le produit, la marque et les médias du projet actif. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ body: z.string().max(12000) }));
  const vars = promptVars(p);
  return ok({ body: fillPrompt(b.body, vars), vars, missing: missingVars(vars, b.body) });
});
