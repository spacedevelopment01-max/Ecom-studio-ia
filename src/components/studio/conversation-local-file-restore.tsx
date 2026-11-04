"use client";
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalFileRestoreReceipt} from '@/lib/local-file-restore-confirmation-client';
import type {useLocalFileRestoreConfirmation} from './use-local-file-restore-confirmation';
import {Button} from '../ui';
import {useT,useLang} from '../i18n';
/**
 * #301 « SYNA complète » — carte Corbeille gratuite (contrat #393 de Codex) : liste des fichiers supprimés (noms et
 * liens seulement), « Restaurer » remplit la phrase exacte avec l'identifiant (jamais le premier homonyme), accord
 * gratuit, fichier relu sorti de la corbeille. La version et les octets du fichier ne changent pas.
 */
export function ConversationLocalFileRestore({view,confirmation,busy,onSuggest}:{view:ConversationView;confirmation:ReturnType<typeof useLocalFileRestoreConfirmation>;busy:boolean;onSuggest:(text:string)=>void}){
 const t=useT(),{lang}=useLang(),s=view.localFileRestore,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localFileRestoreExecution?.enabled&&nativeLocalEditAllowed(view)&&!state.blocked;
 const date=(ms:number)=>{try{return new Intl.DateTimeFormat(lang==='en'?'en-GB':'fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(ms));}catch{return new Date(ms).toISOString();}};
 return <section aria-label={t('Corbeille — gratuit','Bin — free')} data-syna-file-restore-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {!!s?.items?.length&&s.state!=='proposed'&&<ul aria-label={t('Fichiers de la corbeille','Files in the bin')} className="space-y-2">{s.items.map(i=><li key={i.id} className="flex min-w-0 flex-wrap items-center gap-2">
   <span className="min-w-0 flex-1 break-words"><strong>{i.name}</strong><span className="block text-xs text-muted">{i.kind}{t(' · supprimé le ',' · deleted on ')}{date(i.deletedAt)}</span></span>
   <Button variant="ghost" disabled={busy} aria-label={t(`Restaurer ${i.name}`,`Restore ${i.name}`)} onClick={()=>onSuggest(`Restaure le fichier « ${i.id} » de la corbeille`)}>{t('Restaurer','Restore')}</Button>
  </li>)}</ul>}
  {s?.hasMore&&<p><a href={s.nativeHref} className="underline">{t('Plus de 50 fichiers : voir la suite dans Fichiers','More than 50 files: see the rest in Files')}</a></p>}
  {s?.asset&&s.state!=='listed'&&<p className="break-words">{t('Fichier : ','File: ')}<strong>{s.asset.name}</strong>{t(' · version ',' · version ')}{s.asset.version}</p>}
  {s?.diff&&<dl className="space-y-1"><dt className="text-muted">{t('Avant','Before')}</dt><dd>{t('Dans la corbeille depuis le ','In the bin since ')}{date(s.diff.before.deletedAt)}</dd><dt className="text-muted">{t('Après confirmation','After confirmation')}</dt><dd>{t('De retour dans les fichiers','Back in your files')}{s.diff.after.folderId?'':t(' (à la racine)',' (at the root)')}</dd></dl>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('Le fichier revient tel quel : même version, même contenu. Aucun appel IA.','The file comes back as is: same version, same content. No AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalFileRestoreReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)} · <a href={s!.nativeHref} className="underline">{t('Voir dans Fichiers','View in Files')}</a></p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
