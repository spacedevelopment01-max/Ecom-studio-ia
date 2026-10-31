/** Devis natif du parcours direct/avec référence, avant toute réservation.
 * Le scénario est déjà approuvé : aucun nouvel appel de rédaction ou repli image/stock prévu. */
import {withSiteStrategy,withCommunicationStrategy}from '../strategy-consumption';
import {HttpError} from '../auth';
import {L} from '../i18n-server';
import {activeProviderKey} from '../ai/config';
import {llmConfigured,routeLlm,strictTextQuoteInput,callCostBoundMicro,estimateCallMicro,withSelectedStrategy,type LlmCall} from '../ai/llm';
import {aiActiveFor} from '../ai/access';
import {mediaReservationMaxMicro} from '../ai/media-providers';
import {projectRights} from '../plan-gates';
import {imageBindingHash} from '../image-v2/request-binding';
import {loadCreativeMemory} from './creative-memory';
import {projectVoice,voiceAvailable,countWords} from './voice';
import {voiceQuote,isOpenAIVoice} from './openai-voice';
import {buildCreativeBrief} from './creative-brief';
import {SIZES} from './doc';
import {sceneGenerationRoute} from './scene-generation';
import {sceneSubjectContext} from './subject-binding';
import {approvedScenePlan,directScenePrompt,quoteScenes,sceneTiming,sceneVoiceLines,type ThreeScenesRequest,type ScenePlan,type Scene} from './three-scenes';
import {videoShotReviewRequest} from './shot-review-request';
import {BoundedShotReviewSchema} from './quality';
import type {Project} from '../projects';
type Envelope=Pick<LlmCall,'context'|'volatile'|'reference'>;
export type BoundedSceneQuote={schema:1;fingerprint:string;generation:'direct'|'reference';aspect:'16:9'|'9:16';seconds:number;bindingDigest:string;capMicro:number;estimateMicro:number;maximumCalls:number;clip:{provider:string;model:string;unitMicro:number;capMicro:number}|null;scenes:{prompt:string;reference:{assetId:string;version:number;sha256:string}|null;review:{prompt:string;envelope:Envelope;route:NonNullable<LlmCall['expectedRoute']>;maximumImages:number;capMicro:number}}[];voice:{id:string;speed:number;lang:'fr'|'en';lines:string[];capMicro:number}|null;policy:{automaticGenerationRetries:0;automaticRechecks:0;localContrastReencodes:1}};
const digest=(q:Omit<BoundedSceneQuote,'fingerprint'>)=>imageBindingHash(q);
export function assertBoundedSceneQuote(q:BoundedSceneQuote){const{fingerprint,...value}=q;if(q.schema!==1||fingerprint!==digest(value))throw new HttpError(409,L('Le devis vidéo a changé. Aucun nouvel appel autorisé.','Video quote changed. No new request authorized.'));}
export function boundedSceneQuote(root:Project,req:ThreeScenesRequest,raw:ScenePlan):BoundedSceneQuote{
 return req.purpose==='site'?withSiteStrategy(root.id,()=>boundedSceneQuoteInScope(root,req,raw)):withCommunicationStrategy(root.id,()=>boundedSceneQuoteInScope(root,req,raw),{angleId:req.angleId});
}
/** Même calcul exact pour une vidéo complète ou un seul plan remplacé, sans deviser les voix conservées. */
export function boundedDirectShots(p:Project,o:{generation:"direct"|"reference";aspect:"9:16"|"16:9";seconds:number;bindingDigest:string;request?:string|null;reviewOnly?:boolean;scenes:{scene:Scene;reference:BoundedSceneQuote["scenes"][number]["reference"]}[]}):BoundedSceneQuote{
 if(!o.scenes.length||o.scenes.length>6||!Number.isFinite(o.seconds)||o.seconds<=0||o.seconds>15)throw new HttpError(409,L("Découpage natif du clip invalide.","Invalid native clip timing."));
 if(!llmConfigured())throw new HttpError(409,L('Le contrôle vidéo obligatoire est indisponible.','Required video review is unavailable.'));
 const route=o.reviewOnly?null:sceneGenerationRoute(o.generation,o.seconds,o.aspect);if(route&&!route.allowed)throw new HttpError(409,route.reason);
 const clip=route?.allowed?{provider:route.provider,model:route.model,unitMicro:route.unitMicro,capMicro:mediaReservationMaxMicro(route.unitMicro)}:null;
 let capMicro=0,estimateMicro=0;
 const scenes=o.scenes.map(({scene,reference})=>{
  if(o.generation==='reference'&&!reference)throw new HttpError(409,L('Chaque scène avec référence nécessite sa photo exacte.','Each reference shot needs its exact photo.'));
  if(o.generation==='direct'&&reference)throw new HttpError(409,L('Une référence ne peut pas être ignorée en mode direct.','A reference cannot be ignored in direct mode.'));
  const prompt=directScenePrompt(p,scene,!!reference,o.request),maximumImages=3+(reference?1:0),images=Array.from({length:maximumImages},()=>({data:Buffer.alloc(1)}));
  const call=withSelectedStrategy(videoShotReviewRequest(p,{userId:p.userId,projectId:p.id,jobId:null,usageKey:'quote'},images,prompt)),review=routeLlm(call);
  if(review.mode!=='llm'||!activeProviderKey(review.provider as Parameters<typeof activeProviderKey>[0]))throw new HttpError(409,L('La route de contrôle visuel est indisponible.','The visual review route is unavailable.'));
  const tokens=strictTextQuoteInput({...call,images:undefined},BoundedShotReviewSchema),reviewMax=callCostBoundMicro(review.provider,review.model,tokens.maximumTokens+maximumImages*3400,1500,review.effort??null),reviewEstimate=estimateCallMicro(review.provider,review.model,tokens.typicalTokens+maximumImages*1600,600),clipMax=clip?.capMicro??0;
  if(!Number.isSafeInteger(clipMax)||(!o.reviewOnly&&clipMax<=0)||reviewMax==null||reviewMax<=0||reviewEstimate==null)throw new HttpError(409,L('Un tarif ou plafond vidéo manque. Aucun nouvel appel.','A video price or bound is missing. No new request.'));
  capMicro+=clipMax+reviewMax;estimateMicro+=(clip?.unitMicro??0)+reviewEstimate;
  return{prompt,reference,review:{prompt:call.prompt,envelope:{context:call.context,volatile:call.volatile,reference:call.reference},route:{provider:review.provider,model:review.model,...(review.effort?{effort:review.effort}:{})},maximumImages,capMicro:reviewMax}};
 });
 const value:Omit<BoundedSceneQuote,'fingerprint'>={schema:1,generation:o.generation,aspect:o.aspect,seconds:route?.allowed?route.seconds:o.seconds,bindingDigest:o.bindingDigest,capMicro,estimateMicro,maximumCalls:(o.reviewOnly?1:2)*scenes.length,clip,scenes,voice:null,policy:{automaticGenerationRetries:0,automaticRechecks:0,localContrastReencodes:1}};
 return{...value,fingerprint:digest(value)};
}

