/** Lot 5 prerequisite: read existing configuration, resolve native routes; optional authenticated metadata GETs only.
 * node --import tsx scripts/diagnostic-acces-routage.ts [--config-root /path/to/studio]
 * No secret value, fragment, length, digest, prompt, account or customer record is exported.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';

const bundledCodeRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const providers=['anthropic','openai','google','fal','alibaba','pexels','pixabay'] as const;
const aliases:Record<string,string[]>={anthropic:['ANTHROPIC_API_KEY'],openai:['OPENAI_API_KEY'],google:['GOOGLE_API_KEY','GEMINI_API_KEY'],fal:['FAL_KEY','FAL_API_KEY'],alibaba:['DASHSCOPE_API_KEY','ALIBABA_MODEL_STUDIO_API_KEY'],pexels:['PEXELS_API_KEY'],pixabay:['PIXABAY_API_KEY']};
const safeGit=(root:string)=>{try{const s=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();return /^[a-f0-9]{40}$/.test(s)?s:null;}catch{return null;}};
const present=(v:unknown)=>typeof v==='string'&&!!v.trim();
const arg=(name:string)=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1]??null;};

// Public snapshots compared before implementation: the two source catalogs are identical.
export const REFERENCE_COMMITS={old:'d97e0b9577128eeb39b403dae281da6bd835fc65',integration:'8266c171027762acbbf0cf03daefff4c6035fb32'};
export const REFERENCE_CATALOG=new Set<string>(["alibaba:qwen-image-2.0","alibaba:qwen-image-2.0-pro","alibaba:qwen-image-2.1-pro","alibaba:qwen-image-2.1-turbo","alibaba:qwen-image-3.0","alibaba:qwen-image-3.0-pro","alibaba:wan2.2-i2v-flash","alibaba:wan2.6-i2v","alibaba:wan2.6-i2v-flash","alibaba:wan2.6-t2v","alibaba:wan2.7-i2v","alibaba:wan2.7-t2v","alibaba:wan3.0-video","alibaba:wan3.0-video-prime","anthropic:claude-haiku-4-5","anthropic:claude-haiku-5-5","anthropic:claude-opus-5-5","anthropic:claude-sonnet-5-5","fal:fal-ai/flux-2/klein/9b/edit","fal:fal-ai/kling-video/v2.1/pro/image-to-video","fal:fal-ai/kling-video/v3/pro/image-to-video","fal:fal-ai/kling-video/v3/standard/image-to-video","fal:fal-ai/nano-banana-2/edit","google:gemini-2.5-flash-image","google:gemini-3-pro-image-preview","google:gemini-3.1-flash-image","google:gemini-3.1-flash-lite-image","google:gemini-3.5-flash-lite","google:gemini-3.8-flash","google:veo-3.0-fast-generate-001","google:veo-3.0-generate-001","google:veo-3.1-fast-generate-preview","google:veo-3.1-generate-preview","google:veo-3.1-lite-generate-preview","openai:gpt-5.6-luna","openai:gpt-5.6-sol","openai:gpt-5.6-terra","openai:gpt-image-1","openai:gpt-image-1.5","openai:gpt-image-2","openai:gpt-image-2.5-flare","openai:gpt-image-2.5-sunburst"]);
type CatalogProvider='anthropic'|'openai'|'google'|'alibaba'|'fal';
type CatalogTarget={provider:string;model:string;functions:string[]};
type CatalogReply={httpStatus:number|null;proxyStatus:number|null;transport:string;data?:any};

/** Only these five read-only metadata GETs can carry credentials. No arbitrary endpoint, job or model URL. */
const CATALOG_URLS:Record<CatalogProvider,string>={
 anthropic:'https://api.anthropic.com/v1/models?limit=1000',
 openai:'https://api.openai.com/v1/models',
 google:'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',
 alibaba:'https://dashscope-intl.aliyuncs.com/api/v1/models?page_no=1&page_size=100',
 fal:'https://api.fal.ai/v1/models?limit=100',
};
export function readCatalog(provider:CatalogProvider,key:string,workspace:string|null=null,run:typeof spawnSync=spawnSync):CatalogReply{
 const url=CATALOG_URLS[provider];
 if(!url||!key||/[\x00-\x1f\x7f]/.test(key)||(workspace&&/[\x00-\x1f\x7f]/.test(workspace)))return {httpStatus:null,proxyStatus:null,transport:'INPUT_REJECTED'};
 const headers:Record<string,string>=provider==='anthropic'?{'x-api-key':key,'anthropic-version':'2023-06-01'}:provider==='google'?{'x-goog-api-key':key}:{Authorization:`${provider==='fal'?'Key':'Bearer'} ${key}`};
 if(provider==='alibaba'&&workspace)headers['X-DashScope-WorkSpace']=workspace;
 // Keys only enter a private pipe, never argv, URL, file, child environment, stdout, stderr or report.
 const input=Object.entries(headers).map(([k,v])=>`header = ${JSON.stringify(`${k}: ${v}`)}`).join('\n')+'\n';
 const env:NodeJS.ProcessEnv={NODE_ENV:process.env.NODE_ENV??'development'};
 for(const k of ['PATH','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','CURL_CA_BUNDLE','SSL_CERT_FILE','SSL_CERT_DIR'])if(process.env[k])env[k]=process.env[k];
 let r:ReturnType<typeof spawnSync>;
 try{r=run('curl',['--disable','--silent','--config','-','--request','GET','--proto','=https','--connect-timeout','5','--max-time','12','--max-redirs','0','--write-out','\nECOM_METADATA %{http_code} %{http_connect}',url],{input,env,encoding:'utf8',timeout:14000,maxBuffer:4*1024*1024});}
 catch{return {httpStatus:null,proxyStatus:null,transport:'UNAVAILABLE'};}
 const out=String(r.stdout??''),marker=out.lastIndexOf('\nECOM_METADATA '),m=marker<0?null:/^(\d{3}) (\d{3})$/.exec(out.slice(marker+15).trim());
 const http=m?Number(m[1]):null,proxy=m?Number(m[2]):null;
 if(proxy===403&&http===0)return {httpStatus:null,proxyStatus:403,transport:'PROXY_CONNECT_REFUSED'};
 if(r.error||r.status!==0||!m)return {httpStatus:http||null,proxyStatus:proxy||null,transport:'UNAVAILABLE'};
 // Never expose, parse or follow a redirect body.
 if(!http||http<200||http>=300)return {httpStatus:http||null,proxyStatus:proxy||null,transport:'HTTP_RESPONSE'};
 try{return {httpStatus:http,proxyStatus:proxy||null,transport:'HTTP_RESPONSE',data:JSON.parse(out.slice(0,marker))};}
 catch{return {httpStatus:http,proxyStatus:proxy||null,transport:'INVALID_JSON'};}
}

