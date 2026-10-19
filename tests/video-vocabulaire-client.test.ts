/**
 * Démo montre ARVEN : la vidéo disait « Voici Chronographe… » alors que le client a demandé « montre », jamais
 * « chronographe ». Cause : le moteur vidéo ne lisait pas le vocabulaire du client. Il l'applique maintenant aux
 * titres, à la voix, aux sous-titres et à la carte de fin.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("vidéo : vocabulaire du client appliqué", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { run } = await import("@/lib/db");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { runThreeScenes } = await import("@/lib/video-v2/three-scenes");
  const { addWordingRule } = await import("@/lib/client-wording");
  const png = () => sharp({ create: { width: 90, height: 160, channels: 3, background: "#224466" } }).png().toBuffer();

  it("vidéo en scènes : aucun « chronographe » à l'écran ni dans la voix, même dans un plan écrit par l'IA", async () => {
    const u = await createUser(`vw-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "hightech");
    run("UPDATE projects SET product_json = json_set(product_json, '$.name', ?, '$.category', ?) WHERE id = ?", "Chronographe acier et cuir", "Montre", pid);
    await seedCutout(u.id, pid);
    addWordingRule(pid, { avoid: "chronographe", use: "montre" });
    const p = loadProject(pid);
    let rendered: any = null;
    const deps = {
      frames: async()=>[Buffer.from("image de contrôle simulée")],
        reviewMedia: async()=>({score:9,sameProduct:true,productAltered:false,characterConsistent:null,offTopic:false,artifacts:false,personVisible:false,issues:[]}),
        keyframe: async () => png(),
      clip: async () => Buffer.from("mp4"),
      stock: async (_p: unknown, k: number) => ({ assetId: (await saveAsset({ projectId: p.id, userId: p.userId, data: Buffer.from(`c${k}`), name: `c${k}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", status: "ready", meta: {} })).id, durationS: 8 }),
      spentMicro: () => 0,
      render: async (_p: unknown, _k: string, doc: unknown) => ((rendered = doc), "video-1"),
      // Plan « écrit par l'IA » qui reprend le mauvais mot.
      writePlan: async () => ({ line: "Voici Chronographe acier et cuir", cta: "Découvrir le chronographe", voiceEnd: "Le chronographe ARVEN.", scenes: [0, 1, 2].map(() => ({ title: "Chronographe", voice: "Voici Chronographe acier et cuir." })) }),
    };
    await runThreeScenes(null, p.id, { as: "post", scenes: 3, totalS: 15, aspect: "9:16" }, deps as any);
    const text = JSON.stringify({...rendered,meta:{}});
    expect(text).not.toMatch(/chronographe/i);
    expect(text).toMatch(/Montre acier et cuir/);
  });
});
