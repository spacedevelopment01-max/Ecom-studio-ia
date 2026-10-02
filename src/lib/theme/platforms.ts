/**
 * Livraisons adaptées aux autres plateformes, à partir de la même source
 * (ThemeSpec + médias + textes) :
 *  - WooCommerce : thème de blocs WordPress installable (Apparence › Thèmes › Téléverser).
 *  - PrestaShop : thème enfant installable du thème Classic (1.7 / 8).
 *  - Wix et Squarespace : ces plateformes n'acceptent pas de thème importé ;
 *    le studio fournit un kit de reprise (médias, charte, textes, CSV produit, guide).
 */
import fs from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import type { ThemeSpec, SectionInstance } from "./spec";
import { themeAssetBinary, type AssetLoader } from "./compile";
import { FONT_FILES } from "./render";

type Scheme = { background: string; surface: string; text: string; muted: string; accent: string; accent_text: string; border: string };

function schemes(spec: ThemeSpec): Record<string, Scheme> {
  const s = spec.settings.color_schemes as Record<string, { settings: Scheme }>;
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.settings]));
}
function fontFamily(handle: unknown) {
  const key = String(handle ?? "").replace(/_[ni]\d$/, "");
  return FONT_FILES[key] ?? FONT_FILES.dm_sans;
}
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const strip = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "boutique";

/** Liste ordonnée des sections de l'accueil avec leurs contenus (indépendant de la plateforme). */
function homeBlocks(spec: ThemeSpec) {
  const t = spec.templates.index;
  return t.order.map((id) => ({ id, s: t.sections[id] })).filter((x) => x.s && !x.s.disabled);
}
const blocksOf = (s: SectionInstance) => (s.block_order ?? Object.keys(s.blocks ?? {})).map((b) => s.blocks?.[b]).filter(Boolean) as { type: string; settings: Record<string, any> }[];

async function collectMedia(spec: ThemeSpec, load: AssetLoader) {
  const out: Record<string, Buffer> = {};
  for (const f of Object.keys(spec.files)) {
    const b = await themeAssetBinary(spec, f, load);
    if (b) out[f] = b.data;
  }
  return out;
}

// ---------------------------------------------------------------- WooCommerce

