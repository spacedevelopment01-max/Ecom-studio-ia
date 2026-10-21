import { grantProjectPlan } from "./communication-choice-fixture";
/**
 * Vidéos de la création du projet : 2 vidéos de 15 s en 3 scènes. Produit + Développer/Dominer + IA active : scènes
 * par l'IA (Wan 2.6) ; service : plans du métier ; sinon (Créer, « montage seulement », IA coupée) montage local.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import {execTool} from "@/lib/exec-tool";
import {tmpDir} from "@/lib/storage";

// Vrais conteneurs décodables de test ; aucun fournisseur ni rendu créatif réel.
const videos=new Map<string,Promise<Buffer>>();
const videoBytes=(aspect="9:16")=>{
 if(!videos.has(aspect))videos.set(aspect,(async()=>{const dir=tmpDir("creation-video-fixture"),file=path.join(dir,"test.mp4");try{await execTool("ffmpeg",["-y","-f","lavfi","-i",`color=c=0x224466:s=${aspect==="16:9"?"160x90":"90x160"}:r=2:d=15`,"-an","-c:v","libx264","-pix_fmt","yuv420p",file]);return fs.readFileSync(file);}finally{fs.rmSync(dir,{recursive:true,force:true});}})());
 return videos.get(aspect)!;
};

describe("Vidéos de la création", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { creationSceneVideos, creationVideoMode, CREATION_VIDEOS } = await import("@/lib/video-v2/creation-videos");
  const { timeline } = await import("@/lib/video-v2/doc");
  const png = () => sharp({ create: { width: 90, height: 160, channels: 3, background: "#224466" } }).png().toBuffer();

  function deps(p: { id: string; userId: string }, o: { allowed?: boolean; failClip?: boolean } = {}) {
    const calls = { clip: 0, stock: 0, local: [] as number[], docs: [] as any[] };
    return {
      calls,
      deps: {
        scenes: {
          frames: async()=>[Buffer.from("image de contrôle simulée")],
        reviewMedia: async()=>({score:9,sameProduct:true,productAltered:false,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:[]}),
        keyframe: async () => png(),
          clip: async () => {
            if (o.failClip) throw new Error("fournisseur indisponible");
            calls.clip++;
            return videoBytes();
          },
          stock: async (_p: unknown, k: number) => (calls.stock++, { assetId: (await saveAsset({ projectId: p.id, userId: p.userId, data: await videoBytes(), name: `c${k}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", status: "ready", meta: {} })).id, durationS: 8 }),
          spentMicro: () => 0,
          render: async (_p: unknown, _k: string, doc: unknown) => {calls.docs.push(doc);return (await saveAsset({projectId:p.id,userId:p.userId,data:await videoBytes((doc as {aspect:string}).aspect),name:`rendu-${calls.docs.length}.mp4`,mime:"video/mp4",role:"video",origin:"generated",status:"review"})).id;},
        },
        quote: () => ({ mode: "ai" as const, allowed: o.allowed ?? true, reason: null, estimateMicro: 900_000, scenes: 3, totalS: 15, clipS: 5 }),
        local: async (k: number) => {calls.local.push(k);return(await saveAsset({projectId:p.id,userId:p.userId,data:await videoBytes(k===0?"9:16":"16:9"),name:`local-${k}.mp4`,mime:"video/mp4",role:"video",origin:"generated",status:"review"})).id;},
        spentByJob: () => 0,
      },
    };
  }

  it("qui a quoi : produit + 89/129 € + IA = IA ; Créer, montage seulement ou IA coupée = local ; service = plans du métier", async () => {
    const u = await createUser(`vc-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const prod = loadProject(seedImageFixture(u.id, "hightech"));
    const svc = loadProject(seedImageFixture(u.id, "restaurant"));
    expect(creationVideoMode(prod, "ai", { videosRight: "short", aiActive: true })).toBe("ai");
    expect(creationVideoMode(prod, "ai", { videosRight: "advanced", aiActive: true })).toBe("ai");
    expect(creationVideoMode(prod, "ai", { videosRight: "none", aiActive: true })).toBe("local");
    expect(creationVideoMode(prod, "ai", { videosRight: "advanced", aiActive: false })).toBe("local");
    expect(creationVideoMode(prod, "edited", { videosRight: "advanced", aiActive: true })).toBe("local");
    expect(creationVideoMode(svc, "ai", { videosRight: "none", aiActive: false })).toBe("stock");
  });

  it("produit : 2 vidéos de 15 s en 3 scènes IA (9:16 et 16:9), carte de fin et musique", async () => {
    const u = await createUser(`vc2-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "hightech");grantProjectPlan(pid,"dominer");
    await seedCutout(u.id, pid);
    const p = loadProject(pid);
    const f = deps(p);
    const out = await creationSceneVideos(null, pid, "ai", f.deps);
    expect(out).toHaveLength(2);
    expect(f.calls.clip).toBe(6);
    expect(f.calls.local).toEqual([]);
    expect(f.calls.docs.map((d) => d.aspect)).toEqual(CREATION_VIDEOS.map((v) => v.aspect));
    for (const d of f.calls.docs) {
      expect(timeline(d).total).toBeCloseTo(15, 0);
      expect(d.clips.at(-1).source.kind).toBe("video");
      expect(d.audio.music).toBeTruthy();
    }
  });

  it("prix refusé ou échec du fournisseur : incomplet explicite, aucun remplacement", async () => {
    const u = await createUser(`vc3-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "hightech");grantProjectPlan(pid,"dominer");
    await seedCutout(u.id, pid);
    const p = loadProject(pid);
    const refused = deps(p, { allowed: false });
    await expect(creationSceneVideos(null,pid,"ai",refused.deps)).rejects.toThrow(/incomplète/);
    expect(refused.calls.local).toEqual([]);
    expect(refused.calls.clip).toBe(0);
    const failing = deps(p, { failClip: true });
    await expect(creationSceneVideos(null,pid,"ai",failing.deps)).rejects.toThrow(/incomplète/);
    expect(failing.calls.local).toEqual([]);
  });

  it("service : plans libres de droits du métier, aucune génération", async () => {
    const u = await createUser(`vc4-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const p = loadProject(seedImageFixture(u.id, "restaurant"));grantProjectPlan(p.id,"dominer");
    const f = deps(p);
    const out = await creationSceneVideos(null, p.id, "stock", f.deps);
    expect(out).toHaveLength(2);
    expect(f.calls.stock).toBe(6);
    expect(f.calls.clip).toBe(0);
  });
  it.each(["creer","vendre"] as const)("%s : lancement sans publicité, seule la vidéo organique est produite avec ses points de reprise inchangés",async plan=>{
    const u=await createUser(`creation-rights150-${crypto.randomUUID()}@example.test`,"isolated-password","Fictif");const pid=seedImageFixture(u.id,"hightech");grantProjectPlan(pid,plan);await seedCutout(u.id,pid);
    const p=loadProject(pid),f=deps(p);const out=await creationSceneVideos(null,pid,plan==="creer"?"local":"ai",f.deps);expect(out).toHaveLength(1);
    if(plan==="creer"){expect(f.calls.local).toEqual([1]);expect(f.calls.clip).toBe(0);}else{expect(f.calls.clip).toBe(3);expect(f.calls.docs).toHaveLength(1);expect(f.calls.docs[0].aspect).toBe("16:9");expect(f.calls.docs[0].meta.intent).toBe("social_content");}
  });
  it("service Créer : présentation avec plans libres conservée, aucune vidéo publicitaire ni génération",async()=>{
    const u=await createUser(`service-rights150-${crypto.randomUUID()}@example.test`,"isolated-password","Fictif");const pid=seedImageFixture(u.id,"restaurant");grantProjectPlan(pid,"creer");const f=deps(loadProject(pid));
    expect(await creationSceneVideos(null,pid,"stock",f.deps)).toHaveLength(1);expect(f.calls.stock).toBe(3);expect(f.calls.clip).toBe(0);expect(f.calls.docs[0].meta.intent).toBe("social_content");
  });

});
