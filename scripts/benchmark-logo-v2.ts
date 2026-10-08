/**
 * Benchmark RÉEL du Brand & Logo Engine V2 (phase 4B) — à lancer dans VOTRE Codespace, où les clés d'API sont déjà
 * configurées (Administration › Fournisseurs IA). Aucune clé n'est lue depuis la ligne de commande ni affichée.
 *
 *   npx tsx scripts/benchmark-logo-v2.ts --user vous@exemple.fr --max-cost 3
 *   npx tsx scripts/benchmark-logo-v2.ts --user vous@exemple.fr --fixture cosmetic --max-cost 2
 *   npx tsx scripts/benchmark-logo-v2.ts --user vous@exemple.fr --project <id> --max-cost 3   (un projet existant)
 *   npx tsx scripts/benchmark-logo-v2.ts --user vous@exemple.fr --check                      (vérifications seules, 0 €)
 *
 * Ce que fait le script :
 *  1. vérifie les fournisseurs configurés (oui / non, jamais la clé) et l'accès à l'IA du compte (forfait, budget) ;
 *  2. prend la fixture demandée (artisan = Sébastien Blanc, plâtrier peintre ; cosmetic ; saas ; restaurant ;
 *     product), créée dans le compte sous un nom clairement identifié « [BENCH LOGO V2] … », ou un projet existant ;
 *  3. lance UNIQUEMENT le moteur Brand & Logo V2 (pas de thème, vidéo, blog, publicité ni publication), avec les vraies
 *     barrières de qualité, sous un plafond de dépense RÉEL (--max-cost, en euros) : avant chaque appel payant, le coût
 *     déjà enregistré + l'estimation de l'appel sont comparés au plafond ; au-delà, l'appel ne part pas ;
 *  4. affiche et enregistre le diagnostic coût / qualité (reports/benchmark-logo-v2-<fixture>-<date>.json) ; les
 *     propositions sont visibles dans le vrai studio (onglet Marque › Directions de logo) pour les captures de la 4B.
 */
import "../worker/env";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const flag = (k: string) => args.includes(k);

const { one, all, run, id, now } = await import("../src/lib/db");
const { activeProviderKey } = await import("../src/lib/ai/config");
const { aiActiveFor, runForUser } = await import("../src/lib/ai/access");
const { runWithLang } = await import("../src/lib/i18n-server");
const { JobContext, completeJob } = await import("../src/lib/jobs");
const { withTrace } = await import("../src/lib/ai/trace");
const { loadProject } = await import("../src/lib/projects");
const { runLogoEngineV2 } = await import("../src/lib/logo-v2/engine");
const { EUR } = await import("../src/lib/billing");
const { LOGO_FIXTURES, seedLogoFixture } = await import("../tests/logo-v2-fixtures");

const email = opt("--user");
const fixture = (opt("--fixture") ?? "artisan") as (typeof LOGO_FIXTURES)[number];
const maxCost = Number(opt("--max-cost") ?? "3");
const territories = Number(opt("--territories") ?? "4");

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!email) fail("Indiquez le compte : --user vous@exemple.fr (le compte du studio qui paiera les appels).");
if (!LOGO_FIXTURES.includes(fixture)) fail(`Fixture inconnue : ${fixture} (au choix : ${LOGO_FIXTURES.join(", ")}).`);
if (!Number.isFinite(maxCost) || maxCost <= 0 || maxCost > 50) fail("--max-cost doit être un montant en euros entre 0 et 50 (ex. --max-cost 3).");

// 1. Fournisseurs et accès (jamais la valeur d'une clé).
const providers = Object.fromEntries((["anthropic", "openai", "google", "fal"] as const).map((p) => [p, !!activeProviderKey(p)]));
console.log("\n=== Benchmark Brand & Logo Engine V2 ===");
console.log(`Fournisseurs configurés : ${Object.entries(providers).map(([p, ok]) => `${p} ${ok ? "✓" : "—"}`).join(" · ")}`);
const user = one<{ id: string; email: string }>("SELECT id, email FROM users WHERE lower(email) = lower(?)", email);
if (!user) fail(`Compte introuvable : ${email}.`);
if (!providers.anthropic) fail("Aucune clé Anthropic active : le moteur ne peut pas proposer de territoires ni contrôler les logos.");
const access = aiActiveFor(user.id);
console.log(`Accès IA du compte ${user.email} : ${access ? "✓ actif" : "✗ inactif (forfait ou budget IA)"}`);
if (!access) fail("L'IA n'est pas active pour ce compte : choisissez un forfait (ou vérifiez le budget IA) avant le benchmark.");
console.log(`Plafond de dépense : ${maxCost.toFixed(2)} € (garde-fou réel, vérifié avant chaque appel payant).`);
if (flag("--check")) {
  console.log("\nVérifications terminées (--check) : aucun appel payant.\n");
  process.exit(0);
}

