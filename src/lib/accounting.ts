/**
 * Comptabilité de l'administration : calculs purs (sans base de données), testables.
 * Montants entiers en centimes, taux de TVA en points de base (2000 = 20 %), dates « AAAA-MM-JJ » (heure locale).
 * C'est une aide au suivi, pas une comptabilité certifiée.
 */
import type { Lang } from "./i18n";

// ---------------------------------------------------------------- référentiels

export const VAT_RATES = [2000, 1000, 550, 210, 0] as const;
export const PAYMENT_METHODS = ["carte", "virement", "prelevement", "especes", "autre"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_LABELS: Record<PaymentMethod, { fr: string; en: string }> = {
  carte: { fr: "Carte", en: "Card" },
  virement: { fr: "Virement", en: "Bank transfer" },
  prelevement: { fr: "Prélèvement", en: "Direct debit" },
  especes: { fr: "Espèces", en: "Cash" },
  autre: { fr: "Autre", en: "Other" },
};
export const FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
const FREQ_MONTHS: Record<Frequency, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export type Category = { id: string; fr: string; en: string; custom?: boolean };
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "hosting", fr: "Hébergement et serveurs", en: "Hosting and servers" },
  { id: "ai", fr: "Fournisseurs IA (API)", en: "AI providers (API)" },
  { id: "software", fr: "Logiciels et abonnements", en: "Software and subscriptions" },
  { id: "bank", fr: "Frais bancaires et de paiement", en: "Bank and payment fees" },
  { id: "marketing", fr: "Marketing et publicité", en: "Marketing and advertising" },
  { id: "freelance", fr: "Sous-traitance et freelances", en: "Subcontracting and freelancers" },
  { id: "fees", fr: "Honoraires (comptable, juridique)", en: "Professional fees (accounting, legal)" },
  { id: "hardware", fr: "Matériel informatique", en: "Computer equipment" },
  { id: "telecom", fr: "Téléphone et internet", en: "Phone and internet" },
  { id: "travel", fr: "Déplacements", en: "Travel" },
  { id: "training", fr: "Formation", en: "Training" },
  { id: "insurance", fr: "Assurances", en: "Insurance" },
  { id: "rent", fr: "Loyer et bureaux", en: "Rent and offices" },
  { id: "taxes", fr: "Impôts et taxes (CFE…)", en: "Taxes and duties (CFE…)" },
  { id: "social", fr: "Cotisations sociales (URSSAF)", en: "Social contributions (URSSAF)" },
  { id: "salary", fr: "Rémunération", en: "Pay" },
  { id: "other", fr: "Autres", en: "Other" },
];
/** Catégories des recettes (lignes automatiques issues de Stripe). */
export const REVENUE_CATEGORIES: Category[] = [
  { id: "rev_subscription", fr: "Abonnements", en: "Subscriptions" },
  { id: "rev_topup", fr: "Recharges", en: "Top-ups" },
  { id: "rev_refund", fr: "Remboursements", en: "Refunds" },
];

// ---------------------------------------------------------------- dates

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s: string) => new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
export const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parseYmd(s)) === s;
export const addDays = (s: string, n: number) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
const lastDay = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();
/** Premier et dernier jour du mois décalé de `n` mois. */
function monthBounds(y: number, m0: number, n = 0) {
  const d = new Date(y, m0 + n, 1);
  return { from: ymd(d), to: ymd(new Date(d.getFullYear(), d.getMonth(), lastDay(d.getFullYear(), d.getMonth()))) };
}
export const dayCount = (from: string, to: string) => Math.round((parseYmd(to).getTime() - parseYmd(from).getTime()) / 86400_000) + 1;
/** Mois « AAAA-MM » couverts par l'intervalle, dans l'ordre. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7));
  const ey = Number(to.slice(0, 4)), em = Number(to.slice(5, 7));
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${pad(m)}`);
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}
/** Les 12 mois qui se terminent au mois de `to`. */
export const last12Months = (to: string) => monthsBetween(monthBounds(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, -11).from, to);

// ---------------------------------------------------------------- TVA

export const vatOf = (ht: number, rate: number) => Math.round((ht * rate) / 10000);
/** Montants à partir du HT : la TVA est arrondie au centime, TTC = HT + TVA. */
export function fromHt(ht: number, rate: number) {
  const vat = vatOf(ht, rate);
  return { ht, vat, ttc: ht + vat };
}
/** Montants à partir du TTC : HT arrondi au centime, la TVA est le reste (HT + TVA = TTC, toujours). */
export function fromTtc(ttc: number, rate: number) {
  const ht = Math.round((ttc * 10000) / (10000 + rate));
  return { ht, vat: ttc - ht, ttc };
}

