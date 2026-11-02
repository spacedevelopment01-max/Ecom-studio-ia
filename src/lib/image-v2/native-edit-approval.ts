/** Accord borné pour la retouche photo native à UN appel ; aiPost n'est pas ce moteur. */
import crypto from 'node:crypto';
import sharp from 'sharp';
import {HttpError,type User} from '../auth';
import {derivedKey} from '../secrets';
import {assetData,assetMeta,getAsset} from '../library';
import {now,one} from '../db';
import {requireCreationPlan} from '../plan-gates';
import {assertAiAllowed} from '../ai/access';
import {assertCanSpend} from '../billing';
import {budgetPctOf} from '../ai/budget-pct';
import {withTrace} from '../ai/trace';
import type {JobContext} from '../jobs';
import {imageBindingHash,pinImageAsset} from './request-binding';
import {photoEditRequest} from './edit-request';
import {editAspect,editProjectPhoto} from './edit-photo';
import {mediaRouteFor,photoRequestMaxMicro,imageQuality,imageReferencePrompt,withQuotedImageRoute} from '../ai/media-providers';
type Request={assetId:string;instruction:string};
type Approval={schema:1;userId:string;projectId:string;operationId:string;requestHash:string;scope:string;pricing:string;route:{provider:string;model:string};capMicro:number;expiresAt:number};
const sig=(payload:string)=>crypto.createHmac('sha256',derivedKey('native-photo-edit')).update(payload).digest('base64url');
export const nativeEditRequestHash=(r:Request)=>imageBindingHash(r);
export const nativeEditJobKey=(userId:string,projectId:string,operationId:string,r:Request)=>'native-edit:'+imageBindingHash({userId,projectId,operationId,r});
async function inputFor(userId:string,pid:string,r:Request){
 const a=getAsset(r.assetId);if(!a||a.user_id!==userId||a.project_id!==pid||a.deleted_at||!a.mime.startsWith('image/'))throw new HttpError(404,'Photo introuvable.');
 const recipe=assetMeta<Record<string,any>>(a);if(recipe.aiPost)throw new HttpError(409,'Retouche de publication temporairement indisponible : son devis multiétapes doit être confirmé. Aucun appel lancé.','image_edit_complex_consent_unavailable');
 const pin=pinImageAsset(userId,pid,a.id,a.version),dimensions=await sharp(assetData(a),{failOn:'none'}).metadata(),aspect=editAspect(dimensions.width??1,dimensions.height??1);
 const request=photoEditRequest({image:assetData(a),instruction:r.instruction,aspect,usage:'ad_visual'});
 return{request,scope:imageBindingHash({pin,meta:a.meta,width:dimensions.width,height:dimensions.height,request:{...request,references:undefined},userId,pid})};
}
function pricing(request:ReturnType<typeof photoEditRequest>){
 const route=mediaRouteFor('ad_visual',{references:1});if(!route)throw new HttpError(409,'Route de retouche indisponible. Aucun appel lancé.');
 const quality=imageQuality('ad_visual',request.quality),prompt=imageReferencePrompt(request.text,['scene']);
 const capMicro=withQuotedImageRoute(route,()=>photoRequestMaxMicro(route,{prompt,references:1,aspect:request.aspect,quality}));
 if(!Number.isSafeInteger(capMicro)||capMicro<=0)throw new HttpError(409,'Tarif de retouche indisponible.');
 return{route:{provider:route.provider,model:route.model},capMicro,pricing:imageBindingHash({route:{provider:route.provider,model:route.model},capMicro,quality,prompt,aspect:request.aspect})};
}
export async function quoteNativePhotoEdit(user:User,pid:string,operationId:string,r:Request){
 requireCreationPlan(user,pid,'images');const input=await inputFor(user.id,pid,r),price=pricing(input.request);assertAiAllowed(user.id,pid);assertCanSpend(user.id,price.capMicro,pid);
 const a:Approval={schema:1,userId:user.id,projectId:pid,operationId,requestHash:nativeEditRequestHash(r),scope:input.scope,...price,expiresAt:now()+15*60000};
 const payload=Buffer.from(JSON.stringify(a)).toString('base64url'),pct=budgetPctOf(user.id,price.capMicro,pid);if(pct==null||!Number.isFinite(pct))throw new HttpError(409,'Budget indisponible.');
 return{approvalToken:`${payload}.${sig(payload)}`,estimateMicro:price.capMicro,maximumMicro:price.capMicro,estimatePct:pct,maximumPct:pct,maximumCalls:1,expiresAt:a.expiresAt,confirmationRequired:true};
}
export function signedNativePhotoEdit(user:User,pid:string,operationId:string,r:Request,token:string|undefined):Approval{
 try{const[payload,signature,...rest]=token?.split('.')??[];if(!payload||!signature||rest.length)throw Error();const expected=Buffer.from(sig(payload)),given=Buffer.from(signature);if(expected.length!==given.length||!crypto.timingSafeEqual(expected,given))throw Error();const a=JSON.parse(Buffer.from(payload,'base64url').toString())as Approval;if(a.schema!==1||a.userId!==user.id||a.projectId!==pid||a.operationId!==operationId||a.requestHash!==nativeEditRequestHash(r))throw Error();return a;}catch{throw new HttpError(409,'Vérifiez et confirmez le devis exact avant retouche.','image_consent_required');}
}
export async function checkedNativePhotoEdit(user:User,pid:string,operationId:string,r:Request,token:string|undefined,recoverOnly=false){
 const a=signedNativePhotoEdit(user,pid,operationId,r,token);requireCreationPlan(user,pid,'images');const input=await inputFor(user.id,pid,r);
 if(a.scope!==input.scope||!recoverOnly&&a.expiresAt<now())throw new HttpError(409,'La source ou le devis a changé. Aucun appel lancé.','image_quote_stale');
 if(!recoverOnly){const price=pricing(input.request);if(price.pricing!==a.pricing)throw new HttpError(409,'Route ou tarif modifié. Aucun appel lancé.','image_quote_stale');assertAiAllowed(user.id,pid);assertCanSpend(user.id,a.capMicro,pid);}return a;
}
export async function runNativePhotoEdit(ctx:JobContext){
 const data=ctx.payload.nativeEditQuote as{operationId:string;token:string}|undefined;
 if(!data||!ctx.job.user_id||!ctx.job.project_id||ctx.job.type!=='image.edit'||ctx.payload.projectId!==ctx.job.project_id)throw new HttpError(409,'Accord retouche manquant.','image_consent_required');
 const user={id:ctx.job.user_id}as User,r={assetId:ctx.payload.assetId,instruction:ctx.payload.instruction},a=await checkedNativePhotoEdit(user,ctx.job.project_id,data.operationId,r,data.token,Object.hasOwn(ctx.checkpoint,'native-photo-edit'));
 if(ctx.job.created_at>a.expiresAt||ctx.payload.costCapMicro!==a.capMicro)throw new HttpError(409,'Tâche hors devis.','image_quote_stale');
 return withTrace({costCapMicro:a.capMicro},()=>ctx.step('native-photo-edit',()=>withQuotedImageRoute(a.route,()=>editProjectPhoto(ctx,ctx.job.project_id!,r.assetId,r.instruction))));
}
