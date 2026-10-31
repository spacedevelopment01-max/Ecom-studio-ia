/** Choix humain puis application native d'une identité acquise. Zéro dessin/IA/publication annexe. */
import {HttpError,type User}from '../../auth';
import {all,id,json,now,one,tx,readSnapshot}from '../../db';
import {loadProject,remember}from '../../projects';
import {requirePlan}from '../../plan-gates';
import {projectAccountKey}from '../../project-billing';
import {stableHash}from '../../brain/hash';
import {getAsset,assetData}from '../../library';
import {createHash}from 'node:crypto';
import {enqueue,getJob,publicJob,type JobContext}from '../../jobs';
import {withAiDisabled}from '../../ai/access';
import {stateOf}from '../../preparation/store';
import {directionOf}from '../../logo-v2/direction-series';
import {selectCompleteDirection,pendingDirection,assertSelectedDirection,directionBrandHash,type DirectionSelection}from '../../logo-v2/selection';
import {chooseLogoV2}from '../../logo-v2/choose';
import {ownedConversation}from './store';
import {conversationLogoReviewEnabled}from './tool-flags';
import {logoToolReceipt}from './logo-tool-execution';
import type {LogoSelectionCommand}from './logo-selection-contract';
const prefix='agent.logo.selection.';
const hash=(v:unknown)=>stableHash('agent-logo-selection-211',v);
const roles=['logo-light','logo-mono','logo-white','logo-mark','favicon','brand-board','brand-guide','brand-book']as const;
type FilePin={id:string;version:number;role:string;sha256:string};
type Application={main:string;directionId:string;identityHash:string;brandHash:string;revision:number|null;files:FilePin[]};
type Saved={schema:1;id:string;conversationId:string;phase:'select'|'apply';sourceId:string;assetId:string;sourceHash:string;seriesId:string;directionId:string;identityHash:string;revision:number;projectRevision:number;contextHash:string;brandHash:string;previousSelection:DirectionSelection|null;funding:string;expiresAt:number;confirmedAt?:number;selection?:DirectionSelection;jobId?:string;application?:Application};
function owned(u:User,cid:string){if(!conversationLogoReviewEnabled())throw new HttpError(404,'Choix de logo avec SYNA indisponible.');const c=ownedConversation(u,cid);if(!c.project_id)throw new HttpError(409,'Créez le projet avant de choisir.');return{c,pid:c.project_id};}
function read(pid:string,qid:string){return json<Saved|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?",pid,prefix+qid)?.value,null);}
function save(pid:string,m:Saved){remember(pid,{kind:'artifact',key:prefix+m.id,value:JSON.stringify(m),source:'user'});}
function located(u:User,cid:string,qid:string){const o=owned(u,cid),m=read(o.pid,qid);if(!m||m.conversationId!==cid)throw new HttpError(404,'Choix introuvable.');return{...o,m};}
function candidate(u:User,cid:string,sourceId:string,assetId:string){
 const{pid}=owned(u,cid),r=logoToolReceipt(u,cid,sourceId),output=r.outputs.find(o=>o.image.assetId===assetId&&o.present),d=directionOf(pid,assetId);
 if(!r.delivered||!output||!d||d.series.id!==r.seriesId||d.series.status!=='complete')throw new HttpError(409,'Direction acquise complète non prouvée. Aucun logo remplacé.');
 return{pid,d,output,sourceHash:hash({sourceId,seriesId:r.seriesId,name:r.name,output}),identityHash:stableHash('direction',d.direction.identity)};
}
function contextHash(pid:string){const p=loadProject(pid);return hash({product:p.product,services:p.services,catalog:p.catalog,sources:p.sources,language:p.settings.language,brief:stateOf(pid)?.stages.brief?.data??null});}
function recheck(u:User,cid:string,m:Saved){
 const{c,pid}=owned(u,cid);requirePlan(u,pid);const live=candidate(u,cid,m.sourceId,m.assetId);
 if(c.revision!==m.revision||stateOf(pid)?.revision!==m.projectRevision||contextHash(pid)!==m.contextHash||live.sourceHash!==m.sourceHash||live.identityHash!==m.identityHash||directionBrandHash(pid)!==m.brandHash||hash(pendingDirection(pid))!==hash(m.previousSelection)||projectAccountKey(pid)!==m.funding||now()>m.expiresAt)throw new HttpError(409,'Le projet, le choix ou son dessin a changé. Vos versions sont conservées.');
 if(m.phase==='apply')assertSelectedDirection(pid,m.assetId);return{c,pid,live};
}
export function quoteLogoSelection(u:User,cid:string,cmd:Extract<LogoSelectionCommand,{action:'quote'}>){return tx(()=>{
 const{c,pid}=owned(u,cid);requirePlan(u,pid);if(c.revision!==cmd.revision||stateOf(pid)?.revision!==cmd.projectRevision)throw new HttpError(409,'Le contexte a changé.');
 const live=candidate(u,cid,cmd.sourceId,cmd.assetId),selection=pendingDirection(pid);if(cmd.phase==='apply')assertSelectedDirection(pid,cmd.assetId);
 const m:Saved={schema:1,id:id(),conversationId:cid,phase:cmd.phase,sourceId:cmd.sourceId,assetId:cmd.assetId,sourceHash:live.sourceHash,seriesId:live.d.series.id,directionId:live.d.direction.id,identityHash:live.identityHash,revision:c.revision,projectRevision:cmd.projectRevision,contextHash:contextHash(pid),brandHash:directionBrandHash(pid),previousSelection:selection,funding:projectAccountKey(pid),expiresAt:now()+15*60000};save(pid,m);
 return{id:m.id,phase:m.phase,assetId:m.assetId,href:live.output.href,identity:live.d.direction.identity,name:live.d.series.name,label:live.d.direction.label,before:loadProject(pid).brand,previousSelection:selection,maximumPct:0,newProviderCalls:0,confirmationRequired:true,actionsExecuted:false,expiresAt:m.expiresAt,scope:m.phase==='select'?'Retenir cette proposition pour comparaison. Votre identité active reste inchangée ; une seconde validation explicite sera nécessaire.':'Appliquer cette identité complète : nom, signature, couleurs, polices, logo et kit local. Ancienne identité et contenus conservés ; aucun thème, lot initial, texte, image ou vidéo créé.'};
});}
export function confirmLogoSelection(u:User,cid:string,qid:string){return tx(()=>{
 const{pid,m}=located(u,cid,qid);if(m.confirmedAt)return logoSelectionReceipt(u,cid,qid);recheck(u,cid,m);
 if(one("SELECT 1 FROM jobs WHERE project_id=? AND type IN ('brand.logo.v2','brand.logo.v2.choose','brand.logo.v2.redraw','brand.logo') AND status IN ('queued','running','paused','blocked')",pid))throw new HttpError(409,'Une tâche de logo est déjà active. Aucun choix remplacé.');
 if(m.phase==='select'){m.selection=selectCompleteDirection(pid,m.assetId);m.confirmedAt=now();save(pid,m);return logoSelectionReceipt(u,cid,qid);}
 const s=assertSelectedDirection(pid,m.assetId),j=enqueue({userId:u.id,projectId:pid,type:'brand.logo.v2.choose',label:'Identité complète approuvée avec SYNA — kit local',payload:{projectId:pid,assetId:m.assetId,selectionBrandHash:s.brandHash,agentLogoSelectionQuote:{conversationId:cid,quoteId:m.id},costCapMicro:0},maxAttempts:1,idempotencyKey:`direction-validation:${pid}:${s.logoId}:${s.selectedAt}:${s.brandHash}`});m.jobId=j.id;m.confirmedAt=now();save(pid,m);return logoSelectionReceipt(u,cid,qid);
});}
function filePin(u:User,pid:string,assetId:string):FilePin{const a=getAsset(assetId);if(!a||a.user_id!==u.id||a.project_id!==pid||a.deleted_at||a.status==='rejected')throw new HttpError(409,'Un fichier du kit natif est absent ou refusé.');const b=assetData(a);if(!b.length)throw new HttpError(409,'Un fichier du kit natif est vide.');return{id:a.id,version:a.version,role:a.role??'',sha256:createHash('sha256').update(b).digest('hex')};}
function pinApplication(u:User,pid:string,m:Saved,result:{main:string;territory:string}):Application{
 const native=json<{main?:string;identityHash?:string}|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=?",pid,`brand.direction.application.${m.seriesId}.${m.directionId}`)?.value,null),p=loadProject(pid),s=pendingDirection(pid);
 if(result.territory!==m.directionId||native?.main!==result.main||native.identityHash!==m.identityHash||p.brand?.logo.assetId!==result.main||p.brand.artIdentity?.directionId!==m.directionId||s?.status!=='applied'||s.logoId!==m.assetId)throw new HttpError(409,'Application native complète non prouvée. Vos acquis sont conservés.');
 const files=[filePin(u,pid,result.main),...roles.map(role=>{const a=one<{id:string}>("SELECT id FROM assets WHERE project_id=? AND user_id=? AND role=? AND source_asset_id=? AND deleted_at IS NULL AND status!='rejected' ORDER BY created_at DESC,rowid DESC LIMIT 1",pid,u.id,role,result.main);if(!a)throw new HttpError(409,'Kit natif incomplet : '+role);return filePin(u,pid,a.id);})];
 return{main:result.main,directionId:m.directionId,identityHash:m.identityHash,brandHash:directionBrandHash(pid),revision:stateOf(pid)?.revision??null,files};
}
export async function runLogoSelection(ctx:JobContext,injected?:{choose?:typeof chooseLogoV2}){
 const q=ctx.payload.agentLogoSelectionQuote,u=one<User>('SELECT * FROM users WHERE id=?',ctx.job.user_id);if(!u||!q||typeof q.conversationId!=='string'||typeof q.quoteId!=='string')throw new HttpError(404,'Tâche de choix absente.');const{pid,m}=located(u,q.conversationId,q.quoteId);
 if(m.phase!=='apply'||m.jobId!==ctx.job.id||ctx.job.type!=='brand.logo.v2.choose'||ctx.job.project_id!==pid||ctx.payload.assetId!==m.assetId||ctx.payload.costCapMicro!==0)throw new HttpError(404,'Tâche de choix étrangère.');
 const packed=()=>({quoteId:m.id,application:m.application!,newProviderCalls:0,initialCreationStarted:false,themeChanged:false});
 const result=await ctx.step('agent-logo-native-choice',async()=>{
  if(m.application)return packed();
  const acquired=json<{main:string;identityHash:string;jobId?:string}|null>(one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=?",pid,`brand.direction.application.${m.seriesId}.${m.directionId}`)?.value,null);
  if(acquired?.identityHash===m.identityHash&&(acquired.jobId===ctx.job.id||directionBrandHash(pid)===m.brandHash)&&pendingDirection(pid)?.status==='applied'){m.application=pinApplication(u,pid,m,{main:acquired.main,territory:m.directionId});save(pid,m);return packed();}
  recheck(u,q.conversationId,m);const native=await withAiDisabled('Choix local explicitement accepté, aucun appel IA',()=> (injected?.choose??chooseLogoV2)(ctx,pid,m.assetId,{beforeFinalApply:()=>{ctx.progress(.9,'Vérification du choix avant application.');recheck(u,q.conversationId,m);},deferInitialCreation:true}));ctx.progress(.95,'Vérification du kit enregistré.');m.application=pinApplication(u,pid,m,native);save(pid,m);return{quoteId:m.id,application:m.application,newProviderCalls:0,initialCreationStarted:false,themeChanged:false};
 });return result;
}
export function logoSelectionReceipt(u:User,cid:string,qid:string){return readSnapshot(()=>{
 const{pid,m}=located(u,cid,qid),j=m.jobId?getJob(m.jobId):null;if(j&&(j.user_id!==u.id||j.project_id!==pid||j.type!=='brand.logo.v2.choose'))throw new HttpError(404,'Tâche étrangère.');
 const r=json<{quoteId?:string;application?:Application}>(j?.result,{}),selected=!!m.confirmedAt&&m.phase==='select'&&m.selection?.status==='selected'&&m.selection.logoId===m.assetId,applied=!!m.application&&j?.status==='done'&&r.quoteId===m.id&&hash(r.application)===hash(m.application),delivered=!!selected||applied;
 let filesPresent=false;try{filesPresent=!!m.application&&m.application.files.every(p=>hash(filePin(u,pid,p.id))===hash(p));}catch(e){if(!(e instanceof HttpError))throw e;}
 return{id:m.id,sourceId:m.sourceId,assetId:m.assetId,phase:m.phase,delivered,state:delivered?'review':j?.status==='done'?'result_missing':j?.status??'quoted',job:j?publicJob(j):null,maximumPct:0,newProviderCalls:0,initialCreationStarted:false,themeChanged:false,creativeQualityQualified:false,isCurrent:!!selected?hash(pendingDirection(pid))===hash(m.selection):applied&&filesPresent&&directionBrandHash(pid)===m.application!.brandHash,filesPresent,application:applied?m.application:null,href:`/studio/${pid}/marque`,message:selected?'Proposition retenue. Votre identité active reste inchangée ; validez séparément son identité complète si vous le souhaitez.':applied?filesPresent?'Identité complète et kit local enregistrés. Anciens contenus à relire ; aucun thème reconstruit ni lot initial lancé.':'Kit initial prouvé, certains fichiers retirés ou modifiés depuis. Aucun fichier recréé automatiquement.':'Application complète non prouvée. Vos versions et fichiers acquis restent conservés.'};
});}
export function logoSelectionView(u:User,cid:string,sourceId:string){return readSnapshot(()=>{const{pid}=owned(u,cid);return{enabled:true,pending:pendingDirection(pid),receipts:all<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key LIKE 'agent.logo.selection.%' ORDER BY created_at DESC,rowid DESC LIMIT 100",pid).map(r=>json<Saved|null>(r.value,null)).filter((m):m is Saved=>!!m&&m.conversationId===cid&&m.sourceId===sourceId&&!!m.confirmedAt).slice(0,10).map(m=>logoSelectionReceipt(u,cid,m.id))};});}
