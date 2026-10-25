/**
 * Plan du studio pour le client : tous les espaces restent accessibles, rangés dans l'ordre d'usage (votre projet →
 * créer → diffuser → outils avancés repliés), chacun avec une phrase qui dit à quoi il sert ; on ne cache jamais
 * l'espace où l'on se trouve.
 */
import { describe, expect, it } from "vitest";
import { advancedOpen, SPACE_GROUPS, SPACES, spacePurpose } from "@/lib/studio-nav";

describe("Plan du studio", () => {
  it("les 16 espaces, dont Stratégie, Biens (immobilier, issue #172) et Rendez-vous (mission #190), existent une seule fois, chacun dans un groupe connu, avec sa phrase FR et EN", () => {
    const ids = SPACES.map((s) => s.id);
    expect(new Set(ids).size).toBe(16);
    expect(ids).toContain("rendez-vous");
    expect(ids).toContain("strategie");
    for (const s of SPACES) {
      expect(SPACE_GROUPS.map((g) => g.id)).toContain(s.group);
      expect(spacePurpose(s.id, "fr")!.length).toBeGreaterThan(10);
      expect(spacePurpose(s.id, "en")!.length).toBeGreaterThan(10);
    }
  });

  it("les outils techniques sont rangés à part, repliés par défaut ; les espaces de création restent visibles", () => {
    const advanced = SPACES.filter((s) => s.group === "avance").map((s) => s.id);
    expect(advanced.sort()).toEqual(["connexions", "fichiers", "prompts"]);
    expect(SPACE_GROUPS.find((g) => g.id === "avance")!.folded).toBe(true);
    expect(SPACE_GROUPS.filter((g) => g.folded)).toHaveLength(1);
  });

  it("le groupe avancé s'ouvre quand on est dans l'un de ses espaces, même replié", () => {
    expect(advancedOpen("images", false)).toBe(false);
    expect(advancedOpen("connexions", false)).toBe(true);
    expect(advancedOpen("images", true)).toBe(true);
  });

  it("les phrases suivent le type de projet (site de services)", () => {
    expect(spacePurpose("boutique", "fr", "services")).toMatch(/site/i);
    expect(spacePurpose("boutique", "fr", "products")).toMatch(/boutique/i);
    expect(spacePurpose("produit", "en", "services")).toMatch(/services/i);
    expect(spacePurpose("inconnu", "fr")).toBeNull();
  });
});
