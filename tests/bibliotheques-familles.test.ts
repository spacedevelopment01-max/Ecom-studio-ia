/**
 * Bibliothèques de sections par famille (issue #141) : registre de 3 × 20 fonctions, chaque disposition pointe vers
 * une section réelle du thème et des réglages qui existent, une section n'appartient qu'à une fonction par famille.
 */
import { describe, expect, it } from "vitest";
import { ALL_ENTRIES, FAMILY_LIBRARY, familyTypes, parseLibraryId, libraryId, currentDisposition, type FamilyId } from "@/lib/theme/section-families";
import { baseSectionTypes, sectionSchema } from "@/lib/theme/spec";

const FAMILIES: FamilyId[] = ["specialty", "catalog", "services"];
const schemaOf = (type: string) => sectionSchema({} as never, type, "fr");

describe("bibliothèques par famille", () => {
  it("exactement 20 fonctions par famille, numérotées 1 à 20, clés uniques", () => {
    for (const f of FAMILIES) {
      const list = FAMILY_LIBRARY[f];
      expect(list.length, f).toBe(20);
      expect(list.map((x) => x.n), f).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
      expect(new Set(list.map((x) => x.key)).size, f).toBe(20);
      for (const x of list) expect(x.family).toBe(f);
    }
    expect(ALL_ENTRIES.length).toBe(60);
  });

  it("chaque disposition pointe vers une section du thème et des réglages existants (valeurs de liste comprises)", () => {
    const types = new Set(baseSectionTypes());
    const bad: string[] = [];
    for (const x of ALL_ENTRIES) {
      expect(x.dispositions.length, x.key).toBeGreaterThan(0);
      expect(new Set(x.dispositions.map((y) => y.id)).size, `${x.key} : identifiants de disposition uniques`).toBe(x.dispositions.length);
      for (const y of x.dispositions) {
        if (!types.has(y.type)) { bad.push(`${x.key}~${y.id} : section ${y.type} absente`); continue; }
        const schema = schemaOf(y.type);
        if (!schema) { bad.push(`${x.key}~${y.id} : schéma illisible`); continue; }
        for (const [id, v] of Object.entries(y.settings ?? {})) {
          const s = (schema.settings ?? []).find((z) => z.id === id) as { type?: string; options?: { value: string }[] } | undefined;
          if (!s) { bad.push(`${x.key}~${y.id} : réglage ${y.type}.${id} absent`); continue; }
          if (s.type === "select" && !(s.options ?? []).some((o) => String(o.value) === String(v))) bad.push(`${x.key}~${y.id} : ${y.type}.${id}=${v} hors liste`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("dans une famille, une section n'appartient qu'à une seule fonction (le changement de disposition est sans ambiguïté)", () => {
    for (const f of FAMILIES) {
      const owner = new Map<string, string>();
      for (const x of FAMILY_LIBRARY[f]) for (const y of x.dispositions) {
        const prev = owner.get(y.type);
        expect(prev === undefined || prev === x.key, `${f} : ${y.type} dans ${prev} et ${x.key}`).toBe(true);
        owner.set(y.type, x.key);
      }
    }
  });

  it("les galeries ne se mélangent pas : sections propres à une famille, et aucun avantage produit, panier ou offre groupée côté services", () => {
    const services = familyTypes("services");
    for (const t of ["featured-purchase", "fs-products", "product-recommendations", "cv-ingredients", "fs-lookbook", "fs-dimensions", "fs-care", "fs-campaign", "fs-collections", "comparison-table", "cv-hero", "features-grid"]) expect(services.has(t), t).toBe(false);
    const catalog = familyTypes("catalog");
    for (const t of ["fs-service", "fs-case", "fs-credentials", "services-list", "pricing", "booking", "team", "cv-hero"]) expect(catalog.has(t), t).toBe(false);
    const specialty = familyTypes("specialty");
    for (const t of ["fs-service", "fs-case", "fs-credentials", "services-list", "booking", "ed-opening", "fs-lookbook"]) expect(specialty.has(t), t).toBe(false);
  });

  it("identifiants de galerie : aller-retour, disposition retrouvée depuis les réglages", () => {
    for (const x of ALL_ENTRIES) for (const y of x.dispositions) {
      const parsed = parseLibraryId(libraryId(x, y));
      expect(parsed?.entry.key).toBe(x.key);
      expect(parsed?.disposition.id).toBe(y.id);
      const cur = currentDisposition(x, y.type, { ...(y.settings ?? {}) });
      expect(cur?.disposition.type).toBe(y.type);
    }
    expect(parseLibraryId("fam:specialty.hero")?.disposition.id).toBe(FAMILY_LIBRARY.specialty[0].dispositions[0].id);
    expect(parseLibraryId("cv-hero")).toBeNull();
    expect(parseLibraryId("fam:inconnu.x")).toBeNull();
  });
});
