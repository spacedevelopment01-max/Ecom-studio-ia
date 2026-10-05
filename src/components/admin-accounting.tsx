"use client";
/**
 * Administration › Comptabilité : indicateurs de la période (et variation), graphiques, compte de résultat,
 * journal des écritures, dépenses et charges récurrentes, exports pour le comptable.
 * Aide au suivi — pas une comptabilité certifiée.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, Check, ChevronLeft, ChevronRight, Copy, Download, FileArchive, Info, Minus, Paperclip,
  Pause, Pencil, Play, Plus, RotateCcw, Search, Settings2, Tags, Trash2, X,
} from "lucide-react";
import { api, Badge, Button, Card, cx, Field, Input, Modal, Select, Textarea, Toggle, useApi, useToast } from "./ui";
import { useLang, useT } from "./i18n";
import { intlLocale, type Lang } from "@/lib/i18n";
import {
  FREQUENCIES, fromHt, fromTtc, nextOccurrences, PAYMENT_LABELS, PAYMENT_METHODS, PRESETS, VAT_RATES,
  type Category, type Entry, type Frequency, type MonthPoint, type Preset,
} from "@/lib/accounting";
import type { report } from "@/lib/accounting-store";

type Report = ReturnType<typeof report>;
type Recurring = Report["recurring"][number];
type TFn = (fr: string, en: string) => string;

// ---------------------------------------------------------------- formats

const money = (lang: Lang, cents: number, digits = 2) => (cents / 100).toLocaleString(intlLocale(lang), { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits });
const compactMoney = (lang: Lang, cents: number) => (cents / 100).toLocaleString(intlLocale(lang), { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });
const pct = (lang: Lang, v: number, digits = 0) => (v / 100).toLocaleString(intlLocale(lang), { style: "percent", maximumFractionDigits: digits, minimumFractionDigits: 0 });
const vatRateTxt = (lang: Lang, bp: number) => (bp / 10000).toLocaleString(intlLocale(lang), { style: "percent", maximumFractionDigits: 1 });
const dateTxt = (lang: Lang, ymd: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10) || "1")).toLocaleDateString(intlLocale(lang), opts);
const monthTxt = (lang: Lang, ym: string, long = false) => dateTxt(lang, `${ym}-01`, long ? { month: "long", year: "numeric" } : { month: "short" });
/** « 1 234,56 », « 1234.56 », « 12 € » → centimes (null si illisible). */
export function parseCents(s: string): number | null {
  const t = s.replace(/[\s  €]/g, "").replace(/,(?=\d{1,2}$)/, ".").replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
const centsInput = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const PRESET_LABELS: Record<Preset, [string, string]> = {
  month: ["Ce mois-ci", "This month"],
  prev_month: ["Mois précédent", "Previous month"],
  quarter: ["Ce trimestre", "This quarter"],
  year: ["Cette année", "This year"],
  prev_year: ["Année précédente", "Previous year"],
  last12: ["12 derniers mois", "Last 12 months"],
  custom: ["Dates personnalisées", "Custom dates"],
};
const FREQ_LABELS: Record<Frequency, [string, string]> = { monthly: ["Mensuelle", "Monthly"], quarterly: ["Trimestrielle", "Quarterly"], yearly: ["Annuelle", "Yearly"] };

/** Couleurs des graphiques : palette catégorielle validée (clair et sombre, daltonisme), texte en encres neutres. */
const VIZ_CSS = `
.acc-viz{--s-rev:#2a78d6;--s-exp:#eb6834;--s-res:#1baf7a;--s-wash:rgba(27,175,122,.10)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .acc-viz{--s-rev:#3987e5;--s-exp:#d95926;--s-res:#199e70;--s-wash:rgba(25,158,112,.14)}}
:root[data-theme="dark"] .acc-viz{--s-rev:#3987e5;--s-exp:#d95926;--s-res:#199e70;--s-wash:rgba(25,158,112,.14)}
`;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Échelle « ronde » incluant zéro. */
function niceScale(lo: number, hi: number, count = 4) {
  lo = Math.min(0, lo);
  hi = Math.max(0, hi);
  if (lo === hi) hi = lo + 10000;
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? 10 * mag;
  const min = Math.floor(lo / step) * step, max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v));
  return { min, max, ticks };
}

/** Barre verticale : extrémité de donnée arrondie (4 px), base carrée. */
function barPath(x: number, base: number, end: number, w: number) {
  const h = Math.abs(base - end);
  if (h < 0.5) return "";
  const r = Math.min(4, w / 2, h);
  if (end <= base) return `M${x},${base}V${end + r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end + r}V${base}Z`;
  return `M${x},${base}V${end - r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end - r}V${base}Z`;
}

// ---------------------------------------------------------------- vue principale

