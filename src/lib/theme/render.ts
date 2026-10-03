/**
 * Moteur d'aperçu : interprète les fichiers Liquid compilés du thème avec
 * LiquidJS et des objets compatibles Shopify (produit, panier, menus…).
 * Ce sont les mêmes fichiers que ceux du ZIP : l'aperçu ne simule pas un
 * autre rendu, il exécute le thème exporté avec les données de la boutique.
 */
import fs from "node:fs";
import path from "node:path";
import { Drop, Hash, Liquid, Tokenizer, type Context, type Emitter, type TagToken, type TopLevelToken, type Template } from "liquidjs";
import { compileTheme, type ThemeFiles } from "./compile";
import { parseSchemaBlock, withDefaults, type SectionInstance, type ThemeSpec } from "./spec";

// ---------------------------------------------------------------- polices

/** Correspondance des polices Shopify utilisées par les directions → fichiers locaux. */
export const FONT_FILES: Record<string, { family: string; files: Record<number, string>; italic?: Record<number, string>; fallback: string }> = {
  cormorant: { family: "Cormorant", files: { 400: "Cormorant-400.ttf", 500: "Cormorant-500.ttf", 600: "Cormorant-600.ttf" }, italic: { 400: "Cormorant-500italic.ttf", 500: "Cormorant-500italic.ttf" }, fallback: "serif" },
  inter: { family: "Inter", files: { 400: "Inter-400.ttf", 500: "Inter-500.ttf", 600: "Inter-600.ttf", 700: "Inter-700.ttf", 800: "Inter-700.ttf" }, fallback: "sans-serif" },
  jost: { family: "Jost", files: { 400: "Jost-400.ttf", 500: "Jost-500.ttf", 600: "Jost-600.ttf", 700: "Jost-600.ttf" }, fallback: "sans-serif" },
  dm_sans: { family: "DM Sans", files: { 400: "DMSans-400.ttf", 500: "DMSans-500.ttf", 700: "DMSans-700.ttf" }, fallback: "sans-serif" },
  archivo: { family: "Archivo", files: { 400: "Archivo-400.ttf", 600: "Archivo-600.ttf", 700: "Archivo-800.ttf", 800: "Archivo-800.ttf" }, fallback: "sans-serif" },
  chivo: { family: "Chivo", files: { 400: "Chivo-400.ttf", 600: "Chivo-600.ttf", 700: "Chivo-800.ttf" }, fallback: "sans-serif" },
  lora: { family: "Lora", files: { 400: "Lora-400.ttf", 600: "Lora-600.ttf", 700: "Lora-600.ttf" }, fallback: "serif" },
  work_sans: { family: "Work Sans", files: { 400: "WorkSans-400.ttf", 500: "WorkSans-500.ttf", 600: "WorkSans-600.ttf", 700: "WorkSans-600.ttf" }, fallback: "sans-serif" },
  space_grotesk: { family: "Space Grotesk", files: { 400: "SpaceGrotesk-400.ttf", 500: "SpaceGrotesk-500.ttf", 700: "SpaceGrotesk-700.ttf" }, fallback: "sans-serif" },
  montserrat: { family: "Montserrat", files: { 400: "Montserrat-400.ttf", 600: "Montserrat-600.ttf", 700: "Montserrat-800.ttf", 800: "Montserrat-800.ttf" }, fallback: "sans-serif" },
  karla: { family: "Karla", files: { 400: "Karla-400.ttf", 600: "Karla-600.ttf", 700: "Karla-600.ttf" }, fallback: "sans-serif" },
  libre_baskerville: { family: "Libre Baskerville", files: { 400: "LibreBaskerville-400.ttf", 700: "LibreBaskerville-700.ttf" }, fallback: "serif" },
  playfair_display: { family: "Playfair Display", files: { 400: "PlayfairDisplay-400.ttf", 600: "PlayfairDisplay-600.ttf", 700: "PlayfairDisplay-700.ttf" }, fallback: "serif" },
};

export const FONT_HANDLES = Object.keys(FONT_FILES).flatMap((k) => [
  ...Object.keys(FONT_FILES[k].files).map((w) => `${k}_n${String(w)[0]}`),
  ...Object.keys(FONT_FILES[k].italic ?? {}).map((w) => `${k}_i${String(w)[0]}`),
]);

