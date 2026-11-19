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

  it("le site refait du 18 novembre, comparé à l'ancien, est refusé par la règle de variété (l'accueil et les dispositions, ce que le propriétaire a accepté)", () => {
    const ancien = { pages: PREMIER, utiles: ["home", "product"], metier: null, ancien: true };
    const gaps = V.varieteSitesGaps({ pages: REFAIT, utiles: ["home", "product"], metier: null }, [ancien]);
    expect(gaps.some((g) => /^accueil :/.test(g)), gaps.join("\n")).toBe(true);
    expect(gaps.some((g) => /^dispositions déjà prises/.test(g)), gaps.join("\n")).toBe(true);
    // Le quart du site entier ne compte qu'avec les sites des autres clients.
    expect(gaps.some((g) => /^site entier :/.test(g)), gaps.join("\n")).toBe(false);
    expect(V.varieteSitesGaps({ pages: REFAIT, utiles: ["home", "product"], metier: null }, [{ ...ancien, ancien: false }]).some((g) => /^site entier :/.test(g))).toBe(true);
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
    expect(src).toContain('pg.sections = pg.sections.filter((x, i) => { const l = libSection(x.id); return !(pg.key === "home" && i === 0) && (!l || !productSlotSection(l)); });');
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

describe("face au site actuel du client, les pièces qui lèvent les derniers doutes ne comptent pas pour le quart", async () => {
  const V = await import("@/lib/syna-agent/custom-theme/variete-sites");
  it("essai réel du 18 novembre 2026 : quatre pièces communes (questions, garanties, livraison) ne refusent plus la conception ; l'accueil reste contrôlé", () => {
    const ancien = { pages: { home: ["tn-ouverture:dans-la-photo", "tn-produits:grille", "tn-questions:filets", "tn-garantie:bande"], product: ["tn-achat:grandes-photos", "tn-livraison:", "tn-garanties:bande", "tn-questions:deux-colonnes"] }, utiles: ["home", "product"], metier: null, ancien: true };
    const neuf = { pages: { home: ["tn-ouverture:titre-massif", "tn-produits:vedette", "tn-histoire:lettrine", "tn-questions:cartes", "tn-garantie:sceau"], product: ["tn-achat:simple", "tn-livraison:", "tn-garanties:bande", "tn-questions:filets", "tn-comment:lignes"] }, utiles: ["home", "product"], metier: null };
    const gaps = V.varieteSitesGaps(neuf, [ancien]);
    expect(gaps.some((g) => /^site entier :/.test(g)), gaps.join("\n")).toBe(false);
    // Avec un autre client, ces pièces comptent toujours.
    const autre = { ...ancien, ancien: false };
    expect(V.varieteSitesGaps(neuf, [autre]).some((g) => /^site entier :/.test(g))).toBe(true);
  });
});

describe("face au site actuel du client, l'accueil ne compte pas les pièces qui lèvent les derniers doutes", async () => {
  const V = await import("@/lib/syna-agent/custom-theme/variete-sites");
  it("essai réel du 18 novembre 2026 : quatre pièces communes dont la garantie et les questions passent ; avec un autre client, elles comptent", () => {
    const ancien = { pages: { home: ["tn-ouverture:dans-la-photo", "tn-produits:grille", "tn-atouts:coches", "tn-garantie:bande", "tn-questions:filets"] }, utiles: ["home"], metier: null, ancien: true };
    const neuf = { pages: { home: ["tn-ouverture:titre-en-bas", "tn-produits:vedette", "tn-atouts:ronds", "tn-garantie:sceau", "tn-questions:cartes", "tn-equation:carte"] }, utiles: ["home"], metier: null };
    expect(V.varieteSitesGaps(neuf, [ancien]).some((g) => /^accueil :/.test(g))).toBe(false);
    expect(V.varieteSitesGaps(neuf, [{ ...ancien, ancien: false }]).some((g) => /^accueil :/.test(g))).toBe(true);
  });
});

describe("dernier recours sans IA pour la variété : un second passage qui n'accepte que ce qui rapproche de la règle", async () => {
  const V = await import("@/lib/syna-agent/custom-theme/variete-sites");
  it("l'écart compte les pièces de trop et les dispositions reprises, et ne compte pas les pièces obligatoires face à l'ancien site", () => {
    const autre = { pages: { home: ["tn-ouverture:dans-la-photo", "tn-produits:grille", "tn-atouts:coches", "tn-garantie:bande", "tn-questions:filets"] }, utiles: ["home"], metier: null };
    const neuf = { pages: { home: ["tn-ouverture:titre-en-bas", "tn-produits:grille", "tn-atouts:coches", "tn-garantie:sceau", "tn-questions:cartes"] }, utiles: ["home"], metier: null };
    expect(V.ecartVariete(neuf, [autre])).toBeGreaterThan(V.ecartVariete(neuf, [{ ...autre, ancien: true }]));
    expect(V.ecartVariete(autre, [])).toBe(0);
  });
  it("le second passage existe, après le premier, et seulement si la règle n'est pas tenue", () => {
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/tools.ts", "utf8");
    expect(src).toContain("const rapproche = (x: Design) => { const r = check(x); if (r.rules.length || !r.t) return false; const e = ecart(x); if (e >= courant) return false; courant = e; return true; };");
  });
});

describe("les trois corrections après le site refait du 19 novembre 2026", async () => {
  const O = await import("@/lib/syna-agent/custom-theme/ordre");
  const facts = { business: "products" as const, products: 3, types: [], mobile: false, zoneConnue: false, preuves: new Set<never>() };

  it("l'ouverture de l'ancien site ne revient jamais : ni gardée, ni sa photo reprise, ni son titre donné au plan, ni sa disposition", () => {
    const job = fs.readFileSync("src/lib/syna-agent/custom-theme/site-job.ts", "utf8");
    expect(job).toContain('!(pg.key === "home" && i === 0)');
    expect(job).toContain('if (!x.clientTexts || (pg.key === "home" && i === 0)) continue;');
    const brand = fs.readFileSync("src/lib/syna-agent/custom-theme/brand.ts", "utf8");
    expect(brand).toContain('const ouverture = t.pages.find((pg) => pg.key === "home")?.sections[0];');
    const tools = fs.readFileSync("src/lib/syna-agent/custom-theme/tools.ts", "utf8");
    expect(tools).toContain("Refaire le site : l'ouverture de l'accueil ne reprend jamais la disposition de l'actuelle");
  });

  it("une bande de photo pleine largeur et une grande photo sur la même page : même allure (la bande encadrée, non)", () => {
    const d = O.alluresEnDouble([{ section: "tn-ouverture", construction: "dans-la-photo" }, { section: "tn-emotion", construction: "phrase-sur-photo" }, { section: "tn-bande", construction: "pleine-largeur" }]);
    expect(d.map((x) => `${x.id}=${x.forme}`)).toEqual(["tn-bande=grande-photo"]);
    expect(O.alluresEnDouble([{ section: "tn-emotion", construction: "phrase-sur-photo" }, { section: "tn-bande", construction: "encadree" }])).toEqual([]);
  });

  it("la fiche d'Atelier Vasco : la description en volets devient un texte posé, les questions gardent leurs volets", () => {
    const fiche = ["tn-achat:simple", "tn-description:numeros", "tn-pictos:rangee", "tn-composition:alternee", "tn-citation-photo:voile", "tn-comment:lignes", "tn-rappel-achat:bouton", "tn-sous-bouton:liste", "tn-questions:deux-colonnes", "tn-produits:vedette"];
    const d = { pages: [{ key: "product", label: "Fiche", sections: fiche.map((x) => { const [section, construction] = x.split(":"); return { section, construction }; }) }] };
    expect(O.alluresEnDouble(d.pages[0].sections).map((x) => x.forme)).toEqual(["volets"]);
    const fit = O.fitFormes(d, facts as never, { candidats: () => [], accepte: () => true });
    const desc = fit.d.pages[0].sections.find((x) => x.section === "tn-description")!;
    expect(desc.construction).not.toBe("numeros");
    expect(O.alluresEnDouble(fit.d.pages[0].sections)).toEqual([]);
    expect(fit.changed.join(" ")).toMatch(/tn-description en « /);
  });
});
