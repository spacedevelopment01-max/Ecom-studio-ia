import { describe, expect, it } from "vitest";
import { localAds, AD_CTAS } from "@/lib/engine/ads";
import { emptyProduct } from "@/lib/project-types";
import type { Project } from "@/lib/projects";

const project = (language: "fr" | "en") =>
  ({
    id: "p1",
    settings: { language },
    product: { ...emptyProduct(), name: "Sérum Éclat", facts: [{ key: "capacity", label: "Contenance", value: "30 ml", status: "confirmed", source: "photo" }] },
    brand: { name: "Maison Lune", tagline: "La douceur au quotidien" },
    strategy: { angles: [{ title: "Rituel du soir", idea: "Un geste simple pour finir la journée." }] },
  }) as unknown as Project;

describe("annonces locales", () => {
  it("français : reprend les angles et faits de la stratégie", () => {
    const ads = localAds(project("fr"), "fr", 3);
    expect(ads).toHaveLength(3);
    expect(ads[0].angle).toBe("Rituel du soir");
    expect(ads[0].primary).toContain("Contenance : 30 ml");
    for (const a of ads) expect(AD_CTAS.fr).toContain(a.cta);
  });

  it("anglais pour un projet français : aucun texte français repris, boutons anglais, espaces réservés anglais", () => {
    const ads = localAds(project("fr"), "en", 3);
    expect(ads).toHaveLength(3);
    const text = ads.map((a) => `${a.angle} ${a.primary} ${a.headline}`).join(" ");
    expect(text).not.toMatch(/Rituel|Contenance|douceur|À compléter|[«»]/);
    expect(text).toContain("[To complete:");
    expect(text).toContain("Maison Lune");
    for (const a of ads) expect(AD_CTAS.en).toContain(a.cta);
  });
});
