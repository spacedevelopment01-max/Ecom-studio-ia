/**
 * Bibliothèque de sections proposée dans le studio (« Ajouter une section ») :
 * noms parlants, catégories, descriptions et exemple de réglages pour l'aperçu.
 * Les types viennent de theme-base/sections ; une section absente d'ici reste ajoutable sous son nom technique.
 * Textes affichés dans le studio : langue de l'interface (libraryEntry).
 */
import type { Lang } from "../i18n";

export type SectionCategory = "Ouverture" | "Produit" | "Preuves" | "Animations" | "Images et vidéos" | "Collections" | "Textes" | "Conversion" | "Avancé";

export type LibraryEntry = { type: string; name: string; category: SectionCategory; description: string; keywords?: string };

/** Noms, descriptions et mots-clés anglais (la catégorie reste la clé française, traduite par l'interface). */
const SECTION_LIBRARY_EN: Record<string, { name: string; description: string; keywords: string }> = {
  "hero-fullbleed": { name: "Main banner", description: "Large full-screen image or video, headline and button.", keywords: "hero home full screen banner" },
  "hero-split": { name: "Split banner", description: "Text on one side, product photo on the other.", keywords: "hero split banner" },
  "hero-editorial": { name: "Editorial banner", description: "Big two-line headline, magazine style.", keywords: "hero magazine editorial" },
  "marquee": { name: "Scrolling banner", description: "Continuously scrolling text.", keywords: "marquee ticker scrolling" },
  "curved-marquee": { name: "Curved text", description: "Scrolling banner that follows a curve.", keywords: "marquee curve curved" },
  "routine-steps": { name: "Step-by-step routine", description: "The product stays on screen while the steps scroll by, with labels on the product.", keywords: "steps how to use scroll sticky routine" },
  "scroll-story": { name: "Product scroll story", description: "Product details appear as you scroll.", keywords: "scroll story details" },
  "stack-cards": { name: "Stacked cards", description: "Cards that stack up as you scroll.", keywords: "cards stack stacked" },
  "horizontal-gallery": { name: "Editorial scroll cards", description: "Horizontal carousel of illustrated cards.", keywords: "carousel horizontal gallery" },
  "stats": { name: "Animated key figures", description: "Verified figures that animate, with their source.", keywords: "figures statistics stats counter numbers" },
  "before-after": { name: "Before / After", description: "Sliding comparison between two images.", keywords: "comparison before after" },
  "testimonials": { name: "Premium customer reviews", description: "Real reviews you enter, shown as cards with rating and photo.", keywords: "reviews testimonials" },
  "product-reviews": { name: "Customer reviews (app)", description: "Placeholder for your reviews app (Judge.me, Loox…).", keywords: "reviews app" },
  "trust-bar": { name: "Trust badges", description: "Your real commitments: payment, returns, customer service.", keywords: "trust reassurance guarantees badges" },
  "features-grid": { name: "Benefits", description: "Grid of features with icons or images.", keywords: "features benefits advantages" },
  "image-with-text": { name: "Image with text", description: "An image and its explanation, side by side.", keywords: "image text" },
  "featured-product": { name: "Featured product", description: "A product with photo, price and buy button.", keywords: "product featured buy" },
  "specs-list": { name: "Specifications", description: "Clear spec sheet in rows.", keywords: "specifications technical specs" },
  "situations": { name: "Situations", description: "\"Sound familiar?\": the moments when the product helps.", keywords: "situations problems use cases" },
  "timeline": { name: "Session timeline", description: "Timeline of numbered steps.", keywords: "timeline steps" },
  "video-showcase": { name: "Premium video", description: "Large video with a title, played on scroll.", keywords: "video" },
  "video-reels": { name: "UGC video carousel", description: "Vertical, social-media-style videos.", keywords: "reels ugc tiktok vertical videos" },
  "gallery-mosaic": { name: "Flexible collage", description: "Photo mosaic with mixed sizes.", keywords: "mosaic gallery collage" },
  "story-circles": { name: "Story circles", description: "Round, stories-style thumbnails.", keywords: "stories circles" },
  "featured-collection": { name: "Featured collection", description: "A selection of products in a grid.", keywords: "collection products grid" },
  "collection-list": { name: "Collection list", description: "Your collections as thumbnails.", keywords: "collections categories" },
  "rich-text": { name: "Editorial text", description: "A highlighted paragraph.", keywords: "text editorial" },
  "faq": { name: "Frequently asked questions", description: "Expandable questions and answers.", keywords: "faq questions" },
  "newsletter": { name: "Newsletter", description: "Sign-up to your emails.", keywords: "newsletter email sign up subscribe" },
  "cta-banner": { name: "Call-to-action banner", description: "A strong message and a button.", keywords: "call to action cta button" },
  "contact-form": { name: "Contact form", description: "Shopify contact form.", keywords: "contact form" },
  "wave-divider": { name: "Wave divider", description: "Wave transition between two sections.", keywords: "divider wave separator" },
  "custom-liquid": { name: "Custom Liquid", description: "Code for a widget or an app.", keywords: "code liquid html widget" },
  "apps": { name: "Apps", description: "Placeholder for an installed app's block.", keywords: "app apps" },
};

