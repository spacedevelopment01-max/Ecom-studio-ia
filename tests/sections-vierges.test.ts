import { describe, expect, it } from "vitest";
import { BLANK_CSS, BLANK_JS } from "../src/lib/syna-agent/custom-theme/blank";
import { builderAssets, catalogAssets } from "../src/lib/syna-agent/custom-theme/builder";

// Décision du propriétaire du 10 novembre 2026 : sections vierges dans la banque et l'outil de construction (cadres
// gris au bon format, repères en français, couleurs du client), avec un bouton « Voir un exemple rempli ».
describe("sections vierges de la banque et de l'outil de construction", () => {
  it("photos en cadres gris avec icône, textes de repère en français, bouton pour voir l'exemple rempli", () => {
    expect(BLANK_CSS).toContain("html.ct-blank [data-ct]:not([data-ct-own]) img:not(.ctw-logo)");
    expect(BLANK_JS).toContain('sec.hasAttribute("data-ct-own")'); // les sections déjà écrites pour la marque gardent leurs textes et photos
    expect(BLANK_CSS).toContain("object-position:-99999px");
    for (const t of ["Titre principal qui donne envie", "Titre de la section", "Bouton qui donne envie", "Voir un exemple rempli", "Revenir aux sections vierges", "Lien vers une page"]) expect(BLANK_JS).toContain(t);
    expect(() => new Function(BLANK_JS)).not.toThrow();
  });
  it("les flèches et les croix restent des flèches (diaporama, retour du propriétaire du 11 novembre 2026)", () => {
    const m = BLANK_JS.match(/function label\(b,txt\)\{[\s\S]*?\n  return len>14\?"Texte court":null\}/);
    expect(m).not.toBeNull();
    const label = new Function(`${m![0]}; return label;`)() as (b: unknown, t: string) => string | null;
    const btn = { tagName: "BUTTON", className: "" };
    globalThis.getComputedStyle = (() => ({ textTransform: "none" })) as unknown as typeof getComputedStyle;
    for (const t of ["←", "→", "‹", "›", "×"]) expect(label(btn, t)).toBeNull();
    expect(label(btn, "Ajouter")).toBe("Bouton");
  });
  it("branché sur la banque et sur l'outil de construction (jamais sur un vrai site)", () => {
    expect(catalogAssets([], "classique", null).js).toContain("ct-blank-sw");
    expect(builderAssets([]).js).toContain("ct-blank-sw");
    expect(catalogAssets([], "classique", null).css).toContain("html.ct-blank");
  });
});
