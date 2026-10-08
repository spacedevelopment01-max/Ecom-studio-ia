/**
 * Benchmark RÉEL de l'Image & Search Engine V2 (phase 5B) — à lancer dans VOTRE Codespace, où les clés d'API sont
 * déjà configurées (Administration › Fournisseurs IA). Aucune clé n'est lue depuis la ligne de commande ni affichée.
 *
 *   npx tsx scripts/benchmark-image-v2.ts --check                          (vérifications seules, 0 €)
 *   npx tsx scripts/benchmark-image-v2.ts --fixture artisan --max-cost 2
 *   npx tsx scripts/benchmark-image-v2.ts --fixture cosmetic --project <id> --max-cost 3   (votre vrai projet produit)
 *
 * Scénarios (--fixture) : artisan (A, Sébastien Blanc, plâtrier-peintre), cosmetic (B), hightech (C), restaurant (D),
 * saas (E). Compte utilisé (celui qui paiera) : sans option, le compte ADMINISTRATEUR s'il est unique ; sinon
 * --user <e-mail> ou la variable BENCH_USER. L'e-mail n'est jamais affiché en entier.
 *
 * Ce que fait le script :
 *  1. vérifie la version (branche, commit, phase 5A), le compte, l'accès à l'IA, les fournisseurs (oui / non, jamais
 *     la clé), les banques d'images, le Router V2 (parcours choisis, sans appel), le diagnostic et le plafond ; avec
 *     --check il s'arrête là (aucun projet créé, aucun appel payant, aucune recherche) ;
 *  2. prend le scénario, créé dans le compte sous un nom identifié « [BENCH IMAGE V2] … », ou un projet existant ;
 *  3. lance UNIQUEMENT le moteur Image V2 sur les images utiles au scénario (aucune boutique, publicité, vidéo, blog
 *     ni publication), sous un plafond RÉEL (--max-cost, euros) vérifié avant chaque appel payant ;
 *  4. enregistre le diagnostic coût / qualité (reports/benchmark-image-v2-<scénario>-<date>.json) ; les images sont
 *     dans la bibliothèque du vrai studio (dossier 03 · Images) pour la validation visuelle de la 5B.
 *
 * LIMITES DU PLAFOND (à connaître) :
 *  - le plafond compare le coût déjà ENREGISTRÉ par la tâche (ai_calls) + l'ESTIMATION de l'appel suivant ; une
 *    estimation peut différer du prix réel (tarifs du fournisseur, images facturées au forfait, jetons d'image) ;
 *  - certains coûts sont estimés (ex. génération Gemini, prix unitaire de la table des prix) : la facture réelle du
 *    fournisseur, parfois différée de plusieurs heures ou jours, fait foi ;
 *  - un appel déjà parti est payé même s'il échoue ensuite ; le dépassement maximal est donc d'environ un appel ;
 *  - les recherches Pexels / Pixabay / Openverse sont gratuites (aucun coût enregistré) mais limitées en nombre.
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
const { IMAGE_FIXTURES, seedImageFixture, fixtureRequests } = await import("../tests/image-v2-fixtures");

const fixture = (opt("--fixture") ?? "artisan") as (typeof IMAGE_FIXTURES)[number];
const maxCost = Number(opt("--max-cost") ?? "2");
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

if (!IMAGE_FIXTURES.includes(fixture)) fail(`Scénario inconnu : ${fixture} (au choix : ${IMAGE_FIXTURES.join(", ")}).`);
if (!Number.isFinite(maxCost) || maxCost <= 0 || maxCost > 50) fail("--max-cost doit être un montant en euros entre 0 et 50 (ex. --max-cost 2).");

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

// 1a. Version et phase 5A.
const branch = git("rev-parse --abbrev-ref HEAD") ?? "?";
const commit = git("rev-parse --short HEAD") ?? "?";
check("Branche / version", branch !== "?", `branche ${branch}, commit ${commit}${git("status --porcelain")?.length ? " (modifications locales non enregistrées)" : ""}`);
const { POLICIES, POLICY_VERSION } = await import("../src/lib/quality/policies");
const { ACTION_STEPS } = await import("../src/lib/orchestrator/execute");
const { HANDLER_TYPES } = await import("../worker/handlers");
const { STOCK_PROVIDERS } = await import("../src/lib/image-v2/sources");
const p5a = {
  engine: fs.existsSync(path.join(process.cwd(), "src/lib/image-v2/engine.ts")),
  policy: !!(POLICIES as Record<string, unknown>).image_v2 && !!(POLICIES as Record<string, unknown>).stock_v2,
  intent: "image.v2" in ACTION_STEPS,
  worker: HANDLER_TYPES.includes("image.v2"),
  table: !!one("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'image_candidates'"),
};
check("Phase 5A présente", Object.values(p5a).every(Boolean), `moteur ${p5a.engine ? "✓" : "✗"} · politiques image_v2/stock_v2 ${p5a.policy ? "✓" : "✗"} (${POLICY_VERSION}) · orchestrateur ${p5a.intent ? "✓" : "✗"} · tâche de fond ${p5a.worker ? "✓" : "✗"} · mémoire des candidats ${p5a.table ? "✓" : "✗"}`);

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

// 1c. Accès à l'IA (mêmes règles qu'un client).
const access = user ? aiActiveFor(user.id) : false;
check("Accès IA du compte", user ? access : false, !user ? "compte introuvable" : access ? "actif (forfait payant, budget IA suffisant)" : hasAiCredits(user.id) ? "inactif : aucun forfait payant (Découverte = moteur local seulement)" : "inactif : forfait sans budget IA suffisant");

// 1d. Fournisseurs IA et banques d'images (oui / non, jamais la clé).
const ai = Object.fromEntries((["anthropic", "openai", "google"] as const).map((p) => [p, !!activeProviderKey(p)]));
const disabled = (["anthropic", "openai", "google", "pexels", "pixabay"] as const).filter((p) => providerKey(p) && !providerEnabled(p));
check(
  "Fournisseurs IA",
  ai.anthropic ? (ai.openai || ai.google ? true : "warn") : false,
  `${Object.entries(ai).map(([p, ok]) => `${p} ${ok ? "✓" : "—"}`).join(" · ")}${disabled.length ? ` (désactivés : ${disabled.join(", ")})` : ""}${ai.anthropic ? (ai.openai || ai.google ? "" : " — pas de génération d'images : recherche seule") : " — Anthropic obligatoire (contrôle visuel)"}`,
);
const banks = STOCK_PROVIDERS.map((s) => `${s.label} ${s.available() ? "✓" : "—"}`);
check("Banques d'images", STOCK_PROVIDERS.some((s) => s.available() && s.id !== "openverse") ? true : "warn", `${banks.join(" · ")} — licences : ${STOCK_PROVIDERS.map((s) => `${s.label} = ${s.license({ license: "cc0" }).name}`).join(" ; ")}`);

// 1e. Router V2 : parcours choisis, sans appel.
const { routeLlm } = await import("../src/lib/ai/llm");
const { routeMedia } = await import("../src/lib/ai/media-providers");
try {
  const rev = routeLlm({ task: "quality_control", images: [{ data: Buffer.alloc(0), mediaType: "image/png" }] as never, routing: { difficulty: "complex", deliverable: "image_v2" } });
  const run1 = async () => {
    const edit = routeMedia("image_generation", "mask");
    const gen = routeMedia("image_generation");
    return { edit, gen };
  };
  const { edit, gen } = user ? await runForUser(user.id, run1) : await run1();
  check(
    "Router V2",
    rev.mode === "llm",
    `contrôle → ${rev.provider}:${rev.model} (${rev.reason}) · produit réel → ${edit?.provider === "openai" ? `retouche par masque (${edit.model})` : gen?.provider === "google" ? `décor + produit composé (${gen.model})` : "aucun parcours fidèle"} · ambiance → ${gen ? `${gen.provider}:${gen.model}` : "aucune génération"}`,
  );
} catch (e) {
  check("Router V2", false, `erreur : ${(e as Error).message}`);
}

// 1f. Diagnostic.
const cols = new Set(all<{ name: string }>("PRAGMA table_info(ai_calls)").map((c) => c.name));
const missing = ["job_id", "cost", "intent", "step_id", "routing_reason", "brain_hash", "candidate_id"].filter((c) => !cols.has(c));
const reportsDir = path.join(process.cwd(), "reports");
let writable = true;
try {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.accessSync(reportsDir, fs.constants.W_OK);
} catch {
  writable = false;
}
check("Diagnostic", !missing.length && writable, `${missing.length ? `colonnes manquantes : ${missing.join(", ")}` : "traçage ai_calls complet"} · verdicts quality_checks · candidats image_candidates · dossier reports/ ${writable ? "accessible" : "non accessible"}`);

// 1g. Plafond : essai à blanc.
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
check("Plafond de coût", capOk, `${maxCost.toFixed(2)} € — essai à blanc : un appel au-delà du plafond est bloqué avant envoi (estimation : voir les limites en tête du script)`);

say("\n=== Benchmark Image & Search Engine V2 — vérifications ===\n");
for (const c of checks) say(`${c.ok === true ? "✓" : c.ok === "warn" ? "⚠" : "✗"} ${c.label.padEnd(20)} ${c.detail}`);
const blocking = checks.filter((c) => c.ok === false);
say(`${leaked ? "✗" : "✓"} ${"Aucun secret affiché".padEnd(20)} ${leaked ? "une clé a été détectée et masquée : signalez-le" : "sortie contrôlée (aucune clé, e-mail masqué)"}`);
say(`\n${blocking.length ? `✗ ${blocking.length} point(s) bloquant(s) : ${blocking.map((c) => c.label).join(", ")}` : "✓ Tout est prêt pour le benchmark."}`);
if (checkOnly) {
  say("\nVérifications terminées (--check) : aucun projet créé, aucune recherche, aucun appel payant.\n");
  process.exit(blocking.length || leaked ? 1 : 0);
}
if (blocking.length || !user) fail("Benchmark non lancé : corrigez d'abord les points bloquants ci-dessus.");

// 2. Projet du benchmark.
let projectId = opt("--project");
if (projectId) {
  const p = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId);
  if (!p || p.user_id !== user.id) fail("Projet introuvable dans ce compte.");
} else {
  projectId = runWithLang({ ui: "fr", content: "fr" }, () => seedImageFixture(user!.id, fixture));
  const p = loadProject(projectId);
  run("UPDATE projects SET name = ? WHERE id = ?", `[BENCH IMAGE V2] ${p.brand?.name ?? p.name} (${fixture})`, projectId);
}
const project = loadProject(projectId);
say(`Projet : ${project.name} (${projectId})`);

// Image du produit réel : seulement avec un vrai détourage du projet (jamais un produit inventé ni simulé).
const { validCutouts } = await import("../src/lib/engine/cutouts");
const cut = validCutouts(projectId)[0]?.id ?? null;
const requests = fixtureRequests(fixture, cut).filter((r) => {
  const product = ["product_image", "packshot", "lifestyle", "usage_scene", "ad_image"].includes(r.kind);
  if (product && !cut) say(`  ↷ ${r.kind} non lancé : aucune photo réelle du produit détourée dans ce projet (utilisez --project <id d'un projet avec photo>).`);
  return !product || !!cut;
});

// 3. Tâche dédiée, moteur Image V2 seul, plafond réel commun à toutes les demandes du scénario.
const jobId = id();
run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jobId, user.id, projectId, "image.v2", "Benchmark Image V2", JSON.stringify({ projectId, benchmark: true }), "running", now(), now(), now());
const ctx = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jobId));
const { runImageEngineV2 } = await import("../src/lib/image-v2/engine");
const started = Date.now();
const runs: any[] = [];
let stopped = false;
await runWithLang({ ui: "fr", content: "fr" }, () =>
  runForUser(user!.id, () =>
    withTrace({ jobId, projectId, intent: "GENERATE_IMAGE", costCapMicro: capMicro }, async () => {
      for (const req of requests) {
        if (stopped) break;
        const r = await runImageEngineV2(ctx, projectId!, { ...req, maxCostEur: maxCost });
        stopped = r.stoppedByCostCap;
        runs.push({ request: { kind: req.kind, support: req.support, aspect: req.aspect, count: req.count ?? 1, service: req.service?.name ?? null }, ...r });
      }
    }),
  ),
);
completeJob(jobId, { runs: runs.length, stoppedByCostCap: stopped });

// 4. Diagnostic coût / qualité (aucun prompt, aucune image, aucune clé).
const calls = all<{ task: string; provider: string; requested_model: string; prompt_key: string | null; cost: number; status: string; estimated: number }>("SELECT task, provider, requested_model, prompt_key, cost, status, estimated FROM ai_calls WHERE job_id = ? ORDER BY created_at, rowid", jobId);
const spent = calls.reduce((s, c) => s + (c.cost ?? 0), 0) / EUR;
const byStep: Record<string, { calls: number; cost: number; model: string; estimated: number }> = {};
for (const c of calls) {
  const k = c.prompt_key ?? c.task;
  const cur = byStep[k] ?? { calls: 0, cost: 0, model: `${c.provider}:${c.requested_model}`, estimated: 0 };
  byStep[k] = { calls: cur.calls + 1, cost: cur.cost + c.cost / EUR, model: cur.model, estimated: cur.estimated + (c.estimated ? 1 : 0) };
}
const report = {
  benchmark: "image-v2",
  fixture: opt("--project") ? `existing-project (${fixture})` : fixture,
  projectId,
  jobId,
  at: new Date().toISOString(),
  durationSec: Math.round((Date.now() - started) / 1000),
  maxCostEur: maxCost,
  spentEur: Math.round(spent * 1000) / 1000,
  stoppedByCostCap: stopped,
  providers: ai,
  banks: Object.fromEntries(STOCK_PROVIDERS.map((s) => [s.id, s.available()])),
  runs: runs.map((r) => ({
    request: r.request,
    outcomes: r.outcomes.map((o: any) => ({ verdict: o.verdict, score: o.score, origin: o.origin, artDirection: o.artDirection, attempts: o.attempts, reason: o.reason, codes: o.codes, assetId: o.assetId, subject: o.brief.subject, understanding: o.brief.understanding })),
    search: r.search.map((s: any) => ({ requests: s.requests, results: s.results, kept: s.kept, byProvider: s.byProvider, queries: s.queries, errors: s.errors })),
    stats: r.stats,
    notes: r.notes,
  })),
  costByStep: byStep,
  calls: calls.length,
  estimatedCalls: calls.filter((c) => c.estimated).length,
  failedCalls: calls.filter((c) => c.status !== "ok").length,
  limits: "Coûts : enregistrés depuis l'usage renvoyé par le fournisseur quand il existe, sinon ESTIMÉS (table des prix) ; la facture du fournisseur, parfois différée, fait foi. Le plafond bloque l'appel suivant avant envoi ; un appel parti est payé.",
};
const file = path.join(reportsDir, `benchmark-image-v2-${fixture}-${report.at.slice(0, 19).replace(/[:T]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2));

say("");
for (const r of report.runs) {
  say(`${r.request.kind} (${r.request.aspect ?? "format par défaut"}${r.request.service ? `, ${r.request.service}` : ""}) — recherche : ${r.search.map((s: any) => `${s.requests} requête(s), ${s.kept} candidat(s)`).join(" ; ") || "aucune"}`);
  for (const o of r.outcomes) say(`  ${o.verdict === "FINAL" ? "✓" : o.verdict === "PROVISIONAL" ? "~" : "✗"} ${o.verdict}${o.score != null ? ` ${o.score}/10` : ""} · ${o.origin} · ${o.artDirection} · ${o.attempts} essai(s) — ${o.reason}`);
}
say(`\nCoût : ${report.spentEur.toFixed(3)} € sur ${maxCost.toFixed(2)} € autorisés${stopped ? " — ARRÊTÉ AU PLAFOND" : ""} · ${report.calls} appel(s) dont ${report.estimatedCalls} estimé(s), ${report.failedCalls} en échec`);
for (const [k, v] of Object.entries(byStep)) say(`  ${k} : ${v.calls} × ${v.model} = ${v.cost.toFixed(3)} €${v.estimated ? ` (${v.estimated} estimé(s))` : ""}`);
say(`\nRapport : ${path.relative(process.cwd(), file)}`);
say(`Studio : /studio/${projectId} (bibliothèque › 03 · Images) — la qualité se juge sur les vraies images, pas sur les notes.\n`);
process.exit(0);
