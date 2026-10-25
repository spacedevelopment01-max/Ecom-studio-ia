/**
 * Catalogue des thèmes ajoutés aux onze directions d'origine : chacun a son caractère graphique (couleurs, polices,
 * en-tête, pied de page, boutons, cartes, densité) ET sa propre composition d'accueil, construite avec les sections de
 * la bibliothèque. Deux thèmes ne partagent jamais la même ouverture ni le même enchaînement (tests/themes-catalogue.test.ts).
 *
 * Honnêteté : une section qui demande une information que seul le marchand possède (avis, compte à rebours d'une
 * vraie offre, logos de partenaires, délais de livraison, notice…) est posée MASQUÉE, prête à compléter dans le studio ;
 * elle n'apparaît aux visiteurs qu'une fois remplie et affichée par le marchand.
 *
 * Module sans dépendance serveur : il est aussi lu par l'interface (galerie des thèmes, onglet Marque).
 */
import type { BaseDirectionId, BrandPalette, ImageSlots } from "./directions";
import type { StoreKind } from "./store-kind";
import { REFERENCE_CATALOG } from "./reference-themes";

export type Sch = 1 | 2 | 3 | 4;
type Blocks = { type: string; settings: Record<string, unknown> }[];
/** Section d'une composition : type, réglages, blocs et options (section masquée tant qu'elle n'est pas complétée). */
export type Row = [string, Record<string, unknown>, Blocks?, { disabled?: boolean }?];

export type SchemeColors = { background: string; surface: string; text: string; muted: string; accent: string; accent_text: string; border: string };

/** Outils de couleur fournis par directions.ts pour construire les quatre jeux de couleurs d'un thème. */
export type PaletteKit = {
  p: BrandPalette;
  /** Jeu de couleurs lisible (contrastes garantis) : fond, texte, accent. */
  scheme: (bg: string, text: string, accent: string, surface?: number) => SchemeColors;
  /** Bloc plein d'une couleur, texte noir ou blanc lisible dessus. */
  filled: (c: string) => SchemeColors;
  /** Couleur de la marque lisible sur un fond clair / sombre (jamais dénaturée). */
  onLight: (bg: string) => string;
  onDark: (bg: string) => string;
  /** Couleur d'accent de la marque d'abord (boutons d'action), sinon la principale, lisible sur ce fond. */
  accentOn: (bg: string) => string;
  /** Sombre de la marque à une luminosité donnée. */
  night: (l: number, sat?: number) => string;
  /** Clair de la marque s'il est vraiment clair, sinon la couleur de repli. */
  light: (fallback: string) => string;
  tint: (c: string, l: number, sat?: number) => string;
  mix: (a: string, b: string, t: number) => string;
};

/** Sections prêtes à composer (textes et photos du projet), fournies par buildSpec. */
export type Kit = {
  t: (fr: string, en: string) => string;
  /** Mention d'inscription avec le lien vers la politique de confidentialité de la boutique. */
  privacy: string;
  im: ImageSlots;
  /** Produits de la boutique (le principal d'abord) avec leur première photo : vitrine d'une boutique de quelques produits. */
  shelf: { handle: string; title: string; image: string }[];
  /** Accroche principale de la boutique (sur-titre, titre, texte, bouton), pour une ouverture rédigée par le thème. */
  hero: { eyebrow: string; heading: string; text: string; cta: string };
  services: boolean;
  // Sections des directions d'origine (même rédaction, autres réglages).
  heroSplit: (sch: 1 | 2, pos: "right" | "left", asset?: string) => Row;
  heroFull: (sch: 1 | 3, align?: string, font?: "heading" | "body") => Row;
  feat: (sch: 1 | 2 | 3, style?: string, cols?: number) => Row;
  iwt: (sch: Sch, layout: string, asset?: string, reveal?: string) => Row;
  statementRow: (sch: Sch, style?: string, withButton?: boolean) => Row[];
  stats: (sch: 1 | 2 | 3, layout?: string) => Row[];
  specList: (sch: 1 | 2 | 3) => Row;
  faqSec: (sch: 1 | 2, limit?: number, style?: string) => Row;
  marq: (sch: Sch, size: string, reverse?: boolean) => Row;
  cta: (sch: 1 | 3 | 4, asset?: string) => Row;
  newsletter: (sch: Sch) => Row;
  hgallery: (sch: 1 | 2 | 3) => Row;
  mosaicSec: (sch: 1 | 2, layout?: string) => Row;
  featured: (sch: 1 | 2) => Row;
  video: (sch: 1 | 3, ratio?: string) => Row[];
  circles: (sch: 1 | 2) => Row[];
  stackCards: (sch: 1 | 2) => Row[];
  timelineSec: (sch: 1 | 2) => Row[];
  curve: (sch: Sch) => Row;
  reels: (sch: 1 | 2 | 3) => Row[];
  wave: (from: Sch, to: Sch) => Row;
  story: (sch: 1 | 2 | 3) => Row;
  /** Sections V2, rédigées avec les textes de la boutique (vides s'il manque le contenu). */
  v2: {
    hero: (layout: "immersive" | "halfbleed" | "stage" | "split" | "type" | "frame" | "board", sch: 1 | 2 | 3, texture?: string) => Row;
    index: (layout: "rows" | "cards" | "bento" | "menu", sch: Sch) => Row[];
    cards: (layout: "below" | "overlay" | "numbered" | "tiles", sch: Sch) => Row[];
    band: (layout: "rule" | "icons", sch: Sch) => Row[];
    split: (layout: "media-left" | "media-right" | "overlap", sch: Sch) => Row[];
    benefits: (layout: "images" | "icons", sch: Sch) => Row[];
    steps: (layout: "line" | "stack" | "cards", sch: Sch) => Row[];
    faq: (layout: "side" | "center", sch: Sch) => Row[];
    cta: (layout: "band" | "card" | "split", sch: Sch) => Row[];
    specs: (layout: "table" | "tiles" | "columns", sch: Sch) => Row[];
    media: (layout: "bento" | "rail", sch: Sch) => Row[];
    banner: (layout: "overlay" | "panel" | "panorama", sch: Sch, opening?: boolean) => Row[];
    facts: (layout: "strip" | "grid" | "ledger", sch: Sch) => Row[];
  };
  /**
   * Section de la bibliothèque remplie avec le projet (textes vrais, photos du projet). Masquée d'office s'il lui
   * manque une information du marchand ou ses médias ; `hide` la masque dans tous les cas.
   */
  lib: (type: string, sch: Sch, settings?: Record<string, unknown>, opts?: { hide?: boolean; dropBlocks?: string[]; /** Blocs posés explicitement par la composition (ex. : cadres d'un diptyque avec leurs fichiers), rédigés ensuite. */ blocks?: { type: string; settings: Record<string, unknown> }[] }) => Row;
  /** Première section affichable parmi plusieurs (sinon la première, masquée). */
  either: (...rows: (Row | Row[])[]) => Row[];
  /** Site de services : sections de prestations, méthode, réalisations, avis, infos pratiques… */
  R: any;
};

export type ThemeLook = {
  headerLayout: "logo-left" | "logo-center" | "split" | "minimal" | "menu-right" | "nav-left" | "two-rows";
  shape: "floating" | "pill" | "bar" | "boxed";
  icons: "circles" | "plain";
  menu: "fullscreen" | "drawer" | "drawer-right" | "sheet" | "cards";
  footer: "columns" | "wordmark" | "card" | "centered" | "minimal" | "brand-left" | "split" | "stacked" | "boxed" | "reference-shop";
  ann: "rotate" | "marquee" | "static";
  card: "minimal" | "boxed" | "overlay";
  button: "solid" | "outline" | "underline" | "frame";
  radius: { button: number; card: number };
  headingCase: "none" | "uppercase";
  tracking: number;
  headingScale: number;
  glow: number;
  shine: boolean;
  dark: boolean;
  gallery: "stack" | "carousel" | "grid";
  pageWidth: number;
  spacing: number;
  /** Langage des sections V2 (charge aussi leur feuille de style) : jamais « none » pour un thème du catalogue. */
  ds: "craft" | "maison" | "precision" | "bistro" | "product";
  density: "airy" | "balanced" | "compact";
  buttonUppercase: boolean;
};

