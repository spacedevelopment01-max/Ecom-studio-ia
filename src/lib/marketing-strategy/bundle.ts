/** One consent and one capped persistent job for native module revisions; activation remains separate and atomic. */
import {createHash} from 'node:crypto';
import {all,db,id,json,now,one,run,tx} from '../db';
import {HttpError} from '../auth';
import {enqueue,JobContext,getJob,retryJob} from '../jobs';
import {assertJobEntitlements} from '../job-entitlements';
import {loadProject} from '../projects';
import {withStrategyScope} from '../strategy-consumption';
import {aiActiveFor} from '../ai/access';
import {estimateMicro,estimateTaskMicro,capMicro} from '../ai/estimate';
import {budgetPctOf} from '../ai/budget-pct';
import {assertUnderCostCap,withTrace} from '../ai/trace';
import {EUR,assertCanSpend} from '../billing';
import {assertStrategyPreparationCurrent,preparationStrategy,stageStrategyModule} from './index';
import {imageV2Kind} from '../image-v2/ai-only';
import type {ContentDoc} from '../seo-v2/types';
import type {VideoDocument,VideoIntentKind} from '../video-v2/types';
import { PLATFORMS } from '../ads-v2/types';
import type {AdDocument} from '../ad-doc/types';
export type RevisionItem={module:string;oldId:string;type:'content.v2'|'image.v2'|'ads.v2'|'video.v2';request:Record<string,unknown>;estimateMicro:number;state:'quoted'|'prepared';outputIds?:string[];links?:string[];note?:string;preview?:string[]};
export type RevisionBundle={id:string;projectId:string;preparationId:string;items:RevisionItem[];estimateMicro:number;capMicro:number;percent:number|null;status:'quoted'|'queued'|'running'|'prepared'|'failed';retryCount?:number;jobId:string|null;createdAt:number};
function schema(){db().exec('CREATE TABLE IF NOT EXISTS marketing_strategy_bundles(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,preparation_id TEXT NOT NULL,payload TEXT NOT NULL,job_id TEXT,created_at INTEGER NOT NULL)');}
function save(b:RevisionBundle){run('INSERT OR REPLACE INTO marketing_strategy_bundles VALUES(?,?,?,?,?,?)',b.id,b.projectId,b.preparationId,JSON.stringify(b),b.jobId,b.createdAt);return b;}
export function strategyBundle(projectId:string,bundleId:string){schema();const row=one<{payload:string}>('SELECT payload FROM marketing_strategy_bundles WHERE id=? AND project_id=?',bundleId,projectId);if(!row)throw new HttpError(404,'Devis introuvable.','strategy_quote_missing');const bundle=json<RevisionBundle>(row.payload,null as never);const job=bundle.jobId?getJob(bundle.jobId):null;return job&&["failed","cancelled","blocked"].includes(job.status)?{...bundle,status:"failed" as const}:bundle;}
export function latestStrategyBundle(projectId:string,preparationId:string){schema();const row=one<{payload:string}>('SELECT payload FROM marketing_strategy_bundles WHERE preparation_id=? AND project_id=? ORDER BY created_at DESC LIMIT 1',preparationId,projectId);return row?strategyBundle(projectId,json<RevisionBundle>(row.payload,null as never).id):null;}
export function quoteStrategyBundle(projectId:string,preparationId:string,selected:{module:string;contentId:string}[]){
 schema();const prep=assertStrategyPreparationCurrent(projectId,preparationId),p=loadProject(projectId);const items:RevisionItem[]=[];
 if(!selected.length||selected.length>30)throw new HttpError(400,'Sélectionnez entre 1 et 30 éléments à réviser.','strategy_quote_selection');
 for(const selection of selected){
  if(items.some(i=>i.module===selection.module&&i.oldId===selection.contentId))continue;
  const content=prep.contents.find(c=>c.module===selection.module&&c.contentId===selection.contentId);
  if(!content||content.published||content.protected)throw new HttpError(409,'Les archives et retouches protégées restent conservées ; choisissez un contenu automatique de cet inventaire.','strategy_quote_protected');
  let item:RevisionItem;
  if(content.module==='seo'){
   const row=one<{doc_json:string}>('SELECT doc_json FROM content_documents WHERE project_id=? AND id=?',projectId,content.contentId);if(!row)throw new HttpError(409,'Texte manquant.');
   const d=json<ContentDoc>(row.doc_json,null as never);if(d.type==='blog_article')throw new HttpError(409,'Préparez le sujet du nouvel article avec le module Blog afin de préserver son quota et ses archives.','strategy_article_review');
   item={module:'seo',oldId:content.contentId,type:'content.v2',request:{type:d.type,pageKey:d.page.key,lang:d.lang,request:d.meta2.contract?.request??null},estimateMicro:estimateTaskMicro('copywriting',{input:16000,output:5000})+estimateTaskMicro('quality_control',{input:7000,output:900}),state:'quoted'};
  }else if(content.module==='asset'){
   const a=one<{role:string;kind:string;meta:string;width:number;height:number}>('SELECT role,kind,meta,width,height FROM assets WHERE project_id=? AND id=? AND deleted_at IS NULL',projectId,content.contentId);if(!a)throw new HttpError(409,'Image manquante.');
   const mediaMeta=json<any>(a.meta,{});if(mediaMeta.poster||mediaMeta.adDoc||/social|post|ad|banner.*text/i.test(a.role??''))throw new HttpError(409,'Ce visuel rédactionnel doit être révisé depuis son document pour conserver ses textes, son format et sa marque. Aucun remplacement par une simple photo.','strategy_creative_document_review');
   if(a.kind!=='image'||/video|voice|audio|music/i.test(a.role??''))throw new HttpError(409,'Révisez ce média depuis son document vidéo, afin de conserver son scénario.','strategy_video_scenario_review');
   item={module:'asset',oldId:content.contentId,type:'image.v2',request:{kind:imageV2Kind(p.business==='services',a.role??'lifestyle'),support:'site',aspect:a.width&&a.height?(a.width/a.height>2.5?'3:1':a.width/a.height>1.3?'16:9':a.width/a.height<.65?'9:16':a.width/a.height<.95?'4:5':'1:1'):'4:5',count:1,allowGenerate:true,noStock:true,peopleAllowed:false},estimateMicro:estimateMicro('image'),state:'quoted'};
  }else if(content.module==='ad'){
   const row=one<{doc_json:string}>('SELECT doc_json FROM ad_documents WHERE project_id=? AND id=?',projectId,content.contentId);if(!row)throw new HttpError(409,'Document publicitaire manquant.');const d=json<AdDocument>(row.doc_json,null as never);
   if(d.format.platform&&!(PLATFORMS as readonly string[]).includes(d.format.platform))throw new HttpError(409,'Vérifiez le support publicitaire dans son éditeur avant le devis groupé.','strategy_ad_platform_review');
   item={module:'ad',oldId:content.contentId,type:'ads.v2',request:{count:1,platforms:d.format.platform?[d.format.platform]:undefined,aspects:d.format.aspect?[d.format.aspect]:undefined},estimateMicro:estimateTaskMicro('ad_creative',{input:14000,output:5000})+estimateMicro('image'),state:'quoted'};
  }else if(content.module==='video'){
   const row=one<{doc_json:string}>('SELECT doc_json FROM video_documents WHERE project_id=? AND id=?',projectId,content.contentId);if(!row)throw new HttpError(409,'Document vidéo manquant.');const d=json<VideoDocument>(row.doc_json,null as never);
   if(d.clips.some(c=>c.generated)||d.meta.editorial)throw new HttpError(409,'Cette vidéo nécessite la validation du scénario adapté et de son devis clips. Aucun montage simplifié ne sera substitué ; son original reste utilisable.','strategy_video_scenario_review');
   if(d.meta.intent==='video_ad'&&d.meta.promo===undefined)throw new HttpError(409,'Précisez le but organique ou publicitaire de cette vidéo dans son éditeur avant le devis.','strategy_video_purpose_review');
   item={module:'video',oldId:content.contentId,type:'video.v2',request:{ask:{kind:d.meta.intent as VideoIntentKind,platform:d.platform,aspect:d.aspect,purpose:d.meta.promo===false?'organic':d.meta.promo===true?'ad':undefined,durationS:d.clips.reduce((n,c)=>n+c.durationS,0),allowGeneration:false,peopleAllowed:false},approveGeneration:false},estimateMicro:estimateTaskMicro('video_direction',{input:14000,output:5000})+estimateTaskMicro('quality_control',{input:8000,output:1500}),state:'quoted'};
  }else throw new HttpError(409,'Ce contenu doit être préparé dans son éditeur ou conservé explicitement. Les calendriers et textes peuvent aussi être préparés ensemble localement.','strategy_module_editor_required');
  assertJobEntitlements(item.type,projectId,{request:item.request});
  if(!Number.isFinite(item.estimateMicro)||item.estimateMicro<=0)throw new HttpError(409,'Le prix de cette création est indisponible. Aucun devis gratuit fictif ni appel ne sera lancé.','strategy_quote_price_unavailable');
  items.push(item);
 }
 const estimate=items.reduce((n,i)=>n+i.estimateMicro,0);const digest=createHash('sha256').update(JSON.stringify({preparationId,items})).digest('hex');
 const previous=latestStrategyBundle(projectId,preparationId);if(previous&&previous.id.endsWith(digest.slice(0,20)))return previous;
 return save({id:`strategy-quote-${digest.slice(0,20)}`,projectId,preparationId,items,estimateMicro:estimate,capMicro:capMicro(estimate),percent:budgetPctOf(p.userId,estimate,projectId),status:'quoted',jobId:null,createdAt:now()});
}
export function confirmStrategyBundle(projectId:string,bundleId:string,confirmed:true){
 if(confirmed!==true)throw new HttpError(400,'Votre confirmation du devis groupé est nécessaire.','strategy_confirmation_required');
 schema();return tx(()=>{const b=strategyBundle(projectId,bundleId),p=loadProject(projectId);assertStrategyPreparationCurrent(projectId,b.preparationId);
  for(const item of b.items)assertJobEntitlements(item.type,projectId,{request:item.request});
  if(b.jobId)return b;
  if(!aiActiveFor(p.userId,projectId))throw new HttpError(402,'Budget IA ou forfait indisponible ; les contenus précédents et la préparation sont conservés.','strategy_budget_unavailable');
  assertCanSpend(p.userId,b.estimateMicro,projectId);
  const job=enqueue({userId:p.userId,projectId,type:'strategy.prepare',maxAttempts:1,label:'Préparation groupée du nouvel angle',payload:{projectId,bundleId:b.id,costCapMicro:b.capMicro},idempotencyKey:b.id});return save({...b,status:'queued',jobId:job.id});
 });
}
/** Native engines are injected only by isolated tests. Runtime uses the existing engine entry points. */
export type RevisionExecutor=(ctx:JobContext,item:RevisionItem)=>Promise<{outputIds:string[];links:string[];note:string;preview?:string[]}>;
async function executeNative(ctx:JobContext,item:RevisionItem){
 const pid=ctx.job.project_id!,request={...item.request,maxCostEur:item.estimateMicro*2/EUR};
 if(item.type==='content.v2'){
  const {runContentEngineV2}=await import('../seo-v2/engine');const {latestContent}=await import('../seo-v2/store');const r=await runContentEngineV2(ctx,pid,request as never);const d=r.docKey?latestContent(pid,r.docKey):null;
  if(!d||r.by!=='ai'||['REJECTED','RETRY'].includes(r.verdict)||r.stoppedByCostCap)throw new HttpError(409,'Le texte préparé nécessite une correction. Ses acquis sont conservés.','strategy_quality_blocked');
  return{outputIds:[d.version.id],links:[],note:`Texte ${r.verdict}, à relire avant activation.`,preview:d.doc.blocks.map((await import('../seo-v2/doc')).blockText)};
 }
 if(item.type==='image.v2'){
  const{runImageEngineV2}=await import('../image-v2/engine');const r=await runImageEngineV2(ctx,pid,request as never);const ids=r.outcomes.filter(o=>o.assetId&&!['REJECTED','RETRY'].includes(o.verdict)).map(o=>o.assetId!);
  if(ids.length!==1||r.stoppedByCostCap)throw new HttpError(409,'Image non livrable ; aucun remplacement de l’original.','strategy_quality_blocked');return{outputIds:ids,links:ids.map(id=>`/api/files/${id}`),note:'Image préparée, fidélité et texte à vérifier avant activation.'};
 }
 if(item.type==='ads.v2'){
  const{runAdEngineV2}=await import('../ads-v2/engine');const{latestDoc}=await import('../ad-doc/store');const r=await runAdEngineV2(ctx,pid,request as never);const outcomes=r.outcomes.filter(o=>o.assetId&&!['REJECTED','RETRY'].includes(o.verdict));const rows=all<{id:string;doc_key:string;rendered_asset_id:string}>('SELECT d.id,d.doc_key,d.rendered_asset_id FROM ad_documents d JOIN marketing_strategy_contents s ON s.content_id=d.id AND s.module=\'ad\' WHERE d.project_id=? AND s.project_id=? AND s.strategy_id=?',pid,pid,`draft-${strategyBundle(pid,ctx.payload.bundleId).preparationId}`);
  if(!outcomes.length||!rows.length||r.stoppedByCostCap)throw new HttpError(409,'Publicité non livrable ; acquis conservés.','strategy_quality_blocked');return{outputIds:rows.filter(d=>latestDoc(pid,d.doc_key)?.version.id===d.id&&outcomes.some(o=>o.assetId===d.rendered_asset_id)).map(d=>d.id),links:outcomes.map(o=>`/api/files/${o.assetId}`),note:'Publicité préparée ; relecture requise avant activation.'};
 }
 const{runVideoEngineV2}=await import('../video-v2/engine');const{latestVideo}=await import('../video-v2/store');const r=await runVideoEngineV2(ctx,pid,request as never);const d=r.docKey?latestVideo(pid,r.docKey):null;
 if(!d||!r.videoAssetId||['REJECTED','RETRY'].includes(r.verdict)||r.stoppedByCostCap)throw new HttpError(409,'Vidéo non livrable ; original et étapes acquises conservés.','strategy_quality_blocked');return{outputIds:[d.version.id],links:[`/api/files/${r.videoAssetId}`],note:'Montage préparé, scénario, voix et image à vérifier avant activation.'};
}
export async function runStrategyBundle(ctx:JobContext,execute:RevisionExecutor=executeNative){
 const pid=ctx.job.project_id!;let b=strategyBundle(pid,ctx.payload.bundleId);assertStrategyPreparationCurrent(pid,b.preparationId);
 if(b.jobId!==ctx.job.id)throw new HttpError(409,'Cette tâche ne correspond pas au devis confirmé.','strategy_quote_job_mismatch');
 const selection=preparationStrategy(pid,b.preparationId);const usable=await import('../quality/usable');b=save({...b,status:'running'});
 try{return await withStrategyScope(pid,()=>withTrace({jobId:ctx.job.id,projectId:pid,costCapMicro:b.capMicro},async()=>{
  for(let i=0;i<b.items.length;i++){
   const item=b.items[i];if(item.state==='prepared')continue;
   assertStrategyPreparationCurrent(pid,b.preparationId);assertCanSpend(ctx.job.user_id,b.items.filter(i=>i.state!=='prepared').reduce((n,i)=>n+i.estimateMicro,0),pid);assertJobEntitlements(item.type,pid,{request:item.request});ctx.progress(.1+.75*i/b.items.length,'Préparation des versions ; ensemble précédent conservé');assertUnderCostCap(item.estimateMicro);
   const result=await execute(ctx,item);
   tx(()=>{
   stageStrategyModule(pid,b.preparationId,item.module,{contentIds:result.outputIds,replacements:result.outputIds.map(newId=>({oldId:item.oldId,newId}))});
   const {isAutoUsable}=usable;
   const assets=all<import('../library').Asset>("SELECT a.* FROM assets a JOIN marketing_strategy_contents s ON s.content_id=a.id AND s.module='asset' AND s.project_id=a.project_id WHERE a.project_id=? AND s.strategy_id=?",pid,selection.id).filter(isAutoUsable).map(a=>a.id);
   if(assets.length)stageStrategyModule(pid,b.preparationId,'asset',{contentIds:assets});
   b.items[i]={...item,...result,state:'prepared'};save(b);
   });
  }
  await (await import('../theme/strategy-transition')).prepareStrategyTheme(pid,b.preparationId,{refresh:true});
  b=save({...b,status:'prepared'});return{bundle:b,delivery:{state:'to_verify',message:'Versions préparées. Vérifiez l’ensemble puis activez explicitement l’angle ; aucun contenu n’a été publié.'}};
 }),selection);}catch(error){save({...b,status:'failed'});throw error;}
}

/** One explicitly confirmed retry, same persistent task/cap and acquired outputs. Never automatic. */
export function retryStrategyBundle(projectId:string,bundleId:string,confirmed:true){
 if(confirmed!==true)throw new HttpError(400,'Confirmez la reprise du devis.');return tx(()=>{const b=strategyBundle(projectId,bundleId);assertStrategyPreparationCurrent(projectId,b.preparationId);if(!b.jobId||getJob(b.jobId)?.status!=='failed')throw new HttpError(409,'Aucune tâche échouée à reprendre.');if((b.retryCount??0)>=1)throw new HttpError(409,'La reprise prévue est épuisée. Les acquis sont conservés ; corrigez le défaut avant un nouveau devis.','strategy_retry_limit');retryJob(b.jobId);return save({...b,status:'queued',retryCount:(b.retryCount??0)+1});});
}
