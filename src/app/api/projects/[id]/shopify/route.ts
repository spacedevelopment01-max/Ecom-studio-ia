import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { shopifyConnection } from "@/lib/integrations/shopify";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!shopifyConnection(user.id, p.id)) throw new HttpError(409, L("Connectez votre boutique Shopify dans l'onglet Connexions.", "Connect your Shopify store in the Connections tab."));
  const b = await body(req, z.object({ parts: z.array(z.enum(["theme", "product", "pages"])).min(1) }));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "shopify.push", label: L("Envoi vers Shopify", "Sending to Shopify"), payload: { projectId: p.id, parts: b.parts } });
  return ok({ jobId: job.id });
});
