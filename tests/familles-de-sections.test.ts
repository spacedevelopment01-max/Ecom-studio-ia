import { describe, expect, it } from "vitest";
import { sectionLibrary } from "../src/lib/syna-agent/custom-theme/library";
import { SECTION_GROUPS, sectionGroup } from "../src/lib/syna-agent/custom-theme/section-groups";

// Demande du propriétaire du 10 novembre 2026 : les sections réunies par famille (l'en-tête avec l'en-tête…).
describe("familles de sections", () => {
  it("chaque section de la bibliothèque appartient à une famille connue", () => {
    const ids = new Set(SECTION_GROUPS.map((g) => g.id));
    const sans = sectionLibrary().sections.filter((s) => !s.demoFrame && !ids.has(sectionGroup(s) as never)).map((s) => s.id);
    expect(sans).toEqual([]);
  });
  it("les familles clés de l'accueil ont des sections dans les deux styles", () => {
    const n = (g: string, f: string) => sectionLibrary().sections.filter((s) => !s.demoFrame && sectionGroup(s) === g && s.family === f).length;
    for (const g of ["en-tete", "ouverture", "pied-de-page"]) for (const f of ["classique", "moderne"]) expect(n(g, f)).toBeGreaterThan(0);
  });
});

describe("atelier du thème (demande du propriétaire du 11 novembre 2026 : toutes les sections, sans barres de boutons)", () => {
  it("pose TOUTES les sections de la banque de la famille, avec ce qui empêche certaines d'être posées telles quelles", async () => {
    const { builderTheme } = await import("../src/lib/syna-agent/custom-theme/builder");
    const { FAKE_OFFER_SECTIONS, RETIRED_SECTIONS, sectionLibrary } = await import("../src/lib/syna-agent/custom-theme/library");
    const t: any = { version: 1, family: "classique", style: "", header: null, footer: null, search: null, pages: [] };
    const { theme, slots, start } = builderTheme(t);
    expect(theme.pages).toHaveLength(1);
    const bank = sectionLibrary().sections.filter((s) => s.family === "classique" && !RETIRED_SECTIONS[s.id] && sectionGroup(s) !== "metiers");
    expect(slots.map((s) => s.id).sort()).toEqual(bank.map((s) => s.id).sort());
    for (const s of slots.filter((x) => FAKE_OFFER_SECTIONS[x.id])) expect(s.note).toMatch(/fausse offre/);
    expect(start.header && slots.find((s) => s.uid === start.header)!.group).toBe("en-tete");
    expect(start.footer && slots.find((s) => s.uid === start.footer)!.group).toBe("pied-de-page");
  });
  it("part de la composition du thème (toutes ses pages, en-tête et pied de page communs)", async () => {
    const { builderTheme } = await import("../src/lib/syna-agent/custom-theme/builder");
    const t: any = { version: 1, family: "classique", style: "", header: { uid: "h", id: "en-tete-au-logo-centre" }, footer: { uid: "f", id: "pied-de-page-complet" }, search: null,
      pages: [{ key: "home", label: "Accueil", sections: [{ uid: "a", id: "badges-de-confiance" }, { uid: "b", id: "avis-clients" }] }, { key: "aide", label: "Aide", sections: [{ uid: "c", id: "questions-avec-recherche" }] }] };
    const { slots, start } = builderTheme(t);
    const idOf = (u: string | null) => slots.find((s) => s.uid === u)?.id;
    expect(start.pages.map((p) => p.key)).toEqual(["home", "aide"]);
    expect(start.pages[0].uids.map(idOf)).toEqual(["badges-de-confiance", "avis-clients"]);
    expect(idOf(start.header)).toBe("en-tete-au-logo-centre");
    expect(idOf(start.footer)).toBe("pied-de-page-complet");
  });
  it("un panneau sur le côté remplace les barres de boutons posées sur les sections", async () => {
    const { builderAssets } = await import("../src/lib/syna-agent/custom-theme/builder");
    const { js, css } = builderAssets([]);
    for (const t of ["Atelier du thème", "Remplacer par", "+ Ajouter une section", "Disposition", "Annuler", "Repartir du thème", "draggable"]) expect(js).toContain(t);
    expect(js).not.toContain("Changer cette section");
    expect(css).toContain(".at-side");
    expect(() => new Function(js)).not.toThrow();
  });
});

