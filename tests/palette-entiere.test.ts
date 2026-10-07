/** Changer les cinq couleurs d'un coup : palettes prêtes valides, palette autour d'une couleur, codes collés. */
import { describe, expect, it } from "vitest";
import { PALETTE_SETS, paletteFromColor, parsePalette } from "@/lib/palette-sets";
import { contrast, luminance } from "@/lib/color";

const HEX = /^#[0-9A-F]{6}$/;
const roles = ["primary", "secondary", "accent", "light", "dark"] as const;

describe("palette entière", () => {
  it("palettes prêtes : cinq codes valides, noms FR/EN, fond clair et sombre lisibles", () => {
    expect(PALETTE_SETS.length).toBeGreaterThanOrEqual(12);
    for (const s of PALETTE_SETS) {
      expect(s.name.fr && s.name.en).toBeTruthy();
      for (const r of roles) expect(s.palette[r]).toMatch(HEX);
      expect(contrast(s.palette.dark, s.palette.light)).toBeGreaterThan(12);
      expect(contrast(s.palette.primary, s.palette.light)).toBeGreaterThan(4.5);
    }
  });
  it("une seule couleur → palette complète de la même famille (clair très clair, sombre très sombre)", () => {
    const p = paletteFromColor("#8a4b1c");
    expect(p.primary).toBe("#8A4B1C");
    for (const r of roles) expect(p[r]).toMatch(HEX);
    expect(luminance(p.light)).toBeGreaterThan(0.85);
    expect(luminance(p.dark)).toBeLessThan(0.02);
    expect(p.accent).not.toBe(p.primary);
    expect(paletteFromColor("#777777").accent).toMatch(HEX);
  });
  it("cinq codes collés, dans l'ordre des cases ; moins de cinq → refus", () => {
    expect(parsePalette("#8a4b1c, EADFCB\n#E09A2D #F8F4EC #221C17")).toEqual({ primary: "#8A4B1C", secondary: "#EADFCB", accent: "#E09A2D", light: "#F8F4EC", dark: "#221C17" });
    expect(parsePalette("#8a4b1c #EADFCB")).toBeNull();
  });
});
