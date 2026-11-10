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

describe("sections retirées par le propriétaire (revue du 10 novembre 2026)", () => {
  it("ne sont plus proposées ni dans la banque, mais restent lisibles", async () => {
    const { familySections, RETIRED_SECTIONS, libSection } = await import("../src/lib/syna-agent/custom-theme/library");
    const { catalogTheme } = await import("../src/lib/syna-agent/custom-theme/builder");
    for (const f of ["classique", "moderne"] as const) expect(familySections(f).filter((s) => RETIRED_SECTIONS[s.id])).toEqual([]);
    const t: any = { version: 1, family: "classique", style: "", header: null, footer: null, search: null, pages: [] };
    const { items } = catalogTheme(t, "classique");
    expect(items.filter((x) => RETIRED_SECTIONS[x.id] || x.group === "metiers")).toEqual([]);
    expect(libSection("ouverture-en-mosaique")).toBeTruthy();
    expect(items.some((x) => x.id === "note-et-avis-en-bandeau" && x.group === "preuves")).toBe(true);
  });
});

describe("corrections de la revue du propriétaire (lot 2)", () => {
  it("sont présentes dans la banque (HTML, feuille et script)", async () => {
    const fs = await import("node:fs");
    const { libSection } = await import("../src/lib/syna-agent/custom-theme/library");
    expect(libSection("ils-parlent-de-nous")!.html).not.toContain("data-pq");
    expect(libSection("avant-apres")!.html).toContain("ba-sec");
    expect(libSection("avant-apres")!.html).toContain("<b>Avant</b>");
    expect(libSection("histoire-du-produit-au-defilement")!.html).toContain("p2-cta");
    const css = fs.readFileSync("public/sections/library.css", "utf8");
    expect(css.split("revue du propriétaire (10 novembre 2026)").length).toBe(2); // une seule fois
    expect(fs.readFileSync("public/sections/library.js", "utf8")).toContain('if(!$(".pqf",p))return;');
  });
});

describe("sections refaites de la revue (lot 3, famille Confiance)", () => {
  it("badges en cartes douces, avis en bandeau qui défile, engagements avec photo par promesse", async () => {
    const fs = await import("node:fs");
    const { libSection } = await import("../src/lib/syna-agent/custom-theme/library");
    const badges = libSection("badges-de-confiance")!.html;
    expect(badges).toContain("rv-bdg");
    expect(badges.match(/class="rv-bdg-c"/g)!.length).toBe(4);
    const avis = libSection("avis-clients")!.html;
    expect(avis).toContain("data-rv-car");
    expect(avis).toContain("Lire tous les avis");
    expect(avis.match(/<article class="rv-rc">/g)!.length).toBeGreaterThanOrEqual(6); // 5 ou 6 visibles sur ordinateur, puis défilement
    expect(libSection("nos-engagements")!.html).toContain("rv-eng");
    const css = fs.readFileSync("public/sections/library.css", "utf8");
    expect(css).toContain(".rv-rev-note>span{"); // les étoiles restent en ligne
    const js = fs.readFileSync("public/sections/library.js", "utf8");
    expect(js.split("sections refaites (revue du 10 novembre 2026)").length).toBe(2); // une seule fois
    expect(() => new Function(js)).not.toThrow();
  });
});

describe("sections refaites de la revue (lot 3, famille Questions)", () => {
  it("quatre présentations des questions, la fiche et la page des questions, textes dans la section", async () => {
    const { libSection, SCRIPT_DEMO_SECTIONS } = await import("../src/lib/syna-agent/custom-theme/library");
    for (const id of ["questions-deux-colonnes", "questions-en-cartes", "questions-avec-photo", "questions-sur-le-produit"]) {
      expect(libSection(id)!.html.match(/class="rv-q"/g)!.length).toBeGreaterThanOrEqual(4);
      expect(sectionGroup(libSection(id)!)).toBe(id === "questions-sur-le-produit" ? "fiche-produit" : "questions");
    }
    // Bulles : questions ET réponses écrites dans la section (le rédacteur peut les réécrire), plus de nom d'exemple en initiale.
    const bulles = libSection("questions-en-bulles-de-discussion")!.html;
    expect(bulles).toContain("data-rv-bub");
    expect(bulles.match(/<p hidden>/g)!.length).toBe(5);
    expect(SCRIPT_DEMO_SECTIONS.has("questions-en-bulles-de-discussion")).toBe(false);
    // Page des questions : grande recherche, thèmes en cartes, questions groupées, encart contact.
    const page = libSection("questions-avec-recherche")!.html;
    for (const m of ["data-rv-fqs", "data-rv-go", "data-rv-gr", "rv-ct dk", "rv-acc lp"]) expect(page).toContain(m);
    expect(sectionGroup(libSection("questions-avec-recherche")!)).toBe("pages");
  });
});
