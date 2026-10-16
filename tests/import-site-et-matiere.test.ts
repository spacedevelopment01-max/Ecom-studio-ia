import { describe, expect, it } from "vitest";
import { mergeSiteCatalog, projectNameAfterImport } from "../src/lib/engine/existing-site";
import { factsFromDescription } from "../src/lib/engine/local";
import type { CatalogItem } from "../src/lib/project-types";

const item = (key: string, name: string, price: number | null = null): CatalogItem => ({ key, name, category: "", price, compareAt: null, description: "", features: [], originalAssetId: null });

describe("import d'un site existant : rien de saisi par le client n'est effacé", () => {
  it("le nom de projet saisi est gardé", () => {
    expect(projectNameAfterImport("ARVEN", "https://www.arven-montres.fr", "Arven Montres — Boutique officielle")).toBe("ARVEN");
  });
  it("seul le nom provisoire de la création (adresse du site, « Nouveau projet ») est remplacé", () => {
    expect(projectNameAfterImport("arven-montres.fr", "https://www.arven-montres.fr/", "Arven Montres")).toBe("Arven Montres");
    expect(projectNameAfterImport("Nouveau projet", "https://x.fr", "Atelier Pivoine")).toBe("Atelier Pivoine");
    expect(projectNameAfterImport("arven-montres.fr", "https://arven-montres.fr", "")).toBe("arven-montres.fr");
  });
  it("le catalogue saisi reste tel quel ; seuls les produits absents du site sont ajoutés", () => {
    const mine = [item("k1", "Bracelet cuir brun", 3990), item("k2", "Écrin")];
    const site = [item("bracelet-cuir", "bracelet cuir brun", 2500), item("k2", "Autre nom"), item("montre-acier", "Montre acier")];
    expect(mergeSiteCatalog(mine, site)).toEqual([...mine, site[2]]);
    expect(mergeSiteCatalog([], site)).toEqual(site);
  });
});

describe("moteur local : matière reprise de la description", () => {
  const mat = (d: string) => factsFromDescription(d).find((f) => f.key === "materials");
  it("« acier et cuir véritable » (ARVEN)", () => {
    const f = mat("Montre en acier et cuir véritable, cadran noir, bracelet en cuir brun avec boucle.");
    expect(f?.value).toBe("acier, cuir véritable");
    expect(f?.status).toBe("confirmed");
    expect(f?.source).toBe("description");
  });
  it("forme précise d'abord, sans doublon ni mot partiel", () => {
    expect(mat("Gourde en acier inoxydable, bouchon en bambou.")?.value).toBe("acier inoxydable, bambou");
    expect(mat("T-shirt 100 % coton bio, encre à l'eau.")?.value).toBe("coton bio");
    // « lin » ne doit pas être lu dans « linge » ni « câlin », « bois » pas dans « boisson ».
    expect(mat("Une boisson pour un câlin, du linge propre.")).toBeUndefined();
    expect(mat("Stainless steel bottle with a bamboo lid")?.value).toBe("Stainless steel, bamboo");
  });
  it("une ligne « Matière : … » explicite garde la priorité", () => {
    expect(mat("Matière : laiton doré\nAvec un écrin en bois")?.value).toBe("laiton doré");
  });
  it("rien n'est inventé quand aucune matière n'est nommée", () => {
    expect(mat("Casque audio sans fil, autonomie à préciser.")).toBeUndefined();
  });
});