/** Entrée de la bibliothèque dans la langue de l'interface. */
export function libraryEntry(type: string, lang: Lang): LibraryEntry | undefined {
  const e = SECTION_LIBRARY.find((x) => x.type === type);
  const en = SECTION_LIBRARY_EN[type];
  return e && lang === "en" && en ? { ...e, ...en } : e;
}

export const SECTION_LIBRARY: LibraryEntry[] = [
  { type: "hero-fullbleed", name: "Bannière principale", category: "Ouverture", description: "Grande image ou vidéo plein écran, titre et bouton.", keywords: "héros hero accueil plein écran" },
  { type: "hero-split", name: "Bannière divisée", category: "Ouverture", description: "Texte d'un côté, photo du produit de l'autre.", keywords: "héros hero split" },
  { type: "hero-editorial", name: "Bannière éditoriale", category: "Ouverture", description: "Grand titre sur deux lignes, style magazine.", keywords: "héros hero magazine" },
  { type: "marquee", name: "Bandeau défilant", category: "Animations", description: "Texte qui défile en continu.", keywords: "marquee défilement" },
  { type: "curved-marquee", name: "Texte en courbe", category: "Animations", description: "Bandeau défilant qui suit une courbe.", keywords: "marquee courbe" },
  { type: "routine-steps", name: "Routine en gestes", category: "Animations", description: "Le produit reste à l'écran pendant que les gestes défilent, avec étiquettes sur le produit.", keywords: "étapes mode d'emploi utilisation scroll sticky routine" },
  { type: "scroll-story", name: "Défilement produit", category: "Animations", description: "Les détails du produit apparaissent au fil du défilement.", keywords: "scroll histoire" },
  { type: "stack-cards", name: "Cartes empilées", category: "Animations", description: "Cartes qui s'empilent au défilement.", keywords: "cartes empilées stack" },
  { type: "horizontal-gallery", name: "Cartes scroll éditorial", category: "Animations", description: "Carrousel horizontal de cartes illustrées.", keywords: "carrousel horizontal" },
  { type: "stats", name: "Chiffres clés animés", category: "Preuves", description: "Chiffres vérifiés qui s'animent, avec leur source.", keywords: "chiffres statistiques compteur" },
  { type: "before-after", name: "Avant / Après", category: "Preuves", description: "Comparaison glissante entre deux images.", keywords: "comparaison avant après" },
  { type: "testimonials", name: "Avis clients premium", category: "Preuves", description: "Vrais avis saisis par vous, en cartes avec note et photo.", keywords: "avis témoignages reviews" },
  { type: "product-reviews", name: "Avis clients (application)", category: "Preuves", description: "Emplacement pour votre application d'avis (Judge.me, Loox…).", keywords: "avis reviews application" },
  { type: "trust-bar", name: "Arguments de confiance", category: "Preuves", description: "Vos engagements réels : paiement, retours, service client.", keywords: "confiance réassurance garanties" },
  { type: "features-grid", name: "Bénéfices", category: "Produit", description: "Grille d'atouts avec icônes ou images.", keywords: "atouts avantages bénéfices" },
  { type: "image-with-text", name: "Image et texte", category: "Produit", description: "Une image et son explication, côte à côte.", keywords: "image texte" },
  { type: "featured-product", name: "Produit en vedette", category: "Produit", description: "Un produit avec photo, prix et bouton d'achat.", keywords: "produit vedette achat" },
  { type: "specs-list", name: "Caractéristiques", category: "Produit", description: "Fiche technique claire en lignes.", keywords: "caractéristiques technique specs" },
  { type: "situations", name: "Situations", category: "Produit", description: "« Vous vous reconnaissez ? » : les moments où le produit aide.", keywords: "situations problèmes usages" },
  { type: "timeline", name: "Chronologie d'une séance", category: "Produit", description: "Frise d'étapes numérotées.", keywords: "frise étapes chronologie" },
  { type: "video-showcase", name: "Vidéo premium", category: "Images et vidéos", description: "Grande vidéo avec titre, lue au défilement.", keywords: "vidéo" },
  { type: "video-reels", name: "Carrousel vidéos UGC", category: "Images et vidéos", description: "Vidéos verticales façon réseaux sociaux.", keywords: "reels ugc tiktok vidéos verticales" },
  { type: "gallery-mosaic", name: "Collage modulable", category: "Images et vidéos", description: "Mosaïque de photos aux tailles variées.", keywords: "mosaïque galerie collage" },
  { type: "story-circles", name: "Cercles stories", category: "Images et vidéos", description: "Pastilles rondes façon stories.", keywords: "stories cercles" },
  { type: "featured-collection", name: "Collection en vedette", category: "Collections", description: "Une sélection de produits en grille.", keywords: "collection produits grille" },
  { type: "collection-list", name: "Liste de collections", category: "Collections", description: "Vos collections en vignettes.", keywords: "collections catégories" },
  { type: "rich-text", name: "Texte éditorial", category: "Textes", description: "Un paragraphe mis en valeur.", keywords: "texte éditorial" },
  { type: "faq", name: "Questions fréquentes", category: "Textes", description: "Questions et réponses dépliables.", keywords: "faq questions" },
  { type: "newsletter", name: "Newsletter", category: "Conversion", description: "Inscription à vos e-mails.", keywords: "newsletter email inscription" },
  { type: "cta-banner", name: "Bannière d'appel", category: "Conversion", description: "Un message fort et un bouton.", keywords: "appel action cta bouton" },
  { type: "contact-form", name: "Formulaire de contact", category: "Conversion", description: "Formulaire de contact Shopify.", keywords: "contact formulaire" },
  { type: "wave-divider", name: "Vague de séparation", category: "Avancé", description: "Transition en vague entre deux sections.", keywords: "séparateur vague" },
  { type: "custom-liquid", name: "Liquid personnalisé", category: "Avancé", description: "Code d'un widget ou d'une application.", keywords: "code liquid html widget" },
  { type: "apps", name: "Applications", category: "Avancé", description: "Emplacement pour le bloc d'une application installée.", keywords: "application app" },
];

export const SECTION_CATEGORIES: SectionCategory[] = ["Ouverture", "Produit", "Preuves", "Animations", "Images et vidéos", "Collections", "Textes", "Conversion", "Avancé"];

/** Sections qui ne s'ajoutent pas depuis la bibliothèque (structure de page, gabarits). */
export const NOT_ADDABLE = new Set(["header", "footer", "announcement-bar", "cart-drawer", "product-recommendations"]);
export const addable = (type: string) => !type.startsWith("main-") && !NOT_ADDABLE.has(type);
