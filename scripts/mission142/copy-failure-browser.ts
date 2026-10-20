/** Reproduction du garde réellement identifié : rédaction non conforme, jamais contourné ; fournisseur simulé. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {execFileSync,spawn} from "node:child_process";
import {chromium,type Page} from "playwright";
const dir=process.env.DATA_DIR!;
if(!dir||!path.basename(dir).startsWith("ecs-parcours-test-142-")||process.env.DELIVERY_PHASE!=="after")throw Error("Recette isolée obligatoire");
const BASE="http://127.0.0.1:18242",out=path.join(dir,"copy-failure");fs.mkdirSync(out,{recursive:true});
const accounts=JSON.parse(fs.readFileSync(path.join(dir,"delivery-after-private.json"),"utf8")) as {uid:string;pid:string;token:string;business:string}[];
const control=(...args:string[])=>execFileSync(process.execPath,["--import","tsx","scripts/mission142/delivery-harness.ts",...args],{env:process.env,encoding:"utf8"});
const version=await(await fetch(BASE+"/api/version")).json(),log=path.join(out,"worker.txt"),fd=fs.openSync(log,"w");
const worker=spawn(process.execPath,["--import","tsx","scripts/mission142/delivery-harness.ts","worker"],{env:process.env,stdio:["ignore",fd,fd]});
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]}),errors:string[]=[],external:string[]=[],results:any[]=[];
async function until(read:()=>Promise<boolean>,label:string){const end=Date.now()+60000;do{if(await read())return;await new Promise(r=>setTimeout(r,100));}while(Date.now()<end);throw Error(label);}
async function shot(p:Page,name:string){await p.evaluate(async()=>{await document.fonts.ready;for(const im of document.images)await im.decode().catch(()=>{});});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:path.join(out,name+".png"),fullPage:true});}
try{
 await until(async()=>fs.readFileSync(log,"utf8").includes("DELIVERY_WORKER_READY"),"Worker non prêt");
 for(const a of accounts){
  control("mode",a.pid,"copy-facts");const slug=a.business==="products"?"produit-doseur":"service-piano";
  const c=await browser.newContext({viewport:{width:1440,height:1000},locale:"fr-FR",reducedMotion:"reduce"});await c.addCookies([{name:"ecs_session",value:a.token,url:BASE},{name:"ecs-lang",value:"fr",url:BASE}]);
  await c.addInitScript(()=>{(globalThis as any).__name=(fn:any)=>fn;sessionStorage.setItem("ecsSeen","1");addEventListener("DOMContentLoaded",()=>{const b=document.createElement("div");b.textContent="RECETTE #142 — TEXTE IA SIMULÉ NON CONFORME — AUCUN FOURNISSEUR RÉEL";b.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:6px;background:#754e15;color:white;text-align:center;font:12px sans-serif;pointer-events:none";document.body.append(b);});});
  await c.route("**/*",r=>{const u=new URL(r.request().url());if(["127.0.0.1","localhost"].includes(u.hostname)||["data:","blob:"].includes(u.protocol))return r.continue();external.push(u.hostname);return r.abort();});
  const p=await c.newPage();p.setDefaultTimeout(60000);p.on("pageerror",e=>errors.push(e.message));await p.goto(`${BASE}/studio/${a.pid}/publicites#image`);await p.locator("[data-ai-ad-submit]").waitFor();await p.waitForFunction(()=>!document.querySelector<HTMLButtonElement>("[data-ai-ad-submit]")?.disabled);
  const filesBefore=(await(await c.request.get(`${BASE}/api/projects/${a.pid}/files`)).json()).assets.length;
  await p.locator("#ai-ad-request").fill("Présenter l’activité fictive sans prix, remise ou promesse non confirmée.");
  const created=p.waitForResponse(r=>r.url().endsWith("/campaigns/v2")&&r.request().postDataJSON()?.action==="ai_create");await p.locator("[data-ai-ad-submit]").click();const response=await created;assert(response.ok());const jid=(await response.json()).jobId;
  await until(async()=>{const j=(await(await c.request.get(`${BASE}/api/jobs/${jid}`)).json()).job;return j.status==="failed";},"Échec de rédaction non reçu");
  const job=(await(await c.request.get(`${BASE}/api/jobs/${jid}`)).json()).job;assert.equal(job.progress,.15);assert.equal(job.result,null);assert.match(job.error,/Rédaction IA non conforme aux faits confirmés/);
  await p.locator("[data-ai-ad-error]").waitFor();assert.match(await p.locator("[data-ai-ad-error]").innerText(),/15\s*%/);await shot(p,`${slug}-01-refus-redaction-ordinateur`);
  await p.setViewportSize({width:390,height:844});await shot(p,`${slug}-02-refus-redaction-mobile`);await p.reload();await p.locator("[data-ai-ad-error]").waitFor();assert.match(await p.locator("[data-ai-ad-error]").innerText(),/Rédaction IA non conforme/);await shot(p,`${slug}-03-refus-reconnexion-mobile`);
  const snapshot=JSON.parse(control("state",a.pid)),campaign=(await(await c.request.get(`${BASE}/api/projects/${a.pid}/campaigns/v2`)).json());
  assert.equal(campaign.aiAds.length,0);assert.equal((await(await c.request.get(`${BASE}/api/projects/${a.pid}/files`)).json()).assets.length,filesBefore);
  assert.equal(snapshot.usages.length,1);assert.equal(snapshot.usages[0].billed,28000);assert.equal(snapshot.reservations.length,1);assert.equal(snapshot.reservations[0].status,"settled");assert.equal(snapshot.balance.reserved,0);
  results.push({business:a.business,failedProgress:.15,failureOriginCode:"COPY_FACTS_REJECTED",noFailedResult:true,noImageDelivered:true,sourceFilesPreserved:true,persistedAfterReload:true,syntheticTextUsages:1,syntheticBilledMicro:28000,settledReservations:1,openReservations:0});await c.close();
 }
 assert.equal(errors.length,0,errors.join("\n"));assert.equal(external.length,0);fs.writeFileSync(path.join(out,"results.json"),JSON.stringify({version,simulation:true,realProviderCalls:0,realProviderCost:0,results,errors,blockedExternalHosts:external},null,2));console.log("RECETTE REFUS RÉDACTION RÉUSSIE — 2 projets, échec à 15 %, reconnexion, zéro image et réservation texte réglée");
}finally{if(worker.exitCode===null){const ended=new Promise(r=>worker.once("exit",r));worker.kill("SIGTERM");await ended;}await browser.close();fs.closeSync(fd);}
