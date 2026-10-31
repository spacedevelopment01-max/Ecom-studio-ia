import { describe,it,expect } from "vitest";
import fs from "node:fs";
import { createUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { loadProject } from "@/lib/projects";
import { seedImageFixture } from "./image-v2-fixtures";
import { rememberPreference,loadCreativeMemory } from "@/lib/video-v2/creative-memory";
import { measuredCues,projectVoice } from "@/lib/video-v2/voice";
import { addVoice,buildSceneDoc,localScenePlan,sceneTiming } from "@/lib/video-v2/three-scenes";
import { buildCreativeBrief } from "@/lib/video-v2/creative-brief";

describe("Voix : autorisation persistée et phrases entières, outil simulé",()=>{
 it("la voix de synthèse est un choix de projet ; aucun clone ni autorisation implicite",async()=>{
  const u=await createUser(`voice-choice-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture");
  const p=loadProject(seedImageFixture(u.id,"hightech"));
  expect(projectVoice(loadCreativeMemory(p.id).preferences)).toBeNull();
  rememberPreference(p.id,"voice","on");rememberPreference(p.id,"voiceId","ff_siwis");
  expect(projectVoice(loadCreativeMemory(p.id).preferences)).toBeNull();
  rememberPreference(p.id,"voiceConsent","synthetic");
  expect(projectVoice(loadCreativeMemory(p.id).preferences)).toBe("ff_siwis");
 });
 it("les sous-titres suivent la phrase mesurée, avec toute sa ponctuation",()=>{
  const text="Dépoussiérer la surface, puis laisser sécher. Préserver les finitions existantes.";
  const cues=measuredCues("scene",text,4.25,18);
  expect(cues.map(c=>c.text).join(" ")).toBe(text);
  expect(cues[0].fromS).toBe(.2);expect(cues.at(-1)!.toS).toBeCloseTo(4.45,8);
 });
 it("une phrase trop longue bloque le rendu au lieu d’être supprimée",async()=>{
  const u=await createUser(`voice-long-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture");
  const p=loadProject(seedImageFixture(u.id,"hightech"));
  const plan=localScenePlan(p,null,{as:"post",scenes:3});plan.scenes[0].voice="Phrase entière à préserver même lorsque sa durée est trop longue.";
  const brief=buildCreativeBrief(p,{durationS:15,width:1080,height:1920,platform:"reels"});
  const doc=buildSceneDoc(p,Array.from({length:3},(_,i)=>({assetId:`clip-${i}`,generated:true,durationS:5})),plan,"9:16","post",sceneTiming(3,15));
  const synth=async(_t:string,file:string)=>{fs.writeFileSync(file,Buffer.from("voix simulée"));return 7;};
  await expect(addVoice(p.id,p.userId,doc,plan,brief,"voice-test",[55,75],synth)).rejects.toThrow(/aucune phrase supprimée/);
  expect(plan.scenes[0].voice).toContain("Phrase entière");expect(doc.audio.voice).toEqual([]);
  expect(all("SELECT * FROM assets WHERE project_id=? AND role='voice'",p.id)).toHaveLength(0);
 });
});
it('la langue vocale est celle du projet, même lorsque l’interface est en français',async()=>{
 const u=await createUser(`voice-language-${crypto.randomUUID()}@test.invalid`,'motdepasse-test','Fixture'),pid=seedImageFixture(u.id,'hightech');
 const {run}=await import('@/lib/db');run("UPDATE projects SET settings_json=json_set(settings_json,'$.language','en') WHERE id=?",pid);
 const p=loadProject(pid),plan=localScenePlan(p,null,{as:'post',scenes:1,totalS:6});plan.scenes[0].voice='Keep this whole sentence.';plan.voiceEnd='';
 const brief=buildCreativeBrief(p,{durationS:6,width:1080,height:1920,platform:'reels'}),doc=buildSceneDoc(p,[{assetId:'fixture-clip',durationS:6,generated:true}],plan,'9:16','post',sceneTiming(1,6));
 const options:unknown[]=[];await addVoice(pid,u.id,doc,plan,brief,'language-fixture',[55,75],async(_text,file,o)=>{options.push(o);fs.writeFileSync(file,Buffer.from('audio simulé'));return 1;});
 expect(options).toEqual([expect.objectContaining({lang:'en',speed:brief.voice.speed,voice:brief.voice.kokoroVoice})]);
});
it('une modification pendant la voix arrête la phrase suivante et conserve l’audio acquis',async()=>{
 const u=await createUser(`voice-scope-${crypto.randomUUID()}@test.invalid`,'motdepasse-test','Fixture'),pid=seedImageFixture(u.id,'hightech'),p=loadProject(pid),plan=localScenePlan(p,null,{as:'post',scenes:2,totalS:10});plan.scenes.forEach(s=>s.voice='Phrase entière.');plan.voiceEnd='';const brief=buildCreativeBrief(p,{durationS:10,width:1080,height:1920,platform:'reels'}),doc=buildSceneDoc(p,[0,1].map(k=>({assetId:'clip-'+k,durationS:5,generated:true})),plan,'9:16','post',sceneTiming(2,10));let changed=false,sent=0;
 await expect(addVoice(pid,u.id,doc,plan,brief,'scope-fixture',[55,75],async(_text,file)=>{sent++;fs.writeFileSync(file,Buffer.from('audio acquis fictif'));changed=true;return 1;},()=>{if(changed)throw Error('Contexte vocal modifié.');})).rejects.toThrow('Contexte vocal modifié');expect(sent).toBe(1);expect(all('SELECT id FROM assets WHERE project_id=? AND role=\'voice\'',pid)).toHaveLength(1);expect(doc.audio.voice).toEqual([]);
});
