/**
 * NOCTIL et TRAVERSE (issue #152) : quatrième et cinquième thèmes « boutique spécialisée ». Garde-fous :
 *  - thèmes actifs du catalogue, famille « boutique spécialisée », profils graphiques propres (« astral », « itinéraire ») ;
 *  - compositions distinctes entre elles et de FRAISE, ONDE, SILLON (sections, ordre, en-têtes et pieds de page) ;
 *  - démonstrations composées par le vrai moteur puis rédigées dans le même ordre ; 31 médias utilisés, TRAVERSE
 *    ambiance-04 jamais importé ni affiché ;
 *  - rien d'inventé (aucun prix, avis, note, garantie, caractéristique), aucun « à compléter » public, champs inconnus
 *    conservés masqués dans l'éditeur ; SEO par page, un H1 par page ;
 *  - un autre projet installé dans ces thèmes garde sa propre identité ; exports Shopify / WooCommerce / PrestaShop.
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
import { composeShop } from "@/lib/engine/shop";
import { saveBrand, loadProject } from "@/lib/projects";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { designLayer } from "@/lib/cms-v2/design";
import { demoProject } from "./demo-fixtures";
import { KIT_EXCLUDED, KIT_MEDIA, type KitId } from "./noctil-traverse-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ");
const LIBRARY = new Set(FAMILY_LIBRARY.specialty.flatMap((e) => e.dispositions.map((d) => d.type)));
const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");

const PLAN: Record<KitId, { profile: string; fonts: { heading: string; body: string }; home: string[]; product: string[]; pages: string[]; header: string; footer: string; brand: RegExp; leak: RegExp }> = {
  noctil: {
    profile: "astral", fonts: { heading: "space_grotesk_n5", body: "karla_n4" },
    home: ["cv-hero", "features-grid", "cv-gallery", "image-with-text", "cv-cards", "cta-banner", "faq", "newsletter"],
    product: ["main-product", "cv-ingredients", "content-tabs", "timeline", "cv-feature", "fs-commitments", "faq", "product-recommendations"],
    pages: ["univers", "aide"], header: "floating", footer: "centered", brand: /NOCTIL/, leak: /NOCTIL|galaxie|la nuit entre|une autre nuit|Préparer sa nuit/i,
  },
  traverse: {
    profile: "itineraire", fonts: { heading: "playfair_display_n4", body: "chivo_n4" },
    home: ["cv-banner", "features-grid", "cv-alternating", "cv-hotspots", "cv-ingredients", "image-with-text", "featured-purchase", "faq", "newsletter-media"],
    product: ["main-product", "cv-cards", "content-tabs", "cv-steps", "cv-gallery", "fs-commitments", "faq", "product-recommendations"],
    pages: ["carnet-de-route", "aide"], header: "two-rows", footer: "card", brand: /TRAVERSE/, leak: /TRAVERSE|quai de départ|Carnet de route|trois temps/i,
  },
};

describe("NOCTIL et TRAVERSE : thèmes actifs de la famille « boutique spécialisée »", () => {
  for (const id of ["noctil", "traverse"] as const) it(`${id} : catalogue, profil, polices, accès par forfait, aperçu suivi`, () => {
    expect(ACTIVE_THEMES).toContain(id);
    expect(themeKinds(id)).toEqual(["specialty"]);
    expect(THEME_FAMILY[id]).toBe("specialty");
    expect(themeAllowed("creer", id)).toBe(true);
    expect(themeAllowed(null, id)).toBe(false);
    const t = catalogTheme(id)!;
    expect(t.settings).toMatchObject({ conversion_profile: PLAN[id].profile });
    expect(t.fonts).toEqual(PLAN[id].fonts);
    expect(fs.existsSync(path.join(process.cwd(), "public", themePreviewPath(id)))).toBe(true);
  });

  it("profils « astral » et « itinéraire » : règles propres, profils existants intacts", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "conversion.css"), "utf8");
    for (const p of ["astral", "itineraire", "nomade", "pop", "contrast"]) expect(css, p).toContain(`body[data-conversion="${p}"]{`);
    for (const p of ["astral", "itineraire"]) expect(css).toMatch(new RegExp(`prefers-reduced-motion:reduce\\)\\{body\\[data-conversion="${p}"\\]`));
    const schema = fs.readFileSync(path.join(process.cwd(), "theme-base", "config", "settings_schema.json"), "utf8");
    for (const v of ["astral", "itineraire", "noctil", "traverse"]) expect(schema).toContain(`"value": "${v}"`);
  });

  it("compositions distinctes : ni entre elles, ni avec FRAISE / ONDE / SILLON (polices, en-têtes, pieds, ordre de l'accueil)", () => {
    const ids = ["fraise", "onde", "sillon", "noctil", "traverse"];
    const themes = ids.map((i) => catalogTheme(i)!);
    expect(new Set(themes.map((t) => t.fonts.heading)).size).toBe(ids.length);
    expect(new Set(themes.map((t) => `${t.look.headerLayout}/${t.look.shape}`)).size).toBeGreaterThanOrEqual(4);
    for (const id of ["noctil", "traverse"]) {
      const t = catalogTheme(id)!;
      for (const o of themes.filter((x) => x.id !== id)) expect(t.look.footer, `${id} / ${o.id}`).not.toBe(o.look.footer);
      for (const o of themes.filter((x) => x.id !== id)) expect(`${t.look.headerLayout}/${t.look.shape}`, `${id} / ${o.id}`).not.toBe(`${o.look.headerLayout}/${o.look.shape}`);
    }
    expect(PLAN.noctil.home).not.toEqual(PLAN.traverse.home);
    expect(PLAN.noctil.home[0]).not.toBe(PLAN.traverse.home[0]);
  });
});

for (const id of ["noctil", "traverse"] as const) describe(`${id.toUpperCase()} : démonstration`, async () => {
  const user = await createUser(`${id}-demo@example.invalid`, "isolated-test-only", id);
  const f = await fr(() => demoProject(user.id, id));
  const { spec } = f;
  const files = compileTheme(spec);
  const productKey = `product.${spec.store.product.template_suffix}`;
  const types = (key: string) => spec.templates[key].order.map((sid) => spec.templates[key].sections[sid]);
  const routes = ["/", `/products/${spec.store.product.handle}`, ...spec.store.pages.map((p) => `/pages/${p.handle}`)];
  const pages = new Map<string, string>();
  for (const route of routes) pages.set(route, (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html);
  const all = [...pages.values()].join("\n");

  it("composée dans son thème, sections de la bibliothèque, ordre de la composition ; seuls les engagements inconnus masqués", () => {
    expect(spec.direction).toBe(id);
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index").map((s) => s.type)).toEqual(PLAN[id].home);
    expect(types(productKey).map((s) => s.type)).toEqual(PLAN[id].product);
    for (const s of [...types("index"), ...types(productKey)]) expect(!!s.disabled, s.type).toBe(s.type === "fs-commitments");
    for (const s of [...types("index"), ...types(productKey)]) if (!["main-product", "product-recommendations"].includes(s.type)) expect(LIBRARY.has(s.type), s.type).toBe(true);
    expect(spec.store.pages.map((p) => p.handle)).toEqual(PLAN[id].pages);
    expect(spec.settings.conversion_profile).toBe(PLAN[id].profile);
  });

  it("en-tête et pied de page : dispositions de la famille reconnues, propres à ce thème", () => {
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
    expect(currentChromePreset("specialty", "header", header.settings)?.id).toBe(PLAN[id].header);
    expect(currentChromePreset("specialty", "footer", footer.settings)?.id).toBe(PLAN[id].footer);
  });

  it("médias : chaque fichier du kit est utilisé (ambiance-04 de TRAVERSE exclu, jamais importé ni affiché)", () => {
    expect(f.missing).toEqual([]);
    const shown = all + JSON.stringify(spec.store.product.images);
    for (const m of KIT_MEDIA[id]) expect(shown, m.file).toContain(`${id}-${m.file}`);
    expect(KIT_MEDIA[id].length).toBe(id === "traverse" ? 15 : 16);
    for (const x of KIT_EXCLUDED[id]) {
      expect(all).not.toContain(`${id}-${x.file}`);
      expect(Object.keys(spec.files)).not.toContain(`${id}-${x.file}`);
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
  });

  it("rien d'inventé ; aucun manque public ; champs inconnus conservés masqués dans l'éditeur", () => {
    expect(spec.store.product.price).toBeNull();
    const product = pages.get(`/products/${spec.store.product.handle}`)!;
    const ld = [...product.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    expect(ld.find((x) => x["@type"] === "Product")?.offers).toBeUndefined();
    expect(JSON.stringify(ld)).not.toMatch(/AggregateRating|Review|ratingValue/);
    expect(JSON.stringify(spec.templates)).not.toMatch(/"structured_data":true/);
    for (const [route, html] of pages) {
      const text = visibleText(html);
      expect(text, route).not.toMatch(/à compléter|à confirmer|à préciser|\[\s*À|lorem ipsum/i);
      expect(text, route).not.toMatch(/\d+\s?(mAh|W|lm|lumens?|L|litres?|ml|g|kg|cm|mm|h)\b|garantie \d|livraison (offerte|gratuite|en \d)|\d+\s?€|\d+([,.]\d)?\s?\/\s?5|★|avis clients?|plus que \d|stock limité|imperméable|étanche|cabine|sommeil|endormissement/i);
    }
    expect(() => reconcileOfferCart(spec, [{ variantId: 1000, quantity: 1 }])).toThrow(/^Prix à définir/);
    const hidden = Object.values(spec.templates).flatMap((t) => Object.values(t.sections)).flatMap((s) => [...(s.disabled ? [s] : []), ...Object.values(s.blocks ?? {}).filter((b) => b.disabled)]);
    expect(JSON.stringify(spec.templates).match(/À compléter/g)!.length).toBe(JSON.stringify(hidden).match(/À compléter/g)!.length);
    for (const field of ["Caractéristiques techniques", "Livraison, retours et garantie", "Quelle est la garantie ?", "Fiche technique"]) expect(JSON.stringify(hidden), field).toContain(field);
    expect(visibleText(pages.get("/")!)).toContain("Boutique de démonstration : aucune vente réelle.");
    expect(visibleText(pages.get("/")!)).toMatch(new RegExp(`(©|&copy;)\\s*\\d{4}\\s*${id.toUpperCase()}`));
  });

  it("liens internes : chaque lien de page mène à une page existante de la démonstration", () => {
    const known = new Set(["/", "/search", "/cart", "/collections/all", ...routes]);
    for (const [route, html] of pages) for (const m of html.matchAll(/href="(\/(?:pages|products|collections)\/[^"#?]*)"/g)) expect(known.has(m[1]), `${route} → ${m[1]}`).toBe(true);
  });
});

describe("NOCTIL et TRAVERSE appliqués à un autre projet : identité du projet, jamais celle de la démonstration", async () => {
  const user = await createUser("kit-autre@example.invalid", "isolated-test-only", "Autre");
  for (const id of ["noctil", "traverse"] as const) it(`${id} : aucune trace de la démo, couleurs et nom du projet, dispositions du thème`, async () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: id });
    const built = await fr(() => composeShop(pid, id, null, false));
    const spec = built.spec;
    expect(spec.direction).toBe(id);
    expect(spec.settings.conversion_profile).toBe(PLAN[id].profile);
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
    expect(currentChromePreset("specialty", "header", header.settings)?.id).toBe(PLAN[id].header);
    expect(currentChromePreset("specialty", "footer", footer.settings)?.id).toBe(PLAN[id].footer);
    const files = compileTheme(spec);
    for (const route of ["/", `/products/${spec.store.product.handle}`]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      expect(visibleText(html), route).not.toMatch(PLAN[id].leak);
      expect(html, route).not.toMatch(/theme-assets\/(noctil|traverse)|(noctil|traverse)-(produit|ambiance|logo)/);
      expect(html).toContain("Atelier Verre");
    }
    expect(JSON.stringify(spec.settings.color_schemes).toUpperCase()).not.toMatch(/#8E6CF0|#A8572E/);
  });
});

for (const id of ["noctil", "traverse"] as const) describe(`${id.toUpperCase()} : exports`, async () => {
  const user = await createUser(`${id}-exports@example.invalid`, "isolated-test-only", "Exports");
  const demo = await fr(() => demoProject(user.id, id));
  const media = KIT_MEDIA[id].map((m) => `${id}-${m.file}`);

  it("couche de design : classes du profil sur le <body>, scripts des interactions", async () => {
    const d = await fr(() => designLayer(demo.spec));
    expect(d.body.classes).toEqual(expect.arrayContaining([`es-conversion-${PLAN[id].profile}`, `dir-${id}`]));
    for (const s of ["conversion.js", "family.js"]) expect(d.scripts).toContain(s);
  });

  it("Shopify : tous les médias, sections, profil et SEO", async () => {
    const exp = await fr(() => cmsExport("shopify", demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, f).toContain(f);
    for (const x of KIT_EXCLUDED[id]) expect(names).not.toContain(`${id}-${x.file}`);
    const json = zipText(z, /\.json$/);
    expect(json).toMatch(new RegExp(`"conversion_profile":\\s*"${PLAN[id].profile}"`));
    for (const t of PLAN[id].home.concat(PLAN[id].product).filter((x) => !["main-product", "product-recommendations"].includes(x))) expect(names + json, t).toContain(t);
    expect(zipText(z, /conversion\.css$/)).toContain(`body[data-conversion="${PLAN[id].profile}"]`);
    expect(names + json + zipText(z, /\.(csv|liquid)$/)).not.toMatch(/\/home\/|\/tmp\/|localhost|127\.0\.0\.1/);
  });

  for (const platform of ["woocommerce", "prestashop"] as const) it(`${platform} : médias, feuilles réécrites, scripts et classes du profil`, async () => {
    const exp = await fr(() => cmsExport(platform, demo.spec, libraryLoader, { projectId: demo.pid }));
    expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, `${platform} ${f}`).toContain(f);
    const css = zipText(z, /\.css$/);
    expect(css).toContain(`body.es-conversion-${PLAN[id].profile}`);
    expect(css).not.toContain("body[data-conversion=");
    const all = names + zipText(z, /\.(json|php|tpl|html|txt|csv|xml)$/);
    expect(all).toContain(`es-conversion-${PLAN[id].profile}`);
    expect(all).not.toMatch(/\/home\/user|\/tmp\/ecs-/);
  });
});
