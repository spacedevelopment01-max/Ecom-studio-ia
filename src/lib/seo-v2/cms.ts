/**
 * Livraison des contenus vers les plateformes. Trois cas distincts, jamais confondus :
 *  - CONNECTÉ : Shopify (boutique reliée) — les articles passent par l'envoi existant du blog ; le SEO des fiches
 *    passe par les métachamps global.title_tag / description_tag : MÉTHODE NON VÉRIFIÉE (aucun test réel) ;
 *  - EXPORT INSTALLABLE : WooCommerce, PrestaShop — contenu HTML + métadonnées + JSON-LD à coller ou importer ;
 *  - KIT DE REPRISE : Wix, Squarespace — textes et instructions pour le client.
 */
import { SEO_MECHANISM, shopifyConnection } from "../integrations/shopify";
import type { Project } from "../projects";
import { toHtml, toMarkdown } from "./doc";
import type { ContentDoc } from "./types";

export type CmsMode = "connected" | "export" | "handover";
export type CmsTarget = { platform: "shopify" | "woocommerce" | "prestashop" | "wix" | "squarespace"; mode: CmsMode; seo: string; verified: boolean; note: string };

export function cmsTargets(p: Project): CmsTarget[] {
  const connected = !!shopifyConnection(p.userId, p.id);
  return [
    connected
      ? { platform: "shopify", mode: "connected", seo: SEO_MECHANISM, verified: false, note: "Boutique reliée : articles envoyés en brouillon ou publiés ; titre et description SEO envoyés par une méthode NON VÉRIFIÉE (à contrôler dans l'administration Shopify)." }
      : { platform: "shopify", mode: "export", seo: "à saisir dans « Référencement sur les moteurs de recherche » de la fiche", verified: false, note: "Boutique non reliée : copier le texte et les métadonnées (ou relier la boutique dans Connexions)." },
    { platform: "woocommerce", mode: "export", seo: "titre et méta-description à reporter dans l'extension SEO du site (Yoast, Rank Math…)", verified: false, note: "Export HTML à coller dans l'éditeur WordPress (bloc HTML personnalisé)." },
    { platform: "prestashop", mode: "export", seo: "champs « Balise titre » et « Méta description » de la fiche", verified: false, note: "Export HTML à coller dans la description (mode source)." },
    { platform: "wix", mode: "handover", seo: "Paramètres SEO de la page", verified: false, note: "Kit de reprise : textes à recopier, Wix n'accepte pas d'import de thème." },
    { platform: "squarespace", mode: "handover", seo: "Paramètres de la page › SEO", verified: false, note: "Kit de reprise : textes à recopier." },
  ];
}

/** Paquet d'export d'un contenu (fichiers texte prêts à copier). */
export function exportBundle(doc: ContentDoc): Record<string, string> {
  const base = doc.meta.slug || "contenu";
  return {
    [`${base}.html`]: toHtml(doc),
    [`${base}.md`]: toMarkdown(doc),
    [`${base}.seo.json`]: JSON.stringify({ seoTitle: doc.meta.seoTitle, metaDescription: doc.meta.metaDescription, slug: doc.meta.slug, canonical: doc.meta.canonical, robots: doc.meta.robots }, null, 2),
    [`${base}.jsonld.json`]: JSON.stringify(doc.schema, null, 2),
  };
}
