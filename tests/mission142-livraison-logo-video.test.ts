import {videoByteFixture} from "./video-byte-fixture";
/** Contrats de livraison des handlers natifs ; moteurs simulés, vrais fichiers locaux et base isolée. */
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import {tmpDir,storagePath} from "@/lib/storage";
import {execTool} from "@/lib/exec-tool";
const output=vi.hoisted(()=>({video:null as string|null,logo:null as string|null,docKey:null as string|null}));
vi.mock("@/lib/video-v2/engine",async orig=>({...await orig<any>(),runVideoEngineV2:async()=>({docKey:output.docKey,videoAssetId:output.video,verdict:"PROVISIONAL",codes:[],notes:[],stats:{},stoppedByCostCap:false}),renderLatest:async()=>({videoAssetId:output.video,verdict:"PROVISIONAL",issues:[]})}));
vi.mock("@/lib/logo-v2/engine",async orig=>({...await orig<any>(),runLogoEngineV2:async()=>({shown:output.logo?[{assetId:output.logo}]:[],discarded:[],studio:[],territories:[],notes:["Fixture de livraison uniquement"],best:null,stoppedByCostCap:false}),redrawArtwork:async()=>({assetId:output.logo,verdict:output.logo?"FINAL":null,notes:["Fixture de livraison uniquement"]})}));
import {createUser} from "@/lib/auth";
import {seedImageFixture} from "./image-v2-fixtures";
import {claimNext,completeJob,enqueue,failJob,getJob,JobContext,markFinished} from "@/lib/jobs";
import {saveAsset,getAsset} from "@/lib/library";
import {handlers} from "../worker/handlers";
import {grantProjectPlan} from './communication-choice-fixture';
import {jobStrategy} from '@/lib/strategy-consumption';
beforeEach(()=>{output.video=null;output.logo=null;output.docKey=null;vi.stubGlobal("fetch",async()=>{throw Error("Réseau fournisseur interdit");});});afterEach(()=>vi.unstubAllGlobals());
async function fixture(){const u=await createUser(`contract-${crypto.randomUUID()}@example.invalid`,"motdepasse-test","Fictif");const pid=seedImageFixture(u.id,"restaurant");grantProjectPlan(pid,'dominer');return{u,pid};}
async function execute(type:string,pid:string,uid:string,payload:Record<string,unknown>={}){
 const isolated=`test142.contract:${crypto.randomUUID()}`;const j=enqueue({userId:uid,projectId:pid,type:isolated,payload:{projectId:pid,...payload}});const claimed=claimNext([isolated])!;
 // Isolated queue type, native action's execution snapshot; exercise delivery rather than a false stale-choice rejection.
 const selected=jobStrategy(pid,type,{projectId:pid,...payload});
 const ctx=new JobContext({...claimed,payload:JSON.stringify({...JSON.parse(claimed.payload),strategyVersion:selected?.id??null})});
 try{completeJob(j.id,await handlers[type](ctx));}catch(e){failJob(getJob(j.id)!,e,{permanent:true});}finally{markFinished(j.id);}return getJob(j.id)!;
}
it.each(["video.v2","video.v2.render"])("%s : une référence vidéo vide ne devient pas une livraison réussie",async type=>{
 const{u,pid}=await fixture();const j=await execute(type,pid,u.id,{request:{render:true},docKey:"document-fictif"});expect(j.status).toBe("failed");expect(j.error).toBeTruthy();
});
it.each(["missing","foreign","corrupt"])("vidéo %s : fichier absent, illisible ou étranger refusé",async mode=>{
 const{u,pid}=await fixture();output.video=mode==="missing"?"missing-video-contract":(await saveAsset({projectId:mode==="foreign"?seedImageFixture(u.id,"hightech"):pid,userId:u.id,data:videoByteFixture(),name:"invalid-test.mp4",mime:"video/mp4",role:"video",origin:"generated",status:"review"})).id;
 if(mode==="corrupt"){const fs=await import("node:fs");const {storagePath}=await import("@/lib/storage");fs.writeFileSync(storagePath(getAsset(output.video)!.storage_key),"corrupted historical fixture");}
 expect((await execute("video.v2",pid,u.id,{request:{render:true}})).status).toBe("failed");
});
it("workflow direct : aucun fichier vidéo ne devient une étape terminée",async()=>{
 const{u,pid}=await fixture();const{STEP_EXECUTORS}=await import("@/lib/orchestrator/execute");const{loadProject}=await import("@/lib/projects");const type=`test142.workflow-video:${crypto.randomUUID()}`;const j=enqueue({userId:u.id,projectId:pid,type,payload:{projectId:pid}});const ctx=new JobContext(claimNext([type])!);
 try{await expect(STEP_EXECUTORS.video!(ctx,loadProject(pid),{id:"video-test",input:{text:"Test isolé",allowPaid:false}} as any,{} as any)).rejects.toThrow(/vidéo|video/);}finally{markFinished(j.id);}
});
it("création initiale : deux retours locaux vides ne sont pas deux vidéos livrées",async()=>{
 const{pid}=await fixture();const{creationSceneVideos}=await import("@/lib/video-v2/creation-videos");const local=vi.fn(async()=>null);
 await expect(creationSceneVideos(null,pid,"local",{local,scenes:{} as any,quote:()=>({allowed:true}) as any,spentByJob:()=>0})).rejects.toThrow(/vidéo|video/);expect(local).toHaveBeenCalledTimes(1);
});
it("workflow direct et création initiale : vidéos lisibles, reprise partielle sans refaire la première",async()=>{
 const{u,pid}=await fixture();const {grantProjectPlan}=await import("./communication-choice-fixture");grantProjectPlan(pid,"dominer");const dir=tmpDir("test142-video-directe"),file=path.join(dir,"test.mp4");
 try{
  await execTool("ffmpeg",["-y","-f","lavfi","-i","color=c=0x244d43:s=64x64:d=0.4","-an","-c:v","libx264","-pix_fmt","yuv420p",file]);
  const a=await saveAsset({projectId:pid,userId:u.id,data:fs.readFileSync(file),name:"video-directe-test.mp4",mime:"video/mp4",role:"video",origin:"generated",status:"review"});output.video=a.id;
  const{STEP_EXECUTORS}=await import("@/lib/orchestrator/execute");const{loadProject}=await import("@/lib/projects");const{creationSceneVideos}=await import("@/lib/video-v2/creation-videos");
  const type=`test142.video-directe:${crypto.randomUUID()}`;const j=enqueue({userId:u.id,projectId:pid,type,payload:{projectId:pid}}),ctx=new JobContext(claimNext([type])!);
  try{
   const result=await STEP_EXECUTORS.video!(ctx,loadProject(pid),{id:"video-test",input:{text:"Test isolé",allowPaid:false}} as any,{} as any);expect(result.note).toMatch(/vérifier|review/);
   const local=vi.fn(async(k:number)=>k===0?a.id:null),deps={local,scenes:{} as any,quote:()=>({allowed:true}) as any,spentByJob:()=>0};
   await expect(creationSceneVideos(ctx,pid,"local",deps)).rejects.toThrow(/vidéo|video/);expect(local).toHaveBeenCalledTimes(2);
   await expect(creationSceneVideos(ctx,pid,"local",deps)).rejects.toThrow(/vidéo|video/);expect(local).toHaveBeenCalledTimes(2);expect(getAsset(a.id)!.status).toBe("review");expect(fs.existsSync(storagePath(getAsset(a.id)!.storage_key))).toBe(true);
  }finally{markFinished(j.id);}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
it("logo redessiné absent : échec explicite et original conservé",async()=>{
 const{u,pid}=await fixture();const original=await saveAsset({projectId:pid,userId:u.id,data:await sharp({create:{width:32,height:32,channels:3,background:"#243f32"}}).png().toBuffer(),name:"original-test.png",mime:"image/png",role:"logo-v2",origin:"generated",status:"approved"});
 const j=await execute("brand.logo.v2.redraw",pid,u.id,{assetId:original.id});expect(j.status).toBe("failed");expect(getAsset(original.id)!.status).toBe("approved");
});
it("aucun logo ni série : ne pas afficher une création terminée",async()=>{
 const{u,pid}=await fixture();expect((await execute("brand.logo.v2",pid,u.id)).status).toBe("failed");
});
it("ancienne tâche brand.logo : aucune nouvelle proposition ne devient un succès vide",async()=>{
 const{u,pid}=await fixture();expect((await execute("brand.logo",pid,u.id,{regenerate:true})).status).toBe("failed");
});
it("ancienne tâche brand.logo : proposition accessible, logo fourni préservé et choix encore requis",async()=>{
 const{u,pid}=await fixture();const{loadProject,saveBrand}=await import("@/lib/projects");
 const data=await sharp({create:{width:32,height:32,channels:3,background:"#243f32"}}).png().toBuffer();
 const old=await saveAsset({projectId:pid,userId:u.id,data,name:"logo-fourni-test.png",mime:"image/png",role:"logo",origin:"upload",status:"approved"});
 const brand=loadProject(pid).brand!;saveBrand(pid,{...brand,validated:[...brand.validated??[],"logo"],logo:{...brand.logo,assetId:old.id,status:"provided",proposalId:old.id}});
 const proposal=await saveAsset({projectId:pid,userId:u.id,data,name:"nouvelle-proposition-test.png",mime:"image/png",role:"logo-v2",origin:"generated",status:"review",meta:{gate:{verdict:"FINAL"}}});output.logo=proposal.id;
 const j=await execute("brand.logo",pid,u.id,{regenerate:true});expect(j.status).toBe("done");expect(JSON.parse(j.result!).delivery.assetIds).toContain(proposal.id);expect(loadProject(pid).brand!.logo.assetId).toBe(old.id);expect(getAsset(proposal.id)!.status).toBe("review");
});
it("une vidéo réellement encodée reste livrée à vérifier, sans promotion du verdict",async()=>{
 const{u,pid}=await fixture(),dir=tmpDir("test142-video-livrable"),file=path.join(dir,"test.mp4");
 try{
  await execTool("ffmpeg",["-y","-f","lavfi","-i","color=c=0x244d43:s=64x64:d=0.4","-an","-c:v","libx264","-pix_fmt","yuv420p",file]);
  const a=await saveAsset({projectId:pid,userId:u.id,data:fs.readFileSync(file),name:"video-test.mp4",mime:"video/mp4",role:"video",origin:"generated",status:"review"});output.video=a.id;
  const j=await execute("video.v2",pid,u.id,{request:{render:true}});expect(j.status).toBe("done");expect(JSON.parse(j.result!).delivery.state).toBe("review");expect(getAsset(a.id)!.status).toBe("review");
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
it.each(["brand.logo.v2","brand.logo.v2.redraw"])("%s : un vrai logo enregistré reste accessible à choisir",async type=>{
 const{u,pid}=await fixture();const a=await saveAsset({projectId:pid,userId:u.id,data:await sharp({create:{width:32,height:32,channels:3,background:"#243f32"}}).png().toBuffer(),name:"logo-test.png",mime:"image/png",role:"logo-v2",origin:"generated",status:"review",meta:{gate:{verdict:"FINAL"}}});output.logo=a.id;
 const j=await execute(type,pid,u.id,{assetId:a.id});expect(j.status).toBe("done");expect(JSON.parse(j.result!).delivery.assetIds).toContain(a.id);expect(getAsset(a.id)!.status).toBe("review");
});
it("document seul : succès seulement s'il est réellement enregistré, sans prétendre livrer un film",async()=>{
 const{u,pid}=await fixture();const{loadProject}=await import("@/lib/projects");const{buildSceneDoc,localScenePlan}=await import("@/lib/video-v2/three-scenes");const{saveVideoVersion}=await import("@/lib/video-v2/store");const p=loadProject(pid);
 const doc=buildSceneDoc(p,[0,1,2].map(i=>({assetId:`document-only-${i}`,durationS:5,generated:false})),localScenePlan(p,null,{as:"ad"}),"9:16","ad");output.docKey="vid:test142-document";saveVideoVersion(pid,output.docKey,doc);
 const j=await execute("video.v2",pid,u.id,{request:{render:false}});expect(j.status).toBe("done");expect(JSON.parse(j.result!).delivery.state).toBe("document");expect(JSON.parse(j.result!).videoAssetId).toBeNull();
 output.docKey="vid:missing-document";expect((await execute("video.v2",pid,u.id,{request:{render:false}})).status).toBe("failed");
});
