/**
 * Import du thème Shopify du client (ZIP Online Store 2.0) : lecture, découpage et analyse.
 *
 * Le ZIP d'origine est conservé tel quel dans la bibliothèque (source de vérité des fichiers du thème) ;
 * le ThemeSpec ne reprend que ce qui se modifie dans le studio, exactement comme l'éditeur Shopify :
 * gabarits JSON (pages et sections), groupes de sections (en-tête, pied de page) et réglages du thème.
 * Les sections, blocs et réglages disponibles sont lus dans les schémas du thème lui-même.
 */
import { unzipSync, strFromU8 } from "fflate";
import type { GroupJson, SectionSchema, SettingSchema, TemplateJson } from "./spec";

export type ImportedTheme = {
  /** Nom du thème (theme_info) ou du fichier. */
  name: string;
  /** Média de la bibliothèque contenant le ZIP d'origine. */
  archive: string;
  /** Dossier racine dans le ZIP (« » ou « dawn-main/ »). */
  root: string;
  /** Groupes de sections importés dans spec.groups (les autres restent des fichiers du thème). */
  groups: ("header" | "footer")[];
  /** Préréglages de settings_data.json, conservés à l'export. */
  presets: Record<string, unknown>;
  report: ImportReport;
};

export type ImportReport = {
  name: string;
  version: string | null;
  author: string | null;
  files: { total: number; sections: number; snippets: number; templates: number; jsonTemplates: number; assets: number; locales: number; blocks: number };
  pages: { template: string; label: string; sections: { id: string; type: string; name: string; blocks: number }[] }[];
  sections: { type: string; name: string; settings: number; blocks: string[]; addable: boolean; groups: string[] }[];
  settingsGroups: { name: string; settings: number }[];
  warnings: string[];
};

const TEXT = /\.(liquid|json|css|js|svg|txt|md|scss|html|map)$/i;
const MAX_ZIP = 60 * 1024 * 1024;

/** Retire le commentaire d'en-tête que Shopify place dans les fichiers JSON (et les virgules finales). */
export function parseThemeJson(raw: string): any {
  const s = raw.replace(/^﻿/, "").replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "");
  try {
    return JSON.parse(s);
  } catch {
    return JSON.parse(s.replace(/,(\s*[}\]])/g, "$1"));
  }
}

/** Sections et blocs : réglages toujours présents (Shopify les omet quand ils sont vides). */
function normalizeSections(sections: Record<string, any>): Record<string, any> {
  for (const sec of Object.values(sections ?? {})) {
    if (!sec || typeof sec !== "object") continue;
    sec.settings ??= {};
    for (const b of Object.values(sec.blocks ?? {}) as any[]) if (b && typeof b === "object") b.settings ??= {};
  }
  return sections ?? {};
}

export type ThemeArchive = { root: string; text: Map<string, string>; binary: Map<string, Uint8Array> };

/** Ouvre le ZIP et repère la racine du thème (dossier contenant layout/theme.liquid). */
export function openThemeZip(zip: Uint8Array): ThemeArchive {
  if (zip.length > MAX_ZIP) throw new Error("Le fichier dépasse 60 Mo : exportez le thème depuis Shopify sans médias volumineux.");
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zip);
  } catch {
    throw new Error("Ce fichier n'est pas un ZIP lisible. Dans Shopify : Boutique en ligne › Thèmes › … › Télécharger le fichier du thème.");
  }
  const layout = Object.keys(entries).find((p) => /(^|\/)layout\/theme\.liquid$/.test(p) && !p.includes("__MACOSX"));
  if (!layout) throw new Error("Aucun fichier layout/theme.liquid : ce ZIP ne contient pas un thème Shopify.");
  const root = layout.slice(0, layout.length - "layout/theme.liquid".length);
  const text = new Map<string, string>();
  const binary = new Map<string, Uint8Array>();
  for (const [p, data] of Object.entries(entries)) {
    if (!p.startsWith(root) || p.endsWith("/") || p.includes("__MACOSX") || /(^|\/)\.[^/]+$/.test(p)) continue;
    const rel = p.slice(root.length);
    if (!/^(assets|config|layout|locales|sections|snippets|templates|blocks)\//.test(rel)) continue;
    if (TEXT.test(rel)) text.set(rel, strFromU8(data));
    else binary.set(rel, data);
  }
  return { root, text, binary };
}

