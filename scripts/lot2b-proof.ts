/** Preuves via les vraies routes d'aperçu : base isolée, réseau fournisseur interdit.
 * CHROMIUM=/usr/bin/chromium npx tsx scripts/lot2b-proof.ts reports/lot2b [dossier-du-pack-extrait]
 * Le dossier média est facultatif : les captures restent explicitement incomplètes s'il manque.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {unzipSync} from "fflate";
import {execFileSync} from "node:child_process";
import {chromium,type Page} from "playwright";
if(process.env.DATA_DIR||process.env.DATABASE_FILE)throw new Error("Base existante refusée");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ecs-lot2b-"));process.env.DATA_DIR=temp;process.env.STOCK_OFFLINE="1";
globalThis.fetch=async()=>{throw new Error("Réseau fournisseur interdit");};
const out=path.resolve(process.argv[2]??"reports/lot2b");fs.mkdirSync(out,{recursive:true});
const {editorialProject,DEMO_PROVENANCE}=await import("../tests/lot2b-fixtures");
const {createUser}=await import("../src/lib/auth");const {all}=await import("../src/lib/db");
const {saveThemeVersion,currentTheme}=await import("../src/lib/projects");const {previewSegment}=await import("../src/lib/theme/preview-access");
const {GET,POST}=await import("../src/app/preview/[id]/v/[vid]/[[...path]]/route");
const {cmsExport}=await import("../src/lib/cms-v2/export");const {libraryLoader}=await import("../src/lib/theme/loader");
const {themeAssetBinary}=await import("../src/lib/theme/compile");
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
  const compiledHashes=new Map<string,string>();for(const media of f.media){const original=await libraryLoader(media.asset);assert.ok(original);assert.equal(createHash('sha256').update(original.data).digest('hex'),media.sha256);const compiled=await themeAssetBinary(spec,media.file,libraryLoader);assert.ok(compiled);compiledHashes.set(media.file,createHash('sha256').update(compiled.data).digest('hex'));}
  const base=`/preview/${pid}/v/${previewSegment(version.id,user.id,pid)}`,dir=path.join(out,kind==="products"?"orbe":"atelier-rive");fs.mkdirSync(dir,{recursive:true});
  const pages:any[]=[],exports:any[]=[],interactions:any[]=[];
  fs.writeFileSync(path.join(dir,"plan-contenus-medias.json"),JSON.stringify({isDemo:true,provenance:DEMO_PROVENANCE,media:f.media.map(({asset:_id,...m})=>m),missing:f.missing,visualValidation:f.missing.length?"BLOQUÉE — pack photo absent ou incomplet":"À inspecter",pages:Object.entries(spec.templates).filter(([key])=>key==="index"||key===(kind==="products"?"product.editorial":"page.piece")).map(([page,t])=>({page,sections:t.order.map(id=>({id,...t.sections[id]}))}))},null,2)+"\n");
  fs.writeFileSync(path.join(dir,"theme-spec.json"),JSON.stringify(spec,null,2)+"\n");
  if(process.env.PROOF_EXPORTS!=="0")for(const platform of ["shopify","woocommerce","prestashop","wix","squarespace"]as const){const exp=await cmsExport(platform,spec,libraryLoader);fs.writeFileSync(path.join(dir,platform+".zip"),exp.zip);const files=unzipSync(exp.zip);for(const media of f.media){assert.ok(Object.entries(files).some(([name,bytes])=>name.endsWith('/'+media.file)&&createHash('sha256').update(bytes).digest('hex')===compiledHashes.get(media.file)),`${platform}: média absent ou altéré ${media.role}`);}if(!f.missing.length)assert.ok(!exp.issues.some(i=>i.code==='editorial_media_missing'));exports.push({platform,kind:exp.kind,bytes:exp.zip.length,verifiedMedia:f.media.length,issues:exp.issues,installed:false,checkoutVerified:false});}
  for(const [name,route]of [["accueil","/"],[kind==="products"?"produit":"prestation",f.detail]])for(const width of [1440,390,768,1024]){
   const device=width===390?"mobile":"ordinateur",page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});await attach(page);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
   assert.equal((await page.goto(origin+base+route+"?es_raw=1",{waitUntil:"networkidle"}))?.status(),200);await loaded(page);
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,h1:document.querySelectorAll("h1").length,images:document.images.length,brokenImages:[...document.images].filter(im=>!im.naturalWidth).map(im=>im.src),missingMedia:document.querySelectorAll(".ed-media--pending").length,fonts:document.fonts.status}));
   assert.equal(metrics.h1,1);assert.ok(metrics.scrollWidth<=width+1,`${kind}/${name}/${width} déborde : ${metrics.scrollWidth}`);assert.deepEqual(metrics.brokenImages,[]);
   if(width===768||width===1024){await page.screenshot({path:path.join(dir,`${name}-${width}-revue.png`),fullPage:true});await page.screenshot({path:path.join(dir,`${name}-${width}-entete.png`)});}
   if(width===1440||width===390){await page.screenshot({path:path.join(dir,`${name}-${device}.png`),fullPage:true});await sharp(path.join(dir,`${name}-${device}.png`)).resize({width:width===1440?720:390}).webp({quality:80}).toFile(path.join(dir,`${name}-${device}-apercu.webp`));await page.screenshot({path:path.join(dir,`${name}-entete-${device}.png`)});await page.locator(".es-footer").screenshot({path:path.join(dir,`${name}-pied-${device}.png`)});
    if(kind==="products"&&name==="produit"){
     const purchase=page.locator("[data-purchase]");assert.equal(await purchase.count(),1);
     await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(200);
     if(width===390){const quick=page.locator('[data-purchase-quick]');assert.ok(await quick.isVisible());const bounds=await quick.boundingBox();assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=844);assert.match(await quick.innerText(),/142,20/);interactions.push({width,firstScreenPurchase:true,quickSelection:await quick.innerText(),mainButtonY:await page.locator('[data-purchase-add]').evaluate(el=>el.getBoundingClientRect().top+scrollY)});}
     if(f.media.length){
      await page.locator('[data-gallery-go="1"]').click();await page.waitForTimeout(450);
      await page.locator('[data-media-id="m1-2"] [data-zoom-open]').click();assert.ok(await page.locator('dialog[open]').isVisible());assert.match((await page.locator('[data-zoom-stage] img').getAttribute('src'))!,/orbe-09-charbon/);
      if(width===390)assert.equal(await page.locator('[data-purchase-quick]').isVisible(),false);
      await page.locator('[data-zoom-stage] img').evaluate(async(im)=>{await (im as HTMLImageElement).decode();});await page.screenshot({path:path.join(dir,`galerie-zoom-${device}.png`)});await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);assert.ok(await page.locator('[data-media-id="m1-2"] [data-zoom-open]').evaluate(el=>document.activeElement===el));
      await page.locator('[data-purchase-finishes] input[value="1001"]').check();await page.waitForTimeout(450);assert.ok(await page.locator('[data-gallery-go="2"]').evaluate(el=>el.classList.contains('is-active')));
      await page.reload({waitUntil:'networkidle'});await loaded(page);
      for(const media of f.media){const res=await page.request.get(origin+base+'/assets/'+media.file);assert.equal(res.status(),200);assert.equal(createHash('sha256').update(await res.body()).digest('hex'),compiledHashes.get(media.file));}
      assert.deepEqual(currentTheme(pid)!.spec.files,spec.files);interactions.push({width,gallery:'Charbon → zoom réel → fermeture clavier → Argile',mediaReloaded:f.media.length,hashesAfterReload:true});
     }
     for(const [q,cents] of [[1,7900],[2,14220],[3,20145],[4,25280]]){await purchase.locator(`input[data-quantity='${q}']`).check();assert.equal(await purchase.locator("[data-offer-variants] select").count(),q);assert.equal(await purchase.locator("[data-gift].is-unlocked").count(),q>=3?1:0);if(width===390)assert.equal(await purchase.locator('[data-quick-total]').textContent(),await purchase.locator('[data-purchase-total]').textContent());if(q<4)await purchase.screenshot({path:path.join(dir,`achat-${q}-${device}.png`)});interactions.push({width,quantity:q,expectedTotal:cents,display:await purchase.locator("[data-purchase-total]").textContent()});}
     await purchase.locator("input[data-quantity='3']").check();await purchase.locator("[data-purchase-finishes] input").nth(2).check();assert.equal(await purchase.locator("[data-offer-variants] select").first().inputValue(),"1002");await purchase.locator("[data-offer-variants] select").nth(1).selectOption("1001");
     await purchase.locator("[data-purchase-add]").click();await page.waitForURL("**/cart");assert.match(await page.locator(".es-cart__summary").innerText(),/201,45/);assert.equal(await page.locator("[data-cart-qty]:disabled").count(),1);await page.screenshot({path:path.join(dir,`panier-trio-${device}.png`),fullPage:true});
     // Retour au produit, trio uniforme : modification de la quantité réellement soumise au serveur.
     await page.goto(origin+base+f.detail+"?es_raw=1",{waitUntil:"networkidle"});await page.locator("[data-purchase] input[data-quantity='3']").check();await page.locator("[data-purchase-add]").click();await page.waitForURL("**/cart");await page.locator("[data-cart-qty]").first().fill("2");await page.locator("button[name='update']").click();await page.waitForLoadState("networkidle");assert.match(await page.locator(".es-cart__summary").innerText(),/142,20/);assert.equal(await page.locator(".es-cart .es-line-item").count(),1);await page.screenshot({path:path.join(dir,`panier-duo-${device}.png`),fullPage:true});await page.locator(".es-line-item__remove").first().click();await page.waitForLoadState("networkidle");assert.equal(await page.locator(".es-cart .es-line-item").count(),0);
     if(width===390){
      await page.goto(origin+base+f.detail+'?es_raw=1',{waitUntil:'networkidle'});await page.locator('[data-menu-open]').click();assert.equal(await page.locator('[data-purchase-quick]').isVisible(),false);await page.keyboard.press('Escape');assert.ok(await page.locator('[data-purchase-quick]').isVisible());
      await page.locator('[data-quick-options]').click();assert.ok(await page.locator('.purchase__offers').evaluate(el=>document.activeElement===el));await page.locator('[data-purchase] input[data-quantity="3"]').check();await page.locator('[data-offer-variants] select').nth(1).selectOption('1002');await page.locator('[data-offer-variants] select').nth(2).selectOption('1001');
      await page.locator('h1').click();await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(200);assert.match(await page.locator('[data-purchase-quick]').innerText(),/Dune \+ Charbon \+ Argile/);assert.match(await page.locator('[data-purchase-quick]').innerText(),/201,45/);await page.locator('[data-quick-add]').click();await page.waitForURL('**/cart');assert.match(await page.locator('.es-cart__summary').innerText(),/201,45/);assert.equal(await page.locator('[data-cart-qty]:disabled').count(),1);assert.equal(await page.locator('[data-purchase-quick]').count(),0);interactions.push({width,quickBuy:'Trio Dune + Charbon + Argile → panier serveur 201,45 €, une pochette',menuOverlay:'barre masquée',editOptions:'focus et accès au bloc réel'});
     }
    }
    if(kind==="services"&&name==="prestation"){
     const form=page.locator(".ed-form");await form.locator("[name='contact[name]']").fill("Visiteur de test");await form.locator("[name='contact[email]']").fill("visitor@example.invalid");await form.locator("select").selectOption("Cuisine");await form.locator("textarea").fill("Repenser la circulation et conserver la table existante.");await form.locator("button[type='submit']").click();await page.locator("[data-contact-status][data-receipt]").waitFor();assert.match(await page.locator("[data-contact-status]").innerText(),/Aucun e-mail envoyé/);assert.ok(fs.existsSync(previewContactFile(pid)));await form.screenshot({path:path.join(dir,`contact-recu-${device}.png`)});interactions.push({width,contact:"Écriture locale réellement constatée, aucun envoi",receipts:JSON.parse(fs.readFileSync(previewContactFile(pid),"utf8")).length});
    }
   }
   if(kind==='services'){assert.equal(await page.locator('.es-footer .ref-footer__signature').count(),1);assert.equal(await page.locator('.es-footer .es-footer__brand').count(),0);}
   assert.deepEqual(errors,[]);pages.push({name,route,width,metrics,javascriptErrors:errors});await page.close();
  }
  if(kind==="products"){
   const noStock=structuredClone(spec);noStock.store.products![0].variants[0].inventory_quantity=0;
   const state=saveThemeVersion(pid,noStock,"Test isolé — cadeau indisponible","user"),page=await browser.newPage({viewport:{width:390,height:844}});await attach(page);
   await page.goto(origin+`/preview/${pid}/v/${previewSegment(state.id,user.id,pid)}`+f.detail+"?es_raw=1",{waitUntil:"networkidle"});await page.locator("[data-purchase] input[data-quantity='3']").check();assert.equal(await page.locator("[data-gift].is-unlocked").count(),0);await page.locator("[data-purchase]").screenshot({path:path.join(dir,"achat-cadeau-indisponible-mobile.png")});interactions.push({quantity:3,gift:"indisponible — stock zéro vérifié dans Chromium"});await page.close();
  }
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});await attach(reduced);await reduced.goto(origin+base+"/?es_raw=1",{waitUntil:"networkidle"});await reduced.locator("[data-menu-open]").click();assert.equal(await reduced.locator("[data-menu-open]").getAttribute("aria-expanded"),"true");await reduced.keyboard.press("Escape");assert.equal(await reduced.locator("[data-menu-open]").getAttribute("aria-expanded"),"false");assert.ok(await reduced.locator("[data-menu-open]").evaluate(el=>document.activeElement===el));
  assert.equal(await reduced.evaluate(()=>document.getAnimations().filter(a=>a.playState==="running").length),0);await reduced.close();
  if(process.env.PROOF_VIDEO!=="0")for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:900},recordVideo:{dir,size:{width,height:width===390?844:900}}}),page=await context.newPage();await attach(page);
   for(const route of ["/",f.detail]){await page.goto(origin+base+route+"?es_raw=1",{waitUntil:"networkidle"});await page.waitForTimeout(800);
    if(kind==='products'&&route===f.detail&&f.media.length){await page.locator('[data-gallery-go="1"]').click();await page.waitForTimeout(600);await page.locator('[data-media-id="m1-2"] [data-zoom-open]').click();await page.waitForTimeout(900);await page.locator('[data-zoom-step="1"]').click();await page.waitForTimeout(700);await page.keyboard.press('Escape');}
    await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight*.7){scrollTo({top:y,behavior:"smooth"});await new Promise(r=>setTimeout(r,650));}});await page.waitForTimeout(600);
    if(route==='/'&&kind==='products'){await page.locator('[data-ed-finishes]').scrollIntoViewIfNeeded();for(const id of ['1002','1001']){await page.locator('[data-ed-finishes] input[value="'+id+'"]').check();await page.waitForTimeout(900);}}
    if(route==='/'&&kind==='services'){await page.locator('[data-narrative-chapter] summary').nth(1).click();await page.waitForTimeout(1000);await page.locator('[data-narrative-chapter] summary').nth(2).click();await page.waitForTimeout(1000);}
   }
   if(kind==="products"){const purchase=page.locator("[data-purchase]");await purchase.scrollIntoViewIfNeeded();for(const q of [1,2,3,4,2]){await purchase.locator(`input[data-quantity='${q}']`).check();await page.waitForTimeout(650);}await purchase.locator("[data-purchase-finishes] input").nth(1).check();await page.waitForTimeout(500);if(width===390){await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.locator('h1').click();await page.waitForTimeout(900);await page.locator('[data-quick-add]').click();}else await purchase.locator("[data-purchase-add]").click();await page.waitForURL("**/cart");await page.waitForTimeout(900);}
   else{await page.locator("[data-narrative-chapter] summary").nth(1).click();await page.waitForTimeout(800);await page.locator(".v2-faq summary").first().click();await page.waitForTimeout(700);const form=page.locator(".ed-form");await form.scrollIntoViewIfNeeded();await form.locator("[name='contact[name]']").fill("Visiteur vidéo");await form.locator("[name='contact[email]']").fill("video@example.invalid");await form.locator("select").selectOption("Salon");await form.locator("textarea").fill("Un salon pour lire et recevoir.");await form.locator("button[type='submit']").click();await page.locator("[data-contact-status][data-receipt]").waitFor();await page.waitForTimeout(1000);}
   const video=page.video()!;await context.close();const webm=await video.path(),name=`parcours-${width===390?"mobile":"ordinateur"}`;fs.renameSync(webm,path.join(dir,name+".webm"));execFileSync("ffmpeg",["-y","-i",path.join(dir,name+".webm"),"-c:v","libx264","-preset","fast","-crf","24","-pix_fmt","yuv420p","-movflags","+faststart",path.join(dir,name+".mp4")],{stdio:"ignore"});
  }
  evidence.push({kind,provenance:DEMO_PROVENANCE,mediaCount:f.media.length,missing:f.missing,visualResult:f.missing.length?"PARTIEL — rendu photographique bloqué":"À inspecter",pages,interactions,exports,paidCalls:all("SELECT 1 FROM ai_calls WHERE project_id=?",pid).length});
 });
 fs.writeFileSync(path.join(out,"preuves.json"),JSON.stringify({testedCommit:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),workingTree:execFileSync("git",["status","--porcelain","--","src","theme-base","tests","scripts"],{encoding:"utf8"}).trim()?"modified":"clean",date:new Date().toISOString(),renderMode:"es_raw=1 — thème issu des vraies routes, sans le bandeau flottant du studio",evidence},null,2)+"\n");console.log(JSON.stringify({ok:true,output:out,media:evidence.map(e=>e.mediaCount),pages:evidence.map(e=>e.pages.length)}));
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(temp,{recursive:true,force:true});}
