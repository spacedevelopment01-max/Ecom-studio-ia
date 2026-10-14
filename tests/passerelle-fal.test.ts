import { afterEach, describe, expect, it } from "vitest";
import { bearer, falAuth, GATEWAY_KEY, gatewayProviders, isGatewayKey } from "../src/lib/ai/gateway";

const saved = process.env.AI_GATEWAY_PROVIDERS;
afterEach(() => {
  if (saved === undefined) delete process.env.AI_GATEWAY_PROVIDERS;
  else process.env.AI_GATEWAY_PROVIDERS = saved;
});

describe("Clé fournie par la passerelle : fal.ai comme OpenAI", () => {
  it("fal.ai est accepté dans AI_GATEWAY_PROVIDERS, un fournisseur inconnu est ignoré", () => {
    process.env.AI_GATEWAY_PROVIDERS = "openai, FAL, inconnu";
    expect(gatewayProviders()).toEqual(["openai", "fal"]);
  });

  it("aucun en-tête d'autorisation quand la passerelle fournit la clé", () => {
    expect(isGatewayKey(GATEWAY_KEY)).toBe(true);
    expect(falAuth(GATEWAY_KEY)).toEqual({});
    expect(bearer(GATEWAY_KEY)).toEqual({});
  });

  it("une clé saisie garde son en-tête « Key … » habituel", () => {
    expect(falAuth("id:secret")).toEqual({ Authorization: "Key id:secret" });
  });
});
