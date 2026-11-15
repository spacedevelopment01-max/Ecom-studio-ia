/**
 * Thème sur mesure à tenue (13 novembre 2026 ; demande du propriétaire : « tu t'arrête pas tant que le résultat n'est pas
 * le même que tu m'a envoyé exactement le meme »). Deux sites sont montés par les outils de SINA, avec une IA simulée :
 * le fauteuil (calme, la niche du mur) et le sac de voyage (brut, l'étiquette cousue et la sangle). Le concepteur choisit
 * les sections à tenue, leurs constructions et la tenue ; le rédacteur écrit les textes des écrans envoyés ; les photos
 * sont celles de l'exemple. Le Studio fabrique. Aucun appel réel.
 *
 * Avec TENUE_OUT=<dossier>, les pages sont capturées sur téléphone dans ce dossier (comparaison en image avec les écrans
 * faits à la main ; sans navigateur, rien n'est capturé). TENUE_NET=1 : captures deux fois plus fines, à montrer.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import type { Design } from "@/lib/syna-agent/custom-theme/design";
import * as F from "./tenue-fauteuil-fixtures";
import * as K from "./tenue-sac-fixtures";

/** Un exemple complet : la marque, son produit, ses photos, et le site que le concepteur et le rédacteur simulés rendent. */
type Example = {
  brand: unknown; tenue: Design["tenue"]; concept: string; visitor: string; offer: string; family: "classique" | "moderne";
  product: string; productPhotos: string[]; dir?: string; scenes: Record<string, { file: string; crop?: [number, number, number, number] }>;
  site: { key: string; label: string; sections: F.Instance[] }[]; header: F.Instance; footer: F.Instance;
};
const FAUTEUIL: Example = {
  brand: F.FAUTEUIL_BRAND, tenue: { ...F.FAUTEUIL_TENUE }, concept: "Le fauteuil dans sa niche : tout le site reprend l'arrondi du mur.", visitor: "Une personne qui partage son logement et veut un coin à elle pour lire.",
  offer: "Un fauteuil enveloppant en tissu terracotta.", family: "classique", product: "Fauteuil Alcôve terracotta", productPhotos: F.PRODUCT_PHOTOS, scenes: F.SCENES, site: F.SITE, header: F.HEADER, footer: F.FOOTER,
};
const SAC: Example = {
  brand: K.SAC_BRAND, tenue: { ...K.SAC_TENUE }, concept: "Un sac fait pour servir : la toile, l'étiquette cousue et la sangle tiennent tout le site.", visitor: "Une personne qui part souvent deux ou trois jours et ne veut rien porter à la main.",
  offer: "Un sac de voyage modulable en toile kaki.", family: "moderne", product: K.SAC_PRODUCT, productPhotos: K.SAC_PRODUCT_PHOTOS, dir: K.SAC_DIR, scenes: K.SAC_SCENES, site: K.SAC_SITE, header: K.SAC_HEADER, footer: K.SAC_FOOTER,
};
const pick = (x: F.Instance) => ({ section: x.id, ...(x.construction ? { construction: x.construction } : {}), why: "Le moment où le visiteur a besoin de cela.", says: "Les vrais faits de la marque, sans rien inventer.", photos: (x.photos ?? []).map(([, scene]) => `scène:${scene}`).join(" ; ") || "aucune" });
const design = (e: Example): Design => ({
  visitor: e.visitor, levers: ["ce que le produit change dans la journée", "sa silhouette"], objections: [],
  concept: e.concept, header: e.header.id, headerConstruction: e.header.construction, footer: e.footer.id, search: null, corrections: [],
  tenue: e.tenue,
  pages: e.site.map((pg) => ({ key: pg.key, label: pg.label, journey: "Le visiteur arrive, comprend, ressent, puis agit sans hésiter.", sections: pg.sections.map(pick) })),
});

