"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalBookingEditConfirmation,LOCAL_BOOKING_EDIT_CHANGED_EVENT,type LocalBookingEditChange,type LocalBookingEditConfirmationState} from '@/lib/local-booking-edit-confirmation-client';
/** #301 « SINA complète » : retouche réservable (contrat #418 / #419 de Codex) ; Rendez-vous et l'aperçu du site se relisent après le reçu. */
export function useLocalBookingEditConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalBookingEditChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalBookingEditConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalBookingEditConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalBookingEditChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalBookingEditChange>(LOCAL_BOOKING_EDIT_CHANGED_EVENT,{detail:change}));window.dispatchEvent(new CustomEvent('studio:theme-changed',{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.bookingEdit,view?`syna-free-booking-edit:${view.id}:${view.projectId}`:null);
 return{controller,state};
}
