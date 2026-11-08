/**
 * SINA (#492), étapes 6 et 7 : inventaire EXACT des pages d'un site (docs/syna/PARCOURS-CREATION.md, étape 6 :
 * « aucune page oubliée »). Une seule source pour les maquettes (étape 6), leur couverture et le code du site
 * (étape 7). Chaque page existe en version ordinateur (1440 px) et téléphone (390 px), avec en-tête et pied de page.
 * Boutique : pas de page de paiement (fournie par la plateforme). Services : leurs pages, réservation si le métier
 * s'y prête. Fichier sans accès à la base (pur), testé tel quel.
 */
import type { ActivityCategory, ContactMode, StoreType } from "../../project-types";

export type Viewport = "desktop" | "phone";
/** Largeurs de référence des maquettes (ordinateur, téléphone). */
export const VIEWPORT_WIDTH: Record<Viewport, number> = { desktop: 1440, phone: 390 };
export const VIEWPORTS: Viewport[] = ["desktop", "phone"];
/** Largeurs contrôlées sur le site codé (charte § 6.9 : aucun débordement). */
export const CHECK_WIDTHS = [1440, 768, 430, 390, 360] as const;

/** Famille de page : sert au regroupement des maquettes et à la correspondance des sections. */
export type PageGroup = "accueil" | "vente" | "compte" | "contenu" | "service" | "legal" | "systeme";

export type MockupPage = {
  /** Identifiant stable (« home », « product:bougies », « booking-manage »…). */
  key: string;
  fr: string;
  en: string;
  group: PageGroup;
  /** Gabarit visé dans le thème (« index », « product », « page.<suffixe> », « customers/login »…). */
  template: string;
  /** Adresse d'aperçu (null : page non rendue par l'aperçu du Studio, ex. comptes clients Shopify). */
  path: string | null;
  /** Page à créer dans le thème si elle n'existe pas encore (adresse lisible en français). */
  handle?: string;
  /** Sections attendues, dans l'ordre (indications pour la maquette et l'analyse). */
  sections: string[];
  viewports: Viewport[];
  /** Page clé : une image à elle seule sur la maquette ordinateur. */
  key_page?: boolean;
  /** État ou variante d'une autre page (panier vide, recherche sans résultat…) : même gabarit. */
  variantOf?: string;
  /** Visible dans le menu principal. */
  nav?: boolean;
};

export type InventoryOptions = {
  /** Types de produits (une fiche par type) ; défaut : une fiche produit. */
  productTypes?: { key: string; name: string }[];
  sizeGuide?: boolean;
  /** Services : façons de contacter (réservation → pages de rendez-vous). */
  contactModes?: ContactMode[];
  activity?: ActivityCategory;
  /** Secteur du projet (restaurant, immobilier, salon…) : pages propres au métier. */
  sector?: string | null;
  /** Blog (liste et article, prévus pour l'étape 12) ; défaut : oui. */
  blog?: boolean;
  /** Pages propres au métier ajoutées par SINA (carte, recherche de biens…). */
  extra?: { key: string; fr: string; en: string; sections: string[]; handle?: string; template?: string; path?: string | null; nav?: boolean }[];
};

const both: Viewport[] = ["desktop", "phone"];
const H = ["en-tête (logo, menu, bouton principal)"], F = ["pied de page complet (liens vers les pages existantes, coordonnées, mentions)"];
const page = (key: string, fr: string, en: string, group: PageGroup, template: string, path: string | null, sections: string[], more: Partial<MockupPage> = {}): MockupPage =>
  ({ key, fr, en, group, template, path, sections: [...H, ...sections, ...F], viewports: both, ...more });
const sub = (key: string, fr: string, en: string, handle: string, sections: string[], more: Partial<MockupPage> = {}) =>
  page(key, fr, en, "contenu", `page.${handle.replace(/-/g, "_")}`, `/pages/${handle}`, sections, { handle, ...more });
