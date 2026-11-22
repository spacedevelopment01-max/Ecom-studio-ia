/**
 * Rapport 09 du 22 novembre 2026, points 2, 3 et 5 : le plan sûr au centre, le mélange (un seul plan animé, modèle
 * réglé dans l'administration, aucun s'il n'est pas réglé), le contrôle mécanique image par image. Aucun appel d'IA.
 */
import { describe, expect, it, afterEach } from "vitest";
import sharp from "sharp";

describe("le mélange", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { adInsight } = await import("@/lib/ads-v2/insight");
  const { videoIntent } = await import("@/lib/video-v2/intent");
  const { videoStrategy } = await import("@/lib/video-v2/strategy");
  const { localScript } = await import("@/lib/video-v2/script");
  const { buildStoryboard } = await import("@/lib/video-v2/storyboard");
  const { planShots, paidShots } = await import("@/lib/video-v2/shots");
  const { chooseProvider } = await import("@/lib/video-v2/providers");
  const { mixAnimatedModel, animatedShotIds, safeCamera } = await import("@/lib/video-v2/melange");
  const { gridAnimatedShots, gridFor } = await import("@/lib/video-v2/grilles");
  const { packshotDoc, SIZES, safeZone } = await import("@/lib/video-v2/doc");
  const { productDrift, imageSignature, signatureGap, DRIFT_LIMIT } = await import("@/lib/video-v2/quality");
  const { setJsonSetting, getJsonSetting } = await import("@/lib/settings");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const u = await createUser(`melange-${Date.now()}@test.fr`, "motdepasse-test", "M");
  const cosmetic = loadProject(seedImageFixture(u.id, "cosmetic"));
  const inv0 = { cutout: { id: "cut" }, logo: null, photos: [{ id: "ph1", role: "lifestyle", origin: "upload" }], videos: [], screens: [] };
  const all = { available: () => true, preferred: null, estimate: (_p: string, _m: string, s: number) => s * 100_000 };
  const before = getJsonSetting("ai.media.usage", {});
  afterEach(() => setJsonSetting("ai.media.usage", before));
  const mk = (text: string, extra: Record<string, unknown> = {}) => {
    const intent = videoIntent(cosmetic, { text, ...extra });
    const st = videoStrategy(cosmetic, intent);
    const i = adInsight(cosmetic);
    return { intent, st, sb: buildStoryboard(i, st, intent, localScript(i, st, intent), inv0) };
  };

  it("un seul plan animé par publication, deux par publicité, l'accroche d'abord ; les autres sont des plans sûrs qui bougent", async () => {
    await fr(() => {
      const v = mk("publicité instagram de 30 secondes");
      const plan = planShots(v.sb, { intent: v.intent, strategy: v.st, inv: inv0, allowGeneration: true, provider: (n) => chooseProvider(n, all), budgetMicro: 50_000_000 });
      const paid = paidShots(plan.shots);
      const n = gridAnimatedShots(gridFor(v.intent));
      expect(n).toBe(2); // publicité : grille de 21 à 30 s
      expect(paid).toHaveLength(n);
      expect(paid.map((x) => x.id)).toEqual(animatedShotIds(v.sb, n));
      expect(["hook", "demonstration"]).toContain(paid[0].part);
      const post = mk("publication instagram du jour", { kind: "social_content", purpose: "organic" });
      expect(gridAnimatedShots(gridFor(post.intent))).toBe(1);
      expect(paidShots(planShots(post.sb, { intent: post.intent, strategy: post.st, inv: inv0, allowGeneration: true, provider: (x) => chooseProvider(x, all), budgetMicro: 50_000_000 }).shots).length).toBeLessThanOrEqual(1);
      // Plans sûrs : jamais une caméra figée.
      for (const s of plan.shots.filter((x) => x.source.kind !== "generate")) expect(s.camera).not.toBe("static");
    });
  });

  it("aucun modèle animé réglé : aucun plan animé, la vidéo reste en plans sûrs (aucune dépense de vidéo)", async () => {
    setJsonSetting("ai.media.usage", {});
    expect(mixAnimatedModel()).toBeNull();
    await fr(() => {
      const v = mk("publicité instagram");
      const plan = planShots(v.sb, { intent: v.intent, strategy: v.st, inv: inv0, allowGeneration: true, provider: (n) => chooseProvider(n, all), budgetMicro: 50_000_000, animated: null });
      expect(paidShots(plan.shots)).toEqual([]);
      expect(plan.estimateMicro).toBe(0);
      expect(plan.shots.some((s) => s.method === "packshot")).toBe(true);
    });
  });

  it("modèle animé réglé dans l'administration : c'est lui, et seulement lui, qui anime le plan", async () => {
    setJsonSetting("ai.media.usage", { product_video: { mode: "manual", primary: "kling:kling-4.0" } });
    expect(mixAnimatedModel()).toEqual({ provider: "kling", model: "kling-4.0" });
    // Un réglage qui n'est pas un modèle vidéo image vers vidéo est ignoré.
    setJsonSetting("ai.media.usage", { product_video: { primary: "openai:gpt-image-2.6-flare" } });
    expect(mixAnimatedModel()).toBeNull();
    await fr(() => {
      const v = mk("publicité instagram");
      const only = { provider: "fal", model: "fal-ai/kling-video/v2.1/pro/image-to-video" };
      const plan = planShots(v.sb, { intent: v.intent, strategy: v.st, inv: inv0, allowGeneration: true, provider: (n) => chooseProvider(n, { ...all, only }), budgetMicro: 50_000_000, animated: only });
      const paid = paidShots(plan.shots);
      expect(paid.length).toBeGreaterThan(0);
      expect(paid.length).toBeLessThanOrEqual(2);
      for (const x of paid) expect(x.source).toMatchObject(only);
    });
  });

  it("plan sûr : vrai produit en calque avec son ombre, sur le décor de la marque", () => {
    const d = packshotDoc({ w: 1080, h: 1920, safe: safeZone("9:16", "reels"), pal: { primary: "#222222", secondary: "#888888", accent: "#cc5500", dark: "#111111", light: "#f5f1ea" }, typo: { heading: "Inter", body: "Inter" }, brand: "Éclat", cutoutId: "cut", decorId: "decor" });
    expect(d.layers.map((l) => l.id)).toEqual(["bg", "decor", "product"]);
    expect(d.layers.find((l) => l.id === "product")).toMatchObject({ assetId: "cut", contactShadow: true });
    expect(safeCamera("static")).toBe("push_in");
    expect(safeCamera("pan_left")).toBe("pan_left");
    expect(SIZES["9:16"]).toEqual({ w: 1080, h: 1920 });
  });

  it("contrôle mécanique : un plan qui garde l'image de départ passe ; un produit qui change de couleur est arrêté", async () => {
    const start = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#b04030" } }).png().toBuffer();
    const same = await imageSignature(start);
    const changed = await imageSignature(await sharp({ create: { width: 64, height: 64, channels: 3, background: "#30a0c0" } }).png().toBuffer());
    expect(signatureGap(same, same)).toBe(0);
    expect(productDrift(same, [same, same]).drift).toBe(false);
    const r = productDrift(same, [same, same, changed]);
    expect(r.drift).toBe(true);
    expect(r.atFrame).toBe(2);
    expect(r.gap).toBeGreaterThan(DRIFT_LIMIT);
  });
});
