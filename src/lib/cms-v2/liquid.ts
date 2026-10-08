/**
 * CMS Engine V2 — préparation des gabarits Liquid du thème pour les autres plateformes.
 * Les sections restent UNE seule source (theme-base/sections/*.liquid) : Shopify les exécute, l'aperçu du studio les
 * rend avec LiquidJS, et les thèmes WordPress exportés avec le moteur PHP (assets/cms/php/es-liquid.php). Ici :
 *  - schéma d'une section (réglages, blocs, valeurs par défaut) ;
 *  - réglages complétés par les valeurs par défaut du schéma (comme Shopify le fait) ;
 *  - conversion de la syntaxe propre à Shopify vers celle du moteur PHP (schéma retiré, {% liquid %} déplié,
 *    {% render %} → {% include %}).
 */
import type { SectionInstance } from "../theme/spec";
import type { ThemeFiles } from "../theme/compile";

export type SchemaSetting = { type: string; id?: string; label?: string; default?: unknown; options?: { value: string; label: string }[]; info?: string; min?: number; max?: number; step?: number; unit?: string };
export type SectionSchema = { name: string; settings: SchemaSetting[]; blocks: { type: string; name: string; settings?: SchemaSetting[]; limit?: number }[]; max_blocks?: number; presets?: unknown[] };

const SCHEMA_RE = /\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/;

export function sectionSchemaOf(liquid: string): SectionSchema | null {
  const m = liquid.match(SCHEMA_RE);
  if (!m) return null;
  try {
    const s = JSON.parse(m[1]);
    return { name: s.name ?? "", settings: s.settings ?? [], blocks: s.blocks ?? [], max_blocks: s.max_blocks, presets: s.presets };
  } catch {
    return null;
  }
}

/** Réglages complétés par le schéma : un réglage absent vaut sa valeur par défaut, sinon « vide » (comme Shopify). */
export function withDefaults(settings: Record<string, unknown>, list: SchemaSetting[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of list) {
    if (!s.id) continue;
    out[s.id] = s.default ?? (s.type === "checkbox" ? false : s.type === "range" || s.type === "number" ? 0 : "");
  }
  for (const [k, v] of Object.entries(settings ?? {})) out[k] = v;
  return out;
}

/** Section prête à rendre : réglages et blocs complétés, blocs dans l'ordre (comme l'objet « section » de Shopify). */
export function normalizedSection(id: string, s: SectionInstance, schema: SectionSchema | null) {
  const order = s.block_order ?? Object.keys(s.blocks ?? {});
  const blocks = order
    .map((bid) => ({ bid, b: s.blocks?.[bid] }))
    .filter((x) => x.b && !x.b.disabled)
    .map(({ bid, b }) => ({ id: bid, type: b!.type, settings: withDefaults(b!.settings ?? {}, schema?.blocks.find((x) => x.type === b!.type)?.settings), shopify_attributes: "" }));
  return { id, settings: withDefaults(s.settings ?? {}, schema?.settings), blocks };
}

/** Gabarit Shopify → gabarit accepté par le moteur PHP (même rendu ; vérifié par les tests de parité). */
export function phpLiquidSource(liquid: string): string {
  let src = liquid.replace(new RegExp(SCHEMA_RE.source, "g"), "");
  // {% liquid … %} : une instruction par ligne → une balise par instruction.
  src = src.replace(/\{%(-?)\s*liquid\b([\s\S]*?)(-?)%\}/g, (_m, _a, body: string) => {
    let inComment = 0;
    const out: string[] = [];
    for (const raw of body.split(/\r?\n/)) {
      const l = raw.trim();
      if (!l || l.startsWith("#")) continue;
      if (/^comment\b/.test(l)) inComment++;
      else if (/^endcomment\b/.test(l)) inComment = Math.max(0, inComment - 1);
      else if (!inComment) out.push(/^echo\s/.test(l) ? `{{ ${l.slice(5)} }}` : `{%- ${l} -%}`);
    }
    return out.join("");
  });
  // « for x in a[b.c].d » : le moteur PHP ne résout les crochets que dans une affectation → variable intermédiaire.
  let n = 0;
  src = src.replace(/\{%(-?)\s*for\s+(\w+)\s+in\s+([\w.]+\[[^\]]+\][\w.]*)(.*?)(-?)%\}/g, (_m, a, v: string, expr: string, rest: string, b) => {
    const tmp = `es_for_${++n}`;
    return `{%${a} assign ${tmp} = ${expr} ${b}%}{%${a} for ${v} in ${tmp}${rest}${b}%}`;
  });
  // {% render 'x', a: b %} : même chose qu'un include avec des paramètres (portée locale du moteur PHP).
  src = src.replace(/\{%(-?)\s*render\s+/g, "{%$1 include ");
  return src;
}

