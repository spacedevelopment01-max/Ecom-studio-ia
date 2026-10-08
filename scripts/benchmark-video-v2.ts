/**
 * Benchmark RÉEL du Video & UGC Engine V2 (phase 7B) — à lancer plus tard dans VOTRE Codespace, où les clés d'API
 * sont déjà configurées (Administration › Fournisseurs IA). Aucune clé n'est lue depuis la ligne de commande ni affichée.
 *
 *   npx tsx scripts/benchmark-video-v2.ts --check                                   (vérifications seules, 0 €)
 *   npx tsx scripts/benchmark-video-v2.ts --fixture B --max-cost 4
 *   npx tsx scripts/benchmark-video-v2.ts --fixture A --duration 30 --format 16:9 --max-cost 6
 *   npx tsx scripts/benchmark-video-v2.ts --project <id> --text "Publicité de 20 s pour TikTok" --max-cost 5
 *   … --plan-only                                      (plan, procédés et ESTIMATION sans rien produire : 0 €)
 *
 * Scénarios (--fixture) : A artisan (plâtrier-peintre), B cosmétique premium, C high-tech, D restaurant, E SaaS.
 * Compte : l'administrateur unique par défaut, sinon --user ou BENCH_USER ; e-mail jamais affiché en entier.
 *
 * Ce que fait le script :
 *  1. vérifie version (phase 7A), compte, accès IA, fournisseurs (vision, images, vidéo), capacités vidéo VÉRIFIÉES
 *     et tarifs, Router V2, voix, ffmpeg, diagnostic, plafond, absence de secret ; avec --check il s'arrête là
 *     (aucun projet, aucune tâche, aucun appel payant) ;
 *  2. lance UNIQUEMENT le Video Engine V2 (aucune boutique, publicité image, blog ni publication) avec accord de
 *     génération donné par vous en lançant la commande ;
 *  3. plafond RÉEL (--max-cost) : un plan dont l'estimation dépasserait le budget n'est pas envoyé (plan local) ;
 *  4. diagnostic dans reports/benchmark-video-v2-<scénario>-<date>.json : modèles utilisés, plans acceptés /
 *     refusés, reprises, coûts par étape, verdict, chemin de la vidéo dans la bibliothèque du studio.
 *
 * LIMITES DU PLAFOND : coûts vidéo ESTIMÉS (tarif à la seconde de l'administration) ; la facture du fournisseur,
 * parfois différée de plusieurs heures, fait foi ; un appel parti est payé (dépassement maximal d'environ un plan) ;
 * les recherches de photos et le montage local sont gratuits.
 */
import "../worker/env";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const flag = (k: string) => args.includes(k);

const { one, all, run, id, now } = await import("../src/lib/db");
const { activeProviderKey, providerKey, providerEnabled, PROVIDERS, routeFor } = await import("../src/lib/ai/config");
const { aiActiveFor, hasAiCredits, runForUser } = await import("../src/lib/ai/access");
const { runWithLang } = await import("../src/lib/i18n-server");
const { JobContext, completeJob } = await import("../src/lib/jobs");
const { withTrace, assertUnderCostCap, CostCapReached, redact } = await import("../src/lib/ai/trace");
const { loadProject } = await import("../src/lib/projects");
const { EUR } = await import("../src/lib/billing");
const { seedImageFixture } = await import("../tests/image-v2-fixtures");
const { SCENARIO_ASK, SCENARIO_FIXTURE, VIDEO_SCENARIOS, scenarioOf } = await import("../tests/video-v2-fixtures");
const { VIDEO_FORMATS } = await import("../src/lib/video-v2/types");

const scenario = scenarioOf(opt("--fixture") ?? "B");
const maxCost = Number(opt("--max-cost") ?? "4");
const duration = opt("--duration") ? Number(opt("--duration")) : undefined;
const format = opt("--format") as (typeof VIDEO_FORMATS)[number] | undefined;
const checkOnly = flag("--check");
const planOnly = flag("--plan-only");

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

if (!scenario) fail(`Scénario inconnu (au choix : ${VIDEO_SCENARIOS.join(", ")} ou ${Object.values(SCENARIO_FIXTURE).join(", ")}).`);
if (!Number.isFinite(maxCost) || maxCost <= 0 || maxCost > 50) fail("--max-cost doit être un montant en euros entre 0 et 50 (ex. --max-cost 4).");
if (duration != null && (!Number.isFinite(duration) || duration < 6 || duration > 600)) fail("--duration : 6 à 600 secondes.");
if (format && !VIDEO_FORMATS.includes(format)) fail(`--format inconnu (au choix : ${VIDEO_FORMATS.join(", ")}).`);

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