// ---------------------------------------------------------------- périodes

export const PRESETS = ["month", "prev_month", "quarter", "year", "prev_year", "last12", "custom"] as const;
export type Preset = (typeof PRESETS)[number];
export type Range = { from: string; to: string };

export function periodRange(preset: Preset, today: string, custom?: Partial<Range>): Range {
  const y = Number(today.slice(0, 4)), m0 = Number(today.slice(5, 7)) - 1;
  switch (preset) {
    case "month": return monthBounds(y, m0);
    case "prev_month": return monthBounds(y, m0, -1);
    case "quarter": { const q = Math.floor(m0 / 3) * 3; return { from: monthBounds(y, q).from, to: monthBounds(y, q + 2).to }; }
    case "year": return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "prev_year": return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case "last12": return { from: monthBounds(y, m0, -11).from, to: monthBounds(y, m0).to };
    case "custom": {
      const from = custom?.from && isYmd(custom.from) ? custom.from : monthBounds(y, m0).from;
      const to = custom?.to && isYmd(custom.to) ? custom.to : today;
      return from <= to ? { from, to } : { from: to, to: from };
    }
  }
}

/** Période précédente comparable : mois entiers → autant de mois juste avant ; sinon autant de jours juste avant. */
export function previousRange(r: Range): Range {
  const f = parseYmd(r.from), t = parseYmd(r.to);
  const wholeMonths = f.getDate() === 1 && t.getDate() === lastDay(t.getFullYear(), t.getMonth());
  if (wholeMonths) {
    const n = monthsBetween(r.from, r.to).length;
    return { from: monthBounds(f.getFullYear(), f.getMonth(), -n).from, to: monthBounds(f.getFullYear(), f.getMonth(), -1).to };
  }
  const days = dayCount(r.from, r.to);
  return { from: addDays(r.from, -days), to: addDays(r.from, -1) };
}

/** Variation en % (null si la base est nulle : pas de pourcentage honnête possible). */
export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

// ---------------------------------------------------------------- charges récurrentes

export type ChargeLike = { frequency: Frequency; day: number; start_date: string; end_date: string | null; amount_ht: number; vat_rate: number; auto_paid: number | boolean };
export type Occurrence = { date: string; periodKey: string };

/** Échéances d'une charge : toutes celles passées jusqu'à aujourd'hui, plus la prochaine à venir (dans la limite de la date de fin). */
export function occurrences(c: ChargeLike, today: string, max = 400): Occurrence[] {
  const step = FREQ_MONTHS[c.frequency];
  const day = Math.min(28, Math.max(1, c.day));
  const s = parseYmd(c.start_date);
  let y = s.getFullYear(), m0 = s.getMonth();
  if (s.getDate() > day) m0 += 1; // l'échéance du mois de départ est déjà passée
  const out: Occurrence[] = [];
  for (let k = 0; k < max; k++) {
    const d = new Date(y, m0 + k * step, day);
    const date = ymd(d);
    if (c.end_date && date > c.end_date) break;
    out.push({ date, periodKey: date.slice(0, 7) });
    if (date > today) break; // la prochaine à venir, puis on s'arrête
  }
  return out;
}

/** Les `n` prochaines échéances à partir d'aujourd'hui (aperçu dans le formulaire). */
export function nextOccurrences(c: ChargeLike, today: string, n = 4): Occurrence[] {
  const step = FREQ_MONTHS[c.frequency];
  const day = Math.min(28, Math.max(1, c.day));
  const s = parseYmd(c.start_date);
  const m0 = s.getMonth() + (s.getDate() > day ? 1 : 0);
  const out: Occurrence[] = [];
  for (let k = 0; k < 1200 && out.length < n; k++) {
    const date = ymd(new Date(s.getFullYear(), m0 + k * step, day));
    if (c.end_date && date > c.end_date) break;
    if (date >= today) out.push({ date, periodKey: date.slice(0, 7) });
  }
  return out;
}

/** Dépense générée pour une échéance : payée si l'échéance est passée et que la charge le prévoit, sinon à payer. */
export function generatedExpense(c: ChargeLike, occ: Occurrence, today: string) {
  const a = fromHt(c.amount_ht, c.vat_rate);
  const paid = !!c.auto_paid && occ.date <= today;
  return { ...a, date: occ.date, periodKey: occ.periodKey, status: paid ? ("paid" as const) : ("to_pay" as const), paidAt: paid ? occ.date : null };
}

/** Montant HT ramené au mois. */
export const monthlyEquivalent = (c: { amount_ht: number; frequency: Frequency }) => Math.round(c.amount_ht / FREQ_MONTHS[c.frequency]);

// ---------------------------------------------------------------- écritures

