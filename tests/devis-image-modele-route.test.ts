/**
 * Devis d'une image : il suit le modèle d'images réellement routé (Qwen-Image 3.0 Pro), pas la route texte « OpenAI »
 * de la tâche image_generation (qui annonçait ~0,69 € pour 2 essais au lieu de ~0,15 €).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

let routed: { provider: string; model: string; reason: string } | null = null;
vi.mock("@/lib/ai/media-providers", async (orig) => ({ ...(await orig<object>()), mediaRouteFor: () => routed }));

describe("devis d'une image : modèle d'images réellement routé", async () => {
  const { estimateMicro } = await import("@/lib/ai/estimate");
  const { DEFAULT_PRICES, usdToEur } = await import("@/lib/ai/config");
  const { EUR } = await import("@/lib/billing");
  const qwen = { provider: "alibaba", model: "qwen-image-3.0-pro", reason: "test" };
  const perImage = (DEFAULT_PRICES as Record<string, { perImage: number }>)["alibaba:qwen-image-3.0-pro"].perImage;

  beforeEach(() => {
    routed = null;
  });

  it("Qwen-Image 3.0 Pro routé : la part image du devis est son tarif à l'image (marge de 20 % comprise)", () => {
    routed = { provider: "alibaba", model: "modele-sans-tarif", reason: "test" };
    const withoutImage = estimateMicro("image");
    routed = qwen;
    const withQwen = estimateMicro("image");
    expect(withQwen - withoutImage).toBeCloseTo(perImage * 1.2 * usdToEur() * EUR, -1);
    // 2 essais : bien moins que l'ancien devis calculé sur le tarif OpenAI.
    routed = null;
    const openaiRoute = estimateMicro("image");
    routed = qwen;
    expect(2 * withQwen).toBeLessThan(2 * openaiRoute);
  });

  it("aucun modèle d'images utilisable : repli sur la route de la tâche (comportement d'avant)", () => {
    routed = null;
    expect(estimateMicro("image")).toBeGreaterThan(0);
  });
});
