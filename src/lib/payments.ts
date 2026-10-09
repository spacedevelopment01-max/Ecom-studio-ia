/**
 * Paiements Stripe (abonnement à un forfait, packs). Les paiements ne sont annoncés
 * comme actifs qu'une fois les clés enregistrées ET un événement webhook
 * signé reçu (preuve que l'intégration fonctionne de bout en bout).
 */
import crypto from "node:crypto";
import { all, id, logError, now, one, run, tx } from "./db";
import { alignPeriod, creditPackBudget, creditTopup, getSubscription, syncAllowance } from "./billing";
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

/** Lecture d'un objet Stripe ; null si le paiement n'est pas configuré ou si Stripe ne répond pas. */
async function stripeGet(path: string): Promise<any | null> {
  const { secret } = stripeKeys();
  if (!secret) return null;
  try {
    const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${secret}` } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** Arrête un abonnement chez Stripe. Un abonnement déjà arrêté ou inexistant compte comme arrêté. */
async function stripeCancelRemote(subscriptionId: string): Promise<void> {
  const { secret } = stripeKeys();
  if (!secret) throw new Error("Stripe : clé secrète absente, arrêt impossible");
  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${secret}` } });
  if (r.ok || r.status === 404) return;
  const j: any = await r.json().catch(() => ({}));
  if (j?.error?.code === "resource_missing") return;
  const remote = await stripeGet(`subscriptions/${encodeURIComponent(subscriptionId)}`);
  if (remote && (remote.status === "canceled" || remote.status === "incomplete_expired")) return;
  throw new Error(`Stripe ${r.status}${j?.error?.message ? ` : ${j.error.message}` : ""}`);
}

/** Alerte de l'administration (tableau de bord) : un paiement demande une action humaine. */
function notifyAdmins(title: string, body: string) {
  for (const a of all<{ id: string }>("SELECT id FROM users WHERE role = 'admin'")) {
    run("INSERT INTO notifications (id, user_id, project_id, level, title, body, created_at) VALUES (?,?,?,?,?,?,?)", id(), a.id, null, "error", title, body, now());
  }
}

const RETRY_DELAYS_MS = [0, 400, 1500];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Changement de forfait : l'ancien abonnement Stripe est arrêté de façon fiable (un seul abonnement, une seule
 * boutique). Plusieurs essais tout de suite ; en cas d'échec, l'erreur est journalisée, l'administration est
 * prévenue et le worker réessaie (voir `retryStripeCancellations`) jusqu'à confirmation.
 * N'est jamais appelé sur l'abonnement en cours du compte.
 */
export async function stopOldSubscription(userId: string, subscriptionId: string, why: string): Promise<boolean> {
  if (getSubscription(userId).stripe_subscription_id === subscriptionId) return false; // garde-fou
  run("INSERT OR IGNORE INTO stripe_cancellations (subscription_id, user_id, attempts, next_at, created_at) VALUES (?,?,0,?,?)", subscriptionId, userId, now(), now());
  const row = one<{ done_at: number | null }>("SELECT done_at FROM stripe_cancellations WHERE subscription_id = ?", subscriptionId);
  if (row?.done_at) return true;
  let last: unknown = null;
  const tries = stripeKeys().secret ? RETRY_DELAYS_MS : [0];
  for (const d of tries) {
    if (d) await sleep(d);
    try {
      await stripeCancelRemote(subscriptionId);
      run("UPDATE stripe_cancellations SET done_at = ?, attempts = attempts + 1, last_error = NULL WHERE subscription_id = ?", now(), subscriptionId);
      return true;
    } catch (e) {
      last = e;
    }
  }
  const message = last instanceof Error ? last.message : String(last);
  run("UPDATE stripe_cancellations SET attempts = attempts + ?, last_error = ?, next_at = ? WHERE subscription_id = ?", tries.length, message.slice(0, 500), now() + 60_000, subscriptionId);
  logError("stripe:cancel", last, { userId, details: { subscriptionId, why } });
  notifyAdmins(
    "Arrêt d'un ancien abonnement Stripe en échec",
    `L'abonnement ${subscriptionId} (compte ${userId}) devait être arrêté (${why}) mais Stripe a refusé ou n'a pas répondu : ${message.slice(0, 200)}. Le studio réessaie automatiquement ; vérifiez dans Stripe que le client n'est pas prélevé deux fois.`,
  );
  return false;
}

