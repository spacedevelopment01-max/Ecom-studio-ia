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
