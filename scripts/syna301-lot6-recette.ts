/**
 * Recette #301 « SYNA complète », lot 6 — contrats #389 à #392 de Codex dans la conversation SYNA du
 * Studio, Encre / Plein cadre × 1440 / 390 px, projet de services. Phrases d'origine des contrats, rien d'aménagé :
 *  1. Activité : « Mets le prix de la prestation du profil « Diagnostic » à « 75 € » » → carte « Prix affiché » → accord
 *     → prix relu, durée / description / autres prestations intacts ;
 *  2. « Mets la durée … à « 45 min » » puis « Remplace la description … par « Texte fourni sur deux lignes » » (multiligne) ;
 *  3. « Efface le prix de la prestation du profil « Diagnostic » » → « (effacé) » → prix vide relu ;
 *  4. Fichiers : « Crée un dossier Photos atelier » → question gratuite (aucun dossier) → rechargement → « à la racine »
 *     → proposition seulement → accord → dossier relu à la racine.
 * Stockage isolé, clés vides, réseau hors boucle locale refusé, 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-lot6-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-lot6-301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "lot6-301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "THEME_TOOLS", "LOCAL_SITE", "FILES", "SERVICE_PROFILE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-lot6-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, loadProject, saveServices } = await import("../src/lib/projects");
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

const port = 6600 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
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
      const svc = () => loadProject(k.pid).services.services.find((x) => x.name === "Diagnostic")!;
      const card = (name: string) => panel.getByRole("region", { name, exact: true });
      const agree = async (region: string, phrase: string, expectTxt: RegExp, check2: () => boolean, label2: string) => {
        const c = card(region); await say(phrase); await c.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await c.innerText(); check(expectTxt.test(txt), `carte : ${txt}`); await noQuote(); await shot(label2);
        await confirm(c, /Enregistré et relu · reçu/); check(check2(), `relecture : ${JSON.stringify(svc())}`); await noOverflow();
      };
      await step("Activité : prix affiché « 75 € » → accord → relu, autres champs intacts", async () => {
        await goto("produit"); check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        const before = svc();
        await agree("Prix affiché d’une prestation du profil", "Mets le prix de la prestation du profil « Diagnostic » à « 75 € »", /Prestation : Diagnostic[\s\S]*50 €/, () => { const a = svc(); return a.price === "75 €" && a.duration === before.duration && a.description === before.description; }, "1-prix");
      });
      await step("durée « 45 min » puis description sur deux lignes (saut de ligne conservé) → accords → relues", async () => {
        await agree("Durée affichée d’une prestation du profil", "Mets la durée de la prestation du profil « Diagnostic » à « 45 min »", /30 min/, () => svc().duration === "45 min" && svc().price === "75 €", "2-duree");
        await agree("Description d’une prestation du profil", "Remplace la description de la prestation du profil « Diagnostic » par « Texte fourni par le client.\nDeuxième ligne fournie. »", /Examen fourni[\s\S]*Deuxième ligne fournie/, () => svc().description === "Texte fourni par le client.\nDeuxième ligne fournie." && svc().duration === "45 min", "3-description");
      });
      await step("« Efface le prix … » → « (effacé) » → prix vide relu", async () => {
        await agree("Prix affiché d’une prestation du profil", "Efface le prix de la prestation du profil « Diagnostic »", /\(effacé\)/, () => !svc().price && svc().duration === "45 min", "4-efface");
      });
      await step("Fichiers : « Crée un dossier Photos atelier » → question → rechargement → « à la racine » → accord → relu", async () => {
        await goto("fichiers"); const c = card("Nouveau dossier — gratuit");
        await say("Crée un dossier Photos atelier"); await c.waitFor();
        check(!(await c.getByRole("button", { name: "Confirmer gratuitement" }).count()), "accord proposé sans destination"); await noQuote();
        check(!one("SELECT 1 FROM folders WHERE project_id=? AND name=?", k.pid, "Photos atelier"), "dossier créé sans accord");
        await page.reload({ waitUntil: "networkidle" }); await say("à la racine"); await c.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await c.innerText(); check(/Photos atelier/.test(txt) && /Racine/.test(txt), `carte : ${txt}`);
        check(!one("SELECT 1 FROM folders WHERE project_id=? AND name=?", k.pid, "Photos atelier"), "dossier créé avant l'accord"); await shot("5-dossier");
        await confirm(c, /Enregistré et relu · reçu/);
        check(one<{ parent_id: string | null }>("SELECT parent_id FROM folders WHERE project_id=? AND name=?", k.pid, "Photos atelier")?.parent_id === null, "dossier non relu"); await noOverflow();
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
  fs.writeFileSync(path.join(out, "RESUME-LOT6-301.json"), JSON.stringify({ schema: "syna301-lot6-recette-1", results, errors, constats, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`); if (constats.length) console.log("Constats :\n" + constats.join("\n"));
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
