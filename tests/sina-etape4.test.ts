/**
 * SINA (#492) — étape 4 du parcours : 5 angles marketing. Le moteur du Pilote (analyse de la fiche, recherche web,
 * angles) tourne avec ses dépendances SIMULÉES (aucun appel réel, aucun réseau) ; SINA l'enchaîne, montre les angles
 * avec leurs sources et enregistre le choix du client.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig()) as object, activeProviderKey: () => "FAKE-NOT-A-SECRET" }));

describe("SINA — étape 4 : 5 angles marketing", async () => {
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { claimNext, completeJob, JobContext } = await import("@/lib/jobs");
  const { runPreparation } = await import("@/lib/preparation/engine");
  const { withTrace } = await import("@/lib/ai/trace");
  const { runForUser } = await import("@/lib/ai/access");
  const { stateOf } = await import("@/lib/preparation/store");
  const { getStrategyState } = await import("@/lib/marketing-strategy");
  const { researchOfferDigest } = await import("@/lib/marketing-strategy/proposals");
  const { simulatedDependencies } = await import("./preparation-fixtures");
  const { seedSourcedAnglesForTest } = await import("./sourced-strategy-fixture");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { threadView, modelFor } = await import("@/lib/syna-agent/loop");
  const J = await import("@/lib/syna-agent/journey");
  const A = await import("@/lib/syna-agent/angles");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Aucun réseau dans les tests"); })); });
  afterEach(() => { vi.unstubAllGlobals(); });

  /** Tâche du Pilote exécutée avec les dépendances simulées. */
  async function execute() {
    const j = claimNext(["project.prepare"])!;
    expect(j).toBeTruthy();
    const deps = { ...simulatedDependencies, research: async (...args: Parameters<typeof simulatedDependencies.research>) => ({ ...(await simulatedDependencies.research(...args)), offerDigest: researchOfferDigest(args[0]) }) };
    const result = await fr(() => runForUser(j.user_id, () => withTrace({ jobId: j.id, projectId: j.project_id }, () => runPreparation(new JobContext(j), deps)), "normal", j.project_id));
    completeJob(j.id, result);
  }

  /** Fil à l'étape 4 : fiche de départ confirmée, étapes 1 à 3 validées. */
  async function stepFour() {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des confitures artisanales cuites au chaudron en cuivre, avec des fruits de la Drôme." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien, je pars de zéro." }, { field: "audience", value: "Des gourmands de 30 à 60 ans qui aiment offrir." }, { field: "image", value: "Gourmand, authentique, solaire." },
      { field: "setup", value: "4 produits" }, { field: "market", value: "En ligne, France." }, { field: "price", value: "7,90 € le pot de 250 g" }, { field: "difference", value: "Cuisson lente au chaudron, 65 % de fruits." },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas de photos pour l'instant." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    expect((await call("start.confirm", ctx, {})).ok).toBe(true);
    J.updateJourney(cid, (x) => { for (const n of [1, 2, 3]) J.setStep(x, n, "done"); J.setStep(x, 4, "todo"); });
    return { user, cid, ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  it("parcours complet : analyse de la fiche, recherche, 5 angles avec sources, choix du client", async () => {
    const { user, cid, ctx, pid } = await stepFour();
    expect(J.READY_STEPS).toContain(4);
    expect(J.currentStep(J.journeyOf(cid))).toBe(4);
    expect(modelFor(4)?.model).toMatch(/haiku/); // le travail est dans les tâches du Pilote
    expect(J.journeyContext(J.journeyOf(cid))).toMatch(/Étape 4 \(5 angles marketing\)[^]*PAYANT[^]*angles\.propose/);
    expect((await getTool("angles.propose")!.estimate!(ctx, {})).maxMicro).toBeGreaterThan(0);
    // 1) La fiche doit être comprise : tâche d'analyse (payante, devis du Pilote).
    expect(A.anglesPhase(pid).kind).toBe("analyze");
    const r1 = await call("angles.propose", ctx, {});
    expect(r1.ok).toBe(true);
    expect(r1.jobs).toHaveLength(1);
    expect(J.journeyOf(cid).steps[4].status).toBe("doing");
    // Une préparation en cours : jamais une seconde tâche.
    expect((await call("angles.propose", ctx, {})).jobs ?? []).toHaveLength(0);
    await execute();
    // 2) Fiche comprise : validée (le client a confirmé son résumé à l'étape 0) et recherche lancée.
    const r2 = await call("angles.propose", ctx, {});
    expect(r2.ok).toBe(true);
    expect(r2.jobs).toHaveLength(1);
    expect(stateOf(pid)!.stages.brief!.status).toBe("approved");
    await execute();
    expect(stateOf(pid)!.stages.research?.data?.angles?.length).toBe(5);
    // Les dépendances simulées du Pilote rendent une recherche à l'ancien format ; la recherche acquise au format
    // actuel (sources réelles, reçu d'appel) est posée par la fixture commune des angles sourcés.
    seedSourcedAnglesForTest(pid);
    // 3) Les 5 angles sont prêts : rangés dans le parcours, affichés avec leurs sources.
    const r3 = await call("angles.propose", ctx, {});
    expect(r3.ok).toBe(true);
    const j = J.journeyOf(cid);
    expect(j.angles!.list).toHaveLength(5);
    expect(j.steps[4].status).toBe("review");
    expect(J.journeyContext(j)).toMatch(/Étape 4 — 5 angles prêts[^]*angles\.choose/);
    const view = await fr(() => threadView(user, cid));
    expect(view.journey.angles!.list).toHaveLength(5);
    expect(view.journey.angles!.chosen).toBeNull();
    // 4) Choix du client : angle actif (fil conducteur) et recherche validée ; étape 5 ouverte.
    expect((await call("angles.choose", ctx, { angleId: "inconnu" })).ok).toBe(false);
    const pick = j.angles!.list.find((x) => x.id === (j.angles!.recommendedId ?? "")) ?? j.angles!.list[0];
    const c = await call("angles.choose", ctx, { angleId: pick.id });
    expect(c.ok).toBe(true);
    expect(getStrategyState(pid).active?.angleId).toBe(pick.id);
    expect(stateOf(pid)!.stages.research!.status).toBe("approved");
    expect(J.journeyOf(cid).steps[4].status).toBe("done");
    expect(J.currentStep(J.journeyOf(cid))).toBe(5);
    expect((await call("angles.propose", ctx, {})).ok).toBe(false); // déjà choisi
  });

  it("refusé avant l'image de marque validée", async () => {
    const { cid, ctx } = await stepFour();
    J.updateJourney(cid, (x) => J.setStep(x, 3, "review"));
    const r = await call("angles.propose", ctx, {});
    expect(r.ok).toBe(false);
    expect(r.summary).toMatch(/étape 3/);
  });

  it("angles montrés au client : sources réelles (titre, lien), preuves à confirmer, jamais plus de 4 sources par angle", () => {
    const d = { recommendedId: "b", recommendation: "Le plus proche de ta clientèle.", sources: [
      { id: "s1", title: "Blog confitures", url: "https://exemple.fr/a", status: "consulted" },
      { id: "s2", title: "", url: "https://exemple.fr/b", status: "consulted", relevance: { accepted: false } },
    ], angles: [{ id: "b", title: "Le cadeau gourmand", audience: "Ceux qui offrent", motivation: "Faire plaisir", message: "Offre l'été en pot", emotion: "fierté", proofsToConfirm: ["Fruits de la Drôme"], arguments: ["a", "b", "c", "d"], sourceIds: ["s1", "s2", "zz"] }] };
    const a = A.anglesOf(d);
    expect(a.sourceCount).toBe(1);
    expect(a.list[0].sources).toEqual([{ title: "Blog confitures", url: "https://exemple.fr/a" }, { title: "https://exemple.fr/b", url: "https://exemple.fr/b" }]);
    expect(a.list[0].proofsToConfirm).toEqual(["Fruits de la Drôme"]);
    expect(a.list[0].arguments).toHaveLength(3);
  });
  it("essai réel du 7 novembre : pourcentages lisibles, accord lisible, coût réel d'un échec dit au client, relance seulement à sa demande", async () => {
    const { run, id, now } = await import("@/lib/db");
    const { commitState } = await import("@/lib/preparation/store");
    const T = await import("@/lib/syna-agent/tools/angles");
    expect(A.pct(7.994748837209302)).toBe("8 %");
    expect(A.pct(4.4757162790697675)).toBe("4,5 %");
    expect(T.questionList([{ id: "s-ingr", question: "Ingrédients ?" }], ["Ingrédients ?", "Autre point"])).toBe("[s-ingr] Ingrédients ? ; Autre point");
    const { user, ctx, pid } = await stepFour();
    // Demande d'accord : une phrase pour le client, jamais « angles.propose {} ».
    expect(await getTool("angles.propose")!.preview!(ctx, {})).toMatch(/^Analyse de ta fiche de départ par l'IA, avant la recherche : au plus \d+(,\d)? % du budget IA du mois\.$/);
    await call("angles.propose", ctx, {});
    await execute();
    await call("angles.propose", ctx, {}); // fiche validée, recherche lancée
    expect(await getTool("angles.propose")!.preview!(ctx, {})).toMatch(/^Recherche web sur ton marché et 5 angles marketing/);
    const jobId = claimNext(["project.prepare"])!.id;
    // La recherche échoue après un appel payant (pages non lues) : 0,29 € réellement dépensés.
    run("INSERT INTO ai_calls(id,created_at,user_id,project_id,job_id,task,provider,requested_model,unit,cost,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)", id(), now(), user.id, pid, jobId, "strategy", "anthropic", "test", "request", 290_365, "ok");
    completeJob(jobId, {});
    commitState(pid, stateOf(pid)!.revision, (st) => { (st as any).error = { step: "research", jobId, revision: st.revision, message: "Recherche Internet incomplète : compléter les pages pertinentes avant de payer une analyse d’angles.", at: Date.now() }; (st.stages as any).research = undefined; });
    const r = await call("angles.propose", ctx, {});
    expect(r.ok).toBe(false);
    expect(r.jobs ?? []).toHaveLength(0); // jamais relancée (payante) sans la demande du client
    expect(r.summary).toMatch(/Elle a coûté \d+(,\d)? % du budget \(appels réellement faits\)/);
    expect((r.data as any).coutPct).toBeGreaterThan(0);
    const again = await call("angles.propose", ctx, { retry: true });
    expect(again.jobs).toHaveLength(1);
  });
});
