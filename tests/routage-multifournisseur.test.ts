/**
 * Routage IA multifournisseur (Anthropic, OpenAI, Google Gemini) — aucun appel réel ni payant :
 *  - catalogue : effort propre à chaque fournisseur, seules les valeurs acceptées par le modèle ;
 *  - adaptateurs OpenAI (Responses API) et Gemini (generateContent) : requêtes et lecture des réponses ;
 *  - mêmes garde-fous que pour Anthropic : modèle confirmé, tarif connu, coût maximal réservé AVANT l'envoi,
 *    réservation rendue sur une erreur HTTP, coût maximal retenu sur un résultat incertain, budget épuisé ;
 *  - routage : manuel inchangé par défaut ; automatique = jamais sous le niveau de la tâche, le moins cher du
 *    niveau, budget restant, historique d'échecs ;
 *  - administration : effort validé par modèle, aucun effort pour l'image et la vidéo, confirmation sans tarif
 *    refusée, bouton « Voir les tarifs ».
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Base isolée : ce fichier modifie des réglages globaux (routes, tarifs, modèles) que les autres fichiers de test,
// exécutés en parallèle sur la base partagée, ne doivent pas voir (et inversement).
vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-routage-"));
});

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (["anthropic", "openai", "google"].includes(p) ? "cle-de-test-1234567890abcdef" : null) }));

describe("catalogue des modèles de texte et effort par fournisseur", async () => {
  const { TEXT_MODELS, effortValues, mapEffort, validEffort, textModel } = await import("@/lib/ai/text-models");

  it("chaque modèle déclare le paramètre de réflexion de son fournisseur, avec des valeurs connues", () => {
    for (const m of TEXT_MODELS) {
      if (m.provider === "anthropic") expect(["anthropic_effort", "none"]).toContain(m.effort.kind);
      if (m.provider === "openai") expect(m.effort.kind).toBe("openai_reasoning");
      if (m.provider === "google") expect(m.effort.kind).toBe("gemini_thinking_level");
      if (m.effort.default) expect(m.effort.values).toContain(m.effort.default);
      expect(m.limits.maxOutput).toBeGreaterThan(0);
    }
    expect(effortValues("google", "gemini-3.8-flash")).toEqual(["minimal", "low", "medium", "high"]);
    expect(effortValues("anthropic", "claude-haiku-4-5")).toEqual([]);
    // Modèle d'image ou de vidéo : aucun réglage d'effort.
    expect(effortValues("openai", "gpt-image-1")).toEqual([]);
    expect(effortValues("google", "veo-3.0-generate-001")).toEqual([]);
  });

  it("l'effort de la politique est traduit vers une valeur acceptée, jamais plus bas quand c'est possible", () => {
    expect(mapEffort("anthropic", "claude-opus-5-5", "high")).toBe("high");
    expect(mapEffort("openai", "gpt-5.6-terra", "xhigh")).toBe("high"); // valeur la plus haute acceptée
    expect(mapEffort("google", "gemini-3.8-flash", "low")).toBe("low");
    expect(mapEffort("google", "gemini-3.8-flash", "max")).toBe("high");
    expect(mapEffort("anthropic", "claude-haiku-4-5", "high")).toBeNull();
    expect(validEffort("openai", "gpt-5.6-luna", "max")).toBeNull();
    expect(validEffort("openai", "gpt-5.6-luna", "low")).toBe("low");
  });

  it("OpenAI et Gemini sont verrouillés tant que leurs informations ne sont pas confirmées", () => {
    for (const m of TEXT_MODELS.filter((x) => x.provider !== "anthropic")) expect(m.verified).toBe(false);
    expect(textModel("anthropic", "claude-haiku-5-5")?.verified).toBe(true);
  });
});

describe("adaptateurs OpenAI et Gemini (réponses simulées)", async () => {
  const { openaiBody, geminiBody, openaiSend, geminiSend, openaiCount, geminiCount, ProviderHttpError } = await import("@/lib/ai/text-providers");
  const req = { model: "m", system: "Consigne", turns: [{ role: "user" as const, parts: [{ type: "text" as const, text: "Bonjour" }, { type: "image" as const, jpegBase64: "AAAA" }] }, { role: "assistant" as const, parts: [{ type: "text" as const, text: "{}" }] }], maxOutput: 4000, effort: "low", jsonSchema: { type: "object", properties: {} } };
  const fake = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("OpenAI : plafond de sortie, effort de raisonnement, schéma JSON, rien conservé chez le fournisseur", () => {
    const b = openaiBody(req) as any;
    expect(b.max_output_tokens).toBe(4000);
    expect(b.reasoning).toEqual({ effort: "low" });
    expect(b.text.format).toMatchObject({ type: "json_schema", strict: true });
    expect(b.store).toBe(false);
    expect(b.input[0].content[1]).toMatchObject({ type: "input_image" });
    expect(b.input[1].content[0]).toMatchObject({ type: "output_text" });
    expect(openaiBody({ ...req, effort: null, jsonSchema: null })).not.toHaveProperty("reasoning");
  });

  it("Gemini : thinkingLevel, plafond de sortie, schéma JSON, rôle « model » pour les réponses", () => {
    const b = geminiBody(req) as any;
    expect(b.generationConfig).toMatchObject({ maxOutputTokens: 4000, thinkingConfig: { thinkingLevel: "LOW" }, responseMimeType: "application/json" });
    expect(b.contents[1].role).toBe("model");
    expect(b.contents[0].parts[1]).toHaveProperty("inlineData");
  });

  it("lecture des réponses : texte, coupure, refus, jetons facturés (réflexion comprise)", async () => {
    const o = await openaiSend(req, "k", fake(200, { status: "completed", model: "m", output: [{ type: "reasoning" }, { type: "message", content: [{ type: "output_text", text: "Salut" }] }], usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 40 }, output_tokens: 60 } }));
    expect(o).toMatchObject({ text: "Salut", stop: "end_turn", usage: { input: 100, cachedInput: 40, output: 60 } });
    expect((await openaiSend(req, "k", fake(200, { status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] }))).stop).toBe("max_tokens");
    expect((await openaiSend(req, "k", fake(200, { status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "non" }] }] }))).stop).toBe("refusal");
    const g = await geminiSend(req, "k", fake(200, { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "pensée", thought: true }, { text: "Réponse" }] } }], usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 20, thoughtsTokenCount: 30 } }));
    expect(g).toMatchObject({ text: "Réponse", stop: "end_turn", usage: { input: 50, output: 50 } });
    expect((await geminiSend(req, "k", fake(200, { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [] } }] }))).stop).toBe("max_tokens");
    expect((await geminiSend(req, "k", fake(200, { promptFeedback: { blockReason: "SAFETY" }, candidates: [] }))).stop).toBe("refusal");
  });

  it("comptage exact des jetons et erreurs HTTP remontées avec leur code", async () => {
    expect(await openaiCount(req, "k", fake(200, { object: "response.input_tokens", input_tokens: 321 }))).toBe(321);
    expect(await geminiCount(req, "k", fake(200, { totalTokens: 123 }))).toBe(123);
    await expect(openaiSend(req, "k", fake(429, { error: { message: "lent" } }))).rejects.toBeInstanceOf(ProviderHttpError);
    await expect(geminiSend(req, "k", fake(400, { error: { message: "mauvais" } }))).rejects.toMatchObject({ status: 400 });
  });
});

describe("mêmes garde-fous budgétaires pour OpenAI et Gemini", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { setSetting, setJsonSetting } = await import("@/lib/settings");
  const { llmText, textDeps, otherMaxCostMicro } = await import("@/lib/ai/llm");
  const { runForUser } = await import("@/lib/ai/access");
  const { ProviderHttpError } = await import("@/lib/ai/text-providers");

  const calls = { count: 0, send: 0, order: [] as string[] };
  let sendImpl: () => Promise<any> = async () => ({ text: "ok", stop: "end_turn", model: "gpt-5.6-terra", usage: { input: 1000, cachedInput: 0, output: 500 } });
  const fakeAdapter = { count: async () => (calls.count++, calls.order.push("count"), 2000), send: async () => (calls.send++, calls.order.push("send"), sendImpl()) };
  const original = { ...textDeps.adapters };

  beforeEach(() => {
    calls.count = 0;
    calls.send = 0;
    calls.order = [];
    sendImpl = async () => ({ text: "ok", stop: "end_turn", model: "gpt-5.6-terra", usage: { input: 1000, cachedInput: 0, output: 500 } });
    textDeps.adapters = { openai: fakeAdapter, google: fakeAdapter } as any;
    setSetting("ai.prices.checkedAt", String(Date.now()));
    setJsonSetting("ai.prices", { "openai:gpt-5.6-terra": { unit: "tokens", inputPerM: 2, outputPerM: 12 }, "google:gemini-3.8-flash": { unit: "tokens", inputPerM: 1, outputPerM: 4 } });
    setJsonSetting("ai.textModels", { "openai:gpt-5.6-terra": { confirmedAt: Date.now() }, "google:gemini-3.8-flash": { confirmedAt: Date.now() } });
    setJsonSetting("ai.routes", { copywriting: { provider: "openai", model: "gpt-5.6-terra", effort: "medium" } });
  });
  afterEach(() => {
    textDeps.adapters = original as any;
    setJsonSetting("ai.routes", {});
    setJsonSetting("ai.prices", {});
    setJsonSetting("ai.textModels", {});
    setSetting("ai.routing.mode", null);
  });

  async function client(plan: "creer" | "vendre" | null) {
    const u = await createUser(`multi${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "M");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = ?, plan = ? WHERE user_id = ?", plan ? "active" : "none", plan, u.id);
    billing.alignPeriod(u.id, Date.now());
    billing.syncAllowance(u.id);
    return u;
  }
  const reservations = (uid: string) => all<{ status: string; amount: number; actual: number | null; provider: string }>("SELECT * FROM ai_reservations WHERE user_id = ? ORDER BY created_at", uid);
  const text = (uid: string) => runForUser(uid, () => llmText({ task: "copywriting", userId: uid, system: "Rédige.", prompt: "Une phrase." }));

  it("appel OpenAI : comptage, réservation du coût maximal AVANT l'envoi, puis réglé au coût réel", async () => {
    const u = await client("creer");
    expect(await text(u.id)).toBe("ok");
    expect(calls.order).toEqual(["count", "send"]);
    const [r] = reservations(u.id);
    expect(r).toMatchObject({ status: "settled", provider: "openai" });
    expect(r.actual!).toBeLessThan(r.amount);
    const call = all<{ provider: string; requested_model: string; effort: string; status: string }>("SELECT provider, requested_model, effort, status FROM ai_calls WHERE user_id = ?", u.id)[0];
    expect(call).toMatchObject({ provider: "openai", requested_model: "gpt-5.6-terra", effort: "medium", status: "ok" });
  });

  it("forfait Découverte : aucun appel OpenAI (0 € d'IA)", async () => {
    const u = await client(null);
    await expect(text(u.id)).rejects.toThrow();
    expect(calls.send).toBe(0);
  });

  it("budget épuisé : rien n'est envoyé", async () => {
    const u = await client("creer");
    // Reste minuscule : l'accès est ouvert, mais la réservation du coût maximal est refusée.
    run("UPDATE wallets SET monthly_used = monthly_allowance - 50, topup_balance = 0 WHERE user_id = ?", u.id);
    await expect(text(u.id)).rejects.toThrow(/limite d'utilisation équitable|épuisé/);
    expect(calls.send).toBe(0);
    expect(reservations(u.id)).toHaveLength(0);
  });

  it("erreur HTTP du fournisseur : réservation rendue ; coupure réseau : coût maximal retenu", async () => {
    const u = await client("creer");
    sendImpl = async () => {
      throw new ProviderHttpError(400, "requête invalide");
    };
    await expect(text(u.id)).rejects.toThrow(/refusée par le fournisseur/);
    expect(reservations(u.id)[0].status).toBe("released");
    sendImpl = async () => {
      throw new Error("socket hang up");
    };
    await expect(text(u.id)).rejects.toThrow();
    const r = reservations(u.id)[1];
    expect(r.status).toBe("uncertain");
    expect(r.actual).toBe(r.amount);
  });

  it("modèle non confirmé ou sans tarif : appel bloqué avant tout envoi", async () => {
    const u = await client("creer");
    setJsonSetting("ai.textModels", {});
    await expect(text(u.id)).rejects.toThrow(/non confirmé/);
    setJsonSetting("ai.textModels", { "openai:gpt-5.6-terra": { confirmedAt: Date.now() } });
    setJsonSetting("ai.prices", {});
    await expect(text(u.id)).rejects.toThrow(/Tarif inconnu/);
    expect(calls.send).toBe(0);
    expect(reservations(u.id)).toHaveLength(0);
  });

  it("Gemini : la réflexion est réservée EN PLUS du plafond de sortie (prise en compte non confirmée)", async () => {
    const base = { model: "gemini-3.8-flash", system: "s", turns: [], maxOutput: 8000, jsonSchema: null };
    const sans = await otherMaxCostMicro("google", { ...base, effort: null }, async () => 1000);
    const avec = await otherMaxCostMicro("google", { ...base, effort: "medium" }, async () => 1000);
    expect(avec).toBeGreaterThan(sans * 2);
    // OpenAI : la réflexion est comprise dans max_output_tokens (spécification officielle) : pas de supplément.
    const o1 = await otherMaxCostMicro("openai", { ...base, model: "gpt-5.6-terra", effort: null }, async () => 1000);
    const o2 = await otherMaxCostMicro("openai", { ...base, model: "gpt-5.6-terra", effort: "high" }, async () => 1000);
    expect(o2).toBe(o1);
    await expect(otherMaxCostMicro("openai", { ...base, model: "gpt-5.6-terra", effort: null }, async () => 200_000)).rejects.toThrow(/trop longue/);
  });
});

describe("Router V2 : manuel inchangé, automatique multifournisseur", async () => {
  const { route } = await import("@/lib/orchestrator/router");
  const { rankTextModels, pickTextModel } = await import("@/lib/orchestrator/text-routing");
  const { TEXT_MODELS } = await import("@/lib/ai/text-models");
  const env = { aiActive: true, allowLocal: false, available: () => true };
  const ok = () => ({ autoEligible: true, reasons: [] });
  const only = (keys: string[]) => (m: { provider: string; model: string }) => (keys.includes(`${m.provider}:${m.model}`) ? ok() : { autoEligible: false, reasons: ["désactivé"] });

  it("mode manuel (défaut) : routage actuel des clients inchangé", () => {
    expect(route({ task: "copywriting", ...env })).toMatchObject({ provider: "anthropic", model: "claude-sonnet-5-5", effort: "high" });
    expect(route({ task: "strategy", ...env })).toMatchObject({ model: "claude-opus-5-5" });
    expect(route({ task: "classification", ...env })).toMatchObject({ model: "claude-haiku-4-5" });
  });

  it("automatique : jamais un modèle d'un niveau inférieur à celui de la tâche", () => {
    const all = () => ok();
    for (const t of ["strategy", "theme_design", "logo_symbol"] as const) {
      const d = route({ task: t, ...env, auto: { pick: (i) => pickTextModel({ ...i, status: all, stats: {} }) } });
      expect(d.tier).toBe("strong");
      expect(d.model).toBe("claude-opus-5-5");
    }
  });

  it("automatique : le moins cher du niveau (Haiku 5.5 plutôt que Haiku 4.5 pour le classement)", () => {
    const d = route({ task: "classification", ...env, auto: { pick: (i) => pickTextModel({ ...i, status: only(["anthropic:claude-haiku-5-5", "anthropic:claude-haiku-4-5", "anthropic:claude-sonnet-5-5"]), stats: {} }) } });
    expect(d).toMatchObject({ provider: "anthropic", model: "claude-haiku-5-5", tier: "light" });
  });

  it("automatique : une demande simple de contrôle passe au niveau léger ; une demande complexe reste forte", () => {
    const pick = (i: any) => pickTextModel({ ...i, status: only(["anthropic:claude-haiku-5-5", "anthropic:claude-sonnet-5-5", "anthropic:claude-opus-5-5"]), stats: {} });
    expect(route({ task: "quality_control", difficulty: "simple", ...env, auto: { pick } })).toMatchObject({ model: "claude-haiku-5-5" });
    expect(route({ task: "quality_control", difficulty: "complex", ...env, auto: { pick } })).toMatchObject({ model: "claude-opus-5-5" });
    // Sans mode automatique, la demande simple garde le niveau de la politique.
    expect(route({ task: "quality_control", difficulty: "simple", ...env })).toMatchObject({ model: "claude-sonnet-5-5" });
  });

  it("automatique : un modèle Gemini activé, confirmé et moins cher du MÊME niveau passe devant ; jamais pour un niveau supérieur", async () => {
    const { setJsonSetting } = await import("@/lib/settings");
    setJsonSetting("ai.prices", { "google:gemini-3.8-flash": { unit: "tokens", inputPerM: 0.75, outputPerM: 3.75 } });
    try {
      const status = only(["anthropic:claude-sonnet-5-5", "anthropic:claude-opus-5-5", "google:gemini-3.8-flash"]);
      const first = (task: any, tier: any) => pickTextModel({ task, tier, vision: false, status, stats: {} })?.model.model;
      expect(first("blog_writing", "standard")).toBe("gemini-3.8-flash");
      expect(first("strategy", "strong")).toBe("claude-opus-5-5");
      // Budget restant très faible : le moins cher du niveau reste choisi (jamais un niveau plus bas).
      expect(pickTextModel({ task: "blog_writing", tier: "standard", vision: false, status, stats: {}, budgetLeftMicro: 10 })?.model.tier).toBe("standard");
    } finally {
      setJsonSetting("ai.prices", {});
    }
  });

  it("automatique : budget restant faible → modèle du MÊME niveau moins cher ; historique d'échecs → écarté", () => {
    const status = only(["anthropic:claude-sonnet-5-5", "google:gemini-3.8-flash"]);
    const models = TEXT_MODELS.filter((m) => ["claude-sonnet-5-5", "gemini-3.8-flash"].includes(m.model));
    // Sans tarif Gemini, Sonnet passe en tête ; échecs répétés de Sonnet → écarté au profit de Gemini.
    const failing = { "anthropic:claude-sonnet-5-5": { calls: 10, failures: 5, avgCostMicro: 1, avgLatencyMs: 1, avgScore: null } };
    const r = rankTextModels({ task: "copywriting", tier: "standard", vision: false, status, stats: failing, models });
    expect(r.find((x) => x.model.model === "claude-sonnet-5-5")?.excluded).toMatch(/échecs/);
    expect(pickTextModel({ task: "copywriting", tier: "standard", vision: false, status, stats: failing, models })?.model.model).toBe("gemini-3.8-flash");
    // Aucun modèle du niveau ou au-dessus : pas de choix (jamais un niveau inférieur).
    expect(pickTextModel({ task: "strategy", tier: "strong", vision: false, status, stats: {}, models })).toBeNull();
  });

  it("automatique : vision exigée quand l'entrée contient des images", () => {
    const models = TEXT_MODELS.map((m) => (m.model === "claude-sonnet-5-5" ? { ...m, vision: false } : m));
    const r = rankTextModels({ task: "cutout_check", tier: "standard", vision: true, status: ok, stats: {}, models });
    expect(r.find((x) => x.model.model === "claude-sonnet-5-5")?.excluded).toBe("pas de vision");
  });
});

describe("administration du routage", async () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src/components/admin.tsx"), "utf8");
  const api = fs.readFileSync(path.join(process.cwd(), "src/app/api/admin/settings/route.ts"), "utf8");

  it("« Voir les tarifs » ouvre l'onglet ET amène la carte des tarifs à l'écran", () => {
    expect(src).toContain('id="tarifs-fournisseurs"');
    expect(src).toMatch(/openPrices[\s\S]*setTab\("routes"\)[\s\S]*scrollIntoView/);
    expect(src).toContain("onOpen={openPrices}");
  });

  it("effort : seules les valeurs du modèle sont proposées ; rien pour l'image et la vidéo", () => {
    expect(src).toContain('k.kind === "llm" && effortsOf(r.provider, r.model).length');
    expect(src).not.toContain('["low", "medium", "high", "xhigh", "max"].map');
    expect(api).toMatch(/effortValues\(m\.provider, m\.model\)\.includes\(b\.route\.effort\)/);
    expect(api).toContain("Les modèles d'image et de vidéo n'ont pas de réglage d'effort.");
  });

  it("base de test isolée des autres fichiers", () => {
    expect(process.env.DATA_DIR).toMatch(/ecs-routage-/);
  });

  it("confirmation d'un modèle refusée sans tarif valide ; mode manuel par défaut", async () => {
    expect(api).toMatch(/confirm === true[\s\S]*priceValid/);
    const { routingMode } = await import("@/lib/orchestrator/text-routing");
    expect(routingMode()).toBe("manual");
  });
});
