/**
 * SINA — étape 9, publications (carte des spécialistes, lot 5) : la stratège des contenus écrit le plan des 3 groupes,
 * le Studio le contrôle sans IA, un juge séparé le juge, une reprise au plus ; les images passent ensuite par le moteur
 * de publications du Studio. L'étape est FERMÉE par défaut (réglage « sina.etapes_ouvertes »). Aucun appel d'IA.
 */
import { afterEach, describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — étape 9 : le plan des publications, jugé avant toute image", async () => {
  const { all, json, one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { setJsonSetting, setSetting } = await import("@/lib/settings");
  const { loadProject } = await import("@/lib/projects");
  const { createUser } = await import("@/lib/auth");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { grantProjectPlan } = await import("./communication-choice-fixture");
  const { chooseGeneralistForTest } = await import("./strategy-choice-fixture");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool, toolVisible, toolCatalog } = await import("@/lib/syna-agent/registry");
  const J = await import("@/lib/syna-agent/journey");
  const P = await import("@/lib/syna-agent/posts-plan");
  const { routedCatalog } = await import("@/lib/syna-agent/conversation");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const scope = { inJourney: true, legacyMockups: false };

  afterEach(() => { setSetting("sina.etapes_ouvertes", null); for (const k of ["plan", "judge", "fix"] as const) delete P.postsPlanDeps[k]; });

  const group = (o: Partial<import("@/lib/syna-agent/posts-plan").PostGroup> = {}) => ({
    angleId: "generalist", subject: "conseil" as const, title: "Thé du matin : trois gestes simples", points: ["Chauffe l'eau sans la faire bouillir", "Laisse infuser sans regarder l'heure", "Bois la première gorgée assis"], cta: "Enregistre ce mémo",
    caption: "Le matin n'a pas besoin d'aller vite. Trois gestes, une tasse chaude, et la journée commence à ton rythme, avant le bruit et les écrans.",
    hashtags: ["#thedumatin", "#rituelthe", "#pausethe", "#theenvrac", "#matincalme"], visual: "Photographie d'ambiance vue de trois quarts : une tasse en grès fumante posée sur une table en bois près d'une fenêtre, lumière dorée du matin, la partie gauche reste calme pour le titre.",
    look: "Plan rapproché, tons chauds et dorés, photo d'ambiance.", product: null, ...o,
  });
  const three = () => [group(), group({ subject: "coulisses", title: "Dans l'atelier : le tri des feuilles", hashtags: ["#atelierthe", "#feuillesdethe", "#savoirfaire", "#theartisanal", "#coulisses"], look: "Plan large, tons verts, photo de lieu." }), group({ subject: "question", title: "Sucré ou nature : ton camp ?", hashtags: ["#teamthe", "#thenature", "#debatthe", "#pausegourmande", "#tonavis"], look: "Vue de dessus, tons clairs, composition graphique." })];
  const keepAll = { groups: [0, 1, 2].map((index) => ({ index, verdict: "garde", why: "Il tient.", fixes: [] })), overall: "Trois publications nettes." };

  /** Projet réel du Studio (stratégie choisie), fil au parcours avancé jusqu'à l'étape 9, angle « generalist » choisi. */
  async function ready() {
    const u = await createUser(`sina-posts-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "SINA");
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    grantProjectPlan(p.id, "dominer");
    chooseGeneralistForTest(p.id);
    const user = one<any>("SELECT * FROM users WHERE id=?", u.id);
    const cid = threadFor(user, p.id);
    J.updateJourney(cid, (x) => {
      x.outside = false;
      for (let n = 0; n <= 8; n++) J.setStep(x, n, "done");
      x.angles = { list: [{ id: "generalist", title: "La pause qui t'appartient", audience: "Adultes fatigués", motivation: "Un instant à soi", message: "Cinq minutes rien qu'à toi.", emotion: "sérénité", proofsToConfirm: [], arguments: [], sources: [], goal: "", why: "", story: "Un matin ordinaire.", show: "", organicExample: "", cta: "" }], recommendedId: "generalist", recommendation: "", sourceCount: 5, at: 1 } as any;
      x.angleChoice = { id: "generalist", ids: ["generalist"], at: 1 };
    });
    const ctx = { user, conversationId: cid, runId: `run-${Math.random()}`, projectId: p.id, attachment: () => null } as any;
    const job = (payload: object = {}) => ({ job: { id: `job-${Math.random()}` }, payload: { projectId: p.id, conversationId: cid, capMicro: P.POSTS_PLAN_MAX_MICRO, ...payload }, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() }) as any;
    return { p, cid, ctx, job, user };
  }

  it("l'étape 9 est fermée par défaut : ni annoncée prête, ni outil proposé ; le propriétaire l'ouvre par un réglage", () => {
    expect(J.stepReady(8)).toBe(true);
    expect(J.stepReady(9)).toBe(false);
    for (const name of ["posts.plan", "posts.create", "posts.validate"]) expect(toolVisible(name, scope)).toBe(false);
    expect(toolCatalog(true, scope)).not.toMatch(/### posts\.plan/);
    expect(toolCatalog(true, scope)).toMatch(/### posts\.list/); // les outils d'avant restent
    const j = J.emptyJourney();
    for (let n = 0; n <= 8; n++) J.setStep(j, n, "done");
    expect(J.journeyContext(j)).toMatch(/L'étape 9 \(« .* »\) n'est pas encore disponible/);
    // Ouverte par le propriétaire, et seulement elle : une étape pas encore construite ne s'ouvre pas par le réglage.
    setJsonSetting("sina.etapes_ouvertes", [9, 10, 12]);
    expect(J.stepReady(9)).toBe(true);
    expect(J.stepReady(10)).toBe(false);
    expect(J.stepAvailable(j, 9)).toBe(true);
    expect(toolVisible("posts.plan", scope)).toBe(true);
    expect(J.journeyContext(j)).toMatch(/Publications : aucun plan encore/);
    expect(J.journeyContext(j)).toMatch(/Étape 9 \(3 groupes de publications\)[\s\S]*LE PLAN D'ABORD[\s\S]*jamais « ma stratège »/);
    expect(routedCatalog(true, scope, 9)).toMatch(/### posts\.plan — module publications/);
    setSetting("sina.etapes_ouvertes", "n'importe quoi");
    expect(J.stepReady(9)).toBe(false);
  });

  it("contrôles sans IA du plan : angle inconnu, hashtags (nombre, génériques vides), produit absent, même sujet, personne non autorisée", async () => {
    const { p } = await ready();
    expect(P.cleanHashtags(["the", "#the", "##Thé du matin", "#matin"])).toEqual(["#the", "#Théduma tin".replace(" ", ""), "#matin"]);
    const facts = { angleIds: ["generalist"], products: ["Sérum Éclat"], people: false };
    expect(P.planIssues(p, three(), facts)).toEqual([]);
    const bad = [group({ angleId: "inconnu" }), group({ subject: "conseil", title: "Autre titre : autre promesse", hashtags: ["#love", "#thedumatin", "#rituelthe", "#pausethe", "#matincalme"], product: "Produit inventé" }), group({ subject: "question", title: "Sucré ou nature : ton camp ?", hashtags: ["#un", "#deux"], visual: "Photographie d'une femme souriante qui tient une tasse près d'une fenêtre, lumière du matin, la partie gauche reste calme pour le titre." })];
    const issues = P.planIssues(p, bad, facts).map((x) => `${x.index}:${x.issue}`).join("\n");
    expect(issues).toMatch(/0:angle « inconnu » inconnu/);
    expect(issues).toMatch(/1:hashtags génériques vides à remplacer : #love/);
    expect(issues).toMatch(/1:produit « Produit inventé » absent du catalogue/);
    expect(issues).toMatch(/1:même sujet que le groupe 1/);
    expect(issues).toMatch(/2:2 hashtags : il en faut 5 à 15/);
    expect(issues).toMatch(/2:la photo décrit une personne/);
    expect(P.planIssues(p, bad, { ...facts, people: true }).map((x) => x.issue).join("\n")).not.toMatch(/décrit une personne/);
  });

  it("plan gardé : le juge lit les trois groupes en entier, le plan arrive dans le parcours, l'étape passe « à valider »", async () => {
    const { cid, job } = await ready();
    const seen: Record<string, string[]> = { plan: [], judge: [] };
    let fixes = 0;
    P.postsPlanDeps.plan = async (prompt) => { seen.plan.push(prompt); return { groups: three() }; };
    P.postsPlanDeps.judge = async (prompt) => { seen.judge.push(prompt); return keepAll; };
    P.postsPlanDeps.fix = async () => { fixes++; return { groups: [] }; };
    const out: any = await fr(() => P.runPostsPlanJob(job()));
    expect(fixes).toBe(0);
    expect(seen.judge).toHaveLength(1);
    expect(seen.plan[0]).toMatch(/ANGLES CHOISIS PAR LE CLIENT \(angleId exact\) :\n- generalist \(angle principal\) · « La pause qui t'appartient » · émotion : sérénité/);
    expect(seen.plan[0]).toMatch(/PERSONNES : aucune dans les photos/);
    for (const g of three()) expect(seen.judge[0]).toContain(g.title);
    expect(P.POSTS_PLAN_SYSTEM).toMatch(/TROIS groupes sans aucune ressemblance/);
    expect(P.POSTS_JUDGE_SYSTEM).toMatch(/Tu ne réécris rien/);
    const j = J.journeyOf(cid);
    expect(j.posts).toMatchObject({ round: 1, judged: "juges", overall: "Trois publications nettes.", notes: [] });
    expect(j.posts!.groups.map((g) => g.title)).toEqual(three().map((g) => g.title));
    expect(j.posts!.groups.some((g) => g.doubt)).toBe(false);
    expect(j.steps[9]?.status).toBe("review");
    expect(out).toMatchObject({ relus: true, avis: "Trois publications nettes." });
  });

  it("un groupe refusé par le juge et un autre par les contrôles : UNE reprise, relue ; ce qui reste refusé garde le doute", async () => {
    const { cid, job } = await ready();
    setJsonSetting("sina.etapes_ouvertes", [9]);
    const first = three();
    first[1] = { ...first[1], hashtags: ["#love", "#atelierthe", "#feuillesdethe", "#savoirfaire", "#coulisses"] };
    const judges: string[] = [], fixPrompts: string[] = [];
    P.postsPlanDeps.plan = async () => ({ groups: first });
    P.postsPlanDeps.judge = async (prompt) => {
      judges.push(prompt);
      return judges.length === 1
        ? { groups: [{ index: 0, verdict: "garde", why: "Il tient.", fixes: [] }, { index: 1, verdict: "garde", why: "Il tient.", fixes: [] }, { index: 2, verdict: "reprendre", why: "C'est une question vide, on n'apprend rien.", fixes: ["Pose une question qui révèle une habitude du lecteur."] }], overall: "Deux tiennent." }
        : { groups: [{ index: 1, verdict: "garde", why: "Corrigé.", fixes: [] }, { index: 2, verdict: "reprendre", why: "Toujours une question vide.", fixes: ["Repars d'un moment précis de la journée."] }], overall: "Le troisième reste faible." };
    };
    P.postsPlanDeps.fix = async (prompt) => { fixPrompts.push(prompt); return { groups: [{ index: 1, group: { ...first[1], hashtags: ["#atelierthe", "#feuillesdethe", "#savoirfaire", "#theartisanal", "#coulisses"] } }, { index: 2, group: { ...first[2], title: "Matin ou soir : ton heure du thé ?" } }] }; };
    await fr(() => P.runPostsPlanJob(job()));
    expect(fixPrompts).toHaveLength(1);
    expect(fixPrompts[0]).toMatch(/GROUPES À RÉÉCRIRE :[\s\S]*hashtags génériques vides à remplacer : #love[\s\S]*Pose une question qui révèle une habitude du lecteur\./);
    expect(fixPrompts[0]).toMatch(/GROUPES GARDÉS \(ne leur ressemble pas\) :\n\[\{"index":0/);
    // Le juge relit seulement ce qui a été réécrit.
    expect(judges).toHaveLength(2);
    expect(judges[1]).toMatch(/les groupes 2 et 3 viennent d'être réécrits/);
    const plan = J.journeyOf(cid).posts!;
    expect(plan.groups[1].hashtags).not.toContain("#love");
    expect(plan.groups[1].doubt).toBeUndefined();
    expect(plan.groups[2]).toMatchObject({ title: "Matin ou soir : ton heure du thé ?", doubt: "Toujours une question vide." });
    expect(plan.overall).toBe("Le troisième reste faible.");
    // SINA le lit dans son contexte, et le dira à la première personne.
    expect(J.journeyContext(J.journeyOf(cid))).toMatch(/Tu doutes de : groupe 3 « Matin ou soir : ton heure du thé \? » \(Toujours une question vide\.\)/);
  });

  it("juge en panne : le plan est montré comme non relu ; reprise en panne : le doute reste ; un second plan ne reprend pas les titres du premier", async () => {
    const { cid, job } = await ready();
    P.postsPlanDeps.plan = async () => ({ groups: three() });
    P.postsPlanDeps.judge = async () => { throw new Error("modèle indisponible"); };
    await fr(() => P.runPostsPlanJob(job()));
    expect(J.journeyOf(cid).posts).toMatchObject({ round: 1, judged: "non_juges" });
    expect(J.journeyOf(cid).posts!.notes.join(" ")).toMatch(/plan non jugé \(modèle indisponible\)/);
    const plans: string[] = [];
    P.postsPlanDeps.plan = async (prompt) => { plans.push(prompt); return { groups: three() }; };
    P.postsPlanDeps.judge = async () => ({ groups: [{ index: 0, verdict: "reprendre", why: "Trop proche d'une publicité.", fixes: ["Donne un vrai conseil, vérifiable."] }, { index: 1, verdict: "garde", why: "Il tient.", fixes: [] }, { index: 2, verdict: "garde", why: "Il tient.", fixes: [] }], overall: "" });
    P.postsPlanDeps.fix = async () => { throw new Error("coupure"); };
    await fr(() => P.runPostsPlanJob(job({ guidance: "Plus drôle, moins sage." })));
    const plan = J.journeyOf(cid).posts!;
    expect(plan.round).toBe(2);
    expect(plan.groups[0].doubt).toBe("Trop proche d'une publicité.");
    expect(plan.notes.join(" ")).toMatch(/reprise non faite \(coupure\)/);
    expect(plans[0]).toMatch(/PLAN PRÉCÉDENT \(le client n'en veut plus[\s\S]*- Thé du matin : trois gestes simples/);
    expect(plans[0]).toMatch(/DEMANDE DU CLIENT \(ses mots, prioritaire\) : « Plus drôle, moins sage\. »/);
  });

  it("outils : refusés tant que l'étape est fermée ; ouverte, posts.create pose les publications dans le moteur du Studio et lance SA production", async () => {
    const { p, cid, ctx } = await ready();
    const plan = getTool("posts.plan")!, create = getTool("posts.create")!, validate = getTool("posts.validate")!;
    expect(await fr(() => plan.run(ctx, {}))).toMatchObject({ ok: false, summary: expect.stringMatching(/pas encore ouverte/) });
    expect(await fr(() => create.run(ctx, create.args.parse({ networks: ["instagram"] })))).toMatchObject({ ok: false });
    setJsonSetting("sina.etapes_ouvertes", [9]);
    expect(await fr(() => plan.estimate!(ctx, {}))).toMatchObject({ maxMicro: P.POSTS_PLAN_MAX_MICRO, probableMicro: P.POSTS_PLAN_TYPICAL_MICRO });
    expect(await fr(() => create.run(ctx, create.args.parse({ networks: ["instagram"] })))).toMatchObject({ ok: false, summary: expect.stringMatching(/Aucun plan de publications encore/) });
    // Le plan lancé : une tâche, étape « en cours ».
    const started: any = await fr(() => plan.run(ctx, {}));
    expect(started.jobs).toHaveLength(1);
    expect(one<any>("SELECT type FROM jobs WHERE id=?", started.jobs[0]).type).toBe("syna.posts.plan");
    // Plan prêt (posé comme l'aurait fait la tâche) : les images sur deux réseaux.
    J.updateJourney(cid, (x) => { x.posts = { round: 1, groups: three(), judged: "juges", overall: "", notes: [], at: 1 }; J.setStep(x, 9, "review"); });
    expect(await fr(() => validate.run(ctx, {}))).toMatchObject({ ok: false, summary: expect.stringMatching(/Aucune publication n'a encore son image/) });
    const args = create.args.parse({ networks: ["instagram", "facebook"] });
    const est: any = await fr(() => create.estimate!(ctx, args));
    expect(est.maxMicro).toBeGreaterThanOrEqual(est.probableMicro);
    expect(est.probableMicro).toBeGreaterThan(0);
    expect(est.label).toMatch(/3 publications créées pour instagram, facebook \(6 images\)/);
    const made: any = await fr(() => create.run(ctx, args));
    expect(made.ok, made.summary).toBe(true);
    const created = J.journeyOf(cid).posts!.created!;
    expect(created.postIds).toHaveLength(6);
    expect(created.networks).toEqual(["instagram", "facebook"]);
    const rows = all<any>(`SELECT network,title,caption,hashtags,group_id,plan_id,brief,engine FROM posts WHERE id IN (${created.postIds.map(() => "?").join(",")})`, ...created.postIds);
    expect(new Set(rows.map((r) => r.group_id)).size).toBe(3); // un groupe = une publication déclinée par réseau
    expect(rows.every((r) => r.group_id === r.plan_id && r.engine === "v2")).toBe(true);
    expect(new Set(rows.map((r) => r.network))).toEqual(new Set(["instagram", "facebook"]));
    expect(rows.map((r) => json<any>(r.brief, {}).serie).sort()).toEqual(["Les coulisses", "Les coulisses", "Un conseil", "Un conseil", "Une question à la communauté", "Une question à la communauté"]);
    expect(rows.every((r) => /#\w+/.test(r.hashtags))).toBe(true);
    const job = one<any>("SELECT type,payload FROM jobs WHERE id=?", made.jobs[0]);
    expect(job.type).toBe("social.v2.produce");
    expect(json<any>(job.payload, {})).toMatchObject({ projectId: p.id, allowPaid: true, approvedEstimateMicro: est.probableMicro, maxCostEur: est.maxMicro / 1e6 });
    expect(json<any>(job.payload, {}).ids.sort()).toEqual([...created.postIds].sort());
    // Pas deux fois : les publications de ce plan existent déjà.
    expect(await fr(() => create.run(ctx, args))).toMatchObject({ ok: false, summary: expect.stringMatching(/déjà été créées/) });
  });
});
