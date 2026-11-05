"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalThemeRestoreConfirmation,LOCAL_THEME_RESTORE_CHANGED_EVENT,type LocalThemeRestoreChange,type LocalThemeRestoreConfirmationState} from '@/lib/local-theme-restore-confirmation-client';
/** #301 « SYNA complète » : branche le transport Restauration des versions de Codex (#382) ; le Studio se relit après le reçu. */
export function useLocalThemeRestoreConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalThemeRestoreChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalThemeRestoreConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalThemeRestoreConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalThemeRestoreChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalThemeRestoreChange>(LOCAL_THEME_RESTORE_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localThemeRestore,view?`syna-free-restore:${view.id}`:null);
 return{controller,state};
}
