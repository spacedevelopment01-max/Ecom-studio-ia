import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { logError } from "@/lib/db";
import { cancelBooking, rescheduleBooking } from "@/lib/appointments";
import { callCheckout, refundCall } from "@/lib/payments-v2";
import { notifyAdmins } from "@/lib/payments";

const Body = z.discriminatedUnion("action", [z.object({ action: z.literal("cancel") }), z.object({ action: z.literal("reschedule"), slotId: z.string().min(1) }), z.object({ action: z.literal("pay") })]);

/** Annuler (remboursement d'un rendez-vous payé, heure offerte rendue) ou reporter, jusqu'à 24 h avant ; payer une réservation en attente. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const b = await body(req, Body);
  if (b.action === "pay") return ok(await callCheckout(user, id));
  if (b.action === "reschedule") return ok({ booking: rescheduleBooking(user.id, id, b.slotId).id });
  const { refund } = cancelBooking(user.id, id);
  if (refund) {
    try {
      await refundCall(id, refund.paymentIntent, refund.cents);
    } catch (e) {
      logError("stripe:call-refund", e, { userId: user.id });
      notifyAdmins("Remboursement de rendez-vous à faire", `Le rendez-vous ${id} a été annulé dans les délais mais le remboursement automatique a échoué : remboursez-le dans Stripe.`);
      return ok({ canceled: true, refund: "manual" });
    }
  }
  return ok({ canceled: true, refund: refund ? "done" : null });
});
