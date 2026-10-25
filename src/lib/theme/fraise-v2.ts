/**
 * FRAISE GUMMIES — thème « Produit spécifique / Boutique spécialisée » (identifiant `fraise`), refait d'après les sept
 * planches corrigées de Thomas (24 octobre 2026, `docs/theme-briefs/fraise-gummies/`) : accueil riche, fiche, boutique,
 * recette, histoire, journal et articles, panier et tiroir, commande en quatre étapes, questions, contact, livraison et
 * retours, suivi ; ordinateur et téléphone.
 *
 * Crème, rouge fraise, framboise et rose ; titres ronds et gras (Poppins), italique d'accent (Playfair Display), mots
 * manuscrits (Caveat) et grand titre arrondi (Fraunces) — polices libres SIL OFL ; vagues, pétales et fraises dessinés
 * en SVG. Sections propres au thème : theme-base/sections/fg-*.liquid, feuille fraise.css, script fraise.js.
 *
 * Offres : un format = une variante du même produit (« 1 flacon », « 2 flacons », « 3 flacons ») ; le nombre d'unités
 * est lu dans l'option, les économies et messages sont CALCULÉS à partir des prix des variantes (snippet fg-offer,
 * fraise.js), jamais écrits en dur. Chez un client, ses propres variantes et prix ; sans lots, aucune comparaison.
 *
 * Appliqué à un vrai client (`finish`), le thème reprend SES contenus (nom, accroche, photos, produit et prix) : aucun
 * mot FRAISE, fraise, 60 douceurs ni prix de la démonstration n'est copié. Le paiement passe par Shopify.
 */
import type { CatalogTheme, Kit, Row } from "./theme-catalog";
import type { TemplateJson, ThemeSpec, SectionInstance } from "./spec";
import type { Lang } from "../i18n";
import { pick } from "../i18n";

/** Dessin de l'en-tête et du pied par planche (liens à gauche du logo, bandeau, pied ordinateur et téléphone). */
export type FgPageLook = { split: number; band: "below" | "above" | "center" | "none"; footer: "home" | "product" | "journal" | "contact" | "compact"; footer_mobile: "full" | "center" | "columns" | "help" | "menu" | "compact"; band_mobile?: "none" | "above" };
export const LOOK_01: FgPageLook = { split: 3, band: "below", footer: "home", footer_mobile: "full" };
/** Fiche du produit : pied centré au téléphone (planche 04, fiche 2/2). */
export const LOOK_PRODUCT: FgPageLook = { ...LOOK_01, footer: "product", footer_mobile: "center" };
export const LOOK_02: FgPageLook = { split: 2, band: "above", footer: "journal", footer_mobile: "columns" };
export const LOOK_03: FgPageLook = { split: 4, band: "center", footer: "contact", footer_mobile: "help", band_mobile: "above" };
export const LOOK_BUY: FgPageLook = { split: 4, band: "center", footer: "contact", footer_mobile: "compact" };

