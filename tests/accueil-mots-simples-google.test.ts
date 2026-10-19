/**
 * Accueil : textes compréhensibles par un client non spécialiste (pas de jargon technique) et référencement Google
 * (titre et résumé, données structurées, plan du site, robots). Le grand titre du haut ne change pas.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync("src/app/page.tsx", "utf8");
const comps = ["home-story", "home-demos"].map((f) => fs.readFileSync(`src/components/home/${f}.tsx`, "utf8")).join("\n");
// Textes français affichés (premier argument de T(...) / t(...)).
const frTexts = (src: string) => [...src.matchAll(/\b[Tt]\("((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);

describe("Accueil en mots simples", () => {
  it("le grand titre du haut est inchangé", () => {
    expect(page).toContain("<>Toute votre activité <span className=\"whitespace-nowrap\">e&#8209;commerce.</span></>");
    expect(page).toContain('T("Un seul studio.", "One studio.")');
  });

  it("aucun mot technique dans les textes français de l'accueil", () => {
    const jargon = /\b(SVG|vectoriel|packshot|détour(age|e|é)|pixels?|storyboard|rendu|UGC|Online Store 2\.0|Theme Check|natif|méta-description|SEO|typographies?|modules?)\b/i;
    const bad = [...frTexts(page), ...frTexts(comps)].filter((x) => jargon.test(x));
    expect(bad).toEqual([]);
  });

  it("la découverte gratuite n'est pas présentée comme une création de marque", () => {
    expect(page).not.toContain("votre marque, vos logos et un aperçu de votre page d'accueil, sans carte bancaire");
  });

  it("titre « sur mesure » clair pour un client", () => {
    expect(page).toContain('T("Une boutique vraiment à vous.", "A store that is truly yours.")');
    expect(page).not.toContain("Pas un modèle repeint.");
  });

  it("thèmes : simples captures, galerie publique du site (le retour ramène à l'accueil)", () => {
    expect(page).toContain('T("Quatre modèles de référence,", "Four reference designs,")');
    expect(page).not.toContain("Trente points de départ.");
    expect(page).toContain('<Link href="/themes"');
    expect(page).toContain("<ThemesWall");
    const gallery = fs.readFileSync("src/app/themes/page.tsx", "utf8");
    expect(gallery).toContain('href="/#themes"');
    expect(gallery).not.toContain("/studio/themes");
  });

  it("section « 5 projets, de A à Z » retirée (le menu Démonstrations mène aux marques de démonstration)", () => {
    expect(page).not.toContain("<DemoTabs");
    expect(page).toContain('<span id="demonstrations"');
  });

  it("démonstrations à manipuler signalées « À vous d'essayer »", () => {
    expect(page.match(/<TryHint /g)?.length).toBe(2);
  });

  it("avant / après : la gourde se voit en entier (format portrait)", () => {
    expect(page).toContain('aspect="2 / 3"');
  });

  it("aucune place sur Google n'est promise", () => {
    expect(page).toContain("le classement final, lui, c'est Google qui le décide.");
  });
});

describe("Référencement de l'accueil", () => {
  it("titre et résumé avec les mots que cherchent les clients", () => {
    expect(page).toContain("Boutique en ligne, logo et publicités avec l'IA · E-COM STUDIO IA");
    expect(page).toMatch(/l'IA crée votre logo, votre boutique Shopify, WordPress ou PrestaShop/);
  });

  it("données structurées : l'application et les questions fréquentes affichées", () => {
    expect(page).toContain('type="application/ld+json"');
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).not.toMatch(/aggregateRating|reviewCount/);
  });

  it("plan du site et robots : pages publiques seulement", async () => {
    const robots = (await import("@/app/robots")).default();
    const rules = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(rules.disallow).toEqual(expect.arrayContaining(["/studio", "/admin", "/api/"]));
    expect(String(robots.sitemap)).toMatch(/\/sitemap\.xml$/);
    const urls = (await import("@/app/sitemap")).default().map((u) => new URL(u.url).pathname);
    expect(urls).toContain("/");
    expect(urls.some((u) => /studio|admin|api/.test(u))).toBe(false);
  });
});