export type EntrySource = "manual" | "recurring" | "stripe" | "refund" | "stripe_fee" | "ai";
export type Entry = {
  id: string;
  ref: string; // numéro de pièce
  date: string;
  kind: "revenue" | "expense";
  source: EntrySource;
  auto: boolean;
  estimated?: boolean;
  category: string;
  label: string;
  supplier: string;
  ht: number; // signé pour les remboursements
  vatRate: number;
  vat: number;
  ttc: number;
  status: "paid" | "to_pay";
  paymentMethod: string;
  receipt: { name: string; mime: string } | null;
  notes?: string;
  recurringId?: string | null;
};

const sum = (xs: Entry[], f: (e: Entry) => number) => xs.reduce((s, e) => s + f(e), 0);

export type Summary = {
  revenueHt: number;
  cashInTtc: number;
  refundsTtc: number;
  expensesHt: number;
  expensesManualHt: number;
  expensesAutoHt: number;
  stripeFeesHt: number;
  aiCostsHt: number;
  result: number;
  marginPct: number | null;
  vatCollected: number;
  vatDeductible: number;
  vatBalance: number; // > 0 : à reverser ; < 0 : crédit de TVA
  cash: number;
  revenueCount: number;
  expenseCount: number;
};

export function summarize(entries: Entry[]): Summary {
  const rev = entries.filter((e) => e.kind === "revenue");
  const exp = entries.filter((e) => e.kind === "expense");
  const revenueHt = sum(rev, (e) => e.ht);
  const expensesHt = sum(exp, (e) => e.ht);
  const vatCollected = sum(rev, (e) => e.vat);
  const vatDeductible = sum(exp, (e) => e.vat);
  const result = revenueHt - expensesHt;
  return {
    revenueHt,
    cashInTtc: sum(rev, (e) => e.ttc),
    refundsTtc: -sum(rev.filter((e) => e.source === "refund"), (e) => e.ttc),
    expensesHt,
    expensesManualHt: sum(exp.filter((e) => !e.auto), (e) => e.ht),
    expensesAutoHt: sum(exp.filter((e) => e.auto), (e) => e.ht),
    stripeFeesHt: sum(exp.filter((e) => e.source === "stripe_fee"), (e) => e.ht),
    aiCostsHt: sum(exp.filter((e) => e.source === "ai"), (e) => e.ht),
    result,
    marginPct: revenueHt > 0 ? (result / revenueHt) * 100 : null,
    vatCollected,
    vatDeductible,
    vatBalance: vatCollected - vatDeductible,
    cash: sum(rev, (e) => e.ttc) - sum(exp.filter((e) => e.status === "paid"), (e) => e.ttc),
    revenueCount: rev.length,
    expenseCount: exp.length,
  };
}

/** Variation en % de chaque indicateur par rapport à la période précédente. */
export function compare(cur: Summary, prev: Summary): Partial<Record<keyof Summary, number | null>> {
  const out: Partial<Record<keyof Summary, number | null>> = {};
  for (const k of Object.keys(cur) as (keyof Summary)[]) {
    const a = cur[k], b = prev[k];
    if (typeof a === "number" && typeof b === "number") out[k] = pctChange(a, b);
  }
  return out;
}

/** Dépenses à payer (toutes périodes) : montant, nombre, et celles en retard. */
export function toPaySummary(expenses: { date: string; status: string; ttc: number }[], today: string) {
  const open = expenses.filter((e) => e.status === "to_pay");
  const late = open.filter((e) => e.date < today);
  return { ttc: open.reduce((s, e) => s + e.ttc, 0), count: open.length, lateTtc: late.reduce((s, e) => s + e.ttc, 0), lateCount: late.length };
}

export type MonthPoint = { month: string; revenueHt: number; expensesHt: number; result: number; cumulative: number };
export function monthlySeries(entries: Entry[], months: string[]): MonthPoint[] {
  let cumulative = 0;
  return months.map((month) => {
    const xs = entries.filter((e) => e.date.startsWith(month));
    const revenueHt = sum(xs.filter((e) => e.kind === "revenue"), (e) => e.ht);
    const expensesHt = sum(xs.filter((e) => e.kind === "expense"), (e) => e.ht);
    cumulative += revenueHt - expensesHt;
    return { month, revenueHt, expensesHt, result: revenueHt - expensesHt, cumulative };
  });
}

export function byCategory(entries: Entry[]): { category: string; ht: number; count: number }[] {
  const m = new Map<string, { ht: number; count: number }>();
  for (const e of entries) if (e.kind === "expense") {
    const x = m.get(e.category) ?? { ht: 0, count: 0 };
    x.ht += e.ht;
    x.count++;
    m.set(e.category, x);
  }
  return [...m].map(([category, x]) => ({ category, ...x })).sort((a, b) => b.ht - a.ht);
}

