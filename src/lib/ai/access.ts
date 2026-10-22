/**
 * Accès à l'IA pendant une tâche. Le client ne choisit plus entre « local » et « IA » : avec un forfait, le studio
 * utilise l'IA et ne passe sur le moteur local que quand le budget IA caché du compte est épuisé.
 * Découverte gratuite (sans forfait) : moteur local uniquement, aucun appel à l'IA.
 * Le worker exécute chaque tâche « pour » son utilisateur (AsyncLocalStorage), avec la portée de décompte des quotas.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { aiPctBaseMicro, aiReserves, balance, EUR, getSubscription, planOf, UnsentBudgetError } from "../billing";
import { runScope, type QuotaScope } from "../billing-scope";
import { accountKeyFor } from "../project-billing";
import { UserFacingError } from "../jobs";
import { L } from "../i18n-server";

export type { QuotaScope };
const store = runScope;

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

/**
 * Exécute `fn` pour le compte `userId` et, quand il est connu, pour le projet `projectId` : toute dépense d'IA est
 * alors prise sur le budget de l'abonnement de CE projet (jamais sur celui d'un autre projet du compte).
 */
export function runForUser<T>(userId: string | null | undefined, fn: () => Promise<T>, scope: QuotaScope = "normal", projectId: string | null = null): Promise<T> {
  return userId ? store.run({ userId, projectId, scope }, fn) : fn();
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
export function aiActiveFor(userId: string, projectId?: string | null): boolean {
  if (aiOff.getStore()) return false;
  const key = accountKeyFor(userId, projectId);
  // Découverte gratuite (aucun forfait) : tout est fait par le moteur local, aucun appel à l'IA.
  if (!planOf(getSubscription(key))) return false;
  return hasAiCredits(key);
}

/** Le budget IA de l'abonnement du projet permet-il encore une génération ? */
export function hasAiCredits(userId: string, projectId?: string | null): boolean {
  return balance(accountKeyFor(userId, projectId)).available >= AI_MIN_AVAILABLE;
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
export type AiUsage = {
  /** IA du forfait ce mois-ci, en % utilisé (le reste = 100 − used). */
  plan: { used: number };
  /** Crédits achetés en plus du forfait, en % utilisé ; null tant qu'aucun n'a été acheté. */
  credits: { used: number } | null;
  /** Forfait et crédits épuisés : l'IA est en pause jusqu'au renouvellement ou à un nouvel achat. */
  paused: boolean;
  /** Disponible temporairement engagé par une génération, pas dépensé à 100 %. */
  pending?: boolean;
  /** Base des % de coût montrés au client (même réserve que la jauge) — sert au calcul, jamais affichée. */
  baseMicro?: number;
};

/**
 * Consommation enregistrée de chaque enveloppe, distincte de la disponibilité des appels. Une pause sous le seuil
 * de fonctionnement ne transforme jamais un reste non dépensé en consommation à 100 %. `null` sans forfait.
 */
export function aiUsage(user: string, projectId?: string | null): AiUsage | null {
  const userId = accountKeyFor(user, projectId);
  if (!planOf(getSubscription(userId))) return null;
  const b = balance(userId);
  const pending = b.available < AI_MIN_AVAILABLE && b.reserved > 0 && b.available + b.reserved >= AI_MIN_AVAILABLE;
  const paused = b.available < AI_MIN_AVAILABLE && !pending;
  const r = aiReserves(userId);
  // Arrondi qui n'affiche jamais 100 % pour une réserve encore utilisable, ni 0 % pour une réserve entamée.
  const pct = (u: number) => (u >= 1 ? 100 : u <= 0 ? 0 : Math.min(99, Math.max(1, Math.round(u * 100))));
  const planUsed = r.plan ? pct(r.plan.used) : 100;
  const credits = r.credits ? { used: pct(r.credits.used) } : null;
  return { plan: { used: planUsed }, credits, paused, pending, baseMicro: aiPctBaseMicro(userId) };
}

export function assertAiAllowed(user: string | null | undefined, projectId?: string | null): void {
  const userId = user ? accountKeyFor(user, projectId) : user;
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
  if (!hasAiCredits(userId)) {
    const b = balance(userId);
    if (b.reserved > 0 && b.available + b.reserved >= AI_MIN_AVAILABLE) throw new UnsentBudgetError(L("Une génération utilise temporairement le budget disponible. Attendez son résultat avant de lancer une autre action ; votre travail est conservé.", "A generation is temporarily using the available budget. Wait for its result before starting another action; your work is kept."));
    if (b.available>0 || b.reserved>0) throw new UnsentBudgetError(L("Le budget restant est inférieur au minimum permettant une génération IA. Le reste non dépensé et les étapes acquises sont conservés ; aucun nouvel appel n’a été envoyé. L’IA reprend au renouvellement ou avec une recharge du projet (Mon compte).", "The remaining budget is below the minimum required for an AI generation. Unspent budget and acquired steps are kept; no new call was sent. AI resumes at renewal or with a project top-up (My account)."));
    throw new UnsentBudgetError(L("L'IA de votre forfait est utilisée à 100 % : elle reprend au renouvellement du forfait, ou tout de suite avec une recharge de l'IA du projet (Mon compte). En attendant, le moteur local du studio prend le relais.", "Your plan's AI is 100% used: it resumes when your plan renews, or right away with a project AI top-up (My account). Meanwhile, the studio's local engine takes over."));
  }
}
