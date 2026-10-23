/**
 * TRAVERSE d'après le dossier approuvé par Thomas le 23 octobre (docs/design/traverse-reference-20261023).
 * Garde-fous : boutique spécialisée aux titres Anton (licence OFL) et au profil « itinéraire » refait ; démonstration aux
 * neuf photos séparées du dossier (un seul sac, aucune ancienne photo ni l'ancien logo) ; toutes les pages des maquettes ;
 * rien d'inventé (prix de démonstration, aucune promesse interdite par le dossier, gabarits légaux à compléter) ; chaque
 * composition dans la galerie « Boutique spécialisée » ; un autre projet n'hérite de rien de TRAVERSE ; exports.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { renderPage, variantId } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { validateSpec } from "@/lib/theme/ops";
import { catalogTheme } from "@/lib/theme/theme-catalog";
import { FAMILY_LIBRARY, THEME_FAMILY } from "@/lib/theme/section-families";
import { resolveLibraryType } from "@/lib/theme/family-gallery";
import { withProjectMedia } from "@/lib/theme/section-defaults";
import { currentChromePreset } from "@/lib/theme/family-chrome";
import { buildShop, composeShop } from "@/lib/engine/shop";
import { saveBrand, loadProject, currentTheme } from "@/lib/projects";
import { sectionContentContext } from "@/lib/theme/section-content";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { demoProject } from "./demo-fixtures";
import { TRAVERSE_MEDIA, TRAVERSE_HANDLE } from "./traverse-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { clientFixture } from "./mission154-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visible = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ");
const HOME = ["cv-banner", "cv-cards", "cv-feature", "cv-banner", "cv-hero", "faq", "cv-banner"];
const PAGES = ["en-route", "deux-jours-un-autre-decor", "notre-approche", "faq", "contact", "livraison-retours", "mentions-legales", "confidentialite", "cgv"];
const DOSSIER = path.join("docs", "design", "traverse-reference-20261023");
/** Promesses que le dossier interdit de publier (données non validées) et éléments jamais inventés. */
const FORBIDDEN = /livraison offerte|retours? (gratuits?|sous \d+ jours)|garantie \d|garanti \d|cabine|ordinateur 15|15 ?pouces|déperlant|étanche|imperméable|résistan|certifi|avis clients|★|\d\/5|\d+ ?% de/i;

describe("TRAVERSE : boutique spécialisée d'après les maquettes du 23 octobre", () => {
  it("famille « boutique spécialisée » ; Anton (licence OFL) et Inter ; profil « itinéraire » ; en-tête et pied propres", () => {
    const t = catalogTheme("traverse")!;
    expect(t.kinds).toEqual(["specialty"]);
    expect(THEME_FAMILY.traverse).toBe("specialty");
    expect(t.fonts).toEqual({ heading: "anton_n4", body: "inter_n4" });
    expect(fs.existsSync(path.join("assets", "fonts", "Anton-400.ttf"))).toBe(true);
    expect(fs.readFileSync(path.join("assets", "fonts", "licenses", "Anton-OFL.txt"), "utf8")).toMatch(/Anton Project Authors[\s\S]*SIL Open Font License/);
    expect(t.settings).toMatchObject({ conversion_profile: "itineraire" });
    expect(t.look).toMatchObject({ headerLayout: "nav-left", footer: "brand-left" });
  });

  it("les neuf photos du dossier, identiques octet pour octet au manifeste, suivies dans le dépôt", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(DOSSIER, "manifest.json"), "utf8")) as { path: string; sha256: string }[];
    expect(TRAVERSE_MEDIA).toHaveLength(9);
    for (const m of TRAVERSE_MEDIA) {
      const entry = manifest.find((x) => x.path === `medias/${m.file}`)!;
      expect(entry, m.file).toBeTruthy();
      const bytes = fs.readFileSync(path.join("public", "theme-assets", "traverse", m.file));
      expect(crypto.createHash("sha256").update(bytes).digest("hex"), m.file).toBe(entry.sha256);
    }
  });
});