/** Pages propres au thème (adresse française et anglaise, titre, gabarit, dessin de la planche). */
export const FG_PAGES = [
  { handle: "la-recette", handleEn: "the-recipe", fr: "La recette", en: "The recipe", suffix: "fg-recette", look: LOOK_02 },
  { handle: "notre-histoire", handleEn: "our-story", fr: "Notre histoire", en: "Our story", suffix: "fg-histoire", look: LOOK_02 },
  { handle: "journal", handleEn: "journal", fr: "Journal", en: "Journal", suffix: "fg-journal", look: LOOK_02 },
  { handle: "journal-les-details-d-un-petit-rituel", handleEn: "journal-the-details-of-a-small-ritual", fr: "Les détails d'un petit rituel", en: "The details of a small ritual", suffix: "fg-article-rituel", look: LOOK_02 },
  { handle: "journal-le-gout-fraise-en-images", handleEn: "journal-strawberry-taste-in-pictures", fr: "Le goût fraise en images", en: "Strawberry taste in pictures", suffix: "fg-article-gout", look: LOOK_02 },
  { handle: "journal-une-pause-cote-cuisine", handleEn: "journal-a-break-in-the-kitchen", fr: "Une pause côté cuisine", en: "A break in the kitchen", suffix: "fg-article-cuisine", look: LOOK_02 },
  { handle: "journal-le-flacon-sous-tous-les-angles", handleEn: "journal-the-jar-from-every-angle", fr: "Le flacon sous tous les angles", en: "The jar from every angle", suffix: "fg-article-flacon", look: LOOK_02 },
  { handle: "journal-lire-une-etiquette", handleEn: "journal-reading-a-label", fr: "Lire une étiquette simplement", en: "Reading a label simply", suffix: "fg-article-etiquette", look: LOOK_02 },
  { handle: "journal-conserver-son-flacon", handleEn: "journal-keeping-your-jar", fr: "Conserver son flacon", en: "Keeping your jar", suffix: "fg-article-conservation", look: LOOK_02 },
  { handle: "commande", handleEn: "checkout-demo", fr: "Commande", en: "Checkout", suffix: "fg-commande", look: LOOK_BUY },
  { handle: "faq", handleEn: "faq", fr: "Questions fréquentes", en: "Frequently asked questions", suffix: "fg-faq", look: LOOK_03 },
  { handle: "contact", handleEn: "contact", fr: "Contact", en: "Contact", suffix: "fg-contact", look: LOOK_03 },
  { handle: "livraison-et-retours", handleEn: "shipping-and-returns", fr: "Livraison et retours", en: "Shipping and returns", suffix: "fg-livraison", look: LOOK_03 },
  { handle: "suivi-de-commande", handleEn: "order-tracking", fr: "Suivi de commande", en: "Order tracking", suffix: "fg-suivi", look: LOOK_03 },
  { handle: "mentions-legales", handleEn: "legal-notice", fr: "Mentions légales", en: "Legal notice", suffix: "fg-legal-mentions", look: LOOK_03 },
  { handle: "conditions-de-vente", handleEn: "terms-of-sale", fr: "Conditions générales de vente", en: "Terms of sale", suffix: "fg-legal-cgv", look: LOOK_03 },
  { handle: "confidentialite", handleEn: "privacy", fr: "Politique de confidentialité", en: "Privacy policy", suffix: "fg-legal-confidentialite", look: LOOK_03 },
  { handle: "cookies", handleEn: "cookies", fr: "Cookies", en: "Cookies", suffix: "fg-legal-cookies", look: LOOK_03 },
] as const;
export type FgPageHandle = (typeof FG_PAGES)[number]["handle"];
export const fgHandle = (h: FgPageHandle, lang: Lang = "fr") => (lang === "en" ? FG_PAGES.find((p) => p.handle === h)!.handleEn : h);
export const fgUrl = (h: FgPageHandle, lang: Lang = "fr") => `/pages/${fgHandle(h, lang)}`;

