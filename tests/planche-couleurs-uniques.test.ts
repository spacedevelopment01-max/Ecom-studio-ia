/**
 * Planche d'identité et charte : aucune couleur ni aucun nom de couleur en double (la planche ARVEN affichait
 * « Anthracite » deux fois : sa couleur principale est aussi sa couleur sombre), slogan une seule fois sur le téléphone.
 */
import { describe, expect, it } from "vitest";
import { boardColors, boardSwatches, phoneBrandTiles, uniqueColorNames } from "@/lib/media/identity-board";
import { paletteCards } from "@/lib/media/brand-book";
import { distinctColors, sameColor } from "@/lib/color";

const ARVEN = { primary: "#1E2225", secondary: "#E8DACF", accent: "#A86932", light: "#FAF7F5", dark: "#1E2225" };

describe("planche : couleurs sans doublon", () => {
  it("ARVEN : l'anthracite n'apparaît qu'une fois, chaque nom de couleur est unique", () => {
    const sw = boardSwatches(boardColors(ARVEN));
    expect(sw).toEqual(["#1E2225", "#E8DACF", "#A86932", "#FAF7F5"]);
    const names = uniqueColorNames(sw, "fr");
    expect(names.filter((n) => n === "Anthracite")).toHaveLength(1);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(["Anthracite", "Crème", "Terracotta", "Crème clair"]);
    expect(new Set(uniqueColorNames(sw, "en")).size).toBe(4);
  });

  it("palette à cinq couleurs distinctes : cinq nuances gardées (au plus cinq)", () => {
    const sw = boardSwatches(boardColors({ primary: "#2F4A43", secondary: "#8FA89B", accent: "#C46A3C", light: "#F4F0E8", dark: "#1E2621" }));
    expect(sw).toHaveLength(5);
    expect(distinctColors(sw)).toEqual(sw);
  });

  it("couleurs quasi identiques fusionnées (l'œil ne les distingue pas)", () => {
    expect(sameColor("#1E2225", "#202426")).toBe(true);
    expect(sameColor("#1E2225", "#E8DACF")).toBe(false);
  });

  it("charte PDF : une carte par couleur distincte, avec ses deux rôles", () => {
    expect(paletteCards(ARVEN)).toEqual([
      { key: "primary", roles: ["primary", "dark"] },
      { key: "secondary", roles: ["secondary"] },
      { key: "accent", roles: ["accent"] },
      { key: "light", roles: ["light"] },
    ]);
  });

  it("téléphone : le slogan n'est écrit qu'une fois, les autres cases portent le symbole", () => {
    const tiles = phoneBrandTiles(9, ["#1E2225", "#1E2225", "#E8DACF"], true);
    expect(tiles.filter((t) => t.kind === "tagline")).toHaveLength(1);
    expect(tiles.slice(1).every((t) => t.kind === "mark")).toBe(true);
    // Fonds sans doublon de couleur : alternance des couleurs distinctes.
    expect(tiles.slice(0, 2).map((t) => t.bg)).toEqual(["#1E2225", "#E8DACF"]);
    expect(phoneBrandTiles(4, ["#111111"], false).every((t) => t.kind === "mark")).toBe(true);
  });
});

describe("planche : produit posé sur son socle", () => {
  it("l'image du produit touche le bas de son cadre (jamais en l'air), centrée en largeur", async () => {
    const { containBottom } = await import("@/lib/media/identity-board");
    const calls: number[][] = [];
    const ctx = { drawImage: (_i: unknown, ...a: number[]) => calls.push(a) } as any;
    containBottom(ctx, { width: 200, height: 100 } as any, 10, 20, 100, 300);
    const [x, y, w, h] = calls[0];
    expect(y + h).toBe(320);
    expect(w).toBe(100);
    expect(x).toBe(10);
  });
});

describe("planche : textes raccourcis à la fin d'un mot", () => {
  it("« … MÂCON ET 30 KM AUTOU » n'arrive plus : coupe au dernier mot entier, avec « … »", async () => {
    const { shorten } = await import("@/lib/media/identity-board");
    const t = "PLÂTRIER PEINTRE, MÂCON ET 30 KM AUTOUR";
    expect(shorten(t, 38)).toBe("PLÂTRIER PEINTRE, MÂCON ET 30 KM…");
    expect(shorten("Plâtrier peintre, Mâcon et 30 km autour", 26)).toBe("Plâtrier peintre, Mâcon…");
    expect(shorten("Le temps, bien porté", 26)).toBe("Le temps, bien porté");
  });
});
