/**
 * Mesure anti-gabarits du Theme Engine V2 (phase 10A) sur les 5 projets de référence du banc, comparée à l'ancien
 * moteur (V1) sur les mêmes projets : distance structurelle et visuelle deux à deux (0 = même gabarit, 1 = rien en
 * commun ; les couleurs ne pèsent que 5 %). Sous 0,35, deux sites sont considérés comme le même gabarit.
 *   DATA_DIR=/tmp/bench npx tsx scripts/theme-v2-diversity.ts [--out reports/screenshots/theme-v2]
 */
import fs from "node:fs";
import path from "node:path";
import { all } from "@/lib/db";
import type { ThemeSpec } from "@/lib/theme/spec";
import { diversityReport } from "@/lib/theme-v2/diversity";
import { THEME_SCENARIOS } from "../tests/theme-v2-fixtures";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const args = process.argv.slice(2);
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : "reports/screenshots/theme-v2";
const ids = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, "theme-bench.json"), "utf8")) as Record<string, string>;
const latest = (pid: string, v2: boolean) => all<{ spec: string }>("SELECT spec FROM theme_versions WHERE project_id = ? ORDER BY number DESC", pid).map((r) => JSON.parse(r.spec) as ThemeSpec).find((s) => (s.meta?.engine === "v2") === v2);
const out: Record<string, unknown> = {};
for (const [label, v2] of [["v1", false], ["v2", true]] as const) {
  const specs = Object.fromEntries(THEME_SCENARIOS.map((s) => [s, latest(ids[s], v2)]).filter(([, x]) => x)) as Record<string, ThemeSpec>;
  const r = diversityReport(specs);
  out[label] = r;
  console.log(`${label.toUpperCase()} : distance minimale ${r.min}, moyenne ${r.mean}, paires « même gabarit » : ${r.sameTemplate.map((p) => `${p.a}/${p.b} (${p.distance})`).join(", ") || "aucune"}`);
  for (const p of r.pairs) console.log(`   ${p.a} ↔ ${p.b} : ${p.distance}`);
}
fs.writeFileSync(path.join(OUT, "diversite.json"), JSON.stringify(out, null, 2));
