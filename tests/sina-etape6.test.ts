/**
 * SINA (#492) — étape 6 du parcours, volet « un de nos thèmes » (gratuit) : cartes des thèmes du catalogue proposé
 * (recommandé d'abord, site du client composé dans chacun, démonstration), choix du client par la tâche de la galerie.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — étape 6 : un de nos thèmes", async () => {
  const { one, all } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { threadView, modelFor } = await import("@/lib/syna-agent/loop");
  const { ACTIVE_THEMES } = await import("@/lib/theme/theme-fit");
  const J = await import("@/lib/syna-agent/journey");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  /** Fil à l'étape 6 : fiche de départ confirmée, étapes 1 à 5 validées. */
  async function stepSix() {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des thés et infusions bio assemblés à la main : 6 mélanges en sachets de 100 g." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Actifs de 25 à 45 ans." }, { field: "image", value: "Naturel et chaleureux." },
      { field: "setup", value: "6 mélanges" }, { field: "market", value: "En ligne, France." }, { field: "price", value: "8,50 € les thés, 7,50 € les infusions" }, { field: "difference", value: "Assemblés à la main." },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas encore." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    expect((await call("start.confirm", ctx, {})).ok).toBe(true);
    J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4, 5]) J.setStep(x, n, "done"); J.setStep(x, 6, "todo"); });
    return { user, cid, ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  it("cartes des thèmes : recommandé d'abord, trois par défaut, tout le catalogue sur demande ; rien n'est appliqué", async () => {
    const { user, cid, ctx, pid } = await stepSix();
    expect(J.READY_STEPS).toContain(6);
    expect(J.currentStep(J.journeyOf(cid))).toBe(6);
    expect(modelFor(6)?.model).toMatch(/haiku/); // gratuit, fil léger
    // Consigne du propriétaire : les cartes des thèmes d'abord, puis le client choisit un thème ou une maquette.
    const ctx0 = J.journeyContext(J.journeyOf(cid));
    expect(ctx0).toMatch(/commence par appeler theme\.propose[^]*choisir un de ces thèmes[^]*maquette sur mesure[^]*PAYANTES[^]*Ne choisis jamais à sa place/);
    expect(ctx0).not.toMatch(/mockup\.pages/); // consigne des maquettes seulement après ce choix
    const r = await call("theme.propose", ctx, {});
    expect(r.ok).toBe(true);
    const j = J.journeyOf(cid);
    expect(j.themes!.list).toHaveLength(3);
    for (const t of j.themes!.list) expect(ACTIVE_THEMES as readonly string[]).toContain(t.id); // jamais un thème retiré
    if (j.themes!.recommendedId) expect(j.themes!.list[0].id).toBe(j.themes!.recommendedId);
    expect(j.steps[6].status).toBe("review");
    // Identifiants pour SINA seule, jamais montrés au client.
    for (const t of j.themes!.list) expect(r.summary).toContain(`« ${t.name} »`);
    expect(r.hint).toMatch(/Identifiants pour theme\.choose/);
    // Montrer ne change rien au projet : aucune tâche de composition.
    expect(all("SELECT id FROM jobs WHERE project_id=? AND type='shop.direction'", pid)).toHaveLength(0);
    const everything = await call("theme.propose", ctx, { all: true });
    expect(everything.ok).toBe(true);
    expect(J.journeyOf(cid).themes!.list).toHaveLength(ACTIVE_THEMES.length);
    const view = await fr(() => threadView(user, cid));
    expect(view.journey.themes!.list.length).toBe(ACTIVE_THEMES.length);
    expect(view.journey.themes!.chosen).toBeNull();
  });

  it("choix du client : thème inconnu refusé (erreur interne), marque exigée ; jamais avant l'étape 5", async () => {
    const { ctx, cid } = await stepSix();
    const unknown = await call("theme.choose", ctx, { id: "arven" });
    expect(unknown.ok).toBe(false);
    expect(unknown.internal).toBe(true);
    const noBrand = await call("theme.choose", ctx, { id: ACTIVE_THEMES[0] });
    expect(noBrand.ok).toBe(false);
    expect(noBrand.summary).toMatch(/marque/);
    expect(J.journeyOf(cid).steps[6].status).not.toBe("done");
    J.updateJourney(cid, (x) => J.setStep(x, 5, "doing"));
    expect((await call("theme.propose", ctx, {})).summary).toMatch(/étape 5/);
  });

  it("choix du client : la même tâche que « Choisir ce thème » (une seule, même en double demande), étape 8 ouverte", async () => {
    const { ctx, cid, pid } = await stepSix();
    const { loadProject, saveBrand } = await import("@/lib/projects");
    const { localBrand } = await import("@/lib/engine/local");
    const { run } = await import("@/lib/db");
    // Projet de prestations (pas d'angle obligatoire pour composer le thème) avec une marque.
    run("UPDATE projects SET business_type='services' WHERE id=?", pid);
    saveBrand(pid, localBrand(loadProject(pid).product, "Brindi", loadProject(pid)).brand);
    await call("theme.propose", ctx, {});
    const id = J.journeyOf(cid).themes!.list.find((t) => t.allowed)!.id;
    const r = await call("theme.choose", ctx, { id });
    expect(r.ok, r.summary).toBe(true);
    expect(r.jobs).toHaveLength(1);
    const again = await call("theme.choose", ctx, { id });
    expect(again.jobs).toEqual(r.jobs); // jamais une seconde tâche
    expect(all("SELECT id FROM jobs WHERE project_id=? AND type='shop.direction'", pid)).toHaveLength(1);
    const j = J.journeyOf(cid);
    expect(j.themeChoice?.id).toBe(id);
    expect(j.siteMode?.mode).toBe("theme");
    expect(j.steps[6].status).toBe("done");
    expect(j.steps[7].status).toBe("skipped");
    expect(J.currentStep(j)).toBe(8);
  });

  it("après avoir vu les thèmes, choix « maquette sur mesure » : la consigne des maquettes s'applique", async () => {
    const { ctx, cid } = await stepSix();
    expect((await call("theme.propose", ctx, {})).ok).toBe(true);
    expect((await call("site.mode", ctx, { mode: "mockup" })).summary).toBe("Choix noté : une maquette sur mesure.");
    expect(J.journeyContext(J.journeyOf(cid))).toMatch(/a vu les thèmes et choisi une MAQUETTE SUR MESURE[^]*Étape 6, maquettes sur mesure : mockup\.pages/);
    expect(J.journeyOf(cid).steps[6].status).toBe("doing");
  });
});
