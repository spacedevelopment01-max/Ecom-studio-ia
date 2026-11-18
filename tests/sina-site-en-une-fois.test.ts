/**
 * Lot 4 (16 novembre 2026) : le site du client, créé par SINA EN UNE FOIS. Un outil (site.create), une carte d'accord,
 * une tâche de fond reprenable qui conçoit le site, donne sa fiche à chaque produit, calcule le menu, le monte à la
 * marque, puis en fait la version du moteur des thèmes quand rien d'exemple n'y reste. Le client ne choisit ni thème, ni
 * famille, ni concept. IA simulée, aucun appel réel.
 */
import { describe, expect, it } from "vitest";
import type { Design } from "@/lib/syna-agent/custom-theme/design";
import * as F from "./tenue-fauteuil-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

const pick = (x: F.Instance) => ({ section: x.id, ...(x.construction ? { construction: x.construction } : {}), why: "Le moment où le visiteur a besoin de cela.", says: "Les vrais faits de la marque, sans rien inventer.", photos: "aucune" });
const DESIGN: Design = {
  visitor: "Une personne qui veut un coin à elle pour lire.", levers: ["ce que le produit change dans la journée", "sa silhouette"], objections: [],
  concept: "Le fauteuil dans sa niche : tout le site reprend l'arrondi du mur.", header: F.HEADER.id, headerConstruction: F.HEADER.construction, footer: F.FOOTER.id, search: null, corrections: [],
  tenue: { ...F.FAUTEUIL_TENUE },
  // La famille du Studio choisie d'après la planche (en coulisses). Le pied de page simple n'est pas dans ses choix.
  famille: "maison-chaleureuse", familleWhy: "Les tons chauds de la planche et sa police de titre fine.",
  pages: F.SITE.map((pg) => ({ key: pg.key, label: pg.label, journey: "Le visiteur arrive, comprend, ressent, puis agit sans hésiter.", sections: pg.sections.map(pick) })),
} as Design;

