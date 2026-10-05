/**
 * Comptabilité de l'administration : lecture et écriture en base (dépenses, charges récurrentes, réglages),
 * lignes automatiques (paiements Stripe, frais Stripe estimés, coûts IA mesurés) et rapport d'une période.
 */
import { all, id as newId, now, one, run, tx } from "./db";
import { getJsonSetting, getSetting, setJsonSetting, setSetting } from "./settings";
import { clientRows } from "./admin-stats";
import { EUR, monthlyPriceEur } from "./billing";
import { L, uiLang } from "./i18n-server";
import { readFile, removeFile } from "./storage";
import {
  addDays, breakEven, byCategory, compare, DEFAULT_CATEGORIES, fromTtc, generatedExpense, last12Months, monthlyEquivalent, monthlySeries,
  occurrences, parseYmd, pnl, previousRange, REVENUE_CATEGORIES, summarize, toPaySummary, ymd,
  type Category, type ChargeLike, type Entry, type Frequency, type Range,
} from "./accounting";

/** TVA française des abonnements et recharges (même hypothèse que admin-stats). */
const SALES_VAT = 2000;
/** Frais Stripe estimés (formule de admin-stats) : 1,5 % + 0,25 €, + 0,7 % Stripe Billing sur les abonnements. En centimes. */
export const stripeFeeCents = (cents: number, subscription: boolean) => Math.round(cents * (0.015 + (subscription ? 0.007 : 0)) + 25);

export type ExpenseRow = {
  id: string; date: string; label: string; category: string; supplier: string; amount_ht: number; vat_rate: number; vat: number; amount_ttc: number;
  payment_method: string; status: "paid" | "to_pay"; paid_at: string | null; notes: string; receipt_key: string | null; receipt_name: string | null; receipt_mime: string | null;
  recurring_id: string | null; period_key: string | null; created_at: number; updated_at: number; deleted_at: number | null;
};
export type RecurringRow = {
  id: string; label: string; category: string; supplier: string; amount_ht: number; vat_rate: number; frequency: Frequency; day: number; start_date: string;
  end_date: string | null; payment_method: string; auto_paid: number; active: number; created_at: number; updated_at: number;
};

export const today = () => ymd(new Date());

// ---------------------------------------------------------------- réglages et catégories

export type AccountingSettings = { countAiCosts: boolean; countStripeFees: boolean };
export function accountingSettings(): AccountingSettings {
  return { countAiCosts: getSetting("accounting.countAiCosts") !== "0", countStripeFees: getSetting("accounting.countStripeFees") !== "0" };
}
export function saveAccountingSettings(s: Partial<AccountingSettings>) {
  if (s.countAiCosts !== undefined) setSetting("accounting.countAiCosts", s.countAiCosts ? null : "0");
  if (s.countStripeFees !== undefined) setSetting("accounting.countStripeFees", s.countStripeFees ? null : "0");
}

type CategoryStore = { renamed?: Record<string, { fr: string; en: string }>; custom?: Category[] };
/** Catégories de dépenses : celles par défaut (renommables) puis les personnalisées. */
export function categories(): Category[] {
  const s = getJsonSetting<CategoryStore>("accounting.categories", {});
  return [...DEFAULT_CATEGORIES.map((c) => ({ ...c, ...(s.renamed?.[c.id] ?? {}) })), ...(s.custom ?? []).map((c) => ({ ...c, custom: true }))];
}
export function saveCategory(c: { id?: string; fr: string; en: string }) {
  const s = getJsonSetting<CategoryStore>("accounting.categories", {});
  if (c.id && DEFAULT_CATEGORIES.some((d) => d.id === c.id)) s.renamed = { ...(s.renamed ?? {}), [c.id]: { fr: c.fr, en: c.en } };
  else if (c.id && s.custom?.some((x) => x.id === c.id)) s.custom = s.custom.map((x) => (x.id === c.id ? { id: x.id, fr: c.fr, en: c.en } : x));
  else s.custom = [...(s.custom ?? []), { id: `c_${newId().slice(0, 8)}`, fr: c.fr, en: c.en }];
  setJsonSetting("accounting.categories", s);
}
/** Supprime une catégorie personnalisée (ses dépenses passent dans « Autres ») ou rétablit le nom d'une catégorie par défaut. */
export function deleteCategory(cid: string) {
  const s = getJsonSetting<CategoryStore>("accounting.categories", {});
  if (s.renamed?.[cid]) delete s.renamed[cid];
  if (s.custom?.some((x) => x.id === cid)) {
    s.custom = s.custom.filter((x) => x.id !== cid);
    run("UPDATE expenses SET category = 'other', updated_at = ? WHERE category = ?", now(), cid);
    run("UPDATE recurring_charges SET category = 'other', updated_at = ? WHERE category = ?", now(), cid);
  }
  setJsonSetting("accounting.categories", s);
}
export const isCategory = (cid: string) => categories().some((c) => c.id === cid);
export function categoryLabel(cid: string): string {
  const c = [...categories(), ...REVENUE_CATEGORIES].find((x) => x.id === cid);
  return c ? L(c.fr, c.en) : cid;
}