class FontDrop extends Drop {
  family: string;
  fallback_families: string;
  weight: number;
  style = "normal";
  key: string;
  constructor(public handle: string, private base: string) {
    super();
    const m = handle.match(/^(.*)_([ni])(\d)$/);
    this.key = m?.[1] ?? "dm_sans";
    const def = FONT_FILES[this.key] ?? FONT_FILES.dm_sans;
    this.family = `"${def.family}"`;
    this.fallback_families = def.fallback;
    this.weight = m ? Number(m[3]) * 100 : 400;
    if (m?.[2] === "i") this.style = "italic";
  }
  file() {
    const def = FONT_FILES[this.key] ?? FONT_FILES.dm_sans;
    const set = this.style === "italic" && def.italic ? def.italic : def.files;
    const weights = Object.keys(set).map(Number).sort((a, b) => Math.abs(a - this.weight) - Math.abs(b - this.weight));
    return `${this.base}/__fonts/${set[weights[0]]}`;
  }
  valueOf() {
    return this.handle;
  }
}

class ColorDrop extends Drop {
  red: number;
  green: number;
  blue: number;
  alpha = 1;
  constructor(public hex: string) {
    super();
    const h = (hex || "#000000").replace("#", "");
    this.red = parseInt(h.slice(0, 2), 16) || 0;
    this.green = parseInt(h.slice(2, 4), 16) || 0;
    this.blue = parseInt(h.slice(4, 6), 16) || 0;
  }
  valueOf() {
    return this.hex;
  }
}

// ---------------------------------------------------------------- données

export type PreviewCartLine = { variantIndex: number; quantity: number };
export type PreviewOptions = {
  spec: ThemeSpec;
  base: string; // ex. /preview/<projet>/v/<version>
  files?: ThemeFiles;
  cart: PreviewCartLine[];
  injectStudioTools?: boolean;
};

type ImageObj = { src: string; width: number; height: number; alt: string; id: string; aspect_ratio: number; media_type: "image" };

function money(cents: unknown) {
  if (cents === null || cents === undefined || cents === "") return "Prix à définir";
  const n = Number(cents);
  if (!Number.isFinite(n)) return "Prix à définir";
  return (n / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, " ") + " €";
}

function buildStore(opts: PreviewOptions) {
  const { spec, base } = opts;
  const sp = spec.store.product;
  const media: ImageObj[] = sp.images.map((f, i) => ({
    src: `${base}/assets/${f}`,
    width: 1600,
    height: 2000,
    alt: sp.title,
    id: `m${i + 1}`,
    aspect_ratio: 0.8,
    media_type: "image",
  }));
  const withPreview = media.map((m) => ({ ...m, preview_image: m }));
  const url = `${base}/products/${sp.handle}`;
  const variants = (sp.variants.length ? sp.variants : [{ title: "Default Title", options: ["Default Title"], price: sp.price, available: true }]).map((v, i) => ({
    id: 1000 + i,
    title: v.title,
    options: v.options,
    option1: v.options[0] ?? null,
    option2: v.options[1] ?? null,
    option3: v.options[2] ?? null,
    price: v.price ?? sp.price,
    compare_at_price: sp.compare_at_price,
    available: v.available,
    sku: v.sku ?? "",
    url: `${url}?variant=${1000 + i}`,
    featured_media: withPreview[0] ?? null,
    unit_price_measurement: null,
  }));
  const hasOnlyDefault = variants.length === 1 && variants[0].title === "Default Title";
  const options = hasOnlyDefault ? ["Title"] : sp.options;
  const product: any = {
    id: 1,
    title: sp.title,
    handle: sp.handle,
    url,
    vendor: sp.vendor,
    type: "",
    tags: sp.tags,
    description: sp.description_html,
    content: sp.description_html,
    price: variants[0].price,
    price_min: variants[0].price,
    price_varies: new Set(variants.map((v) => v.price)).size > 1,
    compare_at_price: sp.compare_at_price,
    available: variants.some((v) => v.available),
    featured_media: withPreview[0] ?? null,
    featured_image: withPreview[0] ?? null,
    media: withPreview,
    images: withPreview,
    variants,
    selected_or_first_available_variant: variants.find((v) => v.available) ?? variants[0],
    has_only_default_variant: hasOnlyDefault,
    options,
    options_with_values: options.map((name, i) => {
      const values = [...new Set(variants.map((v) => v.options[i]).filter(Boolean))];
      return { name, position: i + 1, values, selected_value: (variants.find((v) => v.available) ?? variants[0]).options[i] };
    }),
  };
  const products = [product];
  const collection: any = {
    id: 1,
    title: "Tous les produits",
    handle: "all",
    url: `${base}/collections/all`,
    description: "",
    products,
    products_count: products.length,
    all_products_count: products.length,
    filters: [],
    sort_options: [
      { value: "manual", name: "En vedette" },
      { value: "price-ascending", name: "Prix croissant" },
      { value: "price-descending", name: "Prix décroissant" },
      { value: "created-descending", name: "Nouveautés" },
    ],
    sort_by: "manual",
    default_sort_by: "manual",
    featured_image: withPreview[0] ?? null,
  };
  const collections: any = [collection];
  collections.all = collection;

  const linklists: Record<string, any> = {};
  for (const [handle, menu] of Object.entries(spec.store.menus)) {
    linklists[handle] = { title: menu.title, handle, links: menu.links.map((l) => ({ title: l.title, url: l.url.startsWith("/") ? base + (l.url === "/" ? "/" : l.url) : l.url, active: false })) };
  }

  const lines = opts.cart
    .filter((l) => variants[l.variantIndex] && l.quantity > 0)
    .map((l, i) => {
      const v = variants[l.variantIndex];
      const price = v.price ?? 0;
      return {
        key: `${v.id}:${i}`,
        id: v.id,
        quantity: l.quantity,
        title: hasOnlyDefault ? sp.title : `${sp.title} - ${v.title}`,
        url: v.url,
        image: withPreview[0] ?? null,
        product,
        variant: v,
        price,
        final_price: price,
        line_price: price * l.quantity,
        final_line_price: price * l.quantity,
        url_to_remove: `${base}/cart/change?line=${i + 1}&quantity=0`,
      };
    });
  const cart = {
    item_count: lines.reduce((s, l) => s + l.quantity, 0),
    items: lines,
    total_price: lines.reduce((s, l) => s + l.final_line_price, 0),
    currency: { iso_code: sp.currency || "EUR" },
    note: "",
  };

  const policies = spec.store.policies.map((p) => ({ title: p.title, url: `${base}/policies/${p.handle}`, body: p.body_html }));
  const shop = {
    name: spec.store.shopName,
    url: base,
    description: spec.store.shopName,
    money_format: "{{amount_with_comma_separator}} €",
    customer_accounts_enabled: false,
    policies,
    enabled_payment_types: ["visa", "master", "american_express", "paypal", "apple_pay", "google_pay"],
    password_message: "",
  };
  const routes = {
    root_url: `${base}/`,
    cart_url: `${base}/cart`,
    cart_add_url: `${base}/cart/add`,
    cart_change_url: `${base}/cart/change`,
    cart_update_url: `${base}/cart/update`,
    search_url: `${base}/search`,
    predictive_search_url: `${base}/search/suggest`,
    collections_url: `${base}/collections`,
    all_products_collection_url: `${base}/collections/all`,
    account_url: `${base}/account`,
    account_login_url: `${base}/account/login`,
    account_register_url: `${base}/account/register`,
    account_logout_url: `${base}/account/logout`,
    account_addresses_url: `${base}/account/addresses`,
    product_recommendations_url: `${base}/recommendations/products`,
  };
  return { product, products, collection, collections, linklists, cart, shop, routes, variants, policies };
}