describe("SINA — le site créé en une fois (lot 4)", async () => {
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool, toolVisible } = await import("@/lib/syna-agent/registry");
  const J = await import("@/lib/syna-agent/journey");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const X = await import("@/lib/syna-agent/custom-theme/site-job");
  const { loadFamilyChoice } = await import("@/lib/syna-agent/section-families");
  const { saveBrand, currentTheme } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { createProduct } = await import("@/lib/products/catalog");
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  /** Un client prêt pour son site : fiche de départ, marque, un produit avec ses photos ; l'activité reste à valider. */
  async function client() {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Un fauteuil enveloppant en tissu terracotta." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Calme." }, { field: "setup", value: "1 produit" }, { field: "market", value: "France." },
      { field: "price", value: "à définir" }, { field: "difference", value: "Bien fait." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    ctx.projectId = pid;
    saveBrand(pid, F.FAUTEUIL_BRAND as any);
    const prod: string[] = [];
    for (const f of F.PRODUCT_PHOTOS) prod.push((await saveAsset({ projectId: pid, userId: user.id, data: await F.photo(f), name: f.replace(".webp", ".jpg"), mime: "image/jpeg", role: "original", origin: "upload" })).id);
    createProduct(pid, { title: "Fauteuil Alcôve terracotta", images: prod.map((assetId) => ({ assetId })) } as any);
    J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4]) J.setStep(x, n, "done"); J.setStep(x, 5, "todo"); });
    return { user, cid, ctx, pid };
  }
  /** Tâche de fond simulée, avec ses points de reprise. */
  const jobCtx = (id: string, payload: unknown, checkpoint: Record<string, unknown> = {}) => ({
    job: { id }, payload, checkpoint, progress: () => undefined,
    step: async (k: string, fn: () => Promise<unknown>) => { if (k in checkpoint) return checkpoint[k]; const v = await fn(); checkpoint[k] = JSON.parse(JSON.stringify(v ?? null)); return v; },
  }) as any;

  it("un seul outil, un seul devis ; les anciennes façons ne sont plus proposées ; la consigne ne parle que du site", () => {
    const tool = getTool("site.create")!;
    expect(tool.kind).toBe("generate");
    expect(tool.description).toMatch(/un seul prix annoncé, un seul accord/);
    expect(tool.description).not.toMatch(/maquette/i);
    const scope = { inJourney: true, legacyMockups: false };
    expect(toolVisible("site.create", scope)).toBe(true);
    for (const n of ["site.mode", "theme.propose", "theme.choose", "theme.family", "custom.concepts", "custom.design"]) expect(toolVisible(n, scope), n).toBe(false);
    // Devis : la taille se calcule d'après les partitions du cahier (17 novembre 2026) ; chaque produit en plus compte ses fiches.
    // (Avant le minimum de dix sections par page, un site de services était compté plus petit qu'une boutique : ce n'est
    // plus vrai, ses pages de prestation, à propos, contact et questions ont chacune dix moments.)
    T.customPhotoDeps.unit = () => 150_000;
    try {
      const one1 = X.siteQuote({ business: "products", products: 1 }), four = X.siteQuote({ business: "products", products: 4 }), svc = X.siteQuote({ business: "services", products: 1 });
      expect(four.maxMicro).toBeGreaterThan(one1.maxMicro);
      expect(X.siteSizeGuess({ business: "services", products: 1 }).sections).toBeGreaterThan(44);
      expect(X.siteSizeGuess({ business: "products", products: 1 }).sections).toBeGreaterThan(48);
      for (const q of [one1, four, svc]) { expect(q.probableMicro!).toBeGreaterThan(0); expect(q.probableMicro!).toBeLessThanOrEqual(q.maxMicro); expect(q.label).toMatch(/ton site entier/); }
      // Au-delà de douze fiches, les produits suivants gardent la fiche commune : le devis ne grandit plus.
      expect(X.siteQuote({ business: "products", products: 40 }).maxMicro).toBe(X.siteQuote({ business: "products", products: 30 }).maxMicro); // (même genre d'accueil : au-delà de 24 produits, le catalogue)
    } finally { delete T.customPhotoDeps.unit; }
  });

  it("refusé avant l'activité validée ; lancé ensuite : une tâche, le plafond du devis, l'étape en cours", async () => {
    const { ctx, cid, pid } = await client();
    T.customPhotoDeps.unit = () => 150_000;
    try {
      const early = await call("site.create", ctx, {});
      expect(early.ok).toBe(false);
      expect(early.summary).toMatch(/activité/);
      J.updateJourney(cid, (x) => J.setStep(x, 5, "done"));
      // Depuis le 17 novembre 2026 : le site ne se lance qu'une fois la question des preuves répondue (ici : « aucune »).
      await call("memory.note", ctx, { kind: "fact", key: "preuves", value: "aucune pour l'instant" });
      const est = await fr(() => getTool("site.create")!.estimate!(ctx, {}));
      const r = await call("site.create", ctx, { consigne: "Qu'on ait envie de s'asseoir." });
      expect(r.ok, r.summary).toBe(true);
      expect(r.jobs).toHaveLength(1);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs[0]);
      expect(job.type).toBe("syna.site");
      const payload = JSON.parse(job.payload);
      expect(payload).toMatchObject({ projectId: pid, conversationId: cid, capMicro: est.maxMicro, consigne: "Qu'on ait envie de s'asseoir." });
      expect(J.journeyOf(cid).steps[6].status).toBe("doing");
      // Une seule création à la fois.
      expect((await call("site.create", ctx, {})).summary).toMatch(/déjà en cours/);
    } finally { delete T.customPhotoDeps.unit; }
  });

  it("la tâche conçoit sans question de famille, range le site, le monte dans le plafond, et rend un compte rendu honnête ; une reprise ne repaie pas la conception", async () => {
    const { ctx, cid, pid, user } = await client();
    J.updateJourney(cid, (x) => J.setStep(x, 5, "done"));
    expect(loadFamilyChoice(pid)).toBeNull();
    let designs = 0;
    const builds: any[] = [];
    T.customDesignDeps.call = async () => { designs++; return DESIGN; };
    X.siteJobDeps.estimate = () => ({ maxMicro: 2_000_000, label: "montage" });
    X.siteJobDeps.build = async (c: any) => { builds.push(c.payload); return { sections: 9, photosMade: 2, photosFailed: 1, problems: ["photo de l'accueil : aucun visuel validé"], relecture: { reprises: 1, refusees: 0, avis: "bon" } }; };
    // Le contrôle par l'image (controle-image.ts) a ses propres essais : ici, il rend « différent » sans navigateur.
    X.siteJobDeps.image = async () => ({ statut: "passe", avant: 30, note: 30, seuil: 48, compares: 1, nonCompares: 0, changements: [] });
    try {
      const payload = { projectId: pid, userId: user.id, conversationId: cid, runId: ctx.runId, capMicro: 9_000_000, consigne: null };
      const cp: Record<string, unknown> = {};
      const out: any = await fr(() => X.runSinaSiteJob(jobCtx("job-site-1", payload, cp)));
      // La famille est restée en coulisses : jamais demandée, le socle commun.
      expect(loadFamilyChoice(pid)?.family).toBe("classique");
      const t = S.loadCustomTheme(pid)!;
      expect(t.pages.map((p) => p.key)).toEqual(F.SITE.map((p) => p.key));
      expect(t.tenue).toMatchObject({ ...F.FAUTEUIL_TENUE, cadre: "droit" }); // jamais de photo dans une arche : le cadre « niche » devient droit
      expect(t.chosen).toBeFalsy();
      // Le site est fait dans SA famille : le concepteur (simulé) avait gardé un pied de page hors de ses choix, même
      // après sa reprise ; le Studio l'y ramène sans appel de plus. La famille est gardée avec le site.
      expect(t.famille).toBe("maison-chaleureuse");
      expect(t.footer).toMatchObject({ id: "tn-pied-complet", construction: "colonnes" });
      expect(t.header).toMatchObject({ id: "tn-entete", construction: "centre" });
      // Montage : toutes les pages, dans ce qui reste du plafond ; la création se fait SINA + photos (aucune image du client hors produit).
      expect(builds).toHaveLength(1);
      expect(builds[0]).toMatchObject({ projectId: pid, conversationId: cid, photos: true, newPhotos: true, pages: null, rewrite: false });
      expect(builds[0].capMicro).toBeLessThanOrEqual(9_000_000);
      // Compte rendu : rangé en entier dans le parcours, l'essentiel rendu par la tâche.
      const j = J.journeyOf(cid);
      expect(j.steps[6].status).toBe("review");
      expect(j.site!.report.concept).toMatch(/niche/);
      expect(j.site!.report.signe).toBe(F.FAUTEUIL_TENUE.signe);
      // Le compte rendu garde la famille en coulisses, et la consigne interdit à SINA d'en dire le nom.
      expect(j.site!.report.controleImage).toMatch(/^comparé en image à 1 site\(s\) du Studio : différent/);
      expect("ressemblance" in j.site!.report).toBe(false);
      expect(j.site!.report.styleEnCoulisses).toEqual({ famille: "maison-chaleureuse", pourquoi: "Les tons chauds de la planche et sa police de titre fine." });
      expect(J.STEP_GUIDES[6]).toMatch(/le nom de la famille est un mot de coulisses, tu ne le dis JAMAIS/);
      expect(j.site!.report.montage).toMatchObject({ sections: 9, photosMade: 2, photosFailed: 1, problems: ["photo de l'accueil : aucun visuel validé"] });
      // Rien d'exemple ne part : le montage simulé a laissé les textes et les photos d'exemple, le site n'est donc PAS
      // devenu la version du moteur, et ce qui manque est listé.
      expect(j.site!.report.pret).toBe(false);
      expect(j.site!.report.aCompleter.length).toBeGreaterThan(0);
      expect(out.pret).toBe(false);
      expect(JSON.stringify(out).length).toBeLessThan(1500); // le fil coupe le résultat d'une tâche : il reste court
      // SINA relit le compte rendu entier à l'étape du site.
      expect(J.journeyContext(j)).toMatch(/COMPTE RENDU DE LA CRÉATION[^]*aucun visuel validé/);
      // Reprise après une coupure : la conception payée n'est pas refaite.
      const before = designs;
      await fr(() => X.runSinaSiteJob(jobCtx("job-site-1", payload, cp)));
      expect(designs).toBe(before);
    } finally { delete T.customDesignDeps.call; delete X.siteJobDeps.estimate; delete X.siteJobDeps.build; delete X.siteJobDeps.image; }
  });

  it("plafond serré : les photos sont créées d'abord pour l'accueil et la page qui vend, et le compte rendu le dit", async () => {
    const { ctx, cid, pid, user } = await client();
    J.updateJourney(cid, (x) => J.setStep(x, 5, "done"));
    const builds: any[] = [];
    T.customDesignDeps.call = async () => DESIGN;
    X.siteJobDeps.estimate = () => ({ maxMicro: 50_000_000, label: "montage" });
    X.siteJobDeps.build = async (c: any) => { builds.push(c.payload); return { sections: 9 }; };
    X.siteJobDeps.image = async () => ({ statut: "passe", avant: null, note: null, seuil: 48, compares: 0, nonCompares: 0, changements: [] });
    try {
      await fr(() => X.runSinaSiteJob(jobCtx("job-site-2", { projectId: pid, userId: user.id, conversationId: cid, runId: ctx.runId, capMicro: 3_000_000, consigne: null })));
      expect(builds[0].pages).toEqual(["home", "product"]);
      expect(builds[0].capMicro).toBeLessThanOrEqual(3_000_000);
      expect(J.journeyOf(cid).site!.report.photosPagesLimitees).toEqual(["home", "product"]);
    } finally { delete T.customDesignDeps.call; delete X.siteJobDeps.estimate; delete X.siteJobDeps.build; delete X.siteJobDeps.image; }
  });

  it("conception refusée : rien n'est rangé, l'étape revient à faire, l'erreur est dite", async () => {
    const { ctx, cid, pid, user } = await client();
    J.updateJourney(cid, (x) => J.setStep(x, 5, "done"));
    X.siteJobDeps.design = async () => ({ ok: false, result: { ok: false, summary: "Conception non faite : le fournisseur n'a pas répondu." } });
    try {
      await expect(fr(() => X.runSinaSiteJob(jobCtx("job-site-3", { projectId: pid, userId: user.id, conversationId: cid, runId: ctx.runId, capMicro: 3_000_000 })))).rejects.toThrow(/Conception non faite/);
      expect(S.loadCustomTheme(pid)).toBeNull();
      expect(J.journeyOf(cid).steps[6].status).toBe("todo");
      expect(currentTheme(pid)?.spec.direction ?? "").not.toBe("sur-mesure");
    } finally { delete X.siteJobDeps.design; }
  });
});
