import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { all } from "@/lib/db";
import { stripeKeys } from "@/lib/payments";
import { changeProjectPlan, setProjectCancellation } from "@/lib/payments-v2";
import { PLAN_IDS, type PlanId } from "@/lib/plans";
import { subscriptionOfProject, type ProjectSubscription } from "@/lib/project-billing";
import { aiUsage } from "@/lib/ai/access";
import { currentPeriod } from "@/lib/billing";
import { L } from "@/lib/i18n-server";

const view = (projectId: string, s: ProjectSubscription | null) =>
  s
    ? {
        plan: s.plan ?? "creer",
        billing: s.billing ?? "month",
        status: s.status,
        periodEnd: s.current_period_end,
        cancelAtPeriodEnd: !!s.cancel_at_period_end,
        managedByAdmin: !s.stripe_subscription_id,
        ai: aiUsage(s.owner_user_id ?? s.user_id, projectId),
        // Date à laquelle le budget IA du forfait repart à 0 % (période mensuelle du budget, même en annuel).
        aiRenewsAt: currentPeriod(s.user_id).end,
        topups: all<{ amount_cents: number; refunded_cents: number; created_at: number }>("SELECT amount_cents, refunded_cents, created_at FROM payments WHERE project_id = ? AND kind = 'topup' AND status = 'paid' ORDER BY created_at DESC LIMIT 20", projectId).map((p) => ({ amountEur: p.amount_cents / 100, refundedEur: (p.refunded_cents ?? 0) / 100, at: p.created_at })),
      }
    : null;

/** Abonnement du projet (un seul, définitivement rattaché) : forfait, statut, renouvellement, budget IA, recharges. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project } = await projectFromCtx(ctx);
  return ok({ subscription: view(project.id, subscriptionOfProject(project.id)) });
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("change"), plan: z.enum(PLAN_IDS as [PlanId, ...PlanId[]]), billing: z.enum(["month", "year"]) }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("resume") }),
]);

/** Changement de forfait, résiliation en fin de période ou annulation de la résiliation — pour CE projet seulement. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project } = await projectFromCtx(ctx);
  if (!stripeKeys().secret) throw new HttpError(503, L("Le paiement en ligne n'est pas encore activé sur cette installation.", "Online payment is not enabled on this installation yet."));
  const b = await body(req, Body);
  if (b.action === "change") await changeProjectPlan(project.id, b.plan, b.billing);
  else await setProjectCancellation(project.id, b.action === "cancel");
  return ok({ subscription: view(project.id, subscriptionOfProject(project.id)) });
});
