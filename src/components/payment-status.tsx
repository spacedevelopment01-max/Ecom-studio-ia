"use client";
import {useState} from 'react';
import {api,Button,Card,useApi,useToast} from './ui';
import {useT} from './i18n';
import type {BillingView} from '@/lib/plans';
export function PaymentStatus({billing,onChecked}:{billing:BillingView;onChecked:()=>void}){
 const t=useT(),toast=useToast(),[busy,setBusy]=useState(false);
 const {data,reload}=useApi<{available:boolean;invoices:{id:string;status:string;url:string|null;pdf:string|null}[]}>('/api/billing/invoices');
 const invoiceState=(s:string)=>s==='paid'?t('Payée','Paid'):s==='open'?t('À régler','Open'):s==='void'?t('Annulée','Void'):s==='draft'?t('Brouillon','Draft'):s==='uncollectible'?t('Impayée','Uncollectible'):t('Statut à vérifier','Status to check');
 async function check(){setBusy(true);try{const r=await api<{checked:number;confirmed:number;pending:number;unavailable:number}>('/api/billing/reconcile',{body:{}});toast('info',r.unavailable?t('Certains paiements n’ont pas pu être vérifiés. Ne les repassez pas ; contactez l’assistance.','Some payments could not be checked. Do not pay again; contact support.'):r.pending?t('Un paiement attend encore sa confirmation. Consultez son statut avant de recommencer.','A payment is still awaiting confirmation. Check its status before trying again.'):r.confirmed?t('Vérification effectuée. Consultez les statuts de vos abonnements et réservations.','Check completed. See the statuses of your subscriptions and bookings.'):t('Aucun paiement en attente trouvé.','No pending payment found.'));onChecked();reload();}catch(e){toast('bad',(e as Error).message);}finally{setBusy(false);}}
 return <Card className="p-6 sm:p-7" data-payment-status>
  <h2 className="font-display text-2xl font-semibold">{t('Paiements et factures','Payments and invoices')}</h2>
  {billing.paymentMode==='test'&&<p role="note" className="mt-3 rounded-xl bg-warn-soft p-3 text-sm">{t('Mode test du paiement — aucun achat réel sur cette installation.','Payment test mode — no real purchase on this installation.')}</p>}
  <p className="mt-3 text-sm text-ink-2">{t('Un retour de la page de paiement ne prouve pas son succès. Si votre achat n’apparaît pas, vérifiez-le avant de payer à nouveau.','Returning from checkout does not prove payment succeeded. If a purchase is missing, check it before paying again.')}</p>
  <Button className="mt-4" disabled={busy||billing.paymentMode==='unconfigured'} onClick={check}>{busy?t('Vérification…','Checking…'):t('Vérifier mes paiements','Check my payments')}</Button>
  {data?.available===false&&<p className="mt-3 text-sm text-muted">{t('Factures indisponibles pour le moment. Retrouvez vos demandes dans l’assistance ci-dessous.','Invoices are currently unavailable. Track your requests in support below.')}</p>}
  {data?.available&&data.invoices.length===0&&<p className="mt-3 text-sm text-muted">{t('Aucune facture disponible.','No invoice available.')}</p>}
  <ul className="mt-3 space-y-2 text-sm">{data?.invoices.map(x=><li key={x.id} className="flex flex-wrap gap-3"><span>{x.id} · {invoiceState(x.status)}</span>{x.url&&<a href={x.url} target="_blank" rel="noopener noreferrer" className="underline">{t('Voir la facture','View invoice')}</a>}{x.pdf&&<a href={x.pdf} target="_blank" rel="noopener noreferrer" className="underline">PDF</a>}</li>)}</ul>
 </Card>;
}
