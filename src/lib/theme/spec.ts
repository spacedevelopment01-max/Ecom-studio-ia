/**
 * ThemeSpec — source de vérité unique de la boutique.
 * Sa structure reprend exactement celle des fichiers JSON d'un thème Shopify
 * Online Store 2.0 (templates/*.json, sections/*-group.json,
 * config/settings_data.json). L'aperçu, l'enregistrement et l'export ZIP
 * sont tous produits à partir de ce même objet.
 */
import fs from "node:fs";
import path from "node:path";
import type { ImportedTheme } from "./import";
import { importedArchive, importedSchema, importedSectionTypes } from "./imported";
import type { Lang } from "../i18n";
import { L } from "../i18n-server";
import { localizeSectionSchema, localizeSettingsSchema } from "./schema-i18n";

export type BlockInstance = { type: string; settings: Record<string, unknown>; disabled?: boolean };
export type SectionInstance = {
  type: string;
  settings: Record<string, unknown>;
  blocks?: Record<string, BlockInstance>;
  block_order?: string[];
  disabled?: boolean;
};
export type TemplateJson = { sections: Record<string, SectionInstance>; order: string[]; layout?: string | false; wrapper?: string };
export type GroupJson = TemplateJson & { type: "header" | "footer"; name: string };

export type StoreProduct = {
  title: string;
  handle: string;
  vendor: string;
  description_html: string;
  price: number | null; // centimes ; null = à définir
  compare_at_price: number | null;
  currency: string;
  options: string[];
  /** image : fichier de la galerie montré quand la variante est choisie (ex. le coloris). */
  variants: { title: string; options: string[]; price: number | null; available: boolean; sku?: string; image?: string }[];
  images: string[]; // noms de fichiers d'assets (aperçu) — ordre de la galerie
  tags: string[];
  /** Titre et méta-description du produit pour les moteurs de recherche (envoyés à la plateforme). */
  seo?: { title: string; description: string };
};

/** Collection de la boutique : liste ordonnée de produits (par identifiant « handle »). */
export type StoreCollection = { handle: string; title: string; description: string; image?: string; products: string[] };

/** Tous les produits de la boutique : le produit principal puis ceux du catalogue. */
export function storeProducts(spec: { store: { product: StoreProduct; products?: StoreProduct[] } }): StoreProduct[] {
  return [spec.store.product, ...(spec.store.products ?? []).filter((p) => p.handle !== spec.store.product.handle)];
}

export type StorePage = { handle: string; title: string; template_suffix: string; body_html: string };

/**
 * Style d'un élément précis : section, chemin CSS depuis l'enveloppe de la section (« div:nth-child(1) > h1:nth-child(2) »),
 * nature et texte (pour le retrouver dans les exports qui ne reprennent pas le même HTML, ex. WordPress).
 */
export type ElementStyle = { template: string; section: string; path: string; role: "heading" | "text" | "button" | "other"; text?: string; color?: string; background?: string };

/** Chemin CSS d'élément sûr : balises, nth-child et « > » seulement. */
export const ELEMENT_PATH = /^(?:[a-z][a-z0-9-]*:nth-child\(\d{1,3}\))(?: > [a-z][a-z0-9-]*:nth-child\(\d{1,3}\)){0,24}$/;

/** Feuille de style des éléments désignés (aperçu du studio et thème Shopify). */
export function elementStylesCss(spec: Pick<ThemeSpec, "elementStyles">): string {
  const rules = (spec.elementStyles ?? []).filter((e) => ELEMENT_PATH.test(e.path) && /^[\w-]{1,80}$/.test(e.section) && (e.color || e.background));
  return rules
    .map((e) => {
      const sel = [`#shopify-section-${e.section}`, `[id^="shopify-section-"][id$="__${e.section}"]`].map((w) => `${w} > ${e.path}`).join(",");
      const decl = [
        e.color && `color:${e.color}!important;-webkit-text-fill-color:${e.color}!important`,
        e.background && (e.role === "button" ? `background:${e.background}!important;border-color:${e.background}!important` : `background-color:${e.background}!important;padding:.08em .25em;border-radius:.15em;-webkit-box-decoration-break:clone;box-decoration-break:clone`),
      ].filter(Boolean).join(";");
      // Le texte à l'intérieur (span, em…) suit la couleur de l'élément.
      const inner = e.color ? `\n${sel.split(",").map((x) => `${x} *`).join(",")}{color:${e.color}!important;-webkit-text-fill-color:${e.color}!important}` : "";
      return `${sel}{${decl}}${inner}`;
    })
    .join("\n");
}

