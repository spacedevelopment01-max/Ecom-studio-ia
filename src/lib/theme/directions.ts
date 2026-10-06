/**
 * Directions artistiques : chaque direction compose la boutique avec ses
 * propres sections, son rythme, ses typographies et ses animations. L'IA
 * peut partir d'une direction puis la personnaliser librement ; ce module
 * fournit aussi le point de départ du moteur local.
 */
import { contrast, ensureContrast, isDark, mix, onColor, withLightness, hsl } from "../color";
import type { ShopCopy } from "./copy";
import { pick, type Lang } from "../i18n";
import type { BlockInstance, GroupJson, SectionInstance, StoreCollection, StoreProduct, TemplateJson, ThemeSpec } from "./spec";
import type { ServiceProfile } from "../project-types";
import { servicesPlan } from "./services-site";
import { tidyComposition } from "./tidy";

export type DirectionId = "atelier" | "clinique" | "brut" | "terroir" | "nocturne" | "pop" | "galerie" | "elan" | "flux" | "joaillerie" | "gourmand";

export type Direction = {
  id: DirectionId;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  fonts: { heading: string; body: string };
  previewFonts: { heading: string; body: string };
  motion: "subtle" | "normal" | "expressive";
};

export const DIRECTIONS: Direction[] = [
  {
    id: "atelier",
    name: "Atelier",
    tagline: "Luxe éditorial",
    description: "Ivoire lumineux, grand serif contrasté et mots en italique dorée, produit détouré qui flotte, cartes en verre laiteux et reflets sur les boutons. Pour les objets qui se regardent de près.",
    bestFor: ["beauté", "parfum", "bijoux", "maison haut de gamme"],
    fonts: { heading: "playfair_display_n6", body: "inter_n4" },
    previewFonts: { heading: "Playfair Display", body: "Inter" },
    motion: "expressive",
  },
  {
    id: "clinique",
    name: "Clinique",
    tagline: "Clarté des grandes marques tech",
    description: "Blanc pur et gris perle, typographie serrée très grasse, produit présenté en grand, chiffres clés animés et sections qui s'allument au défilement. Pour rassurer par la précision.",
    bestFor: ["soin", "bien-être", "high-tech", "bébé"],
    fonts: { heading: "inter_n7", body: "inter_n4" },
    previewFonts: { heading: "Inter", body: "Inter" },
    motion: "expressive",
  },
  {
    id: "brut",
    name: "Brut",
    tagline: "Sombre et massif",
    description: "Fond noir profond, capitales géantes, bandeau défilant ajouré, contours néon francs et cartes lumineuses. Pour les marques qui assument.",
    bestFor: ["streetwear", "accessoires", "gadgets", "boissons"],
    fonts: { heading: "archivo_n8", body: "inter_n4" },
    previewFonts: { heading: "Archivo", body: "Inter" },
    motion: "expressive",
  },
  {
    id: "terroir",
    name: "Terroir",
    tagline: "Chaleur moderne",
    description: "Crème et tons de terre, serif généreux, grandes rondeurs, grain discret et récit qui se déroule au défilement. Pour le fait-main et l'origine, sans nostalgie.",
    bestFor: ["épicerie fine", "artisanat", "bougies", "céramique"],
    fonts: { heading: "lora_n6", body: "work_sans_n4" },
    previewFonts: { heading: "Lora", body: "Work Sans" },
    motion: "normal",
  },
  {
    id: "nocturne",
    name: "Nocturne",
    tagline: "Nuit profonde et lueurs",
    description: "Bleu nuit, en-tête de verre flottant, héros photo plein écran, titres serif lumineux, cartes numérotées à contour néon, boutons pilule à reflet et boutons flottants.",
    bestFor: ["services premium", "high-tech", "piscine & jardin", "parfum"],
    fonts: { heading: "lora_n6", body: "inter_n4" },
    previewFonts: { heading: "Lora", body: "Inter" },
    motion: "expressive",
  },
  {
    id: "pop",
    name: "Pop",
    tagline: "Vif et rebondi",
    description: "Couleurs franches, dégradés, très grandes rondeurs, cartes légèrement inclinées et animations rebondies. Pour les marques joyeuses et directes.",
    bestFor: ["enfants", "animaux", "snacking", "papeterie"],
    fonts: { heading: "montserrat_n8", body: "karla_n4" },
    previewFonts: { heading: "Montserrat", body: "Karla" },
    motion: "expressive",
  },
  {
    id: "galerie",
    name: "Galerie",
    tagline: "Silence d'exposition",
    description: "Blanc d'exposition, serif fin, mosaïque éditoriale, cartels en italique et défilement horizontal. Le luxe par la retenue.",
    bestFor: ["décoration", "art", "mobilier", "mode"],
    fonts: { heading: "libre_baskerville_n4", body: "inter_n4" },
    previewFonts: { heading: "Libre Baskerville", body: "Inter" },
    motion: "normal",
  },
  {
    id: "elan",
    name: "Élan",
    tagline: "Énergie sportive",
    description: "Anthracite et néon vif, italiques rapides, boutons obliques, bandeau incliné, chiffres qui défilent et vidéo d'ouverture. Pour le sport, l'outdoor et la performance.",
    bestFor: ["sport", "outdoor", "gourdes", "nutrition"],
    fonts: { heading: "montserrat_n8", body: "inter_n4" },
    previewFonts: { heading: "Montserrat", body: "Inter" },
    motion: "expressive",
  },
  {
    id: "flux",
    name: "Flux",
    tagline: "Sportswear premium",
    description: "Noir et blanc, grotesque très grasse, en-tête encadré, boutons cadrés, cercles façon stories, cartes qui s'empilent, texte en courbe, vidéos verticales et frise d'étapes qui s'allume.",
    bestFor: ["mode", "sport", "streetwear", "accessoires"],
    fonts: { heading: "space_grotesk_n7", body: "space_grotesk_n4" },
    previewFonts: { heading: "Space Grotesk", body: "Space Grotesk" },
    motion: "expressive",
  },
  {
    id: "joaillerie",
    name: "Joaillerie",
    tagline: "Luxe intime",
    description: "Portrait plein écran, capitales espacées et mot d'accent en italique, cercles de collections, vidéos portées, gris perle et noir profond. Pour les bijoux et les accessoires précieux.",
    bestFor: ["bijoux", "montres", "accessoires", "beauté"],
    fonts: { heading: "montserrat_n6", body: "inter_n4" },
    previewFonts: { heading: "Montserrat", body: "Inter" },
    motion: "normal",
  },
  {
    id: "gourmand",
    name: "Gourmand",
    tagline: "Joyeux et généreux",
    description: "Crème et vert profond, serif très gras, boutons pilule colorés, vagues entre les sections, confettis, pastilles « sticker » et grande citation centrée. Pour les boissons, l'épicerie et le snacking.",
    bestFor: ["boissons", "épicerie", "snacking", "enfants"],
    fonts: { heading: "libre_baskerville_n7", body: "work_sans_n4" },
    previewFonts: { heading: "Libre Baskerville", body: "Work Sans" },
    motion: "expressive",
  },
];

