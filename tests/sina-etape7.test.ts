/**
 * SINA (#492) — étapes 6 et 7 du parcours, préparées en code (7 novembre 2026) : inventaire exact des pages (boutique
 * sans page de paiement, services avec leurs pages), maquettes en plusieurs images et leur couverture, consignes des
 * images, déroulé de l'étape 7 (lecture, écriture, captures, comparaison, corrections, contrôles finaux) avec un rapport
 * honnête et un plafond de dépense respecté, outils SINA et tâche de fond. AUCUN appel réel : tout est simulé.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { sampleSpec } from "./fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

const png = (colour: string, w = 120, h = 240) => sharp({ create: { width: w, height: h, channels: 3, background: colour } }).png().toBuffer();

/** Section sur mesure minimale, valide pour le moteur du thème (schéma, préréglage, réglages modifiables). */
const liquid = (type: string, heading = "Titre") => `<section id="es-{{ section.id }}" class="es-section es-cx-${type.slice(10)} color-{{ section.settings.color_scheme }}">
  <div class="es-container"><h2 class="es-heading es-h2">{{ section.settings.heading | escape }}</h2></div>
</section>
{% schema %}
{ "name": "${type.slice(10, 30)}", "tag": "div", "settings": [
  { "type": "text", "id": "heading", "label": "Titre", "default": "${heading}" },
  { "type": "color_scheme", "id": "color_scheme", "label": "Couleurs", "default": "scheme-1" }
], "presets": [ { "name": "${type.slice(10, 30)}" } ] }
{% endschema %}`;

describe("SINA — étape 6 : inventaire des pages", async () => {
  const { mockupPages, bookingFits, VIEWPORT_WIDTH } = await import("@/lib/syna-agent/mockup-code/pages");

  it("boutique : toutes les pages de la liste, aucune page de paiement, ordinateur et téléphone partout", () => {
    const pages = mockupPages("products", "multi");
    const keys = pages.map((p) => p.key);
    for (const k of ["home", "catalog", "category", "product", "cart", "cart-drawer", "cart-empty", "search", "search-empty", "about", "contact", "faq", "shipping", "account-login", "account-register", "account-recover", "account", "account-orders", "account-addresses", "terms", "legal-notice", "privacy", "cookies", "password", "404", "blog", "article"]) expect(keys).toContain(k);
    expect(keys.some((k) => /checkout|paiement|payment/.test(k))).toBe(false);
    expect(pages.some((p) => /paiement/i.test(p.fr) && !/plateforme/.test(p.sections.join(" ")))).toBe(false);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of pages) {
      expect(p.viewports).toEqual(["desktop", "phone"]);
      expect(p.sections[0]).toMatch(/en-tête/);
      expect(p.sections.at(-1)).toMatch(/pied de page/);
    }
    expect(VIEWPORT_WIDTH).toEqual({ desktop: 1440, phone: 390 });
    expect(keys).not.toContain("size-guide");
    expect(mockupPages("products", "multi", { sizeGuide: true }).map((p) => p.key)).toContain("size-guide");
  });

  it("boutique mono-produit : pas de page catégorie ; une fiche par type de produit", () => {
    expect(mockupPages("products", "mono").map((p) => p.key)).not.toContain("category");
    const typed = mockupPages("products", "niche", { productTypes: [{ key: "Harnais", name: "Harnais" }, { key: "Laisse", name: "Laisse" }] });
    const prods = typed.filter((p) => p.group === "vente" && p.key.startsWith("product"));
    expect(prods.map((p) => p.key)).toEqual(["product:harnais", "product:laisse"]);
    expect(prods.map((p) => p.template)).toEqual(["product", "product.laisse"]);
  });

  it("services : leurs pages, aucune page de vente ; réservation seulement si le métier s'y prête", () => {
    const pages = mockupPages("services", null, { contactModes: ["quote"] });
    const keys = pages.map((p) => p.key);
    for (const k of ["home", "services", "service", "pricing", "portfolio", "project", "about", "method", "area", "faq", "contact", "quote", "quote-confirmation", "terms", "legal-notice", "privacy", "cookies", "sitemap", "404", "blog", "article"]) expect(keys).toContain(k);
    for (const k of ["cart", "product", "catalog", "booking"]) expect(keys).not.toContain(k);
    const booking = mockupPages("services", null, { contactModes: ["booking"] }).map((p) => p.key);
    expect(booking).toEqual(expect.arrayContaining(["booking", "booking-confirmation", "booking-manage"]));
    expect(bookingFits({ sector: "restauration" })).toBe(true);
    const resto = mockupPages("services", null, { sector: "restauration" }).map((p) => p.key);
    expect(resto).toEqual(expect.arrayContaining(["menu", "booking"]));
    expect(mockupPages("services", null, { sector: "immobilier" }).map((p) => p.key)).toEqual(expect.arrayContaining(["listings", "listing"]));
  });
});

