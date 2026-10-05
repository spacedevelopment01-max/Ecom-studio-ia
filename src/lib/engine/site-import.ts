/**
 * Lecture du site existant d'un client (« J'ai déjà mon site et mon logo ») :
 * plateforme, logo, menu, pages et blocs dans l'ordre, produits, couleurs, polices, coordonnées.
 *
 * Règles :
 * - rien n'est inventé : textes repris mot pour mot, ce qui manque est absent (jamais deviné) ;
 * - toute lecture réseau passe par `safeFetch` (anti-SSRF, taille et délai limités) sauf fetcher fourni (tests) ;
 * - robots.txt est respecté (règles « User-agent: * ») et signalé dans les avertissements ;
 * - le contenu lu est une DONNÉE : s'il est transmis à l'IA, c'est comme matière, jamais comme consigne.
 */
import sharp from "sharp";
import { C, L } from "../i18n-server";
import type { BrandPalette } from "../theme/directions";
import { safeFetch } from "./import-link";
import { isKeptPlatform, type SiteBlock, type SiteImport, type SitePage, type SitePlatform, type SiteProduct } from "./site-types";

export type SiteFetcher = (url: string, opts?: { accept?: string; maxBytes?: number }) => Promise<{ url: string; status: number; type: string; body: Buffer }>;

type Opts = { maxPages?: number; fetchImpl?: SiteFetcher; onProgress?: (p: number, msg: string) => void };

/* ------------------------------------------------------------------ */
/* Mini analyseur HTML (tolérant, sans dépendance)                     */
/* ------------------------------------------------------------------ */

type El = { tag: string; attrs: Record<string, string>; children: Node[]; parent: El | null };
type Txt = { tag: "#text"; text: string; parent: El | null };
type Node = El | Txt;

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea", "title", "noscript", "template"]);
/** Balises qui ferment implicitement un <p> ou un <li> ouvert. */
const AUTO_CLOSE: Record<string, string[]> = {
  p: ["p", "div", "section", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "table", "header", "footer", "nav", "article", "aside", "figure", "blockquote", "form", "details"],
  li: ["li"],
  option: ["option"],
  dt: ["dt", "dd"],
  dd: ["dt", "dd"],
};

export function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, (m) => (m === "&rsquo;" ? "’" : m === "&lsquo;" ? "‘" : "'"))
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&ccedil;/g, "ç")
    .replace(/&euro;/g, "€")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&copy;/g, "©")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

