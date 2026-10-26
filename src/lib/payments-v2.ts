/**
 * Paiements Stripe des forfaits V2 : UN ABONNEMENT = UN PROJET.
 *
 *  - Nouvel abonnement (nouveau projet) : session Checkout « subscription » ; à la confirmation SERVEUR du paiement
 *    (webhook signé), un abonnement « en attente de création de projet » est créé, jamais deux pour le même
 *    abonnement Stripe (index unique). L'URL de succès du navigateur ne débloque rien.
 *  - Réactivation d'un projet résilié : nouvelle session rattachée au MÊME projet (jamais un autre).
 *  - Changement de forfait d'un projet : mise à jour de son abonnement Stripe (proratisation Stripe) ; les autres
 *    projets du compte ne changent pas.
 *  - Résiliation : à la fin de la période payée (cancel_at_period_end), réversible tant qu'elle n'a pas eu lieu.
 *  - Recharge IA de 10 € : rattachée à UN projet, budget fournisseur = 50 % de son HT, pour ce seul projet.
 * Les sessions ouvertes sont réutilisées (actualisation, double clic) : jamais deux paiements pour une même demande.
 * Aucun paiement réel en test : Stripe n'est appelé qu'avec la clé enregistrée dans l'administration (mode test).
 */
import { all, id, logError, now, one, run, tx } from "./db";
import { alignPeriod, creditPackBudget, revokeTopupBudget, syncAllowance } from "./billing";
import { HttpError } from "./auth";
import { PLANS, TOPUP_PRICE_EUR, type Billing, type PlanId } from "./plans";
import { PAID_STATUSES, subscriptionOfProject, type ProjectSubscription } from "./project-billing";
import { createSubscription } from "./project-subscriptions";
import { appUrl } from "./settings";
import { L, uiLang } from "./i18n-server";
import { ENDED, periodOf, stripe, stripeGet, subId } from "./payments";
import { checkoutSession } from './checkout-intents';
import {stripeMutation,pendingMutations,finishMutation} from './billing-mutations';

const logStripe = (scope: string, err: Error, userId: string) => logError(scope, err, { userId });

function assertOwner(userId:string,projectId:string){if(!one('SELECT 1 FROM projects WHERE id=? AND user_id=?',projectId,userId))throw new HttpError(404,L('Projet introuvable.','Project not found.'));}

const planLine = (plan: PlanId, billing: Billing, prefix: Record<string, string>) => ({
  "line_items[0][quantity]": "1",
  "line_items[0][price_data][currency]": "eur",
  "line_items[0][price_data][unit_amount]": String(Math.round(PLANS[plan].price[billing] * 100)),
  "line_items[0][price_data][tax_behavior]": "inclusive",
  "line_items[0][price_data][recurring][interval]": billing,
  "line_items[0][price_data][product_data][name]": L(
    `E-COM STUDIO IA — forfait ${PLANS[plan].name.fr} (${billing === "year" ? "annuel" : "mensuel"}) — 1 projet`,
    `E-COM STUDIO IA — ${PLANS[plan].name.en} plan (${billing === "year" ? "yearly" : "monthly"}) — 1 project`,
  ),
  ...prefix,
});

/**
 * Session de paiement d'un NOUVEL abonnement (un nouveau projet), ou de la réactivation d'un projet résilié
 * (`projectId`). Renvoie l'URL Stripe (réutilisée si une session identique est déjà ouverte).
 */
export async function subscriptionCheckout(user: { id: string; email: string }, plan: PlanId, billing: Billing, projectId: string | null = null) {
  if (projectId) {
    assertOwner(user.id,projectId);
    const sub = subscriptionOfProject(projectId);
    if (sub && (PAID_STATUSES as readonly string[]).includes(sub.status)) throw new HttpError(409, L("Ce projet a déjà un abonnement actif : changez son forfait au lieu d'en souscrire un autre.", "This project already has an active subscription: change its plan instead of subscribing again."));
  }
  const kind = projectId ? "reactivate" : "subscription";
  const meta = { kind: projectId ? "reactivate_v2" : "subscription_v2", plan, billing, user_id: user.id, ...(projectId ? { project_id: projectId } : {}) };
  const params: Record<string, string> = {
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: user.id,
    ...Object.fromEntries(Object.entries(meta).map(([k, v]) => [`metadata[${k}]`, v])),
    ...Object.fromEntries(Object.entries(meta).map(([k, v]) => [`subscription_data[metadata][${k}]`, v])),
    success_url: `${appUrl()}/studio?paiement=ok`,
    cancel_url: `${appUrl()}/studio?paiement=annule`,
    locale: uiLang(),
    ...planLine(plan, billing, {}),
  };
  return checkoutSession({userId:user.id,kind,plan,billing,projectId},params);
}

