/**
 * Rôles de contenu (consigne du 21 octobre, 19 h 50, § 4) : chaque section proposable dans les familles a un rôle,
 * chaque rôle (hors gabarits) dit quels champs de l'angle le nourrissent et ce qu'il ne faut jamais écrire.
 */
import { describe, expect, it } from "vitest";
import { ALL_ENTRIES, isStructuralType } from "@/lib/theme/section-families";
import { CONTENT_ROLES, SECTION_CONTENT_ROLE, contentRole } from "@/lib/theme/content-roles";

describe("rôles de contenu des sections", () => {
  it("toute section des trois familles a un rôle", () => {
    const missing = [...new Set(ALL_ENTRIES.flatMap((e) => e.dispositions.map((d) => d.type)))].filter((t) => !isStructuralType(t) && !contentRole(t));
    expect(missing).toEqual([]);
  });
  it("chaque rôle éditorial est relié à l'angle et porte un interdit", () => {
    for (const role of Object.values(CONTENT_ROLES)) {
      expect(role.job.length).toBeGreaterThan(10);
      expect(role.never.length).toBeGreaterThan(10);
      if (!["practical", "structural"].includes(role.id)) expect(role.heading.length + role.text.length).toBeGreaterThan(0);
    }
  });
  it("les avis et la garantie ne sont jamais nourris par une hypothèse créative", () => {
    expect(SECTION_CONTENT_ROLE["cv-reviews"]).toBe("proof");
    expect(SECTION_CONTENT_ROLE["cv-guarantee"]).toBe("proof");
    expect(CONTENT_ROLES.proof.never).toMatch(/inventés/);
  });
  it("les gabarits n'ont pas d'angle", () => {
    expect(contentRole("main-cart")?.id).toBe("structural");
    expect(contentRole("legal-page")?.id).toBe("structural");
  });
});
