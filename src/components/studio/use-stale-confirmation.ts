"use client";
import {useEffect} from 'react';
/**
 * #301 « SYNA complète », lot 1 — défaut vu dans le Studio compilé : après un rechargement, un accord resté en mémoire pour
 * une ANCIENNE proposition laissait la nouvelle carte en état « réponse incertaine » (« Confirmer » grisé, seul
 * « Réessayer la même confirmation gratuite » proposé, qui aurait enregistré la nouvelle proposition sous ce libellé).
 * Dès qu'une proposition affichée est connue et qu'un accord incertain existe, le transport relit l'état (lecture
 * seule) : il abandonne l'accord d'une autre proposition, ou retrouve le reçu ; une réponse perdue pour la proposition
 * affichée reste incertaine, rien n'est écrit.
 */
export function useStaleConfirmation(controller:{refresh():Promise<void>}|null,uncertain:boolean,shown:{state?:string;proposalId?:string|null}|null|undefined){
 const proposal=shown?.state==='proposed'?shown.proposalId??null:null;
 useEffect(()=>{if(controller&&uncertain&&proposal)void controller.refresh();},[controller,uncertain,proposal]);
}
