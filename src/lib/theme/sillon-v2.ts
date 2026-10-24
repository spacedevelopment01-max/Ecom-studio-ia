/**
 * SILLON V2 — thème « Produit spécifique / Boutique spécialisée » (identifiant `sillon`, #148), refait d'après les trois
 * planches validées par Thomas le 24 octobre 2026 (PR documentaire #182, `docs/theme-briefs/sillon-v2/`).
 *
 * En-tête flottant en capsule, très grands titres condensés (Anton), étiquettes à chasse fixe (Space Mono), signature
 * fine (Oswald), textes DM Sans — polices libres SIL OFL de la bibliothèque Shopify ; crème minérale, brun espresso,
 * cuivre brûlé, vert grisé ; courbes de niveau et chemins cuivre redessinés en SVG. Sections propres au thème :
 * theme-base/sections/sv-*.liquid, feuille theme-base/assets/sillon.css, script sillon.js.
 *
 * Appliqué à un vrai client (`finish`), le thème reprend SES contenus (nom, accroche, photos, produit et prix) : aucun
 * mot SILLON, café, van ni prix de la démonstration n'est copié. Les pages qui attendent ses informations restent en
 * brouillon ; le paiement passe par le panier et la commande Shopify de la boutique.
 */
import type { CatalogTheme, Kit, Row } from "./theme-catalog";
import type { StorePage, TemplateJson, ThemeSpec, SectionInstance } from "./spec";
import type { Lang } from "../i18n";
import { pick } from "../i18n";

/** Pages propres au thème (adresse française et anglaise, titre, gabarit, variante du pied de page). */
export const SV_PAGES = [
  { handle: "le-rituel", handleEn: "the-ritual", fr: "Le rituel", en: "The ritual", suffix: "sv-rituel", foot: "light" },
  { handle: "sillon", handleEn: "the-brand", fr: "SILLON", en: "The brand", suffix: "sv-marque", foot: "light" },
  { handle: "carnet", handleEn: "journal", fr: "Carnet d'échappées", en: "Journal", suffix: "sv-carnet", foot: "light" },
  { handle: "carnet-le-cafe-en-van", handleEn: "journal-coffee-in-a-van", fr: "Le café en van", en: "Coffee in a van", suffix: "sv-article-van", foot: "light" },
  { handle: "carnet-le-sac-du-week-end", handleEn: "journal-the-weekend-bag", fr: "Le sac du week-end", en: "The weekend bag", suffix: "sv-article-sac", foot: "light" },
  { handle: "carnet-prendre-soin-de-sa-machine", handleEn: "journal-caring-for-your-machine", fr: "Prendre soin de sa machine", en: "Caring for your machine", suffix: "sv-article-soin", foot: "light" },
  { handle: "carnet-le-gout-des-petits-rituels", handleEn: "journal-small-rituals", fr: "Le goût des petits rituels", en: "The taste of small rituals", suffix: "sv-article-rituels", foot: "light" },
  { handle: "carnet-ralentir-face-au-lac", handleEn: "journal-slowing-down-by-the-lake", fr: "Ralentir face au lac", en: "Slowing down by the lake", suffix: "sv-article-lac", foot: "light" },
  { handle: "carnet-une-route-un-matin", handleEn: "journal-a-road-a-morning", fr: "Une route, un matin", en: "A road, a morning", suffix: "sv-article-route", foot: "light" },
  { handle: "commande", handleEn: "checkout-demo", fr: "Commande", en: "Checkout", suffix: "sv-commande", foot: "legal" },
  { handle: "faq", handleEn: "faq", fr: "Questions fréquentes", en: "Frequently asked questions", suffix: "sv-faq", foot: "legal" },
  { handle: "contact", handleEn: "contact", fr: "Contact", en: "Contact", suffix: "sv-contact", foot: "legal" },
  { handle: "livraison-et-retours", handleEn: "shipping-and-returns", fr: "Livraison et retours", en: "Shipping and returns", suffix: "sv-livraison", foot: "legal" },
  { handle: "suivi-de-commande", handleEn: "order-tracking", fr: "Suivi de commande", en: "Order tracking", suffix: "sv-suivi", foot: "legal" },
  { handle: "mentions-legales", handleEn: "legal-notice", fr: "Mentions légales", en: "Legal notice", suffix: "sv-legal-mentions", foot: "legal" },
  { handle: "conditions-de-vente", handleEn: "terms-of-sale", fr: "Conditions de vente", en: "Terms of sale", suffix: "sv-legal-cgv", foot: "legal" },
  { handle: "confidentialite", handleEn: "privacy", fr: "Confidentialité", en: "Privacy", suffix: "sv-legal-confidentialite", foot: "legal" },
  { handle: "cookies", handleEn: "cookies", fr: "Cookies", en: "Cookies", suffix: "sv-legal-cookies", foot: "legal" },
] as const;
export type SvPageHandle = (typeof SV_PAGES)[number]["handle"];
export const svHandle = (h: SvPageHandle, lang: Lang = "fr") => (lang === "en" ? SV_PAGES.find((p) => p.handle === h)!.handleEn : h);
export const svUrl = (h: SvPageHandle, lang: Lang = "fr") => `/pages/${svHandle(h, lang)}`;

