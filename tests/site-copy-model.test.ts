/**
 * Rédacteur des textes du site au choix de l'administration (demande du propriétaire du 9 novembre 2026 : « fais
 * faire le copywriting par OpenAI »). Un modèle choisi mais inutilisable n'est jamais appelé.
 */
import { describe, expect, it, vi } from "vitest";

const keys: Record<string, string | null> = { anthropic: "k", openai: "k" };
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

describe("rédacteur des textes du site", () => {
  it("par défaut Claude ; réglé sur OpenAI, utilisé seulement s'il est confirmé et tarifé", async () => {
    const { setSetting, setJsonSetting, getJsonSetting } = await import("@/lib/settings");
    const { siteCopyModel } = await import("@/lib/syna-agent/custom-theme/brand");
    const { routeLlm } = await import("@/lib/ai/llm");
    const { COPY_MODEL } = await import("@/lib/syna-agent/mockup-code/copy");
    setSetting("site.copy_model", "");
    expect(siteCopyModel()).toEqual(COPY_MODEL);
    setSetting("site.copy_model", "openai:gpt-5.6-sol");
    const pref = siteCopyModel();
    expect(pref).toEqual({ provider: "openai", model: "gpt-5.6-sol" });
    // Non confirmé, sans tarif : jamais appelé, le routage habituel reprend (Claude).
    const before = routeLlm({ task: "strategy", routing: { difficulty: "complex", prefer: pref } });
    expect(before.provider).toBe("anthropic");
    // Tarif enregistré et modèle confirmé dans l'administration : il écrit.
    setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), "openai:gpt-5.6-sol": { unit: "tokens", inputPerM: 5, outputPerM: 30 } });
    setJsonSetting("ai.textModels", { "openai:gpt-5.6-sol": { confirmedAt: Date.now() } });
    const after = routeLlm({ task: "strategy", routing: { difficulty: "complex", prefer: pref } });
    expect(after).toMatchObject({ provider: "openai", model: "gpt-5.6-sol", effort: "medium" });
    // Clé OpenAI coupée : retour au routage habituel.
    keys.openai = null;
    expect(routeLlm({ task: "strategy", routing: { difficulty: "complex", prefer: pref } }).provider).toBe("anthropic");
    setSetting("site.copy_model", "n'importe quoi");
    expect(siteCopyModel()).toEqual(COPY_MODEL);
  });
});
