/**
 * Vidéo en scènes (création guidée et création du projet) : produit = une image Qwen + un plan Wan 2.6 par scène,
 * service = plans libres de droits ; durée totale, nombre de scènes et format choisis par le client ; carte de fin avec
 * le vrai logo ; prix annoncé avant ; vidéos IA réservées aux forfaits qui les incluent.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("Vidéo en scènes", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { runThreeScenes, sceneTiming, quoteScenes, buildSceneDoc, localScenePlan, keyframePrompt } = await import("@/lib/video-v2/three-scenes");
  const { timeline } = await import("@/lib/video-v2/doc");
  const png = () => sharp({ create: { width: 90, height: 160, channels: 3, background: "#224466" } }).png().toBuffer();

  async function productProject() {
    const u = await createUser(`vs-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "hightech");
    await seedCutout(u.id, pid);
    return loadProject(pid);
  }
  function fakeDeps(p: { id: string; userId: string }) {
    const calls = { keyframe: [] as string[], clip: [] as number[], stock: 0, rendered: null as any };
    return {
      calls,
      deps: {
        keyframe: async (prompt: string) => (calls.keyframe.push(prompt), png()),
        clip: async (_i: Buffer, _p: string, _a: string, seconds: number) => (calls.clip.push(seconds), Buffer.from("mp4")),
        stock: async (_p: unknown, k: number) => (calls.stock++, { assetId: (await saveAsset({ projectId: p.id, userId: p.userId, data: Buffer.from(`clip${k}`), name: `c${k}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", status: "ready", meta: {} })).id, durationS: 8 }),
        spentMicro: () => 0,
        render: async (_p: unknown, _k: string, doc: unknown) => ((calls.rendered = doc), "video-1"),
      },
    };
  }

  it("découpage : 3 scènes en 15 s, 5 scènes en 30 s, limites respectées", () => {
    const a = sceneTiming(3, 15);
    expect(a.clipS).toBe(5);
    expect(Math.round((a.showS * 3 + a.endS) * 10) / 10).toBe(15);
    const b = sceneTiming(5, 30);
    expect(b.clipS).toBeGreaterThanOrEqual(b.showS);
    expect(Math.round((b.showS * 5 + b.endS) * 10) / 10).toBe(30);
    expect(sceneTiming(1, 60).clipS).toBe(15);
  });

  it("produit : une image (vrai produit en référence, aucun texte ni personne) puis un plan Wan par scène, montage de la durée voulue", async () => {
    const p = await productProject();
    const f = fakeDeps(p);
    const r = await runThreeScenes(null, p.id, { as: "post", scenes: 3, totalS: 15, aspect: "9:16" }, f.deps);
    expect(r.mode).toBe("ai");
    expect(f.calls.keyframe).toHaveLength(3);
    expect(f.calls.clip).toEqual([5, 5, 5]);
    expect(f.calls.keyframe[0]).toContain("reproduce it EXACTLY");
    expect(f.calls.keyframe[0]).toContain("No people");
    expect(f.calls.keyframe[0]).toContain("No text");
    expect(timeline(f.calls.rendered).total).toBeCloseTo(15, 0);
    // Carte de fin (bouton, marque) et mention « vidéo générée par IA ».
    expect(f.calls.rendered.clips.at(-1).source.kind).toBe("doc");
    expect(f.calls.rendered.disclosure).toBeTruthy();
  });

  it("le client choisit 5 scènes, 30 s, format carré", async () => {
    const p = await productProject();
    const f = fakeDeps(p);
    await runThreeScenes(null, p.id, { as: "ad", scenes: 5, totalS: 30, aspect: "1:1" }, f.deps);
    expect(f.calls.clip).toHaveLength(5);
    expect(f.calls.rendered.aspect).toBe("1:1");
    expect(f.calls.rendered.width).toBe(f.calls.rendered.height);
    expect(timeline(f.calls.rendered).total).toBeCloseTo(30, 0);
    expect(f.calls.keyframe[0]).toContain("square");
  });

  it("service : plans libres de droits liés au métier, aucune génération", async () => {
    const u = await createUser(`vss-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const p = loadProject(seedImageFixture(u.id, "restaurant"));
    const f = fakeDeps(p);
    const r = await runThreeScenes(null, p.id, { as: "post" }, f.deps);
    expect(r.mode).toBe("stock");
    expect(f.calls.stock).toBe(3);
    expect(f.calls.keyframe).toHaveLength(0);
    expect(f.calls.rendered.disclosure).toBeNull();
  });

  it("prix et droits : vidéos IA réservées à Développer/Dominer, 30 s au plus avec Développer, gratuit pour un service", async () => {
    const p = await productProject();
    const base = { imageMaxMicro: 50_000, clipMaxMicro: (s: number) => s * 40_000, textMicro: 2_000, aiActive: true };
    const ok = quoteScenes(p, { as: "post" }, { ...base, videosRight: "advanced" });
    expect(ok.allowed).toBe(true);
    expect(ok.estimateMicro).toBe(3 * (50_000 + 5 * 40_000) + 2_000);
    expect(quoteScenes(p, { as: "post" }, { ...base, videosRight: "none" }).allowed).toBe(false);
    expect(quoteScenes(p, { as: "post", totalS: 45 }, { ...base, videosRight: "short" }).allowed).toBe(false);
    expect(quoteScenes(p, { as: "post" }, { ...base, aiActive: false, videosRight: "advanced" }).allowed).toBe(false);
    const u = await createUser(`vsq-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const svc = loadProject(seedImageFixture(u.id, "restaurant"));
    const q = quoteScenes(svc, { as: "post" }, { ...base, aiActive: false, videosRight: null });
    expect(q).toMatchObject({ mode: "stock", allowed: true, estimateMicro: 0 });
  });

  it("plan du studio : la demande du client en première scène, le bon nombre de scènes", async () => {
    const p = await productProject();
    const plan = localScenePlan(p, null, { as: "post", scenes: 4, request: "sur un bureau en noyer" });
    expect(plan.scenes).toHaveLength(4);
    expect(plan.scenes[0].still).toContain("bureau en noyer");
    const doc = buildSceneDoc(p, plan.scenes.map((_, k) => ({ assetId: `a${k}`, durationS: 5, generated: true })), plan, "16:9", "ad");
    expect(doc.width).toBeGreaterThan(doc.height);
    expect(keyframePrompt(p, null, plan.scenes[0], "16:9", false)).toContain("horizontal");
  });

  it("Wan 2.6 Flash demandé en 1080P SANS son (tarif « no audio »), un seul plan continu ; les autres modèles restent en 720P", async () => {
    const { wanVideoBody } = await import("@/lib/ai/alibaba");
    const flash = wanVideoBody({ model: "wan2.6-i2v-flash", prompt: "p", image: "data:x", seconds: 5, people: false });
    expect(flash.parameters).toMatchObject({ resolution: "1080P", audio: false, shot_type: "single", duration: 5 });
    const other = wanVideoBody({ model: "wan2.7-i2v", prompt: "p", image: "data:x", seconds: 5, people: false });
    expect(other.parameters).toMatchObject({ resolution: "720P" });
    expect((other.parameters as Record<string, unknown>).audio).toBeUndefined();
  });
});