/** Présentation des directions en anglais (le français est dans DIRECTIONS). */
export const DIRECTIONS_EN: Record<DirectionId, { tagline: string; description: string; bestFor: string[] }> = {
  atelier: { tagline: "Editorial luxury", description: "Luminous ivory, a large high-contrast serif with words in golden italics, a floating cut-out product, frosted-glass cards and shine on the buttons. For objects meant to be admired up close.", bestFor: ["beauty", "fragrance", "jewelry", "luxury home"] },
  clinique: { tagline: "Big-tech clarity", description: "Pure white and pearl gray, tight extra-bold type, the product shown large, animated key figures and sections that light up as you scroll. Reassurance through precision.", bestFor: ["skincare", "wellness", "tech", "baby"] },
  brut: { tagline: "Dark and bold", description: "Deep black background, giant capitals, an outlined scrolling banner, sharp neon outlines and glowing cards. For brands that own it.", bestFor: ["streetwear", "accessories", "gadgets", "drinks"] },
  terroir: { tagline: "Modern warmth", description: "Cream and earth tones, a generous serif, big rounded corners, subtle grain and a story that unfolds as you scroll. For handmade goods and provenance, without nostalgia.", bestFor: ["fine foods", "crafts", "candles", "ceramics"] },
  nocturne: { tagline: "Deep night and glow", description: "Midnight blue, a floating glass header, a full-screen photo hero, luminous serif headings, numbered cards with neon outlines, glossy pill buttons and floating buttons.", bestFor: ["premium services", "tech", "pool & garden", "fragrance"] },
  pop: { tagline: "Bright and bouncy", description: "Bold colors, gradients, extra-round corners, slightly tilted cards and bouncy animations. For cheerful, straightforward brands.", bestFor: ["kids", "pets", "snacks", "stationery"] },
  galerie: { tagline: "Gallery quiet", description: "Gallery white, a fine serif, an editorial mosaic, italic captions and horizontal scrolling. Luxury through restraint.", bestFor: ["home decor", "art", "furniture", "fashion"] },
  elan: { tagline: "Athletic energy", description: "Charcoal and bright neon, fast italics, slanted buttons, a tilted banner, counting figures and an opening video. For sport, outdoor and performance.", bestFor: ["sport", "outdoor", "water bottles", "nutrition"] },
  flux: { tagline: "Premium sportswear", description: "Black and white, an extra-bold grotesque, a framed header, boxed buttons, story-style circles, stacking cards, curved text, vertical videos and a step timeline that lights up.", bestFor: ["fashion", "sport", "streetwear", "accessories"] },
  joaillerie: { tagline: "Intimate luxury", description: "Full-screen portrait, spaced capitals with an italic accent word, collection circles, worn-product videos, pearl gray and deep black. For jewelry and precious accessories.", bestFor: ["jewelry", "watches", "accessories", "beauty"] },
  gourmand: { tagline: "Joyful and generous", description: "Cream and deep green, an extra-bold serif, colorful pill buttons, waves between sections, confetti, \"sticker\" badges and a big centered quote. For drinks, groceries and snacks.", bestFor: ["drinks", "groceries", "snacks", "kids"] },
};

/** Police d'accent (italique) commune : utilisée pour les mots mis en valeur. */
export const ACCENT_FONT = "cormorant_i5";

/** Directions sombres par défaut : utile à l'IA et à l'aperçu. */
export const DARK_DIRECTIONS: DirectionId[] = ["brut", "nocturne", "elan"];

export const directionById = (id: string) => DIRECTIONS.find((d) => d.id === id) ?? DIRECTIONS[0];

// ---------------------------------------------------------------- palettes

export type BrandPalette = { primary: string; secondary: string; accent: string; light: string; dark: string };

type Scheme = { background: string; surface: string; text: string; muted: string; accent: string; accent_text: string; border: string };

function scheme(bg: string, text: string, accent: string, surfaceT = 0.045): Scheme {
  const t = ensureContrast(text, bg, 7);
  const acc = contrast(accent, bg) >= 3 ? accent : ensureContrast(accent, bg, 3);
  return {
    background: bg,
    surface: mix(bg, t, surfaceT),
    text: t,
    muted: ensureContrast(mix(t, bg, 0.42), bg, 4.5),
    accent: acc,
    accent_text: onColor(acc),
    border: mix(bg, t, 0.14),
  };
}

export function colorSchemes(direction: DirectionId, p: BrandPalette): Record<string, { settings: Scheme }> {
  const warmLight = withLightness(p.light, Math.max(0.93, hsl(p.light)[2]), 0.6);
  const deep = isDark(p.dark) ? p.dark : withLightness(p.dark, 0.12);
  let s1: Scheme, s2: Scheme, s3: Scheme, s4: Scheme;
  switch (direction) {
    case "nocturne": {
      const bg = withLightness(deep, 0.075, 0.9);
      const acc = withLightness(p.accent, 0.64, 1.15);
      s1 = scheme(bg, "#EEF3F8", acc, 0.06);
      s2 = scheme(withLightness(deep, 0.11, 0.9), "#EEF3F8", acc, 0.06);
      s3 = scheme(withLightness(deep, 0.05, 0.9), "#EEF3F8", acc, 0.06);
      s4 = scheme(acc, "#06121A", "#06121A");
      break;
    }
    case "brut": {
      const acc = withLightness(p.accent, 0.62, 1.4);
      s1 = scheme("#0A0A0B", "#F5F5F2", acc, 0.06);
      s2 = scheme("#141416", "#F5F5F2", acc, 0.06);
      s3 = scheme("#F2F2EE", "#0A0A0B", "#0A0A0B");
      s4 = scheme(acc, "#0A0A0B", "#0A0A0B");
      break;
    }
    case "elan": {
      const acc = withLightness(p.accent, 0.58, 1.4);
      s1 = scheme(withLightness(deep, 0.085, 0.35), "#F4F6F6", acc, 0.06);
      s2 = scheme(withLightness(deep, 0.12, 0.35), "#F4F6F6", acc, 0.06);
      s3 = scheme(withLightness(deep, 0.05, 0.35), "#F4F6F6", acc, 0.06);
      s4 = scheme(acc, onColor(acc), onColor(acc));
      break;
    }
    case "flux": {
      const acc = withLightness(p.accent, 0.5, 1.5);
      s1 = scheme("#FFFFFF", "#0D0D0D", acc);
      s2 = scheme("#F2F2F2", "#0D0D0D", acc);
      s3 = scheme("#0D0D0D", "#FFFFFF", withLightness(p.accent, 0.6, 1.5), 0.07);
      s4 = scheme(acc, onColor(acc), onColor(acc));
      break;
    }
    case "joaillerie": {
      const acc = withLightness(p.primary, 0.4, 0.9);
      s1 = scheme("#FFFFFF", "#262626", acc);
      s2 = scheme("#F3F2F0", "#262626", acc);
      s3 = scheme("#1A1A1C", "#F5F4F2", withLightness(p.accent, 0.75, 0.8), 0.07);
      s4 = scheme("#333333", "#FFFFFF", "#FFFFFF", 0.07);
      break;
    }
    case "gourmand": {
      const green = withLightness(p.primary, 0.3, 0.9);
      s1 = scheme("#FBF5EC", withLightness(p.primary, 0.17, 0.8), withLightness(p.primary, 0.2, 0.8));
      s2 = scheme(withLightness(p.secondary, 0.86, 1.1), withLightness(p.primary, 0.17, 0.8), withLightness(p.primary, 0.2, 0.8));
      s3 = scheme(green, "#FBF5EC", "#FFF27A", 0.07);
      s4 = scheme(withLightness(p.accent, 0.82, 1.1), withLightness(p.primary, 0.17, 0.8), withLightness(p.primary, 0.2, 0.8));
      break;
    }
    case "pop": {
      s1 = scheme(withLightness(p.light, 0.975, 0.8), withLightness(deep, 0.14), withLightness(p.primary, 0.5, 1.3));
      s2 = scheme(withLightness(p.secondary, 0.91, 1.2), withLightness(deep, 0.14), withLightness(p.primary, 0.45, 1.3));
      s3 = scheme(withLightness(p.primary, 0.22, 1.1), "#FFFFFF", withLightness(p.accent, 0.68, 1.3));
      s4 = scheme(withLightness(p.accent, 0.62, 1.3), "#111111", "#111111");
      break;
    }
    case "galerie": {
      s1 = scheme("#FFFFFF", "#141414", withLightness(p.primary, 0.32, 0.8));
      s2 = scheme("#F6F5F2", "#141414", withLightness(p.primary, 0.32, 0.8));
      s3 = scheme("#141414", "#F4F3EF", "#F4F3EF");
      s4 = scheme(withLightness(p.primary, 0.9, 0.4), "#141414", "#141414");
      break;
    }
    case "clinique": {
      const acc = withLightness(p.primary, 0.45, 1.2);
      s1 = scheme("#FFFFFF", "#1D1D1F", acc);
      s2 = scheme("#F5F5F7", "#1D1D1F", acc);
      s3 = scheme("#0B0B0D", "#F5F5F7", withLightness(p.primary, 0.66, 1.2), 0.07);
      s4 = scheme(acc, "#FFFFFF", "#FFFFFF");
      break;
    }
    case "terroir": {
      s1 = scheme(withLightness(p.light, 0.955, 0.9), withLightness(deep, 0.15, 0.9), withLightness(p.primary, 0.4, 1.1));
      s2 = scheme(withLightness(p.secondary, 0.9, 0.8), withLightness(deep, 0.15, 0.9), withLightness(p.primary, 0.36, 1.1));
      s3 = scheme(withLightness(p.primary, 0.14, 0.7), withLightness(p.light, 0.94, 0.8), withLightness(p.accent, 0.7, 1.1));
      s4 = scheme(withLightness(p.accent, 0.56, 1.1), "#1A140F", "#1A140F");
      break;
    }
    default: {
      // atelier
      s1 = scheme(warmLight, withLightness(deep, 0.12, 0.7), withLightness(p.primary, 0.36, 1));
      s2 = scheme(mix(warmLight, p.secondary, 0.2), withLightness(deep, 0.12, 0.7), withLightness(p.primary, 0.34, 1));
      s3 = scheme(withLightness(deep, 0.09, 0.6), withLightness(p.light, 0.95, 0.5), withLightness(p.accent, 0.74, 0.9), 0.06);
      s4 = scheme(withLightness(p.accent, 0.82, 0.7), withLightness(deep, 0.12, 0.7), withLightness(deep, 0.12, 0.7));
    }
  }
  return { "scheme-1": { settings: s1 }, "scheme-2": { settings: s2 }, "scheme-3": { settings: s3 }, "scheme-4": { settings: s4 } };
}

