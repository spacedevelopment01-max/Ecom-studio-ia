/** Rendu PHP local extrait des vrais ZIP WordPress ; aucune installation CMS ni requête réseau. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync}from'node:child_process';import{unzipSync}from 'fflate';
if(process.env.DATA_DIR||process.env.DATABASE_FILE)throw new Error('Base existante refusée');
const data=fs.mkdtempSync(path.join(os.tmpdir(),'lot2b-php-data-'));process.env.DATA_DIR=data;process.env.STOCK_OFFLINE='1';
const root=process.cwd(),out=path.resolve(process.argv[2]??'reports/lot2b');
const{flatStrings,liquidGlobals,normalizedSection,sectionSchemaOf}=await import('../src/lib/cms-v2/liquid');
const{compileTheme}=await import('../src/lib/theme/compile');
const{guardPurchaseExport}=await import('../src/lib/theme/purchase-offers');
const {canonicalHtml}=await import('./lib/cms-parity');
const results=[];
for(const demo of ['orbe','atelier-rive']){
 const original=JSON.parse(fs.readFileSync(path.join(out,demo,'theme-spec.json'),'utf8')),spec=guardPurchaseExport(original,'woocommerce').spec,files=compileTheme(spec),dir=fs.mkdtempSync(path.join(os.tmpdir(),'lot2b-php-'));
 try{
 const zip=unzipSync(fs.readFileSync(path.join(out,demo,'woocommerce.zip'))),prefix=Object.keys(zip).find(x=>x.endsWith('/inc/php/es-liquid.php'))!.split('/inc/')[0]+'/inc/';
 for(const[file,bytes]of Object.entries(zip))if(file.startsWith(prefix)){const dest=path.join(dir,file.slice(prefix.length));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes as Uint8Array);}
 const list=spec.templates.index.order.map((id:string)=>({id,s:spec.templates.index.sections[id]})).filter(({s}:any)=>s.type.startsWith('ed-')||s.type==='ref-narrative');
 const globals=liquidGlobals({files,settings:spec.settings,shopName:spec.store.shopName,menus:spec.store.menus,url:(p:string)=>p,pageType:'index',policies:spec.store.policies});
 const sections=list.map(({id,s}:any)=>({type:s.type,section:normalizedSection(id,s,sectionSchemaOf(files.get(`sections/${s.type}.liquid`)??''))}));
 // Adaptateur CLI minimal : le moteur et les sections exécutés sont ceux du ZIP.
 const input=JSON.stringify({dir,assetBase:'/assets/',strings:flatStrings(files,'fr'),globals,sections});
 const runner = 'require $argv[1]; $in=json_decode(stream_get_contents(STDIN),true); EsFilters::$assetBase=$in["assetBase"]; EsFilters::$strings=$in["strings"]; $out=[]; foreach($in["sections"] as $s) $out[]=es_liquid_render_section($in["dir"],$s["type"],$s["section"],$in["globals"]); echo implode("\\n<!--es-section-->\\n",$out);';
 const html=execFileSync('php',['-r',runner,path.join(dir,'php/es-liquid.php')],{input,maxBuffer:16*1024*1024}).toString();
 const sectionsHtml=html.split('\n<!--es-section-->\n');const checks=list.map(({id,s}:any,i:number)=>({id,type:s.type,headingPreserved:!s.settings.heading||canonicalHtml(sectionsHtml[i]??'').includes(String(s.settings.heading).split('\n')[0]),bytes:sectionsHtml[i]?.length??0}));
 results.push({demo,source:'Moteur PHP et sections extraits du ZIP WordPress réellement produit',checks,errors:[],catalogContext:'Non alimenté par WooCommerce dans ce test ; les variantes natives et le contact CMS ne sont pas certifiés'});
 if(checks.some((c:any)=>!c.headingPreserved))throw new Error('Un titre éditorial manque dans le rendu PHP');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
fs.writeFileSync(path.join(out,'php-exports.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));

fs.rmSync(data,{recursive:true,force:true});
