"use client";
import {useRef,useState} from 'react';
import {api,Button,Card,useApi,useToast} from './ui';
import {useT} from './i18n';
type Ticket={id:string;subject:string;status:string;messages:{id:string;staff:boolean;text:string}[];diagnostic:null|{status:string;progress:number;resultPresent:boolean;usageEntries:number;budgetPct:number|null}};
const field='w-full rounded-xl border border-line bg-card p-3 text-sm';
export function SupportPanel({queue=false}:{queue?:boolean}){
 const t=useT(),toast=useToast(),{data,reload}=useApi<{tickets:Ticket[]}>(queue?'/api/support?queue=1':'/api/support');
 const [subject,setSubject]=useState(''),[category,setCategory]=useState('account'),[text,setText]=useState(''),[jobId,setJobId]=useState(''),[busy,setBusy]=useState(false);
 const key=useRef<string|null>(null);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);try{key.current??=crypto.randomUUID();await api('/api/support',{body:{action:'create',subject,category,text,requestKey:key.current,...(jobId?{jobId}:{})}});key.current=null;setSubject('');setText('');setJobId('');reload();toast('ok',t('Votre demande est enregistrée. Retrouvez son suivi ci-dessous.','Your request is saved. Track it below.'));}catch(e){toast('bad',(e as Error).message);}finally{setBusy(false);}}
 return <Card className="p-6 sm:p-7" data-support-panel id={queue?"assistance-equipe":"assistance"}>
  <h2 className="font-display text-2xl font-semibold">{queue?t('Demandes à traiter','Requests to review'):t('Assistance et suivi','Support and tracking')}</h2>
  <p className="mt-2 text-sm text-ink-2">{t('Décrivez ce qui vous bloque. Le suivi reste dans votre compte ; aucune relance IA ni compensation ne se déclenche en ouvrant une demande. Ne joignez pas de clé ou de mot de passe.','Describe what is blocking you. Tracking stays in your account; opening a request does not trigger an AI retry or compensation. Do not include a key or password.')}</p>
  {!queue&&<form onSubmit={submit} className="mt-4 grid gap-3">
   <label className="grid gap-1 text-sm">{t('Objet','Subject')}<input className={field} required minLength={3} maxLength={160} value={subject} onChange={e=>setSubject(e.target.value)} /></label>
   <label className="grid gap-1 text-sm">{t('Sujet de la demande','Request category')}<select className={field} value={category} onChange={e=>setCategory(e.target.value)}><option value="account">{t('Compte et accès','Account and access')}</option><option value="billing">{t('Paiement et abonnement','Payment and subscription')}</option><option value="generation">{t('Création et résultat IA','Creation and AI result')}</option><option value="other">{t('Autre demande','Other request')}</option></select></label>
   <label className="grid gap-1 text-sm">{t('Votre message','Your message')}<textarea className={field} required rows={4} maxLength={4000} value={text} onChange={e=>setText(e.target.value)} /></label>
   <label className="grid gap-1 text-sm">{t('Référence de tâche, si vous en avez une (facultatif)','Task reference, if available (optional)')}<input className={field} maxLength={100} value={jobId} onChange={e=>setJobId(e.target.value.trim())} /></label>
   <Button type="submit" disabled={busy}>{busy?t('Enregistrement…','Saving…'):t('Enregistrer ma demande','Save my request')}</Button>
  </form>}
  <div className="mt-6 grid gap-4">{data?.tickets.map(ticket=><SupportThread key={ticket.id} ticket={ticket} reload={reload} staffView={queue} />)}{data?.tickets.length===0&&<p className="text-sm text-muted">{t('Aucune demande enregistrée.','No saved request.')}</p>}</div>
 </Card>;
}
function SupportThread({ticket,reload,staffView}:{ticket:Ticket;reload:()=>unknown;staffView:boolean}){
 const t=useT(),toast=useToast(),[text,setText]=useState(''),[busy,setBusy]=useState(false),key=useRef<string|null>(null);
 const state=ticket.status==='closed'?t('Clôturée','Closed'):ticket.status==='in_progress'?t('En cours de traitement','In progress'):t('En attente de traitement','Awaiting review');
 const taskState=ticket.diagnostic?.status==='failed'?t('Échec','Failed'):ticket.diagnostic?.status==='done'?t('Terminée','Completed'):ticket.diagnostic?.status==='cancelled'?t('Annulée','Canceled'):t('À vérifier','To check');
 async function send(status?:'open'|'in_progress'|'closed'){setBusy(true);try{key.current??=crypto.randomUUID();await api('/api/support',{body:{action:'reply',id:ticket.id,...(text.trim()?{text}:{}),...(status?{status}:{}),requestKey:key.current}});key.current=null;setText('');reload();}catch(e){toast('bad',(e as Error).message);}finally{setBusy(false);}}
 return <details className="rounded-2xl border border-line p-4" data-support-ticket><summary className="cursor-pointer break-words font-medium">{ticket.subject} · {state}</summary>
  <p className="mt-2 text-xs text-muted">{t('Référence','Reference')} : {ticket.id}</p>
  {ticket.diagnostic&&<p className="mt-3 rounded-xl bg-paper-2 p-3 text-sm">{t('Tâche','Task')} : {taskState} · {Math.round(ticket.diagnostic.progress*100)} % · {ticket.diagnostic.resultPresent?t('résultat enregistré','saved result'):t('aucun résultat enregistré','no saved result')} · {ticket.diagnostic.usageEntries} {t('écriture(s) de consommation','usage entries')}{ticket.diagnostic.budgetPct!=null?` · ${ticket.diagnostic.budgetPct} % ${t('du budget actuel (repère, pas le solde historique)','of current budget (reference, not historical balance)')}`:''}</p>}
  <ul className="mt-3 space-y-3">{ticket.messages.map(m=><li key={m.id} className="rounded-xl bg-paper-2 p-3 text-sm"><strong>{m.staff?t('Équipe','Team'):t('Vous','You')}</strong><p className="mt-1 whitespace-pre-wrap break-words">{m.text}</p></li>)}</ul>
  <label className="mt-4 grid gap-1 text-sm">{t('Ajouter un message','Add a message')}<textarea className={field} rows={2} maxLength={4000} value={text} onChange={e=>setText(e.target.value)} /></label>
  <div className="mt-3 flex flex-wrap gap-2">{staffView&&<Button disabled={busy} onClick={()=>send('in_progress')}>{t('Prendre en charge','Start review')}</Button>}<Button disabled={busy||!text.trim()} onClick={()=>send()}>{t('Envoyer dans le suivi','Send to thread')}</Button><Button disabled={busy} onClick={()=>send(ticket.status==='closed'?'open':'closed')}>{ticket.status==='closed'?t('Rouvrir','Reopen'):t('Clôturer','Close')}</Button></div>
 </details>;
}
