/** Un modèle qui voile le bas de la photo n'est jamais posé sur une photo du produit (cas réel : la gourde Cime cachée). */
import { describe, expect, it } from "vitest";
import { TEMPLATES } from "../src/lib/ads-v2/library";

describe("Modèles qui cachent le produit", () => {
  it("« Voile en biais » est marqué comme couvrant le sujet", () => {
    expect(TEMPLATES.find((t) => t.id === "slant-veil")?.coversSubject).toBe(true);
  });
});
