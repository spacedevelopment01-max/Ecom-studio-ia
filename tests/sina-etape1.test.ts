/**
 * SINA — les identités de marque : ce qui se mesure sans IA (palettes et contrastes, couleurs refusées, polices), les
 * références du propriétaire, le choix du client (avec mélange et retouches mot pour mot) enregistré comme marque du
 * projet, la refonte respectée (nom, slogan, logo gardés). L'ancienne création en un seul appel a été retirée le
 * 16 novembre 2026 : la création par la chaîne a ses tests (sina-chaine-marque, sina-routes-de-marque). Les identités
 * de ces tests sont posées dans le parcours telles quelles. Aucun appel d'IA.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — les identités de marque : contrôles, choix et mélange", async () => {
  // Le logo est dessiné par le modèle imposé des logos (23 novembre 2026) : le devis de la marque prend son tarif par image.
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { threadView } = await import("@/lib/syna-agent/loop");
  const { mixIdentity } = await import("@/lib/syna-agent/tools/identity");
  const { z } = await import("zod");
  const I = await import("@/lib/syna-agent/identities");
  const J = await import("@/lib/syna-agent/journey");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const ctxOf = (user: any, cid: string) => ({ user, conversationId: cid, runId: "test", projectId: null as string | null, attachment: () => null }) as any;
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  const good = (): any[] => [
    { key: "A", name: "Éclat de cire", nameKind: "expression", nameStyle: "expression évocatrice", nameWhy: "", nameCandidates: ["a","b","c","d","e","f","g","h","i","j","k","l"], nameExpression: "expression existante", nameAnchor: "la flamme de la bougie", slogan: "La chaleur du fait main", sloganTone: "poétique", promise: "Des bougies coulées à la main qui réchauffent ton intérieur.", territory: "fierté artisanale", ground: "blanc", palette: { dark: "#111111", primary: "#1D4ED8", secondary: "#DBEAFE", accent: "#F97316", light: "#FFFFFF" }, paletteFamily: "tons chauds ton sur ton", fonts: { heading: "cormorant_n6", body: "inter_n4" }, fontStyle: "serif fine contrastée", tone: { adjectives: ["chaleureux", "précis", "sincère"], avoid: ["superlatifs", "jargon", "promesses"] }, logoStyle: "embleme", logoIdea: "Une flamme dans un sceau rond.", why: "Ta clientèle aime l'artisanat." },
    { key: "B", name: "Souffle de mèche", nameKind: "expression", nameStyle: "expression évocatrice", nameWhy: "", nameCandidates: ["a","b","c","d","e","f","g","h","i","j","k","l"], nameExpression: "expression existante", nameAnchor: "la flamme de la bougie", slogan: "Allume l'instant", sloganTone: "direct", promise: "Une lumière douce pour chaque moment calme.", territory: "évasion", ground: "degrade", gradient: { from: "#FFD6A5", to: "#C8B6FF" }, palette: { dark: "#1F1A14", primary: "#B91C1C", secondary: "#FDE68A", accent: "#16A34A", light: "#F5EEDC" }, paletteFamily: "sombre et un accent vif", fonts: { heading: "archivo_n8", body: "dm_sans_n4" }, fontStyle: "grotesque grasse", tone: { adjectives: ["direct", "lumineux", "moderne"], avoid: ["mièvrerie", "jargon", "promesses"] }, logoStyle: "lettrage", logoIdea: "Le O de Souffle de mèche devient une flamme.", why: "Tu veux une image moderne." },
    { key: "C", name: "Lueur d'ambre", nameKind: "expression", nameStyle: "expression évocatrice", nameWhy: "", nameCandidates: ["a","b","c","d","e","f","g","h","i","j","k","l"], nameExpression: "expression existante", nameAnchor: "la flamme de la bougie", slogan: "Complice de tes soirées", sloganTone: "complice et léger", promise: "Des bougies joyeuses à offrir et à s'offrir.", territory: "complicité joyeuse", ground: "sombre", palette: { dark: "#0B0B12", primary: "#FACC15", secondary: "#312E81", accent: "#C084FC", light: "#F5F5F7" }, paletteFamily: "clair et frais", fonts: { heading: "nunito_n8", body: "karla_n4" }, fontStyle: "ronde épaisse", tone: { adjectives: ["complice", "léger", "joyeux"], avoid: ["froideur", "jargon", "promesses"] }, logoStyle: "mascotte", logoIdea: "Une petite bougie souriante.", why: "Tu vends beaucoup en cadeau." },
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
    const ok = await (await import("./faits-fixtures")).avecLesFaitsDemandes(ctx, () => call("start.confirm", ctx, {}));
    expect(ok.ok).toBe(true);
    return { user, cid, ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  /** Identités posées dans le parcours comme une proposition déjà montrée au client (sans planche). */
  const parse = (list: any[]) => z.array(I.IdentitySchema).parse(list);
  const propose = (cid: string, list: any[] = good()) => J.updateJourney(cid, (x) => {
    x.identities = { list: parse(list), issues: [], comparison: "", at: Date.now(), round: (x.identities?.round ?? 0) + 1 };
    J.setStep(x, 1, "review");
  });


  it("règle du propriétaire : le prix de l'action payante de l'étape est donné à SINA, le même que sur la carte d'accord", async () => {
    const { stepQuote } = await import("@/lib/syna-agent/loop");
    const { user, cid, pid } = await stepOneThread();
    const q = await stepQuote(user, { id: "run-test", conversation_id: cid, project_id: pid, user_id: user.id } as any);
    expect(q).toMatch(/# Prix de la prochaine action payante de l'étape\nidentity\.propose \(\d identités de marque\) : (?:coût probable .*% de ton budget IA ; plafond )?.*% de ton budget IA.*Le Studio montre ce prix au client sur la carte d'accord/);
  });

  it("contrôle gratuit des palettes : fond conforme, vrai dégradé de couleurs, fond sombre vraiment foncé ; couleurs refusées par le client", () => {
    // Un dégradé doit être un vrai dégradé de couleurs (ni beige ni crème), un fond sombre vraiment foncé.
    expect(I.paletteIssues(good()[1].palette, "degrade", { from: "#F5EEDC", to: "#EFE6D2" }).join()).toMatch(/dégradé de couleurs est attendu|nettement différentes/);
    expect(I.paletteIssues(good()[1].palette, "degrade").join()).toMatch(/deux couleurs .* manquent/);
    expect(I.paletteIssues(good()[1].palette, "degrade", good()[1].gradient)).toEqual([]);
    expect(I.paletteIssues({ ...good()[2].palette, dark: "#4A4A5A" }, "sombre").join()).toMatch(/fond très foncé/);
    expect(I.paletteIssues({ ...good()[0].palette, dark: "#9CA3AF" }, good()[0].ground, good()[0].gradient).join()).toMatch(/texte\/fond : contraste/);
    expect(I.refusedColors("J'aime le vert et le bleu, mais pas de rose ni de violet.")).toEqual(expect.arrayContaining(["rose", "violet"]));
    expect(I.refusedColors("J'aime le vert et le bleu.")).toEqual([]);
    const j = J.emptyJourney();
    j.start.image = { value: "Moderne et doux, surtout pas de rouge.", status: "answered", source: "client", at: 1 };
    expect(I.refusedColorIssues({ palette: { ...good()[0].palette, primary: "#B91C1C" } }, j).join()).toMatch(/primary #B91C1C .*refusée.*rouge/);
  });

  it("références du propriétaire (7 novembre) : ses 49 palettes passent le contrôle, ses 50 noms et leur logique aussi", async () => {
    const R = await import("@/lib/syna-agent/brand-references");
    expect(R.NAME_EXAMPLES).toHaveLength(52); // ses 50 exemples + SOLSTICE et RUPTURE (genre préféré du 9 novembre)
    expect(R.NAME_EXAMPLES.map((n) => n.name)).toEqual(expect.arrayContaining(["Solstice", "Rupture"]));
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
    expect(fixElision("Je relance avec le modèle OpenAI.")).toBe("Je relance avec le modèle OpenAI."); // jamais « modèl'OpenAI »
    expect(fixElision("Je vois le ensemble.")).toBe("Je vois l'ensemble.");
    const out = (message: string) => withoutRepeatedQuestion({ message, actions: [], question: { text: "Laquelle préfères-tu ?" }, done: false }).message;
    // Essai réel du 8 novembre : « Une correction à faire : » laissé seul à la fin du message.
    expect(withoutRepeatedQuestion({ message: "Voici l'accueil complet. Une correction à faire : la correction des frais de retour.", actions: [], question: { text: "Ces textes te conviennent-ils, avec la correction des frais de retour ?" }, done: false }).message).toBe("Voici l'accueil complet.");
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

  it("choix du client avec mélange et retouche mot pour mot : marque du projet enregistrée, étape 1 validée", async () => {
    const { cid, ctx, pid } = await stepOneThread();
    propose(cid);
    const r = await call("identity.choose", ctx, { key: "A", mix: { palette: "C" }, slogan: "La chaleur des mains" });
    expect(r.ok).toBe(true);
    expect(r.summary).toMatch(/Identité A \(avec palette de C\)/);
    const b = loadProject(pid).brand!;
    expect(b.name).toBe("Éclat de cire");
    expect(b.tagline).toBe("La chaleur des mains");
    expect(b.palette).toEqual(good()[2].palette);
    expect(b.fonts).toEqual({ heading: "cormorant_n6", body: "inter_n4" });
    expect(b.tone.dont).toEqual(["superlatifs", "jargon", "promesses"]);
    expect(b.alternatives).toEqual(["Souffle de mèche", "Lueur d'ambre"]);
    expect(b.logo.status).toBe("proposed");
    expect(loadProject(pid).name).toBe("Éclat de cire"); // le nom provisoire est remplacé
    expect(JSON.parse(one<any>("SELECT value FROM memory WHERE project_id=? AND key='syna.identite'", pid).value).mix).toEqual({ palette: "C" });
    const j = J.journeyOf(cid);
    expect(j.steps[1].status).toBe("done");
    // Le logo n'est pas encore fait : le repère 2 reste ouvert (la marque se finit ensuite, par brand.finish).
    expect(["todo", "doing"]).toContain(j.steps[2].status);
    expect(j.steps[3].status).toBe("todo");
    expect(J.currentStep(j)).toBe(2);
    expect(r.summary).not.toMatch(/Prochaine étape : ton logo/);
    expect(J.journeyContext(j)).toMatch(/il reste à la finir : appelle brand\.finish/);
    expect(mixIdentity(good() as any, "B", { name: "C" }).name).toBe("Lueur d'ambre");
    // Une fois choisie, l'identité n'est pas reproposée en douce.
    const again = await call("identity.propose", ctx, {});
    expect(again.ok).toBe(false);
    expect(again.summary).toMatch(/déjà choisie/);
  });

  it("refonte : nom, slogan et logo gardés ; aucun nouveau logo (étape 2 sans objet) ; nom non modifiable", async () => {
    const { cid, ctx, pid } = await stepOneThread({ keep: ["logo", "slogan"], name: "Brume d'Ambre", slogan: "L'ambre au cœur" });
    propose(cid, good().map((x) => ({ ...x, name: "Brume d'Ambre", slogan: "L'ambre au cœur" })));
    expect((await call("identity.choose", ctx, { key: "B", name: "Autre nom" })).ok).toBe(false);
    // Le logo gardé du client, rangé dans ses Fichiers (comme start.confirm le fait depuis son site ou sa pièce jointe).
    const sharp = (await import("sharp")).default;
    const { saveAsset } = await import("@/lib/library");
    const png = await sharp({ create: { width: 600, height: 240, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="240"><circle cx="120" cy="120" r="90" fill="#7A3E2B"/><rect x="240" y="90" width="320" height="60" fill="#1F2A3A"/></svg>') }]).png().toBuffer();
    await saveAsset({ projectId: pid, userId: ctx.user.id, data: png, name: "logo-client.png", mime: "image/png", role: "logo", origin: "upload" });
    const r = await call("identity.choose", ctx, { key: "B" });
    expect(r.ok).toBe(true);
    const b = loadProject(pid).brand!;
    expect(b.name).toBe("Brume d'Ambre");
    expect(b.nameStatus).toBe("provided");
    expect(b.tagline).toBe("L'ambre au cœur");
    const j = J.journeyOf(cid);
    expect(j.steps[2].status).toBe("skipped");
    expect(J.currentStep(j)).toBe(3);
    // Logo gardé : la marque se finit par brand.finish, qui ne dessine jamais de logo (ni le sien ni un autre).
    expect(J.journeyContext(j)).toMatch(/brand\.finish/);
    expect(() => getTool("brand.finish")!.args.parse({ redo: ["logo"] })).toThrow();
  });

  it("essai réel du mélange : carte « Ton identité » avec le vrai résultat, élision corrigée, pas de faux dégradé", async () => {
    const { fixElision, mixLabel } = await import("@/lib/syna-agent/loop");
    expect(fixElision("Je enregistre ce mélange.")).toBe("J'enregistre ce mélange.");
    expect(fixElision("Je hais rien, je garde le nom.")).toBe("Je hais rien, je garde le nom.");
    expect(fixElision("Tell me and I will.")).toBe("Tell me and I will.");
    const list = parse(good());
    expect(mixLabel(list, { key: "B", mix: { palette: "A" } })).toBe("Souffle de mèche (B) avec les couleurs de Éclat de cire (A)");
    expect(mixLabel(list, { key: "B", mix: {} })).toBe("");
    const { cid, ctx, pid, user } = await stepOneThread();
    propose(cid, good().map((x: any) => ({ ...x, gradient: x.gradient ?? { from: "#FFFFFF", to: "#FFFFFF" } })));
    expect((await call("identity.choose", ctx, { key: "B", mix: { palette: "A" } })).ok).toBe(true);
    const b = loadProject(pid).brand!;
    expect(b.ground).toBe("blanc");
    expect(b.gradient).toBeUndefined(); // fond blanc : aucun dégradé gardé
    const view = await fr(() => threadView(user, cid));
    const final = view.journey.identities!.final!;
    expect(final.name).toBe("Souffle de mèche");
    expect(final.palette).toEqual(good()[0].palette);
    expect(final.ground).toBe("blanc");
    expect(final.mixLabel).toBe("Souffle de mèche (B) avec les couleurs de Éclat de cire (A)");
    expect(final.why).toBe(""); // le « pourquoi » de B parlait de ses couleurs : plus repris après le mélange
    expect(mixIdentity(good() as any, "B", { name: "A" }).why).toBe(good()[1].why); // nom seulement : gardé
  });

  it("50 typographies du propriétaire (7 novembre) : toutes disponibles, fichiers et licences présents", async () => {
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
    expect(I.bodyFontOk("inter_n4")).toBe(true);
    for (const h of ["dancing_script_n4", "bebas_neue_n4", "roboto_mono_n4"]) expect(I.bodyFontOk(h), h).toBe(false);
  });
  it("noms liés au PRODUIT (retour du 7 novembre : « les 3 noms n'ont rien à voir avec le produit ») : références et genre « Éclat de thé »", async () => {
    const refs = (await import("@/lib/syna-agent/brand-references")).referencesForPrompt();
    expect(refs).toMatch(/LA LOGIQUE D'ABORD : chaque nom a un lien évident avec le produit ou le service/);
    expect(refs).toMatch(/Le sens courant est positif ou neutre \(jamais rabâcher, déroute, repris de justice/);
    expect(refs).toMatch(/GENRE VOULU PAR LE PROPRIÉTAIRE POUR LES MARQUES DE PRODUITS[^]*ÉCLAT DE THÉ/);
    expect(refs).toMatch(/Velcro \(« velours » \+ « crochet »/);
    expect(refs).toMatch(/la fusion est INVISIBLE[^]*pas de terminaison plaquée/);
    for (const n of ["Éclat de thé", "Lueur d'ambre", "Rosée du matin", "Fleur de sel marin"]) expect(I.EXPRESSION_NAME.test(n), n).toBe(true);
    for (const n of ["Éclat", "Un éclat de thé chaud tous les matins", "Éclat-Thé"]) expect(I.EXPRESSION_NAME.test(n), n).toBe(false);
    const prod = J.emptyJourney(); prod.start.business = { value: "products", status: "answered", source: "client", at: 1 } as any;
    const serv = J.emptyJourney(); serv.start.business = { value: "services", status: "answered", source: "client", at: 1 } as any;
    expect([I.nameKindsFor(prod), I.nameKindsFor(serv)]).toEqual(["produits", "services"]);
  });
});
