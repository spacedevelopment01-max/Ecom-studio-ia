import { z } from "zod";
import { id as newId } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { saveAsset } from "@/lib/library";
import { saveCatalog } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { catalogMedia, upsertCatalogItem } from "@/lib/engine/catalog";
import type { CatalogItem, StoreType } from "@/lib/project-types";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";
const MAX = 25 * 1024 * 1024;
const cents = (s: unknown) => {
  const t = String(s ?? "").replace(/\s|€/g, "").replace(",", ".");
  if (!t) return null;
  const n = Math.round(Number(t) * 100);
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, L("Prix illisible.", "Unreadable price."));
  return n;
};

function view(projectId: string, item: CatalogItem) {
  const media = catalogMedia(projectId, item);
  return { ...item, image: media[0] ? `/api/files/${media[0].id}?thumb=1` : null, processed: media.length > 1 };
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ storeType: p.storeType, items: p.catalog.map((i) => view(p.id, i)), mainCategory: p.product.category ?? "" });
});

/** Ajout d'un produit (formulaire avec photo). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (p.catalog.length >= 40) throw new HttpError(400, L("Le catalogue est limité à 40 produits par boutique.", "The catalog is limited to 40 products per store."));
  const form = await req.formData();
  const get = (k: string) => (typeof form.get(k) === "string" ? String(form.get(k)).trim() : "");
  const name = get("name");
  if (!name) throw new HttpError(400, L("Donnez un nom au produit.", "Give the product a name."));
  const photo = form.get("photo");
  let originalAssetId: string | null = null;
  if (photo && typeof photo !== "string" && photo.size > 0) {
    if (photo.size > MAX) throw new HttpError(413, L("La photo dépasse 25 Mo.", "The photo exceeds 25 MB."));
    if (!/^image\/(jpeg|png|webp|avif)$/.test(photo.type)) throw new HttpError(415, L("Format non pris en charge (JPEG, PNG, WebP, AVIF).", "Unsupported format (JPEG, PNG, WebP, AVIF)."));
    const a = await saveAsset({ projectId: p.id, userId: user.id, data: Buffer.from(await photo.arrayBuffer()), name: photo.name || `${name}.jpg`, mime: photo.type, role: "catalog-original", folderKey: "product.catalog", origin: "upload", meta: { product: name } });
    originalAssetId = a.id;
  }
  const item: CatalogItem = {
    key: newId(),
    name: name.slice(0, 120),
    category: get("category").slice(0, 60),
    price: cents(get("price")),
    compareAt: cents(get("compareAt")),
    description: get("description").slice(0, 4000),
    features: get("features").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 12),
    originalAssetId,
    ...(get("supplierUrl") ? { source: { supplier: get("supplier") || "Fournisseur", url: get("supplierUrl"), ref: get("supplierRef") || undefined } } : {}),
  };
  upsertCatalogItem(p.id, item);
  return ok({ item: view(p.id, item) });
});

const ItemPatch = z.object({
  key: z.string(),
  name: z.string().min(1).max(120).optional(),
  category: z.string().max(60).optional(),
  price: z.number().int().min(0).nullable().optional(),
  compareAt: z.number().int().min(0).nullable().optional(),
  description: z.string().max(4000).optional(),
  features: z.array(z.string().max(200)).max(12).optional(),
});

/** Modification d'un produit, du type de boutique, ou régénération de la boutique. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ storeType: z.enum(["mono", "multi", "niche"]).optional(), item: ItemPatch.optional(), remove: z.string().optional(), rebuild: z.boolean().optional() }));
  let catalog = p.catalog;
  if (b.item) {
    const { key, ...patch } = b.item;
    if (!catalog.some((i) => i.key === key)) throw new HttpError(404, L("Produit introuvable.", "Product not found."));
    catalog = catalog.map((i) => (i.key === key ? { ...i, ...patch } : i));
  }
  if (b.remove) catalog = catalog.filter((i) => i.key !== b.remove);
  saveCatalog(p.id, catalog, b.storeType as StoreType | undefined);
  let jobId: string | null = null;
  if (b.rebuild) {
    if (!p.brand) throw new HttpError(409, L("La boutique sera composée après la marque (voir le Pilote).", "The store will be built after the brand (see the Pilot)."));
    jobId = enqueue({ userId: user.id, projectId: p.id, type: "shop.build", label: L("Boutique mise à jour avec le catalogue", "Store updated with the catalog"), payload: { projectId: p.id, useAi: false } }).id;
  }
  return ok({ storeType: b.storeType ?? p.storeType, items: catalog.map((i) => view(p.id, i)), jobId });
});
