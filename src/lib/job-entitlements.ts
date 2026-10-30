import {placementRequest} from "./theme/placement-request";
/** Rechecked both at enqueue and at dispatch: queued work does not retain old plan rights. */
import { HttpError } from './auth';
import { projectPlan } from './project-billing';
import { PLANS } from './plans';
import { L } from './i18n-server';
import { planAllowsAds } from './plan-entitlements';
export function assertAdvertising(projectId:string) {
  if(!planAllowsAds(projectPlan(projectId)))throw new HttpError(402,L('La publicité et l’aide aux campagnes sont disponibles avec le forfait Dominer (129 € par mois). Vos créations existantes restent conservées.','Advertising and campaign assistance are available with the Dominate plan (€129 per month). Your existing creations are kept.'),'plan_upgrade');
}
export function assertJobEntitlements(type:string,projectId:string|null|undefined,payload:any={}) {
  if(type==='video.bank.stock'&&(!projectId||!projectPlan(projectId)))throw new HttpError(402,L('Un forfait actif est nécessaire pour compléter cette banque.','An active plan is required to add to this bank.'),'plan_required');
  const request=payload.request??payload;
  if(request.themePlacement){if(!projectId)throw new HttpError(404,"Project required");placementRequest(projectId,request.themePlacement);}
  const advertising=(type==='image.v2'&&(request.kind==='ad_image'||request.support==='ad'))||/^(ads\.|ad\.|campaign\.)/.test(type)||(type==='image.ai_post'&&(payload.request?.as==='ad'||payload.request?.kind==='ad'||String(payload.request?.entryPoint??'').startsWith('ads-')))||(type.startsWith('video.')&&(request.as==='ad'||request.ask?.purpose==='ad'||(request.ask?.kind==='video_ad'&&request.ask?.purpose!=='organic')));
  const video=['video.bank.ai','video.ugc','video.v2.clip'].includes(type)||(type==='video.v2'&&request.approveGeneration===true)||(type==='video.scenes'&&request.mode!=='stock');
  const blog=type==='blog.write'||type==='agent.blog.write'||(type==='content.v2'&&payload.request?.type==='blog_article');
  if(!advertising&&!video&&!blog)return;
  if(!projectId)throw new HttpError(402,L('Choisissez le projet et son forfait avant de créer.','Choose the project and its plan before creating.'),'plan_required');
  if(advertising)assertAdvertising(projectId);
  const plan=projectPlan(projectId);
  if(!plan||(video&&PLANS[plan].videos==='none')||(blog&&!PLANS[plan].quotas.blog))throw new HttpError(402,L('Cette fonction nécessite un forfait Développer ou Dominer actif pour ce projet.','This feature requires an active Grow or Dominate plan for this project.'),'plan_upgrade');
}
