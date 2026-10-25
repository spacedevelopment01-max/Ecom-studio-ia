/**
 * En-têtes et pieds de page par famille (issue #141) : cinq dispositions chacun, qui sont des RÉGLAGES des sections
 * « header » et « footer » (pas de faux types de section). Chaque famille a ses priorités :
 *  - boutique spécialisée : accès direct au produit (recherche, panier, bouton d'achat) ;
 *  - e-commerce : navigation dans le catalogue (méga menu, collections, cartes) ;
 *  - services : accès aux prestations et au contact (bouton d'action, téléphone, rendez-vous), sans panier ni recherche.
 * La disposition n° 1 de chaque famille reproduit à l'identique celle des thèmes validés (FRAISE / ONDE, ORBE, Atelier
 * Rive) : rien n'est remplacé automatiquement, l'utilisateur choisit. Les barres d'annonce restent avec l'en-tête.
 *
 * Appliquer une disposition ne change QUE la mise en forme : logo, menus, textes, blocs et couleurs du projet sont
 * conservés. Les libellés de bouton ne remplissent qu'un champ vide (une saisie de l'utilisateur n'est jamais écrasée).
 */
import type { Lang } from "../i18n";
import type { FamilyId } from "./section-families";

type T = { fr: string; en: string };
export type ChromePart = "header" | "footer";
export type ChromePreset = {
  id: string;
  label: T;
  description: T;
  /** Réglages de mise en forme posés tels quels. */
  settings: Record<string, unknown>;
  /** Réglages remplis seulement s'ils sont vides (libellés, liens). */
  fill?: Record<string, T | string>;
  /** Blocs ajoutés au pied de page s'il n'en a aucun de ce type (contenu repris du projet ou « à compléter »). */
  ensureBlocks?: string[];
  /** Vignette : dessin neutre de la disposition. */
  thumb: string;
};

const p = (id: string, fr: string, en: string, dfr: string, den: string, thumb: string, settings: Record<string, unknown>, extra: Partial<ChromePreset> = {}): ChromePreset => ({ id, label: { fr, en }, description: { fr: dfr, en: den }, thumb, settings, ...extra });


