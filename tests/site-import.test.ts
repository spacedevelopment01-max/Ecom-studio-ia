import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertPublicUrl } from "@/lib/engine/import-link";
import { detectPlatform, downloadSiteImage, importSite, logoToPng } from "@/lib/engine/site-import";
import type { SiteBlock, SiteImport } from "@/lib/engine/site-types";
import { SITES_DIR, fixtureFetcher } from "./site-fixtures";

const read = (site: string, opts: Parameters<typeof importSite>[1] = {}) => importSite(`https://${site}.test/`, { fetchImpl: fixtureFetcher(site), ...opts });
const page = (s: SiteImport, p: string) => {
  const pg = s.pages.find((x) => x.path === p);
  if (!pg) throw new Error(`page ${p} absente : ${s.pages.map((x) => x.path).join(", ")}`);
  return pg;
};
const block = <K extends SiteBlock["kind"]>(blocks: SiteBlock[], kind: K) => blocks.find((b): b is Extract<SiteBlock, { kind: K }> => b.kind === kind);
const allText = (s: SiteImport) => JSON.stringify(s.pages.map((p) => p.blocks));

describe("lecture d'un site Shopify (boutique conservée)", () => {
  it("reconnaît la plateforme, le logo, le menu, les couleurs et les polices", async () => {
    const s = await read("shopify");
    expect(s.platform).toBe("shopify");
    expect(s.platformEvidence.length).toBeGreaterThan(0);
    expect(s.decision).toBe("keep");
    expect(s.business).toBe("products");
    expect(s.name).toBe("Maison Ambre");
    expect(s.language).toBe("fr");
    expect(s.logo).toMatchObject({ kind: "img", width: 120, height: 32 });
    expect(s.logo!.src).toMatch(/^https:\/\/shopify\.test\/cdn\/shop\/files\/logo-maison-ambre\.png/);
    expect(s.favicon).toMatch(/favicon\.png/);
    expect(s.nav).toEqual([
      { label: "Accueil", url: "/" },
      { label: "Boutique", url: "/collections/all" },
      { label: "Notre histoire", url: "/pages/notre-histoire" },
      { label: "FAQ", url: "/pages/faq" },
      { label: "Contact", url: "/pages/contact" },
    ]);
    // panier, compte et recherche ne sont pas des entrées du menu
    expect(s.nav.some((n) => /cart|account|search/.test(n.url))).toBe(false);
    expect(s.footerNav.map((n) => n.label)).toContain("Livraison & retours");
    expect(s.footerNav.some((n) => /shopify\.com/.test(n.url))).toBe(false);
    expect(s.palette).toMatchObject({ primary: "#A65D2B", accent: "#3F5C4A", light: "#FBF6EF", dark: "#2B2118" });
    expect(s.colorsFound).toContain("#A65D2B");
    expect(s.fonts.heading).toBe("Cormorant Garamond");
    expect(s.fonts.body).toBe("Inter");
    expect(s.contact.email).toBe("bonjour@maison-ambre.fr");
    expect(s.contact.phone).toBe("04 78 00 00 00");
    expect(s.contact.socials).toMatchObject({ instagram: "https://www.instagram.com/maisonambre", facebook: "https://www.facebook.com/maisonambre" });
  });

  it("lit les blocs de l'accueil dans l'ordre, mot pour mot", async () => {
    const s = await read("shopify");
    const home = page(s, "/");
    expect(home.type).toBe("home");
    expect(home.blocks.map((b) => b.kind)).toEqual(["hero", "products", "image-text", "features", "testimonials", "heading", "text"]);
    const hero = block(home.blocks, "hero")!;
    expect(hero.heading).toBe("La lumière douce des soirs d'hiver");
    expect(hero.text).toBe("Des bougies en cire de colza, parfumées à Grasse et coulées à la main à Lyon.");
    expect(hero.image).toMatch(/hero-atelier\.jpg/);
    expect(hero.button).toEqual({ label: "Découvrir la collection", url: "https://shopify.test/collections/all" });
    expect(block(home.blocks, "products")).toEqual({ kind: "products", heading: "Nos best-sellers", handles: ["bougie-ambre", "bougie-figue", "diffuseur-cedre"] });
    expect(block(home.blocks, "image-text")).toMatchObject({ heading: "Coulées à la main à Lyon", imageSide: "left", button: { label: "Notre histoire" } });
    const feats = block(home.blocks, "features")!;
    expect(feats.heading).toBe("Pourquoi nos bougies");
    expect(feats.items).toEqual([
      { title: "Cire végétale", text: "Une cire de colza française, sans paraffine.", image: undefined },
      { title: "Parfums de Grasse", text: "Des compositions créées avec un parfumeur grassois.", image: undefined },
      { title: "Mèche en coton", text: "Une combustion lente et propre, environ 45 heures.", image: undefined },
    ]);
    // les témoignages existent sur le site : repris tels quels, rien d'ajouté
    expect(block(home.blocks, "testimonials")!.items).toEqual([
      { quote: "« La bougie Ambre embaume tout le salon, on en est à la troisième. »", author: "Sophie, Villeurbanne" },
      { quote: "« Un cadeau qui fait toujours plaisir, et l'emballage est magnifique. »", author: "Julien" },
    ]);
  });

  it("lit les autres pages (FAQ, contact, texte riche) et respecte robots.txt", async () => {
    const s = await read("shopify");
    expect(s.pages.map((p) => p.path)).toEqual(["/", "/collections/all", "/pages/notre-histoire", "/pages/faq", "/pages/contact", "/pages/livraison", "/policies/terms-of-service"]);
    expect(page(s, "/collections/all")).toMatchObject({ type: "collection", title: "Boutique" });
    const faq = block(page(s, "/pages/faq").blocks, "faq")!;
    expect(faq.items).toHaveLength(3);
    expect(faq.items[1]).toEqual({ q: "Livrez-vous en Belgique ?", a: "Oui, en Belgique et en Suisse, sous 3 à 5 jours ouvrés." });
    expect(page(s, "/pages/contact").blocks.some((b) => b.kind === "contact")).toBe(true);
    const story = page(s, "/pages/notre-histoire");
    expect(story.type).toBe("about");
    expect(story.blocks.map((b) => b.kind)).toEqual(["heading", "text", "image", "heading", "text"]);
    expect(allText(s)).toContain("Cire de colza cultivé en France");
    expect(page(s, "/pages/livraison").type).toBe("legal");
    // page interdite par robots.txt : non lue et signalée
    expect(s.pages.some((p) => p.path === "/pages/espace-pro")).toBe(false);
    expect(s.warnings.join(" ")).toMatch(/robots\.txt.*\/pages\/espace-pro/);
  });

  it("lit les produits par /products.json (prix en centimes, variantes, prix barré)", async () => {
    const f = fixtureFetcher("shopify");
    const s = await importSite("https://shopify.test/", { fetchImpl: f });
    expect(f.log).toContain("https://shopify.test/products.json?limit=250&page=1");
    // les produits viennent de l'API : les fiches produit ne sont pas parcourues une à une
    expect(f.log.some((u) => /\/products\/bougie-ambre$/.test(u))).toBe(false);
    expect(s.products.map((p) => p.handle)).toEqual(["bougie-ambre", "bougie-figue", "diffuseur-cedre"]);
    const ambre = s.products[0];
    expect(ambre).toMatchObject({ title: "Bougie Ambre & Vanille", price: 2900, compareAtPrice: 3500, currency: "EUR", category: "Bougies", url: "https://shopify.test/products/bougie-ambre" });
    expect(ambre.description).toBe("Notes chaudes d'ambre et de vanille de Madagascar.\n\nCire de colza, mèche en coton, verre recyclé.");
    expect(ambre.images).toHaveLength(2);
    expect(ambre.variants).toEqual([
      { title: "180 g", price: 2900, options: ["180 g"] },
      { title: "320 g", price: 4500, options: ["320 g"] },
    ]);
    expect(s.products[1].variants).toBeUndefined(); // « Default Title » n'est pas une vraie variante
    expect(s.products[2].price).toBe(3990);
  });

  it("limite le nombre de pages lues et le signale ; suit la progression", async () => {
    const steps: number[] = [];
    const s = await read("shopify", { maxPages: 3, onProgress: (p) => steps.push(p) });
    expect(s.pages).toHaveLength(3);
    expect(s.warnings.join(" ")).toMatch(/limite de 3 pages/);
    expect(steps.at(-1)).toBe(1);
    expect(steps.every((p) => p >= 0 && p <= 1)).toBe(true);
  });
});

