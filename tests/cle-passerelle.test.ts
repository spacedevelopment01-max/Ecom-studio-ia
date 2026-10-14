/**
 * Clé OpenAI injectée par la passerelle de l'hébergement (`AI_GATEWAY_PROVIDERS=openai`) : le studio s'en sert sans
 * jamais la connaître — aucune clé stockée, aucun en-tête d'autorisation envoyé ; une clé saisie reste prioritaire ;
 * le bouton « Désactiver » coupe les appels ; les fournisseurs non prévus ne sont jamais activés ainsi.
 */
import { afterEach, describe, expect, it } from "vitest";

describe("clé fournie par la passerelle de l'hébergement", async () => {
  const cfg = await import("@/lib/ai/config");
  const { setSetting } = await import("@/lib/settings");
  const { openaiClient } = await import("@/lib/ai/openai-images");
  const saved = { gw: process.env.AI_GATEWAY_PROVIDERS, key: process.env.OPENAI_API_KEY };
  afterEach(() => {
    process.env.AI_GATEWAY_PROVIDERS = saved.gw ?? "";
    process.env.OPENAI_API_KEY = saved.key ?? "";
    setSetting("provider.openai.apiKey", "");
    setSetting("provider.openai.disabled", "");
  });

  it("sans réglage : aucune clé", () => {
    process.env.AI_GATEWAY_PROVIDERS = "";
    process.env.OPENAI_API_KEY = "";
    expect(cfg.activeProviderKey("openai")).toBeNull();
  });

  it("avec la passerelle : OpenAI disponible, sans en-tête d'autorisation", async () => {
    process.env.AI_GATEWAY_PROVIDERS = "openai, anthropic";
    process.env.OPENAI_API_KEY = "";
    const k = cfg.activeProviderKey("openai");
    expect(cfg.isGatewayKey(k)).toBe(true);
    expect(cfg.bearer(k!)).toEqual({});
    // Anthropic n'est pas prévu pour la passerelle : jamais activé ainsi.
    expect(cfg.activeProviderKey("anthropic")).toBeNull();
    // Le client OpenAI retire l'en-tête avant l'envoi.
    const seen: Headers[] = [];
    const g = globalThis.fetch;
    const proxy = process.env.NODE_USE_ENV_PROXY;
    process.env.NODE_USE_ENV_PROXY = "1"; // fetch global (sinon celui du proxy de l'environnement)
    globalThis.fetch = (async (_u: any, init: any) => {
      seen.push(new Headers(init?.headers));
      return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }) as any;
    try {
      const fresh = openaiClient(k!);
      await fresh.models.list();
    } finally {
      globalThis.fetch = g;
      process.env.NODE_USE_ENV_PROXY = proxy ?? "";
    }
    expect(seen.length).toBe(1);
    expect(seen[0].has("authorization")).toBe(false);
  });

  it("une clé saisie reste prioritaire et le bouton Désactiver coupe tout", () => {
    process.env.AI_GATEWAY_PROVIDERS = "openai";
    setSetting("provider.openai.apiKey", "sk-test-saisie");
    expect(cfg.activeProviderKey("openai")).toBe("sk-test-saisie");
    expect(cfg.bearer("sk-test-saisie")).toEqual({ authorization: "Bearer sk-test-saisie" });
    setSetting("provider.openai.apiKey", "");
    setSetting("provider.openai.disabled", "1");
    expect(cfg.activeProviderKey("openai")).toBeNull();
  });

  it("OpenAI seul (routage automatique) : l'IA de texte est annoncée disponible et choisie pour les tâches fortes", async () => {
    const { aiReady, routeLlm } = await import("@/lib/ai/llm");
    process.env.AI_GATEWAY_PROVIDERS = "openai";
    process.env.ANTHROPIC_API_KEY = "";
    const now = Date.now();
    setSetting("ai.prices", JSON.stringify({ "openai:gpt-5.6-sol": { unit: "tokens", inputPerM: 5, outputPerM: 30 } }));
    setSetting("ai.prices.checkedAt", String(now));
    setSetting("ai.routing.mode", "auto");
    setSetting("ai.textModels", JSON.stringify({ "openai:gpt-5.6-sol": { enabled: true, confirmedAt: now } }));
    try {
      expect(aiReady().llm).toBe(true);
      const d = routeLlm({ task: "ad_creative" as any });
      expect(`${d.provider}:${d.model}`).toBe("openai:gpt-5.6-sol");
    } finally {
      setSetting("ai.routing.mode", "manual");
      setSetting("ai.textModels", "{}");
      setSetting("ai.prices", "{}");
    }
  });
});
