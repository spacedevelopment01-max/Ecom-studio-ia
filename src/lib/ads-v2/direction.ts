/**
 * Direction artistique par publicité (moteur V3) : avant toute image, chaque publicité de la campagne reçoit son
 * propre CONCEPT — objectif, prise de vue (cadrage, lumière, décor, place du texte), et mises en page compatibles.
 * Deux publicités d'une même campagne n'ont jamais le même concept : changer de texte, de couleur ou de recadrage
 * n'est pas une autre publicité.
 *
 * D'après la planche de référence du propriétaire (SONORE) : éditorial sur matière naturelle, packshot de studio
 * à la lumière sculptée, gros plan de matière, mise en situation, rangée d'atouts, signature centrée. Les concepts
 * décrivent une méthode, jamais un contenu : aucun avantage, prix ou avis n'en vient (faits du projet seulement).
 */
import type { AnglePlan, AngleType } from "./types";

export type DirectionId = "premium_editorial" | "studio_packshot" | "detail_macro" | "lifestyle" | "feature_row" | "statement" | "work_showcase" | "craft_detail" | "service_process" | "local_presence";

export type CreativeDirection = {
  id: DirectionId;
  name: { fr: string; en: string };
  /** Objectif marketing du concept (fiche de création). */
  objective: { fr: string; en: string };
  /** Prise de vue transmise au modèle d'images (anglais : langue des modèles). */
  shot: { composition: string; lighting: string; framing: string; environment?: string };
  /** Côté gardé calme pour le texte. */
  textZone: "left" | "right" | "top" | "bottom";
  /** Mises en page compatibles (bibliothèque), la première d'abord ; toutes gardent la photo entière. */
  templates: string[];
  /** Le concept a besoin d'atouts confirmés (rangée, liste, carte) ; sans eux il passe après les autres. */
  needsFeatures?: boolean;
};

const PRODUCT: CreativeDirection[] = [
  {
    id: "premium_editorial",
    name: { fr: "Éditorial premium", en: "Premium editorial" },
    objective: { fr: "installer la marque : un objet désirable, posé avec soin", en: "build the brand: a desirable object, carefully set" },
    shot: { composition: "the product resting on a natural surface (stone, wood or linen chosen for the product), slightly off-centre toward the bottom right, a few discreet natural props from its world, airy and uncluttered", lighting: "soft directional daylight with gentle shadows and warm highlights", framing: "eye-level three-quarter view, 50-85 mm, shallow depth of field", environment: "a calm, bright, refined setting that fits the product" },
    textZone: "left",
    templates: ["editorial-corner", "crown-center", "script-accent"],
  },
  {
    id: "studio_packshot",
    name: { fr: "Packshot de studio", en: "Studio packshot" },
    objective: { fr: "montrer le produit en détail, sans distraction", en: "show the product in detail, with no distraction" },
    shot: { composition: "the product alone, hero, on a seamless studio backdrop in the brand's colour family with a soft gradient, placed on the right two-thirds", lighting: "sculpted studio lighting: key light, rim light outlining the silhouette, soft reflection on the floor", framing: "three-quarter hero angle, 85 mm, everything sharp" },
    textZone: "left",
    templates: ["feature-card", "feature-column", "signature-row"],
    needsFeatures: true,
  },
  {
    id: "detail_macro",
    name: { fr: "Gros plan matière", en: "Material close-up" },
    objective: { fr: "faire sentir la qualité : matière, finition, détail", en: "make quality felt: material, finish, detail" },
    shot: { composition: "an extreme close-up of the product's most beautiful detail (material, texture, finish) filling most of the frame", lighting: "low raking light that reveals the texture, deep soft shadows", framing: "macro lens, very shallow depth of field" },
    textZone: "top",
    templates: ["corner-minimal", "crown-center"],
  },
  {
    id: "lifestyle",
    name: { fr: "Mise en situation", en: "Lifestyle" },
    objective: { fr: "projeter l'usage dans la vie réelle de la cible", en: "project use into the audience's real life" },
    shot: { composition: "the product in its real setting of use, ready to be used, in a lived-in place that matches the audience", lighting: "natural window or golden-hour light", framing: "35-50 mm, eye level, natural perspective" },
    textZone: "left",
    templates: ["script-accent", "editorial-corner", "signature-row"],
  },
  {
    id: "feature_row",
    name: { fr: "Atouts en rangée", en: "Feature row" },
    objective: { fr: "lever les doutes avec les atouts confirmés", en: "remove doubts with confirmed features" },
    shot: { composition: "the product as hero in the upper-right area, clean background with depth, calm space at the top left and along the bottom for text and icons", lighting: "premium contrasted light with a subtle glow behind the product", framing: "slightly low three-quarter angle, 70 mm" },
    textZone: "left",
    templates: ["icon-row", "feature-column", "feature-card"],
    needsFeatures: true,
  },
  {
    id: "statement",
    name: { fr: "Signature centrée", en: "Centred statement" },
    objective: { fr: "une phrase forte, le produit en majesté", en: "one strong line, the product in majesty" },
    shot: { composition: "the product centred in the lower half, wide calm negative space above it, symmetrical and minimal", lighting: "soft overhead light, gentle gradient background", framing: "frontal, 85 mm" },
    textZone: "top",
    templates: ["crown-center", "centered-signature", "corner-minimal"],
  },
];

