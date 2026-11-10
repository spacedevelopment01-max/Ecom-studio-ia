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
