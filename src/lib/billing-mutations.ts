/** Écritures Stripe explicites, persistantes et reprenables sans une nouvelle clé à chaque minute. */
import {all,id,now,one,run,tx} from './db';
import {stripe} from './payments';
import {HttpError} from './auth';
import {L} from './i18n-server';
export type BillingMutation={id:string;scope:string;user_id:string;path:string;params_json:string;response_json:string|null;lease_until:number;created_at:number};
const blocked=()=>new HttpError(409,L('Une modification de cet abonnement attend une vérification. Vérifiez vos paiements ou reprenez la même demande avant une autre action.','A change to this subscription needs checking. Check your payments or resume the same request before another action.'),'payment_pending');
export const pendingMutations=(userId:string)=>all<BillingMutation>('SELECT * FROM billing_mutations WHERE user_id=? AND applied_at IS NULL ORDER BY created_at LIMIT 20',userId);
export function finishMutation(row:BillingMutation,response:any,apply:(response:any)=>void){
 tx(()=>{const current=one<{applied_at:number|null}>('SELECT applied_at FROM billing_mutations WHERE id=?',row.id);if(!current||current.applied_at)return;apply(response);run("UPDATE billing_mutations SET response_json=?,applied_at=?,lease_until=0,outcome='applied' WHERE id=?",JSON.stringify(response),now(),row.id);});
}
export async function stripeMutation(userId:string,scope:string,path:string,params:Record<string,string>,apply:(response:any)=>void,verifiedRemote?:any){
 const payload=JSON.stringify(params);
 const row=tx(()=>{
  let previous=one<BillingMutation>('SELECT * FROM billing_mutations WHERE scope=? AND applied_at IS NULL',scope);
  if(previous&&(previous.user_id!==userId||previous.path!==path||previous.params_json!==payload))throw blocked();
  if(previous&&previous.lease_until>now())throw blocked();
  if(!previous){const key=id();run('INSERT INTO billing_mutations(id,scope,user_id,path,params_json,lease_until,created_at) VALUES(?,?,?,?,?,?,?)',key,scope,userId,path,payload,now()+60_000,now());previous=one<BillingMutation>('SELECT * FROM billing_mutations WHERE id=?',key)!;}
  else{if(!verifiedRemote&&(previous.response_json||previous.created_at<now()-23*3600_000))throw blocked();run('UPDATE billing_mutations SET lease_until=? WHERE id=?',now()+60_000,previous.id);}
  return previous;
 });
 try{const response=verifiedRemote??await stripe(path,JSON.parse(row.params_json),`mutation:${row.id}`);run('UPDATE billing_mutations SET response_json=? WHERE id=?',JSON.stringify(response),row.id);finishMutation(row,response,apply);}
 catch(e){if(e instanceof HttpError&&e.status===402&&!one<{response_json:string|null}>('SELECT response_json FROM billing_mutations WHERE id=?',row.id)?.response_json)run("UPDATE billing_mutations SET lease_until=0,applied_at=?,outcome='refused' WHERE id=?",now(),row.id);else run('UPDATE billing_mutations SET lease_until=0 WHERE id=?',row.id);throw e;}
}
