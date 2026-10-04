/**
 * Accès aux fichiers d'un thème importé (ZIP conservé dans la bibliothèque), avec cache mémoire.
 * Les libellés « t:… » des schémas sont lus dans les fichiers de langue du thème, dans la langue demandée.
 */
import { assetData, getAsset } from "../library";
import type { Lang } from "../i18n";
import { L } from "../i18n-server";
import { importedSectionSchema, openThemeZip, parseThemeJson, schemaTranslator, type ImportedTheme, type ThemeArchive } from "./import";
import type { SectionSchema, SettingSchema } from "./spec";

type Localized = { schemas: Map<string, SectionSchema | null>; settings: { name: string; settings?: SettingSchema[] }[]; tr: (v: unknown) => unknown };
type Loaded = { arc: ThemeArchive; langs: Map<Lang, Localized> };
const cache = new Map<string, Loaded>();

function openArchive(imp: ImportedTheme): Loaded {
  const hit = cache.get(imp.archive);
  if (hit) return hit;
  const a = getAsset(imp.archive);
  if (!a) throw new Error(L("Le fichier du thème importé est introuvable dans la bibliothèque.", "The imported theme file can't be found in the library."));
  const loaded: Loaded = { arc: openThemeZip(new Uint8Array(assetData(a))), langs: new Map() };
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  cache.set(imp.archive, loaded);
  return loaded;
}

export function importedArchive(imp: ImportedTheme, lang: Lang = "fr"): Localized & { arc: ThemeArchive } {
  const l = openArchive(imp);
  let loc = l.langs.get(lang);
  if (!loc) {
    const tr = schemaTranslator(l.arc.text, lang);
    let settings: Localized["settings"] = [];
    try {
      settings = (parseThemeJson(l.arc.text.get("config/settings_schema.json") ?? "[]") as any[]).map((g) => ({ ...g, name: String(tr(g.name) ?? ""), settings: (g.settings ?? []).map((s: any) => ({ ...s, label: tr(s.label), info: tr(s.info), options: s.options?.map((o: any) => ({ ...o, label: tr(o.label) })) })) }));
    } catch {}
    loc = { schemas: new Map(), settings, tr };
    l.langs.set(lang, loc);
  }
  return { arc: l.arc, ...loc };
}

export function importedSchema(imp: ImportedTheme, type: string, lang: Lang = "fr"): SectionSchema | null {
  const l = importedArchive(imp, lang);
  if (!l.schemas.has(type)) {
    const src = l.arc.text.get(`sections/${type}.liquid`);
    // Shopify accepte les sections sans schéma : elles existent, sans réglages modifiables.
    l.schemas.set(type, src ? importedSectionSchema(src, l.tr) ?? { name: type, settings: [], blocks: [] } : null);
  }
  return l.schemas.get(type)!;
}

export function importedSectionTypes(imp: ImportedTheme): string[] {
  return [...openArchive(imp).arc.text.keys()].filter((p) => /^sections\/[^/]+\.liquid$/.test(p)).map((p) => p.slice(9, -7));
}