/** Réessais (worker) des arrêts d'anciens abonnements en échec : attente croissante, jusqu'à 6 h entre deux essais. */
export async function retryStripeCancellations(limit = 10) {
  if (!stripeKeys().secret) return 0;
  const due = all<{ subscription_id: string; user_id: string; attempts: number }>("SELECT subscription_id, user_id, attempts FROM stripe_cancellations WHERE done_at IS NULL AND next_at <= ? ORDER BY next_at LIMIT ?", now(), limit);
  for (const c of due) {
    if (getSubscription(c.user_id).stripe_subscription_id === c.subscription_id) {
      // Redevenu l'abonnement en cours (cas anormal) : on ne l'arrête surtout pas.
      run("UPDATE stripe_cancellations SET done_at = ?, last_error = ? WHERE subscription_id = ?", now(), "abonnement en cours : arrêt abandonné", c.subscription_id);
      continue;
    }
    try {
      await stripeCancelRemote(c.subscription_id);
      run("UPDATE stripe_cancellations SET done_at = ?, attempts = attempts + 1, last_error = NULL WHERE subscription_id = ?", now(), c.subscription_id);
    } catch (e) {
      const n = c.attempts + 1;
      run("UPDATE stripe_cancellations SET attempts = ?, last_error = ?, next_at = ? WHERE subscription_id = ?", n, String((e as Error)?.message ?? e).slice(0, 500), now() + Math.min(6 * 3600_000, 60_000 * 2 ** Math.min(n, 9)), c.subscription_id);
      logError("stripe:cancel", e, { userId: c.user_id, details: { subscriptionId: c.subscription_id, attempts: n } });
      if (n === 12) notifyAdmins("Ancien abonnement Stripe toujours actif", `L'abonnement ${c.subscription_id} (compte ${c.user_id}) n'a pas pu être arrêté après ${n} essais. Arrêtez-le dans Stripe et remboursez le client si besoin.`);
    }
  }
  return due.length;
}

