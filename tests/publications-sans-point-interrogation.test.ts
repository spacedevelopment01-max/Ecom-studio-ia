/**
 * Publications : plus de « ? » ajouté à un nom ou à une prestation (constaté : « Fleuriste artisan · atelier floral · ? »,
 * « Création de jardin ? ») ; une vraie question garde son point d'interrogation.
 */
import { describe, expect, it } from "vitest";
import { isQuestion, qmark } from "../src/lib/social-v2/copy";

describe("Point d'interrogation des publications", () => {
  it("reconnaît les vraies questions (FR/EN)", () => {
    for (const q of ["Comment l'entretenir", "Quel prix prévoir", "Combien de temps garde-t-elle le froid", "How do I clean it", "Peut-on la mettre au lave-vaisselle", "Livrez-vous le dimanche ?"]) expect(isQuestion(q)).toBe(true);
    for (const s of ["Création de jardin", "Fleuriste artisan · atelier floral", "Bouquet du marché", "Double-wall steel bottle"]) expect(isQuestion(s)).toBe(false);
  });

  it("n'ajoute jamais « ? » à un nom, retire le séparateur qui traîne", () => {
    expect(qmark("Fleuriste artisan · atelier floral ·")).toBe("Fleuriste artisan · atelier floral");
    expect(qmark("Création de jardin")).toBe("Création de jardin");
  });

  it("ajoute « ? » à une vraie question, sans doubler", () => {
    expect(qmark("Comment l'entretenir")).toBe("Comment l'entretenir ?");
    expect(qmark("Quel prix prévoir ?")).toBe("Quel prix prévoir ?");
  });
});
