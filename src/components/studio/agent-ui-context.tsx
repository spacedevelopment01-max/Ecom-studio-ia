"use client";
import {createContext,useContext,useState,type ReactNode} from 'react';
import type {ActiveTarget} from '@/lib/orchestrator/conversation/active-context-contract';
const AgentUi=createContext(false);
const AgentPanel=createContext({open:false,setOpen:(_value:boolean)=>{}});
type Focus={projectId:string;tab:string;target:ActiveTarget;label?:string};
const AgentFocus=createContext<{focus:Focus|null;setFocus:(value:Focus|null)=>void}>({focus:null,setFocus:()=>{}});
export function AgentUiProvider({enabled,children}:{enabled:boolean;children:ReactNode}){const[open,setOpen]=useState(false),[focus,setFocus]=useState<Focus|null>(null);return <AgentUi.Provider value={enabled}><AgentPanel.Provider value={{open:enabled&&open,setOpen}}><AgentFocus.Provider value={{focus,setFocus}}>{children}</AgentFocus.Provider></AgentPanel.Provider></AgentUi.Provider>;}
export const useAgentUi=()=>useContext(AgentUi);
export const useAgentPanel=()=>useContext(AgentPanel);
export const useAgentFocus=()=>useContext(AgentFocus);
