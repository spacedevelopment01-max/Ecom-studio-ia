/** Quote for the guided chain actually executed, not a generic social-poster package. */
import {voiceQuote,isOpenAIVoice} from "./openai-voice";
import {loadCreativeMemory} from "./creative-memory";
import {projectVoice} from "./voice";
import {sceneGenerationRoute,noAnimatedModel} from "./scene-generation";
import { mediaReservationMaxMicro,aiPostMaxMicro,wanClipMaxMicro } from "../ai/media-providers";
import { estimateTaskMicro,strongReviewMicro,aiPostImageProbableMicro } from "../ai/estimate";
import { routeFor,usdToEur,FX_SAFETY } from "../ai/config";
import { L } from "../i18n-server";
import { projectRights } from "../plan-gates";
import { aiActiveFor } from "../ai/access";
import { llmConfigured } from "../ai/llm";
import { quoteScenes,sceneTiming,sceneMode,safeShotSource,planSurPhrase,type ThreeScenesRequest } from "./three-scenes";
import { VIDEO_REVIEW_UNITS,VIDEO_REVIEW_MODEL } from "./shot-review-request";
import {sceneSubjectContext} from "./subject-binding";
import {productReferences} from "./creative-memory";
import type { Project } from "../projects";
export const GUIDED_VIDEO_POLICY={version:"guided-video-1",automaticGenerationRetries:0,maxTargetedSceneRetakes:1,automaticRechecks:0,localContrastReencodes:1} as const;
export function sceneChainQuote(p:Project,req:ThreeScenesRequest) {
 const n=req.scenes??3,timing=sceneTiming(n,req.totalS??15);
 const ai=aiActiveFor(p.userId,p.id),review=ai&&llmConfigured();
 const route=req.generation&&req.mode!=="stock"?sceneGenerationRoute(req.generation,timing.clipS,req.aspect==="16:9"?"16:9":"9:16"):null;
 const staged=!req.generation||req.generation==="staged";
 // Plan sûr (23 novembre 2026) : vidéo « image fixe puis mouvement » sans modèle vidéo utilisable (clé de Vertex
 // absente) : le vrai produit détouré, la caméra au montage ; aucune image ni aucun plan de l'IA comptés.
 const safePlan=req.generation==="staged"&&!!route&&noAnimatedModel(route)&&sceneMode(p,sceneSubjectContext(p,req).subject,req)==="ai";
 const imageCap=safePlan?0:staged?aiPostMaxMicro(1,true):0;
 const common=quoteScenes(p,req,{imageMaxMicro:imageCap,clipMaxMicro:safePlan?()=>0:route?.allowed?()=>route.unitMicro:wanClipMaxMicro,textMicro:0,videosRight:projectRights(p.id)?.videos??null,aiActive:ai});
 const animated=common.mode==="ai"&&!safePlan;
 const imageCount=animated&&staged?n-(req.sceneImages??[]).slice(0,n).filter(s=>s?.use==="reuse").length:0;
 // Image de départ : prix PROBABLE dans le prix (estimation au jeton, comme les publications) ; la borne haute de sa
 // réservation n'entre que dans « au plus ».
 const imageProbable=animated&&staged&&imageCap!=null?aiPostImageProbableMicro():0;
 const image=animated?imageCap??0:0;
 const clip=animated?(route?.allowed?route.unitMicro:wanClipMaxMicro(timing.clipS)):0;
 // Relectures : le modèle le plus fort, au niveau élevé, une image (ou un plan) à la fois (VIDEO_REVIEW_MODEL).
 const imageQc=review&&animated&&staged?strongReviewMicro(VIDEO_REVIEW_UNITS.image):0;
 const clipQc=review&&!safePlan?strongReviewMicro(VIDEO_REVIEW_UNITS.clip):0;
 const scriptMicro=review&&!req.editorial&&req.purpose!=="site"?estimateTaskMicro("copywriting",{input:12000,output:4000}):0;
 const voiceId=projectVoice(loadCreativeMemory(p.id,p).preferences);
 const voiced=req.purpose!=="site"&&req.voice!=="none"&&voiceId&&isOpenAIVoice(voiceId);
 const voiceLines=voiced?Array.from({length:n},(_,k)=>req.approval?.scenario?[req.approval.scenario.scenes[k]?.voice??"",k===n-1?req.approval.scenario.voiceEnd??"":""].filter(Boolean).join(" "):"x".repeat(k===n-1?361:200)).filter(t=>t.trim()):[];
 const voiceMicro=voiceLines.reduce((sum,text)=>sum+voiceQuote(text).estimateMicro,0);
 const voiceCapMicro=voiceLines.reduce((sum,text)=>sum+voiceQuote(text).capMicro,0);
 const steps=[
  {id:"scenario",count:1,unit:scriptMicro?"AI scenario, then client review before media":"supplied editorial contract or local scenario",unitMicro:scriptMicro,totalMicro:scriptMicro},
  {id:"reference_images",count:imageCount,unit:"one scene image, one supplied reference (likely token price)",unitMicro:imageProbable,totalMicro:imageCount*imageProbable},
  {id:"image_checks",count:animated&&staged?n:0,unit:"one image visual review, strongest model, high effort",unitMicro:imageQc,totalMicro:(animated&&staged?n:0)*imageQc},
  {id:"clips",count:animated?n:0,unit:safePlan?"safe shot: real cut-out product, camera move at edit, no AI":`${route?.allowed?route.seconds:timing.clipS} generated seconds per clip`,unitMicro:clip,totalMicro:(animated?n:0)*clip},
  {id:"clip_checks",count:safePlan?0:n,unit:common.mode==="ai"?"three sampled frames, strongest model, high effort":"selected stock passage",unitMicro:clipQc,totalMicro:(safePlan?0:n)*clipQc},
  {id:"voice",count:voiceLines.length,unit:"OpenAI synthetic speech; input character estimate, no automatic retry",unitMicro:voiceLines.length?Math.ceil(voiceMicro/voiceLines.length):0,totalMicro:voiceMicro},
  {id:"music_encode_final_checks",count:1,unit:"local tools, CPU/storage not measured",unitMicro:0,totalMicro:0},
 ];
 const firstMicro=steps.reduce((sum,s)=>sum+s.totalMicro,0);
 const oneSceneRetakeMicro=image+imageQc+clip+clipQc;
 // Borne haute : les images de départ à leur réservation (au lieu du prix probable), plus une scène refaite.
 const boundMicro=firstMicro-voiceMicro-imageCount*imageProbable+imageCount*image+oneSceneRetakeMicro;
 const maximumMicro=req.generation?mediaReservationMaxMicro(boundMicro)+voiceCapMicro:boundMicro+voiceCapMicro;
 const {subject:selected,project:subjectProject}=sceneSubjectContext(p,req);
 const mainProduct=!selected||(selected.kind!=="service"&&(!selected.referenceAssetId||selected.key==="main"||selected.name===p.product.name));
 const hasReference=!!selected?.referenceAssetId||(!req.binding&&mainProduct&&productReferences(p.id).length>0);
 const missingReference=req.generation==="reference"&&!hasReference&&Array.from({length:n},(_,k)=>req.sceneImages?.[k]).some(x=>!x);
 const missingContext=!p.brand?.name.trim()?"Valide d’abord le nom et l’identité de ton projet.":!(subjectProject.business==="services"?subjectProject.services.services.some(s=>s.name.trim()):subjectProject.product.name.trim())?"Quel produit ou quelle prestation veux-tu montrer ? Ajoute-le dans ton projet.":null;
 const safeSource=safePlan?safeShotSource(p,selected??null):null;
 const reason=(voiced&&projectRights(p.id)?.videos==="none"?"La voix créée par l’IA demande un forfait avec des vidéos ; tes voix déjà faites restent gardées.":null)??missingContext??(missingReference?"Choisis une de tes photos pour chaque scène, ou laisse l’IA filmer directement.":null)??common.reason??(safePlan&&!safeSource?L("Ajoute d'abord une photo de ce produit : la vidéo part de ton vrai produit, l'IA ne l'invente pas.","Add a photo of this product first: the video starts from your real product, the AI never invents it."):null)??(route&&!route.allowed&&!safePlan?route.reason:null)??(animated&&!review?"Le contrôle des images n’est pas disponible : aucun plan ne sera filmé.":null);
 return {...common,generation:req.generation??"staged",initialImagesRequired:staged&&!safePlan,safePlan,planSur:safePlan?planSurPhrase():null,allowed:!reason,reason,estimateMicro:reason?0:firstMicro,capMicro:reason?0:maximumMicro,firstMicro,scriptMicro,oneSceneRetakeMicro,maximumMicro,steps,policy:GUIDED_VIDEO_POLICY,generatedSeconds:animated?n*(route?.allowed?route.seconds:timing.clipS):0,routes:{quality:routeFor("quality_control"),review:VIDEO_REVIEW_MODEL,clip:route?.allowed?{provider:route.provider,model:route.model}:null},exchange:{eurPerUsd:usdToEur(),source:"configured rate; no live FX quote",safety:FX_SAFETY},hypotheses:["Token counts are planning allowances, not measured consumption.","Image unit: likely token price in the estimate; the maximum reservation for one reference only in the cap.","No paid final audiovisual review is executed by this chain.","No automatic paid regeneration; one explicit targeted retake at most."]};
}

