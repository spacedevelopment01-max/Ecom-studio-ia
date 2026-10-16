/**
 * Fond enfermé dans le produit (intérieur de la boucle d'un bracelet, d'une anse) : rendu transparent ; le produit
 * lui-même (matière, cadran clair texturé) reste opaque. Essai réel ARVEN : fond blanc visible dans la boucle.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { clearEnclosedBackground } from "@/lib/media/cutout";

describe("détourage : fond enfermé dans le produit", () => {
  it("l'intérieur d'un anneau devient transparent, l'anneau et un cadran clair texturé restent", async () => {
    const W = 300, H = 300;
    const rgb = Buffer.alloc(W * H * 3);
    const alpha = Buffer.alloc(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        const r = Math.hypot(x - 150, y - 150);
        const dial = Math.hypot(x - 60, y - 60) < 30;
        // Fond clair avec une ombre douce ; anneau brun ; « cadran » clair rayé (texture) ; produit = anneau + cadran.
        let c = [236 - Math.round(r / 20), 234 - Math.round(r / 20), 230 - Math.round(r / 20)];
        let opaque = false;
        if (r >= 60 && r <= 100) (c = [120, 70, 35]), (opaque = true);
        else if (r < 60) opaque = true; // fond enfermé : le modèle de détourage l'a gardé
        if (dial) (c = (x + y) % 6 < 3 ? [240, 240, 240] : [60, 60, 60]), (opaque = true);
        rgb.set(c, p * 3);
        alpha[p] = opaque ? 255 : 0;
      }
    const original = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
    const rgba = Buffer.alloc(W * H * 4);
    for (let p = 0; p < W * H; p++) rgba.set([rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2], alpha[p]], p * 4);
    const cut = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
    const out = await clearEnclosedBackground(cut, original);
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const a = (x: number, y: number) => data[(y * W + x) * 4 + 3];
    expect(a(150, 150)).toBe(0); // intérieur de l'anneau
    expect(a(150, 70)).toBe(255); // anneau
    expect(a(60, 60)).toBe(255); // cadran clair texturé
  });
});