function wpBlocksForSection(s: SectionInstance, img: (f: string) => string): string {
  const st = s.settings as Record<string, any>;
  const h = (t: unknown, lvl = 2) => (t ? `<!-- wp:heading {"level":${lvl}} -->\n<h${lvl} class="wp-block-heading">${esc(t)}</h${lvl}>\n<!-- /wp:heading -->\n` : "");
  const p = (t: unknown) => (strip(t) ? `<!-- wp:paragraph -->\n<p>${esc(strip(t))}</p>\n<!-- /wp:paragraph -->\n` : "");
  const btn = (label: unknown, url = "/boutique/") => (label ? `<!-- wp:buttons -->\n<div class="wp-block-buttons"><!-- wp:button -->\n<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${esc(url)}">${esc(label)}</a></div>\n<!-- /wp:button --></div>\n<!-- /wp:buttons -->\n` : "");
  const image = (f: unknown) => (f ? `<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="${img(String(f))}" alt=""/></figure>\n<!-- /wp:image -->\n` : "");
  const group = (inner: string, cls = "") => `<!-- wp:group {"layout":{"type":"constrained"},"className":"es-${cls}"} -->\n<div class="wp-block-group es-${cls}">${inner}</div>\n<!-- /wp:group -->\n`;
  switch (s.type) {
    case "hero-split":
    case "hero-editorial":
    case "featured-product":
    case "image-with-text":
      return `<!-- wp:media-text {"mediaPosition":"${st.image_position === "left" || st.layout === "image-left" ? "left" : "right"}","className":"es-${s.type}"} -->\n<div class="wp-block-media-text${st.image_position === "left" || st.layout === "image-left" ? "" : " has-media-on-the-right"} is-stacked-on-mobile es-${s.type}"><figure class="wp-block-media-text__media"><img src="${img(st.image_asset ?? "")}" alt=""/></figure><div class="wp-block-media-text__content">${h(st.heading ?? [st.heading_line1, st.heading_line2].filter(Boolean).join(" ") ?? st.eyebrow, s.type.startsWith("hero") ? 1 : 2)}${p(st.text)}${btn(st.button_label)}</div></div>\n<!-- /wp:media-text -->\n`;
    case "hero-fullbleed":
    case "cta-banner":
      return `<!-- wp:cover {"url":"${img(st.image_asset ?? "")}","dimRatio":${st.overlay ?? 30},"minHeight":${s.type === "hero-fullbleed" ? 85 : 55},"minHeightUnit":"vh"} -->\n<div class="wp-block-cover" style="min-height:${s.type === "hero-fullbleed" ? 85 : 55}vh"><span aria-hidden="true" class="wp-block-cover__background has-background-dim-${Math.round((st.overlay ?? 30) / 10) * 10} has-background-dim"></span><img class="wp-block-cover__image-background" alt="" src="${img(st.image_asset ?? "")}" data-object-fit="cover"/><div class="wp-block-cover__inner-container">${h(st.heading, 1)}${p(st.text)}${btn(st.button_label)}</div></div>\n<!-- /wp:cover -->\n`;
    case "features-grid":
      return group(`${h(st.heading)}<!-- wp:columns -->\n<div class="wp-block-columns">${blocksOf(s).map((b) => `<!-- wp:column -->\n<div class="wp-block-column">${h(b.settings.title, 3)}${p(b.settings.text)}</div>\n<!-- /wp:column -->`).join("\n")}</div>\n<!-- /wp:columns -->\n`, "features");
    case "scroll-story":
      return group(`${h(st.heading)}${blocksOf(s).map((b) => `${h(b.settings.title, 3)}${p(b.settings.text)}${image(b.settings.image_asset)}`).join("")}`, "story");
    case "specs-list":
      return group(`${h(st.heading)}<!-- wp:table -->\n<figure class="wp-block-table"><table><tbody>${blocksOf(s).map((b) => `<tr><td>${esc(b.settings.label)}</td><td><strong>${esc(b.settings.value)}</strong></td></tr>`).join("")}</tbody></table></figure>\n<!-- /wp:table -->\n`, "specs");
    case "faq":
      return group(`${h(st.heading)}${blocksOf(s).map((b) => `<!-- wp:details -->\n<details class="wp-block-details"><summary>${esc(b.settings.question)}</summary><!-- wp:paragraph -->\n<p>${esc(strip(b.settings.answer))}</p>\n<!-- /wp:paragraph --></details>\n<!-- /wp:details -->`).join("\n")}`, "faq");
    case "rich-text":
      return group(blocksOf(s).map((b) => (b.type === "heading" ? h(b.settings.text) : b.type === "text" ? p(b.settings.text) : b.type === "eyebrow" ? p(b.settings.text) : b.type === "button" ? btn(b.settings.label, b.settings.link || "/boutique/") : "")).join(""), "richtext");
    case "gallery-mosaic":
    case "horizontal-gallery":
      return group(`${h(st.heading)}<!-- wp:gallery {"linkTo":"none"} -->\n<figure class="wp-block-gallery has-nested-images columns-default is-cropped">${blocksOf(s).map((b) => image(b.settings.image_asset)).join("")}</figure>\n<!-- /wp:gallery -->\n`, "gallery");
    case "marquee":
      return group(p(String(st.items ?? "").split("\n").join("  ✦  ")), "marquee");
    case "newsletter":
      return group(`${h(st.heading)}${p(st.text)}<!-- wp:paragraph -->\n<p>[Ajoutez ici le bloc d'inscription de votre extension e-mail]</p>\n<!-- /wp:paragraph -->\n`, "newsletter");
    case "video-showcase":
      return st.video_asset ? `<!-- wp:video -->\n<figure class="wp-block-video"><video autoplay loop muted playsinline src="${img(st.video_asset)}"></video></figure>\n<!-- /wp:video -->\n` : "";
    default:
      return "";
  }
}

