/**
 * Recette #301 « SYNA complète » — lecture de la bibliothèque en phrases naturelles (contrat #377 de Codex), Encre /
 * Plein cadre × 1440 / 390 px. Rien d'aménagé :
 *  1. depuis le Pilote, « Montre les fichiers de mon projet » → carte « Fichiers du projet — lecture gratuite » : les trois
 *     fichiers du projet (pas celui d'un autre projet), miniatures réellement chargées, liens, aucune modification,
 *     aucun devis, mention que SYNA n'a pas regardé les images ;
 *  2. « Montre les dossiers » → le dossier natif ; « Liste les photos » → seulement les images ;
 *  3. « Cherche le fichier « vitrine.png » » → un seul résultat → « Désigner » → écran Fichiers, « Média désigné » ;
 *  4. « Renomme ce fichier en « vitrine-boutique.png » » → carte de rangement → confirmation → nom relu en base ;
 *  5. rechargement : aucune nouvelle écriture ; octets inchangés.
 * Stockage isolé, clés vides, réseau hors boucle locale refusé, 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-bibliotheque-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-biblio301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "biblio301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "FILES"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-bibliotheque-301");
fs.mkdirSync(out, { recursive: true });

const { account, project } = await import("../tests/conversation209-fixtures");
const { openProjectConversation } = await import("../src/lib/orchestrator/conversation");
const { saveAsset, getAsset, createFolder, assetData } = await import("../src/lib/library");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const sharp = (await import("sharp")).default;
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
type Format = { name: "ordinateur" | "telephone"; width: number; height: number };
const FORMATS: Format[] = [{ name: "ordinateur", width: 1440, height: 1000 }, { name: "telephone", width: 390, height: 844 }];
const png = (r: number) => sharp({ create: { width: 480, height: 320, channels: 3, background: { r, g: 112, b: 76 } } }).png().toBuffer();
const digest = (b: Buffer) => createHash("sha256").update(b).digest("hex");

const cases: { mode: Mode; format: Format; pid: string; cid: string; assetId: string; token: string; bytes: string; names: string[] }[] = [];
for (const mode of ["encre", "plein"] as Mode[]) for (const format of FORMATS) {
  const u = await account(), pid = project(u), c = openProjectConversation(u, pid);
  await saveAsset({ projectId: pid, userId: u.id, name: "photo-atelier.png", mime: "image/png", data: await png(196), origin: "upload" });
  const a = await saveAsset({ projectId: pid, userId: u.id, name: "vitrine.png", mime: "image/png", data: await png(40), origin: "upload" });
  await saveAsset({ projectId: pid, userId: u.id, name: "fiche.txt", mime: "text/plain", data: Buffer.from("Faits fournis"), origin: "upload" });
  createFolder(pid, "Documents validés", null);
  run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'manual','dominer',?,NULL,'admin',?,?)", "sub-" + id(), u.id, Date.now(), Date.now());
  const pid2 = project(u); await saveAsset({ projectId: pid2, userId: u.id, name: "autre-projet.png", mime: "image/png", data: await png(90), origin: "upload" });
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), u.id, now() + 3600000, now());
  writeSynaPrefs(u.id, "account", null, { mode, panel: "collapsed" });
  cases.push({ mode, format, pid, cid: c.id, assetId: a.id, token, bytes: digest(assetData(getAsset(a.id)!)), names: ["photo-atelier.png", "vitrine.png", "fiche.txt"] });
}

const port = 5450 + Math.floor(Math.random() * 150), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], {
  env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` },
  stdio: ["ignore", "pipe", "pipe"], detached: true,
});
let log = "";
server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* déjà arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: string; steps: Step[]; ok: boolean }[] = [];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [];
const check = (cond: unknown, message: string) => { if (!cond) throw Error(message); };

try {
  const start = Date.now();
  for (;;) {
    if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-1200));
    try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of cases) {
    const label = `${k.mode}-${k.format.name}`, steps: Step[] = [];
    const context = await b.newContext({ viewport: { width: k.format.width, height: k.format.height }, locale: "fr-FR", reducedMotion: "reduce" });
    await context.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; });
    await context.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await context.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await context.newPage();
    page.setDefaultTimeout(150000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const panel = page.locator("#syna-panel:visible"), card = panel.getByRole("region", { name: "Rangement gratuit du fichier", exact: true }), list = panel.getByRole("region", { name: "Fichiers du projet — lecture gratuite", exact: true });
    const shot = async (name: string, full = false) => { const file = `${label}-${name}.png`; await page.screenshot({ path: path.join(out, file), fullPage: full }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const detail = await fn(); steps.push({ etape, ok: true, ...(detail ? { detail } : {}) }); console.log(`  ✓ ${label} · ${etape}${detail ? " — " + detail : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => { for (let i = 0; i < 3 && !(await panel.count()); i++) { await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor({ timeout: 10000 }).catch(() => {}); } await panel.waitFor(); };
    const closeSyna = async () => { if (await panel.count()) await panel.getByRole("button", { name: "Replier SYNA", exact: true }).first().click(); await page.locator("#syna-panel:visible").waitFor({ state: "detached" }).catch(() => {}); };
    const send = async (text: string) => {
      await openSyna();
      await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" }).fill(text);
      await panel.getByRole("button", { name: "Enregistrer", exact: true }).click();
    };
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "débordement horizontal");
    const versions = () => JSON.stringify(all("SELECT id,name,version,folder_id FROM assets WHERE project_id=? ORDER BY id", k.pid));
    const noQuote = async () => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), "bouton de devis affiché");
    const confirmTurns = () => all<{ request_json: string }>("SELECT request_json FROM agent_conversation_turns WHERE conversation_id=?", k.cid).filter((t) => /confirm-files/.test(t.request_json)).length;
    const shown = async () => (await list.getByRole("list", { name: "Fichiers trouvés", exact: true }).getByRole("listitem").getByRole("link").allInnerTexts()).map((t) => t.trim());
    try {
      const v0 = versions();
      await step("Pilote : « Montre les fichiers de mon projet » → liste gratuite, miniatures chargées, rien modifié", async () => {
        await page.goto(`${origin}/studio/${k.pid}/pilote`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {});
        const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click();
        check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        await send("Montre les fichiers de mon projet");
        await list.getByRole("list", { name: "Fichiers trouvés", exact: true }).waitFor();
        const names = await shown(); check(names.length === 3 && k.names.every((n) => names.includes(n)) && !names.includes("autre-projet.png"), `liste : ${names.join(", ")}`);
        const txt = await list.innerText(); check(/n’a pas regardé les images/.test(txt) && !/Enregistré/.test(txt), `carte : ${txt}`);
        const imgs = list.locator("img"); check((await imgs.count()) === 2, `miniatures : ${await imgs.count()}`);
        for (let i = 0; i < 2; i++) { const im = imgs.nth(i); await im.scrollIntoViewIfNeeded(); await page.waitForFunction((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0, await im.elementHandle(), { timeout: 30000 }); }
        await noQuote(); check(versions() === v0, "écriture pendant la lecture"); await noOverflow(); await shot("1-liste");
        return names.join(", ");
      });
      await step("« Montre les dossiers » puis « Liste les photos » : dossier natif, seulement les images", async () => {
        await send("Montre les dossiers");
        await list.getByRole("list", { name: "Dossiers du projet", exact: true }).getByText("Documents validés").waitFor();
        await send("Liste les photos");
        await list.getByRole("list", { name: "Fichiers trouvés", exact: true }).waitFor();
        const end = Date.now() + 20000; let names = await shown(); while (Date.now() < end && names.length !== 2) { await page.waitForTimeout(300); names = await shown(); }
        check(names.length === 2 && !names.includes("fiche.txt"), `photos : ${names.join(", ")}`); check(versions() === v0, "écriture"); await shot("2-photos");
      });
      await step("« Cherche le fichier « vitrine.png » » → un résultat → « Désigner » → Fichiers, Média désigné", async () => {
        await send("Cherche le fichier « vitrine.png »");
        const end = Date.now() + 30000; let names = await shown(); while (Date.now() < end && !(names.length === 1 && names[0] === "vitrine.png")) { await page.waitForTimeout(300); names = await shown(); }
        check(names.length === 1 && names[0] === "vitrine.png", `recherche : ${names.join(", ")}`);
        await list.getByRole("button", { name: "Désigner vitrine.png", exact: true }).click();
        await page.waitForURL(/\/fichiers$/); await openSyna();
        const ctx = panel.locator("[data-agent-active-context]"); await ctx.getByText(/Média désigné/).waitFor(); // le libellé natif ne cite pas le nom : le renommage qui suit prouve quel fichier est désigné
        return (await ctx.innerText()).split("\n").find((l) => /désign/i.test(l))?.trim();
        await noOverflow(); await shot("3-designe");
      });
      await step("« Renomme ce fichier en « vitrine-boutique.png » » → accord gratuit → nom relu, octets inchangés", async () => {
        const n = confirmTurns();
        await send("Renomme ce fichier en « vitrine-boutique.png »");
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        const a = getAsset(k.assetId)!; check(a.name === "vitrine-boutique.png", `nom relu : ${a.name}`); check(digest(assetData(a)) === k.bytes, "octets modifiés"); check(confirmTurns() === n + 1, "écritures en double");
        await noOverflow(); await shot("4-renomme");
      });
      await step("rechargement : aucune nouvelle écriture", async () => {
        const n = confirmTurns(), v = versions(); await page.reload({ waitUntil: "networkidle" }); await openSyna();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor(); check(confirmTurns() === n && versions() === v, "écriture au rechargement"); await shot("5-recharge");
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format.name, steps, ok: steps.every((s) => s.ok) && steps.length > 0 });
    await context.close();
  }
  await b.close();
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n, jobs = one<{ n: number }>("SELECT COUNT(*) n FROM jobs")!.n;
  console.log(`· appels IA : ${calls} · tâches : ${jobs} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`);
  if (jsErrors.length) errors.push(...jsErrors);
} catch (e) {
  errors.push(String(e));
  console.error("✗ " + String(e));
} finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-BIBLIOTHEQUE-301.json"), JSON.stringify({ schema: "syna301-bibliotheque-recette-1", results, errors, forbidden, coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log);
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
