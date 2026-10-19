import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { JobContext } from "@/lib/jobs";
import { createUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { loadProject } from "@/lib/projects";
import { saveAsset } from "@/lib/library";
import { seedCutout, seedImageFixture } from "./image-v2-fixtures";
import { buildSceneDoc, localScenePlan, quoteScenes, runThreeScenes, sceneTiming, type ThreeScenesDeps } from "@/lib/video-v2/three-scenes";
import { buildCreativeBrief } from "@/lib/video-v2/creative-brief";
import { timeline } from "@/lib/video-v2/doc";
import { latestVideo, saveVideoVersion } from "@/lib/video-v2/store";

async function fixture(service = false) {
  const u = await createUser(`video-fiabilite-${crypto.randomUUID()}@test.fr`, "motdepasse-test", "Test isolé");
  const p = loadProject(seedImageFixture(u.id, service ? "restaurant" : "hightech"));
  if (!service) await seedCutout(u.id, p.id);
  const png = await sharp({ create: { width: 90, height: 160, channels: 3, background: "#345678" } }).png().toBuffer();
  const deps: ThreeScenesDeps = {
    writePlan: vi.fn(async (_p, _s, req) => localScenePlan(p, null, req)),
    frames: async()=>[Buffer.from("image de contrôle simulée")],
        reviewMedia: async()=>({score:9,sameProduct:true,productAltered:false,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:[]}),
        keyframe: vi.fn(async () => png),
    clip: vi.fn(async () => Buffer.from("faux clip : orchestration uniquement")),
    stock: vi.fn(async (_p, k) => ({ assetId: (await saveAsset({ projectId: p.id, userId: p.userId, data: Buffer.from(`stock ${k}`), name: `stock-${k}.mp4`, mime: "video/mp4", role: "clip", origin: "import" })).id, durationS: 8 })),
    spentMicro: () => 0,
    render: vi.fn(async () => "rendu-simule"),
  };
  return { p, deps };
}

describe("Mission vidéo : refus explicites et acquis conservés (fournisseurs simulés)", () => {
  it("quatre clips de cinq secondes entiers, conclusion superposée sur le dernier", async () => {
    const { p } = await fixture();
    const brief = buildCreativeBrief(p, { durationS: 20, width: 1080, height: 1920, platform: "reels" });
    const timing = sceneTiming(4, 20, brief.ctaHoldS);
    const plan = localScenePlan(p, null, { as: "ad", scenes: 4, totalS: 20 });
    const doc = buildSceneDoc(p, plan.scenes.map((_, k) => ({ assetId: `clip-${k}`, durationS: 5, generated: true })), plan, "9:16", "ad", timing, true, brief);
    expect(Math.abs(timeline(doc).total - 20)).toBeLessThan(.03);
    expect(doc.clips).toHaveLength(4);
    expect(doc.clips.every(c=>c.source.kind === "video" && c.durationS === 5)).toBe(true);
    expect(doc.meta.ending?.holdS).toBe(brief.ctaHoldS);
    expect(doc.clips.at(-1)!.overlays.some(l=>l.id.startsWith("closing-"))).toBe(true);
  });
  it("refuse le couple 1 scène / 60 secondes avant devis et avant tout fournisseur", async () => {
    const { p, deps } = await fixture();
    const req = { as: "ad", scenes: 1, totalS: 60 } as const;
    const q = quoteScenes(p, req, { imageMaxMicro: 1, clipMaxMicro: () => 1, textMicro: 1, videosRight: "advanced", aiActive: true });
    expect(q.allowed).toBe(false);
    expect(q.estimateMicro).toBe(0);
    await expect(runThreeScenes(null, p.id, req, deps)).rejects.toThrow(/scènes|scenes/i);
    expect(deps.writePlan).not.toHaveBeenCalled();
    expect(deps.keyframe).not.toHaveBeenCalled();
  });

  it("une erreur de scénario n'est pas masquée par un résultat simplifié", async () => {
    const { p, deps } = await fixture();
    deps.writePlan = vi.fn(async () => { throw new Error("résultat fournisseur incertain"); });
    await expect(runThreeScenes(null, p.id, { as: "ad" }, deps)).rejects.toThrow("résultat fournisseur incertain");
    expect(deps.clip).not.toHaveBeenCalled();
    expect(deps.render).not.toHaveBeenCalled();
  });

  it("sans contrôle, l'image reste à vérifier et aucun clip n'est payé",async()=>{
    const {p,deps}=await fixture();delete deps.reviewMedia;
    await expect(runThreeScenes(null,p.id,{as:"ad"},deps)).rejects.toThrow(/vérifier/);
    expect(deps.clip).not.toHaveBeenCalled();
    const images=all<any>("SELECT * FROM assets WHERE project_id = ? AND role = 'scene'",p.id);
    expect(images.length).toBe(1);
    expect((await import("@/lib/quality/usable")).isAutoUsable(images[0])).toBe(false);
  });

  it("une reprise après échec du mouvement conserve le scénario et l'image déjà obtenus", async () => {
    const { p, deps } = await fixture();
    const checkpoints = new Map<string, unknown>();
    const progress: number[] = [];
    const ctx = { job: { id: "test-job" }, progress: (x: number) => progress.push(x), step: async <T,>(key: string, fn: () => Promise<T>) => {
      if (checkpoints.has(key)) return checkpoints.get(key) as T;
      const value = await fn(); checkpoints.set(key, value); return value;
    } } as unknown as JobContext;
    let failed = false;
    deps.clip = vi.fn(async () => { if (!failed) { failed = true; throw new Error("échec confirmé avant production"); } return Buffer.from("clip simulé"); });
    const req = { as: "post", key: "test-video-reprise", scenes: 6, totalS: 30 } as const;
    await expect(runThreeScenes(ctx, p.id, req, deps)).rejects.toThrow("échec confirmé");
    await runThreeScenes(ctx, p.id, req, deps);
    expect(deps.writePlan).toHaveBeenCalledTimes(1);
    expect(deps.keyframe).toHaveBeenCalledTimes(6);
    expect(deps.clip).toHaveBeenCalledTimes(7);
    const count = all<{ n: number }>("SELECT COUNT(*) n FROM video_documents WHERE project_id = ?", p.id)[0].n;
    await runThreeScenes(ctx, p.id, req, deps);
    expect(deps.render).toHaveBeenCalledTimes(1);
    expect(all<{ n: number }>("SELECT COUNT(*) n FROM video_documents WHERE project_id = ?", p.id)[0].n).toBe(count);
    expect(Math.max(...progress)).toBeLessThan(1);
    const intermediate = all<{ system_key: string }>("SELECT f.system_key FROM assets a LEFT JOIN folders f ON f.id = a.folder_id WHERE a.project_id = ? AND a.role IN ('scene','clip')", p.id);
    expect(intermediate.every(a => a.system_key === "videos.social")).toBe(true);
  });

  it("service : ne livre pas deux plans sur trois en prétendant satisfaire la demande", async () => {
    const { p, deps } = await fixture(true);
    const stock = deps.stock;
    deps.stock = vi.fn(async (...args: Parameters<ThreeScenesDeps["stock"]>) => args[1] === 1 ? null : stock(...args));
    await expect(runThreeScenes(null, p.id, { as: "ad", scenes: 3, totalS: 15 }, deps)).rejects.toThrow(/scènes|scenes/i);
    expect(deps.render).not.toHaveBeenCalled();
    expect(deps.keyframe).not.toHaveBeenCalled();
  });

  it("une version retouchée par le client n'est pas écrasée par une reprise", async () => {
    const { p, deps } = await fixture();
    const req = { as: "ad", key: "video-client-a-conserver" } as const;
    const first = await runThreeScenes(null, p.id, req, deps);
    const cur = latestVideo(p.id, first.docKey)!;
    const edited = structuredClone(cur.doc);
    edited.meta.source = "user";
    edited.clips[0].label = "Titre conservé par le client";
    saveVideoVersion(p.id, first.docKey, edited);
    vi.mocked(deps.keyframe).mockClear();
    await expect(runThreeScenes(null, p.id, req, deps)).rejects.toThrow(/conservée|preserved/);
    expect(deps.keyframe).not.toHaveBeenCalled();
    expect(latestVideo(p.id, first.docKey)!.doc).toEqual(edited);
  });
});
