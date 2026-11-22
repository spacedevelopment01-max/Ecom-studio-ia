/**
 * Travail en différé des appels de texte (lot 2, 15 novembre 2026) : un appel de fond est déposé chez le fournisseur et
 * compté à moitié prix quand il est servi ainsi ; l'attente est bornée par appel et par tâche ; un dépôt refusé, annulé
 * ou expiré repart en direct, au prix normal. Aucun appel réel : le dépôt est simulé (`deferredDeps`) et l'envoi direct
 * arrive sur un faux serveur local.
 */
import http from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { account, project } from "./conversation209-fixtures";
import { all, id } from "@/lib/db";
import { DEFERRED_DISCOUNT, deferredDeps, deferredLimits, deferredWaitedMs, enDiffere, llmText, type LlmCall } from "@/lib/ai/llm";
import { DEFAULT_MODELS } from "@/lib/syna-agent/models";

vi.mock("@/lib/ai/config", async (original) => ({ ...(await original<object>()), activeProviderKey: (provider: string) => (provider === "anthropic" ? "cle-factice-du-test-differe" : null) }));

const USAGE = { input_tokens: 800, output_tokens: 300 };
/** Envois DIRECTS reçus par le faux serveur (le comptage gratuit des jetons n'en fait pas partie). */
const direct: { path: string; model: string }[] = [];
const server = http.createServer(async (req, res) => {
  let raw = "";
  for await (const c of req) raw += c;
  const b = JSON.parse(raw || "{}");
  if (req.url?.endsWith("/count_tokens")) { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ input_tokens: USAGE.input_tokens })); return; }
  direct.push({ path: req.url ?? "", model: b.model });
  res.writeHead(200, { "content-type": "text/event-stream" });
  const event = (type: string, rest: object) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...rest })}\n\n`);
  event("message_start", { message: { id: `direct-${direct.length}`, type: "message", role: "assistant", model: b.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: USAGE.input_tokens, output_tokens: 0 } } });
  event("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
  event("content_block_delta", { index: 0, delta: { type: "text_delta", text: "Réponse en direct." } });
  event("content_block_stop", { index: 0 });
  event("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: USAGE.output_tokens } });
  event("message_stop", {});
  res.end();
});

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("adresse locale absente");
  vi.stubEnv("ANTHROPIC_BASE_URL", `http://127.0.0.1:${address.port}`);
});
afterAll(async () => { vi.unstubAllEnvs(); await new Promise<void>((resolve) => server.close(() => resolve())); });

const LIMITS = { ...deferredLimits };
afterEach(() => { delete deferredDeps.batches; delete deferredDeps.sleep; Object.assign(deferredLimits, LIMITS); });

type Outcome = "succeeded" | "canceled" | "expired";
/** Dépôt simulé : `create` rend un dépôt en cours, `retrieve` le rend terminé au bout de `polls` suivis. */
function batches(o: { outcome?: Outcome; polls?: number; refuse?: number } = {}) {
  const log = { created: [] as any[], retrieved: 0, cancelled: [] as string[], results: 0 };
  deferredDeps.batches = {
    create: async (p: any) => {
      if (o.refuse) throw Object.assign(new Error(`dépôt refusé (${o.refuse})`), { status: o.refuse });
      log.created.push(p);
      return { id: `depot-${log.created.length}`, processing_status: "in_progress" };
    },
    retrieve: async (bid: string) => { log.retrieved++; return { id: bid, processing_status: log.retrieved >= (o.polls ?? 1) ? "ended" : "in_progress" }; },
    cancel: async (bid: string) => { log.cancelled.push(bid); return { id: bid, processing_status: "canceling" }; },
    results: async () => {
      log.results++;
      const params = log.created.at(-1).requests[0].params;
      const outcome = o.outcome ?? "succeeded";
      return (async function* () {
        yield outcome === "succeeded"
          ? { custom_id: "appel", result: { type: "succeeded", message: { id: "msg-differe", type: "message", role: "assistant", model: params.model, content: [{ type: "text", text: "Réponse en différé." }], stop_reason: "end_turn", stop_sequence: null, usage: { ...USAGE } } } }
          : { custom_id: "appel", result: { type: outcome } };
      })();
    },
  };
  return log;
}
/** Attente simulée : aucune vraie pause (les durées demandées sont notées). */
function noWait() { const asked: number[] = []; deferredDeps.sleep = async (ms: number) => { asked.push(ms); }; return asked; }

