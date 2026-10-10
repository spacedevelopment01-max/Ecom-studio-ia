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
  /** Activités réelles de l'entreprise (prestations saisies, catégorie) : seules autorisées dans une ligne métier. */
  activities: string[];
  /** Slogan validé par le client (seul slogan écrit dans un logo) ; un slogan non validé reste une proposition. */
  tagline: string | null;
  /** Style demandé par le client (« auto » : l'IA propose plusieurs styles adaptés). */
  style: LogoStyle | "auto";
};

/**
 * Styles d'identité visuelle : aucun n'est privilégié. « illustrated » : symbole illustré du métier ; « minimal » :
 * signe épuré ; « typographic » : composition typographique ; « monogram » : initiales construites ; « emblem » :
 * sceau, badge ; « textured » : matière choisie pour l'entreprise ; « gradient » : dégradés modernes ; « premium » : sobriété
 * haut de gamme. Aucun n'est imposé : le directeur artistique choisit ce qui sert CHAQUE marque.
 */
export const LOGO_STYLES = ["illustrated", "minimal", "typographic", "monogram", "emblem", "textured", "gradient", "premium"] as const;
export type LogoStyle = (typeof LOGO_STYLES)[number];

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
  /** Style d'identité (rendu, matière, couleurs) : décide aussi des critères du contrôle. */
  style: LogoStyle;
  /** Ligne d'activités proposée sous le nom (seulement des activités réelles), sinon null. */
  descriptor: string | null;
};

/** Proposition construite à partir d'un territoire. */
export type Candidate = {
  territoryId: string;
  attempt: number;
  spec: LogoSpec;
  /** Ce qui a changé par rapport à la tentative précédente (reprise ciblée). */
  change: string | null;
  symbolSource: "ai_svg" | "ai_image_traced" | "ai_image_finalized" | "monogram" | "library" | "none" | "artwork";
  /** Logo complet dessiné par l'IA d'images (l'original est le livrable principal). */
  artwork?: ArtworkInfo;
};

/** Zone (fractions de l'image, 0-1) où est écrit le nom : sert à corriger le texte sans toucher au dessin. */
export type TextBox = { x: number; y: number; w: number; h: number };

export type ArtworkInfo = {
  /** PNG haute définition tel que livré (original de l'IA, fond retiré et recadré). */
  png: Buffer;
  /** Image de départ (avant correction du texte) : l'original n'est jamais perdu. */
  originalPng?: Buffer;
  /** Texte attendu dans le logo (nom exact, ligne d'activités, slogan validé). */
  expected: { name: string; descriptor: string | null; tagline: string | null };
  textBox: TextBox | null;
  /** Nom réécrit par le studio avec une vraie police (sans redessiner l'illustration). */
  textCorrected: boolean;
  provider: string | null;
};

export const REVIEW_CRITERIA = ["relevance", "originality", "legibility", "typography", "composition", "balance", "memorability", "smallSize", "monochrome", "versatility"] as const;
export type ReviewCriterion = (typeof REVIEW_CRITERIA)[number];

/** Relecture d'un directeur artistique (IA, sur planche : fond neutre, noir et blanc, petite taille). */
/** Relecture d'un logo complet de l'IA d'images (critères adaptés au style, usages réellement prévus). */
export const ART_CRITERIA = ["relevance", "originality", "craft", "typography", "composition", "legibility", "memorability", "intendedUse"] as const;
export type ArtCriterion = (typeof ART_CRITERIA)[number];
export type ArtworkReview = {
  criteria: Record<ArtCriterion, number>;
  textRead: string;
  nameExact: boolean;
  extraText: boolean;
  nameBox: TextBox | null;
  /** Cliché MALADROIT (icône de banque d'images, assemblage convenu) — un symbole du métier bien intégré n'en est pas un. */
  clumsyCliche: boolean;
  resemblesKnownBrand: boolean;
  amateur: boolean;
  /** Le dessin reste-t-il net et cohérent (pas de lettres fantômes, de formes fondues, d'artefacts) ? */
  artifacts: boolean;
  issues: string[];
  /** Une version simplifiée est-elle nécessaire pour les petites tailles (favicon, tampon, broderie) ? */
  needsSimplifiedMark: boolean;
};

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
  /** Relecture du logo complet (critères du style, zone du nom, besoin d'une version simplifiée). */
  artworkReview?: ArtworkReview | null;
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