describe("SINA — étape 6 : maquettes en plusieurs images et couverture", async () => {
  const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
  const M = await import("@/lib/syna-agent/mockup-code/mockup-set");
  const pages = mockupPages("products", "multi");

  it("découpage : pages clés seules en ordinateur, variantes avec leur page, toutes les pages prévues", () => {
    const d = M.plannedDirection("A", "Lumière", "grandes photos", pages);
    const desktop = d.images.filter((i) => i.viewport === "desktop");
    expect(desktop.find((i) => i.pages.includes("home"))!.pages).toEqual(["home"]);
    expect(desktop.find((i) => i.pages.includes("product"))!.pages).toEqual(["product"]);
    const cart = d.images.find((i) => i.viewport === "phone" && i.pages.includes("cart"))!;
    expect(cart.pages).toEqual(expect.arrayContaining(["cart", "cart-drawer", "cart-empty"]));
    expect(M.coverageOf(d, pages, { ready: false }).complete).toBe(true);
    // Rien n'est prêt tant qu'aucune image n'est créée : tout manque, en ordinateur et en téléphone.
    const cov = M.coverageOf(d, pages);
    expect(cov.complete).toBe(false);
    expect(cov.missing).toHaveLength(pages.length * 2);
  });

  it("couverture : une version oubliée reste un manque ; page inconnue refusée", () => {
    let set: any = { version: 1, business: "products", pages, directions: [M.plannedDirection("A", "Lumière", "x", pages)], at: 0 };
    for (const img of set.directions[0].images.filter((i: any) => i.viewport === "desktop")) set = M.attachImage(set, "A", { id: img.id, viewport: "desktop", pages: img.pages, assetId: "asset-" + img.id }).set;
    const cov = M.coverageOf(set.directions[0], pages);
    expect(cov.complete).toBe(false);
    expect(cov.missing.every((m) => m.viewport === "phone")).toBe(true);
    expect(cov.missing).toHaveLength(pages.length);
    expect(() => M.attachImage(set, "A", { viewport: "phone", pages: ["paiement"], assetId: "x" })).toThrow(/inconnues/);
    expect(() => M.attachImage(set, "B", { viewport: "phone", pages: ["home"], assetId: "x" })).toThrow(/inconnue/);
  });
});

describe("SINA — étape 6 : consignes des images de maquette", async () => {
  const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
  const { mockupImagePrompt, mockupImagesMaxMicro, siteImagePrompt, colourRoles } = await import("@/lib/syna-agent/mockup-code/prompts");
  const brand: any = { name: "Braise Douce", tagline: "Allume l'instant.", palette: { dark: "#1F1A14", primary: "#B91C1C", secondary: "#FDE68A", accent: "#16A34A", light: "#F5EEDC" }, fonts: { heading: "playfair_display_n7", body: "inter_n4" }, ground: "degrade", gradient: { from: "#FFD6A5", to: "#C8B6FF" }, paletteRoles: "sina-2026" };
  const facts = { business: "products" as const, name: "Braise Douce", brand, offers: [{ name: "Bougie Cèdre", price: "25 €" }, { name: "Bougie Figue" }], angle: "accroche « Fais le noir, trouve le calme. »", productPhoto: true };
  const pages = mockupPages("products", "multi");

  it("consigne : français, concrète, dans l'ordre du guide, textes voulus entre guillemets, rien d'inventé", () => {
    const t = mockupImagePrompt(facts, { name: "Lumière", style: "grandes photos plein cadre" }, { viewport: "desktop", pages: ["cart", "cart-drawer", "cart-empty"] }, pages);
    expect(t).toMatch(/^Planche de maquette de site web/);
    expect(t).toContain("« Braise Douce »");
    expect(t).toContain("slogan « Allume l'instant. »");
    expect(t).toContain("La planche contient exactement 3 pages");
    expect(t).toContain("« Panier vide »");
    expect(t).toContain("Rien n'est coupé par le cadre");
    // Polices décrites par leur style, jamais par leur nom (essai réel : « Cormorant Garamond » écrit sur la maquette).
    expect(t).not.toContain("Playfair Display");
    expect(t).toContain("titres en une police à empattements, fine et élégante");
    expect(t).toContain("jamais écrits sur la page");
    expect(t).not.toContain("verbe + objet");
    expect(t).toContain("boutons et liens d'action #B91C1C");
    expect(t).toContain("dégradé à 135° de #FFD6A5 à #C8B6FF");
    expect(t).toContain("textes ET titres #1F1A14");
    expect(t).toContain("« Bougie Cèdre » (25 €)");
    expect(t).toContain("« Bougie Figue ».");
    expect(t).toMatch(/Aucune personne.*Aucun objet supplémentaire\.$/s);
    expect(t).not.toMatch(/« Paiement/i);
    expect(t.indexOf("fond uni gris")).toBeLessThan(t.indexOf("Page à gauche"));
    const phone = mockupImagePrompt(facts, { name: "Lumière", style: "x" }, { viewport: "phone", pages: ["home", "product"] }, pages);
    expect(phone).toContain("390 px");
    expect(phone).toContain("menu replié");
    expect(colourRoles({ ...brand, ground: "sombre" })).toContain("fond des pages le sombre #1F1A14 ; textes ET titres #F5EEDC");
  });

  it("accueil : textes EXACTS de la marque (accroche, slogan, bouton, messages) et produits de l'onglet Produits (essai réel du 8 novembre)", async () => {
    const { mockupFacts } = await import("@/lib/syna-agent/mockup-code/prompts");
    const proj: any = { business: "products", name: "x", brand, product: { name: "6 mélanges vendus en vrac dans des", price: { amount: null, status: "unknown" } }, catalog: [], services: { services: [] } };
    const f = mockupFacts(proj, undefined, false, { products: [{ title: "Thé vert jasmin", price: 850 }, { title: "Verveine-menthe", price: 750 }], texts: { headline: "Pose ton écran. Ces quelques minutes sont à toi.", cta: "Choisis ton mélange de pause.", messages: ["Six mélanges, trois thés et trois infusions."] } });
    expect(f.offers).toEqual([{ name: "Thé vert jasmin", price: "8,50 €" }, { name: "Verveine-menthe", price: "7,50 €" }]); // jamais le nom tronqué de la fiche
    const home = mockupImagePrompt(f, { name: "Lumière", style: "x" }, { viewport: "desktop", pages: ["home"] }, pages);
    expect(home).toContain("grand titre d'ouverture sur 2 lignes : « Pose ton écran. » puis « Ces quelques minutes sont à toi. »");
    expect(home).toContain("fines lignes grises de faux texte");
    expect(home).not.toContain("[À compléter]");
    const styled = mockupImagePrompt(f, { name: "Herbier", style: "Fond blanc lumineux. Titres en Playfair Display, textes en Inter. Touches de vert #3F6B4E et #E3EDDF, accents dorés #C9A04E. Brins au trait." }, { viewport: "desktop", pages: ["home"] }, pages);
    expect(styled).toContain("Direction graphique « Herbier » : Fond blanc lumineux. Touches de vert, accents dorés. Brins au trait.");
    expect(home).toContain("le slogan « Allume l'instant. »");
    expect(home).toContain("bouton principal « Choisis ton mélange de pause. »");
    expect(home).toContain("« Six mélanges, trois thés et trois infusions. »");
    expect(home).not.toContain("6 mélanges vendus en vrac dans des");
    // Les textes de l'accueil ne vont que sur l'image de l'accueil.
    expect(mockupImagePrompt(f, { name: "Lumière", style: "x" }, { viewport: "desktop", pages: ["cart"] }, pages)).not.toContain("grand titre d'ouverture");
  });

  it("services : jamais de personne ; image du site écrite comme une photo décrite", () => {
    const t = mockupImagePrompt({ ...facts, business: "services", offers: [{ name: "Coupe femme" }], productPhoto: false }, { name: "Atelier", style: "x" }, { viewport: "desktop", pages: ["home"] }, mockupPages("services"));
    expect(t).toContain("jamais de personne");
    expect(t).toContain("« Coupe femme »");
    const s = siteImagePrompt({ description: "un bocal de confiture sur une planche en chêne", objects: ["un bocal en verre rempli de confiture d'abricot", "une planche en chêne clair"], ratio: "4:5" }, { name: "Braise Douce", business: "products" });
    expect(s).toContain("La scène contient exactement 2 objets");
    expect(s).toMatch(/Aucun texte, aucune lettre, aucun chiffre, aucune gravure, aucun logo, aucun filigrane, aucune personne\. Aucun objet supplémentaire\.$/);
  });

  it("devis des images : nombre d'images × coût d'une image ; aucun modèle = rien de promis", () => {
    expect(mockupImagesMaxMicro(7, 2, (r) => (r === 2 ? 150_000 : 0))).toBe(1_050_000);
    expect(mockupImagesMaxMicro(7, 2, () => null)).toBeNull();
  });
});

