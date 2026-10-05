import { all } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { currentPeriod, getSubscription, planOf } from "@/lib/billing";
import { paymentsLive } from "@/lib/payments";
import { PACK_IDS, PACKS, PLANS, packPrice, type BillingView, type PackId, type PlanId } from "@/lib/plans";
import { languagesOf, launchPackBought, quotasView } from "@/lib/quotas";
import { L } from "@/lib/i18n-server";

/** Vue client : forfait, quotas restants, packs. Jamais de crédits ni de coûts d'IA. */
export const GET = handle(async () => {
  const user = await requireUser();
  const sub = getSubscription(user.id);
  const plan = planOf(sub);
  const period = currentPeriod(user.id);
  const discoveryUsed = !!all("SELECT 1 FROM projects WHERE user_id = ? LIMIT 1", user.id).length;
  const payments = all<{ kind: string; amount_cents: number; label: string | null; created_at: number }>("SELECT kind, amount_cents, label, created_at FROM payments WHERE user_id = ? AND status = 'paid' ORDER BY created_at DESC LIMIT 20", user.id);
  const label = (p: (typeof payments)[number]) => {
    if (p.kind === "pack" && p.label && p.label in PACKS) return L(PACKS[p.label as PackId].name.fr, PACKS[p.label as PackId].name.en);
    if (p.kind === "subscription") {
      const [id, billing] = (p.label ?? "creer:month").split(":");
      const pl = PLANS[(id in PLANS ? id : "creer") as PlanId];
      return L(`Forfait ${pl.name.fr} (${billing === "year" ? "annuel" : "mensuel"})`, `${pl.name.en} plan (${billing === "year" ? "yearly" : "monthly"})`);
    }
    return L("Recharge", "Top-up");
  };
  const view: BillingView = {
    plan,
    billing: plan ? (sub.billing ?? "month") : null,
    status: sub.status,
    // Une seule date partout (Mon compte, messages de quota, limite d'usage) : la fin de la période des quotas,
    // alignée sur la facturation dès l'activation du forfait.
    periodEnd: period.end,
    quotas: quotasView(user.id),
    languages: languagesOf(user.id),
    discovery: { available: !plan, used: !plan && discoveryUsed },
    packPrices: Object.fromEntries(PACK_IDS.map((id) => [id, packPrice(id, plan)])) as BillingView["packPrices"],
    launchPackBought: launchPackBought(user.id),
    paymentsLive: paymentsLive(),
    history: payments.map((p) => ({ kind: p.kind as BillingView["history"][number]["kind"], label: label(p), amountEur: p.amount_cents / 100, at: p.created_at })),
  };
  return ok(view);
});
