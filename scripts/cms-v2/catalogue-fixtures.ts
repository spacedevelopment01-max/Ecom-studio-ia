/** Préparation d'archives réelles depuis deux projets enregistrés et rechargés. Médias synthétiques uniquement. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import sharp from 'sharp';
const out = path.resolve(process.argv[2] || '');
if (!process.argv[2] || out.startsWith(process.cwd() + '/')) throw new Error('Dossier privé hors dépôt requis');
fs.mkdirSync(out,{recursive:true});
const data = fs.mkdtempSync(path.join(os.tmpdir(),'es-catalogue-proof-'));
if (process.env.DATA_DIR) throw new Error('Refus de réutiliser une base préconfigurée');
process.env.DATA_DIR=data;process.env.STOCK_OFFLINE='1';
globalThis.fetch=async()=>{throw new Error('Réseau fournisseur interdit dans ce banc');};
const { createUser }=await import('../../src/lib/auth');
const { seedImageFixture }=await import('../../tests/image-v2-fixtures');
const { multiAxisSpec }=await import('../../tests/cms-catalogue-fixtures');
const { serviceSpec }=await import('../../tests/fixtures');
const { saveAsset }=await import('../../src/lib/library');
const { saveThemeVersion,currentTheme }=await import('../../src/lib/projects');
const { cmsExport }=await import('../../src/lib/cms-v2/export');
const { libraryLoader }=await import('../../src/lib/theme/loader');
const { one }=await import('../../src/lib/db');
const { shopifyProductsCsv,wooProductsCsv }=await import('../../src/lib/theme/catalog-export');
const u=await createUser('catalogue-export@example.invalid','donnees-test-isolees','Test');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const results:any[]=[];
try {
 for (const kind of ['products','services'] as const) {
  const pid=seedImageFixture(u.id,kind==='products'?'cosmetic':'artisan');
  const s=kind==='products'?multiAxisSpec():serviceSpec();
  s.store.shopName=kind==='products'?'Catalogue de contrôle':'Activité de contrôle';
  const names=new Set(Object.keys(s.files));
  const serialized=JSON.stringify([s.templates,s.groups]);
  for(const m of serialized.matchAll(/es-[A-Za-z0-9_-]+\.(?:jpg|webp|png)/g))names.add(m[0]);
  for(const p of [s.store.product,...s.store.products??[]])for(const name of p.images)names.add(name);
  if(kind==='products')for(const name of ['es-produit-a.jpg','es-produit-b.jpg','es-accessoire-c.jpg','es-accessoire-d.jpg','es-echantillon.jpg'])names.add(name);
  s.files={};let index=0;
  for(const name of names) {
   const color='#'+createHash('sha256').update(name).digest('hex').slice(0,6);index++;
   const bytes=await sharp({create:{width:500,height:600,channels:3,background:color}}).jpeg().toBuffer();
   const a=await saveAsset({projectId:pid,userId:u.id,data:bytes,name,mime:'image/jpeg',role:'catalog-original',folderKey:'product.catalog',origin:'upload',status:'approved',meta:{demo:true,demoNote:'Mire synthétique de régression, pas une photo de produit'}});s.files[name]=a.id;
  }
  if(kind==='products') {
   const p=s.store.product;p.images=['es-produit-a.jpg','es-produit-b.jpg'];p.variants[0].image=p.images[0];p.variants[1].image=p.images[1];p.seo={title:'Titre SEO conservé',description:'Description SEO du catalogue de contrôle.'};
   s.store.products![0].images=['es-accessoire-c.jpg'];s.store.products![1].images=['es-accessoire-d.jpg'];
   s.store.products!.push({...structuredClone(p),handle:'echantillon-carre',title:'Échantillon carré',options:['Matière'],images:['es-echantillon.jpg'],variants:[{title:'Été',options:['Été'],sku:'ECH-01',price:1234,available:true,inventory_quantity:2},{title:'Ete',options:['Ete'],sku:'ECH-02',price:2345,available:true,inventory_quantity:3}]});
   s.templates.index={order:['catalog','featured'],sections:{catalog:{type:'featured-collection',settings:{heading:'Sélection contrôlée',collection:s.store.collections![0].handle,columns:3,limit:3}},featured:{type:'featured-product',settings:{product:p.handle}}}};
  }
  saveThemeVersion(pid,s,'Banc export synthétique','system');
  const loaded=currentTheme(pid)!.spec;
  if(JSON.stringify(s)!==JSON.stringify(loaded))throw new Error('Version enregistrée non conservée');
  fs.writeFileSync(path.join(out,kind+'-spec.json'),JSON.stringify(loaded,null,2));
  if(kind==='products'){
   fs.writeFileSync(path.join(out,'produits-shopify.csv'),'\ufeff'+shopifyProductsCsv(loaded));
   try{fs.writeFileSync(path.join(out,'produits-woocommerce.csv'),'\ufeff'+wooProductsCsv(loaded));}catch(e){if(!(e instanceof Error)||!e.message.startsWith('catalog_csv_value_collision'))throw e;fs.writeFileSync(path.join(out,'limite-csv-woo.txt'),e.message);}
   const control=structuredClone(loaded);
   control.store.products=control.store.products?.filter(p=>p.handle!=='echantillon-carre');
   for(const p of [control.store.product,...control.store.products??[]]){p.handle='csv-'+p.handle;for(const v of p.variants)if(v.sku)v.sku='CSV-'+v.sku;}
   fs.writeFileSync(path.join(out,'produits-woocommerce-controle.csv'),'\ufeff'+wooProductsCsv(control));
  }
  for(const platform of ['shopify','woocommerce','prestashop','wix','squarespace'] as const){
   const e=await cmsExport(platform,loaded,libraryLoader,{projectId:pid});
   const dir=path.join(out,kind,platform);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'export.zip'),e.zip);
   const entries=unzipSync(e.zip);
   for(const [name,bytes] of Object.entries(entries)){if(name.includes('..')||name.startsWith('/'))throw new Error('Chemin export invalide');const dest=path.join(dir,'extrait',name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);}
   const catalogueFile=Object.keys(entries).find(p=>p.endsWith('catalogue.json'))!;
   const catalog=JSON.parse(strFromU8(entries[catalogueFile]));
   if(kind==='services'&&catalog.products.length)throw new Error('Commerce ajouté au service');
   results.push({kind,platform,files:Object.keys(entries).length,products:catalog.products.length,media:Object.keys(catalog.media).length,issues:e.issues});
  }
  if(kind==='products'){
   const changed=structuredClone(loaded);changed.store.product.variants[0].price=3335;changed.store.product.variants[0].inventory_quantity=5;changed.store.product.variants[0].sku='LAMPE-ÉTÉ-S-MAJ';changed.store.product.variants[0].image='es-produit-b.jpg';
   saveThemeVersion(pid,changed,'Réexportation contrôlée : prix, stock, SKU et image','system');
   for(const platform of ['woocommerce','prestashop'] as const){
    const e=await cmsExport(platform,currentTheme(pid)!.spec,libraryLoader,{projectId:pid});const dir=path.join(out,'products-update',platform);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'export.zip'),e.zip);
   }
  }
 }
 if(one<{n:number}>('SELECT COUNT(*) AS n FROM ai_calls')!.n)throw new Error('Appel IA non attendu');
 fs.writeFileSync(path.join(out,'archives.json'),JSON.stringify({testedCommit:sha,workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()?'modified':'clean',results,paidCalls:0},null,2));
 console.log(JSON.stringify({out,archives:results.length,paidCalls:0}));
} finally { fs.rmSync(data,{recursive:true,force:true}); }