/** Session de paiement d'une recharge IA de 10 € pour UN projet (abonnement actif requis). */
export async function topupCheckout(user: { id: string; email: string }, projectId: string) {
  assertOwner(user.id,projectId);
  const sub = subscriptionOfProject(projectId);
  if (!sub || !(PAID_STATUSES as readonly string[]).includes(sub.status)) throw new HttpError(402, L("Les recharges IA s'ajoutent à l'abonnement actif d'un projet.", "AI top-ups are added to a project's active subscription."));
  return checkoutSession({userId:user.id,kind:'topup',projectId},
    {
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      "metadata[kind]": "topup_v2",
      "metadata[user_id]": user.id,
      "metadata[project_id]": projectId,
      success_url: `${appUrl()}/studio?paiement=ok`,
      cancel_url: `${appUrl()}/studio?paiement=annule`,
      locale: uiLang(),
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(Math.round(TOPUP_PRICE_EUR * 100)),
      "line_items[0][price_data][tax_behavior]": "inclusive",
      "line_items[0][price_data][product_data][name]": L("E-COM STUDIO IA — recharge IA (projet)", "E-COM STUDIO IA — AI top-up (project)"),
    },
  );
}

function stripeSubOf(projectId: string): ProjectSubscription & { stripe_subscription_id: string } {
  const sub = subscriptionOfProject(projectId);
  if (!sub || !(PAID_STATUSES as readonly string[]).includes(sub.status)) throw new HttpError(409, L("Ce projet n'a pas d'abonnement actif.", "This project has no active subscription."));
  if (!sub.stripe_subscription_id) throw new HttpError(409, L("Cet abonnement est géré par l'équipe E-COM STUDIO IA : contactez-la pour le modifier.", "This subscription is managed by the E-COM STUDIO IA team: contact them to change it."));
  return sub as ProjectSubscription & { stripe_subscription_id: string };
}

/**
 * Changement de forfait d'UN projet (hausse ou baisse) : son abonnement Stripe est mis à jour (proratisation par
 * Stripe) ; aucun nouveau projet n'est créé, les autres projets ne changent pas. Une hausse est facturée tout de suite.
 */
