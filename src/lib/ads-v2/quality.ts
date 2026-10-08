/**
 * Barrière de qualité publicitaire (Ads V2), sur la fondation de la phase 1 (politique `ad_v2`) :
 *  - contrôles LOCAUX gratuits d'abord : affirmations (claims.ts), lisibilité (taille minimale, contraste), zones de
 *    sécurité de la plateforme, produit recouvert par le texte, part de texte sur l'image ;
 *  - relecture d'un directeur de création (IA de vision) sur 10 critères : accroche, clarté, pertinence, marque,
 *    visuel, hiérarchie, lisibilité, bouton, adéquation à la plateforme, singularité (pas une affiche générique).
 * Sans relecture IA, une création n'est jamais FINAL (au mieux PROVISOIRE, à choisir à la main). Une note n'est
 * pas une preuve de qualité réelle.
 */
import { z } from "zod";
import { decide, type GateDecision } from "../quality/gate";
import { claimCodes, type ClaimIssue } from "./claims";
import type { ComposeMetrics } from "./compose";
import { PLATFORM_SPECS } from "./platforms";
import { AD_CRITERIA, type AdCriterion, type AdReview, type Platform } from "./types";

/** Plancher de lisibilité mobile (pixels sur la création de 1080 px de large). */
export const MIN_FONT_PX = 22;

export function localAdChecks(m: ComposeMetrics, claims: ClaimIssue[], platform: Platform): { codes: string[]; issues: string[] } {
  const codes: string[] = claimCodes(claims);
  const issues = claims.map((c) => c.fix);
  if (m.minFontPx < MIN_FONT_PX || m.textContrast < 4.5) {
    codes.push("illegible");
    issues.push(m.textContrast < 4.5 ? `contraste du texte ${m.textContrast}:1 (4,5:1 au moins)` : `texte de ${m.minFontPx} px : trop petit sur mobile`);
  }
  if (m.textOverlap) {
    codes.push("illegible");
    issues.push("un texte chevauche le bouton");
  }
  if (m.safeOverflow) {
    codes.push("safe_zone");
    issues.push(`texte ou bouton dans la zone recouverte par l'interface de ${PLATFORM_SPECS[platform].label}`);
  }
  if (m.productOverlap) {
    codes.push("product_overlap");
    issues.push("le texte recouvre le produit");
  }
  if (m.textShare > PLATFORM_SPECS[platform].maxTextShare + 0.12) {
    codes.push("too_much_text");
    issues.push(`trop de texte sur l'image (${Math.round(m.textShare * 100)} %)`);
  }
  return { codes: [...new Set(codes)], issues };
}

const score = z.coerce.number().min(0).max(10).catch(0);
export const AdReviewSchema = z.object({
  criteria: z.object(Object.fromEntries(AD_CRITERIA.map((k) => [k, score])) as Record<AdCriterion, typeof score>),
  issues: z.array(z.string()).catch([]),
  claimProblems: z.array(z.string()).catch([]),
  productAltered: z.boolean().catch(false),
  textIllegible: z.boolean().catch(false),
  generic: z.boolean().catch(false),
  fix: z.object({ target: z.enum(["copy", "hook", "layout", "visual", "cta", "none"]).catch("none"), instruction: z.string().catch("") }).catch({ target: "none", instruction: "" }),
});

export const AD_REVIEW_SYSTEM = `Rôle : directeur de création d'une agence de publicité exigeante (niveau 2026). Tu juges UNE création publicitaire (image composée + texte de l'annonce) avant diffusion.
Note de 0 à 10 : hook (l'accroche arrête-t-elle le défilement en 3 secondes ?), clarity (on comprend l'offre en un regard), relevance (produit et audience réels), brand (couleurs, typographie, ton de la marque), visual (qualité esthétique de l'image, niveau agence), hierarchy (marque → accroche → bouton, lecture évidente), legibility (texte lisible sur mobile), cta (bouton clair et adapté), platform (format, zones de sécurité, ton de la plateforme), distinctiveness (pas une affiche automatique générique).
claimProblems : toute affirmation invérifiable (chiffre, superlatif, garantie, avis, promotion, urgence, santé). productAltered : le produit montré n'est pas le produit réel ou est déformé. textIllegible : texte illisible. generic : création interchangeable avec n'importe quelle marque.
Sois strict : 8 se mérite. « fix » : LA correction la plus utile — copy, hook, layout, visual, cta ou none — avec l'instruction précise.`;

export function reviewAdCodes(r: AdReview): string[] {
  const codes: string[] = [];
  if (r.productAltered) codes.push("product_altered");
  if (r.claimProblems.length) codes.push("unverified_claim");
  if (r.textIllegible || r.criteria.legibility < 5) codes.push("illegible");
  if (r.generic || r.criteria.distinctiveness < 5) codes.push("generic");
  return [...new Set(codes)];
}

export const adScore = (r: AdReview) => {
  const w: Record<AdCriterion, number> = { hook: 2, clarity: 1.5, relevance: 1.5, brand: 1, visual: 1.5, hierarchy: 1, legibility: 1, cta: 0.75, platform: 0.75, distinctiveness: 1 };
  const tot = AD_CRITERIA.reduce((s, k) => s + w[k], 0);
  return Math.round((AD_CRITERIA.reduce((s, k) => s + r.criteria[k] * w[k], 0) / tot) * 10) / 10;
};

/** Décision : contrôles locaux d'abord ; sans relecture, jamais FINAL ; relecture en panne, jamais validée. */
export function gateAd(o: { local: { codes: string[]; issues: string[] }; review: AdReview | null; reviewError?: string | null; attempt: number }): GateDecision {
  if (o.local.codes.length) return decide("ad_v2", { checker: o.review ? "ai" : "local", score: o.review ? adScore(o.review) : 0, codes: [...o.local.codes, ...(o.review ? reviewAdCodes(o.review) : [])], issues: o.local.issues }, { attempt: o.attempt });
  if (o.reviewError) return decide("ad_v2", { checker: "ai", score: null, error: o.reviewError }, { attempt: o.attempt });
  if (!o.review) return decide("ad_v2", { checker: "local", score: 6 }, { attempt: o.attempt });
  const issues = [...o.review.issues, ...o.review.claimProblems, ...(o.review.fix.target !== "none" && o.review.fix.instruction ? [`${o.review.fix.target} : ${o.review.fix.instruction}`] : [])];
  return decide("ad_v2", { checker: "ai", score: adScore(o.review), criteria: o.review.criteria, codes: reviewAdCodes(o.review), issues }, { attempt: o.attempt });
}
