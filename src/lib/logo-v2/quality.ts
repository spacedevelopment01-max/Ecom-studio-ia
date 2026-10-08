/**
 * Logo Quality Gate V2 : contrôles déterministes (texte exact, glyphes, signature absente, petite taille, noir seul,
 * cliché littéral) + relecture d'un directeur artistique sur la planche (fond neutre, noir, blanc sur sombre, petite
 * taille) → barrière de qualité de la phase 1 (livrable « logo_v2 »). La note seule ne suffit jamais : un défaut
 * bloquant ou fatal empêche FINAL.
 */
import { z } from "zod";
import { contrast } from "../color";
import { symbolLegibility } from "../media/logo-symbol";
import { decide, type GateDecision } from "../quality/gate";
import { missingGlyphs, expectedText } from "./construct";
import { literalCliche } from "./territories";
import { REVIEW_CRITERIA, type BrandBrief, type Candidate, type LogoReview, type Territory } from "./types";

const score10 = z.coerce.number().min(0).max(10).catch(0);
export const LogoReviewSchema = z.object({
  criteria: z.object(Object.fromEntries(REVIEW_CRITERIA.map((k) => [k, score10])) as Record<(typeof REVIEW_CRITERIA)[number], typeof score10>),
  textRead: z.string().max(200).catch(""),
  cliche: z.boolean().catch(false),
  resemblesKnownBrand: z.boolean().catch(false),
  amateur: z.boolean().catch(false),
  issues: z.array(z.string().max(300)).max(8).catch([]),
  fix: z.object({ target: z.enum(["typography", "symbol", "composition", "color", "spacing", "none"]).catch("none"), instruction: z.string().max(400).catch("") }).catch({ target: "none", instruction: "" }),
});

/** Défauts constatés sans IA (gratuits, sûrs). */
export function deterministicChecks(c: Candidate, t: Territory, brief: BrandBrief): { codes: string[]; issues: string[] } {
  const codes: string[] = [];
  const issues: string[] = [];
  if (c.spec.name !== brief.name) codes.push("name_mismatch"), issues.push(`nom attendu exactement « ${brief.name} »`);
  const missing = missingGlyphs(brief.name, c.spec.family, c.spec.weight);
  if (missing.length) codes.push("name_mismatch"), issues.push(`la police ${c.spec.family} n'a pas les caractères ${missing.join(" ")}`);
  if (c.spec.tagline) codes.push("extra_text"), issues.push("texte en plus du nom (signature non validée)");
  if (c.spec.custom && !symbolLegibility(c.spec.custom).ok) codes.push("small_sizes"), issues.push("symbole illisible en petite taille");
  if (contrast(c.spec.color, "#FFFFFF") < 4.5) codes.push("weak_monochrome"), issues.push("encre trop claire pour une impression en une couleur");
  const cl = literalCliche(t, brief.cliches);
  if (cl) codes.push("cliche"), issues.push(`cliché littéral du métier (${cl})`);
  return { codes: [...new Set(codes)], issues };
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Défauts relevés par la relecture (texte mal lu, cliché, ressemblance, rendu amateur). */
export function reviewCodes(r: LogoReview, c: Candidate): string[] {
  const codes: string[] = [];
  // Le texte est rendu avec la vraie police : si un lecteur ne lit pas exactement le nom (accents compris), il est illisible.
  if (squash(r.textRead).toLocaleLowerCase("fr-FR") !== squash(expectedText(c.spec)).toLocaleLowerCase("fr-FR")) codes.push("text_unreadable");
  if (r.cliche) codes.push("cliche");
  if (r.resemblesKnownBrand) codes.push("resembles_known_brand");
  if (r.amateur) codes.push("amateur");
  return codes;
}

export const reviewScore = (r: LogoReview) => Math.round((REVIEW_CRITERIA.reduce((s, k) => s + r.criteria[k], 0) / REVIEW_CRITERIA.length) * 10) / 10;

/** Verdict de la barrière (IA disponible : relecture ; sinon version du studio, provisoire au mieux). */
export function gateCandidate(c: Candidate, t: Territory, brief: BrandBrief, review: LogoReview | null, attempt: number): GateDecision {
  const det = deterministicChecks(c, t, brief);
  if (!review) return decide("logo_v2", { checker: "local", score: null, codes: det.codes, issues: det.issues }, { attempt });
  const codes = [...new Set([...det.codes, ...reviewCodes(review, c)])];
  const issues = [...det.issues, ...review.issues, ...(review.fix.target !== "none" && review.fix.instruction ? [`${review.fix.target} : ${review.fix.instruction}`] : [])];
  return decide("logo_v2", { checker: "ai", score: reviewScore(review), criteria: review.criteria, codes, issues }, { attempt });
}
