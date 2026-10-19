/** Contrôle des vrais ZIP, empreintes média et Theme Check officiel après extraction. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import{createHash}from'node:crypto';
const require=createRequire(import.meta.url);const{unzipSync}=require('fflate'),{check}=require('@shopify/theme-check-node');const root=path.resolve(process.argv[2] || ''),results:any[]=[];if(!process.argv[2]||root===process.cwd()||root.startsWith(process.cwd()+'/'))throw new Error('Dossier privé hors dépôt requis');
for(const kind of ['products','services'])for(const platform of ['shopify','woocommerce','prestashop','wix','squarespace']){
 const entries=unzipSync(fs.readFileSync(path.join(root,kind,platform,'export.zip')));const names=Object.keys(entries),prefix=platform==='woocommerce'?names[0].split('/')[0]+'/':'';
 const file=names.find(n=>n.endsWith('catalogue.json')),catalog=JSON.parse(Buffer.from(entries[file]).toString());const mediaPrefix=platform==='woocommerce'?prefix+'assets/es/':platform==='prestashop'?'assets/es/':platform==='shopify'?'assets/':'medias/';
 for(const[name,meta]of Object.entries(catalog.media) as any){if(!entries[mediaPrefix+name]||createHash('sha256').update(entries[mediaPrefix+name]).digest('hex')!==meta.sha256)throw Error('Média absent ou différent : '+kind+'/'+platform+'/'+name);}
 const row:any={kind,platform,products:catalog.products.length,variants:catalog.products.reduce((n:any,p:any)=>n+p.variants.length,0),media:Object.keys(catalog.media).length};
 if(platform==='shopify'){const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'catalog-theme-check-'));try{for(const[n,b]of Object.entries(entries)){if(n.includes('..')||path.isAbsolute(n))throw Error('Chemin ZIP');const dest=path.join(tmp,n);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b as Uint8Array);}const findings=await check(tmp);row.themeCheckErrors=findings.filter((f:any)=>f.severity===0).map((f:any)=>({check:f.check,message:f.message,file:f.uri.replace(tmp,'')}));row.themeCheckWarnings=findings.filter((f:any)=>f.severity===1).length;if(row.themeCheckErrors.length)throw Error(JSON.stringify(row));}finally{fs.rmSync(tmp,{recursive:true,force:true});}}
 results.push(row);
}
fs.writeFileSync(path.join(root,'archive-checks.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
