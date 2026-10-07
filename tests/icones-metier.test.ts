/** Bibliothèque d'icônes libres (Tabler, MIT) : un vrai symbole du métier pour le logo, lisible à 16 px. */
import { describe, expect, it } from "vitest";
import { iconSvg, searchIcons, tradeIcon, tradeKeywords } from "@/lib/media/icon-library";
import { localRoutes } from "@/lib/engine/creative-direction";
import { runWithLang } from "@/lib/i18n-server";

describe("icônes du métier", () => {
  it("métier en français → icônes parlantes, sans logo de marque ni icône hors sujet", () => {
    expect(tradeKeywords("Plâtrerie peinture")).toEqual(expect.arrayContaining(["paint", "brush", "wall"]));
    const names = searchIcons(tradeKeywords("Menuiserie"), 6);
    expect(names).toContain("hammer");
    expect(names.some((n) => n.startsWith("brand-") || n.startsWith("binary"))).toBe(false);
  });
  it("icône convertie en un seul tracé SVG, sans texte ni lien", () => {
    const svg = iconSvg("scissors")!;
    expect(svg.match(/<path/g)).toHaveLength(1);
    expect(svg).not.toMatch(/<text|href|script/);
  });
  it("piste « Symbole du métier » proposée en premier dans la piste produit", async () => {
    await runWithLang({ ui: "fr", content: "fr" }, async () => {
      const icon = await tradeIcon("Plâtrerie peinture");
      expect(icon?.name).toBeTruthy();
      const r = await localRoutes({ name: "Sébastien Blanc", palette: { primary: "#8A3B26", secondary: "#E9DDD3", accent: "#B5714A", light: "#F7F3EF", dark: "#1C1714" }, direction: "atelier" }, { cutout: null, library: "brush", icon });
      expect(r.produit[0]).toMatchObject({ name: "Symbole du métier", markKind: "library" });
      expect(r.produit[0].mark).toBeTruthy();
      expect(r.produit[0].why).toMatch(/licence MIT/);
    });
  });
});
