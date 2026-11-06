"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalPagesConfirmation,LOCAL_PAGES_CHANGED_EVENT,type LocalPagesChange,type LocalPagesConfirmationState} from '@/lib/local-pages-confirmation-client';
/** #301 « SINA complète » : branche le transport Pages de Codex (#367 / #370) sur la conversation ; le Studio se relit après le reçu. */
export function useLocalPagesConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalPagesChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalPagesConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalPagesConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalPagesChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalPagesChange>(LOCAL_PAGES_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localPages,view?`syna-free-pages:${view.id}`:null);
 return{controller,state};
}
