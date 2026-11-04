import type {ConversationView} from './orchestrator/conversation/contract';
/**
 * Le dernier tour est un accord ou une annulation gratuite d'une carte (« confirm-… » / « cancel-… ») : la demande a déjà
 * reçu sa réponse gratuite, SYNA ne propose donc pas de devis payant pour y répondre (recette lot 9, annulation).
 */
export const freeTurnSettled=(v:Pick<ConversationView,'history'>)=>{const r=v.history?.at(-1)?.request as {action?:unknown}|undefined;return typeof r?.action==='string'&&/^(?:confirm|cancel)-[a-z-]+$/.test(r.action);};
