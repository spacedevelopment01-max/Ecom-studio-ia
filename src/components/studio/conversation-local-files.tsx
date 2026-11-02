"use client";
import {useEffect,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasNativeFilesReceipt} from '@/lib/local-files-confirmation-client';
import type {useLocalFilesConfirmation} from './use-local-files-confirmation';
import {api,Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 C24 — carte Fichiers de SYNA (contrat #305) : avant / après, « Gratuit — 0 € », confirmation explicite,
 * reçu relu sur le serveur. Distincte des cartes Site et Catalogue : elle ne parle que du fichier désigné.
 */
export function ConversationLocalFiles({view,confirmation,busy,selectionMatches}:{view:ConversationView;confirmation:ReturnType<typeof useLocalFilesConfirmation>;busy:boolean;selectionMatches:boolean}){
 const t=useT(),s=view.localFiles,{controller,state}=confirmation;
 const [folders,setFolders]=useState<Record<string,string>>({});
 const needsFolders=s?.command==='move'&&!!s.diff?.before.folderId;
 useEffect(()=>{if(!needsFolders||!view.projectId)return;let alive=true;api<{folders:{id:string;name:string}[]}>(`/api/projects/${view.projectId}/files?folder=root`).then(r=>{if(alive)setFolders(Object.fromEntries(r.folders.map(f=>[f.id,f.name])));}).catch(()=>{});return()=>{alive=false;};},[needsFolders,view.projectId]);
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localFilesExecution?.enabled&&!view.readOnlyReason&&!state.blocked,valid=hasNativeFilesReceipt(view);
 const folderLabel=(id:string|null)=>id===null?t('Racine (aucun dossier)','Root (no folder)'):id===s?.folder?.id?s.folder.label:folders[id]??t('Dossier actuel','Current folder');
 const row=(label:string,before:string,after:string)=><><dt className="font-semibold">{label}</dt><dd className="grid gap-1"><span><span className="text-muted">{t('Avant : ','Before: ')}</span>{before}</span><span><span className="text-muted">{t('Après confirmation : ','After confirmation: ')}</span>{after}</span></dd></>;
 return <section aria-label={t('Rangement gratuit du fichier','Free file organisation')} data-syna-files-card className="space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>
  {s&&<p>{s.message}</p>}
  {s?.asset&&<p className="break-words">{t('Fichier : ','File: ')}<strong>{s.asset.name}</strong>{t(' · version ',' · version ')}{s.asset.version}</p>}
  {s?.diff&&<dl className="space-y-2 break-words">
   {s.diff.before.name!==s.diff.after.name&&row(t('Nom','Name'),s.diff.before.name,s.diff.after.name)}
   {s.diff.before.folderId!==s.diff.after.folderId&&row(t('Dossier','Folder'),folderLabel(s.diff.before.folderId),folderLabel(s.diff.after.folderId))}
  </dl>}
  {s?.state==='proposed'&&enabled&&<>
   <p className="text-xs text-muted">{t('Seuls le nom ou le dossier changent : le contenu du fichier, ses versions et son historique restent identiques. Aucun appel IA.','Only the name or folder changes: the file content, versions and history stay identical. No AI call.')}</p>
   {!selectionMatches&&<p className="text-xs">{t('Ouvrez ce fichier dans Fichiers pour confirmer.','Open this file in Files to confirm.')}</p>}
   <div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain||!selectionMatches} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>
  </>}
  {valid&&<div role="status" className="space-y-1"><p>{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}<span className="font-mono text-xs">{s!.receiptId!.slice(0,8)}</span></p><a className="underline" href={`/studio/${view.projectId}/fichiers`}>{t('Voir dans Fichiers','View in Files')}</a></div>}
  {state.error&&<div className="space-y-2"><p role="alert">{state.error}</p>{!state.uncertain&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Actualiser sans exécuter','Refresh without running')}</Button>}</div>}
  {state.uncertain&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button><Button variant="secondary" disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button></div>}
 </section>;
}