// 1a. Version et phase 7A.
const branch = sh("git rev-parse --abbrev-ref HEAD") ?? "?";
const commit = sh("git rev-parse --short HEAD") ?? "?";
check("Branche / version", branch !== "?", `branche ${branch}, commit ${commit}${sh("git status --porcelain")?.length ? " (modifications locales non enregistrées)" : ""}`);
const { POLICIES, POLICY_VERSION } = await import("../src/lib/quality/policies");
const { ACTION_STEPS } = await import("../src/lib/orchestrator/execute");
const { HANDLER_TYPES } = await import("../worker/handlers");
const p7a = {
  engine: fs.existsSync(path.join(process.cwd(), "src/lib/video-v2/engine.ts")),
  policy: !!(POLICIES as Record<string, unknown>).video_v2 && !!(POLICIES as Record<string, unknown>).video_shot_v2,
  intent: "video.v2" in ACTION_STEPS,
  worker: HANDLER_TYPES.includes("video.v2") && HANDLER_TYPES.includes("video.v2.clip") && HANDLER_TYPES.includes("video.v2.render"),
};
check("Phase 7A présente", Object.values(p7a).every(Boolean), `moteur vidéo ${p7a.engine ? "✓" : "✗"} · politiques video_v2 / video_shot_v2 ${p7a.policy ? "✓" : "✗"} (${POLICY_VERSION}) · orchestrateur ${p7a.intent ? "✓" : "✗"} · tâches de fond ${p7a.worker ? "✓" : "✗"}`);
const ff = sh("ffmpeg -version");
check("ffmpeg", !!ff, ff ? ff.split("\n")[0].slice(0, 60) : "absent : montage impossible");

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
check("Accès IA du compte", user ? access : false, !user ? "compte introuvable" : access ? "actif (forfait payant, budget IA suffisant)" : hasAiCredits(user.id) ? "inactif : aucun forfait payant (Découverte = montage local seulement)" : "inactif : forfait sans budget IA suffisant");

// 1c. Fournisseurs (oui / non, jamais la clé).
const ai = Object.fromEntries((["anthropic", "openai", "google", "fal"] as const).map((p) => [p, !!activeProviderKey(p)]));
const disabled = (["anthropic", "openai", "google", "fal"] as const).filter((p) => providerKey(p) && !providerEnabled(p));
check("Fournisseurs IA", ai.anthropic ? (ai.google || ai.fal ? true : "warn") : false, `${Object.entries(ai).map(([p, ok]) => `${p} ${ok ? "✓" : "—"}`).join(" · ")}${disabled.length ? ` (désactivés : ${disabled.join(", ")})` : ""}${ai.anthropic ? (ai.google || ai.fal ? "" : " — aucun fournisseur vidéo : montage local seulement") : " — Anthropic obligatoire (contrôle des plans)"}`);

// 1d. Capacités vidéo VÉRIFIÉES, tarifs et choix du Router V2 (aucun appel).
const { VIDEO_CAPABILITIES, chooseProvider, estimateMicro } = await import("../src/lib/video-v2/providers");
const caps = VIDEO_CAPABILITIES.map((c) => {
  const e = estimateMicro(c.provider, c.model, 1);
  const v = Object.entries(c.verification).map(([k, lvl]) => `${k}:${lvl === "code" ? "vérifié" : "annoncé"}`).join(",");
  return `${c.provider}:${c.model} [${c.durations.join("/")} s, ${v}] ${e != null ? `${(e / EUR).toFixed(3)} €/s` : "TARIF INCONNU"}`;
});
check("Capacités vidéo", VIDEO_CAPABILITIES.every((c) => estimateMicro(c.provider, c.model, 1) != null) ? true : "warn", caps.join(" · "));
const available = (p: string) => !!activeProviderKey(p as never);
const route = routeFor("video_generation");
const pick = (people: boolean, nativeAudio: boolean) => chooseProvider({ imageToVideo: true, people, nativeAudio, aspect: format ?? "9:16", durationS: 5 }, { available, preferred: route ? { provider: route.provider, model: route.model } : null });
const plain = pick(false, false);
const ugc = pick(true, true);
check("Router V2 (vidéo)", plain ? true : "warn", `plan produit → ${plain ? `${plain.provider}:${plain.model} (${plain.reason}, ${plain.shootS} s ≈ ${(plain.estimateMicro / EUR).toFixed(2)} €)` : "aucun fournisseur compatible : montage local"} · plan UGC avec son → ${ugc ? `${ugc.provider}:${ugc.model}` : "aucun (voix par sous-titres)"}`);
check("Voix off", "warn", "aucun fournisseur de synthèse vocale branché dans le studio : texte de voix prêt, porté par les sous-titres (à brancher en 7B)");

