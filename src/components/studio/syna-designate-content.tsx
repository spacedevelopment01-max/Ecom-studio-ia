"use client";
import {useEffect} from 'react';
import {Button} from '../ui';
import {useT} from '../i18n';
import {useProject} from './project-context';
import {useAgentFocus,useAgentPanel,useAgentUi} from './agent-ui-context';
import {CONTENT_CHANGED_EVENT,type BusinessContentChange} from '@/lib/local-business-content-confirmation-client';
/**
 * #301 C21 — « Désigner pour SYNA » sur un bien, un plat ou une réalisation (même geste que le Catalogue) :
 * la cible A2 porte la version native exacte (date de dernière modification), puis la conversation s'ouvre.
 * Invisible quand le raccordement est fermé : jamais de bouton qui ne mène à rien.
 */
const TAB={biens:'biens',plats:'carte',realisations:'realisations'} as const;
export function DesignateContentForSyna({type,itemId,updatedAt,label}:{type:'biens'|'plats'|'realisations';itemId:string;updatedAt?:number;label:string}){
 const t=useT(),{id,data}=useProject(),agentUi=useAgentUi(),{focus,setFocus}=useAgentFocus(),{setOpen}=useAgentPanel();
 if(!agentUi||!data?.conversationBusinessContent||!updatedAt)return null;
 const version=String(updatedAt),on=focus?.projectId===id&&focus.target.kind==='content-item'&&focus.target.itemId===itemId&&focus.target.version===version;
 return <Button size="sm" variant="secondary" aria-pressed={on} onClick={()=>{setFocus({projectId:id,tab:TAB[type],label,target:{kind:'content-item',type,itemId,version}});setOpen(true);}}>{on?t('Désigné pour SYNA','Selected for SYNA'):t('Désigner pour SYNA','Select for SYNA')}</Button>;
}
/** Relit l'espace quand SYNA vient d'enregistrer un de ses contenus (sans attendre l'actualisation du Studio). */
export function useContentChanged(type:'biens'|'plats'|'realisations',reload:()=>void){
 const {id}=useProject();
 useEffect(()=>{const changed=(e:Event)=>{const d=(e as CustomEvent<BusinessContentChange>).detail;if(d?.projectId===id&&d.type===type)reload();};window.addEventListener(CONTENT_CHANGED_EVENT,changed);return()=>window.removeEventListener(CONTENT_CHANGED_EVENT,changed);},[id,type,reload]);
}
