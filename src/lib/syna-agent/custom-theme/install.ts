/**
 * Mise en boutique du thème sur mesure (étape 7 de SINA) : le thème devient une version de thème du Studio, prête à
 * être exportée en ZIP ou envoyée à Shopify par les chemins qui existent déjà. Gratuit, sans IA.
 *
 * Rien ne part si un contrôle refuse : une information encore « [À compléter] » (sauf accord du client pour la
 * retirer), une photo d'exemple, une section qui n'est pas à la tenue, une section que le contrôle du Studio refuse.
 * La version créée n'est PAS activée : le thème sur mesure reste celui que le client voit dans l'onglet Boutique.
 */
import { companyOf } from "../activity";
import { getAsset } from "../../library";
import { listProducts, updateProduct } from "../../products/catalog";
import { currentTheme, loadProject, saveThemeVersion } from "../../projects";
import { validateCustomSection, validateSpec } from "../../theme/ops";
import { linkMap, priceNotes, tenuePrestations, titleWeight } from "./render";
import { loadCustomTheme } from "./theme";
import { customThemeSpec, type ExportProblem, type ShopifyExport } from "./to-shopify";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };

/** Le thème sur mesure du projet converti pour Shopify, avec tout ce que les contrôles relèvent. Rien n'est enregistré. */
export function customThemeExport(projectId: string, o: { dropMissing?: boolean } = {}): ShopifyExport {
  const p = loadProject(projectId), t = loadCustomTheme(projectId);
  if (!t) throw new Error("Aucun thème sur mesure à mettre en boutique.");
  const business = p.business === "services" ? "services" as const : "products" as const;
  const products = business === "services" ? [] : (() => { try { return listProducts(projectId).filter((x) => x.status === "active"); } catch { return []; } })();
  const company = (() => { try { return companyOf(projectId) as { shipping?: string; returns?: string; phone?: string; address?: string }; } catch { return {}; } })();
  const out = customThemeSpec(t, {
    name: p.brand?.name || p.name || "Boutique", palette: p.brand?.palette ?? null, fonts: p.brand?.fonts ?? null, business,
    products: products.map((x) => ({ handle: x.handle, title: x.data.title, categories: x.data.categories })),
    prestations: tenuePrestations(projectId), company: { shipping: company.shipping?.trim() || null, returns: company.returns?.trim() || null },
    priceNotes: priceNotes(projectId), titleWeight: titleWeight(p.brand?.fonts?.heading, t.tenue?.titres),
    site: { phone: p.services?.phone || company.phone || null, address: p.services?.address || company.address || null, hours: p.services?.hours || null, area: p.services?.area || null },
    assetExt: (id) => { const a = getAsset(id); return a && a.project_id === projectId ? EXT[a.mime] ?? null : null; },
    linkMap: linkMap(t), logoAssetId: p.brand?.logo?.assetId ?? null, dropMissing: o.dropMissing, base: currentTheme(projectId)?.spec ?? null,
  });
  // Contrôles du Studio : chaque section (Liquid, schéma, aucun script extérieur), puis le thème entier.
  const problems: ExportProblem[] = [...out.problems];
  for (const s of Object.values(out.spec.customSections)) { const why = validateCustomSection(s.liquid); if (why) problems.push({ level: "bloquant", text: `section « ${s.name} » refusée par le contrôle du Studio : ${why}` }); }
  for (const why of validateSpec(out.spec)) problems.push({ level: "bloquant", text: `thème : ${why}` });
  return { ...out, problems };
}

export type InstallResult = { ok: true; versionId: string; number: number; sections: number; templates: string[]; notes: string[] } | { ok: false; blocking: string[]; notes: string[] };
/** Crée la version de thème à envoyer en boutique (non activée) ; note sur chaque produit le modèle de sa fiche. */
export function installCustomTheme(projectId: string, o: { dropMissing?: boolean } = {}): InstallResult {
  const out = customThemeExport(projectId, o);
  const notes = out.problems.filter((x) => x.level === "à savoir").map((x) => x.text), blocking = out.problems.filter((x) => x.level === "bloquant").map((x) => x.text);
  if (blocking.length) return { ok: false, blocking, notes };
  // Une fiche par produit : chaque produit du catalogue sait quel modèle de page est le sien.
  for (const x of listProducts(projectId)) { const suffix = out.productSuffixes[x.handle] ?? ""; if ((x.data.templateSuffix ?? "") !== suffix) updateProduct(projectId, x.id, { templateSuffix: suffix }); }
  const v = saveThemeVersion(projectId, out.spec, "Thème sur mesure prêt pour la boutique", "system", undefined, undefined, { activate: false });
  return { ok: true, versionId: v.id, number: v.number, sections: out.sections, templates: out.templates, notes };
}
