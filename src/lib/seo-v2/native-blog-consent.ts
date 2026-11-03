/** Blog-only authorization of the existing included/quota engine; no new billing or writing engine. */
import crypto from 'node:crypto';
import {HttpError,type User} from '../auth';
import {now,one,tx} from '../db';
import {derivedKey} from '../secrets';
import {stableHash} from '../brain/hash';
import {loadProject} from '../projects';
import {blogPlanReason,getArticle} from '../engine/blog';
import {assertAiAllowed,aiActiveFor,withAiDisabled} from '../ai/access';
import {assertCanSpend} from '../billing';
import {budgetPctOf} from '../ai/budget-pct';
import {withTrace} from '../ai/trace';
import {getJob,type JobContext} from '../jobs';
import {DEFAULT_SEO_CAP_EUR,runContentEngineV2,type ContentRequestV2} from './engine';
import type {SeoV2Deps} from './deps';
type Approval={schema:1;userId:string;projectId:string;operationId:string;requestHash:string;scope:string;articleId:string|null;capMicro:number;expiresAt:number};
export const nativeBlogRequestHash=(request:ContentRequestV2)=>stableHash('native-blog-request-1',request);
function fail(message='Vérifiez et confirmez l’autorisation de cet article avant rédaction.'):never{throw new HttpError(409,message,'blog_consent_required');}
function scope(pid:string,articleId:string|null){const p=loadProject(pid);return stableHash('native-blog-source-1',{product:p.product,services:p.services,brand:p.brand,settings:p.settings,article:articleId?getArticle(pid,articleId):null});}
const sign=(text:string)=>crypto.createHmac('sha256',derivedKey('native-blog-consent')).update(text).digest('base64url');
function eligible(userId:string,pid:string){if(loadProject(pid).userId!==userId)throw new HttpError(404,'Projet introuvable.');const reason=blogPlanReason(userId,pid);if(reason)throw new HttpError(402,reason);if(one("SELECT 1 FROM ai_reservations r JOIN jobs j ON j.id=r.job_id WHERE r.project_id=? AND r.status IN ('held','uncertain') AND j.type='content.v2' AND json_extract(j.payload,'$.request.type')='blog_article'",pid))fail('Une dépense Blog reste à rapprocher. Aucun nouvel achat lancé.');}
export function quoteNativeBlog(user:User,pid:string,operationId:string,request:ContentRequestV2,articleId:string|null=null){
 eligible(user.id,pid);const capMicro=aiActiveFor(user.id,pid)?Math.round(DEFAULT_SEO_CAP_EUR*1e6):0;
 if(capMicro){assertAiAllowed(user.id,pid);assertCanSpend(user.id,capMicro,pid);}
 const a:Approval={schema:1,userId:user.id,projectId:pid,operationId,requestHash:nativeBlogRequestHash(request),scope:scope(pid,articleId),articleId,capMicro,expiresAt:now()+15*60000};
 const payload=Buffer.from(JSON.stringify(a)).toString('base64url'),pct=budgetPctOf(user.id,capMicro,pid);
 if(pct==null)fail('Budget de ce projet indisponible.');
 return{approvalToken:payload+'.'+sign(payload),estimatePct:pct,maximumPct:pct,maximumMicro:capMicro,expiresAt:a.expiresAt,confirmationRequired:true,includedArticle:!articleId,articleQuotaMaximum:1,retriesIncluded:true};
}
export function signedNativeBlog(userId:string,pid:string,operationId:string,request:ContentRequestV2,token:string|undefined):Approval{
 try{const[payload,sig,...extra]=token?.split('.')??[];if(!payload||!sig||extra.length)throw Error();const expected=Buffer.from(sign(payload)),given=Buffer.from(sig);if(expected.length!==given.length||!crypto.timingSafeEqual(expected,given))throw Error();const a=JSON.parse(Buffer.from(payload,'base64url').toString())as Approval;if(a.schema!==1||a.userId!==userId||a.projectId!==pid||a.operationId!==operationId||a.requestHash!==nativeBlogRequestHash(request)||!Number.isSafeInteger(a.capMicro)||a.capMicro<0||a.capMicro>Math.round(DEFAULT_SEO_CAP_EUR*1e6))throw Error();return a;}catch{fail();}
}
export function checkNativeBlog(userId:string,pid:string,operationId:string,request:ContentRequestV2,token:string|undefined){const a=signedNativeBlog(userId,pid,operationId,request,token);eligible(userId,pid);if(a.expiresAt<now()||a.scope!==scope(pid,a.articleId))fail('Demande, article ou autorisation périmés : relisez avant de confirmer.');if(a.capMicro){assertAiAllowed(userId,pid);assertCanSpend(userId,a.capMicro,pid);}return a;}
export function previousNativeBlog(userId:string,pid:string,operationId:string,request:ContentRequestV2){const row=one<{id:string;payload:string}>("SELECT id,payload FROM jobs WHERE user_id=? AND project_id=? AND type='content.v2' AND json_extract(payload,'$.nativeBlogQuote.operationId')=?",userId,pid,operationId);if(!row)return null;if(JSON.parse(row.payload).nativeBlogQuote.requestHash!==nativeBlogRequestHash(request))fail('Cette demande appartient à un autre article.');return getJob(row.id)!;}
/** Checkpointed result is readable without buying again. An uncertain interrupted acquisition is never retried automatically. */
export async function runNativeBlog(ctx:JobContext,injected?:SeoV2Deps){
 const pid=ctx.job.project_id,data=ctx.payload.nativeBlogQuote,request=ctx.payload.request as ContentRequestV2;
 if(!pid||ctx.payload.projectId!==pid||ctx.job.type!=='content.v2'||request?.type!=='blog_article'||!data?.operationId)fail();
 const a=signedNativeBlog(ctx.job.user_id,pid,data.operationId,request,data.token);
 if(ctx.job.created_at>a.expiresAt)fail();
 if(ctx.checkpoint.nativeBlogResult)return ctx.checkpoint.nativeBlogResult as Awaited<ReturnType<typeof runContentEngineV2>>;
 tx(()=>{
  if(ctx.checkpoint.nativeBlogStartedAt)fail('Cette acquisition a été interrompue. Vérifiez les textes et coûts acquis avant toute nouvelle demande.');
  checkNativeBlog(ctx.job.user_id,pid,data.operationId,request,data.token);
  ctx.progress(0,'Autorisation Blog vérifiée');
  ctx.save('nativeBlogStartedAt',now());
 });
 const execute=()=>withTrace({jobId:ctx.job.id,projectId:pid,costCapMicro:a.capMicro},()=>runContentEngineV2(ctx,pid,{...request,maxCostEur:a.capMicro/1e6},injected));
 const result=await(a.capMicro?execute():withAiDisabled('Article local confirmé sans achat IA',execute));
 ctx.save('nativeBlogResult',result);return result;
}