describe("thème sur mesure à tenue : le fauteuil et le sac, montés par les outils de SINA", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const N = await import("@/lib/syna-agent/custom-theme/tenue");
  const { libSection, familySections } = await import("@/lib/syna-agent/custom-theme/library");
  const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
  const { designPrompt } = await import("@/lib/syna-agent/custom-theme/design");
  const { saveBrand, loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { createProduct } = await import("@/lib/products/catalog");
  const fr = <X,>(fn: () => Promise<X> | X) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  it("les sections à tenue vont avec les deux familles, ont leurs constructions, et le concepteur les voit", () => {
    for (const family of ["classique", "moderne"] as const) expect(familySections(family).filter((s) => N.isTenueSection(s)).length).toBe(N.TENUE_SECTIONS.length);
    expect(N.constructionsOf("tn-ouverture").map((c) => c.key)).toEqual(["dans-la-photo", "titre-puis-cadre", "titre-geant"]);
    expect(N.validConstruction("tn-ouverture", "titre-geant")).toBe("titre-geant");
    expect(N.validConstruction("tn-ouverture", "inconnue")).toBe("dans-la-photo"); // construction inconnue : la première
    expect(N.validConstruction("tn-pied", "x")).toBeNull();
    const prompt = designPrompt({ brief: "FICHE", family: "classique", site: { business: "products", products: 1 }, has: [], lacks: [] });
    expect(prompt).toMatch(/- tn-ouverture · ouverture · À TENUE[^\n]*CONSTRUCTIONS au choix \(champ « construction »\) : « dans-la-photo » \(/);
    // Ce qui manque au dossier s'affiche en jaune, sans crochets ; rien d'autre n'est touché.
    expect(N.markMissing("Prix : [À compléter] · Réponse sous [À compléter : délai]")).toBe('Prix : <mark class="tn-manque">À compléter</mark> · Réponse sous <mark class="tn-manque">À compléter : délai</mark>');
    expect(N.markMissing("<p>Rien à compléter ici.</p>")).toBe("<p>Rien à compléter ici.</p>");
    // La tenue rendue par le concepteur est lue avec indulgence : un accent, une majuscule ou une valeur inconnue ne
    // font jamais échouer un appel payé (le fournisseur ne fait pas respecter les listes de choix).
    expect(N.TenuePickSchema.parse({ titres: "Gras", bouton: "Étiquette", cadre: " penché ", fond: "velours", petits: "machine", signe: "x".repeat(300) })).toEqual({ titres: "gras", bouton: "etiquette", cadre: "penche", fond: "uni", petits: "machine", signe: "x".repeat(120) });
    expect(N.TenuePickSchema.parse({})).toEqual({ ...N.DEFAULT_TENUE });
    // Pour SINA (custom.structure), une valeur inconnue est refusée : elle corrige au lieu de poser un réglage par défaut.
    expect(N.TenueSchema.safeParse({ bouton: "velours" }).success).toBe(false);
    // La tenue : couleurs de la marque, cinq réglages.
    expect(N.tenueAttrs({ ...N.DEFAULT_TENUE, titres: "gras", bouton: "etiquette", fond: "toile" })).toBe(' data-tn-titres="gras" data-tn-bouton="etiquette" data-tn-cadre="droit" data-tn-fond="toile" data-tn-petits="normal"');
    expect(N.tenueCss({ light: "#F1E5D1", dark: "#38231A", primary: "#B4532C", secondary: "#E7D6BB" }, null)).toMatch(/--tn-fond:#F1E5D1;--tn-encre:#38231A;--tn-accent:#B4532C;--tn-doux:#E7D6BB/);
  });

  /**
   * Tout le parcours d'un thème sur mesure par les outils de SINA : la fiche du projet, la famille et l'ambiance, la
   * conception (sections, constructions, tenue), puis le montage à la marque (textes et photos). IA simulée.
   */
  async function mount(e: Example) {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: e.offer }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Calme." }, { field: "setup", value: "1 produit" }, { field: "market", value: "France." },
      { field: "price", value: "à définir" }, { field: "difference", value: "Bien fait." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    saveBrand(pid, e.brand as any);
    const prod: string[] = [];
    for (const f of e.productPhotos) prod.push((await saveAsset({ projectId: pid, userId: user.id, data: await F.photo(f, undefined, e.dir), name: f.replace(".webp", ".jpg"), mime: "image/jpeg", role: "original", origin: "upload" })).id);
    createProduct(pid, { title: e.product, images: prod.map((assetId) => ({ assetId })) } as any);
    await call("theme.family", ctx, { family: e.family });
    await call("theme.ambiance", ctx, { ambiance: "clair" });

    // 1) Conception : le concepteur (simulé) choisit sections, constructions et tenue ; le Studio monte et contrôle.
    T.customDesignDeps.call = async () => design(e);
    let built: any;
    try { built = await call("custom.design", ctx, {}); } finally { delete T.customDesignDeps.call; }
    expect(built.ok, built.summary).toBe(true);
    const designed = S.loadCustomTheme(pid)!;

    // 2) Montage à la marque : le rédacteur (simulé) écrit les textes des écrans envoyés ; les photos sont celles de l'exemple.
    const instance = (title: string, place: string): F.Instance | null => {
      const id = N.TENUE_SECTIONS.find((s) => s.title === title)?.id;
      if (id === e.header.id) return e.header;
      if (id === e.footer.id) return e.footer;
      return e.site.find((pg) => pg.label === place)?.sections.find((x) => x.id === id) ?? null;
    };
    B.customBrandDeps.plan = async (prompt) => ({ promesse: "Ce que le produit change.", voix: "Phrases courtes.", menu: ["Le produit", "Notre histoire", "Contact"], sections: [...prompt.matchAll(/^- (s[0-9a-f]{8}) · /gm)].map((m, i) => ({ uid: m[1], message: `Message ${i}`, titre: null, bouton: null, faits: [] })) });
    const unknown: string[] = [];
    B.customBrandDeps.write = async (prompt) => {
      const m = /Section à adapter : « ([^»]+) » \(([^)]+)\)/.exec(prompt);
      const x = m ? instance(m[1], m[2]) : null;
      if (!x) { unknown.push(m ? `${m[1]} (${m[2]})` : "?"); return { edits: [], links: [], photos: [] }; }
      // Un texte gardé tel quel n'est pas réécrit ; une section dont le rédacteur garde tous les mots le dit par une écriture à l'identique.
      const changed = (x.texts ?? []).filter(([a, b]) => a !== b);
      return { edits: (changed.length ? changed : (x.texts ?? []).slice(0, 1)).map(([find, replace]) => ({ find, replace })), links: [], photos: (x.photos ?? []).map(([find, scene]) => ({ find, description: scene === "produit" ? "Photo du produit seul." : `scène:${scene} : photo de scène, lumière douce.`, ratio: "4:5", product: scene === "produit" ? e.product : null })) };
    };
    const made: string[] = [];
    B.customBrandDeps.photo = async (prompt) => { const scene = /scène:([\w-]+)/.exec(prompt)?.[1]; if (!scene || !e.scenes[scene]) throw new Error(`scène inconnue dans : ${prompt.slice(0, 120)}`); made.push(scene); return F.photo(e.scenes[scene].file, e.scenes[scene].crop, e.dir); };
    try {
      const r = await call("custom.build", ctx, {});
      expect(r.ok, r.summary).toBe(true);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs[0]);
      const report: any = await fr(() => B.runCustomBrandJob({ job: { id: job.id }, payload: JSON.parse(job.payload), checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
      expect(unknown).toEqual([]);
      expect(report.failedEdits, JSON.stringify(report.problems)).toBe(0);
      expect(report.photosFailed).toBe(0);
    } finally { delete B.customBrandDeps.plan; delete B.customBrandDeps.write; delete B.customBrandDeps.photo; }
    // Chaque scène est créée une fois, pour sa place ; les photos du produit ne sont jamais recréées.
    expect([...made].sort()).toEqual(e.site.flatMap((pg) => pg.sections.flatMap((x) => (x.photos ?? []).map(([, scene]) => scene))).filter((x) => x !== "produit").sort());
    // Les textes des écrans sont dans les sections ; aucune photo d'exemple ne reste là où une scène a été créée.
    const t = S.loadCustomTheme(pid)!;
    for (const pg of e.site) for (const [i, x] of pg.sections.entries()) {
      const html = S.sectionHtml(t.pages.find((p) => p.key === pg.key)!.sections[i]);
      for (const [, text] of x.texts ?? []) expect(html, `${pg.label} › ${x.id}`).toContain(text.replace(/^>|<$/g, "").replace(/<\/a><ul$/, ""));
      if (x.photos?.some(([, scene]) => scene !== "produit")) expect(html, `${pg.label} › ${x.id}`).not.toMatch(/photos\//);
    }
    // Aucun mot de l'exemple de la bibliothèque (une maison de thé) ne reste dans les pages du site.
    const page = renderCustomTheme(loadProject(pid), t, { embed: true });
    const pages = [...page.matchAll(/<main class="tb-pg"[^]*?<\/main>/g)].map((m) => m[0]).join("\n");
    expect(pages.length).toBeGreaterThan(5000);
    expect([...pages.matchAll(/.{0,70}(?:Brindi|Thé vert|jasmin|infus|mélange|sachet).{0,50}/gi)].map((m) => m[0])).toEqual([]);
    return { user, ctx, pid, prod, designed, site: T.siteKind(ctx) };
  }
  /** Captures sur téléphone pour la comparaison en image (seulement à la demande). */
  async function shots(pid: string, name: string, keys: string[], bottom?: string) {
    if (!process.env.TENUE_OUT) return;
    const { shootPhonePage, shootPageBottom } = await import("@/lib/syna-agent/custom-theme/shots");
    const scale = process.env.TENUE_NET ? 2 : 1, html = renderCustomTheme(loadProject(pid), S.loadCustomTheme(pid)!, { embed: true });
    for (const key of keys) { const data = await shootPhonePage(html, key, scale, 85); if (data) fs.writeFileSync(`${process.env.TENUE_OUT}/${name}-${key}${scale > 1 ? "-net" : ""}.jpg`, data); }
    if (bottom) { const data = await shootPageBottom(html, bottom, scale, 85); if (data) fs.writeFileSync(`${process.env.TENUE_OUT}/${name}-${bottom}-bas${scale > 1 ? "-net" : ""}.jpg`, data); }
    // TENUE_BUREAU=1 : l'accueil sur ordinateur aussi.
    if (process.env.TENUE_BUREAU) { const { customThemeShots } = await import("@/lib/syna-agent/custom-theme/shots"); for (const s of await customThemeShots(pid)) if (s.view === "ordinateur") fs.writeFileSync(`${process.env.TENUE_OUT}/${name}-bureau.jpg`, s.data); }
  }

  it("le fauteuil : conception, textes et photos par SINA, le Studio fabrique les écrans envoyés au propriétaire", async () => {
    const { ctx, pid, prod, designed, site } = await mount(FAUTEUIL);
    expect(designed.tenue).toMatchObject({ titres: "fins", bouton: "pilule", cadre: "niche", signe: "la niche du mur" });
    expect(designed.header).toMatchObject({ id: "tn-entete", construction: "centre" });
    expect(designed.pages.find((x) => x.key === "home")!.sections.slice(0, 2).map((s) => [s.id, s.construction])).toEqual([["tn-ouverture", "dans-la-photo"], ["tn-de-pres", "sans-titre"]]);
    expect(designed.pages.find((x) => x.key === "product")!.sections.map((s) => s.id)).toEqual(["tn-achat", "tn-description", "tn-de-pres", "tn-emotion", "tn-places", "tn-mesures", "tn-questions", "tn-final"]);
    // Règles du propriétaire : aucune n'est enfreinte (8 sections sur l'accueil, 8 sur la fiche, toutes les pages), et
    // une même section à tenue sert sur plusieurs pages sans être refusée.
    expect(S.checkCustomTheme(designed, site).filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
    expect(S.checkCustomTheme(designed, site).map((x) => x.text).join("\n")).not.toMatch(/mélange|sans tenue choisie/);

    // 3) Le résultat : la tenue, les constructions, le bloc d'achat et sa barre.
    let t = S.loadCustomTheme(pid)!;
    S.saveCustomTheme(pid, S.applyStructure(t, [{ op: "settings", buy: { barre: true } }]), { history: false }); // le client coche la barre d'achat
    t = S.loadCustomTheme(pid)!;
    const page = renderCustomTheme(loadProject(pid), t, { embed: true });
    expect(page).toContain('<link rel="stylesheet" href="/sections/tenue.css">');
    expect(page).toMatch(/class="tb-wrap ctw ctw-classique [^"]*" data-tn-titres="fins" data-tn-bouton="pilule" data-tn-cadre="niche" data-tn-fond="uni" data-tn-petits="normal"/);
    expect(page).toMatch(/--tn-fond:#F1E5D1;--tn-encre:#38231A/);
    expect(page).toMatch(/<section data-ct="s[0-9a-f]{8}" data-ct-role="page" data-ct-own data-tn-c="dans-la-photo" class="tn tn-ouverture">/);
    expect(page).toMatch(/<section data-ct="s[0-9a-f]{8}" data-ct-role="header" data-ct-own data-tn-c="centre" class="tn tn-entete">[^]*?<span class="tn-nom lg">Alcôve<\/span>/);
    expect(page).toMatch(/data-tn-c="fauteuil" class="tn tn-mesures"/);
    // Bloc d'achat : les vraies photos du produit (la grande et cinq vignettes), aucun prix inventé, la barre d'achat suit le bloc.
    const buy = /<section[^>]*class="tn tn-achat"[^]*?<\/section>/.exec(page)![0];
    expect(buy).toContain(`<div class="tn-grande tn-ph" style="background-image:url(/api/files/${prod[0]})">`);
    expect((buy.match(/<i class="tn-ph"/g) ?? []).length).toBe(5);
    expect(buy).toContain('<div class="tn-prix">Prix : <mark class="tn-manque">À compléter</mark></div>');
    expect(buy).toContain('<li>Livraison : <mark class="tn-manque">À compléter</mark></li>');
    expect(buy).toContain('<div class="tn-barre"><b>Alcôve terracotta</b><a class="tn-bt" href="#" onclick="return false" data-pogo>Lui faire une place</a></div>');
    // Les cartes et le panier montrent le vrai produit du catalogue.
    expect(page).toMatch(/<a class="tn-carte-p"[^>]*data-go="product"><div class="tn-ph" style="background-image:url\(\/api\/files\/[\w-]+\)"><\/div><b>Fauteuil Alcôve terracotta<\/b>/);
    expect(S.checkCustomTheme(t, site).filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
    await shots(pid, "sina", ["home", "product", "contact", "404"], "product");

    // 4) SINA change la tenue ou une construction à la demande du client (gratuit, sans rien réécrire), et l'annule.
    const opening = t.pages[0].sections[0];
    const swap = await call("custom.structure", ctx, { ops: [{ op: "tenue", tenue: { ...F.FAUTEUIL_TENUE, bouton: "droit" } }] });
    expect(swap.ok, swap.summary).toBe(true);
    expect(renderCustomTheme(loadProject(pid), S.loadCustomTheme(pid)!, { embed: true })).toMatch(/data-tn-bouton="droit"/);
    expect((await call("custom.structure", ctx, { ops: [{ op: "construction", uid: opening.uid, construction: "inconnue" }] })).ok).toBe(false);
    await call("custom.undo", ctx, {});
    expect(S.loadCustomTheme(pid)!.tenue).toMatchObject({ bouton: "pilule" });

    // 5) La proposition B, sur le même site : « le titre d'abord, la photo dans la niche », le nom à gauche. SINA change
    //    les deux constructions (gratuit) ; les textes restent. Une autre photo d'ouverture est créée (payant, simulé).
    const toB = await call("custom.structure", ctx, { ops: [{ op: "construction", uid: opening.uid, construction: "titre-puis-cadre" }, { op: "construction", uid: t.header!.uid, construction: "gauche" }] });
    expect(toB.ok, toB.summary).toBe(true);
    let b = S.loadCustomTheme(pid)!;
    expect(b.pages[0].sections[0]).toMatchObject({ uid: opening.uid, construction: "titre-puis-cadre" });
    expect(b.header).toMatchObject({ uid: t.header!.uid, construction: "gauche" });
    expect(S.sectionHtml(b.pages[0].sections[0])).toContain("Le soir tombe.<br>Vous aussi."); // ses textes et sa photo restent
    const current = /\/api\/files\/[\w-]+/.exec(S.sectionHtml(b.pages[0].sections[0]))![0];
    T.customPhotoDeps.make = async () => F.photo(F.SCENES["ouverture-b"].file, F.SCENES["ouverture-b"].crop);
    T.customPhotoDeps.unit = () => 100_000;
    try {
      const shot = await call("custom.photo", ctx, { uid: opening.uid, find: current, description: "Photo de scène, format portrait : le fauteuil terracotta près d'une grande fenêtre, rideau clair, lumière du soir, sol clair. Aucun texte, aucun logo, aucune personne.", ratio: "4:5", product: true });
      expect(shot.ok, shot.summary).toBe(true);
    } finally { delete T.customPhotoDeps.make; delete T.customPhotoDeps.unit; }
    b = S.loadCustomTheme(pid)!;
    expect(S.sectionHtml(b.pages[0].sections[0])).not.toContain(current);
    expect(renderCustomTheme(loadProject(pid), b, { embed: true })).toMatch(/data-tn-c="gauche" class="tn tn-entete"[^]*data-tn-c="titre-puis-cadre" class="tn tn-ouverture"/);
    expect(S.checkCustomTheme(b, site).filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
    await shots(pid, "sina-b", ["home"]);
  }, 300_000);

  it("mise en boutique : le thème sur mesure devient un thème Shopify, rien d'inventé ni d'exemple ne part", async () => {
    const { pid, ctx } = await mount(FAUTEUIL);
    const I = await import("@/lib/syna-agent/custom-theme/install");
    // Par l'outil de SINA (étape 7) : jamais avant le choix du client ; puis la liste de ce qui reste à régler ; puis,
    // avec son accord, le thème prêt et son lien de téléchargement. Jamais « ta boutique est en ligne ».
    expect((await call("custom.install", ctx, {})).summary).toMatch(/n'a pas encore choisi son thème/);
    expect((await call("custom.choose", ctx, {})).ok).toBe(true);
    const refused = await call("custom.install", ctx, {});
    expect(refused.ok).toBe(false);
    expect(refused.summary).toMatch(/pas encore possible : \d+ point\(s\) à régler d'abord\. Rien n'est créé/);
    expect(refused.data.aRegler.length).toBeGreaterThan(3);
    const ready = await call("custom.install", ctx, { sansLesManques: true });
    expect(ready.ok, ready.summary).toBe(true);
    expect(ready.data.export).toMatch(new RegExp(`^/api/projects/${pid}/theme/export\\?version=[\\w-]+&platform=shopify$`));
    expect(ready.hint).toMatch(/Ne dis jamais que sa boutique est en ligne/);
    const { journeyOf } = await import("@/lib/syna-agent/journey");
    expect(journeyOf(ctx.conversationId).steps[7]?.status).toBe("done");
    const { compileTheme } = await import("@/lib/theme/compile");
    const { themeVersion } = await import("@/lib/projects");
    // 1) Tant qu'une information manque (prix, livraison, mesures…), rien ne part : elles sont listées au client.
    const first = I.installCustomTheme(pid);
    expect(first.ok).toBe(false);
    const blocking = (first as { blocking: string[] }).blocking;
    expect(blocking.join("\n")).toMatch(/Fiche produit › Bloc d'achat[^\n]*à compléter/);
    expect(blocking.join("\n")).toMatch(/Mesures en schéma[^\n]*à compléter/);
    expect(blocking.every((x) => /à compléter/.test(x)), blocking.join("\n")).toBe(true); // aucun autre refus : Liquid, schéma et thème sont valides
    // 2) Avec l'accord du client, ces lignes sont retirées, et c'est dit.
    const done = I.installCustomTheme(pid, { dropMissing: true });
    expect(done.ok, JSON.stringify(done).slice(0, 600)).toBe(true);
    if (!done.ok) return;
    expect(done.notes.join("\n")).toMatch(/retiré faute d'information/);
    // Une section qui n'avait que des informations manquantes ne garde pas un titre seul.
    expect(done.notes.join("\n")).toMatch(/Questions en volets : section retirée, il ne restait que son titre/);
    expect(done.notes.join("\n")).toMatch(/Mon compte[^\n]*compte client est une page de Shopify/);
    const spec = themeVersion(pid, done.versionId)!.spec;
    expect(Object.keys(spec.templates)).toEqual(expect.arrayContaining(["index", "product", "cart", "404", "page.contact", "page.about", "page.aide", "page.legal", "collection", "search", "page", "list-collections"]));
    expect(spec.store.pages.map((x) => [x.handle, x.template_suffix])).toEqual(expect.arrayContaining([["contact", "contact"], ["about", "about"], ["legal", "legal"]]));
    const all = Object.values(spec.customSections).map((s) => s.liquid).join("\n");
    // Rien d'exemple, rien d'inventé, aucun geste de l'aperçu.
    expect(all).not.toMatch(/À compléter|photos\/|onclick=|data-go=|href="#"|\/api\/files\//);
    // De vraies fonctions : prix et photos de la boutique, ajout au panier, panier, contact, recherche, liens.
    const type = (key: string, n: number) => spec.templates[key].sections[spec.templates[key].order[n]].type;
    const buy = spec.customSections[type("product", 0)].liquid;
    expect(buy).toContain("{{ product.selected_or_first_available_variant.price | money }}");
    expect(buy).toMatch(/\{%- form 'product', product, class: 'tn-enveloppe' -%\}[^]*<button class="tn-bt" type="submit" name="add"[^>]*>Lui faire une place<\/button>[^]*\{\{ form \| payment_button \}\}[^]*\{%- endform -%\}/); // l'achat, puis le paiement rapide de Shopify
    expect(buy).toContain("{%- for image in product.images limit: 5 -%}");
    expect(buy).not.toContain("tn-barre");
    expect(buy).toContain("<h1>Alcôve terracotta</h1>"); // ses textes restent ceux écrits pour la marque
    expect(spec.customSections[type("cart", 0)].liquid).toMatch(/\{%- for item in cart\.items -%\}[^]*\{\{ cart\.total_price \| money \}\}[^]*name="checkout"/);
    expect(spec.customSections[type("page.contact", 0)].liquid).toMatch(/\{%- form 'contact' -%\}[^]*name="contact\[email\]"[^]*<textarea class="tn-champ-i tn-haut" name="contact\[body\]"[^]*<button class="tn-bt" type="submit">Envoyer<\/button>\{%- endform -%\}/);
    expect(spec.customSections[type("404", 0)].liquid).toMatch(/<form class="tn-champ" action="\{\{ routes\.search_url \}\}"[^]*name="q"/);
    const home = spec.templates.index.order.map((id) => spec.customSections[spec.templates.index.sections[id].type].liquid).join("\n");
    expect(home).toMatch(/<div class="tn-cartes">\{%- for product in collections\.all\.products limit: 8 -%\}<a class="tn-carte-p[^"]*" href="\{\{ product\.url \}\}">/);
    // Le rédacteur simulé n'a pas dit où mène ce bouton : il mène à l'accueil, et c'est dit (jamais un lien mort).
    expect(home).toContain(`<a class="tn-bt" href="{{ routes.root_url }}">M'y installer</a>`);
    expect(done.notes.join("\n")).toMatch(/le lien « M'y installer » n'a pas de destination/);
    // Un lien dont la destination est connue mène à la vraie page.
    expect(spec.customSections[type("404", 0)].liquid).toContain('<a class="tn-bt" href="{{ routes.root_url }}">Revenir à l\'accueil</a>');
    expect(spec.customSections[spec.groups.footer.sections[spec.groups.footer.order[0]].type].liquid).toContain('href="{{ routes.root_url }}pages/legal">Mentions légales</a>');
    expect(home).toMatch(/style="background-image:url\(\{\{ 'tn-[\w-]+\.(?:jpg|png)' \| asset_url \}\}\)"/);
    // L'en-tête porte les couleurs, les polices et le socle de la feuille ; chaque section porte sa propre part.
    const header = spec.customSections[spec.groups.header.sections[spec.groups.header.order[0]].type].liquid;
    expect(header).toMatch(/<div class="ctw ctw-classique" data-tn-titres="fins" data-tn-bouton="pilule" data-tn-cadre="niche"/);
    expect(header).toMatch(/\{% stylesheet %\}[^]*--tn-fond:#F1E5D1[^]*--f-title:var\(--font-heading\)[^]*\.ctw \.tn-entete\{/);
    expect(header).toContain('<a class="tn-pan" href="{{ routes.cart_url }}" aria-label="Panier">Panier <u>(</u><span>{{ cart.item_count }}</span><u>)</u></a>');
    // Toute la feuille part avec l'en-tête, dans l'ordre d'origine (à force égale la dernière règle gagne : la bande
    // sombre de fin de page doit rester sombre) ; seules les sections utilisées y sont ; les autres n'en portent pas.
    expect(header).toMatch(/\.ctw \.tn\{[^]*\.ctw \.tn-achat[^]*\.ctw \.tn-final\{[^}]*background:var\(--tn-encre\)/);
    expect(header).not.toContain(".ctw .tn-bande"); // section absente de ce site
    expect(buy).not.toContain("{% stylesheet %}");
    expect(spec.settings.type_heading_font).toBe("instrument_serif_n4");
    // Le thème se compile en fichiers Shopify : une section par fichier, les gabarits, les groupes.
    const files = compileTheme(spec);
    expect([...files.keys()].filter((f) => /^sections\/es-custom-s[0-9a-f]{8}\.liquid$/.test(f)).length).toBe(Object.keys(spec.customSections).length);
    for (const f of ["templates/index.json", "templates/product.json", "templates/page.contact.json", "templates/404.json", "sections/header-group.json", "sections/footer-group.json", "layout/theme.liquid"]) expect(files.has(f), f).toBe(true);
    if (process.env.TENUE_OUT) for (const [f, body] of files) if (/es-custom|templates\/(?:index|product)\.json|-group\.json/.test(f)) { fs.mkdirSync(`${process.env.TENUE_OUT}/shopify/${f.split("/")[0]}`, { recursive: true }); fs.writeFileSync(`${process.env.TENUE_OUT}/shopify/${f}`, body); }
    // À la demande : le thème Shopify rendu par l'aperçu Liquid du Studio, pour le comparer en image au thème sur mesure.
    if (process.env.TENUE_OUT) {
      const { snapshotTheme } = await import("@/lib/theme/snapshot");
      const { withStudioProducts, listProducts } = await import("@/lib/products/catalog");
      const full = withStudioProducts(spec, pid);
      for (const [name, url] of [["accueil", "/"], ["fiche", `/products/${listProducts(pid)[0].handle}`], ["contact", "/pages/contact"], ["panier", "/cart"]] as const) {
        const shots = await snapshotTheme(full, url, { desktopSheets: 0, mobileSheets: 4 }).catch((e) => { fs.writeFileSync(`${process.env.TENUE_OUT}/shopify-${name}-erreur.txt`, String((e as Error).stack ?? e)); return null; });
        (shots?.mobile ?? []).forEach((data, i) => fs.writeFileSync(`${process.env.TENUE_OUT}/shopify-${name}-${i}.jpg`, data));
      }
    }
  }, 300_000);

  it("le sac de voyage : les mêmes sections, une autre tenue et d'autres constructions, un tout autre site", async () => {
    const { pid, prod, designed, site } = await mount(SAC);
    expect(designed.family).toBe("moderne"); // les sections à tenue vont avec les deux familles
    expect(designed.tenue).toMatchObject({ titres: "gras", bouton: "etiquette", cadre: "droit", fond: "toile", petits: "machine" });
    expect(designed.header).toMatchObject({ id: "tn-entete", construction: "sangle" });
    expect(designed.pages.find((x) => x.key === "home")!.sections.slice(0, 2).map((s) => [s.id, s.construction ?? null])).toEqual([["tn-ouverture", "titre-geant"], ["tn-bande", null]]);
    expect(S.checkCustomTheme(designed, site).filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
    const t = S.loadCustomTheme(pid)!;
    const page = renderCustomTheme(loadProject(pid), t, { embed: true });
    expect(page).toMatch(/class="tb-wrap ctw ctw-moderne[^"]*" data-tn-titres="gras" data-tn-bouton="etiquette" data-tn-cadre="droit" data-tn-fond="toile" data-tn-petits="machine"/);
    expect(page).toMatch(/--tn-fond:#E8E1CF;--tn-encre:#14140F;--tn-accent:#4B5230/);
    expect(page).toMatch(/data-tn-c="sangle" class="tn tn-entete">[^]*?<span class="tn-nom lg">Traverse<\/span>/);
    expect(page).toMatch(/data-tn-c="titre-geant" class="tn tn-ouverture">[^]*?<span class="tn-etq">Sac de voyage modulable<\/span>[^]*?<h1>Tout tient\.<br>Tu pars\.<\/h1>/);
    expect(page).toMatch(/data-tn-c="sac" class="tn tn-mesures"/);
    expect(page).toContain(`<div class="tn-grande tn-ph" style="background-image:url(/api/files/${prod[0]})">`);
    // Contre les doublons : la carte d'identité du sac n'a presque rien de commun avec celle du fauteuil, alors que les
    // deux sites sortent de la même bibliothèque (constructions et tenue comptent).
    const { cardOfTheme, commonLines } = await import("@/lib/syna-agent/custom-theme/identity-card");
    const fauteuil = S.applyStructure({ version: 1, family: "classique", style: null, header: null, footer: null, search: null, pages: [], rev: 0, at: 0 } as any, [
      ...F.SITE.flatMap((pg) => [{ op: "page", key: pg.key, label: pg.label } as const, ...pg.sections.map((x) => ({ op: "add", page: pg.key, section: x.id, ...(x.construction ? { construction: x.construction } : {}) }) as const)]),
      { op: "shell", slot: "header", section: F.HEADER.id, construction: F.HEADER.construction }, { op: "shell", slot: "footer", section: F.FOOTER.id }, { op: "tenue", tenue: { ...F.FAUTEUIL_TENUE } },
    ]);
    const same = commonLines(cardOfTheme(t), cardOfTheme(fauteuil));
    // La fiche produit reprend les mêmes sections (un bloc d'achat reste un bloc d'achat) : c'est dit, pas caché.
    expect(same.common).toEqual(["les sections de la page qui vend", "le pied de page"]);
    expect(same.compared - same.common.length).toBeGreaterThanOrEqual(6);
    expect(cardOfTheme(t)).toMatchObject({ opening: "tn-ouverture:titre-geant", header: "tn-entete:sangle", tenue: "gras etiquette droit toile machine" });
    await shots(pid, "sina-sac", ["home", "product", "404"]);
  }, 300_000);
});