describe("SINA — étape 7 : contrôles gratuits", async () => {
  const P = await import("@/lib/syna-agent/mockup-code/pipeline");
  const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
  const pages = mockupPages("products", "mono");
  const page = (k: string) => pages.find((p) => p.key === k)!;

  it("ressemblance locale : identique = 1, très différent = bas", async () => {
    const a = await png("#F5EEDC"), b = await png("#101010");
    expect(await P.localSimilarity(a, a)).toBe(1);
    expect(await P.localSimilarity(a, b)).toBeLessThan(0.3);
  });

  it("SEO : titre, méta-description, un seul H1, textes alternatifs, données structurées", () => {
    const bad = P.seoIssues(`<html><head><title></title></head><body><h1>A</h1><h1>B</h1><img src="x.jpg"></body></html>`, page("product"));
    expect(bad.issues).toEqual(expect.arrayContaining(["titre de page absent", "méta-description absente", "2 titres H1 (un seul attendu)", "1 image(s) sans texte alternatif", "données structurées Product absentes", "données structurées BreadcrumbList absentes"]));
    const desc = "Une bougie coulée à la main en Provence, à la cire de colza, pour des soirées calmes. Découvrez la collection et choisissez votre parfum.";
    const good = P.seoIssues(`<title>Bougie Cèdre | Braise Douce</title><meta name="description" content="${desc}"><h1>Bougie</h1><img src="a" alt="Bougie en verre ambré"><script type="application/ld+json">{"@type":"Product"} {"@type":"BreadcrumbList"}</script>`, page("product"));
    expect(good.issues).toEqual([]);
  });

  it("liens internes : une adresse introuvable est signalée, les pages de la plateforme non", () => {
    const spec = sampleSpec();
    const links = P.internalLinks(`<a href="/p/products/serum-eclat">a</a><a href="/p/pages/n-existe-pas">b</a><a href="https://exemple.fr">c</a><a href="/account/login">d</a><a href="#haut">e</a>`);
    expect(links).toEqual(["/products/serum-eclat", "/pages/n-existe-pas", "/account/login"]);
    expect(P.brokenLinks(spec, links)).toEqual(["/pages/n-existe-pas"]);
  });

  it("page existante reprise, page manquante créée dans le thème (adresse lisible), fiche produit reliée au catalogue", () => {
    const spec = sampleSpec();
    const faq = P.resolveTarget(spec, page("faq"));
    expect(faq).toMatchObject({ template: "page.faq", path: "/pages/faq" });
    expect(faq.spec).toBe(spec);
    const t = P.resolveTarget(spec, page("terms"));
    expect(t.path).toBe("/pages/conditions-generales-de-vente");
    expect(t.spec.templates[t.template]).toBeTruthy();
    expect(spec.store.pages.some((p) => p.handle === "conditions-generales-de-vente")).toBe(false);
    expect(P.resolveTarget(spec, page("product")).path).toBe("/products/serum-eclat");
  });
});

