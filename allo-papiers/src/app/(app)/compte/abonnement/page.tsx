import { requirePageSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { usage } from "@/lib/quota";
import { integrationStatus } from "@/lib/env";
import { stripeIsTestMode } from "@/lib/billing";
import { Subscription } from "./subscription";

export const metadata = { title: "Abonnement" };

export default async function Page({ searchParams }: { searchParams: Promise<{ retour?: string }> }) {
  const { retour } = await searchParams;
  const { user } = await requirePageSession();
  const [sub] = await sql()<{ status: string; current_period_end: Date | null; cancel_at_period_end: boolean }[]>`
    select status, current_period_end, cancel_at_period_end from subscriptions where user_id = ${user.id}`;
  const u = await usage(user.id);
  return (
    <Subscription
      plan={user.plan}
      sub={sub ? { status: sub.status, periodEnd: sub.current_period_end?.toISOString() ?? null, cancelAtPeriodEnd: sub.cancel_at_period_end } : null}
      limits={u.limits}
      used={u.used}
      stripeReady={integrationStatus().stripe}
      testMode={stripeIsTestMode()}
      retour={retour ?? null}
    />
  );
}
