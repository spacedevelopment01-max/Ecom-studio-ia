/**
 * CMS Engine V2 — point d'entrée unique des exports (phase 11A) :
 *   PROJECT BRAIN → THEME ENGINE V2 (ThemeSpec) → DESIGN SYSTEM (couche design commune) → PAGES & SECTIONS →
 *   MÉDIAS (refusés exclus) → REGISTRE DES CAPACITÉS → ADAPTATEUR DE LA PLATEFORME → CONTRÔLES → QUALITY GATE.
 * Une seule représentation (le ThemeSpec et ses gabarits), aucun générateur artistique par plateforme.
 */
import type { AssetLoader } from "../theme/compile";
import { renderPage } from "../theme/render";
import type { ThemeSpec } from "../theme/spec";
import { exportKit } from "../theme/platforms";
import { exportShopify } from "./adapters/shopify";
import { exportWordPress } from "./adapters/wordpress";
import { exportPrestaShop } from "./adapters/prestashop";
import { forbiddenMedia, staticChecks, type StaticCheck } from "./checks";
import { adaptForPlatform } from "./adapt";
import { gateCmsExport, type CmsGateResult, type CriterionKey, type Measure } from "./quality";
import type { CmsPlatform, PlatformExport } from "./types";

export const CMS_PLATFORMS: CmsPlatform[] = ["shopify", "woocommerce", "prestashop", "wix", "squarespace"];

/** Nom de fichier sûr partout (sans accents ni caractères spéciaux) : « sérum-éclat » → « serum-eclat ». */
export function safeFileName(name: string): string {
  const ext = name.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
  const base = name.slice(0, name.length - ext.length).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return (base || "export") + ext.toLowerCase();
}

/** Génère l'export d'une plateforme. Les médias refusés ou fatals ne sont JAMAIS exportés. */
export async function cmsExport(platform: CmsPlatform, spec0: ThemeSpec, load: AssetLoader, opts: { projectId?: string } = {}): Promise<PlatformExport> {
  const spec = adaptForPlatform(spec0, platform);
  const { forbidden } = forbiddenMedia(spec, opts.projectId);
  const blockedIds = new Set([...forbidden].map((f) => spec.files[f]));
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
