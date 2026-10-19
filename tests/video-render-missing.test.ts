import {describe,it,expect}from'vitest';import fs from'node:fs';import path from'node:path';import{tmpDir}from'@/lib/storage';
describe('Un clip absent ne devient pas un écran noir réussi',()=>{
 it("ne prolonge pas un clip au-delà du passage disponible pour suivre la musique",async()=>{
  const {snapToBeat}=await import("@/lib/video-v2/engine");const clips=[1.6,2.4].map((durationS,k)=>({id:`c${k}`,durationS,source:{kind:"video",assetId:`a${k}`,inS:0,outS:durationS,muted:true}})) as import("@/lib/video-v2/types").Clip[];
  const result=snapToBeat(clips,1);expect(result).toEqual(clips);expect(result.reduce((n,c)=>n+c.durationS,0)).toBe(4);
 });
 it('échoue explicitement et arrête le rendu local',async()=>{
  const{createUser}=await import('@/lib/auth');const{seedImageFixture}=await import('./image-v2-fixtures');const{loadProject}=await import('@/lib/projects');const{buildSceneDoc,localScenePlan}=await import('@/lib/video-v2/three-scenes');const{renderVideoDoc}=await import('@/lib/video-v2/render');
  const u=await createUser(`missing-${crypto.randomUUID()}@test.invalid`,'motdepasse-test','Fixture'),p=loadProject(seedImageFixture(u.id,'hightech'));const plan=localScenePlan(p,null,{as:'ad'});const doc=buildSceneDoc(p,[0,1,2].map(k=>({assetId:`absent${k}`,durationS:5,generated:true})),plan,'9:16','ad');const dir=tmpDir('video-missing');
  try{await expect(renderVideoDoc(doc,{images:new Map(),videos:new Map()},path.join(dir,'output.mp4'),{scale:.1,fps:2})).rejects.toThrow(/illisible ou absent/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
});
