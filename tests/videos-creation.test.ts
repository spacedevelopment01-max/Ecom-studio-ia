/**
 * Vidéos de la création du projet : 2 vidéos de 15 s en 3 scènes. Produit + Développer/Dominer + IA active : scènes
 * par l'IA (Wan 2.6) ; service : plans du métier ; sinon (Créer, « montage seulement », IA coupée) montage local.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

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
          keyframe: async () => png(),
          clip: async () => {
            if (o.failClip) throw new Error("fournisseur indisponible");
            calls.clip++;
            return Buffer.from("mp4");
          },
          stock: async (_p: unknown, k: number) => (calls.stock++, { assetId: (await saveAsset({ projectId: p.id, userId: p.userId, data: Buffer.from(`c${k}${Math.random()}`), name: `c${k}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", status: "ready", meta: {} })).id, durationS: 8 }),
          spentMicro: () => 0,
          render: async (_p: unknown, _k: string, doc: unknown) => (calls.docs.push(doc), `video-${calls.docs.length}`),
        },
        quote: () => ({ mode: "ai" as const, allowed: o.allowed ?? true, reason: null, estimateMicro: 900_000, scenes: 3, totalS: 15, clipS: 5 }),
        local: async (k: number) => (calls.local.push(k), `local-${k}`),
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
    const pid = seedImageFixture(u.id, "hightech");
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
      expect(d.clips.at(-1).source.kind).toBe("doc");
      expect(d.audio.music).toBeTruthy();
    }
  });

  it("prix refusé ou échec du fournisseur : montage local à la place, jamais de blocage", async () => {
    const u = await createUser(`vc3-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "hightech");
    await seedCutout(u.id, pid);
    const p = loadProject(pid);
    const refused = deps(p, { allowed: false });
    expect(await creationSceneVideos(null, pid, "ai", refused.deps)).toEqual(["local-0", "local-1"]);
    expect(refused.calls.clip).toBe(0);
    const failing = deps(p, { failClip: true });
    expect(await creationSceneVideos(null, pid, "ai", failing.deps)).toEqual(["local-0", "local-1"]);
  });

  it("service : plans libres de droits du métier, aucune génération", async () => {
    const u = await createUser(`vc4-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const p = loadProject(seedImageFixture(u.id, "restaurant"));
    const f = deps(p);
    const out = await creationSceneVideos(null, p.id, "stock", f.deps);
    expect(out).toHaveLength(2);
    expect(f.calls.stock).toBe(6);
    expect(f.calls.clip).toBe(0);
  });
});
