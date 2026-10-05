import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireUser } from "@/lib/auth";
import { packCheckout, paymentsLive, planCheckout, stripeKeys } from "@/lib/payments";
import { PACK_IDS, PLAN_IDS, type PackId, type PlanId } from "@/lib/plans";
import { L } from "@/lib/i18n-server";

const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("plan"), plan: z.enum(PLAN_IDS as [PlanId, ...PlanId[]]), billing: z.enum(["month", "year"]) }),
  z.object({ kind: z.literal("pack"), pack: z.enum(PACK_IDS as [PackId, ...PackId[]]) }),
]);

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  if (!stripeKeys().secret) throw new HttpError(503, L("Le paiement en ligne n'est pas encore activé sur cette installation.", "Online payment is not enabled on this installation yet."));
  const b = await body(req, Body);
  const r = b.kind === "plan" ? await planCheckout(user, b.plan, b.billing) : await packCheckout(user, b.pack);
  return ok({ ...r, verified: paymentsLive() });
});
