/**
 * Adaptateur PrestaShop 8.1 (CMS Engine V2) : thème enfant du thème « Classic » + module compagnon « esstudio »
 * embarqué (dependencies/modules, installé à l'activation du thème).
 *
 * Choix d'architecture (justifié) : un thème PrestaShop ne peut pas exécuter de PHP ; les sections du site sont donc
 * RENDUES PAR LE STUDIO (même moteur que l'aperçu et que Shopify) puis converties en gabarits Smarty, avec les parties
 * dynamiques branchées sur PrestaShop (adresses, compteur du panier, jeton des formulaires). Le module donne aux pages
 * du site leurs adresses (/pages/…), relie les liens produits et collections aux pages natives et traite les
 * formulaires. Fiche produit, catégories, panier et commande : ceux de PrestaShop, habillés au design du site.
 */
import fs from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import { compileTheme, themeAssetBinary, type AssetLoader } from "../../theme/compile";
import { renderPage } from "../../theme/render";
import { cloneSpec, themeLang, type ThemeSpec } from "../../theme/spec";
import { pick } from "../../i18n";
import { designLayer } from "../design";
import type { ExportIssue, PlatformExport } from "../types";

const ROOT = process.cwd();
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "") || "site";

/** Zones d'une page rendue par le studio : en-tête, contenu principal, pied de page (sans le tiroir panier Shopify). */
export function pageZones(html: string) {
  const body = html.slice(html.indexOf("<body"));
  const skip = body.indexOf("</a>", body.indexOf("skip-link"));
  const mainOpen = body.indexOf("<main");
  const mainStart = body.indexOf(">", mainOpen) + 1;
  const mainEnd = body.indexOf("</main>");
  let footEnd = body.indexOf('<div id="shopify-section-cart-drawer"');
  if (footEnd < 0) footEnd = body.indexOf('<div class="es-fab"');
  if (footEnd < 0) footEnd = body.indexOf("<script", mainEnd);
  const fabStart = body.indexOf('<div class="es-fab"');
  const fabEnd = fabStart >= 0 ? body.indexOf('<div class="es-toast"', fabStart) : -1;
  return {
    header: body.slice(skip >= 0 ? skip + 4 : body.indexOf(">") + 1, mainOpen).trim(),
    main: body.slice(mainStart, mainEnd).trim(),
    footer: (body.slice(mainEnd + 7, footEnd > mainEnd ? footEnd : undefined) + (fabStart >= 0 && fabEnd > fabStart ? body.slice(fabStart, fabEnd) : "")).trim(),
  };
}

