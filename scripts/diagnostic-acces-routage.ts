/** Lot 5 prerequisite: read existing configuration, resolve native routes, never call a provider.
 * node --import tsx scripts/diagnostic-acces-routage.ts [--config-root /path/to/studio]
 * No secret value, fragment, length, digest, prompt, account or customer record is exported.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const codeRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const providers=['anthropic','openai','google','fal','alibaba','pexels','pixabay'] as const;
const aliases:Record<string,string[]>={anthropic:['ANTHROPIC_API_KEY'],openai:['OPENAI_API_KEY'],google:['GOOGLE_API_KEY','GEMINI_API_KEY'],fal:['FAL_KEY','FAL_API_KEY'],alibaba:['DASHSCOPE_API_KEY','ALIBABA_MODEL_STUDIO_API_KEY'],pexels:['PEXELS_API_KEY'],pixabay:['PIXABAY_API_KEY']};
const safeGit=(root:string)=>{try{const s=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();return /^[a-f0-9]{40}$/.test(s)?s:null;}catch{return null;}};
const present=(v:unknown)=>typeof v==='string'&&!!v.trim();
const arg=(name:string)=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1]??null;};

export async function inspectAccessAndRouting(configRoot:string,loader:'worker'|'next'='worker'){
 const require=createRequire(path.join(codeRoot,'package.json'));
 const {loadEnvConfig}=require('@next/env');
 const mode=process.env.NODE_ENV==='production'?'production':process.env.NODE_ENV==='test'?'test':'development';
 if(loader==='next')loadEnvConfig(configRoot,mode==='development',{info(){},error(){}},true);
 else for(const file of ['.env.local','.env']){const p=path.join(configRoot,file);if(fs.existsSync(p))process.loadEnvFile(p);}
 const dataDir=path.resolve(configRoot,process.env.DATA_DIR||'data');
 const databaseFile=path.resolve(configRoot,process.env.DATABASE_FILE||path.join(dataDir,'studio.db'));
 const parameterPresence=providers.map(provider=>({provider,parameters:[`PROVIDER_${provider.toUpperCase()}_APIKEY`,...aliases[provider]].map(parameter=>({parameter,present:present(process.env[parameter])}))}));
 const result:any={schema:'studio-access-routing-diagnostic-1',capturedAt:new Date().toISOString(),readOnly:true,realProviderCalls:0,networkCalls:0,generationOrRetry:false,configurationChanged:false,codeCommit:safeGit(codeRoot),configurationCheckoutCommit:safeGit(configRoot),environmentMode:mode,servedVersion:'not_probed',
  storage:{databasePresent:fs.existsSync(databaseFile),databaseSelectorExplicit:present(process.env.DATABASE_FILE),dataSelectorExplicit:present(process.env.DATA_DIR)},
  configurationLoader:loader,
  masterSecret:{parameter:'APP_SECRET',present:present(process.env.APP_SECRET),meetsNativeMinimum:!!process.env.APP_SECRET&&process.env.APP_SECRET.length>=32,fallbackFilePresent:fs.existsSync(path.join(dataDir,'.app-secret')),validity:'not_verified_without_encrypted_provider_record'},
  parameterPresence,providers:[],textRoutes:[],mediaRoutes:[],nativeResolution:{available:false,reason:'DATABASE_ABSENT'},limitations:['A resolved route is not a successful model call or model authorization.','This process reads one local configuration. CI, Codespace and deployed studio credentials are not inferred.','No secret values, fragments or fingerprints are exported.']};
 if(!fs.existsSync(databaseFile))return result;
 const Database=require('better-sqlite3');let database:any;
 try{database=new Database(databaseFile,{readonly:true,fileMustExist:true});database.pragma('query_only = ON');}catch{result.nativeResolution.reason='DATABASE_UNREADABLE';return result;}
 const settingsExist=!!database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='settings'").get();
 if(!settingsExist){database.close();result.nativeResolution.reason='SETTINGS_TABLE_ABSENT';return result;}
 // Expose only the already-open read-only connection. Native db.open/migrations are never invoked.
 const globals=globalThis as any;const previousDb=globals.__ecomDb;globals.__ecomDb=database;
 const previousCwd=process.cwd();process.chdir(configRoot);
 const fetchBefore=globalThis.fetch;globalThis.fetch=async()=>{throw Error('DIAGNOSTIC_NETWORK_FORBIDDEN');};
 const mkdirBefore=fs.mkdirSync,writeBefore=fs.writeFileSync,appendBefore=fs.appendFileSync;
 // Native storage imports create directories eagerly; suppress that side effect during inspection.
 (fs as any).mkdirSync=()=>undefined;
 (fs as any).writeFileSync=()=>{throw Error('DIAGNOSTIC_WRITE_FORBIDDEN');};
 (fs as any).appendFileSync=()=>{throw Error('DIAGNOSTIC_WRITE_FORBIDDEN');};
 let stage='configuration_import';
 try{
  const imported=async(file:string)=>import(pathToFileURL(path.join(codeRoot,file)).href);
  const config=await imported('src/lib/ai/config.ts');const settings=await imported('src/lib/settings.ts');
  const gateway=await imported('src/lib/ai/gateway.ts');
  stage='credential_resolution';
  for(const provider of providers){
   const parameter=`provider.${provider}.apiKey`;const stored=database.prepare('SELECT secret,CASE WHEN length(value)>0 THEN 1 ELSE 0 END has_value FROM settings WHERE key=?').get(parameter);
   let key:string|null=null,decryption:'absent'|'accessible'|'present_but_unusable'=stored?.has_value?'present_but_unusable':'absent';let source='none',disabled=false;
   try{
    const selected=settings.getSetting(parameter);if(present(selected)){if(stored)decryption='accessible';source=stored?'settings':'environment_parameter';}
    key=config.providerKey(provider);disabled=settings.getSetting(`provider.${provider}.disabled`)==='1';
    if(source==='none'&&present(config.providerEnvKey(provider)))source='conventional_environment';
    if(gateway.isGatewayKey(key))source='gateway_declared_not_verified';
   }catch{source='native_read_failed';}
   const injected=source==='gateway_declared_not_verified';
   result.providers.push({provider,parameter,storedPresent:!!stored?.has_value,encrypted:!!stored?.secret,storedReadability:decryption,effectiveSource:source,effectiveAccessible:present(key)&&!injected,disabled,status:disabled&&present(key)?'present_but_unusable':injected?'validity_not_verified':present(key)?'accessible':stored?.has_value?'present_but_unusable':'absent',authentication:'not_tested',modelAuthorization:'not_tested'});
  }
  // Models may only be exported if they are in the public source catalog; arbitrary settings never escape.
  stage='catalog_import';
  const textModels=await imported('src/lib/ai/text-models.ts');const mediaModels=await imported('src/lib/ai/media-models.ts');
  const known=new Set([...textModels.TEXT_MODELS,...mediaModels.MEDIA_MODELS].map((m:any)=>`${m.provider}:${m.model}`));
  const safeRoute=(r:any)=>!r?null:known.has(`${r.provider}:${r.model}`)?{provider:r.provider,model:r.model}: {provider:'indeterminate',model:'OUTSIDE_SOURCE_CATALOG'};
  stage='text_routing';
  const textRouting=await imported('src/lib/orchestrator/text-routing.ts');const llm=await imported('src/lib/ai/llm.ts');
  const policy=settings.getJsonSetting('ai.policy',{});
  const custom=settings.getJsonSetting('ai.routes',{}),pinned=textRouting.pinnedTasks(),routingMode=textRouting.routingMode();
  result.textAvailability=llm.textProviderReady();result.textMode=routingMode;
  for(const [task,info] of Object.entries(config.TASKS) as [string,any][]){if(info.kind!=='llm')continue;
   const row:any={task,configuredRoute:safeRoute(config.routeFor(task)),origin:custom[task]?'configured_route':policy[task]?'configured_policy':'code_default',manualPinned:pinned.includes(task),resolved:null,authUsable:false};
   try{const r=llm.routeLlm({task});row.resolved=safeRoute(r);row.authUsable=!!result.providers.find((p:any)=>p.provider===r.provider&&p.effectiveAccessible&&!p.disabled);}catch{row.resolutionFailure='NATIVE_ROUTE_UNAVAILABLE';}
   row.difficultyVariants={};
   for(const difficulty of ['simple','complex']){try{row.difficultyVariants[difficulty]=safeRoute(llm.routeLlm({task,routing:{difficulty}}));}catch{row.difficultyVariants[difficulty]=null;}}
   result.textRoutes.push(row);
  }
  stage='media_routing';
  const media=await imported('src/lib/ai/media-routing.ts');const nativeMedia=await imported('src/lib/ai/media-providers.ts');
  for(const [usage,info] of Object.entries(media.USAGE_INFO) as [string,any][]){
   const row:any={usage,kind:info.kind,mode:['auto','manual'].includes(media.usageMode(usage))?media.usageMode(usage):'OUTSIDE_EXPECTED_ENUM',explicit:media.usageExplicit(usage),off:media.usageOff(usage),primary:safeRoute(media.usagePrimary(usage)),backup:safeRoute(media.usageBackup(usage)),resolved:null};
   try{row.resolved=safeRoute(nativeMedia.mediaRouteFor(usage));}catch{row.resolutionFailure='NATIVE_ROUTE_UNAVAILABLE';}
   result.mediaRoutes.push(row);
  }
  stage='voice_and_region';
  const alibaba=await imported('src/lib/ai/alibaba.ts');const voice=await imported('src/lib/video-v2/voice.ts');
  result.alibaba={region:alibaba.alibabaRegion(),customEndpointPresent:present(settings.getSetting('provider.alibaba.endpoint')),workspacePresent:present(settings.getSetting('provider.alibaba.workspace'))};
  result.logoQualityRelay=safeRoute(nativeMedia.logoQualityRelay());
  result.prices={administrativelyConfirmedAt:config.pricesCheckedAt(),fresh:!!config.pricesCheckedAt()&&Date.now()-config.pricesCheckedAt()<=config.PRICE_REVIEW_DAYS*86400000,officialPricesRevalidatedNow:false};
  result.voice={engine:'kokoro_local',parameters:['KOKORO_DIR','KOKORO'],configured:present(process.env.KOKORO_DIR)||present(process.env.KOKORO),assetsAvailable:voice.voiceAvailable(),synthesisTested:false};
  result.nativeResolution={available:true,writeGuardEnabled:true,providerNetworkGuardEnabled:true};
 }catch{
  // Never emit exception messages: these can contain an accidentally configured secret.
  result.nativeResolution={available:false,reason:'NATIVE_INSPECTION_FAILED_NO_RAW_ERROR',stage};
 }finally{
  fs.mkdirSync=mkdirBefore;fs.writeFileSync=writeBefore;fs.appendFileSync=appendBefore;globalThis.fetch=fetchBefore;
  globals.__ecomDb=previousDb;database.close();process.chdir(previousCwd);
 }
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=path.resolve(arg('--config-root')??process.cwd());
 try{console.log(JSON.stringify(await inspectAccessAndRouting(root,arg('--loader')==='next'?'next':'worker'),null,2));}catch{console.log(JSON.stringify({schema:'studio-access-routing-diagnostic-1',readOnly:true,realProviderCalls:0,error:'INSPECTION_FAILED_NO_RAW_ERROR'}));process.exitCode=1;}
}
