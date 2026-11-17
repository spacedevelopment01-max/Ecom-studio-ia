import { describe, expect, it } from "vitest";
import { ACCUEIL_COMMUNES_MAX, fitVarieteSites, varieteSitesBrief, varieteSitesGaps, type SiteVu } from "@/lib/syna-agent/custom-theme/variete-sites";
import { constructionsOf, validConstruction } from "@/lib/syna-agent/custom-theme/tenue";

// 17 novembre 2026, devant les deux premiers sites de SINA : « 4 fois la même section entre les deux alors qu'on a une
// centaine de sections, et surtout elles ont la même disposition » ; « la moitié des sections sont identiques. J'appelle
// pas ça de la variété moi ». Les pièces ci-dessous sont celles des deux sites de l'essai.
const BECANE: SiteVu = {
  utiles: ["home", "prestations", "about", "contact", "aide"],
  pages: {
    home: ["tn-ouverture-metier:photo-bandeau", "tn-zone:etiquettes", "tn-prestations:cartes", "tn-atouts:coches", "tn-emotion:phrase-sur-photo", "tn-deroule:chiffres", "tn-pour-qui:listes", "tn-texte-photo:photo-droite", "tn-engagements:deux-colonnes", "tn-questions:filets", "tn-final:gauche-droite"],
    about: ["tn-histoire:lettrine", "tn-manifeste:sombre", "tn-texte-photo:texte-remonte"],
    contact: ["tn-contact:coordonnees-en-grand"],
    "404": ["tn-404:photo-au-centre"],
  },
};
const VASCO: SiteVu = {
  utiles: ["home", "about", "contact"],
  pages: {
    home: ["tn-ouverture:dans-la-photo", "tn-fabrication:lignes", "tn-produits:grille", "tn-engagements:liste", "tn-citation-photo:voile", "tn-appel-produit:carte", "tn-texte-photo:carte-a-cheval", "tn-garantie:bande", "tn-questions:filets", "tn-final:sombre-centre"],
    about: ["tn-histoire:lettrine", "tn-manifeste:sombre", "tn-texte-photo:texte-remonte"],
    contact: ["tn-contact:coordonnees-en-grand"],
    "404": ["tn-404:photo-au-centre"],
  },
};

describe("variété entre les sites du Studio, quel que soit le métier", () => {
  const gaps = varieteSitesGaps(VASCO, [BECANE]);
  it("l'accueil de Vasco, avec 4 pièces de l'accueil de Bécane, est refusé (au plus 2)", () => {
    expect(ACCUEIL_COMMUNES_MAX).toBe(2);
    expect(gaps.find((g) => g.startsWith("accueil : 4 pièces en commun"))).toBeTruthy();
  });
  it("le site entier, avec plus d'un quart de pièces en commun, est refusé", () => {
    expect(gaps.find((g) => g.startsWith("site entier :"))).toBeTruthy();
  });
  it("une pièce reprise avec la même disposition est refusée, en disant les dispositions libres", () => {
    const g = gaps.find((x) => x.startsWith("dispositions déjà prises"))!;
    expect(g).toContain("tn-histoire:lettrine (libres :");
    expect(g).toContain("tn-questions:filets");
  });
  it("l'ouverture de l'accueil n'est jamais comptée ni changée : elle suit sa famille", () => {
    const a: SiteVu = { utiles: ["home"], pages: { home: ["tn-ouverture:dans-la-photo", "tn-mosaique:grille"] } };
    const b: SiteVu = { utiles: ["home"], pages: { home: ["tn-ouverture:dans-la-photo", "tn-chiffres:bande"] } };
    expect(varieteSitesGaps(a, [b])).toEqual([]);
    const fit = fitVarieteSites({ pages: [{ key: "home", sections: [{ section: "tn-ouverture", construction: "dans-la-photo" }] }] }, [b], { resolve: (id, c) => validConstruction(id, c) });
    expect(fit.changed).toEqual([]);
  });
  it("un site sans pièce en commun passe", () => {
    const autre: SiteVu = { utiles: ["home"], pages: { home: ["tn-ouverture:titre-en-bas", "tn-mosaique:grille", "tn-chiffres:bande", "tn-presse:logos"] } };
    expect(varieteSitesGaps(autre, [BECANE])).toEqual([]);
  });
  it("le premier site du Studio n'a rien à comparer", () => {
    expect(varieteSitesGaps(VASCO, [])).toEqual([]);
  });
});

describe("dernier recours sans IA : la disposition prise devient une disposition libre", () => {
  const d = { pages: Object.entries(VASCO.pages).map(([key, list]) => ({ key, sections: list.map((x) => ({ section: x.split(":")[0], construction: x.split(":")[1] })) })) };
  const fit = fitVarieteSites(d, [BECANE], { resolve: (id, c) => validConstruction(id, c) });
  it("chaque pièce reprise qui a une disposition libre la prend", () => {
    const histoire = fit.d.pages.find((p) => p.key === "about")!.sections.find((s) => s.section === "tn-histoire")!;
    expect(histoire.construction).not.toBe("lettrine");
    expect(constructionsOf("tn-histoire").map((c) => c.key)).toContain(histoire.construction);
    expect(fit.changed.length).toBeGreaterThan(0);
  });
  it("un concept déjà montré au client ne bouge pas", () => {
    const keep = fitVarieteSites(d, [BECANE], { resolve: (id, c) => validConstruction(id, c), garder: ["about", "contact", "404", "home"] });
    expect(keep.changed).toEqual([]);
  });
});

describe("le concepteur reçoit les sites déjà montés et la règle", () => {
  it("avec leurs pièces et leurs dispositions", () => {
    const b = varieteSitesBrief([BECANE]);
    expect(b).toContain("au plus 2 pièces en commun");
    expect(b).toContain("tn-questions:filets");
    expect(varieteSitesBrief([])).toBe("");
  });
});
