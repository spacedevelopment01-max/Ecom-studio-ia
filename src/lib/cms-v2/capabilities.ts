/**
 * CMS Engine V2 — registre central des capacités RÉELLES de chaque plateforme (phase 11A).
 * Alimente l'interface (onglet Boutique › Exporter) et le Quality Gate. Statuts :
 *  SUPPORTED : développé et vérifié au niveau indiqué ;  PARTIAL : fonctionne avec des limites écrites ;
 *  EXPORT : fichier à importer par le client (pas d'envoi direct) ;  KIT : dossier de reconstruction (pas un thème) ;
 *  UNVERIFIED : développé mais jamais exécuté là où il faudrait (ex. vraie boutique) ;  UNSUPPORTED : non disponible.
 * « verified » = niveau de preuve le plus élevé obtenu pour cette capacité (jamais une simulation présentée comme réelle).
 */
import type { CmsPlatform } from "./types";

export type CapabilityStatus = "SUPPORTED" | "PARTIAL" | "EXPORT" | "KIT" | "UNVERIFIED" | "UNSUPPORTED";
/** Provenance d'une vérification, de la plus faible à la plus forte. */
export type Provenance = "static" | "automated" | "browser_local" | "installed_local" | "real_platform" | "human";
export const PROVENANCE_ORDER: Provenance[] = ["static", "automated", "browser_local", "installed_local", "real_platform", "human"];

export type CapabilityKey =
  | "theme_generation" | "native_export" | "installation" | "native_editing" | "api_connection" | "direct_push"
  | "products" | "cart" | "checkout" | "seo" | "animations" | "forms" | "multilingual";

export type Capability = { status: CapabilityStatus; verified: Provenance | null; note: { fr: string; en: string } };
export type PlatformEntry = {
  platform: CmsPlatform;
  label: string;
  delivery: "theme" | "kit";
  target: { fr: string; en: string };
  capabilities: Record<CapabilityKey, Capability>;
  limits: { fr: string; en: string }[];
};

const c = (status: CapabilityStatus, verified: Provenance | null, fr: string, en: string): Capability => ({ status, verified, note: { fr, en } });

