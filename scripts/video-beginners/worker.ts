/** Only used by the offline browser harness; real local assembly, injected supplier responses. */
import crypto from 'node:crypto';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {runThreeScenes,runSceneScenario,localScenePlan,realThreeScenesDeps} from '../../src/lib/video-v2/three-scenes';
import {loadProject} from '../../src/lib/projects';import {renderLatest} from '../../src/lib/video-v2/engine';
import type{JobContext}from'../../src/lib/jobs';
export async function runBeginnerVideoJob(ctx:JobContext,dir:string){
 if(process.env.VIDEO_BEGINNER_PROOF!=='1'||!path.basename(dir).startsWith('ecs-parcours-test-'))throw Error('Test isolé obligatoire');
 const p=loadProject(ctx.job.project_id!);const req=ctx.payload.request;const calls={clips:0,images:0,stock:0,reviews:0};
 const out=path.join(dir,'video-proof');fs.mkdirSync(out,{recursive:true});
 try{
  if(ctx.job.type==='video.scenario')return runSceneScenario(ctx,p.id,req,async(pp,s,r)=>{const plan=localScenePlan(pp,s,r);plan.scenes.forEach((sc,k)=>{sc.title=`TEST ${k+1}`;sc.voice=k===0?'Une illustration à vérifier.':'';});plan.line='';plan.voiceEnd='';return plan;});
  if(ctx.job.type==='video.v2.render')return renderLatest(ctx,p.id,ctx.payload.docKey);
  const real=realThreeScenesDeps(ctx,{userId:p.userId,projectId:p.id},{aiText:false});
  return await runThreeScenes(ctx,p.id,req,{...real,keyframe:async()=>{calls.images++;throw Error('Image intermédiaire interdite dans cette recette directe');},clip:async()=>{throw Error('Ancien chemin image imposée interdit');},stock:async()=>{calls.stock++;throw Error('Stock interdit');},
   directClip:async(ref,prompt,aspect,seconds,key,generation)=>{calls.clips++;const file=path.join(dir,`video-shot-${ctx.job.id}-${calls.clips}.mp4`);execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i',`testsrc2=size=${aspect==='16:9'?'480x270':'270x480'}:rate=12`,'-vf',`hue=h=${(calls.clips*65+parseInt(crypto.createHash("sha256").update(key).digest("hex").slice(0,4),16))%360}`,'-t',String(seconds),'-threads','1','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',file]);fs.appendFileSync(path.join(out,'clip-receipts.jsonl'),JSON.stringify({simulation:true,job:ctx.job.id,project:p.id,generation,reference:!!ref,seconds,aspect,prompt,usageKey:key})+'\n');return fs.readFileSync(file);},
   reviewMedia:async()=>{calls.reviews++;return {score:9,sameProduct:true,productAltered:false,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:[]};},spentMicro:()=>0});
 }finally{fs.appendFileSync(path.join(out,'jobs.jsonl'),JSON.stringify({job:ctx.job.id,type:ctx.job.type,business:p.business,calls,simulation:true,realSupplierCalls:0})+'\n');}
}
