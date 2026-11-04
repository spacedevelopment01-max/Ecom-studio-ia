"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalStockConfirmation,LOCAL_STOCK_CHANGED_EVENT,type LocalStockChange,type LocalStockConfirmationState} from '@/lib/local-stock-confirmation-client';
/** #301 « SYNA complète » : branche le transport Stock de Codex (#373) sur la conversation ; le Studio se relit après le reçu. */
export function useLocalStockConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalStockChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalStockConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalStockConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalStockChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalStockChange>(LOCAL_STOCK_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localStock,view?`syna-free-stock:${view.id}`:null);
 return{controller,state};
}
