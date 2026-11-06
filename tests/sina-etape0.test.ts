/**
 * SINA (#492) — étape 0 du parcours de création : fiche de départ (questions une à une, jamais redemandées),
 * lecture gratuite d'un site existant, mode refonte (éléments gardés tels quels), validation reportée dans le projet,
 * parcours 0–13 relu par SINA à chaque pas et montré en frise. Aucun appel d'IA ni réseau : site lu sur des fichiers
 * de démonstration, modèle simulé.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — étape 0 : questions de départ, existant, refonte", async () => {
  const { one, all, json, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { stateOf } = await import("@/lib/preparation/store");
  const { pendingSubscriptions } = await import("@/lib/project-billing");
  const { account } = await import("./conversation209-fixtures");
  const { fixtureFetcher } = await import("./site-fixtures");
  const { threadFor, openThread } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { submitMessage, runAgent } = await import("@/lib/syna-agent/loop");
  const { getRun } = await import("@/lib/syna-agent/store");
  const { startDeps } = await import("@/lib/syna-agent/tools/start");
  const J = await import("@/lib/syna-agent/journey");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const ctxOf = (user: any, cid: string) => ({ user, conversationId: cid, runId: "test", projectId: null as string | null, attachment: () => null }) as any;
  /** Comme la boucle : le projet du fil est relu avant chaque outil. */
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  it("nom provisoire tiré des mots du client", async () => {
    const { provisionalName } = await import("@/lib/syna-agent/tools/start");
    expect(provisionalName("Je suis coach sportif. Je fais des séances à domicile.")).toBe("Coach sportif (provisoire)");
    expect(provisionalName("Un sac de voyage modulable en toile kaki, avec plusieurs poches")).toBe("Un sac de voyage modulable en toile kaki (provisoire)");
  });

  it("ordre des questions : « garder » seulement s'il existe déjà quelque chose, plateforme seulement pour une boutique", () => {
    const j = J.emptyJourney();
    expect(J.currentStep(j)).toBe(0);
    expect(J.missingFields(j)).toEqual(["business", "offer", "existing", "audience", "market", "price", "difference", "taste", "contact", "platform"]);
    j.start.business = { value: "services", status: "answered", source: "client", at: 1 };
    j.start.existing = { value: "Non, rien encore", status: "answered", source: "client", at: 1 };
    expect(J.missingFields(j)).not.toContain("keep");
    expect(J.missingFields(j)).not.toContain("platform");
    j.start.existing = { value: "Oui, un logo et un site", status: "answered", source: "client", at: 1 };
    expect(J.missingFields(j)[0]).toBe("offer");
    expect(J.missingFields(j)).toContain("keep");
    expect(J.journeyContext(j)).toMatch(/Prochaine question à poser .*offer/);
  });

  it("une étape pas encore construite est annoncée, sans outil payant", () => {
    const j = J.emptyJourney();
    J.setStep(j, 0, "done"); J.setStep(j, 1, "doing");
    expect(J.currentStep(j)).toBe(1);
    expect(J.READY_STEPS).not.toContain(1);
    expect(J.journeyContext(j)).toMatch(/n'est pas encore disponible .*AUCUN outil payant/);
  });

  it("coût de SINA : le catalogue des outils (fixe) est mis en cache AVANT le contexte qui change à chaque pas", async () => {
    const { promptHead } = await import("@/lib/ai/llm");
    expect(promptHead({ task: "agent_conversation", context: "état du projet", reference: "catalogue" })).toEqual({ cached: ["catalogue"], after: ["état du projet"] });
    expect(promptHead({ task: "strategy" as any, context: "contexte", reference: "référence" })).toEqual({ cached: ["contexte", "référence"], after: [] });
  });

  it("une réponse indispensable ne peut pas être reportée ; une réponse donnée n'est plus demandée", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    const refused = await call("start.answer", ctx, { answers: [{ field: "audience", status: "later" }] });
    expect(refused.ok).toBe(false);
    const r = await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Un sac de voyage modulable en toile." }] });
    expect(r.ok).toBe(true);
    expect((r.data as any).prochaine).toBe("existing");
    expect(r.summary).not.toMatch(/\b(offer|existing)\b/); // jamais d'identifiant technique affiché au client
    expect(J.missingFields(J.journeyOf(cid))).not.toContain("offer");
  });

  it("parcours complet de l'étape 0 en mode refonte : site lu, logo et slogan gardés, fiche reportée, étape 1 ouverte", async () => {
    const user = await account();
    // Deux abonnements libres : le projet doit prendre celui choisi sur l'accueil, pas le premier venu.
    const chosen = pendingSubscriptions(user.id)[0].user_id;
    const cid = openThread(user, null, chosen).conversationId;
    expect(json<any>(one<any>("SELECT state_json FROM agent_conversations WHERE id=?", cid).state_json, {}).subscriptionKey).toBe(chosen);
    const ctx = ctxOf(user, cid);
    startDeps.fetchImpl = fixtureFetcher("custom");
    try {
      // Le projet est créé par le Studio lui-même dès que l'activité et l'offre sont connues (pas par le modèle).
      const created = await call("start.answer", ctx, { answers: [{ field: "business", value: "services" }, { field: "offer", value: "Peinture intérieure et rénovation de murs." }] });
      expect(created.ok).toBe(true);
      expect(created.summary).toMatch(/projet est créé/);
      expect(one<any>("SELECT name FROM projects WHERE id=(SELECT project_id FROM agent_conversations WHERE id=?)", cid).name).toMatch(/^Peinture intérieure.*\(provisoire\)$/);
      const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
      expect(one<any>("SELECT user_id FROM subscriptions WHERE project_id=?", pid).user_id).toBe(chosen);
      expect(loadProject(pid).settings.mode).toBe("guided");

      // Lien vers un réseau social : refus honnête, pas de devinette.
      const insta = await call("start.import", ctx, { url: "https://www.instagram.com/exemple" });
      expect(insta.ok).toBe(false);
      expect(insta.summary).toMatch(/captures/);

      const imp = await call("start.import", ctx, { url: "https://custom.test/" });
      expect(imp.ok).toBe(true);
      const j1 = J.journeyOf(cid);
      expect(j1.imported).toHaveLength(1);
      expect(j1.start.existing?.source).toBe("site");
      expect(J.missingFields(j1)).toContain("keep");

      const keep = await call("start.keep", ctx, { keep: ["logo", "slogan"] });
      expect(keep.ok).toBe(true);
      expect(J.journeyOf(cid).mode).toBe("refonte");

      // Validation refusée tant que des questions n'ont pas été posées.
      const early = await call("start.confirm", ctx, {});
      expect(early.ok).toBe(false);

      await call("start.answer", ctx, { answers: [
        { field: "audience", value: "Propriétaires de maisons anciennes, 35-60 ans." },
        { field: "market", value: "Lyon et 30 km autour, chez le client." },
        { field: "price", status: "later" },
        { field: "difference", value: "Des finitions nettes et un chantier propre." },
        { field: "taste", value: "J'aime https://exemple-reference.fr, pas les sites chargés." },
        ...(J.journeyOf(cid).start.contact ? [] : [{ field: "contact" as const, value: "contact@exemple.fr" }]),
      ] });
      expect(J.missingFields(J.journeyOf(cid))).toEqual([]);

      const ok = await call("start.confirm", ctx, {});
      expect(ok.ok).toBe(true);
      const j = J.journeyOf(cid);
      expect(j.steps[0].status).toBe("done");
      expect(j.steps[1].status).toBe("todo"); // rien n'est en cours tant que l'étape 1 n'a pas commencé
      expect(J.currentStep(j)).toBe(1);
      const input = (stateOf(pid)!.stages as any).brief.data.input;
      expect(input.target).toMatch(/maisons anciennes/);
      expect(input.constraints).toMatch(/Refonte : garder tel quel logo, slogan/);
      expect(input.referenceUrls).toEqual(expect.arrayContaining(["https://exemple-reference.fr"]));
      expect(input.referenceUrls.some((u: string) => u.startsWith("https://custom.test"))).toBe(true);
      expect(one<any>("SELECT value FROM memory WHERE project_id=? AND key='syna.garder'", pid).value).toBe("logo, slogan");
      // Logo gardé : rangé comme logo fourni par le client (jamais redessiné ensuite), s'il a été trouvé sur le site.
      expect(j.imported[0].logoSrc).toBeTruthy();
      expect(all<any>("SELECT id FROM assets WHERE project_id=? AND role='logo' AND origin='upload'", pid).length).toBe(1);
    } finally { startDeps.fetchImpl = undefined; }
  });

  it("mode chantier : pendant la construction, le client suit sans modifier ; SINA et la lecture restent libres", async () => {
    const { withAccessScope } = await import("@/lib/access-scope");
    const { assertNotUnderConstruction, underConstruction } = await import("@/lib/syna-agent/construction");
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Un sac de voyage." }] });
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    expect(underConstruction(pid)).toBe(true);
    const http = (method: string, path = `/api/projects/${pid}/brand`) => () => withAccessScope({ kind: "http", method, path }, () => assertNotUnderConstruction(pid));
    expect(http("PATCH")).toThrow(/en construction avec SINA/);
    expect(http("POST", `/api/projects/${pid}/theme`)).toThrow(/en construction/);
    expect(http("GET")).not.toThrow();
    expect(http("POST", `/api/projects/${pid}/subscription`)).not.toThrow();
    // Les actions de SINA (tâches de fond) ne passent pas par ce verrou.
    expect(() => withAccessScope({ kind: "worker" }, () => assertNotUnderConstruction(pid))).not.toThrow();
    // Fin de l'étape 13 : tout le Studio s'ouvre.
    J.updateJourney(cid, (j) => { for (let n = 0; n <= 13; n++) J.setStep(j, n, "done"); });
    expect(underConstruction(pid)).toBe(false);
    expect(http("PATCH")).not.toThrow();
  });

  it("réponses personnalisées (par défaut) : le Studio enregistre la réponse lui-même, puis Haiku rédige une seule réponse", async () => {
    const { addMessage } = await import("@/lib/syna-agent/store");
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "services" }, { field: "offer", value: "Coaching sportif à domicile." }] });
    addMessage(cid, "assistant", { message: "Bien reçu.", actions: [], question: { text: "As-tu déjà quelque chose ?" }, done: false, askField: "existing", step: 0 }, null);
    const r = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text: "Rien, je pars de zéro" });
    const seen: any[] = [];
    await fr(() => runAgent(r.id, r.job_id!, { reason: async (c) => {
      // La réponse est déjà enregistrée AVANT que le modèle n'écrive : il ne peut pas l'oublier.
      expect(J.journeyOf(cid).start.existing?.value).toMatch(/je pars de zéro/);
      seen.push(c.routing?.prefer);
      // Variété : SINA voit les débuts de ses derniers messages pour ne pas les répéter.
      expect(String(c.context)).toMatch(/Débuts de tes derniers messages .*« Bien reçu\.… »/);
      return { message: "Super, on part de zéro ensemble !", actions: [], question: { text: "À qui t'adresses-tu ?" }, done: false, askField: "audience" };
    } }));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ model: "claude-haiku-5-5" });
    expect(getRun(r.id)!.status).toBe("waiting_user");
  });

  it("réglage « réponses locales » : une réponse simple n'appelle pas du tout l'IA", async () => {
    const { setJsonSetting } = await import("@/lib/settings");
    setJsonSetting("syna.replies", "locales");
    try { await localOnly(); } finally { setJsonSetting("syna.replies", "personnalisees"); }
  });
  async function localOnly() {
    const { addMessage } = await import("@/lib/syna-agent/store");
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "services" }, { field: "offer", value: "Coaching sportif à domicile." }] });
    addMessage(cid, "assistant", { message: "Bien reçu.", actions: [], question: { text: "As-tu déjà quelque chose ?" }, done: false, askField: "existing", step: 0 }, null);
    const r = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text: "Rien, je pars de zéro" });
    let calls = 0;
    await fr(() => runAgent(r.id, r.job_id!, { reason: async () => { calls++; throw new Error("l'IA ne doit pas être appelée"); } }));
    expect(calls).toBe(0);
    expect(getRun(r.id)!.status).toBe("waiting_user");
    expect(J.journeyOf(cid).start.existing?.value).toMatch(/je pars de zéro/);
    const last = all<any>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='assistant' ORDER BY seq DESC LIMIT 1", cid).map((m) => json<any>(m.content_json, {}))[0];
    expect(last).toMatchObject({ local: true, askField: "audience" });
  }

  it("un projet créé sans le parcours SINA n'est jamais verrouillé", async () => {
    const { underConstruction } = await import("@/lib/syna-agent/construction");
    const { project } = await import("./conversation209-fixtures");
    const user = await account();
    expect(underConstruction(project(user))).toBe(false);
  });

  it("SINA relit le parcours à chaque pas et la frise est servie à l'interface", async () => {
    const user = await account();
    const cid = threadFor(user, null);
    const seen: string[] = [];
    const r = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text: "Bonjour, je veux créer ma boutique." });
    await fr(() => runAgent(r.id, r.job_id!, { reason: async (c) => {
      seen.push(String(c.context));
      return { message: "Vous vendez des produits, ou vous proposez des services ?", actions: [], question: { text: "Produits ou services ?", choices: ["Produits", "Services"] }, done: false };
    } }));
    expect(getRun(r.id)!.status).not.toBe("failed");
    expect(seen[0]).toMatch(/Parcours de création/);
    expect(seen[0]).toMatch(/Prochaine question à poser .*business/);
    const view = openThread(user, null) as any;
    expect(view.journey.current).toBe(0);
    expect(view.journey.steps).toHaveLength(14);
    run("SELECT 1");
  });
});

