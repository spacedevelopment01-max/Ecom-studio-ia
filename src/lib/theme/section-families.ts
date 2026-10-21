/**
 * Bibliothèques de sections par famille (issue #141, consigne de Thomas du 19 octobre 2026).
 *
 * Trois familles, exactement 20 sections chacune, existantes comprises :
 *  - boutique spécialisée (`specialty`) : FRAISE, ONDE ;
 *  - e-commerce (`catalog`) : ORBE ;
 *  - prestations de services (`services`) : Atelier Rive.
 *
 * Une entrée = une fonction. Ses dispositions (grille, liste, colonnes, carrousel, visuel à gauche ou à droite…) sont des
 * préréglages d'UNE section : un type de section du thème et quelques réglages. Une même fonction peut regrouper
 * plusieurs types existants (les sections des quatre thèmes validés, sans changer leur rendu) : changer de disposition
 * convertit alors le contenu (titres, textes, images, éléments) vers l'autre type, sans rien perdre d'essentiel.
 *
 * Ce registre est la SEULE source de la galerie « Sections » (ajout manuel), des choix de l'IA, des commandes locales,
 * de la composition et des validations serveur : une section absente de la famille du projet n'est plus proposée.
 * Les anciennes sections restent rendues pour les projets enregistrés qui les utilisent (rien n'est supprimé du thème).
 */
import type { Lang } from "../i18n";
import type { StoreKind } from "./store-kind";

export type FamilyId = StoreKind;
type T = { fr: string; en: string };

/** Schéma de la vignette de galerie (dessin neutre, sans image de démonstration). */
export type Thumb =
  | "split-right" | "split-left" | "stacked" | "background" | "grid-2" | "grid-3" | "grid-4" | "carousel" | "list" | "marquee"
  | "cards-rows" | "hotspots" | "tabs" | "accordion" | "steps" | "timeline" | "mosaic" | "video" | "video-split" | "video-vertical"
  | "stories" | "table" | "cards" | "stats" | "beforeafter" | "quote" | "quote-split" | "band" | "logos" | "sticky" | "drawing"
  | "form" | "form-split" | "map" | "pricing" | "featured" | "index" | "product" | "newsletter" | "stores" | "asym" | "statement";

export type Disposition = { id: string; label: T; type: string; settings?: Record<string, unknown>; thumb: Thumb };
export type FamilyEntry = { key: string; family: FamilyId; n: number; name: T; description: T; keywords: string; dispositions: Disposition[] };

export const FAMILY_LABEL: Record<FamilyId, T> = {
  specialty: { fr: "Boutique spécialisée", en: "Specialty store" },
  catalog: { fr: "E-commerce", en: "E-commerce" },
  services: { fr: "Prestations de services", en: "Services" },
};

const d = (id: string, fr: string, en: string, type: string, thumb: Thumb, settings?: Record<string, unknown>): Disposition => ({ id, label: { fr, en }, type, thumb, ...(settings ? { settings } : {}) });
const e = (family: FamilyId, n: number, slug: string, name: T, description: T, keywords: string, dispositions: Disposition[]): FamilyEntry => ({ key: `${family}.${slug}`, family, n, name, description, keywords, dispositions });