function boundedSceneQuoteInScope(root:Project,req:ThreeScenesRequest,raw:ScenePlan):BoundedSceneQuote{
 if(!req.binding||!['direct','reference'].includes(req.generation??'')||req.mode==='stock'||req.repair)throw new HttpError(409,L('Ce devis borné exige une offre native et le mode direct ou avec référence. Images intermédiaires et reprises doivent disposer de leur propre devis exact.','This bounded quote requires a native offer and direct or reference mode. Intermediate images and retakes need their own exact quote.'));
 const{project:p,subject,bindingDigest}=sceneSubjectContext(root,req),plan=approvedScenePlan(p,req,raw),aspect=req.aspect==='16:9'?'16:9':'9:16',timing=sceneTiming(plan.scenes.length,req.totalS??15);
 const q=quoteScenes(root,req,{imageMaxMicro:0,clipMaxMicro:()=>0,textMicro:0,videosRight:projectRights(root.id)?.videos??null,aiActive:aiActiveFor(root.userId,root.id)});
 if(!q.allowed)throw new HttpError(409,q.reason!);
 const shots=boundedDirectShots(p,{generation:req.generation as "direct"|"reference",aspect,seconds:timing.clipS,bindingDigest:bindingDigest!,request:req.request,scenes:plan.scenes.map((scene,k)=>{const selected=req.sceneImages?.[k];return{scene,reference:req.generation==='reference'?(selected?{assetId:selected.assetId,version:selected.version!,sha256:selected.sha256!}:req.binding!.references[0]??null):null};})});
 let{capMicro,estimateMicro,maximumCalls}=shots;
 const size=SIZES[req.aspect??'9:16'],memory=loadCreativeMemory(p.id,root),voiceId=projectVoice(memory.preferences),brief=buildCreativeBrief(p,{request:req.request,durationS:req.totalS??15,width:size.w,height:size.h,platform:req.aspect==='9:16'?'reels':'meta_feed',memory});
 let voice:BoundedSceneQuote['voice']=null;
 if(req.purpose!=='site'&&req.voice!=='none'&&memory.preferences.voice==='on'&&sceneVoiceLines(plan).some(Boolean)){
  if(!voiceId||!voiceAvailable(voiceId))throw new HttpError(409,L('La voix choisie est indisponible. Aucun média lancé.','The selected voice is unavailable. No media started.'));
  const lines=sceneVoiceLines(plan);
  if(lines.some(text=>countWords(text)>Math.floor((timing.showS-.3)*2.4)))throw new HttpError(409,L('La voix entière dépasse la place de la scène. Adaptez le scénario ou la durée avant les médias.','The whole voice phrase exceeds the shot space. Adjust the scenario or duration before media.'));
  const voiceCap=lines.filter(Boolean).reduce((n,text)=>n+(isOpenAIVoice(voiceId)?voiceQuote(text).capMicro:0),0);
  capMicro+=voiceCap;estimateMicro+=lines.filter(Boolean).reduce((n,text)=>n+(isOpenAIVoice(voiceId)?voiceQuote(text).estimateMicro:0),0);maximumCalls+=isOpenAIVoice(voiceId)?lines.filter(Boolean).length:0;
  voice={id:voiceId,speed:brief.voice.speed,lang:p.settings?.language==='en'?'en':'fr',lines,capMicro:voiceCap};
 }
 const value:Omit<BoundedSceneQuote,'fingerprint'>={schema:1,generation:shots.generation,aspect,seconds:shots.seconds,bindingDigest:bindingDigest!,capMicro,estimateMicro,maximumCalls,clip:shots.clip,scenes:shots.scenes,voice,policy:shots.policy};
 return{...value,fingerprint:digest(value)};
}
