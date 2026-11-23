/**
 * L'amorce du différé (23 novembre 2026, recherche sur les coûts, ligne 4) : des demandes déposées en même temps avec la
 * même partie commune (consigne et dossier gardés une heure en mémoire) attendent que la première soit finie, puis la
 * relisent au lieu de l'écrire chacune. Amorce ratée : les autres partent comme avant. Aucun appel réel : le dépôt est
 * simulé (`deferredDeps`).
 */
import http from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { account, project } from "./conversation209-fixtures";
import { id } from "@/lib/db";
import { AMORCE_MIN_SIGNES, deferredDeps, llmText, oublierAmorces, partieCommune, type LlmCall } from "@/lib/ai/llm";
import { DEFAULT_MODELS } from "@/lib/syna-agent/models";

vi.mock("@/lib/ai/config", async (original) => ({ ...(await original<object>()), activeProviderKey: (provider: string) => (provider === "anthropic" ? "cle-factice-du-test-amorce" : null) }));

/** Faux serveur local : seul le comptage gratuit des jetons y arrive (aucun envoi direct attendu). */
const server = http.createServer(async (req, res) => {
  for await (const _ of req) { /* corps lu */ }
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(req.url?.endsWith("/count_tokens") ? { input_tokens: 800 } : { type: "error", error: { type: "invalid_request_error", message: "envoi direct inattendu" } }));
});
beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const a = server.address();
  if (!a || typeof a === "string") throw new Error("adresse locale absente");
  vi.stubEnv("ANTHROPIC_BASE_URL", `http://127.0.0.1:${a.port}`);
});
afterAll(async () => { vi.unstubAllEnvs(); await new Promise<void>((r) => server.close(() => r())); });
afterEach(() => { delete deferredDeps.batches; delete deferredDeps.sleep; oublierAmorces(); });

const DOSSIER = "Dossier de la marque, le même pour toutes les publications du mois. ".repeat(Math.ceil(AMORCE_MIN_SIGNES / 60));

/** Dépôt simulé : chaque dépôt se termine au 2e suivi ; le journal garde l'ordre des dépôts et des fins. */
function depots(o: { echecPremier?: boolean } = {}) {
  const journal: string[] = [], etat = new Map<string, number>(), params = new Map<string, any>();
  let n = 0;
  deferredDeps.sleep = async () => { await new Promise((r) => setTimeout(r, 1)); };
  deferredDeps.batches = {
    create: async (p: any) => { const bid = `depot-${++n}`; journal.push(`dépôt ${p.requests[0].params.messages[0].content.at(-1).text}`); etat.set(bid, 0); params.set(bid, p.requests[0].params); return { id: bid, processing_status: "in_progress" }; },
    retrieve: async (bid: string) => { const k = (etat.get(bid) ?? 0) + 1; etat.set(bid, k); const fini = k >= 2; if (fini && k === 2) journal.push(`fin ${bid}`); return { id: bid, processing_status: fini ? "ended" : "in_progress" }; },
    cancel: async (bid: string) => ({ id: bid, processing_status: "canceling" }),
    results: async (bid: string) => (async function* () {
      const p = params.get(bid);
      yield o.echecPremier && bid === "depot-1"
        ? { custom_id: "appel", result: { type: "errored", error: { error: { type: "api_error", message: "panne simulée" } } } }
        : { custom_id: "appel", result: { type: "succeeded", message: { id: `m-${bid}`, type: "message", role: "assistant", model: p.model, content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 800, output_tokens: 30 } } } };
    })(),
  };
  return journal;
}

async function appels() {
  const user = await account(), pid = project(user), jobId = `tache-amorce-${id()}`;
  return (prompt: string, over: Partial<LlmCall> = {}): LlmCall => ({ task: "copywriting", userId: user.id, projectId: pid, jobId, deferred: true, system: "Tu écris une publication, pour un essai technique.", context: DOSSIER, prompt, maxTokens: 1000, usageKey: `amorce-${id()}`, routing: { difficulty: "complex", prefer: DEFAULT_MODELS.strong }, ...over });
}

describe("l'amorce du différé", () => {
  it("trois demandes lancées ensemble sur le même dossier : la première part seule, les deux autres après sa fin", async () => {
    const journal = depots(), call = await appels();
    await Promise.all(["p1", "p2", "p3"].map((t) => llmText(call(t))));
    expect(journal[0]).toBe("dépôt p1");
    expect(journal.indexOf("fin depot-1")).toBeLessThan(journal.indexOf("dépôt p2"));
    expect(journal.indexOf("fin depot-1")).toBeLessThan(journal.indexOf("dépôt p3"));
  });

  it("une partie commune courte n'attend pas (l'attente ne rapporterait rien)", async () => {
    const journal = depots(), call = await appels();
    await Promise.all(["c1", "c2"].map((t) => llmText(call(t, { context: "Court." }))));
    expect(journal.slice(0, 2).sort()).toEqual(["dépôt c1", "dépôt c2"]);
  });

  it("amorce ratée : les autres partent comme avant, sans attendre une mémoire qui n'existe pas", async () => {
    const journal = depots({ echecPremier: true }), call = await appels();
    const r = await Promise.allSettled(["e1", "e2"].map((t) => llmText(call(t))));
    expect(r[0].status).toBe("rejected");
    expect(r[1]).toMatchObject({ status: "fulfilled", value: "ok" });
    expect(journal).toContain("dépôt e2");
  });

  it("la partie commune se lit jusqu'au dernier point de mémoire d'une heure ; sans lui, pas d'amorce", () => {
    const long = { type: "text", text: DOSSIER, cache_control: { type: "ephemeral", ttl: "1h" } };
    const a = partieCommune({ model: "m", system: [{ type: "text", text: "s" }], messages: [{ role: "user", content: [long, { type: "text", text: "demande A" }] as any }] });
    const b = partieCommune({ model: "m", system: [{ type: "text", text: "s" }], messages: [{ role: "user", content: [long, { type: "text", text: "demande B" }] as any }] });
    expect(a).not.toBeNull();
    expect(a).toBe(b);
    expect(partieCommune({ model: "m", messages: [{ role: "user", content: [{ ...long, cache_control: { type: "ephemeral" } }] as any }] })).toBeNull();
  });
});
