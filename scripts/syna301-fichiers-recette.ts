/**
 * Recette #301 C24 — ranger un fichier acquis depuis SINA (contrat #305 de Codex), vrai parcours dans la coquille.
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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-fichiers301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "fichiers301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "FILES"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-fichiers-301");
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

const cases: { mode: Mode; format: Format; pid: string; cid: string; assetId: string; folderId: string; token: string; bytes: string }[] = [];
for (const mode of ["encre", "plein"] as Mode[]) for (const format of FORMATS) {
  const u = await account(), pid = project(u), c = openProjectConversation(u, pid);
  const a = await saveAsset({ projectId: pid, userId: u.id, name: "photo-atelier.png", mime: "image/png", data: png, origin: "upload" });
  const folder = createFolder(pid, "Documents validés", null);
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), u.id, now() + 3600000, now());
  writeSynaPrefs(u.id, "account", null, { mode, panel: "collapsed" });
  cases.push({ mode, format, pid, cid: c.id, assetId: a.id, folderId: folder.id, token, bytes: digest(assetData(getAsset(a.id)!)) });
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
    try {
      await step("ouverture de Fichiers dans le mode du compte", async () => {
        await page.goto(`${origin}/studio/${k.pid}/fichiers`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" });
        const nudge = page.locator("[data-tuto-nudge]");
        if (await nudge.isVisible()) await nudge.locator("button").last().click();
        const mode = await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell");
        check(mode === k.mode, `mode ${mode} au lieu de ${k.mode}`);
        await page.getByText("photo-atelier.png", { exact: true }).first().waitFor();
        await noOverflow();
        return `mode ${mode}`;
      });
      await step("désignation : un fichier coché devient la cible de SINA", async () => {
        await page.getByRole("checkbox", { name: "Sélectionner photo-atelier.png", exact: true }).check();
        await openSyna();
        const line = await panel.locator("[data-agent-active-context]").innerText();
        check(/Média désigné · version 1/.test(line), `désignation absente : ${line}`);
        await shot("1-designation");
        return line.split("\n").find((l) => /désign/.test(l))?.trim();
      });
      if (desktop) await step("demande ambiguë : explication, aucun bouton, rien d'écrit", async () => {
        await send("Renomme ce fichier joliment");
        await card.getByText(/Précisez : Renomme ce fichier en/).waitFor();
        check(!(await card.getByRole("button", { name: "Confirmer gratuitement" }).count()), "bouton de confirmation sur une demande ambiguë");
        check(assetRow().name === "photo-atelier.png", "nom modifié par une demande ambiguë");
        await shot("2-ambigu");
      });
      if (desktop) await step("annulation avant l'accord : rien n'est écrit", async () => {
        await send("Renomme ce fichier en « à ne pas garder.png »");
        await card.getByRole("button", { name: "Annuler", exact: true }).click();
        await card.waitFor({ state: "detached" });
        check(assetRow().name === "photo-atelier.png", "nom modifié malgré l'annulation");
        check(await panel.locator("[data-agent-active-context]").getByText(/Média désigné/).count(), "cible perdue après l'annulation");
      });
      await step("proposition : avant / après, Gratuit — 0 €, aucun devis", async () => {
        await send("Renomme ce fichier en « preuve finale.png »");
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await card.innerText();
        check(/Gratuit — 0 €/.test(txt) && /Avant : photo-atelier\.png/.test(txt) && /Après confirmation : preuve finale\.png/.test(txt), `carte incomplète : ${txt}`);
        check(!/devis|crédit/i.test(txt.replace("Aucun crédit consommé", "")), "la carte parle d'un devis");
        check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SINA" }).count()), "bouton de devis affiché pour un rangement gratuit");
        check(assetRow().name === "photo-atelier.png", "écriture avant l'accord");
        await noOverflow();
        await shot("3-proposition");
      });
      if (desktop) {
        await step("réponse perdue après l'enregistrement : vérification sans deuxième écriture", async () => {
          let lost = false;
          await page.route(`**/api/studio-agent/conversations/${k.cid}`, async (r) => {
            if (!lost && r.request().method() === "POST" && /"confirm-files"/.test(r.request().postData() ?? "")) { lost = true; await r.fetch(); return r.abort("connectionreset"); }
            return r.continue();
          });
          await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
          await card.getByRole("button", { name: "Vérifier l’enregistrement", exact: true }).waitFor();
          await card.getByRole("button", { name: "Réessayer la même confirmation gratuite", exact: true }).waitFor();
          await shot("4-reponse-perdue");
          check(assetRow().name === "preuve finale.png", "le serveur n'a pas enregistré avant la perte de la réponse");
          await card.getByRole("button", { name: "Vérifier l’enregistrement", exact: true }).click();
          await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
          await page.unroute(`**/api/studio-agent/conversations/${k.cid}`);
          const turns = all<{ request_json: string }>("SELECT request_json FROM agent_conversation_turns WHERE conversation_id=?", k.cid).filter((t) => /confirm-files/.test(t.request_json));
          check(turns.length === 1, `${turns.length} confirmations enregistrées`);
          return "1 seule confirmation enregistrée";
        });
      } else {
        await step("confirmation gratuite", async () => {
          await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
          await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        });
      }
      await step("reçu relu, liste Fichiers à jour sans recharger", async () => {
        await shot("5-recu");
        await closeSyna();
        await page.getByText("preuve finale.png", { exact: true }).first().waitFor({ timeout: 10000 });
        check(!(await page.getByText("photo-atelier.png", { exact: true }).count()), "ancien nom encore affiché");
        await noOverflow();
        await shot("6-liste-a-jour");
      });
      await step("rechargement : nom et reçu conservés", async () => {
        await page.reload({ waitUntil: "networkidle" });
        await page.getByText("preuve finale.png", { exact: true }).first().waitFor();
        await openSyna();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        await shot("7-apres-rechargement");
      });
      if (desktop) await step("déplacement vers un dossier existant", async () => {
        await closeSyna();
        await page.getByRole("checkbox", { name: "Sélectionner preuve finale.png", exact: true }).check();
        await send("Déplace ce fichier vers le dossier « Documents validés »");
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await card.innerText();
        check(/Avant : Racine \(aucun dossier\)/.test(txt) && /Après confirmation : Documents validés/.test(txt), `carte de déplacement incomplète : ${txt}`);
        await shot("8-deplacement-proposition");
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        check(assetRow().folder_id === k.folderId, "fichier absent du dossier");
        await closeSyna();
        await page.getByText("Aucun fichier ici", { exact: true }).waitFor({ timeout: 10000 });
        await page.getByRole("button", { name: /Documents validés/ }).first().click();
        await page.getByText("preuve finale.png", { exact: true }).first().waitFor();
        await shot("9-dans-le-dossier");
      });
      await step("fichier intact : octets, version, aucune copie", async () => {
        const a = assetRow();
        check(digest(assetData(a)) === k.bytes, "octets modifiés");
        check(a.version === 1, `version ${a.version}`);
        check(one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id=?", k.pid)!.n === 1, "copie créée");
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
  fs.writeFileSync(path.join(out, "RESUME-FICHIERS-301.json"), JSON.stringify({ schema: "syna301-fichiers-recette-1", results, errors, forbidden, coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log);
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
