/**
 * Reproduction d'un site existant (plateforme non gérée) sur la plateforme conseillée :
 * même menu, mêmes pages et textes, couleurs, polices et logo du site, rien d'inventé.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { check } from "@shopify/theme-check-node";
import { matchFont, reproduceSpec, reproductionNotes, sanitizeHtml } from "@/lib/engine/site-reproduce";
import type { SiteImport } from "@/lib/engine/site-types";
import { compileTheme } from "@/lib/theme/compile";
import { validateSpec } from "@/lib/theme/ops";
import { exportWooCommerce } from "@/lib/theme/platforms";
import { renderPage } from "@/lib/theme/render";
import { sectionSchema, storeProducts, type ThemeSpec } from "@/lib/theme/spec";
import { fakeAssets, servicesSite, shopSite } from "./site-reproduce.fixtures";

const visible = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const LOGO = { file: "es-logo-abc123.png", assetId: "logo-1" };
const build = (site: SiteImport) => reproduceSpec(site, { language: "fr", assets: fakeAssets(site), logo: LOGO });
const render = async (spec: ThemeSpec, p: string, files = compileTheme(spec)) => renderPage({ spec, base: "/p", files, cart: [] }, p, new URLSearchParams());

/** Tous les chemins de la reproduction (accueil, pages, produits). */
const paths = (spec: ThemeSpec) => ["/", ...spec.store.pages.map((p) => `/pages/${p.handle}`), ...(spec.store.business === "services" ? [] : storeProducts(spec).map((p) => `/products/${p.handle}`))];

/** Textes par défaut du thème (titres d'exemple…) : aucun ne doit apparaître dans la reproduction. */
function defaultTexts(spec: ThemeSpec, site: SiteImport): string[] {
  const own = JSON.stringify(site);
  const out = new Set<string>();
  for (const tpl of [...Object.values(spec.templates), spec.groups.header, spec.groups.footer])
    for (const id of tpl.order) {
      const s = tpl.sections[id];
      const schema = sectionSchema(spec, s.type);
      if (!schema || /^main-/.test(s.type)) continue;
      for (const d of [...schema.settings, ...schema.blocks.flatMap((b) => b.settings ?? [])])
        if (["text", "textarea", "richtext"].includes(d.type) && typeof d.default === "string" && d.default.replace(/<[^>]+>/g, "").trim().length > 6) out.add(d.default.replace(/<[^>]+>/g, "").trim());
    }
  // Un texte du site qui coïncide avec un texte d'exemple (« Questions fréquentes »…) est bien sûr permis.
  return [...out].filter((d) => !own.includes(d));
}

async function themeCheck(spec: ThemeSpec) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-repro-check-"));
  for (const [p, c] of compileTheme(spec)) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), c);
  }
  for (const f of Object.keys(spec.files)) fs.writeFileSync(path.join(dir, "assets", f), "");
  const offenses = await check(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  return offenses.filter((o) => o.severity === 0).map((o) => `${o.check} ${o.uri.split("/").slice(-2).join("/")}: ${o.message}`);
}

