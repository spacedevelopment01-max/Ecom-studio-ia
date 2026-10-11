import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { createSubscription, grantProjectPlan } from "@/lib/project-subscriptions";
import { subscriptionOfProject } from "@/lib/project-billing";
import type { PlanId } from "@/lib/plans";
import { L } from "@/lib/i18n-server";
import { billingOverview } from "@/lib/admin-billing";

/** Vue d'administration par compte, projet et abonnement (réservée à l'équipe ; aucune donnée globale pour les clients). */
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("jours")) || 30));
  return ok(billingOverview(days));
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant"), projectId: z.string(), plan: z.enum(["creer", "vendre", "dominer"]) }),
  z.object({ action: z.literal("revoke"), projectId: z.string() }),
  z.object({ action: z.literal("offer"), userId: z.string(), plan: z.enum(["creer", "vendre", "dominer"]) }),
]);

/**
 * Gestes de l'équipe : offrir un forfait à un projet (ou le retirer), ou offrir un abonnement « en attente de projet »
 * à un compte. Un abonnement payé par Stripe ne se modifie pas ici (il se gère dans Stripe, puis par webhook).
 */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, Body);
  if (b.action === "offer") {
    if (!one("SELECT 1 FROM users WHERE id = ?", b.userId)) throw new HttpError(404, L("Compte introuvable.", "Account not found."));
    createSubscription(b.userId, { plan: b.plan, status: "manual", source: "admin" });
  } else {
    const cur = subscriptionOfProject(b.projectId);
    if (cur?.stripe_subscription_id && (cur.status === "active" || cur.status === "past_due")) throw new HttpError(409, L("Abonnement payé par Stripe : gérez-le dans Stripe.", "Stripe-paid subscription: manage it in Stripe."));
    if (b.action === "grant") grantProjectPlan(b.projectId, b.plan);
    else if (cur) grantProjectPlan(b.projectId, (cur.plan ?? "creer") as PlanId, "canceled");
  }
  return ok(billingOverview(30));
});
