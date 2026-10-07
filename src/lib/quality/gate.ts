/**
 * Barrière de qualité : décide, pour un candidat contrôlé, s'il est FINAL, à reprendre (RETRY), provisoire
 * (PROVISIONAL) ou refusé (REJECTED). Fonction pure : aucune IA, aucune base de données.
 *
 * Principes :
 *  - une réponse du fournisseur n'est jamais un résultat de qualité ; seul le contrôle conclut ;
 *  - un contrôle en panne ou impossible ne donne JAMAIS FINAL (RETRY « recheck » : refaire le contrôle, pas l'image) ;
 *  - un défaut fatal abandonne la direction ; un défaut bloquant interdit FINAL quelle que soit la note ;
 *  - une reprise n'est demandée qu'avec un diagnostic précis (défauts cités) et dans la limite de la politique ;
 *  - la note est un outil : critères faibles, confiance et provenance du contrôle comptent aussi.
 */
import { L } from "../i18n-server";
import { DEFAULT_CONFIDENCE, POLICIES, POLICY_VERSION, type Checker, type Deliverable } from "./policies";

export type Verdict = "FINAL" | "RETRY" | "PROVISIONAL" | "REJECTED";

/** Résultat d'un contrôle, normalisé (quel que soit le contrôleur). */
export type CheckInput = {
  checker: Checker;
  /** Note sur 10, ou null si aucune note n'a pu être obtenue. */
  score: number | null;
  criteria?: Record<string, number>;
  /** Codes de défauts relevés (comparés aux listes fatal / blocking de la politique). */
  codes?: string[];
  /** Défauts décrits en clair (servent de consigne à une reprise). */
  issues?: string[];
  /** Confiance dans ce contrôle (0-1) ; à défaut, celle de sa provenance. */
  confidence?: number;
  /** Panne du contrôle (exception, réponse inexploitable). */
  error?: string;
};

export type GateDecision = {
  deliverable: Deliverable;
  verdict: Verdict;
  /** Défaut fatal : jamais réutilisable automatiquement, même après un choix manuel. */
  fatal: boolean;
  checked: boolean;
  checker: Checker;
  confidence: number;
  score: number | null;
  action: "regenerate" | "recheck" | "none";
  reason: string;
  /** Consigne d'une reprise ciblée (défauts cités). */
  feedback: string;
  fatalCodes: string[];
  blockingCodes: string[];
  weakCriteria: string[];
  /** Résultat provisoire : usage automatique permis (placeholder) ou seulement manuel. */
  provisional?: { use: "auto" | "manual"; label: "placeholder" | "needs_improvement" };
  attempt: number;
  policyVersion: string;
};

export function decide(deliverable: Deliverable, check: CheckInput, opts: { attempt?: number } = {}): GateDecision {
  const p = POLICIES[deliverable];
  const attempt = opts.attempt ?? 0;
  const codes = check.codes ?? [];
  const issues = (check.issues ?? []).map((x) => x.trim()).filter(Boolean);
  const confidence = Math.max(0, Math.min(1, check.confidence ?? DEFAULT_CONFIDENCE[check.checker]));
  const score = check.score == null || !Number.isFinite(check.score) ? null : Math.max(0, Math.min(10, check.score));
  const fatalCodes = codes.filter((c) => p.fatal.includes(c));
  const blockingCodes = codes.filter((c) => p.blocking.includes(c));
  const weakCriteria = Object.entries(check.criteria ?? {})
    .filter(([k, v]) => v < (p.criteriaFloors?.[k] ?? p.minCriterion ?? -Infinity))
    .map(([k]) => k);
  const canRetry = attempt < p.maxRetries;
  const feedback = [...issues, ...weakCriteria.map((k) => L(`critère faible : ${k}`, `weak criterion: ${k}`))].join(L(" ; ", "; "));
  const base = { deliverable, checker: check.checker, confidence, score, fatalCodes, blockingCodes, weakCriteria, attempt, policyVersion: POLICY_VERSION, feedback };
  const out = (verdict: Verdict, action: GateDecision["action"], reason: string, extra: Partial<GateDecision> = {}): GateDecision => ({ ...base, verdict, action, reason, fatal: false, checked: true, ...extra });
  const provisional = (reason: string): GateDecision | null =>
    p.provisional && p.provisional.checkers.includes(check.checker) && (score ?? 0) >= p.provisional.floor
      ? out("PROVISIONAL", "none", reason, { provisional: { use: p.provisional.use, label: p.provisional.label } })
      : null;

  // 1. Contrôle impossible ou en panne : jamais FINAL ; on refait le contrôle, pas la génération.
  if (check.checker === "none" || check.error) {
    return out("RETRY", "recheck", check.error ? L(`contrôle en panne : ${check.error}`, `check failed: ${check.error}`) : L("aucun contrôle possible", "no check available"), { checked: false, confidence: 0 });
  }
  // 2. Défaut fatal : direction abandonnée.
  if (fatalCodes.length) return out("REJECTED", "none", L(`défaut rédhibitoire : ${fatalCodes.join(", ")}`, `fatal defect: ${fatalCodes.join(", ")}`), { fatal: true });
  // 3. Défaut bloquant : jamais FINAL ; reprise ciblée si possible.
  if (blockingCodes.length) {
    const why = L(`défaut bloquant : ${blockingCodes.join(", ")}`, `blocking defect: ${blockingCodes.join(", ")}`);
    return canRetry ? out("RETRY", "regenerate", why) : out("REJECTED", "none", why);
  }
  // 4. Provenance qui ne peut pas conclure FINAL (ex. version locale d'un logo) : provisoire au mieux.
  if (!p.finalCheckers.includes(check.checker)) {
    return provisional(L("contrôle insuffisant pour un résultat final : provisoire", "check not strong enough for a final result: provisional")) ?? out("REJECTED", "none", L("contrôle insuffisant pour ce livrable", "check not strong enough for this deliverable"));
  }
  // 5. Contrôle sans note exploitable : à refaire.
  if (score == null) return out("RETRY", "recheck", L("contrôle sans note", "check returned no score"), { checked: false });

  const strong = score >= p.final && !weakCriteria.length && confidence >= p.minConfidence;
  if (strong) return out("FINAL", "none", L(`barrière franchie (${score.toFixed(1)}/10)`, `gate passed (${score.toFixed(1)}/10)`));

  const why =
    score >= p.final
      ? weakCriteria.length
        ? L(`note suffisante mais critère faible (${weakCriteria.join(", ")})`, `good score but weak criterion (${weakCriteria.join(", ")})`)
        : L("note suffisante mais contrôle peu sûr", "good score but low-confidence check")
      : L(`sous la barrière (${score.toFixed(1)}/10, attendu ${p.final})`, `below the gate (${score.toFixed(1)}/10, expected ${p.final})`);
  // 6. Proche ou au-dessus mais incomplet : reprise ciblée seulement avec un diagnostic.
  if (score >= p.retryFloor && canRetry && feedback) return out("RETRY", "regenerate", why);
  // 7. Pas de reprise possible : provisoire si la politique le permet, sinon refusé.
  if (score >= p.retryFloor || (p.provisional && score >= p.provisional.floor)) {
    const prov = provisional(why);
    if (prov) return prov;
  }
  return out("REJECTED", "none", why);
}
