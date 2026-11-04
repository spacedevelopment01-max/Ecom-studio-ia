/**
 * Recette #301 « SYNA complète », lot 7 — renommage de dossier (#398), phrases Fichiers naturelles (#397) et lecture des prompts (#396) de Codex dans la conversation SYNA du
 * Studio, Encre / Plein cadre × 1440 / 390 px, projet de services. Phrases d'origine des contrats, rien d'aménagé :
 *  1. Fichiers : « Renomme le dossier Photos en Photos clients » → carte « Renommer un dossier » → accord → nom relu,
 *     même identifiant, même parent ;
 *  2. Fichiers : fichier coché → « Peux-tu renommer ce fichier en « photo accueil.png » ? » (phrase polie) → accord → nom relu,
 *     octets inchangés ;
 *  3. « Affiche ma bibliothèque de prompts » → lecture seule gratuite, aucun bouton d'action.
 * Stockage isolé, clés vides, réseau hors boucle locale refusé, 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-lot7-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-lot7-301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "lot7-301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "THEME_TOOLS", "LOCAL_SITE", "FILES", "SERVICE_PROFILE", "PROMPTS"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-lot7-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, loadProject, saveServices } = await import("../src/lib/projects");
const { saveAsset, getAsset, assetData, createFolder } = await import("../src/lib/library");
const { createHash } = await import("node:crypto");
const { emptyServiceProfile } = await import("../src/lib/project-types");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const sharp = (await import("sharp")).default;
const { chromium } = await import("playwright");
const { prepareProject, realAiCalls, simulatedFixtureCalls, PREPARED } = await import("./syna301-recette-preparee");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const ONLY = process.env.RECETTE_CAS;
const ALL_CASES: { mode: Mode; format: Format; business: "services" }[] = [
  { mode: "encre", format: "ordinateur", business: "services" }, { mode: "encre", format: "telephone", business: "services" },
  { mode: "plein", format: "ordinateur", business: "services" }, { mode: "plein", format: "telephone", business: "services" },
];
const CASES = ALL_CASES.filter((k) => !ONLY || ONLY.split(",").includes(`${k.mode}-${k.format}`));
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;
const prepared: (typeof CASES[number] & Awaited<ReturnType<typeof localSiteFixture>> & { token: string })[] = [];
for (const k of CASES) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => localSiteFixture(k.business));
  prepareProject(f.u as never, f.c.id, f.pid);
  saveServices(f.pid, { ...emptyServiceProfile(), hours: "Lundi 09–17", phone: "04 00 00 00 00", email: "atelier@example.test", area: "Lyon", services: [{ name: "Diagnostic", description: "Examen fourni", price: "50 €", duration: "30 min" }] } as never);
  const token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  prepared.push({ ...k, ...f, token });
}
const photoFile = path.join(dir, "photo-atelier-recette.png");
fs.writeFileSync(photoFile, await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 40, g: 120, b: 90 } } }).png().toBuffer());

const port = 6800 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = ""; server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: Format; business: string; steps: Step[]; ok: boolean }[] = [];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [], constats: string[] = [];
const check = (c: unknown, m: string) => { if (!c) throw Error(m); };

try {
  const start = Date.now();
  for (;;) { if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-800)); try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ } await new Promise((r) => setTimeout(r, 1000)); }
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}-${k.business}`, steps: Step[] = [];
    const ctx = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce", ...(k.format === "telephone" ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await ctx.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await ctx.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await ctx.newPage(); page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const panel = page.locator("#syna-panel:visible");
    const shot = async (n: string) => { const file = `${label}-${n}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const d = await fn(); steps.push({ etape, ok: true, ...(d ? { detail: d } : {}) }); console.log(`  ✓ ${label} · ${etape}${d ? " — " + d : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => { for (let i = 0; i < 3 && !(await panel.count()); i++) { await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor({ timeout: 10000 }).catch(() => {}); } await panel.waitFor(); };
    const box = () => panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" });
    const say = async (text: string) => { await openSyna(); await box().fill(text); await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); };
    const noQuote = async () => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), "bouton de devis affiché");
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "débordement horizontal");
    const goto = async (tab: string) => { await page.goto(`${origin}/studio/${k.pid}/${tab}`, { waitUntil: "networkidle", timeout: 180000 }); await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {}); const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click(); };
    const cur = () => currentTheme(k.pid)!;
    const bodies: Record<string, unknown>[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && /\/api\/studio-agent\/conversations\/[^/]+$/.test(new URL(r.url()).pathname)) { try { bodies.push(r.postDataJSON()); } catch { /* multipart */ } } });
    const confirm = async (card: ReturnType<typeof panel.getByRole>, receipt: RegExp) => { await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click(); await card.getByRole("status").getByText(receipt).waitFor(); };
    try {
      const digest = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
      const folder = createFolder(k.pid, "Photos", null);
      const a = await saveAsset({ projectId: k.pid, userId: k.u.id, name: "vitrine.png", mime: "image/png", data: fs.readFileSync(photoFile), origin: "upload" } as never);
      const bytes = digest(assetData(getAsset(a.id)!));
      const folderRow = () => one<{ id: string; name: string; parent_id: string | null }>("SELECT id,name,parent_id FROM folders WHERE id=?", folder.id)!;
      await step("Fichiers : « Renomme le dossier Photos en Photos clients » → accord → nom relu, même dossier", async () => {
        await goto("fichiers"); check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        const card = panel.getByRole("region", { name: "Renommer un dossier — gratuit", exact: true });
        await say("Renomme le dossier Photos en Photos clients"); await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await card.innerText(); check(/Photos/.test(txt) && /Photos clients/.test(txt) && !/Nouveau dossier/.test(txt), `carte : ${txt}`);
        check(folderRow().name === "Photos", "écriture avant l'accord"); await noQuote(); await shot("1-dossier");
        await confirm(card, /Enregistré et relu · reçu/);
        const r = folderRow(); check(r.name === "Photos clients" && r.id === folder.id && r.parent_id === null, `relu : ${JSON.stringify(r)}`); await noOverflow();
      });
      await step("Fichiers : fichier coché → « Peux-tu renommer ce fichier en « photo accueil.png » ? » → accord → nom relu, octets inchangés", async () => {
        const card = panel.getByRole("region", { name: "Rangement gratuit du fichier", exact: true });
        await page.reload({ waitUntil: "networkidle" });
        await page.getByRole("checkbox", { name: "Sélectionner vitrine.png", exact: true }).check();
        await openSyna(); await panel.locator("[data-agent-active-context]").getByText(/Média désigné/).waitFor();
        await say("Peux-tu renommer ce fichier en « photo accueil.png » ?"); await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        check(getAsset(a.id)!.name === "vitrine.png", "écriture avant l'accord"); await noQuote(); await shot("2-fichier");
        await confirm(card, /Enregistré et relu · reçu/);
        const r = getAsset(a.id)!; check(r.name === "photo accueil.png" && digest(assetData(r)) === bytes, `relu : ${r.name}`); await noOverflow();
      });
      await step("« Affiche ma bibliothèque de prompts » → lecture seule gratuite, aucun bouton d'action", async () => {
        const prompts = panel.getByRole("region", { name: "Bibliothèque de prompts", exact: true });
        await say("Affiche ma bibliothèque de prompts"); await prompts.getByText("Lecture seule — 0 €", { exact: true }).waitFor();
        check(!(await prompts.getByRole("button").count()), "bouton d'action dans la bibliothèque"); await noQuote(); await shot("3-prompts"); await noOverflow();
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, business: k.business, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await ctx.close();
  }
  await b.close();
  const calls = realAiCalls();
  console.log(`· projet ${PREPARED ? "PRÉPARÉ" : "neuf"} · lignes simulées : ${simulatedFixtureCalls()} · appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`); if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-LOT7-301.json"), JSON.stringify({ schema: "syna301-lot7-recette-1", results, errors, constats, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`); if (constats.length) console.log("Constats :\n" + constats.join("\n"));
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
