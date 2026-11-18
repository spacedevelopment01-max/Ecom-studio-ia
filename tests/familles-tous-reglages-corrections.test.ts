/**
 * Corrections posées le 18 novembre 2026 en faisant, pour chacune des six familles, la planche « une famille dans tous
 * ses réglages » (« Oui fais les »). Sans IA, sans navigateur : ce que les feuilles du thème doivent porter. Le rendu
 * lui-même se mesure avec le banc (scripts/tour-des-sections/familles.ts --une-famille <famille>).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const feuille = (f: string) => fs.readFileSync(path.join(process.cwd(), "public", "sections", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const banc = (f: string) => fs.readFileSync(path.join(process.cwd(), "scripts", "tour-des-sections", f), "utf8");

describe("ce qui colle dans la page se pose sous l'en-tête, jamais derrière", () => {
  it("l'en-tête au logo centré (deux rangées sur ordinateur) donne une marge plus haute", () => {
    expect(feuille("tenue-coque.css")).toContain('.ctw .tn-ent[data-tn-c="logo-centre"]~.tb-pg{--tn-colle:150px}');
  });
  it("aucune feuille ne colle plus à 100 px en dur : toutes passent par la marge de l'en-tête", () => {
    for (const f of ["tenue.css", "tenue-pages.css", "tenue-vente.css", "tenue-achat.css"]) {
      const css = feuille(f);
      expect(css, f).toContain("var(--tn-colle,100px)");
      expect(css, f).not.toMatch(/top:calc\(var\(--tb-h,0px\) \+ (100|84)px\)/);
    }
  });
});

describe("l'en-tête transparent ne recouvre jamais le haut de l'ouverture", () => {
  it("le titre massif descend son étiquette sous l'en-tête, sur téléphone comme sur ordinateur", () => {
    const css = feuille("tenue-coque.css");
    const avant = '.ctw .tn-ent[data-tn-c="sur-photo"]~.tb-pg>.tn-ouverture[data-tn-c="titre-massif"]:first-child,.ctw .tn-ouverture[data-tn-c="titre-massif"]:is(body:has(.tn-ent[data-tn-c="sur-photo"]) .es-main>.shopify-section:first-child *)';
    const regle = (px: number) => `${avant}{padding-top:${px}px}`;
    expect(css).toContain(regle(80));
    expect(css).toContain(regle(90));
    expect(css).toContain(regle(106));
  });
  it("le banc compare les textes de l'en-tête (même animé) à ceux de la page dessous", () => {
    const js = banc("detecteurs-page.js");
    expect(js).toContain("var duHaut = textes.filter(function (t) { return ent.contains(t.el); })");
    expect(js).toContain("de l'en-tête, sur ");
  });
});

describe("un texte posé sur une photo se lit toujours", () => {
  it("dans la photo : le voile suit le titre (sous le bloc de texte), plus seulement le haut de la photo", () => {
    const css = feuille("tenue.css");
    expect(css).toContain('.ctw .tn-ouverture[data-tn-c="dans-la-photo"]::before{content:none}');
    expect(css).toMatch(/\.ctw \.tn-ouverture\[data-tn-c="dans-la-photo"\]:not\(:has\(>\.tn-ph-manque\)\) \.tn-in::before\{content:"";position:absolute;[^}]*linear-gradient/);
  });
  it("le banc compte comme important un mot qui disparaît (contraste sous 1,5), même sur une partie du texte", () => {
    const ts = banc("banc.ts");
    expect(ts).toContain("export const CONTRASTE_DISPARAIT = 1.5;");
    expect(ts).toMatch(/partiel \? \(ratios\[0\] < CONTRASTE_DISPARAIT && !marque \? "important" : "mineur"\)/);
  });
});

describe("rien ne se chevauche avec les titres fins", () => {
  it("le sceau de garantie s'aère quand les titres sont fins", () => {
    expect(feuille("tenue-achat.css")).toContain('.ctw .tn-garantie .tn-sceau-g:not(:is([data-tn-titres="gras"],[data-tn-titres="capitales"],[data-tn-lourd]) *){gap:14px}');
  });
  it("le grand nom du pied de page laisse la place aux lettres hautes", () => {
    expect(feuille("tenue-recit.css")).toContain('.ctw .tn-pied-complet[data-tn-c="grand-nom"] .tn-geant:not([data-tn-titres="capitales"] *){margin-top:calc(34px + var(--tn-g,200px)*.36)}');
  });
  it("la pastille « À compléter » du macaron garde ses lignes jaunes jointives", () => {
    expect(feuille("tenue-vente.css")).toContain(".ctw .tn-ouverture-vente .tn-v-macaron mark.tn-manque{font-size:12px;padding:2px 4px;line-height:1.3}");
  });
});

describe("le tour des six familles : les derniers défauts réels", () => {
  it("le nom d'un repère du quartier garde ses mots entiers, la distance passe à la ligne", () => {
    const css = feuille("tenue-metiers.css");
    expect(css).toContain(".ctw .tn-bien-quartier .tn-reperes-q b{min-width:0;flex:0 0 auto;max-width:68%}");
    expect(css).toContain(".ctw .tn-bien-quartier .tn-reperes-q span{flex:1 1 0;min-width:0;max-width:48%}");
  });
  it("la citation sur photo : un voile doux suit le texte jusqu'à sa signature, sans dépasser de la section", () => {
    const css = feuille("tenue-recit.css");
    expect(css).toContain('.ctw .tn-citation-photo:not([data-tn-c="moitie"]){overflow:clip}');
    expect(css).toMatch(/\.ctw \.tn-citation-photo:not\(\[data-tn-c="moitie"\]\) \.tn-in::before\{content:"";position:absolute;z-index:-1;[^}]*mask-composite:intersect\}/);
  });
  it("la carte « Essayer » centrée garde ses marges intérieures (téléphone 20 px, ordinateur 52 px)", () => {
    const css = feuille("tenue-achat.css");
    expect(css).toContain('.ctw .tn-essayer[data-tn-c="carte"][data-tn-al="centre"]>h2{margin-left:20px;margin-right:20px}');
    expect(css).toContain('.ctw .tn-essayer[data-tn-c="carte"][data-tn-al="centre"]>h2{margin-left:52px;margin-right:52px}');
  });
  it("journal en cartes, photos penchées : le petit mot sous la photo garde sa place", () => {
    expect(feuille("tenue-recit.css")).toContain('.ctw[data-tn-cadre="penche"] .tn-journal[data-tn-c="cartes"] .tn-art small{margin-top:30px}');
  });
  it("le banc mesure les chevauchements sur la hauteur des lettres, et seulement dans la barre de l'en-tête", () => {
    const js = banc("detecteurs-page.js");
    expect(js).toContain("toile.measureText(txt)");
    expect(js).toContain("var ea = encre(a), eb = encre(b);");
    expect(js).toContain("return r.t >= be.t - 1 && r.b <= be.b + 1;");
  });
  it("le banc garde en mineur le contraste d'une marque « À compléter » (fond jaune et encre fixes)", () => {
    expect(banc("banc.ts")).toContain('ratios[0] < CONTRASTE_DISPARAIT && !marque ? "important" : "mineur"');
  });
});
