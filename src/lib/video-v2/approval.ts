/** Scenario approval is scoped to project context, references, request, voice and routing; no new engine. */
import crypto from "node:crypto";
import { derivedKey } from "../secrets";
import { loadCreativeMemory,productReferences } from "./creative-memory";
import { assetData,getAsset } from "../library";
import { routeFor } from "../ai/config";
import { usagePrimary } from "../ai/media-routing";
import type { Project } from "../projects";
import { UserFacingError } from "../jobs";
export function videoScope(p:Project,request:unknown) {
 const refs=productReferences(p.id).map(r=>{const a=getAsset(r.assetId);return {id:r.assetId,sha256:a?crypto.createHash("sha256").update(assetData(a)).digest("hex"):null};});
 const selectedRefs=(request&&typeof request==="object"&&"sceneImages" in request&&Array.isArray(request.sceneImages)?request.sceneImages:[]).map((ref:{assetId?:string}|null)=>{const a=ref?.assetId?getAsset(ref.assetId):null;return a?{id:a.id,sha256:crypto.createHash("sha256").update(assetData(a)).digest("hex")}:null;});
 return crypto.createHash("sha256").update(JSON.stringify({selectedRefs,request,project:p.id,business:p.business,product:p.product,services:p.services,brand:p.brand,strategy:p.strategy,settings:p.settings,refs,voice:loadCreativeMemory(p.id,p).preferences,routes:[routeFor("copywriting"),routeFor("quality_control"),usagePrimary("social_image"),usagePrimary("product_video")]})).digest("hex");
}
export type VideoApproval<T=unknown>={projectId:string;scope:string;scenario:T;capMicro:number;quoteTotalMicro?:number;retakeMicro?:number;scenarioJobId?:string;expires:number};
const signature=(payload:string)=>crypto.createHmac("sha256",derivedKey("video-scenario")).update(payload).digest("base64url");
export function approveVideoScenario<T>(p:Project,request:unknown,scenario:T,capMicro:number,extra?:{quoteTotalMicro?:number;retakeMicro?:number;scenarioJobId?:string}) {
 const approval:VideoApproval<T>={projectId:p.id,scope:videoScope(p,request),scenario,capMicro,...extra,expires:Date.now()+24*3600_000};
 const payload=Buffer.from(JSON.stringify(approval)).toString("base64url");
 return {approval,token:`${payload}.${signature(payload)}`};
}
export function readVideoApproval<T>(p:Project,request:unknown,token:string|undefined):VideoApproval<T> {
 try {
  const [payload,sig]=token?.split(".")??[];
  if(!payload||!sig) throw Error();
  const expected=Buffer.from(signature(payload)),given=Buffer.from(sig);
  if(expected.length!==given.length || !crypto.timingSafeEqual(expected,given)) throw Error();
  const a=JSON.parse(Buffer.from(payload,"base64url").toString()) as VideoApproval<T>;
  if(a.projectId!==p.id || a.expires<Date.now() || a.scope!==videoScope(p,request)) throw Error();
  return a;
 } catch {throw new UserFacingError("Scénario à vérifier : demande, contexte, références, voix ou routes modifiés, ou accord expiré. Préparez le scénario avant de lancer.");}
}

export function sceneApprovalRequest(req:import("./three-scenes").ThreeScenesRequest) {
 return {sceneImages:req.sceneImages??null,as:req.as,subject:req.subject??null,request:req.request??null,aspect:req.aspect??"9:16",scenes:req.scenes??3,totalS:req.totalS??15,music:req.music!==false,editorial:req.editorial??null};
}

export const guidedRunKey=(p:Project,req:import("./three-scenes").ThreeScenesRequest)=>req.key??`scenes:${p.id}:${videoScope(p,sceneApprovalRequest(req)).slice(0,20)}`;
