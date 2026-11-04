"use client";
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalFoldersReceipt} from '@/lib/local-folders-confirmation-client';
import type {useLocalFoldersConfirmation} from './use-local-folders-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 « SYNA complète » — carte Nouveau dossier gratuite (contrat #387 de Codex) : nom intégral et dossier parent
 * exacts (ou la racine), accord gratuit, dossier relu. Aucun fichier déplacé.
 */
export function ConversationLocalFolders({view,confirmation,busy}:{view:ConversationView;confirmation:ReturnType<typeof useLocalFoldersConfirmation>;busy:boolean}){
 const t=useT(),s=view.localFolders,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localFoldersExecution?.enabled&&nativeLocalEditAllowed(view)&&!state.blocked;
 const where=(parentId:string|null|undefined)=>parentId?(s?.parent?.id===parentId?s.parent.name:t('dossier choisi','chosen folder')):t('Racine (aucun dossier)','Root (no folder)');
 return <section aria-label={t('Nouveau dossier — gratuit','New folder — free')} data-syna-folder-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {s?.diff&&<dl className="space-y-1 break-words"><dt className="text-muted">{t('Nouveau dossier','New folder')}</dt><dd><strong>{s.diff.after.name}</strong></dd><dt className="text-muted">{t('Emplacement','Location')}</dt><dd>{where(s.diff.after.parentId)}</dd></dl>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('Un dossier vide est créé ; aucun fichier n’est déplacé. Aucun appel IA.','An empty folder is created; no file is moved. No AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalFoldersReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)} · <a href={s!.nativeHref} className="underline">{t('Voir dans Fichiers','View in Files')}</a></p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
