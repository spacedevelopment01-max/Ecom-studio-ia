/**
 * Advertising Engine V2 (phase 6A) — types partagés.
 *
 * PROJECT BRAIN → INSIGHT (produit, audience, preuves, objections) → ANGLES réellement différents → CONCEPTS
 * (accroche, texte, visuel) → CONTRÔLE DES AFFIRMATIONS → VISUEL (Image Engine V2) → COMPOSITION publicitaire
 * (typographie, hiérarchie, CTA, zones de sécurité par plateforme) → BARRIÈRE PUBLICITAIRE → reprise ciblée →
 * BIBLIOTHÈQUE et réutilisation des créations validées.
 */
import type { Verdict } from "../quality/gate";
import type { AspectId } from "../image-v2/types";

export const PLATFORMS = ["meta_feed", "meta_story", "tiktok", "google_display", "pinterest", "linkedin"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Types d'angles publicitaires : chacun repose sur une matière différente (un fait, un usage, une objection…). */
export const ANGLE_TYPES = [
  "demonstration", // le produit ou le service en action
  "detail", // un détail concret qui intrigue
  "use_case", // la situation d'usage
  "problem_solution", // un problème concret et la réponse
  "objection", // une objection levée (réponse fournie par le client)
  "proof", // une preuve confirmée (fait, origine, garantie réelle)
  "origin_craft", // fabrication, savoir-faire, origine confirmée
  "gift", // idée cadeau (produits)
  "local_trust", // proximité, zone, mode de contact (services)
  "offer", // offre réelle configurée (jamais inventée)
] as const;
export type AngleType = (typeof ANGLE_TYPES)[number];

/** Ce que le studio sait pour vendre : uniquement ce qui est confirmé ou saisi par le client. */
export type AdInsight = {
  business: "products" | "services";
  brand: string;
  offerName: string;
  category: { id: string; label: string; source: string };
  audience: { declared: string | null; persona: string | null; adultsOnly: boolean };
  problem: string | null;
  alternatives: string | null;
  difference: string | null;
  /** Faits confirmés (libellé : valeur), base de toute preuve. */
  facts: { label: string; value: string }[];
  /** Objections ET leur réponse fournie (une objection sans réponse n'est jamais utilisée). */
  objections: { objection: string; answer: string }[];
  /** Preuves disponibles (plateforme de marque) ; les preuves « manquantes » sont exclues. */
  proofs: string[];
  /** Usages crédibles (catégorie produit ou prestations). */
  usage: string[];
  services: { name: string; description: string }[];
  area: string | null;
  contactMode: string | null;
  tone: string[];
  premium: boolean;
  claimsToAvoid: string[];
  /** Offre commerciale RÉELLE configurée par le client (sinon null : aucune promotion inventée). */
  offer: string | null;
  /** Points manquants qui limitent la campagne (signalés, jamais inventés). */
  gaps: string[];
};

export type AnglePlan = {
  id: string;
  type: AngleType;
  /** Matière de l'angle (le fait, l'usage, l'objection…) : deux angles n'utilisent jamais la même. */
  material: string;
  /** Pourquoi cet angle pour cette audience. */
  why: string;
  lever: string;
};

export type AdCopy = {
  hook: string;
  primary: string;
  headline: string;
  description: string;
  cta: string;
  /** Variante d'accroche pour un test A/B (même angle, autre formulation). */
  hookB: string | null;
};

export type VisualConcept = {
  /** Intention d'image pour l'Image Engine V2. */
  kind: "ad_image" | "lifestyle" | "usage_scene" | "trade_photo" | "ambiance" | "site_image";
  subject: string;
  /** Mise en page publicitaire. */
  layout: "hero_left" | "hero_center" | "full_bleed" | "split" | "typographic";
  /** Le produit réel (détourage) est-il posé sur la création ? */
  productOnTop: boolean;
};

export type AdConcept = {
  id: string;
  angle: AnglePlan;
  copy: AdCopy;
  visual: VisualConcept;
};

export type FormatSpec = { platform: Platform; aspect: AspectId; width: number; height: number; label: string; safe: { top: number; bottom: number; side: number } };

export type AdReview = {
  criteria: Record<AdCriterion, number>;
  issues: string[];
  claimProblems: string[];
  productAltered: boolean;
  textIllegible: boolean;
  generic: boolean;
  fix: { target: "copy" | "hook" | "layout" | "visual" | "cta" | "none"; instruction: string };
};

export const AD_CRITERIA = ["hook", "clarity", "relevance", "brand", "visual", "hierarchy", "legibility", "cta", "platform", "distinctiveness"] as const;
export type AdCriterion = (typeof AD_CRITERIA)[number];

export type AdOutcome = {
  conceptId: string;
  platform: Platform;
  aspect: AspectId;
  verdict: Verdict;
  score: number | null;
  codes: string[];
  reason: string;
  assetId: string | null;
  imageAssetId: string | null;
  attempts: number;
  reused: boolean;
};
