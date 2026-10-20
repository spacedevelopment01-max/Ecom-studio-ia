/** Chaîne native handler → état persistant, moteur réel sans fournisseur ou défaut de livraison injecté.
 * Aucun appel réel. Le vrai incident client reste à diagnostiquer avec ses propres traces. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fs from "node:fs";
import sharp from "sharp";
const producer=vi.hoisted(()=>({mode:"unavailable",assetId:null as string|null}));
vi.mock("@/lib/image-v2/engine",async orig=>{
  const real=await orig<typeof import("@/lib/image-v2/engine")>();
  const {mockDeps}=await import("./image-v2-mock");
  return {...real,runImageEngineV2:async(ctx:any,pid:string,req:any)=>producer.mode==="unavailable"
    ?real.runImageEngineV2(ctx,pid,req,mockDeps({canGenerate:false,canReview:false}).deps)
    :{runId:"isolated-delivery",outcomes:[{assetId:producer.assetId,verdict:"FINAL",origin:"generated",score:9.5}],costMicro:0,stats:{},notes:[],stoppedByCostCap:false}};
});
import { createUser } from "@/lib/auth";
import { seedImageFixture } from "./image-v2-fixtures";
import { saveAsset } from "@/lib/library";
import { storagePath } from "@/lib/storage";
import { claimNext, completeJob, enqueue, failJob, getJob, JobContext, markFinished } from "@/lib/jobs";
import { handlers } from "../worker/handlers";
import { runForUser } from "@/lib/ai/access";
import { imageDelivery } from "@/lib/media/delivery-check";
beforeEach(()=>vi.stubGlobal("fetch",async()=>{throw Error("No supplier or external network allowed");}));
afterEach(()=>vi.unstubAllGlobals());
async function execute(mode:string){
  producer.mode=mode;producer.assetId=null;
  const u=await createUser(`delivery-${crypto.randomUUID()}@example.invalid`,"isolated-password","Fictitious");
  const pid=seedImageFixture(u.id,"hightech");
  if(mode!=="unavailable"){
    if(mode==="missing")producer.assetId="missing-isolated-asset";
    else {
      const foreign=mode==="foreign"?seedImageFixture(u.id,"cosmetic"):pid;
      const data=mode==="corrupt"?Buffer.from("not an image"):await sharp({create:{width:64,height:64,channels:3,background:"#385d4b"}}).png().toBuffer();
      const a=await saveAsset({projectId:foreign,userId:u.id,data,name:"isolated-image.png",mime:"image/png",role:"ad",origin:"generated",status:"ready",meta:{imageV2:{origin:"generated"},gate:{verdict:"FINAL"}}});producer.assetId=a.id;
      if(mode==="missingfile")fs.unlinkSync(storagePath(a.storage_key));
    }
  }
  // La file de recette a son type isolé : les autres fichiers Vitest partagent cette base temporaire.
  const type=`test142.delivery:${u.id}`;
  const j=enqueue({userId:u.id,projectId:pid,type,payload:{projectId:pid,request:{kind:"ambiance",support:"ad",allowGenerate:true,noStock:true,count:1}}});
  const claimed=claimNext([type])!;expect(claimed.id).toBe(j.id);const ctx=new JobContext(claimed);
  try{const result=await runForUser(u.id,()=>handlers["image.v2"](ctx),"normal",pid);completeJob(j.id,result);}
  catch(e){failJob(getJob(j.id)!,e,{permanent:true});}
  finally{markFinished(j.id);}
  return getJob(j.id)!;
}
it.each(["unavailable","missing","foreign","corrupt","missingfile"])("image %s : aucun succès sans livrable valide du projet",async mode=>{
  const j=await execute(mode);expect(j.status).toBe("failed");expect(j.error).toBeTruthy();
});
it("une image valide, stockée dans le bon projet, reste livrée",async()=>{
  const j=await execute("valid");expect(j.status).toBe("done");expect(j.progress).toBe(1);expect(JSON.parse(j.result!).outcomes[0].assetId).toBe(producer.assetId);
});
it("une livraison partielle ou à vérifier reste explicite sans promouvoir le résultat",async()=>{
  await execute("valid");
  const {getAsset}=await import("@/lib/library");
  const {run}=await import("@/lib/db");
  const a=getAsset(producer.assetId!)!;
  expect((await imageDelivery(a.project_id,[a.id],{expected:2})).state).toBe("partial");
  run("UPDATE assets SET status='review' WHERE id=?",a.id);
  expect((await imageDelivery(a.project_id,[a.id])).state).toBe("review");
  expect(getAsset(a.id)!.status).toBe("review");
  await expect(imageDelivery(a.project_id,[a.id],{adGallery:true})).rejects.toThrow(/galerie/);
  run("UPDATE assets SET status='rejected' WHERE id=?",a.id);
  await expect(imageDelivery(a.project_id,[a.id])).rejects.toThrow(/contrôles/);
});
