/**
 * Production des publications avec l'IA : le client choisit « toute la publication par l'IA » (visuel complet conçu
 * par l'IA) ou « seulement l'image de fond » (mise en page du studio). Le choix est envoyé à l'estimation ET à la
 * production (même devis, même travail).
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Choix : toute la publication par l'IA ou seulement l'image de fond", () => {
  const src = fs.readFileSync("src/components/studio/social-studio.tsx", "utf8");
  it("les deux options sont proposées (FR/EN)", () => {
    expect(src).toContain("Toute la publication par l'IA");
    expect(src).toContain("Seulement l'image de fond par l'IA");
    expect(src).toContain("The whole post by AI");
  });
  it("le choix part avec l'estimation et avec la production", () => {
    expect(src).toMatch(/action: "estimate"[^}]*aiImages/);
    expect(src).toMatch(/action: "produce", planId: latest\.id, allowPaid: true[^}]*aiImages/);
  });
});
