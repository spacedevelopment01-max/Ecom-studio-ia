/**
 * Décisions du propriétaire du 10 novembre 2026 : thème sur mesure en deux concepts au choix (après la famille et
 * l'ambiance sombre ou claire), puis tout le site sur le concept choisi ; galerie de la fiche produit créée d'après la
 * vraie photo du produit, contrôlée, posée seulement dans le « Produit vedette ». Sans IA, sans réseau.
 */
import { describe, expect, it } from "vitest";
import { sectionByRef } from "@/lib/syna-agent/custom-theme/library";
import type { Design } from "@/lib/syna-agent/custom-theme/design";

const SITE: Record<string, [string, string[]]> = {
  home: ["Accueil", ["Ouverture photo pleine", "Collection en vedette", "Histoire du produit au défilement", "Citation en grand", "Avis clients", "Grille bento", "Nos engagements", "Chiffres clés"]],
  product: ["Fiche produit", ["Produit vedette", "Points forts du produit", "Mode d'emploi en étapes", "Résumé des avis", "Questions sur le produit", "Complète ta commande", "Badges de confiance"]],
  cart: ["Panier", ["Page panier complète"]], compte: ["Mon compte", ["Connexion et création de compte"]], about: ["Notre histoire", ["L'atelier et la personne derrière"]],
  contact: ["Contact", ["Contact"]], aide: ["Aide", ["Suivi de commande et aide"]], legal: ["Informations légales", ["Mentions et conditions"]], "404": ["Page 404", ["Page introuvable (404)"]],
};
const design = (keys: string[], concept: string): Design => ({
  visitor: "Une personne qui veut une vraie pause dans sa journée chargée.", levers: ["la promesse visible", "la preuve par le savoir-faire"], objections: [],
  concept, header: "En-tête classique", footer: "Pied de page complet", search: null, corrections: [],
  pages: keys.map((k) => ({ key: k, label: SITE[k][0], journey: "Le visiteur arrive, comprend, ressent, puis agit sans hésiter.", sections: SITE[k][1].map((t) => ({ section: sectionByRef(t)!.id, why: "Le moment où le visiteur a besoin de cela.", says: "Les vrais faits de la marque, sans rien inventer.", photos: "aucune" })) })),
});

