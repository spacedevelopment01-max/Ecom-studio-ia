"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalSiteConfirmation,type FreeConfirmationState} from '@/lib/local-site-confirmation-client';
export function useLocalSiteConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(v:ConversationView)=>Promise<void>,onRevalidated?:(v:ConversationView)=>void){
 const current=useRef(view),callbacks=useRef({onView,onApplied,onRevalidated});current.current=view;callbacks.current={onView,onApplied,onRevalidated};
 const[state,setState]=useState<FreeConfirmationState>({busy:false,error:'',uncertain:false,context:null});
 const controller=useMemo(()=>view?createLocalSiteConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:v=>callbacks.current.onApplied(v),onRevalidated:v=>callbacks.current.onRevalidated?.(v),storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localSite);
 return{controller,state};
}
