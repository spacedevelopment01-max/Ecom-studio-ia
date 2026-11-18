/**
 * Essai réel du 18 novembre 2026 : à « refais-moi tout le site », SINA a rendu presque le même site qu'au 17 novembre
 * (7 pièces sur 10 identiques sur l'accueil, 6 sur 10 sur la fiche), avec deux fois la même allure sur une page et un
 * sac imaginé repris de l'ancien site. Le propriétaire : « tout ça pour me refaire le même thème que le premier ? En plus
 * avec plusieurs fois la même section sur la page d'accueil et produit ». Puis « Oui » aux corrections. Sans IA.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

// Les deux sites d'Atelier Vasco, tels que le Studio les a montés (accueil et fiche, pièce:disposition).
const PREMIER = {
  home: ["tn-ouverture:dans-la-photo", "tn-fabrication:lignes", "tn-produits:grille", "tn-engagements:liste", "tn-citation-photo:voile", "tn-appel-produit:carte", "tn-texte-photo:carte-a-cheval", "tn-garantie:bande", "tn-questions:filets", "tn-final:sombre-centre"],
  product: ["tn-achat:grandes-photos", "tn-emotion:phrase-dessous", "tn-composition:alternee", "tn-fabrication:file", "tn-description:numeros", "tn-de-pres:avec-titre", "tn-comment:lignes", "tn-garanties:bande", "tn-questions:deux-colonnes", "tn-produits:liste"],
};
const REFAIT = {
  home: ["tn-ouverture:dans-la-photo", "tn-produits:grille", "tn-atouts:coches", "tn-fabrication:lignes", "tn-citation-photo:voile", "tn-composition:alternee", "tn-preparation:liste", "tn-garantie:bande", "tn-questions:filets", "tn-appel-produit:carte"],
  product: ["tn-achat:grandes-photos", "tn-description:numeros", "tn-bande:pleine-largeur", "tn-fiche-technique:tableau", "tn-citation:traits", "tn-de-pres:avec-titre", "tn-rappel-achat:bande", "tn-garanties:bande", "tn-questions:deux-colonnes", "tn-produits:liste"],
};

describe("refaire un site : il ne ressemble pas à l'ancien", async () => {
  const V = await import("@/lib/syna-agent/custom-theme/variete-sites");
  const O = await import("@/lib/syna-agent/custom-theme/ordre");
  const X = await import("@/lib/syna-agent/custom-theme/site-job");

  it("le site refait du 18 novembre, comparé à l'ancien, est refusé par la règle de variété (accueil et site entier)", () => {
    const ancien = { pages: PREMIER, utiles: ["home", "product"], metier: null, ancien: true };
    const gaps = V.varieteSitesGaps({ pages: REFAIT, utiles: ["home", "product"], metier: null }, [ancien]);
    expect(gaps.some((g) => /^accueil :/.test(g)), gaps.join("\n")).toBe(true);
    expect(gaps.some((g) => /^site entier :/.test(g)), gaps.join("\n")).toBe(true);
  });

  it("le concepteur voit le site actuel du client, nommé comme tel", () => {
    const brief = V.varieteSitesBrief([{ pages: PREMIER, utiles: ["home"], metier: null, ancien: true }]);
    expect(brief).toMatch(/SON SITE ACTUEL, QUE LE CLIENT FAIT REFAIRE/);
  });

  it("la conception d'un site entier compte le site actuel du client en tête des sites comparés, et ses partitions sont à ne pas reprendre", () => {
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/tools.ts", "utf8");
    expect(src).toContain('const ancien = mode.kind === "full" ? siteActuelDuClient(p.id) : null;');
    expect(src).toContain("const vus = [...(ancien ? [ancien.vu] : []), ...sitesVus(p.id, oc.metier)];");
    expect(src).toContain("if (ancien) for (const [key, id] of Object.entries(ancien.partitions))");
  });

  it("refaire : une pièce gardée garde son travail, sauf les emplacements de produit, qui repartent vides", () => {
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/site-job.ts", "utf8");
    expect(src).toContain("pg.sections = pg.sections.filter((x) => { const l = libSection(x.id); return !l || !productSlotSection(l); });");
  });
});

describe("avant de refaire, SINA demande ce qui ne plaisait pas", async () => {
  const X = await import("@/lib/syna-agent/custom-theme/site-job");

  it("pas de réponse notée : refusé avant la carte, rien de payé ; la réponse notée lève le refus", () => {
    expect(X.refusRefaireSansAvis({ refaire: true, siteExiste: true, avis: null })).toMatch(/rien n'est payé.*ce qui ne lui plaît pas/s);
    expect(X.refusRefaireSansAvis({ refaire: true, siteExiste: true, avis: "trop sage, je veux plus de photos" })).toBeNull();
    // Un premier site, ou une création sans « refaire » : aucune question en plus.
    expect(X.refusRefaireSansAvis({ refaire: true, siteExiste: false, avis: null })).toBeNull();
    expect(X.refusRefaireSansAvis({ refaire: false, siteExiste: true, avis: null })).toBeNull();
  });

  it("la note de SINA est reconnue à son titre, et sa réponse part au concepteur avec la consigne", () => {
    expect(X.siteAChanger([{ title: X.NOTE_SITE_A_CHANGER, value: "Les photos se ressemblent toutes." }])).toBe("Les photos se ressemblent toutes.");
    expect(X.siteAChanger([{ title: "Ce que je veux changer dans mon site", value: "L'ordre des pages." }])).toBe("L'ordre des pages.");
    expect(X.siteAChanger([{ title: "photos des produits", value: "plus tard" }])).toBeNull();
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/site-job.ts", "utf8");
    expect(src).toContain("Ce qui ne lui plaisait pas dans l'actuel (à changer)");
  });
});

describe("une même allure jamais deux fois sur une page", async () => {
  const O = await import("@/lib/syna-agent/custom-theme/ordre");

  it("l'accueil refait avait deux fois des étapes numérotées et deux fois un texte et une photo en alternance : relevé", () => {
    const sections = REFAIT.home.map((x) => { const [section, construction] = x.split(":"); return { section, construction }; });
    const doubles = O.alluresEnDouble(sections);
    expect(doubles.map((x) => `${x.id}=${x.forme}`).sort()).toEqual(["tn-composition=texte-photo", "tn-preparation=etapes"]);
    // La composition en alternance se voit comme un texte et une photo côte à côte.
    expect(O.formeVue("tn-composition", "alternee")).toBe("texte-photo");
    // La fiche refaite avait deux volets (la description numérotée et les questions).
    const fiche = REFAIT.product.map((x) => { const [section, construction] = x.split(":"); return { section, construction }; });
    expect(O.alluresEnDouble(fiche).map((x) => x.forme)).toContain("volets");
  });

  it("le contrôle de l'ordre le refuse sur la page, et le Studio a son dernier recours sans IA", () => {
    const pages = [{ key: "home", sections: REFAIT.home.map((x) => { const [section, construction] = x.split(":"); return { section, construction }; }) }];
    const facts = { business: "products" as const, products: 3, types: [], mobile: false, zoneConnue: false, preuves: new Set<never>() };
    const r = O.ordreGaps({ pages }, facts as never);
    expect(r.refus.some((x) => /deux sections de même allure sur la page/.test(x))).toBe(true);
    expect(typeof O.fitFormes).toBe("function");
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/tools.ts", "utf8");
    expect(src).toContain("const fit = fitFormes(d, facts, { candidats, accepte:");
    const cahier = fs.readFileSync("docs/sina-savoir/theme-ordre-et-variete.md", "utf8");
    expect(cahier).toMatch(/une même allure ne revient jamais sur une page/);
  });
});
