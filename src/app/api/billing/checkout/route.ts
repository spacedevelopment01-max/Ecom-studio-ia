import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { packCheckout, paymentsLive, stripeKeys } from "@/lib/payments";
import { subscriptionCheckout, topupCheckout } from "@/lib/payments-v2";
import { PACK_IDS, PLAN_IDS, type PackId, type PlanId } from "@/lib/plans";
import { L } from "@/lib/i18n-server";

const plan = z.enum(PLAN_IDS as [PlanId, ...PlanId[]]);
const billing = z.enum(["month", "year"]);
const Body = z.discriminatedUnion("kind", [
  // « plan » (ancien bouton des tarifs) = un nouvel abonnement, donc un nouveau projet.
  z.object({ kind: z.literal("plan"), plan, billing }),
  z.object({ kind: z.literal("subscription"), plan, billing }),
  z.object({ kind: z.literal("reactivate"), projectId: z.string().min(1), plan, billing }),
  z.object({ kind: z.literal("topup"), projectId: z.string().min(1) }),
  z.object({ kind: z.literal("pack"), pack: z.enum(PACK_IDS as [PackId, ...PackId[]]) }),
]);

/**
 * Ouvre une session de paiement Stripe. Rien n'est débloqué ici ni à l'URL de retour : seuls les webhooks signés
 * (confirmation serveur du paiement) créent l'abonnement, réactivent le projet ou créditent la recharge.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  if (!stripeKeys().secret) throw new HttpError(503, L("Le paiement en ligne n'est pas encore activé sur cette installation.", "Online payment is not enabled on this installation yet."));
  const b = await body(req, Body);
  let r: { url: string };
  if (b.kind === "plan" || b.kind === "subscription") r = await subscriptionCheckout(user, b.plan, b.billing);
  else if (b.kind === "reactivate") r = await subscriptionCheckout(user, b.plan, b.billing, ownedProject(user, b.projectId).id);
  else if (b.kind === "topup") r = await topupCheckout(user, ownedProject(user, b.projectId).id);
  else r = await packCheckout(user, b.pack);
  return ok({ ...r, verified: paymentsLive() });
});
