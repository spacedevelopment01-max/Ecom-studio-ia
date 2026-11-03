/** Accord natif Images V2 : devis existant borné, signature et même moteur ; aucun fournisseur appelé au devis. */
import crypto from 'node:crypto';
import {z} from 'zod';
import {HttpError,type User} from '../auth';
import {derivedKey} from '../secrets';
import {getAsset} from '../library';
import {loadProject} from '../projects';
import {now,one} from '../db';
import {strategyStamp} from '../strategy-consumption';
import {requireCreationPlan} from '../plan-gates';
import {assertJobEntitlements} from '../job-entitlements';
import {assertAiAllowed} from '../ai/access';
import {assertCanSpend} from '../billing';
import {budgetPctOf} from '../ai/budget-pct';
import {withTrace} from '../ai/trace';
import type {JobContext} from '../jobs';
import {checkedPlacementRequest} from '../theme/placement-request';
import {visualIntent} from './intent';
import {PRODUCT_KINDS} from './intent';
import {VISUAL_KINDS} from './types';
import {defaultAspect} from './formats';
import {boundedImageRequestsQuote} from './creation-quote';
import {imageBindingHash,pinImageAsset} from './request-binding';
import {loadWordingRules} from '../client-wording';
import {productReferences,runImageEngineV2,type ImageRunResult,type ImageRequestV2} from './engine';
import type {ImageV2Deps} from './deps';
import {briefHash,buildBrief} from './brief';
import {brainSnapshot} from '../brain/snapshot';
import {rejectedDirections} from './direction';
export const NativeImageRequestSchema=z.object({
 themePlacement:z.object({versionId:z.string().max(80),slotKey:z.string().max(300),contextHash:z.string().max(100)}).optional(),
 kind:z.enum(VISUAL_KINDS).optional(),text:z.string().max(400).optional(),
 support:z.enum(['site','product_page','service_page','social','ad','blog','video','banner','gallery','brand']).optional(),
 aspect:z.enum(['1:1','4:5','2:3','3:2','9:16','16:9','3:1','4:1']).optional(),count:z.number().int().min(1).max(4).optional(),
 topic:z.string().max(200).optional(),allowGenerate:z.boolean().optional(),noStock:z.boolean().optional(),broad:z.boolean().optional(),silhouettes:z.boolean().optional(),
});
export type NativeImageRequest=z.infer<typeof NativeImageRequestSchema>;
type Cost=ReturnType<typeof boundedImageRequestsQuote>;
type Approval={schema:1;userId:string;projectId:string;operationId:string;requestHash:string;scope:string;cost:Cost;pricingStamps:(string|null)[];expiresAt:number};
const signature=(payload:string)=>crypto.createHmac('sha256',derivedKey('native-image-generation')).update(payload).digest('base64url');
export function nativeImageJobKey(userId:string,projectId:string,operationId:string,request:NativeImageRequest){return 'native-image:'+imageBindingHash({userId,projectId,operationId,request});}
async function inputFor(userId:string,pid:string,request:NativeImageRequest){
 const p=loadProject(pid),placement=request.themePlacement?await checkedPlacementRequest(pid,request.themePlacement):null;
 if(request.allowGenerate===false)throw new HttpError(400,'La recherche seule ne demande pas de devis de génération.');
 if(placement&&placement.request.kind!=='image')throw new HttpError(400,'Utilisez le parcours vidéo pour cet emplacement.');
 const intent=request.kind?{kind:request.kind,support:request.support}:visualIntent(request.text??'',p.business);
 const kind=placement?(placement.request.role==='packshot'?'packshot':placement.request.role==='detail'?'product_image':p.business==='services'?'trade_photo':'usage_scene'):intent.kind;
 const support=request.support??intent.support??'site',refs=placement?placement.request.referenceAssetIds:PRODUCT_KINDS.includes(kind)&&p.business==='products'?productReferences(pid):[];
 const pins=refs.map(aid=>{const a=getAsset(aid);if(!a)throw new HttpError(409,'La référence manque.');return pinImageAsset(userId,pid,aid,a.version);}),count=request.count??1;
 const requests:ImageRequestV2[]=Array.from({length:count},(_,index)=>({kind,support,aspect:request.aspect??defaultAspect(support,kind),topic:request.topic??(request.kind?null:request.text??null),count:1,variant:count>1?index:null,references:refs,noStock:true,allowGenerate:true,attemptLimit:1,allowDirectionChange:false,singleReviewCall:true,...(placement?{instructions:placement.request.request,peopleAllowed:false,slot:`theme:${placement.request.role}:${placement.plan.contextHash}:${placement.request.key}`,themePlacement:request.themePlacement}:{})}));
 assertJobEntitlements('image.v2',pid,{request:requests[0]});
 const scope=imageBindingHash({projectId:pid,userId,request,pins,strategy:strategyStamp(pid),product:p.product,services:p.services,brand:p.brand,settings:p.settings,wording:loadWordingRules(pid)});
 return{p,requests,scope};
}
export async function quoteNativeImageGeneration(user:User,pid:string,operationId:string,request:NativeImageRequest){
 requireCreationPlan(user,pid,'images');const{p,requests,scope}=await inputFor(user.id,pid,request),cost=boundedImageRequestsQuote(p,requests,{request,scope},true);
 if(cost.capMicro>0){assertAiAllowed(user.id,pid);assertCanSpend(user.id,cost.capMicro,pid);}
 const pricingStamps=cost.requests.map(r=>r.reuseOnly?null:requestPricing(p,r).fingerprint);
 const a:Approval={schema:1,userId:user.id,projectId:pid,operationId,requestHash:imageBindingHash(request),scope,cost,pricingStamps,expiresAt:now()+15*60000};
 const payload=Buffer.from(JSON.stringify(a)).toString('base64url'),estimatePct=budgetPctOf(user.id,cost.estimateMicro,pid),maximumPct=budgetPctOf(user.id,cost.capMicro,pid);
 if(estimatePct==null||maximumPct==null||!Number.isFinite(estimatePct)||!Number.isFinite(maximumPct))throw new HttpError(409,'Budget indisponible.');
 return{approvalToken:`${payload}.${signature(payload)}`,estimateMicro:cost.estimateMicro,maximumMicro:cost.capMicro,estimatePct,maximumPct,maximumCalls:cost.maximumCalls,reused:cost.reused,expiresAt:a.expiresAt,confirmationRequired:cost.capMicro>0};
}
export function signedNativeImageApproval(user:User,pid:string,operationId:string,request:NativeImageRequest,token:string|undefined):Approval{
 try{const[payload,sig,...extra]=token?.split('.')??[];if(!payload||!sig||extra.length)throw Error();const expected=Buffer.from(signature(payload)),given=Buffer.from(sig);if(expected.length!==given.length||!crypto.timingSafeEqual(expected,given))throw Error();const a=JSON.parse(Buffer.from(payload,'base64url').toString())as Approval;if(a.schema!==1||a.userId!==user.id||a.projectId!==pid||a.operationId!==operationId||a.requestHash!==imageBindingHash(request))throw Error();return a;}catch{throw new HttpError(409,'Devis de cette demande à vérifier et confirmer avant génération.','image_consent_required');}
}
function requestPricing(p:ReturnType<typeof loadProject>,request:ImageRequestV2){return boundedImageRequestsQuote(p,[{...request}],'native-image-pricing',true,true);}
export async function checkedNativeImageApproval(user:User,pid:string,operationId:string,request:NativeImageRequest,token:string|undefined,reprice:boolean,recoverOnly=false){
 const a=signedNativeImageApproval(user,pid,operationId,request,token);requireCreationPlan(user,pid,'images');
 const{p,requests,scope}=await inputFor(user.id,pid,request);if(!recoverOnly&&a.expiresAt<now()||a.scope!==scope)throw new HttpError(409,'Le devis ou les références ont changé. Aucun appel lancé.','image_quote_stale');
 if(requests.some((r,i)=>briefHash(buildBrief(p,r,{rejectedDirections:rejectedDirections(brainSnapshot(p).memory),peopleAllowed:r.peopleAllowed}))!==a.cost.briefHashes[i]))throw new HttpError(409,'Le brief a changé. Vérifiez un nouveau devis.','image_quote_stale');
 if(reprice&&boundedImageRequestsQuote(p,requests,{request,scope},true).fingerprint!==a.cost.fingerprint)throw new HttpError(409,'Le tarif, la route ou les acquis ont changé. Vérifiez un nouveau devis.','image_quote_stale');
 if(reprice&&a.cost.capMicro>0){assertAiAllowed(user.id,pid);assertCanSpend(user.id,a.cost.capMicro,pid);}return a;
}
export async function runNativeImageGeneration(ctx:JobContext,injected?:ImageV2Deps){
 const data=ctx.payload.nativeImageQuote as{operationId:string;token:string}|undefined;
 if(!data||!ctx.job.user_id||!ctx.job.project_id||ctx.job.type!=='image.v2'||ctx.payload.projectId!==ctx.job.project_id)throw new HttpError(409,'Accord image manquant.');
 const user={id:ctx.job.user_id}as User,signed=signedNativeImageApproval(user,ctx.job.project_id,data.operationId,ctx.payload.request,data.token),pending=signed.cost.requests.map((r,i)=>({r,i})).filter(({r,i})=>!r.reuseOnly&&!Object.hasOwn(ctx.checkpoint,`native-image-${i}`));
 if(ctx.job.created_at>signed.expiresAt)throw new HttpError(409,'Cette tâche a été créée hors du devis.','image_quote_stale');
 const approval=await checkedNativeImageApproval(user,ctx.job.project_id,data.operationId,ctx.payload.request,data.token,false,pending.length===0);
 const results:ImageRunResult[]=[];
 await withTrace({costCapMicro:approval.cost.capMicro},async()=>{for(let i=0;i<approval.cost.requests.length;i++){
  const request=approval.cost.requests[i];
  const result=await ctx.step(`native-image-${i}`,async()=>{
   await checkedNativeImageApproval(user,ctx.job.project_id!,data.operationId,ctx.payload.request,data.token,false,request.reuseOnly===true);
   if(!request.reuseOnly){const pricing=requestPricing(loadProject(ctx.job.project_id!),request);if(pricing.fingerprint!==approval.pricingStamps?.[i])throw new HttpError(409,'Route ou tarif modifié depuis votre accord. Aucun nouvel appel.','image_quote_stale');assertAiAllowed(user.id,ctx.job.project_id!);assertCanSpend(user.id,pricing.capMicro,ctx.job.project_id!);}
   return runImageEngineV2(ctx,ctx.job.project_id!,{...request,maxCostEur:approval.cost.capMicro/1e6},injected);
  });results.push(result);if(result.stoppedByCostCap)break;
 }});
 return{runId:ctx.job.id,outcomes:results.flatMap(r=>r.outcomes),search:results.flatMap(r=>r.search),stats:Object.fromEntries(Object.keys(results[0]?.stats??{}).map(k=>[k,results.reduce((n,r)=>n+(r.stats[k as keyof typeof r.stats]??0),0)]))as ImageRunResult['stats'],costMicro:one<{cost:number}>('SELECT COALESCE(SUM(cost),0) cost FROM ai_calls WHERE job_id=?',ctx.job.id)!.cost,stoppedByCostCap:results.some(r=>r.stoppedByCostCap),notes:results.flatMap(r=>r.notes)};
}
