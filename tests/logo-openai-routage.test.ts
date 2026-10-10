/**
 * Studio avec OpenAI seul (aucune clé Anthropic), routage automatique — AUCUN appel réel :
 *  - les directions de logo (niveau « fort ») vont au modèle fort d'OpenAI une fois confirmé, jamais à un modèle
 *    moins bon ;
 *  - sans modèle fort utilisable, le vrai message (fournisseur absent) remonte, pas un faux « comptage impossible » ;
 *  - un comptage refusé par le fournisseur dit pourquoi (statut et message, sans secret) ;
 *  - le devis de la série compte le modèle réellement choisi.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-oa-route-"));
});

let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

describe("Logos avec OpenAI seul (routage automatique)", async () => {
  const { setSetting, setJsonSetting, getJsonSetting } = await import("@/lib/settings");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { routeLlm, maxCostMicro, otherMaxCostMicro } = await import("@/lib/ai/llm");
  const { TEXT_MODELS, modelStatus } = await import("@/lib/ai/text-models");
  const { ProviderHttpError } = await import("@/lib/ai/text-providers");
  const { UserFacingError } = await import("@/lib/jobs");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const price = (k: string, v: unknown) => setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), [k]: v });
  const confirm = (...ks: string[]) => setJsonSetting("ai.textModels", Object.fromEntries(ks.map((k) => [k, { confirmedAt: Date.now(), enabled: true }])));

  beforeEach(() => {
    keys = { openai: "sk-openai-test-123456" };
    setSetting("ai.prices.checkedAt", String(Date.now()));
    setSetting("ai.routing.mode", "auto");
    for (const k of ["ai.routes", "ai.prices", "ai.textModels"]) setJsonSetting(k, {});
    price("openai:gpt-5.6-terra", { unit: "tokens", inputPerM: 2.5, outputPerM: 15 });
    price("openai:gpt-5.6-sol", { unit: "tokens", inputPerM: 5, outputPerM: 30 });
  });

  it("GPT-5.6 Sol au catalogue : niveau fort, vision, verrouillé tant que l'administration ne l'a pas confirmé", () => {
    const sol = TEXT_MODELS.find((m) => m.model === "gpt-5.6-sol")!;
    expect(sol).toMatchObject({ provider: "openai", tier: "strong", vision: true, structured: true, verified: false });
    expect(modelStatus(sol).autoEligible).toBe(false);
    confirm("openai:gpt-5.6-sol");
    expect(modelStatus(sol).autoEligible).toBe(true);
  });

  it("directions de logo → modèle fort d'OpenAI une fois confirmé ; relectures → modèle standard ; jamais un niveau inférieur", () => {
    confirm("openai:gpt-5.6-terra");
    // Seul un modèle standard est confirmé : les directions ne descendent pas vers lui.
    expect(fr(() => routeLlm({ task: "logo_symbol" }))).toMatchObject({ provider: "anthropic" });
    confirm("openai:gpt-5.6-terra", "openai:gpt-5.6-sol");
    expect(fr(() => routeLlm({ task: "logo_symbol" }))).toMatchObject({ provider: "openai", model: "gpt-5.6-sol" });
    expect(fr(() => routeLlm({ task: "quality_control" }))).toMatchObject({ provider: "openai", model: "gpt-5.6-terra" });
  });

  it("aucun modèle fort utilisable et pas de clé Anthropic : le vrai message remonte (pas « comptage impossible »)", async () => {
    price("anthropic:claude-opus-5-5", { unit: "tokens", inputPerM: 5, outputPerM: 25 });
    const p = fr(() => maxCostMicro("claude-opus-5-5", { messages: [{ role: "user", content: "x" }], max_tokens: 9000 }));
    await expect(p).rejects.toBeInstanceOf(UserFacingError);
    await expect(fr(() => maxCostMicro("claude-opus-5-5", { messages: [{ role: "user", content: "x" }], max_tokens: 9000 }))).rejects.toThrow(/Aucun fournisseur d'IA de langage/);
  });

  it("comptage refusé par OpenAI : appel bloqué, avec le statut et la raison du fournisseur (sans secret)", async () => {
    confirm("openai:gpt-5.6-terra");
    const req = { model: "gpt-5.6-terra", system: "s", turns: [{ role: "user" as const, parts: [{ type: "text" as const, text: "x" }] }], maxOutput: 4000, effort: null, jsonSchema: null };
    const err = await fr(() => otherMaxCostMicro("openai", req, async () => {
      throw new ProviderHttpError(400, "Invalid schema for response_format 'reponse' (clé sk-proj-abcdefghijklmnopqrstuvwx)");
    })).then(() => new Error("aucune erreur"), (e: Error) => e);
    expect(err.message).toMatch(/Comptage des jetons impossible : appel bloqué par sécurité \(HTTP 400 — Invalid schema/);
    expect(err.message).not.toContain("sk-proj-abcdefghijklmnopqrstuvwx");
    // Saturation passagère : relancée par la file (inchangé).
    await expect(fr(() => otherMaxCostMicro("openai", req, async () => { throw new ProviderHttpError(429, "slow down"); }))).rejects.toBeInstanceOf(ProviderHttpError);
  });

  it("devis de la série : compte le modèle réellement choisi pour les directions (tarif de Sol), pas la route manuelle", async () => {
    const { setJsonSetting: sj } = await import("@/lib/settings");
    sj("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), "openai:gpt-image-2": { unit: "image", perImage: 0.22 } });
    sj("ai.media.models", { "openai:gpt-image-2": { confirmedAt: Date.now(), enabled: true } });
    sj("ai.media.usage", { logo: { primary: "openai:gpt-image-2" } });
    confirm("openai:gpt-5.6-terra", "openai:gpt-5.6-sol");
    const { logoSeriesQuote } = await import("@/lib/logo-v2/quote");
    const q1 = fr(() => logoSeriesQuote()).maxMicro;
    price("openai:gpt-5.6-sol", { unit: "tokens", inputPerM: 50, outputPerM: 300 });
    const q2 = fr(() => logoSeriesQuote()).maxMicro;
    expect(q2).toBeGreaterThan(q1);
  });
});
