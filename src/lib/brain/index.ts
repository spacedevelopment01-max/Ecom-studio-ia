/**
 * Project Brain (phase 2.0) : lecture seule. Rien ici n'est encore branché sur les moteurs du studio
 * (projectContext, mémoire, recherches de photos restent inchangés jusqu'à la phase 2.1).
 */
export { brainSnapshot, currentLogoOf, type BrainSnapshot, type CurrentLogo } from "./snapshot";
export { BUDGETS, SCOPES, brainItems, contextFor, type BrainItem, type ContextView, type Level, type Scope } from "./views";
export { BRAIN_VERSION, canonicalJSON, stableHash } from "./hash";
export { GLOBAL_NEGATIVES, resolveTrade, tradeText, type TradeProfile } from "./trade";

import { brainSnapshot } from "./snapshot";
import { contextFor, SCOPES, type ContextView, type Scope } from "./views";
import { redact } from "../redact";

/** Résumé diagnostic d'une vue : jamais le contenu, sauf demande explicite (et alors masqué par redact). */
export function viewSummary(v: ContextView, withContent = false) {
  const { stable, volatile, ...meta } = v;
  return { ...meta, estTokens: Math.round(v.chars / 3.2), volatileChars: volatile.length, ...(withContent ? { content: redact(stable), volatileContent: redact(volatile) } : {}) };
}

/** « Que sait E-COM Studio de ce projet ? » : compteurs, logo actuel, métier compris, et une vue par scope. */
export function brainReport(projectId: string, opts: { scopes?: Scope[]; content?: boolean } = {}) {
  const s = brainSnapshot(projectId);
  const scopes = opts.scopes?.length ? opts.scopes : [...SCOPES];
  return {
    projectId,
    counts: s.counts,
    technicalFailuresIgnored: s.technicalFailures,
    trade: { id: s.trade.id, source: s.trade.source, labels: s.trade.labels, sector: s.trade.sector },
    currentLogo: s.currentLogo ? { state: s.currentLogo.state, source: s.currentLogo.source, name: s.currentLogo.name } : null,
    aiPatterns: s.aiPatterns.length,
    views: scopes.map((sc) => viewSummary(contextFor(s, sc), opts.content)),
  };
}
