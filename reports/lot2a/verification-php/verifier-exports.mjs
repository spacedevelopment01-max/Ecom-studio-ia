/** npx tsx : régénère les deux ZIP Woo avec les médias déjà autorisés, puis exécute le PHP extrait. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { cmsExport } from '../../../src/lib/cms-v2/export.ts';
import { guardPurchaseExport } from '../../../src/lib/theme/purchase-offers.ts';
import { compileTheme } from '../../../src/lib/theme/compile.ts';
import { runWithLang } from '../../../src/lib/i18n-server.ts';
import { flatStrings, liquidGlobals, normalizedSection, sectionSchemaOf } from '../../../src/lib/cms-v2/liquid.ts';
import { studioSections, sectionsOf, canonicalHtml, firstDiff } from '../../../scripts/lib/cms-parity.ts';
if (!process.env.DATA_DIR || process.env.STOCK_OFFLINE !== '1') throw new Error('Base de test explicite et STOCK_OFFLINE=1 requis.');
globalThis.fetch = async () => { throw new Error('Réseau interdit dans la recette PHP.'); };
const output=path.dirname(fileURLToPath(import.meta.url));
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const sourceFiles=Object.fromEntries(['assets/cms/php/es-liquid.php','src/lib/cms-v2/adapters/wordpress.ts','tests/lot2a-php-export.test.ts'].map(f=>[f,sha(fs.readFileSync(f))]));
const results=[];
for(const kind of ['products','services']) {
 const inputRoot=path.resolve(output,'../passe-2',kind);
 const spec=JSON.parse(fs.readFileSync(path.join(inputRoot,'theme-spec.json'),'utf8'));
 const original=unzipSync(fs.readFileSync(path.join(inputRoot,'shopify.zip')));
 const byId=new Map(Object.entries(spec.files).map(([file,id])=>{
  const data=original[`assets/${file}`],ext=path.extname(file).slice(1).toLowerCase();
  return [id,data?{data:Buffer.from(data),mime:({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',svg:'image/svg+xml',mp4:'video/mp4'})[ext]??'application/octet-stream',updated:0}:null];
 }));
 const load=(id)=>byId.get(id)??null;
 const exp=await runWithLang({ui:'fr',content:'fr'},()=>cmsExport('woocommerce',spec,load));
 fs.writeFileSync(path.join(output,`${kind}-woocommerce.zip`),exp.zip);
 const files=unzipSync(exp.zip), dir=fs.mkdtempSync(path.join(os.tmpdir(),'lot2a-zip-php-'));
 try {
  for(const [file,data] of Object.entries(files)) {
   if(file.includes('..')||path.isAbsolute(file))throw new Error('Chemin non sûr');
   const to=path.join(dir,file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,data);
  }
  const root=Object.keys(files).find(f=>f.endsWith('/inc/php/es-liquid.php')).replace(/php\/es-liquid.php$/,'');
  const phpFiles=Object.keys(files).filter(f=>f.endsWith('.php'));
  for(const file of phpFiles)execFileSync('php',['-l',path.join(dir,file)],{stdio:'pipe'});
  const guarded=guardPurchaseExport(spec,'woocommerce').spec, compiled=compileTheme(guarded);
  const globals=liquidGlobals({files:compiled,settings:guarded.settings,shopName:guarded.store.shopName,menus:guarded.store.menus,url:p=>p,policies:guarded.store.policies});
  const studio=await runWithLang({ui:'fr',content:'fr'},()=>studioSections(guarded));
  const sections=['index','group:header','group:footer'].flatMap(where=>sectionsOf(guarded,where).map(({id,s})=>({where:`${where}:${id}`,type:s.type,section:normalizedSection(id,s,sectionSchemaOf(compiled.get(`sections/${s.type}.liquid`)??''))})));
  const code='require $argv[1]; $in=json_decode(stream_get_contents(STDIN),true); EsFilters::$assetBase="/assets/"; EsFilters::$strings=$in["strings"]; $out=[]; foreach($in["sections"] as $s) $out[]=es_liquid_render_section($argv[2],$s["type"],$s["section"],$in["globals"]); echo json_encode($out);';
  const rendered=JSON.parse(execFileSync('php',['-r',code,path.join(dir,root,'php/es-liquid.php'),path.join(dir,root)],{input:JSON.stringify({sections,globals,strings:flatStrings(compiled,'fr')}),maxBuffer:64*1024*1024}).toString());
  const comparisons=sections.map((s,i)=>{
   const a=canonicalHtml(studio.find(r=>r.where===s.where)?.html??'',{adapt:true}),b=canonicalHtml(rendered[i],{adapt:true});
   const commerce=['featured-collection','featured-product'].includes(s.type);
   return {where:s.where,type:s.type,same:a===b,commerceRequiresNativeBlock:commerce,...(a!==b?{diff:firstDiff(a,b)}:{})};
  });
  if(comparisons.some(r=>!r.same&&!r.commerceRequiresNativeBlock))throw new Error('Écart éditorial PHP non prévu');
  const currentSha=Object.fromEntries(Object.keys(sourceFiles).map(f=>[f,sha(fs.readFileSync(f))]));
  if(JSON.stringify(currentSha)!==JSON.stringify(sourceFiles))throw new Error('Sources changées pendant la recette');
  results.push({kind,archive:`${kind}-woocommerce.zip`,sha256:sha(exp.zip),files:Object.keys(files).length,phpSyntaxChecked:phpFiles.length,issues:exp.issues,comparisons});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
const receipt={sourceBase:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFiles,phpVersion:execFileSync('php',['-v'],{encoding:'utf8'}).split('\n')[0],cmsInstalled:false,realCheckoutVerified:false,aiCalls:0,results};
fs.writeFileSync(path.join(output,'exports-et-parite.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({sourceBase:receipt.sourceBase,results:results.map(r=>({kind:r.kind,files:r.files,phpSyntaxChecked:r.phpSyntaxChecked,editorialPassed:r.comparisons.filter(c=>c.same).length,commerceDifferences:r.comparisons.filter(c=>!c.same).map(c=>c.type)}))}));