function paidRemote(o:any){return ['active','trialing'].includes(o?.status)&&!o?.pending_update;}
function desiredRemote(o:any,plan:PlanId,billing:Billing){return paidRemote(o)&&o.metadata?.plan===plan&&o.metadata?.billing===billing&&Number(o.items?.data?.[0]?.price?.unit_amount)===Math.round(PLANS[plan].price[billing]*100);}
function saveRemotePlan(sub:ProjectSubscription,remote:any,plan:PlanId,billing:Billing){
 if(!paidRemote(remote))throw new HttpError(402,L('Le paiement du changement n’est pas finalisé. Votre forfait précédent est conservé ; vérifiez le paiement avec l’assistance.','Payment for the change is not complete. Your previous plan is preserved; check the payment with support.'),'payment_not_completed');
 const period=periodOf(remote);
 run('UPDATE subscriptions SET plan=?,billing=?,price_cents=?,current_period_start=COALESCE(?,current_period_start),current_period_end=COALESCE(?,current_period_end),updated_at=? WHERE user_id=?',plan,billing,Math.round(PLANS[plan].price[billing]*100),period.start,period.end,now(),sub.user_id);
 syncAllowance(sub.user_id);
}
function saveRemoteCancellation(sub:ProjectSubscription,remote:any){
 run('UPDATE subscriptions SET cancel_at_period_end=?,status=CASE WHEN ? THEN ? ELSE status END,updated_at=? WHERE user_id=?',remote.cancel_at_period_end?1:0,ENDED.has(remote.status)?1:0,'canceled',now(),sub.user_id);syncAllowance(sub.user_id);
}
export async function changeProjectPlan(projectId:string,plan:PlanId,billing:Billing){
 const sub=stripeSubOf(projectId);
 if(sub.plan===plan&&sub.billing===billing)return sub;
 const remote=await stripeGet(`subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`),item=remote?.items?.data?.[0];
 if(!item?.id||!item?.price?.product)throw new HttpError(502,L('Le service de paiement ne répond pas : vérifiez plus tard, sans nouvel achat.','The payment service is not responding: check later without a new purchase.'));
 const params:Record<string,string>={
  'items[0][id]':item.id,'items[0][price_data][currency]':'eur','items[0][price_data][product]':String(typeof item.price.product==='string'?item.price.product:item.price.product.id),
  'items[0][price_data][unit_amount]':String(Math.round(PLANS[plan].price[billing]*100)),'items[0][price_data][tax_behavior]':'inclusive','items[0][price_data][recurring][interval]':billing,
  proration_behavior:PLANS[plan].price.month>PLANS[(sub.plan as PlanId)??'creer'].price.month?'always_invoice':'create_prorations',payment_behavior:'error_if_incomplete','metadata[plan]':plan,'metadata[billing]':billing,
 };
 await stripeMutation(sub.owner_user_id??sub.user_id,`sub:${sub.user_id}`,`subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`,params,o=>saveRemotePlan(sub,o,plan,billing),desiredRemote(remote,plan,billing)?remote:undefined);
 return subscriptionOfProject(projectId)!;
}
/** Résiliation/reprise explicites : une identité distincte par action, conservée lors de sa reprise. */
export async function setProjectCancellation(projectId:string,cancel:boolean){
 const sub=stripeSubOf(projectId),path=`subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`,remote=await stripeGet(path);
 if(!remote)throw new HttpError(502,L('Le service de paiement est indisponible : vérifiez plus tard.','The payment service is unavailable: check later.'));
 await stripeMutation(sub.owner_user_id??sub.user_id,`sub:${sub.user_id}`,path,{cancel_at_period_end:cancel?'true':'false'},o=>saveRemoteCancellation(sub,o),!!remote.cancel_at_period_end===cancel?remote:undefined);
 return subscriptionOfProject(projectId)!;
}
/** Rapprochement serveur des écritures interrompues : lecture seule chez Stripe, jamais de nouvel achat. */
export async function reconcileSubscriptionMutations(userId:string){
 const result={checked:0,confirmed:0,pending:0,unavailable:0};
 for(const row of pendingMutations(userId)){
  result.checked++;const sub=one<ProjectSubscription>('SELECT * FROM subscriptions WHERE user_id=? AND owner_user_id=?',row.scope.replace(/^sub:/,''),userId);
  if(!sub?.stripe_subscription_id){result.unavailable++;continue;}
  const remote=await stripeGet(`subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`);if(!remote){result.unavailable++;continue;}
  const params=JSON.parse(row.params_json),plan=params['metadata[plan]'] as PlanId,billing=params['metadata[billing]'] as Billing;
  if(plan in PLANS&&desiredRemote(remote,plan,billing)){finishMutation(row,remote,o=>saveRemotePlan(sub,o,plan,billing));result.confirmed++;}
  else if('cancel_at_period_end' in params&&!!remote.cancel_at_period_end===(params.cancel_at_period_end==='true')){finishMutation(row,remote,o=>saveRemoteCancellation(sub,o));result.confirmed++;}
  else result.pending++;
 }
 return result;
}

// ------------------------------------------------------------------ webhooks

const paidSession = (o: any) => o.payment_status === "paid" || o.payment_status === "no_payment_required";
const markSession = (sessionId: string, status: "complete" | "expired") => run("UPDATE checkout_sessions SET status = ?, completed_at = ? WHERE id = ?", status, now(), sessionId);
const statusOf = (s: string) => (s === "active" || s === "trialing" ? "active" : s === "past_due" || s === "unpaid" || s === "incomplete" || s === "paused" ? "past_due" : "canceled");

