/**
 * Rendez-vous téléphoniques d'accompagnement (60 minutes), seul achat complémentaire avec la recharge IA.
 *
 *  - L'équipe ouvre de vrais créneaux (administration) ; le client choisit un créneau libre, pour UN de ses projets.
 *  - Prix selon le forfait actif de ce projet : CRÉER 60 €, DÉVELOPPER 30 €, DOMINER : première heure offerte une seule
 *    fois par compte client (jamais renouvelée, même avec un second abonnement DOMINER), puis prix réglé par
 *    l'administration (« calls.dominerPriceCents » ; tant qu'il n'est pas fixé, pas de réservation payante DOMINER).
 *  - Un créneau = un rendez-vous (index unique) : deux réservations simultanées ne peuvent pas prendre le même.
 *  - Rendez-vous payant : réservé « en attente de paiement » pendant 30 min, confirmé uniquement par le webhook Stripe
 *    signé ; sinon le créneau se libère.
 *  - Annulation ou report jusqu'à 24 h avant : remboursement d'un rendez-vous payé, heure offerte rendue.
 */
import { all, id, now, one, run, tx } from "./db";
import { HttpError } from "./auth";
import { PAID_STATUSES, subscriptionOfProject } from "./project-billing";
import { PLANS, type PlanId } from "./plans";
import { getSetting, setSetting } from "./settings";
import { L } from "./i18n-server";

export const CALL_MINUTES = 60;
/** Délai avant le rendez-vous en deçà duquel il ne peut plus être annulé ni reporté. */
export const CHANGE_LIMIT_MS = 24 * 3600_000;
/** Délai de réservation minimal (le créneau doit pouvoir être préparé). */
export const BOOK_AHEAD_MS = 12 * 3600_000;
/** Durée de blocage d'un créneau en attente de paiement (la session Stripe expire avant : 31 min). */
export const PAYMENT_HOLD_MS = 35 * 60_000;

export type CallSlot = { id: string; starts_at: number; ends_at: number; status: "open" | "blocked"; created_at: number };
export type CallBooking = {
  id: string;
  slot_id: string;
  user_id: string;
  project_id: string;
  plan: PlanId;
  price_cents: number;
  free: number;
  status: "pending_payment" | "confirmed" | "done" | "canceled";
  topic: string | null;
  phone: string | null;
  stripe_session: string | null;
  payment_intent: string | null;
  refunded: number;
  created_at: number;
  updated_at: number;
  canceled_at: number | null;
};

/** Prix d'un rendez-vous DOMINER au-delà de l'heure offerte (centimes TTC), réglé par l'administration. */
export function dominerCallPriceCents(): number | null {
  const v = Number(getSetting("calls.dominerPriceCents"));
  return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
}
export function setDominerCallPrice(eur: number | null) {
  setSetting("calls.dominerPriceCents", eur && eur > 0 ? String(Math.round(eur * 100)) : null);
}

/** L'heure offerte DOMINER a-t-elle déjà été utilisée (ou réservée) par ce compte ? */
export function freeCallUsed(userId: string): boolean {
  return !!one("SELECT 1 FROM call_bookings WHERE user_id = ? AND free = 1 AND status != 'canceled'", userId);
}

/** Libère les créneaux en attente d'un paiement qui n'est jamais venu. */
export function releaseExpiredHolds(at = now()) {
  run("UPDATE call_bookings SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE status = 'pending_payment' AND created_at < ?", at, at, at - PAYMENT_HOLD_MS);
}

export type CallQuote = { plan: PlanId; free: boolean; priceCents: number | null; reason?: string };

/** Prix d'un rendez-vous pour ce projet (forfait actif du projet, heure offerte du compte). */
export function quoteCall(userId: string, projectId: string): CallQuote {
  const sub = subscriptionOfProject(projectId);
  const owner = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ? AND archived = 0", projectId);
  if (!owner || owner.user_id !== userId) throw new HttpError(404, L("Projet introuvable.", "Project not found."));
  if (!sub || !(PAID_STATUSES as readonly string[]).includes(sub.status)) throw new HttpError(402, L("L'accompagnement téléphonique est réservé aux projets avec un abonnement actif.", "Phone coaching is for projects with an active subscription."), "plan_required");
  const plan = ((sub.plan ?? "creer") in PLANS ? sub.plan : "creer") as PlanId;
  const p = PLANS[plan];
  if (p.freeFirstCall && !freeCallUsed(userId)) return { plan, free: true, priceCents: 0 };
  const price = p.callPrice != null ? Math.round(p.callPrice * 100) : dominerCallPriceCents();
  if (price == null) return { plan, free: false, priceCents: null, reason: L("Votre heure offerte a été utilisée. Le tarif des rendez-vous suivants n'est pas encore fixé : contactez l'équipe.", "Your free hour has been used. The price of further appointments isn't set yet: contact the team.") };
  return { plan, free: false, priceCents: price };
}