describe("lecture d'un site WooCommerce (boutique conservée)", () => {
  it("plateforme, logo, couleurs, polices, coordonnées", async () => {
    const s = await read("woocommerce");
    expect(s.platform).toBe("woocommerce");
    expect(s.platformEvidence.join(" ")).toMatch(/WooCommerce 9\.3\.3/);
    expect(s.decision).toBe("keep");
    expect(s.business).toBe("products");
    expect(s.name).toBe("Lin & Fil");
    expect(s.logo).toMatchObject({ kind: "img", src: "https://woocommerce.test/wp-content/uploads/2024/03/logo-lin-et-fil.png" });
    expect(s.nav.map((n) => n.label)).toEqual(["Accueil", "Boutique", "L’atelier", "Contact"]);
    expect(s.palette).toMatchObject({ primary: "#2F5D50", accent: "#C9A227", light: "#FAF8F3", dark: "#22262A" });
    expect(s.fonts).toMatchObject({ heading: "Lora", body: "Nunito Sans" });
    expect(s.fonts.all).toEqual(expect.arrayContaining(["Lora", "Nunito Sans"]));
    expect(s.contact).toMatchObject({ phone: "03 88 00 00 00", email: "contact@linetfil.fr", address: "8 rue des Tanneurs, 67000 Strasbourg" });
    expect(s.contact.socials.pinterest).toBe("https://www.pinterest.fr/linetfil");
  });

  it("blocs Gutenberg et produits par la Store API", async () => {
    const f = fixtureFetcher("woocommerce");
    const s = await importSite("https://woocommerce.test/", { fetchImpl: f });
    expect(f.log).toContain("https://woocommerce.test/wp-json/wc/store/v1/products?per_page=100&page=1");
    const home = page(s, "/");
    expect(home.blocks.map((b) => b.kind)).toEqual(["hero", "features", "products", "image-text"]);
    expect(block(home.blocks, "hero")).toMatchObject({ heading: "Le lin, simplement", image: "https://woocommerce.test/wp-content/uploads/2024/03/cover-lin.jpg", button: { label: "Voir la boutique" } });
    expect(block(home.blocks, "image-text")).toMatchObject({ heading: "Un atelier de quatre couturières", imageSide: "right" });
    expect(block(page(s, "/boutique").blocks, "products")!.handles).toEqual(["torchon-lin-lave", "nappe-lin-naturel", "coussin-lin-moutarde"]);
    expect(page(s, "/contact").blocks.find((b) => b.kind === "contact")).toBeTruthy();
    const nappe = s.products.find((p) => p.handle === "nappe-lin-naturel")!;
    expect(nappe).toMatchObject({ title: "Nappe en lin naturel", price: 6900, compareAtPrice: 7900, currency: "EUR", category: "Table" });
    expect(nappe.variants?.map((v) => v.title)).toEqual(["150 × 250 cm", "170 × 300 cm"]);
    expect(s.products.find((p) => p.handle === "torchon-lin-lave")).toMatchObject({ price: 1490, description: "Torchon en lin lavé, 50 × 70 cm, ourlets cousus main.\n\nLavable à 40 °C." });
  });
});