describe("thème sur mesure en deux concepts, puis galerie produit", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  async function project(offer = "Des thés bio en sachet.") {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: offer }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "1 produit" }, { field: "market", value: "France." },
      { field: "price", value: "8 €" }, { field: "difference", value: "Bio." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    return { ctx, user, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  it("famille, ambiance enregistrée, deux concepts différents (accueil et fiche produit), puis tout le site sur le choix du client", async () => {
    const { ctx, pid } = await project();
    await call("theme.family", ctx, { family: "classique" });
    // Sans ambiance, rien n'est conçu ; l'ambiance est la réponse du client, gardée pour toute la conception.
    expect((await call("custom.concepts", ctx, {})).summary).toMatch(/Ambiance pas encore choisie/);
    expect((await call("theme.ambiance", ctx, { ambiance: "sombre" })).ok).toBe(true);
    const { loadFamilyChoice } = await import("@/lib/syna-agent/section-families");
    expect(loadFamilyChoice(pid)?.ambiance).toBe("sombre");
    const prompts: string[] = [];
    T.customDesignDeps.call = async (_system, prompt) => {
      prompts.push(prompt);
      if (prompt.includes("LE CLIENT A CHOISI CE CONCEPT")) {
        // Le concepteur rend tout le site… en touchant à l'accueil : le Studio garde celui que le client a vu.
        const d = design(Object.keys(SITE), "Tout le site dans l'idée choisie.");
        d.pages[0].sections = d.pages[0].sections.slice().reverse();
        return d;
      }
      return design(["home", "product"], prompt.includes("UN PREMIER CONCEPT EXISTE") ? "Concept B : la pause du soir, lente et sombre." : "Concept A : l'éclat du matin, vif et lumineux.");
    };
    try {
      const est = await fr(() => getTool("custom.concepts")!.estimate!(ctx, {}));
      expect(est.label).toMatch(/deux concepts complètement différents/);
      const r = await call("custom.concepts", ctx, {});
      expect(r.ok, r.summary).toBe(true);
      expect(r.data.concepts.A.href).toMatch(/custom-theme\?concept=A&embed=1/);
      expect(r.data.concepts.B.idee).toMatch(/Concept B/);
      expect(r.hint).toMatch(/DEUX concepts[^]*photos sont encore celles de la bibliothèque[^]*custom\.concept/);
      // Le second concept est demandé COMPLÈTEMENT différent, avec le premier sous les yeux ; l'ambiance du client est donnée.
      expect(prompts.some((x) => /UN CONCEPT SEULEMENT[^]*« home » et « product »/.test(x))).toBe(true);
      expect(prompts.some((x) => /COMPLÈTEMENT DIFFÉRENT[^]*Concept A/.test(x))).toBe(true);
      expect(prompts.every((x) => /AMBIANCE VOULUE PAR LE CLIENT : site sombre/.test(x))).toBe(true);
      const c = S.loadConcepts(pid)!;
      expect(c.A.theme.pages.map((x) => x.key)).toEqual(["home", "product"]);
      expect(S.loadCustomTheme(pid)).toBeNull(); // rien n'est monté avant le choix du client
      // Choix du client : tout le site, son accueil et sa fiche produit gardés tels qu'il les a vus.
      const done = await call("custom.concept", ctx, { choice: "B" });
      expect(done.ok, done.summary).toBe(true);
      const t = S.loadCustomTheme(pid)!;
      expect(t.pages.map((x) => x.key).sort()).toEqual(Object.keys(SITE).sort());
      expect(t.pages.slice(0, 2).map((x) => x.key)).toEqual(["home", "product"]);
      expect(t.pages[0].sections.map((s) => s.id)).toEqual(c.B.theme.pages[0].sections.map((s) => s.id));
      expect(t.concept).toMatch(/Concept B/);
      expect(S.loadConcepts(pid)!.chosen).toBe("B");
      expect(prompts.some((x) => /LE CLIENT A CHOISI CE CONCEPT[^]*Concept B/.test(x))).toBe(true);
    } finally { delete T.customDesignDeps.call; }
  });

  it("galerie : questions d'abord, textes obligatoires par genre, personne seulement avec son accord ; contrôlée, posée seulement dans le Produit vedette", async () => {
    const { ctx, pid, user } = await project();
    const sharp = (await import("sharp")).default;
    const { saveAsset, assetUrl } = await import("@/lib/library");
    const { createProduct, listProducts, toStoreProduct } = await import("@/lib/products/catalog");
    const own = (await saveAsset({ projectId: pid, userId: user.id, data: await sharp({ create: { width: 900, height: 900, channels: 3, background: "#cba" } }).png().toBuffer(), name: "sachet.png", mime: "image/png", role: "original", origin: "upload" })).id;
    createProduct(pid, { title: "Jasmin délicat", price: 850, images: [{ assetId: own }] } as any);
    const plan = await call("gallery.plan", ctx, {});
    expect(plan.ok).toBe(true);
    expect(plan.data.conseille).toBe(7);
    expect(plan.data.genres).toHaveLength(8);
    expect(plan.hint).toMatch(/POURQUOI[^]*combien d'images[^]*7[^]*SA photo[^]*personne[^]*points forts[^]*JAMAIS écrit/);
    const G = await import("@/lib/syna-agent/custom-theme/gallery");
    const img = (kind: string, more: object = {}) => ({ kind, scene: "Une table en bois clair près d'une fenêtre, lumière du matin.", ...more });
    // Textes obligatoires par genre ; une personne sans accord du client : rien n'est lancé.
    expect((await call("gallery.create", ctx, { product: "Jasmin délicat", images: [img("fleches")], keepOwn: true, people: false })).summary).toMatch(/il manque un titre/);
    expect((await call("gallery.create", ctx, { product: "Jasmin délicat", images: [img("moment", { title: "Ta pause", bullets: ["Thé vert bio", "Parfumé au jasmin"], person: true })], keepOwn: true, people: false })).summary).toMatch(/personne alors que le client ne l'a pas accepté/);
    // La consigne écrit les vrais textes ; sans accord, aucune personne.
    const prompt = G.galleryPrompt(G.GalleryImageSchema.parse(img("fleches", { title: "Jasmin délicat", labels: ["Sachet refermable", "Thé vert bio"] })), { product: "Jasmin délicat", colors: "#233A2E", people: false });
    expect(prompt).toMatch(/« Jasmin délicat »[^]*« Sachet refermable », « Thé vert bio »[^]*exactement ainsi[^]*aucune personne/);
    const images = [img("seul"), img("fleches", { title: "Jasmin délicat", labels: ["Sachet refermable", "Thé vert bio"] }), img("promesse", { promise: "100 % BIO" })];
    G.galleryDeps.unit = () => 50_000;
    G.galleryDeps.image = async () => sharp({ create: { width: 40, height: 60, channels: 3, background: "#999" } }).png().toBuffer();
    // L'image « promesse » est ratée au contrôle (texte mal écrit) : jamais posée, signalée.
    G.galleryDeps.check = async (_i, _p, texts) => ({ productMatches: true, productWhole: true, texts: texts.map((t) => ({ expected: t, written: t === "100 % BIO" ? "100 % BI0" : t, exact: t !== "100 % BIO" })), extraText: [], people: false, notes: [] });
    try {
      const est = await fr(() => getTool("gallery.create")!.estimate!(ctx, { product: "Jasmin délicat", images, keepOwn: true, people: false }));
      expect(est.maxMicro).toBeGreaterThanOrEqual(3 * 50_000);
      const r = await call("gallery.create", ctx, { product: "Jasmin délicat", images, keepOwn: true, people: false });
      expect(r.ok, r.summary).toBe(true);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs[0]);
      const out: any = await fr(() => G.runGalleryJob({ job: { id: job.id }, payload: JSON.parse(job.payload), checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
      expect(out.posees).toBe(2);
      expect(out.aRevoir[0].defauts.join(" ")).toMatch(/« 100 % BIO » écrit « 100 % BI0 »/);
      const { galleryAssets } = await import("@/lib/products/gallery-store");
      const g = galleryAssets(pid, listProducts(pid)[0].id)!;
      expect(g.assets).toHaveLength(2);
      // Thème sur mesure : sa photo d'abord (il la garde), puis la galerie, dans le Produit vedette seulement.
      const { buyBlockData, withRealBuyBlock } = await import("@/lib/syna-agent/custom-theme/buy-block");
      const d = buyBlockData(pid)!;
      expect(d.gallery).toEqual([assetUrl({ id: own }), ...g.assets.map((id) => assetUrl({ id }))]);
      const vedette = (await import("@/lib/syna-agent/custom-theme/library")).libSection("produit-vedette")!.html;
      const html = withRealBuyBlock(vedette, d);
      const main = /<div[^>]*data-xmain[^>]*>([\s\S]*?)<\/div>/.exec(html)![1];
      expect(main).not.toMatch(/photos\//);
      for (const id of g.assets) expect(main).toContain(`/api/files/${id}`);
      // Thème du Studio : la galerie s'ajoute après sa photo (la première reste celle des cartes de produits).
      const sp = toStoreProduct(listProducts(pid)[0]);
      expect(sp.product.images).toHaveLength(3);
      expect(sp.files[sp.product.images[0]]).toBe(own);
      expect(sp.product.images.slice(1).map((f) => sp.files[f])).toEqual(g.assets);
    } finally { delete G.galleryDeps.unit; delete G.galleryDeps.image; delete G.galleryDeps.check; }
  });
});

describe("contrôle de chaque photo créée au montage du thème sur mesure", async () => {
  it("une photo ratée au contrôle n'est jamais posée : la photo d'exemple reste, le défaut est signalé", async () => {
    const G = await import("@/lib/syna-agent/custom-theme/gallery");
    const src = (await import("node:fs")).readFileSync((await import("node:path")).join(process.cwd(), "src/lib/syna-agent/custom-theme/brand.ts"), "utf8");
    expect(src).toMatch(/checkCreatedImage\([^]*ratée au contrôle[^]*non posée, à refaire avec ton accord[^]*continue;/);
    // Verdict : texte en trop, produit coupé, personne sans accord → défauts en mots simples.
    G.galleryDeps.check = async () => ({ productMatches: true, productWhole: false, texts: [], extraText: ["SOLDES"], people: true, notes: ["bande blanche en bas"] });
    try {
      const problems = await G.checkCreatedImage({ jobId: "j", projectId: "p", userId: "u", usageKey: "k", capMicro: 1 }, Buffer.from("x"), null, [], false);
      expect(problems.join(" ; ")).toMatch(/coupé ou déformé[^]*texte en trop : « SOLDES »[^]*personne[^]*bande blanche/);
    } finally { delete G.galleryDeps.check; }
  });
});

describe("galerie produit : format carré et refus avant la carte", async () => {
  it("images carrées 1:1 (consigne du propriétaire) ; galerie incomplète refusée dès le devis", async () => {
    const G = await import("@/lib/syna-agent/custom-theme/gallery");
    expect(G.GALLERY_ASPECT).toBe("1:1");
    const p = G.galleryPrompt(G.GalleryImageSchema.parse({ kind: "seul", scene: "Une table en bois clair, lumière du matin." }), { product: "Jasmin délicat", colors: "", people: false });
    expect(p).toMatch(/format carré 1:1/);
    expect(p).not.toMatch(/2:3/);
    const { getTool } = await import("@/lib/syna-agent/registry");
    expect(() => getTool("gallery.create")!.estimate!({} as any, { product: "X", images: [{ kind: "fleches", scene: "Une table en bois clair près d'une fenêtre." }], keepOwn: true, people: false } as any)).toThrow(/Galerie incomplète[^]*il manque un titre/);
  });
});

describe("réponses coupées et référencement manquant (essai Éclat de thé du 10 novembre 2026)", () => {
  it("la sortie structurée relance une réponse coupée avec plus de place ; le plan des textes a de la place", async () => {
    const fs = await import("node:fs");
    const llm = fs.readFileSync("src/lib/ai/llm.ts", "utf8");
    expect(llm).toMatch(/if \(opts\.strict\) \{[^]*r\.stop === "max_tokens" && budget < cap[^]*budget \* 2/);
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/brand.ts", "utf8")).toMatch(/syna-custom-plan-1", prompt, maxTokens: 18000, maxOutputTokens: 32000/);
  });
  it("un texte attendu que le contrôle n'a pas lu n'est jamais compté comme juste", async () => {
    const G = await import("@/lib/syna-agent/custom-theme/gallery");
    const ok = { productMatches: true, productWhole: true, extraText: [], people: false, notes: [] };
    expect(G.galleryVerdict({ ...ok, texts: [{ expected: "", written: "", exact: true }] }, { person: false, texts: ["Thé vert bio"] })).toEqual(["texte « Thé vert bio » non retrouvé sur l'image"]);
    expect(G.galleryVerdict({ ...ok, texts: [{ expected: "Thé vert bio", written: "Thé vert bio", exact: true }] }, { person: false, texts: ["Thé vert bio"] })).toEqual([]);
  });
});

describe("SINA voit la galerie qu'elle vient de créer", () => {
  it("planche des images de la galerie jointe à SINA (essai : « elles ne me sont pas jointes »)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/lib/syna-agent/attachments.ts", "utf8");
    expect(src).toMatch(/synaGallery[^]*Galerie produit créée il y a quelques minutes[^]*format carré/);
    expect(fs.readFileSync("src/lib/syna-agent/tools/gallery.ts", "utf8")).toMatch(/images toujours CARRÉES, format 1:1/);
  });
});

describe("effort de SINA à l'étape 6 (décision du propriétaire du 10 novembre 2026)", () => {
  it("élevé pour concevoir et juger un thème, moyen pour une question ou une confirmation", async () => {
    const { modelFor, needsJudgement } = await import("@/lib/syna-agent/loop");
    expect(modelFor(6, { judge: true })).toMatchObject({ model: "claude-sonnet-5-5", effort: "high" });
    expect(modelFor(6, { judge: false })).toMatchObject({ model: "claude-sonnet-5-5", effort: "medium" });
    expect(needsJudgement([{ role: "user", content: { text: "Non, aucune personne." } }])).toBe(false);
    expect(needsJudgement([{ role: "user", content: { text: "x" } }, { role: "tool", content: { tool: "gallery.plan" } }])).toBe(false);
    expect(needsJudgement([{ role: "user", content: { text: "x" } }, { role: "tool", content: { tool: "custom.concepts" } }])).toBe(true);
    expect(needsJudgement([{ role: "user", content: { text: "x" } }, { role: "tool", content: { tool: "jobs.wait" } }])).toBe(true);
    expect(needsJudgement([{ role: "user", content: { text: "[Élément désigné · section s1234abcd] Mets ce titre en plus grand." } }])).toBe(true);
  });
});
