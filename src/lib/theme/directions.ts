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
import { bookingCalendar, bookingNeed } from "./booking-need";
import { tidyComposition } from "./tidy";
import { planForTheme, themeRank } from "./theme-access";
import { isActiveThemeId } from "./theme-fit";
import { CATALOG_THEMES, catalogTheme, type CatalogThemeId, type Kit, type PaletteKit, type Row } from "./theme-catalog";
import { isReferenceTheme, referenceHomeRows } from "./reference-composition";

/** Onze directions d'origine, puis les thèmes du catalogue (theme-catalog.ts) : trente compositions distinctes. */
export type BaseDirectionId = "atelier" | "clinique" | "brut" | "terroir" | "nocturne" | "pop" | "galerie" | "elan" | "flux" | "joaillerie" | "gourmand";
export type DirectionId = BaseDirectionId | CatalogThemeId;

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

const BASE_DIRECTIONS: Direction[] = [
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

export const DIRECTIONS: Direction[] = [
  ...BASE_DIRECTIONS,
  ...CATALOG_THEMES.map((x): Direction => ({ id: x.id, name: x.name, tagline: x.tagline, description: x.description, bestFor: x.bestFor, fonts: x.fonts, previewFonts: x.previewFonts, motion: x.motion })),
];

/**
 * Catalogue actif (consigne du 19 octobre, commentaire 6264783184) : les quatre thèmes de référence. `DIRECTIONS` garde
 * toutes les définitions pour composer et rendre les projets existants ; tout ce qui PROPOSE un thème (galerie, onglet
 * Marque, IA, commandes locales, recommandation, découverte, vignettes) part de cette liste.
 */
export const ACTIVE_DIRECTIONS: Direction[] = DIRECTIONS.filter((d) => isActiveThemeId(d.id));
/** Thème retiré du catalogue (défini, mais plus proposé) ; false pour un thème actif ou inconnu. */
export const isRetiredDirection = (id: string) => !isActiveThemeId(id) && DIRECTIONS.some((d) => d.id === id);

/** Présentation des directions en anglais (le français est dans DIRECTIONS). */
export const DIRECTIONS_EN: Record<DirectionId, { tagline: string; description: string; bestFor: string[] }> = {
  ...(Object.fromEntries(CATALOG_THEMES.map((x) => [x.id, x.en])) as Record<CatalogThemeId, { tagline: string; description: string; bestFor: string[] }>),
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
export const DARK_DIRECTIONS: DirectionId[] = ["brut", "nocturne", "elan", ...CATALOG_THEMES.filter((x) => x.look.dark).map((x) => x.id)];

/** Direction d'origine la plus proche (ambiance photographique des visuels) : la direction elle-même ou celle du thème du catalogue. */
export const baseDirection = (id: DirectionId): BaseDirectionId => catalogTheme(id)?.photoMood ?? (id as BaseDirectionId);

export const directionById = (id: string) => DIRECTIONS.find((d) => d.id === id) ?? DIRECTIONS[0];

// ---------------------------------------------------------------- palettes

export type BrandPalette = { primary: string; secondary: string; accent: string; light: string; dark: string };

type Scheme = { background: string; surface: string; text: string; muted: string; accent: string; accent_text: string; border: string };

function scheme(bg: string, text: string, accent: string, surfaceT = 0.045): Scheme {
  // Texte visé à 7:1 ; quand ce n'est pas atteignable (fond de luminosité moyenne, rouge FRAISE), on garde le meilleur
  // des deux : jamais un texte sombre basculé en blanc moins lisible (3,98:1) que le sombre d'origine (4,62:1).
  const t7 = ensureContrast(text, bg, 7);
  const t = contrast(t7, bg) >= contrast(text, bg) ? t7 : text;
  const acc = contrast(accent, bg) >= 3 ? accent : ensureContrast(accent, bg, 3);
  const surface = mix(bg, t, surfaceT);
  // Texte atténué lisible (4,5:1) sur le fond ET sur la surface des cartes (audit du 19 octobre : 4,07:1 sur une carte sombre).
  const m0 = ensureContrast(ensureContrast(mix(t, bg, 0.42), bg, 4.5), surface, 4.5);
  // Même garde-fou que pour le texte : si l'atténuation n'atteint pas 4,5:1, le texte plein reste préférable.
  const muted = Math.min(contrast(m0, bg), contrast(m0, surface)) >= 4.5 || contrast(m0, bg) >= contrast(t, bg) ? m0 : t;
  return {
    background: bg,
    surface,
    text: t,
    muted,
    accent: acc,
    accent_text: onColor(acc),
    border: mix(bg, t, 0.14),
  };
}

/**
 * Couleurs de la MARQUE, telles quelles : boutons et accents prennent la première couleur de la palette qui se lit sur
 * le fond (contraste ≥ 3:1) — primaire ou accent sur fond clair, accent ou clair sur fond sombre — sans être
 * éclaircies ni saturées (un bordeaux reste bordeaux, jamais rouge vif ; un or reste or, jamais jaune). Seulement si
 * aucune ne se lit, la plus proche est ajustée au contraste minimal. Chaque direction garde son ambiance (clair,
 * sombre, contrasté) avec les fonds tirés du clair et du sombre de la marque.
 */
function brandAccent(bg: string, ...candidates: string[]): string {
  return candidates.find((c) => contrast(c, bg) >= 3) ?? ensureContrast(candidates[0], bg, 3);
}

/**
 * Bloc plein de la couleur de marque (bandeau, pied de page, appel à l'action) : texte noir ou blanc lisible dessus.
 * Quand ni le noir ni le blanc n'atteint 4,5:1 sur la couleur (rouge FRAISE #E4473F : 3,98:1 avec le blanc), la
 * couleur de fond est assombrie ou éclaircie juste assez — la teinte est gardée, jamais le texte rendu illisible.
 */
const filled = (c: string) => {
  const on = onColor(c);
  const bg = contrast(on, c) >= 4.5 ? c : ensureContrast(c, on, 4.5);
  return scheme(bg, on, on);
};

export function colorSchemes(direction: DirectionId, p: BrandPalette): Record<string, { settings: Scheme }> {
  const warmLight = withLightness(p.light, Math.max(0.93, hsl(p.light)[2]), 0.6);
  const deep = isDark(p.dark) ? p.dark : withLightness(p.dark, 0.12);
  // Fond clair de la marque quand il est vraiment clair, sinon le blanc ou le gris clair de la direction.
  const light = (fallback: string) => (hsl(p.light)[2] >= 0.94 ? p.light : fallback);
  const night = (l: number) => withLightness(deep, l, 0.5);
  const onLight = (bg: string) => brandAccent(bg, p.primary, p.accent, p.dark, p.secondary);
  const onDark = (bg: string) => brandAccent(bg, p.accent, p.secondary, p.light, p.primary);
  let s1: Scheme, s2: Scheme, s3: Scheme, s4: Scheme;
  const cat = catalogTheme(direction);
  if (cat) {
    const kit: PaletteKit = {
      p,
      scheme,
      filled,
      onLight,
      onDark,
      night: (l: number, sat = 0.5) => withLightness(deep, l, sat),
      light,
      tint: (c: string, l: number, sat = 1) => withLightness(c, l, sat),
      mix,
    };
    [s1, s2, s3, s4] = cat.palette(kit);
    return { "scheme-1": { settings: s1 }, "scheme-2": { settings: s2 }, "scheme-3": { settings: s3 }, "scheme-4": { settings: s4 } };
  }
  switch (direction) {
    case "nocturne": {
      const bg = withLightness(deep, 0.075, 0.9);
      const acc = onDark(bg);
      s1 = scheme(bg, "#EEF3F8", acc, 0.06);
      s2 = scheme(withLightness(deep, 0.11, 0.9), "#EEF3F8", onDark(withLightness(deep, 0.11, 0.9)), 0.06);
      s3 = scheme(withLightness(deep, 0.05, 0.9), "#EEF3F8", acc, 0.06);
      s4 = filled(acc);
      break;
    }
    case "brut": {
      const bg = night(0.045);
      const acc = onDark(bg);
      s1 = scheme(bg, "#F5F5F2", acc, 0.06);
      s2 = scheme(night(0.08), "#F5F5F2", onDark(night(0.08)), 0.06);
      s3 = scheme(light("#F2F2EE"), bg, bg);
      s4 = filled(acc);
      break;
    }
    case "elan": {
      const bg = withLightness(deep, 0.085, 0.35);
      const acc = onDark(bg);
      s1 = scheme(bg, "#F4F6F6", acc, 0.06);
      s2 = scheme(withLightness(deep, 0.12, 0.35), "#F4F6F6", onDark(withLightness(deep, 0.12, 0.35)), 0.06);
      s3 = scheme(withLightness(deep, 0.05, 0.35), "#F4F6F6", acc, 0.06);
      s4 = filled(acc);
      break;
    }
    case "flux": {
      const bg = light("#FFFFFF");
      s1 = scheme(bg, "#0D0D0D", onLight(bg));
      s2 = scheme("#F2F2F2", "#0D0D0D", onLight("#F2F2F2"));
      s3 = scheme(night(0.05), "#FFFFFF", onDark(night(0.05)), 0.07);
      s4 = filled(onLight(bg));
      break;
    }
    case "joaillerie": {
      const bg = light("#FFFFFF");
      s1 = scheme(bg, "#262626", onLight(bg));
      s2 = scheme("#F3F2F0", "#262626", onLight("#F3F2F0"));
      s3 = scheme(night(0.1), "#F5F4F2", onDark(night(0.1)), 0.07);
      s4 = scheme("#333333", "#FFFFFF", "#FFFFFF", 0.07);
      break;
    }
    case "gourmand": {
      const green = withLightness(p.primary, 0.3, 0.9);
      const ink = withLightness(p.primary, 0.17, 0.8);
      const s2bg = withLightness(p.secondary, 0.86, 1.1);
      const s4bg = withLightness(p.accent, 0.82, 1.1);
      s1 = scheme("#FBF5EC", ink, onLight("#FBF5EC"));
      s2 = scheme(s2bg, ink, onLight(s2bg));
      s3 = scheme(green, "#FBF5EC", onDark(green), 0.07);
      s4 = scheme(s4bg, ink, onLight(s4bg));
      break;
    }
    case "pop": {
      const bg1 = withLightness(p.light, 0.975, 0.8);
      const bg2 = withLightness(p.secondary, 0.91, 1.2);
      const bg3 = withLightness(p.primary, 0.22, 1.1);
      s1 = scheme(bg1, withLightness(deep, 0.14), onLight(bg1));
      s2 = scheme(bg2, withLightness(deep, 0.14), onLight(bg2));
      s3 = scheme(bg3, "#FFFFFF", onDark(bg3));
      s4 = filled(p.accent);
      break;
    }
    case "galerie": {
      const bg = light("#FFFFFF");
      s1 = scheme(bg, "#141414", onLight(bg));
      s2 = scheme("#F6F5F2", "#141414", onLight("#F6F5F2"));
      s3 = scheme(night(0.06), "#F4F3EF", "#F4F3EF");
      s4 = scheme(withLightness(p.primary, 0.9, 0.4), "#141414", "#141414");
      break;
    }
    case "clinique": {
      const bg = light("#FFFFFF");
      const acc = onLight(bg);
      s1 = scheme(bg, "#1D1D1F", acc);
      s2 = scheme("#F5F5F7", "#1D1D1F", onLight("#F5F5F7"));
      s3 = scheme(night(0.04), "#F5F5F7", onDark(night(0.04)), 0.07);
      s4 = filled(acc);
      break;
    }
    case "terroir": {
      const bg1 = withLightness(p.light, 0.955, 0.9);
      const bg2 = withLightness(p.secondary, 0.9, 0.8);
      const bg3 = withLightness(p.primary, 0.14, 0.7);
      s1 = scheme(bg1, withLightness(deep, 0.15, 0.9), onLight(bg1));
      s2 = scheme(bg2, withLightness(deep, 0.15, 0.9), onLight(bg2));
      s3 = scheme(bg3, withLightness(p.light, 0.94, 0.8), onDark(bg3));
      s4 = filled(p.accent);
      break;
    }
    default: {
      // atelier
      const bg2 = mix(warmLight, p.secondary, 0.2);
      const bg3 = withLightness(deep, 0.09, 0.6);
      s1 = scheme(warmLight, withLightness(deep, 0.12, 0.7), onLight(warmLight));
      s2 = scheme(bg2, withLightness(deep, 0.12, 0.7), onLight(bg2));
      s3 = scheme(bg3, withLightness(p.light, 0.95, 0.5), onDark(bg3), 0.06);
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

/** Sections qui rendent elles-mêmes le h1 de la page (ouvertures, gabarits principaux, pages légales). */
const TITLE_SECTIONS = new Set(["main-page", "legal-page", "hero", "hero-split", "hero-flex", "hero-fullbleed", "hero-editorial", "ref-hero", "v2-hero", "cv-hero", "cv-article", "ed-opening", "main-404", "main-article", "main-blog", "main-cart", "main-collection", "main-list-collections", "main-password", "main-product", "main-search"]);
function ensurePageTitles(ids: Ids, templates: Record<string, TemplateJson>) {
  for (const [key, t] of Object.entries(templates)) {
    if (!key.startsWith("page")) continue;
    const first = t.order.map((id) => t.sections[id]).find((s) => s && !s.disabled);
    if (!first || TITLE_SECTIONS.has(first.type)) continue;
    const sid = ids.next("main-page");
    t.sections[sid] = { type: "main-page", settings: { width: "wide", color_scheme: "scheme-1", padding_top: 40, padding_bottom: 0 } };
    t.order.unshift(sid);
  }
}

function tpl(ids: Ids, sections: Row[]): TemplateJson {
  const out: TemplateJson = { sections: {}, order: [] };
  for (const [type, settings, blocks, opts] of sections) {
    const sid = ids.next(type);
    const s: SectionInstance = { type, settings };
    if (blocks?.length) Object.assign(s, blocksOf(ids, blocks));
    // Section posée mais masquée : elle attend une information du marchand (avis, offre, délais…).
    if (opts?.disabled) s.disabled = true;
    out.sections[sid] = s;
    out.order.push(sid);
  }
  return out;
}

export type ImageSlots = {
  /** Site de services : photo propre à chaque prestation (nom de la prestation normalisé → fichier). */
  byService?: Record<string, string>;
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

/**
 * Remplissage d'une section de la bibliothèque avec le projet (textes vrais, photos du projet), fourni côté serveur
 * (library-fill.ts). `complete` est faux s'il manque une information du marchand ou les médias de la section.
 */
export type LibraryFill = (type: string, settings: Record<string, unknown>, blocks?: { type: string; settings: Record<string, unknown> }[], opts?: { dropBlocks?: string[] }) => {
  settings: Record<string, unknown>;
  blocks: { type: string; settings: Record<string, unknown> }[];
  complete: boolean;
};

export type BuildInput = {
  /** Remplissage des sections de la bibliothèque utilisées par les thèmes du catalogue (sans lui : sections masquées). */
  fill?: LibraryFill;
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
  /**
   * Activité décrite par le client (catégorie, résumé, prestations) : une activité qui vit de réservations (salle de
   * jeu, location de salle, restaurant…) reçoit d'office le calendrier de réservation (booking-need.ts).
   */
  activity?: string;
};

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const p = (html: string) => (/^\s*</.test(html) ? html : `<p>${html}</p>`);

/** Combinaisons d'en-tête, pied de page, bandeau et cartes : chaque direction montre une autre possibilité. */
const CHROME: Record<DirectionId, { shape: string; icons: string; menu: string; footer: string; ann: string; card: string }> = {
  ...(Object.fromEntries(CATALOG_THEMES.map((x) => [x.id, { shape: x.look.shape, icons: x.look.icons, menu: x.look.menu, footer: x.look.footer, ann: x.look.ann, card: x.look.card }])) as Record<CatalogThemeId, { shape: string; icons: string; menu: string; footer: string; ann: string; card: string }>),
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
    footer: { columns: "Pied en colonnes", wordmark: "Pied à nom géant", card: "Pied avec carte d'inscription", centered: "Pied centré", minimal: "Pied minimal", "brand-left": "Pied avec marque à gauche", split: "Pied en deux parties", stacked: "Pied empilé", boxed: "Pied encadré" } as Record<string, string>,
    ann: { rotate: "Bandeau rotatif", marquee: "Bandeau défilant", static: "Bandeau fixe" } as Record<string, string>,
    card: { minimal: "Cartes épurées", boxed: "Cartes encadrées", overlay: "Cartes à texte sur image" } as Record<string, string>,
  },
  en: {
    shape: { floating: "Floating header", pill: "Pill header", bar: "Bar header", boxed: "Boxed header" } as Record<string, string>,
    footer: { columns: "Column footer", wordmark: "Giant-name footer", card: "Footer with sign-up card", centered: "Centered footer", minimal: "Minimal footer", "brand-left": "Brand-left footer", split: "Two-part footer", stacked: "Stacked footer", boxed: "Boxed footer" } as Record<string, string>,
    ann: { rotate: "Rotating banner", marquee: "Scrolling banner", static: "Static banner" } as Record<string, string>,
    card: { minimal: "Minimal cards", boxed: "Boxed cards", overlay: "Text-over-image cards" } as Record<string, string>,
  },
};

/** Capture d'exemple d'une direction (la même en français et en anglais). */
export function directionPreview(id: string): string {
  return `/demo/directions/${id}.jpg`;
}

/** Directions présentées dans la galerie : description, aperçu et combinaison d'en-tête / pied de page (langue de l'interface). */
/** Cartes de la galerie, dans l'ordre de la bibliothèque (1 → 30), avec le premier forfait qui ouvre chaque thème. */
/**
 * Cartes des thèmes proposés : les thèmes actifs, plus (`include`) le thème déjà installé par le projet s'il est retiré
 * du catalogue — affiché comme « thème actuel, retiré », jamais proposé à un autre projet.
 */
export function directionCards(lang: Lang = "fr", include: readonly string[] = []) {
  const cl = CHROME_LABEL[lang];
  const rank = (id: string) => themeRank(id) ?? 99;
  const list = [...ACTIVE_DIRECTIONS, ...DIRECTIONS.filter((d) => include.includes(d.id) && !isActiveThemeId(d.id))];
  return list.sort((a, b) => rank(a.id) - rank(b.id)).map((d) => ({
    id: d.id,
    retired: !isActiveThemeId(d.id),
    name: d.name,
    tagline: pick(lang, d.tagline, DIRECTIONS_EN[d.id].tagline),
    description: pick(lang, d.description, DIRECTIONS_EN[d.id].description),
    dark: DARK_DIRECTIONS.includes(d.id),
    // Une seule capture par direction (les « .en.jpg » n'existent pas) : jamais d'image cassée en anglais.
    preview: directionPreview(d.id),
    chrome: [cl.shape[CHROME[d.id].shape], cl.footer[CHROME[d.id].footer], cl.ann[CHROME[d.id].ann], cl.card[CHROME[d.id].card]],
    plan: planForTheme(d.id),
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
  const need = svc ? bookingNeed(input.services, input.activity ?? "") : null;
  const booking = need && svc ? bookingCalendar(need, lang, svc.services) : null;
  const calRow = (colorScheme: string): Row => ["booking-calendar", { ...booking!.settings, color_scheme: colorScheme, padding_top: 104, padding_bottom: 104 }, booking!.blocks, booking!.hidden ? { disabled: true } : undefined];
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
  // Thèmes du catalogue : sur l'accueil, seules les questions dont la réponse est connue (les autres restent sur la page FAQ).
  const faqAll = svc ? svc.faqBlocks(8) : c.faq.items.map((f) => ({ type: "question", settings: { question: f.q, answer: p(f.a) } }));
  const faqHome = faqAll.filter((b) => !/\[(?:À compléter|To complete)/.test(String(b.settings.answer ?? "") + String(b.settings.question ?? "")));
  const isCat = !!catalogTheme(d.id);
  const faq = isCat && faqHome.length >= 2 ? faqHome : faqAll;
  // Moins de deux réponses connues : la FAQ de l'accueil est posée masquée, à compléter.
  const faqHidden = isCat && faqHome.length < 2;
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
    { eyebrow: "", heading: c.features.heading, heading_align: "left", columns: cols, columns_mobile: features.length === 4 ? "2" : "1", style, link_label: "", color_scheme: scheme(sch), ...pad(104) },
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
  const stats = (sch: 1 | 2 | 3, layout = "grid"): Row[] =>
    statItems.length >= 2 ? [["stats", { eyebrow: c.specs.heading, heading: "", accent_values: true, ...(layout !== "grid" ? { layout } : {}), color_scheme: scheme(sch), ...pad(72) }, statItems.map((x) => ({ type: "stat", settings: { value: x.value, label: x.label } }))]] : [];
  const specList = (sch: 1 | 2 | 3): [string, Record<string, unknown>, typeof specs] => ["specs-list", { heading: c.specs.heading, color_scheme: scheme(sch), ...pad(104) }, specs];
  const faqSec = (sch: 1 | 2, limit = 5, style = "cards"): Row => ["faq", { heading: c.faq.heading, style, structured_data: true, color_scheme: scheme(sch), ...pad(104) }, faq.slice(0, limit), faqHidden ? { disabled: true } : undefined];
  const marq = (sch: 1 | 2 | 3 | 4, size: string, reverse = false): [string, Record<string, unknown>] => ["marquee", { items: marquee, separator: d.id === "brut" ? "●" : d.id === "pop" ? "★" : "✦", size, speed: size === "huge" ? 40 : 30, reverse, color_scheme: scheme(sch) }];
  const cta = (sch: 1 | 3 | 4, asset = im.scene3 ?? im.scene2 ?? im.banner ?? im.hero): [string, Record<string, unknown>] => ["cta-banner", { heading: c.cta.heading, text: p(c.cta.text), button_label: c.cta.button, button_link: productUrl, image_asset: img(asset), overlay: 60, style: "center", parallax: true, color_scheme: scheme(sch), ...pad(152) }];
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

  // ---------------------------------------------------------------- sections V2 et bibliothèque (thèmes du catalogue)
  const isTodo = (x: string) => !x.trim() || x.includes("[");
  const realSpecs = c.specs.items.filter((x) => x.value && !isTodo(x.value) && !isTodo(x.label));
  const shortFacts = realSpecs.filter((x) => x.value.length <= 34);
  const detailPics = [im.detail1, im.detail2, im.scene1, im.scene2, im.packshot].filter((f): f is string => !!f);
  const life = im.lifestyle ?? im.hero ?? im.scene1 ?? im.banner;
  const v2: Kit["v2"] = {
    hero: (layout, sch, texture = "none") => {
      const image = layout === "stage" ? im.cutout ?? im.packshot : layout === "frame" ? im.packshot ?? im.scene1 : layout === "type" || layout === "board" ? undefined : life;
      // Ouverture qui demande une photo sans photo disponible : ouverture typographique (jamais un cadre vide).
      const l = (layout === "type" || layout === "board" || image) ? layout : "type";
      const contact = svc ? [input.services?.phone ? { label: t("Téléphone", "Phone"), value: input.services.phone } : null, input.services?.area ? { label: t("Zone d'intervention", "Service area"), value: input.services.area } : null, input.services?.hours ? { label: t("Horaires", "Hours"), value: input.services.hours.split("\n")[0] } : null].filter((x): x is { label: string; value: string } => !!x) : [];
      const facts = (svc ? contact : shortFacts.map((x) => ({ label: x.label, value: x.value }))).slice(0, l === "type" ? 4 : 3);
      const items = (svc ? (input.services?.services ?? []).map((x) => ({ label: x.name, value: x.price || x.duration || "" })) : c.features.items.map((f) => ({ label: f.title, value: "" }))).slice(0, 5);
      return ["v2-hero", {
        layout: l, eyebrow: c.hero.eyebrow, heading: heroHead, heading_em: heroAccent, text: p(c.hero.text), button_label: c.hero.cta, button_link: productUrl, ...second,
        image_asset: img(l === "type" || l === "board" ? undefined : image), image_alt: input.product.title,
        card_title: l === "board" ? (svc ? t("Nos prestations", "Our services") : t("À découvrir", "To discover")) : l === "type" && facts.length ? (svc ? t("Coordonnées", "Contact details") : t("En bref", "At a glance")) : "",
        texture, veil: 45, color_scheme: scheme(sch), ...pad(l === "frame" ? 88 : 64, 96),
      }, l === "board" ? items.map((x) => ({ type: "item", settings: x })) : facts.map((x) => ({ type: "fact", settings: { label: x.label, value: x.value } }))];
    },
    index: (layout, sch) => {
      const list = svc ? (input.services?.services ?? []).map((x) => ({ title: x.name, text: x.description, meta: [x.price, x.duration].filter(Boolean).join(" · "), icon: "none" })) : c.features.items.map((f) => ({ title: f.title, text: f.text, meta: "", icon: f.icon }));
      return list.length >= 2 ? [["v2-index", { layout, eyebrow: svc ? t("Prestations", "Services") : "", heading: svc ? t("Ce que nous faisons", "What we do") : c.features.heading, intro: "", note: "", color_scheme: scheme(sch), ...pad(104) }, list.slice(0, 6).map((x, i) => ({ type: "item", settings: { title: x.title, text: x.text, meta: x.meta, icon: x.icon || "none", image_asset: layout === "bento" || layout === "cards" ? img(detailPics[i]) : "", link_label: "", link: "" } }))]] : [];
    },
    cards: (layout, sch) => {
      const cols = (input.collections ?? []).filter((x) => x.image);
      const prods = (input.products ?? []).filter((x) => x.images?.[0]);
      const cards = cols.length >= 2
        ? cols.slice(0, 4).map((x) => ({ image_asset: x.image ?? "", title: x.title, text: "", link: `/collections/${x.handle}`, link_label: t("Découvrir", "Discover") }))
        : prods.length >= 2
          ? prods.slice(0, 4).map((x) => ({ image_asset: x.images[0], title: x.title, text: "", link: `/products/${x.handle}`, link_label: t("Voir le produit", "View product") }))
          : detailPics.length >= 2 ? c.features.items.slice(0, Math.min(4, detailPics.length)).map((f, i) => ({ image_asset: detailPics[i], title: f.title, text: p(f.text), link: "", link_label: "" })) : [];
      return cards.length >= 2 ? [["v2-cards", { layout, columns: Math.min(4, Math.max(2, cards.length)), fit: "v2-cover", eyebrow: "", heading: cols.length >= 2 ? t("Explorer la boutique", "Explore the shop") : prods.length >= 2 ? t("Nos produits", "Our products") : c.features.heading, intro: "", link_label: cols.length >= 2 || prods.length >= 2 ? t("Tout voir", "View all") : "", link: cols.length >= 2 || prods.length >= 2 ? "/collections/all" : "", color_scheme: scheme(sch), ...pad(96) }, cards.map((x) => ({ type: "card", settings: x }))]] : [];
    },
    band: (layout, sch) => {
      if (layout === "icons") {
        const items = svc ? (input.services?.services ?? []).slice(0, 4).map((x) => ({ icon: "check", label: x.name, sub: "" })) : shortFacts.slice(0, 4).map((x) => ({ icon: "check", label: x.value.charAt(0).toUpperCase() + x.value.slice(1), sub: x.label }));
        return items.length >= 3 ? [["v2-band", { layout: "icons", text: "", color_scheme: scheme(sch), ...pad(24) }, items.map((x) => ({ type: "item", settings: x }))]] : [];
      }
      const text = [c.statement.heading, shortItems.slice(0, 3).join(" · ")].find((x) => x && x.length <= 80 && !isTodo(x) && norm(x) !== norm(c.hero.heading));
      return text ? [["v2-band", { layout: "rule", text, color_scheme: scheme(sch), ...pad(28) }]] : [];
    },
    split: (layout, sch) => {
      const image = layout === "overlap" ? im.scene2 ?? im.detail1 : im.detail1 ?? im.scene2 ?? im.scene1;
      if (!image || isTodo(c.detail.heading)) return [];
      const points = (svc ? [] : c.product.highlights).filter((x) => !isTodo(x)).slice(0, 4);
      return [["v2-split", { layout, fit: "v2-cover", eyebrow: c.detail.eyebrow, heading: c.detail.heading, text: p(c.detail.text), image_asset: image, image_alt: input.product.title, button_label: c.hero.cta, button_link: productUrl, color_scheme: scheme(sch), ...pad(112) }, points.map((x) => ({ type: "point", settings: { text: x } }))]];
    },
    benefits: (layout, sch) => {
      const items = c.features.items.slice(0, 4);
      const withImages = layout === "images" && detailPics.length >= items.length;
      return items.length >= 2 ? [["v2-benefits", { layout: withImages ? "images" : "icons", columns: Math.min(4, items.length), eyebrow: "", heading: c.features.heading, text: "", color_scheme: scheme(sch), ...pad(96) }, items.map((f, i) => ({ type: "benefit", settings: { image_asset: withImages ? detailPics[i] : "", icon: f.icon || "check", title: f.title, text: f.text } }))]] : [];
    },
    steps: (layout, sch) => c.story.steps.length >= 2 ? [["v2-steps", { layout, eyebrow: "", heading: c.story.heading, color_scheme: scheme(sch), ...pad(104) }, c.story.steps.map((x) => ({ type: "step", settings: { title: x.title, text: p(x.text) } }))]] : [],
    faq: (layout, sch) => {
      const qs = faq.slice(0, 6);
      return qs.length >= 2 ? [["v2-faq", { layout, eyebrow: "", heading: c.faq.heading, text: "", color_scheme: scheme(sch), ...pad(104) }, qs.map((b) => ({ type: "question", settings: { question: String(b.settings.question ?? ""), answer: String(b.settings.answer ?? "") } })), faqHidden ? { disabled: true } : undefined]] : [];
    },
    cta: (layout, sch) => [["v2-cta", { layout, eyebrow: "", heading: c.cta.heading, text: p(c.cta.text), button_label: c.cta.button, button_link: productUrl, ...second, color_scheme: scheme(sch), ...pad(112) }, layout === "band" ? [] : shortFacts.slice(0, 3).map((x) => ({ type: "fact", settings: { label: x.label, value: x.value } }))]],
    specs: (layout, sch) => realSpecs.length >= 2 ? [["v2-specs", { layout: layout === "tiles" && realSpecs.some((x) => x.value.length > 28) ? "table" : layout, eyebrow: t("Fiche", "Details"), heading: c.specs.heading, image_asset: img(layout === "table" ? im.packshot ?? im.cutout : undefined), note: "", color_scheme: scheme(sch), ...pad(104) }, realSpecs.slice(0, 10).map((x) => ({ type: "spec", settings: { label: x.label, value: x.value } }))]] : [],
    media: (layout, sch) => {
      const pics = [im.scene1, im.detail1, im.scene2, im.detail2, im.scene3, im.packshot].filter((f, i, a): f is string => !!f && a.indexOf(f) === i);
      return pics.length >= 3 ? [["v2-media", { layout, eyebrow: "", heading: c.gallery.heading, color_scheme: scheme(sch), ...pad(96) }, pics.slice(0, layout === "rail" ? 6 : 5).map((f, i) => ({ type: "image", settings: { image_asset: f, fit: "v2-cover", caption: c.gallery.captions[i] ?? "" } }))]] : [];
    },
    banner: (layout, sch, opening = false) => {
      // En ouverture : la photo de campagne et le message principal ; plus bas : l'appel final de la marque.
      const image = opening ? im.lifestyle ?? im.banner ?? im.hero ?? im.scene1 : im.scene3 ?? im.scene2 ?? im.banner ?? im.lifestyle2;
      const text = opening ? { eyebrow: c.hero.eyebrow, heading: c.hero.heading, text: p(c.hero.text), button_label: c.hero.cta } : { eyebrow: c.statement.eyebrow, heading: c.cta.heading, text: p(c.cta.text), button_label: c.cta.button };
      return image ? [["v2-banner", { layout, align: "start", full_width: true, veil: opening ? 40 : 50, image_asset: image, image_alt: input.shopName, ...text, button_link: productUrl, color_scheme: scheme(sch), ...pad(0) }]] : [];
    },
    facts: (layout, sch) => {
      const sv = input.services;
      const list = svc && sv
        ? [sv.address ? { icon: "globe", label: t("Adresse", "Address"), value: sv.address.replace(/\n+/g, ", ") } : sv.area ? { icon: "globe", label: t("Zone d'intervention", "Service area"), value: sv.area } : null, sv.hours ? { icon: "clock", label: t("Horaires", "Hours"), value: sv.hours.replace(/\n+/g, " · ") } : null, sv.phone ? { icon: "phone", label: t("Téléphone", "Phone"), value: sv.phone } : null, sv.email ? { icon: "mail", label: t("E-mail", "Email"), value: sv.email } : null].filter((x): x is { icon: string; label: string; value: string } => !!x)
        : shortFacts.slice(0, 4).map((x) => ({ icon: "check", label: x.label, value: x.value }));
      return list.length >= 2 ? [["v2-facts", { layout, eyebrow: "", heading: svc ? t("Infos pratiques", "Practical info") : c.specs.heading, text: "", color_scheme: scheme(sch), ...pad(layout === "strip" ? 40 : 96) }, list.map((x) => ({ type: "fact", settings: { icon: x.icon, label: x.label, value: x.value, link: "" } }))]] : [];
    },
  };
  const DIVIDERS = new Set(["creative-divider", "wave-divider", "marquee", "curved-marquee"]);
  // Ouvertures et médias pleine largeur : collés au bord, sans marge.
  const FULL_BLEED = new Set(["immersive-video", "slideshow", "hero", "hero-flex", "day-night", "double-banner", "video-showcase"]);
  const lib: Kit["lib"] = (type, sch, settings = {}, opts = {}) => {
    const base = { ...settings, color_scheme: scheme(sch), ...(DIVIDERS.has(type) ? {} : FULL_BLEED.has(type) ? pad(0) : pad(96)) };
    if (!input.fill) return [type, base, [], { disabled: true }];
    const r = input.fill(type, base, undefined, { dropBlocks: opts.dropBlocks });
    // Site de services : aucun lien vers une fiche produit ou une collection, les boutons mènent à la prise de contact.
    // Un bouton sans lien mènerait au catalogue par défaut : il reçoit lui aussi le lien de prise de contact.
    const relink = (o: Record<string, unknown>) => {
      if (!svc) return o;
      const out = Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" && /^\/(products|collections)(\/|$)/.test(v) ? productUrl : v]));
      for (const [label, link] of [["button_label", "button_link"], ["button2_label", "button2_link"], ["label", "link"]]) if (out[label] && !out[link]) out[link] = productUrl;
      return out;
    };
    return [type, relink(r.settings), r.blocks.map((b) => ({ type: b.type, settings: relink(b.settings) })), { disabled: !r.complete || !!opts.hide }];
  };
  // Prêt à montrer : blocs « [À compléter] » retirés quand les autres suffisent, sinon section masquée (réalisations et
  // infos pratiques exceptées : leurs photos et coordonnées réelles comptent plus qu'un titre ou un horaire à préciser).
  const PENDING = /\[(?:À compléter|To complete)/;
  const KEEP_VISIBLE = new Set(["portfolio", "practical-info"]);
  const WHOLE = new Set(["comparison-table", "routine-steps", "how-to", "exploded-view", "shipping-journey", "scroll-steps", "pricing"]);
  const NEEDS_BLOCKS = new Set(["features-grid", "stats", "specs-list", "faq", "timeline", "story-circles", "stack-cards", "scroll-story", "horizontal-gallery", "gallery-mosaic", "video-reels", "collection-list", "v2-index", "v2-benefits", "v2-steps", "v2-faq", "v2-specs", "v2-media", "v2-facts"]);
  const prepare = (r: Row): Row => {
    if (r[3]?.disabled || KEEP_VISIBLE.has(r[0])) return r;
    let blocks = r[2];
    const real = blocks?.filter((b) => !PENDING.test(JSON.stringify(b.settings)));
    if (blocks && real && real.length < blocks.length && real.length >= Math.min(2, blocks.length) && !WHOLE.has(r[0])) blocks = real;
    const empty = NEEDS_BLOCKS.has(r[0]) && !blocks?.length;
    return empty || PENDING.test(JSON.stringify([r[1], blocks ?? []])) ? [r[0], r[1], blocks, { disabled: true }] : [r[0], r[1], blocks, r[3]];
  };
  const either: Kit["either"] = (...alts) => {
    const rows = alts.map((a) => (Array.isArray(a[0]) ? (a as Row[]) : a.length ? [a as Row] : [])).filter((x) => x.length);
    return rows.find((x) => x.map(prepare).every((r) => !r[3]?.disabled)) ?? rows[0] ?? [];
  };
  let index: Row[] = [];
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

  // Thème du catalogue : son caractère (réglages) et sa composition d'accueil, avec les sections de la bibliothèque.
  const cat = catalogTheme(d.id);
  const flat = (rows: (Row | Row[])[]): Row[] => rows.flatMap((r) => (Array.isArray(r[0]) ? (r as Row[]) : r.length ? [r as Row] : [])).map(prepare).filter(saysSomethingNew());
  // Section de texte seul (grande phrase, bandeau) qui redit un titre déjà affiché plus haut : retirée (un projet aux
  // textes courts ne répète pas trois fois la même phrase).
  function saysSomethingNew() {
    const said = new Set<string>();
    const TEXT_ONLY = new Set(["rich-text", "v2-band"]);
    return (r: Row) => {
      if (r[3]?.disabled) return true;
      const own = [r[1].heading, r[1].heading_em ? `${r[1].heading} ${r[1].heading_em}` : "", r[0] === "v2-band" ? r[1].text : "", ...(r[2] ?? []).filter((b) => b.type === "heading").map((b) => b.settings.text)].map((x) => norm(String(x ?? ""))).filter((x) => x.length > 3);
      if (TEXT_ONLY.has(r[0]) && own.length && own.every((x) => said.has(x))) return false;
      for (const x of own) said.add(x);
      return true;
    };
  }
  const kit: Kit = {
    t, im, services: !!svc,
    privacy: t('<p>Désinscription possible à tout moment grâce au lien présent dans chaque e-mail. <a href="/policies/privacy-policy">Politique de confidentialité</a></p>', '<p>Unsubscribe at any time using the link in every email. <a href="/policies/privacy-policy">Privacy policy</a></p>'),
    heroSplit: (sch, pos, asset) => heroSplit(sch, pos, asset),
    heroFull, feat, iwt, statementRow, stats, specList, faqSec, marq, cta, newsletter, hgallery, mosaicSec, featured,
    video: (sch, ratio) => (hasVideo ? [video(sch, ratio)] : []),
    circles, stackCards, timelineSec, curve, reels, wave, story,
    v2, lib, either,
    R: svc?.R,
  };
  if (cat) {
    const L = cat.look;
    headerLayout = L.headerLayout;
    radius = L.radius;
    buttonStyle = L.button;
    headingCase = L.headingCase;
    tracking = L.tracking;
    headingScale = L.headingScale;
    glow = L.glow;
    shine = L.shine;
    darkTheme = L.dark;
    gallery = L.gallery;
    index = flat(cat.home(kit));
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
    const recipes: Partial<Record<DirectionId, Row[]>> = {
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
    index = cat ? flat(cat.services(kit)) : recipes[d.id]!;
    // Vague d'ouverture sans phrase centrée (phrase identique au titre) : la vague n'a plus rien à relier.
    if (index[1]?.[0] === "wave-divider") index.splice(1, 1);
    // Réservation exigée par l'activité : le vrai calendrier, réglé sur les horaires du client, dans tous les thèmes.
    if (booking) {
      const at = index.findIndex((r) => r[0] === "booking-calendar");
      const last = index.length - 1;
      const replace = at >= 0 ? at : index[last]?.[0] === "cta-banner" && !booking.hidden ? last : -1;
      const row = calRow(String(index[replace]?.[1]?.color_scheme ?? scheme(1)));
      if (replace >= 0) index[replace] = row;
      else index.splice(last >= 0 && index[last][0] === "cta-banner" ? last : index.length, 0, row);
      // Horaires inconnus : calendrier masqué, et la demande de réservation avec date reste visible sur l'accueil.
      if (booking.hidden) {
        const shown = index.findIndex((r) => r[0] === "booking" && !r[3]?.disabled);
        if (shown >= 0) index[shown] = [index[shown][0], { ...index[shown][1], ask_date: true }, index[shown][2], index[shown][3]];
        else {
          const b = R.booking(2);
          index.splice(index.findIndex((r) => r[0] === "booking-calendar"), 0, [b[0], { ...b[1], ask_date: true }, b[2]]);
        }
      }
    } else {
      // Pas de réservation à faire ici (ou faite par un service en ligne, intégré à la page Rendez-vous) : jamais un
      // calendrier aux horaires par défaut, il est posé masqué.
      // Sans autre moyen de contact sur l'accueil, la section de prise de contact (ou de réservation en ligne) le remplace.
      const at = index.findIndex((r) => r[0] === "booking-calendar");
      const contact = index.some((r, i) => i !== at && ["practical-info", "v2-facts", "booking", "contact-form"].includes(r[0]) && !r[3]?.disabled);
      if (at >= 0) index[at] = contact ? [index[at][0], index[at][1], index[at][2], { disabled: true }] : R.booking(Number(String(index[at][1].color_scheme ?? "").replace("scheme-", "")) || 1);
    }
  }

  const reference = referenceHomeRows(input, c, kit, svc);
  if (reference) {
    // Conserver aussi le calendrier masqué et le formulaire de secours lorsque les horaires manquent.
    const bookingRows = index.filter((r) => r[0] === "booking-calendar" || (booking?.hidden && r[0] === "booking" && !r[3]?.disabled));
    const reassurance = index.find((r) => r[0] === "reassurance");
    const collections = index.find((r) => r[0] === "collection-list");
    index = reference;
    if (bookingRows.length) index.splice(index.length - 1, 0, ...bookingRows);
    if (reassurance && !svc) index.splice(index.length - 1, 0, reassurance);
    if (collections && !svc) index.splice(3, 0, collections);
  }

  // Catalogue : les textes rédigés pour le produit principal ne s'affichent que sur sa fiche.
  const only = isCatalog ? { product_handle: input.product.handle } : {};
  // Un onglet dont tout le contenu est « [À compléter : …] » n'est pas posé : rien d'inachevé sur la fiche (l'information manquante
  // reste signalée dans le studio ; l'onglet se rajoute depuis la bibliothèque une fois renseigné).
  const todoOnly = (html: string) => !html.replace(/\[(À compléter|To complete)[^\]]*\]/g, "").replace(/<[^>]+>/g, "").trim();
  const productTabs = c.product.tabs.filter((tab) => !todoOnly(tab.content_html)).map((tab) => ({ type: "collapsible", settings: { heading: tab.heading, content: p(tab.content_html), open: false, ...(/livraison|retour|shipping|deliver|return/i.test(tab.heading) ? {} : only) } }));
  // La description répète souvent l'accroche puis les faits (déjà en points forts et dans l'onglet « Caractéristiques ») :
  // elle n'est posée que si, une fois ces textes retirés, il reste quelque chose à lire.
  function descriptionAddsSomething(): boolean {
    const norm = (s: string) => stripTags(s).toLowerCase().replace(/\s+/g, " ").trim();
    const letters = (s: string) => s.normalize("NFD").replace(/[^a-z0-9]/g, "");
    let rest = norm(input.product.description_html);
    if (rest === norm(c.product.short)) return false;
    const known = [c.product.short, ...c.product.highlights, ...c.product.tabs.map((x) => x.content_html)].map(norm).filter(Boolean);
    for (const t of known) rest = rest.split(t).join(" ");
    // Ce qui reste, lettres seules, dont on retire encore chaque fragment connu (intitulés et valeurs des onglets).
    let left = letters(rest);
    for (const t of known) for (const frag of t.split(/[,;:•·\n]/).map(letters).filter((x) => x.length >= 4)) left = left.split(frag).join("");
    return left.length > 24;
  }
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
    ...(descriptionAddsSomething() ? [{ type: "description", settings: {} }] : isCatalog ? [{ type: "description", settings: { hide_for_handle: input.product.handle } }] : []),
    ...productTabs,
    ...(c.product.reassurance.length
      ? [{ type: "reassurance", settings: { item1: c.product.reassurance[0] ?? "", icon1: "truck", item2: c.product.reassurance[1] ?? "", icon2: "return", item3: c.product.reassurance[2] ?? "", icon3: "shield" } }]
      : []),
  ];
  const mainProductRow: Row = ["main-product", { gallery_layout: gallery, sticky_bar: true, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 96, ...(cat?.mainProduct ?? {}) }, productBlocks];
  const recommendationsRow: Row = ["product-recommendations", { heading: t("Vous aimerez aussi", "You may also like"), limit: 4, color_scheme: "scheme-1", padding_top: 64, padding_bottom: 96 }];
  // Thème de référence : sa propre suite de sections sous le corps de la fiche (avis, arguments, caractéristiques, FAQ).
  const productTpl = tpl(ids, cat?.product ? [mainProductRow, ...flat(cat.product(kit)), recommendationsRow] : [
    mainProductRow,
    ["product-reviews", { heading: t("Avis des clients", "Customer reviews"), anchor: reviewsAnchor, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 32 }],
    story(2),
    ...(specs.length ? [specList(1)] : []),
    faqSec(2, 4),
    recommendationsRow,
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
    templates["page.contact"] = tpl(ids, booking && !booking.hidden
      ? [calRow(scheme(1)), R.practical(2, false), R.contactForm(1, t("Une autre demande ?", "Something else?"))]
      : [booking ? (([a, b, c]) => [a, { ...b, ask_date: true }, c] as Row)(R.booking(1)) : R.booking(1), R.practical(2, false), ...(svc.bookingUrl ? [R.contactForm(1)] : []), ...(booking ? [calRow(scheme(2))] : [])]);
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
    page_width: cat ? cat.look.pageWidth : d.id === "galerie" ? 1400 : 1320,
    spacing_scale: cat ? cat.look.spacing : d.id === "galerie" ? 110 : 100,
    // Langage des sections V2 (ornements, cadres, rythme) : propre à chaque thème du catalogue.
    ...(cat ? { ds_language: cat.look.ds, ds_density: cat.look.density } : {}),
    style_preset: d.id,
    button_radius: Math.min(40, radius.button),
    card_radius: Math.min(40, radius.card),
    button_style: buttonStyle,
    button_uppercase: cat ? cat.look.buttonUppercase : buttonStyle !== "frame" && d.id !== "gourmand",
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
    // Thème de référence : profils globaux (« conversion », éditorial) qui portent son caractère.
    ...(cat?.settings ?? {}),
  };

  // Chaque page de contenu commence par un titre de page (h1) quand sa première section visible n'en porte pas
  // (FAQ, contact, prestations, à propos…) : un seul h1 par page, pour l'accessibilité et le référencement.
  ensurePageTitles(ids, templates);

  const result = tidyComposition({
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
      // SEO de la fiche produit rédigé avec les textes de la boutique : envoyé à la plateforme (jamais perdu).
      product: input.copy.seo?.title?.trim() ? { ...input.product, seo: { title: input.copy.seo.title.trim(), description: (input.copy.seo.description ?? "").trim() } } : input.product,
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
            {
              title: t("Boutique", "Shop"),
              url: "/collections/all",
              // Sous-menu : les collections (liste déroulante, méga menu ou accordéon mobile selon l'en-tête).
              ...(isCatalog && (input.collections ?? []).length ? { links: (input.collections ?? []).slice(0, 8).map((col) => ({ title: col.title, url: `/collections/${col.handle}` })) } : {}),
            },
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
  if (isReferenceTheme(d.id, !!svc)) {
    result.meta = { ...result.meta, reference: { version: 1, kind: svc ? "services" : "products", links: [] } };
    // Identités enregistrées au moment de la construction, pas déduites plus tard des titres ou de l'ordre.
    if (svc) for (const [sid, section] of Object.entries(result.templates.index.sections)) if (section.type === "ref-offers") {
      const services = input.services!.services.filter((s) => s.name.trim());
      (section.block_order ?? []).forEach((bid, i) => result.meta!.reference!.links.push({ template: "index", section: sid, block: bid, target: `service:${services[i].key || `legacy-${i}`}` }));
    }
    const header = Object.values(result.groups.header.sections).find((s) => s.type === "header");
    const footer = Object.values(result.groups.footer.sections).find((s) => s.type === "footer");
    if (header) Object.assign(header.settings, { layout: svc ? "reference-studio" : "reference-shop", shape: "bar", icons: "plain", mobile_menu: "sheet", transparent_on_home: false });
    if (footer) Object.assign(footer.settings, { style: svc ? "reference-studio" : "reference-shop", show_wordmark: true });
    result.settings.fab_contact_link = "";
    result.settings.fab_back_to_top = false;
    Object.assign(result.settings, { type_heading_font: input.fonts?.heading ?? (svc ? "archivo_n6" : "cormorant_n5"), type_body_font: input.fonts?.body ?? (svc ? "work_sans_n4" : "dm_sans_n4"), page_width: 1500, spacing_scale: 100, ds_language: svc ? "craft" : "maison", ds_density: "balanced", heading_scale: 100, heading_tracking: 0, button_radius: svc ? 4 : 0, card_radius: 0, button_uppercase: false, button_shine: false, glow_enabled: false, motion_intensity: "subtle", motion_parallax: false });
    for (const section of Object.values(result.templates.product.sections)) if (section.type === "main-product") {
      section.settings.sticky_bar = false;
      section.settings.gallery_layout = "carousel";
      for (const block of Object.values(section.blocks ?? {})) if (block.type === "buy_buttons") block.settings.show_dynamic_checkout = false;
    }
  }
  return result;
}
