/**
 * Phase 3A — Intent Engine, Task Planner, Router V2 (tout est simulé : aucun appel payant).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as o from "@/lib/orchestrator";

const sent: any[] = [];
let reply = "ok";
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      sent.push(params);
      const p = Promise.resolve({ model: params.model, stop_reason: "end_turn", content: [{ type: "text", text: reply }], usage: { input_tokens: 10, output_tokens: 5 } });
      return { finalMessage: () => p };
    }
    messages = { stream: (p: any) => this.stream(p) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "anthropic" ? "sk-ant-test-1234567890abcdef" : null) }));

beforeEach(() => {
  sent.length = 0;
  reply = "ok";
  vi.stubGlobal("fetch", async () => new Response("{}"));
});
afterEach(() => vi.unstubAllGlobals());

describe("Phase 3A — intention, plan, routeur", async () => {
  const { createUser } = await import("@/lib/auth");
  const { one, run, all } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { setSetting } = await import("@/lib/settings");
  const o = await import("@/lib/orchestrator");
  const { DEFAULT_ROUTES } = await import("@/lib/ai/config");
  const { routeLlm, llmText } = await import("@/lib/ai/llm");
  const { ENGINE_SCOPES } = await import("@/lib/brain/measure");
  const { POLICIES } = await import("@/lib/quality/policies");
  const { seedSebastienBlanc, seedSerumEclat } = await import("./brain-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`orch3a${Date.now()}@test.fr`, "motdepasse-test", "O");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
  syncAllowance(u.id);
  const sbId = fr(() => seedSebastienBlanc(u.id));
  const serumId = fr(() => seedSerumEclat(u.id));
  const env = { aiActive: true, available: (p: string) => p === "anthropic" || p === "openai" || p === "google" };
  const fresh: o.ProjectState = { analyzed: false, brandReady: false, logoLocked: false, copyFinal: false, genericTrade: false };
  const plan = (intents: o.Intent[], state: Partial<o.ProjectState> = {}, key = `k${Math.random()}`) => o.buildPlan({ projectId: sbId, userId: u.id, requestKey: key, intents, state: { ...fresh, ...state } });
  const step = (p: o.TaskPlan, kind: o.StepKind) => p.steps.find((s) => s.kind === kind)!;

  // ------------------------------------------------------------------ intention

  it("action déterministe → intention sans aucun appel à l'IA (bouton, tâche de fond, route)", async () => {
    const classify = vi.fn();
    for (const [action, want] of [["brand.fulllogo", ["CREATE_LOGO"]], ["logo.create", ["CREATE_LOGO"]], ["blog.generate", ["BLOG"]], ["shop.chat", ["EDIT_THEME"]], ["ads.draft", ["CREATE_AD"]], ["pipeline.run", ["ANALYZE_PRODUCT", "CREATE_BRAND", "CREATE_SHOP", "CREATE_VIDEO", "SOCIAL", "ORGANIZE_FILES"]]] as const) {
      const r = await o.understand({ action }, { aiActive: true, classify });
      expect(r, action).toMatchObject({ intents: want, source: "action", confidence: 1 });
    }
    expect((await o.understand({ action: "brand.logo", payload: { regenerate: true } }, { aiActive: true, classify })).intents).toEqual(["CREATE_LOGO"]);
    expect((await o.understand({ action: "brand.logo" }, { aiActive: true, classify })).intents).toEqual(["IMPROVE_LOGO"]);
    expect(classify).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it("demande libre claire → règles, intentions combinées, sans IA", async () => {
    const classify = vi.fn();
    const r = await o.understand({ text: "Crée ma marque et ma boutique" }, { aiActive: true, classify });
    expect(r).toMatchObject({ intents: ["CREATE_BRAND", "CREATE_SHOP"], source: "rules" });
    expect((await o.understand({ text: "Améliore mon logo, il est trop chargé" }, { aiActive: true, classify })).intents).toEqual(["IMPROVE_LOGO"]);
    expect((await o.understand({ text: "Trouve une photo libre de droits d'un chantier" }, { aiActive: true, classify })).intents).toEqual(["FIND_STOCK_IMAGE"]);
    expect((await o.understand({ text: "Write a blog post and 3 Instagram posts" }, { aiActive: true, classify })).intents).toEqual(["BLOG", "SOCIAL"]);
    expect(classify).not.toHaveBeenCalled();
  });

  it("demande libre ambiguë → classement structuré par l'IA (sortie validée) ; sans IA active → question, aucun appel", async () => {
    const classify = vi.fn(async () => ({ intents: ["SOCIAL" as const], confidence: 0.8 }));
    const r = await o.understand({ text: "fais quelque chose pour mon lancement" }, { aiActive: true, classify });
    expect(classify).toHaveBeenCalledOnce();
    expect(r).toMatchObject({ intents: ["SOCIAL"], source: "ai" });
    const off = vi.fn();
    const d = await o.understand({ text: "fais quelque chose pour mon lancement" }, { aiActive: false, classify: off });
    expect(off).not.toHaveBeenCalled();
    expect(d.intents).toEqual([]);
    expect(d.clarification).toMatch(/Que souhaitez-vous faire/);
    // Classement réel (fournisseur simulé) : schéma validé, intention inconnue rejetée, tracé « intent ».
    reply = JSON.stringify({ intents: ["CREATE_AD", "PAS_UNE_INTENTION"], confidence: 0.9 });
    const real = await fr(() => o.understand({ text: "boost mes ventes" }, { aiActive: true, classify: o.aiIntentClassifier({ userId: u.id, projectId: sbId }) }));
    expect(real.source).toBe("ai");
    expect(real.intents).toEqual([]); // sortie non conforme → rien de deviné, question posée
    reply = JSON.stringify({ intents: ["CREATE_AD"], confidence: 0.9 });
    expect((await fr(() => o.understand({ text: "boost mes ventes" }, { aiActive: true, classify: o.aiIntentClassifier({ userId: u.id, projectId: sbId }) }))).intents).toEqual(["CREATE_AD"]);
    expect(sent.at(-1).model).toBe("claude-haiku-4-5");
    expect(one<any>("SELECT task, prompt_key FROM ai_calls WHERE project_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", sbId)).toEqual({ task: "classification", prompt_key: "intent" });
  });

  // ------------------------------------------------------------------ plan

  it("plan avec dépendances : marque + boutique = comprendre, stratégie, logo, maquettes, photos libres, image, textes, thème, relecture", () => {
    const p = plan(["CREATE_BRAND", "CREATE_SHOP"]);
    expect(p.steps.map((s) => s.kind)).toEqual(["understand", "brand_strategy", "logo", "mockups", "stock_search", "image_generate", "copy", "theme", "quality_review"]);
    expect(step(p, "logo").dependencies).toEqual(["brand_strategy"]);
    expect(step(p, "mockups").dependencies).toEqual(["logo"]);
    expect(step(p, "image_generate").after).toEqual(["stock_search"]);
    expect(step(p, "theme").dependencies).toEqual(["copy"]);
    expect(step(p, "theme").after).toEqual(["logo", "image_generate", "stock_search"]);
    for (const s of p.steps) for (const k of ["id", "task", "dependencies", "input", "requiredContext", "qualityTarget", "costClass", "status"]) expect(s, `${s.kind}.${k}`).toHaveProperty(k);
    expect(step(p, "logo")).toMatchObject({ task: "logo_symbol", requiredContext: "logo", qualityTarget: POLICIES.logo_route.final, costClass: "high" });
    expect(step(p, "stock_search")).toMatchObject({ task: "search", costClass: "free" });
    expect(o.readySteps(p).map((s) => s.kind)).toEqual(["understand"]);
    // Même demande → même plan (identifiant stable).
    expect(plan(["CREATE_BRAND"], {}, "même").id).toBe(plan(["CREATE_BRAND"], {}, "même").id);
  });

  it("étapes inutiles sautées : déjà analysé, marque existante, logo verrouillé, textes FINAL — sauf demande explicite", () => {
    const p = plan(["CREATE_BRAND", "CREATE_SHOP"], { analyzed: true, brandReady: true, logoLocked: true, copyFinal: true });
    for (const k of ["understand", "logo", "copy"] as const) expect(step(p, k).status, k).toBe("skipped");
    expect(step(p, "copy").reason).toMatch(/copy already FINAL/);
    expect(step(p, "logo").reason).toMatch(/logo validated by the client \(locked\)/);
    // « Crée ma marque » est explicite : la stratégie de marque est refaite même si une marque existe.
    expect(step(p, "brand_strategy").status).toBe("pending");
    // Boutique seule sur une marque existante : aucune étape de marque.
    expect(plan(["CREATE_SHOP"], { analyzed: true, brandReady: true }).steps.map((s) => [s.kind, s.status])).toEqual([["understand", "skipped"], ["stock_search", "pending"], ["image_generate", "pending"], ["copy", "pending"], ["theme", "pending"], ["quality_review", "pending"]]);
    // Demande explicite de textes : jamais sautée parce qu'une version existe.
    expect(step(plan(["WRITE_PRODUCT_COPY"], { copyFinal: true }), "copy").status).toBe("pending");
    // Une seule production : pas de relecture finale.
    expect(plan(["BLOG"]).steps.map((s) => s.kind)).toEqual(["blog"]);
  });

  it("photo libre FINAL → aucune image IA générée ; photo libre insuffisante → génération", () => {
    const a = plan(["GENERATE_IMAGE"]);
    o.applyResult(a, "stock_search", { verdict: "FINAL", score: 8.5 });
    expect(step(a, "image_generate")).toMatchObject({ status: "skipped", reason: "stock photo FINAL: no AI image needed" });
    const b = plan(["GENERATE_IMAGE"]);
    o.applyResult(b, "stock_search", { verdict: "REJECTED", score: 4 });
    expect(step(b, "image_generate").status).toBe("pending");
    expect(o.readySteps(b).map((s) => s.kind)).toEqual(["image_generate"]);
  });

  it("FINAL → aucune reprise ; REJECTED faible → abandon, maquettes non lancées, le thème continue (logo provisoire)", () => {
    const p = plan(["CREATE_BRAND", "CREATE_SHOP"], { analyzed: true, brandReady: true });
    o.applyResult(p, "logo", { verdict: "REJECTED", score: 3 });
    expect(step(p, "logo")).toMatchObject({ status: "rejected" });
    expect(step(p, "logo").reason).toMatch(/score 3 below floor 6.5: abandon direction/);
    expect(step(p, "mockups")).toMatchObject({ status: "skipped" });
    const q = plan(["CREATE_LOGO"]);
    o.applyResult(q, "logo", { verdict: "FINAL", score: 8.6 });
    expect(step(q, "logo")).toMatchObject({ status: "done", attempts: 1 });
    expect(step(q, "logo").reason).toMatch(/final at 8.6.*no retry/);
    expect(q.status).toBe("done");
    // Défaut fatal : abandon même avec une bonne note.
    const f = plan(["CREATE_LOGO"]);
    o.applyResult(f, "logo", { verdict: "REJECTED", score: 8.4, fatal: true, fatalCodes: ["resembles_known_brand"] });
    expect(step(f, "logo").reason).toMatch(/fatal defect \(resembles_known_brand\)/);
  });

  it("RETRY corrigeable → correction ciblée (logo, même modèle fort) ; textes → escalade standard → fort ; reprises épuisées → meilleure version gardée", async () => {
    const p = plan(["CREATE_LOGO"]);
    const seen: o.RouteDecision[] = [];
    const results: o.StepResult[] = [{ verdict: "RETRY", score: 7.8 }, { verdict: "FINAL", score: 8.4 }];
    await o.runPlan(p, async (_s, d) => (seen.push(d), results.shift()!), env);
    expect(seen.map((d) => d.model)).toEqual(["claude-opus-5-5", "claude-opus-5-5"]);
    expect(seen[1]).toMatchObject({ escalation: false, reason: "previous attempt 7.8, targeted correction" });
    expect(step(p, "logo")).toMatchObject({ status: "done", attempts: 2 });
    const c = plan(["WRITE_PRODUCT_COPY"]);
    const cs: o.RouteDecision[] = [];
    const cr: o.StepResult[] = [{ verdict: "RETRY", score: 7.2 }, { verdict: "RETRY", score: 7.6 }, { verdict: "RETRY", score: 7.7 }];
    await o.runPlan(c, async (_s, d) => (cs.push(d), cr.shift()!), env);
    expect(cs.map((d) => d.model)).toEqual(["claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5-5"]);
    expect(cs[1]).toMatchObject({ escalation: true });
    expect(cs[1].reason).toMatch(/previous attempt 7.2 below target 8 at standard tier, escalate to strong/);
    expect(step(c, "copy")).toMatchObject({ status: "done" });
    expect(step(c, "copy").reason).toMatch(/retries exhausted/);
  });

  // ------------------------------------------------------------------ routeur

  it("tâche simple → modèle approprié ; créative complexe → modèle fort d'emblée ; sans IA (Découverte) → moteur local", () => {
    expect(o.route({ task: "classification", ...env })).toMatchObject({ mode: "llm", model: "claude-haiku-4-5" });
    expect(o.route({ task: "classification", difficulty: "simple", ...env })).toMatchObject({ mode: "local", reason: "deterministic local task" });
    expect(o.route({ task: "theme_edit", difficulty: "simple", ...env })).toMatchObject({ mode: "local" });
    expect(o.route({ task: "quality_control", ...env })).toMatchObject({ model: "claude-sonnet-5-5", effort: "low" });
    expect(o.route({ task: "logo_symbol", ...env })).toMatchObject({ model: "claude-opus-5-5", reason: "complex creative direction" });
    expect(o.route({ task: "strategy", ...env })).toMatchObject({ model: "claude-opus-5-5", effort: "high" });
    // Demande complexe d'une tâche standard : directement le niveau fort, pas d'essai faible d'abord.
    expect(o.route({ task: "copywriting", difficulty: "complex", ...env })).toMatchObject({ model: "claude-opus-5-5", escalation: false, reason: "complex request: strongest permitted model directly" });
    expect(o.route({ task: "logo_symbol", aiActive: false, available: env.available })).toMatchObject({ mode: "local", reason: "AI not active for this account: local engine" });
    expect(o.route({ task: "photo_triage", inputType: "image", ...env })).toMatchObject({ model: "claude-haiku-4-5" });
  });

  it("aucun cheap-first aveugle : routage par défaut identique à celui d'avant ; un coût observé plus bas ne fait pas descendre de niveau", () => {
    const before: Record<string, [string, string, string?]> = {
      vision_analysis: ["anthropic", "claude-opus-5-5", "medium"], strategy: ["anthropic", "claude-opus-5-5", "high"], copywriting: ["anthropic", "claude-sonnet-5-5", "high"],
      theme_design: ["anthropic", "claude-opus-5-5", "high"], theme_edit: ["anthropic", "claude-opus-5-5", "medium"], theme_custom: ["anthropic", "claude-opus-5-5", "high"],
      quality_control: ["anthropic", "claude-sonnet-5-5", "low"], photo_triage: ["anthropic", "claude-haiku-4-5"], cutout_check: ["anthropic", "claude-sonnet-5-5", "low"],
      logo_symbol: ["anthropic", "claude-opus-5-5", "medium"], social_planning: ["anthropic", "claude-opus-5-5", "medium"], social_copy: ["anthropic", "claude-sonnet-5-5", "medium"],
      classification: ["anthropic", "claude-haiku-4-5"], video_direction: ["anthropic", "claude-opus-5-5", "medium"], art_direction: ["anthropic", "claude-opus-5-5", "medium"],
      ad_creative: ["anthropic", "claude-opus-5-5", "medium"], blog_topics: ["anthropic", "claude-sonnet-5-5", "low"], blog_writing: ["anthropic", "claude-sonnet-5-5", "medium"],
      image_generation: ["openai", "gpt-image-1"], video_generation: ["google", "veo-3.0-generate-001"],
    };
    for (const [t, [provider, model, effort]] of Object.entries(before)) {
      expect(DEFAULT_ROUTES[t as keyof typeof DEFAULT_ROUTES], t).toEqual({ provider, model, ...(effort ? { effort } : {}) });
      if (provider === "anthropic") expect(routeLlm({ task: t as any }), t).toMatchObject({ provider, model, effort, escalation: false, fallback: false });
    }
    // Historique de coûts : le léger paraît bien moins cher pour la création de logo ; le routeur garde le niveau fort.
    for (let i = 0; i < 5; i++) run("INSERT INTO ai_calls (id, created_at, user_id, task, provider, requested_model, unit, cost, status) VALUES (?,?,?,?,?,?,?,?,?)", `c${i}${Date.now()}`, Date.now(), u.id, "logo_symbol", "anthropic", "claude-haiku-4-5", "tokens", 10, "ok");
    expect(o.route({ task: "logo_symbol", ...env }).model).toBe("claude-opus-5-5");
  });

  it("fournisseur indisponible → repli capable, MÊME objectif de qualité ; aucun capable → étape non faite (rien de médiocre accepté)", async () => {
    const noOpenai = { aiActive: true, available: (p: string) => p === "google" || p === "anthropic" };
    const d = o.route({ task: "image_generation", deliverable: "image_lifestyle", ...noOpenai });
    expect(d).toMatchObject({ mode: "image", provider: "google", model: "gemini-2.5-flash-image", fallback: true, qualityTarget: POLICIES.image_lifestyle.final });
    expect(d.reason).toMatch(/fallback: openai unavailable → google:gemini-2.5-flash-image \(same quality gate\)/);
    // Retouche par masque autour du produit réel : seul OpenAI sait le faire → pas de repli dégradé.
    expect(o.route({ task: "image_generation", inputType: "mask", ...noOpenai })).toMatchObject({ mode: "none", provider: "none" });
    // Plan : panne du fournisseur → rien n'est accepté, repli à la tentative suivante, barrière normale.
    const p = plan(["GENERATE_IMAGE"]);
    o.applyResult(p, "stock_search", { verdict: "REJECTED", score: 3 });
    const seen: o.RouteDecision[] = [];
    const results: o.StepResult[] = [{ providerError: true }, { verdict: "REJECTED", score: 4 }];
    await o.runPlan(p, async (_s, dd) => (seen.push(dd), results.shift()!), env);
    expect(seen[0]).toMatchObject({ provider: "openai", fallback: false });
    expect(seen[1]).toMatchObject({ provider: "google", fallback: true, qualityTarget: POLICIES.image_lifestyle.final });
    expect(seen[1].reason).toMatch(/openai:gpt-image-1 failed/);
    expect(step(p, "image_generate").status).toBe("rejected"); // le repli passe la même barrière : refusé, pas accepté
    // Deux pannes : l'étape échoue, rien n'est gardé.
    const q = plan(["GENERATE_IMAGE"]);
    o.applyResult(q, "stock_search", { verdict: "REJECTED", score: 3 });
    await o.runPlan(q, async () => ({ providerError: true }), env);
    expect(step(q, "image_generate")).toMatchObject({ status: "failed", reason: "provider unavailable twice: step failed, nothing accepted" });
  });

  it("politique centrale réglable sans toucher aux moteurs ; route de l'administration respectée", () => {
    setSetting("ai.policy", JSON.stringify({ social_copy: { tier: "strong" } }));
    expect(o.route({ task: "social_copy", ...env }).model).toBe("claude-opus-5-5");
    setSetting("ai.policy", "{}");
    expect(o.route({ task: "social_copy", ...env }).model).toBe("claude-sonnet-5-5");
    setSetting("ai.routes", JSON.stringify({ blog_writing: { model: "claude-opus-5-5", effort: "high" } }));
    expect(routeLlm({ task: "blog_writing" })).toMatchObject({ model: "claude-opus-5-5", effort: "high" });
    expect(routeLlm({ task: "blog_writing" }).reason).toMatch(/^admin route/);
    setSetting("ai.routes", "{}");
  });

  // ------------------------------------------------------------------ Brain, trace, reprise

  it("chaque étape lit le scope du Project Brain de son moteur (aucun contexte reconstruit)", () => {
    const p = plan(["CREATE_BRAND", "CREATE_SHOP", "SEO", "BLOG", "SOCIAL", "CREATE_AD", "CREATE_VIDEO"]);
    const scopeOf = Object.fromEntries(ENGINE_SCOPES.map((e) => [e.engine, e.scope]));
    const map: Partial<Record<o.StepKind, string>> = { logo: "logo", stock_search: "stock", image_generate: "image", copy: "shop_copy", seo: "seo", theme: "theme", blog: "blog", social: "social", ad: "advertising", video: "video", quality_review: "qc", brand_strategy: "brand" };
    for (const [k, engine] of Object.entries(map)) expect(step(p, k as o.StepKind).requiredContext, k).toBe(scopeOf[engine]);
    const sb = loadProject(sbId);
    const ctx = fr(() => o.stepContext(sb, step(p, "logo")));
    expect(ctx.startsWith('<contexte_projet scope="logo">')).toBe(true);
  });

  it("limitation visible : produit au métier générique → avertissement dans le plan des visuels", () => {
    const st = fr(() => o.projectState(loadProject(serumId)));
    expect(st.genericTrade).toBe(true);
    const p = o.buildPlan({ projectId: serumId, userId: u.id, requestKey: "w", intents: ["GENERATE_IMAGE"], state: st });
    expect(p.warnings.join(" ")).toMatch(/GENERIC trade fallback \(Phase 2 limitation\)/);
    expect(fr(() => o.projectState(loadProject(sbId))).genericTrade).toBe(false);
  });

  it("trace : intention, plan, étape et raison du routage enregistrées sur chaque appel ; aucune pensée détaillée", async () => {
    const p = o.buildPlan({ projectId: sbId, userId: u.id, requestKey: `trace${Date.now()}`, intents: ["WRITE_PRODUCT_COPY"], state: fresh });
    await fr(() => o.runPlan(p, async (s) => (await llmText({ task: "copywriting", userId: u.id, projectId: sbId, system: "S", prompt: "P" }), { verdict: "FINAL", score: 8.5 }), env));
    const row = one<any>("SELECT intent, plan_id, step_id, routing_reason, routing_fallback, routing_escalation, requested_model FROM ai_calls WHERE project_id = ? AND task = 'copywriting' ORDER BY created_at DESC, rowid DESC LIMIT 1", sbId);
    expect(row).toEqual({ intent: "WRITE_PRODUCT_COPY", plan_id: p.id, step_id: "copy", routing_reason: "sales copy, high effort", routing_fallback: 0, routing_escalation: 0, requested_model: "claude-sonnet-5-5" });
    // Escalade explicite sur un appel : tracée.
    await fr(() => llmText({ task: "copywriting", userId: u.id, projectId: sbId, system: "S", prompt: "P", routing: { deliverable: "copy_shop", history: { attempt: 1, lastScore: 7.1, lastVerdict: "RETRY", lastProvider: "anthropic", lastModel: "claude-sonnet-5-5", failure: "quality" } } }));
    expect(sent.at(-1).model).toBe("claude-opus-5-5");
    expect(one<any>("SELECT routing_reason, routing_escalation FROM ai_calls WHERE project_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", sbId)).toEqual({ routing_reason: "previous attempt 7.1 below target 8 at standard tier, escalate to strong", routing_escalation: 1 });
    // Le plan enregistré ne contient ni prompt ni contenu : statuts, routage et raisons synthétiques.
    const saved = one<any>("SELECT steps_json FROM task_plans WHERE id = ?", p.id).steps_json;
    expect(saved).not.toContain('"S"');
    expect(JSON.parse(saved)[0].route).toMatchObject({ provider: "anthropic", model: "claude-sonnet-5-5", reason: "sales copy, high effort" });
  });

  it("reprise idempotente : une interruption puis une reprise ne refont (ni ne repaient) aucune étape faite", async () => {
    const key = `reprise${Date.now()}`;
    const a = { projectId: sbId, userId: u.id, requestKey: key, intents: ["CREATE_BRAND", "CREATE_SHOP"] as o.Intent[], state: { ...fresh, analyzed: true } };
    const first = o.loadOrCreatePlan(a);
    const done1: string[] = [];
    await expect(
      o.runPlan(first, async (s) => {
        if (s.kind === "copy") throw new Error("interruption (redémarrage du serveur)");
        done1.push(s.kind);
        return s.deliverable ? { verdict: "FINAL", score: 8.2 } : { note: "ok" };
      }, env),
    ).rejects.toThrow(/interruption/);
    const resumed = o.loadOrCreatePlan(a);
    expect(resumed.id).toBe(first.id);
    const done2: string[] = [];
    await o.runPlan(resumed, async (s) => (done2.push(s.kind), s.deliverable ? { verdict: "FINAL", score: 8.2 } : { note: "ok" }), env);
    for (const k of done1) expect(done2, k).not.toContain(k);
    expect(done2).toContain("copy");
    expect(resumed.status).toBe("done");
    expect(all("SELECT id FROM task_plans WHERE id = ?", first.id)).toHaveLength(1);
  });

  it("replan : une nouvelle intention complète le plan, ce qui est fait reste fait", () => {
    const p = plan(["CREATE_LOGO"]);
    o.applyResult(p, "logo", { verdict: "FINAL", score: 8.3 });
    const r = o.replan(p, ["SOCIAL"], fresh);
    expect(step(r, "logo").status).toBe("done");
    expect(step(r, "social").status).toBe("pending");
    expect(r.status).toBe("active");
  });
});
