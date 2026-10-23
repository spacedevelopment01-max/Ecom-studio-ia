import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { all, run } from "@/lib/db";
import { availableSlots, bookingsOf, bookSlot, freeCallUsed, quoteCall } from "@/lib/appointments";
import { stripeKeys } from "@/lib/payments";
import { callCheckout } from "@/lib/payments-v2";
import { PAID_STATUSES, subscriptionOfProject } from "@/lib/project-billing";
import { L } from "@/lib/i18n-server";

/** Accompagnement téléphonique : créneaux libres, prix par projet (selon son forfait), rendez-vous du client. */
export const GET = handle(async () => {
  const user = await requireUser();
  const slots = availableSlots(); // Expire abandoned payment holds before quoting the introductory right.
  const projects = all<{ id: string; name: string }>("SELECT id, name FROM projects WHERE user_id = ? AND archived = 0 AND hidden = 0 ORDER BY updated_at DESC", user.id)
    .filter((p) => {
      const s = subscriptionOfProject(p.id);
      return !!s && (PAID_STATUSES as readonly string[]).includes(s.status);
    })
    .map((p) => {
      const q = quoteCall(user.id, p.id);
      return { id: p.id, name: p.name, plan: q.plan, free: q.free, priceEur: q.priceCents == null ? null : q.priceCents / 100, state:q.state, reason: q.reason ?? null };
    });
  return ok({ projects, slots: slots.map((s) => ({ id: s.id, startsAt: s.starts_at, endsAt: s.ends_at })), bookings: bookingsOf(user.id), freeHourUsed: freeCallUsed(user.id) });
});

const Body = z.object({ projectId: z.string().min(1), slotId: z.string().min(1), topic: z.string().max(1000).optional(), phone: z.string().max(40).optional() });

/** Réservation : heure offerte confirmée tout de suite ; sinon paiement Stripe (le webhook confirme). */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = await body(req, Body);
  const project = ownedProject(user, b.projectId);
  const quote = quoteCall(user.id, project.id);
  if (!quote.free && !stripeKeys().secret) throw new HttpError(503, L("Le paiement en ligne n'est pas encore activé sur cette installation.", "Online payment is not enabled on this installation yet."));
  const booking = bookSlot(user.id, project.id, b.slotId, { topic: b.topic, phone: b.phone });
  if (booking.free) return ok({ booking: booking.id, confirmed: true });
  try {
    const r = await callCheckout(user, booking.id);
    return ok({ booking: booking.id, confirmed: false, url: r.url });
  } catch (e) {
    // Réponse incertaine : conserver la même réservation et sa clé Checkout pour une reprise sans nouvel achat.
    if(!(e instanceof HttpError)||![409,502,503].includes(e.status))run("UPDATE call_bookings SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE id = ? AND status = 'pending_payment'", Date.now(), Date.now(), booking.id);
    throw e;
  }
});
