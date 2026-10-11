import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { fillInteriorHoles } from "@/lib/media/cutout";

/** Photo 60×30 sur fond blanc : à gauche un carré noir à languette jaune, à droite un carré noir percé (on voit le fond). */
async function scene() {
  const W = 60, H = 30;
  const rgb = Buffer.alloc(W * H * 3, 255);
  const alpha = Buffer.alloc(W * H, 0);
  const set = (x: number, y: number, c: number[], a: number) => { const p = y * W + x; rgb.set(c, p * 3); alpha[p] = a; };
  for (let y = 5; y < 25; y++) for (let x = 5; x < 25; x++) set(x, y, [0, 0, 0], 255);
  for (let y = 12; y < 18; y++) for (let x = 12; x < 18; x++) set(x, y, [240, 210, 40], 0); // languette jaune découpée à tort
  for (let y = 5; y < 25; y++) for (let x = 35; x < 55; x++) set(x, y, [0, 0, 0], 255);
  for (let y = 12; y < 18; y++) for (let x = 42; x < 48; x++) set(x, y, [255, 255, 255], 0); // vrai jour : fond visible
  const original = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  const rgba = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) { rgba.set(rgb.subarray(p * 3, p * 3 + 3), p * 4); rgba[p * 4 + 3] = alpha[p]; }
  const cut = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  return { W, original, cut };
}

describe("détourage", () => {
  it("rebouche un trou intérieur de la couleur du produit, garde un vrai jour sur le fond", async () => {
    const { W, original, cut } = await scene();
    const out = await sharp(await fillInteriorHoles(cut, original)).raw().toBuffer();
    const a = (x: number, y: number) => out[(y * W + x) * 4 + 3];
    expect(a(14, 14)).toBe(255); // languette rendue opaque
    expect(out[(14 * W + 14) * 4 + 2]).toBeLessThan(100); // avec sa vraie couleur (jaune : peu de bleu)
    expect(a(44, 14)).toBe(0); // le jour sur le fond reste transparent
    expect(a(1, 1)).toBe(0); // le fond reste transparent
  });
});

describe("second détourage par la couleur du fond", () => {
  it("fond uni : produit gardé entier, fond transparent ; fond chargé : refusé (jamais un détourage grossier)", async () => {
    const { cutoutProduct, CutoutUnavailable } = await import("@/lib/media/cutout");
    const W = 400, H = 300;
    const plain = await sharp({ create: { width: W, height: H, channels: 3, background: "#f4f4f2" } })
      .composite([{ input: await sharp({ create: { width: 220, height: 120, channels: 3, background: "#6b6f75" } }).png().toBuffer(), left: 90, top: 90 }])
      .jpeg().toBuffer();
    const cut = await cutoutProduct(plain, { method: "flood" });
    expect(cut.method).toBe("flood");
    // Le produit entier est gardé (bord gauche compris) et le fond est retiré : le cadre retenu est celui du produit.
    expect(cut.bbox.x).toBeGreaterThanOrEqual(78);
    expect(cut.bbox.x).toBeLessThanOrEqual(92);
    expect(cut.bbox.w).toBeGreaterThanOrEqual(214);
    expect(cut.bbox.w).toBeLessThanOrEqual(240);
    const { data, info } = await sharp(cut.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const a = (x: number, y: number) => data[(Math.floor(y) * info.width + Math.floor(x)) * 4 + 3];
    expect(a(info.width / 2, info.height / 2)).toBeGreaterThan(200);
    expect(a(info.width * 0.08, info.height / 2)).toBeGreaterThan(200);
    expect(a(0, 0)).toBeLessThan(60);
    const noise = Buffer.alloc(W * H * 3);
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) % 251;
    const busy = await sharp(noise, { raw: { width: W, height: H, channels: 3 } }).jpeg().toBuffer();
    await expect(cutoutProduct(busy, { method: "flood" })).rejects.toBeInstanceOf(CutoutUnavailable);
  });
});
