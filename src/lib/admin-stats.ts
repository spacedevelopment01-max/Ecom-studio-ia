/**
 * Indicateurs de l'administration : abonnés, paiements, utilisation du forfait, marge estimée.
 * Montants des paiements en centimes TTC (Stripe), coûts IA en micro-euros.
 */
import { all, one } from "./db";
import { balance, EUR, getSubscription, monthlyPriceEur } from "./billing";
import { L, uiLang } from "./i18n-server";
import { intlLocale } from "./i18n";

const DAY = 86400_000;
/** TVA française appliquée aux abonnements (le HT sert à la marge estimée). */
const VAT = 0.2;
/** Frais Stripe estimés : carte européenne 1,5 % + 0,25 €, Stripe Billing 0,7 % sur les abonnements. */
const stripeFee = (cents: number, subscription: boolean) => (cents * (0.015 + (subscription ? 0.007 : 0))) / 100 + 0.25;

export type ClientRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: number;
  subscription: string;
  stores: number;
  monthlyEur: number;
  projects: number;
  lastActive: number | null;
  jobs30: number;
  aiCost30Eur: number;
  usedPct: number;
  availableEur: number;
  paidEur: number;
  segment: "abonne" | "offert" | "essai" | "sans" | "impaye" | "resilie";
};

const SEGMENT: Record<string, ClientRow["segment"]> = { active: "abonne", manual: "offert", trial: "essai", none: "sans", past_due: "impaye", canceled: "resilie" };

export function clientRows(): ClientRow[] {
  const since = Date.now() - 30 * DAY;
  return all<{ id: string; email: string; name: string; role: string; created_at: number }>("SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC").map((u) => {
    const s = getSubscription(u.id);
    const b = balance(u.id);
    const lastJob = one<{ t: number | null }>("SELECT MAX(created_at) t FROM jobs WHERE user_id = ?", u.id)?.t ?? null;
    const lastLogin = one<{ t: number | null }>("SELECT MAX(created_at) t FROM sessions WHERE user_id = ?", u.id)?.t ?? null;
    const paying = s.status === "active" || s.status === "past_due";
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.created_at,
      subscription: s.status,
      stores: s.stores,
      plan: s.plan ?? null,
      monthlyEur: paying ? monthlyPriceEur(s) : 0,
      projects: one<{ n: number }>("SELECT COUNT(*) n FROM projects WHERE user_id = ?", u.id)!.n,
      lastActive: Math.max(lastJob ?? 0, lastLogin ?? 0) || null,
      jobs30: one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE user_id = ? AND created_at >= ?", u.id, since)!.n,
      aiCost30Eur: (one<{ c: number | null }>("SELECT SUM(cost) c FROM usage_events WHERE user_id = ? AND created_at >= ?", u.id, since)?.c ?? 0) / EUR,
      usedPct: b.usedPct,
      availableEur: b.available / EUR,
      paidEur: (one<{ c: number | null }>("SELECT SUM(amount_cents) c FROM payments WHERE user_id = ? AND status = 'paid'", u.id)?.c ?? 0) / 100,
      segment: SEGMENT[s.status] ?? "sans",
    };
  });
}