describe("reproduction d'une boutique (Webflow → Shopify)", () => {
  const spec = build(shopSite);

  it("thème valide, compilé, chaque page rendue", async () => {
    expect(validateSpec(spec)).toEqual([]);
    expect(spec.store.business).toBeUndefined();
    const files = compileTheme(spec);
    for (const p of [...paths(spec), "/collections/all", "/cart"]) {
      const r = await render(spec, p, files);
      expect(r.status, p).toBe(200);
    }
  });

  it("même menu (libellés, ordre) avec les adresses de la nouvelle boutique", () => {
    const links = spec.store.menus["main-menu"].links;
    expect(links.map((l) => l.title)).toEqual(shopSite.nav.map((l) => l.label));
    expect(links.map((l) => l.url)).toEqual(["/", "/collections/all", "/pages/l-atelier", "/pages/faq", "/pages/contact"]);
    expect(spec.store.menus.footer.links.map((l) => l.title)).toEqual(shopSite.footerNav.map((l) => l.label));
    expect(spec.store.menus.footer.links[2].url).toBe("https://instagram.com/atelierlumen");
  });

  it("pages du site, dans l'ordre, et textes repris mot pour mot", async () => {
    expect(spec.store.pages.map((p) => p.title)).toEqual(["L'atelier", "Questions fréquentes", "Contact", "Mentions légales"]);
    const home = visible((await render(spec, "/")).html);
    for (const s of ["La lumière, façonnée à la main", "Chaque suspension est tournée, émaillée et cuite dans notre atelier nantais.", "Voir les luminaires", "Nos pièces du moment", "Un atelier, deux mains", "Les émaux sont préparés sur place.", "Pourquoi la céramique", "Pièces uniques", "Une suspension magnifique, emballée avec un soin incroyable.", "Julie, Rennes", "Une pièce sur mesure ?", "Suspension Dune", "Lampe Galet", "Applique Lune"])
      expect(home, s).toContain(s);
    // Ordre des blocs de l'accueil.
    const order = spec.templates.index.order.map((id) => spec.templates.index.sections[id].type);
    expect(order).toEqual(["hero-fullbleed", "featured-collection", "image-with-text", "features-grid", "testimonials", "gallery-mosaic", "cta-banner"]);
    const faq = visible((await render(spec, "/pages/faq")).html);
    expect(faq).toContain("Puis-je choisir l'émail ?");
    expect(faq).toContain("Oui, pour les commandes sur mesure.");
    const about = visible((await render(spec, "/pages/l-atelier")).html);
    expect(about).toContain("Installé sur l'île de Nantes, l'atelier occupe une ancienne forge.");
  });

  it("produits du site : titres, prix, variantes, images ; HTML nettoyé", async () => {
    const all = storeProducts(spec);
    expect(all.map((p) => p.title)).toEqual(["Suspension Dune", "Lampe Galet", "Applique Lune"]);
    expect(all.map((p) => p.price)).toEqual([18900, 12500, 9900]);
    expect(all[1].compare_at_price).toBe(14500);
    expect(all[0].variants.map((v) => [v.title, v.price])).toEqual([["Sable", 18900], ["Ardoise", 19900]]);
    expect(all[0].description_html).not.toContain("script");
    expect(all[0].images).toHaveLength(1);
    expect(spec.files[all[0].images[0]]).toBeTruthy();
    expect(spec.store.collections?.map((c) => c.title)).toEqual(["Suspensions", "Lampes", "Appliques"]);
    const page = visible((await render(spec, "/products/lampe-galet")).html);
    expect(page).toContain("Lampe à poser, grès brut.");
    expect(page).toContain("125,00");
  });

  it("rien d'inventé : seul le témoignage du site, sans note, aucun texte d'exemple du thème", async () => {
    const reviews = Object.values(spec.templates.index.sections).filter((s) => s.type === "testimonials");
    expect(reviews).toHaveLength(1);
    const blocks = Object.values(reviews[0].blocks ?? {});
    expect(blocks).toHaveLength(1);
    expect(blocks[0].settings.rating).toBe("0");
    for (const p of paths(spec)) {
      const text = visible((await render(spec, p)).html);
      for (const d of defaultTexts(spec, shopSite)) expect(text, `${p} : « ${d} »`).not.toContain(d);
      expect(text).not.toMatch(/★|\b\d(,\d)?\/5\b/);
    }
    for (const page of Object.values(spec.templates))
      for (const s of Object.values(page.sections)) if (s.type === "product-reviews" || s.type === "stats" || s.type === "newsletter") throw new Error(`section ajoutée : ${s.type}`);
  });

  it("couleurs, polices et logo du site", () => {
    const sc = (spec.settings.color_schemes as Record<string, { settings: Record<string, string> }>)["scheme-1"].settings;
    expect(sc.background).toBe(shopSite.palette!.light);
    expect(sc.text).toBe(shopSite.palette!.dark);
    expect(sc.accent).toBe(shopSite.palette!.primary);
    expect((spec.settings.color_schemes as any)["scheme-4"].settings.background).toBe(shopSite.palette!.primary);
    expect(spec.settings.type_heading_font).toBe("cormorant_n6");
    expect(spec.settings.type_body_font).toBe("work_sans_n4");
    expect(spec.settings.logo_asset).toBe(LOGO.file);
    expect(spec.files[LOGO.file]).toBe(LOGO.assetId);
    expect(spec.settings.social_instagram).toBe("https://instagram.com/atelierlumen");
    expect(spec.direction).toBe("galerie");
  });

  it("Theme Check : aucune erreur", async () => {
    expect(await themeCheck(spec)).toEqual([]);
  }, 120_000);
});

