/** Métier détecté : un restaurant n'est pas un traiteur (libellé transmis aux directions de logo et au client). */
import { describe, expect, it } from "vitest";
import { resolveTrade } from "@/lib/brain/trade";

describe("métier : restaurant ou traiteur", () => {
  it("restaurant, bistrot, brasserie → restaurant ; traiteur → traiteur", () => {
    for (const t of ["Restaurant végétarien", "Bistrot de quartier", "Brasserie lyonnaise", "Cuisine végétarienne"]) expect(resolveTrade(t.toLowerCase()).labels.fr, t).toBe("restaurant");
    for (const t of ["Traiteur pour mariages", "Chef cuisinier à domicile"]) expect(resolveTrade(t.toLowerCase()).labels.fr, t).toBe("traiteur");
  });
});
