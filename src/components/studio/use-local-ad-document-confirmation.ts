"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalAdDocumentConfirmation,adDocumentJobPending,type AdDocumentConfirmationState} from '@/lib/local-ad-document-confirmation-client';
export function useLocalAdDocumentConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void,onApplied:(v:ConversationView)=>Promise<void>){
 const current=useRef(view),callbacks=useRef({onView,onApplied});current.current=view;callbacks.current={onView,onApplied};
 const[state,setState]=useState<AdDocumentConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>{let storage:Storage|undefined;try{storage=typeof window==='undefined'?undefined:window.sessionStorage;}catch{}return view?createLocalAdDocumentConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callbacks.current.onView(v),onState:setState,onApplied:v=>callbacks.current.onApplied(v),storage}):null;},[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 const polling=adDocumentJobPending(view);useEffect(()=>{if(!polling||!controller)return;const timer=setInterval(()=>void controller.refresh(),1500);return()=>clearInterval(timer);},[polling,controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localAdDocument);
 return{controller,state};
}