describe("sections retirées par le propriétaire (revue du 10 novembre 2026)", () => {
  it("ne sont plus proposées ni dans la banque, mais restent lisibles", async () => {
    const { familySections, RETIRED_SECTIONS, libSection } = await import("../src/lib/syna-agent/custom-theme/library");
    const { catalogTheme } = await import("../src/lib/syna-agent/custom-theme/builder");
    for (const f of ["classique", "moderne"] as const) expect(familySections(f).filter((s) => RETIRED_SECTIONS[s.id])).toEqual([]);
    const t: any = { version: 1, family: "classique", style: "", header: null, footer: null, search: null, pages: [] };
    const { items } = catalogTheme(t, "classique");
    expect(items.filter((x) => RETIRED_SECTIONS[x.id] || x.group === "metiers")).toEqual([]);
    expect(libSection("ouverture-en-mosaique")).toBeTruthy();
    expect(items.some((x) => x.id === "note-et-avis-en-bandeau" && x.group === "preuves")).toBe(true);
  });
});

describe("corrections de la revue du propriétaire (lot 2)", () => {
  it("sont présentes dans la banque (HTML, feuille et script)", async () => {
    const fs = await import("node:fs");
    const { libSection } = await import("../src/lib/syna-agent/custom-theme/library");
    expect(libSection("ils-parlent-de-nous")!.html).not.toContain("data-pq");
    expect(libSection("avant-apres")!.html).toContain("ba-sec");
    expect(libSection("avant-apres")!.html).toContain("<b>Avant</b>");
    expect(libSection("histoire-du-produit-au-defilement")!.html).toContain("p2-cta");
    const css = fs.readFileSync("public/sections/library.css", "utf8");
    expect(css.split("revue du propriétaire (10 novembre 2026)").length).toBe(2); // une seule fois
    expect(fs.readFileSync("public/sections/library.js", "utf8")).toContain('if(!$(".pqf",p))return;');
  });
});

describe("sections refaites de la revue (lot 3, famille Confiance)", () => {
  it("badges en cartes douces, avis en bandeau qui défile, engagements avec photo par promesse", async () => {
    const fs = await import("node:fs");
    const { libSection } = await import("../src/lib/syna-agent/custom-theme/library");
    const badges = libSection("badges-de-confiance")!.html;
    expect(badges).toContain("rv-bdg");
    expect(badges.match(/class="rv-bdg-c"/g)!.length).toBe(4);
    const avis = libSection("avis-clients")!.html;
    expect(avis).toContain("data-rv-car");
    expect(avis).toContain("Lire tous les avis");
    expect(avis.match(/<article class="rv-rc">/g)!.length).toBeGreaterThanOrEqual(6); // 5 ou 6 visibles sur ordinateur, puis défilement
    expect(libSection("nos-engagements")!.html).toContain("rv-eng");
    const css = fs.readFileSync("public/sections/library.css", "utf8");
    expect(css).toContain(".rv-rev-note>span{"); // les étoiles restent en ligne
    const js = fs.readFileSync("public/sections/library.js", "utf8");
    expect(js.split("sections refaites (revue du 10 novembre 2026)").length).toBe(2); // une seule fois
    expect(() => new Function(js)).not.toThrow();
  });
});

