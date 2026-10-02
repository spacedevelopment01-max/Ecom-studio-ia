import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireUser } from "@/lib/auth";
import { paymentsLive, subscriptionCheckout, topupCheckout, stripeKeys } from "@/lib/payments";

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  if (!stripeKeys().secret) throw new HttpError(503, "Le paiement en ligne n'est pas encore activé sur cette installation.");
  const b = await body(req, z.object({ kind: z.enum(["subscription", "topup"]), stores: z.number().int().min(1).max(50).optional(), amount: z.number().int().optional() }));
  const r = b.kind === "subscription" ? await subscriptionCheckout(user, b.stores ?? 1) : await topupCheckout(user, b.amount ?? 10);
  return ok({ ...r, verified: paymentsLive() });
});
