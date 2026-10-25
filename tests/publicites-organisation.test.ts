import {videoByteFixture} from "./video-byte-fixture";
/**
 * Onglet Publicités organisé comme Publications (sous-menu à gauche : Piloter / Créer / Gérer) et séparation stricte
 * des visuels PUBLICITAIRES (créations « ad », publicités vidéo, UGC) et des visuels ORGANIQUES : une publication
 * organique ne reprend jamais un visuel publicitaire, les vidéos organiques n'affichent pas les publicités.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("Publicités séparées de l'organique", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { isAdVisual } = await import("@/lib/media/bank");
  const { createOnePost } = await import("@/lib/social-v2/single");
  const { estimateProduction } = await import("@/lib/social-v2/production");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  it("reconnaît les visuels publicitaires (création « ad », publicité vidéo, UGC) et rien d'autre", () => {
    expect(isAdVisual({ kind: "image", role: "ad" })).toBe(true);
    expect(isAdVisual({ kind: "video", role: "video", meta: { videoV2: { intent: "video_ad" } } })).toBe(true);
    expect(isAdVisual({ kind: "video", role: "video", meta: { videoV2: { intent: "ugc" } } })).toBe(true);
    expect(isAdVisual({ kind: "video", role: "video", meta: { kind: "ugc" } })).toBe(true);
    expect(isAdVisual({ kind: "video", role: "video", meta: { videoV2: { intent: "social_content" } } })).toBe(false);
    expect(isAdVisual({ kind: "image", role: "social" })).toBe(false);
    expect(isAdVisual({ kind: "video", role: "clip" })).toBe(false);
  });

  it("une publication vidéo organique ne reprend pas une publicité vidéo de la bibliothèque", async () => {
    const u = await createUser(`pubsep-${Date.now()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "cosmetic");
    grantProjectPlan(pid, "vendre");
    const p = loadProject(pid);
    const tiny = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#222" } }).png().toBuffer();
    await saveAsset({ projectId: pid, userId: u.id, data: videoByteFixture(), name: "pub.mp4", mime: "video/mp4", kind: "video", role: "video", folderKey: "videos.ads", origin: "generated", status: "approved", meta: { videoV2: { intent: "video_ad" } } });
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const one = fr(() => createOnePost(p, { kind: "video", date: tomorrow, time: "18:30", timezone: "Europe/Paris", platforms: [{ platform: "tiktok" }], lang: "fr" }));
    const est = estimateProduction(p, one.ids, { estimate: () => 0, aiActive: false }, { allowPaid: false });
    // Sans la séparation, la publicité vidéo serait reprise telle quelle (« library ») : le studio monte une vidéo.
    expect(est.lines[0].method).toBe("video_v2");
  });

  it("écran : sous-menu à gauche (Piloter / Créer / Gérer) ; plus de bouton qui transforme les annonces en publications", () => {
    const tab = fs.readFileSync("src/components/studio/tab-publicites.tsx", "utf8");
    expect(tab).toContain("data-ads-subnav");
    for (const s of ['"vue"', '"strategie"', '"image", "Publicité image"', '"video", "Publicité vidéo"', '"campagnes"', '"bibliotheque"']) expect(tab).toContain(s);
    expect(tab).toContain('<VideoV2Panel scope="ad" />');
    const camp = fs.readFileSync("src/components/studio/ad-campaigns.tsx", "utf8");
    expect(camp).not.toContain("Créer les publications organiques");
    const organic = fs.readFileSync("src/components/studio/video-gallery.tsx", "utf8");
    expect(organic).toContain('<VideoV2Panel scope="organic" />');
    expect(organic).toContain("!isAdVisual(a)");
  });
});