/** Créneaux libres à venir (réservables). */
export function availableSlots(from = now(), days = 45): CallSlot[] {
  releaseExpiredHolds(from);
  return all<CallSlot>(
    `SELECT s.* FROM call_slots s WHERE s.status = 'open' AND s.starts_at >= ? AND s.starts_at < ?
       AND NOT EXISTS (SELECT 1 FROM call_bookings b WHERE b.slot_id = s.id AND b.status != 'canceled')
     ORDER BY s.starts_at LIMIT 300`,
    from + BOOK_AHEAD_MS,
    from + days * 86400_000,
  );
}

/**
 * Réserve un créneau. Gratuit (heure offerte DOMINER) : confirmé tout de suite. Payant : en attente de paiement ; le
 * paiement Stripe (webhook) le confirme. Deux réservations simultanées du même créneau : la seconde est refusée
 * (index unique), de même qu'une seconde heure offerte.
 */
export function bookSlot(userId: string, projectId: string, slotId: string, info: { topic?: string; phone?: string } = {}): CallBooking {
  releaseExpiredHolds();
  const quote = quoteCall(userId, projectId);
  if (quote.priceCents == null) throw new HttpError(409, quote.reason ?? L("Tarif non fixé.", "Price not set."));
  const slot = one<CallSlot>("SELECT * FROM call_slots WHERE id = ?", slotId);
  if (!slot || slot.status !== "open" || slot.starts_at < now() + BOOK_AHEAD_MS) throw new HttpError(409, L("Ce créneau n'est plus disponible.", "This slot is no longer available."));
  const bid = id();
  try {
    tx(() => {
      run(
        "INSERT INTO call_bookings (id, slot_id, user_id, project_id, plan, price_cents, free, status, topic, phone, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        bid,
        slotId,
        userId,
        projectId,
        quote.plan,
        quote.priceCents,
        quote.free ? 1 : 0,
        quote.free ? "confirmed" : "pending_payment",
        info.topic?.slice(0, 1000) ?? null,
        info.phone?.slice(0, 40) ?? null,
        now(),
        now(),
      );
    });
  } catch (e) {
    if (/UNIQUE/i.test(String((e as Error).message))) {
      if (quote.free && freeCallUsed(userId) && !one("SELECT 1 FROM call_bookings WHERE slot_id = ? AND status != 'canceled'", slotId)) throw new HttpError(409, L("Votre heure offerte est déjà réservée ou utilisée.", "Your free hour is already booked or used."));
      throw new HttpError(409, L("Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez-en un autre.", "This slot was just booked by someone else. Pick another one."));
    }
    throw e;
  }
  return one<CallBooking>("SELECT * FROM call_bookings WHERE id = ?", bid)!;
}

/** Rattache la session Stripe d'un rendez-vous payant (pour le retrouver au webhook). */
export function attachCallSession(bookingId: string, sessionId: string) {
  run("UPDATE call_bookings SET stripe_session = ?, updated_at = ? WHERE id = ?", sessionId, now(), bookingId);
}

/** Paiement confirmé par le webhook : le rendez-vous est confirmé (une seule fois). */
export function confirmPaidCall(bookingId: string, paymentIntent: string | null): "confirmed" | "already" | "lost" {
  const b = one<CallBooking>("SELECT * FROM call_bookings WHERE id = ?", bookingId);
  if (!b) return "lost";
  if (b.status === "confirmed" || b.status === "done") return "already";
  if (b.status === "pending_payment") {
    run("UPDATE call_bookings SET status = 'confirmed', payment_intent = ?, updated_at = ? WHERE id = ? AND status = 'pending_payment'", paymentIntent, now(), bookingId);
    return "confirmed";
  }
  // Payé après l'expiration du blocage : on reprend le créneau s'il est encore libre, sinon il faut rembourser.
  try {
    run("UPDATE call_bookings SET status = 'confirmed', payment_intent = ?, canceled_at = NULL, updated_at = ? WHERE id = ?", paymentIntent, now(), bookingId);
    return "confirmed";
  } catch {
    run("UPDATE call_bookings SET payment_intent = ?, updated_at = ? WHERE id = ?", paymentIntent, now(), bookingId);
    return "lost";
  }
}

