/** Aide « Décrivez votre activité » : description structurée tirée des réponses, comprise par le moteur local, rien d'inventé. */
import { describe, expect, it } from "vitest";
import { briefChecklist, briefFromText, composeBrief, emptyBrief } from "@/lib/activity-brief";
import { localServiceAnalysis } from "@/lib/engine/local";
import { emptyServiceProfile } from "@/lib/project-types";
import { runWithLang } from "@/lib/i18n-server";

describe("aide à la description de l'activité", () => {
  const a = { ...emptyBrief(), trade: "Carrossier peintre", area: "Mâcon", services: "débosselage, peinture\nremplacement de pare-brise", clients: ["Particuliers", "Assurances"], strengths: ["Devis gratuit"], since: "2012", tone: ["Expert et rassurant"] };

  it("rédige une description complète à partir de réponses courtes", () => {
    const d = composeBrief(a, "fr");
    expect(d.split("\n")[0]).toBe("Carrossier peintre à Mâcon.");
    expect(d).toContain("- Débosselage\n- Peinture\n- Remplacement de pare-brise");
    expect(d).toContain("Clientèle : particuliers et assurances.");
    expect(d).toContain("Ce qui nous distingue : Devis gratuit et depuis 2012.");
    expect(d).toContain("Ton souhaité : expert et rassurant.");
    expect(composeBrief(emptyBrief(), "fr")).toBe("");
    // Rien d'inventé : pas de rubrique sans réponse.
    expect(composeBrief({ ...emptyBrief(), trade: "Plombier" }, "fr")).toBe("Plombier.");
  });

  it("le moteur local en tire métier, zone, prestations et faits", () => {
    const d = composeBrief(a, "fr");
    const { services, product } = runWithLang({ ui: "fr", content: "fr" }, () => localServiceAnalysis({ description: d, services: emptyServiceProfile() }));
    expect(services.area).toBe("Mâcon");
    expect(services.services.map((s) => s.name)).toEqual(["Débosselage", "Peinture", "Remplacement de pare-brise"]);
    expect(product.facts.map((f) => f.key)).toEqual(expect.arrayContaining(["free_quote", "experience"]));
  });

  it("repères de saisie et préremplissage depuis un texte court", () => {
    const checks = briefChecklist("Carrossier à Mâcon, débosselage, peinture, devis gratuit");
    expect(checks.filter((c) => c.ok).map((c) => c.key)).toEqual(["trade", "services", "area", "strengths"]);
    expect(briefFromText("Carrossier à Mâcon, débosselage, peinture, devis gratuit")).toMatchObject({ trade: "Carrossier", area: "Mâcon", services: "débosselage\npeinture" });
  });
});
