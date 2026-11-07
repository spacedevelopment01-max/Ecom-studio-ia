/**
 * SINA (#492) — étape 1 du parcours : 3 identités de marque vraiment différentes (charte qualité 2026 § 2.1), contrôle
 * gratuit du Studio avec une reprise au plus, choix du client (avec mélange et retouches mot pour mot) enregistré comme
 * marque du projet, refonte respectée (nom, slogan, logo gardés). Aucun appel d'IA : le modèle est simulé.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — étape 1 : 3 identités de marque", async () => {
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { threadView } = await import("@/lib/syna-agent/loop");
  const { identityDeps, IDENTITY_CAP_MICRO, IDENTITY_MODEL, mixIdentity } = await import("@/lib/syna-agent/tools/identity");
  const I = await import("@/lib/syna-agent/identities");
  const J = await import("@/lib/syna-agent/journey");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const ctxOf = (user: any, cid: string) => ({ user, conversationId: cid, runId: "test", projectId: null as string | null, attachment: () => null }) as any;
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  const good = (): any[] => [
    { key: "A", name: "Ocrea", nameKind: "invente", nameStyle: "mot français évocateur", nameWhy: "", nameCandidates: ["a","b","c","d","e","f","g","h","i","j","k","l"], nameExpression: "expression existante", nameAnchor: "la flamme de la bougie", slogan: "La chaleur du fait main", sloganTone: "poétique", promise: "Des bougies coulées à la main qui réchauffent ton intérieur.", territory: "fierté artisanale", ground: "blanc", palette: { dark: "#111111", primary: "#1D4ED8", secondary: "#DBEAFE", accent: "#F97316", light: "#FFFFFF" }, paletteFamily: "tons chauds ton sur ton", fonts: { heading: "cormorant_n6", body: "inter_n4" }, fontStyle: "serif fine contrastée", tone: { adjectives: ["chaleureux", "précis", "sincère"], avoid: ["superlatifs", "jargon", "promesses"] }, logoStyle: "embleme", logoIdea: "Une flamme dans un sceau rond.", why: "Ta clientèle aime l'artisanat." },
    { key: "B", name: "Lumo", nameKind: "invente", nameStyle: "mot inventé court", nameWhy: "", nameCandidates: ["a","b","c","d","e","f","g","h","i","j","k","l"], nameExpression: "expression existante", nameAnchor: "la flamme de la bougie", slogan: "Allume l'instant", sloganTone: "direct", promise: "Une lumière douce pour chaque moment calme.", territory: "évasion", ground: "degrade", gradient: { from: "#FFD6A5", to: "#C8B6FF" }, palette: { dark: "#1F1A14", primary: "#B91C1C", secondary: "#FDE68A", accent: "#16A34A", light: "#F5EEDC" }, paletteFamily: "sombre et un accent vif", fonts: { heading: "archivo_n8", body: "dm_sans_n4" }, fontStyle: "grotesque grasse", tone: { adjectives: ["direct", "lumineux", "moderne"], avoid: ["mièvrerie", "jargon", "promesses"] }, logoStyle: "lettrage", logoIdea: "Le O de Lumo devient une flamme.", why: "Tu veux une image moderne." },
    { key: "C", name: "Brindille", nameKind: "invente", nameStyle: "nom composé", nameWhy: "", nameCandidates: ["a","b","c","d","e","f","g","h","i","j","k","l"], nameExpression: "expression existante", nameAnchor: "la flamme de la bougie", slogan: "Complice de tes soirées", sloganTone: "complice et léger", promise: "Des bougies joyeuses à offrir et à s'offrir.", territory: "complicité joyeuse", ground: "sombre", palette: { dark: "#0B0B12", primary: "#FACC15", secondary: "#312E81", accent: "#C084FC", light: "#F5F5F7" }, paletteFamily: "clair et frais", fonts: { heading: "nunito_n8", body: "karla_n4" }, fontStyle: "ronde épaisse", tone: { adjectives: ["complice", "léger", "joyeux"], avoid: ["froideur", "jargon", "promesses"] }, logoStyle: "mascotte", logoIdea: "Une petite bougie souriante.", why: "Tu vends beaucoup en cadeau." },
  ];

  /** Fil avec l'étape 0 validée (création complète ou refonte), comme après un vrai parcours. */
  async function stepOneThread(opts: { keep?: string[]; name?: string; slogan?: string; image?: string } = {}) {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des bougies parfumées coulées à la main." }] });
    await call("start.answer", ctx, { answers: [{ field: "existing", value: opts.keep ? "Oui, un logo et un nom" : "Rien, je pars de zéro." }] });
    if (opts.keep) await call("start.keep", ctx, { keep: opts.keep, name: opts.name, slogan: opts.slogan });
    await call("start.answer", ctx, { answers: [
      { field: "audience", value: "Femmes de 25 à 45 ans qui aiment décorer leur intérieur." },
      { field: "image", value: opts.image ?? "Chaleureux, artisanal, haut de gamme. Pas de rose." },
      { field: "setup", value: "3 produits" }, { field: "market", value: "En ligne, France." }, { field: "price", value: "25 €" },
      { field: "difference", value: "Cire de colza française." }, { field: "taste", status: "none" }, { field: "photos", value: "Pas de photos pour l'instant." },
      { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    const ok = await call("start.confirm", ctx, {});
    expect(ok.ok).toBe(true);
    return { user, cid, ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  it("règle du propriétaire : le prix de l'action payante de l'étape est donné à SINA, qui l'annonce avant de lancer", async () => {
    const { stepQuote } = await import("@/lib/syna-agent/loop");
    const { user, cid, pid } = await stepOneThread();
    const q = await stepQuote(user, { id: "run-test", conversation_id: cid, project_id: pid, user_id: user.id } as any);
    expect(q).toMatch(/# Prix de la prochaine action payante de l'étape\nidentity\.propose \(3 identités de marque\) : au plus .*% de votre budget IA\. Dis ce prix au client AVANT de lancer/);
  });

  it("contrôle gratuit : une série correcte passe", () => {
    expect(I.identityIssues(I.IdentitiesSchema.parse({ identities: good() }).identities, J.emptyJourney())).toEqual([]);
  });

  it("contrôle gratuit : noms, slogans, styles de logo, polices, contrastes et couleurs refusées", () => {
    const j = J.emptyJourney();
    j.start.image = { value: "Moderne et doux, surtout pas de rouge.", status: "answered", source: "client", at: 1 };
    const bad = good();
    bad[1].name = "ocrea "; // même nom que A
    bad[1].slogan = "Une lumière douce et chaude pour chaque instant calme du soir"; // 11 mots
    bad[2].logoStyle = "embleme"; // même style que A
    bad[2].fonts.heading = "cormorant_n5"; // même famille de titres que A
    bad[0].palette.dark = "#9CA3AF"; // texte gris clair illisible sur fond blanc
    bad[0].fonts.body = "comic_sans_n4"; // hors liste
    const issues = I.identityIssues(I.IdentitiesSchema.parse({ identities: bad }).identities, j).join("\n");
    expect(issues).toMatch(/même nom/);
    expect(issues).toMatch(/slogan de 11 mots \(9 au plus\)/);
    expect(issues).toMatch(/même style de logo/);
    expect(issues).toMatch(/même police de titres/);
    expect(issues).toMatch(/Identité A — texte\/fond : contraste/);
    expect(issues).toMatch(/comic_sans_n4.*hors liste/);
    expect(issues).toMatch(/Identité B : primary #B91C1C .*refusée.*rouge/);
    expect(I.refusedColors("J'aime le vert et le bleu, mais pas de rose ni de violet.")).toEqual(expect.arrayContaining(["rose", "violet"]));
    expect(I.refusedColors("J'aime le vert et le bleu.")).toEqual([]);
  });

  it("règles du propriétaire (6 et 7 novembre) : un fond blanc, un dégradé, un sombre ; boutons de teintes différentes", () => {
    const j = J.emptyJourney();
    const bad = good();
    bad[1].ground = "blanc"; bad[1].palette.light = "#FFFFFF"; // deux fonds blancs, aucun dégradé
    bad[2].palette.primary = "#3B82F6"; // bouton bleu comme celui de A : même famille
    bad[2].name = "Cuivre & Verger"; bad[2].nameKind = "deux_mots"; // nom avec « & » : permis pour un nom en deux mots (service)
    j.start.business = { value: "services", status: "answered", source: "client", at: 1 } as any;
    bad[0].nameKind = "mot";
    const issues = I.identityIssues(I.IdentitiesSchema.parse({ identities: bad }).identities, j).join("\n");
    expect(issues).toMatch(/Fonds de page : A blanc, B blanc, C sombre ; il faut un fond blanc, un fond en dégradé de couleurs et un fond sombre/);
    expect(issues).toMatch(/Identités A\/C : boutons \(couleur de marque\) de la même famille/);
    expect(issues).not.toMatch(/Cuivre & Verger|nom trop long/);
    // Un dégradé doit être un vrai dégradé de couleurs (ni beige ni crème), un fond sombre vraiment foncé.
    expect(I.paletteIssues(good()[1].palette, "degrade", { from: "#F5EEDC", to: "#EFE6D2" }).join()).toMatch(/dégradé de couleurs est attendu|nettement différentes/);
    expect(I.paletteIssues(good()[1].palette, "degrade").join()).toMatch(/deux couleurs .* manquent/);
    expect(I.paletteIssues(good()[1].palette, "degrade", good()[1].gradient)).toEqual([]);
    expect(I.paletteIssues({ ...good()[2].palette, dark: "#4A4A5A" }, "sombre").join()).toMatch(/fond très foncé/);
    expect(I.IDENTITY_SYSTEM).toMatch(/une « blanc » .* une « degrade » .* jamais beige ni crème.* une « sombre »/);
    expect(I.IDENTITY_SYSTEM).toMatch(/jamais trois orangés/);
    expect(I.IDENTITY_SYSTEM).toMatch(/écris d.abord dans nameCandidates 12 à 20 pistes, chacune tirée d.un élément du produit/);
  });

  it("références du propriétaire (7 novembre) : ses 49 palettes passent le contrôle, ses 50 noms et slogans aussi, et Claude les reçoit comme exemples à ne pas recopier", async () => {
    const R = await import("@/lib/syna-agent/brand-references");
    expect(R.NAME_EXAMPLES).toHaveLength(50);
    expect(R.PALETTE_EXAMPLES).toHaveLength(49);
    for (const p of R.PALETTE_EXAMPLES) {
      const sombre = p.ground === "sombre";
      const palette = p.ground === "degrade"
        ? { light: R.luminanceOf(p.texte) > 0.5 ? p.texte : "#FFFFFF", dark: R.luminanceOf(p.texte) > 0.5 ? p.depart! : p.texte, primary: p.bouton, secondary: p.arrivee!, accent: p.accent }
        : { light: sombre ? p.texte : p.fond!, dark: sombre ? p.fond! : p.texte, primary: p.bouton, secondary: p.surface!, accent: p.accent };
      expect([p.name, I.paletteIssues(palette, p.ground, p.ground === "degrade" ? { from: p.depart!, to: p.arrivee! } : undefined)]).toEqual([p.name, []]);
    }
    for (const n of R.NAME_EXAMPLES) {
      expect(n.name.replace(/&/g, "").trim().split(/\s+/).length, n.name).toBeLessThanOrEqual(3);
      expect(n.logic, n.name).toMatch(/^(Pars|Observe|Relie)/);
    }
    // Méthode de nommage du 7 novembre : seule référence des noms (l'ancienne liste « 50 noms et leurs slogans » est retirée).
    expect(I.IDENTITY_SYSTEM).toMatch(/MÉTHODE DE NOMMAGE .* DÉTAIL RÉEL .* DEUXIÈME LECTURE/);
    expect(I.IDENTITY_SYSTEM).toContain("La Mèche Courte (Bougies parfumées) : Pars de la mèche");
    expect(I.IDENTITY_SYSTEM).not.toContain("Braise Douce");
    expect(I.IDENTITY_SYSTEM).toContain("Verger électrique [dégradé] départ #FFF36E → arrivée #FF8EC9");
    expect(I.IDENTITY_SYSTEM).toMatch(/ne recopie jamais ces noms/);
    expect(I.IDENTITY_SYSTEM).toMatch(/les titres prennent la couleur du texte ; le bouton porte la couleur de marque/);
  });

  it("nouveaux noms seulement : couleurs, polices et le reste des identités gardés à l'identique", async () => {
    const { keepAllButNames } = await import("@/lib/syna-agent/tools/identity");
    const before = I.IdentitiesSchema.parse({ identities: good() }).identities;
    const fresh = before.map((x) => ({ ...x, name: `${x.name} bis`, slogan: "Nouveau slogan.", palette: { ...x.palette, primary: "#000000" }, fonts: { heading: "inter_n7", body: "inter_n4" } }));
    const merged = keepAllButNames(fresh, before);
    expect(merged.map((x) => x.name)).toEqual(before.map((x) => `${x.name} bis`));
    expect(merged.map((x) => x.palette)).toEqual(before.map((x) => x.palette));
    expect(merged.map((x) => x.fonts)).toEqual(before.map((x) => x.fonts));
    const j = J.emptyJourney();
    expect(I.identityPrompt(j, { previous: before, namesOnly: true })).toMatch(/refais SEULEMENT les noms/);
  });

  it("consignes de Claude : charte § 2.1, styles de logo, polices autorisées, refonte et fiche du client", () => {
    expect(I.IDENTITY_SYSTEM).toMatch(/au moins 4 des 6 axes/);
    for (const s of ["embleme", "mascotte", "artdeco"]) expect(I.IDENTITY_SYSTEM).toContain(s);
    expect(I.IDENTITY_SYSTEM).toMatch(/cormorant \(Cormorant/);
    expect(I.IDENTITY_SYSTEM).toMatch(/Interdits : inventer un chiffre, un avis/);
    const j = J.emptyJourney();
    j.start.offer = { value: "Bougies coulées main", status: "answered", source: "client", at: 1 };
    j.keep = ["logo", "nom", "slogan"]; j.keptValues = { name: "Brume d'Ambre", slogan: "L'ambre au cœur" }; j.mode = "refonte";
    const prompt = I.identityPrompt(j, { guidance: "Plus coloré" });
    expect(prompt).toMatch(/Offre : Bougies coulées main/);
    expect(prompt).toMatch(/« Brume d'Ambre » \(name identique/);
    expect(prompt).toMatch(/« L'ambre au cœur »/);
    expect(prompt).toMatch(/Plus coloré/);
    // Refonte : un nom différent du nom gardé est refusé par le contrôle.
    expect(I.identityIssues(I.IdentitiesSchema.parse({ identities: good() }).identities, j).join("\n")).toMatch(/nom gardé « Brume d'Ambre » doit être repris mot pour mot/);
  });

  it("remise en forme tolérante : police donnée par son nom, style de logo accentué", () => {
    const raw = good();
    raw[0].fonts = { heading: "Playfair Display", body: "Inter" };
    raw[1].logoStyle = "Emblème";
    raw[1].palette = good()[1].palette;
    const out = I.prepareIdentities({ identities: raw });
    expect(out.identities[0].fonts).toEqual({ heading: "playfair_display_n7", body: "inter_n4" });
    expect(out.identities[1].logoStyle).toBe("embleme");
    expect(I.fontFace("cormorant_n6")).toEqual({ family: "Cormorant", file: "Cormorant-600.ttf", weight: 600 });
  });

  it("la question n'est jamais lue deux fois : la dernière phrase interrogative du message est retirée", async () => {
    const { withoutRepeatedQuestion } = await import("@/lib/syna-agent/loop");
    const { fixElision } = await import("@/lib/syna-agent/loop");
    expect(fixElision("Activité : boutique en ligne. - Produits : 6 mélanges. - Prix : 8,50 € les thés.")).toBe("Activité : boutique en ligne.\n- Produits : 6 mélanges.\n- Prix : 8,50 € les thés.");
    expect(fixElision("Le thé vert - au jasmin - est doux.")).toBe("Le thé vert - au jasmin - est doux.");
    const out = (message: string) => withoutRepeatedQuestion({ message, actions: [], question: { text: "Laquelle préfères-tu ?" }, done: false }).message;
    // Essai réel du 7 novembre : la liste mise en lignes était recollée en une seule ligne.
    const liste = fixElision("Voici la liste :\n- Thé vert jasmin, 8,50 € : Sencha. - Thé noir aux agrumes, 8,50 € : Assam. - Rooibos vanille, 8,50 € : rooibos. Je ne crée rien sans ton accord.");
    expect(out(liste)).toBe("Voici la liste :\n- Thé vert jasmin, 8,50 € : Sencha.\n- Thé noir aux agrumes, 8,50 € : Assam.\n- Rooibos vanille, 8,50 € : rooibos. Je ne crée rien sans ton accord.");
    expect(out("Voici tes 3 identités. Laquelle te plaît le plus ?")).toBe("Voici tes 3 identités.");
    expect(out("Laquelle te plaît le plus ?")).toBe("Laquelle te plaît le plus ?"); // rien d'autre : gardé
    expect(out("C'est noté, merci.")).toBe("C'est noté, merci.");
    expect(out("Voici tes identités.\n\nLaquelle te plaît le plus ? Tu peux aussi mélanger.")).toBe("Voici tes identités.");
    expect(withoutRepeatedQuestion({ message: "Tu es prêt ?", actions: [], question: null, done: true }).message).toBe("Tu es prêt ?");
    // Essai réel (thés) : la dernière phrase annonçait la question avec les mêmes mots.
    const q2 = { text: "Présente-moi ton produit en quelques phrases, et joins des photos si tu en as." };
    expect(withoutRepeatedQuestion({ message: "Merci, c'est noté. Présente-moi maintenant ton produit en quelques phrases :", actions: [], question: q2, done: false }).message).toBe("Merci, c'est noté.");
    expect(withoutRepeatedQuestion({ message: "Ton projet est créé. Avant d'aller plus loin, as-tu déjà quelque chose :", actions: [], question: q2, done: false }).message).toBe("Ton projet est créé.");
    expect(withoutRepeatedQuestion({ message: "Voici la suite :", actions: [], question: q2, done: false }).message).toBe("Voici la suite :"); // rien d'autre : gardé
    const q3 = { text: "Tes coordonnées pour le site : nom de l'entreprise, e-mail, téléphone, adresse (et SIRET si tu l'as). Tu peux en donner une partie maintenant et le reste plus tard." };
    expect(withoutRepeatedQuestion({ message: "Parfait, la langue sera le français seulement. Pour la suite, j'ai besoin de tes coordonnées pour le site : nom de l'entreprise, e-mail, téléphone, adresse et SIRET si tu l'as. Tu peux tout donner maintenant ou compléter plus tard.", actions: [], question: q3, done: false }).message).toBe("Parfait, la langue sera le français seulement.");
  });

  it("proposition refusée tant que l'étape 0 n'est pas validée", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des bougies." }] });
    const r = await call("identity.propose", ctx, {});
    expect(r.ok).toBe(false);
    expect(r.summary).toMatch(/étape 0/);
  });

  it("proposition : modèle fort, plafond annoncé, une reprise si le contrôle échoue, cartes servies à l'interface", async () => {
    const { cid, ctx, user } = await stepOneThread();
    const calls: any[] = [];
    const first = good(); first[2].logoStyle = "embleme"; // défaut : même style que A
    identityDeps.generate = async (c) => { calls.push(c); return { identities: calls.length === 1 ? first : good(), comparison: "4 axes différents par paire." }; };
    try {
      expect(await getTool("identity.propose")!.estimate!(ctx, {})).toEqual({ maxMicro: IDENTITY_CAP_MICRO, label: "3 identités de marque" });
      const r = await call("identity.propose", ctx, {});
      expect(r.ok).toBe(true);
      expect(calls).toHaveLength(2); // une reprise, avec les corrections exactes
      expect(calls[0].routing.prefer).toEqual(IDENTITY_MODEL);
      expect(calls[0].task).toBe("strategy");
      expect(calls[0].prompt).toMatch(/Client idéal : Femmes de 25 à 45 ans/);
      expect(calls[1].prompt).toMatch(/Corrections exigées .*\n- Deux identités ont le même style de logo/);
      expect(r.summary).toMatch(/Contrôle du Studio : OK/);
      const j = J.journeyOf(cid);
      expect(j.steps[1].status).toBe("review");
      expect(j.identities?.list.map((x) => x.name)).toEqual(["Ocrea", "Lumo", "Brindille"]);
      expect(J.journeyContext(j)).toMatch(/proposition n° 1 .*A « Ocrea »/);
      expect(J.journeyContext(j)).toMatch(/MÉLANGER/);
      const view = await fr(() => threadView(user, cid));
      expect(view.journey.identities?.list[0].faces.heading).toEqual({ family: "Cormorant", file: "Cormorant-600.ttf", weight: 600 });
      expect(view.journey.identities?.list[2].logoStyleLabel).toBe("mascotte illustrée");

      // Nouvelle proposition partielle : seule C est refaite, A et B restent identiques.
      identityDeps.generate = async () => { const g = good(); g[0].name = "Changé"; g[2].name = "Cirette"; return { identities: g }; };
      const redo = await call("identity.propose", ctx, { redo: ["C"], guidance: "Un nom plus court pour C" });
      expect(redo.ok).toBe(true);
      expect(J.journeyOf(cid).identities?.list.map((x) => x.name)).toEqual(["Ocrea", "Lumo", "Cirette"]);
      expect(J.journeyOf(cid).identities?.round).toBe(2);
    } finally { identityDeps.generate = undefined; }
  });

  it("points non validés après la reprise : dits au client, jamais présentés comme bons", async () => {
    const { cid, ctx } = await stepOneThread();
    identityDeps.generate = async () => { const g = good(); g[1].name = "Ocrea"; return { identities: g }; };
    try {
      const r = await call("identity.propose", ctx, {});
      expect(r.ok).toBe(true);
      expect(r.summary).toMatch(/Points non validés .*même nom/);
      expect(J.journeyContext(J.journeyOf(cid))).toMatch(/n'a pas pu valider .*même nom/);
    } finally { identityDeps.generate = undefined; }
  });

  it("choix du client avec mélange et retouche mot pour mot : marque du projet enregistrée, étape 1 validée", async () => {
    const { cid, ctx, pid } = await stepOneThread();
    identityDeps.generate = async () => ({ identities: good() });
    try { await call("identity.propose", ctx, {}); } finally { identityDeps.generate = undefined; }
    const r = await call("identity.choose", ctx, { key: "A", mix: { palette: "C" }, slogan: "La chaleur des mains" });
    expect(r.ok).toBe(true);
    expect(r.summary).toMatch(/Identité A \(avec palette de C\)/);
    const b = loadProject(pid).brand!;
    expect(b.name).toBe("Ocrea");
    expect(b.tagline).toBe("La chaleur des mains");
    expect(b.palette).toEqual(good()[2].palette);
    expect(b.fonts).toEqual({ heading: "cormorant_n6", body: "inter_n4" });
    expect(b.tone.dont).toEqual(["superlatifs", "jargon", "promesses"]);
    expect(b.alternatives).toEqual(["Lumo", "Brindille"]);
    expect(b.logo.status).toBe("proposed");
    expect(loadProject(pid).name).toBe("Ocrea"); // le nom provisoire est remplacé
    expect(JSON.parse(one<any>("SELECT value FROM memory WHERE project_id=? AND key='syna.identite'", pid).value).mix).toEqual({ palette: "C" });
    const j = J.journeyOf(cid);
    expect(j.steps[1].status).toBe("done");
    expect(j.steps[2].status).toBe("todo");
    expect(J.currentStep(j)).toBe(2);
    expect(mixIdentity(good() as any, "B", { name: "C" }).name).toBe("Brindille");
    // Une fois choisie, l'identité n'est pas reproposée en douce.
    expect((await call("identity.propose", ctx, {})).ok).toBe(false);
  });

  it("refonte : nom, slogan et logo gardés ; aucun nouveau logo (étape 2 sans objet) ; nom non modifiable", async () => {
    const { cid, ctx, pid } = await stepOneThread({ keep: ["logo", "slogan"], name: "Brume d'Ambre", slogan: "L'ambre au cœur" });
    const kept = good().map((x) => ({ ...x, name: "Brume d'Ambre", slogan: "L'ambre au cœur" }));
    const seen: any[] = [];
    identityDeps.generate = async (c) => { seen.push(c); return { identities: kept }; };
    try { expect((await call("identity.propose", ctx, {})).ok).toBe(true); } finally { identityDeps.generate = undefined; }
    expect(seen).toHaveLength(1); // nom et slogan gardés repris mot pour mot : aucune reprise
    expect(seen[0].prompt).toMatch(/Refonte : le client garde TEL QUEL logo, slogan, nom/);
    expect((await call("identity.choose", ctx, { key: "B", name: "Autre nom" })).ok).toBe(false);
    const r = await call("identity.choose", ctx, { key: "B" });
    expect(r.ok).toBe(true);
    const b = loadProject(pid).brand!;
    expect(b.name).toBe("Brume d'Ambre");
    expect(b.nameStatus).toBe("provided");
    expect(b.tagline).toBe("L'ambre au cœur");
    const j = J.journeyOf(cid);
    expect(j.steps[2].status).toBe("skipped");
    expect(J.currentStep(j)).toBe(3);
  });

  it("essai réel du mélange : carte « Ton identité » avec le vrai résultat, élision corrigée, pas de faux dégradé", async () => {
    const { fixElision, mixLabel } = await import("@/lib/syna-agent/loop");
    expect(fixElision("Je enregistre ce mélange.")).toBe("J'enregistre ce mélange.");
    expect(fixElision("Je hais rien, je garde le nom.")).toBe("Je hais rien, je garde le nom.");
    expect(fixElision("Tell me and I will.")).toBe("Tell me and I will.");
    const list = I.IdentitiesSchema.parse({ identities: good() }).identities;
    expect(mixLabel(list, { key: "B", mix: { palette: "A" } })).toBe("Lumo (B) avec les couleurs de Ocrea (A)");
    expect(mixLabel(list, { key: "B", mix: {} })).toBe("");
    const { cid, ctx, pid, user } = await stepOneThread();
    identityDeps.generate = async () => ({ identities: good().map((x: any) => ({ ...x, gradient: x.gradient ?? { from: "#FFFFFF", to: "#FFFFFF" } })) });
    try { await call("identity.propose", ctx, {}); } finally { identityDeps.generate = undefined; }
    expect((await call("identity.choose", ctx, { key: "B", mix: { palette: "A" } })).ok).toBe(true);
    const b = loadProject(pid).brand!;
    expect(b.ground).toBe("blanc");
    expect(b.gradient).toBeUndefined(); // fond blanc : aucun dégradé gardé
    const view = await fr(() => threadView(user, cid));
    const final = view.journey.identities!.final!;
    expect(final.name).toBe("Lumo");
    expect(final.palette).toEqual(good()[0].palette);
    expect(final.ground).toBe("blanc");
    expect(final.mixLabel).toBe("Lumo (B) avec les couleurs de Ocrea (A)");
    expect(final.why).toBe(""); // le « pourquoi » de B parlait de ses couleurs : plus repris après le mélange
    expect(mixIdentity(good() as any, "B", { name: "A" }).why).toBe(good()[1].why); // nom seulement : gardé
  });

  it("50 typographies du propriétaire (7 novembre) : toutes disponibles, fichiers et licences présents, proposées à Claude", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { FONT_FILES, FONT_HANDLES } = await import("@/lib/theme/render");
    const wanted = ["Inter", "Manrope", "DM Sans", "Plus Jakarta Sans", "Outfit", "Sora", "Space Grotesk", "Urbanist", "Figtree", "Geist", "Montserrat", "Poppins", "Raleway", "Nunito Sans", "Work Sans", "Lato", "Open Sans", "Source Sans 3", "Rubik", "Barlow", "Playfair Display", "Cormorant Garamond", "Bodoni Moda", "DM Serif Display", "Prata", "Libre Baskerville", "Lora", "Merriweather", "Fraunces", "Instrument Serif", "Bebas Neue", "Anton", "Oswald", "Archivo Black", "Unbounded", "Syne", "Righteous", "Abril Fatface", "Alfa Slab One", "Yeseva One", "Caveat", "Dancing Script", "Pacifico", "Sacramento", "Satisfy", "Allura", "IBM Plex Mono", "Space Mono", "JetBrains Mono", "Roboto Mono"];
    expect(wanted).toHaveLength(50);
    const families = new Set(Object.values(FONT_FILES).map((f) => f.family));
    expect(wanted.filter((w) => !families.has(w))).toEqual([]);
    for (const [key, f] of Object.entries(FONT_FILES)) {
      for (const file of Object.values(f.files)) expect(fs.existsSync(path.join(process.cwd(), "assets", "fonts", file)), `${key} ${file}`).toBe(true);
      expect(I.FONT_CHARACTER[key], key).toBeTruthy();
    }
    for (const stem of ["Manrope", "Geist", "SourceSans3", "RobotoMono"]) expect(fs.readdirSync(path.join(process.cwd(), "assets", "fonts", "licenses")).some((x) => x.startsWith(`${stem}-`)), stem).toBe(true);
    expect(FONT_HANDLES).toEqual(expect.arrayContaining(["manrope_n8", "source_sans_3_n4", "bodoni_moda_n6", "dancing_script_n7"]));
    expect(I.fontFace("source_sans_3_n6")).toEqual({ family: "Source Sans 3", file: "SourceSans3-600.ttf", weight: 600 });
    expect(I.IDENTITY_SYSTEM).toContain("bodoni_moda (Bodoni Moda, serif très contrastée, mode et luxe");
    expect(I.IDENTITY_SYSTEM).toMatch(/jamais une manuscrite ni une chasse fixe pour les textes/);
    expect(I.bodyFontOk("inter_n4")).toBe(true);
    for (const h of ["dancing_script_n4", "bebas_neue_n4", "roboto_mono_n4"]) expect(I.bodyFontOk(h), h).toBe(false);
    const bad = good(); bad[0].fonts.body = "pacifico_n4";
    expect(I.identityIssues(I.IdentitiesSchema.parse({ identities: bad }).identities, J.emptyJourney()).join()).toMatch(/« Pacifico » est une police de titres, manuscrite ou à chasse fixe/);
  });
  it("noms liés au PRODUIT (retour du 7 novembre : « les 3 noms n'ont rien à voir avec le produit »)", async () => {
    expect(I.IDENTITY_SYSTEM).toMatch(/le nom a une LOGIQUE claire avec le produit ou le service, jamais un mot pris au hasard/);
    expect(I.IDENTITY_SYSTEM).toMatch(/nameWhy = la logique en une ou deux phrases simples, MONTRÉE AU CLIENT/);
    expect(I.IDENTITY_SYSTEM).toMatch(/nameAnchor = l'élément du produit dont part le nom[^]*nameTest = ce qu'un inconnu imagine/);
    // Pourquoi les noms n'étaient ni beaux ni originaux : des assemblages inventés et des jeux de mots négatifs.
    const refs = (await import("@/lib/syna-agent/brand-references")).referencesForPrompt();
    expect(refs).toMatch(/LA LOGIQUE D'ABORD : chaque nom a un lien évident avec le produit ou le service/);
    expect(refs).toMatch(/Le sens courant est positif ou neutre \(jamais rabâcher, déroute, repris de justice/);
    const few = good(); few[0].nameCandidates = ["Roue Libre"]; few[2].nameExpression = "";
    const fi = I.identityIssues(I.IdentitiesSchema.parse({ identities: few }).identities, J.emptyJourney()).join();
    expect(fi).toMatch(/Identité A : écris au moins 12 pistes dans nameCandidates/);
    expect(fi).toMatch(/Identité C : nameExpression vide/);
    // « Ça doit faire plus marque » : trois genres de noms, jamais une phrase.
    expect(I.IDENTITY_SYSTEM).toMatch(/Le nom FAIT MARQUE[^]*« Bien Roulé », « Ça Roule », « Dans le Sac » ont été refusés/);
    // Produits : trois mots inventés (choix du 7 novembre) ; services : trois genres différents.
    const prod = J.emptyJourney(); prod.start.business = { value: "products", status: "answered", source: "client", at: 1 } as any;
    expect(I.nameKindRule(prod)).toMatch(/MARQUE DE PRODUITS → les TROIS noms sont des MOTS INVENTÉS/);
    const real = good(); real[0].nameKind = "mot";
    expect(I.identityIssues(I.IdentitiesSchema.parse({ identities: real }).identities, prod).join()).toMatch(/Identité A : marque de produits → le nom doit être un mot inventé/);
    expect(I.identityPrompt(prod)).toMatch(/# Genre des noms : MARQUE DE PRODUITS/);
    // « C'est un peu mieux » : repères de vrais noms inventés et de leur fabrication ; fusion invisible, pas de terminaison plaquée.
    expect(refs).toMatch(/Velcro \(« velours » \+ « crochet »/);
    expect(refs).toMatch(/la fusion est INVISIBLE[^]*pas de terminaison plaquée/);
    expect(I.nameKindRule(prod)).toMatch(/au moins 15 mots inventés[^]*jamais le premier venu/);
    const serv = J.emptyJourney(); serv.start.business = { value: "services", status: "answered", source: "client", at: 1 } as any;
    expect(I.nameKindRule(serv)).toMatch(/ENTREPRISE DE SERVICES → trois genres différents/);
    expect(I.identityIssues(I.IdentitiesSchema.parse({ identities: good() }).identities, serv).join()).toMatch(/trois genres différents/);
    const mixed = good(); mixed[1].nameKind = "mot"; mixed[2].nameKind = "deux_mots";
    expect(I.identityIssues(I.IdentitiesSchema.parse({ identities: mixed }).identities, serv).join()).not.toMatch(/genres|mot inventé/);
    const long = good(); long[1].name = "Lumo Clair"; // un mot inventé tient en un seul mot
    expect(I.identityIssues(I.IdentitiesSchema.parse({ identities: long }).identities, J.emptyJourney()).join()).toMatch(/« Lumo Clair » doit tenir en un seul mot/);
    const bad = good(); bad[1].nameAnchor = "";
    expect(I.identityIssues(I.IdentitiesSchema.parse({ identities: bad }).identities, J.emptyJourney()).join()).toMatch(/Identité B : nameAnchor vide — dis de quel élément concret du produit/);
  });
});
