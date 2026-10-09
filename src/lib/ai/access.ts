/**
 * Accès à l'IA pendant une tâche. Le client ne choisit plus entre « local » et « IA » : avec un forfait, le studio
 * utilise l'IA et ne passe sur le moteur local que quand le budget IA caché du compte est épuisé.
 * Découverte gratuite (sans forfait) : moteur local uniquement, aucun appel à l'IA.
 * Le worker exécute chaque tâche « pour » son utilisateur (AsyncLocalStorage), avec la portée de décompte des quotas.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { balance, EUR, getSubscription, planOf } from "../billing";
import { UserFacingError } from "../jobs";
import { L } from "../i18n-server";

/**
 * Portée du décompte des quotas pendant une tâche :
 *  - « creation » : création initiale de la boutique (visuels non décomptés, vidéos IA décomptées) ;
 *  - « ugc » : la vidéo UGC est décomptée une fois en entier (ses images et plans ne comptent pas à part) ;
 *  - « normal » : chaque visuel et chaque vidéo IA est décompté.
 */
export type QuotaScope = "normal" | "creation" | "ugc";
const store = new AsyncLocalStorage<{ userId: string; scope: QuotaScope }>();

/**
 * IA coupée pour une portée d'exécution (demande du client sans devis payant accepté) : moteurs locaux seulement,
 * et tout appel payant qui partirait quand même est refusé avant l'envoi. Rien ne se dépense sans accord.
 */
const aiOff = new AsyncLocalStorage<{ reason: string }>();
export function withAiDisabled<T>(reason: string, fn: () => Promise<T>): Promise<T> {
  return aiOff.run({ reason }, fn);
}
export const aiDisabledReason = () => aiOff.getStore()?.reason ?? null;

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
  if (aiOff.getStore()) return false;
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
  if (aiOff.getStore()) return false;
  const u = currentAiUser();
  return !u || aiActiveFor(u);
}

/**
 * Contrôle central avant TOUT appel payant à un fournisseur d'IA (texte, image, vidéo) : le compte doit avoir un
 * forfait et un budget IA suffisant, que l'appel soit fait dans une tâche de fond (runForUser) ou non. Le compte
 * administrateur suit la même règle (pas de passe-droit). Lève une erreur claire, sans rien dépenser.
 */
export function assertAiAllowed(userId: string | null | undefined): void {
  if (!userId) throw new UserFacingError(L("Appel à l'IA refusé : aucun compte n'est associé à la demande.", "AI call refused: no account is attached to the request."));
  const off = aiOff.getStore();
  if (off) throw new UserFacingError(L(`Appel à l'IA refusé : ${off.reason}.`, `AI call refused: ${off.reason}.`));
  let sub;
  try {
    sub = getSubscription(userId);
  } catch {
    // Compte inexistant (ou supprimé) : refus net, sans appel.
    throw new UserFacingError(L("Appel à l'IA refusé : compte introuvable.", "AI call refused: account not found."));
  }
  if (!planOf(sub)) throw new UserFacingError(L("L'IA n'est pas incluse dans la découverte gratuite : le moteur local du studio est utilisé.", "AI isn't included in the free discovery: the studio's local engine is used."));
  if (!hasAiCredits(userId)) throw new UserFacingError(L("Le budget IA de votre forfait est épuisé pour cette période : le moteur local du studio prend le relais.", "Your plan's AI budget is used up for this period: the studio's local engine takes over."));
}
