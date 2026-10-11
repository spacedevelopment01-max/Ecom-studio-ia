import { describe, expect, it } from "vitest";
import { ARTWORK_REVIEW_SYSTEM, STYLE_WEIGHTS, artworkScore } from "@/lib/logo-v2/artwork";
import { decide } from "@/lib/quality/gate";
import { POLICIES } from "@/lib/quality/policies";

const crit = (o: Record<string, number>) => ({ criteria: o as any });

describe("Notation des logos de petites entreprises (ligne validée par le propriétaire)", () => {
  it("le contrôle juge en directeur artistique de petites entreprises, avec une échelle expliquée", () => {
    const p = ARTWORK_REVIEW_SYSTEM("illustrated");
    expect(p).toMatch(/PETITES ENTREPRISES/);
    expect(p).not.toMatch(/grande agence de branding/);
    expect(p).toMatch(/8 = beau et soigné, métier compris au premier regard/);
    expect(p).toMatch(/montrer le métier par ses éléments attendus n'est pas un manque d'originalité/);
    // Toujours honnête : aucune note relevée pour faire passer un logo moyen.
    expect(p).toMatch(/ne relève pas une note pour faire passer un logo moyen/);
  });

  it("emblème illustré, icône + nom, signature : l'originalité pèse moins que le dessin ; minimal et monogramme inchangés", () => {
    for (const s of ["illustrated", "emblem", "textured", "typographic"] as const) {
      expect(STYLE_WEIGHTS[s].originality).toBeLessThan(STYLE_WEIGHTS[s].relevance);
      expect(STYLE_WEIGHTS[s].distinctiveness).toBeLessThan(1);
    }
    expect(STYLE_WEIGHTS.minimal.originality).toBe(1.3);
    expect(STYLE_WEIGHTS.monogram.originality).toBe(1.3);
  });

  it("barrière inchangée à 8/10 ; originalité à 5 n'est plus un critère bloquant, un dessin faible l'est toujours", () => {
    const p = POLICIES.logo_artwork;
    expect(p.final).toBe(8);
    expect(p.criteriaFloors).toMatchObject({ craft: 7, originality: 5, distinctiveness: 5 });
    const base = { relevance: 9, originality: 5, craft: 9, typography: 9, composition: 9, colour: 9, legibility: 9, memorability: 8.5, distinctiveness: 5, intendedUse: 8.5 };
    const ok = decide("logo_artwork", { checker: "ai", score: artworkScore(crit(base), "illustrated"), criteria: base });
    expect(ok.weakCriteria).toEqual([]);
    expect(ok.verdict).toBe("FINAL");
    const clumsy = { ...base, craft: 6.5 };
    const d = decide("logo_artwork", { checker: "ai", score: 8.2, criteria: clumsy });
    expect(d.verdict).not.toBe("FINAL");
    expect(d.weakCriteria).toContain("craft");
  });

  it("vraies notes de la série « restaurant végétarien » : même calcul honnête (7,5 → 7,6), la hausse viendra du contrôle recalibré", () => {
    const graine = { relevance: 9, originality: 6, craft: 8, typography: 8, composition: 8, colour: 8, legibility: 8, memorability: 7, distinctiveness: 6, intendedUse: 7 };
    expect(artworkScore(crit(graine), "illustrated")).toBe(7.6);
  });
});
