/**
 * Accès à l'IA pendant une tâche. Le client ne choisit plus entre « local » et « IA » : avec un forfait, le studio
 * utilise l'IA et ne passe sur le moteur local que quand le budget IA caché du compte est épuisé.
 * Découverte gratuite (sans forfait) : moteur local uniquement, aucun appel à l'IA.
 * Le worker exécute chaque tâche « pour » son utilisateur (AsyncLocalStorage), avec la portée de décompte des quotas.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { balance, EUR, getSubscription, planOf } from "../billing";

/**
 * Portée du décompte des quotas pendant une tâche :
 *  - « creation » : création initiale de la boutique (visuels non décomptés, vidéos IA décomptées) ;
 *  - « ugc » : la vidéo UGC est décomptée une fois en entier (ses images et plans ne comptent pas à part) ;
 *  - « normal » : chaque visuel et chaque vidéo IA est décompté.
 */
export type QuotaScope = "normal" | "creation" | "ugc";
const store = new AsyncLocalStorage<{ userId: string; scope: QuotaScope }>();

/** En dessous de ce disponible, une génération IA ne pourrait pas aboutir : moteur local. */
export const AI_MIN_AVAILABLE = 0.5 * EUR;

export function runForUser<T>(userId: string | null | undefined, fn: () => Promise<T>, scope: QuotaScope = "normal"): Promise<T> {
  return userId ? store.run({ userId, scope }, fn) : fn();
}

/** Change la portée de décompte pour la suite de la tâche en cours (ex. production d'une vidéo UGC). */
export function withQuotaScope<T>(scope: QuotaScope, fn: () => Promise<T>): Promise<T> {
  const cur = store.getStore();
  return cur ? store.run({ ...cur, scope }, fn) : fn();
}

export function currentAiUser(): string | null {
  return store.getStore()?.userId ?? null;
}
export function currentQuotaScope(): QuotaScope {
  return store.getStore()?.scope ?? "normal";
}

/** L'IA sera réellement utilisée pour ce client (budget suffisant). */
export function aiActiveFor(userId: string): boolean {
  // Découverte gratuite (aucun forfait) : tout est fait par le moteur local, aucun appel à l'IA.
  if (!planOf(getSubscription(userId))) return false;
  return hasAiCredits(userId);
}

/** Le budget IA caché du compte permet-il encore une génération ? */
export function hasAiCredits(userId: string): boolean {
  return balance(userId).available >= AI_MIN_AVAILABLE;
}

/** IA autorisée pour la tâche en cours. Hors tâche : seule la configuration des fournisseurs compte. */
export function currentUserHasAiCredits(): boolean {
  const u = currentAiUser();
  return !u || aiActiveFor(u);
}