function wrapSettings(values: Record<string, unknown>, base: string, schemaTypes: Map<string, string>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    const t = schemaTypes.get(k);
    if (t === "color" && typeof v === "string") out[k] = new ColorDrop(v);
    else if (t === "font_picker" && typeof v === "string") out[k] = new FontDrop(v, base);
    else if (t === "image_picker" || t === "video" || t === "product" || t === "collection" || t === "page") out[k] = v ? v : null;
    else out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------- moteur

export type RenderResult = { html: string; status: number; template: string };

const LOCALE = (files: ThemeFiles) => JSON.parse(files.get("locales/fr.default.json") || "{}");

function translate(locale: any, key: string, vars: Record<string, unknown>) {
  let v: any = key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), locale);
  if (v && typeof v === "object" && "count" in vars) v = Number(vars.count) === 1 ? v.one : v.other;
  if (typeof v !== "string") return key;
  return v.replace(/\{\{\s*(\w+)\s*\}\}/g, (_: string, name: string) => String(vars[name] ?? ""));
}

function placeholderSvg(name: string, cls: string) {
  return `<svg class="${cls}" viewBox="0 0 525 525" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="525" height="525" fill="none"/><path d="M180 330l60-80 50 60 35-40 70 60H180z" fill="currentColor" opacity=".35"/><circle cx="215" cy="215" r="24" fill="currentColor" opacity=".35"/><title>${name}</title></svg>`;
}

function imageSrc(input: unknown): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (typeof input === "object" && "src" in (input as any)) return (input as any).src;
  return null;
}

function withWidth(url: string, w: number) {
  return url.includes("?") ? `${url}&width=${w}` : `${url}?width=${w}`;
}

