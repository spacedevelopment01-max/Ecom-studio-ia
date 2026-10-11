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
    expect(p).toMatch(/8 = beau, lisible, soigné, métier compris au premier regard/);
    expect(p).toMatch(/plairait à la plupart des petites entreprises du métier mérite au moins 8/);
    expect(p).toMatch(/montrer le métier par ses éléments attendus n'est pas un manque d'originalité/);
    // Bienveillant comme un client, mais les vrais défauts restent notés bas.
    expect(p).toMatch(/garde les notes basses pour les défauts réellement visibles/);
  });

  it("emblème illustré, icône + nom, signature : l'originalité pèse moins que le dessin ; minimal et monogramme inchangés", () => {
    for (const s of ["illustrated", "emblem", "textured", "typographic"] as const) {
      expect(STYLE_WEIGHTS[s].originality).toBeLessThan(STYLE_WEIGHTS[s].relevance);
      expect(STYLE_WEIGHTS[s].distinctiveness).toBeLessThan(1);
    }
    expect(STYLE_WEIGHTS.minimal.originality).toBe(1.3);
    expect(STYLE_WEIGHTS.monogram.originality).toBe(1.3);
  });

  it("barrière assouplie à 7,5/10 (demande du propriétaire) ; un dessin vraiment faible bloque toujours", () => {
    const p = POLICIES.logo_artwork;
    expect(p.final).toBe(7.5);
    expect(p.criteriaFloors).toMatchObject({ craft: 6.5, originality: 4.5, distinctiveness: 4.5 });
    const base = { relevance: 9, originality: 5, craft: 9, typography: 9, composition: 9, colour: 9, legibility: 9, memorability: 8.5, distinctiveness: 5, intendedUse: 8.5 };
    const ok = decide("logo_artwork", { checker: "ai", score: artworkScore(crit(base), "illustrated"), criteria: base });
    expect(ok.weakCriteria).toEqual([]);
    expect(ok.verdict).toBe("FINAL");
    const clumsy = { ...base, craft: 6 };
    const d = decide("logo_artwork", { checker: "ai", score: 8.2, criteria: clumsy });
    expect(d.verdict).not.toBe("FINAL");
    expect(d.weakCriteria).toContain("craft");
  });

  it("vraies notes de la série « restaurant végétarien » (7,6) : le logo passe désormais", () => {
    const graine = { relevance: 9, originality: 6, craft: 8, typography: 8, composition: 8, colour: 8, legibility: 8, memorability: 7, distinctiveness: 6, intendedUse: 7 };
    expect(artworkScore(crit(graine), "illustrated")).toBe(7.6);
    expect(decide("logo_artwork", { checker: "ai", score: 7.6, criteria: graine }).verdict).toBe("FINAL");
  });
});
