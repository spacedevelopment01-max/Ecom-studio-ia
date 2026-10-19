/** Catalogue de transport hors ligne, commun aux adaptateurs ; aucune publication automatique. */
import { createHash } from "node:crypto";
import { storeProducts, type ThemeSpec, type SectionInstance } from "../theme/spec";
import { validateCatalog, variantExportSku, productExportSku } from "../theme/catalog-export";
import { purchaseTargetHandles } from "../theme/purchase-offers";

export function exportProductHandle(spec: ThemeSpec, section: SectionInstance): string {
  if (spec.store.business === "services") return "";
  if (section.settings.product_target) return purchaseTargetHandles(spec)[String(section.settings.product_target)] ?? "";
  return String(section.settings.product ?? "") || spec.store.product.handle;
}

export function catalogSnapshot(spec: ThemeSpec, media: Record<string, Uint8Array>, source?: string) {
  if (spec.store.business !== "services") validateCatalog(spec);
  const hash = (s: string | Uint8Array) => createHash("sha256").update(s).digest("hex");
  const delivered = new Set(Object.keys(media));
  const images = (names: string[]) => names.filter(n => delivered.has(n));
  return {
    version: 1,
    source: hash(source || spec.store.shopName).slice(0, 24),
    business: spec.store.business ?? "products",
    publication: "explicit-user-action",
    media: Object.fromEntries(Object.entries(media).map(([name, bytes]) => [name, { sha256: hash(bytes) }])),
    products: spec.store.business === "services" ? [] : storeProducts(spec).map(p => ({
      handle: p.handle, sku: productExportSku(p), title: p.title, description_html: p.description_html, currency: p.currency,
      price: p.price, compare_at_price: p.compare_at_price, vendor: p.vendor, tags: p.tags,
      options: p.options, images: images([...new Set([...p.images, ...p.variants.map(v => v.image).filter((f): f is string => !!f)])]), seo: p.seo ?? null, template_suffix: p.template_suffix ?? "",
      variants: p.variants.map(v => ({ ...v, sku: variantExportSku(p, v), image: v.image && delivered.has(v.image) ? v.image : null })),
    })),
    collections: spec.store.business === "services" ? [] : (spec.store.collections ?? []).map(c => ({ ...c, image: c.image && delivered.has(c.image) ? c.image : null })),
    pages: spec.store.pages.filter(p => p.status !== "draft"),
    menus: spec.store.menus,
  };
}
