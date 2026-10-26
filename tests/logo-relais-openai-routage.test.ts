vi.mock("@/lib/public-download",()=>import("./public-download-double"));
import { REQUIRED_LOGO_MODEL } from "@/lib/ai/logo-policy";
/** Politique propriétaire du 18/10 : un seul modèle logo, aucun relais. Fournisseurs simulés. */
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
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.prices", "ai.media.usage"]) setJsonSetting(k, {});
    setJsonSetting("ai.media.models", { [`openai:${REQUIRED_LOGO_MODEL}`]: { confirmedAt: Date.now(), enabled: true } });
    setJsonSetting("ai.prices", { [`openai:${REQUIRED_LOGO_MODEL}`]: { unit: "image", perImage: 0.22 } }); // Prix injecté, pas coût officiel réel.
  });

  it("le modèle imposé dessine, les anciennes routes logo n'ont aucun effet sur lui", async () => {
    setJsonSetting("ai.media.usage", { logo: { primary: "alibaba:qwen-image-max" } });
    setJsonSetting("ai.media.quality", { logo: "medium" }); // La demande de qualité haute du logo reste prioritaire.
    expect(mp.mediaRouteFor("logo", { text: true })).toMatchObject({ provider: "openai", model: REQUIRED_LOGO_MODEL });
    expect(mp.logoQualityRelay()).toBeNull();
    const c = await client();
    await fr(() => runForUser(c.userId, () => mp.logoArtworkImage({ ...c, usageKey: "mandatory-1" }, { prompt: "Dessine le logo de la marque de test." })));
    expect(oa.calls).toHaveLength(1);
    expect(oa.calls[0]).toMatchObject({ kind: "generate", model: REQUIRED_LOGO_MODEL, quality: "high" });
    expect(net.calls).toEqual([]);
    expect(all("SELECT * FROM ai_reservations WHERE user_id=? AND status='settled'", c.userId)).toHaveLength(1);
    expect(all<{ estimated: number }>("SELECT estimated FROM ai_calls WHERE user_id=?", c.userId)[0].estimated).toBe(1);
  });
  it("le devis couvre trois dessins et leurs contrôles, sans relais vers un autre modèle", () => {
    const q = logoSeriesQuote();
    expect(q.mode).toBe("artwork"); expect(q.creations).toBe(3);
    expect(q.relayMicro).toBeNull(); expect(q.probableMicro).toBeGreaterThan(0);
    expect(q.maxMicro).toBeGreaterThanOrEqual(q.probableMicro!);
  });
  it("sans OpenAI : aucun Qwen, ancien modèle ou dessin local de remplacement", async () => {
    keys.openai = null;
    expect(mp.mediaRouteFor("logo", { text: true })).toBeNull();
    expect(mp.logoQualityRelay()).toBeNull();
    expect(() => logoSeriesQuote()).toThrow(/en attente/);
    const c = await client();
    await expect(fr(() => runForUser(c.userId, () => mp.logoArtworkImage({ ...c, usageKey: "blocked" }, { prompt: "Logo test" })))).rejects.toThrow();
    expect(oa.calls).toEqual([]); expect(net.calls).toEqual([]);
  });
  it("clé disponible mais borne de consommation inconnue : refus avant toute API", () => {
    setJsonSetting("ai.prices", {}); // Tarif officiel au jeton disponible, pas de borne inventée.
    expect(() => logoSeriesQuote()).toThrow(/Plafond.*en attente/);
    try { logoSeriesQuote(); } catch (error) { expect((error as { status: number }).status).toBe(409); }
    expect(oa.calls).toEqual([]);
  });
});
