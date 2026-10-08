/**
 * CMS Engine V2 — contrôles d'un export AVANT installation (provenance « statique » ou « test automatisé ») :
 * structure exigée par la plateforme, compatibilité (Theme Check officiel pour Shopify, syntaxe PHP pour WordPress,
 * propriétés exigées par PrestaShop), sécurité (secrets, scripts), médias (refusés, manquants), conservation des
 * textes du studio, affirmations inventées, données d'un autre projet, poids. Les contrôles faits sur un site
 * INSTALLÉ (navigateur) s'ajoutent ensuite avec leur propre provenance (scripts/cms-v2-install.ts).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import type { ThemeSpec } from "../theme/spec";
import { getAsset } from "../library";
import { manuallySelectable } from "../quality/usable";
import type { CriterionKey, Measure } from "./quality";
import type { CmsPlatform, PlatformExport } from "./types";

export type StaticCheck = { measures: Partial<Record<CriterionKey, Measure>>; codes: string[]; issues: string[]; stats: Record<string, number> };

const TEXT_EXT = /\.(liquid|json|php|tpl|html|css|js|yml|txt|csv|md)$/i;
/** Fichiers qui portent les CONTENUS du site (textes, liens, réglages des sections) hors Shopify. */
const CONTENT_FILE = /\/(inc\/site\.json|templates\/[^/]+\.html|parts\/[^/]+\.html)$|^templates\/es\/|views\/templates\/(pages|hook)\//;
const INVENTED = /(n°\s?1\b|numéro un|meilleur du marché|certifié(?!s? par vous)|garanti à vie|100 ?% naturel|best in class|clinically proven|cliniquement prouvé)/i;

/** Médias interdits à l'export : refusés, défaut fatal, verdict REJECTED, supprimés. */
export function forbiddenMedia(spec: ThemeSpec, projectId?: string): { forbidden: Set<string>; foreign: string[] } {
  const forbidden = new Set<string>();
  const foreign: string[] = [];
  for (const [file, assetId] of Object.entries(spec.files)) {
    const a = getAsset(assetId);
    if (!a) continue;
    if (projectId && a.project_id !== projectId) foreign.push(file);
    let verdict: string | undefined;
    try {
      verdict = (JSON.parse(a.meta || "{}") as { gate?: { verdict?: string } }).gate?.verdict;
    } catch {
      verdict = undefined;
    }
    if (a.status === "rejected" || verdict === "REJECTED" || !manuallySelectable(a)) forbidden.add(file);
  }
  return { forbidden, foreign };
}

