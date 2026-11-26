/**
 * LE PLAFOND DES ESSAIS DU PROPRIÉTAIRE (26 novembre 2026, « Il faut arrêter de montrer des plafond aussi haut ça va faire
 * peur aux clients ») : le plafond donné peut être proche du probable ; aucun script ne refuse plus de partir sous la somme
 * des maxima ; chacun s'arrête proprement avant l'appel dont le pire cas dépasserait ce qui reste, dit ce qui est fait, ce
 * qu'il faudrait pour finir et comment reprendre. Sans aucun appel.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const SCRIPTS = ["essai-noms", "essai-esquisses", "essai-finalisation", "essai-planches", "essai-planche-en-vrai"];

describe("le plafond des essais", async () => {
  const E = await import("../scripts/syna-recette/plafond-des-essais");

  it("deux fois le probable, arrondi au demi-euro du dessus ; un plafond illisible ne laisse rien partir", () => {
    expect(E.plafondConseilleMicro(1_450_000)).toBe(3_000_000);
    expect(E.plafondConseilleMicro(1_000_000)).toBe(2_000_000);
    expect(E.plafondConseilleMicro(1_010_000)).toBe(2_500_000);
    expect(E.plafondConseilleMicro(0)).toBe(500_000);
    expect(E.plafondLu("3")).toBe(3_000_000);
    expect(E.plafondLu("2,50")).toBe(2_500_000);
    expect(E.plafondLu("abc")).toBeNull();
    expect(E.plafondLu(undefined)).toBeNull();
  });

  it("sous la somme des maxima : un avis, jamais un refus ; à l'arrêt, ce qui est fait, ce qu'il faut pour finir, comment reprendre", () => {
    expect(E.avisDuPlafond(3_000_000, { plafondMinimalMicro: 9_850_000, probableMicro: 1_450_000 })).toBe("Le plafond 3,0000 € est sous la somme des maxima 9,8500 € (probable 1,4500 €) : l'essai part quand même. Il s'arrête proprement avant tout appel dont le pire cas dépasserait ce qui reste, garde ses fichiers et dit ce qu'il faudrait pour finir.");
    expect(E.avisDuPlafond(9_850_000, { plafondMinimalMicro: 9_850_000 })).toBeNull();
    const l = E.lignesDeLArret({ depenseMicro: 2_400_000, plafondMicro: 3_000_000, plafondMinimalMicro: 9_850_000, fait: ["étape brand:study"], reprendre: "REPRENDRE=1." });
    expect(l[0]).toMatch(/^Arrêt propre : l'appel suivant aurait pu, au pire, dépasser ce qui restait du plafond \(2,4000 € dépensés sur 3,0000 €\) ; il n'est pas parti/);
    expect(l).toContain("- étape brand:study");
    expect(l.at(-1)).toBe("Pour finir : au plus 7,4500 € de plus, au pire (somme des maxima qui restent) ; REPRENDRE=1.");
  });

  it("aucun script d'essai ne refuse plus de partir sous la somme des maxima ; chacun dit son arrêt propre", () => {
    for (const s of SCRIPTS) {
      const src = fs.readFileSync(`scripts/syna-recette/${s}.mts`, "utf8") + fs.readFileSync(`scripts/syna-recette/${s}-outil.ts`, "utf8");
      expect(src, s).not.toMatch(/est sous le plafond minimal( exact)?[^`]*rien n'est lancé/);
      expect(src, s).toMatch(/lignesDeLArret\(|arretPropre/);
      expect(src, s).toMatch(/l'essai part quand même|avisDuPlafond\(/);
    }
  });
});
