import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import { afterAll,beforeEach,describe,it,expect,vi } from "vitest";
const session=vi.hoisted(()=>{
 const root=process.env.DATA_DIR;if(!root)throw new Error("Tests isolés obligatoires");
 const dir=process.getBuiltinModule("fs").mkdtempSync(`${root}/lot2b-`),shared=globalThis as {__ecomDb?:{close():void}},previousDb=shared.__ecomDb;delete shared.__ecomDb;vi.stubEnv("DATA_DIR",dir);return {dir,previousDb,token:""};
});
afterAll(()=>{const shared=globalThis as {__ecomDb?:{close():void}};if(shared.__ecomDb!==session.previousDb)shared.__ecomDb?.close();if(session.previousDb)shared.__ecomDb=session.previousDb;else delete shared.__ecomDb;vi.unstubAllEnvs();});
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>session.token?{value:session.token}:undefined,set:(_n:string,v:string)=>{session.token=v;},delete:()=>{}})}));
vi.mock("@/lib/ai/llm",async(original)=>({...await original<object>(),llmConfigured:()=>false}));
import { createUser,startSession } from "@/lib/auth";
import { editorialProject,MEDIA_ROLES } from "./lot2b-fixtures";
import { all } from "@/lib/db";
import { validateSpec,applyOps } from "@/lib/theme/ops";
import { renderPage } from "@/lib/theme/render";
import { addOfferToCart,reconcileOfferCart,sharedPurchaseSection } from "@/lib/theme/purchase-offers";
import { recordPreviewContact,previewContactFile } from "@/lib/theme/preview-contact";
import { missingEditorialMedia } from "@/lib/theme/editorial-media";
import { cmsExport } from "@/lib/cms-v2/export";
import { unzipSync,strFromU8 } from "fflate";
import { saveThemeVersion,currentTheme } from "@/lib/projects";
import { POST as manualRoute } from "@/app/api/projects/[id]/theme/ops/route";
import { POST as chatRoute } from "@/app/api/projects/[id]/theme/chat/route";
import { POST as restoreRoute } from "@/app/api/projects/[id]/theme/restore/route";
import { POST as previewPost } from "@/app/preview/[id]/v/[vid]/[[...path]]/route";
import { previewSegment } from "@/lib/theme/preview-access";
import { claimNext,completeJob,JobContext } from "@/lib/jobs";
import { handlers } from "../worker/handlers";
import { runWithLang } from "@/lib/i18n-server";
import { withProjectMedia } from "@/lib/theme/section-defaults";
import { contentContext } from "@/lib/theme/section-content";
import { saveAsset } from "@/lib/library";
import { libraryEntry } from "@/lib/theme/section-library";
import { compileTheme } from "@/lib/theme/compile";
beforeEach(()=>vi.stubGlobal("fetch",async()=>{throw new Error("Réseau externe interdit");}));
const fr=<T>(f:()=>T)=>runWithLang({content:"fr",ui:"fr"},f);
const total=(cart:ReturnType<typeof addOfferToCart>)=>cart.reduce((n,l)=>n+(l.finalLinePrice??0),0);
describe("Lot 2B — moteur éditorial et parcours isolés",async()=>{
 const user=await createUser(`lot2b-${Date.now()}@example.invalid`,"isolated-only","Test");
 it("construit quatre vraies pages, deux identités, un H1, sans visuel emprunté et sans fournisseur",async()=>fr(async()=>{
  for(const kind of ["products","services"] as const){const f=await editorialProject(user.id,kind);expect(validateSpec(f.spec)).toEqual([]);expect(f.spec.templates.index.order).toHaveLength(10);expect(f.missing).toHaveLength(12);expect(Object.keys(f.spec.files)).toHaveLength(0);
   for(const route of ["/",f.detail]){const rendered=await renderPage({spec:f.spec,base:"",cart:[]},route,new URLSearchParams());expect(rendered.status).toBe(200);expect((rendered.html.match(/<h1[\s>]/g)??[])).toHaveLength(1);expect(rendered.html).not.toMatch(/Racines|ARVEN|47 mm|contact@example/);expect(rendered.html).toContain('data-editorial="'+(kind==="services"?"journal":"object")+'"');}
   expect(all("SELECT 1 FROM ai_calls WHERE project_id=?",f.pid)).toEqual([]);
  }
 }));
 it("calcule 1/2/3/4, conserve les couleurs et retire le cadeau lors de la baisse ou suppression",async()=>{
  const {spec}=await editorialProject(user.id,"products");
  for(const [q,cents] of [[1,7900],[2,14220],[3,20145],[4,25280]]){const cart=addOfferToCart(spec,[],{target:"product:main",offer:`offer_${q}`,variants:Array.from({length:q},(_,i)=>1000+i%3)});expect(total(cart)).toBe(cents);expect(cart.filter(l=>l.gift)).toHaveLength(q>=3?1:0);}
  const trio=addOfferToCart(spec,[],{target:"product:main",offer:"offer_3",variants:[1000,1000,1000]});
  expect(spec.store.products![0].price).toBe(null);expect(trio.some(l=>l.gift)).toBe(true);
  const duo=reconcileOfferCart(spec,trio.map(l=>l.gift?l:{...l,quantity:2}));expect(total(duo)).toBe(14220);expect(duo.some(l=>l.gift)).toBe(false);
  expect(reconcileOfferCart(spec,trio.map(l=>l.gift?l:{...l,quantity:0}))).toEqual([]);
  spec.store.products![0].variants[0].inventory_quantity=0;expect(addOfferToCart(spec,[],{target:"product:main",offer:"offer_3",variants:[1000,1000,1000]}).some(l=>l.gift)).toBe(false);
  spec.store.product.price=null;spec.store.product.variants.forEach(v=>v.price=null);expect(()=>addOfferToCart(spec,[],{target:"product:main",offer:"offer_1",variants:[1000]})).toThrow();
 });
 it("réutilise une source d'offres sans ambiguïté et ferme une source absente ou concurrente",async()=>{
  const {spec}=await editorialProject(user.id,"products"),home=spec.templates.index.sections.purchase,main=spec.templates["product.editorial"].sections.main;
  expect(sharedPurchaseSection(spec,home).blocks!.offer_2).toEqual(main.blocks!.offer_2);expect(Object.values(sharedPurchaseSection(spec,home).blocks!).every(b=>["quantity_offer","threshold_gift","purchase_benefit"].includes(b.type))).toBe(true);main.blocks!.offer_2.settings.total_price=15000;expect(sharedPurchaseSection(spec,home).blocks!.offer_2.settings.total_price).toBe(15000);expect(total(addOfferToCart(spec,[],{target:"product:main",offer:"offer_2",variants:[1000,1001]}))).toBe(15000);
  home.settings.purchase_source="product.absent:missing";expect(sharedPurchaseSection(spec,home).settings.purchase_enabled).toBe(false);
  const duplicate=structuredClone(main);spec.templates["product.editorial"].sections.other=duplicate;spec.templates["product.editorial"].order.push("other");expect(()=>addOfferToCart(spec,[],{target:"product:main",offer:"offer_2",variants:[1000,1001]})).toThrow(/Offre/);
 });
 it("présente le même produit à la une sans dupliquer ses règles et sans substituer un autre produit",async()=>fr(async()=>{
  const {spec}=await editorialProject(user.id,'products'),featured=spec.templates.index.sections.purchase;expect(featured.type).toBe('featured-product');expect(libraryEntry('featured-product','fr')?.name).toBe('Produit à la une');
  featured.blocks={personal:{type:'highlight',settings:{text:'Le point exact du client',icon:'check'}}};featured.block_order=['personal'];
  const linked=sharedPurchaseSection(spec,featured);expect(linked.blocks!.personal.settings.text).toBe('Le point exact du client');expect(linked.blocks!.offer_3.settings.total_price).toBe(20145);expect(spec.templates.index.sections.purchase.blocks).not.toHaveProperty('offer_3');
  const html=(await renderPage({spec,base:'',cart:[]},'/',new URLSearchParams())).html;expect(html).toContain('data-featured-product');expect(html).toContain('data-product-detail');expect(html).toContain('Prix à l’unité');expect(html).toContain('Le point exact du client');
  const files=compileTheme(spec),compiled=JSON.parse(files.get('templates/index.json')!.replace(/^\/\*[\s\S]*?\*\/\s*/,''));expect(Object.values(compiled.sections.purchase.blocks).every((b:any)=>['highlight','quantity_offer','threshold_gift','purchase_benefit'].includes(b.type))).toBe(true);
  featured.settings.product_target='product:missing';const missingHtml=(await renderPage({spec,base:'',cart:[]},'/',new URLSearchParams())).html;const start=missingHtml.indexOf('data-es-type="featured-product"'),end=missingHtml.indexOf('data-es-type="ed-diptych"',start);expect(missingHtml.slice(start,end)).not.toContain('Lampe nomade ORBE');
 }));
 it("enregistre réellement le contact de test, idempotent, borné et sans envoi ni pollution d'autre projet",async()=>{
  const {spec,pid}=await editorialProject(user.id,"services"),other=await editorialProject(user.id,"services");
  const data={"contact[name]":"Visiteur de test","contact[email]":"visitor@example.invalid","contact[room]":"Cuisine","contact[body]":"Repenser les circulations.",submission_id:"test-submission-123"};
  const receipt=recordPreviewContact(pid,spec,data);expect(receipt.isTest).toBe(true);expect(recordPreviewContact(pid,spec,data).id).toBe(receipt.id);expect(JSON.parse(fs.readFileSync(previewContactFile(pid),"utf8"))).toHaveLength(1);expect(fs.existsSync(previewContactFile(other.pid))).toBe(false);
  expect(()=>recordPreviewContact(pid,spec,{...data,"contact[body]":"Autre"})).toThrow(/conflict/);expect(()=>recordPreviewContact(pid,spec,{...data,"contact[email]":"invalid"})).toThrow();
  const plain=structuredClone(spec);delete plain.meta!.demo;expect(()=>recordPreviewContact(pid,plain,data)).toThrow();
  const version=saveThemeVersion(pid,spec,"Test contact","user"),vid=previewSegment(version.id,user.id,pid);
  const response=await previewPost(new Request(`http://studio.test/preview/${pid}/v/${vid}/contact`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,submission_id:"test-route-submission"})}),{params:Promise.resolve({id:pid,vid,path:["contact"]})});expect(response.status).toBe(200);expect((await response.json()).message).toMatch(/Aucun e-mail/);expect(JSON.parse(fs.readFileSync(previewContactFile(pid),"utf8"))).toHaveLength(2);
  for(let i=2;i<50;i++)recordPreviewContact(pid,spec,{...data,submission_id:`test-cap-submission-${i}`});expect(()=>recordPreviewContact(pid,spec,{...data,submission_id:"test-cap-submission-51"})).toThrow(/Limite/);
 });
 it("édite par les routes manuelle et conversation locale, conserve les autres sections puis restaure",async()=>fr(async()=>{
  const {spec,pid}=await editorialProject(user.id,"services"),initial=saveThemeVersion(pid,spec,"Version initiale","user");await startSession(user.id);
  const ctx={params:Promise.resolve({id:pid})},request=(endpoint:string,data:unknown)=>new Request(`http://studio.test/api/projects/${pid}/theme/${endpoint}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  const before=structuredClone(spec.templates.index.sections.materials);
  const edited=await manualRoute(request("ops",{ops:[{op:"set_setting",template:"index",section:"opening",key:"heading",value:"Le titre exact choisi par le client"},{op:"set_setting",template:"index",section:"opening",key:"motion",value:"none"},{op:"move_section",template:"index",section:"study",position:{before:"method"}}]}),ctx);expect(edited.status,await edited.text()).toBe(200);
  const response=await chatRoute(request("chat",{message:'Remplace le titre par « Un intérieur à vivre ensemble »',selection:{template:"index",section:"opening"}}),ctx),body=await response.json();expect(response.status).toBe(200);
  const job=claimNext(["shop.chat"])!;expect(job?.id).toBe(body.jobId);const result:any=await handlers["shop.chat"](new JobContext(job));completeJob(job.id,result);expect(result.mode).toBe("local");expect(result.rejected).toEqual([]);expect(currentTheme(pid)!.spec.templates.index.sections.opening.settings.heading).toBe("Un intérieur à vivre ensemble");expect(currentTheme(pid)!.spec.templates.index.sections.materials).toEqual(before);
  expect((await restoreRoute(request("restore",{versionId:initial.id}),ctx)).status).toBe(200);expect(currentTheme(pid)!.spec).toEqual(spec);expect(all("SELECT 1 FROM ai_calls WHERE project_id=?",pid)).toEqual([]);
 }));
 it("persiste média, CTA, couleurs et typographie par l'éditeur et refuse le média d'un autre projet",async()=>fr(async()=>{
  const {pid,spec}=await editorialProject(user.id,"products"),other=await editorialProject(user.id,"services");saveThemeVersion(pid,spec,"Avant édition","user");await startSession(user.id);
  const sharp=(await import("sharp")).default,bytes=await sharp({create:{width:32,height:32,channels:3,background:"#997755"}}).png().toBuffer();
  const asset=await saveAsset({projectId:pid,userId:user.id,data:bytes,mime:"image/png",name:"mapping-test.png",role:"lifestyle",origin:"upload",status:"approved"}),foreign=await saveAsset({projectId:other.pid,userId:user.id,data:bytes,mime:"image/png",name:"foreign-test.png",role:"lifestyle",origin:"upload",status:"approved"});
  const request=(ops:unknown[])=>new Request(`http://studio.test/api/projects/${pid}/theme/ops`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ops})}),ctx={params:Promise.resolve({id:pid})};
  const res=await manualRoute(request([{op:"use_media",template:"index",section:"opening",key:"image_asset",assetId:asset.id},{op:"set_setting",template:"index",section:"opening",key:"mobile_media_ratio",value:"16/9"},{op:"set_setting",template:"index",section:"opening",key:"image_fit",value:"contain"},{op:"set_setting",template:"index",section:"opening",key:"button_label",value:"Voir la composition choisie"},{op:"section_colors",template:"index",section:"opening",colors:{accent:"#445566"}},{op:"set_global",key:"type_heading_font",value:"archivo_n6"}]),ctx);expect(res.status,await res.text()).toBe(200);
  const saved=currentTheme(pid)!.spec;expect(saved.templates.index.sections.opening.settings.button_label).toBe("Voir la composition choisie");expect(saved.settings.type_heading_font).toBe("archivo_n6");expect(Object.values(saved.files)).toContain(asset.id);expect(saved.templates.index.sections.night).toEqual(spec.templates.index.sections.night);
  const rendered=await renderPage({spec:saved,base:"",cart:[]},"/",new URLSearchParams());expect(rendered.html).toContain('--ed-mobile-ratio:16/9');expect(rendered.html).toContain('--ed-fit:contain');
  const rejected=await manualRoute(request([{op:"use_media",template:"index",section:"opening",key:"image_asset",assetId:foreign.id}]),ctx);expect(rejected.status).toBe(400);expect(currentTheme(pid)!.spec).toEqual(saved);
 }));
 it("importe le manifeste sans altérer les originaux, recharge les associations et rejette un pack incohérent",async()=>fr(async()=>{
  const dir=fs.mkdtempSync(path.join(session.dir,'media-pack-')),sharp=(await import('sharp')).default;
  const bytes=await sharp({create:{width:600,height:800,channels:3,background:'#776655'}}).webp().toBuffer(),sha256=createHash('sha256').update(bytes).digest('hex');
  const assets=MEDIA_ROLES.orbe.map(id=>({id,path:id+'.webp',sha256,width:600,height:800,alt_fr:'Image de test '+id}));for(const a of assets)fs.writeFileSync(path.join(dir,a.path),bytes);fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({assets}));
  const f=await editorialProject(user.id,'products',dir),other=await editorialProject(user.id,'products');expect(f.missing).toEqual([]);expect(f.media).toHaveLength(12);expect(missingEditorialMedia(f.spec).filter(m=>m.page!=='product')).toEqual([]);
  const version=saveThemeVersion(f.pid,f.spec,'Médias de test','user');expect(currentTheme(f.pid)!.version.id).toBe(version.id);expect(currentTheme(f.pid)!.spec.files).toEqual(f.spec.files);expect(Object.keys(currentTheme(f.pid)!.spec.files)).toHaveLength(12);expect(other.spec.files).toEqual({});
  const {libraryLoader}=await import('@/lib/theme/loader');for(const m of f.media)expect(createHash('sha256').update(libraryLoader(m.asset)!.data).digest('hex')).toBe(sha256);
  const html=(await renderPage({spec:currentTheme(f.pid)!.spec,base:'',cart:[]},f.detail,new URLSearchParams())).html;expect(html).not.toContain('ed-media--pending');expect(html).toContain('data-purchase-quick');
  assets[0].sha256='0'.repeat(64);fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({assets}));await expect(editorialProject(user.id,'products',dir)).rejects.toThrow(/Manifeste incohérent/);
 }));
 it("supprime la marque secondaire seulement sur choix explicite, sans changer les autres pieds de page",async()=>fr(async()=>{
  const f=await editorialProject(user.id,'services');let html=(await renderPage({spec:f.spec,base:'',cart:[]},'/',new URLSearchParams())).html;
  const footer=html.slice(html.indexOf('<footer'),html.indexOf('</footer>'));expect(footer).toContain('ref-footer__signature');expect(footer).not.toContain('class="es-footer__brand');
  Object.values(f.spec.groups.footer.sections).find(s=>s.type==='footer')!.settings.show_secondary_brand=true;html=(await renderPage({spec:f.spec,base:'',cart:[]},'/',new URLSearchParams())).html;expect(html.slice(html.indexOf('<footer'))).toContain('class="es-footer__brand');
 }));
 it("généralise les compositions, la galerie et les modifications à des contextes non utilisés pour leur conception",async()=>fr(async()=>{
  const {spec,project}=await editorialProject(user.id,"products");
  for(const [name,business,summary] of [["Kit de gravure sur bois","products","Outils de gravure, trois tailles confirmées."],["Diagnostic acoustique","services","Étude des usages et des sources sonores sur devis."]] as const){
   const ctx=contentContext({...project,business:business,product:{...project.product,name,summary},brand:{...project.brand!,name:"Étude indépendante",tagline:"Une approche adaptée"}},spec,false);
   const filled=withProjectMedia(spec,"ed-diptych",{},[{type:"frame",settings:{media_role:"required-view",title:"",image_asset:""}}],ctx);expect(filled.blocks).toHaveLength(1);expect(filled.blocks![0].settings?.image_asset).toBe("");expect(filled.blocks![0].settings?.title).toBe(name);expect(libraryEntry("ed-diptych","fr")?.name).toBeTruthy();
   const result=applyOps(spec,[{op:"add_section",template:"index",type:"ed-statement",settings:{heading:name,text:`<p>${summary}</p>`}},{op:"set_global",key:"editorial_profile",value:business==="services"?"journal":"object"}]);expect(result.rejected).toEqual([]);expect(JSON.stringify(result.spec.templates.index)).toContain(name);
  }
 }));
 it("exporte les cinq plateformes, conserve les composants et signale médias manquants et achats avancés non installés",async()=>{
  for(const kind of ["products","services"] as const){const {spec}=await editorialProject(user.id,kind),before=JSON.stringify(spec);expect(missingEditorialMedia(spec).length).toBeGreaterThan(10);
   for(const platform of ["shopify","woocommerce","prestashop","wix","squarespace"] as const){const exp=await cmsExport(platform,spec,()=>null);expect(exp.issues.some(i=>i.code==="editorial_media_missing"&&i.severity==="blocking")).toBe(true);const zip=unzipSync(exp.zip);if(platform==="shopify"){expect(strFromU8(zip["assets/editorial.js"])).toContain("prefers-reduced-motion");expect(strFromU8(zip["sections/ed-opening.liquid"])).toContain("ed-opening");}if(kind==="products")expect(exp.issues.some(i=>i.code==="purchase_rules_require_server")).toBe(true);}
   expect(JSON.stringify(spec)).toBe(before);
  }
 },60000);
});
