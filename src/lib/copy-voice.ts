/**
 * Voix client : une phrase de l'analyse de marque (plateforme, « différence ») réutilisée dans un texte lu par le
 * client (publication, publicité, site) perd son vocabulaire d'analyste. « La différence défendable tient à
 * l'association confirmée d'un corps en inox… Aucune supériorité thermique n'est prouvée. » devient « L'association
 * d'un corps en inox… ». Gratuit, local ; la version d'origine reste dans la stratégie.
 */

/** Tournures d'analyste repérées dans un texte client (contrôle de qualité des textes). */
export const STRATEGY_JARGON = /\b(différence (?:la plus |la mieux )?(?:défendable|étayée|crédible|prouvée|vérifiable)|la mieux étayée|defensible difference|best[- ]supported difference|credible difference)\b/i;

const LEAD = /(?:^\s*|(?<=[:—–]\s))(?:la|notre|une|leur)\s+(?:principale\s+|vraie\s+)?différence\s+(?:la\s+(?:plus|mieux)\s+)?(?:défendable|étayée|crédible|prouvée|vérifiable)?\s*(?:est|tient|réside|repose)\s*(?:à|dans|en|sur)?\s*/i;
const LEAD_EN = /(?:^\s*|(?<=[:—–]\s))(?:the|our|a|its)\s+(?:main\s+|real\s+)?(?:most\s+|best[- ])?(?:defensible|supported|credible|proven|verifiable)?\s*difference\s+(?:is|lies in|rests on|comes from)\s*/i;
/** Phrases d'analyse sur les preuves (« Aucune … n'est actuellement prouvée ») : jamais dans un texte client. */
const ANALYSIS = /(n['’]est|ne sont|n['’]a été)\s+(?:pas\s+)?(?:encore\s+|actuellement\s+)?(?:pas\s+)?(?:prouvée?s?|démontrée?s?|établie?s?|confirmée?s?)|\b(?:is|are) (?:not )?(?:yet |currently )?(?:proven|established|confirmed)\b|\bpreuves?\b|\bproofs?\b/i;
const VERIFY_WORDS = /\b(confirmée?s?|constatée?s?|vérifiée?s?|confirmed|verified)\s+/gi;

export function customerVoice(s: string | null | undefined): string | null {
  if (!s?.trim()) return null;
  const sentences = s.trim().split(/(?<=[.!?])\s+/).filter((x) => !ANALYSIS.test(x));
  let t = sentences.join(" ").replace(LEAD, "").replace(LEAD_EN, "").replace(VERIFY_WORDS, "").replace(/\s{2,}/g, " ").trim();
  if (!t) return null;
  t = t.charAt(0).toUpperCase() + t.slice(1).replace(/([:—–]\s*)$/, "$1");
  return t;
}