function ownBooking(userId: string, bookingId: string): CallBooking {
  const b = one<CallBooking>("SELECT * FROM call_bookings WHERE id = ? AND user_id = ?", bookingId, userId);
  if (!b) throw new HttpError(404, L("Rendez-vous introuvable.", "Appointment not found."));
  return b;
}

function assertChangeable(b: CallBooking) {
  const slot = one<CallSlot>("SELECT * FROM call_slots WHERE id = ?", b.slot_id)!;
  if (b.status === "canceled" || b.status === "done") throw new HttpError(409, L("Ce rendez-vous ne peut plus être modifié.", "This appointment can no longer be changed."));
  if (slot.starts_at - now() < CHANGE_LIMIT_MS) throw new HttpError(409, L("Moins de 24 h avant le rendez-vous : il ne peut plus être annulé ni reporté. Contactez l'équipe.", "Less than 24 h before the appointment: it can no longer be canceled or moved. Contact the team."));
}

/** Annulation par le client (≥ 24 h avant). Renvoie le paiement à rembourser, s'il y en a un. */
export function cancelBooking(userId: string, bookingId: string): { refund: { paymentIntent: string; cents: number } | null } {
  const b = ownBooking(userId, bookingId);
  assertChangeable(b);
  run("UPDATE call_bookings SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE id = ?", now(), now(), b.id);
  return { refund: b.status === "confirmed" && b.price_cents > 0 && b.payment_intent ? { paymentIntent: b.payment_intent, cents: b.price_cents } : null };
}

/** Report sur un autre créneau libre (≥ 24 h avant) : même rendez-vous, même paiement, même heure offerte. */
export function rescheduleBooking(userId: string, bookingId: string, slotId: string): CallBooking {
  const b = ownBooking(userId, bookingId);
  assertChangeable(b);
  const slot = one<CallSlot>("SELECT * FROM call_slots WHERE id = ?", slotId);
  if (!slot || slot.status !== "open" || slot.starts_at < now() + BOOK_AHEAD_MS) throw new HttpError(409, L("Ce créneau n'est plus disponible.", "This slot is no longer available."));
  try {
    run("UPDATE call_bookings SET slot_id = ?, updated_at = ? WHERE id = ?", slotId, now(), b.id);
  } catch (e) {
    if (/UNIQUE/i.test(String((e as Error).message))) throw new HttpError(409, L("Ce créneau vient d'être réservé. Choisissez-en un autre.", "This slot was just booked. Pick another one."));
    throw e;
  }
  return one<CallBooking>("SELECT * FROM call_bookings WHERE id = ?", b.id)!;
}

export type BookingView = { id: string; projectId: string; projectName: string; startsAt: number; endsAt: number; status: CallBooking["status"]; free: boolean; priceEur: number; changeable: boolean; topic: string | null };

/** Rendez-vous du client (à venir et passés). */
export function bookingsOf(userId: string): BookingView[] {
  releaseExpiredHolds();
  return all<CallBooking & { starts_at: number; ends_at: number; name: string }>(
    "SELECT b.*, s.starts_at, s.ends_at, p.name FROM call_bookings b JOIN call_slots s ON s.id = b.slot_id JOIN projects p ON p.id = b.project_id WHERE b.user_id = ? AND b.status != 'canceled' ORDER BY s.starts_at DESC LIMIT 50",
    userId,
  ).map((b) => ({ id: b.id, projectId: b.project_id, projectName: b.name, startsAt: b.starts_at, endsAt: b.ends_at, status: b.status, free: !!b.free, priceEur: b.price_cents / 100, changeable: (b.status === "confirmed" || b.status === "pending_payment") && b.starts_at - now() >= CHANGE_LIMIT_MS, topic: b.topic }));
}

// ------------------------------------------------------------------ administration

/**
 * Ouvre des créneaux de 60 min : pour chaque jour de [from, to] dont le jour de semaine est coché, aux heures données
 * (heure locale de Paris). Un créneau déjà existant n'est pas dupliqué.
 */