// 1e. Diagnostic et plafond.
const cols = new Set(all<{ name: string }>("PRAGMA table_info(ai_calls)").map((c) => c.name));
const missing = ["job_id", "cost", "intent", "routing_reason", "candidate_id"].filter((c) => !cols.has(c));
const tables = new Set(all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'").map((t) => t.name));
const reportsDir = path.join(process.cwd(), "reports");
let writable = true;
try {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.accessSync(reportsDir, fs.constants.W_OK);
} catch {
  writable = false;
}
check("Diagnostic", !missing.length && writable && tables.has("video_documents") && tables.has("video_shots"), `${missing.length ? `colonnes manquantes : ${missing.join(", ")}` : "traçage ai_calls complet"} · documents vidéo ${tables.has("video_documents") ? "✓" : "✗"} · mémoire des plans ${tables.has("video_shots") ? "✓" : "✗"} · reports/ ${writable ? "accessible" : "non accessible"}`);
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
check("Plafond de coût", capOk, `${maxCost.toFixed(2)} € — essai à blanc : un appel au-delà du plafond est bloqué avant envoi (coûts vidéo estimés : voir les limites en tête du script)`);

say("\n=== Benchmark Video & UGC Engine V2 — vérifications ===\n");
for (const c of checks) say(`${c.ok === true ? "✓" : c.ok === "warn" ? "⚠" : "✗"} ${c.label.padEnd(20)} ${c.detail}`);
const blocking = checks.filter((c) => c.ok === false);
say(`${leaked ? "✗" : "✓"} ${"Aucun secret affiché".padEnd(20)} ${leaked ? "une clé a été détectée et masquée : signalez-le" : "sortie contrôlée (aucune clé, e-mail masqué)"}`);
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
  projectId = runWithLang({ ui: "fr", content: "fr" }, () => seedImageFixture(user!.id, SCENARIO_FIXTURE[scenario]));
  const p = loadProject(projectId);
  run("UPDATE projects SET name = ? WHERE id = ?", `[BENCH VIDÉO V2] ${p.brand?.name ?? p.name} (${scenario})`, projectId);
}
const project = loadProject(projectId);
say(`Projet : ${project.name} (${projectId})`);
const ask = { ...SCENARIO_ASK[scenario], ...(opt("--text") ? { text: opt("--text") } : {}), ...(duration ? { durationS: duration } : {}), ...(format ? { aspect: format } : {}) };

// 3. Tâche dédiée, Video Engine V2 seul, plafond réel, accord de génération donné par la commande.
const jobId = id();
run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jobId, user.id, projectId, "video.v2", "Benchmark Vidéo V2", JSON.stringify({ projectId, benchmark: true }), "running", now(), now(), now());
const ctx = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jobId));
const { runVideoEngineV2 } = await import("../src/lib/video-v2/engine");
const { validCutouts } = await import("../src/lib/engine/cutouts");
if (project.business === "products" && !validCutouts(projectId).length) say("  ↷ aucune vraie photo détourée : packshots impossibles, fidélité produit non jugeable — utilisez --project avec une vraie photo.");
const started = Date.now();
const res = await runWithLang({ ui: "fr", content: "fr" }, () => runForUser(user!.id, () => withTrace({ jobId, projectId, intent: "CREATE_VIDEO", costCapMicro: capMicro }, () => runVideoEngineV2(ctx, projectId!, { ask, approveGeneration: true, planOnly, maxCostEur: maxCost }))));
completeJob(jobId, { verdict: res.verdict, videoAssetId: res.videoAssetId, stoppedByCostCap: res.stoppedByCostCap });