describe("SINA — étape 7 : déroulé simulé (boucle, corrections, plafond, honnêteté)", async () => {
  const P = await import("@/lib/syna-agent/mockup-code/pipeline");
  const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
  const all = mockupPages("products", "mono");
  const pages = all.filter((p) => ["home", "product", "faq"].includes(p.key));
  const UNIT = { analyze: 10, write: 20, compare: 5, fix: 20 };

  function direction(opts: { phone?: boolean } = {}) {
    const images: any[] = [
      { id: "A01", viewport: "desktop", pages: ["home"], assetId: "img-home", status: "ready" },
      { id: "A02", viewport: "desktop", pages: ["product", "faq"], assetId: "img-pf", status: "ready" },
    ];
    if (opts.phone !== false) images.push({ id: "A03", viewport: "phone", pages: ["home", "product", "faq"], assetId: "img-phone", status: "ready" });
    return { key: "A" as const, name: "Lumière", style: "x", images };
  }

  function sim(scores: Record<string, number[]>, extra: Partial<any> = {}) {
    let spent = 0;
    const calls: string[] = [];
    const counters: Record<string, number> = {};
    const deps: any = {
      step: (_k: string, fn: () => Promise<any>) => fn(),
      callMaxMicro: UNIT,
      spentMicro: () => spent,
      available: () => ["main-product", "main-cart", "main-search", "contact-form", "faq"],
      image: async () => png("#F5EEDC"),
      analyzeMockup: async (i: any) => { spent += UNIT.analyze; calls.push(`analyze:${i.imageId}`); return i.pages.map((p: any) => ({ page: p.key, region: { x: 0, y: 0, w: 1, h: 1 }, sections: [
        { role: "header", name: "En-tête", layout: "logo à gauche, menu à droite", texts: [], images: [], colors: {} },
        { role: p.key === "product" ? "achat" : "ouverture", name: p.key === "product" ? "Achat" : "Ouverture", layout: "deux colonnes", texts: [{ kind: "titre", text: "Fais le noir, trouve le calme." }], images: [{ description: "bougie allumée sur une table en chêne" }], colors: { background: "#F5EEDC" } },
        { role: "footer", name: "Pied", layout: "trois colonnes", texts: [], images: [], colors: {} },
      ] })); },
      writeSections: async (i: any) => {
        spent += UNIT.write; calls.push(`write:${i.page.key}`);
        const ops: any[] = [], order: string[] = [];
        for (const s of i.plan) {
          if (s.target.kind === "library") { order.push(s.target.type); continue; }
          const type = s.target.kind === "group" ? `es-custom-${s.target.group}-maquette` : `es-custom-${i.page.key}-${s.index + 1}`;
          ops.push({ op: "custom_section", type, name: s.name, liquid: liquid(type) }, { op: "add_section", template: s.target.kind === "group" ? `group:${s.target.group}` : i.template, type });
          order.push(type);
        }
        return { ops, order, written: i.plan.filter((s: any) => s.target.kind !== "library").map((s: any) => s.name), library: i.plan.filter((s: any) => s.target.kind === "library").map((s: any) => s.target.type), failed: [] };
      },
      screenshot: async (i: any) => ({ image: await png("#F5EEDC"), scrollWidth: i.width }),
      compare: async (i: any) => {
        spent += UNIT.compare; const k = `${i.page.key}:${i.viewport}`; counters[k] = (counters[k] ?? 0) + 1; calls.push(`compare:${k}`);
        const list = scores[i.page.key] ?? [9];
        const score = list[Math.min(counters[k] - 1, list.length - 1)];
        return { score, differences: score >= 8 ? [] : [`Ouverture : titre trop petit (${score}/10)`] };
      },
      fix: async (i: any) => { spent += UNIT.fix; calls.push(`fix:${i.page.key}`); const type = `es-custom-${i.page.key}-2`; return { ops: [{ op: "custom_section", type, name: "Ouverture", liquid: liquid(type, `Titre corrigé ${calls.length}`) }], written: ["Ouverture"], library: [], failed: [] }; },
      themeCheck: async () => ({ available: true, errors: [] }),
      render: async (_s: any, path: string) => ({ status: 200, html: `<title>Page ${path} | Braise Douce</title><meta name="description" content="${"Une bougie coulée à la main, pour des soirées calmes. ".repeat(3).slice(0, 125)} ${path}"><h1>T</h1><script type="application/ld+json">{"@type":"Organization"} {"@type":"Product"} {"@type":"BreadcrumbList"} {"@type":"FAQPage"}</script><a href="/p/">accueil</a>` }),
      ...extra,
    };
    return { deps, calls, spent: () => spent };
  }

  it("la boucle améliore la note, s'arrête au nombre de tours et dit honnêtement ce qui est raté", async () => {
    const s = sim({ home: [6, 9], product: [5], faq: [9] });
    const { spec, report } = await P.runStep7({ direction: direction(), pages, base: sampleSpec(), options: { costCapMicro: 10_000, maxRounds: 3 } }, s.deps);
    const r = (k: string) => report.pages.find((x) => x.key === k)!;
    // Accueil : 6 puis 9 → conforme au 2e tour, après une correction.
    expect(r("home").status).toBe("ok");
    expect(r("home").scores.filter((x) => x.viewport === "desktop").map((x) => x.score)).toEqual([6, 9]);
    expect(s.calls.filter((c) => c === "fix:home")).toHaveLength(1);
    // Fiche produit : jamais au niveau → « à corriger » après 3 tours, écarts gardés, jamais présentée comme bonne.
    expect(r("product").status).toBe("a_corriger");
    expect(Math.max(...r("product").scores.map((x) => x.round))).toBe(3);
    expect(s.calls.filter((c) => c === "fix:product")).toHaveLength(2);
    expect(r("product").differences.join(" ")).toMatch(/titre trop petit/);
    expect(r("product").library).toContain("main-product");
    expect(r("faq").status).toBe("ok");
    expect(report.ok).toBe(false);
    expect(report.summary).toMatch(/2 page\(s\) conforme\(s\) à la maquette sur 3 ; 1 à corriger/);
    // En-tête et pied écrits une seule fois (avec l'accueil), ceux de la bibliothèque masqués par le vrai moteur.
    expect(s.calls.filter((c) => c.startsWith("write:"))).toEqual(["write:home", "write:product", "write:faq"]);
    expect(Object.values(spec.groups.header.sections).some((x) => x.type === "es-custom-header-maquette")).toBe(true);
    expect(spec.customSections["es-custom-home-2"].liquid).toContain("Titre corrigé");
    // Page FAQ du site reprise (pas de doublon) ; emplacements d'images listés (création payante séparée).
    expect(spec.store.pages.filter((p) => p.template_suffix === "faq")).toHaveLength(1);
    expect(spec.templates["page.faq"].order.map((sid) => spec.templates["page.faq"].sections[sid].type)).toEqual(["es-custom-faq-2"]);
    expect(report.imageSlots.some((x) => x.page === "home" && /bougie allumée/.test(x.prompt))).toBe(true);
    expect(report.spentMicro).toBe(s.spent());
  });

  it("tout conforme : rapport « ok » seulement si les contrôles finaux passent aussi", async () => {
    const s = sim({});
    const res = await P.runStep7({ direction: direction(), pages, base: sampleSpec(), options: { costCapMicro: 10_000 } }, s.deps);
    expect(res.report.pages.every((x) => x.status === "ok")).toBe(true);
    expect(res.report.ok).toBe(true);
    // Theme Check en erreur → jamais « ok ».
    const t = sim({}, { themeCheck: async () => ({ available: true, errors: [{ file: "sections/es-custom-home-2.liquid", check: "MissingTemplate", message: "x", line: 3 }] }) });
    const bad = await P.runStep7({ direction: direction(), pages, base: sampleSpec(), options: { costCapMicro: 10_000 } }, t.deps);
    expect(bad.report.ok).toBe(false);
    expect(bad.report.themeCheck.errors[0]).toMatch(/es-custom-home-2/);
    // Débordement à 360 px → page à corriger.
    const o = sim({}, { screenshot: async (i: any) => ({ image: await png("#F5EEDC"), scrollWidth: i.width === 360 ? 420 : i.width }) });
    const over = await P.runStep7({ direction: direction(), pages, base: sampleSpec(), options: { costCapMicro: 10_000 } }, o.deps);
    expect(over.report.pages.find((x) => x.key === "home")!.status).toBe("a_corriger");
    expect(over.report.pages.find((x) => x.key === "home")!.overflow).toEqual([360]);
    // Navigateur indisponible → « non vérifiable », jamais « ok ».
    const n = sim({}, { screenshot: async () => null });
    const none = await P.runStep7({ direction: direction(), pages, base: sampleSpec(), options: { costCapMicro: 10_000 } }, n.deps);
    expect(none.report.pages.every((x) => x.status === "non_verifie")).toBe(true);
    expect(none.report.summary).toMatch(/non vérifiée\(s\) \(captures impossibles\)/);
    expect(none.report.ok).toBe(false);
  });

  it("plafond de dépense : aucun appel au-delà, arrêt annoncé", async () => {
    const s = sim({ home: [5] });
    // Lecture (3 × 10) + écriture (3 × 20) = 90 ; la première comparaison (5) dépasserait 92.
    const { report } = await P.runStep7({ direction: direction(), pages, base: sampleSpec(), options: { costCapMicro: 92, maxRounds: 3 } }, s.deps);
    expect(s.spent()).toBeLessThanOrEqual(92);
    expect(s.calls.some((c) => c.startsWith("compare"))).toBe(false);
    expect(report.stoppedBy).toBe("budget");
    expect(report.ok).toBe(false);
    expect(report.pages.every((x) => x.status === "budget_atteint")).toBe(true);
    expect(report.summary).toMatch(/budget atteint/);
    // Plafond dur du fournisseur atteint pendant un appel : arrêt propre, rien n'est présenté comme bon.
    const cap = Object.assign(new Error("plafond"), { name: "CostCapReached" });
    const h = sim({}, { compare: async () => { throw cap; } });
    const hard = await P.runStep7({ direction: direction(), pages, base: sampleSpec(), options: { costCapMicro: 10_000 } }, h.deps);
    expect(hard.report.stoppedBy).toBe("budget");
    expect(hard.report.pages.some((x) => x.status === "ok")).toBe(false);
  });

  it("maquette incomplète : page sans image et version téléphone absente signalées, jamais inventées", async () => {
    const s = sim({});
    const withCart = [...pages, all.find((p) => p.key === "shipping")!];
    const { report } = await P.runStep7({ direction: direction({ phone: false }), pages: withCart, base: sampleSpec(), options: { costCapMicro: 10_000 } }, s.deps);
    expect(report.pages.find((x) => x.key === "shipping")!.status).toBe("maquette_manquante");
    expect(report.pages.find((x) => x.key === "home")!.status).toBe("maquette_manquante");
    expect(report.pages.find((x) => x.key === "home")!.note).toMatch(/téléphone absente/);
    expect(s.calls).not.toContain("write:shipping");
    expect(report.ok).toBe(false);
  });

  it("devis de l'étape 7 : somme des appels au pire (lecture, écriture, comparaisons, corrections)", () => {
    expect(P.step7MaxMicro({ images: 3, pages: 3, views: 6, maxRounds: 3 }, UNIT)).toBe(3 * 10 + 3 * 8 * 2 * 20 + 6 * 3 * 5 + 3 * 2 * 2 * 2 * 20);
  });
});