// ─── Boutique spécialisée — FRAISE / ONDE ──────────────────────────────────────────────────────────────────────────────
const SPECIALTY: FamilyEntry[] = [
  e("specialty", 1, "hero", { fr: "Présentation principale", en: "Main presentation" }, { fr: "Grand visuel produit, accroche, présentation courte et bouton principal.", en: "Large product visual, hook, short presentation and main button." }, "ouverture hero produit accroche bouton", [
    d("image-right", "Visuel à droite", "Visual on the right", "cv-hero", "split-right", { layout: "image-right" }),
    d("image-left", "Visuel à gauche", "Visual on the left", "cv-hero", "split-left", { layout: "image-left" }),
    d("stacked", "Visuel au-dessus", "Visual on top", "cv-hero", "stacked", { layout: "stacked" }),
    d("background", "Visuel en fond", "Background visual", "cv-banner", "background", { layout: "background" }),
    d("banner", "Bannière visuel et prix", "Visual and price banner", "cv-banner", "split-left", { layout: "image-left" }),
  ]),
  e("specialty", 2, "benefits", { fr: "Bénéfices du produit", en: "Product benefits" }, { fr: "Avantages clients avec icônes, illustrations ou photos.", en: "Customer benefits with icons, illustrations or photos." }, "bénéfices avantages atouts icônes", [
    d("grid", "Grille", "Grid", "features-grid", "grid-4", { layout: "grid", columns: 4, columns_mobile: "2", style: "plain" }),
    d("columns", "Deux colonnes", "Two columns", "features-grid", "grid-2", { layout: "grid", columns: 2, columns_mobile: "2", style: "plain" }),
    d("list", "Liste verticale", "Vertical list", "features-grid", "list", { layout: "grid", columns: 1, columns_mobile: "1", style: "lines" }),
    d("carousel", "Carrousel", "Carousel", "features-grid", "carousel", { layout: "carousel", columns: 4, columns_mobile: "1", style: "cards" }),
    d("visual", "Autour d'un visuel", "Around a visual", "cv-feature", "stacked", { layout: "stacked" }),
    d("visual-left", "Visuel à gauche", "Visual on the left", "cv-feature", "split-left", { layout: "image-left" }),
    d("marquee", "Bandeau défilant", "Scrolling band", "marquee", "marquee", { size: "small" }),
  ]),
  e("specialty", 3, "details", { fr: "Détails du produit", en: "Product details" }, { fr: "Gros plans légendés ou repères interactifs sur le produit.", en: "Captioned close-ups or interactive markers on the product." }, "détails gros plan repères points interactifs", [
    d("rows", "Gros plans en lignes", "Close-ups in rows", "cv-cards", "cards-rows", { layout: "rows" }),
    d("columns", "Gros plans en colonnes", "Close-ups in columns", "cv-cards", "grid-3", { layout: "columns" }),
    d("hotspots", "Repères interactifs", "Interactive markers", "cv-hotspots", "hotspots", { layout: "side" }),
    d("hotspots-stacked", "Repères, liste dessous", "Markers, list below", "cv-hotspots", "hotspots", { layout: "stacked" }),
  ]),
  e("specialty", 4, "composition", { fr: "Composition et matériaux", en: "Composition and materials" }, { fr: "Ingrédients, composants ou matériaux selon le produit.", en: "Ingredients, components or materials depending on the product." }, "composition ingrédients composants matériaux", [
    d("split", "Visuel et liste", "Visual and list", "cv-ingredients", "split-left", { layout: "split" }),
    d("cards", "Cartes", "Cards", "cv-ingredients", "grid-3", { layout: "cards" }),
    d("list", "Liste compacte", "Compact list", "cv-ingredients", "list", { layout: "list" }),
  ]),
  e("specialty", 5, "specs", { fr: "Caractéristiques", en: "Specifications" }, { fr: "Informations précises en tableau, liste ou accordéons.", en: "Precise information as a table, list or accordions." }, "caractéristiques fiche technique dimensions accordéons onglets", [
    d("side", "Titre à côté, accordéons", "Title beside, accordions", "cv-specs", "accordion", { layout: "side" }),
    d("stacked", "Accordéons empilés", "Stacked accordions", "cv-specs", "accordion", { layout: "stacked" }),
    d("tabs", "Onglets", "Tabs", "content-tabs", "tabs", { tab_style: "underline" }),
    d("tabs-pills", "Onglets en pastilles", "Pill tabs", "content-tabs", "tabs", { tab_style: "pills" }),
  ]),
  e("specialty", 6, "howto", { fr: "Mode d'emploi", en: "How to use" }, { fr: "Étapes illustrées d'utilisation, d'entretien ou de conservation.", en: "Illustrated steps for use, care or storage." }, "mode d'emploi étapes utilisation entretien conservation", [
    d("cards", "Étapes en cartes", "Steps as cards", "cv-steps", "steps", { layout: "cards" }),
    d("timeline", "Étapes sur une ligne", "Steps on a line", "cv-steps", "timeline", { layout: "timeline" }),
    d("journey", "Frise", "Timeline", "timeline", "timeline"),
  ]),
  e("specialty", 7, "situations", { fr: "Situations d'utilisation", en: "Moments of use" }, { fr: "Le produit dans différents moments et contextes du quotidien.", en: "The product in different everyday moments and settings." }, "situations utilisation moments quotidien galerie", [
    d("alternate", "Alternance image / texte", "Alternating image / text", "cv-alternating", "split-left", { layout: "alternate" }),
    d("image-left", "Images à gauche", "Images on the left", "cv-alternating", "split-left", { layout: "image-left" }),
    d("mosaic", "Mosaïque", "Mosaic", "cv-gallery", "mosaic", { layout: "mosaic" }),
    d("grid", "Galerie en grille", "Grid gallery", "cv-gallery", "grid-3", { layout: "grid" }),
    d("carousel", "Galerie en carrousel", "Carousel gallery", "cv-gallery", "carousel", { layout: "carousel" }),
  ]),
  e("specialty", 8, "video", { fr: "Démonstration vidéo", en: "Video demonstration" }, { fr: "Média dédié montrant le fonctionnement ou l'utilisation.", en: "Dedicated media showing how the product works or is used." }, "vidéo démonstration fonctionnement stories", [
    d("wide", "Grand lecteur", "Large player", "fs-video", "video", { layout: "wide" }),
    d("split", "Vidéo et points clés", "Video and key points", "fs-video", "video-split", { layout: "split" }),
    d("vertical", "Vidéo verticale", "Vertical video", "fs-video", "video-vertical", { layout: "vertical" }),
    d("stories", "Stories en cartes", "Story cards", "cv-stories", "stories", { ratio: "portrait" }),
  ]),
  e("specialty", 9, "comparison", { fr: "Comparatif", en: "Comparison" }, { fr: "Différences entre versions ou solutions, selon des critères vérifiables.", en: "Differences between versions or solutions, on verifiable criteria." }, "comparatif tableau comparaison", [
    d("table", "Tableau", "Table", "comparison-table", "table", { layout: "table" }),
    d("cards", "Cartes par colonne", "One card per column", "comparison-table", "cards", { layout: "cards" }),
  ]),
  e("specialty", 10, "results", { fr: "Résultats et preuves", en: "Results and evidence" }, { fr: "Mesures, tests et avant / après documentés ; aucun résultat inventé.", en: "Documented measurements, tests and before / after; no invented result." }, "résultats preuves chiffres mesures tests avant après", [
    d("grid", "Chiffres en grille", "Figures in a grid", "stats", "stats", { layout: "grid" }),
    d("rows", "Chiffres en lignes", "Figures in rows", "stats", "list", { layout: "rows" }),
    d("measures", "Mesures et sources", "Measurements and sources", "fs-results", "table", { layout: "measures" }),
    d("before-after", "Avant / après", "Before / after", "fs-results", "beforeafter", { layout: "before-after" }),
  ]),
  e("specialty", 11, "reviews", { fr: "Avis et témoignages", en: "Reviews and testimonials" }, { fr: "Cartes, citations, carrousel et témoignages vidéo dans une même section.", en: "Cards, quotes, carousel and video testimonials in one section." }, "avis témoignages clients citation vidéo", [
    d("carousel", "Carrousel d'avis", "Review carousel", "cv-reviews", "carousel"),
    d("quote", "Citation en carte", "Quote card", "cv-quote", "quote", { layout: "card" }),
    d("quote-split", "Citation et visuel", "Quote and visual", "cv-quote", "quote-split", { layout: "split" }),
    d("quote-band", "Citation en bandeau", "Quote band", "cv-quote", "band", { layout: "band" }),
  ]),
  e("specialty", 12, "press", { fr: "Presse et distinctions", en: "Press and awards" }, { fr: "Citations de médias, publications et récompenses vérifiables.", en: "Media quotes, publications and verifiable awards." }, "presse médias distinctions récompenses prix", [
    d("quotes", "Citations de presse", "Press quotes", "fs-press", "grid-3", { layout: "quotes" }),
    d("logos", "Bandeau de logos", "Logo band", "fs-press", "logos", { layout: "logos" }),
    d("featured", "Une citation à la une", "One featured quote", "fs-press", "quote", { layout: "featured" }),
    d("awards", "Distinctions", "Awards", "fs-press", "list", { layout: "awards" }),
  ]),
  e("specialty", 13, "story", { fr: "Histoire de la marque", en: "Brand story" }, { fr: "Origine, vision et récit de la marque.", en: "Origin, vision and story of the brand." }, "histoire marque origine vision récit à propos", [
    d("about", "Récit et valeurs", "Story and values", "about", "split-left"),
    d("statement", "Grande déclaration", "Large statement", "rich-text", "statement", { style: "statement" }),
    d("image-left", "Image et texte", "Image and text", "image-with-text", "split-left", { layout: "image-left" }),
    d("overlap", "Image et texte superposés", "Overlapping image and text", "image-with-text", "split-right", { layout: "overlap" }),
  ]),
  e("specialty", 14, "making", { fr: "Fabrication et savoir-faire", en: "Making and know-how" }, { fr: "Conception, fabrication et contrôles qualité.", en: "Design, making and quality checks." }, "fabrication savoir-faire conception contrôle qualité", [
    d("steps", "Étapes illustrées", "Illustrated steps", "fs-making", "steps", { layout: "steps" }),
    d("sticky", "Image fixe pendant le récit", "Image fixed during the story", "fs-making", "sticky", { layout: "sticky" }),
    d("timeline", "Frise qui progresse", "Progressing timeline", "fs-making", "timeline", { layout: "timeline" }),
    d("grid", "Cartes", "Cards", "fs-making", "grid-3", { layout: "grid" }),
  ]),
  e("specialty", 15, "purchase", { fr: "Achat et offres", en: "Purchase and offers" }, { fr: "Variantes, prix, quantité et offres groupées, avec le panier existant.", en: "Variants, price, quantity and bundles, with the existing cart." }, "achat offres lots quantité prix panier", [
    d("offers", "Produit et offres", "Product and offers", "featured-purchase", "product", { purchase_style: "outlined" }),
    d("compact", "Achat compact", "Compact purchase", "featured-purchase", "product", { purchase_style: "compact" }),
    d("product-offers", "Offres sur la fiche produit", "Offers on the product page", "purchase-offers", "pricing"),
    d("band", "Bandeau d'appel à l'achat", "Purchase call-to-action band", "cta-banner", "band", { style: "center" }),
  ]),
  e("specialty", 16, "addons", { fr: "Produits complémentaires", en: "Complementary products" }, { fr: "Accessoires et références qui complètent l'utilisation.", en: "Accessories and items that complete the use." }, "complémentaires accessoires recommandations", [
    d("recommended", "Recommandations automatiques", "Automatic recommendations", "product-recommendations", "grid-4", { intent: "complementary" }),
    d("grid", "Sélection manuelle en grille", "Manual selection grid", "fs-products", "grid-3", { layout: "grid", source: "manual" }),
    d("carousel", "Sélection en carrousel", "Selection carousel", "fs-products", "carousel", { layout: "carousel", source: "manual" }),
  ]),
  e("specialty", 17, "guarantees", { fr: "Garanties et livraison", en: "Guarantees and delivery" }, { fr: "Expédition, retours, garantie et assistance.", en: "Shipping, returns, warranty and support." }, "garantie livraison expédition retours assistance", [
    d("shield", "Garantie mise en avant", "Highlighted guarantee", "cv-guarantee", "featured"),
    d("grid", "Engagements en grille", "Commitments grid", "fs-commitments", "grid-4", { layout: "grid" }),
    d("list", "Liste détaillée", "Detailed list", "fs-commitments", "list", { layout: "list" }),
  ]),
  e("specialty", 18, "faq", { fr: "Questions fréquentes", en: "Frequently asked questions" }, { fr: "Questions / réponses organisées par sujet.", en: "Questions and answers organised by topic." }, "faq questions réponses", [
    d("cards", "Accordéons en cartes", "Card accordions", "faq", "accordion", { style: "cards", layout: "stacked" }),
    d("lines", "Accordéons en lignes", "Line accordions", "faq", "accordion", { style: "lines", layout: "stacked" }),
    d("side", "Titre à côté", "Title beside", "faq", "split-left", { style: "lines", layout: "side" }),
    d("numbered", "Numérotées", "Numbered", "faq", "list", { style: "numbered", layout: "stacked" }),
  ]),
  e("specialty", 19, "newsletter", { fr: "Newsletter", en: "Newsletter" }, { fr: "Invitation à recevoir les actualités.", en: "Invitation to receive news." }, "newsletter inscription e-mail", [
    d("simple", "Inscription simple", "Simple sign-up", "newsletter", "newsletter"),
    d("visual", "Inscription avec visuel", "Sign-up with visual", "newsletter-media", "split-right"),
  ]),
  e("specialty", 20, "contact", { fr: "Contact", en: "Contact" }, { fr: "Coordonnées et formulaire de questions.", en: "Contact details and question form." }, "contact formulaire coordonnées", [
    d("form", "Formulaire et coordonnées", "Form and details", "contact-form", "form"),
    d("channels", "Moyens de contact", "Ways to reach us", "fs-stores", "cards", { layout: "channels" }),
  ]),
];

