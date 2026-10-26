/**
 * Sections propres à un thème refait d'après maquette (mission #190, point 4) : FRAISE `fg-*`, SILLON `sv-*`, ONDE
 * `on-*`, TABLE SAISON `ts-*`, ATELIER NUANCE `an-*`, PARENTHÈSE `pa-*`, PHASE `ph-*`, MAISON & HORIZON `re-*`,
 * APLAT `ap-*`. Elles ne sont rendues correctement que par leur thème (leur feuille de style n'est chargée qu'avec lui) :
 * la galerie « Sections » de ce thème les propose toutes, aucun autre thème ne les reçoit.
 *
 * Dispositions : celles que la section déclare elle-même — chacun de ses préréglages (`presets`), puis chaque valeur de
 * son réglage « Disposition » (`layout`). La première est la disposition d'origine validée sur la maquette ; les autres
 * ne la modifient pas, elles s'ajoutent à côté. Aucune n'est inventée.
 */
import type { Lang } from "../i18n";
import type { Thumb } from "./section-families";

/** Préfixe des sections propres à chaque thème. */
export const OWN_SECTION_PREFIX: Record<string, string> = {
  fraise: "fg-", sillon: "sv-", onde: "on-", "table-saison": "ts-", "atelier-nuance": "an-", parenthese: "pa-", phase: "ph-", "maison-horizon": "re-", aplat: "ap-",
};

/** Thème propriétaire d'un type de section (null : section commune). */
export function ownerThemeOf(type: string): string | null {
  for (const [theme, prefix] of Object.entries(OWN_SECTION_PREFIX)) if (type.startsWith(prefix)) return theme;
  return null;
}

export const isOwnSectionOf = (theme: string, type: string) => ownerThemeOf(type) === theme;

type Schema = {
  name?: string;
  settings?: { id?: string; type: string; label?: string; options?: { value: string; label: string }[]; default?: unknown }[];
  presets?: { name?: string; settings?: Record<string, unknown>; blocks?: { type: string; settings?: Record<string, unknown> }[] }[];
  enabled_on?: { groups?: string[] };
};

export type OwnDisposition = { id: string; label: string; settings: Record<string, unknown>; blocks?: { type: string; settings: Record<string, unknown> }[]; thumb: Thumb };

const slug = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x";

/** Vignette dessinée d'après le nom de la disposition (schéma neutre, jamais une image de démonstration). */
export function thumbFor(text: string): Thumb {
  const t = text.toLowerCase();
  if (/grille|grid|cartes|cards|colonnes|columns|tuiles|tiles/.test(t)) return "grid-3";
  if (/liste|list|lignes|lines/.test(t)) return "list";
  if (/gauche|left/.test(t)) return "split-left";
  if (/droite|right|split|côte|cote|side|deux colonnes/.test(t)) return "split-right";
  if (/bande|band|bandeau|banner/.test(t)) return "band";
  if (/carrousel|carousel|slider|défil/.test(t)) return "carousel";
  if (/onglet|tab/.test(t)) return "tabs";
  if (/question|faq|accord/.test(t)) return "accordion";
  if (/étape|etape|step|timeline|parcours/.test(t)) return "steps";
  if (/galerie|gallery|mosa|photos/.test(t)) return "mosaic";
  if (/formulaire|form|contact|devis|réserv|reserv/.test(t)) return "form";
  if (/fond|background|plein|full|photo/.test(t)) return "background";
  if (/citation|quote/.test(t)) return "quote";
  if (/chiffre|stat/.test(t)) return "stats";
  if (/tarif|prix|pricing/.test(t)) return "pricing";
  return "stacked";
}

/** Dispositions déclarées par une section (préréglages puis valeurs du réglage « Disposition »), dans la langue voulue. */
export function ownDispositions(schema: Schema | null | undefined, lang: Lang): OwnDisposition[] {
  if (!schema) return [];
  const out: OwnDisposition[] = [];
  const presets = schema.presets ?? [];
  presets.forEach((p, i) => {
    const label = String(p.name ?? schema.name ?? (lang === "en" ? "Original layout" : "Disposition d'origine"));
    out.push({ id: `p${i}`, label: i === 0 ? label : label, settings: { ...(p.settings ?? {}) }, ...(p.blocks?.length ? { blocks: p.blocks.map((b) => ({ type: b.type, settings: { ...(b.settings ?? {}) } })) } : {}), thumb: thumbFor(label) });
  });
  const base = out[0] ?? { id: "p0", label: String(schema.name ?? ""), settings: {}, thumb: "stacked" as Thumb };
  if (!out.length) out.push(base);
  const layout = schema.settings?.find((s) => s.id === "layout" && s.type === "select" && (s.options?.length ?? 0) > 1);
  for (const o of layout?.options ?? []) {
    // Disposition d'origine déjà proposée (même valeur de « Disposition ») : pas de doublon.
    const current = base.settings.layout ?? layout?.default;
    if (o.value === current) continue;
    if (out.some((d) => d.settings.layout === o.value)) continue;
    out.push({ id: `l-${slug(o.value)}`, label: o.label, settings: { ...base.settings, layout: o.value }, ...(base.blocks ? { blocks: base.blocks } : {}), thumb: thumbFor(`${o.label} ${o.value}`) });
  }
  return out.slice(0, 10);
}

/** Identifiant de galerie d'une section propre : « own:<type>~<disposition> ». */
export const ownLibraryId = (type: string, dispositionId?: string) => `own:${type}${dispositionId ? `~${dispositionId}` : ""}`;
export function parseOwnId(id: string): { type: string; dispositionId: string | null } | null {
  const m = /^own:([a-z0-9-]+)(?:~([a-z0-9-]+))?$/.exec(id);
  return m ? { type: m[1], dispositionId: m[2] ?? null } : null;
}
