/**
 * Directions artistiques : chaque direction compose la boutique avec ses
 * propres sections, son rythme, ses typographies et ses animations. L'IA
 * peut partir d'une direction puis la personnaliser librement ; ce module
 * fournit aussi le point de départ du moteur local.
 */
import { contrast, ensureContrast, isDark, mix, onColor, withLightness, hsl } from "../color";
import type { ShopCopy } from "./copy";
import type { BlockInstance, GroupJson, SectionInstance, StoreProduct, TemplateJson, ThemeSpec } from "./spec";

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
};

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const p = (html: string) => (/^\s*</.test(html) ? html : `<p>${html}</p>`);

export function buildSpec(input: BuildInput): ThemeSpec {
  const d = directionById(input.direction);
  const ids = new Ids();
  const c = input.copy;
  const im = input.images;
  const scheme = (n: 1 | 2 | 3 | 4) => `scheme-${n}`;
  const pad = (top: number, bottom = top) => ({ padding_top: top, padding_bottom: bottom });
  const img = (asset?: string) => asset ?? "";

  const storySteps = c.story.steps.map((s, i) => ({
    type: "step",
    settings: { title: s.title, text: p(s.text), image_asset: img([im.detail1, im.detail2, im.scene2, im.packshot][i]) },
  }));
  const features = c.features.items.map((f) => ({ type: "feature", settings: { title: f.title, text: p(f.text), icon: f.icon } }));
  const specs = c.specs.items.map((s) => ({ type: "spec", settings: { label: s.label, value: s.value } }));
  const faq = c.faq.items.map((f) => ({ type: "question", settings: { question: f.q, answer: p(f.a) } }));
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
  const productUrl = "/products/" + input.product.handle;
  const second = { button2_label: "Notre histoire", button2_link: "/pages/notre-histoire" };

  const heroSplit = (sch: 1 | 2, pos: "right" | "left", asset = im.hero ?? im.packshot): [string, Record<string, unknown>] => [
    "hero-split",
    { badge, eyebrow: c.hero.eyebrow, heading: heroHead, heading_accent: heroAccent, text: p(c.hero.text), button_label: c.hero.cta, button_link: productUrl, ...second, image_asset: img(asset), image_position: pos, height: "large", parallax: true, color_scheme: scheme(sch), ...pad(72, 104) },
  ];
  const heroFull = (sch: 1 | 3, align = "bottom-left", font: "heading" | "body" = "body"): [string, Record<string, unknown>] => [
    "hero-fullbleed",
    { badge, eyebrow: "", heading: heroHead, heading_accent: heroAccent, heading_font: font, text: p(c.hero.text), button_label: c.hero.cta, button_link: productUrl, ...second, image_asset: img(im.banner ?? im.hero ?? im.scene1), video_asset: img(im.video), overlay: 25, height: "screen", align, parallax: true, show_scroll_cue: true, color_scheme: scheme(sch) },
  ];
  const heroEdito = (sch: 1 | 2): [string, Record<string, unknown>] => [
    "hero-editorial",
    { eyebrow: c.hero.eyebrow, heading_line1: c.hero.line1, heading_line2: c.hero.line2, text: p(c.hero.text), button_label: c.hero.cta, button_link: productUrl, image_asset: img(im.cutout ?? im.packshot), image_alt: input.product.title, parallax: true, color_scheme: scheme(sch), ...pad(56, 104) },
  ];
  const story = (sch: 1 | 2 | 3): [string, Record<string, unknown>, typeof storySteps] => ["scroll-story", { heading: c.story.heading, image_asset: img(im.packshot ?? im.hero), color_scheme: scheme(sch), ...pad(104) }, storySteps];
  const glowFeatures = features.map((f) => ({ ...f, settings: { ...f.settings, link_label: "Découvrir", link: productUrl } }));
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
  const newsletter = (sch: 1 | 2 | 3 | 4): [string, Record<string, unknown>] => ["newsletter", { heading: c.newsletter.heading, text: p(c.newsletter.text), button_label: "S'inscrire", legal: "Désinscription possible à tout moment.", color_scheme: scheme(sch), ...pad(104) }];
  const hgallery = (sch: 1 | 2 | 3): [string, Record<string, unknown>, typeof gallerySlides] => ["horizontal-gallery", { heading: c.gallery.heading, color_scheme: scheme(sch), ...pad(104) }, gallerySlides];
  const mosaicSec = (sch: 1 | 2, layout = "editorial"): [string, Record<string, unknown>, typeof mosaic] => ["gallery-mosaic", { heading: c.gallery.heading, layout, color_scheme: scheme(sch), ...pad(104) }, mosaic];
  const featured = (sch: 1 | 2): [string, Record<string, unknown>] => ["featured-product", { eyebrow: c.hero.eyebrow, text: p(c.product.short), image_asset: img(im.packshot), show_quantity: true, color_scheme: scheme(sch), ...pad(104) }];
  const video = (sch: 1 | 3, ratio = "16/9"): [string, Record<string, unknown>] => ["video-showcase", { heading: "", video_asset: img(im.video), poster_asset: img(im.videoPoster), ratio, width: "full", autoplay: true, controls: false, caption: "", color_scheme: scheme(sch), ...pad(0) }];


  // Sections narratives (cercles, cartes empilées, frise, texte en courbe, vidéos verticales, vagues).
  const circleItems = [
    [im.packshot, "Le produit", productUrl],
    [im.detail1, "Les détails", productUrl],
    [im.scene1, "En situation", productUrl],
    [im.scene2 ?? im.detail2, "Notre histoire", "/pages/notre-histoire"],
    [im.detail2 ?? im.scene3, "Questions", "/pages/faq"],
  ].filter((x) => x[0]) as [string, string, string][];
  const circles = (sch: 1 | 2): Row[] => (circleItems.length >= 3 ? [["story-circles", { heading: "", color_scheme: scheme(sch), ...pad(56, 40) }, circleItems.map(([a, label, link]) => ({ type: "circle", settings: { image_asset: a, label, link } }))]] : []);
  const stackImages = [im.detail1, im.scene1, im.detail2, im.scene2, im.packshot].filter(Boolean) as string[];
  const stackCards = (sch: 1 | 2): Row[] =>
    features.length >= 2 && stackImages.length >= 2
      ? [["stack-cards", { heading: c.features.heading, heading_accent: "", color_scheme: scheme(sch), ...pad(104) }, c.features.items.slice(0, 4).map((f, i) => ({ type: "card", settings: { image_asset: stackImages[i % stackImages.length], eyebrow: "", title: f.title, text: p(f.text), button_label: "Découvrir", link: productUrl } }))]]
      : [];
  const timelineSec = (sch: 1 | 2): Row[] =>
    c.story.steps.length >= 2 ? [["timeline", { heading: c.story.heading, heading_accent: "", image_asset: img(im.scene2 ?? im.scene1), color_scheme: scheme(sch), ...pad(104) }, c.story.steps.map((st) => ({ type: "step", settings: { title: st.title, text: p(st.text) } }))]] : [];
  const curveText = shortItems.length ? shortItems.slice(0, 2).join(" ✦ ") : input.shopName;
  const curve = (sch: 1 | 2 | 3 | 4): Row => ["curved-marquee", { text: curveText, separator: "✦", curve: 70, size: "large", color_scheme: scheme(sch), ...pad(24) }];
  const reels = (sch: 1 | 2 | 3): Row[] =>
    im.reels?.length ? [["video-reels", { heading: "En mouvement", heading_accent: "", color_scheme: scheme(sch), ...pad(88) }, im.reels.map((r) => ({ type: "reel", settings: { video_asset: r.video, poster_asset: r.poster ?? "", caption: "" } }))]] : [];
  const wave = (from: 1 | 2 | 3 | 4, to: 1 | 2 | 3 | 4): Row => ["wave-divider", { from_scheme: scheme(from), color_scheme: scheme(to), amplitude: 40 }];
  const hasVideo = !!im.video;
  type Row = [string, Record<string, unknown>, { type: string; settings: Record<string, unknown> }[]?];
  let index: Row[];
  let gallery = "stack";
  let headerLayout = "logo-left";
  let headerShape = "floating";
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
      headerShape = "bar";
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
      headerShape = "bar";
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
      headerShape = "boxed";
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
      headerShape = "boxed";
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
      headerShape = "bar";
      radius = { button: 40, card: 28 };
      headingScale = 108;
      glow = 0;
      shine = false;
      index = [
        // Ouverture vidéo puis grande phrase centrée ; sans vidéo, héros produit puis phrase (si elle diffère).
        ...(hasVideo ? [video(1, "16/9"), statement(3, "statement", true)] : [heroSplit(1, "right", im.packshot ?? im.hero), ...statementRow(3, "statement", true)]),
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

  const productTabs = c.product.tabs.map((t) => ({ type: "collapsible", settings: { heading: t.heading, content: p(t.content_html), open: false } }));
  const productBlocks = [
    { type: "eyebrow", settings: { text: input.shopName } },
    { type: "title", settings: {} },
    { type: "price", settings: {} },
    { type: "text", settings: { text: p(c.product.short) } },
    { type: "buy_buttons", settings: { picker: "buttons", show_quantity: true, show_dynamic_checkout: true } },
    ...(c.product.highlights.length ? [{ type: "highlights", settings: { items: c.product.highlights.join("\n") } }] : []),
    // La description n'est affichée que si elle apporte plus que l'accroche courte.
    ...(stripTags(input.product.description_html) !== stripTags(c.product.short) ? [{ type: "description", settings: {} }] : []),
    ...productTabs,
    ...(c.product.reassurance.length
      ? [{ type: "reassurance", settings: { item1: c.product.reassurance[0] ?? "", icon1: "truck", item2: c.product.reassurance[1] ?? "", icon2: "return", item3: c.product.reassurance[2] ?? "", icon3: "shield" } }]
      : []),
  ];
  const productTpl = tpl(ids, [
    ["main-product", { gallery_layout: gallery, sticky_bar: true, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 96 }, productBlocks],
    story(2),
    ...(specs.length ? [specList(1)] : []),
    faqSec(2, 4),
    ["product-recommendations", { heading: "Vous aimerez aussi", limit: 4, color_scheme: "scheme-1", padding_top: 64, padding_bottom: 96 }],
  ]);

  const aboutTpl = tpl(ids, [
    ["rich-text", { align: "center", style: "statement", color_scheme: "scheme-1", ...pad(120, 64) }, [
      { type: "eyebrow", settings: { text: "Notre histoire" } },
      { type: "heading", settings: { text: c.about.heading, size: "h1" } },
      { type: "text", settings: { text: p(c.about.intro) } },
    ]],
    ...c.about.blocks.map((b, i): Row => ["image-with-text", { eyebrow: "", heading: b.heading, text: p(b.text), image_asset: img([im.scene1, im.detail1, im.scene2, im.detail2][i]), layout: i % 2 ? "image-right" : "image-left", ratio: "portrait", reveal: "curtain", parallax: false, color_scheme: i % 2 ? "scheme-2" : "scheme-1", ...pad(96) }]),
    ...(c.about.values.length ? [["features-grid", { heading: "Ce qui nous guide", heading_align: "left", columns: Math.min(3, Math.max(2, c.about.values.length)), style: "glow", color_scheme: "scheme-2", ...pad(96) }, c.about.values.map((v) => ({ type: "feature", settings: { title: v.title, text: p(v.text), icon: "sparkle" } }))] as Row] : []),
    cta(3),
  ]);

  const templates: Record<string, TemplateJson> = {
    index: tpl(ids, index),
    product: productTpl,
    collection: tpl(ids, [["main-collection", { per_page: 16, columns: 3, enable_filters: true, enable_sorting: true, color_scheme: "scheme-1" }]]),
    "list-collections": tpl(ids, [["main-list-collections", { heading: "Catalogue", color_scheme: "scheme-1" }]]),
    search: tpl(ids, [["main-search", { color_scheme: "scheme-1" }]]),
    cart: tpl(ids, [["main-cart", { color_scheme: "scheme-1" }]]),
    page: tpl(ids, [["main-page", { width: "narrow", color_scheme: "scheme-1", ...pad(64, 96) }]]),
    "page.about": aboutTpl,
    "page.faq": tpl(ids, [["faq", { heading: c.faq.heading, text: "", style: "cards", structured_data: true, color_scheme: "scheme-1", ...pad(96) }, faq], ["contact-form", { heading: "Une autre question ?", text: p(c.contact.text), color_scheme: "scheme-2", ...pad(96) }]]),
    "page.contact": tpl(ids, [["contact-form", { heading: c.contact.heading, text: p(c.contact.text), color_scheme: "scheme-1", ...pad(64, 120) }]]),
    "page.shipping": tpl(ids, [["main-page", { width: "narrow", color_scheme: "scheme-1", ...pad(64, 96) }], ["rich-text", { align: "left", style: "plain", color_scheme: "scheme-2", ...pad(64) }, [{ type: "heading", settings: { text: c.shipping.heading, size: "h3" } }, { type: "text", settings: { text: c.shipping.body_html } }]]]),
    "404": tpl(ids, [["main-404", { heading: "Cette page s'est égarée.", text: "Le lien est peut-être ancien. Le reste de la boutique vous attend.", color_scheme: "scheme-1" }]]),
    blog: tpl(ids, [["main-blog", { color_scheme: "scheme-1" }]]),
    article: tpl(ids, [["main-article", { color_scheme: "scheme-1" }]]),
    password: { ...tpl(ids, [["main-password", { heading: "Bientôt en ligne" }]]), layout: "password" },
  };

  const header: GroupJson = {
    type: "header",
    name: "Groupe en-tête",
    ...tpl(ids, [
      ...(c.announcement.length ? [["announcement-bar", { color_scheme: darkTheme ? "scheme-3" : "scheme-3" }, c.announcement.map((t) => ({ type: "announcement", settings: { text: t, link: "" } }))] as Row] : []),
      ["header", { menu: "main-menu", layout: headerLayout, sticky: true, transparent_on_home: index[0]?.[0] === "hero-fullbleed", show_search: true, color_scheme: "scheme-1" }],
    ]),
  };
  const footer: GroupJson = {
    type: "footer",
    name: "Groupe pied de page",
    ...tpl(ids, [
      ["footer", { show_wordmark: d.id !== "clinique", show_policies: true, show_payment: true, color_scheme: darkTheme ? "scheme-2" : "scheme-3" }, [
        { type: "text", settings: { heading: input.shopName, text: p(c.footer.about) } },
        { type: "links", settings: { heading: "Boutique", menu: "main-menu" } },
        { type: "links", settings: { heading: "Aide", menu: "footer" } },
        { type: "newsletter", settings: { heading: "Restons en contact", text: c.footer.newsletter } },
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
    header_shape: headerShape,
    motion_enabled: true,
    motion_intensity: d.motion,
    motion_parallax: true,
    fab_back_to_top: true,
    fab_contact_link: "/pages/contact",
    fab_contact_icon: "chat",
    fab_contact_label: "Nous contacter",
    cart_type: "drawer",
    cart_show_note: false,
    cart_reassurance: "",
    social_instagram: input.social?.instagram ?? "",
    social_tiktok: input.social?.tiktok ?? "",
    social_facebook: input.social?.facebook ?? "",
    social_youtube: input.social?.youtube ?? "",
    social_pinterest: input.social?.pinterest ?? "",
  };

  return {
    v: 1,
    name: `${input.shopName} — ${d.name}`,
    direction: d.id,
    settings,
    groups: { header, footer },
    templates,
    customSections: {},
    files: input.files,
    locks: [],
    store: {
      shopName: input.shopName,
      product: input.product,
      pages: [
        { handle: "notre-histoire", title: "Notre histoire", template_suffix: "about", body_html: "" },
        { handle: "faq", title: "Questions fréquentes", template_suffix: "faq", body_html: "" },
        { handle: "contact", title: "Contact", template_suffix: "contact", body_html: "" },
        { handle: "livraison-et-retours", title: "Livraison et retours", template_suffix: "shipping", body_html: "<p>Les conditions détaillées figurent ci-dessous.</p>" },
      ],
      menus: {
        "main-menu": {
          title: "Menu principal",
          links: [
            { title: "Accueil", url: "/" },
            { title: "Boutique", url: "/collections/all" },
            { title: "Notre histoire", url: "/pages/notre-histoire" },
            { title: "FAQ", url: "/pages/faq" },
            { title: "Contact", url: "/pages/contact" },
          ],
        },
        footer: {
          title: "Pied de page",
          links: [
            { title: "Livraison et retours", url: "/pages/livraison-et-retours" },
            { title: "Contact", url: "/pages/contact" },
            { title: "Recherche", url: "/search" },
          ],
        },
      },
      policies: [
        { handle: "terms-of-service", title: "Conditions générales de vente", body_html: "<p>[À compléter dans Shopify : Paramètres › Politiques]</p>" },
        { handle: "privacy-policy", title: "Politique de confidentialité", body_html: "<p>[À compléter dans Shopify : Paramètres › Politiques]</p>" },
        { handle: "refund-policy", title: "Politique de remboursement", body_html: "<p>[À compléter dans Shopify : Paramètres › Politiques]</p>" },
        { handle: "legal-notice", title: "Mentions légales", body_html: "<p>[À compléter dans Shopify : Paramètres › Politiques]</p>" },
      ],
    },
  };
}
