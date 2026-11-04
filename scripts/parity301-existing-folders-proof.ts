/** Independent production A1 proof: products/services × Encre/Plein × desktop/touch.
 * Exact native file rename, folder rename/move, cancellation and three agreements≥17s per case.
 * Executed on #410/1c6ece6b, no Preparation created, native business/theme/history/bytes unchanged.
 * Usage: RECETTE_A1_DOSSIERS=1 npx tsx scripts/parity301-existing-folders-proof.ts <output>.
 * Import path adjusted from the ignored .next runner; executed behavior preserved. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { waitAtLeast } from "./lot9/wait-at-least";
import { randomUUID } from "node:crypto";

if(fs.existsSync(".env")||fs.existsSync(".env.local"))throw Error("Unexpected env file");
if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-a1-301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "a1-301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "FAL_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "ALIBABA_MODEL_STUDIO_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "LOCAL_SITE", "FILES", "EXISTING_LOCAL", ...(process.env.RECETTE_A1_DOSSIERS === "1" ? ["EXISTING_FOLDER_RENAME", "EXISTING_FOLDER_MOVE"] : [])].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-anciens-projets-301");
fs.mkdirSync(out, { recursive: true });

const { historicalProject } = await import("../tests/conversation284-fixtures");
const { openProjectConversation } = await import("../src/lib/orchestrator/conversation");
const { getAsset, createFolder, listFolders, assetData } = await import("../src/lib/library");
const { stateOf } = await import("../src/lib/preparation/store");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { currentTheme } = await import("../src/lib/projects");
const { emptySpend } = await import("../tests/conversation209-fixtures");
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const CASES=( ["products","services"] as const).flatMap(business=>([{mode:"encre",format:"ordinateur"},{mode:"encre",format:"telephone"},{mode:"plein",format:"ordinateur"},{mode:"plein",format:"telephone"}] as const).map(k=>({...k,business})));
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;

const prepared: (typeof CASES[number] & { pid: string; token: string; assetId: string; name: string; folderId: string; archivesId: string;cid:string })[] = [];
for (const k of CASES) {
  const f = await historicalProject(k.business);
  const conversation=openProjectConversation(f.u, f.pid);
  const a = one<{ id: string; name: string }>("SELECT id, name FROM assets WHERE project_id=? AND user_id=? AND deleted_at IS NULL AND status!='rejected' AND COALESCE(role,'')!='theme-render-capture' AND folder_id IS NULL LIMIT 1", f.pid, f.u.id);
  if (!a) throw Error("aucun fichier à la racine du projet historique");
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  const photos = createFolder(f.pid, "Photos", null), archives = createFolder(f.pid, "Archives", null);
  listFolders(f.pid);
  prepared.push({ ...k,cid:conversation.id, pid: f.pid, token, assetId: a.id, name: a.name, folderId: photos.id, archivesId: archives.id });
}

const baselineCalls=all<Record<string,unknown>>('SELECT * FROM ai_calls ORDER BY id'),baselineHash=sha256(JSON.stringify(baselineCalls)),spendBefore=emptySpend();
checkBaseline();function checkBaseline(){if(baselineCalls.length!==0)throw Error('Unexpected A1 AI baseline');}
const snapshots=new Map(prepared.map(k=>[k.pid,{assets:all<any>('SELECT * FROM assets WHERE project_id=? ORDER BY id',k.pid),folders:all<any>('SELECT * FROM folders WHERE project_id=? ORDER BY id',k.pid),project:one('SELECT product_json,business_json,brand_json,settings_json,current_theme_version_id FROM projects WHERE id=?',k.pid),theme:currentTheme(k.pid),shop:all('SELECT * FROM chat_messages WHERE project_id=? ORDER BY id',k.pid),bytes:sha256(assetData(getAsset(k.assetId)!))}]));
let servedVersion:any=null,acquiredFixtureCalls:any=null;const waits:number[]=[];
const port = 6000 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = "";
server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: Format;business:string; steps: Step[]; ok: boolean }[] = [];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [];
const check = (cond: unknown, message: string) => { if (!cond) throw Error(message); };

try {
  const start = Date.now();
  for (;;) { if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-1200)); try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ } await new Promise((r) => setTimeout(r, 1000)); }
  servedVersion=await(await fetch(origin+'/api/version')).json();check(servedVersion.commit===execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()&&servedVersion.mode==='production'&&servedVersion.tree==='clean'&&servedVersion.source==='compiled-build','wrong compiled source');
  const b = await chromium.launch({ executablePath:'/usr/bin/chromium',args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.business}-${k.mode}-${k.format}`, steps: Step[] = [], newName = `archive relue ${k.mode} ${k.format}.png`;
    const context = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce",...(k.format==='telephone'?{hasTouch:true,isMobile:true}:{}) });
    await context.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await context.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await context.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await context.newPage();
    page.setDefaultTimeout(150000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const activate=async(locator:any)=>{await locator.scrollIntoViewIfNeeded();if(k.format==='telephone')await locator.tap();else await locator.click();};
    const pause=async()=>{const elapsed=await waitAtLeast(17000,ms=>page.waitForTimeout(ms));waits.push(elapsed);check(elapsed>=17000,'minimum wait');};
    const panel = page.locator("#syna-panel:visible"), card = panel.getByRole("region", { name: "Rangement gratuit du fichier", exact: true });
    const shot = async (name: string) => { const file = `${label}-${name}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const detail = await fn(); steps.push({ etape, ok: true, ...(detail ? { detail } : {}) }); console.log(`  ✓ ${label} · ${etape}${detail ? " — " + detail : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    // Après un rechargement, un clic arrivé avant l'hydratation est perdu : nouvel essai (3 au plus), jamais de faux succès.
    const openSyna = async () => { for (let i = 0; i < 3 && !(await panel.count()); i++) { await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor({ timeout: 10000 }).catch(() => {}); } await panel.waitFor(); };
    const closeSyna = async () => { if (await panel.count()) await panel.getByRole("button", { name: "Replier SYNA", exact: true }).first().click(); await page.locator("#syna-panel:visible").waitFor({ state: "detached" }).catch(() => {}); };
    const send = async (text: string) => { await openSyna(); await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" }).fill(text); const response=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/studio-agent/conversations/'+k.cid);await activate(panel.getByRole('button',{name:'Enregistrer',exact:true}));check((await response).ok(),'message failed'); };
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
        const selected=page.getByRole('checkbox',{name:`Sélectionner ${k.name}`,exact:true});if(k.format==='telephone')await activate(selected);else await selected.check();
        await send(`Renomme ce fichier en « ${newName} »`);
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        check(getAsset(k.assetId)!.name === k.name, "écriture avant l'accord");
        await shot("2-proposition");
      });
      await step("confirmation : reçu relu, nom écrit, liste à jour, projet toujours en lecture seule", async () => {
        await pause();check(getAsset(k.assetId)!.name===k.name,'write during17s');await activate(card.getByRole('button',{name:'Confirmer gratuitement',exact:true}));
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        check(getAsset(k.assetId)!.name === newName, `nom ${getAsset(k.assetId)!.name}`);
        check(!stateOf(k.pid), "une Préparation a été créée");
        await closeSyna();
        await page.getByText(newName, { exact: true }).first().waitFor({ timeout: 10000 });
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "débordement horizontal");
        await shot("3-recu-liste");
      });
      await step("rechargement : reçu conservé", async () => { await page.reload({ waitUntil: "networkidle" }); await openSyna(); await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor(); await shot("4-apres-rechargement"); });
      if (process.env.RECETTE_A1_DOSSIERS === "1") {
        const folderRow = () => one<{ id: string; name: string; parent_id: string | null }>("SELECT id,name,parent_id FROM folders WHERE id=?", k.folderId)!;
        for (const [titre, phrase, region, verifie] of [
          ["A1 : « Renomme le dossier Photos en Photos clients » → accord → nom relu", "Renomme le dossier Photos en Photos clients", "Renommer un dossier — gratuit", () => folderRow().name === "Photos clients" && folderRow().parent_id === null],
          ["A1 : « Déplace le dossier Photos clients dans le dossier Archives » → accord → parent relu", "Déplace le dossier Photos clients dans le dossier Archives", "Déplacer un dossier — gratuit", () => folderRow().parent_id === k.archivesId && folderRow().name === "Photos clients"],
        ] as const) await step(titre, async () => {
          const c = panel.getByRole("region", { name: region, exact: true }), before = JSON.stringify(folderRow());
          await send(phrase); await c.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
          check(JSON.stringify(folderRow()) === before, "écriture avant l'accord");
          await activate(c.getByRole('button',{name:'Annuler',exact:true}));await c.getByRole('button',{name:'Confirmer gratuitement',exact:true}).waitFor({state:'hidden'});check(JSON.stringify(folderRow())===before,'cancel wrote');await send(phrase);await c.getByRole('button',{name:'Confirmer gratuitement',exact:true}).waitFor();await pause();check(JSON.stringify(folderRow())===before,'write during17s');await activate(c.getByRole('button',{name:'Confirmer gratuitement',exact:true})); await c.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
          check(verifie(), `relu : ${JSON.stringify(folderRow())}`); check(!stateOf(k.pid), "une Préparation a été créée");
        });
      }
      await step('Rechargement final : accord dossier, A1 et données natives exactes',async()=>{
        await page.reload({waitUntil:'networkidle'});await openSyna();const move=panel.getByRole('region',{name:'Déplacer un dossier — gratuit',exact:true});await move.getByRole('status').getByText(/Enregistré et relu · reçu/).waitFor();await panel.getByText(/lecture seule/i).first().waitFor();
        const response=await context.request.get(origin+'/api/studio-agent/conversations/'+k.cid);check(response.ok(),'thread GET');const view=await response.json();check(view.recovery.state==='read-only'&&view.projectRevision===null&&view.recovery.actionsEnabled===false&&view.recovery.aiEnabled===false&&!stateOf(k.pid),'A1 scope changed');
        const before=snapshots.get(k.pid)!;check(JSON.stringify(all('SELECT * FROM assets WHERE project_id=? ORDER BY id',k.pid))===JSON.stringify(before.assets.map(a=>a.id===k.assetId?{...a,name:newName}:a)),'unexpected asset mutation');
        check(sha256(assetData(getAsset(k.assetId)!))===before.bytes,'acquired bytes changed');check(JSON.stringify(all('SELECT * FROM folders WHERE project_id=? ORDER BY id',k.pid))===JSON.stringify(before.folders.map(r=>r.id===k.folderId?{...r,name:'Photos clients',parent_id:k.archivesId}:r)),'unexpected folder mutation');
        check(JSON.stringify(one('SELECT product_json,business_json,brand_json,settings_json,current_theme_version_id FROM projects WHERE id=?',k.pid))===JSON.stringify(before.project),'business project changed');check(JSON.stringify(currentTheme(k.pid))===JSON.stringify(before.theme),'theme changed');check(JSON.stringify(all('SELECT * FROM chat_messages WHERE project_id=? ORDER BY id',k.pid))===JSON.stringify(before.shop),'shop history changed');await shot('5-dossier-recharge');
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format,business:k.business, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await context.close();
  }
  await b.close();
  const calls=all('SELECT * FROM ai_calls ORDER BY id').length;acquiredFixtureCalls={before:baselineCalls.length,after:calls,unchanged:sha256(JSON.stringify(all('SELECT * FROM ai_calls ORDER BY id')))===baselineHash,newCalls:calls-baselineCalls.length};check(acquiredFixtureCalls.unchanged,'AI baseline changed');check(JSON.stringify(emptySpend())===JSON.stringify(spendBefore),'spend changed');
  console.log(`· appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`);
  if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-ANCIENS-PROJETS-301.json"), JSON.stringify({ schema: "syna301-anciens-projets-recette-1", results, errors, forbidden: [...new Set(forbidden)], coutIA: acquiredFixtureCalls?.newCalls??null,servedVersion,acquiredFixtureCalls,waits,jsErrors,fixtureDataDir:dir,buildId:fs.readFileSync(".next/BUILD_ID","utf8").trim() }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  // Retain the isolated fictional fixture for audit.
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