/** Traite un événement Stripe des forfaits V2 ; renvoie false s'il ne les concerne pas (ancien traitement). */
export async function applyV2Event(evt: any): Promise<boolean> {
  const o = evt?.data?.object ?? {};
  const kind = o.metadata?.kind;
  switch (evt?.type) {
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const sid=subId(o.subscription??o.parent?.subscription_details?.subscription);
      const row=sid?one<ProjectSubscription & {stripe_event_at:number|null}>('SELECT * FROM subscriptions WHERE stripe_subscription_id=?',sid):null;
      if(!row)return false;
      const remote=await stripeGet(`subscriptions/${encodeURIComponent(sid!)}`);
      if(!remote)throw new Error('Invoice subscription state unavailable; retry later');
      await applySubscriptionState(row,{...evt,type:'customer.subscription.updated'},remote);
      if(evt.type==='invoice.paid'){
       const cents=Number(o.amount_paid);if(!Number.isSafeInteger(cents)||cents<0)throw new Error('Invalid invoice amount');
       run("INSERT OR IGNORE INTO payments(id,user_id,kind,amount_cents,status,stripe_id,label,project_id,account_key,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",id(),row.owner_user_id??row.user_id,'subscription',cents,'paid',o.id,`${row.plan}:${row.billing}`,row.project_id,row.user_id,now());
      }
      return true;
    }
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (!["subscription_v2", "reactivate_v2", "topup_v2", "call_v2"].includes(kind)) return false;
      const userId = o.metadata?.user_id ?? o.client_reference_id;
      if (!userId || !one("SELECT 1 FROM users WHERE id = ?", userId)) return true;
      if(o.client_reference_id&&o.client_reference_id!==userId)throw new Error('Stripe checkout owner mismatch');
      const local=one<{user_id:string;kind:string;plan:string|null;billing:string|null;project_id:string|null}>('SELECT * FROM checkout_sessions WHERE id=?',o.id);
      const localKind=kind==='subscription_v2'?'subscription':kind==='reactivate_v2'?'reactivate':kind==='topup_v2'?'topup':'appointment';
      if(local&&(local.user_id!==userId||local.kind!==localKind||(local.plan&&local.plan!==o.metadata.plan)||(local.billing&&local.billing!==o.metadata.billing)||(local.project_id&&local.project_id!==o.metadata.project_id)))throw new Error('Stripe checkout does not match the saved request');
      // Paiement différé (SEPA…) : rien tant que le paiement n'est pas confirmé.
      if (!paidSession(o)) return true;
      if (kind === "topup_v2") applyTopup(userId, o);
      else if (kind === "call_v2") await applyCallSession(userId, o);
      else await applySubscriptionSession(userId, kind === "reactivate_v2" ? (o.metadata?.project_id ?? null) : null, evt, o);
      markSession(o.id, "complete");
      return true;
    }
    case "checkout.session.expired":
      if (o.id) markSession(o.id, "expired");
      // Rendez-vous non payé : le créneau se libère.
      if (kind === "call_v2" && o.metadata?.booking_id) run("UPDATE call_bookings SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE id = ? AND status = 'pending_payment'", now(), now(), o.metadata.booking_id);
      return ["subscription_v2", "reactivate_v2", "topup_v2", "call_v2"].includes(kind);
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const row = o.id ? one<ProjectSubscription & { stripe_event_at: number | null }>("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?", o.id) : null;
      // Anciens abonnements (un par compte, avant les forfaits V2) : ancien traitement.
      if (!row || (row.source === "legacy" && row.user_id === row.owner_user_id && !o.metadata?.kind)) return false;
      await applySubscriptionState(row, evt, o);
      return true;
    }
    case "charge.refunded": {
      const pi = subId(o.payment_intent);
      const pay = pi ? one<{ id: string; account_key: string | null; kind: string; amount_cents: number; refunded_cents: number }>("SELECT * FROM payments WHERE payment_intent = ?", pi) : null;
      if (!pay) return false;
      tx(()=>{
       const fresh=one<typeof pay>('SELECT * FROM payments WHERE id=?',pay.id)!;
       const refunded=Math.min(fresh.amount_cents,Math.max(0,Number(o.amount_refunded)||0));
       const delta=refunded-(fresh.refunded_cents??0);if(delta<=0)return;
       if(fresh.kind==='topup'&&fresh.account_key)revokeTopupBudget(fresh.account_key,delta/100,`refund:${o.id}:${refunded}`,L('Recharge IA remboursée','AI top-up refunded'));
       run('UPDATE payments SET refunded_cents=? WHERE id=?',refunded,fresh.id);
       if(fresh.kind==='call'&&refunded>=fresh.amount_cents)run('UPDATE call_bookings SET refunded=1,updated_at=? WHERE payment_intent=?',now(),pi);
      });
      return true;
    }
  }
  return false;
}

