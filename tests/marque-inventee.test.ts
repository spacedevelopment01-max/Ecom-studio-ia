import { describe, expect, it } from "vitest";
import { brandIssues, copiesSource, finalizeBrand, sourceWords } from "@/lib/engine/brand-check";

const product = { name: "Compagnon IA pour enfant", nameStatus: "proposed", category: "Compagnon vocal", facts: [], questions: [], visual: { colors: [], labelText: ["SOVA", "VLGSKY"] } } as any;
const pal = { primary: "#8A2442", secondary: "#F3D9DF", accent: "#C9506E", light: "#FBF4F6", dark: "#1C1416" };
const brand = (name: string, alternatives: string[] = []) => ({ name, nameStatus: "proposed", tagline: "Pour les petits, avec soin", palette: pal, positioning: "", audience: "", story: "", values: [], personality: [], alternatives }) as any;

describe("la marque créée est inventée, jamais reprise du fournisseur", () => {
  it("repère un nom vu sur le produit ou les photos", () => {
    const words = sourceWords({ product } as any);
    expect(words).toContain("sova");
    expect(copiesSource("Sova", words)).toBe("sova");
    expect(copiesSource("Sova Kids", words)).toBe("sova");
    expect(copiesSource("Lunelle", words)).toBe(null);
    expect(brandIssues(brand("SOVA"), { product } as any).some((i) => i.code === "name_copied" && i.blocking)).toBe(true);
  });

  it("remplace le nom repris par une piste inventée", () => {
    const r = finalizeBrand(brand("Sova", ["Vlgsky", "Lunelle", "Pomelo"]), null, { product, business: "products" } as any);
    expect(r.brand.name).toBe("Lunelle");
    expect(r.brand.alternatives).not.toContain("Sova");
    expect(r.brand.alternatives).not.toContain("Vlgsky");
  });

  it("garde le nom fourni par le client, et la marque d'un site existant", () => {
    expect(brandIssues({ ...brand("SOVA"), nameStatus: "provided" }, { product } as any).some((i) => i.code === "name_copied")).toBe(false);
    expect(sourceWords({ product, settings: { existingSite: { url: "x" } } } as any)).toEqual([]);
  });
});