/** Gabarit à partir de lignes [type, réglages, blocs, options] (identifiants lisibles, stables). */
export function svTemplate(rows: Row[]): TemplateJson {
  const out: TemplateJson = { sections: {}, order: [] };
  const count: Record<string, number> = {};
  for (const [type, settings, blocks, opts] of rows) {
    count[type] = (count[type] ?? 0) + 1;
    const sid = `${type}-${count[type]}`;
    const s: SectionInstance = { type, settings };
    if (blocks?.length) {
      s.blocks = {};
      s.block_order = [];
      blocks.forEach((b, i) => { const bid = `${b.type}-${i + 1}`; s.blocks![bid] = { type: b.type, settings: b.settings }; s.block_order!.push(bid); });
    }
    if (opts?.disabled) s.disabled = true;
    out.sections[sid] = s;
    out.order.push(sid);
  }
  return out;
}

/** Réglages de l'en-tête flottant (couleurs et polices des planches ; boutique réelle : paiement Shopify). */
export function headerSettings(lang: Lang, o: { cta: string; ctaLink: string; demo: boolean; checkoutPage?: string; cookiesLink: string; menuImage?: string }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return {
    wordmark: "", menu: "main-menu", nav_label: t("Navigation principale", "Main navigation"), cta_label: o.cta, cta_link: o.ctaLink, cart_label: t("Panier", "Cart"),
    menu_label: "Menu", menu_open_label: t("Ouvrir le menu", "Open the menu"), menu_close_label: t("Fermer le menu", "Close the menu"),
    menu_image_asset: o.menuImage ?? "", menu_image_position: "50% 50%", menu_words: o.demo ? t("Explorer\nDéguster\nS'évader", "Explore\nTaste\nGet away") : "",
    color_cream: "#EEE7D9", color_sand: "#E2D8C7", color_ink: "#211D15", color_night: "#1E1913", color_copper: "#B35D30", color_sage: "#6A6C5C", color_ivory: "#F1E9DC",
    label_font: "space_mono_n4", thin_font: "oswald_n2",
    demo_mode: o.demo, checkout_mode: o.demo ? "demo" : "shopify", checkout_page: o.checkoutPage ?? "",
    added_label: t("Ajouté au panier.", "Added to cart."), removed_label: t("Article retiré du panier.", "Item removed from cart."), error_label: t("Une erreur est survenue. Réessayez.", "Something went wrong. Please try again."),
    show_cookies: true, cookies_title: t("Vos préférences de cookies", "Your cookie preferences"),
    cookies_text: t("Les cookies nécessaires font fonctionner le site. La mesure d'audience est facultative et ne démarre qu'avec votre accord.", "Necessary cookies make the site work. Audience measurement is optional and only starts with your consent."),
    cookies_link: o.cookiesLink, cookies_more: t("En savoir plus", "Learn more"), cookies_needed: t("Cookies nécessaires au fonctionnement", "Cookies necessary for the site to work"),
    cookies_stats: t("Mesure d'audience (facultatif)", "Audience measurement (optional)"), cookies_accept: t("Tout accepter", "Accept all"), cookies_refuse: t("Tout refuser", "Refuse all"),
    cookies_custom: t("Personnaliser", "Customise"), cookies_save: t("Enregistrer mes choix", "Save my choices"),
  };
}

