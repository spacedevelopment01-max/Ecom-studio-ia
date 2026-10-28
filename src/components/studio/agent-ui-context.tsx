"use client";
import {createContext,useContext,type ReactNode} from 'react';
const AgentUi=createContext(false);
export function AgentUiProvider({enabled,children}:{enabled:boolean;children:ReactNode}){return <AgentUi.Provider value={enabled}>{children}</AgentUi.Provider>;}
export const useAgentUi=()=>useContext(AgentUi);
