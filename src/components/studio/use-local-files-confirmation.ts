"use client";
import {useStaleConfirmation} from './use-stale-confirmation';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {createLocalFilesConfirmation,FILES_CHANGED_EVENT,type FilesChange,type FilesConfirmationState} from '@/lib/local-files-confirmation-client';
/** #301 C24 : branche le transport Fichiers sur la conversation ; l'écran Fichiers se relit par `studio:files-changed`. */
export function useLocalFilesConfirmation(view:ConversationView|null,onView:(v:ConversationView)=>void){
 const current=useRef(view),callback=useRef(onView);current.current=view;callback.current=onView;
 const[state,setState]=useState<FilesConfirmationState>({busy:false,error:'',uncertain:false});
 const controller=useMemo(()=>view?createLocalFilesConfirmation({conversationId:view.id,fetch:(...args)=>fetch(...args),view:()=>current.current!,onView:v=>callback.current(v),onState:setState,onApplied:(change:FilesChange)=>{window.dispatchEvent(new CustomEvent<FilesChange>(FILES_CHANGED_EVENT,{detail:change}));},storage:typeof window==='undefined'?undefined:window.sessionStorage}):null,[view?.id]);
 useEffect(()=>{if(controller){controller.activate();setState(controller.getState());}return()=>controller?.dispose();},[controller]);
 useStaleConfirmation(controller,state.uncertain,view?.localFiles,view?`syna-free-files:${view.id}`:null);
 return{controller,state};
}
