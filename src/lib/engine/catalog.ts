/**
 * Catalogue d'une boutique multi-produit ou niche : chaque produit ajouté (photo, nom, prix,
 * description) est détouré puis présenté en packshot aux couleurs de la marque, à partir des
 * pixels réels de sa photo. Le catalogue alimente les fiches produits et les collections du thème.
 */
import { loadImage } from "@napi-rs/canvas";
import { all, one } from "../db";
import { assetData, getAsset, saveAsset, type Asset } from "../library";
import { loadProject, saveCatalog, type Project } from "../projects";
import { cutoutProduct, extractPalette } from "../media/cutout";
import { checkCutoutLocal } from "../media/cutout-quality";
import { renderPackshot } from "../media/compose";
import type { CatalogItem } from "../project-types";
import type { StoreCollection, StoreProduct } from "../theme/spec";
import { JobCancelled, JobPaused, type JobContext } from "../jobs";
import { palette } from "./images";
import { C, L } from "../i18n-server";

export const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "produit";

const derived = (projectId: string, role: string, sourceId: string) => one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId, role, sourceId);

/**
 * Détourage contrôlé par les règles locales (part du produit, morceaux épars, bords, trous) ; null si le détourage
 * n'a pas pu être fait proprement (machine trop juste et fond non uni). Un détourage refusé est gardé mais jamais utilisé.
 */
async function checkedCutout(original: Buffer) {
  try {
    const c = await cutoutProduct(original);
    return { ...c, quality: await checkCutoutLocal(c, original) };
  } catch (e) {
    if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    console.warn("[catalog] détourage impossible :", (e as Error).message);
    return null;
  }
}

/** Détourage et packshot de chaque produit du catalogue (déjà faits : réutilisés). */
export async function ensureCatalogMedia(ctx: JobContext | null, projectId: string) {
  const p = loadProject(projectId);
  const items = p.catalog.filter((i) => i.originalAssetId);
  for (const [n, item] of items.entries()) {
    const original = getAsset(item.originalAssetId!);
    if (!original || original.deleted_at) continue;
    let cut = derived(projectId, "catalog-cutout", original.id);
    if (!cut) {
      ctx?.progress(0.05 + (n / Math.max(1, items.length)) * 0.4, L(`Détourage : ${item.name}`, `Cutout: ${item.name}`));
      const c = await checkedCutout(assetData(original));
      if (!c) continue; // pas de détourage valable : la photo d'origine sert telle quelle
      cut = await saveAsset({ projectId, userId: p.userId, data: c.png, name: `${slug(item.name)}-${C("detoure", "cutout")}.png`, mime: "image/png", role: "catalog-cutout", folderKey: "product.catalog", origin: "generated", sourceAssetId: original.id, status: c.quality.ok ? "ready" : "rejected", meta: { product: item.key, colors: c.quality.ok ? await extractPalette(c.png) : [], method: c.method, quality: { verdict: c.quality.ok ? "ok" : "rejected", reasons: c.quality.reasons, score: c.quality.score, by: "local", checkedAt: Date.now() } } });
    }
    if (cut.status === "rejected") continue;
    if (!derived(projectId, "catalog-packshot", cut.id)) {
      ctx?.progress(0.05 + ((n + 0.5) / Math.max(1, items.length)) * 0.4, L(`Packshot : ${item.name}`, `Packshot: ${item.name}`));
      const img = await loadImage(assetData(cut));
      const jpg = await renderPackshot(img, { background: palette(p).light });
      await saveAsset({ projectId, userId: p.userId, data: Buffer.from(jpg), name: `${slug(item.name)}-packshot.jpg`, mime: "image/jpeg", role: "catalog-packshot", folderKey: "product.catalog", origin: "generated", sourceAssetId: cut.id, meta: { product: item.key, recipe: L("Packshot fond de marque, ombre de contact", "Packshot on brand background, contact shadow"), fidelity: L("pixels d'origine du produit", "original product pixels") } });
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
  const mainCategory = p.product.category?.trim() || p.catalog[0]?.category || C("La sélection", "The selection");
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
      description_html: `${item.description ? `<p>${esc(item.description)}</p>` : ""}${features.length ? `<ul>${features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}` || C("<p>[À compléter : description du produit]</p>", "<p>[To complete: product description]</p>"),
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

// ---------------------------------------------------------------- photos par variante

/** Photo d'une valeur de variante (ex. coloris « Vert sauge ») : détourée puis mise en packshot comme le produit. */
export async function ensureVariantMedia(ctx: JobContext | null, projectId: string) {
  const p = loadProject(projectId);
  const originals = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'variant-original' AND deleted_at IS NULL ORDER BY created_at", projectId);
  for (const original of originals) {
    const value = (JSON.parse(original.meta || "{}") as { variant?: string }).variant ?? "";
    let cut = derived(projectId, "variant-cutout", original.id);
    if (!cut) {
      ctx?.progress(0.1, L(`Détourage : ${value}`, `Cutout: ${value}`));
      const c = await checkedCutout(assetData(original));
      if (!c) continue; // pas de détourage valable : la photo d'origine sert telle quelle
      cut = await saveAsset({ projectId, userId: p.userId, data: c.png, name: `${slug(value)}-${C("detoure", "cutout")}.png`, mime: "image/png", role: "variant-cutout", folderKey: "product.cutouts", origin: "generated", sourceAssetId: original.id, status: c.quality.ok ? "ready" : "rejected", meta: { variant: value, colors: c.quality.ok ? await extractPalette(c.png) : [], method: c.method, quality: { verdict: c.quality.ok ? "ok" : "rejected", reasons: c.quality.reasons, score: c.quality.score, by: "local", checkedAt: Date.now() } } });
    }
    if (cut.status === "rejected") continue;
    if (!derived(projectId, "variant-packshot", cut.id)) {
      ctx?.progress(0.15, L(`Packshot : ${value}`, `Packshot: ${value}`));
      const jpg = await renderPackshot(await loadImage(assetData(cut)), { background: palette(p).light });
      await saveAsset({ projectId, userId: p.userId, data: Buffer.from(jpg), name: `${slug(value)}-packshot.jpg`, mime: "image/jpeg", role: "variant-packshot", folderKey: "images.packshots", origin: "generated", sourceAssetId: cut.id, meta: { variant: value, recipe: L("Packshot fond de marque, ombre de contact", "Packshot on brand background, contact shadow"), fidelity: L("pixels d'origine du produit", "original product pixels") } });
    }
  }
}

/** Associe à chaque variante du produit principal la photo de sa valeur (packshot, sinon photo d'origine). */
export function attachVariantMedia(projectId: string, product: StoreProduct, files: Record<string, string>, fileName: (a: Asset, hint: string) => string) {
  const originals = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'variant-original' AND deleted_at IS NULL ORDER BY created_at DESC", projectId);
  const norm = (s: string) => s.trim().toLowerCase();
  for (const v of product.variants) {
    const value = v.options[0];
    const original = originals.find((o) => norm((JSON.parse(o.meta || "{}") as { variant?: string }).variant ?? "") === norm(value ?? ""));
    if (!original) continue;
    const cut = derived(projectId, "variant-cutout", original.id);
    const asset = (cut && derived(projectId, "variant-packshot", cut.id)) || original;
    const f = fileName(asset, `${C("variante", "variant")}-${slug(value)}`);
    files[f] = asset.id;
    if (!product.images.includes(f)) product.images.push(f);
    v.image = f;
  }
  // La variante par défaut garde la première image de la galerie.
}
