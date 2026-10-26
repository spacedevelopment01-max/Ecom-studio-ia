import {videoByteFixture} from "./video-byte-fixture";
/**
 * Banque du THÈME (création du projet) : 15 images libres de droits, 3 vidéos pour un service, 1 pour un produit
 * seulement si une vidéo vraiment liée existe. Ces médias alimentent le site, jamais les publications ni les publicités
 * (fond d'affiche, bibliothèque des publications).
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("Banque du thème", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset, getAsset, assetMeta } = await import("@/lib/library");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { fillThemeBank, THEME_BANK_IMAGES } = await import("@/lib/media/theme-bank");
  const { localRender } = await import("@/lib/social-v2/deps");
  const jpg = (c: string) => sharp({ create: { width: 800, height: 600, channels: 3, background: c } }).jpeg().toBuffer();
  const stockImage = async (p: { id: string; userId: string }, k: number) => (await saveAsset({ projectId: p.id, userId: p.userId, data: await jpg("#88aa66"), name: `stock-${k}.jpg`, mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "import", status: "ready", meta: { stock: { source: "pixabay", id: `${k}`, page: "", author: "a", license: "pixabay" } } })).id;
  const stockVideo = async (p: { id: string; userId: string }, k: number) => (await saveAsset({ projectId: p.id, userId: p.userId, data: videoByteFixture(), name: `v${k}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", status: "ready", meta: { stock: { source: "pixabay", id: `v${k}` } } })).id;

  async function project(kind: "restaurant" | "hightech") {
    const u = await createUser(`bt-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    return loadProject(seedImageFixture(u.id, kind));
  }

  it("service : 3 vidéos marquées « thème », AUCUNE photo de banque comme image du site (images 100 % IA)", async () => {
    const p = await project("restaurant");
    let asked = 0;
    let photosAsked = 0;
    const r = await fillThemeBank(null, p, {
      productPhotos: async () => (photosAsked++, []),
      servicePhotos: async (_i, pp, target) => (photosAsked++, Promise.all(Array.from({ length: target }, (_, k) => stockImage(pp, k)))),
      clip: async (_i, pp, k) => (asked++, { assetId: await stockVideo(pp, k) }),
    });
    expect(THEME_BANK_IMAGES).toBe(0);
    expect(r.images).toBe(0);
    expect(photosAsked).toBe(0);
    expect(r.videos).toBe(3);
    expect(asked).toBe(3);
  });

  it("produit : une seule vidéo, et aucune si rien de vraiment lié n'est trouvé", async () => {
    const p = await project("hightech");
    const none = await fillThemeBank(null, p, { productPhotos: async () => [], servicePhotos: async () => [], clip: async () => null });
    expect(none.videos).toBe(0);
    let n = 0;
    const one = await fillThemeBank(null, p, { productPhotos: async () => [], servicePhotos: async () => [], clip: async (_i, pp, k) => (n++, { assetId: await stockVideo(pp, k) }) });
    expect(one.videos).toBe(1);
    expect(n).toBe(1);
  });

  it("jamais une photo libre de droits en fond de publication (rendu gratuit)", async () => {
    const p = await project("restaurant");
    for (let k = 0; k < 4; k++) await stockImage(p, 100 + k);
    for (let i = 0; i < 6; i++) {
      const r = await localRender(p, { id: `bt-post-${i}`, network: "instagram", format: "feed", title: "Plat du jour", caption: "", pillar: null, objective: null, headline: "Plat du jour", scheduled_at: null });
      const bg = assetMeta<any>(getAsset(r.assetId!)!).poster?.backgroundAssetId;
      if (bg) expect(assetMeta<any>(getAsset(bg)!).stock).toBeUndefined();
    }
  });
});
