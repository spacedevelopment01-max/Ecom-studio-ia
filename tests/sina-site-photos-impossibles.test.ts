/**
 * Essai réel du 18 novembre 2026 (Atelier Vasco, sans photos) : la conception a posé « La personne derrière la marque »
 * (tn-fondateur, qui demande le portrait du client ou celle de son atelier) alors que le client n'avait envoyé aucune
 * image. Le contrôle du Studio a refusé toute la conception : 4,64 € payés pour rien. Règle du propriétaire : aucune
 * porte de sortie, ce qui ne tient pas, le Studio le remplace lui-même. Sans IA.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("une pièce qui demande des photos impossibles à inventer, sans les photos du client", async () => {
  const O = await import("@/lib/syna-agent/custom-theme/ordre");
  const { authenticSection } = await import("@/lib/syna-agent/custom-theme/library");
  const faits = (clientImages?: number) => ({ business: "products" as const, products: 3, types: [], mobile: false, zoneConnue: false, preuves: new Set<never>(), ...(clientImages === undefined ? {} : { clientImages }) });

  it("le portrait de la personne derrière la marque demande une vraie photo", () => {
    expect(authenticSection("tn-fondateur", "products")).toBeTruthy();
  });

  it("sans image du client, la pièce n'est ni proposée ni permise ; avec ses images, elle l'est ; nombre inconnu : rien ne change", () => {
    expect(O.photosAuthentiquesManquantes("tn-fondateur", faits(0))).toBe(true);
    expect(O.pieceTenable("tn-fondateur", faits(0))).toBe(false);
    expect(O.photosAuthentiquesManquantes("tn-fondateur", faits(5))).toBe(false);
    expect(O.photosAuthentiquesManquantes("tn-fondateur", faits())).toBe(false);
    // Une pièce dont les photos se créent n'est jamais touchée.
    expect(O.photosAuthentiquesManquantes("tn-histoire", faits(0))).toBe(false);
  });

  it("le contrôle de l'ordre le dit au concepteur, et le Studio remplace lui-même la pièce avant le contrôle final", () => {
    const ordre = fs.readFileSync("src/lib/syna-agent/custom-theme/ordre.ts", "utf8");
    expect(ordre).toContain("que le client n'a pas envoyée : prends une autre pièce de ce moment, ou saute-le");
    expect(ordre).toContain("!photosAuthentiquesManquantes(id, f) && (!o?.preuve");
    const tools = fs.readFileSync("src/lib/syna-agent/custom-theme/tools.ts", "utf8");
    expect(tools).toContain("clientImages: site.clientImages ?? 0");
    const i = tools.indexOf("if (!photosAuthentiquesManquantes(id, facts)) continue;"), fin = tools.indexOf("Conception refusée par le contrôle");
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(fin);
    expect(tools).toContain("candidats(x, id).find((k) => k !== id && !posees.has(k) && pieceTenable(k, facts))");
  });
});
