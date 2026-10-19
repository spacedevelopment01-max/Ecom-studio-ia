/** Section « Produit à la une » : source commerciale commune, rendu, édition et pied de page sans logo répété. */
import { afterAll,describe,it,expect,vi } from "vitest";
const session=vi.hoisted(()=>{
 const root=process.env.DATA_DIR;if(!root)throw new Error("Tests isolés obligatoires");
 const dir=process.getBuiltinModule("fs").mkdtempSync(`${root}/lot2b-fp-`),shared=globalThis as {__ecomDb?:{close():void}},previousDb=shared.__ecomDb;delete shared.__ecomDb;vi.stubEnv("DATA_DIR",dir);return {dir,previousDb};
});
afterAll(()=>{const shared=globalThis as {__ecomDb?:{close():void}};if(shared.__ecomDb!==session.previousDb)shared.__ecomDb?.close();if(session.previousDb)shared.__ecomDb=session.previousDb;else delete shared.__ecomDb;vi.unstubAllEnvs();});
import { createUser } from "@/lib/auth";
import { editorialProject } from "./lot2b-fixtures";
import { renderPage } from "@/lib/theme/render";
import { applyOps,validateSpec } from "@/lib/theme/ops";
import { addOfferToCart,sharedPurchaseSection,purchaseExportManifest,guardPurchaseExport } from "@/lib/theme/purchase-offers";
import { compileTheme } from "@/lib/theme/compile";
import { libraryEntry,SECTION_LIBRARY } from "@/lib/theme/section-library";
import { runWithLang } from "@/lib/i18n-server";
const fr=<T>(f:()=>T)=>runWithLang({content:"fr",ui:"fr"},f);
describe("Produit à la une — section réutilisable branchée sur la source de la fiche",async()=>{
 const user=await createUser(`lot2b-fp-${Date.now()}@example.invalid`,"isolated-only","Test");
 it("rend sur l'accueil le produit, sa galerie, ses finitions, ses offres, le cadeau et le lien vers la fiche",async()=>fr(async()=>{
  const {spec}=await editorialProject(user.id,"products");
  expect(validateSpec(spec)).toEqual([]);
  const featured=spec.templates.index.sections.featured;expect(featured.type).toBe("featured-purchase");expect(featured.settings.purchase_source).toBe("product.editorial:main");
  expect(spec.templates.index.order.slice(0,3)).toEqual(["opening","presence","featured"]);// la section produit suit les premiers repères
  expect(spec.templates.index.sections.opening.settings.copy_surface).toBe(false);
  const html=(await renderPage({spec,base:"",cart:[]},"/",new URLSearchParams())).html;
  expect(html).toContain("data-featured-purchase");expect(html).toContain("Lampe nomade ORBE");expect(html).toContain("Voir la fiche complète");
  expect(html).toContain("ed-opening--clear");expect(html).toContain("data-purchase-summary-label");expect(html).toContain("data-purchase-unit-price");expect(html).toContain('"total":"Total"');
  expect((html.match(/data-fp-slide/g)??[]).length).toBe(1);// sans pack : un seul cadre « visuel attendu », aucune image empruntée
  expect((html.match(/data-quantity="/g)??[]).length).toBe(4);expect(html).toContain("data-gift");expect(html).toContain('data-fp-link');
  expect((html.match(/<h1[\s>]/g)??[])).toHaveLength(1);
 }));
 it("lit les mêmes blocs que la fiche et suit ses modifications ; une source absente ferme l'achat",async()=>{
  const {spec}=await editorialProject(user.id,"products"),home=spec.templates.index.sections.featured,main=spec.templates["product.editorial"].sections.main;
  expect(sharedPurchaseSection(spec,home).blocks).toEqual(main.blocks);
  main.blocks!.offer_3.settings.total_price=19000;expect(sharedPurchaseSection(spec,home).blocks!.offer_3.settings.total_price).toBe(19000);
  expect(addOfferToCart(spec,[],{target:"product:main",offer:"offer_3",variants:[1000,1001,1002]}).reduce((n,l)=>n+(l.finalLinePrice??0),0)).toBe(19000);
  const compiled=compileTheme(spec),homeTemplate=JSON.parse(compiled.get("templates/index.json")!.replace(/^\/\*[\s\S]*?\*\/\n/,""));
  expect(homeTemplate.sections.featured.blocks.offer_3.settings.total_price).toBe(19000);expect(homeTemplate.sections.featured.settings.product).toBe("lampe-nomade");
  home.settings.purchase_source="product.absent:missing";expect(sharedPurchaseSection(spec,home).settings.purchase_enabled).toBe(false);
  // Aucune seconde règle tarifaire : la section partagée n'est jamais une source d'offres concurrente.
  expect(purchaseExportManifest(spec)!.sections.map(s=>s.template)).toEqual(["product","product.editorial"]);
  expect(guardPurchaseExport(spec,"shopify").disabled).toContain("product.editorial:main");
 });
 it("s'édite par les opérations du studio comme une section ordinaire et figure dans la galerie FR/EN",async()=>{
  const {spec}=await editorialProject(user.id,"products");
  const result=applyOps(spec,[{op:"set_setting",template:"index",section:"featured",key:"heading",value:"Lampe ORBE, à composer"},{op:"set_setting",template:"index",section:"featured",key:"product",value:"lampe-nomade"},{op:"move_section",template:"index",section:"featured",position:{before:"finishes"}}]);
  expect(result.rejected).toEqual([]);expect(result.spec.templates.index.sections.featured.settings.heading).toBe("Lampe ORBE, à composer");expect(result.spec.templates.index.sections.featured.settings.product_target).toBe("product:main");
  expect(result.spec.templates.index.order.indexOf("featured")).toBeLessThan(result.spec.templates.index.order.indexOf("finishes"));
  expect(applyOps(spec,[{op:"set_setting",template:"index",section:"featured",key:"product",value:"inconnu"}]).rejected.length).toBeGreaterThan(0);
  expect(SECTION_LIBRARY.some(e=>e.type==="featured-purchase"&&e.category==="Produit")).toBe(true);expect(libraryEntry("featured-purchase","en")?.name).toBe("Featured product");
 });
 it("montre dans le panier le visuel de la variante choisie, avec repli sur l'image du produit, et le libellé du prix unitaire",async()=>fr(async()=>{
  const {spec}=await editorialProject(user.id,"products"),lamp=spec.store.product;// la lampe est le produit principal, la pochette est au catalogue
  lamp.images=["lampe-dune.webp","lampe-argile.webp","lampe-charbon.webp","scene.webp"];lamp.variants.forEach((v,i)=>{v.image=lamp.images[i];});
  const srcs=(html:string)=>[...html.matchAll(/es-line-item__media"[^>]*>\s*<img[^>]*?src="([^"?]+)/g)].map(m=>m[1]);
  // Trio Charbon + Argile + Dune : trois lignes, trois visuels distincts, dans l'ordre des lignes (page panier et tiroir).
  const trio=addOfferToCart(spec,[],{target:"product:main",offer:"offer_3",variants:[1002,1001,1000]});
  const cartPage=(await renderPage({spec,base:"",cart:trio},"/cart",new URLSearchParams())).html;
  expect(srcs(cartPage).slice(0,3)).toEqual(["/assets/lampe-charbon.webp","/assets/lampe-argile.webp","/assets/lampe-dune.webp"]);
  const home=(await renderPage({spec,base:"",cart:trio},"/",new URLSearchParams())).html,drawer=home.slice(home.indexOf("data-cart-drawer"));
  expect(srcs(drawer).slice(0,3)).toEqual(["/assets/lampe-charbon.webp","/assets/lampe-argile.webp","/assets/lampe-dune.webp"]);
  // Quantité modifiée puis panier relu : les visuels suivent toujours la variante.
  const changed=trio.map(l=>l.variantId===1001?{...l,quantity:2}:l);
  expect(srcs((await renderPage({spec,base:"",cart:changed},"/cart",new URLSearchParams())).html).slice(0,3)).toEqual(["/assets/lampe-charbon.webp","/assets/lampe-argile.webp","/assets/lampe-dune.webp"]);
  // Variante sans média propre : repli cohérent sur l'image du produit, jamais une image d'une autre variante.
  lamp.variants[1].image=undefined;
  expect(srcs((await renderPage({spec,base:"",cart:trio},"/cart",new URLSearchParams())).html).slice(0,3)).toEqual(["/assets/lampe-charbon.webp","/assets/lampe-dune.webp","/assets/lampe-dune.webp"]);
  // Prix principal explicite sur la fiche, même libellé dans les offres et sur l'accueil ; réglage configurable (vide : « par article »).
  const product=(await renderPage({spec,base:"",cart:[]},"/products/lampe-nomade",new URLSearchParams())).html;
  expect(product).toContain('data-price-note>par lampe<');expect(product).toContain('"unit":"par lampe"');
  expect((await renderPage({spec,base:"",cart:[]},"/",new URLSearchParams())).html).toContain('data-price-note>par lampe<');
  spec.templates["product.editorial"].sections.main.settings.purchase_unit_label="";
  const plain=(await renderPage({spec,base:"",cart:[]},"/products/lampe-nomade",new URLSearchParams())).html;
  expect(plain).not.toContain("data-price-note");expect(plain).toContain('"unit":"par article"');
 }));
 it("ne répète pas le logo sous la grande signature des pieds de page de référence et transmet les cadrages mobiles",async()=>fr(async()=>{
  for(const kind of ["products","services"] as const){
   const {spec}=await editorialProject(user.id,kind),html=(await renderPage({spec,base:"",cart:[]},"/",new URLSearchParams())).html;
   expect((html.match(/ref-footer__signature/g)??[]).length).toBe(1);expect(html).not.toContain("ref-footer__logo-surface");
  }
  // Cadrage mobile distinct : transmis en variables CSS dès qu'une image est posée (ici un fichier de test).
  const framed=await editorialProject(user.id,"products");framed.spec.files["orbe-02-chambre.webp"]="asset-test";framed.spec.templates.index.sections.opening.settings.image_asset="orbe-02-chambre.webp";
  expect((await renderPage({spec:framed.spec,base:"",cart:[]},"/",new URLSearchParams())).html).toContain("--ed-fxm:64%;--ed-fym:50%");
  const {spec}=await editorialProject(user.id,"products");expect(spec.templates.index.sections.opening.settings.mobile_focus_x).toBe(64);
 }));
});
