/**
 * MUSEAU CLUB (issue #158) : thème **de la famille E-commerce** (celle d'ORBE, HEUREN et ALCÔVE) pour une boutique de
 * quatre produits — harnais, laisse, collier et pochette à sacs pour chiens. Garde-fous :
 *  - thème actif du catalogue, famille E-commerce partout (catalogue, recommandation, bibliothèque), jamais « boutique
 *    spécialisée » ; profil éditorial propre (« club ») ;
 *  - composition distincte d'ORBE, HEUREN et ALCÔVE (ouverture, polices, en-tête, pied de page) ;
 *  - démonstration composée par le vrai moteur puis rédigée dans le même ordre ; EXACTEMENT quatre produits distincts,
 *    chacun avec sa fiche (ses cinq vues, son texte, ses points), reliés par la collection et les recommandations ; les
 *    31 médias utilisés ; aucune même image dans deux sections qui se suivent ;
 *  - rien d'inventé (prix, tailles, matières, résistance, sécurité, avis…), aucun « à compléter » public, champs inconnus
 *    conservés masqués ; SEO par page ; achat explicitement indisponible sans prix, normal avec des prix de test ;
 *  - un autre projet installé dans ce thème garde sa propre identité ; exports Shopify / WooCommerce / PrestaShop.
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
import { MUSEAU_MEDIA, MUSEAU_PRODUCTS } from "./museau-souple-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ");
const LIBRARY = new Set(FAMILY_LIBRARY.catalog.flatMap((e) => e.dispositions.map((d) => d.type)));
const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");
const ID = "museau-club";
const PLAN = {
  profile: "club", fonts: { heading: "archivo_n8", body: "karla_n4" },
  home: ["fs-lookbook", "fs-products", "ed-scene", "image-with-text", "featured-purchase", "cta-banner", "faq", "newsletter-media"],
  product: ["main-product", "ed-scene", "faq", "product-recommendations"],
  pages: ["la-balade", "aide"], header: "mega-cards", footer: "columns",
  leak: /MUSEAU|cobalt|harnais|laisse|pochette|La balade/i,
};

describe("MUSEAU CLUB : thème actif de la famille E-commerce (quatre produits), jamais « boutique spécialisée »", () => {
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

  it("profil « club » et titre de lookbook en H1 : règles propres, profils existants intacts", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "editorial.css"), "utf8");
    for (const p of ["club", "cadran", "arrondi", "object", "journal"]) expect(css, p).toContain(`body[data-editorial="${p}"]`);
    const schema = fs.readFileSync(path.join(process.cwd(), "theme-base", "config", "settings_schema.json"), "utf8");
    for (const v of ["club", ID]) expect(schema).toContain(`"value": "${v}"`);
    const lookbook = fs.readFileSync(path.join(process.cwd(), "theme-base", "sections", "fs-lookbook.liquid"), "utf8");
    expect(lookbook).toContain('"id": "heading_tag"');
    expect(lookbook).toContain("tag: s.heading_tag");
  });

  it("composition distincte d'ORBE, HEUREN et ALCÔVE (polices, en-têtes, pieds, ouverture)", () => {
    const themes = ["orbe", "heuren", "alcove", ID].map((i) => catalogTheme(i)!);
    expect(new Set(themes.map((t) => t.fonts.heading)).size).toBe(4);
    expect(new Set(themes.map((t) => t.look.footer)).size).toBe(4);
    expect(new Set(themes.map((t) => String(t.headerSettings?.layout ?? t.look.headerLayout) + "/" + String(t.headerSettings?.mega_menu ?? "none"))).size).toBe(4);
  });
});

describe("MUSEAU CLUB : démonstration de quatre produits", async () => {
  const user = await createUser("museau-demo@example.invalid", "isolated-test-only", "Museau");
  const f = await fr(() => demoProject(user.id, ID));
  const { spec } = f;
  const files = compileTheme(spec);
  const products = storeProducts(spec);
  const keyOf = (handle: string) => { const pr = products.find((x) => x.handle === handle)!; return pr.template_suffix ? `product.${pr.template_suffix}` : "product"; };
  const types = (key: string) => spec.templates[key].order.map((sid) => spec.templates[key].sections[sid]);
  const productRoutes = MUSEAU_PRODUCTS.map((it) => `/products/${it.handle}`);
  const routes = ["/", "/collections/all", ...productRoutes, ...spec.store.pages.map((p) => `/pages/${p.handle}`)];
  const pages = new Map<string, string>();
  for (const route of routes) pages.set(route, (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html);
  const all = [...pages.values()].join("\n");

  it("composée dans son thème E-commerce, sections de la bibliothèque E-commerce, ordre de la composition", () => {
    expect(spec.direction).toBe(ID);
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index").map((s) => s.type)).toEqual(PLAN.home);
    for (const it of MUSEAU_PRODUCTS) expect(types(keyOf(it.handle)).map((s) => s.type), it.key).toEqual(PLAN.product);
    for (const key of ["index", ...MUSEAU_PRODUCTS.map((it) => keyOf(it.handle))]) for (const s of types(key)) {
      expect(!!s.disabled, `${key} ${s.type}`).toBe(false);
      if (!["main-product", "product-recommendations"].includes(s.type)) expect(LIBRARY.has(s.type), s.type).toBe(true);
    }
    expect(spec.store.pages.map((p) => p.handle)).toEqual(PLAN.pages);
    expect(spec.settings.editorial_profile).toBe(PLAN.profile);
    expect(loadProject(f.pid).settings.storeKind).toBe("catalog");
    expect(loadProject(f.pid).storeType).toBe("multi");
  });

  it("exactement quatre produits distincts, chacun sur sa fiche, dans une seule vraie collection", () => {
    expect(products.map((x) => x.handle)).toEqual(MUSEAU_PRODUCTS.map((it) => it.handle));
    expect(new Set(products.map((x) => x.title)).size).toBe(4);
    expect(new Set(products.map((x) => keyOf(x.handle))).size).toBe(4);
    expect(spec.store.collections).toHaveLength(1);
    expect(spec.store.collections![0].products).toEqual(MUSEAU_PRODUCTS.map((it) => it.handle));
    // Aucun cinquième produit : ni le coffret de l'ambiance 10, ni une vue.
    expect(JSON.stringify(products.map((x) => x.title))).not.toMatch(/coffret|bo[iî]te|lot|pack/i);
    for (const pr of products) { expect(pr.price, pr.handle).toBeNull(); expect(pr.variants).toHaveLength(1); }
  });

  it("chaque fiche : ses cinq vues, son texte et ses points ; jamais ceux d'un autre produit", () => {
    const texts = new Set<string>(), points = new Set<string>();
    for (const it of MUSEAU_PRODUCTS) {
      const pr = products.find((x) => x.handle === it.handle)!;
      expect(pr.images, it.key).toEqual(it.views.map((v) => `${ID}-${v}`));
      for (const other of MUSEAU_PRODUCTS.filter((o) => o.key !== it.key)) expect(JSON.stringify(pr.images), `${it.key} ← ${other.key}`).not.toContain(`${ID}-${other.key}-`);
      const mp = types(keyOf(it.handle)).find((s) => s.type === "main-product")!;
      texts.add(JSON.stringify(mp.blocks!.text.settings)); points.add(String(mp.blocks!.highlights.settings.items));
      expect(mp.blocks!.siblings.settings).toMatchObject({ collection: "all", heading: "La collection assortie" });
      expect(mp.settings.product_target).toBe(`product:${it.key}`);
      const html = pages.get(`/products/${it.handle}`)!;
      expect(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1]).toContain(it.title);
      // Les trois autres pièces sont proposées, jamais la fiche elle-même.
      const recos = html.slice(html.indexOf("Les autres pièces assorties"));
      for (const o of MUSEAU_PRODUCTS.filter((o) => o.key !== it.key)) expect(recos, `${it.key} → ${o.key}`).toContain(`/products/${o.handle}`);
    }
    expect(texts.size).toBe(4);
    expect(points.size).toBe(4);
  });

  it("accueil : la marque, sa catégorie et les quatre références dès l'ouverture ; repères vers le bon produit", () => {
    const home = pages.get("/")!;
    expect(home.match(/<h1[^>]*>[\s\S]*?<\/h1>/)![0]).toMatch(/matériel de balade/);
    const opening = types("index")[0];
    expect(opening.settings).toMatchObject({ layout: "side", heading_tag: "h1" });
    expect(Object.values(opening.blocks ?? {}).map((b) => b.settings.product).sort()).toEqual(MUSEAU_PRODUCTS.map((it) => it.handle).sort());
    const grid = types("index")[1];
    expect(grid.settings).toMatchObject({ source: "collection", collection: "all", limit: 4 });
    for (const it of MUSEAU_PRODUCTS) expect(home, it.key).toContain(`/products/${it.handle}`);
  });

  it("en-tête « Collections en cartes » et pied « Plan du catalogue en colonnes », sans second formulaire d'inscription", () => {
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
    expect(currentChromePreset("catalog", "header", header.settings)?.id).toBe(PLAN.header);
    expect(currentChromePreset("catalog", "footer", footer.settings)?.id).toBe(PLAN.footer);
    expect((footer.block_order ?? []).map((b) => footer.blocks?.[b]?.type)).not.toContain("newsletter");
    expect(Object.values(spec.groups.header.sections).map((sec) => sec.type)).toEqual(["header"]);
  });

  it("médias : les 31 fichiers utilisés ; jamais la même image dans deux sections qui se suivent", () => {
    expect(f.missing).toEqual([]);
    expect(MUSEAU_MEDIA).toHaveLength(31);
    const shown = all + JSON.stringify(products.map((x) => x.images));
    for (const m of MUSEAU_MEDIA) expect(shown, m.file).toContain(`${ID}-${m.file}`);
    for (const key of Object.keys(spec.templates)) {
      const imgs = types(key).filter((s) => !s.disabled).map((s) => new Set(JSON.stringify(s).match(new RegExp(`${ID}-[a-z]+-\\d\\d\\.webp`, "g")) ?? []));
      for (let i = 1; i < imgs.length; i++) for (const file of imgs[i]) expect(imgs[i - 1].has(file), `${key} : ${file} dans deux sections successives`).toBe(false);
    }
  });

  it("SEO : un H1, titre et description uniques par page, fil d'Ariane, alt partout, aperçu non indexable", () => {
    const titles = new Set<string>(), descriptions = new Set<string>();
    for (const [route, html] of pages) {
      expect(html.match(/<h1[\s>]/g)?.length, `${route} : H1`).toBe(1);
      const title = html.match(/<title>([\s\S]*?)<\/title>/)![1].trim();
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
      expect(title.length, route).toBeLessThanOrEqual(80);
      expect(description.length, route).toBeGreaterThan(60);
      expect(description.length, route).toBeLessThanOrEqual(160);
      titles.add(title); descriptions.add(description);
      expect(html).toContain('<link rel="canonical"');
      expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
      for (const img of html.match(/<img [^>]*>/g) ?? []) expect(img, route).toMatch(/\balt="/);
      // Fil d'Ariane structuré sur les fiches et les pages ; la page « collection » du thème n'en a pas (limite connue, tous thèmes).
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
      expect(text, route).not.toMatch(/\d+\s?(mm|cm|m|kg|g)\b|garantie \d|livraison (offerte|gratuite|en \d)|\d+\s?€|\d+([,.]\d)?\s?\/\s?5|★|avis clients?|plus que \d|stock limité|nylon|polyester|néoprène|réfléchissant|résistant|solide|sécuris|anti-?traction|imperméable|lavable|biodégradable|compostable|recyclé|vétérinaire|taille [SML]\b/i);
    }
    for (const id of [1000, 2000, 3000, 4000]) expect(() => reconcileOfferCart(spec, [{ variantId: id, quantity: 1 }]), String(id)).toThrow(/^Prix à définir/);
    const hidden = Object.values(spec.templates).flatMap((t) => Object.values(t.sections)).flatMap((s) => [...(s.disabled ? [s] : []), ...Object.values(s.blocks ?? {}).filter((b) => b.disabled)]);
    expect(JSON.stringify(spec.templates).match(/À compléter/g)!.length).toBe(JSON.stringify(hidden).match(/À compléter/g)!.length);
    for (const field of ["Tailles et mesures", "Matières et entretien", "Livraison, retours et garantie", "Quelles tailles sont proposées ?"]) expect(JSON.stringify(hidden), field).toContain(field);
    expect(visibleText(pages.get("/")!)).not.toContain("Boutique de démonstration");
    expect(visibleText(pages.get("/")!)).toMatch(/(©|&copy;)\s*\d{4}\s*MUSEAU CLUB/);
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
    const PRICES = [3900, 2900, 1900, 1500];
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
    for (const it of MUSEAU_PRODUCTS) expect(full, it.key).toContain(it.title);
    // 2 × 39 + 29 + 3 × 19 + 15 = 179 €.
    expect(full).toContain("179,00 €");
    // Suppression de la pochette : trois articles, 164 €, plus aucune trace de la pochette.
    const without = await cartPage(reconcileOfferCart(priced, lines.filter((l) => l.variantId !== 4000)));
    expect(without).toContain("164,00 €");
    expect(without).not.toContain(MUSEAU_PRODUCTS[3].title);
    // Quantité ramenée à un harnais : 125 €.
    const one = await cartPage(reconcileOfferCart(priced, [{ variantId: 1000, quantity: 1 }, { variantId: 2000, quantity: 1 }, { variantId: 3000, quantity: 3 }]));
    expect(one).toContain("125,00 €");
  });

  it("liens internes : chaque lien de page mène à une page existante de la démonstration", () => {
    const known = new Set(["/", "/search", "/cart", "/collections/all", ...routes]);
    for (const [route, html] of pages) for (const m of html.matchAll(/href="(\/(?:pages|products|collections)\/[^"#?]*)"/g)) expect(known.has(m[1]), `${route} → ${m[1]}`).toBe(true);
  });
});

describe("MUSEAU CLUB appliqué à un autre projet : identité du projet, jamais celle de la démonstration", async () => {
  const user = await createUser("museau-autre@example.invalid", "isolated-test-only", "Autre");
  it("aucune trace de la démo, couleurs et nom du projet, dispositions du thème", async () => {
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
      expect(html, route).not.toMatch(/theme-assets\/museau-club|museau-club-(harnais|laisse|collier|pochette|ambiance|logo)/);
      expect(html).toContain("Atelier Verre");
    }
    expect(JSON.stringify(spec.settings.color_schemes).toUpperCase()).not.toMatch(/#1636C9|#F2C14E/);
  });
});

describe("MUSEAU CLUB : exports", async () => {
  const user = await createUser("museau-exports@example.invalid", "isolated-test-only", "Exports");
  const demo = await fr(() => demoProject(user.id, ID));
  const media = MUSEAU_MEDIA.map((m) => `${ID}-${m.file}`);

  it("couche de design : classes du profil sur le <body>, scripts des interactions", async () => {
    const d = await fr(() => designLayer(demo.spec));
    expect(d.body.classes).toEqual(expect.arrayContaining([`es-editorial-${PLAN.profile}`, `dir-${ID}`]));
    expect(d.scripts).toContain("family.js");
  });

  it("Shopify : tous les médias, les quatre produits, sections, profil et SEO", async () => {
    const exp = await fr(() => cmsExport("shopify", demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, f).toContain(f);
    const json = zipText(z, /\.json$/), csv = zipText(z, /\.csv$/);
    expect(json).toMatch(new RegExp(`"editorial_profile":\\s*"${PLAN.profile}"`));
    for (const it of MUSEAU_PRODUCTS) expect(csv + json, it.handle).toContain(it.handle);
    for (const t of PLAN.home.concat(PLAN.product).filter((x) => !["main-product", "product-recommendations"].includes(x))) expect(names + json, t).toContain(t);
    expect(zipText(z, /editorial\.css$/)).toContain(`body[data-editorial="${PLAN.profile}"]`);
    expect(names + json + zipText(z, /\.(csv|liquid)$/)).not.toMatch(/\/home\/|\/tmp\/|localhost|127\.0\.0\.1/);
  });

  for (const platform of ["woocommerce", "prestashop"] as const) it(`${platform} : médias, feuilles réécrites, scripts et classes du profil`, async () => {
    const exp = await fr(() => cmsExport(platform, demo.spec, libraryLoader, { projectId: demo.pid }));
    expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, `${platform} ${f}`).toContain(f);
    const css = zipText(z, /\.css$/);
    expect(css).toContain(`body.es-editorial-${PLAN.profile}`);
    expect(css).not.toContain(`body[data-editorial="${PLAN.profile}"]`);
    const all = names + zipText(z, /\.(json|php|tpl|html|txt|csv|xml)$/);
    expect(all).toContain(`es-editorial-${PLAN.profile}`);
    for (const it of MUSEAU_PRODUCTS) expect(all, `${platform} ${it.handle}`).toContain(it.title);
    expect(all).not.toMatch(/\/home\/user|\/tmp\/ecs-/);
  });
});
