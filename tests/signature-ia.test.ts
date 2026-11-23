/**
 * La signature « fait par l'IA » (C2PA) des images d'OpenAI est gardée quand le Studio range une image telle quelle
 * (22 novembre 2026, règlement européen sur l'IA, article 50). Aucun appel d'IA.
 */
import fs from "node:fs";
import zlib from "node:zlib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { aLaSignatureIa, estPng, pngSansPerte } from "@/lib/media/signature-ia";

/** Un PNG avec un bloc « caBX » (manifeste C2PA simulé), inséré juste après l'en-tête, avec son contrôle exact. */
async function pngSigne() {
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#336699" } }).png().toBuffer();
  const data = Buffer.from("jumb c2pa manifeste simule");
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write("caBX", 4, "latin1");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  const ihdrEnd = 8 + 12 + png.readUInt32BE(8);
  return Buffer.concat([png.subarray(0, ihdrEnd), head, data, crc, png.subarray(ihdrEnd)]);
}

describe("la signature « fait par l'IA » des images d'OpenAI", () => {
  it("elle se lit ; un ré-encodage l'efface ; ranger en PNG sans perte la garde", async () => {
    const signe = await pngSigne();
    expect(estPng(signe)).toBe(true);
    expect(aLaSignatureIa(signe)).toBe(true);
    // Ce que faisait la planche avant : ré-encoder, et la signature disparaissait.
    expect(aLaSignatureIa(await sharp(signe).png().toBuffer())).toBe(false);
    const garde = await pngSansPerte(signe);
    expect(garde.equals(signe)).toBe(true);
    expect(aLaSignatureIa(garde)).toBe(true);
    // Une image dans un autre format est convertie (rien à garder, rien d'inventé).
    const jpg = await sharp(signe).jpeg().toBuffer();
    expect(aLaSignatureIa(jpg)).toBe(false);
    expect(estPng(await pngSansPerte(jpg))).toBe(true);
  });

  it("la planche range chaque image d'OpenAI sans la ré-encoder ; le site et la galerie la rangent telle quelle", () => {
    const b = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(b).toContain("const png = await pngSansPerte(data), meta = await sharp(png).metadata();");
    expect(b).not.toContain("const png = await sharp(data).png().toBuffer(), meta");
  });
});
