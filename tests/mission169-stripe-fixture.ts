/** Stripe fictif. Aucun accès réseau. Le fichier optionnel doit rester dans le répertoire de recette isolé. */
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PLANS,type PlanId} from '../src/lib/plans';
export function stripeFixture(file?:string){
 const initial={sessions:{} as Record<string,any>,subscriptions:{} as Record<string,any>,invoices:{} as Record<string,any[]>,refunds:{} as Record<string,any>,refundPending:false,keys:{} as Record<string,string>,requests:[] as {path:string;method:string;key:string|null;params:Record<string,string>}[],created:0,failCheckout:false,failMutation:false,requiresAction:false};
 let local=initial;
 if(file&&!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(initial));
 const read=()=>file?JSON.parse(fs.readFileSync(file,'utf8')) as typeof initial:local;
 const write=(s:typeof initial)=>{if(file)fs.writeFileSync(file,JSON.stringify(s));else local=s;};
 const update=(fn:(s:typeof initial)=>void)=>{const s=read();fn(s);write(s);};
 function subscription(plan:PlanId,userId:string){const key=`sub_${randomUUID()}`;update(s=>{s.subscriptions[key]={id:key,status:'active',cancel_at_period_end:false,current_period_start:Math.floor(Date.now()/1000),current_period_end:Math.floor(Date.now()/1000)+30*86400,metadata:{kind:'subscription_v2',plan,billing:'month',user_id:userId},items:{data:[{id:`si_${key}`,price:{product:`prod_${key}`,unit_amount:PLANS[plan].price.month*100,recurring:{interval:'month'}}}]}};});return key;}
 async function fetcher(input:any,init?:RequestInit){
  const url=new URL(String(input));if(url.hostname!=='api.stripe.com')throw new Error('Only simulated Stripe allowed');
  const path=url.pathname.replace(/^\/v1\//,''),method=init?.method??'GET',s=read(),params=Object.fromEntries(new URLSearchParams(String(init?.body??''))),key=new Headers(init?.headers).get('idempotency-key');
  const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
  s.requests.push({path,method,key,params});
  if(path==='checkout/sessions'&&method==='POST'){
   const sid=(key&&s.keys[key])||`cs_test_${randomUUID()}`;
   if(!s.sessions[sid]){s.created++;s.sessions[sid]={id:sid,url:`https://checkout.stripe.test/${sid}`,livemode:false,status:'open',payment_status:'unpaid',currency:'eur',amount_total:Number(params['line_items[0][price_data][unit_amount]']),client_reference_id:params.client_reference_id,customer:`cus_${params.client_reference_id}`,subscription:null,created:Math.floor(Date.now()/1000),metadata:Object.fromEntries(Object.entries(params).flatMap(([k,v])=>{const m=k.match(/^metadata\[(.+)\]$/);return m?[[m[1],v]]:[];}))};if(key)s.keys[key]=sid;}
   const fail=s.failCheckout;s.failCheckout=false;write(s);if(fail)throw new Error('Simulated lost response after Stripe accepted the request');return json(s.sessions[sid]);
  }
  if(path.startsWith('checkout/sessions/')&&method==='GET'){write(s);return s.sessions[path.slice(18)]?json(s.sessions[path.slice(18)]):json({error:{code:'resource_missing'}},404);}
  if(path.startsWith('subscriptions/')){
   const sub=s.subscriptions[decodeURIComponent(path.slice(14))];
   if(!sub){write(s);return json({error:{code:'resource_missing'}},404);}
   if(method==='POST'){
    if(s.requiresAction){write(s);return json({error:{code:'authentication_required'}},402);}
    if(params['metadata[plan]']){sub.metadata.plan=params['metadata[plan]'];sub.metadata.billing=params['metadata[billing]'];sub.items.data[0].price.unit_amount=Number(params['items[0][price_data][unit_amount]']);}
    if('cancel_at_period_end' in params)sub.cancel_at_period_end=params.cancel_at_period_end==='true';
   }
   if(method==='DELETE')sub.status='canceled';
   const fail=method==='POST'&&s.failMutation;if(method==='POST')s.failMutation=false;write(s);if(fail)throw new Error('Simulated lost mutation response');return json(sub);
  }
  if(path==='invoices'&&method==='GET'){write(s);return json({data:s.invoices[url.searchParams.get('customer')??'']??[]});}
  if(path==='refunds'&&method==='POST'){const ref=key??params.payment_intent;s.refunds[ref]??={id:`re_${randomUUID()}`,status:s.refundPending?'pending':'succeeded'};write(s);return json(s.refunds[ref]);}
  write(s);return json({error:{code:'resource_missing'}},404);
 }
 return {fetch:fetcher,subscription,update,get state(){return read();}};
}
