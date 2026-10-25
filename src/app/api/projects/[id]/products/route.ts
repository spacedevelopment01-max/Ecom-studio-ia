/**
 * Produits du Studio (onglet « Catalogue », mission #190) : liste, création, modification, ordre, archivage.
 * Première lecture : reprise des produits que la boutique montre déjà (aucune donnée inventée, aperçu inchangé).
 * Le projet doit appartenir au compte connecté ; photos prises dans les médias de CE projet uniquement.
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { currentTheme } from "@/lib/projects";
import { archiveProduct, createProduct, linksOf, moveProduct, productDataSchema, seedFromTheme, setVariantStock, updateProduct, variantSchema, PRODUCT_STATUSES } from "@/lib/products/catalog";
import { listStores } from "@/lib/products/sync";

export const runtime = "nodejs";

const variantPatch = variantSchema.partial().extend({ options: z.array(z.string().max(60)).max(3) });
const productInput = productDataSchema.partial().extend({ handle: z.string().max(80).optional(), status: z.enum(PRODUCT_STATUSES).optional(), variants: z.array(variantPatch).max(500).optional() });

function view(projectId: string) {
  const spec = currentTheme(projectId)?.spec;
  const links = linksOf(projectId);
  const products = seedFromTheme(projectId, spec).map((p) => ({
    ...p,
    images: p.data.images.map((i) => ({ ...i, url: `/api/files/${i.assetId}?thumb=1` })),
    links: links.filter((l) => l.kind === "product" && l.local_id === p.id).map((l) => ({ platform: l.platform, store: l.store, remoteId: l.remote_id, syncedAt: l.synced_at })),
  }));
  return {
    services: spec?.store.business === "services",
    products,
    stores: listStores(projectId),
    // Mises en page de fiche produit du thème installé (« product » commune, « product.<suffixe> » propres).
    templates: Object.keys(spec?.templates ?? {}).filter((t) => t === "product" || t.startsWith("product.")).map((t) => (t === "product" ? "" : t.slice(8))),
  };
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(view(p.id));
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, productInput);
  const product = createProduct(p.id, b);
  return ok({ product, ...view(p.id) }, { status: 201 });
});

/** Modification d'une fiche, de son ordre, de son état, ou du stock d'une variante. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({
    id: z.string(),
    version: z.number().int().optional(),
    product: productInput.optional(),
    move: z.enum(["up", "down"]).optional(),
    archive: z.boolean().optional(),
    stock: z.object({ variant: z.string(), value: z.number().int().min(-100_000).max(10_000_000).nullable() }).optional(),
  }));
  if (b.product) updateProduct(p.id, b.id, { ...b.product, version: b.version });
  if (b.stock) setVariantStock(p.id, b.stock.variant, b.stock.value);
  if (b.move) moveProduct(p.id, b.id, b.move);
  if (b.archive) archiveProduct(p.id, b.id);
  return ok(view(p.id));
});
