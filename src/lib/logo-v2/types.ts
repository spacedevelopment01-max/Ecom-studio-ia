/**
 * Brand & Logo Engine V2 (phase 4A) — types partagés.
 *
 * Un logo naît d'un processus de direction artistique : DÉCOUVERTE de la marque → TERRITOIRES créatifs distincts
 * (décrits avant toute image) → CONSTRUCTION hybride (typographie réelle, texte exact, symbole contrôlé, vectoriel)
 * → BARRIÈRE DE QUALITÉ V2 → reprise CIBLÉE ou abandon → propositions montrées au client → choix → déclinaisons et
 * système de marque.
 */
import type { BrandPalette } from "../theme/directions";
import type { LogoSpec } from "../media/logo";
import type { Verdict } from "../quality/gate";

export type PaletteRole = keyof BrandPalette;

/** Ce que le studio sait de la marque avant de dessiner (Project Brain, aucun appel). */
export type BrandBrief = {
  projectId: string;
  /** Nom EXACT (accents, espaces, casse saisie) : le seul texte autorisé dans le logo. */
  name: string;
  nameStatus: string;
  /** Ligne métier autorisée sous le nom (ex. « Boulangerie artisanale ») : seulement si elle vient du client. */
  descriptor: string | null;
  business: "products" | "services";
  activity: string;
  trade: { label: string; actions: string[]; objects: string[]; generic: boolean };
  positioning: string | null;
  audience: string | null;
  personality: string[];
  /** Valeurs : seulement celles confirmées (faits du client), jamais déduites. */
  values: string[];
  differentiation: string | null;
  competitorCodes: string | null;
  palette: BrandPalette;
  paletteLocked: boolean;
  fontsLocked: { heading: string; body: string } | null;
  /** Décisions et refus du client (Project Brain). */
  decisions: string[];
  rejectedMarkTypes: MarkType[];
  rejections: string[];
  /** Clichés du métier à ne pas dessiner tels quels. */
  cliches: string[];
  /** Contexte du Brain (scope logo) pour les appels à l'IA. */
  brainContext: string;
};

export const MARK_TYPES = ["wordmark", "lettermark", "monogram", "symbol_wordmark", "abstract_mark", "emblem"] as const;
export type MarkType = (typeof MARK_TYPES)[number];
export const COMPOSITIONS = ["horizontal", "stacked", "wordmark_only", "badge"] as const;
export type Composition = (typeof COMPOSITIONS)[number];
export const TYPE_STYLES = ["geometric_sans", "humanist_sans", "grotesque", "high_contrast_serif", "classic_serif", "contemporary_serif"] as const;
export type TypeStyle = (typeof TYPE_STYLES)[number];
export const CONSTRUCTIONS = ["geometric", "organic", "typographic", "modular", "illustrative"] as const;
export type Construction = (typeof CONSTRUCTIONS)[number];

/** Territoire créatif : décrit STRUCTURELLEMENT avant toute génération visuelle. */
export type Territory = {
  id: string;
  name: string;
  concept: string;
  whyItFits: string;
  markType: MarkType;
  composition: Composition;
  typography: { style: TypeStyle; weight: "light" | "regular" | "bold" | "black"; case: "upper" | "title" | "lower"; tracking: "tight" | "normal" | "wide"; rationale: string };
  colorRole: { ink: PaletteRole; accent: PaletteRole; rationale: string };
  /** 1 = très sobre … 5 = expressif. */
  sobriety: number;
  construction: Construction;
  /** Idée du symbole (types à symbole) : une idée, jamais une icône littérale du métier. */
  symbolIdea: string | null;
  distinctive: string;
  avoid: string[];
  source: "ai" | "local";
};

/** Proposition construite à partir d'un territoire. */
export type Candidate = {
  territoryId: string;
  attempt: number;
  spec: LogoSpec;
  /** Ce qui a changé par rapport à la tentative précédente (reprise ciblée). */
  change: string | null;
  symbolSource: "ai_svg" | "ai_image_traced" | "monogram" | "library" | "none";
};

export const REVIEW_CRITERIA = ["relevance", "originality", "legibility", "typography", "composition", "balance", "memorability", "smallSize", "monochrome", "versatility"] as const;
export type ReviewCriterion = (typeof REVIEW_CRITERIA)[number];

/** Relecture d'un directeur artistique (IA, sur planche : fond neutre, noir et blanc, petite taille). */
export type LogoReview = {
  criteria: Record<ReviewCriterion, number>;
  /** Texte lu sur la planche, lettre par lettre. */
  textRead: string;
  cliche: boolean;
  resemblesKnownBrand: boolean;
  amateur: boolean;
  issues: string[];
  /** Reprise ciblée : CE qu'il faut retravailler. */
  fix: { target: "typography" | "symbol" | "composition" | "color" | "spacing" | "none"; instruction: string };
};

export type ProposalResult = {
  territory: Territory;
  candidate: Candidate;
  verdict: Verdict;
  score: number | null;
  reason: string;
  codes: string[];
  attempts: number;
  checkId: string | null;
  assetId?: string;
};

export type EngineRun = {
  runId: string;
  territories: Territory[];
  /** Propositions montrées au client (FINAL). */
  shown: ProposalResult[];
  /** Versions du studio (contrôle local seulement, sans relecture IA) : proposées à part, logo provisoire au mieux. */
  studio: ProposalResult[];
  /** Essais écartés (diagnostic seulement). */
  discarded: ProposalResult[];
  /** Territoires refusés avant construction (trop proches, refusés par le client, cliché). */
  territoryRejections: { name: string; reason: string }[];
  ai: "used" | "unavailable" | "off";
  stoppedByCostCap: boolean;
  notes: string[];
};
