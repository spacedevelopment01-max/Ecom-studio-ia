/**
 * Mise en valeur du produit détouré :
 *  - les morceaux isolés du détourage (bout de câble, reste de fond) sont effacés ;
 *  - une photo libre sur laquelle le produit a été collé n'est jamais reprise comme fond de publication ;
 *  - aucun « [À compléter : …] » n'apparaît sur un visuel.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Produit détouré propre", () => {
  it("dropIslands efface les petits fragments séparés et garde le produit", async () => {
    const { dropIslands } = await import("@/lib/media/cutout");
    const w = 200, h = 200, raw = Buffer.alloc(w * h * 4);
    const set = (x: number, y: number) => { const i = (y * w + x) * 4; raw[i] = raw[i + 1] = raw[i + 2] = 40; raw[i + 3] = 255; };
    for (let y = 40; y < 160; y++) for (let x = 40; x < 140; x++) set(x, y); // produit
    for (let y = 10; y < 14; y++) for (let x = 170; x < 174; x++) set(x, y); // fragment
    const png = await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const out = await sharp(await dropIslands(png)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const a = (x: number, y: number) => out.data[(y * out.info.width + x) * 4 + 3];
    expect(a(90, 100)).toBe(255);
    expect(a(171, 11)).toBe(0);
  });

  it("une photo libre avec le produit collé n'est pas un fond de publication", async () => {
    const { isPastedOnStock } = await import("@/lib/social-v2/deps");
    expect(isPastedOnStock({ meta: JSON.stringify({ stock: { source: "pixabay" } }) })).toBe(true);
    expect(isPastedOnStock({ meta: JSON.stringify({ recipe: "Mise en scène studio" }) })).toBe(false);
    expect(isPastedOnStock({ meta: null })).toBe(false);
  });

  it("aucun texte « À compléter » sur un visuel publicitaire", async () => {
    const { noPlaceholders } = await import("@/lib/ads-v2/compose");
    const out = noPlaceholders({ brand: "Sève", headline: "[À compléter : titre]", subline: "Savon doux [À compléter : poids]", eyebrow: "[To complete: tag]", features: ["Fait main", "[À compléter : origine]"] } as any);
    expect(out.headline).toBe("Sève");
    expect(out.subline).toBe("Savon doux");
    expect(out.eyebrow).toBeNull();
    expect(out.features).toEqual(["Fait main"]);
  });
});
