/**
 * SOUPLE (issue #158) : thème **de la famille E-commerce** pour une collection de quatre produits — tapis de yoga, brique,
 * sangle et anneau de Pilates. Garde-fous :
 *  - thème actif du catalogue, famille E-commerce partout (catalogue, recommandation, bibliothèque, exports) ; profil
 *    éditorial propre (« poudre ») ; en-tête « Collections en cartes » et pied « Boutique éditoriale » de la famille ;
 *  - composition distincte des autres thèmes E-commerce (polices, en-tête / pied, ouverture) et jamais celle de MUSEAU
 *    CLUB (Produit spécifique) ;
 *  - démonstration composée par le vrai moteur puis rédigée dans le même ordre ; EXACTEMENT quatre produits distincts,
 *    chacun avec sa fiche (ses cinq vues, son texte, ses points) ; la collection lisible dès l'ouverture, chaque tuile et
 *    chaque scène reliée au bon produit ; les 31 médias utilisés ; aucune même image dans deux sections qui se suivent ;
 *  - rien d'inventé (prix, matières, dimensions, adhérence, bienfaits, certifications, avis…), aucun « à compléter »
 *    public ; achat explicitement indisponible sans prix, normal avec des prix de test dans une copie isolée ;
 *  - un autre projet (un seul produit, ou plusieurs produits) garde sa propre identité ; exports.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { renderPage } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { validateSpec } from "@/lib/theme/ops";
import { reconcileOfferCart } from "@/lib/theme/purchase-offers";
import { catalogTheme } from "@/lib/theme/theme-catalog";
import { ACTIVE_THEMES, themeKinds, themePreviewPath } from "@/lib/theme/theme-fit";
import { THEME_FAMILY, FAMILY_LIBRARY } from "@/lib/theme/section-families";
import { currentChromePreset } from "@/lib/theme/family-chrome";
import { themeAllowed } from "@/lib/theme/theme-access";
import { storeProducts } from "@/lib/theme/store-products";
import { composeShop } from "@/lib/engine/shop";
import { saveBrand, loadProject } from "@/lib/projects";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { designLayer } from "@/lib/cms-v2/design";
import { REFERENCE_THEMES } from "@/lib/project-handoff/categories";
import { demoProject } from "./demo-fixtures";
import { SOUPLE_MEDIA, SOUPLE_PRODUCTS } from "./museau-souple-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { sampleSpec } from "./fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ");
const LIBRARY = new Set(FAMILY_LIBRARY.catalog.flatMap((e) => e.dispositions.map((d) => d.type)));
const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");
const ID = "souple";
const PLAN = {
  profile: "poudre", fonts: { heading: "playfair_display_n4", body: "jost_n4" },
  home: ["ed-opening", "fs-collections", "rich-text", "fs-products", "ed-scene", "image-with-text", "featured-purchase", "faq", "newsletter-media"],
  product: ["main-product", "ed-scene", "product-recommendations", "faq"],
  pages: ["chez-soi", "aide"], header: "mega-cards", footer: "store",
  leak: /SOUPLE|rose poudré|tapis|brique|sangle|anneau de Pilates|Reprendre en douceur|Pas de niveau à retrouver/i,
};

describe("SOUPLE : thème actif de la famille E-commerce (quatre produits)", () => {
  it("catalogue, famille E-commerce partout, profil, polices, accès par forfait, aperçu suivi", () => {
    expect(ACTIVE_THEMES).toContain(ID);
    expect(themeKinds(ID)).toEqual(["catalog"]);
    expect(THEME_FAMILY[ID]).toBe("catalog");
    expect(REFERENCE_THEMES.find((t) => t.referenceId === ID)?.categories).toEqual(["ecommerce"]);
    expect(themeAllowed("creer", ID)).toBe(true);
    expect(themeAllowed(null, ID)).toBe(false);
    const t = catalogTheme(ID)!;
    expect(t.kinds).toEqual(["catalog"]);
    expect(t.settings).toMatchObject({ editorial_profile: PLAN.profile, conversion_profile: "none" });
    expect(t.fonts).toEqual(PLAN.fonts);
    expect(fs.existsSync(path.join(process.cwd(), "public", themePreviewPath(ID)))).toBe(true);
  });

  it("profil « poudre » et titre de page des collections : réglages facultatifs, profils existants intacts", () => {
    const ed = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "editorial.css"), "utf8");
    for (const p of ["poudre", "studio", "cadran", "arrondi", "object", "journal"]) expect(ed, p).toContain(`body[data-editorial="${p}"]`);
    const schema = JSON.parse(fs.readFileSync(path.join(process.cwd(), "theme-base", "config", "settings_schema.json"), "utf8")) as { settings?: { id?: string; options?: { value: string }[] }[] }[];
    const opts = (id: string) => schema.flatMap((g) => g.settings ?? []).find((s) => s.id === id)!.options!.map((o) => o.value);
    expect(opts("editorial_profile")).toContain("poudre");
    expect(opts("style_preset")).toContain(ID);
    const coll = fs.readFileSync(path.join(process.cwd(), "theme-base", "sections", "fs-collections.liquid"), "utf8");
    // Niveau du titre facultatif, « Titre de section » par défaut : aucun autre usage de la section ne change.
    expect(coll).toMatch(/"id": "heading_tag",[\s\S]{0,400}"default": "h2"/);
  });

  it("composition distincte des autres thèmes E-commerce et de MUSEAU CLUB (polices, couple en-tête / pied, ouverture)", () => {
    const ids = ACTIVE_THEMES.filter((i) => THEME_FAMILY[i] === "catalog");
    expect(ids).toEqual(expect.arrayContaining(["onde", "orbe", "heuren", "alcove", ID]));
    const chrome = (id: string) => { const t = catalogTheme(id)!; return `${t.headerSettings?.layout ?? t.look.headerLayout}/${t.headerSettings?.mega_menu ?? "none"}/${t.look.shape}+${t.look.footer}`; };
    const me = catalogTheme(ID)!;
    for (const id of [...ids.filter((x) => x !== ID), "museau-club"]) {
      expect(catalogTheme(id)!.fonts.heading, id).not.toBe(me.fonts.heading);
      expect(chrome(id), id).not.toBe(chrome(ID));
    }
  });
});

describe("SOUPLE : démonstration de quatre produits", async () => {
  const user = await createUser("souple-demo@example.invalid", "isolated-test-only", "Souple");
  const f = await fr(() => demoProject(user.id, ID));
  const { spec } = f;
  const files = compileTheme(spec);
  const products = storeProducts(spec);
  const keyOf = (handle: string) => { const pr = products.find((x) => x.handle === handle)!; return pr.template_suffix ? `product.${pr.template_suffix}` : "product"; };
  const types = (key: string) => spec.templates[key].order.map((sid) => spec.templates[key].sections[sid]);
  const productRoutes = SOUPLE_PRODUCTS.map((it) => `/products/${it.handle}`);
  const routes = ["/", "/collections/all", ...productRoutes, ...spec.store.pages.map((p) => `/pages/${p.handle}`)];
  const pages = new Map<string, string>();
  for (const route of routes) pages.set(route, (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html);
  const all = [...pages.values()].join("\n");

  it("composée dans son thème, sections de la bibliothèque E-commerce, ordre de la composition", () => {
    expect(spec.direction).toBe(ID);
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index").map((s) => s.type)).toEqual(PLAN.home);
    for (const it of SOUPLE_PRODUCTS) expect(types(keyOf(it.handle)).map((s) => s.type), it.key).toEqual(PLAN.product);
    for (const key of ["index", ...SOUPLE_PRODUCTS.map((it) => keyOf(it.handle))]) for (const s of types(key)) {
      expect(!!s.disabled, `${key} ${s.type}`).toBe(false);
      if (s.type !== "main-product") expect(LIBRARY.has(s.type), s.type).toBe(true);
    }
    // Aucune section de la famille Produit spécifique (celle de MUSEAU CLUB) ni de ses dispositions.
    for (const t of Object.values(spec.templates)) for (const s of Object.values(t.sections)) expect(s.type, s.type).not.toMatch(/^cv-/);
    expect(spec.store.pages.map((p) => p.handle)).toEqual(PLAN.pages);
    expect(spec.settings.editorial_profile).toBe(PLAN.profile);
    expect(spec.settings.conversion_profile).toBe("none");
    expect(loadProject(f.pid).settings.storeKind).toBe("catalog");
    expect(loadProject(f.pid).storeType).toBe("multi");
  });

  it("exactement quatre produits distincts, chacun sur sa fiche, dans une seule vraie collection", () => {
    expect(products.map((x) => x.handle)).toEqual(SOUPLE_PRODUCTS.map((it) => it.handle));
    expect(new Set(products.map((x) => x.title)).size).toBe(4);
    expect(new Set(products.map((x) => keyOf(x.handle))).size).toBe(4);
    expect(spec.store.collections).toHaveLength(1);
    expect(spec.store.collections![0].products).toEqual(SOUPLE_PRODUCTS.map((it) => it.handle));
    // Aucun cinquième produit : ni une scène de collection, ni une vue, ni un lot.
    expect(JSON.stringify(products.map((x) => x.title))).not.toMatch(/coffret|lot|pack|kit|ensemble/i);
    for (const pr of products) { expect(pr.price, pr.handle).toBeNull(); expect(pr.variants).toHaveLength(1); }
  });

  it("chaque fiche : ses cinq vues, son texte et ses points ; jamais ceux d'un autre produit", () => {
    const texts = new Set<string>(), points = new Set<string>();
    for (const it of SOUPLE_PRODUCTS) {
      const pr = products.find((x) => x.handle === it.handle)!;
      expect(pr.images, it.key).toEqual(it.views.map((v) => `${ID}-${v}`));
      for (const other of SOUPLE_PRODUCTS.filter((o) => o.key !== it.key)) expect(JSON.stringify(pr.images), `${it.key} ← ${other.key}`).not.toContain(`${ID}-${other.key}-`);
      const mp = types(keyOf(it.handle)).find((s) => s.type === "main-product")!;
      texts.add(JSON.stringify(mp.blocks!.text.settings)); points.add(String(mp.blocks!.highlights.settings.items));
      expect(mp.blocks!.siblings.settings).toMatchObject({ collection: "all", heading: "Les quatre pièces" });
      expect(mp.settings).toMatchObject({ product_target: `product:${it.key}`, gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true });
      const html = pages.get(`/products/${it.handle}`)!;
      expect(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1]).toContain(it.title);
      // La scène de la fiche montre CE produit (le fichier d'ambiance dont le texte alternatif le nomme).
      const scene = types(keyOf(it.handle)).find((s) => s.type === "ed-scene")!;
      const alt = SOUPLE_MEDIA.find((m) => `${ID}-${m.file}` === scene.settings.image_asset)!.alt;
      expect(alt.toLowerCase(), it.key).toContain(it.key === "anneau" ? "anneau" : it.key);
      // Les trois autres pièces sont proposées, jamais la fiche elle-même.
      const recos = html.slice(html.indexOf("Pour accompagner la reprise"));
      for (const o of SOUPLE_PRODUCTS.filter((o) => o.key !== it.key)) expect(recos, `${it.key} → ${o.key}`).toContain(`/products/${o.handle}`);
      expect(html.match(/Vous aimerez aussi/g), it.key).toBeNull();
    }
    expect(texts.size).toBe(4);
    expect(points.size).toBe(4);
  });

  it("accueil : scène plein écran (H1, bouton vers la collection, image téléphone dédiée), puis la mosaïque où chaque pièce mène à SA fiche", () => {
    const home = pages.get("/")!;
    expect(home.match(/<h1[^>]*>[\s\S]*?<\/h1>/)![0]).toMatch(/Reprendre en douceur, à votre rythme, chez vous\./);
    const opening = types("index")[0];
    expect(opening.settings).toMatchObject({ layout: "fullscreen", heading_tag: "h1", button_label: "Choisir ma première pièce", button_link: "/collections/all", image_asset: `${ID}-ambiance-01.webp`, mobile_image_asset: `${ID}-ambiance-08.webp` });
    expect(home).toContain("ed-opening--fullscreen");
    const mosaic = types("index")[1];
    expect(mosaic.settings).toMatchObject({ layout: "asym", heading_tag: "h2", button_link: "/collections/all" });
    const tiles = (mosaic.block_order ?? []).map((b) => mosaic.blocks![b].settings);
    expect(tiles.map((t) => t.link)).toEqual(["/collections/all", ...SOUPLE_PRODUCTS.map((it) => `/products/${it.handle}`)]);
    // Chaque tuile de produit montre une vue de CE produit.
    tiles.slice(1).forEach((t, i) => expect(String(t.image_asset), SOUPLE_PRODUCTS[i].key).toMatch(new RegExp(`^${ID}-${SOUPLE_PRODUCTS[i].key}-0\\d\\.webp$`)));
    const list = types("index")[3];
    expect(Object.values(list.blocks ?? {}).map((b) => b.settings.product)).toEqual(SOUPLE_PRODUCTS.map((it) => it.handle));
    for (const it of SOUPLE_PRODUCTS) expect(home, it.key).toContain(`/products/${it.handle}`);
  });

  it("en-tête « Collections en cartes » et pied « Boutique éditoriale » de la famille, les quatre pièces en cartes illustrées", () => {
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
    expect(currentChromePreset("catalog", "header", header.settings)?.id).toBe(PLAN.header);
    expect(currentChromePreset("catalog", "footer", footer.settings)?.id).toBe(PLAN.footer);
    const cards = Object.values(header.blocks ?? {}).filter((b) => b.type === "link_extra");
    expect(cards.map((b) => b.settings.image_asset)).toEqual(SOUPLE_PRODUCTS.map((it) => `${ID}-${it.key}-01.webp`));
    expect(Object.values(header.blocks ?? {}).find((b) => b.type === "promo")?.settings).toMatchObject({ image_asset: `${ID}-ambiance-10.webp`, link: "/collections/all" });
    expect((footer.block_order ?? []).map((b) => footer.blocks?.[b]?.type)).not.toContain("newsletter");
    expect(Object.values(spec.groups.header.sections).map((sec) => sec.type)).toEqual(["header"]);
  });

  it("médias : les 31 fichiers utilisés ; jamais la même image dans deux sections qui se suivent", () => {
    expect(f.missing).toEqual([]);
    expect(SOUPLE_MEDIA).toHaveLength(31);
    const shown = all + JSON.stringify(products.map((x) => x.images));
    for (const m of SOUPLE_MEDIA) expect(shown, m.file).toContain(`${ID}-${m.file}`);
    for (const key of Object.keys(spec.templates)) {
      const imgs = types(key).filter((s) => !s.disabled).map((s) => new Set(JSON.stringify(s).match(new RegExp(`${ID}-[a-z]+-\\d\\d\\.webp`, "g")) ?? []));
      for (let i = 1; i < imgs.length; i++) for (const file of imgs[i]) expect(imgs[i - 1].has(file), `${key} : ${file} dans deux sections successives`).toBe(false);
    }
    // Les dix ambiances servent toutes, chacune avec les produits qu'elle montre (aucune personne, aucune autre marque).
    for (const m of SOUPLE_MEDIA.filter((x) => x.file.startsWith("ambiance"))) expect(m.alt, m.file).not.toMatch(/personne|femme|homme|main|silhouette/i);
  });

  it("SEO : un H1, titre et description uniques par page, fil d'Ariane, alt partout, aperçu non indexable", () => {
    const titles = new Set<string>(), descriptions = new Set<string>();
    for (const [route, html] of pages) {
      expect(html.match(/<h1[\s>]/g)?.length, `${route} : H1`).toBe(1);
      const title = html.match(/<title>([\s\S]*?)<\/title>/)![1].trim();
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
      expect(title.length, route).toBeLessThanOrEqual(90);
      expect(description.length, route).toBeGreaterThan(60);
      expect(description.length, route).toBeLessThanOrEqual(160);
      titles.add(title); descriptions.add(description);
      expect(html).toContain('<link rel="canonical"');
      expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
      for (const img of html.match(/<img [^>]*>/g) ?? []) expect(img, route).toMatch(/\balt="/);
      if (route !== "/" && route !== "/collections/all") expect(html, route).toContain('"@type": "BreadcrumbList"');
    }
    expect(titles.size).toBe(pages.size);
    expect(descriptions.size).toBe(pages.size);
  });

  it("rien d'inventé ; aucun manque public ; champs inconnus conservés masqués dans l'éditeur", () => {
    for (const r of productRoutes) {
      const ld = [...pages.get(r)!.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
      expect(ld.find((x) => x["@type"] === "Product")?.offers, r).toBeUndefined();
      expect(JSON.stringify(ld)).not.toMatch(/AggregateRating|Review|ratingValue/);
    }
    expect(JSON.stringify(spec.templates)).not.toMatch(/"structured_data":true/);
    for (const [route, html] of pages) {
      const text = visibleText(html);
      expect(text, route).not.toMatch(/à compléter|à confirmer|à préciser|\[\s*À|lorem ipsum/i);
      expect(text, route).not.toMatch(/\d+\s?(mm|cm|m|kg|g)\b|garantie \d|livraison (offerte|gratuite|en \d)|\d+\s?€|\d+([,.]\d)?\s?\/\s?5|★|avis clients?|plus que \d|stock limité|antidérapant|adhéren|écologique|naturel|biodégradable|recycl|PVC|TPE|caoutchouc|coton|bienfait|soulag|douleur|thérap|santé|mal de dos|certifi|écolabel|en liège|100 ?%/i);
    }
    for (const id of [1000, 2000, 3000, 4000]) expect(() => reconcileOfferCart(spec, [{ variantId: id, quantity: 1 }]), String(id)).toThrow(/^Prix à définir/);
    const hidden = Object.values(spec.templates).flatMap((t) => Object.values(t.sections)).flatMap((s) => [...(s.disabled ? [s] : []), ...Object.values(s.blocks ?? {}).filter((b) => b.disabled)]);
    expect(JSON.stringify(spec.templates).match(/À compléter/g)!.length).toBe(JSON.stringify(hidden).match(/À compléter/g)!.length);
    for (const field of ["Dimensions", "Matières et entretien", "Livraison, retours et garantie", "Le tapis est-il antidérapant ?"]) expect(JSON.stringify(hidden), field).toContain(field);
    expect(visibleText(pages.get("/")!)).not.toContain("Boutique de démonstration");
    expect(visibleText(pages.get("/")!)).toMatch(/(©|&copy;)\s*\d{4}\s*SOUPLE/);
  });

  it("sans prix : achat indisponible sur les quatre fiches (bouton et barre mobile) ; avec des prix de test : quatre articles, quantités, suppression, total exact", async () => {
    const addButtons = (html: string) => [...html.matchAll(/<button[^>]*data-add-button[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);
    const stickyButton = (html: string) => html.match(/<button[^>]*data-sticky-add[^>]*>[^<]*<\/button>/)?.[0] ?? "";
    for (const r of productRoutes) {
      const html = pages.get(r)!;
      for (const b of addButtons(html)) { expect(b, r).toMatch(/\sdisabled[\s>]/); expect(visibleText(b).replace(/\s+/g, " ").trim(), r).toBe("Achat indisponible"); }
      expect(stickyButton(html), r).toMatch(/disabled>Achat indisponible<\/button>$/);
    }
    // Prix de test dans une copie isolée, jamais publiés comme prix de la marque.
    const priced = structuredClone(spec);
    const PRICES = [5900, 2400, 1500, 3200];
    storeProducts(priced).forEach((pr, i) => { pr.price = PRICES[i]; for (const v of pr.variants) v.price = PRICES[i]; });
    const pfiles = compileTheme(priced);
    for (const r of productRoutes) {
      const html = (await fr(() => renderPage({ spec: priced, base: "", files: pfiles, cart: [] }, r, new URLSearchParams()))).html;
      for (const b of addButtons(html)) expect(b, r).not.toMatch(/\sdisabled[\s>]/);
      expect(stickyButton(html), r).toMatch(/>Ajouter au panier<\/button>$/);
    }
    const lines = reconcileOfferCart(priced, [{ variantId: 1000, quantity: 2 }, { variantId: 2000, quantity: 1 }, { variantId: 3000, quantity: 3 }, { variantId: 4000, quantity: 1 }]);
    expect(lines.map((l) => [l.variantId, l.quantity])).toEqual([[1000, 2], [2000, 1], [3000, 3], [4000, 1]]);
    const cartPage = async (cart: typeof lines) => visibleText((await fr(() => renderPage({ spec: priced, base: "", files: pfiles, cart }, "/cart", new URLSearchParams()))).html).replace(/\s+/g, " ");
    const full = await cartPage(lines);
    for (const it of SOUPLE_PRODUCTS) expect(full, it.key).toContain(it.title);
    // 2 × 59 + 24 + 3 × 15 + 32 = 219 €.
    expect(full).toContain("219,00 €");
    // Suppression de l'anneau : trois articles, 187 €, plus aucune trace de l'anneau.
    const without = await cartPage(reconcileOfferCart(priced, lines.filter((l) => l.variantId !== 4000)));
    expect(without).toContain("187,00 €");
    expect(without).not.toContain(SOUPLE_PRODUCTS[3].title);
    // Quantité ramenée à un tapis : 128 €.
    const one = await cartPage(reconcileOfferCart(priced, [{ variantId: 1000, quantity: 1 }, { variantId: 2000, quantity: 1 }, { variantId: 3000, quantity: 3 }]));
    expect(one).toContain("128,00 €");
  });

  it("liens internes : chaque lien de page mène à une page existante de la démonstration", () => {
    const known = new Set(["/", "/search", "/cart", "/collections/all", ...routes]);
    for (const [route, html] of pages) for (const m of html.matchAll(/href="(\/(?:pages|products|collections)\/[^"#?]*)"/g)) expect(known.has(m[1]), `${route} → ${m[1]}`).toBe(true);
  });

  it("exports : profil « poudre », les quatre produits et les médias", async () => {
    const d = await fr(() => designLayer(spec));
    expect(d.body.classes).toEqual(expect.arrayContaining([`es-editorial-${PLAN.profile}`, `dir-${ID}`]));
    const media = SOUPLE_MEDIA.map((m) => `${ID}-${m.file}`);
    const shop = unzipSync(new Uint8Array((await fr(() => cmsExport("shopify", spec, libraryLoader, { projectId: f.pid }))).zip));
    const names = Object.keys(shop).join("\n");
    for (const m of media) expect(names, m).toContain(m);
    expect(zipText(shop, /\.json$/)).toMatch(/"editorial_profile":\s*"poudre"/);
    expect(zipText(shop, /editorial\.css$/)).toContain('body[data-editorial="poudre"]');
    for (const it of SOUPLE_PRODUCTS) expect(zipText(shop, /\.(csv|json)$/), it.handle).toContain(it.handle);
    for (const platform of ["woocommerce", "prestashop"] as const) {
      const exp = await fr(() => cmsExport(platform, spec, libraryLoader, { projectId: f.pid }));
      expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
      const z = unzipSync(new Uint8Array(exp.zip));
      expect(zipText(z, /\.css$/)).toContain(`body.es-editorial-${PLAN.profile}`);
      const text = Object.keys(z).join("\n") + zipText(z, /\.(json|php|tpl|html|txt|csv|xml)$/);
      for (const it of SOUPLE_PRODUCTS) expect(text, `${platform} ${it.handle}`).toContain(it.title);
      expect(text).not.toMatch(/\/home\/user|\/tmp\/ecs-/);
    }
  });
});

describe("SOUPLE appliqué à un autre projet : identité du projet, jamais celle de la démonstration", async () => {
  const user = await createUser("souple-autre@example.invalid", "isolated-test-only", "Autre");
  it("un seul produit : aucune trace de la démo, sans photo, ouverture de repli (panorama) avec le titre de la page vers SA fiche, dispositions du thème", async () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: ID });
    const built = await fr(() => composeShop(pid, ID, null, false));
    const spec = built.spec;
    expect(spec.direction).toBe(ID);
    expect(spec.settings.editorial_profile).toBe(PLAN.profile);
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
    expect(currentChromePreset("catalog", "header", header.settings)?.id).toBe(PLAN.header);
    expect(currentChromePreset("catalog", "footer", footer.settings)?.id).toBe(PLAN.footer);
    const files = compileTheme(spec);
    for (const route of ["/", `/products/${spec.store.product.handle}`]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      expect(visibleText(html), route).not.toMatch(PLAN.leak);
      expect(html, route).not.toMatch(/theme-assets\/souple|souple-(tapis|brique|sangle|anneau|ambiance|logo)/);
      expect(html).toContain("Atelier Verre");
      expect(html.match(/<h1[\s>]/g)?.length, route).toBe(1);
      // La signature du client n'est dite qu'une fois dans la page (jamais reprise par une autre section ; le pied du site la garde).
      const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
      expect(visibleText(main).split("Des verres soufflés pour tous les jours.").length - 1, route).toBeLessThanOrEqual(1);
    }
    const first = spec.templates.index.sections[spec.templates.index.order[0]];
    expect(first.disabled ?? false).toBe(false);
    expect(first.type).toBe("ed-scene");
    expect(first.settings).toMatchObject({ layout: "panorama", heading_tag: "h1", button_link: `/products/${spec.store.product.handle}` });
    expect(String(first.settings.button_label)).not.toMatch(/collection/i);
    expect(JSON.stringify(spec.settings.color_schemes).toUpperCase()).not.toMatch(/#5A1B36|#B4637A/);
  });

  it("projets photographiés (un ou plusieurs produits) : aucun titre ni texte répété d'une section à l'autre de l'accueil", () => {
    for (const type of ["mono", "multi"] as const) {
      const spec = fr(() => sampleSpec(ID, type, { rich: true }));
      const shown = spec.templates.index.order.map((k) => spec.templates.index.sections[k]).filter((x) => !x.disabled);
      const said = shown.flatMap((x) => ["heading", "text"].map((key) => String(x.settings[key] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase()).filter(Boolean));
      expect(said.filter((v, i) => said.indexOf(v) !== i), type).toEqual([]);
    }
  });

  it("un seul produit photographié : scène plein écran du projet, bouton vers SA fiche, sans mosaïque ni liste", () => {
    const spec = fr(() => sampleSpec(ID, "mono", { rich: true }));
    const home = spec.templates.index.order.map((k) => spec.templates.index.sections[k]);
    expect(home[0].type).toBe("ed-opening");
    expect(home[0].disabled ?? false).toBe(false);
    expect(home[0].settings).toMatchObject({ layout: "fullscreen", heading_tag: "h1", button_link: `/products/${spec.store.product.handle}` });
    for (const type of ["fs-collections", "fs-products"]) expect(home.filter((x) => x.type === type && !x.disabled), type).toEqual([]);
    expect(JSON.stringify(spec.templates.index)).not.toMatch(/souple-(tapis|brique|sangle|anneau|ambiance)/);
  });

  it("plusieurs produits photographiés : scène plein écran du projet, puis la mosaïque de ses produits, chacun relié à sa fiche", () => {
    const spec = fr(() => sampleSpec(ID, "multi", { rich: true }));
    const home = spec.templates.index.order.map((k) => spec.templates.index.sections[k]);
    const opening = home[0];
    const first = home.find((x) => x.type === "fs-collections")!;
    expect(opening.type).toBe("ed-opening");
    expect(opening.settings).toMatchObject({ layout: "fullscreen", heading_tag: "h1", button_link: "/collections/all" });
    expect(first.type).toBe("fs-collections");
    expect(first.disabled ?? false).toBe(false);
    expect(first.settings).toMatchObject({ layout: "asym", heading_tag: "h2" });
    const tiles = (first.block_order ?? []).map((b) => first.blocks![b].settings);
    const handles = storeProducts(spec).filter((x) => x.images?.length).map((x) => `/products/${x.handle}`);
    expect(tiles[0].link).toBe("/collections/all");
    expect(tiles.slice(1).map((t) => t.link)).toEqual(handles.slice(0, 4));
    for (const t of tiles) expect(String(t.image_asset), String(t.link)).toBeTruthy();
    expect(JSON.stringify(spec.templates.index)).not.toMatch(/souple-(tapis|brique|sangle|anneau|ambiance)/);
  });
});
