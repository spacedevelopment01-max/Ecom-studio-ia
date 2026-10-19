/**
 * Changement de disposition d'une section de bibliothèque (issue #141) et dispositions d'en-tête / pied de page.
 *
 * Même section du thème : seuls les réglages de la disposition changent (set_setting). Autre section du thème (une
 * fonction qui regroupe plusieurs sections existantes, ex. « Présentation principale » : cv-hero ou cv-banner) : la
 * section est refaite (replace_section) en CONVERTISSANT son contenu — titres, textes, boutons, images et éléments
 * passent dans les champs équivalents — pour que l'identité du projet et les retouches de l'utilisateur suivent.
 * Toutes les modifications passent par applyOps : mêmes règles, mêmes verrous, mêmes versions restaurables.
 */
import type { ThemeOp } from "./ops";
import { containerOf, sectionSchema, type SectionInstance, type ThemeSpec } from "./spec";
import { entryForType, FAMILY_LIBRARY, pickT, currentDisposition, type FamilyEntry, type FamilyId } from "./section-families";
import { chromePresets, currentChromePreset, fillValue, type ChromePart } from "./family-chrome";
import type { Lang } from "../i18n";

/** Champs équivalents d'une section à l'autre (le premier non vide l'emporte). */
const SETTING_ALIASES: string[][] = [
  ["heading", "title", "headline"],
  ["heading_accent", "accent", "title_accent", "heading_em"],
  ["text", "subheading", "description", "body", "intro", "content"],
  ["eyebrow", "kicker", "tagline", "label"],
  ["button_label", "cta_label", "button_text", "primary_label"],
  ["button_link", "cta_link", "button_url", "primary_link"],
  ["image_asset", "image_1_asset", "media_asset", "visual_asset"],
  ["image_alt", "alt"],
  ["video_asset"],
  ["poster_asset"],
  ["caption"],
  ["note"],
];
const BLOCK_ALIASES: string[][] = [
  ["title", "heading", "question", "label", "name", "outlet", "author"],
  ["text", "answer", "body", "description", "content", "quote", "caption"],
  ["image_asset", "image_1_asset", "media_asset"],
  ["link", "url", "button_link"],
  ["value", "number", "stat"],
  ["unit"],
  ["icon"],
  ["tag", "badge"],
];

const TEXTUAL = new Set(["text", "textarea", "richtext", "inline_richtext", "url"]);
const blank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && !v.trim());
const plain = (v: string) => v.replace(/<br\s*\/?>/gi, " ").replace(/<\/p>\s*<p>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

function adapt(value: unknown, targetType: string | undefined): unknown {
  if (typeof value !== "string") return value;
  if (targetType === "richtext") return /^\s*</.test(value) ? value : `<p>${value}</p>`;
  if (targetType === "text" || targetType === "textarea" || targetType === "inline_richtext") return /</.test(value) ? plain(value) : value;
  return value;
}

type Def = { id?: string; type: string };
function convertSettings(from: Record<string, unknown>, defs: Def[], aliases: string[][]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const def of defs) {
    if (!def.id || !TEXTUAL.has(def.type) && !/_asset$/.test(def.id) && def.id !== "icon") continue;
    if (!blank(from[def.id])) { out[def.id] = adapt(from[def.id], def.type); continue; }
    const group = aliases.find((g) => g.includes(def.id!));
    const source = group?.map((k) => from[k]).find((v) => !blank(v));
    if (source !== undefined) out[def.id] = adapt(source, def.type);
  }
  return out;
}

/** Contenu d'une section converti vers un autre type de section (réglages textuels, médias, éléments). */
export function convertContent(spec: ThemeSpec, s: SectionInstance, toType: string): { settings: Record<string, unknown>; blocks: { type: string; settings: Record<string, unknown> }[] } {
  const target = sectionSchema(spec, toType);
  if (!target) return { settings: {}, blocks: [] };
  const settings = convertSettings(s.settings ?? {}, target.settings as Def[], SETTING_ALIASES);
  const kinds = target.blocks.filter((b) => !b.type.startsWith("@"));
  const blocks: { type: string; settings: Record<string, unknown> }[] = [];
  for (const id of s.block_order ?? Object.keys(s.blocks ?? {})) {
    const b = s.blocks?.[id];
    if (!b || b.disabled) continue;
    const kind = kinds.find((k) => k.type === b.type) ?? kinds[0];
    if (!kind) break;
    const bs = convertSettings(b.settings ?? {}, (kind.settings ?? []) as Def[], BLOCK_ALIASES);
    if (Object.values(bs).some((v) => !blank(v))) blocks.push({ type: kind.type, settings: bs });
    if (target.max_blocks && blocks.length >= target.max_blocks) break;
  }
  return { settings, blocks };
}

export type DispositionResult = { ops: ThemeOp[]; entry: FamilyEntry; dispositionId: string; changedType: boolean } | { error: { fr: string; en: string } };

