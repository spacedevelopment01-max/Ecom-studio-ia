/** Quote for the guided chain actually executed, not a generic social-poster package. */
import {voiceQuote,isOpenAIVoice} from "./openai-voice";
import {loadCreativeMemory} from "./creative-memory";
import {projectVoice} from "./voice";
import {sceneGenerationRoute} from "./scene-generation";
import { mediaReservationMaxMicro,aiPostMaxMicro,wanClipMaxMicro } from "../ai/media-providers";
import { estimateTaskMicro } from "../ai/estimate";
import { routeFor,usdToEur,FX_SAFETY } from "../ai/config";
import { projectRights } from "../plan-gates";
import { aiActiveFor } from "../ai/access";
import { llmConfigured } from "../ai/llm";
import { quoteScenes,sceneTiming,type ThreeScenesRequest } from "./three-scenes";
import {resolveSubject} from "../creative-subject";
import {productReferences} from "./creative-memory";
import type { Project } from "../projects";
export const GUIDED_VIDEO_POLICY={version:"guided-video-1",automaticGenerationRetries:0,maxTargetedSceneRetakes:1,automaticRechecks:0,localContrastReencodes:1} as const;
export function sceneChainQuote(p:Project,req:ThreeScenesRequest) {
 const n=req.scenes??3,timing=sceneTiming(n,req.totalS??15);
 const ai=aiActiveFor(p.userId,p.id),review=ai&&llmConfigured();
 const route=req.generation&&req.mode!=="stock"?sceneGenerationRoute(req.generation,timing.clipS,req.aspect==="16:9"?"16:9":"9:16"):null;
 const staged=!req.generation||req.generation==="staged";
 const imageCap=staged?aiPostMaxMicro(1,true):0;
 const common=quoteScenes(p,req,{imageMaxMicro:imageCap,clipMaxMicro:route?.allowed?()=>route.unitMicro:wanClipMaxMicro,textMicro:0,videosRight:projectRights(p.id)?.videos??null,aiActive:ai});
 const imageCount=common.mode==="ai"&&staged?n-(req.sceneImages??[]).slice(0,n).filter(s=>s?.use==="reuse").length:0;
 const image=common.mode==="ai"?imageCap??0:0;
 const clip=common.mode==="ai"?(route?.allowed?route.unitMicro:wanClipMaxMicro(timing.clipS)):0;
 const imageQc=review&&common.mode==="ai"&&staged?estimateTaskMicro("quality_control",{input:6000,output:1500}):0;
 const clipQc=review?estimateTaskMicro("quality_control",{input:9000,output:1500}):0;
 const scriptMicro=review&&!req.editorial&&req.purpose!=="site"?estimateTaskMicro("copywriting",{input:12000,output:4000}):0;
 const voiceId=projectVoice(loadCreativeMemory(p.id,p).preferences);
 const voiced=req.purpose!=="site"&&voiceId&&isOpenAIVoice(voiceId);
 const voiceLines=voiced?Array.from({length:n},(_,k)=>req.approval?.scenario?[req.approval.scenario.scenes[k]?.voice??"",k===n-1?req.approval.scenario.voiceEnd??"":""].filter(Boolean).join(" "):"x".repeat(k===n-1?361:200)).filter(t=>t.trim()):[];
 const voiceMicro=voiceLines.reduce((sum,text)=>sum+voiceQuote(text).estimateMicro,0);
 const voiceCapMicro=voiceLines.reduce((sum,text)=>sum+voiceQuote(text).capMicro,0);
 const steps=[
  {id:"scenario",count:1,unit:scriptMicro?"AI scenario, then client review before media":"supplied editorial contract or local scenario",unitMicro:scriptMicro,totalMicro:scriptMicro},
  {id:"reference_images",count:imageCount,unit:"one scene image, one supplied reference",unitMicro:image,totalMicro:imageCount*image},
  {id:"image_checks",count:common.mode==="ai"&&staged?n:0,unit:"one image visual review",unitMicro:imageQc,totalMicro:n*imageQc},
  {id:"clips",count:common.mode==="ai"?n:0,unit:`${route?.allowed?route.seconds:timing.clipS} generated seconds per clip`,unitMicro:clip,totalMicro:n*clip},
  {id:"clip_checks",count:n,unit:common.mode==="ai"?"three sampled frames":"selected stock passage",unitMicro:clipQc,totalMicro:n*clipQc},
  {id:"voice",count:voiceLines.length,unit:"OpenAI synthetic speech; input character estimate, no automatic retry",unitMicro:voiceLines.length?Math.ceil(voiceMicro/voiceLines.length):0,totalMicro:voiceMicro},
  {id:"music_encode_final_checks",count:1,unit:"local tools, CPU/storage not measured",unitMicro:0,totalMicro:0},
 ];
 const firstMicro=steps.reduce((sum,s)=>sum+s.totalMicro,0);
 const oneSceneRetakeMicro=image+imageQc+clip+clipQc;
 const maximumMicro=req.generation?mediaReservationMaxMicro(firstMicro-voiceMicro+oneSceneRetakeMicro)+voiceCapMicro:firstMicro-voiceMicro+oneSceneRetakeMicro+voiceCapMicro;
 const selected=resolveSubject(p,req.subject??null);
 const mainProduct=!selected||(selected.kind!=="service"&&(!selected.referenceAssetId||selected.key==="main"||selected.name===p.product.name));
 const hasReference=!!selected?.referenceAssetId||(mainProduct&&productReferences(p.id).length>0);
 const missingReference=req.generation==="reference"&&!hasReference&&Array.from({length:n},(_,k)=>req.sceneImages?.[k]).some(x=>!x);
 const missingContext=!p.brand?.name.trim()?"Validez le nom et l’identité de votre projet dans sa préparation.":!(p.business==="services"?p.services.services.some(s=>s.name.trim()):p.product.name.trim())?"Quel produit ou quelle prestation souhaitez-vous présenter ? Renseignez cette offre dans le projet.":null;
 const reason=(voiced&&projectRights(p.id)?.videos==="none"?"La voix IA nécessite un forfait incluant les vidéos IA ; les audios acquis restent conservés.":null)??missingContext??(missingReference?"Choisissez une photo autorisée pour chaque scène, ou le mode direct sans référence.":null)??common.reason??(route&&!route.allowed?route.reason:null)??(common.mode==="ai"&&!review?"Contrôle visuel indisponible : aucun clip IA ne sera lancé.":null);
 return {...common,generation:req.generation??"staged",initialImagesRequired:staged,allowed:!reason,reason,estimateMicro:reason?0:firstMicro,capMicro:reason?0:maximumMicro,firstMicro,scriptMicro,oneSceneRetakeMicro,maximumMicro,steps,policy:GUIDED_VIDEO_POLICY,generatedSeconds:common.mode==="ai"?n*(route?.allowed?route.seconds:timing.clipS):0,routes:{quality:routeFor("quality_control"),clip:route?.allowed?{provider:route.provider,model:route.model}:null},exchange:{eurPerUsd:usdToEur(),source:"configured rate; no live FX quote",safety:FX_SAFETY},hypotheses:["Token counts are planning allowances, not measured consumption.","Image unit uses the configured maximum reservation for one reference.","No paid final audiovisual review is executed by this chain.","No automatic paid regeneration; one explicit targeted retake at most."]};
}

export function v2ChainQuote(result:import("./types").VideoRunResult, p?:Project) {
 const voiceId=p?projectVoice(loadCreativeMemory(p.id,p).preferences):null;
 const voiceMicro=voiceId&&isOpenAIVoice(voiceId)?result.script.sections.filter(s=>s.voice.trim()).reduce((n,s)=>n+voiceQuote(s.voice).capMicro,0):0;
 const generated=result.shots.filter(s=>s.source.kind === "generate");
 const clipReviews=estimateTaskMicro("quality_control",{input:9000,output:1500});
 const finalReview=estimateTaskMicro("quality_control",{input:12000,output:2500});
 const images=result.intent.generation?0:generated.filter(s=>!s.source.assetId && !s.reference.assetId).length;
 const image=aiPostMaxMicro(1,true)??0;
 const shotsMicro=generated.reduce((n,s)=>n+(s.source.estimateMicro??0),0);
 const firstMicro=shotsMicro+generated.length*clipReviews+images*image+finalReview+voiceMicro;
 // Policies are read from the native V2 engine; these are bounds, never automatic debit.
 return {firstMicro,shotsMicro,clipReviews,finalReview,voiceMicro,conditionalStartImages:images,imageUnitMicro:image};
}
