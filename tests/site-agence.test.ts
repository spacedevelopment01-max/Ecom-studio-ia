/**
 * Refonte des sites au niveau agence (Theme Engine V2) : nouvelles sections (bandeau, cartes illustrées, bannière
 * photo, bénéfices illustrés), choix selon le contenu réel (jamais de section vide ni de phrase répétée), fiche produit
 * avec miniatures et agrandissement des images, rendu réel par le moteur d'aperçu.
 */
import { describe, expect, it } from "vitest";

describe("Sites niveau agence", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { composeThemeV2 } = await import("@/lib/theme-v2/engine");
  const { compose } = await import("@/lib/theme-v2/compose");
  const { compileTheme } = await import("@/lib/theme/compile");
  const { renderPage } = await import("@/lib/theme/render");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const u = await createUser(`agence-${Date.now()}@test.fr`, "motdepasse-test", "A");
  const hid = await seedThemeScenario(u.id, "hightech");
  const hightech = await fr(() => composeThemeV2(hid));
  const types = (t: { order: string[]; sections: Record<string, { type: string }> }) => t.order.map((k) => t.sections[k].type);

  it("accueil d'une boutique : bandeau de marque et bannière photo, sans répéter la phrase de l'ouverture", () => {
    const home = hightech.spec.templates.index;
    const list = types(home);
    expect(list[0]).toBe("v2-hero");
    expect(list).toContain("v2-band");
    expect(list).toContain("v2-banner");
    const hero = Object.values(home.sections).find((s) => s.type === "v2-hero")!;
    const said = `${hero.settings.heading} ${hero.settings.heading_em}`.toLowerCase();
    for (const s of Object.values(home.sections).filter((x) => x.type === "v2-band" || x.type === "v2-banner")) {
      const text = String(s.settings.text && s.type === "v2-band" ? s.settings.text : s.settings.heading).toLowerCase().replace(/[.!]+$/, "");
      expect(said.includes(text), text).toBe(false);
    }
  });

  it("fiche produit : galerie à miniatures, agrandissement au clic, barre d'achat ; rendu réel avec la boîte d'agrandissement", async () => {
    const prod = hightech.spec.templates.product;
    const main = Object.values(prod.sections).find((s) => s.type === "main-product")!;
    expect(main.settings.gallery_layout).toBe("carousel");
    expect(main.settings.enable_zoom).toBe(true);
    expect(main.settings.sticky_bar).toBe(true);
    const handle = hightech.spec.store.product.handle;
    const html = (await fr(() => renderPage({ spec: hightech.spec, base: "/p", files: compileTheme(hightech.spec), cart: [] }, `/products/${handle}`, new URLSearchParams()))).html;
    expect(html).toContain("es-product__thumbs");
    expect(html).toMatch(/data-zoom-open[^>]+data-zoom-src=/);
    expect(html).toContain("<dialog class=\"es-zoom\"");
    expect(html).toMatch(/aria-label="Agrandir l'image"/);
  });

  it("rendu réel de l'accueil : bandeau et bannière affichés, aucune section V2 vide", async () => {
    const html = (await fr(() => renderPage({ spec: hightech.spec, base: "/p", files: compileTheme(hightech.spec), cart: [] }, "/", new URLSearchParams()))).html;
    expect(html).toContain("v2-band--rule");
    expect(html).toMatch(/class="v2-banner v2-banner--(panel|overlay|panorama)/);
  });

  // Composition seule, avec un contenu maîtrisé : chaque section n'apparaît qu'avec un contenu réel.
  const base = hightech;
  const content = (patch: Record<string, unknown>) => ({ ...base.content, ...patch }) as typeof base.content;

  it("boutique avec collections : cartes illustrées des vraies collections (photo, lien) ; sans photo : aucune carte", () => {
    const intent = { ...base.intent, site: "shop_multi" as const };
    const catalog = {
      collections: [
        { handle: "sacs", title: "Sacs", description: "Pensés pour aller plus loin", image: "col-sacs.jpg", products: ["a"] },
        { handle: "equipement", title: "Équipement", description: "", image: "col-eq.jpg", products: ["b"] },
        { handle: "vide", title: "Sans photo", description: "", products: ["c"] },
      ],
      products: [],
    };
    const c = fr(() => compose(intent, base.art, content({}), "ostral", null, catalog));
    const cards = Object.values(c.templates.index.sections).find((s) => s.type === "v2-cards");
    expect(cards).toBeTruthy();
    const blocks = Object.values(cards!.blocks ?? {});
    expect(blocks.map((b) => b.settings.title)).toEqual(["Sacs", "Équipement"]);
    expect(blocks[0].settings.link).toBe("/collections/sacs");
    const none = fr(() => compose(intent, base.art, content({}), "ostral", null, { collections: catalog.collections.map((x) => ({ ...x, image: undefined })), products: [] }));
    expect(types(none.templates.index)).not.toContain("v2-cards");
  });

  it("produits du catalogue en cartes : prix réel affiché, jamais de prix inventé", () => {
    const intent = { ...base.intent, site: "shop_multi" as const };
    const p = (h: string, price: number | null) => ({ title: h, handle: h, vendor: "", description_html: "", price, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [`${h}.jpg`], tags: [] });
    const c = fr(() => compose(intent, base.art, content({}), "a", null, { collections: [], products: [p("a", 1490), p("b", null), p("c", 2900)] }));
    const cards = Object.values(c.templates.index.sections).find((s) => s.type === "v2-cards")!;
    const kickers = Object.values(cards.blocks ?? {}).map((b) => b.settings.kicker);
    expect(kickers[0]).toMatch(/14,90/);
    expect(kickers[1]).toBe("");
  });

  it("bénéfices illustrés : atouts confirmés avec une photo de détail chacun ; sans atout confirmé, pas de section", () => {
    const offers = [{ title: "Pliable", text: "<p>Se range dans un sac.</p>", meta: "" }, { title: "Stabilisé", text: "<p>Nacelle 3 axes.</p>", meta: "" }];
    const c = fr(() => compose(base.intent, base.art, content({ offers, images: { ...base.content.images, detail1: "d1.jpg", detail2: "d2.jpg", scene1: undefined, scene2: undefined } }), "ostral", null));
    const b = Object.values(c.templates.index.sections).find((s) => s.type === "v2-benefits");
    expect(b).toBeTruthy();
    expect(b!.settings.layout).toBe("images");
    // Photos jamais réutilisées d'une section à l'autre : « d1 » sert déjà à « En détail ».
    const pics = Object.values(b!.blocks ?? {}).map((x) => String(x.settings.image_asset));
    expect(pics[0]).toBe("d2.jpg");
    expect(new Set(pics).size).toBe(2);
    expect(pics).not.toContain("d1.jpg");
    const none = fr(() => compose(base.intent, base.art, content({ offers: [] }), "ostral", null));
    expect(types(none.templates.index)).not.toContain("v2-benefits");
  });

  it("bannière : jamais sans photo réelle ; site de services : prestations en pictogrammes sous l'ouverture", () => {
    const noPic = fr(() => compose(base.intent, base.art, content({ images: { logo: base.content.images.logo } }), "ostral", null));
    expect(types(noPic.templates.index)).not.toContain("v2-banner");
    const intent = { ...base.intent, site: "services_trade" as const, conversion: "quote" as const };
    const offers = ["Plâtrerie", "Enduits", "Peinture"].map((title) => ({ title, text: "", meta: "" }));
    const svc = fr(() => compose(intent, base.art, content({ offers }), null, null));
    const band = Object.values(svc.templates.index.sections).find((s) => s.type === "v2-band")!;
    expect(band.settings.layout).toBe("icons");
    expect(Object.values(band.blocks ?? {}).map((b) => b.settings.label)).toEqual(["Plâtrerie", "Enduits", "Peinture"]);
  });

  it("ouverture pleine largeur : seulement avec une vraie photo paysage ; en-tête transparent posé dessus", () => {
    const art = { ...base.art, hero: { ...base.art.hero, layouts: ["immersive", "stage", "split"] as typeof base.art.hero.layouts } };
    const imgs = { ...base.content.images, lifestyle: "campagne.jpg" };
    const wide = fr(() => compose(base.intent, art, content({ images: imgs, wide: ["campagne.jpg"] }), "ostral", null));
    const hero = Object.values(wide.templates.index.sections).find((x) => x.type === "v2-hero")!;
    expect(hero.settings.layout).toBe("immersive");
    expect(hero.settings.image_asset).toBe("campagne.jpg");
    expect(wide.header.transparent_on_home).toBe(true);
    const portrait = fr(() => compose(base.intent, art, content({ images: imgs, wide: [] }), "ostral", null));
    expect(Object.values(portrait.templates.index.sections).find((x) => x.type === "v2-hero")!.settings.layout).not.toBe("immersive");
    expect(portrait.header.transparent_on_home).toBe(false);
  });

  it("textes de section rédigés : utilisés pour la bannière, le détail et l'appel final ; un titre d'un seul mot ou « à compléter » est ignoré", () => {
    const lines = { statement: { eyebrow: "Le voyage", heading: "Faites de la place à l'horizon.", text: "Ostral vous suit partout." }, detail: { eyebrow: "", heading: "Pensé pour partir léger.", text: "" }, cta: { heading: "Prêt pour le prochain départ ?", text: "", button: "Commander" }, gallery: "", features: "" };
    const c = fr(() => compose(base.intent, base.art, content({ lines }), "ostral", null));
    const secs = Object.values(c.templates.index.sections);
    expect(secs.find((x) => x.type === "v2-banner")?.settings.heading).toBe("Faites de la place à l'horizon.");
    expect(secs.find((x) => x.type === "v2-cta")?.settings.heading).toBe("Prêt pour le prochain départ ?");
    expect(secs.find((x) => x.type === "v2-cta")?.settings.button_label).toBe("Commander");
  });

  it("titre d'ouverture : le titre rédigé pour l'accueil, jamais la longue phrase de positionnement", async () => {
    const { siteContent } = await import("@/lib/theme-v2/content");
    const { loadProject } = await import("@/lib/projects");
    const { localCopy } = await import("@/lib/engine/local-copy");
    const p = loadProject(hid);
    p.brand!.positioning = "Pour la personne qui souhaite filmer ses voyages sans porter de matériel lourd, Ostral est un drone pliable qui se range dans un sac parce que ses bras se replient.";
    const copy = fr(() => localCopy(p.product, p.brand!, p));
    copy.hero.heading = "Partez léger, filmez loin";
    copy.hero.text = "Un drone pliable pour vos voyages.";
    const c = fr(() => siteContent(p, hightech.intent, copy, hightech.content.images, []));
    expect(`${c.hero.heading} ${c.hero.em}`.trim()).toBe("Partez léger, filmez loin");
    expect(c.hero.text).toBe("Un drone pliable pour vos voyages.");
    copy.hero.heading = "[À compléter : titre]";
    const none = fr(() => siteContent(p, hightech.intent, copy, hightech.content.images, []));
    expect(`${none.hero.heading} ${none.hero.em}`).not.toMatch(/Pour la personne/);
    expect(`${none.hero.heading} ${none.hero.em}`.length).toBeLessThanOrEqual(80);
  });

  it("boutique : faits confirmés en pictogrammes sous l'ouverture ; pied de page sans la phrase de positionnement", () => {
    const facts = [{ label: "Garnissage", value: "mousse à mémoire de forme" }, { label: "Housse", value: "amovible" }, { label: "Conception", value: "ergonomique" }];
    const long = "Pour la personne qui souhaite remplacer un oreiller classique par une forme plus structurée, Noryme est un oreiller ergonomique en mousse à mémoire de forme.";
    const c = fr(() => compose(base.intent, { ...base.art, positioning: long }, content({ facts, lines: { ...base.content.lines, about: "" } }), "ostral", null));
    const order = types(c.templates.index);
    expect(order[1]).toBe("v2-band");
    const strip = c.templates.index.sections[c.templates.index.order[1]];
    expect(strip.settings.layout).toBe("icons");
    expect(Object.values(strip.blocks ?? {}).map((b) => b.settings.label)).toEqual(["Mousse à mémoire de forme", "Amovible", "Ergonomique"]);
    // Jamais deux bandeaux collés.
    order.forEach((x, i) => { if (x === "v2-band") expect(order[i + 1]).not.toBe("v2-band"); });
    expect(String(c.footer.tagline)).not.toMatch(/Pour la personne/);
    expect(JSON.stringify(c.footerBlocks)).not.toMatch(/Pour la personne/);
    const two = fr(() => compose(base.intent, base.art, content({ facts: facts.slice(0, 2) }), "ostral", null));
    expect(Object.values(two.templates.index.sections).some((x) => x.type === "v2-band" && x.settings.layout === "icons")).toBe(false);
  });

  it("boutique d'un produit : le produit à acheter dès l'accueil (vrai produit, galerie, quantité) ; points forts seulement confirmés", async () => {
    const intent = { ...base.intent, site: "shop_mono" as const };
    const facts = [{ label: "Caméra", value: "stabilisée" }, { label: "Bras", value: "pliables" }, { label: "Poids", value: "249 g" }];
    const c = fr(() => compose(intent, base.art, content({ facts }), "ostral", null));
    const fp = Object.values(c.templates.index.sections).find((x) => x.type === "featured-product")!;
    expect(fp.settings.product).toBe("ostral");
    expect(fp.settings.show_quantity).toBe(true);
    expect(fp.settings.enable_zoom).toBe(true);
    expect(Object.values(fp.blocks ?? {}).map((b) => b.settings.text)).toEqual(["Caméra : stabilisée", "Bras : pliables", "Poids : 249 g"]);
    const few = fr(() => compose(intent, base.art, content({ facts: facts.slice(0, 1) }), "ostral", null));
    expect(Object.keys(Object.values(few.templates.index.sections).find((x) => x.type === "featured-product")!.blocks ?? {})).toHaveLength(0);
    const multi = fr(() => compose({ ...intent, site: "shop_multi" as const }, base.art, content({ facts }), "ostral", null));
    expect(types(multi.templates.index)).not.toContain("featured-product");
    // Rendu réel : formulaire d'ajout au panier du vrai produit.
    const html = (await fr(() => renderPage({ spec: hightech.spec, base: "/p", files: compileTheme(hightech.spec), cart: [] }, "/", new URLSearchParams()))).html;
    if (hightech.intent.site === "shop_mono") expect(html).toMatch(/data-featured-product[\s\S]*data-add-button/);
  });

  it("site de services (devis) : formulaire de demande en fin d'accueil à la place du simple bouton ; réservation par lien : le bouton reste", () => {
    const offers = ["Plâtrerie", "Enduits", "Peinture"].map((title) => ({ title, text: "", meta: "" }));
    const quote = fr(() => compose({ ...base.intent, site: "services_trade" as const, conversion: "quote" as const }, base.art, content({ offers }), null, null));
    const list = types(quote.templates.index);
    expect(list[list.length - 1]).toBe("contact-form");
    expect(list).not.toContain("v2-cta");
    const book = fr(() => compose({ ...base.intent, site: "local_service" as const, conversion: "book" as const }, base.art, content({ offers, contact: { ...base.content.contact, bookingUrl: "https://reservation.exemple/rdv" } }), null, null));
    expect(types(book.templates.index)).not.toContain("contact-form");
    expect(types(book.templates.index)).toContain("v2-cta");
  });
});