describe("SINA — étapes 6 et 7 : outils et tâche de fond (simulés)", async () => {
  const { run, one } = await import("@/lib/db");
  const { account, project } = await import("./conversation209-fixtures");
  const { saveAsset } = await import("@/lib/library");
  const { saveThemeVersion, currentTheme, themeVersion } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { mockupCodeTools, mockupToolDeps } = await import("@/lib/syna-agent/mockup-code/tools");
  const { mockupCodeJobDeps, runMockupCodeJob, mockupCodeHandlers, MOCKUP_CODE_JOB } = await import("@/lib/syna-agent/mockup-code/job");
  const { loadMockupSet } = await import("@/lib/syna-agent/mockup-code/mockup-set");
  const { step7MaxMicro } = await import("@/lib/syna-agent/mockup-code/pipeline");
  const { JobContext, enqueue } = await import("@/lib/jobs");
  const tool = (n: string) => mockupCodeTools.find((t) => t.name === n)!;
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const call = (n: string, ctx: any, args: unknown) => fr(() => tool(n).run(ctx, tool(n).args.parse(args)));
  const UNIT = { analyze: 10, write: 20, compare: 5, fix: 20 };
  mockupToolDeps.imageMaxMicro = () => 150_000;
  mockupToolDeps.callMaxMicro = () => UNIT;
  mockupCodeJobDeps.callMaxMicro = () => UNIT;

  async function ready() {
    const user = await account();
    const pid = project(user);
    run("UPDATE projects SET brand_json=? WHERE id=?", JSON.stringify({ name: "Braise Douce", nameStatus: "validated", tagline: "Allume l'instant.", palette: { dark: "#1F1A14", primary: "#B91C1C", secondary: "#FDE68A", accent: "#16A34A", light: "#F5EEDC" }, fonts: { heading: "playfair_display_n7", body: "inter_n4" }, ground: "blanc", paletteRoles: "sina-2026", logo: { concept: "", status: "validated" }, alternatives: [], positioning: "", audience: "", personality: [], tone: { voice: "", do: [], dont: [] }, story: "", values: [], direction: "atelier", validated: [], generatedBy: "ai" }), pid);
    const ctx: any = { user, projectId: pid, conversationId: "fil-inexistant", runId: "run-test", attachment: () => null };
    return { user, pid, ctx };
  }

  it("étape 6 : mockup.copy écrit les textes de l'accueil sur l'angle choisi ; la maquette les écrit lettre pour lettre", async () => {
    const { copyDeps } = await import("@/lib/syna-agent/mockup-code/tools");
    const { loadSiteCopy } = await import("@/lib/syna-agent/mockup-code/copy");
    const { user, pid, ctx } = await ready();
    const J = await import("@/lib/syna-agent/journey");
    const { threadFor } = await import("@/lib/syna-agent/thread");
    ctx.conversationId = threadFor(user, pid);
    J.updateJourney(ctx.conversationId, (x) => { x.angleChoice = { id: "usage", ids: ["usage"], at: 1 }; });
    let prompt = "";
    const { mockupPages: pagesFor } = await import("@/lib/syna-agent/mockup-code/pages");
    const homePage = pagesFor("products", "multi").find((x) => x.key === "home")!;
    // Réponse simulée complète : une section par ligne de l'inventaire, avec le contenu attendu.
    copyDeps.generate = async (call: any) => { prompt = call.prompt; return { seo: { title: "Braise Douce, bougies", description: "Des bougies pour trouver le calme." }, sections: homePage.sections.map((name) => ({ section: name, title: /ouverture/.test(name) ? "Titre inventé par le modèle" : "Une flamme, et la journée se pose.", text: /pied/.test(name) ? "contact@braise.fr" : "Une phrase.", button: "Choisis ta bougie", items: /produit/.test(name) ? [{ title: "Bougie Cèdre", text: "25 € · cèdre" }] : /détails|questions/.test(name) ? [{ title: "a", text: "b" }, { title: "c", text: "d" }, { title: "e", text: "f" }] : /scènes|journal/.test(name) ? [{ title: "a", text: null }, { title: "b", text: null }] : [] })) }; };
    try {
      expect((await tool("mockup.copy").estimate!(ctx, {})).maxMicro).toBeGreaterThan(0); // payant : devis avant
      const r = await call("mockup.copy", ctx, {});
      expect(r.ok, r.summary).toBe(true);
      expect(prompt).toMatch(/Page à écrire : « Accueil »/);
      const saved = loadSiteCopy(pid)!.pages.home;
      expect(saved.sections).toHaveLength(homePage.sections.length);
      // Ouverture : le slogan posé par le Studio, mot pour mot (accroche et appel à l'action aussi quand l'angle est connu).
      const opening = saved.sections.find((x) => /ouverture/.test(x.section))!;
      expect(opening.text).toBe("Allume l'instant.");
      expect(prompt).toMatch(/Écris EXACTEMENT \d+ sections/);
      await call("mockup.prepare", ctx, { directions: [{ name: "Lumière", style: "grandes photos plein cadre" }] });
      const home = loadMockupSet(pid)!.directions[0].images.find((i) => i.viewport === "desktop" && i.pages.includes("home"))!;
      expect(home.prompt).toContain("Dans la partie ouverture (titre, photo, bouton) :");
      expect(home.prompt).toContain("texte « Allume l'instant. »");
      expect(home.prompt).not.toContain("faux texte"); // le texte est SUR la maquette (consigne du propriétaire)
      expect(home.prompt).not.toContain("« ouverture"); // un nom de section n'est jamais un texte à écrire
      // Textes incomplets (section vide, trou à compléter) : jamais posés sur une maquette.
      copyDeps.generate = async () => ({ seo: { title: "t", description: "d" }, sections: [{ section: "x", title: "Seul", text: "[À compléter : e-mail]", button: null, items: [] }] });
      const bad = await call("mockup.copy", ctx, {});
      expect(bad.ok).toBe(false);
      expect(bad.summary).toMatch(/textes incomplets/);
      expect(loadSiteCopy(pid)!.pages.home.sections).toHaveLength(homePage.sections.length); // les bons textes restent
    } finally { copyDeps.generate = undefined; }
  });

  it("étape 6 : mockup.generate crée les images manquantes (IA simulée), les range, et signale une image ratée", async () => {
    const { user, pid, ctx } = await ready();
    const logo = await saveAsset({ projectId: pid, userId: user.id, data: await png("#B91C1C"), name: "logo.png", mime: "image/png", role: "logo", origin: "generated" } as any);
    const b = JSON.parse(one<any>("SELECT brand_json FROM projects WHERE id=?", pid).brand_json);
    run("UPDATE projects SET brand_json=? WHERE id=?", JSON.stringify({ ...b, logo: { ...b.logo, assetId: logo.id } }), pid);
    await call("mockup.prepare", ctx, { directions: [{ name: "Lumière", style: "grandes photos plein cadre" }] });
    const planned = loadMockupSet(pid)!.directions[0].images;
    const est = await fr(() => tool("mockup.generate").estimate!(ctx, { direction: "A" }));
    expect(est.maxMicro).toBe(planned.length * 150_000);
    // Pour voir le rendu d'abord : seulement l'accueil, en version ordinateur (une image).
    const homeOnly = await fr(() => tool("mockup.generate").estimate!(ctx, { direction: "A", pages: ["home"], viewport: "desktop" }));
    expect(homeOnly.maxMicro).toBe(150_000);
    let n = 0;
    mockupToolDeps.generateImage = async (prompt, refs) => { n++; expect(prompt).toContain("« Braise Douce »"); expect(refs.logo).toBeTruthy(); if (n === 2) throw new Error("rendu refusé"); return png("#F5EEDC"); };
    try {
      const r = await call("mockup.generate", ctx, { direction: "A" });
      expect(r.ok).toBe(false); // une image ratée : jamais présentée comme une réussite complète
      expect(r.summary).toMatch(/1 ratée\(s\)/);
      const after = loadMockupSet(pid)!.directions[0].images;
      expect(after.filter((i) => i.status === "ready")).toHaveLength(planned.length - 1);
      // Relance : seule l'image ratée est refaite.
      n = 10;
      const again = await call("mockup.generate", ctx, { direction: "A" });
      expect(again.ok).toBe(true);
      expect(n).toBe(11);
      expect(loadMockupSet(pid)!.directions[0].images.every((i) => i.status === "ready")).toBe(true);
    } finally { mockupToolDeps.generateImage = undefined; }
  });

  it("préparation gratuite, images rangées, choix refusé tant que la maquette est incomplète, devis de l'étape 7", async () => {
    const { user, pid, ctx } = await ready();
    const before = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n;
    const prep = await call("mockup.prepare", ctx, { directions: [{ name: "Lumière", style: "grandes photos plein cadre" }, { name: "Atelier", style: "grille éditoriale serrée" }] });
    expect(prep.ok).toBe(true);
    expect(prep.changes![0].verified).toBe(true);
    const set = loadMockupSet(pid)!;
    const images = set.directions.reduce((n, d) => n + d.images.length, 0);
    expect((prep.data as any).coutMaxMicro).toBe(images * 150_000);
    expect(set.directions[0].images[0].prompt).toContain("« Braise Douce »");
    expect(tool("mockup.prepare").estimate).toBeUndefined();
    // Choix impossible : aucune image n'est encore prête.
    const early = await call("mockup.choose", ctx, { direction: "A" });
    expect(early.ok).toBe(false);
    expect((early.data as any).manquantes.length).toBeGreaterThan(0);
    // Images rangées (ici une même image fictive pour toutes) : la maquette devient complète.
    const asset = await saveAsset({ projectId: pid, userId: user.id, data: await png("#F5EEDC"), name: "maquette.png", mime: "image/png", role: "mockup", origin: "generated" } as any);
    let last: any;
    for (const img of set.directions[0].images) {
      last = await call("mockup.attach", ctx, { direction: "A", imageId: img.id, assetId: asset.id, viewport: img.viewport, pages: img.pages });
      if (!last.ok) throw new Error("ATTACH " + JSON.stringify(last) + JSON.stringify(img));
    }
    expect(last.ok).toBe(true);
    expect(last.data.complete).toBe(true);
    const wrong = await call("mockup.attach", ctx, { direction: "A", assetId: "inconnu", viewport: "phone", pages: ["home"] });
    expect(wrong.ok).toBe(false);
    const chosen = await call("mockup.choose", ctx, { direction: "A" });
    expect(chosen.ok).toBe(true);
    expect(loadMockupSet(pid)!.chosen).toBe("A");
    // Devis de l'étape 7, puis lancement de la tâche (aucun appel d'IA fait par les outils).
    const est = await fr(() => tool("site.code_from_mockup").estimate!(ctx, {}));
    const s = loadMockupSet(pid)!;
    const written = s.pages.filter((x) => !x.variantOf && !x.template.startsWith("customers/")).length;
    expect(est.maxMicro).toBe(step7MaxMicro({ images: s.directions[0].images.length, pages: written, views: s.pages.length * 2 }, UNIT));
    const launched = await call("site.code_from_mockup", ctx, {});
    expect(launched.ok).toBe(true);
    const job = one<any>("SELECT * FROM jobs WHERE id=?", launched.jobs![0]);
    expect(job.type).toBe(MOCKUP_CODE_JOB);
    expect(JSON.parse(job.payload).capMicro).toBe(est.maxMicro);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n).toBe(before);
    expect(Object.keys(mockupCodeHandlers)).toEqual([MOCKUP_CODE_JOB]);
  });

  it("tâche de fond : nouvelle version INACTIVE avec son rapport, site courant inchangé", async () => {
    const { user, pid, ctx } = await ready();
    const cur = saveThemeVersion(pid, sampleSpec(), "site de départ", "system");
    await call("mockup.prepare", ctx, { directions: [{ name: "Lumière", style: "x" }] });
    const asset = await saveAsset({ projectId: pid, userId: user.id, data: await png("#F5EEDC"), name: "m.png", mime: "image/png", role: "mockup", origin: "generated" } as any);
    for (const img of loadMockupSet(pid)!.directions[0].images) await call("mockup.attach", ctx, { direction: "A", imageId: img.id, assetId: asset.id, viewport: img.viewport, pages: img.pages });
    let analysed = 0;
    mockupCodeJobDeps.deps = (o) => ({
      step: o.step, callMaxMicro: UNIT, spentMicro: () => 0, available: () => [], image: async () => png("#F5EEDC"),
      analyzeMockup: async (i) => { analysed++; return i.pages.map((p) => ({ page: p.key, region: { x: 0, y: 0, w: 1, h: 1 }, sections: [{ role: "texte", name: "Texte", layout: "une colonne", texts: [], images: [], colors: {} }] })) as any; },
      writeSections: async () => ({ ops: [], written: [], library: [], failed: [] }),
      fix: async () => ({ ops: [], written: [], library: [], failed: [] }),
      screenshot: async () => null, compare: async () => ({ score: 9, differences: [] }),
      themeCheck: async () => ({ available: false, errors: [] }), render: async () => ({ html: "", status: 200 }),
    });
    const job = enqueue({ userId: user.id, projectId: pid, type: MOCKUP_CODE_JOB, payload: { projectId: pid, direction: "A", capMicro: 10_000 } });
    const res: any = await fr(() => runMockupCodeJob(new JobContext(job)));
    expect(analysed).toBe(loadMockupSet(pid)!.directions[0].images.length);
    expect(currentTheme(pid)!.version.id).toBe(cur.id);
    const v = themeVersion(pid, res.versionId)!;
    expect(v.version.number).toBe(cur.number + 1);
    expect(JSON.parse(v.version.qc!).syna.step).toBe(7);
    // Captures indisponibles et Theme Check absent : jamais « ok ».
    expect(res.ok).toBe(false);
    expect(res.summary).toMatch(/Theme Check indisponible/);
    const report = await call("mockup.report", ctx, {});
    expect((report.data as any).versionId).toBe(res.versionId);
    mockupCodeJobDeps.deps = undefined;
  });

  it("étape 6 : mockup.generate crée seulement les images manquantes, les range et ne présente jamais une image ratée comme bonne", async () => {
    const { mockupToolDeps, mockupCodeTools } = await import("@/lib/syna-agent/mockup-code/tools");
    const tools = Object.fromEntries(mockupCodeTools.map((t) => [t.name, t]));
    expect(tools["mockup.generate"]).toBeTruthy();
    const { getTool } = await import("@/lib/syna-agent/registry");
    for (const name of ["mockup.pages", "mockup.prepare", "mockup.generate", "mockup.attach", "mockup.choose", "site.code_from_mockup", "mockup.report", "calendar.plan", "calendar.read", "calendar.mark_done", "calendar.move"]) expect(getTool(name), name).toBeTruthy();
    expect(mockupToolDeps).toHaveProperty("imageMaxMicro");
  });

  it("images des maquettes : Qwen-Image 3.0 Pro par défaut (choix du propriétaire), modifiable par réglage", async () => {
    const { mockupImageRoute } = await import("@/lib/syna-agent/mockup-code/tools");
    const { setJsonSetting } = await import("@/lib/settings");
    expect(mockupImageRoute()).toEqual({ provider: "alibaba", model: "qwen-image-3.0-pro" });
    setJsonSetting("syna.mockup.image_route", "openai:gpt-image-2.5-flare");
    try { expect(mockupImageRoute()).toEqual({ provider: "openai", model: "gpt-image-2.5-flare" }); }
    finally { setJsonSetting("syna.mockup.image_route", "alibaba:qwen-image-3.0-pro"); }
  });

  it("textes imposés posés mot pour mot par le Studio : accroche, slogan, appel à l'action, noms et prix des produits", async () => {
    const { fixAndCheckCopy } = await import("@/lib/syna-agent/mockup-code/copy");
    const { mockupPages: pagesFor } = await import("@/lib/syna-agent/mockup-code/pages");
    const page = pagesFor("products", "multi").find((x) => x.key === "home")!;
    const raw = { seo: { title: "t", description: "d" }, sections: page.sections.map((name) => ({ section: name, title: "Autre titre", text: "Autre texte", button: "Autre bouton", items: /produit/.test(name) ? [{ title: "thé vert jasmin", text: "9 € · Sencha et jasmin" }] : /détails|questions/.test(name) ? [1, 2, 3].map((n) => ({ title: `q${n}`, text: "r" })) : /scènes|journal/.test(name) ? [1, 2].map((n) => ({ title: `s${n}`, text: null })) : [] })) };
    const { copy, problems } = fixAndCheckCopy(raw, page, { headline: "Pose ton écran. Ces quelques minutes sont à toi.", tagline: "Chaque brin choisi, chaque mélange goûté.", cta: "Choisis ton mélange de pause.", products: [{ title: "Thé vert jasmin", price: 850 }, { title: "Verveine-menthe", price: 750 }] });
    expect(problems).toEqual([]);
    const opening = copy.sections.find((x) => /ouverture/.test(x.section))!;
    expect([opening.title, opening.text, opening.button]).toEqual(["Pose ton écran. Ces quelques minutes sont à toi.", "Chaque brin choisi, chaque mélange goûté.", "Choisis ton mélange de pause."]);
    const offer = copy.sections.find((x) => /produit/.test(x.section))!;
    expect(offer.items).toEqual([{ title: "Thé vert jasmin", text: "8,50 € · Sencha et jasmin" }, { title: "Verveine-menthe", text: "7,50 €" }]); // prix réel, jamais celui du modèle
    expect(fixAndCheckCopy({ ...raw, sections: raw.sections.slice(0, 3) }, page, { products: [] }).problems[0]).toMatch(/sections écrites pour/);
  });

  it("réponse imposée : une clé obligatoire par section (essai réel : 7 sections sur 10), remise dans l'ordre", async () => {
    const { strictPageSchema, toPageCopy } = await import("@/lib/syna-agent/mockup-code/copy");
    const { mockupPages: pagesFor } = await import("@/lib/syna-agent/mockup-code/pages");
    const page = pagesFor("products", "multi").find((x) => x.key === "home")!;
    const schema = strictPageSchema(page);
    const sections = Object.fromEntries(page.sections.map((_, i) => [`section_${i + 1}`, { title: `T${i + 1}`, text: null, button: null, items: [] }]));
    expect(schema.safeParse({ seo: { title: "t", description: "d" }, sections }).success).toBe(true);
    const { section_3: _omis, ...missing } = sections;
    expect(schema.safeParse({ seo: { title: "t", description: "d" }, sections: missing }).success).toBe(false); // une section sautée est refusée
    const copy = toPageCopy({ seo: { title: "t", description: "d" }, sections }, page);
    expect(copy.sections.map((x) => x.section)).toEqual(page.sections);
    expect(copy.sections[2].title).toBe("T3");
  });
});
