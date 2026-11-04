import type {ConversationView} from './orchestrator/conversation/contract';
/**
 * #301 C03 — anciens projets (A1, lecture seule) : seules les retouches gratuites que le serveur ouvre explicitement
 * (`recovery.localEdits.ops`, contrat #313 de Codex) restent utilisables dans leurs cartes. Tout le reste du projet
 * reste en lecture seule : aucune autre carte, aucun devis, aucun outil ne s'ouvre ici.
 */
export type ExistingLocalOp='local-site'|'files'|'folder-rename'|'folder-move';
export const localEditAllowed=(v:ConversationView,op:ExistingLocalOp)=>v.recovery?v.recovery.localEdits?.ops.includes(op)===true:(v.localEditsWritable??!v.readOnlyReason);

/** Native domains without an A1 exception must never infer permission from a free editable fiche. */
export const nativeLocalEditAllowed=(v:ConversationView)=>!v.recovery&&(v.localEditsWritable??!v.readOnlyReason);

/** Account metadata can be readable while the brief and every business action remain closed. */
export const localReadAllowed=(v:ConversationView,op:'prompts')=>{
 if(op!=='prompts'||v.localPromptsRead?.enabled!==true)return false;
 if(!v.recovery)return v.localEditsWritable??!v.readOnlyReason;
 const cap=v.recovery.localReads;
 return cap?.schema==='existing-local-read-1'&&cap.readOnly===true&&cap.confirmationRequired===false&&cap.costEur===0&&cap.providerCalls===0&&cap.financialConsent===false&&cap.ops.includes(op);
};
