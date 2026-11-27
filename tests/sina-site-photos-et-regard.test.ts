/**
 * Le site créé par SINA : ses photos et son regard en image (défauts du premier essai réel du lot 4, 16 novembre 2026,
 * corrigés à la source). Sans IA, sans réseau : chaque appel est simulé.
 *
 *  1. Personnes : la règle est dite à ceux qui décrivent les photos ; une description qui demande une personne ou une
 *     main sans autorisation n'est jamais envoyée telle quelle ; un refus du contrôle pour une personne donne UNE
 *     reprise, dans le plafond accordé ; une photo d'exemple de la bibliothèque n'est jamais montrée au client.
 *  2. Relecture des photos : un texte trop long est coupé, une entrée mal formée est ignorée seule.
 *  3. Regard en image : une note absente ne fait plus sauter le regard ; s'il échoue, c'est dit en tête du compte rendu.
 *  4. Une pièce sans texte n'est plus signalée « aucun texte réécrit ».
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("photos du site : jamais de personne sans accord, jamais de photo d'exemple", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { loadProject } = await import("@/lib/projects");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const G = await import("@/lib/syna-agent/custom-theme/gallery");
  const K = await import("@/lib/syna-agent/custom-theme/looks");
  const Lib = await import("@/lib/syna-agent/custom-theme/library");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
  const { shotDeps } = await import("@/lib/syna-agent/custom-theme/shots");
  const sharp = (await import("sharp")).default;
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  const png = () => sharp({ create: { width: 20, height: 20, channels: 3, background: "#888" } }).png().toBuffer();
  const OK = { productMatches: true, productWhole: true, texts: [], extraText: [], people: false, notes: [] };
  const PEOPLE = { ...OK, people: true };
  const HANDS = "Photographie d'ambiance en plan serré, format vertical. Deux mains règlent une pièce sur un établi en bois clair, visage hors champ. La scène contient exactement 2 objets. Lumière douce du matin.";
  const CALM = "Photographie d'ambiance en plan serré, format vertical. Un outil posé sur un établi en bois clair, à côté de la pièce en cours. La scène contient exactement 2 objets. Lumière douce du matin.";

  /** Un projet sans photo fournie, et un petit site : une ouverture (un titre, une photo) et une bande de photo (aucun texte). */
  async function site() {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}-${Math.random()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des objets faits à la main." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "1 objet" }, { field: "market", value: "France." },
      { field: "price", value: "25 €" }, { field: "difference", value: "Fait main." }, { field: "taste", status: "none" }, { field: "photos", value: "Non." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await (await import("./faits-fixtures")).avecLesFaitsDemandes(ctx, () => call("start.confirm", ctx, {}));
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    S.saveCustomTheme(pid, { version: 1, family: "classique", style: "x", header: null, footer: null, search: null,
      pages: [{ key: "home", label: "Accueil", sections: [{ uid: "s0000000a", id: "tn-ouverture" }, { uid: "s0000000b", id: "tn-bande" }] }] } as any);
    return { pid, cid, ctx };
  }
  const job = (id: string, payload: object, step?: (k: string, fn: () => Promise<unknown>) => Promise<unknown>) =>
    fr(() => B.runCustomBrandJob({ job: { id }, payload, checkpoint: {}, progress: () => undefined, step: step ?? (async (_k: string, fn: () => Promise<unknown>) => fn()) } as any)) as Promise<any>;
  /** Le rédacteur simulé : réécrit le titre de l'ouverture, et décrit chaque photo d'exemple avec la description donnée. */
  const writer = (description: string, prompts?: string[]) => async (prompt: string) => {
    prompts?.push(prompt);
    const html = prompt.slice(prompt.indexOf("HTML actuel"));
    const m = /<h1>([^]*?)<\/h1>/.exec(html);
    return { edits: m ? [{ find: m[1], replace: "Fait pour durer." }] : [], links: [],
      photos: [...new Set([...html.matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((x) => x[0]))].map((find) => ({ find, description, ratio: "4:5" as const, product: null })) };
  };
  const clean = () => { for (const k of ["plan", "write", "photo", "photoReview", "photoBrief", "look", "photoUnit"] as const) delete B.customBrandDeps[k]; delete G.galleryDeps.check; delete shotDeps.shoot; };

  it("la règle est dite à ceux qui décrivent les photos, comme règle générale", () => {
    for (const system of [B.SECTION_WRITE_SYSTEM, B.PHOTO_BRIEF_SYSTEM]) {
      expect(system).toContain(B.NO_PEOPLE_PHOTO_RULE);
    }
    expect(B.NO_PEOPLE_PHOTO_RULE).toMatch(/aucune personne, aucune main, aucun visage, aucune silhouette[^]*photo de personne fournie par le client, ou son accord écrit[^]*l'outil posé, l'objet en cours, la trace du travail/);
    expect(B.peopleBriefLine(false)).toMatch(/NON autorisées[^]*Aucune personne, aucune main, aucun visage, aucune silhouette/);
    expect(B.peopleBriefLine(true)).toMatch(/autorisées pour ce client/);
    // Aucun exemple tiré d'un métier ni d'un projet d'essai dans la règle.
    for (const text of [B.NO_PEOPLE_PHOTO_RULE, B.peopleBriefLine(false), B.NO_PEOPLE_PREFIX]) expect(text).not.toMatch(/vélo|frein|câble|thé|infusion|toilett|salon|bougie/i);
  });

  it("contrôle sans IA d'une description : une personne ou une partie du corps demandée sans autorisation est corrigée en tête", () => {
    for (const d of [HANDS, "Une femme tient l'objet.", "Portrait de l'artisan dans son atelier.", "Un client sourit.", "Des doigts posent la pièce.", "Une silhouette au loin.", "Scène sans visage visible, mais des mains travaillent."]) expect(B.briefShowsPeople(d), d).toBe(true);
    // Écarter la personne n'est pas la demander.
    for (const d of [CALM, "Un établi. Aucune personne, aucune main, aucun visage.", "Un atelier vide, sans personne ni main.", "Une table. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane."]) expect(B.briefShowsPeople(d), d).toBe(false);
    const fixed = B.briefWithoutPeople(HANDS, false);
    expect(fixed.startsWith("Aucune personne, aucune main, aucun visage")).toBe(true);
    expect(fixed.endsWith(HANDS)).toBe(true);
    expect(B.briefWithoutPeople(fixed, false)).toBe(fixed); // jamais posée deux fois
    expect(B.briefWithoutPeople(CALM, false)).toBe(CALM); // rien à corriger : rien d'ajouté
    expect(B.briefWithoutPeople(CALM, false, true).startsWith(B.NO_PEOPLE_PREFIX)).toBe(true); // reprise : toujours durcie
    expect(B.briefWithoutPeople(HANDS, true)).toBe(HANDS); // personnes autorisées : description gardée
    expect(B.refusedForPeople(["le produit est coupé ou déformé"])).toBe(false);
    expect(B.refusedForPeople(G.galleryVerdict(PEOPLE as any, { person: false, texts: [] }))).toBe(true);
  });

  it("montage : la description avec des mains part corrigée ; refus pour une personne : une seule reprise, comptée, puis la photo est posée", async () => {
    const { pid } = await site();
    const prompts: string[] = [], photos: { prompt: string; key: string }[] = [], checks: string[] = [];
    B.customBrandDeps.plan = async () => ({ promesse: "Fait pour durer.", voix: "Simple.", menu: [], sections: [] });
    B.customBrandDeps.write = writer(HANDS, prompts);
    B.customBrandDeps.photo = async (prompt, _ref, _aspect, key) => { photos.push({ prompt, key }); return png(); };
    B.customBrandDeps.photoUnit = () => 50_000;
    // Le contrôle refuse la première photo de l'ouverture (une main), accepte tout le reste.
    G.galleryDeps.check = async (_i, _p, _t, key) => { checks.push(key); return /:photo-check:s0000000a:/.test(key) ? PEOPLE : OK; };
    try {
      const r = await job(`j-${Date.now()}-reprise`, { projectId: pid, capMicro: 10_000_000, photos: true, newPhotos: true });
      // Le dossier donné au rédacteur dit la règle (aucune photo de personne fournie, aucun accord).
      expect(prompts[0]).toMatch(/PERSONNES DANS LES PHOTOS : NON autorisées/);
      // Chaque description part corrigée en tête, jamais telle quelle.
      for (const x of photos) expect(x.prompt).toContain(`${B.NO_PEOPLE_PREFIX} Photographie d'ambiance`);
      // Deux emplacements, trois créations : une seule reprise, pour la photo refusée.
      expect(photos.map((x) => x.key.replace(/^.*?:(photo(?:-retry)?):(s\w+):.*$/, "$1 $2"))).toEqual(["photo s0000000a", "photo-retry s0000000a", "photo s0000000b"]);
      expect(checks.filter((k) => /:photo-recheck:/.test(k))).toHaveLength(1);
      expect(r.photosReprises).toBe(1);
      expect(r.photosFailed).toBe(0);
      expect(r.photosMade).toBe(2);
      expect(r.problems.join("\n")).not.toMatch(/ratée au contrôle/);
      for (const x of S.allSections(S.loadCustomTheme(pid)!)) expect(S.sectionHtml(x.s)).not.toMatch(/photos\//);
    } finally { clean(); }
  });

  it("reprise refusée elle aussi : pas de troisième création, la photo est dite ratée, et un cadre neutre tient sa place dans l'aperçu", async () => {
    const { pid } = await site();
    let made = 0;
    B.customBrandDeps.plan = async () => ({ promesse: "Fait pour durer.", voix: "Simple.", menu: [], sections: [] });
    B.customBrandDeps.write = writer(CALM);
    B.customBrandDeps.photo = async () => { made++; return png(); };
    B.customBrandDeps.photoUnit = () => 50_000;
    G.galleryDeps.check = async (_i, _p, _t, key) => (/:s0000000a:/.test(key) ? PEOPLE : OK);
    try {
      const r = await job(`j-${Date.now()}-deux-refus`, { projectId: pid, capMicro: 10_000_000, photos: true, newPhotos: true });
      expect(made).toBe(3); // ouverture : une création et UNE reprise ; bande : une création
      expect(r.photosReprises).toBe(1);
      expect(r.photosFailed).toBe(1);
      expect(r.problems.join("\n")).toMatch(/photo hero\.jpg ratée au contrôle deux fois, reprise comprise \(une personne ou une main apparaît sans accord\) : non posée, à refaire avec ton accord/);
      // La photo d'exemple est encore dans le site enregistré…
      const t = S.loadCustomTheme(pid)!;
      expect(S.sectionHtml(t.pages[0].sections[0])).toContain("photos/hero.jpg");
      // … mais elle n'est jamais montrée : un cadre neutre, à la couleur douce de la marque, sans aucun mot.
      const p = loadProject(pid);
      const page = renderCustomTheme(p, t, { embed: true });
      const body = page.slice(page.indexOf('<div class="frame">'));
      expect(body).not.toMatch(/photos\/[\w.-]+\.(?:webp|png|jpe?g)/);
      expect(body).toContain(Lib.neutralFrame(p.brand?.palette));
    } finally { clean(); }
  });

  it("le plafond accordé ne permet pas la reprise : aucune nouvelle création, et c'est dit", async () => {
    const { pid } = await site();
    let made = 0;
    B.customBrandDeps.plan = async () => ({ promesse: "Fait pour durer.", voix: "Simple.", menu: [], sections: [] });
    B.customBrandDeps.write = writer(CALM);
    B.customBrandDeps.photo = async () => { made++; return png(); };
    G.galleryDeps.check = async (_i, _p, _t, key) => (/:s0000000a:/.test(key) ? PEOPLE : OK);
    try {
      // Plafond plus petit que le prix d'une photo et de son contrôle.
      B.customBrandDeps.photoUnit = () => 50_000;
      const tight = await job(`j-${Date.now()}-plafond`, { projectId: pid, capMicro: 40_000, photos: true, newPhotos: true });
      expect(made).toBe(2);
      expect(tight.photosReprises).toBe(0);
      expect(tight.photosFailed).toBe(1);
      expect(tight.problems.join("\n")).toMatch(/ratée au contrôle \(une personne ou une main apparaît sans accord ; reprise non tentée : le plafond accordé ne le permettait pas\)/);
    } finally { clean(); }
  });

  it("une erreur du fournisseur n'est jamais relancée, ni à la création, ni à la reprise", async () => {
    const { pid } = await site();
    const keys: string[] = [];
    B.customBrandDeps.plan = async () => ({ promesse: "Fait pour durer.", voix: "Simple.", menu: [], sections: [] });
    B.customBrandDeps.write = writer(CALM);
    B.customBrandDeps.photoUnit = () => 50_000;
    // Ouverture : la création échoue. Bande : la création passe, le contrôle refuse (une main), la reprise échoue.
    B.customBrandDeps.photo = async (_p, _r, _a, key) => { keys.push(key); if (/:photo:s0000000a:|:photo-retry:/.test(key)) throw new Error("fournisseur en panne"); return png(); };
    G.galleryDeps.check = async () => PEOPLE;
    try {
      const r = await job(`j-${Date.now()}-panne`, { projectId: pid, capMicro: 10_000_000, photos: true, newPhotos: true });
      expect(keys.map((k) => k.replace(/^.*?:(photo(?:-retry)?):(s\w+):.*$/, "$1 $2"))).toEqual(["photo s0000000a", "photo s0000000b", "photo-retry s0000000b"]);
      expect(r.photosMade).toBe(0);
      expect(r.problems.filter((x: string) => /non créée \(fournisseur en panne\)/.test(x))).toHaveLength(2);
    } finally { clean(); }
  });

  it("filet au rendu : une photo d'exemple n'est jamais montrée dans un site monté, même déjà enregistré ; un modèle pas encore monté garde ses exemples", async () => {
    const { pid } = await site();
    const p = loadProject(pid), t = S.loadCustomTheme(pid)!;
    const body = (html: string) => html.slice(html.indexOf('<div class="frame">'));
    // Avant le montage (aucune pièce écrite pour le client) : le modèle, avec ses exemples.
    expect(body(renderCustomTheme(p, t, { embed: true }))).toContain("photos/hero.jpg");
    // Site monté (une pièce écrite pour le client), enregistré avec des photos d'exemple restantes.
    t.pages[0].sections[0].clientTexts = true;
    const mounted = body(renderCustomTheme(p, t, { embed: true }));
    expect(mounted).not.toMatch(/photos\/[\w.-]+\.(?:webp|png|jpe?g)/);
    expect(mounted.split(Lib.neutralFrame(p.brand?.palette)).length - 1).toBeGreaterThanOrEqual(2); // l'ouverture et la bande
    // Le cadre : une image unie à la couleur douce de la marque, sans aucun mot.
    const svg = Buffer.from(Lib.neutralFrame({ light: "#FAFAF9", primary: "#C2410C" }).split(",")[1], "base64").toString();
    expect(svg).toContain(`fill="${Lib.softBrandColor({ light: "#FAFAF9", primary: "#C2410C" })}"`);
    expect(svg).not.toMatch(/<text/);
    expect(Lib.softBrandColor({ light: "#FAFAF9", primary: "#C2410C" })).toMatch(/^#f[0-9a-f]{5}$/); // proche du fond clair
    expect(Lib.softBrandColor(null)).toBe("#EEEAE3");
    expect(Lib.withoutExamplePhotos('<img src="photos/be-salon.jpg"><div style="background-image:url(./photos/hero.jpg)"></div><img src="/api/files/abc">', null)).toBe(`<img src="${Lib.neutralFrame(null)}"><div style="background-image:url(${Lib.neutralFrame(null)})"></div><img src="/api/files/abc">`);
    // Mise en boutique : la photo d'exemple ne part pas non plus (cadre neutre), et le contrôle le dit.
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/custom-theme/to-shopify.ts"), "utf8");
    expect(src).toMatch(/il reste une photo d'exemple \(aucune ne part en boutique\)[^\n]*withoutExamplePhotos\(out, c\.input\.palette\)/);
  });

  it("une pièce sans aucun texte (bande de photo) n'est plus signalée « aucun texte réécrit » ; une pièce à textes non réécrite l'est toujours", async () => {
    const { pid } = await site();
    B.customBrandDeps.plan = async () => ({ promesse: "Fait pour durer.", voix: "Simple.", menu: [], sections: [] });
    try {
      B.customBrandDeps.write = async () => ({ edits: [], links: [], photos: [] }); // le rédacteur ne réécrit rien
      const r = await job(`j-${Date.now()}-sans-texte`, { projectId: pid, capMicro: 10_000_000, photos: false });
      const lines = r.problems.filter((x: string) => /aucun texte réécrit/.test(x));
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(/^Ouverture à la tenue de la marque : aucun texte réécrit/);
      expect(r.problems.join("\n")).not.toMatch(/Bande de photo : aucun texte réécrit/);
      const t = S.loadCustomTheme(pid)!;
      expect(t.pages[0].sections[1].clientTexts).toBe(true); // rien à réécrire : plus « d'exemple »
      expect(t.pages[0].sections[0].clientTexts).toBe(false);
    } finally { clean(); }
  });

  it("relecture des photos : un texte trop long est coupé, une entrée mal formée est ignorée seule, le reste est gardé", async () => {
    const long = `Change de scène : ${"un autre lieu, un autre moment. ".repeat(40)}`;
    expect(long.length).toBeGreaterThan(400);
    const read = B.PhotoReviewSchema.parse({ site: "x".repeat(900), photos: [
      { uid: "s0000000a", find: "photos/hero.jpg", fixes: [long, "court", "Montre l'objet seul, sans décor chargé.", 12] },
      { uid: "s0000000b", find: "photos/infusion.jpg" }, // sans correction : ignorée seule
      { uid: 12, find: "photos/x.jpg", fixes: ["Change de point de vue."] }, // mal formée : ignorée seule
      "n'importe quoi",
      { uid: "s0000000b", find: "photos/infusion.jpg", fixes: ["a", "b", "Change de lumière, plus douce.", "Change de cadrage, plus large.", "Change de fond, plus calme.", "Change de moment, le soir.", "Une de trop, vraiment."] },
    ] });
    expect(read.site).toHaveLength(600);
    expect(read.photos.map((x) => x.uid)).toEqual(["s0000000a", "s0000000b"]);
    expect(read.photos[0].fixes).toEqual([long.trim().slice(0, 400), "Montre l'objet seul, sans décor chargé."]);
    expect(read.photos[1].fixes).toHaveLength(4);
    expect(B.PhotoReviewSchema.parse({})).toEqual({ photos: [], site: "" });
    expect(B.PhotoReviewSchema.parse({ photos: "rien", site: null })).toEqual({ photos: [], site: "" });
    // Le format envoyé au fournisseur ne refuse plus un texte long.
    expect(B.PhotoReviewWireSchema.safeParse({ site: "", photos: [{ uid: "s0000000a", find: "photos/hero.jpg", fixes: [long] }] }).success).toBe(true);

    // Dans le montage : la relecture n'est plus perdue, la description refusée est reprise.
    const { pid } = await site();
    let redescribed = 0;
    B.customBrandDeps.plan = async () => ({ promesse: "Fait pour durer.", voix: "Simple.", menu: [], sections: [] });
    B.customBrandDeps.write = writer(CALM);
    B.customBrandDeps.photo = async () => png();
    B.customBrandDeps.photoReview = async () => ({ site: "Séance tenue.", photos: [{ uid: "s0000000a", find: "photos/hero.jpg", fixes: [long] }, { uid: "s0000000b" }] }) as any;
    B.customBrandDeps.photoBrief = async (prompt) => { redescribed++; expect(prompt).toContain("CORRECTIONS EXIGÉES PAR LA DIRECTRICE ARTISTIQUE"); return { photos: [{ find: "photos/hero.jpg", description: `${CALM} Vue de dessus.`, ratio: "4:5" as const, product: null }] }; };
    try {
      const r = await job(`j-${Date.now()}-relecture`, { projectId: pid, capMicro: 10_000_000, photos: true, newPhotos: true });
      expect(r.problems.join("\n")).not.toMatch(/relecture des photos non faite/);
      expect(r.relecturePhotos).toMatchObject({ refusees: 1, reprises: 1, avis: "Séance tenue." });
      expect(redescribed).toBe(1);
    } finally { clean(); }
  });

  it("regard en image : une note absente vaut « inconnue », le reste de l'avis est gardé ; le format est donné au modèle", () => {
    const look = K.LookSchema.parse({ cliente: { comprend: true, envie: 8, saitOuToucher: true, avis: "On comprend tout de suite." }, directeurArtistique: { avis: "Beau et tenu." }, problemes: ["ouverture : le titre se lit mal sur la photo", "x", 4] });
    expect(look.directeurArtistique).toEqual({ note: null, avis: "Beau et tenu." });
    expect(look.cliente.envie).toBe(8);
    expect(look.problemes).toEqual(["ouverture : le titre se lit mal sur la photo"]);
    expect(K.LookSchema.parse({ cliente: { comprend: true, envie: "7,5", saitOuToucher: true }, directeurArtistique: { note: "8" } })).toMatchObject({ cliente: { envie: 7.5, avis: "" }, directeurArtistique: { note: 8 } });
    // Rien d'inventé : une note hors bornes ou illisible est inconnue, un avis entier absent aussi.
    expect(K.LookSchema.parse({ cliente: { envie: 12 }, problemes: null })).toEqual({ cliente: { comprend: null, envie: null, saitOuToucher: null, avis: "" }, directeurArtistique: { note: null, avis: "" }, problemes: [] });
    expect(K.LookSchema.parse({ cliente: { comprend: true, envie: 9, saitOuToucher: true, avis: "y".repeat(900) }, directeurArtistique: { note: 7, avis: "" } }).cliente.avis).toHaveLength(500);
    // Une compréhension ou une envie inconnue ne fabrique pas un reproche.
    expect(K.lookProblems("Accueil", K.LookSchema.parse({}))).toEqual([]);
    expect(K.lookProblems("Accueil", K.LookSchema.parse({ cliente: { comprend: false } }))[0]).toMatch(/on ne comprend pas en cinq secondes/);
    expect(K.LOOK_SYSTEM).toContain('{"cliente":{"comprend":true,"envie":0,"saitOuToucher":true,"avis":"…"},"directeurArtistique":{"note":0,"avis":"…"},"problemes":["…"]}');
  });

  it("regard en image dans le montage : une note absente ne le fait plus sauter ; une page en panne ne fait pas tomber l'autre ; l'échec est dit à part", async () => {
    const { pid } = await site();
    const t = S.loadCustomTheme(pid)!;
    t.pages.push({ key: "product", label: "Fiche produit", sections: [{ uid: "s0000000c", id: "tn-bande" }] } as any);
    S.saveCustomTheme(pid, t, { history: false });
    B.customBrandDeps.plan = async () => ({ promesse: "Fait pour durer.", voix: "Simple.", menu: [], sections: [] });
    B.customBrandDeps.write = writer(CALM);
    B.customBrandDeps.photo = async () => png();
    shotDeps.shoot = async () => Buffer.from("capture");
    try {
      // 1) Note du directeur artistique absente : le regard est gardé.
      B.customBrandDeps.look = async () => ({ cliente: { comprend: true, envie: 8, saitOuToucher: true, avis: "Clair." }, directeurArtistique: { avis: "Tenu." }, problemes: [] }) as any;
      const seen = await job(`j-${Date.now()}-note`, { projectId: pid, capMicro: 10_000_000, photos: true, newPhotos: true });
      expect(seen.regards.pages).toEqual([{ page: "Accueil", envie: 8, beau: null, avis: "Clair. Tenu." }, { page: "Fiche produit", envie: 8, beau: null, avis: "Clair. Tenu." }]);
      expect(seen.regardNonFait).toBeNull();
      expect(seen.problems.join("\n")).not.toMatch(/non regardée/);
      // 2) Une page en panne : l'autre est regardée, et c'est dit à part.
      S.saveCustomTheme(pid, S.loadCustomTheme(pid)!, { history: false }); // nouvelle version : nouvelles captures
      let n = 0;
      B.customBrandDeps.look = async () => { if (!n++) throw new Error("modèle indisponible"); return { cliente: { comprend: true, envie: 8, saitOuToucher: true, avis: "" }, directeurArtistique: { note: 8, avis: "" }, problemes: [] }; };
      const half = await job(`j-${Date.now()}-moitie`, { projectId: pid, capMicro: 10_000_000, photos: true, newPhotos: true });
      expect(half.regards.pages.map((x: any) => x.page)).toEqual(["Fiche produit"]);
      expect(half.regardNonFait).toMatch(/^une partie des pages n'a pas pu être regardée en image \(Accueil : modèle indisponible\)/);
      expect(half.problems.join("\n")).toMatch(/pages non regardées en image \(modèle indisponible\) : Accueil/);
      // 3) Tout en panne : « je n'ai pas pu regarder le site en image ».
      S.saveCustomTheme(pid, S.loadCustomTheme(pid)!, { history: false });
      B.customBrandDeps.look = async () => { throw new Error("modèle indisponible"); };
      const blind = await job(`j-${Date.now()}-panne`, { projectId: pid, capMicro: 10_000_000, photos: true, newPhotos: true });
      expect(blind.regards).toBeNull();
      expect(blind.regardNonFait).toMatch(/^je n'ai pas pu regarder le site en image \(/);
      // 4) Aucun navigateur : dit aussi.
      S.saveCustomTheme(pid, S.loadCustomTheme(pid)!, { history: false });
      shotDeps.shoot = async () => { throw new Error("pas de navigateur"); };
      const none = await job(`j-${Date.now()}-navigateur`, { projectId: pid, capMicro: 10_000_000, photos: true, newPhotos: true });
      expect(none.regardNonFait).toMatch(/^je n'ai pas pu regarder le site en image \(aucun navigateur/);
    } finally { clean(); }
  });

  it("compte rendu du site : « je n'ai pas pu regarder le site en image » est la première ligne, et la consigne de l'étape demande à SINA de le dire", async () => {
    const J = await import("@/lib/syna-agent/custom-theme/site-job");
    const { journeyOf, STEP_GUIDES } = await import("@/lib/syna-agent/journey") as any;
    const { pid, cid, ctx } = await site();
    const user = one<any>("SELECT user_id FROM projects WHERE id=?", pid).user_id as string;
    // Un site complet et valide, monté par l'outil du Studio (toutes les pages obligatoires d'une boutique).
    await call("theme.family", ctx, { family: "classique" });
    const composed = await call("custom.compose", ctx, { header: "En-tête classique", footer: "Pied de page complet", pages: [
      { key: "home", label: "Accueil", sections: ["Ouverture photo pleine", "Collection en vedette", "Histoire du produit au défilement", "Citation en grand", "Avis clients", "Grille bento", "Nos engagements", "Chiffres clés", "Texte qui s'allume en lisant", "Questions en bulles de discussion"] },
      { key: "shop", label: "Boutique", sections: ["Catalogue avec filtres et tri"] },
      { key: "product", label: "Fiche produit", sections: ["Produit vedette", "Points forts du produit", "Mode d'emploi en étapes", "Résumé des avis", "Questions sur le produit", "Fiche produit à onglets", "Badges de confiance", "Cartes qui s'empilent", "Comparatif « nous / les autres »", "Photo à points cliquables"] },
      { key: "cart", label: "Panier", sections: ["Page panier complète"] }, { key: "compte", label: "Mon compte", sections: ["Connexion et création de compte"] },
      { key: "about", label: "Notre histoire", sections: ["L'atelier et la personne derrière"] }, { key: "contact", label: "Contact", sections: ["Contact"] },
      { key: "aide", label: "Aide", sections: ["Suivi de commande et aide"] }, { key: "legal", label: "Informations légales", sections: ["Mentions et conditions"] }, { key: "404", label: "Page 404", sections: ["Page introuvable (404)"] },
    ] });
    expect(composed.ok, composed.summary).toBe(true);
    const designed = { ok: true as const, t: S.loadCustomTheme(pid)!, d: { concept: "Un site simple.", tenue: null }, left: [], result: { ok: true, summary: "" } };
    const runSite = async (id: string, montage: unknown) => {
      J.siteJobDeps.design = async () => designed as any;
      J.siteJobDeps.estimate = () => ({ maxMicro: 100_000, probableMicro: 50_000, label: "" });
      J.siteJobDeps.build = async () => montage;
      J.siteJobDeps.image = async () => ({ statut: "passe", avant: null, note: null, seuil: 48, compares: 0, nonCompares: 0, changements: [] });
      try { await fr(() => J.runSinaSiteJob({ job: { id }, payload: { projectId: pid, userId: user, conversationId: cid, runId: "r", capMicro: 10_000_000 }, checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any)); }
      finally { delete J.siteJobDeps.design; delete J.siteJobDeps.estimate; delete J.siteJobDeps.build; delete J.siteJobDeps.image; }
      return journeyOf(cid).site.report as Record<string, unknown>;
    };
    // Regard en panne, avec plus de douze autres problèmes : rien ne se perd, c'est dit en premier.
    const blind = await runSite(`s-${Date.now()}-a`, { sections: 2, photosReprises: 1, regards: null, regardNonFait: "je n'ai pas pu regarder le site en image (modèle indisponible)", problems: Array.from({ length: 20 }, (_x, i) => `point ${i}`) });
    expect(Object.keys(blind)[0]).toBe("siteNonRegarde");
    expect(blind.siteNonRegarde).toMatch(/^je n'ai pas pu regarder le site en image \(modèle indisponible\) : à dire au client en premier/);
    expect(JSON.stringify(blind).indexOf("siteNonRegarde")).toBeLessThan(40);
    expect((blind.montage as any).photosReprises).toBe(1);
    // Montage arrêté avant le regard (plafond atteint, par exemple) : dit aussi.
    const stopped = await runSite(`s-${Date.now()}-b`, { problems: ["plafond annoncé atteint : le montage s'est arrêté là"] });
    expect(stopped.siteNonRegarde).toMatch(/^je n'ai pas pu regarder le site en image/);
    // Regard fait : la ligne n'existe pas.
    const seen = await runSite(`s-${Date.now()}-c`, { regards: { pages: [{ page: "Accueil", envie: 8, beau: 8, avis: "" }], problemes: 0 }, regardNonFait: null, problems: [] });
    expect("siteNonRegarde" in seen).toBe(false);
    expect(STEP_GUIDES[6]).toMatch(/« siteNonRegarde »[^]*tu n'as PAS pu regarder le site en image[^]*dis-le-lui EN PREMIER[^]*ne dis jamais que tu l'as regardé/);
  });
});

describe("refaire le site : les photos déjà faites se reprennent, sans création ni paiement (18 novembre 2026)", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { saveAsset } = await import("@/lib/library");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const G = await import("@/lib/syna-agent/custom-theme/gallery");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const sharp = (await import("sharp")).default;
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  const png = () => sharp({ create: { width: 20, height: 20, channels: 3, background: "#888" } }).png().toBuffer();
  const CALM = "Photographie d'ambiance en plan serré, format vertical. Un outil posé sur un établi en bois clair, à côté de la pièce en cours. La scène contient exactement 2 objets.";

  it("la liste des photos déjà faites : numérotée, avec la marque à écrire, jamais sur un produit", () => {
    const brief = B.photothequeBrief([{ id: "a1", description: CALM }, { id: "a2", description: "Une bobine de fil sur du lin." }]);
    expect(brief).toMatch(/REPRENDRE R<numéro> :/);
    expect(brief).toMatch(/Chaque photo une seule fois sur tout le site ; jamais sur la photo d'un produit/);
    expect(brief).toContain("R2 : Une bobine de fil sur du lin.");
    expect(B.photothequeBrief([])).toBe("");
    expect(B.REPRISE_PHOTO.exec("REPRENDRE R12 : Un établi.")?.[1]).toBe("12");
    expect(B.REPRISE_PHOTO.test("Un établi en bois clair.")).toBe(false);
  });

  it("montage : la photo reprise est posée telle quelle, une seule fois ; l'autre place reçoit une photo créée", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}-${Math.random()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des objets faits à la main." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "1 objet" }, { field: "market", value: "France." },
      { field: "price", value: "25 €" }, { field: "difference", value: "Fait main." }, { field: "taste", status: "none" }, { field: "photos", value: "Non." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await (await import("./faits-fixtures")).avecLesFaitsDemandes(ctx, () => call("start.confirm", ctx, {}));
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    const old = await saveAsset({ projectId: pid, userId: user.id, data: await png(), name: "site-atelier.png", mime: "image/png", role: "site", origin: "generated", meta: { synaPhoto: { description: CALM, ratio: "4:5", direction: "custom", product: false } } } as any);
    S.saveCustomTheme(pid, { version: 1, family: "classique", style: "x", header: null, footer: null, search: null,
      pages: [{ key: "home", label: "Accueil", sections: [{ uid: "s0000000a", id: "tn-ouverture" }, { uid: "s0000000b", id: "tn-bande" }] }] } as any);
    let made = 0;
    B.customBrandDeps.plan = async () => ({ promesse: "Fait pour durer.", voix: "Simple.", menu: [], sections: [] });
    // Les deux rédacteurs demandent la même photo déjà faite : la seconde demande ne la reçoit pas (jamais deux fois).
    B.customBrandDeps.write = async (prompt: string) => {
      const html = prompt.slice(prompt.indexOf("HTML actuel"));
      return { edits: [], links: [], photos: [...new Set([...html.matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((x) => x[0]))].map((find) => ({ find, description: `REPRENDRE R1 : ${CALM}`, ratio: "4:5" as const, product: null })) };
    };
    B.customBrandDeps.photo = async () => { made++; return png(); };
    B.customBrandDeps.photoUnit = () => 50_000;
    G.galleryDeps.check = async () => ({ productMatches: true, productWhole: true, texts: [], extraText: [], people: false, notes: [] }) as any;
    try {
      const r: any = await fr(() => B.runCustomBrandJob({ job: { id: `j-${Date.now()}-reprise` }, payload: { projectId: pid, capMicro: 10_000_000, photos: true, newPhotos: true, phototheque: [{ id: old.id, description: CALM }] }, checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
      expect(r.photosReutilisees).toBe(1);
      expect(made).toBe(1);
      const html = S.allSections(S.loadCustomTheme(pid)!).map((x) => S.sectionHtml(x.s)).join("\n");
      expect(html.split(`/api/files/${old.id}`).length - 1).toBe(1);
    } finally { for (const k of ["plan", "write", "photo", "photoUnit"] as const) delete B.customBrandDeps[k]; delete G.galleryDeps.check; }
  });

  it("la création du site relève les photos et les textes du site d'avant, et le devis compte les photos reprises", async () => {
    const X = await import("@/lib/syna-agent/custom-theme/site-job");
    const T = await import("@/lib/syna-agent/custom-theme/tools");
    T.customPhotoDeps.unit = () => 150_000;
    try {
      const sans = X.siteQuote({ business: "products", products: 3 }), avec = X.siteQuote({ business: "products", products: 3 }, 30);
      expect(avec.probableMicro!).toBeLessThan(sans.probableMicro!);
      expect(X.PART_REPRISE).toBe(0.5);
    } finally { delete T.customPhotoDeps.unit; }
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/site-job.ts", "utf8");
    expect(src).toContain('const reprise = await ctx.step("site:reprise"');
    expect(src).toContain("phototheque: reprise.phototheque, matiere: reprise.matiere");
    const brand = fs.readFileSync("src/lib/syna-agent/custom-theme/brand.ts", "utf8");
    expect(brand).toContain("TEXTES DE SON SITE D'AVANT (matière");
  });
});
