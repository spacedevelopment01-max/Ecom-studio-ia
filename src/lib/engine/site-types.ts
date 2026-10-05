/**
 * Site existant du client : ce que le studio en récupère (contrat commun à la lecture du site,
 * à la reproduction sur la plateforme conseillée et à l'intégration dans le studio).
 * Tout ce qui figure ici vient du site lui-même : rien n'est inventé.
 */
import type { BrandPalette } from "../theme/directions";

/** Plateformes reconnues sur un site existant. */
export type SitePlatform =
  | "shopify"
  | "woocommerce" // WooCommerce (boutique WordPress)
  | "wordpress" // WordPress sans boutique
  | "prestashop"
  | "wix"
  | "squarespace"
  | "webflow"
  | "jimdo"
  | "weebly" // Weebly / Square Online
  | "magento"
  | "bigcommerce"
  | "ecwid"
  | "odoo"
  | "godaddy"
  | "custom"; // site fait sur mesure ou plateforme non identifiée

/** Plateformes avec lesquelles le studio travaille : le site du client y est conservé tel quel. */
export const KEPT_PLATFORMS = ["shopify", "woocommerce", "wordpress", "prestashop", "wix", "squarespace"] as const satisfies readonly SitePlatform[];
export const isKeptPlatform = (p: SitePlatform) => (KEPT_PLATFORMS as readonly string[]).includes(p);

/** Plateforme du studio correspondant à une plateforme reconnue (pour les sites conservés). */
export const studioPlatformOf = (p: SitePlatform): "shopify" | "woocommerce" | "prestashop" | "wix" | "squarespace" | null =>
  p === "wordpress" ? "woocommerce" : (["shopify", "woocommerce", "prestashop", "wix", "squarespace"] as const).find((x) => x === p) ?? null;

/** Un bloc de contenu d'une page, dans l'ordre où il apparaît. */
export type SiteBlock =
  | { kind: "hero"; heading: string; text?: string; image?: string; button?: { label: string; url: string } }
  | { kind: "heading"; level: number; text: string }
  | { kind: "text"; text: string }
  | { kind: "image"; src: string; alt?: string }
  | { kind: "image-text"; heading?: string; text: string; image: string; imageSide: "left" | "right"; button?: { label: string; url: string } }
  | { kind: "features"; heading?: string; items: { title: string; text?: string; image?: string }[] }
  | { kind: "gallery"; heading?: string; images: string[] }
  | { kind: "products"; heading?: string; handles: string[] }
  | { kind: "testimonials"; heading?: string; items: { quote: string; author?: string }[] }
  | { kind: "faq"; heading?: string; items: { q: string; a: string }[] }
  | { kind: "cta"; heading: string; text?: string; button?: { label: string; url: string } }
  | { kind: "contact"; heading?: string; text?: string }
  | { kind: "video"; src: string; poster?: string };

export type SitePage = {
  url: string;
  /** Chemin relatif au site (« / », « /pages/a-propos »…). */
  path: string;
  title: string;
  /** Rôle de la page. */
  type: "home" | "about" | "contact" | "faq" | "legal" | "collection" | "product" | "services" | "blog" | "other";
  description?: string;
  blocks: SiteBlock[];
  /** Capture de la page (identifiant d'asset), si un navigateur est disponible côté serveur. */
  screenshotAssetId?: string;
};

export type SiteProduct = {
  handle: string;
  title: string;
  description: string;
  price?: number; // en centimes
  compareAtPrice?: number;
  currency?: string;
  images: string[];
  variants?: { title: string; price?: number; options?: string[] }[];
  url?: string;
  category?: string;
};

export type SiteImport = {
  url: string;
  finalUrl: string;
  fetchedAt: number;
  platform: SitePlatform;
  /** Indices qui ont permis de reconnaître la plateforme (pour l'afficher honnêtement). */
  platformEvidence: string[];
  /** Le site est-il conservé (plateforme du studio) ou reproduit sur la plateforme conseillée ? */
  decision: "keep" | "reproduce";
  /** Boutique en ligne (produits) ou site vitrine (services). */
  business: "products" | "services";
  name: string;
  tagline?: string;
  language?: "fr" | "en" | string;
  logo?: { src: string; kind: "img" | "svg-inline" | "icon" | "og"; assetId?: string; width?: number; height?: number };
  favicon?: string;
  /** Couleurs mesurées sur le site (CSS, boutons, fond) et polices utilisées. */
  palette?: BrandPalette;
  colorsFound: string[];
  fonts: { heading?: string; body?: string; all: string[] };
  /** Menu principal et pied de page, tels qu'ils apparaissent. */
  nav: { label: string; url: string }[];
  footerNav: { label: string; url: string }[];
  pages: SitePage[];
  products: SiteProduct[];
  contact: { phone?: string; email?: string; address?: string; hours?: string; socials: Record<string, string> };
  /** Avertissements honnêtes (pages non lues, contenu chargé en JavaScript, robots.txt…). */
  warnings: string[];
};
