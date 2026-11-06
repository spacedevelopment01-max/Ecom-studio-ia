/**
 * Recette #301 « SINA complète » — stock d'un produit en phrase naturelle (contrat #373 de Codex), dans la
 * conversation SINA de l'écran Catalogue, Encre / Plein cadre, 1440 / 390 px. Phrases d'origine, rien d'aménagé :
 *  Catalogue : « Désigner pour SINA » sur la fiche → « Mets le stock de cette variante à 12 » → carte Gratuit — 0 €, 2 → 12 →
 *  confirmation → stock relu, prix / référence / politique inchangés, Catalogue à jour ; rechargement sans écriture.
 * Projets préparés fictifs ; baseline acquise simulée intégralement vérifiée, aucune nouvelle tentative IA. Réseau hors boucle locale refusé.
 * Usage : npx tsx scripts/parity301-prepared-stock-proof.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { waitAtLeast } from "./lot9/wait-at-least";
import { spawn,execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-stock301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "stock301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "CATALOGUE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-stock-301");
fs.mkdirSync(out, { recursive: true });

const { account, project } = await import("../tests/conversation209-fixtures");
const { openProjectConversation } = await import("../src/lib/orchestrator/conversation");
const { createProduct, getProduct } = await import("../src/lib/products/catalog");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { seedSourcedAnglesForTest } = await import("../tests/sourced-strategy-fixture");
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
type Format = { name: "ordinateur" | "telephone"; width: number; height: number };
const FORMATS: Format[] = [{ name: "ordinateur", width: 1440, height: 1000 }, { name: "telephone", width: 390, height: 844 }];
const cases: { mode: Mode; format: Format; pid: string; cid: string; token: string }[] = [];
for (const mode of ["encre", "plein"] as Mode[]) for (const format of FORMATS) {
  const u = await account(), pid = project(u), c = openProjectConversation(u, pid);
  seedSourcedAnglesForTest(pid);
  const prod = createProduct(pid, { title: "Capteur fictif", price: 1200, options:[{name:"Couleur",values:["Rouge","Bleu"]},{name:"Taille",values:["M"]}], variants: [{ options:["Rouge","M"], sku:"ROUGE-M", stock:2, stockPolicy:"deny",price:1400 },{options:["Bleu","M"],sku:"BLEU-M",stock:8,stockPolicy:"continue",price:1700}] } as never);
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), u.id, now() + 3600000, now());
  writeSynaPrefs(u.id, "account", null, { mode, panel: "collapsed" });
  cases.push({ mode, format, pid, cid: c.id, token, productId: prod.id,variantId:prod.variants.find(v=>v.sku==="ROUGE-M")!.id } as never);
}

const baselineCalls=all<Record<string,unknown>>('SELECT * FROM ai_calls ORDER BY id');
if(!baselineCalls.every(r=>r.provider==='simulated'&&r.requested_model==='fixture'&&String(r.id).startsWith('fixture_research_')))throw Error('Baseline inconnue');
const baselineIds=new Set(baselineCalls.map(r=>String(r.id))),baselineHash=sha256(JSON.stringify(baselineCalls));
let acquiredFixtureCalls:unknown=null;
const port = 5450 + Math.floor(Math.random() * 150), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], {
  env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` },
  stdio: ["ignore", "pipe", "pipe"], detached: true,
});
let log = "";
server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* déjà arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: string; steps: Step[]; ok: boolean }[] = [];
let observedCalls:number|null=null,servedVersion:any=null,browserVersion="not_started";const waits:number[]=[];const selections:unknown[]=[];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [];
const check = (cond: unknown, message: string) => { if (!cond) throw Error(message); };

try {
  const start = Date.now();
  for (;;) {
    if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-1200));
    try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  servedVersion=await(await fetch(origin+'/api/version')).json();const expected=process.env.STUDIO_PROOF_COMMIT??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();check(servedVersion.commit===expected&&servedVersion.commitOrigin==='build'&&servedVersion.mode==='production'&&servedVersion.tree==='clean'&&servedVersion.source==='compiled-build','mauvaise application compilée');
  const b = await chromium.launch({executablePath:process.env.STUDIO_PROOF_CHROMIUM??'/usr/bin/chromium', args: ["--no-sandbox", "--disable-background-networking"] });
  browserVersion=b.version();
  for (const k of cases) {
    const label = `${k.mode}-${k.format.name}`, steps: Step[] = [];
    const context = await b.newContext({ viewport: { width: k.format.width, height: k.format.height }, locale: "fr-FR",...(k.format.name==="telephone"?{isMobile:true,hasTouch:true,deviceScaleFactor:1}:{}), reducedMotion: "reduce" });
    await context.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; });
    await context.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await context.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const panel = page.locator("#syna-panel:visible");
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
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "débordement horizontal");
    const desktop = k.format.name === "ordinateur";
    const kk = k as unknown as { productId: string;variantId:string };
    const card = panel.getByRole("region", { name: "Stock — gratuit", exact: true });
    const stock=()=>getProduct(k.pid,kk.productId);
    const selected=()=>stock().variants.find(v=>v.id===kk.variantId)!;
    const turns = () => all<{ request_json: string }>("SELECT request_json FROM agent_conversation_turns WHERE conversation_id=?", k.cid).filter((t) => /confirm-stock/.test(t.request_json)).length;
    const noQuote = async () => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SINA" }).count()), "bouton de devis affiché");
    try {
      await step("Catalogue ouvert dans le mode du compte, produit désigné (« Désigner pour SINA »)", async () => {
        await page.goto(`${origin}/studio/${k.pid}/catalogue`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {});
        const response=await context.request.get(`${origin}/api/studio-agent/conversations/${k.cid}`);check(response.ok(),'vue préparée');const view=await response.json();check(view.localEditsWritable===true&&/préparation engagée/.test(view.readOnlyReason??''),'permission native ou verrou fiche perdu');
        const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click();
        check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        const productButton=page.getByRole("button",{name:"Désigner pour SINA",exact:true}).first();if(desktop)await productButton.click();else await productButton.tap();
        await panel.waitFor();await panel.getByText('Catalogue de ce projet',{exact:true}).click();await panel.getByText('Choisir une variante précise',{exact:true}).click();const variant=panel.getByRole('button',{name:/Rouge \/ M.*ROUGE-M/});await variant.waitFor();if(desktop)await variant.click();else await variant.tap();await panel.locator("[data-agent-active-context]").getByText(/désign/i).first().waitFor();
        await noOverflow(); await shot("1-designe");
        return (await panel.locator("[data-agent-active-context]").innerText()).split("\n").find((l) => /désign/i.test(l))?.trim();
      });
      await step("« Mets le stock de cette variante à 12 » → Gratuit — 0 €, 2 → 12, aucun devis, rien d'écrit", async () => {
        await send("Mets le stock de cette variante à 12");
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await card.innerText(); check(/Gratuit — 0 €/.test(txt) && /2 en stock/.test(txt) && /12 en stock/.test(txt) && /Capteur fictif/.test(txt), `carte : ${txt}`);
        await noQuote(); check(selected().stock===2,'écriture avant accord');const request=all<{request_json:string}>('SELECT request_json FROM agent_conversation_turns WHERE conversation_id=? ORDER BY revision DESC',k.cid).map(r=>JSON.parse(r.request_json)).find(r=>r.action==='message');check(request?.context?.target?.kind==='catalogue-variant'&&request.context.target.variantId===kk.variantId,'variante désignée par interface non transmise');selections.push({mode:k.mode,format:k.format.name,target:request.context.target}); await noOverflow(); await shot("2-proposition");
      });
      await step('annulation sans écriture puis nouvelle proposition de la même variante',async()=>{const before=stock();await card.getByRole('button',{name:'Annuler',exact:true}).click();await card.waitFor({state:'hidden'});check(JSON.stringify(stock())===JSON.stringify(before),'écriture après annulation');await send('Mets le stock de cette variante à 12');await card.getByRole('button',{name:'Confirmer gratuitement',exact:true}).waitFor();});
      await step("confirmation → reçu, stock relu à 12 ; prix, référence et politique inchangés ; Catalogue à jour", async () => {
        const before = stock(), n = turns();const elapsed=await waitAtLeast(17000,ms=>page.waitForTimeout(ms));waits.push(elapsed);check(elapsed>=17000,'attente minimale');check(await card.getByRole("button",{name:"Confirmer gratuitement",exact:true}).isEnabled(),'accord perdu après relecture');
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor();
        const after = stock(); check(selected().stock===12,'stock de la variante exact');check(after.version===before.version+1,'version produit');const old=before.variants.find(v=>v.id===kk.variantId)!,actual=after.variants.find(v=>v.id===kk.variantId)!;check(actual.version===old.version+1,'version variante');const normalized={...after,version:before.version,updatedAt:before.updatedAt,variants:after.variants.map(v=>v.id===kk.variantId?{...v,stock:old.stock,version:old.version,updatedAt:old.updatedAt}:v)};check(JSON.stringify(normalized)===JSON.stringify(before),'autre champ ou variante sœur modifié'); check(turns() === n + 1, "écritures en double");
        check(after.variants[0].sku === before.variants[0].sku && after.variants[0].stockPolicy === before.variants[0].stockPolicy && after.data.price === before.data.price, "autres champs modifiés");
        await closeSyna(); const shown=async()=>/stock 20\b/.test(await page.locator(`[data-catalogue-product="${kk.productId}"]`).innerText());
        const end = Date.now() + 15000; while (Date.now() < end && !(await shown())) await page.waitForTimeout(250); check(await shown(), "stock 12 absent de l'écran Catalogue");
        await noOverflow(); await shot("3-recu");
      });
      await step("rechargement : reçu conservé, aucune nouvelle écriture", async () => {
        const n = turns(); await page.reload({ waitUntil: "networkidle" }); await openSyna();
        await card.getByRole("status").getByText(/Enregistré et relu · reçu/).waitFor(); check(turns() === n && selected().stock === 12, "écriture au rechargement"); await shot("4-recharge");
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format.name, steps, ok: steps.every((s) => s.ok) && steps.length > 0 });
    await context.close();
  }
  await b.close();
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n, jobs = one<{ n: number }>("SELECT COUNT(*) n FROM jobs")!.n;
  console.log(`· appels IA : ${calls} · tâches : ${jobs} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  const afterCalls=all<Record<string,unknown>>('SELECT * FROM ai_calls ORDER BY id'),newCalls=afterCalls.filter(r=>!baselineIds.has(String(r.id))),retained=afterCalls.filter(r=>baselineIds.has(String(r.id)));
  acquiredFixtureCalls={before:baselineCalls.length,after:afterCalls.length,unchanged:sha256(JSON.stringify(retained))===baselineHash,newCalls:newCalls.length};
  if(sha256(JSON.stringify(retained))!==baselineHash)errors.push('Baseline acquise modifiée');
  observedCalls=newCalls.length;if(jobs)errors.push(`jobs=${jobs}`);
  if (newCalls.length) errors.push(`nouveaux appels = ${newCalls.length}`);
  if (jsErrors.length) errors.push(...jsErrors);
} catch (e) {
  errors.push(String(e));
  console.error("✗ " + String(e));
} finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-STOCK-301.json"), JSON.stringify({ schema:"syna301-multivariant-stock-compiled-1",prepared:true,acquiredFixtureCalls,sourceCommit:process.env.STUDIO_PROOF_COMMIT??null,servedVersion,buildId:fs.readFileSync(".next/BUILD_ID","utf8").trim(),browserVersion,selections,waits,results,errors,forbidden,coutIA:observedCalls }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log);
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
