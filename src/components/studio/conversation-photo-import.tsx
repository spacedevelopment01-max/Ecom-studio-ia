"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createConversationPhotoImport,CONVERSATION_PHOTO_IMPORTED_EVENT,type PhotoImportState} from '@/lib/conversation-photo-import-client';
import {Button} from '../ui';
import {useT} from '../i18n';
export type AttachedPhoto={photoId:string;name:string;thumbHref:string};
/** #301 « SYNA complète » — branche le transport d'import photo de Codex (#378) : import gratuit, jamais analysé. */
export function useConversationPhotoImport(view:ConversationView|null){
 const current=useRef(view);current.current=view;
 const[state,setState]=useState<PhotoImportState>({busy:false,uncertain:false,error:'',requiresFile:false});
 const[photos,setPhotos]=useState<AttachedPhoto[]>([]);
 const controller=useMemo(()=>view?.projectId?createConversationPhotoImport({conversationId:view.id,view:()=>current.current!,fetch:(...a)=>fetch(...a),onState:setState,
  onReceipt:r=>{const a=r.asset;if(a)setPhotos(list=>list.some(p=>p.photoId===a.photoId)?list:[...list,{photoId:a.photoId,name:a.name,thumbHref:a.thumbHref??a.href}].slice(-12));},
  onImported:change=>{window.dispatchEvent(new CustomEvent(CONVERSATION_PHOTO_IMPORTED_EVENT,{detail:change}));},
  storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id,view?.projectId]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());if(controller.getState().uncertain)void controller.verify();}setPhotos([]);return()=>controller?.dispose();},[controller]);
 return{controller,state,photos,remove:(photoId:string)=>setPhotos(list=>list.filter(p=>p.photoId!==photoId)),clear:()=>setPhotos([])};
}
/**
 * Bouton « Importer une photo » du composeur SYNA : la photo est enregistrée gratuitement dans les fichiers du projet,
 * « importée, non analysée », puis jointe EXPLICITEMENT au prochain message (photoIds). Rien n'est analysé ni généré.
 */
export function ConversationPhotoImport({view,photo,busy}:{view:ConversationView;photo:ReturnType<typeof useConversationPhotoImport>;busy:boolean}){
 const t=useT(),input=useRef<HTMLInputElement>(null),{controller,state,photos}=photo;
 if(!view.photoImport?.enabled||view.readOnlyReason||view.recovery)return null;
 const pick=(retry:boolean)=>{const el=input.current;if(!el)return;el.dataset.retry=retry?'1':'';el.value='';el.click();};
 return <div data-syna-photo-import className="mt-2 space-y-2 border-t border-line pt-3 text-xs">
  <input ref={input} type="file" accept="image/*" className="sr-only" aria-label={t('Choisir une photo à importer','Choose a photo to import')} onChange={e=>{const f=e.currentTarget.files?.[0];if(!f||!controller)return;void (e.currentTarget.dataset.retry?controller.retry(f):controller.upload(f));}}/>
  <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="secondary" disabled={busy||state.busy||state.uncertain} onClick={()=>pick(false)}>{t('Importer une photo','Import a photo')}</Button><span className="text-muted">{t('Gratuit — la photo est rangée dans vos fichiers, non analysée.','Free — the photo is stored in your files, not analysed.')}</span></div>
  {!!photos.length&&<ul aria-label={t('Photos jointes au prochain message','Photos attached to the next message')} className="flex flex-wrap gap-2">{photos.map(p=><li key={p.photoId} className="flex min-w-0 items-center gap-2 rounded-lg border border-line p-1 pr-2">
   <img src={p.thumbHref} alt={p.name} width={40} height={40} className="size-10 shrink-0 rounded object-cover"/>
   <span className="min-w-0 max-w-40 break-words"><span className="block">{p.name}</span><span className="text-muted">{t('importée, non analysée','imported, not analysed')}</span></span>
   <button type="button" className="min-h-11 px-1 underline" aria-label={t(`Ne pas joindre ${p.name}`,`Do not attach ${p.name}`)} onClick={()=>photo.remove(p.photoId)}>{t('Retirer','Remove')}</button>
  </li>)}</ul>}
  {state.busy&&<p role="status">{t('Import en cours…','Importing…')}</p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {state.uncertain&&<div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.verify()}>{t('Vérifier l’import','Check the import')}</Button>{state.requiresFile?<Button type="button" variant="secondary" disabled={busy||state.busy} onClick={()=>pick(true)}>{t('Réessayer avec le même fichier','Retry with the same file')}</Button>:<Button type="button" variant="secondary" disabled={busy||state.busy} onClick={()=>void controller?.retry()}>{t('Réessayer le même import','Retry the same import')}</Button>}</div>}
 </div>;
}
