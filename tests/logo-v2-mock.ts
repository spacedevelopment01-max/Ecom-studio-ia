/**
 * IA simulée du moteur Logo V2 (aucun appel payant) : territoires construits d'après le brief (personnalité, métier,
 * nom), relectures scénarisées par territoire, journal des appels (ordre, nombre).
 */
import type { LogoV2Ai } from "@/lib/logo-v2/ai";
import type { TerritoryDraft } from "@/lib/logo-v2/territories";
import type { BrandBrief, LogoReview, ReviewCriterion } from "@/lib/logo-v2/types";
import { REVIEW_CRITERIA } from "@/lib/logo-v2/types";

export const SVG_OK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M12 80 L50 14 L88 80 Z" fill="currentColor"/><rect x="40" y="56" width="20" height="24" fill="currentColor"/></svg>`;

export function review(score: number, expected: string, o: Partial<LogoReview> & { low?: Partial<Record<ReviewCriterion, number>> } = {}): LogoReview {
  const criteria = Object.fromEntries(REVIEW_CRITERIA.map((k) => [k, o.low?.[k] ?? score])) as Record<ReviewCriterion, number>;
  return { criteria, textRead: o.textRead ?? expected, cliche: o.cliche ?? false, resemblesKnownBrand: o.resemblesKnownBrand ?? false, amateur: o.amateur ?? false, issues: o.issues ?? [], fix: o.fix ?? { target: "none", instruction: "" } };
}

/** Territoires inventés d'après le brief : distincts, plus un quasi-doublon et un cliché littéral (à écarter). */
export function draftsFor(b: BrandBrief): TerritoryDraft[] {
  const p = b.personality.join(" ").toLowerCase();
  const premium = /premium|raffin|épuré/.test(p);
  const tech = /digital|moderne|précis/.test(p) && !/artisan/.test(p);
  const warm = /chaleur|convivial|gourmand/.test(p);
  const object = b.trade.objects[0] ?? "outil";
  const t = (o: Partial<TerritoryDraft> & Pick<TerritoryDraft, "name" | "markType" | "composition" | "construction" | "sobriety">, style: TerritoryDraft["typography"]["style"]): TerritoryDraft => ({
    concept: `Concept « ${o.name} » pour ${b.name} : ${b.activity}.`,
    whyItFits: `Traduit ${b.personality.slice(0, 2).join(" et ") || "la marque"} pour ${b.audience ?? "sa clientèle"}.`,
    typography: { style, weight: "bold", case: "title", tracking: "normal", rationale: "" },
    colorRole: { ink: "dark", accent: "primary", rationale: "" },
    symbolIdea: null,
    distinctive: "",
    avoid: [],
    ...o,
  });
  return [
    t({ name: "Signature typographique", markType: "wordmark", composition: "wordmark_only", construction: "typographic", sobriety: 1 }, premium ? "high_contrast_serif" : tech ? "grotesque" : warm ? "classic_serif" : "humanist_sans"),
    t({ name: "Monogramme construit", markType: "monogram", composition: "horizontal", construction: "geometric", sobriety: 2 }, tech ? "geometric_sans" : "grotesque"),
    t({ name: "Geste abstrait", markType: "abstract_mark", composition: "stacked", construction: "modular", sobriety: 3, symbolIdea: `forme abstraite construite d'après le geste ${b.trade.actions[0] ?? "du métier"}, en négatif` }, premium ? "contemporary_serif" : "geometric_sans"),
    // Quasi-doublon du premier : doit être écarté par la règle de diversité.
    t({ name: "Signature typographique bis", markType: "wordmark", composition: "wordmark_only", construction: "typographic", sobriety: 1 }, premium ? "high_contrast_serif" : tech ? "grotesque" : warm ? "classic_serif" : "humanist_sans"),
    // Cliché littéral du métier : doit être écarté.
    t({ name: "Objet du métier", markType: "symbol_wordmark", composition: "horizontal", construction: "illustrative", sobriety: 4, symbolIdea: `un ${object} dessiné` }, "humanist_sans"),
    t({ name: "Sceau", markType: "emblem", composition: "badge", construction: "organic", sobriety: 4 }, warm || premium ? "classic_serif" : "grotesque"),
  ];
}

export type MockLog = { calls: string[] };

/** IA simulée : `reviews[territoryName]` = suite de relectures (sinon 8,6 FINAL). */
export function mockAi(log: MockLog, opts: { reviews?: Record<string, ((expected: string) => LogoReview)[]>; svg?: string; drafts?: (b: BrandBrief) => TerritoryDraft[] } = {}): LogoV2Ai {
  const queues: Record<string, ((e: string) => LogoReview)[]> = Object.fromEntries(Object.entries(opts.reviews ?? {}).map(([k, v]) => [k, [...v]]));
  return {
    async territories(b) {
      log.calls.push("territories");
      return (opts.drafts ?? draftsFor)(b);
    },
    async drawSymbol(t, _b, feedback) {
      log.calls.push(`symbol:${t.name}${feedback ? ":retry" : ""}`);
      return { svg: opts.svg ?? SVG_OK, idea: "forme" };
    },
    async exploreSymbol(t) {
      log.calls.push(`explore:${t.name}`);
      return null;
    },
    async review(_board, t, _b, expected) {
      log.calls.push(`review:${t.name}`);
      const next = queues[t.name]?.shift();
      return next ? next(expected) : review(8.6, expected);
    },
  };
}
