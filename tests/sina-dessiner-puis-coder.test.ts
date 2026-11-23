/**
 * Méthode « dessiner puis coder » apprise à SINA (19 novembre 2026) : le plan de toute la page d'abord, le juge des
 * faits, cinq dessins (ordinateur en trois morceaux, téléphone en deux), le code, les contrôles. Sans IA.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

const plan = (n = 9) => ({
  idee: "Raconter la journée du client, du matin au soir.",
  sections: Array.from({ length: n }, (_x, i) => ({ nom: `Section ${i + 1}`, pourquoi: "Une question.", disposition: `Disposition numéro ${i + 1}, précise.`, fond: i % 2 ? "sombre" : "clair", textes: [`Titre ${i + 1}`, `Texte ${i + 1}`], photo: i % 3 ? null : `Photo ${i + 1}` })),
  morceaux: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
});
const id = { marque: "Marque", couleurs: "couleur principale #FFD23F", polices: "Titres en Archivo Black", menu: ["Tarifs", "Contact"], telephone: "06 00 00 00 00", horaires: null, zone: null, liensPied: ["Mentions légales"] };

describe("dessiner puis coder : la méthode", async () => {
  const M = await import("@/lib/syna-agent/dessin/methode");
  const J = await import("@/lib/syna-agent/dessin/job");

  it("le plan a 8 à 10 sections, et personne ne les impose : la consigne donne seulement le nombre", () => {
    expect(M.PlanSchema.safeParse(plan(9)).success).toBe(true);
    expect(M.PlanSchema.safeParse(plan(7)).success).toBe(false);
    expect(M.PlanSchema.safeParse(plan(11)).success).toBe(false);
    expect(M.PLAN_SYSTEM).toMatch(/8 à 10 sections/);
    expect(M.PLAN_SYSTEM).toMatch(/c'est TOI qui les choisis/);
  });

  it("le juge corrige un texte faux, en retire un, et rétablit le nom d'une prestation ; une correction introuvable est comptée, jamais devinée", () => {
    const p = plan();
    p.sections[1].textes = ["Son atelier a deux roues.", "Il travaille seul.", "Freins qui couinent"];
    const r = M.appliquerJugement(p, { avis: "x", corrections: [
      { section: 2, avant: "Son atelier a deux roues.", apres: "Son atelier a trois roues.", pourquoi: "dossier" },
      { section: 2, avant: "Il travaille seul.", apres: "", pourquoi: "jamais dit" },
      { section: 2, avant: "Freins qui couinent", apres: "Réglage des freins et des vitesses", pourquoi: "nom exact" },
      { section: 5, avant: "introuvable", apres: "x", pourquoi: "" },
    ] });
    expect(r.plan.sections[1].textes).toEqual(["Son atelier a trois roues.", "Réglage des freins et des vitesses"]);
    expect(r.appliquees).toBe(3);
    expect(r.ignorees).toBe(1);
    expect(p.sections[1].textes).toHaveLength(3);
  });

  it("les trois morceaux du dessin : ceux du plan s'ils couvrent chaque section une fois, sinon trois parts égales", () => {
    expect(M.morceauxSurs(plan())).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    expect(M.morceauxSurs({ ...plan(), morceaux: [[1, 2], [2, 3], [4]] })).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    expect(M.morceauxSurs({ ...plan(8), morceaux: [[1], [2], [3]] })).toEqual([[1, 2, 3], [4, 5, 6], [7, 8]]);
  });

  it("cinq dessins : le logo seulement au premier et au dernier de l'ordinateur ; le milieu sans en-tête ; le téléphone avec la liste exacte de ses sections", () => {
    const c = M.consignesDessins(plan(), id);
    expect(c.map((x) => x.nom)).toEqual(["1-haut", "2-milieu", "3-bas", "4-tel-haut", "5-tel-bas"]);
    expect(c[0].refs).toEqual(["logo"]);
    expect(c[1].refs).toEqual(["haut"]);
    expect(c[1].prompt).toMatch(/AUCUN logo ni en-tête dans ce morceau/);
    expect(c[2].prompt).toMatch(/le logo ne va QUE dans le pied de page/);
    expect(c[0].prompt).toContain("SECTION 1 « Section 1 »");
    expect(c[0].prompt).not.toContain("SECTION 4 ");
    expect(c[3].prompt).toMatch(/EXACTEMENT ces sections, une seule fois chacune/);
    expect(c[3].prompt).toContain("SECTION 5 ");
    expect(c[3].prompt).not.toContain("SECTION 6 ");
    expect(c[4].prompt).toContain("SECTION 6 ");
    expect(c[4].prompt).toMatch(/PIED DE PAGE/);
  });

  it("le code reçoit le plan entier, les fichiers exacts des photos et du logo ; seuls les chemins d'un thème sont écrits", () => {
    const d = M.demandeCode(plan(), id, { photos: [{ fichier: "marque-photo-01.webp", format: "1600x1067", description: "Une cour." }], logo: "marque-logo.png", logoClair: "marque-logo-clair.png", liens: "x" });
    expect(d).toContain("« Titre 9 »");
    expect(d).toContain("marque-photo-01.webp (1600x1067)");
    expect(d).toContain("'marque-logo-clair.png' (fond sombre)");
    expect(M.CODE_SYSTEM).toMatch(/RESPONSIVE PARFAIT/);
    expect(M.CODE_SYSTEM).toMatch(/un bouton \(son bord et son ombre\) se voit toujours en entier/);
    for (const ok of ["sections/marque-ouverture.liquid", "templates/index.json", "assets/marque.css", "layout/theme.liquid"]) expect(M.cheminSur(ok), ok).toBe(true);
    for (const ko of ["../etc/passwd", "sections/../../x", "app/page.tsx", "assets/a/b/c.css"]) expect(M.cheminSur(ko), ko).toBe(false);
    expect(M.slugMarque("Bécane")).toBe("becane");
  });

  it("le prix : plan, juge, cinq dessins, les photos qui manquent et le code ; le plafond garde une marge raisonnable", () => {
    const q = J.dessinQuote(0), q2 = J.dessinQuote(3);
    expect(q.probableMicro).toBe(120_000 + 2 * 60_000 + 5 * 115_000 + 300_000);
    expect(q2.probableMicro! - q.probableMicro!).toBe(3 * (115_000 + 15_000));
    expect(q.maxMicro).toBeLessThanOrEqual(Math.round(q.probableMicro! * 1.6));
    expect(q.label).not.toMatch(/€/);
    // Essai réel du 19 novembre 2026 : un plafond de dessin sous la réserve du Studio (0,186 €) a arrêté la tâche.
    expect(J.imageMaxMicro()).toBeGreaterThanOrEqual(J.DESSIN_COUTS.image.max);
    expect(J.DESSIN_COUTS.image.max).toBeGreaterThanOrEqual(186_047);
    expect(fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8")).toContain("trace(`dessin-${c.nom}`, imageMaxMicro())");
  });

  it("l'identité : le nom lisible des polices ; les réglages par défaut du thème ; le logo clair pour les fonds sombres", async () => {
    expect(J.nomPolice("archivo_black_n4")).toBe("Archivo Black");
    expect(J.nomPolice("work_sans_n4")).toBe("Work Sans");
    expect(JSON.parse(J.reglagesParDefaut(JSON.stringify([{ name: "x", settings: [{ id: "titre", default: "archivo_black_n4" }, { id: "sans" }] }])))).toEqual({ current: { titre: "archivo_black_n4" } });
    const png = await sharp({ create: { width: 2, height: 1, channels: 4, background: { r: 26, g: 31, b: 58, alpha: 1 } } }).png().toBuffer();
    const { data } = await sharp(await J.logoClair(png, "#FFF6E0")).raw().toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]]).toEqual([255, 246, 224]);
  });

  it("le code est fait par Sol 6.2 par défaut, avec assez de place, et une réponse coupée n'est jamais relancée toute seule", () => {
    expect(J.codeModel()).toEqual({ provider: "openai", model: "gpt-6.2-sol", effort: "high" });
    expect(J.CODE_OUTPUT_TOKENS).toBeGreaterThanOrEqual(48_000);
    const src = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
    expect((src.match(/sansRelanceCoupee: true/g) ?? []).length).toBe(5);
    const llm = fs.readFileSync("src/lib/ai/llm.ts", "utf8");
    expect(llm).toContain('if (r.stop === "max_tokens" && call.sansRelanceCoupee) throw new ReponseInexploitable(REPONSE_COUPEE(), true);');
    expect(llm).toContain("if (cut && call.sansRelanceCoupee) throw new ReponseInexploitable(REPONSE_COUPEE(), true);");
  });
});

describe("dessiner puis coder : les corrections de l'essai réel du 19 novembre 2026", async () => {
  const M = await import("@/lib/syna-agent/dessin/methode");
  it("le juge relit aussi les textes du site codé, et traque un service que le client ne propose pas", () => {
    expect(M.JUGE_SYSTEM).toMatch(/un SERVICE ou une offre que le dossier ne propose pas[^;]*urgence/);
    const files = [
      { path: "templates/index.json", content: JSON.stringify({ sections: { a: { type: "x", settings: { titre: "Demain matin, laisse ta bécane", aide: "Une urgence ? Appelle-moi au", photo: "marque-photo-01.webp", fond: "#FFD23F" } } } }) },
      { path: "sections/footer.liquid", content: "<footer><p>Mentions légales</p>{{ section.settings.x }}{% schema %}{}{% endschema %}</footer>" },
      { path: "sections/marque-a.liquid", content: "<p>{{ section.settings.aide }}</p>" },
    ];
    const t = M.textesDuCode(files);
    expect(t).toContain("Une urgence ? Appelle-moi au");
    expect(t).toContain("Mentions légales");
    expect(t).not.toContain("marque-photo-01.webp");
    expect(t).not.toContain("#FFD23F");
    expect(M.corrigerFichiers(files, "Une urgence ? Appelle-moi au", "Tu préfères parler ? Appelle-moi au")).toBe(1);
    expect(files[0].content).toContain("Tu préfères parler ? Appelle-moi au");
    expect(M.corrigerFichiers(files, "introuvable", "x")).toBe(0);
    const job = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
    expect(job).toContain('ctx.step("juge-code"');
    expect(job.indexOf('ctx.step("juge-code"')).toBeLessThan(job.indexOf('ctx.step("controle"'));
  });

  it("le code garde le sujet entier sur l'ouverture, sur téléphone comme sur ordinateur, sans rond décoratif derrière le titre", () => {
    expect(M.CODE_SYSTEM).toMatch(/l'OUVERTURE prend une photo d'ensemble[^;]*jamais un gros plan de détail/);
    expect(M.CODE_SYSTEM).toMatch(/garde le sujet ENTIER/);
    expect(M.CODE_SYSTEM).toMatch(/aucun rond ni aplat décoratif derrière un titre/);
    // Boutique : la vraie photo de chaque produit, sur sa carte seulement (jamais un produit sans sa photo).
    expect(M.CODE_SYSTEM).toMatch(/une « PHOTO DU PRODUIT » ne va que sur la carte ou le bloc de CE produit/);
    expect(fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8")).toContain("for (const [i, x] of catalogue.filter((x) => x.photo).entries()) await poser(x.photo!, `${slug}-produit-${i + 1}.webp`, `PHOTO DU PRODUIT");
  });

  it("SINA a sous les yeux ses dessins et le code affiché avant d'en parler", async () => {
    const A = await import("@/lib/syna-agent/attachments");
    expect(typeof A.accueilDessineImages).toBe("function");
    expect(A.ACCUEIL_DESSINE_FENETRE_MS).toBe(2 * 60 * 60_000);
    expect(fs.readFileSync("src/lib/syna-agent/attachments.ts", "utf8")).toContain("for (const im of await accueilDessineImages(projectId).catch(() => [])) if (out.length < 8) out.push(im);");
    expect(fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8")).toContain("|Accueil dessiné)/");
    expect(fs.readFileSync("src/lib/syna-agent/dessin/tools.ts", "utf8")).toContain("te sont joints : regarde-les toi-même avant d'en parler");
  });
});

describe("dessiner puis coder : les corrections de l'essai sur Atelier Vasco (19 novembre 2026)", async () => {
  const M = await import("@/lib/syna-agent/dessin/methode");
  it("une correction du juge qui cite la question et sa réponse les retire toutes les deux", () => {
    const p = plan();
    p.sections[7].textes = ["Vos questions", "Puis-je renvoyer mon sac ?", "Oui, dans les 14 jours.", "Combien coûte la livraison en Europe ?", "[À compléter : tarif]"];
    const r = M.appliquerJugement(p, { avis: "x", corrections: [{ section: 8, avant: "« Combien coûte la livraison en Europe ? » « [À compléter : tarif] »", apres: "", pourquoi: "sans réponse" }] });
    expect(r.plan.sections[7].textes).toEqual(["Vos questions", "Puis-je renvoyer mon sac ?", "Oui, dans les 14 jours."]);
    expect(r.appliquees).toBe(1);
  });

  it("jamais un blanc à remplir ni un « [À compléter] » sur l'accueil : retirés sans IA, la question avec sa réponse vide", () => {
    const p = plan();
    p.sections[2].textes = ["__ / __ / ____", "Il y a une date dans ce sac.", "Frappée le __ / __ / ____ dans la doublure.", "Combien coûte l'envoi ?", "[À compléter : tarif]", "Merci."];
    const r = M.nettoyerPlan(p);
    expect(r.plan.sections[2].textes).toEqual(["Il y a une date dans ce sac.", "Frappée le dans la doublure.", "Merci."]);
    expect(r.retires).toHaveLength(4);
    expect(M.PLAN_SYSTEM).toMatch(/Jamais un blanc à remplir/);
    expect(M.PLAN_SYSTEM).toMatch(/La photo de l'ouverture est une scène d'ensemble de l'univers de la marque, jamais un emplacement vide/);
    expect(M.CODE_SYSTEM).toMatch(/JAMAIS un emplacement vide ni « Ta photo ici »/);
  });

  it("le schéma du thème a toujours son theme_info complet, et un emplacement vide compte au contrôle", () => {
    const job = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
    expect(job).toContain("info.theme_documentation_url ??=");
    expect(job).toContain("info.theme_support_url ??=");
    expect(job).toContain("const net = nettoyerPlan(juge.plan);");
    expect(job).toContain("(texte.match(/\\[À compléter/g) ?? []).length");
    expect(job).toContain("const tenantsPlace = Math.max(0, (texte.match(/Ta photo ici/g) ?? []).length - sansPhoto);");
  });

  it("un produit sans photo garde sa carte avec « Ta photo ici », et un produit absent de l'accueil est un défaut (essai réel Braise : la carte d'un café caché)", () => {
    expect(M.CODE_SYSTEM).toMatch(/SEULE exception, un produit SANS photo : sa carte RESTE, avec son nom et son prix exacts/);
    expect(M.CODE_SYSTEM).toMatch(/jamais une carte cachée ni retirée/);
    const job = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
    expect(job).toContain("const absents = attendus.filter((t) => !plat.includes(");
    // Le code envoyé au navigateur n'a aucune fonction nommée (essai réel : « __name is not defined » sous tsx).
    const evalue = job.slice(job.indexOf("const m = await page.evaluate("), job.indexOf("}, { attendus, sansPhoto });"));
    expect(evalue.length).toBeGreaterThan(200);
    expect(evalue).not.toMatch(/(const|let)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>|function\s+\w+/);
    const tools = fs.readFileSync("src/lib/syna-agent/dessin/tools.ts", "utf8");
    expect(tools).toContain("x.produitsAbsents?.length");
  });
});

describe("dessiner puis coder : SINA crée toutes les photos du site, sauf celles des produits (19 novembre 2026)", async () => {
  const M = await import("@/lib/syna-agent/dessin/methode");
  const J = await import("@/lib/syna-agent/dessin/job");
  it("le plan dit, pour chaque photo, le produit mis en scène et son format ; une valeur mal formée ne fait rien perdre", () => {
    const p = plan();
    (p.sections[0] as any).produit = "Cabas Lune"; (p.sections[0] as any).format = "paysage";
    (p.sections[3] as any).format = "rond";
    const r = M.PlanSchema.parse(p);
    expect(r.sections[0]).toMatchObject({ produit: "Cabas Lune", format: "paysage" });
    expect(r.sections[3].format).toBeNull();
    expect(M.PLAN_SYSTEM).toMatch(/CHAQUE photo du site est créée pour sa section/);
    expect(M.PLAN_SYSTEM).toMatch(/un produit sans photo n'apparaît dans AUCUNE photo/);
    expect(M.CODE_SYSTEM).toMatch(/une « PHOTO DE LA SECTION n » va dans la section n/);
  });

  it("une photo créée par section, la vraie photo du produit en modèle, le dessin pour l'allure ; l'état des photos lu dans le catalogue ; le prix les compte toutes", async () => {
    const job = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
    expect(job).toContain("aiSitePhoto({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${ctx.job.id}:photo:${n}` }");
    expect(job).toContain("Aucun produit de la marque n'apparaît dans cette photo (un produit ne s'invente jamais).");
    expect(job).toContain("PHOTOS DES PRODUITS, ÉTAT ACTUEL DU CATALOGUE (fait foi, avant toute note plus ancienne)");
    expect(job).toContain("PHOTO DE LA SECTION ${c.n}");
    const media = fs.readFileSync("src/lib/ai/media-providers.ts", "utf8");
    expect(media).toContain('export async function aiSitePhoto(ctx: Ctx, input: { prompt: string; references: { role: "product" | "style"; data: Buffer }[]; aspect: "1:1" | "2:3" | "3:2" })');
    expect(fs.readFileSync("src/lib/syna-agent/dessin/tools.ts", "utf8")).toContain("const photosACreer = (_projectId: string, _business: string) => PHOTOS_ACCUEIL;");
    expect(J.dessinQuote(J.PHOTOS_ACCUEIL).probableMicro).toBe(120_000 + 2 * 60_000 + (5 + 8) * 115_000 + 300_000 + 8 * 15_000);
  });
});

describe("dessiner puis coder : corrections du second essai sur Atelier Vasco (19 novembre 2026)", async () => {
  const M = await import("@/lib/syna-agent/dessin/methode");
  const job = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
  it("les photos sont créées par OpenAI (route imposée), variées, dans la couleur exacte du produit", () => {
    expect(job).toContain("() => withQuotedImageRoute(mockupImageRoute(), () => aiSitePhoto(");
    expect(job).toContain("PHOTOS DÉJÀ FAITES POUR CETTE PAGE (la tienne est NETTEMENT différente");
    expect(job).toContain("dans EXACTEMENT la même couleur que sur sa photo (jamais une autre teinte)");
    expect(M.PLAN_SYSTEM).toMatch(/Les photos VARIENT d'une section à l'autre/);
  });
  it("les dessins reçoivent les vraies photos des produits ; le titre ne passe jamais sur le produit", () => {
    expect(job).toContain("for (const x of produitsAvecPhoto) refs.push({ role: \"scene\", data: assetData(getAsset(x.photo)!) });");
    expect(job).toContain("Chaque produit dessiné est EXACTEMENT l'un d'eux");
    expect(M.CODE_SYSTEM).toMatch(/le titre et les textes posés sur une photo vont sur sa partie CALME, jamais sur le produit/);
  });
  it("SINA ne promet jamais ce que son outil ne fait pas", async () => {
    const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
    expect(SYNA_SYSTEM).toMatch(/Tu ne lui promets jamais une étape que l'outil ne fait pas/);
    expect(fs.readFileSync("src/lib/syna-agent/dessin/tools.ts", "utf8")).toContain("Ce que l'outil NE fait PAS (ne le promets jamais)");
  });
});

describe("dessiner puis coder : une boutique a toujours le panier dans l'en-tête (remarque du propriétaire, 19 novembre 2026)", async () => {
  const M = await import("@/lib/syna-agent/dessin/methode");
  it("le panier est dessiné, codé et contrôlé ; jamais pour un service", () => {
    const boutique = { ...id, boutique: true };
    expect(M.consignesDessins(plan(), boutique)[0].prompt).toMatch(/l'icône du PANIER/);
    expect(M.consignesDessins(plan(), id)[0].prompt).not.toMatch(/PANIER/);
    const d = M.demandeCode(plan(), boutique, { photos: [], logo: "l.png", logoClair: "lc.png", liens: "x" });
    expect(d).toMatch(/ICÔNE DU PANIER toujours visible, sur téléphone comme sur ordinateur : lien \/cart/);
    expect(M.demandeCode(plan(), id, { photos: [], logo: "l.png", logoClair: "lc.png", liens: "x" })).not.toMatch(/PANIER/);
    expect(M.CODE_SYSTEM).toMatch(/Une BOUTIQUE a toujours l'icône du panier dans l'en-tête/);
    const job = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
    expect(job).toContain('boutique: p.business !== "services",');
    expect(job).toContain("panier: m.panier, produitsAbsents: m.absents, photosRecadrees: m.recadrees });");
    expect(fs.readFileSync("src/lib/syna-agent/dessin/tools.ts", "utf8")).toContain("(boutique && x.panier === false)");
  });
  it("un produit mis en scène est comparé à sa vraie photo par un autre modèle ; refusée, la vraie photo prend sa place, et la photo refusée se montre", () => {
    const job = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
    expect(M.FideleSchema.parse({ fidele: false, defaut: "silhouette changée" })).toEqual({ fidele: false, defaut: "silhouette changée" });
    expect(M.FIDELE_SYSTEM).toMatch(/même forme générale, mêmes proportions, même couleur/);
    expect(job).toContain('prefer: { provider: "anthropic", model: "claude-sonnet-5-5" }');
    expect(job).toContain("const id0 = c.refusee ? c.produitPhoto! : c.id ?? phototheque[secours]?.id;");
    expect(job).toContain("Photo refusée (section ${x.section}");
  });
  it("jamais un bouton vide : interdit au code, compté au contrôle (essai réel : un bouton sans texte après une correction)", () => {
    expect(M.CODE_SYSTEM).toMatch(/Un bouton, un lien ou un titre dont le réglage de texte est vide NE S'AFFICHE PAS/);
    const job = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
    expect(job).toContain("const vides = [...document.querySelectorAll(\"a,button\")]");
    expect(job).toContain("+ vides };");
  });
});

describe("dessiner puis coder : SINA l'a appris", async () => {
  it("l'arrêt au plafond d'une création se dit clairement : ce n'est pas le budget du client (essai réel : SINA avait compris l'inverse)", async () => {
    const { CostCapReached } = await import("@/lib/ai/trace");
    const m = new CostCapReached(1, 2, 3).message;
    expect(m).toMatch(/^plafond de dépense atteint : l'appel suivant n'a pas été envoyé/);
    expect(m).toMatch(/le budget d'IA du client n'est pas épuisé/);
  });

  it("son cahier est lu par ses trois spécialistes, sans la partie des mesures ni aucun exemple d'un client d'essai", async () => {
    const K = await import("@/lib/syna-agent/custom-theme/knowledge");
    for (const who of ["dessinateur", "jugeDessin", "codeur"] as const) expect(K.themeKnowledge(who), who).toMatch(/DESSINER PUIS CODER UNE PAGE/);
    const t = K.themeKnowledge("codeur");
    expect(t).toMatch(/réfléchir à toute la page/i);
    expect(t).not.toMatch(/Mesures de l'essai/);
    expect(t).not.toMatch(/vélo|Bécane|freins|roues/i);
  });

  it("ses outils sont branchés, la tâche de fond aussi, et sa consigne en parle", async () => {
    const { TOOL_LIST } = await import("@/lib/syna-agent/tools");
    expect(TOOL_LIST.map((x) => x.name)).toEqual(expect.arrayContaining(["site.dessiner", "site.dessin.voir"]));
    expect(TOOL_LIST.find((x) => x.name === "site.dessiner")!.kind).toBe("generate");
    expect(fs.readFileSync("worker/handlers.ts", "utf8")).toContain('"syna.dessin": async (ctx) =>');
    const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
    expect(SYNA_SYSTEM).toMatch(/site\.dessiner fait l'accueil comme les meilleures agences/);
    expect(fs.readFileSync("src/components/studio/syna-thread.tsx", "utf8")).toContain("data-syna-dessin");
  });
});

describe("dessiner puis coder : le contrôle de fidélité peut partir", async () => {
  const J = await import("@/lib/syna-agent/dessin/job");
  const { maxCostMicro } = await import("@/lib/ai/llm");
  const { FideleSchema } = await import("@/lib/syna-agent/dessin/methode");

  it("son plafond couvre la réserve que le Studio prend avant l'envoi (essai réel Braise : 0,04 € bloquait les six contrôles)", async () => {
    // Deux images de 768 px et la consigne : environ 2 500 jetons d'entrée ; la réserve compte 8 000 jetons de sortie au moins.
    const reserve = await maxCostMicro("claude-sonnet-5-5", { system: [{ type: "text", text: "x" }], messages: [{ role: "user", content: "x" }], max_tokens: 8000 }, FideleSchema, async () => 2500);
    expect(reserve).toBeGreaterThan(40_000);
    expect(J.DESSIN_COUTS.fidele.max).toBeGreaterThanOrEqual(reserve);
  });
});

describe("dessiner puis coder : un accueil coupé se reprend sans repayer (essai réel Braise du 20 novembre 2026)", async () => {
  const T = await import("@/lib/syna-agent/dessin/tools");
  const { run } = await import("@/lib/db");
  const { account } = await import("./conversation209-fixtures");

  it("la dernière création arrêtée EN ROUTE se reprend (une étape faite, quelle que soit la panne) ; le prix est ce qui reste", async () => {
    const u = await account();
    const pid = `p-dessin-coupe-${Date.now()}`;
    run("INSERT INTO projects(id,user_id,name,status,created_at,updated_at) VALUES(?,?,?,?,?,?)", pid, u.id, "Essai", "active", Date.now(), Date.now());
    expect(T.dessinCoupe(pid)).toBeNull();
    const t = Date.now();
    const etapes = JSON.stringify({ plan: {}, juge: {}, "dessin:1-haut": "a", photos: [], code: {}, "juge-code": {} });
    // Panne du Studio après le code (essai réel : le contrôle d'affichage a planté) : reprise possible.
    run("INSERT INTO jobs(id,user_id,project_id,type,label,payload,status,progress,message,error,attempts,max_attempts,run_at,created_at,updated_at,finished_at,checkpoint) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", `j1-${pid}`, u.id, pid, "syna.dessin", "Accueil", JSON.stringify({ projectId: pid, consigne: "Envie" }), "failed", 0.9, "page.evaluate: ReferenceError: __name is not defined", "page.evaluate: ReferenceError: __name is not defined", 2, 2, t, t, t, t, etapes);
    const c = T.dessinCoupe(pid)!;
    expect(c).toMatchObject({ id: `j1-${pid}`, payload: { consigne: "Envie" } });
    expect(T.ouArrete(c.etapes)).toBe("déjà fait et gardé : le plan de la page, sa relecture, les dessins, les photos, le code, la relecture du code");
    // Refusée avant toute étape (rien de fait) : rien à reprendre, une nouvelle création.
    run("INSERT INTO jobs(id,user_id,project_id,type,label,payload,status,progress,message,error,attempts,max_attempts,run_at,created_at,updated_at,finished_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", `j2-${pid}`, u.id, pid, "syna.dessin", "Accueil", "{}", "failed", 0, "Refusé", "Il faut d'abord le logo de la marque.", 2, 2, t + 1, t + 1, t + 1, t + 1);
    expect(T.dessinCoupe(pid)).toBeNull();
    const loop = (await import("node:fs")).readFileSync("src/lib/syna-agent/loop.ts", "utf8");
    expect(loop).toContain("${repriseAccueil(r.project_id, results)}");
    expect(loop).toMatch(/Ne dis jamais que la reprise est impossible ni que tu ne sais pas où il s'est arrêté/);
    const q = T.repriseDessinQuote({ probableMicro: 2_000_000, maxMicro: 3_400_000, label: "x" }, 1_200_000);
    expect(q.probableMicro).toBe(800_000);
    expect(q.maxMicro).toBe(2_200_000);
    expect(T.repriseDessinQuote({ probableMicro: 2_000_000, maxMicro: 3_400_000, label: "x" }, 1_950_000).probableMicro).toBe(400_000);
    expect(T.dessinTool.description).toMatch(/relancer:true quand la création de son accueil s'est arrêtée en route/);
    expect(T.dessinTool.description).toMatch(/sans relancer:true, c'est une NOUVELLE création, qui refait et repaie tout/);
  });
});

describe("dessiner puis coder : le juge refuse une citation qui n'est pas mot pour mot", async () => {
  const M = await import("@/lib/syna-agent/dessin/methode");
  it("une phrase signée du client ou de ses clients reprend ses mots exacts, ou elle est retirée (essai réel Braise)", () => {
    expect(M.JUGE_SYSTEM).toMatch(/une CITATION \(entre guillemets, signée, ou présentée comme les mots du client ou de ses clients/);
    expect(M.JUGE_SYSTEM).toMatch(/elle reprend ses mots exacts, ou elle est retirée/);
  });
});

describe("dessiner puis coder : une correction du juge citée entre guillemets est bien posée (essai réel Braise)", async () => {
  const M = await import("@/lib/syna-agent/dessin/methode");
  it("le passage entre « » est retrouvé sans ses guillemets, dans le plan comme dans le code", () => {
    const p = { idee: "x", morceaux: [[1], [2], [3]], sections: [
      { nom: "Semaine", pourquoi: "q", disposition: "d", fond: "sombre", textes: ["Mercredi", "Tout part, sans exception."], photo: null },
      { nom: "Marché", pourquoi: "q", disposition: "d", fond: "clair", textes: ["Mes habitués me disent que le café sent encore.", "Léa, au marché chaque samedi depuis 2023"], photo: null },
    ] } as any;
    const r = M.appliquerJugement(p, { avis: "", corrections: [
      { section: 1, avant: "« Tout part, sans exception. »", apres: "« Tout part. »", pourquoi: "promesse" },
      { section: 2, avant: "« Léa, au marché chaque samedi depuis 2023 »", apres: "", pourquoi: "signature trompeuse" },
    ] } as any);
    expect(r).toMatchObject({ appliquees: 2, ignorees: 0 });
    expect(r.plan.sections[0].textes).toEqual(["Mercredi", "Tout part."]);
    expect(r.plan.sections[1].textes).toEqual(["Mes habitués me disent que le café sent encore."]);
    const files = [{ path: "sections/semaine.liquid", content: "<p>Tout part, sans exception.</p>" }];
    expect(M.corrigerFichiers(files, "« Tout part, sans exception. »", "« Tout part. »")).toBe(1);
    expect(files[0].content).toBe("<p>Tout part.</p>");
  });
});

describe("dessiner puis coder : prix jamais coupés, photos jamais trop recadrées (essai réel Braise, 20 novembre 2026)", async () => {
  const M = await import("@/lib/syna-agent/dessin/methode");
  const fs = await import("node:fs");
  it("espace insécable entre le nombre et « € », « % », « kg », « g » ; rien d'autre n'est touché", () => {
    expect(M.insecables("250 g à 9,50 € · 1 kg à 32 €")).toBe("250 g à 9,50 € · 1 kg à 32 €");
    expect(M.insecables("{% if x %}grand garde 5 gens{% endif %}")).toBe("{% if x %}grand garde 5 gens{% endif %}");
    expect(M.nettoyerPlan({ idee: "x", morceaux: [[1], [2], [3]], sections: [{ nom: "a", pourquoi: "q", disposition: "d", fond: "clair", textes: ["1 kg à 32 €"], photo: null }] } as any).plan.sections[0].textes).toEqual(["1 kg à 32 €"]);
    expect(fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8")).toContain("fs.writeFileSync(path.join(theme, f.path), insecables(f.content))");
  });
  it("le cadre d'une photo garde ses proportions ; le contrôle mesure la part visible et le dit à SINA", () => {
    expect(M.CODE_SYSTEM).toMatch(/jamais plus d'un quart de la photo coupé, jamais le haut d'un produit ni son nom coupés/);
    const job = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
    expect(job).toContain('getComputedStyle(i).objectFit === "cover"');
    expect(job).toContain(".filter((x) => x.garde < 67)");
    expect(fs.readFileSync("src/lib/syna-agent/dessin/tools.ts", "utf8")).toContain("x.photosRecadrees?.length");
  });
});

describe("dessiner puis coder : le niveau de réflexion du code se règle (20 novembre 2026)", async () => {
  const J = await import("@/lib/syna-agent/dessin/job");
  const { setSetting } = await import("@/lib/settings");
  it("« site.code_effort » donne le niveau ; sans réglage (ou une valeur inconnue) : élevé, décision du propriétaire", () => {
    try {
      expect(J.codeModel()).toEqual({ provider: "openai", model: "gpt-6.2-sol", effort: "high" });
      setSetting("site.code_effort", "medium");
      expect(J.codeModel()).toEqual({ provider: "openai", model: "gpt-6.2-sol", effort: "medium" });
      setSetting("site.code_effort", "maximum");
      expect(J.codeModel()).toEqual({ provider: "openai", model: "gpt-6.2-sol", effort: "high" });
    } finally { setSetting("site.code_effort", null); }
  });
  it("jamais de panier pour un métier de services : consigne au code et au dessin, défaut au contrôle (essai réel Bécane)", async () => {
    const M = await import("@/lib/syna-agent/dessin/methode");
    const services = { ...id, boutique: false };
    expect(M.demandeCode(plan(9) as any, services as any, { photos: [], logo: "l.png", logoClair: "lc.png", liens: "" })).toMatch(/AUCUN panier ni lien \/cart ni compte/);
    expect(JSON.stringify(M.consignesDessins(plan(9) as any, services as any))).toMatch(/aucun panier ni icône de compte/);
    expect((await import("node:fs")).readFileSync("src/lib/syna-agent/dessin/tools.ts", "utf8")).toContain("(!boutique && x.panier === true)");
  });
});