export type ThemeSpec = {
  v: 1;
  name: string;
  /**
   * Langue de la boutique (textes pour les acheteurs, locale par défaut, libellés de l'éditeur Shopify).
   * Fixée à la composition ; absente sur les thèmes plus anciens = français.
   */
  language?: Lang;
  direction: string;
  settings: Record<string, unknown>;
  groups: { header: GroupJson; footer: GroupJson };
  templates: Record<string, TemplateJson>;
  /** Sections écrites par l'IA (type commençant par « es-custom- »). */
  customSections: Record<string, { name: string; liquid: string }>;
  /** Fichiers du dossier assets : nom → identifiant du média dans la bibliothèque. */
  files: Record<string, string>;
  /** Éléments validés par le client, protégés des modifications non ciblées. */
  locks: string[];
  /** Couleurs propres à UN élément désigné dans l'aperçu (un titre, un bouton…) : seul cet élément change. */
  elementStyles?: ElementStyle[];
  /** Thème du client importé (ZIP Shopify) : ses fichiers remplacent le thème de base du studio. */
  imported?: ImportedTheme;
  /**
   * Moteur qui a composé ce thème et sa traçabilité (Theme Engine V2 : intention, direction artistique, plan des
   * pages, contenus à compléter). Ignoré par la compilation et l'export ; absent sur les thèmes plus anciens.
   */
  meta?: { engine?: "v1" | "v2"; v2?: Record<string, any> };
  /** Données de la boutique (produit, pages, menus). Séparées du thème ; utilisées par l'aperçu et l'import. */
  store: {
    shopName: string;
    /** Produit principal (mono-produit) ou produit phare du catalogue. */
    product: StoreProduct;
    /** Autres produits du catalogue (boutiques multi-produit et niche). */
    products?: StoreProduct[];
    collections?: StoreCollection[];
    /** Site d'une entreprise de services : pas de produit à vendre (exports et envoi à Shopify sans produits). */
    business?: "products" | "services";
    pages: StorePage[];
    menus: Record<string, { title: string; links: MenuLink[] }>;
    policies: { handle: string; title: string; body_html: string }[];
  };
};

export const TEMPLATE_KEYS = [
  "index",
  "product",
  "collection",
  "list-collections",
  "search",
  "cart",
  "page",
  "page.about",
  "page.faq",
  "page.contact",
  "page.shipping",
  "404",
  "blog",
  "article",
  "password",
] as const;

// ---------------------------------------------------------------- schémas

export type SettingSchema = {
  type: string;
  id?: string;
  label?: string;
  default?: unknown;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  info?: string;
};
export type BlockSchema = { type: string; name?: string; settings?: SettingSchema[]; limit?: number };
export type SectionSchema = {
  name: string;
  settings: SettingSchema[];
  blocks: BlockSchema[];
  max_blocks?: number;
  presets?: unknown[];
  enabled_on?: { groups?: string[]; templates?: string[] };
  disabled_on?: unknown;
};

export const THEME_BASE = process.env.THEME_BASE_DIR || path.join(process.cwd(), "theme-base");

const schemaCache = new Map<string, { mtime: number; schema: SectionSchema }>();

/** Langue d'un thème (français pour les thèmes créés avant le bilinguisme). */
export const themeLang = (spec: { language?: Lang } | null | undefined): Lang => spec?.language ?? "fr";

type SchemaSpec = (Pick<ThemeSpec, "customSections"> & { imported?: ImportedTheme; language?: Lang }) | null;

export function parseSchemaBlock(liquid: string): SectionSchema | null {
  const m = liquid.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  if (!m) return null;
  const raw = JSON.parse(m[1]);
  return { name: raw.name, settings: raw.settings ?? [], blocks: raw.blocks ?? [], max_blocks: raw.max_blocks, presets: raw.presets, enabled_on: raw.enabled_on };
}

export function baseSectionTypes(): string[] {
  return fs
    .readdirSync(path.join(THEME_BASE, "sections"))
    .filter((f) => f.endsWith(".liquid"))
    .map((f) => f.replace(/\.liquid$/, ""));
}

export function baseSectionSource(type: string): string | null {
  const f = path.join(THEME_BASE, "sections", `${type}.liquid`);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}

/**
 * Schéma d'une section. Les textes par défaut (et préréglages) sont dans la langue du thème ;
 * les libellés aussi, sauf si `labels` demande une autre langue (affichage dans le studio : langue de l'interface).
 * Les sections sur mesure (écrites par l'IA) ne sont pas traduites.
 */
export function sectionSchema(spec: SchemaSpec, type: string, labels?: Lang): SectionSchema | null {
  const custom = spec?.customSections?.[type];
  if (custom) return parseSchemaBlock(custom.liquid);
  const content = themeLang(spec);
  if (spec?.imported) return importedSchema(spec.imported, type, labels ?? content);
  const f = path.join(THEME_BASE, "sections", `${type}.liquid`);
  if (!fs.existsSync(f)) return null;
  const mtime = fs.statSync(f).mtimeMs;
  const key = `${type}:${labels ?? content}:${content}`;
  const hit = schemaCache.get(key);
  if (hit && hit.mtime === mtime) return hit.schema;
  const raw = parseSchemaBlock(fs.readFileSync(f, "utf8"));
  const schema = raw ? localizeSectionSchema(raw, { labels: labels ?? content, content }) : null;
  if (schema) schemaCache.set(key, { mtime, schema });
  return schema;
}

