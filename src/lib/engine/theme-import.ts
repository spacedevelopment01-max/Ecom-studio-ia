/**
 * Import du thème Shopify d'un client dans son projet : le ZIP est conservé dans la bibliothèque,
 * le thème est découpé (pages, sections, blocs, réglages) et devient une version modifiable du studio.
 */
import { saveAsset } from "../library";
import { currentTheme, loadProject, saveThemeVersion } from "../projects";
import { decomposeTheme, openThemeZip, type ImportReport } from "../theme/import";
import type { StoreProduct, ThemeSpec } from "../theme/spec";
import { collectImages, savedCopy, storeProduct } from "./shop";
import { localCopy } from "./local-copy";
import { C, L, contentLang } from "../i18n-server";

/** Données de démonstration de la boutique pour l'aperçu : celles du thème actuel, sinon le produit du projet. */
function storeFor(projectId: string): Pick<ThemeSpec, "store" | "files"> {
  const cur = currentTheme(projectId)?.spec;
  if (cur) return { store: cur.store, files: cur.files };
  const p = loadProject(projectId);
  const name = p.brand?.name ?? p.name;
  let product: StoreProduct;
  let files: Record<string, string> = {};
  if (p.brand) {
    const imgs = collectImages(projectId);
    files = imgs.files;
    product = storeProduct(p, savedCopy(projectId) ?? localCopy(p.product, p.brand, p), imgs.gallery);
  } else {
    product = { title: p.product.name || C("Votre produit", "Your product"), handle: C("produit", "product"), vendor: name, description_html: "", price: null, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [], tags: [] };
  }
  return { files, store: { shopName: name, product, pages: [{ handle: "contact", title: "Contact", template_suffix: "contact", body_html: "" }], menus: { "main-menu": { title: C("Menu principal", "Main menu"), links: [{ title: C("Accueil", "Home"), url: "/" }, { title: C("Boutique", "Shop"), url: "/collections/all" }, { title: "Contact", url: "/pages/contact" }] }, footer: { title: C("Pied de page", "Footer"), links: [{ title: C("Recherche", "Search"), url: "/search" }] } }, policies: [] } };
}

export async function importThemeForProject(projectId: string, userId: string, zip: Buffer, fileName: string): Promise<{ versionId: string; number: number; report: ImportReport }> {
  const arc = openThemeZip(new Uint8Array(zip));
  const d = decomposeTheme(arc, fileName);
  // Images hébergées par Shopify (shopify://…) : absentes du ZIP, affichées en emplacement vide dans l'aperçu.
  const refs = JSON.stringify([d.templates, d.groups, d.settings]).match(/shopify:\/\/shop_images\//g)?.length ?? 0;
  if (refs) d.report.warnings.push(L(`${refs} image(s) hébergée(s) sur votre boutique Shopify : elles ne sont pas dans le fichier du thème et apparaissent comme emplacements vides dans l'aperçu. Elles restent en place sur Shopify.`, `${refs} image(s) hosted on your Shopify store: they are not in the theme file and appear as empty placeholders in the preview. They stay in place on Shopify.`));
  const asset = await saveAsset({ projectId, userId, data: zip, name: fileName.endsWith(".zip") ? fileName : `${fileName}.zip`, mime: "application/zip", kind: "archive", role: "theme-import", folderKey: "shop.exports", origin: "upload", meta: { recipe: L(`Thème Shopify importé : ${d.report.name}`, `Imported Shopify theme: ${d.report.name}`), sections: d.report.files.sections, pages: d.report.files.jsonTemplates } });
  const base = storeFor(projectId);
  const empty = (type: "header" | "footer") => ({ type, name: type === "header" ? C("En-tête", "Header") : C("Pied de page", "Footer"), sections: {}, order: [] });
  const spec: ThemeSpec = {
    v: 1,
    name: L(`${d.report.name} (importé)`, `${d.report.name} (imported)`),
    direction: "import",
    settings: d.settings,
    groups: { header: d.groups.header ?? empty("header"), footer: d.groups.footer ?? empty("footer") },
    templates: d.templates,
    customSections: {},
    files: base.files,
    locks: [],
    imported: { name: d.report.name, archive: asset.id, root: arc.root, groups: Object.keys(d.groups) as ("header" | "footer")[], presets: d.presets, report: d.report },
    store: base.store,
    language: contentLang(),
  };
  const v = saveThemeVersion(projectId, spec, L(`Thème importé : ${d.report.name} (${d.report.files.sections} sections, ${d.report.pages.length} pages)`, `Imported theme: ${d.report.name} (${d.report.files.sections} sections, ${d.report.pages.length} pages)`), "user");
  return { versionId: v.id, number: v.number, report: d.report };
}
