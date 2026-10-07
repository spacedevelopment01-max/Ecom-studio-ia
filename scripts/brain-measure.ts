/**
 * Mesures du Project Brain 2C sur les fixtures (Sébastien Blanc, Sérum Éclat), dans une base TEMPORAIRE :
 * taille du contexte legacy (avant) / du scope explicite (après), sections, budgets. Aucun appel à l'IA.
 *
 *   npx tsx scripts/brain-measure.ts            tableau lisible
 *   npx tsx scripts/brain-measure.ts --json     JSON
 *   npx tsx scripts/brain-measure.ts --content  affiche aussi le contenu de chaque scope
 *   npx tsx scripts/brain-measure.ts --dups     taille des briefs locaux avant / après suppression des doublons
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "brain-measure-"));
process.env.STOCK_OFFLINE = "1";

const { createUser } = await import("../src/lib/auth");
const { loadProject } = await import("../src/lib/projects");
const { runWithLang } = await import("../src/lib/i18n-server");
const { measureEngines } = await import("../src/lib/brain/measure");
const { brainView } = await import("../src/lib/brain/facade");
const { brandCraftBrief } = await import("../src/lib/engine/ad-craft");
const { routesBrief } = await import("../src/lib/ai/tasks");
const { seedSebastienBlanc, seedSerumEclat } = await import("../tests/brain-fixtures");

const args = process.argv.slice(2);
const u = await createUser(`mesure${Date.now()}@test.fr`, "motdepasse-test", "M");
const out = await runWithLang({ ui: "fr", content: "fr" }, async () => {
  const fixtures = { "Sébastien Blanc — plâtrier peintre": seedSebastienBlanc(u.id), "Sérum Éclat — produit riche": seedSerumEclat(u.id) };
  return Object.entries(fixtures).map(([name, pid]) => {
    const p = loadProject(pid);
    const dups = Object.fromEntries(
      [
        ["routesBrief (pistes de logo, scope logo)", routesBrief(p).length, routesBrief(p, brainView(p, "logo").kept).length],
        ["brandCraftBrief (publicités, scope advertising)", brandCraftBrief(p).length, brandCraftBrief(p, brainView(p, "advertising").kept).length],
        ["brandCraftBrief (vidéo / UGC, scope video)", brandCraftBrief(p).length, brandCraftBrief(p, brainView(p, "video").kept).length],
        ["brandCraftBrief (relecture, scope qc)", brandCraftBrief(p).length, brandCraftBrief(p, brainView(p, "qc").kept).length],
      ].map(([k, a, b]) => [k, { before: a, after: b }]),
    );
    return { name, dups, rows: measureEngines(p), content: args.includes("--content") ? Object.fromEntries(measureEngines(p).map((r) => [r.engine, brainView(p, r.scope as never).stable])) : undefined };
  });
});

if (args.includes("--json")) console.log(JSON.stringify(out, null, 2));
else
  for (const f of out) {
    console.log(`\n## ${f.name}\n`);
    console.log("| Moteur | Scope | Avant (legacy) | Après | Réduction | Sections incluses | Sections exclues | Budget souple dépassé | Plafond atteint |");
    console.log("|---|---|---|---|---|---|---|---|---|");
    for (const r of f.rows)
      console.log(`| ${r.engine} | ${r.scope} | ${r.legacy ? `${r.oldChars} (${r.legacy})` : "0 (aucun contexte)"} | ${r.newChars} | ${r.reductionPct === null ? "n/a" : `${r.reductionPct} %`} | ${r.sectionsIncluded.join(", ")} | ${r.sectionsExcluded.join(", ") || "—"} | ${r.softBudgetExceeded ? `OUI (${r.softBudget})` : "non"} | ${r.hardCeilingReached ? "OUI" : "non"} |`);
    for (const r of f.rows) console.log(`- ${r.engine} : retirés ${r.itemsExcluded.join(", ") || "—"} · ajoutés ${r.itemsAdded.join(", ") || "—"}${r.dropped.length ? ` · écartés par le budget ${r.dropped.join(", ")}` : ""}${r.criticalDropped.length ? ` · CRITIQUES RETIRÉS ${r.criticalDropped.join(", ")}` : ""}`);
    if (args.includes("--dups")) for (const [k, d] of Object.entries(f.dups)) console.log(`- doublons ${k} : ${d.before} → ${d.after} car.`);
    if (f.content) for (const [k, v] of Object.entries(f.content)) console.log(`\n### ${k}\n${v}`);
  }
process.exit(0);
