/**
 * Les thèmes de référence (issue #137, SILLON : issue #148) comme vrais thèmes du studio (catalogue, galerie, composition
 * automatique) : FRAISE et ONDE (boutique spécialisée, profil « conversion » Lumora / Pawish), ORBE (e-commerce,
 * composition éditoriale « objet et ambiances »), Atelier Rive (prestations de services, composition « journal ») et
 * SILLON (boutique spécialisée, profil « nomade » : objet que l’on emporte, serif fine, cuivre), NOCTIL (boutique
 * spécialisée, profil « astral » : nuit immersive, indigo et lavande) et TRAVERSE (boutique spécialisée, profil
 * « itinéraire » : carnet de voyage éditorial, crème, pierre et olive), issue #152 ; HEUREN (e-commerce mono-produit,
 * profil éditorial « cadran » : bleu nuit, argent, serif fine) et ALCÔVE (e-commerce mono-produit, profil « arrondi » :
 * courbes, terre cuite, sable), issue #155 ; MUSEAU CLUB (e-commerce de quatre produits, profil « club » : crème et bleu
 * cobalt, titres épais, coins arrondis), issue #158 ; SOUPLE (e-commerce de quatre produits, profil « poudre » : rose
 * poudré, prune et liège, serif fine, collection en mosaïque), issue #158.
 *
 * Chaque thème est composé avec l'identité validée du projet : palette dérivée des rôles de la marque (clair, sombre,
 * accent), polices du thème, textes et médias du projet par les sections de la bibliothèque (section-copy-*.ts). Les
 * données de démonstration des fixtures (avis, offres, prix) n'entrent jamais ici : une information inconnue laisse la
 * section masquée, à compléter dans le studio. Le caractère graphique de chaque référence est porté par les profils
 * globaux (`conversion_profile`, `editorial_profile`) et les sections de sa famille.
 */
import type { CatalogTheme, Row, ThemeLook } from "./theme-catalog";

