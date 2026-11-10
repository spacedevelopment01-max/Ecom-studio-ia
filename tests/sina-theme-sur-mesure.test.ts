/**
 * Thèmes sur mesure (SINA, étape 6) : bibliothèque de sections, montage selon les règles du propriétaire, retouches,
 * rendu aux couleurs de la marque du client. Sans IA, sans réseau.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_BRANDS, familySections, libSection, sectionByRef, sectionLibrary, withBrandName } from "@/lib/syna-agent/custom-theme/library";
import { applyStructure, checkCustomTheme, replaceOnce, scopedCss, type CustomTheme } from "@/lib/syna-agent/custom-theme/theme";
import { starterTheme, STARTERS } from "@/lib/syna-agent/custom-theme/starters";
import { brandCss, buyFlags, renderCustomTheme } from "@/lib/syna-agent/custom-theme/render";
import { SECTION_FAMILIES } from "@/lib/syna-agent/section-families";

const brand = { name: "Ardent", nameStatus: "validated", alternatives: [], tagline: "", positioning: "", audience: "", personality: [], tone: { voice: "", do: [], dont: [] }, palette: { primary: "#C2410C", secondary: "#E7E5E4", accent: "#0F766E", light: "#FAFAF9", dark: "#1C1917" }, fonts: { heading: "", body: "" }, logo: { concept: "", status: "proposed" } } as any;
const proj = { id: "p-test", name: "Ardent", brand };
const blocking = (t: CustomTheme) => checkCustomTheme(t).filter((p) => p.level === "bloquant").map((p) => p.text);
/** Montage de A à Z (sans thème de départ), toutes les pages obligatoires d'une boutique, avec les sections de la famille. */
function fullSite(family: "classique" | "moderne") {
  // Projets de test sur Shopify : pas de page commande ni de confirmation (pages de Shopify).
  if (family === "moderne") { const st = STARTERS["sport-chic"]; return { header: st.header, footer: st.footer, search: st.search, pages: st.pages.filter(([key]) => key !== "commande" && key !== "merci").map(([key, label, sections]) => ({ key, label, sections })) }; }
  return {
    header: "En-tête classique", footer: "Pied de page complet",
    pages: [
      // Accueil : au moins 8 sections ; fiche produit : au moins 7 (méthode de montage, rappel du propriétaire du 9 novembre).
      { key: "home", label: "Accueil", sections: ["Ouverture photo pleine", "Collection en vedette", "Histoire du produit au défilement", "Citation en grand", "Avis clients", "Grille bento", "Nos engagements", "Chiffres clés"] },
      { key: "shop", label: "Boutique", sections: ["Catalogue avec filtres et tri"] },
      { key: "product", label: "Fiche produit", sections: ["Produit vedette", "Points forts du produit", "Mode d'emploi en étapes", "Résumé des avis", "Questions sur le produit", "Complète ta commande", "Badges de confiance"] },
      { key: "cart", label: "Panier", sections: ["Page panier complète"] },
      { key: "compte", label: "Mon compte", sections: ["Connexion et création de compte"] },
      { key: "about", label: "Notre histoire", sections: ["L'atelier et la personne derrière"] },
      { key: "contact", label: "Contact", sections: ["Contact"] },
      { key: "aide", label: "Aide", sections: ["Suivi de commande et aide"] },
      { key: "legal", label: "Informations légales", sections: ["Mentions et conditions"] },
      { key: "404", label: "Page 404", sections: ["Page introuvable (404)"] },
    ],
  };
}

describe("thème sur mesure : bibliothèque", () => {
  it("toutes les sections du catalogue (sans les e-mails), deux familles, rôles de la famille Moderne complets", () => {
    const lib = sectionLibrary();
    expect(lib.sections.length).toBeGreaterThanOrEqual(180);
    expect(new Set(lib.sections.map((s) => s.id)).size).toBe(lib.sections.length);
    const moderne = familySections("moderne");
    expect(moderne).toHaveLength(51); // sans les fausses urgences ni les offres d'exemple (audit du 10 novembre 2026)
    // Chaque section nommée dans les familles du Studio existe dans la bibliothèque.
    for (const f of SECTION_FAMILIES.filter((x) => x.id === "moderne")) for (const titles of Object.values(f.roles)) for (const t of titles) expect(sectionByRef(t), t).toBeTruthy();
    // Les démonstrations en fausse fenêtre ne sont jamais proposées.
    expect(familySections("classique").some((s) => s.demoFrame)).toBe(false);
    for (const f of ["library.css", "library.js", "templates.html"]) expect(fs.existsSync(path.join(process.cwd(), "public", "sections", f)), f).toBe(true);
    const photos = new Set(fs.readdirSync(path.join(process.cwd(), "public", "sections", "photos")));
    for (const s of moderne) for (const ph of [...s.html.matchAll(/photos\/([\w-]+\.(?:webp|png|jpg))/g)].map((m) => m[1])) expect(photos.has(ph), `${s.title} → ${ph}`).toBe(true);
  });

  it("le nom d'une marque de démonstration est remplacé par celui du client, casse comprise", () => {
    expect(withBrandName("RUPTURE · Rupture · rupture. #RUPTURE Brindi", "Le Fil Rouge")).toBe("LE FIL ROUGE · Le Fil Rouge · le fil rouge. #LEFILROUGE Le Fil Rouge");
    expect(DEMO_BRANDS).toContain("Solstice");
    expect(withBrandName('<div><span style="--i:0">S</span><span style="--i:1">O</span><span style="--i:2">L</span><span style="--i:3">S</span><span style="--i:4">T</span><span style="--i:5">I</span><span style="--i:6">C</span><span style="--i:7">E</span></div>', "Le Fil")).toBe('<div><span style="--i:0">L</span><span style="--i:1">E</span><span style="--i:2">&nbsp;</span><span style="--i:3">F</span><span style="--i:4">I</span><span style="--i:5">L</span></div>');
    expect(withBrandName("Brindi", "A<b>")).toBe("A&lt;b&gt;");
  });
});

