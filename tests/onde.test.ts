/**
 * ONDE (issue #158, décision de Thomas du 21 octobre, 12 h 58) : refonte en thème **mono-produit de la famille
 * E-commerce**. Garde-fous :
 *  - thème actif du catalogue, famille E-commerce partout (catalogue, recommandation, bibliothèque, exports) ; profil
 *    éditorial propre (« studio ») ; l'ancien profil « contrast » reste disponible pour les projets qui l'utilisent ;
 *  - composition et en-tête / pied distincts d'ORBE, HEUREN et ALCÔVE ; vraie refonte (aucune section de l'ancienne
 *    composition Pawish) ;
 *  - un seul produit (aucun autre produit ONDE inventé), ses vues, ses usages ; visuels du kit privé, jamais copiés dans le
 *    dépôt ; rien d'inventé (prix, autonomie, connectivité, avis…), champs inconnus masqués ; SEO par page ;
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
import { catalogTheme } from "@/lib/theme/theme-catalog";
import { ACTIVE_THEMES, themeKinds } from "@/lib/theme/theme-fit";
import { THEME_FAMILY, FAMILY_LIBRARY } from "@/lib/theme/section-families";
import { currentChromePreset } from "@/lib/theme/family-chrome";
import { composeShop } from "@/lib/engine/shop";
import { saveBrand, loadProject } from "@/lib/projects";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { designLayer } from "@/lib/cms-v2/design";
import { REFERENCE_THEMES } from "@/lib/project-handoff/categories";
import { demoProject } from "./demo-fixtures";
import { ONDE_MEDIA, ONDE_HANDLE, ONDE_KIT_DIR } from "./onde-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ");
const LIBRARY = new Set(FAMILY_LIBRARY.catalog.flatMap((e) => e.dispositions.map((d) => d.type)));
const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");
const ID = "onde";
const PLAN = {
  profile: "studio", fonts: { heading: "chivo_n7", body: "inter_n4" },
  home: ["fs-campaign", "featured-purchase", "ed-finishes", "ed-diptych", "cta-banner", "faq", "newsletter"],
  product: ["main-product", "ed-finishes", "ed-scene", "faq"],
  pages: ["usages", "aide"], header: "mega-columns", footer: "columns",
  /** Sections de l'ancienne composition (référence Pawish) : aucune ne revient. */
  pawish: ["cv-hero", "cv-cards", "cv-reviews", "cv-feature", "cv-guarantee", "cv-stories", "comparison-table", "stats", "marquee"],
  leak: /\bONDE\b|\bcasque\b|graphite|Repartez|salon, le train/i,
};
const KIT = fs.existsSync(path.join(ONDE_KIT_DIR, "01-hero.webp"));

describe("ONDE : thème actif de la famille E-commerce (mono-produit)", () => {
  it("catalogue, famille E-commerce partout, profil, polices", () => {
    expect(ACTIVE_THEMES).toContain(ID);
    expect(themeKinds(ID)).toEqual(["catalog"]);
    expect(THEME_FAMILY[ID]).toBe("catalog");
    expect(REFERENCE_THEMES.find((t) => t.referenceId === ID)?.categories).toEqual(["ecommerce"]);
    const t = catalogTheme(ID)!;
    expect(t.kinds).toEqual(["catalog"]);
    expect(t.settings).toMatchObject({ editorial_profile: PLAN.profile, conversion_profile: "none" });
    expect(t.fonts).toEqual(PLAN.fonts);
  });

  it("profil « studio » et titre de page de la campagne : réglages propres, profils existants intacts", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "editorial.css"), "utf8");
    for (const p of ["studio", "cadran", "arrondi", "object", "journal"]) expect(css, p).toContain(`body[data-editorial="${p}"]`);
    const conv = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "conversion.css"), "utf8");
    expect(conv).toContain('body[data-conversion="contrast"]');
    const campaign = fs.readFileSync(path.join(process.cwd(), "theme-base", "sections", "fs-campaign.liquid"), "utf8");
    expect(campaign).toContain('"id": "heading_tag"');
    expect(campaign).toContain("tag: s.heading_tag");
  });

  it("composition et en-tête / pied distincts d'ORBE, HEUREN et ALCÔVE", () => {
    const themes = ["orbe", "heuren", "alcove", ID].map((i) => catalogTheme(i)!);
    expect(new Set(themes.map((t) => t.fonts.heading)).size).toBe(4);
    // Pied de page : la maquette HEUREN du 22 octobre impose le pied « minimal sur une ligne », celui d'ORBE ; ONDE et
    // ALCÔVE gardent chacun le leur (couleurs, polices et contenus restent propres à chaque thème).
    expect(new Set(themes.map((t) => t.look.footer)).size).toBe(3);
    expect(new Set(["alcove", ID].map((i) => catalogTheme(i)!.look.footer)).size).toBe(2);
    expect(["orbe", "heuren"].map((i) => catalogTheme(i)!.look.footer)).not.toContain(catalogTheme(ID)!.look.footer);
    // En-tête : HEUREN se distingue d'ORBE par l'en-tête transparent sur la photo d'ouverture (maquette du 22 octobre).
    expect(new Set(themes.map((t) => `${t.headerSettings?.layout ?? t.look.headerLayout}/${t.headerSettings?.mega_menu ?? "none"}/${t.headerSettings?.transparent_on_home ? "transparent" : "plein"}`)).size).toBe(4);
  });

  it("visuels du kit privé jamais suivis dans le dépôt", () => {
    expect(fs.existsSync(path.join(process.cwd(), "public", "theme-assets", ID))).toBe(false);
    const ignore = fs.readFileSync(path.join(process.cwd(), ".gitignore"), "utf8");
    expect(ignore).toContain("public/demo/onde/");
  });
});