// ─── E-commerce — ORBE ────────────────────────────────────────────────────────────────────────────────────────────────
const CATALOG: FamilyEntry[] = [
  e("catalog", 1, "hero", { fr: "Présentation principale", en: "Main presentation" }, { fr: "Composition visuelle introduisant la boutique ou une collection.", en: "Visual composition introducing the store or a collection." }, "ouverture hero boutique collection", [
    d("immersive", "Promesse dans la scène", "Promise within the scene", "ed-opening", "background", { layout: "immersive" }),
    d("journal", "Titre puis paysage", "Title then landscape", "ed-opening", "stacked", { layout: "journal" }),
    // Issue #155 (ALCÔVE) : le produit dans un cadre en arche à côté de la promesse.
    d("arch", "Arche et promesse", "Arch and promise", "ed-opening", "split-right", { layout: "arch" }),
  ]),
  e("catalog", 2, "collections", { fr: "Collections et catégories", en: "Collections and categories" }, { fr: "Accès visuels aux familles de produits.", en: "Visual access to product families." }, "collections catégories familles", [
    d("grid", "Grille", "Grid", "fs-collections", "grid-3", { layout: "grid" }),
    d("asym", "Une grande et des petites", "One large, several small", "fs-collections", "asym", { layout: "asym" }),
    d("carousel", "Carrousel", "Carousel", "fs-collections", "carousel", { layout: "carousel" }),
    d("index", "Index avec aperçu", "Index with preview", "fs-collections", "index", { layout: "index" }),
  ]),
  e("catalog", 3, "products", { fr: "Sélection de produits", en: "Product selection" }, { fr: "Grille ou carrousel : nouveautés, meilleures ventes ou sélection manuelle.", en: "Grid or carousel: new arrivals, best sellers or manual selection." }, "produits sélection nouveautés meilleures ventes grille carrousel", [
    d("grid", "Grille", "Grid", "fs-products", "grid-4", { layout: "grid" }),
    d("carousel", "Carrousel", "Carousel", "fs-products", "carousel", { layout: "carousel" }),
    d("editorial", "Liste éditoriale", "Editorial list", "fs-products", "list", { layout: "list" }),
    d("recommended", "Recommandations (fiche produit)", "Recommendations (product page)", "product-recommendations", "grid-4", { intent: "related" }),
  ]),
  e("catalog", 4, "featured", { fr: "Produit à la une", en: "Featured product" }, { fr: "Présentation approfondie d'une référence avec informations et achat.", en: "In-depth presentation of one item with details and purchase." }, "produit à la une achat référence", [
    d("offers", "Galerie et achat", "Gallery and purchase", "featured-purchase", "product", { purchase_style: "outlined" }),
    d("compact", "Achat compact", "Compact purchase", "featured-purchase", "product", { purchase_style: "compact" }),
    d("product-offers", "Offres sur la fiche produit", "Offers on the product page", "purchase-offers", "pricing"),
  ]),
  e("catalog", 5, "lookbook", { fr: "Ambiance et lookbook", en: "Mood and lookbook" }, { fr: "Scènes de plusieurs produits avec repères permettant de les identifier.", en: "Scenes with several products and markers to identify them." }, "ambiance lookbook scène repères produits", [
    d("markers", "Scène et repères produits", "Scene and product markers", "fs-lookbook", "hotspots", { layout: "markers" }),
    d("side", "Scène et liste des produits", "Scene and product list", "fs-lookbook", "split-left", { layout: "side" }),
    d("split", "Scène et texte", "Scene and text", "ed-scene", "split-left", { layout: "split" }),
    d("panorama", "Panorama", "Panorama", "ed-scene", "background", { layout: "panorama" }),
  ]),
  e("catalog", 6, "finishes", { fr: "Matières et finitions", en: "Materials and finishes" }, { fr: "Textures, échantillons visuels et explications.", en: "Textures, visual samples and explanations." }, "matières finitions textures échantillons coloris", [
    d("strip", "Bande des finitions", "Finish strip", "ed-finishes", "grid-3", { image_asset: "" }),
    d("scene", "Finitions en situation", "Finishes in context", "ed-finishes", "split-left"),
  ]),
  e("catalog", 7, "dimensions", { fr: "Dimensions et proportions", en: "Dimensions and proportions" }, { fr: "Dessins cotés, repères d'échelle et encombrement.", en: "Dimensioned drawings, scale references and footprint." }, "dimensions proportions cotes taille encombrement", [
    d("drawing", "Dessin coté", "Dimensioned drawing", "fs-dimensions", "drawing", { layout: "drawing" }),
    d("photo", "Photo et cotes", "Photo and dimensions", "fs-dimensions", "split-left", { layout: "photo" }),
    d("table", "Tableau des formats", "Size table", "fs-dimensions", "table", { layout: "table" }),
  ]),
  e("catalog", 8, "uses", { fr: "Usages et installation", en: "Uses and installation" }, { fr: "Mise en place et utilisations expliquées visuellement.", en: "Set-up and uses explained visually." }, "usages installation utilisation mise en place", [
    d("side", "Deux usages côte à côte", "Two uses side by side", "ed-diptych", "grid-2", { layout: "side" }),
    d("pair", "Diptyque décalé", "Offset diptych", "ed-diptych", "grid-2", { layout: "pair" }),
    d("index", "Index d'usages", "Index of uses", "ed-diptych", "asym", { layout: "index" }),
  ]),
  e("catalog", 9, "care", { fr: "Entretien et durabilité", en: "Care and durability" }, { fr: "Conseils pour entretenir et prolonger la vie des produits.", en: "Advice to care for products and make them last." }, "entretien durabilité conseils réparation", [
    d("list", "Conseils en liste", "Advice list", "fs-care", "list", { layout: "list" }),
    d("columns", "À faire / à éviter", "Do / avoid", "fs-care", "grid-2", { layout: "columns" }),
    d("cards", "Cartes", "Cards", "fs-care", "grid-3", { layout: "cards" }),
    d("accordion", "Accordéons", "Accordions", "fs-care", "accordion", { layout: "accordion" }),
  ]),
  e("catalog", 10, "comparison", { fr: "Comparatif de références", en: "Model comparison" }, { fr: "Tableau éditorial des différences entre modèles.", en: "Editorial table of the differences between models." }, "comparatif modèles tableau références", [
    d("table", "Tableau", "Table", "comparison-table", "table", { layout: "table" }),
    d("cards", "Cartes par modèle", "One card per model", "comparison-table", "cards", { layout: "cards" }),
  ]),
  e("catalog", 11, "campaign", { fr: "Campagne commerciale", en: "Commercial campaign" }, { fr: "Opération ou lancement, conditions et lien.", en: "Operation or launch, terms and link." }, "campagne opération lancement soldes conditions", [
    d("split", "Visuel et conditions", "Visual and terms", "fs-campaign", "split-right", { layout: "split" }),
    d("background", "Plein cadre", "Full frame", "fs-campaign", "background", { layout: "background" }),
    d("card", "Carte", "Card", "fs-campaign", "featured", { layout: "card" }),
    d("band", "Bandeau d'appel", "Call-to-action band", "cta-banner", "band", { style: "center" }),
  ]),
  e("catalog", 12, "heritage", { fr: "Histoire de la maison", en: "House story" }, { fr: "Origines et direction créative.", en: "Origins and creative direction." }, "histoire maison origines direction créative", [
    d("statement", "Phrase et repères", "Statement and markers", "ed-statement", "statement"),
    d("text", "Grande déclaration", "Large statement", "rich-text", "statement", { style: "statement" }),
    d("image-left", "Image et texte", "Image and text", "image-with-text", "split-left", { layout: "image-left" }),
  ]),
  e("catalog", 13, "atelier", { fr: "Fabrication et ateliers", en: "Making and workshops" }, { fr: "Travail de fabrication et savoir-faire.", en: "Making process and know-how." }, "fabrication ateliers savoir-faire artisans", [
    d("sticky", "Image fixe pendant le récit", "Image fixed during the story", "fs-making", "sticky", { layout: "sticky" }),
    d("steps", "Étapes illustrées", "Illustrated steps", "fs-making", "steps", { layout: "steps" }),
    d("timeline", "Frise qui progresse", "Progressing timeline", "fs-making", "timeline", { layout: "timeline" }),
  ]),
  e("catalog", 14, "commitments", { fr: "Engagements de la marque", en: "Brand commitments" }, { fr: "Engagements concrets et documentés.", en: "Concrete, documented commitments." }, "engagements responsabilité durabilité preuves", [
    d("grid", "Grille", "Grid", "fs-commitments", "grid-4", { layout: "grid" }),
    d("list", "Liste numérotée", "Numbered list", "fs-commitments", "list", { layout: "list" }),
    d("split", "Image et engagements", "Image and commitments", "fs-commitments", "split-left", { layout: "split" }),
    d("glow", "Grille d'atouts", "Highlights grid", "features-grid", "grid-2", { style: "glow", columns: 2 }),
  ]),
  e("catalog", 15, "reviews", { fr: "Avis clients", en: "Customer reviews" }, { fr: "Retours sur les produits et l'expérience d'achat.", en: "Feedback on the products and the buying experience." }, "avis clients notes témoignages", [
    d("grid", "Mur d'avis", "Review wall", "fs-reviews", "grid-3", { layout: "grid" }),
    d("carousel", "Carrousel", "Carousel", "fs-reviews", "carousel", { layout: "carousel" }),
    d("featured", "Un avis à la une", "One featured review", "fs-reviews", "quote", { layout: "featured" }),
  ]),
  e("catalog", 16, "press", { fr: "Presse et distinctions", en: "Press and awards" }, { fr: "Publications et récompenses.", en: "Publications and awards." }, "presse publications distinctions", [
    d("quotes", "Citations de presse", "Press quotes", "fs-press", "grid-3", { layout: "quotes" }),
    d("logos", "Bandeau de logos", "Logo band", "fs-press", "logos", { layout: "logos" }),
    d("featured", "Une citation à la une", "One featured quote", "fs-press", "quote", { layout: "featured" }),
    d("awards", "Distinctions", "Awards", "fs-press", "list", { layout: "awards" }),
  ]),
  e("catalog", 17, "journal", { fr: "Journal et inspirations", en: "Journal and inspiration" }, { fr: "Sélection d'articles, conseils et dossiers.", en: "Selection of articles, advice and features." }, "journal blog articles inspirations conseils", [
    d("editorial", "Un article à la une et une liste", "One lead article and a list", "fs-journal", "asym", { layout: "editorial" }),
    d("grid", "Grille", "Grid", "fs-journal", "grid-3", { layout: "grid" }),
    d("list", "Liste", "List", "fs-journal", "list", { layout: "list" }),
  ]),
  e("catalog", 18, "faq", { fr: "Informations d'achat et FAQ", en: "Buying information and FAQ" }, { fr: "Livraison, retours, paiement et réponses pratiques regroupés par thème.", en: "Delivery, returns, payment and practical answers grouped by topic." }, "faq livraison retours paiement questions", [
    d("side", "Titre à côté", "Title beside", "v2-faq", "split-left", { layout: "side" }),
    d("center", "Centré", "Centred", "v2-faq", "accordion", { layout: "center" }),
    d("cards", "Accordéons en cartes", "Card accordions", "faq", "accordion", { style: "cards" }),
    d("lines", "Accordéons en lignes", "Line accordions", "faq", "accordion", { style: "lines" }),
  ]),
  e("catalog", 19, "newsletter", { fr: "Newsletter", en: "Newsletter" }, { fr: "Actualités et collections.", en: "News and collections." }, "newsletter inscription", [
    d("simple", "Inscription simple", "Simple sign-up", "newsletter", "newsletter"),
    d("visual", "Inscription avec visuel", "Sign-up with visual", "newsletter-media", "split-right"),
  ]),
  e("catalog", 20, "contact", { fr: "Contact et points de vente", en: "Contact and stores" }, { fr: "Coordonnées, formulaire, adresses et horaires.", en: "Contact details, form, addresses and opening hours." }, "contact points de vente boutiques adresses horaires", [
    d("form-image", "Formulaire et image", "Form and image", "ed-contact", "form-split"),
    d("form", "Formulaire et coordonnées", "Form and details", "contact-form", "form"),
    d("stores", "Points de vente", "Stores", "fs-stores", "stores", { layout: "stores" }),
  ]),
];

