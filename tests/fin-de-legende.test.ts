/**
 * Fins de légende sans ordre et 0 à 3 mots-dièse (décision du 22 novembre 2026, au nom de la règle du propriétaire
 * « aucun ordre donné au lecteur ») : la consigne le dit, et le code le contrôle et le corrige, sans appel payant.
 */
import { describe, expect, it } from "vitest";
import { CONSIGNE_FIN_DE_LEGENDE, MOTS_DIESE_MAX, bornerMotsDiese, estUnOrdre, ordreEnFin, sansOrdreEnFin } from "@/lib/social-v2/fin-de-legende";

describe("fin de légende : jamais un ordre au lecteur", () => {
  it("reconnaît les ordres (tutoiement, vouvoiement, infinitif court, anglais)", () => {
    for (const x of ["Commande maintenant.", "Clique sur le lien.", "Découvre la collection.", "Enregistrez la publication pour la retrouver.", "Réserve ta table !", "Dites-le-nous en commentaire.", "Abonnez-vous.", "Partage à un ami.", "Demander un devis", "Réserver une table", "S'inscrire", "Shop now.", "Book your table.", "Venez nous voir samedi.", "Garde-la pour samedi."]) expect(estUnOrdre(x), x).toBe(true);
  });
  it("laisse passer les questions, les invitations et les faits", () => {
    for (const x of ["Et toi, plutôt sucré ou nature ?", "Le coffret t'attend à l'atelier jusqu'à samedi.", "Commande passée avant midi, partie le jour même.", "Partage d'expérience : trois ans d'atelier.", "Visite du chantier en images.", "Lien en bio.", "Tout est sur la boutique.", "Chez nous, le pain sort à 7 h.", "Ouvert le dimanche matin.", "Dites-moi, vous préférez lequel ?"]) expect(estUnOrdre(x), x).toBe(false);
  });
  it("ne regarde que la fin, sans compter la ligne de mots-dièse", () => {
    expect(ordreEnFin("Le pain sort du four à 7 h.\n\nCommande ta baguette maintenant.\n\n#boulangerie #rennes")).toBe("Commande ta baguette maintenant.");
    expect(ordreEnFin("Clique ici pour voir. Le pain sort à 7 h, encore tiède à 8 h.")).toBeNull();
  });
  it("le Studio retire l'ordre final lui-même, sans toucher au reste ni aux mots-dièse", () => {
    const r = sansOrdreEnFin("Le pain sort du four à 7 h.\nIl craque encore à 8 h. Commande maintenant !\n\n#boulangerie");
    expect(r.retire).toEqual(["Commande maintenant !"]);
    expect(r.caption).toBe("Le pain sort du four à 7 h.\nIl craque encore à 8 h.\n\n#boulangerie");
    expect(sansOrdreEnFin("Une question ? On y répond en commentaire.").retire).toEqual([]);
    // Deux ordres à la suite : les deux partent.
    expect(sansOrdreEnFin("Le coffret est prêt.\n\nDécouvre-le. Clique sur le lien.").caption).toBe("Le coffret est prêt.");
  });
  it("0 à 3 mots-dièse, et la consigne le dit à tous les rédacteurs", () => {
    expect(MOTS_DIESE_MAX).toBe(3);
    expect(bornerMotsDiese(["a", "b", "c", "d", "e"])).toEqual(["a", "b", "c"]);
    expect(bornerMotsDiese([])).toEqual([]);
    expect(CONSIGNE_FIN_DE_LEGENDE).toMatch(/jamais sur un ordre/);
    expect(CONSIGNE_FIN_DE_LEGENDE).toMatch(/De 0 à 3 mots-dièse/);
  });
  it("une légende qui n'est qu'un ordre n'est jamais vidée : elle reste signalée pour être refaite", () => {
    expect(sansOrdreEnFin("Découvrez notre compagnon lapin.").caption).toBe("Découvrez notre compagnon lapin.");
    expect(ordreEnFin("Découvrez notre compagnon lapin.")).toBe("Découvrez notre compagnon lapin.");
  });
  it("plan de SINA : ce qui reste fautif après la reprise est corrigé par le code, sans appel", async () => {
    const { finDeLegende } = await import("@/lib/syna-agent/posts-plan");
    const notes: string[] = [];
    const g = finDeLegende({ angleId: "a", subject: "conseil", title: "Thé : trois gestes", points: [], cta: "Enregistre ce mémo", caption: "Le matin n'a pas besoin d'aller vite. Trois gestes, et la journée commence à ton rythme.\n\nCommande ton thé maintenant.", hashtags: ["#a1", "#b2", "#c3", "#d4", "#e5"], visual: "x".repeat(60), look: "plan large", product: null, concept: { idea: "x".repeat(12), composition: "x".repeat(12), framing: "x".repeat(8), setting: "x".repeat(8), light: "x".repeat(8), materials: "x".repeat(8), typography: "x".repeat(8), effects: "", rationale: "x".repeat(20), diversity: "x".repeat(20), ctaStyle: "button" } }, notes, 0);
    expect(g.caption).toBe("Le matin n'a pas besoin d'aller vite. Trois gestes, et la journée commence à ton rythme.");
    expect(g.hashtags).toEqual(["#a1", "#b2", "#c3"]);
    // La pastille qui reste un ordre n'est pas posée sur l'image.
    expect(g.concept?.ctaStyle).toBe("none");
    expect(notes.join(" ")).toMatch(/ordre retiré/);
  });
});
