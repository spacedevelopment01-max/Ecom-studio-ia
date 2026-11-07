/**
 * SINA (#492) — étape 2 du parcours : 3 logos de 3 styles pour l'identité CHOISIE, tirés des 3 idées de logo de
 * l'étape 1 et adaptés par Claude, dessinés et contrôlés par le moteur de logos V2, puis choisis par le client.
 * Aucun appel d'IA : l'adaptation des idées et le moteur (dessin, relecture) sont simulés.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — étape 2 : 3 logos", async () => {
  const { one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { JobContext } = await import("@/lib/jobs");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { threadView, modelFor } = await import("@/lib/syna-agent/loop");
  const { identityDeps } = await import("@/lib/syna-agent/tools/identity");
  const { logoToolDeps } = await import("@/lib/syna-agent/tools/logo");
  const G = await import("@/lib/syna-agent/logos");
  const J = await import("@/lib/syna-agent/journey");
  const { artFixture } = await import("./logo-v2-fixtures");
  const { mockAi } = await import("./logo-v2-mock");
  const { ART_CRITERIA } = await import("@/lib/logo-v2/types");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const ctxOf = (user: any, cid: string) => ({ user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null as string | null, attachment: () => null }) as any;
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  const identities = (): any[] => [
    { key: "A", name: "Tour de Main", nameStyle: "", nameWhy: "", slogan: "Du fruit, du cuivre, et du temps.", sloganTone: "", promise: "Une confiture cuite lentement.", territory: "fierté artisanale", ground: "blanc", palette: { dark: "#1F2A3A", primary: "#24508C", secondary: "#F6E7D3", accent: "#C2652B", light: "#FFFFFF" }, paletteFamily: "Faïence et cuivre", fonts: { heading: "playfair_display_n7", body: "karla_n4" }, fontStyle: "", tone: { adjectives: ["fier", "précis", "chaleureux"], avoid: ["légende", "jargon", "superlatifs"] }, logoStyle: "cachet", logoIdea: "Un cachet rond d'épicerie fine avec le chaudron vu de dessus.", why: "" },
    { key: "B", name: "Heure Dorée", nameStyle: "", nameWhy: "", slogan: "Ouvre le pot, l'heure dorée revient.", sloganTone: "", promise: "L'été de la Drôme en pot.", territory: "évasion solaire", ground: "degrade", gradient: { from: "#FFE27A", to: "#FFA864" }, palette: { dark: "#2A1E14", primary: "#1F6B3A", secondary: "#FFF1C9", accent: "#D9472B", light: "#FFF8E6" }, paletteFamily: "Abricot et basilic", fonts: { heading: "cormorant_n6", body: "dm_sans_n4" }, fontStyle: "", tone: { adjectives: ["lumineux", "sensoriel", "apaisé"], avoid: ["clichés", "santé", "agressif"] }, logoStyle: "aquarelle", logoIdea: "Une tache d'aquarelle abricot coupée par le bord d'une bassine en cuivre.", why: "" },
    { key: "C", name: "Pot Commun", nameStyle: "", nameWhy: "", slogan: "Pose-le au milieu, tout le monde y trempe.", sloganTone: "", promise: "Une confiture à partager.", territory: "complicité joyeuse", ground: "sombre", palette: { dark: "#10241F", primary: "#FFC23D", secondary: "#1F3A33", accent: "#FF7A45", light: "#FFF5E1" }, paletteFamily: "Pin et soleil", fonts: { heading: "nunito_n9", body: "work_sans_n4" }, fontStyle: "", tone: { adjectives: ["joyeux", "franc", "généreux"], avoid: ["moquerie", "infantiliser", "émojis"] }, logoStyle: "monogramme", logoIdea: "Un monogramme de deux « P » dos à dos qui forment un pot.", why: "" },
  ];

  /** Fil à l'étape 2 : étape 0 validée, identité B choisie avec les couleurs de A (comme l'essai réel). */
  async function stepTwo() {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des confitures cuites au chaudron." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien, je pars de zéro." }, { field: "audience", value: "Des gourmands de 30 à 60 ans." }, { field: "image", value: "Gourmand, authentique, solaire." },
      { field: "setup", value: "4 produits" }, { field: "market", value: "En ligne, France." }, { field: "price", value: "7,90 €" }, { field: "difference", value: "Cuisson au chaudron." },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas de photos pour l'instant." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    expect((await call("start.confirm", ctx, {})).ok).toBe(true);
    identityDeps.generate = async () => ({ identities: identities() });
    try { expect((await call("identity.propose", ctx, {})).ok).toBe(true); } finally { identityDeps.generate = undefined; }
    expect((await call("identity.choose", ctx, { key: "B", mix: { palette: "A" } })).ok).toBe(true);
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    return { user, cid, ctx, pid };
  }

  let n = 0;
  const jobCtx = (user: any, pid: string, payload: Record<string, unknown>) => {
    const jid = `job-sina-logos-${Date.now()}-${n++}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, user.id, pid, "syna.logos", "logos", JSON.stringify(payload), "running", Date.now(), Date.now(), Date.now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const artReview = (score: number, exp: any) => ({ criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, score])) as any, textRead: exp.name, nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues: [], needsSimplifiedMark: true, genericConcept: false, fix: { target: "none", instruction: "" } });
  const fakeEngine = (log: { calls: string[]; prompts: string[] }, scores: Record<string, number> = {}) => () => ({
    ...mockAi(log),
    artworkRoute: () => ({ provider: "openai", model: "gpt-image-1" }),
    async reviewArtwork(_b: Buffer, t: any, _brief: any, exp: any) { log.calls.push(`review:${t.name}`); return artReview(scores[t.name] ?? 8.6, exp); },
  }) as any;

  it("modèle et parcours : l'étape 2 est ouverte, le fil reste léger (Haiku), le contexte explique quoi faire", () => {
    expect(J.READY_STEPS).toContain(2);
    expect(modelFor(2)).toMatchObject({ model: "claude-haiku-5-5" });
    const j = J.emptyJourney();
    for (const s of [0, 1]) J.setStep(j, s, "done");
    expect(J.journeyContext(j)).toMatch(/Étape 2 \(3 logos\) : rien n'est encore dessiné.*logo\.propose/);
  });

  it("logos LIBRES (décision du propriétaire du 7 novembre) : carte blanche, nom exact seul texte, couleurs de la marque, interdits", () => {
    const brand: any = { name: "Heure Dorée", positioning: "x", personality: ["lumineux", "sensoriel"], palette: identities()[0].palette };
    const j = J.emptyJourney();
    j.start.offer = { value: "Des confitures cuites au chaudron.", status: "answered", source: "client", at: 1 };
    j.start.image = { value: "Gourmand, authentique, solaire.", status: "answered", source: "client", at: 1 };
    const f = G.freeLogoFacts(brand, j);
    expect(f.feeling).toBe("lumineux, sensoriel — Gourmand, authentique, solaire.");
    const prompt = G.freeLogoPrompt(f, 1);
    expect(prompt).toMatch(/Crée le logo de la marque « Heure Dorée »\. Ce qu'elle fait : Des confitures cuites au chaudron\./);
    expect(prompt).toMatch(/Dans cette direction, tu as carte blanche totale sur l'idée, le sujet, la typographie et la composition : fais-toi plaisir/);
    // Trois directions artistiques franchement différentes (retour du 7 novembre : « le même logo avec juste des
    // éléments déplacés ne convient pas ») ; chaque demande nomme la sienne et écarte les deux autres.
    expect(prompt).toContain(`Direction artistique de cette proposition : ${G.FREE_DIRECTIONS[1].text}.`);
    expect(prompt).toMatch(/les deux autres sont « illustration » et « symbole moderne » : ne t'en approche pas\. Jamais le même logo avec des éléments déplacés/);
    expect(G.freeLogoPrompt(f, 0)).toMatch(/les deux autres sont « lettrage » et « symbole moderne »/);
    expect(G.FREE_DIRECTIONS.map((d) => d.label)).toEqual(["illustration", "lettrage", "symbole moderne"]);
    expect(prompt).toMatch(/Une seule proposition de logo dans l'image, jamais une planche de plusieurs versions/);
    expect(prompt).toMatch(/Le seul texte du logo est le nom « Heure Dorée »/);
    expect(prompt).toMatch(/À éviter : un rendu daté \(années 80 ou 90, clip-art\)/);
    // Plus aucune idée, aucun style ni objet imposé.
    expect(prompt.split("À éviter")[0]).not.toMatch(/aquarelle|cachet|monogramme|tampon|emblème/i);
    const t = G.freeTerritories(f);
    expect(t.map((x) => x.style)).toEqual(["libre", "libre", "libre"]);
    expect(new Set(t.map((x) => x.imageBrief)).size).toBe(3);
    expect(t.map((x) => x.markType)).toEqual(["symbol_wordmark", "wordmark", "symbol_wordmark"]);
    expect(t[1].concept).toMatch(/Direction « lettrage »/);
  });

  it("proposition complète : devis annoncé, 3 logos dessinés et contrôlés, rangés dans le parcours, affichés, puis choix du client", async () => {
    const { user, cid, ctx, pid } = await stepTwo();
    expect(loadProject(pid).brand!.validated).toEqual(expect.arrayContaining(["identity", "name", "palette", "fonts"]));
    logoToolDeps.maxMicro = () => 900_000;
    try {
      expect(await getTool("logo.propose")!.estimate!(ctx, {})).toEqual({ maxMicro: 900_000, label: "3 logos" });
      const r = await call("logo.propose", ctx, {});
      expect(r.ok).toBe(true);
      expect(r.jobs).toHaveLength(1);
      expect(J.journeyOf(cid).steps[2].status).toBe("doing");
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs![0]);
      expect(job.type).toBe(G.SINA_LOGOS_JOB);
    } finally { logoToolDeps.maxMicro = undefined; }
    const log = { calls: [] as string[], prompts: [] as string[] };
    const prompts: string[] = [];
    G.logoDeps.ai = fakeEngine(log, { "Création libre 3": 4 });
    G.logoDeps.draw = async (prompt, tid) => { prompts.push(prompt); log.calls.push(`art:${tid}`); return artFixture(Number(tid.slice(1)) || 0); };
    try {
      const out = await fr(() => G.runSinaLogosJob(jobCtx(user, pid, { projectId: pid, conversationId: cid, capMicro: 900_000 })));
      expect(out.logos.map((x) => x.source).sort()).toEqual(["A", "B", "C"]);
    } finally { G.logoDeps.ai = undefined; G.logoDeps.draw = undefined; }
    // Le dessin reçoit la demande LIBRE (jamais la consigne structurée du moteur) avec le nom choisi.
    expect(prompts).toHaveLength(3);
    for (const pr of prompts) { expect(pr).toMatch(/« Heure Dorée »/); expect(pr).toMatch(/carte blanche totale/); }
    expect(log.calls.filter((c) => c.startsWith("art:"))).toHaveLength(3);
    const j = J.journeyOf(cid);
    expect(j.steps[2].status).toBe("review");
    const byName = Object.fromEntries(j.logos!.list.map((x) => [x.name, x]));
    expect(byName["Création libre 1"].verdict).toBe("FINAL");
    expect(byName["Création libre 3"].verdict).not.toBe("FINAL"); // note 4/10 : jamais présenté comme bon
    expect(J.journeyContext(j)).toMatch(/Étape 2 — proposition n° 1 .*NON validé par le contrôle/);
    const view = await fr(() => threadView(user, cid));
    expect(view.journey.logos!.list.every((x) => !x.assetId || !!x.href)).toBe(true);
    // Choix du client : le logo devient celui de la marque, étape 2 validée, étape 3 ouverte.
    const pick = j.logos!.list.find((x) => x.verdict === "FINAL")!;
    const c = await call("logo.choose", ctx, { source: pick.source });
    expect(c.ok).toBe(true);
    const b = loadProject(pid).brand!;
    expect(b.logo.status).toBe("validated");
    expect(b.palette).toEqual(identities()[0].palette); // palette verrouillée : jamais recolorée par le logo
    const after = J.journeyOf(cid);
    expect(after.steps[2].status).toBe("done");
    expect(J.currentStep(after)).toBe(3);
    expect((await call("logo.propose", ctx, {})).ok).toBe(false); // logo déjà choisi : pas de nouvelle série en douce
  });

  it("refusé avant l'identité choisie", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des bougies." }] });
    const r = await call("logo.propose", ctx, {});
    expect(r.ok).toBe(false);
    expect(r.summary).toMatch(/étape 1/);
  });

  it("motif du contrôle dit simplement au client (essai réel)", () => {
    expect(G.clientReason("sous la barrière (7.4/10, attendu 7.5) — aucune nouvelle image sans votre accord (bouton « Nouvelle version »)")).toBe("note 7,4/10, il faut 7,5");
  });

  it("rendus interdits par le propriétaire (7 novembre) : jamais dessinés, jamais présentés ni choisissables", async () => {
    const A = await import("@/lib/logo-v2/artwork");
    const I = await import("@/lib/syna-agent/identities");
    expect(A.FORBIDDEN_LOGO_RENDERS.join(" ")).toMatch(/tache, une texture ou une forme floue/);
    expect(A.FORBIDDEN_LOGO_RENDERS.join(" ")).toMatch(/lettre seule accompagnée d'une forme géométrique de base/);
    // Relecture : un rendu interdit devient le code « forbidden », qui interdit pour toujours le choix du logo.
    const review: any = { criteria: {}, textRead: "Heure Dorée", nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues: [], needsSimplifiedMark: true, genericConcept: false, forbiddenRender: true };
    expect(A.artworkCodes(review, { name: "Heure Dorée" })).toContain("forbidden");
    expect(A.ARTWORK_NEVER).toContain("forbidden");
    expect(A.ARTWORK_REVIEW_SYSTEM("monogram")).toMatch(/« forbiddenRender » = true quand le logo relève d'un de ces rendus INTERDITS/);
    // Dessin : la consigne demande un symbole net, construit avec le nom.
    const t: any = { id: "t1", name: "x", concept: "un concept assez long pour le test", markType: "monogram", composition: "horizontal", typography: { style: "grotesque", weight: "bold", case: "title", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, sobriety: 2, construction: "typographic", symbolIdea: null, distinctive: "", avoid: [], source: "ai", style: "monogram", descriptor: null };
    const brief: any = { name: "Heure Dorée", palette: { primary: "#24508C", secondary: "#F6E7D3", accent: "#C2652B", light: "#FFFFFF", dark: "#1F2A3A" }, trade: { label: "confitures", actions: [], objects: [], generic: false }, activity: "confitures", activities: [], paletteLocked: true, exactNameCase: true };
    expect(A.artworkPrompt(t, brief)).toMatch(/jamais une tache floue, jamais une lettre seule avec une simple forme géométrique/);
    // Étapes 1 et 2 : l'aquarelle n'est plus proposée, et les consignes citent les interdits.
    expect(I.PROPOSED_LOGO_STYLES).not.toContain("aquarelle");
    expect(I.IDENTITY_SYSTEM).toMatch(/Rendus INTERDITS par le propriétaire/);
    expect(G.freeLogoPrompt({ name: "X", activity: "y", feeling: "", audience: null, colors: ["#000000"] }, 0)).toContain(A.FORBIDDEN_LOGO_RENDERS[0]);
    const ids = identities(); ids[1].logoStyle = "aquarelle";
    expect(I.identityIssues(I.IdentitiesSchema.parse({ identities: ids }).identities, J.emptyJourney()).join(" ")).toMatch(/style de logo « tache d'aquarelle » interdit/);
  });
  it("notation des logos libres (retour du 7 novembre : « vraiment sévère ») : le logo original au premier regard, pas les versions du studio", async () => {
    const A = await import("@/lib/logo-v2/artwork");
    const sys = A.ARTWORK_REVIEW_SYSTEM("libre");
    expect(sys).toBe(A.FREE_ARTWORK_REVIEW_SYSTEM());
    // La version claire et les réductions viennent du studio : elles ne baissent aucune note.
    expect(sys).toMatch(/FABRIQUÉES AUTOMATIQUEMENT par le studio[^]*NE BAISSE AUCUNE NOTE/);
    // Carte blanche : aucun élément de l'histoire de la marque n'est exigé.
    expect(sys).toMatch(/Ne retire jamais de point parce qu'un élément de l'histoire de la marque/);
    // Le rendu daté est LE défaut sanctionné (essai réel : soleil rayé « années 80 » passé de 7,6 FINAL à 6,7 bloqué).
    expect(sys).toMatch(/soleil rayé de bandes horizontales façon années 70-80[^]*« amateur » = true/);
    expect(sys).toMatch(/PLUSIEURS logos ou variantes dans la même image/);
    expect(sys).toContain(A.FORBIDDEN_LOGO_RENDERS[0]);
    // Les autres styles gardent leur relecture.
    expect(A.ARTWORK_REVIEW_SYSTEM("illustrated")).toMatch(/PETITES ENTREPRISES/);
    // Poids : la beauté du dessin et la composition d'abord, l'usage en petit compte peu (version simplifiée du studio).
    const w = A.STYLE_WEIGHTS.libre;
    expect(w.craft).toBeGreaterThan(w.originality);
    expect(w.composition).toBeGreaterThan(w.distinctiveness);
    expect(w.intendedUse).toBeLessThan(1);
    // Calibrage réel (relecture du 7 novembre) : logo libre C 8,1 → au-dessus de la barrière ; ancien « années 80 » 6,7.
    const libreC = { relevance: 9, originality: 7, craft: 9, typography: 8, composition: 8, colour: 9, legibility: 8, memorability: 8, distinctiveness: 7, intendedUse: 7 };
    expect(A.artworkScore({ criteria: libreC }, "libre")).toBe(8.1);
  });

  it("notes de référence du propriétaire (7 novembre : « logo libre noté à 9 et ancien logo 3 ») : échelle fixée, rendu daté plafonné à 3", async () => {
    const A = await import("@/lib/logo-v2/artwork");
    const { BoundedArtworkReviewSchema, ArtworkReviewSchema } = await import("@/lib/logo-v2/ai");
    const sys = A.FREE_ARTWORK_REVIEW_SYSTEM();
    expect(sys).toMatch(/NOTES DE RÉFÉRENCE DU PROPRIÉTAIRE/);
    expect(sys).toMatch(/- 9\/10 : [^\n]*scène généreuse[^\n]*lettrage sur mesure/);
    expect(sys).toMatch(/- 3\/10 : un soleil rayé de bandes horizontales façon années 70-80/);
    expect(sys).toMatch(/« dated » = true/);
    // Relecture réelle après réglage : logo libre 8,9 (critères ci-dessous), ancien logo daté ramené à 3.
    const libre = { relevance: 9, originality: 9, craft: 9, typography: 9, composition: 9, colour: 9, legibility: 8, memorability: 9, distinctiveness: 9, intendedUse: 8 };
    expect(A.freeArtworkScore({ criteria: libre }, "libre")).toBe(8.9);
    const ancien = { relevance: 8, originality: 6, craft: 8, typography: 7, composition: 8, colour: 8, legibility: 9, memorability: 7, distinctiveness: 6, intendedUse: 8 };
    expect(A.freeArtworkScore({ criteria: ancien, dated: true }, "libre")).toBe(A.DATED_MAX_SCORE);
    expect(A.DATED_MAX_SCORE).toBe(3);
    // Le plafond ne concerne que les logos libres ; les autres styles gardent leur moyenne.
    expect(A.freeArtworkScore({ criteria: ancien, dated: true }, "illustrated")).toBe(A.artworkScore({ criteria: ancien }, "illustrated"));
    // « dated » lu dans la réponse ; absent = false (relecture bornée comprise).
    const base = { criteria: libre, textRead: "Heure Dorée", nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, person: false, genericConcept: false, forbiddenRender: false, issues: [], needsSimplifiedMark: true, fix: { target: "none", instruction: "" } };
    expect(BoundedArtworkReviewSchema.parse(base).dated).toBe(false);
    expect(ArtworkReviewSchema.parse({ ...base, dated: true }).dated).toBe(true);
  });
});
