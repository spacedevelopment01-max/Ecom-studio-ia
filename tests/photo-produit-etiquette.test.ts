import { describe, expect, it } from "vitest";
import { codePhotoPrompt } from "../src/lib/syna-agent/mockup-code/code-mockup";
import { STEP_GUIDES } from "../src/lib/syna-agent/journey";

// Essai « Éclat de thé » du 10 novembre 2026 : la description d'une scène finissait par « Aucun texte, aucune lettre… »
// alors que le vrai sachet porte son nom et son logo : OpenAI dessinait des sachets vierges, refusés au contrôle.
describe("photo d'une scène avec le vrai produit", () => {
  const description = "Photo d'ambiance au format paysage 16:9. Un sachet kraft posé sur une table en bois. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane.";
  it("garde l'étiquette du produit telle quelle, sans contradiction", () => {
    const p = codePhotoPrompt({ id: "x", description, ratio: "16:9", product: true }, { name: "Éclat de thé", logo: false, product: true });
    expect(p).not.toMatch(/Aucun texte, aucune lettre/);
    expect(p).not.toMatch(/Aucun logo, aucun nom de marque/);
    expect(p).toMatch(/étiquette du produit garde ses mots et son logo/);
    expect(p).toMatch(/UNE seule fois/);
  });
  it("sans produit, aucun texte ni logo n'est permis", () => {
    const p = codePhotoPrompt({ id: "x", description, ratio: "16:9", product: false }, { name: "Éclat de thé", logo: false, product: false });
    expect(p).toMatch(/Aucun texte, aucune lettre/);
    expect(p).toMatch(/Aucun logo, aucun nom de marque/);
  });
});

describe("faits du client à l'étape 6", () => {
  it("la livraison et les retours de la carte « Ton activité » sont des faits confirmés", () => {
    expect(STEP_GUIDES[6]).toMatch(/livraison \(transporteur, délai, prix, livraison offerte\)/);
  });
});

describe("preuves « à confirmer » de l'angle", () => {
  it("la livraison et les retours donnés à l'étape 5 ne sont plus « non confirmés »", async () => {
    const { stillToConfirm } = await import("../src/lib/syna-agent/mockup-code/copy");
    const list = ["Délais et frais de livraison", "Conditions de retour", "Origine des plantes"];
    expect(stillToConfirm(list, { shipping: "Colissimo, 48 à 72 h, 4,90 €" })).toEqual(["Conditions de retour", "Origine des plantes"]);
    expect(stillToConfirm(list, { shipping: "Colissimo", returns: "14 jours" })).toEqual(["Origine des plantes"]);
    expect(stillToConfirm(list, null)).toEqual(list);
  });
});

describe("relecture des descriptions de photos avant création", () => {
  it("retire les phrases qui décrivent l'étiquette quand la vraie photo est jointe", () => {
    const d = "Un sachet kraft debout. Une étiquette rectangulaire vert pâle, unie, est collée au milieu. Une tasse fumante à côté.";
    const p = codePhotoPrompt({ id: "x", description: d, ratio: "4:5", product: true }, { name: "Éclat de thé", logo: false, product: true });
    expect(p).not.toMatch(/vert pâle, unie/);
    expect(p).toMatch(/Une tasse fumante/);
  });
  it("photo de l'emballage ou non (feuilles en gros plan : aucune photo du produit jointe)", async () => {
    const { showsPackaging } = await import("../src/lib/syna-agent/custom-theme/brand");
    expect(showsPackaging("Le sachet kraft Jasmin délicat posé sur le bureau.")).toBe(true);
    expect(showsPackaging("Une cuillère remplie de feuilles sèches de thé vert.")).toBe(false);
  });
  it("une description à plusieurs paquets est réécrite (une seule photo du produit peut être jointe)", async () => {
    const { briefUsable } = await import("../src/lib/syna-agent/custom-theme/brand");
    expect(briefUsable("Un pot contient trois sachets kraft. Un quatrième sachet devant.")).toBe(false);
    expect(briefUsable("Le sachet Jasmin délicat près d'une tasse.")).toBe(true);
  });
  it("les « stories » (un rond par produit) reçoivent la vraie photo du produit", async () => {
    const { showsProductAlone } = await import("../src/lib/syna-agent/custom-theme/brand");
    expect(showsProductAlone({ role: "contenu", title: "Histoires façon « stories »" }, "Photo produit, au format vertical 9:16")).toBe(true);
    expect(showsProductAlone({ role: "contenu", title: "Avant / après" }, "Photo produit en gros plan macro")).toBe(false);
  });
});

describe("scène achetable en grille de vraies photos (décision du 10 novembre 2026)", () => {
  it("remplace la grande photo par une tuile par produit de la liste, sans photo à créer", async () => {
    const { sceneGrid } = await import("../src/lib/syna-agent/custom-theme/theme");
    const html = `<section class="p8" data-p8><div class="p8-ph"><img src="photos/sachet-bois.jpg" alt=""><span class="p8-mk" data-mk="0"></span></div><div><div class="p8-ls">`
      + `<label class="p8-it" data-it="0"><input type="checkbox" checked data-p="8.5"><img src="/api/files/a1" alt=""><span><b>Jasmin délicat</b></span></label>`
      + `<label class="p8-it" data-it="1"><input type="checkbox" checked data-p="7.5"><img src="/api/files/b2" alt=""><span><b>Menthe fraîche</b></span></label>`
      + `<label class="p8-it" data-it="2"><input type="checkbox" checked data-p="7.5"><img src="/api/files/c3" alt=""><span><b>Vanille douce</b></span></label></div></div></section>`;
    const out = sceneGrid(html);
    expect(out).not.toContain("photos/sachet-bois.jpg");
    expect(out).not.toContain("p8-mk");
    expect(out).toContain('data-p8g data-n="3"');
    expect(out).toContain('<img data-gi="2" src="/api/files/c3" alt="Vanille douce">');
    expect(sceneGrid(out)).toBe(out); // relu sans changement
  });
});

describe("script de la scène achetable", () => {
  it("la grille et la phrase de livraison offerte suivent les cases cochées", async () => {
    const js = (await import("node:fs")).readFileSync("public/sections/library.js", "utf8");
    expect(js).toContain('var gr=q("[data-p8g]",s);function grid()');
    expect(js).toContain("La livraison t’est offerte.");
    expect(js).toContain('i.addEventListener("change",function(){tot();grid();ship()})');
  });
});
