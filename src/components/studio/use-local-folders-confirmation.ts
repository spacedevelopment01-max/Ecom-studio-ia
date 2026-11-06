"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalFoldersConfirmation,LOCAL_FOLDERS_CHANGED_EVENT,type LocalFoldersChange,type LocalFoldersConfirmationState} from '@/lib/local-folders-confirmation-client';
/** #301 « SINA complète » : branche le transport Création de dossier de Codex (#387) ; le Studio se relit après le reçu. */
export function useLocalFoldersConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalFoldersChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalFoldersConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalFoldersConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalFoldersChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalFoldersChange>(LOCAL_FOLDERS_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localFolders,view?`syna-free-folder:${view.id}`:null);
 return{controller,state};
}
