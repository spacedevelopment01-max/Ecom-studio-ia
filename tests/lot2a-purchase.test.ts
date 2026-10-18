/** Lot 2A : stockage, composition, routes manuelles/chat, worker, rendu et ZIP réels.
 * Seule la session Next est adaptée au harnais ; disponibilité IA forcée à faux. Aucune réponse IA simulée.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR;
  if (!root) throw new Error("Le harnais Vitest isolé est obligatoire");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/lot2a-purchase-`);
  const shared = globalThis as { __ecomDb?: { close(): void } };
  const previousDb = shared.__ecomDb;
  delete shared.__ecomDb;
  vi.stubEnv("DATA_DIR", dir);
  return { token: "", dir, previousDb };
});
afterAll(() => {
  const shared = globalThis as { __ecomDb?: { close(): void } };
  if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close();
  if (session.previousDb) shared.__ecomDb = session.previousDb;
  else delete shared.__ecomDb;
  vi.unstubAllEnvs();
});
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => session.token ? { value: session.token } : undefined, set: (_n: string, value: string) => { session.token = value; }, delete: () => {} }) }));
vi.mock("@/lib/ai/llm", async (original) => ({ ...(await original<object>()), llmConfigured: () => false }));
import { createUser, startSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { referenceProject } from "./lot2a-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { loadProject, currentTheme, saveThemeVersion, listThemeVersions, saveProduct, saveServices, saveBrand } from "@/lib/projects";
import { localBrand } from "@/lib/engine/local";
import { composeShop } from "@/lib/engine/shop";
import { emptyProduct, emptyServiceProfile } from "@/lib/project-types";
import { runWithLang } from "@/lib/i18n-server";
import { applyOps, validateSpec, OpSchema } from "@/lib/theme/ops";
import { renderPage } from "@/lib/theme/render";
import { sectionSchema, storeProducts, settingsSchema, coerceSetting } from "@/lib/theme/spec";
import { bindReferenceOffers } from "@/lib/theme/reference-delivery";
import { withProjectMedia } from "@/lib/theme/section-defaults";
import { contentContext, sectionContentContext } from "@/lib/theme/section-content";
import { libraryEntry } from "@/lib/theme/section-library";
import { cmsExport } from "@/lib/cms-v2/export";
import { libraryLoader } from "@/lib/theme/loader";
import { POST as manualRoute } from "@/app/api/projects/[id]/theme/ops/route";
import { POST as chatRoute } from "@/app/api/projects/[id]/theme/chat/route";
import { POST as restoreRoute } from "@/app/api/projects/[id]/theme/restore/route";
import { POST as buildRoute } from "@/app/api/projects/[id]/theme/build/route";
import { claimNext, completeJob, JobContext } from "@/lib/jobs";
import { handlers } from "../worker/handlers";
const fr = <T>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit dans les tests du lot 2A"); }));
import { referencePurchase } from "./lot2a-purchase-fixture";
import { addOfferToCart, reconcileOfferCart, purchaseConfig, guardPurchaseExport, type OfferLine } from "@/lib/theme/purchase-offers";
import { purchaseCommand } from "@/lib/theme/purchase-command";
import { localFirst } from "@/lib/engine/local-first";
import { GET as previewGet, POST as previewPost } from "@/app/preview/[id]/v/[vid]/[[...path]]/route";
import { previewSegment } from "@/lib/theme/preview-access";
import { POST as addSectionRoute } from "@/app/api/projects/[id]/theme/sections/route";
import { GET as sectionPreviewRoute } from "@/app/api/projects/[id]/theme/section-preview/route";
const sum = (cart: OfferLine[]) => cart.reduce((n, l) => n + (l.finalLinePrice ?? 0), 0);
describe("Lot 2A complément — offres commerciales", async () => {
 const user = await createUser(`lot2a-purchase-${Date.now()}@example.invalid`, "isolated-test-only", "Essai isolé");
 async function fixture() { const ref = await referenceProject(user.id, "products", { media: false }); return { ...ref, ...referencePurchase(ref.spec) }; }
 it("calcule un trio mixte au serveur ; la baisse au duo puis au singleton retire le cadeau et recalcule les économies", async () => {
  const { spec } = await fixture();
  const trio = addOfferToCart(spec, [], { target: "product:main", offer: "quantity_3", variants: [1000, 1000, 1001] });
  expect(sum(trio)).toBe(34936); expect(trio.filter((l) => l.gift)).toMatchObject([{ quantity: 1, finalLinePrice: 0 }]);
  const duo = reconcileOfferCart(spec, trio.map((l) => !l.gift && l.variantId === 1000 ? { ...l, quantity: 1 } : l));
  expect(duo.some((l) => l.gift)).toBe(false); expect(sum(duo)).toBe(24656);
  const single = reconcileOfferCart(spec, duo.filter((l) => l.variantId !== 1001)); expect(sum(single)).toBe(12900);
  expect(reconcileOfferCart(spec, trio.filter((l) => l.gift))).toEqual([]);
 });
 it("refuse variante épuisée, variante étrangère, quantité invalide et dépassement de stock sans altérer le panier utilisable", async () => {
  const { spec } = await fixture(); const cart = addOfferToCart(spec, [], { target: "product:main", offer: "quantity_2", variants: [1000, 1001] }), saved = structuredClone(cart);
  for (const variants of [[1000, 1002], [1000, 2000], [1000], [NaN,1000]]) expect(() => addOfferToCart(spec, cart, { target: "product:main", offer: "quantity_2", variants })).toThrow();
  spec.store.product.variants[0].inventory_quantity = 1;
  expect(() => addOfferToCart(spec, cart, { target: "product:main", offer: "quantity_2", variants: [1000,1000] })).toThrow(/stock/); expect(cart).toEqual(saved);
 });
 it("ne conserve ni prix falsifié, ni cadeau injecté ; respecte le stock du cadeau", async () => {
  const { spec, gift } = await fixture();
  const lines = addOfferToCart(spec, [], { target: "product:main", offer: "quantity_3", variants: [1000,1000,1000] });
  expect(sum(reconcileOfferCart(spec, lines.map((l) => ({ ...l, finalLinePrice: -99999 }))))).toBe(34056);
  expect(reconcileOfferCart(spec, [{variantId:2000,quantity:2,gift:true,finalLinePrice:0}])).toEqual([]);
  gift.variants[0].inventory_quantity = 0;
  expect(reconcileOfferCart(spec, lines).some((l) => l.gift)).toBe(false);
  gift.variants[0].inventory_quantity = 1;
  const purchasedGift = { variantId:2000, quantity:1 };
  expect(reconcileOfferCart(spec, [...lines,purchasedGift]).filter((l) => l.gift)).toEqual([]);
 });
 it("le nouvel ajout remplace atomiquement le lot du même produit et conserve les achats indépendants", async () => {
  const { spec } = await fixture(); const cart = addOfferToCart(spec, [{ variantId:2000,quantity:1 }], { target:"product:main",offer:"quantity_4",variants:[1000,1000,1000,1000] });
  const changed = addOfferToCart(spec, cart, { target:"product:main",offer:"quantity_1",variants:[1001] });
  expect(changed).toHaveLength(2); expect(changed.find((l) => l.variantId===2000)?.quantity).toBe(1); expect(sum(changed)).toBe(15800);
 });
 it("routes signées réelles : ajout, lecture, rendu du panier, baisse, retrait et échec atomique", async () => fr(async () => {
  const { pid,spec } = await fixture(); const v=saveThemeVersion(pid,spec,"Configuration commerciale fictive","user"), vid=previewSegment(v.id,user.id,pid);
  const route = (name:string,body?:unknown) => (body ? previewPost : previewGet)(new Request(`http://studio.test/preview/${pid}/v/${vid}/${name}`,body?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}:undefined),{params:Promise.resolve({id:pid,vid,path:name.split("/")})});
  const add = await route("cart/add.js",{target:"product:main",offer:"quantity_3",variants:[1000,1000,1000],price:1}); expect(add.status).toBe(200);
  const json=await add.json(); expect(json.total_price).toBe(34056); expect(json.item_count).toBe(4);
  const rendered=await (await route("cart")).text(); expect(rendered).toContain("340,56"); expect(rendered).toContain("Pochette de démonstration"); expect(rendered).toContain(" disabled");
  const bad=await route("cart/add.js",{target:"product:main",offer:"quantity_2",variants:[1002,1000]});expect(bad.status).toBe(422);expect((await (await route("cart.js")).json()).total_price).toBe(34056);
  const change=await route("cart/change.js",{id:json.items[0].key,quantity:2}); expect(change.status).toBe(200);const duo=await change.json();expect(duo.total_price).toBe(23736);expect(duo.items).toHaveLength(1);
  expect((await (await route("cart/change.js",{id:duo.items[0].key,quantity:0})).json()).items).toEqual([]);
 }));
 it("édition manuelle, vrai chat local/worker, rechargement, restauration et export partagent les mêmes blocs", async () => fr(async () => {
  const {pid,spec,template,section}=await fixture();const initial=saveThemeVersion(pid,spec,"Version utilisable","user");await startSession(user.id);
  const ctx={params:Promise.resolve({id:pid})},request=(endpoint:string,body:unknown)=>new Request(`http://studio.test/api/projects/${pid}/theme/${endpoint}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const untouched=structuredClone(spec.templates.index);
  const edit=await manualRoute(request("ops",{ops:[{op:"set_setting",template,section,block:"quantity_2",key:"title",value:"Duo exact du client"},{op:"set_setting",template,section,key:"purchase_style",value:"soft"}]}),ctx);expect(edit.status,await edit.text()).toBe(200);expect(currentTheme(pid)!.spec.templates[template].sections[section].blocks?.quantity_2.settings.title).toBe("Duo exact du client");
  const message="Crée trois offres : un article, un duo et un trio avec la Pochette de démonstration offerte ; mets le duo en avant. Sans remise, aux prix unitaires actuels.";
  expect(localFirst(spec,message,{template,section},[],"products",()=>null)?.ops.length).toBeGreaterThan(0);
  const res=await chatRoute(request("chat",{message,selection:{template,section}}),ctx),body=await res.json();expect(res.status).toBe(200);const job=claimNext(["shop.chat"])!;expect(job.id).toBe(body.jobId);const result:any=await handlers["shop.chat"](new JobContext(job));completeJob(job.id,result);expect(result.mode).toBe("local");expect(result.rejected).toEqual([]);
  const saved=currentTheme(pid)!.spec;expect(saved.templates.index).toEqual(untouched);expect(purchaseConfig(saved.templates[template].sections[section]).offers.map((o)=>o.quantity)).toEqual([1,2,3]);
  const exp=await cmsExport("shopify",saved,()=>null);expect(exp.issues.some((i)=>i.code==="purchase_rules_require_server")).toBe(true);
  const restored=await restoreRoute(request("restore",{versionId:initial.id}),ctx);expect(restored.status).toBe(200);expect(currentTheme(pid)!.spec).toEqual(spec);expect(all("SELECT 1 FROM ai_calls WHERE project_id=?",pid)).toEqual([]);
 }));
 it("demande uniquement la règle de prix ou le cadeau manquant sans opération silencieuse", async () => fr(async () => {
  const {spec,template,section}=await fixture();const selection={template,section};
  const a=purchaseCommand(spec,"Crée trois offres : un article, un duo et un trio avec la pochette du catalogue offerte ; mets le duo en avant.",selection)!;expect(a.ops).toEqual([]);expect(a.reply).toContain("règle de prix");
  const b=purchaseCommand(spec,"Crée trois offres : un article, un duo et un trio avec la pochette offerte. Sans remise.",selection)!;expect(b.ops).toEqual([]);expect(b.reply).toContain("article du catalogue");
 }));
 it("exporte les cinq plateformes sans activer une remise ou un cadeau sans serveur commercial", async () => {
  const {spec,template,section}=await fixture(),before=JSON.stringify(spec);
  for(const platform of ["shopify","woocommerce","prestashop","wix","squarespace"] as const){const exp=await cmsExport(platform,spec,()=>null);expect(exp.issues.some((i)=>i.code==="purchase_rules_require_server")).toBe(true);const files=unzipSync(exp.zip);const manifestKey=Object.keys(files).find((p)=>p.endsWith("es-purchase-offers.json")||p.endsWith("offres-a-configurer.json"))!;expect(manifestKey).toBeTruthy();const manifest=JSON.parse(strFromU8(files[manifestKey]));expect(manifest.commercialServerInstalled).toBe(false);expect(manifest.activeDiscountsAndGifts).toBe(false);expect(manifest.sections[0].blocks.gift_pouch.settings.threshold).toBe(3);if(platform==="shopify"){const tpl=JSON.parse(strFromU8(files[`templates/${template}.json`]).replace(/^\/\*[\s\S]*?\*\/\s*/,""));expect(tpl.sections[section].settings.purchase_enabled).toBe(false);expect(tpl.sections[section].blocks.quantity_3.settings.discount).toBe(12);}else {for(const [file,data] of Object.entries(files))if(/\.(html|php|tpl)$/.test(file))expect(strFromU8(data)).not.toContain('data-purchase data-target');}}
  expect(JSON.stringify(spec)).toBe(before);expect(guardPurchaseExport(spec).disabled).toHaveLength(1);
 });
 it("généralise à deux produits inédits avec leurs propres faits, sans données de montre", async () => {
  for(const [name,category,summary,facts] of [
   ["Kit de réparation pour instruments à vent","Accessoires de musique","Jeu de pièces et d’outils pour entretenir un instrument.",["Pièces de remplacement","Outils de réglage"]],
   ["Patrons numériques de reliure","Documents numériques","Plans de découpe pour préparer un carnet relié.",["Fichiers PDF","Instructions de découpe"]],
  ] as const){
   const pid=seedHoldout(user.id,0,"Cas inédit achat"); const product={...emptyProduct(),name,category,summary,price:{amount:7000,currency:"EUR",status:"confirmed" as const},facts:facts.map((value,i)=>({key:`fact-${i}`,label:"Contenu",value,status:"confirmed" as const,source:"user" as const}))};
   saveProduct(pid,product);const identity=localBrand(product,"Étude de catalogue");saveBrand(pid,{...identity.brand,direction:"vitrine"});
   const {spec}=await composeShop(pid,"vitrine",null,false);const {gift}=referencePurchase(spec,[...facts]);spec.store.product.title=name;spec.store.product.handle="offre-renommee";gift.title="Accessoire renommé";gift.handle="autre-url";
   const cart=addOfferToCart(spec,[],{target:"product:main",offer:"quantity_3",variants:[1000,1000,1000]});expect(cart.filter((l)=>l.gift)).toHaveLength(1);expect(sum(cart)).toBe(18480);
   const main=Object.values(spec.templates[`product.${spec.store.product.template_suffix}`].sections).find((s)=>s.type==="main-product")!;main.block_order!.reverse();expect(sum(addOfferToCart(spec,[],{target:"product:main",offer:"quantity_3",variants:[1000,1000,1000]}))).toBe(18480);
   const html=(await renderPage({spec,base:"",cart:[]},`/products/${spec.store.product.handle}`,new URLSearchParams())).html;expect(html).toContain(name);expect(html).toContain("Accessoire renommé");expect(html).toContain("data-purchase");expect(html).not.toMatch(/ARVEN|Cuir brun|Boîtier en acier/);
  }
 });
 it("conserve la variante par SKU après réordonnancement et refuse une identité retirée", async () => {
  const {spec}=await fixture();const cart=addOfferToCart(spec,[],{target:"product:main",offer:"quantity_2",variants:[1000,1001]});
  spec.store.product.variants.reverse();const rebound=reconcileOfferCart(spec,cart);expect(sum(rebound)).toBe(24656);expect(rebound.map((l)=>l.variantId)).toEqual([1002,1001]);
  spec.store.product.variants=spec.store.product.variants.filter((v)=>v.sku!=="DEMO-A");expect(()=>reconcileOfferCart(spec,cart)).toThrow(/Identité/);
 });
 it("la sélection manuelle du cadeau enregistre son identité et survit à son renommage", async () => {
  const {spec,template,section,gift}=await fixture();const edit=applyOps(spec,[{op:"set_setting",template,section,block:"gift_pouch",key:"gift_product",value:gift.handle}]);expect(edit.rejected).toEqual([]);expect(edit.spec.templates[template].sections[section].blocks!.gift_pouch.settings.gift_target).toBe(gift.contentTarget);
  edit.spec.store.products![0].handle="cadeau-renomme";edit.spec.store.products![0].title="Cadeau renommé";expect(addOfferToCart(edit.spec,[],{target:"product:main",offer:"quantity_3",variants:[1000,1000,1000]}).some((l)=>l.gift)).toBe(true);
 });
 it("conserve l’offre sélectionnée même si deux lots ont la même quantité et si leur ordre change", async () => {
  const {spec,template,section}=await fixture(),main=spec.templates[template].sections[section];
  main.blocks!.other_duo={type:"quantity_offer",settings:{title:"Autre duo",quantity:2,discount:20}};main.block_order!.unshift("other_duo");
  const cart=addOfferToCart(spec,[],{target:"product:main",offer:"quantity_2",variants:[1000,1000]});expect(sum(cart)).toBe(23736);main.block_order!.reverse();expect(sum(reconcileOfferCart(spec,cart))).toBe(23736);
 });
 it("accepte cinq articles et plusieurs paliers sans se limiter à quatre offres", async () => {
  const {spec,template,section}=await fixture(),main=spec.templates[template].sections[section];
  main.blocks!.quantity_5={type:"quantity_offer",settings:{title:"Lot atelier",quantity:5,discount:10}};main.block_order!.push("quantity_5");
  main.blocks!.extra_gift={type:"threshold_gift",settings:{gift_target:"product:catalog:test-pouch",threshold:5,quantity:2}};main.block_order!.push("extra_gift");
  const five=addOfferToCart(spec,[],{target:"product:main",offer:"quantity_5",variants:[1000,1000,1000,1000,1000]});expect(sum(five)).toBe(58050);expect(five.filter((l)=>l.gift).reduce((n,l)=>n+l.quantity,0)).toBe(3);
  const down=reconcileOfferCart(spec,five.map((l)=>!l.gift?{...l,quantity:2}:l));expect(down.filter((l)=>l.gift)).toEqual([]);expect(sum(down)).toBe(23736);
 });

 it("applique un total commercial explicite et bloque un prix fixe manquant", async () => {
  const {spec,template,section}=await fixture(),offer=spec.templates[template].sections[section].blocks!.quantity_2;
  offer.settings.price_mode="fixed_total";offer.settings.total_price=25000;
  expect(sum(addOfferToCart(spec,[],{target:"product:main",offer:"quantity_2",variants:[1000,1001]}))).toBe(25000);
  offer.settings.total_price=-1;expect(()=>addOfferToCart(spec,[],{target:"product:main",offer:"quantity_2",variants:[1000,1001]})).toThrow(/Prix/);
 });

 it("galerie réelle : aperçu et insertion reprennent le produit ciblé, ses faits et ses médias", async () => fr(async () => {
  const {pid,spec,project}=await referenceProject(user.id,"products",{multi:true});
  const bottle=storeProducts(spec).find((p)=>p.contentTarget==="product:catalog:bottle")!,template=`product.${bottle.template_suffix}`;
  const context=sectionContentContext(project,spec,false,template), narrative=withProjectMedia(spec,"ref-narrative",{},undefined,context);
  expect(context.product.name).toBe("Gourde Cime");expect(context.product.category).toBe("Gourdes");expect(context.product.sector).toBe("");expect(JSON.stringify(narrative)).toContain("750 ml");expect(JSON.stringify(narrative)).not.toMatch(/Acier poli|Cuir brun|Montre/);
  for(const b of narrative.blocks??[])if(b.settings?.image_asset)expect(bottle.images).toContain(b.settings.image_asset);
  saveThemeVersion(pid,spec,"Catalogue isolé","user");await startSession(user.id);const ctx={params:Promise.resolve({id:pid})};
  const preview=await sectionPreviewRoute(new Request(`http://studio.test/api/projects/${pid}/theme/section-preview?type=purchase-offers&template=${template}`),ctx);expect(preview.status).toBe(200);const html=await preview.text();expect(html).toContain('data-target="product:catalog:bottle"');expect(html).toContain('"id":2000');
  const before=JSON.stringify(spec.templates[`product.${spec.store.product.template_suffix}`]);
  const res=await addSectionRoute(new Request(`http://studio.test/api/projects/${pid}/theme/sections`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"purchase-offers",template})}),ctx);expect(res.status,await res.text()).toBe(200);
  const saved=currentTheme(pid)!.spec,offerSection=Object.values(saved.templates[template].sections).find((s)=>s.type==="purchase-offers")!;
  expect(offerSection.settings.product_target).toBe("product:catalog:bottle");expect(JSON.stringify(saved.templates[`product.${spec.store.product.template_suffix}`])).toBe(before);
  const offer=purchaseConfig(offerSection).offers[0];expect(sum(addOfferToCart(saved,[],{target:"product:catalog:bottle",offer:offer.id,variants:[2000]}))).toBe(3490);
 }));

 it("répartit les centimes sans ligne négative et garde le total exact", async () => {
  const {spec,template,section}=await fixture(),p=spec.store.product;
  p.variants=[0,1,2,3].map((i)=>({title:`Variante ${i}`,options:[String(i)],price:100,available:true,sku:`ROUND-${i}`}));
  const offer=spec.templates[template].sections[section].blocks!.quantity_4;offer.settings.price_mode="fixed_total";offer.settings.total_price=2;
  const cart=addOfferToCart(spec,[],{target:"product:main",offer:"quantity_4",variants:[1000,1001,1002,1003]});expect(sum(cart)).toBe(2);expect(cart.every((l)=>(l.finalLinePrice??0)>=0)).toBe(true);
 });

 it("garde la quantité simple native Shopify, mais ferme les routes commerciales non adaptées des autres CMS", async () => {
  const {spec,template,section}=await fixture(),main=spec.templates[template].sections[section];
  for(const id of Object.keys(main.blocks!))if(main.blocks![id].type==="threshold_gift")delete main.blocks![id];
  for(const b of Object.values(main.blocks!))if(b.type==="quantity_offer")b.settings.discount=0;
  expect(guardPurchaseExport(spec,"shopify").disabled).toEqual([]);
  for(const platform of ["woocommerce","prestashop","wix","squarespace"])expect(guardPurchaseExport(spec,platform).disabled).toHaveLength(1);
  for(const platform of ["woocommerce","prestashop"] as const){const exp=await cmsExport(platform,spec,()=>null),zip=unzipSync(exp.zip);const js=Object.entries(zip).find(([f])=>f.endsWith(platform==="woocommerce"?"assets/js/theme.js":"assets/js/es-theme.js"))!;expect(strFromU8(js[1])).toContain("data-narrative-chapter");expect(strFromU8(js[1])).toContain("data-purchase");}
 });

});
