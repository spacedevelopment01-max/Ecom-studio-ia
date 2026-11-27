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
    // Le titre montré au client ne porte jamais « (provisoire) » (essai réel de Nadia, 23 novembre 2026).
    expect(provisionalName("Je suis coach sportif. Je fais des séances à domicile.")).toBe("Coach sportif");
    expect(provisionalName("Un sac de voyage modulable en toile kaki, avec plusieurs poches")).toBe("Sac de voyage modulable en toile kaki");
    expect(provisionalName("Je fais de la plâtrerie, des cloisons et de la peinture.")).toBe("Plâtrerie");
  });

  it("essai réel de Nadia (23 novembre 2026) : le titre du projet se coupe à un mot entier, jamais au milieu d'une idée, sans « (provisoire) »", async () => {
    const { provisionalName, TITRE_MAX } = await import("@/lib/syna-agent/tools/start");
    // Avant : « Bougies parfumées que je coule à la (provisoire) ».
    expect(provisionalName("Je fais des bougies parfumées que je coule à la main chez moi, près de Lyon")).toBe("Bougies parfumées");
    // Une phrase longue sans suite : coupée à un mot entier, sans petit mot de liaison au bout.
    const long = provisionalName("des savons artisanaux saponifiés à froid au lait de chèvre et aux huiles bio");
    expect(long).toBe("Savons artisanaux saponifiés à froid");
    expect(long.length).toBeLessThanOrEqual(TITRE_MAX);
    // Un titre de 40 signes pile reste entier.
    expect(provisionalName("Je fais des tabourets en chêne massif tournés main")).toBe("Tabourets en chêne massif tournés main");
    for (const t of ["Je fais des bougies parfumées que je coule à la main chez moi", "Un sac de voyage modulable en toile kaki, avec plusieurs poches", "Je répare les crevaisons"]) expect(provisionalName(t)).not.toMatch(/provisoire|\s(à|la|le|de|que|qui)$/i);
  });

  it("ordre des questions : « garder » seulement s'il existe déjà quelque chose, plateforme seulement pour une boutique", () => {
    const j = J.emptyJourney();
    expect(J.currentStep(j)).toBe(0);
    expect(J.missingFields(j)).toEqual(["business", "offer", "existing", "audience", "image", "setup", "market", "price", "difference", "taste", "photos", "language", "contact", "platform"]);
    j.start.business = { value: "services", status: "answered", source: "client", at: 1 };
    j.start.existing = { value: "Non, rien encore", status: "answered", source: "client", at: 1 };
    expect(J.missingFields(j)).not.toContain("keep");
    expect(J.missingFields(j)).not.toContain("platform");
    j.start.existing = { value: "Oui, un logo et un site", status: "answered", source: "client", at: 1 };
    expect(J.missingFields(j)[0]).toBe("offer");
    expect(J.missingFields(j)).toContain("keep");
    expect(J.journeyContext(j)).toMatch(/Sujets de la fiche pas encore abordés [^:]*: offer — /);
  });

  it("une étape pas encore construite est annoncée, sans outil payant", () => {
    const j = J.emptyJourney();
    for (let n = 0; n <= 8; n++) J.setStep(j, n, "done");
    J.setStep(j, 9, "doing");
    expect(J.currentStep(j)).toBe(9);
    expect(J.READY_STEPS).not.toContain(9);
    expect(J.journeyContext(j)).toMatch(/n'est pas encore disponible .*AUCUN outil payant/);
  });

  it("coût de SINA : le catalogue des outils (fixe) est mis en cache AVANT le contexte qui change à chaque pas", async () => {
    const { promptHead } = await import("@/lib/ai/llm");
    expect(promptHead({ task: "agent_conversation", context: "état du projet", reference: "catalogue" })).toEqual({ cached: ["catalogue"], history: [], after: ["état du projet"] });
    // Tâche ordinaire : la référence (la même pour tous les clients) passe désormais devant le contexte du projet.
    expect(promptHead({ task: "strategy" as any, context: "contexte", reference: "référence" })).toEqual({ cached: ["référence", "contexte"], history: [], after: [] });
  });

  it("une réponse indispensable ne peut pas être reportée ; une réponse donnée n'est plus demandée", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    const refused = await call("start.answer", ctx, { answers: [{ field: "audience", status: "later" }] });
    expect(refused.ok).toBe(false);
    // Valeur mal formée par SINA (essai réel du 7 novembre : « ✕ business vaut… » affiché au client) : erreur interne,
    // vue par le modèle seul.
    const bad = await call("start.answer", ctx, { answers: [{ field: "business", value: "produits" }] });
    expect(bad.ok).toBe(false);
    expect(bad.internal).toBe(true);
    const r = await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Un sac de voyage modulable en toile." }] });
    expect(r.ok).toBe(true);
    expect((r.data as any).sujetsPasEncoreAbordes[0]).toBe("existing");
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
      expect(one<any>("SELECT name FROM projects WHERE id=(SELECT project_id FROM agent_conversations WHERE id=?)", cid).name).toBe("Peinture intérieure et rénovation"); // coupé à un mot entier, sans « de » au bout ni « (provisoire) »
      const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
      expect(one<any>("SELECT user_id FROM subscriptions WHERE project_id=?", pid).user_id).toBe(chosen);
      expect(loadProject(pid).settings.mode).toBe("guided");

      // Lien vers un réseau social : refus honnête, pas de devinette.
      const insta = await call("start.import", ctx, { url: "https://www.instagram.com/exemple" });
      expect(insta.ok).toBe(false);
      expect(insta.hint).toMatch(/captures/); // consigne pour SINA, jamais affichée telle quelle

      const imp = await call("start.import", ctx, { url: "https://custom.test/" });
      expect(imp.ok).toBe(true);
      const j1 = J.journeyOf(cid);
      expect(j1.imported).toHaveLength(1);
      expect(j1.start.existing?.source).toBe("site");
      expect(j1.start.business?.source).toBe("client"); // jamais déduit du site lu (peu fiable)
      expect(J.missingFields(j1)).toContain("keep");

      const keep = await call("start.keep", ctx, { keep: ["logo", "slogan"] });
      expect(keep.ok).toBe(true);
      expect(J.journeyOf(cid).mode).toBe("refonte");

      // Validation refusée tant que des questions n'ont pas été posées.
      const early = await call("start.confirm", ctx, {});
      expect(early.ok).toBe(false);

      await call("start.answer", ctx, { answers: [
        { field: "audience", value: "Propriétaires de maisons anciennes, 35-60 ans." },
        { field: "image", value: "Soigné, rassurant, artisanal. Pas de rouge." },
        { field: "setup", value: "Par une demande de devis, ou un appel." },
        { field: "photos", value: "Oui, des photos de mes chantiers." },
        { field: "language", value: "Français seulement" },
        { field: "market", value: "Lyon et 30 km autour, chez le client." },
        { field: "price", status: "later" },
        { field: "difference", value: "Des finitions nettes et un chantier propre." },
        { field: "taste", value: "J'aime https://exemple-reference.fr, pas les sites chargés." },
        ...(J.journeyOf(cid).start.contact ? [] : [{ field: "contact" as const, value: "contact@exemple.fr" }]),
      ] });
      expect(J.missingFields(J.journeyOf(cid))).toEqual([]);

      const ok = await (await import("./faits-fixtures")).avecLesFaitsDemandes(ctx, () => call("start.confirm", ctx, {}));
      expect(ok.ok).toBe(true);
      const j = J.journeyOf(cid);
      expect(j.steps[0].status).toBe("done");
      expect(j.steps[1].status).toBe("todo"); // rien n'est en cours tant que l'étape 1 n'a pas commencé
      expect(J.currentStep(j)).toBe(1);
      const input = (stateOf(pid)!.stages as any).brief.data.input;
      expect(input.target).toMatch(/maisons anciennes/);
      expect(input.constraints).toMatch(/Refonte : garder tel quel logo, slogan/);
      expect(input.constraints).toMatch(/Image voulue : Soigné, rassurant, artisanal/);
      // Organisation : le bouton principal du site de services suit la réponse du client.
      expect(loadProject(pid).services.contactModes).toEqual(["quote", "call"]);
      expect(input.referenceUrls).toEqual(expect.arrayContaining(["https://exemple-reference.fr"]));
      expect(input.referenceUrls.some((u: string) => u.startsWith("https://custom.test"))).toBe(true);
      expect(one<any>("SELECT value FROM memory WHERE project_id=? AND key='syna.garder'", pid).value).toBe("logo, slogan");
      // Logo gardé : rangé comme logo fourni par le client (jamais redessiné ensuite), s'il a été trouvé sur le site.
      expect(j.imported[0].logoSrc).toBeTruthy();
      expect(all<any>("SELECT id FROM assets WHERE project_id=? AND role='logo' AND origin='upload'", pid).length).toBe(1);
    } finally { startDeps.fetchImpl = undefined; }
  });

  it("refonte avec un logo qui contient le nom : le nom est gardé aussi, le projet prend le vrai nom, le slogan est mémorisé mot pour mot", async () => {
    const { withoutIds } = await import("@/lib/syna-agent/tools/start");
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Bougies parfumées artisanales en cire de soja." }] });
    await call("start.answer", ctx, { answers: [{ field: "existing", value: "Marque : Brume d'Ambre. Logo joint (pièce 842che1vm4a9rb04 : monogramme BA)." }] });
    expect(J.journeyOf(cid).start.existing?.value).toBe("Marque : Brume d'Ambre. Logo joint (monogramme BA).");
    const keep = await call("start.keep", ctx, { keep: ["logo", "slogan"], name: "Brume d'Ambre", slogan: "Le parfum des heures douces." });
    expect(keep.summary).toMatch(/je garde donc aussi le nom/);
    expect(J.journeyOf(cid).keep).toEqual(["logo", "slogan", "nom"]);
    await call("start.answer", ctx, { answers: ["audience", "image", "setup", "market", "price", "difference", "taste", "photos", "language", "contact", "platform"].map((f) => ({ field: f, value: f === "audience" ? "Femmes de 30 à 50 ans." : f === "platform" ? "shopify" : `réponse ${f}` })) });
    const ok = await (await import("./faits-fixtures")).avecLesFaitsDemandes(ctx, () => call("start.confirm", ctx, {}));
    expect(ok.ok).toBe(true);
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    expect(loadProject(pid).name).toBe("Brume d'Ambre");
    expect(one<any>("SELECT value FROM memory WHERE project_id=? AND key='syna.slogan'", pid).value).toBe("Le parfum des heures douces.");
    expect((stateOf(pid)!.stages as any).brief.data.input.brandName).toBe("Brume d'Ambre");
    expect(withoutIds("Logo joint (842che1vm4a9rb04). Prix : 32 €.")).toBe("Logo joint. Prix : 32 €.");
    // Nom confirmé APRÈS la validation (cas vu en réel) : le projet prend quand même le vrai nom.
    await call("start.keep", ctx, { keep: ["logo", "slogan", "nom"], name: "Brume d'Ambre Atelier", slogan: "Le parfum des heures douces." });
    expect(loadProject(pid).name).toBe("Brume d'Ambre Atelier");
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

  it("chaque réponse du client est lue par SINA elle-même, avec le modèle le plus fort : plus aucune réponse écrite sans IA", async () => {
    const { addMessage } = await import("@/lib/syna-agent/store");
    const { DEFAULT_MODELS } = await import("@/lib/syna-agent/models");
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "services" }, { field: "offer", value: "Coaching sportif à domicile." }] });
    addMessage(cid, "assistant", { message: "Bien reçu.", actions: [], question: { text: "As-tu déjà quelque chose ?" }, done: false, askField: "existing", step: 0 }, null);
    const r = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text: "Rien, je pars de zéro" });
    const seen: any[] = [];
    await fr(() => runAgent(r.id, r.job_id!, { reason: async (c) => {
      // Rien n'est enregistré avant elle : c'est SINA qui lit la réponse et qui la note.
      expect(J.journeyOf(cid).start.existing).toBeUndefined();
      seen.push(c.routing?.prefer);
      // Variété : SINA voit les débuts de ses derniers messages pour ne pas les répéter.
      expect(String(c.context)).toMatch(/Débuts de tes derniers messages .*« Bien reçu\.… »/);
      return { message: "On part de zéro ensemble.", actions: [{ tool: "start.answer", args: { answers: [{ field: "existing", value: "Rien, je pars de zéro" }] } }], question: { text: "À qui t'adresses-tu ?" }, done: false, askField: "audience" };
    } }));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ model: DEFAULT_MODELS.strong.model, effort: "medium" });
    expect(J.journeyOf(cid).start.existing?.value).toMatch(/je pars de zéro/);
    expect(getRun(r.id)!.status).toBe("waiting_user");
  });

  it("rien n'est enregistré que le client n'ait dit : un sujet qu'il n'a pas abordé est refusé, sauf celui que SINA venait de demander", async () => {
    const { addMessage } = await import("@/lib/syna-agent/store");
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    addMessage(cid, "assistant", { message: "D'accord.", actions: [], question: { text: "As-tu tes propres photos ?" }, done: false, askField: "photos", step: 0 }, null);
    addMessage(cid, "user", { text: "Oui, j'ai des photos de mon atelier, je te les envoie demain." }, null);
    // Elle répondait sur ses photos : la langue du site n'a jamais été dite.
    const refused = await call("start.answer", ctx, { answers: [{ field: "photos", value: "Oui, photos de l'atelier, envoyées demain" }, { field: "language", value: "Français seulement" }] });
    expect(refused).toMatchObject({ ok: false, internal: true });
    expect(refused.summary).toMatch(/« Langue du site » : le client ne l'a pas dit/);
    expect(J.journeyOf(cid).start.photos).toBeUndefined();
    // « Plus tard » ne s'invente pas non plus.
    expect(await call("start.answer", ctx, { answers: [{ field: "contact", value: "", status: "later" }] })).toMatchObject({ ok: false });
    // Le sujet demandé passe, même en un mot ; un autre sujet passe s'il reprend ses mots.
    expect(await call("start.answer", ctx, { answers: [{ field: "photos", value: "Oui" }] })).toMatchObject({ ok: true });
    addMessage(cid, "user", { text: "Et je vends surtout à Lyon, sur les marchés." }, null);
    expect(await call("start.answer", ctx, { answers: [{ field: "market", value: "Lyon, sur les marchés" }] })).toMatchObject({ ok: true });
    // Le genre d'activité se déduit de ce qu'il raconte.
    expect(await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }] })).toMatchObject({ ok: true });
  });

  it("notes libres : tout autre fait utile se note par sujet, avec ses mots, et suit dans le projet", async () => {
    const { addMessage } = await import("@/lib/syna-agent/store");
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    addMessage(cid, "user", { text: "J'ai commencé après dix ans comme mécanicien chez un vélociste." }, null);
    expect(await call("start.note", ctx, { notes: [{ sujet: "Son histoire", value: "Dix ans comme mécanicien chez un vélociste avant de se lancer." }] })).toMatchObject({ ok: true });
    expect(await call("start.note", ctx, { notes: [{ sujet: "Ses concurrents", value: "Deux ateliers en centre-ville, plus chers." }] })).toMatchObject({ ok: false, internal: true });
    const F = await import("@/lib/syna-agent/fiche");
    expect(F.ficheOf(cid).notes).toMatchObject([{ sujet: "Son histoire", genre: "fait", portee: "tout" }]);
    // Le même sujet remplace la note précédente.
    addMessage(cid, "user", { text: "Plutôt douze ans, en fait, comme mécanicien." }, null);
    await call("start.note", ctx, { notes: [{ sujet: "son histoire", value: "Douze ans comme mécanicien." }] });
    expect(F.ficheOf(cid).notes).toHaveLength(1);
    expect(J.journeyContext(J.journeyOf(cid), { notes: F.ficheOf(cid).notes })).toMatch(/Tes notes \(autres faits qu'il a donnés\) : son histoire : « Douze ans comme mécanicien\. »/);
    // Les sujets déjà notés ne sont plus proposés.
    expect(J.extraTopics(J.journeyOf(cid), F.ficheOf(cid).notes).join(" ")).not.toMatch(/son histoire/);
  });

  it("vocabulaire du client : un mot qu'il corrige est retenu pour toujours", async () => {
    const { loadWordingRules } = await import("@/lib/client-wording");
    const { project } = await import("./conversation209-fixtures");
    const user = await account();
    const pid = project(user), cid = threadFor(user, pid), ctx = ctxOf(user, cid);
    expect(await call("client.wording", ctx, { avoid: "chronographe", use: "montre" })).toMatchObject({ ok: true });
    expect(loadWordingRules(pid)).toMatchObject([{ avoid: "chronographe", use: "montre" }]);
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
    expect(seen[0]).toMatch(/Parcours du client, en 9 étapes : 1\. Faire connaissance = doing ; 2\. La marque = todo/);
    expect(seen[0]).toMatch(/Il en est à l'étape 1 \(« Faire connaissance »\)/);
    // Plus de question imposée : les sujets à aborder, dans l'ordre qu'elle choisit.
    expect(seen[0]).not.toMatch(/Prochaine question à poser/);
    expect(seen[0]).toMatch(/Sujets de la fiche pas encore abordés .*business — s'il vend des produits ou propose des services/);
    expect(seen[0]).toMatch(/Autres sujets utiles pour ce métier/);
    const view = openThread(user, null) as any;
    // À l'écran : les neuf étapes du client ; le repère interne reste disponible pour le Studio.
    expect(view.journey.current).toBe(1);
    expect(view.journey.internal).toBe(0);
    expect(view.journey.steps).toHaveLength(9);
    expect(view.journey.steps[0]).toMatchObject({ n: 1, fr: "Faire connaissance", status: "doing", ready: true });
    expect(view.journey.steps[6]).toMatchObject({ n: 7, fr: "La communication", status: "todo", ready: false });
    run("SELECT 1");
  });
  it("essai réel du 14 novembre 2026, SINA seule : une question posée attend sa réponse, nom provisoire neutre, pas de nom d'entreprise demandé, nombre exact d'identités", async () => {
    const { provisionalName } = await import("@/lib/syna-agent/tools/start");
    expect(provisionalName("Je répare les crevaisons, je règle les freins et les vitesses")).toBe("Mon projet");
    expect(provisionalName("Je suis coach sportif. Je fais des séances à domicile.")).toBe("Coach sportif");
    // Partir de zéro : le nom viendra avec l'identité ; une refonte qui garde son nom le donne.
    const fresh = J.emptyJourney();
    expect(J.TOPICS.contact(fresh).fr).not.toMatch(/nom de l'entreprise/);
    expect(J.TOPICS.contact(fresh).fr).toMatch(/son nom viendra avec sa marque, ne le lui demande pas/);
    // Garder ses photos n'est pas garder son nom : le nom ne se demande que s'il le garde.
    const photos = { ...J.emptyJourney(), mode: "refonte" as const, keep: ["photos" as const] };
    expect(J.TOPICS.contact(photos).fr).not.toMatch(/nom de l'entreprise/);
    const refonte = { ...J.emptyJourney(), mode: "refonte" as const, keep: ["nom" as const] };
    expect(J.TOPICS.contact(refonte).fr).toMatch(/nom de l'entreprise/);
    // Fiche complète : les autres sujets utiles restent proposés avant le résumé.
    const full = J.emptyJourney();
    for (const f of J.START_FIELDS) if (f !== "keep") full.start[f] = { value: f === "business" ? "products" : f === "existing" ? "Rien" : `réponse ${f}`, status: "answered", source: "client", at: 1 };
    expect(J.journeyContext(full)).toMatch(/Avant le résumé, il te reste des sujets utiles pour ce métier[^.]*comment c'est fabriqué/);
    const notes = J.extraTopics(full).map((t) => ({ sujet: t.split(" :")[0], value: "dit", at: 1 }));
    expect(J.journeyContext(full, { notes })).toMatch(/Tous les sujets ont été abordés\. S'il te manque encore quelque chose d'important, demande-le ; sinon, fais le RÉSUMÉ complet/);
    // Étape 1 : le nombre exact d'identités du client, jamais « deux à quatre ».
    const j1 = J.emptyJourney(); J.setStep(j1, 0, "done");
    expect(J.journeyContext(j1, { identityCount: 3 })).toMatch(/3 identités pour ce client \(son forfait\) : annonce 3, jamais « deux à quatre »/);
    expect(J.journeyContext(j1)).toMatch(/2, 3 ou 4 selon le forfait du client/);
    // Question posée ET outil réussi dans la même réponse : SINA attend la réponse, sans second tour ni question répétée.
    const user = await account();
    const cid = threadFor(user, null);
    const r = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text: "Je propose des services : je répare les vélos chez les gens." });
    let calls = 0;
    await fr(() => runAgent(r.id, r.job_id!, { reason: async () => {
      calls++;
      if (calls > 1) return { message: "Merci, c'est noté.", actions: [], question: { text: "Qu'est-ce qui te rend différent ?" }, done: false };
      return { message: "C'est noté.", actions: [{ tool: "start.answer", args: { answers: [{ field: "business", value: "services" }] } }], question: { text: "Qu'est-ce qui te distingue ?" }, done: false };
    } }));
    expect(calls).toBe(1);
    expect(getRun(r.id)!.status).toBe("waiting_user");
    const said = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='assistant'", cid).map((m) => json<any>(m.content_json, {}).question?.text).filter(Boolean);
    expect(said).toEqual(["Qu'est-ce qui te distingue ?"]);
  });
});

describe("SINA — faire connaissance : ce que le Studio lit dans les mots du client, et le modèle de SINA", async () => {
  const J = await import("@/lib/syna-agent/journey");
  const { modelFor } = await import("@/lib/syna-agent/loop");
  const { DEFAULT_MODELS } = await import("@/lib/syna-agent/models");
  const { productCountFrom, contactModesFrom } = await import("@/lib/syna-agent/tools/start");

  it("organisation : modes de contact et nombre de produits lus dans les mots du client, dans son ordre", () => {
    expect(contactModesFrom("Réservation en ligne surtout, sinon un appel")).toEqual(["booking", "call"]);
    expect(contactModesFrom("une demande de devis")).toEqual(["quote"]);
    expect(contactModesFrom("devis en ligne")).toEqual(["quote"]);
    expect(contactModesFrom("Par téléphone, ou un devis")).toEqual(["call", "quote"]);
    expect(productCountFrom("Un seul produit pour commencer")).toBe(1);
    expect(productCountFrom("Environ 12 produits")).toBe(12);
    expect(productCountFrom("Une dizaine")).toBe(10);
    expect(productCountFrom("une vingtaine de bougies")).toBe(20);
    expect(productCountFrom("Un seul au début, 5 ensuite")).toBe(1);
    expect(productCountFrom("je ne sais pas")).toBeNull();
  });

  it("le résumé va dans le message (sans limite gênante) et la question de validation reste courte : jamais un résumé coupé", async () => {
    // Essai réel du 15 novembre : un résumé de 1 200 caractères mis dans la question a été coupé au milieu d'une phrase.
    const full = J.emptyJourney();
    for (const f of J.START_FIELDS) full.start[f] = { value: "x", status: "answered", source: "client", at: 1 };
    full.start.business = { value: "products", status: "answered", source: "client", at: 1 };
    expect(J.journeyContext(full)).toMatch(/RÉSUMÉ complet[^.]*dans « message » ; la question reste courte/);
    const { StepSchema } = await import("@/lib/syna-agent/loop");
    const long = "• rubrique : une phrase du client. ".repeat(80);
    expect(long.length).toBeGreaterThan(1200);
    expect(StepSchema.safeParse({ message: long, question: { text: "Est-ce juste ?", choices: ["Oui, c'est juste"] } }).success).toBe(true);
    expect(StepSchema.safeParse({ message: "", question: { text: long.slice(0, 3000) } }).success).toBe(true);
  });

  it("modèle de SINA : le plus fort à chaque étape, ouverte ou non, pour tous les clients", () => {
    for (let step = 0; step <= 13; step++) expect(modelFor(step), `étape ${step}`).toMatchObject({ model: DEFAULT_MODELS.strong.model });
    expect(modelFor(7, { customTheme: true })).toMatchObject({ model: DEFAULT_MODELS.strong.model });
  });

  it("les neuf étapes du client couvrent tous les repères internes, une seule fois chacun", () => {
    const covered = J.PHASES.flatMap((p) => [...p.steps]).sort((a, b) => a - b);
    expect(covered).toEqual(J.JOURNEY_STEPS.map((s) => s.n));
    expect(J.PHASES.map((p) => p.fr)).toEqual(["Faire connaissance", "La marque", "Les angles", "L'activité", "Le site", "La mise en ligne", "La communication", "La publicité", "Dans la durée"]);
    const j = J.emptyJourney();
    expect(J.phaseStatus(j, J.PHASES[0])).toBe("doing");
    for (const n of [0, 1]) J.setStep(j, n, "done");
    J.setStep(j, 2, "review");
    expect(J.phaseStatus(j, J.PHASES[0])).toBe("done");
    expect(J.phaseStatus(j, J.PHASES[1])).toBe("review");
    expect(J.phaseOf(3).n).toBe(2);
    expect(J.phaseStatus(j, J.PHASES[2])).toBe("todo");
  });

  it("sujets en plus selon le métier : une boutique et un prestataire n'ont pas les mêmes", () => {
    const shop = J.emptyJourney(); shop.start.business = { value: "products", status: "answered", source: "client", at: 1 };
    const pro = J.emptyJourney(); pro.start.business = { value: "services", status: "answered", source: "client", at: 1 };
    expect(J.extraTopics(shop).join(" ; ")).toMatch(/comment c'est fabriqué/);
    expect(J.extraTopics(pro).join(" ; ")).toMatch(/comment se passe une prestation/);
    expect(J.extraTopics(pro).join(" ; ")).not.toMatch(/fabriqué/);
  });
});
