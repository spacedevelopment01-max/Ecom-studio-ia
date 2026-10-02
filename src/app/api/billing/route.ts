import { all } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { balance, getSubscription, monthlyAllowanceMicro, monthlyPriceEur, OFFER, EUR } from "@/lib/billing";
import { paymentsLive } from "@/lib/payments";
import { TASKS, type TaskId } from "@/lib/ai/config";

/** Vue client : jauge globale, pourcentages et consommations par usage (sans coûts fournisseurs). */
export const GET = handle(async () => {
  const user = await requireUser();
  const b = balance(user.id);
  const sub = getSubscription(user.id);
  const since = b.periodEnd - 31 * 86400_000;
  const byTask = all<{ task: string; billed: number; n: number }>("SELECT task, SUM(billed) billed, COUNT(*) n FROM usage_events WHERE user_id = ? AND created_at >= ? GROUP BY task ORDER BY billed DESC", user.id, since);
  const total = byTask.reduce((s, x) => s + x.billed, 0) || 1;
  const units = all<{ unit: string; q: number; inp: number; out: number; est: number }>("SELECT unit, SUM(quantity) q, SUM(input_units) inp, SUM(output_units) out, MAX(estimated) est FROM usage_events WHERE user_id = ? AND created_at >= ? GROUP BY unit", user.id, since);
  const history = all<{ type: string; amount: number; note: string; created_at: number }>("SELECT type, amount, note, created_at FROM ledger WHERE user_id = ? AND type IN ('topup','allowance','renewal','adjustment') ORDER BY created_at DESC LIMIT 20", user.id);
  return ok({
    history: history.map((h) => ({ type: h.type, note: h.note, at: h.created_at, positive: h.amount >= 0 })),
    gauge: { usedPct: b.usedPct, availablePct: b.capacity ? b.available / b.capacity : 0, alert: b.alert, paused: b.paused, periodEnd: b.periodEnd, availableEur: b.available / EUR, capacityEur: b.capacity / EUR, topupEur: b.topupBalance / EUR },
    byTask: byTask.map((x) => ({ task: x.task, label: TASKS[x.task as TaskId]?.label ?? x.task, share: x.billed / total, count: x.n })),
    units,
    subscription: { status: sub.status, stores: sub.stores, priceEur: monthlyPriceEur(sub.stores), allowanceEur: monthlyAllowanceMicro(sub.stores) / EUR, periodEnd: sub.current_period_end },
    offer: OFFER,
    paymentsLive: paymentsLive(),
  });
});
