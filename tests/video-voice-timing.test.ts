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
