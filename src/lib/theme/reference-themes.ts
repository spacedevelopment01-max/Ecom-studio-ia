/**
 * Les thèmes de référence (issue #137, SILLON : issue #148) comme vrais thèmes du studio (catalogue, galerie, composition
 * automatique) : FRAISE et ONDE (boutique spécialisée, profil « conversion » Lumora / Pawish), ORBE (e-commerce,
 * composition éditoriale « objet et ambiances »), Atelier Rive (prestations de services, composition « journal ») et
 * SILLON (boutique spécialisée, profil « nomade » : objet que l’on emporte, serif fine, cuivre), NOCTIL (boutique
 * spécialisée, profil « astral » : nuit immersive, indigo et lavande) et TRAVERSE (boutique spécialisée, profil
 * « itinéraire » : carnet de voyage éditorial, crème, pierre et olive), issue #152 ; HEUREN (e-commerce mono-produit,
 * profil éditorial « cadran » : bleu nuit, argent, serif fine) et ALCÔVE (e-commerce mono-produit, profil « arrondi » :
 * courbes, terre cuite, sable), issue #155 ; MUSEAU CLUB (e-commerce de quatre produits, profil « club » : crème et bleu
 * cobalt, titres épais, coins arrondis), issue #158.
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
    // Accueil (reprise du 19 octobre, retour de 13 h 40) : chaque visuel a un rôle et n'apparaît qu'une fois par écran —
    // ouverture (photo horizontale sur ordinateur, photo verticale dédiée sur téléphone : le produit entier, titre et
    // bouton vers la collection), déclaration (histoire + repères, sans image), bande des finitions (toutes visibles,
    // petites cartes, accès à la fiche : la collection compacte), scène en situation (positionnement), deux usages
    // côte à côte (petits cadres, aussi sur téléphone), questions quand elles ont des réponses, appel à l'action sans
    // photo (pas une grande image de plus). Aucun « produit à la une » en lots, aucune photo répétée.
    home: (k) => [
      k.lib("ed-opening", 1, { layout: "immersive", heading_tag: "h1", image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.scene1, mobile_image_asset: k.im.portrait ?? "", copy_surface: true, padding_top: 0, padding_bottom: 0 }),
      k.lib("ed-statement", 3, { padding_top: 48, padding_bottom: 64 }),
      k.lib("ed-finishes", 1, { button_label: k.t("Voir la fiche produit", "See the product page"), padding_top: 64, padding_bottom: 64 }),
      k.lib("ed-scene", 2, { layout: "split", image_asset: k.im.scene1 ?? k.im.lifestyle2, padding_top: 72, padding_bottom: 72 }),
      k.lib("ed-diptych", 1, { layout: "side", padding_top: 64, padding_bottom: 64 }, { blocks: [k.im.scene2, k.im.scene3].filter((f): f is string => !!f).map((f) => ({ type: "frame", settings: { image_asset: f, ratio: "portrait", title: "" } })) }),
      k.v2.faq("side", 3),
      k.cta(4, ""),
    ],
    // Fiche : galerie (toutes les vues, finitions en tête) et achat, puis une scène d'usage différente de l'accueil ;
    // pas de section « finitions » en plus (le sélecteur et la galerie les montrent déjà) ; la FAQ seulement avec des réponses.
    product: (k) => [
      k.lib("ed-scene", 2, { layout: "split", image_asset: k.im.scene2 ?? k.im.scene3 ?? k.im.scene1, padding_top: 72, padding_bottom: 72 }),
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
      // Pas de diptyque sur l'accueil : il reprenait la photo d'ouverture (contrôle du 19 octobre) ; les réalisations montrent déjà quatre photos distinctes.
      ...k.R.portfolio(1, "editorial"),
      k.R.testimonials(2),
      k.lib("ed-scene", 1, { layout: "split", image_asset: k.im.detail2 ?? k.im.lifestyle2 ?? k.im.scene3 }),
      k.R.practical(3),
      k.faqSec(1, 5, "lines"),
      k.R.contactForm(1, "Et si l'on commençait par votre projet ?"),
    ],
  },
  {
    id: "sillon",
    name: "Sillon",
    tagline: "Objet nomade, lumière chaude",
    description: "Boutique spécialisée pour un objet que l'on emporte : ouverture sombre où le produit reste entier à côté du titre, déclaration de marque, gros plan et bénéfices, repères interactifs sur le produit, mosaïque des lieux d'usage, achat compact et FAQ à côté du titre. Serif fine sur ivoire, accent cuivré en dégradé, filets fins et bouton d'achat permanent dans l'en-tête.",
    bestFor: ["boutique spécialisée", "objet nomade", "café et thé", "petit électroménager", "produit de voyage"],
    en: { tagline: "Nomadic object, warm light", description: "Specialty store for an object you take along: dark opening where the product stays whole beside the headline, brand statement, close-up and benefits, interactive markers on the product, mosaic of places of use, compact purchase and FAQ beside its title. Fine serif on ivory, copper gradient accent, hairlines and a permanent buy button in the header.", bestFor: ["specialty store", "nomadic object", "coffee and tea", "small appliances", "travel product"] },
    fonts: { heading: "libre_baskerville_n4", body: "jost_n4" },
    previewFonts: { heading: "Libre Baskerville", body: "Jost" },
    motion: "subtle",
    photoMood: "terroir",
    kinds: ["specialty"],
    // En-tête « Bouton d'achat visible » (logo à gauche, menu à droite, bouton vers la fiche) et grand nom de marque en pied :
    // ni le logo centré de FRAISE / ONDE, ni leurs pieds en colonnes ou marque à gauche.
    look: look({ headerLayout: "menu-right", shape: "bar", menu: "sheet", footer: "wordmark", ann: "static", card: "minimal", button: "solid", radius: { button: 40, card: 6 }, headingCase: "none", tracking: -1, headingScale: 106, pageWidth: 1360, density: "airy", buttonUppercase: false }),
    settings: { conversion_profile: "nomade", editorial_profile: "none", motion_intensity: "subtle" },
    headerCta: { fr: "Commander", en: "Order now", icon: "arrow" },
    // Galerie en grille de deux colonnes, cadre carré (les vues produit sont carrées : rien de coupé), zoom, barre d'achat.
    mainProduct: { gallery_layout: "grid", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    palette: (k) => {
      const ivory = k.light("#F4EDE3");
      const espresso = k.night(0.13, 0.3);
      const sand = k.mix(ivory, k.p.accent, 0.14);
      return [k.scheme(ivory, espresso, k.onLight(ivory)), k.scheme(espresso, ivory, k.onDark(espresso), 0.06), k.filled(k.p.accent), k.scheme(sand, espresso, k.onLight(sand))];
    },
    // Accueil : chaque visuel n'apparaît qu'une fois. Ouverture sombre (le produit entier à gauche, jamais sous le texte),
    // déclaration sans image, gros plan et bénéfices, repères sur la vue produit, mosaïque des lieux d'usage, achat
    // compact, questions, inscription avec une dernière scène. Toute section sans contenu réel reste masquée.
    home: (k) => [
      k.lib("cv-hero", 2, { image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.packshot, image_ratio: "wide", layout: "image-left", heading_tag: "h1", animation: "fade" }),
      k.lib("rich-text", 1, { style: "statement", align: "center", padding_top: 88, padding_bottom: 72 }),
      k.lib("cv-feature", 1, { image_asset: k.im.detail1 ?? k.im.scene1, layout: "image-left" }),
      k.lib("cv-hotspots", 4, { image_asset: k.im.packshot ?? k.im.cutout, layout: "side", ratio: "square" }),
      // Mosaïque des lieux d'usage : seulement avec au moins deux vraies photos (jamais une galerie vide).
      ((places) => k.lib("cv-gallery", 1, { layout: "mosaic", ratio: "square" }, { hide: places.length < 2, blocks: places.map((f) => ({ type: "image", settings: { image_asset: f } })) }))([k.im.scene1, k.im.scene2, k.im.scene3, k.im.lifestyle2, k.im.portrait].filter((f): f is string => !!f)),
      k.lib("featured-purchase", 2, { purchase_style: "compact", image_fit: "contain" }),
      ((r) => [r[0], { ...r[1], layout: "side" }, r[2], r[3]] as typeof r)(k.faqSec(1, 5, "lines")),
      // Inscription avec une dernière scène ; sans photo disponible, l'inscription simple (pas de cadre d'image vide).
      ...k.either(k.lib("newsletter-media", 4, { layout: "right", image_asset: k.im.banner ?? k.im.detail2 ?? "", legal: k.privacy }, { hide: !(k.im.banner ?? k.im.detail2) }), k.newsletter(4)),
    ],
    // Fiche : galerie et achat, puis repères sur une autre vue, caractéristiques à côté du titre, mode d'emploi en ligne,
    // deux situations, engagements en liste et questions. Rien d'affirmé sans donnée du marchand.
    product: (k) => [
      k.lib("cv-hotspots", 1, { image_asset: k.im.detail2 ?? k.im.packshot, layout: "stacked", ratio: "square" }),
      k.lib("cv-specs", 4, { layout: "side" }),
      k.lib("cv-steps", 1, { layout: "timeline" }),
      k.lib("cv-alternating", 1, { layout: "image-left", ratio: "square" }, { blocks: [k.im.scene1, k.im.scene2].filter((f): f is string => !!f).map((f) => ({ type: "row", settings: { image_asset: f } })) }),
      k.lib("fs-commitments", 2, { layout: "list" }),
      k.faqSec(1, 5, "lines"),
    ],
    // Site de services (repli) : bannière sombre visuel à gauche, déclaration, prestations en liste, mosaïque d'images,
    // méthode en frise, témoignages, questions et prise de contact — pas l'enchaînement de FRAISE.
    services: (k) => [
      k.lib("cv-banner", 2, { image_asset: k.im.lifestyle ?? k.im.hero, layout: "image-left", heading_tag: "h1" }),
      k.lib("rich-text", 1, { style: "statement", align: "center" }),
      k.R.servicesList(1, "list"),
      ((places) => k.lib("cv-gallery", 4, { layout: "mosaic", ratio: "square" }, { hide: places.length < 2, blocks: places.map((f) => ({ type: "image", settings: { image_asset: f } })) }))([k.im.scene1, k.im.scene2, k.im.scene3, k.im.detail1, k.im.lifestyle2].filter((f): f is string => !!f)),
      k.R.method(1, "timeline"),
      k.R.testimonials(1),
      ((r) => [r[0], { ...r[1], layout: "side" }, r[2], r[3]] as typeof r)(k.faqSec(1, 5, "lines")),
      k.R.booking(2),
    ],
  },
  {
    id: "noctil",
    name: "Noctil",
    tagline: "Nuit immersive, lumière d'espace",
    description: "Boutique spécialisée pour un objet de lumière : ouverture nocturne où le produit apparaît entier au-dessus du titre, bénéfices en cartes lumineuses, carrousel de pièces une à une, récit superposé, gros plans en colonnes, bandeau d'achat sur une scène et FAQ en cartes. Indigo profond, lavande et violet, titres géométriques, en-tête flottant arrondi sur fond clair et pied centré.",
    bestFor: ["boutique spécialisée", "objet de lumière", "décoration de nuit", "chambre et salon", "produit d'ambiance"],
    en: { tagline: "Immersive night, space light", description: "Specialty store for a light object: night opening where the product appears whole above the headline, benefits in glowing cards, a carousel of rooms one by one, an overlapping story, close-ups in columns, a purchase band over a scene and FAQ cards. Deep indigo, lavender and violet, geometric headings, a rounded floating header on a light ground and a centred footer.", bestFor: ["specialty store", "light object", "night decor", "bedroom and living room", "ambience product"] },
    fonts: { heading: "space_grotesk_n5", body: "karla_n4" },
    previewFonts: { heading: "Space Grotesk", body: "Karla" },
    motion: "subtle",
    photoMood: "nocturne",
    kinds: ["specialty"],
    // En-tête « Barre flottante arrondie » sur fond lavande (le logo, sombre, reste lisible) et pied « Centré avec lettre
    // d'information » : ni le logo centré de FRAISE / ONDE, ni le bouton d'achat et le grand nom de marque de SILLON.
    look: look({ headerLayout: "logo-left", shape: "pill", icons: "circles", menu: "sheet", footer: "centered", ann: "static", card: "boxed", button: "solid", radius: { button: 14, card: 18 }, headingCase: "none", tracking: -2, headingScale: 104, pageWidth: 1280, density: "airy", buttonUppercase: false, dark: true }),
    settings: { conversion_profile: "astral", editorial_profile: "none", motion_intensity: "subtle" },
    headerSettings: { color_scheme: "scheme-2", mega_menu: "none", show_cart: true },
    // Galerie en carrousel, cadre carré : une vue à la fois, le produit entier dès l'ouverture de la fiche sur téléphone.
    mainProduct: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    palette: (k) => {
      const night = k.night(0.09, 0.55);
      const lavender = k.light("#ECE8FA");
      const indigo = k.night(0.17, 0.5);
      return [k.scheme(night, lavender, k.onDark(night), 0.07), k.scheme(lavender, night, k.onLight(lavender)), k.filled(k.p.accent), k.scheme(indigo, lavender, k.onDark(indigo), 0.08)];
    },
    // Accueil : une narration de nuit. Le produit entier au-dessus du titre (lisible sur téléphone), bénéfices en cartes
    // lumineuses, les pièces une à une en carrousel, récit superposé, gros plans en colonnes, bandeau d'achat sur une
    // scène, questions en cartes et inscription. Chaque visuel n'apparaît qu'une fois ; toute section vide reste masquée.
    home: (k) => [
      k.lib("cv-hero", 1, { image_asset: k.im.hero ?? k.im.packshot ?? k.im.lifestyle, image_ratio: "wide", layout: "stacked", heading_tag: "h1", animation: "fade" }),
      k.lib("features-grid", 1, { layout: "grid", columns: 4, columns_mobile: "2", style: "glow", heading_align: "center" }),
      ((rooms) => k.lib("cv-gallery", 4, { layout: "carousel", ratio: "portrait" }, { hide: rooms.length < 2, blocks: rooms.map((f) => ({ type: "image", settings: { image_asset: f } })) }))([k.im.scene1, k.im.scene2, k.im.scene3, k.im.lifestyle2, k.im.portrait].filter((f): f is string => !!f)),
      k.lib("image-with-text", 2, { layout: "overlap", ratio: "portrait", image_asset: k.im.lifestyle ?? k.im.scene1 ?? "", reveal: "up" }, { hide: !(k.im.lifestyle ?? k.im.scene1) }),
      ((shots) => k.lib("cv-cards", 1, { layout: "columns" }, { hide: shots.length < 2, blocks: shots.map((f) => ({ type: "card", settings: { image_asset: f } })) }))([k.im.detail1, k.im.detail2, k.im.cutout].filter((f): f is string => !!f)),
      k.lib("cta-banner", 4, { style: "center", image_asset: k.im.banner ?? k.im.scene2 ?? "", overlay: 55, parallax: false }),
      k.faqSec(2, 5, "cards"),
      k.newsletter(4),
    ],
    // Fiche : galerie en carrousel et achat, puis ce qui compose l'objet (cartes), onglets en pastilles, préparation de
    // la nuit en frise, une scène avec bénéfices, engagements en grille et questions. Rien d'affirmé sans donnée.
    product: (k) => [
      k.lib("cv-ingredients", 4, { layout: "cards", columns: 3 }),
      k.lib("content-tabs", 1, { tab_style: "pills", image_position: "right" }),
      k.lib("timeline", 2, { image_asset: "" }),
      k.lib("cv-feature", 1, { image_asset: k.im.scene3 ?? k.im.scene1, layout: "stacked" }),
      k.lib("fs-commitments", 4, { layout: "grid" }),
      k.faqSec(1, 5, "lines"),
    ],
    // Site de services (repli) : ouverture empilée, prestations en cartes, gros plans en colonnes, méthode, bandeau
    // d'appel, questions et prise de contact — sans l'enchaînement de SILLON, de FRAISE ni de TRAVERSE.
    services: (k) => [
      k.lib("cv-hero", 1, { image_asset: k.im.hero ?? k.im.lifestyle, image_ratio: "wide", layout: "stacked", heading_tag: "h1" }),
      k.R.servicesList(4, "cards"),
      ((shots) => k.lib("cv-cards", 2, { layout: "columns" }, { hide: shots.length < 2, blocks: shots.map((f) => ({ type: "card", settings: { image_asset: f } })) }))([k.im.scene1, k.im.scene2, k.im.scene3].filter((f): f is string => !!f)),
      k.R.method(1, "howto-h"),
      k.lib("cta-banner", 4, { style: "center", image_asset: k.im.banner ?? k.im.lifestyle2 ?? "", overlay: 55, parallax: false }),
      k.faqSec(2, 5, "cards"),
      k.R.booking(1),
    ],
  },
  {
    id: "traverse",
    name: "Traverse",
    tagline: "Carnet de voyage, pierre et olive",
    description: "Boutique spécialisée pour un objet de voyage, en carnet éditorial : bannière asymétrique visuel à gauche, trois temps du voyage en liste, alternance quotidien / départ / destination, repères interactifs sur le produit, matières à côté d'un gros plan, inventaire de ce qu'on emporte, achat encadré, FAQ en lignes et inscription illustrée. Crème, pierre et olive, serif de magazine, en-tête sur deux rangées et pied en carte.",
    bestFor: ["boutique spécialisée", "bagagerie", "voyage", "sport et plein air", "accessoire du quotidien"],
    en: { tagline: "Travel notebook, stone and olive", description: "Specialty store for a travel object, as an editorial notebook: asymmetric banner with the visual on the left, three stages of travel as a list, everyday / departure / destination alternation, interactive markers on the product, materials beside a close-up, an inventory of what you carry, a framed purchase, line FAQ and an illustrated sign-up. Cream, stone and olive, magazine serif, a two-row header and a card footer.", bestFor: ["specialty store", "luggage", "travel", "sport and outdoors", "everyday accessory"] },
    fonts: { heading: "playfair_display_n4", body: "chivo_n4" },
    previewFonts: { heading: "Playfair Display", body: "Chivo" },
    motion: "subtle",
    photoMood: "terroir",
    kinds: ["specialty"],
    // En-tête « Deux rangées avec offre » (nom en tête de page, menu dessous, encarts dans le sous-menu) et pied « Carte
    // d'assistance » : dispositions qu'aucun autre thème de la famille n'utilise.
    look: look({ headerLayout: "two-rows", shape: "bar", icons: "plain", menu: "cards", footer: "card", ann: "static", card: "minimal", button: "solid", radius: { button: 2, card: 2 }, headingCase: "none", tracking: -1, headingScale: 108, pageWidth: 1400, density: "airy", buttonUppercase: true }),
    settings: { conversion_profile: "itineraire", editorial_profile: "none", motion_intensity: "subtle" },
    headerSettings: { mega_menu: "columns-promo", mobile_promo: "top", show_cart: true },
    // Galerie empilée sur ordinateur (les vues défilent à côté de l'achat qui reste visible), cadre naturel : rien de coupé.
    mainProduct: { gallery_layout: "stack", gallery_ratio: "natural", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    palette: (k) => {
      const cream = k.light("#F5F1E8");
      const olive = k.night(0.16, 0.28);
      const stone = k.mix(cream, "#8A8270", 0.22);
      return [k.scheme(cream, olive, k.onLight(cream)), k.scheme(olive, cream, k.onDark(olive), 0.06), k.filled(k.p.primary), k.scheme(stone, olive, k.onLight(stone))];
    },
    // Accueil : carnet de voyage. Bannière asymétrique, trois temps en liste, alternance des moments du voyage, repères
    // sur le produit, matières à côté d'un gros plan, ce qu'on emporte, achat encadré, questions et inscription illustrée.
    home: (k) => [
      k.lib("cv-banner", 1, { image_asset: k.im.hero ?? k.im.lifestyle ?? k.im.packshot, layout: "image-left", heading_tag: "h1", animation: "fade", price_text: "", price_note: "" }),
      k.lib("features-grid", 4, { layout: "grid", columns: 1, columns_mobile: "1", style: "lines", heading_align: "left" }),
      ((moments) => k.lib("cv-alternating", 1, { layout: "alternate", ratio: "portrait" }, { hide: moments.length < 2, blocks: moments.map((f) => ({ type: "row", settings: { image_asset: f } })) }))([k.im.scene1, k.im.scene2, k.im.scene3].filter((f): f is string => !!f)),
      k.lib("cv-hotspots", 1, { image_asset: k.im.packshot ?? k.im.cutout, layout: "side", ratio: "square" }),
      k.lib("cv-ingredients", 4, { layout: "split", image_asset: k.im.detail1 ?? "", ratio: "square" }),
      k.lib("image-with-text", 1, { layout: "image-left", ratio: "landscape", image_asset: k.im.lifestyle2 ?? k.im.detail2 ?? "", reveal: "curtain" }, { hide: !(k.im.lifestyle2 ?? k.im.detail2) }),
      k.lib("featured-purchase", 1, { purchase_style: "outlined", image_fit: "contain" }),
      k.faqSec(1, 5, "lines"),
      ...k.either(k.lib("newsletter-media", 2, { layout: "left", image_asset: k.im.banner ?? "", legal: k.privacy }, { hide: !k.im.banner }), k.newsletter(2)),
    ],
    // Fiche : galerie empilée et achat, gros plans en lignes, onglets soulignés, préparation du départ en cartes, galerie
    // des lieux en grille, engagements en liste et questions.
    product: (k) => [
      ((shots) => k.lib("cv-cards", 4, { layout: "rows" }, { hide: shots.length < 2, blocks: shots.map((f) => ({ type: "card", settings: { image_asset: f } })) }))([k.im.detail1, k.im.detail2, k.im.cutout].filter((f): f is string => !!f)),
      k.lib("content-tabs", 1, { tab_style: "underline", image_position: "left" }),
      k.lib("cv-steps", 1, { layout: "cards" }),
      ((places) => k.lib("cv-gallery", 2, { layout: "grid", columns: 3, ratio: "portrait" }, { hide: places.length < 2, blocks: places.map((f) => ({ type: "image", settings: { image_asset: f } })) }))([k.im.scene1, k.im.scene2, k.im.scene3, k.im.lifestyle2].filter((f): f is string => !!f)),
      k.lib("fs-commitments", 4, { layout: "list" }),
      k.faqSec(1, 5, "lines"),
    ],
    // Site de services (repli) : bannière visuel à droite, trois temps en liste, prestations, alternance de réalisations,
    // méthode, image et texte, questions et prise de contact.
    services: (k) => [
      k.lib("cv-banner", 1, { image_asset: k.im.hero ?? k.im.lifestyle, layout: "image-right", heading_tag: "h1" }),
      k.lib("features-grid", 4, { layout: "grid", columns: 1, columns_mobile: "1", style: "lines", heading_align: "left" }),
      k.R.servicesList(1, "list"),
      ((moments) => k.lib("cv-alternating", 1, { layout: "alternate", ratio: "portrait" }, { hide: moments.length < 2, blocks: moments.map((f) => ({ type: "row", settings: { image_asset: f } })) }))([k.im.scene1, k.im.scene2, k.im.scene3].filter((f): f is string => !!f)),
      k.R.method(2, "howto-v"),
      k.lib("image-with-text", 1, { layout: "image-left", ratio: "landscape", image_asset: k.im.lifestyle2 ?? k.im.detail2 ?? "", reveal: "curtain" }, { hide: !(k.im.lifestyle2 ?? k.im.detail2) }),
      k.faqSec(1, 5, "lines"),
      k.R.booking(2),
    ],
  },
  {
    id: "heuren",
    name: "Heuren",
    tagline: "Bleu nuit et précision",
    description: "Boutique mono-produit de la famille E-commerce pour un objet de précision : titre puis grand paysage, déclaration en bleu nuit autour d'un gros plan, repères interactifs sur le produit, bannière en plein cadre, deux usages côte à côte, achat encadré, questions et inscription illustrée. Ivoire, bleu nuit et argent, serif fine, logo centré avec menu à gauche et pied de page encadré.",
    bestFor: ["e-commerce", "horlogerie", "accessoire", "produit unique", "objet de précision"],
    en: { tagline: "Midnight blue and precision", description: "Single-product store from the E-commerce family for a precision object: title then a wide landscape, a midnight-blue statement around a close-up, interactive markers on the product, a full-frame banner, two uses side by side, framed purchase, questions and an illustrated sign-up. Ivory, midnight blue and silver, fine serif, centred logo with the menu on the left and a boxed footer.", bestFor: ["e-commerce", "watches", "accessory", "single product", "precision object"] },
    fonts: { heading: "instrument_serif_n4", body: "inter_n4" },
    previewFonts: { heading: "Instrument Serif", body: "Inter" },
    motion: "subtle",
    photoMood: "galerie",
    kinds: ["catalog"],
    // En-tête « Logo centré, menu à gauche » (fond blanc : le logo HEUREN est livré sur fond blanc) et pied « Encadré » :
    // dispositions de la famille E-commerce qu'ORBE n'utilise pas.
    look: look({ headerLayout: "nav-left", shape: "bar", menu: "fullscreen", footer: "boxed", ann: "static", card: "minimal", button: "solid", radius: { button: 0, card: 0 }, headingScale: 112, tracking: -1, pageWidth: 1360, gallery: "grid", ds: "maison", density: "airy", buttonUppercase: true }),
    settings: { editorial_profile: "cadran", conversion_profile: "none", motion_intensity: "subtle" },
    headerSettings: { mega_menu: "columns", mobile_submenu: "accordion", show_cart: true, color_scheme: "scheme-3" },
    // Galerie en grille, cadre carré (les vues sont carrées : montre entière, bracelet compris), zoom, barre d'achat.
    mainProduct: { gallery_layout: "grid", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    palette: (k) => {
      const ivory = k.light("#F7F5F0");
      const navy = k.night(0.13, 0.42);
      return [k.scheme(ivory, navy, k.onLight(ivory)), k.scheme(navy, ivory, k.onDark(navy), 0.07), k.scheme("#FDFEFD", navy, k.onLight("#FDFEFD")), k.scheme(k.mix(ivory, "#AEB6C2", 0.35), navy, k.onLight(k.mix(ivory, "#AEB6C2", 0.35)))];
    },
    // Accueil : la montre au crépuscule sous un grand titre, le cadran raconté en bleu nuit, les repères sur la montre, une
    // bannière en plein cadre, une scène portée, l'achat encadré, les questions et l'inscription illustrée.
    home: (k) => [
      k.lib("ed-opening", 1, { layout: "journal", heading_tag: "h1", image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.packshot, mobile_image_asset: k.im.portrait ?? "", padding_top: 24, padding_bottom: 72 }),
      k.lib("ed-statement", 2, { image_asset: k.im.detail1 ?? "", padding_top: 96, padding_bottom: 96 }),
      k.lib("fs-lookbook", 1, { layout: "markers", image_asset: k.im.packshot ?? k.im.cutout, align: "left" }),
      k.lib("fs-campaign", 2, { layout: "background", image_asset: k.im.banner ?? k.im.scene1 ?? "", offer_title: "", offer_text: "", period_text: "", conditions: "" }, { hide: !(k.im.banner ?? k.im.scene1) }),
      k.lib("ed-scene", 1, { layout: "split", image_asset: k.im.scene2 ?? k.im.scene1 ?? "", padding_top: 72, padding_bottom: 72 }, { hide: !(k.im.scene2 ?? k.im.scene1) }),
      k.lib("featured-purchase", 4, { purchase_style: "compact", image_fit: "contain" }),
      k.v2.faq("center", 1),
      ...k.either(k.lib("newsletter-media", 2, { layout: "right", image_asset: k.im.lifestyle2 ?? "", legal: k.privacy }, { hide: !k.im.lifestyle2 }), k.newsletter(2)),
    ],
    // Fiche : galerie en grille et achat, deux scènes côte à côte, questions à côté du titre.
    product: (k) => [
      k.lib("ed-diptych", 1, { layout: "pair", padding_top: 72, padding_bottom: 72 }, { blocks: [k.im.scene1, k.im.lifestyle2 ?? k.im.scene2].filter((f): f is string => !!f).map((f) => ({ type: "frame", settings: { image_asset: f, ratio: "landscape", title: "" } })) }),
      k.v2.faq("side", 3),
    ],
    // Site de services (repli) : promesse dans la scène, déclaration, prestations en liste, usages en index, méthode en frise,
    // questions et prise de contact.
    services: (k) => [
      k.lib("ed-opening", 1, { layout: "immersive", heading_tag: "h1", image_asset: k.im.hero ?? k.im.lifestyle }),
      k.lib("ed-statement", 2, {}),
      k.R.servicesList(1, "list"),
      k.lib("ed-diptych", 1, { layout: "index" }),
      k.R.method(2, "timeline"),
      k.v2.faq("side", 1),
      k.R.booking(1),
    ],
  },
  {
    id: "alcove",
    name: "Alcôve",
    tagline: "Courbes et terre cuite",
    description: "Boutique mono-produit de la famille E-commerce pour un meuble : ouverture en arche, repères sur le produit dans la pièce, déclaration, deux pièces côte à côte, campagne en carte, achat encadré, questions en cartes et inscription. Sable, terre cuite et bois, serif douce et coins arrondis, en-tête de boutique avec le produit dans le sous-menu et pied empilé.",
    bestFor: ["e-commerce", "mobilier", "maison", "produit unique", "décoration"],
    en: { tagline: "Curves and terracotta", description: "Single-product store from the E-commerce family for a piece of furniture: arched opening, markers on the product in the room, statement, two rooms side by side, campaign card, framed purchase, card questions and sign-up. Sand, terracotta and wood, soft serif and rounded corners, a store header with the product in the submenu and a stacked footer.", bestFor: ["e-commerce", "furniture", "home", "single product", "decoration"] },
    fonts: { heading: "lora_n4", body: "work_sans_n4" },
    previewFonts: { heading: "Lora", body: "Work Sans" },
    motion: "subtle",
    photoMood: "terroir",
    kinds: ["catalog"],
    // En-tête « Boutique éditoriale » (le produit mis en avant dans le sous-menu, tiroir à droite) et pied « Empilé ».
    look: look({ headerLayout: "logo-left", shape: "bar", menu: "drawer-right", footer: "stacked", ann: "static", card: "boxed", button: "solid", radius: { button: 999, card: 24 }, headingScale: 104, tracking: 0, pageWidth: 1320, gallery: "carousel", ds: "maison", density: "airy" }),
    settings: { editorial_profile: "arrondi", conversion_profile: "none", motion_intensity: "subtle" },
    headerSettings: { layout: "reference-shop", mega_menu: "featured", mobile_menu: "drawer-right", show_cart: true },
    // Galerie en carrousel, cadre carré (le fauteuil entier, pieds compris), zoom, barre d'achat.
    mainProduct: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    palette: (k) => {
      const sand = k.light("#F6F0E8");
      const blush = k.mix(sand, "#C98A6B", 0.24);
      const umber = k.night(0.16, 0.3);
      return [k.scheme(sand, umber, k.onLight(sand)), k.scheme(blush, umber, k.onLight(blush)), k.scheme(umber, sand, k.onDark(umber), 0.06), k.filled(k.p.primary)];
    },
    // Accueil : le fauteuil sous une arche, ses courbes repérées dans le salon, une déclaration, deux pièces, une campagne
    // en carte au soir, l'achat encadré, les questions en cartes et l'inscription.
    home: (k) => [
      k.lib("ed-opening", 1, { layout: "arch", heading_tag: "h1", image_asset: k.im.portrait ?? k.im.hero ?? k.im.lifestyle ?? k.im.packshot, padding_top: 48, padding_bottom: 72 }),
      k.lib("fs-lookbook", 2, { layout: "side", image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.packshot, align: "left" }),
      k.lib("rich-text", 1, { style: "statement", align: "center" }),
      k.lib("ed-diptych", 1, { layout: "pair", padding_top: 64, padding_bottom: 64 }, { blocks: [k.im.scene1, k.im.scene2].filter((f): f is string => !!f).map((f) => ({ type: "frame", settings: { image_asset: f, ratio: "landscape", title: "" } })) }),
      k.lib("fs-campaign", 2, { layout: "card", image_asset: k.im.banner ?? k.im.scene3 ?? "", offer_title: "", offer_text: "", period_text: "", conditions: "" }, { hide: !(k.im.banner ?? k.im.scene3) }),
      k.lib("featured-purchase", 1, { purchase_style: "outlined", image_fit: "contain" }),
      k.faqSec(1, 5, "cards"),
      k.newsletter(2),
    ],
    // Fiche : galerie en carrousel et achat, l'assise vue d'en haut, deux pièces côte à côte, questions en lignes.
    product: (k) => [
      k.lib("image-with-text", 2, { layout: "image-left", ratio: "square", image_asset: k.im.detail2 ?? k.im.lifestyle2 ?? "", reveal: "up" }, { hide: !(k.im.detail2 ?? k.im.lifestyle2) }),
      k.lib("ed-diptych", 1, { layout: "side", padding_top: 64, padding_bottom: 64 }, { blocks: [k.im.scene3, k.im.lifestyle2].filter((f): f is string => !!f).map((f) => ({ type: "frame", settings: { image_asset: f, ratio: "portrait", title: "" } })) }),
      k.faqSec(1, 5, "lines"),
    ],
    // Site de services (repli) : ouverture en arche, repères, prestations en cartes illustrées, deux réalisations côte à
    // côte, méthode, questions en cartes et prise de contact.
    services: (k) => [
      k.lib("ed-opening", 1, { layout: "arch", heading_tag: "h1", image_asset: k.im.portrait ?? k.im.hero ?? k.im.lifestyle }),
      k.v2.facts("strip", 2),
      k.R.servicesList(1, "cards", { withImages: true }),
      k.lib("ed-diptych", 1, { layout: "pair" }),
      k.R.method(2, "howto-v"),
      k.faqSec(2, 5, "cards"),
      k.R.booking(2),
    ],
  },
  {
    id: "museau-club",
    name: "Museau Club",
    tagline: "Cobalt et balades",
    description: "Boutique de plusieurs produits de la famille E-commerce pour une collection coordonnée : scène de la collection avec repères et liste des produits en ouverture, grille des produits, panorama de balade, produit porté, achat en douceur, bandeau d'appel, questions en lignes et inscription illustrée. Crème et bleu cobalt, titres épais, sur-titres en pastille, coins arrondis, menu en cartes et pied de page en colonnes.",
    bestFor: ["e-commerce", "animalerie", "accessoires", "collection coordonnée", "plusieurs produits"],
    en: { tagline: "Cobalt and walks", description: "Multi-product store from the E-commerce family for a coordinated collection: an opening scene of the collection with markers and the product list, a product grid, a walk panorama, the product worn, a soft purchase block, a call-to-action band, line questions and an illustrated sign-up. Cream and cobalt blue, bold headings, pill eyebrows, rounded corners, card menu and a column footer.", bestFor: ["e-commerce", "pet supplies", "accessories", "coordinated collection", "several products"] },
    fonts: { heading: "archivo_n8", body: "karla_n4" },
    previewFonts: { heading: "Archivo", body: "Karla" },
    motion: "expressive",
    photoMood: "elan",
    kinds: ["catalog"],
    // En-tête « Collections en cartes » (les produits en cartes dans le menu, sur deux rangs) et pied « Plan du catalogue
    // en colonnes » : dispositions de la famille E-commerce qu'ORBE, HEUREN et ALCÔVE n'utilisent pas.
    look: look({ headerLayout: "two-rows", shape: "bar", menu: "cards", footer: "columns", ann: "static", card: "boxed", button: "solid", radius: { button: 999, card: 22 }, headingScale: 106, tracking: -2, pageWidth: 1320, gallery: "stack", ds: "product", density: "balanced" }),
    settings: { editorial_profile: "club", conversion_profile: "none", motion_intensity: "expressive" },
    headerSettings: { layout: "two-rows", mega_menu: "cards", mobile_menu: "cards", mobile_submenu: "open", show_cart: true },
    // Galerie empilée, cadre carré (chaque vue montre le produit entier), zoom, barre d'achat.
    mainProduct: { gallery_layout: "stack", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    palette: (k) => {
      const cream = k.light("#FBF7EE");
      const powder = k.mix(cream, "#BFDDF7", 0.55);
      const navy = k.night(0.2, 0.75);
      return [k.scheme(cream, navy, k.onLight(cream)), k.filled(k.p.primary), k.scheme(powder, navy, k.onLight(powder)), k.scheme(navy, cream, k.onDark(navy), 0.08)];
    },
    // Accueil : la collection en scène (repères et liste), tous les produits, la balade en panorama, le produit porté,
    // l'achat d'une pièce, un bandeau d'appel, les questions et l'inscription illustrée.
    home: (k) => [
      k.lib("fs-lookbook", 1, { layout: "side", heading_tag: "h1", image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.scene1 ?? k.im.packshot, align: "left", padding_top: 32, padding_bottom: 72 }),
      k.lib("fs-products", 1, { layout: "grid", source: "collection", collection: "all", ratio: "square", columns: 4, limit: 4, align: "left", padding_top: 64, padding_bottom: 72 }),
      k.lib("ed-scene", 3, { layout: "panorama", image_asset: k.im.banner ?? k.im.scene1 ?? "" }, { hide: !(k.im.banner ?? k.im.scene1) }),
      k.lib("image-with-text", 1, { layout: "image-left", ratio: "square", image_asset: k.im.scene2 ?? k.im.lifestyle2 ?? "", reveal: "up" }, { hide: !(k.im.scene2 ?? k.im.lifestyle2) }),
      k.lib("featured-purchase", 3, { purchase_style: "soft", image_fit: "contain" }),
      k.lib("cta-banner", 2, { image_asset: k.im.scene3 ?? "", style: "left" }, { hide: !k.im.scene3 }),
      k.faqSec(1, 5, "lines"),
      ...k.either(k.lib("newsletter-media", 4, { layout: "left", image_asset: k.im.portrait ?? k.im.lifestyle2 ?? "", legal: k.privacy }, { hide: !(k.im.portrait ?? k.im.lifestyle2) }), k.newsletter(4)),
    ],
    // Fiche : galerie empilée et achat, une scène de balade à côté du texte, questions en cartes.
    product: (k) => [
      k.lib("ed-scene", 3, { layout: "split", image_asset: k.im.scene1 ?? k.im.lifestyle2 ?? "", padding_top: 72, padding_bottom: 72 }, { hide: !(k.im.scene1 ?? k.im.lifestyle2) }),
      k.faqSec(1, 5, "cards"),
    ],
    // Site de services (repli) : scène et liste en ouverture, prestations en cartes illustrées, une photo et son texte,
    // méthode en étapes, questions en lignes et prise de contact.
    services: (k) => [
      k.lib("fs-lookbook", 1, { layout: "side", heading_tag: "h1", image_asset: k.im.hero ?? k.im.lifestyle, align: "left" }),
      k.R.servicesList(3, "cards", { withImages: true }),
      k.lib("image-with-text", 1, { layout: "image-right", ratio: "square", image_asset: k.im.scene1 ?? "", reveal: "up" }, { hide: !k.im.scene1 }),
      k.R.method(2, "timeline"),
      k.faqSec(1, 5, "lines"),
      k.R.booking(3),
    ],
  },
];
