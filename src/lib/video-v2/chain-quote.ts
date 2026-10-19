/** Quote for the guided chain actually executed, not a generic social-poster package. */
import { aiPostMaxMicro,wanClipMaxMicro } from "../ai/media-providers";
import { estimateTaskMicro } from "../ai/estimate";
import { routeFor,usdToEur,FX_SAFETY } from "../ai/config";
import { projectRights } from "../plan-gates";
import { aiActiveFor } from "../ai/access";
import { llmConfigured } from "../ai/llm";
import { quoteScenes,sceneTiming,type ThreeScenesRequest } from "./three-scenes";
import type { Project } from "../projects";
export const GUIDED_VIDEO_POLICY={version:"guided-video-1",automaticGenerationRetries:0,maxTargetedSceneRetakes:1,automaticRechecks:0,localContrastReencodes:1} as const;
export function sceneChainQuote(p:Project,req:ThreeScenesRequest) {
 const n=req.scenes??3,timing=sceneTiming(n,req.totalS??15);
 const ai=aiActiveFor(p.userId,p.id),review=ai&&llmConfigured();
 const imageCap=aiPostMaxMicro(1,true);
 const common=quoteScenes(p,req,{imageMaxMicro:imageCap,clipMaxMicro:wanClipMaxMicro,textMicro:0,videosRight:projectRights(p.id)?.videos??null,aiActive:ai});
 const imageCount=common.mode==="ai"?n-(req.sceneImages??[]).slice(0,n).filter(s=>s?.use==="reuse").length:0;
 const image=common.mode==="ai"?imageCap??0:0;
 const clip=common.mode==="ai"?wanClipMaxMicro(timing.clipS):0;
 const imageQc=review&&common.mode==="ai"?estimateTaskMicro("quality_control",{input:6000,output:1500}):0;
 const clipQc=review?estimateTaskMicro("quality_control",{input:9000,output:1500}):0;
 const scriptMicro=review&&!req.editorial?estimateTaskMicro("copywriting",{input:12000,output:4000}):0;
 const steps=[
  {id:"scenario",count:1,unit:scriptMicro?"AI scenario, then client review before media":"supplied editorial contract or local scenario",unitMicro:scriptMicro,totalMicro:scriptMicro},
  {id:"reference_images",count:imageCount,unit:"one scene image, one supplied reference",unitMicro:image,totalMicro:imageCount*image},
  {id:"image_checks",count:common.mode==="ai"?n:0,unit:"one image visual review",unitMicro:imageQc,totalMicro:n*imageQc},
  {id:"clips",count:common.mode==="ai"?n:0,unit:`${timing.clipS} generated seconds per clip`,unitMicro:clip,totalMicro:n*clip},
  {id:"clip_checks",count:n,unit:common.mode==="ai"?"three sampled frames":"selected stock passage",unitMicro:clipQc,totalMicro:n*clipQc},
  {id:"voice_music_encode_final_checks",count:1,unit:"local tools, CPU/storage not measured",unitMicro:0,totalMicro:0},
 ];
 const firstMicro=steps.reduce((sum,s)=>sum+s.totalMicro,0);
 const oneSceneRetakeMicro=image+imageQc+clip+clipQc;
 const maximumMicro=firstMicro+oneSceneRetakeMicro;
 const reason=common.reason??(common.mode==="ai"&&!review?"Contrôle visuel indisponible : aucun clip IA ne sera lancé.":null);
 return {...common,allowed:!reason,reason,estimateMicro:reason?0:firstMicro,capMicro:reason?0:maximumMicro,firstMicro,scriptMicro,oneSceneRetakeMicro,maximumMicro,steps,policy:GUIDED_VIDEO_POLICY,generatedSeconds:common.mode==="ai"?n*timing.clipS:0,routes:{quality:routeFor("quality_control")},exchange:{eurPerUsd:usdToEur(),source:"configured rate; no live FX quote",safety:FX_SAFETY},hypotheses:["Token counts are planning allowances, not measured consumption.","Image unit uses the configured maximum reservation for one reference.","No paid final audiovisual review is executed by this chain.","No automatic paid regeneration; one explicit targeted retake at most."]};
}

export function v2ChainQuote(result:import("./types").VideoRunResult) {
 const generated=result.shots.filter(s=>s.source.kind === "generate");
 const clipReviews=estimateTaskMicro("quality_control",{input:9000,output:1500});
 const finalReview=estimateTaskMicro("quality_control",{input:12000,output:2500});
 const images=generated.filter(s=>!s.source.assetId && !s.reference.assetId).length;
 const image=aiPostMaxMicro(1,true)??0;
 const shotsMicro=generated.reduce((n,s)=>n+(s.source.estimateMicro??0),0);
 const firstMicro=shotsMicro+generated.length*clipReviews+images*image+finalReview;
 // Policies are read from the native V2 engine; these are bounds, never automatic debit.
 return {firstMicro,shotsMicro,clipReviews,finalReview,conditionalStartImages:images,imageUnitMicro:image};
}