export function AccountingView() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const qs = `preset=${preset}${preset === "custom" ? `&from=${custom.from}&to=${custom.to}` : ""}&l=${lang}`;
  const { data, reload, loading } = useApi<Report>(`/api/admin/accounting?${qs}`);
  const [expenseForm, setExpenseForm] = useState<{ entry?: Entry; duplicate?: boolean } | null>(null);
  const [recurringForm, setRecurringForm] = useState<{ charge?: Recurring } | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [undo, setUndo] = useState<{ id: string; label: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (data && preset === "custom" && !custom.from) setCustom(data.range);
  }, [data, preset, custom.from]);

  const catLabel = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of [...(data?.categories ?? []), ...(data?.revenueCategories ?? [])]) m.set(c.id, c);
    return (id: string) => {
      const c = m.get(id);
      return c ? t(c.fr, c.en) : id;
    };
  }, [data, t]);

  const act = async (fn: () => Promise<unknown>, msg?: string) => {
    try {
      await fn();
      if (msg) toast("ok", msg);
      reload();
      return true;
    } catch (e) {
      toast("bad", (e as Error).message);
      return false;
    }
  };
  const remove = async (e: Entry) => {
    if (await act(() => api(`/api/admin/accounting/expenses/${e.id}`, { method: "DELETE" }))) {
      clearTimeout(undoTimer.current);
      setUndo({ id: e.id, label: e.label });
      undoTimer.current = setTimeout(() => setUndo(null), 10000);
    }
  };
  const restore = async (id: string) => {
    setUndo(null);
    await act(() => api(`/api/admin/accounting/expenses/${id}`, { method: "PATCH", body: { restore: true } }), t("Dépense restaurée.", "Expense restored."));
  };
  const markPaid = (e: Entry) => act(() => api(`/api/admin/accounting/expenses/${e.id}`, { method: "PATCH", body: { status: "paid" } }), t("Marquée payée.", "Marked as paid."));

  const exportUrl = (format: "csv" | "zip") => `/api/admin/accounting/export?format=${format}&${qs}`;

  return (
    <div className="acc-viz grid grid-cols-[minmax(0,1fr)] gap-5">
      <style>{VIZ_CSS}</style>

      {/* Filtres (période) et actions : une seule rangée au-dessus de tout ce qu'ils filtrent. */}
      <Card className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold sm:text-2xl">{t("Comptabilité", "Accounting")}</h2>
            {data && (
              <p className="text-sm text-muted">
                {dateTxt(lang, data.range.from)} – {dateTxt(lang, data.range.to)}
                <span className="hidden sm:inline"> · {t("comparé à", "compared with")} {dateTxt(lang, data.prevRange.from)} – {dateTxt(lang, data.prevRange.to)}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setExpenseForm({})}>{t("Ajouter une dépense", "Add an expense")}</Button>
            <Button size="sm" variant="secondary" icon={<CalendarClock className="size-4" />} onClick={() => setRecurringForm({})}>{t("Charge récurrente", "Recurring charge")}</Button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid min-w-[12rem] flex-1 gap-1 sm:flex-none">
            <label htmlFor="acc-period" className="text-xs font-medium text-ink-2">{t("Période", "Period")}</label>
            <Select id="acc-period" value={preset} onChange={(e) => setPreset(e.target.value as Preset)} className="h-10 text-sm">
              {PRESETS.map((p) => <option key={p} value={p}>{t(...PRESET_LABELS[p])}</option>)}
            </Select>
          </div>
          {preset === "custom" && (
            <>
              <div className="grid gap-1">
                <label htmlFor="acc-from" className="text-xs font-medium text-ink-2">{t("Du", "From")}</label>
                <Input id="acc-from" type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="h-10 w-[10.5rem] text-sm" />
              </div>
              <div className="grid gap-1">
                <label htmlFor="acc-to" className="text-xs font-medium text-ink-2">{t("Au", "To")}</label>
                <Input id="acc-to" type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="h-10 w-[10.5rem] text-sm" />
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <a href={exportUrl("csv")} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium hover:border-ink"><Download className="size-4" />{t("CSV pour le comptable", "CSV for the accountant")}</a>
            <a href={exportUrl("zip")} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium hover:border-ink"><FileArchive className="size-4" />{t("Justificatifs (ZIP)", "Receipts (ZIP)")}</a>
          </div>
        </div>
      </Card>

      {!data ? <div className="skeleton h-96 rounded-3xl" /> : (
        <div className={cx("grid grid-cols-[minmax(0,1fr)] gap-5 transition-opacity", loading && "opacity-60")}>
          <Kpis d={data} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card className="min-w-0 p-4 sm:p-5">
              <h3 className="font-display text-lg font-semibold">{t("Recettes et dépenses par mois", "Revenue and expenses by month")}</h3>
              <p className="text-xs text-muted">{t("12 mois jusqu'à la fin de la période, montants HT. La courbe montre le résultat du mois.", "12 months up to the end of the period, excl. VAT. The line shows the month's result.")}</p>
              <MonthsChart data={data.months} />
            </Card>
            <Card className="min-w-0 p-4 sm:p-5">
              <h3 className="font-display text-lg font-semibold">{t("Dépenses par catégorie", "Expenses by category")}</h3>
              <p className="text-xs text-muted">{t("Sur la période, HT (saisies et automatiques).", "Over the period, excl. VAT (entered and automatic).")}</p>
              <CategoryBars rows={data.byCategory} total={data.summary.expensesHt} catLabel={catLabel} />
            </Card>
          </div>
          <Card className="min-w-0 p-4 sm:p-5">
            <h3 className="font-display text-lg font-semibold">{t("Résultat cumulé", "Cumulative result")}</h3>
            <p className="text-xs text-muted">{t("Somme des résultats mensuels HT sur les 12 mois affichés.", "Running total of monthly results excl. VAT over the 12 months shown.")}</p>
            <CumulativeChart data={data.months} />
          </Card>
          <PnlTable d={data} catLabel={catLabel} />
          <Journal d={data} catLabel={catLabel} onEdit={(e) => setExpenseForm({ entry: e })} onDuplicate={(e) => setExpenseForm({ entry: e, duplicate: true })} onPaid={markPaid} onDelete={remove} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
            <RecurringList d={data} catLabel={catLabel} onEdit={(c) => setRecurringForm({ charge: c })} onToggle={(c) => act(() => api(`/api/admin/accounting/recurring/${c.id}`, { method: "PATCH", body: { active: !c.active } }), c.active ? t("Charge suspendue.", "Charge paused.") : t("Charge réactivée.", "Charge resumed."))} />
            <SettingsCard d={data} onCategories={() => setCatsOpen(true)} onToggle={(k, v) => act(() => api("/api/admin/accounting", { body: { settings: { [k]: v } } }), t("Réglage enregistré.", "Setting saved."))} />
          </div>
          <TrashCard d={data} catLabel={catLabel} onRestore={restore} onPurge={(e) => confirm(t("Supprimer définitivement cette dépense et son justificatif ?", "Permanently delete this expense and its receipt?")) && act(() => api(`/api/admin/accounting/expenses/${e.id}?purge=1`, { method: "DELETE" }), t("Supprimée définitivement.", "Permanently deleted."))} />
          <p className="flex gap-2 text-xs text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />{t("Ce tableau est une aide au suivi, pas une comptabilité certifiée : faites valider vos déclarations (TVA, résultat) par votre expert-comptable. Les recettes viennent des paiements Stripe encaissés (TVA 20 % supposée) ; les frais Stripe sont estimés ; les coûts IA sont mesurés appel par appel.", "This dashboard is a tracking aid, not certified accounting: have your returns (VAT, profit) checked by your accountant. Revenue comes from collected Stripe payments (20% VAT assumed); Stripe fees are estimated; AI costs are measured call by call.")}</p>
        </div>
      )}

      {expenseForm && data && <ExpenseModal init={expenseForm} d={data} onClose={() => setExpenseForm(null)} onSaved={() => { setExpenseForm(null); reload(); }} />}
      {recurringForm && data && <RecurringModal charge={recurringForm.charge} d={data} onClose={() => setRecurringForm(null)} onSaved={() => { setRecurringForm(null); reload(); }} onDeleted={() => { setRecurringForm(null); reload(); }} />}
      {catsOpen && data && <CategoriesModal d={data} onClose={() => setCatsOpen(false)} reload={reload} />}
      {undo && (
        <div className="fixed inset-x-0 bottom-20 z-[95] flex justify-center px-4" role="status">
          <div className="flex max-w-lg items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-paper shadow-soft">
            <Trash2 className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{t("Mise à la corbeille :", "Moved to trash:")} {undo.label}</span>
            <button className="shrink-0 font-semibold underline" onClick={() => restore(undo.id)}>{t("Annuler", "Undo")}</button>
            <button className="shrink-0" aria-label={t("Fermer", "Close")} onClick={() => setUndo(null)}><X className="size-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- indicateurs

function Delta({ v, good = "up" }: { v: number | null | undefined; good?: "up" | "down" }) {
  const t = useT();
  const { lang } = useLang();
  if (v === null || v === undefined || !Number.isFinite(v)) return <span className="text-xs text-muted">{t("pas de comparaison", "no comparison")}</span>;
  const flat = Math.abs(v) < 0.5;
  const positive = good === "up" ? v > 0 : v < 0;
  const Icon = flat ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cx("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", flat ? "text-muted" : positive ? "text-ok" : "text-bad")} title={t("par rapport à la période précédente", "vs previous period")}>
      <Icon className="size-3.5" aria-hidden />
      {v > 0 ? "+" : ""}{pct(lang, v)}
      <span className="sr-only">{t(" par rapport à la période précédente", " vs previous period")}</span>
    </span>
  );
}

function Kpi({ label, value, delta, hint, tone, children }: { label: string; value: string; delta?: ReactNode; hint?: ReactNode; tone?: "bad" | "ok"; children?: ReactNode }) {
  return (
    <Card className="flex min-w-0 flex-col gap-1 p-3.5 sm:p-4">
      <p className="text-xs leading-snug text-muted">{label}</p>
      <p className={cx("font-display text-lg font-semibold leading-tight tabular-nums break-words sm:text-2xl", tone === "bad" && "text-bad", tone === "ok" && "text-ok")}>{value}</p>
      {delta}
      {hint && <div className="text-xs leading-snug text-muted">{hint}</div>}
      {children}
    </Card>
  );
}

function Kpis({ d }: { d: Report }) {
  const t = useT();
  const { lang } = useLang();
  const s = d.summary, c = d.changes;
  const m = (x: number) => money(lang, x);
  const be = d.breakEven;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Kpi label={t("Chiffre d'affaires HT", "Revenue excl. VAT")} value={m(s.revenueHt)} delta={<Delta v={c.revenueHt} />} hint={t(`${s.revenueCount} encaissement${s.revenueCount > 1 ? "s" : ""}`, `${s.revenueCount} payment${s.revenueCount > 1 ? "s" : ""}`)} />
      <Kpi label={t("Encaissé TTC", "Collected incl. VAT")} value={m(s.cashInTtc)} delta={<Delta v={c.cashInTtc} />} hint={s.refundsTtc ? t(`dont ${m(s.refundsTtc)} remboursés`, `incl. ${m(s.refundsTtc)} refunded`) : undefined} />
      <Kpi label={t("Dépenses HT", "Expenses excl. VAT")} value={m(s.expensesHt)} delta={<Delta v={c.expensesHt} good="down" />} hint={t(`${m(s.expensesManualHt)} saisies · ${m(s.expensesAutoHt)} auto`, `${m(s.expensesManualHt)} entered · ${m(s.expensesAutoHt)} auto`)} />
      <Kpi label={t("Résultat (CA HT − dépenses HT)", "Result (revenue − expenses, excl. VAT)")} value={m(s.result)} tone={s.result < 0 ? "bad" : undefined} delta={<Delta v={c.result} />} hint={s.marginPct === null ? t("marge : sans chiffre d'affaires", "margin: no revenue") : t(`marge ${pct(lang, s.marginPct, 1)}`, `margin ${pct(lang, s.marginPct, 1)}`)} />
      <Kpi label={t("TVA collectée", "VAT collected")} value={m(s.vatCollected)} delta={<Delta v={c.vatCollected} />} />
      <Kpi label={t("TVA déductible", "Deductible VAT")} value={m(s.vatDeductible)} delta={<Delta v={c.vatDeductible} />} hint={t("sur les dépenses saisies", "on entered expenses")} />
      <Kpi label={s.vatBalance >= 0 ? t("TVA à reverser", "VAT to pay") : t("Crédit de TVA", "VAT credit")} value={m(Math.abs(s.vatBalance))} hint={t("collectée − déductible (indicatif)", "collected − deductible (indicative)")} />
      <Kpi label={t("Trésorerie de la période", "Cash flow for the period")} value={m(s.cash)} tone={s.cash < 0 ? "bad" : undefined} delta={<Delta v={c.cash} />} hint={t("encaissé TTC − dépenses payées TTC", "collected − paid expenses, incl. VAT")} />
      <Kpi label={t("Dépenses à payer", "Expenses to pay")} value={m(d.toPay.ttc)} hint={
        <>
          {t(`${d.toPay.count} dépense${d.toPay.count > 1 ? "s" : ""} (toutes périodes)`, `${d.toPay.count} expense${d.toPay.count > 1 ? "s" : ""} (all periods)`)}
          {d.toPay.lateCount > 0 && <span className="mt-0.5 flex items-center gap-1 font-medium text-bad"><AlertTriangle className="size-3.5 shrink-0" />{t(`${d.toPay.lateCount} en retard · ${m(d.toPay.lateTtc)}`, `${d.toPay.lateCount} overdue · ${m(d.toPay.lateTtc)}`)}</span>}
        </>
      } />
      <Kpi label={t("Charges fixes mensuelles", "Fixed monthly charges")} value={m(d.fixedMonthlyHt)} hint={t("charges récurrentes actives, ramenées au mois, HT", "active recurring charges, per month, excl. VAT")} />
      <Kpi label={t("Revenu mensuel récurrent", "Monthly recurring revenue")} value={m(d.mrr.ht)} hint={t(`HT · ${m(d.mrr.ttc)} TTC · ${d.mrr.subscribers} abonné${d.mrr.subscribers > 1 ? "s" : ""}`, `excl. VAT · ${m(d.mrr.ttc)} incl. VAT · ${d.mrr.subscribers} subscriber${d.mrr.subscribers > 1 ? "s" : ""}`)} />
      <Kpi label={t("Seuil de rentabilité", "Break-even point")} value={be.subscribers === null ? t("non atteignable", "not reachable") : t(`${be.subscribers} abonné${be.subscribers > 1 ? "s" : ""}`, `${be.subscribers} subscriber${be.subscribers > 1 ? "s" : ""}`)} tone={be.subscribers !== null && be.current >= be.subscribers ? "ok" : undefined} hint={t(`aujourd'hui : ${be.current}`, `today: ${be.current}`)}>
        <details className="text-xs text-muted">
          <summary className="cursor-pointer select-none text-ink-2 underline decoration-dotted">{t("Formule", "Formula")}</summary>
          <p className="mt-1 leading-snug">{t("charges fixes ÷ (prix moyen HT − coût variable moyen par abonné)", "fixed charges ÷ (average price excl. VAT − average variable cost per subscriber)")}</p>
          <p className="mt-1 tabular-nums leading-snug">{m(be.fixedMonthlyHt)} ÷ ({m(be.priceHt)} − {m(be.variablePerSubHt)})</p>
          <p className="mt-1 leading-snug">{be.measuredVariable ? t("Coût variable : coûts IA + frais Stripe estimés des 3 derniers mois complets, par abonné payant et par mois.", "Variable cost: AI costs + estimated Stripe fees over the last 3 full months, per paying subscriber per month.") : t("Aucun abonné payant : coût variable non mesuré (compté 0), prix de base utilisé.", "No paying subscriber: variable cost not measured (counted as 0), base price used.")}</p>
        </details>
      </Kpi>
    </div>
  );
}

// ---------------------------------------------------------------- graphiques

function Legend({ items }: { items: { label: string; color: string; kind: "bar" | "line" }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          {i.kind === "bar" ? <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} /> : <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({ x, w, title, rows }: { x: number; w: number; title: string; rows: { label: string; value: string; color?: string }[] }) {
  const width = 236;
  const left = Math.max(0, Math.min(w - width, x - width / 2));
  return (
    <div className="pointer-events-none absolute top-0 z-10 rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-soft" style={{ left, width }} role="status">
      <p className="mb-1 font-medium capitalize text-muted">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-2">{r.color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.color }} />}<span className="truncate">{r.label}</span></span>
          <strong className="shrink-0 tabular-nums text-ink">{r.value}</strong>
        </p>
      ))}
    </div>
  );
}

function MonthsChart({ data }: { data: MonthPoint[] }) {
  const t = useT();
  const { lang } = useLang();
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 260, top = 28, bottom = 26;
  const { min, max, ticks } = niceScale(Math.min(...data.flatMap((d) => [d.revenueHt, d.expensesHt, d.result])), Math.max(...data.flatMap((d) => [d.revenueHt, d.expensesHt, d.result])));
  const axisW = Math.max(...ticks.map((v) => compactMoney(lang, v).length)) * 6.2 + 8;
  const left = axisW, right = 8;
  const pw = Math.max(10, w - left - right), ph = H - top - bottom;
  const y = (v: number) => top + ((max - v) / (max - min)) * ph;
  const band = pw / data.length;
  const bw = Math.max(2, Math.min(24, (band - 8) / 2 - 1));
  const cx0 = (i: number) => left + i * band + band / 2;
  const every = band < 30 ? 3 : band < 44 ? 2 : 1;
  const labels = { rev: t("Recettes HT", "Revenue excl. VAT"), exp: t("Dépenses HT", "Expenses excl. VAT"), res: t("Résultat", "Result") };
  const last = data.length - 1;
  return (
    <div>
      <Legend items={[{ label: labels.rev, color: "var(--s-rev)", kind: "bar" }, { label: labels.exp, color: "var(--s-exp)", kind: "bar" }, { label: labels.res, color: "var(--s-res)", kind: "line" }]} />
      <div ref={ref} className="relative mt-2 w-full" onPointerLeave={() => setHover(null)}>
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label={t("Recettes, dépenses et résultat par mois (le détail est dans le compte de résultat)", "Revenue, expenses and result by month (details in the income statement)")}>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={left} x2={w - right} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--muted)" : "var(--line)"} strokeOpacity={v === 0 ? 0.6 : 1} strokeWidth={1} />
                <text x={left - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular-nums">{compactMoney(lang, v)}</text>
              </g>
            ))}
            {hover !== null && <rect x={left + hover * band} y={top} width={band} height={ph} fill="var(--paper-2)" opacity={0.8} />}
            {data.map((d, i) => (
              <g key={d.month}>
                <path d={barPath(cx0(i) - bw - 1, y(0), y(d.revenueHt), bw)} fill="var(--s-rev)" />
                <path d={barPath(cx0(i) + 1, y(0), y(d.expensesHt), bw)} fill="var(--s-exp)" />
                {i % every === (last % every) && <text x={cx0(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">{monthTxt(lang, d.month)}</text>}
              </g>
            ))}
            <polyline points={data.map((d, i) => `${cx0(i)},${y(d.result)}`).join(" ")} fill="none" stroke="var(--s-res)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (hover === i || i === last) && <circle key={d.month} cx={cx0(i)} cy={y(d.result)} r={4.5} fill="var(--s-res)" stroke="var(--card)" strokeWidth={2} />)}
            {hover === null && (
              <text x={Math.min(cx0(last), w - right)} y={Math.max(12, y(data[last].result) - 10)} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--ink)" stroke="var(--card)" strokeWidth={3} paintOrder="stroke" className="tabular-nums">{money(lang, data[last].result, 0)}</text>
            )}
            {data.map((d, i) => (
              <rect key={d.month} x={left + i * band} y={0} width={band} height={H} fill="transparent" tabIndex={0} aria-label={`${monthTxt(lang, d.month, true)} : ${labels.rev} ${money(lang, d.revenueHt)}, ${labels.exp} ${money(lang, d.expensesHt)}, ${labels.res} ${money(lang, d.result)}`}
                onPointerEnter={() => setHover(i)} onPointerMove={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} className="outline-none" />
            ))}
          </svg>
        )}
        {hover !== null && w > 0 && (
          <Tooltip x={cx0(hover)} w={w} title={monthTxt(lang, data[hover].month, true)} rows={[
            { label: labels.rev, value: money(lang, data[hover].revenueHt), color: "var(--s-rev)" },
            { label: labels.exp, value: money(lang, data[hover].expensesHt), color: "var(--s-exp)" },
            { label: labels.res, value: money(lang, data[hover].result), color: "var(--s-res)" },
          ]} />
        )}
      </div>
    </div>
  );
}

