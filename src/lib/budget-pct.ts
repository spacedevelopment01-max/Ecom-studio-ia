/**
 * Coûts d'IA montrés au client : jamais en euros, toujours en part du budget IA du mois de son compte (règle du
 * propriétaire, 16/10). La base est celle de la jauge « Reste … % » de l'en-tête (`aiPctBaseMicro`, billing.ts) :
 * l'IA du forfait du mois, puis les crédits achetés une fois le forfait épuisé. Module pur (client et serveur).
 */

/** Part d'un coût (micro-euros) dans le budget (micro-euros), en % ; null sans budget connu. */
export function pctOfBudget(micro: number, baseMicro: number | null | undefined): number | null {
  if (!baseMicro || baseMicro <= 0 || !Number.isFinite(micro)) return null;
  return Math.max(0, (micro / baseMicro) * 100);
}

/**
 * « 12 % », « 0,4 % », « < 0,1 % » (fr) ; « 12% », « 0.4% », « < 0.1% » (en). Une décimale sous 10 % (une image
 * pèse souvent moins de 1 % du budget du mois). Un coût non nul n'est jamais affiché « 0 % ».
 */
export function formatPct(pct: number, lang: "fr" | "en"): string {
  const sp = lang === "fr" ? "\u202f" : "";
  const dec = (n: number) => (lang === "fr" ? String(n).replace(".", ",") : String(n));
  if (pct > 0 && pct < 0.1) return `< ${dec(0.1)}${sp}%`;
  if (pct < 10) return `${dec(Math.round(pct * 10) / 10)}${sp}%`;
  return `${Math.round(pct)}${sp}%`;
}

/** « ≈ 3 % de votre budget IA », « < 0,1 % de votre budget IA » ; sans budget connu : « sur votre budget IA ». */
export function formatBudgetPct(pct: number | null, lang: "fr" | "en"): string {
  if (pct == null) return lang === "fr" ? "sur votre budget IA" : "from your AI budget";
  const v = formatPct(pct, lang);
  const approx = v.startsWith("<") ? "" : "≈ ";
  return lang === "fr" ? `${approx}${v} de votre budget IA` : `${approx}${v} of your AI budget`;
}

/** Forme courte (listes, badges) : « ≈ 3 % », « < 0,1 % » ; sans budget connu : « — ». */
export function formatPctShort(pct: number | null, lang: "fr" | "en"): string {
  if (pct == null) return "—";
  const v = formatPct(pct, lang);
  return v.startsWith("<") ? v : `≈ ${v}`;
}

/**
 * Plafond d'une tâche = coût probable × CAP_FACTOR : la place d'une reprise et des écarts de tarif. Ne se débite
 * jamais en lui-même (seul le coût réel l'est) et n'est jamais présenté comme le prix.
 */
export const CAP_FACTOR = 2.4;

/** Raccourci : coût (micro-euros) → texte en % du budget. */
export const budgetPctLabel = (micro: number, baseMicro: number | null | undefined, lang: "fr" | "en") => formatBudgetPct(pctOfBudget(micro, baseMicro), lang);

/** Plafond saisi par le client en % de son budget → micro-euros (serveur et client). */
export const pctToMicro = (pct: number, baseMicro: number | null | undefined) => (baseMicro && baseMicro > 0 ? Math.round((Math.max(0, pct) / 100) * baseMicro) : 0);