describe("reproduction d'un site de services (site sur mesure → WordPress)", () => {
  const spec = build(servicesSite);

  it("thème valide, chaque page rendue, ni panier ni produit", async () => {
    expect(validateSpec(spec)).toEqual([]);
    expect(spec.store.business).toBe("services");
    expect(spec.settings.cart_type).toBe("none");
    const files = compileTheme(spec);
    for (const p of paths(spec)) {
      const r = await render(spec, p, files);
      expect(r.status, p).toBe(200);
      expect(visible(r.html), p).not.toMatch(/panier|ajouter au panier/i);
      expect(r.html).not.toMatch(/es-cart-link|data-cart-drawer|href="\/p\/products\//);
    }
  });

  it("même menu, mêmes textes, aucun avis ajouté", async () => {
    const links = spec.store.menus["main-menu"].links;
    expect(links.map((l) => l.title)).toEqual(["Accueil", "Nos services", "Réalisations", "Contact"]);
    expect(links.map((l) => l.url)).toEqual(["/", "/pages/services", "/pages/realisations", "/pages/contact"]);
    const home = visible((await render(spec, "/")).html);
    for (const s of ["Votre plombier à Lyon depuis 1998", "Demander un devis", "Fuites, débouchage, chauffe-eau.", "Jean et Paul Martin interviennent eux-mêmes sur chaque chantier.", "Intervenez-vous le week-end ?", "Un projet ? Parlons-en", "04 78 00 00 00"])
      expect(home, s).toContain(s);
    expect(Object.values(spec.templates).some((t) => Object.values(t.sections).some((s) => s.type === "testimonials"))).toBe(false);
    for (const d of defaultTexts(spec, servicesSite)) expect(home, d).not.toContain(d);
    // Page sans contenu lu : espace réservé honnête, rien d'inventé.
    const legal = visible((await render(spec, "/pages/mentions")).html);
    expect(legal).toContain("[À compléter : contenu de la page « Mentions légales »");
    const cta = Object.values(spec.templates.index.sections).find((s) => s.type === "cta-banner")!;
    expect(cta.settings.button_link).toBe("tel:+33478000000");
  });

  it("couleurs et polices du site (police la plus proche)", () => {
    const sc = (spec.settings.color_schemes as Record<string, { settings: Record<string, string> }>)["scheme-1"].settings;
    expect([sc.background, sc.text, sc.accent]).toEqual(["#FFFFFF", "#14202E", "#1F5FA8"]);
    expect(spec.settings.type_heading_font).toBe("montserrat_n7");
    expect(spec.settings.type_body_font).toBe("inter_n4");
    expect(spec.direction).toBe("clinique");
    const notes = reproductionNotes(servicesSite, { assets: fakeAssets(servicesSite), logo: LOGO });
    expect(notes.join(" ")).toMatch(/Poppins.*Montserrat/);
  });

  it("export WordPress : une page par page du site, textes repris", async () => {
    const wp = await exportWooCommerce(spec, () => null);
    expect(wp.name).toMatch(/-wordpress\.zip$/);
    const files = unzipSync(new Uint8Array(wp.zip));
    const names = Object.keys(files);
    for (const h of ["services", "realisations", "contact", "mentions"]) expect(names.some((n) => n.endsWith(`templates/page-${h}.html`)), h).toBe(true);
    const all = names.map((n) => (/\.(html|php|json|css|txt)$/.test(n) ? strFromU8(files[n]) : "")).join("\n");
    expect(all).toContain("Votre plombier à Lyon depuis 1998");
    expect(all).toContain("Nous intervenons dans tout le Grand Lyon.");
    expect(all).not.toMatch(/woocommerce\/mini-cart/);
  });

  it("Theme Check : aucune erreur", async () => {
    expect(await themeCheck(spec)).toEqual([]);
  }, 120_000);
});

describe("outils", () => {
  it("police la plus proche", () => {
    expect(matchFont("Playfair Display", "heading")).toMatchObject({ handle: "playfair_display_n6", exact: true });
    expect(matchFont("'Helvetica Neue', Arial, sans-serif", "body")).toMatchObject({ handle: "inter_n4", exact: false });
    expect(matchFont("Some Unknown Serif", "heading").handle).toBe("playfair_display_n6");
    expect(matchFont(undefined, "body").handle).toBe("inter_n4");
  });

  it("HTML du site nettoyé", () => {
    expect(sanitizeHtml('<p onclick="x()">Bon<script>evil()</script> <a href="javascript:alert(1)">lien</a> <img src=x onerror=y></p>')).toBe("<p>Bon <a>lien</a> </p>");
  });

  it("site sombre → direction sombre, contraste du texte garanti", () => {
    const dark = build({ ...servicesSite, palette: { primary: "#E0B04A", secondary: "#222222", accent: "#E0B04A", light: "#111111", dark: "#333333" } });
    expect(dark.direction).toBe("nocturne");
    const sc = (dark.settings.color_schemes as any)["scheme-1"].settings;
    expect(sc.background).toBe("#111111");
    expect(validateSpec(dark)).toEqual([]);
  });

  it("boutique sans produit lu : produit à compléter, jamais inventé", () => {
    const spec = build({ ...shopSite, products: [] });
    expect(spec.store.product.title).toMatch(/^\[À compléter/);
    expect(spec.store.product.price).toBeNull();
    expect(validateSpec(spec)).toEqual([]);
  });
});

describe("enregistrement de la reproduction (version du thème)", () => {
  it("images du site (meta.source) et logo du client repris, version enregistrée et exportable", async () => {
    const sharp = (await import("sharp")).default;
    const { createUser } = await import("@/lib/auth");
    const { id, now, run } = await import("@/lib/db");
    const { ensureFolders, saveAsset } = await import("@/lib/library");
    const { currentTheme } = await import("@/lib/projects");
    const { exportThemeZip } = await import("@/lib/theme/compile");
    const { libraryLoader } = await import("@/lib/theme/loader");
    const { buildReproducedShop } = await import("@/lib/engine/site-reproduce");
    const u = await createUser(`repro${Date.now()}@test.fr`, "motdepasse-test", "Repro");
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, status, platform, store_type, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", pid, u.id, "Atelier Lumen", "draft", "shopify", "multi", "{}", "[]", now(), now());
    ensureFolders(pid);
    const jpg = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#B4532A" } }).jpeg().toBuffer();
    const srcs = Object.keys(fakeAssets(shopSite));
    for (const [i, src] of srcs.entries()) await saveAsset({ projectId: pid, userId: u.id, data: jpg, name: `site-${i}.jpg`, mime: "image/jpeg", role: "site-image", origin: "import", meta: { source: src } });
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><text x="0" y="30">Lumen</text></svg>');
    const logo = await saveAsset({ projectId: pid, userId: u.id, data: svg, name: "logo.svg", mime: "image/svg+xml", role: "logo", origin: "import", meta: { source: shopSite.logo!.src } });
    const progress: string[] = [];
    const ctx = { progress: (_p: number, m?: string) => m && progress.push(m) } as unknown as import("@/lib/jobs").JobContext;
    const r = await buildReproducedShop(ctx, pid, shopSite);
    expect(r.number).toBe(1);
    const cur = currentTheme(pid)!;
    expect(cur.version.id).toBe(r.versionId);
    expect(cur.version.summary).toBe("Reproduction de votre site (Webflow → Shopify)");
    const spec = cur.spec;
    expect(spec.settings.logo_asset).toMatch(/\.svg$/);
    expect(spec.files[spec.settings.logo_asset as string]).toBe(logo.id);
    const hero = Object.values(spec.templates.index.sections).find((s) => s.type === "hero-fullbleed")!;
    expect(spec.files[hero.settings.image_asset as string]).toBeTruthy();
    const zip = await exportThemeZip(spec, libraryLoader);
    expect(zip.skipped).toEqual([]);
    expect(zip.files.some((f) => f === `assets/${hero.settings.image_asset}`)).toBe(true);
  });
});
