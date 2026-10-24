/**
 * ONDE refait d'après les sept planches du 24 octobre (PR #183, docs/theme-briefs/onde) : thème **mono-produit de la
 * famille E-commerce**, profil de conversion « onde » (onde.css, onde.js, sections « on-* »). Garde-fous :
 *  - thème actif du catalogue, famille E-commerce partout ; sections « on-* » rangées dans la galerie E-commerce et
 *    refusées aux autres thèmes ; libellés traduits ; aucun texte dans la feuille de style ;
 *  - démonstration complète : douze pages, cinq articles, panier, commande et confirmation d'exemple ; un seul produit,
 *    prix illustratif centralisé (149 €), ajout réel au panier ; rien d'inventé (caractéristiques « à confirmer », aucun
 *    avis, aucune promotion, aucune livraison gratuite) ; paiement sans champ de carte ; suivi au résultat d'exemple ;
 *  - médias du kit privé, jamais copiés dans le dépôt ; SEO par page ;
 *  - un autre projet installé dans ce thème garde sa propre identité (aucun ONDE, casque, Graphite & lime ni 149 €).
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
import { catalogTheme } from "@/lib/theme/theme-catalog";
import { ACTIVE_THEMES, themeKinds } from "@/lib/theme/theme-fit";
import { THEME_FAMILY, FAMILY_LIBRARY } from "@/lib/theme/section-families";
import { SECTION_FIT } from "@/lib/theme/section-fit";
import { libraryEntry } from "@/lib/theme/section-library";
import { composeShop } from "@/lib/engine/shop";
import { saveBrand, loadProject } from "@/lib/projects";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { REFERENCE_THEMES } from "@/lib/project-handoff/categories";
import { demoProject } from "./demo-fixtures";
import { ONDE_MEDIA, ONDE_HANDLE, ONDE_KIT_DIR, ONDE_PRICE, ONDE_ARTICLES, ONDE_FAQ } from "./onde-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<dialog[\s\S]*?<\/dialog>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'");
const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");
const ID = "onde";
const ON = ["on-banner", "on-cards", "on-journal", "on-faq", "on-newsletter", "on-product", "on-checkout", "on-help", "on-article"];
const KIT = fs.existsSync(path.join(ONDE_KIT_DIR, "c01-casque-detoure-trois-quarts.webp"));
const LEAK = /\bONDE\b|\bcasque\b|Graphite & lime|149\s?€/i;

describe("ONDE : thème actif de la famille E-commerce (mono-produit)", () => {
  it("catalogue, famille E-commerce, profil « onde », polices Montserrat / Inter", () => {
    expect(ACTIVE_THEMES).toContain(ID);
    expect(themeKinds(ID)).toEqual(["catalog"]);
    expect(THEME_FAMILY[ID]).toBe("catalog");
    expect(REFERENCE_THEMES.find((t) => t.referenceId === ID)?.categories).toEqual(["ecommerce"]);
    const t = catalogTheme(ID)!;
    expect(t.settings).toMatchObject({ conversion_profile: "onde", editorial_profile: "none" });
    expect(t.fonts).toEqual({ heading: "montserrat_n7", body: "inter_n4" });
    expect(t.ownProductBody).toBe(true);
  });

  it("sections « on-* » : galerie E-commerce, réservées au thème ONDE, fiches FR/EN, libellés traduits", () => {
    const gallery = new Set(FAMILY_LIBRARY.catalog.flatMap((e) => e.dispositions.map((d) => d.type)));
    const en = JSON.parse(fs.readFileSync(path.join("theme-base", "i18n", "schema.en.json"), "utf8")) as Record<string, string>;
    for (const type of ON) {
      expect(gallery.has(type), type).toBe(true);
      expect(SECTION_FIT[type]?.themes, type).toEqual([ID]);
      expect(libraryEntry(type, "fr")?.name, type).toBeTruthy();
      expect(libraryEntry(type, "en")?.name, type).toBeTruthy();
    }
    for (const type of [...ON, "on-header", "on-footer", "on-cart"]) {
      const src = fs.readFileSync(path.join("theme-base", "sections", `${type}.liquid`), "utf8");
      const schema = JSON.parse(src.split("{% schema %}")[1].split("{% endschema %}")[0]) as { name: string; settings: { label?: string; options?: { label: string }[] }[] };
      expect(en[schema.name], `${type} : nom`).toBeTruthy();
      for (const s of schema.settings) {
        if (s.label) expect(en[s.label], `${type} : ${s.label}`).toBeTruthy();
        for (const o of s.options ?? []) expect(en[o.label], `${type} : ${o.label}`).toBeTruthy();
      }
      // Aucune trace du produit de la démonstration dans les valeurs par défaut d'une section réutilisable.
      expect(JSON.stringify(schema).replace(/"(info|label|name)":"[^"]*"/g, ""), type).not.toMatch(LEAK);
    }
  });

  it("feuille ONDE : règles préfixées, aucun texte ; script sans texte ; chargés avec le profil", () => {
    const css = fs.readFileSync(path.join("theme-base", "assets", "onde.css"), "utf8");
    for (const rule of css.replace(/\/\*[\s\S]*?\*\//g, "").split("}").map((r) => r.trim()).filter((r) => r && !r.startsWith("@media") && r.includes("{"))) {
      const sel = rule.split("{")[0].replace(/^@media[^{]*\{/, "").trim();
      if (sel) expect(sel.split(",").every((x) => x.trim().startsWith('body[data-conversion="onde"]')), sel).toBe(true);
    }
    expect(css).not.toMatch(/content:\s*"[^"]+"/);
    const js = fs.readFileSync(path.join("theme-base", "assets", "onde.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(js).not.toMatch(/'[A-ZÀ-Ý][a-zà-ÿ]+ [a-zà-ÿ]+/);
    const layout = fs.readFileSync(path.join("theme-base", "layout", "theme.liquid"), "utf8");
    expect(layout).toContain("{%- if settings.conversion_profile == 'onde' -%}{{ 'onde.css' | asset_url | stylesheet_tag }}");
    expect(layout).toContain("'onde.js' | asset_url");
  });

  it("visuels du kit privé jamais suivis dans le dépôt", () => {
    expect(fs.existsSync(path.join(process.cwd(), "public", "theme-assets", ID))).toBe(false);
    expect(fs.readFileSync(path.join(process.cwd(), ".gitignore"), "utf8")).toContain("public/demo/onde/");
  });
});

describe.skipIf(!KIT)("ONDE : démonstration des sept planches", async () => {
  const user = await createUser("onde-demo@example.invalid", "isolated-test-only", "Onde");
  const f = await fr(() => demoProject(user.id, ID));
  const { spec } = f;
  const files = compileTheme(spec);
  const productKey = spec.store.product.template_suffix ? `product.${spec.store.product.template_suffix}` : "product";
  const types = (key: string) => spec.templates[key].order.map((sid) => spec.templates[key].sections[sid]);
  const routes = ["/", "/collections/all", `/products/${ONDE_HANDLE}`, "/cart", ...spec.store.pages.map((p) => `/pages/${p.handle}`)];
  const render = (route: string, cart: { variantId: number; quantity: number }[] = []) => fr(() => renderPage({ spec, base: "", files, cart }, route, new URLSearchParams()));
  const pages = new Map<string, string>();
  for (const route of routes) pages.set(route, (await render(route)).html);

  it("douze pages, cinq articles, commande et confirmation ; sections « on-* » ; spécification valide", () => {
    expect(spec.direction).toBe(ID);
    expect(validateSpec(spec)).toEqual([]);
    const handles = spec.store.pages.map((p) => p.handle);
    for (const h of ["l-experience", "la-marque", "journal", "faq", "contact", "livraison-retours", "suivi-de-commande", "commande", "confirmation", "mentions-legales", "conditions-de-vente", "confidentialite", "cookies", ...ONDE_ARTICLES.map((a) => a.handle)]) expect(handles, h).toContain(h);
    expect(ONDE_ARTICLES).toHaveLength(5);
    expect(new Set(ONDE_ARTICLES.map((a) => a.image)).size).toBe(5);
    expect(types("collection").map((s) => s.type)).toEqual(["on-banner", "on-cards", "on-cards", "on-cards"]);
    expect(types("cart").map((s) => s.type)).toEqual(["on-cart"]);
    expect(Object.values(spec.groups.header.sections).map((s) => s.type)).toEqual(["on-header"]);
    expect(Object.values(spec.groups.footer.sections).map((s) => s.type)).toEqual(["on-footer"]);
    expect(spec.settings.conversion_profile).toBe("onde");
    expect(loadProject(f.pid).settings.storeKind).toBe("catalog");
  });

  it("un seul produit, prix illustratif centralisé (149 €), ajout réel au panier avec quantité", () => {
    expect(spec.store.products ?? []).toEqual([]);
    expect(spec.store.product.price).toBe(ONDE_PRICE);
    expect(ONDE_PRICE).toBe(14900);
    expect(spec.store.product.variants).toEqual([{ title: "Graphite & lime", options: ["Graphite & lime"], price: ONDE_PRICE, available: true }]);
    const html = pages.get(`/products/${ONDE_HANDLE}`)!;
    expect(html).toMatch(/<form[^>]*action="\/cart\/add"[^>]*data-product-form/);
    expect(html).toMatch(/name="quantity" value="1" min="1"/);
    expect(html).toContain("149 €");
    expect(html).toMatch(/data-on-sticky/);
    for (const b of html.match(/<button[^>]*data-add-button[^>]*>/g) ?? []) expect(b).not.toMatch(/\sdisabled[\s>]/);
  });

  it("panier : 1 casque = 149 €, 2 = 298 € de sous-total, livraison « calculée à l'étape suivante », vide sans total", async () => {
    const one = visibleText((await render("/cart", [{ variantId: 1000, quantity: 1 }])).html);
    expect(one).toMatch(/Sous-total\s+149 €/);
    expect(one).toContain("Calculée à l'étape suivante");
    const two = visibleText((await render("/cart", [{ variantId: 1000, quantity: 2 }])).html);
    expect(two).toMatch(/Sous-total\s+298 €/);
    const empty = visibleText(pages.get("/cart")!);
    expect(empty).toContain("Votre panier attend");
    expect(empty).not.toMatch(/Sous-total|149 €/);
  });

  it("commande d'exemple : trois étapes vérifiées, aucun champ de carte, confirmation annoncée comme exemple", () => {
    const checkout = pages.get("/pages/commande")!;
    expect(checkout).toContain('data-on-checkout="steps"');
    expect(checkout.match(/data-on-step="\d"/g)).toHaveLength(3);
    expect(checkout).not.toMatch(/carte bancaire|num[ée]ro de carte|cvc|cvv|name="(number|card)/i);
    expect(visibleText(checkout)).toMatch(/aucune donnée bancaire/);
    const confirm = visibleText(pages.get("/pages/confirmation")!);
    expect(confirm).toContain("Exemple de confirmation");
    expect(confirm).toMatch(/aucune commande n'est enregistrée et aucun e-mail n'est envoyé/);
  });

  it("FAQ : recherche, quatre thèmes, état sans résultat, notice à ajouter (aucun faux téléchargement)", () => {
    const html = pages.get("/pages/faq")!;
    expect(html).toContain("data-on-faq-search");
    expect(html.match(/data-on-faq-tab="[^"]+"/g)!.map((x) => x.split('"')[1])).toEqual(["casque", "utilisation", "commande", "livraison"]);
    expect(html).toContain("data-on-faq-empty");
    expect(visibleText(html)).toContain("Notice à ajouter.");
    expect(html).not.toMatch(/\.pdf|download/i);
    expect(ONDE_FAQ.length).toBeGreaterThanOrEqual(8);
  });

  it("contact (accord non coché), suivi (résultat d'exemple), journal (filtres), menu mobile et tiroir", () => {
    const contact = pages.get("/pages/contact")!;
    expect(contact).toMatch(/<input type="checkbox" name="contact\[consent\]" value="oui" required>/);
    const track = pages.get("/pages/suivi-de-commande")!;
    expect(track).toContain("data-on-track");
    expect(visibleText(track)).toContain("Exemple de résultat");
    expect(visibleText(track)).not.toMatch(/expédiée le|en cours de livraison|livrée le/i);
    const journal = pages.get("/pages/journal")!;
    expect(journal.match(/data-on-chip="[^"]*"/g)!.length).toBeGreaterThanOrEqual(3);
    const home = pages.get("/")!;
    expect(home).toMatch(/data-mobile-menu/);
    expect(home).toMatch(/data-cart-drawer/);
  });

  it("médias du kit : tous montrés ; logo des planches ; aucun original de réserve", () => {
    expect(f.missing).toEqual([]);
    const shown = [...pages.values()].join("\n") + JSON.stringify(spec);
    for (const m of ONDE_MEDIA) expect(shown, m.file).toContain(`${ID}-${m.file}`);
    for (const r of ["01-hero.webp", "06-banniere.webp", "07-scene-salon.webp"]) expect(shown).not.toContain(`${ID}-${r}`);
  });

  it("SEO : un H1, titre et description uniques par page, alt partout, aperçu non indexable", () => {
    const titles = new Set<string>(), descriptions = new Set<string>();
    for (const [route, html] of pages) {
      if (route === "/cart") continue;
      expect(html.match(/<h1[\s>]/g)?.length, `${route} : H1`).toBe(1);
      const title = html.match(/<title>([\s\S]*?)<\/title>/)![1].trim();
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
      expect(description.length, route).toBeGreaterThan(50);
      expect(description.length, route).toBeLessThanOrEqual(170);
      titles.add(title); descriptions.add(description);
      expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
      for (const img of html.match(/<img [^>]*>/g) ?? []) expect(img, route).toMatch(/\balt="/);
    }
    expect(titles.size).toBe(pages.size - 1);
    expect(descriptions.size).toBe(pages.size - 1);
  });

  it("rien d'inventé : caractéristiques à confirmer, aucun avis, aucune promotion ni livraison gratuite", () => {
    for (const [route, html] of pages) {
      const text = visibleText(html);
      expect(text, route).not.toMatch(/lorem ipsum|★|avis clients?|livraison (offerte|gratuite)|promo|-\d+ ?%|stock limité|\d+\s?(mAh|dB|Hz|heures d'autonomie)|bluetooth \d/i);
    }
    expect(visibleText(pages.get("/pages/faq")!)).toMatch(/autonomie et le temps de charge ne sont pas encore renseignés/);
  });

  it("liens internes : chaque lien mène à une page existante", () => {
    const known = new Set(["/", "/search", "/cart", "/collections/all", ...routes]);
    for (const [route, html] of pages) for (const m of html.matchAll(/href="(\/(?:pages|products|collections)\/[^"#?]*)"/g)) expect(known.has(m[1]), `${route} → ${m[1]}`).toBe(true);
  });

  it("exports : profil « onde », feuille et script, produit", async () => {
    const shop = unzipSync(new Uint8Array((await fr(() => cmsExport("shopify", spec, libraryLoader, { projectId: f.pid }))).zip));
    expect(zipText(shop, /settings_data\.json$/)).toMatch(/"conversion_profile":\s*"onde"/);
    expect(Object.keys(shop).some((k) => k.endsWith("assets/onde.css"))).toBe(true);
    expect(Object.keys(shop).some((k) => k.endsWith("assets/onde.js"))).toBe(true);
    for (const platform of ["woocommerce", "prestashop"] as const) {
      const exp = await fr(() => cmsExport(platform, spec, libraryLoader, { projectId: f.pid }));
      expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
      const z = unzipSync(new Uint8Array(exp.zip));
      expect(Object.keys(z).join("\n") + zipText(z, /\.(json|php|tpl|html|txt|csv|xml)$/)).toContain("Le casque ONDE");
    }
  });
});

describe("ONDE appliqué à un autre projet : identité du projet, jamais celle de la démonstration", async () => {
  const user = await createUser("onde-autre@example.invalid", "isolated-test-only", "Autre");
  it("sections ONDE, aucune trace de la démo (ONDE, casque, Graphite & lime, 149 €), un H1", async () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: ID });
    const spec = (await fr(() => composeShop(pid, ID, null, false))).spec;
    expect(spec.direction).toBe(ID);
    expect(spec.settings.conversion_profile).toBe("onde");
    expect(Object.values(spec.groups.header.sections).map((s) => s.type)).toContain("on-header");
    expect(spec.templates.index.order.map((k) => spec.templates.index.sections[k].type)).toContain("on-banner");
    const productKey = spec.store.product.template_suffix ? `product.${spec.store.product.template_suffix}` : "product";
    expect(spec.templates[productKey].order.map((k) => spec.templates[productKey].sections[k].type)).toContain("on-product");
    expect(validateSpec(spec)).toEqual([]);
    const files = compileTheme(spec);
    for (const route of ["/", `/products/${spec.store.product.handle}`]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      expect(visibleText(html), route).not.toMatch(LEAK);
      expect(html).not.toMatch(/onde-c\d\d-|demo\/onde/);
      expect(html.match(/<h1[\s>]/g)?.length, route).toBe(1);
    }
  });
});
