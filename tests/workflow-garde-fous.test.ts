/**
 * Demande unique (Phase 12A) — garde-fous corrigés après l'audit, avec une IA « active » simulée (aucun appel réel) :
 *  - refus de consentement : rien n'est lancé, aucune dépense ;
 *  - devis à 0 € : la demande tourne IA coupée (une étape annoncée gratuite ne devient jamais payante) ;
 *  - plafond respecté pendant les étapes (tous moteurs) ;
 *  - vidéo jamais approuvée d'office ;
 *  - blog inaccessible : étape non faite, la demande continue ;
 *  - étapes non exécutées jamais « faites » ; « Réessayer » reprend les étapes en échec sans refaire le reste.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const llm = { calls: 0 };
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      llm.calls++;
      const p = Promise.resolve({ model: params.model, stop_reason: "end_turn", content: [{ type: "text", text: "{}" }], usage: { input_tokens: 1000, output_tokens: 200 } });
      return { finalMessage: () => p };
    }
    messages = { stream: (p: any) => this.stream(p) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
// Seule la clé de texte est « configurée » : aucune génération d'image ni de vidéo ne peut partir.
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "anthropic" ? "sk-ant-test-1234567890abcdef" : null) }));
const video: { approve: boolean[] } = { approve: [] };
vi.mock("@/lib/video-v2/engine", async (orig) => ({
  ...(await orig<object>()),
  runVideoEngineV2: async (_ctx: unknown, _pid: string, o: { approveGeneration?: boolean }) => {
    video.approve.push(!!o.approveGeneration);
    return { videoAssetId: null };
  },
}));

beforeEach(() => {
  llm.calls = 0;
  vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 }));
});
afterEach(() => vi.unstubAllGlobals());

describe("demande unique : accord, plafond, statuts, Réessayer", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, one, run } = await import("@/lib/db");
  const { getSubscription, syncAllowance, alignPeriod, EUR } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { JobContext, getJob } = await import("@/lib/jobs");
  const { buildShopV2 } = await import("@/lib/theme-v2/engine");
  const { STEP_EXECUTORS } = await import("@/lib/orchestrator/execute");
  const wf = await import("@/lib/workflow");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const mkUser = async (plan: string | null) => {
    const u = await createUser(`gf${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", "G");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = ?, plan = ? WHERE user_id = ?", plan ? "active" : "none", plan, u.id);
    alignPeriod(u.id, Date.now());
    syncAllowance(u.id);
    return u;
  };
  const ctxOf = (jobId: string) => new JobContext(getJob(jobId)!);
  const spend = (uid: string) => ({
    calls: one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls WHERE user_id = ?", uid)!.n,
    reservations: one<{ n: number }>("SELECT COUNT(*) n FROM ai_reservations WHERE user_id = ?", uid)!.n,
  });
  const runOrFail = async (jobId: string) => {
    try {
      return await fr(() => wf.runWorkflow(ctxOf(jobId)));
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  const creer = await mkUser("creer");
  const shop = await seedThemeScenario(creer.id, "cosmetic");
  await fr(() => buildShopV2(null, shop));

  it("refus de consentement : devis payant non accepté → rien n'est lancé, aucun appel", async () => {
    const w = await fr(() => wf.prepareWorkflow(shop, creer.id, "Crée une campagne publicitaire", { aiActive: true }));
    expect(w.estimate.totalMicro).toBeGreaterThan(0);
    const before = spend(creer.id);
    expect(() => wf.startWorkflow(w.id, {})).toThrow(/acceptez le devis/);
    expect(() => wf.startWorkflow(w.id, { approveMicro: w.estimate.totalMicro - 1, capEur: 100 })).toThrow(/acceptez le devis/);
    expect(one("SELECT 1 FROM jobs WHERE type = 'workflow.run' AND payload LIKE ?", `%${w.id}%`)).toBeFalsy();
    expect(spend(creer.id)).toEqual(before);
    expect(llm.calls).toBe(0);
  });

  it("devis à 0 € (préparé sans IA) puis IA active à l'exécution : tout reste local, aucune réservation ni appel", async () => {
    const w = await fr(() => wf.prepareWorkflow(shop, creer.id, "Rédige les textes de ma boutique et la fiche produit", { aiActive: false }));
    expect(w.estimate.totalMicro).toBe(0);
    const s = wf.startWorkflow(w.id, {});
    const before = spend(creer.id);
    const r: any = await runOrFail(s.jobId!);
    expect(r.error).toBeUndefined();
    expect(spend(creer.id)).toEqual(before);
    expect(llm.calls).toBe(0);
  }, 120_000);

  it("vidéo : jamais approuvée d'office sans accord payant", async () => {
    video.approve.length = 0;
    const w = await fr(() => wf.prepareWorkflow(shop, creer.id, "Crée une vidéo de présentation de mon produit", { aiActive: false }));
    const s = wf.startWorkflow(w.id, {});
    await runOrFail(s.jobId!);
    expect(video.approve.length).toBeGreaterThan(0);
    expect(video.approve.every((a) => a === false)).toBe(true);
  }, 120_000);

  it("blog inaccessible (forfait Créer) : étape non faite avec sa raison, la demande continue et aboutit", async () => {
    const w = await fr(() => wf.prepareWorkflow(shop, creer.id, "Écris un article de blog et exporte ma boutique Shopify", { aiActive: false }));
    const blogLine = w.estimate.lines.find((l) => l.kind === "blog")!;
    expect(blogLine.mode).toBe("skip");
    expect(blogLine.note).toMatch(/blog/i);
    const s = wf.startWorkflow(w.id, {});
    const r: any = await runOrFail(s.jobId!);
    expect(r.error).toBeUndefined();
    const steps = Object.fromEntries(r.steps.map((x: any) => [x.kind, x]));
    expect(steps.blog.status).toBe("skipped");
    expect(steps.cms_export.status).toBe("done");
    expect(wf.loadWorkflow(w.id)!.status).toBe("done");
  }, 120_000);

  it("étapes sans moteur : non incluses au devis et jamais affichées comme faites", async () => {
    const w = await fr(() => wf.prepareWorkflow(shop, creer.id, "Crée une campagne publicitaire et rédige la fiche produit", { aiActive: false }));
    const qr = w.estimate.lines.find((l) => l.kind === "quality_review");
    if (qr) expect([qr.mode, qr.estimateMicro]).toEqual(["skip", 0]);
    const s = wf.startWorkflow(w.id, {});
    const r: any = await runOrFail(s.jobId!);
    const q = r.steps?.find((x: any) => x.kind === "quality_review");
    if (q) {
      expect(q.status).toBe("skipped");
      expect(q.reason).toMatch(/aucun moteur/);
    }
  }, 120_000);

  it("plafond respecté pendant les étapes : jamais plus que le plafond accepté, tous moteurs confondus", async () => {
    const w = await fr(() => wf.prepareWorkflow(shop, creer.id, "Rédige la fiche produit et une campagne publicitaire", { aiActive: true }));
    expect(w.estimate.totalMicro).toBeGreaterThan(0);
    // Plafond = devis : chaque appel est borné par le coût maximal restant sous ce plafond.
    const s = wf.startWorkflow(w.id, { approveMicro: w.estimate.totalMicro, capEur: w.estimate.totalMicro / EUR });
    await runOrFail(s.jobId!);
    const spent = one<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE job_id = ?", s.jobId)!.c;
    expect(spent).toBeLessThanOrEqual(w.estimate.totalMicro);
    const held = one<{ n: number }>("SELECT COUNT(*) n FROM ai_reservations WHERE user_id = ? AND status = 'held'", creer.id)!.n;
    expect(held).toBe(0);
  }, 180_000);

  it("« Réessayer » : relance les étapes en échec avec la même tâche ; les étapes faites ne sont pas refaites", async () => {
    const realSeo = STEP_EXECUTORS.seo!;
    const realExport = STEP_EXECUTORS.cms_export!;
    let exports = 0;
    let seoFails = 1;
    STEP_EXECUTORS.seo = async (...a) => {
      if (seoFails-- > 0) throw new Error("panne simulée du moteur de textes");
      return realSeo(...a);
    };
    STEP_EXECUTORS.cms_export = async (...a) => {
      exports++;
      return realExport(...a);
    };
    try {
      const w = await fr(() => wf.prepareWorkflow(shop, creer.id, "Optimise le SEO de ma fiche produit et exporte ma boutique Shopify", { aiActive: false }));
      const s = wf.startWorkflow(w.id, {});
      const r1: any = await runOrFail(s.jobId!);
      expect(r1.error).toMatch(/panne simulée/);
      let view = wf.workflowView(w.id)!;
      expect(view.workflow.status).toBe("failed");
      expect(view.steps.find((x) => x.kind === "seo")!.status).toBe("failed");
      expect(view.steps.find((x) => x.kind === "cms_export")!.status).toBe("done");
      run("UPDATE jobs SET status = 'failed' WHERE id = ?", s.jobId); // comme le worker après l'erreur définitive
      const again = wf.retryWorkflow(w.id);
      expect(again.status).toBe("queued");
      expect(getJob(s.jobId!)!.status).toBe("queued");
      const r2: any = await runOrFail(s.jobId!);
      expect(r2.error).toBeUndefined();
      view = wf.workflowView(w.id)!;
      expect(view.workflow.status).toBe("done");
      expect(view.steps.find((x) => x.kind === "seo")!.status).toBe("done");
      expect(exports).toBe(1); // l'export déjà fait n'est pas refait
      expect(all("SELECT 1 FROM jobs WHERE type = 'workflow.run' AND payload LIKE ?", `%${w.id}%`)).toHaveLength(1);
    } finally {
      STEP_EXECUTORS.seo = realSeo;
      STEP_EXECUTORS.cms_export = realExport;
    }
  }, 180_000);
});
