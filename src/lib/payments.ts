/**
 * Paiements Stripe (abonnement et recharges). Les paiements ne sont annoncés
 * comme actifs qu'une fois les clés enregistrées ET un événement webhook
 * signé reçu (preuve que l'intégration fonctionne de bout en bout).
 */
import crypto from "node:crypto";
import { id, now, one, run } from "./db";
import { creditTopup, getSubscription, syncAllowance, OFFER, monthlyPriceEur } from "./billing";
import { appUrl, getSetting, setSetting } from "./settings";

export function stripeKeys() {
  return { secret: getSetting("stripe.secretKey"), webhookSecret: getSetting("stripe.webhookSecret") };
}

export function paymentsLive(): boolean {
  const k = stripeKeys();
  return !!k.secret && !!k.webhookSecret && getSetting("stripe.verifiedAt") !== null;
}

async function stripe(path: string, params: Record<string, string>) {
  const { secret } = stripeKeys();
  if (!secret) throw new Error("Paiement en ligne non configuré.");
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
  const j: any = await r.json();
  if (!r.ok) throw new Error(`Stripe : ${j.error?.message ?? r.status}`);
  return j;
}

export async function subscriptionCheckout(user: { id: string; email: string }, stores: number) {
  const n = Math.max(1, Math.min(50, Math.floor(stores)));
  const params: Record<string, string> = {
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[kind]": "subscription",
    "metadata[stores]": String(n),
    "subscription_data[metadata][user_id]": user.id,
    "subscription_data[metadata][stores]": String(n),
    success_url: `${appUrl()}/studio/compte?paiement=ok`,
    cancel_url: `${appUrl()}/studio/compte?paiement=annule`,
    locale: "fr",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(Math.round(OFFER.basePriceEur * 100)),
    "line_items[0][price_data][tax_behavior]": "inclusive",
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": "E-COM STUDIO IA — boutique",
  };
  if (n > 1) {
    Object.assign(params, {
      "line_items[1][quantity]": String(n - 1),
      "line_items[1][price_data][currency]": "eur",
      "line_items[1][price_data][unit_amount]": String(Math.round(OFFER.extraStorePriceEur * 100)),
      "line_items[1][price_data][tax_behavior]": "inclusive",
      "line_items[1][price_data][recurring][interval]": "month",
      "line_items[1][price_data][product_data][name]": "E-COM STUDIO IA — boutique supplémentaire",
    });
  }
  const s = await stripe("checkout/sessions", params);
  return { url: s.url as string, totalEur: monthlyPriceEur(n) };
}

export async function topupCheckout(user: { id: string; email: string }, amountEur: number) {
  if (amountEur < 10 || amountEur % OFFER.topupStepEur !== 0 || amountEur > 1000) throw new Error("Les recharges se font par multiples de 10 € (jusqu'à 1 000 €).");
  const s = await stripe("checkout/sessions", {
    mode: "payment",
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[kind]": "topup",
    "metadata[amount_eur]": String(amountEur),
    success_url: `${appUrl()}/studio/compte?recharge=ok`,
    cancel_url: `${appUrl()}/studio/compte?recharge=annule`,
    locale: "fr",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(amountEur * 100),
    "line_items[0][price_data][tax_behavior]": "inclusive",
    "line_items[0][price_data][product_data][name]": `Recharge de ${amountEur} € (dont ${amountEur / 2} € d'enveloppe IA)`,
  });
  return { url: s.url as string };
}

export function verifyStripeSignature(payload: string, header: string | null): boolean {
  const { webhookSecret } = stripeKeys();
  if (!webhookSecret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts.t;
  const v1 = header.split(",").filter((x) => x.startsWith("v1=")).map((x) => x.slice(3));
  if (!t || !v1.length || Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(`${t}.${payload}`).digest("hex");
  return v1.some((sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

export function handleStripeEvent(evt: any) {
  setSetting("stripe.verifiedAt", String(now()));
  const o = evt.data?.object ?? {};
  switch (evt.type) {
    case "checkout.session.completed": {
      const userId = o.client_reference_id;
      if (!userId || !one("SELECT 1 FROM users WHERE id = ?", userId)) return;
      if (o.metadata?.kind === "topup" && o.payment_status === "paid") {
        const amount = Number(o.metadata.amount_eur);
        run("INSERT OR IGNORE INTO payments (id, user_id, kind, amount_cents, status, stripe_id, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "topup", amount * 100, "paid", o.id, now());
        creditTopup(userId, amount, `stripe:${o.id}`);
      }
      if (o.metadata?.kind === "subscription") {
        getSubscription(userId);
        run("UPDATE subscriptions SET status = 'active', stores = ?, stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = ? WHERE user_id = ?", Number(o.metadata.stores) || 1, o.customer ?? null, o.subscription ?? null, now(), userId);
        run("INSERT OR IGNORE INTO payments (id, user_id, kind, amount_cents, status, stripe_id, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "subscription", o.amount_total ?? 0, "paid", o.id, now());
        syncAllowance(userId);
      }
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const userId = o.metadata?.user_id;
      if (!userId) return;
      const status = evt.type.endsWith("deleted") ? "canceled" : o.status === "active" || o.status === "trialing" ? "active" : o.status === "past_due" ? "past_due" : "canceled";
      const stores = (o.items?.data ?? []).reduce((s: number, it: any) => s + (it.quantity ?? 0), 0) || Number(o.metadata?.stores) || 1;
      run("UPDATE subscriptions SET status = ?, stores = ?, current_period_start = ?, current_period_end = ?, updated_at = ? WHERE user_id = ?", status, stores, (o.current_period_start ?? 0) * 1000 || null, (o.current_period_end ?? 0) * 1000 || null, now(), userId);
      syncAllowance(userId);
      return;
    }
  }
}
