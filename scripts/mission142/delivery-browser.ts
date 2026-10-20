/** Vrais écrans/routes/fichiers, moteur natif à dépendances simulées ; aucune création IA réelle. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {execFileSync,spawn} from "node:child_process";
import {chromium,type Page} from "playwright";
const dir=process.env.DATA_DIR!,phase=process.env.DELIVERY_PHASE??"after";
if(!dir||!path.basename(dir).startsWith("ecs-parcours-test-142-")||!["before","after"].includes(phase))throw Error("Recette isolée obligatoire");
const BASE="http://127.0.0.1:18242",out=path.join(dir,`delivery-${phase}`);fs.mkdirSync(out,{recursive:true});
const accounts=JSON.parse(fs.readFileSync(path.join(dir,`delivery-${phase}-private.json`),"utf8")) as {uid:string;pid:string;token:string;business:string}[];
const control=(...args:string[])=>execFileSync(process.execPath,["--import","tsx","scripts/mission142/delivery-harness.ts",...args],{env:process.env,encoding:"utf8"});
const version=await(await fetch(BASE+"/api/version")).json();
const workerLog=path.join(out,"worker.txt");fs.writeFileSync(workerLog,"");const fd=fs.openSync(workerLog,"a");
const worker=spawn(process.execPath,["--import","tsx","scripts/mission142/delivery-harness.ts","worker"],{env:process.env,stdio:["ignore",fd,fd]});
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});const errors:string[]=[],external:string[]=[],results:any[]=[];
async function until<T>(read:()=>Promise<T>,good:(x:T)=>boolean,label:string){let last:T;const end=Date.now()+60000;do{last=await read();if(good(last))return last;await new Promise(r=>setTimeout(r,150));}while(Date.now()<end);throw Error(`Attente ${label} : ${JSON.stringify(last!).slice(0,500)}`);}
const boot=async(a:typeof accounts[number])=>{
 const c=await browser.newContext({viewport:{width:1440,height:1000},locale:"fr-FR",reducedMotion:"reduce"});
 await c.addCookies([{name:"ecs_session",value:a.token,url:BASE},{name:"ecs-lang",value:"fr",url:BASE}]);
 await c.addInitScript(()=>{(globalThis as any).__name=(fn:any)=>fn;sessionStorage.setItem("ecsSeen","1");addEventListener("DOMContentLoaded",()=>{const b=document.createElement("div");b.textContent="RECETTE #142 — MÉDIAS ET FOURNISSEURS SIMULÉS — COÛT RÉEL : 0 €";b.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:6px;background:#754e15;color:white;text-align:center;font:12px sans-serif;pointer-events:none";document.body.append(b);});});
 await c.route("**/*",r=>{const u=new URL(r.request().url());if(["127.0.0.1","localhost"].includes(u.hostname)||["data:","blob:"].includes(u.protocol))return r.continue();external.push(u.hostname);return r.abort();});
 const p=await c.newPage();p.setDefaultTimeout(60000);p.on("pageerror",e=>errors.push(e.message));return{c,p};
};
async function shot(p:Page,name:string){await p.evaluate(async()=>{await document.fonts.ready;for(const im of document.images){im.loading="eager";await im.decode().catch(()=>{});}});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`Débordement ${name}`);await p.screenshot({path:path.join(out,name+".png"),fullPage:true});}
try{
 await until(async()=>fs.readFileSync(workerLog,"utf8"),s=>s.includes("DELIVERY_WORKER_READY"),"worker prêt");
 for(const a of accounts){
  const slug=a.business==="products"?"produit-doseur":"service-piano";let{c,p}=await boot(a);
  const readJob=async(jid:string)=>(await(await c.request.get(`${BASE}/api/jobs/${jid}`)).json()).job;
  const open=async()=>{await p.goto(`${BASE}/studio/${a.pid}/publicites#image`);await p.locator("[data-ai-ad-submit]").waitFor();await p.waitForFunction(()=>{const b=document.querySelector<HTMLButtonElement>("[data-ai-ad-submit]");return b&&!b.disabled;});};
  await open();
  await p.locator("#ai-ad-request").fill(a.business==="products"?"Vrai doseur fourni, aucun humain, lumière douce.":"Accord de piano, instruments et outils seulement, aucun humain.");
  const created=p.waitForResponse(r=>r.url().endsWith("/campaigns/v2")&&r.request().postDataJSON()?.action==="ai_create");
  await p.locator("[data-ai-ad-submit]").click();const response=await created;assert(response.ok());const jid=(await response.json()).jobId;
  const done=await until(()=>readJob(jid),j=>["done","failed"].includes(j.status),"livraison rapide");assert.equal(done.status,"done",done.error??"");
  await new Promise(r=>setTimeout(r,3500));
  const refreshedWithoutReload=await p.locator("[data-ai-ads] img").count()>0;
  if(phase==="before")assert(!refreshedWithoutReload,"Le défaut de rafraîchissement n'a pas été reproduit sur ce tour");else assert(refreshedWithoutReload,"Image livrée non rafraîchie");
  await shot(p,`${slug}-01-fin-rapide-${phase}`);
  await p.reload();await p.locator("[data-ai-ads] img").first().waitFor();const campaign=await(await c.request.get(`${BASE}/api/projects/${a.pid}/campaigns/v2`)).json();const asset=campaign.aiAds[0];assert(asset);
  const downloaded=await c.request.get(BASE+asset.url+"?download=1");assert(downloaded.ok());assert.match(downloaded.headers()["content-type"],/image\//);assert((await downloaded.body()).length>100);
  const foreign=accounts.find(x=>x.pid!==a.pid)!;const other=await boot(foreign);assert.equal((await other.c.request.get(BASE+asset.url)).status(),404);await other.c.close();
  control("mode",a.pid,"budget");await p.locator("#ai-ad-request").fill("Nouvelle intention fictive pour éprouver le refus budgétaire, sans appel réel.");
  const stopped=p.waitForResponse(r=>r.url().endsWith("/campaigns/v2")&&r.request().postDataJSON()?.action==="ai_create");await p.locator("[data-ai-ad-submit]").click();const stoppedResponse=await stopped;assert(stoppedResponse.ok());const failedId=(await stoppedResponse.json()).jobId;
  const failed=await until(()=>readJob(failedId),j=>j.status==="failed","refus budgétaire");assert.equal(failed.progress,.15);assert.equal(failed.result,null);assert.match(failed.error,/insuffisant/);assert(!/100\s*%/.test(failed.error));
  if(phase==="after"){await p.locator("[data-ai-ad-error]").waitFor();assert.match(await p.locator("[data-ai-ad-error]").innerText(),/15\s*%/);}else assert.equal(await p.locator("[data-ai-ad-error]").count(),0);
  for(const mobile of [false,true]){await p.setViewportSize({width:mobile?390:1440,height:mobile?844:1000});await shot(p,`${slug}-02-echec-budget-${mobile?"mobile":"ordinateur"}-${phase}`);}
  await c.close();({c,p}=await boot(a));await open();
  const persistedError=await p.locator("[data-ai-ad-error]").count()>0;assert.equal(persistedError,phase==="after");
  await shot(p,`${slug}-03-reconnexion-${phase}`);
  // Solde fictif préchargé : distinguer consommation réelle et seuil de fonctionnement, sans le modifier en production.
  control("low-budget",a.pid);const snapshot=JSON.parse(control("state",a.pid));await p.reload();
  const overview=await(await c.request.get(`${BASE}/api/projects/${a.pid}`)).json();const usage=overview.aiBudget.usage;
  assert(usage.paused);if(phase==="before")assert.equal(usage.plan.used,100);else assert(usage.plan.used<100);
  await shot(p,`${slug}-04-solde-restant-${phase}`);
  assert.equal(snapshot.usages.length,3);assert.equal(snapshot.usages.reduce((n:number,u:any)=>n+u.billed,0),144678);
  assert.equal(snapshot.reservations.length,3);assert(snapshot.reservations.every((r:any)=>r.status==="settled"));
  results.push({business:a.business,refreshedWithoutReload,persistedError,failedProgress:failed.progress,noFailedResult:failed.result===null,downloadVerified:true,foreignDownloadDenied:true,remainingBudgetMicro:300000,displayedPlanUsed:usage.plan.used,paused:usage.paused,simulation:true,recordedSyntheticCostMicro:144678});await c.close();
 }
 assert.equal(errors.length,0,errors.join("\n"));fs.writeFileSync(path.join(out,"results.json"),JSON.stringify({phase,version,simulation:true,realProviderCalls:0,realProviderCost:0,results,errors,blockedExternalHosts:[...new Set(external)]},null,2));console.log(`RECETTE ${phase} RÉUSSIE — 2 projets, sauvegarde, galerie, téléchargement et échec persistant vérifiés`);
}finally{if(worker.exitCode===null){const end=new Promise(r=>worker.once("exit",r));worker.kill("SIGTERM");await end;}await browser.close();fs.closeSync(fd);}
