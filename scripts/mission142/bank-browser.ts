/** Recette UI native ; sorties du moteur injectées, fichiers réels, aucun fournisseur contacté. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {execFileSync,spawn} from "node:child_process";
import {chromium,type Page} from "playwright";
const dir=process.env.DATA_DIR!;
if(!dir||!path.basename(dir).startsWith("ecs-parcours-test-142-")||process.env.DELIVERY_PHASE!=="bank")throw Error("Recette isolée obligatoire");
const BASE="http://127.0.0.1:18242",out=path.join(dir,"delivery-bank");fs.mkdirSync(out,{recursive:true});
const accounts=JSON.parse(fs.readFileSync(path.join(dir,"delivery-bank-private.json"),"utf8")) as {uid:string;pid:string;token:string;business:string}[];
const control=(...args:string[])=>execFileSync(process.execPath,["--import","tsx","scripts/mission142/delivery-harness.ts",...args],{env:process.env,encoding:"utf8"});
const version=await(await fetch(BASE+"/api/version")).json();
const log=path.join(out,"worker.txt"),fd=fs.openSync(log,"w");
const worker=spawn(process.execPath,["--import","tsx","scripts/mission142/delivery-harness.ts","worker"],{env:process.env,stdio:["ignore",fd,fd]});
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]}),errors:string[]=[],external:string[]=[],results:any[]=[];
async function shot(p:Page,name:string){await p.evaluate(async()=>{await document.fonts.ready;for(const im of document.images)await im.decode().catch(()=>{});});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:path.join(out,name+".png"),fullPage:true});}
async function until(read:()=>Promise<boolean>,label:string){const end=Date.now()+60000;do{if(await read())return;await new Promise(r=>setTimeout(r,100));}while(Date.now()<end);throw Error(label);}
try{
 await until(async()=>fs.readFileSync(log,"utf8").includes("DELIVERY_WORKER_READY"),"Worker non prêt");
 for(const a of accounts){
  const slug=a.business==="products"?"produit-doseur":"service-piano";
  const c=await browser.newContext({viewport:{width:1440,height:1000},locale:"fr-FR",reducedMotion:"reduce"});
  await c.addCookies([{name:"ecs_session",value:a.token,url:BASE},{name:"ecs-lang",value:"fr",url:BASE}]);
  await c.addInitScript(()=>{(globalThis as any).__name=(fn:any)=>fn;sessionStorage.setItem("ecsSeen","1");addEventListener("DOMContentLoaded",()=>{const b=document.createElement("div");b.textContent="RECETTE #142 — SORTIES DU MOTEUR SIMULÉES — AUCUN APPEL FOURNISSEUR";b.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:6px;background:#754e15;color:white;text-align:center;font:12px sans-serif;pointer-events:none";document.body.append(b);});});
  await c.route("**/*",r=>{const u=new URL(r.request().url());if(["127.0.0.1","localhost"].includes(u.hostname)||["data:","blob:"].includes(u.protocol))return r.continue();external.push(u.hostname);return r.abort();});
  const p=await c.newPage();p.setDefaultTimeout(60000);p.on("pageerror",e=>errors.push(e.message));
  await p.goto(`${BASE}/studio/${a.pid}/images`);await p.locator("[data-image-bank] img").first().waitFor();
  const n=await p.locator("[data-image-bank] img").count();
  const launch=async(mode:string)=>{
   control("mode",a.pid,mode);await p.locator("[data-bank-create]").click();await p.locator("#bc-topic").fill("Sujet de test isolé "+mode);await p.locator("#bc-count").selectOption("2");
   const response=p.waitForResponse(r=>r.url().endsWith("/images/v2")&&r.request().method()==="POST");await p.locator("[data-bank-create-go]").click();const r=await response;assert(r.ok());return(await r.json()).jobId as string;
  };
  const partialId=await launch("bank-partial");await p.getByRole("status").filter({hasText:"1/2 images disponibles"}).waitFor();
  assert.equal(await p.locator("[data-image-bank] img").count(),n+1);assert.equal(await p.getByRole("status").filter({hasText:"Image prête"}).count(),0);
  const partial=(await(await c.request.get(`${BASE}/api/jobs/${partialId}`)).json()).job;assert.equal(partial.result.delivery.state,"partial");
  await shot(p,`${slug}-01-partiel-banque`);
  const failedId=await launch("bank-failed");await p.getByRole("status").filter({hasText:"Jeu d’images incomplet"}).waitFor();assert.equal(await p.locator("[data-image-bank] img").count(),n+2);
  const failed=(await(await c.request.get(`${BASE}/api/jobs/${failedId}`)).json()).job;assert.equal(failed.status,"failed");assert.equal(failed.progress,.5);assert.equal(failed.result,null);
  await p.setViewportSize({width:390,height:844});await shot(p,`${slug}-02-echec-fichier-conserve-mobile`);
  await p.reload();await until(async()=>await p.locator("[data-image-bank] img").count()===n+2,"Images perdues à la reconnexion");
  // La boîte a été ouverte avec un devis actif ; la confirmation relit le solde courant, sous le seuil natif.
  await p.locator("[data-bank-create]").click();await p.locator("#bc-topic").fill("Ne pas lancer, seuil financier fictif");control("low-budget",a.pid);
  const before=JSON.parse(control("state",a.pid));let sent=0;const listener=(r:any)=>{if(r.url().endsWith("/images/v2")&&r.method()==="POST")sent++;};p.on("request",listener);
  await p.locator("[data-bank-create-go]").click();await p.locator('[data-ai-budget-confirm="empty"]').waitFor();
  const modal=p.locator('[data-ai-budget-confirm="empty"]');assert.match(await modal.innerText(),/Il reste 1 %/);assert(!/utilisé à 100\s*%/.test(await modal.innerText()));
  await shot(p,`${slug}-03-solde-insuffisant-mobile`);assert.equal(sent,0);
  const after=JSON.parse(control("state",a.pid));assert.equal(after.jobs.length,before.jobs.length);assert.equal(after.usages.length,0);assert.equal(after.reservations.length,0);
  results.push({business:a.business,partialDeliveryShown:true,partialSuccessNotPromoted:true,fileVisibleAfterFailure:true,filesPreservedAfterReload:true,failureProgress:.5,remainingBudgetPercent:1,noCreationBelowMinimum:true,usages:0,reservations:0});await c.close();
 }
 assert.equal(errors.length,0,errors.join("\n"));assert.equal(external.length,0,external.join(","));fs.writeFileSync(path.join(out,"results.json"),JSON.stringify({version,simulation:true,realProviderCalls:0,realProviderCost:0,results,errors,blockedExternalHosts:external},null,2));console.log("RECETTE BANQUE RÉUSSIE — 2 projets, livraison partielle, fichier après échec, reconnexion et solde non épuisé");
}finally{if(worker.exitCode===null){const ended=new Promise(r=>worker.once("exit",r));worker.kill("SIGTERM");await ended;}await browser.close();fs.closeSync(fd);}
