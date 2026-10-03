/**
 * Accès à l'IA pendant une tâche : sans crédits de création (essai gratuit, enveloppe épuisée),
 * le studio passe automatiquement sur le moteur local au lieu d'échouer.
 * Le worker exécute chaque tâche « pour » son utilisateur (AsyncLocalStorage).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { balance, EUR } from "../billing";

const store = new AsyncLocalStorage<{ userId: string }>();

/** En dessous de ce disponible, une génération IA ne pourrait pas aboutir : moteur local. */
export const AI_MIN_AVAILABLE = 0.5 * EUR;

export function runForUser<T>(userId: string | null | undefined, fn: () => Promise<T>): Promise<T> {
  return userId ? store.run({ userId }, fn) : fn();
}

export function currentAiUser(): string | null {
  return store.getStore()?.userId ?? null;
}

/** L'utilisateur a-t-il assez de crédits de création pour l'IA ? */
export function hasAiCredits(userId: string): boolean {
  return balance(userId).available >= AI_MIN_AVAILABLE;
}

/** Hors tâche (aucun utilisateur courant) : seule la configuration des fournisseurs compte. */
export function currentUserHasAiCredits(): boolean {
  const u = currentAiUser();
  return !u || hasAiCredits(u);
}
