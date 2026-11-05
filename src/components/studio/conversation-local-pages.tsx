"use client";
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalPagesReceipt} from '@/lib/local-pages-confirmation-client';
import type {useLocalPagesConfirmation} from './use-local-pages-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 « SYNA complète » — carte Pages gratuite (contrat #370 de Codex) : créer d'après un modèle natif (brouillon hors
 * menu), renommer, afficher / retirer du menu, dupliquer, supprimer. Avant / après, accord gratuit, reçu relu, lien vers
 * la page dans la version enregistrée. Le choix d'un modèle remplit la phrase du client : rien n'est envoyé sans lui.
 */
/** Le moteur joint les modèles à toute clarification ; ils ne s'affichent que si la question porte sur le modèle de page. */
export const modelQuestion=(message:string)=>/mod[èe]le/i.test(message);
export function ConversationLocalPages({view,confirmation,busy,onSuggest}:{view:ConversationView;confirmation:ReturnType<typeof useLocalPagesConfirmation>;busy:boolean;onSuggest:(text:string)=>void}){
 const t=useT(),s=view.localPages,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localPagesExecution?.enabled&&nativeLocalEditAllowed(view)&&!state.blocked;
 const label:Record<string,string>={create:t('Nouvelle page (brouillon, hors du menu)','New page (draft, not in the menu)'),rename:t('Renommer la page','Rename the page'),navigation:t('Menu du site','Site menu'),duplicate:t('Copie de la page (brouillon)','Copy of the page (draft)'),remove:t('Supprimer la page','Delete the page')};
 return <section aria-label={t('Pages du site — gratuit','Site pages — free')} data-syna-pages-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {s?.state==='ambiguous'&&!!s.models?.length&&modelQuestion(s.message)&&<ul className="space-y-2" aria-label={t('Modèles de page natifs','Native page models')}>{s.models.map(m=><li key={m.id} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1 basis-40 break-words">{m.label}</span><a href={m.previewHref} target="_blank" rel="noreferrer" className="text-xs underline">{t('Aperçu','Preview')}</a><Button size="sm" variant="secondary" disabled={busy} onClick={()=>onSuggest(t(`Je choisis le modèle « ${m.label} »`,`Je choisis le modèle « ${m.label} »`))}>{t('Choisir','Choose')}</Button></li>)}</ul>}
  {s?.command&&<p className="break-words"><strong>{label[s.command]??s.command}</strong>{s.target&&<> · <code className="text-xs">{s.target}</code></>}</p>}
  {s?.diff&&<dl className="space-y-1 whitespace-pre-wrap break-words"><dt className="text-muted">{t('Avant','Before')}</dt><dd>{s.diff.before||t('(aucune)','(none)')}</dd><dt className="text-muted">{t('Après confirmation','After confirmation')}</dt><dd>{s.diff.after}</dd></dl>}
  {s?.state==='proposed'&&s.modelPreviewHref&&<a href={s.modelPreviewHref} target="_blank" rel="noreferrer" className="inline-block text-xs underline">{t('Voir l’aperçu du modèle','View the model preview')}</a>}
  {s?.state==='proposed'&&s.command==='remove'&&<p className="text-xs">{t('La page disparaît de la version de travail ; l’historique des versions la conserve. Rien n’est publié.','The page leaves the working version; version history keeps it. Nothing is published.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalPagesReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)} · {t('version ','version ')}{s!.version!.number}{s!.previewHref&&<> · <a href={s!.previewHref} target={s!.command==='remove'?undefined:'_blank'} rel="noreferrer" className="underline">{s!.command==='remove'?t('Voir Boutique','View Store'):t('Voir la page','View the page')}</a></>}</p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
