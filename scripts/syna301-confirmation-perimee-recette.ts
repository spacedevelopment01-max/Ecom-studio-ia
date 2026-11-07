/**
 * Recette #301 « SINA complète », lot 1 — confirmation périmée dans le Studio compilé (carte Fichiers, correctif #364).
 * Scénario reproduit sans aménager le produit : après un reçu, l'accord de l'ANCIENNE proposition est remis en mémoire
 * de session (rechargement survenu avant le nettoyage), la page est rechargée, une nouvelle proposition est faite.
 * Attendu : « Confirmer » n'envoie que la proposition affichée, une seule écriture, nom exact relu ; un second projet
 * ouvert dans le même onglet n'hérite d'aucun accord ni d'aucune incertitude ; aucun appel IA.
 * Ancien en-tête (recette C24) conservé ci-dessous pour le reste du harnais :
 *
 * Pour chaque mode (Encre, Plein cadre) et chaque format (ordinateur 1440 px, téléphone 390 px) :
 *  1. dans Fichiers, la personne coche UN fichier : SINA affiche « Média désigné » ;
 *  2. « Renomme ce fichier en « … » » : carte avant / après, « Gratuit — 0 € », aucun devis ;
 *  3. ordinateur : la réponse à la confirmation est perdue APRÈS l'enregistrement → « Vérifier l'enregistrement »
 *     retrouve le reçu sans deuxième écriture ; téléphone : confirmation directe ;
 *  4. la liste Fichiers montre le nouveau nom sans recharger la page ; rechargement : nom et reçu conservés ;
 *  5. ordinateur : demande ambiguë (aucun bouton), annulation avant accord (rien n'est écrit), déplacement vers un
 *     dossier existant (le fichier quitte la racine, il est dans le dossier) ;
 *  6. octets, version et historique du fichier inchangés ; 0 appel IA, 0 requête hors boucle locale, aucun débordement.
 *
 * Stockage temporaire isolé, clés vides, réseau hors boucle locale refusé (serveur et navigateur), comptes fictifs.
 * Usage : npx tsx scripts/syna301-fichiers-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-perimee301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "perimee301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "FILES"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-perimee-301");
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
const png = await sharp({ create: { width: 480, height: 320, channels: 3, background: { r: 196, g: 112, b: 76 } } }).png().toBuffer();
const digest = (b: Buffer) => createHash("sha256").update(b).digest("hex");

const cases: { mode: Mode; format: Format; pid: string; cid: string; assetId: string; folderId: string; token: string; bytes: string; pid2: string; cid2: string }[] = [];
for (const mode of ["encre", "plein"] as Mode[]) for (const format of FORMATS) {
  const u = await account(), pid = project(u), c = openProjectConversation(u, pid);
  const a = await saveAsset({ projectId: pid, userId: u.id, name: "photo-atelier.png", mime: "image/png", data: png, origin: "upload" });
  const folder = createFolder(pid, "Documents validés", null);
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), u.id, now() + 3600000, now());
  writeSynaPrefs(u.id, "account", null, { mode, panel: "collapsed" });
  run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'manual','dominer',?,NULL,'admin',?,?)", "sub-" + id(), u.id, Date.now(), Date.now());
  const pid2 = project(u), c2 = openProjectConversation(u, pid2);
  await saveAsset({ projectId: pid2, userId: u.id, name: "autre-projet.png", mime: "image/png", data: png, origin: "upload" });
  cases.push({ mode, format, pid, cid: c.id, assetId: a.id, folderId: folder.id, token, bytes: digest(assetData(getAsset(a.id)!)), pid2, cid2: c2.id });
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
    page.setDefaultTimeout(45000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const panel = page.locator("#syna-panel:visible"), card = panel.getByRole("region", { name: "Rangement gratuit du fichier", exact: true });
    const shot = async (name: string, full = false) => { const file = `${label}-${name}.png`; await page.screenshot({ path: path.join(out, file), fullPage: full }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const detail = await fn(); steps.push({ etape, ok: true, ...(detail ? { detail } : {}) }); console.log(`  ✓ ${label} · ${etape}${detail ? " — " + detail : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => { if (!(await panel.count())) await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor(); };
    const closeSyna = async () => { if (await panel.count()) await panel.getByRole("button", { name: "Replier SINA", exact: true }).first().click(); await page.locator("#syna-panel:visible").waitFor({ state: "detached" }).catch(() => {}); };
    const send = async (text: string) => {
      await openSyna();
      await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SINA" }).fill(text);
      await panel.getByRole("button", { name: "Enregistrer", exact: true }).click();
    };
    const assetRow = () => getAsset(k.assetId)!;
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "débordement horizontal");
    const desktop = k.format.name === "ordinateur";
    const confirmBodies: Record<string, unknown>[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && /"confirm-files"/.test(r.postData() ?? "")) confirmBodies.push(JSON.parse(r.postData()!)); });
    const confirmTurns = () => all<{ request_json: string }>("SELECT request_json FROM agent_conversation_turns WHERE conversation_id=?", k.cid).filter((t) => /confirm-files/.test(t.request_json)).length;
    try {
      await step("ouverture de Fichiers et désignation", async () => {
        await page.goto(`${origin}/studio/${k.pid}/fichiers`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" });
        const nudge = page.locator("[data-tuto-nudge]");
        if (await nudge.isVisible()) await nudge.locator("button").last().click();
        const mode = await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell");
        check(mode === k.mode, `mode ${mode} au lieu de ${k.mode}`);
        await page.getByRole("checkbox", { name: "Sélectionner photo-atelier.png", exact: true }).check();
        await openSyna();
        await panel.locator("[data-agent-active-context]").getByText(/Média désigné/).waitFor();
        return `mode ${mode}`;
      });
      let stale: Record<string, unknown> | undefined;
      await step("première proposition confirmée : reçu", async () => {
        await send("Renomme ce fichier en « premier nom.png »");
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        check(assetRow().name === "premier nom.png", "premier nom non écrit");
        stale = confirmBodies.at(-1); check(stale?.proposalId, "corps de confirmation non relevé");
        return `proposition ${stale!.proposalId}`;
      });
      await step("rechargement avec l'ancien accord resté en mémoire", async () => {
        await page.evaluate(([key, v]) => sessionStorage.setItem(key, v), [`syna-free-files:${k.cid}`, JSON.stringify(stale)] as const);
        await page.reload({ waitUntil: "networkidle" });
        await page.getByText("premier nom.png", { exact: true }).first().waitFor();
        check(await page.evaluate((key) => sessionStorage.getItem(key), `syna-free-files:${k.cid}`), "accord périmé non injecté");
        await shot("1-recharge-accord-perime");
      });
      await step("nouvelle proposition : seule elle est confirmée, une seule écriture", async () => {
        await page.getByRole("checkbox", { name: "Sélectionner premier nom.png", exact: true }).check();
        await openSyna();
        await send("Renomme ce fichier en « second nom.png »");
        await card.getByText(/Après confirmation : second nom\.png/).waitFor();
        await shot("2-nouvelle-proposition");
        const before = confirmBodies.length, turns = confirmTurns();
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        const sent = confirmBodies.slice(before);
        check(sent.length === 1, `${sent.length} confirmations envoyées`);
        check(sent[0].proposalId !== stale!.proposalId && sent[0].requestId !== stale!.requestId, "l'ancien accord a été rejoué");
        check(confirmTurns() === turns + 1, "écritures en double ou absentes");
        check(assetRow().name === "second nom.png", `nom relu : ${assetRow().name}`);
        check(!(await page.evaluate((key) => sessionStorage.getItem(key), `syna-free-files:${k.cid}`)), "accord encore en mémoire après le reçu");
        await noOverflow();
        await shot("3-recu-nouvelle-proposition");
        return `envoyé ${sent[0].proposalId}, ancien ${stale!.proposalId} écarté`;
      });
      await step("autre projet dans le même onglet : aucun accord ni incertitude hérités", async () => {
        await page.evaluate(([key, v]) => sessionStorage.setItem(key, v), [`syna-free-files:${k.cid}`, JSON.stringify(stale)] as const);
        const before = confirmBodies.length;
        await page.goto(`${origin}/studio/${k.pid2}/fichiers`, { waitUntil: "networkidle" });
        await page.getByText("autre-projet.png", { exact: true }).first().waitFor();
        await openSyna();
        check(!(await panel.getByRole("button", { name: "Vérifier l’enregistrement", exact: true }).count()), "incertitude héritée de l'autre projet");
        check(confirmBodies.length === before, "requête de confirmation envoyée dans l'autre projet");
        check(one<{ n: number }>("SELECT COUNT(*) n FROM agent_conversation_turns WHERE conversation_id=? AND request_json LIKE '%confirm-files%'", k.cid2)!.n === 0, "écriture dans l'autre projet");
        await shot("4-autre-projet");
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
  fs.writeFileSync(path.join(out, "RESUME-PERIMEE-301.json"), JSON.stringify({ schema: "syna301-confirmation-perimee-recette-1", results, errors, forbidden, coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log);
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
