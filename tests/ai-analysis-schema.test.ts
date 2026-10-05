import { describe, expect, it } from "vitest";
import { AnalysisSchema } from "@/lib/ai/tasks";

describe("analyse du produit : réponse de l'IA tolérée", () => {
  it("accepte une réponse un peu hors format (questions en trop, valeur nulle, source inattendue)", () => {
    const r = AnalysisSchema.safeParse({
      name: "Compagnon IA à porter autour du cou pour enfant",
      nameStatus: "proposed",
      category: "Compagnon vocal interactif",
      sector: "enfants",
      summary: "Petit boîtier rond à oreilles.",
      facts: [{ key: "battery", label: "Batterie", value: null, status: "unknown", source: "supplier" }, { key: "weight", label: "Poids", value: 45, status: "confirmed", source: "link" }],
      visual: { shape: "rond", materials: ["plastique"], labelText: [], hasLogo: false, description: "" },
      variants: [],
      questions: Array.from({ length: 7 }, (_, i) => ({ id: `q${i}`, question: "?", why: "", required: true, factKey: "price" })),
      claimsToAvoid: null,
      detailRegions: [{ label: "a", x: 0, y: 0, w: 1, h: 1 }, { label: "b", x: 0, y: 0, w: 1, h: 1 }, { label: "c", x: 0, y: 0, w: 1, h: 1 }, { label: "d", x: 0, y: 0, w: 1, h: 1 }],
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.questions).toHaveLength(5);
    expect(r.data.detailRegions).toHaveLength(3);
    expect(r.data.facts[0]).toMatchObject({ value: "", source: "ai" });
    expect(r.data.facts[1].value).toBe("45");
    expect(r.data.claimsToAvoid).toEqual([]);
  });

  it("secteur inconnu ramené à un secteur valide", () => {
    const r = AnalysisSchema.parse({ name: "x", nameStatus: "x", category: "", sector: "jouets", summary: "", facts: [], visual: null, variants: [], questions: [], claimsToAvoid: [], detailRegions: [] });
    expect(r.sector).toBe("maison");
    expect(r.nameStatus).toBe("proposed");
  });
});
