/**
 * Reproduction d'un site existant sur la plateforme conseillée par le studio :
 * Shopify pour une boutique (produits), WordPress pour un site de services.
 *
 * « À l'identique » veut dire : mêmes pages, même menu (libellés et ordre), mêmes textes mot pour mot,
 * mêmes images, logo, couleurs et polices (ou la police disponible la plus proche), même ordre des blocs.
 * Le code du thème d'origine n'est jamais copié : chaque bloc lu sur le site est placé dans la section
 * du studio qui lui ressemble le plus. Rien n'est ajouté qui ne figure pas sur le site
 * (ni avis, ni chiffres, ni accroches) ; ce qui manque reste « [À compléter : …] ».
 *
 * La version produite est une version normale du thème : aperçu, sections modifiables,
 * export Shopify / WordPress et Theme Check.
 */
import { all } from "../db";
import { assetMeta, type Asset } from "../library";
import { loadProject, saveThemeVersion } from "../projects";
import { contrast, ensureContrast, isDark, luminance, mix, onColor } from "../color";
import { pick, type Lang } from "../i18n";
import { C, L, contentLang } from "../i18n-server";
import type { JobContext } from "../jobs";
import { buildSpec, type BrandPalette, type DirectionId } from "../theme/directions";
import type { ShopCopy } from "../theme/copy";
import { validateSpec } from "../theme/ops";
import { sectionSchema, type BlockInstance, type SectionInstance, type StoreCollection, type StorePage, type StoreProduct, type TemplateJson, type ThemeSpec } from "../theme/spec";
import { FONT_FILES } from "../theme/render";
import type { SiteBlock, SiteImport, SitePage, SitePlatform, SiteProduct } from "./site-types";

export type ReproduceInput = {
  projectId?: string;
  language: "fr" | "en";
  /** Images du site importées dans la bibliothèque : adresse absolue d'origine → fichier du thème et média. */
  assets: Record<string, { file: string; assetId: string }>;
  logo?: { file: string; assetId: string };
};

