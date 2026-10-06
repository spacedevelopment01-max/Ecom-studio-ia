/** Aide « Décrivez votre activité » : description structurée tirée des réponses, comprise par le moteur local, rien d'inventé. */
import { describe, expect, it } from "vitest";
import { briefChecklist, briefFromText, composeBrief, emptyBrief, hasArea } from "@/lib/activity-brief";
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

  it("zone reconnue sous toutes ses formes (majuscule ou non, code postal, rayon, nom propre)", () => {
    for (const ok of ["Carrossier à Mâcon", "carrossier à mâcon", "Carrossier Mâcon, peinture", "Garage sur Lyon et environs", "Plombier 71000", "Intervention dans un rayon de 30 km", "Coiffeuse à domicile autour de Dijon", "Carrossier en Saône-et-Loire"]) expect(hasArea(ok), ok).toBe(true);
    for (const no of ["Carrossier, débosselage, peinture", "Coiffure à domicile", "Cours à distance, devis gratuit", "Plombier. Dépannage rapide"]) expect(hasArea(no), no).toBe(false);
  });

  it("le moteur reprend une ville écrite sans majuscule", () => {
    const r = (d: string) => runWithLang({ ui: "fr", content: "fr" }, () => localServiceAnalysis({ description: d, services: emptyServiceProfile() })).services.area;
    expect(r("carrossier à mâcon, débosselage")).toBe("Mâcon");
    expect(r("plombier à chalon-sur-saône")).toBe("Chalon-sur-Saône");
    expect(r("coiffure à domicile")).toBe("");
  });
});

describe("description complète (assistant en 5 étapes)", () => {
  it("toutes les réponses arrivent dans l'analyse, la marque et les textes du site", async () => {
    const { localBrand, localServiceAnalysis: analyse } = await import("@/lib/engine/local");
    const { localCopy } = await import("@/lib/engine/local-copy");
    const { parseBrief } = await import("@/lib/activity-brief");
    const full = {
      ...emptyBrief(),
      trade: "Carrossier peintre",
      area: "Mâcon",
      services: "Débosselage — 1 h — à partir de 80 €\nPeinture carrosserie\nRemplacement de pare-brise",
      clients: ["Particuliers", "Assurances"],
      needs: "Après un accrochage ou un accident\nPour une prise en charge par l'assurance",
      steps: "Diagnostic et photos du véhicule\nDevis détaillé\nRéparation à l'atelier\nContrôle final et restitution du véhicule",
      delay: "rendez-vous sous 48 h",
      quote: "devis gratuit sous 24 h",
      faq: "Travaillez-vous avec mon assurance ? Oui, avec toutes les assurances.\nProposez-vous un véhicule de prêt ?",
      strengths: ["Devis gratuit"],
      since: "2012",
      proofs: "Agréé assurances",
      goals: ["Recevoir des demandes de devis"],
      look: ["Moderne et technique"],
      tone: ["Expert et rassurant"],
      avoid: "jargon technique",
    };
    const d = composeBrief(full, "fr");
    const parsed = parseBrief(d)!;
    expect(parsed.headline).toBe("Carrossier peintre à Mâcon");
    expect(parsed.sections.steps).toHaveLength(4);
    expect(parsed.sections.faq).toHaveLength(2);

    const { product, services } = runWithLang({ ui: "fr", content: "fr" }, () => analyse({ description: d, services: emptyServiceProfile() }));
    // Prestations : seulement la liste (jamais une étape ou une question), avec prix et durée.
    expect(services.services.map((s) => s.name)).toEqual(["Débosselage", "Peinture carrosserie", "Remplacement de pare-brise"]);
    expect(services.services[0]).toMatchObject({ duration: "1 h", price: "à partir de 80 €" });
    expect(services.area).toBe("Mâcon");
    const keys = product.facts.map((f) => f.key);
    for (const k of ["audience", "needs", "process", "delay", "quote_details", "faq", "credentials", "site_goal", "look", "tone", "avoid", "free_quote", "experience"]) expect(keys, k).toContain(k);

    const biz = { business: "services" as const, services };
    const { brand } = runWithLang({ ui: "fr", content: "fr" }, () => localBrand(product, "AutoDim", biz as any));
    expect(brand.audience).toMatch(/particuliers et assurances/);
    expect(brand.positioning).toMatch(/Pour : particuliers et assurances/);
    expect(brand.tone.voice).toMatch(/Expert et rassurant/i);
    expect(brand.tone.dont[0]).toMatch(/Jargon technique/);

    const copy = runWithLang({ ui: "fr", content: "fr" }, () => localCopy(product, brand, biz as any));
    expect(copy.story.steps.map((s) => s.title)).toEqual(["Diagnostic et photos du véhicule", "Devis détaillé", "Réparation à l'atelier", "Contrôle final et restitution du véhicule"]);
    const faq = copy.faq.items.map((x) => `${x.q} ${x.a}`).join("\n");
    expect(faq).toContain("Travaillez-vous avec mon assurance ? Oui, avec toutes les assurances");
    expect(faq).toMatch(/rendez-vous sous 48 h/i);
    expect(faq).toMatch(/devis gratuit sous 24 h/i);
    expect(faq).toMatch(/Proposez-vous un véhicule de prêt \?/);
  });

  it("suggestions selon le métier", async () => {
    const { packFor } = await import("@/lib/activity-packs");
    expect(packFor("Carrossier peintre").id).toBe("auto");
    expect(packFor("Psychologue").id).toBe("sante");
    expect(packFor("Plombier chauffagiste").id).toBe("batiment");
    expect(packFor("Coiffeuse à domicile").id).toBe("beaute");
    expect(packFor("Tapissier décorateur").id).toBe("generic");
  });
});
