/**
 * Mise en boutique du thème sur mesure (étape 7 de SINA) : le thème devient une version de thème du Studio, prête à
 * être exportée en ZIP ou envoyée à Shopify par les chemins qui existent déjà. Gratuit, sans IA.
 *
 * Rien ne part si un contrôle refuse : une information encore « [À compléter] » (sauf accord du client pour la
 * retirer), une photo d'exemple, une section qui n'est pas à la tenue, une section que le contrôle du Studio refuse.
 * La version créée n'est PAS activée : le thème sur mesure reste celui que le client voit dans l'onglet Boutique.
 */
import { loadShopOffers, type ShopOffers } from "../product-features";
import { companyOf } from "../activity";
import { getAsset } from "../../library";
import { listProducts, updateProduct } from "../../products/catalog";
import { all } from "../../db";
import { currentTheme, loadProject, remember, saveThemeVersion } from "../../projects";
import { offrePourExport } from "../../cms-v2/achat";
import { storeProducts } from "../../theme/store-products";
import type { ThemeSpec } from "../../theme/spec";
import { validateCustomSection, validateSpec } from "../../theme/ops";
import { linkMap, priceNotes, tenuePrestations, titleWeight } from "./render";
import { loadCustomTheme } from "./theme";
import { tenueMetiers, tenueVitrine } from "./tenue-data";
import { indicateurRemises, offreDepuisOffres, type OffreBoutique, type PreuveRemises } from "./remises";
import { customThemeSpec, type ExportProblem, type ShopifyExport } from "./to-shopify";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };

// ---------------------------------------------------------------- remises : la preuve lue dans la boutique du client

const PREUVE_KEY = "syna.remises_preuve";
/** Garde ce que la boutique du client a répondu sur l'état de ses remises (outil « shop.discounts_check »). */
export function gardePreuveRemises(projectId: string, preuve: PreuveRemises): void {
  remember(projectId, { kind: "artifact", key: PREUVE_KEY, value: JSON.stringify(preuve), source: "local", origin: "system" });
}
/** La dernière réponse de la boutique sur ses remises, ou null si elle n'a jamais été interrogée. */
export function preuveRemises(projectId: string): PreuveRemises | null {
  try {
    const row = all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=? AND state='active' LIMIT 1", projectId, PREUVE_KEY)[0];
    const p = row ? JSON.parse(row.value) as PreuveRemises : null;
    return p && typeof p.luLe === "number" && typeof p.actif === "boolean" ? p : null;
  } catch { return null; }
}
/**
 * L'offre du projet telle qu'elle part avec le site : mêmes règles et même empreinte que l'export vers WooCommerce et
 * PrestaShop (cms-v2/achat.ts : « offreDuProjet » puis « offrePourExport »), calculées sur le catalogue du thème en
 * place ; sans thème en place, sur le catalogue du Studio. Null : aucune remise à tenir.
 */
export function offreDuSite(projectId: string, offres: ShopOffers | null, spec: Pick<ThemeSpec, "store"> | null): OffreBoutique | null {
  if (!offres) return null;
  try {
    if (spec?.store?.product) {
      const list = storeProducts(spec);
      const { offre } = offreDepuisOffres(offres, list.map((p) => ({ handle: p.handle, titre: p.title, centimes: p.variants[0]?.price ?? p.price })), list[0]?.currency || "EUR");
      return offrePourExport(offre, spec as ThemeSpec).offre;
    }
    const { offre } = offreDepuisOffres(offres, listProducts(projectId).filter((x) => x.status === "active").map((x) => ({ handle: x.handle, titre: x.data.title, centimes: x.variants[0]?.price ?? x.data.price })));
    return Object.keys(offre.produits).length ? offre : null;
  } catch { return null; }
}
/** Les remises du projet peuvent-elles s'afficher ? La preuve de la boutique quand elle existe, sinon la déclaration du client. */
export function remisesDuProjet(projectId: string, offres: ShopOffers | null, spec: Pick<ThemeSpec, "store"> | null, maintenant = Date.now()) {
  return indicateurRemises(offreDuSite(projectId, offres, spec), preuveRemises(projectId), !!offres?.remisesConfirmees, { maintenant });
}

