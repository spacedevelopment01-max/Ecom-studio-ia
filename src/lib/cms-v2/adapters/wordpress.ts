/**
 * Adaptateur WordPress / WooCommerce (CMS Engine V2) : thème de blocs installable (Apparence › Thèmes › Téléverser).
 *
 * Architecture (un seul choix, justifié) : thème de BLOCS. Chaque section du site devient un bloc dynamique
 * « Section E-COM STUDIO » dont les réglages sont des attributs (modifiables dans Apparence › Éditeur) et dont le rendu
 * utilise les MÊMES gabarits Liquid que Shopify et l'aperçu du studio (moteur PHP inclus). Le design (variables,
 * typographies, langage visuel, animations) vient des mêmes feuilles que le thème Shopify. Fiche produit, boutique,
 * panier et commande sont les blocs natifs de WooCommerce, habillés aux couleurs du site (aucun faux panier).
 */
import fs from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import { compileTheme, themeAssetBinary, type AssetLoader } from "../../theme/compile";
import { themeLang, type SectionInstance, type ThemeSpec } from "../../theme/spec";
import { pick } from "../../i18n";
import { wooProductsCsv } from "../../theme/catalog-export";
import { designLayer } from "../design";
import { flatStrings, normalizedSection, phpTemplates, sectionSchemaOf, themeSettings, type SectionSchema } from "../liquid";
import type { ExportIssue, PlatformExport } from "../types";

