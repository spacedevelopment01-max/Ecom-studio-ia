/** Catalogue actif imposé : aucune ancienne sélection nouvelle, aucun moteur installable fabriqué. */
import { expect, it } from "vitest";
import { fixture } from "./preparation-fixtures";
import { editorialFixture, validatedBrand } from "./preparation-mission-fixtures";
import { loadProject, saveCatalog } from "@/lib/projects";
import { bindEditorial, EditorialSchema, recommendationCatalogue, recommendationDataReady, rebindRecommendationCategory } from "@/lib/preparation/editorial";
import { categoryForProject, recordCategoryChoice } from "@/lib/project-handoff/category-store";

it.each(["specialized", "ecommerce", "services"] as const)("%s : neuf références actives (SILLON : issue #148 ; NOCTIL et TRAVERSE : issue #152 ; HEUREN et ALCÔVE, e-commerce : issue #155), seulement les bonnes éligibles et aucune installation supposée", async category => {
  const f = await fixture(category === "services" ? "services" : "products"); validatedBrand(f.pid, f.input);
  const p = loadProject(f.pid), scope = categoryForProject(p);
  recordCategoryChoice(p, undefined, category, scope.contextHash);
  const catalogue = recommendationCatalogue(p);
  expect(catalogue.map(c => c.referenceId)).toEqual(["fraise", "onde", "orbe", "atelier-rive", "sillon", "noctil", "traverse", "heuren", "alcove"]);
  expect(catalogue.some(c => c.status === "available")).toBe(false);
  expect(catalogue.every(c => c.engineThemeId === null)).toBe(true);
  expect(catalogue.filter(c => c.status === "in_progress").map(c => c.referenceId)).toEqual(category === "specialized" ? ["fraise", "onde", "sillon", "noctil", "traverse"] : category === "ecommerce" ? ["orbe", "heuren", "alcove"] : ["atelier-rive"]);
  const projection = rebindRecommendationCategory(p, { recommendedId: "atelier", alternatives: [], reasons: ["Ancienne suggestion"], selectedId: "atelier", status: "selected", catalogue: [] });
  expect(projection.selectedId).toBe("atelier"); expect(projection.recommendedId).toBe("");
  expect(projection.status).toBe("reference_pending"); expect(recommendationDataReady(projection)).toBe(true);
});
it.each(["atelier", "clinique", "theme-invente"])("ancienne référence %s refusée comme nouvelle recommandation, textes source conservés", async id => {
  const f = await fixture(); validatedBrand(f.pid, f.input); const { content, out } = await editorialFixture(f.pid), before = JSON.stringify(content);
  (out.recommendation as any).recommendedReferenceId = id;
  expect(() => bindEditorial(content, out, recommendationCatalogue(loadProject(f.pid)))).toThrow(/inactive|incompatible|inconnue/);
  expect(JSON.stringify(content)).toBe(before);
});
it("aucune alternative forcée quand une seule référence est éligible", async () => {
  const f = await fixture("services"); validatedBrand(f.pid, f.input); const { content, out } = await editorialFixture(f.pid);
  expect(out.recommendation.alternativesReferenceIds).toEqual([]);
  expect(EditorialSchema.safeParse(out).success).toBe(true);
  expect(bindEditorial(content, out, recommendationCatalogue(loadProject(f.pid))).recommendation).toMatchObject({ recommendedReferenceId: "atelier-rive", alternativesReferenceIds: [], status: "reference_pending", engineThemeId: null });
});
it("catégorie inconnue : les textes peuvent être liés sans repli ni identifiant installable", async () => {
  const f = await fixture(); validatedBrand(f.pid, f.input); const { content, out } = await editorialFixture(f.pid);
  // Une nouvelle offre rend le choix synthétique explicite précédent obsolète.
  saveCatalog(f.pid, [], "multi");
  const p = loadProject(f.pid), catalogue = recommendationCatalogue(p);
  expect(catalogue.every(c => c.status === "incompatible")).toBe(true);
  out.recommendation = { recommendedReferenceId: null, alternativesReferenceIds: [], reasons: ["Précision du modèle commercial attendue ; aucun repli."] };
  const bound = bindEditorial(content, out, catalogue);
  expect(bound.documents).toEqual(content.documents); expect(bound.editorial!.length).toBeGreaterThan(0);
  expect(bound.recommendation).toMatchObject({ status: "clarification_required", recommendedId: "", recommendedReferenceId: null, alternativesReferenceIds: [] });
});