export type CatalogTheme = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  en: { tagline: string; description: string; bestFor: string[] };
  fonts: { heading: string; body: string };
  previewFonts: { heading: string; body: string };
  motion: "subtle" | "normal" | "expressive";
  /** Ambiance photographique la plus proche parmi les directions d'origine (lumière, décors, étalonnage des visuels). */
  photoMood: BaseDirectionId;
  look: ThemeLook;
  /** Quatre jeux de couleurs : fond principal, fond secondaire, bloc contrasté, bloc de couleur pleine. */
  palette: (k: PaletteKit) => [SchemeColors, SchemeColors, SchemeColors, SchemeColors];
  /** Accueil d'une boutique (produit, catalogue). */
  home: (k: Kit) => (Row | Row[])[];
  /** Accueil d'un site d'entreprise de services. */
  services: (k: Kit) => (Row | Row[])[];
  /** Catégories de projet servies (theme-fit.ts) ; absent : les trois. */
  kinds?: StoreKind[];
  /** Réglages globaux propres au thème (profils « conversion » / éditorial, mouvement…), par-dessus ceux de la direction. */
  settings?: Record<string, unknown>;
  /** Réglages du corps de la fiche produit (galerie, barre fixe, schéma). */
  mainProduct?: Record<string, unknown>;
  /** Le thème dessine sa propre fiche (ex. ONDE, « on-product ») : section Produit commune masquée, aucune recommandation. */
  ownProductBody?: boolean;
  /** En-tête et pied propres au thème (ex. ONDE : « on-header », « on-footer ») à la place des sections communes. */
  headerRow?: (k: Kit) => Row;
  footerRow?: (k: Kit) => Row;
  /** En-tête et pied propres au thème aussi pour un site de services (APLAT : sections ap-header et ap-footer). */
  chromeForServices?: boolean;
  /** Bouton permanent de l'en-tête d'une boutique, vers la fiche du produit principal (libellé générique, jamais propre à une démo). */
  headerCta?: { fr: string; en: string; icon: "arrow" | "clock" | "phone" | "mail" | "chat" };
  /** Réglages de mise en forme propres à l'en-tête du thème (disposition de la famille : sous-menu, encarts, schéma). */
  headerSettings?: Record<string, unknown>;
  /** Sections de la fiche produit après le corps (sinon : avis, récit, caractéristiques, FAQ de la direction). */
  product?: (k: Kit) => (Row | Row[])[];
};

const look = (l: Partial<ThemeLook> & Pick<ThemeLook, "headerLayout" | "shape" | "menu" | "footer" | "ann" | "card" | "button" | "radius">): ThemeLook => ({
  icons: "plain",
  headingCase: "none",
  tracking: 0,
  headingScale: 100,
  glow: 0,
  shine: false,
  dark: false,
  gallery: "stack",
  pageWidth: 1320,
  spacing: 100,
  ds: "maison",
  density: "balanced",
  buttonUppercase: false,
  ...l,
});

/** Identifiants des thèmes du catalogue (dans l'ordre de présentation). */
export const CATALOG_IDS = ["vitrine", "manifeste", "laboratoire", "magazine", "cinema", "rituel", "horizon", "lookbook", "marche", "signal", "jardin", "reception", "cabinet", "recre", "epure", "tribu", "etabli", "velours", "lancement", "fraise", "onde", "orbe", "rive", "sillon", "noctil", "traverse", "heuren", "alcove", "museau-club", "souple", "maison-horizon", "aplat"] as const;
export type CatalogThemeId = (typeof CATALOG_IDS)[number];

