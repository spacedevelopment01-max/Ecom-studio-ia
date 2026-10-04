/**
 * Traduction des schémas du thème de base (libellés de l'éditeur Shopify et valeurs par défaut).
 * Les fichiers de theme-base sont écrits en français ; theme-base/i18n/schema.<langue>.json
 * donne la traduction de chaque libellé (« Titre » → « Heading »).
 * - libellés (name, label, info, content, options, noms des blocs et préréglages) : langue de l'éditeur
 *   (export : langue du thème ; studio : langue de l'interface) ;
 * - textes par défaut destinés aux acheteurs (default et préréglages des réglages texte) : langue du thème.
 * Les valeurs techniques (identifiants, valeurs d'options, liens) ne sont jamais traduites.
 */
import fs from "node:fs";
import path from "node:path";
import type { Lang } from "../i18n";

const BASE = process.env.THEME_BASE_DIR || path.join(process.cwd(), "theme-base");

/** Types de réglages dont la valeur est un texte lu par les acheteurs. */
const TEXT_TYPES = new Set(["text", "textarea", "richtext", "inline_richtext", "html"]);

let dictCache: { lang: Lang; mtime: number; dict: Record<string, string> }[] = [];

/** Dictionnaire français → `lang` (null pour le français, langue d'écriture des schémas). */
export function schemaDictionary(lang: Lang): Record<string, string> | null {
  if (lang === "fr") return null;
  const f = path.join(BASE, "i18n", `schema.${lang}.json`);
  if (!fs.existsSync(f)) return null;
  const mtime = fs.statSync(f).mtimeMs;
  const hit = dictCache.find((d) => d.lang === lang && d.mtime === mtime);
  if (hit) return hit.dict;
  const dict = JSON.parse(fs.readFileSync(f, "utf8")) as Record<string, string>;
  dictCache = [...dictCache.filter((d) => d.lang !== lang), { lang, mtime, dict }];
  return dict;
}

/** Traduit un libellé ou un texte par défaut du thème de base (inchangé s'il est inconnu du dictionnaire). */
export function trSchema(lang: Lang, v: unknown): unknown {
  if (typeof v !== "string") return v;
  const d = schemaDictionary(lang);
  return d && Object.prototype.hasOwnProperty.call(d, v) ? d[v] : v;
}

export type SchemaLangs = { labels: Lang; content: Lang };

type RawSetting = { type?: string; id?: string; label?: unknown; info?: unknown; content?: unknown; default?: unknown; placeholder?: unknown; options?: { value: string; label?: unknown }[] };

function setting(s: RawSetting, l: SchemaLangs): RawSetting {
  const out: RawSetting = { ...s };
  if (s.label !== undefined) out.label = trSchema(l.labels, s.label);
  if (s.info !== undefined) out.info = trSchema(l.labels, s.info);
  if (s.content !== undefined) out.content = trSchema(l.labels, s.content);
  if (s.placeholder !== undefined) out.placeholder = trSchema(l.content, s.placeholder);
  if (s.options) out.options = s.options.map((o) => ({ ...o, label: trSchema(l.labels, o.label) }));
  if (s.default !== undefined && TEXT_TYPES.has(String(s.type))) out.default = trSchema(l.content, s.default);
  return out;
}

/** Valeurs d'un préréglage : seuls les réglages texte sont traduits (langue du thème). */
function presetValues(values: Record<string, unknown> | undefined, defs: RawSetting[] | undefined, lang: Lang) {
  if (!values) return values;
  const types = new Map((defs ?? []).filter((d) => d.id).map((d) => [d.id!, String(d.type)]));
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, TEXT_TYPES.has(types.get(k) ?? "") ? trSchema(lang, v) : v]));
}

/** Schéma JSON d'une section (tel qu'écrit dans {% schema %}), traduit. */
export function localizeSectionSchema<T extends Record<string, any>>(raw: T, l: SchemaLangs): T {
  if (l.labels === "fr" && l.content === "fr") return raw;
  const blocks = (raw.blocks ?? []) as { type: string; name?: unknown; settings?: RawSetting[] }[];
  const out: Record<string, any> = { ...raw };
  if (raw.name !== undefined) out.name = trSchema(l.labels, raw.name);
  if (raw.settings) out.settings = (raw.settings as RawSetting[]).map((s) => setting(s, l));
  if (raw.blocks) out.blocks = blocks.map((b) => ({ ...b, ...(b.name !== undefined ? { name: trSchema(l.labels, b.name) } : {}), ...(b.settings ? { settings: b.settings.map((s) => setting(s, l)) } : {}) }));
  if (raw.presets)
    out.presets = (raw.presets as any[]).map((p) => ({
      ...p,
      ...(p.name !== undefined ? { name: trSchema(l.labels, p.name) } : {}),
      ...(p.settings ? { settings: presetValues(p.settings, raw.settings, l.content) } : {}),
      ...(p.blocks ? { blocks: (p.blocks as any[]).map((b) => ({ ...b, ...(b.settings ? { settings: presetValues(b.settings, blocks.find((x) => x.type === b.type)?.settings, l.content) } : {}) })) } : {}),
    }));
  return out as T;
}

/** config/settings_schema.json traduit (le groupe theme_info est conservé tel quel). */
export function localizeSettingsSchema<T extends { name: string; settings?: unknown[] }>(groups: T[], l: SchemaLangs): T[] {
  if (l.labels === "fr" && l.content === "fr") return groups;
  return groups.map((g) => (g.name === "theme_info" ? g : { ...g, name: trSchema(l.labels, g.name) as string, ...(g.settings ? { settings: (g.settings as RawSetting[]).map((s) => setting(s, l)) } : {}) }));
}

const SCHEMA_RE = /(\{%-?\s*schema\s*-?%\})([\s\S]*?)(\{%-?\s*endschema\s*-?%\})/;

/** Fichier .liquid d'une section du thème de base, avec son schéma traduit (export du thème). */
export function localizeSectionLiquid(liquid: string, l: SchemaLangs): string {
  if (l.labels === "fr" && l.content === "fr") return liquid;
  const m = liquid.match(SCHEMA_RE);
  if (!m) return liquid;
  let raw: Record<string, any>;
  try {
    raw = JSON.parse(m[2]);
  } catch {
    return liquid;
  }
  const json = JSON.stringify(localizeSectionSchema(raw, l), null, 2);
  return liquid.replace(SCHEMA_RE, () => `${m[1]}\n${json}\n${m[3]}`);
}
