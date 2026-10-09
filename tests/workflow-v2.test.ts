/**
 * Studio Workflow V2 (phase 12A) — une demande globale passe par l'orchestrateur existant (intention → plan → routeur
 * → moteurs V2), avec devis, autorisation, plafond, règles des forfaits, enchaînement avec la création complète,
 * reprise sans doublon, éléments à valider, et propagation CONTRÔLÉE d'un changement d'identité de marque.
 * Moteurs locaux et fournisseurs simulés : aucun appel payant, aucun réseau.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 })));
afterEach(() => vi.unstubAllGlobals());

describe("Studio Workflow V2", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, one, run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { JobContext, getJob } = await import("@/lib/jobs");
  const { loadProject, saveBrand, currentTheme } = await import("@/lib/projects");
  const { buildShopV2 } = await import("@/lib/theme-v2/engine");
  const wf = await import("@/lib/workflow");
  const prop = await import("@/lib/workflow/propagation");
  const { launchPipeline, StartInput } = await import("@/lib/project-start");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const mkUser = async (plan: string | null) => {
    const u = await createUser(`wf${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", "W");
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = ?, plan = ? WHERE user_id = ?", plan ? "active" : "none", plan, u.id);
    syncAllowance(u.id);
    return u;
  };
  const vendre = await mkUser("vendre");
  const decouverte = await mkUser(null);
  const cosmetic = await seedThemeScenario(vendre.id, "cosmetic");
  await fr(() => buildShopV2(null, cosmetic));
  const artisan = await seedThemeScenario(vendre.id, "artisan");
  await fr(() => buildShopV2(null, artisan));
  const ctxOf = (jobId: string) => new JobContext(getJob(jobId)!);
  const aiCalls = (userId: string) => one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls WHERE user_id = ?", userId)!.n;
  const ASK = "Crée ma marque, mon logo, mes visuels, ma boutique Shopify, mes publicités et prépare mes publications Instagram pour les 30 prochains jours.";

  it("la demande type est comprise : 6 intentions, calendrier Instagram de 30 jours, thème Shopify à livrer", () => {
    const { understand } = { understand: null } as never;
    void understand;
    const { intents, params } = wf.parseWorkflowRequest(ASK, ["CREATE_BRAND", "GENERATE_IMAGE", "CREATE_SHOP", "SOCIAL", "CREATE_AD"]);
    expect(intents).toEqual(expect.arrayContaining(["CREATE_BRAND", "GENERATE_IMAGE", "CREATE_SHOP", "SOCIAL", "CREATE_AD", "EXPORT_CMS"]));
    expect(params.social).toEqual({ days: 30, perDay: 1, platforms: ["instagram"] });
    expect(params.cmsPlatforms).toEqual(["shopify"]);
  });

  it("préparation : plan de l'orchestrateur et devis, rien de lancé ; sans IA tout est local (0 €)", async () => {
    const w = await fr(() => wf.prepareWorkflow(cosmetic, vendre.id, ASK, { aiActive: false }));
    expect(w.status).toBe("draft");
    expect(w.planId).toBeTruthy();
    expect(w.estimate.totalMicro).toBe(0);
    expect(w.estimate.lines.every((l) => !l.paid)).toBe(true);
    expect(w.estimate.lines.map((l) => l.kind)).toEqual(expect.arrayContaining(["ad", "social", "cms_export", "theme"]));
    expect(one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'workflow.run'", cosmetic)).toBeFalsy();
    expect(aiCalls(vendre.id)).toBe(0);
  });

  it("devis IA : lancement refusé sans accord, refusé si le plafond est sous le devis, accepté avec accord et plafond", async () => {
    const w = await fr(() => wf.prepareWorkflow(cosmetic, vendre.id, "Crée une campagne publicitaire et un article de blog", { aiActive: true }));
    expect(w.estimate.totalMicro).toBeGreaterThan(0);
    expect(w.estimate.lines.find((l) => l.kind === "ad")?.paid).toBe(true);
    expect(() => wf.startWorkflow(w.id, {})).toThrow(/devis/);
    expect(() => wf.startWorkflow(w.id, { approveMicro: w.estimate.totalMicro, capEur: 0.0001 })).toThrow(/plafond/);
    const started = wf.startWorkflow(w.id, { approveMicro: w.estimate.totalMicro, capEur: 50 });
    expect(started.status).toBe("queued");
    expect(started.capMicro).toBe(50_000_000);
    // Relancer ne crée aucune tâche en double.
    wf.startWorkflow(w.id, { approveMicro: w.estimate.totalMicro, capEur: 50 });
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE idempotency_key = ?", `wf:${w.id}:run`)!.n).toBe(1);
    run("UPDATE jobs SET status = 'cancelled' WHERE id = ?", started.jobId);
  });

  it("parcours complet sur un projet existant : publicités V2, calendrier Social V2 (30 j Instagram), export Shopify contrôlé, à valider, 0 €", async () => {
    const w = await fr(() => wf.prepareWorkflow(cosmetic, vendre.id, "Prépare une campagne publicitaire, mes publications Instagram pour les 30 prochains jours et exporte ma boutique Shopify", { aiActive: false }));
    const s = wf.startWorkflow(w.id, {});
    expect(s.pipelineJobId).toBeNull(); // projet déjà construit : pas de nouvelle création complète
    const r = await fr(() => wf.runWorkflow(ctxOf(s.jobId!)));
    const kinds = Object.fromEntries(r.steps.map((x) => [x.kind, x.status]));
    expect(kinds.ad).toBe("done");
    expect(kinds.social).toBe("done");
    expect(kinds.cms_export).toBe("done");
    const v = wf.workflowView(w.id)!;
    expect(v.workflow.status).toBe("done");
    expect(v.spentMicro).toBe(0);
    const posts = one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE plan_id = ?", `wf-social-${w.id}`)!.n;
    expect(posts).toBe(30);
    expect(all<{ network: string }>("SELECT DISTINCT network FROM posts WHERE plan_id = ?", `wf-social-${w.id}`).map((x) => x.network)).toEqual(["instagram"]);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE plan_id = ? AND status IN ('published','scheduled')", `wf-social-${w.id}`)!.n).toBe(0);
    expect(one("SELECT 1 FROM assets WHERE project_id = ? AND role = 'theme-export'", cosmetic)).toBeTruthy();
    expect(one<{ n: number }>("SELECT COUNT(DISTINCT doc_key) n FROM ad_documents WHERE project_id = ?", cosmetic)!.n).toBeGreaterThan(0);
    expect(v.validations.map((x) => x.key)).toEqual(expect.arrayContaining(["posts", "ads", "export"]));
    expect(aiCalls(vendre.id)).toBe(0);
    // Reprise après interruption (même tâche relancée) : aucun doublon.
    const before = { posts, ads: one<{ n: number }>("SELECT COUNT(*) n FROM ad_documents WHERE project_id = ?", cosmetic)!.n, exports: one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND role = 'theme-export'", cosmetic)!.n };
    await fr(() => wf.runWorkflow(ctxOf(s.jobId!)));
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE plan_id = ?", `wf-social-${w.id}`)!.n).toBe(before.posts);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM ad_documents WHERE project_id = ?", cosmetic)!.n).toBe(before.ads);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND role = 'theme-export'", cosmetic)!.n).toBe(before.exports);
    // La même demande renvoyée (espaces, majuscules, ponctuation près) : la demande déjà faite est reprise, rien n'est refait.
    const again = await fr(() => wf.prepareWorkflow(cosmetic, vendre.id, "  prépare une campagne publicitaire, mes publications Instagram pour les 30 prochains jours et exporte ma boutique Shopify. ", { aiActive: false }));
    expect(again.id).toBe(w.id);
    expect(again.status).toBe("done");
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM workflows WHERE project_id = ? AND request LIKE '%campagne publicitaire, mes publications%'", cosmetic)!.n).toBe(1);
  }, 240_000);

  it("site de plâtrier-peintre (services) : calendrier Facebook de 2 semaines, aucune trace de vente", async () => {
    const w = await fr(() => wf.prepareWorkflow(artisan, vendre.id, "Prépare mes publications Facebook pour 2 semaines et exporte mon site pour WordPress", { aiActive: false }));
    expect(w.params.cmsPlatforms).toEqual(["woocommerce"]);
    const s = wf.startWorkflow(w.id, {});
    const r = await fr(() => wf.runWorkflow(ctxOf(s.jobId!)));
    expect(r.steps.find((x) => x.kind === "social")?.status).toBe("done");
    const rows = all<{ network: string }>("SELECT network FROM posts WHERE plan_id = ?", `wf-social-${w.id}`);
    expect(rows.length).toBe(14);
    expect(new Set(rows.map((x) => x.network))).toEqual(new Set(["facebook"]));
    const exp = all<{ name: string }>("SELECT name FROM assets WHERE project_id = ? AND role = 'theme-export'", artisan).map((x) => x.name);
    expect(exp.some((n) => /-wordpress-v\d+\.zip$/.test(n))).toBe(true);
  }, 240_000);

  it("forfait Découverte : export, visuels, publicités et calendrier ne sont pas faits (raison affichée), aucun contournement", async () => {
    const pid = await seedThemeScenario(decouverte.id, "cosmetic");
    await fr(() => buildShopV2(null, pid));
    const w = await fr(() => wf.prepareWorkflow(pid, decouverte.id, "Crée mes publicités, mes publications Instagram et exporte ma boutique Shopify", { aiActive: false }));
    expect(w.estimate.lines.filter((l) => ["ad", "social", "cms_export"].includes(l.kind)).every((l) => l.mode === "skip" && /forfait/.test(l.note ?? ""))).toBe(true);
    const s = wf.startWorkflow(w.id, {});
    const r = await fr(() => wf.runWorkflow(ctxOf(s.jobId!)));
    for (const k of ["ad", "social", "cms_export"]) expect(r.steps.find((x) => x.kind === k)?.status, k).toBe("skipped");
    expect(one("SELECT 1 FROM assets WHERE project_id = ? AND role = 'theme-export'", pid)).toBeFalsy();
    expect(one("SELECT 1 FROM posts WHERE project_id = ?", pid)).toBeFalsy();
  }, 120_000);

  it("projet pas encore construit : création complète d'abord (sans calendrier en double), puis la suite qui l'attend", async () => {
    const pid = (await import("@/lib/db")).id();
    run("INSERT INTO projects (id, user_id, name, status, created_at, updated_at) VALUES (?,?,?,?,?,?)", pid, vendre.id, "Nouveau", "draft", Date.now(), Date.now());
    const input = StartInput.parse({ description: "Sérum visage à la vitamine C, flacon 30 ml.", request: ASK });
    const pipe = fr(() => launchPipeline(pid, vendre.id, input, 0));
    expect(JSON.parse(pipe.payload).skip).toEqual(["calendar"]);
    const w = await fr(() => wf.attachStartRequest(pid, vendre.id, ASK, pipe.id));
    expect(w?.status).toBe("queued");
    expect(w?.pipelineJobId).toBe(pipe.id);
    expect(w?.estimate.lines.find((l) => l.kind === "pipeline")?.estimateMicro).toBe(0);
    expect(JSON.parse(getJob(w!.jobId!)!.depends_on)).toEqual([pipe.id]);
    run("UPDATE jobs SET status = 'cancelled' WHERE id IN (?, ?)", pipe.id, w!.jobId);
  });

  it("demande en liste : « … et ma boutique Shopify » loin du verbe → boutique et export Shopify", () => {
    const { intents } = wf.parseWorkflowRequest("Crée ma marque high-tech, mon logo, mes visuels et ma boutique Shopify.", ["CREATE_BRAND", "GENERATE_IMAGE"]);
    expect(intents).toEqual(expect.arrayContaining(["CREATE_SHOP", "EXPORT_CMS"]));
    expect(wf.parseWorkflowRequest("Améliore la photo de ma boutique", ["GENERATE_IMAGE"]).intents).not.toContain("CREATE_SHOP");
  });

  it("calendrier sauté par la création complète (remplacé par la demande) : la demande le fait bien", async () => {
    const { enqueue } = await import("@/lib/jobs");
    const pipe = enqueue({ userId: vendre.id, projectId: cosmetic, type: "pipeline.run", payload: { projectId: cosmetic, skip: ["calendar"] } });
    run("UPDATE jobs SET status = 'done', checkpoint = ? WHERE id = ?", JSON.stringify({ __steps: { brand: { status: "done" }, calendar: { status: "skipped" } } }), pipe.id);
    const w = await fr(() => wf.prepareWorkflow(cosmetic, vendre.id, "Prépare mes publications Facebook pour les 7 prochains jours", { aiActive: false }));
    const s = wf.startWorkflow(w.id, {});
    run("UPDATE workflows SET pipeline_job_id = ? WHERE id = ?", pipe.id, w.id);
    const r = await fr(() => wf.runWorkflow(ctxOf(s.jobId!)));
    expect(r.steps.find((x) => x.kind === "social")?.status).toBe("done");
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE plan_id = ?", `wf-social-${w.id}`)!.n).toBe(7);
  }, 120_000);

  it("demande incomprise : question de clarification, rien de lancé", async () => {
    const w = await fr(() => wf.prepareWorkflow(cosmetic, vendre.id, "Bonjour", { aiActive: false }));
    expect(w.status).toBe("needs_clarification");
    expect(w.clarification).toMatch(/Que souhaitez-vous/);
    expect(() => wf.startWorkflow(w.id, {})).toThrow();
  });

  it("propagation contrôlée : nouvelle palette → créations listées ; mise à jour locale des choisies, création modifiée par le client conservée", async () => {
    const p0 = loadProject(cosmetic);
    const themeBefore = currentTheme(cosmetic)!;
    const docs = all<{ doc_key: string }>("SELECT DISTINCT doc_key FROM ad_documents WHERE project_id = ?", cosmetic).map((x) => x.doc_key);
    expect(docs.length).toBeGreaterThan(1);
    // Le client a modifié une publicité à la main.
    const { latestDoc, saveVersion } = await import("@/lib/ad-doc/store");
    const edited = docs[0];
    const cur = latestDoc(cosmetic, edited)!;
    saveVersion(cosmetic, edited, { ...cur.doc, meta: { ...cur.doc.meta, source: "user" } }, { note: "retouche client" });
    await new Promise((r) => setTimeout(r, 5));
    const newPalette = { ...p0.brand!.palette, primary: "#1F4E79", accent: "#C0392B" };
    saveBrand(cosmetic, { ...p0.brand!, palette: newPalette });
    const impact = prop.brandImpact(loadProject(cosmetic));
    const kinds = new Set(impact.items.map((i) => i.kind));
    expect(kinds.has("theme")).toBe(true);
    expect(kinds.has("ad")).toBe(true);
    // Publications : seules celles dont le visuel est COMPOSÉ à la marque sont concernées (photos de la bibliothèque : non).
    const composed = all<{ id: string }>("SELECT p.id FROM posts p JOIN assets a ON a.id = json_extract(p.media, '$[0]') WHERE p.project_id = ? AND p.engine = 'v2' AND a.origin = 'generated' AND a.role IN ('social','ad','banner')", cosmetic).length;
    expect(impact.items.filter((i) => i.kind === "post").length).toBe(composed);
    expect(kinds.has("export")).toBe(true);
    expect(impact.items.find((i) => i.key === `ad:${edited}`)?.userEdited).toBe(true);
    // Rien n'a encore changé (aucune modification silencieuse).
    expect(currentTheme(cosmetic)!.version.id).toBe(themeBefore.version.id);
    const res = await fr(() => prop.applyBrandUpdate(cosmetic, impact.items.map((i) => i.key)));
    expect(res.skipped.find((s) => s.key === `ad:${edited}`)?.reason).toMatch(/modifié par vous/);
    const themeAfter = currentTheme(cosmetic)!;
    expect(themeAfter.version.number).toBe(themeBefore.version.number + 1);
    expect(JSON.stringify(themeAfter.spec.settings.color_schemes)).not.toBe(JSON.stringify(themeBefore.spec.settings.color_schemes));
    expect(themeAfter.spec.templates.index.order).toEqual(themeBefore.spec.templates.index.order); // mise en page gardée
    const other = docs.find((d) => d !== edited)!;
    const updatedAd = latestDoc(cosmetic, other)!;
    const json = JSON.stringify(updatedAd.doc).toLowerCase();
    for (const k of ["primary", "accent"] as const) expect(json, k).not.toContain(p0.brand!.palette[k].toLowerCase());
    expect(json).toContain("#c0392b");
    const { contrast } = await import("@/lib/color");
    for (const l of updatedAd.doc.layers) if (l.kind === "button" && typeof l.fill === "string") expect(contrast(l.color, l.fill)).toBeGreaterThanOrEqual(4.5);
    const after = prop.brandImpact(loadProject(cosmetic));
    // Restent : la publicité modifiée par le client (conservée) et ce qui se reprend à la main (vidéo : signalée).
    expect(after.items.filter((i) => i.updatable).map((i) => i.key)).toEqual([`ad:${edited}`]);
    expect(after.items.filter((i) => !i.updatable).every((i) => i.kind === "video" || i.kind === "text")).toBe(true);
    // Le client l'inclut expressément : elle est mise à jour (nouvelle version, ancienne restaurable).
    const res2 = await fr(() => prop.applyBrandUpdate(cosmetic, [`ad:${edited}`], { includeEdited: true }));
    expect(res2.updated.map((u) => u.key)).toEqual([`ad:${edited}`]);
    expect(prop.brandImpact(loadProject(cosmetic)).items.filter((i) => i.updatable)).toEqual([]);
    expect(aiCalls(vendre.id)).toBe(0);
  }, 240_000);
});