function applyTopup(userId: string, o: any) {
  const projectId = o.metadata?.project_id;
  const sub = projectId ? subscriptionOfProject(projectId) : null;
  const owner = projectId ? one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId) : null;
  if (!sub || !owner || owner.user_id !== userId) {
    logStripe("stripe:topup", new Error(`Recharge ${o.id} : projet ${projectId} introuvable ou d'un autre compte — non créditée`), userId);
    return;
  }
  const amount = Number(o.amount_total);
  if(!Number.isSafeInteger(amount)||amount<=0||(o.currency&&o.currency!=='eur'))throw new Error('Invalid paid top-up amount or currency');
  tx(()=>{
  run(
    "INSERT OR IGNORE INTO payments (id, user_id, kind, amount_cents, status, stripe_id, label, project_id, account_key, payment_intent, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    id(),
    userId,
    "topup",
    amount,
    "paid",
    o.id,
    "topup",
    projectId,
    sub.user_id,
    subId(o.payment_intent),
    now(),
  );
  // Une seule fois par paiement (relivraison du webhook, deux événements pour la même session).
  const receipt=one<{user_id:string;account_key:string|null;amount_cents:number;refunded_cents:number}>('SELECT * FROM payments WHERE stripe_id=?',o.id)!;
  if(receipt.user_id!==userId||receipt.account_key!==sub.user_id||receipt.amount_cents!==amount)throw new Error('Saved top-up receipt mismatch');
  // Répare aussi un reçu sans crédit issu de l'ancien code, sur preuve de paiement et hors remboursement.
  if(!one("SELECT 1 FROM ledger WHERE type='topup' AND ref=?",`stripe:${o.id}`)){
   if(receipt.refunded_cents>0)throw new Error('Historical refunded top-up needs reconciliation before credit');
   creditPackBudget(sub.user_id,amount/100,`stripe:${o.id}`,L('Recharge IA','AI top-up'));
  }
  });
}

