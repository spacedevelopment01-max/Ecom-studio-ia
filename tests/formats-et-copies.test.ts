/**
 * Toute publication ou publicité, avec ou sans IA, modifiable et duplicable dans un autre format :
 * vidéos (recomposées, gratuites), visuels faits par l'IA (copie gratuite sans rien couper, nouvelle version payante
 * avec la même demande), publications du calendrier (copie au nouveau format, originale intacte).
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("Formats et copies", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset, getAsset, assetMeta, assetData } = await import("@/lib/library");
  const { run, now, one, json } = await import("@/lib/db");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { buildSceneDoc, localScenePlan } = await import("@/lib/video-v2/three-scenes");
  const { reformatVideoDoc } = await import("@/lib/video-v2/reformat");
  const { timeline } = await import("@/lib/video-v2/doc");
  const { extendToAspect, reformatAiImage, redoRequest } = await import("@/lib/media/ai-image-variants");
  const { duplicatePostInFormat } = await import("@/lib/social-v2/post-format");

  async function project() {
    const u = await createUser(`fc-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "hightech");
    await seedCutout(u.id, pid);
    return loadProject(pid);
  }
  const png = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: "#cc3355" } }).png().toBuffer();
  async function aiImage(p: { id: string; userId: string }, ad: boolean) {
    return saveAsset({ projectId: p.id, userId: p.userId, data: await png(1080, 1350), name: "pub-ia.png", mime: "image/png", role: ad ? "ad" : "social", folderKey: ad ? "images.ads" : "content.calendar", origin: "generated", status: "ready", meta: { ...(ad ? { aiAd: true } : {}), aspect: "4:5", aiPost: { texts: { headline: "Son pur" }, subject: { kind: "product", key: "main", name: "Casque" }, request: "sur un bureau en noyer" } } });
  }

  it("vidéo : autre format recomposé (taille, plateforme, textes et carte de fin dans le cadre), durée et musique gardées", async () => {
    const p = await project();
    const plan = localScenePlan(p, null, { as: "post" });
    const doc = buildSceneDoc(p, plan.scenes.map((_, k) => ({ assetId: `a${k}`, durationS: 5, generated: true })), plan, "9:16", "post");
    const wide = reformatVideoDoc(doc, "16:9");
    expect([wide.width, wide.height, wide.aspect]).toEqual([1920, 1080, "16:9"]);
    expect(timeline(wide).total).toBe(timeline(doc).total);
    expect(wide.audio.music).toEqual(doc.audio.music);
    const end = wide.clips.at(-1)!.source as any;
    expect(end.kind).toBe("doc");
    expect([end.doc.width, end.doc.height]).toEqual([1920, 1080]);
    for (const c of wide.clips) for (const l of c.overlays) expect(l.x + l.w).toBeLessThanOrEqual(1920 + 1);
    expect(doc.width).toBe(1080); // l'original n'est pas touché
  });

  it("visuel fait par l'IA : copie gratuite au nouveau format, l'image entière (rien coupé), même étiquette", async () => {
    const p = await project();
    const src = await aiImage(p, true);
    const out = await extendToAspect(await png(1080, 1350), "16:9");
    expect(await sharp(out).metadata()).toMatchObject({ width: 1920, height: 1080 });
    const copy = (await reformatAiImage(p.id, src.id, "9:16"))!;
    const m = assetMeta<any>(getAsset(copy.id)!);
    expect(m).toMatchObject({ aiAd: true, aspect: "9:16", reformat: { from: src.id, method: "studio" } });
    expect(m.aiPost.request).toBe("sur un bureau en noyer");
    expect(await sharp(assetData(getAsset(copy.id)!)).metadata()).toMatchObject({ width: 1080, height: 1920 });
  });

  it("nouvelle version par l'IA : même produit, demande d'origine complétée par la modification", () => {
    const r = redoRequest({ aiAd: true, aiPost: { subject: { kind: "product", key: "main" }, request: "sur un bureau en noyer" } }, { aspect: "1:1", instruction: "fond plus clair" });
    expect(r).toMatchObject({ as: "ad", format: "1:1", subject: { kind: "product", key: "main" } });
    expect(r.request).toContain("sur un bureau en noyer");
    expect(r.request).toContain("fond plus clair");
    expect(redoRequest({ aiPost: { subject: { kind: "service", key: "Taille de haies" } } }, { aspect: "4:5" }).subject).toEqual({ kind: "service", name: "Taille de haies" });
  });

  it("publication du calendrier : copie au nouveau format avec son visuel, l'originale intacte", async () => {
    const p = await project();
    const img = await aiImage(p, false);
    const postId = `fc-post-${Math.random().toString(36).slice(2, 8)}`;
    run("INSERT INTO posts (id, project_id, network, format, status, scheduled_at, timezone, caption, media, publish_key, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", postId, p.id, "instagram", "image", "review", now() + 86_400_000, "Europe/Paris", "Bonjour", JSON.stringify([img.id]), `k-${postId}`, now(), now());
    const r = await duplicatePostInFormat(p, postId, "9:16");
    expect(r.id).not.toBe(postId);
    expect(r.assetId).toBeTruthy();
    const copy = one<{ media: string; caption: string }>("SELECT media, caption FROM posts WHERE id = ?", r.id)!;
    expect(json<string[]>(copy.media, [])).toEqual([r.assetId]);
    expect(copy.caption).toBe("Bonjour");
    expect(json<string[]>(one<{ media: string }>("SELECT media FROM posts WHERE id = ?", postId)!.media, [])).toEqual([img.id]);
  });
});