export async function exportWooCommerce(spec: ThemeSpec, load: AssetLoader) {
  const sc = schemes(spec);
  const s1 = sc["scheme-1"], s3 = sc["scheme-3"];
  const hf = fontFamily(spec.settings.type_heading_font), bf = fontFamily(spec.settings.type_body_font);
  const themeSlug = `es-${slug(spec.store.shopName)}`;
  const media = await collectMedia(spec, load);
  const img = (f: string) => `<?php echo esc_url( get_theme_file_uri( 'assets/images/${f}' ) ); ?>`;
  const files: Record<string, Uint8Array> = {};
  const fontFace = (fam: typeof hf) =>
    Object.entries(fam.files).map(([w, f]) => ({ fontFamily: fam.family, fontWeight: w, fontStyle: "normal", src: [`file:./assets/fonts/${f}`] }));
  const theme = {
    $schema: "https://schemas.wp.org/trunk/theme.json",
    version: 3,
    settings: {
      appearanceTools: true,
      layout: { contentSize: "760px", wideSize: `${spec.settings.page_width ?? 1320}px` },
      color: {
        palette: [
          { slug: "base", name: "Fond", color: s1.background },
          { slug: "surface", name: "Surface", color: s1.surface },
          { slug: "contrast", name: "Texte", color: s1.text },
          { slug: "accent", name: "Accent", color: s1.accent },
          { slug: "accent-text", name: "Texte sur accent", color: s1.accent_text },
          { slug: "inverse", name: "Fond sombre", color: s3.background },
        ],
      },
      typography: {
        fontFamilies: [
          { slug: "heading", name: hf.family, fontFamily: `"${hf.family}", ${hf.fallback}`, fontFace: fontFace(hf) },
          { slug: "body", name: bf.family, fontFamily: `"${bf.family}", ${bf.fallback}`, fontFace: fontFace(bf) },
        ],
      },
    },
    styles: {
      color: { background: "var(--wp--preset--color--base)", text: "var(--wp--preset--color--contrast)" },
      typography: { fontFamily: "var(--wp--preset--font-family--body)", fontSize: "17px", lineHeight: "1.6" },
      elements: {
        heading: { typography: { fontFamily: "var(--wp--preset--font-family--heading)", lineHeight: "1.08", textTransform: spec.settings.heading_case === "uppercase" ? "uppercase" : "none" } },
        button: { color: { background: "var(--wp--preset--color--accent)", text: "var(--wp--preset--color--accent-text)" }, border: { radius: `${spec.settings.button_radius ?? 0}px` }, typography: { fontWeight: "600" } },
        link: { color: { text: "var(--wp--preset--color--contrast)" } },
      },
      spacing: { blockGap: "1.5rem" },
    },
    templateParts: [
      { name: "header", title: "En-tête", area: "header" },
      { name: "footer", title: "Pied de page", area: "footer" },
    ],
  };
  files["theme.json"] = strToU8(JSON.stringify(theme, null, 2));
  files["style.css"] = strToU8(`/*
Theme Name: ${spec.store.shopName}
Theme URI: https://ecom-studio-ia.local/
Author: E-COM STUDIO IA
Description: Thème de blocs généré par E-COM STUDIO IA pour ${spec.store.shopName} (direction ${spec.direction}). Compatible WooCommerce.
Requires at least: 6.5
Tested up to: 6.8
Requires PHP: 7.4
Version: 1.0.0
License: GNU General Public License v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${themeSlug}
*/
.es-features .wp-block-column, .es-specs td { padding-block: .6rem; }
.es-specs table { width: 100%; border-collapse: collapse; } .es-specs td { border-bottom: 1px solid ${s1.border}; }
.es-faq details { border-bottom: 1px solid ${s1.border}; padding: 1rem 0; } .es-faq summary { font-weight: 600; cursor: pointer; }
.es-marquee p { font-family: var(--wp--preset--font-family--heading); font-size: clamp(1.4rem, 3vw, 2.4rem); white-space: nowrap; overflow: hidden; }
.wp-block-media-text img, .wp-block-gallery img { border-radius: ${spec.settings.card_radius ?? 0}px; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`);
  files["functions.php"] = strToU8(`<?php
/** Thème ${spec.store.shopName} — généré par E-COM STUDIO IA. */
add_action( 'after_setup_theme', function () {
	add_theme_support( 'woocommerce' );
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );
	add_editor_style( 'style.css' );
} );
add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style( '${themeSlug}', get_stylesheet_uri(), array(), '1.0.0' );
} );
`);
  const home = homeBlocks(spec).map(({ s }) => wpBlocksForSection(s, img)).join("\n");
  files["patterns/accueil.php"] = strToU8(`<?php
/**
 * Title: Accueil ${spec.store.shopName}
 * Slug: ${themeSlug}/accueil
 * Categories: featured
 */
?>
${home}`);
  files["templates/front-page.html"] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->\n<!-- wp:group {"tagName":"main"} -->\n<main class="wp-block-group"><!-- wp:pattern {"slug":"${themeSlug}/accueil"} /--></main>\n<!-- /wp:group -->\n<!-- wp:template-part {"slug":"footer","area":"footer"} /-->`);
  files["templates/index.html"] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->\n<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->\n<main class="wp-block-group"><!-- wp:post-title {"level":1} /--><!-- wp:post-content /--></main>\n<!-- /wp:group -->\n<!-- wp:template-part {"slug":"footer","area":"footer"} /-->`);
  files["templates/page.html"] = files["templates/index.html"];
  files["templates/single-product.html"] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->
