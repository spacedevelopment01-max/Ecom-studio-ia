import { describe, expect, it } from "vitest";
import { customerVoice, STRATEGY_JARGON } from "../src/lib/copy-voice";

describe("Voix client : la phrase d'analyse de marque n'apparaît jamais telle quelle chez le client", () => {
  it("cas réel Cime (gourde) : tournure d'analyste et phrase sur les preuves retirées", () => {
    const s = "La différence défendable tient à l’association confirmée d’un corps en inox double paroi, d’une finition mate vert sauge et d’un bouchon en bambou. Aucune supériorité thermique, résistance particulière ou exclusivité de conception n’est actuellement prouvée.";
    const v = customerVoice(s)!;
    expect(v).toBe("L’association d’un corps en inox double paroi, d’une finition mate vert sauge et d’un bouchon en bambou.");
    expect(v).not.toMatch(STRATEGY_JARGON);
  });

  it("cas réel Racines & Pierres (paysagiste)", () => {
    const v = customerVoice("La différence la mieux étayée est la continuité de l’offre : Racines & Pierres réunit la conception, la création d’aménagements et l’entretien à l’année.")!;
    expect(v.startsWith("La continuité de l’offre")).toBe(true);
    expect(v).not.toMatch(STRATEGY_JARGON);
  });

  it("une phrase déjà écrite pour le client ne change pas ; anglais traité aussi", () => {
    expect(customerVoice("Un corps en inox double paroi et un bouchon en bambou.")).toBe("Un corps en inox double paroi et un bouchon en bambou.");
    expect(customerVoice("The defensible difference is a double-wall steel body. No thermal superiority is proven.")).toBe("A double-wall steel body.");
    expect(customerVoice("")).toBeNull();
  });

  it("tournure après « : » (cas réel : fiche de la boutique Cime)", () => {
    const v = customerVoice("Gourde isotherme 750 ml de Cime : la différence défendable tient à l’association confirmée d’un corps en inox double paroi et d’un bouchon en bambou.")!;
    expect(v).toBe("Gourde isotherme 750 ml de Cime : l’association d’un corps en inox double paroi et d’un bouchon en bambou.");
    expect(v).not.toMatch(STRATEGY_JARGON);
  });

  it("le contrôle des textes du site repère la tournure dans le texte d'ouverture", async () => {
    const { lintJargon } = await import("../src/lib/ai/tasks");
    const r = lintJargon({ hero: { heading: "Paysagiste à Aix", text: "La différence la mieux étayée est la continuité de l’offre." } } as any);
    expect(r.some((x) => x.path === "hero.text")).toBe(true);
  });
});
