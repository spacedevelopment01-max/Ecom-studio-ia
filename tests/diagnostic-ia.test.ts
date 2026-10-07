/**
 * Diagnostic de l'IA (phase 1C) : coûts par projet, tâche de fond, étape, module et modèle ; suivi d'un candidat
 * (notes par tentative, gain de qualité, coût des reprises) ; appels utiles / rejetés / dupliqués / reprises ;
 * coût des candidats FINAL / PROVISIONAL / REJECTED ; jamais de secret ni de prompt complet.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: any[] = [];
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      sent.push(params);
      const p = Promise.resolve({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: "Réponse" }], usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 300 } });
      return { finalMessage: () => p };
    }
    messages = { stream: (p: any) => this.stream(p) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: () => "sk-ant-test-1234567890abcdef" }));

beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}")));
afterEach(() => vi.unstubAllGlobals());

describe("diagnostic de l'IA", async () => {
  const { createUser } = await import("@/lib/auth");
  const { id, now, run } = await import("@/lib/db");
  const { recordCall, withCandidate, withTrace } = await import("@/lib/ai/trace");
  const { decide } = await import("@/lib/quality/gate");
  const { saveCheck } = await import("@/lib/quality/store");
  const { aiDiagnostic } = await import("@/lib/ai/diagnostic");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");

  const u = await createUser(`diag${Date.now()}@test.fr`, "motdepasse-test", "D");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
  syncAllowance(u.id);
  const P1 = id();
  const P2 = id();
  for (const pid of [P1, P2]) run("INSERT INTO projects (id, user_id, name, status, platform, store_type, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", pid, u.id, `Projet ${pid}`, "draft", "shopify", "mono", "{}", "[]", now(), now());
  const J1 = id();
  run("INSERT INTO jobs (id, user_id, project_id, type, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)", J1, u.id, P1, "project.create", "done", now(), now(), now());

  const call = (o: { cost: number; task?: string; status?: "ok" | "error"; billingDedup?: boolean; promptHash?: string; callTry?: number; errorKind?: string; projectId?: string; model?: string; served?: string; httpAttempts?: number }) =>
    recordCall({
      userId: u.id,
      projectId: o.projectId ?? P1,
      jobId: o.projectId === P2 ? null : J1,
      task: o.task ?? "image_generation",
      provider: o.task === "copywriting" ? "anthropic" : "google",
      requestedModel: o.model ?? "gemini-image",
      servedModel: o.served ?? o.model ?? "gemini-image",
      unit: o.task === "copywriting" ? "tokens" : "image",
      inputTokens: 100,
      outputTokens: 20,
      cacheReadTokens: 300,
      quantity: 1,
      latencyMs: 1000,
      httpAttempts: o.httpAttempts ?? 1,
      costMicro: o.cost,
      usageEventId: o.billingDedup ? null : `ev-${Math.random()}`,
      billingDedup: o.billingDedup,
      status: o.status ?? "ok",
      errorKind: o.errorKind,
      promptKey: "image:brief",
      promptHash: o.promptHash ?? `h-${Math.random()}`,
      callTry: o.callTry,
    });

  // Candidat A : image notée 5 (reprise demandée), puis 8 (FINAL) → gain +3 pour 40 000 µ€ de reprise.
  const dA0 = decide("image_lifestyle", { checker: "ai", score: 5, confidence: 0.9, issues: ["fond flou"] }, { attempt: 0 });
  const dA1 = decide("image_lifestyle", { checker: "ai", score: 8, confidence: 0.9 }, { attempt: 1 });
  // Candidat B : accueil du thème noté 6 → PROVISIONAL (gardé, à améliorer).
  const dB = decide("theme_home", { checker: "ai", score: 6, confidence: 0.9 }, { attempt: 0 });
  // Candidat C : image notée 3 à la dernière tentative → REJECTED (payée, jamais utilisée).
  const dC0 = decide("image_lifestyle", { checker: "ai", score: 4, confidence: 0.9 }, { attempt: 0 });
  const dC1 = decide("image_lifestyle", { checker: "ai", score: 3, confidence: 0.9 }, { attempt: 1 });

  await withTrace({ jobId: J1, projectId: P1, step: "visuels" }, async () => {
    await withCandidate("cand-A", 0, async () => (call({ cost: 40_000 }), void 0));
    const a0 = saveCheck(dA0, { userId: u.id, candidateId: "cand-A" });
    await withCandidate("cand-A", 1, async () => (call({ cost: 40_000 }), void 0));
    saveCheck(dA1, { userId: u.id, candidateId: "cand-A", previousCheckId: a0 });
    await withCandidate("cand-C", 0, async () => (call({ cost: 30_000 }), void 0));
    const c0 = saveCheck(dC0, { userId: u.id, candidateId: "cand-C" });
    await withCandidate("cand-C", 1, async () => (call({ cost: 30_000 }), void 0));
    saveCheck(dC1, { userId: u.id, candidateId: "cand-C", previousCheckId: c0 });
  });
  await withTrace({ jobId: J1, projectId: P1, step: "boutique/accueil" }, async () => {
    await withCandidate("cand-B", 0, async () => (call({ cost: 20_000, task: "copywriting", model: "claude-sonnet-5-5", served: "claude-sonnet-5-5-20260901" }), void 0));
    saveCheck(dB, { userId: u.id, candidateId: "cand-B" });
  });
  await withTrace({ jobId: J1, projectId: P1, step: "textes" }, async () => {
    // Rejeu d'une étape déjà payée (non refacturé), appel identique, nouvel essai technique, panne avec clé dans l'erreur.
    call({ cost: 10_000, task: "copywriting", model: "claude-sonnet-5-5", promptHash: "same" });
    call({ cost: 10_000, task: "copywriting", model: "claude-sonnet-5-5", promptHash: "same" });
    call({ cost: 10_000, task: "copywriting", model: "claude-sonnet-5-5", billingDedup: true });
    call({ cost: 5_000, task: "copywriting", model: "claude-sonnet-5-5", callTry: 1, httpAttempts: 3 });
    call({ cost: 0, task: "copywriting", model: "claude-sonnet-5-5", status: "error", errorKind: `401 invalid key ${["sk-", "ant-api03-", "SECRETSECRETSECRET"].join("")} Authorization: Bearer abcdefghijklmnop` });
  });
  call({ cost: 7_000, projectId: P2 });
  // Vrai appel de texte (prompt confidentiel) : le diagnostic n'en garde que la clé et l'empreinte.
  await runWithLang({ ui: "fr" }, () =>
    withTrace({ jobId: J1, projectId: P1, step: "textes/vrai" }, async () => {
      const { llmText } = await import("@/lib/ai/llm");
      await llmText({ task: "copywriting", userId: u.id, projectId: P1, jobId: J1, system: "SYSTEME-CONFIDENTIEL", prompt: "PROMPT-CONFIDENTIEL-123 data:image/png;base64,iVBORw0KGgo", promptKey: "copy:shop" });
    }),
  );

  const d = aiDiagnostic({ projectId: P1 });
  const all_ = aiDiagnostic({});

  it("les verdicts de départ sont bien ceux attendus (A : RETRY puis FINAL, B : PROVISIONAL, C : REJECTED)", () => {
    expect([dA0.verdict, dA1.verdict, dB.verdict, dC1.verdict]).toEqual(["RETRY", "FINAL", "PROVISIONAL", "REJECTED"]);
  });

  it("coûts par projet, par tâche de fond et par étape", () => {
    const realCall = d.calls.find((c) => c.promptKey === "copy:shop")!;
    const p1 = all_.byProject.find((r) => r.key === P1)!;
    expect(p1.costMicro).toBe(40_000 + 40_000 + 30_000 + 30_000 + 20_000 + 10_000 * 3 + 5_000 + realCall.costMicro);
    expect(all_.byProject.find((r) => r.key === P2)!.costMicro).toBe(7_000);
    expect(d.byJob.find((r) => r.key.startsWith(J1))!.key).toContain("project.create");
    expect(d.byStep.find((r) => r.key === "visuels")!.costMicro).toBe(140_000);
    expect(d.byStep.find((r) => r.key === "boutique/accueil")!.costMicro).toBe(20_000);
    // Module = premier segment de l'étape.
    expect(d.byModule.find((r) => r.key === "boutique")!.costMicro).toBe(20_000);
    expect(d.byModule.find((r) => r.key === "textes")!.calls).toBe(6);
    // Facturé ≠ coût : le rejeu non refacturé est visible mais pas compté deux fois.
    expect(d.totals.costMicro - d.totals.billedCostMicro).toBe(10_000);
    // Par modèle demandé et servi, avec jetons, cache et latence.
    const sonnet = d.byProviderModel.find((r) => r.key === "anthropic/claude-sonnet-5-5")!;
    expect(sonnet.calls).toBe(7);
    expect(sonnet.cacheHitRate).not.toBeNull();
    expect(sonnet.avgLatencyMs).toBeGreaterThanOrEqual(0);
    expect(d.byServedModel.some((r) => r.key === "anthropic/claude-sonnet-5-5-20260901")).toBe(true);
  });

  it("suivi d'un candidat : notes par tentative, coût, consigne de reprise, gain de qualité, coût total", () => {
    const a = d.candidates.find((c) => c.candidateId === "cand-A")!;
    expect(a.deliverable).toBe("image_lifestyle");
    expect(a.attempts.map((x) => [x.attempt, x.score, x.verdict, x.costMicro])).toEqual([
      [0, 5, "RETRY", 40_000],
      [1, 8, "FINAL", 40_000],
    ]);
    expect(a.attempts[0].feedback).toMatch(/flou/);
    expect(a.attempts[1].qualityDelta).toBe(3);
    expect(a).toMatchObject({ finalVerdict: "FINAL", qualityBefore: 5, qualityAfter: 8, qualityGain: 3, retryCostMicro: 40_000, totalCostMicro: 80_000 });
    expect(a.retryCostPerPointMicro).toBe(Math.round(40_000 / 3));
    const c = d.candidates.find((x) => x.candidateId === "cand-C")!;
    expect(c).toMatchObject({ finalVerdict: "REJECTED", qualityGain: -1, retryCostMicro: 30_000, totalCostMicro: 60_000 });
  });

  it("appels utiles, remplacés, rejetés, dupliqués, en erreur ; reprises", () => {
    const byCand = (id: string, attempt: number) => d.calls.find((c) => c.candidateId === id && c.attempt === attempt)!;
    expect(byCand("cand-A", 0).outcome).toBe("superseded");
    expect(byCand("cand-A", 1)).toMatchObject({ outcome: "useful", retry: true, verdict: "FINAL", qualityBefore: 5, qualityDelta: 3 });
    expect(byCand("cand-B", 0).outcome).toBe("provisional");
    expect(byCand("cand-C", 0).outcome).toBe("rejected");
    expect(byCand("cand-C", 1).outcome).toBe("rejected");
    expect(d.outcomes.rejected).toEqual({ calls: 2, costMicro: 60_000 });
    expect(d.duplicates.replaysNotBilled).toEqual({ calls: 1, costMicro: 10_000 });
    expect(d.duplicates.identicalCalls).toEqual({ calls: 1, costMicro: 10_000 });
    expect(d.outcomes.error.calls).toBe(1);
    expect(d.retries.candidateRetries).toEqual({ calls: 2, costMicro: 70_000 });
    expect(d.retries.technicalRetries).toEqual({ calls: 1, costMicro: 5_000 });
    expect(d.retries.httpRetries).toBe(2);
    expect(d.retries.improved).toBe(1);
    expect(d.retries.notImproved).toBe(1);
  });

  it("coût des candidats FINAL / PROVISIONAL / REJECTED", () => {
    expect(d.costByVerdict.FINAL).toEqual({ candidates: 1, costMicro: 80_000 });
    expect(d.costByVerdict.PROVISIONAL).toEqual({ candidates: 1, costMicro: 20_000 });
    expect(d.costByVerdict.REJECTED).toEqual({ candidates: 1, costMicro: 60_000 });
  });

  it("aucun secret, aucun prompt complet, aucune image encodée dans le diagnostic", () => {
    expect(sent).toHaveLength(1);
    const json = JSON.stringify(all_);
    for (const s of ["SECRETSECRETSECRET", "abcdefghijklmnop", "sk-ant-test-1234567890abcdef", "PROMPT-CONFIDENTIEL-123", "SYSTEME-CONFIDENTIEL", "iVBORw0KGgo", "base64,"]) expect(json).not.toContain(s);
    const err = d.calls.find((c) => c.status === "error")!;
    expect(err.error).toContain("401");
    // Seules la clé du prompt et son empreinte sont visibles.
    const real = d.calls.find((c) => c.promptKey === "copy:shop")!;
    expect(real.promptHash).toMatch(/^[0-9a-f]{8,}$/);
    expect(Object.keys(real)).not.toContain("prompt");
  });

  it("route d'administration : réservée à l'administration, même contenu que le script, sans secret", async () => {
    const { GET } = await import("@/app/api/admin/ai-calls/route");
    const { sha256 } = await import("@/lib/secrets");
    const t = Date.now();
    const admin = await createUser(`diag-admin${t}@test.fr`, "motdepasse-test", "Admin");
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    const session = (uid: string, token: string) => run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(token), uid, Date.now() + 3600_000, Date.now());
    session(u.id, `tok-diag-client-${t}`);
    session(admin.id, `tok-diag-admin-${t}`);
    const get = () => GET(new Request(`http://studio.test/api/admin/ai-calls?project=${P1}`));
    jar.token = "";
    expect((await get()).status).toBe(401);
    jar.token = `tok-diag-client-${t}`;
    expect((await get()).status).toBe(403);
    jar.token = `tok-diag-admin-${t}`;
    const res = await get();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text).costByVerdict.FINAL).toEqual({ candidates: 1, costMicro: 80_000 });
    for (const s of ["SECRETSECRETSECRET", "PROMPT-CONFIDENTIEL-123", "SYSTEME-CONFIDENTIEL"]) expect(text).not.toContain(s);
    jar.token = "";
  });

  it("SEO Shopify : envoyé / accepté / refusé / inconnu lu dans les envois, jamais « vérifié »", () => {
    const res = { product: { seo: { a: { status: "accepted", verified: false }, b: { status: "refused", detail: "Access denied token=abc123456789" }, c: { status: "unknown" }, d: "sent", e: "refused: x" } } };
    run("INSERT INTO jobs (id, user_id, project_id, type, status, result, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)", id(), u.id, P2, "shopify.push", "done", JSON.stringify(res), now(), now(), now());
    const s = aiDiagnostic({ projectId: P2 }).shopifySeo;
    expect(s.verified).toBe(false);
    expect(s.counts).toMatchObject({ accepted: 1, refused: 2, unknown: 1, sent: 1 });
    expect(JSON.stringify(s)).not.toContain("abc123456789");
  });
});
