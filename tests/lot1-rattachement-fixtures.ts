/** Données synthétiques de la reprise du lot 1 ; vrais projets, thèmes et documents en base isolée. */
import { seedHoldout } from "./lot1-holdout-fixtures";
import { loadProject, saveServices, saveProduct, saveCatalog, saveThemeVersion } from "@/lib/projects";
import { composeThemeV2 } from "@/lib/theme-v2/engine";
import { runContentEngineV2, saveUserEdit } from "@/lib/seo-v2/engine";
import { localOnlyDeps } from "@/lib/seo-v2/deps";
import type { ThemeSpec, StorePage } from "@/lib/theme/spec";
export const TARGETS = ["service:offer-1", "service:offer-2"] as const;
export const markers = (n: number) => ({ text: `Texte intégral de l'offre ${n}, à conserver sur sa propre page.`, title: `Référencement de l'offre ${n}`, description: `Description précise de l'offre ${n}, sans mélange avec une autre prestation.` });
export async function servicePair(userId: string, o: { activity?: 2 | 3; reverseServices?: boolean; reversePages?: boolean; identities?: boolean; names?: [string, string] } = {}) {
  const pid = seedHoldout(userId, o.activity ?? 2, "Association synthétique");
  const p = loadProject(pid);
  const services = [1, 2].map((n, i) => ({ key: `offer-${n}`, name: o.names?.[i] ?? "Diagnostic", description: `Description déclarée de la prestation ${n}.` }));
  saveServices(pid, { ...p.services, services: o.reverseServices ? services.reverse() : services });
  const built = await composeThemeV2(pid);
  const pages: StorePage[] = [1, 2].map((n, i) => ({ handle: `prestation-${n}`, title: o.names?.[i] ?? "Diagnostic", ...(o.identities === false ? {} : { contentTarget: TARGETS[i] }), template_suffix: "", body_html: `<p>Texte historique ${n}.</p>`, seo: { title: `Ancien titre ${n}`, description: `Ancienne description ${n}` } }));
  built.spec.store.pages = o.reversePages ? pages.reverse() : pages;
  saveThemeVersion(pid, built.spec, "Deux pages synthétiques conservées", "user");
  return { pid, spec: built.spec };
}
export async function writePair(pid: string, business: "products" | "services" = "services") {
  const targets = business === "services" ? TARGETS : ["product:main", "product:catalog:accessory"];
  for (const [i, pageKey] of targets.entries()) {
    const r = await runContentEngineV2(null, pid, { type: business === "services" ? "service_page" : "product_page", pageKey, lang: "fr" }, localOnlyDeps());
    const m = markers(i + 1);
    saveUserEdit(pid, r.docKey!, { ...r.doc!, meta: { ...r.doc!.meta, seoTitle: m.title, metaDescription: m.description }, blocks: [{ id: "title", kind: "h1", text: "Diagnostic" }, { id: "body", kind: "p", text: m.text }] });
  }
}
export async function productPair(userId: string, o: { activity?: 0 | 1; reverseProducts?: boolean; identities?: boolean; names?: [string, string] } = {}) {
  const pid = seedHoldout(userId, o.activity ?? 0, "Catalogue synthétique");
  const p = loadProject(pid);
  saveProduct(pid, { ...p.product, name: o.names?.[0] ?? "Diagnostic" });
  saveCatalog(pid, [{ key: "accessory", name: o.names?.[1] ?? "Diagnostic", category: "Accessoires", description: "Accessoire distinct", features: ["Usage déclaré"], price: 1200, compareAt: null, originalAssetId: null }], "multi");
  const built = await composeThemeV2(pid);
  built.spec.store.product.handle = "principal";
  built.spec.store.products![0].handle = "accessoire";
  if (o.identities === false) { delete built.spec.store.product.contentTarget; delete built.spec.store.products![0].contentTarget; }
  if (o.reverseProducts) {
    const main = built.spec.store.product; built.spec.store.product = built.spec.store.products![0]; built.spec.store.products = [main];
  }
  saveThemeVersion(pid, built.spec, "Catalogue synthétique conservé", "user");
  return { pid, spec: built.spec };
}
export const clone = (spec: ThemeSpec) => structuredClone(spec);