async function applySubscriptionSession(userId: string, projectId: string | null, evt: any, o: any) {
  const stripeSub = subId(o.subscription);
  const plan: PlanId = o.metadata?.plan in PLANS ? o.metadata.plan : "creer";
  if(!(o.metadata?.plan in PLANS))throw new Error('Unknown paid subscription plan');
  const billing: Billing = o.metadata?.billing === "year" ? "year" : "month";
  const recordPayment = (key: string, pid: string | null) =>
    run("INSERT OR IGNORE INTO payments (id, user_id, kind, amount_cents, status, stripe_id, label, project_id, account_key, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), userId, "subscription", Number(o.amount_total) || 0, "paid", o.id, `${plan}:${billing}`, pid, key, now());
  // Déjà appliquée (relivraison, événements en double) : jamais un second abonnement ni un second projet.
  const existing = stripeSub ? one<ProjectSubscription>("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?", stripeSub) : null;
  if(existing){if((existing.owner_user_id??existing.user_id)!==userId)throw new Error('Stripe subscription owner mismatch');return void tx(()=>{syncAllowance(existing.user_id);recordPayment(existing.user_id,existing.project_id);});}
  const remote = stripeSub ? await stripeGet(`subscriptions/${encodeURIComponent(stripeSub)}`) : null;
  if(!remote)throw new Error('Stripe subscription unavailable; retry event without granting access');
  if (remote && ENDED.has(remote.status)) return;
  if(!['active','trialing'].includes(remote.status))throw new Error('Stripe subscription not active; no access granted');
  const period = periodOf(remote);
  const priceCents = Math.round(PLANS[plan].price[billing] * 100);
  if (projectId) {
    // Réactivation : le MÊME projet reprend ses droits (son abonnement, résilié, est réutilisé ; jamais un autre projet).
    const sub = subscriptionOfProject(projectId);
    const owner = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId);
    if (!sub || !owner || owner.user_id !== userId) {
      logStripe("stripe:reactivate", new Error(`Réactivation ${o.id} : projet ${projectId} introuvable ou d'un autre compte`), userId);
      return;
    }
    tx(() => {
      run(
        "UPDATE subscriptions SET status = 'active', plan = ?, billing = ?, stripe_customer_id = ?, stripe_subscription_id = ?, current_period_start = ?, current_period_end = ?, stripe_checkout_at = ?, stripe_event_at = ?, price_cents = ?, cancel_at_period_end = 0, updated_at = ? WHERE user_id = ?",
        plan,
        billing,
        subId(o.customer),
        stripeSub,
        period.start,
        period.end,
        Number(o.created) || null,
        Number(evt.created) || null,
        priceCents,
        now(),
        sub.user_id,
      );
      alignPeriod(sub.user_id, period.start ?? now(), billing === "month" ? period.end : null);
      syncAllowance(sub.user_id);
      recordPayment(sub.user_id, projectId);
    });
    return;
  }
  tx(()=>{
  let key: string;
  try {
    key = createSubscription(userId, { plan, billing, status: "active", source: "stripe", stripeCustomerId: subId(o.customer), stripeSubscriptionId: stripeSub, periodStart: period.start, periodEnd: billing === "month" ? period.end : null, priceCents });
  } catch (e) {
    // Deux livraisons simultanées : l'autre a déjà créé l'abonnement (index unique sur l'abonnement Stripe).
    const again = stripeSub ? one<ProjectSubscription>("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?", stripeSub) : null;
    if (!again) throw e;
    key = again.user_id;
  }
  syncAllowance(key);
  recordPayment(key, null);
  });
}

async function applySubscriptionState(row: ProjectSubscription & { stripe_event_at: number | null }, evt: any, o: any) {
  const at = Number(evt.created) || 0;
  // Ordre de livraison non garanti : un état plus ancien que le dernier appliqué est ignoré.
  if (row.stripe_event_at && at && at < row.stripe_event_at) return;
  if(row.status==='canceled'&&evt.type!=='customer.subscription.deleted')return;
  if(row.stripe_event_at===at&&evt.type!=='customer.subscription.deleted'){
    const remote=await stripeGet(`subscriptions/${encodeURIComponent(o.id)}`);
    if(!remote)throw new Error('Stripe state ambiguous in the same second; retry event');
    o=remote;
  }
  const status = evt.type === "customer.subscription.deleted" || ENDED.has(String(o.status)) ? "canceled" : statusOf(String(o.status ?? ""));
  const plan = o.metadata?.plan in PLANS ? o.metadata.plan : null;
  const billing = o.metadata?.billing === "year" ? "year" : o.metadata?.billing === "month" ? "month" : null;
  const period = periodOf(o);
  // Nouveau prix (ancien abonné passé au nouveau tarif, ou changement de forfait) : pris en compte au renouvellement.
  const unit = Number(o.items?.data?.[0]?.price?.unit_amount) || null;
  const renewed = period.start && row.current_period_start && period.start > row.current_period_start;
  tx(()=>{run(
    "UPDATE subscriptions SET status = ?, plan = COALESCE(?, plan), billing = COALESCE(?, billing), current_period_start = COALESCE(?, current_period_start), current_period_end = COALESCE(?, current_period_end), cancel_at_period_end = ?, price_cents = CASE WHEN ? THEN COALESCE(?, price_cents) ELSE price_cents END, stripe_event_at = MAX(COALESCE(stripe_event_at, 0), ?), updated_at = ? WHERE user_id = ?",
    status,
    plan,
    billing,
    period.start,
    period.end,
    o.cancel_at_period_end ? 1 : 0,
    renewed ? 1 : 0,
    unit,
    at,
    now(),
    row.user_id,
  );
  syncAllowance(row.user_id);
  });
}

