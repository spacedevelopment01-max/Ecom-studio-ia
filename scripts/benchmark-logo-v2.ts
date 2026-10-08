/**
 * Benchmark RÉEL du Brand & Logo Engine V2 (phase 4B) — à lancer dans VOTRE Codespace, où les clés d'API sont déjà
 * configurées (Administration › Fournisseurs IA). Aucune clé n'est lue depuis la ligne de commande ni affichée.
 *
 *   npx tsx scripts/benchmark-logo-v2.ts --check                       (vérifications seules, 0 €)
 *   npx tsx scripts/benchmark-logo-v2.ts --max-cost 3
 *   npx tsx scripts/benchmark-logo-v2.ts --fixture cosmetic --max-cost 2
 *   npx tsx scripts/benchmark-logo-v2.ts --project <id> --max-cost 3   (un projet existant)
 *
 * Compte utilisé (celui qui paiera les appels) : sans option, le compte ADMINISTRATEUR du studio s'il est unique ;
 * sinon --user <e-mail> ou la variable BENCH_USER. L'e-mail n'est jamais affiché en entier (t***@exemple.fr).
 *
 * Ce que fait le script :
 *  1. vérifie la version (branche, commit, phase 4A), le compte, l'accès à l'IA (forfait, budget), les fournisseurs
 *     (oui / non, jamais la clé), le Router V2 (modèle choisi pour chaque étape, sans appel), le diagnostic (ai_calls)
 *     et le plafond de dépense ; avec --check, s'arrête là (aucun projet créé, aucun appel payant) ;
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
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const flag = (k: string) => args.includes(k);

const { one, all, run, id, now } = await import("../src/lib/db");
const { activeProviderKey, providerKey, providerEnabled, PROVIDERS } = await import("../src/lib/ai/config");
const { aiActiveFor, hasAiCredits } = await import("../src/lib/ai/access");
const { runForUser } = await import("../src/lib/ai/access");
const { runWithLang } = await import("../src/lib/i18n-server");
const { JobContext, completeJob } = await import("../src/lib/jobs");
const { withTrace, assertUnderCostCap, CostCapReached, redact } = await import("../src/lib/ai/trace");
const { loadProject } = await import("../src/lib/projects");
const { runLogoEngineV2 } = await import("../src/lib/logo-v2/engine");
const { EUR } = await import("../src/lib/billing");
const { LOGO_FIXTURES, seedLogoFixture } = await import("../tests/logo-v2-fixtures");

const fixture = (opt("--fixture") ?? "artisan") as (typeof LOGO_FIXTURES)[number];
const maxCost = Number(opt("--max-cost") ?? "3");
const territories = Number(opt("--territories") ?? "4");
const checkOnly = flag("--check");

// Toute la sortie passe par say() : une clé de fournisseur qui apparaîtrait serait masquée et signalée.
const SECRETS = (Object.keys(PROVIDERS) as (keyof typeof PROVIDERS)[]).map((p) => providerKey(p)).filter((k): k is string => !!k && k.length >= 8);
let leaked = false;
function say(line = "") {
  let out = redact(line);
  for (const s of SECRETS) if (out.includes(s)) ((leaked = true), (out = out.split(s).join("[clé masquée]")));
  console.log(out);
}
function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}
const mask = (email: string) => email.replace(/^(.)[^@]*(@.*)$/, "$1***$2");

if (!LOGO_FIXTURES.includes(fixture)) fail(`Fixture inconnue : ${fixture} (au choix : ${LOGO_FIXTURES.join(", ")}).`);
if (!Number.isFinite(maxCost) || maxCost <= 0 || maxCost > 50) fail("--max-cost doit être un montant en euros entre 0 et 50 (ex. --max-cost 3).");

type Check = { label: string; ok: boolean | "warn"; detail: string };
const checks: Check[] = [];
const check = (label: string, ok: Check["ok"], detail: string) => checks.push({ label, ok, detail });
const git = (cmd: string) => {
  try {
    return execSync(`git ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
};

// 1a. Version : branche, commit, présence de la phase 4A (commit dd007cd ou ses fichiers).
const branch = git("rev-parse --abbrev-ref HEAD") ?? "?";
const commit = git("rev-parse --short HEAD") ?? "?";
const has4aCommit = git("merge-base --is-ancestor dd007cd HEAD && echo yes") === "yes";
check("Branche / version", branch !== "?", `branche ${branch}, commit ${commit}${git("status --porcelain")?.length ? " (modifications locales non enregistrées)" : ""}`);
const { POLICIES, POLICY_VERSION } = await import("../src/lib/quality/policies");
const { ACTION_STEPS } = await import("../src/lib/orchestrator/execute");
const { HANDLER_TYPES } = await import("../worker/handlers");
const phase4a = {
  commit: has4aCommit,
  engine: fs.existsSync(path.join(process.cwd(), "src/lib/logo-v2/engine.ts")),
  policy: !!(POLICIES as Record<string, unknown>).logo_v2,
  intent: "brand.logo.v2" in ACTION_STEPS && "brand.logo.v2.choose" in ACTION_STEPS,
  worker: HANDLER_TYPES.includes("brand.logo.v2") && HANDLER_TYPES.includes("brand.logo.v2.choose"),
};
check(
  "Phase 4A présente",
  phase4a.engine && phase4a.policy && phase4a.intent && phase4a.worker,
  `moteur ${phase4a.engine ? "✓" : "✗"} · politique logo_v2 ${phase4a.policy ? "✓" : "✗"} (${POLICY_VERSION}) · orchestrateur ${phase4a.intent ? "✓" : "✗"} · tâches de fond ${phase4a.worker ? "✓" : "✗"} · commit dd007cd ${phase4a.commit ? "✓" : "non trouvé dans l'historique"}`,
);

// 1b. Compte : --user, BENCH_USER, sinon l'administrateur unique (jamais d'e-mail en clair à l'écran).
const email = opt("--user") ?? process.env.BENCH_USER?.trim();
let user: { id: string; email: string; role: string } | undefined;
if (email) {
  user = one<{ id: string; email: string; role: string }>("SELECT id, email, role FROM users WHERE lower(email) = lower(?)", email);
  check("Compte utilisateur", !!user, user ? `${mask(user.email)} (${user.role})` : `aucun compte pour ${mask(email)}`);
} else {
  const admins = all<{ id: string; email: string; role: string }>("SELECT id, email, role FROM users WHERE role = 'admin' ORDER BY created_at");
  user = admins.length === 1 ? admins[0] : undefined;
  check(
    "Compte utilisateur",
    !!user,
    user ? `${mask(user.email)} (administrateur, choisi automatiquement)` : admins.length ? `${admins.length} administrateurs : précisez --user ou BENCH_USER` : "aucun administrateur : précisez --user ou BENCH_USER",
  );
}

// 1c. Accès à l'IA du compte (forfait + budget IA, mêmes règles qu'un client).
const access = user ? aiActiveFor(user.id) : false;
check("Accès IA du compte", user ? access : false, !user ? "compte introuvable" : access ? "actif (forfait payant, budget IA suffisant)" : hasAiCredits(user.id) ? "inactif : aucun forfait payant (Découverte = moteur local seulement)" : "inactif : forfait sans budget IA suffisant");

// 1d. Fournisseurs : oui / non, jamais la clé.
const providers = Object.fromEntries((["anthropic", "openai", "google", "fal"] as const).map((p) => [p, !!activeProviderKey(p)]));
const disabled = (["anthropic", "openai", "google", "fal"] as const).filter((p) => providerKey(p) && !providerEnabled(p));
check(
  "Fournisseurs",
  providers.anthropic ? (providers.openai || providers.google ? true : "warn") : false,
  `${Object.entries(providers).map(([p, ok]) => `${p} ${ok ? "✓" : "—"}`).join(" · ")}${disabled.length ? ` (désactivés : ${disabled.join(", ")})` : ""}${providers.anthropic ? (providers.openai || providers.google ? "" : " — pas d'image IA : symboles en SVG seulement") : " — Anthropic obligatoire (territoires et contrôle)"}`,
);

// 1e. Router V2 : modèle choisi pour chaque étape du moteur, sans aucun appel.
const { routeLlm } = await import("../src/lib/ai/llm");
const { routeMedia } = await import("../src/lib/ai/media-providers");
const routes: Record<string, string> = {};
try {
  const d1 = routeLlm({ task: "logo_symbol" });
  const d2 = routeLlm({ task: "quality_control", images: [{ data: Buffer.alloc(0), mediaType: "image/png" }] as never, routing: { difficulty: "complex", deliverable: "logo_v2" } });
  const d3 = routeMedia("image_generation");
  routes["territoires + symbole"] = `${d1.provider}:${d1.model} (${d1.reason})`;
  routes["contrôle qualité"] = `${d2.provider}:${d2.model} (${d2.reason})`;
  routes["exploration image"] = d3 ? `${d3.provider}:${d3.model}` : "aucune (pas de fournisseur d'images)";
  check("Router V2", d1.mode === "llm" && d2.mode === "llm", Object.entries(routes).map(([k, v]) => `${k} → ${v}`).join(" · "));
} catch (e) {
  check("Router V2", false, `erreur : ${(e as Error).message}`);
}

// 1f. Diagnostic : colonnes de traçage d'ai_calls et dossier des rapports.
const cols = new Set(all<{ name: string }>("PRAGMA table_info(ai_calls)").map((c) => c.name));
const need = ["job_id", "cost", "intent", "plan_id", "step_id", "routing_reason", "brain_hash", "candidate_id"];
const missing = need.filter((c) => !cols.has(c));
const reportsDir = path.join(process.cwd(), "reports");
let writable = true;
try {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.accessSync(reportsDir, fs.constants.W_OK);
} catch {
  writable = false;
}
check("Diagnostic", !missing.length && writable, `${missing.length ? `colonnes manquantes : ${missing.join(", ")}` : "traçage ai_calls complet"} · dossier reports/ ${writable ? "accessible" : "non accessible"}`);

// 1g. Plafond de dépense : essai à blanc (tâche fictive, aucun appel) — sous le plafond passe, au-dessus bloque.
const capMicro = Math.round(maxCost * EUR);
let capOk = false;
await withTrace({ jobId: `check-${id()}`, costCapMicro: capMicro }, async () => {
  assertUnderCostCap(Math.round(capMicro / 2));
  try {
    assertUnderCostCap(capMicro + 1);
  } catch (e) {
    capOk = e instanceof CostCapReached;
  }
});
check("Plafond de coût", capOk, `${maxCost.toFixed(2)} € — essai à blanc : un appel au-delà du plafond est bien bloqué avant envoi`);

say("\n=== Benchmark Brand & Logo Engine V2 — vérifications ===\n");
for (const c of checks) say(`${c.ok === true ? "✓" : c.ok === "warn" ? "⚠" : "✗"} ${c.label.padEnd(20)} ${c.detail}`);
const blocking = checks.filter((c) => c.ok === false);
say(`${leaked ? "✗" : "✓"} ${"Aucun secret affiché".padEnd(20)} ${leaked ? "une clé a été détectée et masquée : signalez-le" : "sortie contrôlée (aucune clé, e-mail masqué)"}`);
say(`\n${blocking.length ? `✗ ${blocking.length} point(s) bloquant(s) : ${blocking.map((c) => c.label).join(", ")}` : "✓ Tout est prêt pour le benchmark."}`);

if (checkOnly) {
  say("\nVérifications terminées (--check) : aucun projet créé, aucun appel payant.\n");
  process.exit(blocking.length || leaked ? 1 : 0);
}
if (blocking.length || !user) fail("Benchmark non lancé : corrigez d'abord les points bloquants ci-dessus.");

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
say(`Projet : ${project.name} — marque « ${project.brand.name} » (${projectId})`);

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

say(`\nTerritoires : ${report.territories.map((t) => `${t.name} (${t.markType}, ${t.typography})`).join(" ; ")}`);
if (report.territoryRejections.length) say(`Écartés avant construction : ${report.territoryRejections.map((r) => `${r.name} — ${r.reason}`).join(" ; ")}`);
say(`\nPropositions montrées (FINAL) : ${report.shown.length}`);
for (const s of report.shown) say(`  ✓ ${s.territory} — ${s.score}/10, ${s.font}, ${s.attempts} essai(s)${s.change ? ` · ${s.change}` : ""}`);
say(`Essais écartés (diagnostic) : ${report.discarded.length}`);
for (const d of report.discarded) say(`  ✗ ${d.territory} — ${d.verdict}${d.score != null ? ` ${d.score}/10` : ""} : ${d.reason}`);
say(`\nCoût : ${report.spentEur.toFixed(3)} € sur ${maxCost.toFixed(2)} € autorisés${report.stoppedByCostCap ? " — ARRÊTÉ AU PLAFOND" : ""} · ${report.calls} appel(s), ${report.failedCalls} en échec`);
for (const [k, v] of Object.entries(byStep)) say(`  ${k} : ${v.calls} × ${v.model} = ${v.cost.toFixed(3)} €`);
say(`\nRapport : ${path.relative(process.cwd(), file)}`);
say(`Studio : /studio/${projectId} (onglet Marque › Directions de logo)\n`);
process.exit(0);