<!-- wp:group {"tagName":"main","layout":{"type":"constrained","wideSize":"1200px"}} -->
<main class="wp-block-group"><!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column {"width":"55%"} -->
<div class="wp-block-column" style="flex-basis:55%"><!-- wp:woocommerce/product-image-gallery /--></div>
<!-- /wp:column --><!-- wp:column -->
<div class="wp-block-column"><!-- wp:post-title {"level":1,"__woocommerceNamespace":"woocommerce/product-query/product-title"} /--><!-- wp:woocommerce/product-price /--><!-- wp:post-excerpt {"__woocommerceNamespace":"woocommerce/product-query/product-summary"} /--><!-- wp:woocommerce/add-to-cart-form /--><!-- wp:woocommerce/product-meta /--></div>
<!-- /wp:column --></div>
<!-- /wp:columns --><!-- wp:woocommerce/product-details {"align":"wide"} /--><!-- wp:woocommerce/related-products {"align":"wide"} /--></main>
<!-- /wp:group -->
<!-- wp:template-part {"slug":"footer","area":"footer"} /-->`);
  files["templates/archive-product.html"] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->\n<!-- wp:group {"tagName":"main","layout":{"type":"constrained","wideSize":"1200px"}} -->\n<main class="wp-block-group"><!-- wp:query-title {"type":"archive"} /--><!-- wp:woocommerce/product-collection {"query":{"perPage":12,"woocommerceAttributes":[],"woocommerceStockStatus":["instock","outofstock","onbackorder"],"isProductCollectionBlock":true},"displayLayout":{"type":"flex","columns":3}} /--></main>\n<!-- /wp:group -->\n<!-- wp:template-part {"slug":"footer","area":"footer"} /-->`);
  files["templates/404.html"] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->\n<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->\n<main class="wp-block-group"><!-- wp:heading {"level":1} -->\n<h1 class="wp-block-heading">Cette page s'est égarée.</h1>\n<!-- /wp:heading --><!-- wp:search {"label":"Rechercher","buttonText":"Rechercher"} /--></main>\n<!-- /wp:group -->\n<!-- wp:template-part {"slug":"footer","area":"footer"} /-->`);
  // Les parties de gabarit sont en HTML pur : le logo se règle via le bloc « Logo du site » (fichier fourni dans assets/images).
  const logo = `<!-- wp:site-logo {"width":${spec.settings.logo_width ?? 150}} /--><!-- wp:site-title /-->`;
  files["parts/header.html"] = strToU8(`<!-- wp:group {"layout":{"type":"flex","justifyContent":"space-between"},"style":{"spacing":{"padding":{"top":"1rem","bottom":"1rem","left":"1.5rem","right":"1.5rem"}}}} -->\n<div class="wp-block-group" style="padding:1rem 1.5rem">${logo}<!-- wp:navigation /--><!-- wp:woocommerce/mini-cart /--></div>\n<!-- /wp:group -->`);
  files["parts/footer.html"] = strToU8(`<!-- wp:group {"backgroundColor":"inverse","textColor":"base","layout":{"type":"constrained"},"style":{"spacing":{"padding":{"top":"4rem","bottom":"2rem"}}}} -->\n<div class="wp-block-group has-base-color has-inverse-background-color has-text-color has-background" style="padding-top:4rem;padding-bottom:2rem"><!-- wp:site-title /--><!-- wp:navigation {"overlayMenu":"never"} /--><!-- wp:paragraph {"fontSize":"small"} -->\n<p class="has-small-font-size">© ${new Date().getFullYear()} ${esc(spec.store.shopName)}</p>\n<!-- /wp:paragraph --></div>\n<!-- /wp:group -->`);
  for (const [f, data] of Object.entries(media)) files[`assets/images/${f}`] = new Uint8Array(data);
  for (const fam of [hf, bf]) for (const f of new Set(Object.values(fam.files))) files[`assets/fonts/${f}`] = new Uint8Array(fs.readFileSync(path.join(process.cwd(), "assets", "fonts", f)));
  const shot = Object.entries(media).find(([f]) => /hero|scene|banniere/.test(f));
  if (shot) {
    const sharp = (await import("sharp")).default;
    files["screenshot.png"] = new Uint8Array(await sharp(shot[1]).resize(1200, 900, { fit: "cover" }).png().toBuffer());
  }
  // Le dossier racine du ZIP porte le nom du thème (attendu par WordPress).
  const rooted: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) rooted[`${themeSlug}/${k}`] = v;
  return { zip: Buffer.from(zipSync(rooted, { level: 6 })), name: `${themeSlug}-woocommerce.zip`, kind: "theme" as const };
}

