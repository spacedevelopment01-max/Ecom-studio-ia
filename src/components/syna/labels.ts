/**
 * Libellés FR / EN des primitives SYNA (lot 0). Aucun texte n'est écrit dans syna.css.
 */
import type { Lang } from "@/lib/i18n";

export const SYNA_STATES = ["proposal", "draft", "confirmed", "running", "verified", "failed", "unavailable"] as const;
export type SynaState = (typeof SYNA_STATES)[number];

const STATE_LABELS: Record<SynaState, [fr: string, en: string]> = {
  proposal: ["Proposition", "Proposal"],
  draft: ["Brouillon", "Draft"],
  confirmed: ["Confirmé", "Confirmed"],
  running: ["En cours", "In progress"],
  verified: ["Vérifié", "Verified"],
  failed: ["Échec", "Failed"],
  unavailable: ["Non disponible", "Unavailable"],
};

export function stateLabel(state: SynaState, lang: Lang = "fr"): string {
  const [fr, en] = STATE_LABELS[state];
  return lang === "en" ? en : fr;
}

const TEXT = {
  conversation: ["Conversation avec Syna", "Conversation with Syna"],
  workspace: ["Espace de travail", "Workspace"],
  openSyna: ["Ouvrir Syna", "Open Syna"],
  closeSyna: ["Replier Syna", "Collapse Syna"],
  askSyna: ["Demandez à Syna…", "Ask Syna…"],
  working: ["Syna travaille", "Syna is working"],
  clearSelection: ["Retirer la sélection", "Clear selection"],
  selection: ["Élément désigné", "Selected element"],
  budgetMonth: ["Budget IA du mois", "AI budget this month"],
  remaining: ["restant", "left"],
  quote: ["Devis", "Quote"],
  ofBudget: ["du budget IA du mois", "of this month's AI budget"],
  alreadyUsed: ["Déjà utilisé", "Already used"],
  thisAction: ["Cette création", "This creation"],
  leftAfter: ["Reste après", "Left after"],
  overBudget: ["Cette création dépasse le budget restant : rien ne sera lancé sans recharge ou sans réduire la demande.", "This creation exceeds the remaining budget: nothing will start without a top-up or a smaller request."],
  alternatives: ["Autres possibilités", "Other options"],
  message: ["Message à Syna", "Message to Syna"],
  send: ["Envoyer", "Send"],
  steps: ["Étapes", "Steps"],
  progress: ["Progression", "Progress"],
} as const satisfies Record<string, readonly [string, string]>;

export type SynaTextKey = keyof typeof TEXT;

export function synaText(key: SynaTextKey, lang: Lang = "fr"): string {
  const [fr, en] = TEXT[key];
  return lang === "en" ? en : fr;
}

/**
 * Pourcentage du budget IA du mois (jamais d'euros montrés au client). Français : espace fine insécable avant « % ».
 * En dessous de 1 % : « < 1 % ». `approx` ajoute « ≈ » (coût probable d'un devis).
 */
export function formatPct(value: number, lang: Lang = "fr", approx = false): string {
  const v = Math.max(0, Number.isFinite(value) ? value : 0);
  const n = v > 0 && v < 1 ? (lang === "en" ? "< 1" : "< 1") : String(Math.round(v));
  const body = lang === "en" ? `${n}%` : `${n} %`;
  return approx && !body.startsWith("<") ? `≈ ${body}` : body;
}
