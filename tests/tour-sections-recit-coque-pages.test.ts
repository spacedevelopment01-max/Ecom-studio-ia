/**
 * Tour des sections (17 novembre 2026), modules récit, coque et pages : ce que le Studio pose pour que la feuille tienne.
 * Sans IA, sans navigateur. Le rendu lui-même se mesure avec le banc (scripts/tour-des-sections).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tenueCss } from "@/lib/syna-agent/custom-theme/tenue";

const feuille = (f: string) => fs.readFileSync(path.join(process.cwd(), "public", "sections", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const variable = (css: string, nom: string) => new RegExp(`${nom}:([^;}]+)`).exec(css)?.[1];

describe("la couleur de la marque écrite sur le fond de la page reste lisible", () => {
  it("un jaune vif sur un fond crème : l'encre prend sa place", () => {
    const css = tenueCss({ light: "#FFF6E0", dark: "#1A1F3A", primary: "#FFD23F" }, null);
    expect(variable(css, "--tn-accent-texte")).toBe("#1A1F3A");
    expect(variable(css, "--tn-accent")).toBe("#FFD23F");
  });
  it("une couleur de marque sombre sur un fond clair : elle reste elle-même", () => {
    const css = tenueCss({ light: "#F6F1E7", dark: "#1F2A24", primary: "#2F4A3C" }, null);
    expect(variable(css, "--tn-accent-texte")).toBe("#2F4A3C");
  });
  it("les années de la frise et les numéros des étapes s'écrivent avec cette couleur lisible", () => {
    const recit = feuille("tenue-recit.css");
    expect(recit).toMatch(/\.tn-frise[^{]*\bb[^{]*\{[^}]*color:var\(--tn-accent-texte/);
    expect(recit).toMatch(/\.tn-comment[^{]*li::before[^{]*\{[^}]*color:var\(--tn-accent-texte/);
  });
});

describe("ce que le tour a corrigé reste écrit dans les feuilles", () => {
  const recit = feuille("tenue-recit.css"), coque = feuille("tenue-coque.css"), pages = feuille("tenue-pages.css");
  it("une liste longue passe à la ligne sur ordinateur (jamais sept colonnes de quelques lettres)", () => {
    for (const piece of [".tn-comment", ".tn-frise", ".tn-presse", ".tn-chiffres", ".tn-fabrication", ".tn-journal"]) {
      expect(recit, piece).toMatch(new RegExp(`\\${piece}[^{]*:has\\(>[a-z.-]+:nth-child\\([45]\\)\\)[^{]*\\{[^}]*grid-auto-flow:row`));
    }
    expect(coque).toMatch(/\.tn-pied-services \.tn-p-blocs:has\(>\.tn-p-bloc:nth-child\(4\)\)\{grid-template-columns:repeat\(3,/);
  });
  it("en-tête : le nom de la marque n'est plus coupé par des points de suspension sur téléphone", () => {
    expect(coque).toMatch(/@media \(max-width:959px\)\{\s*\.ctw \.tn-ent \.tn-nom\{white-space:normal;overflow:visible;text-overflow:clip/);
  });
  it("en-tête de services : le numéro a de l'air dans sa pilule, et jamais plus de deux actions", () => {
    expect(coque).toMatch(/\.tn-entete-services \.tn-e-tel\{padding:0 13px/);
    expect(coque).toContain(".ctw .tn-entete-services .tn-e-actions>li:nth-child(n+3){display:none}");
  });
  it("recherche : le texte d'attente du champ n'est plus coupé par « … »", () => {
    expect(pages).toMatch(/\.tn-recherche \.tn-cherche input::placeholder\{[^}]*text-overflow:clip/);
    expect(pages).toContain('.ctw .tn-recherche[data-tn-c="panneau"] .tn-cherche input[type]{text-overflow:clip}');
  });
  it("tiroir de panier : le prix a sa colonne bornée et passe à la ligne, il ne recouvre plus le nom", () => {
    expect(pages).toMatch(/\.tn-panier-cote \.tn-ligne:not\(#tn\)\{grid-template-columns:76px minmax\(0,1fr\) fit-content\(38%\)/);
    expect(pages).toMatch(/\.tn-panier-cote \.tn-prix-l\{white-space:normal/);
  });
  it("le nom géant n'est rogné que sur les côtés", () => {
    expect(recit).toContain(".ctw .tn-ouverture-nom,.ctw .tn-pied-complet{overflow:visible;overflow-x:clip}");
  });
});
