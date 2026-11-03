"use client";
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasNativeContentReceipt} from '@/lib/local-business-content-confirmation-client';
import type {useLocalBusinessContentConfirmation} from './use-local-business-content-confirmation';
import {Button} from '../ui';
import {useLang,useT} from '../i18n';
/**
 * #301 C21 — carte « Modification gratuite du contenu » (contrat #310) : un bien, un plat ou une réalisation désigné,
 * un seul champ exact (nom, prix, description ou travail réalisé), avant / après, effets natifs annoncés (adresse de la page), « Gratuit — 0 € »,
 * confirmation explicite, reçu relu sur le serveur. Aucune publication, aucun changement de statut.
 */
const TAB={biens:'biens',plats:'carte',realisations:'realisations'} as const;
export function ConversationLocalBusinessContent({view,confirmation,busy,selectionMatches}:{view:ConversationView;confirmation:ReturnType<typeof useLocalBusinessContentConfirmation>;busy:boolean;selectionMatches:boolean}){
 const t=useT(),{lang}=useLang(),s=view.localBusinessContent,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localBusinessContentExecution?.enabled&&!view.readOnlyReason&&!state.blocked,valid=hasNativeContentReceipt(view);
 const kind=s?.target?.type??s?.item?.type,noun=kind==='biens'?t('Bien','Property'):kind==='plats'?t('Plat','Dish'):kind==='realisations'?t('Réalisation','Project'):'';
 const value=(v:string|number|null|undefined)=>v==null||v===''?t('(vide)','(empty)'):s?.field==='price'&&typeof v==='number'?new Intl.NumberFormat(lang==='en'?'en-GB':'fr-FR',{style:'currency',currency:'EUR'}).format(v):String(v);
 const effect=(f:string)=>f==='handle'?t('Adresse de la page','Page address'):f;
 return <section aria-label={t('Modification gratuite du contenu','Free content edit')} data-syna-content-card className="space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>
  {s&&<p>{s.message}</p>}
  {noun&&<p className="break-words">{noun} : <strong>{s?.item?.title??(s?.field==='title'?String(s?.diff?.before??''):'')}</strong>{s?.nativeStatus?<span className="text-muted"> · {s.nativeStatus}</span>:null}</p>}
  {s?.diff&&<dl className="space-y-2 whitespace-pre-wrap break-words"><dt className="font-semibold">{s.field==='price'?t('Prix','Price'):s.field==='description'?t('Description','Description'):s.field==='work'?t('Travail réalisé','Work performed'):t('Nom','Name')}</dt><dd className="grid gap-1"><span><span className="text-muted">{t('Avant : ','Before: ')}</span>{value(s.diff.before)}</span><span><span className="text-muted">{t('Après confirmation : ','After confirmation: ')}</span>{value(s.diff.after)}</span></dd>
   {(s.nativeEffects??[]).map(e=><div key={e.field}><dt className="font-semibold">{effect(e.field)}</dt><dd className="grid gap-1"><span><span className="text-muted">{t('Avant : ','Before: ')}</span>{e.before}</span><span><span className="text-muted">{t('Après confirmation : ','After confirmation: ')}</span>{e.after}</span></dd></div>)}
  </dl>}
  {s?.state==='proposed'&&enabled&&<>
   <p className="text-xs text-muted">{t('Seul ce champ change, par le même enregistrement que l’écran natif. Aucun appel IA, aucune publication, aucun changement de statut.','Only this field changes, through the same save as the native screen. No AI call, no publishing, no status change.')}</p>
   {!selectionMatches&&<p className="text-xs">{t('Désignez ce contenu dans son espace pour confirmer.','Select this content in its space to confirm.')}</p>}
   <div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain||!selectionMatches} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>
  </>}
  {valid&&<div role="status" className="space-y-1"><p>{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}<span className="font-mono text-xs">{s!.receiptId!.slice(0,8)}</span></p><a className="underline" href={`/studio/${view.projectId}/${TAB[s!.item!.type]}`}>{t('Voir dans son espace','View in its space')}</a></div>}
  {state.error&&<div className="space-y-2"><p role="alert">{state.error}</p>{!state.uncertain&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Actualiser sans exécuter','Refresh without running')}</Button>}</div>}
  {state.uncertain&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button><Button variant="secondary" disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button></div>}
 </section>;
}
