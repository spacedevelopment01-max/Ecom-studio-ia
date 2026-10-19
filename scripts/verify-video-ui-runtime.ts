/** Mock providers behind native queued jobs; isolated DATA_DIR only, real local audio/encodes. */
import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";import {execFileSync} from "node:child_process";import sharp from "sharp";
const dir=path.resolve(process.env.DATA_DIR??"");if(!path.basename(dir).startsWith("ecs-test-video-mission-")) throw Error("Dossier isolé requis");
globalThis.fetch=async()=>{throw Error("Fournisseur réseau interdit dans le harnais");};
const {setSetting,setJsonSetting}=await import("../src/lib/settings");
const {MEDIA_MODELS}=await import("../src/lib/ai/media-models");const {SCENE_VIDEO_MODEL,runSceneScenario,localScenePlan,runThreeScenes,realThreeScenesDeps}=await import("../src/lib/video-v2/three-scenes");
const {run,all,now}=await import("../src/lib/db");const {loadProject}=await import("../src/lib/projects");const {saveAsset}=await import("../src/lib/library");
const {JobContext,claimNext,markRunning,markFinished,renewLease,completeJob,failJob,JobPaused,JobCancelled,pauseJob,releaseJob}=await import("../src/lib/jobs");
const {withTrace}=await import("../src/lib/ai/trace");const {runForUser}=await import("../src/lib/ai/access");const {renderLatest}=await import("../src/lib/video-v2/engine");
const {runWithLang}=await import("../src/lib/i18n-server");
const image=MEDIA_MODELS.find(m=>m.provider==="alibaba"&&m.kind==="image"&&m.legacyDefault)!;
const route=`${image.provider}:${image.model}`;
setSetting("ai.prices.checkedAt",String(Date.now()));
for(const provider of ["anthropic","alibaba"]){setSetting(`provider.${provider}.apiKey`,`fixture-${crypto.randomUUID()}`,true);setSetting(`provider.${provider}.disabled`,null);}
setJsonSetting("ai.media.usage",{social_image:{primary:route},product_video:{primary:`alibaba:${SCENE_VIDEO_MODEL}`}});
setJsonSetting("ai.media.models",{[route]:{enabled:true,confirmedAt:Date.now()},[`alibaba:${SCENE_VIDEO_MODEL}`]:{enabled:true,confirmedAt:Date.now()}});
const {ui}=JSON.parse(fs.readFileSync(path.join(dir,"private-ui.json"),"utf8"));
const results:any[]=fs.existsSync(path.join(dir,"public","ui-worker-checks.json"))?JSON.parse(fs.readFileSync(path.join(dir,"public","ui-worker-checks.json"),"utf8")):[];let stop=false;process.on("SIGINT",()=>stop=true);process.on("SIGTERM",()=>stop=true);
console.log("Harnais prêt : fichiers et contrôles simulés, voix/encodage locaux réels, aucun réseau fournisseur.");
while(!stop){
 const job=claimNext(["video.scenario","video.scenes","video.v2.render"]);
 if(!job){await new Promise(r=>setTimeout(r,400));continue;}
 markRunning(job.id);const heartbeat=setInterval(()=>renewLease(job.id),20000);
 const payload=JSON.parse(job.payload),p=loadProject(job.project_id!),ctx=new JobContext(job),slug=ui.find((x:any)=>x.pid===p.id)?.slug??"fixture";
 const calls={images:0,clips:0,reviews:0,stock:0,renders:0},events:string[]=[];
 try {
  const result=await runWithLang({ui:"fr",content:"fr"},()=>runForUser(p.userId,()=>withTrace({jobId:job.id,projectId:p.id,costCapMicro:payload.costCapMicro??0},async()=>{
   if(job.type==="video.scenario") return runSceneScenario(ctx,p.id,payload.request,async(pp,subject,req)=>localScenePlan(pp,subject,req));
   if(job.type==="video.v2.render") return renderLatest(ctx,p.id,payload.docKey);
   const real=realThreeScenesDeps(ctx,{userId:p.userId,projectId:p.id},{aiText:false});
   const source=(seconds:number,k:number,aspect:string)=>{
    const f=path.join(dir,`source-ui-${job.id}-${k}.mp4`),size=aspect==="16:9"?"480x270":aspect==="4:5"?"270x338":aspect==="1:1"?"270x270":"270x480";
    execFileSync("ffmpeg",["-y","-v","error","-f","lavfi","-i",`testsrc2=size=${size}:rate=12`,"-vf",`hue=h=${k*65}`,"-t",String(seconds),"-c:v","libx264","-preset","ultrafast","-pix_fmt","yuv420p",f]);return fs.readFileSync(f);
   };
   return runThreeScenes(ctx,p.id,payload.request,{
    keyframe:async()=>{calls.images++;return sharp({create:{width:270,height:480,channels:3,background:"#255f4a"}}).png().toBuffer();},
    clip:async(_im,_prompt,aspect,seconds,key)=>{calls.clips++;return source(seconds,Number(key.split(":").at(-1)),aspect);},
    reviewMedia:async(_frames,_reference,_text,key)=>{
     calls.reviews++;
     if(slug==="produit-publicitaire"&&!payload.request.repair&&key.endsWith(":image:1")&&!all("SELECT key FROM memory WHERE project_id=? AND key='fixture.video.paused'",p.id).length){run("INSERT INTO memory(id,project_id,kind,key,value,status,source,scope,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",crypto.randomUUID(),p.id,"decision","fixture.video.paused","true","confirmed","user","video",now(),now());pauseJob(job.id);events.push("pause-after-image-2");}
     const rejected=slug==="produit-organique"&&!payload.request.repair&&key.endsWith(":image:1");
     return {score:rejected?2:9,sameProduct:!rejected,productAltered:rejected,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:rejected?["SIMULATION : couleur du produit non conforme à la référence"]:[]};
    },
    stock:async(_p,k,_topic,aspect,seconds)=>{calls.stock++;return {assetId:(await saveAsset({projectId:p.id,userId:p.userId,data:source(seconds+.1,k,aspect),name:`mire-service-${k}.mp4`,mime:"video/mp4",role:"clip",origin:"import",status:"review",meta:{simulation:true,durationS:seconds+.1,provenance:"Mire locale, pas un média Pixabay",gate:{verdict:"FINAL",checked:true,fatal:false,reason:"Contrôle simulé uniquement"}}})).id,durationS:seconds+.1};},
    visualCheck:true,spentMicro:()=>0,render:async(...args)=>{calls.renders++;return real.render(...args);},
   });
  }),"normal",p.id));
  completeJob(job.id,result);events.push("completed");
 }catch(error){
  if(error instanceof JobPaused){releaseJob(job.id);events.push("paused");}
  else if(error instanceof JobCancelled){releaseJob(job.id);events.push("cancelled");}
  else{failJob(job,error,{permanent:true});events.push(`failed:${(error as Error).message}`);}
 }finally{clearInterval(heartbeat);markFinished(job.id);results.push({jobId:job.id,projectId:p.id,slug,calls,events,providerSimulation:true});fs.writeFileSync(path.join(dir,"public","ui-worker-checks.json"),JSON.stringify(results,null,2));console.log(JSON.stringify({slug,calls,events}));}
}
