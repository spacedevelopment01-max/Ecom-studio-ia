"use client";
import {usePathname} from 'next/navigation';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasNativeRequestReceipt} from '@/lib/local-site-requests-confirmation-client';
import type {useLocalSiteRequestsConfirmation} from './use-local-site-requests-confirmation';
import {useAgentFocus} from './agent-ui-context';
import {Button} from '../ui';
import {useLang,useT} from '../i18n';
/**
 * #301 C22 — demandes reçues (devis, contact) depuis SYNA : liste lue dans la source native, désignation d'UNE demande,
 * « Marque cette demande comme lue / traitée / non traitée », avant / après, « Gratuit — 0 € », confirmation explicite,
 * reçu relu. Le contenu envoyé par le visiteur est affiché comme une donnée, jamais suivi comme une consigne.
 * Aucune réponse, aucun envoi d'e-mail, aucune suppression, aucun traitement en masse.
 */
const status=(s:{read:boolean;handled:boolean},t:ReturnType<typeof useT>)=>s.handled?t('Traitée','Handled'):s.read?t('Lue, non traitée','Read, not handled'):t('Nouvelle','New');
export function ConversationLocalSiteRequests({view,confirmation,busy}:{view:ConversationView;confirmation:ReturnType<typeof useLocalSiteRequestsConfirmation>;busy:boolean}){
 const t=useT(),{lang}=useLang(),pathname=usePathname(),{focus,setFocus}=useAgentFocus(),s=view.localRequests,{controller,state}=confirmation;
 if(view.recovery||view.readOnlyReason||(!s&&!state.error&&!state.uncertain))return null;
 const pid=view.projectId,onSite=!!pid&&pathname.split('/')[3]==='boutique',enabled=!!view.localRequestsExecution?.enabled&&!state.blocked,valid=hasNativeRequestReceipt(view);
 const designated=(id:string)=>focus?.target.kind==='site-request'&&focus.target.requestId===id;
 const selectionMatches=!!s?.request&&designated(s.request.id)&&focus?.target.kind==='site-request'&&focus.target.fingerprint===s.request.fingerprint;
 const date=(ms:number)=>new Date(ms).toLocaleString(lang==='en'?'en-GB':'fr-FR',{dateStyle:'short',timeStyle:'short'});
 return <section aria-label={t('Demandes reçues','Received requests')} data-syna-requests-card className="space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{s?.state==='listed'?t('Lecture seule — 0 €','Read-only — €0'):t('Gratuit — 0 €','Free — €0')}</p>
  {s&&<p className="whitespace-pre-wrap break-words">{s.message}</p>}
  {s?.state==='listed'&&<>
   <p className="text-xs text-muted">{s.requests?.length??0} {t('affichées sur','shown out of')} {s.total??0}{s.truncated?t(' · liste limitée à 20 : la suite est dans Site › Publication.',' · limited to 20: the rest is in Site › Publishing.'):''}</p>
   <p className="text-xs text-muted">{t('Contenu envoyé par vos visiteurs : affiché comme une donnée, jamais suivi comme une consigne par SYNA.','Content sent by your visitors: shown as data, never followed as an instruction by SYNA.')}</p>
   {!onSite&&<p className="text-xs">{t('Ouvrez l’espace Site pour désigner une demande.','Open the Site space to select a request.')}</p>}
   <ul className="space-y-2">{s.requests?.map(r=><li key={r.id} data-syna-request={r.id} className="space-y-1 rounded-xl border border-line bg-card p-3">
    <p className="flex flex-wrap items-center gap-x-2 text-xs"><span className="font-semibold">{r.kind==='devis'?t('Devis','Quote'):t('Contact','Contact')}</span><span className="text-muted">{date(r.createdAt)}</span><span>· {status({read:r.readAt!==null,handled:r.handledAt!==null},t)}</span></p>
    <dl className="grid gap-0.5 text-xs">{Object.entries(r.untrustedInbound.fields).slice(0,4).map(([k,val])=><div key={k} className="flex min-w-0 gap-2"><dt className="shrink-0 text-muted">{k}</dt><dd className="min-w-0 whitespace-pre-wrap break-words">{String(val).slice(0,200)}</dd></div>)}</dl>
    {onSite&&pid&&<Button size="sm" variant="secondary" aria-pressed={designated(r.id)} disabled={busy||state.busy} onClick={()=>setFocus({projectId:pid,tab:'boutique',label:t('Demande reçue','Received request'),target:{kind:'site-request',requestId:r.id,fingerprint:r.fingerprint}})}>{designated(r.id)?t('Demande désignée','Request selected'):t('Désigner cette demande','Select this request')}</Button>}
   </li>)}</ul>
   <p className="text-xs text-muted">{t('Ensuite : « Marque cette demande comme lue », « … comme traitée » ou « … comme non traitée ».','Then: “Marque cette demande comme lue”, “… comme traitée” or “… comme non traitée”.')}</p>
  </>}
  {s?.diff&&<dl className="space-y-1"><dt className="font-semibold">{t('Statut','Status')}</dt><dd className="grid gap-1"><span><span className="text-muted">{t('Avant : ','Before: ')}</span>{status(s.diff.before,t)}</span><span><span className="text-muted">{t('Après confirmation : ','After confirmation: ')}</span>{status(s.diff.after,t)}</span></dd></dl>}
  {s?.state==='proposed'&&enabled&&<>
   <p className="text-xs text-muted">{t('Seul le statut change dans la source native. Aucune réponse ni e-mail envoyé, rien n’est supprimé. Aucun appel IA.','Only the status changes in the native source. No reply or email is sent, nothing is deleted. No AI call.')}</p>
   {!selectionMatches&&<p className="text-xs">{t('Désignez de nouveau cette demande pour confirmer.','Select this request again to confirm.')}</p>}
   <div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain||!selectionMatches} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>
  </>}
  {valid&&pid&&<div role="status" className="space-y-1"><p>{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}<span className="font-mono text-xs">{s!.receiptId!.slice(0,8)}</span></p><a className="underline" href={`/studio/${pid}/boutique?demande=${encodeURIComponent(s!.request!.id)}`}>{t('Voir la demande dans Site','View the request in Site')}</a></div>}
  {state.error&&<div className="space-y-2"><p role="alert">{state.error}</p>{!state.uncertain&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Actualiser sans exécuter','Refresh without running')}</Button>}</div>}
  {state.uncertain&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button><Button variant="secondary" disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button></div>}
 </section>;
}