const legal = (key: string, fr: string, en: string, handle: string) =>
  page(key, fr, en, "legal", `page.${handle.replace(/-/g, "_")}`, `/pages/${handle}`, ["titre de la page", "texte légal structuré (titres, paragraphes), informations manquantes en « [À compléter : …] »"], { handle });

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "produit";

/** Pages propres au métier (étape 6 : « adaptée au métier par SINA »). */
function tradePages(sector: string | null | undefined): MockupPage[] {
  if (sector === "restauration") return [
    sub("menu", "La carte", "Menu", "la-carte", ["ouverture avec photo du lieu", "carte par moments (entrées, plats, desserts) avec prix d'une seule source", "bouton de réservation"], { nav: true }),
  ];
  if (sector === "immobilier") return [
    page("listings", "Recherche de biens", "Property search", "service", "page.recherche_biens", "/pages/recherche-biens", ["filtres (achat / location, ville, budget, surface)", "liste des biens en cartes", "aucun résultat"], { handle: "recherche-biens", nav: true }),
    page("listing", "Fiche d'un bien", "Property page", "service", "metaobject/bien", null, ["galerie du bien", "prix et caractéristiques", "quartier", "demande de visite"], { key_page: true }),
  ];
  return [];
}

/** Le métier se prête-t-il à la prise de rendez-vous ? (choix du client d'abord, sinon le secteur). */
export function bookingFits(o: Pick<InventoryOptions, "contactModes" | "activity" | "sector">): boolean {
  if (o.contactModes?.includes("booking") || o.activity === "booking") return true;
  return ["restauration", "bienetre", "sante", "coaching", "formation"].includes(o.sector ?? "");
}

/**
 * Liste exacte des pages du site, dans l'ordre de la maquette. `storeType` « mono » : un seul produit, la page de
 * catégorie est sans objet (le catalogue reste, Shopify le sert toujours).
 */