export const CAPABILITIES: Record<CmsPlatform, PlatformEntry> = {
  shopify: {
    platform: "shopify",
    label: "Shopify",
    delivery: "theme",
    target: { fr: "Shopify Online Store 2.0", en: "Shopify Online Store 2.0" },
    capabilities: {
      theme_generation: c("SUPPORTED", "automated", "Thème OS 2.0 complet (sections, blocs, réglages, gabarits JSON).", "Full OS 2.0 theme (sections, blocks, settings, JSON templates)."),
      native_export: c("SUPPORTED", "automated", "ZIP vérifié par Theme Check (outil officiel de Shopify).", "ZIP checked by Theme Check (Shopify's official tool)."),
      installation: c("UNVERIFIED", null, "Jamais installé sur une vraie boutique Shopify (aucune boutique de test accessible).", "Never installed on a real Shopify store (no test store available)."),
      native_editing: c("SUPPORTED", "automated", "Textes, images, couleurs, dispositions et blocs réglables dans l'éditeur de thème (schémas contrôlés).", "Text, images, colours, layouts and blocks editable in the theme editor (schemas checked)."),
      api_connection: c("UNVERIFIED", null, "Connexion OAuth et envoi d'un thème non publié développés, jamais exécutés sur une vraie boutique.", "OAuth connection and unpublished-theme upload built, never run on a real store."),
      direct_push: c("UNVERIFIED", null, "Envoi direct seulement après votre autorisation explicite ; non testé en réel.", "Direct upload only after your explicit approval; not tested for real."),
      products: c("EXPORT", "automated", "Fichier CSV d'import Shopify (envoi par l'API développé, non vérifié).", "Shopify import CSV (API upload built, not verified)."),
      cart: c("SUPPORTED", "browser_local", "Panier Shopify (ajout, quantités) ; testé dans l'aperçu local seulement.", "Shopify cart (add, quantities); tested in the local preview only."),
      checkout: c("UNVERIFIED", null, "Paiement géré par Shopify (hors thème) ; jamais exécuté.", "Checkout handled by Shopify (outside the theme); never run."),
      seo: c("PARTIAL", "automated", "Titres, descriptions, balises sociales et canoniques du thème ; SEO des fiches par métachamps NON VÉRIFIÉ.", "Theme titles, descriptions, social and canonical tags; product SEO via metafields UNVERIFIED."),
      animations: c("SUPPORTED", "browser_local", "Apparitions, survols, menus, accordéons ; mouvements réduits respectés.", "Reveals, hovers, menus, accordions; reduced motion respected."),
      forms: c("SUPPORTED", "automated", "Formulaires natifs de Shopify (contact, inscription).", "Native Shopify forms (contact, sign-up)."),
      multilingual: c("PARTIAL", "automated", "Thème en français ou en anglais ; traductions de la boutique par les outils de Shopify.", "Theme in French or English; store translations via Shopify's tools."),
    },
    limits: [
      { fr: "Installation et rendu sur une vraie boutique non vérifiés (phase 11B).", en: "Installation and rendering on a real store not verified (phase 11B)." },
    ],
  },
  woocommerce: {
    platform: "woocommerce",
    label: "WordPress / WooCommerce",
    delivery: "theme",
    target: { fr: "WordPress 6.5+ (thème de blocs), WooCommerce 9", en: "WordPress 6.5+ (block theme), WooCommerce 9" },
    capabilities: {
      theme_generation: c("SUPPORTED", "automated", "Thème de blocs : chaque section est un bloc rendu avec les mêmes gabarits que Shopify.", "Block theme: each section is a block rendered with the same templates as Shopify."),
      native_export: c("SUPPORTED", "automated", "ZIP à téléverser dans Apparence › Thèmes.", "ZIP to upload in Appearance › Themes."),
      installation: c("SUPPORTED", "installed_local", "Installé et activé sur WordPress 6.6 + WooCommerce 9.3.3 locaux.", "Installed and activated on local WordPress 6.6 + WooCommerce 9.3.3."),
      native_editing: c("SUPPORTED", "installed_local", "Réglages de chaque section dans l'éditeur de site ; menus WordPress.", "Each section's settings in the site editor; WordPress menus."),
      api_connection: c("UNSUPPORTED", null, "Aucune connexion directe à un site WordPress.", "No direct connection to a WordPress site."),
      direct_push: c("UNSUPPORTED", null, "Installation par téléversement du ZIP.", "Installed by uploading the ZIP."),
      products: c("EXPORT", "installed_local", "Fichier CSV pour l'import de produits de WooCommerce.", "CSV file for WooCommerce's product importer."),
      cart: c("SUPPORTED", "installed_local", "Panier WooCommerce natif (aucun faux panier).", "Native WooCommerce cart (no fake cart)."),
      checkout: c("PARTIAL", "installed_local", "Page de commande WooCommerce affichée ; paiement à configurer par le client, jamais exécuté.", "WooCommerce checkout page shown; payment to be set up by the client, never run."),
      seo: c("PARTIAL", "installed_local", "Titres de page et structure des titres ; description et données structurées via une extension SEO.", "Page titles and heading structure; description and structured data via an SEO plugin."),
      animations: c("SUPPORTED", "installed_local", "Mêmes scripts et styles d'animation que Shopify.", "Same animation scripts and styles as Shopify."),
      forms: c("SUPPORTED", "installed_local", "Contact et inscription traités par le thème (messages dans Outils).", "Contact and sign-up handled by the theme (messages in Tools)."),
      multilingual: c("PARTIAL", "automated", "Une langue par thème ; sites multilingues via une extension.", "One language per theme; multilingual sites via a plugin."),
    },
    limits: [
      { fr: "Fiche produit, boutique, panier et commande : blocs WooCommerce habillés au design du site (composition différente de la fiche Shopify).", en: "Product page, shop, cart and checkout: WooCommerce blocks styled with the site design (layout differs from the Shopify product page)." },
      { fr: "Jamais installé sur un hébergement réel (phase 11B).", en: "Never installed on real hosting (phase 11B)." },
    ],
  },
  prestashop: {
    platform: "prestashop",
    label: "PrestaShop",
    delivery: "theme",
    target: { fr: "PrestaShop 8.1 (thème enfant de « Classic »)", en: "PrestaShop 8.1 (child theme of « Classic »)" },
    capabilities: {
      theme_generation: c("SUPPORTED", "automated", "Thème enfant : sections du site rendues à l'identique du studio, design commun.", "Child theme: site sections rendered exactly as in the studio, shared design."),
      native_export: c("SUPPORTED", "automated", "ZIP à importer dans Apparence › Thème et logo.", "ZIP to import in Design › Theme & Logo."),
      installation: c("UNVERIFIED", null, "À vérifier sur PrestaShop 8.1 local.", "To be verified on local PrestaShop 8.1."),
      native_editing: c("PARTIAL", null, "Produits, catégories, pages CMS, menus et modules natifs modifiables ; textes des sections du thème dans ses fichiers (ou par une nouvelle exportation).", "Products, categories, CMS pages, menus and native modules editable; theme section texts in its files (or by re-exporting)."),
      api_connection: c("UNSUPPORTED", null, "Aucune connexion directe.", "No direct connection."),
      direct_push: c("UNSUPPORTED", null, "Installation par import du ZIP.", "Installed by importing the ZIP."),
      products: c("UNSUPPORTED", null, "Produits à créer dans le back-office (aucun fichier d'import fourni).", "Products to be created in the back office (no import file provided)."),
      cart: c("UNVERIFIED", null, "Panier natif de PrestaShop.", "Native PrestaShop cart."),
      checkout: c("UNVERIFIED", null, "Commande native de PrestaShop ; paiement à configurer, jamais exécuté.", "Native PrestaShop checkout; payment to be set up, never run."),
      seo: c("PARTIAL", null, "Méta des pages gérées par PrestaShop ; structure des titres du thème.", "Page meta handled by PrestaShop; theme heading structure."),
      animations: c("PARTIAL", null, "Apparitions et styles des sections ; en-tête et pied de page du thème Classic.", "Section reveals and styles; Classic theme header and footer."),
      forms: c("PARTIAL", null, "Formulaire de contact natif de PrestaShop.", "Native PrestaShop contact form."),
      multilingual: c("PARTIAL", null, "Langues de PrestaShop ; textes des sections dans une seule langue.", "PrestaShop languages; section texts in one language."),
    },
    limits: [
      { fr: "En-tête, pied de page et fiche produit : ceux du thème Classic habillés au design du site (composition différente).", en: "Header, footer and product page: Classic theme ones styled with the site design (different layout)." },
    ],
  },
  wix: kitEntry("wix", "Wix"),
  squarespace: kitEntry("squarespace", "Squarespace"),
};

