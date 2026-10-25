/**
 * MUSEAU CLUB (issue #158, refait d'après les maquettes enrichies du 23 octobre, PR #167 commentaire 6359277162) :
 * thème de la famille **Produit spécifique / Boutique spécialisée**, profil « club », quatre produits (harnais, laisse,
 * collier, pochette à sacs). Garde-fous :
 *  - thème actif, famille spécialisée partout, profil « club », polices Nunito 900 / DM Sans, accès par forfait ;
 *  - accueil en onze blocs dans l'ordre de la planche 01 ; quatre fiches enrichies sans section de reste ;
 *  - prix de démonstration (49 / 29 / 25 / 15 €) et tailles XS à L seulement sur le harnais et le collier ;
 *  - panier : harnais M + laisse = 78 € présentés en sous-total, livraison « calculée à l'étape suivante », jamais un
 *    « Total » trompeur ; exemple de commande sans aucun champ de carte ; pages compte reliées entre elles ;
 *  - rien d'inventé : aucun avis ni note, aucune garantie, aucun délai, aucune mesure, jamais « prenez la taille
 *    au-dessus » ; pages légales en modèles « à compléter » ; © 2026 ; aucun réseau social sans adresse ;
 *  - les 31 originaux du kit utilisés ; SEO par page ; liens internes valides ;
 *  - un autre projet installé dans ce thème garde sa propre identité (ni prix, ni textes, ni images de la démo) ;
 *    exports Shopify / WooCommerce / PrestaShop.
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
import { themeAllowed } from "@/lib/theme/theme-access";
import { storeProducts } from "@/lib/theme/store-products";
import { composeShop } from "@/lib/engine/shop";
import { saveBrand, loadProject } from "@/lib/projects";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { designLayer } from "@/lib/cms-v2/design";
import { REFERENCE_THEMES } from "@/lib/project-handoff/categories";
import { demoProject } from "./demo-fixtures";
import { MUSEAU_MEDIA, MUSEAU_PRODUCTS, MUSEAU_PAGES, MUSEAU_PRICES } from "./museau-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
const LIBRARY = new Set(FAMILY_LIBRARY.specialty.flatMap((e) => e.dispositions.map((d) => d.type)));
const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");
const ID = "museau-club";
const HOME = ["cv-banner", "fs-products", "cv-banner", "cv-feature", "fs-products", "cv-cards", "cv-banner", "cv-banner", "fs-journal", "faq", "newsletter-media"];

describe("MUSEAU CLUB : thème actif de la famille « Boutique spécialisée » (quatre produits)", () => {
  it("catalogue, famille spécialisée partout, profil « club », polices, accès par forfait, aperçu suivi", () => {
    expect(ACTIVE_THEMES).toContain(ID);
    expect(themeKinds(ID)).toEqual(["specialty"]);
    expect(THEME_FAMILY[ID]).toBe("specialty");
    expect(REFERENCE_THEMES.find((t) => t.referenceId === ID)?.categories).toEqual(["specialized"]);
    expect(themeAllowed("creer", ID)).toBe(false);
    expect(themeAllowed("vendre", ID)).toBe(false);
    expect(themeAllowed("dominer", ID)).toBe(true);
    const t = catalogTheme(ID)!;
    expect(t.settings).toMatchObject({ conversion_profile: "club", editorial_profile: "none" });
    expect(t.fonts).toEqual({ heading: "nunito_n9", body: "dm_sans_n4" });
    expect(fs.existsSync(path.join(process.cwd(), "public", themePreviewPath(ID)))).toBe(true);
    // Police Nunito 900 fournie avec sa licence (OFL).
    expect(fs.existsSync(path.join(process.cwd(), "assets", "fonts", "Nunito-900.ttf"))).toBe(true);
    expect(fs.readFileSync(path.join(process.cwd(), "assets", "fonts", "licenses", "Nunito-OFL.txt"), "utf8")).toMatch(/SIL Open Font License/);
  });

  it("dispositions MUSEAU CLUB proposées dans la galerie de la famille ; écrans d'exemple hors galerie", () => {
    const disp = (key: string) => FAMILY_LIBRARY.specialty.find((e) => e.key === `specialty.${key}`)!.dispositions.map((d) => d.id);
    expect(disp("hero")).toEqual(expect.arrayContaining(["light-veil", "panel-left", "panel-right", "size-guide", "buy-band"]));
    expect(disp("benefits")).toContain("numbered");
    expect(disp("details")).toEqual(expect.arrayContaining(["pills", "numbered"]));
    expect(disp("addons")).toEqual(expect.arrayContaining(["media", "over-photo", "plus"]));
    expect(disp("specs")).toEqual(expect.arrayContaining(["table", "cards-open"]));
    expect(disp("faq")).toEqual(expect.arrayContaining(["topics", "photo"]));
    expect(disp("story")).toEqual(expect.arrayContaining(["journal-row", "journal-grid"]));
    expect(disp("newsletter")).toContain("background");
    for (const t of ["demo-order", "demo-account"]) { expect(LIBRARY.has(t), t).toBe(false); expect(isStructuralType(t), t).toBe(true); }
  });

  it("profil « club » limité au thème ; bandeau de cookies désactivé par défaut pour les autres thèmes", () => {
    const conv = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "conversion.css"), "utf8");
    for (const p of ["club", "pop", "contrast", "nomade", "astral", "itineraire"]) expect(conv, p).toContain(`body[data-conversion="${p}"]`);
    const schema = JSON.parse(fs.readFileSync(path.join(process.cwd(), "theme-base", "config", "settings_schema.json"), "utf8")) as { settings?: { id?: string; default?: unknown }[] }[];
    expect(schema.flatMap((g) => g.settings ?? []).find((s) => s.id === "cookie_banner")?.default).toBe(false);
  });
});

describe("MUSEAU CLUB : démonstration (planches 01 à 08)", async () => {
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

  it("accueil en onze blocs (planche 01), fiches sans section de reste, sections de la bibliothèque ou de structure", () => {
    expect(spec.direction).toBe(ID);
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index").map((s) => s.type)).toEqual(HOME);
    expect(types("index")[0].settings).toMatchObject({ layout: "spotlight", veil: "light", heading_tag: "h1" });
    for (const it of MUSEAU_PRODUCTS) {
      const t = types(keyOf(it.handle)).map((s) => s.type);
      expect(t[0], it.key).toBe("main-product");
      expect(t, it.key).not.toContain("product-recommendations");
      expect(t.at(-1), it.key).toBe("cv-banner");
      // La laisse a le trio sur photo et pas de bandeau du guide ; le harnais et le collier ont le guide des tailles.
      const illus = types(keyOf(it.handle)).filter((s) => s.type === "cv-banner" && s.settings.layout === "illustration").length;
      expect(illus, it.key).toBe(["harnais", "collier"].includes(it.key) ? 1 : 0);
    }
    expect(types(keyOf(MUSEAU_PRODUCTS[1].handle)).some((s) => s.type === "fs-products" && s.settings.layout === "over-photo")).toBe(true);
    for (const key of Object.keys(spec.templates)) for (const s of types(key)) {
      expect(!!s.disabled, `${key} ${s.type}`).toBe(false);
      expect(LIBRARY.has(s.type) || isStructuralType(s.type), `${key} ${s.type}`).toBe(true);
    }
    expect(spec.settings.conversion_profile).toBe("club");
    expect(loadProject(f.pid).settings.storeKind).toBe("specialty");
  });

  it("quatre produits, prix de démonstration, tailles seulement sur le harnais et le collier", () => {
    expect(products.map((x) => x.handle)).toEqual(MUSEAU_PRODUCTS.map((it) => it.handle));
    expect(products.map((x) => x.title)).toEqual(["Harnais", "Laisse", "Collier", "Pochette"]);
    expect(products.map((x) => x.price)).toEqual([MUSEAU_PRICES.harnais, MUSEAU_PRICES.laisse, MUSEAU_PRICES.collier, MUSEAU_PRICES.pochette]);
    expect(products.map((x) => x.price)).toEqual([4900, 2900, 2500, 1500]);
    expect(products.map((x) => x.variants.length)).toEqual([4, 1, 4, 1]);
    expect(products[0].variants.map((v) => v.options[1])).toEqual(["XS", "S", "M", "L"]);
    for (const pr of products) expect(pr.images.every((img) => img.startsWith(`${ID}-${MUSEAU_PRODUCTS.find((x) => x.handle === pr.handle)!.key}-`)), pr.handle).toBe(true);
    for (const r of productRoutes) {
      const html = pages.get(r)!;
      expect(visibleText(html), r).toContain("Prix de démonstration");
      const sized = r.includes("harnais") || r.includes("collier");
      expect(html.includes("es-option__guide"), r).toBe(sized);
      expect(html.includes("data-sticky-option"), r).toBe(sized);
    }
  });

  it("médias : les 31 originaux du kit, et rien d'autre (aucune image de planche ni génération)", () => {
    expect(f.missing).toEqual([]);
    expect(MUSEAU_MEDIA).toHaveLength(31);
    const used = new Set(all.match(new RegExp(`${ID}-[a-z]+(?:-\\d\\d)?\\.webp`, "g")) ?? []);
    for (const p of products) for (const img of p.images) used.add(img);
    for (const m of MUSEAU_MEDIA) expect(used.has(`${ID}-${m.file}`), m.file).toBe(true);
    for (const u of used) expect(MUSEAU_MEDIA.some((m) => `${ID}-${m.file}` === u), u).toBe(true);
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

  it("rien d'inventé : ni avis ni note, ni garantie, ni délai, ni mesure ; jamais « prenez la taille au-dessus » ; © 2026", () => {
    for (const r of productRoutes) {
      const ld = [...pages.get(r)!.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
      expect(JSON.stringify(ld)).not.toMatch(/AggregateRating|"Review"|ratingValue/);
    }
    for (const [route, html] of pages) {
      const text = visibleText(html);
      expect(text, route).not.toMatch(/★|\d([,.]\d)?\s?\/\s?5\b|avis clients?|garantie \d|garanti à vie|livraison (offerte|gratuite|en \d+)|sous \d+ ?(h|jours)|\d+\s?(mm|cm|kg)\b|imperméable|indestructible|vétérinaire|anti-?traction/i);
      expect(text, route).not.toMatch(/convient à tous les chiens|taille (au-dessus|supérieure)|privilégiez la taille/i);
      expect(text, route).not.toMatch(/(©|&copy;)\s*20(2[0-5])\b/);
      expect(text, route).toMatch(/(©|&copy;)\s*2026\s*MUSEAU CLUB/);
      expect(text, route).not.toMatch(/lorem ipsum/i);
    }
    // Aucun lien de réseau social sans adresse réelle : le bloc reste vide.
    expect(all).not.toMatch(/href="(#|)"[^>]*es-social/);
    for (const handle of ["mentions-legales", "confidentialite", "cgv"]) expect(visibleText(pages.get(`/pages/${handle}`)!), handle).toMatch(/Modèle de démonstration : contenu à compléter et à valider/);
    const tailles = visibleText(pages.get(MUSEAU_PAGES.tailles)!);
    expect(tailles).toMatch(/Taille Tour de cou Tour de poitrail/);
    expect(tailles.match(/À renseigner/g)!.length).toBeGreaterThanOrEqual(8);
  });

  it("panier : harnais M + laisse = 78 € en sous-total, livraison à l'étape suivante, aucun « Total » trompeur", async () => {
    const cart = [{ variantId: variantId(0, 2), quantity: 1 }, { variantId: variantId(1, 0), quantity: 1 }];
    const html = (await fr(() => renderPage({ spec, base: "", files, cart }, "/cart", new URLSearchParams()))).html;
    const summary = visibleText(html.slice(html.indexOf('class="es-cart__summary"'), html.indexOf("</aside>", html.indexOf('class="es-cart__summary"'))));
    expect(summary).toContain("Sous-total 78 €");
    expect(summary).toMatch(/Livraison Calculée à l(&#39;|')étape suivante/);
    expect(summary).not.toMatch(/\bTotal\b/);
    expect(visibleText(html)).toMatch(/Harnais Bleu cobalt Taille M/);
    // « Complétez la balade ? » propose seulement les produits absents du panier.
    const more = html.slice(html.indexOf("Complétez la balade"));
    expect(more).toContain(`/products/${MUSEAU_PRODUCTS[2].handle}`);
    expect(more.slice(0, more.indexOf("</section>"))).not.toContain(`/products/${MUSEAU_PRODUCTS[0].handle}"`);
    // Lien vers l'exemple de commande : utilisé seulement par l'aperçu statique, jamais à la place du paiement Shopify.
    expect(html).toContain(`data-demo-checkout href="${MUSEAU_PAGES.paiement}"`);
    expect(html).toMatch(/<button type="submit" name="checkout"/);
    const empty = visibleText((await fr(() => renderPage({ spec, base: "", files, cart: [] }, "/cart", new URLSearchParams()))).html);
    expect(empty).toContain("La prochaine balade commence ici.");
    expect(empty).toContain("Nos essentiels");
  });

  it("exemple de commande et de confirmation : aucun champ de carte, champs désactivés, 78 € en sous-total", () => {
    for (const handle of [MUSEAU_PAGES.paiement, MUSEAU_PAGES.confirmation]) {
      const html = pages.get(handle)!;
      expect(html, handle).not.toMatch(/cc-number|cc-csc|cc-exp|Numéro de carte|Code de sécurité|Date d'expiration/i);
      expect(visibleText(html), handle).toMatch(/Sous-total 78 €/);
      expect(visibleText(html), handle).toMatch(/Exemple de (démonstration|confirmation)/);
    }
    const checkout = pages.get(MUSEAU_PAGES.paiement)!;
    expect(checkout.match(/<fieldset class="es-order__step" disabled>/g)?.length).toBe(4);
    expect(checkout).not.toMatch(/<form[^>]*action="\/cart|name="checkout"/);
  });

  it("espace client : connexion, création, mot de passe oublié, compte, commande, adresses, informations reliés entre eux", () => {
    const acct = [MUSEAU_PAGES.connexion, MUSEAU_PAGES.inscription, MUSEAU_PAGES.motDePasse, MUSEAU_PAGES.compte, MUSEAU_PAGES.commande, MUSEAU_PAGES.adresses, MUSEAU_PAGES.infos];
    for (const r of acct) expect(pages.has(r), r).toBe(true);
    expect(pages.get(MUSEAU_PAGES.connexion)!).toContain(`href="${MUSEAU_PAGES.motDePasse}"`);
    expect(pages.get(MUSEAU_PAGES.connexion)!).toContain(`href="${MUSEAU_PAGES.inscription}"`);
    for (const r of [MUSEAU_PAGES.compte, MUSEAU_PAGES.adresses, MUSEAU_PAGES.infos]) for (const to of [MUSEAU_PAGES.compte, MUSEAU_PAGES.adresses, MUSEAU_PAGES.infos, MUSEAU_PAGES.connexion]) expect(pages.get(r)!, `${r} → ${to}`).toContain(`href="${to}"`);
    expect(visibleText(pages.get(MUSEAU_PAGES.commande)!)).toMatch(/Sous-total 78 €/);
    // Tous les champs sont dans un groupe désactivé : rien n'est saisi ni envoyé.
    for (const r of acct) { const sec = pages.get(r)!.match(/<section class="es-section es-acct[\s\S]*?<\/section>/)![0]; expect(sec.replace(/<fieldset[^>]*\sdisabled>[\s\S]*?<\/fieldset>/g, ""), r).not.toMatch(/<input/); }
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    expect(header.settings.account_link).toBe(MUSEAU_PAGES.connexion);
  });

  it("bandeau de cookies : refuser, personnaliser, accepter ; lien vers la politique de confidentialité", () => {
    expect(spec.settings.cookie_banner).toBe(true);
    const html = pages.get("/")!;
    expect(html).toContain("data-cookie-banner");
    for (const c of ['data-cookie-choice="refuse"', "data-cookie-customize", 'data-cookie-choice="accept"']) expect(html, c).toContain(c);
    expect(html).toContain(`href="${MUSEAU_PAGES.confidentialite}"`);
  });

  it("boutique : pastilles par type (Tous, Harnais, Laisses, Colliers, Pochettes) et quatre cartes", () => {
    const html = pages.get("/collections/all")!;
    expect([...html.matchAll(/class="fs-chip-filter[^"]*"[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(["Tous", "Harnais", "Laisses", "Colliers", "Pochettes"]);
    expect(html.match(/data-chip-item="/g)?.length).toBe(4);
  });

  it("liens internes : chaque lien de page mène à une page existante de la démonstration", () => {
    const known = new Set(["/", "/search", "/cart", "/collections/all", ...routes]);
    for (const [route, html] of pages) for (const m of html.matchAll(/href="(\/(?:pages|products|collections)\/[^"#?]*)"/g)) expect(known.has(m[1]), `${route} → ${m[1]}`).toBe(true);
  });
});

describe("MUSEAU CLUB appliqué à un autre projet : identité du projet, jamais celle de la démonstration", async () => {
  const user = await createUser("museau-autre@example.invalid", "isolated-test-only", "Autre");
  it("aucune trace de la démo (textes, images, prix), couleurs et nom du projet", async () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: ID });
    const built = await fr(() => composeShop(pid, ID, null, false));
    const spec = built.spec;
    expect(spec.direction).toBe(ID);
    expect(spec.settings.conversion_profile).toBe("club");
    expect(storeProducts(spec).map((x) => x.price)).not.toEqual(expect.arrayContaining([4900, 2900, 2500, 1500]));
    const files = compileTheme(spec);
    for (const route of ["/", `/products/${spec.store.product.handle}`]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      expect(visibleText(html), route).not.toMatch(/MUSEAU|cobalt|harnais|laisse|pochette|Prix de démonstration/i);
      expect(html, route).not.toMatch(/theme-assets\/museau-club|museau-club-(harnais|laisse|collier|pochette|ambiance|logo)/);
      expect(html).toContain("Atelier Verre");
      expect(html.match(/<h1[\s>]/g)?.length, route).toBe(1);
    }
    expect(JSON.stringify(spec.settings.color_schemes).toUpperCase()).not.toMatch(/#0A30CC|#FAEA72/);
  });
});

describe("MUSEAU CLUB : exports", async () => {
  const user = await createUser("museau-exports@example.invalid", "isolated-test-only", "Exports");
  const demo = await fr(() => demoProject(user.id, ID));
  const media = MUSEAU_MEDIA.map((m) => `${ID}-${m.file}`);

  it("couche de design : classes du profil sur le <body>, scripts des interactions", async () => {
    const d = await fr(() => designLayer(demo.spec));
    expect(d.body.classes).toEqual(expect.arrayContaining(["es-conversion-club", `dir-${ID}`]));
    for (const s of ["conversion.js", "family.js"]) expect(d.scripts).toContain(s);
  });

  it("Shopify : tous les médias, les quatre produits et leurs variantes, sections, profil", async () => {
    const exp = await fr(() => cmsExport("shopify", demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, f).toContain(f);
    const json = zipText(z, /\.json$/), csv = zipText(z, /\.csv$/);
    expect(json).toMatch(/"conversion_profile":\s*"club"/);
    for (const it of MUSEAU_PRODUCTS) expect(csv + json, it.handle).toContain(it.handle);
    for (const t of ["cv-banner", "cv-feature", "cv-cards", "fs-products", "fs-journal", "faq", "newsletter-media", "demo-order", "demo-account", "cv-specs"]) expect(names + json, t).toContain(t);
    expect(zipText(z, /conversion\.css$/)).toContain('body[data-conversion="club"]');
    // Titres en Nunito 900 : police de la bibliothèque Shopify désignée par son nom (disponibilité à vérifier sur Shopify).
    expect(json).toMatch(/"type_heading_font":\s*"nunito_n9"/);
    expect(names + json + zipText(z, /\.(csv|liquid)$/)).not.toMatch(/\/home\/|\/tmp\/|localhost|127\.0\.0\.1/);
  });

  for (const platform of ["woocommerce", "prestashop"] as const) it(`${platform} : médias, feuilles réécrites, scripts et classes du profil`, async () => {
    const exp = await fr(() => cmsExport(platform, demo.spec, libraryLoader, { projectId: demo.pid }));
    expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, `${platform} ${f}`).toContain(f);
    const css = zipText(z, /\.css$/);
    expect(css).toContain("body.es-conversion-club");
    const all = names + zipText(z, /\.(json|php|tpl|html|txt|csv|xml)$/);
    for (const it of ["Harnais", "Laisse", "Collier", "Pochette"]) expect(all, `${platform} ${it}`).toContain(it);
    expect(all).not.toMatch(/\/home\/user|\/tmp\/ecs-/);
  });
});