export type PnlRow = { category: string; values: number[]; total: number };
export type Pnl = { months: string[]; revenue: PnlRow[]; revenueTotal: number[]; expenses: PnlRow[]; expensesTotal: number[]; result: number[]; totals: { revenue: number; expenses: number; result: number } };

/** Compte de résultat HT : catégories × mois (+ total). */
export function pnl(entries: Entry[], months: string[]): Pnl {
  const rows = (kind: Entry["kind"]) => {
    const m = new Map<string, number[]>();
    for (const e of entries) {
      if (e.kind !== kind) continue;
      const i = months.indexOf(e.date.slice(0, 7));
      if (i < 0) continue;
      const v = m.get(e.category) ?? months.map(() => 0);
      v[i] += e.ht;
      m.set(e.category, v);
    }
    return [...m].map(([category, values]) => ({ category, values, total: values.reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total);
  };
  const revenue = rows("revenue");
  const expenses = rows("expense");
  const col = (rs: PnlRow[]) => months.map((_, i) => rs.reduce((s, r) => s + r.values[i], 0));
  const revenueTotal = col(revenue), expensesTotal = col(expenses);
  const result = months.map((_, i) => revenueTotal[i] - expensesTotal[i]);
  const tot = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return { months, revenue, revenueTotal, expenses, expensesTotal, result, totals: { revenue: tot(revenueTotal), expenses: tot(expensesTotal), result: tot(result) } };
}

// ---------------------------------------------------------------- seuil de rentabilité

/**
 * Nombre d'abonnés nécessaires pour couvrir les charges fixes mensuelles :
 *   N = ⌈ charges fixes HT par mois ÷ (prix moyen HT d'un abonné − coût variable moyen HT par abonné) ⌉
 * `null` si la marge par abonné est nulle ou négative (seuil impossible à atteindre).
 */
export function breakEven(p: { fixedMonthlyHt: number; priceHt: number; variablePerSubHt: number }) {
  const marginPerSub = p.priceHt - p.variablePerSubHt;
  if (marginPerSub <= 0) return { subscribers: null, marginPerSub };
  return { subscribers: p.fixedMonthlyHt <= 0 ? 0 : Math.ceil(p.fixedMonthlyHt / marginPerSub), marginPerSub };
}

// ---------------------------------------------------------------- export CSV

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[";\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** Montant en centimes → texte (virgule décimale en français, point en anglais), sans séparateur de milliers. */
export const csvAmount = (cents: number, lang: Lang) => {
  const s = (cents / 100).toFixed(2);
  return lang === "en" ? s : s.replace(".", ",");
};
const csvRate = (bp: number, lang: Lang) => {
  const s = String(bp / 100);
  return lang === "en" ? s : s.replace(".", ",");
};

/** Journal pour le comptable : « ; » et virgule décimale en français, « , » et point en anglais ; BOM pour Excel. */
export function journalCsv(entries: Entry[], lang: Lang, catLabel: (id: string) => string, receiptName: (e: Entry) => string = (e) => e.receipt?.name ?? ""): string {
  const sep = lang === "en" ? "," : ";";
  const head = lang === "en"
    ? ["Date", "Document", "Description", "Category", "Supplier / customer", "Excl. VAT", "VAT rate (%)", "VAT", "Incl. VAT", "Status", "Payment method", "Receipt"]
    : ["Date", "Pièce", "Libellé", "Catégorie", "Fournisseur / client", "HT", "Taux TVA (%)", "TVA", "TTC", "Statut", "Mode de paiement", "Justificatif"];
  const status = (e: Entry) => (e.kind === "revenue" ? (lang === "en" ? "Collected" : "Encaissée") : e.status === "paid" ? (lang === "en" ? "Paid" : "Payée") : (lang === "en" ? "To pay" : "À payer"));
  const method = (m: string) => (PAYMENT_LABELS as Record<string, { fr: string; en: string }>)[m]?.[lang] ?? m;
  const lines = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref))
    .map((e) => [e.date, e.ref, e.label + (e.estimated ? (lang === "en" ? " (estimated)" : " (estimé)") : ""), catLabel(e.category), e.supplier, csvAmount(e.ht, lang), csvRate(e.vatRate, lang), csvAmount(e.vat, lang), csvAmount(e.ttc, lang), status(e), method(e.paymentMethod), receiptName(e)].map(csvCell).join(sep));
  return "﻿" + [head.map(csvCell).join(sep), ...lines].join("\r\n");
}

/** Nom de fichier sûr pour l'archive des justificatifs. */
export const safeFileName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "fichier";
