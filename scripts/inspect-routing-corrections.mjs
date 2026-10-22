/** Targeted local-only inspection: no key decryption, HTTP, mutation or generation. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {parseEnv} from 'node:util';

const approved = ['qwen-image-3.0-pro','qwen-image-3.0','qwen-image-2.0-pro','wan2.6-i2v-flash','wan2.6-t2v','claude-haiku-4-5','claude-haiku-5-5','veo-3.0-generate-001','veo-3.1-generate-preview'];
const providers = ['alibaba','anthropic','google','fal','openai'];
export function describeModel(provider, value) {
  if(typeof value!=='string')return {code:'MISSING_OR_NON_STRING',model:null};
  if(approved.includes(value))return {code:'EXACT_PUBLIC_ID',model:value};
  const normalized=value.normalize('NFKC').trim().toLowerCase().replace(/[_ ]+/g,'-');
  const alias=approved.find(id=>id===normalized||id===normalized.replace(/^qwen-image-3-pro$/,'qwen-image-3.0-pro'));
  let jsonAlias=null;try{const decoded=JSON.parse(value);if(typeof decoded==='string'&&approved.includes(decoded))jsonAlias=decoded;}catch{}
  const prefix=providers.find(p=>value.startsWith(`${p}:`)&&approved.includes(value.slice(p.length+1)));
  return {code:alias?'NORMALIZATION_MATCH':jsonAlias?'JSON_QUOTED_PUBLIC_ID':prefix?'PROVIDER_PREFIX_IN_MODEL_FIELD':'UNRECOGNIZED_VALUE_REQUIRES_LOCAL_ADMIN_REVIEW',model:null,publicCandidate:alias??jsonAlias??(prefix?value.slice(prefix.length+1):null),provider:providers.includes(provider)?provider:'indeterminate'};
}
export function analyzeRoutingSettings(settings) {
  const routes=settings['ai.routes']??{},usages=settings['ai.media.usage']??{};
  const rows=['product_image','ad_visual','social_image','scene'].map(usage=>{
    const exact=usages[usage]?.primary,parent=usage==='social_image'?usages.ad_visual?.primary:null;
    const selected=exact??parent;
    const provider=selected?String(selected).split(':')[0]:routes.image_generation?.provider;
    const value=selected?String(selected).split(':').slice(1).join(':'):routes.image_generation?.model;
    return {usage,origin:exact?'USAGE_PRIMARY':parent?'AD_VISUAL_PARENT':'IMAGE_GENERATION_ROUTE_OR_DEFAULT',...describeModel(provider,value)};
  });
  return {schema:'studio-routing-correction-preview-1',readOnly:true,providerCalls:0,generations:0,configurationChanges:0,modelsMaskedUnlessApproved:true,images:rows,text:['photo_triage','classification'].map(task=>({task,...describeModel(routes[task]?.provider,routes[task]?.model)})),limitations:['No authentication or catalogue recheck. Prior Thomas evidence remains acquired.','No generation rights inferred. Unknown literal never exported. No automatic normalization or configuration migration.','Worker environment-file selection only; running processes and served version not probed.']};
}
export function inspect(root=process.cwd()) {
  const require=createRequire(path.join(root,'package.json'));
  const vars={...process.env};
  for(const name of ['.env.local','.env']){const file=path.join(root,name);if(fs.existsSync(file))for(const [key,value] of Object.entries(parseEnv(fs.readFileSync(file,"utf8"))))if(vars[key]===undefined)vars[key]=value;}
  const databaseFile=vars.DATABASE_FILE||path.join(vars.DATA_DIR||path.join(root,'data'),'studio.db');
  const Database=require('better-sqlite3'),db=new Database(databaseFile,{readonly:true,fileMustExist:true});
  try {
    db.pragma('query_only=ON');
    const settings={};
    for(const key of ['ai.routes','ai.media.usage']){
      const row=db.prepare('SELECT value,secret FROM settings WHERE key=?').get(key);
      if(row?.secret)continue;
      try{settings[key]=JSON.parse(row?.value??'{}');}catch{}
    }
    const result=analyzeRoutingSettings(settings);
    result.checkoutCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
    return result;
  }finally{db.close();}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{process.stdout.write(JSON.stringify(inspect())+'\n');}catch{process.stdout.write(JSON.stringify({schema:'studio-routing-correction-preview-1',readOnly:true,providerCalls:0,generations:0,failure:'LOCAL_READ_FAILED_NO_RAW_ERROR'})+'\n');process.exitCode=1;}
}
