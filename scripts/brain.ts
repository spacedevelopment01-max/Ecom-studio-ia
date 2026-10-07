/**
 * Project Brain en ligne de commande (lecture seule, aucun appel à l'IA) : « que sait le studio de ce projet ? »
 *
 *   npx tsx scripts/brain.ts                    dernier projet modifié, résumé de toutes les vues
 *   npx tsx scripts/brain.ts <projectId>        projet précis
 *   npx tsx scripts/brain.ts <id> --scope logo  une ou plusieurs vues (logo,image…)
 *   npx tsx scripts/brain.ts <id> --content     affiche aussi le contenu des vues (secrets masqués)
 *   npx tsx scripts/brain.ts <id> --json        sortie JSON (même contenu que /api/admin/brain)
 *   npx tsx scripts/brain.ts <id> --legacy      compare avec la taille du projectContext actuel
 */
import "../worker/env";
import { one } from "../src/lib/db";
import { brainReport, SCOPES, type Scope } from "../src/lib/brain";
import { projectContext } from "../src/lib/ai/context";
import { loadProject } from "../src/lib/projects";

const args = process.argv.slice(2);
const flag = (k: string) => args.includes(k);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const positional = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--scope");
const id = positional ?? one<{ id: string }>("SELECT id FROM projects ORDER BY updated_at DESC LIMIT 1")?.id;
if (!id) {
  console.log("Aucun projet trouvé.");
  process.exit(1);
}
const scopes = (opt("--scope") ?? "").split(",").filter((x): x is Scope => (SCOPES as readonly string[]).includes(x));
const r = brainReport(id, { scopes, content: flag("--content") });
if (flag("--json")) {
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}
console.log(`\n=== Project Brain — ${id} ===`);
console.log(`Métier compris : ${r.trade.labels.fr || "?"} (${r.trade.id}, ${r.trade.source}) · logo : ${r.currentLogo ? `${r.currentLogo.state} (${r.currentLogo.source})` : "aucun"}`);
console.log(`Mémoire : ${r.counts.memory} · contrôles qualité (90 j) : ${r.counts.qualityChecks} (pannes techniques ignorées : ${r.technicalFailuresIgnored}) · médias lus : ${r.counts.assets} · constats IA : ${r.aiPatterns}`);
for (const v of r.views) {
  console.log(`\n• ${v.scope.padEnd(11)} ${String(v.chars).padStart(6)} car. (~${v.estTokens} jetons) / souple ${v.softBudget} · plafond ${v.hardCeiling}${v.budgetExceeded ? " · BUDGET DÉPASSÉ (critique)" : ""}${v.hardCeilingReached ? " · PLAFOND ATTEINT" : ""} · empreinte ${v.hash}`);
  console.log(`  ferme ${v.levels.hard} · souple ${v.levels.soft} · indication ${v.levels.advisory} · sections : ${v.sections.join(", ")}${v.dropped.length ? ` · écartés : ${v.dropped.join(", ")}` : ""}${v.criticalDropped.length ? ` · CRITIQUES RETIRÉS : ${v.criticalDropped.join(", ")}` : ""}`);
  if ("content" in v) console.log(`${v.content}\n${v.volatileContent}`);
}
if (flag("--legacy")) {
  const p = loadProject(id);
  for (const s of ["all", "brand", "shop", "images", "social", "video"] as const) console.log(`projectContext(${s}) actuel : ${projectContext(p, s).length} car.`);
}
