/** Le logo évoque l'activité réelle : pictogramme du métier (jamais un diamant pour un garage), pertinence exigée de l'IA. */
import { describe, expect, it } from "vitest";
import { symbolFor } from "@/lib/engine/identity";
import { routePassed } from "@/lib/engine/creative-direction";
import { emptyProduct, emptyServiceProfile } from "@/lib/project-types";

const svc = (name: string, category: string, summary = "") => ({ business: "services", product: { ...emptyProduct(), name, category, summary, sector: "conseil" }, catalog: [], services: emptyServiceProfile() }) as any;

describe("logo en lien avec l'activité", () => {
  it.each([
    ["AutoDim", "Carrosserie et peinture automobile", "car"],
    ["Garage du Centre", "Mécanique générale", "car"],
    ["Atelier Teinte", "Peintre en bâtiment", "brush"],
    ["Studio Mèche", "Salon de coiffure", "scissors"],
    ["Volt Services", "Électricien", "bolt"],
    ["Clé Minute Lyon", "Serrurier", "key"],
    ["Maison Pierre", "Rénovation et maçonnerie", "house"],
  ])("%s (%s) → %s", (name, category, sym) => {
    expect(symbolFor(svc(name, category))).toBe(sym);
  });

  it("thé (avec accent) → feuille", () => {
    expect(symbolFor({ business: "products", product: { ...emptyProduct(), name: "Thé vert du matin", category: "Thé", sector: "alimentation" }, catalog: [] } as any)).toBe("leaf");
  });

  it("un produit garde son pictogramme (infusion → feuille)", () => {
    expect(symbolFor({ business: "products", product: { ...emptyProduct(), name: "Infusion du soir", category: "Infusion", sector: "alimentation" }, catalog: [] } as any)).toBe("leaf");
  });

  it("piste de l'IA hors sujet (pertinence < 7) : jamais montrée, même bien notée ailleurs", () => {
    const good = { scores: { originality: 9, memorability: 9, relevance: 8, simplicity: 9, smallSizes: 9, coherence: 9, distinctiveness: 9 }, cliche: false, resemblesKnownBrand: false, readsAsLetters: null, issues: [], fix: "" };
    expect(routePassed(good, "ai")).toBe(true);
    expect(routePassed({ ...good, scores: { ...good.scores, relevance: 6 } }, "ai")).toBe(false);
  });
});