function CumulativeChart({ data }: { data: MonthPoint[] }) {
  const t = useT();
  const { lang } = useLang();
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 200, top = 22, bottom = 26;
  const { min, max, ticks } = niceScale(Math.min(...data.map((d) => d.cumulative)), Math.max(...data.map((d) => d.cumulative)), 3);
  const left = Math.max(...ticks.map((v) => compactMoney(lang, v).length)) * 6.2 + 8, right = 12;
  const pw = Math.max(10, w - left - right), ph = H - top - bottom;
  const x = (i: number) => left + (data.length > 1 ? (i / (data.length - 1)) * pw : pw / 2);
  const y = (v: number) => top + ((max - v) / (max - min)) * ph;
  const pts = data.map((d, i) => `${x(i)},${y(d.cumulative)}`);
  const last = data.length - 1;
  const every = pw / data.length < 30 ? 3 : pw / data.length < 44 ? 2 : 1;
  const pick = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.round(((clientX - r.left - left) / pw) * (data.length - 1));
    setHover(Math.max(0, Math.min(last, i)));
  };
  return (
    <div ref={ref} className="relative mt-3 w-full touch-pan-y" onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label={t("Résultat cumulé sur 12 mois", "Cumulative result over 12 months")} tabIndex={0}
          onKeyDown={(e) => { if (e.key === "ArrowRight") setHover((h) => Math.min(last, (h ?? -1) + 1)); if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? last + 1) - 1)); }} onBlur={() => setHover(null)} className="outline-none">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={left} x2={w - right} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--muted)" : "var(--line)"} strokeOpacity={v === 0 ? 0.6 : 1} />
              <text x={left - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)">{compactMoney(lang, v)}</text>
            </g>
          ))}
          <path d={`M${x(0)},${y(0)}L${pts.join("L")}L${x(last)},${y(0)}Z`} fill="var(--s-wash)" />
          <polyline points={pts.join(" ")} fill="none" stroke="var(--s-res)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, i) => i % every === (last % every) && <text key={d.month} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} fontSize={11} fill="var(--muted)">{monthTxt(lang, d.month)}</text>)}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={top} y2={top + ph} stroke="var(--muted)" strokeWidth={1} />}
          <circle cx={x(hover ?? last)} cy={y(data[hover ?? last].cumulative)} r={4.5} fill="var(--s-res)" stroke="var(--card)" strokeWidth={2} />
          {hover === null && <text x={x(last)} y={Math.max(12, y(data[last].cumulative) - 10)} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--ink)" stroke="var(--card)" strokeWidth={3} paintOrder="stroke">{money(lang, data[last].cumulative, 0)}</text>}
        </svg>
      )}
      {hover !== null && w > 0 && (
        <Tooltip x={x(hover)} w={w} title={monthTxt(lang, data[hover].month, true)} rows={[
          { label: t("Résultat cumulé", "Cumulative result"), value: money(lang, data[hover].cumulative), color: "var(--s-res)" },
          { label: t("Résultat du mois", "Month's result"), value: money(lang, data[hover].result) },
        ]} />
      )}
    </div>
  );
}

