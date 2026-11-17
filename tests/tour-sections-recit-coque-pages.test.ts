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
