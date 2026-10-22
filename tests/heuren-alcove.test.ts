/**
 * HEUREN et ALCÔVE (issue #155) : deux thèmes **mono-produit de la famille E-commerce** (celle d'ORBE). Garde-fous :
 *  - thèmes actifs du catalogue, famille E-commerce partout (catalogue, recommandation, bibliothèque), jamais « boutique
 *    spécialisée » ; profils éditoriaux propres (« cadran », « arrondi ») ;
 *  - compositions distinctes entre elles et d'ORBE (ouverture, sections, en-têtes et pieds de page) ;
 *  - démonstrations composées par le vrai moteur puis rédigées dans le même ordre ; un seul produit ; les 30 médias et les
 *    deux logos utilisés ; aucune même image dans deux sections qui se suivent ;
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
import { SHOP_KIT_MEDIA, type ShopKitId } from "./heuren-alcove-fixtures";
import { REFERENCE_THEMES } from "@/lib/project-handoff/categories";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ");
const LIBRARY = new Set(FAMILY_LIBRARY.catalog.flatMap((e) => e.dispositions.map((d) => d.type)));
const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");

const PLAN: Record<ShopKitId, { profile: string; fonts: { heading: string; body: string }; home: string[]; product: string[]; pages: string[]; header: string; footer: string; brand: RegExp; leak: RegExp }> = {
  heuren: {
    profile: "cadran", fonts: { heading: "instrument_serif_n4", body: "inter_n4" },
    home: ["ed-opening", "ed-statement", "fs-lookbook", "fs-campaign", "ed-scene", "featured-purchase", "v2-faq", "newsletter-media"],
    product: ["main-product", "ed-diptych", "v2-faq", "product-recommendations"],
    pages: ["au-fil-du-jour", "aide"], header: "centered-nav", footer: "boxed", brand: /HEUREN/, leak: /HEUREN|heure bleue|bleu nuit soleillé|Au fil du jour/i,
  },
  alcove: {
    profile: "arrondi", fonts: { heading: "lora_n4", body: "work_sans_n4" },
    home: ["ed-opening", "fs-lookbook", "rich-text", "ed-diptych", "fs-campaign", "featured-purchase", "faq", "newsletter"],
    product: ["main-product", "image-with-text", "ed-diptych", "faq", "product-recommendations"],
    pages: ["piece-par-piece", "aide"], header: "store", footer: "stacked", brand: /ALCÔVE/, leak: /ALCÔVE|alcôve à soi|terracotta|Pièce par pièce/i,
  },
};

describe("HEUREN et ALCÔVE : thèmes actifs de la famille E-commerce (mono-produit), jamais « boutique spécialisée »", () => {
  for (const id of ["heuren", "alcove"] as const) it(`${id} : catalogue, famille E-commerce partout, profil, polices, accès par forfait, aperçu suivi`, () => {
    expect(ACTIVE_THEMES).toContain(id);
    expect(themeKinds(id)).toEqual(["catalog"]);
    expect(THEME_FAMILY[id]).toBe("catalog");
    expect(REFERENCE_THEMES.find((t) => t.referenceId === id)?.categories).toEqual(["ecommerce"]);
    // Droits par famille (plan-entitlements.ts) : HEUREN dès Développer, ALCÔVE avec Dominer (rangs 3 et 4 en E-commerce).
    expect(themeAllowed("creer", id)).toBe(false);
    expect(themeAllowed("vendre", id)).toBe(id === "heuren");
    expect(themeAllowed("dominer", id)).toBe(true);
    expect(themeAllowed(null, id)).toBe(false);
    const t = catalogTheme(id)!;
    expect(t.kinds).toEqual(["catalog"]);
    expect(t.settings).toMatchObject({ editorial_profile: PLAN[id].profile, conversion_profile: "none" });
    expect(t.fonts).toEqual(PLAN[id].fonts);
    expect(fs.existsSync(path.join(process.cwd(), "public", themePreviewPath(id)))).toBe(true);
  });

  it("profils « cadran » et « arrondi », ouverture « arche » : règles propres, profils existants intacts", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "editorial.css"), "utf8");
    for (const p of ["cadran", "arrondi", "object", "journal"]) expect(css, p).toContain(`body[data-editorial="${p}"]`);
    expect(css).toContain(".ed-opening--arch .ed-shell{");
    const schema = fs.readFileSync(path.join(process.cwd(), "theme-base", "config", "settings_schema.json"), "utf8");
    for (const v of ["cadran", "arrondi", "heuren", "alcove"]) expect(schema).toContain(`"value": "${v}"`);
    expect(fs.readFileSync(path.join(process.cwd(), "theme-base", "sections", "ed-opening.liquid"), "utf8")).toContain('"value": "arch"');
    expect(FAMILY_LIBRARY.catalog.find((e) => e.key === "catalog.hero")!.dispositions.map((d) => d.id)).toEqual(["immersive", "journal", "arch", "fullscreen"]);
  });

  it("compositions distinctes : ni entre elles, ni avec ORBE (polices, en-têtes, pieds, ouverture)", () => {
    const ids = ["orbe", "heuren", "alcove"];
    const themes = ids.map((i) => catalogTheme(i)!);
    expect(new Set(themes.map((t) => t.fonts.heading)).size).toBe(3);
    expect(new Set(themes.map((t) => t.look.footer)).size).toBe(3);
    expect(new Set(themes.map((t) => String(t.headerSettings?.layout ?? t.look.headerLayout) + "/" + String(t.headerSettings?.mega_menu ?? "none"))).size).toBe(3);
    expect(PLAN.heuren.home).not.toEqual(PLAN.alcove.home);
  });
});

for (const id of ["heuren", "alcove"] as const) describe(`${id.toUpperCase()} : démonstration`, async () => {
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

  it("composée dans son thème E-commerce, sections de la bibliothèque E-commerce, ordre de la composition, un seul produit", () => {
    expect(spec.direction).toBe(id);
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index").map((s) => s.type)).toEqual(PLAN[id].home);
    expect(types(productKey).map((s) => s.type)).toEqual(PLAN[id].product);
    for (const s of [...types("index"), ...types(productKey)]) expect(!!s.disabled, s.type).toBe(false);
    for (const s of [...types("index"), ...types(productKey)]) if (!["main-product", "product-recommendations"].includes(s.type)) expect(LIBRARY.has(s.type), s.type).toBe(true);
    expect(spec.store.pages.map((p) => p.handle)).toEqual(PLAN[id].pages);
    expect(spec.settings.editorial_profile).toBe(PLAN[id].profile);
    expect(spec.store.products).toEqual([]);
    expect((spec.store.collections ?? []).flatMap((c) => c.products)).toEqual([spec.store.product.handle]);
    expect(loadProject(f.pid).settings.storeKind).toBe("catalog");
  });

  it("en-tête et pied de page : dispositions de la famille E-commerce reconnues, propres à ce thème", () => {
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
    expect(currentChromePreset("catalog", "header", header.settings)?.id).toBe(PLAN[id].header);
    expect(currentChromePreset("catalog", "footer", footer.settings)?.id).toBe(PLAN[id].footer);
  });

  it("médias : logo, 5 vues et 10 ambiances utilisés ; jamais la même image dans deux sections qui se suivent", () => {
    expect(f.missing).toEqual([]);
    expect(SHOP_KIT_MEDIA[id].length).toBe(16);
    const shown = all + JSON.stringify(spec.store.product.images);
    for (const m of SHOP_KIT_MEDIA[id]) expect(shown, m.file).toContain(`${id}-${m.file}`);
    for (const key of Object.keys(spec.templates)) {
      const imgs = types(key).filter((s) => !s.disabled).map((s) => new Set(JSON.stringify(s).match(new RegExp(`${id}-(?:produit|ambiance)-\\d\\d\\.webp`, "g")) ?? []));
      for (let i = 1; i < imgs.length; i++) for (const file of imgs[i]) expect(imgs[i - 1].has(file), `${key} : ${file} dans deux sections successives`).toBe(false);
    }
    // HEUREN : la scène sur pierre noire est la version corrigée (ambiance-07) ; l'ancienne n'est pas dans le lot.
    if (id === "heuren") expect(all).toContain("heuren-ambiance-07.webp");
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
      expect(text, route).not.toMatch(/\d+\s?(mm|cm|m|ATM|bar|g|kg|h)\b|garantie \d|livraison (offerte|gratuite|en \d)|\d+\s?€|\d+([,.]\d)?\s?\/\s?5|★|avis clients?|plus que \d|stock limité|étanche|automatique|quartz|saphir|acier|inoxydable|déhoussable|ergonomique|mousse|velours|bouclette/i);
    }
    expect(() => reconcileOfferCart(spec, [{ variantId: 1000, quantity: 1 }])).toThrow(/^Prix à définir/);
    const hidden = Object.values(spec.templates).flatMap((t) => Object.values(t.sections)).flatMap((s) => [...(s.disabled ? [s] : []), ...Object.values(s.blocks ?? {}).filter((b) => b.disabled)]);
    expect(JSON.stringify(spec.templates).match(/À compléter/g)!.length).toBe(JSON.stringify(hidden).match(/À compléter/g)!.length);
    for (const field of ["Caractéristiques techniques", "Livraison, retours et garantie", "Quelle est la garantie ?"]) expect(JSON.stringify(hidden), field).toContain(field);
    // Une seule mention de démonstration (#157) : celle de l'aperçu, pas un bandeau d'annonce en plus.
    expect(visibleText(pages.get("/")!)).not.toContain("Boutique de démonstration");
    expect(Object.values(spec.groups.header.sections).map((sec) => sec.type)).toEqual(["header"]);
    expect(visibleText(pages.get("/")!)).toMatch(new RegExp(`(©|&copy;)\\s*\\d{4}\\s*${id === "heuren" ? "HEUREN" : "ALCÔVE"}`));
  });

  it("sans prix : achat affiché indisponible (fiche, produit à la une, barre mobile) ; avec un prix de test, l'achat reste normal (#157)", async () => {
    const productRoute = `/products/${spec.store.product.handle}`;
    const addButtons = (html: string) => [...html.matchAll(/<button[^>]*data-add-button[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);
    const stickyButton = (html: string) => html.match(/<button[^>]*data-sticky-add[^>]*>[^<]*<\/button>/)?.[0] ?? "";
    for (const route of ["/", productRoute]) {
      const html = pages.get(route)!;
      expect(addButtons(html).length, route).toBeGreaterThan(0);
      for (const b of addButtons(html)) { expect(b, route).toMatch(/\sdisabled[\s>]/); expect(visibleText(b).replace(/\s+/g, " ").trim(), route).toBe("Achat indisponible"); }
      expect(html, route).toMatch(/<p class="es-small es-muted es-buy__note" data-price-pending>Prix à définir : ce produit ne peut pas encore être commandé\.<\/p>/);
    }
    expect(stickyButton(pages.get(productRoute)!)).toMatch(/disabled>Achat indisponible<\/button>$/);
    // Prix de test dans une copie isolée (jamais publié comme prix de la marque) : bouton actif, note cachée, panier accepté.
    const priced = structuredClone(spec);
    priced.store.product.price = 12900;
    for (const v of priced.store.product.variants) v.price = 12900;
    const html = (await fr(() => renderPage({ spec: priced, base: "", files: compileTheme(priced), cart: [] }, productRoute, new URLSearchParams()))).html;
    for (const b of addButtons(html)) { expect(b).not.toMatch(/\sdisabled[\s>]/); expect(visibleText(b).replace(/\s+/g, " ").trim()).toBe("Ajouter au panier"); }
    expect(html).toMatch(/data-price-pending hidden>/);
    expect(stickyButton(html)).toMatch(/>Ajouter au panier<\/button>$/);
    expect(stickyButton(html)).not.toMatch(/disabled/);
    expect(reconcileOfferCart(priced, [{ variantId: 1000, quantity: 2 }]).map((l) => [l.variantId, l.quantity])).toEqual([[1000, 2]]);
  });

  it("liens internes : chaque lien de page mène à une page existante de la démonstration", () => {
    const known = new Set(["/", "/search", "/cart", "/collections/all", ...routes]);
    for (const [route, html] of pages) for (const m of html.matchAll(/href="(\/(?:pages|products|collections)\/[^"#?]*)"/g)) expect(known.has(m[1]), `${route} → ${m[1]}`).toBe(true);
  });
});

describe("HEUREN et ALCÔVE appliqués à un autre projet : identité du projet, jamais celle de la démonstration", async () => {
  const user = await createUser("shopkit-autre@example.invalid", "isolated-test-only", "Autre");
  for (const id of ["heuren", "alcove"] as const) it(`${id} : aucune trace de la démo, couleurs et nom du projet, dispositions du thème`, async () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: id });
    const built = await fr(() => composeShop(pid, id, null, false));
    const spec = built.spec;
    expect(spec.direction).toBe(id);
    expect(spec.settings.editorial_profile).toBe(PLAN[id].profile);
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
    expect(currentChromePreset("catalog", "header", header.settings)?.id).toBe(PLAN[id].header);
    expect(currentChromePreset("catalog", "footer", footer.settings)?.id).toBe(PLAN[id].footer);
    const files = compileTheme(spec);
    for (const route of ["/", `/products/${spec.store.product.handle}`]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      expect(visibleText(html), route).not.toMatch(PLAN[id].leak);
      expect(html, route).not.toMatch(/theme-assets\/(heuren|alcove)|(heuren|alcove)-(produit|ambiance|logo)/);
      expect(html).toContain("Atelier Verre");
    }
    expect(JSON.stringify(spec.settings.color_schemes).toUpperCase()).not.toMatch(/#B8946A|#A14225/);
  });
});

for (const id of ["heuren", "alcove"] as const) describe(`${id.toUpperCase()} : exports`, async () => {
  const user = await createUser(`${id}-exports@example.invalid`, "isolated-test-only", "Exports");
  const demo = await fr(() => demoProject(user.id, id));
  const media = SHOP_KIT_MEDIA[id].map((m) => `${id}-${m.file}`);

  it("couche de design : classes du profil sur le <body>, scripts des interactions", async () => {
    const d = await fr(() => designLayer(demo.spec));
    expect(d.body.classes).toEqual(expect.arrayContaining([`es-editorial-${PLAN[id].profile}`, `dir-${id}`]));
    expect(d.scripts).toContain("family.js");
  });

  it("Shopify : tous les médias, sections, profil et SEO", async () => {
    const exp = await fr(() => cmsExport("shopify", demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, f).toContain(f);
    const json = zipText(z, /\.json$/);
    expect(json).toMatch(new RegExp(`"editorial_profile":\\s*"${PLAN[id].profile}"`));
    for (const t of PLAN[id].home.concat(PLAN[id].product).filter((x) => !["main-product", "product-recommendations"].includes(x))) expect(names + json, t).toContain(t);
    expect(zipText(z, /editorial\.css$/)).toContain(`body[data-editorial="${PLAN[id].profile}"]`);
    expect(names + json + zipText(z, /\.(csv|liquid)$/)).not.toMatch(/\/home\/|\/tmp\/|localhost|127\.0\.0\.1/);
  });

  for (const platform of ["woocommerce", "prestashop"] as const) it(`${platform} : médias, feuilles réécrites, scripts et classes du profil`, async () => {
    const exp = await fr(() => cmsExport(platform, demo.spec, libraryLoader, { projectId: demo.pid }));
    expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, `${platform} ${f}`).toContain(f);
    const css = zipText(z, /\.css$/);
    expect(css).toContain(`body.es-editorial-${PLAN[id].profile}`);
    expect(css).not.toContain(`body[data-editorial="${PLAN[id].profile}"]`);
    const all = names + zipText(z, /\.(json|php|tpl|html|txt|csv|xml)$/);
    expect(all).toContain(`es-editorial-${PLAN[id].profile}`);
    expect(all).not.toMatch(/\/home\/user|\/tmp\/ecs-/);
  });
});