// ---------------------------------------------------------------- outils

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Texte du site → HTML de réglage « richtext » (paragraphes ; HTML existant nettoyé). */
function richtext(text: string | undefined): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  if (/<(p|ul|ol|h[1-6]|br|strong|em|a)\b/i.test(t)) {
    const clean = sanitizeHtml(t);
    return /^\s*<(p|ul|ol|h[1-6])[\s>]/i.test(clean) ? clean : `<p>${clean}</p>`;
  }
  return t
    .split(/\n{2,}/)
    .map((para) => `<p>${esc(para.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Nettoyage d'un HTML lu sur le site : balises de mise en forme seulement, liens sûrs, aucun script ni attribut d'événement. */
export function sanitizeHtml(html: string): string {
  const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "h4", "h5", "h6", "a", "blockquote"]);
  return html
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|form)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (all, tag: string, attrs: string) => {
      const t = tag.toLowerCase();
      if (!allowed.has(t)) return "";
      if (all.startsWith("</")) return `</${t}>`;
      if (t === "a") {
        const href = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)')/i);
        const url = (href?.[2] ?? href?.[3] ?? "").trim();
        return /^(https?:|mailto:|tel:|\/|#)/i.test(url) ? `<a href="${esc(url)}">` : "<a>";
      }
      return `<${t}>`;
    })
    .trim();
}

const SHOPIFY_FONT_WEIGHTS: Record<string, number[]> = Object.fromEntries(Object.entries(FONT_FILES).map(([k, v]) => [k, Object.keys(v.files).map(Number)]));

/** Polices disponibles dans le studio, par famille lue sur le site (ou par style le plus proche). */
const FONT_MATCH: [RegExp, string][] = [
  [/playfair/i, "playfair_display"],
  [/libre baskerville|baskerville/i, "libre_baskerville"],
  [/cormorant|garamond|caslon|bodoni|didot/i, "cormorant"],
  [/lora|merriweather|georgia|times|pt serif|noto serif|source serif|crimson|spectral|dm serif|abril|prata|cardo/i, "lora"],
  [/\binter\b|roboto|helvetica|arial|open sans|lato|source sans|noto sans|system-ui|apple-system|segoe|ibm plex sans|figtree|public sans/i, "inter"],
  [/montserrat|poppins|raleway|outfit|urbanist|lexend/i, "montserrat"],
  [/dm sans|nunito|quicksand|mulish|plus jakarta|manrope/i, "dm_sans"],
  [/jost|futura|avenir|josefin|century gothic/i, "jost"],
  [/work sans/i, "work_sans"],
  [/karla|rubik|barlow|cabin/i, "karla"],
  [/space grotesk|sora|syne|space mono/i, "space_grotesk"],
  [/archivo|oswald|anton|bebas|league gothic/i, "archivo"],
  [/chivo/i, "chivo"],
];

/**
 * Police du studio la plus proche d'une famille lue sur le site.
 * `exact` : même famille disponible ; sinon une famille de même style (empattements ou non).
 */
export function matchFont(family: string | undefined, role: "heading" | "body"): { handle: string; family: string; exact: boolean } {
  const name = (family ?? "").replace(/["']/g, "").split(",")[0].trim();
  let key = FONT_MATCH.find(([re]) => re.test(name))?.[1];
  if (!key) key = /serif/i.test(name) && !/sans/i.test(name) ? (role === "heading" ? "playfair_display" : "lora") : "inter";
  const fam = FONT_FILES[key];
  const weights = SHOPIFY_FONT_WEIGHTS[key];
  const want = role === "body" ? [400] : fam.fallback === "serif" ? [600, 700, 400] : [700, 600, 400];
  const w = want.find((x) => weights.includes(x)) ?? weights[0];
  return { handle: `${key}_n${String(w)[0]}`, family: fam.family, exact: !!name && fam.family.toLowerCase() === name.toLowerCase() };
}

// ---------------------------------------------------------------- couleurs

type Scheme = { background: string; surface: string; text: string; muted: string; accent: string; accent_text: string; border: string };
const HEX = /^#[0-9a-f]{6}$/i;
const normHex = (c: string | undefined) => {
  if (!c) return undefined;
  const v = c.trim();
  if (/^#[0-9a-f]{3}$/i.test(v)) return ("#" + v.slice(1).split("").map((x) => x + x).join("")).toUpperCase();
  return HEX.test(v) ? v.toUpperCase() : undefined;
};

/** Palette du site, complétée prudemment si une couleur manque (fond blanc, texte presque noir). */
export function sitePalette(site: SiteImport): BrandPalette {
  const p = site.palette;
  const found = (site.colorsFound ?? []).map(normHex).filter(Boolean) as string[];
  const light = normHex(p?.light) ?? found.find((c) => luminance(c) > 0.85) ?? "#FFFFFF";
  const dark = normHex(p?.dark) ?? found.find((c) => luminance(c) < 0.05) ?? "#1A1A1A";
  const primary = normHex(p?.primary) ?? found.find((c) => c !== light && c !== dark) ?? dark;
  return { primary, secondary: normHex(p?.secondary) ?? light, accent: normHex(p?.accent) ?? primary, light, dark };
}

function scheme(bg: string, text: string, accent: string): Scheme {
  // Le texte du site est gardé tel quel s'il reste lisible (contraste 4,5:1) ; sinon il est foncé ou éclairci juste assez.
  const t = contrast(text, bg) >= 4.5 ? text : ensureContrast(text, bg, 4.5);
  return {
    background: bg,
    surface: mix(bg, t, 0.045),
    text: t,
    muted: ensureContrast(mix(t, bg, 0.35), bg, 4.5),
    accent,
    accent_text: onColor(accent),
    border: mix(bg, t, 0.14),
  };
}

/** Jeux de couleurs du thème construits avec les couleurs exactes du site. */
export function siteSchemes(pal: BrandPalette): Record<string, { settings: Scheme }> {
  const bg = pal.light;
  const alt = pal.secondary !== pal.light && contrast(pal.dark, pal.secondary) >= 4.5 && !isDark(pal.secondary) === !isDark(bg) ? pal.secondary : mix(bg, pal.dark, 0.05);
  return {
    "scheme-1": { settings: scheme(bg, pal.dark, pal.primary) },
    "scheme-2": { settings: scheme(alt, pal.dark, pal.primary) },
    // Fond sombre (héros sur photo, pied de page sombre) : boutons à la couleur de marque si elle reste visible.
    "scheme-3": { settings: scheme(pal.dark, pal.light, [pal.primary, pal.accent].find((c) => contrast(c, pal.dark) >= 3) ?? pal.light) },
    "scheme-4": { settings: scheme(pal.primary, onColor(pal.primary), onColor(pal.primary)) },
  };
}

// ---------------------------------------------------------------- direction

const SERIF = (f?: string) => !!f && matchFont(f, "heading").handle.match(/^(playfair|libre|cormorant|lora)/) !== null;

/**
 * Direction dont la composition est la plus proche du site : fond sombre → Nocturne ;
 * titres à empattements → Galerie (sobre, éditoriale) ; sinon Clinique (nette, sans empattements).
 * Ses couleurs, polices et son logo sont ensuite remplacés par ceux du site.
 */
export function closestDirection(site: SiteImport): DirectionId {
  const pal = sitePalette(site);
  if (isDark(pal.light)) return "nocturne";
  if (SERIF(site.fonts?.heading)) return "galerie";
  return "clinique";
}

const blankCopy = (): ShopCopy => ({
  seo: { title: "", description: "" },
  announcement: [],
  hero: { eyebrow: "", heading: "", line1: "", line2: "", text: "", cta: "" },
  statement: { eyebrow: "", heading: "", text: "" },
  features: { heading: "", items: [] },
  story: { heading: "", steps: [] },
  detail: { eyebrow: "", heading: "", text: "" },
  specs: { heading: "", items: [] },
  faq: { heading: "", items: [] },
  marquee: [],
  gallery: { heading: "", captions: [] },
  cta: { heading: "", text: "", button: "" },
  newsletter: { heading: "", text: "" },
  product: { title: "", short: "", description_html: "", highlights: [], tabs: [], reassurance: [] },
  about: { heading: "", intro: "", blocks: [], values: [] },
  shipping: { heading: "", body_html: "" },
  contact: { heading: "", text: "" },
  footer: { about: "", newsletter: "" },
});

// ---------------------------------------------------------------- reproduction

const TEXT_TYPES = new Set(["text", "textarea", "richtext", "inline_richtext", "url", "html"]);

/** Réglages complets d'une section : tous les textes par défaut du thème sont vidés (rien d'ajouté au site). */
function filled(defs: { type: string; id?: string }[] | undefined, values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of defs ?? []) if (d.id && TEXT_TYPES.has(d.type)) out[d.id] = "";
  for (const [k, v] of Object.entries(values)) if (v !== undefined) out[k] = v;
  return out;
}

type Row = { type: string; settings: Record<string, unknown>; blocks?: { type: string; settings: Record<string, unknown> }[] };

function pageHandle(path: string, used: Set<string>): string {
  const last = path.split(/[?#]/)[0].replace(/\/+$/, "").split("/").filter(Boolean).pop() ?? "";
  const base = slug(decodeURIComponent(last).replace(/\.(html?|php|aspx?)$/i, "")) || "page";
  let h = base;
  for (let i = 2; used.has(h); i++) h = `${base}-${i}`;
  used.add(h);
  return h;
}

const normPath = (p: string) => {
  try {
    return decodeURIComponent(p.split(/[?#]/)[0]).replace(/\/index\.(html?|php)$/i, "/").replace(/\/+$/, "").toLowerCase() || "/";
  } catch {
    return p.replace(/\/+$/, "").toLowerCase() || "/";
  }
};
const hostOf = (u: URL) => u.hostname.replace(/^www\./, "");

/**
 * Construit le thème reproduisant le site : direction la plus proche, puis couleurs, polices, logo,
 * menu, pages, blocs et produits du site.
 */
export function reproduceSpec(site: SiteImport, input: ReproduceInput): ThemeSpec {
  const lang: Lang = input.language;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const todo = (what: string) => t(`[À compléter : ${what}]`, `[To complete: ${what}]`);
  const services = site.business === "services";
  const direction = closestDirection(site);
  const pal = sitePalette(site);
  const shopName = site.name?.trim() || todo(t("nom du site", "site name"));
  const files: Record<string, string> = {};
  const origin = (() => {
    try {
      return new URL(site.finalUrl || site.url);
    } catch {
      return new URL("https://site.invalid/");
    }
  })();
  const abs = (src: string) => {
    try {
      return new URL(src, origin).href;
    } catch {
      return src;
    }
  };
  /** Image du site → fichier du thème (seulement si elle a bien été importée). */
  const image = (src?: string): string => {
    if (!src) return "";
    const a = input.assets[src] ?? input.assets[abs(src)];
    if (!a) return "";
    files[a.file] = a.assetId;
    return a.file;
  };

  // Base : la direction la plus proche (réglages, en-tête, pied de page et gabarits techniques).
  const base = buildSpec({
    direction,
    shopName,
    palette: pal,
    copy: blankCopy(),
    images: {},
    files: {},
    product: { title: shopName, handle: "produit", vendor: shopName, description_html: "", price: null, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [], tags: [] },
    language: lang,
  });
  const schemaSpec = { customSections: {}, language: lang } as const;
  const sec = (type: string, values: Record<string, unknown>, blocks?: { type: string; settings: Record<string, unknown> }[]): Row => {
    const schema = sectionSchema(schemaSpec, type);
    return {
      type,
      settings: filled(schema?.settings, values),
      ...(blocks ? { blocks: blocks.map((b) => ({ type: b.type, settings: filled(schema?.blocks.find((x) => x.type === b.type)?.settings, b.settings) })) } : {}),
    };
  };
  let counter = 0;
  const tplOf = (rows: Row[]): TemplateJson => {
    const out: TemplateJson = { sections: {}, order: [] };
    for (const r of rows) {
      const sid = `${r.type.replace(/[^a-z0-9]/gi, "_")}_${++counter}`;
      const s: SectionInstance = { type: r.type, settings: r.settings };
      if (r.blocks?.length) {
        const blocks: Record<string, BlockInstance> = {};
        const order: string[] = [];
        r.blocks.forEach((b, i) => {
          const bid = `${b.type.replace(/[^a-z0-9]/gi, "_")}_${counter}_${i + 1}`;
          blocks[bid] = { type: b.type, settings: b.settings };
          order.push(bid);
        });
        s.blocks = blocks;
        s.block_order = order;
      }
      out.sections[sid] = s;
      out.order.push(sid);
    }
    return out;
  };

  // ----- produits (boutique)
  const productList: StoreProduct[] = [];
  const productByPath = new Map<string, string>();
  if (!services) {
    const usedHandles = new Set<string>();
    for (const sp of site.products) {
      let handle = slug(sp.handle || sp.title) || "produit";
      for (let i = 2; usedHandles.has(handle); i++) handle = `${slug(sp.handle || sp.title)}-${i}`;
      usedHandles.add(handle);
      productList.push(storeProductOf(sp, handle, shopName, image, lang));
      if (sp.url) productByPath.set(normPath(new URL(sp.url, origin).pathname), handle);
      productByPath.set(`/products/${slug(sp.handle)}`, handle);
    }
  }
  const mainProduct: StoreProduct = productList[0] ?? {
    title: services ? shopName : todo(t("produit", "product")),
    handle: services ? "prestation" : "produit",
    vendor: shopName,
    description_html: "",
    price: null,
    compare_at_price: null,
    currency: "EUR",
    options: [],
    variants: [{ title: "Default Title", options: ["Default Title"], price: null, available: true }],
    images: [],
    tags: [],
  };
  // Catégories du site (lues sur les produits) → collections.
  const collections: StoreCollection[] = [];
  if (!services) {
    const byCat = new Map<string, string[]>();
    productList.forEach((p, i) => {
      const cat = site.products[i]?.category?.trim();
      if (cat) byCat.set(cat, [...(byCat.get(cat) ?? []), p.handle]);
    });
    for (const [title, handles] of byCat) collections.push({ handle: slug(title) || "collection", title, description: "", products: handles });
  }

  // ----- pages et adresses
  const home = site.pages.find((p) => p.type === "home") ?? site.pages.find((p) => normPath(p.path) === "/") ?? site.pages[0];
  const usedPages = new Set<string>(["contact-form"]);
  const pageEntries: { page: SitePage; handle: string; suffix: string }[] = [];
  const pathMap = new Map<string, string>();
  if (home) pathMap.set(normPath(home.path), "/");
  pathMap.set("/", "/");
  for (const page of site.pages) {
    if (page === home) continue;
    if (!services && (page.type === "product" || page.type === "collection")) continue;
    const handle = pageHandle(page.path, usedPages);
    pageEntries.push({ page, handle, suffix: `site-${handle}`.slice(0, 50) });
    pathMap.set(normPath(page.path), `/pages/${handle}`);
  }
  const mapLink = (url?: string): string => {
    if (!url) return "";
    const u0 = url.trim();
    if (/^(mailto:|tel:|#)/i.test(u0)) return u0;
    let u: URL;
    try {
      u = new URL(u0, origin);
    } catch {
      return u0;
    }
    if (!/^https?:$/.test(u.protocol)) return u0;
    if (hostOf(u) !== hostOf(origin)) return u.href;
    const p = normPath(u.pathname);
    const hash = u.hash && u.hash.length > 1 ? u.hash : "";
    const mapped = pathMap.get(p);
    if (mapped) return mapped + hash;
    if (!services) {
      const prod = productByPath.get(p) ?? productList.find((x) => p.endsWith(`/${x.handle}`))?.handle;
      if (prod) return `/products/${prod}`;
      const col = collections.find((c) => p.endsWith(`/${c.handle}`));
      if (col) return `/collections/${col.handle}`;
      if (/\/(collections?|shop|boutique|store|catalog(ue)?|products?|produits?)(\/|$)/.test(p)) return "/collections/all";
    }
    // Adresse du site qui n'a pas été lue : le lien vers la page d'origine est conservé.
    return u.href;
  };

  // ----- blocs → sections
  const extraCollections: StoreCollection[] = [];
  const sectionsFor = (page: SitePage): Row[] => {
    const rows: Row[] = [];
    const blocks = page.blocks;
    let i = 0;
    while (i < blocks.length) {
      const b = blocks[i];
      // Titre isolé juste avant un bloc qui n'a pas de titre : il devient le titre de ce bloc.
      if (b.kind === "heading") {
        const next = blocks[i + 1];
        if (next && ["features", "gallery", "products", "testimonials", "faq", "contact"].includes(next.kind) && !(next as { heading?: string }).heading) {
          rows.push(...blockRows({ ...next, heading: b.text } as SiteBlock));
          i += 2;
          continue;
        }
      }
      // Titres et paragraphes qui se suivent : une seule section de texte, dans le même ordre.
      if (b.kind === "heading" || b.kind === "text") {
        const run: SiteBlock[] = [];
        while (i < blocks.length && (blocks[i].kind === "heading" || blocks[i].kind === "text")) run.push(blocks[i++]);
        rows.push(textRow(run));
        continue;
      }
      // Images qui se suivent : une galerie.
      if (b.kind === "image") {
        const run: { src: string; alt?: string }[] = [];
        while (i < blocks.length && blocks[i].kind === "image") run.push(blocks[i++] as { src: string; alt?: string });
        const imgs = run.map((x) => image(x.src)).filter(Boolean);
        const first = run.find((x) => image(x.src));
        if (imgs.length === 1 && first) rows.push(...blockRows({ kind: "image", src: first.src, alt: first.alt }));
        else if (imgs.length) rows.push(sec("gallery-mosaic", { heading: "", layout: imgs.length >= 3 ? "editorial" : "even", color_scheme: "scheme-1", padding_top: 48, padding_bottom: 48 }, imgs.map((f) => ({ type: "image", settings: { image_asset: f, caption: "" } }))));
        continue;
      }
      rows.push(...blockRows(b));
      i++;
    }
    if (!rows.length) {
      rows.push(sec("rich-text", { align: "left", style: "plain", color_scheme: "scheme-1", padding_top: 80, padding_bottom: 80 }, [
        { type: "heading", settings: { text: page.title || shopName, size: "h1" } },
        { type: "text", settings: { text: `<p>${esc(todo(t(`contenu de la page « ${page.title} » (non lu sur le site)`, `content of the "${page.title}" page (not read from the site)`)))}</p>` } },
      ]));
    }
    return rows;
  };

  const button = (btn?: { label: string; url: string }) => (btn?.label ? { label: btn.label, link: mapLink(btn.url) } : null);

  const textRow = (run: SiteBlock[]): Row => {
    const blocks: { type: string; settings: Record<string, unknown> }[] = [];
    for (const b of run) {
      if (b.kind === "heading") blocks.push({ type: "heading", settings: { text: b.text, size: b.level <= 1 ? "h1" : b.level === 2 ? "h2" : "h3" } });
      else if (b.kind === "text") blocks.push({ type: "text", settings: { text: richtext(b.text) } });
    }
    return sec("rich-text", { align: "left", style: "plain", color_scheme: "scheme-1", padding_top: 56, padding_bottom: 56 }, blocks);
  };

  const blockRows = (b: SiteBlock): Row[] => {
    switch (b.kind) {
      case "hero": {
        const img = image(b.image);
        const btn = button(b.button);
        if (img)
          return [sec("hero-fullbleed", { badge: "", eyebrow: "", heading: b.heading, heading_accent: "", heading_font: "heading", text: richtext(b.text), button_label: btn?.label ?? "", button_link: btn?.link ?? "", button2_label: "", button2_link: "", image_asset: img, video_asset: "", overlay: 35, height: "large", align: "center", parallax: false, show_scroll_cue: false, color_scheme: "scheme-3" })];
        return [sec("rich-text", { align: "center", style: "plain", color_scheme: "scheme-1", padding_top: 120, padding_bottom: 104 }, [
          { type: "heading", settings: { text: b.heading, size: "h1" } },
          ...(b.text ? [{ type: "text", settings: { text: richtext(b.text) } }] : []),
          ...(btn ? [{ type: "button", settings: { label: btn.label, link: btn.link, secondary: false } }] : []),
        ])];
      }
      case "heading":
      case "text":
        return [textRow([b])];
      case "image": {
        // Image seule : bandeau pleine largeur, sans texte ni voile.
        const f = image(b.src);
        return f ? [sec("hero", { eyebrow: "", heading: "", text: "", button_label: "", button_link: "", image_asset: f, image_alt: b.alt ?? "", video_asset: "", height: "small", align: "center", text_color: "light", overlay: 0, color_scheme: "scheme-1" })] : [];
      }
      case "image-text": {
        const f = image(b.image);
        const btn = button(b.button);
        if (!f) return [textRow([...(b.heading ? [{ kind: "heading", level: 2, text: b.heading } as SiteBlock] : []), { kind: "text", text: b.text }])];
        return [sec("image-with-text", { image_asset: f, layout: b.imageSide === "right" ? "image-right" : "image-left", ratio: "landscape", reveal: "up", parallax: false, eyebrow: "", heading: b.heading ?? "", text: richtext(b.text), button_label: btn?.label ?? "", button_link: btn?.link ?? "", color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 })];
      }
      case "features": {
        if (!b.items.length) return [];
        return [sec("features-grid", { eyebrow: "", heading: b.heading ?? "", heading_accent: "", link_label: "", link: "", heading_align: "left", columns: Math.min(4, Math.max(2, b.items.length)), style: b.items.some((x) => image(x.image)) ? "plain" : "cards", color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 },
          // Sans image, une coche neutre (le thème numéroterait sinon les éléments : chiffres absents du site).
          b.items.map((it) => ({ type: "feature", settings: { icon: it.image && image(it.image) ? "none" : "check", image_asset: image(it.image), title: it.title, text: richtext(it.text), link_label: "", link: "" } })))];
      }
      case "gallery": {
        const imgs = b.images.map(image).filter(Boolean);
        if (!imgs.length) return [];
        return [sec("gallery-mosaic", { heading: b.heading ?? "", layout: imgs.length >= 3 ? "editorial" : "even", color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 }, imgs.map((f) => ({ type: "image", settings: { image_asset: f, caption: "" } })))];
      }
      case "products": {
        if (services) return [];
        const handles = b.handles.map((h) => productList.find((p) => p.handle === slug(h))?.handle).filter(Boolean) as string[];
        let col = "all";
        if (handles.length && handles.length < productList.length) {
          col = `site-selection-${extraCollections.length + 1}`;
          extraCollections.push({ handle: col, title: b.heading || shopName, description: "", products: handles });
        }
        const n = handles.length || productList.length || 4;
        return [sec("featured-collection", { eyebrow: "", heading: b.heading ?? "", collection: col, limit: Math.min(12, Math.max(2, n)), columns: Math.min(4, Math.max(2, n)), ratio: "square", color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 })];
      }
      case "testimonials": {
        // Uniquement les témoignages présents sur le site, sans note inventée.
        const items = b.items.filter((x) => x.quote?.trim());
        if (!items.length) return [];
        return [sec("testimonials", { eyebrow: "", heading: b.heading ?? "", color_scheme: "scheme-2", padding_top: 72, padding_bottom: 72 }, items.map((x) => ({ type: "review", settings: { quote: x.quote, author: x.author ?? "", detail: "", rating: "0", image_asset: "" } })))];
      }
      case "faq": {
        const items = b.items.filter((x) => x.q?.trim());
        if (!items.length) return [];
        return [sec("faq", { eyebrow: "", heading: b.heading ?? "", text: "", style: "lines", layout: "stacked", columns: "1", open_first: false, search: false, contact_text: "", button_label: "", button_link: "", structured_data: true, color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 }, items.map((x) => ({ type: "question", settings: { question: x.q, answer: richtext(x.a) } })))];
      }
      case "cta": {
        const btn = button(b.button);
        return [sec("cta-banner", { heading: b.heading, text: richtext(b.text), button_label: btn?.label ?? "", button_link: btn?.link ?? "", image_asset: "", overlay: 0, style: "center", parallax: false, color_scheme: "scheme-4", padding_top: 88, padding_bottom: 88 })];
      }
      case "contact":
        return [sec("contact-form", { eyebrow: "", heading: b.heading ?? "", text: richtext(b.text), email: site.contact.email ?? "", hours: site.contact.hours ?? "", response: "", color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 })];
      case "video": {
        const file = image(b.src);
        const poster = image(b.poster);
        if (file && /\.mp4$/i.test(file)) return [sec("video-showcase", { heading: "", video_asset: file, poster_asset: poster, ratio: "16/9", width: "contained", autoplay: false, controls: true, caption: "", color_scheme: "scheme-1", padding_top: 48, padding_bottom: 48 })];
        if (/youtube\.com|youtu\.be|vimeo\.com/i.test(b.src)) return [sec("video-carousel", { heading: "", heading_accent: "", subheading: "", ratio: "landscape", show_sound: true, color_scheme: "scheme-1", padding_top: 48, padding_bottom: 48 }, [{ type: "video", settings: { video_url: b.src, video_asset: "", poster_asset: poster, title: "", caption: "" } }])];
        return [];
      }
    }
  };

  // ----- gabarits
  const templates: Record<string, TemplateJson> = {};
  for (const key of ["collection", "list-collections", "search", "cart", "page", "404", "blog", "article", "password"]) if (base.templates[key]) templates[key] = base.templates[key];
  templates.index = tplOf(home ? sectionsFor(home) : []);
  templates.product = tplOf([
    sec("main-product", { gallery_layout: "stack", sticky_bar: false, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 96 }, [
      { type: "title", settings: {} },
      { type: "price", settings: {} },
      { type: "description", settings: { hide_for_handle: "" } },
      ...(services ? [] : [{ type: "buy_buttons", settings: { picker: "buttons", show_quantity: true, show_dynamic_checkout: true, price_in_button: false } }]),
    ]),
  ]);
  const pages: StorePage[] = [];
  for (const { page, handle, suffix } of pageEntries) {
    templates[`page.${suffix}`] = tplOf(sectionsFor(page));
    pages.push({ handle, title: page.title || handle, template_suffix: suffix, body_html: "" });
  }

  // ----- menus (mêmes libellés, même ordre)
  const links = (list: { label: string; url: string }[]) => list.filter((l) => l.label?.trim()).map((l) => ({ title: l.label.trim(), url: mapLink(l.url) || "/" }));
  const mainLinks = site.nav.length ? links(site.nav) : [...(home ? [{ title: home.title || shopName, url: "/" }] : []), ...pages.map((p) => ({ title: p.title, url: `/pages/${p.handle}` }))];
  const menus = {
    "main-menu": { title: t("Menu principal", "Main menu"), links: mainLinks },
    // Sans titre : le pied de page du site n'en affiche pas (le thème montrerait sinon le nom du menu).
    footer: { title: "", links: links(site.footerNav) },
  };

  // ----- en-tête et pied de page
  const header = {
    type: "header" as const,
    name: base.groups.header.name,
    ...tplOf([
      sec("header", { menu: "main-menu", layout: "logo-left", shape: "bar", icons: "plain", mobile_menu: "drawer", sticky: true, transparent_on_home: false, show_search: !services, show_cart: !services, cta_label: "", cta_link: "", phone: "", color_scheme: "scheme-1" }),
    ]),
  };
  const c = site.contact;
  const contactBlock = c.address || c.phone || c.email || c.hours ? [{ type: "contact", settings: { heading: "", address: c.address ?? "", phone: c.phone ?? "", email: c.email ?? "", hours: c.hours ?? "" } }] : [];
  const socials = c.socials ?? {};
  const socialKeys = ["instagram", "tiktok", "facebook", "youtube", "pinterest"] as const;
  const hasSocial = socialKeys.some((k) => socials[k]);
  const footer = {
    type: "footer" as const,
    name: base.groups.footer.name,
    ...tplOf([
      sec("footer", { style: "columns", logo_asset: input.logo ? input.logo.file : "", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-2" }, [
        { type: "text", settings: { heading: shopName, text: richtext(site.tagline) } },
        ...(menus.footer.links.length ? [{ type: "links", settings: { heading: "", menu: "footer" } }] : []),
        ...contactBlock,
        ...(hasSocial ? [{ type: "social", settings: { heading: "" } }] : []),
      ]),
    ]),
  };

  // ----- réglages : couleurs, polices et logo du site
  const hf = matchFont(site.fonts?.heading ?? site.fonts?.all?.[0], "heading");
  const bf = matchFont(site.fonts?.body ?? site.fonts?.all?.[0], "body");
  if (input.logo) files[input.logo.file] = input.logo.assetId;
  const favicon = image(site.favicon);
  const settings: Record<string, unknown> = {
    ...base.settings,
    logo_asset: input.logo?.file ?? "",
    logo_width: 150,
    favicon_asset: favicon,
    color_schemes: siteSchemes(pal),
    type_heading_font: hf.handle,
    type_body_font: bf.handle,
    heading_case: "none",
    heading_tracking: 0,
    heading_scale: 100,
    button_uppercase: false,
    button_shine: false,
    glow_enabled: false,
    motion_intensity: "subtle",
    motion_parallax: false,
    fab_back_to_top: false,
    fab_contact_link: "",
    fab_contact_label: "",
    cart_type: services ? "none" : "drawer",
    cart_reassurance: "",
    ...Object.fromEntries(socialKeys.map((k) => [`social_${k}`, socials[k] ?? ""])),
  };

  return {
    v: 1,
    name: `${shopName} · ${t("reproduction", "reproduction")}`,
    direction,
    language: lang,
    settings,
    groups: { header, footer },
    templates,
    customSections: {},
    files,
    locks: [],
    store: {
      shopName,
      product: mainProduct,
      ...(productList.length > 1 || collections.length || extraCollections.length ? { products: productList.slice(1), collections: [...collections, ...extraCollections] } : {}),
      ...(services ? { business: "services" as const } : {}),
      pages,
      menus,
      policies: [],
    },
  };
}

function storeProductOf(sp: SiteProduct, handle: string, vendor: string, image: (src?: string) => string, lang: Lang): StoreProduct {
  const imgs = sp.images.map(image).filter(Boolean);
  const vs = (sp.variants ?? []).filter((v) => v.title?.trim());
  const optCount = Math.max(0, ...vs.map((v) => v.options?.length ?? 0));
  const multi = vs.length > 1 || (vs.length === 1 && !/^default title$/i.test(vs[0].title));
  const optionNames = multi ? Array.from({ length: Math.max(1, optCount) }, (_, i) => (optCount > 1 ? `${pick(lang, "Option", "Option")} ${i + 1}` : pick(lang, "Option", "Option"))) : [];
  return {
    title: sp.title,
    handle,
    vendor,
    description_html: richtext(sp.description),
    price: sp.price ?? null,
    compare_at_price: sp.compareAtPrice ?? null,
    currency: sp.currency || "EUR",
    options: optionNames,
    variants: multi
      ? vs.map((v) => ({ title: v.title, options: v.options?.length ? v.options : [v.title], price: v.price ?? sp.price ?? null, available: true }))
      : [{ title: "Default Title", options: ["Default Title"], price: sp.price ?? null, available: true }],
    images: imgs,
    tags: sp.category ? [sp.category] : [],
  };
}

// ---------------------------------------------------------------- notes honnêtes

const PLATFORM_NAMES: Record<SitePlatform, string> = {
  shopify: "Shopify", woocommerce: "WooCommerce", wordpress: "WordPress", prestashop: "PrestaShop", wix: "Wix", squarespace: "Squarespace",
  webflow: "Webflow", jimdo: "Jimdo", weebly: "Weebly / Square Online", magento: "Magento", bigcommerce: "BigCommerce", ecwid: "Ecwid", odoo: "Odoo", godaddy: "GoDaddy", custom: "",
};
export const platformName = (p: SitePlatform) => PLATFORM_NAMES[p] || C("site sur mesure", "custom-built site");
export const reproductionTarget = (site: SiteImport) => (site.business === "services" ? "WordPress" : "Shopify");

/** Ce qui est repris à l'identique et ce qui ne peut pas l'être (à afficher dans le studio). */
export function reproductionNotes(site: SiteImport, input: Pick<ReproduceInput, "assets" | "logo">): string[] {
  const notes: string[] = [];
  const hf = matchFont(site.fonts?.heading ?? site.fonts?.all?.[0], "heading");
  const bf = matchFont(site.fonts?.body ?? site.fonts?.all?.[0], "body");
  if (site.fonts?.heading && !hf.exact) notes.push(C(`Police des titres « ${site.fonts.heading} » non disponible : remplacée par ${hf.family}, la plus proche.`, `Heading font "${site.fonts.heading}" not available: replaced by ${hf.family}, the closest match.`));
  if (site.fonts?.body && !bf.exact) notes.push(C(`Police du texte « ${site.fonts.body} » non disponible : remplacée par ${bf.family}, la plus proche.`, `Body font "${site.fonts.body}" not available: replaced by ${bf.family}, the closest match.`));
  if (!site.palette) notes.push(C("Couleurs du site non détectées : fond blanc et texte foncé par défaut.", "Site colors not detected: white background and dark text by default."));
  if (!input.logo) notes.push(C("Logo non récupéré : à ajouter.", "Logo not retrieved: to be added."));
  const missing = new Set<string>();
  for (const pg of site.pages) for (const b of pg.blocks) for (const src of blockImages(b)) if (!input.assets[src]) missing.add(src);
  if (missing.size) notes.push(C(`${missing.size} image(s) du site n'ont pas pu être reprises.`, `${missing.size} site image(s) could not be reused.`));
  notes.push(C("La mise en page suit les sections du studio : même ordre, mêmes textes et images, mais pas le code du thème d'origine.", "The layout uses the studio's sections: same order, texts and images, but not the original theme's code."));
  return notes;
}

