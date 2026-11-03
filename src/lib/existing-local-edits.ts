import type {ConversationView} from './orchestrator/conversation/contract';
/**
 * #301 C03 — anciens projets (A1, lecture seule) : seules les retouches gratuites que le serveur ouvre explicitement
 * (`recovery.localEdits.ops`, contrat #313 de Codex) restent utilisables dans leurs cartes. Tout le reste du projet
 * reste en lecture seule : aucune autre carte, aucun devis, aucun outil ne s'ouvre ici.
 */
export type ExistingLocalOp='local-site'|'files';
export const localEditAllowed=(v:ConversationView,op:ExistingLocalOp)=>v.recovery?v.recovery.localEdits?.ops.includes(op)===true:!v.readOnlyReason;