export function dashboard() {
  const now = Date.now();
  const d30 = now - 30 * DAY, d7 = now - 7 * DAY;
  const rows = clientRows().filter((r) => r.role !== "admin");
  const count = (seg: ClientRow["segment"]) => rows.filter((r) => r.segment === seg).length;
  const subscribers = rows.filter((r) => r.segment === "abonne" || r.segment === "offert");
  const using = subscribers.filter((r) => r.jobs30 > 0);

  const pay30 = all<{ kind: string; cents: number; n: number }>("SELECT kind, SUM(amount_cents) cents, COUNT(*) n FROM payments WHERE status = 'paid' AND created_at >= ? GROUP BY kind", d30);
  const sub30 = pay30.find((p) => p.kind === "subscription");
  // Packs (et anciennes recharges) : tout ce qui n'est pas un abonnement.
  const extra = (r: { kind: string; cents: number; n: number }[]) => r.filter((p) => p.kind !== "subscription").reduce((a, p) => ({ cents: a.cents + p.cents, n: a.n + p.n }), { cents: 0, n: 0 });
  const top30 = extra(pay30);
  const paid30Cents = pay30.reduce((s, p) => s + p.cents, 0);
  const fees30 = all<{ kind: string; amount_cents: number }>("SELECT kind, amount_cents FROM payments WHERE status = 'paid' AND created_at >= ?", d30).reduce((s, p) => s + stripeFee(p.amount_cents, p.kind === "subscription"), 0);
  const aiCost30 = (one<{ c: number | null }>("SELECT SUM(cost) c FROM usage_events WHERE created_at >= ?", d30)?.c ?? 0) / EUR;
  const revenueHt30 = paid30Cents / 100 / (1 + VAT);

  // Six derniers mois civils (paiements encaissés).
  const months: { label: string; subscriptionEur: number; topupEur: number; payments: number }[] = [];
  const ref = new Date();
  for (let k = 5; k >= 0; k--) {
    const start = new Date(ref.getFullYear(), ref.getMonth() - k, 1).getTime();
    const end = new Date(ref.getFullYear(), ref.getMonth() - k + 1, 1).getTime();
    const r = all<{ kind: string; cents: number; n: number }>("SELECT kind, SUM(amount_cents) cents, COUNT(*) n FROM payments WHERE status = 'paid' AND created_at >= ? AND created_at < ? GROUP BY kind", start, end);
    months.push({
      label: new Date(start).toLocaleDateString(intlLocale(uiLang()), { month: "long", year: "numeric" }),
      subscriptionEur: (r.find((x) => x.kind === "subscription")?.cents ?? 0) / 100,
      topupEur: extra(r).cents / 100,
      payments: r.reduce((s, x) => s + x.n, 0),
    });
  }

  const lastPayments = all<{ id: string; email: string; kind: string; amount_cents: number; status: string; created_at: number }>(
    "SELECT p.id, u.email, p.kind, p.amount_cents, p.status, p.created_at FROM payments p LEFT JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 12",
  );

  return {
    accounts: {
      total: rows.length,
      new7: rows.filter((r) => r.createdAt >= d7).length,
      new30: rows.filter((r) => r.createdAt >= d30).length,
      active30: rows.filter((r) => r.jobs30 > 0).length,
    },
    plans: { abonne: count("abonne"), offert: count("offert"), essai: count("essai"), sans: count("sans"), impaye: count("impaye"), resilie: count("resilie") },
    conversionPct: rows.length ? (count("abonne") / rows.length) * 100 : 0,
    mrrEur: rows.reduce((s, r) => s + r.monthlyEur, 0),
    storesBilled: rows.filter((r) => r.monthlyEur > 0).reduce((s, r) => s + r.stores, 0),
    usage: {
      subscribers: subscribers.length,
      using: using.length,
      notUsing: subscribers.length - using.length,
      avgUsedPct: subscribers.length ? (subscribers.reduce((s, r) => s + r.usedPct, 0) / subscribers.length) * 100 : 0,
      nearLimit: subscribers.filter((r) => r.usedPct >= 0.8).length,
    },
    money30: {
      paidEur: paid30Cents / 100,
      payments: pay30.reduce((s, p) => s + p.n, 0),
      subscriptionEur: (sub30?.cents ?? 0) / 100,
      subscriptionCount: sub30?.n ?? 0,
      topupEur: top30.cents / 100,
      topupCount: top30.n,
      revenueHtEur: revenueHt30,
      aiCostEur: aiCost30,
      stripeFeesEur: fees30,
      marginEur: revenueHt30 - aiCost30 - fees30,
    },
    months,
    lastPayments: lastPayments.map((p) => ({ id: p.id, email: p.email ?? L("compte supprimé", "deleted account"), kind: p.kind, amountEur: p.amount_cents / 100, status: p.status, at: p.created_at })),
    atRisk: subscribers.filter((r) => r.jobs30 === 0).slice(0, 10).map((r) => ({ email: r.email, lastActive: r.lastActive })),
    nearLimit: subscribers.filter((r) => r.usedPct >= 0.8).slice(0, 10).map((r) => ({ email: r.email, usedPct: r.usedPct * 100 })),
  };
}