export const HEADER_PRESETS: Record<FamilyId, ChromePreset[]> = {
  specialty: [
    p("centered", "Logo centré, recherche et panier", "Centred logo, search and cart", "Disposition actuelle de FRAISE et ONDE : logo au centre, menu en tiroir sur téléphone, panier toujours visible.", "Current FRAISE and ONDE layout: centred logo, drawer menu on phone, cart always visible.", "header-centered", { layout: "logo-center", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer", sticky: true, transparent_on_home: false, show_search: true, show_cart: true }),
    p("product-menu", "Produit en avant dans le menu", "Product featured in the menu", "Logo à gauche ; le sous-menu ouvre une fiche produit mise en avant ; icônes compte, recherche et panier.", "Logo on the left; the submenu opens a featured product; account, search and cart icons.", "header-mega-featured", { layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "featured", desktop_icons: true, mobile_menu: "drawer", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: true, show_cart: true }),
    p("buy-button", "Bouton d'achat visible", "Visible buy button", "Logo à gauche, menu à droite et bouton d'achat permanent vers le produit ; panier à côté.", "Logo on the left, menu on the right and a permanent buy button to the product; cart beside it.", "header-cta", { layout: "menu-right", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "sheet", sticky: true, transparent_on_home: false, show_search: false, show_cart: true, cta_icon: "arrow" }, { fill: { cta_label: { fr: "Commander", en: "Order now" }, cta_link: "/collections/all" } }),
    p("floating", "Barre flottante arrondie", "Rounded floating bar", "En-tête détaché du bord, coins arrondis, icônes en pastilles ; menu en panneau bas sur téléphone.", "Header detached from the edge, rounded corners, pill icons; bottom sheet menu on phone.", "header-floating", { layout: "logo-left", shape: "pill", icons: "circles", mega_menu: "none", mobile_menu: "sheet", sticky: true, transparent_on_home: false, show_search: true, show_cart: true }),
    p("two-rows", "Deux rangées avec offre", "Two rows with offer", "Logo et icônes en haut, menu dessous avec une offre dans le sous-menu ; offre rappelée en haut du menu téléphone.", "Logo and icons on top, menu below with an offer in the submenu; offer repeated at the top of the phone menu.", "header-two-rows", { layout: "two-rows", shape: "bar", icons: "plain", mega_menu: "columns-promo", mobile_menu: "cards", mobile_promo: "top", sticky: true, transparent_on_home: false, show_search: true, show_cart: true }),
    // TRAVERSE (dossier du 23 octobre) : nom condensé à gauche, menu des pages au centre, panier seul à droite.
    p("outdoor", "Menu au centre, panier à droite", "Centred menu, cart on the right", "Nom ou logo à gauche, menu des pages au centre, panier seul à droite ; tiroir à droite sur téléphone.", "Name or logo on the left, page menu in the centre, cart alone on the right; right-hand drawer on phone.", "header-nav-left", { layout: "nav-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer-right", show_search: false, show_cart: true }),
  ],
  catalog: [
    p("classic", "Logo à gauche, catalogue en tiroir", "Logo left, catalogue drawer", "Disposition actuelle d'ORBE : logo à gauche, menu en ligne, recherche et panier ; tiroir sur téléphone.", "Current ORBE layout: logo on the left, inline menu, search and cart; drawer on phone.", "header-classic", { layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer", sticky: true, transparent_on_home: false, show_search: true }),
    p("mega-columns", "Méga menu en colonnes", "Column mega menu", "Les collections s'ouvrent en colonnes avec une image de campagne ; sous-menus en accordéon sur téléphone.", "Collections open in columns with a campaign image; accordion submenus on phone.", "header-mega-columns", { layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "columns-promo", desktop_icons: true, mobile_menu: "drawer", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: true, show_cart: true }),
    p("mega-cards", "Collections en cartes", "Collections as cards", "Deux rangées : le menu ouvre les collections en cartes illustrées ; menu téléphone en cartes.", "Two rows: the menu opens collections as illustrated cards; card menu on phone.", "header-mega-cards", { layout: "two-rows", shape: "bar", icons: "plain", mega_menu: "cards", mobile_menu: "cards", mobile_submenu: "open", sticky: true, transparent_on_home: false, show_search: true, show_cart: true }),
    p("centered-nav", "Logo centré, menu à gauche", "Centred logo, menu on the left", "Menu du catalogue à gauche, logo au centre, icônes à droite ; menu plein écran sur téléphone.", "Catalogue menu on the left, centred logo, icons on the right; full-screen menu on phone.", "header-nav-left", { layout: "nav-left", shape: "bar", icons: "plain", mega_menu: "columns", mobile_menu: "fullscreen", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: true, show_cart: true }),
    p("store", "Boutique éditoriale", "Editorial store", "En-tête de boutique de référence : navigation large, produit mis en avant dans le sous-menu, tiroir à droite.", "Reference store header: wide navigation, featured product in the submenu, right-hand drawer.", "header-store", { layout: "reference-shop", shape: "bar", icons: "plain", mega_menu: "featured", mobile_menu: "drawer-right", sticky: true, transparent_on_home: false, show_search: true, show_cart: true }),
    // HEUREN (maquette du 22 octobre) : nom à gauche, menu au centre, en-tête transparent posé sur l'ouverture de l'accueil.
    p("transparent", "Transparent sur l'ouverture", "Transparent over the opening", "Nom ou logo à gauche, menu au centre, icônes à droite ; transparent sur la grande photo de l'accueil, puis sur fond uni au défilement.", "Name or logo on the left, menu in the centre, icons on the right; transparent over the home page's large photo, then solid when scrolling.", "header-transparent", { layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "fullscreen", mobile_submenu: "accordion", sticky: true, transparent_on_home: true, show_search: true, show_cart: true }),
  ],
  services: [
    p("contact", "Logo à gauche et bouton de contact", "Logo left and contact button", "Disposition d'Atelier Rive (maquette du 23 octobre) : nom à gauche, menu des pages au centre, bouton de contact plein ; ni panier ni recherche.", "Atelier Rive layout (23 October mockup): name on the left, page menu in the centre, solid contact button; no cart or search.", "header-cta", { layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer-right", sticky: true, transparent_on_home: false, show_search: false, show_cart: false, cta_icon: "arrow" }, { fill: { cta_label: { fr: "Nous contacter", en: "Contact us" }, cta_link: "/pages/contact" } }),
    p("phone", "Téléphone en évidence", "Phone up front", "Numéro de téléphone cliquable dans l'en-tête et bouton de devis ; pensé pour les demandes rapides.", "Clickable phone number in the header and a quote button; built for quick requests.", "header-phone", { layout: "menu-right", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "sheet", sticky: true, transparent_on_home: false, show_search: false, show_cart: false, cta_icon: "phone" }, { fill: { cta_label: { fr: "Demander un devis", en: "Request a quote" }, cta_link: "/pages/contact" } }),
    p("booking", "Prise de rendez-vous", "Appointment booking", "Logo centré, bouton « Prendre rendez-vous » toujours visible ; menu plein écran sur téléphone.", "Centred logo, “Book an appointment” button always visible; full-screen menu on phone.", "header-centered", { layout: "logo-center", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "fullscreen", sticky: true, transparent_on_home: false, show_search: false, show_cart: false, cta_icon: "clock" }, { fill: { cta_label: { fr: "Prendre rendez-vous", en: "Book an appointment" }, cta_link: "/pages/contact" } }),
    p("services-menu", "Menu des prestations", "Services menu", "Le menu ouvre les prestations en colonnes ; bouton de contact ; panneau bas sur téléphone.", "The menu opens services in columns; contact button; bottom sheet on phone.", "header-mega-columns", { layout: "split", shape: "bar", icons: "plain", mega_menu: "columns", mobile_menu: "sheet", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: false, show_cart: false, cta_icon: "mail" }, { fill: { cta_label: { fr: "Nous écrire", en: "Write to us" }, cta_link: "/pages/contact" } }),
    p("studio", "Studio flottant", "Floating studio", "En-tête de studio détaché du bord, bouton de contact discret ; tiroir à droite sur téléphone.", "Studio header detached from the edge, discreet contact button; right-hand drawer on phone.", "header-floating", { layout: "reference-studio", shape: "floating", icons: "plain", mega_menu: "none", mobile_menu: "drawer-right", sticky: true, transparent_on_home: false, show_search: false, show_cart: false, cta_icon: "arrow" }, { fill: { cta_label: { fr: "Parlons de votre projet", en: "Tell us about your project" }, cta_link: "/pages/contact" } }),
  ],
};

export const FOOTER_PRESETS: Record<FamilyId, ChromePreset[]> = {
  specialty: [
    p("columns", "Colonnes d'aide et d'informations", "Help and information columns", "Disposition actuelle de FRAISE et ONDE : marque, liens d'aide, lectures, informations et lettre d'information.", "Current FRAISE and ONDE layout: brand, help links, reading, information and newsletter.", "footer-columns", { style: "columns" }),
    p("centered", "Centré avec lettre d'information", "Centred with newsletter", "Logo et inscription au centre, liens en ligne dessous : pour une marque à produit phare.", "Logo and sign-up in the centre, links in a row below: for a hero-product brand.", "footer-centered", { style: "centered" }, { ensureBlocks: ["newsletter"] }),
    p("card", "Carte d'assistance", "Support card", "Les canaux d'aide et la lettre d'information dans une carte détachée du fond.", "Help channels and newsletter in a card lifted from the background.", "footer-card", { style: "card" }, { ensureBlocks: ["links", "newsletter"] }),
    p("wordmark", "Grand nom de marque", "Large brand name", "Liens en colonnes et nom de marque en très grand en bas de page.", "Links in columns and the brand name set very large at the bottom.", "footer-wordmark", { style: "wordmark", show_wordmark: true }),
    p("minimal", "Sobre", "Minimal", "Une ligne : logo, liens essentiels et mentions ; pour une page produit très courte.", "One line: logo, essential links and legal; for a very short product page.", "footer-minimal", { style: "minimal" }),
    // TRAVERSE (dossier du 23 octobre) : marque et phrase à gauche, liens, inscription, mentions en bas de page.
    p("brand-left", "Marque à gauche, liens et inscription", "Brand on the left, links and sign-up", "Nom et phrase de marque à gauche, colonnes de liens, inscription à la lettre d'information ; mentions légales en bas.", "Brand name and line on the left, link columns, newsletter sign-up; legal links at the bottom.", "footer-columns", { style: "brand-left" }, { ensureBlocks: ["links", "newsletter"] }),
  ],
  catalog: [
    p("minimal", "Sobre avec plan du catalogue", "Minimal with catalogue map", "Disposition actuelle d'ORBE : marque, liens boutique et aide, lettre d'information, mentions.", "Current ORBE layout: brand, shop and help links, newsletter, legal.", "footer-minimal", { style: "minimal" }),
    p("columns", "Plan du catalogue en colonnes", "Catalogue map in columns", "Toutes les collections et l'aide en colonnes, lettre d'information à droite.", "All collections and help in columns, newsletter on the right.", "footer-columns", { style: "columns" }, { ensureBlocks: ["links", "newsletter"] }),
    p("store", "Boutique éditoriale", "Editorial store", "Pied de page de boutique de référence : grande signature, collections, réseaux.", "Reference store footer: large signature, collections, social links.", "footer-store", { style: "reference-shop" }, { ensureBlocks: ["links", "social"] }),
    p("boxed", "Encadré", "Boxed", "Liens et inscription dans un cadre, mentions dessous ; lisible sur fond clair comme sombre.", "Links and sign-up inside a frame, legal below; readable on light and dark backgrounds.", "footer-boxed", { style: "boxed" }, { ensureBlocks: ["links", "newsletter"] }),
    p("stacked", "Empilé", "Stacked", "Blocs empilés pleine largeur, pensés d'abord pour le téléphone.", "Full-width stacked blocks, designed for phone first.", "footer-stacked", { style: "stacked" }),
  ],
  services: [
    p("signature", "Signature et liens sur une ligne", "Signature and links on one line", "Disposition d'Atelier Rive (maquette du 23 octobre) : grand nom à gauche, pages et mentions sur une ligne, fond blanc.", "Atelier Rive layout (23 October mockup): large name on the left, pages and legal links on one line, white background.", "footer-minimal", { style: "minimal" }),
    p("split", "Marque et coordonnées", "Brand and contact details", "Signature à gauche, pages, coordonnées et informations à droite.", "Signature on the left, pages, contact details and information on the right.", "footer-split", { style: "split" }),
    p("brand-left", "Coordonnées en avant", "Contact details first", "Adresse, téléphone et horaires mis en avant à gauche ; prestations et informations à droite.", "Address, phone and hours featured on the left; services and information on the right.", "footer-brand-left", { style: "brand-left" }, { ensureBlocks: ["contact"] }),
    p("studio", "Studio", "Studio", "Pied de page de studio de référence : grande phrase de contact, liens discrets.", "Reference studio footer: large contact line, discreet links.", "footer-studio", { style: "reference-studio" }, { ensureBlocks: ["contact"] }),
    p("centered", "Centré", "Centred", "Signature, coordonnées et liens centrés ; idéal pour une activité locale.", "Signature, contact details and links centred; ideal for a local business.", "footer-centered", { style: "centered" }, { ensureBlocks: ["contact"] }),
    p("card", "Carte de contact", "Contact card", "Les coordonnées et la zone d'intervention dans une carte, liens à côté.", "Contact details and service area in a card, links beside them.", "footer-card", { style: "card" }, { ensureBlocks: ["contact", "links"] }),
  ],
};

/**
 * Dispositions d'en-tête ou de pied de page proposées (mission #190 : plus de familles) : toutes, celles conçues pour
 * l'usage prévu du projet en premier ; un identifiant déjà vu n'est pas répété.
 */
export function chromePresets(prefer: FamilyId | null | undefined, part: ChromePart): ChromePreset[] {
  const all = part === "header" ? HEADER_PRESETS : FOOTER_PRESETS;
  const order = [...(prefer ? [prefer] : []), ...(["specialty", "catalog", "services"] as FamilyId[]).filter((f) => f !== prefer)];
  const seen = new Set<string>();
  // Site de prestations (sans produits) : jamais un en-tête qui afficherait un panier ou une recherche de produits.
  const noShop = (x: ChromePreset) => prefer !== "services" || (x.settings.show_cart !== true && x.settings.show_search !== true);
  return order.flatMap((f) => all[f]).filter((x) => noShop(x) && (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

/** Disposition actuelle d'un en-tête ou pied de page : la première dont tous les réglages de mise en forme concordent. */
export function currentChromePreset(family: FamilyId | null | undefined, part: ChromePart, settings: Record<string, unknown>, defaults: Record<string, unknown> = {}): ChromePreset | null {
  const val = (k: string) => (settings[k] === undefined ? defaults[k] : settings[k]);
  return chromePresets(family, part).find((x) => Object.entries(x.settings).every(([k, v]) => String(val(k) ?? "") === String(v))) ?? null;
}

export const fillValue = (v: T | string, lang: Lang) => (typeof v === "string" ? v : lang === "en" ? v.en : v.fr);
