/** Scenario approval is scoped to project context, references, request, voice and routing; no new engine. */
import {loadWordingRules} from "../client-wording";
import crypto from "node:crypto";
import {stateOf,inputHash} from "../preparation/store";
import {all,run,id,now,json} from "../db";
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
 const r=request as {purpose?:string;initialSlot?:string};const prep=r?.purpose==="site"?stateOf(p.id):null;const slot=prep?.stages.media?.data.slots.find(s=>s.key===r.initialSlot);
 const initialContext=prep?{upstream:inputHash(prep,"media"),placement:slot?{key:slot.key,page:slot.pageKey,section:slot.sectionKey,purpose:slot.purpose}:null}:undefined;
 return crypto.createHash("sha256").update(JSON.stringify({...initialContext?{initialContext}:{},...(request&&typeof request==="object"&&"generation" in request?{wording:loadWordingRules(p.id)}:{}),selectedRefs,request,project:p.id,business:p.business,product:p.product,services:p.services,brand:p.brand,strategy:p.strategy,settings:p.settings,refs,voice:loadCreativeMemory(p.id,p).preferences,routes:[routeFor("copywriting"),routeFor("quality_control"),usagePrimary("social_image"),usagePrimary("product_video"),...(request&&typeof request==="object"&&"generation" in request?[usagePrimary("text_video")]:[])]})).digest("hex");
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
 return {...(req.angleId?{angleId:req.angleId}:{}),...(req.generation?{generation:req.generation,...req.mode==="stock"?{requestedSource:"stock"}:{}}:{}),...(req.purpose?{purpose:req.purpose,initialSlot:req.initialSlot??null,initialExistingAssetId:req.initialExistingAssetId??null}:{}),sceneImages:req.sceneImages??null,as:req.as,subject:req.subject??null,request:req.request??null,aspect:req.aspect??"9:16",scenes:req.scenes??3,totalS:req.totalS??15,music:req.music!==false,editorial:req.editorial??null};
}

export const guidedRunKey=(p:Project,req:import("./three-scenes").ThreeScenesRequest)=>req.key??`scenes:${p.id}:${videoScope(p,sceneApprovalRequest(req)).slice(0,20)}${req.generation&&req.approval?`:${crypto.createHash("sha256").update(JSON.stringify(req.approval.scenario)).digest("hex").slice(0,16)}`:""}`;

/** Accords locaux et scénarios édités conservés sans écraser les versions précédentes. */
export function saveGuidedScenario(p:Project,request:import("./three-scenes").ThreeScenesRequest,scenario:import("./three-scenes").ScenePlan,scenarioJobId?:string){
 const scope=videoScope(p,sceneApprovalRequest(request));
 const value=JSON.stringify({scope,request,scenario,scenarioJobId});
 if(all<{value:string}>("SELECT value FROM memory WHERE project_id=? AND scope='video' AND key='video.scenario.saved' ORDER BY created_at DESC LIMIT 1",p.id)[0]?.value===value)return;
 run("INSERT INTO memory(id,project_id,kind,key,value,status,source,scope,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",id(),p.id,"decision","video.scenario.saved",value,"confirmed","user","video",now(),now());
}
export function savedGuidedScenarios(p:Project){
 return all<{id:string;value:string}>("SELECT id,value FROM memory WHERE project_id=? AND scope='video' AND key='video.scenario.saved' ORDER BY created_at DESC LIMIT 12",p.id).flatMap(row=>{const s=json<{scope:string;request:import("./three-scenes").ThreeScenesRequest;scenario:import("./three-scenes").ScenePlan;scenarioJobId?:string}>(row.value,{} as never);return s.request&&s.scope===videoScope(p,sceneApprovalRequest(s.request))?[{...s,savedId:row.id}]:[];});
}