/** Même ligne de composition, quelques réglages de disposition en plus (contenus du moteur inchangés). */
const tune = (r: Row, extra: Record<string, unknown>): Row => [r[0], { ...r[1], ...extra }, r[2], r[3]];

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
    tagline: "Studio graphite, signal vert",
    description: "Boutique mono-produit de la famille E-commerce pour un objet technique : campagne en ouverture sur une bannière sombre, achat du produit tout de suite après, un détail en gros plan, trois usages en index, un bandeau d'appel, questions en cartes et inscription. Graphite profond, vert signal, titres Chivo, menu en colonnes avec encart et pied de page en colonnes.",
    bestFor: ["e-commerce", "high-tech", "audio", "produit unique", "objet technique"],
    en: { tagline: "Graphite studio, green signal", description: "Single-product store from the E-commerce family for a technical object: a campaign opening on a dark banner, the product purchase right after, one close-up detail, three uses as an index, a call-to-action band, card questions and a sign-up. Deep graphite, signal green, Chivo headings, a column menu with a promo and a column footer.", bestFor: ["e-commerce", "high-tech", "audio", "single product", "technical object"] },
    fonts: { heading: "chivo_n7", body: "inter_n4" },
    previewFonts: { heading: "Chivo", body: "Inter" },
    motion: "subtle",
    photoMood: "nocturne",
    kinds: ["catalog"],
    // Refonte E-commerce (décision de Thomas du 21 octobre, issue #158) : en-tête « Méga menu en colonnes » (le produit,
    // ses détails et ses usages, avec un encart) et pied « Plan du catalogue en colonnes », dispositions de la famille
    // qu'ORBE, HEUREN et ALCÔVE n'utilisent pas.
    look: look({ headerLayout: "logo-left", shape: "bar", menu: "drawer", footer: "columns", ann: "static", card: "minimal", button: "solid", radius: { button: 6, card: 14 }, headingCase: "none", tracking: -2, headingScale: 104, pageWidth: 1360, gallery: "carousel", density: "balanced", buttonUppercase: true, dark: true }),
    settings: { editorial_profile: "studio", conversion_profile: "none", motion_intensity: "subtle" },
    headerSettings: { layout: "logo-left", mega_menu: "columns-promo", desktop_icons: true, mobile_menu: "drawer", mobile_submenu: "accordion", show_cart: true },
    // Galerie en carrousel, cadre carré : le casque entier dans chaque vue, une vue à la fois sur téléphone.
    mainProduct: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    palette: (k) => {
      const ink = k.night(0.09, 0.04);
      const panel = k.night(0.15, 0.05);
      const paper = k.light("#F2F3EF");
      return [k.scheme(ink, paper, k.onDark(ink), 0.06), k.scheme(paper, ink, k.onLight(paper)), k.filled(k.p.accent), k.scheme(panel, paper, k.onDark(panel), 0.08)];
    },
    // Accueil : la campagne du casque en ouverture, l'achat juste après, un détail en gros plan, trois usages (salon,
    // train, studio), un bandeau d'appel, les questions et l'inscription. Chaque visuel n'apparaît qu'une fois.
    home: (k) => [
      // La campagne attend une campagne datée du client ; sans elle, l'ouverture devient une scène et sa liste avec le
      // titre de la page (jamais d'accueil sans ouverture ni titre).
      ...k.either(
        k.lib("fs-campaign", 1, { layout: "background", heading_tag: "h1", image_asset: k.im.banner ?? k.im.lifestyle ?? k.im.hero ?? k.im.packshot, align: "left", offer_title: "", offer_text: "", period_text: "", conditions: "", padding_top: 0, padding_bottom: 0 }),
        k.lib("fs-lookbook", 1, { layout: "side", heading_tag: "h1", image_asset: k.im.banner ?? k.im.lifestyle ?? k.im.hero ?? k.im.packshot, align: "left", padding_top: 24, padding_bottom: 72 }),
      ),
      k.lib("featured-purchase", 2, { purchase_style: "outlined", image_fit: "contain" }),
      k.lib("ed-finishes", 4, { image_asset: k.im.detail1 ?? "" }, { hide: !k.im.detail1 }),
      ((uses) => k.lib("ed-diptych", 1, { layout: "index" }, { hide: uses.length < 2, blocks: uses.map((f) => ({ type: "frame", settings: { image_asset: f, ratio: "portrait", title: "" } })) }))([k.im.scene1, k.im.scene2, k.im.scene3].filter((f): f is string => !!f)),
      k.lib("cta-banner", 1, { image_asset: k.im.lifestyle ?? k.im.hero ?? "", style: "center", overlay: 45, parallax: false }, { hide: !(k.im.lifestyle ?? k.im.hero) }),
      k.faqSec(1, 5, "cards"),
      ...k.either(k.lib("newsletter-media", 4, { layout: "left", image_asset: k.im.portrait ?? k.im.lifestyle2 ?? "", legal: k.privacy }, { hide: !(k.im.portrait ?? k.im.lifestyle2) }), k.newsletter(4)),
    ],
    // Fiche : galerie en carrousel et achat, l'arceau en gros plan, une scène à côté de son texte, questions en cartes.
    product: (k) => [
      k.lib("ed-finishes", 4, { image_asset: k.im.detail2 ?? k.im.detail1 ?? "" }, { hide: !(k.im.detail2 ?? k.im.detail1) }),
      k.lib("ed-scene", 1, { layout: "split", image_asset: k.im.scene3 ?? k.im.scene1 ?? "", padding_top: 72, padding_bottom: 72 }, { hide: !(k.im.scene3 ?? k.im.scene1) }),
      k.faqSec(1, 5, "cards"),
    ],
    // Site de services (repli) : repères sur la photo d'ouverture, prestations en liste, deux réalisations côte à côte,
    // infos pratiques, questions à côté du titre et prise de contact.
    services: (k) => [
      k.lib("fs-lookbook", 1, { layout: "markers", heading_tag: "h1", image_asset: k.im.hero ?? k.im.lifestyle, align: "left" }),
      k.R.servicesList(4, "list"),
      k.lib("ed-diptych", 1, { layout: "side" }),
      k.R.practical(2),
      k.v2.faq("side", 1),
      k.R.booking(4),
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
    tagline: "Intérieurs sur mesure, grandes photos",
    description: "Site de services d'après les maquettes du 23 octobre : grande photo d'ouverture et titre serif blanc, besoins en ligne, galerie de projets asymétrique et filtrable, prestations en miniatures, méthode en trois temps, bandeau photo, questions côte à côte et bandeau prune ; fonds blancs, boutons prune, pages projets, atelier et contact.",
    bestFor: ["prestations de services", "architecture d'intérieur", "décoration", "atelier", "premier rendez-vous"],
    en: { tagline: "Tailored interiors, large photographs", description: "Services website based on the 23 October mockups: large opening photograph with a white serif headline, needs in a row, asymmetric filterable project gallery, services as thumbnails, three-step method, photo band, questions side by side and a plum band; white backgrounds, plum buttons, project, studio and contact pages.", bestFor: ["services", "interior design", "decoration", "studio", "first appointment"] },
    fonts: { heading: "newsreader_n4", body: "inter_n4" },
    previewFonts: { heading: "Newsreader", body: "Inter" },
    motion: "subtle",
    photoMood: "terroir",
    kinds: ["services"],
    look: look({ headerLayout: "logo-left", shape: "bar", menu: "drawer-right", footer: "minimal", ann: "static", card: "minimal", button: "solid", radius: { button: 0, card: 0 }, headingScale: 100, tracking: -1, pageWidth: 1360, ds: "craft", density: "airy", buttonUppercase: false }),
    headerSettings: { mega_menu: "none", mobile_menu: "drawer-right", mobile_submenu: "accordion", show_search: false, show_cart: false, color_scheme: "scheme-1" },
    settings: { editorial_profile: "journal", conversion_profile: "none", motion_intensity: "subtle" },
    mainProduct: { gallery_layout: "stack", sticky_bar: false, color_scheme: "scheme-1" },
    // Maquettes du 23 octobre : fonds blancs, texte presque noir, couleur de marque (prune pour la démonstration) sur les
    // boutons et le bandeau d'appel ; un client garde sa propre couleur, lisible sur blanc et en aplat.
    palette: (k) => {
      const ink = k.night(0.11, 0.16);
      const accent = k.onLight("#FFFFFF");
      const band = k.filled(accent);
      return [k.scheme("#FFFFFF", ink, accent), { ...band, accent: band.text, accent_text: band.background }, k.scheme("#FFFFFF", ink, accent), k.filled(accent)];
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
      // Accueil de la maquette du 23 octobre, dans l'ordre : photo d'ouverture et titre blanc, besoins en ligne, galerie
      // asymétrique, prestations en miniatures, méthode en trois temps avec photo, bandeau photo, questions, bandeau prune.
      k.lib("ed-opening", 1, { layout: "banner", heading_tag: "h1", image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.scene1, copy_surface: false, padding_top: 0, padding_bottom: 0 }),
      k.lib("fs-needs", 1, { layout: "row", align: "left", effect: "none", padding_top: 72, padding_bottom: 40 }),
      ...(k.R.portfolio(1, "editorial") as Row[]).map((r) => tune(r, { layout: "asym", eyebrow: "", show_filters: false, show_tags: false, caption_style: "kicker", link_style: "arrow", padding_top: 32, padding_bottom: 48 })),
      tune(k.R.servicesList(1, "cards", { withImages: true }), { layout: "thumbs", action_style: "arrow", eyebrow: "", padding_top: 48, padding_bottom: 48 }),
      tune(k.R.method(1, "timeline"), { layout: "columns", eyebrow: "", padding_top: 48, padding_bottom: 32 }),
      k.lib("ed-scene", 1, { layout: "band", text_side: "left", band_height: "medium", text_offset: 44, image_asset: k.im.detail2 ?? k.im.lifestyle2 ?? k.im.scene3 }),
      tune(k.faqSec(1, 3, "lines"), { layout: "side", style: "lines", padding_top: 40, padding_bottom: 64 }),
      k.lib("cta-banner", 2, { style: "split", parallax: false, overlay: 0, padding_top: 72, padding_bottom: 72 }),
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
    tagline: "Week-ends dehors : grandes photos, titres condensés, orange",
    description: "Boutique spécialisée pour un sac de voyage, d'après les maquettes du 23 octobre : grandes photos de paysages, titres condensés en capitales, boutons orange, pied vert sapin. Ouverture plein cadre, trois cartes de paysages, essentiels du produit avec icônes et gros plans, bandeau « changez de décor », carte d'achat, questions et rappel final.",
    bestFor: ["boutique spécialisée", "bagagerie", "voyage", "sport et plein air", "accessoire du quotidien"],
    en: { tagline: "Weekends outdoors: large photos, condensed headings, orange", description: "Specialty store for a travel bag, from the 23 October mock-ups: large landscape photos, condensed capital headings, orange buttons, fir-green footer. Full-bleed opening, three landscape cards, product essentials with icons and close-ups, \"change of scenery\" band, purchase card, questions and closing call.", bestFor: ["specialty store", "luggage", "travel", "sport and outdoors", "everyday accessory"] },
    fonts: { heading: "anton_n4", body: "inter_n4" },
    previewFonts: { heading: "Anton", body: "Inter" },
    motion: "subtle",
    photoMood: "terroir",
    kinds: ["specialty"],
    // Maquettes TRAVERSE du 23 octobre (docs/design/traverse-reference-20261023) : nom condensé à gauche, menu au centre,
    // panier à droite ; pied vert sapin, marque à gauche et colonnes.
    look: look({ headerLayout: "nav-left", shape: "bar", icons: "plain", menu: "drawer-right", footer: "brand-left", ann: "static", card: "minimal", button: "solid", radius: { button: 3, card: 0 }, headingCase: "none", tracking: 0, headingScale: 100, pageWidth: 1360, gallery: "carousel", density: "balanced", buttonUppercase: false }),
    settings: { conversion_profile: "itineraire", editorial_profile: "none", motion_intensity: "subtle" },
    headerSettings: { mega_menu: "none", mobile_menu: "drawer-right", mobile_submenu: "accordion", show_search: false, show_cart: true, transparent_on_home: false, color_scheme: "scheme-1", mobile_menu_scheme: "scheme-2" },
    // Fiche : miniatures à gauche de la grande photo, zoom, barre d'achat sur téléphone.
    mainProduct: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    // Blanc, encre presque noire, vert sapin (tiré du sombre de la marque), gris très clair des fonds produit, crème des
    // encadrés « à compléter » ; boutons pleins de l'accent tel quel (orange pour la démonstration), texte blanc ou encre
    // selon le contraste.
    palette: (k) => {
      const ink = "#171717";
      const forest = k.night(0.12, 0.5);
      const lum = (hex: string) => { const c = hex.replace("#", ""); const v = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const onAccent = 1.05 / (lum(k.p.accent) + 0.05) >= 2.6 ? "#FFFFFF" : ink;
      const own = (sc: ReturnType<typeof k.scheme>) => ({ ...sc, accent: k.p.accent, accent_text: onAccent });
      return [own(k.scheme("#FFFFFF", ink, k.p.accent)), own(k.scheme(forest, "#FFFFFF", k.p.accent, 0.08)), own(k.scheme("#F4F3EF", ink, k.p.accent)), own(k.scheme("#F9F4EC", ink, k.p.accent))];
    },
    // Accueil de la maquette : ouverture plein cadre, trois cartes de paysages, essentiels (produit, icônes, gros plans),
    // bandeau « changez de décor », carte d'achat avec liste cochée, questions, rappel final.
    home: (k) => [
      k.lib("cv-banner", 2, { layout: "background", band_height: "hero", veil: "left", mobile_valign: "top", heading_tag: "h1", image_asset: k.im.hero ?? k.im.lifestyle ?? k.im.packshot, image_loading: "eager", button_arrow: true, padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }),
      ((shots) => k.lib("cv-cards", 1, { layout: "overlay", heading: "", text: "", padding_top: 12, padding_bottom: 12 }, { hide: shots.length < 2, blocks: shots.map((f) => ({ type: "card", settings: { image_asset: f } })) }))([k.im.scene1, k.im.scene2, k.im.scene3].filter((f): f is string => !!f)),
      ((details) => k.lib("cv-feature", 1, { layout: "essentials", image_asset: k.im.packshot ?? k.im.cutout ?? "", button_arrow: true, padding_top: 24, padding_bottom: 40 }, { blocks: details.map((f) => ({ type: "detail", settings: { image_asset: f } })) }))([k.im.detail1, k.im.detail2].filter((f): f is string => !!f)),
      k.lib("cv-banner", 2, { layout: "background", band_height: "medium", veil: "left", button_style: "outline", button_arrow: true, image_asset: k.im.banner ?? k.im.lifestyle2 ?? "", padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }, { hide: !(k.im.banner ?? k.im.lifestyle2) }),
      k.lib("cv-hero", 1, { layout: "card", image_ratio: "square", image_asset: k.im.packshot ?? k.im.cutout ?? "", button_arrow: true, rating_text: "", guarantee_text: "", padding_top: 32, padding_bottom: 32 }),
      k.faqSec(1, 4, "cards"),
      k.lib("cv-banner", 2, { layout: "background", band_height: "short", veil: "left", button_arrow: true, image_asset: k.im.lifestyle2 ?? k.im.banner ?? "", padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }, { hide: !(k.im.lifestyle2 ?? k.im.banner) }),
    ],
    // Fiche de la maquette : galerie et achat, bandeau « les prochains départs », gros plans et scènes en grille, questions.
    product: (k) => [
      k.lib("cv-banner", 2, { layout: "background", band_height: "medium", veil: "left", title_rule: true, image_asset: k.im.lifestyle ?? k.im.hero ?? "", padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "", button_label: "" }, { hide: !(k.im.lifestyle ?? k.im.hero) }),
      ((shots) => k.lib("cv-gallery", 1, { layout: "grid", columns: 3, ratio: "square", heading: "", text: "", ai_label: "", padding_top: 8, padding_bottom: 8 }, { hide: shots.length < 2, blocks: shots.map((f) => ({ type: "image", settings: { image_asset: f } })) }))([k.im.detail1, k.im.detail2, k.im.scene1, k.im.scene2, k.im.scene3].filter((f): f is string => !!f)),
      k.faqSec(1, 5, "lines"),
    ],
    // Site de services (repli) : même grammaire, ouverture plein cadre, trois cartes, prestations, réalisations alternées,
    // bandeau photo, questions et contact.
    services: (k) => [
      k.lib("cv-banner", 2, { layout: "background", band_height: "hero", veil: "left", mobile_valign: "top", heading_tag: "h1", image_asset: k.im.hero ?? k.im.lifestyle, image_loading: "eager", button_arrow: true, padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }),
      ((shots) => k.lib("cv-cards", 1, { layout: "overlay", heading: "", text: "", padding_top: 12, padding_bottom: 12 }, { hide: shots.length < 2, blocks: shots.map((f) => ({ type: "card", settings: { image_asset: f } })) }))([k.im.scene1, k.im.scene2, k.im.scene3].filter((f): f is string => !!f)),
      k.R.servicesList(1, "list"),
      ((rows) => k.lib("cv-alternating", 1, { layout: "image-right", ratio: "landscape" }, { hide: rows.length < 1, blocks: rows.map((f) => ({ type: "row", settings: { image_asset: f } })) }))([k.im.lifestyle2, k.im.detail1].filter((f): f is string => !!f)),
      k.lib("cv-banner", 2, { layout: "background", band_height: "medium", veil: "left", button_style: "outline", button_arrow: true, image_asset: k.im.banner ?? k.im.lifestyle2 ?? "", padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }, { hide: !(k.im.banner ?? k.im.lifestyle2) }),
      k.faqSec(1, 5, "cards"),
      k.R.booking(1),
    ],
  },
  {
    id: "heuren",
    name: "Heuren",
    tagline: "Bleu nuit, blanc et champagne",
    description: "Boutique mono-produit de la famille E-commerce pour un objet à offrir : grandes photographies pleine largeur, fonds blanc et bleu nuit, boutons champagne, titres fins sans empattement. Ouverture plein écran, réassurance, cadeau en coffret, triptyque des occasions, gros plan avec liens de détail, présentation et achat, aide au choix, questions et rappel final.",
    bestFor: ["e-commerce", "horlogerie", "accessoire", "produit unique", "cadeau"],
    en: { tagline: "Midnight blue, white and champagne", description: "Single-product store from the E-commerce family for an object to give: large full-width photographs, white and midnight-blue backgrounds, champagne buttons, thin sans-serif headings. Full-screen opening, reassurance, gift box, triptych of occasions, close-up with detail links, presentation and purchase, help to choose, questions and closing reminder.", bestFor: ["e-commerce", "watchmaking", "accessory", "single product", "gift"] },
    fonts: { heading: "jost_n3", body: "jost_n4" },
    previewFonts: { heading: "Jost", body: "Jost" },
    motion: "subtle",
    photoMood: "galerie",
    kinds: ["catalog"],
    // Maquette HEUREN du 22 octobre (docs/design/heuren-reference-20261022) : nom en lettres espacées à gauche, menu au
    // centre, en-tête transparent sur l'ouverture ; pied bleu nuit sur une ligne.
    look: look({ headerLayout: "logo-left", shape: "bar", menu: "fullscreen", footer: "minimal", ann: "static", card: "minimal", button: "solid", radius: { button: 0, card: 0 }, headingScale: 100, tracking: 0, pageWidth: 1360, gallery: "carousel", ds: "maison", density: "airy", buttonUppercase: false }),
    settings: { editorial_profile: "cadran", conversion_profile: "none", motion_intensity: "subtle" },
    headerSettings: { mega_menu: "none", mobile_submenu: "accordion", show_cart: true, transparent_on_home: true, color_scheme: "scheme-1", mobile_menu_scheme: "scheme-2" },
    // Galerie à miniatures sur fond gris très clair, zoom, pastille de couleur, barre d'achat sur téléphone.
    mainProduct: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    // Fond blanc pur, bleu nuit, gris très clair des fonds produit ; boutons de la couleur d'accent de la marque (champagne
    // pour la démonstration).
    palette: (k) => {
      const navy = k.night(0.12, 0.45);
      const mist = "#F3F4F6";
      // Boutons pleins de l'accent tel quel (maquette : champagne sur blanc comme sur bleu nuit) ; le texte et les liens
      // d'accent restent lisibles par la nuance « encre » calculée dans le thème (contraste 4,5:1 sur le fond).
      const own = (sc: ReturnType<typeof k.scheme>) => ({ ...sc, accent: k.p.accent, accent_text: k.scheme(k.p.accent, navy, navy).text });
      return [own(k.scheme("#FFFFFF", navy, k.p.accent)), own(k.scheme(navy, "#FFFFFF", k.p.accent, 0.08)), own(k.scheme(mist, navy, k.p.accent)), k.filled(k.p.accent)];
    },
    // Accueil de la maquette : ouverture plein écran, réassurance, cadeau en coffret, triptyque des occasions, gros plan avec
    // liens de détail, présentation et achat, aide au choix, questions, rappel final.
    home: (k) => [
      k.lib("ed-opening", 2, { layout: "banner", heading_tag: "h1", image_asset: k.im.hero ?? k.im.lifestyle ?? k.im.packshot, mobile_image_asset: k.im.portrait ?? "", copy_surface: false, padding_top: 0, padding_bottom: 0 }),
      k.lib("fs-commitments", 1, { layout: "strip", align: "center", padding_top: 20, padding_bottom: 20 }, { blocks: [{ type: "item", settings: { icon: "box", title: k.t("Livraison", "Delivery") } }, { type: "item", settings: { icon: "return", title: k.t("Retours", "Returns") } }, { type: "item", settings: { icon: "headset", title: k.t("Assistance", "Support") } }] }),
      k.lib("ed-scene", 1, { layout: "band", text_side: "left", band_height: "tall", image_asset: k.im.lifestyle ?? k.im.scene1 ?? "", padding_top: 0, padding_bottom: 0 }, { hide: !(k.im.lifestyle ?? k.im.scene1) }),
      ((uses) => k.lib("ed-diptych", 2, { layout: "triptych", padding_top: 0, padding_bottom: 0 }, { hide: uses.length < 2, blocks: uses.map((f) => ({ type: "frame", settings: { image_asset: f, ratio: "portrait", title: "" } })) }))([k.im.scene1, k.im.scene2, k.im.scene3].filter((f): f is string => !!f)),
      k.lib("ed-scene", 2, { layout: "band", text_side: "left", band_height: "medium", image_asset: k.im.detail1 ?? k.im.detail2 ?? "", padding_top: 0, padding_bottom: 0 }, { hide: !(k.im.detail1 ?? k.im.detail2) }),
      k.lib("featured-purchase", 1, { layout: "duo", image_fit: "cover", padding_top: 24, padding_bottom: 24 }),
      k.lib("fs-commitments", 2, { layout: "aside", align: "left", padding_top: 64, padding_bottom: 64 }),
      k.lib("v2-faq", 1, { layout: "side" }),
      k.lib("ed-scene", 2, { layout: "band", text_side: "right", band_height: "medium", button_style: "link", image_asset: k.im.banner ?? k.im.lifestyle2 ?? "", padding_top: 0, padding_bottom: 0 }, { hide: !(k.im.banner ?? k.im.lifestyle2) }),
    ],
    // Fiche de la maquette : galerie et achat, gros plan, la montre de près (repères et détails), coffret, scène d'usage, questions.
    product: (k) => [
      k.lib("ed-scene", 2, { layout: "band", text_side: "left", band_height: "medium", image_asset: k.im.detail1 ?? k.im.detail2 ?? "", padding_top: 0, padding_bottom: 0 }, { hide: !(k.im.detail1 ?? k.im.detail2) }),
      k.lib("fs-lookbook", 1, { layout: "detail", image_asset: k.im.packshot ?? k.im.cutout ?? "", align: "left" }),
      k.lib("ed-scene", 1, { layout: "band", text_side: "right", band_height: "medium", image_asset: k.im.lifestyle2 ?? k.im.lifestyle ?? "", padding_top: 0, padding_bottom: 0 }, { hide: !(k.im.lifestyle2 ?? k.im.lifestyle) }),
      k.lib("ed-scene", 2, { layout: "band", text_side: "left", band_height: "medium", image_asset: k.im.scene1 ?? "", padding_top: 0, padding_bottom: 0 }, { hide: !k.im.scene1 }),
      k.lib("v2-faq", 1, { layout: "side" }),
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
    tagline: "Cobalt, crème et jaune doux, titres ronds épais",
    description: "Boutique spécialisée pour une collection de quelques produits assortis, d'après les maquettes enrichies du 23 octobre : grandes photographies, fonds crème et bleu poudré, pied bleu cobalt, boutons jaune doux et bleu, titres ronds très épais. Ouverture plein cadre, quatre cartes produit, scène en panneau arrondi, gros plan aux détails numérotés, ensemble assorti, petites aventures en pastilles, guide des tailles illustré, présentation de la marque, derniers articles, questions avec photo et inscription finale.",
    bestFor: ["boutique spécialisée", "animalerie", "accessoires", "collection coordonnée", "quelques produits assortis"],
    en: { tagline: "Cobalt, cream and soft yellow, thick rounded headings", description: "Specialty store for a collection of a few matching products, from the enriched 23 October mock-ups: large photographs, cream and powder-blue backgrounds, cobalt footer, soft-yellow and blue buttons, very bold rounded headings. Full-bleed opening, four product cards, scene in a rounded panel, close-up with numbered details, matching set, small adventures as pills, illustrated size guide, brand story, latest articles, questions with a photo and closing sign-up.", bestFor: ["specialty store", "pet supplies", "accessories", "coordinated collection", "a few matching products"] },
    fonts: { heading: "nunito_n9", body: "dm_sans_n4" },
    previewFonts: { heading: "Nunito", body: "DM Sans" },
    motion: "subtle",
    photoMood: "elan",
    kinds: ["specialty"],
    // Maquettes MUSEAU CLUB du 23 octobre (docs/design/museau-club-reference-20261023) : logo à gauche, menu à côté,
    // recherche, compte et panier à droite ; pied bleu cobalt, marque à gauche, colonnes et inscription.
    look: look({ headerLayout: "logo-left", shape: "bar", icons: "plain", menu: "drawer", footer: "brand-left", ann: "static", card: "boxed", button: "solid", radius: { button: 999, card: 22 }, headingCase: "none", tracking: -1, headingScale: 100, pageWidth: 1320, gallery: "carousel", density: "balanced", buttonUppercase: false }),
    settings: { conversion_profile: "club", editorial_profile: "none", motion_intensity: "subtle", card_arrow: true },
    headerSettings: { mega_menu: "none", mobile_menu: "drawer", mobile_submenu: "accordion", show_search: true, show_cart: true, transparent_on_home: false, color_scheme: "scheme-1", mobile_menu_scheme: "scheme-1" },
    // Fiche : grande photo, vignettes dessous, zoom, barre d'achat sur téléphone.
    mainProduct: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    // Crème (fonds), bleu cobalt plein (pied, boutons d'achat), bleu poudré (panneaux), jaune doux plein (boutons d'appel) :
    // couleurs tirées de la marque (primaire, accent, clair) ; titres dans le sombre de la marque.
    palette: (k) => {
      const cream = k.light("#FCFAF0");
      const ink = k.p.dark;
      const powder = k.mix(cream, "#BFDCF8", 0.72);
      return [k.scheme(cream, ink, k.onLight(cream)), k.filled(k.p.primary), k.scheme(powder, ink, k.onLight(powder)), k.filled(k.p.accent)];
    },
    // Accueil enrichi : ouverture, quatre cartes, scène en panneau arrondi, gros plan aux détails numérotés, ensemble
    // assorti à côté d'une photo, trois petites aventures, guide des tailles illustré, la marque, derniers articles,
    // questions avec photo, inscription sur photo.
    home: (k) => [
      k.lib("cv-banner", 1, { layout: "spotlight", band_height: "hero", veil: "light", mobile_valign: "top", heading_tag: "h1", image_asset: k.im.hero ?? k.im.lifestyle ?? k.im.packshot, image_loading: "eager", button_arrow: true, padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }),
      k.lib("fs-products", 1, { layout: "grid", source: "collection", collection: "all", ratio: "square", columns: 4, limit: 4, align: "left", heading: "", text: "", padding_top: 0, padding_bottom: 24 }),
      k.lib("cv-banner", 3, { layout: "panel-left", button_arrow: true, image_asset: k.im.lifestyle2 ?? k.im.scene1 ?? "", padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }, { hide: !(k.im.lifestyle2 ?? k.im.scene1) }),
      ((details) => k.lib("cv-feature", 1, { layout: "numbered", detail_shape: "circle", detail_numbers: true, image_asset: k.im.packshot ?? k.im.cutout ?? "", button_arrow: true, padding_top: 40, padding_bottom: 40 }, { blocks: details.map((f) => ({ type: "detail", settings: { image_asset: f } })) }))([k.im.detail1, k.im.detail2].filter((f): f is string => !!f)),
      k.lib("fs-products", 3, { layout: "media", source: "collection", collection: "all", ratio: "square", limit: 3, align: "left", image_asset: k.im.scene1 ?? k.im.lifestyle ?? "", padding_top: 0, padding_bottom: 0 }),
      ((shots) => k.lib("cv-cards", 1, { layout: "pills", padding_top: 40, padding_bottom: 40 }, { hide: shots.length < 2, blocks: shots.map((f) => ({ type: "card", settings: { image_asset: f } })) }))([k.im.scene2, k.im.scene3, k.im.banner].filter((f): f is string => !!f)),
      k.lib("cv-banner", 3, { layout: "illustration", button_arrow: true, padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }),
      k.lib("cv-banner", 1, { layout: "panel-right", button_arrow: true, image_asset: k.im.portrait ?? k.im.lifestyle ?? "", padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }, { hide: !(k.im.portrait ?? k.im.lifestyle) }),
      k.lib("fs-journal", 1, { layout: "row", limit: 3, align: "left", padding_top: 32, padding_bottom: 32 }),
      k.lib("faq", 1, { style: "lines", layout: "side", open_first: true, image_asset: k.im.lifestyle2 ?? k.im.scene1 ?? "", padding_top: 32, padding_bottom: 32 }),
      k.lib("newsletter-media", 2, { layout: "background", image_asset: k.im.banner ?? k.im.lifestyle ?? "", legal: k.privacy, padding_top: 0, padding_bottom: 0 }, { hide: !(k.im.banner ?? k.im.lifestyle) }),
    ],
    // Fiche enrichie : galerie et achat (détails en médaillons sous la galerie), scène en panneau arrondi, détails pensés,
    // trois photos en situation, guide des tailles, accordéons, produits assortis, questions, appel final avec le produit.
    product: (k) => [
      k.lib("cv-banner", 3, { layout: "panel-right", button_arrow: true, image_asset: k.im.lifestyle ?? k.im.hero ?? "", padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }, { hide: !(k.im.lifestyle ?? k.im.hero) }),
      k.lib("cv-banner", 3, { layout: "panel-right", image_asset: k.im.detail1 ?? "", padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "", button_label: "" }, { hide: !k.im.detail1 }),
      ((shots) => k.lib("cv-cards", 1, { layout: "columns", numbered: true, padding_top: 32, padding_bottom: 32 }, { hide: shots.length < 2, blocks: shots.map((f) => ({ type: "card", settings: { image_asset: f } })) }))([k.im.scene1, k.im.detail2, k.im.lifestyle2].filter((f): f is string => !!f)),
      k.lib("cv-banner", 3, { layout: "illustration", button_arrow: true, padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }),
      k.faqSec(1, 3, "lines"),
      k.lib("fs-products", 1, { layout: "grid", source: "collection", collection: "all", ratio: "square", columns: 3, limit: 4, align: "left", padding_top: 32, padding_bottom: 32 }),
      k.faqSec(1, 4, "cards"),
      k.lib("cv-banner", 2, { layout: "background", band_height: "medium", veil: "left", button_arrow: true, image_asset: k.im.lifestyle ?? k.im.hero ?? "", padding_top: 0, padding_bottom: 0, price_text: "", price_note: "", note: "" }, { hide: !(k.im.lifestyle ?? k.im.hero) }),
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
  {
    id: "souple",
    name: "Souple",
    tagline: "Rose poudré, prune et liège",
    description: "Boutique de collection de la famille E-commerce pour quelques produits qui vont ensemble : une scène plein écran en ouverture (titre et bouton posés sur l'image), la collection en mosaïque (chaque produit relié à sa fiche), une phrase qui se dévoile, la liste des produits, un panorama, une scène et son texte, l'achat d'un produit, questions en lignes et inscription sur photo. Rose poudré, prune et liège, serif fine et texte géométrique, logo en tête et menu dessous avec les produits en cartes illustrées, tuiles sur téléphone et pied de vitrine signé.",
    bestFor: ["e-commerce", "collection", "bien-être", "quelques produits assortis", "maison"],
    en: { tagline: "Powder pink, plum and cork", description: "Collection store from the E-commerce family for a few products that belong together: a full-screen scene as the opening (heading and button over the image), the collection as a mosaic (each product linking to its page), a sentence that reveals itself, the product list, a panorama, a scene with its text, one product to buy, line questions and a sign-up over a photo. Powder pink, plum and cork, a fine serif with geometric text, the logo on top and the menu below with products as illustrated cards, tiles on phone and a signed storefront footer.", bestFor: ["e-commerce", "collection", "wellness", "a few matching products", "home"] },
    fonts: { heading: "playfair_display_n4", body: "jost_n4" },
    previewFonts: { heading: "Playfair Display", body: "Jost" },
    motion: "subtle",
    photoMood: "galerie",
    kinds: ["catalog"],
    // En-tête « Collections en cartes » de la famille E-commerce (logo en tête, menu dessous, les produits en cartes
    // illustrées dans le sous-menu, tuiles sur téléphone) et pied « Boutique éditoriale » (grande signature, liens) : deux
    // dispositions de la famille qu'ORBE, ONDE, HEUREN et ALCÔVE n'utilisent pas.
    look: look({ headerLayout: "two-rows", shape: "bar", menu: "cards", footer: "reference-shop", ann: "static", card: "boxed", button: "solid", radius: { button: 10, card: 18 }, headingScale: 108, tracking: -1, pageWidth: 1320, gallery: "carousel", ds: "maison", density: "airy" }),
    settings: { editorial_profile: "poudre", conversion_profile: "none", motion_intensity: "subtle" },
    headerSettings: { layout: "two-rows", mega_menu: "cards", mobile_menu: "cards", mobile_submenu: "open", show_cart: true },
    // Galerie en carrousel, cadre carré : chaque vue montre le produit entier, une vue à la fois sur téléphone.
    mainProduct: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
    palette: (k) => {
      const ivory = k.light("#FBF3F0");
      const powder = k.mix(ivory, "#D9A9A9", 0.38);
      const cork = k.mix(ivory, "#C98A55", 0.26);
      const plum = k.night(0.18, 0.45);
      return [k.scheme(ivory, plum, k.onLight(ivory)), k.scheme(powder, plum, k.onLight(powder)), k.scheme(plum, ivory, k.onDark(plum), 0.06), k.scheme(cork, plum, k.onLight(cork))];
    },
    // Accueil (consigne du 21 octobre, 18 h 31) : une vraie ouverture plein écran (la scène bord à bord, titre et bouton
    // posés sur l'image), puis la collection en mosaïque (une vue d'ensemble et chaque produit, relié à sa fiche), une
    // phrase, la liste des produits, un panorama, une scène et son texte, l'achat d'un produit, les questions et
    // l'inscription sur photo.
    home: (k) => {
      // Mosaïque : la vue d'ensemble puis chaque produit de la boutique avec sa première photo (au moins deux produits
      // photographiés). Sans photo d'ambiance, elle devient l'ouverture, avec le titre de la page.
      const shelf = k.shelf.filter((x) => x.image).slice(0, 4);
      const overview = k.im.lifestyle ?? k.im.hero ?? k.im.scene1;
      const tiles = overview && shelf.length >= 2 ? [{ type: "collection", settings: { title: k.t("Toute la collection", "The whole collection"), text: "", link: "/collections/all", image_asset: overview } }, ...shelf.map((x) => ({ type: "collection", settings: { title: x.title, text: "", link: `/products/${x.handle}`, image_asset: x.image } }))] : [];
      const mosaic = (tag: "h1" | "h2", extra: Record<string, unknown> = {}) => k.lib("fs-collections", 1, { layout: "asym", heading_tag: tag, align: "left", button_label: k.t("Voir toute la collection", "See the whole collection"), button_link: "/collections/all", effect: "rise", stagger: true, hover: true, padding_top: 72, padding_bottom: 72, ...extra }, { hide: !tiles.length, blocks: tiles });
      const opening = k.either(
        k.lib("ed-opening", 1, { layout: "fullscreen", heading_tag: "h1", label: k.hero.eyebrow, heading: k.hero.heading, text: k.hero.text ? `<p>${k.hero.text}</p>` : "", button_label: k.hero.cta || k.t("Découvrir", "Discover"), button_link: shelf.length >= 2 || !k.shelf[0] ? "/collections/all" : `/products/${k.shelf[0].handle}`, image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.banner ?? "", mobile_image_asset: k.im.portrait ?? "", copy_surface: true, padding_top: 0, padding_bottom: 0 }, { hide: !(k.im.lifestyle ?? k.im.hero ?? k.im.banner) }),
        mosaic("h1", { eyebrow: k.hero.eyebrow, heading: k.hero.heading, text: k.hero.text ? `<p>${k.hero.text}</p>` : "", padding_top: 32 }),
        // Aucune photo : le titre de la page reste en tête (panorama sans image).
        k.lib("ed-scene", 1, { layout: "panorama", heading_tag: "h1", label: k.hero.eyebrow, heading: k.hero.heading, text: k.hero.text ? `<p>${k.hero.text}</p>` : "", button_label: k.hero.cta || k.t("Découvrir", "Discover"), button_link: k.shelf[0] ? `/products/${k.shelf[0].handle}` : "/collections/all", image_asset: "", padding_top: 32, padding_bottom: 64 }),
      );
      // Mosaïque déjà en ouverture (repli) : la seconde, identique, reste masquée.
      const fallback = opening[0]?.[0] === "fs-collections";
      const second = mosaic("h2");
      return [
        ...opening,
        fallback ? ([second[0], second[1], second[2], { ...(second[3] ?? {}), disabled: true }] as typeof second) : second,
        k.lib("rich-text", 2, { style: "reveal", align: "left", padding_top: 80, padding_bottom: 80 }),
        k.lib("fs-products", 1, { layout: "list", source: "collection", collection: "all", limit: 4, ratio: "square", align: "left", effect: "fade", padding_top: 80, padding_bottom: 80 }, { hide: shelf.length < 2 }),
        // Le panorama accompagne la collection (deux produits ou plus) ; une boutique d'un seul produit passe directement à
        // l'image et au texte, puis à l'achat.
        k.lib("ed-scene", 1, { layout: "panorama", image_asset: k.im.scene1 ?? k.im.banner ?? "", padding_top: 0, padding_bottom: 64 }, { hide: shelf.length < 2 || !(k.im.scene1 ?? k.im.banner) }),
        k.lib("image-with-text", 4, { layout: "overlap", ratio: "portrait", image_asset: k.im.scene2 ?? k.im.lifestyle2 ?? "", reveal: "up" }, { hide: !(k.im.scene2 ?? k.im.lifestyle2) }),
        k.lib("featured-purchase", 1, { purchase_style: "compact", image_fit: "contain" }),
        k.faqSec(1, 5, "lines"),
        ...k.either(k.lib("newsletter-media", 3, { layout: "background", overlay: 55, image_asset: k.im.scene3 ?? k.im.portrait ?? "", legal: k.privacy }, { hide: !(k.im.scene3 ?? k.im.portrait) }), k.newsletter(2)),
      ];
    },
    // Fiche : galerie en carrousel et achat, la scène du produit en fermeture, le reste de la collection, questions.
    product: (k) => [
      k.lib("ed-scene", 2, { layout: "closing", image_asset: k.im.scene1 ?? k.im.lifestyle2 ?? "", padding_top: 72, padding_bottom: 72 }, { hide: !(k.im.scene1 ?? k.im.lifestyle2) }),
      k.lib("product-recommendations", 1, { intent: "complementary", fallback_collection: "all", limit: 3, card_ratio: "square" }, { hide: k.shelf.length < 2 }),
      k.faqSec(1, 5, "lines"),
    ],
    // Site de services (repli) : la scène et la promesse côte à côte, prestations en cartes illustrées, une phrase qui se
    // dévoile, deux réalisations côte à côte, infos pratiques, questions en lignes et prise de contact.
    services: (k) => [
      k.lib("ed-scene", 1, { layout: "split", heading_tag: "h1", label: k.hero.eyebrow, heading: k.hero.heading, text: k.hero.text ? `<p>${k.hero.text}</p>` : "", image_asset: k.im.hero ?? k.im.lifestyle ?? "", padding_top: 32, padding_bottom: 72 }),
      k.R.servicesList(2, "cards", { withImages: true }),
      k.lib("rich-text", 4, { style: "reveal", align: "left", padding_top: 80, padding_bottom: 80 }),
      k.lib("ed-diptych", 1, { layout: "pair", padding_top: 64, padding_bottom: 64 }),
      k.R.practical(2),
      k.faqSec(1, 5, "lines"),
      k.R.booking(3),
    ],
  },
];
