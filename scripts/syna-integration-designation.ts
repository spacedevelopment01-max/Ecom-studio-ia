/**
 * Recette #292, point 4 : la désignation d'une section survit-elle à l'actualisation automatique du Studio (15 s) ?
 *
 * Aucun contournement : on attend volontairement plus de 15 s, puis on regarde ce que voit la personne et si la demande
 * « Remplace le titre de cette section par … » donne encore une proposition gratuite. Trois situations, dans les deux
 * modes (Encre, Plein cadre) :
 *   1. témoin : section désignée, aucune nouvelle version, attente > 15 s ;
 *   2. restauration : une version est restaurée (fenêtre Versions), la section est désignée aussitôt, attente > 15 s ;
 *   3. modification manuelle : proposition, modification hors aperçu (version N+1), « Revalider la cible actuelle »,
 *      attente > 15 s.
 * Le script sort en échec (code 1) si une situation perd la désignation : c'est alors un blocage d'acceptation.
 *
 * Stockage temporaire isolé, clés de fournisseurs vides, réseau hors boucle locale refusé.
 * Usage : npx tsx scripts/syna-integration-designation.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-designation-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "designation-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
const out = path.resolve(process.argv[2] ?? "work/recette-designation");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, saveThemeVersion } = await import("../src/lib/projects");
const { chromium } = await import("playwright");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");

Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "LOCAL_SITE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const WAIT = 17_000; // > 15 s : la relecture périodique du projet (ProjectProvider, au repos) a forcément eu lieu.

type Mode = "encre" | "plein";
type Scenario = "temoin" | "restauration" | "modification-manuelle";
const fixtures: (Awaited<ReturnType<typeof localSiteFixture>> & { mode: Mode; scenario: Scenario; token: string })[] = [];
for (const mode of ["encre", "plein"] as Mode[]) for (const scenario of ["temoin", "restauration", "modification-manuelle"] as Scenario[]) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => localSiteFixture("products"));
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode });
  fixtures.push({ ...f, mode, scenario, token });
}

const port = 5300 + Math.floor(Math.random() * 150), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], {
  env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` },
  stdio: ["ignore", "pipe", "pipe"], detached: true,
});
let log = "";
server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* déjà arrêté */ } };
process.on("exit", stop);

type Result = { mode: Mode; scenario: Scenario; avantAttente: string; apresAttente: string; designationConservee: boolean; reponseSyna: string; propositionGratuite: boolean; capture: string };
const results: Result[] = [];
const errors: string[] = [];
const designationLine = (t: string) => t.split("\n").find((l) => /désign|Aucun objet/.test(l))?.trim() ?? "(aucune ligne de désignation)";

