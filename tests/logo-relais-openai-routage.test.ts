/**
 * Relais de qualité des logos dans le moteur multimédia — fournisseurs SIMULÉS, aucun appel payant :
 * Qwen-Image 3.0 Pro est le modèle des logos ; le relais appelle OpenAI GPT Image 1 (sa propre réservation), jamais
 * Qwen ; pas de relais sans clé OpenAI ni quand OpenAI est déjà le principal ; le devis annonce le relais à part.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-relais-logo-"));
});

let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const oa = { calls: [] as any[] };
vi.mock("openai", () => {
  class OpenAI {
    constructor(public opts: any) {}
    private run = async (kind: string, p: any) => {
      oa.calls.push({ kind, ...p });
      const usage = { input_tokens: 300, output_tokens: 1000, input_tokens_details: { text_tokens: 300, image_tokens: 0 } };
      if (p.stream) return (async function* () { yield { type: "image_generation.completed", b64_json: PNG, usage }; })();
      return { data: [{ b64_json: PNG }], usage };
    };
    images = { generate: (p: any) => this.run("generate", p), edit: (p: any) => this.run("edit", p) };
  }
  return { default: OpenAI, OpenAI, toFile: async (b: Buffer, name: string) => ({ name, size: b.length }) };
});
const net = { calls: [] as string[] };
async function fakeFetch(url: string): Promise<Response> {
  net.calls.push(url);
  if (url.includes("/services/aigc/multimodal-generation/generation")) return new Response(JSON.stringify({ output: { choices: [{ message: { content: [{ image: "https://result.test/qwen.png" }] } }] } }));
  if (url.startsWith("https://result.test/")) return new Response(Buffer.from(PNG, "base64"));
  return new Response("{}", { status: 404 });
}

describe("relais de qualité des logos (OpenAI)", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { setSetting, setJsonSetting } = await import("@/lib/settings");
  const { runWithLang } = await import("@/lib/i18n-server");
  const mp = await import("@/lib/ai/media-providers");
  const { runForUser } = await import("@/lib/ai/access");
  const { logoSeriesQuote } = await import("@/lib/logo-v2/quote");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  async function client() {
    const u = await createUser(`relais-oa${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "M");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'dominer' WHERE user_id = ?", u.id);
    billing.alignPeriod(u.id, Date.now());
    billing.syncAllowance(u.id);
    const pid = `p-${u.id}`;
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, "Test", Date.now(), Date.now());
    return { userId: u.id, projectId: pid };
  }
  beforeEach(() => {
    keys = { anthropic: "sk-ant-test-1234567890abcdef", openai: "sk-openai-test-123456", alibaba: "sk-alibaba-test-123456" };
    oa.calls = [];
    net.calls = [];
    vi.stubGlobal("fetch", fakeFetch);
    setSetting("ai.prices.checkedAt", String(Date.now()));
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.prices", "ai.media.usages"]) setJsonSetting(k, {});
  });

  it("Qwen dessine les logos ; le relais appelle OpenAI GPT Image 1 (jamais Qwen) avec sa propre réservation", async () => {
    const principal = mp.mediaRouteFor("logo", { text: true, transparent: true });
    expect(principal?.provider).toBe("alibaba");
    expect(mp.logoQualityRelay()).toEqual({ provider: "openai", model: "gpt-image-1" });
    const c = await client();
    const before = net.calls.length;
    await fr(() => runForUser(c.userId, () => mp.logoArtworkRelayImage({ ...c, usageKey: "relais-1" }, { prompt: "Dessine un beau logo professionnel pour « Côte à Côte »." })));
    expect(oa.calls).toHaveLength(1);
    expect(oa.calls[0]).toMatchObject({ kind: "generate", model: "gpt-image-1" });
    expect(net.calls.slice(before).some((u) => u.includes("aigc"))).toBe(false);
    const res = all<{ provider: string; model: string; status: string }>("SELECT provider, model, status FROM ai_reservations WHERE user_id = ?", c.userId);
    expect(res).toEqual([{ provider: "openai", model: "gpt-image-1", status: "settled" }]);
  });

  it("devis : coût probable de la série, relais annoncé à part (seulement s'il a lieu), plafond qui le couvre", () => {
    const q = logoSeriesQuote();
    expect(q.mode).toBe("artwork");
    expect(q.relayMicro).toBeGreaterThan(0);
    expect(q.probableMicro).toBeGreaterThan(0);
    expect(q.maxMicro).toBeGreaterThanOrEqual(q.probableMicro! + 3 * mp.logoRelayMaxMicro()!);
  });

  it("pas de relais sans clé OpenAI, ni quand OpenAI est déjà le modèle des logos", () => {
    keys.openai = null;
    expect(mp.logoQualityRelay()).toBeNull();
    expect(logoSeriesQuote().relayMicro).toBeNull();
    keys = { anthropic: "sk-ant-test-1234567890abcdef", openai: "sk-openai-test-123456" };
    expect(mp.mediaRouteFor("logo", { text: true, transparent: true })?.provider).toBe("openai");
    expect(mp.logoQualityRelay()).toBeNull();
  });
});
