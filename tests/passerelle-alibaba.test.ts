/**
 * Clé Alibaba fournie par la passerelle réseau (comme OpenAI et fal.ai) : le studio n'envoie alors aucune autorisation.
 * Qwen-Image 3.0 Pro au catalogue, tarif borné (sortie 2K + images d'entrée), verrouillé jusqu'à l'accord de
 * l'administration.
 */
import { afterEach, describe, expect, it } from "vitest";
import { GATEWAY_KEY, gatewayProviders } from "../src/lib/ai/gateway";

const saved = process.env.AI_GATEWAY_PROVIDERS;
afterEach(() => {
  if (saved === undefined) delete process.env.AI_GATEWAY_PROVIDERS;
  else process.env.AI_GATEWAY_PROVIDERS = saved;
});

describe("Alibaba : clé de la passerelle et Qwen-Image 3.0", async () => {
  const { alibabaHeaders } = await import("@/lib/ai/alibaba");
  const { mediaModel } = await import("@/lib/ai/media-models");
  const { DEFAULT_PRICES } = await import("@/lib/ai/config");
  const routing = await import("@/lib/ai/media-routing");

  it("alibaba est accepté dans AI_GATEWAY_PROVIDERS", () => {
    process.env.AI_GATEWAY_PROVIDERS = "openai, alibaba";
    expect(gatewayProviders()).toEqual(["openai", "alibaba"]);
  });

  it("clé de la passerelle : aucun en-tête d'autorisation ; clé saisie : « Bearer … »", () => {
    expect(alibabaHeaders(GATEWAY_KEY)).not.toHaveProperty("Authorization");
    expect(alibabaHeaders("sk-test")).toMatchObject({ Authorization: "Bearer sk-test" });
  });

  it("Qwen-Image 3.0 Pro : tarif borné (0,075 $ en 2K + 2 images d'entrée) et verrouillé sans l'administration", () => {
    const m = mediaModel("alibaba", "qwen-image-3.0-pro")!;
    expect(m).toBeTruthy();
    expect((DEFAULT_PRICES as Record<string, { perImage?: number }>)["alibaba:qwen-image-3.0-pro"].perImage).toBeGreaterThanOrEqual(0.075 + 2 * 0.003);
    expect(m.adminConfirm).toBe(true);
    const s = routing.mediaStatus(m, {});
    expect(s.confirmed).toBe(false);
    expect(s.usable).toBe(false);
  });
});