describe.skipIf(!KIT)("ONDE : démonstration E-commerce", async () => {
  const user = await createUser("onde-demo@example.invalid", "isolated-test-only", "Onde");
  const f = await fr(() => demoProject(user.id, ID));
  const { spec } = f;
  const files = compileTheme(spec);
  const types = (key: string) => spec.templates[key].order.map((sid) => spec.templates[key].sections[sid]);
  const productKey = spec.store.product.template_suffix ? `product.${spec.store.product.template_suffix}` : "product";
  const routes = ["/", "/collections/all", `/products/${ONDE_HANDLE}`, ...spec.store.pages.map((p) => `/pages/${p.handle}`)];
  const pages = new Map<string, string>();
  for (const route of routes) pages.set(route, (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html);
  const all = [...pages.values()].join("\n");

  it("composée dans son thème, sections de la bibliothèque E-commerce, aucune section de l'ancienne composition", () => {
    expect(spec.direction).toBe(ID);
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index").map((s) => s.type)).toEqual(PLAN.home);
    expect(types(productKey).map((s) => s.type)).toEqual(PLAN.product);
    for (const key of ["index", productKey]) for (const s of types(key)) {
      expect(!!s.disabled, `${key} ${s.type}`).toBe(false);
      if (s.type !== "main-product") expect(LIBRARY.has(s.type), s.type).toBe(true);
    }
    const used = Object.values(spec.templates).flatMap((t) => Object.values(t.sections).map((s) => s.type));
    for (const t of PLAN.pawish) expect(used, t).not.toContain(t);
    expect(spec.store.pages.map((p) => p.handle)).toEqual(PLAN.pages);
    expect(spec.settings.editorial_profile).toBe(PLAN.profile);
    expect(loadProject(f.pid).settings.storeKind).toBe("catalog");
  });

  it("un seul produit, sans prix ; achat indisponible ; aucun autre produit ONDE", () => {
    expect(spec.store.products ?? []).toEqual([]);
    expect(spec.store.product.handle).toBe(ONDE_HANDLE);
    expect(spec.store.product.price).toBeNull();
    expect(spec.store.collections?.[0].products).toEqual([ONDE_HANDLE]);
    const html = pages.get(`/products/${ONDE_HANDLE}`)!;
    for (const b of html.match(/<button[^>]*data-add-button[^>]*>[\s\S]*?<\/button>/g) ?? []) expect(b).toMatch(/\sdisabled[\s>]/);
  });

  it("accueil : titre de page dans la campagne, achat juste après, trois usages", () => {
    const home = pages.get("/")!;
    expect(home.match(/<h1[^>]*>[\s\S]*?<\/h1>/)![0]).toMatch(/Le même trajet chaque jour/);
    expect(types("index")[0].settings).toMatchObject({ layout: "background", heading_tag: "h1" });
    expect(Object.values(types("index")[3].blocks ?? {})).toHaveLength(3);
  });

  it("en-tête « Méga menu en colonnes » et pied « Plan du catalogue en colonnes »", () => {
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
    expect(currentChromePreset("catalog", "header", header.settings)?.id).toBe(PLAN.header);
    expect(currentChromePreset("catalog", "footer", footer.settings)?.id).toBe(PLAN.footer);
    expect(Object.values(spec.groups.header.sections).map((s) => s.type)).toEqual(["header"]);
  });

  it("médias : les 10 fichiers utilisés ; jamais la même image dans deux sections qui se suivent", () => {
    expect(f.missing).toEqual([]);
    const shown = all + JSON.stringify(spec.store.product.images);
    for (const m of ONDE_MEDIA) expect(shown, m.file).toContain(`${ID}-${m.file}`);
    for (const key of Object.keys(spec.templates)) {
      const imgs = types(key).filter((s) => !s.disabled).map((s) => new Set(JSON.stringify(s).match(/onde-\d\d-[a-z-]+\.webp/g) ?? []));
      for (let i = 1; i < imgs.length; i++) for (const file of imgs[i]) expect(imgs[i - 1].has(file), `${key} : ${file}`).toBe(false);
    }
  });

  it("SEO : un H1, titre et description uniques par page, alt partout, aperçu non indexable", () => {
    const titles = new Set<string>(), descriptions = new Set<string>();
    for (const [route, html] of pages) {
      expect(html.match(/<h1[\s>]/g)?.length, `${route} : H1`).toBe(1);
      const title = html.match(/<title>([\s\S]*?)<\/title>/)![1].trim();
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
      expect(description.length, route).toBeGreaterThan(60);
      expect(description.length, route).toBeLessThanOrEqual(160);
      titles.add(title); descriptions.add(description);
      expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
      for (const img of html.match(/<img [^>]*>/g) ?? []) expect(img, route).toMatch(/\balt="/);
    }
    expect(titles.size).toBe(pages.size);
    expect(descriptions.size).toBe(pages.size);
  });

  it("rien d'inventé ; aucun manque public ; champs inconnus conservés masqués", () => {
    for (const [route, html] of pages) {
      const text = visibleText(html);
      expect(text, route).not.toMatch(/à compléter|\[\s*À|lorem ipsum/i);
      expect(text, route).not.toMatch(/\d+\s?(h|heures|mAh|g|grammes|dB|Hz)\b|bluetooth|réduction de bruit active|autonomie de|garantie \d|livraison (offerte|gratuite)|\d+\s?€|★|avis clients?|exemple fictif|stock limité/i);
    }
    const hidden = JSON.stringify(Object.values(spec.templates).flatMap((t) => Object.values(t.sections)).flatMap((s) => [...(s.disabled ? [s] : []), ...Object.values(s.blocks ?? {}).filter((b) => b.disabled)]));
    for (const field of ["Caractéristiques techniques", "Dans la boîte", "Quelle est son autonomie ?"]) expect(hidden, field).toContain(field);
  });

  it("liens internes : chaque lien mène à une page existante", () => {
    const known = new Set(["/", "/search", "/cart", "/collections/all", ...routes]);
    for (const [route, html] of pages) for (const m of html.matchAll(/href="(\/(?:pages|products|collections)\/[^"#?]*)"/g)) expect(known.has(m[1]), `${route} → ${m[1]}`).toBe(true);
  });

  it("exports : profil « studio », produit et médias", async () => {
    const d = await fr(() => designLayer(spec));
    expect(d.body.classes).toEqual(expect.arrayContaining([`es-editorial-${PLAN.profile}`, `dir-${ID}`]));
    const shop = unzipSync(new Uint8Array((await fr(() => cmsExport("shopify", spec, libraryLoader, { projectId: f.pid }))).zip));
    expect(zipText(shop, /\.json$/)).toMatch(/"editorial_profile":\s*"studio"/);
    expect(zipText(shop, /editorial\.css$/)).toContain('body[data-editorial="studio"]');
    for (const platform of ["woocommerce", "prestashop"] as const) {
      const exp = await fr(() => cmsExport(platform, spec, libraryLoader, { projectId: f.pid }));
      expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
      const z = unzipSync(new Uint8Array(exp.zip));
      expect(zipText(z, /\.css$/)).toContain(`body.es-editorial-${PLAN.profile}`);
      expect(Object.keys(z).join("\n") + zipText(z, /\.(json|php|tpl|html|txt|csv|xml)$/)).toContain("Casque ONDE Audio");
    }
  });
});

describe("ONDE appliqué à un autre projet : identité du projet, jamais celle de la démonstration", async () => {
  const user = await createUser("onde-autre@example.invalid", "isolated-test-only", "Autre");
  it("aucune trace de la démo, ouverture et H1, dispositions du thème", async () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: ID });
    const spec = (await fr(() => composeShop(pid, ID, null, false))).spec;
    expect(spec.direction).toBe(ID);
    expect(spec.settings.editorial_profile).toBe(PLAN.profile);
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    expect(currentChromePreset("catalog", "header", header.settings)?.id).toBe(PLAN.header);
    const files = compileTheme(spec);
    const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, "/", new URLSearchParams()))).html;
    expect(visibleText(html)).not.toMatch(PLAN.leak);
    expect(html).not.toMatch(/onde-\d\d-|demo\/onde/);
    expect(html).toContain("Atelier Verre");
    expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
  });
});