// ─── Prestations de services — Atelier Rive ───────────────────────────────────────────────────────────────────────────
const SERVICES: FamilyEntry[] = [
  e("services", 1, "hero", { fr: "Présentation de l'activité", en: "Business presentation" }, { fr: "Métier, promesse, grand visuel et action principale.", en: "Trade, promise, large visual and main action." }, "ouverture activité métier promesse", [
    d("journal", "Titre puis paysage", "Title then landscape", "ed-opening", "stacked", { layout: "journal" }),
    d("immersive", "Promesse dans la scène", "Promise within the scene", "ed-opening", "background", { layout: "immersive" }),
  ]),
  e("services", 2, "offers", { fr: "Prestations proposées", en: "Services offered" }, { fr: "Catalogue de services en cartes, liste ou panneaux.", en: "Service catalogue as cards, a list or panels." }, "prestations services catalogue", [
    d("list", "Liste", "List", "services-list", "list", { layout: "list" }),
    d("cards", "Cartes", "Cards", "services-list", "grid-3", { layout: "cards" }),
  ]),
  e("services", 3, "detail", { fr: "Détail d'une prestation", en: "Service detail" }, { fr: "Périmètre, contenu et livrables d'un service.", en: "Scope, content and deliverables of a service." }, "détail prestation périmètre livrables", [
    d("split", "Résumé fixe et détail", "Fixed summary and detail", "fs-service", "sticky", { layout: "split" }),
    d("stacked", "Détail empilé", "Stacked detail", "fs-service", "stacked", { layout: "stacked" }),
    d("columns", "Inclus / livrables en colonnes", "Included / deliverables in columns", "fs-service", "grid-2", { layout: "columns" }),
  ]),
  e("services", 4, "needs", { fr: "Besoins accompagnés", en: "Needs we support" }, { fr: "Situations clients et types de projets accompagnés.", en: "Client situations and types of projects supported." }, "besoins situations projets clients", [
    d("cards", "Cartes", "Cards", "fs-needs", "grid-3", { layout: "cards" }),
    d("list", "Liste", "List", "fs-needs", "list", { layout: "list" }),
    d("accordion", "Accordéons", "Accordions", "fs-needs", "accordion", { layout: "accordion" }),
    d("scene", "Scène et texte", "Scene and text", "ed-scene", "split-left", { layout: "split" }),
  ]),
  e("services", 5, "portfolio", { fr: "Réalisations", en: "Projects" }, { fr: "Portfolio avec visuels, légendes et liens.", en: "Portfolio with visuals, captions and links." }, "réalisations portfolio projets", [
    d("editorial", "Éditorial", "Editorial", "portfolio", "asym", { layout: "editorial" }),
    d("grid", "Grille", "Grid", "portfolio", "grid-3", { layout: "grid" }),
  ]),
  e("services", 6, "case", { fr: "Étude de cas", en: "Case study" }, { fr: "Demande, contraintes, réponse et résultat d'un projet.", en: "Request, constraints, answer and result of a project." }, "étude de cas projet demande contraintes résultat", [
    d("sticky", "Image fixe pendant le récit", "Image fixed during the story", "fs-case", "sticky", { layout: "sticky" }),
    d("columns", "Quatre colonnes", "Four columns", "fs-case", "grid-4", { layout: "columns" }),
    d("stacked", "Récit empilé", "Stacked story", "fs-case", "stacked", { layout: "stacked" }),
  ]),
  e("services", 7, "before-after", { fr: "Avant / après", en: "Before / after" }, { fr: "Transformation réelle, curseur ou vues juxtaposées.", en: "Real transformation, slider or side-by-side views." }, "avant après transformation curseur comparaison", [
    d("slider", "Curseur", "Slider", "ed-study", "beforeafter", { aligned: true }),
    d("side", "Vues juxtaposées", "Side-by-side views", "ed-study", "grid-2", { aligned: false }),
  ]),
  e("services", 8, "method", { fr: "Méthode de travail", en: "Working method" }, { fr: "Étapes de l'accompagnement.", en: "Steps of the support." }, "méthode étapes accompagnement processus", [
    d("timeline", "Frise", "Timeline", "timeline", "timeline"),
    d("horizontal", "Étapes horizontales", "Horizontal steps", "how-to", "steps", { layout: "horizontal" }),
    d("vertical", "Étapes verticales", "Vertical steps", "how-to", "list", { layout: "vertical" }),
    d("chapters", "Chapitres illustrés", "Illustrated chapters", "ref-narrative", "sticky"),
  ]),
  e("services", 9, "commitments", { fr: "Engagements de service", en: "Service commitments" }, { fr: "Suivi, qualité, délais et communication.", en: "Follow-up, quality, timing and communication." }, "engagements service suivi qualité délais", [
    d("grid", "Grille", "Grid", "fs-commitments", "grid-4", { layout: "grid" }),
    d("list", "Liste numérotée", "Numbered list", "fs-commitments", "list", { layout: "list" }),
    d("split", "Image et engagements", "Image and commitments", "fs-commitments", "split-left", { layout: "split" }),
  ]),
  e("services", 10, "team", { fr: "Équipe et expertises", en: "Team and expertise" }, { fr: "Personnes, rôles et spécialités.", en: "People, roles and specialities." }, "équipe expertises personnes rôles", [
    d("cards", "Cartes", "Cards", "team", "grid-3", { style: "cards" }),
    d("portraits", "Portraits", "Portraits", "team", "grid-4", { style: "portraits" }),
    d("plain", "Liste sobre", "Plain list", "team", "list", { style: "plain" }),
  ]),
  e("services", 11, "history", { fr: "Histoire de l'entreprise", en: "Company history" }, { fr: "Parcours et évolution.", en: "Background and evolution." }, "histoire entreprise parcours", [
    d("about", "Récit et valeurs", "Story and values", "about", "split-left"),
    d("statement", "Phrase et repères", "Statement and markers", "ed-statement", "statement"),
    d("text", "Grande déclaration", "Large statement", "rich-text", "statement", { style: "statement" }),
  ]),
  e("services", 12, "credentials", { fr: "Qualifications et assurances", en: "Qualifications and insurance" }, { fr: "Diplômes, certifications et assurances réels.", en: "Real diplomas, certifications and insurance." }, "qualifications certifications assurances diplômes", [
    d("list", "Liste détaillée", "Detailed list", "fs-credentials", "list", { layout: "list" }),
    d("cards", "Cartes", "Cards", "fs-credentials", "grid-3", { layout: "cards" }),
    d("table", "Tableau", "Table", "fs-credentials", "table", { layout: "table" }),
  ]),
  e("services", 13, "equipment", { fr: "Moyens et équipements", en: "Means and equipment" }, { fr: "Outils, installations et techniques.", en: "Tools, facilities and techniques." }, "moyens équipements outils techniques", [
    d("grid", "Grille", "Grid", "fs-equipment", "grid-3", { layout: "grid" }),
    d("list", "Liste", "List", "fs-equipment", "list", { layout: "list" }),
    d("split", "Image et liste", "Image and list", "fs-equipment", "split-left", { layout: "split" }),
  ]),
  e("services", 14, "testimonials", { fr: "Témoignages clients", en: "Client testimonials" }, { fr: "Retours authentiques sur l'accompagnement.", en: "Genuine feedback on the support." }, "témoignages avis clients", [
    d("classic", "Avis en cartes", "Review cards", "testimonials", "grid-3"),
    d("carousel", "Carrousel", "Carousel", "fs-reviews", "carousel", { layout: "carousel" }),
    d("featured", "Un témoignage à la une", "One featured testimonial", "fs-reviews", "quote", { layout: "featured" }),
  ]),
  e("services", 15, "references", { fr: "Références professionnelles", en: "Professional references" }, { fr: "Organisations clientes et partenaires, avec leur rôle.", en: "Client organisations and partners, with their role." }, "références clients partenaires logos", [
    d("wall", "Logos par rôle", "Logos by role", "fs-references", "logos", { layout: "wall" }),
    d("list", "Liste avec rôles", "List with roles", "fs-references", "list", { layout: "list" }),
    d("marquee", "Bandeau défilant", "Scrolling band", "fs-references", "marquee", { layout: "marquee" }),
  ]),
  e("services", 16, "pricing", { fr: "Tarifs et formules", en: "Prices and packages" }, { fr: "Forfaits, inclusions et modalités tarifaires.", en: "Packages, inclusions and pricing terms." }, "tarifs formules forfaits prix", [
    d("cards", "Formules en cartes", "Package cards", "pricing", "pricing"),
  ]),
  e("services", 17, "area", { fr: "Zone d'intervention et accès", en: "Service area and access" }, { fr: "Territoires desservis, adresse, horaires et déplacement.", en: "Areas served, address, opening hours and travel." }, "zone intervention accès adresse horaires carte", [
    d("info", "Informations pratiques", "Practical information", "practical-info", "list", { map: "none" }),
    d("map", "Avec carte", "With a map", "practical-info", "map", { map: "osm" }),
  ]),
  e("services", 18, "faq", { fr: "Questions fréquentes", en: "Frequently asked questions" }, { fr: "Préparation et déroulement des prestations.", en: "Preparation and course of the services." }, "faq questions préparation déroulement", [
    d("lines", "Accordéons en lignes", "Line accordions", "faq", "accordion", { style: "lines" }),
    d("cards", "Accordéons en cartes", "Card accordions", "faq", "accordion", { style: "cards" }),
    d("side", "Titre à côté", "Title beside", "faq", "split-left", { style: "lines", layout: "side" }),
  ]),
  e("services", 19, "news", { fr: "Conseils et actualités", en: "Advice and news" }, { fr: "Articles professionnels et nouvelles de l'entreprise.", en: "Professional articles and company news." }, "conseils actualités articles blog", [
    d("editorial", "Un article à la une et une liste", "One lead article and a list", "fs-journal", "asym", { layout: "editorial" }),
    d("grid", "Grille", "Grid", "fs-journal", "grid-3", { layout: "grid" }),
    d("list", "Liste", "List", "fs-journal", "list", { layout: "list" }),
  ]),
  e("services", 20, "contact", { fr: "Contact et prise de rendez-vous", en: "Contact and booking" }, { fr: "Formulaire ou accès au calendrier existant selon l'activité.", en: "Form or access to the existing calendar depending on the business." }, "contact rendez-vous réservation formulaire calendrier", [
    d("form", "Formulaire et coordonnées", "Form and details", "contact-form", "form"),
    d("booking", "Demande de rendez-vous", "Appointment request", "booking", "form-split"),
    d("calendar", "Calendrier de réservation", "Booking calendar", "booking-calendar", "table"),
    d("form-image", "Formulaire et image", "Form and image", "ed-contact", "form-split"),
    d("band", "Bandeau d'appel", "Call-to-action band", "cta-banner", "band", { style: "center" }),
  ]),
];

