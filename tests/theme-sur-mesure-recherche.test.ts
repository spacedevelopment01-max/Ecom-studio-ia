/**
 * Recherche du thème sur mesure (essai réel Éclat de thé du 10 novembre 2026) : la section de recherche posée sous
 * l'en-tête restait ouverte en haut de chaque page, avec la liste des produits. Elle est cachée et s'ouvre à la loupe.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/custom-theme/render.ts"), "utf8");

describe("recherche du thème sur mesure", () => {
  it("cachée par défaut (sauf la recherche plein écran Moderne), ouverte et fermée par la loupe de l'en-tête", () => {
    expect(src).toContain('.tb-wrap .frame>[data-ct-role="search"]:not(.zm18):not(:has(.zm18)):not(.ct-open){display:none}');
    expect(src).toContain('s2.classList.toggle("ct-open")');
    expect(src).toMatch(/!sb\.hasAttribute\("data-search"\)/); // un en-tête qui a sa propre recherche la garde
  });
});