/** Fichiers sections/ et snippets/ nécessaires, préparés pour le moteur PHP (avec les extraits utilisés, récursivement). */
export function phpTemplates(files: ThemeFiles, types: string[]): Map<string, string> {
  const out = new Map<string, string>();
  const queue: string[] = [];
  for (const t of new Set(types)) {
    const src = files.get(`sections/${t}.liquid`);
    if (!src) continue;
    out.set(`sections/${t}.liquid`, phpLiquidSource(src));
    queue.push(src);
  }
  while (queue.length) {
    const src = queue.pop()!;
    for (const m of src.matchAll(/\{%-?\s*render\s+'([a-z0-9_-]+)'/g)) {
      const key = `snippets/${m[1]}.liquid`;
      if (out.has(key)) continue;
      const snip = files.get(key);
      if (!snip) continue;
      out.set(key, phpLiquidSource(snip));
      queue.push(snip);
    }
  }
  return out;
}

/** Traductions du thème (clé « a.b.c » → texte) pour le filtre « t » du moteur PHP. */
export function flatStrings(files: ThemeFiles, lang: string): Record<string, string> {
  const raw = files.get(`locales/${lang}.default.json`) ?? files.get("locales/fr.default.json") ?? "{}";
  const out: Record<string, string> = {};
  const walk = (o: Record<string, unknown>, p: string) => {
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === "object") walk(v as Record<string, unknown>, `${p}${k}.`);
      else out[`${p}${k}`] = String(v);
    }
  };
  try {
    walk(JSON.parse(raw.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "")), "");
  } catch {
    /* traductions illisibles : les clés s'affichent telles quelles */
  }
  return out;
}

/** Réglages globaux du thème (valeurs par défaut du schéma + réglages du projet), comme dans Shopify. */
export function themeSettings(files: ThemeFiles, settings: Record<string, unknown>): Record<string, unknown> {
  const schema = JSON.parse(files.get("config/settings_schema.json") || "[]") as { settings?: SchemaSetting[] }[];
  const out: Record<string, unknown> = {};
  for (const g of schema) for (const s of g.settings ?? []) if (s.id && s.default !== undefined) out[s.id] = s.default;
  Object.assign(out, settings);
  const schemes = (settings.color_schemes ?? {}) as Record<string, { settings: Record<string, string> }>;
  out.color_schemes = Object.entries(schemes).map(([id, sc]) => ({ id, settings: sc.settings }));
  return out;
}

export type MenuTree = Record<string, { title: string; links: { title: string; url: string; links?: MenuTree[string]["links"] }[] }>;

/**
 * Objets globaux (settings, shop, routes, linklists, cart, request) d'un rendu hors Shopify. `url(path)` convertit une
 * adresse de la boutique (« /pages/contact ») en adresse de la plateforme cible.
 */
export function liquidGlobals(opts: { files: ThemeFiles; settings: Record<string, unknown>; shopName: string; menus: MenuTree; url: (p: string) => string; pageType?: string; cartCount?: number; moneyFormat?: string; policies?: { title: string; handle: string }[] }) {
  const toLink = (l: { title: string; url: string; links?: { title: string; url: string }[] }, depth: number): Record<string, unknown> => ({
    title: l.title,
    url: l.url.startsWith("/") ? opts.url(l.url) : l.url,
    active: false,
    links: depth < 2 ? (l.links ?? []).map((c) => toLink(c, depth + 1)) : [],
  });
  const linklists: Record<string, unknown> = {};
  for (const [handle, m] of Object.entries(opts.menus)) linklists[handle] = { title: m.title, handle, links: m.links.map((l) => toLink(l, 0)) };
  const r = (p: string) => opts.url(p);
  return {
    settings: themeSettings(opts.files, opts.settings),
    shop: { name: opts.shopName, url: r("/"), description: opts.shopName, money_format: opts.moneyFormat ?? "{{amount_with_comma_separator}} €", customer_accounts_enabled: false, policies: (opts.policies ?? []).map((p) => ({ title: p.title, url: r(`/policies/${p.handle}`) })), enabled_payment_types: [], password_message: "" },
    routes: { root_url: r("/"), cart_url: r("/cart"), cart_add_url: r("/cart/add"), cart_change_url: r("/cart/change"), cart_update_url: r("/cart/update"), search_url: r("/search"), collections_url: r("/collections"), all_products_collection_url: r("/collections/all"), account_url: r("/account"), account_login_url: r("/account/login") },
    linklists,
    cart: { item_count: opts.cartCount ?? 0, items: [], total_price: 0 },
    request: { page_type: opts.pageType ?? "index", locale: { iso_code: "fr" }, design_mode: false },
    customer: null,
  };
}
