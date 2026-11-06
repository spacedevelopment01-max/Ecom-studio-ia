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
      await call("start.answer", ctx, { answers: [{ field: "business", value: "services" }, { field: "offer", value: "Peinture intérieure et rénovation de murs." }] });
      const created = await call("project.create", ctx, { name: "Projet refonte", business: "services", description: "Peinture intérieure et rénovation de murs." });
      expect(created.ok).toBe(true);
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
      expect(j.steps[1].status).toBe("doing");
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
    await call("project.create", ctx, { name: "Chantier", business: "products", description: "Un sac de voyage." });
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
