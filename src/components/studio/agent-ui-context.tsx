"use client";
import {createContext,useContext,useState,type ReactNode} from 'react';
/** SINA est-elle ouverte sur cette installation, et son panneau est-il déplié ? Partagé par tous les écrans du projet. */
const AgentUi=createContext(false);
const AgentPanel=createContext({open:false,setOpen:(_value:boolean)=>{}});
export function AgentUiProvider({enabled,children}:{enabled:boolean;children:ReactNode}){const[open,setOpen]=useState(false);return <AgentUi.Provider value={enabled}><AgentPanel.Provider value={{open:enabled&&open,setOpen}}>{children}</AgentPanel.Provider></AgentUi.Provider>;}
export const useAgentUi=()=>useContext(AgentUi);
export const useAgentPanel=()=>useContext(AgentPanel);
