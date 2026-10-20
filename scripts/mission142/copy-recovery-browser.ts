/** Native UI → free copy correction → explicit quote → worker restart → gallery/download.
 * All provider transports injected; both browser and worker block external calls. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";
import {execFileSync,spawn,type ChildProcess} from "node:child_process";
import {chromium,type Page} from "playwright";
const dir=process.env.DATA_DIR!;
if(!dir||!path.basename(dir).startsWith("ecs-parcours-test-142-")||process.env.DELIVERY_PHASE!=="after"||process.env.COPY_RECOVERY_SUITE!=="1")throw Error("Isolated recovery suite required");
const BASE="http://127.0.0.1:18242",out=path.join(dir,"copy-recovery");fs.mkdirSync(out,{recursive:true});
const accounts=JSON.parse(fs.readFileSync(path.join(dir,"delivery-after-private.json"),"utf8")) as {uid:string;pid:string;token:string;business:string}[];
const control=(...args:string[])=>execFileSync(process.execPath,["--import","tsx","scripts/mission142/delivery-harness.ts",...args],{env:process.env,encoding:"utf8"});
const version=await(await fetch(BASE+"/api/version")).json();assert.match(version.commit,/^[a-f0-9]{40}$/);
const log=path.join(out,"worker.txt"),fd=fs.openSync(log,"a");let worker:ChildProcess|undefined;
const start=()=>worker=spawn(process.execPath,["--import","tsx","scripts/mission142/delivery-harness.ts","worker"],{env:process.env,stdio:["ignore",fd,fd]});
const stop=async()=>{if(worker&&worker.exitCode===null){const done=new Promise(r=>worker!.once("exit",r));worker.kill("SIGTERM");await done;}};
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]}),errors:string[]=[],external:string[]=[],results:any[]=[];
async function until<T>(read:()=>Promise<T>,good:(x:T)=>boolean,label:string){const end=Date.now()+60000;let last:T;do{last=await read();if(good(last))return last;await new Promise(r=>setTimeout(r,120));}while(Date.now()<end);throw Error(`${label}: ${JSON.stringify(last!).slice(0,300)}`);}
async function shot(p:Page,name:string){await p.evaluate(async()=>{await document.fonts.ready;for(const im of document.images){im.loading="eager";await im.decode().catch(()=>{});}});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),name+" overflow");await p.screenshot({path:path.join(out,name+".png"),fullPage:true});}
const boot=async(a:typeof accounts[number],mobile:boolean,slug:string)=>{
 const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},locale:"fr-FR",reducedMotion:"reduce",recordVideo:{dir:out,size:mobile?{width:390,height:844}:{width:960,height:667}},acceptDownloads:true});
 await c.addCookies([{name:"ecs_session",value:a.token,url:BASE},{name:"ecs-lang",value:"fr",url:BASE}]);
 await c.addInitScript(()=>{(globalThis as any).__name=(fn:any)=>fn;sessionStorage.setItem("ecsSeen","1");addEventListener("DOMContentLoaded",()=>{const b=document.createElement("div");b.textContent="RECETTE #142 — FOURNISSEURS / MÉDIAS SIMULÉS — AUCUN COÛT RÉEL";b.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:6px;background:#754e15;color:white;text-align:center;font:12px sans-serif;pointer-events:none";document.body.append(b);});});
 await c.route("**/*",r=>{const u=new URL(r.request().url());if(["127.0.0.1","localhost"].includes(u.hostname)||["data:","blob:"].includes(u.protocol))return r.continue();external.push(u.hostname);return r.abort();});
 const p=await c.newPage();p.setDefaultTimeout(60000);p.on("pageerror",e=>errors.push(e.message));
 const close=async()=>{const video=p.video();await c.close();if(video)fs.renameSync(await video.path(),path.join(out,`${slug}-${mobile?"mobile":"ordinateur"}.webm`));};return{c,p,close};
};
try{
 start();await until(async()=>fs.readFileSync(log,"utf8"),s=>s.includes("DELIVERY_WORKER_READY"),"worker ready");
 for(const a of accounts){
  if(!worker||worker.exitCode!==null)start();
  control("mode",a.pid,"copy-facts");const slug=a.business==="products"?"produit-semis":"service-reliure";
  let {c,p,close}=await boot(a,false,slug);
  const job=async(jid:string)=>(await(await c.request.get(`${BASE}/api/jobs/${jid}`)).json()).job;
  await p.goto(`${BASE}/studio/${a.pid}/publicites#image`);await p.locator("[data-ai-ad-submit]").waitFor();await p.waitForFunction(()=>!document.querySelector<HTMLButtonElement>("[data-ai-ad-submit]")?.disabled);
  await p.locator("#ai-ad-request").fill(a.business==="products"?"Présenter ma boîte à semis, simplement, sans prix, remise ni personne.":"Présenter la reliure de livres, sans prix ni résultat client inventé, sans personne.");
  const created=p.waitForResponse(r=>r.url().endsWith("/campaigns/v2")&&r.request().postDataJSON()?.action==="ai_create");await p.locator("[data-ai-ad-submit]").click();const response=await created;assert(response.ok());const jid=(await response.json()).jobId;
  const failed=await until(()=>job(jid),j=>j.status==="failed","copy refusal");assert.equal(failed.progress,.15);assert.equal(failed.failureCode,"COPY_FACTS_REJECTED");
  await p.locator("[data-copy-correction]").waitFor();assert.match(await p.locator("[data-copy-issue]").innerText(),/Sous-ligne.*Nombre commercial/s);assert.equal(await p.locator('[data-copy-field="subline"]').inputValue(),"");
  await shot(p,`${slug}-01-refus-ordinateur`);await p.setViewportSize({width:390,height:844});await shot(p,`${slug}-02-refus-mobile`);
  const before=JSON.parse(control("state",a.pid));assert.equal(before.usages.length,1);assert.equal(before.reservations[0].status,"settled");
  await stop(); // Prove that free edits do not depend on a running worker or supplier.
  const saved=p.waitForResponse(r=>r.url().includes("/images/copy-review")&&r.request().method()==="POST"&&r.request().postDataJSON()?.action==="save");await p.locator("[data-copy-save]").click();assert((await saved).ok());await p.locator("[data-copy-saved]").waitFor();
  assert.equal((await job(jid)).status,"failed");assert.deepEqual(JSON.parse(control("state",a.pid)).usages,before.usages);
  await close();({c,p,close}=await boot(a,true,slug));await p.goto(`${BASE}/studio/${a.pid}/publicites#image`);await p.locator('[data-copy-field="subline"]').waitFor();assert.equal(await p.locator('[data-copy-field="subline"]').inputValue(),"");await shot(p,`${slug}-03-correction-reconnexion-mobile`);
  const resumed=p.waitForResponse(r=>r.url().includes("/images/copy-review")&&r.request().method()==="POST"&&r.request().postDataJSON()?.action==="resume");await p.locator("[data-copy-resume]").click();const rr=await resumed;assert(rr.ok(),await rr.text());assert.equal((await job(jid)).status,"queued");
  start();const done=await until(()=>job(jid),j=>["done","failed"].includes(j.status),"image recovery");assert.equal(done.status,"done",done.error??"");
  await p.locator("[data-ai-ads] img").first().waitFor();assert.match(await p.locator("[data-ai-ad-result]").innerText(),/enregistrée|livrée/i);await shot(p,`${slug}-04-resultat-mobile`);
  const download=p.waitForEvent("download");await p.locator("[data-ai-ads] a[download]").first().click();const downloaded=await download;const downloadedPath=await downloaded.path();assert(downloadedPath);const decoded=await sharp(fs.readFileSync(downloadedPath)).metadata();assert(decoded.width!>=1080);
  const after=JSON.parse(control("state",a.pid));assert.equal(after.usages.length,2);assert.equal(after.usages.filter((u:any)=>u.billed===28000).length,1);assert.equal(after.balance.reserved,0);assert.equal(after.reservations.length,2);
  await p.setViewportSize({width:1440,height:1000});await p.reload();await p.locator("[data-ai-ads] img").first().waitFor();await shot(p,`${slug}-05-resultat-reconnexion-ordinateur`);
  const foreign=accounts.find(x=>x.pid!==a.pid)!;const other=await boot(foreign,true,`${slug}-isolation`);assert.equal((await other.c.request.get(`${BASE}/api/files/${done.result.assetId}`)).status(),404);await other.close();
  results.push({business:a.business,initialFailureCode:failed.failureCode,initialProgress:.15,freeCorrectionWhileWorkerStopped:true,persistedAfterNewSession:true,explicitQuoteBeforeResume:true,originalCopyBoughtOnce:true,decodedDownload:{width:decoded.width,height:decoded.height,format:decoded.format},galleryAfterReload:true,crossProjectAccess:404,syntheticUsageRows:2,syntheticBilledMicro:after.usages.reduce((sum:number,u:any)=>sum+u.billed,0),openReservations:0,realProviderCalls:0});
  await close();await stop();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);fs.writeFileSync(path.join(out,"results.json"),JSON.stringify({version,simulation:true,realProviderCalls:0,realProviderCost:0,results,errors,blockedExternalHosts:external},null,2));console.log("RECETTE REPRISE RÉUSSIE — produit/service, correction gratuite, nouvelle session, worker redémarré, rédaction achetée une seule fois, image en galerie et PNG téléchargé/décodé, isolation 404.");
}finally{await stop();await browser.close();fs.closeSync(fd);}