describe("TRAVERSE : démonstration", async () => {
  const user = await createUser("traverse-demo@example.invalid", "isolated-test-only", "Traverse");
  const f = await fr(() => demoProject(user.id, "traverse"));
  const { spec } = f;
  const files = compileTheme(spec);
  const render = (route: string, cart: { variantId: number; quantity: number }[] = []) => fr(() => renderPage({ spec, base: "", files, cart }, route, new URLSearchParams()));
  const types = (key: string) => spec.templates[key].order.map((k) => spec.templates[key].sections[k]).filter((s) => !s.disabled).map((s) => s.type);

  it("accueil dans l'ordre de la maquette ; fiche, boutique et panier ; valide ; fonds blancs et accent orange", () => {
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index")).toEqual(HOME);
    const key = spec.store.product.template_suffix ? `product.${spec.store.product.template_suffix}` : "product";
    expect(types(key).slice(0, 4)).toEqual(["main-product", "cv-banner", "cv-gallery", "faq"]);
    expect(types("collection")).toEqual(["cv-banner", "main-collection"]);
    expect(types("cart")).toEqual(["main-cart", "cv-banner"]);
    const schemes = spec.settings.color_schemes as Record<string, { settings: Record<string, string> }>;
    expect(schemes["scheme-1"].settings.background.toUpperCase()).toBe("#FFFFFF");
    expect(JSON.stringify(schemes).toUpperCase()).toContain("#F2591A");
  });

  it("un seul sac : les neuf photos utilisées, aucune ancienne photo ni l'ancien logo", async () => {
    expect(f.missing).toEqual([]);
    const used = JSON.stringify(spec.templates) + JSON.stringify(spec.store.product.images);
    for (const m of TRAVERSE_MEDIA) expect(used, m.file).toContain(`traverse-${m.file}`);
    expect(used).not.toMatch(/traverse-(ambiance-\d\d|produit-0\d|logo)\.webp/);
    expect(spec.settings.logo_asset).toBe("");
    for (const route of ["/", `/products/${TRAVERSE_HANDLE}`, "/collections/all", "/cart"]) expect((await render(route)).html, route).not.toMatch(/traverse-(ambiance-\d\d|produit-0\d|logo)\.webp/);
  });

  it("toutes les pages des maquettes ; un H1 par page ; liens internes vers des pages existantes", async () => {
    expect(spec.store.pages.map((p) => p.handle).sort()).toEqual([...PAGES].sort());
    const handles = new Set(spec.store.pages.map((p) => p.handle));
    for (const route of ["/", `/products/${TRAVERSE_HANDLE}`, "/collections/all", "/cart", ...PAGES.map((h) => `/pages/${h}`)]) {
      const r = await render(route);
      expect(r.status, route).toBe(200);
      expect((r.html.match(/<h1\b/g) ?? []).length, route).toBe(1);
      expect(visible(r.html), route).not.toMatch(/\[À compléter/);
      for (const m of r.html.matchAll(/href="\/pages\/([a-z0-9-]+)(?:#[a-z0-9-]+)?"/g)) expect(handles.has(m[1]), `${route} → ${m[1]}`).toBe(true);
    }
    expect(spec.store.menus["main-menu"].links.map((l) => l.title)).toEqual(["Le sac", "En route", "Notre approche", "Aide"]);
    // Cartes du carnet : chacune descend jusqu'à son étape de l'article.
    const article = (await render("/pages/deux-jours-un-autre-decor")).html;
    for (const a of ["choisir", "preparer", "trajet"]) expect(article, a).toContain(`id="${a}"`);
  });

  it("rien d'inventé : prix de démonstration, aucune promesse interdite, gabarits légaux « À compléter »", async () => {
    expect(spec.store.product.price).toBe(12900);
    for (const route of ["/", `/products/${TRAVERSE_HANDLE}`, "/collections/all", ...PAGES.map((h) => `/pages/${h}`)]) {
      const text = visible((await render(route)).html);
      expect(text, route).not.toMatch(FORBIDDEN);
    }
    expect(visible((await render("/")).html)).toMatch(/129 €[\s\S]*Prix de démonstration/);
    expect(visible((await render(`/products/${TRAVERSE_HANDLE}`)).html)).toMatch(/PRÊT POUR VENDREDI\.[\s\S]*129 €[\s\S]*Prix de démonstration/);
    for (const h of ["mentions-legales", "confidentialite", "cgv", "livraison-retours"]) expect(visible((await render(`/pages/${h}`)).html), h).toContain("À compléter");
    for (const t of Object.values(spec.templates)) for (const s of Object.values(t.sections)) if (!s.disabled) expect(["cv-reviews", "testimonials", "fs-reviews"]).not.toContain(s.type);
  });

  it("panier : deux sacs à 129 € font 258 € ; panier vide avec son bandeau ; bandeau final masqué quand il est vide", async () => {
    const full = visible((await render("/cart", [{ variantId: variantId(0, 0), quantity: 2 }])).html);
    expect(full).toMatch(/VOTRE PANIER\./);
    expect(full).toMatch(/258 €/);
    // Prix ronds sans « ,00 » partout : page panier et tiroir (sous-total, ligne).
    expect(full).not.toMatch(/\d,00 €/);
    expect(full).toContain("Prix de démonstration");
    const empty = (await render("/cart")).html;
    expect(visible(empty)).toMatch(/VOTRE PANIER\s*EST VIDE\./);
    expect(empty).not.toContain("MÊMES HORIZONS");
  });

  it("contact : nom, e-mail et message obligatoires, « Envoyer le message » ; messages d'erreur, d'envoi, de réussite et d'échec prêts", async () => {
    const html = (await render("/pages/contact")).html;
    for (const name of ["contact[name]", "contact[email]", "contact[body]"]) expect(html, name).toContain(`name="${name}"`);
    expect(html).not.toContain('name="contact[phone]"');
    expect(html).toContain("Envoyer le message");
    for (const k of ["required", "email", "sending", "failed", "success"]) expect(html, k).toMatch(new RegExp(`data-msg-${k}="[^"]+"`));
    expect(visible(html)).not.toMatch(/Merci, nous revenons vers vous/);
    // Après un envoi réussi, le formulaire masqué disparaît vraiment (le style de grille ne l'écrase pas).
    expect(fs.readFileSync(path.join("theme-base", "assets", "theme.css"), "utf8")).toMatch(/\.es-form\[hidden\]\s*\{\s*display:\s*none/);
  });

  it("en-tête et pied de page : dispositions de la famille reconnues, propres à TRAVERSE", () => {
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
    expect(currentChromePreset("specialty", "header", header.settings)?.id).toBe("outdoor");
    expect(currentChromePreset("specialty", "footer", footer.settings)?.id).toBe("brand-left");
  });
});

describe("TRAVERSE : chaque composition dans la galerie « Boutique spécialisée »", () => {
  const lib = FAMILY_LIBRARY.specialty;
  it("20 fonctions, aucun doublon ; les dispositions des maquettes, chacune avec ses réglages", () => {
    expect(lib).toHaveLength(20);
    const ids = lib.flatMap((e) => e.dispositions.map((d) => `${e.key}~${d.id}`));
    expect(new Set(ids).size).toBe(ids.length);
    const want: [string, string, Record<string, unknown>][] = [
      ["specialty.hero~photo-band", "cv-banner", { layout: "background", band_height: "hero" }],
      ["specialty.hero~band", "cv-banner", { layout: "background", button_style: "outline" }],
      ["specialty.hero~product-card", "cv-hero", { layout: "card" }],
      ["specialty.benefits~essentials", "cv-feature", { layout: "essentials" }],
      ["specialty.details~photo-cards", "cv-cards", { layout: "overlay" }],
      ["specialty.guarantees~notes", "fs-commitments", { layout: "notes" }],
      ["specialty.contact~form-photo", "contact-form", { inline_states: true }],
      ["specialty.faq~cards", "faq", { style: "cards" }],
    ];
    for (const [id, type, settings] of want) {
      const r = resolveLibraryType(`fam:${id}`);
      expect(r.type, id).toBe(type);
      expect(r.settings, id).toMatchObject(settings);
    }
  });

  it("les essentiels ajoutés depuis la galerie reçoivent des gros plans du projet ; les cartes sur photo aussi", async () => {
    const user = await createUser("traverse-galerie@example.invalid", "isolated-test-only", "Galerie");
    const f = await fr(() => demoProject(user.id, "traverse"));
    const ess = resolveLibraryType("fam:specialty.benefits~essentials");
    const filled = withProjectMedia(f.spec, ess.type, ess.settings, ess.blocks);
    expect(filled.blocks?.filter((b) => b.type === "detail").every((b) => String(b.settings?.image_asset ?? "") !== "")).toBe(true);
    expect(filled.blocks?.filter((b) => b.type === "point").every((b) => !b.settings?.image_asset)).toBe(true);
    const cards = resolveLibraryType("fam:specialty.details~photo-cards");
    const filledCards = withProjectMedia(f.spec, cards.type, cards.settings, cards.blocks);
    expect(filledCards.blocks?.every((b) => String(b.settings?.image_asset ?? "") !== "")).toBe(true);
    // Aperçu réel de la galerie (rédaction du projet appliquée) : icônes, gros plans et photos gardés ; notes neutres.
    const ctx = sectionContentContext(loadProject(f.pid), f.spec, false, "index");
    const essCopy = withProjectMedia(f.spec, ess.type, { ...ess.settings }, ess.blocks, ctx);
    expect(essCopy.blocks?.some((b) => b.type === "pill")).toBe(false);
    expect(essCopy.blocks?.filter((b) => b.type === "detail").every((b) => String(b.settings?.image_asset ?? "") !== "")).toBe(true);
    expect(essCopy.blocks?.filter((b) => b.type === "point").every((b) => String(b.settings?.title ?? "") !== "")).toBe(true);
    const cardsCopy = withProjectMedia(f.spec, cards.type, { ...cards.settings }, cards.blocks, ctx);
    expect(cardsCopy.blocks?.length).toBeGreaterThan(1);
    expect(cardsCopy.blocks?.every((b) => String(b.settings?.image_asset ?? "") !== "")).toBe(true);
    const notes = resolveLibraryType("fam:specialty.guarantees~notes");
    const notesCopy = withProjectMedia(f.spec, notes.type, { ...notes.settings }, notes.blocks, ctx);
    expect(JSON.stringify(notesCopy)).not.toMatch(/garanti/i);
    expect(notesCopy.blocks?.map((b) => b.settings?.title)).toEqual(["Livraison", "Retours et échanges"]);
  });
});

describe("TRAVERSE appliqué à un autre projet : rien de TRAVERSE", async () => {
  const user = await createUser("traverse-autre@example.invalid", "isolated-test-only", "Autre");
  it("aucun nom, texte ni image de TRAVERSE ; couleurs et nom du projet", async () => {
    const pid = seedHoldout(user.id, 0, "Laboratoire Clair");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Laboratoire Clair", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: "traverse" });
    const built = await fr(() => composeShop(pid, "traverse", null, false));
    const spec = built.spec;
    expect(spec.direction).toBe("traverse");
    const files = compileTheme(spec);
    for (const route of ["/", `/products/${spec.store.product.handle}`, ...spec.store.pages.map((pg) => `/pages/${pg.handle}`)]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      expect(visible(html), route).not.toMatch(/TRAVERSE|FERMEZ L'ORDI|Vos essentiels|CHANGEZ DE DÉCOR|LA SUITE EST DEHORS|PRÊT POUR VENDREDI|On respire/i);
      expect(html, route).not.toMatch(/theme-assets\/traverse|traverse-(hero-gare|lac|montagne|train|paysage|produit-reference|detail-)/);
    }
    expect(JSON.stringify(spec.settings.color_schemes).toUpperCase()).not.toContain("#F2591A");
  });

  it("projet client complet : pages légales sans rubriques de livraison ; essentiels avec ses caractéristiques et ses gros plans", async () => {
    const f = await clientFixture({ brand: "Céramor" });
    await fr(() => buildShop(null, f.pid, { direction: "traverse", useAi: false }));
    const spec = currentTheme(f.pid)!.spec;
    for (const handle of ["mentions-legales", "confidentialite", "cgv"]) {
      const notes = Object.values(spec.templates[`page.${handle}`].sections).find((x) => x.type === "fs-commitments")!;
      expect(notes.disabled ?? false, handle).toBe(false);
      expect(JSON.stringify(notes.blocks), handle).not.toMatch(/Livraison|Retours/);
      expect(JSON.stringify(notes.blocks), handle).toContain("Informations à fournir");
    }
    const ess = Object.values(spec.templates.index.sections).find((x) => x.type === "cv-feature" && x.settings.layout === "essentials")!;
    expect(ess.disabled ?? false).toBe(false);
    const blocks = Object.values(ess.blocks ?? {});
    const facts = f.project.product.facts.map((x) => x.label);
    expect(blocks.filter((b) => b.type === "point").every((b) => facts.includes(String(b.settings.title)))).toBe(true);
    expect(blocks.filter((b) => b.type === "detail").every((b) => String(b.settings.image_asset ?? "") !== "")).toBe(true);
  });
});

describe("TRAVERSE : exports", async () => {
  const user = await createUser("traverse-exports@example.invalid", "isolated-test-only", "Exports");
  const demo = await fr(() => demoProject(user.id, "traverse"));
  const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");
  it("Shopify : médias, pages, sections, profil et police", async () => {
    const exp = await fr(() => cmsExport("shopify", demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const m of TRAVERSE_MEDIA) expect(names, m.file).toContain(`traverse-${m.file}`);
    const json = zipText(z, /\.json$/);
    for (const t of ["page.en-route", "page.contact", "page.cgv", "page.mentions-legales"]) expect(names, t).toContain(t);
    for (const t of HOME) expect(names + json, t).toContain(t);
    expect(json).toMatch(/"conversion_profile":\s*"itineraire"/);
    expect(zipText(z, /conversion\.css$/)).toContain('body[data-conversion="itineraire"]');
    expect(names + json).not.toMatch(/\/home\/|\/tmp\/|localhost|127\.0\.0\.1/);
  });
  for (const platform of ["woocommerce", "prestashop"] as const) it(`${platform} : export produit, médias inclus`, async () => {
    const exp = await fr(() => cmsExport(platform, demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    expect(Object.keys(z).join("\n")).toMatch(/traverse-produit-reference/);
  });
});
