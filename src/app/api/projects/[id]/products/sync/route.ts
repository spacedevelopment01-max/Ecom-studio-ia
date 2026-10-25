/**
 * Envoi des produits du Studio vers une boutique connectée, ou import des produits qu'elle a déjà
 * (règles : src/lib/products/sync.ts — correspondances conservées, stock vendu jamais écrasé, aucun doublon).
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requirePlan } from "@/lib/plan-gates";
import { connectorOf, importFromStore, syncProducts, type ImageReader } from "@/lib/products/sync";
import { assertStoreUrl } from "@/lib/products/connectors/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Photo d'un produit importé : adresse publique contrôlée (anti-SSRF), image de 15 Mo au plus. */
const readImage: ImageReader = async (url) => {
  await assertStoreUrl(url);
  const r = await fetch(url, { redirect: "error" });
  const mime = (r.headers.get("content-type") ?? "").split(";")[0];
  if (!r.ok || !/^image\/(jpeg|png|webp)$/.test(mime)) return null;
  const data = Buffer.from(await r.arrayBuffer());
  return data.length > 15 * 1048576 ? null : { data, mime };
};

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requirePlan(user, p.id);
  const b = await body(req, z.object({ store: z.string(), action: z.enum(["push", "import"]), productIds: z.array(z.string()).max(500).optional() }));
  const conn = await connectorOf(p.id, b.store);
  const report = b.action === "push" ? await syncProducts(p.id, conn, { productIds: b.productIds }) : await importFromStore(p.id, user.id, conn, { readImage });
  return ok({ report });
});
