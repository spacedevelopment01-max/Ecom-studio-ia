/**
 * Contexte d'exécution d'une tâche (worker ou requête) : compte client, projet concerné et portée du décompte.
 * Séparé de ai/access.ts pour que le budget (billing.ts) retrouve le projet sans dépendance circulaire.
 */
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Portée du décompte pendant une tâche :
 *  - « creation » : création initiale de la boutique ;
 *  - « ugc » : la vidéo UGC compte une fois en entier ;
 *  - « normal » : chaque génération compte.
 */
export type QuotaScope = "normal" | "creation" | "ugc";
export type RunScope = { userId: string; projectId: string | null; scope: QuotaScope };

export const runScope = new AsyncLocalStorage<RunScope>();
export const currentRunScope = () => runScope.getStore() ?? null;
