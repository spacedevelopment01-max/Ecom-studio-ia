"use client";
import {localEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalFolderRenameReceipt} from '@/lib/local-folder-rename-confirmation-client';
import type {useLocalFolderRenameConfirmation} from './use-local-folder-rename-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 « SINA complète » — carte Renommer un dossier gratuite (contrat #398 de Codex), distincte de « Nouveau dossier » :
 * ancien et nouveau nom exacts, accord gratuit, nom relu. Le dossier garde son contenu et sa place.
 */
export function ConversationLocalFolderRename({view,confirmation,busy}:{view:ConversationView;confirmation:ReturnType<typeof useLocalFolderRenameConfirmation>;busy:boolean}){
 const t=useT(),s=view.localFolderRename,{controller,state}=confirmation;
 // Anciens projets (A1, #402) : ouvert seulement si le serveur liste l'opération ; sinon même règle que les projets suivis.
 if(!localEditAllowed(view,'folder-rename')||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localFolderRenameExecution?.enabled&&localEditAllowed(view,'folder-rename')&&!state.blocked;
 return <section aria-label={t('Renommer un dossier — gratuit','Rename a folder — free')} data-syna-folder-rename-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {s?.diff&&<dl className="space-y-1 break-words"><dt className="text-muted">{t('Nom actuel','Current name')}</dt><dd>{s.diff.before.name}</dd><dt className="text-muted">{t('Après confirmation','After confirmation')}</dt><dd><strong>{s.diff.after.name}</strong></dd></dl>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('Seul le nom change : le dossier garde sa place, ses sous-dossiers et ses fichiers. Aucun appel IA.','Only the name changes: the folder keeps its place, subfolders and files. No AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalFolderRenameReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)} · <a href={s!.nativeHref} className="underline">{t('Voir dans Fichiers','View in Files')}</a></p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
