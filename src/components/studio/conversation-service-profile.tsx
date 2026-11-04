"use client";
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasServiceProfileReceipt} from '@/lib/service-profile-confirmation-client';
import type {useServiceProfileConfirmation} from './use-service-profile-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/** Exact profile hours, independent of bookable slots and C21 items. #301 : aussi prestations (#374) et coordonnées (#384). */
export function ConversationServiceProfile({view,confirmation,busy,onActivity,onSuggest}:{view:ConversationView;confirmation:ReturnType<typeof useServiceProfileConfirmation>;busy:boolean;onActivity:boolean;onSuggest?:(text:string)=>void}){
 const t=useT(),s=view.serviceProfile,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.serviceProfileExecution?.enabled&&nativeLocalEditAllowed(view)&&!state.blocked;
 const service=s?.field==='service-name'||s?.field==='service-price'||s?.field==='service-duration'||s?.field==='service-description';
 // Choix d'une prestation : le bouton remplit la phrase exacte du contrat (#374, #390, #391, #392), jamais une action.
 const suggest:Record<string,[string,(n:string)=>string]>={'service-name':[t('Renommer','Rename'),n=>`Renomme la prestation « ${n} » en « »`],'service-price':[t('Changer le prix','Change the price'),n=>`Mets le prix de la prestation du profil « ${n} » à « »`],'service-duration':[t('Changer la durée','Change the duration'),n=>`Mets la durée de la prestation du profil « ${n} » à « »`],'service-description':[t('Changer la description','Change the description'),n=>`Remplace la description de la prestation du profil « ${n} » par « »`]};
 const choice=suggest[s?.field??'']??suggest['service-name'];
 // #301 — même carte pour les prestations (#374) et les coordonnées (#384) du profil : intitulé selon le champ visé.
 const titles:Record<string,string>={'service-name':t('Prestation du profil d’activité','Business profile service'),'service-price':t('Prix affiché d’une prestation du profil','Displayed price of a profile service'),'service-duration':t('Durée affichée d’une prestation du profil','Displayed duration of a profile service'),'service-description':t('Description d’une prestation du profil','Description of a profile service'),phone:t('Téléphone du profil d’activité','Business profile phone'),email:t('E-mail du profil d’activité','Business profile email'),area:t('Zone d’intervention du profil d’activité','Business profile service area'),contact:t('Coordonnées du profil d’activité','Business profile contact details')};
 return <section aria-label={titles[s?.field??'']??t('Horaires du profil d’activité','Business profile hours')} data-syna-service-profile-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {service&&s?.state==='ambiguous'&&!!s.choices?.length&&<ul className="space-y-2" aria-label={t('Prestations du profil','Profile services')}>{s.choices.map(c=><li key={c.key} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1 basis-40 break-words">{c.name}</span>{onSuggest&&<Button size="sm" variant="secondary" disabled={busy} aria-label={`${choice[0]} : ${c.name}`} onClick={()=>onSuggest(choice[1](c.name))}>{choice[0]}</Button>}</li>)}</ul>}
  {s?.diff&&<dl className="space-y-2 whitespace-pre-wrap break-words"><dt>{t('Avant','Before')}</dt><dd>{s.diff.before||t('(vide)','(empty)')}</dd><dt>{t('Après confirmation','After confirmation')}</dt><dd>{s.diff.after||t('(effacé)','(cleared)')}</dd></dl>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain||!onActivity} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasServiceProfileReceipt(view)&&<p role="status">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)} · v{s!.resultVersion} <a href={`/studio/${view.projectId}/produit`} className="underline">{t('Voir Activité','View business')}</a></p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy||!onActivity} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
