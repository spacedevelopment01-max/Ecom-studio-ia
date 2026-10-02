/**
 * Directions artistiques : chaque direction compose la boutique avec ses
 * propres sections, son rythme, ses typographies et ses animations. L'IA
 * peut partir d'une direction puis la personnaliser librement ; ce module
 * fournit aussi le point de départ du moteur local.
 */
import { contrast, ensureContrast, isDark, mix, onColor, withLightness, hsl } from "../color";
import type { ShopCopy } from "./copy";
import type { BlockInstance, GroupJson, SectionInstance, StoreProduct, TemplateJson, ThemeSpec } from "./spec";

export type DirectionId = "atelier" | "clinique" | "brut" | "terroir" | "nocturne" | "pop" | "galerie" | "elan";

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
    tagline: "Éditorial raffiné",
    description: "Grandes capitales serif, produit détouré qui flotte au-dessus du titre, filets fins et lenteur maîtrisée. Pour les objets qui se regardent de près.",
    bestFor: ["beauté", "parfum", "bijoux", "maison haut de gamme"],
    fonts: { heading: "cormorant_n4", body: "jost_n4" },
    previewFonts: { heading: "Cormorant", body: "Jost" },
    motion: "normal",
  },
  {
    id: "clinique",
    name: "Clinique",
    tagline: "Précis et lumineux",
    description: "Grilles nettes, fiches techniques mises en avant, blanc lumineux et accents de couleur fonctionnels. Pour rassurer par la clarté.",
    bestFor: ["soin", "bien-être", "high-tech", "bébé"],
    fonts: { heading: "dm_sans_n4", body: "dm_sans_n4" },
    previewFonts: { heading: "DM Sans", body: "DM Sans" },
    motion: "subtle",
  },
  {
    id: "brut",
    name: "Brut",
    tagline: "Contraste et capitales",
    description: "Typographie massive en capitales, cadres épais, bandeau défilant géant et vidéo plein écran. Pour les marques qui assument.",
    bestFor: ["streetwear", "accessoires", "gadgets", "boissons"],
    fonts: { heading: "archivo_n7", body: "chivo_n4" },
    previewFonts: { heading: "Archivo", body: "Chivo" },
    motion: "expressive",
  },
  {
    id: "terroir",
    name: "Terroir",
    tagline: "Chaleureux et artisanal",
    description: "Serif à empattements doux, tons de terre, grain discret et récit en alternance images et textes. Pour le fait-main et l'origine.",
    bestFor: ["épicerie fine", "artisanat", "bougies", "céramique"],
    fonts: { heading: "lora_n4", body: "work_sans_n4" },
    previewFonts: { heading: "Lora", body: "Work Sans" },
    motion: "subtle",
  },
  {
    id: "nocturne",
    name: "Nocturne",
    tagline: "Sombre et technologique",
    description: "Fond profond, lueurs autour des visuels, verre dépoli et présentation du produit au défilement. Pour la tech et le premium nocturne.",
    bestFor: ["high-tech", "audio", "gaming", "parfum"],
    fonts: { heading: "space_grotesk_n4", body: "dm_sans_n4" },
    previewFonts: { heading: "Space Grotesk", body: "DM Sans" },
    motion: "normal",
  },
  {
    id: "pop",
    name: "Pop",
    tagline: "Vif et arrondi",
    description: "Couleurs franches, formes arrondies, cartes légèrement inclinées et animations rebondies. Pour les marques joyeuses et directes.",
    bestFor: ["enfants", "animaux", "snacking", "papeterie"],
    fonts: { heading: "montserrat_n7", body: "karla_n4" },
    previewFonts: { heading: "Montserrat", body: "Karla" },
    motion: "expressive",
  },
  {
    id: "galerie",
    name: "Galerie",
    tagline: "Blanc d'exposition",
    description: "Beaucoup d'air, mosaïque éditoriale, cartels en italique et défilement horizontal. Pour les pièces uniques et la décoration.",
    bestFor: ["décoration", "art", "mobilier", "mode"],
    fonts: { heading: "libre_baskerville_n4", body: "karla_n4" },
    previewFonts: { heading: "Libre Baskerville", body: "Karla" },
    motion: "subtle",
  },
  {
    id: "elan",
    name: "Élan",
    tagline: "Sportif et dynamique",
    description: "Italiques rapides, coupes obliques, vidéo d'ouverture et bandeau incliné. Pour le sport, l'outdoor et la performance.",
    bestFor: ["sport", "outdoor", "gourdes", "nutrition"],
    fonts: { heading: "montserrat_n7", body: "work_sans_n4" },
    previewFonts: { heading: "Montserrat", body: "Work Sans" },
    motion: "expressive",
  },
];

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
      const bg = withLightness(deep, 0.07, 0.8);
      s1 = scheme(bg, "#F2F2F0", withLightness(p.accent, 0.62, 1.1), 0.06);
      s2 = scheme(withLightness(deep, 0.11, 0.8), "#F2F2F0", withLightness(p.accent, 0.62, 1.1), 0.06);
      s3 = scheme("#F4F4F1", "#111111", p.accent);
      s4 = scheme(withLightness(p.accent, 0.55, 1.1), "#0B0B0B", "#0B0B0B");
      break;
    }
    case "brut": {
      s1 = scheme("#FFFFFF", "#0A0A0A", "#0A0A0A");
      s2 = scheme(withLightness(p.accent, 0.92, 0.9), "#0A0A0A", "#0A0A0A");
      s3 = scheme("#0A0A0A", "#FFFFFF", withLightness(p.accent, 0.6, 1.2));
      s4 = scheme(withLightness(p.accent, 0.6, 1.25), "#0A0A0A", "#0A0A0A");
      break;
    }
    case "pop": {
      s1 = scheme(withLightness(p.light, 0.97, 0.7), withLightness(deep, 0.14), p.primary);
      s2 = scheme(withLightness(p.secondary, 0.9, 1.1), withLightness(deep, 0.14), p.primary);
      s3 = scheme(withLightness(p.primary, 0.3, 1.1), "#FFFFFF", withLightness(p.accent, 0.7, 1.2));
      s4 = scheme(withLightness(p.accent, 0.62, 1.2), "#111111", "#111111");
      break;
    }
    case "galerie": {
      s1 = scheme("#FFFFFF", "#161616", deep);
      s2 = scheme("#F6F5F2", "#161616", deep);
      s3 = scheme("#161616", "#F4F3EF", "#F4F3EF");
      s4 = scheme(withLightness(p.primary, 0.9, 0.4), "#161616", "#161616");
      break;
    }
    case "clinique": {
      s1 = scheme("#FFFFFF", withLightness(deep, 0.14, 0.6), withLightness(p.primary, 0.42, 1));
      s2 = scheme(withLightness(p.primary, 0.965, 0.5), withLightness(deep, 0.14, 0.6), withLightness(p.primary, 0.42, 1));
      s3 = scheme(withLightness(p.primary, 0.2, 0.8), "#FFFFFF", withLightness(p.primary, 0.8, 0.8));
      s4 = scheme(withLightness(p.primary, 0.42, 1), "#FFFFFF", "#FFFFFF");
      break;
    }
    case "terroir": {
      s1 = scheme(withLightness(p.light, 0.95, 0.9), withLightness(deep, 0.16, 0.9), withLightness(p.primary, 0.38, 1));
      s2 = scheme(withLightness(p.secondary, 0.88, 0.8), withLightness(deep, 0.16, 0.9), withLightness(p.primary, 0.32, 1));
      s3 = scheme(withLightness(p.primary, 0.2, 0.9), withLightness(p.light, 0.94, 0.8), withLightness(p.accent, 0.7, 1));
      s4 = scheme(withLightness(p.accent, 0.55, 1), "#1A140F", "#1A140F");
      break;
    }
    case "elan": {
      s1 = scheme("#FFFFFF", "#101010", withLightness(p.accent, 0.5, 1.2));
      s2 = scheme("#F1F2F2", "#101010", withLightness(p.accent, 0.5, 1.2));
      s3 = scheme(withLightness(deep, 0.1), "#FFFFFF", withLightness(p.accent, 0.6, 1.2));
      s4 = scheme(withLightness(p.accent, 0.52, 1.25), onColor(withLightness(p.accent, 0.52, 1.25)), "#101010");
      break;
    }
    default: {
      // atelier
      s1 = scheme(warmLight, withLightness(deep, 0.13, 0.7), withLightness(p.primary, 0.3, 0.9));
      s2 = scheme(mix(warmLight, p.secondary, 0.22), withLightness(deep, 0.13, 0.7), withLightness(p.primary, 0.3, 0.9));
      s3 = scheme(withLightness(deep, 0.12, 0.6), withLightness(p.light, 0.94, 0.5), withLightness(p.accent, 0.78, 0.8));
      s4 = scheme(withLightness(p.accent, 0.8, 0.7), withLightness(deep, 0.13, 0.7), withLightness(deep, 0.13, 0.7));
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
  logo?: string;
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

  const heroSplit = (sch: 1 | 2, pos: "right" | "left", asset = im.hero ?? im.packshot): [string, Record<string, unknown>] => [
    "hero-split",
    { eyebrow: c.hero.eyebrow, heading: c.hero.heading, text: p(c.hero.text), button_label: c.hero.cta, button_link: "/products/" + input.product.handle, image_asset: img(asset), image_position: pos, height: "large", parallax: true, color_scheme: scheme(sch), ...pad(64, 96) },
  ];
  const heroFull = (sch: 1 | 3, align = "bottom-left"): [string, Record<string, unknown>] => [
    "hero-fullbleed",
    { eyebrow: c.hero.eyebrow, heading: c.hero.heading, text: p(c.hero.text), button_label: c.hero.cta, button_link: "/products/" + input.product.handle, image_asset: img(im.videoPoster ?? im.hero), video_asset: img(im.video), overlay: 30, height: "screen", align, parallax: true, show_scroll_cue: true, color_scheme: scheme(sch) },
  ];
  const heroEdito = (sch: 1 | 2): [string, Record<string, unknown>] => [
    "hero-editorial",
    { eyebrow: c.hero.eyebrow, heading_line1: c.hero.line1, heading_line2: c.hero.line2, text: p(c.hero.text), button_label: c.hero.cta, button_link: "/products/" + input.product.handle, image_asset: img(im.cutout ?? im.packshot), image_alt: input.product.title, parallax: true, color_scheme: scheme(sch), ...pad(56, 96) },
  ];
  const story = (sch: 1 | 2 | 3): [string, Record<string, unknown>, typeof storySteps] => ["scroll-story", { heading: c.story.heading, image_asset: img(im.packshot ?? im.hero), color_scheme: scheme(sch), ...pad(96) }, storySteps];
  const feat = (sch: 1 | 2 | 3, style: string, cols = Math.min(4, Math.max(2, features.length))): [string, Record<string, unknown>, typeof features] => ["features-grid", { heading: c.features.heading, heading_align: "left", columns: cols > 4 ? 3 : cols, style, color_scheme: scheme(sch), ...pad(96) }, features];
  const iwt = (sch: 1 | 2 | 3, layout: string, asset = im.scene1, reveal = "curtain"): [string, Record<string, unknown>] => ["image-with-text", { eyebrow: c.detail.eyebrow, heading: c.detail.heading, text: p(c.detail.text), image_asset: img(asset), layout, ratio: "portrait", reveal, parallax: layout === "overlap", color_scheme: scheme(sch), ...pad(96) }];
  const statement = (sch: 1 | 2 | 3 | 4, style = "statement"): [string, Record<string, unknown>, { type: string; settings: Record<string, unknown> }[]] => [
    "rich-text",
    { align: "center", style, color_scheme: scheme(sch), ...pad(112) },
    [
      ...(c.statement.eyebrow ? [{ type: "eyebrow", settings: { text: c.statement.eyebrow } }] : []),
      { type: "heading", settings: { text: c.statement.heading, size: "h2" } },
      ...(c.statement.text ? [{ type: "text", settings: { text: p(c.statement.text) } }] : []),
    ],
  ];
  const specList = (sch: 1 | 2 | 3): [string, Record<string, unknown>, typeof specs] => ["specs-list", { heading: c.specs.heading, color_scheme: scheme(sch), ...pad(96) }, specs];
  const faqSec = (sch: 1 | 2, limit = 5): [string, Record<string, unknown>, typeof faq] => ["faq", { heading: c.faq.heading, structured_data: true, color_scheme: scheme(sch), ...pad(96) }, faq.slice(0, limit)];
  const marq = (sch: 1 | 3 | 4, size: string, reverse = false): [string, Record<string, unknown>] => ["marquee", { items: marquee, separator: d.id === "brut" ? "●" : d.id === "pop" ? "★" : "✦", size, speed: size === "huge" ? 40 : 30, reverse, color_scheme: scheme(sch) }];
  const cta = (sch: 3 | 4, asset = im.banner ?? im.scene3 ?? im.hero): [string, Record<string, unknown>] => ["cta-banner", { heading: c.cta.heading, text: p(c.cta.text), button_label: c.cta.button, button_link: "/products/" + input.product.handle, image_asset: img(asset), overlay: 40, style: "center", parallax: true, color_scheme: scheme(sch), ...pad(144) }];
  const newsletter = (sch: 1 | 2 | 4): [string, Record<string, unknown>] => ["newsletter", { heading: c.newsletter.heading, text: p(c.newsletter.text), button_label: "S'inscrire", legal: "Désinscription possible à tout moment.", color_scheme: scheme(sch), ...pad(96) }];
  const hgallery = (sch: 1 | 2 | 3): [string, Record<string, unknown>, typeof gallerySlides] => ["horizontal-gallery", { heading: c.gallery.heading, color_scheme: scheme(sch), ...pad(96) }, gallerySlides];
  const mosaicSec = (sch: 1 | 2, layout = "editorial"): [string, Record<string, unknown>, typeof mosaic] => ["gallery-mosaic", { heading: c.gallery.heading, layout, color_scheme: scheme(sch), ...pad(96) }, mosaic];
  const featured = (sch: 1 | 2): [string, Record<string, unknown>] => ["featured-product", { eyebrow: c.hero.eyebrow, text: p(c.product.short), image_asset: img(im.packshot), show_quantity: true, color_scheme: scheme(sch), ...pad(96) }];
  const video = (sch: 1 | 3, ratio = "16/9"): [string, Record<string, unknown>] => ["video-showcase", { heading: "", video_asset: img(im.video), poster_asset: img(im.videoPoster), ratio, width: "full", autoplay: true, controls: false, caption: "", color_scheme: scheme(sch), ...pad(0) }];

  const hasVideo = !!im.video;
  type Row = [string, Record<string, unknown>, { type: string; settings: Record<string, unknown> }[]?];
  let index: Row[];
  let gallery = "stack";
  let headerLayout = "logo-left";
  let radius = { button: 0, card: 0 };
  let buttonStyle = "solid";
  let headingCase = "none";
  let tracking = 0;
  let headingScale = 100;
  switch (d.id) {
    case "atelier":
      headerLayout = "logo-center";
      headingScale = 105;
      index = [heroEdito(1), marq(3, "small"), iwt(1, "image-left", im.scene1, "curtain"), story(2), statement(1, "quote"), feat(1, "lines", 3), ...(hasVideo ? [video(3)] : []), specList(2), faqSec(1), newsletter(2)];
      break;
    case "clinique":
      radius = { button: 8, card: 14 };
      headingScale = 95;
      tracking = -2;
      gallery = "carousel";
      index = [heroSplit(2, "right", im.packshot ?? im.hero), feat(1, "cards", 3), specList(2), iwt(1, "overlap", im.scene1, "zoom"), story(1), faqSec(2), cta(4)];
      break;
    case "brut":
      headingCase = "uppercase";
      tracking = -3;
      headingScale = 110;
      headerLayout = "logo-left";
      gallery = "grid";
      index = [heroFull(3), marq(4, "huge"), featured(1), feat(1, "lines", 3), mosaicSec(1), marq(3, "large", true), hgallery(2), cta(3)];
      break;
    case "terroir":
      radius = { button: 4, card: 8 };
      headerLayout = "split";
      index = [heroSplit(1, "left", im.scene1 ?? im.hero), statement(2), iwt(1, "image-right", im.detail1, "curtain"), feat(1, "plain", 3), iwt(2, "image-left", im.scene2 ?? im.scene1, "zoom"), story(1), faqSec(2), newsletter(1)];
      break;
    case "nocturne":
      radius = { button: 999, card: 18 };
      tracking = -3;
      gallery = "carousel";
      index = [hasVideo ? heroFull(1, "center") : heroEdito(1), story(2), feat(1, "cards", 3), hgallery(1), specList(2), cta(3), faqSec(1)];
      break;
    case "pop":
      radius = { button: 999, card: 24 };
      headingScale = 105;
      index = [heroSplit(2, "right", im.packshot ?? im.hero), marq(4, "large"), feat(1, "cards", 3), mosaicSec(1, "even"), featured(2), faqSec(1), newsletter(2)];
      break;
    case "galerie":
      headerLayout = "minimal";
      headingScale = 92;
      index = [heroSplit(1, "left", im.hero ?? im.scene1), mosaicSec(1), statement(1, "quote"), hgallery(2), specList(1), newsletter(2)];
      break;
    case "elan":
      headingCase = "uppercase";
      headingScale = 108;
      tracking = -2;
      gallery = "grid";
      index = [hasVideo ? heroFull(3) : heroSplit(2, "right"), marq(4, "large"), feat(1, "lines", 3), story(2), featured(1), cta(3), faqSec(1)];
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
    { type: "description", settings: {} },
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
    ...(c.about.values.length ? [["features-grid", { heading: "Ce qui nous guide", heading_align: "left", columns: Math.min(4, Math.max(2, c.about.values.length)), style: "lines", color_scheme: "scheme-1", ...pad(96) }, c.about.values.map((v) => ({ type: "feature", settings: { title: v.title, text: p(v.text), icon: "none" } }))] as Row] : []),
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
    "page.faq": tpl(ids, [["faq", { heading: c.faq.heading, text: "", structured_data: true, color_scheme: "scheme-1", ...pad(96) }, faq], ["contact-form", { heading: "Une autre question ?", text: p(c.contact.text), color_scheme: "scheme-2", ...pad(96) }]]),
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
      ...(c.announcement.length ? [["announcement-bar", { color_scheme: "scheme-3" }, c.announcement.map((t) => ({ type: "announcement", settings: { text: t, link: "" } }))] as Row] : []),
      ["header", { menu: "main-menu", layout: headerLayout, sticky: true, transparent_on_home: index[0]?.[0] === "hero-fullbleed", show_search: true, color_scheme: "scheme-1" }],
    ]),
  };
  const footer: GroupJson = {
    type: "footer",
    name: "Groupe pied de page",
    ...tpl(ids, [
      ["footer", { show_wordmark: d.id !== "clinique", show_policies: true, show_payment: true, color_scheme: "scheme-3" }, [
        { type: "text", settings: { heading: input.shopName, text: p(c.footer.about) } },
        { type: "links", settings: { heading: "Boutique", menu: "main-menu" } },
        { type: "links", settings: { heading: "Aide", menu: "footer" } },
        { type: "newsletter", settings: { heading: "Restons en contact", text: c.footer.newsletter } },
      ]],
    ]),
  };

  const settings: Record<string, unknown> = {
    logo_asset: img(im.logo),
    logo_width: 150,
    favicon_asset: img(im.favicon),
    color_schemes: colorSchemes(d.id, input.palette),
    type_heading_font: input.fonts?.heading ?? d.fonts.heading,
    type_body_font: input.fonts?.body ?? d.fonts.body,
    heading_scale: headingScale,
    body_scale: 100,
    heading_case: headingCase,
    heading_tracking: tracking,
    heading_weight_boost: 0,
    page_width: d.id === "galerie" ? 1400 : 1320,
    spacing_scale: d.id === "galerie" ? 110 : 100,
    style_preset: d.id,
    button_radius: Math.min(40, radius.button),
    card_radius: Math.min(32, radius.card),
    button_style: buttonStyle,
    button_uppercase: headingCase === "uppercase" || d.id === "atelier",
    motion_enabled: true,
    motion_intensity: d.motion,
    motion_parallax: true,
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
