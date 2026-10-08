/**
 * Benchmark RÉEL du Social Media & Automatisation Engine V2 (phase 9B) — à lancer plus tard dans VOTRE Codespace,
 * avec vos fournisseurs et comptes déjà configurés. Aucune clé n'est lue depuis la ligne de commande ni affichée.
 *
 *   npx tsx scripts/benchmark-social-v2.ts --check                                  (vérifications seules, 0 €)
 *   npx tsx scripts/benchmark-social-v2.ts --fixture A --dry-run                     (calendrier + estimation, 0 €)
 *   npx tsx scripts/benchmark-social-v2.ts --fixture B --days 30 --posts-per-day 3 --max-cost 5
 *   npx tsx scripts/benchmark-social-v2.ts --project <id> --days 14 --posts-per-day 2 --max-cost 3
 *
 * Scénarios (--fixture) : A artisan (30 j × 2), B cosmétique (30 j × 3), C high-tech (15 j × 2), D restaurant
 * (14 j × 2), E SaaS (30 j × 1). Compte : l'administrateur unique par défaut, sinon --user ou BENCH_USER.
 *
 * Ce que fait le script :
 *  1. vérifie version (phase 9A), compte, accès IA, comptes sociaux reliés (statut seulement), réseaux et niveaux
 *     de prise en charge, worker (battement), tables, plafond, absence de secret ; avec --check il s'arrête là ;
 *  2. niveau 1 : crée le calendrier (gratuit) ; niveau 2 : production par lots — --dry-run : estimation seule ;
 *     sinon production avec la génération payante autorisée par la commande, dans le plafond --max-cost ;
 *  3. AUCUNE PUBLICATION : le script ne programme ni ne publie rien (la publication réelle sur des comptes de test se
 *     fera en 9B, avec votre autorisation explicite, depuis le studio) ;
 *  4. diagnostic dans reports/benchmark-social-v2-<scénario>-<date>.json : stratégie, variété, défauts, coûts.
 */
import "../worker/env";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const flag = (k: string) => args.includes(k);

const { one, all, run, id, now } = await import("../src/lib/db");
const { providerKey, PROVIDERS, activeProviderKey } = await import("../src/lib/ai/config");
const { aiActiveFor, hasAiCredits, runForUser } = await import("../src/lib/ai/access");
const { runWithLang } = await import("../src/lib/i18n-server");
const { withTrace, assertUnderCostCap, CostCapReached, redact } = await import("../src/lib/ai/trace");
const { loadProject } = await import("../src/lib/projects");
const { EUR } = await import("../src/lib/billing");
const { seedImageFixture } = await import("../tests/image-v2-fixtures");
const { SOCIAL_SCENARIOS, SOCIAL_FIXTURE, SOCIAL_PLAN, socialScenarioOf } = await import("../tests/social-v2-fixtures");

const scenario = socialScenarioOf(opt("--fixture") ?? "A");
const maxCost = Number(opt("--max-cost") ?? "3");
const checkOnly = flag("--check");
const dryRun = flag("--dry-run");

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

if (!scenario) fail(`Scénario inconnu (au choix : ${SOCIAL_SCENARIOS.join(", ")} ou ${Object.values(SOCIAL_FIXTURE).join(", ")}).`);
const plan = SOCIAL_PLAN[scenario];
const days = Number(opt("--days") ?? plan.days);
const perDay = Number(opt("--posts-per-day") ?? plan.perDay);
if (!Number.isFinite(maxCost) || maxCost < 0 || maxCost > 100) fail("--max-cost doit être un montant en euros entre 0 et 100.");
if (!Number.isInteger(days) || days < 1 || days > 90) fail("--days : 1 à 90.");
if (!Number.isInteger(perDay) || perDay < 1 || perDay > 5) fail("--posts-per-day : 1 à 5.");

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