/** Le thème sur mesure du projet converti pour Shopify, avec tout ce que les contrôles relèvent. Rien n'est enregistré. */
export function customThemeExport(projectId: string, o: { dropMissing?: boolean } = {}): ShopifyExport {
  const p = loadProject(projectId), t = loadCustomTheme(projectId);
  if (!t) throw new Error("Aucun thème sur mesure à mettre en boutique.");
  const business = p.business === "services" ? "services" as const : "products" as const;
  const products = business === "services" ? [] : (() => { try { return listProducts(projectId).filter((x) => x.status === "active"); } catch { return []; } })();
  const company = (() => { try { return companyOf(projectId) as { shipping?: string; returns?: string; phone?: string; address?: string; addressDiscreet?: boolean }; } catch { return {}; } })();
  // Remises : l'indicateur vient de la preuve lue dans la boutique quand elle existe, sinon de la déclaration du client.
  const base = currentTheme(projectId)?.spec ?? null;
  const saisies = (() => { try { return loadShopOffers(projectId); } catch { return null; } })();
  const remises = business === "products" ? remisesDuProjet(projectId, saisies, base) : null;
  const out = customThemeSpec(t, {
    name: p.brand?.name || p.name || "Boutique", palette: p.brand?.palette ?? null, fonts: p.brand?.fonts ?? null, business,
    products: products.map((x) => ({ handle: x.handle, title: x.data.title, categories: x.data.categories })),
    prestations: tenuePrestations(projectId), company: { shipping: company.shipping?.trim() || null, returns: company.returns?.trim() || null },
    priceNotes: priceNotes(projectId), titleWeight: titleWeight(p.brand?.fonts?.heading, t.tenue?.titres),
    site: { phone: p.services?.phone || company.phone || null, address: company.addressDiscreet === true ? null : p.services?.address || company.address || null, addressDiscreet: company.addressDiscreet === true, hours: p.services?.hours || null, area: p.services?.area || null,
      // Métiers : les vrais biens publiés et la vraie carte du client partent avec le site (jamais une ligne d'exemple).
      ...tenueMetiers(projectId),
      // Vente directe : ce que le catalogue sait de plus (genre, prix de comparaison, « dès », versions).
      vitrine: tenueVitrine(projectId) },
    assetExt: (id) => { const a = getAsset(id); return a && a.project_id === projectId ? EXT[a.mime] ?? null : null; },
    linkMap: linkMap(t), logoAssetId: p.brand?.logo?.assetId ?? null, dropMissing: o.dropMissing, base,
    offres: saisies && remises ? { ...saisies, remisesConfirmees: remises.ok } : saisies,
  });
  // Contrôles du Studio : chaque section (Liquid, schéma, aucun script extérieur), puis le thème entier.
  const problems: ExportProblem[] = [...out.problems];
  // La boutique a été interrogée et ne tient pas les remises : c'est dit, même si le client les avait déclarées.
  if (remises?.source === "preuve" && !remises.ok) problems.push({ level: "à savoir", text: `Remises : ${remises.pourquoi} Aucun prix de lot ni de pack ne part tant que la boutique ne les tient pas.` });
  for (const s of Object.values(out.spec.customSections)) { const why = validateCustomSection(s.liquid); if (why) problems.push({ level: "bloquant", text: `section « ${s.name} » refusée par le contrôle du Studio : ${why}` }); }
  for (const why of validateSpec(out.spec)) problems.push({ level: "bloquant", text: `thème : ${why}` });
  return { ...out, problems };
}

export type InstallResult = { ok: true; versionId: string; number: number; sections: number; templates: string[]; notes: string[] } | { ok: false; blocking: string[]; notes: string[] };
/** Crée la version de thème à envoyer en boutique (non activée) ; note sur chaque produit le modèle de sa fiche. */
export function installCustomTheme(projectId: string, o: { dropMissing?: boolean; /** Lot 4 : le site de SINA devient la version active du moteur (mise en ligne, envoi en boutique). */ activate?: boolean } = {}): InstallResult {
  const out = customThemeExport(projectId, { dropMissing: o.dropMissing });
  const notes = out.problems.filter((x) => x.level === "à savoir").map((x) => x.text), blocking = out.problems.filter((x) => x.level === "bloquant").map((x) => x.text);
  if (blocking.length) return { ok: false, blocking, notes };
  // Une fiche par produit : chaque produit du catalogue sait quel modèle de page est le sien.
  for (const x of listProducts(projectId)) { const suffix = out.productSuffixes[x.handle] ?? ""; if ((x.data.templateSuffix ?? "") !== suffix) updateProduct(projectId, x.id, { templateSuffix: suffix }); }
  const v = saveThemeVersion(projectId, out.spec, "Thème sur mesure prêt pour la boutique", "system", undefined, undefined, { activate: !!o.activate });
  return { ok: true, versionId: v.id, number: v.number, sections: out.sections, templates: out.templates, notes };
}