export function mockupPages(business: "products" | "services", storeType: StoreType | null = null, o: InventoryOptions = {}): MockupPage[] {
  const blog = o.blog === false ? [] : [
    page("blog", "Blog (liste des articles)", "Blog (article list)", "contenu", "blog", "/blogs/journal", ["titre du journal", "articles en cartes (image, titre, extrait)"]),
    page("article", "Article de blog", "Blog article", "contenu", "article", "/blogs/journal/article", ["titre et image d'ouverture", "texte de l'article avec intertitres", "liens vers les produits ou prestations"]),
  ];
  const system = [
    page("404", "Page introuvable (404)", "Page not found (404)", "systeme", "404", "/page-introuvable", ["message dans le vocabulaire de la marque", "bouton de retour à l'accueil", "recherche"]),
  ];
  if (business === "services") {
    const booking = bookingFits(o) ? [
      page("booking", "Prise de rendez-vous ou réservation", "Booking", "service", "page.reservation", "/pages/reservation", ["choix de la prestation", "date et créneau", "coordonnées", "récapitulatif"], { handle: "reservation", nav: true }),
      page("booking-confirmation", "Confirmation de rendez-vous", "Booking confirmation", "service", "page.reservation_confirmee", "/pages/reservation-confirmee", ["message de confirmation", "récapitulatif", "ajout à l'agenda"], { handle: "reservation-confirmee" }),
      page("booking-manage", "Gérer mon rendez-vous", "Manage my booking", "service", "page.mon_rendez_vous", "/pages/mon-rendez-vous", ["recherche du rendez-vous", "déplacer ou annuler"], { handle: "mon-rendez-vous" }),
    ] : [];
    return [
      page("home", "Accueil", "Home", "accueil", "index", "/", ["promesse avec deux boutons", "besoins du client", "prestations ou réalisations", "méthode", "questions fréquentes", "appel au contact"], { key_page: true }),
      sub("services", "Prestations", "Services", "prestations", ["introduction", "liste des prestations en cartes (nom, description, tarif s'il est connu)", "appel au devis ou au rendez-vous"], { nav: true }),
      sub("service", "Page d'une prestation (modèle commun à chaque prestation)", "Service page (shared by each service)", "prestation", ["ouverture avec photo", "déroulé", "tarif et durée d'une seule source", "questions", "bouton principal"], { key_page: true, group: "service" }),
      sub("pricing", "Tarifs", "Pricing", "tarifs", ["grille des tarifs (valeurs du client, sinon « [À compléter] »)", "conditions"], { nav: true }),
      sub("portfolio", "Réalisations", "Portfolio", "realisations", ["filtres", "grille des réalisations (photo, titre, lieu)"], { nav: true }),
      sub("project", "Page d'une réalisation", "Project page", "realisation", ["photos (avant / après si utile)", "contexte, travaux, résultat", "appel au devis"]),
      sub("about", "L'entreprise", "About us", "l-entreprise", ["histoire", "valeurs", "équipe (photos du client seulement)"], { nav: true }),
      sub("method", "Méthode", "Our method", "la-methode", ["méthode en 3 ou 4 étapes, un verbe par étape"]),
      sub("area", "Zone d'intervention", "Service area", "zone-d-intervention", ["carte ou liste des villes", "délais et conditions donnés par le client"]),
      sub("faq", "Questions fréquentes", "FAQ", "questions-frequentes", ["3 à 10 questions en accordéon"]),
      sub("contact", "Contact", "Contact", "contact", ["coordonnées et horaires", "formulaire (erreurs près du champ)", "carte ou adresse"], { nav: true }),
      sub("quote", "Demande de devis", "Quote request", "demande-de-devis", ["formulaire en étapes (besoin, détails, photos, coordonnées)", "réassurance réelle"], { nav: true }),
      sub("quote-confirmation", "Confirmation de demande de devis", "Quote request confirmation", "devis-envoye", ["message de confirmation honnête", "prochaines étapes"]),
      ...booking,
      ...tradePages(o.sector),
      legal("terms", "Conditions de prestation", "Terms of service", "conditions-de-prestation"),
      legal("legal-notice", "Mentions légales", "Legal notice", "mentions-legales"),
      legal("privacy", "Politique de confidentialité", "Privacy policy", "confidentialite"),
      legal("cookies", "Cookies", "Cookies", "cookies"),
      sub("sitemap", "Plan du site", "Sitemap", "plan-du-site", ["liste de toutes les pages, rangées par rubrique"]),
      ...system,
      ...blog,
      ...extraPages(o),
    ];
  }
  const types = o.productTypes?.length ? o.productTypes : [{ key: "", name: "" }];
  const products = types.map((t, i) => page(t.key ? `product:${slug(t.key)}` : "product", t.name ? `Fiche produit — ${t.name}` : "Fiche produit", t.name ? `Product page — ${t.name}` : "Product page", "vente", i === 0 ? "product" : `product.${slug(t.key).replace(/-/g, "_")}`, null,
    ["galerie avec vignettes", "prix et mention", "quantité et ajout au panier", "gros plans légendés", "usages", "informations en accordéons", "questions « Avant de choisir »", "produits complémentaires (sans le produit affiché)", "rappel d'achat final", "barre d'achat qui suit sur téléphone"], { key_page: true }));
  return [
    page("home", "Accueil", "Home", "accueil", "index", "/", ["ouverture (titre, photo, bouton)", "produit ou offre", "détails (3 ou 4 gros plans)", "scènes d'usage", "univers de marque", "journal", "questions fréquentes", "inscription"], { key_page: true }),
    page("catalog", "Catalogue", "Catalog", "vente", "collection", "/collections/all", ["titre", "filtres et tri", "grille de produits"], { nav: true }),
    ...(storeType === "mono" ? [] : [page("category", "Catégorie", "Category", "vente", "collection", null, ["titre et description de la catégorie", "grille de produits"], { variantOf: "catalog" })]),
    ...products,
    page("cart", "Panier", "Cart", "vente", "cart", null, ["lignes du panier (photo, quantité, prix)", "sous-total", "bouton vers le paiement de la plateforme"]),
    page("cart-drawer", "Panier (tiroir)", "Cart drawer", "vente", "cart", null, ["tiroir latéral : lignes, sous-total, bouton"], { variantOf: "cart" }),
    page("cart-empty", "Panier vide", "Empty cart", "vente", "cart", "/cart", ["message dans le vocabulaire de la marque", "bouton vers les produits"], { variantOf: "cart" }),
    page("search", "Recherche", "Search", "vente", "search", "/search?q=a", ["champ de recherche", "résultats en grille"]),
    page("search-empty", "Recherche sans résultat", "No search results", "vente", "search", "/search?q=zzzzzz", ["message « aucun résultat »", "suggestions"], { variantOf: "search" }),
    sub("about", "Notre histoire", "Our story", "notre-histoire", ["histoire de la marque", "fabrication ou engagements réels", "photos"], { nav: true }),
    sub("contact", "Contact", "Contact", "contact", ["coordonnées", "formulaire", "questions fréquentes courtes"], { nav: true }),
    sub("faq", "Questions fréquentes", "FAQ", "questions-frequentes", ["3 à 10 questions en accordéon"]),
    sub("shipping", "Livraison et retours", "Shipping and returns", "livraison-et-retours", ["délais et frais donnés par le client (sinon « [À compléter] »)", "retours"]),
    ...(o.sizeGuide ? [sub("size-guide", "Guide des tailles", "Size guide", "guide-des-tailles", ["tableau des tailles du client", "conseils de mesure"])] : []),
    page("account-login", "Connexion", "Log in", "compte", "customers/login", null, ["formulaire de connexion", "lien vers l'inscription"]),
    page("account-register", "Inscription", "Sign up", "compte", "customers/register", null, ["formulaire d'inscription"]),
    page("account-recover", "Mot de passe oublié", "Forgot password", "compte", "customers/login", null, ["formulaire de récupération"], { variantOf: "account-login" }),
    page("account", "Mon compte", "My account", "compte", "customers/account", null, ["résumé du compte", "dernières commandes"]),
    page("account-orders", "Mes commandes", "My orders", "compte", "customers/order", null, ["détail d'une commande"]),
    page("account-addresses", "Mes adresses", "My addresses", "compte", "customers/addresses", null, ["liste et formulaire d'adresse"]),
    legal("terms", "Conditions générales de vente", "Terms of sale", "conditions-generales-de-vente"),
    legal("legal-notice", "Mentions légales", "Legal notice", "mentions-legales"),
    legal("privacy", "Politique de confidentialité", "Privacy policy", "confidentialite"),
    legal("cookies", "Cookies", "Cookies", "cookies"),
    page("password", "Boutique bientôt ouverte", "Opening soon", "systeme", "password", "/password", ["logo", "message d'ouverture prochaine", "inscription"]),
    ...system,
    ...blog,
    ...tradePages(o.sector),
    ...extraPages(o),
  ];
}