export const CATALOG_THEMES: (CatalogTheme & { id: CatalogThemeId })[] = [
  {
    id: "vitrine",
    name: "Vitrine",
    tagline: "Grand magasin, achat direct",
    description: "Blanc net et blocs de la couleur de marque, en-tête sur deux lignes, le produit à acheter dès l'ouverture (galerie, variantes, panier), repères d'achat en pictogrammes, bénéfices en quatre cartes et leviers de vente prêts à activer (offre, compte à rebours, réassurance).",
    bestFor: ["mono-produit", "high-tech", "maison", "accessoires"],
    en: { tagline: "Department store, buy now", description: "Crisp white with blocks of the brand color, a two-row header, the product to buy right at the opening (gallery, variants, cart), buying cues as pictograms, benefits in four cards and sales levers ready to switch on (offer, countdown, reassurance).", bestFor: ["single product", "tech", "home", "accessories"] },
    fonts: { heading: "dm_sans_n7", body: "dm_sans_n4" },
    previewFonts: { heading: "DM Sans", body: "DM Sans" },
    motion: "subtle",
    photoMood: "clinique",
    look: look({ headerLayout: "two-rows", shape: "bar", menu: "drawer", footer: "stacked", ann: "static", card: "boxed", button: "solid", radius: { button: 6, card: 10 }, headingScale: 98, tracking: -2, gallery: "grid", ds: "product", density: "compact", buttonUppercase: true }),
    palette: (k) => {
      const bg = k.light("#FFFFFF");
      return [k.scheme(bg, "#111418", k.onLight(bg)), k.scheme("#F3F4F6", "#111418", k.onLight("#F3F4F6")), k.filled(k.onLight(bg)), k.scheme(k.tint(k.p.accent, 0.92, 0.9), "#111418", k.onLight(k.tint(k.p.accent, 0.92, 0.9)))];
    },
    home: (k) => [
      k.featured(1),
      k.v2.band("icons", 2),
      k.lib("trust-bar", 2),
      ...k.either(k.feat(1, "cards", 4), k.lib("animated-benefits", 1, { layout: "grid" })),
      k.v2.cards("below", 2),
      k.iwt(2, "overlap", k.im.scene1 ?? k.im.detail1, "zoom"),
      k.lib("product-reviews", 1),
      k.lib("featured-offer", 4, { style: "image" }),
      k.lib("countdown", 3, { style: "cards", on_end: "hide" }),
      k.lib("reassurance", 1, { style: "solid" }),
      k.faqSec(2, 6, "lines"),
      k.lib("newsletter-media", 3, { layout: "right", legal: k.privacy }),
    ],
    services: (k) => [
      k.R.servicesList(1, "cards", { withImages: true }),
      k.lib("pricing", 2),
      k.R.trust(1),
      k.v2.facts("grid", 2),
      k.R.testimonials(1),
      k.R.booking(2),
      k.faqSec(1, 6, "lines"),
    ],
  },
  {
    id: "manifeste",
    name: "Manifeste",
    tagline: "Typographie qui prend position",
    description: "Papier ivoire et encre noire, une seule couleur vive, très grands titres serrés, texte animé surligné, filets et boutons soulignés. La marque parle d'abord, les images suivent.",
    bestFor: ["marques engagées", "cosmétique clean", "éditions", "boissons"],
    en: { tagline: "Type that takes a stand", description: "Ivory paper and black ink, a single bright color, very large tight headings, highlighted animated text, rules and underlined buttons. The brand speaks first, images follow.", bestFor: ["purpose brands", "clean beauty", "publishing", "drinks"] },
    fonts: { heading: "chivo_n7", body: "chivo_n4" },
    previewFonts: { heading: "Chivo", body: "Chivo" },
    motion: "normal",
    photoMood: "galerie",
    look: look({ headerLayout: "menu-right", shape: "bar", menu: "fullscreen", footer: "split", ann: "marquee", card: "minimal", button: "underline", radius: { button: 0, card: 0 }, headingScale: 118, tracking: -5, pageWidth: 1360 , ds: "craft"}),
    palette: (k) => {
      const paper = "#F4F1EA";
      const ink = "#121212";
      return [k.scheme(paper, ink, k.onLight(paper)), k.scheme("#EAE5DA", ink, k.onLight("#EAE5DA")), k.scheme(ink, paper, k.onDark(ink), 0.06), k.filled(k.p.accent)];
    },
    home: (k) => [
      k.v2.hero("type", 1, "paper"),
      k.lib("animated-text", 2, { style: "highlight", size: "xl", align: "left" }),
      k.v2.band("rule", 3),
      k.v2.benefits("icons", 1),
      k.v2.split("overlap", 2),
      k.statementRow(1, "statement"),
      k.lib("brand-promise", 2, { layout: "image-right", badge_icon: "check" }),
      k.lib("comparison-table", 1),
      k.v2.faq("side", 2),
      k.v2.cta("band", 4),
    ],
    services: (k) => [
      k.v2.hero("type", 1, "paper"),
      k.lib("animated-text", 2, { style: "highlight", size: "xl", align: "left" }),
      k.v2.band("rule", 3),
      k.R.servicesList(1, "list"),
      k.R.method(2, "timeline"),
      ...k.R.portfolio(1, "grid"),
      k.R.testimonials(2),
      k.R.practical(1),
      k.v2.cta("band", 4),
    ],
  },
  {
    id: "laboratoire",
    name: "Laboratoire",
    tagline: "Précision scientifique",
    description: "Blanc froid et gris bleuté, grotesque technique, produit sur scène quadrillée, caractéristiques en tuiles, bénéfices qui s'animent, vue à 360°, vue éclatée, précautions et comparatif prêts à compléter.",
    bestFor: ["soin dermatologique", "compléments", "high-tech", "matériel"],
    en: { tagline: "Scientific precision", description: "Cool white and blue-gray, a technical grotesque, the product on a grid stage, specifications as tiles, animated benefits, a 360° view, an exploded view, precautions and a comparison ready to complete.", bestFor: ["dermo skincare", "supplements", "tech", "equipment"] },
    fonts: { heading: "space_grotesk_n5", body: "inter_n4" },
    previewFonts: { heading: "Space Grotesk", body: "Inter" },
    motion: "subtle",
    photoMood: "clinique",
    look: look({ headerLayout: "nav-left", shape: "boxed", menu: "drawer-right", footer: "columns", ann: "static", card: "boxed", button: "outline", radius: { button: 4, card: 6 }, headingScale: 96, tracking: -2, gallery: "carousel", ds: "precision", density: "compact" }),
    palette: (k) => {
      const bg = "#F7F9FB";
      const ink = "#0F1B2A";
      const lab = k.tint(k.p.primary, 0.95, 0.35);
      return [k.scheme(bg, ink, k.onLight(bg)), k.scheme(lab, ink, k.onLight(lab)), k.scheme(k.night(0.11, 0.45), "#EEF3F8", k.onDark(k.night(0.11, 0.45)), 0.07), k.scheme("#E3EAF2", ink, ink)];
    },
    home: (k) => [
      k.v2.hero("stage", 1, "grid"),
      k.v2.specs("tiles", 2),
      k.lib("animated-benefits", 1, { layout: "split" }),
      k.lib("product-360", 2, { layout: "center" }),
      k.lib("exploded-view", 3),
      ...k.stats(1, "rows"),
      k.lib("precautions", 2, { style: "grid" }),
      k.faqSec(1, 5, "lines"),
      k.v2.cta("split", 3),
    ],
    services: (k) => [
      ...k.either(k.v2.banner("panorama", 1, true), k.v2.hero("type", 1, "grid")),
      k.v2.facts("strip", 2),
      k.v2.index("bento", 1),
      k.R.method(2, "howto-h"),
      k.lib("pricing", 1),
      k.R.practical(2),
      k.faqSec(1, 5, "lines"),
      k.cta(3),
    ],
  },
  {
    id: "magazine",
    name: "Magazine",
    tagline: "Éditorial à feuilleter",
    description: "Papier journal, grand serif fin et texte courant chaleureux, visuel éditorial avec cartel, contenus alternés, galerie de citations, journal de la marque et onglets de conseils. Une boutique qui se lit.",
    bestFor: ["mode", "décoration", "art de vivre", "librairie"],
    en: { tagline: "An editorial to leaf through", description: "Newsprint paper, a fine large serif and warm body text, an editorial visual with a caption card, alternating stories, a quote gallery, the brand's journal and advice tabs. A store you read.", bestFor: ["fashion", "home decor", "lifestyle", "books"] },
    fonts: { heading: "cormorant_n6", body: "karla_n4" },
    previewFonts: { heading: "Cormorant", body: "Karla" },
    motion: "normal",
    photoMood: "galerie",
    look: look({ headerLayout: "logo-center", shape: "bar", menu: "drawer", footer: "brand-left", ann: "rotate", card: "minimal", button: "underline", radius: { button: 0, card: 2 }, headingScale: 112, tracking: -1, spacing: 105 , ds: "maison"}),
    palette: (k) => {
      const paper = "#F7F4EE";
      const ink = "#1B1A17";
      const red = k.onLight(paper);
      return [k.scheme(paper, ink, red), k.scheme("#FFFFFF", ink, k.onLight("#FFFFFF")), k.scheme("#1B1A17", "#F7F4EE", k.onDark("#1B1A17"), 0.06), k.scheme(k.tint(k.p.secondary, 0.88, 0.6), ink, ink)];
    },
    home: (k) => [
      k.lib("editorial-visual", 1, { layout: "image-right" }),
      k.statementRow(2, "quote"),
      k.lib("alternating-content", 1, { start: "left", ratio: "portrait", reveal: "curtain", button_style: "secondary" }),
      k.lib("editorial-gallery", 2),
      k.lib("content-tabs", 1, { tab_style: "underline", image_position: "left" }),
      k.lib("animated-story", 4, { reveal: "paragraphs", layout: "image-left" }),
      k.lib("featured-blog", 1, { layout: "editorial" }),
      k.faqSec(2, 4, "numbered"),
      k.newsletter(3),
    ],
    services: (k) => [
      k.lib("editorial-visual", 1, { layout: "image-right" }),
      k.R.servicesList(2, "list"),
      k.lib("alternating-content", 1, { start: "right", ratio: "landscape", reveal: "curtain", button_style: "secondary" }),
      ...k.R.portfolio(2, "editorial"),
      k.lib("featured-blog", 1, { layout: "editorial" }),
      k.R.team(2, "portraits", 2),
      k.R.practical(1),
      k.faqSec(2, 5, "numbered"),
    ],
  },
  {
    id: "cinema",
    name: "Cinéma",
    tagline: "Tout en vidéo",
    description: "Noir chaud, capitales légères, vidéo immersive plein écran, stories vidéo, carrousel de films, bande d'images qui défile et vidéos verticales. Sans vidéo, les photos prennent le relais en grand format.",
    bestFor: ["marques vidéo", "mode", "sport", "boissons"],
    en: { tagline: "Video first", description: "Warm black, light capitals, a full-screen immersive video, video stories, a film carousel, a scrolling image strip and vertical videos. Without video, photos take over in large format.", bestFor: ["video-led brands", "fashion", "sport", "drinks"] },
    fonts: { heading: "jost_n6", body: "jost_n4" },
    previewFonts: { heading: "Jost", body: "Jost" },
    motion: "expressive",
    photoMood: "nocturne",
    look: look({ headerLayout: "logo-left", shape: "floating", icons: "circles", menu: "sheet", footer: "boxed", ann: "marquee", card: "overlay", button: "outline", radius: { button: 40, card: 16 }, headingCase: "uppercase", tracking: 2, headingScale: 104, glow: 30, dark: true, gallery: "carousel" , ds: "precision"}),
    palette: (k) => {
      const bg = k.mix("#0E0C0B", k.night(0.06), 0.4);
      const acc = k.onDark(bg);
      return [k.scheme(bg, "#F2EEE9", acc, 0.06), k.scheme(k.mix(bg, "#FFFFFF", 0.06), "#F2EEE9", k.onDark(k.mix(bg, "#FFFFFF", 0.06)), 0.06), k.scheme("#F2EEE9", "#141110", k.onLight("#F2EEE9")), k.filled(acc)];
    },
    home: (k) => [
      ...k.either(k.lib("immersive-video", 1, { text_position: "bottom", length: "long" }), k.v2.banner("panel", 1, true)),
      ...k.either(k.lib("video-stories", 2, { size: "large" }), k.circles(2)),
      ...k.either(k.lib("video-carousel", 1, { ratio: "landscape" }), k.lib("media-gallery", 1, { columns: "4", video_play: "hover" })),
      k.feat(2, "glow"),
      k.hgallery(1),
      ...k.reels(2),
      k.v2.cta("card", 4),
    ],
    services: (k) => [
      ...k.either(k.lib("immersive-video", 1, { text_position: "center", length: "medium" }), k.v2.banner("panel", 1, true)),
      k.R.servicesList(2, "cards"),
      ...k.either(k.lib("video-carousel", 1, { ratio: "landscape" }), k.hgallery(1)),
      ...k.R.portfolio(2, "grid"),
      k.R.testimonials(1),
      k.R.practical(2),
      k.v2.cta("card", 4),
    ],
  },
  {
    id: "rituel",
    name: "Rituel",
    tagline: "Soin et gestes lents",
    description: "Rose poudré et grège, serif doux, très grandes rondeurs, ouverture flexible avec badge, situations du quotidien, routine en gestes, bénéfices illustrés, image en rideau et avant / après.",
    bestFor: ["cosmétique", "bien-être", "bougies", "linge de maison"],
    en: { tagline: "Care and slow gestures", description: "Powder pink and greige, a soft serif, very round corners, a flexible opening with a badge, everyday situations, a step-by-step routine, illustrated benefits, a curtain-reveal image and before / after.", bestFor: ["cosmetics", "wellness", "candles", "home linen"] },
    fonts: { heading: "lora_n4", body: "jost_n4" },
    previewFonts: { heading: "Lora", body: "Jost" },
    motion: "subtle",
    photoMood: "atelier",
    look: look({ headerLayout: "logo-center", shape: "floating", icons: "circles", menu: "drawer-right", footer: "centered", ann: "rotate", card: "minimal", button: "solid", radius: { button: 40, card: 40 }, headingScale: 102, tracking: -1, shine: true, glow: 25, density: "airy", spacing: 110 , ds: "maison"}),
    palette: (k) => {
      const blush = k.tint(k.p.secondary, 0.95, 0.5);
      const ink = k.night(0.18, 0.4);
      const rose = k.tint(k.p.accent, 0.88, 0.55);
      return [k.scheme(blush, ink, k.onLight(blush)), k.scheme(rose, ink, k.onLight(rose)), k.scheme(k.night(0.16, 0.3), k.tint(k.p.light, 0.95, 0.4), k.onDark(k.night(0.16, 0.3))), k.scheme("#FFFFFF", ink, k.onLight("#FFFFFF"))];
    },
    home: (k) => [
      k.lib("hero-flex", 1, { media_layout: "right", height: "large", content_width: "normal", align_y: "center", text_color: "dark" }, { dropBlocks: ["rating", "logos"] }),
      k.lib("situations", 2),
      k.lib("routine-steps", 1),
      k.v2.benefits("images", 4),
      k.iwt(3, "image-right", k.im.detail2 ?? k.im.detail1, "curtain"),
      k.lib("before-after", 1, { ratio: "4 / 5" }),
      k.faqSec(2, 5, "lines"),
      k.newsletter(1),
    ],
    services: (k) => [
      k.lib("hero-flex", 1, { media_layout: "right", height: "large", content_width: "normal", align_y: "center", text_color: "dark" }, { dropBlocks: ["rating", "logos"] }),
      k.lib("situations", 2),
      k.R.servicesList(1, "cards", { withImages: true }),
      k.lib("booking-calendar", 4, { kind: "appointment" }),
      k.R.team(2, "portraits", 2),
      k.R.testimonials(1),
      k.R.practical(2),
      k.faqSec(1, 5, "lines"),
    ],
  },
  {
    id: "horizon",
    name: "Horizon",
    tagline: "Grands espaces",
    description: "Bleu ciel et sable, grotesque large en capitales, photo plein écran centrée, repères en pictogrammes, bénéfices à filets, rail de photos, grande bannière panoramique et parcours de livraison prêt à compléter.",
    bestFor: ["outdoor", "voyage", "vélo", "jardin"],
    en: { tagline: "Wide open spaces", description: "Sky blue and sand, a wide grotesque in capitals, a centered full-screen photo, pictogram cues, ruled benefits, a photo rail, a large panoramic banner and a delivery journey ready to complete.", bestFor: ["outdoor", "travel", "cycling", "garden"] },
    fonts: { heading: "work_sans_n7", body: "work_sans_n4" },
    previewFonts: { heading: "Work Sans", body: "Work Sans" },
    motion: "normal",
    photoMood: "elan",
    look: look({ headerLayout: "logo-center", shape: "floating", menu: "drawer-right", footer: "stacked", ann: "static", card: "overlay", button: "solid", radius: { button: 8, card: 14 }, headingCase: "uppercase", tracking: 1, headingScale: 106, pageWidth: 1440 , ds: "craft"}),
    palette: (k) => {
      const sky = k.tint(k.p.primary, 0.965, 0.35);
      const sand = k.tint(k.p.secondary, 0.9, 0.45);
      const ink = k.night(0.14, 0.5);
      return [k.scheme(sky, ink, k.onLight(sky)), k.scheme(sand, ink, k.onLight(sand)), k.scheme(k.night(0.2, 0.55), "#F3F6F8", k.onDark(k.night(0.2, 0.55))), k.filled(k.onLight(sky))];
    },
    home: (k) => [
      k.lib("hero", 1, { height: "screen", align: "center", text_color: "light" }),
      k.v2.band("icons", 2),
      k.feat(2, "lines", 3),
      k.v2.media("rail", 1),
      k.v2.steps("cards", 2),
      k.lib("shipping-journey", 1),
      k.v2.banner("panorama", 3),
      k.faqSec(1, 5, "numbered"),
    ],
    services: (k) => [
      k.lib("hero", 1, { height: "screen", align: "center", text_color: "light" }),
      k.R.servicesList(2, "cards", { withImages: true }),
      k.v2.media("rail", 1),
      k.R.method(2, "timeline"),
      k.v2.banner("panorama", 3),
      k.R.testimonials(1),
      k.R.practical(2),
      k.faqSec(1, 5, "numbered"),
    ],
  },
  {
    id: "lookbook",
    name: "Lookbook",
    tagline: "La mode en images",
    description: "Noir et blanc, capitales très espacées, boutons cadrés, ouverture photo à moitié pleine page, menu visuel en cercles fins, collage éditorial, galerie sociale et inscription sur photo.",
    bestFor: ["mode", "chaussures", "lunettes", "maroquinerie"],
    en: { tagline: "Fashion in pictures", description: "Black and white, widely spaced capitals, framed buttons, a half-bleed photo opening, a visual menu in thin circles, an editorial collage, a social gallery and a sign-up over a photo.", bestFor: ["fashion", "shoes", "eyewear", "leather goods"] },
    fonts: { heading: "jost_n5", body: "inter_n4" },
    previewFonts: { heading: "Jost", body: "Inter" },
    motion: "normal",
    photoMood: "flux",
    look: look({ headerLayout: "split", shape: "boxed", menu: "cards", footer: "split", ann: "static", card: "minimal", button: "frame", radius: { button: 0, card: 0 }, headingCase: "uppercase", tracking: 6, headingScale: 90, gallery: "grid", pageWidth: 1440 , ds: "maison"}),
    palette: (k) => {
      const ink = "#0A0A0A";
      return [k.scheme("#FFFFFF", ink, k.onLight("#FFFFFF")), k.scheme("#F1F1F1", ink, k.onLight("#F1F1F1")), k.scheme(ink, "#FFFFFF", "#FFFFFF", 0.07), k.filled(k.onLight("#FFFFFF"))];
    },
    home: (k) => [
      k.v2.hero("halfbleed", 1),
      k.lib("visual-menu", 1, { ring: "thin", size: "large", align: "center" }),
      k.mosaicSec(1, "editorial"),
      k.featured(2),
      k.statementRow(3, "statement"),
      k.lib("social-gallery", 1, { network: "instagram", ratio: "portrait", columns: "4", columns_mobile: "2" }),
      k.lib("newsletter-media", 1, { layout: "background", legal: k.privacy }),
    ],
    services: (k) => [
      k.v2.hero("halfbleed", 1),
      k.lib("visual-menu", 1, { ring: "thin", size: "large", align: "center" }),
      ...k.R.portfolio(1, "editorial"),
      k.R.servicesList(2, "list"),
      k.statementRow(3, "statement"),
      k.lib("booking-calendar", 1, { kind: "appointment" }),
      k.R.practical(2),
    ],
  },
  {
    id: "marche",
    name: "Marché",
    tagline: "Ardoise et comptoir",
    description: "Kraft et vert ardoise, serif gras, ouverture façon ardoise avec la carte, bandeau à filets, liste en menu de bistrot, cartes en tuiles colorées, étapes en cartes et séparateur en zigzag.",
    bestFor: ["épicerie", "café", "boulangerie", "restaurant"],
    en: { tagline: "Slate and counter", description: "Kraft and slate green, a bold serif, a slate-board opening with the menu, a ruled band, a bistro-style menu list, colored tile cards, step cards and a zigzag divider.", bestFor: ["grocery", "coffee", "bakery", "restaurant"] },
    fonts: { heading: "lora_n7", body: "karla_n4" },
    previewFonts: { heading: "Lora", body: "Karla" },
    motion: "normal",
    photoMood: "gourmand",
    look: look({ headerLayout: "logo-center", shape: "bar", menu: "drawer", footer: "card", ann: "marquee", card: "boxed", button: "solid", radius: { button: 12, card: 16 }, headingScale: 108, ds: "bistro" }),
    palette: (k) => {
      const kraft = k.tint(k.p.secondary, 0.92, 0.55);
      const slate = k.mix(k.night(0.14, 0.5), "#1F2A24", 0.55);
      return [k.scheme(kraft, "#1F1A14", k.onLight(kraft)), k.scheme("#FBF7EF", "#1F1A14", k.onLight("#FBF7EF")), k.scheme(slate, "#F4EFE4", k.onDark(slate), 0.07), k.filled(k.p.accent)];
    },
    home: (k) => [
      k.v2.hero("board", 3, "paper"),
      k.v2.band("rule", 1),
      k.v2.index("menu", 1),
      k.v2.cards("tiles", 2),
      k.v2.split("media-left", 1),
      k.lib("creative-divider", 3, { shape: "zigzag" }),
      k.v2.steps("cards", 3),
      k.v2.faq("side", 2),
      k.newsletter(4),
    ],
    services: (k) => [
      k.v2.hero("board", 3, "paper"),
      k.v2.index("menu", 1),
      k.lib("booking-calendar", 2, { kind: "table" }),
      k.v2.split("media-left", 1),
      k.lib("creative-divider", 3, { shape: "zigzag" }),
      k.v2.facts("ledger", 3),
      k.R.practical(1),
      k.v2.faq("side", 2),
    ],
  },
  {
    id: "signal",
    name: "Signal",
    tagline: "Technologie sombre",
    description: "Graphite profond et une couleur électrique, titres très gras serrés, scène flottante avec étiquettes, chiffres en lignes, bénéfices animés en grille, défilement par étapes et fiche technique en tableau.",
    bestFor: ["high-tech", "audio", "gaming", "mobilité"],
    en: { tagline: "Dark technology", description: "Deep graphite and one electric color, very bold tight headings, a floating scene with tags, figures in rows, animated benefits in a grid, scroll-by-step storytelling and a spec table.", bestFor: ["tech", "audio", "gaming", "mobility"] },
    fonts: { heading: "inter_n8", body: "space_grotesk_n4" },
    previewFonts: { heading: "Inter", body: "Space Grotesk" },
    motion: "expressive",
    photoMood: "nocturne",
    look: look({ headerLayout: "nav-left", shape: "floating", menu: "sheet", footer: "split", ann: "static", card: "overlay", button: "outline", radius: { button: 6, card: 12 }, tracking: -4, headingScale: 104, glow: 85, dark: true, gallery: "grid", ds: "product" }),
    palette: (k) => {
      const bg = "#0B0D10";
      const acc = k.onDark(bg);
      return [k.scheme(bg, "#E8EDF2", acc, 0.06), k.scheme("#14181D", "#E8EDF2", k.onDark("#14181D"), 0.06), k.scheme("#E8EDF2", "#0B0D10", k.onLight("#E8EDF2")), k.filled(acc)];
    },
    home: (k) => [
      k.lib("floating-scene", 1, { layout: "center", decor: "full" }),
      ...k.stats(2, "rows"),
      k.lib("animated-benefits", 1, { layout: "grid" }),
      k.lib("scroll-steps", 2, { media_side: "right" }),
      ...k.either(k.video(1, "16/9"), k.iwt(1, "overlap", k.im.scene1, "up")),
      k.v2.specs("table", 2),
      k.lib("comparison-table", 1),
      k.faqSec(2, 5, "numbered"),
      k.cta(3),
    ],
    services: (k) => [
      k.lib("floating-scene", 1, { layout: "center", decor: "minimal" }),
      k.R.trust(2),
      k.R.servicesList(1, "cards"),
      k.lib("pricing", 2),
      k.v2.steps("cards", 1),
      k.R.testimonials(2),
      k.R.practical(1),
      k.v2.faq("center", 2),
    ],
  },
  {
    id: "jardin",
    name: "Jardin",
    tagline: "Botanique douce",
    description: "Vert sauge et crème, serif élégant, ouverture photo et texte sur enduit, vagues et courbes entre les sections, bénéfices en pictogrammes, récit animé et journal en grille.",
    bestFor: ["plantes", "cosmétique naturelle", "thé", "jardinage"],
    en: { tagline: "Soft botanicals", description: "Sage green and cream, an elegant serif, a photo-and-text opening on plaster, waves and curves between sections, benefits as pictograms, an animated story and a journal grid.", bestFor: ["plants", "natural beauty", "tea", "gardening"] },
    fonts: { heading: "playfair_display_n4", body: "karla_n4" },
    previewFonts: { heading: "Playfair Display", body: "Karla" },
    motion: "normal",
    photoMood: "terroir",
    look: look({ headerLayout: "logo-center", shape: "floating", icons: "circles", menu: "drawer", footer: "brand-left", ann: "rotate", card: "boxed", button: "solid", radius: { button: 30, card: 36 }, headingScale: 104, glow: 20, ds: "craft", density: "airy" }),
    palette: (k) => {
      const cream = "#F8F5EC";
      const sage = k.tint(k.mix(k.p.primary, "#7C9A7E", 0.55), 0.9, 0.5);
      const forest = k.mix(k.night(0.16, 0.5), "#1F3324", 0.6);
      return [k.scheme(cream, "#1E2A20", k.onLight(cream)), k.scheme(sage, "#1E2A20", k.onLight(sage)), k.scheme(forest, "#F1EFE4", k.onDark(forest), 0.07), k.scheme(k.tint(k.p.accent, 0.86, 0.6), "#1E2A20", "#1E2A20")];
    },
    home: (k) => [
      k.v2.hero("split", 1, "plaster"),
      k.statementRow(2, "reveal"),
      k.wave(2, 1),
      k.v2.benefits("icons", 1),
      k.lib("creative-divider", 3, { shape: "curve" }),
      k.iwt(3, "image-left", k.im.scene2 ?? k.im.scene1, "curtain"),
      k.lib("animated-story", 1, { reveal: "words", layout: "image-right" }),
      k.lib("featured-blog", 2, { layout: "grid" }),
      k.newsletter(1),
    ],
    services: (k) => [
      k.v2.hero("split", 1, "plaster"),
      k.wave(1, 2),
      k.R.servicesList(2, "cards", { withImages: true }),
      k.lib("creative-divider", 3, { shape: "curve" }),
      k.v2.benefits("icons", 1),
      k.R.method(3, "timeline"),
      k.lib("featured-blog", 2, { layout: "grid" }),
      k.R.testimonials(2),
      k.R.practical(1),
    ],
  },
  {
    id: "reception",
    name: "Réception",
    tagline: "Hôtellerie et accueil",
    description: "Ivoire et vert profond, serif fin en capitales espacées, boutons cadrés, ouverture jour / nuit plein écran, faits pratiques en bandeau, galerie média, promesse de la maison et calendrier de réservation.",
    bestFor: ["hôtel", "restaurant", "salle de réception", "spa"],
    en: { tagline: "Hospitality", description: "Ivory and deep green, a fine serif in spaced capitals, framed buttons, a full-screen day / night opening, practical facts in a strip, a media gallery, the house promise and a booking calendar.", bestFor: ["hotel", "restaurant", "event venue", "spa"] },
    fonts: { heading: "cormorant_n5", body: "jost_n4" },
    previewFonts: { heading: "Cormorant", body: "Jost" },
    motion: "subtle",
    photoMood: "joaillerie",
    look: look({ headerLayout: "two-rows", shape: "bar", menu: "drawer-right", footer: "boxed", ann: "rotate", card: "minimal", button: "frame", radius: { button: 0, card: 4 }, headingCase: "uppercase", tracking: 3, headingScale: 96, ds: "maison", spacing: 108 }),
    palette: (k) => {
      const ivory = "#FAF7F0";
      const green = k.mix(k.night(0.12, 0.5), "#16302A", 0.6);
      const gold = k.onDark(green);
      return [k.scheme(ivory, "#1C2420", k.onLight(ivory)), k.scheme("#F0EBDF", "#1C2420", k.onLight("#F0EBDF")), k.scheme(green, "#F3EFE6", gold, 0.07), k.scheme(k.mix(green, "#000000", 0.25), "#F3EFE6", gold, 0.07)];
    },
    home: (k) => [
      ...k.either(k.lib("day-night", 3, { height: "screen" }), k.lib("hero-flex", 3, { media_layout: "left", height: "large", align_y: "center", content_width: "normal", text_color: "light" }, { dropBlocks: ["rating", "logos"] })),
      k.v2.facts("strip", 2),
      k.v2.split("media-right", 1),
      k.lib("media-gallery", 1, { columns: "3", video_play: "visible" }),
      k.lib("brand-promise", 2, { layout: "image-left", badge_icon: "award" }),
      k.featured(1),
      k.v2.faq("center", 2),
      k.v2.cta("card", 3),
    ],
    services: (k) => [
      ...k.either(k.lib("day-night", 3, { height: "screen" }), k.lib("hero-flex", 3, { media_layout: "left", height: "large", align_y: "center", content_width: "normal", text_color: "light" }, { dropBlocks: ["rating", "logos"] })),
      k.v2.facts("strip", 2),
      k.lib("booking-calendar", 1, { kind: "room" }),
      k.lib("media-gallery", 1, { columns: "3", video_play: "visible" }),
      k.R.servicesList(2, "list"),
      k.R.testimonials(1),
      ...k.statementRow(3, "statement", true),
      k.R.practical(2),
    ],
  },
  {
    id: "cabinet",
    name: "Cabinet",
    tagline: "Expertise et confiance",
    description: "Bleu marine et ivoire, serif de presse, ouverture photo encadrée, offres en lignes numérotées, méthode empilée, fiche en colonnes, partenaires et recommandations de professionnels prêts à compléter.",
    bestFor: ["conseil", "avocats", "comptabilité", "B2B"],
    en: { tagline: "Expertise and trust", description: "Navy and ivory, a press serif, a framed photo opening, offers as numbered rows, a stacked method, a details sheet in columns, partners and professional endorsements ready to complete.", bestFor: ["consulting", "law firms", "accounting", "B2B"] },
    fonts: { heading: "libre_baskerville_n7", body: "dm_sans_n4" },
    previewFonts: { heading: "Libre Baskerville", body: "DM Sans" },
    motion: "subtle",
    photoMood: "galerie",
    look: look({ headerLayout: "menu-right", shape: "bar", menu: "drawer", footer: "columns", ann: "static", card: "boxed", button: "solid", radius: { button: 4, card: 6 }, headingScale: 96, ds: "precision", density: "balanced", pageWidth: 1240 }),
    palette: (k) => {
      const ivory = "#FBFAF7";
      const navy = k.mix(k.night(0.16, 0.6), "#14213D", 0.6);
      return [k.scheme(ivory, "#14213D", k.onLight(ivory)), k.scheme("#EEF1F6", "#14213D", k.onLight("#EEF1F6")), k.scheme(navy, "#F2F4F8", k.onDark(navy), 0.07), k.filled(k.onLight(ivory))];
    },
    home: (k) => [
      k.v2.hero("frame", 1),
      k.lib("logo-list", 2, { layout: "row" }),
      k.v2.index("rows", 1),
      k.lib("expert-endorsements", 2),
      k.v2.steps("stack", 1),
      k.v2.specs("columns", 2),
      k.lib("testimonials", 1),
      k.v2.faq("side", 2),
      k.v2.cta("split", 3),
    ],
    services: (k) => [
      k.v2.hero("frame", 1),
      k.lib("logo-list", 2, { layout: "row" }),
      k.v2.index("rows", 1),
      k.v2.steps("stack", 2),
      k.R.team(1, "cards", 3),
      k.lib("pricing", 2),
      k.lib("expert-endorsements", 1),
      k.v2.facts("grid", 2),
      k.v2.faq("side", 1),
      k.v2.cta("split", 3),
    ],
  },
  {
    id: "recre",
    name: "Récré",
    tagline: "Pastels et jeux",
    description: "Pastels acidulés, grotesque ronde très grasse, boutons pilule, scène flottante, vagues, cercles stories, stories vidéo, cartes de bénéfices, séparateur en zigzag et texte qui change de mot.",
    bestFor: ["enfants", "jouets", "animaux", "papeterie"],
    en: { tagline: "Pastels and play", description: "Candy pastels, a very bold rounded grotesque, pill buttons, a floating scene, waves, story circles, video stories, benefit cards, a zigzag divider and text that swaps words.", bestFor: ["kids", "toys", "pets", "stationery"] },
    fonts: { heading: "karla_n7", body: "karla_n4" },
    previewFonts: { heading: "Karla", body: "Karla" },
    motion: "expressive",
    photoMood: "pop",
    look: look({ headerLayout: "menu-right", shape: "pill", icons: "circles", menu: "cards", footer: "brand-left", ann: "marquee", card: "boxed", button: "solid", radius: { button: 40, card: 32 }, headingScale: 110, tracking: -3, glow: 45, shine: true , ds: "product"}),
    palette: (k) => {
      const a = k.tint(k.p.secondary, 0.93, 1.2);
      const b = k.tint(k.p.accent, 0.9, 1.3);
      const ink = k.night(0.16, 0.8);
      return [k.scheme("#FFFBF4", ink, k.onLight("#FFFBF4")), k.scheme(a, ink, k.onLight(a)), k.scheme(k.tint(k.p.primary, 0.3, 1.2), "#FFFFFF", k.onDark(k.tint(k.p.primary, 0.3, 1.2))), k.scheme(b, ink, k.onLight(b))];
    },
    home: (k) => [
      k.lib("floating-scene", 2, { layout: "split", decor: "minimal" }),
      k.wave(2, 1),
      ...k.circles(1),
      ...k.either(k.lib("video-stories", 1, { size: "medium" }), k.mosaicSec(1, "even")),
      k.feat(1, "cards"),
      k.lib("creative-divider", 4, { shape: "zigzag" }),
      k.lib("animated-text", 4, { style: "words", size: "l", align: "center" }),
      k.faqSec(1, 5, "cards"),
      k.wave(1, 2),
      k.newsletter(2),
    ],
    services: (k) => [
      k.lib("floating-scene", 2, { layout: "split", decor: "minimal" }),
      k.wave(2, 1),
      k.R.servicesList(1, "cards", { withImages: true }),
      k.lib("animated-text", 4, { style: "words", size: "l", align: "center" }),
      k.R.method(1, "howto-h"),
      k.R.testimonials(2),
      k.lib("booking-calendar", 1, { kind: "appointment" }),
      k.faqSec(1, 5, "cards"),
    ],
  },
  {
    id: "epure",
    name: "Épure",
    tagline: "Minimalisme nordique",
    description: "Blanc cassé et gris doux, grotesque légère, beaucoup d'air, ouverture plein cadre au texte centré, phrase sobre, image et texte qui montent, mosaïque bento, fiche simple et boutons soulignés.",
    bestFor: ["mobilier", "céramique", "objets", "papeterie haut de gamme"],
    en: { tagline: "Nordic minimalism", description: "Off-white and soft gray, a light grotesque, lots of air, a full-frame opening with centered text, a sober statement, image and text rising in, a bento mosaic, a simple sheet and underlined buttons.", bestFor: ["furniture", "ceramics", "objects", "fine stationery"] },
    fonts: { heading: "archivo_n4", body: "inter_n4" },
    previewFonts: { heading: "Archivo", body: "Inter" },
    motion: "subtle",
    photoMood: "galerie",
    look: look({ headerLayout: "minimal", shape: "bar", menu: "drawer-right", footer: "minimal", ann: "static", card: "minimal", button: "underline", radius: { button: 0, card: 0 }, headingScale: 92, tracking: -2, pageWidth: 1200, spacing: 120, density: "airy" , ds: "craft"}),
    palette: (k) => {
      const bg = "#F6F5F3";
      const ink = "#2A2A28";
      return [k.scheme(bg, ink, k.onLight(bg)), k.scheme("#ECEAE6", ink, ink), k.scheme("#2A2A28", bg, bg, 0.06), k.scheme("#FFFFFF", ink, k.onLight("#FFFFFF"))];
    },
    home: (k) => [
      k.lib("hero-flex", 1, { media_layout: "background", height: "screen", align_x: "center", align_y: "center", content_width: "narrow", text_color: "light" }, { dropBlocks: ["rating", "logos", "badge", "features", "checklist"] }),
      k.statementRow(1, "plain"),
      k.iwt(2, "image-left", k.im.detail1 ?? k.im.scene1, "up"),
      k.v2.media("bento", 1),
      k.specList(2),
      k.v2.split("media-right", 1),
      k.newsletter(2),
    ],
    services: (k) => [
      k.lib("hero-flex", 1, { media_layout: "background", height: "screen", align_x: "center", align_y: "center", content_width: "narrow", text_color: "light" }, { dropBlocks: ["rating", "logos", "badge", "features", "checklist"] }),
      k.statementRow(1, "plain"),
      k.R.servicesList(2, "list"),
      k.v2.media("bento", 1),
      k.R.method(2, "timeline"),
      k.R.practical(1, false),
      k.R.contactForm(2),
    ],
  },
  {
    id: "tribu",
    name: "Tribu",
    tagline: "Communauté et vidéos clients",
    description: "Fond lumineux et couleur vive, grotesque grasse, ouverture immersive lumineuse, mur d'images, vidéos verticales, cercles stories, cartes empilées, bandeau défilant ; avis immersifs et galerie sociale prêts à compléter.",
    bestFor: ["marques communautaires", "sport", "beauté", "mode"],
    en: { tagline: "Community and customer videos", description: "A bright background and a vivid color, a bold grotesque, a glowing immersive opening, an image wall, vertical videos, story circles, stacking cards, a scrolling banner; immersive reviews and a social gallery ready to complete.", bestFor: ["community brands", "sport", "beauty", "fashion"] },
    fonts: { heading: "space_grotesk_n7", body: "karla_n4" },
    previewFonts: { heading: "Space Grotesk", body: "Karla" },
    motion: "expressive",
    photoMood: "pop",
    look: look({ headerLayout: "logo-left", shape: "pill", menu: "sheet", footer: "stacked", ann: "marquee", card: "overlay", button: "solid", radius: { button: 40, card: 20 }, headingScale: 106, tracking: -3, glow: 60, shine: true , ds: "product"}),
    palette: (k) => {
      const bg = "#FFFFFF";
      const pop = k.tint(k.p.accent, 0.94, 1.1);
      const ink = "#101010";
      return [k.scheme(bg, ink, k.onLight(bg)), k.scheme(pop, ink, k.onLight(pop)), k.scheme(ink, "#FFFFFF", k.onDark(ink), 0.07), k.filled(k.p.accent)];
    },
    home: (k) => [
      k.v2.hero("immersive", 1, "glow"),
      k.marq(4, "large"),
      k.lib("customer-wall", 2, { rhythm: "natural", captions: "hover" }),
      ...k.reels(1),
      k.lib("immersive-reviews", 3, { height: "medium" }),
      k.lib("social-gallery", 1, { network: "tiktok", ratio: "story", columns: "5", columns_mobile: "2" }),
      ...k.circles(2),
      ...k.stackCards(1),
      k.lib("newsletter-media", 4, { layout: "left", legal: k.privacy }),
    ],
    services: (k) => [
      k.v2.hero("immersive", 1, "glow"),
      k.marq(4, "large"),
      k.R.servicesList(1, "cards"),
      k.lib("customer-wall", 2, { rhythm: "natural", captions: "hover" }),
      k.lib("immersive-reviews", 3, { height: "medium" }),
      k.R.booking(1),
      k.R.practical(2),
      k.v2.cta("band", 4),
    ],
  },
  {
    id: "etabli",
    name: "Établi",
    tagline: "Atelier et savoir-faire",
    description: "Kraft, charbon et une couleur d'outil, titres en capitales sur texte serif, cadres nets, boutons à contour, double bannière d'atelier en ouverture, repères en pictogrammes, offres en cartes, mode d'emploi, chronologie et récit du savoir-faire.",
    bestFor: ["artisanat", "outillage", "maroquinerie", "ébénisterie"],
    en: { tagline: "Workshop and craft", description: "Kraft, charcoal and a tool color, capital headings over serif text, sharp frames, outlined buttons, a workshop double banner as the opening, pictogram cues, offer cards, how-to, a timeline and the story of the craft.", bestFor: ["crafts", "tools", "leather goods", "woodwork"] },
    fonts: { heading: "archivo_n6", body: "lora_n4" },
    previewFonts: { heading: "Archivo", body: "Lora" },
    motion: "normal",
    photoMood: "terroir",
    look: look({ headerLayout: "nav-left", shape: "boxed", menu: "drawer", footer: "boxed", ann: "static", card: "boxed", button: "outline", radius: { button: 2, card: 4 }, headingCase: "uppercase", tracking: 1, headingScale: 100, ds: "craft" }),
    palette: (k) => {
      const kraft = k.tint(k.mix(k.p.secondary, "#C8A97E", 0.5), 0.9, 0.45);
      const charcoal = "#1D1C1A";
      return [k.scheme("#F5F0E6", charcoal, k.onLight("#F5F0E6")), k.scheme(kraft, charcoal, k.onLight(kraft)), k.scheme(charcoal, "#F2ECE0", k.onDark(charcoal), 0.07), k.filled(k.onLight("#F5F0E6"))];
    },
    home: (k) => [
      k.lib("double-banner", 1, { layout: "wide-right", ratio: "tall", text_position: "below" }),
      k.v2.band("icons", 2),
      k.v2.index("cards", 1),
      k.lib("how-to", 2, { layout: "vertical", media_ratio: "square" }),
      ...k.timelineSec(1),
      k.story(2),
      k.v2.split("media-left", 1),
      k.faqSec(2, 5, "cards"),
      k.v2.cta("split", 3),
    ],
    services: (k) => [
      k.lib("double-banner", 1, { layout: "wide-right", ratio: "tall", text_position: "below" }),
      k.R.trust(2),
      k.v2.index("cards", 1),
      ...k.R.portfolio(2, "grid"),
      k.R.method(1, "timeline"),
      k.R.team(2, "plain", 2),
      k.R.practical(1),
      k.v2.cta("split", 3),
    ],
  },
  {
    id: "velours",
    name: "Velours",
    tagline: "Luxe sombre et feutré",
    description: "Prune profonde et or doux, serif lumineux, boutons à contour arrondis, diaporama en fondu plein écran, texte en dégradé, produit vedette, galerie média, citation et image superposée.",
    bestFor: ["parfum", "bijoux", "spiritueux", "lingerie"],
    en: { tagline: "Dark velvet luxury", description: "Deep plum and soft gold, a luminous serif, rounded outlined buttons, a full-screen fading slideshow, gradient text, a featured product, a media gallery, a quote and an overlapping image.", bestFor: ["fragrance", "jewelry", "spirits", "lingerie"] },
    fonts: { heading: "playfair_display_n6", body: "montserrat_n4" },
    previewFonts: { heading: "Playfair Display", body: "Montserrat" },
    motion: "normal",
    photoMood: "joaillerie",
    look: look({ headerLayout: "logo-center", shape: "floating", icons: "circles", menu: "fullscreen", footer: "centered", ann: "rotate", card: "minimal", button: "outline", radius: { button: 40, card: 24 }, headingScale: 104, glow: 40, shine: true, dark: true, ds: "maison" }),
    palette: (k) => {
      const plum = k.mix(k.night(0.09, 0.6), "#2A0F1E", 0.6);
      const gold = k.onDark(plum);
      return [k.scheme(plum, "#F4ECE6", gold, 0.06), k.scheme(k.mix(plum, "#FFFFFF", 0.05), "#F4ECE6", k.onDark(k.mix(plum, "#FFFFFF", 0.05)), 0.06), k.scheme("#F4ECE6", "#2A0F1E", k.onLight("#F4ECE6")), k.scheme(k.mix(plum, "#000000", 0.35), "#F4ECE6", gold, 0.06)];
    },
    home: (k) => [
      k.lib("slideshow", 1, { height: "screen", transition: "fade", pagination: "numbers", text_color: "light" }),
      k.lib("animated-text", 2, { style: "gradient", size: "l", align: "center" }),
      k.featured(1),
      k.lib("media-gallery", 2, { columns: "4", video_play: "hover" }),
      k.statementRow(4, "quote"),
      k.lib("brand-promise", 1, { layout: "image-left", badge_icon: "sparkle" }),
      k.iwt(2, "overlap", k.im.scene2 ?? k.im.scene1, "zoom"),
      k.newsletter(3),
    ],
    services: (k) => [
      k.lib("slideshow", 1, { height: "screen", transition: "fade", pagination: "numbers", text_color: "light" }),
      k.lib("animated-text", 2, { style: "gradient", size: "l", align: "center" }),
      k.R.servicesList(1, "cards", { withImages: true }),
      ...k.R.portfolio(2, "editorial"),
      k.statementRow(4, "quote"),
      k.R.testimonials(1),
      k.R.booking(2),
      k.R.practical(1),
    ],
  },
  {
    id: "lancement",
    name: "Lancement",
    tagline: "Sortie de produit",
    description: "Noir et une couleur de lancement, capitales géantes, affiche plein écran en ouverture, bandeau défilant inversé, chiffres, bénéfices illustrés, produit à 360°, produit vedette ; compte à rebours et offre de lancement prêts à activer.",
    bestFor: ["nouveaux produits", "précommandes", "drops", "financement participatif"],
    en: { tagline: "Product launch", description: "Black and a launch color, giant capitals, a full-screen poster as the opening, a reversed scrolling banner, figures, illustrated benefits, a 360° product, a featured product; countdown and launch offer ready to switch on.", bestFor: ["new products", "pre-orders", "drops", "crowdfunding"] },
    fonts: { heading: "montserrat_n7", body: "dm_sans_n4" },
    previewFonts: { heading: "Montserrat", body: "DM Sans" },
    motion: "expressive",
    photoMood: "brut",
    look: look({ headerLayout: "logo-left", shape: "boxed", menu: "fullscreen", footer: "wordmark", ann: "marquee", card: "overlay", button: "solid", radius: { button: 0, card: 8 }, headingCase: "uppercase", tracking: -2, headingScale: 114, glow: 70, dark: true, ds: "product", buttonUppercase: true }),
    palette: (k) => {
      const bg = "#08080A";
      const acc = k.onDark(bg);
      return [k.scheme(bg, "#FAFAFA", acc, 0.06), k.scheme("#121216", "#FAFAFA", k.onDark("#121216"), 0.06), k.filled(acc), k.scheme("#FAFAFA", "#08080A", k.onLight("#FAFAFA"))];
    },
    home: (k) => [
      ...k.either(k.v2.banner("overlay", 1, true), k.heroFull(1, "bottom-center", "heading")),
      k.lib("countdown", 3, { style: "minimal", on_end: "hide" }),
      k.marq(3, "huge", true),
      ...k.stats(2),
      k.v2.benefits("images", 1),
      k.lib("product-360", 1, { layout: "split" }),
      k.featured(2),
      k.lib("featured-offer", 4, { style: "plain" }),
      k.faqSec(2, 5, "cards"),
      k.lib("newsletter-media", 3, { layout: "left", legal: k.privacy }),
    ],
    services: (k) => [
      ...k.either(k.v2.banner("overlay", 1, true), k.heroFull(1, "bottom-center", "heading")),
      k.marq(3, "huge", true),
      k.v2.index("cards", 1),
      k.lib("countdown", 3, { style: "minimal", on_end: "hide" }),
      k.v2.steps("line", 2),
      k.R.booking(1),
      k.R.practical(2),
    ],
  },
];

// Thèmes de référence de l'issue #137 (reference-themes.ts) : mêmes contrats, rangés après les 19 du catalogue.
CATALOG_THEMES.push(...(REFERENCE_CATALOG as typeof CATALOG_THEMES));

export const catalogTheme = (id: string): CatalogTheme | undefined => CATALOG_THEMES.find((x) => x.id === id);
