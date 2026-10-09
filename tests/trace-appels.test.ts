/**
 * Trace des appels (phase 1A) : chaque appel réellement envoyé à un fournisseur laisse une ligne `ai_calls`
 * (étape, jetons séparés, cache lu/écrit, latence, modèle demandé et servi, statut, coût) ; une reprise avec la même
 * clé est tracée sans être refacturée ; les échecs sont tracés ; jamais de prompt, d'image ni de clé enregistrés.
 * Les étapes de tâche (ctx.step) étiquettent les appels et ne sont jamais rejouées.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: any[] = [];
const okReply = async () => ({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: "Bonjour" }], usage: { input_tokens: 120, output_tokens: 40, cache_read_input_tokens: 900, cache_creation_input_tokens: 300 } });
let nextReply: () => Promise<any> = okReply;

vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      sent.push(params);
      // Le SDK passe par l'option `fetch` : une requête HTTP comptée, comme en vrai.
      const p = this.opts.fetch("https://api.anthropic.test/v1/messages", {}).then(() => nextReply());
      return { finalMessage: () => p };
    }
    messages = { stream: (p: any) => this.stream(p), countTokens: async (p: any) => ({ input_tokens: Math.ceil(JSON.stringify(p).length / 3) }) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: () => "sk-ant-test-1234567890" }));
const billed = new Set<string>();
vi.mock("@/lib/billing", async (orig) => ({
  ...(await orig<object>()),
  assertCanSpend: () => undefined,
  // Réservations du budget testées à part (tests/budget-ia.test.ts) : ici, comptes fictifs sans portefeuille.
  reserve: () => "reservation-test",
  release: () => undefined,
  settleUncertain: () => undefined,
  // Comptes de test « u-… » : un forfait actif et du budget IA (assertAiAllowed les laisse passer, comme un client payant).
  getSubscription: () => ({ user_id: "u", status: "active", plan: "creer", stores: 1 }),
  planOf: () => "creer",
  balance: () => ({ available: 1e12, used: 0, capacity: 1e12, usedPct: 0 }),
  recordUsage: (u: any) => (u.idempotencyKey && billed.has(u.idempotencyKey) ? { eventId: null, dedup: true } : (u.idempotencyKey && billed.add(u.idempotencyKey), { eventId: `ev-${billed.size}`, dedup: false })),
}));
vi.mock("@/lib/quotas", async (orig) => ({ ...(await orig<object>()), assertQuota: () => undefined, consumeQuota: () => undefined }));

beforeEach(() => {
  nextReply = okReply;
  vi.stubGlobal("fetch", async () => new Response("{}"));
});
afterEach(() => vi.unstubAllGlobals());

describe("trace des appels", async () => {
  const { all } = await import("@/lib/db");
  const { llmText } = await import("@/lib/ai/llm");
  const { geminiPlate } = await import("@/lib/ai/media-providers");
  const { withTrace } = await import("@/lib/ai/trace");
  const { JobContext } = await import("@/lib/jobs");
  const { stableKey } = await import("@/lib/ai/keys");
  const rows = (where: string, ...args: unknown[]) => all<any>(`SELECT * FROM ai_calls WHERE ${where} ORDER BY created_at`, ...args);

  it("appel de texte : étape, jetons séparés (cache lu/écrit), latence, modèles, coût, statut, empreinte du prompt", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}"));
    const job = { id: `job-${Date.now()}`, project_id: "p-trace", checkpoint: "{}" } as any;
    const ctx = new JobContext(job);
    await ctx.step("marque", () => llmText({ task: "copywriting", userId: "u-trace", projectId: "p-trace", jobId: job.id, system: "Tu es rédacteur.", prompt: "Écris un mot secret-123.", usageKey: stableKey(job.id, "marque", "texte") }));
    const [r] = rows("job_id = ?", job.id);
    expect(r).toMatchObject({ step: "marque", task: "copywriting", provider: "anthropic", served_model: "claude-sonnet-5-5", input_tokens: 120, cache_read_tokens: 900, cache_write_tokens: 300, output_tokens: 40, stop_reason: "end_turn", status: "ok", billing_dedup: 0, http_attempts: 1 });
    expect(r.requested_model).toBeTruthy();
    expect(r.latency_ms).toBeGreaterThanOrEqual(0);
    expect(r.cost).toBeGreaterThan(0);
    expect(r.prompt_key).toBe("copywriting");
    expect(r.prompt_hash).toMatch(/^[0-9a-f]{12}$/);
    // Jamais le texte du prompt ni la clé.
    expect(JSON.stringify(r)).not.toMatch(/secret-123|rédacteur|sk-ant/);
  });

  it("reprise avec la même clé : appel tracé (coût réel visible) mais pas refacturé", async () => {
    const key = stableKey("job-replay", "texte");
    await llmText({ task: "copywriting", userId: "u-replay", system: "s", prompt: "p", usageKey: key });
    await llmText({ task: "copywriting", userId: "u-replay", system: "s", prompt: "p", usageKey: key });
    const r = rows("user_id = ?", "u-replay");
    expect(r).toHaveLength(2);
    expect(r.map((x) => x.billing_dedup)).toEqual([0, 1]);
    expect(r[1].usage_event_id).toBeNull();
  });

  it("panne du fournisseur : l'appel est tracé en erreur, sans secret dans le message", async () => {
    nextReply = async () => {
      throw new Error("upstream 529 overloaded (key=sk-ant-abcdefghijk)");
    };
    await expect(llmText({ task: "copywriting", userId: "u-err", system: "s", prompt: "p" })).rejects.toThrow();
    const [r] = rows("user_id = ?", "u-err");
    expect(r.status).toBe("error");
    expect(r.error_kind).toMatch(/overloaded/);
    expect(r.error_kind).not.toMatch(/sk-ant-abc/);
  });

  it("image : génération tracée (fournisseur, modèle, latence, coût) ; échec après envoi tracé aussi", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from("img").toString("base64") } }] } }] }), { status: 200 }));
    await withTrace({ step: "visuels" }, () => geminiPlate({ userId: "u-img", projectId: "p-img", usageKey: "k-img" }, { prompt: "set", aspect: "1:1" }));
    vi.stubGlobal("fetch", async () => new Response("boom", { status: 500 }));
    await expect(geminiPlate({ userId: "u-img", projectId: "p-img", usageKey: "k-img-2" }, { prompt: "set", aspect: "1:1" })).rejects.toThrow();
    const r = rows("user_id = ?", "u-img");
    expect(r.map((x) => [x.provider, x.unit, x.status, x.step])).toEqual([["google", "image", "ok", "visuels"], ["google", "image", "error", null]]);
    expect(r[0].cost).toBeGreaterThan(0);
    expect(r[0].latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("étapes : imbriquées « a/b », et une étape terminée n'est jamais rejouée (aucun nouvel appel)", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}"));
    const job = { id: `job-step-${Date.now()}`, project_id: "p-step", checkpoint: "{}" } as any;
    const ctx = new JobContext(job);
    const call = () => llmText({ task: "copywriting", userId: "u-step", jobId: job.id, system: "s", prompt: "p", usageKey: stableKey(job.id, "logos", "routes") });
    await ctx.step("logos", () => ctx.step("routes", call));
    const before = sent.length;
    // Reprise : même contexte de tâche, mêmes étapes → lues depuis le point de reprise.
    await ctx.step("logos", () => ctx.step("routes", call));
    expect(sent.length).toBe(before);
    expect(rows("job_id = ?", job.id).map((x) => x.step)).toEqual(["logos/routes"]);
  });

  it("clés stables : jamais l'heure, mêmes parties = même clé", () => {
    expect(stableKey("job1", "logo", "piste produit", 0)).toBe("job1:logo:piste-produit:0");
    expect(stableKey("job1", null, "x")).toBe("job1:x");
    expect(stableKey("a", "b")).toBe(stableKey("a", "b"));
    expect(() => stableKey(null, "")).toThrow();
  });
});