describe("lecture d'un site Wix (services, conservé)", () => {
  it("services, coordonnées structurées, contenu chargé en JavaScript signalé", async () => {
    const s = await read("wix");
    expect(s.platform).toBe("wix");
    expect(s.decision).toBe("keep");
    expect(s.business).toBe("services");
    expect(s.products).toEqual([]);
    expect(s.name).toBe("Studio Lumière");
    expect(s.logo).toMatchObject({ kind: "img", src: "https://wix.test/media/logo-studio-lumiere.png" });
    expect(s.palette).toMatchObject({ primary: "#D66B4F", accent: "#709180", light: "#FFFFFF", dark: "#26221F" });
    expect(s.fonts).toMatchObject({ heading: "Playfair Display", body: "Lato" });
    expect(s.fonts.all).toEqual(["Playfair Display", "Lato"]);
    expect(s.contact).toMatchObject({ phone: "05 56 00 00 00", email: "bonjour@studio-lumiere.fr", address: "24 cours de l'Intendance, 33000 Bordeaux, FR" });
    expect(s.contact.hours).toMatch(/^lundi, mardi, mercredi, jeudi, vendredi 07:00–21:00 ; samedi 09:00–13:00$/);
    const home = page(s, "/");
    expect(home.blocks.map((b) => b.kind)).toEqual(["hero", "features", "gallery", "cta"]);
    expect(block(home.blocks, "gallery")!.images).toHaveLength(4);
    expect(block(home.blocks, "cta")).toMatchObject({ heading: "Votre premier cours est offert", button: { label: "Réserver", url: "https://wix.test/contact" } });
    // aucun avis inventé
    expect(s.pages.some((p) => p.blocks.some((b) => b.kind === "testimonials"))).toBe(false);
    // page dont le contenu n'existe que dans les données JavaScript embarquées
    const tarifs = page(s, "/tarifs");
    expect(allText(s)).toContain("79 € par mois, sans engagement.");
    expect(tarifs.blocks.some((b) => b.kind === "text" && b.text === "18 € la séance.")).toBe(true);
    expect(s.warnings.join(" ")).toMatch(/\/tarifs.*JavaScript/);
  });
});

