/** Planche d'identité : la grille du téléphone (réseaux sociaux) ne répète jamais la même photo. */
import { describe, expect, it } from "vitest";
import { phoneGridPlan } from "@/lib/media/identity-board";

describe("Grille du téléphone de la planche", () => {
  it("chaque photo une seule fois, la case du milieu et le reste aux couleurs de la marque", () => {
    const plan = phoneGridPlan(15, 3);
    const used = plan.filter((x) => x !== null);
    expect(used).toEqual([0, 1, 2]);
    expect(new Set(used).size).toBe(used.length);
    expect(plan.filter((_, i) => i % 3 === 1).every((x) => x === null)).toBe(true);
  });

  it("une seule photo : montrée une fois (plus jamais la même image partout)", () => {
    expect(phoneGridPlan(12, 1).filter((x) => x !== null)).toEqual([0]);
  });

  it("sans photo : uniquement des tuiles de marque", () => {
    expect(phoneGridPlan(9, 0).every((x) => x === null)).toBe(true);
  });
});