function extraPages(o: InventoryOptions): MockupPage[] {
  return (o.extra ?? []).map((x) => {
    const handle = x.handle ?? slug(x.key);
    return { ...sub(x.key, x.fr, x.en, handle, x.sections, { nav: x.nav }), ...(x.template ? { template: x.template } : {}), ...(x.path !== undefined ? { path: x.path } : {}) };
  });
}

/** Options de l'inventaire déduites du projet (types de produits du catalogue, façons de contacter, secteur). */
export function inventoryOptionsOf(p: { business: "products" | "services"; product: { category?: string; name?: string; sector?: string | null }; catalog: { category: string }[]; services: { contactMode: ContactMode; contactModes?: ContactMode[] }; settings: { activity?: ActivityCategory } }): InventoryOptions {
  const cats = [...new Set([p.product.category, ...p.catalog.map((c) => c.category)].map((c) => (c ?? "").trim()).filter(Boolean))];
  return {
    productTypes: cats.length > 1 ? cats.slice(0, 6).map((c) => ({ key: c, name: c })) : undefined,
    contactModes: [p.services.contactMode, ...(p.services.contactModes ?? [])],
    activity: p.settings.activity,
    sector: p.product.sector ?? null,
  };
}

/** Pages à dessiner (une variante sans dessin propre est couverte par sa page d'origine si l'image le précise). */
export const pageByKey = (pages: MockupPage[], key: string) => pages.find((p) => p.key === key) ?? null;

