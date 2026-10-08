/**
 * Territoires créatifs (Logo V2) : plusieurs directions RÉELLEMENT différentes, décrites avant toute image.
 *
 * Avec l'IA : le directeur artistique les invente pour CETTE marque (aucune direction codée en dur), au format
 * structuré ; le code vérifie ensuite la diversité (type de marque, composition, style typographique, construction,
 * sobriété), écarte ce que le client a refusé et ce qui reprend un cliché littéral du métier.
 * Sans IA : une version du studio construit des territoires à partir des mêmes axes, d'après la personnalité, le
 * secteur et le positionnement — présentée comme telle (jamais FINALE sans contrôle par l'IA ou par le client).
 */
import { z } from "zod";
import { CANVAS_FONTS } from "../media/fonts";
import { COMPOSITIONS, CONSTRUCTIONS, MARK_TYPES, TYPE_STYLES, type BrandBrief, type Composition, type Construction, type MarkType, type Territory, type TypeStyle } from "./types";

const ROLE = z.enum(["primary", "secondary", "accent", "light", "dark"]);

export const TerritorySchema = z.object({
  name: z.string().min(2).max(60),
  concept: z.string().min(10).max(500),
  whyItFits: z.string().min(10).max(500),
  markType: z.enum(MARK_TYPES),
  composition: z.enum(COMPOSITIONS),
  typography: z.object({
    style: z.enum(TYPE_STYLES),
    weight: z.enum(["light", "regular", "bold", "black"]).catch("bold"),
    case: z.enum(["upper", "title", "lower"]).catch("title"),
    tracking: z.enum(["tight", "normal", "wide"]).catch("normal"),
    rationale: z.string().max(300).catch(""),
  }),
  colorRole: z.object({ ink: ROLE.catch("dark"), accent: ROLE.catch("primary"), rationale: z.string().max(300).catch("") }),
  sobriety: z.coerce.number().min(1).max(5).catch(3),
  construction: z.enum(CONSTRUCTIONS),
  symbolIdea: z.string().max(400).nullable().catch(null),
  distinctive: z.string().max(400).catch(""),
  avoid: z.array(z.string().max(120)).max(8).catch([]),
});
export const TerritoriesSchema = z.object({ territories: z.array(TerritorySchema).min(1).max(8) });
export type TerritoryDraft = z.infer<typeof TerritorySchema>;

/** Familles réellement disponibles pour chaque style (le texte est rendu avec la vraie police : texte exact). */
export const STYLE_FONTS: Record<TypeStyle, string[]> = {
  geometric_sans: ["Jost", "Montserrat"],
  humanist_sans: ["Work Sans", "Karla", "DM Sans"],
  grotesque: ["Archivo", "Space Grotesk", "Chivo", "Bricolage Grotesque", "Inter"],
  high_contrast_serif: ["Playfair Display"],
  classic_serif: ["Libre Baskerville", "Cormorant", "Lora"],
  contemporary_serif: ["Instrument Serif", "Lora"],
};
export const WEIGHT: Record<Territory["typography"]["weight"], number> = { light: 400, regular: 400, bold: 600, black: 800 };

/** Graisse disponible la plus proche dans la famille. */
export function nearestWeight(family: string, w: number): number {
  const ws = Object.keys(CANVAS_FONTS[family]?.file ?? { 400: "" }).map(Number);
  return ws.sort((a, b) => Math.abs(a - w) - Math.abs(b - w))[0] ?? 400;
}

/** Signature d'un territoire sur les axes de diversité. */
const axes = (t: Pick<Territory, "markType" | "composition" | "typography" | "construction" | "sobriety">) => [t.markType, t.composition, t.typography.style, t.construction, t.sobriety <= 2 ? "sober" : t.sobriety >= 4 ? "expressive" : "balanced"];

/** Nombre d'axes sur lesquels deux territoires diffèrent (0 à 5). */
export function territoryDistance(a: Territory, b: Territory): number {
  const x = axes(a);
  const y = axes(b);
  return x.filter((v, i) => v !== y[i]).length;
}

/** Distance minimale exigée entre deux territoires (sur 5 axes). */
export const MIN_DISTANCE = 3;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ABSTRACTION = /abstrait|abstract|stylis|negatif|negative space|fusion|combine|construit|geometri|fragment|trace|ligne|line|plan|module|rythme|rhythm|grid|grille/;

/**
 * Cliché littéral : l'idée du symbole se résume à un objet attendu du métier (rouleau, truelle, maison, ampoule…)
 * sans parti pris d'abstraction ou de combinaison. Un objet du métier traité de façon abstraite reste permis.
 */
export function literalCliche(t: Pick<Territory, "symbolIdea" | "markType">, cliches: string[]): string | null {
  if (!t.symbolIdea || !["symbol_wordmark", "emblem", "abstract_mark"].includes(t.markType)) return null;
  const idea = norm(t.symbolIdea);
  const hit = cliches.map((c) => norm(c.replace(/\s*\(literal\)$/, ""))).find((c) => c.length > 2 && new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(idea));
  return hit && !ABSTRACTION.test(idea) ? hit : null;
}