// ------------------------------------------------------------------ anciens abonnés : nouveau prix au renouvellement

export type RepriceResult = { key: string; projectId: string | null; plan: PlanId; from: number; to: number; ok: boolean; error?: string };

/**
 * Anciens abonnés (tarifs d'avant les forfaits V2) : le nouveau prix de leur forfait s'appliquera à leur PROCHAIN
 * renouvellement (choix du propriétaire). Le prix de l'abonnement Stripe est changé SANS proratisation : rien n'est
 * facturé maintenant, la période en cours reste au prix déjà payé (et son budget IA aussi). Le client est prévenu dans
 * son espace. Lancé à la main par l'administration (jamais automatiquement) ; `dryRun` liste sans rien changer.
 */
export async function repriceLegacySubscriptions(dryRun = true): Promise<RepriceResult[]> {
  const rows = all<ProjectSubscription>("SELECT * FROM subscriptions WHERE source = 'legacy' AND status = 'active' AND stripe_subscription_id IS NOT NULL");
  const out: RepriceResult[] = [];
  for (const s of rows) {
    const plan = ((s.plan ?? "creer") in PLANS ? s.plan : "creer") as PlanId;
    const billing: Billing = s.billing === "year" ? "year" : "month";
    const to = Math.round(PLANS[plan].price[billing] * 100);
    const r: RepriceResult = { key: s.user_id, projectId: s.project_id, plan, from: s.price_cents ?? 0, to, ok: true };
    out.push(r);
    if (dryRun || s.price_cents === to) continue;
    try {
      const remote = await stripeGet(`subscriptions/${encodeURIComponent(s.stripe_subscription_id!)}`);
      const item = remote?.items?.data?.[0];
      if (!item?.id || !item?.price?.product) throw new Error("abonnement Stripe illisible");
      if (Number(item.price.unit_amount) === to) continue;
      await stripe(
        `subscriptions/${encodeURIComponent(s.stripe_subscription_id!)}`,
        {
          "items[0][id]": item.id,
          "items[0][price_data][currency]": "eur",
          "items[0][price_data][product]": String(typeof item.price.product === "string" ? item.price.product : item.price.product.id),
          "items[0][price_data][unit_amount]": String(to),
          "items[0][price_data][tax_behavior]": "inclusive",
          "items[0][price_data][recurring][interval]": billing,
          proration_behavior: "none",
          "metadata[kind]": "subscription_v2",
          "metadata[plan]": plan,
          "metadata[billing]": billing,
        },
        `reprice:${s.user_id}:${to}`,
      );
      // price_cents reste l'ancien prix jusqu'au renouvellement (mis à jour par customer.subscription.updated).
      const owner = s.owner_user_id ?? s.user_id;
      const price = (c: number) => (c / 100).toFixed(2).replace(".", ",");
      run(
        "INSERT INTO notifications (id, user_id, project_id, level, title, body, created_at) VALUES (?,?,?,?,?,?,?)",
        id(),
        owner,
        s.project_id,
        "info",
        L("Nouveau tarif de votre forfait", "New price for your plan"),
        L(
          `Votre forfait ${PLANS[plan].name.fr} passera de ${price(r.from)} € à ${price(to)} € TTC à votre prochain renouvellement. Rien ne change pour la période en cours. Vous pouvez résilier à tout moment depuis « Mes projets ».`,
          `Your ${PLANS[plan].name.en} plan will go from €${price(r.from)} to €${price(to)} incl. VAT at your next renewal. Nothing changes for the current period. You can cancel at any time from "My projects".`,
        ),
        now(),
      );
    } catch (e) {
      r.ok = false;
      r.error = (e as Error).message;
      logError("stripe:reprice", e, { userId: s.owner_user_id ?? undefined });
    }
  }
  return out;
}

// ------------------------------------------------------------------ rendez-vous téléphoniques

