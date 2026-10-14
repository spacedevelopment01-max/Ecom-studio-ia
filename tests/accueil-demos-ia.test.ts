import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("Accueil : démonstrations refaites dans le studio avec l'IA", () => {
  const page = read("src/app/page.tsx");
  const script = read("scripts/build-demos.ts");

  it("les 5 clients de démonstration sont définis (casque, plusieurs produits, gourde, fleuriste, paysagiste)", () => {
    for (const id of ["casque", "tribunes", "gourde", "fleuriste", "paysagiste"]) expect(script).toContain(`id: "${id}"`);
    expect(script).toMatch(/id: "tribunes"[\s\S]*storeType: "multi"/);
  });

  it("chaque photo créée par l'IA est signalée comme telle, sans personne générée", () => {
    expect(script).toContain("Produit et photo d'origine créés par l'IA");
    expect(script).toContain("photos de jardins ont été créées par l'IA");
  });

  it("la page ne prétend plus que les démonstrations sont faites sans IA ni seulement à partir de Pixabay", () => {
    expect(page).not.toContain("sans l'IA des forfaits");
    expect(page).toContain("avec l'IA, comme pour un client");
  });

  it("les vidéos des anciennes démonstrations sont retirées en attendant d'être refaites", () => {
    expect(page).not.toContain("Publicités vidéo 9:16 des démonstrations");
  });
});
