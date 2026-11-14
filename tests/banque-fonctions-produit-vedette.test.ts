/**
 * Banque des sections : le panneau qui ajoute ou enlève les fonctions du bloc d'achat des « Produit vedette ».
 * Retour du propriétaire du 14 novembre 2026 : « je ne peux pas ajouter ou enlever les fonctions sur les sections produit
 * en vedette » (le script de la bibliothèque écoutait un panneau que la banque ne posait plus).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogAssets, PO_PANEL_FUNCTIONS, PO_PANEL_OFFERS } from "../src/lib/syna-agent/custom-theme/builder";

const DIR = path.join(process.cwd(), "public", "sections");
const libraryJs = fs.readFileSync(path.join(DIR, "library.js"), "utf8");
const libraryCss = fs.readFileSync(path.join(DIR, "library.css"), "utf8");

describe("banque des sections : fonctions des « Produit vedette »", () => {
  it("la banque pose un panneau au-dessus de chaque « Produit vedette », avec toutes les fonctions et les offres", () => {
    const { js } = catalogAssets([], "classique", null);
    expect(js).toContain('it.group==="produit-vedette"');
    expect(js).toContain('setAttribute("data-popanel","")');
    expect(js).toContain("data-pt=");
    expect(js).toContain("data-po-of=");
    for (const [key, label] of PO_PANEL_FUNCTIONS) { expect(js).toContain(`"${key}"`); expect(js).toContain(label); }
    for (const [key] of PO_PANEL_OFFERS) expect(js).toContain(`"${key}"`);
    // Le script se compile.
    expect(() => new Function(js)).not.toThrow();
  });

  it("chaque bouton correspond à une fonction que le bloc d'achat sait montrer ou cacher", () => {
    // Le script de la bibliothèque écoute le panneau et bascule « po<Clé> » sur la page…
    expect(libraryJs).toContain('closest("[data-popanel] button")');
    expect(libraryJs).toMatch(/"po"\+b\.dataset\.pt\.charAt\(0\)\.toUpperCase\(\)/);
    // …et la feuille montre chaque option quand sa clé vaut 1.
    for (const [key] of PO_PANEL_FUNCTIONS) expect(libraryCss, key).toContain(`html[data-po-${key}="1"] .po [data-opt="${key}"]`);
    for (const [key] of PO_PANEL_OFFERS.filter(([k]) => k !== "none")) expect(libraryJs, key).toContain(`of==="${key}"`);
  });
});