function blockImages(b: SiteBlock): string[] {
  switch (b.kind) {
    case "hero":
      return b.image ? [b.image] : [];
    case "image":
      return [b.src];
    case "image-text":
      return [b.image];
    case "features":
      return b.items.map((x) => x.image).filter(Boolean) as string[];
    case "gallery":
      return b.images;
    default:
      return [];
  }
}

// ---------------------------------------------------------------- enregistrement

/** Nom de fichier du thème pour une image du site (extension selon le format, transparence conservée). */
export function siteFileName(a: Pick<Asset, "id" | "mime" | "kind">, hint: string): string {
  const ext = a.kind === "video" || a.mime === "video/mp4" ? "mp4" : a.mime === "image/svg+xml" ? "svg" : a.mime === "image/png" ? "png" : a.mime === "image/webp" ? "webp" : a.mime === "image/gif" ? "gif" : a.mime === "image/jpeg" ? "jpg" : "png";
  return `es-${slug(hint) || "site"}-${a.id.slice(0, 6)}.${ext}`;
}

/**
 * Enregistre la reproduction du site comme une version normale du thème du projet
 * (aperçu, sections modifiables, exports). Les images du site sont les médias du projet
 * dont `meta.source` est l'adresse d'origine.
 */
export async function buildReproducedShop(ctx: JobContext, projectId: string, site: SiteImport): Promise<{ versionId: string; number: number }> {
  ctx?.progress(0.1, L("Reproduction du site : préparation des images", "Site reproduction: preparing images"));
  const list = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND deleted_at IS NULL ORDER BY created_at ASC", projectId);
  const assets: ReproduceInput["assets"] = {};
  let n = 0;
  for (const a of list) {
    const src = assetMeta<{ source?: string }>(a).source;
    if (!src || assets[src] || a.mime === "image/x-icon" || a.mime === "image/vnd.microsoft.icon") continue;
    if (!(a.mime.startsWith("image/") || a.mime === "video/mp4")) continue;
    assets[src] = { file: siteFileName(a, `site-${++n}`), assetId: a.id };
  }
  // Logo du client : celui du site (asset lié), sinon le dernier logo du projet.
  const logoAsset =
    (site.logo?.assetId ? list.find((a) => a.id === site.logo!.assetId) : undefined) ??
    (site.logo?.src ? list.find((a) => a.role === "logo" && assetMeta<{ source?: string }>(a).source === site.logo!.src) : undefined) ??
    [...list].reverse().find((a) => a.role === "logo" && a.status !== "rejected");
  const logo = logoAsset ? { file: siteFileName(logoAsset, "logo"), assetId: logoAsset.id } : undefined;
  // Langue du projet (celle des contenus du studio), sinon celle du site.
  const language: "fr" | "en" = loadProject(projectId).settings.language ?? (site.language === "en" || site.language === "fr" ? site.language : contentLang());
  ctx?.progress(0.4, L("Reproduction du site : pages, menu et sections", "Site reproduction: pages, menu and sections"));
  const spec = reproduceSpec(site, { projectId, language, assets, logo });
  const problems = validateSpec(spec);
  if (problems.length) throw new Error(L(`Thème invalide : ${problems.join(" ; ")}`, `Invalid theme: ${problems.join("; ")}`));
  const from = platformName(site.platform);
  const to = reproductionTarget(site);
  const summary = L(`Reproduction de votre site (${from} → ${to})`, `Reproduction of your site (${from} → ${to})`);
  const notes = reproductionNotes(site, { assets, logo });
  const v = saveThemeVersion(projectId, spec, summary, "system", { checks: L(["structure", "schémas des sections", "contraste des couleurs"], ["structure", "section schemas", "color contrast"]), problems, notes });
  ctx?.progress(0.95, L("Reproduction enregistrée", "Reproduction saved"));
  return { versionId: v.id, number: v.number };
}