/** Réglages du pied de page (une seule source ; la variante est choisie page par page). */
export function footerSettings(lang: Lang, o: { tagline: string; lightTagline: string; lightLink: string; note?: string }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return {
    wordmark: "", menu: "main-menu", help_menu: "footer", legal_menu: "legal", tagline: o.tagline, show_newsletter: true,
    newsletter_label: t("S'inscrire avec votre e-mail", "Sign up with your email"), newsletter_placeholder: t("Votre e-mail", "Your email"), newsletter_done: t("Merci, votre inscription est enregistrée.", "Thank you, you are signed up."),
    light_tagline: o.lightTagline, light_link: o.lightLink, light_link_label: t("Découvrir", "Discover"), cookies_label: "Cookies", note: o.note ?? "",
  };
}

/** Accueil d'un CLIENT : ouverture photo avec SES textes et SA photo, produit, bandeau et questions (rien de SILLON). */
function shopHome(k: Kit): (Row | Row[])[] {
  const t = k.t;
  return [
    k.lib("sv-hero", 1, { layout: "photo", eyebrow: k.hero.eyebrow, heading: k.hero.heading, subtitle: "", text_mobile: k.hero.text, image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.banner ?? "", image_alt: "", card_title: "", show_route: true, height: 688 }),
    k.lib("sv-format", 1, { heading: k.hero.heading, heading_accent: "", text: k.hero.text, link_label: k.hero.cta || t("Découvrir le produit", "Discover the product"), image_asset: k.im.packshot ?? "", words: "" }),
    k.faqSec(1, 4, "lines"),
    k.newsletter(1),
  ];
}

/** Site de services : thème réservé aux boutiques (composition de secours si un projet de services le choisit). */
function servicesHome(k: Kit): (Row | Row[])[] {
  return [
    k.lib("sv-hero", 1, { layout: "photo", eyebrow: "", heading: k.hero.heading, text_mobile: k.hero.text, image_asset: k.im.lifestyle ?? k.im.hero ?? "", card_title: "", show_route: true, height: 688 }),
    k.R.servicesList(1, "cards", { withImages: true }),
    k.faqSec(1, 5, "lines"),
    k.R.contactForm(1, k.t("Une question ?", "A question?")),
  ];
}

export type FinishCtx = { kit: Kit; lang: Lang; services: boolean; shopName: string; address: string; phone: string; email: string; hours: string; contactUrl: string; bookingLabel: string; bookingLink: string; legalUrl: string };

/**
 * Finition commune (démonstration et clients) : en-tête flottant et pied du thème (ceux de base restent, désactivés),
 * réglages de page (variante du pied), page introuvable. Les pages propres au thème sont posées par la démonstration ;
 * chez un client, seules les pages utiles et neutres sont ajoutées, en brouillon tant qu'elles attendent ses infos.
 */
