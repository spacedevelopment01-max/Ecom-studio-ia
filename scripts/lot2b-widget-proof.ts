/** Contrôles Chromium ciblés, base temporaire : finition → fiche, clavier et navigation de services.
 * npx tsx scripts/lot2b-widget-proof.ts reports/lot2b
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";

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
const results:any[]=[];
try{
 for(const kind of ["products","services"] as const)await runWithLang({content:"fr",ui:"fr"},async()=>{
  const {spec,pid,detail,media}=await editorialProject(user.id,kind,process.argv[3]),version=saveThemeVersion(pid,spec,"Vérification isolée des composants","user"),base=`/preview/${pid}/v/${previewSegment(version.id,user.id,pid)}`;
  const page=await browser.newPage({viewport:{width:1440,height:900}});await page.addInitScript("window.__name=(fn)=>fn");await page.route("**/*",r=>r.request().url().startsWith(origin+"/")?r.continue():r.abort());
  assert.equal((await page.goto(origin+base+"/?es_raw=1",{waitUntil:"networkidle"}))?.status(),200);
  if(kind==="products"){
   const finishes=page.locator("[data-ed-finishes]");assert.equal(await finishes.count(),1);await finishes.locator("input[value='1002']").check();
   assert.equal(await finishes.locator("[data-finish-view]:not([hidden])").getAttribute("data-finish-view"),"1002");assert.equal(await page.locator("[data-offer-variants] select").first().inputValue(),"1002");
   const cta=finishes.locator("[data-finish-link]");assert.match((await cta.getAttribute("href"))!,/variant=1002/);await cta.click();await page.waitForLoadState("networkidle");assert.match(page.url(),/variant=1002/);assert.equal(await page.locator("[data-offer-variants] select").first().inputValue(),"1002");
   const offer=page.locator(".purchase__offers input[data-quantity='2']");await offer.focus();await page.keyboard.press("ArrowDown");assert.equal(await page.locator(".purchase__offers input:checked").getAttribute("data-quantity"),"3");await page.keyboard.press("ArrowUp");assert.equal(await page.locator(".purchase__offers input:checked").getAttribute("data-quantity"),"2");
   if(media.length){
    const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.addInitScript("window.__name=(fn)=>fn");await mobile.route("**/*",r=>r.request().url().startsWith(origin+"/")?r.continue():r.abort());await mobile.goto(origin+base+detail+"?es_raw=1",{waitUntil:"networkidle"});
    const track=mobile.locator('[data-gallery-track]'),rect=await track.boundingBox();assert.ok(rect);const touch=await mobile.context().newCDPSession(mobile),y=Math.min(rect.y+rect.height/2,650);
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:320,y}]});for(let x=280;x>=80;x-=40){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await mobile.waitForTimeout(40);}await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(700);assert.ok(await track.evaluate(el=>el.scrollLeft)>150);await mobile.screenshot({path:path.join(out,'galerie-geste-tactile.png')});results.push({kind,touchGallery:'Geste tactile Chromium natif, déplacement supérieur à 150 px',quickVisible:await mobile.locator('[data-purchase-quick]').isVisible()});await mobile.close();
   }
   results.push({kind,finish:"Vue Charbon et premier article synchronisés",cta:"Sélection conservée vers la fiche",keyboard:"Offres duo → trio → duo",actualPhotos:media.length,galleryAndZoom:media.length?"Vérifiés dans lot2b-proof.ts":"non vérifiés — pack manquant"});
  }else{
   await page.locator(".es-header__nav a[href$='/pages/accompagnements']").click();await page.waitForLoadState("networkidle");assert.match(page.url(),/pages\/accompagnements/);assert.equal(await page.locator("h1").count(),1);
   await page.locator("[data-narrative-chapter] summary").nth(1).click();
   await page.locator("main a[href$='/pages/amenagement-une-piece']").click();await page.waitForLoadState("networkidle");assert.match(page.url(),/pages\/amenagement-une-piece/);assert.equal(await page.locator("h1").count(),1);
   await page.locator(".es-header__nav a[href$='/pages/inspirations']").click();await page.waitForLoadState("networkidle");assert.match(page.url(),/pages\/inspirations/);assert.ok(await page.locator("main").innerText().then(t=>t.includes("démonstration")));
   assert.equal((await page.goto(origin+base+"/pages/contact?es_raw=1",{waitUntil:"networkidle"}))?.status(),200);assert.equal(await page.locator(".ed-form").count(),1);
   results.push({kind,navigation:["Accueil → accompagnements","Accompagnements → prestation","Prestation → inspirations","Contact"],h1:"unique sur les destinations",paidCalls:all("SELECT 1 FROM ai_calls WHERE project_id=?",pid).length});
  }
  await page.close();
 });
 fs.writeFileSync(path.join(out,"widget-checks.json"),JSON.stringify(results,null,2)+"\n");console.log(JSON.stringify(results));
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(temp,{recursive:true,force:true});}
