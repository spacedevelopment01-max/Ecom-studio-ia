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
import { storeProducts, themeLang, type ThemeSpec, type SectionInstance } from "./spec";
import { pick, type Lang } from "../i18n";
import { L } from "../i18n-server";
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

/**
 * Texte placé dans un commentaire PHP ou CSS (nom de boutique, titre de page repris d'un site) :
 * la fin de commentaire (étoile puis barre oblique) fermerait le commentaire et le reste deviendrait du code (erreur fatale sur WordPress).
 */
export const commentSafe = (s: unknown) => String(s ?? "").replace(/\*\//g, "* /").replace(/\?>/g, "? >").replace(/[\r\n]+/g, " ");

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

/** Adresse Shopify → adresse WordPress (pages : /<slug>/ ; produits et collections : boutique, ou accueil d'un site de services). */
function wpLink(url: unknown, fallback: string): string {
  const u = String(url ?? "").trim();
  if (!u) return fallback;
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  const page = u.match(/^\/pages\/([^/?#]+)/);
  if (page) return `/${page[1]}/`;
  if (/^\/(products|collections)/.test(u)) return fallback;
  return u;
}

function wpBlocksForSection(s: SectionInstance, img: (f: string) => string, lang: Lang = "fr", services = false): string {
  const shopUrl = services ? "/contact/" : pick(lang, "/boutique/", "/shop/");
  const st = s.settings as Record<string, any>;
  const h = (t: unknown, lvl = 2) => (t ? `<!-- wp:heading {"level":${lvl}} -->\n<h${lvl} class="wp-block-heading">${esc(t)}</h${lvl}>\n<!-- /wp:heading -->\n` : "");
  const p = (t: unknown) => (strip(t) ? `<!-- wp:paragraph -->\n<p>${esc(strip(t))}</p>\n<!-- /wp:paragraph -->\n` : "");
  const btn = (label: unknown, url: unknown = st.button_link) => (label ? `<!-- wp:buttons -->\n<div class="wp-block-buttons"><!-- wp:button -->\n<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${esc(wpLink(url, shopUrl))}">${esc(label)}</a></div>\n<!-- /wp:button --></div>\n<!-- /wp:buttons -->\n` : "");
  const list = (items: string[]) => (items.length ? `<!-- wp:list -->\n<ul class="wp-block-list">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>\n<!-- /wp:list -->\n` : "");
  const cols = (inner: string[]) => `<!-- wp:columns -->\n<div class="wp-block-columns">${inner.map((c) => `<!-- wp:column -->\n<div class="wp-block-column">${c}</div>\n<!-- /wp:column -->`).join("\n")}</div>\n<!-- /wp:columns -->\n`;
  const lines = (v: unknown) => String(v ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
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
    case "services-list":
      return group(`${h(st.heading)}${p(st.text)}${cols(blocksOf(s).map((b) => `${image(b.settings.image_asset)}${h(b.settings.title, 3)}${p(b.settings.text)}${p([b.settings.price, b.settings.duration].filter(Boolean).join(" · "))}${btn(b.settings.button_label || st.button_label, b.settings.button_link || st.button_link)}`))}`, "services");
    case "pricing":
      return group(`${h(st.heading)}${cols(blocksOf(s).map((b) => `${h(b.settings.name, 3)}${p(b.settings.description)}${p([b.settings.price || st.no_price_label, b.settings.period].filter(Boolean).join(" "))}${list(lines(b.settings.features))}${btn(b.settings.button_label || st.button_label, b.settings.button_link || st.button_link)}`))}`, "pricing");
    case "booking": {
      const url = String(st.booking_url ?? "");
      const action = url ? btn(st.button_label, url) : `<!-- wp:paragraph -->\n<p>${esc(pick(lang, "[Ajoutez ici le bloc de formulaire de votre extension de contact (ex. Contact Form 7, WPForms)]", "[Add your contact form plugin's block here (e.g. Contact Form 7, WPForms)]"))}</p>\n<!-- /wp:paragraph -->\n`;
      return group(`${h(st.heading)}${p(st.text)}${list(blocksOf(s).map((b) => [b.settings.title, b.settings.text].filter(Boolean).join(" — ")))}${action}${p([st.phone, st.email].filter(Boolean).join(" · "))}`, "booking");
    }
    case "practical-info": {
      const map = st.map === "google" && st.address ? `<!-- wp:html -->\n<iframe title="${esc(pick(lang, "Carte", "Map"))}" src="https://maps.google.com/maps?output=embed&amp;z=15&amp;q=${encodeURIComponent(String(st.map_query || st.address).replace(/\n/g, " "))}" width="100%" height="360" style="border:0" loading="lazy"></iframe>\n<!-- /wp:html -->\n` : "";
      return group(`${h(st.heading)}${cols([`${h(pick(lang, "Horaires", "Opening hours"), 3)}${list(lines(st.hours))}`, `${h(pick(lang, "Adresse", "Address"), 3)}${p(st.address)}${p(st.area)}`, `${h(pick(lang, "Nous joindre", "Get in touch"), 3)}${st.phone ? `<!-- wp:paragraph -->\n<p><a href="tel:${esc(String(st.phone).replace(/[^\d+]/g, ""))}">${esc(st.phone)}</a></p>\n<!-- /wp:paragraph -->\n` : ""}${st.email ? `<!-- wp:paragraph -->\n<p><a href="mailto:${esc(st.email)}">${esc(st.email)}</a></p>\n<!-- /wp:paragraph -->\n` : ""}`])}${map}`, "info");
    }
    case "team":
      return group(`${h(st.heading)}${cols(blocksOf(s).map((b) => `${image(b.settings.image_asset)}${h(b.settings.name, 3)}${p(b.settings.role)}${p(b.settings.bio)}`))}`, "team");
    case "portfolio":
      return group(`${h(st.heading)}${cols(blocksOf(s).map((b) => `${image(b.settings.image_asset)}${h(b.settings.title, 3)}${p(b.settings.caption)}`))}`, "portfolio");
    case "testimonials":
      return group(`${h(st.heading)}${blocksOf(s).map((b) => `<!-- wp:quote -->\n<blockquote class="wp-block-quote"><!-- wp:paragraph -->\n<p>${esc(strip(b.settings.quote))}</p>\n<!-- /wp:paragraph --><cite>${esc(b.settings.author)}</cite></blockquote>\n<!-- /wp:quote -->`).join("\n")}`, "reviews");
    case "how-to":
    case "timeline":
    case "trust-bar":
      return group(`${h(st.heading)}${cols(blocksOf(s).map((b) => `${h(b.settings.title, 3)}${p(b.settings.text)}`))}${btn(st.button_label)}`, "steps");
    case "about":
      return `<!-- wp:media-text {"className":"es-about"} -->\n<div class="wp-block-media-text is-stacked-on-mobile es-about"><figure class="wp-block-media-text__media"><img src="${img(st.image_asset ?? "")}" alt=""/></figure><div class="wp-block-media-text__content">${h(st.heading, 1)}${p(st.lead)}${h(st.why_title, 3)}${p(st.why_text)}${h(st.commit_title, 3)}${p(st.commit_text)}${btn(st.button_label)}</div></div>\n<!-- /wp:media-text -->\n${group(blocksOf(s).map((b) => `${h(b.settings.title, 3)}${p(b.settings.text)}`).join(""), "values")}`;
    case "contact-form":
      return group(`${h(st.heading)}${p(st.text)}<!-- wp:paragraph -->\n<p>${esc(pick(lang, "[Ajoutez ici le bloc de formulaire de votre extension de contact (ex. Contact Form 7, WPForms)]", "[Add your contact form plugin's block here (e.g. Contact Form 7, WPForms)]"))}</p>\n<!-- /wp:paragraph -->\n`, "contact");
    case "legal-page":
      return group(`${h(st.heading, 1)}${blocksOf(s).map((b) => `${h(b.settings.title, 2)}${p(b.settings.text)}`).join("")}`, "legal");
    case "features-grid":
      return group(`${h(st.heading)}<!-- wp:columns -->\n<div class="wp-block-columns">${blocksOf(s).map((b) => `<!-- wp:column -->\n<div class="wp-block-column">${h(b.settings.title, 3)}${p(b.settings.text)}</div>\n<!-- /wp:column -->`).join("\n")}</div>\n<!-- /wp:columns -->\n`, "features");
    case "scroll-story":
      return group(`${h(st.heading)}${blocksOf(s).map((b) => `${h(b.settings.title, 3)}${p(b.settings.text)}${image(b.settings.image_asset)}`).join("")}`, "story");
    case "specs-list":
      return group(`${h(st.heading)}<!-- wp:table -->\n<figure class="wp-block-table"><table><tbody>${blocksOf(s).map((b) => `<tr><td>${esc(b.settings.label)}</td><td><strong>${esc(b.settings.value)}</strong></td></tr>`).join("")}</tbody></table></figure>\n<!-- /wp:table -->\n`, "specs");
    case "faq":
      return group(`${h(st.heading)}${blocksOf(s).map((b) => `<!-- wp:details -->\n<details class="wp-block-details"><summary>${esc(b.settings.question)}</summary><!-- wp:paragraph -->\n<p>${esc(strip(b.settings.answer))}</p>\n<!-- /wp:paragraph --></details>\n<!-- /wp:details -->`).join("\n")}`, "faq");
    case "rich-text":
      return group(blocksOf(s).map((b) => (b.type === "heading" ? h(b.settings.text) : b.type === "text" ? p(b.settings.text) : b.type === "eyebrow" ? p(b.settings.text) : b.type === "button" ? btn(b.settings.label, b.settings.link) : "")).join(""), "richtext");
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
  // Fichiers du thème : textes dans la langue de la boutique.
  const lang = themeLang(spec);
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const sc = schemes(spec);
  const s1 = sc["scheme-1"], s3 = sc["scheme-3"];
  const hf = fontFamily(spec.settings.type_heading_font), bf = fontFamily(spec.settings.type_body_font);
  const themeSlug = `es-${slug(spec.store.shopName)}`;
  // Site d'entreprise de services : thème vitrine WordPress, sans WooCommerce ni panier.
  const services = spec.store.business === "services";
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
          { slug: "base", name: t("Fond", "Background"), color: s1.background },
          { slug: "surface", name: "Surface", color: s1.surface },
          { slug: "contrast", name: t("Texte", "Text"), color: s1.text },
          { slug: "accent", name: "Accent", color: s1.accent },
          { slug: "accent-text", name: t("Texte sur accent", "Text on accent"), color: s1.accent_text },
          { slug: "inverse", name: t("Fond sombre", "Dark background"), color: s3.background },
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
      { name: "header", title: t("En-tête", "Header"), area: "header" },
      { name: "footer", title: t("Pied de page", "Footer"), area: "footer" },
    ],
  };
  files["theme.json"] = strToU8(JSON.stringify(theme, null, 2));
  files["style.css"] = strToU8(`/*
Theme Name: ${commentSafe(spec.store.shopName)}
Theme URI: https://ecom-studio-ia.local/
Author: E-COM STUDIO IA
Description: ${commentSafe(services ? t(`Site vitrine (thème de blocs) généré par E-COM STUDIO IA pour ${spec.store.shopName} (direction ${spec.direction}). Aucune extension requise.`, `Showcase website (block theme) generated by E-COM STUDIO IA for ${spec.store.shopName} (${spec.direction} direction). No plugin required.`) : t(`Thème de blocs généré par E-COM STUDIO IA pour ${spec.store.shopName} (direction ${spec.direction}). Compatible WooCommerce.`, `Block theme generated by E-COM STUDIO IA for ${spec.store.shopName} (${spec.direction} direction). WooCommerce compatible.`))}
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
/** ${commentSafe(t(`Thème ${spec.store.shopName} — généré par E-COM STUDIO IA.`, `${spec.store.shopName} theme — generated by E-COM STUDIO IA.`))} */
add_action( 'after_setup_theme', function () {
${services ? "" : `	add_theme_support( 'woocommerce' );
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );
`}	add_editor_style( 'style.css' );
} );
add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style( '${themeSlug}', get_stylesheet_uri(), array(), '1.0.0' );
} );
`);
  const home = homeBlocks(spec).map(({ s }) => wpBlocksForSection(s, img, lang, services)).join("\n");
  files["patterns/accueil.php"] = strToU8(`<?php
/**
 * Title: ${commentSafe(`${t("Accueil", "Home")} ${spec.store.shopName}`)}
 * Slug: ${themeSlug}/accueil
 * Categories: featured
 */
?>
${home}`);
  files["templates/front-page.html"] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->\n<!-- wp:group {"tagName":"main"} -->\n<main class="wp-block-group"><!-- wp:pattern {"slug":"${themeSlug}/accueil"} /--></main>\n<!-- /wp:group -->\n<!-- wp:template-part {"slug":"footer","area":"footer"} /-->`);
  files["templates/index.html"] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->\n<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->\n<main class="wp-block-group"><!-- wp:post-title {"level":1} /--><!-- wp:post-content /--></main>\n<!-- /wp:group -->\n<!-- wp:template-part {"slug":"footer","area":"footer"} /-->`);
  files["templates/page.html"] = files["templates/index.html"];
  // Pages du site de services : un modèle par adresse (WordPress applique page-<slug>.html à la page de même slug).
  const sitePages: { slug: string; title: string }[] = [];
  if (services) {
    for (const page of spec.store.pages) {
      const tpl = spec.templates[`page.${page.template_suffix}`];
      if (!tpl) continue;
      const body = tpl.order.map((id) => tpl.sections[id]).filter((x) => x && !x.disabled).map((x) => wpBlocksForSection(x, img, lang, true)).join("\n");
      files[`patterns/${page.handle}.php`] = strToU8(`<?php\n/**\n * Title: ${commentSafe(page.title)}\n * Slug: ${themeSlug}/${page.handle}\n * Categories: featured\n */\n?>\n${body}`);
      files[`templates/page-${page.handle}.html`] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->\n<!-- wp:group {"tagName":"main"} -->\n<main class="wp-block-group"><!-- wp:pattern {"slug":"${themeSlug}/${page.handle}"} /--></main>\n<!-- /wp:group -->\n<!-- wp:template-part {"slug":"footer","area":"footer"} /-->`);
      sitePages.push({ slug: page.handle, title: page.title });
    }
    files[t("LISEZMOI.txt", "README.txt")] = strToU8(
      t(
        `Site vitrine ${spec.store.shopName} — aucune extension (WooCommerce ou autre) n'est nécessaire.\n\n1. Apparence › Thèmes › Ajouter › Téléverser ce ZIP, puis Activer.\n2. Pages › Ajouter : créez les pages suivantes avec exactement ces slugs (leur contenu est fourni par le thème) :\n${sitePages.map((x) => `   - ${x.title} : ${x.slug}`).join("\n")}\n3. Réglages › Lecture : « Une page statique » si vous voulez choisir l'accueil ; sinon l'accueil du thème s'affiche.\n4. Apparence › Éditeur › Navigation : ajoutez ces pages au menu.\n5. Formulaires : installez l'extension de formulaire de votre choix et placez son bloc là où le thème l'indique entre crochets.\n6. Remplacez chaque « [À compléter : …] » par vos informations réelles.\n`,
        `${spec.store.shopName} showcase website — no plugin (WooCommerce or other) is required.\n\n1. Appearance › Themes › Add New › Upload this ZIP, then Activate.\n2. Pages › Add New: create these pages with exactly these slugs (the theme provides their content):\n${sitePages.map((x) => `   - ${x.title}: ${x.slug}`).join("\n")}\n3. Settings › Reading: "A static page" if you want to choose the home page; otherwise the theme's home page is shown.\n4. Appearance › Editor › Navigation: add these pages to the menu.\n5. Forms: install the form plugin of your choice and place its block where the theme shows it in brackets.\n6. Replace every "[To complete: …]" with your real information.\n`,
      ),
    );
  }
  if (!services) files["templates/single-product.html"] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->
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
  if (!services) files["templates/archive-product.html"] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->\n<!-- wp:group {"tagName":"main","layout":{"type":"constrained","wideSize":"1200px"}} -->\n<main class="wp-block-group"><!-- wp:query-title {"type":"archive"} /--><!-- wp:woocommerce/product-collection {"query":{"perPage":12,"woocommerceAttributes":[],"woocommerceStockStatus":["instock","outofstock","onbackorder"],"isProductCollectionBlock":true},"displayLayout":{"type":"flex","columns":3}} /--></main>\n<!-- /wp:group -->\n<!-- wp:template-part {"slug":"footer","area":"footer"} /-->`);
  files["templates/404.html"] = strToU8(`<!-- wp:template-part {"slug":"header","area":"header"} /-->\n<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->\n<main class="wp-block-group"><!-- wp:heading {"level":1} -->\n<h1 class="wp-block-heading">${t("Cette page s'est égarée.", "This page has wandered off.")}</h1>\n<!-- /wp:heading --><!-- wp:search {"label":"${t("Rechercher", "Search")}","buttonText":"${t("Rechercher", "Search")}"} /--></main>\n<!-- /wp:group -->\n<!-- wp:template-part {"slug":"footer","area":"footer"} /-->`);
  // Les parties de gabarit sont en HTML pur : le logo se règle via le bloc « Logo du site » (fichier fourni dans assets/images).
  const logo = `<!-- wp:site-logo {"width":${spec.settings.logo_width ?? 150}} /--><!-- wp:site-title /-->`;
  // En-tête : mini-panier pour une boutique ; bouton d'action (rendez-vous, devis, appel) pour un site de services.
  const headerSection = Object.values(spec.groups.header.sections).find((x) => x.type === "header")?.settings as Record<string, any> | undefined;
  const ctaLabel = String(headerSection?.cta_label ?? "");
  const ctaHref = headerSection?.cta_link ? wpLink(headerSection.cta_link, "/contact/") : headerSection?.phone ? `tel:${String(headerSection.phone).replace(/[^\d+]/g, "")}` : "/contact/";
  const headerAction = services ? (ctaLabel ? `<!-- wp:buttons -->\n<div class="wp-block-buttons"><!-- wp:button -->\n<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${esc(ctaHref)}">${esc(ctaLabel)}</a></div>\n<!-- /wp:button --></div>\n<!-- /wp:buttons -->` : "") : "<!-- wp:woocommerce/mini-cart /-->";
  files["parts/header.html"] = strToU8(`<!-- wp:group {"layout":{"type":"flex","justifyContent":"space-between"},"style":{"spacing":{"padding":{"top":"1rem","bottom":"1rem","left":"1.5rem","right":"1.5rem"}}}} -->\n<div class="wp-block-group" style="padding:1rem 1.5rem">${logo}<!-- wp:navigation /-->${headerAction}</div>\n<!-- /wp:group -->`);
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
  return { zip: Buffer.from(zipSync(rooted, { level: 6 })), name: `${themeSlug}-${services ? "wordpress" : "woocommerce"}.zip`, kind: "theme" as const };
}