/** Valeurs des secrets de l'environnement du studio (clés, jetons, mots de passe) : ne doivent jamais apparaître. */
function secretValues(): string[] {
  return Object.entries(process.env)
    .filter(([k, v]) => /(KEY|SECRET|TOKEN|PASSWORD|PRIVATE)/i.test(k) && v && v.length >= 12)
    .map(([, v]) => v!);
}
const SECRET_PATTERNS = [/sk-[A-Za-z0-9_-]{20,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /xox[baprs]-[A-Za-z0-9-]{10,}/, /ghp_[A-Za-z0-9]{30,}/, /shpat_[a-f0-9]{20,}/];

const REQUIRED: Record<"woocommerce" | "prestashop", RegExp[]> = {
  woocommerce: [/\/style\.css$/, /\/theme\.json$/, /\/functions\.php$/, /\/templates\/index\.html$/, /\/templates\/front-page\.html$/, /\/parts\/header\.html$/, /\/parts\/footer\.html$/, /\/inc\/es-theme\.php$/, /\/inc\/php\/es-liquid\.php$/, /\/inc\/site\.json$/],
  prestashop: [/^config\/theme\.yml$/, /^templates\/index\.tpl$/, /^templates\/layouts\/layout-full-width\.tpl$/, /^templates\/es\/header\.tpl$/, /^templates\/es\/footer\.tpl$/, /^dependencies\/modules\/esstudio\/esstudio\.php$/],
};
const PS_REQUIRED_PROPS = ["name:", "display_name:", "version:", "author:", "compatibility:", "available_layouts:", "cart_default:", "small_default:", "medium_default:", "large_default:", "home_default:", "category_default:", "default_layout:"];

export function phpAvailable(): boolean {
  try {
    execFileSync("php", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Textes visibles du studio (page d'accueil rendue) : ils doivent se retrouver dans l'export (conservation des
 * données). `studioTexts` : textes extraits du rendu du studio.
 */
export function textPreservation(studioTexts: string[], exportText: string): { score: number; missing: string[] } {
  const norm = (s: string) => s.replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\\u0026/g, "&").replace(/\\u0027/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
  const hay = norm(exportText);
  const uniq = [...new Set(studioTexts.map(norm).filter((t) => t.length >= 4))];
  const missing = uniq.filter((t) => !hay.includes(t));
  return { score: uniq.length ? Math.round((10 * (uniq.length - missing.length)) / uniq.length * 10) / 10 : 10, missing };
}

export async function staticChecks(platform: CmsPlatform, exp: PlatformExport, spec: ThemeSpec, opts: { projectId?: string; studioTexts?: string[] } = {}): Promise<StaticCheck> {
  const measures: StaticCheck["measures"] = {};
  const codes = new Set<string>();
  const issues: string[] = [];
  const entries = unzipSync(new Uint8Array(exp.zip));
  const names = Object.keys(entries);
  const textFiles = names.filter((n) => TEXT_EXT.test(n));
  const text = (n: string) => strFromU8(entries[n]);
  const stats: Record<string, number> = {
    files: names.length,
    zipKb: Math.round(exp.zip.length / 1024),
    cssKb: Math.round(names.filter((n) => n.endsWith(".css")).reduce((s, n) => s + entries[n].length, 0) / 1024),
    jsKb: Math.round(names.filter((n) => n.endsWith(".js")).reduce((s, n) => s + entries[n].length, 0) / 1024),
    mediaKb: Math.round(names.filter((n) => /\.(png|jpe?g|webp|gif|svg|mp4)$/i.test(n)).reduce((s, n) => s + entries[n].length, 0) / 1024),
  };

  // ---- structure
  for (const i of exp.issues) {
    issues.push(i.detail);
    if (i.severity === "blocking") codes.add(i.code === "missing_page" ? "missing_page" : "invalid_structure");
  }
  if (platform === "woocommerce" || platform === "prestashop") {
    for (const re of REQUIRED[platform]) if (!names.some((n) => re.test(n))) {
      codes.add("invalid_structure");
      issues.push(`fichier exigé absent : ${re.source}`);
    }
  }
  // Chemins sûrs : ni « .. », ni chemin absolu, ni doublon.
  if (names.some((n) => n.includes("..") || n.startsWith("/") || /[\\:*?"<>|]/.test(n))) {
    codes.add("invalid_structure");
    issues.push("chemin de fichier invalide dans le ZIP");
  }
  measures.structure = { score: codes.has("invalid_structure") ? 3 : 10, provenance: "static" };

  // ---- compatibilité
  if (platform === "shopify") {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-cms-shopify-"));
    try {
      for (const [p, data] of Object.entries(entries)) {
        fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
        fs.writeFileSync(path.join(dir, p), data);
      }
      const { check } = await import("@shopify/theme-check-node");
      const offenses = await check(dir);
      const errors = offenses.filter((o) => o.severity === 0);
      stats.themeCheckErrors = errors.length;
      stats.themeCheckWarnings = offenses.filter((o) => o.severity === 1).length;
      if (errors.length) {
        codes.add("theme_check_error");
        issues.push(...errors.slice(0, 5).map((o) => `Theme Check : ${o.check} ${o.message}`));
      }
      measures.compatibility = { score: errors.length ? 2 : 10, provenance: "automated", detail: `Theme Check : ${errors.length} erreur(s)` };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } else if (platform === "woocommerce") {
    const style = names.find((n) => /\/style\.css$/.test(n));
    const okHeader = !!style && /Theme Name:/.test(text(style));
    let okJson = true;
    for (const n of names.filter((x) => x.endsWith(".json"))) {
      try {
        JSON.parse(text(n));
      } catch {
        okJson = false;
        issues.push(`JSON illisible : ${n}`);
      }
    }
    let phpErrors = 0;
    let phpChecked = false;
    if (phpAvailable()) {
      phpChecked = true;
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-cms-php-"));
      try {
        for (const n of names.filter((x) => x.endsWith(".php"))) {
          const f = path.join(dir, n.replace(/\//g, "__"));
          fs.writeFileSync(f, entries[n]);
          try {
            execFileSync("php", ["-l", f], { stdio: "ignore" });
          } catch {
            phpErrors++;
            issues.push(`erreur de syntaxe PHP : ${n}`);
          }
        }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    stats.phpErrors = phpErrors;
    if (!okHeader || !okJson || phpErrors) codes.add("invalid_structure");
    measures.compatibility = { score: !okHeader || !okJson || phpErrors ? 2 : 10, provenance: phpChecked ? "automated" : "static", detail: phpChecked ? "en-tête, JSON et syntaxe PHP vérifiés" : "PHP indisponible : syntaxe non vérifiée" };
  } else if (platform === "prestashop") {
    const yml = entries["config/theme.yml"] ? text("config/theme.yml") : "";
    const missing = PS_REQUIRED_PROPS.filter((p) => !yml.includes(p));
    if (missing.length || !/^parent: classic$/m.test(yml)) {
      codes.add("invalid_structure");
      issues.push(`theme.yml : propriétés exigées absentes (${missing.join(", ")})`);
    }
    measures.compatibility = { score: missing.length ? 2 : 10, provenance: "static", detail: "propriétés exigées par le validateur de PrestaShop" };
  }

  // ---- sécurité : secrets, scripts injectés
  const secrets = secretValues();
  let secretHits = 0;
  let scriptHits = 0;
  for (const n of textFiles) {
    const s = text(n);
    if (secrets.some((v) => s.includes(v)) || SECRET_PATTERNS.some((re) => re.test(s))) {
      secretHits++;
      issues.push(`secret détecté dans ${n}`);
    }
    // Contenus du site (textes des sections) : aucun script ni lien « javascript: ».
    if (CONTENT_FILE.test(n) || (platform === "shopify" && /^templates\/.+\.json$|^sections\/.+-group\.json$|config\/settings_data\.json$/.test(n))) {
      if (/<script\b(?![^>]*type="application\/ld\+json")/i.test(s.replace(/\\u003c/g, "<")) || /javascript:/i.test(s)) {
        scriptHits++;
        issues.push(`script dans les contenus : ${n}`);
      }
    }
  }
  if (secretHits) codes.add("secret_exposed");
  if (scriptHits) codes.add("dangerous_script");
  measures.security = { score: secretHits || scriptHits ? 0 : 10, provenance: "static", detail: `${textFiles.length} fichiers texte analysés` };

  // ---- médias : refusés, manquants, appartenance au projet
  const { forbidden, foreign } = forbiddenMedia(spec, opts.projectId);
  const shipped = new Set(exp.media);
  const rejected = [...forbidden].filter((f) => shipped.has(f));
  if (rejected.length) {
    codes.add("rejected_media");
    issues.push(`média refusé exporté : ${rejected.join(", ")}`);
  }
  if (foreign.length) {
    codes.add("foreign_project_data");
    issues.push(`média d'un autre projet : ${foreign.join(", ")}`);
  }
  const allText = textFiles.map(text).join("\n");
  const referenced = Object.keys(spec.files).filter((f) => allText.includes(f) || JSON.stringify(spec.templates).includes(f));
  const missingMedia = referenced.filter((f) => !shipped.has(f) && !forbidden.has(f));
  if (missingMedia.length) issues.push(`média référencé absent : ${missingMedia.join(", ")}`);
  measures.media_integrity = { score: rejected.length || foreign.length ? 0 : missingMedia.length ? 6 : 10, provenance: "static", detail: `${shipped.size} média(s), ${forbidden.size} exclu(s)` };

  // ---- contenu : conservation des textes, affirmations inventées
  if (opts.studioTexts?.length) {
    const kept = textPreservation(opts.studioTexts, allText);
    measures.data_preservation = { score: kept.score, provenance: "static", detail: kept.missing.length ? `absents : ${kept.missing.slice(0, 3).join(" | ")}` : "tous les textes du studio sont présents" };
    if (kept.score < 8) issues.push(`textes du studio absents de l'export (${kept.missing.length})`);
  }
  // Affirmations : seulement dans les CONTENUS du site (pas dans les modèles de sections inutilisés), hors espaces
  // « [À compléter] ».
  const studioJoined = (opts.studioTexts ?? []).join(" ");
  const contentText = textFiles
    .filter((n) => CONTENT_FILE.test(n) || (platform === "shopify" && /^templates\/.+\.json$|^sections\/.+-group\.json$|^config\/settings_data\.json$/.test(n)))
    .map(text)
    .join("\n")
    .replace(/\[(À|A) compléter[^\]]*\]|\[To complete[^\]]*\]/g, "");
  const invented = contentText.match(INVENTED);
  if (invented && !INVENTED.test(studioJoined)) {
    codes.add("invented_content");
    issues.push(`affirmation non issue du studio : « ${invented[0]} »`);
  }

  // ---- personnalisation native (statique) et poids
  if (platform === "shopify") measures.native_editing = { score: exp.issues.some((i) => i.code === "no_schema") ? 4 : 9, provenance: "static", detail: "schémas de sections (réglages et blocs) présents" };
  if (platform === "woocommerce") measures.native_editing = { score: 8, provenance: "static", detail: "sections en blocs réglables ; vérification dans l'éditeur requise" };
  if (platform === "prestashop") measures.native_editing = { score: 5, provenance: "static", detail: "pages natives modifiables ; textes des sections via le studio" };
  measures.performance = { score: stats.jsKb > 400 || stats.cssKb > 600 ? 6 : 9, provenance: "static", detail: `CSS ${stats.cssKb} Ko, JS ${stats.jsKb} Ko, médias ${stats.mediaKb} Ko` };
  return { measures, codes: [...codes], issues, stats };
}
