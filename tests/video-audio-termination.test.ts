/** Real short voices mixed over a longer musical bed. No AI, no naturalness claim. */
import {describe,it,expect,vi}from'vitest';import fs from'node:fs';import os from'node:os';import path from'node:path';import {execFileSync,execFile}from'node:child_process';import{promisify}from'node:util';
vi.mock('@/lib/exec-tool',()=>({TOOL_TIMEOUT_MS:10000,execTool:(cmd:string,args:string[],opts:object={})=>promisify(execFile)(cmd,args,{...opts,timeout:10000,killSignal:'SIGKILL',encoding:'utf8'})}));
describe('Mixage borné des voix courtes et musique longue',()=>{
 it.each([3,6])('termine six vrais mixages avec %s voix retardées, garde la durée et un signal non muet',async(count)=>{
  const {createUser}=await import('@/lib/auth');const {seedImageFixture}=await import('./image-v2-fixtures');const {loadProject}=await import('@/lib/projects');const {buildSceneDoc,localScenePlan}=await import('@/lib/video-v2/three-scenes');const {mixAudio,measureAudio}=await import('@/lib/video-v2/audio');
  const u=await createUser(`audio-${crypto.randomUUID()}@test.invalid`,'motdepasse-test','Fixture');const p=loadProject(seedImageFixture(u.id,'hightech'));const plan=localScenePlan(p,null,{as:'post'});const doc=buildSceneDoc(p,plan.scenes.map((_,k)=>({assetId:`clip${k}`,durationS:5,generated:false})),plan,'9:16','post');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'video-audio-termination-'));
  try{const voice=path.join(dir,'voice.wav'),music=path.join(dir,'music.wav');
   execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','sine=frequency=330:duration=0.6',voice]);
   execFileSync('ffmpeg',['-y','-v','error','-f','lavfi','-i','sine=frequency=220:duration=15',music]);
   doc.audio.voice=Array.from({length:count},(_,k)=>({id:`voice${k}`,clipId:doc.clips[k%doc.clips.length].id,assetId:`voice${k}`,text:'Phrase simulée.',offsetS:k>=doc.clips.length?2.65:.15,durationS:.6,gainDb:0}));doc.audio.music={source:'synth',mood:'warm',gainDb:-14};
   for(let k=0;k<6;k++){if(k%3===1)doc.audio.music={source:"library",assetId:"fixture-music",licence:"Fixture synthétique isolée",gainDb:-14,startS:3};else doc.audio.music={source:"synth",mood:"warm",gainDb:-14};const out=path.join(dir,`mix${k}.wav`);await mixAudio(doc,{voice:new Map(doc.audio.voice.map(v=>[v.id,voice])),sfx:new Map(),music},out);const m=await measureAudio(out);expect(Math.abs(m.durationS-15)).toBeLessThan(.05);expect(m.silent).toBe(false);expect(m.lufs).toBeGreaterThan(-18);expect(m.truePeakDb).toBeLessThan(-.5);expect(fs.readdirSync(dir).filter(f=>f.endsWith('.voices.wav')||f.endsWith('.music.wav')||f.endsWith('.duck.wav'))).toEqual([]);}
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 },45000);
});