const SERVICES: CreativeDirection[] = [
  {
    id: "work_showcase",
    name: { fr: "Réalisation en valeur", en: "Work showcase" },
    objective: { fr: "montrer la qualité du travail fini", en: "show the quality of the finished work" },
    shot: { composition: "a finished piece of work typical of the trade, clean and well lit, nobody in frame", lighting: "bright natural daylight", framing: "wide 35 mm, straight verticals" },
    textZone: "left",
    templates: ["editorial-corner", "crown-center"],
  },
  {
    id: "craft_detail",
    name: { fr: "Geste et détail", en: "Craft detail" },
    objective: { fr: "faire sentir le savoir-faire", en: "make the craft felt" },
    shot: { composition: "close-up of tools and materials of the trade in use on the work, nobody's face", lighting: "raking side light revealing texture", framing: "macro to 50 mm, shallow depth of field" },
    textZone: "top",
    templates: ["corner-minimal", "script-accent"],
  },
  {
    id: "service_process",
    name: { fr: "Prestations en rangée", en: "Services row" },
    objective: { fr: "présenter clairement les prestations", en: "present the services clearly" },
    shot: { composition: "the workplace or workshop of the trade, organised, calm areas at the top and bottom", lighting: "soft even light", framing: "35 mm, eye level" },
    textZone: "left",
    templates: ["icon-row", "feature-card"],
    needsFeatures: true,
  },
  {
    id: "local_presence",
    name: { fr: "Proximité", en: "Local presence" },
    objective: { fr: "rassurer : une entreprise réelle, près de chez vous", en: "reassure: a real business, close to you" },
    shot: { composition: "the street-level front or the welcoming interior of the business, inviting, nobody identifiable", lighting: "late-afternoon warm light", framing: "35 mm, eye level" },
    textZone: "top",
    templates: ["crown-center", "editorial-corner"],
  },
];

/** Concept préféré pour chaque angle (puis le suivant libre : jamais deux fois le même dans une campagne). */
const BY_ANGLE: Partial<Record<AngleType, DirectionId[]>> = {
  detail: ["detail_macro", "studio_packshot"],
  demonstration: ["lifestyle", "feature_row"],
  use_case: ["lifestyle", "premium_editorial"],
  origin_craft: ["premium_editorial", "detail_macro"],
  gift: ["premium_editorial", "statement"],
  proof: ["feature_row", "statement"],
  objection: ["feature_row", "studio_packshot"],
  offer: ["statement", "studio_packshot"],
  problem_solution: ["studio_packshot", "feature_row"],
  local_trust: ["local_presence", "work_showcase"],
};

/**
 * Concepts de la campagne, un par angle, tous différents. `hasFeatures` : le projet a au moins deux atouts
 * confirmés (sinon les concepts « atouts » passent en dernier). Au-delà du catalogue, les concepts reviennent mais
 * avec une autre mise en page (voir `templateFor`).
 */
export function planDirections(angles: AnglePlan[], business: "products" | "services", hasFeatures: boolean): CreativeDirection[] {
  const pool = (business === "services" ? SERVICES : PRODUCT).slice().sort((a, b) => Number(!hasFeatures && !!a.needsFeatures) - Number(!hasFeatures && !!b.needsFeatures));
  const used = new Set<DirectionId>();
  return angles.map((a) => {
    const pref = (BY_ANGLE[a.type] ?? []).map((id) => pool.find((d) => d.id === id)).filter((d): d is CreativeDirection => !!d && (hasFeatures || !d.needsFeatures));
    const pick = pref.find((d) => !used.has(d.id)) ?? pool.find((d) => !used.has(d.id)) ?? pool[used.size % pool.length];
    used.add(pick.id);
    if (used.size >= pool.length) used.clear();
    return pick;
  });
}

/** Mise en page d'un concept : la première qui n'est pas déjà prise dans la campagne. */
export function templateFor(d: CreativeDirection, taken: Set<string>, hasFeatures: boolean): string {
  const ok = d.templates.filter((t) => hasFeatures || !["icon-row", "feature-card", "feature-column"].includes(t));
  const list = ok.length ? ok : d.templates;
  const t = list.find((x) => !taken.has(x)) ?? list[taken.size % list.length];
  taken.add(t);
  return `tpl:${t}`;
}

export const ALL_DIRECTIONS = [...PRODUCT, ...SERVICES];
