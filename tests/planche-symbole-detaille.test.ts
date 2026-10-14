/**
 * Planche d'identité : un symbole plein et détaillé (écusson avec chiffres, emblème dessiné) garde ses couleurs au
 * lieu d'être recoloré en une tache vide (constaté : l'écusson des Tribunes) ; un symbole au trait reste recolorable.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { isDetailedSolidMark } from "../src/lib/media/identity-board";

const svg = (body: string) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">${body}</svg>`)).png().toBuffer();

describe("Symbole détaillé sur la planche d'identité", () => {
  it("écusson plein avec détails intérieurs : couleurs gardées", async () => {
    const crest = await svg(`<path d="M20 10 H180 V120 Q100 200 20 120 Z" fill="#1d2a5a"/><rect x="40" y="40" width="50" height="60" fill="#f4efe6"/><rect x="110" y="40" width="50" height="60" fill="#c8102e"/><circle cx="100" cy="135" r="18" fill="#f4efe6"/>`);
    expect(await isDetailedSolidMark(crest)).toBe(true);
  });

  it("symbole au trait (fleur stylisée) : recolorable", async () => {
    const line = await svg(`<g fill="none" stroke="#2f5d3a" stroke-width="6"><circle cx="100" cy="80" r="40"/><path d="M100 120 V190 M100 160 Q70 140 60 150"/></g>`);
    expect(await isDetailedSolidMark(line)).toBe(false);
  });

  it("aplat d'une seule couleur : recolorable", async () => {
    expect(await isDetailedSolidMark(await svg(`<circle cx="100" cy="100" r="80" fill="#333"/>`))).toBe(false);
  });

  it("image vide : rien à garder", async () => {
    expect(await isDetailedSolidMark(await sharp({ create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer())).toBe(false);
  });
});
