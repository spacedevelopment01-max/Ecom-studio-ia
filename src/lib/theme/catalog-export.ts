/**
 * Export du catalogue (tous les produits de la boutique) aux formats d'import natifs :
 *  - Shopify : Produits › Importer (CSV) ;
 *  - WooCommerce : Produits › Importer (CSV).
 * Les images sont référencées par des adresses publiques signées (valables 7 jours) quand le studio
 * a une adresse publique HTTPS ; sinon la colonne reste vide et le guide l'indique.
 */
import { isPublicAppUrl, publicMediaUrl } from "../public-url";
import { createHash } from "node:crypto";
import { storeProducts, type StoreProduct, type ThemeSpec } from "./spec";
import { L } from "../i18n-server";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const row = (cells: unknown[]) => cells.map(esc).join(",");
/**
 * Ligne d'en-tête SANS guillemets : le fichier commence par le marqueur UTF-8 (BOM) et l'importateur de WooCommerce
 * lit alors la 1re colonne « "Type" » avec ses guillemets (colonne non reconnue : déclinaisons importées comme
 * produits séparés — constaté à l'installation locale, phase 11A). Les intitulés ne contiennent ni virgule ni guillemet.
 */
const header = (cells: string[]) => cells.join(",");
const price = (c: number | null) => (c === null || c === undefined ? "" : (c / 100).toFixed(2));
const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export type CatalogImageOptions = { imageUrls?: Readonly<Record<string, string>> };
function imageUrls(spec: ThemeSpec, files: string[], options: CatalogImageOptions = {}): string[] {
  if (!options.imageUrls && !isPublicAppUrl()) return [];
  // Fichier et identifiant restent appariés : un fichier manquant ne décale pas les extensions suivantes.
  return files
    .filter((f) => spec.files[f])
    .map((f) => options.imageUrls ? options.imageUrls[f] ?? "" : publicMediaUrl(spec.files[f], f.split(".").pop() ?? "jpg", 7 * 24 * 3600)).filter(Boolean);
}

/** Collections auxquelles appartient chaque produit (pour les étiquettes et catégories). */
function collectionsOf(spec: ThemeSpec) {
  const map = new Map<string, string[]>();
  for (const c of spec.store.collections ?? []) for (const h of c.products) map.set(h, [...(map.get(h) ?? []), c.title]);
  return map;
}

/** SKU déterministe d'une combinaison : ne dépend ni de sa position ni d'un libellé désaccentué. */
export function variantExportSku(p: StoreProduct, v: StoreProduct["variants"][number]): string {
  return v.sku?.trim() || `es-${createHash("sha256").update(JSON.stringify([p.handle, v.options])).digest("hex").slice(0, 24)}`;
}
export const productVariants = (p: StoreProduct) => p.options.length ? p.variants : [];
export const productExportSku = (p: StoreProduct) => !p.options.length && p.variants[0]?.sku?.trim() ? p.variants[0].sku.trim() : p.handle;
/** Préserve les libellés ; refuse une ambiguïté au lieu de fusionner deux attributs Woo. */
export function validateCatalog(spec: ThemeSpec, maxAxes = Infinity) {
  const skus = new Set<string>();
  for (const p of storeProducts(spec)) {
    if (p.options.length > maxAxes) throw new Error(`catalog_options_limit: ${p.handle} (${p.options.length} > ${maxAxes})`);
    for (const sku of [productExportSku(p), ...productVariants(p).map(v => variantExportSku(p, v))]) {
      const key = sku.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en").replace(/ß/g,"ss").replace(/æ/g,"ae").replace(/œ/g,"oe");
      if (skus.has(key)) throw new Error(`catalog_sku_collision: ${sku}`);
      skus.add(key);
    }
    const combinations = new Set<string>();
    for (const v of productVariants(p)) {
      if (v.options.length !== p.options.length || v.options.some(o => !o.trim())) throw new Error(`catalog_incomplete_variant: ${p.handle}`);
      const key = JSON.stringify(v.options);
      if (combinations.has(key)) throw new Error(`catalog_duplicate_combination: ${p.handle}`);
      combinations.add(key);
    }
  }
}

