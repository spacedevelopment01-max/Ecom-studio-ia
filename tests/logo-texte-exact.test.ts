/**
 * Contrôle d'un logo complet dessiné par l'IA d'images : la ligne d'activités et le slogan sont vérifiés mot à mot
 * comme le nom (le logo de la démo Sonore était passé avec « SUPRA-AURICUULAIRE ») ; une personne dessinée
 * (tête, visage, silhouette) est refusée sans l'accord du client.
 */
import { describe, expect, it } from "vitest";
import { artworkCodes, gateArtwork, misspelledWords } from "@/lib/logo-v2/artwork";
import { ART_CRITERIA } from "@/lib/logo-v2/types";

const review = (o: Record<string, unknown> = {}) => ({ criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, 8.8])), textRead: "", nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues: [], needsSimplifiedMark: false, genericConcept: false, fix: { target: "none", instruction: "" }, ...o }) as any;
const t = { style: "emblem" } as any;
const expected = { name: "Sonore", descriptor: "CASQUE AUDIO • SUPRA-AURICULAIRE", tagline: null };

describe("logo complet : tout le texte vérifié", () => {
  it("ligne d'activités mal écrite : faute relevée, logo jamais validé", () => {
    const r = review({ textRead: "SONORE CASQUE AUDIO SUPRA-AURICUULAIRE" });
    expect(misspelledWords(r.textRead, expected)).toEqual(["supra-auriculaire"]);
    expect(artworkCodes(r, expected)).toContain("text_mismatch");
    const d = gateArtwork(r, t, expected, 1);
    expect(d.verdict).not.toBe("FINAL");
    expect(d.feedback).toMatch(/texte mal écrit : supra-auriculaire/);
  });

  it("texte exact (accents compris) : validé", () => {
    const r = review({ textRead: "SONORE · CASQUE AUDIO · SUPRA-AURICULAIRE" });
    expect(artworkCodes(r, expected)).toEqual([]);
    expect(gateArtwork(r, t, expected, 0).verdict).toBe("FINAL");
    expect(misspelledWords("Le temps, bien porte", { tagline: "Le temps, bien porté" })).toEqual(["porté"]);
  });

  it("personne dessinée (tête sans visage comprise) : refusée", () => {
    const r = review({ textRead: "SONORE CASQUE AUDIO SUPRA-AURICULAIRE", person: true });
    expect(artworkCodes(r, expected)).toContain("unauthorized_person");
    expect(gateArtwork(r, t, expected, 0).verdict).toBe("REJECTED");
  });
});
