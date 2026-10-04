import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireUser } from "@/lib/auth";
import { paymentsLive, subscriptionCheckout, topupCheckout, stripeKeys } from "@/lib/payments";
import { L } from "@/lib/i18n-server";

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  if (!stripeKeys().secret) throw new HttpError(503, L("Le paiement en ligne n'est pas encore activé sur cette installation.", "Online payment is not enabled on this installation yet."));
  const b = await body(req, z.object({ kind: z.enum(["subscription", "topup"]), stores: z.number().int().min(1).max(50).optional(), amount: z.number().int().optional() }));
  const r = b.kind === "subscription" ? await subscriptionCheckout(user, b.stores ?? 1) : await topupCheckout(user, b.amount ?? 10);
  return ok({ ...r, verified: paymentsLive() });
});
