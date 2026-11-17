/**
 * Tour des sections (17 novembre 2026), modules produit, achat et vente : ce que leurs feuilles garantissent après le tour
 * (« ouvre toutes les sections une par une mobile et ordi et tu corriges tous les défauts, j'en veux plus un seul »).
 * Sans IA, sans navigateur. Le rendu lui-même se mesure avec le banc (scripts/tour-des-sections).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const feuille = (f: string) => fs.readFileSync(path.join(process.cwd(), "public", "sections", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const PRODUIT = feuille("tenue-produit.css");
const ACHAT = feuille("tenue-achat.css");
const VENTE = feuille("tenue-vente.css");
const TOUTES = [PRODUIT, ACHAT, VENTE];
/** Les déclarations de toutes les règles dont le sélecteur contient ce texte (hors @media compris). */
const regles = (css: string, selecteur: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].includes(selecteur)).map((m) => m[2]).join(";");
const GRAS = '.ctw[data-tn-titres="gras"]';

describe("un mot ne se coupe jamais au milieu sans trait d'union", () => {
  it("aucune des trois feuilles n'écrit « overflow-wrap:anywhere »", () => {
    for (const css of TOUTES) expect(css).not.toContain("overflow-wrap:anywhere");
  });
});

describe("la couleur de la marque écrite sur le fond de la page reste lisible", () => {
  it("un texte prend --tn-accent-texte ; seule exception, le bouton posé sur la bande de couleur de « La différence »", () => {
    for (const css of TOUTES) {
      const nus = [...css.matchAll(/([^{}]+)\{[^{}]*(?<!-)color:var\(--tn-accent\)[^{}]*\}/g)].map((m) => m[1].trim());
      expect(nus.filter((s) => s !== ".ctw .tn-difference .tn-bt")).toEqual([]);
    }
    expect(regles(VENTE, ".tn-produits-vente .tn-v-prix")).toContain("color:var(--tn-accent-texte,var(--tn-accent))");
    expect(regles(PRODUIT, ".tn-preparation li::before")).toContain("color:var(--tn-accent-texte,var(--tn-accent))");
  });
});

describe("rien ne sort de son rond", () => {
  it("le sceau de la garantie (« 14 jours ») est assez grand, et son texte se réduit dans une tenue aux titres gras", () => {
    const sceau = [...ACHAT.matchAll(/\.ctw \.tn-garantie \.tn-sceau-g\{([^}]*)\}/g)].map((m) => m[1]).join(";");
    expect(sceau).toContain("width:164px");
    expect(regles(ACHAT, `${GRAS} .tn-garantie .tn-sceau-g span`)).toContain("font-size:19px");
    expect(ACHAT).toMatch(/\.tn-garantie\[data-tn-c="bande"\] \.tn-sceau-g b\{font-size:12px/);
  });
  it("le sceau de la note expliquée a une largeur fixe et un texte équilibré", () => {
    expect(PRODUIT).toMatch(/\.ctw \.tn-grade \.tn-sceau\{width:min\(100%,232px\)/);
    expect(PRODUIT).toMatch(/\.ctw \.tn-grade \.tn-sceau b\{[^}]*text-wrap:balance/);
  });
  it("le macaron de l'ouverture grandit avec ce qu'il porte, toujours rond", () => {
    const macaron = [...VENTE.matchAll(/\.ctw \.tn-ouverture-vente \.tn-v-macaron\{([^}]*)\}/g)].map((m) => m[1]).join(";");
    expect(macaron).toContain("width:max-content");
    expect(macaron).toContain("aspect-ratio:1/1");
  });
});