/** Traduction des clés « t:… » des schémas avec les fichiers locales/*.schema.json du thème (français d'abord). */
export function schemaTranslator(text: Map<string, string>) {
  const pick = (re: RegExp) => [...text.keys()].find((k) => re.test(k));
  const sources = [pick(/^locales\/fr(-FR)?\.schema\.json$/), pick(/^locales\/fr(-FR)?\.default\.schema\.json$/), pick(/^locales\/en\.default\.schema\.json$/), pick(/^locales\/[a-z-]+\.default\.schema\.json$/)]
    .filter(Boolean)
    .map((k) => {
      try {
        return parseThemeJson(text.get(k!)!);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return (v: unknown): unknown => {
    if (typeof v !== "string" || !v.startsWith("t:")) return v;
    const path = v.slice(2).split(".");
    for (const src of sources) {
      let cur: any = src;
      for (const k of path) cur = cur?.[k];
      if (typeof cur === "string") return cur;
    }
    return path[path.length - 2] ?? v;
  };
}

/** Schéma d'une section du thème importé, libellés traduits. */
export function importedSectionSchema(liquid: string, tr: (v: unknown) => unknown): SectionSchema | null {
  const m = liquid.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  if (!m) return null;
  let raw: any;
  try {
    raw = parseThemeJson(m[1]);
  } catch {
    return null;
  }
  const setting = (s: any): SettingSchema => ({ ...s, label: tr(s.label) as string, info: tr(s.info) as string, content: tr(s.content), default: tr(s.default), options: s.options?.map((o: any) => ({ ...o, label: tr(o.label) })) });
  // Valeurs des préréglages (« t:… ») traduites : elles deviennent le contenu de départ des sections ajoutées.
  const deep = (v: any): any => (Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : tr(v));
  return {
    name: String(tr(raw.name) ?? "Section"),
    settings: (raw.settings ?? []).map(setting),
    blocks: (raw.blocks ?? []).map((b: any) => ({ ...b, name: tr(b.name) as string, settings: (b.settings ?? []).map(setting) })),
    max_blocks: raw.max_blocks,
    presets: raw.presets?.map((p: any) => deep(p)),
    enabled_on: raw.enabled_on,
  };
}

const PAGE_LABELS: Record<string, string> = { index: "Accueil", product: "Fiche produit", collection: "Collection", "list-collections": "Liste des collections", cart: "Panier", search: "Recherche", page: "Page", blog: "Blog", article: "Article", "404": "Page introuvable", password: "Mot de passe", "customers/account": "Compte client" };
const pageLabel = (t: string) => PAGE_LABELS[t] ?? (t.startsWith("page.") ? `Page « ${t.slice(5)} »` : t.startsWith("product.") ? `Fiche produit « ${t.slice(8)} »` : t);

/** Découpe le thème : gabarits, groupes, réglages, sections disponibles, et rapport d'analyse. */
export function decomposeTheme(arc: ThemeArchive, fileName: string) {
  const { text, binary } = arc;
  const tr = schemaTranslator(text);
  const warnings: string[] = [];

  // Réglages et informations du thème.
  let schemaGroups: any[] = [];
  try {
    schemaGroups = parseThemeJson(text.get("config/settings_schema.json") ?? "[]");
  } catch {
    warnings.push("config/settings_schema.json illisible : les réglages généraux ne pourront pas être modifiés dans le studio.");
  }
  const info = schemaGroups.find((g) => g.name === "theme_info") ?? {};
  let settings: Record<string, unknown> = {};
  let presets: Record<string, unknown> = {};
  try {
    const data = parseThemeJson(text.get("config/settings_data.json") ?? "{}");
    presets = data.presets ?? {};
    settings = typeof data.current === "string" ? ((presets as any)[data.current] ?? {}) : (data.current ?? {});
  } catch {
    warnings.push("config/settings_data.json illisible : les réglages par défaut du thème sont utilisés.");
  }

  // Sections disponibles.
  const sections: ImportReport["sections"] = [];
  for (const [p, src] of text) {
    const m = p.match(/^sections\/([^/]+)\.liquid$/);
    if (!m) continue;
    const schema = importedSectionSchema(src, tr);
    if (!schema && /\{%-?\s*schema/.test(src)) warnings.push(`sections/${m[1]}.liquid : schéma JSON invalide, section non modifiable dans le studio.`);
    sections.push({ type: m[1], name: schema?.name ?? m[1], settings: schema?.settings.filter((s) => s.id).length ?? 0, blocks: (schema?.blocks ?? []).map((b) => b.type), addable: !!schema?.presets?.length, groups: schema?.enabled_on?.groups ?? [] });
  }
  sections.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const nameOf = (type: string) => sections.find((s) => s.type === type)?.name ?? type;

  // Gabarits JSON (pages modifiables section par section).
  const templates: Record<string, TemplateJson> = {};
  for (const [p, src] of text) {
    const m = p.match(/^templates\/(.+)\.json$/);
    if (!m) continue;
    try {
      const j = parseThemeJson(src);
      if (!j || typeof j.sections !== "object") continue;
      templates[m[1]] = { sections: normalizeSections(j.sections), order: Array.isArray(j.order) ? j.order : Object.keys(j.sections), ...(j.layout !== undefined ? { layout: j.layout } : {}), ...(j.wrapper ? { wrapper: j.wrapper } : {}) };
    } catch {
      warnings.push(`templates/${m[1]}.json illisible : page ignorée.`);
    }
  }
  const liquidTemplates = [...text.keys()].filter((p) => /^templates\/.+\.liquid$/.test(p));
  if (!Object.keys(templates).length) warnings.push("Aucun gabarit JSON : thème d'ancienne génération (avant Online Store 2.0). Les pages ne se découpent pas en sections modifiables ; le studio peut le prévisualiser et l'exporter, mais pas le réorganiser.");
  else if (liquidTemplates.length) warnings.push(`${liquidTemplates.length} gabarit(s) Liquid (${liquidTemplates.map((p) => p.slice(10)).slice(0, 4).join(", ")}…) : conservés tels quels, non découpés en sections.`);
  if (!templates.index) warnings.push("Pas de gabarit d'accueil JSON (templates/index.json).");

  // Groupes de sections : en-tête et pied de page.
  const groups: Partial<Record<"header" | "footer", GroupJson>> = {};
  for (const g of ["header", "footer"] as const) {
    const raw = text.get(`sections/${g}-group.json`);
    if (!raw) continue;
    try {
      const j = parseThemeJson(raw);
      groups[g] = { type: g, name: String(tr(j.name) ?? g), sections: normalizeSections(j.sections), order: j.order ?? Object.keys(j.sections ?? {}) };
    } catch {
      warnings.push(`sections/${g}-group.json illisible.`);
    }
  }

  // Points d'attention.
  const appBlocks = [...text.entries()].filter(([p, s]) => p.startsWith("sections/") && /"type"\s*:\s*"@app"/.test(s)).length;
  if (appBlocks) warnings.push(`${appBlocks} section(s) acceptent des blocs d'applications : ces blocs s'affichent seulement sur la boutique Shopify réelle.`);
  const themeBlocks = [...text.keys()].filter((p) => p.startsWith("blocks/")).length;
  if (themeBlocks) warnings.push(`${themeBlocks} bloc(s) de thème (dossier blocks/) : conservés à l'export, aperçu simplifié dans le studio.`);
  const usedUnknown = new Set<string>();
  for (const t of Object.values(templates)) for (const s of Object.values(t.sections)) if (s?.type && !s.type.startsWith("apps") && !text.has(`sections/${s.type}.liquid`)) usedUnknown.add(s.type);
  if (usedUnknown.size) warnings.push(`Section(s) utilisée(s) mais absente(s) du ZIP : ${[...usedUnknown].join(", ")}.`);

  const order = ["index", "product", "collection", "list-collections", "cart", "search", "page", "blog", "article", "404"];
  const pages = Object.entries(templates)
    .sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b))
    .map(([t, j]) => ({ template: t, label: pageLabel(t), sections: j.order.filter((id) => j.sections[id]).map((id) => ({ id, type: j.sections[id].type, name: nameOf(j.sections[id].type), blocks: (j.sections[id].block_order ?? Object.keys(j.sections[id].blocks ?? {})).length })) }));

  const count = (re: RegExp) => [...text.keys(), ...binary.keys()].filter((p) => re.test(p)).length;
  const report: ImportReport = {
    name: String(info.theme_name ?? fileName.replace(/\.zip$/i, "")),
    version: info.theme_version ?? null,
    author: info.theme_author ?? null,
    files: { total: text.size + binary.size, sections: count(/^sections\/.+\.liquid$/), snippets: count(/^snippets\//), templates: count(/^templates\//), jsonTemplates: Object.keys(templates).length, assets: count(/^assets\//), locales: count(/^locales\//), blocks: themeBlocks },
    pages,
    sections,
    settingsGroups: schemaGroups.filter((g) => g.name !== "theme_info").map((g) => ({ name: String(tr(g.name) ?? ""), settings: (g.settings ?? []).filter((s: any) => s.id).length })),
    warnings,
  };
  return { templates, groups, settings, presets, report };
}