export function shopifyProductsCsv(spec: ThemeSpec, options: CatalogImageOptions = {}): string {
  validateCatalog(spec, 3); // Shopify : trois axes natifs, jamais de troncature silencieuse.
  const head = ["Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published", ...[1,2,3].flatMap(i => [`Option${i} Name`, `Option${i} Value`]), "Variant SKU", "Variant Price", "Variant Compare-at Price", "Variant Requires Shipping", "Variant Taxable", "Variant Inventory Tracker", "Variant Inventory Qty", "Variant Inventory Policy", "Variant Fulfillment Service", "Variant Image", "Image Src", "Image Position", "Image Alt Text", "SEO Title", "SEO Description", "Status"];
  const cols = collectionsOf(spec);
  const lines = [header(head)];
  if (spec.store.business === "services") return lines.join("\n");
  for (const p of storeProducts(spec)) {
    const imgs = imageUrls(spec, p.images, options);
    const variants = p.variants.length ? p.variants : [{ title: "Default Title", options: [], price: p.price, available: true }];
    const hasOptions = p.options.length > 0;
    const tags = [...p.tags, ...(cols.get(p.handle) ?? [])].join(", ");
    const n = Math.max(variants.length, imgs.length, 1);
    for (let i = 0; i < n; i++) {
      const v = variants[i]; const first = i === 0;
      const axes = [0,1,2].flatMap(a => [first ? (hasOptions ? p.options[a] ?? "" : a === 0 ? "Title" : "") : "", v ? (hasOptions ? v.options[a] ?? "" : a === 0 ? "Default Title" : "") : ""]);
      const variantImage = v?.image ? imageUrls(spec, [v.image], options)[0] ?? "" : "";
      lines.push(row([
        p.handle, first ? p.title : "", first ? p.description_html : "", first ? p.vendor : "", first ? p.tags[0] ?? "" : "", first ? tags : "", first ? "FALSE" : "", ...axes,
        v ? variantExportSku(p, v) : "", v ? price(v.price ?? p.price) : "", v ? price(p.compare_at_price) : "", v ? "TRUE" : "", v ? "TRUE" : "",
        v?.inventory_quantity !== undefined ? "shopify" : "", v?.inventory_quantity ?? "", v ? "deny" : "", v ? "manual" : "", variantImage,
        imgs[i] ?? "", imgs[i] ? i + 1 : "", imgs[i] ? p.title : "", first ? p.seo?.title ?? "" : "", first ? p.seo?.description ?? "" : "", first ? "draft" : "",
      ]));
    }
  }
  return lines.join("\n");
}

export function wooProductsCsv(spec: ThemeSpec): string {
  validateCatalog(spec);
  const products = spec.store.business === "services" ? [] : storeProducts(spec);
  const axes = Math.max(1, ...products.map(p => p.options.length));
  const cols = collectionsOf(spec);
  const attrHead = Array.from({length: axes}, (_,i) => [`Attribute ${i+1} name`, `Attribute ${i+1} value(s)`, `Attribute ${i+1} visible`, `Attribute ${i+1} global`]).flat();
  const lines = [header(["Type", "SKU", "Name", "Published", "Short description", "Description", "Regular price", "Sale price", "Categories", "Tags", "Images", "In stock?", "Stock", "Parent", ...attrHead])];
  for (const p of products) {
    const variants = productVariants(p); const imgs = imageUrls(spec, p.images).join(", ");
    // WC indexe les attributs personnalisés par un nom normalisé : refuser deux noms qui s'y confondent.
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (new Set(p.options.map(norm)).size !== p.options.length) throw new Error(`catalog_attribute_collision: ${p.handle}`);
    const foldedCombinations = variants.map(v => JSON.stringify(v.options.map(norm)));
    if (new Set(foldedCombinations).size !== foldedCombinations.length) throw new Error(`catalog_csv_value_collision_use_local_import: ${p.handle}`);
    const attrs = (variant?: StoreProduct["variants"][number]) => Array.from({length:axes},(_,i) => p.options[i] ? [p.options[i], variant ? variant.options[i] : [...new Set(variants.map(v => v.options[i]))].join(", "), 1, 0] : ["","","",""]).flat();
    const sale = p.compare_at_price != null && p.price != null && p.compare_at_price > p.price;
    const simplePrice = p.variants[0]?.price ?? p.price;
    lines.push(row([variants.length ? "variable" : "simple", productExportSku(p), p.title, 0, strip(p.description_html).slice(0,160), p.description_html, variants.length ? "" : price(sale ? p.compare_at_price : simplePrice), !variants.length && sale ? price(simplePrice) : "", (cols.get(p.handle) ?? []).join(", "), p.tags.join(", "), imgs, variants.length ? "" : p.variants[0]?.available === false ? 0 : 1, variants.length ? "" : p.variants[0]?.inventory_quantity ?? "", "", ...attrs()]));
    for (const v of variants) lines.push(row(["variation", variantExportSku(p,v), `${p.title} - ${v.title}`, 1, "", "", price(v.price ?? p.price), "", "", "", v.image ? imageUrls(spec,[v.image])[0] ?? "" : "", v.available ? 1 : 0, v.inventory_quantity ?? "", p.handle, ...attrs(v)]));
  }
  return lines.join("\n");
}

export const catalogImagesNote = () =>
  isPublicAppUrl()
    ? L("Les CSV utilisent des liens d’images valables 7 jours. Les exports WooCommerce et PrestaShop proposent aussi un import local depuis les fichiers livrés, sans URL publique.", "CSV image links last 7 days. WooCommerce and PrestaShop exports also offer local import from the delivered files, without a public URL.")
    : L("Sans adresse publique, les images des CSV sont vides. Utilisez l’import local du catalogue livré dans le thème WooCommerce ou le module PrestaShop : il associe les fichiers et les variantes. Pour Shopify, téléversez les images puis renseignez leurs URL dans le CSV avant import.", "Without a public address, CSV images are empty. Use the local catalog import in the WooCommerce theme or PrestaShop module: it associates files and variants. For Shopify, upload images then set their URLs in the CSV before importing.");