// ---------------------------------------------------------------- PrestaShop

export async function exportPrestaShop(spec: ThemeSpec, load: AssetLoader) {
  const t = (fr: string, en: string) => pick(themeLang(spec), fr, en);
  const sc = schemes(spec);
  const s1 = sc["scheme-1"], s2 = sc["scheme-2"], s3 = sc["scheme-3"];
  const hf = fontFamily(spec.settings.type_heading_font), bf = fontFamily(spec.settings.type_body_font);
  const name = `es${slug(spec.store.shopName).replace(/-/g, "")}`.slice(0, 30);
  const media = await collectMedia(spec, load);
  const files: Record<string, Uint8Array> = {};
  files["config/theme.yml"] = strToU8(`parent: classic
name: ${name}
display_name: ${JSON.stringify(String(spec.store.shopName))}
version: 1.0.0
author:
  name: "E-COM STUDIO IA"
meta:
  compatibility:
    from: 1.7.0.0
    to: ~
  available_layouts:
    layout-full-width:
      name: ${t("Pleine largeur", "Full width")}
      description: ${t("Sans colonne latérale", "No sidebar")}
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
  files["assets/css/es-theme.css"] = strToU8(`/* ${t("Thème enfant", "Child theme")} ${commentSafe(spec.store.shopName)} — E-COM STUDIO IA */
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
  return { zip: Buffer.from(zipSync(files, { level: 6 })), name: `${name}-prestashop-${t("theme-enfant", "child-theme")}.zip`, kind: "theme" as const };
}

// ---------------------------------------------------------------- Wix / Squarespace (kits)

export async function exportKit(spec: ThemeSpec, load: AssetLoader, platform: "wix" | "squarespace") {
  const sc = schemes(spec);
  const hf = fontFamily(spec.settings.type_heading_font), bf = fontFamily(spec.settings.type_body_font);
  const media = await collectMedia(spec, load);
  const files: Record<string, Uint8Array> = {};
  for (const [f, data] of Object.entries(media)) files[`medias/${f}`] = new Uint8Array(data);
  const fontsDir = L("polices", "fonts");
  const textsFile = L("textes-des-pages.md", "page-texts.md");
  const csvFile = L("produits.csv", "products.csv");
  for (const fam of [hf, bf]) for (const f of new Set(Object.values(fam.files))) files[`${fontsDir}/${f}`] = new Uint8Array(fs.readFileSync(path.join(process.cwd(), "assets", "fonts", f)));
  const sep = L(" :", ":");
  const textPage = (key: string, title: string) => {
    const t = spec.templates[key];
    if (!t) return "";
    const lines: string[] = [`## ${title}`];
    for (const id of t.order) {
      const s = t.sections[id];
      if (!s || s.disabled) continue;
      const st = s.settings as Record<string, any>;
      lines.push(L(`\n### Section : ${s.type}`, `\n### Section: ${s.type}`));
      for (const k of ["eyebrow", "heading", "heading_line1", "heading_line2", "text", "lead", "button_label", "button_link", "caption", "hours", "address", "area", "phone", "email", "booking_url"]) if (st[k]) lines.push(`- ${k}${sep} ${strip(st[k])}`);
      if (st.image_asset) lines.push(`- image${sep} medias/${st.image_asset}`);
      for (const b of blocksOf(s)) lines.push(`  - ${Object.entries(b.settings).filter(([, v]) => typeof v === "string" && v).map(([k, v]) => `${k}${sep} ${strip(v)}`).join(" · ")}`);
    }
    return lines.join("\n");
  };
  const guideFr =
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
  const guideEn =
    platform === "wix"
      ? `1. In the Wix editor, create a blank site (or a simple Wix Stores template).
2. Site Design › Colors: copy the palette below; Site Design › Text: upload the fonts from the "${fontsDir}" folder (Add Fonts › Upload).
3. Media: upload the "medias" folder to the Media Manager.
4. Wix Stores › Products › Import: use "${csvFile}" (check the columns against the Wix CSV template, then add the images).
5. Rebuild the pages using the texts in "${textsFile}" (home, product, story, FAQ, contact, shipping).
6. Animations: Wix offers native scroll-in effects (Animation › Entrance); keep them subtle and check the reduced-motion option.`
      : `1. In Squarespace, choose a clean Commerce template.
2. Site Styles › Colors: create a palette with the colors below; Fonts: pick the families listed (or the closest available; Squarespace allows custom fonts via CSS on eligible plans).
3. Upload the media from the "medias" folder to the image library.
4. Commerce › Products › Import: use "${csvFile}" (adapt the columns to the Squarespace import template).
5. Rebuild the pages using "${textsFile}".
6. Use the native section animations sparingly.`;
  // Site de services : modèle vitrine, prise de rendez-vous native, pas de catalogue ni de CSV produit.
  const services = spec.store.business === "services";
  const svcFr =
    platform === "wix"
      ? `1. Dans l'éditeur Wix, créez un site vierge (pas de modèle Wix Stores : aucune boutique n'est nécessaire).
2. Thème du site › Couleurs : reportez la palette ci-dessous ; Thème du site › Texte : importez les polices du dossier « polices ».
3. Médias : importez le dossier « medias » dans le gestionnaire de médias.
4. Rendez-vous : ajoutez Wix Bookings, ou un bouton vers votre lien de réservation (Calendly, Planity, Doctolib…).
5. Reconstituez les pages avec « textes-des-pages.md » (accueil, prestations, à propos, contact / rendez-vous, FAQ, mentions légales).
6. Infos pratiques : ajoutez l'élément Google Maps avec votre adresse et un bouton « Appeler » (lien téléphone).`
      : `1. Dans Squarespace, choisissez un modèle « Services » ou « Portfolio » épuré (pas de modèle Commerce).
2. Conception du site › Couleurs et Polices : reportez la palette et les familles indiquées ci-dessous.
3. Importez les médias du dossier « medias » dans la bibliothèque d'images.
4. Rendez-vous : utilisez Acuity Scheduling (intégré à Squarespace) ou un bouton vers votre lien de réservation.
5. Reconstituez les pages avec « textes-des-pages.md » (accueil, prestations, à propos, contact / rendez-vous, FAQ, mentions légales).
6. Infos pratiques : bloc Carte avec votre adresse, horaires en texte, téléphone en lien « tel: ».`;
  const svcEn =
    platform === "wix"
      ? `1. In the Wix editor, create a blank site (no Wix Stores template: you don't need a store).
2. Site Design › Colors: copy the palette below; Site Design › Text: upload the fonts from the "${fontsDir}" folder.
3. Media: upload the "medias" folder to the Media Manager.
4. Appointments: add Wix Bookings, or a button to your booking link (Calendly, Planity, Doctolib…).
5. Rebuild the pages using "${textsFile}" (home, services, about, contact / booking, FAQ, legal notice).
6. Practical info: add the Google Maps element with your address and a "Call" button (phone link).`
      : `1. In Squarespace, choose a clean "Services" or "Portfolio" template (not a Commerce template).
2. Site Styles › Colors and Fonts: copy the palette and font families listed below.
3. Upload the media from the "medias" folder to the image library.
4. Appointments: use Acuity Scheduling (built into Squarespace) or a button to your booking link.
5. Rebuild the pages using "${textsFile}" (home, services, about, contact / booking, FAQ, legal notice).
6. Practical info: Map block with your address, opening hours as text, phone as a "tel:" link.`;
  const guide = services ? L(svcFr, svcEn) : L(guideFr, guideEn);
  const pf = platform === "wix" ? "Wix" : "Squarespace";
  files["GUIDE.md"] = strToU8(
    L(
      `# Kit de création ${pf} — ${spec.store.shopName}

${pf} n'accepte pas l'import d'un thème externe : ce kit n'est pas un thème installable.
Il rassemble tout ce qu'il faut pour reproduire fidèlement ${services ? "le site" : "la boutique"} conçu${services ? "" : "e"} dans le studio, dans l'éditeur de la plateforme.

## Étapes
${guide}

## Palette
${Object.entries(sc).map(([k, v]) => `- ${k} : fond ${v.background} · texte ${v.text} · accent ${v.accent} · texte sur accent ${v.accent_text}`).join("\n")}

## Typographies
- Titres : ${hf.family}
- Texte : ${bf.family}
`,
      `# ${pf} build kit — ${spec.store.shopName}

${pf} doesn't accept importing an external theme: this kit isn't an installable theme.
It gathers everything you need to faithfully recreate the ${services ? "website" : "store"} designed in the studio, in the platform's editor.

## Steps
${guide}

## Palette
${Object.entries(sc).map(([k, v]) => `- ${k}: background ${v.background} · text ${v.text} · accent ${v.accent} · text on accent ${v.accent_text}`).join("\n")}

## Typography
- Headings: ${hf.family}
- Body: ${bf.family}
`,
    ),
  );
  if (services) {
    files[textsFile] = strToU8([textPage("index", L("Accueil", "Home")), ...spec.store.pages.map((pg) => textPage(`page.${pg.template_suffix}`, pg.title))].filter(Boolean).join("\n\n"));
    return { zip: Buffer.from(zipSync(files, { level: 6 })), name: `${slug(spec.store.shopName)}-kit-${platform}.zip`, kind: "kit" as const };
  }
  files[textsFile] = strToU8([textPage("index", L("Accueil", "Home")), textPage("product", L("Fiche produit", "Product page")), textPage("page.about", L("Notre histoire", "Our story")), textPage("page.faq", "FAQ"), textPage("page.contact", "Contact"), textPage("page.shipping", L("Livraison et retours", "Shipping and returns"))].join("\n\n"));
  const csvEsc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  files[csvFile] = strToU8(
    [L("Nom,Description,Prix,Variante,SKU,Images", "Name,Description,Price,Variant,SKU,Images")]
      .concat(storeProducts(spec).flatMap((p) => (p.variants.length ? p.variants : [{ title: "", options: [""], price: p.price, available: true }]).map((v) => [p.title, strip(p.description_html), (v.price ?? p.price) != null ? ((v.price ?? p.price)! / 100).toFixed(2) : "", v.title === "Default Title" ? "" : v.title, (v as any).sku ?? "", p.images.map((f) => `medias/${f}`).join(" ")].map(csvEsc).join(","))))
      .join("\n"),
  );
  return { zip: Buffer.from(zipSync(files, { level: 6 })), name: `${slug(spec.store.shopName)}-kit-${platform}.zip`, kind: "kit" as const };
}

export const PLATFORMS = [
  { id: "shopify", label: "Shopify", delivery: { fr: "Thème Online Store 2.0 installable (ZIP), modifiable dans l'éditeur de thème", en: "Installable Online Store 2.0 theme (ZIP), editable in the theme editor" }, installable: true },
  { id: "woocommerce", label: "WooCommerce", delivery: { fr: "Thème de blocs WordPress installable (Apparence › Thèmes › Téléverser)", en: "Installable WordPress block theme (Appearance › Themes › Upload)" }, installable: true },
  { id: "prestashop", label: "PrestaShop", delivery: { fr: "Thème enfant du thème Classic, installable (Apparence › Thème et logo)", en: "Installable child theme of the Classic theme (Design › Theme & Logo)" }, installable: true },
  { id: "wix", label: "Wix", delivery: { fr: "Kit de reprise : Wix n'accepte pas de thème importé", en: "Rebuild kit: Wix doesn't accept imported themes" }, installable: false },
  { id: "squarespace", label: "Squarespace", delivery: { fr: "Kit de reprise : Squarespace n'accepte pas de thème importé", en: "Rebuild kit: Squarespace doesn't accept imported themes" }, installable: false },
] as const;
