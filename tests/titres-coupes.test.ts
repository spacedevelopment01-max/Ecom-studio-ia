/**
 * Titres jamais coupés au milieu d'une idée (essai ARVEN) : « UNE IDÉE À OFFRIR : CHRONOGRAPHE ACIER ET » sur une
 * publicité, « Comprendre » seul sur une publication.
 */
import { describe, expect, it } from "vitest";
import { words } from "@/lib/ads-v2/copy";
import { short } from "@/lib/social-v2/copy";

describe("titres coupés", () => {
  it("accroche de publicité : la partie entière qui tient, jamais « … acier et »", () => {
    expect(words("Une idée à offrir : Chronographe acier et cuir", 7)).toBe("Chronographe acier et cuir");
    expect(words("Partez léger. Voyez grand.", 7)).toBe("Partez léger. Voyez grand.");
    expect(words("Une montre robuste et élégante pour tous les jours de la semaine", 6)).toBe("Une montre robuste et élégante");
  });

  it("titre de publication : jamais un « Comprendre » sans son sujet", () => {
    expect(short("Comprendre : boîtier en acier poli et lunette graduée")).toBe("Boîtier en acier poli et lunette graduée");
    expect(short("Chronographe acier : boîtier poli, lunette graduée, cadran noir à trois compteurs")).toBe("Chronographe acier");
    expect(short("Bouquets du jour")).toBe("Bouquets du jour");
  });
});
