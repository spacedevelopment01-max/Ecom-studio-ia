/**
 * SINA (#492), étape 6 : MAQUETTES EN CODE (décision du propriétaire du 8 novembre 2026). Lecture du fichier écrit par
 * Claude, photos nouvelles créées une fois et partagées, feuille commune posée par l'accueil, retouches par
 * remplacements exacts, devis, construction complète par l'outil mockup.generate et contrôle automatique sur la page
 * réelle (Chromium local). AUCUN appel réel : l'écriture, les photos et (sauf le dernier essai) les captures sont simulées.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

process.env.STUDIO_SYNA_AGENT = "1";

const png = (colour: string, w = 120, h = 240) => sharp({ create: { width: w, height: h, channels: 3, background: colour } }).png().toBuffer();

describe("SINA — maquettes en code : fichier, photos, retouches", async () => {
  const C = await import("@/lib/syna-agent/mockup-code/code-mockup");
  const { FONT_FILES } = await import("@/lib/theme/render");

  it("lecture : photos nouvelles déclarées, photos inconnues signalées, liens vers Internet retirés, plafond respecté", () => {
    const html = `<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=X"><style id="base">body{}</style></head><body>
<img data-photo="nouvelle-1" src="photos/nouvelle-1.jpg"><img data-photo="nouvelle-2" src="photos/nouvelle-2.jpg"><img data-photo="abc" src="photos/abc.jpg"><img data-photo="zzz" src="photos/zzz.jpg">
<script type="application/json" id="photos-nouvelles">[{"id":"nouvelle-1","ratio":"4:3","background":"#233A2E","product":true,"description":"Photo vue de dessus d'un tas de thé vert sur fond uni, lumière douce."},{"id":"nouvelle-2","ratio":"1:1","description":"Photo de face d'une tasse en verre posée sur une table en bois clair."},{"id":"nouvelle-9","ratio":"1:1","description":"Photo jamais utilisée dans la page, donc ignorée par la lecture."}]</script>
</body></html>`;
    const r = C.parseCodeMockup(html, new Set(["abc"]), 1);
    expect(r.html).not.toContain("googleapis");
    expect(r.html).not.toContain("photos-nouvelles");
    expect(r.newPhotos.map((x) => x.id)).toEqual(["nouvelle-1"]); // plafond : une seule photo nouvelle
    expect(r.newPhotos[0]).toMatchObject({ ratio: "4:3", background: "#233A2E", product: true });
    expect(r.problems.join(" | ")).toMatch(/2 photos nouvelles demandées pour 1 au plus/);
    expect(r.problems.join(" | ")).toMatch(/photo « zzz » inconnue/);
    expect(r.problems.join(" | ")).toMatch(/photo « nouvelle-2 » inconnue/);
    expect(C.parseCodeMockup("<!doctype html><html><body>", new Set(), 3).problems[0]).toMatch(/incomplet/);
    expect(r.html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">'); // ajoutée si absente
  });

  it("photos posées, feuille commune séparée, en-tête et pied repris, suites recollées", () => {
    const html = `<html><head><style id="base">:root{--a:#000}</style></head><body><header data-part="en-tête"><img data-logo src="logo.png"></header><img data-photo="nouvelle-1" src="photos/nouvelle-1.jpg"><footer data-part="pied de page">x</footer></body></html>`;
    const resolved = C.resolvePhotos(html, { "nouvelle-1": "asset42" });
    expect(resolved).toContain('data-photo="asset42" src="photos/asset42.jpg"');
    const s = C.splitBaseCss(resolved);
    expect(s.css).toBe(":root{--a:#000}");
    expect(s.html).toContain('<link rel="stylesheet" href="base.css">');
    expect(C.shellOf(s.html)).toMatch(/^<header[\s\S]*<\/footer>$/);
    expect(C.isComplete("<html></html>\n")).toBe(true);
    expect(C.continuationPrompt("<html>\n<body>", "CONSIGNE D'ORIGINE avec les textes")).toMatch(/^CONSIGNE D'ORIGINE avec les textes[\s\S]*<fin_du_fichier>\n<html>\n<body>\n<\/fin_du_fichier>/);
    expect(C.joinContinuation("<html>\n<body>\n<p>coup", "```html\n<p>coupé</p>\n</body></html>```")).toBe("<html>\n<body>\n<p>coupé</p>\n</body></html>");
  });

  it("retouche par remplacements exacts : un passage absent ou en double n'applique rien", () => {
    const html = "<h1>Un</h1><p>Deux</p><p>Deux</p>";
    expect(C.applyEdits(html, [{ find: "<h1>Un</h1>", replace: "<h1>Une</h1>" }])).toEqual({ html: "<h1>Une</h1><p>Deux</p><p>Deux</p>", failed: [] });
    const bad = C.applyEdits(html, [{ find: "<h1>Un</h1>", replace: "x" }, { find: "<p>Deux</p>", replace: "y" }]);
    expect(bad.html).toBe(html);
    expect(bad.failed[0]).toMatch(/plusieurs fois/);
    expect(C.applyEdits(html, [{ find: "absent", replace: "y" }]).failed[0]).toMatch(/introuvable/);
    // « $& » dans un remplacement n'est jamais interprété.
    expect(C.applyEdits("<b>a</b>", [{ find: "a", replace: "$&$&" }]).html).toBe("<b>$&$&</b>");
  });

  it("consigne : style, couleurs, polices locales, textes mot pour mot, règles du téléphone, feuille commune ensuite", async () => {
    const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
    const pages = mockupPages("products", "multi");
    const copy = { seo: { title: "t", description: "d" }, sections: [{ section: "ouverture (titre, photo, bouton)", title: "Pose ton écran.", text: null, button: "Choisis", items: [] }] };
    const base = { brand: { name: "Brindi", palette: { dark: "#233A2E", primary: "#3F6B4E", secondary: "#E3EDDF", accent: "#C9A04E", light: "#FFFFFF" }, personality: ["précis"] }, fonts: { heading: { family: "Cormorant Garamond", weight: 500 }, body: { family: "Karla", weights: [400, 600] } }, logo: { file: "logo.png", width: 600, height: 200 }, direction: { name: "Bandes vertes", style: "fond vert profond, vagues dorées", ground: "sombre" }, copy, lines: ["Dans la partie ouverture : titre « Pose ton écran. »."], phoneLines: [], photos: [{ id: "p1", description: "tasse", ratio: "4:3" }], maxNew: 4 };
    const home = C.codeMockupPrompt({ ...base, page: pages.find((p) => p.key === "home")! });
    // Consignes du propriétaire (8 novembre) : photo pleine en ouverture, jamais deux parties pareilles, aucun vide, thème vivant.
    for (const t of ["GRANDE PHOTO PLEINE", "JAMAIS deux parties de même disposition à la suite", "AUCUN VIDE", "UN THÈME VIVANT"]) expect(home).toContain(t);
    // Animations (8 novembre) : apparition au défilement, bouton vivant, contenu toujours visible sans JavaScript.
    for (const t of ["apparition au défilement", "halo doux qui pulse", "TOUJOURS visible sans JavaScript", "prefers-reduced-motion"]) expect(home).toContain(t);
    for (const t of ["« Bandes vertes »", "#C9A04E", "« Cormorant Garamond » (500)", "titre « Pose ton écran. »", "AUCUN bouton d'action", "Jamais trois éléments côte à côte", "- p1 (4:3) : tasse", "nouvelle-1", "<style id=\"base\">", "aucun lien vers Internet", "data-part"]) expect(home).toContain(t);
    const cart = C.codeMockupPrompt({ ...base, page: pages.find((p) => p.key === "cart")!, baseCss: ":root{--x:1}", shell: "<header>h</header>", maxNew: 0 });
    expect(cart).toContain("STRUCTURE IMPOSÉE DE CETTE PAGE : une vraie page panier");
    expect(cart).toContain("<base_css>\n:root{--x:1}\n</base_css>");
    expect(cart).toContain("À L'IDENTIQUE de l'accueil");
    expect(cart).toContain("Aucune photo nouvelle");
    expect(cart).not.toContain('<style id="base">');
    expect(cart).not.toContain("GRANDE PHOTO PLEINE"); // ouverture en photo : l'accueil seulement
  });

  it("polices de la marque → fichiers locaux ; consigne d'une photo nouvelle sans logo ni texte", () => {
    expect(C.fontOf("cormorant_garamond_n5", FONT_FILES)).toMatchObject({ family: "Cormorant Garamond", weight: 500 });
    expect(C.fontOf("inconnue_n4", FONT_FILES)).toBeNull();
    const fc = C.fontsCss(["karla"], FONT_FILES);
    expect(fc.css).toContain('font-family:"Karla"');
    expect(fc.files).toContain("Karla-400.ttf");
    const photo = C.codePhotoPrompt({ id: "nouvelle-1", description: "Photo vue de dessus d'un tas de thé.", ratio: "1:1", background: "#233A2E" }, { name: "Brindi", logo: false, product: false });
    expect(photo).toContain("couleur unie exacte #233A2E");
    expect(photo).toContain("Aucun logo, aucun nom de marque");
    expect(photo).toContain("aucune personne");
  });

  it("doublons de photos : deux fois dans la page ou déjà montrée ailleurs ; la carte du même produit est permise", () => {
    const home = `<img data-photo="a" data-product="Thé vert jasmin"><img data-photo="b"><img data-photo="c">`;
    expect(C.photoUses(home)).toEqual([{ id: "a", product: "Thé vert jasmin" }, { id: "b", product: null }, { id: "c", product: null }]);
    expect(C.duplicatePhotos(`<img src="x" data-photo="d"><img data-photo="d">`, [])).toEqual(["photo en double dans la page : d (2 fois)"]);
    expect(C.duplicatePhotos(`<img data-product="Thé vert jasmin" data-photo="a"><img data-photo="e">`, [{ page: "home", html: home }])).toEqual([]);
    expect(C.duplicatePhotos(`<img data-photo="a">`, [{ page: "home", html: home }])).toEqual(["photo déjà montrée sur la page « home » : a"]);
    expect(C.duplicatePhotos(`<img data-photo="b" data-product="Rooibos">`, [{ page: "home", html: home }])).toEqual(["photo déjà montrée sur la page « home » : b"]);
  });

  it("textes attendus : titres, textes, boutons et éléments de toutes les parties", () => {
    const t = C.expectedTexts({ seo: { title: "x", description: "y" }, sections: [{ section: "a", title: "T", text: null, button: "B", items: [{ title: "I", text: "J" }] }] });
    expect(t).toEqual(["T", "B", "I", "J"]);
  });
});

describe("SINA — maquettes en code : outils (écriture et photos simulées)", async () => {
  const { run, one, all } = await import("@/lib/db");
  const { account, project } = await import("./conversation209-fixtures");
  const { saveAsset } = await import("@/lib/library");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { setJsonSetting } = await import("@/lib/settings");
  const { mockupCodeTools, codeBuildDeps } = await import("@/lib/syna-agent/mockup-code/tools");
  const { loadMockupSet } = await import("@/lib/syna-agent/mockup-code/mockup-set");
  const { saveSiteCopy } = await import("@/lib/syna-agent/mockup-code/copy");
  const { loadDirectionCode, photoLibrary } = await import("@/lib/syna-agent/mockup-code/code-build");
  const tool = (n: string) => mockupCodeTools.find((t) => t.name === n)!;
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = (n: string, ctx: any, args: unknown) => fr(() => tool(n).run(ctx, tool(n).args.parse(args)));

  const homeCopy = { seo: { title: "Brindi", description: "Thés." }, sections: [
    { section: "en-tête (logo, menu, bouton principal)", title: null, text: null, button: "Choisis ton mélange", items: [{ title: "Nos mélanges", text: null }] },
    { section: "ouverture (titre, photo, bouton)", title: "Pose ton écran.", text: "Chaque brin choisi.", button: "Choisis ton mélange", items: [] },
  ] };
  const page = (photo: string, extra = "") => `<!doctype html><html><head><link rel="stylesheet" href="fonts.css"><style id="base">:root{--dark:#233A2E}</style></head><body>
<header data-part="en-tête"><img data-logo src="logo.png" alt="Brindi"><nav>Nos mélanges</nav><a>Choisis ton mélange</a></header>
<section data-part="ouverture"><h1>Pose ton écran.</h1><p>Chaque brin choisi.</p><img data-photo="${photo}" src="photos/${photo}.jpg">${extra}</section>
<footer data-part="pied de page"><img data-logo src="logo.png" alt="Brindi"></footer>
${photo.startsWith("nouvelle") ? `<script type="application/json" id="photos-nouvelles">[{"id":"${photo}","ratio":"16:9","background":null,"description":"Photo de face d'une tasse en verre remplie d'une infusion dorée, sur fond vert uni."}]</script>` : ""}
</body></html>`;

  async function ready() {
    setJsonSetting("syna.mockup.mode", "code");
    const user = await account();
    const pid = project(user);
    const logo = await saveAsset({ projectId: pid, userId: user.id, data: await png("#233A2E", 300, 100), name: "logo.png", mime: "image/png", role: "logo", origin: "generated" } as any);
    run("UPDATE projects SET brand_json=? WHERE id=?", JSON.stringify({ name: "Brindi", nameStatus: "validated", tagline: "Chaque brin choisi.", palette: { dark: "#233A2E", primary: "#3F6B4E", secondary: "#E3EDDF", accent: "#C9A04E", light: "#FFFFFF" }, fonts: { heading: "cormorant_garamond_n5", body: "karla_n4" }, ground: "blanc", paletteRoles: "sina-2026", logo: { concept: "", status: "validated", assetId: logo.id }, alternatives: [], positioning: "", audience: "", personality: ["précis"], tone: { voice: "", do: [], dont: [] }, story: "", values: [], direction: "souple", validated: [], generatedBy: "ai" }), pid);
    const ctx: any = { user, projectId: pid, conversationId: "fil-inexistant", runId: "run-code", attachment: () => null };
    return { user, pid, ctx };
  }

  it("préparation en code (gratuite), devis de l'accueil, textes exigés, puis construction : photo créée une fois et partagée", async () => {
    const { user, pid, ctx } = await ready();
    codeBuildDeps.photoUnit = () => 100_000;
    const prep = await call("mockup.prepare", ctx, { directions: [{ name: "Bandes vertes", style: "fond vert profond", ground: "sombre" }, { name: "Clair", style: "fond blanc", ground: "clair" }] });
    expect(prep.ok, prep.summary).toBe(true);
    expect(prep.summary).toMatch(/en code/);
    expect((prep.data as any).accueilProbableMicro).toBeGreaterThan(0);
    const set0 = loadMockupSet(pid)!;
    expect(set0.directions.every((d) => d.mode === "code")).toBe(true);
    const homeImgs = set0.directions[0].images.filter((i) => i.pages[0] === "home");
    expect(homeImgs.map((i) => i.viewport).sort()).toEqual(["desktop", "phone"]); // une capture par version
    expect(set0.directions[0].images.every((i) => i.pages.length === 1)).toBe(true);
    // Sans textes : refus (rien de payant).
    await expect(fr(() => tool("mockup.generate").estimate!(ctx, { direction: "A" }))).rejects.toThrow(/Textes à écrire d'abord/);
    saveSiteCopy(pid, { version: 1, angleId: null, pages: { home: homeCopy, cart: homeCopy }, at: 0 });
    // Autre page avant l'accueil : refus.
    await expect(fr(() => tool("mockup.generate").estimate!(ctx, { direction: "A", pages: ["cart"] }))).rejects.toThrow(/accueil de cette maquette doit être construit d'abord/);
    const est = await fr(() => tool("mockup.generate").estimate!(ctx, { direction: "A" }));
    expect(est.probableMicro).toBeGreaterThan(0);
    expect(est.maxMicro).toBeGreaterThan(est.probableMicro!);
    expect(est.label).toMatch(/Accueil/);

    const prompts: string[] = [];
    let inspections = 0, photos = 0;
    codeBuildDeps.deps = {
      writeHtml: async (prompt) => { prompts.push(prompt); return prompts.length === 1 ? page("nouvelle-1", "<p>Livraison offerte</p>") : page(photoLibrary(pid)[0].id); },
      fixEdits: async (prompt) => { expect(prompt).toContain("texte ajouté : « Livraison offerte »"); return [{ find: "<p>Livraison offerte</p>", replace: "" }]; },
      makePhoto: async (ph) => { photos++; expect(ph.ratio).toBe("16:9"); return png("#C9A04E", 320, 180); },
      inspect: async (files) => { inspections++; expect(files.fontFiles.length).toBeGreaterThan(0); expect(Object.keys(files.photos)).toHaveLength(1); return { shots: { desktop: await png("#FFFFFF", 144, 300), phone: await png("#FFFFFF", 39, 300) }, problems: files.html.includes("Livraison offerte") ? ["texte ajouté : « Livraison offerte »"] : [], toVerify: [] }; },
    };
    try {
      const r = await call("mockup.generate", ctx, { direction: "A" });
      expect(r.ok, r.summary).toBe(true);
      expect(r.summary).toMatch(/1 photo\(s\) nouvelle\(s\) créée\(s\)/);
      expect(r.summary).toMatch(/une correction automatique faite/);
      expect(inspections).toBe(2); // contrôle, correction, nouveau contrôle
      const lib = photoLibrary(pid);
      expect(lib).toHaveLength(1);
      expect(lib[0].description).toMatch(/tasse en verre/);
      const code = loadDirectionCode(pid, "A");
      expect(code.base).toBe(":root{--dark:#233A2E}");
      expect(code.pages.home.html).toContain('href="base.css"');
      expect(code.pages.home.html).toContain(`data-photo="${lib[0].id}"`);
      expect(code.pages.home.html).not.toContain("Livraison offerte");
      expect(code.shell).toMatch(/<header/);
      const set = loadMockupSet(pid)!;
      const ready = set.directions[0].images.filter((i) => i.status === "ready");
      expect(ready.map((i) => i.viewport).sort()).toEqual(["desktop", "phone"]);
      expect(ready.every((i) => i.check?.ok)).toBe(true);
      expect((r.data as any).mockups).toHaveLength(2);
      // Déjà construite : refus sans redo.
      await expect(fr(() => tool("mockup.generate").estimate!(ctx, { direction: "A", pages: ["home"] }))).rejects.toThrow(/déjà construites/);
      // Maquette B : la photo déjà faite est proposée, aucune nouvelle photo créée.
      const rb = await call("mockup.generate", ctx, { direction: "B" });
      expect(rb.ok, rb.summary).toBe(true);
      expect(prompts[1]).toContain(`- ${lib[0].id} (`);
      expect(photos).toBe(1);
      expect(rb.summary).toMatch(/aucune photo nouvelle/);
      // Page suivante de A : la feuille commune et l'en-tête de l'accueil sont fournis.
      // Consigne du propriétaire : jamais une photo en double ; la photo de l'accueil n'est plus proposée au panier, et
      // le panier qui la reprend quand même est RATÉ (la correction automatique ne trouve aucune photo libre ici).
      codeBuildDeps.deps!.fixEdits = async (prompt) => { expect(prompt).toContain(`photo déjà montrée sur la page « home » : ${lib[0].id}`); return []; };
      const rc = await call("mockup.generate", ctx, { direction: "A", pages: ["cart"] });
      expect(rc.ok).toBe(false);
      expect(rc.summary).toMatch(/RATÉE au contrôle automatique \(photo déjà montrée sur la page « home »/);
      expect(prompts[2]).toContain("<base_css>\n:root{--dark:#233A2E}\n</base_css>");
      expect(prompts[2]).toContain("<entete_et_pied_de_l_accueil>");
      expect(prompts[2]).toContain("JAMAIS UNE PHOTO EN DOUBLE");
      expect(prompts[2].split("Photos disponibles")[1].split("\n")[1]).toBe("(aucune pour l'instant)");
      // Panier raté retiré pour la suite de l'essai (sinon l'accueil aurait lui aussi une photo déjà montrée ailleurs).
      const { saveDirectionCode } = await import("@/lib/syna-agent/mockup-code/code-build");
      const cA = loadDirectionCode(pid, "A");
      delete cA.pages.cart;
      saveDirectionCode(pid, "A", cA);
      expect(one<any>("SELECT COUNT(*) n FROM assets WHERE project_id=? AND role='mockup'", pid).n).toBe(6);
      const deps0 = codeBuildDeps.deps!;
      codeBuildDeps.deps = { ...deps0 };
      // Retouche d'un détail : seulement le passage demandé change ; une retouche qui ajoute un défaut n'est pas gardée.
      const homeA = loadMockupSet(pid)!.directions.find((x) => x.key === "A")!.images.find((i) => i.pages[0] === "home" && i.viewport === "phone")!;
      const est2 = await fr(() => tool("mockup.edit").estimate!(ctx, { direction: "A", imageId: homeA.id, changes: [{ zone: "ouverture", change: "titre plus grand" }] }));
      expect(est2.probableMicro).toBeGreaterThan(0);
      codeBuildDeps.deps!.fixEdits = async (prompt) => { expect(prompt).toContain("Quoi : titre plus grand"); expect(prompt).toContain(":root{--dark:#233A2E}"); return [{ find: ":root{--dark:#233A2E}", replace: ":root{--dark:#233A2E}h1{font-size:4rem}" }]; };
      const ed = await call("mockup.edit", ctx, { direction: "A", imageId: homeA.id, changes: [{ zone: "ouverture", change: "titre plus grand" }] });
      expect(ed.ok, ed.summary).toBe(true);
      expect(loadDirectionCode(pid, "A").base).toBe(":root{--dark:#233A2E}h1{font-size:4rem}");
      codeBuildDeps.deps!.fixEdits = async () => [{ find: "<h1>Pose ton écran.</h1>", replace: "<h1>Pose ton écran.</h1><p>Livraison offerte</p>" }];
      const bad = await call("mockup.edit", ctx, { direction: "A", imageId: homeA.id, changes: [{ zone: "ouverture", change: "ajoute la livraison" }] });
      expect(bad.ok).toBe(false);
      expect(bad.summary).toMatch(/RATÉE au contrôle automatique, non gardée/);
      expect(loadDirectionCode(pid, "A").pages.home.html).not.toContain("Livraison offerte");
      // Texte corrigé par le client (gratuit) : reporté dans les pages construites, sans IA.
      const ce = await call("mockup.copy_edit", ctx, { page: "home", find: "Pose ton écran.", replace: "Pose ton téléphone." });
      expect(ce.ok, ce.summary).toBe(true);
      expect(loadDirectionCode(pid, "A").pages.home.html).toContain("<h1>Pose ton téléphone.</h1>");
      expect(loadDirectionCode(pid, "B").pages.home.html).toContain("<h1>Pose ton téléphone.</h1>");
      expect(ce.hint).toMatch(/maquettes en code A, B/);
      // Choix sur l'accueil construit (les autres pages ensuite, pour la seule maquette choisie).
      const ch = await call("mockup.choose", ctx, { direction: "B" });
      expect(ch.ok, ch.summary).toBe(true);
      expect(ch.summary).toMatch(/Pages principales encore à construire dans ce style/);
      expect(loadMockupSet(pid)!.chosen).toBe("B");
      void user; void all;
    } finally { codeBuildDeps.deps = undefined; codeBuildDeps.photoUnit = undefined; }
  });

  it("photos déjà payées de l'ancienne méthode réutilisables ; une maquette en code ne reprend pas les images d'une maquette en images", async () => {
    const { pid, ctx } = await ready();
    const { saveAsset } = await import("@/lib/library");
    await saveAsset({ projectId: pid, userId: ctx.user.id, data: await png("#C9A04E", 300, 200), name: "site-home-1.png", mime: "image/png", role: "site", origin: "generated", meta: { synaSiteImage: { page: "home", type: "es-custom-x", index: 0, description: "Tasse en verre d'infusion dorée" } } } as any);
    expect(photoLibrary(pid).map((x) => x.description)).toEqual(["Tasse en verre d'infusion dorée"]);
    // Photo ratée écartée pour toujours (gratuit) : plus jamais proposée.
    const rej = await call("site.photo_reject", ctx, { assetIds: [photoLibrary(pid)[0].id], reason: "« Brindi » écrit sur la tasse" });
    expect(rej.ok, rej.summary).toBe(true);
    expect(photoLibrary(pid)).toEqual([]);
    setJsonSetting("syna.mockup.mode", "image");
    await call("mockup.prepare", ctx, { directions: [{ name: "Bandes vertes", style: "fond vert profond" }] });
    const old = loadMockupSet(pid)!;
    const img = old.directions[0].images.find((i) => i.viewport === "desktop" && i.pages.includes("home"))!;
    const { saveMockupSet } = await import("@/lib/syna-agent/mockup-code/mockup-set");
    saveMockupSet(pid, { ...old, directions: old.directions.map((d) => ({ ...d, images: d.images.map((i) => (i.id === img.id ? { ...i, status: "ready" as const, assetId: "ancienne-image" } : i)) })) });
    setJsonSetting("syna.mockup.mode", "code");
    await call("mockup.prepare", ctx, { directions: [{ name: "Bandes vertes", style: "fond vert profond" }] });
    const d = loadMockupSet(pid)!.directions[0];
    expect(d.mode).toBe("code");
    expect(d.images.every((i) => i.status === "planned")).toBe(true);
  });

  it("photo non créée : gardée en attente, puis créée plus tard sans réécrire la page", async () => {
    const { pid, ctx } = await ready();
    codeBuildDeps.photoUnit = () => 100_000;
    await call("mockup.prepare", ctx, { directions: [{ name: "Bandes vertes", style: "fond vert profond" }] });
    saveSiteCopy(pid, { version: 1, angleId: null, pages: { home: homeCopy }, at: 0 });
    let writes = 0, fail = true;
    codeBuildDeps.deps = {
      writeHtml: async () => { writes++; return page("nouvelle-1"); },
      fixEdits: async () => [],
      makePhoto: async () => { if (fail) throw new Error("Aucun fournisseur d'images configuré"); return png("#C9A04E", 320, 180); },
      inspect: async (files) => ({ shots: { desktop: await png("#FFFFFF", 144, 300), phone: await png("#FFFFFF", 39, 300) }, problems: files.html.includes('data-photo="nouvelle-1"') ? ["ordinateur : image non chargée : nouvelle-1"] : [], toVerify: [] }),
    };
    try {
      const r = await call("mockup.generate", ctx, { direction: "A" });
      expect(r.ok).toBe(false);
      expect(r.summary).toMatch(/1 photo\(s\) non créée\(s\) .*gardées en attente/);
      expect(loadDirectionCode(pid, "A").pending?.home).toHaveLength(1);
      const est = await fr(() => tool("mockup.generate").estimate!(ctx, { direction: "A" }));
      expect(est.probableMicro).toBe(75_000); // une photo, rien d'autre
      fail = false;
      const r2 = await call("mockup.generate", ctx, { direction: "A" });
      expect(r2.ok, r2.summary).toBe(true);
      expect(writes).toBe(1); // la page n'est pas réécrite
      const code = loadDirectionCode(pid, "A");
      expect(code.pending?.home).toBeUndefined();
      expect(code.pages.home.html).not.toContain("nouvelle-1");
      expect(code.base).toBe(":root{--dark:#233A2E}");
    } finally { codeBuildDeps.deps = undefined; codeBuildDeps.photoUnit = undefined; }
  });

  it("photos à bandes blanches : repérées, recadrées sans IA, l'ancienne écartée, les pages reprises", async () => {
    const { pid, ctx } = await ready();
    const { saveAsset } = await import("@/lib/library");
    const { trimPhotoBands, photoBands } = await import("@/lib/syna-agent/mockup-code/code-build");
    // Photo 300×200 : bandes blanches de 40 px en haut et en bas autour d'un fond vert d'eau avec un objet sombre.
    const inner = await sharp({ create: { width: 300, height: 120, channels: 3, background: "#E3EDDF" } }).composite([{ input: await png("#233A2E", 60, 60), left: 120, top: 30 }]).png().toBuffer();
    const banded = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#FFFFFF" } }).composite([{ input: inner, left: 0, top: 40 }]).png().toBuffer();
    expect(await photoBands(banded)).toMatchObject({ top: 40, bottom: 40, left: 0, right: 0 });
    const t = await sharp(await trimPhotoBands(banded)).metadata();
    expect([t.width, t.height]).toEqual([300, 116]);
    // Fond clair teinté (packshot) ou objet sur fond blanc : jamais recadré.
    const packshot = await sharp({ create: { width: 200, height: 200, channels: 3, background: "#FFFFFF" } }).composite([{ input: await png("#233A2E", 80, 80), left: 60, top: 60 }]).png().toBuffer();
    expect(await photoBands(packshot)).toMatchObject({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(await trimPhotoBands(packshot)).toBe(packshot);
    expect(await trimPhotoBands(inner)).toBe(inner);
    const a = await saveAsset({ projectId: pid, userId: ctx.user.id, data: banded, name: "journal.png", mime: "image/png", role: "site", origin: "generated", meta: { synaSiteImage: { page: "home", type: "x", index: 0, description: "Tas de thé" } } } as any);
    const { saveDirectionCode } = await import("@/lib/syna-agent/mockup-code/code-build");
    saveDirectionCode(pid, "A", { base: null, shell: null, pages: { home: { html: `<img data-photo="${a.id}" src="photos/${a.id}.jpg">`, at: 1 } } });
    const r = await call("mockup.photos_check", ctx, {});
    expect(r.summary).toMatch(/1 photo\(s\) à bandes blanches recadrée\(s\)/);
    const lib = photoLibrary(pid);
    expect(lib.map((x) => x.id)).not.toContain(a.id);
    expect(lib).toHaveLength(1);
    expect(loadDirectionCode(pid, "A").pages.home.html).toContain(lib[0].id);
    expect((await call("mockup.photos_check", ctx, {})).summary).toMatch(/Aucune photo à bandes blanches/);
  });

  it("page coupée même après deux suites : rien n'est gardé, aucune photo créée", async () => {
    const { pid, ctx } = await ready();
    codeBuildDeps.photoUnit = () => 100_000;
    await call("mockup.prepare", ctx, { directions: [{ name: "Bandes vertes", style: "fond vert profond" }] });
    saveSiteCopy(pid, { version: 1, angleId: null, pages: { home: homeCopy }, at: 0 });
    let writes = 0, photos = 0;
    codeBuildDeps.deps = { writeHtml: async () => { writes++; return "<!doctype html><html><body><p>début"; }, fixEdits: async () => [], makePhoto: async () => { photos++; return png("#000"); }, inspect: async () => ({ shots: null, problems: [], toVerify: [] }) };
    try {
      const r = await call("mockup.generate", ctx, { direction: "A" });
      expect(r.ok).toBe(false);
      expect(r.summary).toMatch(/s'arrête avant la fin/);
      expect(writes).toBe(3);
      expect(photos).toBe(0);
      expect(loadDirectionCode(pid, "A").pages.home).toBeUndefined();
    } finally { codeBuildDeps.deps = undefined; codeBuildDeps.photoUnit = undefined; }
  });
});

describe("SINA — maquettes en code : contrôle sur la page réelle (Chromium local)", async () => {
  const C = await import("@/lib/syna-agent/mockup-code/code-mockup");
  const { FONT_FILES } = await import("@/lib/theme/render");
  const { chromiumPath } = await import("@/lib/theme/snapshot");
  const chromium = chromiumPath();

  it.skipIf(!chromium)("texte ajouté, texte manquant, bouton dans l'en-tête du téléphone, trois cartes côte à côte, débordement", async () => {
    const fc = C.fontsCss(["karla"], FONT_FILES);
    const fontFiles = fc.files.map((n) => ({ name: n, data: fs.readFileSync(path.join(process.cwd(), "assets", "fonts", n)) }));
    const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="fonts.css"><style>body{margin:0;font-family:Karla}.row{display:flex;gap:8px}.row>div{width:100px;height:100px;background:#ccc}.wide{width:700px;height:10px}</style></head><body>
<header data-part="en-tête"><img data-logo src="logo.png" alt="Brindi" width="60" height="20"><a href="#">Choisis ton mélange</a></header>
<footer data-part="pied de page"><img data-logo src="logo.png" alt="Brindi" style="width:300px;height:20px"></footer>
<section data-part="vide" style="height:400px"><p style="margin:0">Pose ton écran.</p></section>
<section data-part="détails"><h1>Pose ton écran.</h1><p>Texte inventé par le modèle</p><div class="row"><div></div><div></div><div></div></div><div class="wide"></div><div data-gallery><div class="row"><div></div><div></div><div></div></div></div><img data-photo="p1" src="photos/p1.jpg" width="80" height="60"></section>
</body></html>`;
    const r = await C.inspectCodeMockup({ html, fontsCss: fc.css, fontFiles, logo: { name: "logo.png", data: await png("#233A2E", 60, 20) }, photos: { p1: await png("#C9A04E", 80, 60) } }, { texts: ["Pose ton écran.", "Choisis ton mélange", "Texte absent de la page"], allowed: ["Brindi"] }, chromium);
    const all = r.problems.join(" | ");
    if (process.env.DEBUG_INSPECT) console.log(all);
    expect(r.shots?.desktop.length).toBeGreaterThan(1000);
    expect(r.shots?.phone.length).toBeGreaterThan(1000);
    expect(all).toContain("texte ajouté : « Texte inventé par le modèle »");
    expect(all).toContain("texte manquant : « Texte absent de la page »");
    expect(all).toContain("téléphone : bouton ou lien visible dans l'en-tête : « Choisis ton mélange »");
    expect(all).toContain("téléphone : 3 éléments côte à côte dans la partie « détails »");
    expect(all).toMatch(/téléphone : la page déborde sur le côté \(\d+ px pour 390 px\)/);
    expect(all).not.toMatch(/ordinateur : [^|]*côte à côte/); // trois cartes de front : permis sur ordinateur
    expect(all).toMatch(/logo déformé dans la partie « pied de page » \(300×20 px pour des proportions de 60×20\)/);
    expect(all).not.toMatch(/logo déformé dans la partie « en-tête »/);
    expect(all).toMatch(/ordinateur : trop d'espace vide dans la partie « vide » \(\d+ px sans rien\)/);
    expect(all).not.toContain("image non chargée");
    expect(all).not.toContain("logo absent");
    expect(all.match(/texte ajouté/g)).toHaveLength(1); // dit une seule fois pour les deux largeurs
  }, 60_000);
});
