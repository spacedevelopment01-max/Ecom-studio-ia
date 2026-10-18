/**
 * CMS Engine V2 — point d'entrée unique des exports (phase 11A) :
 *   PROJECT BRAIN → THEME ENGINE V2 (ThemeSpec) → DESIGN SYSTEM (couche design commune) → PAGES & SECTIONS →
 *   MÉDIAS (refusés exclus) → REGISTRE DES CAPACITÉS → ADAPTATEUR DE LA PLATEFORME → CONTRÔLES → QUALITY GATE.
 * Une seule représentation (le ThemeSpec et ses gabarits), aucun générateur artistique par plateforme.
 */
import { unzipSync, zipSync, strToU8 } from "fflate";
import type { AssetLoader } from "../theme/compile";
import { renderPage } from "../theme/render";
import type { ThemeSpec } from "../theme/spec";
import { guardPurchaseExport, purchaseExportManifest } from "../theme/purchase-offers";
import { exportKit } from "../theme/platforms";
import { exportShopify } from "./adapters/shopify";
import { exportWordPress } from "./adapters/wordpress";
import { exportPrestaShop } from "./adapters/prestashop";
import { forbiddenMedia, staticChecks, type StaticCheck } from "./checks";
import { missingEditorialMedia } from "../theme/editorial-media";
import { adaptForPlatform } from "./adapt";
import { gateCmsExport, type CmsGateResult, type CriterionKey, type Measure } from "./quality";
import type { CmsPlatform, PlatformExport } from "./types";
import { catalogSnapshot } from "./catalog";

export const CMS_PLATFORMS: CmsPlatform[] = ["shopify", "woocommerce", "prestashop", "wix", "squarespace"];

/** Nom de fichier sûr partout (sans accents ni caractères spéciaux) : « sérum-éclat » → « serum-eclat ». */
export function safeFileName(name: string): string {
  const ext = name.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
  const base = name.slice(0, name.length - ext.length).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return (base || "export") + ext.toLowerCase();
}

