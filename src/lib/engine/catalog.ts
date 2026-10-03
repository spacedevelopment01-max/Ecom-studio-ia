/**
 * Catalogue d'une boutique multi-produit ou niche : chaque produit ajouté (photo, nom, prix,
 * description) est détouré puis présenté en packshot aux couleurs de la marque, à partir des
 * pixels réels de sa photo. Le catalogue alimente les fiches produits et les collections du thème.
 */
import { loadImage } from "@napi-rs/canvas";
import { one } from "../db";
import { assetData, getAsset, saveAsset, type Asset } from "../library";
import { loadProject, saveCatalog, type Project } from "../projects";
import { cutoutProduct, extractPalette } from "../media/cutout";
import { renderPackshot } from "../media/compose";
import type { CatalogItem } from "../project-types";
import type { StoreCollection, StoreProduct } from "../theme/spec";
import type { JobContext } from "../jobs";
import { palette } from "./images";

export const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "produit";

const derived = (projectId: string, role: string, sourceId: string) => one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId, role, sourceId);

/** Détourage et packshot de chaque produit du catalogue (déjà faits : réutilisés). */
export async function ensureCatalogMedia(ctx: JobContext | null, projectId: string) {
  const p = loadProject(projectId);
  const items = p.catalog.filter((i) => i.originalAssetId);
  for (const [n, item] of items.entries()) {
    const original = getAsset(item.originalAssetId!);
    if (!original || original.deleted_at) continue;
    let cut = derived(projectId, "catalog-cutout", original.id);
    if (!cut) {
      ctx?.progress(0.05 + (n / Math.max(1, items.length)) * 0.4, `Détourage : ${item.name}`);
      const c = await cutoutProduct(assetData(original));
      cut = await saveAsset({ projectId, userId: p.userId, data: c.png, name: `${slug(item.name)}-detoure.png`, mime: "image/png", role: "catalog-cutout", folderKey: "product.catalog", origin: "generated", sourceAssetId: original.id, meta: { product: item.key, colors: await extractPalette(c.png), method: c.method } });
    }
    if (!derived(projectId, "catalog-packshot", cut.id)) {
      ctx?.progress(0.05 + ((n + 0.5) / Math.max(1, items.length)) * 0.4, `Packshot : ${item.name}`);
      const img = await loadImage(assetData(cut));
      const jpg = await renderPackshot(img, { background: palette(p).light });
      await saveAsset({ projectId, userId: p.userId, data: Buffer.from(jpg), name: `${slug(item.name)}-packshot.jpg`, mime: "image/jpeg", role: "catalog-packshot", folderKey: "product.catalog", origin: "generated", sourceAssetId: cut.id, meta: { product: item.key, recipe: "Packshot fond de marque, ombre de contact", fidelity: "pixels d'origine du produit" } });
    }
  }
}

/** Médias d'un produit du catalogue, du plus présentable au moins présentable. */
export function catalogMedia(projectId: string, item: CatalogItem): Asset[] {
  if (!item.originalAssetId) return [];
  const original = getAsset(item.originalAssetId);
  if (!original) return [];
  const cut = derived(projectId, "catalog-cutout", original.id);
  const pack = cut ? derived(projectId, "catalog-packshot", cut.id) : undefined;
  return [pack, original].filter(Boolean) as Asset[];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Produits et collections du thème pour le catalogue. Le produit principal (déjà mis en forme)
 * est rangé dans la collection de sa catégorie ; une catégorie = une collection.
 */
export function catalogStore(p: Project, main: StoreProduct, fileName: (a: Asset, hint: string) => string) {
  const files: Record<string, string> = {};
  const used = new Set([main.handle]);
  const products: StoreProduct[] = [];
  const byCategory = new Map<string, string[]>();
  const mainCategory = p.product.category?.trim() || p.catalog[0]?.category || "La sélection";
  byCategory.set(mainCategory, [main.handle]);
  for (const item of p.catalog) {
    let handle = slug(item.name);
    for (let k = 2; used.has(handle); k++) handle = `${slug(item.name)}-${k}`;
    used.add(handle);
    const images = catalogMedia(p.id, item).map((a, i) => {
      const f = fileName(a, `${handle}-${i + 1}`);
      files[f] = a.id;
      return f;
    });
    const features = item.features.filter(Boolean);
    products.push({
      title: item.name,
      handle,
      vendor: p.brand?.name ?? p.name,
      description_html: `${item.description ? `<p>${esc(item.description)}</p>` : ""}${features.length ? `<ul>${features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}` || "<p>[À compléter : description du produit]</p>",
      price: item.price,
      compare_at_price: item.compareAt,
      currency: "EUR",
      options: [],
      variants: [],
      images,
      tags: item.category ? [item.category] : [],
    });
    const cat = item.category?.trim() || mainCategory;
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), handle]);
  }
  const imageOf = (handle: string) => (handle === main.handle ? main.images[0] : products.find((x) => x.handle === handle)?.images[0]);
  const collections: StoreCollection[] = [...byCategory.entries()].map(([title, handles]) => ({ handle: slug(title), title, description: "", image: imageOf(handles[0]), products: handles }));
  return { products, collections, files };
}

/** Ajoute ou met à jour un produit du catalogue. */
export function upsertCatalogItem(projectId: string, item: CatalogItem) {
  const p = loadProject(projectId);
  const list = p.catalog.some((i) => i.key === item.key) ? p.catalog.map((i) => (i.key === item.key ? item : i)) : [...p.catalog, item];
  saveCatalog(projectId, list);
  return list;
}
