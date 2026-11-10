/**
 * Exigence 2.4 du propriétaire (audit du 10 novembre 2026) : jamais de fond carré autour du logo. Le fond clair est
 * retiré depuis les bords (crème compris) sans percer les blancs intérieurs du dessin ; une plaque sombre reste.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { cleanArtwork } from "@/lib/logo-v2/artwork";

async function pixels(svg: string, bg: string) {
  const out = await cleanArtwork(await sharp(Buffer.from(svg)).flatten({ background: bg }).png().toBuffer());
  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { at: (x: number, y: number) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)], w: info.width, h: info.height };
}

describe("logo : fond retiré depuis les bords", () => {
  it("fond crème effacé, lettre blanche à l'intérieur d'un badge gardée", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="100%" height="100%" fill="#F0EEE8"/><rect x="60" y="20" width="80" height="80" rx="10" fill="#1d2a3a"/><rect x="90" y="40" width="20" height="40" fill="#ffffff"/></svg>`;
    const p = await pixels(svg, "#F0EEE8");
    expect(p.at(1, 1)[3]).toBe(0); // coin : transparent
    expect(p.at(Math.floor(p.w / 2), Math.floor(p.h / 2))).toEqual([255, 255, 255, 255]); // blanc intérieur gardé
  });

  it("fond sombre voulu par le dessin : jamais effacé", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="100%" height="100%" fill="#111111"/><circle cx="100" cy="60" r="30" fill="#e0b04a"/></svg>`;
    const p = await pixels(svg, "#111111");
    // (le recadrage serré garde le carré du dessin ; marge transparente autour) : le coin du carré reste sombre et plein
    const pad = Math.round((p.w - 24) * 0.06 / 1.12) + 8;
    expect(p.at(pad + 1, pad + 1)).toEqual([17, 17, 17, 255]);
  });
});