/** Génère l'export d'une plateforme. Les médias refusés ou fatals ne sont JAMAIS exportés. */
export async function cmsExport(platform: CmsPlatform, spec0: ThemeSpec, load: AssetLoader, opts: { projectId?: string } = {}): Promise<PlatformExport> {
  const guardedOffers = guardPurchaseExport(spec0, platform);
  const spec = structuredClone(adaptForPlatform(guardedOffers.spec, platform));
  const { forbidden } = forbiddenMedia(spec, opts.projectId);
  for (const file of forbiddenMedia(spec, opts.projectId).foreign) forbidden.add(file);
  const blockedIds = new Set([...forbidden].map((f) => spec.files[f]));
  for (const file of forbidden) delete spec.files[file];
  const guarded: AssetLoader = (id) => (blockedIds.has(id) ? null : load(id));
  let exp: PlatformExport;
  if (platform === "shopify") exp = await exportShopify(spec, guarded);
  else if (platform === "woocommerce") exp = await exportWordPress(spec, guarded);
  else if (platform === "prestashop") exp = await exportPrestaShop(spec, guarded);
  else {
    const k = await exportKit(spec, guarded, platform);
    exp = { platform, zip: k.zip, name: k.name, kind: "kit", files: [], issues: [], sections: [], media: Object.keys(spec.files).filter((f) => !forbidden.has(f)) };
  }
  exp.name = safeFileName(exp.name);
  const entries = unzipSync(exp.zip);
  const prefix = platform === "woocommerce" ? `${exp.files[0].split("/")[0]}/` : "";
  const mediaPrefix = platform === "woocommerce" ? `${prefix}assets/es/` : platform === "prestashop" ? "assets/es/" : platform === "shopify" ? "assets/" : "medias/";
  const media = Object.fromEntries(Object.keys(spec.files).filter(f => entries[mediaPrefix + f]).map(f => [f, entries[mediaPrefix + f]]));
  const catalog = catalogSnapshot(spec, media, opts.projectId);
  const catalogFile = platform === "woocommerce" ? `${prefix}inc/catalogue.json` : platform === "prestashop" ? "dependencies/modules/esstudio/catalogue.json" : platform === "shopify" ? "assets/es-catalogue.json" : "catalogue.json";
  entries[catalogFile] = strToU8(JSON.stringify(catalog, null, 2));
  // Données de reprise complètes, distinctes des composants effectivement rendus par le CMS.
  const configuration = strToU8(JSON.stringify({ settings: spec.settings, groups: spec.groups, templates: spec.templates, customSections: spec.customSections, store: { ...spec.store, pages: spec.store.pages.filter(p => p.status !== "draft") } }, null, 2));
  const configurationFile = platform === "woocommerce" ? `${prefix}inc/configuration-studio.json` : platform === "prestashop" ? "config/es-studio.json" : platform === "shopify" ? "assets/es-studio.json" : "configuration-studio.json";
  entries[configurationFile] = configuration;
  if (platform === "wix" || platform === "squarespace") {
    const guide = new TextDecoder().decode(entries["GUIDE.md"]);
    entries["GUIDE.md"] = strToU8(guide + "\n\n## Catalogue, pages et navigation / Catalog, pages and navigation\n\n`catalogue.json` conserve les axes, combinaisons, SKU, prix, associations d’images, pages et menus. `configuration-studio.json` conserve les réglages et tous les contenus des sections. Ces JSON et le CSV sont des données de reprise : aucun n’est annoncé comme un import natif validé. Reportez les colonnes dans le modèle actuel de la plateforme et affectez les fichiers de `medias/`. Aucune publication automatique.\n\n`catalogue.json` retains axes, combinations, SKUs, prices, image associations, pages and menus. `configuration-studio.json` retains section settings and complete contents. These JSON files and the CSV are rebuild data, not a verified native importer. Map columns to the platform’s current template and assign the files in `medias/`. No automatic publication.\n");
  }
  if (platform === "woocommerce") {
    const sitePath = `${prefix}inc/site.json`; const site = JSON.parse(new TextDecoder().decode(entries[sitePath]));
    site.catalogSource = catalog.source; entries[sitePath] = strToU8(JSON.stringify(site, null, 1));
  }
  if (platform === "prestashop") {
    const sitePath = "dependencies/modules/esstudio/site.json"; const site = JSON.parse(new TextDecoder().decode(entries[sitePath]));
    site.catalogSource = catalog.source; site.theme = new TextDecoder().decode(entries["config/theme.yml"]).match(/^name: (.+)$/m)?.[1];
    entries[sitePath] = strToU8(JSON.stringify(site, null, 1));
    entries["config/es-site.json"] = entries[sitePath];
    entries["config/es-catalogue.json"] = entries[catalogFile];
    // ThemeManager ne remplace pas toujours un module compagnon déjà installé.
    // Archive distincte téléversable via le gestionnaire de modules, sans désinstallation ni perte des correspondances.
    const modulePrefix = "dependencies/modules/";
    const moduleFiles = Object.fromEntries(Object.entries(entries).filter(([file]) => file.startsWith(modulePrefix)).map(([file, bytes]) => [file.slice(modulePrefix.length), bytes]));
    entries["import/module-esstudio.zip"] = zipSync(moduleFiles, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") });
  }
  exp.zip = Buffer.from(zipSync(entries, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") }));
  exp.files = Object.keys(entries);
  for (const missing of missingEditorialMedia(spec0)) exp.issues.push({code:"editorial_media_missing",severity:"blocking",detail:`${missing.page}/${missing.section} : image requise absente (${missing.role}). Composition exportée pour travail, rendu photographique incomplet.`});
  const purchaseRules = purchaseExportManifest(spec0);
  if (purchaseRules) {
    const entries = unzipSync(exp.zip);
    const prefix = platform === "woocommerce" ? `${exp.files[0].split("/")[0]}/` : "";
    const file = `${prefix}${["wix","squarespace"].includes(platform) ? "offres-a-configurer.json" : "assets/es-purchase-offers.json"}`;
    entries[file] = strToU8(JSON.stringify({ ...purchaseRules, platform, activeDiscountsAndGifts:false }, null, 2));
    exp.zip = Buffer.from(zipSync(entries, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") })); if (!exp.files.includes(file)) exp.files.push(file);
  }
  if (guardedOffers.disabled.length) exp.issues.push({ code: "purchase_rules_require_server", severity: "warning", detail: `Offres avancées désactivées : ${guardedOffers.disabled.join(", ")}. Remises et cadeaux nécessitent un adaptateur commercial serveur installé et vérifié sur ${platform}. Configuration conservée dans le studio ; achat natif maintenu.` });
  for (const f of forbidden) exp.issues.push({ code: "rejected_media", severity: "blocking", detail: `média ${f} refusé : non exporté (à remplacer dans le studio)` });
  return exp;
}

/** Textes visibles de l'accueil tel que rendu par le studio (en-tête, sections, pied de page). */
export async function studioTexts(spec: ThemeSpec): Promise<string[]> {
  const r = await renderPage({ spec, base: "", cart: [] }, "/", new URLSearchParams());
  // Hors comparaison : scripts, tiroir panier de Shopify, icônes des moyens de paiement (fournies par la plateforme),
  // mention © calculée à l'affichage.
  const body = r.html
    .slice(r.html.indexOf("<body"))
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
    .replace(/<div id="shopify-section-cart-drawer"[\s\S]*$/, "")
    .replace(/<ul class="es-footer__payment"[\s\S]*?<\/ul>/g, " ");
  return body
    .split(/<[^>]+>/)
    .map((t) => t.replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 4 && !/^[\d\s.,:€%–-]+$/.test(t) && !/^(&copy;|©)/.test(t));
}

export type CmsExportCheck = { static: StaticCheck; gate: CmsGateResult };

/** Contrôles avant installation + décision du Quality Gate (au mieux PROVISOIRE sans installation). */
export async function checkCmsExport(platform: CmsPlatform, exp: PlatformExport, spec: ThemeSpec, opts: { projectId?: string; extra?: Partial<Record<CriterionKey, Measure>>; extraCodes?: string[]; extraIssues?: string[]; attempt?: number } = {}): Promise<CmsExportCheck> {
  const st = await staticChecks(platform, exp, spec, { projectId: opts.projectId, studioTexts: await studioTexts(spec) });
  const gate = gateCmsExport({
    platform,
    services: spec.store.business === "services",
    measures: { ...st.measures, ...(opts.extra ?? {}) },
    codes: [...st.codes, ...(opts.extraCodes ?? [])],
    issues: [...st.issues, ...(opts.extraIssues ?? [])],
    attempt: opts.attempt,
  });
  return { static: st, gate };
}
