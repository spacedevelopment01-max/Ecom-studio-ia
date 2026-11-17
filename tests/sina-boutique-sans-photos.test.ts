/**
 * Boutique sans photos du client (décision du propriétaire, 17 novembre 2026). À la question « pour une boutique, SINA ne
 * crée pas le site tant qu'elle n'a pas une vraie photo de chaque produit ? », il a répondu : « Ou alors elle lui dit
 * qu'elle peux monter le site mais qu'elle devra importer ses photos par la suite. »
 *
 * Un test par règle, sans IA, sans réseau (chaque appel est simulé) :
 *  1. SINA n'invente jamais le produit : la règle est dite à ceux qui décrivent les photos, et tenue sans IA.
 *  2. Les emplacements de produit sans photo montrent « Ta photo ici » ; en boutique, une carte sans image ; le site
 *     n'est pas « prêt à partir » tant qu'un produit n'a aucune photo, et c'est dit.
 *  3. SINA le dit AVANT la carte de dépense : garde-fou de site.create, trace durable, rappel sur la carte.
 *  4. Importer ensuite marche tout seul : la photo posée sur le produit paraît dans l'aperçu sans refaire le site.
 *  5. Le contrôle des photos créées ne juge plus ce qu'il ne peut pas juger.
 *  6. Le concepteur connaît son budget de photos ; le Studio recompte après lui.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("boutique sans photos du client", async () => {
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { createProduct, listProducts } = await import("@/lib/products/catalog");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const G = await import("@/lib/syna-agent/custom-theme/gallery");
  const Lib = await import("@/lib/syna-agent/custom-theme/library");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const X = await import("@/lib/syna-agent/custom-theme/site-job");
  const P = await import("@/lib/syna-agent/custom-theme/photos-produits");
  const PB = await import("@/lib/syna-agent/custom-theme/photo-budget");
  const J = await import("@/lib/syna-agent/journey");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const R = await import("@/lib/syna-agent/custom-theme/render");
  const { customThemeExport } = await import("@/lib/syna-agent/custom-theme/install");
  const { toolInFocus } = await import("@/lib/syna-agent/conversation");
  const sharp = (await import("sharp")).default;
  const fr = <R1,>(fn: () => Promise<R1> | R1) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  const png = (c = "#888") => sharp({ create: { width: 600, height: 600, channels: 3, background: c } }).png().toBuffer();
  const OK = { productMatches: true, productWhole: true, texts: [], extraText: [], people: false, notes: [] };

  // Un métier inventé pour le test, qui n'est celui d'aucun projet d'essai : des lampes en grès.
  const LAMPE = "Lampe Galet", VASE = "Vase Dune";
  const SCENE_MATIERE = "Photographie de détail en plan serré, format vertical. Un bloc de grès brut posé sur un tour de potier, à côté d'une éponge humide. La scène contient exactement 2 objets. Lumière douce du matin. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane.";
  const SCENE_PRODUIT = `Photographie d'ambiance, format vertical. La lampe ${LAMPE} allumée sur une table de chevet en chêne. La scène contient exactement 2 objets. Lumière chaude du soir.`;

  /** Une boutique : deux produits au catalogue (sans photo), un petit site (accueil : ouverture, cartes ; fiche : bloc d'achat, grande photo). */
  async function boutique(o: { photoDe?: string } = {}) {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des lampes et des vases en grès tournés à la main." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "2 produits" }, { field: "market", value: "France." },
      { field: "price", value: "120 €" }, { field: "difference", value: "Tourné à la main." }, { field: "taste", status: "none" }, { field: "photos", value: "Pas encore." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    ctx.projectId = pid;
    // Le catalogue du test : ces deux produits seulement.
    const { archiveProduct } = await import("@/lib/products/catalog");
    for (const x of listProducts(pid)) archiveProduct(pid, x.id);
    const vraie = o.photoDe ? (await saveAsset({ projectId: pid, userId: user.id, data: await png("#a52"), name: "ma-lampe.png", mime: "image/png", role: "original", origin: "upload" })).id : null;
    createProduct(pid, { title: LAMPE, productType: "Lampe en grès", price: 12000, images: o.photoDe === LAMPE && vraie ? [{ assetId: vraie }] : [] } as any);
    createProduct(pid, { title: VASE, productType: "Vase en grès", price: 6000 } as any);
    S.saveCustomTheme(pid, { version: 1, family: "classique", style: "x", header: null, footer: null, search: null, pages: [
      { key: "home", label: "Accueil", sections: [{ uid: "s0000000a", id: "tn-ouverture" }, { uid: "s0000000b", id: "tn-produits" }] },
      { key: "product", label: "Fiche produit", sections: [{ uid: "s0000000c", id: "tn-achat" }, { uid: "s0000000d", id: "tn-emotion" }] },
    ] } as any);
    return { user, pid, cid, ctx, vraie };
  }
  const job = (id: string, payload: object) => fr(() => B.runCustomBrandJob({ job: { id }, payload, checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any)) as Promise<any>;
  /** Le rédacteur simulé : un titre réécrit, et chaque photo d'exemple décrite (la grande photo de la fiche montre le produit, ou non). */
  const writer = (o: { fiche: string; product?: string | null }) => async (prompt: string) => {
    const html = prompt.slice(prompt.indexOf("HTML actuel"));
    const m = /<h[12]>([^]*?)<\/h[12]>/.exec(html);
    const carte = /tn-carte-p|tn-grande/.test(html), fiche = /tn-emotion/.test(html);
    return { edits: m ? [{ find: m[1], replace: "Tourné à la main." }] : [], links: [],
      photos: [...new Set([...html.matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((x) => x[0]))].map((find) => ({ find, description: carte ? `Photo produit, format carré : ${LAMPE} seule sur fond clair.` : fiche ? o.fiche : SCENE_MATIERE, ratio: "4:5" as const, product: carte ? LAMPE : fiche ? o.product ?? null : null })) };
  };
  const clean = () => { for (const k of ["plan", "write", "photo", "photoReview", "photoBrief", "look", "photoUnit"] as const) delete B.customBrandDeps[k]; delete G.galleryDeps.check; };

  // ------------------------------------------------------------------ 1) le produit ne s'invente jamais

  it("la règle est dite à ceux qui décrivent les photos, en règle générale, sans exemple d'un projet d'essai", () => {
    for (const system of [B.SECTION_WRITE_SYSTEM, B.PHOTO_BRIEF_SYSTEM]) expect(system).toContain(B.NO_INVENTED_PRODUCT_RULE);
    expect(B.NO_INVENTED_PRODUCT_RULE).toMatch(/ne se montre dans AUCUNE photo à créer[^]*il ne s'invente jamais[^]*« Ta photo ici »[^]*la matière, l'outil, l'atelier, le lieu, le geste sans personne, le moment d'usage sans le produit[^]*product = null/);
    expect(B.PHOTO_REVIEW_SYSTEM).toMatch(/SANS PHOTO DU CLIENT ne se montre dans aucune photo/);
    // La ligne du dossier : seulement quand un produit n'a pas de photo.
    expect(B.productPhotosBriefLine([{ title: LAMPE, photo: true }])).toBe("");
    expect(B.productPhotosBriefLine([{ title: LAMPE, photo: false }, { title: VASE, photo: true }])).toMatch(/PRODUITS SANS PHOTO DU CLIENT[^]*« Lampe Galet »[^]*Produits qui ont leur vraie photo : « Vase Dune »/);
    // Aucun exemple tiré d'un projet d'essai dans ces consignes (les emballages cités avant le 17 novembre en venaient).
    for (const text of [B.NO_INVENTED_PRODUCT_RULE, B.productPhotosBriefLine([{ title: "X", photo: false }]), B.unseenProductFix("X"), P.QUESTION_DES_PHOTOS, P.refusSansPhotosProduits({ sans: ["X"], repondu: false })!, B.PHOTO_BRIEF_SYSTEM])
      expect(text).not.toMatch(/sachet|thé(?!\p{L})|infusion|toilett|bougie|sac(?!\p{L})|cuir|maroquin/iu);
    expect(B.SECTION_WRITE_SYSTEM).not.toMatch(/« le sachet »|pot, flacon/);
  });

  it("contrôle sans IA : une description qui montre un produit sans photo est reconnue ; la matière, l'outil, le lieu ne le sont pas", () => {
    const cat = [{ title: LAMPE, type: "Lampe en grès", photo: false }, { title: VASE, type: "Vase en grès", photo: false }];
    expect(B.briefShowsUnseenProduct({ description: SCENE_MATIERE, product: LAMPE }, cat)).toBe(LAMPE); // le champ « product » le nomme
    expect(B.briefShowsUnseenProduct({ description: SCENE_PRODUIT, product: null }, cat)).toBe(LAMPE); // son nom
    expect(B.briefShowsUnseenProduct({ description: "Une lampe posée sur une étagère en bois.", product: null }, cat)).toBe(LAMPE); // le nom commun de l'objet
    expect(B.briefShowsUnseenProduct({ description: "Deux vases alignés sur un rebord de fenêtre.", product: null }, cat)).toBe(VASE);
    expect(B.briefShowsUnseenProduct({ description: "Photo produit au format carré, vue de face.", product: null }, cat)).toBe(LAMPE); // « photo produit »
    expect(B.briefShowsUnseenProduct({ description: "Le produit au centre d'une table en chêne.", product: null }, cat)).toBe(LAMPE);
    // Ce qui se montre sans inventer le produit : la matière (même si elle est dans son genre), l'outil, l'atelier, le lieu.
    for (const d of [SCENE_MATIERE, "Gros plan sur un grès brut, mat, piqué de grains sombres.", "Un tour de potier arrêté, un fil à couper l'argile posé dessus.", "Une table de chevet en chêne près d'une fenêtre, sans la lampe, un livre ouvert.", "Un atelier au petit matin. Aucun produit, aucun texte."])
      expect(B.briefShowsUnseenProduct({ description: d, product: null }, cat), d).toBeNull();
    // Un produit qui A sa photo se montre : rien à refuser.
    const avec = [{ title: LAMPE, type: "Lampe en grès", photo: true }, { title: VASE, type: "Vase en grès", photo: false }];
    expect(B.briefShowsUnseenProduct({ description: SCENE_PRODUIT, product: LAMPE }, avec)).toBeNull();
    expect(B.briefShowsUnseenProduct({ description: "Un vase sur une console.", product: null }, avec)).toBe(VASE);
    expect(B.briefShowsUnseenProduct({ description: SCENE_PRODUIT, product: LAMPE }, [])).toBeNull(); // site de services, ou sans catalogue
    expect(B.unseenProductFix(LAMPE)).toMatch(/n'a pas encore de photo du client[^]*NULLE PART[^]*la matière, l'outil, l'atelier/);
  });

  it("montage : rien n'est créé pour un emplacement de produit ; une scène qui montre le produit est refaite, sinon jamais créée", async () => {
    const { pid } = await boutique();
    const made: { prompt: string; ref: boolean }[] = [], fixes: string[] = [], dossiers: string[] = [];
    try {
      B.customBrandDeps.plan = async () => ({ promesse: "Le grès, tourné à la main.", voix: "Simple.", menu: [], sections: [] });
      B.customBrandDeps.write = async (prompt) => { dossiers.push(prompt); return writer({ fiche: SCENE_PRODUIT, product: LAMPE })(prompt); };
      B.customBrandDeps.photoReview = async () => ({ photos: [], site: "Une séance qui se tient." });
      // Celui qui redécrit reçoit la correction du Studio, et rend une scène sans le produit.
      B.customBrandDeps.photoBrief = async (prompt) => { fixes.push(prompt); const find = /- (photos\/[\w.-]+) \(format/.exec(prompt)![1]; return { photos: [{ find, description: SCENE_MATIERE.replace("tour de potier", "établi de l'atelier"), ratio: "4:5" as const, product: null }] }; };
      B.customBrandDeps.photo = async (prompt, ref) => { made.push({ prompt, ref: !!ref }); return png(); };
      const out = await job(`sans-${Date.now()}`, { projectId: pid, capMicro: 50_000_000, photos: true, newPhotos: true, images: "sina" });
      // Le dossier dit à chaque rédacteur quels produits n'ont pas de photo.
      expect(dossiers[0]).toMatch(/PRODUITS SANS PHOTO DU CLIENT[^]*« Lampe Galet », « Vase Dune »/);
      // La scène de la fiche montrait la lampe : refusée par le Studio (sans IA), redécrite UNE fois avec sa correction.
      expect(fixes).toHaveLength(1);
      expect(fixes[0]).toMatch(/CORRECTIONS EXIGÉES[^]*« Lampe Galet » n'a pas encore de photo du client/);
      expect(out.relecturePhotos).toMatchObject({ reprises: 1, refusees: 1 });
      // Créées : l'ouverture et la scène redécrite. Jamais la galerie du bloc d'achat ni les cartes (2 + 2 emplacements).
      expect(made).toHaveLength(2);
      for (const m of made) { expect(m.ref).toBe(false); expect(m.prompt).not.toMatch(/Lampe Galet|Photo produit/); }
      expect(out.photosMade).toBe(2);
      expect(out.photosProduitsAttendues).toBeGreaterThanOrEqual(2);
      expect(out.photosSansProduit).toBe(0);
      const t = S.loadCustomTheme(pid)!;
      const achat = S.sectionHtml(t.pages[1].sections[0]);
      expect(achat).toMatch(/class="tn-grande tn-ph" style="background-image:url\(photos\//); // l'emplacement attend la photo du client
      expect(achat).not.toContain("/api/files/");
    } finally { clean(); }
  });

  it("montage : une description qui montre encore le produit après la reprise n'est jamais créée, et c'est dit", async () => {
    const { pid } = await boutique();
    let made = 0;
    try {
      B.customBrandDeps.plan = async () => ({ promesse: "Le grès.", voix: "Simple.", menu: [], sections: [] });
      B.customBrandDeps.write = writer({ fiche: SCENE_PRODUIT, product: null });
      // Aucune relecture ni reprise disponible (essai sans IA) : le contrôle sans IA tient seul, juste avant la création.
      B.customBrandDeps.photo = async () => { made++; return png(); };
      const out = await job(`sans2-${Date.now()}`, { projectId: pid, capMicro: 50_000_000, photos: true, newPhotos: true, images: "sina" });
      expect(made).toBe(1); // l'ouverture seulement
      expect(out.photosSansProduit).toBe(1);
      expect(out.problems.join(" ; ")).toMatch(/non créée : sa description montrait « Lampe Galet », qui n'a pas encore de photo de toi \(je n'invente pas un produit\)/);
    } finally { clean(); }
  });

  it("le produit A sa photo : elle reste sur ses emplacements, et la scène est créée avec elle en modèle (même sans mot d'emballage)", async () => {
    const { pid, vraie } = await boutique({ photoDe: LAMPE });
    const made: { ref: boolean }[] = [];
    try {
      B.customBrandDeps.plan = async () => ({ promesse: "Le grès.", voix: "Simple.", menu: [], sections: [] });
      B.customBrandDeps.write = writer({ fiche: SCENE_PRODUIT, product: LAMPE });
      B.customBrandDeps.photo = async (_p, ref) => { made.push({ ref: !!ref }); return png(); };
      const out = await job(`avec-${Date.now()}`, { projectId: pid, capMicro: 50_000_000, photos: true, newPhotos: true, images: "sina" });
      expect(out.photosSansProduit).toBe(0);
      expect(out.photosReal).toBeGreaterThan(0); // sa vraie photo posée telle quelle sur un emplacement de produit
      // La scène de la fiche : créée avec la vraie photo jointe (avant, seule une description citant un emballage la joignait).
      expect(made.filter((m) => m.ref)).toHaveLength(1);
      const page = R.renderCustomTheme(loadProject(pid), S.loadCustomTheme(pid)!, { nonce: "n" });
      expect(page).toContain(`class="tn-grande tn-ph" style="background-image:url(/api/files/${vraie})"`);
    } finally { clean(); }
  });

  // ------------------------------------------------------------------ 2) « Ta photo ici », la boutique, « prêt à partir »

  it("aperçu : le bloc d'achat et les cartes d'un produit sans photo montrent « Ta photo ici », jamais un carré vide ni une photo d'exemple", async () => {
    const { pid } = await boutique();
    try {
      B.customBrandDeps.plan = async () => ({ promesse: "Le grès.", voix: "Simple.", menu: [], sections: [] });
      B.customBrandDeps.write = writer({ fiche: SCENE_MATIERE });
      B.customBrandDeps.photo = async () => png();
      await job(`ici-${Date.now()}`, { projectId: pid, capMicro: 50_000_000, photos: true, newPhotos: true, images: "sina" });
      const page = R.renderCustomTheme(loadProject(pid), S.loadCustomTheme(pid)!, { nonce: "n" });
      const body = page.slice(page.indexOf('<div class="frame">'));
      // La galerie du bloc d'achat : l'emplacement, avec le nom écrit dans la fiche ; plus de vignettes d'exemple.
      expect(body).toMatch(/<div class="tn-grande tn-ph tn-ta-photo" role="img" aria-label="Ta photo ici : [^"]+"><span>Ta photo ici<\/span> <small>[^<]+<\/small><\/div>/);
      // Un clic sur l'emplacement le désigne comme une photo (pour demander à SINA d'y poser la sienne).
      expect(R.renderCustomTheme(loadProject(pid), S.loadCustomTheme(pid)!, { nonce: "n", studio: true })).toContain('e.target.closest(".tn-ta-photo")');
      expect(body).not.toMatch(/<div class="tn-vignettes">/);
      // Les cartes : une par produit, chacune avec son emplacement (le nom est déjà sous la carte).
      const cartes = body.match(/<a class="tn-carte-p[^"]*"[^>]*><div class="tn-ph tn-ta-photo" role="img" aria-label="Ta photo ici"><span>Ta photo ici<\/span><\/div><b>[^<]+<\/b>/g) ?? [];
      expect(cartes).toHaveLength(2);
      expect(cartes.join("")).toContain(`<b>${LAMPE}</b>`);
      // Ni cadre vide, ni photo d'exemple de la bibliothèque, ni produit inventé.
      expect(body).not.toContain('<div class="tn-ph"></div>');
      expect(body).not.toMatch(/background-image:url\((?:\/sections\/)?photos\//);
      expect(Lib.taPhotoIci("tn-ph", "Lampe <Galet>")).toContain("<small>Lampe &lt;Galet&gt;</small>");
      // La feuille : à la tenue de la marque (ses couleurs, sa police de titre), en pointillés.
      const css = fs.readFileSync(path.join(process.cwd(), "public", "sections", "tenue.css"), "utf8");
      expect(css).toMatch(/\.tn-ta-photo:not\(#tn\)\{[^}]*var\(--tn-doux\)[^}]*dashed[^}]*var\(--tn-encre\)/);
      expect(css).toMatch(/\.tn-ta-photo:not\(#tn\) span\{[^}]*var\(--f-title\)/);
    } finally { clean(); }
  });

  it("un site déjà créé garde la photo de sa fiche sur ses cartes ; un site neuf n'en a plus", () => {
    const ancien = { pages: [{ key: "product", label: "Fiche", product: "lampe-galet", sections: [{ uid: "s1", id: "tn-achat", html: '<section class="tn tn-achat" data-tn-achat><div class="tn-galerie"><div class="tn-grande tn-ph" style="background-image:url(/api/files/abc123)"></div></div></section>' }] }] } as any;
    expect(R.fichePhotos(ancien).get("lampe-galet")).toBe("/api/files/abc123");
    const neuf = { pages: [{ key: "product", label: "Fiche", product: "lampe-galet", sections: [{ uid: "s1", id: "tn-achat", html: '<section class="tn tn-achat" data-tn-achat><div class="tn-galerie"><div class="tn-grande tn-ph" style="background-image:url(photos/sachet.jpg)"></div></div></section>' }] }] } as any;
    expect(R.fichePhotos(neuf).size).toBe(0);
  });

  it("boutique : une carte sans image pour un produit sans photo ; le site n'est pas prêt à partir, et la liste le dit", async () => {
    const { pid } = await boutique();
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/custom-theme/to-shopify.ts"), "utf8");
    // Les gabarits des cartes : la classe « sans photo » et aucun cadre quand le produit n'a pas d'image.
    for (const v of ["product", "autre"]) expect(src).toContain(`{% unless ${v}.featured_image %} tn-sans-photo{% endunless %}" href="{{ ${v}.url }}">{% if ${v}.featured_image %}<div class="tn-ph" style="background-image:url({{ ${v}.featured_image | image_url: width: `);
    expect(src).not.toMatch(/<a class="tn-carte-p[^`]*?<div class="tn-ph"\{% if (?:product|autre)\.featured_image %\}/);
    // La galerie du bloc d'achat ne rend aucun cadre sans image.
    expect(src).toContain('<div class="tn-galerie">{%- if product.featured_image -%}<div class="tn-grande tn-ph"');
    const out = await fr(() => customThemeExport(pid));
    const bloquants = out.problems.filter((x) => x.level === "bloquant").map((x) => x.text);
    expect(bloquants.some((x) => x.startsWith(`photos de tes produits à importer : ${LAMPE}, ${VASE}`))).toBe(true);
    expect(P.lignePhotosAImporter([LAMPE, VASE])).toBe(`photos de tes produits à importer : ${LAMPE}, ${VASE}`);
    expect(P.lignePhotosAImporter([])).toBe("");
    expect(X.produitsSansPhoto(pid, "products")).toEqual([LAMPE, VASE]);
    expect(X.produitsSansPhoto(pid, "services")).toEqual([]);
  });

  // ------------------------------------------------------------------ 3) SINA le dit avant

  it("site.create refuse de se lancer tant que le client n'a pas été prévenu ; sa réponse notée suffit ; la carte le rappelle", async () => {
    const { ctx, cid } = await boutique();
    J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4, 5]) J.setStep(x, n, "done"); });
    await call("memory.note", ctx, { kind: "fact", key: "preuves", value: "aucune pour l'instant" });
    T.customPhotoDeps.unit = () => 150_000;
    try {
      const tool = getTool("site.create")!;
      // Avant la carte de dépense (le refus part du devis), pour SINA seule.
      let thrown: unknown = null;
      try { await fr(() => tool.estimate!(ctx, {})); } catch (e) { thrown = e; }
      expect(thrown).toBeInstanceOf(X.RefusInterne);
      expect((thrown as Error).message).toMatch(/rien n'est payé : 2 produit\(s\) du catalogue n'ont aucune photo du client \(« Lampe Galet », « Vase Dune »\)[^]*je peux monter ton site maintenant ; tes photos, tu les importeras ensuite et elles prendront leur place toutes seules ; en attendant je ne montre pas tes produits en image, parce que je ne les invente pas[^]*catalogue\.photos[^]*memory\.note[^]*« photos des produits »/);
      const refuse = await call("site.create", ctx, {});
      expect(refuse).toMatchObject({ ok: false, internal: true });
      expect(one<any>("SELECT COUNT(*) n FROM jobs WHERE project_id=? AND type='syna.site'", ctx.projectId).n).toBe(0);
      // Une note sur autre chose ne vaut pas réponse.
      await call("memory.note", ctx, { kind: "fact", key: "délais", value: "quatre semaines" });
      expect(X.refusPhotosProduits(ctx)).not.toBeNull();
      // Sa réponse, notée avec ses mots : le site se lance, sans ses photos.
      await call("memory.note", ctx, { kind: "decision", key: P.NOTE_PHOTOS_PRODUITS, value: "je te les envoie la semaine prochaine, monte le site" });
      expect(X.refusPhotosProduits(ctx)).toBeNull();
      const est = await fr(() => tool.estimate!(ctx, {}));
      expect(est.maxMicro).toBeGreaterThan(0);
      // Le résumé de la carte de dépense le rappelle en une ligne.
      expect(await fr(() => tool.preview!(ctx, {}))).toBe("Ton site entier, créé pour ta marque. Sans les photos de tes 2 produits pour l'instant : « Ta photo ici » tient leur place, tu les importeras ensuite.");
      const r = await call("site.create", ctx, {});
      expect(r.ok, r.summary).toBe(true);
    } finally { delete T.customPhotoDeps.unit; }
    // La consigne de l'étape le dit à SINA, et l'outil pour poser les photos est sous sa main à cette étape.
    expect(J.STEP_GUIDES[6]).toContain(P.QUESTION_DES_PHOTOS);
    expect(P.QUESTION_DES_PHOTOS).toMatch(/tu ne bloques jamais le client[^]*AVANT de lancer[^]*catalogue\.photos avant de lancer[^]*APRÈS la création[^]*sans refaire le site[^]*avec le prix de la carte d'accord, de créer les scènes avec son vrai produit/);
    expect(J.STEP_GUIDES[6]).toMatch(/photosProduitsAImporter/);
    expect(toolInFocus("catalogue.photos", 6)).toBe(true);
    expect(P.photosProduitsRepondu([{ title: "Photos de mes produits", value: "plus tard" }])).toBe(true);
    expect(P.photosProduitsRepondu([{ title: "photos", value: "j'en ai de mon atelier" }, { title: "produits", value: "deux" }])).toBe(false);
  });

  it("s'il envoie ses photos à ce moment-là, elles sont posées sur les produits et plus rien n'est demandé", async () => {
    const { ctx, cid, pid, user } = await boutique();
    J.updateJourney(cid, (x) => { for (const n of [1, 2, 3, 4, 5]) J.setStep(x, n, "done"); });
    const envoi = async (name: string) => (await saveAsset({ projectId: pid, userId: user.id, data: await png("#b63"), name, mime: "image/png", role: "original", origin: "upload" })).id;
    const a = await envoi("lampe.png"), b = await envoi("vase.png");
    // Par l'identifiant de la pièce jointe du fil (ctx.attachment) ou par celui de l'image.
    ctx.attachment = (id: string) => (id === "att1" ? { id, kind: "image", name: "lampe.png", path: "", assetId: a, analysis: null } : null);
    expect((await call("catalogue.photos", ctx, { product: LAMPE, photos: ["att1"] })).ok).toBe(true);
    expect(X.refusPhotosProduits(ctx)).toMatch(/1 produit\(s\)[^]*« Vase Dune »/);
    const r = await call("catalogue.photos", ctx, { product: "vase dune", photos: [b] });
    expect(r.ok).toBe(true);
    expect(r.data.produitsEncoreSansPhoto).toEqual([]);
    expect(r.hint).toMatch(/Tous ses produits ont maintenant leur photo : propose-lui, avec le prix de la carte d'accord, de créer les scènes avec son vrai produit/);
    expect(X.refusPhotosProduits(ctx)).toBeNull();
    expect(await fr(() => getTool("site.create")!.preview!(ctx, {}))).toBe("Ton site entier, créé pour ta marque.");
  });

  // ------------------------------------------------------------------ 4) importer ensuite

  it("après la création : la photo posée sur un produit paraît dans sa galerie et ses cartes, sans refaire le site ; jamais une image créée", async () => {
    const { ctx, pid, user } = await boutique();
    try {
      B.customBrandDeps.plan = async () => ({ promesse: "Le grès.", voix: "Simple.", menu: [], sections: [] });
      B.customBrandDeps.write = writer({ fiche: SCENE_MATIERE });
      B.customBrandDeps.photo = async () => png();
      await job(`apres-${Date.now()}`, { projectId: pid, capMicro: 50_000_000, photos: true, newPhotos: true, images: "sina" });
    } finally { clean(); }
    const rev = S.loadCustomTheme(pid)!.rev, repere = R.productPhotosStamp(pid);
    const frame = (html: string) => html.slice(html.indexOf('<div class="frame">'));
    expect(frame(R.renderCustomTheme(loadProject(pid), S.loadCustomTheme(pid)!, { nonce: "n" }))).toContain("tn-grande tn-ph tn-ta-photo");
    // Une image créée par l'IA ne se pose jamais comme photo d'un produit.
    const creee = (await saveAsset({ projectId: pid, userId: user.id, data: await png(), name: "site-accueil.png", mime: "image/png", role: "site", origin: "generated" })).id;
    const non = await call("catalogue.photos", ctx, { product: LAMPE, photos: [creee] });
    expect(non.ok).toBe(false);
    expect(non.summary).toMatch(/ce n'est pas une photo envoyée par le client/);
    // Sa vraie photo : posée, relue.
    const vraie = (await saveAsset({ projectId: pid, userId: user.id, data: await png("#c74"), name: "ma-lampe.jpg", mime: "image/png", role: "original", origin: "upload" })).id;
    const oui = await call("catalogue.photos", ctx, { product: LAMPE, photos: [vraie] });
    expect(oui.ok, oui.summary).toBe(true);
    expect(oui.data.produitsEncoreSansPhoto).toEqual([VASE]);
    expect(oui.hint).toMatch(/sans rien refaire[^]*Il reste sans photo : Vase Dune/);
    expect(listProducts(pid).find((x) => x.data.title === LAMPE)!.data.images.map((i) => i.assetId)).toEqual([vraie]);
    // Le site n'a pas été refait (même version) : le rendu lit le catalogue.
    expect(S.loadCustomTheme(pid)!.rev).toBe(rev);
    const body = frame(R.renderCustomTheme(loadProject(pid), S.loadCustomTheme(pid)!, { nonce: "n" }));
    expect(body).toContain(`class="tn-grande tn-ph" style="background-image:url(/api/files/${vraie})"`); // la galerie de sa fiche
    expect(body).toMatch(new RegExp(`<a class="tn-carte-p"[^>]*><div class="tn-ph" style="background-image:url\\(/api/files/${vraie}\\)"></div><b>${LAMPE}</b>`)); // sa carte
    expect(body).toMatch(new RegExp(`<div class="tn-ph tn-ta-photo"[^>]*><span>Ta photo ici</span></div><b>${VASE}</b>`)); // l'autre attend toujours
    expect(body).not.toContain("tn-grande tn-ph tn-ta-photo");
    // Le repère des photos change : l'aperçu de l'onglet Boutique se recharge tout seul.
    expect(R.productPhotosStamp(pid)).not.toBe(repere);
    const ui = fs.readFileSync(path.join(process.cwd(), "src/components/studio/custom-theme-boutique.tsx"), "utf8");
    expect(ui).toContain("key={`${info.rev}:${info.photos ?? \"\"}`}");
  });

  // ------------------------------------------------------------------ 5) le contrôle des photos créées

  it("contrôle d'une photo : pas de fidélité sans vraie photo, pas de « produit coupé » sur un gros plan voulu, pas de remarque de goût", async () => {
    // Sans vraie photo jointe : rien à comparer, quoi que réponde le modèle.
    const sans = G.createdImageQuestions({ product: false, texts: [], description: SCENE_MATIERE, closeUp: true });
    expect(sans.join("\n")).toMatch(/Aucune vraie photo de produit n'est jointe[^]*productMatches : true \(rien à comparer\)[^]*productWhole : true \(rien à comparer\)/);
    expect(sans.join("\n")).not.toMatch(/même que sur la vraie photo|entier \(rien de coupé/);
    expect(sans.join("\n")).toMatch(/CE QUE LA PHOTO DEVAIT MONTRER[^]*bloc de grès brut/);
    expect(G.galleryVerdict({ ...OK, productMatches: false, productWhole: false } as any, { person: false, texts: [], reference: false })).toEqual([]);
    G.galleryDeps.check = async () => ({ ...OK, productMatches: false, productWhole: false });
    try { expect(await G.checkCreatedImage({ jobId: "j", projectId: "p", userId: "u", usageKey: "k", capMicro: 1 }, Buffer.from("x"), null, [], false)).toEqual([]); } finally { delete G.galleryDeps.check; }
    // Avec la vraie photo : la fidélité est jugée ; « entier » seulement si la description ne demande pas un gros plan.
    const entier = G.createdImageQuestions({ product: true, productName: LAMPE, texts: [], description: SCENE_PRODUIT, closeUp: false }).join("\n");
    expect(entier).toMatch(/productMatches : true si le produit de l'image créée est bien le même[^]*productWhole : true si le produit est entier \(rien de coupé par le cadre\)/);
    const detail = G.createdImageQuestions({ product: true, productName: LAMPE, texts: [], description: "Gros plan sur le pied de la lampe.", closeUp: true }).join("\n");
    expect(detail).toMatch(/productWhole : la description demande un gros plan ou un détail : un produit coupé par le cadre est VOULU, ce n'est pas un défaut/);
    expect(G.galleryVerdict({ ...OK, productWhole: false } as any, { person: false, texts: [] })).toEqual(["le produit est coupé ou déformé"]);
    expect(G.galleryVerdict({ ...OK, productWhole: false } as any, { person: false, texts: [], closeUp: true })).toEqual(["le produit est déformé"]);
    expect(G.galleryVerdict({ ...OK, productMatches: false } as any, { person: false, texts: [] })).toEqual(["le produit n'est pas fidèle à sa vraie photo"]);
    // Le cadrage voulu se lit dans la description.
    for (const d of [SCENE_MATIERE, "Gros plan sur la couture.", "Photo de détail du bord.", "Macro d'une fibre.", "Un détail de la poignée, de très près."]) expect(B.wantsCloseUp(d), d).toBe(true);
    for (const d of [SCENE_PRODUIT, "Photographie d'ambiance, plan large d'un atelier."]) expect(B.wantsCloseUp(d), d).toBe(false);
    // Un produit sans photo qui apparaît quand même : refusé. La question n'est posée que s'il y en a.
    expect(sans.join("\n")).not.toMatch(/inventedProduct/);
    expect(G.createdImageQuestions({ product: false, texts: [], unseen: ["Lampe Galet (Lampe en grès)"] }).join("\n")).toMatch(/inventedProduct : true si l'image montre l'un de ces produits[^]*« Lampe Galet \(Lampe en grès\) »[^]*sa matière seule, un outil, le lieu ne comptent pas/);
    expect(G.galleryVerdict({ ...OK, inventedProduct: true } as any, { person: false, texts: [], reference: false })).toEqual(["l'image montre un produit que le client n'a pas encore photographié (un produit ne s'invente pas)"]);
    // Les notes : un défaut de fabrication, jamais un trait voulu ou propre à la matière.
    expect(sans.join("\n")).toMatch(/notes : seulement un défaut de FABRICATION[^]*jamais une remarque de goût, ni un trait voulu par la description ou propre à la matière \(un gros plan, un cadrage serré, un bord brut, une matière percée, piquée, cousue, tissée ou usée\)/);
    // Aucun exemple tiré d'un projet d'essai dans les questions.
    expect([...sans, entier, detail].join("\n")).not.toMatch(/thé|infusion|sachet/i);
    expect(fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/custom-theme/gallery.ts"), "utf8")).not.toContain("Thé vert bio");
  });

  it("montage : le contrôle reçoit ce que la photo devait montrer, sans vraie photo quand le produit n'en a pas", async () => {
    const { pid } = await boutique();
    const seen: { ref: number }[] = [];
    try {
      B.customBrandDeps.plan = async () => ({ promesse: "Le grès.", voix: "Simple.", menu: [], sections: [] });
      B.customBrandDeps.write = writer({ fiche: SCENE_MATIERE });
      B.customBrandDeps.photo = async () => png();
      // Le modèle répond « pas fidèle, coupé » (comme à l'essai réel) alors qu'aucune vraie photo n'était jointe.
      G.galleryDeps.check = async (_img, ref) => { seen.push({ ref: ref.length }); return { ...OK, productMatches: false, productWhole: false }; };
      const out = await job(`ctrl-${Date.now()}`, { projectId: pid, capMicro: 50_000_000, photos: true, newPhotos: true, images: "sina" });
      expect(seen.length).toBe(2);
      for (const s of seen) expect(s.ref).toBe(0);
      expect(out.photosFailed).toBe(0); // plus aucune photo refusée pour une fidélité impossible à juger
      expect(out.photosMade).toBe(2);
    } finally { clean(); }
  });

  // ------------------------------------------------------------------ 6) le budget de photos du concepteur

  it("budget de photos : le concepteur le reçoit, la fiche compte une fois par fiche, un dépassement lui est rendu", () => {
    const site = { business: "products" as const, products: 3 };
    // Les emplacements de produit et les photos que seul le client donne ne comptent pas.
    expect(PB.piecePhotos("tn-achat", "products")).toBe(0);
    expect(PB.piecePhotos("tn-produits", "products")).toBe(0);
    expect(PB.piecePhotos("tn-emotion", "products")).toBe(1);
    expect(PB.piecePhotos("tn-de-pres", "products")).toBe(3);
    expect(PB.fichesDuSite(site)).toBe(3);
    expect(PB.fichesDuSite({ business: "products", products: 40 })).toBe(S.MAX_PRODUCT_PAGES);
    expect(PB.fichesDuSite({ business: "services", products: 1 })).toBe(1);
    const count = PB.designPhotos([
      { key: "home", label: "Accueil", sections: ["tn-ouverture", "tn-produits", "tn-emotion"] },
      { key: "product", label: "Fiche produit", sections: ["tn-achat", "tn-emotion", "tn-de-pres"] },
      { key: "about", label: "À propos", sections: ["tn-emotion"] },
    ], site);
    expect(count.pages.map((x) => [x.key, x.photos, x.times])).toEqual([["home", 2, 1], ["product", 4, 3], ["about", 1, 1]]);
    expect(count.total).toBe(2 + 4 * 3 + 1);
    expect(PB.photoBudgetGaps(count, 15, site)).toEqual([]);
    const gap = PB.photoBudgetGaps(count, 10, site);
    expect(gap).toHaveLength(1);
    expect(gap[0]).toMatch(/la conception demande 15 photos à créer pour un budget de 10 \(Accueil : 2 ; Fiche produit : 4 × 3 fiches ; À propos : 1\)\. Retire 5 photo\(s\)[^]*d'abord sur la fiche produit \(chaque pièce y compte 3 fois\), sans laisser une page importante sans aucune photo/);
    const brief = PB.photoBudgetBrief(34, site);
    expect(brief).toMatch(/BUDGET DE PHOTOS À CRÉER : 34 photos au plus sur TOUT le site[^]*Ne comptent PAS : les emplacements de produit[^]*compte donc 3 fois \(3 fiches\)[^]*RÉPARTITION : chaque page importante garde des photos[^]*ne se CHOISIT pas/);
    expect(PB.photoBudgetBrief(20, { business: "services", products: 1 })).not.toMatch(/fiches/);
    // Le budget est celui du devis annoncé au client : la fiche y est comptée une fois, pour toutes les fiches ensemble.
    const g1 = X.siteSizeGuess({ business: "products", products: 1 }), g3 = X.siteSizeGuess(site);
    expect(g3.photos).toBe(g1.photos + X.pageSizeGuess("boutique", site).photos);
    // La création du site le passe au concepteur, qui le lit dans sa demande et dont la conception est recomptée.
    const job0 = fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/custom-theme/site-job.ts"), "utf8"), tools = fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/custom-theme/tools.ts"), "utf8");
    expect(job0).toMatch(/photoBudget = [^\n]*siteSizeGuess\(kindOf\(tc\)\)\.photos[^]*jobId: ctx\.job\.id, photoBudget \}/);
    expect(tools).toMatch(/photoBudgetBrief\(a\.photoBudget, photoSiteOf\)/);
    expect(tools).toMatch(/g\.pages\.push\(\.\.\.photoBudgetGaps\(designPhotos\(/);
  });

  it("devis du montage : un emplacement de produit n'est plus jamais compté comme une photo à créer", async () => {
    const { pid } = await boutique();
    const slots = B.photoSlots(S.loadCustomTheme(pid)!, { business: "products", productPhotos: true });
    expect(slots.filter((x) => x.kind === "produit").length).toBeGreaterThanOrEqual(2);
    expect(slots.filter((x) => x.kind === "ambiance").length).toBe(2); // l'ouverture et la grande photo de la fiche
    // Pour une boutique, le devis range toujours ces emplacements à part, que le client ait donné ses photos ou non,
    // et ne les ajoute plus au plafond.
    const tools = fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/custom-theme/tools.ts"), "utf8");
    expect(tools).toContain('productPhotos: k.business === "products" || (k.productPhotos?.length ?? 0) > 0');
    expect(tools).toContain("const photosMax = none ? 0 : known != null ? known + misplaced : photos;");
  });
});
