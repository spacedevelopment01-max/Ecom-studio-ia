/** Preuves de la variante « direction artistique » ORBE / Atelier Rive, via les vraies routes d'aperçu.
 * Base isolée, réseau fournisseur interdit, aucun appel IA. Les captures contenant les photos du pack sont
 * écrites dans le dossier donné (privé) et ne sont jamais ajoutées au dépôt.
 *
 *   CHROMIUM=/chemin/chrome npx tsx scripts/lot2b-da-proof.ts <dossier-de-sortie> <dossier-du-pack-extrait>
 *   PROOF_VIDEO=0 pour sauter les vidéos ; PROOF_WIDTHS=1440,390 pour limiter les largeurs.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {chromium,type Page} from "playwright";
if(process.env.DATA_DIR||process.env.DATABASE_FILE)throw new Error("Base existante refusée");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ecs-lot2b-da-"));process.env.DATA_DIR=temp;process.env.STOCK_OFFLINE="1";
globalThis.fetch=async()=>{throw new Error("Réseau fournisseur interdit");};
const out=path.resolve(process.argv[2]??"reports/lot2b-da");fs.mkdirSync(out,{recursive:true});
const mediaDir=process.argv[3];if(!mediaDir||!fs.existsSync(mediaDir))console.warn("Pack d'images absent : captures explicitement incomplètes (cadres « Visuel à importer »).");
const WIDTHS=(process.env.PROOF_WIDTHS??"1440,1024,768,390").split(",").map(Number);
const {editorialProject,DEMO_PROVENANCE}=await import("../tests/lot2b-fixtures");
const {createUser}=await import("../src/lib/auth");const {all}=await import("../src/lib/db");
const {saveThemeVersion}=await import("../src/lib/projects");const {previewSegment}=await import("../src/lib/theme/preview-access");
const {GET,POST}=await import("../src/app/preview/[id]/v/[vid]/[[...path]]/route");
const {cmsExport}=await import("../src/lib/cms-v2/export");const {libraryLoader}=await import("../src/lib/theme/loader");
const {previewContactFile}=await import("../src/lib/theme/preview-contact");const {runWithLang}=await import("../src/lib/i18n-server");
const sharp=(await import("sharp")).default;
const user=await createUser("editorial-da-proof@example.invalid","isolated-test-only","Preuve isolée");
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url!,"http://127.0.0.1"),m=url.pathname.match(/^\/preview\/([^/]+)\/v\/([^/]+)(?:\/(.*))?$/);if(!m)return res.writeHead(404).end();
 const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
 const request=new Request(url,{method:req.method,headers:req.headers as Record<string,string>,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
 const r=await(req.method==="POST"?POST:GET)(request,{params:Promise.resolve({id:m[1],vid:m[2],path:(m[3]??"").split("/").filter(Boolean)})});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
}catch(e){console.error(e);res.writeHead(500).end();}});
await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM??"/usr/bin/chromium",args:["--no-sandbox"]});
const evidence:any[]=[];
const device=(w:number)=>w===390?"mobile":w===768?"tablette":w===1024?"portable":"ordinateur";
const viewport=(w:number)=>({width:w,height:w===390?844:w===768?1024:900});
async function loaded(page:Page){await page.evaluate(async()=>{const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight*.8){scrollTo({top:y,behavior:"instant"});await pause(90);}await document.fonts.ready;await Promise.all([...document.images].map(async(im)=>{im.loading="eager";await im.decode().catch(()=>{});}));scrollTo({top:0,behavior:"instant"});});await page.waitForTimeout(900);}
async function attach(page:Page){await page.addInitScript("window.__name=(fn)=>fn");await page.route("**/*",r=>r.request().url().startsWith(origin+"/")?r.continue():r.abort());}
/** Capture pleine page sans la barre d'achat fixe (elle est photographiée à part, dans son vrai contexte de défilement). */
async function fullPage(page:Page,file:string){await page.addStyleTag({content:"[data-purchase-bar]{display:none!important}"});await page.screenshot({path:file,fullPage:true});await page.evaluate(()=>{const s=[...document.querySelectorAll("style")].pop();if(s&&s.textContent?.includes("data-purchase-bar"))s.remove();});}
try{
 for(const kind of ["products","services"]as const)await runWithLang({content:"fr",ui:"fr"},async()=>{
  const f=await editorialProject(user.id,kind,mediaDir),{spec,pid}=f,version=saveThemeVersion(pid,spec,"Direction artistique — composition isolée","user");
  const base=`/preview/${pid}/v/${previewSegment(version.id,user.id,pid)}`,dir=path.join(out,kind==="products"?"orbe":"atelier-rive");fs.mkdirSync(dir,{recursive:true});
  const pages:any[]=[],exports:any[]=[],interactions:any[]=[];
  fs.writeFileSync(path.join(dir,"plan-contenus-medias.json"),JSON.stringify({isDemo:true,provenance:DEMO_PROVENANCE,media:f.media.map(({asset:_id,...m})=>m),missing:f.missing,visualValidation:f.missing.length?"BLOQUÉE — pack photo absent ou incomplet":"À inspecter par Thomas",pages:Object.entries(spec.templates).filter(([key])=>key==="index"||key===(kind==="products"?"product.editorial":"page.piece")).map(([page,t])=>({page,sections:t.order.map(id=>({id,type:t.sections[id].type,media:[t.sections[id].settings.media_role,...Object.values(t.sections[id].blocks??{}).map(b=>b.settings.media_role)].filter(Boolean)}))}))},null,2)+"\n");
  fs.writeFileSync(path.join(dir,"theme-spec.json"),JSON.stringify(spec,null,2)+"\n");
  for(const platform of ["shopify","woocommerce","prestashop","wix","squarespace"]as const){const exp=await cmsExport(platform,spec,libraryLoader);fs.writeFileSync(path.join(dir,platform+".zip"),exp.zip);exports.push({platform,kind:exp.kind,bytes:exp.zip.length,issues:exp.issues.map(i=>i.code),installed:false,checkoutVerified:false});}
  const detailName=kind==="products"?"produit":"prestation";
  for(const [name,route]of [["accueil","/"],[detailName,f.detail]])for(const width of WIDTHS){
   const dev=device(width),page=await browser.newPage({viewport:viewport(width),isMobile:width===390,hasTouch:width===390});await attach(page);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
   assert.equal((await page.goto(origin+base+route+"?es_raw=1",{waitUntil:"networkidle"}))?.status(),200);await loaded(page);
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,h1:document.querySelectorAll("h1").length,h1Size:getComputedStyle(document.querySelector("h1")!).fontSize,h1Lines:Math.round(document.querySelector("h1")!.getBoundingClientRect().height/parseFloat(getComputedStyle(document.querySelector("h1")!).lineHeight)),images:document.images.length,brokenImages:[...document.images].filter(im=>!im.naturalWidth).map(im=>im.src),missingMedia:document.querySelectorAll(".ed-media--pending").length,fonts:document.fonts.status,headerHeight:document.querySelector(".es-header")?.getBoundingClientRect().height,addToCartTop:(document.querySelector("[data-main-product] [data-purchase-add]")as HTMLElement|null)?.getBoundingClientRect().top??null,featuredTop:(document.querySelector("[data-featured-purchase]")as HTMLElement|null)?.offsetTop??null,featuredStage:(()=>{const stage=document.querySelector("[data-featured-purchase] .fp__stage")as HTMLElement|null,img=document.querySelector("[data-featured-purchase] [data-fp-slide]:not([hidden]) img")as HTMLImageElement|null;return stage&&img?{stage:[stage.clientWidth,stage.clientHeight],img:[img.clientWidth,img.clientHeight],natural:[img.naturalWidth,img.naturalHeight],fit:getComputedStyle(img).objectFit,classes:stage.closest("section")?.className}:null;})()}));
   assert.equal(metrics.h1,1,`${kind}/${name}/${width} : ${metrics.h1} h1`);if(metrics.featuredStage){assert.ok(metrics.featuredStage.img[1]<=metrics.featuredStage.stage[1]+1&&metrics.featuredStage.img[0]<=metrics.featuredStage.stage[0]+1,`${kind}/${name}/${width} : visuel du produit à la une hors de sa scène`);assert.equal(metrics.featuredStage.fit,"contain");}assert.ok(metrics.scrollWidth<=width+1,`${kind}/${name}/${width} déborde : ${metrics.scrollWidth}`);assert.deepEqual(metrics.brokenImages,[]);
   await page.screenshot({path:path.join(dir,`${name}-entete-${dev}.png`)});
   await fullPage(page,path.join(dir,`${name}-${dev}.png`));
   if(width===1440||width===390)await sharp(path.join(dir,`${name}-${dev}.png`)).resize({width:width===1440?720:390}).webp({quality:80}).toFile(path.join(dir,`${name}-${dev}-apercu.webp`));
   await page.locator(".es-footer").screenshot({path:path.join(dir,`${name}-pied-${dev}.png`)});
   if(kind==="products"&&name==="accueil"&&(width===1440||width===390)){
    const fp=page.locator("[data-featured-purchase]");assert.equal(await fp.count(),1);await fp.scrollIntoViewIfNeeded();await page.waitForTimeout(500);
    for(const i of [0,1,2]){await fp.locator("[data-purchase-finishes] input").nth(i).check();await page.waitForTimeout(300);const fit=await fp.locator("[data-fp-slide]:not([hidden]) img").evaluate((el)=>{const img=el as HTMLImageElement;return ({w:img.clientWidth,h:img.clientHeight,sw:img.parentElement!.parentElement!.clientWidth,sh:img.parentElement!.parentElement!.clientHeight,nat:[img.naturalWidth,img.naturalHeight],fit:getComputedStyle(img).objectFit});});assert.ok(fit.h<=fit.sh+1&&fit.w<=fit.sw+1&&fit.fit==="contain",`finition ${i} : ${JSON.stringify(fit)}`);await fp.locator(".fp__stage").screenshot({path:path.join(dir,`produit-a-la-une-finition-${i}-${dev}.png`)});}
    await fp.locator("[data-purchase-finishes] input").nth(0).check();await page.waitForTimeout(300);
    assert.match(await fp.locator("[data-purchase-summary-label]").innerText(),/Total/);assert.match(await fp.locator("[data-purchase-unit-price]").innerText(),/par lampe/);assert.equal(await fp.locator("[data-price-note]").innerText(),"par lampe");
    await fp.screenshot({path:path.join(dir,`produit-a-la-une-${dev}.png`)});
    // Finition Charbon → le grand visuel devient le packshot Charbon ; trio → pochette débloquée ; lien vers la fiche avec la sélection.
    const charbon=fp.locator("[data-purchase-finishes] input").nth(2);await charbon.check();await page.waitForTimeout(350);
    const visible=await fp.locator("[data-fp-slide]:not([hidden]) img").getAttribute("src");assert.match(visible??"",/orbe-09-charbon|m1-2/);
    await fp.locator("input[data-quantity='3']").check();await page.waitForTimeout(300);assert.equal(await fp.locator("[data-gift].is-unlocked").count(),1);
    await fp.screenshot({path:path.join(dir,`produit-a-la-une-trio-${dev}.png`)});
    const link=await fp.locator("[data-fp-link]").getAttribute("href");assert.match(link??"",/variant=1002/);assert.match(link??"",/offer=offer_3/);
    await fp.locator("[data-purchase-add]").click();await page.waitForURL("**/cart");assert.match(await page.locator(".es-cart__summary").innerText(),/201,45/);await fullPage(page,path.join(dir,`panier-depuis-accueil-${dev}.png`));
    interactions.push({width,featured:"Charbon → visuel Charbon, trio → pochette, lien fiche avec variante et offre, ajout depuis l'accueil → 201,45 €",cart:await page.locator(".es-cart__summary").innerText()});
   }
   if(kind==="products"&&name==="produit"&&(width===1440||width===390)){
    const purchase=page.locator("[data-main-product] [data-purchase]");assert.equal(await purchase.count(),1);
    // Prix principal explicite : « 79,00 € par lampe » (libellé configurable), gros plan du haut de la fiche.
    const priceWrap=page.locator("[data-main-product] [data-price-wrap]");assert.equal(await priceWrap.locator("[data-price-note]").innerText(),"par lampe");assert.match(await priceWrap.innerText(),/79,00\s€/);
    {await page.locator("[data-main-product] h1").scrollIntoViewIfNeeded();await page.waitForTimeout(400);let h=await page.locator("[data-main-product] h1").boundingBox(),pb=await priceWrap.boundingBox();const vp=viewport(width);if(h&&pb&&pb.y+pb.height>vp.height){await priceWrap.scrollIntoViewIfNeeded();await page.waitForTimeout(400);pb=await priceWrap.boundingBox();h=pb?{...pb,y:Math.max(0,pb.y-120),height:120}:h;}if(h&&pb){const left=Math.max(0,Math.round(Math.min(h.x,pb.x)-12)),top=Math.max(0,Math.round(h.y-12)),w=Math.min(vp.width-left,Math.round(Math.max(h.width,pb.width)+24)),hh=Math.min(vp.height-top,Math.round(pb.y+pb.height-h.y+24));const shot=await page.screenshot();await sharp(shot).extract({left,top,width:w,height:hh}).toFile(path.join(dir,`fiche-prix-unitaire-${dev}.png`));}}
    assert.match(await purchase.locator("[data-purchase-unit-price]").innerText(),/par lampe/);
    for(const [q,cents] of [[1,7900],[2,14220],[3,20145],[4,25280]]){await purchase.locator(`input[data-quantity='${q}']`).check();assert.equal(await purchase.locator("[data-offer-variants] select").count(),q);assert.equal(await purchase.locator("[data-gift].is-unlocked").count(),q>=3?1:0);if(q<4)await purchase.screenshot({path:path.join(dir,`achat-${q}-${dev}.png`)});interactions.push({width,quantity:q,expectedTotal:cents,display:await purchase.locator("[data-purchase-total]").textContent()});}
    if(width===390){await page.evaluate(()=>scrollTo({top:300,behavior:"instant"}));await page.waitForTimeout(400);const bar=page.locator("[data-purchase-bar]");assert.equal(await bar.isHidden(),false,"barre d'achat mobile visible quand le bouton est hors écran");assert.match(await bar.innerText(),/Total 252,80/);assert.match(await bar.innerText(),/63,20\s€ par lampe/);await page.screenshot({path:path.join(dir,"barre-achat-mobile.png")});
     // Le bouton de la barre ajoute réellement la sélection (même parcours serveur), puis retour à la fiche.
     await purchase.locator("input[data-quantity='2']").check();await page.waitForTimeout(300);assert.match(await bar.innerText(),/Total 142,20/);assert.equal(await bar.locator("[data-purchase-bar-add]").innerText(),"Ajouter au panier");await bar.locator("[data-purchase-bar-add]").click();await page.waitForURL("**/cart");assert.match(await page.locator(".es-cart__summary").innerText(),/142,20/);assert.equal(await page.locator(".es-cart .es-line-item").count(),1);await fullPage(page,path.join(dir,"panier-depuis-barre-mobile.png"));interactions.push({width,bar:"ajout réel depuis la barre fixe → 142,20 €, une ligne"});
     await page.locator(".es-line-item__remove").first().click();await page.waitForLoadState("networkidle");await page.goto(origin+base+f.detail+"?es_raw=1",{waitUntil:"networkidle"});await loaded(page);}
    await purchase.locator("input[data-quantity='3']").check();await purchase.locator("[data-purchase-finishes] input").nth(2).check();assert.equal(await purchase.locator("[data-offer-variants] select").first().inputValue(),"1002");await purchase.locator("[data-offer-variants] select").nth(1).selectOption("1001");
    // La galerie suit la finition : vignette Charbon active (défilement doux de la galerie, puis contrôle).
    await page.waitForTimeout(900);assert.equal(await page.locator("[data-main-product] [data-gallery-go].is-active").getAttribute("data-gallery-go"),"1");
    if(width===1440){await page.locator("[data-main-product] [data-zoom-open]").nth(1).click();await page.waitForTimeout(300);assert.equal(await page.locator("[data-main-product] dialog[open]").count(),1);await page.screenshot({path:path.join(dir,"zoom-ordinateur.png")});await page.keyboard.press("Escape");}
    await purchase.locator("[data-purchase-add]").click();await page.waitForURL("**/cart");assert.match(await page.locator(".es-cart__summary").innerText(),/201,45/);assert.equal(await page.locator("[data-cart-qty]:disabled").count(),1);await fullPage(page,path.join(dir,`panier-trio-${dev}.png`));
    // Chaque ligne montre la variante réellement choisie : Charbon, Argile, Dune, puis la pochette ; idem dans le tiroir, dans cart.js et après rechargement.
    const lineImages=async()=>page.locator(".es-cart .es-line-item__media img").evaluateAll(els=>els.map(e=>(e as HTMLImageElement).currentSrc||e.getAttribute("src")||""));
    const expectImages=(srcs:string[],where:string)=>{assert.equal(srcs.length,4,`${where} : ${srcs.length} visuels`);[/orbe-09-charbon/,/orbe-10-argile/,/orbe-01-dune/,/orbe-12-pochette/].forEach((re,i)=>assert.match(srcs[i],re,`${where}, ligne ${i+1}`));assert.equal(new Set(srcs.slice(0,3)).size,3,`${where} : visuels identiques`);};
    expectImages(await lineImages(),"page panier");
    expectImages(await page.locator("[data-cart-drawer] .es-line-item__media img").evaluateAll(els=>els.map(e=>e.getAttribute("src")||"")),"tiroir");
    const cartData=await page.evaluate(async()=>(await (await fetch(location.pathname.replace(/\/cart$/,"/cart.js"),{headers:{accept:"application/json"}})).json()) as {items:{image:string|null}[]});expectImages(cartData.items.map(i=>i.image??""),"cart.js");
    await page.reload({waitUntil:"networkidle"});expectImages(await lineImages(),"après rechargement");await page.locator(".es-cart .es-line-items").screenshot({path:path.join(dir,`panier-trio-visuels-${dev}.png`)});interactions.push({width,cartImages:"Charbon, Argile, Dune, pochette : quatre visuels distincts (page, tiroir, cart.js, rechargement)"});
    await page.goto(origin+base+f.detail+"?es_raw=1",{waitUntil:"networkidle"});await page.locator("[data-main-product] input[data-quantity='3']").check();await page.locator("[data-main-product] [data-purchase-add]").click();await page.waitForURL("**/cart");await page.locator("[data-cart-qty]").first().fill("2");await page.locator("button[name='update']").click();await page.waitForLoadState("networkidle");assert.match(await page.locator(".es-cart__summary").innerText(),/142,20/);assert.equal(await page.locator(".es-cart .es-line-item").count(),1);assert.match(await page.locator(".es-cart .es-line-item__media img").first().getAttribute("src")??"",/orbe-01-dune/);await fullPage(page,path.join(dir,`panier-duo-${dev}.png`));await page.locator(".es-line-item__remove").first().click();await page.waitForLoadState("networkidle");assert.equal(await page.locator(".es-cart .es-line-item").count(),0);
   }
   if(kind==="services"&&name==="accueil"&&(width===1440||width===390)){
    const narrative=page.locator("[data-narrative]").first();await narrative.scrollIntoViewIfNeeded();await page.waitForTimeout(400);await narrative.screenshot({path:path.join(dir,`prestations-${dev}.png`)});
    await narrative.locator("[data-narrative-chapter] summary").nth(1).click();await page.waitForTimeout(450);assert.equal(await narrative.locator("[data-narrative-image]:not([hidden])").getAttribute("data-narrative-image"),"1");await narrative.screenshot({path:path.join(dir,`prestations-chapitre-2-${dev}.png`)});
    const study=page.locator(".ed-study");await study.scrollIntoViewIfNeeded();await page.waitForTimeout(400);await study.screenshot({path:path.join(dir,`etude-${dev}.png`)});
    const faq=page.locator(".v2-faq");await faq.locator("summary").first().click();await page.waitForTimeout(400);await faq.screenshot({path:path.join(dir,`questions-${dev}.png`)});
    interactions.push({width,narrative:"chapitre 2 → image bibliothèque",study:"deux vues légendées, simulation annoncée",faq:"première question ouverte"});
   }
   if(kind==="services"&&name==="prestation"&&(width===1440||width===390)){
    const form=page.locator(".ed-form");await form.locator("[name='contact[name]']").fill("Visiteur de test");await form.locator("[name='contact[email]']").fill("visitor@example.invalid");await form.locator("select").selectOption("Cuisine");await form.locator("textarea").fill("Repenser la circulation et conserver la table existante.");await form.locator("button[type='submit']").click();await page.locator("[data-contact-status][data-receipt]").waitFor();assert.match(await page.locator("[data-contact-status]").innerText(),/Aucun e-mail envoyé/);assert.ok(fs.existsSync(previewContactFile(pid)));await form.screenshot({path:path.join(dir,`contact-recu-${dev}.png`)});interactions.push({width,contact:"Écriture locale réellement constatée, aucun envoi",receipts:JSON.parse(fs.readFileSync(previewContactFile(pid),"utf8")).length});
    const compare=page.locator(".ref-offers--comparison");await compare.scrollIntoViewIfNeeded();await page.waitForTimeout(300);await compare.screenshot({path:path.join(dir,`comparaison-${dev}.png`)});
   }
   assert.deepEqual(errors,[]);pages.push({name,route,width,metrics,javascriptErrors:errors});await page.close();
  }
  if(kind==="products"){
   const noStock=structuredClone(spec);noStock.store.products![0].variants[0].inventory_quantity=0;
   const state=saveThemeVersion(pid,noStock,"Test isolé — cadeau indisponible","user"),page=await browser.newPage({viewport:{width:390,height:844}});await attach(page);
   await page.goto(origin+`/preview/${pid}/v/${previewSegment(state.id,user.id,pid)}`+f.detail+"?es_raw=1",{waitUntil:"networkidle"});await page.locator("[data-main-product] input[data-quantity='3']").check();assert.equal(await page.locator("[data-main-product] [data-gift].is-unlocked").count(),0);await page.locator("[data-main-product] [data-purchase]").screenshot({path:path.join(dir,"achat-cadeau-indisponible-mobile.png")});interactions.push({quantity:3,gift:"indisponible — stock zéro vérifié dans Chromium"});await page.close();
  }
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});await attach(reduced);await reduced.goto(origin+base+"/?es_raw=1",{waitUntil:"networkidle"});await reduced.locator("[data-menu-open]").click();assert.equal(await reduced.locator("[data-menu-open]").getAttribute("aria-expanded"),"true");await reduced.screenshot({path:path.join(dir,"menu-mobile.png")});await reduced.keyboard.press("Escape");assert.equal(await reduced.locator("[data-menu-open]").getAttribute("aria-expanded"),"false");assert.ok(await reduced.locator("[data-menu-open]").evaluate(el=>document.activeElement===el));
  assert.equal(await reduced.evaluate(()=>document.getAnimations().filter(a=>a.playState==="running").length),0);await reduced.close();
  if(process.env.PROOF_VIDEO!=="0")for(const width of [1440,390]){
   const context=await browser.newContext({viewport:viewport(width),recordVideo:{dir,size:viewport(width)}}),page=await context.newPage();await attach(page);
   const scroll=async()=>{await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight*.7){scrollTo({top:y,behavior:"smooth"});await new Promise(r=>setTimeout(r,520));}});};
   await page.goto(origin+base+"/?es_raw=1",{waitUntil:"networkidle"});await page.waitForTimeout(900);await scroll();
   if(kind==="products"){
    const fp=page.locator("[data-featured-purchase]");await fp.scrollIntoViewIfNeeded();await page.waitForTimeout(600);for(const i of [2,1,0]){await fp.locator("[data-purchase-finishes] input").nth(i).check();await page.waitForTimeout(650);}for(const q of [2,3,4,3]){await fp.locator(`input[data-quantity='${q}']`).check();await page.waitForTimeout(650);}
    await page.goto(origin+base+f.detail+"?es_raw=1",{waitUntil:"networkidle"});await page.waitForTimeout(800);const purchase=page.locator("[data-main-product] [data-purchase]");await page.locator("[data-main-product] [data-gallery-go]").nth(3).click();await page.waitForTimeout(700);await page.locator("[data-main-product] [data-gallery-go]").nth(0).click();await page.waitForTimeout(500);
    await purchase.scrollIntoViewIfNeeded();for(const q of [1,2,3]){await purchase.locator(`input[data-quantity='${q}']`).check();await page.waitForTimeout(650);}await purchase.locator("[data-purchase-finishes] input").nth(1).check();await page.waitForTimeout(600);await scroll();await purchase.scrollIntoViewIfNeeded();await purchase.locator("[data-purchase-add]").click();await page.waitForURL("**/cart");await page.waitForTimeout(1200);
   }else{
    await page.locator("[data-narrative-chapter] summary").nth(1).click();await page.waitForTimeout(900);await page.locator("[data-narrative-chapter] summary").nth(2).click();await page.waitForTimeout(900);await page.locator(".v2-faq summary").first().click();await page.waitForTimeout(700);
    await page.goto(origin+base+f.detail+"?es_raw=1",{waitUntil:"networkidle"});await page.waitForTimeout(800);await scroll();const form=page.locator(".ed-form");await form.scrollIntoViewIfNeeded();await form.locator("[name='contact[name]']").fill("Visiteur vidéo");await form.locator("[name='contact[email]']").fill("video@example.invalid");await form.locator("select").selectOption("Salon");await form.locator("textarea").fill("Un salon pour lire et recevoir.");await form.locator("button[type='submit']").click();await page.locator("[data-contact-status][data-receipt]").waitFor();await page.waitForTimeout(1200);
   }
   const video=page.video()!;await context.close();const webm=await video.path(),name=`parcours-${device(width)}`;fs.renameSync(webm,path.join(dir,name+".webm"));execFileSync("ffmpeg",["-y","-i",path.join(dir,name+".webm"),"-c:v","libx264","-preset","fast","-crf","24","-pix_fmt","yuv420p","-movflags","+faststart",path.join(dir,name+".mp4")],{stdio:"ignore"});
  }
  if(kind==="products"&&process.env.PROOF_VIDEO!=="0")for(const width of [1440,390]){
   const context=await browser.newContext({viewport:viewport(width),recordVideo:{dir,size:viewport(width)}}),page=await context.newPage();await attach(page);
   await page.goto(origin+base+f.detail+"?es_raw=1",{waitUntil:"networkidle"});await page.waitForTimeout(900);const purchase=page.locator("[data-main-product] [data-purchase]");await page.locator("[data-main-product] [data-price-wrap]").scrollIntoViewIfNeeded();await page.waitForTimeout(900);
   await purchase.scrollIntoViewIfNeeded();await page.waitForTimeout(500);await purchase.locator("input[data-quantity='3']").check();await page.waitForTimeout(700);
   for(const [i,v] of [[0,"1000"],[1,"1001"],[2,"1002"]] as const){await purchase.locator("[data-offer-variants] select").nth(i).selectOption(v);await page.waitForTimeout(650);}
   await purchase.locator("[data-purchase-summary-label]").scrollIntoViewIfNeeded();await page.waitForTimeout(700);await purchase.locator("[data-purchase-add]").click();await page.waitForURL("**/cart");await page.waitForTimeout(1000);
   await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight*.6){scrollTo({top:y,behavior:"smooth"});await new Promise(r=>setTimeout(r,650));}});await page.waitForTimeout(800);
   const video=page.video()!;await context.close();const webm=await video.path(),name=`panier-trois-finitions-${device(width)}`;fs.renameSync(webm,path.join(dir,name+".webm"));execFileSync("ffmpeg",["-y","-i",path.join(dir,name+".webm"),"-c:v","libx264","-preset","fast","-crf","24","-pix_fmt","yuv420p","-movflags","+faststart",path.join(dir,name+".mp4")],{stdio:"ignore"});
   // Retour à un panier vide pour la suite des preuves.
   const clean=await browser.newPage({viewport:viewport(width)});await attach(clean);await clean.goto(origin+base+"/cart?es_raw=1",{waitUntil:"networkidle"});while(await clean.locator(".es-line-item__remove").count()){await clean.locator(".es-line-item__remove").first().click();await clean.waitForLoadState("networkidle");}await clean.close();
  }
  evidence.push({kind,provenance:DEMO_PROVENANCE,mediaCount:f.media.length,missing:f.missing,visualResult:f.missing.length?"PARTIEL — rendu photographique bloqué":"À inspecter par Thomas",pages,interactions,exports,paidCalls:all("SELECT 1 FROM ai_calls WHERE project_id=?",pid).length});
 });
 fs.writeFileSync(path.join(out,"preuves.json"),JSON.stringify({testedCommit:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),workingTree:execFileSync("git",["status","--porcelain","--","src","theme-base","tests","scripts"],{encoding:"utf8"}).trim()?"modified":"clean",date:new Date().toISOString(),renderMode:"es_raw=1 — thème issu des vraies routes, sans le bandeau flottant du studio",widths:WIDTHS,evidence},null,2)+"\n");console.log(JSON.stringify({ok:true,output:out,media:evidence.map(e=>e.mediaCount),pages:evidence.map(e=>e.pages.length)}));
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(temp,{recursive:true,force:true});}
