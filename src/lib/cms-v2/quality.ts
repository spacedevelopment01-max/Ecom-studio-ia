/**
 * CMS Quality Gate V2 (phase 11A) — contrôle d'un export vers une plateforme, avec la barrière existante (politique
 * `cms_export_v2`, mêmes verdicts, mêmes traces). Trois dimensions INDÉPENDANTES :
 *  - technique (structure, compatibilité, installation, sécurité, médias, performances) ;
 *  - fidélité visuelle (pages, sections, typographies, couleurs, images, animations, responsive) ;
 *  - exploitabilité commerciale (navigation, boutons, formulaires, fonctions e-commerce, personnalisation native, SEO).
 * Chaque critère porte sa PROVENANCE (statique, test automatisé, navigateur local, installation locale, plateforme
 * réelle, humain). Un critère non mesuré n'est jamais compté comme réussi ; FINAL exige une installation (locale ou
 * réelle), tous les critères obligatoires mesurés, aucun défaut bloquant, et précise son périmètre.
 */
import { decide, type GateDecision } from "../quality/gate";
import { PROVENANCE_ORDER, type Provenance } from "./capabilities";
import type { CmsPlatform } from "./types";

export type CriterionKey =
  | "structure" | "compatibility" | "installation" | "page_fidelity" | "section_fidelity" | "typography" | "colors" | "images" | "animations"
  | "responsive" | "navigation" | "buttons" | "forms" | "ecommerce" | "native_editing" | "seo" | "accessibility" | "performance" | "security"
  | "media_integrity" | "data_preservation" | "edit_stability";

export const DIMENSIONS: Record<"technical" | "visual" | "commercial", CriterionKey[]> = {
  technical: ["structure", "compatibility", "installation", "security", "media_integrity", "performance", "data_preservation"],
  visual: ["page_fidelity", "section_fidelity", "typography", "colors", "images", "animations", "responsive"],
  commercial: ["navigation", "buttons", "forms", "ecommerce", "native_editing", "seo", "accessibility", "edit_stability"],
};

/** Un critère mesuré : note sur 10 et provenance de la mesure (jamais « simulé » présenté comme réel). */
export type Measure = { score: number; provenance: Provenance; detail?: string };
export type CmsCheckInput = {
  platform: CmsPlatform;
  /** Site de services (pas de fonctions e-commerce attendues). */
  services: boolean;
  measures: Partial<Record<CriterionKey, Measure>>;
  /** Codes de défauts (politique cms_export_v2 : bloquants, fatals). */
  codes: string[];
  issues: string[];
  attempt?: number;
};

export type CmsGateResult = {
  decision: GateDecision;
  /** Périmètre de la validation : niveau de preuve le plus élevé atteint par l'ensemble des critères obligatoires. */
  scope: Provenance | null;
  scopeLabel: { fr: string; en: string };
  dimensions: Record<keyof typeof DIMENSIONS, { score: number | null; measured: number; total: number }>;
  unmeasured: CriterionKey[];
  score: number | null;
};

/** Critères sans lesquels un export ne peut pas être FINAL (les fonctions e-commerce seulement pour une boutique). */
export function mandatoryCriteria(services: boolean): CriterionKey[] {
  const base: CriterionKey[] = ["structure", "compatibility", "installation", "security", "media_integrity", "page_fidelity", "section_fidelity", "typography", "colors", "responsive", "navigation", "buttons", "native_editing", "data_preservation"];
  return services ? [...base, "forms"] : [...base, "ecommerce"];
}

export const SCOPE_LABEL: Record<Provenance, { fr: string; en: string }> = {
  static: { fr: "validation statique (fichiers seulement)", en: "static validation (files only)" },
  automated: { fr: "tests automatisés", en: "automated tests" },
  browser_local: { fr: "rendu local dans un navigateur", en: "local browser rendering" },
  installed_local: { fr: "validation locale installée", en: "local installed validation" },
  real_platform: { fr: "validation sur plateforme réelle", en: "real platform validation" },
  human: { fr: "validation humaine", en: "human validation" },
};

const rank = (p: Provenance) => PROVENANCE_ORDER.indexOf(p);

