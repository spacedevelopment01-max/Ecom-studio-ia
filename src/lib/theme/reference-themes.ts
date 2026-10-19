/**
 * Les quatre thèmes de référence de l'issue #137 comme vrais thèmes du studio (catalogue, galerie, composition
 * automatique) : FRAISE et ONDE (boutique spécialisée, profil « conversion » Lumora / Pawish), ORBE (e-commerce,
 * composition éditoriale « objet et ambiances ») et Atelier Rive (prestations de services, composition « journal »).
 *
 * Chaque thème est composé avec l'identité validée du projet : palette dérivée des rôles de la marque (clair, sombre,
 * accent), polices du thème, textes et médias du projet par les sections de la bibliothèque (section-copy-*.ts). Les
 * données de démonstration des fixtures (avis, offres, prix) n'entrent jamais ici : une information inconnue laisse la
 * section masquée, à compléter dans le studio. Le caractère graphique de chaque référence est porté par les profils
 * globaux (`conversion_profile`, `editorial_profile`) et les sections de sa famille.
 */
import type { CatalogTheme, ThemeLook } from "./theme-catalog";

const look = (l: Partial<ThemeLook> & Pick<ThemeLook, "headerLayout" | "shape" | "menu" | "footer" | "ann" | "card" | "button" | "radius">): ThemeLook => ({
  icons: "plain", headingCase: "none", tracking: 0, headingScale: 100, glow: 0, shine: false, dark: false, gallery: "carousel", pageWidth: 1320, spacing: 100, ds: "product", density: "balanced", buttonUppercase: false,
  ...l,
});