export const FAMILY_LIBRARY: Record<FamilyId, FamilyEntry[]> = { specialty: SPECIALTY, catalog: CATALOG, services: SERVICES };
export const ALL_ENTRIES: FamilyEntry[] = [...SPECIALTY, ...CATALOG, ...SERVICES];

/** Composants hors des 20 sections : structure des pages, modèles techniques, pages légales et articles. */
export const STRUCTURAL_TYPES = new Set(["header", "footer", "announcement-bar", "cart-drawer", "legal-page", "cv-article", "apps"]);
export const isStructuralType = (type: string) => type.startsWith("main-") || STRUCTURAL_TYPES.has(type);

/** Types de sections proposables dans une famille (union des dispositions de ses 20 entrées). */
export function familyTypes(family: FamilyId): Set<string> {
  return new Set(FAMILY_LIBRARY[family].flatMap((x) => x.dispositions.map((y) => y.type)));
}

/** Famille d'un thème de référence (repli quand la catégorie du projet n'est pas connue). */
export const THEME_FAMILY: Record<string, FamilyId> = { fraise: "specialty", onde: "specialty", orbe: "catalog", rive: "services", sillon: "specialty", noctil: "specialty", traverse: "specialty", heuren: "catalog", alcove: "catalog", "museau-club": "specialty" };
export const familyOf = (kind: StoreKind | null | undefined, theme?: string): FamilyId | null => kind ?? (theme ? THEME_FAMILY[theme] ?? null : null);