export function v2ChainQuote(result:import("./types").VideoRunResult, p?:Project) {
 const voiceId=p?projectVoice(loadCreativeMemory(p.id,p).preferences):null;
 const voiceMicro=voiceId&&isOpenAIVoice(voiceId)?result.script.sections.filter(s=>s.voice.trim()).reduce((n,s)=>n+voiceQuote(s.voice).capMicro,0):0;
 const generated=result.shots.filter(s=>s.source.kind === "generate");
 // Plans relus par le modèle le plus fort, au niveau élevé (VIDEO_REVIEW_MODEL), comme dans la vidéo guidée.
 const clipReviews=strongReviewMicro(VIDEO_REVIEW_UNITS.clip);
 const finalReview=estimateTaskMicro("quality_control",{input:12000,output:2500});
 const images=result.intent.generation?0:generated.filter(s=>!s.source.assetId && !s.reference.assetId).length;
 // Images de départ : prix probable (la borne haute de la réservation reste `imageCapMicro`).
 const imageCap=aiPostMaxMicro(1,true);
 const image=imageCap==null?0:aiPostImageProbableMicro();
 const shotsMicro=generated.reduce((n,s)=>n+(s.source.estimateMicro??0),0);
 const firstMicro=shotsMicro+generated.length*clipReviews+images*image+finalReview+voiceMicro;
 // Policies are read from the native V2 engine; these are bounds, never automatic debit.
 return {firstMicro,shotsMicro,clipReviews,finalReview,voiceMicro,conditionalStartImages:images,imageUnitMicro:image,imageCapMicro:imageCap??0};
}