export const REFERENCE_CATALOG: CatalogTheme[] = [
  {
    id: "fraise",
    name: "Fraise",
    tagline: "Page de vente pop, un produit phare",
    description: "Référence Lumora : fond crème, accent vif, titres en capitales, boutons bordés. Ouverture produit avec arguments cochés, bandeau de confiance, avis, visuel et argument, bénéfices en grille, comparatif, garantie, stories et FAQ : une page de vente dense pour une boutique spécialisée.",
    bestFor: ["boutique spécialisée", "produit phare", "confiserie", "bien-être", "offres par quantité"],
    en: { tagline: "Pop sales page, one hero product", description: "Lumora reference: cream background, bright accent, capital headings, outlined buttons. Product opening with checked arguments, trust band, reviews, visual and argument, benefits grid, comparison, guarantee, stories and FAQ: a dense sales page for a specialty store.", bestFor: ["specialty store", "hero product", "confectionery", "wellness", "quantity offers"] },
    fonts: { heading: "montserrat_n8", body: "dm_sans_n4" },
    previewFonts: { heading: "Montserrat", body: "DM Sans" },
    motion: "normal",
    photoMood: "pop",
    kinds: ["specialty"],
    // Boutons « solid » : le profil « pop » dessine lui-même la bordure noire et l'ombre portée (un style « outline » rendrait le texte illisible sur un accent sombre).
    look: look({ headerLayout: "logo-center", shape: "bar", menu: "drawer", footer: "columns", ann: "static", card: "boxed", button: "solid", radius: { button: 12, card: 16 }, headingCase: "uppercase", tracking: -2, headingScale: 104, density: "compact", buttonUppercase: true }),
    settings: { conversion_profile: "pop", editorial_profile: "none" },
    mainProduct: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, purchase_style: "outlined" },
    palette: (k) => {
      const bg = k.light("#FBF7F2");
      const ink = k.night(0.08, 0.1);
      return [k.scheme(bg, ink, k.onLight(bg)), k.scheme(ink, "#FFFFFF", k.onDark(ink), 0.06), k.filled(k.p.accent), k.scheme("#FFFFFF", ink, k.onLight("#FFFFFF"))];
    },
    home: (k) => [
      k.lib("cv-hero", 1, { image_asset: k.im.packshot ?? k.im.cutout ?? k.im.hero, image_ratio: "square", layout: "image-right" }),
      k.marq(3, "small"),
      k.lib("cv-reviews", 1),
      k.lib("cv-feature", 4, { image_asset: k.im.detail1 ?? k.im.scene1, layout: "stacked" }),
      k.feat(1, "plain", 2),
      k.lib("cv-feature", 1, { image_asset: k.im.detail2 ?? k.im.scene2, layout: "image-left" }),
      k.lib("comparison-table", 1),
      ...k.stats(1),
      k.lib("cv-guarantee", 2),
      k.lib("cv-stories", 1, { ratio: "portrait", size: "medium" }),
      k.faqSec(1, 6, "cards"),
      k.newsletter(1),
      k.marq(3, "small", true),
    ],
    product: (k) => [
      k.lib("cv-stories", 1, { ratio: "portrait", size: "medium" }),
      k.lib("cv-feature", 4, { image_asset: k.im.detail1 ?? k.im.scene1, layout: "stacked" }),
      k.feat(1, "plain", 2),
      k.lib("cv-reviews", 1),
      k.lib("cv-specs", 1, { layout: "side" }),
      ...k.stats(1),
      k.lib("cv-guarantee", 2),
      k.faqSec(1, 5, "cards"),
    ],
    services: (k) => [
      k.lib("cv-hero", 1, { image_asset: k.im.lifestyle ?? k.im.hero, image_ratio: "landscape", layout: "image-right" }),
      ...k.R.trust(3),
      k.R.servicesList(1, "cards", { withImages: true }),
      k.lib("cv-feature", 4, { image_asset: k.im.scene1 ?? k.im.detail1, layout: "image-left" }),
      k.feat(1, "plain", 2),
      k.R.testimonials(4),
      k.lib("cv-guarantee", 2),
      k.R.practical(1),
      k.faqSec(1, 6, "cards"),
      k.newsletter(4),
    ],
  },
  {
    id: "onde",
    name: "Onde",
    tagline: "Contraste sombre, accent vif",
    description: "Référence Pawish : ouverture anthracite sur une bannière produit, bandeau de confiance, détails en cartes, avis, chiffres, visuel et argument, comparatif, garantie et stories ; boutons arrondis dégradés, accent vert ou couleur de marque lisible sur le sombre.",
    bestFor: ["boutique spécialisée", "high-tech", "audio", "accessoires", "un seul coloris"],
    en: { tagline: "Dark contrast, bright accent", description: "Pawish reference: charcoal opening on a product banner, trust band, detail cards, reviews, figures, visual and argument, comparison, guarantee and stories; rounded gradient buttons, a green or brand accent readable on dark.", bestFor: ["specialty store", "tech", "audio", "accessories", "single color"] },
    fonts: { heading: "inter_n7", body: "dm_sans_n4" },
    previewFonts: { heading: "Inter", body: "DM Sans" },
    motion: "normal",
    photoMood: "nocturne",
    kinds: ["specialty"],
    look: look({ headerLayout: "logo-center", shape: "floating", menu: "sheet", footer: "brand-left", ann: "static", card: "boxed", button: "solid", radius: { button: 40, card: 20 }, headingCase: "none", tracking: -3, headingScale: 102, density: "compact", buttonUppercase: true, glow: 30 }),
    settings: { conversion_profile: "contrast", editorial_profile: "none" },
    mainProduct: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-2" },
    palette: (k) => {
      const ink = k.night(0.12, 0.05);
      return [k.scheme("#FFFFFF", ink, k.onLight("#FFFFFF")), k.scheme(ink, "#FFFFFF", k.onDark(ink), 0.06), k.filled(k.p.accent), k.scheme(k.tint(k.p.accent, 0.96, 0.4), ink, k.onLight(k.tint(k.p.accent, 0.96, 0.4)))];
    },
    home: (k) => [
      k.lib("cv-banner", 2, { image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.packshot, layout: "background", heading_tag: "h1" }),
      k.marq(3, "small"),
      k.lib("cv-cards", 1, { layout: "rows" }),
      k.lib("cv-reviews", 4),
      ...k.stats(2),
      k.lib("cv-feature", 1, { image_asset: k.im.packshot ?? k.im.detail1, layout: "stacked" }),
      k.lib("comparison-table", 4),
      k.lib("cv-guarantee", 2),
      k.lib("cv-stories", 1, { ratio: "portrait", size: "medium" }),
      k.marq(3, "small", true),
    ],
    product: (k) => [
      k.marq(3, "small"),
      k.lib("cv-cards", 1, { layout: "rows" }),
      k.lib("cv-feature", 4, { image_asset: k.im.detail1 ?? k.im.packshot, layout: "stacked" }),
      k.lib("comparison-table", 1),
      ...k.stats(2),
      k.lib("cv-reviews", 4),
      k.lib("cv-stories", 1, { ratio: "portrait", size: "medium" }),
      k.faqSec(1, 5, "lines"),
    ],
    services: (k) => [
      k.lib("cv-banner", 2, { image_asset: k.im.lifestyle ?? k.im.hero, layout: "background", heading_tag: "h1" }),
      ...k.stats(2),
      k.R.servicesList(1, "list"),
      k.lib("cv-cards", 4, { layout: "rows" }),
      k.R.method(1, "timeline"),
      k.lib("cv-feature", 2, { image_asset: k.im.scene1 ?? k.im.detail1, layout: "stacked" }),
      k.R.testimonials(1),
      k.R.booking(4),
      k.R.practical(2),
    ],
  },
  {
    id: "orbe",
    name: "Orbe",
    tagline: "Objet et ambiances",
    description: "Composition éditoriale : ouverture photographique immersive, déclaration et notes, diptyque, scène du soir, finitions en contexte, produit à la une, catalogue en cartes et étude ; serif élégante, crème et terre cuite ou couleurs de la marque.",
    bestFor: ["e-commerce", "maison", "luminaires", "objets", "finitions"],
    en: { tagline: "Object and atmospheres", description: "Editorial composition: immersive photographic opening, statement and notes, diptych, evening scene, finishes in context, featured product, catalog cards and a study; elegant serif, cream and terracotta or the brand colors.", bestFor: ["e-commerce", "home", "lighting", "objects", "finishes"] },
    fonts: { heading: "cormorant_n5", body: "dm_sans_n4" },
    previewFonts: { heading: "Cormorant", body: "DM Sans" },
    motion: "subtle",
    photoMood: "galerie",
    kinds: ["catalog"],
    look: look({ headerLayout: "logo-left", shape: "bar", menu: "drawer", footer: "minimal", ann: "static", card: "minimal", button: "solid", radius: { button: 6, card: 0 }, headingScale: 110, tracking: -1, pageWidth: 1416, gallery: "carousel", ds: "maison", density: "airy" }),
    settings: { editorial_profile: "object", conversion_profile: "none", motion_intensity: "subtle" },
    // Galerie en cadre portrait (la lampe est verticale : rien de coupé en haut ni en bas), zoom, sans barre fixe.
    mainProduct: { gallery_layout: "carousel", gallery_ratio: "portrait", enable_zoom: true, sticky_bar: false, color_scheme: "scheme-1" },
    palette: (k) => {
      const cream = k.light("#F4F0E8");
      const ink = k.night(0.14, 0.12);
      return [k.scheme(cream, ink, k.onLight(cream)), k.scheme(ink, cream, k.onDark(ink), 0.06), k.scheme("#FFFFFF", ink, k.onLight("#FFFFFF")), k.filled(k.p.accent)];
    },
    // Accueil (reprise du 19 octobre) : un rôle par section, aucune répétition — ouverture en situation (signature),
    // déclaration (histoire + repères), diptyque vue complète / détail, scène du soir (positionnement), finitions avec
    // accès à la fiche, questions quand elles ont des réponses, appel à l'action. Pas de « produit à la une » en lots.
    home: (k) => [
      k.lib("ed-opening", 1, { layout: "immersive", heading_tag: "h1", image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.scene1, copy_surface: true, padding_top: 0, padding_bottom: 0 }),
      k.lib("ed-statement", 3, { padding_top: 72, padding_bottom: 72 }),
      k.lib("ed-diptych", 1, { layout: "offset", padding_top: 72, padding_bottom: 72 }),
      k.lib("ed-scene", 2, { layout: "split", image_asset: k.im.scene1 ?? k.im.scene2 ?? k.im.lifestyle2, padding_top: 72, padding_bottom: 72 }),
      k.lib("ed-finishes", 1, { image_asset: k.im.detail1 ?? k.im.packshot, button_label: k.t("Voir la fiche produit", "See the product page"), padding_top: 72, padding_bottom: 72 }),
      k.v2.faq("side", 3),
      k.cta(4, k.im.scene2 ?? k.im.scene3 ?? k.im.banner),
    ],
    // Fiche : galerie et achat, puis finitions (vues par finition) et scène ; la FAQ seulement avec des réponses.
    product: (k) => [
      k.lib("ed-finishes", 3, { image_asset: k.im.detail1 ?? k.im.packshot, padding_top: 72, padding_bottom: 72 }),
      k.lib("ed-scene", 2, { layout: "split", image_asset: k.im.scene2 ?? k.im.scene1, padding_top: 72, padding_bottom: 72 }),
      k.faqSec(1, 4, "lines"),
    ],
    services: (k) => [
      k.lib("ed-scene", 1, { layout: "panorama", image_asset: k.im.lifestyle ?? k.im.hero }),
      k.lib("ed-study", 1),
      k.R.servicesList(3, "cards", { withImages: true }),
      k.R.method(1, "howto-v"),
      k.v2.facts("grid", 2),
      k.R.testimonials(3),
      k.R.booking(1),
      k.v2.cta("card", 4),
    ],
  },
  {
    id: "rive",
    name: "Atelier Rive",
    tagline: "Journal et espaces",
    description: "Composition « journal » pour une entreprise de services : ouverture en grand titre sur trois lignes, approche en déclaration, récit interactif des accompagnements, prestations, méthode, inspirations en diptyque, scène, infos pratiques et premier échange ; papier et vert profond ou couleurs de la marque.",
    bestFor: ["prestations de services", "architecture d'intérieur", "conseil", "atelier", "devis"],
    en: { tagline: "Journal and spaces", description: "“Journal” composition for a services business: three-line headline opening, approach as a statement, interactive story of the services, offer, method, inspirations as a diptych, scene, practical info and first conversation; paper and deep green or the brand colors.", bestFor: ["services", "interior design", "consulting", "workshop", "quotes"] },
    fonts: { heading: "archivo_n6", body: "work_sans_n4" },
    previewFonts: { heading: "Archivo", body: "Work Sans" },
    motion: "subtle",
    photoMood: "terroir",
    kinds: ["services"],
    look: look({ headerLayout: "logo-left", shape: "bar", menu: "drawer", footer: "split", ann: "static", card: "minimal", button: "frame", radius: { button: 0, card: 0 }, headingScale: 112, tracking: -2, pageWidth: 1440, ds: "craft", density: "airy" }),
    settings: { editorial_profile: "journal", conversion_profile: "none", motion_intensity: "subtle" },
    mainProduct: { gallery_layout: "stack", sticky_bar: false, color_scheme: "scheme-1" },
    palette: (k) => {
      const paper = k.light("#EEEAE2");
      const deep = k.night(0.18, 0.25);
      return [k.scheme(paper, deep, k.onLight(paper)), k.scheme(deep, paper, k.onDark(deep), 0.06), k.scheme("#FFFFFF", deep, k.onLight("#FFFFFF")), k.filled(k.p.accent)];
    },
    home: (k) => [
      k.lib("ed-scene", 1, { layout: "split", image_asset: k.im.lifestyle ?? k.im.hero }),
      k.lib("ed-statement", 1),
      // Composition « boutique » de repli (Atelier Rive sert les prestations) : une étude de deux vues, pas le diptyque d'ORBE.
      k.lib("ed-study", 1),
      k.feat(3, "plain", 2),
      k.faqSec(1, 4, "lines"),
      k.cta(4),
    ],
    product: (k) => [k.lib("ed-scene", 2, { layout: "split" }), k.faqSec(1, 4, "lines")],
    services: (k) => [
      k.lib("ed-opening", 1, { layout: "journal", heading_tag: "h1", image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.scene1 }),
      k.lib("ed-statement", 1),
      k.lib("ref-narrative", 1),
      k.R.servicesList(3, "list"),
      k.R.method(1, "timeline"),
      k.lib("ed-diptych", 1),
      ...k.R.portfolio(1, "editorial"),
      k.R.testimonials(2),
      k.lib("ed-scene", 1, { layout: "split", image_asset: k.im.scene2 ?? k.im.scene1 }),
      k.R.practical(3),
      k.faqSec(1, 5, "lines"),
      k.R.contactForm(1, "Et si l'on commençait par votre projet ?"),
    ],
  },
];
