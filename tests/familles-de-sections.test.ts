import { describe, expect, it } from "vitest";
import { sectionLibrary } from "../src/lib/syna-agent/custom-theme/library";
import { SECTION_GROUPS, sectionGroup } from "../src/lib/syna-agent/custom-theme/section-groups";

// Demande du propriétaire du 10 novembre 2026 : les sections réunies par famille (l'en-tête avec l'en-tête…).
describe("familles de sections", () => {
  it("chaque section de la bibliothèque appartient à une famille connue", () => {
    const ids = new Set(SECTION_GROUPS.map((g) => g.id));
    const sans = sectionLibrary().sections.filter((s) => !s.demoFrame && !ids.has(sectionGroup(s) as never)).map((s) => s.id);
    expect(sans).toEqual([]);
  });
  it("les familles clés de l'accueil ont des sections dans les deux styles", () => {
    const n = (g: string, f: string) => sectionLibrary().sections.filter((s) => !s.demoFrame && sectionGroup(s) === g && s.family === f).length;
    for (const g of ["en-tete", "ouverture", "pied-de-page"]) for (const f of ["classique", "moderne"]) expect(n(g, f)).toBeGreaterThan(0);
  });
});

describe("mode construction de l'accueil", () => {
  it("pose toutes les sections permises de la famille, jamais une fausse offre ni une section réservée à la mode", async () => {
    const { builderTheme } = await import("../src/lib/syna-agent/custom-theme/builder");
    const { FAKE_OFFER_SECTIONS } = await import("../src/lib/syna-agent/custom-theme/library");
    const t: any = { version: 1, family: "classique", style: "", header: null, footer: null, search: null, pages: [] };
    const { theme, slots } = builderTheme(t);
    expect(theme.pages).toHaveLength(1);
    expect(slots.some((s) => s.group === "en-tete")).toBe(true);
    expect(slots.some((s) => s.group === "ouverture")).toBe(true);
    expect(slots.some((s) => s.group === "pied-de-page")).toBe(true);
    expect(slots.filter((s) => FAKE_OFFER_SECTIONS[s.id])).toEqual([]);
  });
});
