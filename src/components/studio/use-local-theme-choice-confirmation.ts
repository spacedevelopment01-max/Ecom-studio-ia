"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalThemeChoiceConfirmation,LOCAL_THEME_CHOICE_CHANGED_EVENT as LOCAL_THEME_CHANGED_EVENT,type LocalThemeChoiceChange,type LocalThemeChoiceConfirmationState} from '@/lib/local-theme-choice-confirmation-client';
/** #301 « SYNA complète » : branche le transport Choix du thème de Codex (#376) ; le site de travail se relit après le reçu. */
export function useLocalThemeChoiceConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalThemeChoiceChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalThemeChoiceConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalThemeChoiceConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalThemeChoiceChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalThemeChoiceChange>(LOCAL_THEME_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localThemeChoice,view?`syna-free-theme-choice:${view.id}`:null);
 return{controller,state};
}
