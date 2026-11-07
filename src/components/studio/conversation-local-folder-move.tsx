"use client";
import {localEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalFolderMoveReceipt} from '@/lib/local-folder-move-confirmation-client';
import type {useLocalFolderMoveConfirmation} from './use-local-folder-move-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 « SINA complète » — carte Déplacer un dossier gratuite (contrat #400 de Codex), distincte de « Nouveau dossier » et
 * de « Renommer un dossier » : dossier visé, emplacement actuel et nouvel emplacement exacts, accord gratuit, place relue.
 */
export function ConversationLocalFolderMove({view,confirmation,busy}:{view:ConversationView;confirmation:ReturnType<typeof useLocalFolderMoveConfirmation>;busy:boolean}){
 const t=useT(),s=view.localFolderMove,{controller,state}=confirmation;
 // Anciens projets (A1, #402) : ouvert seulement si le serveur liste l'opération ; sinon même règle que les projets suivis.
 if(!localEditAllowed(view,'folder-move')||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localFolderMoveExecution?.enabled&&localEditAllowed(view,'folder-move')&&!state.blocked;
 const where=(parent:{id:string;name:string}|undefined,parentId:string|null)=>parentId===null?t('Racine (aucun dossier)','Root (no folder)'):parent?.name??t('dossier choisi','chosen folder');
 return <section aria-label={t('Déplacer un dossier — gratuit','Move a folder — free')} data-syna-folder-move-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {s?.diff&&<dl className="space-y-1 break-words"><dt className="text-muted">{t('Dossier','Folder')}</dt><dd><strong>{s.diff.before.name}</strong></dd><dt className="text-muted">{t('Emplacement actuel','Current location')}</dt><dd>{where(s.parentBefore,s.diff.before.parentId)}</dd><dt className="text-muted">{t('Après confirmation','After confirmation')}</dt><dd><strong>{where(s.parentAfter,s.diff.after.parentId)}</strong></dd></dl>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('Seul l’emplacement change : le dossier garde son nom, ses sous-dossiers et ses fichiers. Aucun appel IA.','Only the location changes: the folder keeps its name, subfolders and files. No AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalFolderMoveReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)} · <a href={s!.nativeHref} className="underline">{t('Voir dans Fichiers','View in Files')}</a></p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