export async function planCheckout(user: { id: string; email: string }, planId: PlanId, billing: Billing) {
  const plan = PLANS[planId];
  const lang = uiLang();
  const current = getSubscription(user.id).stripe_subscription_id;
  const params: Record<string, string> = {
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[kind]": "subscription",
    "metadata[plan]": planId,
    "metadata[billing]": billing,
    // Abonnement que celui-ci remplace (changement de forfait) : c'est lui, et seulement lui, qui sera arrêté.
    ...(current ? { "metadata[replaces]": current } : {}),
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
  if (!t || !v1.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(`${t}.${payload}`).digest("hex");
  return v1.some((sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

/** Période en cours d'un abonnement Stripe (champs à la racine, ou sur l'article depuis les versions récentes de l'API). */
function periodOf(o: any): { start: number | null; end: number | null } {
  const item = o?.items?.data?.[0];
  const start = Number(o?.current_period_start ?? item?.current_period_start) || 0;
  const end = Number(o?.current_period_end ?? item?.current_period_end) || 0;
  return { start: start ? start * 1000 : null, end: end ? end * 1000 : null };
}

const subId = (v: unknown): string | null => (typeof v === "string" ? v : v && typeof v === "object" && typeof (v as any).id === "string" ? (v as any).id : null);
const ENDED = new Set(["canceled", "incomplete_expired"]);

/**
 * Traitement d'un événement Stripe signé. Stripe livre « au moins une fois », dans un ordre quelconque :
 *  - un événement déjà traité (journal `stripe_events`) est ignoré ;
 *  - seuls les événements de l'abonnement en cours modifient le compte, et jamais avec un état plus ancien
 *    que le dernier appliqué (horodatage `created` ; à égalité, l'état est relu chez Stripe) ;
 *  - un forfait n'est activé que si la session est payée ;
 *  - l'abonnement en cours n'est jamais arrêté : seul l'ancien, lors d'un changement de forfait.
 * Une erreur remonte au webhook (réponse 500) : Stripe relivrera l'événement, qui n'est pas marqué traité.
 */
export async function handleStripeEvent(evt: any): Promise<void> {
  setSetting("stripe.verifiedAt", String(now()));
  if (evt?.id && one("SELECT 1 FROM stripe_events WHERE id = ?", evt.id)) return;
  await applyStripeEvent(evt);
  if (evt?.id) run("INSERT OR IGNORE INTO stripe_events (id, type, created, processed_at) VALUES (?,?,?,?)", evt.id, String(evt.type ?? ""), Number(evt.created) || 0, now());
}

async function applyStripeEvent(evt: any) {
  const o = evt.data?.object ?? {};
  switch (evt.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const userId = o.client_reference_id;
      if (!userId || !one("SELECT 1 FROM users WHERE id = ?", userId)) return;
      // Moyen de paiement différé (SEPA…) : la session est « complete » mais pas encore payée ;
      // l'activation attend `checkout.session.async_payment_succeeded`.
      const paid = o.payment_status === "paid" || o.payment_status === "no_payment_required";
      if (!paid) return;
      if (o.metadata?.kind === "topup") {
        const amount = Number(o.metadata.amount_eur);
        run("INSERT OR IGNORE INTO payments (id, user_id, kind, amount_cents, status, stripe_id, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, "topup", amount * 100, "paid", o.id, now());
        creditTopup(userId, amount, `stripe:${o.id}`);
      }
      if (o.metadata?.kind === "pack" && o.metadata.pack in PACKS) {
        const pack = o.metadata.pack as PackId;
        run("INSERT OR IGNORE INTO payments (id, user_id, kind, amount_cents, status, stripe_id, label, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), userId, "pack", o.amount_total ?? 0, "paid", o.id, pack, now());
        const credited = creditPack(userId, pack, `stripe:${o.id}`);
        // Budget fournisseur distinct du pack : 50 % du prix HT réellement payé (remise du forfait comprise).
        if (credited === "credited") creditPackBudget(userId, (o.amount_total ?? 0) / 100, `stripe:${o.id}`, `Pack ${PACKS[pack].name.fr}`);
        if (credited === "already_bought") {
          logError("stripe:pack", new Error(`Pack ${pack} déjà acheté : second paiement ${o.id} non crédité`), { userId });
          notifyAdmins("Pack acheté deux fois", `Le compte ${userId} a payé une seconde fois le pack « ${PACKS[pack].name.fr} », qui ne s'achète qu'une fois (paiement ${o.id}). Il n'a pas été crédité : remboursez ce paiement dans Stripe.`);
        }
      }
      if (o.metadata?.kind === "subscription") await activateSubscription(userId, evt, o);
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return updateSubscription(evt, o);
  }
}

/** Session de paiement d'un abonnement, payée : active le forfait si c'est bien le dernier abonnement souscrit. */
async function activateSubscription(userId: string, evt: any, o: any) {
  const sub = getSubscription(userId);
  const newId = subId(o.subscription);
  const plan: PlanId = o.metadata.plan in PLANS ? o.metadata.plan : "creer";
  const billing: Billing = o.metadata.billing === "year" ? "year" : "month";
  const sessionAt = Number(o.created) || Number(evt.created) || 0;
  const recordPayment = () =>
    run("INSERT OR IGNORE INTO payments (id, user_id, kind, amount_cents, status, stripe_id, label, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), userId, "subscription", o.amount_total ?? 0, "paid", o.id, `${plan}:${billing}`, now());

  // Déjà appliquée (relivraison) : rien à refaire.
  if (newId && sub.stripe_subscription_id === newId) return void recordPayment();

  // Session plus ancienne que celle de l'abonnement en cours (rejeu d'un ancien paiement, ou deux paiements ouverts
  // en parallèle) : l'abonnement en cours n'est pas touché. Si l'abonnement de cette ancienne session vit encore
  // chez Stripe, c'est un doublon : lui seul est arrêté.
  if (sub.stripe_subscription_id && sub.stripe_checkout_at && sessionAt && sessionAt < sub.stripe_checkout_at) {
    if (newId) {
      const remote = await stripeGet(`subscriptions/${encodeURIComponent(newId)}`);
      if (remote && !ENDED.has(remote.status)) await stopOldSubscription(userId, newId, "session de paiement antérieure à l'abonnement en cours");
    }
    return;
  }

  // État réel chez Stripe (période de facturation ; abonnement déjà terminé = rejeu d'un ancien paiement).
  const remote = newId ? await stripeGet(`subscriptions/${encodeURIComponent(newId)}`) : null;
  if (remote && ENDED.has(remote.status)) return;
  // Abonnement en cours souscrit avant le journal des sessions (date inconnue) et Stripe injoignable : impossible de
  // savoir si cette session est un rejeu. Erreur → réponse 500 : Stripe relivrera l'événement plus tard.
  if (!remote && newId && sub.stripe_subscription_id && !sub.stripe_checkout_at && stripeKeys().secret) {
    throw new Error(`Stripe injoignable : session ${o.id} réessayée plus tard (abonnement en cours ${sub.stripe_subscription_id})`);
  }
  const period = periodOf(remote);
  const previous = sub.stripe_subscription_id;

  tx(() => {
    run(
      "UPDATE subscriptions SET status = 'active', plan = ?, billing = ?, stripe_customer_id = ?, stripe_subscription_id = ?, current_period_start = ?, current_period_end = ?, stripe_checkout_at = ?, stripe_event_at = ?, updated_at = ? WHERE user_id = ?",
      plan,
      billing,
      subId(o.customer),
      newId,
      period.start,
      period.end,
      sessionAt || null,
      Number(evt.created) || null,
      now(),
      userId,
    );
    // Quotas et budget : la période suit la facturation dès l'activation (pas de seconde période quelques jours après).
    alignPeriod(userId, period.start ?? now(), billing === "month" ? period.end : null);
  });
  recordPayment();
  syncAllowance(userId);

  // Changement de forfait : l'ancien abonnement (celui en cours avant ce paiement, et celui que la session remplace) est arrêté.
  const replaced = new Set([previous, typeof o.metadata?.replaces === "string" ? o.metadata.replaces : null].filter((x): x is string => !!x && x !== newId));
  for (const old of replaced) await stopOldSubscription(userId, old, `remplacé par ${newId ?? o.id}`);
}

/** Changement d'état d'un abonnement (renouvellement, impayé, résiliation). */
async function updateSubscription(evt: any, o: any) {
  const userId = o.metadata?.user_id;
  if (!userId || !one("SELECT 1 FROM users WHERE id = ?", userId)) return;
  const cur = getSubscription(userId);
  // Seul l'abonnement en cours compte (un ancien abonnement arrêté lors d'un changement de forfait est sans effet).
  if (!o.id || cur.stripe_subscription_id !== o.id) return;
  const at = Number(evt.created) || 0;
  // Ordre de livraison non garanti : un état plus ancien que le dernier appliqué est ignoré.
  if (cur.stripe_event_at && at && at < cur.stripe_event_at) return;
  let state = o;
  if (evt.type !== "customer.subscription.deleted" && cur.stripe_event_at && at === cur.stripe_event_at) {
    // Même seconde : impossible de les départager, l'état réel est relu chez Stripe.
    state = (await stripeGet(`subscriptions/${encodeURIComponent(o.id)}`)) ?? o;
  }
  const s = String(state.status ?? "");
  const status = evt.type === "customer.subscription.deleted" || ENDED.has(s) ? "canceled" : s === "active" || s === "trialing" ? "active" : s === "past_due" || s === "unpaid" || s === "incomplete" || s === "paused" ? "past_due" : "canceled";
  const plan = state.metadata?.plan in PLANS ? state.metadata.plan : null;
  const billing = state.metadata?.billing === "year" ? "year" : state.metadata?.billing === "month" ? "month" : null;
  const period = periodOf(state);
  run(
    "UPDATE subscriptions SET status = ?, plan = COALESCE(?, plan), billing = COALESCE(?, billing), current_period_start = COALESCE(?, current_period_start), current_period_end = COALESCE(?, current_period_end), stripe_event_at = MAX(COALESCE(stripe_event_at, 0), ?), updated_at = ? WHERE user_id = ? AND stripe_subscription_id = ?",
    status,
    plan,
    billing,
    period.start,
    period.end,
    at,
    now(),
    userId,
    o.id,
  );
  syncAllowance(userId);
}