async function fixture() {
  const user = await account(), pid = project(user), jobId = `tache-differe-${id()}`;
  const call = (over: Partial<LlmCall> = {}): LlmCall => ({
    task: "strategy", userId: user.id, projectId: pid, jobId, system: "Tu réponds en une phrase, pour un essai technique.", prompt: "Dis bonjour.",
    maxTokens: 1000, usageKey: `differe-${id()}`, routing: { difficulty: "complex", prefer: DEFAULT_MODELS.strong }, ...over,
  });
  return { user, pid, jobId, call, start: direct.length };
}
const events = (uid: string) => all<{ cost: number; billed: number; estimated: number; model: string }>("SELECT cost, billed, estimated, model FROM usage_events WHERE user_id=? ORDER BY created_at, rowid", uid);
const reasons = (uid: string) => all<{ r: string | null; s: string }>("SELECT routing_reason r, status s FROM ai_calls WHERE user_id=? ORDER BY created_at, rowid", uid);
const reserves = (uid: string) => all<{ status: string; actual: number | null }>("SELECT status, actual FROM ai_reservations WHERE user_id=?", uid);

describe("IA — travail en différé, à moitié prix, avec une attente bornée", () => {
  it("la chaîne de la marque demande le différé par défaut ; le réglage « sina.differe » l'éteint pour comparer", async () => {
    const { deferredOn } = await import("@/lib/syna-agent/brand-chain");
    const { setSetting } = await import("@/lib/settings");
    expect(deferredOn()).toBe(true);
    setSetting("sina.differe", "false");
    try { expect(deferredOn()).toBe(false); } finally { setSetting("sina.differe", null); }
    expect(deferredOn()).toBe(true);
    // Patience par défaut : dix minutes par appel, trente par tâche.
    expect(deferredLimits).toMatchObject({ perCallMs: 10 * 60_000, perJobMs: 30 * 60_000 });
  });

  it("appel servi en différé : aucun envoi direct, compté à moitié prix du même appel en direct", async () => {
    const f = await fixture();
    const log = batches({ polls: 2 }), asked = noWait();
    expect(await llmText(f.call({ deferred: true }))).toBe("Réponse en différé.");
    // Un seul dépôt, suivi jusqu'à la fin, jamais annulé ; rien n'est parti en direct.
    expect(log.created).toHaveLength(1);
    expect(log.created[0].requests).toHaveLength(1);
    expect(log.created[0].requests[0].custom_id).toBe("appel");
    expect(log.created[0].requests[0].params).toMatchObject({ model: DEFAULT_MODELS.strong.model, messages: expect.any(Array), system: expect.any(Array) });
    expect(log.retrieved).toBe(2);
    expect(log.cancelled).toEqual([]);
    expect(asked).toEqual([deferredLimits.pollMs, deferredLimits.pollMs]);
    expect(direct.length - f.start).toBe(0);
    const [later] = events(f.user.id);
    expect(later.cost).toBeGreaterThan(0);
    expect(reserves(f.user.id)).toEqual([{ status: "settled", actual: later.billed }]);
    expect(reasons(f.user.id).at(-1)!.r).toMatch(/différé \(moitié prix\)$/);
    expect(deferredWaitedMs(f.jobId)).toBeGreaterThanOrEqual(0);

    // Le même appel sans différé : il part en direct (aucun dépôt), au prix normal.
    expect(await llmText(f.call())).toBe("Réponse en direct.");
    expect(log.created).toHaveLength(1);
    expect(direct.length - f.start).toBe(1);
    const [, now] = events(f.user.id);
    expect(DEFERRED_DISCOUNT).toBe(0.5);
    expect(Math.abs(later.cost - now.cost * DEFERRED_DISCOUNT)).toBeLessThanOrEqual(1);
    expect(Math.abs(later.billed - now.billed * DEFERRED_DISCOUNT)).toBeLessThanOrEqual(1);
    expect(later.estimated).toBe(0);
    expect(reasons(f.user.id).at(-1)!.r ?? "").not.toMatch(/différé/);
  });

  it("dépôt sans réponse à temps : annulé après la patience de l'appel, puis l'appel part en direct au prix normal", async () => {
    const f = await fixture();
    const log = batches({ outcome: "canceled", polls: 2 });
    noWait();
    deferredLimits.perCallMs = -1; // la patience de l'appel est déjà dépassée au premier suivi
    expect(await llmText(f.call({ deferred: true }))).toBe("Réponse en direct.");
    expect(log.created).toHaveLength(1);
    expect(log.cancelled).toEqual(["depot-1"]); // annulé une seule fois
    expect(log.results).toBe(1);
    expect(direct.length - f.start).toBe(1);
    // Un seul appel compté (le dépôt annulé n'a rien coûté), au prix du direct.
    const paid = events(f.user.id);
    expect(paid).toHaveLength(1);
    expect(reasons(f.user.id).at(-1)!.r ?? "").not.toMatch(/différé/);
    const g = await fixture();
    await llmText(g.call());
    expect(paid[0].cost).toBe(events(g.user.id)[0].cost);
    // Un dépôt expiré chez le fournisseur se traite de la même façon : jamais traité, jamais compté, envoi direct.
    const h = await fixture();
    const expired = batches({ outcome: "expired" });
    noWait();
    Object.assign(deferredLimits, LIMITS);
    expect(await llmText(h.call({ deferred: true }))).toBe("Réponse en direct.");
    expect(expired.cancelled).toEqual([]);
    expect(direct.length - h.start).toBe(1);
    expect(events(h.user.id)).toHaveLength(1);
  });

  it("patience comptée en temps réel : trois appels qui attendent ensemble ne la mangent qu'une fois (22 novembre 2026)", async () => {
    const f = await fixture();
    batches({ polls: 1 });
    deferredDeps.sleep = () => new Promise<void>((r) => setTimeout(r, 60));
    const t0 = Date.now();
    await Promise.all([1, 2, 3].map(() => llmText(f.call({ deferred: true }))));
    const reel = Date.now() - t0, compte = deferredWaitedMs(f.jobId);
    // Avant : environ trois fois l'attente réelle ; maintenant, jamais plus que le temps réellement passé.
    expect(compte).toBeGreaterThanOrEqual(50);
    expect(compte).toBeLessThanOrEqual(reel + 5);
  });

  it("coupure pendant l'attente d'un lot : à la reprise, sa réponse est lue chez le fournisseur, jamais repayée", async () => {
    const f = await fixture();
    const log = batches({ polls: 1 });
    noWait();
    // Le suivi du lot tombe en panne (le travailleur redémarre) : résultat incertain, coût maximal retenu.
    const panne = deferredDeps.batches!.retrieve;
    deferredDeps.batches!.retrieve = async () => { throw new Error("connexion perdue"); };
    const call = f.call({ deferred: true });
    await expect(llmText(call)).rejects.toThrow();
    expect(log.created).toHaveLength(1);
    // La tâche reprend : même appel, même clé. Le lot déjà déposé est lu ; aucun nouveau dépôt, aucun envoi direct.
    deferredDeps.batches!.retrieve = panne;
    const avant = direct.length;
    expect(await llmText(call)).toBe("Réponse en différé.");
    expect(log.created).toHaveLength(1);
    expect(direct.length).toBe(avant);
    const r = all<{ status: string; provider_receipt: string | null }>("SELECT status, provider_receipt FROM ai_reservations WHERE user_id=? ORDER BY created_at", f.user.id).at(-1)!;
    expect(JSON.parse(r.provider_receipt!)).toEqual({ differe: "depot-1" });
    expect(r.status).not.toBe("uncertain");
  });

  it("un petit contrôle (Haiku) ne part jamais en différé : il ne fait pas attendre le site", async () => {
    const f = await fixture();
    const log = batches();
    noWait();
    expect(await llmText(f.call({ deferred: true, routing: { difficulty: "standard", prefer: { provider: "anthropic", model: "claude-haiku-5-5", effort: "low" } } }))).toBe("Réponse en direct.");
    expect(log.created).toHaveLength(0);
  });

  it("patience de la tâche épuisée : les appels suivants partent en direct d'emblée, sans dépôt", async () => {
    const f = await fixture();
    const log = batches({ outcome: "canceled", polls: 1 });
    // Une vraie petite attente, pour que le temps passé sur le différé soit compté pour la tâche.
    deferredDeps.sleep = () => new Promise<void>((r) => setTimeout(r, 30));
    expect(deferredWaitedMs(f.jobId)).toBe(0);
    await llmText(f.call({ deferred: true }));
    const waited = deferredWaitedMs(f.jobId);
    expect(waited).toBeGreaterThanOrEqual(25);
    expect(log.created).toHaveLength(1);
    expect(direct.length - f.start).toBe(1);
    // La tâche a épuisé sa patience : plus aucun dépôt pour elle.
    deferredLimits.perJobMs = waited;
    expect(await llmText(f.call({ deferred: true }))).toBe("Réponse en direct.");
    expect(log.created).toHaveLength(1);
    expect(direct.length - f.start).toBe(2);
    expect(deferredWaitedMs(f.jobId)).toBe(waited);
    // Une autre tâche garde sa propre patience.
    const g = await fixture();
    const other = batches();
    noWait();
    expect(await llmText(g.call({ deferred: true }))).toBe("Réponse en différé.");
    expect(other.created).toHaveLength(1);
  });

  it("dépôt refusé net par le fournisseur (4xx) : rien n'existe, l'appel part en direct ; une autre erreur n'est jamais relancée seule", async () => {
    const f = await fixture();
    const log = batches({ refuse: 400 });
    noWait();
    expect(await llmText(f.call({ deferred: true }))).toBe("Réponse en direct.");
    expect(log.created).toEqual([]);
    expect(log.retrieved).toBe(0);
    expect(direct.length - f.start).toBe(1);
    expect(events(f.user.id)).toHaveLength(1);
    expect(reserves(f.user.id)).toHaveLength(1);
    expect(reserves(f.user.id)[0].status).toBe("settled");
    // Erreur du fournisseur au dépôt (5xx) : résultat incertain, aucun envoi direct lancé à la place.
    const g = await fixture();
    batches({ refuse: 503 });
    noWait();
    await expect(llmText(g.call({ deferred: true }))).rejects.toThrow();
    expect(direct.length - g.start).toBe(0);
    expect(events(g.user.id)).toEqual([]);
  });
  it("angles, site et publications (22 novembre 2026) : toute la tâche part en différé ; un appel qui demande le direct y reste", async () => {
    const f = await fixture();
    const log = batches({ polls: 1 });
    noWait();
    // Dans la tâche de fond : un appel qui ne dit rien est déposé en différé, à moitié prix.
    expect(await enDiffere(() => llmText(f.call()))).toBe("Réponse en différé.");
    expect(log.created).toHaveLength(1);
    expect(direct.length - f.start).toBe(0);
    expect(reasons(f.user.id).at(-1)!.r).toMatch(/différé \(moitié prix\)$/);
    // Une retouche que le client attend devant (« deferred: false ») reste en direct, même dans la tâche.
    expect(await enDiffere(() => llmText(f.call({ deferred: false })))).toBe("Réponse en direct.");
    expect(log.created).toHaveLength(1);
    // Hors d'une tâche en différé, rien ne change.
    expect(await llmText(f.call())).toBe("Réponse en direct.");
    expect(log.created).toHaveLength(1);
  });

  it("les tâches servies en différé : la marque (appel par appel), les angles, le site et les publications ; le réglage les coupe toutes", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("worker/handlers.ts", "utf8");
    for (const t of ["syna.angles", "syna.site", "syna.posts.plan"]) expect(src, t).toMatch(new RegExp(`"${t.replace(/\./g, "\\.")}": async \\(ctx\\) => differe\\(`));
    expect(src).toContain("return deferredOn() ? enDiffere(fn) : fn();");
    // « Dessiner puis coder » n'est pas touché (consigne du propriétaire).
    expect(src).toMatch(/"syna\.dessin": async \(ctx\) => \(await import/);
    expect(fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8")).toContain("const deferred = deferredOn() && !direct;");
  });
});
