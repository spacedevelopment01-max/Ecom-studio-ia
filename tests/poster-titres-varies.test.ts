/**
 * Affiches de publications : la signature n'est plus répétée sur toutes (essai ARVEN, 6 publications sur 8 avec le
 * même titre) ; les autres prennent un trait écrit par le client dans sa description, jamais un texte inventé.
 */
import { describe, expect, it } from "vitest";
import { descriptionTraits } from "@/lib/ads-v2/poster";
import { emptyProduct } from "@/lib/project-types";

const project = (summary: string, analyzedBy: "local" | "ai" = "local") => ({ business: "products", product: { ...emptyProduct(), summary, analyzedBy } }) as any;

describe("titres d'affiches variés", () => {
  it("traits tirés de la description du client", () => {
    const t = descriptionTraits(project("Montre chronographe : boîtier en acier poli, lunette graduée, cadran noir à trois compteurs argentés, guichet de date, bracelet en cuir brun surpiqué doublé de tissu bleu."));
    expect(t).toEqual(["Boîtier en acier poli", "Lunette graduée", "Guichet de date"]);
  });
  it("jamais tiré d'un résumé rédigé par l'IA ni d'un chiffre non vérifié", () => {
    expect(descriptionTraits(project("Montre : boîtier poli, lunette graduée", "ai"))).toEqual([]);
    expect(descriptionTraits(project("Gourde : garde le froid 24 h, bouchon en bambou"))).toEqual(["Bouchon en bambou"]);
  });
});
