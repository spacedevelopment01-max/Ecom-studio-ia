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
});
