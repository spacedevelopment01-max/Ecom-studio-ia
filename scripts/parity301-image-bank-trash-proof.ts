/** Independent production proof on #413/3b54dfbe: four prepared native Images journeys.
 * Native trash, bank-role filtering, exact image request, before/after, cancellation, agreement≥17s,
 * receipt/reload and pixels loaded from the restored acquired file; zero new provider calls.
 * Import paths adjusted from the ignored .next runner; executed behavior preserved. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { waitAtLeast } from "./lot9/wait-at-least";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-corbeille301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "corbeille301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "FAL_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "ALIBABA_MODEL_STUDIO_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "THEME_TOOLS", "LOCAL_SITE", "FILES", "SERVICE_PROFILE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-corbeille-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, loadProject, saveServices } = await import("../src/lib/projects");
const { saveAsset, getAsset, assetData } = await import("../src/lib/library");
const { createHash } = await import("node:crypto");
const { emptyServiceProfile } = await import("../src/lib/project-types");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const sharp = (await import("sharp")).default;
const { stateOf } = await import("../src/lib/preparation/store");
const { emptySpend } = await import("../tests/conversation209-fixtures");
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
const baselineCalls=all<Record<string,unknown>>('SELECT * FROM ai_calls ORDER BY id');
if(!baselineCalls.every(r=>r.provider==='simulated'&&r.requested_model==='fixture'&&String(r.id).startsWith('fixture_research_')))throw Error('Unknown baseline');
const baselineHash=sha256(JSON.stringify(baselineCalls)),baselineIds=new Set(baselineCalls.map(r=>String(r.id))),spendBefore=emptySpend();
let acquiredFixtureCalls:any=null,servedVersion:any=null,observedCalls:number|null=null;const waits:number[]=[];
const photoFile = path.join(dir, "photo-atelier-recette.png");
fs.writeFileSync(photoFile, await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 40, g: 120, b: 90 } } }).png().toBuffer());

const port = 6700 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
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
  servedVersion=await(await fetch(origin+'/api/version')).json();check(servedVersion.commit===execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()&&servedVersion.mode==='production'&&servedVersion.tree==='clean'&&servedVersion.source==='compiled-build','wrong compiled source');
  const b = await chromium.launch({ executablePath:'/usr/bin/chromium',args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}-${k.business}`, steps: Step[] = [];
    const ctx = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce", ...(k.format === "telephone" ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await ctx.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await ctx.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await ctx.newPage(); page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const activate=async(locator:any)=>{await locator.scrollIntoViewIfNeeded();if(k.format==='telephone')await locator.tap();else await locator.click();};
    const panel = page.locator("#syna-panel:visible");
    const shot = async (n: string) => { const file = `${label}-${n}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const d = await fn(); steps.push({ etape, ok: true, ...(d ? { detail: d } : {}) }); console.log(`  ✓ ${label} · ${etape}${d ? " — " + d : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => { for (let i = 0; i < 3 && !(await panel.count()); i++) { await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor({ timeout: 10000 }).catch(() => {}); } await panel.waitFor(); };
    const box = () => panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SINA" });
    const say = async (text: string) => { await openSyna(); await box().fill(text); const response=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/studio-agent/conversations/'+k.c.id);await activate(panel.getByRole('button',{name:'Enregistrer',exact:true}));check((await response).ok(),'message failed'); };
    const noQuote = async () => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SINA" }).count()), "bouton de devis affiché");
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "débordement horizontal");
    const goto = async (tab: string) => { await page.goto(`${origin}/studio/${k.pid}/${tab}`, { waitUntil: "networkidle", timeout: 180000 }); await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {}); const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click(); };
    const cur = () => currentTheme(k.pid)!;
    const bodies: Record<string, unknown>[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && /\/api\/studio-agent\/conversations\/[^/]+$/.test(new URL(r.url()).pathname)) { try { bodies.push(r.postDataJSON()); } catch { /* multipart */ } } });
    const confirm = async (card: ReturnType<typeof panel.getByRole>, receipt: RegExp) => { const elapsed=await waitAtLeast(17000,ms=>page.waitForTimeout(ms));waits.push(elapsed);check(elapsed>=17000,'minimum wait');await activate(card.getByRole('button',{name:'Confirmer gratuitement',exact:true})); await card.getByRole("status").getByText(receipt).waitFor(); };
    try {
      const digest = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
      const a=await saveAsset({projectId:k.pid,userId:k.u.id,name:'Photo acquise.png',mime:'image/png',data:fs.readFileSync(photoFile),origin:'upload',role:'original'}),doc=await saveAsset({projectId:k.pid,userId:k.u.id,name:'Document conservé.txt',mime:'text/plain',data:Buffer.from('FICTIF'),origin:'upload',role:'original'}),ad=await saveAsset({projectId:k.pid,userId:k.u.id,name:'Publicité acquise.png',mime:'image/png',data:fs.readFileSync(photoFile),origin:'upload',role:'ad'}),logo=await saveAsset({projectId:k.pid,userId:k.u.id,name:'Logo acquis.png',mime:'image/png',data:fs.readFileSync(photoFile),origin:'upload',role:'logo'});
      const bytes=digest(assetData(a)),version=a.version,preparation=JSON.stringify(stateOf(k.pid)),theme=JSON.stringify(currentTheme(k.pid));let assets:any[]=[];
      const card=panel.getByRole('region',{name:'Corbeille — gratuit',exact:true});
      await step('Images : mise en corbeille native de la photo et autres acquis, sans génération',async()=>{
        await goto('images');check(await page.locator('[data-syna-shell]').first().getAttribute('data-syna-shell')===k.mode,'mode');
        for(const asset of [a,doc,ad,logo]){const status=await page.evaluate(async id=>(await fetch(`/api/files/${id}`,{method:'DELETE'})).status,asset.id);check(status===200&&getAsset(asset.id)!.deleted_at,'native trash failed');}
        assets=all('SELECT * FROM assets WHERE project_id=? ORDER BY id',k.pid);await noOverflow();
      });
      await step('Montre la corbeille : Banque Images seule, autres domaines exclus, aucun accord sur la liste',async()=>{
        await say('Montre la corbeille');const list=card.getByRole('list',{name:'Fichiers de la corbeille',exact:true});await list.waitFor();await list.getByText(a.name,{exact:true}).waitFor();check(!(await list.innerText()).includes(doc.name)&&!(await list.innerText()).includes(ad.name)&&!(await list.innerText()).includes(logo.name),'foreign media domain in bank');check(/Banque Images/.test(await card.innerText()),'scope not announced');check(await card.getByRole('button',{name:'Confirmer gratuitement',exact:true}).count()===0,'agreement on read');await noQuote();await shot('1-corbeille-images');
      });
      await step('Suggestion ID natif puis phrase interrogative image : aperçu, annulation et nouvel accord≥17s',async()=>{
        await activate(card.getByRole('button',{name:'Restaurer '+a.name,exact:true}));check(await box().inputValue()===`Restaure le fichier « ${a.id} » de la corbeille`,'native suggestion identity');const phrase=`Peux-tu restaurer l’image « ${a.id} » de la corbeille ?`;
        await say(phrase);await card.getByRole('button',{name:'Confirmer gratuitement',exact:true}).waitFor();check(getAsset(a.id)!.deleted_at,'early restore');check(/Dans la corbeille/.test(await card.innerText())&&/Après confirmation/.test(await card.innerText()),'before/after missing');await shot('2-proposition');
        await activate(card.getByRole('button',{name:'Annuler',exact:true}));await card.getByRole('button',{name:'Confirmer gratuitement',exact:true}).waitFor({state:'hidden'});check(getAsset(a.id)!.deleted_at,'cancel restored');await say(phrase);await card.getByRole('button',{name:'Confirmer gratuitement',exact:true}).waitFor();await noQuote();await confirm(card,/Enregistré et relu · reçu/);
        const read=getAsset(a.id)!;check(read.deleted_at===null&&read.version===version&&digest(assetData(read))===bytes,'native restore mismatch');check(JSON.stringify(all('SELECT * FROM assets WHERE project_id=? ORDER BY id',k.pid))===JSON.stringify(assets.map(r=>r.id===a.id?{...r,deleted_at:null}:r)),'other acquired metadata changed');check(await card.getByRole('link',{name:'Voir dans Fichiers',exact:true}).getAttribute('href')===`/studio/${k.pid}/images`,'wrong native result route');await shot('3-recu');
      });
      await step('Rechargement, reçu et vraie image dans la Banque native ; Préparation et octets conservés',async()=>{
        const before=JSON.stringify(getAsset(a.id));await page.reload({waitUntil:'networkidle'});await openSyna();await card.getByRole('status').getByText(/Enregistré et relu · reçu/).waitFor();check(JSON.stringify(getAsset(a.id))===before,'write on reload');const native=await ctx.request.get(origin+'/api/projects/'+k.pid+'/files?kind=image');check(native.ok(),'native gallery GET');check((await native.json()).assets.some((r:any)=>r.id===a.id),'restored native asset missing');
        const file=await ctx.request.get(origin+'/api/files/'+a.id);check(file.ok()&&digest(await file.body())===bytes,'restored file bytes');check(JSON.stringify(stateOf(k.pid))===preparation&&JSON.stringify(currentTheme(k.pid))===theme,'acquired project changed');
        await activate(panel.getByRole('button',{name:'Replier SINA',exact:true}).first());await panel.waitFor({state:'hidden'});const image=page.getByRole('img',{name:a.name,exact:true});await image.scrollIntoViewIfNeeded();await image.waitFor({state:'visible'});await page.waitForFunction(name=>Array.from(document.images).some(i=>i.alt===name&&i.complete&&i.naturalWidth>0),a.name);await noOverflow();await shot('4-banque-native');
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, business: k.business, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await ctx.close();
  }
  await b.close();
  const after=all<Record<string,unknown>>('SELECT * FROM ai_calls ORDER BY id'),retained=after.filter(r=>baselineIds.has(String(r.id))),calls=after.filter(r=>!baselineIds.has(String(r.id))).length;observedCalls=calls;acquiredFixtureCalls={before:baselineCalls.length,after:after.length,unchanged:sha256(JSON.stringify(retained))===baselineHash,newCalls:calls};if(!acquiredFixtureCalls.unchanged)errors.push('baseline changed');if(JSON.stringify(emptySpend())!==JSON.stringify(spendBefore))errors.push('spend changed');if(all('SELECT id FROM jobs').length)errors.push('job created');
  console.log(`· projet ${PREPARED ? "PRÉPARÉ" : "neuf"} · lignes simulées : ${simulatedFixtureCalls()} · appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`); if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-CORBEILLE-IMAGES-301.json"), JSON.stringify({ schema: "syna301-corbeille-recette-1", results, errors, constats, forbidden: [...new Set(forbidden)], coutIA: observedCalls,servedVersion,acquiredFixtureCalls,waits,jsErrors,fixtureDataDir:dir,buildId:fs.readFileSync(".next/BUILD_ID","utf8").trim() }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  // Retain isolated fictional fixture for audit.
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`); if (constats.length) console.log("Constats :\n" + constats.join("\n"));
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
