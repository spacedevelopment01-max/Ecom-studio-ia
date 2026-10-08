/**
 * Export Shopify des thèmes Theme Engine V2 (phase 10A) : ZIP réel (médias compris) puis Theme Check officiel.
 *   DATA_DIR=/tmp/bench npx tsx scripts/theme-v2-check.ts [--out reports/screenshots/theme-v2]
 * Vérifie aussi que les éléments essentiels de l'aperçu existent dans le thème exporté : sections v2-* utilisées par
 * les gabarits, feuille theme-v2.css, réglages du design system, gabarits des pages prévues, médias référencés.
 * Un aperçu local réussi ne prouve pas qu'un thème fonctionnera une fois installé sur une vraie boutique (phase 10B).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { check } from "@shopify/theme-check-node";
import { all } from "@/lib/db";
import { exportThemeZip } from "@/lib/theme/compile";
import { libraryLoader } from "@/lib/theme/loader";
import type { ThemeSpec } from "@/lib/theme/spec";
import { THEME_SCENARIOS } from "../tests/theme-v2-fixtures";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const args = process.argv.slice(2);
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : "reports/screenshots/theme-v2";
const ids = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, "theme-bench.json"), "utf8")) as Record<string, string>;
const results: Record<string, unknown> = {};
let failed = 0;
for (const s of THEME_SCENARIOS) {
  // Dernière version produite par le moteur V2 (le banc enregistre aussi des versions V1 « avant »).
  const spec = all<{ spec: string }>("SELECT spec FROM theme_versions WHERE project_id = ? ORDER BY number DESC", ids[s]).map((r) => JSON.parse(r.spec) as ThemeSpec).find((x) => x.meta?.engine === "v2");
  if (!spec) throw new Error(`Aucune version V2 pour ${s} : lancer d'abord theme-v2-bench.ts shoot --engine v2`);
  const { zip, files, skipped } = await exportThemeZip(spec, libraryLoader);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `v2-${s}-`));
  const entries = unzipSync(new Uint8Array(zip));
  for (const [p, data] of Object.entries(entries)) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), data);
  }
  const offenses = await check(dir);
  const errors = offenses.filter((o) => o.severity === 0).map((o) => `${o.check} ${o.uri.replace(/.*v2-[a-z]+-\w+\//, "")}:${o.start?.line ?? ""} ${o.message}`);
  // Correspondance aperçu ↔ export : ce que l'aperçu affiche existe dans le ZIP.
  const missing: string[] = [];
  const text = (p: string) => (entries[p] ? strFromU8(entries[p]) : "");
  const used = new Set<string>();
  for (const t of Object.values(spec.templates)) for (const id of t.order) used.add(t.sections[id].type);
  for (const type of used) if (!entries[`sections/${type}.liquid`]) missing.push(`sections/${type}.liquid`);
  if (!entries["assets/theme-v2.css"]) missing.push("assets/theme-v2.css");
  if (!text("layout/theme.liquid").includes("theme-v2.css")) missing.push("layout/theme.liquid → theme-v2.css");
  if (!text("config/settings_data.json").includes(`"ds_language": "${spec.settings.ds_language}"`)) missing.push("config/settings_data.json → ds_language");
  for (const pg of spec.store.pages) if (pg.template_suffix && !entries[`templates/page.${pg.template_suffix}.json`]) missing.push(`templates/page.${pg.template_suffix}.json`);
  for (const f of Object.keys(spec.files)) if (JSON.stringify(spec.templates).includes(f) && !entries[`assets/${f}`]) missing.push(`assets/${f}`);
  const ok = errors.length === 0 && missing.length === 0;
  if (!ok) failed++;
  results[s] = { ok, files: files.length, zipKb: Math.round(zip.length / 1024), themeCheck: { errors: errors.length, warnings: offenses.filter((o) => o.severity === 1).length, firstErrors: errors.slice(0, 8) }, missing, skipped, templates: Object.keys(spec.templates).length, pages: spec.store.pages.map((p) => `${p.handle}${p.template_suffix ? ` (page.${p.template_suffix})` : ""}`) };
  console.log(`${ok ? "✓" : "✗"} ${s} : ZIP ${files.length} fichiers (${Math.round(zip.length / 1024)} Ko), Theme Check ${errors.length} erreur(s), ${offenses.filter((o) => o.severity === 1).length} avertissement(s)${missing.length ? `, manquants : ${missing.join(", ")}` : ""}`);
  for (const e of errors.slice(0, 5)) console.log(`    ${e}`);
  fs.rmSync(dir, { recursive: true, force: true });
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "export-shopify.json"), JSON.stringify(results, null, 2));
process.exit(failed ? 1 : 0);