// ---------------------------------------------------------------- PrestaShop

export async function exportPrestaShop(spec: ThemeSpec, load: AssetLoader) {
  const sc = schemes(spec);
  const s1 = sc["scheme-1"], s2 = sc["scheme-2"], s3 = sc["scheme-3"];
  const hf = fontFamily(spec.settings.type_heading_font), bf = fontFamily(spec.settings.type_body_font);
  const name = `es${slug(spec.store.shopName).replace(/-/g, "")}`.slice(0, 30);
  const media = await collectMedia(spec, load);
  const files: Record<string, Uint8Array> = {};
  files["config/theme.yml"] = strToU8(`parent: classic
name: ${name}
display_name: ${spec.store.shopName}
version: 1.0.0
author:
  name: "E-COM STUDIO IA"
meta:
  compatibility:
    from: 1.7.0.0
    to: ~
  available_layouts:
    layout-full-width:
      name: Pleine largeur
      description: Sans colonne latérale
assets:
  use_parent_assets: true
  css:
    all:
      - id: es-theme
        path: assets/css/es-theme.css
        media: all
        priority: 1000
global_settings:
  configuration:
    PS_IMAGE_QUALITY: png
  image_types: []
theme_settings:
  default_layout: layout-full-width
  layouts:
    index: layout-full-width
`);
  const ff = (fam: typeof hf) => Object.entries(fam.files).map(([w, f]) => `@font-face{font-family:"${fam.family}";font-weight:${w};font-display:swap;src:url("../fonts/${f}") format("truetype")}`).join("\n");
  files["assets/css/es-theme.css"] = strToU8(`/* Thème enfant ${spec.store.shopName} — E-COM STUDIO IA */
${ff(hf)}
${ff(bf)}
:root{--es-bg:${s1.background};--es-surface:${s1.surface};--es-text:${s1.text};--es-muted:${s1.muted};--es-accent:${s1.accent};--es-accent-text:${s1.accent_text};--es-border:${s1.border};--es-dark:${s3.background}}
body,#wrapper{background:var(--es-bg);color:var(--es-text);font-family:"${bf.family}",${bf.fallback}}
h1,h2,h3,.h1,.h2,.h3,.product-title{font-family:"${hf.family}",${hf.fallback};color:var(--es-text);${spec.settings.heading_case === "uppercase" ? "text-transform:uppercase;" : "text-transform:none;"}}
.btn-primary,.btn-primary:hover{background:var(--es-accent);border-color:var(--es-accent);color:var(--es-accent-text);border-radius:${spec.settings.button_radius ?? 0}px}
a{color:var(--es-text)} #header,.header-top{background:var(--es-bg)} #footer{background:var(--es-dark);color:#fff}
.es-hero{display:grid;gap:2rem;align-items:center;padding:4rem 0}@media(min-width:992px){.es-hero{grid-template-columns:1fr 1fr}}
.es-hero img,.es-gallery img{width:100%;height:auto;border-radius:${spec.settings.card_radius ?? 0}px}
.es-section{padding:3.5rem 0}.es-surface{background:${s2.background}}
.es-features{display:grid;gap:1.5rem}@media(min-width:768px){.es-features{grid-template-columns:repeat(3,1fr)}}
.es-specs{width:100%}.es-specs td{padding:.7rem 0;border-bottom:1px solid var(--es-border)}
.es-faq details{border-bottom:1px solid var(--es-border);padding:1rem 0}.es-faq summary{font-weight:600;cursor:pointer}
.es-gallery{display:grid;gap:1rem;grid-template-columns:repeat(2,1fr)}
`);
  const img = (f: unknown) => (f ? `{$urls.theme_assets}img/${String(f)}` : "");
  const html = homeBlocks(spec)
    .map(({ s }) => {
      const st = s.settings as Record<string, any>;
      const bl = blocksOf(s);
      switch (s.type) {
        case "hero-split":
        case "hero-editorial":
        case "hero-fullbleed":
        case "image-with-text":
        case "featured-product":
          return `<section class="es-section"><div class="container es-hero"><div><h${s.type.startsWith("hero") ? 1 : 2}>${esc(st.heading ?? [st.heading_line1, st.heading_line2].filter(Boolean).join(" "))}</h${s.type.startsWith("hero") ? 1 : 2}><p>${esc(strip(st.text))}</p>${st.button_label ? `<a class="btn btn-primary" href="{$urls.pages.category|default:$urls.base_url}">${esc(st.button_label)}</a>` : ""}</div>${st.image_asset ? `<img src="${img(st.image_asset)}" alt="" loading="lazy">` : ""}</div></section>`;
        case "features-grid":
          return `<section class="es-section es-surface"><div class="container"><h2>${esc(st.heading)}</h2><div class="es-features">${bl.map((b) => `<div><h3>${esc(b.settings.title)}</h3><p>${esc(strip(b.settings.text))}</p></div>`).join("")}</div></div></section>`;
        case "scroll-story":
          return `<section class="es-section"><div class="container"><h2>${esc(st.heading)}</h2>${bl.map((b) => `<h3>${esc(b.settings.title)}</h3><p>${esc(strip(b.settings.text))}</p>`).join("")}</div></section>`;
        case "specs-list":
          return `<section class="es-section"><div class="container"><h2>${esc(st.heading)}</h2><table class="es-specs">${bl.map((b) => `<tr><td>${esc(b.settings.label)}</td><td><strong>${esc(b.settings.value)}</strong></td></tr>`).join("")}</table></div></section>`;
        case "faq":
          return `<section class="es-section es-faq"><div class="container"><h2>${esc(st.heading)}</h2>${bl.map((b) => `<details><summary>${esc(b.settings.question)}</summary><p>${esc(strip(b.settings.answer))}</p></details>`).join("")}</div></section>`;
        case "gallery-mosaic":
        case "horizontal-gallery":
          return `<section class="es-section"><div class="container"><h2>${esc(st.heading)}</h2><div class="es-gallery">${bl.map((b) => (b.settings.image_asset ? `<img src="${img(b.settings.image_asset)}" alt="" loading="lazy">` : "")).join("")}</div></div></section>`;
        case "rich-text":
          return `<section class="es-section"><div class="container text-center">${bl.map((b) => (b.type === "heading" ? `<h2>${esc(b.settings.text)}</h2>` : b.type === "text" || b.type === "eyebrow" ? `<p>${esc(strip(b.settings.text))}</p>` : "")).join("")}</div></section>`;
        default:
          return "";
      }
    })
    .join("\n");
  files["templates/index.tpl"] = strToU8(`{extends file='page.tpl'}
{block name='page_content_container'}
  <div id="es-home">
${html}
    {hook h='displayHome'}
  </div>
{/block}
`);
  for (const [f, data] of Object.entries(media)) files[`assets/img/${f}`] = new Uint8Array(data);
  for (const fam of [hf, bf]) for (const f of new Set(Object.values(fam.files))) files[`assets/fonts/${f}`] = new Uint8Array(fs.readFileSync(path.join(process.cwd(), "assets", "fonts", f)));
  const shot = Object.entries(media).find(([f]) => /hero|scene|banniere/.test(f));
  if (shot) {
    const sharp = (await import("sharp")).default;
    files["preview.png"] = new Uint8Array(await sharp(shot[1]).resize(800, 600, { fit: "cover" }).png().toBuffer());
  }
  return { zip: Buffer.from(zipSync(files, { level: 6 })), name: `${name}-prestashop-theme-enfant.zip`, kind: "theme" as const };
}

