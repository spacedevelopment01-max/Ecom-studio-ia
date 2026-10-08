/**
 * Adaptateur Shopify (CMS Engine V2) : le thème Online Store 2.0 existant (même source que l'aperçu), enrichi d'une
 * vérification de structure : gabarits obligatoires, sections et extraits référencés, réglages modifiables, médias.
 * Le contrôle officiel Theme Check est lancé par le contrôle qualité (checks.ts), sur le ZIP réel.
 */
import { unzipSync, strFromU8 } from "fflate";
import { exportThemeZip, type AssetLoader } from "../../theme/compile";
import type { ThemeSpec } from "../../theme/spec";
import { sectionSchemaOf } from "../liquid";
import type { ExportIssue, PlatformExport } from "../types";

/** Gabarits sans lesquels Shopify refuse ou dégrade le thème. */
export const SHOPIFY_REQUIRED = ["layout/theme.liquid", "templates/index.json", "templates/product.json", "templates/collection.json", "templates/cart.json", "templates/page.json", "templates/404.json", "templates/search.json", "config/settings_schema.json", "config/settings_data.json"];

const stripComment = (s: string) => s.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "");

export async function exportShopify(spec: ThemeSpec, load: AssetLoader): Promise<PlatformExport> {
  const r = await exportThemeZip(spec, load);
  const entries = unzipSync(new Uint8Array(r.zip));
  const text = (p: string) => (entries[p] ? strFromU8(entries[p]) : "");
  const issues: ExportIssue[] = [];
  for (const p of SHOPIFY_REQUIRED) if (!entries[p]) issues.push({ code: "missing_template", severity: "blocking", detail: `${p} absent` });
  const sections = new Set<string>();
  for (const p of Object.keys(entries).filter((k) => /^templates\/.+\.json$/.test(k) || /^sections\/.+-group\.json$/.test(k))) {
    let json: { sections?: Record<string, { type: string }> };
    try {
      json = JSON.parse(stripComment(text(p)));
    } catch {
      issues.push({ code: "invalid_json", severity: "blocking", detail: `${p} illisible` });
      continue;
    }
    for (const s of Object.values(json.sections ?? {})) sections.add(s.type);
  }
  for (const type of sections) {
    const src = text(`sections/${type}.liquid`);
    if (!src) {
      issues.push({ code: "missing_section", severity: "blocking", detail: `sections/${type}.liquid absent` });
      continue;
    }
    const schema = sectionSchemaOf(src);
    // Personnalisation native : une section sans réglage ni bloc serait figée dans l'éditeur de thème.
    if (!schema) issues.push({ code: "no_schema", severity: "blocking", detail: `${type} : schéma absent ou illisible` });
    else if (!schema.settings.some((s) => s.id) && !schema.blocks.length && type !== "main-404") issues.push({ code: "not_editable", severity: "warning", detail: `${type} : aucun réglage modifiable` });
    for (const m of src.matchAll(/\{%-?\s*render\s+'([a-z0-9_-]+)'/g)) if (!entries[`snippets/${m[1]}.liquid`]) issues.push({ code: "missing_snippet", severity: "blocking", detail: `snippets/${m[1]}.liquid (utilisé par ${type})` });
  }
  if (r.skipped?.length) for (const f of r.skipped) issues.push({ code: "missing_media", severity: "warning", detail: `média ${f} non exporté` });
  return {
    platform: "shopify",
    zip: r.zip,
    name: `${spec.store.shopName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}-shopify.zip`,
    kind: "theme",
    files: r.files,
    issues,
    sections: [...sections],
    media: Object.keys(spec.files).filter((f) => entries[`assets/${f}`]),
  };
}