describe("lecture d'un site Webflow (plateforme non gérée → reproduction)", () => {
  it("boutique reproduite : produits lus dans le JSON-LD des fiches produit", async () => {
    const s = await read("webflow");
    expect(s.platform).toBe("webflow");
    expect(s.decision).toBe("reproduce");
    expect(s.business).toBe("products");
    expect(s.name).toBe("Céramiques Nord");
    expect(s.logo).toMatchObject({ kind: "img", src: "https://webflow.test/images/logo-ceramiques-nord.svg" });
    expect(s.palette).toMatchObject({ primary: "#B4532A", accent: "#26413C", light: "#F4EFE8", dark: "#1E1B18" });
    expect(s.fonts).toMatchObject({ heading: "Fraunces", body: "Work Sans", all: ["Fraunces", "Work Sans"] });
    expect(s.nav.map((n) => n.url)).toEqual(["/", "/shop", "/atelier", "/contact"]);
    const home = page(s, "/");
    expect(home.blocks.map((b) => b.kind)).toEqual(["hero", "products", "image-text", "features"]);
    expect(block(home.blocks, "image-text")).toMatchObject({ heading: "Tourné à Lille", imageSide: "right" });
    expect(s.products.map((p) => [p.handle, p.price, p.currency])).toEqual([
      ["bol-gres-sable", 2400, "EUR"],
      ["assiette-plate-nuit", 3200, "EUR"],
      ["tasse-espresso", 1800, "EUR"],
    ]);
    expect(page(s, "/product/bol-gres-sable").type).toBe("product");
    expect(page(s, "/atelier").type).toBe("about");
    // lien du pied de page cassé : signalé honnêtement
    expect(s.warnings.join(" ")).toMatch(/\/cgv \(404\)/);
  });
});

