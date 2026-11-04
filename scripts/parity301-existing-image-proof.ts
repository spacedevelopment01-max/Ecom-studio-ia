/** Existing project image: actual compiled Studio, natural phrase, real mouse/touch designation, 17s, free confirmation, persisted native result and undo. No supplier. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn,execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
if(!fs.existsSync('.next/BUILD_ID'))throw Error('Build compilé requis');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-image301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "image301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "LOCAL_SITE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-image-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, saveThemeVersion } = await import("../src/lib/projects");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { contextView, submitContext } = await import("../src/lib/orchestrator/conversation/context-session");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const {saveAsset}=await import('../src/lib/library');
const {themeAssetBinary}=await import('../src/lib/theme/compile');
const {libraryLoader}=await import('../src/lib/theme/loader');
const {sectionSchema}=await import('../src/lib/theme/spec');
const sharp=(await import('sharp')).default;
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const ONLY = process.env.RECETTE_CAS; // ex. « encre-telephone » : rejouer un seul cas pour diagnostic
const ALL_CASES: { mode: Mode; format: Format; business: "products" | "services" }[] = [
  { mode: "encre", format: "ordinateur", business: "products" }, { mode: "encre", format: "telephone", business: "services" },
  { mode: "plein", format: "ordinateur", business: "services" }, { mode: "plein", format: "telephone", business: "products" },
];
const CASES = ALL_CASES.filter((k) => !ONLY || `${k.mode}-${k.format}` === ONLY);
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;
const prepared: (typeof CASES[number] & Awaited<ReturnType<typeof localSiteFixture>> & { token:string;source:import('../src/lib/library').Asset;target:{sid:string;key:string} })[] = [];
for (const k of CASES) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => localSiteFixture(k.business));
  const cur=currentTheme(f.pid)!;
  const target=cur.spec.templates.index.order.flatMap(sid=>{const section=cur.spec.templates.index.sections[sid];return(sectionSchema(cur.spec,section.type)?.settings??[]).filter(d=>d.type==='image_picker'&&d.id&&section.settings[d.id+'_asset']&&cur.spec.files[String(section.settings[d.id+'_asset'])]).map(d=>({sid,key:d.id!}));})[0];
  if(!target)throw Error('Image native de fixture absente');
  const source=await saveAsset({projectId:f.pid,userId:f.u.id,name:"photo de l'atelier.png",mime:'image/png',data:await sharp({create:{width:80,height:60,channels:3,background:'#285b46'}}).png().toBuffer(),origin:'upload'});
  const token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  prepared.push({ ...k, ...f, token,source,target });
}

const port = 6300 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = ""; server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: Format; business: string; steps: Step[]; ok: boolean }[] = [];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [];
const check = (c: unknown, m: string) => { if (!c) throw Error(m); };
const spec = (pid: string) => currentTheme(pid)!.spec as unknown as { templates: { index: { order: string[]; sections: Record<string, { type: string; settings: Record<string, unknown> }> } } };

try {
  const start = Date.now();
  for (;;) { if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-800)); try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ } await new Promise((r) => setTimeout(r, 1000)); }
  const b = await chromium.launch({executablePath:process.env.STUDIO_PROOF_CHROMIUM,args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}-${k.business}`, steps: Step[] = [], desktop = k.format === "ordinateur";
    const ctx = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce",...(k.format==='telephone'?{isMobile:true,hasTouch:true}:{}) });
    await ctx.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await ctx.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await ctx.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await ctx.newPage(); page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    // Journal des confirmations gratuites : corps envoyé et réponse exacte du serveur (diagnostic, jamais d'assertion cachée).
    page.on("response", async (r) => { try { if (r.request().method() === "POST" && /\/api\/studio-agent\/conversations\/[^/]+$/.test(new URL(r.url()).pathname)) { const body = r.request().postDataJSON() as { action?: string; proposalId?: string; requestId?: string }; if (body?.action === "confirm-local" || body?.action === "message") { const j = await r.json().catch(() => null) as { localSite?: { state?: string; command?: string; proposalId?: string; version?: { number?: number } }; error?: string } | null; console.log(`    [http] ${label} ${body.action} ${body.proposalId ?? ""} → ${r.status()} ${j?.localSite?.state ?? j?.error ?? ""} ${j?.localSite?.command ?? ""} v${j?.localSite?.version?.number ?? "-"} prop=${j?.localSite?.proposalId ?? ""}`); } } } catch { /* journal seulement */ } });
    const panel = page.locator("#syna-panel:visible"), free = panel.getByRole("region", { name: "Retouche gratuite", exact: true });
    const frame = () => page.frameLocator('iframe[title^="Aperçu"]');
    const shot = async (n: string) => { const file = `${label}-${n}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const d = await fn(); steps.push({ etape, ok: true, ...(d ? { detail: d } : {}) }); console.log(`  ✓ ${label} · ${etape}${d ? " — " + d : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => { for (let i = 0; i < 3 && !(await panel.count()); i++) { await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor({ timeout: 10000 }).catch(() => {}); } await panel.waitFor(); };
    const closeSyna = async () => { if (await panel.count()) await panel.getByRole("button", { name: "Replier SYNA", exact: true }).first().click(); await page.locator("#syna-panel:visible").waitFor({ state: "detached" }).catch(() => {}); };
    const noQuote = async (when: string) => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), `bouton de devis affiché (${when})`);
    const say=async(text:string)=>{await openSyna();await panel.getByRole('textbox',{name:'Décrivez votre projet ou posez votre question à SYNA'}).fill(text);await panel.getByRole('button',{name:'Enregistrer',exact:true}).click();};
    const confirmBtn=()=>free.getByRole('button',{name:'Confirmer la modification gratuite',exact:true});
    const version=()=>currentTheme(k.pid)!.version.number;
    try{
      await step('image désignée dans l’aperçu réel (toucher sur téléphone)',async()=>{
        await page.goto(`${origin}/studio/${k.pid}/boutique`,{waitUntil:'networkidle',timeout:180000});await page.locator('#ecs-splash').waitFor({state:'hidden'}).catch(()=>{});
        const nudge=page.locator('[data-tuto-nudge]');if(await nudge.isVisible())await nudge.locator('button').last().click();await closeSyna();
        const tab=page.getByRole('tab',{name:'Aperçu',exact:true});if(await tab.count())await tab.click();
        const img=frame().locator(`[data-es-section="index:${k.target.sid}"] img`).first();await img.waitFor();await img.scrollIntoViewIfNeeded();
        const tools=page.locator('[data-site-tools]');if(!await tools.getAttribute('open'))await tools.locator(':scope > summary').click();await page.getByRole('button',{name:'Désigner',exact:true}).click();
        const close=page.getByRole('button',{name:'Fermer les outils',exact:true});if(await close.isVisible())await close.click();if(desktop)await img.click();else await img.tap();await panel.waitFor();
        await panel.locator('[data-agent-active-context]').getByText(/désign/i).first().waitFor();
      });
      const before=structuredClone(currentTheme(k.pid)!.spec),v0=version();
      await step('phrase naturelle, avant/après, source existante et annulation sans écriture',async()=>{
        await say("Remplace l'image de cette section par la photo de l'atelier");await confirmBtn().waitFor();await free.getByText('Avant',{exact:true}).waitFor();await free.getByText('Après confirmation',{exact:true}).waitFor();await noQuote('image gratuite');check(version()===v0,'écriture avant accord');
        await free.scrollIntoViewIfNeeded();await shot('2-proposition-image');await free.getByRole('button',{name:'Annuler la modification gratuite',exact:true}).click();await confirmBtn().waitFor({state:'detached'});check(version()===v0,'écriture après annulation');
      });
      await step('nouvel accord après17s, image relue dans la base et réellement chargée dans l’aperçu',async()=>{
        await say("Remplace l'image de cette section par la photo de l'atelier");await confirmBtn().waitFor();const since=Date.now();await page.waitForTimeout(17000);check(Date.now()-since>=17000,'attente réelle');check(await confirmBtn().isEnabled(),'accord disparu après actualisation');await confirmBtn().click();await free.getByText(/Résultat enregistré/).waitFor();check(version()===v0+1,'une version attendue');
        const cur=currentTheme(k.pid)!,filename=String(cur.spec.templates.index.sections[k.target.sid].settings[k.target.key+'_asset']);check(cur.spec.files[filename]===k.source.id,'mauvais média enregistré');
        const expected=structuredClone(before);expected.files[filename]=k.source.id;expected.templates.index.sections[k.target.sid].settings[k.target.key+'_asset']=filename;check(JSON.stringify(cur.spec)===JSON.stringify(expected),'autre champ ou section modifiés');
        const rendered=await themeAssetBinary(cur.spec,filename,libraryLoader);check(!!rendered,"média natif non compilé");const img=frame().locator(`[data-es-section="index:${k.target.sid}"] img`).first();await img.waitFor();let loaded=false;for(let n=0;n<40;n++){const displayed=await img.evaluate((e:HTMLImageElement)=>({src:e.currentSrc||e.src,ready:e.complete&&e.naturalWidth>0}));if(displayed.ready&&displayed.src.startsWith('data:image/')&&Buffer.from(displayed.src.slice(displayed.src.indexOf(',')+1),'base64').equals(rendered!.data)){loaded=true;break;}await page.waitForTimeout(250);}check(loaded,'les octets effectivement chargés dans l’aperçu ne correspondent pas à l’image choisie');await shot('3-image-enregistree');
        await page.reload({waitUntil:'networkidle'});await openSyna();await free.getByText(/Résultat enregistré/).waitFor();check(version()===v0+1,'double écriture au rechargement');
      });
      await step('annulation naturelle avec accord et contenu natif restauré',async()=>{
        await say('Annule la dernière retouche du site');await confirmBtn().waitFor();await confirmBtn().click();await free.getByText(/Résultat enregistré/).waitFor();check(version()===v0+2,'version de restauration');check(JSON.stringify(currentTheme(k.pid)!.spec)===JSON.stringify(before),'contenu non restauré');await shot('4-annulation-image');
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, business: k.business, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await ctx.close();
  }
  await b.close();
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n;
  console.log(`· appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`); if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-IMAGE-301.json"), JSON.stringify({ schema: "syna301-existing-image-compiled-1", sourceCommit:process.env.STUDIO_PROOF_COMMIT??execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),serverMode:"production",buildId:fs.readFileSync(".next/BUILD_ID","utf8").trim(),results, errors, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
