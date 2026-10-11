/**
 * Forfaits V2 — accompagnement téléphonique (cahier des charges §12, §21) : prix 60 € / 30 € / heure offerte DOMINER
 * une seule fois par compte (jamais renouvelée, même avec un second DOMINER), un créneau = un rendez-vous (même en
 * concurrence), confirmation d'un rendez-vous payant uniquement par le webhook, annulation / report jusqu'à 24 h avant.
 * Stripe est simulé : aucun paiement réel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/settings", async (orig) => {
  const real = await orig<typeof import("@/lib/settings")>();
  return { ...real, getSetting: (k: string) => (k === "stripe.secretKey" ? "sk_test_calls" : real.getSetting(k)) };
});

import { createUser } from "@/lib/auth";
import { id, now, one, run } from "@/lib/db";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import * as calls from "@/lib/appointments";
import { handleStripeEvent } from "@/lib/payments";
import { callCheckout } from "@/lib/payments-v2";

const posts: { path: string; params: URLSearchParams }[] = [];
let seq = 0;
beforeEach(() => {
  posts.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any, init?: any) => {
      const p = new URL(String(input)).pathname.replace(/^\/v1\//, "");
      posts.push({ path: p, params: new URLSearchParams(String(init?.body ?? "")) });
      const sid = `cs_call_${++seq}`;
      return new Response(JSON.stringify(p === "checkout/sessions" ? { id: sid, url: `https://checkout.stripe.test/${sid}` } : { id: `re_${seq}` }), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const uniq = () => `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
const DAY = 86400_000;
const project = async (plan: "creer" | "vendre" | "dominer", user?: { id: string; email: string }) => {
  const u = user ?? (await createUser(`call-${uniq()}@test.fr`, "motdepasse-test", "C"));
  const pid = id();
  run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, "Projet", now(), now());
  grantProjectPlan(pid, plan);
  return { u, pid };
};
let slotN = 0;
const slot = (inDays = 3) => {
  const sid = id();
  const at = now() + inDays * DAY + ++slotN * 60_000;
  run("INSERT INTO call_slots (id, starts_at, ends_at, status, created_at) VALUES (?,?,?,?,?)", sid, at, at + 3_600_000, "open", now());
  return sid;
};

describe("rendez-vous téléphoniques", () => {
  it("prix selon le forfait du projet : CRÉER 60 €, DÉVELOPPER 30 €, DOMINER première heure offerte", async () => {
    const c = await project("creer");
    const v = await project("vendre");
    const d = await project("dominer");
    expect(calls.quoteCall(c.u.id, c.pid)).toMatchObject({ plan: "creer", free: false, priceCents: 6000 });
    expect(calls.quoteCall(v.u.id, v.pid)).toMatchObject({ plan: "vendre", free: false, priceCents: 3000 });
    expect(calls.quoteCall(d.u.id, d.pid)).toMatchObject({ plan: "dominer", free: true, priceCents: 0 });
    // Projet d'un autre compte, ou sans abonnement : refusé.
    expect(() => calls.quoteCall(c.u.id, v.pid)).toThrow();
  });

  it("l'heure offerte DOMINER ne sert qu'une fois par compte, même avec un second abonnement DOMINER", async () => {
    const d = await project("dominer");
    const b = calls.bookSlot(d.u.id, d.pid, slot());
    expect(b).toMatchObject({ free: 1, status: "confirmed", price_cents: 0 });
    const second = await project("dominer", d.u);
    const q = calls.quoteCall(d.u.id, second.pid);
    expect(q.free).toBe(false);
    // Tarif DOMINER au-delà de l'heure offerte : réglé par l'administration (sinon pas de réservation).
    expect(q.priceCents).toBe(null);
    expect(() => calls.bookSlot(d.u.id, second.pid, slot())).toThrow(/tarif/i);
    calls.setDominerCallPrice(45);
    expect(calls.quoteCall(d.u.id, second.pid)).toMatchObject({ free: false, priceCents: 4500 });
    calls.setDominerCallPrice(null);
    // Annulée dans les délais : l'heure offerte est rendue.
    calls.cancelBooking(d.u.id, b.id);
    expect(calls.freeCallUsed(d.u.id)).toBe(false);
  });

  it("deux réservations concurrentes ne peuvent pas prendre le même créneau", async () => {
    const a = await project("creer");
    const b = await project("vendre");
    const s = slot();
    const results = await Promise.allSettled([Promise.resolve().then(() => calls.bookSlot(a.u.id, a.pid, s)), Promise.resolve().then(() => calls.bookSlot(b.u.id, b.pid, s))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM call_bookings WHERE slot_id = ? AND status != 'canceled'", s)!.n).toBe(1);
    // Le créneau n'est plus proposé.
    expect(calls.availableSlots().some((x) => x.id === s)).toBe(false);
  });

  it("rendez-vous payant : en attente jusqu'au webhook signé ; session expirée = créneau libéré", async () => {
    const c = await project("creer");
    const s = slot();
    const b = calls.bookSlot(c.u.id, c.pid, s);
    expect(b.status).toBe("pending_payment");
    const r = await callCheckout(c.u, b.id);
    const sent = posts.find((p) => p.path === "checkout/sessions")!.params;
    expect(sent.get("line_items[0][price_data][unit_amount]")).toBe("6000");
    expect(sent.get("metadata[booking_id]")).toBe(b.id);
    // Page de retour du navigateur : rien n'est confirmé.
    expect(one<{ status: string }>("SELECT status FROM call_bookings WHERE id = ?", b.id)!.status).toBe("pending_payment");
    const evt = { id: `evt_${uniq()}`, type: "checkout.session.completed", created: 1, data: { object: { id: r.url.split("/").pop(), client_reference_id: c.u.id, payment_status: "paid", amount_total: 6000, payment_intent: `pi_${uniq()}`, metadata: { kind: "call_v2", user_id: c.u.id, booking_id: b.id, project_id: c.pid } } } };
    await handleStripeEvent(evt);
    await handleStripeEvent({ ...evt, id: `evt_${uniq()}` });
    expect(one<{ status: string }>("SELECT status FROM call_bookings WHERE id = ?", b.id)!.status).toBe("confirmed");
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM payments WHERE user_id = ? AND kind = 'call'", c.u.id)!.n).toBe(1);

    const other = calls.bookSlot(c.u.id, c.pid, slot());
    await handleStripeEvent({ id: `evt_${uniq()}`, type: "checkout.session.expired", created: 2, data: { object: { id: "cs_x", metadata: { kind: "call_v2", booking_id: other.id } } } });
    expect(one<{ status: string }>("SELECT status FROM call_bookings WHERE id = ?", other.id)!.status).toBe("canceled");
  });

  it("annulation ou report jusqu'à 24 h avant seulement ; un rendez-vous payé annulé est remboursable", async () => {
    const c = await project("vendre");
    const soon = calls.bookSlot(c.u.id, c.pid, slot(0.9)); // dans moins de 24 h
    expect(() => calls.cancelBooking(c.u.id, soon.id)).toThrow(/24 h/);
    const b = calls.bookSlot(c.u.id, c.pid, slot(5));
    run("UPDATE call_bookings SET status = 'confirmed', payment_intent = 'pi_test' WHERE id = ?", b.id);
    const moved = calls.rescheduleBooking(c.u.id, b.id, slot(6));
    expect(moved.slot_id).not.toBe(b.slot_id);
    expect(calls.cancelBooking(c.u.id, b.id).refund).toEqual({ paymentIntent: "pi_test", cents: 3000 });
    // Un autre client ne peut pas toucher à ce rendez-vous.
    const intruder = await project("creer");
    expect(() => calls.cancelBooking(intruder.u.id, soon.id)).toThrow(/introuvable/);
  });

  it("administration : ouverture de créneaux à l'heure de Paris, sans doublon", () => {
    const d = new Date(now() + 10 * DAY);
    const day = d.toISOString().slice(0, 10);
    const n1 = calls.openSlots({ from: day, to: day, weekdays: [d.getUTCDay()], hours: ["10:00", "14:30"] });
    const n2 = calls.openSlots({ from: day, to: day, weekdays: [d.getUTCDay()], hours: ["10:00"] });
    expect(n1).toBe(2);
    expect(n2).toBe(0);
    const at = calls.parisTime(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 10, 0);
    expect(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(new Date(at))).toBe("10:00");
  });
});
