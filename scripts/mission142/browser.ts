/** Deux nouveaux projets, vrais formulaires/routes/stockage/worker ; fournisseur injecté et réseau externe bloqué. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { chromium, type Page, type BrowserContext } from "playwright";
const dir = process.env.DATA_DIR!;
if (!dir || !path.basename(dir).startsWith("ecs-parcours-test-142-")) throw Error("Base de recette isolée obligatoire");
const BASE="http://127.0.0.1:18242", out=path.join(dir,"browser");
fs.mkdirSync(out,{recursive:true});
const accounts: {uid:string;token:string;business:string}[]=JSON.parse(fs.readFileSync(path.join(dir,"private.json"),"utf8"));
const control=(...args:string[])=>execFileSync(process.execPath,["--import","tsx","scripts/mission142/harness.ts",...args],{env:process.env,encoding:"utf8"});
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});
let worker:ChildProcess|undefined;
const workerLog=fs.openSync(path.join(dir,"worker.txt"),"a");
const startWorker=()=>worker=spawn(process.execPath,["--import","tsx","scripts/mission142/harness.ts","worker"],{env:process.env,stdio:["ignore",workerLog,workerLog]});
const stopWorker=async()=>{ if(worker&&worker.exitCode===null){const stopped=new Promise(resolve=>worker!.once("exit",resolve));worker.kill("SIGTERM");await stopped;} };
const results:any[]=[], external:string[]=[], errors:string[]=[];
const versionResponse=await fetch(BASE+"/api/version");
assert(versionResponse.ok);
const compiledVersion=await versionResponse.json();
assert.match(compiledVersion.commit,/^[a-f0-9]{40}$/);
const boot=async(a:typeof accounts[number],mobile=false)=>{
  const c=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile,locale:"fr-FR",reducedMotion:"reduce"});
  await c.addCookies([{name:"ecs_session",value:a.token,url:BASE},{name:"ecs-lang",value:"fr",url:BASE}]);
  await c.addInitScript(()=>{(globalThis as any).__name=(fn:any)=>fn; sessionStorage.setItem("ecsSeen","1");addEventListener("DOMContentLoaded",()=>{const e=document.createElement("div");e.textContent="RECETTE #142 — DONNÉES ET FOURNISSEURS SIMULÉS — COÛT RÉEL : 0 €";e.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#754e15;color:white;text-align:center;padding:7px;font:12px sans-serif;pointer-events:none";document.body.append(e);});});
  await c.route("**/*",r=>{const u=new URL(r.request().url());if(["127.0.0.1","localhost"].includes(u.hostname)||["data:","blob:"].includes(u.protocol))return r.continue();external.push(u.hostname);return r.abort();});
  const p=await c.newPage();p.setDefaultTimeout(60000);p.on("pageerror",e=>errors.push(e.message));return {c,p};
};
async function until<T>(read:()=>Promise<T>,good:(x:T)=>boolean,label:string){const end=Date.now()+60000;let last:T;do{last=await read();if(good(last))return last;await new Promise(r=>setTimeout(r,250));}while(Date.now()<end);throw Error(`Timeout ${label}: ${JSON.stringify(last!).slice(0,800)}`);}
async function shot(p:Page,name:string){await p.evaluate(async()=>{await document.fonts.ready;for(const i of document.images){i.loading="eager";await i.decode().catch(()=>{});}});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`Débordement horizontal : ${name}`);await p.screenshot({path:path.join(out,name+".png"),fullPage:true});console.log("CAPTURE",name);}
try{
startWorker();
for(const [index,a] of accounts.entries()){
  const product=a.business==="products", slug=product?"produit-thermometre":"service-affutage", name=product?"Balise Jardin Test":"Fil Net Test";
  let {c,p}=await boot(a,!product);
  const state=async()=>{const r=await c.request.get(`${BASE}/api/projects/${pid}/preparation`);assert(r.ok());return r.json();};
  let pid="";
  assert.equal((await (await c.request.get(BASE+"/api/projects")).json()).projects.length,0);
  await p.goto(BASE+"/studio");await p.locator("#description").waitFor();
  if(!product)await p.getByRole("radio",{name:/Le site de mon entreprise de services/}).click();
  const description=product?"Thermomètre pour jardinières.":"Affûtage d’outils de jardin.";
  await p.locator("#description").fill(description);
  await p.locator("input[name=photos]").setInputFiles(path.join(dir,"photo.png"));
  if(product){await p.getByRole("button",{name:"Nom, marque, prix, logo…",exact:true}).click();await p.locator("#productName").fill(name);}
  else await p.locator("#new-svc-name-0").fill("Affûtage");
  await shot(p,slug+"-01-demande-peu-detaillee");
  const creation=p.waitForResponse(r=>new URL(r.url()).pathname==="/api/projects"&&r.request().method()==="POST");
  await p.getByRole("button",{name:"Préparer mon projet",exact:true}).click();
  const response=await creation, body=await response.json();assert(response.ok(),JSON.stringify(body));pid=body.id;assert.equal(body.jobId,null);
  await p.waitForURL(`**/studio/${pid}/pilote`);await p.locator("[data-brief-name]").fill(name);
  const saved=p.waitForResponse(r=>r.url().endsWith("/preparation")&&r.request().postDataJSON()?.action==="edit-brief");
  await p.locator("[data-save-brief]").click();assert((await saved).ok());
  const before=(await state()).state.stages.brief.data.input;assert.equal(before.description,description);assert.equal(before.photoIds.length,1);assert.equal(before.target,"");
  // Quitter toute la session navigateur puis se reconnecter au même compte fictif.
  await c.close();({c,p}=await boot(a,!product));await p.goto(`${BASE}/studio/${pid}/pilote`);await p.locator("[data-brief-name]").waitFor();
  assert.deepEqual((await state()).state.stages.brief.data.input,before);
  await shot(p,slug+"-02-reconnexion");
  // Devis natif, puis réserve de son plafond entier dans le double fournisseur (budget de test préparé à ce plafond).
  const quoted=p.waitForResponse(r=>r.url().endsWith("/preparation")&&r.request().postDataJSON()?.action==="quote");
  await p.getByRole("button",{name:"Analyser mes informations et mes photos par l’IA",exact:true}).click();
  const q=await quoted, quote=await q.json();assert(q.ok(),JSON.stringify(quote));assert(quote.quote.paid);
  control("budget",pid,"quote-only",quote.quote.id);control("mode",pid,"hold");
  const financial=()=>JSON.parse(control("snapshot",pid));
  const beforeReservation=financial();
  // Le devis public expose un pourcentage, pas le plafond fournisseur interne.
  assert(beforeReservation.balance.available>0);
  const generated=p.waitForResponse(r=>r.url().endsWith("/preparation")&&r.request().postDataJSON()?.action==="generate");
  await p.getByRole("dialog",{name:"Confirmer cet essai",exact:true}).getByRole("button",{name:"Confirmer cet essai",exact:true}).click();
  assert((await generated).ok());
  const running=await until(state,s=>s.job?.status==="running"&&s.job.progress===.25,"réservation en cours"), jid=running.job.id;
  const duringReservation=financial();assert.equal(duringReservation.balance.available,0);assert.equal(duringReservation.balance.reserved,beforeReservation.balance.available);
  for(const mobile of [false,true]){await p.setViewportSize({width:mobile?390:1440,height:mobile?844:1000});await p.reload();await p.getByText("Analyse simulée en cours ; les informations saisies sont enregistrées",{exact:true}).waitFor();await shot(p,`${slug}-03-en-cours-${mobile?"mobile":"ordinateur"}`);}
  await p.goto(BASE+"/studio/compte");await p.getByRole("button",{name:"Gérer",exact:true}).click();await p.getByText(/Une génération utilise temporairement le budget disponible/).waitFor();await shot(p,slug+"-04-budget-engage");
  control("mode",pid,product?"fail-after-save":"interrupt-after-save");
  await p.goto(`${BASE}/studio/${pid}/pilote`);
  if(product){
    await until(state,s=>s.state.error?.jobId===jid,"échec simulé conservé");
  }else{
    await until(state,s=>s.job?.progress===.7,"résultat acquis avant arrêt worker");
    await stopWorker();control("expire-lease",jid);startWorker();
    await until(state,s=>s.job?.status==="failed","interruption détectée et bornée");
  }
  for(const mobile of [false,true]){await p.setViewportSize({width:mobile?390:1440,height:mobile?844:1000});await p.reload();await p.locator("[data-preparation] [role=alert]").first().waitFor();await shot(p,`${slug}-05-arret-conserve-${mobile?"mobile":"ordinateur"}`);}
  const afterFailure=financial();assert.equal(afterFailure.reservations[0].actual,40_000);assert.equal(afterFailure.balance.reserved,0);
  // Reprise par un vrai clic client : aucune nouvelle génération payante n'est autorisée.
  control("mode",pid,"continue");
  await p.locator("[data-brief-name]").fill("Modification non enregistrée de test");
  assert(await p.locator("[data-recover-preparation]").isDisabled());
  await p.locator("[data-brief-name]").fill(before.offerName);
  const stale=await c.request.post(`${BASE}/api/projects/${pid}/preparation`,{data:{action:"recover",revision:(await state()).state.revision-1}});assert.equal(stale.status(),409);
  const retry=p.waitForResponse(r=>r.url().endsWith("/preparation")&&r.request().postDataJSON()?.action==="recover");
  await p.locator("[data-recover-preparation]").click();assert((await retry).ok());
  await until(state,s=>!s.state.pending&&!s.state.error&&s.state.stages.brief.data.provenance==="simulation","reprise du résultat acquis");
  for(const mobile of [false,true]){await p.setViewportSize({width:mobile?390:1440,height:mobile?844:1000});await p.reload();await p.locator("[data-brief-name]").waitFor();await shot(p,`${slug}-06-resultat-repris-${mobile?"mobile":"ordinateur"}`);}
  const result=await state();assert.deepEqual(result.state.stages.brief.data.input,before);
  const afterRetry=financial();assert.deepEqual(afterRetry,afterFailure);
  const media=await c.request.get(`${BASE}/api/files/${before.photoIds[0]}`);assert(media.ok());
  // Insuffisance réelle pour le serveur mais purement synthétique pour les comptes de test.
  control("budget",pid,"empty");await p.reload();
  const denied=p.waitForResponse(r=>r.url().endsWith("/preparation")&&r.request().postDataJSON()?.action==="quote");
  await p.getByRole("button",{name:"Analyser mes informations et mes photos par l’IA",exact:true}).click();
  const denial=await denied;assert([402,422].includes(denial.status()));await p.locator("[data-preparation] [role=alert]").first().waitFor();await shot(p,slug+"-07-budget-insuffisant");
  results.push({business:a.business,projectId:pid,jobId:jid,photoId:before.photoIds[0],inputKept:true,photoAccessible:true,reconnected:true,workerInterrupted:!product,recoveryViaClientClick:true,recoveryOnly:true,insufficientBudgetHttp:denial.status(),provenance:"simulation",finances:{beforeReservation,duringReservation,afterFailure,afterRetry}});
  await c.close();
}
// Isolation des routes par compte : résultats, suivi, médias et modification de tâche.
for(const [i,a] of accounts.entries()){
 const {c,p}=await boot(a);const foreign=results[1-i];
 for(const url of [`/api/projects/${foreign.projectId}/preparation`,`/api/projects/${foreign.projectId}/jobs`,`/api/projects/${foreign.projectId}/subscription`,`/api/jobs/${foreign.jobId}`,`/api/files/${foreign.photoId}`]){const r=await c.request.get(BASE+url);assert.equal(r.status(),404);}
 const denied=await c.request.post(`${BASE}/api/jobs/${foreign.jobId}`,{data:{action:"retry"}});assert.equal(denied.status(),404);
 const deniedRecovery=await c.request.post(`${BASE}/api/projects/${foreign.projectId}/preparation`,{data:{action:"recover",revision:0}});assert.equal(deniedRecovery.status(),404);await c.close();
}
assert.equal(errors.length,0,errors.join("\n"));control("report");
const ledger=JSON.parse(fs.readFileSync(path.join(dir,"ledger-public.json"),"utf8"));
assert.equal(ledger.reservations.length,2);assert(ledger.reservations.every((r:any)=>r.actual===40_000));assert.equal(ledger.usages.length,2);assert.equal(ledger.themesCreated,0);
fs.writeFileSync(path.join(out,"results.json"),JSON.stringify({simulation:true,compiledVersion,realCalls:0,realCostEur:0,results,crossAccountReadWriteDenied:true,errors,blockedExternalHosts:[...new Set(external)]},null,2));
console.log("RECETTE RÉUSSIE : 2 projets créés dans l’UI, reprise sans second débit, zéro thème ni appel réel");
}finally{await stopWorker();await browser.close();fs.closeSync(workerLog);}
