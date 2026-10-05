/**
 * Paiements Stripe (abonnement à un forfait, packs). Les paiements ne sont annoncés
 * comme actifs qu'une fois les clés enregistrées ET un événement webhook
 * signé reçu (preuve que l'intégration fonctionne de bout en bout).
 */
import crypto from "node:crypto";
import { id, now, one, run } from "./db";
import { creditTopup, getSubscription, syncAllowance } from "./billing";
import { HttpError } from "./auth";
import { PACKS, PLANS, packPrice, type Billing, type PackId, type PlanId } from "./plans";
import { creditPack, launchPackBought, userPlan } from "./quotas";
import { appUrl, getSetting, setSetting } from "./settings";
import { L, uiLang } from "./i18n-server";

export function stripeKeys() {
  return { secret: getSetting("stripe.secretKey"), webhookSecret: getSetting("stripe.webhookSecret") };
}

export function paymentsLive(): boolean {
  const k = stripeKeys();
  return !!k.secret && !!k.webhookSecret && getSetting("stripe.verifiedAt") !== null;
}

async function stripe(path: string, params: Record<string, string>) {
  const { secret } = stripeKeys();
  if (!secret) throw new Error(L("Paiement en ligne non configuré.", "Online payment is not configured."));
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
  const j: any = await r.json();
  if (!r.ok) throw new Error(L(`Stripe : ${j.error?.message ?? r.status}`, `Stripe: ${j.error?.message ?? r.status}`));
  return j;
}

/** Abonnement à un forfait (mensuel ou annuel). Une boutique par abonnement. */
async function stripeDelete(path: string) {
  const { secret } = stripeKeys();
  if (!secret) return;
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${secret}` } });
  if (!r.ok) throw new Error(`Stripe ${r.status}`);
}

export async function planCheckout(user: { id: string; email: string }, planId: PlanId, billing: Billing) {
  const plan = PLANS[planId];
  const lang = uiLang();
  const params: Record<string, string> = {
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[kind]": "subscription",
    "metadata[plan]": planId,
    "metadata[billing]": billing,
    "subscription_data[metadata][user_id]": user.id,
    "subscription_data[metadata][plan]": planId,
    "subscription_data[metadata][billing]": billing,
    success_url: `${appUrl()}/studio/compte?paiement=ok`,
    cancel_url: `${appUrl()}/studio/compte?paiement=annule`,
    locale: lang,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(Math.round(plan.price[billing] * 100)),
    "line_items[0][price_data][tax_behavior]": "inclusive",
    "line_items[0][price_data][recurring][interval]": billing,
    "line_items[0][price_data][product_data][name]": L(`E-COM STUDIO IA — forfait ${plan.name.fr} (${billing === "year" ? "annuel" : "mensuel"})`, `E-COM STUDIO IA — ${plan.name.en} plan (${billing === "year" ? "yearly" : "monthly"})`),
  };
  const s = await stripe("checkout/sessions", params);
  return { url: s.url as string };
}

/** Achat d'un pack (paiement unique), remise du forfait comprise. Réservé aux abonnés. */
export async function packCheckout(user: { id: string; email: string }, packId: PackId) {
  const plan = userPlan(user.id);
  if (!plan) throw new HttpError(402, L("Les packs s'ajoutent à un forfait : choisissez d'abord un forfait.", "Packs are added to a plan: choose a plan first."));
  if (PACKS[packId].once && launchPackBought(user.id)) throw new HttpError(409, L("Le pack Lancement ne s'achète qu'une fois.", "The Launch pack can only be bought once."));
  if (PACKS[packId].soon) throw new HttpError(409, L("Ce pack n'est pas encore en vente.", "This pack isn't on sale yet."));
  const price = packPrice(packId, plan);
  const s = await stripe("checkout/sessions", {
    mode: "payment",
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[kind]": "pack",
    "metadata[pack]": packId,
    success_url: `${appUrl()}/studio/compte?paiement=ok`,
    cancel_url: `${appUrl()}/studio/compte?paiement=annule`,
    locale: uiLang(),
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(Math.round(price * 100)),
    "line_items[0][price_data][tax_behavior]": "inclusive",
    "line_items[0][price_data][product_data][name]": L(`E-COM STUDIO IA — ${PACKS[packId].name.fr}`, `E-COM STUDIO IA — ${PACKS[packId].name.en}`),
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
      if (o.metadata?.kind === "pack" && o.payment_status === "paid" && o.metadata.pack in PACKS) {
        const pack = o.metadata.pack as PackId;
        run("INSERT OR IGNORE INTO payments (id, user_id, kind, amount_cents, status, stripe_id, label, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), userId, "pack", o.amount_total ?? 0, "paid", o.id, pack, now());
        creditPack(userId, pack, `stripe:${o.id}`);
      }
      if (o.metadata?.kind === "subscription") {
        const sub = getSubscription(userId);
        const plan = o.metadata.plan in PLANS ? o.metadata.plan : "creer";
        const billing = o.metadata.billing === "year" ? "year" : "month";
        // Changement de forfait : l'ancien abonnement Stripe est arrêté (un seul abonnement, une seule boutique).
        const old = sub.stripe_subscription_id;
        if (old && o.subscription && old !== o.subscription) void stripeDelete(`subscriptions/${old}`).catch((e) => console.error("[stripe] arrêt de l'ancien abonnement", e));
        run("UPDATE subscriptions SET status = 'active', plan = ?, billing = ?, stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = ? WHERE user_id = ?", plan, billing, o.customer ?? null, o.subscription ?? null, now(), userId);
        run("INSERT OR IGNORE INTO payments (id, user_id, kind, amount_cents, status, stripe_id, label, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), userId, "subscription", o.amount_total ?? 0, "paid", o.id, `${plan}:${billing}`, now());
        syncAllowance(userId);
      }
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const userId = o.metadata?.user_id;
      if (!userId) return;
      // Événement d'un ancien abonnement arrêté lors d'un changement de forfait : sans effet sur l'abonnement en cours.
      const cur = getSubscription(userId).stripe_subscription_id;
      if (cur && o.id && cur !== o.id) return;
      const status = evt.type.endsWith("deleted") ? "canceled" : o.status === "active" || o.status === "trialing" ? "active" : o.status === "past_due" ? "past_due" : "canceled";
      const plan = o.metadata?.plan in PLANS ? o.metadata.plan : null;
      const billing = o.metadata?.billing === "year" ? "year" : o.metadata?.billing === "month" ? "month" : null;
      run("UPDATE subscriptions SET status = ?, plan = COALESCE(?, plan), billing = COALESCE(?, billing), current_period_start = ?, current_period_end = ?, updated_at = ? WHERE user_id = ?", status, plan, billing, (o.current_period_start ?? 0) * 1000 || null, (o.current_period_end ?? 0) * 1000 || null, now(), userId);
      syncAllowance(userId);
      return;
    }
  }
}