/** Session de paiement d'un rendez-vous réservé (en attente de paiement). Le webhook confirme le rendez-vous. */
export async function callCheckout(user: { id: string; email: string }, bookingId: string) {
  const { attachCallSession, PAYMENT_HOLD_MS } = await import("./appointments");
  const b = one<{ id: string; status: string; price_cents: number; project_id: string; stripe_session: string | null; created_at: number }>("SELECT * FROM call_bookings WHERE id = ? AND user_id = ?", bookingId, user.id);
  if (!b || b.status !== "pending_payment" || b.created_at < now() - PAYMENT_HOLD_MS) throw new HttpError(409, L("Cette réservation a expiré : choisissez de nouveau un créneau.", "This booking has expired: pick a slot again."));
  return checkoutSession({userId:user.id,kind:'appointment',projectId:b.project_id,ref:b.id},
    {
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      "metadata[kind]": "call_v2",
      "metadata[user_id]": user.id,
      "metadata[booking_id]": b.id,
      "metadata[project_id]": b.project_id,
      success_url: `${appUrl()}/studio/rendez-vous?paiement=ok`,
      cancel_url: `${appUrl()}/studio/rendez-vous?paiement=annule`,
      locale: uiLang(),
      // La session expire avant la fin du blocage du créneau (31 min ; Stripe exige au moins 30 min).
      expires_at: String(Math.floor((now() + 31 * 60_000) / 1000)),
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(b.price_cents),
      "line_items[0][price_data][tax_behavior]": "inclusive",
      "line_items[0][price_data][product_data][name]": L("E-COM STUDIO IA — rendez-vous téléphonique (60 min)", "E-COM STUDIO IA — phone appointment (60 min)"),
    },
    (sessionId)=>attachCallSession(b.id,sessionId),
  );
}

/** Remboursement d'un rendez-vous annulé dans les délais (appel serveur à Stripe). */
export async function refundCall(bookingId: string, paymentIntent: string, cents: number) {
  const receipt=await stripe("refunds", { payment_intent: paymentIntent, amount: String(cents), "metadata[booking_id]": bookingId }, `refund:call:${bookingId}`);
  if(receipt.status==='succeeded'){run("UPDATE call_bookings SET refunded = 1, updated_at = ? WHERE id = ?", now(), bookingId);return 'done' as const;}
  if(['pending','requires_action'].includes(receipt.status))return 'pending' as const;
  throw new Error('Refund not confirmed by Stripe');
}

async function applyCallSession(userId: string, o: any) {
  const { confirmPaidCall } = await import("./appointments");
  const bookingId = o.metadata?.booking_id;
  const b = bookingId ? one<{ user_id: string; price_cents: number }>("SELECT user_id, price_cents FROM call_bookings WHERE id = ?", bookingId) : null;
  if (!b || b.user_id !== userId) {
    logStripe("stripe:call", new Error(`Rendez-vous ${bookingId} introuvable pour le paiement ${o.id}`), userId);
    return;
  }
  if(!Number.isSafeInteger(Number(o.amount_total))||Number(o.amount_total)!==b.price_cents)throw new Error('Call payment amount does not match the booking');
  run("INSERT OR IGNORE INTO payments (id, user_id, kind, amount_cents, status, stripe_id, label, project_id, payment_intent, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), userId, "call", Number(o.amount_total) || b.price_cents, "paid", o.id, "call", o.metadata?.project_id ?? null, subId(o.payment_intent), now());
  if (confirmPaidCall(bookingId, subId(o.payment_intent)) === "lost") {
    // Payé trop tard et le créneau a été repris entre-temps : remboursement automatique, l'équipe est prévenue.
    const pi = subId(o.payment_intent);
    if (pi) await refundCall(bookingId, pi, b.price_cents).catch((e) => logStripe("stripe:call-refund", e as Error, userId));
    const { notifyAdmins } = await import("./payments");
    notifyAdmins("Rendez-vous payé sans créneau", `Le paiement ${o.id} est arrivé après l'expiration de la réservation ${bookingId} et le créneau a été repris : remboursement demandé à Stripe.`);
  }
}