/** Opérations pour passer une section à une autre disposition de sa fonction (famille du projet). */
export function dispositionOps(spec: ThemeSpec, family: FamilyId, template: string, sectionId: string, dispositionId: string, fill?: (type: string) => { settings: Record<string, unknown>; blocks?: { type: string; settings: Record<string, unknown> }[] }): DispositionResult {
  const s = containerOf(spec, template)?.sections[sectionId];
  if (!s) return { error: { fr: "Section introuvable.", en: "Section not found." } };
  const entry = entryForType(family, s.type);
  if (!entry) return { error: { fr: "Cette section ne fait pas partie de la bibliothèque de ce projet.", en: "This section isn't part of this project's library." } };
  const disp = entry.dispositions.find((x) => x.id === dispositionId);
  if (!disp) return { error: { fr: "Disposition inconnue pour cette section.", en: "Unknown layout for this section." } };
  if (disp.type === s.type) {
    const ops = Object.entries(disp.settings ?? {}).filter(([k, v]) => JSON.stringify(s.settings?.[k]) !== JSON.stringify(v)).map(([key, value]) => ({ op: "set_setting", template, section: sectionId, key, value }) as ThemeOp);
    return { ops, entry, dispositionId, changedType: false };
  }
  const conv = convertContent(spec, s, disp.type);
  const base = fill?.(disp.type);
  // Ce qui manque encore est complété depuis le projet (textes, médias), jamais depuis une démonstration.
  const settings = { ...(base?.settings ?? {}), ...conv.settings, ...(disp.settings ?? {}) };
  const blocks = conv.blocks.length ? conv.blocks : base?.blocks ?? [];
  const ops: ThemeOp[] = [{ op: "replace_section", template, section: sectionId, type: disp.type, settings: settings as never, blocks: blocks as never }];
  if (s.disabled) ops.push({ op: "toggle_section", template, section: sectionId, disabled: true });
  return { ops, entry, dispositionId, changedType: true };
}

/** Section « header » ou « footer » du groupe correspondant. */
export function chromeSection(spec: ThemeSpec, part: ChromePart): { id: string; section: SectionInstance } | null {
  const g = spec.groups[part];
  const id = g?.order.find((k) => g.sections[k]?.type === part) ?? Object.keys(g?.sections ?? {}).find((k) => g.sections[k].type === part);
  return id ? { id, section: g.sections[id] } : null;
}

/** Opérations pour appliquer une des cinq dispositions d'en-tête ou de pied de page de la famille. */
/** Coordonnées du projet, reprises dans un bloc « coordonnées » ajouté au pied de page (jamais inventées). */
export type ChromeContact = { address?: string; phone?: string; email?: string; hours?: string };
export function chromeOps(spec: ThemeSpec, family: FamilyId, part: ChromePart, presetId: string, lang: Lang, contact: ChromeContact = {}): { ops: ThemeOp[] } | { error: { fr: string; en: string } } {
  const preset = chromePresets(family, part).find((x) => x.id === presetId);
  if (!preset) return { error: { fr: "Disposition inconnue.", en: "Unknown layout." } };
  const found = chromeSection(spec, part);
  if (!found) return { error: { fr: part === "header" ? "Aucun en-tête dans ce thème." : "Aucun pied de page dans ce thème.", en: part === "header" ? "No header in this theme." : "No footer in this theme." } };
  const template = `group:${part}`, section = found.id, cur = found.section.settings ?? {};
  const ops: ThemeOp[] = [];
  for (const [key, value] of Object.entries(preset.settings)) if (JSON.stringify(cur[key]) !== JSON.stringify(value)) ops.push({ op: "set_setting", template, section, key, value: value as never });
  for (const [key, v] of Object.entries(preset.fill ?? {})) if (blank(cur[key])) ops.push({ op: "set_setting", template, section, key, value: fillValue(v, lang) });
  const has = new Set(Object.values(found.section.blocks ?? {}).map((b) => b.type));
  const menu = spec.store.menus?.footer ? "footer" : "main-menu";
  const L = (fr: string, en: string) => (lang === "en" ? en : fr);
  for (const type of preset.ensureBlocks ?? []) {
    if (has.has(type)) continue;
    const settings: Record<string, unknown> =
      type === "contact" ? { heading: L("Nous trouver", "Find us"), ...Object.fromEntries(Object.entries(contact).filter(([, v]) => typeof v === "string" && v.trim())) }
      : type === "newsletter" ? { heading: L("Lettre d'information", "Newsletter") }
      : type === "links" ? { heading: L("Informations", "Information"), menu }
      : type === "social" ? { heading: L("Suivez-nous", "Follow us") }
      : {};
    ops.push({ op: "add_block", template, section, type, settings: settings as never } as ThemeOp);
  }
  return { ops };
}

export type PanelDisposition = { id: string; label: string; thumb: string; type: string; current: boolean };
export type FamilyPanel = {
  family: FamilyId;
  entry?: { key: string; name: string; n: number };
  dispositions?: PanelDisposition[];
  chrome?: { part: ChromePart; presets: { id: string; label: string; description: string; thumb: string; current: boolean }[] };
};

/** Ce que le panneau « Réglages » montre en plus pour une section de bibliothèque ou l'en-tête / le pied de page. */
export function familyPanel(spec: ThemeSpec, family: FamilyId, s: SectionInstance, lang: Lang): FamilyPanel | null {
  if (s.type === "header" || s.type === "footer") {
    const schema = sectionSchema(spec, s.type);
    const defaults = Object.fromEntries((schema?.settings ?? []).filter((x) => x.id).map((x) => [x.id!, (x as { default?: unknown }).default]));
    const cur = currentChromePreset(family, s.type, s.settings ?? {}, defaults);
    return { family, chrome: { part: s.type, presets: chromePresets(family, s.type).map((x) => ({ id: x.id, label: pickT(x.label, lang), description: pickT(x.description, lang), thumb: x.thumb, current: cur?.id === x.id })) } };
  }
  const entry = entryForType(family, s.type);
  if (!entry) return null;
  const cur = currentDisposition(entry, s.type, s.settings ?? {});
  return {
    family,
    entry: { key: entry.key, name: pickT(entry.name, lang), n: entry.n },
    dispositions: entry.dispositions.map((x) => ({ id: x.id, label: pickT(x.label, lang), thumb: x.thumb, type: x.type, current: cur?.disposition.id === x.id })),
  };
}

export const familyEntries = (family: FamilyId) => FAMILY_LIBRARY[family];
