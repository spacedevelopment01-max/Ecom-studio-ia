/**
 * SINA — étapes 10 à 13 (carte des spécialistes, lots 6 et 7) : publicités, calendrier, articles de blog, rangement.
 * Chaque étape est branchée sur le moteur du Studio qui existe déjà (ses spécialistes y sont) et reste FERMÉE tant que
 * le propriétaire ne l'a pas ouverte (réglage « sina.etapes_ouvertes »). Aucun appel d'IA : seules les tâches sont
 * mises en file, jamais exécutées.
 */
import { afterEach, describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — étapes 10 à 13 : publicités, calendrier, articles, rangement", async () => {
  const { json, one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { setJsonSetting, setSetting } = await import("@/lib/settings");
  const { loadProject } = await import("@/lib/projects");
  const { createUser } = await import("@/lib/auth");
  const { saveAsset } = await import("@/lib/library");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { grantProjectPlan } = await import("./communication-choice-fixture");
  const { chooseGeneralistForTest } = await import("./strategy-choice-fixture");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool, toolVisible } = await import("@/lib/syna-agent/registry");
  const { routedCatalog } = await import("@/lib/syna-agent/conversation");
  const J = await import("@/lib/syna-agent/journey");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const scope = { inJourney: true, legacyMockups: false };
  const NAMES: Record<number, string[]> = { 10: ["ads.create", "ads.validate"], 11: ["calendar.validate"], 12: ["blog.topics", "blog.write", "blog.validate"], 13: ["files.tidy", "files.validate"] };

  afterEach(() => setSetting("sina.etapes_ouvertes", null));

  /** Projet réel du Studio, parcours validé jusqu'à l'étape « upTo », angle choisi. */
  async function ready(upTo: number, plan: "dominer" | "vendre" = "dominer") {
    const u = await createUser(`sina-etapes-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "SINA");
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    grantProjectPlan(p.id, plan);
    chooseGeneralistForTest(p.id);
    const user = one<any>("SELECT * FROM users WHERE id=?", u.id);
    const cid = threadFor(user, p.id);
    J.updateJourney(cid, (x) => {
      x.outside = false;
      for (let n = 0; n <= upTo; n++) J.setStep(x, n, "done");
      x.angles = { list: [{ id: "generalist", title: "La pause qui t'appartient", audience: "Adultes fatigués", motivation: "Un instant à soi", message: "Cinq minutes rien qu'à toi.", emotion: "sérénité", proofsToConfirm: [], arguments: [], sources: [], goal: "", why: "", story: "", show: "", organicExample: "", cta: "" }], recommendedId: "generalist", recommendation: "", sourceCount: 5, at: 1 } as any;
      x.angleChoice = { id: "generalist", ids: ["generalist"], at: 1 };
    });
    const ctx = { user, conversationId: cid, runId: `run-${Math.random()}`, projectId: p.id, attachment: () => null } as any;
    const call = (name: string, args: unknown = {}) => fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args))) as Promise<any>;
    return { p, cid, ctx, call, user };
  }

  it("fermées par défaut, ouvertes une à une par le propriétaire ; leurs outils n'existent pour SINA que si l'étape est ouverte", async () => {
    for (const n of [10, 11, 12, 13]) { expect(J.stepReady(n)).toBe(false); for (const name of NAMES[n]) expect(toolVisible(name, scope), name).toBe(false); }
    // Les outils d'avant restent là (lecture des publicités, calendrier, fichiers).
    for (const name of ["ads.list", "calendar.plan", "files.list"]) expect(toolVisible(name, scope), name).toBe(true);
    const { call } = await ready(9);
    for (const [name, args] of [["ads.create", { platforms: ["meta_feed"] }], ["ads.validate", {}], ["calendar.validate", {}], ["blog.topics", {}], ["blog.write", { topic: "Comment choisir son sérum" }], ["blog.validate", {}], ["files.tidy", {}], ["files.validate", {}]] as const) expect(await call(name, args), name).toMatchObject({ ok: false, summary: expect.stringMatching(/pas encore ouverte/) });
    setJsonSetting("sina.etapes_ouvertes", [10]);
    expect(J.stepReady(10)).toBe(true);
    expect(J.stepReady(11)).toBe(false);
    expect(toolVisible("ads.create", scope)).toBe(true);
    expect(toolVisible("blog.write", scope)).toBe(false);
    setJsonSetting("sina.etapes_ouvertes", [9, 10, 11, 12, 13]);
    for (const n of [10, 11, 12, 13]) { expect(J.stepReady(n)).toBe(true); for (const name of NAMES[n]) expect(routedCatalog(true, scope, n)).toContain(`### ${name} — `); }
    // Chaque étape ouverte a sa consigne, relue par SINA.
    const j = J.emptyJourney();
    for (let n = 0; n <= 9; n++) J.setStep(j, n, "done");
    expect(J.journeyContext(j)).toMatch(/Étape 10 \(publicités images\)[\s\S]*ads\.validate avec skip: true/);
    J.setStep(j, 10, "skipped"); expect(J.journeyContext(j)).toMatch(/Étape 11 \(calendrier de publication[\s\S]*calendar\.validate/);
    J.setStep(j, 11, "done"); expect(J.journeyContext(j)).toMatch(/Étape 12 \(2 articles de blog\)[\s\S]*il publie lui-même/);
    J.setStep(j, 12, "done"); expect(J.journeyContext(j)).toMatch(/Étape 13 \(rangement des fichiers, gratuit et sans IA\)/);
  });

  it("étape 10 : devis de la campagne, forfait sans publicité dit simplement, étape passée sans rien créer, validation seulement avec une publicité contrôlée", async () => {
    setJsonSetting("sina.etapes_ouvertes", [9, 10, 11, 12, 13]);
    const low = await ready(9, "vendre");
    const refused = await low.call("ads.create", { platforms: ["meta_feed"] });
    expect(refused.ok).toBe(false);
    expect(refused.summary).toMatch(/forfait Dominer/);
    expect(refused.hint).toMatch(/sans insister[\s\S]*skip: true/);
    expect(await low.call("ads.validate", { skip: true })).toMatchObject({ ok: true, summary: expect.stringMatching(/Étape des publicités passée : rien n'a été créé/) });
    expect(J.journeyOf(low.cid).steps[10]?.status).toBe("skipped");
    expect(J.currentStep(J.journeyOf(low.cid))).toBe(11);

    const { p, cid, ctx, call } = await ready(9);
    const tool = getTool("ads.create")!, args = tool.args.parse({ platforms: ["meta_feed", "meta_story"] });
    const est: any = await fr(() => tool.estimate!(ctx, args));
    expect(est.probableMicro).toBeGreaterThan(0);
    expect(est.maxMicro).toBeGreaterThanOrEqual(est.probableMicro);
    expect(est.label).toMatch(/3 publicités images \(\d+ visuels\)/);
    expect(await call("ads.validate")).toMatchObject({ ok: false, summary: expect.stringMatching(/Aucune publicité n'a encore passé le contrôle/) });
    const started = await call("ads.create", args);
    if (started.ok) {
      // Le moteur de publicités du Studio est lancé tel quel, avec son plafond.
      const job = one<any>("SELECT type,payload FROM jobs WHERE id=?", started.jobs[0]);
      expect(job.type).toBe("ads.v2");
      expect(json<any>(job.payload, {})).toMatchObject({ projectId: p.id, costCapMicro: est.maxMicro, request: { count: 3, platforms: ["meta_feed", "meta_story"] } });
      expect(J.journeyOf(cid).ads).toMatchObject({ platforms: ["meta_feed", "meta_story"], count: 3 });
      expect(J.journeyOf(cid).steps[10]?.status).toBe("doing");
    } else {
      // Sans fournisseur d'IA dans cet essai : refusé honnêtement, rien lancé.
      expect(started.summary).toMatch(/IA|image|fournisseur|modèle/i);
      expect(J.journeyOf(cid).ads).toBeUndefined();
      J.updateJourney(cid, (x) => { x.ads = { jobId: "aucune", platforms: ["meta_feed"], count: 3, at: Date.now() - 1000 }; });
    }
    // Une publicité qui a passé le contrôle (image rangée par le moteur) : le client peut valider.
    const png = await (await import("sharp")).default({ create: { width: 40, height: 50, channels: 3, background: "#888" } }).png().toBuffer();
    await saveAsset({ projectId: p.id, userId: p.userId, data: png, name: "pub.png", mime: "image/png", role: "ad", origin: "generated" });
    expect(await call("ads.validate")).toMatchObject({ ok: true, summary: expect.stringMatching(/Publicités validées \(1\)/) });
    expect(J.journeyOf(cid).steps[10]?.status).toBe("done");
  });

  it("étape 11 : le calendrier ne se valide que s'il existe", async () => {
    setJsonSetting("sina.etapes_ouvertes", [9, 10, 11, 12, 13]);
    const { call } = await ready(10);
    expect(await call("calendar.validate")).toMatchObject({ ok: false, summary: expect.stringMatching(/Aucun calendrier encore/) });
  });

  it("étape 12 : matière des sujets sans IA, un article par appel sur le sujet du client, deux au plus, jamais deux fois le même", async () => {
    setJsonSetting("sina.etapes_ouvertes", [9, 10, 11, 12, 13]);
    const { p, cid, ctx, call } = await ready(11);
    const topics = await call("blog.topics");
    expect(topics.ok).toBe(true);
    expect(topics.data.angles).toEqual([{ titre: "La pause qui t'appartient", emotion: "sérénité", pour: "Adultes fatigués" }]);
    expect(Array.isArray(topics.data.sujets)).toBe(true);
    expect(topics.hint).toMatch(/Le client choisit, jamais toi/);
    const tool = getTool("blog.write")!;
    const est: any = await fr(() => tool.estimate!(ctx, tool.args.parse({ topic: "Comment choisir son sérum" })));
    expect(est.probableMicro).toBeGreaterThan(0);
    expect(est.maxMicro).toBeGreaterThan(est.probableMicro);
    expect(await call("blog.validate")).toMatchObject({ ok: false, summary: expect.stringMatching(/Aucun article n'est encore écrit/) });
    const first = await call("blog.write", { topic: "Comment choisir son sérum", brief: "Simple, sans jargon.", keyword: "choisir sérum visage", intent: "informationnelle" });
    expect(first.ok, first.summary).toBe(true);
    const job = one<any>("SELECT type,payload,project_id FROM jobs WHERE id=?", first.jobs[0]);
    expect(job.type).toBe("blog.write");
    expect(job.project_id).toBe(p.id);
    expect(json<any>(job.payload, {})).toMatchObject({ topic: "Comment choisir son sérum", brief: "Simple, sans jargon.", keyword: "choisir sérum visage", intent: "informationnelle" });
    expect(J.journeyOf(cid).blog).toMatchObject({ topics: ["Comment choisir son sérum"] });
    expect(await call("blog.write", { topic: "comment choisir son sérum" })).toMatchObject({ ok: false, summary: expect.stringMatching(/déjà été demandé/) });
    // La première tâche finie (simulé), le second article part ; le troisième est refusé.
    run("UPDATE jobs SET status='done' WHERE id=?", first.jobs[0]);
    const second = await call("blog.write", { topic: "Les erreurs à éviter avec un sérum" });
    expect(second.ok, second.summary).toBe(true);
    run("UPDATE jobs SET status='done' WHERE id=?", second.jobs[0]);
    expect(await call("blog.write", { topic: "Un troisième sujet en trop" })).toMatchObject({ ok: false, summary: expect.stringMatching(/Les 2 articles de cette étape ont déjà été demandés/) });
    expect(J.journeyContext(J.journeyOf(cid))).toMatch(/Articles demandés \(2 sur 2\) : « Comment choisir son sérum » ; « Les erreurs à éviter avec un sérum »/);
  });

  it("étape 13 : rangement gratuit et sans IA par la tâche du Studio, puis fin du parcours", async () => {
    setJsonSetting("sina.etapes_ouvertes", [9, 10, 11, 12, 13]);
    const { p, cid, call } = await ready(12);
    const png = await (await import("sharp")).default({ create: { width: 40, height: 40, channels: 3, background: "#777" } }).png().toBuffer();
    const loose = await saveAsset({ projectId: p.id, userId: p.userId, data: png, name: "sans-dossier.png", mime: "image/png", role: "social", origin: "generated" });
    run("UPDATE assets SET folder_id=NULL WHERE id=?", loose.id);
    const tidy = await call("files.tidy");
    expect(tidy.ok, tidy.summary).toBe(true);
    const job = one<any>("SELECT type,payload FROM jobs WHERE id=?", tidy.jobs[0]);
    expect(job.type).toBe("files.classify");
    expect(json<any>(job.payload, {})).toMatchObject({ projectId: p.id, localOnly: true, aiOff: true, costCapMicro: 0 });
    expect(await call("files.validate")).toMatchObject({ ok: true, summary: expect.stringMatching(/le parcours de création est terminé/) });
    expect(J.journeyOf(cid).steps[13]?.status).toBe("done");
  });
});
