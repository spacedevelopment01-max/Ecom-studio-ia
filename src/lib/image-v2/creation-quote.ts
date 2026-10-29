/** Devis du parcours natif borné : une génération et un contrôle strict par composition, sans reprise cachée. */
import {HttpError} from '../auth';
import {mediaRouteFor,productImagePath,photoRequestMaxMicro,productScenePrompt,ambiancePrompt,withQuotedImageRoute,imageReferencePrompt} from '../ai/media-providers';
import {callCostBoundMicro,estimateCallMicro,routeLlm,strictTextQuoteInput,withSelectedStrategy,type LlmCall} from '../ai/llm';
import {buildBrief,briefHash,generationPrompt} from './brief';
import {PRODUCT_KINDS} from './intent';
import {imageReviewRequest} from './deps';
import {BoundedImageReviewSchema} from './quality';
import {generationAspect} from './formats';
import {resolveImageBinding,imageBindingHash,pinImageAsset,boundReusableImage,type ImageBinding} from './request-binding';
import {reusableFor} from './assets';
import type {Project} from '../projects';
import type {ImageRequestV2} from './engine';
import {L} from '../i18n-server';
import {activeProviderKey} from '../ai/config';
import {brainSnapshot} from '../brain/snapshot';
import {rejectedDirections} from './direction';
import {applyWording,loadWordingRules} from '../client-wording';
export type ImageCreationInput={binding:ImageBinding;kind:ImageRequestV2['kind'];aspect:'1:1'|'4:5'|'9:16'|'16:9';instruction:string;frames:NonNullable<ImageRequestV2['shot']>[]};
export function imageCreationQuote(p:Project,input:ImageCreationInput){
 const resolved=resolveImageBinding(p,input.binding),project=resolved.project;
 const fidelity=(!!input.binding.product||PRODUCT_KINDS.includes(input.kind))&&p.business==='products';
 const requests:ImageRequestV2[]=input.frames.map((shot,index)=>({kind:input.kind,aspect:input.aspect,support:'site',instructions:input.instruction,shot,variant:index,count:1,binding:input.binding,bindingDigest:resolved.digest,productFidelity:fidelity,references:resolved.references,...(resolved.service?{service:resolved.service}:{}),peopleAllowed:false,noStock:true,allowGenerate:true,attemptLimit:1,allowDirectionChange:false,singleReviewCall:true}));
 let capMicro=0,estimateMicro=0,maximumCalls=0,reused=0,routeReason=L('Acquis natifs réutilisés sans appel fournisseur.','Native acquired files reused without a provider request.');const briefHashes:string[]=[];
 for(const request of requests){
  const brief=buildBrief(project,request,{rejectedDirections:rejectedDirections(brainSnapshot(project).memory),peopleAllowed:false}),prompt=applyWording(generationPrompt(brief),loadWordingRules(p.id)),aspect=generationAspect(brief.format.aspect);
  briefHashes.push(briefHash(brief));
  const existing=reusableFor(p.id,briefHash(brief));
  if(existing?.origin==='generated'){
   const pin=pinImageAsset(p.userId,p.id,existing.id,existing.version);boundReusableImage(project,briefHash(brief),pin);request.reuseAsset=pin;request.reuseOnly=true;reused++;continue;
  }
  const path=fidelity?productImagePath('product_image'):null,usage=path?.usage??'scene';
  if(fidelity&&!path)throw new HttpError(409,L('Aucun parcours fidèle disponible pour cette photo.','No faithful workflow available for this photo.'));
  const imageRoute=mediaRouteFor(usage,{references:resolved.references.length});
  if(!imageRoute)throw new HttpError(409,L('Fournisseur image indisponible. Aucun substitut local.','Image provider unavailable. No local substitute.'));
  routeReason=imageRoute.reason;
  const textZone=brief.format.textZone&&brief.format.textZone!=='none'?`${{left:'à gauche',right:'à droite',top:'en haut',bottom:'en bas',center:'au centre'}[brief.format.textZone]} du cadre`:null;
  const actualPrompt=imageReferencePrompt(fidelity?productScenePrompt({prompt,aspect,textZone}):ambiancePrompt({prompt,aspect,reference:resolved.references.length>0}),resolved.references.map(()=> 'product'));
  const imageMax=withQuotedImageRoute(imageRoute,()=>photoRequestMaxMicro(imageRoute,{prompt:actualPrompt,references:resolved.references.length,aspect}));
  const images=[{data:Buffer.alloc(1),label:'image à juger'},...(resolved.references.length?[{data:Buffer.alloc(1),label:'référence réelle'}]:[])];
  const call=withSelectedStrategy(imageReviewRequest(project,brief,{userId:p.userId,projectId:p.id,jobId:null,usageKey:'quote'},images)),review=routeLlm(call);
  if(review.mode!=='llm'||!activeProviderKey(review.provider as Parameters<typeof activeProviderKey>[0]))throw new HttpError(409,L('Le contrôle visuel requis est indisponible. Rien ne sera généré.','Required visual review is unavailable. Nothing will be generated.'));
  // Le contrôle réduit le candidat à1024px et la référence à768px avant envoi. Borne conservative par image.
  const tokens=strictTextQuoteInput({...call,images:undefined},BoundedImageReviewSchema),reviewMax=callCostBoundMicro(review.provider,review.model,tokens.maximumTokens+images.length*3400,2500,review.effort??null),reviewEstimate=estimateCallMicro(review.provider,review.model,tokens.typicalTokens+images.length*1600,600);
  if(!Number.isSafeInteger(imageMax)||imageMax<=0||reviewMax==null||reviewEstimate==null||reviewMax<=0)throw new HttpError(409,L('Tarif ou plafond inconnu. Aucun appel autorisé.','Unknown price or bound. No request authorized.'));
  capMicro+=imageMax+reviewMax;estimateMicro+=imageMax+reviewEstimate;
  maximumCalls+=2;
  request.quotedRoutes={image:{provider:imageRoute.provider,model:imageRoute.model},review:{provider:review.provider,model:review.model,...(review.effort?{effort:review.effort}:{})} satisfies NonNullable<LlmCall['expectedRoute']>};
  request.quotedReviewEnvelope={context:call.context,volatile:call.volatile,reference:call.reference};
 }
 return{capMicro,estimateMicro,maximumCalls,reused,requests,briefHashes,routeReason,fingerprint:imageBindingHash({input,requests,briefHashes,capMicro,estimateMicro,routeReason})};
}
