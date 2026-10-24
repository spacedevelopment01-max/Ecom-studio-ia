/**
 * SOUPLE (PR #180, six maquettes du 23 octobre, docs/theme-briefs/souple) : thème de la famille **E-commerce**, profil
 * « souple », quatre produits (tapis, brique, sangle, anneau Pilates). Garde-fous :
 *  - thème actif, famille E-commerce partout (jamais Services ni Boutique spécialisée), profil « souple », polices
 *    Playfair Display / Jost, dispositions des maquettes dans la galerie E-commerce ;
 *  - accueil dans l'ordre de la planche 01 ; fiches du tapis et de la brique (planche 02) et de la sangle et de l'anneau
 *    (planche 03) chacune avec sa composition et sa propre galerie ;
 *  - prix de démonstration centralisés (59 / 19 / 15 / 29 €) : tapis + brique = 78 € en sous-total, livraison
 *    « calculée à l'étape suivante », jamais un total final ; ajout au panier réel depuis les cartes ;
 *  - commande d'exemple en quatre étapes, sans aucun champ de carte, inscription aux actualités décochée ;
 *  - rien d'inventé : ni avis, ni remise, ni livraison gratuite, ni délai, ni garantie, ni personne ; pages légales
 *    « à compléter » ; compte fictif annoncé comme tel ;
 *  - 57 des 59 visuels du dossier utilisés (deux non reçus, remplacés par la variante prévue) ; SEO par page ;
 *  - un autre projet installé dans ce thème garde sa propre identité ; exports Shopify / WooCommerce / PrestaShop.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { renderPage, variantId } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { validateSpec } from "@/lib/theme/ops";
import { catalogTheme } from "@/lib/theme/theme-catalog";
import { ACTIVE_THEMES, themeKinds, themePreviewPath } from "@/lib/theme/theme-fit";
import { THEME_FAMILY, FAMILY_LIBRARY, isStructuralType } from "@/lib/theme/section-families";
import { sectionIncompatibility } from "@/lib/theme/section-compat";
import { themeAllowed } from "@/lib/theme/theme-access";
import { storeProducts } from "@/lib/theme/store-products";
import { composeShop } from "@/lib/engine/shop";
import { saveBrand, loadProject } from "@/lib/projects";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { designLayer } from "@/lib/cms-v2/design";
import { REFERENCE_THEMES } from "@/lib/project-handoff/categories";
import { demoProject } from "./demo-fixtures";
import { SOUPLE_MEDIA, SOUPLE_MISSING, SOUPLE_PRODUCTS, SOUPLE_PAGES, SOUPLE_PRICES, SOUPLE_ARTICLES } from "./souple-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<template[\s\S]*?<\/template>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/\s+/g, " ");
const LIBRARY = new Set(FAMILY_LIBRARY.catalog.flatMap((e) => e.dispositions.map((d) => d.type)));
const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");
const ID = "souple";
const HOME = ["cv-banner", "fs-products", "cv-banner", "cv-feature", "cv-banner", "cv-cards", "cv-banner", "fs-journal", "faq", "newsletter"];

describe("SOUPLE : thème actif de la famille E-commerce (quatre produits)", () => {
  it("catalogue, famille E-commerce partout, profil « souple », polices, accès, aperçu suivi", () => {
    expect(ACTIVE_THEMES).toContain(ID);
    expect(themeKinds(ID)).toEqual(["catalog"]);
    expect(THEME_FAMILY[ID]).toBe("catalog");
    expect(REFERENCE_THEMES.find((t) => t.referenceId === ID)?.categories).toEqual(["ecommerce"]);
    expect(themeAllowed("dominer", ID)).toBe(true);
    const t = catalogTheme(ID)!;
    expect(t.kinds).toEqual(["catalog"]);
    expect(t.settings).toMatchObject({ conversion_profile: "souple", editorial_profile: "none" });
    expect(t.fonts).toEqual({ heading: "playfair_display_n4", body: "jost_n4" });
    expect(fs.existsSync(path.join(process.cwd(), "public", themePreviewPath(ID)))).toBe(true);
  });

  it("dispositions des maquettes dans la galerie E-commerce, réservées aux thèmes qui savent les rendre", () => {
    const disp = (key: string) => FAMILY_LIBRARY.catalog.find((e) => e.key === `catalog.${key}`)!.dispositions.map((d) => d.id);
    expect(disp("hero")).toEqual(expect.arrayContaining(["scene", "soft-panel", "soft-panel-right", "brand-band", "buy-bar"]));
    expect(disp("products")).toContain("infos");
    expect(disp("featured")).toEqual(expect.arrayContaining(["close-up", "details-box", "essentials", "visual-right"]));
    expect(disp("uses")).toEqual(expect.arrayContaining(["worlds", "pills", "photo-cards", "rows"]));
    // Un type n'appartient qu'à une fonction de la famille.
    for (const type of ["cv-banner", "cv-feature", "cv-cards", "cv-infos"]) expect(FAMILY_LIBRARY.catalog.filter((e) => e.dispositions.some((d) => d.type === type)).length, type).toBe(1);
    for (const t of ["demo-order", "demo-account"]) { expect(LIBRARY.has(t), t).toBe(false); expect(isStructuralType(t), t).toBe(true); }
    // ORBE (même famille, profil éditorial) ne se voit jamais proposer les sections de SOUPLE.
    const orbe = { direction: "orbe", settings: catalogTheme("orbe")!.settings ?? {} };
    for (const type of ["cv-banner", "cv-infos"]) expect(sectionIncompatibility(orbe, type, "catalog"), type).not.toBe("");
    const souple = { direction: ID, settings: catalogTheme(ID)!.settings ?? {} };
    for (const type of ["cv-banner", "cv-feature", "cv-cards", "cv-infos", "fs-products", "fs-journal", "faq"]) expect(sectionIncompatibility(souple, type, "catalog"), type).toBe("");
  });

  it("profil « souple » limité au thème : feuille chargée seulement avec ce profil, règles toutes préfixées", () => {
    const layout = fs.readFileSync(path.join(process.cwd(), "theme-base", "layout", "theme.liquid"), "utf8");
    expect(layout).toMatch(/settings\.conversion_profile == 'souple' -%\}\{\{ 'souple\.css'/);
    const css = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "souple.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const selectors = css.replace(/@media[^{]*\{/g, "").split("}").map((r) => r.split("{")[0].trim()).filter(Boolean);
    for (const sel of selectors) for (const part of sel.split(/,(?![^(]*\))/)) expect(part.trim(), part).toMatch(/^body\[data-conversion="souple"\]/);
    // Aucun texte écrit dans la feuille de style (il resterait affiché chez un client et ne serait pas traduit).
    expect(css).not.toMatch(/content:\s*"[^"]*[A-Za-zÀ-ÿ]/);
    const schema = JSON.parse(fs.readFileSync(path.join(process.cwd(), "theme-base", "config", "settings_schema.json"), "utf8")) as { settings?: { id?: string; options?: { value: string }[] }[] }[];
    expect(schema.flatMap((g) => g.settings ?? []).find((s) => s.id === "conversion_profile")!.options!.map((o) => o.value)).toContain("souple");
  });
});

describe("SOUPLE : démonstration (planches 01 à 06)", async () => {
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
  const page404 = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, "/page-qui-n-existe-pas", new URLSearchParams()))).html;
  const cartEmpty = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, "/cart", new URLSearchParams()))).html;

  it("accueil dans l'ordre de la planche 01, fiches propres à chaque paire, sections de la bibliothèque ou de structure", () => {
    expect(spec.direction).toBe(ID);
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index").map((s) => s.type)).toEqual(HOME);
    expect(types("index")[0].settings).toMatchObject({ layout: "scene", band_height: "hero", heading_tag: "h1" });
    const fiche = (key: string) => types(keyOf(SOUPLE_PRODUCTS.find((x) => x.key === key)!.handle)).map((s) => `${s.type}:${s.settings.layout ?? ""}`);
    for (const key of ["tapis", "brique"]) expect(fiche(key), key).toEqual(["main-product:", "cv-banner:panel-left", "cv-feature:details-points", "cv-cards:pills", "cv-infos:", "cv-banner:buybar"]);
    for (const key of ["sangle", "anneau"]) expect(fiche(key), key).toEqual(["main-product:", "cv-banner:panel-left", "cv-cards:overlay", "fs-products:list"]);
    for (const key of Object.keys(spec.templates)) for (const s of types(key)) {
      expect(!!s.disabled, `${key} ${s.type}`).toBe(false);
      expect(LIBRARY.has(s.type) || isStructuralType(s.type), `${key} ${s.type}`).toBe(true);
    }
    expect(spec.settings.conversion_profile).toBe("souple");
    expect(loadProject(f.pid).settings.storeKind).toBe("catalog");
  });

  it("quatre produits, prix de démonstration centralisés, galerie propre à chaque fiche", () => {
    expect(products.map((x) => x.handle)).toEqual(SOUPLE_PRODUCTS.map((it) => it.handle));
    expect(products.map((x) => x.title)).toEqual(["Tapis de yoga", "Brique de yoga", "Sangle de yoga", "Anneau Pilates"]);
    expect(products.map((x) => x.price)).toEqual(SOUPLE_PRODUCTS.map((it) => SOUPLE_PRICES[it.key]));
    expect(products.map((x) => x.price)).toEqual([5900, 1900, 1500, 2900]);
    expect(SOUPLE_PRICES.tapis + SOUPLE_PRICES.brique).toBe(7800);
    expect(products.map((x) => x.tags[0])).toEqual(["Tapis", "Accessoires", "Accessoires", "Accessoires"]);
    for (const [i, pr] of products.entries()) {
      const it = SOUPLE_PRODUCTS[i];
      expect(pr.images, it.key).toEqual(it.views.map((v) => `${ID}-${v}`));
      const others = SOUPLE_PRODUCTS.filter((x) => x.key !== it.key).flatMap((x) => x.views);
      const html = pages.get(`/products/${it.handle}`)!;
      const gallery = html.slice(html.indexOf("es-product__media"), html.indexOf("es-product__info"));
      for (const o of others) expect(gallery, `${it.key} : ${o}`).not.toContain(`${ID}-${o}`);
      expect(visibleText(html), it.key).toContain("Prix de démonstration");
      expect(html, it.key).toMatch(/data-sticky-bar|es-sticky/);
    }
  });

  it("ajout au panier réel depuis les cartes de l'accueil et de la boutique (bon produit, une seule variante)", () => {
    for (const route of ["/", "/collections/all"]) {
      const html = pages.get(route)!;
      const ids = [...html.matchAll(/<form[^>]*data-product-form[\s\S]*?name="id" value="(\d+)"/g)].map((m) => Number(m[1]));
      for (const i of [0, 1, 2, 3]) expect(ids, `${route} : produit ${i}`).toContain(variantId(i, 0));
    }
  });

  it("médias : 57 des 59 visuels du dossier, et rien d'autre (aucune image de planche ni génération)", () => {
    expect(f.missing).toEqual([]);
    expect(SOUPLE_MEDIA).toHaveLength(57);
    expect(SOUPLE_MISSING.map((m) => m.file)).toEqual(["21-compte-collection-verticale.png", "22-compte-bandeau.png"]);
    const used = new Set(all.concat(page404, cartEmpty).match(new RegExp(`${ID}-[a-z0-9-]+\\.webp`, "g")) ?? []);
    for (const p of products) for (const img of p.images) used.add(img);
    for (const m of SOUPLE_MEDIA) expect(used.has(`${ID}-${m.file}`), m.file).toBe(true);
    for (const u of used) expect(SOUPLE_MEDIA.some((m) => `${ID}-${m.file}` === u), u).toBe(true);
    for (const m of SOUPLE_MEDIA) expect(m.alt.length, m.file).toBeGreaterThan(5);
  });

  it("SEO : un H1, titre et description uniques par page, alt partout, aperçu non indexable", () => {
    const titles = new Set<string>(), descriptions = new Set<string>();
    for (const [route, html] of pages) {
      expect(html.match(/<h1[\s>]/g)?.length, `${route} : H1`).toBe(1);
      const title = html.match(/<title>([\s\S]*?)<\/title>/)![1].trim();
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
      expect(description.length, route).toBeGreaterThan(20);
      titles.add(title); descriptions.add(description);
      expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
      for (const img of html.match(/<img [^>]*>/g) ?? []) expect(img, route).toMatch(/\balt="/);
    }
    expect(titles.size).toBe(pages.size);
    expect(descriptions.size).toBe(pages.size);
  });

  it("rien d'inventé : ni avis, ni remise, ni livraison gratuite, ni délai, ni garantie, ni personne ; © 2026", () => {
    for (const r of productRoutes) {
      const ld = [...pages.get(r)!.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
      expect(JSON.stringify(ld)).not.toMatch(/AggregateRating|"Review"|ratingValue/);
    }
    for (const [route, html] of pages) {
      const text = visibleText(html);
      expect(text, route).not.toMatch(/★|\d([,.]\d)?\s?\/\s?5\b|avis clients?|garantie \d|garanti à vie|livraison (offerte|gratuite|en \d+)|frais de port offerts|-\s?\d+\s?%|sous \d+ ?(h|jours)|\d+\s?(mm|cm|kg)\b|antidérapant|écologique|certifi|recyclé|fabriqué en|made in/i);
      expect(text, route).not.toMatch(/Camille|fondatrice|fondateur|notre histoire commence/i);
      expect(text, route).not.toMatch(/(©|&copy;)\s*20(2[0-5])\b/);
      expect(text, route).toMatch(/(©|&copy;)\s*2026\s*SOUPLE/);
      expect(text, route).not.toMatch(/lorem ipsum/i);
    }
    expect(all).not.toMatch(/href="(#|)"[^>]*es-social/);
    for (const handle of ["mentions-legales", "cgv", "confidentialite", "cookies"]) expect(visibleText(pages.get(`/pages/${handle}`)!), handle).toMatch(/à compléter/i);
  });

  it("panier : tapis + brique = 78 € en sous-total, livraison à l'étape suivante, jamais un total final", async () => {
    const cart = [{ variantId: variantId(0, 0), quantity: 1 }, { variantId: variantId(1, 0), quantity: 1 }];
    const html = (await fr(() => renderPage({ spec, base: "", files, cart }, "/cart", new URLSearchParams()))).html;
    const summary = visibleText(html.slice(html.indexOf('class="es-cart__summary"'), html.indexOf("</aside>", html.indexOf('class="es-cart__summary"'))));
    expect(summary).toMatch(/Sous-total \(2 articles\) 78 €/);
    expect(summary).toMatch(/Livraison Calculée à l'étape suivante/);
    expect(summary).not.toMatch(/(^|[^-])\bTotal\b/);
    const text = visibleText(html);
    expect(text).toMatch(/Tapis de yoga/);
    expect(text).toMatch(/Brique de yoga/);
    // « Complétez votre pratique » : seulement les produits absents du panier.
    const more = html.slice(html.indexOf("Complétez votre pratique"));
    const block = more.slice(0, more.indexOf("</section>"));
    expect(block).toContain(`/products/${SOUPLE_PRODUCTS[2].handle}`);
    expect(block).not.toContain(`/products/${SOUPLE_PRODUCTS[0].handle}"`);
    expect(html).toContain(`data-demo-checkout href="${SOUPLE_PAGES.paiement}"`);
    expect(html).toMatch(/<button type="submit" name="checkout"/);
    const empty = visibleText((await fr(() => renderPage({ spec, base: "", files, cart: [] }, "/cart", new URLSearchParams()))).html);
    expect(empty).toContain("Votre prochain mouvement commence ici.");
    expect(empty).not.toContain("Complétez votre pratique");
  });

  it("commande d'exemple en quatre étapes : validation, retour, récapitulatif ; aucun champ de carte, actualités décochées", () => {
    const html = pages.get(SOUPLE_PAGES.paiement)!;
    expect(html).toMatch(/data-order-form/);
    for (const n of [1, 2, 3, 4]) expect(html, `étape ${n}`).toMatch(new RegExp(`data-step="${n}"`));
    expect(visibleText(html)).toMatch(/Contact.*Adresse.*Livraison.*Paiement/);
    expect(html).not.toMatch(/cc-number|cc-csc|cc-exp|Numéro de carte|Code de sécurité|Date d'expiration/i);
    const optin = html.match(/<label class="es-order__optin"[\s\S]*?<\/label>/)![0];
    expect(optin).toMatch(/type="checkbox"/);
    expect(optin).not.toMatch(/\bchecked\b/);
    expect(html).toMatch(/data-msg|data-error/);
    expect(html).toMatch(/Calculée à l'étape suivante|calculée à l(&#39;|')étape suivante/i);
    expect(html).not.toMatch(/<form[^>]*action="\/cart|name="checkout"/);
    const conf = pages.get(SOUPLE_PAGES.confirmation)!;
    expect(visibleText(conf)).toMatch(/SOUPLE-0001 \(exemple\)/);
    expect(conf).toMatch(/data-order-confirm/);
    expect(visibleText(conf)).toMatch(/aucun e-mail|exemple/i);
  });

  it("espace client : compte fictif annoncé, formulaires testables, pages reliées, facture fictive", () => {
    const acct = [SOUPLE_PAGES.connexion, SOUPLE_PAGES.motDePasse, SOUPLE_PAGES.compte, SOUPLE_PAGES.commande, SOUPLE_PAGES.adresses, SOUPLE_PAGES.infos];
    for (const r of acct) expect(pages.has(r), r).toBe(true);
    const login = pages.get(SOUPLE_PAGES.connexion)!;
    expect(login).toContain('data-demo-email="demo@souple.example"');
    expect(login.match(/data-acct-form/g)!.length).toBeGreaterThanOrEqual(2);
    expect(visibleText(login)).toMatch(/demo@souple\.example/);
    expect(login).toContain(`href="${SOUPLE_PAGES.motDePasse}"`);
    for (const r of [SOUPLE_PAGES.compte, SOUPLE_PAGES.adresses, SOUPLE_PAGES.infos]) for (const to of [SOUPLE_PAGES.compte, SOUPLE_PAGES.adresses, SOUPLE_PAGES.infos]) expect(pages.get(r)!, `${r} → ${to}`).toContain(`href="${to}"`);
    const order = visibleText(pages.get(SOUPLE_PAGES.commande)!);
    expect(order).toMatch(/Sous-total 78 €/);
    expect(order).toMatch(/Exemple de suivi/);
    expect(order).toMatch(/Aucun document fiscal/);
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    expect(header.settings.account_link).toBe(SOUPLE_PAGES.connexion);
  });

  it("bandeau de cookies : refuser, personnaliser, accepter ; lien vers la page cookies", () => {
    expect(spec.settings.cookie_banner).toBe(true);
    const html = pages.get("/")!;
    expect(html).toContain("data-cookie-banner");
    for (const c of ['data-cookie-choice="refuse"', "data-cookie-customize", 'data-cookie-choice="accept"']) expect(html, c).toContain(c);
    expect(html).toContain(`href="${SOUPLE_PAGES.cookies}"`);
  });

  it("boutique : pastilles Tous (4) / Tapis (1) / Accessoires (3), tri dans la page, état vide", () => {
    const html = pages.get("/collections/all")!;
    const chips = [...html.matchAll(/class="fs-chip-filter[^"]*"[^>]*>([\s\S]*?)<\/button>/g)].map((m) => visibleText(m[1]).trim());
    expect(chips).toEqual(["Tous (4)", "Tapis (1)", "Accessoires (3)"]);
    expect(html.match(/data-chip-item="/g)?.length).toBe(4);
    expect(html).toMatch(/data-sort-list/);
    expect(html).toMatch(/data-client-sort/);
    expect(visibleText(html)).toMatch(/Prix croissant.*Prix décroissant/);
    expect(html).toMatch(/data-chip-empty[^>]*hidden/);
  });

  it("journal, guide, FAQ, contact, livraison, 404", () => {
    const journal = pages.get(SOUPLE_PAGES.journal)!;
    for (const a of SOUPLE_ARTICLES) { expect(journal, a.handle).toContain(`/pages/${a.handle}`); expect(pages.has(`/pages/${a.handle}`), a.handle).toBe(true); }
    expect(visibleText(pages.get(`/pages/${SOUPLE_ARTICLES[0].handle}`)!)).toMatch(/Créer un coin pour bouger chez soi/);
    const guide = visibleText(pages.get(SOUPLE_PAGES.guide)!);
    for (const t of ["Tapis de yoga", "Brique de yoga", "Sangle de yoga", "Anneau Pilates", "Comparatif"]) expect(guide, t).toContain(t);
    const faq = pages.get(SOUPLE_PAGES.faq)!;
    expect(faq).toMatch(/class="es-faq__nav"/);
    for (const m of faq.matchAll(/class="es-faq__nav"[\s\S]*?<\/nav>/g)) for (const a of m[0].matchAll(/href="#([^"]+)"/g)) expect(faq, a[1]).toContain(`id="${a[1]}"`);
    expect(faq.match(/<details/g)!.length).toBeGreaterThanOrEqual(15);
    const contact = pages.get(SOUPLE_PAGES.contact)!;
    for (const name of ["name", "email", "subject", "order", "body"]) expect(contact, name).toMatch(new RegExp(`name="contact\\[${name}\\]"`));
    expect(contact).toMatch(/type="checkbox"[^>]*required|required[^>]*type="checkbox"/);
    expect(visibleText(pages.get(SOUPLE_PAGES.livraison)!)).toMatch(/à confirmer/);
    expect(page404).toMatch(/es-404__mask|es-404--shape/);
    expect(page404).toContain(`${ID}-25-404-piece.webp`);
  });

  it("liens internes : chaque lien de page mène à une page existante de la démonstration", () => {
    const known = new Set(["/", "/search", "/cart", "/collections/all", ...routes]);
    for (const [route, html] of pages) for (const m of html.matchAll(/href="(\/(?:pages|products|collections)\/[^"#?]*)"/g)) expect(known.has(m[1]), `${route} → ${m[1]}`).toBe(true);
  });
});

describe("SOUPLE appliqué à un autre projet : identité du projet, jamais celle de la démonstration", async () => {
  const user = await createUser("souple-autre@example.invalid", "isolated-test-only", "Autre");
  it("aucune trace de la démo (textes, images, prix), couleurs et nom du projet", async () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: ID });
    const built = await fr(() => composeShop(pid, ID, null, false));
    const spec = built.spec;
    expect(spec.direction).toBe(ID);
    expect(spec.settings.conversion_profile).toBe("souple");
    expect(storeProducts(spec).map((x) => x.price)).not.toEqual(expect.arrayContaining([5900, 1900, 1500, 2900]));
    const files = compileTheme(spec);
    for (const route of ["/", `/products/${spec.store.product.handle}`]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      expect(visibleText(html), route).not.toMatch(/SOUPLE|yoga|Pilates|tapis|brique|sangle|liège|Prix de démonstration/i);
      expect(html, route).not.toMatch(/theme-assets\/souple|souple-(tapis|brique|sangle|anneau|ambiance|logo|\d\d-)/);
      expect(html).toContain("Atelier Verre");
      expect(html.match(/<h1[\s>]/g)?.length, route).toBe(1);
    }
    expect(JSON.stringify(spec.settings.color_schemes).toUpperCase()).not.toMatch(/#4A1530|#35041B|#EFE1DD/);
  });
});

describe("SOUPLE : exports", async () => {
  const user = await createUser("souple-exports@example.invalid", "isolated-test-only", "Exports");
  const demo = await fr(() => demoProject(user.id, ID));
  const media = SOUPLE_MEDIA.map((m) => `${ID}-${m.file}`);

  it("couche de design : classes du profil sur le <body>, scripts des interactions", async () => {
    const d = await fr(() => designLayer(demo.spec));
    expect(d.body.classes).toEqual(expect.arrayContaining(["es-conversion-souple", `dir-${ID}`]));
    for (const s of ["family.js"]) expect(d.scripts).toContain(s);
  });

  it("Shopify : tous les médias, les quatre produits, sections, profil", async () => {
    const exp = await fr(() => cmsExport("shopify", demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, f).toContain(f);
    const json = zipText(z, /\.json$/), csv = zipText(z, /\.csv$/);
    expect(json).toMatch(/"conversion_profile":\s*"souple"/);
    for (const it of SOUPLE_PRODUCTS) expect(csv + json, it.handle).toContain(it.handle);
    for (const t of ["cv-banner", "cv-feature", "cv-cards", "cv-infos", "fs-products", "fs-journal", "faq", "newsletter", "demo-order", "demo-account"]) expect(names + json, t).toContain(t);
    expect(zipText(z, /souple\.css$/)).toContain('body[data-conversion="souple"]');
    expect(json).toMatch(/"type_heading_font":\s*"playfair_display_n4"/);
    expect(names + json + zipText(z, /\.(csv|liquid)$/)).not.toMatch(/\/home\/|\/tmp\/|localhost|127\.0\.0\.1/);
  });

  for (const platform of ["woocommerce", "prestashop"] as const) it(`${platform} : médias, feuilles réécrites, classes du profil, produits`, async () => {
    const exp = await fr(() => cmsExport(platform, demo.spec, libraryLoader, { projectId: demo.pid }));
    expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, `${platform} ${f}`).toContain(f);
    const css = zipText(z, /\.css$/);
    expect(css).toContain("body.es-conversion-souple");
    const all = names + zipText(z, /\.(json|php|tpl|html|txt|csv|xml)$/);
    for (const it of ["Tapis de yoga", "Brique de yoga", "Sangle de yoga", "Anneau Pilates"]) expect(all, `${platform} ${it}`).toContain(it);
    expect(all).not.toMatch(/\/home\/user|\/tmp\/ecs-/);
  });
});
