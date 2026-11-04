"use client";
import {localEditAllowed} from '@/lib/existing-local-edits';
import {useEffect,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasNativeFilesReceipt} from '@/lib/local-files-confirmation-client';
import type {useLocalFilesConfirmation} from './use-local-files-confirmation';
import {api,Button} from '../ui';
import {useT} from '../i18n';
type LibraryItem=NonNullable<NonNullable<ConversationView['localFiles']>['items']>[number];
/**
 * #301 C24 — carte Fichiers de SYNA (contrat #305) : avant / après, « Gratuit — 0 € », confirmation explicite,
 * reçu relu sur le serveur. Distincte des cartes Site et Catalogue : elle ne parle que du fichier désigné.
 * « SYNA complète » (contrat #377) : lecture de la bibliothèque — liste des fichiers ou dossiers natifs, liens, et
 * désignation explicite d'un fichier (jamais le premier résultat) ; SYNA ne prétend pas avoir regardé les images.
 */
export function ConversationLocalFiles({view,confirmation,busy,selectionMatches,onDesignate}:{view:ConversationView;confirmation:ReturnType<typeof useLocalFilesConfirmation>;busy:boolean;selectionMatches:boolean;onDesignate?:(item:LibraryItem)=>void}){
 const t=useT(),s=view.localFiles,{controller,state}=confirmation;
 const [folders,setFolders]=useState<Record<string,string>>({});
 const needsFolders=s?.command==='move'&&!!s.diff?.before.folderId;
 useEffect(()=>{if(!needsFolders||!view.projectId)return;let alive=true;api<{folders:{id:string;name:string}[]}>(`/api/projects/${view.projectId}/files?folder=root`).then(r=>{if(alive)setFolders(Object.fromEntries(r.folders.map(f=>[f.id,f.name])));}).catch(()=>{});return()=>{alive=false;};},[needsFolders,view.projectId]);
 if(!localEditAllowed(view,'files')||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localFilesExecution?.enabled&&localEditAllowed(view,'files')&&!state.blocked,valid=hasNativeFilesReceipt(view);
 const folderLabel=(id:string|null)=>id===null?t('Racine (aucun dossier)','Root (no folder)'):id===s?.folder?.id?s.folder.label:folders[id]??t('Dossier actuel','Current folder');
 const row=(label:string,before:string,after:string)=><><dt className="font-semibold">{label}</dt><dd className="grid gap-1"><span><span className="text-muted">{t('Avant : ','Before: ')}</span>{before}</span><span><span className="text-muted">{t('Après confirmation : ','After confirmation: ')}</span>{after}</span></dd></>;
 return <section aria-label={s?.command==='read'?t('Fichiers du projet — lecture gratuite','Project files — free reading'):t('Rangement gratuit du fichier','Free file organisation')} data-syna-files-card className="space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>
  {s&&<p>{s.message}</p>}
  {s?.command==='read'&&<p className="text-xs text-muted">{t('Lecture des noms et des liens seulement : SYNA n’a pas regardé les images et rien n’a été modifié.','Names and links only: SYNA did not look at the images and nothing was changed.')}</p>}
  {s?.command==='read'&&!!s.items?.length&&<ul aria-label={t('Fichiers trouvés','Files found')} data-syna-library-items className="space-y-2">{s.items.map(item=><li key={item.id} className="flex min-w-0 items-center gap-3">
   {item.thumbHref?<img src={item.thumbHref} alt={item.name} width={48} height={48} className="size-12 shrink-0 rounded object-cover"/>:<span aria-hidden className="grid size-12 shrink-0 place-items-center rounded border border-line text-xs text-muted">{item.kind}</span>}
   <span className="min-w-0 flex-1"><a href={item.href} target="_blank" rel="noopener" className="block break-words underline">{item.name}</a><span className="text-xs text-muted">{item.kind}{t(' · version ',' · version ')}{item.version}</span></span>
   {onDesignate&&<Button variant="ghost" disabled={busy} aria-label={t(`Désigner ${item.name}`,`Designate ${item.name}`)} onClick={()=>onDesignate(item)}>{t('Désigner','Designate')}</Button>}
  </li>)}</ul>}
  {s?.command==='read'&&!!s.folders?.length&&<ul aria-label={t('Dossiers du projet','Project folders')} className="list-disc space-y-1 pl-5 break-words">{s.folders.map(f=><li key={f.id}>{f.name}</li>)}</ul>}
  {s?.command==='read'&&s.nativeHref&&<p>{s.hasMore&&<>{t('Plus de 50 résultats. ','More than 50 results. ')}</>}<a href={s.nativeHref} className="underline">{s.hasMore?t('Voir la suite dans Fichiers','See the rest in Files'):t('Ouvrir Fichiers','Open Files')}</a></p>}
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
