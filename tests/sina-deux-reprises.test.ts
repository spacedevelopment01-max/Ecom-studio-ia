/**
 * Deux reprises au plus partout (22 novembre 2026), puis SINA montre honnêtement ce qui reste raté. Contrôle de chaque
 * chaîne de création, sans IA.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";
const lire = (f: string) => fs.readFileSync(f, "utf8");

describe("deux reprises au plus, partout", async () => {
  const { REPRISES_MAX } = await import("@/lib/syna-agent/reprises");
  const { MAX_IMAGE_RETRIES } = await import("@/lib/syna-agent/brand-images");
  const { AI_POST_ATTEMPTS } = await import("@/lib/social-v2/deps");
  const { POLICIES } = await import("@/lib/quality/policies");

  it("la règle : deux reprises au plus", () => expect(REPRISES_MAX).toBe(2));

  it("chaque chaîne s'y tient", () => {
    // Les images de la planche et le logo : deux reprises, toutes les raisons des refus données au dessinateur.
    expect(MAX_IMAGE_RETRIES).toBeLessThanOrEqual(REPRISES_MAX);
    // Une publication conçue par l'IA : trois essais, c'est-à-dire deux reprises.
    expect(AI_POST_ATTEMPTS - 1).toBeLessThanOrEqual(REPRISES_MAX);
    // Les créations contrôlées par la barrière de qualité.
    for (const [k, p] of Object.entries(POLICIES as Record<string, { maxRetries?: number }>)) if (typeof p?.maxRetries === "number") expect(p.maxRetries, k).toBeLessThanOrEqual(REPRISES_MAX);
    // Les angles et le plan des publications : une seule reprise, relue.
    expect(lire("src/lib/syna-agent/angles-chain.ts")).toContain("Reprise, UNE fois, par la stratège de l'entrée");
    expect(lire("src/lib/syna-agent/posts-plan.ts")).toContain("Une seule reprise des groupes refusés");
    // Les textes du site : chaque section refusée est réécrite une fois.
    expect(lire("src/lib/syna-agent/custom-theme/brand.ts")).toContain("Chaque section refusée est réécrite UNE fois");
    // La galerie : une reprise par image.
    expect(lire("src/lib/syna-agent/custom-theme/gallery.ts")).toContain("une reprise par image");
  });

  it("ce qui reste raté est dit, jamais caché ni repayé encore", () => {
    const b = lire("src/lib/syna-agent/brand-images.ts");
    expect(b).toMatch(/je n'ai pas gard/);
    expect(b).toContain("for (let attempt = 1; attempt <= MAX_IMAGE_RETRIES && dropped.size && !capped && !blind; attempt++)");
    expect(lire("src/lib/syna-agent/custom-theme/brand.ts")).toContain("ce qui reste est dit au client, jamais caché");
  });
});
