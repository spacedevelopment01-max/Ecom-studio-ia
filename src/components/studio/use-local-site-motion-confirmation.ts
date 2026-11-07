"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalSiteMotionConfirmation,LOCAL_SITE_MOTION_CHANGED_EVENT,type LocalSiteMotionChange,type LocalSiteMotionConfirmationState} from '@/lib/local-site-motion-confirmation-client';
/** #301 « SINA complète » : branche le transport Animations de Codex (#379) ; le Studio se relit après le reçu. */
export function useLocalSiteMotionConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(change:LocalSiteMotionChange)=>Promise<void>|void){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<LocalSiteMotionConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalSiteMotionConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:async(change:LocalSiteMotionChange)=>{await callbacks.current.onApplied(change);window.dispatchEvent(new CustomEvent<LocalSiteMotionChange>(LOCAL_SITE_MOTION_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localSiteMotion,view?`syna-free-motion:${view.id}`:null);
 return{controller,state};
}
