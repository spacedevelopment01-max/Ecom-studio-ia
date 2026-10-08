/**
 * Benchmark RÉEL du SEO, Copywriting & Blog Engine V2 (phase 8B) — à lancer plus tard dans VOTRE Codespace, où les
 * clés d'API sont déjà configurées (Administration › Fournisseurs IA). Aucune clé n'est lue depuis la ligne de
 * commande ni affichée.
 *
 *   npx tsx scripts/benchmark-seo-v2.ts --check                                (vérifications seules, 0 €)
 *   npx tsx scripts/benchmark-seo-v2.ts --fixture A --max-cost 1
 *   npx tsx scripts/benchmark-seo-v2.ts --fixture B --type product_page --language en --max-cost 0.5
 *   npx tsx scripts/benchmark-seo-v2.ts --project <id> --type blog_article --max-cost 1
 *
 * Scénarios (--fixture) : A artisan (plâtrier-peintre), B cosmétique premium, C high-tech, D restaurant, E SaaS.
 * Types (--type) : product_page, category_page, service_page, home_page, brand_page, local_page, blog_article, faq,
 * metadata ; par défaut, ceux du scénario. Langue (--language) : fr, en, es.
 * Compte : l'administrateur unique par défaut, sinon --user ou BENCH_USER ; e-mail jamais affiché en entier.
 *
 * Ce que fait le script :
 *  1. vérifie version (phase 8A), compte, accès IA, fournisseur de rédaction, Router V2 (modèle par type d'appel),
 *     estimations, diagnostic, plafond, absence de secret ; avec --check il s'arrête là (aucun projet, aucune
 *     tâche, aucun appel payant) ;
 *  2. lance UNIQUEMENT le SEO Engine V2 (aucune image, vidéo, publicité ni publication) ;
 *  3. plafond RÉEL (--max-cost) par contenu : un appel dont l'estimation dépasserait le budget n'est pas envoyé ;
 *  4. diagnostic dans reports/benchmark-seo-v2-<scénario>-<date>.json : stratégie, mots-clés (HYPOTHÈSES), verdicts,
 *     défauts, reprises, coûts par étape, texte produit (Markdown) — à juger en le lisant.
 *
 * LIMITES : la qualité SEO réelle (positions, trafic) ne se mesure PAS ici ; aucun volume de recherche n'est
 * disponible sans fournisseur de données SEO ; la facture du fournisseur fait foi.
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
const { aiActiveFor, hasAiCredits, runForUser } = await import("../src/lib/ai/access");
const { runWithLang } = await import("../src/lib/i18n-server");
const { JobContext, completeJob } = await import("../src/lib/jobs");
const { withTrace, assertUnderCostCap, CostCapReached, redact } = await import("../src/lib/ai/trace");
const { loadProject } = await import("../src/lib/projects");
const { EUR } = await import("../src/lib/billing");
const { seedImageFixture } = await import("../tests/image-v2-fixtures");
const { SEO_SCENARIOS, SEO_FIXTURE, SEO_TYPES, seoScenarioOf } = await import("../tests/seo-v2-fixtures");
const { CONTENT_TYPES, LANGS } = await import("../src/lib/seo-v2/types");

const scenario = seoScenarioOf(opt("--fixture") ?? "A");
const maxCost = Number(opt("--max-cost") ?? "1");
const typeArg = opt("--type");
const language = (opt("--language") ?? "fr") as (typeof LANGS)[number];
const checkOnly = flag("--check");

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

if (!scenario) fail(`Scénario inconnu (au choix : ${SEO_SCENARIOS.join(", ")} ou ${Object.values(SEO_FIXTURE).join(", ")}).`);
if (!Number.isFinite(maxCost) || maxCost <= 0 || maxCost > 10) fail("--max-cost doit être un montant en euros entre 0 et 10 (ex. --max-cost 1).");
if (typeArg && !(CONTENT_TYPES as readonly string[]).includes(typeArg)) fail(`--type inconnu (au choix : ${CONTENT_TYPES.join(", ")}).`);
if (!(LANGS as readonly string[]).includes(language)) fail(`--language inconnue (au choix : ${LANGS.join(", ")}).`);
const types = typeArg ? [typeArg as (typeof CONTENT_TYPES)[number]] : SEO_TYPES[scenario];

type Check = { label: string; ok: boolean | "warn"; detail: string };
const checks: Check[] = [];
const check = (label: string, ok: Check["ok"], detail: string) => checks.push({ label, ok, detail });
const sh = (cmd: string) => {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
};

// 1a. Version et phase 8A.
const branch = sh("git rev-parse --abbrev-ref HEAD") ?? "?";
const commit = sh("git rev-parse --short HEAD") ?? "?";
check("Branche / version", branch !== "?", `branche ${branch}, commit ${commit}${sh("git status --porcelain")?.length ? " (modifications locales non enregistrées)" : ""}`);
const { POLICIES, POLICY_VERSION } = await import("../src/lib/quality/policies");
const { ACTION_STEPS } = await import("../src/lib/orchestrator/execute");
const { HANDLER_TYPES } = await import("../worker/handlers");
const p8a = {
  engine: fs.existsSync(path.join(process.cwd(), "src/lib/seo-v2/engine.ts")),
  policy: ["seo_product_v2", "seo_service_v2", "seo_category_v2", "seo_home_v2", "seo_article_v2", "seo_metadata_v2", "seo_strategy_v2", "seo_tech_audit_v2"].every((k) => !!(POLICIES as Record<string, unknown>)[k]),
  intent: "content.v2" in ACTION_STEPS,
  worker: HANDLER_TYPES.includes("content.v2"),
};
check("Phase 8A présente", Object.values(p8a).every(Boolean), `moteur SEO ${p8a.engine ? "✓" : "✗"} · 8 politiques seo_*_v2 ${p8a.policy ? "✓" : "✗"} (${POLICY_VERSION}) · orchestrateur ${p8a.intent ? "✓" : "✗"} · tâche de fond ${p8a.worker ? "✓" : "✗"}`);

// 1b. Compte.
const email = opt("--user") ?? process.env.BENCH_USER?.trim();
let user: { id: string; email: string; role: string } | undefined;
if (email) {
  user = one<{ id: string; email: string; role: string }>("SELECT id, email, role FROM users WHERE lower(email) = lower(?)", email);
  check("Compte utilisateur", !!user, user ? `${mask(user.email)} (${user.role})` : `aucun compte pour ${mask(email)}`);
} else {
  const admins = all<{ id: string; email: string; role: string }>("SELECT id, email, role FROM users WHERE role = 'admin' ORDER BY created_at");
  user = admins.length === 1 ? admins[0] : undefined;
  check("Compte utilisateur", !!user, user ? `${mask(user.email)} (administrateur, choisi automatiquement)` : admins.length ? `${admins.length} administrateurs : précisez --user ou BENCH_USER` : "aucun administrateur : précisez --user ou BENCH_USER");
}
const access = user ? aiActiveFor(user.id) : false;
check("Accès IA du compte", user ? (access ? true : "warn") : false, !user ? "compte introuvable" : access ? "actif (forfait payant, budget IA suffisant)" : hasAiCredits(user.id) ? "inactif : forfait Découverte — rédaction LOCALE seulement (0 €)" : "inactif : budget IA insuffisant — rédaction locale seulement");

// 1c. Fournisseur de rédaction (oui / non, jamais la clé).
const anthropic = !!activeProviderKey("anthropic");
const disabled = providerKey("anthropic") && !providerEnabled("anthropic");
check("Fournisseur de rédaction", anthropic ? true : "warn", `anthropic ${anthropic ? "✓" : "—"}${disabled ? " (désactivé dans l'administration)" : ""}${anthropic ? "" : " — rédaction et contrôles locaux seulement"}`);

// 1d. Router V2 : modèle par type d'appel, estimations (aucun appel).
const { KIND_ROUTE, estimateCall } = await import("../src/lib/seo-v2/deps");
const { routeLlm } = await import("../src/lib/ai/llm");
const routes = (Object.keys(KIND_ROUTE) as (keyof typeof KIND_ROUTE)[]).map((k) => {
  const r = routeLlm({ task: KIND_ROUTE[k].task, routing: { difficulty: KIND_ROUTE[k].difficulty } });
  return `${k} → ${r.tier}:${r.model} ≈ ${(estimateCall(k) / EUR).toFixed(3)} €`;
});
check("Router V2 (texte)", true, routes.join(" · "));
check("Données de mots-clés", "warn", "aucun fournisseur de données SEO branché : mots-clés = HYPOTHÈSES sémantiques (aucun volume, CPC, difficulté ni position)");

// 1e. Diagnostic et plafond.
const cols = new Set(all<{ name: string }>("PRAGMA table_info(ai_calls)").map((c) => c.name));
const missing = ["job_id", "cost", "intent", "routing_reason", "candidate_id", "usage_key"].filter((c) => !cols.has(c));
const tables = new Set(all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'").map((t) => t.name));
const reportsDir = path.join(process.cwd(), "reports");
let writable = true;
try {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.accessSync(reportsDir, fs.constants.W_OK);
} catch {
  writable = false;
}
check("Diagnostic", !missing.length && writable && tables.has("content_documents") && tables.has("content_runs"), `${missing.length ? `colonnes manquantes : ${missing.join(", ")}` : "traçage ai_calls complet"} · documents texte ${tables.has("content_documents") ? "✓" : "✗"} · mémoire des rédactions ${tables.has("content_runs") ? "✓" : "✗"} · reports/ ${writable ? "accessible" : "non accessible"}`);
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
check("Plafond de coût", capOk, `${maxCost.toFixed(2)} € par contenu — essai à blanc : un appel au-delà du plafond est bloqué avant envoi`);

say("\n=== Benchmark SEO, Copywriting & Blog Engine V2 — vérifications ===\n");
for (const c of checks) say(`${c.ok === true ? "✓" : c.ok === "warn" ? "⚠" : "✗"} ${c.label.padEnd(24)} ${c.detail}`);
const blocking = checks.filter((c) => c.ok === false);
say(`${leaked ? "✗" : "✓"} ${"Aucun secret affiché".padEnd(24)} ${leaked ? "une clé a été détectée et masquée : signalez-le" : "sortie contrôlée (aucune clé, e-mail masqué)"}`);
say(`\n${blocking.length ? `✗ ${blocking.length} point(s) bloquant(s) : ${blocking.map((c) => c.label).join(", ")}` : "✓ Tout est prêt pour le benchmark."}`);
if (checkOnly) {
  say("\nVérifications terminées (--check) : aucun projet créé, aucune tâche, aucun appel payant.\n");
  process.exit(blocking.length || leaked ? 1 : 0);
}
if (blocking.length || !user) fail("Benchmark non lancé : corrigez d'abord les points bloquants ci-dessus.");

// 2. Projet du benchmark.
let projectId = opt("--project");
if (projectId) {
  const p = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId);
  if (!p || p.user_id !== user.id) fail("Projet introuvable dans ce compte.");
} else {
  projectId = runWithLang({ ui: "fr", content: "fr" }, () => seedImageFixture(user!.id, SEO_FIXTURE[scenario]));
  const p = loadProject(projectId);
  run("UPDATE projects SET name = ? WHERE id = ?", `[BENCH SEO V2] ${p.brand?.name ?? p.name} (${scenario})`, projectId);
}
const project = loadProject(projectId);
say(`Projet : ${project.name} (${projectId}) — types : ${types.join(", ")} — langue : ${language}`);

// 3. Une tâche par contenu, SEO Engine V2 seul, plafond réel.
const { runContentEngineV2 } = await import("../src/lib/seo-v2/engine");
const { toMarkdown } = await import("../src/lib/seo-v2/doc");
const results: Record<string, unknown>[] = [];
let total = 0;
for (const type of types) {
  const jobId = id();
  run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jobId, user.id, projectId, "content.v2", `Benchmark SEO V2 (${type})`, JSON.stringify({ projectId, benchmark: true }), "running", now(), now(), now());
  const ctx = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jobId));
  const started = Date.now();
  const res = await runWithLang({ ui: "fr", content: language === "en" ? "en" : "fr" }, () => runForUser(user!.id, () => withTrace({ jobId, projectId, intent: "SEO", costCapMicro: capMicro }, () => runContentEngineV2(ctx, projectId!, { type, lang: language, maxCostEur: maxCost, force: true }))));
  completeJob(jobId, { verdict: res.verdict, docKey: res.docKey });
  const calls = all<{ task: string; provider: string; requested_model: string; prompt_key: string | null; cost: number; status: string }>("SELECT task, provider, requested_model, prompt_key, cost, status FROM ai_calls WHERE job_id = ? ORDER BY created_at, rowid", jobId);
  const spent = calls.reduce((s, c) => s + (c.cost ?? 0), 0) / EUR;
  total += spent;
  results.push({
    type,
    jobId,
    durationSec: Math.round((Date.now() - started) / 1000),
    verdict: res.verdict,
    by: res.by,
    codes: res.codes,
    issues: res.issues,
    reason: res.reason,
    stats: res.stats,
    notes: res.notes,
    spentEur: Math.round(spent * 1000) / 1000,
    stoppedByCostCap: res.stoppedByCostCap,
    calls: calls.map((c) => ({ step: c.prompt_key ?? c.task, model: `${c.provider}:${c.requested_model}`, cost: c.cost / EUR, status: c.status })),
    meta: res.doc?.meta,
    markdown: res.doc ? toMarkdown(res.doc) : null,
  });
  say(`  ${res.verdict === "FINAL" ? "✓" : res.verdict === "PROVISIONAL" ? "~" : "✗"} ${type.padEnd(14)} ${res.verdict} par ${res.by}${res.codes.length ? ` (${res.codes.join(", ")})` : ""} — ${spent.toFixed(3)} €${res.stoppedByCostCap ? " — ARRÊTÉ AU PLAFOND" : ""}`);
}

// 4. Diagnostic (aucun prompt, aucune clé).
const { seoStrategy } = await import("../src/lib/seo-v2/strategy");
const strategy = runWithLang({ ui: "fr", content: "fr" }, () => seoStrategy(loadProject(projectId!), language));
const report = {
  benchmark: "seo-v2",
  scenario,
  fixture: opt("--project") ? "existing-project" : SEO_FIXTURE[scenario],
  projectId,
  at: new Date().toISOString(),
  language,
  maxCostEurPerContent: maxCost,
  spentEur: Math.round(total * 1000) / 1000,
  strategy: { objectives: strategy.objectives, priorityPages: strategy.priorityPages.map((p) => ({ title: p.title, status: p.status, keyword: p.primaryKeyword })), calendar: strategy.calendar, dataNote: strategy.dataNote, gaps: strategy.gaps },
  results,
  limits: "Mots-clés = hypothèses sémantiques (aucun volume). La qualité SEO réelle (positions, trafic) n'est pas mesurée ici. La facture du fournisseur fait foi.",
};
const file = path.join(reportsDir, `benchmark-seo-v2-${scenario}-${report.at.slice(0, 19).replace(/[:T]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2));
say(`\nCoût total : ${report.spentEur.toFixed(3)} € (plafond ${maxCost.toFixed(2)} € par contenu)`);
say(`Rapport : ${path.relative(process.cwd(), file)}`);
say(`Studio : /studio/${projectId} (onglets Produit / Activité et Blog › SEO & textes) — la qualité se juge en lisant les textes.\n`);
process.exit(0);
