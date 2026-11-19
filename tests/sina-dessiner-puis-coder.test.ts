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
    expect(q2.probableMicro! - q.probableMicro!).toBe(3 * 115_000);
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
    expect(J.codeModel()).toEqual({ provider: "openai", model: "gpt-6.2-sol" });
    expect(J.CODE_OUTPUT_TOKENS).toBeGreaterThanOrEqual(48_000);
    const src = fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8");
    expect((src.match(/sansRelanceCoupee: true/g) ?? []).length).toBe(4);
    const llm = fs.readFileSync("src/lib/ai/llm.ts", "utf8");
    expect(llm).toContain('if (r.stop === "max_tokens" && call.sansRelanceCoupee) throw new PermanentError(REPONSE_COUPEE());');
    expect(llm).toContain("if (cut && call.sansRelanceCoupee) throw new PermanentError(REPONSE_COUPEE());");
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
    expect(fs.readFileSync("src/lib/syna-agent/dessin/job.ts", "utf8")).toContain("for (const [i, x] of [...produits, ...phototheque, ...creees].slice(0, 30).entries()) {");
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
