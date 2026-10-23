/** Checkout persistant : un clic/reprise = une intention et la même clé Stripe, même à cheval sur une minute. */
import { createHash } from 'node:crypto';
import { id, now, one, run, tx } from './db';
import { HttpError } from './auth';
import { stripe } from './payments';
import { L } from './i18n-server';

type Input = {userId:string;kind:'subscription'|'reactivate'|'topup'|'appointment';plan?:string;billing?:string;projectId?:string|null;ref?:string};
type Intent = {id:string;params_json:string;lease_until:number;created_at:number;session_id:string|null};
const REUSE_MS=23*3600_000;
const pending=()=>new HttpError(409,L('Un paiement est déjà en préparation. Attendez puis reprenez cette même demande, sans créer un autre achat.','A payment is already being prepared. Wait, then resume this same request without starting another purchase.'),'payment_pending');

export async function checkoutSession(input:Input,params:Record<string,string>,onSaved?:(sessionId:string)=>void){
 const signature=createHash('sha256').update(JSON.stringify([input.userId,input.kind,input.plan??'',input.billing??'',input.projectId??'',input.ref??''])).digest('hex');
 const prepared=tx(()=>{
  const previous=one<{id:string;url:string;created_at:number}>("SELECT id,url,created_at FROM checkout_sessions WHERE user_id=? AND kind=? AND COALESCE(plan,'')=? AND COALESCE(billing,'')=? AND COALESCE(project_id,'')=? AND COALESCE(ref,'')=? AND status='open' ORDER BY created_at DESC LIMIT 1",input.userId,input.kind,input.plan??'',input.billing??'',input.projectId??'',input.ref??'');
  if(previous){if(previous.created_at<now()-REUSE_MS)throw pending();return {url:previous.url};}
  let intent=one<Intent>('SELECT * FROM checkout_intents WHERE signature=? AND closed_at IS NULL',signature);
  if(intent?.session_id){run('UPDATE checkout_intents SET closed_at=? WHERE id=?',now(),intent.id);intent=undefined;}
  if(intent&&intent.created_at<now()-REUSE_MS)throw new HttpError(409,L('Cette ancienne tentative doit être vérifiée avec l’assistance avant un nouvel achat.','This older attempt needs to be checked with support before another purchase.'),'payment_reconciliation_required');
  if(intent?.lease_until&&intent.lease_until>now())throw pending();
  if(!intent){const key=id();run('INSERT INTO checkout_intents(id,signature,user_id,params_json,lease_until,created_at) VALUES(?,?,?,?,?,?)',key,signature,input.userId,JSON.stringify({...params,'metadata[checkout_request]':key}),now()+60_000,now());intent=one<Intent>('SELECT * FROM checkout_intents WHERE id=?',key)!;}
  else run('UPDATE checkout_intents SET lease_until=? WHERE id=?',now()+60_000,intent.id);
  return {intent};
 });
 if('url' in prepared)return {url:prepared.url!,reused:true};
 const intent=prepared.intent!;
 try{
  const s=await stripe('checkout/sessions',JSON.parse(intent.params_json),`checkout:${intent.id}`);
  if(typeof s.id!=='string'||typeof s.url!=='string')throw pending();
  tx(()=>{run('INSERT OR IGNORE INTO checkout_sessions(id,user_id,kind,plan,billing,project_id,ref,url,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',s.id,input.userId,input.kind,input.plan??null,input.billing??null,input.projectId??null,input.ref??null,s.url,'open',now());run('UPDATE checkout_intents SET session_id=?,lease_until=0 WHERE id=?',s.id,intent.id);onSaved?.(s.id);});
  return {url:s.url as string,reused:false};
 }catch(e){run('UPDATE checkout_intents SET lease_until=0 WHERE id=?',intent.id);throw e;}
}
