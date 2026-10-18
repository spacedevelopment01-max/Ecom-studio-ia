import fs from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { sampleSpec } from "./fixtures";
import { shopifyProductsCsv, wooProductsCsv } from "@/lib/theme/catalog-export";
import { adaptFeaturedProduct } from "@/lib/cms-v2/adapters/prestashop";
import { cmsExport } from "@/lib/cms-v2/export";
import { toSmarty } from "@/lib/cms-v2/adapters/prestashop";
import { catalogSnapshot } from "@/lib/cms-v2/catalog";
import { serviceSpec } from "./fixtures";
import { prepareShopifyCsv } from "../scripts/cms-v2/prepare-shopify-csv";

import { multiAxisSpec } from "./cms-catalogue-fixtures";

describe("exports catalogue fiables", () => {
  it("la présentation Presta garde le texte complet et le prix de la variante initiale", () => {
    const s=multiAxisSpec();s.store.product.price=9999;s.store.product.description_html='<p>'+"Texte complet. ".repeat(1000)+'FIN_PRODUIT</p>';
    s.templates.index={order:['buy'],sections:{buy:{type:'featured-product',settings:{product:s.store.product.handle}}}};
    adaptFeaturedProduct(s,fr=>fr);const copy=String(s.templates.index.sections.buy.settings.text);
    expect(copy).toContain('32,10');expect(copy).not.toContain('99,99');expect(copy).toContain('FIN_PRODUIT');
  });
  it("Presta livre son module actualisable séparément sans effacer les correspondances", async () => {
    const e=await cmsExport('prestashop',multiAxisSpec(),()=>null);const files=unzipSync(e.zip);
    const module=unzipSync(files['import/module-esstudio.zip']);
    expect(strFromU8(module['esstudio/esstudio.php'])).toContain("$this->version = '1.1.0'");
    expect(strFromU8(module['esstudio/catalog-import.php'])).toContain('catalog_image_shop_detach');
    expect(module['esstudio/catalogue.json']).toEqual(files['config/es-catalogue.json']);
  });
  it("le compteur Woo Blocks suit les quantités serveur et masque le zéro", () => {
    const runtime=fs.readFileSync("assets/cms/wordpress/es-woo.js","utf8");
    let count=1, callback=()=>{}; const node={textContent:"",hidden:false};
    vm.runInNewContext(runtime,{window:{wp:{data:{select:()=>({getCartData:()=>({itemsCount:count})}),subscribe:(fn:()=>void)=>{callback=fn;}}}},document:{querySelectorAll:()=>[node]}});
    expect(node.textContent).toBe("1");count=2;callback();expect(node.textContent).toBe("2");expect(node.hidden).toBe(false);
    count=0;callback();expect(node.textContent).toBe("0");expect(node.hidden).toBe(true);
  });
  it("Shopify conserve trois axes, les SKU, les prix, le stock connu et les images de variante", () => {
    const s = multiAxisSpec(); const csv = shopifyProductsCsv(s);
    expect(csv).toContain("Option2 Name"); expect(csv).toContain("Option3 Value");
    expect(csv).toContain('"Taille"'); expect(csv).toContain('"Câble"');
    expect(csv).toContain('"LAMPE-ÉTÉ-S"'); expect(csv).toContain('"32.10"');
    expect(csv).toContain("Variant Image"); expect(csv).toContain("Variant Inventory Qty");
  });
  it("Woo conserve tous les attributs et ne confond pas deux combinaisons ou accents proches", () => {
    const s = multiAxisSpec(); const csv = wooProductsCsv(s);
    expect(csv).toContain("Attribute 3 name"); expect(csv).toContain('"Câble"');
    expect(csv).toContain('"LAMPE-ÉTÉ-S"'); expect(csv).toContain('"Long"');
    const variations = csv.split("\n").filter(l => l.startsWith('"variation"') && l.includes(`"${s.store.product.handle}"`));
    expect(variations).toHaveLength(3);
    const skus = variations.map(l => l.split('","')[1]);
    expect(new Set(skus).size).toBe(3);
    expect(csv).toContain('"45.60"');
  });
  it("une cible Presta invalide ne devient pas le produit principal", () => {
    const s = multiAxisSpec(); s.templates.index = { order: ["bad"], sections: { bad: { type: "featured-product", settings: { product: "produit-inexistant" } } } };
    adaptFeaturedProduct(s, fr => fr);
    expect(JSON.stringify(s.templates.index)).not.toContain(`/products/${s.store.product.handle}`);
    expect(s.templates.index.sections.bad.disabled).toBe(true);
  });
  it("une présentation produit désactivée n'est jamais réactivée par l'adaptation Presta", () => {
    const s=multiAxisSpec();const sec={type:'featured-product',disabled:true,settings:{product:s.store.product.handle}};
    s.templates.index={order:['hidden'],sections:{hidden:sec}};const before=structuredClone(sec);
    adaptFeaturedProduct(s,fr=>fr);expect(s.templates.index.sections.hidden).toEqual(before);
  });
  it("les données complètes des sections restent livrées même quand le CMS utilise sa fiche native", async () => {
    const s=multiAxisSpec();s.templates.product.sections.longtext={type:'rich-text',settings:{heading:'Fin de texte préservée',text:'Texte conservé. '.repeat(300)+'FIN_SOURCE_COMPLÈTE'}};s.templates.product.order.push('longtext');
    for(const platform of ['woocommerce','prestashop'] as const){
      const e=await cmsExport(platform,s,()=>null);const z=unzipSync(e.zip);const p=Object.keys(z).find(p=>p.endsWith('configuration-studio.json')||p==='config/es-studio.json')!;
      expect(strFromU8(z[p])).toContain('FIN_SOURCE_COMPLÈTE');
    }
  });
  it("la grille Woo reçoit une vraie adaptation native respectant la collection choisie", async () => {
    const s = multiAxisSpec(); const collection = s.store.collections![0];
    s.templates.index = { order: ["catalog"], sections: { catalog: { type: "featured-collection", settings: { heading: "Sélection contrôlée", collection: collection.handle, limit: 3, columns: 3 } } } };
    const e = await cmsExport("woocommerce", s, () => null);
    expect(e.issues.some(i => i.code === "catalog_collection_requires_native_block")).toBe(false);
    const z = unzipSync(e.zip); const front = strFromU8(z[Object.keys(z).find(p => p.endsWith("/templates/front-page.html"))!]);
    expect(front).toContain("es/catalog"); expect(front).toContain(collection.handle);
  });
  it("Presta réécrit chaque image d'un srcset et les fonds, sans laisser de chemin temporaire", () => {
    const s=toSmarty('<img srcset="/assets/a.jpg 500w, /assets/b.jpg 1000w"><div style="background:url(\'/assets/c.jpg\')"></div>', 'es-test');
    expect(s).not.toContain('"/assets/'); expect(s).not.toContain(', /assets/');
    for(const f of ['a.jpg','b.jpg','c.jpg'])expect(s).toContain('themes/es-test/assets/es/'+f);
  });
  it("conserve les combinaisons avec accents mais refuse un CSV Woo ambigu au lieu de fusionner", () => {
    const s=multiAxisSpec();s.store.product.variants[1].options=['Ete','S','Court'];
    expect(()=>wooProductsCsv(s)).toThrow(/catalog_csv_value_collision_use_local_import/);
    const c=catalogSnapshot(s,{});expect(c.products[0].variants).toHaveLength(3);
    expect(c.products[0].variants[0].options[0]).toBe('Été');expect(c.products[0].variants[1].options[0]).toBe('Ete');
  });
  it("Shopify refuse quatre axes plutôt que d'en perdre un ; Woo conserve le quatrième", () => {
    const s=multiAxisSpec();s.store.product.options.push('Alimentation');for(const v of s.store.product.variants)v.options.push('USB');
    expect(()=>shopifyProductsCsv(s)).toThrow(/catalog_options_limit/);expect(wooProductsCsv(s)).toContain('Attribute 4 name');
  });
  it("refuse les SKU qui se confondent sous une collation native plutôt que d'adopter le mauvais produit", () => {
    const s=multiAxisSpec();s.store.product.variants[0].sku='ÉTÉ-S';s.store.product.variants[1].sku='ETE-S';
    expect(()=>wooProductsCsv(s)).toThrow(/catalog_sku_collision/);expect(()=>shopifyProductsCsv(s)).toThrow(/catalog_sku_collision/);
  });
  it("prépare les bonnes images Shopify depuis les fichiers livrés et un mapping HTTPS explicite, sans réseau", () => {
    const s=multiAxisSpec();const f='es-packshot.jpg';s.files[f]='test';s.store.product.images=[f];s.store.product.variants[0].image=f;
    const c=catalogSnapshot(s,{[f]:new Uint8Array([1,2,3])});const csv=prepareShopifyCsv(c,{[f]:'https://cdn.shopify.com/control.jpg'});
    expect(csv).toContain('https://cdn.shopify.com/control.jpg');expect(csv).toContain('"LAMPE-ÉTÉ-S"');
    expect(()=>prepareShopifyCsv(c,{})).toThrow(/manquante/);expect(()=>prepareShopifyCsv(c,{[f]:'http://localhost/image.jpg'})).toThrow(/HTTPS/);
  });
  it("un service reste sans catalogue, y compris dans les données de reprise des kits", async () => {
    const s=serviceSpec();s.store.pages.push({handle:'page-libre',title:'Conseil spécialisé',template_suffix:'',body_html:'<p>Contenu complet de la page libre.</p>'});
    const e=await cmsExport('wix',s,()=>null);const z=unzipSync(e.zip);
    expect(JSON.parse(strFromU8(z['catalogue.json'])).products).toEqual([]);
    expect(strFromU8(z['configuration-studio.json'])).toContain('Contenu complet de la page libre.');
    expect(Object.keys(z).some(p=>p.endsWith('.csv'))).toBe(false);
  });
  it("les cinq formats excluent réellement les octets et associations des médias étrangers ou refusés", async () => {
    const {createUser}=await import('@/lib/auth');const {seedImageFixture}=await import('./image-v2-fixtures');
    const {saveAsset}=await import('@/lib/library');const {libraryLoader}=await import('@/lib/theme/loader');const sharp=(await import('sharp')).default;
    const user=await createUser('catalog-isolation-'+Date.now()+'@example.invalid','isolated-test-only','Test');
    const own=seedImageFixture(user.id,'cosmetic'),other=seedImageFixture(user.id,'artisan');
    const bytes=await sharp({create:{width:30,height:40,channels:3,background:'#123456'}}).jpeg().toBuffer();
    const save=(projectId:string,status:'approved'|'rejected',name:string)=>saveAsset({projectId,userId:user.id,data:bytes,mime:'image/jpeg',name,role:'catalog-original',origin:'upload',status});
    const a=await save(own,'approved','own.jpg'),b=await save(other,'approved','foreign.jpg'),c=await save(own,'rejected','rejected.jpg');
    const s=multiAxisSpec();s.files={'own.jpg':a.id,'foreign.jpg':b.id,'rejected.jpg':c.id};s.store.product.images=Object.keys(s.files);
    for(const platform of ['shopify','woocommerce','prestashop','wix','squarespace'] as const){
      const e=await cmsExport(platform,s,libraryLoader,{projectId:own});const z=unzipSync(e.zip);
      expect(e.media).toContain('own.jpg');expect(e.media).not.toContain('foreign.jpg');expect(e.media).not.toContain('rejected.jpg');
      expect(Object.keys(z).some(f=>f.endsWith('/foreign.jpg')||f.endsWith('/rejected.jpg'))).toBe(false);
      const f=Object.keys(z).find(f=>f.endsWith('catalogue.json'))!;const catalog=JSON.parse(strFromU8(z[f]));
      expect(catalog.products[0].images).toEqual(['own.jpg']);expect(Object.keys(catalog.media)).toEqual(['own.jpg']);
    }
  });
});