const ROOT = process.cwd();
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
/** Texte placé dans un commentaire PHP ou CSS : la fin de commentaire ne doit jamais pouvoir s'y glisser. */
const commentSafe = (s: unknown) => String(s ?? "").replace(/\*\//g, "* /").replace(/\?>/g, "? >").replace(/[\r\n]+/g, " ");

/** Attributs d'un bloc sérialisés comme le fait WordPress (aucune séquence pouvant fermer le commentaire). */
export function blockAttrs(attrs: Record<string, unknown>): string {
  return JSON.stringify(attrs)
    .replace(/--/g, "\\u002d\\u002d")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\\"/g, "\\u0022");
}

function sectionBlock(id: string, s: SectionInstance, schema: SectionSchema | null, onlyFor = ""): string {
  const n = normalizedSection(id, s, schema);
  const attrs: Record<string, unknown> = { type: s.type, sectionId: id, settings: n.settings, blocks: n.blocks.map((b) => ({ type: b.type, settings: b.settings })) };
  if (onlyFor) attrs.onlyFor = onlyFor;
  return `<!-- wp:es/section ${blockAttrs(attrs)} /-->`;
}

const part = (slugName: string) => `<!-- wp:template-part {"slug":"${slugName}","tagName":"div"} /-->`;
const main = (inner: string, cls = "es-main") => `<!-- wp:group {"tagName":"main","className":"${cls}","layout":{"type":"default"}} -->\n<main class="wp-block-group ${cls}" id="MainContent">${inner}</main>\n<!-- /wp:group -->`;
const page = (inner: string, cls = "es-main") => `${part("header")}\n${main(inner, cls)}\n${part("footer")}\n`;

export async function exportWordPress(spec: ThemeSpec, load: AssetLoader): Promise<PlatformExport> {
  const lang = themeLang(spec);
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const files = compileTheme(spec);
  const design = await designLayer(spec, files);
  const services = spec.store.business === "services";
  const themeSlug = `es-${slug(spec.store.shopName)}`;
  const issues: ExportIssue[] = [];
  const out: Record<string, Uint8Array> = {};
  const put = (p: string, data: string | Uint8Array | Buffer) => (out[p] = typeof data === "string" ? strToU8(data) : new Uint8Array(data));

  // ------------------------------------------------------------ sections exportées (gabarits utilisés)
  const used = new Set<string>();
  const schemas: Record<string, SectionSchema & { class?: string; hidden?: boolean }> = {};
  const schemaOf = (type: string) => {
    const src = files.get(`sections/${type}.liquid`);
    if (!src) return null;
    if (!schemas[type]) {
      const sc = sectionSchemaOf(src);
      if (!sc) return null;
      const cls = (src.match(/"class"\s*:\s*"([^"]+)"/) ?? [])[1];
      schemas[type] = { ...sc, ...(cls ? { class: cls } : {}), ...(type === "header" || type === "footer" ? { hidden: true } : {}) };
    }
    used.add(type);
    return schemas[type];
  };
  const render = (container: { order: string[]; sections: Record<string, SectionInstance> }, where: string, keep: (s: SectionInstance) => boolean = () => true, onlyFor = "") =>
    container.order
      .filter((id) => container.sections[id] && !container.sections[id].disabled && keep(container.sections[id]))
      .map((id) => {
        const s = container.sections[id];
        const schema = schemaOf(s.type);
        if (!schema) {
          issues.push({ code: "section_not_exported", severity: "blocking", detail: `${where} : section « ${s.type} » sans gabarit exportable` });
          return "";
        }
        return sectionBlock(id, s, schema, onlyFor);
      })
      .filter(Boolean)
      .join("\n");

  // Toutes les sections V2 restent proposées dans l'éditeur, même celles que la page d'accueil n'utilise pas.
  for (const f of files.keys()) {
    const m = f.match(/^sections\/(v2-[a-z0-9-]+)\.liquid$/);
    if (m) schemaOf(m[1]);
  }

  put("parts/header.html", render(spec.groups.header, "en-tête"));
  put("parts/footer.html", render(spec.groups.footer, "pied de page"));
  put("templates/front-page.html", page(render(spec.templates.index, "accueil")));
  const pages = spec.store.pages.map((p) => ({ handle: p.handle, title: p.title, body_html: p.template_suffix ? "" : p.body_html, template: p.template_suffix ? `page.${p.template_suffix}` : "page" }));
  for (const p of pages) {
    if (p.template === "page") continue;
    const tpl = spec.templates[p.template];
    if (!tpl) {
      issues.push({ code: "missing_page", severity: "blocking", detail: `page « ${p.title} » : gabarit ${p.template} absent` });
      continue;
    }
    put(`templates/page-${p.handle}.html`, page(render(tpl, `page ${p.title}`)));
  }
  const simple = `<!-- wp:group {"className":"es-page","layout":{"type":"default"}} -->\n<div class="wp-block-group es-page"><!-- wp:post-title {"level":1} /--><!-- wp:post-content {"layout":{"type":"default"}} /--></div>\n<!-- /wp:group -->`;
  put("templates/page.html", page(simple));
  put("templates/single.html", page(simple));
  put("templates/index.html", page(`<!-- wp:group {"className":"es-page","layout":{"type":"default"}} -->\n<div class="wp-block-group es-page"><!-- wp:query-title {"type":"archive"} /--><!-- wp:query {"queryId":1,"query":{"inherit":true}} --><div class="wp-block-query"><!-- wp:post-template --><!-- wp:post-title {"isLink":true,"level":2} /--><!-- wp:post-excerpt /--><!-- /wp:post-template --><!-- wp:query-pagination /--></div><!-- /wp:query --></div>\n<!-- /wp:group -->`));
  put("templates/404.html", page(`<!-- wp:group {"className":"es-page","layout":{"type":"default"}} -->\n<div class="wp-block-group es-page"><!-- wp:heading {"level":1} -->\n<h1 class="wp-block-heading">${t("Cette page est introuvable.", "This page could not be found.")}</h1>\n<!-- /wp:heading --><!-- wp:search {"label":"${t("Rechercher", "Search")}","buttonText":"${t("Rechercher", "Search")}"} /--></div>\n<!-- /wp:group -->`));

  if (!services) {
    // Fiche produit : blocs natifs de WooCommerce (prix, déclinaisons, stock, ajout au panier réels) + sections V2
    // propres au produit (caractéristiques, questions) affichées sur sa fiche seulement.
    const extra = spec.templates.product ? render(spec.templates.product, "fiche produit", (s) => s.type.startsWith("v2-"), spec.store.product.handle) : "";
    put("templates/single-product.html", page(`<!-- wp:group {"className":"es-wc","layout":{"type":"default"}} -->\n<div class="wp-block-group es-wc"><!-- wp:columns {"align":"wide"} -->\n<div class="wp-block-columns alignwide"><!-- wp:column {"width":"55%"} -->\n<div class="wp-block-column" style="flex-basis:55%"><!-- wp:woocommerce/product-image-gallery /--></div>\n<!-- /wp:column --><!-- wp:column -->\n<div class="wp-block-column"><!-- wp:post-title {"level":1,"__woocommerceNamespace":"woocommerce/product-query/product-title"} /--><!-- wp:woocommerce/product-price /--><!-- wp:post-excerpt {"__woocommerceNamespace":"woocommerce/product-query/product-summary"} /--><!-- wp:woocommerce/add-to-cart-form /--><!-- wp:woocommerce/product-meta /--></div>\n<!-- /wp:column --></div>\n<!-- /wp:columns --><!-- wp:woocommerce/product-details {"align":"wide"} /--></div>\n<!-- /wp:group -->\n${extra}\n<!-- wp:group {"className":"es-wc","layout":{"type":"default"}} -->\n<div class="wp-block-group es-wc"><!-- wp:woocommerce/related-products {"align":"wide"} /--></div>\n<!-- /wp:group -->`, "es-main es-product"));
    put("templates/archive-product.html", page(`<!-- wp:group {"className":"es-wc","layout":{"type":"default"}} -->\n<div class="wp-block-group es-wc"><!-- wp:query-title {"type":"archive"} /--><!-- wp:woocommerce/product-collection {"query":{"perPage":12,"pages":0,"offset":0,"postType":"product","order":"asc","orderBy":"title","search":"","exclude":[],"inherit":true,"taxQuery":{},"isProductCollectionBlock":true,"woocommerceAttributes":[],"woocommerceStockStatus":["instock","outofstock","onbackorder"]},"displayLayout":{"type":"flex","columns":3}} -->\n<div class="wp-block-woocommerce-product-collection"><!-- wp:woocommerce/product-template -->\n<!-- wp:woocommerce/product-image /--><!-- wp:post-title {"textAlign":"center","level":3,"isLink":true,"__woocommerceNamespace":"woocommerce/product-collection/product-title"} /--><!-- wp:woocommerce/product-price {"isDescendentOfQueryLoop":true,"textAlign":"center"} /--><!-- wp:woocommerce/product-button {"isDescendentOfQueryLoop":true,"textAlign":"center"} /-->\n<!-- /wp:woocommerce/product-template --></div>\n<!-- /wp:woocommerce/product-collection --></div>\n<!-- /wp:group -->`));
  }

  // ------------------------------------------------------------ gabarits Liquid + moteur PHP
  for (const [p, src] of phpTemplates(files, [...used])) put(`inc/${p}`, src);
  const phpDir = path.join(ROOT, "assets/cms/php");
  const walk = (dir: string, rel: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}/${e.name}`);
      else if (e.name !== "render-cli.php") put(`inc/php${rel}/${e.name}`, fs.readFileSync(path.join(dir, e.name)));
    }
  };
  walk(phpDir, "");
  put("inc/es-theme.php", fs.readFileSync(path.join(ROOT, "assets/cms/wordpress/es-theme.php")));
  // Intégration e-commerce : seulement pour une boutique (un site vitrine ne contient aucune trace de WooCommerce).
  if (!services) {
    put("inc/es-woo.php", fs.readFileSync(path.join(ROOT, "assets/cms/wordpress/es-woo.php")));
    put("assets/css/es-woo.css", fs.readFileSync(path.join(ROOT, "assets/cms/wordpress/es-woo.css")));
  }

  // ------------------------------------------------------------ design (mêmes feuilles que Shopify)
  for (const css of design.stylesheets) {
    const src = files.get(`assets/${css}`);
    if (src) put(`assets/css/${css}`, src);
    else issues.push({ code: "missing_stylesheet", severity: "blocking", detail: `feuille ${css} absente` });
  }
  put("assets/css/es-design.css", `/* ${commentSafe(spec.store.shopName)} — design extrait du studio (E-COM STUDIO IA) */\n${design.css}\n`);
  put("assets/css/es-wp.css", fs.readFileSync(path.join(ROOT, "assets/cms/wordpress/es-wp.css")));
  const js = files.get("assets/theme.js");
  if (js) put("assets/js/theme.js", js);
  put("assets/js/es-editor.js", fs.readFileSync(path.join(ROOT, "assets/cms/wordpress/es-editor.js")));
  for (const f of design.fonts) {
    const p = path.join(ROOT, "assets/fonts", f);
    if (fs.existsSync(p)) put(`assets/fonts/${f}`, fs.readFileSync(p));
    else issues.push({ code: "missing_font", severity: "warning", detail: `police ${f} absente` });
  }

  // ------------------------------------------------------------ médias
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

  // ------------------------------------------------------------ données du site, réglages, fichiers WordPress
  const site = {
    version: "1.0.0",
    generator: "E-COM STUDIO IA — CMS Engine V2",
    shopName: spec.store.shopName,
    lang,
    business: services ? "services" : "products",
    settings: themeSettings(files, spec.settings),
    body: design.body,
    stylesheets: design.stylesheets,
    menus: spec.store.menus,
    policies: (spec.store.policies ?? []).map((p) => ({ handle: p.handle, title: p.title, body_html: p.body_html })),
    pages: pages.map((p) => ({ handle: p.handle, title: p.title, body_html: p.body_html })),
    product: services ? null : { handle: spec.store.product.handle, title: spec.store.product.title },
    schemas,
    strings: flatStrings(files, lang),
    themeStrings: { addToCart: t("Ajouter au panier", "Add to cart"), soldOut: t("Épuisé", "Sold out"), unavailable: t("Indisponible", "Unavailable"), added: t("Ajouté", "Added"), error: t("Une erreur est survenue", "Something went wrong") },
  };
  put("inc/site.json", JSON.stringify(site, null, 1));
  const s1 = (spec.settings.color_schemes as Record<string, { settings: Record<string, string> }>)["scheme-1"]?.settings ?? {};
  put("theme.json", JSON.stringify({
    $schema: "https://schemas.wp.org/wp/6.6/theme.json",
    version: 3,
    settings: {
      appearanceTools: false,
      useRootPaddingAwareAlignments: false,
      layout: { contentSize: "860px", wideSize: `${spec.settings.page_width ?? 1320}px` },
      color: { palette: [
        { slug: "base", name: t("Fond", "Background"), color: s1.background ?? "#ffffff" },
        { slug: "contrast", name: t("Texte", "Text"), color: s1.text ?? "#111111" },
        { slug: "accent", name: "Accent", color: s1.accent ?? "#111111" },
        { slug: "surface", name: "Surface", color: s1.surface ?? "#f5f5f5" },
      ] },
    },
    styles: { spacing: { blockGap: "0px", padding: { top: "0px", right: "0px", bottom: "0px", left: "0px" } }, color: { background: "var(--c-bg)", text: "var(--c-text)" }, typography: { fontFamily: "var(--font-body)" } },
    templateParts: [{ name: "header", title: t("En-tête", "Header"), area: "header" }, { name: "footer", title: t("Pied de page", "Footer"), area: "footer" }],
    customTemplates: pages.filter((p) => p.template !== "page").map((p) => ({ name: `page-${p.handle}`, title: p.title, postTypes: ["page"] })),
  }, null, 2));
  put("style.css", `/*
Theme Name: ${commentSafe(spec.store.shopName)}
Author: E-COM STUDIO IA
Description: ${commentSafe(services ? t("Site vitrine conçu dans E-COM STUDIO IA. Sections modifiables dans Apparence › Éditeur. Aucune extension requise.", "Website designed in E-COM STUDIO IA. Sections editable in Appearance › Editor. No plugin required.") : t("Boutique conçue dans E-COM STUDIO IA, compatible WooCommerce. Sections modifiables dans Apparence › Éditeur.", "Store designed in E-COM STUDIO IA, WooCommerce compatible. Sections editable in Appearance › Editor."))}
Requires at least: 6.5
Tested up to: 6.6
Requires PHP: 8.0
Version: 1.0.0
License: GNU General Public License v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: es-theme
*/
`);
  put("functions.php", `<?php\n/** ${commentSafe(spec.store.shopName)} — thème généré par E-COM STUDIO IA (CMS Engine V2). */\nrequire_once __DIR__ . '/inc/es-theme.php';\n`);
  if (!services) put("import/produits-woocommerce.csv", "﻿" + wooProductsCsv(spec));
  put(t("LISEZMOI.txt", "README.txt"), installGuide(spec, services, lang, pages));
  const shot = media.find((f) => /hero|scene|packshot|detoure/.test(f));
  if (shot) {
    const sharp = (await import("sharp")).default;
    const bin = await themeAssetBinary(spec, shot, load);
    if (bin) put("screenshot.png", await sharp(bin.data).resize(1200, 900, { fit: "contain", background: s1.background ?? "#ffffff" }).png().toBuffer());
  }

  const rooted: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(out)) rooted[`${themeSlug}/${k}`] = v;
  return {
    platform: "woocommerce",
    zip: Buffer.from(zipSync(rooted, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") })),
    name: `${themeSlug}-${services ? "wordpress" : "woocommerce"}.zip`,
    kind: "theme",
    files: Object.keys(rooted),
    issues,
    sections: [...used],
    media,
  };
}

function installGuide(spec: ThemeSpec, services: boolean, lang: "fr" | "en", pages: { handle: string; title: string; template: string }[]): string {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const lines = [
    t(`${spec.store.shopName} — thème WordPress généré par E-COM STUDIO IA`, `${spec.store.shopName} — WordPress theme generated by E-COM STUDIO IA`),
    "",
    t("Installation", "Installation"),
    t("1. Apparence › Thèmes › Ajouter › Téléverser un thème : choisissez ce fichier ZIP, puis « Activer ».", "1. Appearance › Themes › Add New › Upload Theme: choose this ZIP file, then « Activate »."),
    t("2. À l'activation, le thème crée les pages du site (si elles n'existent pas) et prérègle les menus (Apparence › Menus).", "2. On activation, the theme creates the site's pages (if missing) and pre-fills the menus (Appearance › Menus)."),
    ...(services ? [] : [
      t("3. Installez et activez WooCommerce (Extensions › Ajouter).", "3. Install and activate WooCommerce (Plugins › Add New)."),
      t("4. Produits › Importer : choisissez import/produits-woocommerce.csv (prix et déclinaisons tels que saisis dans le studio ; rien n'est inventé). Les produits arrivent en brouillon : ajoutez leurs photos (dossier assets/es du thème) si la colonne Images est vide, vérifiez-les puis publiez-les.", "4. Products › Import: choose import/produits-woocommerce.csv (prices and variants as entered in the studio; nothing is made up). Products arrive as drafts: add their photos (theme folder assets/es) if the Images column is empty, check them, then publish."),
      t("5. Réglez les paiements et la livraison dans WooCommerce › Réglages : le thème ne gère aucun paiement.", "5. Set up payments and shipping in WooCommerce › Settings: the theme handles no payment."),
    ]),
    "",
    t("Modifier le site", "Editing the site"),
    t("- Apparence › Éditeur › Modèles : chaque section est un bloc « Section E-COM STUDIO » ; ses textes, liens, images, disposition, couleurs et marges se modifient dans la barre latérale.", "- Appearance › Editor › Templates: each section is an « E-COM STUDIO Section » block; edit its text, links, images, layout, colours and spacing in the sidebar."),
    t("- Menus : Apparence › Menus. Nom du site : Réglages › Général.", "- Menus: Appearance › Menus. Site name: Settings › General."),
    t("- Messages reçus par les formulaires (contact, inscription) : Outils › Messages du site.", "- Messages from the forms (contact, sign-up): Tools › Site messages."),
    "",
    t("Pages créées (adresse → modèle)", "Pages created (address → template)"),
    ...pages.map((p) => `- /${p.handle}/ → ${p.template === "page" ? t("page simple (contenu modifiable dans l'éditeur de page)", "simple page (content editable in the page editor)") : `page-${p.handle}`}`),
    "",
    t("Remplacez chaque « [À compléter : …] » par vos informations réelles.", "Replace every « [To complete: …] » with your real information."),
  ];
  return lines.join("\n") + "\n";
}
