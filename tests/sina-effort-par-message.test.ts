vi.mock("@/lib/public-download",()=>import("./public-download-double"));
/**
 * Effort de SINA aux moments forts par un message dans la conversation (décision relayée par le chef d'orchestre le
 * 22 novembre 2026) — AUCUN appel réel : le fournisseur est simulé.
 *  - chemin 1 : la fonction en essai d'Anthropic est acceptée : l'effort de la demande reste le même (la mémoire du fil
 *    reste), l'effort élevé passe par un message système vide portant `output_config` ;
 *  - chemin 2 : le fournisseur la refuse (400, rien de produit ni facturé) : retour immédiat à l'effort dans la demande,
 *    sans panne pour le client ; la fonction est mise de côté une heure ;
 *  - chemin 3 : éteinte dans l'administration (réglage « sina.effortParMessage ») : la façon d'avant.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const llm: { sent: any[]; refuse: boolean } = { sent: [], refuse: false };
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      llm.sent.push(JSON.parse(JSON.stringify(params)));
      const finalMessage = async () => {
        if (llm.refuse && params.messages.some((m: any) => m.role === "system")) throw Object.assign(new Error("messages.1.output_config: Extra inputs are not permitted"), { status: 400 });
        return { model: params.model, stop_reason: "end_turn", content: [{ type: "text", text: "ok" }], usage: { input_tokens: 1000, output_tokens: 500 } };
      };
      return { finalMessage };
    }
    private count(p: any) { return Promise.resolve({ input_tokens: Math.ceil(JSON.stringify(p).length / 3) }); }
    messages = { stream: (p: any) => this.stream(p), countTokens: (p: any) => this.count(p) };
    beta = { messages: { stream: (p: any) => this.stream(p), countTokens: (p: any) => this.count(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "anthropic" ? "cle-de-test-1234567890abcdef" : null) }));

beforeEach(() => { llm.sent = []; llm.refuse = false; });

describe("effort par message dans la conversation de SINA", async () => {
  const { createUser } = await import("@/lib/auth");
  const { run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const L = await import("@/lib/ai/llm");
  const { runForUser } = await import("@/lib/ai/access");
  const { setJsonSetting } = await import("@/lib/settings");
  const { modelFor } = await import("@/lib/syna-agent/loop");

  async function client() {
    const u = await createUser(`effort${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "E");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'dominer', billing = 'month' WHERE user_id = ?", u.id);
    billing.alignPeriod(u.id, Date.now());
    billing.syncAllowance(u.id);
    return u;
  }
  const appel = (uid: string, effortDuTour?: string, k = Math.random().toString(36)) => runForUser(uid, () => L.llmText({ task: "agent_conversation", userId: uid, system: "Tu es SINA.", prompt: "Étape 1.", usageKey: `t:${k}`, routing: { difficulty: "complex", prefer: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" } }, ...(effortDuTour ? { effortDuTour } : {}) }));
  const sys = (p: any) => p.messages.filter((m: any) => m.role === "system");

  it("SINA : aux moments forts, l'effort de la demande reste le même et l'effort élevé est donné à part", () => {
    expect(modelFor(5, { keyMoment: "resultat" as never }).effort).toBe("high");
    const fs = require("node:fs") as typeof import("node:fs");
    const src = fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8");
    expect(src).toContain("prefer: { ...choix, effort: sinaModels().strong.effort }");
    expect(src).toContain("effortDuTour: choix.effort");
  });

  it("chemin 1 : fonction acceptée — même effort dans la demande, effort élevé par un message vide après la demande", async () => {
    setJsonSetting("sina.effortParMessage", true as any);
    const u = await client();
    await appel(u.id);
    await appel(u.id, "high");
    expect(llm.sent).toHaveLength(2);
    const [ordinaire, fort] = llm.sent;
    // La demande ne change pas d'effort : la mémoire du fil n'est pas effacée.
    expect(ordinaire.output_config.effort).toBe("medium");
    expect(fort.output_config.effort).toBe("medium");
    expect(sys(ordinaire)).toHaveLength(0);
    expect(sys(fort)).toEqual([{ role: "system", content: [], output_config: { effort: "high" } }]);
    expect(fort.messages.at(-1).role).toBe("system");
    expect(fort.betas).toEqual([L.EFFORT_PAR_MESSAGE_BETA]);
    // Tout ce qui précède le message est identique : même début de demande, repris de mémoire.
    expect(JSON.stringify(fort.messages.slice(0, -1))).toBe(JSON.stringify(ordinaire.messages));
    expect(JSON.stringify(fort.system)).toBe(JSON.stringify(ordinaire.system));
  });

  it("chemin 2 : fonction refusée (400) — retour immédiat à l'effort dans la demande, une réponse quand même, mise de côté une heure", async () => {
    setJsonSetting("sina.effortParMessage", true as any);
    const u = await client();
    llm.refuse = true;
    const out = await appel(u.id, "high");
    expect(out).toBeTruthy();
    expect(llm.sent).toHaveLength(2);
    expect(sys(llm.sent[0])).toHaveLength(1);
    // Le second envoi : la façon d'avant (effort élevé dans la demande, ni message ni fonction en essai).
    expect(sys(llm.sent[1])).toHaveLength(0);
    expect(llm.sent[1].betas).toBeUndefined();
    expect(llm.sent[1].output_config.effort).toBe("high");
    expect(L.etatEffortParMessage().panne?.model).toBe("claude-opus-5-5");
    // Pendant l'heure qui suit : directement la façon d'avant, sans nouveau refus.
    llm.sent = [];
    await appel(u.id, "high");
    expect(llm.sent).toHaveLength(1);
    expect(llm.sent[0].output_config.effort).toBe("high");
    expect(L.effortParMessageActif("claude-opus-5-5")).toBe(false);
    expect(L.effortParMessageActif("claude-opus-5-5", Date.now() + L.EFFORT_PANNE_MS + 1000)).toBe(true);
  });

  it("chemin 3 : éteinte dans l'administration — la façon d'avant ; un modèle qui ne l'accepte pas aussi", async () => {
    setJsonSetting("sina.effortParMessage", false as any);
    const u = await client();
    await appel(u.id, "high");
    expect(sys(llm.sent[0])).toHaveLength(0);
    expect(llm.sent[0].betas).toBeUndefined();
    expect(llm.sent[0].output_config.effort).toBe("high");
    expect(L.etatEffortParMessage().allume).toBe(false);
    setJsonSetting("sina.effortParMessage", true as any);
    expect(L.effortParMessageActif("claude-sonnet-4-6")).toBe(false);
    expect(L.effortParMessageActif("claude-sonnet-5-5")).toBe(true);
  });
});