describe("SINA — niveaux de coût : gratuit (moteur local), Haiku, Opus", async () => {
  const L = await import("@/lib/syna-agent/local-step");
  const J = await import("@/lib/syna-agent/journey");
  const { modelFor } = await import("@/lib/syna-agent/loop");
  const base = () => { const j = J.emptyJourney(); j.start.business = { value: "services", status: "answered", source: "client", at: 1 }; j.start.offer = { value: "Coaching sportif à domicile.", status: "answered", source: "client", at: 1 }; return j; };
  const ctx = (j: any, askField: string | null, userText: string, extra: Partial<{ hasAttachments: boolean; hasProject: boolean }> = {}) => ({ journey: j, askField, userText, hasAttachments: false, hasProject: true, seq: 3, ...extra });

  it("réponse simple à la question posée : enregistrée sans IA, question suivante posée", () => {
    const d = L.localDecision(ctx(base(), "existing", "Rien, je pars de zéro"))!;
    expect(d.answer).toMatchObject({ field: "existing", status: "answered" });
    expect(d.out.actions[0]).toMatchObject({ tool: "start.answer" });
    expect(d.out.askField).toBe("audience");
    expect(d.out.question?.text).toMatch(/client idéal/);
  });

  it("dans le doute, jamais de devinette : Claude reprend", () => {
    expect(L.localDecision(ctx(base(), "existing", "Oui, voici mon site https://exemple.fr"))).toBeNull();
    expect(L.localDecision(ctx(base(), "audience", "Plus tard"))).toBeNull(); // indispensable
    expect(L.localDecision(ctx(base(), "audience", "Ça veut dire quoi client idéal ?"))).toBeNull(); // question du client
    expect(L.localDecision(ctx(base(), "market", "Bordeaux", { hasAttachments: true }))).toBeNull(); // pièce jointe
    expect(L.localDecision(ctx(base(), "price", "60 €"))).toBeNull(); // pas la question en cours (existing manque)
    expect(L.localDecision(ctx(base(), null, "Bordeaux"))).toBeNull(); // question inconnue
    expect(L.parseSimpleAnswer("business", "un peu des deux, produits et services")).toBeNull();
  });

  it("dernière réponse : résumé construit sans rien réécrire, puis validation par « oui »", () => {
    const j = base();
    j.start.existing = { value: "Rien : je pars de zéro.", status: "answered", source: "client", at: 1 };
    for (const f of ["audience", "market", "price", "difference", "taste"] as const) j.start[f] = { value: `réponse ${f}`, status: "answered", source: "client", at: 1 };
    const d = L.localDecision(ctx(j, "contact", "Plus tard"))!;
    expect(d.out.askField).toBe("confirm");
    expect(d.out.message).toMatch(/Voici ce que j'ai compris/);
    expect(d.out.message).toMatch(/réponse difference/);
    expect(d.out.message).toMatch(/Plus tard/);
    j.start.contact = { value: "", status: "later", source: "client", at: 1 };
    const ok = L.localDecision(ctx(j, "confirm", "Oui, tout est juste, on continue"))!;
    expect(ok.confirm).toBe(true);
    expect(ok.out.actions[0].tool).toBe("start.confirm");
    expect(L.localDecision(ctx(j, "confirm", "Non, le prix est faux"))).toBeNull();
  });

  it("modèle par réponse : Haiku pour l'étape 0 et une étape pas encore disponible, Opus pour une étape créative prête", () => {
    expect(modelFor(0)).toMatchObject({ model: "claude-haiku-5-5" });
    expect(modelFor(1)).toMatchObject({ model: "claude-haiku-5-5" }); // étape 1 pas encore construite : simple annonce
    J.READY_STEPS.push(1);
    try { expect(modelFor(1)).toBeUndefined(); } finally { J.READY_STEPS.pop(); }
  });
});