describe("lecture d'un site fait main (services → reproduction)", () => {
  it("logo SVG en ligne, fond de héros en CSS, points forts, FAQ, vidéo, coordonnées", async () => {
    const s = await read("custom");
    expect(s.platform).toBe("custom");
    expect(s.decision).toBe("reproduce");
    expect(s.business).toBe("services");
    expect(s.logo?.kind).toBe("svg-inline");
    expect(s.logo!.src).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(Buffer.from(s.logo!.src.split(",")[1], "base64").toString()).toMatch(/viewBox="0 0 64 64"/);
    expect(s.favicon).toBe("https://custom.test/favicon.ico");
    expect(s.nav).toEqual([
      { label: "Accueil", url: "/" },
      { label: "Nos services", url: "/services.html" },
      { label: "Qui sommes-nous", url: "/a-propos.html" },
      { label: "Contact", url: "/contact.html" },
    ]);
    expect(s.palette).toMatchObject({ primary: "#0B5394", accent: "#F6B26B", light: "#FDFDFB", dark: "#1C1C1C" });
    expect(s.fonts).toMatchObject({ heading: "Bitter", body: "Manrope" });
    expect(s.contact).toMatchObject({ phone: "05 61 00 00 00", email: "contact@durand-plomberie.fr", address: "17 avenue des Minimes, 31200 Toulouse, FR", socials: { facebook: "https://www.facebook.com/durandplomberie31" } });
    expect(s.contact.hours).toBe("Mo-Fr 08:00-18:00 ; Sa 09:00-12:00");
    const home = page(s, "/");
    expect(home.blocks.map((b) => b.kind)).toEqual(["hero", "features", "image-text", "cta", "faq"]);
    expect(block(home.blocks, "hero")!.image).toBe("https://custom.test/img/hero-chantier.jpg");
    expect(block(home.blocks, "features")!.items[0]).toEqual({ title: "Dépannage", text: "fuites, canalisations bouchées, chauffe-eau en panne", image: undefined });
    expect(block(home.blocks, "image-text")!.imageSide).toBe("right");
    expect(block(home.blocks, "cta")!.button).toEqual({ label: "Appelez-nous", url: "tel:+33561000000" });
    expect(block(home.blocks, "faq")!.items).toHaveLength(3); // FAQ du HTML (le JSON-LD n'ajoute pas de doublon)
    expect(block(page(s, "/services.html").blocks, "video")).toEqual({ kind: "video", src: "https://www.youtube.com/embed/abc123XYZ" });
    expect(page(s, "/contact.html").blocks.at(-1)).toEqual({ kind: "contact", heading: "Demande de devis" });
    expect(page(s, "/mentions-legales.html").type).toBe("legal");
    expect(s.pages.some((p) => p.blocks.some((b) => b.kind === "testimonials"))).toBe(false);
    expect(s.warnings).toEqual([]);
  });
});

describe("reconnaissance des plateformes", () => {
  const cases: [string, string][] = [
    ['<script src="https://assets.jimdo.com/x.js"></script><img src="https://image.jimcdn.com/a.png">', "jimdo"],
    ['<link href="https://cdn2.editmysite.com/css/sites.css" rel="stylesheet">', "weebly"],
    ['<script type="text/x-magento-init">{}</script><div data-mage-init=\'{"x":1}\'></div>', "magento"],
    ['<link href="https://cdn11.bigcommerce.com/s-abc/stencil/theme.css" rel="stylesheet">', "bigcommerce"],
    ['<script src="https://app.ecwid.com/script.js?123"></script>', "ecwid"],
    ['<meta name="generator" content="Odoo"><link href="/web/assets/1/web.assets_frontend.min.css">', "odoo"],
    ['<img src="https://img1.wsimg.com/isteam/ip/logo.png">', "godaddy"],
    ['<link href="https://static1.squarespace.com/static/x/site.css" rel="stylesheet">', "squarespace"],
    ['<meta name="generator" content="PrestaShop"><script>var prestashop = {};</script>', "prestashop"],
    ['<link rel="stylesheet" href="/wp-content/themes/twentytwentyfour/style.css"><meta name="generator" content="WordPress 6.6">', "wordpress"],
    ['<html><body><h1>Bonjour</h1></body></html>', "custom"],
  ];
  it.each(cases)("%s → %s", (html, platform) => {
    const d = detectPlatform(html);
    expect(d.platform).toBe(platform);
    expect(d.evidence.length).toBeGreaterThan(0);
  });
});

