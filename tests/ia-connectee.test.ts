/** Chemins qui ne servent qu'avec l'IA connectée : réglage Veo, demandes en deux parties avec un verbe accentué. */
import { describe, expect, it } from "vitest";
import { veoPersonGeneration } from "@/lib/ai/media-providers";
import { isSimpleRequest } from "@/lib/engine/local-first";

describe("IA connectée", () => {
  it("Veo 3 en image → vidéo : « allow_adult » (seule valeur acceptée), même sans personne", () => {
    expect(veoPersonGeneration("veo-3.0-generate-001", false)).toBe("allow_adult");
    expect(veoPersonGeneration("veo-3.0-fast-generate-001", true)).toBe("allow_adult");
    expect(veoPersonGeneration("veo-2.0-generate-001", false)).toBe("dont_allow");
  });
  it("deux actions dont un verbe accentué : confiée à l'IA, pas faite à moitié par le moteur local", () => {
    expect(isSimpleRequest("mets le titre en rouge et écris « Bonjour »")).toBe(false);
    expect(isSimpleRequest("change la couleur et enlève le bandeau")).toBe(false);
    expect(isSimpleRequest("écris « Bonjour » dans le titre")).toBe(true);
    expect(isSimpleRequest("mets le titre en rouge")).toBe(true);
  });
});

import { qcTier } from "@/lib/ai/tasks";
describe("images payées jamais perdues", () => {
  it("contrôle : bonne (≥ 7), à vérifier (5-6), écartée (< 5 ou autre produit)", () => {
    expect(qcTier({ sameProduct: true, score: 8 })).toBe("good");
    expect(qcTier({ sameProduct: true, score: 6 })).toBe("warn");
    expect(qcTier({ ok: true, score: 5 })).toBe("warn");
    expect(qcTier({ sameProduct: false, score: 9 })).toBe("bad");
    expect(qcTier({ ok: false, score: 3 })).toBe("bad");
    expect(qcTier(null)).toBe("bad");
  });
});