/**
 * Mise en page imposée d'une page (retour du propriétaire du 8 novembre : « la page panier ne fait pas panier », et la
 * fiche produit qui s'ouvrait sur l'accroche) : la direction graphique donne les couleurs, les polices, les cartes et
 * les détails ; la STRUCTURE de chaque page reste celle d'une vraie boutique. null : page libre (accueil, histoire).
 */
export function pageLayout(p: Pick<MockupPage, "key" | "group">): string | null {
  const k = p.key;
  if (k === "home") return null;
  if (k === "product" || k.startsWith("product:")) return "une vraie fiche produit de boutique en ligne : tout en haut (sous l'en-tête), la galerie du produit (grande photo et vignettes) à gauche et, à droite, le NOM DU PRODUIT en titre principal, le prix, la mention, le choix de quantité et le bouton d'ajout au panier ; en téléphone, la galerie puis ce bloc d'achat l'un sous l'autre. Aucune accroche ni bandeau de présentation avant la galerie";
  if (k === "cart") return "une vraie page panier : un titre simple (« Ton panier » ou équivalent) ; à gauche, la liste des lignes du panier (vignette du produit, nom, sélecteur de quantité − 1 +, prix, lien pour retirer) ; à droite, un encadré récapitulatif (sous-total, livraison, total, bouton de paiement sur toute la largeur de l'encadré, mention courte sur les retours) ; en téléphone, les lignes empilées puis le récapitulatif et le bouton sur toute la largeur. Aucune grande ouverture, aucune grande photo, aucun bandeau de présentation";
  if (k === "cart-drawer") return "un tiroir de panier ouvert sur le côté droit de la page (page assombrie derrière) : lignes, sous-total et bouton de paiement";
  if (k === "cart-empty") return "une page panier vide : un message court au centre et un bouton vers les produits ; rien d'autre";
  if (k === "catalog" || k === "category") return "une vraie page de catalogue : un petit bandeau de titre (titre de la page et une phrase), la barre de filtres et de tri, puis la grille de produits (photo, nom, prix, bouton) ; aucune grande ouverture d'accroche";
  if (k === "search" || k === "search-empty") return "une page de recherche : le champ de recherche en haut, puis les résultats (ou le message sans résultat et des suggestions) ; aucune grande ouverture";
  if (p.group === "compte") return "une page de compte client : un titre simple et le formulaire ou les informations, dans un encadré centré ; aucune grande ouverture ni photo";
  if (p.group === "legal") return "une page de texte légal : un titre simple puis le texte structuré en titres et paragraphes sur une colonne lisible ; aucune photo";
  if (k === "contact" || k === "faq" || k === "shipping") return "un petit bandeau de titre propre à la page, puis son contenu ; aucune grande ouverture d'accroche";
  return null;
}

/**
 * Page qui DOIT avoir son image de maquette (ordinateur et téléphone) : l'accueil, les pages clés (fiche produit ou
 * prestation), les pages du menu et le panier. Les autres pages (variantes, compte, pages légales, recherche, 404…)
 * sont « dérivées » : codées à l'étape 7 dans le style de la maquette, avec leur structure de boutique, sans image à
 * elles (décision du propriétaire du 8 novembre : ne pas payer des maquettes de pages simples).
 */
export function requiredPage(p: Pick<MockupPage, "key" | "key_page" | "nav" | "variantOf">): boolean {
  return !p.variantOf && (!!p.key_page || !!p.nav || p.key === "home" || p.key === "cart");
}
