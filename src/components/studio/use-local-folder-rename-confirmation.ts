"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalFolderRenameConfirmation,LOCAL_FOLDER_RENAME_CHANGED_EVENT,type LocalFolderRenameChange,type LocalFolderRenameConfirmationState} from '@/lib/local-folder-rename-confirmation-client';
/** #301 « SINA complète » : branche le transport Renommage de dossier de Codex (#398) ; l'écran Fichiers se relit après le reçu. */
export function useLocalFolderRenameConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalFolderRenameChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalFolderRenameConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalFolderRenameConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalFolderRenameChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalFolderRenameChange>(LOCAL_FOLDER_RENAME_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localFolderRename,view?`syna-free-folder-rename:${view.id}:${view.projectId}`:null);
 return{controller,state};
}
