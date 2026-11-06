"use client";
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {bookingEditAllowed,hasLocalBookingEditReceipt} from '@/lib/local-booking-edit-confirmation-client';
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
import type {useLocalBookingEditConfirmation} from './use-local-booking-edit-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 « SINA complète » — carte « Retouche réservable » (contrat #418 / #419 de Codex) : prix ou durée d'une prestation
 * de la réservation native, avant / après en € ou en minutes, accord gratuit, valeur relue dans une nouvelle version.
 * Le nom de la prestation est une donnée saisie, affichée telle quelle.
 */
export const handlesLocalBookingEdit=(v:ConversationView)=>!!v.bookingEdit&&v.bookingEdit.schema==='syna-booking-edit-1'&&nativeLocalEditAllowed(v);
export function ConversationLocalBookingEdit({view,confirmation,busy}:{view:ConversationView;confirmation:ReturnType<typeof useLocalBookingEditConfirmation>;busy:boolean}){
 const t=useT(),s=view.bookingEdit,{controller,state}=confirmation;
 if(view.recovery||!nativeLocalEditAllowed(view)||(!s&&!state.error&&!state.uncertain))return null;
 const lang=t('fr','en') as 'fr'|'en',enabled=bookingEditAllowed(view)&&!state.blocked;
 const value=(n:number|null)=>n==null?t('non renseigné','not set'):s?.field==='duration'?`${n} min`:new Intl.NumberFormat(lang==='fr'?'fr-FR':'en-GB',{style:'currency',currency:'EUR',maximumFractionDigits:n%1?2:0}).format(n);
 const href=s&&view.projectId&&s.nativeHref===`/studio/${view.projectId}/rendez-vous`?s.nativeHref:null;
 return <section aria-label={t('Retouche réservable — gratuit','Bookable edit — free')} data-syna-booking-edit={s?.state??'error'} className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p className="break-words">{s.message}</p>}
  {s?.service&&s.diff&&<dl className="space-y-1 break-words"><dt className="text-muted">{t('Prestation réservable','Bookable service')}</dt><dd><strong className="whitespace-pre-wrap">{s.service.untrustedMetadata.name}</strong></dd>
   <dt className="text-muted">{s.field==='duration'?t('Durée actuelle','Current duration'):t('Prix actuel','Current price')}</dt><dd data-syna-booking-before>{value(s.diff.before)}</dd>
   <dt className="text-muted">{s.state==='applied'?t('Enregistré','Saved'):t('Après confirmation','After confirmation')}</dt><dd data-syna-booking-after><strong>{value(s.diff.after)}</strong></dd></dl>}
  {!!s?.warnings?.length&&<ul aria-label={t('Avertissements','Warnings')} className="list-disc space-y-1 pl-5 text-xs">{s.warnings.map((w,i)=><li key={i} className="break-words">{w}</li>)}</ul>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('Seule cette valeur change : rendez-vous confirmés, profil d’activité et mode de réservation conservés. Aucun appel IA.','Only this value changes: confirmed appointments, business profile and booking mode are kept. No AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalBookingEditReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)}{href&&<> · <a href={href} className="underline">{t('Voir dans Rendez-vous','View in Appointments')}</a></>}</p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
