/**
 * Benchmark RÉEL de l'Advertising Engine V2 (phase 6B) — à lancer plus tard dans VOTRE Codespace, où les clés d'API
 * sont déjà configurées (Administration › Fournisseurs IA). Aucune clé n'est lue depuis la ligne de commande ni affichée.
 *
 *   npx tsx scripts/benchmark-ads-v2.ts --check                                  (vérifications seules, 0 €)
 *   npx tsx scripts/benchmark-ads-v2.ts --fixture cosmetic --max-cost 3
 *   npx tsx scripts/benchmark-ads-v2.ts --fixture artisan --platforms meta_feed,google_display --max-cost 3
 *   npx tsx scripts/benchmark-ads-v2.ts --project <id> --offer "-15 % jusqu'au 30/11" --max-cost 3   (votre projet, offre réelle)
 *
 * Scénarios (--fixture) : artisan, cosmetic, hightech, restaurant, saas (mêmes projets que le benchmark Image V2).
 * Compte : l'administrateur unique par défaut, sinon --user ou BENCH_USER ; e-mail jamais affiché en entier.
 *
 * Ce que fait le script :
 *  1. vérifie version (phase 6A), compte, accès IA, fournisseurs, banques d'images, Router V2, diagnostic, plafond,
 *     absence de secret ; avec --check il s'arrête là (aucun projet, aucune recherche, aucun appel payant) ;
 *  2. lance UNIQUEMENT le moteur publicitaire V2 (angles, textes, contrôle des affirmations, images par l'Image
 *     Engine V2, compositions par plateforme, barrière publicitaire) : aucune boutique, vidéo, blog ni publication ;
 *  3. plafond RÉEL (--max-cost) vérifié avant chaque appel payant ;
 *  4. diagnostic coût / qualité dans reports/benchmark-ads-v2-<scénario>-<date>.json ; créations dans la
 *     bibliothèque du vrai studio (03 · Images › Publicités) pour la validation visuelle de la 6B.
 * Les scénarios « produit » sans vraie photo détourée font des créations sans produit posé (univers + typographie) :
 * pour juger la fidélité au produit, utilisez --project avec un projet qui a une vraie photo du produit.
 *
 * LIMITES DU PLAFOND : coûts parfois ESTIMÉS (table des prix) ; facture du fournisseur, parfois différée, qui fait
 * foi ; un appel parti est payé (dépassement maximal d'environ un appel) ; recherches de photos gratuites.
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
const { IMAGE_FIXTURES, seedImageFixture } = await import("../tests/image-v2-fixtures");
const { PLATFORMS } = await import("../src/lib/ads-v2/types");

const fixture = (opt("--fixture") ?? "artisan") as (typeof IMAGE_FIXTURES)[number];
const maxCost = Number(opt("--max-cost") ?? "3");
const platforms = (opt("--platforms") ?? "").split(",").map((x) => x.trim()).filter(Boolean) as (typeof PLATFORMS)[number][];
const count = Number(opt("--count") ?? "3");
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
if (!Number.isFinite(maxCost) || maxCost <= 0 || maxCost > 50) fail("--max-cost doit être un montant en euros entre 0 et 50 (ex. --max-cost 3).");
if (platforms.some((x) => !PLATFORMS.includes(x))) fail(`Plateforme inconnue (au choix : ${PLATFORMS.join(", ")}).`);
if (!Number.isInteger(count) || count < 1 || count > 6) fail("--count : 1 à 6 concepts.");

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
const p6a = {
  engine: fs.existsSync(path.join(process.cwd(), "src/lib/ads-v2/engine.ts")),
  policy: !!(POLICIES as Record<string, unknown>).ad_v2,
  image: !!(POLICIES as Record<string, unknown>).image_v2,
  intent: "ads.v2" in ACTION_STEPS,
  worker: HANDLER_TYPES.includes("ads.v2"),
};
check("Phase 6A présente", Object.values(p6a).every(Boolean), `moteur publicitaire ${p6a.engine ? "✓" : "✗"} · politique ad_v2 ${p6a.policy ? "✓" : "✗"} (${POLICY_VERSION}) · Image Engine V2 ${p6a.image ? "✓" : "✗"} · orchestrateur ${p6a.intent ? "✓" : "✗"} · tâche de fond ${p6a.worker ? "✓" : "✗"}`);

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
  const rev = routeLlm({ task: "quality_control", images: [{ data: Buffer.alloc(0), mediaType: "image/png" }] as never, routing: { difficulty: "complex", deliverable: "ad_v2" } });
  const wr = routeLlm({ task: "ad_creative", routing: { difficulty: "complex", deliverable: "ad_v2" } });
  const run1 = async () => {
    const edit = routeMedia("image_generation", "mask");
    const gen = routeMedia("image_generation");
    return { edit, gen };
  };
  const { edit, gen } = user ? await runForUser(user.id, run1) : await run1();
  check(
    "Router V2",
    rev.mode === "llm",
    `rédaction → ${wr.provider}:${wr.model} · contrôle → ${rev.provider}:${rev.model} (${rev.reason}) · produit réel → ${edit?.provider === "openai" ? `retouche par masque (${edit.model})` : gen?.provider === "google" ? `décor + produit composé (${gen.model})` : "aucun parcours fidèle"} · ambiance → ${gen ? `${gen.provider}:${gen.model}` : "aucune génération"}`,
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

say("\n=== Benchmark Advertising Engine V2 — vérifications ===\n");
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
  run("UPDATE projects SET name = ? WHERE id = ?", `[BENCH PUB V2] ${p.brand?.name ?? p.name} (${fixture})`, projectId);
}
const project = loadProject(projectId);
say(`Projet : ${project.name} (${projectId})`);

// 3. Tâche dédiée, moteur publicitaire V2 seul, plafond réel.
const jobId = id();
run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jobId, user.id, projectId, "ads.v2", "Benchmark Pub V2", JSON.stringify({ projectId, benchmark: true }), "running", now(), now(), now());
const ctx = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jobId));
const { runAdEngineV2 } = await import("../src/lib/ads-v2/engine");
const { validCutouts } = await import("../src/lib/engine/cutouts");
if (project.business === "products" && !validCutouts(projectId).length) say("  ↷ aucune vraie photo détourée : créations sans produit posé (univers + typographie).");
const started = Date.now();
const res = await runWithLang({ ui: "fr", content: "fr" }, () =>
  runForUser(user!.id, () => withTrace({ jobId, projectId, intent: "CREATE_AD", costCapMicro: capMicro }, () => runAdEngineV2(ctx, projectId!, { count, platforms: platforms.length ? platforms : undefined, offer: opt("--offer") ?? null, audience: opt("--audience") ?? null, objective: opt("--objective") ?? null, maxCostEur: maxCost }))),
);
const stopped = res.stoppedByCostCap;
completeJob(jobId, { concepts: res.concepts.length, creatives: res.outcomes.length, stoppedByCostCap: stopped });

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
  benchmark: "ads-v2",
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
  insightGaps: res.insight.gaps,
  concepts: res.concepts.map((c) => ({ id: c.id, angle: c.angle.type, material: c.angle.material, copyBy: c.copyBy, hook: c.copy.hook, hookB: c.copy.hookB, headline: c.copy.headline, cta: c.copy.cta, layout: c.visual.layout, image: c.visual.kind, claims: c.claims.map((x) => x.fix) })),
  creatives: res.outcomes.map((o) => ({ concept: o.conceptId, platform: o.platform, aspect: o.aspect, verdict: o.verdict, score: o.score, attempts: o.attempts, reused: o.reused, reason: o.reason, codes: o.codes, assetId: o.assetId, imageAssetId: o.imageAssetId })),
  stats: res.stats,
  notes: res.notes,
  costByStep: byStep,
  calls: calls.length,
  estimatedCalls: calls.filter((c) => c.estimated).length,
  failedCalls: calls.filter((c) => c.status !== "ok").length,
  limits: "Coûts : enregistrés depuis l'usage renvoyé par le fournisseur quand il existe, sinon ESTIMÉS (table des prix) ; la facture du fournisseur, parfois différée, fait foi. Le plafond bloque l'appel suivant avant envoi ; un appel parti est payé.",
};
const file = path.join(reportsDir, `benchmark-ads-v2-${fixture}-${report.at.slice(0, 19).replace(/[:T]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2));

say("");
for (const c of report.concepts) say(`• ${c.angle} (${c.copyBy}) — « ${c.hook} » · ${c.cta} · ${c.layout}${c.claims.length ? ` · à corriger : ${c.claims.join(" ; ")}` : ""}`);
for (const o of report.creatives) say(`  ${o.verdict === "FINAL" ? "✓" : o.verdict === "PROVISIONAL" ? "~" : "✗"} ${o.platform} ${o.aspect} — ${o.verdict}${o.score != null ? ` ${o.score}/10` : ""} · ${o.attempts} essai(s)${o.reused ? " · réutilisée" : ""} — ${o.reason}`);
say(`\nCoût : ${report.spentEur.toFixed(3)} € sur ${maxCost.toFixed(2)} € autorisés${stopped ? " — ARRÊTÉ AU PLAFOND" : ""} · ${report.calls} appel(s) dont ${report.estimatedCalls} estimé(s), ${report.failedCalls} en échec`);
for (const [k, v] of Object.entries(byStep)) say(`  ${k} : ${v.calls} × ${v.model} = ${v.cost.toFixed(3)} €${v.estimated ? ` (${v.estimated} estimé(s))` : ""}`);
say(`\nRapport : ${path.relative(process.cwd(), file)}`);
say(`Studio : /studio/${projectId} (bibliothèque › 03 · Images › Publicités) — la qualité se juge sur les vraies créations, pas sur les notes.\n`);
process.exit(0);