// ---------------------------------------------------------------- charges récurrentes

/** Crée les échéances manquantes (une seule par charge et par période, grâce à l'index unique). */
export function syncRecurring(day = today()) {
  const charges = all<RecurringRow>("SELECT * FROM recurring_charges WHERE active = 1");
  let created = 0;
  tx(() => {
    for (const c of charges) {
      for (const occ of occurrences(c as ChargeLike, day)) {
        const g = generatedExpense(c as ChargeLike, occ, day);
        const r = run(
          `INSERT OR IGNORE INTO expenses (id, date, label, category, supplier, amount_ht, vat_rate, vat, amount_ttc, payment_method, status, paid_at, notes, recurring_id, period_key, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          newId(), g.date, c.label, c.category, c.supplier, g.ht, c.vat_rate, g.vat, g.ttc, c.payment_method, g.status, g.paidAt, "", c.id, g.periodKey, now(), now(),
        );
        created += r.changes;
      }
    }
  });
  return created;
}

/** Échéances à venir encore à payer d'une charge : supprimées quand la charge est modifiée ou suspendue (les passées restent). */
export function dropFutureUnpaid(recurringId: string, day = today()) {
  run("DELETE FROM expenses WHERE recurring_id = ? AND date > ? AND status = 'to_pay' AND receipt_key IS NULL", recurringId, day);
}

// ---------------------------------------------------------------- écritures d'une période

const bounds = (r: Range) => ({ fromMs: parseYmd(r.from).getTime(), toMs: parseYmd(addDays(r.to, 1)).getTime() });
const minYmd = (...xs: string[]) => xs.sort()[0];

export function expenseToEntry(e: ExpenseRow): Entry {
  return {
    id: e.id,
    ref: `ACH-${e.date.slice(0, 7).replace("-", "")}-${e.id.slice(0, 8).toUpperCase()}`,
    date: e.date,
    kind: "expense",
    source: e.recurring_id ? "recurring" : "manual",
    auto: false,
    category: e.category,
    label: e.label,
    supplier: e.supplier,
    ht: e.amount_ht,
    vatRate: e.vat_rate,
    vat: e.vat,
    ttc: e.amount_ttc,
    status: e.status,
    paymentMethod: e.payment_method,
    receipt: e.receipt_key ? { name: e.receipt_name ?? "justificatif", mime: e.receipt_mime ?? "application/octet-stream" } : null,
    notes: e.notes,
    recurringId: e.recurring_id,
  };
}

const PROVIDERS: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI", google: "Google", fal: "fal.ai" };

/** Toutes les écritures d'une période : dépenses saisies + recettes Stripe + lignes automatiques (selon les réglages). */
export function entriesFor(r: Range, s: AccountingSettings = accountingSettings()): Entry[] {
  const { fromMs, toMs } = bounds(r);
  const out: Entry[] = all<ExpenseRow>("SELECT * FROM expenses WHERE deleted_at IS NULL AND date >= ? AND date <= ? ORDER BY date", r.from, r.to).map(expenseToEntry);

  // Recettes : paiements Stripe encaissés (TTC, TVA 20 %), remboursements éventuels.
  const pays = all<{ id: string; kind: string; amount_cents: number; status: string; stripe_id: string | null; created_at: number; email: string | null }>(
    "SELECT p.id, p.kind, p.amount_cents, p.status, p.stripe_id, p.created_at, u.email FROM payments p LEFT JOIN users u ON u.id = p.user_id WHERE p.status IN ('paid','refunded') AND p.created_at >= ? AND p.created_at < ?",
    fromMs, toMs,
  );
  const feesByMonth = new Map<string, number>();
  for (const p of pays) {
    const date = ymd(new Date(p.created_at));
    const sub = p.kind === "subscription";
    const a = fromTtc(p.amount_cents, SALES_VAT);
    const base = {
      kind: "revenue" as const, auto: true, supplier: p.email ?? L("compte supprimé", "deleted account"), vatRate: SALES_VAT, status: "paid" as const, paymentMethod: "carte", receipt: null,
    };
    out.push({ ...base, id: `pay_${p.id}`, ref: `VTE-${(p.stripe_id ?? p.id).slice(-8).toUpperCase()}`, date, source: "stripe", category: sub ? "rev_subscription" : "rev_topup", label: sub ? L("Abonnement (Stripe)", "Subscription (Stripe)") : L("Recharge de crédits (Stripe)", "Credit top-up (Stripe)"), ...a });
    if (p.status === "refunded") out.push({ ...base, id: `ref_${p.id}`, ref: `AVO-${(p.stripe_id ?? p.id).slice(-8).toUpperCase()}`, date, source: "refund", category: "rev_refund", label: L("Remboursement (Stripe)", "Refund (Stripe)"), ht: -a.ht, vat: -a.vat, ttc: -a.ttc });
    const m = date.slice(0, 7);
    feesByMonth.set(m, (feesByMonth.get(m) ?? 0) + stripeFeeCents(p.amount_cents, sub));
  }
  const monthEnd = (m: string) => minYmd(ymd(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)), r.to, today());

  if (s.countStripeFees) for (const [m, fee] of feesByMonth) {
    out.push({ id: `fee_${m}`, ref: `AUTO-STR-${m.replace("-", "")}`, date: monthEnd(m), kind: "expense", source: "stripe_fee", auto: true, estimated: true, category: "bank", label: L(`Frais Stripe estimés (${m})`, `Estimated Stripe fees (${m})`), supplier: "Stripe", ht: fee, vatRate: 0, vat: 0, ttc: fee, status: "paid", paymentMethod: "prelevement", receipt: null });
  }

  if (s.countAiCosts) {
    const usage = all<{ provider: string; created_at: number; cost: number }>("SELECT provider, created_at, cost FROM usage_events WHERE created_at >= ? AND created_at < ? AND cost > 0", fromMs, toMs);
    const agg = new Map<string, number>();
    for (const u of usage) {
      const k = `${ymd(new Date(u.created_at)).slice(0, 7)}|${u.provider}`;
      agg.set(k, (agg.get(k) ?? 0) + u.cost);
    }
    for (const [k, micro] of agg) {
      const [m, provider] = k.split("|");
      const cents = Math.round(micro / (EUR / 100));
      if (!cents) continue;
      const name = PROVIDERS[provider] ?? provider;
      out.push({ id: `ai_${m}_${provider}`, ref: `AUTO-IA-${m.replace("-", "")}-${provider.slice(0, 3).toUpperCase()}`, date: monthEnd(m), kind: "expense", source: "ai", auto: true, category: "ai", label: L(`Coûts IA mesurés — ${name} (${m})`, `Measured AI costs — ${name} (${m})`), supplier: name, ht: cents, vatRate: 0, vat: 0, ttc: cents, status: "paid", paymentMethod: "carte", receipt: null });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.ref.localeCompare(b.ref));
}

// ---------------------------------------------------------------- rapport

export function report(range: Range, day = today()) {
  syncRecurring(day);
  const settings = accountingSettings();
  const prevRange = previousRange(range);
  const entries = entriesFor(range, settings);
  const summary = summarize(entries);
  const prevSummary = summarize(entriesFor(prevRange, settings));
  const months = last12Months(range.to);
  const yearEntries = entriesFor({ from: `${months[0]}-01`, to: ymd(new Date(Number(months[11].slice(0, 4)), Number(months[11].slice(5, 7)), 0)) }, settings);

  const allOpen = all<{ date: string; status: string; amount_ttc: number }>("SELECT date, status, amount_ttc FROM expenses WHERE deleted_at IS NULL AND status = 'to_pay'");
  const toPay = toPaySummary(allOpen.map((e) => ({ ...e, ttc: e.amount_ttc })), day);
  const recurring = all<RecurringRow>("SELECT * FROM recurring_charges ORDER BY active DESC, label");
  const fixedMonthlyHt = recurring.filter((c) => c.active && (!c.end_date || c.end_date >= day)).reduce((s, c) => s + monthlyEquivalent(c), 0);

  // MRR et abonnés payants (mêmes règles que le tableau de bord).
  const clients = clientRows().filter((c) => c.role !== "admin");
  const paying = clients.filter((c) => c.monthlyEur > 0);
  const mrrTtc = Math.round(paying.reduce((s, c) => s + c.monthlyEur, 0) * 100);
  const mrrHt = fromTtc(mrrTtc, SALES_VAT).ht;
  const priceHt = paying.length ? Math.round(mrrHt / paying.length) : fromTtc(Math.round(monthlyPriceEur(1) * 100), SALES_VAT).ht;
  // Coût variable moyen par abonné et par mois : coûts IA + frais Stripe des 3 derniers mois complets ÷ 3 ÷ abonnés payants.
  const tm = last12Months(day);
  const last3 = { from: `${tm[8]}-01`, to: ymd(new Date(Number(tm[10].slice(0, 4)), Number(tm[10].slice(5, 7)), 0)) };
  const variable3 = entriesFor(last3, { countAiCosts: true, countStripeFees: true }).filter((e) => e.source === "ai" || e.source === "stripe_fee").reduce((s, e) => s + e.ht, 0);
  const variablePerSubHt = paying.length ? Math.round(variable3 / 3 / paying.length) : 0;
  const be = breakEven({ fixedMonthlyHt, priceHt, variablePerSubHt });

  const trash = all<ExpenseRow>("SELECT * FROM expenses WHERE deleted_at > 0 ORDER BY deleted_at DESC LIMIT 50");
  return {
    today: day,
    range,
    prevRange,
    settings,
    categories: categories(),
    revenueCategories: REVENUE_CATEGORIES,
    summary,
    prevSummary,
    changes: compare(summary, prevSummary),
    toPay,
    fixedMonthlyHt,
    mrr: { ttc: mrrTtc, ht: mrrHt, subscribers: paying.length },
    breakEven: { ...be, fixedMonthlyHt, priceHt, variablePerSubHt, subscribers: be.subscribers, current: paying.length, measuredVariable: paying.length > 0 },
    months: monthlySeries(yearEntries, months),
    byCategory: byCategory(entries),
    pnl: pnl(yearEntries, months),
    entries,
    recurring: recurring.map((c) => ({ ...c, monthlyHt: monthlyEquivalent(c) })),
    trash: trash.map((e) => ({ ...expenseToEntry(e), deletedAt: e.deleted_at })),
    lang: uiLang(),
  };
}

// ---------------------------------------------------------------- justificatifs

export function receiptOf(eid: string) {
  const e = one<ExpenseRow>("SELECT * FROM expenses WHERE id = ?", eid);
  if (!e?.receipt_key) return null;
  return { data: readFile(e.receipt_key), name: e.receipt_name ?? "justificatif", mime: e.receipt_mime ?? "application/octet-stream", expense: e };
}
export function clearReceipt(eid: string) {
  const e = one<ExpenseRow>("SELECT receipt_key FROM expenses WHERE id = ?", eid);
  if (e?.receipt_key) removeFile(e.receipt_key);
  run("UPDATE expenses SET receipt_key = NULL, receipt_name = NULL, receipt_mime = NULL, updated_at = ? WHERE id = ?", now(), eid);
}

/** Type réel du fichier d'après ses premiers octets (on ne se fie pas au type annoncé par le navigateur). */
export function sniffReceipt(b: Uint8Array): "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | null {
  const h = (i: number) => b[i];
  if (h(0) === 0x25 && h(1) === 0x50 && h(2) === 0x44 && h(3) === 0x46) return "application/pdf";
  if (h(0) === 0xff && h(1) === 0xd8 && h(2) === 0xff) return "image/jpeg";
  if (h(0) === 0x89 && h(1) === 0x50 && h(2) === 0x4e && h(3) === 0x47) return "image/png";
  if (h(0) === 0x52 && h(1) === 0x49 && h(2) === 0x46 && h(3) === 0x46 && h(8) === 0x57 && h(9) === 0x45 && h(10) === 0x42 && h(11) === 0x50) return "image/webp";
  return null;
}
export const RECEIPT_MAX = 10 * 1024 * 1024;
