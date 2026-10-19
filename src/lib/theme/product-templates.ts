/** Correspondances d'import, sans prétendre qu'un ZIP ou CSV affecte les gabarits dans Shopify. */
import { storeProducts, type ThemeSpec } from "./spec";
export function productTemplateAssignments(spec: ThemeSpec) {
  return storeProducts(spec).filter((p) => p.template_suffix && spec.templates[`product.${p.template_suffix}`]).map((p) => ({ target: p.contentTarget ?? null, handle: p.handle, title: p.title, templateSuffix: p.template_suffix!, templateFile: `templates/product.${p.template_suffix}.json` }));
}
export function productTemplateManifest(spec: ThemeSpec) {
  return { version: 1, installationVerified: false, csvAssignsTemplates: false, instructions: {
    fr: "Après import du thème et du CSV, ouvrez chaque produit dans Shopify et choisissez le modèle de thème indiqué ci-dessous, puis enregistrez. Le CSV seul n'affecte pas ces modèles. L'installation directe du studio transmet templateSuffix à l'API, sans validation d'installation réelle dans cet export.",
    en: "After importing the theme and CSV, open each product in Shopify, select the theme template listed below, and save. The CSV alone does not assign these templates. The studio direct installer sends templateSuffix to the API; a real installation has not been validated by this export.",
  }, products: productTemplateAssignments(spec) };
}