export const entryByKey = (key: string): FamilyEntry | undefined => ALL_ENTRIES.find((x) => x.key === key);

/** Identifiant d'élément de galerie : « fam:<entrée> » ou « fam:<entrée>~<disposition> ». */
export const libraryId = (entry: FamilyEntry, disposition?: Disposition) => `fam:${entry.key}${disposition ? `~${disposition.id}` : ""}`;
export function parseLibraryId(id: string): { entry: FamilyEntry; disposition: Disposition } | null {
  const m = /^fam:([a-z]+\.[a-z0-9-]+)(?:~([a-z0-9-]+))?$/.exec(id);
  if (!m) return null;
  const entry = entryByKey(m[1]);
  if (!entry) return null;
  const disposition = m[2] ? entry.dispositions.find((x) => x.id === m[2]) : entry.dispositions[0];
  return disposition ? { entry, disposition } : null;
}

/** Entrée de la famille qui contient ce type (un type n'appartient qu'à une entrée par famille). */
export const entryForType = (family: FamilyId, type: string): FamilyEntry | undefined => FAMILY_LIBRARY[family].find((x) => x.dispositions.some((y) => y.type === type));

/**
 * Disposition actuelle d'une section : celle dont tous les réglages correspondent ; à défaut, la plus proche du même
 * type (réglages retouchés à la main : « personnalisée », la disposition d'origine reste identifiable).
 */
export function currentDisposition(entry: FamilyEntry, type: string, settings: Record<string, unknown>): { disposition: Disposition; exact: boolean } | null {
  const same = entry.dispositions.filter((x) => x.type === type);
  if (!same.length) return null;
  const score = (x: Disposition) => Object.entries(x.settings ?? {}).filter(([k, v]) => settings[k] === v || (settings[k] === undefined && v === "")).length - Object.entries(x.settings ?? {}).filter(([k, v]) => settings[k] !== undefined && settings[k] !== v).length * 2;
  const exact = same.find((x) => Object.entries(x.settings ?? {}).every(([k, v]) => settings[k] === v || ((settings[k] === undefined || settings[k] === "") && v === "")));
  if (exact) return { disposition: exact, exact: true };
  return { disposition: [...same].sort((a, b) => score(b) - score(a))[0], exact: false };
}

export const pickT = (t: T, lang: Lang) => (lang === "en" ? t.en : t.fr);
