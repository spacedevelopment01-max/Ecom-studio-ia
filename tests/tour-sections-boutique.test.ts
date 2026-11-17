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
const GRAS = '.ctw:is([data-tn-titres="gras"],[data-tn-titres="capitales"],[data-tn-lourd])';

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
    expect(ACHAT).toContain(`${GRAS} .tn-garantie .tn-sceau-g span{font-size:19px`);
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
    expect(VENTE).toContain(`${GRAS} .tn-guide-choix .tn-v-quoi b[data-tn-long]{font-family:var(--f-ui)`);
    expect(PRODUIT).toContain(`${GRAS} .tn-rayons b[data-tn-long]{font-family:var(--f-ui)`);
    expect(PRODUIT).toContain(`${GRAS} .tn-comparatif .tn-noms a{font-family:var(--f-ui)`);
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

describe("aucun vide", () => {
  it("un rayon dont aucun produit n'a de photo n'a pas de cadre vide", () => {
    expect(PRODUIT).toContain(".ctw .tn-rayons .tn-familles a:has(>.tn-ph:not([style])):not(#tn) .tn-ph{display:none}");
  });
});