/** Closed result only. Remote model/account descriptions, IDs outside public source, prices and errors stay private. */
export function filterCatalog(provider:CatalogProvider,reply:CatalogReply,targets:CatalogTarget[]){
 const base:any={provider,httpStatus:reply.httpStatus,proxyStatus:reply.proxyStatus,transport:reply.transport,authentication:'not_verified',catalogShapeVerified:false,catalogComplete:false,models:[],generationRight:'NOT_VERIFIABLE_WITH_THIS_METADATA_CONTROL',generationTested:false};
 let models:any[]=[],ids:string[]=[],complete=false;
 const j=reply.data;
 if(reply.transport==='HTTP_RESPONSE'&&reply.httpStatus===200&&j&&!j.error){
  if((provider==='openai'||provider==='anthropic')&&Array.isArray(j.data)&&(provider==='openai'?j.object==='list':typeof j.has_more==='boolean')&&j.data.every((x:any)=>typeof x?.id==='string'&&(provider==='openai'?x.object==='model':x.type==='model'))){models=j.data;ids=models.map(x=>x.id);complete=provider==='openai'?j.object==='list':j.has_more===false;}
  if(provider==='google'&&Array.isArray(j.models)&&j.models.every((x:any)=>typeof x?.name==='string'&&x.name.startsWith('models/'))){models=j.models;ids=models.map(x=>x.name.slice(7));complete=!j.nextPageToken;}
  if(provider==='alibaba'&&j.success!==false&&j.code==null&&Array.isArray(j.output?.models)&&j.output.models.every((x:any)=>typeof x?.model==='string')){models=j.output.models;ids=models.map(x=>x.model);complete=typeof j.output.total==='number'&&j.output.total<=models.length&&j.output.page_no===1;}
  if(provider==='fal'&&Array.isArray(j.models)&&j.models.every((x:any)=>typeof x?.endpoint_id==='string')){models=j.models;ids=models.map(x=>x.endpoint_id);complete=j.has_more===false;}
  const valid=provider==='openai'||provider==='anthropic'?Array.isArray(j.data)&&models===j.data:provider==='alibaba'?models===j.output?.models:models===j.models;
  if(valid){base.catalogShapeVerified=true;base.catalogComplete=complete;
   base.authentication=provider==='fal'?(models.some(x=>typeof x.metadata?.is_favorited==='boolean')?'accepted_personalized_metadata':'not_verified_public_catalog'):'accepted_metadata_endpoint';
  }
 }
 if(!base.catalogShapeVerified){base.failureCode=reply.transport!=='HTTP_RESPONSE'?reply.transport:reply.httpStatus===401?'AUTHENTICATION_REJECTED':reply.httpStatus===403?'ACCESS_FORBIDDEN_NOT_PROOF_OF_INVALID_KEY':reply.httpStatus&&reply.httpStatus>=300&&reply.httpStatus<400?'REDIRECT_NOT_FOLLOWED':reply.httpStatus===429?'RATE_LIMITED_NO_RETRY':reply.httpStatus&&reply.httpStatus>=500?'SERVER_ERROR_NO_RETRY':reply.httpStatus===404?'METADATA_ENDPOINT_UNAVAILABLE':'UNEXPECTED_METADATA_RESPONSE';}
 for(const target of targets.filter(x=>x.provider===provider)){
  const pair=`${provider}:${target.model}`,inReference=REFERENCE_CATALOG.has(pair);
  const trim=REFERENCE_CATALOG.has(`${provider}:${target.model.trim()}`);
  const prefix=REFERENCE_CATALOG.has(`${provider}:${target.model.replace(new RegExp(`^${provider}:`),'')}`);
  const seen=base.catalogShapeVerified&&ids.includes(target.model);
  const remote=models.find((x:any)=>(x.id??x.model??x.endpoint_id??x.name?.replace(/^models\//,''))===target.model);
  const lifecycle=['active','deprecated','retired'].includes(remote?.lifecycle)?remote.lifecycle:['active','deprecated'].includes(remote?.metadata?.status)?remote.metadata.status:null;
  base.models.push({model:inReference?target.model:'OUTSIDE_SOURCE_CATALOG',functions:target.functions,inOldCatalog:inReference,inIntegrationCatalog:inReference,trimWouldMatch:!inReference&&trim,providerPrefixWouldMatch:!inReference&&prefix,listed:!base.catalogShapeVerified?'NOT_CHECKED':seen?'LISTED':complete?'NOT_LISTED_IN_COMPLETE_RESPONSE':'NOT_SEEN_IN_PARTIAL_RESPONSE',lifecycle,generationRight:'NOT_VERIFIABLE_WITH_THIS_METADATA_CONTROL'});
 }
 return base;
}

export function currentMasterEvidence(rows:{value:string}[],key:Buffer|null,nativeReadable:number){
 let authenticated=0;
 if(key)for(const row of rows){try{const [version,iv,tag,data]=row.value.split('.');if(version!=='v1'||!iv||!tag||!data)continue;const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64'));d.setAuthTag(Buffer.from(tag,'base64'));d.update(Buffer.from(data,'base64'));d.final();authenticated++;}catch{/* No free error or secret material. */}}
 return {encryptedProviderRecords:rows.length,nativeReadableRecords:nativeReadable,currentMasterAuthenticatedRecords:authenticated,validity:authenticated?'CURRENT_MASTER_AUTHENTICATED_EXISTING_PROVIDER_RECORD':nativeReadable?'NATIVE_DECRYPTION_OBSERVED_CURRENT_MASTER_NOT_PROVEN':rows.length?'ENCRYPTED_RECORDS_PRESENT_NO_VERIFIED_DECRYPTION':'NO_ENCRYPTED_PROVIDER_RECORD'};
}

export async function inspectAccessAndRouting(configRoot:string,loader:'worker'|'next'='worker',codeRoot=bundledCodeRoot,options:{authenticate?:boolean;catalogReader?:typeof readCatalog}={}){
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
  const privateKeys=new Map<string,string>();
  const privateTargets:CatalogTarget[]=[];
  const remember=(r:any,fn:string)=>{if(!r||typeof r.model!=='string'||typeof r.provider!=='string')return;let row=privateTargets.find(t=>t.provider===r.provider&&t.model===r.model);if(!row){row={provider:r.provider,model:r.model,functions:[]};privateTargets.push(row);}if(!row.functions.includes(fn))row.functions.push(fn);};
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
   if(key&&!disabled&&!injected)privateKeys.set(provider,key);
   result.providers.push({provider,parameter,storedPresent:!!stored?.has_value,encrypted:!!stored?.secret,storedReadability:decryption,effectiveSource:source,effectiveAccessible:present(key)&&!injected,disabled,status:disabled&&present(key)?'present_but_unusable':injected?'validity_not_verified':present(key)?'accessible':stored?.has_value?'present_but_unusable':'absent',authentication:'not_tested',modelAuthorization:'not_tested'});
  }
  const encryptedRows=database.prepare("SELECT value FROM settings WHERE key IN ('provider.anthropic.apiKey','provider.openai.apiKey','provider.google.apiKey','provider.fal.apiKey','provider.alibaba.apiKey','provider.pexels.apiKey','provider.pixabay.apiKey') AND secret=1 AND length(value)>0").all();
  let currentKey:Buffer|null=null;try{currentKey=(await imported('src/lib/secrets.ts')).derivedKey();}catch{/* Keep status unverified, never create a secret. */}
  Object.assign(result.masterSecret,currentMasterEvidence(encryptedRows,currentKey,result.providers.filter((p:any)=>p.encrypted&&p.storedReadability==='accessible').length));
  currentKey?.fill(0);
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
   remember(config.routeFor(task),`text:${task}:configured`);
   const row:any={task,configuredRoute:safeRoute(config.routeFor(task)),origin:custom[task]?'configured_route':policy[task]?'configured_policy':'code_default',manualPinned:pinned.includes(task),resolved:null,authUsable:false};
   try{const r=llm.routeLlm({task});row.resolved=safeRoute(r);remember(r,`text:${task}:resolved`);row.authUsable=!!result.providers.find((p:any)=>p.provider===r.provider&&p.effectiveAccessible&&!p.disabled);}catch{row.resolutionFailure='NATIVE_ROUTE_UNAVAILABLE';}
   row.difficultyVariants={};
   for(const difficulty of ['simple','complex']){try{const r=llm.routeLlm({task,routing:{difficulty}});row.difficultyVariants[difficulty]=safeRoute(r);remember(r,`text:${task}:${difficulty}`);}catch{row.difficultyVariants[difficulty]=null;}}
   result.textRoutes.push(row);
  }
  stage='media_routing';
  const media=await imported('src/lib/ai/media-routing.ts');const nativeMedia=await imported('src/lib/ai/media-providers.ts');
  for(const [usage,info] of Object.entries(media.USAGE_INFO) as [string,any][]){
   const row:any={usage,kind:info.kind,mode:['auto','manual'].includes(media.usageMode(usage))?media.usageMode(usage):'OUTSIDE_EXPECTED_ENUM',explicit:media.usageExplicit(usage),off:media.usageOff(usage),primary:safeRoute(media.usagePrimary(usage)),backup:safeRoute(media.usageBackup(usage)),resolved:null};
   remember(media.usagePrimary(usage),`media:${usage}:primary`);remember(media.usageBackup(usage),`media:${usage}:backup`);
   try{const r=nativeMedia.mediaRouteFor(usage);row.resolved=safeRoute(r);remember(r,`media:${usage}:resolved`);}catch{row.resolutionFailure='NATIVE_ROUTE_UNAVAILABLE';}
   result.mediaRoutes.push(row);
  }
  stage='voice_and_region';
  const alibaba=await imported('src/lib/ai/alibaba.ts');const voice=await imported('src/lib/video-v2/voice.ts');
  result.alibaba={region:alibaba.alibabaRegion(),customEndpointPresent:present(settings.getSetting('provider.alibaba.endpoint')),workspacePresent:present(settings.getSetting('provider.alibaba.workspace'))};
  result.logoQualityRelay=safeRoute(nativeMedia.logoQualityRelay());
  result.prices={administrativelyConfirmedAt:config.pricesCheckedAt(),fresh:!!config.pricesCheckedAt()&&Date.now()-config.pricesCheckedAt()<=config.PRICE_REVIEW_DAYS*86400000,officialPricesRevalidatedNow:false};
  result.voice={engine:'kokoro_local',parameters:['KOKORO_DIR','KOKORO'],configured:present(process.env.KOKORO_DIR)||present(process.env.KOKORO),assetsAvailable:voice.voiceAvailable(),synthesisTested:false};
  if(options.authenticate){
   result.catalogReference={...REFERENCE_COMMITS,sourceCatalogsIdentical:true};
   result.authenticationChecks=[];
   result.unattributableModelRoutes=privateTargets.filter(t=>!['anthropic','openai','google','alibaba','fal'].includes(t.provider)).map(t=>({provider:'indeterminate',model:'OUTSIDE_SOURCE_CATALOG',functions:t.functions,providerRecognized:false,inOldCatalog:false,inIntegrationCatalog:false}));
   for(const provider of ['anthropic','openai','google','alibaba','fal'] as CatalogProvider[]){
    const row=result.providers.find((p:any)=>p.provider===provider),key=privateKeys.get(provider);
    const override=provider==='anthropic'?process.env.ANTHROPIC_BASE_URL:provider==='openai'?process.env.OPENAI_BASE_URL:null;
    const blocked=!key?'NATIVE_ACTIVE_KEY_UNAVAILABLE':override?'CUSTOM_ENDPOINT_NOT_TESTED':provider==='alibaba'&&(result.alibaba.region!=='intl'||result.alibaba.customEndpointPresent)?'DOCUMENTED_METADATA_ENDPOINT_NOT_MATCHED':null;
    let check:any;
    if(blocked)check={provider,authentication:'not_tested',failureCode:blocked,generationRight:'NOT_VERIFIABLE_WITH_THIS_METADATA_CONTROL',models:[]};
    else{check=filterCatalog(provider,(options.catalogReader??readCatalog)(provider,key!,provider==='alibaba'?settings.getSetting('provider.alibaba.workspace'):null),privateTargets);result.networkCalls++;result.realProviderCalls++;}
    row.authentication=check.authentication;row.modelAuthorization='not_verified_without_generation';result.authenticationChecks.push(check);
   }
   result.realGenerationCalls=0;result.metadataReadAttempts=result.networkCalls;result.authenticationScope='THIS_LOADER_ONLY_NOT_SERVED_PROCESS';
  }
  privateKeys.clear();
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

/** Public HEAD requests only: preserve curl's inherited proxy/TLS policy, discard bodies and errors.
 * This deliberately cannot authenticate or prove model availability. No secret enters curl's arguments.
 */
export function inspectPublicNetwork(run:typeof spawnSync=spawnSync){
 const endpoints:Record<string,string>={anthropic:'https://api.anthropic.com/v1/models',openai:'https://api.openai.com/v1/models',google:'https://generativelanguage.googleapis.com/v1beta/models',alibaba:'https://dashscope-intl.aliyuncs.com/api/v1/models',fal:'https://queue.fal.run/',pexels:'https://api.pexels.com/v1/',pixabay:'https://pixabay.com/api/'};
 return Object.entries(endpoints).map(([provider,url])=>{
  const r=run('curl',['--disable','--silent','--head','--proto','=https','--connect-timeout','4','--max-time','6','--output','/dev/null','--write-out','%{http_code} %{http_connect}',url],{encoding:'utf8',timeout:7000,maxBuffer:1024});
  const m=/^(\d{3}) (\d{3})$/.exec(String(r.stdout??'').trim());
  const http=m?Number(m[1]):null,proxy=m?Number(m[2]):null;
  return {provider,endpointBasis:provider==='alibaba'?'PUBLIC_INTL_ONLY_NOT_CUSTOM_OR_OTHER_REGION':'PUBLIC_PROVIDER_HOST',method:'HEAD',authenticated:false,httpStatus:http||null,proxyStatus:proxy||null,network:proxy===403&&http===0?'PROXY_CONNECT_REFUSED':http&&http>=100?'HTTP_RESPONSE_RECEIVED':r.error?'CHECK_UNAVAILABLE':'NETWORK_FAILURE',authentication:'not_tested',modelAuthorization:'not_tested'};
 });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=path.resolve(arg('--config-root')??process.cwd());
 const codeRoot=path.resolve(arg('--code-root')??bundledCodeRoot);
 try{
  if(process.argv.includes('--both-loaders')){
   // Fresh processes: Next and worker may load different env files and cache native modules.
   const loaders=['next','worker'].map(loader=>{
    const r=spawnSync(process.execPath,[...process.execArgv,fileURLToPath(import.meta.url),'--config-root',root,'--code-root',codeRoot,'--loader',loader,...(process.argv.includes('--authenticate')&&loader==='worker'?['--authenticate']:[])],{cwd:codeRoot,env:process.env,encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
    try{if(r.status!==0||r.stderr)return {configurationLoader:loader,error:'CHILD_INSPECTION_FAILED_NO_RAW_ERROR'};return JSON.parse(r.stdout);}catch{return {configurationLoader:loader,error:'CHILD_INSPECTION_FAILED_NO_RAW_ERROR'};}
   });
   let output:any={schema:'studio-codespace-access-diagnostic-1',readOnly:true,generationOrRetry:false,configurationChanged:false,realGenerationCalls:0,environment:'TERMINAL_EXECUTION_NOT_REMOTE_CODEX',codeCommit:safeGit(codeRoot),configurationCheckoutCommit:safeGit(root),servedVersion:'not_probed',loaders,metadataReadAttempts:loaders.reduce((n,r)=>n+(r.metadataReadAttempts??0),0),authenticatedConfigurationLoader:process.argv.includes('--authenticate')?'worker':null,network:process.argv.includes('--network')?inspectPublicNetwork():[],authentication:process.argv.includes('--authenticate')?'SEE_WORKER_CHECKS':'not_tested',modelAuthorization:'not_verified_without_generation'};
   if(process.argv.includes('--auth-summary')){const worker=loaders.find(r=>r.configurationLoader==='worker');output={schema:'studio-authentication-diagnostic-1',readOnly:true,configurationChanged:false,generationOrRetry:false,realGenerationCalls:0,metadataReadAttempts:output.metadataReadAttempts,codeCommit:output.codeCommit,configurationCheckoutCommit:output.configurationCheckoutCommit,servedVersion:'not_probed',authenticatedConfigurationLoader:'worker',loaders:loaders.map(r=>({configurationLoader:r.configurationLoader,environmentMode:r.environmentMode,nativeResolution:r.nativeResolution,storage:r.storage,masterSecret:r.masterSecret,error:r.error,providers:r.providers?.map((p:any)=>({provider:p.provider,encrypted:p.encrypted,storedReadability:p.storedReadability,effectiveAccessible:p.effectiveAccessible,effectiveSource:p.effectiveSource,disabled:p.disabled}))})),catalogReference:worker?.catalogReference,authenticationChecks:worker?.authenticationChecks,unattributableModelRoutes:worker?.unattributableModelRoutes,voice:worker?.voice,officialPricesRevalidatedNow:false};}
   console.log(JSON.stringify(output,null,process.argv.includes('--auth-summary')?0:2));
  }else console.log(JSON.stringify(await inspectAccessAndRouting(root,arg('--loader')==='next'?'next':'worker',codeRoot,{authenticate:process.argv.includes('--authenticate')}),null,2));
 }catch{console.log(JSON.stringify({schema:'studio-access-routing-diagnostic-1',readOnly:true,realProviderCalls:0,error:'INSPECTION_FAILED_NO_RAW_ERROR'}));process.exitCode=1;}
}
