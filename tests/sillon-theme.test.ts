/**
 * SILLON (issue #148) : troisième thème « boutique spécialisée ». Garde-fous :
 *  - thème actif du catalogue, famille « boutique spécialisée », profil graphique « nomade » propre ;
 *  - démonstration composée par le vrai moteur puis rédigée dans le même ordre de sections que la composition du thème ;
 *  - rien d'inventé (aucun prix, avis, note, garantie, délai, caractéristique technique), SEO par page, un H1 par page ;
 *  - un autre projet installé dans SILLON garde sa propre identité : aucun nom ni texte de SILLON n'y apparaît.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { renderPage } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { validateSpec } from "@/lib/theme/ops";
import { reconcileOfferCart } from "@/lib/theme/purchase-offers";
import { catalogTheme } from "@/lib/theme/theme-catalog";
import { ACTIVE_THEMES, themeKinds, themePreviewPath } from "@/lib/theme/theme-fit";
import { THEME_FAMILY, FAMILY_LIBRARY } from "@/lib/theme/section-families";
import { themeAllowed } from "@/lib/theme/theme-access";
import { composeShop } from "@/lib/engine/shop";
import { saveBrand, loadProject } from "@/lib/projects";
import { demoProject } from "./demo-fixtures";
import { SILLON_MEDIA, SILLON_EMPTY } from "./sillon-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const HOME = ["cv-hero", "rich-text", "cv-feature", "cv-hotspots", "cv-gallery", "featured-purchase", "faq", "newsletter-media"];
const PRODUCT = ["main-product", "cv-hotspots", "cv-specs", "cv-steps", "cv-alternating", "fs-commitments", "faq", "product-recommendations"];
const LIBRARY = new Set(FAMILY_LIBRARY.specialty.flatMap((e) => e.dispositions.map((d) => d.type)));
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ");

describe("SILLON : thème actif de la famille « boutique spécialisée »", () => {
  it("est proposé, rangé en boutique spécialisée, avec son profil, ses polices et un bouton d'en-tête générique", () => {
    expect(ACTIVE_THEMES).toContain("sillon");
    expect(themeKinds("sillon")).toEqual(["specialty"]);
    expect(THEME_FAMILY.sillon).toBe("specialty");
    expect(themeAllowed("creer", "sillon")).toBe(true);
    expect(themeAllowed(null, "sillon")).toBe(false);
    const t = catalogTheme("sillon")!;
    expect(t.settings).toMatchObject({ conversion_profile: "nomade" });
    expect(t.fonts).toEqual({ heading: "libre_baskerville_n4", body: "jost_n4" });
    // Le libellé du bouton ne nomme jamais un produit : il sert tel quel à tout projet.
    expect(t.headerCta).toEqual({ fr: "Commander", en: "Order now", icon: "arrow" });
    expect(t.look).toMatchObject({ headerLayout: "menu-right", footer: "wordmark" });
    expect(fs.existsSync(path.join(process.cwd(), "public", themePreviewPath("sillon")))).toBe(true);
  });

  it("profil « nomade » : règles propres, FRAISE et ONDE gardent les leurs", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "conversion.css"), "utf8");
    expect(css).toContain('body[data-conversion="nomade"]{');
    expect(css).toContain('body[data-conversion="pop"]{');
    expect(css).toContain('body[data-conversion="contrast"]{');
    expect(css).not.toContain(':is(body[data-conversion="pop"],body[data-conversion="contrast"])');
    expect(css).toMatch(/prefers-reduced-motion:reduce\)\{body\[data-conversion="nomade"\]/);
    const schema = fs.readFileSync(path.join(process.cwd(), "theme-base", "config", "settings_schema.json"), "utf8");
    expect(schema).toContain('"value": "nomade"');
    expect(schema).toContain('"value": "sillon"');
  });
});

describe("SILLON : démonstration", async () => {
  const user = await createUser("sillon@example.invalid", "isolated-test-only", "Sillon");
  const f = await fr(() => demoProject(user.id, "sillon"));
  const { spec } = f;
  const files = compileTheme(spec);
  const productKey = `product.${spec.store.product.template_suffix}`;
  const types = (key: string) => spec.templates[key].order.map((id) => spec.templates[key].sections[id]);
  const routes = ["/", `/products/${spec.store.product.handle}`, ...spec.store.pages.map((p) => `/pages/${p.handle}`)];
  const pages = new Map<string, string>();
  for (const route of routes) pages.set(route, (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html);

  it("composée dans SILLON, sections de la bibliothèque, même ordre que la composition du thème ; seuls les engagements inconnus sont masqués", () => {
    expect(spec.direction).toBe("sillon");
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index").map((s) => s.type)).toEqual(HOME);
    expect(types(productKey).map((s) => s.type)).toEqual(PRODUCT);
    // Livraison, retours, garantie : inconnus, la section reste dans l'éditeur mais n'est pas affichée.
    for (const s of [...types("index"), ...types(productKey)]) expect(!!s.disabled, s.type).toBe(s.type === "fs-commitments");
    for (const s of [...types("index"), ...types(productKey)]) if (!["main-product", "product-recommendations"].includes(s.type)) expect(LIBRARY.has(s.type), s.type).toBe(true);
    expect(spec.store.pages.map((p) => p.handle)).toEqual(["usages", "utilisation-caracteristiques", "contact"]);
  });

  it("les 18 visuels sont utilisés, 07 et 16 réparés compris, chacun à sa place", () => {
    expect(SILLON_EMPTY).toEqual([]);
    expect(f.missing).toEqual([]);
    expect(SILLON_MEDIA.map((m) => m.file)).toEqual(expect.arrayContaining(["sillon-07.webp", "sillon-16.webp"]));
    expect(pages.get("/")).toMatch(/<img[^>]*sillon-16\.webp/);
    expect(pages.get("/pages/utilisation-caracteristiques")).toMatch(/<img[^>]*sillon-07\.webp/);
    const all = [...pages.values()].join("\n");
    for (const m of SILLON_MEDIA) expect(all, m.file).toContain(m.file);
    for (const e of SILLON_EMPTY) expect(all).not.toContain(e);
    // Aucune scène répétée sur l'accueil (les vues produit de l'achat sont une galerie).
    const home = pages.get("/")!;
    for (const file of ["sillon-04", "sillon-19", "sillon-06", "sillon-10", "sillon-18", "sillon-08", "sillon-12", "sillon-17", "sillon-14", "sillon-13", "sillon-16"]) {
      const shown = new Set([...home.matchAll(new RegExp(`<img[^>]*${file}\\.webp[^>]*>`, "g"))].filter((m) => !/thumb/.test(m[0])).map((m) => m.index));
      expect(shown.size, file).toBeLessThanOrEqual(1);
    }
  });

  it("SEO : un H1, titre et description uniques par page, fil d'Ariane, alt partout, aperçu non indexable", () => {
    const titles = new Set<string>(), descriptions = new Set<string>();
    for (const [route, html] of pages) {
      expect(html.match(/<h1[\s>]/g)?.length, `${route} : H1`).toBe(1);
      const title = html.match(/<title>([\s\S]*?)<\/title>/)![1].trim();
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
      expect(title.length, route).toBeLessThanOrEqual(70);
      expect(description.length, route).toBeGreaterThan(60);
      expect(description.length, route).toBeLessThanOrEqual(160);
      titles.add(title); descriptions.add(description);
      expect(html).toContain('<link rel="canonical"');
      expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
      for (const img of html.match(/<img [^>]*>/g) ?? []) expect(img, route).toMatch(/\balt="/);
      if (route !== "/") expect(html).toContain('"@type": "BreadcrumbList"');
    }
    expect(titles.size).toBe(pages.size);
    expect(descriptions.size).toBe(pages.size);
    expect(pages.get("/")).toMatch(/<title>[^<]*machine à espresso nomade/i);
    expect(pages.get("/pages/usages")).toMatch(/<title>[^<]*machine à café portable/i);
  });

  it("rien d'inventé : pas de prix, d'offre, de note, d'avis ni d'urgence ; les manques restent dans l'éditeur, jamais sur la démo publique", () => {
    expect(spec.store.product.price).toBeNull();
    const product = pages.get(`/products/${spec.store.product.handle}`)!;
    const ld = [...product.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const p = ld.find((x) => x["@type"] === "Product");
    expect(p).toBeTruthy();
    expect(p.offers).toBeUndefined();
    expect(JSON.stringify(ld)).not.toMatch(/AggregateRating|Review|ratingValue/);
    expect(JSON.stringify(spec.templates)).not.toMatch(/"structured_data":true/);
    for (const [route, html] of pages) {
      const text = visibleText(html);
      expect(text, route).not.toMatch(/\d+\s?bars?\b|\d+\s?(mAh|W|ml|cl|g|kg|cm|mm)\b|garantie \d|livraison (offerte|gratuite|en \d)|\d+\s?€|\d+([,.]\d)?\s?\/\s?5|★|avis clients?|plus que \d|stock limité|dernières? pièces?/i);
    }
    expect(visibleText(product)).toContain("Prix à définir");
    // Sans prix, rien n'est vendu : l'ajout au panier est refusé avec un message exact (pas un faux manque de stock).
    expect(() => reconcileOfferCart(spec, [{ variantId: 1000, quantity: 1 }])).toThrow(/^Prix à définir/);
    for (const [route, html] of pages) expect(visibleText(html), route).not.toMatch(/à compléter|à confirmer|à préciser|\[\s*À/i);
    // Les champs inconnus restent prêts dans l'éditeur (blocs et section masqués), sans être supprimés.
    const hidden = Object.values(spec.templates).flatMap((t) => Object.values(t.sections)).flatMap((s) => [...(s.disabled ? [s] : []), ...Object.values(s.blocks ?? {}).filter((b) => b.disabled)]);
    const pending = JSON.stringify(hidden);
    for (const field of ["Pression : [À compléter]", "Livraison, retours et garantie", "Quelle est la garantie ?", "Dans la boîte"]) expect(pending, field).toContain(field);
    expect(JSON.stringify(spec.templates).match(/À compléter/g)!.length).toBe(pending.match(/À compléter/g)!.length);
    expect(visibleText(pages.get("/")!)).toContain("Boutique de démonstration : aucune vente réelle.");
    const footer = visibleText(pages.get("/")!);
    expect(footer).toMatch(/(©|&copy;)\s*\d{4}\s*SILLON/); // « nom du projet + année », aucun document juridique inventé
  });

  it("en-tête : bouton d'achat permanent vers la fiche ; pied à grand nom de marque", () => {
    const home = pages.get("/")!;
    expect(home).toMatch(new RegExp(`class="es-button es-button--small es-header__cta"[^>]*>[\\s\\S]*?Commander`));
    expect(home).toContain(`href="/products/${spec.store.product.handle}" class="es-button es-button--small es-header__cta"`);
    expect(home).toMatch(/es-footer[^"]*wordmark|footer--wordmark|es-footer__wordmark/);
  });
});

describe("SILLON appliqué à un autre projet : identité du projet, jamais celle de la démonstration", async () => {
  const user = await createUser("sillon-autre@example.invalid", "isolated-test-only", "Autre");
  it("une boutique spécialisée neuve composée dans SILLON n'hérite d'aucun nom ni texte de SILLON", async () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: "sillon" });
    const built = await fr(() => composeShop(pid, "sillon", null, false));
    const spec = built.spec;
    expect(spec.direction).toBe("sillon");
    expect(spec.settings.conversion_profile).toBe("nomade");
    const files = compileTheme(spec);
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    expect(header.settings.cta_label).toBe("Commander");
    expect(header.settings.cta_link).toBe(`/products/${spec.store.product.handle}`);
    for (const route of ["/", `/products/${spec.store.product.handle}`]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      const text = visibleText(html);
      expect(text, route).not.toMatch(/SILLON|espresso|nomade|où tout coule|vous vous posez|avant de partir|bague cuivrée/i);
      expect(html, route).not.toMatch(/sillon-\d\d\.webp/);
      expect(html).toContain("Atelier Verre");
    }
    // Couleurs du projet, pas celles de SILLON.
    expect(JSON.stringify(spec.settings.color_schemes).toUpperCase()).not.toContain("#B8743F");
  });
});
