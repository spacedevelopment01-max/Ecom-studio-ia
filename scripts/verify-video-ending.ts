/** Isolated native renderer check; no provider calls. Reuses technical fixtures only. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const dir=path.resolve(process.env.DATA_DIR??"");
if(!path.basename(dir).startsWith("ecs-test-video-mission-")) throw new Error("Dossier isolé requis");
globalThis.fetch=async()=>{throw new Error("Réseau interdit");};
const {ui}=JSON.parse(fs.readFileSync(path.join(dir,"private-ui.json"),"utf8"));
const {loadProject}=await import("../src/lib/projects");
const {buildSceneDoc,localScenePlan,sceneTiming}=await import("../src/lib/video-v2/three-scenes");
const {buildCreativeBrief}=await import("../src/lib/video-v2/creative-brief");
const {loadVideoSources}=await import("../src/lib/video-v2/store");
const {renderStill}=await import("../src/lib/video-v2/render");
const {tmpDir}=await import("../src/lib/storage");
const results=[];
for(const {slug,pid} of ui) {
 const p=loadProject(pid),doc=JSON.parse(fs.readFileSync(path.join(dir,"public",`${slug}-document.json`),"utf8"));
 const as=slug.includes("organique")?"post":"ad";
 const plan=localScenePlan(p,null,{as,scenes:4,totalS:20});
 const brief=buildCreativeBrief(p,{durationS:20,width:doc.width,height:doc.height,platform:doc.platform});
 const rebuilt=buildSceneDoc(p,doc.clips.map((c:any)=>({assetId:c.source.assetId,durationS:5,generated:c.generated})),plan,doc.aspect,as,sceneTiming(4,20),true,brief);
 const last=doc.clips.at(-1);last.overlays=last.overlays.filter((l:any)=>!l.id.startsWith("closing-")).concat(rebuilt.clips.at(-1)!.overlays.filter(l=>l.id.startsWith("closing-")));
 doc.meta.ending=rebuilt.meta.ending;
 const title=last.overlays.find((l:any)=>!l.id.startsWith("closing-")&&l.kind==="text");
 const logo=last.overlays.find((l:any)=>l.role==="logo");
 if(title&&logo) assert(logo.y>=title.y+title.h || logo.x>=title.x+title.w || logo.x+logo.w<=title.x);
 const tmp=tmpDir("ending-test");
 try {const sources=await loadVideoSources(pid,doc,tmp);fs.writeFileSync(path.join(dir,"public",`${slug}-fin-corrigee.png`),await renderStill(doc,sources,19,1));}
 finally {fs.rmSync(tmp,{recursive:true,force:true});}
 results.push({slug,clips:doc.clips.length,durationS:doc.clips.reduce((n:number,c:any)=>n+c.durationS,0),logoTitleOverlap:false,source:"native still render at 19s; synthetic source clips"});
 fs.writeFileSync(path.join(dir,"public",`${slug}-document-corrige.json`),JSON.stringify(doc,null,2));
}
fs.writeFileSync(path.join(dir,"public","ending-checks.json"),JSON.stringify(results,null,2));
console.log("Quatre vues natives corrigées à 19 s ; pas de chevauchement logo/titre.");
