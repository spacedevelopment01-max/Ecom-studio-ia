/**
 * Benchmarks déterministes de l'orchestrateur (phase 3B), dans une base TEMPORAIRE, sans aucun appel à l'IA :
 * intention, plan, étapes exécutées et sautées, routage, résultat de qualité, repli, classe de coût.
 *
 *   npx tsx scripts/orchestrator-bench.ts          lecture
 *   npx tsx scripts/orchestrator-bench.ts --json   JSON
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "orch-bench-"));
process.env.STOCK_OFFLINE = "1";

const { createUser } = await import("../src/lib/auth");
const { runWithLang } = await import("../src/lib/i18n-server");
const { seedSebastienBlanc, seedSerumEclat } = await import("../tests/brain-fixtures");
const { allScenarios } = await import("../tests/orchestrator-scenarios");

const u = await createUser(`bench${Date.now()}@test.fr`, "motdepasse-test", "B");
const res = await runWithLang({ ui: "fr", content: "fr" }, async () => allScenarios({ sb: seedSebastienBlanc(u.id), serum: seedSerumEclat(u.id) }));
if (process.argv.includes("--json")) console.log(JSON.stringify(res, null, 2));
else
  for (const r of res) {
    console.log(`\n### ${r.id} — ${r.title}`);
    console.log(`- INTENT : ${r.intent.intents.join(" + ") || "—"} (${r.intent.source})`);
    console.log(`- PLAN : ${r.plan.join(" → ")}`);
    console.log(`- STEPS EXECUTED : ${r.executed.join(", ") || "—"}`);
    console.log(`- STEPS SKIPPED : ${r.skipped.map((s) => `${s.step} (${s.reason})`).join(" ; ") || "—"}`);
    console.log(`- ROUTING : ${r.routing.map((x) => `${x.step} → ${x.mode}${x.mode === "llm" || x.mode === "image" || x.mode === "video" ? ` ${x.provider}:${x.model}` : ""} [${x.reason}]`).join(" ; ")}`);
    console.log(`- QUALITY RESULT : ${r.quality.map((q) => `${q.step}=${q.status}${q.reason ? ` (${q.reason})` : ""}`).join(" ; ")}`);
    console.log(`- FALLBACK : ${r.fallback ? "OUI" : "non"}`);
    console.log(`- COST CLASS : ${Object.entries(r.costClasses).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    if (r.warnings.length) console.log(`- WARNINGS : ${r.warnings.join(" ; ")}`);
  }
process.exit(0);