export function createEngine(files: ThemeFiles, base: string) {
  const locale = LOCALE(files);
  const norm = (p: string) => p.replace(/^\/+/, "");
  const liquid = new Liquid({
    fs: {
      exists: async (f) => files.has(norm(f)),
      existsSync: (f) => files.has(norm(f)),
      readFile: async (f) => files.get(norm(f)) ?? "",
      readFileSync: (f) => files.get(norm(f)) ?? "",
      resolve: (dir, file, ext) => path.posix.join(dir, file.endsWith(ext) ? file : file + ext),
      contains: async () => true,
      containsSync: () => true,
      dirname: (f) => path.posix.dirname(f),
      sep: "/",
    },
    root: ["/"],
    partials: ["/snippets"],
    layouts: ["/layout"],
    extname: ".liquid",
    cache: true,
    dynamicPartials: true,
    strictFilters: false,
    strictVariables: false,
    ownPropertyOnly: false,
    lenientIf: true,
    jsTruthy: false,
    timezoneOffset: "Europe/Paris",
  });

  // ----- balises Shopify
  liquid.registerTag("schema", {
    parse(_token: TagToken, remain: TopLevelToken[]) {
      while (remain.length) {
        const t = remain.shift() as any;
        if (t.name === "endschema") return;
      }
    },
    render() {
      return "";
    },
  } as any);
  for (const raw of ["stylesheet", "javascript"]) {
    liquid.registerTag(raw, {
      parse(_token: TagToken, remain: TopLevelToken[]) {
        const parts: string[] = [];
        while (remain.length) {
          const t = remain.shift() as any;
          if (t.name === `end${raw}`) break;
          parts.push(t.getText());
        }
        (this as any).content = parts.join("");
      },
      render(ctx: Context) {
        const content = (this as any).content as string;
        const bag = (ctx.getAll() as any).__collected as { css: string[]; js: string[] } | undefined;
        if (bag) (raw === "stylesheet" ? bag.css : bag.js).push(content);
        return "";
      },
    } as any);
  }
  liquid.registerTag("style", {
    parse(this: any, _token: TagToken, remain: TopLevelToken[]) {
      this.tpls = [] as Template[];
      const stream = this.liquid.parser.parseStream(remain);
      stream
        .on("tag:endstyle", () => stream.stop())
        .on("template", (tpl: Template) => this.tpls.push(tpl))
        .on("end", () => {
          throw new Error("La balise style n'est pas fermée.");
        });
      stream.start();
    },
    *render(this: any, ctx: Context, emitter: Emitter) {
      emitter.write("<style data-shopify>");
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      emitter.write("</style>");
    },
  } as any);

  liquid.registerTag("form", {
    parse(this: any, token: TagToken, remain: TopLevelToken[]) {
      const m = token.args.match(/^\s*('[^']*'|"[^"]*")\s*(?:,\s*([A-Za-z_][\w.]*)\s*(?=,|$))?\s*,?\s*([\s\S]*)$/);
      this.formType = m ? m[1].slice(1, -1) : "form";
      this.objectExpr = m?.[2] ?? null;
      this.hash = new Hash(m?.[3] ?? "");
      this.tpls = [] as Template[];
      const stream = this.liquid.parser.parseStream(remain);
      stream
        .on("tag:endform", () => stream.stop())
        .on("template", (tpl: Template) => this.tpls.push(tpl))
        .on("end", () => {
          throw new Error("La balise form n'est pas fermée.");
        });
      stream.start();
    },
    *render(this: any, ctx: Context, emitter: Emitter) {
      const attrs: Record<string, unknown> = yield this.hash.render(ctx);
      const actions: Record<string, string> = {
        product: `${base}/cart/add`,
        contact: `${base}/contact#contact_form`,
        customer: `${base}/contact#newsletter`,
        customer_login: `${base}/account/login`,
        create_customer: `${base}/account`,
        recover_customer_password: `${base}/account/recover`,
        customer_address: `${base}/account/addresses`,
        storefront_password: `${base}/password`,
        activate_customer_password: `${base}/account/activate`,
        reset_customer_password: `${base}/account/reset`,
      };
      const html = Object.entries(attrs)
        .filter(([, v]) => v !== undefined && v !== null && v !== false)
        .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, "&quot;")}"`)
        .join("");
      emitter.write(`<form method="post" action="${actions[this.formType] ?? base}" accept-charset="UTF-8"${this.formType === "product" ? ' enctype="multipart/form-data"' : ""}${html}><input type="hidden" name="form_type" value="${this.formType}"><input type="hidden" name="utf8" value="✓">`);
      ctx.push({ form: { errors: null, "posted_successfully?": false, posted_successfully: false, password_needed: true, email: "", name: "", body: "", phone: "", set_as_default_checkbox: '<input type="checkbox" name="address[default]" value="1">' } });
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      ctx.pop();
      emitter.write("</form>");
    },
  } as any);

  liquid.registerTag("paginate", {
    parse(this: any, token: TagToken, remain: TopLevelToken[]) {
      this.tpls = [] as Template[];
      const stream = this.liquid.parser.parseStream(remain);
      stream
        .on("tag:endpaginate", () => stream.stop())
        .on("template", (tpl: Template) => this.tpls.push(tpl))
        .on("end", () => {
          throw new Error("La balise paginate n'est pas fermée.");
        });
      stream.start();
      this.args = token.args;
    },
    *render(this: any, ctx: Context, emitter: Emitter) {
      ctx.push({ paginate: { current_page: 1, pages: 1, items: 0, parts: [], previous: null, next: null, page_size: 16 } });
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      ctx.pop();
    },
  } as any);

  const renderSection = function* (this: any, ctx: Context, emitter: Emitter, id: string, inst: SectionInstance, where: string) {
    const engine = this.liquid as Liquid;
    yield* renderSectionGen(engine, ctx, emitter, files, id, inst, where);
  };

  liquid.registerTag("section", {
    parse(this: any, token: TagToken) {
      this.name = new Tokenizer(token.args).readValue()?.getText().replace(/^['"]|['"]$/g, "") ?? "";
    },
    *render(this: any, ctx: Context, emitter: Emitter) {
      yield* renderSection.call(this, ctx, emitter, this.name, { type: this.name, settings: {} }, "static");
    },
  } as any);
  liquid.registerTag("sections", {
    parse(this: any, token: TagToken) {
      this.name = new Tokenizer(token.args).readValue()?.getText().replace(/^['"]|['"]$/g, "") ?? "";
    },
    *render(this: any, ctx: Context, emitter: Emitter) {
      const raw = files.get(`sections/${this.name}.json`);
      if (!raw) return;
      const group = JSON.parse(stripComment(raw));
      for (const id of group.order as string[]) {
        const inst = group.sections[id];
        if (!inst || inst.disabled) continue;
        yield* renderSection.call(this, ctx, emitter, id, inst, `group:${this.name.replace(/-group$/, "")}`);
      }
    },
  } as any);

  // ----- filtres Shopify
  const f = (name: string, fn: (...args: any[]) => unknown) => liquid.registerFilter(name, fn);
  f("asset_url", (name: string) => `${base}/assets/${name}`);
  f("shopify_asset_url", (name: string) => `${base}/assets/${name}`);
  f("stylesheet_tag", (url: string) => `<link href="${url}" rel="stylesheet" type="text/css" media="all">`);
  f("script_tag", (url: string) => `<script src="${url}" defer></script>`);
  f("image_url", (input: unknown, ...args: any[]) => {
    const src = imageSrc(input);
    if (!src) return "";
    const opts = Object.fromEntries(args.filter(Array.isArray));
    return opts.width ? withWidth(src, Number(opts.width)) : src;
  });
  f("img_url", (input: unknown) => imageSrc(input) ?? "");
  f("image_tag", (url: string, ...args: any[]) => {
    if (!url) return "";
    const o: Record<string, any> = Object.fromEntries(args.filter(Array.isArray));
    const clean = url.replace(/[?&]width=\d+/, "");
    const widths = String(o.widths ?? "").split(",").map((w) => Number(w.trim())).filter(Boolean);
    const srcset = widths.length ? ` srcset="${widths.map((w) => `${withWidth(clean, w)} ${w}w`).join(", ")}"` : "";
    const attr = (k: string, v: unknown) => (v === undefined || v === null || v === "" ? "" : ` ${k}="${String(v).replace(/"/g, "&quot;")}"`);
    return `<img src="${url}"${srcset}${attr("sizes", o.sizes)}${attr("alt", o.alt ?? "")}${attr("class", o.class)}${attr("loading", o.loading ?? "lazy")}${attr("fetchpriority", o.fetchpriority)} decoding="async">`;
  });
  f("placeholder_svg_tag", (name: string, cls = "") => placeholderSvg(name, cls));
  f("money", money);
  f("money_with_currency", (c: unknown) => (c === null || c === undefined ? "Prix à définir" : `${money(c)} EUR`));
  f("money_without_currency", (c: unknown) => (c === null || c === undefined ? "" : (Number(c) / 100).toFixed(2).replace(".", ",")));
  f("t", (key: string, ...args: any[]) => translate(locale, key, Object.fromEntries(args.filter(Array.isArray))));
  f("font_face", (font: unknown) => {
    if (!(font instanceof FontDrop)) return "";
    return `@font-face { font-family: ${font.family}; font-weight: ${font.weight}; font-style: ${font.style}; font-display: swap; src: url("${font.file()}") format("truetype"); }`;
  });
  f("font_modify", (font: unknown, prop: string, value: string) => {
    if (!(font instanceof FontDrop)) return font;
    if (prop === "weight") {
      const w = value === "bold" ? 7 : value === "bolder" ? Math.min(9, font.weight / 100 + 3) : Number(value) / 100;
      return new FontDrop(`${font.key}_${font.style === "italic" ? "i" : "n"}${Math.round(w)}`, base);
    }
    if (prop === "style") return new FontDrop(`${font.key}_${value === "italic" ? "i" : "n"}${Math.round(font.weight / 100)}`, base);
    return font;
  });
  f("font_url", (font: unknown) => (font instanceof FontDrop ? font.file() : ""));
  f("default_errors", (e: unknown) => (e ? `<ul><li>${String(e)}</li></ul>` : ""));
  f("payment_type_svg_tag", (type: string, ...args: any[]) => {
    const o: Record<string, any> = Object.fromEntries(args.filter(Array.isArray));
    const label: Record<string, string> = { visa: "VISA", master: "MC", american_express: "AMEX", paypal: "PayPal", apple_pay: "Pay", google_pay: "GPay" };
    return `<svg class="${o.class ?? ""}" viewBox="0 0 38 24" width="38" height="24" role="img" aria-label="${type}"><rect x=".5" y=".5" width="37" height="23" rx="3" fill="#fff" stroke="#ccc"/><text x="19" y="15.5" text-anchor="middle" font-size="7" font-family="Arial" font-weight="700" fill="#333">${label[type] ?? type}</text></svg>`;
  });
  f("payment_button", () => `<div class="shopify-payment-button"><button type="button" class="es-button es-button--secondary es-button--full" disabled title="Affiché par Shopify sur la boutique réelle">Paiement accéléré (Shop Pay, Apple Pay…)</button></div>`);
  f("handleize", (s: string) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  f("handle", (s: string) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  f("link_to", (text: string, url: string) => `<a href="${url}">${text}</a>`);
  f("within", (url: string) => url);
  f("time_tag", (d: unknown) => {
    const date = d ? new Date(String(d)) : new Date();
    return `<time datetime="${date.toISOString()}">${date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</time>`;
  });
  f("format_address", () => "");
  f("format_code", (s: string) => s);
  f("video_tag", () => "");
  f("external_video_tag", () => "");
  f("media_tag", () => "");
  f("structured_data", () => "");
  f("color_modify", (c: unknown) => c);
  f("color_to_rgb", (c: unknown) => {
    const d = c instanceof ColorDrop ? c : new ColorDrop(String(c));
    return `rgb(${d.red}, ${d.green}, ${d.blue})`;
  });

  return liquid;
}

function stripComment(s: string) {
  return s.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "");
}

function* renderSectionGen(engine: Liquid, ctx: Context, emitter: Emitter, files: ThemeFiles, id: string, inst: SectionInstance, where: string): Generator<any, void, any> {
  const source = files.get(`sections/${inst.type}.liquid`);
  if (!source) {
    emitter.write(`<!-- section introuvable : ${inst.type} -->`);
    return;
  }
  const schema = parseSchemaBlock(source) ?? { name: inst.type, settings: [], blocks: [] };
  const base = (ctx.getAll() as any).__base as string;
  const types = new Map<string, string>();
  for (const s of schema.settings) if (s.id) types.set(s.id, s.type);
  const settings = wrapSettings(withDefaults(schema.settings, inst.settings), base, types);
  const blocks = (inst.block_order ?? Object.keys(inst.blocks ?? {}))
    .map((bid) => ({ bid, b: inst.blocks?.[bid] }))
    .filter((x) => x.b && !x.b.disabled)
    .map(({ bid, b }) => {
      const bs = schema.blocks.find((x) => x.type === b!.type);
      const btypes = new Map<string, string>();
      for (const s of bs?.settings ?? []) if (s.id) btypes.set(s.id, s.type);
      return {
        id: bid,
        type: b!.type,
        settings: wrapSettings(withDefaults(bs?.settings, b!.settings), base, btypes),
        shopify_attributes: `data-es-block="${bid}"`,
      };
    });
  const sectionId = where === "static" ? id : `template--es__${id}`;
  const tpl = engine.parse(source, `sections/${inst.type}.liquid`);
  const cls = (source.match(/"class"\s*:\s*"([^"]+)"/) ?? [])[1] ?? "";
  emitter.write(`<div id="shopify-section-${sectionId}" class="shopify-section ${cls}" data-es-section="${where}:${id}" data-es-type="${inst.type}">`);
  ctx.push({ section: { id: sectionId, settings, blocks, location: where } });
  yield engine.renderer.renderTemplates(tpl, ctx, emitter);
  ctx.pop();
  emitter.write(`</div>`);
}

// ---------------------------------------------------------------- routage

export type Route = { template: string; status: number; handle?: string; pageSuffix?: string; search?: string };

export function routeFor(spec: ThemeSpec, pathname: string, search: URLSearchParams): Route {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/") return { template: "index", status: 200 };
  let m = p.match(/^\/products\/([^/]+)$/);
  if (m) return m[1] === spec.store.product.handle ? { template: "product", status: 200, handle: m[1] } : { template: "404", status: 404 };
  if (p === "/collections") return { template: "list-collections", status: 200 };
  m = p.match(/^\/collections\/([^/]+)(?:\/products\/([^/]+))?$/);
  if (m) return m[2] ? routeFor(spec, `/products/${m[2]}`, search) : { template: "collection", status: 200, handle: m[1] };
  if (p === "/search") return { template: "search", status: 200, search: search.get("q") ?? "" };
  if (p === "/cart") return { template: "cart", status: 200 };
  m = p.match(/^\/pages\/([^/]+)$/);
  if (m) {
    const page = spec.store.pages.find((x) => x.handle === m![1]);
    if (!page) return { template: "404", status: 404 };
    const t = page.template_suffix && spec.templates[`page.${page.template_suffix}`] ? `page.${page.template_suffix}` : "page";
    return { template: t, status: 200, handle: page.handle };
  }
  m = p.match(/^\/policies\/([^/]+)$/);
  if (m) return { template: "page", status: 200, handle: `policy:${m[1]}` };
  if (p.startsWith("/blogs")) return { template: p.split("/").length > 3 ? "article" : "blog", status: 200 };
  if (p === "/password") return { template: "password", status: 200 };
  return { template: "404", status: 404 };
}

export async function renderPage(opts: PreviewOptions, pathname: string, search: URLSearchParams): Promise<RenderResult> {
  const files = opts.files ?? compileTheme(opts.spec);
  const engine = createEngine(files, opts.base);
  const store = buildStore(opts);
  const route = routeFor(opts.spec, pathname, search);
  const tplKey = route.template;
  const templateRaw = files.get(`templates/${tplKey}.json`);
  const template = templateRaw ? JSON.parse(stripComment(templateRaw)) : { sections: {}, order: [] };

  const settingsSchemaRaw = JSON.parse(files.get("config/settings_schema.json") || "[]");
  const gtypes = new Map<string, string>();
  for (const g of settingsSchemaRaw) for (const s of g.settings ?? []) if (s.id) gtypes.set(s.id, s.type);
  const settingsData = JSON.parse(stripComment(files.get("config/settings_data.json") || "{}")).current ?? {};
  const defaults: Record<string, unknown> = {};
  for (const g of settingsSchemaRaw) for (const s of g.settings ?? []) if (s.id && s.default !== undefined) defaults[s.id] = s.default;
  const globalSettings = wrapSettings({ ...defaults, ...settingsData }, opts.base, gtypes);
  const schemes = (settingsData.color_schemes ?? {}) as Record<string, { settings: Record<string, string> }>;
  globalSettings.color_schemes = Object.entries(schemes).map(([sid, sc]) => ({
    id: sid,
    settings: Object.fromEntries(Object.entries(sc.settings).map(([k, v]) => [k, new ColorDrop(v)])),
  }));

  let page: any = null;
  let pageTitle = opts.spec.store.shopName;
  if (route.handle?.startsWith("policy:")) {
    const pol = store.policies.find((p) => p.url.endsWith(route.handle!.slice(7)));
    page = { title: pol?.title ?? "Politique", content: pol?.body ?? "", handle: route.handle };
    pageTitle = page.title;
  } else if (tplKey.startsWith("page")) {
    const sp = opts.spec.store.pages.find((x) => x.handle === route.handle);
    if (sp) page = { title: sp.title, content: sp.body_html, handle: sp.handle, url: `${opts.base}/pages/${sp.handle}`, template_suffix: sp.template_suffix };
    pageTitle = sp?.title ?? pageTitle;
  } else if (tplKey === "product") pageTitle = store.product.title;
  else if (tplKey === "collection") pageTitle = store.collection.title;
  else if (tplKey === "404") pageTitle = "Page introuvable";

  const q = route.search ?? "";
  const results = q ? store.products.filter((p: any) => `${p.title} ${p.description}`.toLowerCase().includes(q.toLowerCase())).map((p: any) => ({ ...p, object_type: "product" })) : [];
  const collected = { css: [] as string[], js: [] as string[] };
  const scope: Record<string, unknown> = {
    __base: opts.base,
    __collected: collected,
    settings: globalSettings,
    shop: store.shop,
    routes: store.routes,
    linklists: store.linklists,
    collections: store.collections,
    collection: tplKey === "collection" ? store.collection : null,
    product: tplKey === "product" ? store.product : null,
    cart: store.cart,
    page,
    blog: { title: "Journal", articles: [], url: `${opts.base}/blogs/journal` },
    article: null,
    search: { performed: !!q, terms: q, results, results_count: results.length },
    recommendations: { performed: false, products: [], products_count: 0 },
    customer: null,
    request: { page_type: tplKey.split(".")[0], locale: { iso_code: "fr" }, origin: "", design_mode: false, path: pathname, host: "apercu" },
    template: { name: tplKey.split(".")[0], suffix: tplKey.includes(".") ? tplKey.split(".")[1] : null, directory: null },
    canonical_url: `${opts.base}${pathname}`,
    page_title: pageTitle,
    page_description: opts.spec.store.product.description_html.replace(/<[^>]+>/g, " ").slice(0, 160),
    page_image: null,
    content_for_header: "",
    current_page: 1,
    current_tags: null,
    additional_checkout_buttons: false,
    all_country_option_tags: '<option value="France">France</option>',
    "powered_by_link": "",
  };

  // Contenu de la page : sections du gabarit JSON.
  const ctxRender = async (source: string, file: string, extra: Record<string, unknown> = {}) => engine.parseAndRender(source, { ...scope, ...extra });
  const parts: string[] = [];
  for (const id of template.order as string[]) {
    const inst = template.sections[id];
    if (!inst || inst.disabled) continue;
    parts.push(await renderSectionStandalone(engine, files, scope, id, inst, tplKey));
  }
  const content = parts.join("\n");
  if (template.layout === false) return { html: content, status: route.status, template: tplKey };
  const layoutName = typeof template.layout === "string" ? template.layout : "theme";
  const layoutSrc = files.get(`layout/${layoutName}.liquid`) ?? files.get("layout/theme.liquid")!;
  let html = await ctxRender(layoutSrc, `layout/${layoutName}.liquid`, { content_for_layout: content });
  if (collected.css.length) html = html.replace("</head>", `<style data-section-styles>${collected.css.join("\n")}</style></head>`);
  if (collected.js.length) html = html.replace("</body>", `<script>${collected.js.join("\n")}</script></body>`);
  html = rewriteLinks(html, opts.base);
  return { html, status: route.status, template: tplKey };
}

export async function renderSectionStandalone(engine: Liquid, files: ThemeFiles, scope: Record<string, unknown>, id: string, inst: SectionInstance, where: string): Promise<string> {
  const ctxModule = await import("liquidjs");
  const ctx = new ctxModule.Context(scope, engine.options as any);
  const chunks: string[] = [];
  const emitter: any = {
    buffer: "",
    write(html: unknown) {
      chunks.push(typeof html === "string" ? html : html === undefined || html === null ? "" : String((html as any).valueOf?.() ?? html));
    },
  };
  const gen = renderSectionGen(engine, ctx, emitter, files, id, inst, where);
  await ctxModule.toPromise(gen as any);
  return chunks.join("");
}

/** Section seule (API de rendu de sections utilisée par le panier latéral). */
export async function renderNamedSections(opts: PreviewOptions, names: string[], pathname: string): Promise<Record<string, string>> {
  const files = opts.files ?? compileTheme(opts.spec);
  void pathname;
  const engine = createEngine(files, opts.base);
  const store = buildStore(opts);
  const out: Record<string, string> = {};
  const scope: Record<string, unknown> = { __base: opts.base, __collected: { css: [], js: [] }, settings: {}, shop: store.shop, routes: store.routes, cart: store.cart, linklists: store.linklists };
  for (const name of names) {
    out[name] = await renderSectionStandalone(engine, files, scope, name, { type: name, settings: {} }, "static");
  }
  return out;
}

/** Préfixe les liens absolus du thème par l'adresse de l'aperçu. */
export function rewriteLinks(html: string, base: string): string {
  return html.replace(/(href|action)="\/(?!\/)([^"]*)"/g, (all, attr, rest) => {
    const full = `/${rest}`;
    if (full.startsWith(base + "/") || full === base) return all;
    return `${attr}="${base}${full === "/" ? "/" : full}"`;
  });
}

export function fontFilePath(name: string): string | null {
  if (!/^[A-Za-z0-9-]+\.ttf$/.test(name)) return null;
  const p = path.join(process.cwd(), "assets", "fonts", name);
  return fs.existsSync(p) ? p : null;
}
