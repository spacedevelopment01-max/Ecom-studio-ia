import "server-only";
import { sql } from "./db";
import { HttpError } from "./http";
import { limits, type Plan } from "./plans";
import { parisMonth } from "./time";

export type CreditKind = "document" | "chat" | "compare";

/** Lit le plan EN BASE (jamais depuis le navigateur). */
export async function currentPlan(userId: string): Promise<Plan> {
  const [u] = await sql()<{ plan: Plan }[]>`select plan from users where id = ${userId}`;
  return u?.plan ?? "free";
}

export async function usage(userId: string) {
  const period = parisMonth();
  const rows = await sql()<{ kind: CreditKind; n: number }[]>`
    select kind, count(*)::int as n from usage_ledger
     where user_id = ${userId} and period = ${period}
       and (status = 'consumed' or created_at > now() - interval '15 minutes')
     group by kind`;
  const used = { document: 0, chat: 0, compare: 0 } as Record<CreditKind, number>;
  for (const r of rows) used[r.kind] = r.n;
  const plan = await currentPlan(userId);
  return { period, plan, used, limits: limits(plan) };
}

/**
 * Réserve un crédit de façon atomique (fonction SQL reserve_credit avec verrou par utilisateur).
 * Renvoie l'identifiant de réservation, à confirmer (commit) ou libérer (release).
 */
export async function reserveCredit(userId: string, kind: CreditKind, refId: string) {
  const plan = await currentPlan(userId);
  const limit = limits(plan)[kind];
  if (limit <= 0) {
    throw new HttpError(402, "offre_plus_requise", "Cette fonction fait partie de l'offre Plus (4,99 € par mois).");
  }
  const [r] = await sql()<{ reserve_credit: string }[]>`select reserve_credit(${userId}, ${kind}, ${refId}, ${parisMonth()}, ${limit})`;
  const outcome = r.reserve_credit;
  if (outcome === "quota_exceeded") {
    throw new HttpError(
      402,
      "quota_atteint",
      plan === "free"
        ? "Vous avez utilisé vos 3 documents gratuits de ce mois. Ils se renouvellent le 1er du mois prochain, ou passez à l'offre Plus."
        : "Vous avez atteint la limite mensuelle de l'offre Plus. Elle se renouvelle le 1er du mois prochain.",
    );
  }
  return { plan, outcome: outcome as "reserved" | "already_reserved" };
}

export async function commitCredit(kind: CreditKind, refId: string, userId: string) {
  await sql()`update usage_ledger set status = 'consumed' where kind = ${kind} and ref_id = ${refId} and user_id = ${userId}`;
}

/** Une analyse échouée ne consomme pas de crédit. */
export async function releaseCredit(kind: CreditKind, refId: string, userId: string) {
  await sql()`delete from usage_ledger where kind = ${kind} and ref_id = ${refId} and user_id = ${userId} and status = 'reserved'`;
}
