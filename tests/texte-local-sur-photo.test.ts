/** Texte posé par le studio sur une photo IA sans texte : textes exacts, bouton seulement pour une publicité, jamais sur le produit. */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Texte local sur photo IA", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { textOnPhotoDoc, freeSpace } = await import("@/lib/image-v2/text-layer");
  // Photo : fond clair calme en haut, produit (motif chargé) en bas.
  const photo = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: "#EEE8E0" } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="700">${Array.from({ length: 60 }, (_, k) => `<rect x="${(k % 10) * 108}" y="${Math.floor(k / 10) * 116}" width="54" height="58" fill="${k % 2 ? "#222" : "#a63"}"/>`).join("")}</svg>`), top: 650, left: 0 }])
    .jpeg().toBuffer();
  it("zone libre mesurée en haut ; accroche exacte ; bouton pour une publicité, pas pour une publication", async () => {
    const u = await createUser(`txt-${Date.now()}@test.fr`, "motdepasse-test", "T");
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const free = await freeSpace(photo, 1080, 1350);
    expect(free.top).toBeGreaterThan(0.4);
    expect(free.bottom).toBeLessThan(0.05);
    await runWithLang({ ui: "fr", content: "fr" }, async () => {
      const ad = await textOnPhotoDoc(p, { photo, photoAssetId: "ph", aspect: "4:5", purpose: "ad", texts: { hook: "Un teint net", secondary: "Sérum 30 ml", cta: "Découvrir" } });
      expect(ad.side).toBe("top");
      expect(ad.doc.layers.find((l) => l.role === "title")).toMatchObject({ text: "Un teint net" });
      expect(ad.doc.layers.some((l) => l.role === "cta")).toBe(true);
      const post = await textOnPhotoDoc(p, { photo, photoAssetId: "ph", aspect: "4:5", purpose: "post", texts: { hook: "Un teint net", cta: "Découvrir" } });
      expect(post.doc.layers.some((l) => l.role === "cta")).toBe(false);
    });
  });
});
