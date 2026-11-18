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
    expect(js).toContain("var duHaut = textes.filter(function (t) { return ent.contains(t.el); });");
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
    expect(ts).toMatch(/partiel \? \(ratios\[0\] < CONTRASTE_DISPARAIT \? "important" : "mineur"\)/);
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