// ---------------------------------------------------------------- construction

class Ids {
  private n = new Map<string, number>();
  next(type: string) {
    const k = type.replace(/[^a-z0-9]/gi, "_");
    const v = (this.n.get(k) ?? 0) + 1;
    this.n.set(k, v);
    return `${k}_${v}`;
  }
}

function blocksOf(ids: Ids, list: { type: string; settings: Record<string, unknown> }[]) {
  const blocks: Record<string, BlockInstance> = {};
  const order: string[] = [];
  for (const b of list) {
    const bid = ids.next(b.type);
    blocks[bid] = { type: b.type, settings: b.settings };
    order.push(bid);
  }
  return { blocks, block_order: order };
}

function tpl(ids: Ids, sections: [string, Record<string, unknown>, { type: string; settings: Record<string, unknown> }[]?][]): TemplateJson {
  const out: TemplateJson = { sections: {}, order: [] };
  for (const [type, settings, blocks] of sections) {
    const sid = ids.next(type);
    const s: SectionInstance = { type, settings };
    if (blocks?.length) Object.assign(s, blocksOf(ids, blocks));
    out.sections[sid] = s;
    out.order.push(sid);
  }
  return out;
}

export type ImageSlots = {
  /** Photo du produit en situation, dans la vie de tous les jours (fournie par le marchand) : ouvre la boutique. */
  lifestyle?: string;
  lifestyle2?: string;
  hero?: string; // image large, scène ou bannière
  cutout?: string; // produit détouré (PNG)
  packshot?: string;
  detail1?: string;
  detail2?: string;
  scene1?: string;
  scene2?: string;
  scene3?: string;
  banner?: string;
  video?: string; // MP4
  videoPoster?: string;
  reels?: { video: string; poster?: string }[]; // vidéos verticales 9:16
  logo?: string;
  logoLight?: string; // version claire du logo, pour les fonds sombres
  favicon?: string;
};

export type BuildInput = {
  direction: DirectionId;
  shopName: string;
  palette: BrandPalette;
  fonts?: { heading?: string; body?: string };
  copy: ShopCopy;
  images: ImageSlots;
  files: Record<string, string>;
  product: StoreProduct;
  social?: Partial<Record<"instagram" | "tiktok" | "facebook" | "youtube" | "pinterest", string>>;
  /** Boutique multi-produit ou niche : autres produits et collections. */
  storeType?: "mono" | "multi" | "niche";
  products?: StoreProduct[];
  collections?: StoreCollection[];
  /** Langue de la boutique (textes ajoutés par la composition). Défaut : français. */
  language?: Lang;
  /**
   * Site d'une entreprise de services : prestations, méthode, réalisations, équipe, infos pratiques et
   * prise de contact ; aucun panier, fiche produit ni livraison visibles.
   */
  business?: "products" | "services";
  services?: ServiceProfile;
  /** Conditions de prestation (HTML, espaces réservés honnêtes) pour la page « Conditions générales » d'un site de services. */
  servicesTermsHtml?: string;
};

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const p = (html: string) => (/^\s*</.test(html) ? html : `<p>${html}</p>`);

/** Combinaisons d'en-tête, pied de page, bandeau et cartes : chaque direction montre une autre possibilité. */
const CHROME: Record<DirectionId, { shape: string; icons: string; menu: string; footer: string; ann: string; card: string }> = {
  atelier: { shape: "floating", icons: "circles", menu: "fullscreen", footer: "wordmark", ann: "rotate", card: "minimal" },
  clinique: { shape: "pill", icons: "plain", menu: "drawer", footer: "columns", ann: "static", card: "boxed" },
  brut: { shape: "bar", icons: "plain", menu: "fullscreen", footer: "wordmark", ann: "marquee", card: "overlay" },
  terroir: { shape: "floating", icons: "circles", menu: "drawer", footer: "card", ann: "rotate", card: "boxed" },
  nocturne: { shape: "floating", icons: "circles", menu: "drawer", footer: "columns", ann: "marquee", card: "overlay" },
  pop: { shape: "pill", icons: "circles", menu: "fullscreen", footer: "card", ann: "marquee", card: "boxed" },
  galerie: { shape: "bar", icons: "plain", menu: "drawer", footer: "minimal", ann: "static", card: "minimal" },
  elan: { shape: "bar", icons: "plain", menu: "fullscreen", footer: "wordmark", ann: "marquee", card: "overlay" },
  flux: { shape: "boxed", icons: "plain", menu: "fullscreen", footer: "centered", ann: "static", card: "minimal" },
  joaillerie: { shape: "boxed", icons: "plain", menu: "drawer", footer: "centered", ann: "rotate", card: "minimal" },
  gourmand: { shape: "bar", icons: "plain", menu: "fullscreen", footer: "card", ann: "marquee", card: "boxed" },
};

const CHROME_LABEL = {
  fr: {
    shape: { floating: "En-tête flottant", pill: "En-tête pilule", bar: "En-tête barre", boxed: "En-tête encadré" } as Record<string, string>,
    footer: { columns: "Pied en colonnes", wordmark: "Pied à nom géant", card: "Pied avec carte d'inscription", centered: "Pied centré", minimal: "Pied minimal" } as Record<string, string>,
    ann: { rotate: "Bandeau rotatif", marquee: "Bandeau défilant", static: "Bandeau fixe" } as Record<string, string>,
    card: { minimal: "Cartes épurées", boxed: "Cartes encadrées", overlay: "Cartes à texte sur image" } as Record<string, string>,
  },
  en: {
    shape: { floating: "Floating header", pill: "Pill header", bar: "Bar header", boxed: "Boxed header" } as Record<string, string>,
    footer: { columns: "Column footer", wordmark: "Giant-name footer", card: "Footer with sign-up card", centered: "Centered footer", minimal: "Minimal footer" } as Record<string, string>,
    ann: { rotate: "Rotating banner", marquee: "Scrolling banner", static: "Static banner" } as Record<string, string>,
    card: { minimal: "Minimal cards", boxed: "Boxed cards", overlay: "Text-over-image cards" } as Record<string, string>,
  },
};

/** Directions présentées dans la galerie : description, aperçu et combinaison d'en-tête / pied de page (langue de l'interface). */
export function directionCards(lang: Lang = "fr") {
  const cl = CHROME_LABEL[lang];
  return DIRECTIONS.map((d) => ({
    id: d.id,
    name: d.name,
    tagline: pick(lang, d.tagline, DIRECTIONS_EN[d.id].tagline),
    description: pick(lang, d.description, DIRECTIONS_EN[d.id].description),
    dark: DARK_DIRECTIONS.includes(d.id),
    preview: `/demo/directions/${d.id}${lang === "en" ? ".en" : ""}.jpg`,
    chrome: [cl.shape[CHROME[d.id].shape], cl.footer[CHROME[d.id].footer], cl.ann[CHROME[d.id].ann], cl.card[CHROME[d.id].card]],
  }));
}
export type DirectionCard = ReturnType<typeof directionCards>[number];