/** Types de sections disponibles : celles du thème importé, sinon celles du thème de base du studio. */
export function availableSectionTypes(spec: { imported?: ImportedTheme } | null): string[] {
  return spec?.imported ? importedSectionTypes(spec.imported) : baseSectionTypes();
}

/** Réglages généraux du thème : défauts dans la langue du thème, libellés dans `labels` (sinon la langue du thème). */
export function settingsSchema(spec?: { imported?: ImportedTheme; language?: Lang } | null, labels?: Lang): { name: string; settings?: SettingSchema[] }[] {
  const content = themeLang(spec);
  if (spec?.imported) return importedArchive(spec.imported, labels ?? content).settings;
  const groups = JSON.parse(fs.readFileSync(path.join(THEME_BASE, "config", "settings_schema.json"), "utf8"));
  return localizeSettingsSchema(groups, { labels: labels ?? content, content });
}

export function globalSettingDefaults(spec?: { imported?: ImportedTheme; language?: Lang } | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const group of settingsSchema(spec)) {
    for (const s of group.settings ?? []) if (s.id && s.default !== undefined) out[s.id] = s.default;
  }
  return out;
}

/** Valeurs par défaut des réglages d'une section, complétées par les valeurs fournies. */
export function withDefaults(settings: SettingSchema[] | undefined, values: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of settings ?? []) if (s.id && s.default !== undefined) out[s.id] = s.default;
  return { ...out, ...values };
}

/**
 * Normalise une valeur selon le type de réglage Shopify. Retourne
 * `{ ok: false }` si la valeur est inutilisable (option inconnue…).
 */
export function coerceSetting(def: SettingSchema, value: unknown): { ok: true; value: unknown } | { ok: false; reason: string } {
  switch (def.type) {
    case "range":
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) return { ok: false, reason: L(`${def.id} doit être un nombre`, `${def.id} must be a number`) };
      if (def.type === "range" && def.min !== undefined && def.max !== undefined) {
        const step = def.step ?? 1;
        const clamped = Math.min(def.max, Math.max(def.min, n));
        return { ok: true, value: Math.round((clamped - def.min) / step) * step + def.min };
      }
      return { ok: true, value: n };
    }
    case "checkbox":
      return { ok: true, value: value === true || value === "true" || value === 1 };
    case "select":
    case "radio": {
      const v = String(value);
      if (def.options && !def.options.some((o) => o.value === v)) {
        return { ok: false, reason: L(`${def.id} accepte : ${def.options.map((o) => o.value).join(", ")}`, `${def.id} accepts: ${def.options.map((o) => o.value).join(", ")}`) };
      }
      return { ok: true, value: v };
    }
    case "color": {
      const v = String(value);
      if (!/^#[0-9a-fA-F]{6}$/.test(v)) return { ok: false, reason: L(`${def.id} attend une couleur #RRGGBB`, `${def.id} expects a #RRGGBB color`) };
      return { ok: true, value: v.toUpperCase() };
    }
    case "richtext": {
      const v = String(value ?? "").trim();
      return { ok: true, value: v === "" ? "" : /^<(p|ul|ol|h[1-6])[\s>]/i.test(v) ? v : `<p>${escapeHtml(v)}</p>` };
    }
    case "text":
    case "textarea":
    case "inline_richtext":
    case "url":
    case "html":
    case "link_list":
    case "font_picker":
    case "color_scheme":
    case "video_url":
      return { ok: true, value: value == null ? "" : String(value) };
    case "image_picker":
    case "video":
    case "product":
    case "collection":
    case "page":
    case "blog":
    case "article":
      // Ressources de la boutique Shopify : non renseignées par le studio.
      return { ok: true, value: value ?? "" };
    default:
      return { ok: true, value };
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const sectionLabel = (spec: ThemeSpec | null, type: string, labels?: Lang) => sectionSchema(spec, type, labels)?.name ?? type;

export function cloneSpec(spec: ThemeSpec): ThemeSpec {
  return JSON.parse(JSON.stringify(spec));
}

/** Toutes les instances de sections, avec leur emplacement. */
export function* eachSection(spec: ThemeSpec): Generator<{ where: string; id: string; section: SectionInstance }> {
  for (const [g, json] of Object.entries(spec.groups)) for (const id of json.order) yield { where: `group:${g}`, id, section: json.sections[id] };
  for (const [t, json] of Object.entries(spec.templates)) for (const id of json.order) yield { where: t, id, section: json.sections[id] };
}

export function containerOf(spec: ThemeSpec, where: string): TemplateJson | null {
  if (where.startsWith("group:")) return (spec.groups as any)[where.slice(6)] ?? null;
  return spec.templates[where] ?? null;
}

/** Lien de menu ; `links` : sous-liens (2 niveaux au plus sous le menu principal, comme Shopify). */
export interface MenuLink {
  title: string;
  url: string;
  links?: MenuLink[];
}