function parseAttrs(s: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of s.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const k = m[1].toLowerCase();
    if (!(k in attrs)) attrs[k] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

/** Profondeur maximale de l'arbre (au-delà, les éléments sont rangés à plat : protège la pile). */
const MAX_DEPTH = 300;

export function parseHtml(html: string): El {
  const root: El = { tag: "#root", attrs: {}, children: [], parent: null };
  let cur = root;
  let depth = 0;
  // chaque motif se termine aussi en fin de texte : un document tronqué ne provoque pas de retours arrière coûteux
  const re = /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<![^>]*(?:>|$)|<\/([a-zA-Z][\w:-]*)(?=[\s/>])[^>]*(?:>|$)|<([a-zA-Z][\w:-]*)(?=[\s/>]|$)((?:[^>"']|"[^"]*"|'[^']*'|["'])*)(?:>|$)/g;
  let last = 0;
  const lower = html.toLowerCase();
  const pushText = (t: string) => {
    if (t) cur.children.push({ tag: "#text", text: t, parent: cur });
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    pushText(html.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      // ferme jusqu'à la balise correspondante (ignore une fermeture orpheline)
      let p: El | null = cur;
      let up = 1;
      while (p && p.tag !== tag) {
        p = p.parent;
        up++;
      }
      if (p && p.parent) {
        cur = p.parent;
        depth -= up;
      }
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      let raw = m[3] ?? "";
      const selfClose = /\/\s*$/.test(raw);
      if (selfClose) raw = raw.replace(/\/\s*$/, "");
      // fermetures implicites
      for (;;) {
        const closers = AUTO_CLOSE[cur.tag];
        if (closers && closers.includes(tag) && cur.parent) {
          cur = cur.parent;
          depth--;
        } else break;
      }
      const el: El = { tag, attrs: parseAttrs(raw), children: [], parent: cur };
      cur.children.push(el);
      if (RAW.has(tag)) {
        const end = lower.indexOf(`</${tag}`, last);
        const stop = end < 0 ? html.length : end;
        const content = html.slice(last, stop);
        if (content) el.children.push({ tag: "#text", text: content, parent: el });
        const close = end < 0 ? html.length : html.indexOf(">", end) + 1 || html.length;
        last = close;
        re.lastIndex = close;
      } else if (!VOID.has(tag) && !selfClose && depth < MAX_DEPTH) {
        cur = el;
        depth++;
      }
    }
  }
  pushText(html.slice(last));
  return root;
}

const isEl = (n: Node): n is El => n.tag !== "#text";
function walk(n: El, fn: (e: El) => boolean | void) {
  for (const c of n.children) {
    if (!isEl(c)) continue;
    if (fn(c) === false) continue;
    walk(c, fn);
  }
}
function findAll(n: El, pred: (e: El) => boolean): El[] {
  const out: El[] = [];
  walk(n, (e) => {
    if (pred(e)) out.push(e);
  });
  return out;
}
function find(n: El, pred: (e: El) => boolean): El | null {
  let found: El | null = null;
  walk(n, (e) => {
    if (found) return false;
    if (pred(e)) {
      found = e;
      return false;
    }
  });
  return found;
}
const byTag = (...tags: string[]) => (e: El) => tags.includes(e.tag);
const cls = (e: El) => `${e.attrs.class ?? ""} ${e.attrs.id ?? ""}`.toLowerCase();
const ancestor = (e: El, pred: (a: El) => boolean): El | null => {
  let p = e.parent;
  while (p) {
    if (pred(p)) return p;
    p = p.parent;
  }
  return null;
};
const SKIP_TEXT = new Set(["script", "style", "noscript", "template", "svg", "button-icon", "select", "option"]);
const BLOCK_TAGS = new Set(["p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "tr", "blockquote", "figcaption", "dd", "dt", "summary", "ul", "ol", "header", "footer"]);

/** Texte d'un élément, espaces normalisés ; les retours de ligne entre blocs sont conservés. */
function textOf(n: Node): string {
  const parts: string[] = [];
  const rec = (x: Node) => {
    if (!isEl(x)) {
      parts.push(decodeEntities(x.text));
      return;
    }
    if (SKIP_TEXT.has(x.tag) || x.attrs.hidden !== undefined || x.attrs["aria-hidden"] === "true" || /(^|\s)(visually-hidden|visuallyhidden|sr-only|screen-reader-text)(\s|$)/.test(x.attrs.class ?? "")) return;
    if (x.tag === "br") {
      parts.push("\n");
      return;
    }
    const block = BLOCK_TAGS.has(x.tag);
    if (block) parts.push("\n");
    x.children.forEach(rec);
    if (block) parts.push("\n");
  };
  rec(n);
  return parts
    .join("")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

/* ------------------------------------------------------------------ */
/* Outils                                                              */
/* ------------------------------------------------------------------ */

const UTILITY = /(^|\/)(cart|panier|checkout|commande|order|account|compte|mon-compte|my-account|login|connexion|register|inscription|search|recherche|wishlist|favoris|logout|deconnexion|password)(\/|$|\.|\?)/i;
const NON_PAGE = /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|docx?|xlsx?|ico|xml|json|txt)(\?|$)/i;
const SOCIAL: [string, RegExp][] = [
  ["facebook", /facebook\.com|fb\.me/i],
  ["instagram", /instagram\.com/i],
  ["tiktok", /tiktok\.com/i],
  ["youtube", /youtube\.com|youtu\.be/i],
  ["linkedin", /linkedin\.com/i],
  ["pinterest", /pinterest\./i],
  ["x", /(^|\.|\/)(twitter|x)\.com/i],
  ["whatsapp", /wa\.me|whatsapp\.com/i],
];
const socialOf = (url: string) => SOCIAL.find(([, re]) => re.test(url))?.[0];

function jsonLd(doc: El): any[] {
  const out: any[] = [];
  for (const s of findAll(doc, (e) => e.tag === "script" && /ld\+json/i.test(e.attrs.type ?? ""))) {
    try {
      const data = JSON.parse(textRaw(s).trim());
      const flat = (x: any) => {
        if (!x || typeof x !== "object") return;
        if (Array.isArray(x)) return x.forEach(flat);
        out.push(x);
        if (Array.isArray(x["@graph"])) x["@graph"].forEach(flat);
      };
      flat(data);
    } catch {
      /* JSON-LD invalide : ignoré */
    }
  }
  return out;
}
const textRaw = (e: El) => e.children.map((c) => (isEl(c) ? "" : c.text)).join("");
const ldIs = (x: any, ...types: string[]) => {
  const t = x?.["@type"];
  const arr = Array.isArray(t) ? t : [t];
  return arr.some((v) => typeof v === "string" && types.some((ty) => v === ty || v.endsWith(ty)));
};
const LOCAL_BUSINESS = ["LocalBusiness", "Store", "ProfessionalService", "HomeAndConstructionBusiness", "Plumber", "Electrician", "HealthAndBeautyBusiness", "SportsActivityLocation", "ExerciseGym", "Restaurant", "LodgingBusiness", "MedicalBusiness", "LegalService", "FinancialService", "AutomotiveBusiness", "FoodEstablishment"];

function metaContent(doc: El, ...names: string[]) {
  for (const n of names) {
    const m = find(doc, (e) => e.tag === "meta" && ((e.attrs.name ?? e.attrs.property ?? e.attrs.itemprop ?? "").toLowerCase() === n.toLowerCase()));
    if (m?.attrs.content) return m.attrs.content.trim();
  }
  return "";
}

/** Prix « 34.00 », « 34,90 € », 34 → centimes. */
function cents(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 100) : undefined;
  let s = String(v).replace(/[^\d.,-]/g, "");
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) && s !== "" ? Math.round(n * 100) : undefined;
}

function htmlToText(html: string) {
  return textOf(parseHtml(html)).replace(/\n/g, "\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ------------------------------------------------------------------ */
/* Plateforme                                                          */
/* ------------------------------------------------------------------ */

type Sig = { platform: SitePlatform; re: RegExp; label: () => string; weight?: number };
const SIGS: Sig[] = [
  { platform: "shopify", re: /cdn\.shopify\.com/i, label: () => L("images et fichiers servis par cdn.shopify.com", "assets served by cdn.shopify.com") },
  { platform: "shopify", re: /Shopify\.theme|window\.Shopify\b|Shopify\.shop\s*=/, label: () => L("objet JavaScript « Shopify » dans la page", "“Shopify” JavaScript object in the page"), weight: 2 },
  { platform: "shopify", re: /["'(]\/cdn\/shop\//i, label: () => L("fichiers du thème sous /cdn/shop/", "theme files under /cdn/shop/") },
  { platform: "shopify", re: /shopify-section|myshopify\.com/i, label: () => L("sections de thème Shopify (shopify-section)", "Shopify theme sections (shopify-section)") },
  { platform: "woocommerce", re: /wp-content\/plugins\/woocommerce|woocommerce-page|class=["'][^"']*\bwoocommerce\b|wc-block-|wc-cart-fragments/i, label: () => L("extension WooCommerce (classes woocommerce / wc-*)", "WooCommerce plugin (woocommerce / wc-* classes)"), weight: 2 },
  { platform: "wordpress", re: /\/wp-content\/|\/wp-includes\//i, label: () => L("dossiers WordPress wp-content / wp-includes", "WordPress wp-content / wp-includes folders"), weight: 2 },
  { platform: "wordpress", re: /\/wp-json\//i, label: () => L("API WordPress /wp-json/", "WordPress /wp-json/ API") },
  { platform: "prestashop", re: /prestashop/i, label: () => L("mentions « prestashop » dans la page", "“prestashop” references in the page"), weight: 2 },
  { platform: "wix", re: /static\.wixstatic\.com|parastorage\.com/i, label: () => L("images servies par static.wixstatic.com", "images served by static.wixstatic.com"), weight: 2 },
  { platform: "wix", re: /wix-warmup-data|wixBiSession|_wixCIDX/i, label: () => L("données Wix embarquées (warmup data)", "embedded Wix data (warmup data)") },
  { platform: "squarespace", re: /static1\.squarespace\.com|squarespace-cdn\.com|Static\.SQUARESPACE_CONTEXT/i, label: () => L("fichiers servis par Squarespace", "assets served by Squarespace"), weight: 2 },
  { platform: "webflow", re: /data-wf-site|data-wf-page/i, label: () => L("attributs Webflow (data-wf-site)", "Webflow attributes (data-wf-site)"), weight: 2 },
  { platform: "webflow", re: /website-files\.com|webflow\.js|assets\.website-files/i, label: () => L("fichiers servis par Webflow (website-files.com)", "assets served by Webflow (website-files.com)") },
  { platform: "jimdo", re: /jimdo|jimcdn\.com/i, label: () => L("fichiers servis par Jimdo", "assets served by Jimdo"), weight: 2 },
  { platform: "weebly", re: /editmysite\.com|weebly/i, label: () => L("fichiers servis par Weebly / Square Online (editmysite.com)", "assets served by Weebly / Square Online (editmysite.com)"), weight: 2 },
  { platform: "magento", re: /data-mage-init|Magento_|mage\/cookies|\/static\/version\d+\/frontend\//i, label: () => L("modules Magento dans la page", "Magento modules in the page"), weight: 2 },
  { platform: "bigcommerce", re: /bigcommerce\.com|cdn11\.bigcommerce/i, label: () => L("fichiers servis par BigCommerce", "assets served by BigCommerce"), weight: 2 },
  { platform: "ecwid", re: /app\.ecwid\.com|ecwid/i, label: () => L("boutique Ecwid intégrée", "embedded Ecwid store") },
  { platform: "odoo", re: /\/web\/assets\/|odoo|o_main_navbar/i, label: () => L("fichiers et classes Odoo", "Odoo assets and classes") },
  { platform: "godaddy", re: /img1\.wsimg\.com|godaddy|Go Daddy Website Builder/i, label: () => L("fichiers servis par GoDaddy (img1.wsimg.com)", "assets served by GoDaddy (img1.wsimg.com)"), weight: 2 },
];
const GENERATORS: [SitePlatform, RegExp][] = [
  ["woocommerce", /woocommerce/i],
  ["wordpress", /wordpress/i],
  ["shopify", /shopify/i],
  ["prestashop", /prestashop/i],
  ["wix", /wix/i],
  ["squarespace", /squarespace/i],
  ["webflow", /webflow/i],
  ["jimdo", /jimdo/i],
  ["weebly", /weebly|square online/i],
  ["magento", /magento/i],
  ["bigcommerce", /bigcommerce/i],
  ["odoo", /odoo/i],
  ["godaddy", /go ?daddy|starfield/i],
];

export function detectPlatform(html: string, doc?: El): { platform: SitePlatform; evidence: string[] } {
  const d = doc ?? parseHtml(html);
  const score = new Map<SitePlatform, number>();
  const ev = new Map<SitePlatform, string[]>();
  const add = (p: SitePlatform, w: number, e: string) => {
    score.set(p, (score.get(p) ?? 0) + w);
    ev.set(p, [...(ev.get(p) ?? []), e]);
  };
  for (const g of findAll(d, (e) => e.tag === "meta" && (e.attrs.name ?? "").toLowerCase() === "generator")) {
    const c = g.attrs.content ?? "";
    for (const [p, re] of GENERATORS) if (re.test(c)) add(p, 4, L(`balise generator « ${c} »`, `generator tag “${c}”`));
  }
  for (const s of SIGS) if (s.re.test(html)) add(s.platform, s.weight ?? 1, s.label());
  // WooCommerce est une extension de WordPress : les indices WordPress comptent aussi pour WooCommerce.
  if (score.has("woocommerce") && score.has("wordpress")) {
    add("woocommerce", score.get("wordpress")!, L("site WordPress", "WordPress site"));
    ev.set("woocommerce", [...new Set([...(ev.get("woocommerce") ?? []), ...(ev.get("wordpress") ?? [])])]);
  }
  // Ecwid s'intègre souvent dans un autre site : il ne gagne que s'il est seul.
  const ranked = [...score.entries()].filter(([p]) => p !== "ecwid" || score.size === 1).sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] < 1) return { platform: "custom", evidence: [L("aucun indice d'une plateforme connue : site fait sur mesure ou plateforme non identifiée", "no sign of a known platform: custom-built site or unidentified platform")] };
  const p = ranked[0][0];
  return { platform: p, evidence: [...new Set(ev.get(p) ?? [])] };
}

/* ------------------------------------------------------------------ */
/* Couleurs et polices                                                 */
/* ------------------------------------------------------------------ */

const NAMED: Record<string, string> = { white: "#FFFFFF", black: "#000000" };
function normColor(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) {
      if (h.length === 4 && h[3] === "0") return null;
      h = h.slice(0, 3).split("").map((c) => c + c).join("");
    } else if (h.length === 8) {
      if (parseInt(h.slice(6), 16) < 128) return null;
      h = h.slice(0, 6);
    } else if (h.length !== 6) return null;
    return `#${h.toUpperCase()}`;
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    if (m[4] !== undefined) {
      const a = m[4].endsWith("%") ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
      if (a < 0.5) return null;
    }
    return toHex(+m[1], +m[2], +m[3]);
  }
  m = v.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/);
  if (m) {
    const [r, g, b] = hslToRgb(+m[1] / 360, +m[2] / 100, +m[3] / 100);
    return toHex(r, g, b);
  }
  // triplets « 18, 18, 18 » (variables de thème Shopify)
  m = v.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (m) return toHex(+m[1], +m[2], +m[3]);
  return null;
}
const toHex = (r: number, g: number, b: number) => (r > 255 || g > 255 || b > 255 ? null : `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase()}`) as string;
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
function hexHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
const isNeutral = (hex: string) => {
  const [, s, l] = hexHsl(hex);
  return s < 0.12 || l > 0.9 || l < 0.06;
};
const lum = (hex: string) => hexHsl(hex)[2];
const COLOR_IN = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black)\b/g;

type CssRule = { selector: string; decls: Record<string, string> };
function parseCss(css: string): { rules: CssRule[]; fontFaces: string[] } {
  const clean = css.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, "");
  const rules: CssRule[] = [];
  const fontFaces: string[] = [];
  // lecture à la main des accolades (pas d'expression régulière à retours arrière) ;
  // les @media / @supports sont aplatis : leurs règles internes sont gardées
  const blocks: [string, string][] = [];
  const stack: string[] = [];
  let buf = "";
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === "{") {
      stack.push(buf.trim());
      buf = "";
    } else if (ch === "}") {
      const sel = stack.pop();
      if (sel !== undefined && buf.includes(":")) blocks.push([sel.slice(sel.lastIndexOf(";") + 1).trim(), buf]);
      buf = "";
    } else buf += ch;
  }
  for (const [selector, body] of blocks) {
    const decls: Record<string, string> = {};
    for (const d of body.split(";")) {
      const i = d.indexOf(":");
      if (i > 0) decls[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim().replace(/\s*!important$/, "");
    }
    if (/^@font-face/i.test(selector)) {
      const fam = decls["font-family"]?.replace(/["']/g, "").trim();
      if (fam) fontFaces.push(fam);
      continue;
    }
    rules.push({ selector: selector.replace(/^@[^{]*$/, "").trim(), decls });
  }
  return { rules, fontFaces };
}

const GENERIC_FONTS = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|-apple-system|blinkmacsystemfont|inherit|initial|unset|helvetica|arial|segoe ui|roboto|times new roman|times|georgia|apple color emoji|segoe ui emoji|segoe ui symbol|noto color emoji|emoji)$/i;
function firstFont(value: string, vars: Map<string, string>, depth = 0): string | undefined {
  const v = value.trim();
  const vm = v.match(/^var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/);
  if (vm && depth < 4) {
    const r = vars.get(vm[1]);
    return r ? firstFont(r, vars, depth + 1) : vm[2] ? firstFont(vm[2], vars, depth + 1) : undefined;
  }
  for (const part of v.split(",")) {
    const name = part.trim().replace(/^["']|["']$/g, "").trim();
    if (name && !GENERIC_FONTS.test(name) && !/^var\(/.test(name)) return name;
  }
  // repli : une police générique « connue » (Georgia, Arial…) déclarée en premier reste une vraie information
  const first = v.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  return first && !/^(serif|sans-serif|monospace|system-ui|inherit|initial|unset|-apple-system|var\()/i.test(first) ? first : undefined;
}

function googleFontFamilies(href: string): string[] {
  try {
    const u = new URL(href, "https://x.invalid");
    if (!/fonts\.googleapis\.com|fonts\.bunny\.net/i.test(u.hostname)) return [];
    return u.searchParams
      .getAll("family")
      .flatMap((f) => f.split("|"))
      .map((f) => f.split(":")[0].replace(/\+/g, " ").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

type Styles = { palette?: BrandPalette; colorsFound: string[]; fonts: SiteImport["fonts"] };

function analyseStyles(cssTexts: string[], themeColor: string | undefined, fontHints: string[]): Styles {
  const freq = new Map<string, number>();
  const bump = (c: string | null, w = 1) => {
    if (c) freq.set(c, (freq.get(c) ?? 0) + w);
  };
  const vars = new Map<string, string>();
  const allRules: CssRule[] = [];
  const faces: string[] = [];
  for (const css of cssTexts) {
    const { rules, fontFaces } = parseCss(css);
    faces.push(...fontFaces);
    for (const r of rules) {
      allRules.push(r);
      for (const [k, v] of Object.entries(r.decls)) if (k.startsWith("--")) vars.set(k, v);
    }
  }
  const resolve = (v: string, depth = 0): string => {
    const m = v.match(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/);
    if (!m || depth > 4) return v;
    const r = vars.get(m[1]) ?? m[2] ?? "";
    return resolve(v.replace(m[0], r), depth + 1);
  };
  const colorFrom = (v: string | undefined, isVar = false): string | null => {
    if (!v) return null;
    const r = resolve(v).trim();
    if (isVar) {
      const t = normColor(r);
      if (t) return t;
    }
    for (const m of r.matchAll(COLOR_IN)) {
      const c = normColor(m[0]);
      if (c) return c;
    }
    return null;
  };

  const roles: { button: string[]; buttonText: string[]; link: string[]; bodyBg: string[]; bodyText: string[]; heading: string[]; named: Record<string, string> } = { button: [], buttonText: [], link: [], bodyBg: [], bodyText: [], heading: [], named: {} };
  for (const [k, v] of vars) {
    if (!/colou?r|bg|background|brand|primary|accent|secondary|text|foreground/i.test(k)) continue;
    const c = colorFrom(v, true);
    if (!c) continue;
    bump(c, 2);
    const key = k.replace(/^--/, "").toLowerCase();
    for (const role of ["primary", "brand", "accent", "secondary", "button", "background", "bg", "text", "foreground", "base-text", "base-background"]) {
      if (key.includes(role) && !roles.named[role]) roles.named[role] = c;
    }
  }
  const fontsBy: { heading?: string; body?: string } = {};
  for (const r of allRules) {
    const sel = r.selector.toLowerCase();
    const bg = colorFrom(r.decls["background-color"] ?? r.decls.background);
    const fg = colorFrom(r.decls.color);
    bump(bg);
    bump(fg);
    if (r.decls["border-color"]) bump(colorFrom(r.decls["border-color"]));
    const isButton = /(^|[\s,.#>+~])(button|\.btn|\.button|\.cta|\.w-button|input\[type=["']?submit|\.wp-block-button__link|\.wp-element-button|\.shopify-payment-button)/.test(sel) || /\.(btn|button)[\w-]*/.test(sel);
    const isBody = /(^|,)\s*(html|body|:root)\s*(,|$)/.test(sel);
    const isLink = /(^|,)\s*a(\s*,|\s*$|:hover|:link|:visited)/.test(sel);
    const isHeading = /(^|,|\s)(h1|h2|h3|\.h1|\.h2|\.heading|\.title)\b/.test(sel);
    if (isButton && !/:disabled|\[disabled\]/.test(sel)) {
      if (bg) roles.button.push(bg);
      if (fg) roles.buttonText.push(fg);
    }
    if (isBody) {
      if (bg) roles.bodyBg.push(bg);
      if (fg) roles.bodyText.push(fg);
      if (r.decls["font-family"]) fontsBy.body ??= firstFont(r.decls["font-family"], vars);
    }
    if (isLink && fg) roles.link.push(fg);
    if (isHeading) {
      if (fg) roles.heading.push(fg);
      if (r.decls["font-family"]) fontsBy.heading ??= firstFont(r.decls["font-family"], vars);
    }
  }
  // variables de polices de thème (Shopify : --font-heading-family / --font-body-family ; WordPress : --wp--preset--font-family--*)
  for (const [k, v] of vars) {
    if (/font.*(heading|title|display)|heading.*font/i.test(k)) fontsBy.heading ??= firstFont(v, vars);
    if (/font.*(body|base|text)|body.*font/i.test(k)) fontsBy.body ??= firstFont(v, vars);
  }
  const theme = themeColor ? normColor(themeColor) : null;
  if (theme) bump(theme, 3);

  const colorsFound = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 12);
  const brandish = (list: (string | undefined | null)[]) => list.find((c): c is string => !!c && !isNeutral(c));
  const saturated = colorsFound.filter((c) => !isNeutral(c));
  const primary =
    brandish([roles.named.primary, roles.named.brand, roles.named.button]) ?? brandish(roles.button) ?? brandish([theme]) ?? brandish([roles.named.accent]) ?? brandish(roles.link) ?? saturated[0] ?? roles.button[0];
  const distinct = (c: string | undefined | null) => !!c && c !== primary && !isNeutral(c);
  const accent = [roles.named.accent, roles.named.secondary, ...roles.link, ...roles.button, ...saturated].find(distinct) ?? undefined;
  const secondary = [roles.named.secondary, ...saturated].find((c) => distinct(c) && c !== accent) ?? undefined;
  const light =
    [roles.named["base-background"], roles.named.background, roles.named.bg, ...roles.bodyBg].find((c): c is string => !!c && lum(c) > 0.75) ??
    (roles.bodyBg.length ? undefined : "#FFFFFF"); // fond par défaut du navigateur quand le site n'en déclare pas
  const dark = [roles.named["base-text"], roles.named.text, roles.named.foreground, ...roles.bodyText, ...roles.heading].find((c): c is string => !!c && lum(c) < 0.35) ?? (roles.bodyText.length ? roles.bodyText[0] : "#000000");
  let palette: BrandPalette | undefined;
  if (primary) {
    palette = { primary, secondary: secondary ?? accent ?? primary, accent: accent ?? primary, light: light ?? roles.bodyBg[0] ?? "#FFFFFF", dark };
  }
  // même police écrite avec des casses différentes (« Lato » / « lato ») : une seule, avec la casse déclarée
  const all: string[] = [];
  for (const f of [...fontHints, ...faces, fontsBy.heading, fontsBy.body]) {
    const x = f?.trim();
    if (x && !all.some((a) => a.toLowerCase() === x.toLowerCase())) all.push(x);
  }
  const canon = (f?: string) => (f ? all.find((a) => a.toLowerCase() === f.toLowerCase()) ?? f : undefined);
  const heading = canon(fontsBy.heading ?? fontHints[0] ?? faces[0]);
  const body = canon(fontsBy.body ?? fontHints[1] ?? fontHints[0] ?? faces[1] ?? faces[0]);
  return { palette, colorsFound, fonts: { heading, body, all } };
}

/* ------------------------------------------------------------------ */
/* Contexte d'exploration                                              */
/* ------------------------------------------------------------------ */

type Ctx = {
  fetch: SiteFetcher;
  origin: string;
  basePath: string; // ex. « / » ou « /shopify/ »
  base: URL;
  warnings: string[];
};

function absUrl(src: string | undefined, base: string): string {
  if (!src) return "";
  const s = src.trim();
  if (!s || /^(javascript|about|blob):/i.test(s)) return "";
  if (/^data:/i.test(s)) return s;
  try {
    return new URL(s.startsWith("//") ? `${new URL(base).protocol}${s}` : s, base).toString();
  } catch {
    return "";
  }
}
const sameSite = (ctx: Ctx, u: string) => {
  try {
    const x = new URL(u);
    return x.origin === ctx.origin && (x.pathname + "/").startsWith(ctx.basePath);
  } catch {
    return false;
  }
};
/** Chemin relatif au site (« / », « /pages/a-propos »). */
function sitePath(ctx: Ctx, u: string) {
  const x = new URL(u);
  let p = x.pathname.startsWith(ctx.basePath) ? "/" + x.pathname.slice(ctx.basePath.length) : x.pathname;
  p = p.replace(/\/index\.html?$/i, "/").replace(/\/+$/, "") || "/";
  return p;
}
const pageKey = (ctx: Ctx, u: string) => sitePath(ctx, u).replace(/\.html?$/i, "").toLowerCase();

function imgSrc(e: El, base: string): string {
  const pick = (set: string) => {
    const items = set
      .split(/,\s+(?=\S)/)
      .map((x) => x.trim().split(/\s+/))
      .map(([u, d]) => ({ u, w: parseFloat(d ?? "1") || 1 }))
      .sort((a, b) => b.w - a.w);
    return items[0]?.u;
  };
  const src =
    e.attrs["data-src"] || e.attrs["data-lazy-src"] || e.attrs["data-original"] || (e.attrs.srcset ? pick(e.attrs.srcset) : "") || (e.attrs["data-srcset"] ? pick(e.attrs["data-srcset"]) : "") || e.attrs.src || "";
  const u = absUrl(src.replace(/\{width\}/g, "1200"), base);
  if (!u || /^data:image\/(gif|png);base64,.{0,200}$/i.test(u)) return ""; // pixels de remplacement
  return u;
}
function bgImage(e: El, base: string) {
  const st = e.attrs.style ?? "";
  const m = st.match(/background(?:-image)?\s*:[^;]*url\((['"]?)([^'")]+)\1\)/i);
  return m ? absUrl(m[2], base) : "";
}

/* ------------------------------------------------------------------ */
/* Blocs de page                                                       */
/* ------------------------------------------------------------------ */

const HEADING = /^h[1-6]$/;
const buttonLike = (a: El) => a.tag === "a" && /btn|button|cta|w-button|wp-block-button|link--primary/i.test(cls(a));

function mainOf(doc: El): El {
  const main = find(doc, (e) => e.tag === "main" || e.attrs.role === "main") ?? find(doc, (e) => /(^|\s)(main-content|maincontent|site-content|page-content|content)(\s|$)/.test(e.attrs.id ?? ""));
  if (main) return main;
  return find(doc, byTag("body")) ?? doc;
}
const inContent = (e: El) => !!ancestor(e, (a) => a.tag === "main" || a.tag === "article" || a.attrs.role === "main");
const isChrome = (e: El) => (["header", "footer"].includes(e.tag) && !inContent(e)) || ["nav", "script", "style", "noscript", "template", "form-skip"].includes(e.tag) || /(^|\s)(site-header|site-footer|header-wrapper|footer-wrapper|announcement-bar|cookie|skip-to-content|skip-link)/.test(cls(e)) || (/(^|\s)(w-nav|navbar|nav-bar|site-nav|main-nav|footer)(\s|$)/.test(cls(e)) && !inContent(e)) || e.attrs.role === "navigation" || e.attrs.role === "banner" || e.attrs.role === "contentinfo";

/** Découpe le contenu principal en sections (enfants du premier conteneur qui en a plusieurs). */
function sectionsOf(main: El): El[] {
  let box = main;
  for (let i = 0; i < 6; i++) {
    const kids = box.children.filter(isEl).filter((k) => !isChrome(k) && !["script", "style", "link", "meta"].includes(k.tag));
    if (kids.length === 1 && !HEADING.test(kids[0].tag) && kids[0].tag !== "p" && kids[0].tag !== "img") box = kids[0];
    else break;
  }
  const kids = box.children.filter(isEl).filter((k) => !isChrome(k) && !["script", "style", "link", "meta", "input"].includes(k.tag));
  // les éléments « en ligne » consécutifs (titres, paragraphes) forment une section de texte suivi
  const out: El[] = [];
  let flow: El | null = null;
  for (const k of kids) {
    const inline = HEADING.test(k.tag) || ["p", "ul", "ol", "img", "figure", "blockquote", "details", "table", "hr", "a", "span", "strong", "em", "address", "dl", "iframe", "video", "picture"].includes(k.tag);
    if (inline) {
      if (!flow) {
        flow = { tag: "#flow", attrs: {}, children: [], parent: box };
        out.push(flow);
      }
      flow.children.push(k);
    } else {
      flow = null;
      out.push(k);
    }
  }
  return out;
}

type Ctx2 = { base: string; first: boolean; isHome: boolean };

function headingText(e: El) {
  return oneLine(textOf(e));
}
function paragraphsOf(sec: El, exclude: Set<El>): string[] {
  const out: string[] = [];
  walk(sec, (e) => {
    if (exclude.has(e) || e.tag === "form") return false;
    if (["p", "address"].includes(e.tag) || (e.tag === "div" && /rte|rich-?text|text-block|description|subtitle|lead|w-richtext|__text/.test(cls(e)) && !find(e, byTag("p", "div", "h1", "h2", "h3", "h4", "ul")))) {
      if (ancestor(e, (a) => exclude.has(a))) return false;
      if (find(e, (x) => x.tag === "a" && buttonLike(x)) && oneLine(textOf(e)) === oneLine(textOf(find(e, (x) => x.tag === "a")!))) return false;
      const t = textOf(e).trim();
      if (t) out.push(t);
      return false;
    }
  });
  return out;
}
function buttonOf(sec: El, base: string): { label: string; url: string } | undefined {
  const a = find(sec, (e) => buttonLike(e) && !!oneLine(textOf(e))) ?? find(sec, (e) => e.tag === "button" && !!e.attrs.onclick);
  if (!a) return undefined;
  const url = absUrl(a.attrs.href, base);
  return { label: oneLine(textOf(a)), url: url || a.attrs.href || "" };
}
function imagesOf(sec: El, base: string) {
  const out: { src: string; alt?: string; el: El }[] = [];
  const own = bgImage(sec, base);
  if (own) out.push({ src: own, el: sec });
  walk(sec, (e) => {
    if (e.tag === "img") {
      const src = imgSrc(e, base);
      const w = Number(e.attrs.width ?? 0);
      if (src && !(w && w < 40) && !/icon|sprite|spacer|pixel/i.test(cls(e))) out.push({ src, alt: e.attrs.alt?.trim() || undefined, el: e });
    } else {
      const bg = bgImage(e, base);
      if (bg) out.push({ src: bg, el: e });
    }
  });
  return out.filter((x, i, arr) => arr.findIndex((y) => y.src === x.src) === i);
}
const productHandle = (href: string) => href.match(/\/(?:products?|produit|produits|shop\/p|p)\/([^/?#]+?)(?:\.html?)?\/?(?:[?#]|$)/i)?.[1];

function videoOf(e: El, base: string): SiteBlock | null {
  if (e.tag === "video") {
    const src = e.attrs.src || find(e, byTag("source"))?.attrs.src;
    return src ? { kind: "video", src: absUrl(src, base), poster: e.attrs.poster ? absUrl(e.attrs.poster, base) : undefined } : null;
  }
  if (e.tag === "iframe" && /youtube|youtu\.be|vimeo|dailymotion|wistia/i.test(e.attrs.src ?? e.attrs["data-src"] ?? "")) return { kind: "video", src: absUrl(e.attrs.src || e.attrs["data-src"], base) };
  return null;
}

function sequential(sec: El, c: Ctx2): SiteBlock[] {
  const out: SiteBlock[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) out.push({ kind: "text", text: buf.join("\n\n") });
    buf = [];
  };
  const rec = (e: El) => {
    if (isChrome(e) || e.tag === "form") return;
    if (HEADING.test(e.tag)) {
      const t = headingText(e);
      if (t) {
        flush();
        out.push({ kind: "heading", level: Number(e.tag[1]), text: t });
      }
      return;
    }
    const v = videoOf(e, c.base);
    if (v) {
      flush();
      out.push(v);
      return;
    }
    if (e.tag === "img") {
      const src = imgSrc(e, c.base);
      if (src) {
        flush();
        out.push({ kind: "image", src, alt: e.attrs.alt?.trim() || undefined });
      }
      return;
    }
    if (e.tag === "details") {
      flush();
      const faq = faqOf({ tag: "#flow", attrs: {}, children: [e], parent: null });
      if (faq) out.push(faq);
      return;
    }
    if (e.tag === "blockquote") {
      const t = textOf(e);
      if (t) buf.push(t);
      return;
    }
    if (e.tag === "p" || e.tag === "address" || e.tag === "table" || e.tag === "dl") {
      const t = textOf(e);
      if (t) buf.push(t);
      for (const img of findAll(e, byTag("img"))) {
        const src = imgSrc(img, c.base);
        if (src) {
          flush();
          out.push({ kind: "image", src, alt: img.attrs.alt?.trim() || undefined });
        }
      }
      return;
    }
    if (e.tag === "ul" || e.tag === "ol") {
      const handles = [...new Set(findAll(e, (x) => x.tag === "a" && !!productHandle(x.attrs.href ?? "")).map((a) => productHandle(a.attrs.href)!))];
      if (handles.length >= 2) {
        flush();
        out.push({ kind: "products", handles });
        return;
      }
      const items = e.children.filter(isEl).filter((x) => x.tag === "li").map((li) => oneLine(textOf(li))).filter(Boolean);
      if (items.length) buf.push(items.map((x) => `• ${x}`).join("\n"));
      return;
    }
    if (e.tag === "a" && buttonLike(e)) {
      const t = oneLine(textOf(e));
      if (t) {
        flush();
        out.push({ kind: "cta", heading: t, button: { label: t, url: absUrl(e.attrs.href, c.base) } });
      }
      return;
    }
    const hasBlockKids = e.children.some((k) => isEl(k) && (BLOCK_TAGS.has(k.tag) || HEADING.test(k.tag) || k.tag === "img" || k.tag === "figure" || k.tag === "picture"));
    if (!hasBlockKids && !["#flow", "#root"].includes(e.tag)) {
      const t = textOf(e);
      if (t && !["span", "strong", "em", "b", "i", "small", "label", "button", "svg"].includes(e.tag)) buf.push(t);
      else if (t && e.parent?.tag === "#flow") buf.push(t);
      return;
    }
    const bg = bgImage(e, c.base);
    if (bg) {
      flush();
      out.push({ kind: "image", src: bg });
    }
    for (const k of e.children) if (isEl(k)) rec(k);
  };
  rec(sec);
  flush();
  return out;
}

function faqOf(sec: El): SiteBlock | null {
  const det = findAll(sec, byTag("details"));
  const items: { q: string; a: string }[] = [];
  for (const d of det) {
    const s = find(d, byTag("summary"));
    if (!s) continue;
    const q = oneLine(textOf(s));
    const a = textOf({ ...d, children: d.children.filter((x) => x !== s) } as El);
    if (q && a) items.push({ q, a });
  }
  if (!items.length && /faq|questions|accordion/.test(cls(sec))) {
    // accordéons sans <details> : titre (h3/button) suivi de la réponse
    const qs = findAll(sec, (e) => /^h[3-5]$/.test(e.tag) || (e.tag === "button" && /accordion|faq|question/.test(cls(e))));
    for (const q of qs) {
      const parent = q.parent!;
      const idx = parent.children.indexOf(q);
      const next = parent.children.slice(idx + 1).find((x) => isEl(x)) as El | undefined;
      const a = next ? textOf(next) : "";
      if (a) items.push({ q: oneLine(textOf(q)), a });
    }
  }
  if (!items.length) return null;
  const h = find(sec, (e) => HEADING.test(e.tag) && !ancestor(e, byTag("details")));
  return { kind: "faq", heading: h ? headingText(h) : undefined, items };
}

function testimonialsOf(sec: El): SiteBlock | null {
  const quotes = findAll(sec, (e) => e.tag === "blockquote" || /(^|[\s_-])(testimonial|review|temoignage|avis)(-?item|-?card|__item|__card)?(\s|$)/.test(cls(e)) && /item|card|slide/.test(cls(e)));
  const marked = /testimonial|review|temoignage|avis|t[ée]moignages/.test(cls(sec));
  if (!quotes.length || (!marked && !quotes.some((q) => q.tag === "blockquote"))) return null;
  const items: { quote: string; author?: string }[] = [];
  for (const q of quotes) {
    if (quotes.some((o) => o !== q && ancestor(q, (a) => a === o))) continue; // déjà compté par son parent
    const cite = find(q, (e) => ["cite", "figcaption", "footer"].includes(e.tag) || /author|name|auteur/.test(cls(e))) ?? (q.parent && find(q.parent, (e) => e !== q && ["cite", "figcaption"].includes(e.tag)));
    const quoteEl = q.tag === "blockquote" ? q : find(q, (e) => e.tag === "blockquote" || e.tag === "p" || /quote|text|content/.test(cls(e))) ?? q;
    const quote = oneLine(textOf({ ...quoteEl, children: quoteEl.children.filter((x) => x !== cite) } as El));
    if (quote) items.push({ quote, author: cite ? oneLine(textOf(cite)).replace(/^[—–-]\s*/, "") || undefined : undefined });
  }
  if (!items.length) return null;
  const h = find(sec, (e) => HEADING.test(e.tag) && !quotes.some((q) => ancestor(e, (a) => a === q)));
  return { kind: "testimonials", heading: h ? headingText(h) : undefined, items };
}

function featuresOf(sec: El, c: Ctx2, imgs: { src: string; el: El }[]): SiteBlock | null {
  const heads = findAll(sec, (e) => /^h[2-5]$/.test(e.tag));
  if (heads.length < 3) {
    // liste à puces de points forts dans une section dédiée
    const ul = find(sec, byTag("ul", "ol"));
    const lis = ul ? ul.children.filter(isEl).filter((x) => x.tag === "li") : [];
    if (lis.length >= 3 && /feature|benefit|avantage|atout|point|usp|why|pourquoi|engagement|icon/.test(cls(sec) + cls(ul!)) && lis.every((li) => !find(li, byTag("a")) || !!textOf(li))) {
      const h = find(sec, (e) => HEADING.test(e.tag));
      return {
        kind: "features",
        heading: h ? headingText(h) : undefined,
        items: lis.map((li) => {
          const strong = find(li, byTag("strong", "b", "h3", "h4"));
          const title = strong ? oneLine(textOf(strong)) : oneLine(textOf(li));
          const rest = strong ? oneLine(textOf(li).replace(textOf(strong), "")).replace(/^[:—–-]\s*/, "") : "";
          const img = find(li, byTag("img"));
          return { title, text: rest || undefined, image: img ? imgSrc(img, c.base) || undefined : undefined };
        }),
      };
    }
    return null;
  }
  // titre de section = premier titre plus haut que les autres
  const levels = heads.map((h) => Number(h.tag[1]));
  const itemLevel = Math.max(...levels);
  const itemHeads = heads.filter((h) => Number(h.tag[1]) === itemLevel);
  if (itemHeads.length < 2) return null;
  const sectionHead = heads.find((h) => Number(h.tag[1]) < itemLevel);
  const items = itemHeads.map((h) => {
    // conteneur de l'élément : plus grand ancêtre qui ne contient qu'un seul de ces titres
    let box: El = h;
    while (box.parent && box.parent !== sec && findAll(box.parent, (e) => itemHeads.includes(e)).length === 1) box = box.parent;
    const texts = paragraphsOf(box, new Set([h]));
    const img = imgs.find((i) => i.el === box || ancestor(i.el, (a) => a === box));
    return { title: headingText(h), text: texts.join("\n\n") || undefined, image: img?.src };
  });
  return { kind: "features", heading: sectionHead ? headingText(sectionHead) : undefined, items };
}

function blocksOfSection(sec: El, c: Ctx2): SiteBlock[] {
  const out: SiteBlock[] = [];
  const k = cls(sec);
  const imgs = imagesOf(sec, c.base);
  const heads = findAll(sec, (e) => HEADING.test(e.tag));
  const firstHead = heads[0];
  const btn = buttonOf(sec, c.base);
  const text = paragraphsOf(sec, new Set()).join("\n\n");
  // formulaire de contact (message libre), pas une simple inscription à la lettre d'information
  const hasForm = (sec.tag === "form" && !!find(sec, byTag("textarea"))) || !!find(sec, (e) => e.tag === "form" && (!!find(e, byTag("textarea")) || (/contact/.test(cls(e)) && !/newsletter/.test(cls(e)))));
  const videos = findAll(sec, (e) => !!videoOf(e, c.base)).map((e) => videoOf(e, c.base)!);

  if (sec.tag === "#flow") return sequential(sec, c);
  // texte riche (éditeur de contenu) : repris tel quel, dans l'ordre
  const richText = (e: El) => /(^|\s)(rte|rich-?text|entry-content|post-content|w-richtext|page-content|wp-block-post-content)(\s|$)/.test(e.attrs.class ?? "");
  if (richText(sec) && !find(sec, byTag("form"))) return sequential(sec, c);
  // vidéo : titre + texte éventuels, puis la vidéo
  if (videos.length && !hasForm && heads.length <= 1 && imgs.length <= 1) {
    if (firstHead) out.push({ kind: "heading", level: Number(firstHead.tag[1]), text: headingText(firstHead) });
    if (text) out.push({ kind: "text", text });
    out.push(...videos);
    return out;
  }
  // héros : premier titre principal accompagné d'une grande image ou d'un fond
  const h1 = heads.find((h) => h.tag === "h1");
  const heroHead = h1 ?? (c.first && firstHead && imgs.length ? firstHead : undefined);
  if (heroHead && !find(sec, byTag("ul", "ol", "form", "details")) && text.length < 600 && (c.first || /hero|banner|banniere|slideshow|masthead|cover|jumbotron/.test(k)) && (imgs.length > 0 || /hero|banner|banniere|cover/.test(k)) && heads.length <= 2 && imgs.length <= 2) {
    out.push({ kind: "hero", heading: headingText(heroHead), text: text || undefined, image: imgs[0]?.src, button: btn });
    return out;
  }
  const faq = faqOf(sec);
  if (faq) return [faq];
  const testi = testimonialsOf(sec);
  if (testi) return [testi];
  // produits mis en avant (liens vers des fiches produits)
  const handles = [...new Set(findAll(sec, (e) => e.tag === "a" && !!productHandle(e.attrs.href ?? "")).map((a) => productHandle(a.attrs.href)!))];
  if (handles.length >= 2) {
    const h = heads.find((x) => !ancestorWithin(x, sec, (a) => a.tag === "a" || /card|product|item|grid/.test(cls(a))));
    out.push({ kind: "products", heading: h ? headingText(h) : undefined, handles });
    return out;
  }
  if (hasForm || /contact/.test(k)) {
    out.push({ kind: "contact", heading: firstHead ? headingText(firstHead) : undefined, text: text || undefined });
    return out;
  }
  const feats = featuresOf(sec, c, imgs);
  if (feats) return [feats];
  // galerie : plusieurs images, peu de texte
  if (imgs.length >= 3 && text.length < 200 && heads.length <= 1) {
    out.push({ kind: "gallery", heading: firstHead ? headingText(firstHead) : undefined, images: imgs.map((i) => i.src) });
    return out;
  }
  // image + texte
  const headAfterText = !!firstHead && order(sec, firstHead) > order(sec, find(sec, byTag("p")));
  if (imgs.length === 1 && (text || firstHead) && heads.length <= 2 && !find(sec, byTag("ul", "ol")) && !headAfterText) {
    const imgPos = order(sec, imgs[0].el);
    const txtPos = order(sec, firstHead ?? find(sec, byTag("p"))!);
    out.push({ kind: "image-text", heading: firstHead ? headingText(firstHead) : undefined, text, image: imgs[0].src, imageSide: /media-on-the-right|image-right|img-right|reverse/.test(k) ? "right" : imgPos <= txtPos ? "left" : "right", button: btn });
    return out;
  }
  // appel à l'action : titre + bouton, sans image
  if (!imgs.length && firstHead && btn && heads.length === 1 && text.length < 400) {
    out.push({ kind: "cta", heading: headingText(firstHead), text: text || undefined, button: btn });
    return out;
  }
  return sequential(sec, c);
}
function ancestorWithin(e: El, stop: El, pred: (a: El) => boolean) {
  let p = e.parent;
  while (p && p !== stop) {
    if (pred(p)) return p;
    p = p.parent;
  }
  return null;
}
function order(root: El, target: El | null | undefined): number {
  if (!target) return Infinity;
  let i = 0, found = -1;
  walk(root, (e) => {
    if (found >= 0) return false;
    if (e === target) found = i;
    i++;
  });
  return found < 0 ? Infinity : found;
}

/** Blocs d'une page, dans l'ordre. */
export function extractBlocks(doc: El, base: string, isHome = false): SiteBlock[] {
  const main = mainOf(doc);
  const secs = sectionsOf(main);
  const out: SiteBlock[] = [];
  secs.forEach((s, i) => out.push(...blocksOfSection(s, { base, first: i === 0, isHome })));
  // fusionne les questions consécutives, supprime les doublons exacts consécutifs
  const merged: SiteBlock[] = [];
  for (const b of out) {
    const prev = merged[merged.length - 1];
    if (prev && prev.kind === "faq" && b.kind === "faq" && !b.heading) prev.items.push(...b.items);
    else if (!prev || JSON.stringify(prev) !== JSON.stringify(b)) merged.push(b);
  }
  return merged;
}

/** Contenu chargé en JavaScript (Wix…) : textes trouvés dans le JSON embarqué de la page. */
function embeddedBlocks(doc: El, base: string): SiteBlock[] {
  const scripts = findAll(doc, (e) => e.tag === "script" && /json/i.test(e.attrs.type ?? "") && !/ld\+json/i.test(e.attrs.type ?? ""));
  const htmlParts: string[] = [];
  const visit = (x: any, key = "") => {
    if (typeof x === "string") {
      if (/<(h[1-6]|p|ul|li)\b[^>]*>/i.test(x)) htmlParts.push(x);
      else if (/^(title|heading)$/i.test(key) && x.trim()) htmlParts.push(`<h2>${x}</h2>`);
      else if (/^(text|description|paragraph)$/i.test(key) && x.trim()) htmlParts.push(`<p>${x}</p>`);
      else if (/^(image|src|uri|url)$/i.test(key) && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(x)) htmlParts.push(`<p><img src="${x}"></p>`);
      return;
    }
    if (Array.isArray(x)) return x.forEach((v) => visit(v, key));
    if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) visit(v, k);
  };
  for (const s of scripts) {
    try {
      visit(JSON.parse(textRaw(s)));
    } catch {
      /* ignoré */
    }
  }
  if (!htmlParts.length) return [];
  const sub = parseHtml(`<main>${htmlParts.join("\n")}</main>`);
  return extractBlocks(sub, base);
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function pageType(path: string, title: string): SitePage["type"] {
  const s = `${path} ${title}`.toLowerCase();
  if (path === "/") return "home";
  if (/\/(products?|produits?|p)\/[^/]+/.test(path)) return "product";
  if (/contact|nous-joindre|get-in-touch/.test(s)) return "contact";
  if (/\bfaq\b|questions/.test(s)) return "faq";
  if (/mentions|legal|l[ée]gales|cgv|cgu|conditions|policies|politique|privacy|confidentialit|terms|cookies|livraison|shipping|retours?\b|refund/.test(s)) return "legal";
  if (/\/(collections?|boutique|shop|store|categor|product-category|catalogue)/.test(path)) return "collection";
  if (/a-propos|about|notre-histoire|histoire|qui-sommes|qui-suis-je|equipe|team|our-story|story|atelier|l-atelier/.test(s)) return "about";
  if (/services?|prestations?|tarifs|pricing|offres?|cours|soins/.test(s)) return "services";
  if (/blog|actualit|news|journal|articles?/.test(s)) return "blog";
  return "other";
}

/** Nom du site d'après le titre de l'accueil : la partie reprise dans le pied de page (« © 2024 Nom »), sinon la dernière. */
function nameFromTitle(title: string, doc: El): string {
  const parts = title.split(/\s+[|–—-]\s+/).map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  const footer = find(doc, (e) => e.tag === "footer" || e.attrs.role === "contentinfo" || /(^|\s)(site-footer|footer)(\s|$)/.test(cls(e)));
  const ft = footer ? textOf(footer).toLowerCase() : "";
  return parts.find((p) => ft.includes(p.toLowerCase())) ?? parts[parts.length - 1];
}

function cleanTitle(t: string, siteName: string) {
  const parts = t.split(/\s+[|–—-]\s+/).map((x) => x.trim()).filter(Boolean);
  const kept = parts.filter((p) => p.toLowerCase() !== siteName.toLowerCase());
  return (kept[0] ?? parts[0] ?? t).trim();
}

/* ------------------------------------------------------------------ */
/* robots.txt                                                          */
/* ------------------------------------------------------------------ */

function robotsRules(txt: string): { allow: string[]; disallow: string[] } {
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let g: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") {
      if (!g || !lastWasAgent) {
        g = { agents: [], allow: [], disallow: [] };
        groups.push(g);
      }
      g.agents.push(v.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!g) continue;
    if (k === "disallow" && v) g.disallow.push(v);
    if (k === "allow" && v) g.allow.push(v);
  }
  const star = groups.filter((x) => x.agents.includes("*"));
  return { allow: star.flatMap((x) => x.allow), disallow: star.flatMap((x) => x.disallow) };
}
function robotsAllows(rules: { allow: string[]; disallow: string[] }, path: string) {
  const match = (pat: string) => {
    if ((pat.match(/\*/g) ?? []).length > 4) return -1; // motif trop complexe : ignoré
    pat = pat.replace(/\*+/g, "*");
    const re = new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    return re.test(path) ? pat.length : -1;
  };
  const d = Math.max(-1, ...rules.disallow.map(match));
  const a = Math.max(-1, ...rules.allow.map(match));
  return d < 0 || a >= d;
}

/* ------------------------------------------------------------------ */
/* Produits                                                            */
/* ------------------------------------------------------------------ */

function shopifyProducts(json: any, ctx: Ctx, currency?: string): SiteProduct[] {
  const list: any[] = Array.isArray(json?.products) ? json.products : [];
  return list.map((p) => {
    const variants: any[] = p.variants ?? [];
    const price = variants.length ? Math.min(...variants.map((v) => cents(v.price) ?? Infinity)) : undefined;
    const cmp = variants.map((v) => cents(v.compare_at_price)).find((x) => x !== undefined && price !== undefined && x > price);
    const hasRealVariants = variants.length > 1 || (variants[0] && variants[0].title !== "Default Title");
    return {
      handle: String(p.handle),
      title: String(p.title ?? ""),
      description: htmlToText(String(p.body_html ?? "")),
      price: Number.isFinite(price) ? price : undefined,
      compareAtPrice: cmp,
      currency,
      images: (p.images ?? []).map((i: any) => absUrl(typeof i === "string" ? i : i?.src, ctx.base.toString())).filter(Boolean),
      variants: hasRealVariants ? variants.map((v) => ({ title: String(v.title), price: cents(v.price), options: [v.option1, v.option2, v.option3].filter((o) => o !== null && o !== undefined && o !== "") })) : undefined,
      url: new URL(`products/${p.handle}`, ctx.base).toString(),
      category: p.product_type || undefined,
    } satisfies SiteProduct;
  });
}

function wooProducts(json: any, ctx: Ctx): SiteProduct[] {
  const list: any[] = Array.isArray(json) ? json : [];
  const minor = (v: any, mu: number) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * Math.pow(10, 2 - mu)) : undefined;
  };
  return list
    .filter((p) => p && (p.type ?? "simple") !== "grouped")
    .map((p) => {
      const pr = p.prices ?? {};
      const mu = Number(pr.currency_minor_unit ?? 2);
      const price = minor(pr.price, mu);
      const regular = minor(pr.regular_price, mu);
      const attrs: any[] = (p.attributes ?? []).filter((a: any) => a.has_variations && Array.isArray(a.terms) && a.terms.length);
      const description = htmlToText(String(p.description || p.short_description || ""));
      return {
        handle: String(p.slug ?? p.id),
        title: decodeEntities(String(p.name ?? "")),
        description,
        price,
        compareAtPrice: regular !== undefined && price !== undefined && regular > price ? regular : undefined,
        currency: pr.currency_code || undefined,
        images: (p.images ?? []).map((i: any) => absUrl(i?.src, ctx.base.toString())).filter(Boolean),
        variants: attrs.length ? attrs[0].terms.map((t: any) => ({ title: String(t.name), options: [String(t.name)] })) : undefined,
        url: p.permalink ? absUrl(p.permalink, ctx.base.toString()) : undefined,
        category: p.categories?.[0]?.name ? decodeEntities(p.categories[0].name) : undefined,
      } satisfies SiteProduct;
    });
}

function ldProduct(items: any[], url: string, base: string): SiteProduct | null {
  const p = items.find((x) => ldIs(x, "Product"));
  if (!p) return null;
  const offers = Array.isArray(p.offers) ? p.offers : p.offers?.offers ?? (p.offers ? [p.offers] : []);
  const offer = offers[0] ?? {};
  const price = cents(offer.price ?? offer.lowPrice);
  const imgs = (Array.isArray(p.image) ? p.image : p.image ? [p.image] : []).map((i: any) => absUrl(typeof i === "string" ? i : i?.url ?? i?.contentUrl, base)).filter(Boolean);
  const handle = productHandle(p.url ?? url) ?? productHandle(url) ?? (new URL(url).pathname.split("/").filter(Boolean).pop() ?? "produit").replace(/\.html?$/, "");
  const variants = offers.length > 1 ? offers.map((o: any) => ({ title: String(o.name ?? o.sku ?? ""), price: cents(o.price) })).filter((v: any) => v.title) : undefined;
  return {
    handle,
    title: decodeEntities(String(p.name ?? "")),
    description: p.description ? htmlToText(String(p.description)) : "",
    price,
    currency: offer.priceCurrency || undefined,
    images: imgs,
    variants: variants?.length ? variants : undefined,
    url: absUrl(p.url, base) || url,
    category: typeof p.category === "string" ? p.category : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */

function svgToDataUri(svg: El): string {
  const ser = (n: Node): string => {
    if (!isEl(n)) return n.text;
    const a = Object.entries(n.attrs)
      .filter(([k]) => !/^on/i.test(k))
      .map(([k, v]) => ` ${k}="${v.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`)
      .join("");
    return n.children.length ? `<${n.tag}${a}>${n.children.map(ser).join("")}</${n.tag}>` : `<${n.tag}${a}/>`;
  };
  // les noms d'attributs SVG sont sensibles à la casse : viewBox est réécrit correctement
  let s = ser(svg).replace(/\sviewbox=/g, " viewBox=").replace(/\spreserveaspectratio=/g, " preserveAspectRatio=").replace(/\sgradientunits=/g, " gradientUnits=").replace(/\sgradienttransform=/g, " gradientTransform=").replace(/<lineargradient/g, "<linearGradient").replace(/<\/lineargradient>/g, "</linearGradient>").replace(/<radialgradient/g, "<radialGradient").replace(/<\/radialgradient>/g, "</radialGradient>").replace(/<clippath/g, "<clipPath").replace(/<\/clippath>/g, "</clipPath>").replace(/\sclippathunits=/g, " clipPathUnits=");
  if (!/xmlns=/.test(s)) s = s.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  return `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;
}

function findLogo(doc: El, base: string, ld: any[], homeHref: (h: string) => boolean): { logo?: SiteImport["logo"]; favicon?: string } {
  type Cand = { src: string; kind: "img" | "svg-inline" | "icon" | "og"; score: number; width?: number; height?: number };
  const cands: Cand[] = [];
  const header = find(doc, (e) => e.tag === "header" || e.attrs.role === "banner" || /(^|\s)(site-header|header|w-nav|navbar|top-bar)(\s|$)/.test(cls(e)));
  const scope = header ?? doc;
  const dims = (e: El) => ({ width: Number(e.attrs.width) || undefined, height: Number(e.attrs.height) || undefined });
  const logoish = (e: El) => /logo|brand/i.test(`${cls(e)} ${e.attrs.alt ?? ""} ${e.attrs.src ?? ""} ${e.attrs["aria-label"] ?? ""}`);
  for (const img of findAll(scope, byTag("img"))) {
    const src = imgSrc(img, base);
    if (!src) continue;
    const inHome = !!ancestor(img, (a) => a.tag === "a" && homeHref(a.attrs.href ?? ""));
    const score = (logoish(img) || (img.parent && logoish(img.parent)) ? 100 : 0) + (inHome ? 90 : 0) + (header ? 5 : -40);
    if (score > 0) cands.push({ src, kind: "img", score, ...dims(img) });
  }
  for (const svg of findAll(scope, byTag("svg"))) {
    const inHome = !!ancestor(svg, (a) => a.tag === "a" && homeHref(a.attrs.href ?? ""));
    const lg = logoish(svg) || (!!svg.parent && logoish(svg.parent));
    if (!inHome && !lg) continue;
    if (findAll(svg, () => true).length < 2 && !find(svg, byTag("text"))) continue; // icône vide
    cands.push({ src: svgToDataUri(svg), kind: "svg-inline", score: (lg ? 95 : 0) + (inHome ? 85 : 0) + (header ? 0 : -40), ...dims(svg) });
  }
  const org = ld.find((x) => ldIs(x, "Organization", ...LOCAL_BUSINESS) && x.logo);
  if (org) {
    const l = typeof org.logo === "string" ? org.logo : org.logo?.url ?? org.logo?.contentUrl;
    const src = absUrl(l, base);
    if (src) cands.push({ src, kind: "img", score: 80 });
  }
  const icons = findAll(doc, (e) => e.tag === "link" && /icon/i.test(e.attrs.rel ?? "") && !!e.attrs.href);
  const sized = (e: El) => Math.max(0, ...(e.attrs.sizes ?? "").split(/\s+/).map((s) => Number(s.split("x")[0]) || 0));
  const apple = icons.filter((e) => /apple-touch-icon/i.test(e.attrs.rel)).sort((a, b) => sized(b) - sized(a))[0];
  if (apple) cands.push({ src: absUrl(apple.attrs.href, base), kind: "icon", score: 40 });
  const plain = icons.filter((e) => !/apple-touch-icon|mask-icon/i.test(e.attrs.rel));
  const bestIcon = plain.sort((a, b) => (/svg/.test(b.attrs.type ?? b.attrs.href) ? 1000 : sized(b)) - (/svg/.test(a.attrs.type ?? a.attrs.href) ? 1000 : sized(a)))[0];
  if (bestIcon) cands.push({ src: absUrl(bestIcon.attrs.href, base), kind: "icon", score: 30 });
  const og = metaContent(doc, "og:image");
  if (og) cands.push({ src: absUrl(og, base), kind: "og", score: 10 });
  const best = cands.filter((c) => c.src).sort((a, b) => b.score - a.score)[0];
  const fav = plain[0] ? absUrl(plain[0].attrs.href, base) : undefined;
  return { logo: best ? { src: best.src, kind: best.kind, width: best.width, height: best.height } : undefined, favicon: fav };
}

/* ------------------------------------------------------------------ */
/* Coordonnées                                                         */
/* ------------------------------------------------------------------ */

function addressOf(a: any): string | undefined {
  if (!a) return undefined;
  if (typeof a === "string") return a;
  const parts = [a.streetAddress, [a.postalCode, a.addressLocality].filter(Boolean).join(" "), a.addressRegion, a.addressCountry && (typeof a.addressCountry === "string" ? a.addressCountry : a.addressCountry.name)];
  return parts.filter(Boolean).join(", ") || undefined;
}
const DAYS_FR: Record<string, string> = { Monday: "lundi", Tuesday: "mardi", Wednesday: "mercredi", Thursday: "jeudi", Friday: "vendredi", Saturday: "samedi", Sunday: "dimanche" };
const dayName = (d: string) => C(DAYS_FR[d] ?? d, d);
function hoursOf(x: any): string | undefined {
  if (!x) return undefined;
  if (x.openingHours) return (Array.isArray(x.openingHours) ? x.openingHours : [x.openingHours]).join(" ; ");
  const spec = Array.isArray(x.openingHoursSpecification) ? x.openingHoursSpecification : x.openingHoursSpecification ? [x.openingHoursSpecification] : [];
  if (!spec.length) return undefined;
  return spec
    .map((s: any) => {
      const days = (Array.isArray(s.dayOfWeek) ? s.dayOfWeek : [s.dayOfWeek]).filter(Boolean).map((d: string) => dayName(String(d).replace(/^https?:\/\/schema\.org\//, "")));
      return `${days.join(", ")} ${s.opens ?? ""}–${s.closes ?? ""}`.trim();
    })
    .join(" ; ");
}

function collectContact(doc: El, ld: any[], contact: SiteImport["contact"]) {
  for (const a of findAll(doc, (e) => e.tag === "a" && !!e.attrs.href)) {
    const h = a.attrs.href.trim();
    if (/^tel:/i.test(h) && !contact.phone) contact.phone = oneLine(textOf(a)) && /\d/.test(textOf(a)) ? oneLine(textOf(a)) : decodeURIComponent(h.slice(4)).trim();
    else if (/^mailto:/i.test(h) && !contact.email) contact.email = decodeURIComponent(h.slice(7).split("?")[0]).trim();
    else if (/^https?:/i.test(h)) {
      const s = socialOf(h);
      if (s && !contact.socials[s] && !/sharer|share\?|intent\/tweet|\/share/i.test(h)) contact.socials[s] = h;
    }
  }
  const biz = ld.find((x) => ldIs(x, ...LOCAL_BUSINESS)) ?? ld.find((x) => ldIs(x, "Organization"));
  if (biz) {
    contact.phone ??= biz.telephone || undefined;
    contact.email ??= biz.email ? String(biz.email).replace(/^mailto:/, "") : undefined;
    contact.address ??= addressOf(biz.address);
    contact.hours ??= hoursOf(biz);
    for (const s of Array.isArray(biz.sameAs) ? biz.sameAs : biz.sameAs ? [biz.sameAs] : []) {
      const k = socialOf(String(s));
      if (k && !contact.socials[k]) contact.socials[k] = String(s);
    }
  }
  if (!contact.address) {
    const ad = find(doc, byTag("address"));
    if (ad) contact.address = oneLine(textOf(ad).replace(/\n/g, ", ")).replace(/,\s*,/g, ",") || undefined;
  }
  if (!contact.address) {
    // adresse écrite en clair : « 8 rue des Tanneurs » suivi d'un code postal et d'une ville (repris tel quel)
    const footer = find(doc, (e) => e.tag === "footer" || e.attrs.role === "contentinfo") ?? doc;
    const lines = textOf(footer).split("\n").map((l) => l.trim());
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 200) continue;
      const street = /^\d{1,4}(?:\s?(?:bis|ter))?,?\s+(?:rue|avenue|av\.|bd|boulevard|place|chemin|all[ée]e|impasse|quai|route|cours|square|faubourg|street|road|lane)\b/i;
      const m = lines[i].match(/(\d{1,4}(?:\s?(?:bis|ter))?,?\s+(?:rue|avenue|av\.|bd|boulevard|place|chemin|all[ée]e|impasse|quai|route|cours|square|faubourg)\b[^,\n]*?,?\s*\d{5}\s+[A-ZÉÈÀ][\wÀ-ÿ' -]+)/);
      if (m) {
        contact.address = m[1].trim();
        break;
      }
      if (street.test(lines[i]) && /^\d{5}\s+\S/.test(lines[i + 1] ?? "")) {
        contact.address = `${lines[i]}, ${lines[i + 1]}`;
        break;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Lecture complète                                                    */
/* ------------------------------------------------------------------ */

function navLinks(container: El | null, ctx: Ctx, base: string, hrefs?: string[]): { label: string; url: string }[] {
  if (!container) return [];
  const out: { label: string; url: string }[] = [];
  for (const a of findAll(container, (e) => e.tag === "a" && !!e.attrs.href)) {
    const href = a.attrs.href.trim();
    if (/^(#|javascript:|tel:|mailto:)/i.test(href)) continue;
    const label = oneLine(textOf(a)) || a.attrs["aria-label"]?.trim() || a.attrs.title?.trim() || "";
    if (!label) continue;
    const abs = absUrl(href, base);
    if (!abs) continue;
    if (socialOf(abs)) continue;
    if (/poweredby|powered-by|utm_campaign=powered/i.test(abs)) continue; // mention « propulsé par » de la plateforme
    const internal = sameSite(ctx, abs);
    if (internal && UTILITY.test(new URL(abs).pathname)) continue;
    if (/logo/.test(cls(a)) || (find(a, byTag("img", "svg")) && !oneLine(textOf(a)))) continue;
    const url = internal ? sitePath(ctx, abs) : abs;
    if (!out.some((x) => x.url === url && x.label === label)) {
      out.push({ label, url });
      if (internal) hrefs?.push(abs);
    }
  }
  return out;
}

export async function importSite(url: string, opts: Opts = {}): Promise<SiteImport> {
  const fetcher: SiteFetcher = opts.fetchImpl ?? ((u, o) => safeFetch(u, o));
  const maxPages = Math.max(1, Math.min(40, opts.maxPages ?? 12));
  const progress = (p: number, msg: string) => opts.onProgress?.(Math.max(0, Math.min(1, p)), msg);
  const given = url.trim();
  if (/^(file|ftp|data|javascript|about|blob|mailto|tel|gopher|ws|wss):/i.test(given)) throw new Error(L("Seuls les liens http et https sont acceptés.", "Only http and https links are accepted."));
  const raw = /^https?:\/\//i.test(given) ? given : `https://${given}`;

  progress(0.02, L("Lecture de la page d'accueil", "Reading the home page"));
  const home = await fetcher(raw, { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" });
  if (home.status >= 400) throw new Error(L(`Le site a répondu ${home.status}. Vérifiez l'adresse.`, `The site responded with ${home.status}. Check the address.`));
  if (!/html|^$/i.test(home.type)) throw new Error(L("Cette adresse ne mène pas à une page web.", "This address does not lead to a web page."));
  const finalUrl = home.url;
  const fu = new URL(finalUrl);
  const basePath = fu.pathname.replace(/[^/]*$/, "") || "/";
  const ctx: Ctx = { fetch: fetcher, origin: fu.origin, basePath, base: new URL(basePath, fu.origin), warnings: [] };
  const homeHtml = home.body.toString("utf8");
  const homeDoc = parseHtml(homeHtml);
  const homeLd = jsonLd(homeDoc);

  // robots.txt : règles « User-agent: * »
  let robots = { allow: [] as string[], disallow: [] as string[] };
  for (const rp of basePath === "/" ? ["/robots.txt"] : ["/robots.txt", `${basePath}robots.txt`]) {
    try {
      const r = await fetcher(new URL(rp, fu.origin).toString(), { accept: "text/plain", maxBytes: 200_000 });
      if (r.status === 200 && !/html/i.test(r.type)) {
        robots = robotsRules(r.body.toString("utf8"));
        break;
      }
    } catch {
      /* pas de robots.txt lisible : exploration normale */
    }
  }
  const skippedByRobots: string[] = [];

  const { platform, evidence } = detectPlatform(homeHtml, homeDoc);
  progress(0.1, L(`Plateforme reconnue : ${platform}`, `Platform detected: ${platform}`));

  // nom, langue, slogan
  const orgLd = homeLd.find((x) => ldIs(x, "Organization", ...LOCAL_BUSINESS)) ?? homeLd.find((x) => ldIs(x, "WebSite"));
  const titleTag = oneLine(textOf(find(homeDoc, byTag("title")) ?? { tag: "#root", attrs: {}, children: [], parent: null }));
  const header = find(homeDoc, (e) => e.tag === "header" || e.attrs.role === "banner") ?? find(homeDoc, (e) => /(^|\s)(site-header|w-nav|navbar|header)(\s|$)/.test(cls(e)));
  const homeHref = (h: string) => {
    const a = absUrl(h, finalUrl);
    if (!a) return false;
    try {
      const x = new URL(a);
      return x.origin === ctx.origin && (sitePath(ctx, a) === "/" || /^\/index\.html?$/i.test(sitePath(ctx, a)));
    } catch {
      return false;
    }
  };
  const { logo, favicon } = findLogo(homeDoc, finalUrl, homeLd, homeHref);
  const logoAlt = header ? find(header, (e) => e.tag === "img" && /logo/i.test(`${cls(e)} ${e.attrs.alt ?? ""} ${e.attrs.src ?? ""}`))?.attrs.alt?.trim() : undefined;
  const name =
    metaContent(homeDoc, "og:site_name") ||
    (orgLd?.name ? String(orgLd.name) : "") ||
    (logoAlt && !/^logo$/i.test(logoAlt) ? logoAlt.replace(/^logo\s+/i, "") : "") ||
    nameFromTitle(titleTag, homeDoc) ||
    fu.hostname.replace(/^www\./, "");
  const lang = (find(homeDoc, byTag("html"))?.attrs.lang ?? "").toLowerCase().split(/[-_]/)[0] || undefined;
  const tagline = (orgLd?.slogan ? String(orgLd.slogan) : "") || metaContent(homeDoc, "description") || undefined;

  // menus
  const navEl = (header && (find(header, (e) => e.tag === "nav" || e.attrs.role === "navigation") ?? header)) ?? find(homeDoc, (e) => e.tag === "nav");
  const menuHrefs: string[] = [];
  const nav = navLinks(navEl, ctx, finalUrl, menuHrefs);
  const footerEl = find(homeDoc, (e) => e.tag === "footer" || e.attrs.role === "contentinfo") ?? find(homeDoc, (e) => /(^|\s)(site-footer|footer)(\s|$)/.test(cls(e)));
  const footerNav = navLinks(footerEl, ctx, finalUrl, menuHrefs);

  // file d'exploration
  const queue: string[] = [];
  const seen = new Set<string>([pageKey(ctx, finalUrl)]);
  const enqueue = (u: string) => {
    const abs = absUrl(u.startsWith("/") && basePath !== "/" ? u.slice(1) : u, ctx.base.toString());
    if (!abs || !sameSite(ctx, abs) || NON_PAGE.test(abs)) return;
    const x = new URL(abs);
    x.hash = "";
    x.search = "";
    if (UTILITY.test(x.pathname)) return;
    const key = pageKey(ctx, x.toString());
    if (seen.has(key)) return;
    seen.add(key);
    if (!robotsAllows(robots, x.pathname) || !robotsAllows(robots, sitePath(ctx, x.toString()))) {
      skippedByRobots.push(sitePath(ctx, x.toString()));
      return;
    }
    queue.push(x.toString());
  };
  for (const h of menuHrefs) enqueue(h);

  // feuilles de style et polices de la page d'accueil
  const cssTexts: string[] = findAll(homeDoc, byTag("style")).map(textRaw);
  const fontHints: string[] = [];
  const sheets = findAll(homeDoc, (e) => e.tag === "link" && /stylesheet/i.test(e.attrs.rel ?? "") && !!e.attrs.href).map((e) => absUrl(e.attrs.href, finalUrl)).filter(Boolean);
  for (const s of sheets) fontHints.push(...googleFontFamilies(s));
  for (const s of findAll(homeDoc, byTag("script"))) {
    const m = textRaw(s).match(/WebFont\.load\(\s*\{[\s\S]*?families\s*:\s*\[([^\]]*)\]/);
    if (m) fontHints.push(...[...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1].split(":")[0].trim()).filter(Boolean));
  }
  for (const s of findAll(homeDoc, (e) => e.attrs.style !== undefined && /--/.test(e.attrs.style))) cssTexts.push(`:root{${s.attrs.style}}`);
  let sheetCount = 0;
  for (const s of sheets) {
    if (sheetCount >= 6 || googleFontFamilies(s).length || /fonts\.(googleapis|bunny)|use\.typekit|fontawesome/i.test(s)) continue;
    sheetCount++;
    try {
      const r = await fetcher(s, { accept: "text/css,*/*;q=0.1", maxBytes: 600_000 });
      if (r.status === 200) {
        const css = r.body.toString("utf8");
        cssTexts.push(css);
        for (const imp of css.matchAll(/@import\s+(?:url\()?["']?([^"')\s]+)/g)) fontHints.push(...googleFontFamilies(imp[1]));
      }
    } catch {
      /* feuille non lue : ignorée */
    }
  }
  progress(0.2, L("Couleurs et polices du site", "Site colors and fonts"));
  const styles = analyseStyles(cssTexts, metaContent(homeDoc, "theme-color") || undefined, [...new Set(fontHints)]);

  // produits par les API publiques
  let products: SiteProduct[] = [];
  const currencyHint =
    metaContent(homeDoc, "og:price:currency", "product:price:currency") || homeHtml.match(/Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Z]{3})"/)?.[1] || homeHtml.match(/"currency(?:Code)?"\s*:\s*"([A-Z]{3})"/)?.[1] || undefined;
  if (platform === "shopify") {
    try {
      for (let page = 1; page <= 4; page++) {
        const r = await fetcher(new URL(`products.json?limit=250&page=${page}`, ctx.base).toString(), { accept: "application/json", maxBytes: 8_000_000 });
        if (r.status !== 200) break;
        const got = shopifyProducts(JSON.parse(r.body.toString("utf8")), ctx, currencyHint);
        products.push(...got.filter((g) => !products.some((p) => p.handle === g.handle)));
        if (got.length < 250) break;
      }
    } catch {
      ctx.warnings.push(L("La liste publique des produits Shopify (/products.json) n'a pas pu être lue : produits repris depuis les pages.", "The public Shopify product list (/products.json) could not be read: products taken from the pages."));
    }
  } else if (platform === "woocommerce" || platform === "wordpress") {
    try {
      for (let page = 1; page <= 3; page++) {
        const r = await fetcher(new URL(`wp-json/wc/store/v1/products?per_page=100&page=${page}`, ctx.base).toString(), { accept: "application/json", maxBytes: 8_000_000 });
        if (r.status !== 200) break;
        const got = wooProducts(JSON.parse(r.body.toString("utf8")), ctx);
        products.push(...got);
        if (got.length < 100) break;
      }
    } catch {
      if (platform === "woocommerce") ctx.warnings.push(L("L'API publique WooCommerce (Store API) n'a pas pu être lue : produits repris depuis les pages.", "The public WooCommerce Store API could not be read: products taken from the pages."));
    }
  }
  progress(0.3, L(`${products.length} produit(s) trouvé(s) par l'API publique`, `${products.length} product(s) found through the public API`));

  // exploration des pages
  const pages: SitePage[] = [];
  const productLinks: string[] = [];
  const collectProductLinks = (doc: El, base: string) => {
    for (const a of findAll(doc, (e) => e.tag === "a" && !!e.attrs.href && !!productHandle(e.attrs.href))) {
      const abs = absUrl(a.attrs.href, base);
      if (abs && sameSite(ctx, abs) && !productLinks.includes(abs)) productLinks.push(abs);
    }
  };
  let jsOnlyPages = 0;
  const readPage = (u: string, html: string, doc: El, isHome: boolean) => {
    const ld = isHome ? homeLd : jsonLd(doc);
    const path = sitePath(ctx, u);
    const h1 = find(mainOf(doc), byTag("h1")) ?? find(doc, byTag("h1"));
    const tt = oneLine(textOf(find(doc, byTag("title")) ?? { tag: "#root", attrs: {}, children: [], parent: null }));
    let blocks = extractBlocks(doc, u, isHome);
    const mainText = sectionsOf(mainOf(doc)).map(textOf).join(" ");
    if (mainText.replace(/\s/g, "").length < 40) {
      const emb = embeddedBlocks(doc, u);
      if (emb.length) {
        blocks = emb;
        ctx.warnings.push(L(`Page ${path} : contenu chargé en JavaScript, lu depuis les données embarquées de la page — à vérifier.`, `Page ${path}: content loaded with JavaScript, read from the page's embedded data — please check.`));
      } else {
        jsOnlyPages++;
        ctx.warnings.push(L(`Page ${path} : contenu chargé uniquement en JavaScript, il n'a pas pu être lu.`, `Page ${path}: content loaded only with JavaScript, it could not be read.`));
      }
    }
    // FAQ déclarée en JSON-LD et absente du HTML
    const faqLd = ld.find((x) => ldIs(x, "FAQPage"));
    if (faqLd && !blocks.some((b) => b.kind === "faq")) {
      const items = (Array.isArray(faqLd.mainEntity) ? faqLd.mainEntity : [faqLd.mainEntity])
        .filter(Boolean)
        .map((q: any) => ({ q: oneLine(String(q.name ?? "")), a: htmlToText(String(q.acceptedAnswer?.text ?? "")) }))
        .filter((x: { q: string; a: string }) => x.q && x.a);
      if (items.length) blocks.push({ kind: "faq", items });
    }
    const title = h1 && !isHome ? headingText(h1) : cleanTitle(tt, name) || (h1 ? headingText(h1) : "");
    const type = pageType(path.toLowerCase(), title);
    const description = metaContent(doc, "description") || metaContent(doc, "og:description") || undefined;
    pages.push({ url: u, path, title: isHome ? cleanTitle(tt, name) || name : title, type, description, blocks });
    if (type === "product" && !products.length) {
      const p = ldProduct(ld, u, u);
      if (p && !productsFromPages.some((x) => x.handle === p.handle)) productsFromPages.push(p);
    }
    collectContact(doc, ld, contact);
    collectProductLinks(doc, u);
    void html;
  };
  const contact: SiteImport["contact"] = { socials: {} };
  const productsFromPages: SiteProduct[] = [];
  readPage(finalUrl, homeHtml, homeDoc, true);

  let budget = maxPages - 1;
  const total = Math.max(1, Math.min(budget, queue.length + 3));
  let done = 0;
  const failed: string[] = [];
  const readUrl = async (u: string) => {
    progress(0.3 + (0.6 * done) / total, L(`Lecture de la page ${sitePath(ctx, u)}`, `Reading page ${sitePath(ctx, u)}`));
    done++;
    try {
      const r = await fetcher(u, { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" });
      if (r.status >= 400 || !/html|^$/i.test(r.type)) {
        failed.push(`${sitePath(ctx, u)} (${r.status})`);
        return;
      }
      const html = r.body.toString("utf8");
      readPage(r.url || u, html, parseHtml(html), false);
    } catch {
      failed.push(sitePath(ctx, u));
    }
  };
  while (queue.length && budget > 0) {
    await readUrl(queue.shift()!);
    budget--;
  }
  // fiches produits : seulement si aucune API n'a donné les produits (JSON-LD Product)
  if (!products.length) {
    for (const u of productLinks) enqueue(u);
    while (queue.length && budget > 0) {
      await readUrl(queue.shift()!);
      budget--;
    }
    products = productsFromPages;
  }
  if (queue.length) ctx.warnings.push(L(`${queue.length} page(s) non lue(s) : limite de ${maxPages} pages atteinte.`, `${queue.length} page(s) not read: ${maxPages}-page limit reached.`));
  if (failed.length) ctx.warnings.push(L(`Pages non lues (erreur) : ${failed.join(", ")}.`, `Pages not read (error): ${failed.join(", ")}.`));
  if (skippedByRobots.length) ctx.warnings.push(L(`Pages non lues car interdites par robots.txt : ${skippedByRobots.join(", ")}.`, `Pages not read because robots.txt disallows them: ${skippedByRobots.join(", ")}.`));
  if (products.length && !products.some((p) => p.currency) && currencyHint) for (const p of products) p.currency = currencyHint;
  if (!logo) ctx.warnings.push(L("Aucun logo trouvé sur le site : à ajouter.", "No logo found on the site: please add one."));
  if (!styles.palette) ctx.warnings.push(L("Couleurs du site non trouvées dans ses feuilles de style.", "Site colors not found in its stylesheets."));
  if (jsOnlyPages && platform === "wix") ctx.warnings.push(L("Les sites Wix chargent une partie de leur contenu en JavaScript : certains textes peuvent manquer.", "Wix sites load part of their content with JavaScript: some text may be missing."));

  // panier / boutique visibles ?
  const hasCart = /href=["'][^"']*(\/cart|\/panier|\/checkout|add-to-cart|\?add-to-cart=)/i.test(homeHtml) || /\b(add-to-cart|ajouter au panier|add to cart)\b/i.test(homeHtml);
  const business: SiteImport["business"] = products.length || hasCart || pages.some((p) => p.type === "product") ? "products" : "services";

  progress(1, L("Lecture du site terminée", "Site reading complete"));
  return {
    url: raw,
    finalUrl,
    fetchedAt: Date.now(),
    platform,
    platformEvidence: evidence,
    decision: isKeptPlatform(platform) ? "keep" : "reproduce",
    business,
    name: decodeEntities(name).trim(),
    tagline: tagline ? decodeEntities(tagline) : undefined,
    language: lang,
    logo,
    favicon,
    palette: styles.palette,
    colorsFound: styles.colorsFound,
    fonts: styles.fonts,
    nav,
    footerNav,
    pages,
    products,
    contact,
    warnings: ctx.warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Images et logo                                                      */
/* ------------------------------------------------------------------ */

const MIME_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico", "image/avif": "avif" };

function sniff(data: Buffer): string | null {
  if (data.length < 4) return null;
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return "image/png";
  if (data[0] === 0xff && data[1] === 0xd8) return "image/jpeg";
  if (data.slice(0, 4).toString("latin1") === "RIFF" && data.slice(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (data.slice(0, 3).toString("latin1") === "GIF") return "image/gif";
  if (data[0] === 0 && data[1] === 0 && data[2] === 1 && data[3] === 0) return "image/x-icon";
  if (data.slice(4, 12).toString("latin1").includes("ftypavi")) return "image/avif";
  const head = data.slice(0, 512).toString("utf8").trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return "image/svg+xml";
  return null;
}

/** Télécharge une image du site (ou décode une image « data: » d'un SVG en ligne). Type vérifié sur le contenu. */
export async function downloadSiteImage(src: string, fetchImpl?: SiteFetcher): Promise<{ data: Buffer; mime: string; ext: string } | null> {
  try {
    let data: Buffer;
    let declared = "";
    const dm = src.match(/^data:([^;,]+)(;base64)?,(.*)$/is);
    if (dm) {
      declared = dm[1].toLowerCase();
      data = dm[2] ? Buffer.from(dm[3], "base64") : Buffer.from(decodeURIComponent(dm[3]), "utf8");
    } else {
      const fetcher: SiteFetcher = fetchImpl ?? ((u, o) => safeFetch(u, o));
      const r = await fetcher(src, { accept: "image/avif,image/webp,image/svg+xml,image/*;q=0.8", maxBytes: 15_000_000 });
      if (r.status !== 200) return null;
      data = r.body;
      declared = (r.type.split(";")[0] ?? "").trim().toLowerCase();
    }
    if (!data.length || data.length >= 15_000_000) return null;
    const mime = sniff(data) ?? (declared.startsWith("image/") ? declared : null);
    if (!mime || !MIME_EXT[mime]) return null;
    return { data, mime, ext: MIME_EXT[mime] };
  } catch {
    return null;
  }
}

/** ICO → plus grande image (PNG intégré, ou BMP 32/24 bits décodé). */
async function icoToPng(data: Buffer): Promise<Buffer> {
  const count = data.readUInt16LE(4);
  let best: { off: number; size: number; w: number } | null = null;
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 16;
    if (o + 16 > data.length) break;
    const w = data[o] || 256;
    const size = data.readUInt32LE(o + 8), off = data.readUInt32LE(o + 12);
    if (off + size <= data.length && (!best || w > best.w)) best = { off, size, w };
  }
  if (!best) throw new Error("ICO vide");
  const img = data.subarray(best.off, best.off + best.size);
  if (img[0] === 0x89 && img[1] === 0x50) return sharp(img).png().toBuffer();
  // BMP (DIB sans en-tête de fichier) ; hauteur doublée (masque AND)
  const hdr = img.readUInt32LE(0);
  const w = img.readInt32LE(4), h = Math.abs(img.readInt32LE(8)) / 2, bpp = img.readUInt16LE(14);
  if (bpp !== 32 && bpp !== 24) throw new Error(`ICO ${bpp} bits non pris en charge`);
  const rowBytes = Math.ceil((w * bpp) / 32) * 4;
  const maskRow = Math.ceil(w / 32) * 4;
  const px = Buffer.alloc(w * h * 4);
  const pixStart = hdr;
  const maskStart = pixStart + rowBytes * h;
  for (let y = 0; y < h; y++) {
    const src = pixStart + (h - 1 - y) * rowBytes;
    for (let x = 0; x < w; x++) {
      const s = src + x * (bpp / 8), d = (y * w + x) * 4;
      px[d] = img[s + 2];
      px[d + 1] = img[s + 1];
      px[d + 2] = img[s];
      let a = bpp === 32 ? img[s + 3] : 255;
      if (bpp === 24 && maskStart + maskRow * h <= img.length) {
        const mb = img[maskStart + (h - 1 - y) * maskRow + (x >> 3)];
        if ((mb >> (7 - (x & 7))) & 1) a = 0;
      }
      px[d + 3] = a;
    }
  }
  return sharp(px, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** Logo du site → PNG à fond transparent (pour les visuels). L'original est conservé à part par l'appelant. */
export async function logoToPng(data: Buffer, mime: string): Promise<Buffer> {
  const m = (sniff(data) ?? mime).toLowerCase();
  if (m === "image/x-icon" || m === "image/vnd.microsoft.icon") return icoToPng(data);
  if (m === "image/svg+xml") {
    // rendu net : au moins 1024 px de large, fond transparent conservé
    const meta = await sharp(data).metadata();
    const w = meta.width ?? 512;
    const density = Math.min(1200, Math.max(72, Math.round((72 * 1024) / Math.max(1, w))));
    return sharp(data, { density }).png().toBuffer();
  }
  return sharp(data, { animated: false }).ensureAlpha().png().toBuffer();
}