try {
  const start = Date.now();
  for (;;) {
    if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-1200));
    try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  for (const f of fixtures) {
    const label = `${f.mode}-${f.scenario}`;
    const context = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fr-FR", reducedMotion: "reduce" });
    await context.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; });
    await context.addCookies([{ name: "ecs_session", value: f.token, url: origin }]);
    await context.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    const panel = page.locator("#syna-panel"), free = panel.getByRole("region", { name: "Retouche gratuite", exact: true });
    const frame = () => page.frameLocator('iframe[title^="Aperçu"]');
    const textbox = () => panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" });
    const designation = async () => designationLine(await panel.locator("[data-agent-active-context]").innerText().catch(() => ""));
    const collapse = async () => { if (await panel.isVisible()) await panel.getByRole("button", { name: "Replier SYNA", exact: true }).click(); await panel.waitFor({ state: "hidden" }); };
    const select = async () => {
      await collapse();
      const heading = frame().locator(`[data-es-section="index:${f.section}"]`).getByRole("heading").first();
      await heading.waitFor(); await heading.scrollIntoViewIfNeeded();
      const tools = page.locator("[data-site-tools]");
      if (!(await tools.getAttribute("open"))) await tools.locator(":scope > summary").click();
      await page.getByRole("button", { name: "Désigner", exact: true }).click();
      const close = page.getByRole("button", { name: "Fermer les outils", exact: true });
      if (await close.isVisible()) await close.click();
      await heading.click(); await panel.waitFor();
      await panel.locator("[data-agent-active-context]").getByText(/Section désignée/).waitFor();
    };
    const send = async (text: string) => { await textbox().fill(text); await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); };
    // Réponse de SYNA à la demande : proposition gratuite (bouton Confirmer) ou demande de précision.
    const outcome = async () => {
      const confirm = free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true });
      const ask = panel.getByText(/Précisez gratuitement|Désignez une section/).last();
      await Promise.race([confirm.waitFor().catch(() => {}), ask.waitFor().catch(() => {})]);
      if (await confirm.isVisible()) return { ok: true, text: "proposition gratuite (Confirmer)" };
      return { ok: false, text: (await ask.innerText().catch(() => "aucune réponse")).slice(0, 160) };
    };

    await page.goto(`${origin}/studio/${f.pid}/boutique`, { waitUntil: "networkidle", timeout: 180000 });
    await page.locator("#ecs-splash").waitFor({ state: "hidden" });
    const nudge = page.locator("[data-tuto-nudge]");
    if (await nudge.isVisible()) await nudge.locator("button").last().click();
    const mode = await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell");
    if (mode !== f.mode) throw Error(`${label} : mode ${mode} au lieu de ${f.mode}`);

    let avant = "";
    if (f.scenario === "temoin") {
      await select();
      avant = await designation();
    } else if (f.scenario === "restauration") {
      // Une première modification gratuite, pour avoir une version à restaurer.
      await select();
      await send("Remplace le titre de cette section par “Titre à restaurer ensuite”");
      await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).click();
      await free.getByText(/Résultat enregistré · version/).waitFor();
      await collapse();
      await page.getByRole("button", { name: "Versions", exact: true }).click();
      const versions = page.getByRole("dialog").filter({ hasText: /Versions du site|Versions de la boutique/ });
      await versions.waitFor();
      const before = currentTheme(f.pid)!.version.number;
      await versions.getByRole("button", { name: "Restaurer", exact: true }).last().click();
      const end = Date.now() + 30000;
      while (Date.now() < end && currentTheme(f.pid)!.version.number === before) await page.waitForTimeout(100);
      await page.keyboard.press("Escape").catch(() => {});
      // La personne attend que l'aperçu montre la version restaurée (titre d'origine), puis désigne la section.
      const restored = String(currentTheme(f.pid)!.spec.templates.index.sections[f.section].settings.heading ?? "");
      await frame().locator(`[data-es-section="index:${f.section}"]`).getByRole("heading").first().filter({ hasText: restored.slice(0, 20) }).waitFor();
      await select();
      avant = await designation();
    } else {
      await select();
      await send("Remplace le titre de cette section par “Proposition avant modification manuelle”");
      await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).waitFor();
      const manual = structuredClone(currentTheme(f.pid)!.spec);
      manual.templates.index.sections[f.section].settings.heading = "Titre humain à préserver";
      saveThemeVersion(f.pid, manual, "Modification manuelle fictive", "user");
      await free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true }).click();
      await free.getByRole("button", { name: "Revalider la cible actuelle", exact: true }).click();
      await free.waitFor({ state: "detached" });
      avant = await designation();
    }
    // Attente volontaire : l'actualisation automatique du Studio a lieu pendant ce temps.
    await page.waitForTimeout(WAIT);
    const apres = await designation();
    const capture = `${label}-apres-attente.png`;
    await page.screenshot({ path: path.join(out, capture) });
    await send("Remplace le titre de cette section par “Titre après l'actualisation”");
    const o = await outcome();
    await page.screenshot({ path: path.join(out, `${label}-reponse.png`) });
    const r: Result = { mode: f.mode, scenario: f.scenario, avantAttente: avant, apresAttente: apres, designationConservee: /Section désignée/.test(apres), reponseSyna: o.text, propositionGratuite: o.ok, capture };
    results.push(r);
    console.log(`${r.designationConservee && r.propositionGratuite ? "✓" : "✗"} ${label} : avant « ${avant} » → après ${WAIT / 1000} s « ${apres} » ; SYNA : ${o.text}`);
    await context.close();
  }
  await b.close();
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n;
  console.log(`· appels IA : ${calls}`);
  if (calls) errors.push(`ai_calls = ${calls}`);
} catch (e) {
  errors.push(String(e));
  console.error("✗ " + String(e));
} finally {
  stop();
  const failed = results.filter((r) => !(r.designationConservee && r.propositionGratuite));
  fs.writeFileSync(path.join(out, "RESUME-DESIGNATION.json"), JSON.stringify({ schema: "syna-integration-designation-1", attenteMs: WAIT, results, errors, defaut: failed.length > 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log);
  fs.rmSync(dir, { recursive: true, force: true });
  if (errors.length || failed.length) process.exitCode = 1;
}
