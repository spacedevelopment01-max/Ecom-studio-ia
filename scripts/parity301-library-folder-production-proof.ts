/** #301/#438: production Studio proof for folder-scoped metadata reads and acquired folder rename.
 * Fixtures only; all provider keys blank; local Chromium and next start; snapshots include included quotas.
 * RECETTE_PREPARE=1|0 selects acquired research fixtures. PNG files must remain local.
 * Build the exact source 69b1756f first. Proof commits do not change that application source.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { waitAtLeast } from "./lot9/wait-at-least";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-lot7-301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "lot7-301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "FAL_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "ALIBABA_MODEL_STUDIO_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "THEME_TOOLS", "LOCAL_SITE", "FILES", "SERVICE_PROFILE", "PROMPTS"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-lot7-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, loadProject, saveServices } = await import("../src/lib/projects");
const { saveAsset, getAsset, assetData, createFolder, listFolders } = await import("../src/lib/library");
const { createHash } = await import("node:crypto");
const { emptyServiceProfile } = await import("../src/lib/project-types");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const sharp = (await import("sharp")).default;
const { chromium } = await import("playwright");
const {quotasView}=await import("../src/lib/quotas");
const { prepareProject, realAiCalls, simulatedFixtureCalls, PREPARED } = await import("./syna301-recette-preparee");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const ONLY = process.env.RECETTE_CAS;
const ALL_CASES: { mode: Mode; format: Format; business: "services" | "products" }[] = [
  { mode: "encre", format: "ordinateur", business: "services" }, { mode: "encre", format: "telephone", business: "services" },
  { mode: "plein", format: "ordinateur", business: "services" }, { mode: "plein", format: "telephone", business: "services" },
];
const CASES = ALL_CASES.flatMap(k=>[{...k,business:"services" as const},{...k,business:"products" as const}]).filter((k) => !ONLY || ONLY.split(",").includes(`${k.mode}-${k.format}`));
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;
const prepared: (typeof CASES[number] & Awaited<ReturnType<typeof localSiteFixture>> & { token: string })[] = [];
for (const k of CASES) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => localSiteFixture(k.business));
  prepareProject(f.u as never, f.c.id, f.pid);
  saveServices(f.pid, { ...emptyServiceProfile(), hours: "Lundi 09–17", phone: "04 00 00 00 00", email: "atelier@example.test", area: "Lyon", services: [{ name: "Diagnostic", description: "Examen fourni", price: "50 €", duration: "30 min" }] } as never);
  const token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  // Native billing read initializes included quota rows before the action baseline.
  quotasView(f.u.id);
  prepared.push({ ...k, ...f, token });
}
const financialTables=['ai_calls','agent_conversation_quotes','jobs','ledger','quota_usage','usage_events'];
const existingTables=new Set(all<{name:string}>("SELECT name FROM sqlite_master WHERE type='table'").map(r=>r.name));
const spendRows=()=>Object.fromEntries(financialTables.filter(t=>existingTables.has(t)).map(t=>[t,all('SELECT * FROM '+t+' ORDER BY rowid')]));
const financialBaseline=spendRows(),financialBefore=JSON.stringify(financialBaseline);
const agreementAudit:any[]=[];
const baselineCalls=all<Record<string,unknown>>('SELECT * FROM ai_calls ORDER BY id');
if(!baselineCalls.every(r=>r.provider==='simulated'&&r.requested_model==='fixture'&&String(r.id).startsWith('fixture_research_')))throw Error('Unknown baseline');
const baselineHash=sha256(JSON.stringify(baselineCalls)),baselineIds=new Set(baselineCalls.map(r=>String(r.id)));
let acquiredFixtureCalls:any=null,servedVersion:any=null,observedCalls:number|null=null;const waits:number[]=[];
const photoFile = path.join(dir, "photo-atelier-recette.png");
fs.writeFileSync(photoFile, await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 40, g: 120, b: 90 } } }).png().toBuffer());

const port = 6800 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
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
  execFileSync('git',['diff','--quiet','69b1756f7e6d7c7f10c7d9b8d5540a264315dc55','--','src','theme-base','package.json','package-lock.json','next.config.ts']);
  servedVersion=await(await fetch(origin+'/api/version')).json();check(servedVersion.commit==='69b1756f7e6d7c7f10c7d9b8d5540a264315dc55'&&servedVersion.mode==='production'&&servedVersion.tree==='clean'&&servedVersion.source==='compiled-build','wrong compiled source');
  const b = await chromium.launch({ executablePath:'/usr/bin/chromium',args: ["--no-sandbox", "--disable-background-networking"] });
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
    const say = async (text: string) => { await openSyna(); await box().fill(text); const sent=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/studio-agent/conversations/'+k.c.id);await activate(panel.getByRole('button',{name:'Enregistrer',exact:true}));check((await sent).ok(),'message failed'); };
    const noQuote = async () => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), "bouton de devis affiché");
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "débordement horizontal");
    const goto = async (tab: string) => { await page.goto(`${origin}/studio/${k.pid}/${tab}`, { waitUntil: "networkidle", timeout: 180000 }); await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {}); const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click(); };
    const cur = () => currentTheme(k.pid)!;
    const bodies: Record<string, unknown>[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && /\/api\/studio-agent\/conversations\/[^/]+$/.test(new URL(r.url()).pathname)) { try { bodies.push(r.postDataJSON()); } catch { /* multipart */ } } });
    const activate=async(locator:any)=>{await locator.scrollIntoViewIfNeeded();if(k.format==='telephone')await locator.tap();else await locator.click();};
    const confirm = async (card: ReturnType<typeof panel.getByRole>, receipt: RegExp) => { const elapsed=await waitAtLeast(17000,ms=>page.waitForTimeout(ms));waits.push(elapsed);check(elapsed>=17000,"minimum wait");await activate(card.getByRole("button", { name: "Confirmer gratuitement", exact: true })); await card.getByRole("status").getByText(receipt).waitFor(); };
    try {
      const digest = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
      listFolders(k.pid);
      const folder=createFolder(k.pid,'corbeille',null),child=createFolder(k.pid,'Enfant',folder.id),neighbor=createFolder(k.pid,'Autres',null);
      const a=await saveAsset({projectId:k.pid,userId:k.u.id,name:'vitrine.png',mime:'image/png',data:fs.readFileSync(photoFile),origin:'upload',folderId:folder.id});
      for(const folderId of [child.id,neighbor.id,null])await saveAsset({projectId:k.pid,userId:k.u.id,name:'Hors cible.txt',mime:'text/plain',data:Buffer.from('FICTIF'),origin:'upload',folderId});
      const assetsBefore=all('SELECT * FROM assets WHERE project_id=? ORDER BY id',k.pid),bytes=digest(assetData(getAsset(a.id)!));
      const folderRow=()=>one<any>('SELECT * FROM folders WHERE id=?',folder.id)!;
      const tree=()=>all<any>('SELECT * FROM folders WHERE project_id=? ORDER BY id',k.pid),before=tree();
      const auditId=id();run('CREATE TABLE IF NOT EXISTS proof_folder_writes(id TEXT,folder_id TEXT)');
      run(`CREATE TRIGGER proof_rename_${auditId.replaceAll('-','')} AFTER UPDATE OF name ON folders WHEN NEW.id='${folder.id}' BEGIN INSERT INTO proof_folder_writes VALUES('${auditId}',NEW.id); END`);
      const sourceTheme=JSON.stringify(currentTheme(k.pid));
      let confirmationBodies:any[]=[];
      page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/studio-agent/conversations/'+k.c.id){const body=r.postDataJSON();if(body?.action==='confirm-folder-rename')confirmationBodies.push(body);}});
      const readCard=()=>panel.getByRole('region',{name:'Fichiers du projet — lecture gratuite',exact:true});
      const renameCard=()=>panel.getByRole('region',{name:'Renommer un dossier — gratuit',exact:true});
      await step('Lecture naturelle : dossier cité corbeille, cible exacte visible sans devis ni accord',async()=>{
        await goto('fichiers');check(await page.locator('[data-syna-shell]').first().getAttribute('data-syna-shell')===k.mode,'mode');
        await say('Peux-tu me montrer les fichiers du dossier « corbeille » ?');
        await readCard().getByRole('link',{name:'vitrine.png',exact:true}).waitFor();
        check(await readCard().getByRole('listitem').count()===1,'wrong file count');
        check(!(await readCard().innerText()).includes('Hors cible'),'neighbor leaked');
        check(await readCard().getByRole('button',{name:'Confirmer gratuitement',exact:true}).count()===0,'read asks mutation agreement');
        const dto=await(await ctx.request.get(origin+'/api/studio-agent/conversations/'+k.c.id)).json();
        check(dto.localFiles.readScope.folderId===folder.id&&dto.localFiles.readScope.descendants===false&&dto.localFiles.items[0].id===a.id,'scope DTO');
        check(JSON.stringify(tree())===JSON.stringify(before),'read wrote tree');
        await noQuote();await noOverflow();await shot('1-lecture');
      });
      await step('Renommage : aperçu avant/après puis annulation sans écriture',async()=>{
        await say('Renomme le dossier « corbeille » en « Photos conservées »');await renameCard().getByRole('button',{name:'Confirmer gratuitement',exact:true}).waitFor();
        const text=await renameCard().innerText();check(text.includes('corbeille')&&text.includes('Photos conservées'),'before/after missing');
        check(JSON.stringify(tree())===JSON.stringify(before),'early write');await noQuote();await shot('2-apercu');
        await activate(renameCard().getByRole('button',{name:'Annuler',exact:true}));await renameCard().getByRole('button',{name:'Confirmer gratuitement',exact:true}).waitFor({state:'hidden'});
        check(JSON.stringify(tree())===JSON.stringify(before),'cancel wrote tree');check(all('SELECT * FROM proof_folder_writes WHERE id=?',auditId).length===0,'cancel wrote');await shot('3-annulation');
      });
      await step('17 secondes, actualisation projet, accord ; réponse perdue reprise sans doublon',async()=>{
        await say('Renomme le dossier « corbeille » en « Photos conservées »');await renameCard().getByRole('button',{name:'Confirmer gratuitement',exact:true}).waitFor();
        const elapsed=await waitAtLeast(17000,ms=>page.waitForTimeout(ms));waits.push(elapsed);check(elapsed>=17000,'minimum wait');
        const projectGet=await ctx.request.get(origin+'/api/projects/'+k.pid);check(projectGet.ok(),'project refresh');
        check(JSON.stringify(tree())===JSON.stringify(before),'17s wrote tree');await renameCard().getByRole('button',{name:'Confirmer gratuitement',exact:true}).waitFor();
        if(k.format==='ordinateur'){
          let dropped=false;
          await page.route('**/api/studio-agent/conversations/'+k.c.id,async route=>{const request=route.request();if(request.method()==='POST'&&request.postDataJSON()?.action==='confirm-folder-rename'&&!dropped){dropped=true;const response=await route.fetch();check(response.ok(),'server rejected agreement');await route.abort('failed');return;}await route.continue();});
          await activate(renameCard().getByRole('button',{name:'Confirmer gratuitement',exact:true}));
          await renameCard().getByRole('button',{name:'Réessayer la même confirmation gratuite',exact:true}).waitFor();
          check(folderRow().name==='Photos conservées','lost response not committed');
          await shot('4-reponse-perdue');await activate(renameCard().getByRole('button',{name:'Réessayer la même confirmation gratuite',exact:true}));
          await renameCard().getByRole('status').getByText(/Enregistré et relu · reçu/).waitFor();
          check(dropped&&confirmationBodies.length===2&&JSON.stringify(confirmationBodies[0])===JSON.stringify(confirmationBodies[1]),'retry not identical');
        }else{
          await activate(renameCard().getByRole('button',{name:'Confirmer gratuitement',exact:true}));await renameCard().getByRole('status').getByText(/Enregistré et relu · reçu/).waitFor();check(confirmationBodies.length===1,'extra POST');
        }
        check(all('SELECT * FROM proof_folder_writes WHERE id=?',auditId).length===1,'not exactly one native write');
        check(JSON.stringify(tree())===JSON.stringify(before.map(r=>r.id===folder.id?{...r,name:'Photos conservées'}:r)),'unexpected tree mutation');
        check(JSON.stringify(all('SELECT * FROM assets WHERE project_id=? ORDER BY id',k.pid))===JSON.stringify(assetsBefore)&&digest(assetData(getAsset(a.id)!))===bytes,'acquired asset mutated');
        check(JSON.stringify(currentTheme(k.pid))===sourceTheme,'theme changed');
        agreementAudit.push({case:label,prepared:PREPARED,nativeWrites:all('SELECT * FROM proof_folder_writes WHERE id=?',auditId).length,confirmationPosts:confirmationBodies.length,identicalReplay:confirmationBodies.length===2?JSON.stringify(confirmationBodies[0])===JSON.stringify(confirmationBodies[1]):null,requestIds:confirmationBodies.map(b=>b.requestId)});
        await noQuote();await shot('5-recu');
      });
      await step('Résultat natif visible après reçu et rechargement, nouvelle lecture exacte',async()=>{
        await page.reload({waitUntil:'networkidle'});await openSyna();await renameCard().getByRole('status').getByText(/Enregistré et relu · reçu/).waitFor();
        const native=await(await ctx.request.get(origin+'/api/projects/'+k.pid+'/files?folder=root')).json();check(native.folders.some((f:any)=>f.id===folder.id&&f.name==='Photos conservées'),'native result absent');
        // The native folder button must actually display the stored name; DTO-only proof is insufficient.
        check((await page.locator('main').innerText()).includes('Photos conservées'),'native screen missing result');await shot('6-resultat-natif');
        await say('Montre les fichiers du dossier « Photos conservées »');await readCard().getByRole('link',{name:'vitrine.png',exact:true}).waitFor();
        check(await readCard().getByRole('listitem').count()===1,'new read wrong target');check(all('SELECT * FROM proof_folder_writes WHERE id=?',auditId).length===1,'reload doubled write');await noQuote();await noOverflow();await shot('7-relecture');
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, business: k.business, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await ctx.close();
  }
  await b.close();
  const after=all<Record<string,unknown>>('SELECT * FROM ai_calls ORDER BY id'),retained=after.filter(r=>baselineIds.has(String(r.id))),calls=after.filter(r=>!baselineIds.has(String(r.id))).length;observedCalls=calls;acquiredFixtureCalls={before:baselineCalls.length,after:after.length,unchanged:sha256(JSON.stringify(retained))===baselineHash,newCalls:calls};if(JSON.stringify(spendRows())!==financialBefore)errors.push('financial tables changed');
  if(!acquiredFixtureCalls.unchanged)errors.push('baseline changed');
  console.log(`· projet ${PREPARED ? "PRÉPARÉ" : "neuf"} · lignes simulées : ${simulatedFixtureCalls()} · appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`); if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-LECTURE-DOSSIER-301.json"), JSON.stringify({ schema: "syna301-folder-read-production-1", prepared:PREPARED,results, errors, constats, forbidden: [...new Set(forbidden)], coutIA: observedCalls,financialUnchanged:JSON.stringify(spendRows())===financialBefore,financialAudit:{before:financialBaseline,after:spendRows(),changedTables:Object.keys(financialBaseline).filter(t=>JSON.stringify(financialBaseline[t])!==JSON.stringify(spendRows()[t]))},agreementAudit,servedVersion,acquiredFixtureCalls,waits,jsErrors,buildId:fs.readFileSync(".next/BUILD_ID","utf8").trim() }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  // Keep isolated fictional DB available for audit; no client data.
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`); if (constats.length) console.log("Constats :\n" + constats.join("\n"));
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
