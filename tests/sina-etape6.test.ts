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
    // Produits créés à l'étape 5 (onglet Produits).
    for (const title of ["Thé vert jasmin", "Rooibos vanille", "Verveine-menthe"]) await call("catalogue.create", ctx, { title });
    return { user, cid, ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  it("cartes des thèmes : recommandé d'abord, tout le catalogue par défaut (trois sur demande) ; rien n'est appliqué", async () => {
    const { user, cid, ctx, pid } = await stepSix();
    expect(J.READY_STEPS).toContain(6);
    expect(J.currentStep(J.journeyOf(cid))).toBe(6);
    expect(modelFor(6)?.model).toMatch(/sonnet/); // modèle plus fort pour l'étape 6 (choix du propriétaire du 10 novembre)
    // Consigne du propriétaire (9 novembre 2026) : d'abord la question « thème du Studio ou thème sur mesure » ; Studio =
    // TOUS nos thèmes, puis son site monté dedans ; sur mesure = la famille d'abord.
    const ctx0 = J.journeyContext(J.journeyOf(cid));
    expect(ctx0).toMatch(/demande D'ABORD au client[^]*« Un thème du Studio » \/ « Un thème sur mesure »[^]*Ne choisis jamais à sa place[^]*site\.mode mode theme, puis theme\.propose[^]*TOUS nos thèmes[^]*theme\.choose[^]*site\.mode mode mockup[^]*la famille d'abord[^]*onglet Boutique/);
    expect(ctx0).not.toMatch(/mockup\.pages/); // consigne des maquettes seulement après ce choix
    const r = await call("theme.propose", ctx, { all: false });
    expect(r.ok).toBe(true);
    const j = J.journeyOf(cid);
    expect(j.themes!.list).toHaveLength(3);
    for (const t of j.themes!.list) expect(ACTIVE_THEMES as readonly string[]).toContain(t.id); // jamais un thème retiré
    // Thèmes TELS QU'ILS SONT (consigne du propriétaire) : capture d'origine, jamais le site du client recomposé.
    for (const t of j.themes!.list) expect(t.preview).not.toMatch(/direction-thumb|\/api\/projects/);
    // Six mélanges : d'abord les thèmes pensés pour une petite collection (essai réel : Onde et Heuren, d'un seul produit, en tête).
    expect(j.themes!.list.slice(0, 2).map((t) => t.id).sort()).toEqual(["museau-club", "souple"]);
    expect(j.themes!.list[0].id).toBe(j.themes!.recommendedId);
    expect(j.themes!.list[0].why).toMatch(/petite collection/);
    expect(j.steps[6].status).toBe("review");
    // Identifiants pour SINA seule, jamais montrés au client.
    for (const t of j.themes!.list) expect(r.summary).toContain(`« ${t.name} »`);
    expect(r.hint).toMatch(/Identifiants pour theme\.choose/);
    expect(r.summary).toMatch(/tels qu'ils sont \(démonstrations d'origine\)/);
    expect(J.journeyContext(J.journeyOf(cid))).toMatch(/ce ne sont PAS son site : ne dis jamais « ton site composé dans chacun »/);
    // Montrer ne change rien au projet : aucune tâche de composition.
    expect(all("SELECT id FROM jobs WHERE project_id=? AND type='shop.direction'", pid)).toHaveLength(0);
    const everything = await call("theme.propose", ctx, {}); // par défaut : tous nos thèmes
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

  it("après avoir vu les thèmes, choix « thème sur mesure » : la consigne du thème sur mesure s'applique", async () => {
    const { ctx, cid } = await stepSix();
    expect((await call("theme.propose", ctx, {})).ok).toBe(true);
    expect((await call("site.mode", ctx, { mode: "mockup" })).summary).toBe("Choix noté : un thème sur mesure.");
    expect(J.journeyContext(J.journeyOf(cid))).toMatch(/le client a choisi un THÈME SUR MESURE[^]*Étape 6, THÈME SUR MESURE[^]*PLUS JAMAIS « maquette »[^]*SON SEUL choix[^]*theme\.families[^]*AUCUN thème de départ[^]*custom\.compose avec TOUTES les pages obligatoires[^]*custom\.build[^]*onglet Boutique[^]*Élément désigné[^]*custom\.edit[^]*custom\.photo[^]*custom\.choose/);
    expect(J.journeyOf(cid).steps[6].status).toBe("doing");
  });

  it("chaque thème proposé a sa capture d'origine et ce qu'il met en scène", async () => {
    const fs = await import("node:fs");
    const { themeChoices } = await import("@/lib/syna-agent/themes");
    const { cid } = await stepSix();
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    const all = await fr(() => themeChoices(pid, true));
    expect(all.list).toHaveLength(ACTIVE_THEMES.length);
    for (const t of all.list) {
      expect(t.why, t.id).not.toBe("");
      expect(fs.existsSync(`public${t.preview}`), `${t.id} : ${t.preview}`).toBe(true);
    }
  });

  it("SINA ne dit jamais que le site du client est composé dans les thèmes montrés (essai réel du 7 novembre)", async () => {
    const { withoutComposedClaim } = await import("@/lib/syna-agent/loop");
    expect(withoutComposedClaim("Voici à nouveau les trois thèmes du Studio, avec ton site déjà composé dans chacun. Tu peux en choisir un."))
      .toBe("Voici à nouveau les trois thèmes du Studio. Tu peux en choisir un.");
    expect(withoutComposedClaim("Les trois thèmes sont sous tes yeux, chacun avec ton site composé dans chacun.")).not.toMatch(/ton site composé/);
    expect(withoutComposedClaim("Choisir un thème est gratuit : ton site s'y compose ensuite.")).toBe("Choisir un thème est gratuit : ton site s'y compose ensuite.");
  });
});
