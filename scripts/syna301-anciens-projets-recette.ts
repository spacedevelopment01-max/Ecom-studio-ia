/**
 * Recette #301 C03 — ancien projet (A1, lecture seule, contrat #313 de Codex) piloté depuis SYNA dans la coquille Encre /
 * Plein cadre, ordinateur 1440 px et téléphone 390 px :
 *   l'avis « lecture seule » reste affiché ; une demande hors exception (« Rédige trois slogans ») est seulement
 *   enregistrée, sans devis ni action ; dans Fichiers, un fichier coché + « Renomme ce fichier en « … » » donne la carte
 *   gratuite, la confirmation écrit le nom, le reçu est relu, la liste se met à jour ; rechargement : reçu conservé ;
 *   le projet reste en lecture seule (aucune Préparation créée), 0 appel IA.
 * Stockage isolé, clés vides, réseau hors boucle locale refusé, comptes fictifs.
 * Usage : npx tsx scripts/syna301-anciens-projets-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-a1-301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "a1-301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "LOCAL_SITE", "FILES", "EXISTING_LOCAL"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-anciens-projets-301");
fs.mkdirSync(out, { recursive: true });

const { historicalProject } = await import("../tests/conversation284-fixtures");
const { openProjectConversation } = await import("../src/lib/orchestrator/conversation");
const { getAsset } = await import("../src/lib/library");
const { stateOf } = await import("../src/lib/preparation/store");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { id, run, one, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const CASES: { mode: Mode; format: Format }[] = [{ mode: "encre", format: "ordinateur" }, { mode: "encre", format: "telephone" }, { mode: "plein", format: "ordinateur" }, { mode: "plein", format: "telephone" }];
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;

const prepared: (typeof CASES[number] & { pid: string; token: string; assetId: string; name: string })[] = [];
for (const k of CASES) {
  const f = await historicalProject("products");
  openProjectConversation(f.u, f.pid);
  const a = one<{ id: string; name: string }>("SELECT id, name FROM assets WHERE project_id=? AND user_id=? AND deleted_at IS NULL AND status!='rejected' AND COALESCE(role,'')!='theme-render-capture' AND folder_id IS NULL LIMIT 1", f.pid, f.u.id);
  if (!a) throw Error("aucun fichier à la racine du projet historique");
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  prepared.push({ ...k, pid: f.pid, token, assetId: a.id, name: a.name });
}

const port = 6000 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = "";
server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: Format; steps: Step[]; ok: boolean }[] = [];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [];
const check = (cond: unknown, message: string) => { if (!cond) throw Error(message); };

try {
  const start = Date.now();
  for (;;) { if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-1200)); try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ } await new Promise((r) => setTimeout(r, 1000)); }
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}`, steps: Step[] = [], newName = `archive relue ${k.mode} ${k.format}.png`;
    const context = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce" });
    await context.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await context.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await context.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const panel = page.locator("#syna-panel:visible"), card = panel.getByRole("region", { name: "Rangement gratuit du fichier", exact: true });
    const shot = async (name: string) => { const file = `${label}-${name}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const detail = await fn(); steps.push({ etape, ok: true, ...(detail ? { detail } : {}) }); console.log(`  ✓ ${label} · ${etape}${detail ? " — " + detail : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    // Après un rechargement, un clic arrivé avant l'hydratation est perdu : nouvel essai (3 au plus), jamais de faux succès.
    const openSyna = async () => { for (let i = 0; i < 3 && !(await panel.count()); i++) { await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor({ timeout: 10000 }).catch(() => {}); } await panel.waitFor(); };
    const closeSyna = async () => { if (await panel.count()) await panel.getByRole("button", { name: "Replier SYNA", exact: true }).first().click(); await page.locator("#syna-panel:visible").waitFor({ state: "detached" }).catch(() => {}); };
    const send = async (text: string) => { await openSyna(); await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" }).fill(text); await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); };
    try {
      await step("ancien projet : avis de lecture seule visible, mode du compte", async () => {
        await page.goto(`${origin}/studio/${k.pid}/fichiers`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {});
        const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click();
        check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        await openSyna();
        await panel.getByText(/lecture seule/i).first().waitFor();
        await shot("1-lecture-seule");
      });
      await step("demande hors exception : enregistrée seulement, aucun devis ni action", async () => {
        const jobs = one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE project_id=?", k.pid)!.n;
        await send("Rédige trois slogans pour ma boutique");
        await panel.getByText("Rédige trois slogans pour ma boutique", { exact: true }).first().waitFor();
        check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), "bouton de devis sur un ancien projet");
        check(one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE project_id=?", k.pid)!.n === jobs, "une tâche a été lancée");
      });
      await step("Fichiers : fichier coché, « Renomme ce fichier en … » → carte gratuite", async () => {
        await closeSyna();
        await page.getByRole("checkbox", { name: `Sélectionner ${k.name}`, exact: true }).check();
        await send(`Renomme ce fichier en « ${newName} »`);
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        check(getAsset(k.assetId)!.name === k.name, "écriture avant l'accord");
        await shot("2-proposition");
      });
      await step("confirmation : reçu relu, nom écrit, liste à jour, projet toujours en lecture seule", async () => {
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        check(getAsset(k.assetId)!.name === newName, `nom ${getAsset(k.assetId)!.name}`);
        check(!stateOf(k.pid), "une Préparation a été créée");
        await closeSyna();
        await page.getByText(newName, { exact: true }).first().waitFor({ timeout: 10000 });
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "débordement horizontal");
        await shot("3-recu-liste");
      });
      await step("rechargement : reçu conservé", async () => { await page.reload({ waitUntil: "networkidle" }); await openSyna(); await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor(); await shot("4-apres-rechargement"); });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await context.close();
  }
  await b.close();
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n;
  console.log(`· appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`);
  if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-ANCIENS-PROJETS-301.json"), JSON.stringify({ schema: "syna301-anciens-projets-recette-1", results, errors, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
