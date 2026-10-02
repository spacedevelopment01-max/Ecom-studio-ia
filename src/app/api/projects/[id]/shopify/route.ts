import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { shopifyConnection } from "@/lib/integrations/shopify";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!shopifyConnection(user.id, p.id)) throw new HttpError(409, "Connectez votre boutique Shopify dans l'onglet Connexions.");
  const b = await body(req, z.object({ parts: z.array(z.enum(["theme", "product", "pages"])).min(1) }));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "shopify.push", label: "Envoi vers Shopify", payload: { projectId: p.id, parts: b.parts } });
  return ok({ jobId: job.id });
});
