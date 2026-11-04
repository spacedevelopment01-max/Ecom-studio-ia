"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalBusinessContentConfirmation,CONTENT_CHANGED_EVENT,type BusinessContentChange,type BusinessContentConfirmationState} from '@/lib/local-business-content-confirmation-client';
/** #301 C21 : branche le transport sur la conversation ; l'espace Biens / Carte / Réalisations se relit par `studio:content-changed`. */
export function useLocalBusinessContentConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:BusinessContentChange)=>void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<BusinessContentConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalBusinessContentConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:(change:BusinessContentChange)=>{callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<BusinessContentChange>(CONTENT_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localBusinessContent);
 return{controller,state};
}