describe("sections refaites de la revue (lot 3, famille Questions)", () => {
  it("quatre présentations des questions, la fiche et la page des questions, textes dans la section", async () => {
    const { libSection, SCRIPT_DEMO_SECTIONS } = await import("../src/lib/syna-agent/custom-theme/library");
    for (const id of ["questions-deux-colonnes", "questions-en-cartes", "questions-avec-photo", "questions-sur-le-produit"]) {
      expect(libSection(id)!.html.match(/class="rv-q"/g)!.length).toBeGreaterThanOrEqual(4);
      expect(sectionGroup(libSection(id)!)).toBe(id === "questions-sur-le-produit" ? "fiche-produit" : "questions");
    }
    // Bulles : questions ET réponses écrites dans la section (le rédacteur peut les réécrire), plus de nom d'exemple en initiale.
    const bulles = libSection("questions-en-bulles-de-discussion")!.html;
    expect(bulles).toContain("data-rv-bub");
    expect(bulles.match(/<p hidden>/g)!.length).toBe(5);
    expect(SCRIPT_DEMO_SECTIONS.has("questions-en-bulles-de-discussion")).toBe(false);
    // Page des questions : grande recherche, thèmes en cartes, questions groupées, encart contact.
    const page = libSection("questions-avec-recherche")!.html;
    for (const m of ["data-rv-fqs", "data-rv-go", "data-rv-gr", "rv-ct dk", "rv-acc lp"]) expect(page).toContain(m);
    expect(sectionGroup(libSection("questions-avec-recherche")!)).toBe("pages");
  });
});

describe("sections refaites de la revue (lot 3 : inscription, pieds de page, panier, fiche, journal, effets)", () => {
  it("chaque section refaite ou ajoutée est dans la banque, sur sa famille", async () => {
    const { libSection, RETIRED_SECTIONS } = await import("../src/lib/syna-agent/custom-theme/library");
    const want: Record<string, string> = {
      "fenetre-d-inscription": "inscription", "inscription-avec-photo": "inscription", "inscription-centree": "inscription", "inscription-avec-avantages": "inscription",
      "pied-de-page-complet": "pied-de-page", "pied-de-page-geant": "pied-de-page", "pied-de-page-avec-grand-appel": "pied-de-page",
      "pied-de-page-minimal-centre": "pied-de-page", "pied-de-page-a-bandeau-de-photos": "pied-de-page",
      "panier-en-etapes": "panier", "fiche-produit-a-onglets": "fiche-produit", "fiche-produit-onglets-en-pastilles": "fiche-produit",
      "fiche-produit-en-accordeon": "fiche-produit", "fiche-produit-onglets-sur-le-cote": "fiche-produit", "guide-d-infusion-en-tiroir": "fiche-produit",
      "le-journal-liste-des-articles": "pages", "journal-en-magazine": "pages", "journal-en-liste": "pages", "article-avec-barre-de-lecture": "pages",
      "texte-qui-s-allume-en-lisant": "histoire", "histoire-en-frise": "histoire", "histoires-facon-stories": "contenus", "cartes-qui-s-empilent": "contenus",
      "compose-ton-coffret": "offres", "compte-a-rebours-en-bloc": "offres",
    };
    for (const [id, g] of Object.entries(want)) {
      const s = libSection(id)!;
      expect(s.html, id).toMatch(/class="[^"]*\brv-/);
      expect(s.demoFrame, id).toBe(false);
      expect(sectionGroup(s), id).toBe(g);
    }
    // Emballage cadeau : seulement une ligne à cocher du panier (point 23).
    expect(RETIRED_SECTIONS["emballage-cadeau-en-option"]).toBeTruthy();
    expect(libSection("panier-en-etapes")!.html).toContain('data-rv-opt="emballage"');
  });
  it("aucune identité d'exemple ni moyen de paiement non confirmé dans les pieds de page et le panier", async () => {
    const { libSection } = await import("../src/lib/syna-agent/custom-theme/library");
    for (const id of ["pied-de-page-complet", "pied-de-page-geant", "pied-de-page-avec-grand-appel", "pied-de-page-minimal-centre", "pied-de-page-a-bandeau-de-photos", "page-panier-complete", "panier-en-etapes"]) {
      const h = libSection(id)!.html;
      expect(h, id).not.toMatch(/Camille|Notre-Dame|Bordeaux|PayPal|Apple Pay/);
    }
    // Les quatre colonnes de liens (Boutique, Aide, La maison, Informations).
    for (const col of ["La boutique", "Aide", "La maison", "Informations"]) expect(libSection("pied-de-page-complet")!.html).toContain(`<h5>${col}</h5>`);
  });
  it("sur un vrai site, un lien du pied de page sans page est retiré ; la fenêtre d'inscription ne s'ouvre jamais dans la banque", async () => {
    const fs = await import("node:fs");
    const render = fs.readFileSync("src/lib/syna-agent/custom-theme/render.ts", "utf8");
    expect(render).toContain("function rvFoot()");
    expect(render).toContain('"Questions fréquentes"');
    const js = fs.readFileSync("public/sections/library.js", "utf8");
    expect(js).toContain('/[?&](catalog|builder)=/.test(location.search)');
    expect(js).toContain('localStorage.setItem("rv-pop-vu","1")');
    expect(() => new Function(js)).not.toThrow();
  });
});

