import { describe, expect, it } from "vitest";
import { BLANK_CSS, BLANK_JS } from "../src/lib/syna-agent/custom-theme/blank";
import { builderAssets, catalogAssets } from "../src/lib/syna-agent/custom-theme/builder";

// Décision du propriétaire du 10 novembre 2026 : sections vierges dans la banque et l'outil de construction (cadres
// gris au bon format, repères en français, couleurs du client), avec un bouton « Voir un exemple rempli ».
describe("sections vierges de la banque et de l'outil de construction", () => {
  it("photos en cadres gris avec icône, textes de repère en français, bouton pour voir l'exemple rempli", () => {
    expect(BLANK_CSS).toContain("html.ct-blank [data-ct] img:not(.ctw-logo)");
    expect(BLANK_CSS).toContain("object-position:-99999px");
    for (const t of ["Titre principal qui donne envie", "Titre de la section", "Bouton qui donne envie", "Voir un exemple rempli", "Revenir aux sections vierges", "Lien vers une page"]) expect(BLANK_JS).toContain(t);
    expect(() => new Function(BLANK_JS)).not.toThrow();
  });
  it("branché sur la banque et sur l'outil de construction (jamais sur un vrai site)", () => {
    expect(catalogAssets([], "classique", null).js).toContain("ct-blank-sw");
    expect(builderAssets([]).js).toContain("ct-blank-sw");
    expect(catalogAssets([], "classique", null).css).toContain("html.ct-blank");
  });
});