export function gateCmsExport(input: CmsCheckInput): CmsGateResult {
  const mandatory = mandatoryCriteria(input.services);
  const m = input.measures;
  const unmeasured = mandatory.filter((k) => !m[k]);
  const criteria: Record<string, number> = {};
  for (const [k, v] of Object.entries(m)) if (v) criteria[k] = Math.round(v.score * 10) / 10;
  const vals = Object.values(criteria);
  const score = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  // Périmètre : la preuve la plus FAIBLE parmi les critères obligatoires mesurés (une chaîne vaut son maillon faible).
  const levels = mandatory.filter((k) => m[k]).map((k) => m[k]!.provenance);
  const scope = levels.length ? levels.reduce((a, b) => (rank(a) <= rank(b) ? a : b)) : null;
  const installed = scope !== null && rank(scope) >= rank("installed_local");
  const issues = [...input.issues, ...unmeasured.map((k) => `non mesuré : ${k}`)];
  // Provenance « local » (peut conclure) seulement si tout l'obligatoire est mesuré sur un site installé ; sinon
  // « metadata » : le résultat est au mieux PROVISOIRE.
  const checker = installed && !unmeasured.length ? "local" : "metadata";
  const decision = decide("cms_export_v2", { checker, score, criteria, codes: input.codes, issues, confidence: installed && !unmeasured.length ? (scope === "installed_local" ? 0.9 : 0.95) : 0.6 }, { attempt: input.attempt ?? 0 });
  const dims = Object.fromEntries(
    (Object.keys(DIMENSIONS) as (keyof typeof DIMENSIONS)[]).map((d) => {
      const keys = DIMENSIONS[d].filter((k) => input.services ? k !== "ecommerce" : true);
      const got = keys.filter((k) => m[k]).map((k) => m[k]!.score);
      return [d, { score: got.length ? Math.round((got.reduce((a, b) => a + b, 0) / got.length) * 10) / 10 : null, measured: got.length, total: keys.length }];
    }),
  ) as CmsGateResult["dimensions"];
  return { decision, scope, scopeLabel: scope ? SCOPE_LABEL[scope] : { fr: "aucune vérification", en: "no verification" }, dimensions: dims, unmeasured, score };
}

/** Message clair pour le client (jamais « boutique prête à vendre » sans preuve). */
export function verdictMessage(platform: CmsPlatform, r: CmsGateResult, lang: "fr" | "en"): string {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const label = { shopify: "Shopify", woocommerce: "WordPress / WooCommerce", prestashop: "PrestaShop", wix: "Wix", squarespace: "Squarespace" }[platform];
  const v = r.decision.verdict;
  // Wix et Squarespace : un kit de reconstruction, jamais présenté comme un thème installable.
  if (platform === "wix" || platform === "squarespace") {
    if (v === "REJECTED") return t(`Kit ${label} non utilisable en l'état : ${r.decision.reason}.`, `${label} kit not usable as is: ${r.decision.reason}.`);
    return t(`Kit de reconstruction ${label} généré (textes, médias, couleurs, typographies, plan des pages). ${label} n'accepte pas l'import d'un thème : le site se reconstruit à la main dans son éditeur, en suivant le kit.`, `${label} rebuild kit generated (texts, media, colours, fonts, page plan). ${label} does not accept theme imports: the site is rebuilt by hand in its editor, following the kit.`);
  }
  if (v === "REJECTED") return t(`Export ${label} non utilisable en l'état : ${r.decision.reason}. Il n'est pas proposé comme thème prêt à installer.`, `${label} export not usable as is: ${r.decision.reason}. It is not offered as a ready-to-install theme.`);
  if (v === "RETRY") return t(`Export ${label} : un défaut précis est à corriger (${r.decision.reason}).`, `${label} export: a specific defect must be fixed (${r.decision.reason}).`);
  if (v === "FINAL") return t(`Export ${label} contrôlé (${r.scopeLabel.fr}). Une installation sur votre propre boutique reste à vérifier.`, `${label} export checked (${r.scopeLabel.en}). Installation on your own store remains to be verified.`);
  return t(`Votre thème ${label} est généré et a passé les vérifications disponibles (${r.scopeLabel.fr}). Son installation sur une boutique réelle reste à vérifier.`, `Your ${label} theme is generated and passed the available checks (${r.scopeLabel.en}). Installation on a real store remains to be verified.`);
}
