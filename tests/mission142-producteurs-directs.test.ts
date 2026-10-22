/** Appels de création/workflow hors handlers : ne jamais annoncer un jeu d'images vide comme obtenu. */
import {afterAll,expect,it,vi} from "vitest";
import sharp from "sharp";
import fs from "node:fs";
vi.stubGlobal("fetch",async()=>{throw Error("Aucun fournisseur réel dans ces tests");});
import {createUser} from "@/lib/auth";
import {seedImageFixture} from "./image-v2-fixtures";
import {grantProjectPlan} from "@/lib/project-subscriptions";
import {claimNext,enqueue,JobContext,markFinished} from "@/lib/jobs";
import {runImageSetV2} from "@/lib/image-v2/set";
import {run} from "@/lib/db";
import {saveAsset,getAsset} from "@/lib/library";
import {storagePath} from "@/lib/storage";
afterAll(()=>vi.unstubAllGlobals());
async function fixture(paid:boolean){const u=await createUser(`direct-${crypto.randomUUID()}@example.invalid`,"motdepasse-test","Fictif");run("UPDATE users SET role='client' WHERE id=?",u.id);const pid=seedImageFixture(u.id,"restaurant");if(paid)grantProjectPlan(pid,"vendre");const type=`test142.direct:${u.id}`,j=enqueue({userId:u.id,projectId:pid,type,payload:{projectId:pid}});return{u,pid,ctx:new JobContext(claimNext([type])!),j};}
it("création directe : fournisseur indisponible ne produit pas un succès vide",async()=>{
 const f=await fixture(false);const generate=vi.fn();try{await expect(runImageSetV2(f.ctx,f.pid,generate)).rejects.toThrow(/IA|AI/);expect(generate).not.toHaveBeenCalled();}finally{markFinished(f.j.id);}
});
it("workflow/création directe : zéro résultat sur les trois étapes reste un blocage",async()=>{
 const f=await fixture(true);const generate=vi.fn(async()=>({outcomes:[],notes:[],stoppedByCostCap:false})) as any;
 try{await expect(runImageSetV2(f.ctx,f.pid,generate)).rejects.toThrow(/image/);expect(generate).toHaveBeenCalledTimes(3);}finally{markFinished(f.j.id);}
});
it("jeu incomplet : fichier acquis conservé et reprise des checkpoints sans refaire l'étape obtenue",async()=>{
 const f=await fixture(true);const a=await saveAsset({projectId:f.pid,userId:f.u.id,data:await sharp({create:{width:64,height:64,channels:3,background:"#244d43"}}).png().toBuffer(),name:"image-partielle-test.png",mime:"image/png",role:"scene",origin:"generated",status:"review",meta:{gate:{verdict:"FINAL"}}});
 let calls=0;const generate=vi.fn(async()=>{calls++;return{outcomes:calls===1?[{assetId:a.id,verdict:"FINAL"}]:[],notes:[],stoppedByCostCap:calls>1};}) as any;
 try{await expect(runImageSetV2(f.ctx,f.pid,generate)).rejects.toThrow(/1\/3/);expect(calls).toBe(2);await expect(runImageSetV2(f.ctx,f.pid,generate)).rejects.toThrow(/1\/3/);expect(calls).toBe(2);expect(getAsset(a.id)!.status).toBe("review");expect(fs.existsSync(storagePath(a.storage_key))).toBe(true);}finally{markFinished(f.j.id);}
});
it("trois fichiers distincts livrés restent disponibles à vérifier, sans approbation automatique",async()=>{
 const f=await fixture(true),ids:string[]=[];const generate=vi.fn(async()=>{const a=await saveAsset({projectId:f.pid,userId:f.u.id,data:await sharp({create:{width:64,height:64,channels:3,background:ids.length%2?"#335544":"#884433"}}).png().toBuffer(),name:`image-complete-${ids.length}.png`,mime:"image/png",role:"scene",origin:"generated",status:"review",meta:{gate:{verdict:"FINAL"}}});ids.push(a.id);return{outcomes:[{assetId:a.id,verdict:"FINAL"}],notes:[],stoppedByCostCap:false};}) as any;
 try{const r=await runImageSetV2(f.ctx,f.pid,generate);expect(r.created).toEqual(ids);expect(r.created).toHaveLength(3);expect(r.delivery).toMatchObject({state:"review",delivered:3,expected:3});expect(ids.every(id=>getAsset(id)!.status==="review")).toBe(true);}finally{markFinished(f.j.id);}
});