describe("couleurs : jamais le mode sombre du téléphone (retour du propriétaire du 10 novembre 2026)", () => {
  it("la feuille des sections remet les couleurs claires et des champs lisibles quand le téléphone est en mode sombre", async () => {
    const fs = await import("node:fs");
    const css = fs.readFileSync("public/sections/library.css", "utf8");
    const i = css.indexOf("jamais le mode sombre du téléphone");
    expect(i).toBeGreaterThan(css.indexOf('@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#121815')); // après l'ancien bloc, donc il l'emporte
    expect(css.slice(i)).toContain("color-scheme:light");
    expect(css.slice(i)).toContain("section textarea");
    expect(css.slice(i)).toMatch(/\.nx-hint\{position:static/);
  });
});

// Retours du propriétaire du 11 novembre 2026 (captures de l'atelier) : « c'est pas beau », « le vide à droite », « au lieu
// d'être juste un header c'est toute une section ».
describe("atelier : en-têtes à la marque et sections sans vide", () => {
  it("un autre en-tête porte le nom de la marque et le vrai menu, et ne montre que sa barre", async () => {
    const { builderTheme, builderAssets, brandHeader } = await import("../src/lib/syna-agent/custom-theme/builder");
    const header = { uid: "h", id: "en-tete-classique", clientTexts: true, html: '<section class="bhs"><header class="bh"><a class="bh-lg" href="#">Éclat de thé<span hidden>Accueil</span></a><nav class="bh-nv"><a href="#">Nos mélanges</a><a href="#">Notre histoire</a><a href="#">Contact</a></nav></header></section>' };
    const t: any = { version: 1, family: "classique", style: "", header, footer: null, search: null, pages: [] };
    const { theme, slots } = builderTheme(t);
    const pilule = theme.pages[0].sections.find((s) => s.id === "en-tete-flottant-en-pilule")!;
    expect(pilule.clientTexts).toBe(true);
    expect(pilule.html).toContain("Éclat de thé");
    expect(pilule.html).not.toContain("Brindi");
    const mega = theme.pages[0].sections.find((s) => s.id === "en-tete-a-mega-menu-illustre")!;
    expect(mega.html).toContain('class="mega" data-ct-ex'); // panneau d'exemple affiché vierge
    const { BLANK_JS, BLANK_CSS } = await import("../src/lib/syna-agent/custom-theme/blank");
    expect(BLANK_JS).toContain('p.closest("[data-ct-ex]")');
    expect(BLANK_CSS).toContain("[data-ct-own] [data-ct-ex] img");
    const nav = pilule.html!.match(/<nav\b[\s\S]*?<\/nav>/)![0];
    expect([...nav.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map((m) => m[1])).toEqual(["Nos mélanges", "Notre histoire", "Contact"]);
    const uid = slots.find((s) => s.id === "en-tete-flottant-en-pilule")!.uid;
    expect(builderAssets(slots).css).toContain(`[data-ct="${uid}"] .vp .page>*{display:none}`);
    expect(brandHeader("<a>Brindi</a><nav><a>Un</a><a>Deux</a></nav>", "Marque", ["A"])).toBe("<a>Marque</a><nav><a>A</a></nav>");
    expect(brandHeader('<nav><a>X</a></nav><div class="lv"><details><summary>Thés</summary></details><a>Coffrets</a></div>', "", ["A", "B"]))
      .toContain('<div class="lv"><a href="#" onclick="return false">A</a><a href="#" onclick="return false">B</a></div>'); // menu burger
    // Menu déroulant : le bouton prend le premier lien et garde sa flèche ; les liens qui manquent s'ajoutent.
    expect(brandHeader('<nav><button type="button">Boutique ▾</button><a href="#">Journal</a></nav>', "", ["Nos mélanges", "Notre histoire", "Contact"]))
      .toBe('<nav><button type="button">Nos mélanges ▾</button><a href="#">Notre histoire</a><a href="#">Contact</a></nav>');
    // L'en-tête transparent se pose sur l'ouverture, sans bande de photo à lui.
    const tr = slots.find((s) => s.id === "en-tete-transparent-sur-photo")!.uid;
    expect(builderAssets(slots).css).toContain(`[data-ct="${tr}"],`);
    expect(builderAssets(slots).css).toContain(`[data-ct="${uid}"]{height:0;overflow:visible`); // la pilule flotte aussi
    expect(builderAssets(slots).css).toContain(`html:has([data-ct="${tr}"]:not([hidden])) .sl .nav`); // flèches du diaporama sous l'en-tête
  });
  it("quatre engagements tiennent sur quatre colonnes, sans photo ils deviennent des cartes ; les histoires changent de produit", async () => {
    const fs = await import("node:fs");
    const css = fs.readFileSync("public/sections/library.css", "utf8"), js = fs.readFileSync("public/sections/library.js", "utf8");
    expect(css).toContain(".rv-eng-g:has(>article:nth-child(4)){grid-template-columns:repeat(4,minmax(0,1fr))");
    expect(css).toContain(".rv-eng-g article:not(:has(.rv-eng-ph)){background:rgba(255,255,255,.82)");
    expect(css).toContain(".rv-sto-sc>img.pk{object-fit:contain");
    expect(js).toContain('qa("[data-rv-st]",s)');
  });
});

// Retours du propriétaire du 11 novembre 2026 (après-midi) : ouvertures, saut à chaque clic, « nous / les autres ».
describe("atelier : ouvertures et confort", () => {
  it("l'ouverture produit mis en scène porte un bouton qui donne envie, jamais « Ajouter au panier »", async () => {
    const { libSection } = await import("../src/lib/syna-agent/custom-theme/library");
    const l = libSection("ouverture-produit-mis-en-scene")!;
    expect(l.html).not.toContain("Ajouter au panier");
    expect(l.does).toContain("jamais « Ajouter au panier »");
    expect(libSection("ouverture-en-ecran-partage")!.html).toContain('<div class="hs-fr">');
  });
  it("l'exemple rempli montre la photo du produit du client à la place du sachet d'exemple", async () => {
    const { builderTheme } = await import("../src/lib/syna-agent/custom-theme/builder");
    const t: any = { version: 1, family: "classique", style: "", header: null, footer: null, search: null, pages: [] };
    const { theme } = builderTheme(t, { productPhotos: ["/api/files/abc"] });
    const s = theme.pages[0].sections.find((x) => x.id === "ouverture-produit-mis-en-scene")!;
    expect(s.html).toContain("/api/files/abc");
    expect(s.html).not.toMatch(/photos\/sachet/);
    expect(s.clientTexts).toBeFalsy(); // reste un exemple : affiché vierge par défaut
  });
  it("un clic garde la position de la page et du panneau ; une section déjà sur la page vient à la place choisie", async () => {
    const { builderAssets, builderTheme } = await import("../src/lib/syna-agent/custom-theme/builder");
    const t: any = { version: 1, family: "classique", style: "", header: null, footer: null, search: null, pages: [] };
    const js = builderAssets(builderTheme(t).slots).js;
    expect(js).toContain("window.scrollTo(0,y)");
    expect(js).toContain("L1.scrollTop=st");
    expect(js).toContain("déjà sur cette page : elle viendra ici");
    expect(js).not.toContain("if(typeof k===\"number\"&&list().some(");
  });
});

// Contrôle complet de l'atelier (11 novembre 2026, « regarde que tout fonctionne ») : 106 sections posées et cliquées.
describe("atelier : sections qui plantaient au clic", () => {
  it("photo à points cliquables : plus de deux points ne plante plus, la bulle reprend la liste de la section", async () => {
    const fs = await import("node:fs");
    const js = fs.readFileSync("public/sections/library.js", "utf8");
    expect(js).toContain("if(li[i])li[i].classList.add(\"on\")");
    expect(js).toContain("dd=D[i]||[]");
    expect(js).not.toMatch(/\n;\n;\n/); // plus de « ; » empilés à chaque passage du script de revue
  });
  it("« Passer commande » ne plante plus : le message de paiement est partagé entre les scripts", async () => {
    const fs = await import("node:fs");
    const r = fs.readFileSync("src/lib/syna-agent/custom-theme/render.ts", "utf8");
    expect(r).toContain("window.ctNote=note;");
    expect(r).toContain("if(window.ctNote)window.ctNote(window.CT_PAY)");
  });
});

// Retours du propriétaire du 11 novembre 2026 (fin d'après-midi).
describe("atelier : panier, alignement, menu burger, espace de la galerie", () => {
  it("les sections du panier vont seulement sur la page Panier", async () => {
    const { checkCustomTheme } = await import("../src/lib/syna-agent/custom-theme/theme");
    const t: any = { version: 1, family: "classique", style: "", header: null, footer: null, search: null,
      pages: [{ key: "product", label: "Fiche produit", sections: [{ uid: "a", id: "barre-de-livraison-offerte" }] }, { key: "cart", label: "Panier", sections: [{ uid: "b", id: "barre-de-livraison-offerte" }] }] };
    const msgs = checkCustomTheme(t).map((p) => p.text).filter((m) => m.includes("seulement dans le panier"));
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("product");
    const { builderAssets, builderTheme } = await import("../src/lib/syna-agent/custom-theme/builder");
    const js = builderAssets(builderTheme({ ...t, pages: [] }).slots).js;
    expect(js).toContain('x.id!=="panier"||state.cur==="cart"');
    expect(js).toContain("if(k!==\"cart\")state.pages[k]=state.pages[k].filter");
  });
  it("le menu burger d'un en-tête d'essai s'ouvre sur toute la hauteur de l'aperçu", async () => {
    const { builderAssets, builderTheme } = await import("../src/lib/syna-agent/custom-theme/builder");
    const t: any = { version: 1, family: "classique", style: "", header: null, footer: null, search: null, pages: [] };
    const a = builderAssets(builderTheme(t).slots);
    expect(a.css).toContain(".drawer{position:fixed");
    expect(a.js).toContain('sl.style.setProperty("--at-dl"');
    expect(a.js).toContain('setAttribute("data-at-first","")'); // espace sous un en-tête qui flotte
    expect(a.css).toContain("[data-at-first]:not([data-at-ouv])");
    expect(a.css).toContain("border-top:var(--at-bh,112px) solid var(--at-band,#fff)");
    expect(a.js).toContain("hd.offsetHeight+18-pad"); // juste la hauteur de l'en-tête et un petit écart // la bande prend le fond de la section du dessous
    expect(a.js).toContain('fe.style.setProperty("--at-band",band)');
  });
  it("« À gauche » et « Centré » s'appliquent à tous les textes de la section, même ceux que leur cadre centrait", async () => {
    const fs = await import("node:fs");
    const r = fs.readFileSync("src/lib/syna-agent/custom-theme/render.ts", "utf8");
    expect(r).toContain('var al=sec.getAttribute("data-lay-align")');
    expect(r).toContain('querySelectorAll("[data-lay-flip],[data-lay-bg],[data-lay-align]")');
    const css = fs.readFileSync("public/sections/library.css", "utf8");
    expect(css).toContain(".ctw-blk:has(>[data-gallery2])"); // galerie avec de l'air en haut et en bas
  });
});

// Étude de 65 thèmes ThemeForest (11 novembre 2026, docs/etude-themes-themeforest.md).
describe("conception de SINA d'après les thèmes qui se vendent", () => {
  it("la consigne donne l'ordre des pages ; l'exemple n'utilise que des sections actuelles et passe les contrôles", async () => {
    const D = await import("../src/lib/syna-agent/custom-theme/design");
    const { libSection, RETIRED_SECTIONS } = await import("../src/lib/syna-agent/custom-theme/library");
    expect(D.DESIGN_SYSTEM).toContain("CE QUE FONT LES THÈMES QUI SE VENDENT");
    expect(D.DESIGN_REVIEW_SYSTEM).toContain("CE QUE FONT LES THÈMES QUI SE VENDENT");
    const ex = D.DESIGN_SYSTEM.slice(D.DESIGN_SYSTEM.indexOf("ACCUEIL (10 sections)"), D.DESIGN_SYSTEM.indexOf("POUR UN SITE DE SERVICES"));
    const pick = (txt: string) => [...txt.matchAll(/\n\d+\. ([a-z0-9-]+) ·/g)].map((x) => ({ section: x[1], why: "x", says: "x", photos: "aucune" }));
    const home = pick(ex.slice(0, ex.indexOf("FICHE PRODUIT"))), prod = pick(ex.slice(ex.indexOf("FICHE PRODUIT"), ex.indexOf("COLLECTION")));
    expect(home.length).toBe(10);
    expect(prod.length).toBe(8);
    for (const s of [...home, ...prod]) { expect(libSection(s.section)).toBeTruthy(); expect(RETIRED_SECTIONS[s.section]).toBeFalsy(); }
    expect(new Set([...home, ...prod].map((s) => s.section)).size).toBe(18); // jamais la même section deux fois
    expect(D.pageOrderGaps({ pages: [{ key: "home", label: "Accueil", journey: "", sections: home }, { key: "product", label: "Fiche produit", journey: "", sections: prod }] } as any)).toEqual([]);
  });
  it("le contrôle refuse un accueil sans produits, des produits trop tard, des preuves avant les produits, une fin sur des produits", async () => {
    const D = await import("../src/lib/syna-agent/custom-theme/design");
    const pg = (key: string, ids: string[]) => ({ key, label: key, journey: "", sections: ids.map((section) => ({ section })) });
    const sans = D.pageOrderGaps({ pages: [pg("home", ["ouverture-photo-pleine", "image-et-texte", "avis-clients"]), pg("product", ["produit-vedette"])] } as any);
    expect(sans.join(" ")).toContain("aucun produit");
    const tard = D.pageOrderGaps({ pages: [pg("home", ["ouverture-photo-pleine", "image-et-texte", "citation-en-grand", "grande-photo-de-respiration", "avis-clients", "collection-en-vedette"])] } as any).join(" ");
    expect(tard).toContain("trop tard");
    expect(tard).toContain("passe avant les produits");
    expect(tard).toContain("finit sur des produits");
    const fiche = D.pageOrderGaps({ pages: [pg("product", ["fiche-produit-a-onglets", "vous-aimerez-aussi", "mode-d-emploi-en-etapes"])] } as any).join(" ");
    expect(fiche).toContain("commence par le bloc d'achat");
    expect(fiche).toContain("viennent en dernier");
    expect(D.pageOrderGaps({ pages: [pg("aide", ["suivi-de-commande-et-aide", "questions-avec-recherche"])] } as any)).toEqual([]); // pages pratiques
  });
  it("six sections des thèmes vendus ajoutées à la banque Classique", async () => {
    const { libSection, isCardSection } = await import("../src/lib/syna-agent/custom-theme/library");
    const { sectionGroup } = await import("../src/lib/syna-agent/custom-theme/section-groups");
    for (const id of ["image-et-texte", "bannieres-de-gamme", "grande-photo-de-respiration", "produits-en-onglets", "vous-aimerez-aussi", "video-en-bande"]) {
      const l = libSection(id)!;
      expect(l.family).toBe("classique");
      expect(sectionGroup(l)).toBeTruthy();
    }
    expect(isCardSection(libSection("produits-en-onglets")!)).toBe(true);
    expect(isCardSection(libSection("bannieres-de-gamme")!)).toBe(false); // des bannières, pas une grille de cartes
  });
});
