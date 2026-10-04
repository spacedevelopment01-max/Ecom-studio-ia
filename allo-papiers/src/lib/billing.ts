import "server-only";
import Stripe from "stripe";
import { env } from "./env";
import { ConfigError, sql } from "./db";
import { HttpError } from "./http";
import { audit } from "./audit";
import type { User } from "./auth";
import { onSendPaid } from "./sends";

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!env.stripeSecret) throw new ConfigError("STRIPE_SECRET_KEY manquant : les paiements ne sont pas activés.");
  stripeClient ??= new Stripe(env.stripeSecret, { maxNetworkRetries: 2 });
  return stripeClient;
}

export function stripeIsTestMode(): boolean {
  return Boolean(env.stripeSecret?.startsWith("sk_test_") || env.stripeSecret?.startsWith("rk_test_"));
}

async function ensureCustomer(user: User): Promise<string> {
  const [row] = await sql()<{ stripe_customer_id: string | null }[]>`select stripe_customer_id from users where id = ${user.id}`;
  if (row?.stripe_customer_id) return row.stripe_customer_id;
  const customer = await stripe().customers.create(
    { email: user.email, metadata: { userId: user.id } },
    { idempotencyKey: `customer-${user.id}` },
  );
  await sql()`update users set stripe_customer_id = ${customer.id} where id = ${user.id} and stripe_customer_id is null`;
  const [again] = await sql()<{ stripe_customer_id: string }[]>`select stripe_customer_id from users where id = ${user.id}`;
  return again.stripe_customer_id;
}

/** Abonnement Plus : uniquement après confirmation explicite du prix par l'utilisateur. */
export async function createPlusCheckout(user: User): Promise<string> {
  if (!env.stripePricePlus) throw new ConfigError("STRIPE_PRICE_PLUS manquant.");
  const [sub] = await sql()<{ status: string }[]>`select status from subscriptions where user_id = ${user.id}`;
  if (user.plan === "plus" || (sub && ["active", "trialing", "past_due"].includes(sub.status))) {
    throw new HttpError(409, "deja_abonne", "Vous avez déjà l'offre Plus.");
  }
  const customer = await ensureCustomer(user);
  const session = await stripe().checkout.sessions.create(
    {
      mode: "subscription",
      customer,
      client_reference_id: user.id,
      line_items: [{ price: env.stripePricePlus, quantity: 1 }],
      subscription_data: { metadata: { userId: user.id } },
      metadata: { userId: user.id, kind: "plus" },
      locale: "fr",
      success_url: `${env.appUrl}/compte/abonnement?retour=paiement`,
      cancel_url: `${env.appUrl}/compte/abonnement?retour=annule`,
    },
    // Idempotence : un double clic dans la même minute réutilise la même session.
    { idempotencyKey: `plus-${user.id}-${Math.floor(Date.now() / 60000)}` },
  );
  if (!session.url) throw new Error("Stripe n'a pas renvoyé d'adresse de paiement.");
  await audit(user.id, "abonnement_paiement_ouvert");
  return session.url;
}

/** Résiliation en un clic depuis le compte : effective à la fin de la période payée. */
export async function cancelPlus(user: User) {
  const [sub] = await sql()<{ stripe_subscription_id: string | null }[]>`select stripe_subscription_id from subscriptions where user_id = ${user.id}`;
  if (!sub?.stripe_subscription_id) throw new HttpError(404, "aucun_abonnement", "Aucun abonnement en cours.");
  const updated = await stripe().subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
  await syncSubscription(updated);
  await audit(user.id, "abonnement_resilie");
}

export async function resumePlus(user: User) {
  const [sub] = await sql()<{ stripe_subscription_id: string | null }[]>`select stripe_subscription_id from subscriptions where user_id = ${user.id}`;
  if (!sub?.stripe_subscription_id) throw new HttpError(404, "aucun_abonnement", "Aucun abonnement en cours.");
  const updated = await stripe().subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: false });
  await syncSubscription(updated);
  await audit(user.id, "abonnement_repris");
}

export async function billingPortalUrl(user: User): Promise<string> {
  const customer = await ensureCustomer(user);
  const portal = await stripe().billingPortal.sessions.create({ customer, return_url: `${env.appUrl}/compte/abonnement`, locale: "fr" });
  return portal.url;
}

const PLUS_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Recopie l'état réel de l'abonnement (lu chez Stripe) et en déduit l'offre du compte. */
export async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const [user] = await sql()<{ id: string }[]>`select id from users where stripe_customer_id = ${customerId}`;
  const userId = user?.id ?? sub.metadata?.userId;
  if (!userId) return;
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  await sql()`
    insert into subscriptions (user_id, stripe_subscription_id, status, price_id, current_period_end, cancel_at_period_end, updated_at)
    values (${userId}, ${sub.id}, ${sub.status}, ${item?.price.id ?? null}, ${periodEnd}, ${sub.cancel_at_period_end}, now())
    on conflict (user_id) do update set stripe_subscription_id = excluded.stripe_subscription_id, status = excluded.status,
      price_id = excluded.price_id, current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end, updated_at = now()`;
  const plan = PLUS_STATUSES.has(sub.status) ? "plus" : "free";
  await sql()`update users set plan = ${plan} where id = ${userId}`;
}

/**
 * Traitement d'un webhook Stripe déjà authentifié (signature vérifiée par l'appelant).
 * Idempotent : un même événement reçu deux fois n'est traité qu'une fois.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<"traite" | "doublon" | "ignore"> {
  const inserted = await sql()`insert into stripe_events (id, type) values (${event.id}, ${event.type}) on conflict (id) do nothing returning id`;
  if (inserted.length === 0) {
    const [prev] = await sql()<{ processed_at: Date | null }[]>`select processed_at from stripe_events where id = ${event.id}`;
    if (prev?.processed_at) return "doublon";
    // Reçu mais pas terminé (plantage précédent) : on retraite, les opérations sont elles-mêmes idempotentes.
  }
  let outcome: "traite" | "ignore" = "traite";
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed": {
      const obj = event.data.object as Stripe.Subscription;
      // On relit l'abonnement chez Stripe : l'ordre d'arrivée des événements n'a plus d'importance.
      let fresh: Stripe.Subscription = obj;
      try {
        fresh = await stripe().subscriptions.retrieve(obj.id);
      } catch {
        /* abonnement supprimé : on garde l'objet de l'événement */
      }
      await syncSubscription(fresh);
      break;
    }
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment" && session.metadata?.sendId) {
        if (session.payment_status === "paid") await onSendPaid(session);
      } else if (session.mode === "subscription" && typeof session.subscription === "string") {
        await syncSubscription(await stripe().subscriptions.retrieve(session.subscription));
      }
      break;
    }
    default:
      outcome = "ignore";
  }
  await sql()`update stripe_events set processed_at = now() where id = ${event.id}`;
  return outcome;
}