export function buildSpec(input: BuildInput): ThemeSpec {
  const d = directionById(input.direction);
  const lang: Lang = input.language ?? "fr";
  const t = (fr: string, en: string) => pick(lang, fr, en);
  // Pages de la boutique : adresses dans la langue de la boutique.
  const storyHandle = t("notre-histoire", "our-story");
  const shippingHandle = t("livraison-et-retours", "shipping-and-returns");
  const reviewsAnchor = t("avis", "reviews");
  const todo = t("<p>[À compléter dans Shopify : Paramètres › Politiques]</p>", "<p>[To complete in Shopify: Settings › Policies]</p>");
  const ids = new Ids();
  const im = input.images;
  // Entreprise de services : plan du site (appel à l'action, pages, sections) et textes sans vocabulaire de vente.
  const svc = input.business === "services" && input.services ? servicesPlan({ lang, shopName: input.shopName, services: input.services, copy: input.copy, images: im, termsHtml: input.servicesTermsHtml }) : null;
  const c = svc ? svc.copy : input.copy;
  const scheme = (n: 1 | 2 | 3 | 4) => `scheme-${n}`;
  const pad = (top: number, bottom = top) => ({ padding_top: top, padding_bottom: bottom });
  const img = (asset?: string) => asset ?? "";

  const storySteps = c.story.steps.map((s, i) => ({
    type: "step",
    settings: { title: s.title, text: p(s.text), image_asset: img([im.detail1, im.detail2, im.scene2, im.packshot][i]) },
  }));
  const features = c.features.items.map((f) => ({ type: "feature", settings: { title: f.title, text: p(f.text), icon: f.icon } }));
  const specs = c.specs.items.map((s) => ({ type: "spec", settings: { label: s.label, value: s.value } }));
  const faq = svc ? svc.faqBlocks(8) : c.faq.items.map((f) => ({ type: "question", settings: { question: f.q, answer: p(f.a) } }));
  const marquee = c.marquee.join("\n");
  const gallerySlides = [im.scene1, im.detail1, im.scene2, im.detail2, im.scene3]
    .filter(Boolean)
    .map((a, i) => ({ type: "slide", settings: { image_asset: a, title: c.gallery.captions[i] ?? "", text: "", size: i % 2 ? "portrait" : "landscape" } }));
  const mosaic = [im.scene1, im.detail1, im.scene2, im.detail2]
    .filter(Boolean)
    .map((a, i) => ({ type: "image", settings: { image_asset: a, caption: c.gallery.captions[i] ?? "" } }));

  // Accroches : pastille de faits courts, fin de titre mise en valeur, second bouton.
  const shortItems = c.marquee.map((x) => x.trim()).filter((x) => x && x.length <= 22 && !x.includes("["));
  const badge = shortItems.length >= 2 ? shortItems.slice(0, 3).join(" • ") : "";
  const splitAccent = (text: string): [string, string] => {
    const words = text.trim().split(/\s+/);
    if (words.length < 4 || text.includes("[")) return [text, ""];
    const n = words.length >= 7 ? 3 : 2;
    return [words.slice(0, -n).join(" "), words.slice(-n).join(" ")];
  };
  const [heroHead, heroAccent] = splitAccent(c.hero.heading);
  // Services : les boutons mènent à la prise de contact (rendez-vous, devis, appel), le second aux prestations.
  const productUrl = svc ? svc.cta.url : "/products/" + input.product.handle;
  const second = svc ? { button2_label: t("Nos prestations", "Our services"), button2_link: svc.urls.services } : { button2_label: t("Notre histoire", "Our story"), button2_link: `/pages/${storyHandle}` };

  const heroSplit = (sch: 1 | 2, pos: "right" | "left", asset = im.hero ?? im.packshot): [string, Record<string, unknown>] => [
    "hero-split",
    { badge, eyebrow: c.hero.eyebrow, heading: heroHead, heading_accent: heroAccent, text: p(c.hero.text), button_label: c.hero.cta, button_link: productUrl, ...second, image_asset: img(im.lifestyle ?? asset), image_position: pos, height: "large", parallax: true, color_scheme: scheme(sch), ...pad(72, 104) },
  ];
  const heroFull = (sch: 1 | 3, align = "bottom-left", font: "heading" | "body" = "body"): [string, Record<string, unknown>] => [
    "hero-fullbleed",
    { badge, eyebrow: "", heading: heroHead, heading_accent: heroAccent, heading_font: font, text: p(c.hero.text), button_label: c.hero.cta, button_link: productUrl, ...second, image_asset: img(im.lifestyle ?? im.banner ?? im.hero ?? im.scene1), video_asset: im.lifestyle ? "" : img(im.video), overlay: 25, height: "screen", align, parallax: true, show_scroll_cue: true, color_scheme: scheme(sch) },
  ];
  // Photo en situation disponible : l'ouverture la montre en grand (le détourage flottant de l'éditorial ne suffit plus).
  const heroEdito = (sch: 1 | 2): [string, Record<string, unknown>] => im.lifestyle ? heroSplit(sch, "right") : [
    "hero-editorial",
    { eyebrow: c.hero.eyebrow, heading_line1: c.hero.line1, heading_line2: c.hero.line2, text: p(c.hero.text), button_label: c.hero.cta, button_link: productUrl, image_asset: img(im.cutout ?? im.packshot), image_alt: input.product.title, parallax: true, color_scheme: scheme(sch), ...pad(56, 104) },
  ];
  const story = (sch: 1 | 2 | 3): [string, Record<string, unknown>, typeof storySteps] => ["scroll-story", { heading: c.story.heading, image_asset: img(im.packshot ?? im.hero), color_scheme: scheme(sch), ...pad(104) }, storySteps];
  const glowFeatures = features.map((f) => ({ ...f, settings: { ...f.settings, link_label: t("Découvrir", "Discover"), link: productUrl } }));
  const feat = (sch: 1 | 2 | 3, style = "glow", cols = Math.min(3, Math.max(2, features.length))): [string, Record<string, unknown>, typeof features] => [
    "features-grid",
    { eyebrow: "", heading: c.features.heading, heading_align: "left", columns: cols, style, link_label: "", color_scheme: scheme(sch), ...pad(104) },
    style === "glow" ? glowFeatures : features,
  ];
  const iwt = (sch: 1 | 2 | 3 | 4, layout: string, asset = im.scene1, reveal = "zoom"): [string, Record<string, unknown>] => ["image-with-text", { eyebrow: c.detail.eyebrow, heading: c.detail.heading, text: p(c.detail.text), image_asset: img(asset), layout, ratio: "portrait", reveal, parallax: false, color_scheme: scheme(sch), ...pad(104) }];
  const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const statementDup = norm(c.statement.heading) === norm(c.hero.heading) || norm(c.statement.heading) === norm(heroHead + " " + heroAccent);
  const statementRow = (sch: 1 | 2 | 3 | 4, style = "reveal", withButton = false): Row[] => (statementDup && !c.statement.text ? [] : [statement(sch, style, withButton)]);
  const statement = (sch: 1 | 2 | 3 | 4, style = "reveal", withButton = false): [string, Record<string, unknown>, { type: string; settings: Record<string, unknown> }[]] => [
    "rich-text",
    { align: style === "reveal" ? "left" : "center", style, color_scheme: scheme(sch), ...pad(120) },
    [
      ...(c.statement.eyebrow ? [{ type: "eyebrow", settings: { text: c.statement.eyebrow } }] : []),
      { type: "heading", settings: { text: c.statement.heading, size: style === "statement" ? "h1" : "h2" } },
      ...(c.statement.text ? [{ type: "text", settings: { text: p(c.statement.text) } }] : []),
      ...(withButton ? [{ type: "button", settings: { label: c.hero.cta, link: productUrl, secondary: false } }] : []),
    ],
  ];
  // Chiffres clés : uniquement des caractéristiques confirmées et courtes.
  const statItems = c.specs.items.filter((x) => x.value && x.value.length <= 14 && !x.value.includes("[") && /\d/.test(x.value)).slice(0, 3);
  const stats = (sch: 1 | 2 | 3): Row[] =>
    statItems.length >= 2 ? [["stats", { eyebrow: c.specs.heading, heading: "", accent_values: true, color_scheme: scheme(sch), ...pad(72) }, statItems.map((x) => ({ type: "stat", settings: { value: x.value, label: x.label } }))]] : [];
  const specList = (sch: 1 | 2 | 3): [string, Record<string, unknown>, typeof specs] => ["specs-list", { heading: c.specs.heading, color_scheme: scheme(sch), ...pad(104) }, specs];
  const faqSec = (sch: 1 | 2, limit = 5): [string, Record<string, unknown>, typeof faq] => ["faq", { heading: c.faq.heading, style: "cards", structured_data: true, color_scheme: scheme(sch), ...pad(104) }, faq.slice(0, limit)];
  const marq = (sch: 1 | 2 | 3 | 4, size: string, reverse = false): [string, Record<string, unknown>] => ["marquee", { items: marquee, separator: d.id === "brut" ? "●" : d.id === "pop" ? "★" : "✦", size, speed: size === "huge" ? 40 : 30, reverse, color_scheme: scheme(sch) }];
  const cta = (sch: 1 | 3 | 4, asset = im.scene3 ?? im.scene2 ?? im.banner ?? im.hero): [string, Record<string, unknown>] => ["cta-banner", { heading: c.cta.heading, text: p(c.cta.text), button_label: c.cta.button, button_link: productUrl, image_asset: img(asset), overlay: 45, style: "center", parallax: true, color_scheme: scheme(sch), ...pad(152) }];
  const newsletter = (sch: 1 | 2 | 3 | 4): [string, Record<string, unknown>] => ["newsletter", { heading: c.newsletter.heading, text: p(c.newsletter.text), button_label: t("S'inscrire", "Subscribe"), legal: t("Désinscription possible à tout moment.", "Unsubscribe at any time."), color_scheme: scheme(sch), ...pad(104) }];
  const hgallery = (sch: 1 | 2 | 3): [string, Record<string, unknown>, typeof gallerySlides] => ["horizontal-gallery", { heading: c.gallery.heading, color_scheme: scheme(sch), ...pad(104) }, gallerySlides];
  const mosaicSec = (sch: 1 | 2, layout = "editorial"): [string, Record<string, unknown>, typeof mosaic] => ["gallery-mosaic", { heading: c.gallery.heading, layout, color_scheme: scheme(sch), ...pad(104) }, mosaic];
  const featured = (sch: 1 | 2): [string, Record<string, unknown>] => ["featured-product", { eyebrow: c.hero.eyebrow, text: p(c.product.short), image_asset: img(im.packshot), show_quantity: true, color_scheme: scheme(sch), ...pad(104) }];
  const video = (sch: 1 | 3, ratio = "16/9"): [string, Record<string, unknown>] => ["video-showcase", { heading: "", video_asset: img(im.video), poster_asset: img(im.videoPoster), ratio, width: "full", autoplay: true, controls: false, caption: "", color_scheme: scheme(sch), ...pad(0) }];


  // Sections narratives (cercles, cartes empilées, frise, texte en courbe, vidéos verticales, vagues).
  const circleItems = [
    [im.packshot, t("Le produit", "The product"), productUrl],
    [im.detail1, t("Les détails", "The details"), productUrl],
    [im.scene1, t("En situation", "In use"), productUrl],
    [im.scene2 ?? im.detail2, t("Notre histoire", "Our story"), `/pages/${storyHandle}`],
    [im.detail2 ?? im.scene3, t("Questions", "Questions"), "/pages/faq"],
  ].filter((x) => x[0]) as [string, string, string][];
  const circles = (sch: 1 | 2): Row[] => (circleItems.length >= 3 ? [["story-circles", { heading: "", color_scheme: scheme(sch), ...pad(56, 40) }, circleItems.map(([a, label, link]) => ({ type: "circle", settings: { image_asset: a, label, link } }))]] : []);
  const stackImages = [im.detail1, im.scene1, im.detail2, im.scene2, im.packshot].filter(Boolean) as string[];
  const stackCards = (sch: 1 | 2): Row[] =>
    features.length >= 2 && stackImages.length >= 2
      ? [["stack-cards", { heading: c.features.heading, heading_accent: "", color_scheme: scheme(sch), ...pad(104) }, c.features.items.slice(0, 4).map((f, i) => ({ type: "card", settings: { image_asset: stackImages[i % stackImages.length], eyebrow: "", title: f.title, text: p(f.text), button_label: t("Découvrir", "Discover"), link: productUrl } }))]]
      : [];
  const timelineSec = (sch: 1 | 2): Row[] =>
    c.story.steps.length >= 2 ? [["timeline", { heading: c.story.heading, heading_accent: "", image_asset: img(im.scene2 ?? im.scene1), color_scheme: scheme(sch), ...pad(104) }, c.story.steps.map((st) => ({ type: "step", settings: { title: st.title, text: p(st.text) } }))]] : [];
  const curveText = shortItems.length ? shortItems.slice(0, 2).join(" ✦ ") : input.shopName;
  const curve = (sch: 1 | 2 | 3 | 4): Row => ["curved-marquee", { text: curveText, separator: "✦", curve: 70, size: "large", color_scheme: scheme(sch), ...pad(24) }];
  const reels = (sch: 1 | 2 | 3): Row[] =>
    im.reels?.length ? [["video-reels", { heading: t("En mouvement", "In motion"), heading_accent: "", color_scheme: scheme(sch), ...pad(88) }, im.reels.map((r) => ({ type: "reel", settings: { video_asset: r.video, poster_asset: r.poster ?? "", caption: "" } }))]] : [];
  const wave = (from: 1 | 2 | 3 | 4, to: 1 | 2 | 3 | 4): Row => ["wave-divider", { from_scheme: scheme(from), color_scheme: scheme(to), amplitude: 40 }];
  const hasVideo = !!im.video;
  type Row = [string, Record<string, unknown>, { type: string; settings: Record<string, unknown> }[]?];
  let index: Row[];
  let gallery = "stack";
  let headerLayout = "logo-left";
  let radius = { button: 40, card: 28 };
  let buttonStyle = "solid";
  let headingCase = "none";
  let tracking = 0;
  let headingScale = 100;
  let glow = 45;
  let shine = true;
  let darkTheme = false;
  switch (d.id) {
    case "atelier":
      headerLayout = "logo-center";
      headingScale = 104;
      glow = 35;
      index = [heroEdito(1), ...stats(1), iwt(1, "image-left", im.scene1), feat(2), ...statementRow(1), story(2), hgallery(1), faqSec(2), newsletter(1)];
      break;
    case "clinique":
      headingScale = 100;
      tracking = -4;
      glow = 25;
      shine = false;
      gallery = "carousel";
      index = [heroSplit(1, "right", im.packshot ?? im.hero), ...stats(2), feat(1), ...statementRow(2), story(1), specList(2), iwt(1, "overlap", im.scene1), faqSec(2), cta(3)];
      break;
    case "brut":
      headingCase = "uppercase";
      tracking = -4;
      headingScale = 112;
      radius = { button: 14, card: 18 };
      glow = 80;
      darkTheme = true;
      gallery = "grid";
      index = [heroFull(1, "bottom-left", "heading"), marq(4, "huge"), ...stackCards(1), ...reels(2), ...stats(2), mosaicSec(1), ...statementRow(2), featured(1), cta(4)];
      break;
    case "terroir":
      headerLayout = "split";
      glow = 30;
      index = [heroSplit(1, "left", im.scene1 ?? im.hero), ...statementRow(2), iwt(1, "image-right", im.detail1), feat(2), ...timelineSec(1), hgallery(2), faqSec(1), newsletter(2)];
      break;
    case "nocturne":
      tracking = -2;
      glow = 70;
      darkTheme = true;
      gallery = "carousel";
      index = [heroFull(1, "bottom-left", "body"), ...statementRow(1), ...stats(1), feat(2), iwt(1, "image-right", im.scene1 ?? im.detail1), story(2), ...reels(1), hgallery(1), faqSec(2), cta(3)];
      break;
    case "pop":
      radius = { button: 40, card: 32 };
      headingScale = 106;
      glow = 55;
      index = [heroSplit(2, "right", im.packshot ?? im.hero), ...circles(1), marq(4, "large"), feat(1), ...stats(2), mosaicSec(1, "even"), featured(2), faqSec(1), newsletter(2)];
      break;
    case "galerie":
      headerLayout = "minimal";
      radius = { button: 40, card: 6 };
      headingScale = 94;
      glow = 15;
      shine = false;
      index = [heroSplit(1, "left", im.hero ?? im.scene1), mosaicSec(1), ...statementRow(1), hgallery(2), specList(1), newsletter(2)];
      break;
    case "elan":
      headingCase = "uppercase";
      headingScale = 108;
      tracking = -3;
      radius = { button: 10, card: 22 };
      glow = 75;
      darkTheme = true;
      gallery = "grid";
      index = [heroFull(1, "bottom-left", "heading"), marq(4, "large"), ...stats(2), feat(1), curve(1), ...timelineSec(2), ...reels(1), featured(1), cta(3), faqSec(1)];
      break;
    case "flux":
      headerLayout = "logo-center";
      buttonStyle = "frame";
      radius = { button: 0, card: 0 };
      headingScale = 104;
      tracking = -4;
      glow = 0;
      shine = false;
      gallery = "grid";
      index = [heroFull(3, "bottom-left", "heading"), ...circles(1), ...stackCards(1), curve(1), ...reels(1), ...timelineSec(1), featured(2), cta(3), faqSec(1)];
      break;
    case "joaillerie":
      headerLayout = "logo-center";
      buttonStyle = "frame";
      headingCase = "uppercase";
      radius = { button: 0, card: 0 };
      tracking = 4;
      headingScale = 92;
      glow = 0;
      shine = false;
      index = [heroFull(3, "bottom-left", "heading"), ...circles(1), featured(2), ...statementRow(4, "statement", true), ...reels(1), iwt(1, "image-left", im.scene1), faqSec(2), newsletter(3)];
      break;
    case "gourmand":
      headerLayout = "logo-center";
      radius = { button: 40, card: 28 };
      headingScale = 108;
      glow = 0;
      shine = false;
      index = [
        // Ouverture vidéo puis grande phrase centrée ; sans vidéo, héros produit puis phrase (si elle diffère).
        ...(hasVideo && !im.lifestyle ? [video(1, "16/9"), statement(3, "statement", true)] : [heroSplit(1, "right", im.packshot ?? im.hero), ...statementRow(3, "statement", true)]),
        wave(3, 1),
        hgallery(1),
        ...reels(1),
        ...stats(1),
        wave(1, 4),
        iwt(4, "image-right", im.scene1),
        wave(4, 1),
        feat(1, "cards"),
        faqSec(1),
        wave(1, 3),
        newsletter(4),
      ];
      break;
  }

  // Boutiques multi-produit et niche : grille de produits dès l'ouverture, univers à explorer,
  // liens vers le catalogue. La niche garde le récit du produit phare ; le multi-produit l'allège.
  const catalogProducts = input.products ?? [];
  const isCatalog = !!input.storeType && input.storeType !== "mono" && catalogProducts.length > 0;
  if (isCatalog) {
    const multi = input.storeType === "multi";
    const total = catalogProducts.length + 1;
    const drop = new Set(multi ? ["scroll-story", "specs-list", "stats", "stack-cards", "timeline"] : ["specs-list", "stats"]);
    index = index.filter((r) => !drop.has(r[0]));
    if (multi) {
      for (const r of index) if (/^hero-|^cta-banner$/.test(r[0]) && r[1].button_link === productUrl) r[1] = { ...r[1], button_link: "/collections/all" };
    }
    const grid: Row = ["featured-collection", { heading: multi ? t("Les incontournables", "The essentials") : t("La sélection", "The selection"), collection: "all", limit: Math.min(8, total), columns: total >= 4 ? 4 : 3, ratio: "portrait", color_scheme: scheme(1), ...pad(96) }];
    const at = Math.max(1, index.findIndex((r, i) => i >= 1 && !["rich-text", "wave-divider", "marquee", "curved-marquee"].includes(r[0])));
    index.splice(at === -1 ? index.length : at, 0, grid);
    const cols = input.collections ?? [];
    if (cols.length >= 2) {
      const clist: Row = ["collection-list", { heading: multi ? t("Explorer par univers", "Shop by category") : t("Explorer la collection", "Explore the collection"), columns: Math.min(4, cols.length), color_scheme: scheme(1), ...pad(96) }, cols.slice(0, 8).map((col) => ({ type: "collection", settings: { collection: col.handle, title: col.title, image_asset: col.image ?? "" } }))];
      const end = index.findIndex((r) => ["faq", "newsletter", "cta-banner"].includes(r[0]));
      index.splice(end === -1 ? index.length : end, 0, clist);
    }
  }

  // Entreprise de services : accueil propre à chaque direction (même caractère graphique, autres sections).
  if (svc) {
    const R = svc.R;
    const why = (sch: 1 | 2 | 3, style = "glow"): Row[] => (features.length >= 2 ? [feat(sch, style)] : []);
    const svcHero = (sch: 1 | 2, pos: "right" | "left"): Row => heroSplit(sch, pos, im.lifestyle ?? im.hero ?? im.scene1 ?? im.banner);
    const svcMarq = (sch: 1 | 2 | 3 | 4, size: string): Row[] => (c.marquee.length >= 2 ? [marq(sch, size)] : []);
    const recipes: Record<DirectionId, Row[]> = {
      atelier: [svcHero(1, "right"), R.servicesList(1, "cards", { withImages: true }), ...why(2), R.method(1, "howto-v"), ...R.portfolio(2, "editorial"), R.testimonials(2), R.practical(1), faqSec(2), cta(3)],
      clinique: [svcHero(1, "right"), ...R.trust(2), R.servicesList(1, "list"), ...why(2, "cards"), R.method(1, "howto-h"), R.testimonials(1), ...R.portfolio(2, "grid"), R.practical(1), faqSec(2), cta(3)],
      brut: [heroFull(1, "bottom-left", "heading"), ...svcMarq(4, "huge"), R.servicesList(1, "cards"), R.method(2, "timeline"), ...R.portfolio(1, "grid"), R.testimonials(1), R.practical(2), faqSec(1), cta(4)],
      terroir: [svcHero(1, "left"), ...statementRow(2), R.servicesList(1, "cards", { withImages: true }), R.method(2, "timeline"), ...R.portfolio(1, "editorial"), R.testimonials(1), R.practical(2), faqSec(1), cta(3)],
      nocturne: [heroFull(1, "bottom-left", "body"), ...R.trust(2), R.servicesList(1, "cards"), ...why(2), R.method(1, "howto-h"), ...R.portfolio(2, "grid"), R.testimonials(2), R.practical(1), faqSec(2), cta(3)],
      pop: [svcHero(2, "right"), ...svcMarq(4, "large"), R.servicesList(1, "cards"), ...why(2, "cards"), R.method(1, "howto-h"), ...R.portfolio(2, "grid"), R.testimonials(2), R.practical(1), faqSec(2), cta(4)],
      galerie: [svcHero(1, "left"), ...R.portfolio(1, "editorial"), R.servicesList(2, "list"), ...statementRow(1), R.method(2, "timeline"), R.testimonials(2), R.practical(1), faqSec(2), cta(3)],
      elan: [heroFull(1, "bottom-left", "heading"), ...svcMarq(4, "large"), R.servicesList(1, "cards"), R.method(2, "howto-h"), ...why(1), ...R.portfolio(2, "grid"), R.testimonials(2), R.practical(1), faqSec(2), cta(3)],
      flux: [heroFull(3, "bottom-left", "heading"), curve(1), R.servicesList(1, "list"), R.method(2, "timeline"), ...R.portfolio(1, "grid"), R.testimonials(1), R.practical(2), faqSec(1), cta(3)],
      joaillerie: [heroFull(3, "bottom-left", "heading"), R.servicesList(1, "list"), ...statementRow(4, "statement", true), ...R.portfolio(1, "editorial"), R.method(2, "howto-v"), R.testimonials(2), R.practical(1), faqSec(2), cta(3)],
      gourmand: [svcHero(1, "right"), ...statementRow(3, "statement", true), wave(3, 1), R.servicesList(1, "cards", { withImages: true }), wave(1, 4), R.method(4, "howto-h"), wave(4, 1), ...R.portfolio(1, "grid"), R.testimonials(1), R.practical(2), faqSec(1), wave(1, 3), cta(3)],
    };
    index = recipes[d.id];
    // Vague d'ouverture sans phrase centrée (phrase identique au titre) : la vague n'a plus rien à relier.
    if (index[1]?.[0] === "wave-divider") index.splice(1, 1);
  }

  // Catalogue : les textes rédigés pour le produit principal ne s'affichent que sur sa fiche.
  const only = isCatalog ? { product_handle: input.product.handle } : {};
  const productTabs = c.product.tabs.map((tab) => ({ type: "collapsible", settings: { heading: tab.heading, content: p(tab.content_html), open: false, ...(/livraison|retour|shipping|deliver|return/i.test(tab.heading) ? {} : only) } }));
  const productBlocks = [
    { type: "eyebrow", settings: { text: input.shopName } },
    { type: "title", settings: {} },
    // Note réelle de l'application d'avis : invisible tant qu'il n'y a pas d'avis.
    { type: "rating", settings: { anchor: reviewsAnchor } },
    { type: "price", settings: {} },
    { type: "text", settings: { text: p(c.product.short), ...only } },
    { type: "buy_buttons", settings: { picker: "buttons", show_quantity: true, show_dynamic_checkout: true } },
    ...(c.product.highlights.length ? [{ type: "highlights", settings: { items: c.product.highlights.join("\n"), ...only } }] : []),
    // La description n'est affichée que si elle apporte plus que l'accroche courte.
    // En catalogue, chaque fiche a besoin de sa description ; sur la fiche principale, masquée si elle répète l'accroche.
    ...(stripTags(input.product.description_html) !== stripTags(c.product.short) ? [{ type: "description", settings: {} }] : isCatalog ? [{ type: "description", settings: { hide_for_handle: input.product.handle } }] : []),
    ...productTabs,
    ...(c.product.reassurance.length
      ? [{ type: "reassurance", settings: { item1: c.product.reassurance[0] ?? "", icon1: "truck", item2: c.product.reassurance[1] ?? "", icon2: "return", item3: c.product.reassurance[2] ?? "", icon3: "shield" } }]
      : []),
  ];
  const productTpl = tpl(ids, [
    ["main-product", { gallery_layout: gallery, sticky_bar: true, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 96 }, productBlocks],
    ["product-reviews", { heading: t("Avis des clients", "Customer reviews"), anchor: reviewsAnchor, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 32 }],
    story(2),
    ...(specs.length ? [specList(1)] : []),
    faqSec(2, 4),
    ["product-recommendations", { heading: t("Vous aimerez aussi", "You may also like"), limit: 4, color_scheme: "scheme-1", padding_top: 64, padding_bottom: 96 }],
  ]);

  const aboutTpl = tpl(ids, [
    ["rich-text", { align: "center", style: "statement", color_scheme: "scheme-1", ...pad(120, 64) }, [
      { type: "eyebrow", settings: { text: t("Notre histoire", "Our story") } },
      { type: "heading", settings: { text: c.about.heading, size: "h1" } },
      { type: "text", settings: { text: p(c.about.intro) } },
    ]],
    ...c.about.blocks.map((b, i): Row => ["image-with-text", { eyebrow: "", heading: b.heading, text: p(b.text), image_asset: img([im.scene1, im.detail1, im.scene2, im.detail2][i]), layout: i % 2 ? "image-right" : "image-left", ratio: "portrait", reveal: "curtain", parallax: false, color_scheme: i % 2 ? "scheme-2" : "scheme-1", ...pad(96) }]),
    ...(c.about.values.length ? [["features-grid", { heading: t("Ce qui nous guide", "What guides us"), heading_align: "left", columns: Math.min(3, Math.max(2, c.about.values.length)), style: "glow", color_scheme: "scheme-2", ...pad(96) }, c.about.values.map((v) => ({ type: "feature", settings: { title: v.title, text: p(v.text), icon: "sparkle" } }))] as Row] : []),
    cta(3),
  ]);

  const templates: Record<string, TemplateJson> = {
    index: tpl(ids, index),
    product: productTpl,
    collection: tpl(ids, [["main-collection", { per_page: 16, columns: 3, enable_filters: true, enable_sorting: true, color_scheme: "scheme-1" }]]),
    "list-collections": tpl(ids, [["main-list-collections", { heading: t("Catalogue", "Catalog"), color_scheme: "scheme-1" }]]),
    search: tpl(ids, [["main-search", { color_scheme: "scheme-1" }]]),
    cart: tpl(ids, [["main-cart", { color_scheme: "scheme-1" }]]),
    page: tpl(ids, [["main-page", { width: "narrow", color_scheme: "scheme-1", ...pad(64, 96) }]]),
    "page.about": aboutTpl,
    "page.faq": tpl(ids, [["faq", { heading: c.faq.heading, text: "", style: "cards", structured_data: true, color_scheme: "scheme-1", ...pad(96) }, faq], ["contact-form", { heading: t("Une autre question ?", "Still have a question?"), text: p(c.contact.text), color_scheme: "scheme-2", ...pad(96) }]]),
    "page.contact": tpl(ids, [["contact-form", { heading: c.contact.heading, text: p(c.contact.text), color_scheme: "scheme-1", ...pad(64, 120) }]]),
    "page.shipping": tpl(ids, [["main-page", { width: "narrow", color_scheme: "scheme-1", ...pad(64, 96) }], ["rich-text", { align: "left", style: "plain", color_scheme: "scheme-2", ...pad(64) }, [{ type: "heading", settings: { text: c.shipping.heading, size: "h3" } }, { type: "text", settings: { text: c.shipping.body_html } }]]]),
    "404": tpl(ids, [["main-404", { heading: t("Cette page s'est égarée.", "This page has wandered off."), text: t("Le lien est peut-être ancien. Le reste de la boutique vous attend.", "The link may be out of date. The rest of the store is waiting for you."), color_scheme: "scheme-1" }]]),
    blog: tpl(ids, [["main-blog", { color_scheme: "scheme-1" }]]),
    article: tpl(ids, [["main-article", { color_scheme: "scheme-1" }]]),
    password: { ...tpl(ids, [["main-password", { heading: t("Bientôt en ligne", "Opening soon") }]]), layout: "password" },
  };

  // Entreprise de services : pages Prestations, À propos, Contact / Rendez-vous, FAQ et mentions légales.
  // La fiche produit reste présente (exigée par Shopify) mais n'est reliée à aucune page du site.
  if (svc) {
    const R = svc.R;
    templates.product = tpl(ids, [["main-product", { gallery_layout: gallery, sticky_bar: false, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 96 }, [{ type: "title", settings: {} }, { type: "price", settings: {} }, { type: "description", settings: {} }, { type: "buy_buttons", settings: { picker: "buttons", show_quantity: false, show_dynamic_checkout: false } }]]]);
    delete templates["page.shipping"];
    const aboutBlocks = c.about.blocks;
    templates["page.services"] = tpl(ids, [
      R.servicesList(1, "list", { eyebrow: t("Prestations", "Services"), heading: t("Nos prestations", "Our services") }),
      ...R.pricing(2),
      R.method(1, "howto-h"),
      ["faq", { heading: t("Bon à savoir", "Good to know"), style: "lines", structured_data: false, color_scheme: "scheme-2", ...pad(96) }, svc.faqBlocks(6).slice(3, 6)],
      cta(3),
    ]);
    templates["page.about"] = tpl(ids, [
      ["about", { eyebrow: t("À propos", "About"), heading: c.about.heading, heading_accent: "", image_asset: img(im.lifestyle ?? im.scene1 ?? im.hero), lead: p(c.about.intro), ...(aboutBlocks[0] ? { why_title: aboutBlocks[0].heading, why_text: p(aboutBlocks[0].text) } : {}), ...(aboutBlocks[1] ? { commit_title: aboutBlocks[1].heading, commit_text: p(aboutBlocks[1].text) } : {}), values_title: t("Ce qui nous guide", "What guides us"), button_label: t("Découvrir nos prestations", "Discover our services"), button_link: svc.urls.services, color_scheme: "scheme-1", ...pad(120, 104) }, c.about.values.slice(0, 4).map((v, i) => ({ type: "value", settings: { icon: ["sparkle", "heart", "shield", "leaf"][i], title: v.title, text: p(v.text) } }))],
      R.team(2, "cards", 3),
      R.method(1, "timeline"),
      cta(3),
    ]);
    templates["page.contact"] = tpl(ids, [R.booking(1), R.practical(2, false), ...(svc.bookingUrl ? [R.contactForm(1)] : [])]);
    templates["page.faq"] = tpl(ids, [R.faq(1, 8), R.contactForm(2, t("Une autre question ?", "Still have a question?"))]);
    templates["page.legal"] = tpl(ids, [R.legal()]);
    templates["404"] = tpl(ids, [["main-404", { heading: t("Cette page s'est égarée.", "This page has wandered off."), text: t("Le lien est peut-être ancien. Le reste du site vous attend.", "The link may be out of date. The rest of the site is waiting for you."), color_scheme: "scheme-1" }]]);
  }

  // Bandeau : annonces confirmées, sinon les expressions courtes de la marque (jamais d'offre inventée).
  // Repli sur les expressions de la marque : jamais le nom de la boutique ni le titre du héros répétés, et rien
  // dans une boutique multi-produit (une phrase sur le produit principal n'annonce rien pour tout le catalogue).
  const annFallback = input.storeType === "multi" && isCatalog ? [] : shortItems.filter((x) => ![input.shopName, c.hero.heading, heroHead].some((y) => norm(y) === norm(x)));
  const annItems = svc ? svc.announcements : c.announcement.length ? c.announcement : annFallback.length >= 2 ? annFallback.slice(0, 3) : [];
  const header: GroupJson = {
    type: "header",
    name: t("Groupe en-tête", "Header group"),
    ...tpl(ids, [
      ...(annItems.length ? [["announcement-bar", { style: CHROME[d.id].ann, color_scheme: "scheme-3" }, annItems.map((t) => ({ type: "announcement", settings: { text: t, link: "" } }))] as Row] : []),
      ["header", { menu: "main-menu", layout: headerLayout, shape: CHROME[d.id].shape, icons: CHROME[d.id].icons, mobile_menu: CHROME[d.id].menu, sticky: true, transparent_on_home: index[0]?.[0] === "hero-fullbleed", show_search: !svc, color_scheme: "scheme-1", ...(svc ? { show_cart: false, cta_label: svc.headerCta.label, cta_link: svc.headerCta.link, cta_icon: svc.headerCta.icon, phone: svc.phone } : {}) }],
    ]),
  };
  const footer: GroupJson = {
    type: "footer",
    name: t("Groupe pied de page", "Footer group"),
    ...tpl(ids, [
      ["footer", { style: CHROME[d.id].footer, logo_asset: img(im.logoLight ?? im.logo), show_wordmark: d.id !== "clinique", show_policies: !svc, show_payment: !svc, color_scheme: darkTheme ? "scheme-2" : "scheme-3" }, svc
        ? [
            { type: "text", settings: { heading: input.shopName, text: p(c.footer.about) } },
            { type: "links", settings: { heading: t("Le site", "Site"), menu: "main-menu" } },
            svc.footerContact,
            { type: "links", settings: { heading: t("Informations", "Information"), menu: "footer" } },
          ]
        : [
        { type: "text", settings: { heading: input.shopName, text: p(c.footer.about) } },
        { type: "links", settings: { heading: t("Boutique", "Shop"), menu: "main-menu" } },
        { type: "links", settings: { heading: t("Aide", "Help"), menu: "footer" } },
        { type: "newsletter", settings: { heading: t("Restons en contact", "Let's stay in touch"), text: c.footer.newsletter } },
      ]],
    ]),
  };

  const settings: Record<string, unknown> = {
    logo_asset: img(darkTheme ? im.logoLight ?? im.logo : im.logo),
    logo_width: 150,
    favicon_asset: img(im.favicon),
    color_schemes: colorSchemes(d.id, input.palette),
    type_heading_font: input.fonts?.heading ?? d.fonts.heading,
    type_body_font: input.fonts?.body ?? d.fonts.body,
    type_accent_font: ACCENT_FONT,
    heading_scale: headingScale,
    body_scale: 100,
    heading_case: headingCase,
    heading_tracking: tracking,
    heading_weight_boost: 0,
    page_width: d.id === "galerie" ? 1400 : 1320,
    spacing_scale: d.id === "galerie" ? 110 : 100,
    style_preset: d.id,
    button_radius: Math.min(40, radius.button),
    card_radius: Math.min(40, radius.card),
    button_style: buttonStyle,
    button_uppercase: buttonStyle !== "frame" && d.id !== "gourmand",
    button_shine: shine,
    glow_enabled: glow > 20,
    glow_intensity: glow,
    header_shape: CHROME[d.id].shape === "pill" ? "floating" : CHROME[d.id].shape,
    card_style: CHROME[d.id].card,
    motion_enabled: true,
    motion_intensity: d.motion,
    motion_parallax: true,
    fab_back_to_top: true,
    fab_contact_link: svc ? svc.cta.url : "/pages/contact",
    fab_contact_icon: svc?.mode === "call" ? "phone" : "chat",
    fab_contact_label: svc ? svc.cta.label : t("Nous contacter", "Contact us"),
    // Site de services : aucun panier (ni tiroir, ni page).
    cart_type: svc ? "none" : "drawer",
    cart_show_note: false,
    cart_reassurance: "",
    social_instagram: input.social?.instagram ?? "",
    social_tiktok: input.social?.tiktok ?? "",
    social_facebook: input.social?.facebook ?? "",
    social_youtube: input.social?.youtube ?? "",
    social_pinterest: input.social?.pinterest ?? "",
  };

  return tidyComposition({
    v: 1,
    name: `${input.shopName} · ${d.name}`,
    direction: d.id,
    language: lang,
    settings,
    groups: { header, footer },
    templates,
    customSections: {},
    files: input.files,
    locks: [],
    store: {
      shopName: input.shopName,
      product: input.product,
      ...(isCatalog ? { products: catalogProducts, collections: input.collections ?? [] } : {}),
      ...(svc ? { business: "services" as const } : {}),
      pages: svc ? svc.pages : [
        { handle: storyHandle, title: t("Notre histoire", "Our story"), template_suffix: "about", body_html: "" },
        { handle: "faq", title: t("Questions fréquentes", "Frequently asked questions"), template_suffix: "faq", body_html: "" },
        { handle: "contact", title: "Contact", template_suffix: "contact", body_html: "" },
        { handle: shippingHandle, title: t("Livraison et retours", "Shipping and returns"), template_suffix: "shipping", body_html: t("<p>Les conditions détaillées figurent ci-dessous.</p>", "<p>Full details are below.</p>") },
      ],
      menus: svc ? svc.menus : {
        "main-menu": {
          title: t("Menu principal", "Main menu"),
          links: [
            { title: t("Accueil", "Home"), url: "/" },
            { title: t("Boutique", "Shop"), url: "/collections/all" },
            ...(isCatalog ? (input.collections ?? []).slice(0, 3).map((col) => ({ title: col.title, url: `/collections/${col.handle}` })) : []),
            { title: t("Notre histoire", "Our story"), url: `/pages/${storyHandle}` },
            { title: "FAQ", url: "/pages/faq" },
            { title: "Contact", url: "/pages/contact" },
          ],
        },
        footer: {
          title: t("Pied de page", "Footer"),
          links: [
            { title: t("Livraison et retours", "Shipping and returns"), url: `/pages/${shippingHandle}` },
            { title: "Contact", url: "/pages/contact" },
            { title: t("Recherche", "Search"), url: "/search" },
          ],
        },
      },
      policies: svc ? svc.policies : [
        { handle: "terms-of-service", title: t("Conditions générales de vente", "Terms of service"), body_html: todo },
        { handle: "privacy-policy", title: t("Politique de confidentialité", "Privacy policy"), body_html: todo },
        { handle: "refund-policy", title: t("Politique de remboursement", "Refund policy"), body_html: todo },
        { handle: "legal-notice", title: t("Mentions légales", "Legal notice"), body_html: todo },
      ],
    },
  });
}
