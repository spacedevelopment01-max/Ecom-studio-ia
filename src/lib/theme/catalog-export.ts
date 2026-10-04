/**
 * Export du catalogue (tous les produits de la boutique) aux formats d'import natifs :
 *  - Shopify : Produits › Importer (CSV) ;
 *  - WooCommerce : Produits › Importer (CSV).
 * Les images sont référencées par des adresses publiques signées (valables 7 jours) quand le studio
 * a une adresse publique HTTPS ; sinon la colonne reste vide et le guide l'indique.
 */
import { isPublicAppUrl, publicMediaUrl } from "../public-url";
import { storeProducts, type ThemeSpec } from "./spec";
import { L } from "../i18n-server";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const row = (cells: unknown[]) => cells.map(esc).join(",");
const price = (c: number | null) => (c === null || c === undefined ? "" : (c / 100).toFixed(2));
const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function imageUrls(spec: ThemeSpec, files: string[]): string[] {
  if (!isPublicAppUrl()) return [];
  // Fichier et identifiant restent appariés : un fichier manquant ne décale pas les extensions suivantes.
  return files
    .filter((f) => spec.files[f])
    .map((f) => publicMediaUrl(spec.files[f], f.split(".").pop() ?? "jpg", 7 * 24 * 3600));
}

/** Collections auxquelles appartient chaque produit (pour les étiquettes et catégories). */
function collectionsOf(spec: ThemeSpec) {
  const map = new Map<string, string[]>();
  for (const c of spec.store.collections ?? []) for (const h of c.products) map.set(h, [...(map.get(h) ?? []), c.title]);
  return map;
}

export function shopifyProductsCsv(spec: ThemeSpec): string {
  const head = ["Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published", "Option1 Name", "Option1 Value", "Variant SKU", "Variant Price", "Variant Compare At Price", "Variant Requires Shipping", "Variant Taxable", "Image Src", "Image Position", "Image Alt Text", "Status"];
  const cols = collectionsOf(spec);
  const lines = [row(head)];
  for (const p of storeProducts(spec)) {
    const imgs = imageUrls(spec, p.images);
    const variants = p.variants.length ? p.variants : [{ title: "Default Title", options: ["Default Title"], price: p.price, available: true }];
    const hasOptions = p.options.length > 0 && variants[0].title !== "Default Title";
    const tags = [...p.tags, ...(cols.get(p.handle) ?? [])].join(", ");
    const n = Math.max(variants.length, imgs.length, 1);
    for (let i = 0; i < n; i++) {
      const v = variants[i];
      const first = i === 0;
      lines.push(
        row([
          p.handle,
          first ? p.title : "",
          first ? p.description_html : "",
          first ? p.vendor : "",
          first ? p.tags[0] ?? "" : "",
          first ? tags : "",
          first ? "FALSE" : "",
          first ? (hasOptions ? p.options[0] : "Title") : "",
          v ? (hasOptions ? v.options[0] : "Default Title") : "",
          v ? (v as any).sku ?? "" : "",
          v ? price(v.price ?? p.price) : "",
          v ? price(p.compare_at_price) : "",
          v ? "TRUE" : "",
          v ? "TRUE" : "",
          imgs[i] ?? "",
          imgs[i] ? i + 1 : "",
          imgs[i] ? p.title : "",
          first ? "draft" : "",
        ]),
      );
    }
  }
  return lines.join("\n");
}

export function wooProductsCsv(spec: ThemeSpec): string {
  const cols = collectionsOf(spec);
  const lines = [row(["Type", "SKU", "Name", "Published", "Short description", "Description", "Regular price", "Sale price", "Categories", "Tags", "Images", "Attribute 1 name", "Attribute 1 value(s)", "Attribute 1 visible", "Parent"])];
  for (const p of storeProducts(spec)) {
    const imgs = imageUrls(spec, p.images).join(", ");
    const variants = p.variants.length && p.variants[0].title !== "Default Title" ? p.variants : [];
    const cats = (cols.get(p.handle) ?? []).join(", ");
    const desc = strip(p.description_html);
    const sale = p.compare_at_price && p.price !== null && p.compare_at_price > p.price;
    if (!variants.length) {
      lines.push(row(["simple", p.handle, p.title, 0, desc.slice(0, 160), p.description_html, price(sale ? p.compare_at_price : p.price), sale ? price(p.price) : "", cats, p.tags.join(", "), imgs, "", "", "", ""]));
      continue;
    }
    lines.push(row(["variable", p.handle, p.title, 0, desc.slice(0, 160), p.description_html, "", "", cats, p.tags.join(", "), imgs, p.options[0] ?? "Option", variants.map((v) => v.options[0]).join(", "), 1, ""]));
    for (const v of variants) lines.push(row(["variation", `${p.handle}-${v.options[0]}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"), `${p.title} - ${v.title}`, 0, "", "", price(v.price ?? p.price), "", "", "", "", p.options[0] ?? "Option", v.options[0], 1, p.handle]));
  }
  return lines.join("\n");
}

export const catalogImagesNote = () =>
  isPublicAppUrl()
    ? L("Les images sont référencées par des liens valables 7 jours : importez le fichier dans la semaine.", "Images are referenced by links valid for 7 days: import the file within the week.")
    : L("Le studio n'a pas d'adresse publique HTTPS : la colonne des images est vide. Ajoutez les images depuis le dossier « medias » de l'export du thème, ou définissez l'adresse publique dans l'administration.", "The studio has no public HTTPS address: the image column is empty. Add the images from the \"medias\" folder of the theme export, or set the public address in the admin.");
