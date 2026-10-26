/** Rapprochement à la demande : seule la réponse authentifiée Stripe peut débloquer un achat. */
import {all,now,one,run} from './db';
import {HttpError} from './auth';
import {handleStripeEvent,paymentMode,stripeGet,subId} from './payments';
import {L} from './i18n-server';

export async function reconcilePayments(userId:string,sessionId?:string){
 const rows=all<{id:string;kind:string;plan:string|null;project_id:string|null}>(`SELECT * FROM checkout_sessions WHERE user_id=? ${sessionId?'AND id=?':"AND status='open'"} ORDER BY created_at DESC LIMIT 20`,userId,...(sessionId?[sessionId]:[]));
 if(sessionId&&!rows.length)throw new HttpError(404,L('Paiement introuvable.','Payment not found.'));
 const result={checked:0,confirmed:0,pending:0,unavailable:0};
 for(const row of rows){
  result.checked++;
  const s=await stripeGet(`checkout/sessions/${encodeURIComponent(row.id)}`);
  if(!s){result.unavailable++;continue;}
  const kind=row.kind==='appointment'?'call_v2':`${row.kind}_v2`;
  if(s.id!==row.id||s.client_reference_id!==userId||s.metadata?.user_id!==userId||s.metadata?.kind!==kind||(row.project_id&&s.metadata.project_id!==row.project_id)||(row.plan&&s.metadata.plan!==row.plan)){result.unavailable++;continue;}
  if(s.status==='expired'){run("UPDATE checkout_sessions SET status='expired',completed_at=? WHERE id=? AND user_id=?",now(),row.id,userId);continue;}
  if(s.status!=='complete'||!['paid','no_payment_required'].includes(s.payment_status)){result.pending++;continue;}
  try{await handleStripeEvent({id:`reconcile:${s.id}`,type:'checkout.session.completed',created:Number(s.created)||Math.floor(now()/1000),...(typeof s.livemode==='boolean'?{livemode:s.livemode}:{}),data:{object:s}});result.confirmed++;}
  catch{result.unavailable++;}
 }
 const mutations=await (await import('./payments-v2')).reconcileSubscriptionMutations(userId);
 for(const key of ['checked','confirmed','pending','unavailable'] as const)result[key]+=mutations[key];
 return result;
}

const safeInvoiceUrl=(raw:unknown)=>{try{const u=new URL(String(raw));return u.protocol==='https:'&&['invoice.stripe.com','pay.stripe.com'].includes(u.hostname)?u.toString():null;}catch{return null;}};
export async function invoicesOf(userId:string){
 const customers=all<{customer:string}>('SELECT DISTINCT stripe_customer_id customer FROM subscriptions WHERE (owner_user_id=? OR user_id=?) AND stripe_customer_id IS NOT NULL LIMIT 20',userId,userId);
 const invoices:{id:string;status:string;amountEur:number|null;currency:string;createdAt:number;url:string|null;pdf:string|null}[]=[];
 let unavailable=false;
 for(const {customer} of customers){const remote=await stripeGet(`invoices?customer=${encodeURIComponent(customer)}&limit=20`);if(!Array.isArray(remote?.data)){unavailable=true;continue;}for(const x of remote.data){if(subId(x.customer)!==customer||typeof x.id!=='string')continue;invoices.push({id:x.id,status:String(x.status??''),amountEur:x.currency==='eur'?(Number(x.amount_paid)||0)/100:null,currency:String(x.currency??''),createdAt:(Number(x.created)||0)*1000,url:safeInvoiceUrl(x.hosted_invoice_url),pdf:safeInvoiceUrl(x.invoice_pdf)});}}
 return {mode:paymentMode(),available:!unavailable&&paymentMode()!=='unconfigured',invoices:invoices.sort((a,b)=>b.createdAt-a.createdAt)};
}
