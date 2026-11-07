"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalFolderMoveConfirmation,LOCAL_FOLDER_MOVE_CHANGED_EVENT,type LocalFolderMoveChange,type LocalFolderMoveConfirmationState} from '@/lib/local-folder-move-confirmation-client';
/** #301 « SINA complète » : branche le transport Déplacement de dossier de Codex (#400) ; l'écran Fichiers se relit après le reçu. */
export function useLocalFolderMoveConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalFolderMoveChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalFolderMoveConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalFolderMoveConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalFolderMoveChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalFolderMoveChange>(LOCAL_FOLDER_MOVE_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localFolderMove,view?`syna-free-folder-move:${view.id}:${view.projectId}`:null);
 return{controller,state};
}
