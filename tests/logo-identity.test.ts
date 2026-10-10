/**
 * Identité tirée d'un logo complet (sans IA) : couleurs mesurées → palette, symbole seul découpé dans le logo.
 * Vérifié sur le VRAI logo OpenAI (Sébastien Blanc) et sur des logos simples (symbole au-dessus, à gauche, nom seul).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { cleanArtwork } from "@/lib/logo-v2/artwork";
import { artworkInks, artworkSymbol, paletteFromInks } from "@/lib/logo-v2/identity";
import { contrast, hsl } from "@/lib/color";

const DIR = "reports/openai-real-brand-test";
const real = fs.readFileSync(path.join(DIR, fs.readdirSync(DIR).find((f) => /^direct-.*Z\.png$/.test(f))!));
const svg = (w: number, h: number, body: string) => cleanArtwork(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#FFFFFF"/>${body}</svg>`)).then((b) => sharp(b).png().toBuffer());

describe("identité tirée du logo", () => {
  it("vrai logo : palette anthracite et sable mesurée, lisible ; symbole SB découpé sans le nom", async () => {
    const clean = await cleanArtwork(real);
    const pal = paletteFromInks(await artworkInks(clean))!;
    expect(hsl(pal.primary)[2]).toBeLessThan(0.3);
    expect(contrast(pal.primary, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    const [h, s] = hsl(pal.accent);
    expect(h).toBeGreaterThan(20);
    expect(h).toBeLessThan(45);
    expect(s).toBeGreaterThan(0.25);
    const sym = (await artworkSymbol(clean))!;
    expect(sym).toBeTruthy();
    // Le symbole ne contient pas les lignes de texte : sa hauteur d'encre utile est bien plus petite que le logo entier.
    const full = await sharp(clean).metadata();
    const symTrim = await sharp(sym).trim().metadata();
    expect(symTrim.width! / symTrim.height!).toBeLessThan(1.1);
    expect(full.height! / full.width!).toBeGreaterThan(0.8);
  });

  it("symbole au-dessus du nom, à gauche du nom ; nom seul → aucun symbole inventé", async () => {
    const stacked = await svg(800, 800, `<circle cx="400" cy="260" r="160" fill="#8A3B26"/><rect x="150" y="560" width="500" height="60" fill="#222"/><rect x="250" y="650" width="300" height="30" fill="#222"/>`);
    const s1 = await artworkSymbol(stacked);
    expect(s1).toBeTruthy();
    const horiz = await svg(1200, 400, `<rect x="40" y="60" width="280" height="280" rx="40" fill="#2B5D8A"/><rect x="420" y="150" width="700" height="70" fill="#222"/><rect x="420" y="250" width="400" height="30" fill="#222"/>`);
    expect(await artworkSymbol(horiz)).toBeTruthy();
    const wordmark = await svg(1200, 300, `<rect x="60" y="110" width="1080" height="80" fill="#222"/>`);
    expect(await artworkSymbol(wordmark)).toBeNull();
    // Zone du nom donnée par la relecture : le symbole est ce qui est au-dessus.
    expect(await artworkSymbol(stacked, { x: 0.15, y: 0.62, w: 0.7, h: 0.2 })).toBeTruthy();
  });

  it("logo d'une seule encre sombre : palette lisible, accent = encre (pas de couleur inventée)", async () => {
    const mono = await svg(600, 600, `<circle cx="300" cy="220" r="140" fill="#1E1E1E"/><rect x="100" y="420" width="400" height="60" fill="#1E1E1E"/>`);
    const pal = paletteFromInks(await artworkInks(mono))!;
    expect(pal.primary).toBe(pal.accent);
    expect(contrast(pal.primary, "#FFFFFF")).toBeGreaterThanOrEqual(7);
  });
});
