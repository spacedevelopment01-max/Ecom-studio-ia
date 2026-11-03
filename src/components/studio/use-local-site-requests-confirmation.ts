"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalRequestsConfirmation,SITE_REQUESTS_CHANGED_EVENT,type RequestsChange,type RequestsConfirmationState} from '@/lib/local-site-requests-confirmation-client';
/** #301 C22 : branche le transport sur la conversation ; la fenêtre native des demandes se relit par l'événement. */
export function useLocalSiteRequestsConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void){
 const current=useRef(view),callback=useRef(onView);current.current=view;callback.current=onView;
 const[state,setState]=useState<RequestsConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalRequestsConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callback.current(v),onState:setState,onApplied:(change:RequestsChange)=>{window.dispatchEvent(new CustomEvent<RequestsChange>(SITE_REQUESTS_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 return{controller,state};
}
