/**
 * Phase 3B — orchestrateur branché sur les vrais parcours (tout est simulé : aucun appel payant).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as o from "@/lib/orchestrator";

const sent: any[] = [];
let keys: Record<string, string | null> = { anthropic: "sk-ant-test-1234567890abcdef", openai: "sk-openai-test-123456", google: "cle-google-test-123456", fal: null };
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      sent.push(params);
      const p = Promise.resolve({ model: params.model, stop_reason: "end_turn", content: [{ type: "text", text: "ok" }], usage: { input_tokens: 10, output_tokens: 5 } });
      return { finalMessage: () => p };
    }
    messages = { stream: (p: any) => this.stream(p), countTokens: async (p: any) => ({ input_tokens: Math.ceil(JSON.stringify(p).length / 3) }) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

let fetchImpl: () => Promise<Response> = async () => new Response("{}");
beforeEach(() => {
  sent.length = 0;
  keys = { anthropic: "sk-ant-test-1234567890abcdef", openai: "sk-openai-test-123456", google: "cle-google-test-123456", fal: null };
  vi.stubGlobal("fetch", async () => fetchImpl());
});
afterEach(() => vi.unstubAllGlobals());

describe("Phase 3B — orchestrateur branché", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, one, run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { setSetting } = await import("@/lib/settings");
  const { JobContext } = await import("@/lib/jobs");
  const { withCandidate } = await import("@/lib/ai/trace");
  const { decide } = await import("@/lib/quality/gate");
  const { saveCheck } = await import("@/lib/quality/store");
  const { llmText } = await import("@/lib/ai/llm");
  const ex = await import("@/lib/orchestrator/execute");
  const orch = await import("@/lib/orchestrator");
  const { handlers } = await import("../worker/handlers");
  const { seedSebastienBlanc, seedSerumEclat } = await import("./brain-fixtures");
  const { allScenarios } = await import("./orchestrator-scenarios");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`orch3b${Date.now()}@test.fr`, "motdepasse-test", "O");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
  syncAllowance(u.id);
  const sbId = fr(() => seedSebastienBlanc(u.id));
  const serumId = fr(() => seedSerumEclat(u.id));
  let n = 0;
  const job = (type: string, payload: Record<string, unknown>) => {
    const id = `job-3b-${Date.now()}-${n++}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id, u.id, payload.projectId, type, type, JSON.stringify(payload), "running", Date.now(), Date.now(), Date.now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", id));
  };
  const planOf = (jobId: string, projectId = sbId) => orch.loadPlan(orch.planId(projectId, `job:${jobId}`))!;
  // Critères d'un logo (pertinence au-dessus de son plancher) : la note seule décide du verdict.
  const crit = (deliverable: string) => (deliverable.startsWith("logo") ? { relevance: 8, legibility: 8 } : undefined);
  const check = (ctx: InstanceType<typeof JobContext>, deliverable: any, score: number, attempt = 0, codes: string[] = []) => saveCheck(decide(deliverable, { checker: "ai", score, codes, criteria: crit(deliverable) }, { attempt }), { userId: u.id, projectId: sbId, jobId: ctx.job.id });
  // Projets neufs pour les scénarios (l'état réel d'un projet change ce que le plan saute).
  const fresh = () => ({ sb: fr(() => seedSebastienBlanc(u.id)), serum: fr(() => seedSerumEclat(u.id)) });

  // ------------------------------------------------------------------ parcours réels

  it("parcours réel : chaque action du studio passe par le planner (petit plan, moteur existant exécuté UNE fois)", async () => {
    for (const a of ["brand.build", "brand.logo", "brand.fulllogo", "copy.build", "images.generate", "image.single", "shop.build", "theme.custom", "shop.chat", "video.render", "video.ugc", "blog.write", "calendar.plan", "post.regenerate"]) expect(handlers[a], a).toBeTypeOf("function");
    const engine = vi.fn(async (ctx: any) => {
      await llmText({ task: "logo_symbol", userId: u.id, projectId: sbId, jobId: ctx.job.id, system: "S", prompt: "P" });
      check(ctx, "logo_route", 8.6);
      return { current: "piste-1" };
    });
    const ctx = job("brand.logo", { projectId: sbId, regenerate: true });
    const r = await fr(() => ex.orchestrated("brand.logo", engine)(ctx));
    expect(r).toEqual({ current: "piste-1" }); // résultat du moteur inchangé
    expect(engine).toHaveBeenCalledOnce();
    const plan = planOf(ctx.job.id);
    expect(plan.intents).toEqual(["CREATE_LOGO"]);
    expect(plan.steps.map((s) => [s.kind, s.status])).toEqual([["logo", "done"]]); // action simple → plan d'une étape
    expect(plan.steps[0].reason).toMatch(/final at 8.6.*no retry/);
    // Trace complète de l'appel fait par le moteur.
    expect(one<any>("SELECT intent, plan_id, step_id, routing_reason, requested_model FROM ai_calls WHERE job_id = ? ORDER BY created_at DESC LIMIT 1", ctx.job.id)).toEqual({ intent: "CREATE_LOGO", plan_id: plan.id, step_id: "logo", routing_reason: "complex creative direction", requested_model: "claude-opus-5-5" });
  });

  it("aucun double moteur : la création de marque fait aussi les pistes de logo et la charte (résultats reportés, pas de second moteur)", async () => {
    const engine = vi.fn(async (ctx: any) => (check(ctx, "logo_route", 3), { name: "Sébastien Blanc" }));
    const ctx = job("brand.build", { projectId: sbId });
    await fr(() => ex.orchestrated("brand.build", engine)(ctx));
    expect(engine).toHaveBeenCalledOnce();
    const plan = planOf(ctx.job.id);
    expect(plan.steps.map((s) => s.kind)).toEqual(["brand_strategy", "logo", "mockups"]);
    // Pistes de logo très faibles → abandon ; maquettes non lancées.
    expect(plan.steps.map((s) => s.status)).toEqual(["done", "rejected", "skipped"]);
    expect(plan.steps[1].reason).toMatch(/score 3 below floor 6.5: abandon direction/);
  });

  it("RETRY corrigeable : correction faite DANS le moteur (historique transmis au routeur), le plan ne relance pas tout (aucune dépense double)", async () => {
    const engine = vi.fn(async (ctx: any) => {
      check(ctx, "logo_route", 7.4, 0);
      // Reprise ciblée du candidat par le moteur : le routeur reçoit note, verdict, tentative et modèle précédents.
      await withCandidate("route-concept", 0, () => llmText({ task: "logo_symbol", userId: u.id, projectId: sbId, jobId: ctx.job.id, system: "S", prompt: "P0" }));
      saveCheck(decide("logo_route", { checker: "ai", score: 7.4, criteria: crit("logo_route"), issues: ["symbole trop générique"] }, { attempt: 0 }), { userId: u.id, projectId: sbId, jobId: ctx.job.id, candidateId: "route-concept" });
      await withCandidate("route-concept", 1, () => llmText({ task: "logo_symbol", userId: u.id, projectId: sbId, jobId: ctx.job.id, system: "S", prompt: "P1" }));
      // La relecture n'est jamais escaladée parce que le logo relu était faible.
      await withCandidate("route-concept", 1, () => llmText({ task: "quality_control", userId: u.id, projectId: sbId, jobId: ctx.job.id, system: "S", prompt: "R1" }));
      saveCheck(decide("logo_route", { checker: "ai", score: 7.7, criteria: crit("logo_route"), issues: ["contraste faible"] }, { attempt: 1 }), { userId: u.id, projectId: sbId, jobId: ctx.job.id, candidateId: "route-concept" });
      return { ok: true };
    });
    const ctx = job("brand.logo", { projectId: sbId, regenerate: true });
    await fr(() => ex.orchestrated("brand.logo", engine)(ctx));
    expect(engine).toHaveBeenCalledOnce();
    const rows = all<any>("SELECT task, attempt, routing_reason, routing_escalation, requested_model FROM ai_calls WHERE job_id = ? ORDER BY created_at, rowid", ctx.job.id);
    expect(rows[1]).toMatchObject({ task: "logo_symbol", attempt: 1, routing_reason: "previous attempt 7.4, targeted correction", requested_model: "claude-opus-5-5" });
    expect(rows[2]).toMatchObject({ task: "quality_control", routing_escalation: 0, requested_model: "claude-sonnet-5-5" });
    const step = planOf(ctx.job.id).steps[0];
    expect(step.status).toBe("done");
    expect(step.reason).toMatch(/done inside the engine; best kept|retries exhausted/);
  });

  it("FINAL → arrêt ; textes déjà FINAL dans un parcours composite → pas réécrits ; demande explicite → exécutée", async () => {
    const sb = loadProject(sbId);
    run("INSERT INTO quality_checks (id, created_at, user_id, project_id, deliverable, attempt, checker, checked, verdict, action, policy_version, score) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", `qc-copy-${Date.now()}`, Date.now(), u.id, sbId, "copy_shop", 0, "ai", 1, "FINAL", "none", "t", 8.4);
    expect(fr(() => orch.projectState(sb)).copyFinal).toBe(true);
    // Création complète (brand gardée) : textes FINAL non réécrits.
    const ctx = job("pipeline.run", { projectId: sbId, mode: "autopilot", input: {} });
    const pp = fr(() => ex.pipelinePlan(ctx, sb, {}));
    expect(pp.skipped("brand")).toBe("brand");
    expect(pp.skipped("copy")).toBe("copy");
    // Bouton « Rédiger les textes » : explicite → exécuté malgré une version FINAL.
    const engine = vi.fn(async (c: any) => (check(c, "copy_shop", 8.2), { done: true }));
    const c2 = job("copy.build", { projectId: sbId });
    await fr(() => ex.orchestrated("copy.build", engine)(c2));
    expect(engine).toHaveBeenCalledOnce();
    expect(planOf(c2.job.id).steps[0]).toMatchObject({ kind: "copy", status: "done" });
  });

  it("pipeline.run : une marque existante n'est pas refaite (sauf relance expresse depuis « marque ») ; l'analyse reste faite", () => {
    const sb = loadProject(sbId);
    const a = fr(() => ex.pipelinePlan(job("pipeline.run", { projectId: sbId }), sb, {}));
    expect(a.plan.intents).toEqual(["ANALYZE_PRODUCT", "CREATE_BRAND", "CREATE_SHOP", "CREATE_VIDEO", "SOCIAL", "ORGANIZE_FILES"]);
    expect(a.plan.steps.map((s) => s.kind)).toEqual(["understand", "brand_strategy", "image_generate", "copy", "theme", "video", "social", "organize"]);
    expect(a.skipped("brand")).toBe("brand");
    expect(a.skipped("analysis")).toBeNull();
    expect(a.plan.steps.find((s) => s.kind === "brand_strategy")!.reason).toBe("brand already exists");
    const b = fr(() => ex.pipelinePlan(job("pipeline.run", { projectId: sbId, from: "brand" }), sb, { from: "brand" }));
    expect(b.skipped("brand")).toBeNull();
    expect(b.skipped("copy")).toBeNull(); // marque refaite → textes refaits aussi
    // Nouveau projet sans marque : tout est fait.
    const fresh = { ...sb, brand: null, strategy: null } as any;
    expect(fr(() => ex.pipelinePlan(job("pipeline.run", { projectId: sbId }), fresh, {})).skipped("brand")).toBeNull();
  });

  it("stock avant image IA : photo libre FINALE → aucune image générée ; image demandée expressément → génération directe", async () => {
    const [, , , d] = await fr(() => allScenarios(fresh()));
    expect(d.plan).toEqual(["stock_search"]);
    const p = orch.buildPlan({ projectId: sbId, userId: u.id, requestKey: "s1", intents: ["GENERATE_IMAGE"], state: fr(() => orch.projectState(loadProject(sbId))) });
    orch.applyResult(p, "stock_search", { verdict: "FINAL", score: 8 });
    expect(p.steps.find((s) => s.kind === "image_generate")!.status).toBe("skipped");
    expect(ex.explicitGeneration("Génère une image de bannière")).toBe(true);
    expect(ex.explicitGeneration("Trouve-moi une photo")).toBe(false);
    const forced = orch.buildPlan({ projectId: sbId, userId: u.id, requestKey: "s2", intents: ["GENERATE_IMAGE"], state: fr(() => orch.projectState(loadProject(sbId))), forceGenerate: true });
    expect(forced.steps.map((s) => s.kind)).toEqual(["image_generate"]);
    // Bouton « Créer les images » : génération expresse, pas de recherche imposée.
    const ctx = job("images.generate", { projectId: serumId });
    await fr(() => ex.orchestrated("images.generate", async () => ({ created: [] }))(ctx));
    expect(planOf(ctx.job.id, serumId).steps.map((s) => s.kind)).toEqual(["image_generate"]);
  });

  // ------------------------------------------------------------------ routage média

  it("routage média réellement utilisé : fournisseur capable, route de l'administration respectée, repli capable", async () => {
    const mp = await import("@/lib/ai/media-providers");
    expect(fr(() => mp.imageProviderAvailable())).toBe("openai");
    keys.openai = null;
    expect(fr(() => mp.imageProviderAvailable())).toBe("google");
    expect(fr(() => mp.routeMedia("image_generation"))).toMatchObject({ provider: "google", fallback: true });
    // Retouche par masque autour du produit réel : sans OpenAI, aucun repli dégradé.
    expect(fr(() => mp.routeMedia("image_generation", "mask"))).toBeNull();
    keys.google = null;
    expect(fr(() => mp.videoProviderAvailable())).toBeNull();
    keys.fal = "fal-key-test-123456";
    expect(fr(() => mp.videoProviderAvailable())).toBe("fal");
    keys = { ...keys, openai: "sk-openai-test-123456", google: "cle-google-test-123456" };
    setSetting("ai.routes", JSON.stringify({ image_generation: { provider: "google", model: "gemini-2.5-flash-image" } }));
    expect(fr(() => mp.imageProviderAvailable())).toBe("google");
    setSetting("ai.routes", "{}");
    expect(fr(() => mp.videoProviderAvailable())).toBe("google");
  });

  it("repli d'image tracé (raison, repli) et soumis à la même barrière de qualité", async () => {
    keys.openai = null;
    const mp = await import("@/lib/ai/media-providers");
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    fetchImpl = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: png } }] } }] }), { status: 200 });
    await fr(() => mp.geminiPlate({ userId: u.id, projectId: serumId, usageKey: `fb-${Date.now()}` }, { prompt: "set", aspect: "1:1" }));
    fetchImpl = async () => new Response("{}");
    expect(one<any>("SELECT provider, routing_fallback, routing_reason FROM ai_calls WHERE project_id = ? AND task = 'image_generation' ORDER BY created_at DESC, rowid DESC LIMIT 1", serumId)).toEqual({ provider: "google", routing_fallback: 1, routing_reason: "fallback: openai unavailable → google:gemini-2.5-flash-image (same quality gate)" });
    const [, , , , e] = await fr(() => allScenarios(fresh()));
    expect(e.routing[0]).toMatchObject({ step: "image_generate", provider: "google", fallback: true });
    expect(e.quality.find((q) => q.step === "image_generate")!.status).toBe("rejected"); // le repli n'abaisse jamais la barrière
  });

  // ------------------------------------------------------------------ idempotence

  it("reprise : une étape terminée n'est jamais relancée ni repayée (point de reprise de la tâche + plan enregistré)", async () => {
    const engine = vi.fn(async (c: any) => (check(c, "copy_shop", 8.3), { copy: 1 }));
    const ctx = job("copy.build", { projectId: sbId });
    const h = ex.orchestrated("copy.build", engine);
    const first = await fr(() => h(ctx));
    // La tâche est relancée (redémarrage du serveur après l'étape) : même tâche, même plan, aucun nouvel appel.
    const again = await fr(() => h(new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", ctx.job.id))));
    expect(engine).toHaveBeenCalledOnce();
    expect(again).toEqual(first);
    expect(all("SELECT id FROM task_plans WHERE request_key = ?", `job:${ctx.job.id}`)).toHaveLength(1);
    // Interruption au milieu d'un plan complet (scénario F) : aucune étape terminée relancée.
    const f = (await fr(() => allScenarios(fresh())))[5];
    for (const k of ["brand_strategy", "stock_search"]) expect(f.executions[k], k).toBe(1);
    expect(f.executions.copy).toBe(1);
  });

  // ------------------------------------------------------------------ intentions et plans libres

  it("pas de sur-orchestration : « Refais ce logo » → étape logo seule ; « pour ma boutique » n'est pas une boutique à créer", () => {
    for (const [t, want] of [
      ["Refais ce logo", ["logo"]],
      ["Améliore uniquement mon logo", ["logo"]],
      ["Génère une image de bannière pour ma boutique", ["stock_search", "image_generate"]],
      ["Écris un article de blog pour mon site", ["blog"]],
    ] as const) {
      const r = orch.intentsFromRules(t);
      const p = orch.buildPlan({ projectId: sbId, userId: u.id, requestKey: t, intents: r.intents, state: fr(() => orch.projectState(loadProject(sbId))) });
      expect(p.steps.map((s) => s.kind), t).toEqual(want);
    }
  });

  it("demande libre (tâche plan.run) : projet pas encore analysé → confiée à la création complète, jamais deux moteurs en parallèle", async () => {
    const fresh = fr(() => seedSebastienBlanc(u.id));
    run("UPDATE projects SET product_json = ? WHERE id = ?", JSON.stringify({ ...loadProject(fresh).product, name: "", facts: [], summary: "" }), fresh);
    const ctx = job("plan.run", { projectId: fresh, text: "Crée ma boutique" });
    const r = await fr(() => ex.runRequestPlan(ctx));
    expect(r.delegated).toBe("pipeline.run");
    expect(r.plan!.status).toBe("stopped");
  });

  it("benchmarks déterministes A–F : intention, plan, étapes exécutées et sautées, routage, qualité, repli, coût", async () => {
    const [a, b, c, d, e, f] = await fr(() => allScenarios(fresh()));
    expect(a.intent.intents).toEqual(["CREATE_BRAND", "CREATE_SHOP"]);
    expect(a.skipped.map((s) => s.step)).toEqual(["understand", "image_generate"]);
    expect(a.routing.find((x) => x.step === "brand_strategy")).toMatchObject({ model: "claude-opus-5-5", reason: "complex creative direction" });
    // Phase 5A : la famille du produit est comprise, plus d'avertissement de repli générique.
    expect(b.warnings.join()).not.toMatch(/GENERIC/);
    expect(b.executed).toContain("image_generate");
    expect(b.routing.find((x) => x.step === "copy")).toMatchObject({ model: "claude-opus-5-5", escalation: true });
    expect(c.plan).toEqual(["logo"]);
    expect(c.routing[0].reason).toBe("previous attempt 7.8, targeted correction");
    expect(d).toMatchObject({ plan: ["stock_search"], fallback: false, costClasses: { stock_search: "free" } });
    expect(e.plan).toEqual(["image_generate"]);
    expect(e.fallback).toBe(true);
    expect(f.quality.every((q) => q.status !== "pending")).toBe(true);
  });
});