const branch = sh("git rev-parse --abbrev-ref HEAD") ?? "?";
const commit = sh("git rev-parse --short HEAD") ?? "?";
check("Branche / version", branch !== "?", `branche ${branch}, commit ${commit}`);
const { POLICIES, POLICY_VERSION } = await import("../src/lib/quality/policies");
const { HANDLER_TYPES } = await import("../worker/handlers");
const p9a = { engine: fs.existsSync(path.join(process.cwd(), "src/lib/social-v2/engine.ts")), policy: !!(POLICIES as Record<string, unknown>).social_post_v2, worker: HANDLER_TYPES.includes("post.publish") && HANDLER_TYPES.includes("social.v2.produce") };
check("Phase 9A présente", Object.values(p9a).every(Boolean), `moteur social ${p9a.engine ? "✓" : "✗"} · politique social_post_v2 ${p9a.policy ? "✓" : "✗"} (${POLICY_VERSION}) · tâches de fond ${p9a.worker ? "✓" : "✗"}`);

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
check("Accès IA du compte", user ? (access ? true : "warn") : false, !user ? "compte introuvable" : access ? "actif (production payante possible dans le plafond)" : hasAiCredits(user.id) ? "inactif : production gratuite seulement (bibliothèque, rendu local)" : "inactif : budget IA insuffisant");
check("Fournisseurs IA", activeProviderKey("anthropic") ? true : "warn", `anthropic ${activeProviderKey("anthropic") ? "✓" : "—"} · openai ${activeProviderKey("openai") ? "✓" : "—"} · google ${activeProviderKey("google") ? "✓" : "—"} · fal ${activeProviderKey("fal") ? "✓" : "—"}`);
const conns = user ? all<{ provider: string; status: string }>("SELECT provider, status FROM connections WHERE user_id = ? AND provider IN ('instagram','facebook','tiktok','youtube','pinterest')", user.id) : [];
check("Comptes sociaux reliés", conns.length ? true : "warn", conns.length ? conns.map((c) => `${c.provider} (${c.status})`).join(" · ") : "aucun compte relié : publication réelle impossible (attendu avant la phase 9B)");
const { PLATFORM_SPECS, PLATFORMS } = await import("../src/lib/social-v2/platforms");
check("Réseaux (niveau réel)", "warn", PLATFORMS.map((p) => `${PLATFORM_SPECS[p].label} : ${PLATFORM_SPECS[p].level === "ready_to_connect" ? "PRÊT À CONNECTER (non vérifié)" : PLATFORM_SPECS[p].level === "export" ? "EXPORT" : "NON DISPONIBLE"}`).join(" · "));
const beat = one<{ beat_at: number }>("SELECT MAX(beat_at) beat_at FROM worker_heartbeat");
check("Worker (programmation)", beat?.beat_at && beat.beat_at > now() - 5 * 60_000 ? true : "warn", beat?.beat_at ? `dernier battement il y a ${Math.round((now() - beat.beat_at) / 1000)} s` : "aucun battement : lancez le worker pour que les publications programmées partent");
const tables = new Set(all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'").map((t) => t.name));
const cols = new Set(all<{ name: string }>("PRAGMA table_info(posts)").map((c) => c.name));
check("Base de données", ["post_attempts", "social_automations", "post_metrics"].every((t) => tables.has(t)) && ["content_hash", "approved_hash", "lock_token"].every((c) => cols.has(c)), `journal des envois ${tables.has("post_attempts") ? "✓" : "✗"} · automatisations ${tables.has("social_automations") ? "✓" : "✗"} · métriques ${tables.has("post_metrics") ? "✓" : "✗"} · versions approuvées ${cols.has("approved_hash") ? "✓" : "✗"}`);
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
check("Plafond de coût", capOk || maxCost === 0, `${maxCost.toFixed(2)} € — un appel au-delà du plafond est bloqué avant envoi`);
check("Publication", true, "AUCUNE : ce script ne programme ni ne publie (publication réelle en 9B, avec votre autorisation)");

say("\n=== Benchmark Social Media & Automatisation Engine V2 — vérifications ===\n");
for (const c of checks) say(`${c.ok === true ? "✓" : c.ok === "warn" ? "⚠" : "✗"} ${c.label.padEnd(26)} ${c.detail}`);
const blocking = checks.filter((c) => c.ok === false);
say(`${leaked ? "✗" : "✓"} ${"Aucun secret affiché".padEnd(26)} ${leaked ? "une clé a été détectée et masquée : signalez-le" : "sortie contrôlée (aucune clé, e-mail masqué)"}`);
say(`\n${blocking.length ? `✗ ${blocking.length} point(s) bloquant(s) : ${blocking.map((c) => c.label).join(", ")}` : "✓ Tout est prêt pour le benchmark."}`);
if (checkOnly) {
  say("\nVérifications terminées (--check) : aucun projet créé, aucune tâche, aucun appel payant, aucune publication.\n");
  process.exit(blocking.length || leaked ? 1 : 0);
}
if (blocking.length || !user) fail("Benchmark non lancé : corrigez d'abord les points bloquants ci-dessus.");

let projectId = opt("--project");
if (projectId) {
  const p = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId);
  if (!p || p.user_id !== user.id) fail("Projet introuvable dans ce compte.");
} else {
  projectId = runWithLang({ ui: "fr", content: "fr" }, () => seedImageFixture(user!.id, SOCIAL_FIXTURE[scenario]));
  run("UPDATE projects SET name = ? WHERE id = ?", `[BENCH SOCIAL V2] ${loadProject(projectId).name} (${scenario})`, projectId);
}
const project = loadProject(projectId);
const { createPlanV2 } = await import("../src/lib/social-v2/planner");
const { estimateProduction, produceBatch, postsOfPlan } = await import("../src/lib/social-v2/production");
const { realSocialDeps } = await import("../src/lib/social-v2/deps");
const { varietyReport, checkPost } = await import("../src/lib/social-v2/quality");
const startDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const started = Date.now();
const res = await runWithLang({ ui: "fr", content: "fr" }, () => runForUser(user!.id, async () => {
  const r = createPlanV2(project, { startDate, days, perDay, timezone: project.settings.timezone || "Europe/Paris", platforms: plan.platforms.map((platform) => ({ platform })), formatMix: plan.mix });
  const ids = postsOfPlan(r.planId);
  const deps = realSocialDeps(null, project, access);
  const est = estimateProduction(project, ids, deps, { allowPaid: !dryRun });
  let prod = null;
  if (!dryRun) {
    const jobId = id();
    prod = await withTrace({ jobId, projectId: project.id, intent: "SOCIAL", costCapMicro: capMicro }, () => produceBatch(project, ids, deps, { allowPaid: access, maxCostEur: maxCost, approvedEstimateMicro: Math.min(est.estimateMicro, capMicro), batchSize: ids.length }));
  }
  return { r, est, prod, ids };
}));
const posts = all<{ id: string; network: string; format: string; status: string; pillar: string; caption: string; media: string }>("SELECT id, network, format, status, pillar, caption, media FROM posts WHERE plan_id = ? ORDER BY scheduled_at", res.r.planId);
const report = {
  benchmark: "social-v2",
  scenario,
  projectId,
  planId: res.r.planId,
  at: new Date().toISOString(),
  durationSec: Math.round((Date.now() - started) / 1000),
  dryRun,
  days,
  perDay,
  maxCostEur: maxCost,
  created: res.r.created,
  warnings: res.r.warnings,
  strategy: { archetype: res.r.strategy.archetype, pillars: res.r.strategy.pillars.map((p) => p.title), ctas: res.r.strategy.ctas, gaps: res.r.strategy.gaps },
  estimate: res.est,
  production: res.prod,
  variety: varietyReport(projectId, res.r.planId),
  blocking: posts.slice(0, 200).map((p) => ({ id: p.id, blocking: checkPost(project, p.id).blocking })).filter((x) => x.blocking.length).length,
  published: 0,
  sample: posts.slice(0, 12).map((p) => ({ network: p.network, format: p.format, pillar: p.pillar, status: p.status, caption: p.caption, hasMedia: p.media !== "[]" })),
  limits: "Aucune publication ; mots-clés et faits : ceux du projet ; qualité réelle à juger en lisant et en regardant les publications dans le studio.",
};
const file = path.join(process.cwd(), "reports", `benchmark-social-v2-${scenario}-${report.at.slice(0, 19).replace(/[:T]/g, "-")}.json`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(report, null, 2));
say(`\n${res.r.created} publications planifiées (${days} j × ${perDay}) · estimation ${(res.est.estimateMicro / EUR).toFixed(2)} € (${res.est.free} gratuites, ${res.est.paid} payantes)${res.prod ? ` · produites : ${res.prod.produced}, dépensé ${(res.prod.spentMicro / EUR).toFixed(2)} €${res.prod.stoppedByCap ? " — ARRÊTÉ AU PLAFOND" : ""}` : " · --dry-run : rien produit"}`);
say(`Variété : ${report.variety.uniqueHooks} accroches distinctes, part promo ${Math.round(report.variety.promoShare * 100)} %, ${report.variety.placeholders} à compléter · publications : 0 (aucune)`);
say(`Rapport : ${path.relative(process.cwd(), file)}\nStudio : /studio/${projectId}/calendrier\n`);
process.exit(0);