// 2. Projet du benchmark.
let projectId = opt("--project");
if (projectId) {
  const p = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId);
  if (!p || p.user_id !== user.id) fail("Projet introuvable dans ce compte.");
} else {
  projectId = runWithLang({ ui: "fr", content: "fr" }, () => seedLogoFixture(user.id, fixture));
  const p = loadProject(projectId);
  run("UPDATE projects SET name = ? WHERE id = ?", `[BENCH LOGO V2] ${p.brand?.name ?? p.name} (${fixture})`, projectId);
}
const project = loadProject(projectId);
if (!project.brand) fail("Le projet n'a pas encore de marque : lancez d'abord la création (ou utilisez une fixture).");
console.log(`Projet : ${project.name} — marque « ${project.brand.name} » (${projectId})`);

// 3. Tâche dédiée (traçable), moteur Logo V2 seul, plafond réel.
const jobId = id();
run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jobId, user.id, projectId, "brand.logo.v2", "Benchmark Logo V2", JSON.stringify({ projectId, benchmark: true }), "running", now(), now(), now());
const ctx = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jobId));
const started = Date.now();
const result = await runWithLang({ ui: "fr", content: "fr" }, () =>
  runForUser(user.id, () => withTrace({ jobId, projectId, intent: "CREATE_LOGO", costCapMicro: Math.round(maxCost * EUR) }, () => runLogoEngineV2(ctx, projectId!, { territories }))),
);
completeJob(jobId, { shown: result.shown.length, discarded: result.discarded.length, stoppedByCostCap: result.stoppedByCostCap });

// 4. Diagnostic coût / qualité (aucun prompt, aucune image, aucune clé).
const calls = all<{ task: string; provider: string; requested_model: string; prompt_key: string | null; cost: number; status: string; routing_reason: string | null }>("SELECT task, provider, requested_model, prompt_key, cost, status, routing_reason FROM ai_calls WHERE job_id = ? ORDER BY created_at, rowid", jobId);
const spent = calls.reduce((s, c) => s + (c.cost ?? 0), 0) / EUR;
const byStep: Record<string, { calls: number; cost: number; model: string }> = {};
for (const c of calls) {
  const k = c.prompt_key ?? c.task;
  byStep[k] = { calls: (byStep[k]?.calls ?? 0) + 1, cost: (byStep[k]?.cost ?? 0) + c.cost / EUR, model: `${c.provider}:${c.requested_model}` };
}
const report = {
  benchmark: "logo-v2",
  fixture: opt("--project") ? "existing-project" : fixture,
  projectId,
  brand: project.brand.name,
  jobId,
  at: new Date().toISOString(),
  durationSec: Math.round((Date.now() - started) / 1000),
  maxCostEur: maxCost,
  spentEur: Math.round(spent * 1000) / 1000,
  stoppedByCostCap: result.stoppedByCostCap,
  ai: result.ai,
  providers,
  territories: result.territories.map((t) => ({ name: t.name, markType: t.markType, composition: t.composition, typography: t.typography.style, construction: t.construction, sobriety: t.sobriety, concept: t.concept, why: t.whyItFits, source: t.source })),
  territoryRejections: result.territoryRejections,
  shown: result.shown.map((r) => ({ territory: r.territory.name, font: r.candidate.spec.family, score: r.score, verdict: r.verdict, attempts: r.attempts, change: r.candidate.change, symbolSource: r.candidate.symbolSource, assetId: r.assetId })),
  discarded: result.discarded.map((r) => ({ territory: r.territory.name, score: r.score, verdict: r.verdict, reason: r.reason, codes: r.codes, attempts: r.attempts })),
  costByStep: byStep,
  calls: calls.length,
  failedCalls: calls.filter((c) => c.status !== "ok").length,
  notes: result.notes,
};
const dir = path.join(process.cwd(), "reports");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `benchmark-logo-v2-${report.fixture}-${report.at.slice(0, 19).replace(/[:T]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2));

console.log(`\nTerritoires : ${report.territories.map((t) => `${t.name} (${t.markType}, ${t.typography})`).join(" ; ")}`);
if (report.territoryRejections.length) console.log(`Écartés avant construction : ${report.territoryRejections.map((r) => `${r.name} — ${r.reason}`).join(" ; ")}`);
console.log(`\nPropositions montrées (FINAL) : ${report.shown.length}`);
for (const s of report.shown) console.log(`  ✓ ${s.territory} — ${s.score}/10, ${s.font}, ${s.attempts} essai(s)${s.change ? ` · ${s.change}` : ""}`);
console.log(`Essais écartés (diagnostic) : ${report.discarded.length}`);
for (const d of report.discarded) console.log(`  ✗ ${d.territory} — ${d.verdict}${d.score != null ? ` ${d.score}/10` : ""} : ${d.reason}`);
console.log(`\nCoût : ${report.spentEur.toFixed(3)} € sur ${maxCost.toFixed(2)} € autorisés${report.stoppedByCostCap ? " — ARRÊTÉ AU PLAFOND" : ""} · ${report.calls} appel(s), ${report.failedCalls} en échec`);
for (const [k, v] of Object.entries(byStep)) console.log(`  ${k} : ${v.calls} × ${v.model} = ${v.cost.toFixed(3)} €`);
console.log(`\nRapport : ${path.relative(process.cwd(), file)}`);
console.log(`Studio : /studio/${projectId} (onglet Marque › Directions de logo)\n`);
process.exit(0);
