"use client";
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalThemeChoiceReceipt} from '@/lib/local-theme-choice-confirmation-client';
import type {useLocalThemeChoiceConfirmation} from './use-local-theme-choice-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 « SYNA complète » — carte Choix du thème gratuite (contrat #376 de Codex) : deux vrais aperçus du projet
 * (site actuel / aperçu inactif préparé sans IA), accord gratuit séparé qui remplace le site de travail seulement,
 * reçu relu. Si le moteur signale des retouches non reportées, aucune confirmation n'est proposée (message du moteur).
 */
export function ConversationLocalThemeChoice({view,confirmation,busy,onSuggest}:{view:ConversationView;confirmation:ReturnType<typeof useLocalThemeChoiceConfirmation>;busy:boolean;onSuggest:(text:string)=>void}){
 const t=useT(),s=view.localThemeChoice,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localThemeChoiceExecution?.enabled&&!view.readOnlyReason&&!state.blocked;
 return <section aria-label={t('Thème du site — gratuit','Site theme — free')} data-syna-theme-choice-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {s?.diff&&<dl className="space-y-1"><dt className="text-muted">{t('Thème actuel','Current theme')}</dt><dd>{s.diff.before}</dd><dt className="text-muted">{t('Après confirmation','After confirmation')}</dt><dd>{s.diff.after}</dd></dl>}
  {s?.state==='proposed'&&s.preview&&<p className="flex flex-wrap gap-x-3 gap-y-1"><a href={s.preview.beforeHref} target="_blank" rel="noopener" className="underline">{t('Ouvrir le site actuel','Open the current site')}</a><a href={s.preview.afterHref} target="_blank" rel="noopener" className="underline" data-syna-theme-after>{t('Ouvrir l’aperçu du nouveau thème','Open the new theme preview')}</a></p>}
  {s?.state==='ambiguous'&&!!s.choices?.length&&<ul aria-label={t('Thèmes proposés','Available themes')} className="flex flex-wrap gap-2">{s.choices.map(c=><li key={c.id}><Button variant="ghost" disabled={busy} onClick={()=>onSuggest(`Choisis le thème ${c.name} pour mon site`)}>{c.name}</Button></li>)}</ul>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('L’aperçu reste inactif tant que vous n’avez pas confirmé. Après accord, seul le site de travail change : rien n’est mis en ligne, aucune image ni appel IA.','The preview stays inactive until you confirm. After agreement only the working site changes: nothing goes live, no image or AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalThemeChoiceReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · version ','Saved and re-read · version ')}{s!.version!.number}{' · '}<a href={s!.previewHref} target="_blank" rel="noopener" className="underline">{t('Voir le site de travail','View the working site')}</a></p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