describe("thème sur mesure : montage et règles du propriétaire", () => {
  it("les trois points de départ respectent les règles (aucun point bloquant)", () => {
    for (const [fam, style] of [["moderne", "sport-chic"], ["moderne", "streetwear-neon"], ["classique", "classique"]] as const) {
      const t = starterTheme(fam, style);
      expect(blocking(t), `${fam}/${style}`).toEqual([]);
      expect(t.pages[0].key).toBe("home");
    }
    expect(Object.keys(STARTERS)).toEqual(["sport-chic", "streetwear-neon", "classique"]);
  });

  it("sécurité des retouches : jamais de règle vers les sections voisines, jamais de code ajouté (même en deux remplacements)", async () => {
    expect(() => scopedCss("s12345678", ":scope ~ section{display:none}")).toThrow(/voisines/);
    expect(() => scopedCss("s12345678", ":scope + section{display:none}")).toThrow(/voisines/);
    expect(() => scopedCss("s12345678", ":scope:has(.x){color:red}")).toThrow(/voisines/);
    expect(() => scopedCss("s12345678", ":scope .b{position:fixed;top:0}")).toThrow(/position:fixed/);
    expect(scopedCss("s12345678", ":scope .b{color:red}")).toContain('[data-ct="s12345678"] .b');
    const { riskCount } = await import("@/lib/syna-agent/custom-theme/risk");
    expect(riskCount('<form onsubmit="return false"><input></form>')).toBe(1); // formulaire de la bibliothèque : connu
    expect(riskCount("<svg/onload=alert(1)>")).toBe(1);
    const B3 = await import("@/lib/syna-agent/custom-theme/brand");
    const split = B3.applyWrite("<p>a</p><p>b</p>", { edits: [{ find: "<p>a</p>", replace: "<scr" }, { find: "<p>b</p>", replace: "ipt>x</script>" }], links: [], photos: [] });
    expect(split.html).not.toMatch(/<script/);
  });

  it("audit du 10 novembre 2026 : commande sur Shopify, fausse urgence, offre d'exemple, sections réservées, vraie photo en double", () => {
    const shop = { business: "products" as const, products: 3, platform: "shopify", genre: null };
    const t = starterTheme("classique", "classique");
    const k = (x: CustomTheme, site?: any) => checkCustomTheme(x, site).filter((p) => p.level === "bloquant").map((p) => p.text).join(" ; ");
    // Section de commande sur une page qui n'a pas la clé interdite : refusée sur Shopify, permise ailleurs.
    const order = applyStructure(t, [{ op: "add", page: "cart", section: sectionByRef("Commande pas à pas")!.id }]);
    expect(k(order, shop)).toMatch(/« Commande pas à pas » \(cart\) : sur Shopify/);
    expect(k(order, { ...shop, platform: "woocommerce" })).not.toMatch(/Commande pas à pas/);
    // Faux compte à rebours et offre d'exemple : toujours refusés, et jamais proposés.
    for (const [title, why] of [["Compte à rebours en bloc", /compte à rebours d'exemple/], ["Code promo à copier", /offre d'exemple/], ["Cadeau offert dès un montant", /offre d'exemple/]] as const) {
      expect(k(applyStructure(t, [{ op: "add", page: "home", section: sectionByRef(title)!.id }])), title).toMatch(why);
      expect(familySections("classique").some((x) => x.title === title), title).toBe(false);
    }
    // « Seulement pour » : un guide d'infusion sur un site de confitures est refusé, permis pour du thé.
    const tea = applyStructure(t, [{ op: "add", page: "product", section: sectionByRef("Guide d'infusion en tiroir")!.id }]);
    expect(k(tea, shop)).toMatch(/réservée aux thés et infusions/);
    expect(k(tea, { ...shop, genre: "the" })).not.toMatch(/réservée/);
    // Une vraie photo (Fichiers) deux fois : refusée, même dans une seule page ; la photo d'un produit peut revenir.
    const twice = JSON.parse(JSON.stringify(t)) as CustomTheme;
    twice.pages[0].sections[1].html = '<section><img src="/api/files/abc123def"></section>';
    twice.pages[0].sections[2].html = '<section><img src="/api/files/abc123def"></section>';
    expect(k(twice, shop)).toMatch(/la même photo deux fois sur « Accueil »/);
    expect(k(twice, { ...shop, productPhotos: ["abc123def"] })).not.toMatch(/même photo/);
  });

  it("décision du 10 novembre 2026 : réalisations et avant / après créés par SINA ; photos de ses clients et biens jamais inventés", async () => {
    const B2 = await import("@/lib/syna-agent/custom-theme/brand");
    const t = applyStructure(starterTheme("classique", "classique"), [{ op: "add", page: "home", section: sectionByRef("Réalisations filtrables")!.id }, { op: "add", page: "home", section: sectionByRef("Avant / après")!.id }, { op: "add", page: "home", section: sectionByRef("Vus dans la rue")!.id }]);
    const svc = B2.photoSlots(t, { business: "services" }), prod = B2.photoSlots(t, { business: "products", productPhotos: true });
    expect(svc.filter((x) => x.section === "Réalisations filtrables").every((x) => x.kind === "ambiance")).toBe(true); // chantiers créés si le client n'en a pas
    expect(svc.filter((x) => x.section === "Avant / après").every((x) => x.kind === "ambiance")).toBe(true);
    expect(svc.filter((x) => x.section === "Vus dans la rue").every((x) => x.kind === "a-fournir")).toBe(true); // un faux témoignage, jamais
    expect(prod.filter((x) => x.section === "Avant / après").every((x) => x.kind === "ambiance")).toBe(true); // feuilles de thé sèches puis infusées
    expect(prod.filter((x) => x.section === "Produit vedette").every((x) => x.kind === "produit")).toBe(true); // sa vraie photo de produit
    // Le nombre annoncé au client ne compte que les photos d'ambiance (ni produits, ni photos à fournir).
    expect(B2.examplePhotoCount(t, { business: "services" })).toBe(svc.filter((x) => x.kind === "ambiance").length);
    expect(B2.examplePhotoCount(t, { business: "services" })).toBeLessThan(svc.length);
    // Aperçu : la photo d'exemple d'une réalisation n'apparaît jamais comme celle du client.
    const html = renderCustomTheme({ ...proj, business: "services" } as any, t, { nonce: "n" });
    const real = t.pages[0].sections.find((x) => libSection(x.id)!.title === "Vus dans la rue")!;
    const sec = html.slice(html.indexOf(`data-ct="${real.uid}"`), html.indexOf("</section>", html.indexOf(`data-ct="${real.uid}"`)));
    expect(sec).not.toMatch(/photos\/[\w-]+\.(webp|png|jpg)/);
    const frame = /data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/.exec(sec)![1];
    expect(Buffer.from(frame, "base64").toString()).toMatch(/Photo à fournir[^]*SINA ne peut pas inventer les photos de tes clients/);
    // Sans ses vraies photos, la section n'est jamais posée (aucune image ne reste vide ni de démonstration).
    const check = (n: number) => checkCustomTheme(t, { business: "products", products: 1, clientImages: n }).filter((x) => x.level === "bloquant").map((x) => x.text).join(" ");
    expect(check(0)).toMatch(/« Vus dans la rue » demande les photos de tes clients/);
    expect(check(99)).not.toMatch(/Vus dans la rue » demande/);
  });

  it("refuse le mélange de familles, deux « Produit vedette », deux sections de cartes, la même section à la suite", () => {
    const t = starterTheme("moderne", "sport-chic");
    const mix = applyStructure(t, [{ op: "add", page: "home", section: sectionByRef("Ouverture photo pleine")!.id }]);
    expect(blocking(mix).join(" ")).toMatch(/jamais de mélange de familles/);
    const twoPv = applyStructure(t, [{ op: "add", page: "product", section: sectionByRef("Produit vedette · drop limité")!.id }]);
    expect(blocking(twoPv).join(" ")).toMatch(/deux sections « Produit vedette »/);
    const notTop = applyStructure(t, [{ op: "move", uid: t.pages[2].sections[0].uid, at: 3 }]);
    expect(blocking(notTop).join(" ")).toMatch(/doit ouvrir la fiche produit/);
    const twoCards = applyStructure(t, [{ op: "add", page: "home", section: sectionByRef("Grille à filtres animés")!.id }]);
    expect(blocking(twoCards).join(" ")).toMatch(/une seule par page/);
    const sameRole = applyStructure(t, [{ op: "add", page: "home", section: sectionByRef("Avis et ajustement")!.id, at: 7 }]);
    expect(checkCustomTheme(sameRole).filter((p) => p.level === "à revoir").map((p) => p.text).join(" ")).toMatch(/deux sections « confiance » à la suite/);
    const twice = applyStructure(t, [{ op: "add", page: "home", section: t.pages[0].sections[0].id, at: 1 }]);
    expect(blocking(twice).join(" ")).toMatch(/deux fois à la suite/);
    const noHeader = { ...t, header: null };
    expect(blocking(noHeader).join(" ")).toMatch(/il manque un en-tête/);
  });

  it("photo de fond posée par la feuille commune : écrite dans la section, comptée et remplaçable (essai réel du 9 novembre)", async () => {
    const { inlineBackgrounds } = await import("@/lib/syna-agent/custom-theme/library");
    const { photoSlots } = await import("@/lib/syna-agent/custom-theme/brand");
    const hero = sectionByRef("Ouverture photo pleine")!;
    expect(hero.html).not.toContain("photos/hero.jpg");
    expect(inlineBackgrounds(hero.html)).toMatch(/style="background-image:url\(photos\/hero\.jpg\)"/);
    expect(inlineBackgrounds(inlineBackgrounds(hero.html))).toBe(inlineBackgrounds(hero.html)); // jamais deux fois
    const t: CustomTheme = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [{ key: "home", label: "Accueil", sections: [{ uid: "s00000001", id: hero.id }] }], rev: 0, at: 0 };
    expect(photoSlots(t).map((x) => x.file)).toContain("hero.jpg");
  });

  it("opérations de structure : ajouter, retirer, déplacer, remplacer, pages", () => {
    const t = starterTheme("moderne", "streetwear-neon");
    const uid = t.pages[0].sections[1].uid;
    const a = applyStructure(t, [{ op: "remove", uid }]);
    expect(a.pages[0].sections.some((s) => s.uid === uid)).toBe(false);
    expect(t.pages[0].sections.some((s) => s.uid === uid)).toBe(true); // l'original ne bouge pas
    const b = applyStructure(t, [{ op: "replace", uid, section: sectionByRef("Offre en deux tuiles")!.id }]);
    expect(libSection(b.pages[0].sections[1].id)!.title).toBe("Offre en deux tuiles");
    const c = applyStructure(t, [{ op: "page", key: "faq", label: "Questions" }, { op: "add", page: "faq", section: sectionByRef("Questions numérotées")!.id }, { op: "rename_page", key: "faq", label: "Vos questions" }]);
    expect(c.pages.at(-1)).toMatchObject({ key: "faq", label: "Vos questions" });
    expect(() => applyStructure(t, [{ op: "add", page: "nulle-part", section: "x" }])).toThrow(/introuvable/);
  });

  it("retouche d'un passage exact et règles CSS limitées à la section", () => {
    expect(replaceOnce("<h2>Bonjour</h2><p>Salut</p>", "Bonjour", "Hello")).toBe("<h2>Hello</h2><p>Salut</p>");
    expect(() => replaceOnce("<p>a</p><p>a</p>", "a", "b")).toThrow(/plusieurs fois/);
    expect(() => replaceOnce("<p>a</p>", "z", "b")).toThrow(/introuvable/);
    expect(scopedCss("s1", ":scope h2{color:red} :scope > p{margin:0}")).toBe('[data-ct="s1"] h2{color:red} [data-ct="s1"] > p{margin:0}');
    expect(() => scopedCss("s1", "h2{color:red}")).toThrow(/hors de la section/);
    expect(() => scopedCss("s1", ':scope{background:url("https://x.y/a.png")}')).toThrow(/extérieure/);
  });
});

describe("thème sur mesure : rendu", () => {
  it("aux couleurs, au nom et aux polices de la marque ; sections marquées ; désignation dans le Studio seulement", () => {
    const t = starterTheme("moderne", "streetwear-neon");
    const html = renderCustomTheme(proj, t, { nonce: "abc" });
    expect(html).toContain("ARDENT");
    const visible = html.replace(/window\.CT_DEMO=\[[^\]]*\];/, "");
    for (const d of ["RUPTURE", "Rupture", "Brindi", "SOLSTICE"]) expect(visible.includes(d), d).toBe(false);
    expect(html).toContain('<base href="/sections/">');
    expect(html).toContain("--q-lm:#C2410C");
    expect((html.match(/data-ct="s[0-9a-f]{8}"/g) ?? []).length).toBe(t.pages.reduce((n, p) => n + p.sections.length, 0) + 3);
    expect((html.match(/<script(?! nonce="abc")[ >]/g) ?? []).length).toBe(0);
    expect(html).not.toContain("ct-preview\",type:\"picked\"");
    const studio = renderCustomTheme(proj, t, { studio: true, nonce: "abc" });
    expect(studio).toContain('type:"picked"');
    // Scripts réellement produits (audit du 10 novembre 2026) : le texte désigné garde ses « s », et les noms des
    // marques de démonstration écrits par les scripts des sections sont bien trouvés et remplacés.
    expect(studio).toContain('.replace(/\\s+/g," ").trim().slice(0,300)');
    expect(studio).not.toMatch(/replace\(\/s\+\/g/);
    const rxSrc = /RX=(new RegExp\("[^;]*?"g"\));/.exec(studio)![1];
    const demo = JSON.parse(/window\.CT_DEMO=(\[[^\]]*\]);/.exec(studio)![1]);
    const RX = new Function("window", `return ${rxSrc}`)({ CT_DEMO: demo }) as RegExp;
    expect("Le drop RUPTURE arrive".replace(RX, "ARDENT")).toBe("Le drop ARDENT arrive");
    expect(RX.test("ruptures")).toBe(false); // un mot entier seulement
    // Chaque script produit est du JavaScript valide ; la vraie carte et les liens externes s'ouvrent ; sur Shopify, le
    // bouton de commande du panier explique le paiement de la plateforme.
    for (const m of studio.matchAll(/<script[^>]*>([^]*?)<\/script>/g)) expect(() => new Function(m[1]), m[1].slice(0, 60)).not.toThrow();
    expect(studio).toContain('an.target==="_blank"&&/^https:\\/\\//.test(');
    expect(renderCustomTheme({ ...proj, platform: "shopify" } as any, { ...t, pages: t.pages.filter((p) => p.key !== "commande") }, { nonce: "n" })).toMatch(/window\.CT_PAY="Sur ta boutique Shopify/);
    expect(studio).toContain("window.CT_PAY=null"); // une page de commande existe dans ce thème : le bouton y mène
    expect("Au solstice d'été, rupture de stock".replace(RX, "ARDENT")).toBe("Au solstice d'été, rupture de stock"); // mots courants intacts
    // Section dont les textes sont ceux du client : jamais réécrite au rendu.
    const own = JSON.parse(JSON.stringify(t)) as typeof t;
    const sec = own.pages[0].sections[1];
    sec.html = '<section class="x"><p>Au Solstice d\'été, la Rupture de stock guette.</p></section>';
    sec.clientTexts = true;
    const ownHtml = renderCustomTheme(proj, own, { nonce: "abc" });
    expect(ownHtml).toContain("Au Solstice d'été, la Rupture de stock guette.");
    expect(ownHtml).toMatch(new RegExp(`data-ct="${sec.uid}" data-ct-role="[a-z]+" data-ct-own`));
    expect(studio).toContain("textes et photos d'exemple");
    // Pages complètes et liens reliés (demande du propriétaire du 9 novembre 2026) ; compteur du panier commun.
    expect(t.pages.map((p) => p.key)).toEqual(expect.arrayContaining(["commande", "merci", "compte", "aide", "contact", "legal"]));
    const map = JSON.parse(/window\.TB_MAP=(\{[^<]*?\});/.exec(html)![1]);
    expect(map).toMatchObject({ "Passer commande": "commande", "Mon compte": "compte", "Suivi de commande": "aide", "Conditions générales": "legal:cgv", "Confidentialité": "legal:confidentialite" });
    expect(html).toContain("window.TB_GO=go");
    expect(html).toContain("tb-toast");
    expect(html).toContain("Aucune donnée de carte n'est demandée ici");
    if (process.env.CT_DUMP) for (const [f, s] of [["moderne", "sport-chic"], ["moderne", "streetwear-neon"], ["classique", "classique"]] as const) fs.writeFileSync(path.join(process.env.CT_DUMP, `ct-${s}.html`), renderCustomTheme(proj, starterTheme(f, s), { studio: true, nonce: "n0nce" }));
  });

  it("carte de l'adresse : jamais une image (encore moins dessinée par l'IA), la vraie carte s'ouvre à l'adresse du client", async () => {
    const { realMap } = await import("@/lib/syna-agent/custom-theme/render");
    const { photoSlots } = await import("@/lib/syna-agent/custom-theme/brand");
    const html = sectionByRef("Contact")!.html.replace('src="photos/carte-contact.jpg"', 'src="/api/files/plan-dessine"');
    const out = realMap(html, "12 rue des Vergers, 26000 Valence");
    expect(out).not.toMatch(/plan-dessine|carte-contact|mlat=44\.84985/);
    expect(out).toContain("https://www.openstreetmap.org/search?query=12%20rue%20des%20Vergers%2C%2026000%20Valence");
    expect(realMap(html, null)).toContain("[À compléter : adresse]");
    const t: CustomTheme = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [{ key: "contact", label: "Contact", sections: [{ uid: "s00000002", id: sectionByRef("Contact")!.id }] }], rev: 0, at: 0 };
    expect(photoSlots(t).map((x) => x.file)).not.toContain("carte-contact.jpg");
  });

  it("bloc d'achat : seules les fonctions que le produit a vraiment", () => {
    expect(buyFlags(null)).toEqual({ poInit: "1" });
    const f = { colors: null, formats: [{ option: "Taille", values: ["S", "M"] }], promo: null, quantity: { kind: "bogo", buy: 2, free: 1 }, subscription: null, bundle: null, gifts: [], range: ["A", "B"], delivery: { minDays: 2, maxDays: 4, cutoffHour: null }, loyalty: null, hidden: [] } as any;
    expect(buyFlags(f)).toMatchObject({ poCouleur: "0", poTaille: "1", poOffre: "bogo", poGamme: "1", poLivraison: "1", poAbo: "0", poFidelite: "0" });
    // Vrai délai du client (essai Heure Dorée : « délai d'exemple : 2 à 3 jours ouvrés » montré aux visiteurs).
    expect(buyFlags(f).poShip).toBe("2-4-");
    const js = fs.readFileSync(path.join(process.cwd(), "public/sections/library.js"), "utf8");
    expect(js).toContain("d.poShip");
    expect(js).toContain(`(SHIP.real?"":"<br><small>délai d'exemple`);
    expect(js).not.toContain("var SHIP={min:2,max:3,cut:14};");
    expect(brandCss({ brand: null })).toBe("");
  });

  it("couleurs de la marque : les sections Classique à palette d'exemple (tA, tB, tN) prennent celles du client", () => {
    const css = brandCss({ brand: { palette: { dark: "#1F2A3A", primary: "#24508C", secondary: "#F6E7D3", accent: "#C2652B", light: "#FFFFFF" } } } as any);
    // même rôle que dans l'exemple : 1 encre sombre, 2 couleur de la marque, 3 teinte claire, 4 fond clair, 5 accent
    expect(css).toContain(":root,.tA,.tB,.tN{--c1:#1F2A3A;--c2:#24508C;--c3:color-mix(in srgb,#FFFFFF 86%,#24508C);--c4:color-mix(in srgb,#FFFFFF 95%,#1F2A3A);--c5:#C2652B}");
    // la feuille des sections déclare ces palettes avant : la règle de la marque, posée après, l'emporte
    const lib = fs.readFileSync(path.join(process.cwd(), "public/sections/library.css"), "utf8");
    expect(lib).toMatch(/\.tB\{--c1:#233A2E/);
  });
});

describe("thème sur mesure : outils de SINA", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const { loadCustomTheme } = await import("@/lib/syna-agent/custom-theme/theme");
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  async function project() {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des sacs et accessoires en cuir faits main." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Femmes de 25 à 45 ans." }, { field: "image", value: "Solaire et sportif." },
      { field: "setup", value: "4 produits" }, { field: "market", value: "En ligne, France." }, { field: "price", value: "50 à 130 €" }, { field: "difference", value: "Faits main." },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas encore." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    return { ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  it("bloc d'achat : les vraies données du produit (prix, couleurs, remises, livraison), jamais les valeurs d'exemple", async () => {
    const { ctx, pid } = await project();
    const { createProduct } = await import("@/lib/products/catalog");
    const { saveShopOffers } = await import("@/lib/syna-agent/product-features");
    const { saveCompany } = await import("@/lib/syna-agent/activity");
    createProduct(pid, { title: "Sac Lune", price: 8900, compareAt: 9900, options: [{ name: "Couleur", values: ["Noir", "Cognac"] }], variants: [{ options: ["Noir"], price: 8900, compareAt: 9900 }, { options: ["Cognac"], price: 8900, compareAt: 9900 }] } as any);
    saveShopOffers(pid, { quantity: { kind: "lots", tiers: [{ qty: 2, pct: 12 }] }, gifts: [{ at: 120, label: "Pochette offerte" }] } as any);
    saveCompany(pid, { shipping: "Livraison en 2 à 4 jours, offerte dès 60 €", returns: "Retours acceptés sous 30 jours" } as any);
    await call("theme.family", ctx, { family: "classique" });
    expect((await call("custom.compose", ctx, fullSite("classique"))).ok).toBe(true);
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const { loadProject } = await import("@/lib/projects");
    const html = renderCustomTheme(loadProject(pid), loadCustomTheme(pid)!, { nonce: "n" });
    const tag = /<div[^>]*data-pvb[^>]*>/.exec(html)![0];
    expect(tag).toContain('data-base="99"'); // prix barré : le bloc part de 99 € et applique la vraie remise (89 € payés)
    expect(tag).toContain('data-name="Sac Lune"');
    const cfg = JSON.parse(/data-cfg="([^"]*)"/.exec(tag)![1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
    expect(99 * (1 - cfg.promoPct / 100)).toBeCloseTo(89, 5);
    expect(cfg.colors.map((c: string[]) => c[0])).toEqual(["Noir", "Cognac"]);
    expect(cfg.lots).toEqual([[2, 12]]);
    expect(cfg.tiers.map((x: unknown[]) => x[0])).toEqual([60, 120]); // livraison offerte (sa réponse) + son cadeau
    expect(cfg.promoEnd).toBeUndefined(); // prix barré : aucun compte à rebours
    const block = html.slice(html.indexOf(tag), html.indexOf("</section>", html.indexOf(tag)));
    expect(block).not.toMatch(/couleurs d'exemple|Retours sous 14 jours|Thé vert jasmin|l'offre se termine dans/);
    expect(block).toMatch(/Livraison offerte dès 60 €[^]*Retours sous 30 jours/);
    expect(block).toContain("Prix réduit : −10 %");
  });

  it("conception : le Studio conçoit tout le site (parcours, objections, pourquoi chaque section), une correction si une règle est enfreinte", async () => {
    const { ctx, pid } = await project();
    await call("theme.family", ctx, { family: "classique" });
    const T = await import("@/lib/syna-agent/custom-theme/tools");
    expect(getTool("custom.design")!.kind).toBe("generate");
    expect(getTool("custom.design")!.estimate!(ctx, {})).toMatchObject({ label: expect.stringMatching(/conception de tout ton site/) });
    const site = fullSite("classique");
    const good = {
      visitor: "Une personne de 35 ans qui trouve les confitures du commerce trop sucrées et veut retrouver le goût du fruit.", levers: ["la promesse dès l'arrivée", "la transparence de la recette"], objections: [], corrections: [] as string[],
      concept: "Le matin d'hiver où l'on ouvre le pot et où l'été revient.", header: "en-tete-classique", footer: "pied-de-page-complet", search: null,
      pages: site.pages.map((pg) => ({ key: pg.key, label: pg.label, journey: `Le visiteur arrive sur ${pg.label} et se demande ce qu'il va trouver.`, sections: pg.sections.map((t) => ({ section: sectionByRef(t)!.id, why: `Répond au moment ${t}.`, says: `Dit ce que ${t} doit dire avec les faits.`, photos: t === "Ouverture photo pleine" ? "Une table de cuisine un matin d'hiver, le pot ouvert à droite." : "aucune" })) })),
    };
    // 1re conception : une offre en section à part (refusée), puis la conception corrigée.
    const bad = { ...good, pages: good.pages.map((pg) => (pg.key === "product" ? { ...pg, sections: [...pg.sections, { section: "offre-par-quantite", why: "Pour vendre plus.", says: "Trois pots moins chers.", photos: "aucune" }] } : pg)) };
    const prompts: string[] = [];
    const systems: string[] = [];
    // 1) conception, 2) relecture qui rend une version encore fautive, 3) correction demandée par le contrôle du Studio.
    T.customDesignDeps.call = async (system, prompt) => { prompts.push(prompt); systems.push(system); return prompts.length === 3 ? { ...good, corrections: ["Offre par quantité retirée : les offres sont dans le bloc d'achat."] } : bad; };
    try {
      const r = await call("custom.design", ctx, { consigne: "Un matin d'hiver gris, j'ouvre le pot et l'été revient.", ambiance: "sombre" });
      expect(r.ok, r.summary).toBe(true);
      expect(prompts).toHaveLength(3);
      expect(systems[0]).toMatch(/directeur de création[^]*STRATÉGIE[^]*PARCOURS[^]*RYTHME[^]*EXEMPLE DU NIVEAU ATTENDU/);
      expect(systems[1]).toMatch(/directeur commercial[^]*sans complaisance/);
      expect(prompts[0]).toMatch(/DEMANDE DU CLIENT[^]*matin d'hiver gris/);
      expect(prompts[0]).toMatch(/AMBIANCE VOULUE PAR LE CLIENT : site sombre/);
      expect(systems[0]).toMatch(/AMBIANCE voulue par le client[^]*site sombre = surtout des sections à fond sombre/);
      expect(systems[0]).toMatch(/COHÉRENCE DU SITE/);
      expect(prompts[0]).toMatch(/BIBLIOTHÈQUE DE LA FAMILLE[^]*ouverture-photo-pleine · ouverture · fond photo · moyenne · 1 photo\(s\)/);
      expect(prompts[0]).not.toContain("questions-en-bulles-de-discussion"); // contenu de démonstration exclu
      expect(prompts[0]).toMatch(/Ce qu'elle n'a PAS[^]*avis clients/);
      expect(prompts[1]).toMatch(/CONCEPTION À RELIRE/);
      expect(prompts[2]).toMatch(/POINTS REFUSÉS PAR LE CONTRÔLE DU STUDIO[^]*Offre par quantité/);
      expect(r.data.relecture).toEqual(["Offre par quantité retirée : les offres sont dans le bloc d'achat."]);
      expect(r.data.visiteur).toMatch(/trop sucrées/);
      const t = loadCustomTheme(pid)!;
      expect(t.concept).toMatch(/l'été revient/);
      expect(t.pages[0].journey).toMatch(/Le visiteur arrive sur Accueil/);
      expect(t.pages[0].sections[0].intent).toMatch(/^Pourquoi ici : Répond au moment Ouverture photo pleine\. Ce qu'elle dit :[^]* Photos : Une table de cuisine un matin d'hiver/);
      expect(t.pages[0].sections[1].intent).not.toMatch(/Photos :/);
      expect(r.data.parcours[0].sections[0]).toMatch(/Ouverture photo pleine — Répond/);
      // Retour du propriétaire du 10 novembre 2026 : plus d'inversion clair / sombre, chaque section garde son fond d'origine.
      expect(prompts[0]).toMatch(/nos-engagements · confiance · fond clair · /);
      expect(prompts[0]).not.toMatch(/inversable/);
      expect(systems[0]).toMatch(/chaque section garde son fond d'origine/);
      const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
      const { loadProject } = await import("@/lib/projects");
      expect(renderCustomTheme(loadProject(pid), t, { nonce: "n" })).not.toMatch(/ct-inv|ct-dark|ct-light/);
      expect(getTool("custom.edit")!.args.safeParse({ uid: t.pages[0].sections[0].uid, ground: "sombre" }).success).toBe(false);
      // Le rédacteur reçoit la conception de la section et le parcours de la page.
      const B = await import("@/lib/syna-agent/custom-theme/brand");
      const w = B.sectionWritePrompt("Marque", "Accueil", "Ouverture photo pleine", "fait", "<h2>x</h2>", undefined, { intent: t.pages[0].sections[0].intent, journey: t.pages[0].journey });
      expect(w).toMatch(/PARCOURS DU VISITEUR SUR CETTE PAGE : Le visiteur arrive[^]*CONCEPTION DE CETTE SECTION : Pourquoi ici/);
    } finally { delete T.customDesignDeps.call; }
  });

  it("conception : chaque objection de la recherche doit trouver sa réponse dans une section posée ; rythme des fonds et densités", async () => {
    const D = await import("@/lib/syna-agent/custom-theme/design");
    const base = { visitor: "x".repeat(30), levers: ["a", "b"], concept: "x".repeat(30), header: "en-tete-classique", footer: "pied-de-page-complet", search: null, corrections: [],
      pages: [{ key: "product", label: "Fiche produit", journey: "x".repeat(30), sections: [{ section: "produit-vedette", why: "x".repeat(12), says: "x".repeat(12), photos: "aucune" }, { section: "histoire-du-produit-au-defilement", why: "x".repeat(12), says: "x".repeat(12), photos: "aucune" }, { section: "chiffres-cles", why: "x".repeat(12), says: "x".repeat(12), photos: "aucune" }] }] };
    const research = ["Une confiture artisanale, c'est trop sucré", "C'est trop cher pour un pot"];
    const g = D.designGaps({ ...base, objections: [{ objection: "C'est trop cher pour un pot de confiture", answer: "Le prix au petit-déjeuner…", page: "product", section: "comparatif-nous-les-autres" }] } as any, research);
    expect(g.blocking).toEqual(["objection de la recherche sans réponse dans la conception : « Une confiture artisanale, c'est trop sucré »", "l'objection « C'est trop cher pour un pot » doit trouver sa réponse dans « comparatif-nous-les-autres » sur la page « product », qui n'y est pas"]);
    // Les fonds suivent l'ambiance voulue par le client : deux fonds sombres à la suite ne sont pas un défaut en soi.
    expect(g.rhythm).toEqual([]);
  });

  it("une retouche n'est refusée que si elle CRÉE un point bloquant (un défaut ancien n'empêche pas de le corriger)", async () => {
    const { ctx, pid } = await project();
    await call("theme.family", ctx, { family: "classique" });
    expect((await call("custom.compose", ctx, fullSite("classique"))).ok).toBe(true);
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    // Défaut ancien (montage d'avant la règle) : une offre en section à part sur l'accueil.
    const cur = S.loadCustomTheme(pid)!;
    const home = cur.pages[0];
    S.saveCustomTheme(pid, S.applyStructure(cur, [{ op: "add", page: "home", section: sectionByRef("Offre par quantité")!.id }]));
    const offer = S.loadCustomTheme(pid)!.pages[0].sections.at(-1)!.uid;
    // Déplacer une autre section : permis, et le défaut restant est dit.
    const moved = await call("custom.structure", ctx, { ops: [{ op: "move", uid: home.sections[3].uid, at: 4 }] });
    expect(moved.ok, moved.summary).toBe(true);
    expect(moved.summary).toMatch(/Encore à corriger avant le montage à la marque : « Offre par quantité »/);
    // Le corriger en un seul appel (remplacer) : permis, plus rien à corriger.
    const fixed = await call("custom.structure", ctx, { ops: [{ op: "replace", uid: offer, section: "Galerie avec visionneuse" }] });
    expect(fixed.ok, fixed.summary).toBe(true);
    expect(fixed.summary).not.toMatch(/Encore à corriger/);
    // Une retouche qui crée un défaut (accueil sous 8 sections) est refusée, avec la façon de faire.
    const short = await call("custom.structure", ctx, { ops: [{ op: "remove", uid: home.sections[1].uid }, { op: "remove", uid: home.sections[2].uid }] });
    expect(short.ok).toBe(false);
    expect(short.summary).toMatch(/au moins 8/);
    expect(short.hint).toMatch(/UN SEUL appel/);
  });

  it("famille d'abord, puis montage, lecture, modification, désignation, structure, annulation et choix (gratuits)", async () => {
    const { ctx, pid } = await project();
    for (const n of ["custom.sections", "custom.compose", "custom.show", "custom.section", "custom.structure", "custom.edit", "custom.undo", "custom.choose"]) expect(getTool(n)!.estimate, n).toBeUndefined();
    expect(getTool("custom.photo")!.kind).toBe("generate");
    expect((await call("custom.sections", ctx, {})).summary).toMatch(/famille de sections pas encore choisie/);
    await call("theme.family", ctx, { family: "moderne", style: "sport-chic" });
    const lib = await call("custom.sections", ctx, { role: "produit vedette" });
    expect(Object.keys(lib.data.roles)).toEqual(["produit vedette"]);
    expect(lib.data.roles["produit vedette"]).toHaveLength(2); // « drop limité » (faux compte à rebours) écarté
    // Aucun thème de départ : une page obligatoire absente est refusée, rien n'est enregistré.
    const site = fullSite("moderne");
    const partial = await call("custom.compose", ctx, { ...site, pages: site.pages.filter((p) => p.key !== "legal") });
    expect(partial.ok).toBe(false);
    expect(partial.summary).toMatch(/page « Informations légales[^»]*» absente/);
    expect(loadCustomTheme(pid)).toBeNull();
    // Shopify tient lui-même le paiement et la confirmation : une page « commande » dans le thème est refusée.
    const withCheckout = await call("custom.compose", ctx, { ...site, pages: [...site.pages, { key: "commande", label: "Commande", sections: ["Commande en une page"] }] });
    expect(withCheckout.ok).toBe(false);
    expect(withCheckout.summary).toMatch(/page « Commande » en trop : sur Shopify/);
    const made = await call("custom.compose", ctx, site);
    expect(made.ok, made.summary).toBe(true);
    const card = made.data.customTheme;
    expect(card.href).toBe(`/api/projects/${pid}/custom-theme?studio=1&embed=1&rev=1`);
    expect(card.pages.map((p: any) => p.key)).toEqual(["home", "shop", "product", "cart", "compte", "aide", "journal", "article", "contact", "legal", "404"]);
    // Mélange de familles refusé : rien n'est enregistré.
    const mixed = await call("custom.compose", ctx, { ...site, pages: [{ key: "home", label: "Accueil", sections: ["Ouverture photo pleine"] }, ...site.pages.slice(1)] });
    expect(mixed.ok).toBe(false);
    expect(mixed.summary).toMatch(/Rien n'est enregistré[^]*mélange de familles/);
    expect(loadCustomTheme(pid)!.rev).toBe(1);
    // Lire puis modifier un texte désigné par le client.
    const hero = card.pages[0].sections[0].uid;
    // Coordonnées déjà enregistrées : données à SINA avec la section, jamais redemandées au client.
    (await import("@/lib/syna-agent/activity")).saveCompany(pid, { legalName: "Atelier Test SAS", address: "3 rue du Port, 13002 Marseille" });
    const read = await call("custom.section", ctx, { uid: hero });
    expect(read.data.html).toContain("L'été prend");
    expect(read.data.coordonneesEnregistrees).toMatchObject({ legalName: "Atelier Test SAS", address: "3 rue du Port, 13002 Marseille" });
    const ed = await call("custom.edit", ctx, { uid: hero, edits: [{ find: "L'été prend", replace: "La saison s'ouvre" }] });
    expect(ed.ok).toBe(true);
    expect(loadCustomTheme(pid)!.pages[0].sections[0].html).toContain("La saison s'ouvre");
    // Passage absent, script, règle hors section : refusés, rien ne change.
    expect((await call("custom.edit", ctx, { uid: hero, edits: [{ find: "texte qui n'existe pas", replace: "x" }] })).summary).toMatch(/Rien n'est modifié[^]*introuvable/);
    expect((await call("custom.edit", ctx, { uid: hero, edits: [{ find: "La saison s'ouvre", replace: "<script>alert(1)</script>" }] })).summary).toMatch(/balise refusée/);
    expect((await call("custom.edit", ctx, { uid: hero, css: "body{display:none}" })).summary).toMatch(/hors de la section/);
    // Élément désigné masqué puis réaffiché, mise en forme propre à la section.
    expect((await call("custom.edit", ctx, { uid: hero, hide: ["div:nth-child(1) > a:nth-child(2)"], css: ":scope h1{letter-spacing:.02em}" })).ok).toBe(true);
    expect(loadCustomTheme(pid)!.pages[0].sections[0].css).toMatch(/\[data-ct="s[0-9a-f]{8}"\] > div:nth-child\(1\) > a:nth-child\(2\)\{display:none!important\}[^]*letter-spacing/);
    expect((await call("custom.edit", ctx, { uid: hero, show: ["div:nth-child(1) > a:nth-child(2)"] })).ok).toBe(true);
    expect((await call("custom.edit", ctx, { uid: hero, hide: ["body"] })).ok).toBe(false);
    // Structure : remplacer, retirer, ajouter une page ; annuler revient en arrière.
    const shop = loadCustomTheme(pid)!.pages[1];
    const st = await call("custom.structure", ctx, { ops: [{ op: "replace", uid: shop.sections[1].uid, section: "Fenêtre de bienvenue" }, { op: "page", key: "boutiques", label: "Nos boutiques" }, { op: "add", page: "boutiques", section: "Tournée des boutiques éphémères" }] });
    expect(st.ok, st.summary).toBe(true);
    expect(loadCustomTheme(pid)!.pages.map((p) => p.key)).toContain("boutiques");
    const revBefore = loadCustomTheme(pid)!.rev;
    expect((await call("custom.undo", ctx, {})).ok).toBe(true);
    const back = loadCustomTheme(pid)!;
    expect(back.pages.map((p) => p.key)).not.toContain("boutiques");
    expect(back.rev).toBe(revBefore + 1);
    // Choix du client : refusé tant qu'une photo d'exemple reste (décision du 10 novembre 2026).
    const ch = await call("custom.choose", ctx, {});
    expect(ch.ok).toBe(false);
    expect(ch.summary).toMatch(/photo\(s\) d'exemple restent/);
    expect(loadCustomTheme(pid)!.chosen).toBeFalsy();
    // Toutes les photos remplacées (ici par une vraie image du projet) : le choix passe.
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const t = loadCustomTheme(pid)!;
    let n = 0;
    for (const x of S.allSections(t)) x.s.html = S.sectionHtml(x.s).replace(/(?:\.\/)?photos\/[\w-]+\.(?:webp|png|jpg)/g, () => `/api/files/photo-cree-${n++}`);
    S.saveCustomTheme(pid, t);
    const ok = await call("custom.choose", ctx, {});
    expect(ok.ok, ok.summary).toBe(true);
    expect(loadCustomTheme(pid)!.chosen).toBe(true);
    expect(ok.hint).toMatch(/textes ou photos d'exemple/);
  });

  it("photo : prix d'abord, puis créée (fausse génération, aucun appel réel) et posée à la place de la photo d'exemple", async () => {
    const { ctx, pid } = await project();
    await call("theme.family", ctx, { family: "moderne", style: "streetwear-neon" });
    expect((await call("custom.compose", ctx, fullSite("moderne"))).ok).toBe(true);
    T.customPhotoDeps.unit = () => 47_000;
    const sharp = (await import("sharp")).default;
    T.customPhotoDeps.make = async () => sharp({ create: { width: 64, height: 80, channels: 3, background: "#222" } }).png().toBuffer();
    try {
      const t = loadCustomTheme(pid)!;
      const { sectionHtml } = await import("@/lib/syna-agent/custom-theme/theme");
      const plain = /photos\/(?!sl-h\d)[a-z]{2}-[a-z0-9]+\.webp/; // photo pleine (le détourage est vérifié plus bas)
      const target = t.pages.flatMap((p) => p.sections).find((s) => plain.test(sectionHtml(s)))!;
      const file = sectionHtml(target).match(plain)![0];
      const est = await getTool("custom.photo")!.estimate!(ctx, { uid: target.uid, find: file, description: "Photo de mode éditoriale, cadrage en pied, fond béton gris, une veste noire portée.", ratio: "4:5" } as any);
      expect(est.maxMicro).toBe(47_000);
      const r = await call("custom.photo", ctx, { uid: target.uid, find: file, description: "Photo de mode éditoriale, cadrage en pied, fond béton gris, une veste noire portée.", ratio: "4:5" });
      expect(r.ok).toBe(true);
      const after = sectionHtml(loadCustomTheme(pid)!.pages.flatMap((p) => p.sections).find((s) => s.uid === target.uid)!);
      expect(after).not.toContain(file);
      expect(after).toContain(r.data.href);
      // Ouverture Moderne : le mannequin d'exemple est détouré ; la photo créée l'est aussi (fond uni demandé, puis
      // détourage du Studio, gratuit) ; si le détourage échoue, la photo pleine est posée et c'est dit (10 novembre 2026).
      const CP = await import("@/lib/syna-agent/custom-theme/cutout-photo");
      const hero = loadCustomTheme(pid)!.pages[0].sections.find((s) => sectionHtml(s).includes("photos/sl-h1.webp"))!;
      let prompt = "";
      T.customPhotoDeps.make = async (pr) => { prompt = pr; return sharp({ create: { width: 64, height: 80, channels: 3, background: "#E6E8EB" } }).png().toBuffer(); };
      CP.cutoutDeps.cut = async () => sharp({ create: { width: 64, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
      const cutDone = await call("custom.photo", ctx, { uid: hero.uid, find: "photos/sl-h1.webp", description: "Photo de mode éditoriale en pied, un sweat orange porté, sujet entier, sans décor.", ratio: "4:5" });
      expect(cutDone.ok, cutDone.summary).toBe(true);
      expect(cutDone.summary).toMatch(/Photo créée et détourée/);
      expect(prompt).toContain(CP.FOND_A_DETOURER);
      const { getAsset, assetData } = await import("@/lib/library");
      expect((await sharp(assetData(getAsset(cutDone.data.assetId)!)).stats()).channels[3].mean).toBeLessThan(10); // fond transparent
      CP.cutoutDeps.cut = async () => { throw new Error("modèle indisponible"); };
      const hero2 = loadCustomTheme(pid)!.pages.flatMap((p) => p.sections).find((s) => /photos\/sl-h\d\.webp/.test(sectionHtml(s)));
      if (hero2) {
        const failed = await call("custom.photo", ctx, { uid: hero2.uid, find: sectionHtml(hero2).match(/photos\/sl-h\d\.webp/)![0], description: "Photo de mode éditoriale en pied, un sweat orange porté, sujet entier.", ratio: "4:5" });
        expect(failed.summary).toMatch(/détourage impossible : photo pleine posée/);
      }
      expect((await CP.cutoutPhoto(Buffer.from("x"))).problem).toMatch(/détourage impossible/);
      delete CP.cutoutDeps.cut;
    } finally { delete T.customPhotoDeps.unit; delete T.customPhotoDeps.make; }
  });

  it("ouverture Moderne « mot géant » : sur le site d'un client, jamais les mannequins d'exemple écrits par le script", () => {
    const js = fs.readFileSync(path.join(process.cwd(), "public/sections/library.js"), "utf8");
    expect(js).toContain('var S1d=[["sl-h1.webp"');
    expect(js).toMatch(/S1=\(m0&&!\/\(\^\|\\\/\)photos\\\/sl-h\\d\\\.webp\$\/\.test/);
    expect(js).toContain("im.src=ps(x[0]);");
  });

  it("carte d'accord d'une dépense : l'action en clair et son prix en % du budget, jamais le nom de l'outil (essai réel du 9 novembre)", async () => {
    const { ctx, pid } = await project();
    const { confirmationText } = await import("@/lib/syna-agent/loop");
    const text = await fr(() => confirmationText(getTool("custom.build")!, { photos: true, images: "sina" }, ctx, ctx.user.id, pid, { label: "thème sur mesure monté à ta marque : 34 sections écrites, 48 photos créées", probableMicro: 6_330_000, maxMicro: 10_460_000 }));
    expect(text).toMatch(/^Thème sur mesure monté à ta marque : 34 sections écrites, 48 photos créées\./);
    expect(text).toMatch(/Coût probable : .*%.* ; au plus .*%/);
    expect(text).not.toMatch(/custom\.build|\{|€/);
  });
});

describe("thème sur mesure : montage à la marque (textes et photos), sans aucun appel réel", async () => {
  process.env.STUDIO_SYNA_AGENT = "1";
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const { loadCustomTheme, allSections, sectionHtml } = await import("@/lib/syna-agent/custom-theme/theme");
  const fr = <R,>(fn: () => Promise<R> | R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = async (name: string, ctx: any, args: unknown): Promise<any> => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  it("devis d'abord, puis chaque section réécrite pour la marque et chaque photo d'exemple remplacée ; le thème est en place pour la Boutique", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des bougies parfumées coulées à la main." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "3 bougies" }, { field: "market", value: "France." },
      { field: "price", value: "25 €" }, { field: "difference", value: "Cire de colza." }, { field: "taste", status: "none" }, { field: "photos", value: "Non." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    expect((await call("custom.build", ctx, {})).summary).toMatch(/style|famille/i); // la famille d'abord
    await call("theme.family", ctx, { family: "classique" });
    expect((await call("custom.build", ctx, {})).summary).toMatch(/conçois d'abord toutes les pages/); // puis tout le site, monté de A à Z
    const composed = await call("custom.compose", ctx, fullSite("classique"));
    expect(composed.ok, composed.summary).toBe(true);
    // Un thème qui enfreint une règle (page de paiement Shopify ajoutée) n'a jamais de devis : SINA le corrige d'abord.
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const cur = S.loadCustomTheme(pid)!;
    S.saveCustomTheme(pid, S.applyStructure(cur, [{ op: "page", key: "commande", label: "Commande" }, { op: "add", page: "commande", section: "commande-pas-a-pas" }]));
    ctx.projectId = pid;
    await expect(fr(() => getTool("custom.build")!.estimate!(ctx, {}))).rejects.toThrow(/Thème à corriger avant le devis : page « Commande » en trop/);
    S.saveCustomTheme(pid, cur);
    T.customPhotoDeps.unit = () => 50_000;
    try {
      ctx.projectId = pid;
      const est = await fr(() => getTool("custom.build")!.estimate!(ctx, {}));
      expect(est.maxMicro).toBeGreaterThan(est.probableMicro!);
      expect(est.label).toMatch(/sections écrites, \d+ photos/);
      const r = await call("custom.build", ctx, {});
      expect(r.ok).toBe(true);
      expect(r.jobs).toHaveLength(1);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs[0]);
      expect(job.type).toBe("syna.custom.brand");
      expect(JSON.parse(job.payload)).toMatchObject({ projectId: pid, photos: true });
      expect(r.data.customTheme.boutique).toBe(`/studio/${pid}/boutique`);
      // Exécution de la tâche avec une fausse écriture et une fausse photo (aucun appel réel).
      const sharp = (await import("sharp")).default;
      let writes = 0, photos = 0, expected = 0;
      // Plan des textes de tout le site d'abord (un seul appel) : chaque section reçoit SON titre et SES faits.
      let plans = 0;
      B.customBrandDeps.plan = async (prompt) => {
        plans++;
        const uids = [...prompt.matchAll(/^- (s[0-9a-f]{8}) · /gm)].map((m) => m[1]);
        expect(uids.length).toBeGreaterThan(5);
        expect(prompt).not.toMatch(/mot pour mot/);
        return { promesse: "La bougie qui sent le jardin après la pluie.", voix: "Tutoiement, phrases courtes.", menu: ["Nos bougies", "Notre atelier", "Contact"],
          sections: uids.map((uid, i) => ({ uid, message: `Message ${i}`, titre: `Titre unique ${i}`, bouton: i ? null : "Choisir ma bougie", faits: i === 1 ? ["Cire de colza"] : [] })) };
      };
      B.customBrandDeps.write = async (prompt) => {
        writes++;
        expect(prompt).toContain("Marque : «");
        expect(prompt).toMatch(/PLAN DES TEXTES DU SITE[^]*CETTE section : message : Message \d+ ; titre : « Titre unique \d+ »/);
        expect(prompt).toContain("Menu principal : Nos bougies · Notre atelier · Contact");
        const html = prompt.slice(prompt.indexOf("HTML actuel"));
        const h = html.match(/<(h[1-4])[^>]*>([^<]{3,80})</);
        const imgs = [...new Set([...html.matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((m) => m[0]))];
        expected += imgs.filter((f) => !/photos\/(carte|map|plan)-/.test(f)).length;
        // + une photo d'une carte que le rédacteur a retirée : jamais créée, jamais payée.
        // Liens : vers une vraie page (gardé), vers une page qui n'existe pas (signalé, jamais posé).
        const links = h ? [{ text: `Texte de la marque ${writes}`, to: "shop" }, { text: `Texte de la marque ${writes}`, to: "nulle-part" }] : [];
        return { edits: h ? [{ find: `>${h[2]}<`, replace: `>Texte de la marque ${writes}<` }] : [], links, photos: [...imgs, "photos/carte-produit-retiree.webp", "photos/sixieme-produit.webp"].map((f) => ({ find: f, description: "Photo de bougie en verre ambré sur une table en chêne, lumière douce du soir.", ratio: "4:5" as const, product: null })) };
      };
      B.customBrandDeps.photo = async () => { photos++; return sharp({ create: { width: 40, height: 50, channels: 3, background: "#a86" } }).png().toBuffer(); };
      const fake: any = { job: { id: job.id }, payload: JSON.parse(job.payload), checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() };
      // Pendant qu'un montage attend ou tourne, une seconde demande est refusée (jamais deux montages payés).
      expect((await call("custom.build", ctx, {})).summary).toMatch(/montage de ton thème est déjà en cours/);
      const beforeBuild = allSections(loadCustomTheme(pid)!).map((x) => sectionHtml(x.s));
      const out: any = await fr(() => B.runCustomBrandJob(fake));
      (await import("@/lib/db")).run("UPDATE jobs SET status='done' WHERE id=?", job.id); // tâche finie (exécutée ici à la main)
      // Une seconde demande pendant qu'un montage tourne est refusée (jamais deux montages payés) : vérifié plus bas.
      const t = loadCustomTheme(pid)!;
      expect(writes).toBe(allSections(t).length);
      expect(plans).toBe(1);
      // Le client n'aime pas les textes : rewrite réécrit TOUT le site (même les sections déjà écrites), textes seulement.
      const re = await fr(() => getTool("custom.build")!.estimate!(ctx, { photos: false, rewrite: true }));
      expect(re.label).toMatch(/textes de tout ton site réécrits/);
      writes = 0; plans = 0;
      // La demande du client (ses mots) arrive au plan et à chaque section.
      const seen: string[] = [];
      const plan0 = B.customBrandDeps.plan!, write0 = B.customBrandDeps.write!;
      B.customBrandDeps.plan = async (prompt, k) => { seen.push(prompt); return plan0(prompt, k); };
      B.customBrandDeps.write = async (prompt, k) => { seen.push(prompt); return write0(prompt, k); };
      const again: any = await fr(() => B.runCustomBrandJob({ ...fake, job: { id: `${job.id}-re` }, payload: { ...fake.payload, photos: false, rewrite: true, consigne: "Un soir d'hiver, la bougie rallume l'été." } }));
      expect(seen.length).toBe(allSections(t).length + 1);
      for (const x of seen) expect(x).toContain("DEMANDE DU CLIENT POUR SES TEXTES (prioritaire, à suivre dans tout le site, ses mots) : « Un soir d'hiver, la bougie rallume l'été. »");
      B.customBrandDeps.plan = plan0; B.customBrandDeps.write = write0;
      expect(plans).toBe(1);
      expect(writes).toBe(allSections(t).length);
      expect(again.sections).toBe(writes);
      writes = allSections(t).length;
      expect(B.SECTION_WRITE_SYSTEM).toMatch(/Jamais un ordre au lecteur/);
      expect(B.SECTION_WRITE_SYSTEM).toMatch(/coordonnées de la marque[^]*restent TOUJOURS/);
      expect(B.SITE_PLAN_SYSTEM).toMatch(/n'apparaît qu'UNE fois sur tout le site/);
      expect(B.SECTION_WRITE_SYSTEM).not.toContain("${COPY_CRAFT}");
      expect(out.sections).toBe(writes);
      expect(photos).toBeGreaterThan(0);
      expect(out.photosMade).toBe(photos);
      expect(photos).toBe(expected);
      // Chaque bouton écrit mène à une vraie page ; une destination inexistante est signalée et jamais posée.
      const linked = allSections(loadCustomTheme(pid)!).filter((x) => x.s.links);
      expect(linked.length).toBeGreaterThan(0);
      for (const x of linked) for (const to of Object.values(x.s.links!)) expect(to).toBe("shop");
      expect(out.problems.some((x: string) => /bouton\(s\) vers une page qui n'existe pas/.test(x))).toBe(true);
      const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
      const { loadProject } = await import("@/lib/projects");
      const page = renderCustomTheme(loadProject(pid), loadCustomTheme(pid)!, { nonce: "n" });
      expect(page).toMatch(/"Texte de la marque \d+":"shop"/);
      // Nom des photos : la page et ce qu'elles montrent, jamais le nom de la photo d'exemple remplacée.
      const names = (await import("@/lib/db")).all<{ name: string }>("SELECT name FROM assets WHERE project_id=? AND origin='generated' AND role='site'", pid).map((x) => x.name);
      expect(names.length).toBe(photos);
      for (const n of names) expect(n).toMatch(/^site-[a-z0-9-]+-bougie-verre-ambre-table-chene\.png$/);
      // la carte n'est jamais une photo : la vraie carte s'ouvre à l'adresse du client (realMap)
      for (const x of allSections(t)) expect(sectionHtml(x.s).replace(/photos\/(carte|map|plan)-[\w-]*\.(webp|jpg|png)/g, ""), x.place).not.toMatch(/photos\/[a-z]+-?[a-z0-9]*\.(webp|jpg|png)/);
      expect(allSections(t).filter((x) => x.s.clientTexts).length).toBeGreaterThan(0);
      // Annuler : un seul point par montage (ici deux montages : la réécriture, puis le premier), jamais photo par photo.
      expect((await call("custom.undo", ctx, {})).ok).toBe(true);
      expect((await call("custom.undo", ctx, {})).ok).toBe(true);
      expect(allSections(loadCustomTheme(pid)!).map((x) => sectionHtml(x.s))).toEqual(beforeBuild);
      // Reprise d'une tâche interrompue : une section déjà enregistrée n'est pas réappliquée (aucun « non remplacé »).
      const done = new Map<string, unknown>();
      const resumable = { ...fake, job: { id: `${job.id}-resume` }, payload: { ...fake.payload, photos: false, rewrite: true }, step: async (k: string, fn: () => Promise<unknown>) => done.has(k) ? done.get(k) : (done.set(k, await fn()), done.get(k)) };
      await fr(() => B.runCustomBrandJob(resumable));
      const resumed: any = await fr(() => B.runCustomBrandJob(resumable));
      expect(resumed.failedEdits).toBe(0);
      expect(resumed.problems.filter((x: string) => /non remplacé/.test(x))).toEqual([]);
      // Famille changée après le montage : plus de montage ni de photo tant qu'un thème n'est pas conçu dans sa famille.
      await call("theme.family", ctx, { family: "moderne", style: "sport-chic" });
      expect((await call("custom.build", ctx, {})).summary).toMatch(/il faut d'abord concevoir un nouveau thème dans sa famille/);
    } finally { delete T.customPhotoDeps.unit; delete B.customBrandDeps.plan; delete B.customBrandDeps.write; delete B.customBrandDeps.photo; }
  });

  it("images : SINA dit combien il en faut ; celles du client d'abord ; jamais assez → refus et choix au client ; « mix » : SINA crée seulement les autres", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des savons artisanaux." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "3 savons" }, { field: "market", value: "France." },
      { field: "price", value: "8 €" }, { field: "difference", value: "Saponification à froid." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    await call("theme.family", ctx, { family: "classique" });
    expect((await call("custom.compose", ctx, fullSite("classique"))).ok).toBe(true);
    const need = await call("custom.images", ctx, {});
    expect(need.ok).toBe(true);
    const n = need.data.imagesNecessaires as number;
    expect(n).toBeGreaterThan(3);
    expect(need.hint).toMatch(/tes images, ou je les crée[^]*qu'il en faut \d+[^]*mix[^]*sina/);
    // Deux images envoyées par le client.
    const sharp = (await import("sharp")).default;
    const { saveAsset } = await import("@/lib/library");
    const mine: string[] = [];
    for (const c of ["#335", "#553"]) mine.push((await saveAsset({ projectId: pid, userId: user.id, data: await sharp({ create: { width: 900, height: 900, channels: 3, background: c } }).png().toBuffer(), name: `client-${c}.png`, mime: "image/png", role: "original", origin: "upload" })).id);
    expect((await call("custom.images", ctx, {})).data.imagesDuClient.map((x: any) => x.id)).toEqual(mine);
    // « Seulement mes images » sans en avoir assez : rien n'est lancé, SINA propose les autres choix.
    const short = await call("custom.build", ctx, { images: "client", clientAssets: mine });
    expect(short.ok).toBe(false);
    expect(short.summary).toMatch(new RegExp(`Il faut ${n} images et le client en a donné 2`));
    expect(short.hint).toMatch(/mix[^]*sina/);
    expect((await call("custom.build", ctx, { images: "mix", clientAssets: ["inconnue"] })).summary).toMatch(/Images inconnues/);
    T.customPhotoDeps.unit = () => 50_000;
    try {
      ctx.projectId = pid;
      const mix = await fr(() => getTool("custom.build")!.estimate!(ctx, { images: "mix", clientAssets: mine }));
      const all = await fr(() => getTool("custom.build")!.estimate!(ctx, { images: "sina" }));
      const { galleryCheckMaxMicro } = await import("@/lib/syna-agent/custom-theme/gallery");
      expect(all.maxMicro - mix.maxMicro).toBe(2 * (50_000 + galleryCheckMaxMicro())); // deux photos (et leurs contrôles) de moins
      expect(mix.label).toMatch(new RegExp(`${n - 2} photos créées, 2 de tes images posées`));
      const r = await call("custom.build", ctx, { images: "mix", clientAssets: mine });
      expect(r.ok).toBe(true);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs[0]);
      expect(JSON.parse(job.payload)).toMatchObject({ images: "mix", clientAssets: mine });
      let made = 0;
      B.customBrandDeps.plan = async () => ({ promesse: "Le savon doux.", voix: "Simple.", menu: [], sections: [] });
      B.customBrandDeps.write = async (prompt) => ({ edits: [], links: [], photos: [...new Set([...prompt.slice(prompt.indexOf("HTML actuel")).matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((m) => m[0]))].map((f) => ({ find: f, description: "Photo d'un savon blanc sur une pierre grise, lumière douce du matin.", ratio: "1:1" as const, product: null })) });
      B.customBrandDeps.photo = async () => { made++; return sharp({ create: { width: 20, height: 20, channels: 3, background: "#999" } }).png().toBuffer(); };
      const out: any = await fr(() => B.runCustomBrandJob({ job: { id: job.id }, payload: JSON.parse(job.payload), checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
      expect(out.photosClient).toBe(2);
      expect(made).toBe(out.photosMade);
      expect(out.photosClient + out.photosMade).toBe(n);
      const html = allSections(loadCustomTheme(pid)!).map((x) => sectionHtml(x.s)).join("");
      for (const id of mine) expect(html).toContain(id);
    } finally { delete T.customPhotoDeps.unit; delete B.customBrandDeps.plan; delete B.customBrandDeps.write; delete B.customBrandDeps.photo; }
  });

  it("montage en deux fois sous un budget serré (essai Éclat de thé) : textes d'abord sans aucune photo créée, puis les photos décrites", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des thés en sachet." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "6 thés" }, { field: "market", value: "France." },
      { field: "price", value: "8 €" }, { field: "difference", value: "Bio." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    await call("theme.family", ctx, { family: "classique" });
    expect((await call("custom.compose", ctx, fullSite("classique"))).ok).toBe(true);
    T.customPhotoDeps.unit = () => 50_000;
    const sharp = (await import("sharp")).default;
    try {
      ctx.projectId = pid;
      // Devis : aucune photo comptée, ni au plafond ni au probable ; « tes images seulement » n'exige plus une image par emplacement.
      const est = await fr(() => getTool("custom.build")!.estimate!(ctx, { images: "client", newPhotos: false }));
      const txt = await fr(() => getTool("custom.build")!.estimate!(ctx, { photos: false }));
      expect(est.maxMicro).toBe(txt.maxMicro);
      expect(est.label).toMatch(/aucune photo créée/);
      const r = await call("custom.build", ctx, { images: "client", newPhotos: false });
      expect(r.ok).toBe(true);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs[0]);
      expect(JSON.parse(job.payload)).toMatchObject({ photos: true, newPhotos: false });
      let made = 0;
      B.customBrandDeps.plan = async () => ({ promesse: "Le thé doux.", voix: "Simple.", menu: [], sections: [] });
      B.customBrandDeps.write = async (prompt) => ({ edits: [], links: [], photos: [...new Set([...prompt.slice(prompt.indexOf("HTML actuel")).matchAll(/photos\/[\w-]+\.(?:webp|png|jpg)/g)].map((m) => m[0]))].map((f) => ({ find: f, description: "Photo d'une tasse de thé fumante sur une table en bois, lumière douce du matin.", ratio: "1:1" as const, product: null })) });
      B.customBrandDeps.photo = async () => { made++; return sharp({ create: { width: 20, height: 20, channels: 3, background: "#999" } }).png().toBuffer(); };
      const run = (id: string, payload: object) => fr(() => B.runCustomBrandJob({ job: { id }, payload, checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
      const first: any = await run(job.id, JSON.parse(job.payload));
      expect(made).toBe(0);
      expect(first.photosMade).toBe(0);
      expect(first.photosLeft).toBeGreaterThan(0);
      expect(first.problems.join(" ")).toMatch(/photo\(s\) d'exemple encore à remplacer/);
      const briefs = allSections(loadCustomTheme(pid)!).filter((x) => x.s.photoBriefs?.length);
      expect(briefs.length).toBeGreaterThan(0);
      // Second montage : même si le rédacteur ne répond pas, les photos décrites au premier montage sont créées.
      B.customBrandDeps.write = async () => { throw new Error("rédacteur indisponible"); };
      const second: any = await run(`${job.id}-photos`, { ...JSON.parse(job.payload), images: "sina", newPhotos: true });
      expect(second.photosMade).toBe(first.photosLeft);
      expect(made).toBe(first.photosLeft);
    } finally { delete T.customPhotoDeps.unit; delete B.customBrandDeps.plan; delete B.customBrandDeps.write; delete B.customBrandDeps.photo; }
  });

  it("montage en deux fois où le rédacteur n'a décrit aucune photo (essai Éclat de thé) : descriptions écrites puis photos créées, devis compris", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des thés en sachet." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "1 thé" }, { field: "market", value: "France." },
      { field: "price", value: "8 €" }, { field: "difference", value: "Bio." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    await call("theme.family", ctx, { family: "classique" });
    expect((await call("custom.compose", ctx, fullSite("classique"))).ok).toBe(true);
    const sharp = (await import("sharp")).default;
    T.customPhotoDeps.unit = () => 50_000;
    const run = (id: string, payload: object) => fr(() => B.runCustomBrandJob({ job: { id }, payload, checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
    try {
      // Textes seuls, et le rédacteur ne décrit AUCUNE photo (il a lu « sans créer de photo »).
      B.customBrandDeps.plan = async () => ({ promesse: "Le thé doux.", voix: "Simple.", menu: [], sections: [] });
      B.customBrandDeps.seo = async () => ({ seo: [] });
      B.customBrandDeps.write = async (prompt) => { const m = /<h[1-4][^>]*>([^<]{4,})</.exec(prompt.slice(prompt.indexOf("HTML actuel"))); return { edits: m ? [{ find: m[1], replace: `${m[1]} (marque)` }] : [], links: [], photos: [] }; };
      await run(`txt-${Date.now()}`, { projectId: pid, capMicro: 10_000_000, photos: false });
      const t = loadCustomTheme(pid)!;
      for (const x of allSections(t)) x.s.clientTexts = true; // toutes écrites
      (await import("@/lib/syna-agent/custom-theme/theme")).saveCustomTheme(pid, t, { history: false });
      // Devis du second temps : les photos sans description sont comptées (jamais un plafond à zéro).
      ctx.projectId = pid;
      const est = await fr(() => getTool("custom.build")!.estimate!(ctx, { images: "sina" }));
      const left = B.photoSlots(loadCustomTheme(pid)!, { productPhotos: true }).filter((x) => x.kind === "ambiance").length;
      expect(left).toBeGreaterThan(3);
      expect(est.maxMicro).toBeGreaterThan(left * 50_000);
      // Second temps : les descriptions manquantes sont écrites, puis les photos créées.
      let briefs = 0, made = 0;
      B.customBrandDeps.photoBrief = async (prompt) => { briefs++; const files = /PHOTOS À DÉCRIRE \(source exacte\) : (.*)$/m.exec(prompt)![1].split(", "); return { photos: files.map((f) => ({ find: f, description: "Photographie d'ambiance : une théière en verre sur une table en bois, lumière du matin.", ratio: "1:1" as const, product: null })) }; };
      B.customBrandDeps.photo = async () => { made++; return sharp({ create: { width: 20, height: 20, channels: 3, background: "#999" } }).png().toBuffer(); };
      // D'abord l'accueil seulement (décision du propriétaire : photos de l'accueil et de la fiche produit pour tenir le budget).
      const homeSlots = B.photoSlots(loadCustomTheme(pid)!, { productPhotos: true }).filter((x) => x.kind === "ambiance" && x.place === "Accueil").length;
      const estHome = await fr(() => getTool("custom.build")!.estimate!(ctx, { images: "sina", pages: ["home"] }));
      expect(estHome.maxMicro).toBeLessThan(est.maxMicro);
      const first: any = await run(`ph-home-${Date.now()}`, { projectId: pid, capMicro: estHome.maxMicro, photos: true, images: "sina", pages: ["home"] });
      expect(first.photosMade).toBeGreaterThanOrEqual(homeSlots);
      // Seul l'accueil a reçu ses photos ; la fiche produit garde les siennes d'exemple (signalées).
      const after = loadCustomTheme(pid)!;
      const sample = (key: string) => after.pages.find((pg) => pg.key === key)!.sections.map((x) => sectionHtml(x)).join("").match(/photos\/[\w-]+\.(?:webp|png|jpg)/g)?.length ?? 0;
      expect(sample("home")).toBe(0);
      expect(sample("product")).toBeGreaterThan(0);
      expect(first.problems.join(" ")).toMatch(/photo\(s\) d'exemple encore en place/);
      const out: any = await run(`ph-${Date.now()}`, { projectId: pid, capMicro: est.maxMicro, photos: true, images: "sina" });
      expect(briefs).toBeGreaterThan(0);
      expect(first.photosMade + out.photosMade).toBe(made);
      expect(made).toBeGreaterThanOrEqual(left);
      expect(out.problems.join(" ")).not.toMatch(/photo\(s\) d'exemple encore en place/);
    } finally { delete T.customPhotoDeps.unit; for (const k of ["plan", "seo", "write", "photo", "photoBrief"] as const) delete (B.customBrandDeps as any)[k]; }
  });

  it("photos produit sur les emplacements produit seulement ; sachet posé par erreur en ouverture → scène créée avec lui en modèle", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des thés en sachet." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "1 thé" }, { field: "market", value: "France." },
      { field: "price", value: "8 €" }, { field: "difference", value: "Bio." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    await call("theme.family", ctx, { family: "classique" });
    expect((await call("custom.compose", ctx, fullSite("classique"))).ok).toBe(true);
    const sharp = (await import("sharp")).default;
    const { saveAsset } = await import("@/lib/library");
    const { createProduct } = await import("@/lib/products/catalog");
    const pouch = (await saveAsset({ projectId: pid, userId: user.id, data: await sharp({ create: { width: 900, height: 900, channels: 3, background: "#cba" } }).png().toBuffer(), name: "sachet.png", mime: "image/png", role: "original", origin: "upload" })).id;
    createProduct(pid, { title: "Jasmin délicat", price: 850, images: [{ assetId: pouch }] } as any);
    // Une photo de fiche produit n'est jamais proposée comme « image du client » pour l'ambiance.
    expect(B.clientImages(pid).map((x) => x.id)).not.toContain(pouch);
    // Vignettes (lot, panier, recherche, bouton d'achat) et « Photo produit » : la vraie photo ; une scène : créée.
    expect(B.showsProductAlone({ role: "lot", title: "Complète ta commande" }, "Photo d'ambiance")).toBe(true);
    expect(B.showsProductAlone({ role: "mise en avant", title: "Scène achetable" }, "Photo produit au format carré, sachet seul.")).toBe(true);
    expect(B.showsProductAlone({ role: "mise en avant", title: "Scène achetable" }, "Photo d'ambiance lifestyle, cuisine au matin.")).toBe(false);
    // Le sachet posé par erreur sur la photo d'ouverture (essai Éclat de thé).
    let t = loadCustomTheme(pid)!;
    const hero = t.pages[0].sections.find((x) => /photos\/[\w-]+\.(?:webp|png|jpg)/.test(sectionHtml(x)) && !B.showsProductAlone(libSection(x.id)!, ""))!;
    const f = /photos\/[\w-]+\.(?:webp|png|jpg)/.exec(sectionHtml(hero))![0];
    for (const x of allSections(t)) x.s.clientTexts = true;
    hero.html = sectionHtml(hero).split(f).join(`/api/files/${pouch}`);
    hero.photoBriefs = [{ find: f, description: "Photographie d'ambiance, format paysage : une théière fumante sur un bureau au matin, le sachet Jasmin délicat posé à côté.", ratio: "1:1", product: "Jasmin délicat" }];
    (await import("@/lib/syna-agent/custom-theme/theme")).saveCustomTheme(pid, t, { history: false });
    // Compté au devis comme une photo d'ambiance à créer.
    expect(B.photoSlots(loadCustomTheme(pid)!, { productPhotos: true, productIds: new Set([pouch]) }).filter((x) => x.uid === hero.uid && x.file.startsWith(`fichier:${pouch}`) && x.kind === "ambiance")).toHaveLength(1);
    T.customPhotoDeps.unit = () => 50_000;
    const refs: (Buffer | null)[] = [];
    try {
      B.customBrandDeps.photo = async (_p, ref) => { refs.push(ref); return sharp({ create: { width: 20, height: 20, channels: 3, background: "#999" } }).png().toBuffer(); };
      const out: any = await fr(() => B.runCustomBrandJob({ job: { id: `job-heal-${Date.now()}` }, payload: { projectId: pid, capMicro: 10_000_000, photos: true, images: "sina", clientAssets: [pouch] }, checkpoint: {}, progress: () => undefined, step: async (_k: string, fn: () => Promise<unknown>) => fn() } as any));
      expect(out.problems.join(" ")).toMatch(/1 photo\(s\) de produit retirée\(s\) d'un emplacement d'ambiance/);
      expect(out.photosClient).toBe(0); // le sachet n'est jamais reposé en ambiance, même passé dans clientAssets
      expect(refs.some((r) => r !== null)).toBe(true); // la scène est créée avec le vrai sachet en modèle
      t = loadCustomTheme(pid)!;
      expect(sectionHtml(t.pages[0].sections.find((x) => x.uid === hero.uid)!)).not.toContain(pouch);
    } finally { delete T.customPhotoDeps.unit; delete B.customBrandDeps.photo; }
  });

  it("coordonnées changées après le montage : l'ancien e-mail écrit dans le site est remplacé partout (essai Éclat de thé)", async () => {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des thés en sachet." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien." }, { field: "audience", value: "Adultes." }, { field: "image", value: "Doux." }, { field: "setup", value: "1 thé" }, { field: "market", value: "France." },
      { field: "price", value: "8 €" }, { field: "difference", value: "Bio." }, { field: "taste", status: "none" }, { field: "photos", value: "Oui." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    await call("start.confirm", ctx, {});
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    await call("theme.family", ctx, { family: "classique" });
    expect((await call("custom.compose", ctx, fullSite("classique"))).ok).toBe(true);
    const { saveCompany } = await import("@/lib/syna-agent/activity");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    saveCompany(pid, { email: "contact@ancien-nom.fr" });
    const t = loadCustomTheme(pid)!;
    const foot = allSections(t).find((x) => x.place === "pied de page") ?? allSections(t)[0];
    foot.s.html = `${sectionHtml(foot.s)}<p>Écris à contact@ancien-nom.fr</p>`;
    S.saveCustomTheme(pid, t, { history: false });
    saveCompany(pid, { email: "bonjour@eclat-de-the.example" });
    const html = allSections(loadCustomTheme(pid)!).map((x) => sectionHtml(x.s)).join("");
    expect(html).not.toContain("contact@ancien-nom.fr");
    expect(html).toContain("Écris à bonjour@eclat-de-the.example");
  });

  it("un remplacement qui ne s'applique pas est compté, jamais deviné ; aucun script n'entre", () => {
    const w = { edits: [{ find: "<h2>Bonjour</h2>", replace: "<h2>Salut</h2>" }, { find: "absent", replace: "x" }, { find: "<p>a</p>", replace: "<script>x</script>" }], photos: [] };
    expect(B.applyWrite("<h2>Bonjour</h2><p>a</p>", { ...w, links: [] })).toEqual({ html: "<h2>Salut</h2><p>a</p>", failed: 2, applied: 1 });
  });
});

describe("thème sur mesure : nom des photos créées", () => {
  it("une photo créée porte la page et ce qu'elle montre, jamais le nom de la photo d'exemple remplacée", async () => {
    const { sitePhotoName } = await import("@/lib/syna-agent/custom-theme/brand");
    const n = sitePhotoName("Accueil", "Grande photo d'ambiance bord à bord pour une marque de confiture artisanale. Au premier plan, trois pots.");
    expect(n).toMatch(/^site-accueil-marque-confiture-artisanale-[a-z-]+\.png$/);
    expect(n).not.toMatch(/rooibos|jasmin|theme-sur-mesure/);
    expect(sitePhotoName("", "")).toBe("site-page-photo.png");
  });
});

describe("thème sur mesure : émotion et images magnifiques (retour du propriétaire du 9 novembre)", () => {
  it("photo derrière un texte : le sujet va du côté opposé au texte, le texte se pose sur la partie calme", async () => {
    const B = await import("@/lib/syna-agent/custom-theme/brand");
    const hero = sectionByRef("ouverture-photo-pleine")!;
    const { inlineBackgrounds } = await import("@/lib/syna-agent/custom-theme/library");
    const html = inlineBackgrounds(hero.html);
    const line = B.textPlacementLine(html, "photos/hero.jpg", hero.does);
    expect(line).toMatch(/PAR-DESSUS la partie gauche[^]*tiers droite/);
    expect(B.textPlacementLine('<div style="background-image:url(/api/files/abc)"></div>', "/api/files/abc", "Grande photo. À droite : le titre.")).toMatch(/partie droite[^]*tiers gauche/);
    // Photo qui n'est pas derrière un texte (carte produit) : aucune consigne de placement.
    expect(B.textPlacementLine('<img src="photos/a.jpg">', "photos/a.jpg", "À gauche : le titre.")).toBe("");
  });

  it("Classique a aussi sa direction artistique (art de vivre, scène qui remplit le cadre) ; écriture : l'émotion d'abord", async () => {
    const F = await import("@/lib/syna-agent/section-families");
    const u = F.siteArtUniverse({ family: "classique", style: "classique" } as any, { people: false })!;
    expect(u.id).toBe("classique-art-de-vivre");
    expect(u.composition.join(" ")).toMatch(/jamais un fond uni/);
    expect(u.idea).toMatch(/sans aucune personne/);
    // Les publications et publicités ne changent pas (familyArtUniverse reste propre à Moderne).
    expect(F.familyArtUniverse({ family: "classique", style: "classique" } as any, { people: false })).toBeNull();
    const B = await import("@/lib/syna-agent/custom-theme/brand");
    expect(B.COPY_CRAFT).toMatch(/L'ÉMOTION D'ABORD/);
    expect(B.COPY_CRAFT).toMatch(/boutons qui vendent portent le désir/);
    const C = await import("@/lib/syna-agent/mockup-code/code-mockup");
    expect(C.codePhotoPrompt({ id: "x", description: "Une scène.", ratio: "16:9" } as any, { name: "M", logo: false, product: false })).toMatch(/photo magnifique[^]*jamais un fond uni/);
    expect(C.codePhotoPrompt({ id: "x", description: "Un pot.", ratio: "1:1", background: "#ffffff" } as any, { name: "M", logo: false, product: false })).not.toMatch(/photo magnifique/);
  });
});

describe("thème sur mesure : pages pleines", () => {
  it("accueil au moins 8 sections, fiche produit au moins 7 : sinon bloquant (Heure Dorée était passé avec 4 et 3)", () => {
    const site = { business: "products" as const, products: 5, platform: "shopify" };
    const base = fullSite("classique");
    const T = (pages: typeof base.pages) => ({ family: "classique", style: "classique", rev: 1, header: { uid: "s00000001", id: sectionByRef(base.header)!.id }, footer: { uid: "s00000002", id: sectionByRef(base.footer)!.id }, search: null, pages: pages.map((pg, i) => ({ key: pg.key, label: pg.label, sections: pg.sections.map((t, j) => ({ uid: `s${String(i).padStart(4, "0")}${String(j).padStart(4, "0")}`, id: sectionByRef(t)!.id })) })) }) as unknown as CustomTheme;
    expect(checkCustomTheme(T(base.pages), site).filter((x) => x.level === "bloquant")).toEqual([]);
    const short = base.pages.map((pg) => (pg.key === "home" ? { ...pg, sections: pg.sections.slice(0, 4) } : pg.key === "product" ? { ...pg, sections: pg.sections.slice(0, 3) } : pg));
    const problems = checkCustomTheme(T(short), site).filter((x) => x.level === "bloquant").map((x) => x.text);
    expect(problems).toContain("« Accueil » n'a que 4 section(s) : au moins 8 (accueil)");
    expect(problems).toContain("« Fiche produit » n'a que 3 section(s) : au moins 7 (fiche produit)");
  });

  it("jamais une section pour en ajouter une : pas d'offre en section à part, jamais la même section sur deux pages", () => {
    const site = { business: "products" as const, products: 5, platform: "shopify" };
    const base = fullSite("classique");
    const T = (pages: typeof base.pages) => ({ family: "classique", style: "classique", rev: 1, header: { uid: "s00000001", id: sectionByRef(base.header)!.id }, footer: { uid: "s00000002", id: sectionByRef(base.footer)!.id }, search: null, pages: pages.map((pg, i) => ({ key: pg.key, label: pg.label, sections: pg.sections.map((t, j) => ({ uid: `s${String(i).padStart(4, "0")}${String(j).padStart(4, "0")}`, id: sectionByRef(t)!.id })) })) }) as unknown as CustomTheme;
    // Essai Heure Dorée : « Offre par quantité » (aucune offre chez le client) et la même histoire sur deux pages.
    const pages = base.pages.map((pg) => (pg.key === "home" ? { ...pg, sections: [...pg.sections.slice(0, 7), "Offre par quantité"] } : pg.key === "product" ? { ...pg, sections: [...pg.sections.slice(0, 6), "Histoire du produit au défilement"] } : pg));
    const problems = checkCustomTheme(T(pages), site).filter((x) => x.level === "bloquant").map((x) => x.text);
    expect(problems.some((x) => /« Offre par quantité » sur « Accueil » : les offres[^]*bloc d'achat/.test(x))).toBe(true);
    expect(problems).toContain("« Histoire du produit au défilement » sur « Accueil » et « Fiche produit » : une même section sur deux pages répète ses textes et ses photos");
    // « Complète ta commande » (suggestions) reste permise.
    expect(problems.some((x) => x.includes("Complète ta commande"))).toBe(false);
  });
});

describe("thème sur mesure : remonter le thème ne jette jamais le travail fait", () => {
  it("les sections gardées gardent leurs textes, photos et retouches ; les nouvelles partent de la bibliothèque", async () => {
    const { keepWork } = await import("@/lib/syna-agent/custom-theme/tools");
    const id = (t: string) => sectionByRef(t)!.id;
    const cur = { version: 1, family: "classique", style: "classique", rev: 5, at: 0,
      header: { uid: "s00000001", id: id("En-tête classique"), html: "<header>Heure Dorée</header>", clientTexts: true }, footer: null, search: null,
      pages: [{ key: "home", label: "Accueil", sections: [{ uid: "s00000010", id: id("Ouverture photo pleine"), html: "<section>Ouvre le pot</section>", clientTexts: true }, { uid: "s00000011", id: id("Avis clients") }] },
        { key: "product", label: "Fiche produit", sections: [{ uid: "s00000020", id: id("Produit vedette"), html: "<section>Abricot</section>", css: "[data-ct=\"s00000020\"] h2{color:red}", clientTexts: true }] }] } as any;
    const next = { ...cur, rev: 0, header: { uid: "s0000a001", id: id("En-tête classique") },
      pages: [{ key: "home", label: "Accueil", sections: [{ uid: "s0000a010", id: id("Ouverture photo pleine") }, { uid: "s0000a011", id: id("Citation en grand") }] },
        { key: "product", label: "Fiche produit", sections: [{ uid: "s0000a020", id: id("Produit vedette") }, { uid: "s0000a021", id: id("Badges de confiance") }] }] } as any;
    expect(keepWork(next, cur)).toBe(3);
    expect(next.header).toMatchObject({ uid: "s00000001", html: "<header>Heure Dorée</header>" });
    expect(next.pages[0].sections[0]).toMatchObject({ uid: "s00000010", html: "<section>Ouvre le pot</section>", clientTexts: true });
    expect(next.pages[0].sections[1].html).toBeUndefined();
    expect(next.pages[1].sections[0]).toMatchObject({ uid: "s00000020", clientTexts: true });
    expect(next.pages[1].sections[0].css).toContain("color:red");
    expect(keepWork(next, null)).toBe(0);
  });
});

describe("bibliothèque : « Histoire du produit au défilement » sur téléphone (retour du propriétaire du 9 novembre)", () => {
  it("la page défile (plus de boîte qui défile seule), le rond photo reste sous les barres du haut", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "public/sections/library.css"), "utf8");
    const js = fs.readFileSync(path.join(process.cwd(), "public/sections/library.js"), "utf8");
    expect(css).toMatch(/@container \(max-width:560px\)\{\.ts\.p2\{overflow:clip\}\.p2-vp\{height:auto;overflow:visible\}\.p2-st\{position:sticky;top:var\(--p2-top,0px\)/);
    expect(js).toContain('s.style.setProperty("--p2-top",t+"px")');
    expect(js).toContain("function inner(){return vp.scrollHeight>vp.clientHeight+4}");
  });

  it("en-tête classique sur téléphone : logo au centre (menu à gauche, recherche et panier à droite)", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "public/sections/library.css"), "utf8");
    expect(css).toContain("@container (max-width:760px){.bh{grid-template-columns:1fr auto 1fr}.bh-bg{justify-self:start}.bh-lg{justify-self:center;text-align:center}.bh-ic{justify-self:end}}");
  });
});

describe("thème sur mesure : sections dont le contenu vient du script de démonstration", () => {
  it("jamais proposées ni acceptées (essai Heure Dorée : « Comment conserver mon thé ? » sur un site de confitures)", async () => {
    const L = await import("@/lib/syna-agent/custom-theme/library");
    for (const id of L.SCRIPT_DEMO_SECTIONS) expect(L.libSection(id), id).toBeTruthy();
    for (const fam of ["classique", "moderne"] as const) for (const s of L.familySections(fam)) expect(L.SCRIPT_DEMO_SECTIONS.has(s.id), s.title).toBe(false);
    const base = fullSite("classique");
    const T = { family: "classique", style: "classique", rev: 1, header: null, footer: null, search: null, pages: [{ key: "home", label: "Accueil", sections: [{ uid: "s00000001", id: "questions-en-bulles-de-discussion" }] }] } as unknown as CustomTheme;
    void base;
    expect(checkCustomTheme(T).some((x) => x.level === "bloquant" && /Questions en bulles de discussion[^]*script de démonstration/.test(x.text))).toBe(true);
  });
});

describe("bibliothèque : chaque section garde son fond d'origine (retour du propriétaire du 10 novembre 2026)", () => {
  it("aucune règle d'inversion clair / sombre dans la feuille, aucun repère « inversable » ; couleurs de la marque gardées", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "public/sections/library.css"), "utf8");
    expect(css).not.toMatch(/ct-inv|ct-dark|ct-light|--ct-flip/);
    expect(fs.readFileSync(path.join(process.cwd(), "public/sections/section-traits.json"), "utf8")).not.toContain("inversable");
    for (const f of ["scripts/section-invert.cjs", "scripts/section-invert-check.cjs", "public/sections/section-invert-report.json"]) expect(fs.existsSync(path.join(process.cwd(), f)), f).toBe(false);
    // Mouvement réduit : les textes en fondu restent visibles (correctif indépendant de l'inversion, gardé).
    expect(css).toContain("animation-duration:.01ms!important");
    expect(brandCss({ brand } as any)).toMatch(/:root,\.tA,\.tB,\.tN\{--c1:#1C1917;--c2:#C2410C/);
  });
});
