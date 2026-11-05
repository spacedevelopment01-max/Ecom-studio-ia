/**
 * Recette #301 « SYNA complète » — date d'un brouillon en phrase naturelle (contrat #375 de Codex), dans la
 * conversation SYNA de l'écran Calendrier, Encre / Plein cadre, 1440 / 390 px. Phrases d'origine, rien d'aménagé :
 *  Calendrier : « Décale ma prochaine publication de 2 jours » → carte Gratuit — 0 €, dates avant / après AVEC fuseau →
 *  annulation sans écriture → nouvelle proposition → confirmation → date relue (+2 jours), texte / statut inchangés,
 *  Calendrier relu ; rechargement sans écriture ; aucune programmation, aucun envoi.
 * Stockage isolé, clés vides, réseau hors boucle locale refusé, 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-calendrier-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-cal301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "cal301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "SOCIAL"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-calendrier-301");
fs.mkdirSync(out, { recursive: true });

const { account, project } = await import("../tests/conversation209-fixtures");
const { openProjectConversation } = await import("../src/lib/orchestrator/conversation");
const { createManualPost } = await import("../src/lib/social-v2/manual");
const { loadProject } = await import("../src/lib/projects");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { chromium } = await import("playwright");
const { prepareProject, realAiCalls, simulatedFixtureCalls, PREPARED } = await import("./syna301-recette-preparee");

type Mode = "encre" | "plein";
type Format = { name: "ordinateur" | "telephone"; width: number; height: number };
const FORMATS: Format[] = [{ name: "ordinateur", width: 1440, height: 1000 }, { name: "telephone", width: 390, height: 844 }];
const cases: { mode: Mode; format: Format; pid: string; cid: string; token: string }[] = [];
for (const mode of ["encre", "plein"] as Mode[]) for (const format of FORMATS) {
  const u = await account(), pid = project(u), c = openProjectConversation(u, pid);
  prepareProject(u as never, c.id, pid);
  const date = Math.floor(now() / 60000) * 60000 + 3 * 86400000;
  const post = createManualPost(loadProject(pid), u.id, { network: "facebook", format: "text", title: "Brouillon fictif", caption: "Texte conservé", hashtags: "#Fictif", media: [], scheduledAt: date } as never);
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), u.id, now() + 3600000, now());
  writeSynaPrefs(u.id, "account", null, { mode, panel: "collapsed" });
  cases.push({ mode, format, pid, cid: c.id, token, postId: post.id } as never);
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
    page.setDefaultTimeout(150000); // première compilation du serveur de développement : plusieurs dizaines de secondes
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const panel = page.locator("#syna-panel:visible");
    const shot = async (name: string, full = false) => { const file = `${label}-${name}.png`; await page.screenshot({ path: path.join(out, file), fullPage: full }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const detail = await fn(); steps.push({ etape, ok: true, ...(detail ? { detail } : {}) }); console.log(`  ✓ ${label} · ${etape}${detail ? " — " + detail : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => { if (!(await panel.count())) await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor(); };
    const closeSyna = async () => { if (await panel.count()) await panel.getByRole("button", { name: "Replier SYNA", exact: true }).first().click(); await page.locator("#syna-panel:visible").waitFor({ state: "detached" }).catch(() => {}); };
    const send = async (text: string) => {
      await openSyna();
      await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" }).fill(text);
      await panel.getByRole("button", { name: "Enregistrer", exact: true }).click();
    };
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "débordement horizontal");
    const desktop = k.format.name === "ordinateur";
    const kk = k as unknown as { postId: string };
    const card = panel.getByRole("region", { name: "Calendrier — gratuit", exact: true });
    const post = () => one<Record<string, any>>("SELECT * FROM posts WHERE id=?", kk.postId)!;
    const initial = post();
    const turns = () => all<{ request_json: string }>("SELECT request_json FROM agent_conversation_turns WHERE conversation_id=?", k.cid).filter((t) => /confirm-calendar/.test(t.request_json)).length;
    const noQuote = async () => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), "bouton de devis affiché");
    try {
      await step("Calendrier ouvert dans le mode du compte, brouillon visible", async () => {
        await page.goto(`${origin}/studio/${k.pid}/calendrier`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {});
        const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click();
        check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        await noOverflow(); await shot("1-calendrier");
      });
      await step("« Décale ma prochaine publication de 2 jours » → Gratuit — 0 €, dates avec fuseau, aucun devis, rien d'écrit", async () => {
        await send("Décale ma prochaine publication de 2 jours");
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await card.innerText(); check(/Gratuit — 0 €/.test(txt) && /Brouillon fictif/.test(txt), `carte : ${txt}`);
        for (const sel of ["[data-syna-calendar-before]", "[data-syna-calendar-after]"]) { const d = await card.locator(sel).innerText(); check(/\((?:[A-Za-z_]+\/[A-Za-z_]+|UTC)\)/.test(d) && /\d{2}:\d{2}/.test(d), `date sans fuseau : ${d}`); }
        await noQuote(); check(post().scheduled_at === initial.scheduled_at, "écriture avant l'accord"); await noOverflow(); await shot("2-proposition");
        return (await card.locator("[data-syna-calendar-after]").innerText());
      });
      await step("Annuler → aucune écriture ; nouvelle proposition", async () => {
        await card.getByRole("button", { name: "Annuler", exact: true }).click();
        await card.waitFor({ state: "detached" }).catch(() => {});
        check(JSON.stringify(post()) === JSON.stringify(initial), "écriture après annulation");
        await send("Décale ma prochaine publication de 2 jours");
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
      });
      await step("confirmation → reçu, date relue +2 jours ; texte, statut, réseau inchangés ; aucune programmation", async () => {
        const n = turns(), jobs = one<{ n: number }>("SELECT COUNT(*) n FROM jobs")!.n;
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        const after = post(); check(after.scheduled_at === initial.scheduled_at + 2 * 86400000, `date relue : ${after.scheduled_at}`); check(turns() === n + 1, "écritures en double");
        for (const f of ["caption", "status", "network", "title", "hashtags"]) check(after[f] === initial[f], `champ modifié : ${f}`);
        check(one<{ n: number }>("SELECT COUNT(*) n FROM jobs")!.n === jobs, "tâche créée (programmation ?)");
        await noOverflow(); await shot("3-recu");
      });
      await step("rechargement : reçu conservé, aucune nouvelle écriture", async () => {
        const n = turns(), saved = JSON.stringify(post()); await page.reload({ waitUntil: "networkidle" }); await openSyna();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor(); check(turns() === n && JSON.stringify(post()) === saved, "écriture au rechargement"); await shot("4-recharge");
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format.name, steps, ok: steps.every((s) => s.ok) && steps.length > 0 });
    await context.close();
  }
  await b.close();
  const calls = realAiCalls(), jobs = one<{ n: number }>("SELECT COUNT(*) n FROM jobs")!.n;
  console.log(`· projet ${PREPARED ? "PRÉPARÉ" : "neuf"} · lignes simulées : ${simulatedFixtureCalls()} · appels IA : ${calls} · tâches : ${jobs} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`);
  if (jsErrors.length) errors.push(...jsErrors);
} catch (e) {
  errors.push(String(e));
  console.error("✗ " + String(e));
} finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-CALENDRIER-301.json"), JSON.stringify({ schema: "syna301-calendrier-recette-1", results, errors, forbidden, coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log);
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
