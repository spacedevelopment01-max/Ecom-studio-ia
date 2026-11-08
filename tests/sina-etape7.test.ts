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

  it("découpage : pages clés seules en ordinateur, pages principales seules prévues, les autres dérivées", async () => {
    const d = M.plannedDirection("A", "Lumière", "grandes photos", pages);
    const desktop = d.images.filter((i) => i.viewport === "desktop");
    expect(desktop.find((i) => i.pages.includes("home"))!.pages).toEqual(["home"]);
    expect(desktop.find((i) => i.pages.includes("product"))!.pages).toEqual(["product"]);
    // Décision du propriétaire (8 novembre) : seules les pages principales ont une image prévue ; les pages simples
    // (variantes, compte, pages légales…) sont dérivées à l'étape 7.
    const { requiredPage } = await import("@/lib/syna-agent/mockup-code/pages");
    const req = pages.filter(requiredPage);
    expect(req.map((p) => p.key)).toEqual(expect.arrayContaining(["home", "product", "catalog", "cart", "about", "contact"]));
    expect(d.images.flatMap((i) => i.pages).every((k) => req.some((p) => p.key === k))).toBe(true);
    expect(M.coverageOf(d, pages, { ready: false }).complete).toBe(true);
    // Rien n'est prêt tant qu'aucune image n'est créée : les pages principales manquent, les autres sont dérivées.
    const cov = M.coverageOf(d, pages);
    expect(cov.complete).toBe(false);
    expect(cov.missing).toHaveLength(req.length * 2);
    expect(cov.derived.length).toBe((pages.length - req.length) * 2);
  });

  it("couverture : une version oubliée reste un manque ; page inconnue refusée", async () => {
    let set: any = { version: 1, business: "products", pages, directions: [M.plannedDirection("A", "Lumière", "x", pages)], at: 0 };
    for (const img of set.directions[0].images.filter((i: any) => i.viewport === "desktop")) set = M.attachImage(set, "A", { id: img.id, viewport: "desktop", pages: img.pages, assetId: "asset-" + img.id }).set;
    const cov = M.coverageOf(set.directions[0], pages);
    expect(cov.complete).toBe(false);
    expect(cov.missing.every((m) => m.viewport === "phone")).toBe(true);
    const { requiredPage } = await import("@/lib/syna-agent/mockup-code/pages");
    expect(cov.missing).toHaveLength(pages.filter(requiredPage).length);
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
    // Une seule page en téléphone : vraie mise en page de téléphone, en tronçons, sans cadre d'appareil (essai réel).
    const onePhone = mockupImagePrompt(facts, { name: "Lumière", style: "x" }, { viewport: "phone", pages: ["home"] }, pages);
    expect(onePhone).toContain("2 longues bandes verticales étroites");
    expect(onePhone).toContain("Aucun cadre d'appareil, aucun téléphone dessiné");
    expect(onePhone).toContain("une seule colonne");
    expect(onePhone).toContain("exactement 2 bandes étroites");
    // Retour du propriétaire : les trois articles du journal côte à côte ne vont pas sur téléphone.
    expect(onePhone).toContain("articles du journal l'un sous l'autre");
    expect(onePhone).toContain("jamais trois éléments côte à côte");
    expect(phone).toContain("jamais trois");
    // Aucune phrase contradictoire (« une page entière ») : le modèle en concluait à la page d'ordinateur (essai réel).
    expect(onePhone).not.toContain("chaque page est entière");
    expect(onePhone).not.toMatch(/exactement 1 page/);
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
    // Chaque emplacement sait où il est dans le thème (gabarit, section, rang) pour y poser la photo recréée.
    const hs = report.imageSlots.find((x) => x.page === "home" && /bougie allumée/.test(x.prompt))!;
    expect(hs.template).toBe("index");
    expect(hs.type).toMatch(/^es-custom-home-/);
    expect(hs.index).toBe(0);
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

  it("reprise après plafond : seules les sections pas encore écrites sont écrites (essai réel : accueil à 6 sections sur 10)", async () => {
    const s = sim({});
    const base = s.deps.writeSections;
    let first = true;
    const deps = { ...s.deps, writeSections: async (i: any) => {
      const r = await base(i);
      if (first && i.page.key === "home") { first = false; const keep = r.written.slice(0, 2); return { ...r, ops: r.ops.filter((o: any) => o.op !== "custom_section" || keep.includes(o.name)), written: keep, budget: true, failed: r.written.slice(2).map((n: string) => ({ name: n, reason: "budget atteint" })) }; }
      return r;
    } };
    const home = pages.filter((p) => p.key === "home");
    const { report } = await P.runStep7({ direction: direction(), pages: home, base: sampleSpec(), options: { costCapMicro: 10_000, maxRounds: 1 } }, deps);
    expect(s.calls.filter((c) => c === "write:home")).toHaveLength(2); // première écriture, puis la suite
    const r = report.pages.find((x) => x.key === "home")!;
    expect(r.failed.filter((f) => f.reason === "budget atteint")).toEqual([]);
    expect(report.stoppedBy).toBeNull();
  });

  it("reprise : une étape déjà payée et mémorisée est relue même au plafond (essai réel : page sautée, version vide)", async () => {
    const s = sim({});
    const memo = new Map<string, unknown>();
    const deps = { ...s.deps, step: async (k: string, fn: () => Promise<any>) => (memo.has(k) ? memo.get(k) : (memo.set(k, await fn()), memo.get(k))), done: (k: string) => memo.has(k) };
    const home = pages.filter((p) => p.key === "home");
    await P.runStep7({ direction: direction(), pages: home, base: sampleSpec(), options: { costCapMicro: 10_000, maxRounds: 1 } }, deps);
    const writes = s.calls.filter((c) => c === "write:home").length;
    // Reprise avec un plafond trop bas pour une nouvelle écriture : la page déjà écrite est relue, pas sautée.
    const { report } = await P.runStep7({ direction: direction(), pages: home, base: sampleSpec(), options: { costCapMicro: s.spent(), maxRounds: 1 } }, deps);
    expect(s.calls.filter((c) => c === "write:home").length).toBe(writes);
    expect(report.pages[0].written.length).toBeGreaterThan(0);
  });

  it("maquette incomplète : version téléphone absente signalée ; page simple sans image dérivée de la maquette", async () => {
    const s = sim({});
    const withCart = [...pages, all.find((p) => p.key === "shipping")!];
    const { report } = await P.runStep7({ direction: direction({ phone: false }), pages: withCart, base: sampleSpec(), options: { costCapMicro: 10_000 } }, s.deps);
    // Page simple sans image (livraison) : codée dans le style de la maquette, jamais comparée (décision du 8 novembre).
    expect(report.pages.find((x) => x.key === "shipping")!.status).toBe("derivee");
    expect(report.pages.find((x) => x.key === "shipping")!.note).toMatch(/style de la maquette/);
    expect(s.calls).toContain("write:shipping");
    expect(s.calls.some((c) => c.startsWith("compare:shipping"))).toBe(false);
    // Page principale sans sa version téléphone : toujours signalée.
    expect(report.pages.find((x) => x.key === "home")!.status).toBe("maquette_manquante");
    expect(report.pages.find((x) => x.key === "home")!.note).toMatch(/téléphone absente/);
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
    // Ces essais couvrent l'ancienne méthode (maquettes en images), toujours possible par réglage ; les maquettes en
    // code (méthode par défaut depuis le 8 novembre) ont leurs propres essais (sina-maquettes-code.test.ts).
    (await import("@/lib/settings")).setJsonSetting("syna.mockup.mode", "image");
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
    // Image + contrôle automatique de l'image (son pire cas, tel que le Studio le vérifie), compris dans le prix annoncé.
    const { checkMaxMicro } = await import("@/lib/syna-agent/mockup-code/check");
    const one1 = 150_000 + checkMaxMicro();
    expect(checkMaxMicro()).toBeGreaterThan(0);
    expect(est.maxMicro).toBe(planned.length * one1);
    // Pour voir le rendu d'abord : seulement l'accueil, en version ordinateur (une image).
    const homeOnly = await fr(() => tool("mockup.generate").estimate!(ctx, { direction: "A", pages: ["home"], viewport: "desktop" }));
    expect(homeOnly.maxMicro).toBe(one1);
    let n = 0;
    mockupToolDeps.generateImage = async (prompt, refs) => { n++; expect(prompt).toContain("« Braise Douce »"); expect(refs.logo).toBeTruthy(); if (n === 2) throw new Error("rendu refusé"); return png("#F5EEDC"); };
    // Contrôle automatique simulé : tout va bien, sauf l'accueil téléphone refait (trois articles côte à côte).
    let badPhone = false;
    mockupToolDeps.checkImage = async (_d, img) => ({ deviceFrame: false, menuLinksAtTop: false, buttonInHeader: false, people: false, brokenAreas: false, textProblems: [], sections: [{ name: "Le journal", maxSideBySide: badPhone && img.viewport === "phone" ? 3 : 1 }] });
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
      // Refaire une image jugée ratée par le client (redo) : payante, une seule image, nouvelle image rangée.
      const homeImg = loadMockupSet(pid)!.directions[0].images.find((i) => i.viewport === "phone" && i.pages.includes("home"))!;
      const est2 = await fr(() => tool("mockup.generate").estimate!(ctx, { direction: "A", pages: ["home"], viewport: "phone", redo: true }));
      expect(est2.maxMicro).toBe(one1);
      const redo = await call("mockup.generate", ctx, { direction: "A", pages: ["home"], viewport: "phone", redo: true });
      expect(redo.ok, redo.summary).toBe(true);
      expect(redo.summary).toContain("rien à signaler");
      // Défaut relevé par le contrôle : image dite RATÉE, défaut cité, rien relancé.
      badPhone = true; const before = n;
      const bad = await call("mockup.generate", ctx, { direction: "A", pages: ["home"], viewport: "phone", redo: true });
      expect(bad.ok).toBe(false);
      expect(bad.summary).toMatch(/RATÉE au contrôle automatique : « Le journal » : 3 éléments côte à côte/);
      expect(bad.hint).toMatch(/ne relance RIEN sans son accord/);
      expect(n).toBe(before + 1);
      expect(loadMockupSet(pid)!.directions[0].images.find((i) => i.id === homeImg.id)!.check?.ok).toBe(false);
      badPhone = false;
      await call("mockup.generate", ctx, { direction: "A", pages: ["home"], viewport: "phone", redo: true });
      expect(loadMockupSet(pid)!.directions[0].images.find((i) => i.id === homeImg.id)!.check?.ok).toBe(true);
      // Retouche LOCALISÉE (consigne du propriétaire : « modifier que les détails demandés ») : seules les zones
      // repérées changent, le reste reste identique au pixel près ; on peut partir d'une version précédente.
      const { imageVersions } = await import("@/lib/syna-agent/mockup-code/tools");
      const { assetData, getAsset } = await import("@/lib/library");
      const versions = imageVersions(pid, "A", homeImg.id);
      expect(versions.length).toBeGreaterThanOrEqual(3);
      let painted = 0, maskSeen: Buffer | null | undefined = undefined, promptSeen = "";
      mockupToolDeps.locate = async (_img, changes) => ({ zones: changes.map((_, i) => ({ n: i + 1, found: i === 0, left: 0, top: 0, right: 50, bottom: 25, texts: ["Allume l'instant.", "texte mal lu"] })) });
      // Retouche simulée : un carré rouge au milieu de la zone, les bords de la zone intacts (raccord propre).
      mockupToolDeps.maskEdit = async (img, mask, prompt) => { painted++; maskSeen = mask; promptSeen = prompt; return sharp(img).composite([{ input: await png("#FF0000", 30, 30), left: 10, top: 10 }]).png().toBuffer(); };
      // Une zone introuvable : rien n'est retouché ni payé.
      const lost = await call("mockup.edit", ctx, { direction: "A", imageId: homeImg.id, changes: [{ zone: "le bouton du haut", change: "le retirer" }, { zone: "une partie absente", change: "x x x" }] });
      expect(lost.ok).toBe(false);
      expect(lost.summary).toMatch(/Zone introuvable.*une partie absente/);
      expect(painted).toBe(0);
      mockupToolDeps.locate = async () => ({ zones: [{ n: 1, found: true, left: 0, top: 0, right: 50, bottom: 25, texts: ["Allume l'instant.", "texte mal lu"] }] });
      const est3 = await fr(() => tool("mockup.edit").estimate!(ctx, { direction: "A", imageId: homeImg.id, changes: [{ zone: "le bouton du haut", change: "le retirer" }] }));
      expect(est3.maxMicro).toBeGreaterThan(0);
      const ed = await call("mockup.edit", ctx, { direction: "A", imageId: homeImg.id, fromVersion: 1, changes: [{ zone: "le bouton du haut", change: "le retirer" }] });
      expect(ed.ok, ed.summary).toBe(true);
      expect(painted).toBe(1);
      expect(ed.summary).toMatch(/le reste est identique/);
      expect(promptSeen).toMatch(/Modification 1, dans le bouton du haut \(zone située .*\) : le retirer\./);
      expect(promptSeen).not.toContain("texte mal lu"); // un texte lu n'est repris que s'il est dans les textes de la page
      // Sans masque (essai réel : le modèle voyait les zones masquées comme des rectangles noirs) ; zone située en %.
      expect(maskSeen).toBeNull();
      expect(promptSeen).toMatch(/zone située de 0 % à 5\d % de la largeur de l'image et de 0 % à 2\d % de sa hauteur/);
      const now = loadMockupSet(pid)!.directions[0].images.find((i) => i.id === homeImg.id)!;
      const pix = await sharp(assetData(getAsset(now.assetId!)!)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const at = (x: number, y: number) => Array.from(pix.data.subarray((y * pix.info.width + x) * 3, (y * pix.info.width + x) * 3 + 3));
      expect(at(20, 20)).toEqual([255, 0, 0]); // dans la zone : retouché
      expect(at(pix.info.width - 5, pix.info.height - 5)).toEqual([245, 238, 220]); // hors zone : identique (#F5EEDC)
      expect(imageVersions(pid, "A", homeImg.id)).toHaveLength(versions.length + 1);
      const { projectSnapshot: snap2 } = await import("@/lib/syna-agent/snapshot");
      expect(await fr(() => snap2(ctx))).toMatch(new RegExp(`${homeImg.id} : ${versions.length + 1} versions, actuelle n° ${versions.length + 1}`));
      // Zone rendue noire : retouche ratée, l'image d'avant reste en place.
      const before2 = loadMockupSet(pid)!.directions[0].images.find((i) => i.id === homeImg.id)!.assetId;
      mockupToolDeps.maskEdit = async (img) => { const m = await sharp(img).metadata(); return png("#000000", m.width, m.height); };
      const black = await call("mockup.edit", ctx, { direction: "A", imageId: homeImg.id, changes: [{ zone: "le bouton du haut", change: "le retirer" }] });
      expect(black.ok).toBe(false);
      expect(black.summary).toMatch(/RATÉE, rien n'a été remplacé.*rendue en noir/);
      expect(loadMockupSet(pid)!.directions[0].images.find((i) => i.id === homeImg.id)!.assetId).toBe(before2);
      // Retouche ratée au contrôle (essai réel : bouton coupé) : l'image d'avant reste en place, la ratée est une version.
      mockupToolDeps.maskEdit = async (img) => sharp(img).composite([{ input: await png("#00FF00", 30, 30), left: 10, top: 10 }]).png().toBuffer();
      mockupToolDeps.checkImage = async () => ({ deviceFrame: false, menuLinksAtTop: false, buttonInHeader: false, people: false, brokenAreas: true, textProblems: [], sections: [] });
      const nv = imageVersions(pid, "A", homeImg.id).length;
      const broken = await call("mockup.edit", ctx, { direction: "A", imageId: homeImg.id, changes: [{ zone: "le bouton du haut", change: "le retirer" }] });
      expect(broken.ok).toBe(false);
      expect(broken.summary).toMatch(/l'image d'avant reste en place/);
      expect(loadMockupSet(pid)!.directions[0].images.find((i) => i.id === homeImg.id)!.assetId).toBe(before2);
      expect(imageVersions(pid, "A", homeImg.id)).toHaveLength(nv + 1);
      // Une version qui n'existe pas : refusée.
      expect((await call("mockup.edit", ctx, { direction: "A", imageId: homeImg.id, fromVersion: 40, changes: [{ zone: "x x", change: "y y y" }] })).ok).toBe(false);
      const redone = loadMockupSet(pid)!.directions[0].images.find((i) => i.id === homeImg.id)!;
      expect(redone.status).toBe("ready");
      expect(redone.assetId).not.toBe(homeImg.assetId);
      // Ajouter des maquettes B et C garde les images réussies de A (essai réel du 8 novembre : l'accueil de A était effacé).
      const readyA = loadMockupSet(pid)!.directions[0].images.filter((i) => i.status === "ready").length;
      await call("mockup.prepare", ctx, { directions: [{ key: "A", name: "Lumière", style: "grandes photos plein cadre" }, { key: "B", name: "Atelier", style: "grille éditoriale serrée" }] });
      const after2 = loadMockupSet(pid)!;
      expect(after2.directions[0].images.filter((i) => i.status === "ready")).toHaveLength(readyA);
      expect(after2.directions[1].images.every((i) => i.status === "planned")).toBe(true);
      // Re-préparer A avec un style reformulé (essai réel : images payées lâchées) : A garde ses images.
      await call("mockup.prepare", ctx, { directions: [{ key: "A", name: "Lumière", style: "grandes photos plein cadre, reformulé autrement" }, { key: "B", name: "Atelier", style: "grille éditoriale serrée" }] });
      const after3 = loadMockupSet(pid)!;
      expect(after3.directions.find((x) => x.key === "A")!.images.filter((i) => i.status === "ready")).toHaveLength(readyA);
      // SINA voit les maquettes créées (consigne du propriétaire : « SINA doit lire les images »).
      const { journeyImages } = await import("@/lib/syna-agent/attachments");
      const seen = await journeyImages({ steps: {} } as any, pid);
      expect(seen.some((x) => /^Maquette A/.test(x.label ?? ""))).toBe(true);
      // La plus récente (l'image refaite), signalée comme toute nouvelle (essai réel : SINA regardait une autre image).
      expect(seen[0].label).toContain(`image ${homeImg.id}`);
      expect(seen[0].label).toContain("créée il y a quelques minutes");
      expect(redo.hint).toMatch(/Ne dis JAMAIS que tu ne peux pas voir/);
      // Le résumé du projet relu par SINA ne recopie jamais les maquettes (essai réel : 224 000 caractères à chaque pas).
      const { projectSnapshot } = await import("@/lib/syna-agent/snapshot");
      const snap = await fr(() => projectSnapshot(ctx));
      expect(snap).toMatch(/Maquettes sur mesure : A « Lumière » \(\d+\/\d+ images prêtes.* ; B « Atelier »/);
      // Identifiant de chaque image prête (essai réel : SINA ne trouvait pas l'image du contact à retoucher).
      expect(snap).toMatch(/prêtes : A01 accueil \(ordinateur\)/);
      expect(snap.length).toBeLessThan(6000);
      expect(snap).not.toContain("Planche de maquette");
    } finally { mockupToolDeps.generateImage = undefined; mockupToolDeps.checkImage = undefined; mockupToolDeps.locate = undefined; mockupToolDeps.maskEdit = undefined; }
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
    // Coût probable annoncé et plafond raisonnable (essai réel : plafond au pire ≈ 1 350 € pour Brindi).
    const { step7ProbableMicro, STEP7_CAP_FACTOR } = await import("@/lib/syna-agent/mockup-code/pipeline");
    const TYP = { analyze: 1, write: 2, compare: 1, fix: 2 };
    mockupToolDeps.callTypicalMicro = () => TYP;
    const est2 = await fr(() => tool("site.code_from_mockup").estimate!(ctx, {}));
    mockupToolDeps.callTypicalMicro = undefined;
    expect(est2.probableMicro).toBeGreaterThan(0);
    expect(est2.probableMicro).toBe(step7ProbableMicro({ images: s.directions[0].images.length, sections: s.pages.filter((x) => !x.variantOf && !x.template.startsWith("customers/")).reduce((n, x) => n + Math.max(1, x.sections.length - 2), 0) + 2, views: s.directions[0].images.reduce((n, i) => n + i.pages.length, 0) }, TYP));
    expect(est2.maxMicro).toBe(Math.min(est.maxMicro, Math.ceil(est2.probableMicro! * STEP7_CAP_FACTOR)));
    // Accueil seul d'abord (demande du propriétaire du 8 novembre) : seules ses images sont lues, devis plus petit.
    const homeOnly = await fr(() => tool("site.code_from_mockup").estimate!(ctx, { pages: ["home"] }));
    const homeImgs = s.directions[0].images.filter((i) => i.pages.includes("home")).length;
    expect(homeOnly.maxMicro).toBe(step7MaxMicro({ images: homeImgs, pages: 1, views: 2 }, UNIT));
    expect(homeOnly.maxMicro).toBeLessThan(est.maxMicro);
    const one1 = await call("site.code_from_mockup", ctx, { pages: ["home"] });
    expect(JSON.parse(one<any>("SELECT payload FROM jobs WHERE id=?", one1.jobs![0]).payload).pages).toEqual(["home"]);
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

    // Photos du site recréées en haute définition (demande du propriétaire du 8 novembre) : chaque emplacement de la
    // maquette, d'après sa zone sur l'image, posé dans le réglage image de sa section ; nouvelle version, toujours inactive.
    const { remember } = await import("@/lib/projects");
    const { STEP7_REPORT_KEY } = await import("@/lib/syna-agent/mockup-code/job");
    const { assetData, getAsset } = await import("@/lib/library");
    const spec0 = themeVersion(pid, res.versionId)!.spec;
    const type = "es-custom-home-2";
    spec0.customSections[type] = { name: "Ouverture", liquid: `<section>{% render 'es-image', image: section.settings.image, asset: section.settings.image_asset %}</section>{% schema %}{"name":"Ouverture","tag":"div","settings":[{"type":"image_picker","id":"image","label":"Image"},{"type":"text","id":"image_asset","label":"Fichier"}]}{% endschema %}` };
    const sid = "ouverture";
    spec0.templates.index.sections[sid] = { type, settings: {} } as any;
    spec0.templates.index.order.push(sid);
    const v2 = saveThemeVersion(pid, spec0, "site codé", "ai", undefined, undefined, { activate: false });
    const home = loadMockupSet(pid)!.directions[0].images.find((i) => i.viewport === "desktop" && i.pages.includes("home"))!;
    const slot = { page: "home", section: "Ouverture", template: "index", type, index: 0, imageId: home.id, box: { x: 0.1, y: 0.1, w: 0.5, h: 0.3 }, ratio: "16:9", description: "tasse fumante sur un bureau", prompt: "x" };
    // Une photo sans zone, et une photo d'une section non codée (essai réel : le journal, faute de budget) : ni l'une ni l'autre.
    remember(pid, { kind: "artifact", key: STEP7_REPORT_KEY, value: JSON.stringify({ versionId: v2.id, number: v2.number, direction: "A", report: { ...(report.data as any).report, imageSlots: [slot, { ...slot, index: 1, box: undefined }, { ...slot, type: "es-custom-home-9", section: "Journal" }] } }), source: "local", origin: "system" });
    mockupToolDeps.imageMaxMicro = () => 150_000;
    let prompt = "";
    mockupToolDeps.generateImage = async (pr) => { prompt = pr; return png("#AA5500", 300, 170); };
    try {
      const est = await fr(() => tool("site.images").estimate!(ctx, {}));
      expect(est.maxMicro).toBe(150_000); // une seule photo avec sa zone repérée sur la maquette, dans une section codée
      const r = await call("site.images", ctx, {});
      expect(r.ok, r.summary).toBe(true);
      expect(prompt).toMatch(/reproduis-la À L'IDENTIQUE en haute définition/);
      expect(prompt).toContain("tasse fumante sur un bureau");
      expect(prompt).toMatch(/aucune main/);
      // Photo sans emballage : pas de logo envoyé, et la consigne l'interdit (essai réel : « Brindi » sur des tasses).
      expect(prompt).toMatch(/Aucun logo, aucun nom de marque/);
      expect(prompt).not.toMatch(/Le logo de la marque est joint/);
      const v3 = themeVersion(pid, (r.data as any).version.id)!;
      expect(currentTheme(pid)!.version.id).toBe(cur.id); // le site courant ne change pas
      const set3 = v3.spec.templates.index.sections[sid].settings as any;
      expect(set3.image_asset).toBeTruthy();
      const placed = (r.data as any).photos[0].assetId;
      expect(v3.spec.files[set3.image_asset]).toBe(placed);
      expect(assetData(getAsset(placed)!).length).toBeGreaterThan(0);
      expect(((await call("mockup.report", ctx, {})).data as any).versionId).toBe(v3.version.id);
      // Site recodé : la photo déjà recréée est reposée sans frais (essai réel : 17 photos payées perdues au recodage).
      let calls = 0;
      mockupToolDeps.generateImage = async () => { calls++; return png("#123456", 300, 170); };
      const est3 = await fr(() => tool("site.images").estimate!(ctx, {}));
      expect(est3.maxMicro).toBe(0);
      const again = await call("site.images", ctx, {});
      expect(calls).toBe(0);
      expect(again.summary).toMatch(/reposée\(s\) sans frais/);
      // redo : refaite (payante).
      await call("site.images", ctx, { redo: true });
      expect(calls).toBe(1);
    } finally { mockupToolDeps.generateImage = undefined; mockupToolDeps.imageMaxMicro = undefined; }
  });

  it("étape 6 : mockup.generate crée seulement les images manquantes, les range et ne présente jamais une image ratée comme bonne", async () => {
    const { mockupToolDeps, mockupCodeTools } = await import("@/lib/syna-agent/mockup-code/tools");
    const tools = Object.fromEntries(mockupCodeTools.map((t) => [t.name, t]));
    expect(tools["mockup.generate"]).toBeTruthy();
    const { getTool } = await import("@/lib/syna-agent/registry");
    for (const name of ["mockup.pages", "mockup.prepare", "mockup.generate", "mockup.attach", "mockup.choose", "site.code_from_mockup", "mockup.report", "site.images", "calendar.plan", "calendar.read", "calendar.mark_done", "calendar.move"]) expect(getTool(name), name).toBeTruthy();
    expect(mockupToolDeps).toHaveProperty("imageMaxMicro");
  });

  it("images des maquettes : OpenAI GPT Image 2.5 Flare par défaut (choix du propriétaire du 8 novembre), modifiable par réglage", async () => {
    const { mockupImageRoute } = await import("@/lib/syna-agent/mockup-code/tools");
    const { setJsonSetting } = await import("@/lib/settings");
    expect(mockupImageRoute()).toEqual({ provider: "openai", model: "gpt-image-2.5-flare" });
    setJsonSetting("syna.mockup.image_route", "alibaba:qwen-image-3.0-pro");
    try { expect(mockupImageRoute()).toEqual({ provider: "alibaba", model: "qwen-image-3.0-pro" }); }
    finally { setJsonSetting("syna.mockup.image_route", "openai:gpt-image-2.5-flare"); }
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

  it("correction mot pour mot des textes (gratuite) et informations non confirmées jamais affirmées (essai réel du 8 novembre)", async () => {
    const { editPageCopy, copyPrompt } = await import("@/lib/syna-agent/mockup-code/copy");
    const c = { seo: { title: "Brindi", description: "d" }, sections: [{ section: "questions fréquentes", title: "Tes questions", text: null, button: null, items: [{ title: "Le vrac, c'est plus long à préparer ?", text: "Une cuillère, un filtre, et l'infusion devient ta pause. Conseils sur chaque fiche." }] }] };
    const r = editPageCopy(c, "Conseils sur chaque fiche.", "");
    expect(r.count).toBe(1);
    expect(r.copy.sections[0].items[0].text).toBe("Une cuillère, un filtre, et l'infusion devient ta pause.");
    expect(editPageCopy(c, "introuvable", "x").count).toBe(0);
    const { mockupPages: pagesFor } = await import("@/lib/syna-agent/mockup-code/pages");
    const page = pagesFor("products", "multi").find((x) => x.key === "home")!;
    const plan: any = { angle: null, keyMessages: [], objections: [], products: [], offer: { facts: [] }, company: { email: "contact@brindi.fr", address: "14 rue Notre-Dame, 33000 Bordeaux" } };
    const prompt = copyPrompt(page, { brand: { name: "Brindi" }, plan, toConfirm: ["Dosage, température et temps d'infusion de chaque mélange"] });
    expect(prompt).toContain("NON confirmés, à ne JAMAIS affirmer ni promettre");
    expect(prompt).toContain("Coordonnées : contact@brindi.fr · 14 rue Notre-Dame, 33000 Bordeaux.");
  });

  it("trois maquettes franchement différentes : fond clair, sombre ou aplats de marque ; jamais de main (essai réel du 8 novembre)", async () => {
    const { colourRoles, mockupImagePrompt } = await import("@/lib/syna-agent/mockup-code/prompts");
    const { mockupPages: pagesFor } = await import("@/lib/syna-agent/mockup-code/pages");
    const brand: any = { name: "Brindi", palette: { dark: "#233A2E", primary: "#3F6B4E", secondary: "#E3EDDF", accent: "#C9A04E", light: "#FFFFFF" }, paletteRoles: "sina-2026", ground: "blanc", fonts: { heading: "cormorant_garamond_n5", body: "karla_n4" } };
    expect(colourRoles(brand, "sombre")).toMatch(/version sombre : l'ouverture, la plupart des bandes et le pied de page sont sur le sombre #233A2E/);
    expect(colourRoles(brand, "marque")).toMatch(/grands aplats : alternance franche de bandes pleine largeur en couleur de marque #3F6B4E/);
    expect(colourRoles(brand)).toMatch(/fond des pages le clair #FFFFFF/);
    const f: any = { business: "products", name: "Brindi", brand, offers: [], productPhoto: false };
    const t = mockupImagePrompt(f, { name: "Nuit verte", style: "Grand titre sur photo pleine page, vagues", ground: "sombre" }, { viewport: "desktop", pages: ["home"] }, pagesFor("products", "multi"));
    expect(t).toContain("version sombre");
    expect(t).toContain("aucune main ni aucune autre partie du corps");
    expect(t).not.toContain("effets sobres");
  });

  it("pages clés seules sur leur image, en ordinateur ET en téléphone (essai réel : accueil serré avec trois écrans)", async () => {
    const { planImages } = await import("@/lib/syna-agent/mockup-code/mockup-set");
    const { mockupPages: pagesFor } = await import("@/lib/syna-agent/mockup-code/pages");
    const plan = planImages(pagesFor("products", "multi"));
    for (const v of ["desktop", "phone"] as const) {
      expect(plan.some((i) => i.viewport === v && i.pages.join() === "home")).toBe(true);
      expect(plan.some((i) => i.viewport === v && i.pages.join() === "product")).toBe(true);
    }
  });

  it("fiche produit : l'accroche n'est pas imposée, les produits complémentaires excluent le produit affiché (essai réel du 8 novembre)", async () => {
    const { fixAndCheckCopy } = await import("@/lib/syna-agent/mockup-code/copy");
    const { mockupPages: pagesFor } = await import("@/lib/syna-agent/mockup-code/pages");
    const page = pagesFor("products", "multi").find((x) => x.key === "product")!;
    const raw = { seo: { title: "t", description: "d" }, sections: page.sections.map((name) => ({ section: name, title: /prix/.test(name) ? "Thé vert jasmin" : "Titre", text: "x", button: null, items: /complémentaires/.test(name) ? [{ title: "Thé vert jasmin", text: null }, { title: "Rooibos vanille", text: null }] : /gros plans|questions|galerie|accordéons|usages/.test(name) ? [1, 2, 3].map((n) => ({ title: `i${n}`, text: null })) : [] })) };
    const { copy } = fixAndCheckCopy(raw as any, page, { headline: "Pose ton écran.", tagline: "Slogan", cta: "Choisis.", products: [{ title: "Thé vert jasmin", price: 850 }, { title: "Rooibos vanille", price: 850 }] });
    expect(copy.sections.find((x) => /complémentaires/.test(x.section))!.items.map((i) => i.title)).toEqual(["Rooibos vanille"]);
    expect(copy.sections.some((x) => x.title === "Pose ton écran.")).toBe(false);
  });

  it("téléphone : l'en-tête n'énumère pas les liens du menu (essai réel : menu d'ordinateur dessiné)", async () => {
    const { copyLines } = await import("@/lib/syna-agent/mockup-code/copy");
    const c: any = { sections: [
      { section: "en-tête (logo, menu, bouton principal)", title: null, text: null, button: "Choisis.", items: [{ title: "Nos mélanges", text: null }, { title: "Contact", text: null }] },
      { section: "pied de page complet", title: null, text: null, button: null, items: [{ title: "Nos mélanges", text: null }] },
    ] };
    const phone = copyLines(c, { phone: true });
    // Règle du propriétaire : en téléphone, ni liens ni bouton dans l'en-tête (rien à écrire en haut) ; liens au pied.
    expect(phone).toHaveLength(1);
    expect(phone.join()).not.toContain("bouton « Choisis. »");
    expect(phone[0]).toMatch(/pied de page.*Nos mélanges/);
    expect(copyLines(c)[0]).toContain("Nos mélanges");
    expect(copyLines(c)[0]).toContain("bouton « Choisis. »"); // en ordinateur, le bouton reste
    // Disposition dite dans chaque partie (essai réel : gros plans à quatre de front, moments à trois).
    const three = [{ title: "a", text: null }, { title: "b", text: null }, { title: "c", text: null }];
    const c2: any = { sections: [
      { section: "produit ou offre", title: null, text: null, button: null, items: three },
      { section: "détails (3 ou 4 gros plans)", title: null, text: null, button: null, items: three },
    ] };
    const [prod, det] = copyLines(c2, { phone: true });
    expect(prod).toContain("deux par rangée au plus");
    expect(det).toContain("l'un sous l'autre");
    expect(copyLines(c2)[1]).not.toContain("l'un sous l'autre");
  });

  it("contrôle automatique des maquettes : appareil dessiné, menu en haut, trois éléments côte à côte, personnes (essais réels du 8 novembre)", async () => {
    const { mockupCheckVerdict, mockupCheckPrompt } = await import("@/lib/syna-agent/mockup-code/check");
    const base = { deviceFrame: false, menuLinksAtTop: false, buttonInHeader: false, people: false, brokenAreas: false, textProblems: [], sections: [{ name: "Produits", maxSideBySide: 2 }] };
    expect(mockupCheckVerdict(base, "phone").ok).toBe(true);
    expect(mockupCheckVerdict({ ...base, deviceFrame: true }, "phone").problems).toEqual(["un appareil est dessiné autour de la page"]);
    expect(mockupCheckVerdict({ ...base, menuLinksAtTop: true }, "phone").ok).toBe(false);
    expect(mockupCheckVerdict({ ...base, menuLinksAtTop: true, sections: [{ name: "Gros plans", maxSideBySide: 4 }] }, "desktop").ok).toBe(true); // normal en ordinateur
    expect(mockupCheckVerdict({ ...base, sections: [{ name: "Gros plans", maxSideBySide: 4 }] }, "phone").problems[0]).toContain("« Gros plans » : 4 éléments côte à côte");
    expect(mockupCheckVerdict({ ...base, people: true }, "desktop").ok).toBe(false);
    expect(mockupCheckVerdict({ ...base, buttonInHeader: true }, "phone").ok).toBe(false);
    expect(mockupCheckVerdict({ ...base, buttonInHeader: true }, "desktop").ok).toBe(true); // en ordinateur, le bouton reste
    expect(mockupCheckVerdict({ ...base, brokenAreas: true }, "desktop").problems).toEqual(["une zone noire, vide ou cassée apparaît dans la page"]);
    const v = mockupCheckVerdict({ ...base, textProblems: ["« melange » sans accent"] }, "phone");
    expect(v.ok).toBe(true); expect(v.toVerify).toHaveLength(1);
    // Le plafond du contrôle couvre le pire cas de SON appel (essai réel : plafond fixe de 0,04 $ refusé par le Studio).
    const { mockupCheckCall, checkMaxMicro, MockupCheckSchema, CHECK_MODEL } = await import("@/lib/syna-agent/mockup-code/check");
    const { jsonCallMaxMicro } = await import("@/lib/ai/llm");
    const c = mockupCheckCall({ userId: "u", projectId: "p", jobId: null, usageKey: "k" }, Buffer.from("x"), { viewport: "phone", pages: ["home"] }, ["Accueil"]);
    expect(c.prompt.length + JSON.stringify(MockupCheckSchema.shape).length).toBeLessThan(6000);
    expect(jsonCallMaxMicro("anthropic", CHECK_MODEL.model, 6000, c.maxTokens!, c.maxOutputTokens!, "low")!.maxMicro).toBeLessThanOrEqual(checkMaxMicro());
    // Retouche : seuls les textes lus ET présents mot pour mot dans les textes de la page sont imposés.
    const { exactTexts, boxesOf } = await import("@/lib/syna-agent/mockup-code/edit");
    expect(exactTexts(["Lis le  journal", "Lis le journa", "Le journal de la pause"], ["Le journal de la pause", "Lis le journal"])).toEqual(["Lis le journal", "Le journal de la pause"]);
    // Marges des zones : fines en hauteur (essai réel : la marge mordait sur le logo et la partie suivante).
    expect(boxesOf({ zones: [{ n: 1, found: true, left: 52.5, top: 46.4, right: 86.4, bottom: 60.7, texts: [] }] }, 1, 1024, 1536)[0]).toEqual({ left: 527, right: 895, top: 713, bottom: 932 });
    // Contenu qui touche le bord d'une zone (essai réel : bouton collé au bas, sur le titre suivant) ; raccord propre accepté.
    const { cutEdges } = await import("@/lib/syna-agent/mockup-code/edit");
    const base0 = await sharp({ create: { width: 100, height: 100, channels: 3, background: "#233A2E" } }).png().toBuffer();
    const clean = await sharp(base0).composite([{ input: await png("#C9A04E", 40, 20), left: 30, top: 40 }]).png().toBuffer();
    const touching = await sharp(base0).composite([{ input: await png("#C9A04E", 60, 20), left: 20, top: 70 }]).png().toBuffer();
    const zone = { left: 10, top: 10, right: 90, bottom: 90 };
    expect(await cutEdges(base0, clean, zone)).toEqual([]);
    expect(await cutEdges(base0, touching, zone)).toEqual(["bas"]);
    // Textes disparus d'une zone retouchée (essai réel : « Lis le journal » perdu) ; un texte retiré exprès ne compte pas.
    const { missingTexts, removedTexts } = await import("@/lib/syna-agent/mockup-code/edit");
    const changes = [{ zone: "le bouton du haut", change: "retire le bouton doré « Choisis ton mélange de pause. »" }, { zone: "le journal", change: "les 3 articles l'un sous l'autre, puis le bouton « Lis le journal » sur toute la largeur" }];
    expect(removedTexts(changes[0].change, ["Choisis ton mélange de pause."])).toEqual(["Choisis ton mélange de pause."]);
    expect(removedTexts(changes[1].change, ["Lis le journal"])).toEqual([]);
    const before = [["Choisis ton mélange de pause."], ["Le journal de la pause", "Regarder les feuilles infuser", "Lis le journal"]];
    const after = { zones: [{ n: 1, found: false, left: 0, top: 0, right: 0, bottom: 0, texts: [] }, { n: 2, found: true, left: 0, top: 0, right: 1, bottom: 1, texts: ["Le journal de la pause", "Regarder les feuilles infuser"] }] };
    expect(missingTexts(changes, before, after)).toEqual(["Lis le journal"]);
    // Les bandes d'une même page en téléphone ne comptent pas comme une rangée d'éléments.
    expect(mockupCheckPrompt({ viewport: "phone", pages: ["home"] }, ["Accueil"])).toContain("ce n'est pas une rangée d'éléments");
  });

  it("pages aux textes écrits : chacune seule sur son image, images déjà créées gardées (option 3 du propriétaire, 8 novembre)", async () => {
    const { plannedDirection, replanDirection } = await import("@/lib/syna-agent/mockup-code/mockup-set");
    const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
    const pages = mockupPages("products", "multi");
    const d0 = plannedDirection("B", "Bandes vertes", "x", pages);
    const homeD = d0.images.find((i) => i.viewport === "desktop" && i.pages.includes("home"))!;
    const d1 = { ...d0, images: d0.images.map((i) => (i.id === homeD.id ? { ...i, status: "ready" as const, assetId: "a1" } : i)) };
    const d = replanDirection(d1, pages, ["home", "product", "catalog", "cart", "contact", "about"]);
    const desk = d.images.filter((i) => i.viewport === "desktop");
    for (const k of ["catalog", "cart", "contact", "about"]) expect(desk.some((i) => i.pages.join() === k), k).toBe(true);
    expect(d.images.find((i) => i.id === homeD.id)!.assetId).toBe("a1"); // image payée gardée, même identifiant
    expect(desk.filter((i) => i.pages.includes("home"))).toHaveLength(1);
    // Les pages principales restent couvertes, en ordinateur comme en téléphone ; les pages simples ne sont pas prévues.
    const { requiredPage } = await import("@/lib/syna-agent/mockup-code/pages");
    for (const v of ["desktop", "phone"] as const) for (const p of pages.filter((x) => x.viewports.includes(v) && requiredPage(x))) expect(d.images.some((i) => i.viewport === v && i.pages.includes(p.key)), `${v} ${p.key}`).toBe(true);
    expect(d.images.some((i) => i.pages.includes("terms"))).toBe(false);
    // Identifiants uniques.
    expect(new Set(d.images.map((i) => i.id)).size).toBe(d.images.length);
  });

  it("pages autres que l'accueil : titre propre, menu de l'accueil, panier d'exemple calculé (essai réel du 8 novembre)", async () => {
    const { fixAndCheckCopy, shippingRule, copyPrompt } = await import("@/lib/syna-agent/mockup-code/copy");
    const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
    const pages = mockupPages("products", "multi");
    const cart = pages.find((x) => x.key === "cart")!;
    expect(shippingRule("Colissimo en 48 à 72 h, 4,90 €. Offerte dès 35 € d'achat.")).toEqual({ fee: 490, freeFrom: 3500 });
    const raw: any = { seo: { title: "t", description: "d" }, sections: cart.sections.map((name) => ({ section: name, title: /lignes/.test(name) ? "Pose ton écran." : "Titre", text: "Texte", button: null, items: [{ title: "Thés", text: null }] })) };
    const nav = { header: [{ title: "Nos mélanges", text: null }, { title: "Le journal", text: null }], button: "Choisis ton mélange de pause.", footer: [{ title: "Mentions légales", text: null }] };
    const products = [{ title: "Thé vert jasmin", price: 850 }, { title: "Rooibos vanille", price: 850 }, { title: "Verveine-menthe", price: 750 }];
    const { copy, problems } = fixAndCheckCopy(raw, cart, { headline: "Pose ton écran.", products, nav, shipping: "4,90 €, offerte dès 35 €" });
    expect(problems.join()).toMatch(/l'accroche de l'accueil reprise comme titre/);
    const sec = (re: RegExp) => copy.sections.find((x) => re.test(x.section))!;
    expect(sec(/lignes/).items).toEqual([{ title: "Thé vert jasmin", text: "1 sachet · 8,50 €" }, { title: "Rooibos vanille", text: "1 sachet · 8,50 €" }]);
    expect(sec(/^sous-total/).items).toEqual([{ title: "Sous-total", text: "17 €" }, { title: "Livraison", text: "4,90 €" }, { title: "Total", text: "21,90 €" }]);
    // Au-delà du seuil, la livraison est offerte.
    const big = fixAndCheckCopy(raw, cart, { products: [{ title: "A", price: 2000 }, { title: "B", price: 1600 }], nav, shipping: "4,90 €, offerte dès 35 €" }).copy;
    expect(big.sections.find((x) => /^sous-total/.test(x.section))!.items).toEqual([{ title: "Sous-total", text: "36 €" }, { title: "Livraison", text: "offerte" }, { title: "Total", text: "36 €" }]);
    // Menu de l'accueil sur toutes les pages.
    const head = copy.sections.find((x) => /en-t[êe]te/.test(x.section));
    if (head) expect(head.items.map((i) => i.title)).toEqual(["Nos mélanges", "Le journal"]);
    // La consigne d'écriture d'une autre page interdit l'accroche comme titre.
    const plan: any = { angle: { title: "La vraie pause", message: "Pose ton écran.", cta: "Choisis." }, keyMessages: [], objections: [], products: [], offer: { facts: [] }, company: {} };
    expect(copyPrompt(cart, { brand: { name: "Brindi" }, plan })).toMatch(/titre de l'ACCUEIL seulement/);
    expect(copyPrompt(pages.find((x) => x.key === "home")!, { brand: { name: "Brindi" }, plan })).toMatch(/Accroche \(titre d'ouverture, mot pour mot\)/);
  });

  it("structure de vraie boutique imposée : panier, fiche produit, catalogue ; l'accueil reste libre (retour du propriétaire du 8 novembre)", async () => {
    const { mockupImagePrompt } = await import("@/lib/syna-agent/mockup-code/prompts");
    const { mockupPages, pageLayout } = await import("@/lib/syna-agent/mockup-code/pages");
    const pages = mockupPages("products", "multi");
    const facts: any = { business: "products", name: "Brindi", offers: [], productPhoto: false, angle: "angle « La vraie pause », accroche « Pose ton écran. »" };
    const cart = mockupImagePrompt(facts, { name: "B", style: "très grand titre d'ouverture" }, { viewport: "desktop", pages: ["cart"] }, pages);
    expect(cart).toContain("Structure imposée : une vraie page panier");
    expect(cart).toContain("jamais à cette structure");
    expect(cart).not.toContain("accroche « Pose ton écran. »");
    const withCopy = mockupImagePrompt({ ...facts, copy: { cart: { seo: { title: "t", description: "d" }, sections: [{ section: "lignes du panier (photo, quantité, prix)", title: "Ton panier", text: null, button: null, items: [{ title: "A", text: "1" }, { title: "B", text: "1" }] }] } } }, { name: "B", style: "x" }, { viewport: "desktop", pages: ["cart"] }, pages);
    expect(withCopy).toContain("montre EXACTEMENT les 2 lignes citées");
    expect(mockupImagePrompt(facts, { name: "B", style: "x" }, { viewport: "desktop", pages: ["product"] }, pages)).toContain("NOM DU PRODUIT en titre principal");
    const home = mockupImagePrompt(facts, { name: "B", style: "x" }, { viewport: "desktop", pages: ["home"] }, pages);
    expect(home).not.toContain("Structure imposée");
    expect(home).toContain("accroche « Pose ton écran. »");
    expect(pageLayout({ key: "about", group: "contenu" })).toBeNull();
    expect(pageLayout({ key: "terms", group: "legal" })).toMatch(/texte légal/);
  });

  it("retrait d'un élément sans IA : la bande est enlevée, la suite de la colonne remonte ; refus si autre chose sur ces lignes", async () => {
    const { removeBand, isRemoval } = await import("@/lib/syna-agent/mockup-code/edit");
    expect(isRemoval("Retirer ce bandeau entièrement")).toBe(true);
    expect(isRemoval("retire le bouton doré")).toBe(true);
    expect(isRemoval("Remplacer le texte « A » par « B »")).toBe(false);
    const mk = (parts: { c: string; x: number; y: number; w: number; h: number }[]) => sharp({ create: { width: 100, height: 200, channels: 3, background: "#EEEEEE" } }).composite(parts.map((p) => ({ input: { create: { width: p.w, height: p.h, channels: 3, background: p.c } } as any, left: p.x, top: p.y }))).png().toBuffer();
    // Colonne blanche (x 20-80) ; bandeau vert (y 50-60, x 30-70) ; titre noir plus bas (y 80-90) ; autre colonne dorée à gauche.
    const img = await mk([{ c: "#FFFFFF", x: 20, y: 10, w: 60, h: 180 }, { c: "#2F6B4E", x: 30, y: 50, w: 40, h: 10 }, { c: "#000000", x: 30, y: 80, w: 40, h: 10 }, { c: "#C9A04E", x: 2, y: 120, w: 10, h: 10 }]);
    const out = await removeBand(img, { left: 28, right: 72, top: 48, bottom: 62 });
    expect(out).not.toBeNull();
    const r = await sharp(out!).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => Array.from(r.data.subarray((y * 100 + x) * 3, (y * 100 + x) * 3 + 3));
    expect(px(50, 55)).toEqual([255, 255, 255]); // bandeau retiré
    expect(px(50, 70)).toEqual([0, 0, 0]); // titre remonté de 14 px
    expect(px(5, 125)).toEqual([201, 160, 78]); // l'autre colonne ne bouge pas
    // Zone repérée trop courte (essai réel : bas du bouton laissé en filet) : les restes collés à la zone partent aussi.
    const short = await removeBand(img, { left: 28, right: 72, top: 48, bottom: 57 });
    const r2 = await sharp(short!).raw().toBuffer({ resolveWithObject: true });
    expect(Array.from(r2.data.subarray((50 * 100 + 50) * 3, (50 * 100 + 50) * 3 + 3))).toEqual([255, 255, 255]);
    expect(Array.from(r2.data.subarray((70 * 100 + 50) * 3, (70 * 100 + 50) * 3 + 3))).toEqual([0, 0, 0]);
    // Autre contenu sur les mêmes lignes de la colonne : refusé (rien ne doit disparaître en plus).
    const busy = await mk([{ c: "#FFFFFF", x: 20, y: 10, w: 60, h: 180 }, { c: "#2F6B4E", x: 30, y: 50, w: 20, h: 10 }, { c: "#000000", x: 60, y: 50, w: 10, h: 10 }]);
    expect(await removeBand(busy, { left: 28, right: 52, top: 48, bottom: 62 })).toBeNull();
  });

  it("lecture de maquette : variantes de forme acceptées (essai réel : lecture juste refusée et payée deux fois)", async () => {
    const { MockupAnalysisSchema } = await import("@/lib/syna-agent/mockup-code/analyze");
    const raw = {
      pages: [{ page: "home", region: { x: 0.1, y: 0, w: 0.8, h: 1 }, notes: ["a", "b"], sections: [{ role: "ouverture", name: "Ouverture héros", layout: "deux colonnes", texts: [{ nature: "titre principal", text: "Pose ton écran." }, { nature: "bouton", text: "Choisis." }, "texte libre"], images: [{ description: "tasse", box: { x: 0.5, y: 0.1, w: 0.3, h: 0.1 } }], colors: { fond: "#1E3B2A", texte: "blanc #FFFFFF" }, typography: ["serif", "sans"] }] }],
      palette: { vert_fonce: "#1E3B2A", dore: "#D3A95C", note: "pas une couleur" },
      fonts: ["Serif de titrage", "Sans-serif humaniste"],
      notes: ["illisible : pied de page", "ambigu"],
    };
    const r = MockupAnalysisSchema.parse(raw);
    expect(r.palette).toEqual(["#1E3B2A", "#D3A95C"]);
    expect(r.fonts).toEqual({ heading: "Serif de titrage", body: "Sans-serif humaniste" });
    expect(r.notes).toBe("illisible : pied de page ; ambigu");
    const sec = r.pages[0].sections[0];
    expect(sec.texts.map((t) => t.kind)).toEqual(["titre", "bouton", "autre"]);
    expect(sec.colors).toEqual({ background: "#1E3B2A", text: "#FFFFFF" });
    expect(sec.images[0].box).toEqual({ x: 0.5, y: 0.1, w: 0.3, h: 0.1 });
    expect(r.pages[0].notes).toBe("a ; b");
  });

  it("premier essai réel de l'étape 7 : textes de la maquette vérifiés mot pour mot, charte posée sur le squelette", async () => {
    const { missingTexts, sectionBrief } = await import("@/lib/syna-agent/mockup-code/deps");
    const { withBrand } = await import("@/lib/syna-agent/mockup-code/job");
    const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
    const sec: any = { texts: [{ kind: "sous-titre", text: "Assemblé à la main" }, { kind: "paragraphe", text: "Thés, plantes, fleurs et fruits : tous les ingrédients sont bio." }, { kind: "titre", text: "[illisible]" }] };
    const written = { liquid: "<h3>{{ block.settings.title }}</h3>", blocks: [{ type: "card", settings: { title: "La recette, en clair", text: "<p>Thés, plantes, fleurs et fruits&nbsp;: tous les ingrédients sont bio.</p>" } }] };
    const issues = missingTexts(sec, written);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("« Assemblé à la main »");
    expect(issues[0]).not.toContain("tous les ingrédients sont bio");
    expect(missingTexts(sec, { blocks: [{ settings: { title: "Assemblé à la main", text: "Thés, plantes, fleurs et fruits : tous les ingrédients sont bio." } }] })).toEqual([]);
    // En-tête : le logo du thème, toujours affiché (essai réel : en-tête sans logo).
    const home = mockupPages("products", "multi").find((x) => x.key === "home")!;
    const brief = sectionBrief(home, { index: 0, role: "header", name: "En-tête", layout: "x", texts: [], images: [], colors: {}, target: { kind: "group", group: "header" } } as any, [], undefined, true);
    expect(brief).toContain("settings.logo_asset");
    // Charte posée sur le thème de départ (essai réel : accueil codé en bleu, couleurs du squelette).
    const spec: any = { settings: { color_schemes: { "scheme-1": { settings: { background: "#D0E4F5" } } }, type_heading_font: "x", type_body_font: "y" } };
    const out: any = withBrand(spec, { brand: { palette: { dark: "#233A2E", primary: "#3F6B4E", secondary: "#E3EDDF", accent: "#C9A04E", light: "#FFFFFF" }, fonts: { heading: "cormorant_garamond_n5", body: "karla_n4" } } } as any);
    expect(out.settings.color_schemes["scheme-3"].settings.background).toBe("#233A2E");
    expect(out.settings.color_schemes["scheme-1"].settings.background).toBe("#FFFFFF");
    expect(out.settings.type_heading_font).toBe("cormorant_garamond_n5");
    expect(spec.settings.type_heading_font).toBe("x"); // le thème de départ n'est pas modifié
  });

  it("allégations : la livraison offerte écrite par le client est permise (essai réel : « Tes questions » refusé)", async () => {
    const { lintClaims } = await import("@/lib/ai/tasks");
    const p: any = { business: "products", product: { facts: [], questions: [], price: { amount: 8.5, status: "confirmed" } }, catalog: [], settings: { company: { shipping: "Colissimo en 48 à 72 h, 4,90 €. Offerte dès 35 € d'achat." } } };
    const text = { a: "La livraison offerte dès 35 € d'achat." };
    expect(lintClaims(text, p).map((x) => x.term.toLowerCase())).not.toContain("livraison offerte");
    expect(lintClaims({ a: "Colissimo, 4,90 €, offerte dès 35 €." }, p)).toEqual([]); // montants donnés par le client
    expect(lintClaims({ a: "Livraison à 2,90 €." }, p).map((x) => x.term)).toContain("2,90 €"); // montant inventé
    expect(lintClaims(text, { ...p, settings: {} }).map((x) => x.term.toLowerCase())).toContain("livraison offerte");
  });

  it("fidélité à l'identique (retour du propriétaire) : consigne de section et photo fondue dans le fond", async () => {
    const { sectionBrief } = await import("@/lib/syna-agent/mockup-code/deps");
    const { siteImageHdPrompt } = await import("@/lib/syna-agent/mockup-code/prompts");
    const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
    const home = mockupPages("products", "multi").find((x) => x.key === "home")!;
    const brief = sectionBrief(home, { index: 1, role: "ouverture", name: "Ouverture", layout: "x", texts: [], images: [], colors: {}, target: { kind: "custom" } } as any, [], undefined, true);
    expect(brief).toMatch(/couleurs EXACTES lues sur la maquette/);
    expect(brief).toMatch(/sans cadre, sans bordure/);
    expect(brief).toMatch(/jamais noirs par défaut/);
    const pr = siteImageHdPrompt({ description: "tasse", background: "#233A2E" }, { name: "Brindi", logo: false, product: false });
    expect(pr).toContain("couleur unie exacte #233A2E");
  });
});