export function finishSillon(spec: ThemeSpec, ctx: FinishCtx) {
  const lang = ctx.lang;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const header = spec.groups.header;
  for (const id of header.order) if (header.sections[id]?.type === "header" || header.sections[id]?.type === "announcement-bar") header.sections[id].disabled = true;
  if (!header.order.some((id) => header.sections[id]?.type === "sv-header")) {
    header.sections["sv-header"] = { type: "sv-header", settings: headerSettings(lang, { cta: t("Découvrir", "Discover"), ctaLink: spec.store.product?.handle ? `/products/${spec.store.product.handle}` : "/collections/all", demo: false, cookiesLink: svUrl("cookies", lang) }) };
    header.order.push("sv-header");
  }
  const footer = spec.groups.footer;
  for (const id of footer.order) if (footer.sections[id]?.type === "footer") footer.sections[id].disabled = true;
  if (!footer.order.some((id) => footer.sections[id]?.type === "sv-footer")) {
    footer.sections["sv-footer"] = { type: "sv-footer", settings: footerSettings(lang, { tagline: "", lightTagline: "", lightLink: "" }) };
    footer.order.push("sv-footer");
  }
  const mark = (key: string, foot: string) => {
    const tpl = spec.templates[key];
    if (!tpl || tpl.order.some((id) => tpl.sections[id]?.type === "sv-page")) return;
    tpl.sections["sv-page"] = { type: "sv-page", settings: { footer: foot } };
    tpl.order.push("sv-page");
  };
  mark("index", "dark");
  for (const key of Object.keys(spec.templates)) if (key === "product" || key.startsWith("product.")) mark(key, "dark");
  if (spec.templates.cart) mark("cart", "legal");
  spec.templates["404"] = svTemplate([
    ["sv-hero", { layout: "dark", eyebrow: "404", heading: t("Hors des\nsentiers.", "Off the\nbeaten path."), subtitle: t("Cette page n'existe pas\nou a changé de route.", "This page does not exist\nor has taken another road."), product_image_asset: "", show_route: true, height: 760, height_mobile: 560 }],
    ["sv-page", { footer: "light" }],
  ]);
}

export const SILLON_V2_THEME: CatalogTheme = {
  id: "sillon",
  name: "Sillon",
  tagline: "L'espresso nomade, carnet de route",
  description: "Boutique spécialisée d'un objet que l'on emporte : en-tête flottant en capsule, grande ouverture photographique et très grands titres condensés, produit détouré en surplomb devant un cercle cuivre, collage sombre, bandeau cuivre, rituel en trois gestes, carnet d'articles ; fiche avec galerie et carte d'achat sombre, panier, commande, questions, contact, livraison et suivi. Crème minérale, brun espresso, cuivre brûlé et vert grisé ; courbes de niveau et chemins cuivre.",
  bestFor: ["boutique spécialisée", "objet nomade", "café et thé", "petit électroménager", "produit de voyage"],
  en: { tagline: "Nomadic espresso, road journal", description: "Specialty store for an object you take along: floating capsule header, large photographic opening and very large condensed headlines, cut-out product overlapping a copper circle, dark collage, copper band, three-step ritual, journal; product page with gallery and dark buy card, cart, checkout, questions, contact, shipping and tracking. Mineral cream, espresso brown, burnt copper and grey-green; contour lines and copper paths.", bestFor: ["specialty store", "nomadic object", "coffee and tea", "small appliances", "travel product"] },
  fonts: { heading: "anton_n4", body: "dm_sans_n4" },
  previewFonts: { heading: "Anton", body: "DM Sans" },
  motion: "subtle",
  photoMood: "terroir",
  kinds: ["specialty"],
  look: { headerLayout: "menu-right", shape: "floating", icons: "plain", menu: "fullscreen", footer: "wordmark", ann: "static", card: "minimal", button: "solid", radius: { button: 40, card: 14 }, headingCase: "uppercase", tracking: -1, headingScale: 106, glow: 0, shine: false, dark: false, gallery: "grid", pageWidth: 1440, spacing: 100, ds: "craft", density: "airy", buttonUppercase: false },
  settings: { conversion_profile: "none", editorial_profile: "none", motion_intensity: "subtle" },
  headerCta: { fr: "Découvrir", en: "Discover", icon: "arrow" },
  headerSettings: { layout: "menu-right", show_search: false, mobile_menu: "fullscreen" },
  mainProduct: { gallery_layout: "grid", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
  palette: (k) => {
    const cream = k.light("#EEE7D9");
    const night = "#1E1913";
    const sand = "#E2D8C7";
    return [k.scheme(cream, "#211D15", k.onLight(cream)), k.scheme(night, "#F1E9DC", k.onDark(night), 0.06), k.filled("#B35D30"), k.scheme(sand, "#211D15", k.onLight(sand))];
  },
  home: shopHome,
  services: servicesHome,
  product: (k) => [k.faqSec(1, 4, "lines")],
  finish: finishSillon as CatalogTheme["finish"],
};
