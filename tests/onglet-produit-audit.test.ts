import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanVariants, moveCatalogItem, variantCombinations } from "../src/lib/project-types";
import { storeProduct } from "../src/lib/engine/shop";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("onglet Produit : toutes les variantes", () => {
  const both = [{ name: "Coloris", values: ["Noir", "Brun"] }, { name: "Taille", values: ["40 mm", "42 mm"] }];

  it("les variantes vides ou sans nom sont écartées, les doublons de valeur aussi", () => {
    expect(cleanVariants([{ name: " Coloris ", values: [" Noir", "Noir", ""] }, { name: "", values: ["x"] }, { name: "Taille", values: [] }])).toEqual([{ name: "Coloris", values: ["Noir"] }]);
  });

  it("toutes les combinaisons, dans l'ordre saisi (3 options et 100 combinaisons au plus)", () => {
    expect(variantCombinations(both)).toEqual([["Noir", "40 mm"], ["Noir", "42 mm"], ["Brun", "40 mm"], ["Brun", "42 mm"]]);
    expect(variantCombinations([])).toEqual([]);
    const many = Array.from({ length: 5 }, (_, i) => ({ name: `O${i}`, values: Array.from({ length: 10 }, (_, k) => `${i}-${k}`) }));
    const c = variantCombinations(many);
    expect(c.length).toBe(100);
    expect(c.every((x) => x.length === 3)).toBe(true);
  });

  it("la boutique reçoit toutes les options (Coloris ET Taille), pas seulement la première", () => {
    const p = { name: "ARVEN", brand: { name: "ARVEN" }, product: { name: "ARVEN", price: { amount: 18900, currency: "EUR" }, variants: both } } as never;
    const sp = storeProduct(p, { product: { title: "ARVEN", description_html: "" } } as never, []);
    expect(sp.options).toEqual(["Coloris", "Taille"]);
    expect(sp.variants.map((v) => v.title)).toEqual(["Noir / 40 mm", "Noir / 42 mm", "Brun / 40 mm", "Brun / 42 mm"]);
    expect(sp.variants[1].options).toEqual(["Noir", "42 mm"]);
  });

  it("l'onglet enregistre toutes les variantes, sans rien perdre", () => {
    const s = read("src/components/studio/tab-produit.tsx");
    expect(s).toMatch(/variants: cleanVariants\(rows\.map/);
    expect(s).toContain("Ajouter une variante");
    expect(s).toContain("Add a variant");
  });
});

describe("catalogue : ordre des produits", () => {
  const items = [{ key: "a" }, { key: "b" }, { key: "c" }];
  it("monter / descendre d'un cran ; aux extrémités rien ne change", () => {
    expect(moveCatalogItem(items, "b", "up").map((x) => x.key)).toEqual(["b", "a", "c"]);
    expect(moveCatalogItem(items, "b", "down").map((x) => x.key)).toEqual(["a", "c", "b"]);
    expect(moveCatalogItem(items, "a", "up")).toBe(items);
    expect(moveCatalogItem(items, "c", "down")).toBe(items);
    expect(moveCatalogItem(items, "zz", "up")).toBe(items);
  });
  it("l'API et l'écran (FR/EN) proposent le déplacement", () => {
    expect(read("src/app/api/projects/[id]/catalog/route.ts")).toMatch(/moveCatalogItem\(catalog, b\.move\.key, b\.move\.dir\)/);
    const s = read("src/components/studio/catalog-panel.tsx");
    expect(s).toContain("`Monter ${i.name}`");
    expect(s).toContain("`Move ${i.name} down`");
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
