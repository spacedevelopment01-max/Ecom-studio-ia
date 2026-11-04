"use client";
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasServiceProfileReceipt} from '@/lib/service-profile-confirmation-client';
import type {useServiceProfileConfirmation} from './use-service-profile-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/** Exact profile hours, independent of bookable slots and C21 items. #301 : aussi prestations (#374) et coordonnées (#384). */
export function ConversationServiceProfile({view,confirmation,busy,onActivity,onSuggest}:{view:ConversationView;confirmation:ReturnType<typeof useServiceProfileConfirmation>;busy:boolean;onActivity:boolean;onSuggest?:(text:string)=>void}){
 const t=useT(),s=view.serviceProfile,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.serviceProfileExecution?.enabled&&!view.readOnlyReason&&!state.blocked;
 const service=s?.field==='service-name';
 // #301 — même carte pour les prestations (#374) et les coordonnées (#384) du profil : intitulé selon le champ visé.
 const titles:Record<string,string>={'service-name':t('Prestation du profil d’activité','Business profile service'),phone:t('Téléphone du profil d’activité','Business profile phone'),email:t('E-mail du profil d’activité','Business profile email'),area:t('Zone d’intervention du profil d’activité','Business profile service area'),contact:t('Coordonnées du profil d’activité','Business profile contact details')};
 return <section aria-label={titles[s?.field??'']??t('Horaires du profil d’activité','Business profile hours')} data-syna-service-profile-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {service&&s?.state==='ambiguous'&&!!s.choices?.length&&<ul className="space-y-2" aria-label={t('Prestations du profil','Profile services')}>{s.choices.map(c=><li key={c.key} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1 basis-40 break-words">{c.name}</span>{onSuggest&&<Button size="sm" variant="secondary" disabled={busy} onClick={()=>onSuggest(`Renomme la prestation « ${c.name} » en « »`)}>{t('Renommer','Rename')}</Button>}</li>)}</ul>}
  {s?.diff&&<dl className="space-y-2 whitespace-pre-wrap break-words"><dt>{t('Avant','Before')}</dt><dd>{s.diff.before||t('(vide)','(empty)')}</dd><dt>{t('Après confirmation','After confirmation')}</dt><dd>{s.diff.after||t('(effacé)','(cleared)')}</dd></dl>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain||!onActivity} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasServiceProfileReceipt(view)&&<p role="status">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)} · v{s!.resultVersion} <a href={`/studio/${view.projectId}/produit`} className="underline">{t('Voir Activité','View business')}</a></p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy||!onActivity} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
