"use client";
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalCalendarReceipt} from '@/lib/local-calendar-confirmation-client';
import type {useLocalCalendarConfirmation} from './use-local-calendar-confirmation';
import {Button} from '../ui';
import {useT,useLang} from '../i18n';
/** Date et heure toujours affichées avec leur fuseau (consigne du contrat #375) : jamais une heure sans fuseau. */
export function calendarDate(ms:number,timeZone:string,lang:'fr'|'en'='fr'){
 try{return new Intl.DateTimeFormat(lang==='en'?'en-GB':'fr-FR',{timeZone,weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(ms))+` (${timeZone})`;}
 catch{return new Date(ms).toISOString()+' (UTC)';}
}
/**
 * #301 « SINA complète » — carte Calendrier gratuite (contrat #375 de Codex) : date éditoriale d'un brouillon,
 * avant / après avec fuseau, accord gratuit, reçu relu. Aucune programmation, aucun envoi, aucun appel IA.
 */
export function ConversationLocalCalendar({view,confirmation,busy}:{view:ConversationView;confirmation:ReturnType<typeof useLocalCalendarConfirmation>;busy:boolean}){
 const t=useT(),{lang}=useLang(),s=view.localCalendar,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localCalendarExecution?.enabled&&nativeLocalEditAllowed(view)&&!state.blocked,tz=s?.target?.timezone??'UTC';
 return <section aria-label={t('Calendrier — gratuit','Calendar — free')} data-syna-calendar-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {s?.target&&<p className="break-words">{t('Publication : ','Post: ')}<strong>{s.target.title||t('(sans titre)','(untitled)')}</strong></p>}
  {s?.diff&&<dl className="space-y-1"><dt className="text-muted">{t('Avant','Before')}</dt><dd data-syna-calendar-before>{calendarDate(s.diff.before,tz,lang)}</dd><dt className="text-muted">{t('Après confirmation','After confirmation')}</dt><dd data-syna-calendar-after>{calendarDate(s.diff.after,tz,lang)}</dd></dl>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('Seule la date de ce brouillon change. Aucune programmation, aucun envoi, aucun appel IA.','Only this draft’s date changes. No scheduling, no sending, no AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalCalendarReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)}{s!.nativeHref&&<> · <a href={s!.nativeHref} className="underline">{t('Voir le Calendrier','View the Calendar')}</a></>}</p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
