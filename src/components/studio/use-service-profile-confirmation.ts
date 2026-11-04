"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createServiceProfileConfirmation,SERVICE_PROFILE_CHANGED_EVENT,type ServiceProfileChange,type ServiceProfileConfirmationState} from '@/lib/service-profile-confirmation-client';
/** #301 C21 : branche le transport sur la conversation ; l'espace Biens / Carte / Réalisations se relit par `studio:content-changed`. */
export function useServiceProfileConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:ServiceProfileChange)=>void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<ServiceProfileConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createServiceProfileConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:(change:ServiceProfileChange)=>{callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<ServiceProfileChange>(SERVICE_PROFILE_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.serviceProfile,view?`syna-free-service-profile:${view.id}`:null);
 return{controller,state};
}
