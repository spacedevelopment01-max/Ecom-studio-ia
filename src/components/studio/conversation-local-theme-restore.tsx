"use client";
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalThemeRestoreReceipt} from '@/lib/local-theme-restore-confirmation-client';
import type {useLocalThemeRestoreConfirmation} from './use-local-theme-restore-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 « SYNA complète » — carte Versions du site gratuite (contrat #382 de Codex) : liste des versions avec leur
 * aperçu réel, « Restaurer » remplit la phrase exacte (jamais de choix implicite), deux vrais aperçus avant l'accord,
 * reçu relu. Une liste ou un refus n'offre aucune action d'écriture.
 */
export function ConversationLocalThemeRestore({view,confirmation,busy,onSuggest}:{view:ConversationView;confirmation:ReturnType<typeof useLocalThemeRestoreConfirmation>;busy:boolean;onSuggest:(text:string)=>void}){
 const t=useT(),s=view.localThemeRestore,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localThemeRestoreExecution?.enabled&&!view.readOnlyReason&&!state.blocked;
 return <section aria-label={t('Versions du site — gratuit','Site versions — free')} data-syna-restore-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {!!s?.choices?.length&&s.state!=='proposed'&&<ul aria-label={t('Versions du site','Site versions')} className="space-y-2">{s.choices.map(c=><li key={c.id} className="flex min-w-0 flex-wrap items-center gap-2">
   <span className="min-w-0 flex-1 break-words"><strong>{t('Version ','Version ')}{c.number}</strong>{c.current&&<> · {t('actuelle','current')}</>}{c.summary&&<> · {c.summary}</>}</span>
   <a href={c.previewHref} target="_blank" rel="noopener" className="underline">{t('Aperçu','Preview')}</a>
   {!c.current&&<Button variant="ghost" disabled={busy} aria-label={t(`Restaurer la version ${c.number}`,`Restore version ${c.number}`)} onClick={()=>onSuggest(`Restaure la version ${c.number} du site`)}>{t('Restaurer','Restore')}</Button>}
  </li>)}</ul>}
  {s?.diff&&<dl className="space-y-1"><dt className="text-muted">{t('Site actuel','Current site')}</dt><dd>{s.diff.before}</dd><dt className="text-muted">{t('Après confirmation','After confirmation')}</dt><dd>{s.diff.after}</dd></dl>}
  {s?.state==='proposed'&&s.preview&&<p className="flex flex-wrap gap-x-3 gap-y-1"><a href={s.preview.beforeHref} target="_blank" rel="noopener" className="underline">{t('Ouvrir le site actuel','Open the current site')}</a><a href={s.preview.afterHref} target="_blank" rel="noopener" className="underline" data-syna-restore-after>{t('Ouvrir la version à restaurer','Open the version to restore')}</a></p>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('La restauration crée une nouvelle version ; l’historique reste complet. Rien n’est mis en ligne, aucun appel IA.','Restoring creates a new version; history stays complete. Nothing goes live, no AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalThemeRestoreReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · version ','Saved and re-read · version ')}{s!.version!.number}{s!.previewHref&&<> · <a href={s!.previewHref} target="_blank" rel="noopener" className="underline">{t('Voir le site de travail','View the working site')}</a></>}</p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