/** Gabarit à partir de lignes [type, réglages, blocs, options] (identifiants lisibles, stables). */
export function fgTemplate(rows: Row[]): TemplateJson {
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

/** Ligne « Réglages de la page » (dessin de l'en-tête et du pied de la planche). */
export const pageRow = (look: FgPageLook): Row => ["fg-page", { ...look }];

/** Réglages de l'en-tête (couleurs et polices des planches ; boutique réelle : paiement Shopify). */
export function headerSettings(lang: Lang, o: { demo: boolean; checkoutPage?: string; cookiesLink: string; logo?: string; bandBrand?: string; bandText?: string; copyright?: string; lineBrand?: string; units?: string }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return {
    logo_asset: o.logo ?? "", wordmark: "", menu: "main-menu", split: 3, nav_label: t("Navigation principale", "Main navigation"), cart_label: t("Panier", "Cart"),
    band_brand: o.bandBrand ?? "", band_text: o.bandText ?? "",
    show_search: true, search_label: t("Rechercher", "Search"), search_placeholder: t("Rechercher…", "Search…"), search_close: t("Fermer la recherche", "Close search"),
    search_title: t("Pages du site", "Site pages"), search_menu: "search-pages", search_empty: t("Aucune page ne correspond. Appuyez sur Entrée pour chercher dans la boutique.", "No page matches. Press Enter to search the shop."),
    menu_mobile: "", menu_chevrons: 3, menu_label: "Menu", menu_open_label: t("Ouvrir le menu", "Open the menu"), menu_close_label: t("Fermer le menu", "Close the menu"),
    menu_cart_label: t("Mon panier", "My cart"), menu_legal: "legal-short", menu_copyright: o.copyright ?? "",
    drawer_title: t("Mon panier", "My cart"), drawer_close_label: t("Fermer le panier", "Close the cart"), drawer_subtotal: t("Sous-total", "Subtotal"), drawer_shipping: t("Livraison", "Shipping"),
    drawer_shipping_value: t("Calculée à l’étape suivante", "Calculated at the next step"), drawer_checkout: t("Passer commande", "Check out"), drawer_view: t("Voir mon panier", "View my cart"),
    drawer_less: t("Retirer un lot", "Remove one pack"), drawer_more: t("Ajouter un lot", "Add one pack"), drawer_remove: t("Supprimer", "Remove"),
    drawer_units: o.units ?? t("[n] unités au total", "[n] units in total"), drawer_packs: t("[q] lot(s)", "[q] pack(s)"), drawer_brand: o.lineBrand ?? "",
    qty_label: t("Quantité : [q]", "Quantity: [q]"), fix_label: t("Vérifiez les champs signalés.", "Please check the highlighted fields."),
    color_cream: "#FCF6EE", color_blush: "#FBE3DB", color_pink: "#F7C9BF", color_red: "#E3363E", color_deep: "#C8282F", color_crimson: "#970824", color_ink: "#230605", color_text: "#5A4C4A", color_yellow: "#FFD84D",
    demo_mode: o.demo, checkout_mode: o.demo ? "demo" : "shopify", checkout_page: o.checkoutPage ?? "",
    added_label: t("Ajouté au panier.", "Added to cart."), removed_label: t("Article retiré du panier.", "Item removed from cart."), error_label: t("Une erreur est survenue. Réessayez.", "Something went wrong. Please try again."),
    show_cookies: true, cookies_title: t("Vos préférences de cookies", "Your cookie preferences"),
    cookies_text: t("Les cookies nécessaires font fonctionner le site. La mesure d'audience est facultative et ne démarre qu'avec votre accord.", "Necessary cookies make the site work. Audience measurement is optional and only starts with your consent."),
    cookies_link: o.cookiesLink, cookies_more: t("En savoir plus", "Learn more"), cookies_needed: t("Cookies nécessaires au fonctionnement", "Cookies necessary for the site to work"),
    cookies_stats: t("Mesure d'audience (facultatif)", "Audience measurement (optional)"), cookies_accept: t("Tout accepter", "Accept all"), cookies_refuse: t("Tout refuser", "Refuse all"),
    cookies_custom: t("Personnaliser", "Customise"), cookies_save: t("Enregistrer mes choix", "Save my choices"),
  };
}

/** Réglages du pied de page (une seule source ; la disposition est choisie page par page). */
export function footerSettings(lang: Lang, o: { logo?: string; bottom?: string; copyright?: string; mobileText?: string; socialPlaceholder?: boolean }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return {
    logo_asset: o.logo ?? "", wordmark: "", shop_title: t("Boutique", "Shop"), menu_shop: "footer-shop", help_title: t("Aide", "Help"), menu_help: "footer",
    menu_info: "footer-info", menu_legal: "legal", menu_legal_help: "legal-help", menu_short: "legal-buy", bottom_text: o.bottom ?? "", copyright: o.copyright ?? "",
    journal_title: t("Inscrivez-vous à notre journal", "Sign up to our journal"), contact_title: t("Restons en contact", "Let's stay in touch"),
    mobile_news_title: t("Restons en contact !", "Let's stay in touch!"), mobile_news_text: o.mobileText ?? "",
    news_placeholder: t("Votre adresse e-mail", "Your email address"), news_button: t("S'inscrire", "Sign up"),
    news_done: t("Merci, votre inscription est enregistrée.", "Thank you, you are signed up."), news_demo: t("Démonstration : aucune inscription n'est transmise.", "Demo: no sign-up is sent."),
    social_title: t("Suivez-nous", "Follow us"), instagram_url: "", pinterest_url: "", facebook_url: "", social_placeholder: !!o.socialPlaceholder, social_todo: t("Compte à compléter", "Account to be added"),
    m_explore: t("Explorer", "Explore"), m_help: t("Aide", "Help"), m_info: t("Informations", "Information"),
  };
}

/** Accueil d'un CLIENT : ouverture avec SES textes et SA photo, produit et formats, détails, questions (rien de FRAISE). */
function shopHome(k: Kit): (Row | Row[])[] {
  const t = k.t;
  const photo = k.im.lifestyle ?? k.im.hero ?? k.im.banner ?? k.im.packshot ?? "";
  const details = [k.im.detail1, k.im.detail2, k.im.scene1].filter((x): x is string => !!x);
  return [
    k.lib("fg-hero", 1, { layout: "home", heading: k.hero.heading, text: k.hero.text ? `<p>${k.hero.text}</p>` : "", button_label: k.hero.cta || t("Découvrir le produit", "Discover the product"), image_asset: photo, stamp: "", height: 400 }),
    k.lib("fg-offers", 1, { layout: "home", heading: t("Choisissez\n[i]votre format.[/i]", "Choose\n[i]your format.[/i]"), button_label: t("Ajouter au panier", "Add to cart") }, { blocks: [1, 2, 3].map((i) => ({ type: "offer", settings: { variant_index: i, image_asset: i === 1 ? k.im.packshot ?? "" : "" } })) }),
    k.lib("fg-details", 1, { heading: t("Les détails\n[i]qui comptent.[/i]", "The details\n[i]that matter.[/i]"), text: "", button_label: "" }, { hide: details.length < 2, blocks: details.map((f) => ({ type: "photo", settings: { image_asset: f } })) }),
    k.faqSec(1, 4, "lines"),
    k.newsletter(1),
  ];
}

/** Site de services : thème réservé aux boutiques (composition de secours si un projet de services le choisit). */
function servicesHome(k: Kit): (Row | Row[])[] {
  return [
    k.lib("fg-hero", 1, { layout: "home", heading: k.hero.heading, text: k.hero.text ? `<p>${k.hero.text}</p>` : "", button_label: k.t("Nous contacter", "Contact us"), button_link: "/pages/contact", image_asset: k.im.lifestyle ?? k.im.hero ?? "", height: 400 }),
    k.R.servicesList(1, "cards", { withImages: true }),
    k.R.practical(1),
    k.faqSec(1, 5, "lines"),
    k.R.contactForm(1, k.t("Une question ?", "A question?")),
    k.newsletter(1),
  ];
}

export type FinishCtx = { kit: Kit; lang: Lang; services: boolean; shopName: string; address: string; phone: string; email: string; hours: string; contactUrl: string; bookingLabel: string; bookingLink: string; legalUrl: string };

/**
 * Finition commune (démonstration et clients) : en-tête et pied du thème (ceux de base restent, désactivés), réglages de
 * page (dessin de la planche), panier du thème et page introuvable. Les pages propres au thème sont posées par la
 * démonstration ; chez un client, rien de la démonstration n'est copié.
 */
export function finishFraise(spec: ThemeSpec, ctx: FinishCtx) {
  const lang = ctx.lang;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const header = spec.groups.header;
  for (const id of header.order) if (header.sections[id]?.type === "header" || header.sections[id]?.type === "announcement-bar") header.sections[id].disabled = true;
  if (!header.order.some((id) => header.sections[id]?.type === "fg-header")) {
    header.sections["fg-header"] = { type: "fg-header", settings: headerSettings(lang, { demo: false, cookiesLink: fgUrl("cookies", lang) }) };
    header.order.push("fg-header");
  }
  // Le tiroir de panier est celui de l'en-tête FRAISE : celui du thème de base n'est pas rendu (pas de doublon).
  if (spec.settings.cart_type === "drawer") spec.settings.cart_type = "page";
  // Polices, feuille et script du thème chargés par la mise en page (exportés avec le thème vers les autres plateformes).
  spec.settings.theme_kit = "fraise";
  const footer = spec.groups.footer;
  for (const id of footer.order) if (footer.sections[id]?.type === "footer") footer.sections[id].disabled = true;
  if (!footer.order.some((id) => footer.sections[id]?.type === "fg-footer")) {
    footer.sections["fg-footer"] = { type: "fg-footer", settings: footerSettings(lang, {}) };
    footer.order.push("fg-footer");
  }
  const mark = (key: string, look: FgPageLook) => {
    const tpl = spec.templates[key];
    if (!tpl || tpl.order.some((id) => tpl.sections[id]?.type === "fg-page")) return;
    tpl.sections["fg-page"] = { type: "fg-page", settings: { ...look } };
    tpl.order.push("fg-page");
  };
  mark("index", LOOK_01);
  for (const key of Object.keys(spec.templates)) if (key === "product" || key.startsWith("product.")) mark(key, LOOK_PRODUCT);
  if (spec.templates.cart && !spec.templates.cart.order.some((id) => spec.templates.cart.sections[id]?.type === "fg-cart")) {
    spec.templates.cart = fgTemplate([
      ["fg-hero", { layout: "page", variant: "a", heading: t("Votre panier.", "Your cart."), text: "", image_asset: "", height: 300, height_mobile: 200 }],
      ["fg-cart", cartSettings(lang, { checkoutPage: "", shopLink: "" })],
    ]);
  }
  if (spec.templates.cart) mark("cart", LOOK_BUY);
  spec.templates["404"] = fgTemplate([
    ["fg-hero", { layout: "page", variant: "a", eyebrow: "404", heading: t("Cette page\n[i]s'est envolée.[/i]", "This page\n[i]has flown away.[/i]"), text: t("<p>Elle n'existe pas ou a changé d'adresse.</p>", "<p>It does not exist or has moved.</p>"), button_label: t("Retour à l'accueil", "Back to home"), button_link: "/", image_asset: "", height: 420, height_mobile: 420 }],
    pageRow(LOOK_03),
  ]);
}

/** Réglages du panier (textes des planches 03 et 07 ; une seule source pour le panier rempli, vide et ses lignes). */
export function cartSettings(lang: Lang, o: { checkoutPage: string; shopLink: string; emptyImage?: string; footImage?: string; units?: string; emptyTitle?: string; emptyButton?: string }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return {
    col_product: t("Produit", "Product"), col_price: t("Prix", "Price"), col_qty: t("Quantité", "Quantity"), col_total: t("Total", "Total"),
    subtotal_label: t("Sous-total", "Subtotal"), shipping_label: t("Livraison", "Shipping"), shipping_value: t("Calculée à l’étape suivante", "Calculated at the next step"),
    total_label: t("Total des produits", "Products total"), total_note: t("Hors livraison", "Excluding shipping"),
    checkout_label: t("Passer commande", "Check out"), checkout_page: o.checkoutPage, continue_label: t("Continuer mes achats", "Continue shopping"), continue_link: o.shopLink,
    units_label: o.units ?? t("[n] unités au total", "[n] units in total"), packs_label: t("Lots", "Packs"),
    less_label: t("Retirer un lot", "Remove one pack"), more_label: t("Ajouter un lot", "Add one pack"), remove_label: t("Supprimer", "Remove"),
    empty_title: o.emptyTitle ?? t("Votre panier\nvous attend.", "Your cart\nis waiting."), empty_text: t("Votre panier est vide.", "Your cart is empty."), empty_sub: "",
    empty_button: o.emptyButton ?? t("Découvrir la boutique", "Visit the shop"), empty_link: o.shopLink, empty_image_asset: o.emptyImage ?? "", foot_image_asset: o.footImage ?? "",
  };
}

export const FRAISE_V2_THEME: CatalogTheme = {
  id: "fraise",
  name: "Fraise",
  tagline: "Gourmand, rond et fraise, un produit en trois formats",
  description: "Boutique spécialisée d'une confiserie vendue en trois formats : en-tête au logo centré et bandeau rouge, grande ouverture photographique, goût et produit, détails sur bande rose à vagues, trois formats aux prix de lot calculés, quotidien, recette et journal, questions, inscription ; fiche avec galerie verticale, formats, texture, usages, informations et barre d'achat ; boutique, recette, histoire, journal, panier et tiroir, commande en quatre étapes, aide. Crème, rouge fraise, framboise et rose ; titres ronds, italique d'accent et mots manuscrits.",
  bestFor: ["boutique spécialisée", "confiserie", "produit vendu par lots", "épicerie fine", "produit gourmand"],
  en: { tagline: "Sweet, round and strawberry: one product in three formats", description: "Specialty store for a confection sold in three formats: centred-logo header with a red band, large photographic opening, taste and product, details on a wavy pink band, three formats with computed pack prices, everyday use, recipe and journal, questions, sign-up; product page with vertical gallery, formats, texture, uses, information and buy bar; shop, recipe, story, journal, cart and drawer, four-step checkout, help pages. Cream, strawberry red, raspberry and pink; round headings, accent italics and handwritten words.", bestFor: ["specialty store", "confectionery", "product sold in packs", "fine food", "treat"] },
  fonts: { heading: "poppins_n7", body: "dm_sans_n4" },
  previewFonts: { heading: "Poppins", body: "DM Sans" },
  motion: "subtle",
  photoMood: "pop",
  kinds: ["specialty"],
  look: { headerLayout: "logo-center", shape: "bar", icons: "plain", menu: "fullscreen", footer: "columns", ann: "static", card: "boxed", button: "solid", radius: { button: 26, card: 14 }, headingCase: "none", tracking: -1, headingScale: 100, glow: 0, shine: false, dark: false, gallery: "grid", pageWidth: 1440, spacing: 100, ds: "product", density: "balanced", buttonUppercase: false },
  // Polices : titres Poppins (graisses 500 à 800) et italique d'accent Playfair Display 800 ; capitales à empattements = Playfair
  // Display 700 (dérivée par la mise en page, habillage « fraise »).
  settings: { conversion_profile: "none", editorial_profile: "none", motion_intensity: "subtle", theme_kit: "fraise", type_accent_font: "playfair_display_i8" },
  headerSettings: { layout: "logo-center", show_search: true, mobile_menu: "fullscreen" },
  mainProduct: { gallery_layout: "grid", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
  palette: (k) => {
    const cream = k.light("#FCF6EE");
    return [k.scheme(cream, "#230605", k.onLight(cream)), k.scheme("#230605", "#FCF6EE", k.onDark("#230605"), 0.06), k.filled("#E3363E"), k.scheme("#FBE3DB", "#230605", k.onLight("#FBE3DB"))];
  },
  home: shopHome,
  services: servicesHome,
  product: (k) => [k.faqSec(1, 4, "lines")],
  finish: finishFraise as CatalogTheme["finish"],
};
