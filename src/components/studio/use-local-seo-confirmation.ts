"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalSeoConfirmation,LOCAL_SEO_CHANGED_EVENT,type LocalSeoChange,type LocalSeoConfirmationState} from '@/lib/local-seo-confirmation-client';
/** #301 « SINA complète » : branche le transport Seo de Codex (#367 / #370) sur la conversation ; le Studio se relit après le reçu. */
export function useLocalSeoConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalSeoChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalSeoConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalSeoConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalSeoChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalSeoChange>(LOCAL_SEO_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localSeo,view?`syna-free-seo:${view.id}`:null);
 return{controller,state};
}