describe("une liste en colonnes passe à la ligne au lieu d'écraser ses textes", () => {
  it("module produit : effets, notes, garanties, « en plus » du colis", () => {
    expect(PRODUIT).toMatch(/\.ctw \.tn-effets ol\{grid-auto-flow:row;grid-template-columns:repeat\(auto-fit/);
    expect(PRODUIT).toMatch(/\.tn-notes\[data-tn-c="colonnes"\] ol:has\(li:nth-child\(4\)\)\{grid-auto-flow:row/);
    expect(PRODUIT).toMatch(/\.tn-garanties ul:has\(li:nth-child\(5\)\)\{grid-auto-flow:row/);
    expect(PRODUIT).toMatch(/\.tn-colis\[data-tn-c="grille"\] \.tn-en-plus ul\{grid-auto-flow:row/);
  });
  it("module achat : avant-après, allergènes, pictos, avantages, livraison, note en bandeau", () => {
    for (const piece of ['.tn-avant-apres-produit ul:has(li:nth-child(5))', '.tn-allergenes[data-tn-c="encadre"] ul:has(li:nth-child(5))', '.tn-pictos:not([data-tn-c="liste"]) ul:has(li:nth-child(6))', '.tn-avantages[data-tn-c="cartes"] ul:has(li:nth-child(5))', '.tn-livraison:not([data-tn-c="cartes"]) ol:has(li:nth-child(6))', '.tn-grade[data-tn-c="bandeau"] ul:has(li:nth-child(5))'])
      expect(regles(ACHAT, piece)).toContain("grid-auto-flow:row");
  });
  it("sur téléphone, une mesure par ligne (à l'échelle, avant-après) : plus trois colonnes d'un mot de large", () => {
    expect(PRODUIT).toMatch(/@media \(max-width:759px\)\{\s*\.ctw \.tn-echelle ul\{display:block\}/);
    expect(ACHAT).toMatch(/@media \(max-width:759px\)\{\s*\.ctw \.tn-avant-apres-produit ul\{display:block\}/);
  });
  it("sous le bouton, en « cartes » : deux repères par rangée sur téléphone", () => {
    expect(ACHAT).toMatch(/\.tn-sous-bouton\[data-tn-c="cartes"\] \.tn-quatre\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  });
});

describe("un nom long n'est jamais un pavé gras", () => {
  it("les cartes aux colonnes étroites prennent le cran 1 (data-tn-long) pour leurs noms", () => {
    expect(ACHAT).toMatch(/\.tn-packs \.tn-pack>label b\[data-tn-long\]\{font-family:var\(--f-ui\)/);
    expect(ACHAT).toMatch(/\.tn-offre-moment \.tn-om-nom\[data-tn-long\]\{font-family:var\(--f-ui\)/);
    expect(VENTE).toContain(`${GRAS} .tn-produits-vente .tn-v-carte b[data-tn-long]`);
    expect(regles(VENTE, `${GRAS} .tn-guide-choix .tn-v-quoi b[data-tn-long]`)).toContain("font-family:var(--f-ui)");
    expect(regles(PRODUIT, `${GRAS} .tn-rayons b[data-tn-long]`)).toContain("font-family:var(--f-ui)");
    expect(regles(PRODUIT, `${GRAS} .tn-comparatif .tn-noms a`)).toContain("font-family:var(--f-ui)");
  });
});

describe("jamais un bouton coupé, jamais une fin de phrase en points de suspension", () => {
  it("le bouton « Découvrir » d'une carte de vente tient dans sa carte", () => {
    expect(VENTE).toMatch(/\.ctw \.tn-produits-vente \.tn-v-voir\{box-sizing:border-box;max-width:calc\(100% - 20px\)/);
  });
  it("l'ombre d'un cadre penché garde sa place en bas de section", () => {
    expect(ACHAT).toContain('.ctw[data-tn-cadre="penche"] .tn-offre-moment:not([data-tn-c="bandeau"]){padding-bottom:8px}');
    expect(ACHAT).toContain('.ctw[data-tn-cadre="penche"] .tn-coloris[data-tn-c="file"] .tn-col-liste{padding-bottom:16px}');
    expect(VENTE).toContain('.ctw[data-tn-cadre="penche"] .tn-guide-choix{padding-bottom:12px}');
    expect(VENTE).toContain('.ctw[data-tn-cadre="penche"] .tn-ouverture-vente[data-tn-c="texte-puis-photo"]{padding-bottom:16px}');
  });
  it("la barre du produit et l'en-tête d'une page d'arrivée écrivent le nom du produit en entier", () => {
    expect(VENTE).toContain(".ctw .tn-barre-produit p b,.ctw .tn-barre-produit p span{white-space:normal;overflow:visible;text-overflow:clip}");
    expect(VENTE).toContain(".ctw .tn-entete-arrivee .tn-v-vers span{overflow:visible;text-overflow:clip");
  });
  it("la fenêtre d'offre sans photo : le titre commence sous la croix", () => {
    expect(ACHAT).toContain('.ctw .tn-fenetre-offre:not([data-tn-c="carte-en-bas"]) .tn-fo-boite:not(:has(>.tn-ph:not(.tn-ph-manque))) .tn-fo-corps{padding-top:64px}');
  });
});

describe("les sélecteurs de tenue gardent la forme du cahier", () => {
  it("« .ctw[data-tn-…] .tn-… » : jamais « .ctw:is(…) » (les essais des modules et la mise en boutique lisent cette forme)", () => {
    for (const css of TOUTES) expect(css).not.toContain(".ctw:is(");
  });
});

describe("aucun vide", () => {
  it("un rayon dont aucun produit n'a de photo n'a pas de cadre vide", () => {
    expect(PRODUIT).toContain(".ctw .tn-rayons .tn-familles a:has(>.tn-ph:not([style])):not(#tn) .tn-ph{display:none}");
  });
});

describe("aucun texte d'exemple chez un client", () => {
  it("hors des emplacements de produit (remplis par le vrai catalogue), aucune pièce n'écrit le nom d'un produit d'exemple", async () => {
    process.env.STUDIO_SYNA_AGENT = "1";
    const { TENUE_SECTIONS, exampleProductNames } = await import("@/lib/syna-agent/custom-theme/tenue");
    const noms = [...exampleProductNames()].filter((x) => x.length >= 5);
    // Le nom du produit du bloc d'achat et les lignes d'un panier sont posés par le Studio avec les vrais produits.
    const POSES = new Set(["tn-achat", "tn-panier", "tn-panier-cote"]);
    const restes = TENUE_SECTIONS.filter((s) => !POSES.has(s.id)).flatMap((s) => {
      const t = s.html.replace(/<a class="(?:tn-carte-p|tn-r|tn-s|tn-v-carte)[^"]*"[\s\S]*?<\/a>/g, " ").replace(/<b data-tn-produit>[\s\S]*?<\/b>/g, " ").replace(/<div class="tn-noms">[\s\S]*?<\/div>/g, " ")
        .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").toLocaleLowerCase("fr-FR");
      return noms.filter((n) => t.includes(n)).map((n) => `${s.id} : « ${n} »`);
    });
    expect(restes).toEqual([]);
  });
  it("la page des résultats montre de vrais produits ; le titre du bloc d'achat resté sur un nom d'exemple prend le vrai nom", async () => {
    process.env.STUDIO_SYNA_AGENT = "1";
    const { tenueSection, withTenueBuyBlock } = await import("@/lib/syna-agent/custom-theme/tenue");
    const D = await import("@/lib/syna-agent/custom-theme/tenue-data");
    const produits = [{ title: "Le sac du quotidien", image: null, price: "89 €" }, { title: "La trousse assortie", image: null, price: "29 €" }, { title: "Le grand sac de voyage", image: null, price: null }];
    const r = D.withTenueSite(tenueSection("tn-resultats")!.html, { products: produits });
    expect(r).toContain("Résultats pour «&nbsp;Le sac du quotidien&nbsp;»");
    expect(r).toContain('<small class="tn-nombre">Deux résultats</small>');
    expect(r.match(/<a class="tn-res"/g)).toHaveLength(2);
    expect(r).toContain("<b>Le grand sac de voyage</b><span><mark");
    expect(r).not.toMatch(/jasmin|Le journal/);
    // Mise en boutique : la vraie recherche de la boutique pose ses résultats ; rien n'est écrit ici.
    expect(D.withTenueSite(tenueSection("tn-resultats")!.html, { products: produits, live: true })).toContain("Thé vert jasmin");
    const achat = withTenueBuyBlock(tenueSection("tn-achat")!.html, { title: "Le sac du quotidien", images: [], price: "89 €", shipping: null, returns: null });
    expect(achat).toMatch(/<h1\b[^>]*>Le sac du quotidien<\/h1>/);
    expect(achat).not.toContain("Thé vert jasmin");
    // Un titre écrit pour le client (texte réécrit) reste tel quel.
    const ecrit = tenueSection("tn-achat")!.html.replace(/<h1>[\s\S]*?<\/h1>/, "<h1>Tapis de yoga</h1>");
    expect(withTenueBuyBlock(ecrit, { title: "Le sac du quotidien", images: [], price: "89 €", shipping: null, returns: null })).toContain("<h1>Tapis de yoga</h1>");
  });
  it("la préparation en étapes et le colis : des exemples neutres, aucune quantité inventée", async () => {
    process.env.STUDIO_SYNA_AGENT = "1";
    const { tenueSection } = await import("@/lib/syna-agent/custom-theme/tenue");
    for (const id of ["tn-preparation", "tn-colis"]) {
      const html = tenueSection(id)!.html, texte = html.replace(/<[^>]+>/g, " ");
      expect(texte, id).not.toMatch(/infuseur|cuillère|jasmin|feuilles|tasse|thé\b|sachet de/i);
      expect(html, id).toContain("[À compléter");
    }
  });
});

describe("rien de coupé", () => {
  it("le cadre « Photo à fournir » écrit ses mots sur des lignes courtes, au milieu (un cadre haut et étroit ne les coupe plus)", async () => {
    process.env.STUDIO_SYNA_AGENT = "1";
    const { provideFrame } = await import("@/lib/syna-agent/custom-theme/render");
    const svg = Buffer.from(provideFrame("la photo du look porté ou composé").split(",")[1], "base64").toString();
    const lignes = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
    expect(lignes[0]).toBe("Photo à fournir");
    expect(lignes.length).toBeGreaterThanOrEqual(4);
    for (const l of lignes.slice(1)) expect(l.length, l).toBeLessThanOrEqual(22);
  });
});

describe("aucun vide quand une photo manque", () => {
  it("boutique fermée « moitié » : la photo est à côté du texte ; sans elle, son cadre s'en va (pas de panneau sombre vide)", async () => {
    process.env.STUDIO_SYNA_AGENT = "1";
    const { textOnPhoto } = await import("@/lib/syna-agent/custom-theme/render");
    expect(textOnPhoto({ id: "tn-fermee", construction: "moitie" } as never)).toBe(false);
    expect(textOnPhoto({ id: "tn-fermee", construction: "photo-pleine" } as never)).toBe(true);
  });
});