function CategoryBars({ rows, total, catLabel }: { rows: Report["byCategory"]; total: number; catLabel: (id: string) => string }) {
  const t = useT();
  const { lang } = useLang();
  const [hover, setHover] = useState<string | null>(null);
  if (!rows.length) return <p className="mt-6 text-sm text-muted">{t("Aucune dépense sur la période.", "No expenses over the period.")}</p>;
  const maxV = Math.max(...rows.map((r) => r.ht), 1);
  return (
    <ul className="mt-4 grid gap-2.5">
      {rows.map((r) => {
        const share = total ? (r.ht / total) * 100 : 0;
        return (
          <li key={r.category} className="grid gap-1" tabIndex={0} onPointerEnter={() => setHover(r.category)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(r.category)} onBlur={() => setHover(null)}
            title={t(`${r.count} écriture${r.count > 1 ? "s" : ""} · ${pct(lang, share, 1)} des dépenses`, `${r.count} entr${r.count > 1 ? "ies" : "y"} · ${pct(lang, share, 1)} of expenses`)}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-ink-2">{catLabel(r.category)}</span>
              <span className="shrink-0 tabular-nums"><strong className="font-semibold">{money(lang, r.ht)}</strong> <span className="text-xs text-muted">{pct(lang, share)}</span></span>
            </div>
            <div className="h-2.5 w-full">
              <div className="h-full rounded-r-[4px] transition-opacity" style={{ width: `${Math.max(0.8, (Math.max(0, r.ht) / maxV) * 100)}%`, background: "var(--s-exp)", opacity: hover && hover !== r.category ? 0.45 : 1 }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- compte de résultat

function PnlTable({ d, catLabel }: { d: Report; catLabel: (id: string) => string }) {
  const t = useT();
  const { lang } = useLang();
  const p = d.pnl;
  const [col, setCol] = useState<number>(-1); // téléphone : -1 = total
  const m0 = (v: number) => (v ? money(lang, v, 0) : "–");
  const val = (vals: number[], total: number) => (col < 0 ? total : vals[col]);
  const Row = ({ label, values, total, strong, tone }: { label: string; values: number[]; total: number; strong?: boolean; tone?: boolean }) => (
    <tr className={cx(strong && "font-semibold", strong && "border-t border-line")}>
      <th scope="row" className={cx("sticky left-0 z-[1] max-w-[12rem] truncate bg-card py-1.5 pr-2 text-left font-normal", strong && "font-semibold")} title={label}>{label}</th>
      {values.map((v, i) => <td key={i} className={cx("whitespace-nowrap px-1.5 py-1.5 text-right tabular-nums", tone && v < 0 && "text-bad")}>{m0(v)}</td>)}
      <td className={cx("whitespace-nowrap bg-paper-2/60 px-2 py-1.5 text-right font-semibold tabular-nums", tone && total < 0 && "text-bad")}>{m0(total)}</td>
    </tr>
  );
  const Line = ({ label, values, total, strong, tone }: { label: string; values: number[]; total: number; strong?: boolean; tone?: boolean }) => {
    const v = val(values, total);
    return <div className={cx("flex justify-between gap-3 py-1.5", strong && "border-t border-line font-semibold")}><span className="min-w-0">{label}</span><span className={cx("shrink-0 tabular-nums", tone && v < 0 && "text-bad")}>{m0(v)}</span></div>;
  };
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-semibold">{t("Compte de résultat par mois", "Income statement by month")}</h3>
          <p className="text-xs text-muted">{t("HT, arrondi à l'euro ; le détail exact est dans le journal.", "Excl. VAT, rounded to the euro; exact figures are in the ledger.")}</p>
        </div>
        <Select aria-label={t("Mois affiché", "Month shown")} value={col} onChange={(e) => setCol(Number(e.target.value))} className="h-10 w-auto text-sm md:hidden">
          <option value={-1}>{t("Total 12 mois", "12-month total")}</option>
          {p.months.map((mo, i) => <option key={mo} value={i}>{monthTxt(lang, mo, true)}</option>)}
        </Select>
      </div>
      {/* Téléphone : une colonne à la fois. */}
      <div className="mt-3 grid text-sm md:hidden">
        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("Recettes", "Revenue")}</p>
        {p.revenue.map((r) => <Line key={r.category} label={catLabel(r.category)} values={r.values} total={r.total} />)}
        <Line label={t("Total recettes", "Total revenue")} values={p.revenueTotal} total={p.totals.revenue} strong />
        <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-muted">{t("Dépenses", "Expenses")}</p>
        {p.expenses.map((r) => <Line key={r.category} label={catLabel(r.category)} values={r.values} total={r.total} />)}
        <Line label={t("Total dépenses", "Total expenses")} values={p.expensesTotal} total={p.totals.expenses} strong />
        <Line label={t("Résultat", "Result")} values={p.result} total={p.totals.result} strong tone />
      </div>
      <div className="mt-3 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[52rem] text-[13px]">
          <thead className="text-xs text-muted">
            <tr>
              <th className="sticky left-0 z-[1] bg-card py-1.5 pr-3 text-left font-medium">{t("Catégorie", "Category")}</th>
              {p.months.map((mo) => <th key={mo} className="whitespace-nowrap px-1.5 py-1.5 text-right font-medium capitalize">{dateTxt(lang, `${mo}-01`, { month: "short", year: "2-digit" })}</th>)}
              <th className="bg-paper-2/60 px-2 py-1.5 text-right font-semibold">{t("Total", "Total")}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={14} className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("Recettes", "Revenue")}</td></tr>
            {p.revenue.map((r) => <Row key={r.category} label={catLabel(r.category)} values={r.values} total={r.total} />)}
            <Row label={t("Total recettes", "Total revenue")} values={p.revenueTotal} total={p.totals.revenue} strong />
            <tr><td colSpan={14} className="pt-4 text-xs font-semibold uppercase tracking-wide text-muted">{t("Dépenses", "Expenses")}</td></tr>
            {p.expenses.map((r) => <Row key={r.category} label={catLabel(r.category)} values={r.values} total={r.total} />)}
            <Row label={t("Total dépenses", "Total expenses")} values={p.expensesTotal} total={p.totals.expenses} strong />
            <Row label={t("Résultat", "Result")} values={p.result} total={p.totals.result} strong tone />
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- journal

type SortKey = "date" | "label" | "category" | "supplier" | "ht" | "vat" | "ttc" | "status";
const PAGE = 20;

function StatusBadge({ e, today }: { e: Entry; today: string }) {
  const t = useT();
  if (e.kind === "revenue") return <Badge tone="info">{e.source === "refund" ? t("Remboursé", "Refunded") : t("Encaissée", "Collected")}</Badge>;
  if (e.status === "paid") return <Badge tone="ok">{t("Payée", "Paid")}</Badge>;
  if (e.date < today) return <Badge tone="bad"><AlertTriangle className="size-3" aria-hidden />{t("En retard", "Overdue")}</Badge>;
  return <Badge tone="warn">{t("À payer", "To pay")}</Badge>;
}

function AutoBadges({ e }: { e: Entry }) {
  const t = useT();
  return (
    <>
      {e.auto && <Badge className="!px-1.5 !py-0 text-[10px] uppercase tracking-wide">{t("auto", "auto")}</Badge>}
      {e.estimated && <Badge tone="warn" className="!px-1.5 !py-0 text-[10px]">{t("estimé", "estimated")}</Badge>}
      {e.source === "recurring" && <span title={t("Charge récurrente", "Recurring charge")}><CalendarClock className="size-3.5 text-muted" aria-label={t("Charge récurrente", "Recurring charge")} /></span>}
    </>
  );
}

function Journal({ d, catLabel, onEdit, onDuplicate, onPaid, onDelete }: { d: Report; catLabel: (id: string) => string; onEdit: (e: Entry) => void; onDuplicate: (e: Entry) => void; onPaid: (e: Entry) => void; onDelete: (e: Entry) => void }) {
  const t = useT();
  const { lang } = useLang();
  const [type, setType] = useState<"all" | "revenue" | "expense" | "manual" | "auto">("all");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState<"" | "paid" | "to_pay" | "late">("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [type, cat, status, q, d]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const xs = d.entries.filter((e) => {
      if (type === "revenue" && e.kind !== "revenue") return false;
      if (type === "expense" && e.kind !== "expense") return false;
      if (type === "manual" && e.auto) return false;
      if (type === "auto" && !e.auto) return false;
      if (cat && e.category !== cat) return false;
      if (status === "paid" && e.status !== "paid") return false;
      if (status === "to_pay" && e.status !== "to_pay") return false;
      if (status === "late" && !(e.status === "to_pay" && e.date < d.today)) return false;
      if (needle && ![e.label, e.supplier, e.ref, catLabel(e.category), e.notes ?? ""].some((s) => s.toLowerCase().includes(needle))) return false;
      return true;
    });
    const val = (e: Entry): string | number => (sort.key === "category" ? catLabel(e.category) : sort.key === "status" ? (e.kind === "revenue" ? "a" : e.status) : (e[sort.key] as string | number));
    return xs.sort((a, b) => {
      const va = val(a), vb = val(b);
      return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), intlLocale(lang))) * sort.dir || b.date.localeCompare(a.date);
    });
  }, [d, type, cat, status, q, sort, catLabel, lang]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const totals = rows.reduce((s, e) => ({ ht: s.ht + (e.kind === "revenue" ? e.ht : -e.ht), n: s.n + 1 }), { ht: 0, n: 0 });
  const usedCats = useMemo(() => [...new Set(d.entries.map((e) => e.category))], [d.entries]);
  const m = (v: number) => money(lang, v);
  const sign = (e: Entry, v: number) => (e.kind === "expense" ? m(-v) : m(v));

  const Th = ({ k, children, right }: { k: SortKey; children: ReactNode; right?: boolean }) => (
    <th className={cx("px-2 py-2 font-medium", right ? "text-right" : "text-left")} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className={cx("inline-flex items-center gap-1 hover:text-ink", sort.key === k && "text-ink")} onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : k === "date" || k === "ht" || k === "ttc" || k === "vat" ? -1 : 1 }))}>
        {children}{sort.key === k && <span aria-hidden>{sort.dir === 1 ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
  const Actions = ({ e }: { e: Entry }) =>
    e.auto ? <span className="text-xs text-muted">{t("calculée", "computed")}</span> : (
      <div className="flex items-center justify-end gap-0.5">
        {e.status === "to_pay" && <IconBtn label={t("Marquer payée", "Mark as paid")} onClick={() => onPaid(e)}><Check className="size-4" /></IconBtn>}
        <IconBtn label={t("Modifier", "Edit")} onClick={() => onEdit(e)}><Pencil className="size-4" /></IconBtn>
        <IconBtn label={t("Dupliquer", "Duplicate")} onClick={() => onDuplicate(e)}><Copy className="size-4" /></IconBtn>
        <IconBtn label={t("Supprimer", "Delete")} onClick={() => onDelete(e)} danger><Trash2 className="size-4" /></IconBtn>
      </div>
    );
  const Receipt = ({ e }: { e: Entry }) => (e.receipt ? (
    <a href={`/api/admin/accounting/expenses/${e.id}/receipt`} target="_blank" rel="noreferrer" className="inline-grid size-8 place-items-center rounded-full text-ink-2 hover:bg-paper-2" title={e.receipt.name} aria-label={t(`Ouvrir le justificatif ${e.receipt.name}`, `Open receipt ${e.receipt.name}`)}><Paperclip className="size-4" /></a>
  ) : e.auto || e.kind === "revenue" ? null : <span className="text-xs text-muted" title={t("Aucun justificatif", "No receipt")}>—</span>);

  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-semibold">{t("Journal des écritures", "Ledger")}</h3>
          <p className="text-xs text-muted">{t(`${totals.n} écriture${totals.n > 1 ? "s" : ""} · solde HT ${m(totals.ht)}`, `${totals.n} entr${totals.n > 1 ? "ies" : "y"} · net excl. VAT ${m(totals.ht)}`)}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher…", "Search…")} aria-label={t("Rechercher dans le journal", "Search the ledger")} className="h-10 pl-9 text-sm" />
        </div>
        <Select aria-label={t("Type", "Type")} value={type} onChange={(e) => setType(e.target.value as typeof type)} className="h-10 text-sm sm:w-auto">
          <option value="all">{t("Toutes les écritures", "All entries")}</option>
          <option value="revenue">{t("Recettes", "Revenue")}</option>
          <option value="expense">{t("Dépenses", "Expenses")}</option>
          <option value="manual">{t("Saisies", "Entered")}</option>
          <option value="auto">{t("Automatiques", "Automatic")}</option>
        </Select>
        <Select aria-label={t("Statut", "Status")} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-10 text-sm sm:w-auto">
          <option value="">{t("Tous les statuts", "All statuses")}</option>
          <option value="paid">{t("Payées / encaissées", "Paid / collected")}</option>
          <option value="to_pay">{t("À payer", "To pay")}</option>
          <option value="late">{t("En retard", "Overdue")}</option>
        </Select>
        <Select aria-label={t("Catégorie", "Category")} value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 text-sm sm:w-auto sm:max-w-[16rem]">
          <option value="">{t("Toutes les catégories", "All categories")}</option>
          {usedCats.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
        </Select>
      </div>

      {!rows.length ? <p className="mt-6 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">{t("Aucune écriture pour ces critères.", "No entries match these filters.")}</p> : (
        <>
          {/* Grand écran : tableau. */}
          <div className="mt-3 hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <Th k="date">{t("Date", "Date")}</Th>
                  <Th k="label">{t("Libellé · fournisseur", "Description · supplier")}</Th>
                  <Th k="category">{t("Catégorie", "Category")}</Th>
                  <Th k="ht" right>{t("HT", "Excl. VAT")}</Th>
                  <Th k="vat" right>{t("TVA", "VAT")}</Th>
                  <Th k="ttc" right>{t("TTC", "Incl. VAT")}</Th>
                  <Th k="status">{t("Statut", "Status")}</Th>
                  <th className="px-1 py-2 font-medium"><span className="sr-only">{t("Justificatif", "Receipt")}</span><Paperclip className="mx-auto size-3.5" aria-hidden /></th>
                  <th className="px-2 py-2 text-right font-medium">{t("Actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((e) => (
                  <tr key={e.id} className="align-middle hover:bg-paper-2/50">
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{dateTxt(lang, e.date, { day: "2-digit", month: "2-digit", year: "2-digit" })}</td>
                    <td className="max-w-[17rem] px-2 py-2">
                      <span className="flex items-center gap-1.5"><span className="truncate" title={e.label}>{e.label}</span><AutoBadges e={e} /></span>
                      <span className="block truncate text-[11px] text-muted" title={e.supplier}>{e.supplier ? `${e.supplier} · ` : ""}{e.ref}</span>
                    </td>
                    <td className="max-w-[10rem] truncate px-2 py-2 text-ink-2" title={catLabel(e.category)}>{catLabel(e.category)}</td>
                    <td className={cx("whitespace-nowrap px-2 py-2 text-right tabular-nums", e.kind === "revenue" && e.ht >= 0 && "text-ok")}>{sign(e, e.ht)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink-2">{m(e.vat)}<span className="block text-[11px] text-muted">{vatRateTxt(lang, e.vatRate)}</span></td>
                    <td className="whitespace-nowrap px-2 py-2 text-right font-medium tabular-nums">{m(e.ttc)}</td>
                    <td className="px-2 py-2"><StatusBadge e={e} today={d.today} /></td>
                    <td className="px-1 py-2 text-center"><Receipt e={e} /></td>
                    <td className="px-2 py-2"><Actions e={e} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Téléphone et tablette : cartes. */}
          <ul className="mt-3 grid gap-2 lg:hidden">
            {shown.map((e) => (
              <li key={e.id} className="rounded-2xl border border-line p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium"><span className="min-w-0 break-words">{e.label}</span><AutoBadges e={e} /></p>
                    <p className="text-xs text-muted">{dateTxt(lang, e.date)} · {catLabel(e.category)}{e.supplier ? ` · ${e.supplier}` : ""}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cx("font-semibold tabular-nums", e.kind === "revenue" && e.ht >= 0 && "text-ok")}>{sign(e, e.ttc)}</p>
                    <p className="text-[11px] text-muted tabular-nums">{t("HT", "excl.")} {m(e.ht)} · {t("TVA", "VAT")} {m(e.vat)}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1"><StatusBadge e={e} today={d.today} /><Receipt e={e} /></div>
                  <Actions e={e} />
                </div>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2 text-sm">
              <span className="text-muted tabular-nums">{page * PAGE + 1}–{Math.min(rows.length, (page + 1) * PAGE)} / {rows.length}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label={t("Page précédente", "Previous page")} icon={<ChevronLeft className="size-4" />} />
                <span className="grid place-items-center px-2 tabular-nums">{page + 1} / {pages}</span>
                <Button size="sm" variant="secondary" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label={t("Page suivante", "Next page")} icon={<ChevronRight className="size-4" />} />
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean }) {
  return <button type="button" onClick={onClick} title={label} aria-label={label} className={cx("grid size-8 place-items-center rounded-full", danger ? "text-bad hover:bg-bad-soft" : "text-ink-2 hover:bg-paper-2")}>{children}</button>;
}

// ---------------------------------------------------------------- charges récurrentes, réglages, corbeille

function RecurringList({ d, catLabel, onEdit, onToggle }: { d: Report; catLabel: (id: string) => string; onEdit: (c: Recurring) => void; onToggle: (c: Recurring) => void }) {
  const t = useT();
  const { lang } = useLang();
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <h3 className="font-display text-lg font-semibold">{t("Charges récurrentes", "Recurring charges")}</h3>
      <p className="text-xs text-muted">{t("Les échéances sont ajoutées automatiquement au journal, une fois par période.", "Instalments are added to the ledger automatically, once per period.")}</p>
      {!d.recurring.length ? <p className="mt-4 text-sm text-muted">{t("Aucune charge récurrente. Ajoutez votre hébergement, vos logiciels, votre assurance…", "No recurring charges. Add your hosting, software, insurance…")}</p> : (
        <ul className="mt-3 divide-y divide-line">
          {d.recurring.map((c) => {
            const next = nextOccurrences({ ...c, frequency: c.frequency }, d.today, 1)[0];
            return (
              <li key={c.id} className={cx("flex items-center justify-between gap-3 py-2.5", !c.active && "opacity-60")}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted">{catLabel(c.category)} · {t(...FREQ_LABELS[c.frequency])}{c.active && next ? ` · ${t("prochaine", "next")} ${dateTxt(lang, next.date, { day: "numeric", month: "short" })}` : !c.active ? ` · ${t("suspendue", "paused")}` : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{money(lang, c.amount_ht)}</p>
                    <p className="text-[11px] text-muted tabular-nums">{t(`${money(lang, c.monthlyHt)}/mois`, `${money(lang, c.monthlyHt)}/mo`)}</p>
                  </div>
                  <IconBtn label={c.active ? t("Suspendre", "Pause") : t("Réactiver", "Resume")} onClick={() => onToggle(c)}>{c.active ? <Pause className="size-4" /> : <Play className="size-4" />}</IconBtn>
                  <IconBtn label={t("Modifier", "Edit")} onClick={() => onEdit(c)}><Pencil className="size-4" /></IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function SettingsCard({ d, onToggle, onCategories }: { d: Report; onToggle: (k: "countAiCosts" | "countStripeFees", v: boolean) => void; onCategories: () => void }) {
  const t = useT();
  return (
    <Card className="grid min-w-0 content-start gap-3 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><Settings2 className="size-4" />{t("Lignes automatiques", "Automatic lines")}</h3>
      <p className="text-xs text-muted">{t("Désactivez une ligne si vous saisissez vous-même la facture correspondante, pour ne pas la compter deux fois.", "Turn a line off if you enter the matching invoice yourself, so it isn't counted twice.")}</p>
      <Toggle checked={d.settings.countAiCosts} onChange={(v) => onToggle("countAiCosts", v)} label={t("Compter les coûts IA mesurés (par fournisseur)", "Count measured AI costs (per provider)")} />
      <Toggle checked={d.settings.countStripeFees} onChange={(v) => onToggle("countStripeFees", v)} label={t("Compter les frais Stripe estimés", "Count estimated Stripe fees")} />
      <p className="text-xs text-muted">{t("Les recettes Stripe sont toujours comptées (abonnements, recharges, remboursements).", "Stripe revenue is always counted (subscriptions, top-ups, refunds).")}</p>
      <div><Button size="sm" variant="secondary" icon={<Tags className="size-4" />} onClick={onCategories}>{t("Gérer les catégories", "Manage categories")}</Button></div>
    </Card>
  );
}

function TrashCard({ d, catLabel, onRestore, onPurge }: { d: Report; catLabel: (id: string) => string; onRestore: (id: string) => void; onPurge: (e: Entry) => void }) {
  const t = useT();
  const { lang } = useLang();
  if (!d.trash.length) return null;
  return (
    <details className="rounded-3xl border border-line bg-card p-4 sm:p-5">
      <summary className="cursor-pointer select-none font-display text-lg font-semibold">{t(`Corbeille (${d.trash.length})`, `Trash (${d.trash.length})`)}</summary>
      <ul className="mt-3 divide-y divide-line">
        {d.trash.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0"><p className="truncate text-sm">{e.label}</p><p className="text-xs text-muted">{dateTxt(lang, e.date)} · {catLabel(e.category)} · {money(lang, e.ttc)}</p></div>
            <div className="flex shrink-0 gap-1">
              <IconBtn label={t("Restaurer", "Restore")} onClick={() => onRestore(e.id)}><RotateCcw className="size-4" /></IconBtn>
              <IconBtn label={t("Supprimer définitivement", "Delete permanently")} onClick={() => onPurge(e)} danger><Trash2 className="size-4" /></IconBtn>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

// ---------------------------------------------------------------- formulaires

function CategorySelect({ d, value, onChange, id }: { d: Report; value: string; onChange: (v: string) => void; id?: string }) {
  const t = useT();
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {d.categories.map((c) => <option key={c.id} value={c.id}>{t(c.fr, c.en)}</option>)}
    </Select>
  );
}

function AmountFields({ basis, setBasis, amount, setAmount, rate, setRate, idp }: { basis: "ht" | "ttc"; setBasis: (b: "ht" | "ttc") => void; amount: string; setAmount: (s: string) => void; rate: number; setRate: (r: number) => void; idp: string }) {
  const t = useT();
  const { lang } = useLang();
  const c = parseCents(amount);
  const a = c === null ? null : basis === "ht" ? fromHt(c, rate) : fromTtc(c, rate);
  return (
    <div className="grid gap-3 rounded-2xl bg-paper-2 p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
        <Field label={basis === "ttc" ? t("Montant TTC (€)", "Amount incl. VAT (€)") : t("Montant HT (€)", "Amount excl. VAT (€)")} htmlFor={`${idp}-amount`} error={amount && c === null ? t("Montant illisible", "Unreadable amount") : null}>
          <Input id={`${idp}-amount`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required />
        </Field>
        <div className="flex h-11 rounded-2xl border border-line bg-card p-1 text-sm" role="group" aria-label={t("Saisir le montant", "Enter the amount")}>
          {(["ttc", "ht"] as const).map((b) => (
            <button key={b} type="button" onClick={() => { if (a) setAmount(centsInput(b === "ht" ? a.ht : a.ttc)); setBasis(b); }} aria-pressed={basis === b} className={cx("rounded-xl px-3", basis === b ? "bg-ink text-paper" : "text-ink-2")}>{b === "ttc" ? t("TTC", "Incl.") : t("HT", "Excl.")}</button>
          ))}
        </div>
      </div>
      <Field label={t("Taux de TVA", "VAT rate")} htmlFor={`${idp}-rate`}>
        <Select id={`${idp}-rate`} value={rate} onChange={(e) => setRate(Number(e.target.value))}>
          {VAT_RATES.map((r) => <option key={r} value={r}>{vatRateTxt(lang, r)}{r === 0 ? t(" (pas de TVA, ou fournisseur étranger)", " (no VAT, or foreign supplier)") : ""}</option>)}
        </Select>
      </Field>
      <p className="grid grid-cols-3 gap-2 text-center text-xs text-muted">
        <span>{t("HT", "Excl. VAT")}<strong className="block text-sm text-ink tabular-nums">{a ? money(lang, a.ht) : "–"}</strong></span>
        <span>{t("TVA", "VAT")}<strong className="block text-sm text-ink tabular-nums">{a ? money(lang, a.vat) : "–"}</strong></span>
        <span>{t("TTC", "Incl. VAT")}<strong className="block text-sm text-ink tabular-nums">{a ? money(lang, a.ttc) : "–"}</strong></span>
      </p>
    </div>
  );
}

function ExpenseModal({ init, d, onClose, onSaved }: { init: { entry?: Entry; duplicate?: boolean }; d: Report; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const e = init.entry;
  const editing = !!e && !init.duplicate;
  const [f, setF] = useState({
    date: e && editing ? e.date : todayYmd(),
    label: e?.label ?? "",
    category: e?.category ?? "hosting",
    supplier: e?.supplier ?? "",
    paymentMethod: (e?.paymentMethod ?? "carte") as (typeof PAYMENT_METHODS)[number],
    status: (e?.status ?? "paid") as "paid" | "to_pay",
    notes: e?.notes ?? "",
  });
  const [basis, setBasis] = useState<"ht" | "ttc">("ttc");
  const [amount, setAmount] = useState(e ? centsInput(e.ttc) : "");
  const [rate, setRate] = useState(e?.vatRate ?? 2000);
  const [file, setFile] = useState<File | null>(null);
  const [dropReceipt, setDropReceipt] = useState(false);
  const [busy, setBusy] = useState(false);
  const suppliers = useMemo(() => [...new Set(d.entries.filter((x) => x.kind === "expense" && x.supplier).map((x) => x.supplier))].slice(0, 50), [d.entries]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const cents = parseCents(amount);
    if (cents === null) return toast("bad", t("Indiquez un montant valide.", "Enter a valid amount."));
    if (file && file.size > 10 * 1024 * 1024) return toast("bad", t("Le justificatif dépasse 10 Mo.", "The receipt exceeds 10 MB."));
    setBusy(true);
    try {
      const payload = { ...f, basis, amount: cents, vatRate: rate };
      const id = editing ? e!.id : (await api<{ id: string }>("/api/admin/accounting/expenses", { body: payload })).id;
      if (editing) await api(`/api/admin/accounting/expenses/${id}`, { method: "PATCH", body: payload });
      if (dropReceipt && !file) await api(`/api/admin/accounting/expenses/${id}/receipt`, { method: "DELETE" });
      if (file) {
        const form = new FormData();
        form.append("file", file);
        await api(`/api/admin/accounting/expenses/${id}/receipt`, { form });
      }
      toast("ok", editing ? t("Dépense modifiée.", "Expense updated.") : t("Dépense ajoutée.", "Expense added."));
      onSaved();
    } catch (err) {
      toast("bad", (err as Error).message);
    }
    setBusy(false);
  };

  return (
    <Modal open onClose={onClose} title={editing ? t("Modifier la dépense", "Edit expense") : init.duplicate ? t("Dupliquer la dépense", "Duplicate expense") : t("Ajouter une dépense", "Add an expense")}>
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Date", "Date")} htmlFor="ex-date"><Input id="ex-date" type="date" value={f.date} onChange={(x) => set("date", x.target.value)} required /></Field>
          <Field label={t("Catégorie", "Category")} htmlFor="ex-cat"><CategorySelect id="ex-cat" d={d} value={f.category} onChange={(v) => set("category", v)} /></Field>
        </div>
        <Field label={t("Libellé", "Description")} htmlFor="ex-label"><Input id="ex-label" value={f.label} onChange={(x) => set("label", x.target.value)} placeholder={t("ex. Serveur OVH – octobre", "e.g. OVH server – October")} required maxLength={200} /></Field>
        <Field label={t("Fournisseur", "Supplier")} htmlFor="ex-sup">
          <Input id="ex-sup" list="ex-sup-list" value={f.supplier} onChange={(x) => set("supplier", x.target.value)} maxLength={120} />
          <datalist id="ex-sup-list">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <AmountFields idp="ex" basis={basis} setBasis={setBasis} amount={amount} setAmount={setAmount} rate={rate} setRate={setRate} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Mode de paiement", "Payment method")} htmlFor="ex-pm">
            <Select id="ex-pm" value={f.paymentMethod} onChange={(x) => set("paymentMethod", x.target.value as typeof f.paymentMethod)}>
              {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{t(PAYMENT_LABELS[p].fr, PAYMENT_LABELS[p].en)}</option>)}
            </Select>
          </Field>
          <Field label={t("Statut", "Status")} htmlFor="ex-st">
            <Select id="ex-st" value={f.status} onChange={(x) => set("status", x.target.value as "paid" | "to_pay")}>
              <option value="paid">{t("Payée", "Paid")}</option>
              <option value="to_pay">{t("À payer", "To pay")}</option>
            </Select>
          </Field>
        </div>
        <Field label={t("Justificatif (PDF, JPG, PNG, WebP · 10 Mo max.)", "Receipt (PDF, JPG, PNG, WebP · 10 MB max.)")} htmlFor="ex-file">
          {editing && e?.receipt && !dropReceipt && !file ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-line px-3 py-2 text-sm">
              <a href={`/api/admin/accounting/expenses/${e.id}/receipt`} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-2 underline"><Paperclip className="size-4 shrink-0" /><span className="truncate">{e.receipt.name}</span></a>
              <button type="button" className="shrink-0 text-xs text-bad" onClick={() => setDropReceipt(true)}>{t("Retirer", "Remove")}</button>
            </div>
          ) : (
            <input id="ex-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(x) => setFile(x.target.files?.[0] ?? null)} className="block w-full min-w-0 text-sm file:mr-3 file:rounded-full file:border file:border-line file:bg-card file:px-3 file:py-1.5 file:text-sm file:text-ink" />
          )}
        </Field>
        <Field label={t("Notes", "Notes")} htmlFor="ex-notes"><Textarea id="ex-notes" value={f.notes} onChange={(x) => set("notes", x.target.value)} maxLength={2000} className="min-h-16" /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>{t("Annuler", "Cancel")}</Button>
          <Button type="submit" loading={busy}>{t("Enregistrer", "Save")}</Button>
        </div>
      </form>
    </Modal>
  );
}

function RecurringModal({ charge, d, onClose, onSaved, onDeleted }: { charge?: Recurring; d: Report; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const c = charge;
  const [f, setF] = useState({
    label: c?.label ?? "",
    category: c?.category ?? "hosting",
    supplier: c?.supplier ?? "",
    frequency: (c?.frequency ?? "monthly") as Frequency,
    day: c?.day ?? Math.min(28, new Date().getDate()),
    startDate: c?.start_date ?? todayYmd(),
    endDate: c?.end_date ?? "",
    paymentMethod: (c?.payment_method ?? "prelevement") as (typeof PAYMENT_METHODS)[number],
    autoPaid: c ? !!c.auto_paid : true,
    active: c ? !!c.active : true,
  });
  const [basis, setBasis] = useState<"ht" | "ttc">("ht");
  const [amount, setAmount] = useState(c ? centsInput(c.amount_ht) : "");
  const [rate, setRate] = useState(c?.vat_rate ?? 2000);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const cents = parseCents(amount);
  const ht = cents === null ? null : basis === "ht" ? cents : fromTtc(cents, rate).ht;
  const preview = ht === null || !f.startDate ? [] : nextOccurrences({ frequency: f.frequency, day: f.day, start_date: f.startDate, end_date: f.endDate || null, amount_ht: ht, vat_rate: rate, auto_paid: f.autoPaid }, todayYmd(), 4);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (ht === null) return toast("bad", t("Indiquez un montant valide.", "Enter a valid amount."));
    if (f.endDate && f.endDate < f.startDate) return toast("bad", t("La date de fin précède le début.", "The end date is before the start date."));
    setBusy(true);
    try {
      const body = { ...f, endDate: f.endDate || null, amountHt: ht, vatRate: rate };
      if (c) await api(`/api/admin/accounting/recurring/${c.id}`, { method: "PATCH", body });
      else await api("/api/admin/accounting/recurring", { body });
      toast("ok", c ? t("Charge modifiée.", "Charge updated.") : t("Charge récurrente ajoutée.", "Recurring charge added."));
      onSaved();
    } catch (err) {
      toast("bad", (err as Error).message);
    }
    setBusy(false);
  };
  const del = async () => {
    if (!c || !confirm(t("Supprimer cette charge ? Les échéances déjà passées restent dans le journal.", "Delete this charge? Past instalments stay in the ledger."))) return;
    try {
      await api(`/api/admin/accounting/recurring/${c.id}`, { method: "DELETE" });
      toast("ok", t("Charge supprimée.", "Charge deleted."));
      onDeleted();
    } catch (err) {
      toast("bad", (err as Error).message);
    }
  };

  return (
    <Modal open onClose={onClose} title={c ? t("Modifier la charge récurrente", "Edit recurring charge") : t("Nouvelle charge récurrente", "New recurring charge")}>
      <form onSubmit={submit} className="grid gap-3">
        <Field label={t("Libellé", "Description")} htmlFor="rc-label"><Input id="rc-label" value={f.label} onChange={(x) => set("label", x.target.value)} placeholder={t("ex. Hébergement Scaleway", "e.g. Scaleway hosting")} required maxLength={200} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Catégorie", "Category")} htmlFor="rc-cat"><CategorySelect id="rc-cat" d={d} value={f.category} onChange={(v) => set("category", v)} /></Field>
          <Field label={t("Fournisseur", "Supplier")} htmlFor="rc-sup"><Input id="rc-sup" value={f.supplier} onChange={(x) => set("supplier", x.target.value)} maxLength={120} /></Field>
        </div>
        <AmountFields idp="rc" basis={basis} setBasis={setBasis} amount={amount} setAmount={setAmount} rate={rate} setRate={setRate} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Fréquence", "Frequency")} htmlFor="rc-freq">
            <Select id="rc-freq" value={f.frequency} onChange={(x) => set("frequency", x.target.value as Frequency)}>
              {FREQUENCIES.map((q) => <option key={q} value={q}>{t(...FREQ_LABELS[q])}</option>)}
            </Select>
          </Field>
          <Field label={t("Jour de l'échéance", "Due day")} htmlFor="rc-day">
            <Select id="rc-day" value={f.day} onChange={(x) => set("day", Number(x.target.value))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <Field label={t("Début", "Start")} htmlFor="rc-start"><Input id="rc-start" type="date" value={f.startDate} onChange={(x) => set("startDate", x.target.value)} required /></Field>
          <Field label={t("Fin (facultatif)", "End (optional)")} htmlFor="rc-end"><Input id="rc-end" type="date" value={f.endDate} onChange={(x) => set("endDate", x.target.value)} /></Field>
        </div>
        <Field label={t("Mode de paiement", "Payment method")} htmlFor="rc-pm">
          <Select id="rc-pm" value={f.paymentMethod} onChange={(x) => set("paymentMethod", x.target.value as typeof f.paymentMethod)}>
            {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{t(PAYMENT_LABELS[p].fr, PAYMENT_LABELS[p].en)}</option>)}
          </Select>
        </Field>
        <Toggle checked={f.autoPaid} onChange={(v) => set("autoPaid", v)} label={t("Échéance passée = payée (prélèvement automatique)", "Past instalment = paid (automatic debit)")} />
        <p className="-mt-1 text-xs text-muted">{f.autoPaid ? t("Les échéances passées sont marquées payées ; la prochaine apparaît « à payer ».", "Past instalments are marked paid; the next one shows as “to pay”.") : t("Chaque échéance reste « à payer » jusqu'à ce que vous la marquiez payée.", "Each instalment stays “to pay” until you mark it as paid.")}</p>
        {c && <Toggle checked={f.active} onChange={(v) => set("active", v)} label={t("Active (décochez pour suspendre)", "Active (untick to pause)")} />}
        <div className="rounded-2xl border border-line p-3 text-sm">
          <p className="text-xs font-semibold text-ink-2">{t("Prochaines échéances", "Next instalments")}</p>
          {preview.length ? (
            <ul className="mt-1.5 grid gap-1">
              {preview.map((o) => <li key={o.date} className="flex justify-between gap-2 tabular-nums"><span>{dateTxt(lang, o.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</span><span>{money(lang, fromHt(ht ?? 0, rate).ttc)} {t("TTC", "incl.")}</span></li>)}
            </ul>
          ) : <p className="mt-1 text-xs text-muted">{t("Indiquez un montant et une date de début.", "Enter an amount and a start date.")}</p>}
        </div>
        <div className="flex flex-wrap justify-between gap-2 pt-1">
          {c ? <Button type="button" variant="danger" icon={<Trash2 className="size-4" />} onClick={del}>{t("Supprimer", "Delete")}</Button> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>{t("Annuler", "Cancel")}</Button>
            <Button type="submit" loading={busy}>{t("Enregistrer", "Save")}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function CategoriesModal({ d, onClose, reload }: { d: Report; onClose: () => void; reload: () => void }) {
  const t = useT();
  const toast = useToast();
  const [edit, setEdit] = useState<{ id?: string; fr: string; en: string } | null>(null);
  const save = async (body: Record<string, unknown>, msg: string) => {
    try {
      await api("/api/admin/accounting", { body });
      toast("ok", msg);
      setEdit(null);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  return (
    <Modal open onClose={onClose} title={t("Catégories de dépenses", "Expense categories")}>
      <p className="mb-3 text-sm text-muted">{t("Renommez une catégorie (en français et en anglais) ou ajoutez les vôtres. Supprimer une catégorie personnelle range ses dépenses dans « Autres ».", "Rename a category (in French and English) or add your own. Deleting a custom category moves its expenses to “Other”.")}</p>
      <ul className="grid max-h-[45dvh] gap-1 overflow-y-auto pr-1">
        {d.categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-paper-2">
            <span className="min-w-0 truncate text-sm">{t(c.fr, c.en)} {c.custom && <Badge className="ml-1">{t("perso", "custom")}</Badge>}</span>
            <span className="flex shrink-0">
              <IconBtn label={t("Renommer", "Rename")} onClick={() => setEdit({ id: c.id, fr: c.fr, en: c.en })}><Pencil className="size-4" /></IconBtn>
              {c.custom && <IconBtn danger label={t("Supprimer", "Delete")} onClick={() => confirm(t("Supprimer cette catégorie ?", "Delete this category?")) && save({ deleteCategory: c.id }, t("Catégorie supprimée.", "Category deleted."))}><Trash2 className="size-4" /></IconBtn>}
            </span>
          </li>
        ))}
      </ul>
      {edit ? (
        <form className="mt-4 grid gap-3 rounded-2xl bg-paper-2 p-3" onSubmit={(e) => { e.preventDefault(); save({ category: edit }, t("Catégorie enregistrée.", "Category saved.")); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Nom en français", "French name")} htmlFor="cat-fr"><Input id="cat-fr" value={edit.fr} onChange={(e) => setEdit({ ...edit, fr: e.target.value })} required maxLength={60} /></Field>
            <Field label={t("Nom en anglais", "English name")} htmlFor="cat-en"><Input id="cat-en" value={edit.en} onChange={(e) => setEdit({ ...edit, en: e.target.value })} required maxLength={60} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEdit(null)}>{t("Annuler", "Cancel")}</Button>
            <Button type="submit" size="sm">{t("Enregistrer", "Save")}</Button>
          </div>
        </form>
      ) : (
        <Button className="mt-4" size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEdit({ fr: "", en: "" })}>{t("Nouvelle catégorie", "New category")}</Button>
      )}
    </Modal>
  );
}