/** Sections de premier niveau d'une zone (chaque section garde son enveloppe). */
export function topSections(main: string): { type: string; html: string }[] {
  return main
    .split(/(?=<div id="shopify-section-)/)
    .filter((c) => c.startsWith('<div id="shopify-section-'))
    .map((c) => ({ type: (c.match(/data-es-type="([^"]+)"/) ?? [])[1] ?? "", html: c.trim() }));
}

/**
 * HTML rendu → gabarit Smarty : texte protégé ({literal}), parties dynamiques de PrestaShop insérées entre les blocs
 * protégés. Les adresses de la boutique (/pages/…, /products/…) restent valides grâce aux routes du module.
 */
export function toSmarty(html: string, themeName = ""): string {
  const dyn = (expr: string) => `{/literal}${expr}{literal}`;
  let s = html;
  // Liens et formulaires.
  s = s.replace(/\b(href|action)="\/(?!\/)([^"]*)"/g, (_m, attr: string, rest: string) => {
    const p = `/${rest}`;
    const route = p.replace(/[?#].*$/, "").replace(/\/+$/, "") || "/";
    const tail = p.slice(route === "/" ? 1 : route.length);
    if (attr === "action") return `action="${dyn("{$link->getModuleLink('esstudio','form')}")}"`;
    if (route === "/") return `href="${dyn("{$urls.base_url}")}${tail.replace(/^\//, "")}"`;
    if (route === "/cart") return `href="${dyn("{$urls.pages.cart}")}"`;
    if (route === "/search") return `href="${dyn("{$urls.pages.search}")}"`;
    if (route.startsWith("/account")) return `href="${dyn("{$urls.pages.my_account}")}"`;
    return `href="${dyn("{$urls.base_url}")}${route.slice(1)}${tail}"`;
  });
  // Formulaires : jeton anti-falsification et page de retour.
  s = s.replace(/(<input type="hidden" name="form_type" value="[^"]*"[^>]*>)/g, (m) => `${m}<input type="hidden" name="token" value="${dyn("{$static_token}")}"><input type="hidden" name="back" value="${dyn("{$urls.current_url|escape:'html':'UTF-8'}")}">`);
  // Médias du thème.
  // (Dans un thème enfant, « theme_assets » désigne le thème parent : chemin explicite du thème.)
  s = s.replace(/\b(src|srcset|poster)="\/assets\/([^"]+)"/g, (_m, attr: string, f: string) => `${attr}="${dyn("{$urls.base_url}")}themes/${themeName}/assets/es/${f}"`);
  // Moyens de paiement : affichés par Shopify selon la boutique ; ici aucun n'est configuré → liste vide (jamais d'icône inventée).
  s = s.replace(/(<ul class="es-footer__payment"[^>]*>)[\s\S]*?(<\/ul>)/g, "$1$2");
  // Compteur du panier de l'en-tête.
  s = s.replace(/<span class="es-cart-count" data-cart-count( hidden)?>\d*<\/span>/g, () => `<span class="es-cart-count" data-cart-count${dyn("{if $cart.products_count == 0} hidden{/if}")}>${dyn("{$cart.products_count}")}</span>`);
  return `{literal}${s}{/literal}`.replace(/\{literal\}\{\/literal\}/g, "");
}

export async function exportPrestaShop(spec0: ThemeSpec, load: AssetLoader): Promise<PlatformExport> {
  const lang = themeLang(spec0);
  const t = (fr: string, en: string) => pick(lang, fr, en);
  // Panier de PrestaShop (pas de tiroir Shopify) ; le reste du design est identique.
  const spec = cloneSpec(spec0);
  spec.settings = { ...spec.settings, cart_type: "page" };
  const files = compileTheme(spec);
  const design = await designLayer(spec, files);
  const services = spec.store.business === "services";
  const name = `es${slug(spec.store.shopName)}`.slice(0, 30);
  const issues: ExportIssue[] = [];
  const out: Record<string, Uint8Array> = {};
  const put = (p: string, data: string | Uint8Array | Buffer) => (out[p] = typeof data === "string" ? strToU8(data) : new Uint8Array(data));
  const render = async (p: string) => (await renderPage({ spec, base: "", files, cart: [] }, p, new URLSearchParams())).html;

  // ------------------------------------------------------------ accueil, en-tête, pied de page (rendus du studio)
  const home = pageZones(await render("/"));
  if (!home.main) issues.push({ code: "empty_home", severity: "blocking", detail: "accueil vide" });
  put("templates/es/header.tpl", toSmarty(home.header, name));
  put("templates/es/footer.tpl", toSmarty(home.footer, name));
  put("templates/es/home.tpl", toSmarty(home.main, name));
  const sections = new Set(topSections(home.main).map((x) => x.type));

  // ------------------------------------------------------------ pages du site (module : /pages/<adresse>)
  const mod = "dependencies/modules/esstudio";
  const pages: { handle: string; title: string }[] = [];
  for (const p of spec.store.pages) {
    const r = await renderPage({ spec, base: "", files, cart: [] }, `/pages/${p.handle}`, new URLSearchParams());
    if (r.status !== 200) {
      issues.push({ code: "missing_page", severity: "blocking", detail: `page « ${p.title} » : rendu ${r.status}` });
      continue;
    }
    const z = pageZones(r.html);
    for (const x of topSections(z.main)) sections.add(x.type);
    put(`${mod}/views/templates/pages/${p.handle}.tpl`, toSmarty(z.main, name));
    pages.push({ handle: p.handle, title: p.title });
  }
  const policies: { handle: string; title: string }[] = [];
  for (const p of spec.store.policies ?? []) {
    const r = await renderPage({ spec, base: "", files, cart: [] }, `/policies/${p.handle}`, new URLSearchParams());
    if (r.status !== 200) continue;
    put(`${mod}/views/templates/pages/${p.handle}.tpl`, toSmarty(pageZones(r.html).main, name));
    policies.push({ handle: p.handle, title: p.title });
  }
  // Sections propres à la fiche produit (caractéristiques, questions) : ajoutées sous la fiche native.
  if (!services && spec.templates.product) {
    const pz = pageZones(await render(`/products/${spec.store.product.handle}`));
    const v2 = topSections(pz.main).filter((x) => x.type.startsWith("v2-"));
    if (v2.length) put(`${mod}/views/templates/hook/product.tpl`, toSmarty(v2.map((x) => x.html).join("\n"), name));
  }

  // ------------------------------------------------------------ module compagnon
  const modDir = path.join(ROOT, "assets/cms/prestashop/esstudio");
  const walk = (dir: string, rel: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}/${e.name}`);
      else put(`${mod}${rel}/${e.name}`, fs.readFileSync(path.join(dir, e.name)));
    }
  };
  walk(modDir, "");
  put(`${mod}/site.json`, JSON.stringify({ shopName: spec.store.shopName, lang, business: services ? "services" : "products", pages, policies, product: services ? null : { handle: spec.store.product.handle } }, null, 1));

  // ------------------------------------------------------------ thème enfant
  const layoutSrc = fs.readFileSync(path.join(ROOT, "assets/cms/prestashop/theme/templates/layouts/layout-full-width.tpl"), "utf8")
    .replace("{$es_ds|default:'none'}", design.body.ds)
    .replace("{$es_density|default:'balanced'}", design.body.density)
    .replace("{$es_body_classes|default:''}", design.body.classes.join(" "));
  put("templates/layouts/layout-full-width.tpl", layoutSrc);
  for (const l of ["layout-left-column", "layout-right-column", "layout-both-columns"]) put(`templates/layouts/${l}.tpl`, `{** E-COM STUDIO IA : même mise en page que le reste du site. *}\n{extends file='layouts/layout-full-width.tpl'}\n`);
  put("templates/index.tpl", fs.readFileSync(path.join(ROOT, "assets/cms/prestashop/theme/templates/index.tpl")));
  const css: { id: string; path: string }[] = [];
  for (const sheet of design.stylesheets) {
    const src = files.get(`assets/${sheet}`);
    if (!src) {
      issues.push({ code: "missing_stylesheet", severity: "blocking", detail: `feuille ${sheet} absente` });
      continue;
    }
    // Préfixe « es- » : un fichier de même chemin qu'un fichier de Classic le remplacerait (Classic perdrait ses styles).
    put(`assets/css/es-${sheet}`, src);
    css.push({ id: `es-${sheet.replace(/\.css$/, "")}`, path: `assets/css/es-${sheet}` });
  }
  put("assets/css/es-design.css", `/* ${spec.store.shopName.replace(/\*\//g, "")} — design extrait du studio (E-COM STUDIO IA) */\n${design.css}\n`);
  put("assets/css/es-ps.css", fs.readFileSync(path.join(ROOT, "assets/cms/prestashop/theme/assets/es-ps.css")));
  css.push({ id: "es-design", path: "assets/css/es-design.css" }, { id: "es-ps", path: "assets/css/es-ps.css" });
  const js = files.get("assets/theme.js");
  if (js) put("assets/js/es-theme.js", js);
  put("assets/js/es-ps.js", fs.readFileSync(path.join(ROOT, "assets/cms/prestashop/theme/assets/es-ps.js")));
  for (const f of design.fonts) {
    const p = path.join(ROOT, "assets/fonts", f);
    if (fs.existsSync(p)) put(`assets/fonts/${f}`, fs.readFileSync(p));
  }
  const media: string[] = [];
  for (const f of Object.keys(spec.files)) {
    const bin = await themeAssetBinary(spec, f, load);
    if (!bin) {
      issues.push({ code: "missing_media", severity: "warning", detail: `média ${f} introuvable dans la bibliothèque` });
      continue;
    }
    put(`assets/es/${f}`, bin.data);
    media.push(f);
  }
  const yml = (v: string) => JSON.stringify(v);
  put("config/theme.yml", `parent: classic
name: ${name}
display_name: ${yml(spec.store.shopName)}
version: 1.0.0
author:
  name: "E-COM STUDIO IA"
meta:
  compatibility:
    from: 8.0.0
    to: ~
  available_layouts:
    layout-full-width:
      name: ${yml(t("Site E-COM STUDIO", "E-COM STUDIO site"))}
      description: ${yml(t("En-tête, pied de page et design du site conçu dans le studio", "Header, footer and design of the site designed in the studio"))}
assets:
  use_parent_assets: true
  css:
    all:
${css.map((c, i) => `      - id: ${c.id}\n        path: ${c.path}\n        media: all\n        priority: ${900 + i * 10}`).join("\n")}
  js:
    all:
      - id: es-theme-js
        path: assets/js/es-theme.js
        priority: 900
        attribute: defer
      - id: es-ps-js
        path: assets/js/es-ps.js
        priority: 910
${fs.readFileSync(path.join(ROOT, "assets/cms/prestashop/theme/global_settings.yml"), "utf8")}
theme_settings:
  default_layout: layout-full-width
  layouts:
    category: layout-full-width
    best-sales: layout-full-width
    new-products: layout-full-width
    prices-drop: layout-full-width
    contact: layout-full-width
`);
  put(t("LISEZMOI.txt", "README.txt"), [
    t(`${spec.store.shopName} — thème PrestaShop généré par E-COM STUDIO IA`, `${spec.store.shopName} — PrestaShop theme generated by E-COM STUDIO IA`),
    "",
    t("1. Apparence › Thème et logo › Ajouter un nouveau thème : importez ce ZIP, puis « Utiliser ce thème ». Le module « E-COM STUDIO IA » s'installe avec le thème.", "1. Design › Theme & Logo › Add new theme: import this ZIP, then « Use this theme ». The « E-COM STUDIO IA » module is installed with the theme."),
    t("2. Paramètres de la boutique › Trafic et SEO : activez les URL simplifiées (adresses /pages/… du site).", "2. Shop Parameters › Traffic & SEO: enable friendly URLs (site addresses /pages/…)."),
    ...(services ? [] : [t(`3. Catalogue › Produits : créez vos produits ; donnez au produit principal l'adresse simplifiée « ${spec.store.product.handle} » pour que les liens du site y mènent.`, `3. Catalog › Products: create your products; give the main product the friendly URL « ${spec.store.product.handle} » so the site's links lead to it.`)]),
    t("4. Paiement et livraison : à configurer dans PrestaShop ; le thème ne gère aucun paiement.", "4. Payment and shipping: set them up in PrestaShop; the theme handles no payment."),
    t("5. Messages des formulaires du site : Modules › E-COM STUDIO IA › Configurer.", "5. Messages from the site's forms: Modules › E-COM STUDIO IA › Configure."),
    t("Les textes des sections viennent du studio : modifiez-les dans E-COM STUDIO IA puis importez le nouveau thème.", "Section texts come from the studio: edit them in E-COM STUDIO IA, then import the new theme."),
    "",
  ].join("\n"));
  const shot = media.find((f) => /hero|scene|packshot|detoure/.test(f));
  if (shot) {
    const sharp = (await import("sharp")).default;
    const bin = await themeAssetBinary(spec, shot, load);
    if (bin) put("preview.png", await sharp(bin.data).resize(800, 600, { fit: "contain", background: "#ffffff" }).png().toBuffer());
  }
  return {
    platform: "prestashop",
    zip: Buffer.from(zipSync(out, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") })),
    name: `${name}-prestashop.zip`,
    kind: "theme",
    files: Object.keys(out),
    issues,
    sections: [...sections].filter(Boolean),
    media,
  };
}
