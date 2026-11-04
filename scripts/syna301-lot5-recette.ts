/**
 * Recette #301 « SYNA complète », lot 5 — contrats #378, #379, #382, #384 et #387 de Codex dans la conversation SYNA du
 * Studio, Encre / Plein cadre × 1440 / 390 px, projet de services. Phrases d'origine des contrats, rien d'aménagé :
 *  1. Site : « Désactive les animations du site » → carte Animations → accord → nouvelle version, réglage relu ;
 *  2. Site : « Montre les versions du site » → liste → « Restaurer » (version d'avant) remplit la phrase → envoi →
 *     deux aperçus réels → accord → nouvelle version dont le réglage est revenu à l'identique ;
 *  3. Fichiers : « Crée le dossier « Photos atelier » à la racine » → accord → dossier relu à la racine ;
 *  4. Fichiers : « Importer une photo » → miniature « importée, non analysée », fichier relu en base → message suivant
 *     envoyé AVEC la photo (photoIds), puis la photo n'est plus jointe ;
 *  5. Activité : « Mets le téléphone du profil à « 01 23 45 67 89 » » → accord → téléphone relu, autres champs intacts.
 * Stockage isolé, clés vides, réseau hors boucle locale refusé, 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-lot5-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-lot5-301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "lot5-301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "THEME_TOOLS", "LOCAL_SITE", "FILES", "SERVICE_PROFILE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-lot5-301");
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

const port = 6500 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
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
      const v0 = cur();
      await step("Site : « Désactive les animations du site » → accord → version relue, réglage désactivé", async () => {
        await goto("boutique"); check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        const card = panel.getByRole("region", { name: "Animations — gratuit", exact: true });
        await say("Désactive les animations du site"); await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await card.innerText(); check(/Gratuit — 0 €/.test(txt) && /Animations du site/.test(txt) && /désactivées/.test(txt), `carte : ${txt}`);
        await noQuote(); check(cur().version.id === v0.version.id, "écriture avant l'accord"); await shot("1-animations");
        await confirm(card, /Enregistré et relu · version/);
        const v1 = cur(); check(v1.version.number === v0.version.number + 1 && (v1.spec as { settings: Record<string, unknown> }).settings.motion_enabled === false, "réglage non relu");
        await noOverflow(); return `v${v0.version.number} → v${v1.version.number}`;
      });
      await step("Site : « Montre les versions du site » → « Restaurer » la version d'avant → deux aperçus → accord → réglage revenu", async () => {
        const card = panel.getByRole("region", { name: "Versions du site — gratuit", exact: true }), before = cur();
        await say("Montre les versions du site"); const list = card.getByRole("list", { name: "Versions du site", exact: true }); await list.waitFor();
        check(!(await card.getByRole("button", { name: "Confirmer gratuitement" }).count()), "action proposée sur une liste");
        await list.getByRole("button", { name: `Restaurer la version ${v0.version.number}`, exact: true }).click();
        check((await box().inputValue()) === `Restaure la version ${v0.version.number} du site`, `phrase : ${await box().inputValue()}`);
        await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        for (const name of ["Ouvrir le site actuel", "Ouvrir la version à restaurer"]) { const href = await card.getByRole("link", { name, exact: true }).getAttribute("href"); const r = await page.request.get(origin + href!); check(r.ok() && (await r.text()).length > 1000, `aperçu ${href}`); }
        await noQuote(); check(cur().version.id === before.version.id, "écriture avant l'accord"); await shot("2-restauration");
        await confirm(card, /Enregistré et relu · version/);
        const after = cur(); check(after.version.number === before.version.number + 1, "version"); check((after.spec as { settings: Record<string, unknown> }).settings.motion_enabled === (v0.spec as { settings: Record<string, unknown> }).settings.motion_enabled, "réglage non restauré");
        await noOverflow(); return `v${before.version.number} → v${after.version.number} (contenu de v${v0.version.number})`;
      });
      await step("Fichiers : « Crée le dossier « Photos atelier » à la racine » → accord → dossier relu", async () => {
        await goto("fichiers"); const card = panel.getByRole("region", { name: "Nouveau dossier — gratuit", exact: true });
        await say("Crée le dossier « Photos atelier » à la racine"); await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await card.innerText(); check(/Photos atelier/.test(txt) && /Racine/.test(txt), `carte : ${txt}`);
        check(!one("SELECT 1 FROM folders WHERE project_id=? AND name=?", k.pid, "Photos atelier"), "écriture avant l'accord"); await noQuote(); await shot("3-dossier");
        await confirm(card, /Enregistré et relu · reçu/);
        check(one<{ parent_id: string | null }>("SELECT parent_id FROM folders WHERE project_id=? AND name=?", k.pid, "Photos atelier")?.parent_id === null, "dossier non relu à la racine");
        await noOverflow();
      });
      await step("Composeur : « Importer une photo » → miniature « importée, non analysée » → jointe au message suivant puis retirée", async () => {
        await openSyna(); await panel.getByRole("button", { name: "Lien / photo", exact: true }).click();
        if (PREPARED) {
          // Constat (contrat #378 / a593e6ea) : l'import photo reste sous la garde de la fiche ; sur un projet préparé il
          // n'est pas projeté. On vérifie qu'aucun bouton trompeur n'est affiché, sans contourner la garde.
          await page.waitForTimeout(1500); check(!(await panel.getByLabel("Choisir une photo à importer", { exact: true }).count()), "import photo affiché sur un projet préparé");
          constats.push(`${label} : import photo non disponible sur projet préparé (garde serveur photoImport = fiche modifiable)`); return "NON DISPONIBLE (projet préparé, constat)";
        }
        await panel.getByLabel("Choisir une photo à importer", { exact: true }).setInputFiles(photoFile);
        const chips = panel.getByRole("list", { name: "Photos jointes au prochain message", exact: true }); await chips.waitFor();
        check(/importée, non analysée/.test(await chips.innerText()), "mention non analysée");
        const img = chips.locator("img").first(); await page.waitForFunction((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0, await img.elementHandle(), { timeout: 30000 });
        const asset = one<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND name=? AND deleted_at IS NULL", k.pid, "photo-atelier-recette.png"); check(asset, "photo absente des fichiers");
        await shot("4-photo"); const n = bodies.length;
        await say("Voici la photo de l’atelier pour le site");
        const end = Date.now() + 30000; while (Date.now() < end && bodies.length === n) await page.waitForTimeout(200);
        const sent = bodies.slice(n).find((b) => b.action === "message") as { photoIds?: string[] } | undefined; check(JSON.stringify(sent?.photoIds) === JSON.stringify([asset!.id]), `photoIds envoyés : ${JSON.stringify(sent?.photoIds)}`);
        await chips.waitFor({ state: "detached" }); await noOverflow(); return asset!.id.slice(0, 8);
      });
      await step("Activité : « Mets le téléphone du profil à « 01 23 45 67 89 » » → accord → téléphone relu, autres champs intacts", async () => {
        await goto("produit"); const card = panel.getByRole("region", { name: "Téléphone du profil d’activité", exact: true }), before = loadProject(k.pid).services;
        await say("Mets le téléphone du profil à « 01 23 45 67 89 »"); await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await card.innerText(); check(/04 00 00 00 00/.test(txt) && /01 23 45 67 89/.test(txt), `carte : ${txt}`);
        check(loadProject(k.pid).services.phone === before.phone, "écriture avant l'accord"); await noQuote(); await shot("5-telephone");
        await confirm(card, /Enregistré et relu · reçu/);
        const after = loadProject(k.pid).services; check(after.phone === "01 23 45 67 89" && after.email === before.email && after.area === before.area && after.hours === before.hours && JSON.stringify(after.services.map((s) => s.name)) === JSON.stringify(before.services.map((s) => s.name)), "profil relu");
        await page.reload({ waitUntil: "networkidle" }); await openSyna(); await card.getByRole("status").getByText(/Enregistré et relu/).waitFor(); await noOverflow();
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
  fs.writeFileSync(path.join(out, "RESUME-LOT5-301.json"), JSON.stringify({ schema: "syna301-lot5-recette-1", results, errors, constats, constats, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`); if (constats.length) console.log("Constats :\n" + constats.join("\n"));
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
