import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withFirstVariant } from "../src/lib/project-types";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("onglet Produit : variantes", () => {
  const both = [{ name: "Coloris", values: ["Noir", "Brun"] }, { name: "Taille", values: ["40 mm", "42 mm"] }];

  it("enregistrer la première variante garde les autres (la Taille n'est pas effacée)", () => {
    expect(withFirstVariant(both, " Coloris ", "Noir, Brun, Bleu")).toEqual([{ name: "Coloris", values: ["Noir", "Brun", "Bleu"] }, both[1]]);
  });

  it("vider la première variante ne retire qu'elle", () => {
    expect(withFirstVariant(both, "Coloris", " , ")).toEqual([both[1]]);
    expect(withFirstVariant([], "", "")).toEqual([]);
  });

  it("l'onglet utilise bien cette fusion", () => {
    expect(read("src/components/studio/tab-produit.tsx")).toMatch(/withFirstVariant\(data\?\.product\.variants/);
  });
});

describe("onglets Produit et Activité : aucun bouton muet en cas d'erreur", () => {
  it("« Réanalyser tout le projet » affiche l'erreur (abonnement, IA coupée…)", () => {
    for (const f of ["src/components/studio/tab-produit.tsx", "src/components/studio/tab-activite.tsx"]) {
      const s = read(f);
      const i = s.indexOf("/resume`");
      expect(i, f).toBeGreaterThan(0);
      const around = s.slice(i - 200, i + 400);
      expect(around, f).toMatch(/try \{/);
      expect(around, f).toMatch(/toast\("bad"/);
    }
  });

  it("catalogue : un prix illisible est signalé au lieu d'être ignoré", () => {
    expect(read("src/components/studio/catalog-panel.tsx")).toMatch(/c === undefined\) \{ toast\("bad"/);
  });
});

describe("onglet Produit : « Ce que montre la photo » jamais vide", () => {
  it("un message explique l'absence de lecture visuelle (IA coupée ou photo illisible), en FR et en EN", () => {
    const s = read("src/components/studio/tab-produit.tsx");
    expect(s).toContain("La lecture de la photo (forme, matières, texte visible) se fait avec l'IA.");
    expect(s).toContain("Reading the photo (shape, materials, visible text) uses AI.");
  });
});
