/**
 * Boutiques connectées du projet (Shopify, WooCommerce, PrestaShop) : les accès sont saisis dans le formulaire du
 * studio, essayés (lecture du catalogue) puis enregistrés chiffrés ; ils ne sont jamais renvoyés au navigateur.
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requirePlan } from "@/lib/plan-gates";
import { connectStore, disconnectStore, listStores, PLATFORMS } from "@/lib/products/sync";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ stores: listStores(p.id) });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requirePlan(user, p.id);
  const b = await body(req, z.object({ platform: z.enum(PLATFORMS as [string, ...string[]]), url: z.string().min(4).max(300), key: z.string().max(300).optional(), secret: z.string().max(300).optional(), token: z.string().max(300).optional() }));
  const store = await connectStore(p.id, user.id, b as never);
  return ok({ store, stores: listStores(p.id) }, { status: 201 });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  disconnectStore(p.id, new URL(req.url).searchParams.get("id") ?? "");
  return ok({ stores: listStores(p.id) });
});
