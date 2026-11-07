"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalCalendarConfirmation,LOCAL_CALENDAR_CHANGED_EVENT,type LocalCalendarChange,type LocalCalendarConfirmationState} from '@/lib/local-calendar-confirmation-client';
/** #301 « SINA complète » : branche le transport Calendrier de Codex (#375) ; le Calendrier natif se relit après le reçu. */
export function useLocalCalendarConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalCalendarChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalCalendarConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalCalendarConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalCalendarChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalCalendarChange>(LOCAL_CALENDAR_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localCalendar,view?`syna-free-calendar:${view.id}`:null);
 return{controller,state};
}
