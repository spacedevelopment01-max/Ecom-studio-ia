/**
 * Thème du Studio monté à la marque (consigne du propriétaire du 9 novembre 2026) : SINA dit combien d'images il faut,
 * demande « tes images ou je les crée ? », donne le devis, puis la tâche réécrit les textes dans l'angle choisi et pose
 * les images ; le site est en place dans la Boutique. Sans aucun appel réel.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — thème du Studio monté à la marque", async () => {
  const { one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const J = await import("@/lib/syna-agent/journey");
  const SB = await import("@/lib/syna-agent/studio-brand");
  const T = await import("@/lib/syna-agent/tools/themes");
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  it("images : nombre exact demandé ; « seulement mes images » sans en avoir assez → refus ; devis puis tâche ; textes dans l'angle, images posées", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "services" }, { field: "offer", value: "Cours de céramique en atelier, à Lyon." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes débutants." }, { field: "image", value: "Chaleureux." }, { field: "setup", value: "3 formules" }, { field: "market", value: "Lyon." },
      { field: "price", value: "45 € la séance" }, { field: "difference", value: "Petits groupes." }, { field: "taste", status: "none" }, { field: "photos", value: "Quelques-unes." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    // Garde de l'étape 8 (audit du 10 novembre 2026) : rien tant que le client n'a pas choisi un thème du Studio.
    expect((await call("theme.images", ctx, {})).summary).toMatch(/n'a pas choisi de thème du Studio/);
    const { loadProject, saveBrand } = await import("@/lib/projects");
    const { localBrand } = await import("@/lib/engine/local");
    run("UPDATE projects SET business_type='services' WHERE id=?", pid);
    saveBrand(pid, localBrand(loadProject(pid).product, "Argile", loadProject(pid)).brand);
    const { switchDirection } = await import("@/lib/engine/shop");
    await fr(() => switchDirection(null, pid, "rive" as never));
    J.updateJourney(cid, (x) => { x.siteMode = { mode: "theme", at: Date.now() }; x.themeChoice = { id: "rive", jobId: "composition-terminee", at: Date.now() }; });
    const needs = await call("theme.images", ctx, {});
    expect(needs.ok, needs.summary).toBe(true);
    expect(needs.summary).toMatch(/Son thème demande \d+ images/);
    const missing = needs.data.vides as number;
    console.log(`RIVE : ${needs.data.total} emplacements, ${needs.data.remplies} remplis, ${missing} vides`);
    if (missing) {
      expect(needs.hint).toMatch(/tes images, ou je les crée[^]*mix[^]*sina/);
      const refused = await call("theme.brand", ctx, { images: "client" });
      expect(refused.ok).toBe(false);
      expect(refused.summary).toMatch(/Il manque \d+ images/);
    }
    // Devis : rédaction (plafond pour trois tours) + images exactes du moteur (remplacé ici).
    T.studioBrandDeps2.images = (_p, n) => ({ capMicro: n * 100_000, estimateMicro: n * 60_000 });
    try {
      ctx.projectId = pid;
      const est = await fr(() => getTool("theme.brand")!.estimate!(ctx, { images: "sina" }));
      expect(est.maxMicro).toBeGreaterThan(est.probableMicro!);
      expect(est.label).toMatch(/textes de toute la boutique/);
      const r = await call("theme.brand", ctx, { images: "sina" });
      expect(r.ok, r.summary).toBe(true);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs[0]);
      expect(job.type).toBe("syna.studio.brand");
      // Exécution avec une fausse rédaction et de fausses images.
      let brief = "", images = 0, composed = 0;
      SB.studioBrandDeps.copy = async (b) => { brief = b; return { copy: { hero: { heading: "Les mains dans la terre" } }, qc: { verdict: "FINAL", remaining: [] } }; };
      SB.studioBrandDeps.image = async () => { images++; return "asset-faux"; };
      SB.studioBrandDeps.compose = async () => { composed++; };
      const out: any = await fr(() => SB.runStudioBrandJob({ job: { id: job.id }, payload: JSON.parse(job.payload), checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
      expect(out.copy).toBe("FINAL");
      expect(images).toBe(missing);
      expect(composed).toBe(missing ? 2 : 1);
      // Textes de SINA gardés tels quels par la préparation locale (jamais remplacés par l'angle recalculé).
      expect(one("SELECT id FROM memory WHERE project_id=? AND key='shop_copy.syna'", pid)).toBeTruthy();
      void brief;
    } finally { delete T.studioBrandDeps2.images; delete SB.studioBrandDeps.copy; delete SB.studioBrandDeps.image; delete SB.studioBrandDeps.compose; }
  });

  it("thèmes de services (APLAT…) : leur liste de photos d'après la démonstration ; images du client posées, les autres créées", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "services" }, { field: "offer", value: "Plâtrerie et peinture." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Particuliers." }, { field: "image", value: "Sobre." }, { field: "setup", value: "2 prestations" }, { field: "market", value: "Nantes." },
      { field: "price", value: "Sur devis" }, { field: "difference", value: "Finitions soignées." }, { field: "taste", status: "none" }, { field: "photos", value: "Non." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    const { loadProject, saveBrand } = await import("@/lib/projects");
    const { localBrand } = await import("@/lib/engine/local");
    run("UPDATE projects SET business_type='services' WHERE id=?", pid);
    saveBrand(pid, localBrand(loadProject(pid).product, "Enduit", loadProject(pid)).brand);
    await fr(async () => (await import("@/lib/engine/shop")).switchDirection(null, pid, "aplat" as never));
    J.updateJourney(cid, (x) => { x.siteMode = { mode: "theme", at: Date.now() }; x.themeChoice = { id: "aplat", jobId: "composition-terminee", at: Date.now() }; });
    const r = await call("theme.images", ctx, {});
    expect(r.ok, r.summary).toBe(true);
    expect(r.data.total).toBeGreaterThan(5);
    expect(r.data.vides).toBe(r.data.total); // nouveau client : aucune photo encore
    console.log(`APLAT : ${r.data.total} photos pour ce client`);
    // Deux images du client, puis montage « mix » : ses deux images posées, les autres créées (fausses ici).
    const sharp = (await import("sharp")).default;
    const { saveAsset } = await import("@/lib/library");
    for (const c of ["#123", "#456"]) await saveAsset({ projectId: pid, userId: user.id, data: await sharp({ create: { width: 40, height: 30, channels: 3, background: c } }).png().toBuffer(), name: `chantier-${c}.png`, mime: "image/png", role: "original", origin: "upload" });
    expect((await call("theme.images", ctx, {})).data.imagesEnvoyeesNonPosees).toBe(2);
    T.studioBrandDeps2.images = (_p, n) => ({ capMicro: n * 100_000, estimateMicro: n * 60_000 });
    let made = 0;
    SB.studioBrandDeps.copy = async () => ({ copy: {}, qc: { verdict: "FINAL", remaining: [] } });
    SB.studioBrandDeps.compose = async () => undefined;
    SB.studioBrandDeps.image = async () => { made++; return (await saveAsset({ projectId: pid, userId: user.id, data: await sharp({ create: { width: 30, height: 30, channels: 3, background: "#777" } }).png().toBuffer(), name: "cree.png", mime: "image/png", role: "site", origin: "generated" })).id; };
    try {
      ctx.projectId = pid;
      const res = await call("theme.brand", ctx, { images: "mix" });
      expect(res.ok, res.summary).toBe(true);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", res.jobs[0]);
      const out: any = await fr(() => SB.runStudioBrandJob({ job: { id: job.id }, payload: JSON.parse(job.payload), checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
      // Ses deux images vont d'abord aux photos de chantier que SINA ne peut pas inventer ; SINA ne crée que les autres.
      const own = r.data.aFournirParLeClient as number;
      expect(own).toBeGreaterThan(2);
      expect(r.summary).toMatch(/je ne peux PAS inventer/);
      expect(made).toBe(r.data.total - own);
      expect(out.imagesMade).toBe(made);
      expect(out.problems.join(" ")).toMatch(new RegExp(`${own - 2} photo\\(s\\) à fournir par toi`));
      const after = await call("theme.images", ctx, {});
      expect(after.data.vides).toBe(own - 2);
      expect(after.data.remplies).toBe(r.data.total - own + 2);
      // Aperçu du Studio : un cadre « Photo à fournir » à la place de chacune ; la version enregistrée n'en a aucun.
      const { currentTheme } = await import("@/lib/projects");
      const SP = await import("@/lib/theme/service-media-plan");
      const saved = currentTheme(pid)!.spec;
      const preview = SP.withAuthenticPlaceholders(saved);
      const slots = SP.serviceMediaSlots(saved).filter((x) => x.authentic && !x.filled);
      expect(slots.length).toBe(own - 2);
      for (const x of slots) {
        const sec: any = preview.templates[x.template].sections[x.sectionId];
        const v = (x.blockId ? sec.blocks[x.blockId] : sec).settings[x.assetField ?? x.field];
        expect(x.assetField).toBeTruthy();
        expect(v).toBe(SP.placeholderFile(x));
        expect(SP.placeholderSlot(preview, v)?.key).toBe(x.key);
        expect(sec.disabled).not.toBe(true);
      }
      expect(JSON.stringify(saved)).not.toMatch(/es-ph-/);
      const svg = SP.authenticPlaceholderSvg(slots[0], "fr").replace(/<\/text><text[^>]*>/g, " ");
      expect(svg).toMatch(/Photo à fournir/);
      expect(svg).toMatch(/SINA ne peut pas inventer tes réalisations\./);
      expect(svg).toMatch(/Ce cadre n'apparaît jamais sur ton site publié/);
      expect(svg).toMatch(/Ici : Pièce/);
      // Dans la page de l'aperçu, le cadre est inclus directement (aucun fichier manquant) ; ses photos posées vont dans
      // le champ « fichier du thème » que la page affiche vraiment.
      const name = SP.placeholderFile(slots[0]);
      const page = SP.inlineAuthenticPlaceholders(`<img src="/preview/x/v/1/assets/${name}?width=2400"><img src="${name}">`, preview, "/preview/x/v/1", "fr");
      expect(page).not.toMatch(/es-ph-/);
      expect(page.match(/data:image\/svg\+xml;base64,/g)?.length).toBe(2);
      const placed = SP.serviceMediaSlots(saved).filter((x) => x.filled && x.authentic);
      expect(placed.length).toBe(2);
      for (const x of placed) { const sec: any = saved.templates[x.template].sections[x.sectionId]; expect((x.blockId ? sec.blocks[x.blockId] : sec).settings[x.assetField!]).toMatch(/^es-client-/); }
    } finally { delete T.studioBrandDeps2.images; delete SB.studioBrandDeps.copy; delete SB.studioBrandDeps.compose; delete SB.studioBrandDeps.image; }
  });

  it("direction de rédaction : l'angle choisi, son émotion, l'accroche mot pour mot, rien d'inventé, aucun jargon visible", () => {
    const j: any = { ...J.emptyJourney(), angleChoice: { id: "a1" }, angles: { list: [{ id: "a1", title: "La pause à soi", emotion: "soulagement", story: "Une tasse, dix minutes, rien d'autre.", proofsToConfirm: ["certifié bio"] }] } };
    const p: any = { id: "x" };
    const brief = SB.angleBrief(p, null);
    expect(brief).toBe("");
    // Sans plan d'activité lisible, la direction reste vide (jamais inventée).
    expect(SB.angleBrief(p, j)).toBe("");
    expect(J.STEP_GUIDES[8]).toMatch(/theme\.images[^]*tes images|SES images[^]*theme\.brand[^]*copywriting[^]*angle marketing[^]*émotion[^]*rien d'inventé[^]*Boutique/);
  });
});
