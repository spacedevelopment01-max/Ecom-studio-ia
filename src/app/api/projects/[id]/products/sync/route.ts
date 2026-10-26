/**
 * Envoi des produits du Studio vers une boutique connectée, ou import des produits qu'elle a déjà
 * (règles : src/lib/products/sync.ts — correspondances conservées, ventes de la boutique reprises dans le calcul du stock, aucun doublon).
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requirePlan } from "@/lib/plan-gates";
import { connectorOf, importFromStore, syncProducts, type ImageReader } from "@/lib/products/sync";
import { assertStoreUrl } from "@/lib/products/connectors/types";
import { publicDownload } from "@/lib/public-download";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Photo d'un produit importé : téléchargement public contrôlé du lot 9 (DNS, redirections, taille), 15 Mo au plus. */
const readImage: ImageReader = async (url) => {
  await assertStoreUrl(url);
  const r = await publicDownload(url, { maxBytes: 15 * 1048576, accept: "image/jpeg,image/png,image/webp", timeoutMs: 30_000 }).catch(() => null);
  const mime = (r?.headers.get("content-type") ?? "").split(";")[0];
  if (!r?.ok || !/^image\/(jpeg|png|webp)$/.test(mime)) return null;
  return { data: Buffer.from(await r.arrayBuffer()), mime };
};

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requirePlan(user, p.id);
  const b = await body(req, z.object({ store: z.string(), action: z.enum(["push", "import"]), productIds: z.array(z.string()).max(500).optional() }));
  const conn = await connectorOf(p.id, b.store);
  const report = b.action === "push" ? await syncProducts(p.id, conn, { productIds: b.productIds }) : await importFromStore(p.id, user.id, conn, { readImage });
  return ok({ report });
});
