/**
 * Accès aux fichiers d'un thème importé (ZIP conservé dans la bibliothèque), avec cache mémoire.
 */
import { assetData, getAsset } from "../library";
import { importedSectionSchema, openThemeZip, parseThemeJson, schemaTranslator, type ImportedTheme, type ThemeArchive } from "./import";
import type { SectionSchema, SettingSchema } from "./spec";

type Loaded = { arc: ThemeArchive; schemas: Map<string, SectionSchema | null>; settings: { name: string; settings?: SettingSchema[] }[]; tr: (v: unknown) => unknown };
const cache = new Map<string, Loaded>();

export function importedArchive(imp: ImportedTheme): Loaded {
  const hit = cache.get(imp.archive);
  if (hit) return hit;
  const a = getAsset(imp.archive);
  if (!a) throw new Error("Le fichier du thème importé est introuvable dans la bibliothèque.");
  const arc = openThemeZip(new Uint8Array(assetData(a)));
  const tr = schemaTranslator(arc.text);
  let settings: Loaded["settings"] = [];
  try {
    settings = (parseThemeJson(arc.text.get("config/settings_schema.json") ?? "[]") as any[]).map((g) => ({ ...g, name: String(tr(g.name) ?? ""), settings: (g.settings ?? []).map((s: any) => ({ ...s, label: tr(s.label), info: tr(s.info), options: s.options?.map((o: any) => ({ ...o, label: tr(o.label) })) })) }));
  } catch {}
  const loaded: Loaded = { arc, schemas: new Map(), settings, tr };
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  cache.set(imp.archive, loaded);
  return loaded;
}

export function importedSchema(imp: ImportedTheme, type: string): SectionSchema | null {
  const l = importedArchive(imp);
  if (!l.schemas.has(type)) {
    const src = l.arc.text.get(`sections/${type}.liquid`);
    // Shopify accepte les sections sans schéma : elles existent, sans réglages modifiables.
    l.schemas.set(type, src ? importedSectionSchema(src, l.tr) ?? { name: type, settings: [], blocks: [] } : null);
  }
  return l.schemas.get(type)!;
}

export function importedSectionTypes(imp: ImportedTheme): string[] {
  return [...importedArchive(imp).arc.text.keys()].filter((p) => /^sections\/[^/]+\.liquid$/.test(p)).map((p) => p.slice(9, -7));
}
