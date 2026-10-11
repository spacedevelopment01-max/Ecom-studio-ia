/**
 * Administration des forfaits V2 (cahier des charges §18) : comptes → projets → abonnements, avec, pour chaque projet,
 * son forfait, son statut Stripe, son échéance, son budget IA (forfait + recharges), sa consommation, ses recharges et
 * ses rendez-vous ; plus les totaux (revenus mensuels, conversions, coûts IA, marge estimée). Réservé à l'équipe.
 * Montants : TTC côté client ; la marge estimée part du HT (TVA 20 %) moins le coût réel des fournisseurs IA.
 */
import { all, one } from "./db";
import { EUR } from "./billing";
import { PLANS, type PlanId } from "./plans";

const VAT = 1.2;
const monthlyTtc = (s: { plan: string | null; billing: string | null; price_cents: number | null }) => {
  const cents = s.price_cents ?? Math.round(PLANS[((s.plan ?? "creer") in PLANS ? s.plan : "creer") as PlanId].price[s.billing === "year" ? "year" : "month"] * 100);
  return (s.billing === "year" ? cents / 12 : cents) / 100;
};

export function billingOverview(days = 30) {
  const since = Date.now() - days * 86400_000;
  const subs = all<{ user_id: string; owner_user_id: string | null; project_id: string | null; plan: string | null; billing: string | null; status: string; source: string | null; price_cents: number | null; stripe_subscription_id: string | null; current_period_end: number | null; cancel_at_period_end: number }>(
    "SELECT user_id, owner_user_id, project_id, plan, billing, status, source, price_cents, stripe_subscription_id, current_period_end, cancel_at_period_end FROM subscriptions WHERE status IN ('active','manual','past_due','canceled')",
  );
  const users = all<{ id: string; email: string; created_at: number }>("SELECT id, email, created_at FROM users ORDER BY created_at DESC");
  const projectName = new Map(all<{ id: string; name: string; sector: string | null }>("SELECT id, name, sector FROM projects").map((p) => [p.id, p]));
  const wallet = (key: string) => one<{ monthly_allowance: number; monthly_used: number; topup_balance: number; topup_period_used: number }>("SELECT monthly_allowance, monthly_used, topup_balance, topup_period_used FROM wallets WHERE user_id = ?", key);
  const aiCost = (pid: string) => one<{ c: number }>("SELECT COALESCE(SUM(COALESCE(actual, amount)), 0) c FROM ai_reservations WHERE project_id = ? AND status IN ('settled','reconciled','uncertain') AND created_at >= ?", pid, since)!.c / EUR;
  const topups = (key: string) => one<{ n: number; c: number; r: number }>("SELECT COUNT(*) n, COALESCE(SUM(amount_cents),0) c, COALESCE(SUM(refunded_cents),0) r FROM payments WHERE kind = 'topup' AND status = 'paid' AND account_key = ?", key)!;
  const calls = (pid: string) => one<{ n: number; free: number }>("SELECT COUNT(*) n, COALESCE(SUM(free),0) free FROM call_bookings WHERE project_id = ? AND status != 'canceled'", pid)!;

  const accounts = users
    .map((u) => {
      const mine = subs.filter((s) => (s.owner_user_id ?? s.user_id) === u.id);
      const rows = mine.map((s) => {
        const w = wallet(s.user_id);
        const t = topups(s.user_id);
        const p = s.project_id ? projectName.get(s.project_id) : null;
        const c = s.project_id ? calls(s.project_id) : { n: 0, free: 0 };
        return {
          key: s.user_id,
          projectId: s.project_id,
          project: p?.name ?? null,
          sector: p?.sector ?? null,
          plan: s.plan ?? "creer",
          billing: s.billing ?? "month",
          status: s.status,
          source: s.source,
          stripe: !!s.stripe_subscription_id,
          periodEnd: s.current_period_end,
          cancelAtPeriodEnd: !!s.cancel_at_period_end,
          monthlyEur: s.status === "active" ? monthlyTtc(s) : 0,
          ai: w ? { allowanceEur: w.monthly_allowance / EUR, usedEur: w.monthly_used / EUR, topupEur: w.topup_balance / EUR, topupUsedEur: w.topup_period_used / EUR } : null,
          aiCostEur: s.project_id ? aiCost(s.project_id) : 0,
          topups: { count: t.n, eur: (t.c - t.r) / 100 },
          calls: c.n,
          freeCall: c.free > 0,
        };
      });
      return { id: u.id, email: u.email, createdAt: u.created_at, projects: rows, monthlyEur: rows.reduce((a, r) => a + r.monthlyEur, 0) };
    })
    .filter((a) => a.projects.length > 0);

  const active = subs.filter((s) => s.status === "active");
  const revenue = all<{ kind: string; c: number; r: number }>("SELECT kind, COALESCE(SUM(amount_cents),0) c, COALESCE(SUM(refunded_cents),0) r FROM payments WHERE status = 'paid' AND created_at >= ? GROUP BY kind", since);
  const revenueTtc = revenue.reduce((a, r) => a + (r.c - r.r), 0) / 100;
  const aiCostTotal = one<{ c: number }>("SELECT COALESCE(SUM(COALESCE(actual, amount)), 0) c FROM ai_reservations WHERE status IN ('settled','reconciled','uncertain') AND created_at >= ?", since)!.c / EUR;
  const subscribers = new Set(subs.filter((s) => s.status !== "canceled").map((s) => s.owner_user_id ?? s.user_id)).size;
  return {
    days,
    accounts,
    totals: {
      mrrEur: Math.round(active.reduce((a, s) => a + monthlyTtc(s), 0) * 100) / 100,
      byPlan: Object.fromEntries((["creer", "vendre", "dominer"] as PlanId[]).map((p) => [p, active.filter((s) => s.plan === p).length])),
      complimentary: subs.filter((s) => s.status === "manual").length,
      pastDue: subs.filter((s) => s.status === "past_due").length,
      pending: subs.filter((s) => !s.project_id && (s.status === "active" || s.status === "manual")).length,
      accounts: users.length,
      subscribers,
      conversionPct: users.length ? Math.round((subscribers / users.length) * 1000) / 10 : 0,
      revenueTtcEur: revenueTtc,
      revenueByKind: Object.fromEntries(revenue.map((r) => [r.kind, (r.c - r.r) / 100])),
      aiCostEur: Math.round(aiCostTotal * 100) / 100,
      marginEstimateEur: Math.round((revenueTtc / VAT - aiCostTotal) * 100) / 100,
      freeCallsUsed: one<{ n: number }>("SELECT COUNT(*) n FROM call_bookings WHERE free = 1 AND status != 'canceled'")!.n,
    },
  };
}
