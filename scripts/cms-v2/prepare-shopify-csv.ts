/** Hors ligne : catalogue livré + correspondance des fichiers déjà téléversés dans Shopify → CSV natif. */
import fs from 'node:fs';
import { shopifyProductsCsv } from '../../src/lib/theme/catalog-export';
import type { ThemeSpec } from '../../src/lib/theme/spec';
export function prepareShopifyCsv(catalog: any, urls: Record<string,string>) {
 if(catalog.version!==1||catalog.business==='services'||!Array.isArray(catalog.products)||!catalog.products.length)throw new Error('Catalogue produits version 1 requis');
 for(const [file,url] of Object.entries(urls)){
  if(!catalog.media[file])throw new Error('Média absent du catalogue : '+file);
  const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new Error('URL HTTPS de fichier requise');
 }
 const products=catalog.products.map((p:any)=>({...p,variants:p.variants.map((v:any)=>({...v,image:v.image??undefined}))}));
 const needed=new Set<string>(products.flatMap((p:any)=>[...p.images,...p.variants.map((v:any)=>v.image).filter(Boolean)]));
 for(const file of needed)if(!urls[file])throw new Error('URL du fichier téléversé manquante : '+file);
 const spec={store:{business:'products',product:products[0],products:products.slice(1),collections:catalog.collections},files:Object.fromEntries(Object.keys(catalog.media).map(f=>[f,f]))} as ThemeSpec;
 return '\ufeff'+shopifyProductsCsv(spec,{imageUrls:urls});
}
if(process.argv[1]?.endsWith('prepare-shopify-csv.ts')){
 const [catalog,map,output]=process.argv.slice(2);if(!catalog||!map||!output)throw new Error('Usage: prepare-shopify-csv.ts catalogue.json correspondance-urls.json sortie.csv');
 fs.writeFileSync(output,prepareShopifyCsv(JSON.parse(fs.readFileSync(catalog,'utf8')),JSON.parse(fs.readFileSync(map,'utf8'))));
 console.log('CSV préparé localement. Contrôlez les produits en brouillon avant de les publier ; aucun envoi effectué.');
}