describe("images et logo", () => {
  it("télécharge une image (type vérifié sur le contenu) et décode un SVG en ligne", async () => {
    const f = fixtureFetcher("shopify");
    const png = await downloadSiteImage("https://shopify.test/cdn/shop/files/logo-maison-ambre.png", f);
    expect(png).toMatchObject({ mime: "image/png", ext: "png" });
    expect(await downloadSiteImage("https://shopify.test/pages/faq", f)).toBeNull(); // une page HTML n'est pas une image
    expect(await downloadSiteImage("https://shopify.test/introuvable.png", f)).toBeNull();
    const s = await read("custom");
    const svg = await downloadSiteImage(s.logo!.src);
    expect(svg).toMatchObject({ mime: "image/svg+xml", ext: "svg" });
  });

  it("convertit SVG, ICO et WebP en PNG transparent", async () => {
    const svg = fs.readFileSync(path.join(SITES_DIR, "webflow/images/logo-ceramiques-nord.svg"));
    const a = await sharp(await logoToPng(svg, "image/svg+xml")).metadata();
    expect(a).toMatchObject({ format: "png", hasAlpha: true });
    expect(a.width).toBeGreaterThanOrEqual(1000);
    const ico = fs.readFileSync(path.join(SITES_DIR, "custom/favicon.ico"));
    expect(await sharp(await logoToPng(ico, "image/x-icon")).metadata()).toMatchObject({ format: "png", width: 16, height: 16 });
    // ICO « BMP » 32 bits (2×2, un pixel transparent)
    const w = 2, h = 2;
    const dib = Buffer.alloc(40 + w * h * 4 + 4 * h);
    dib.writeUInt32LE(40, 0);
    dib.writeInt32LE(w, 4);
    dib.writeInt32LE(h * 2, 8);
    dib.writeUInt16LE(1, 12);
    dib.writeUInt16LE(32, 14);
    for (let i = 0; i < w * h; i++) dib.writeUInt32LE(i === 0 ? 0x00000000 : 0xff0b5394, 40 + i * 4);
    const head = Buffer.alloc(22);
    head.writeUInt16LE(1, 2);
    head.writeUInt16LE(1, 4);
    head[6] = w;
    head[7] = h;
    head.writeUInt16LE(1, 10);
    head.writeUInt16LE(32, 12);
    head.writeUInt32LE(dib.length, 14);
    head.writeUInt32LE(22, 18);
    const bmp = await logoToPng(Buffer.concat([head, dib]), "image/x-icon");
    const { data, info } = await sharp(bmp).raw().toBuffer({ resolveWithObject: true });
    expect(info).toMatchObject({ width: 2, height: 2, channels: 4 });
    expect(data[3 + 4 * 2]).toBe(0); // premier pixel de la dernière ligne BMP = en haut à gauche après retournement → transparent
    expect([data[0], data[1], data[2], data[3]]).toEqual([0x0b, 0x53, 0x94, 0xff]);
    const webp = fs.readFileSync(path.join(SITES_DIR, "wix/media/hero-yoga.webp"));
    expect(await sharp(await logoToPng(webp, "image/webp")).metadata()).toMatchObject({ format: "png", hasAlpha: true });
  });
});

describe("sécurité", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuse une adresse privée sans le drapeau de démonstration", async () => {
    vi.stubEnv("SITE_IMPORT_ALLOW_LOCAL", "");
    await expect(importSite("http://127.0.0.1:4600/shopify/")).rejects.toThrow(/adresse privée|private address/);
    await expect(importSite("http://192.168.1.10/")).rejects.toThrow(/adresse privée|private address/);
    expect(await downloadSiteImage("http://10.0.0.5/logo.png")).toBeNull();
    await expect(importSite("file:///etc/passwd")).rejects.toThrow();
  });

  it("le drapeau n'a aucun effet en production", async () => {
    vi.stubEnv("SITE_IMPORT_ALLOW_LOCAL", "1");
    vi.stubEnv("NODE_ENV", "production");
    await expect(assertPublicUrl("http://127.0.0.1:4600/shopify/")).rejects.toThrow(/adresse privée|private address/);
  });

  it("avec le drapeau, hors production, les sites de démonstration locaux sont lisibles", async () => {
    vi.stubEnv("SITE_IMPORT_ALLOW_LOCAL", "1");
    vi.stubEnv("NODE_ENV", "test");
    await expect(assertPublicUrl("http://127.0.0.1:4600/shopify/")).resolves.toBeInstanceOf(URL);
    // les autres protections restent actives
    await expect(assertPublicUrl("ftp://127.0.0.1/")).rejects.toThrow();
    await expect(assertPublicUrl("http://user:pass@127.0.0.1/")).rejects.toThrow();
  });
});
