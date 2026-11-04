"use client";
import {useEffect} from 'react';
/**
 * #301 « SYNA complète », lot 1 — défaut vu dans le Studio compilé : après un rechargement, un accord resté en mémoire pour
 * une ANCIENNE proposition laissait la nouvelle carte en état « réponse incertaine » (« Confirmer » grisé, seul
 * « Réessayer la même confirmation gratuite » proposé, qui aurait enregistré la nouvelle proposition sous ce libellé).
 * Seulement quand l'accord en mémoire vise une AUTRE proposition que celle affichée, le transport relit l'état (lecture
 * seule) et l'abandonne. Une réponse perdue pour la proposition affichée n'est pas touchée : la carte garde
 * « Vérifier l'enregistrement » et « Réessayer la même confirmation » (contrat inchangé).
 */
export function useStaleConfirmation(controller:{refresh():Promise<void>}|null,uncertain:boolean,shown:{state?:string;proposalId?:string|null}|null|undefined,storageKey:string|null){
 const proposal=shown?.state==='proposed'?shown.proposalId??null:null;
 useEffect(()=>{
  if(!controller||!uncertain||!proposal||!storageKey)return;
  let stored:string|null=null;
  try{const raw=window.sessionStorage.getItem(storageKey);stored=raw?JSON.parse(raw)?.proposalId??null:null;}catch{return;}
  if(stored&&stored!==proposal)void controller.refresh();
 },[controller,uncertain,proposal,storageKey]);
}