// 4. Diagnostic (aucun prompt, aucune image, aucune clé).
const calls = all<{ task: string; provider: string; requested_model: string; prompt_key: string | null; cost: number; status: string; estimated: number }>("SELECT task, provider, requested_model, prompt_key, cost, status, estimated FROM ai_calls WHERE job_id = ? ORDER BY created_at, rowid", jobId);
const spent = calls.reduce((s, c) => s + (c.cost ?? 0), 0) / EUR;
const byStep: Record<string, { calls: number; cost: number; model: string; estimated: number }> = {};
for (const c of calls) {
  const k = c.prompt_key ?? c.task;
  const cur = byStep[k] ?? { calls: 0, cost: 0, model: `${c.provider}:${c.requested_model}`, estimated: 0 };
  byStep[k] = { calls: cur.calls + 1, cost: cur.cost + c.cost / EUR, model: cur.model, estimated: cur.estimated + (c.estimated ? 1 : 0) };
}
const report = {
  benchmark: "video-v2",
  scenario,
  fixture: opt("--project") ? "existing-project" : SCENARIO_FIXTURE[scenario],
  projectId,
  jobId,
  at: new Date().toISOString(),
  durationSec: Math.round((Date.now() - started) / 1000),
  planOnly,
  maxCostEur: maxCost,
  estimateEur: Math.round((res.estimateMicro / EUR) * 1000) / 1000,
  spentEur: Math.round(spent * 1000) / 1000,
  stoppedByCostCap: res.stoppedByCostCap,
  providers: ai,
  intent: res.intent,
  strategy: { language: res.strategy.style.language, narrative: res.strategy.style.narrative, hook: res.strategy.hook, cta: res.strategy.cta, durationS: res.strategy.durationS, gaps: res.strategy.gaps },
  script: { by: res.script.by, sections: res.script.sections.map((s) => ({ part: s.part, durationS: s.durationS, voice: s.voice, onScreen: s.onScreen })) },
  shots: res.shots.map((s) => ({ id: s.id, part: s.part, durationS: s.durationS, method: s.method, provider: s.source.provider ?? null, model: s.source.model ?? null, estimateEur: (s.source.estimateMicro ?? 0) / EUR, why: s.why })),
  outcomes: res.outcomes,
  verdict: res.verdict,
  codes: res.codes,
  issues: res.issues,
  docKey: res.docKey,
  videoAssetId: res.videoAssetId,
  stats: res.stats,
  notes: res.notes,
  costByStep: byStep,
  calls: calls.length,
  estimatedCalls: calls.filter((c) => c.estimated).length,
  failedCalls: calls.filter((c) => c.status !== "ok").length,
  limits: "Coûts vidéo ESTIMÉS (tarif à la seconde de l'administration) ; la facture du fournisseur, parfois différée, fait foi. Le plafond bloque le plan suivant avant envoi ; un appel parti est payé.",
};
const file = path.join(reportsDir, `benchmark-video-v2-${scenario}-${report.at.slice(0, 19).replace(/[:T]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2));

say("");
say(`Intention : ${res.intent.kind} · ${res.intent.platform} · ${res.intent.aspect} · ${res.intent.durationS} s · ${res.intent.complexity}`);
say(`Stratégie : ${report.strategy.language} / ${report.strategy.narrative} — accroche « ${report.strategy.hook} » — CTA « ${report.strategy.cta} »`);
for (const s of report.shots) say(`  ${s.id} ${s.part.padEnd(13)} ${String(s.durationS).padStart(4)} s  ${s.method}${s.provider ? ` (${s.provider}:${s.model}, ≈ ${s.estimateEur.toFixed(2)} €)` : ""}`);
for (const o of res.outcomes) say(`  ${o.verdict === "FINAL" ? "✓" : o.verdict === "PROVISIONAL" ? "~" : "✗"} ${o.shotId} ${o.method} — ${o.verdict}${o.reused ? " · réutilisé" : ""} — ${o.reason}`);
say(`\nVerdict vidéo : ${res.verdict}${res.codes.length ? ` (${res.codes.join(", ")})` : ""}${res.issues.length ? ` — ${res.issues.slice(0, 4).join(" ; ")}` : ""}`);
say(`Coût : ${report.spentEur.toFixed(3)} € (estimation ${report.estimateEur.toFixed(2)} €) sur ${maxCost.toFixed(2)} € autorisés${res.stoppedByCostCap ? " — ARRÊTÉ AU PLAFOND" : ""} · ${report.calls} appel(s) dont ${report.estimatedCalls} estimé(s), ${report.failedCalls} en échec`);
for (const [k, v] of Object.entries(byStep)) say(`  ${k} : ${v.calls} × ${v.model} = ${v.cost.toFixed(3)} €${v.estimated ? ` (${v.estimated} estimé(s))` : ""}`);
say(`\nRapport : ${path.relative(process.cwd(), file)}`);
say(`Studio : /studio/${projectId} (bibliothèque › Vidéos) — la qualité se juge en regardant la vidéo, pas sur les notes.\n`);
process.exit(0);
