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
