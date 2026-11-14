/**
 * SINA (#492) — audit du 10 novembre 2026 : déroulement du parcours.
 * Réponses de l'étape 0 reportées dans le projet (jamais redemandées), étape 5 pour une entreprise de services, étapes 7
 * et 8 après un thème sur mesure, Studio jamais verrouillé pour toujours, projet existant jamais remis en parcours,
 * montage d'un thème du Studio refusé tant que le thème choisi n'est pas en place.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — déroulement du parcours (audit du 10 novembre 2026)", async () => {
  const { one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const J = await import("@/lib/syna-agent/journey");
  const Act = await import("@/lib/syna-agent/activity");
  const { underConstruction } = await import("@/lib/syna-agent/construction");
  const { loadProject } = await import("@/lib/projects");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  async function confirmedStart(business: "products" | "services", extra: { contact?: string; platform?: string; language?: string } = {}) {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: business }, { field: "offer", value: business === "services" ? "Électricien : dépannage, mise aux normes, rénovation." : "Des confitures artisanales : abricot, figue." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Des familles de la région." }, { field: "image", value: "Solaire." },
      { field: "setup", value: business === "services" ? "Demande de devis en ligne" : "Une dizaine de parfums" }, { field: "market", value: "Valence et 30 km autour." }, { field: "price", value: "Selon le chantier" }, { field: "difference", value: "Réponse en 24 h." },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas encore." }, { field: "language", value: extra.language ?? "Français seulement" },
      { field: "contact", value: extra.contact ?? "Plus tard" }, ...(business === "products" ? [{ field: "platform", value: extra.platform ?? "shopify" }] : []),
    ] });
    expect((await call("start.confirm", ctx, {})).ok).toBe(true);
    return { user, cid, ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  it("coordonnées, plateforme et langue de l'étape 0 reportées dans le projet ; SINA les relit à l'étape 5 sans les redemander", async () => {
    expect(Act.companyFromText("Heure Dorée SAS, bonjour@heuredoree.fr, 06 12 34 56 78, SIRET 912 345 678 00017")).toEqual({ email: "bonjour@heuredoree.fr", phone: "06 12 34 56 78", siret: "91234567800017" });
    const { cid, pid } = await confirmedStart("products", { contact: "Heure Dorée SAS — bonjour@heuredoree.fr — 06 12 34 56 78 — 12 rue des Vergers, Valence", platform: "WooCommerce", language: "Anglais seulement" });
    expect(Act.companyOf(pid)).toMatchObject({ email: "bonjour@heuredoree.fr", phone: "06 12 34 56 78" });
    const p = loadProject(pid);
    expect(p.platform).toBe("woocommerce");
    expect((p.settings as any).language).toBe("en");
    J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4]) J.setStep(x, n, "done"); });
    const ctxt = J.journeyContext(J.journeyOf(cid));
    expect(ctxt).toMatch(/Déjà dit par le client à l'étape 0 \(NE LE REDEMANDE PAS[^]*Coordonnées : « Heure Dorée SAS — bonjour@heuredoree\.fr/);
  });

  it("étape 5 d'une entreprise de services : ni livraison ni retours, ses prestations à la place des produits", async () => {
    const { cid, pid } = await confirmedStart("services");
    J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4]) J.setStep(x, n, "done"); });
    const plan = Act.activityPlan(pid, J.journeyOf(cid));
    expect(plan.missing.map((m) => m.key)).not.toContain("shipping");
    expect(plan.missing.map((m) => m.key)).not.toContain("returns");
    expect(plan.services).toEqual([]);
    const gaps = Act.activityGaps(plan);
    expect(gaps).toContain("aucune prestation enregistrée");
    expect(gaps.join(" ")).not.toMatch(/produit|livraison|retours/);
  });

  it("thème sur mesure choisi : l'étape 7 est la mise en boutique (jamais les anciennes maquettes), l'étape 8 est sans objet, le Studio s'ouvre", async () => {
    const { cid, pid } = await confirmedStart("products");
    J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4, 5]) J.setStep(x, n, "done"); J.setStep(x, 6, "doing"); });
    expect(underConstruction(pid)).toBe(true); // SINA mène l'étape 6 : le Studio reste en lecture
    J.updateJourney(cid, (x) => { J.setStep(x, 6, "done"); x.customChosenAt = Date.now(); J.setStep(x, 8, "skipped"); });
    const j = J.journeyOf(cid);
    expect(J.currentStep(j)).toBe(7);
    // Depuis le 14 novembre 2026, la mise en boutique du thème sur mesure existe : SINA la fait avec custom.install.
    expect(J.stepAvailable(j, 7)).toBe(true);
    const ctxt = J.journeyContext(j);
    expect(ctxt).toMatch(/mise en boutique du thème sur mesure\) : son thème est choisi et en place dans l'onglet Boutique/);
    expect(ctxt).toMatch(/appelle custom\.install \(gratuit\)/);
    expect(ctxt).toMatch(/Ne dis jamais que sa boutique est en ligne/);
    expect(ctxt).toMatch(/N'utilise AUCUN outil des anciennes maquettes/);
    expect(ctxt).not.toMatch(/annonce le devis de site\.code_from_mockup/);
    expect(ctxt).toMatch(/Désigner un élément|custom\.edit/); // il peut toujours demander des changements
    expect(underConstruction(pid)).toBe(false); // jamais verrouillé en attendant la mise en boutique
  });

  it("projet existant ouvert dans SINA : hors parcours, jamais remis aux questions de départ ni verrouillé", async () => {
    const { user, pid } = await confirmedStart("products");
    // Un autre projet, créé avant son fil (comme un projet fait dans le Studio sans SINA).
    const other = await confirmedStart("products");
    run("UPDATE agent_conversations SET project_id=NULL WHERE id=?", other.cid);
    run("UPDATE projects SET created_at=? WHERE id=?", Date.now() - 3_600_000, other.pid);
    const cid2 = threadFor(other.user, other.pid);
    const j = J.journeyOf(cid2);
    expect(j.outside).toBe(true);
    expect(J.journeyContext(j)).toMatch(/Projet existant[^]*Ne pose pas les questions de départ/);
    J.updateJourney(cid2, (x) => J.setStep(x, 0, "doing"));
    expect(underConstruction(other.pid)).toBe(false);
    expect(user.id).toBeTruthy();
    expect(pid).toBeTruthy();
  });

  it("étape 8 : le montage à la marque est refusé tant que le thème du Studio choisi n'est pas en place", async () => {
    const { ctx, cid } = await confirmedStart("products");
    J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4, 5]) J.setStep(x, n, "done"); });
    const r = await call("theme.brand", ctx, { images: "sina" });
    expect(r.ok).toBe(false);
    expect(r.summary).toMatch(/n'a pas choisi de thème du Studio/);
    const v = await call("theme.validate", ctx, {});
    expect(v.ok).toBe(false); // rien à valider avant le montage
  });

  it("pendant le parcours, les anciens raccourcis ne sont ni proposés ni exécutables ; anciennes maquettes réservées aux projets commencés avec elles", async () => {
    const { toolVisible, toolCatalog } = await import("@/lib/syna-agent/registry");
    const scope = { inJourney: true, legacyMockups: false };
    for (const n of ["brand.create", "site.mockups", "site.mockup_images", "site.build", "strategy.choose", "pilot.run", "project.create", "mockup.copy", "site.code_from_mockup"]) expect(toolVisible(n, scope), n).toBe(false);
    for (const n of ["identity.propose", "logo.propose", "custom.compose", "custom.edit", "theme.choose", "theme.brand"]) expect(toolVisible(n, scope), n).toBe(true);
    expect(toolVisible("mockup.copy", { inJourney: false, legacyMockups: true })).toBe(true);
    expect(toolVisible("brand.create", { inJourney: false, legacyMockups: false })).toBe(true); // hors parcours : outils habituels
    const cat = toolCatalog(true, scope);
    expect(cat).not.toMatch(/\b(brand\.create|site\.mockups|site\.build|strategy\.choose|pilot\.run|mockup\.copy)\b/); // ni proposés ni cités
    expect(cat).toMatch(/custom\.compose/);
  });

  it("thème sur mesure : SINA reçoit l'accueil capturé (ordinateur et téléphone), en bandes lisibles, une seule capture par version", async () => {
    const { cid, pid } = await confirmedStart("products");
    const { starterTheme } = await import("@/lib/syna-agent/custom-theme/starters");
    const { saveCustomTheme } = await import("@/lib/syna-agent/custom-theme/theme");
    const { shotDeps, customThemeShots } = await import("@/lib/syna-agent/custom-theme/shots");
    const { journeyImages } = await import("@/lib/syna-agent/attachments");
    const sharp = (await import("sharp")).default;
    expect(await customThemeShots(pid)).toEqual([]); // aucun thème : rien de joint
    saveCustomTheme(pid, starterTheme("classique", "classique"));
    let shots = 0;
    shotDeps.shoot = async (html, v) => { shots++; expect(html).toMatch(/<section/); return sharp({ create: { width: v.width, height: v.maxHeight, channels: 3, background: "#fff" } }).jpeg().toBuffer(); };
    try {
      J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4, 5]) J.setStep(x, n, "done"); J.setStep(x, 6, "doing"); x.siteMode = { mode: "mockup", at: Date.now() } as any; });
      const imgs = await journeyImages(J.journeyOf(cid) as any, pid);
      const labels = imgs.map((i) => i.label ?? "");
      expect(labels.filter((l) => /accueil \(ordinateur\)/.test(l))).toHaveLength(2); // 3 200 px en 2 bandes
      expect(labels.filter((l) => /accueil \(téléphone\)/.test(l))).toHaveLength(3); // 3 600 px en 3 bandes
      for (const i of imgs) expect((await sharp(i.data).metadata()).height!).toBeLessThanOrEqual(1600);
      await journeyImages(J.journeyOf(cid) as any, pid);
      expect(shots).toBe(2); // version en cache : aucune nouvelle capture
    } finally { shotDeps.shoot = undefined; }
  });
});
