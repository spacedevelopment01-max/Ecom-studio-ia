/** Preuves via les vraies routes d'aperçu : base isolée, réseau fournisseur interdit.
 * CHROMIUM=/usr/bin/chromium npx tsx scripts/lot2b-proof.ts reports/lot2b [dossier-du-pack-extrait]
 * Le dossier média est facultatif : les captures restent explicitement incomplètes s'il manque.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {chromium,type Page} from "playwright";
if(process.env.DATA_DIR||process.env.DATABASE_FILE)throw new Error("Base existante refusée");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ecs-lot2b-"));process.env.DATA_DIR=temp;process.env.STOCK_OFFLINE="1";
globalThis.fetch=async()=>{throw new Error("Réseau fournisseur interdit");};
const out=path.resolve(process.argv[2]??"reports/lot2b");fs.mkdirSync(out,{recursive:true});
const {editorialProject,DEMO_PROVENANCE}=await import("../tests/lot2b-fixtures");
const {createUser}=await import("../src/lib/auth");const {all}=await import("../src/lib/db");
const {saveThemeVersion}=await import("../src/lib/projects");const {previewSegment}=await import("../src/lib/theme/preview-access");
const {GET,POST}=await import("../src/app/preview/[id]/v/[vid]/[[...path]]/route");
const {cmsExport}=await import("../src/lib/cms-v2/export");const {libraryLoader}=await import("../src/lib/theme/loader");
const {previewContactFile}=await import("../src/lib/theme/preview-contact");const {runWithLang}=await import("../src/lib/i18n-server");
const sharp=(await import("sharp")).default;
const user=await createUser("editorial-proof@example.invalid","isolated-test-only","Preuve isolée");
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url!,"http://127.0.0.1"),m=url.pathname.match(/^\/preview\/([^/]+)\/v\/([^/]+)(?:\/(.*))?$/);if(!m)return res.writeHead(404).end();
 const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
 const request=new Request(url,{method:req.method,headers:req.headers as Record<string,string>,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
 const r=await(req.method==="POST"?POST:GET)(request,{params:Promise.resolve({id:m[1],vid:m[2],path:(m[3]??"").split("/").filter(Boolean)})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
}catch(e){console.error(e);res.writeHead(500).end();}});
await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM??"/usr/bin/chromium",args:["--no-sandbox"]});
const evidence:any[]=[];
async function loaded(page:Page){await page.evaluate(async()=>{const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight*.8){scrollTo({top:y,behavior:"instant"});await pause(80);}await document.fonts.ready;await Promise.all([...document.images].map(async(im)=>{im.loading="eager";await im.decode().catch(()=>{});}));scrollTo({top:0,behavior:"instant"});});await page.waitForTimeout(800);}
async function attach(page:Page){await page.addInitScript("window.__name=(fn)=>fn");await page.route("**/*",r=>r.request().url().startsWith(origin+"/")?r.continue():r.abort());}
try{
 for(const kind of ["products","services"]as const)await runWithLang({content:"fr",ui:"fr"},async()=>{
  const f=await editorialProject(user.id,kind,process.argv[3]),{spec,pid}=f,version=saveThemeVersion(pid,spec,"Composition éditoriale isolée — Lot 2B","user");
  const base=`/preview/${pid}/v/${previewSegment(version.id,user.id,pid)}`,dir=path.join(out,kind==="products"?"orbe":"atelier-rive");fs.mkdirSync(dir,{recursive:true});
  const pages:any[]=[],exports:any[]=[],interactions:any[]=[];
  fs.writeFileSync(path.join(dir,"plan-contenus-medias.json"),JSON.stringify({isDemo:true,provenance:DEMO_PROVENANCE,media:f.media.map(({asset:_id,...m})=>m),missing:f.missing,visualValidation:f.missing.length?"BLOQUÉE — pack photo absent ou incomplet":"À inspecter",pages:Object.entries(spec.templates).filter(([key])=>key==="index"||key===(kind==="products"?"product.editorial":"page.piece")).map(([page,t])=>({page,sections:t.order.map(id=>({id,...t.sections[id]}))}))},null,2)+"\n");
  fs.writeFileSync(path.join(dir,"theme-spec.json"),JSON.stringify(spec,null,2)+"\n");
  for(const platform of ["shopify","woocommerce","prestashop","wix","squarespace"]as const){const exp=await cmsExport(platform,spec,libraryLoader);fs.writeFileSync(path.join(dir,platform+".zip"),exp.zip);exports.push({platform,kind:exp.kind,bytes:exp.zip.length,issues:exp.issues,installed:false,checkoutVerified:false});}
  for(const [name,route]of [["accueil","/"],[kind==="products"?"produit":"prestation",f.detail]])for(const width of [1440,390,768,1024]){
   const device=width===390?"mobile":"ordinateur",page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});await attach(page);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
   assert.equal((await page.goto(origin+base+route,{waitUntil:"networkidle"}))?.status(),200);await loaded(page);
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,h1:document.querySelectorAll("h1").length,images:document.images.length,brokenImages:[...document.images].filter(im=>!im.naturalWidth).map(im=>im.src),missingMedia:document.querySelectorAll(".ed-media--pending").length,fonts:document.fonts.status}));
   assert.equal(metrics.h1,1);assert.ok(metrics.scrollWidth<=width+1,`${kind}/${name}/${width} déborde : ${metrics.scrollWidth}`);assert.deepEqual(metrics.brokenImages,[]);
   if(width===1440||width===390){await page.screenshot({path:path.join(dir,`${name}-${device}.png`),fullPage:true});await sharp(path.join(dir,`${name}-${device}.png`)).resize({width:width===1440?720:390}).webp({quality:80}).toFile(path.join(dir,`${name}-${device}-apercu.webp`));await page.screenshot({path:path.join(dir,`${name}-entete-${device}.png`)});await page.locator(".es-footer").screenshot({path:path.join(dir,`${name}-pied-${device}.png`)});
    if(kind==="products"&&name==="produit"){
     const purchase=page.locator("[data-purchase]");assert.equal(await purchase.count(),1);
     for(const [q,cents] of [[1,7900],[2,14220],[3,20145],[4,25280]]){await purchase.locator(`input[data-quantity='${q}']`).check();assert.equal(await purchase.locator("[data-offer-variants] select").count(),q);assert.equal(await purchase.locator("[data-gift].is-unlocked").count(),q>=3?1:0);if(q<4)await purchase.screenshot({path:path.join(dir,`achat-${q}-${device}.png`)});interactions.push({width,quantity:q,expectedTotal:cents,display:await purchase.locator("[data-purchase-total]").textContent()});}
     await purchase.locator("input[data-quantity='3']").check();await purchase.locator("[data-purchase-finishes] input").nth(2).check();assert.equal(await purchase.locator("[data-offer-variants] select").first().inputValue(),"1002");await purchase.locator("[data-offer-variants] select").nth(1).selectOption("1001");
     await purchase.locator("[data-purchase-add]").click();await page.waitForURL("**/cart");assert.match(await page.locator(".es-cart__summary").innerText(),/201,45/);assert.equal(await page.locator("[data-cart-qty]:disabled").count(),1);await page.screenshot({path:path.join(dir,`panier-trio-${device}.png`),fullPage:true});
     // Retour au produit, trio uniforme : modification de la quantité réellement soumise au serveur.
     await page.goto(origin+base+f.detail,{waitUntil:"networkidle"});await page.locator("[data-purchase] input[data-quantity='3']").check();await page.locator("[data-purchase-add]").click();await page.waitForURL("**/cart");await page.locator("[data-cart-qty]").first().fill("2");await page.locator("button[name='update']").click();await page.waitForLoadState("networkidle");assert.match(await page.locator(".es-cart__summary").innerText(),/142,20/);assert.equal(await page.locator(".es-cart .es-line-item").count(),1);await page.screenshot({path:path.join(dir,`panier-duo-${device}.png`),fullPage:true});await page.locator(".es-line-item__remove").first().click();await page.waitForLoadState("networkidle");assert.equal(await page.locator(".es-cart .es-line-item").count(),0);
    }
    if(kind==="services"&&name==="prestation"){
     const form=page.locator(".ed-form");await form.locator("[name='contact[name]']").fill("Visiteur de test");await form.locator("[name='contact[email]']").fill("visitor@example.invalid");await form.locator("select").selectOption("Cuisine");await form.locator("textarea").fill("Repenser la circulation et conserver la table existante.");await form.locator("button[type='submit']").click();await page.locator("[data-contact-status][data-receipt]").waitFor();assert.match(await page.locator("[data-contact-status]").innerText(),/Aucun e-mail envoyé/);assert.ok(fs.existsSync(previewContactFile(pid)));await form.screenshot({path:path.join(dir,`contact-recu-${device}.png`)});interactions.push({width,contact:"Écriture locale réellement constatée, aucun envoi",receipts:JSON.parse(fs.readFileSync(previewContactFile(pid),"utf8")).length});
    }
   }
   assert.deepEqual(errors,[]);pages.push({name,route,width,metrics,javascriptErrors:errors});await page.close();
  }
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});await attach(reduced);await reduced.goto(origin+base+"/",{waitUntil:"networkidle"});assert.equal(await reduced.evaluate(()=>document.getAnimations().filter(a=>a.playState==="running").length),0);await reduced.close();
  if(process.env.PROOF_VIDEO!=="0")for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:900},recordVideo:{dir,size:{width,height:width===390?844:900}}}),page=await context.newPage();await attach(page);
   for(const route of ["/",f.detail]){await page.goto(origin+base+route,{waitUntil:"networkidle"});await page.waitForTimeout(700);await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight*.7){scrollTo({top:y,behavior:"smooth"});await new Promise(r=>setTimeout(r,400));}});}
   if(kind==="products"){const purchase=page.locator("[data-purchase]");await purchase.scrollIntoViewIfNeeded();for(const q of [1,2,3,4,2]){await purchase.locator(`input[data-quantity='${q}']`).check();await page.waitForTimeout(650);}await purchase.locator("[data-purchase-finishes] input").nth(1).check();await page.waitForTimeout(500);await purchase.locator("[data-purchase-add]").click();await page.waitForURL("**/cart");await page.waitForTimeout(900);}
   else{await page.locator("[data-narrative-chapter] summary").nth(1).click();await page.waitForTimeout(800);await page.locator(".v2-faq summary").first().click();await page.waitForTimeout(700);const form=page.locator(".ed-form");await form.scrollIntoViewIfNeeded();await form.locator("[name='contact[name]']").fill("Visiteur vidéo");await form.locator("[name='contact[email]']").fill("video@example.invalid");await form.locator("select").selectOption("Salon");await form.locator("textarea").fill("Un salon pour lire et recevoir.");await form.locator("button[type='submit']").click();await page.locator("[data-contact-status][data-receipt]").waitFor();await page.waitForTimeout(1000);}
   const video=page.video()!;await context.close();const webm=await video.path(),name=`parcours-${width===390?"mobile":"ordinateur"}`;fs.renameSync(webm,path.join(dir,name+".webm"));execFileSync("ffmpeg",["-y","-i",path.join(dir,name+".webm"),"-c:v","libx264","-preset","fast","-crf","24","-pix_fmt","yuv420p","-movflags","+faststart",path.join(dir,name+".mp4")],{stdio:"ignore"});
  }
  evidence.push({kind,provenance:DEMO_PROVENANCE,mediaCount:f.media.length,missing:f.missing,visualResult:f.missing.length?"PARTIEL — rendu photographique bloqué":"À inspecter",pages,interactions,exports,paidCalls:all("SELECT 1 FROM ai_calls WHERE project_id=?",pid).length});
 });
 fs.writeFileSync(path.join(out,"preuves.json"),JSON.stringify({testedCommit:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),workingTree:execFileSync("git",["status","--porcelain","--","src","theme-base","tests","scripts"],{encoding:"utf8"}).trim()?"modified":"clean",date:new Date().toISOString(),evidence},null,2)+"\n");console.log(JSON.stringify({ok:true,output:out,media:evidence.map(e=>e.mediaCount),pages:evidence.map(e=>e.pages.length)}));
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(temp,{recursive:true,force:true});}
