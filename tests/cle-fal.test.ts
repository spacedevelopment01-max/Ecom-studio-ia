/** Test d'une clé fal.ai dans l'administration : la raison d'un refus est dite en clair. */
import { describe, expect, it } from "vitest";
import { falKeyShapeProblem, falRefusal } from "@/lib/ai/media-providers";

describe("clé fal.ai", () => {
  it("repère une clé copiée en partie (sans « identifiant:secret »)", () => {
    expect(falKeyShapeProblem("abc123")).toMatch(/incomplète/);
    expect(falKeyShapeProblem("abc:")).toMatch(/incomplète/);
    expect(falKeyShapeProblem("1a2b-3c:4d5e6f")).toBeNull();
  });
  it("crédit épuisé : le dit au lieu de « clé refusée »", () => {
    const m = falRefusal(403, JSON.stringify({ detail: "User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing." }));
    expect(m).toMatch(/crédit/);
    expect(m).toMatch(/Exhausted balance/);
  });
  it("clé invalide : refus avec le message de fal.ai", () => {
    expect(falRefusal(401, JSON.stringify({ detail: "Invalid API key" }))).toMatch(/refusée \(401 : Invalid API key\)/);
  });
});
