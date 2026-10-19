import {describe,it,expect,vi} from "vitest";
import fs from "node:fs";import path from "node:path";import {execFileSync} from "node:child_process";
import {createUser} from "@/lib/auth";import {loadProject} from "@/lib/projects";import {all} from "@/lib/db";
import {seedImageFixture} from "./image-v2-fixtures";
import * as store from "@/lib/video-v2/store";
import {buildSceneDoc,localScenePlan,sceneTiming,realThreeScenesDeps} from "@/lib/video-v2/three-scenes";
import {tmpDir} from "@/lib/storage";
describe("Modification concurrente pendant l'encodage : fichier local réel, outils d'encodage injectés",()=>{
 it("conserve la version client et range le rendu reçu dans une lignée distincte",async()=>{
  const u=await createUser(`render-race-${crypto.randomUUID()}@test.invalid`,"motdepasse-test","Fixture");const p=loadProject(seedImageFixture(u.id,"hightech"));
  const key="video-race-test",plan=localScenePlan(p,null,{as:"ad",scenes:3,totalS:15});
  const doc=buildSceneDoc(p,[0,1,2].map(k=>({assetId:`fixture-${k}`,durationS:5,generated:true})),plan,"9:16","ad",sceneTiming(3,15));
  store.saveVideoVersion(p.id,key,doc);
  const dir=tmpDir("render-race-test"),file=path.join(dir,"actual.mp4");
  execFileSync("ffmpeg",["-y","-v","error","-f","lavfi","-i","color=c=black:s=160x284:d=1","-c:v","libx264","-pix_fmt","yuv420p",file]);
  const edited=structuredClone(doc);edited.meta.source="user";edited.clips[0].label="Modification client à conserver";
  const mock=vi.spyOn(store,"renderVideoFile").mockImplementation(async()=>{store.saveVideoVersion(p.id,key,edited);return {file,dir,durationS:1,width:160,height:284,audio:{lufs:null,truePeakDb:null,durationS:1,silent:true},srt:"",vtt:"WEBVTT\n\n"};});
  try {
   await expect(realThreeScenesDeps(null,{userId:p.userId,projectId:p.id},{aiText:false}).render(p,key,doc,{})).rejects.toThrow(/modifiée pendant/);
   expect(store.latestVideo(p.id,key)!.doc).toEqual(edited);
   const retained=all<any>("SELECT * FROM assets WHERE project_id=? AND role='video' AND json_extract(meta,'$.editConflict')=1",p.id);
   expect(retained).toHaveLength(1);expect(JSON.parse(retained[0].meta).videoV2.docKey).not.toBe(key);
   expect(store.listVideoVersions(p.id,JSON.parse(retained[0].meta).videoV2.docKey)).toHaveLength(1);
  } finally {mock.mockRestore();fs.rmSync(dir,{recursive:true,force:true});}
 });
});