/**
 * Sélection des territoires : forme valide, refus du client respectés, pas de cliché littéral, et diversité réelle
 * (au moins MIN_DISTANCE axes de différence avec chaque territoire déjà retenu).
 */
export function selectTerritories(drafts: (TerritoryDraft & { source?: Territory["source"] })[], brief: BrandBrief, max: number): { kept: Territory[]; rejected: { name: string; reason: string }[] } {
  const kept: Territory[] = [];
  const rejected: { name: string; reason: string }[] = [];
  for (const [i, d] of drafts.entries()) {
    const t: Territory = { ...d, id: `t${i + 1}`, source: d.source ?? "ai", symbolIdea: d.symbolIdea ?? null };
    if (brief.rejectedMarkTypes.includes(t.markType)) {
      rejected.push({ name: t.name, reason: `type « ${t.markType} » refusé par le client` });
      continue;
    }
    const cliche = literalCliche(t, brief.cliches);
    if (cliche) {
      rejected.push({ name: t.name, reason: `cliché littéral du métier (${cliche})` });
      continue;
    }
    const close = kept.find((k) => territoryDistance(k, t) < MIN_DISTANCE);
    if (close) {
      rejected.push({ name: t.name, reason: `trop proche de « ${close.name} » (${territoryDistance(close, t)}/5 axes différents)` });
      continue;
    }
    if (kept.length < max) kept.push(t);
  }
  return { kept, rejected };
}

// ---------------------------------------------------------------- territoires du studio (sans IA)

type Archetype = { markType: MarkType; composition: Composition; construction: Construction; sobriety: number; name: string; concept: (b: BrandBrief) => string };

const ARCHETYPES: Archetype[] = [
  { markType: "wordmark", composition: "wordmark_only", construction: "typographic", sobriety: 1, name: "Logotype pur", concept: (b) => `Le nom « ${b.name} » seul, dessiné avec soin : la typographie porte toute la personnalité.` },
  { markType: "monogram", composition: "horizontal", construction: "geometric", sobriety: 2, name: "Monogramme construit", concept: (b) => `Une initiale construite comme une marque réduite, associée au nom : mémorisable et nette en très petit.` },
  { markType: "abstract_mark", composition: "stacked", construction: "modular", sobriety: 3, name: "Marque abstraite", concept: (b) => `Une forme abstraite tirée du geste ${b.trade.actions[0] ? `(« ${b.trade.actions[0]} »)` : "de l'activité"}, au-dessus du nom : évoque sans illustrer.` },
  { markType: "emblem", composition: "badge", construction: "organic", sobriety: 4, name: "Emblème", concept: (b) => `Un emblème qui réunit l'initiale et le nom : présence de marque artisanale sur emballages et supports.` },
];

/** Style typographique d'après la personnalité et le secteur (sans IA). */
function styleFor(b: BrandBrief, i: number): TypeStyle {
  const p = norm(`${b.personality.join(" ")} ${b.positioning ?? ""}`);
  const order: TypeStyle[] = /luxe|premium|raffin|elegan|precieu/.test(p)
    ? ["high_contrast_serif", "classic_serif", "geometric_sans", "contemporary_serif"]
    : /tech|digital|precis|moderne|innov|data/.test(p)
      ? ["grotesque", "geometric_sans", "humanist_sans", "contemporary_serif"]
      : /chaleur|artisan|authent|convivial|gourmand|famil/.test(p)
        ? ["classic_serif", "humanist_sans", "grotesque", "contemporary_serif"]
        : ["humanist_sans", "grotesque", "classic_serif", "geometric_sans"];
  return order[i % order.length];
}

export function localTerritories(b: BrandBrief): TerritoryDraft[] {
  return ARCHETYPES.filter((a) => !b.rejectedMarkTypes.includes(a.markType)).map((a, i) => ({
    name: a.name,
    concept: a.concept(b),
    whyItFits: `Version du studio, construite d'après ${b.personality.length ? `la personnalité (${b.personality.slice(0, 3).join(", ")})` : "le métier"} : à valider par le contrôle ou par vous.`,
    markType: a.markType,
    composition: a.composition,
    typography: { style: styleFor(b, i), weight: i === 0 ? "bold" : i === 3 ? "black" : "regular", case: i % 2 ? "upper" : "title", tracking: i % 2 ? "wide" : "normal", rationale: "" },
    colorRole: { ink: "dark", accent: i % 2 ? "accent" : "primary", rationale: "" },
    sobriety: a.sobriety,
    construction: a.construction,
    symbolIdea: a.markType === "abstract_mark" ? `forme abstraite construite d'après le geste du métier` : null,
    distinctive: "",
    avoid: b.cliches.slice(0, 4),
  }));
}