// ---------------------------------------------------------------- Wix / Squarespace (kits)

export async function exportKit(spec: ThemeSpec, load: AssetLoader, platform: "wix" | "squarespace") {
  const sc = schemes(spec);
  const hf = fontFamily(spec.settings.type_heading_font), bf = fontFamily(spec.settings.type_body_font);
  const media = await collectMedia(spec, load);
  const files: Record<string, Uint8Array> = {};
  for (const [f, data] of Object.entries(media)) files[`medias/${f}`] = new Uint8Array(data);
  for (const fam of [hf, bf]) for (const f of new Set(Object.values(fam.files))) files[`polices/${f}`] = new Uint8Array(fs.readFileSync(path.join(process.cwd(), "assets", "fonts", f)));
  const p = spec.store.product;
  const textPage = (key: string, title: string) => {
    const t = spec.templates[key];
    if (!t) return "";
    const lines: string[] = [`## ${title}`];
    for (const id of t.order) {
      const s = t.sections[id];
      if (!s || s.disabled) continue;
      const st = s.settings as Record<string, any>;
      lines.push(`\n### Section : ${s.type}`);
      for (const k of ["eyebrow", "heading", "heading_line1", "heading_line2", "text", "button_label", "caption"]) if (st[k]) lines.push(`- ${k} : ${strip(st[k])}`);
      if (st.image_asset) lines.push(`- image : medias/${st.image_asset}`);
      for (const b of blocksOf(s)) lines.push(`  - ${Object.entries(b.settings).filter(([, v]) => typeof v === "string" && v).map(([k, v]) => `${k} : ${strip(v)}`).join(" · ")}`);
    }
    return lines.join("\n");
  };
  const guide =
    platform === "wix"
      ? `1. Dans l'éditeur Wix, créez un site vierge (ou un modèle Wix Stores sobre).
2. Thème du site › Couleurs : reportez la palette ci-dessous ; Thème du site › Texte : importez les polices du dossier « polices » (Ajouter des polices › Importer).
3. Médias : importez le dossier « medias » dans le gestionnaire de médias.
4. Wix Stores › Produits › Importer : utilisez « produits.csv » (vérifiez les colonnes avec le modèle CSV de Wix, puis ajoutez les images).
5. Reconstituez les pages avec les textes de « textes-des-pages.md » (accueil, produit, histoire, FAQ, contact, livraison).
6. Animations : Wix propose des effets d'apparition au défilement natifs (Animation › Entrée) ; préférez des effets discrets et vérifiez l'option de réduction des mouvements.`
      : `1. Dans Squarespace, choisissez un modèle Commerce épuré.
2. Conception du site › Couleurs : créez une palette avec les couleurs ci-dessous ; Polices : choisissez les familles indiquées (ou les plus proches disponibles ; Squarespace autorise l'import de polices personnalisées via CSS sur les offres compatibles).
3. Importez les médias du dossier « medias » dans la bibliothèque d'images.
4. Commerce › Produits › Importer : utilisez « produits.csv » (adaptez les colonnes au modèle d'import Squarespace).
5. Reconstituez les pages avec « textes-des-pages.md ».
6. Utilisez les animations de section natives avec parcimonie.`;
  files["GUIDE.md"] = strToU8(`# Kit de création ${platform === "wix" ? "Wix" : "Squarespace"} — ${spec.store.shopName}

${platform === "wix" ? "Wix" : "Squarespace"} n'accepte pas l'import d'un thème externe : ce kit n'est pas un thème installable.
Il rassemble tout ce qu'il faut pour reproduire fidèlement la boutique conçue dans le studio, dans l'éditeur de la plateforme.

## Étapes
${guide}

## Palette
${Object.entries(sc).map(([k, v]) => `- ${k} : fond ${v.background} · texte ${v.text} · accent ${v.accent} · texte sur accent ${v.accent_text}`).join("\n")}

## Typographies
- Titres : ${hf.family}
- Texte : ${bf.family}
`);
  files["textes-des-pages.md"] = strToU8([textPage("index", "Accueil"), textPage("product", "Fiche produit"), textPage("page.about", "Notre histoire"), textPage("page.faq", "FAQ"), textPage("page.contact", "Contact"), textPage("page.shipping", "Livraison et retours")].join("\n\n"));
  const csvEsc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  files["produits.csv"] = strToU8(
    ["Nom,Description,Prix,Variante,SKU,Images"]
      .concat((p.variants.length ? p.variants : [{ title: "", options: [""], price: p.price, available: true }]).map((v) => [p.title, strip(p.description_html), v.price != null ? (v.price / 100).toFixed(2) : "", v.title === "Default Title" ? "" : v.title, (v as any).sku ?? "", p.images.map((f) => `medias/${f}`).join(" ")].map(csvEsc).join(",")))
      .join("\n"),
  );
  return { zip: Buffer.from(zipSync(files, { level: 6 })), name: `${slug(spec.store.shopName)}-kit-${platform}.zip`, kind: "kit" as const };
}

export const PLATFORMS = [
  { id: "shopify", label: "Shopify", delivery: "Thème Online Store 2.0 installable (ZIP), modifiable dans l'éditeur de thème", installable: true },
  { id: "woocommerce", label: "WooCommerce", delivery: "Thème de blocs WordPress installable (Apparence › Thèmes › Téléverser)", installable: true },
  { id: "prestashop", label: "PrestaShop", delivery: "Thème enfant du thème Classic, installable (Apparence › Thème et logo)", installable: true },
  { id: "wix", label: "Wix", delivery: "Kit de reprise : Wix n'accepte pas de thème importé", installable: false },
  { id: "squarespace", label: "Squarespace", delivery: "Kit de reprise : Squarespace n'accepte pas de thème importé", installable: false },
] as const;