function kitEntry(platform: "wix" | "squarespace", label: string): PlatformEntry {
  const no = (fr: string, en: string) => c("UNSUPPORTED", null, fr, en);
  return {
    platform,
    label,
    delivery: "kit",
    target: { fr: `${label} (reconstruction guidée)`, en: `${label} (guided rebuild)` },
    capabilities: {
      theme_generation: c("KIT", "automated", "Kit de reconstruction : pages, textes, médias, couleurs, typographies, guide.", "Rebuild kit: pages, text, media, colours, fonts, guide."),
      native_export: no(`${label} n'accepte pas de thème importé.`, `${label} does not accept imported themes.`),
      installation: no("Reconstruction manuelle dans l'éditeur de la plateforme.", "Manual rebuild in the platform's editor."),
      native_editing: c("KIT", null, "Le site reconstruit se modifie dans l'éditeur de la plateforme.", "The rebuilt site is edited in the platform's editor."),
      api_connection: no("Aucune intégration officielle disponible et testée.", "No official integration available and tested."),
      direct_push: no("Aucun envoi direct.", "No direct upload."),
      products: c("KIT", null, "Fiche produit en texte et CSV ; à saisir dans la plateforme.", "Product sheet as text and CSV; to enter in the platform."),
      cart: no("Panier de la plateforme, à configurer.", "Platform cart, to be set up."),
      checkout: no("Paiement de la plateforme, à configurer.", "Platform checkout, to be set up."),
      seo: c("KIT", null, "Titres et descriptions fournis dans le kit.", "Titles and descriptions provided in the kit."),
      animations: no("Animations à recréer avec les outils de la plateforme.", "Animations to recreate with the platform's tools."),
      forms: no("Formulaires de la plateforme.", "Platform forms."),
      multilingual: c("KIT", null, "Textes dans la langue du projet.", "Text in the project's language."),
    },
    limits: [{ fr: "Ce n'est pas un thème installable : le design est à reconstruire.", en: "This is not an installable theme: the design must be rebuilt." }],
  };
}

/** Une plateforme ne peut être dite « installable » que si elle livre un vrai thème. */
export const isInstallable = (p: CmsPlatform) => CAPABILITIES[p].delivery === "theme";