export function openSlots(input: { from: string; to: string; weekdays: number[]; hours: string[] }): number {
  const start = new Date(`${input.from}T00:00:00Z`);
  const end = new Date(`${input.to}T00:00:00Z`);
  if (!(start <= end) || end.getTime() - start.getTime() > 180 * 86400_000) throw new HttpError(400, L("Période invalide (180 jours au plus).", "Invalid period (180 days at most)."));
  let n = 0;
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400_000)) {
    if (!input.weekdays.includes(d.getUTCDay())) continue;
    for (const h of input.hours) {
      const m = /^(\d{1,2}):(\d{2})$/.exec(h);
      if (!m) continue;
      const at = parisTime(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Number(m[1]), Number(m[2]));
      if (at < now()) continue;
      const r = run("INSERT OR IGNORE INTO call_slots (id, starts_at, ends_at, status, created_at) VALUES (?,?,?,?,?)", id(), at, at + CALL_MINUTES * 60_000, "open", now());
      n += r.changes;
    }
  }
  return n;
}

/** Instant (ms) d'une heure locale de Paris, changement d'heure compris. */
export function parisTime(y: number, mo: number, d: number, h: number, mi: number): number {
  const guess = Date.UTC(y, mo, d, h, mi);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const [ph, pm] = fmt.format(new Date(guess)).split(":").map(Number);
  const offsetMin = (ph * 60 + pm - (h * 60 + mi) + 1440) % 1440;
  return guess - (offsetMin > 720 ? offsetMin - 1440 : offsetMin) * 60_000;
}

/** Bloque (ou rouvre) un créneau sans rendez-vous ; un créneau réservé ne se bloque pas ici. */
export function setSlotBlocked(slotId: string, blocked: boolean) {
  if (blocked && one("SELECT 1 FROM call_bookings WHERE slot_id = ? AND status != 'canceled'", slotId)) throw new HttpError(409, L("Ce créneau est réservé : annulez d'abord le rendez-vous.", "This slot is booked: cancel the appointment first."));
  run("UPDATE call_slots SET status = ? WHERE id = ?", blocked ? "blocked" : "open", slotId);
}

export function deleteSlot(slotId: string) {
  if (one("SELECT 1 FROM call_bookings WHERE slot_id = ?", slotId)) throw new HttpError(409, L("Ce créneau a un historique de rendez-vous : bloquez-le plutôt.", "This slot has appointment history: block it instead."));
  run("DELETE FROM call_slots WHERE id = ?", slotId);
}

export function markDone(bookingId: string) {
  run("UPDATE call_bookings SET status = 'done', updated_at = ? WHERE id = ? AND status = 'confirmed'", now(), bookingId);
}

/** Vue d'administration : créneaux à venir, rendez-vous, heures offertes utilisées, tarif DOMINER. */
export function adminCalls() {
  releaseExpiredHolds();
  const slots = all<CallSlot & { booking: string | null }>(
    "SELECT s.*, (SELECT b.id FROM call_bookings b WHERE b.slot_id = s.id AND b.status != 'canceled') AS booking FROM call_slots s WHERE s.starts_at >= ? ORDER BY s.starts_at LIMIT 500",
    now() - 86400_000,
  );
  const bookings = all<CallBooking & { starts_at: number; email: string; name: string }>(
    "SELECT b.*, s.starts_at, u.email, p.name FROM call_bookings b JOIN call_slots s ON s.id = b.slot_id JOIN users u ON u.id = b.user_id JOIN projects p ON p.id = b.project_id ORDER BY s.starts_at DESC LIMIT 300",
  );
  return {
    slots: slots.map((s) => ({ id: s.id, startsAt: s.starts_at, status: s.status, booked: !!s.booking })),
    bookings: bookings.map((b) => ({ id: b.id, startsAt: b.starts_at, email: b.email, project: b.name, plan: b.plan, status: b.status, free: !!b.free, priceEur: b.price_cents / 100, refunded: !!b.refunded, topic: b.topic, phone: b.phone })),
    freeHoursUsed: one<{ n: number }>("SELECT COUNT(*) n FROM call_bookings WHERE free = 1 AND status != 'canceled'")!.n,
    dominerPriceEur: (dominerCallPriceCents() ?? 0) / 100 || null,
  };
}
