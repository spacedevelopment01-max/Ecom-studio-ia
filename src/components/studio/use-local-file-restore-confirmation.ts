"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalFileRestoreConfirmation,LOCAL_FILE_RESTORE_CHANGED_EVENT,type LocalFileRestoreChange,type LocalFileRestoreConfirmationState} from '@/lib/local-file-restore-confirmation-client';
/** #301 « SINA complète » : branche le transport Corbeille de Codex (#393) ; l'écran Fichiers se relit après le reçu. */
export function useLocalFileRestoreConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalFileRestoreChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalFileRestoreConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalFileRestoreConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalFileRestoreChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalFileRestoreChange>(LOCAL_FILE_RESTORE_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localFileRestore,view?`syna-free-file-restore:${view.id}`:null);
 return{controller,state};
}
