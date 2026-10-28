/**
 * Un abonnement = un projet (forfaits V2).
 *
 * Un compte client peut avoir plusieurs abonnements ; chacun finance UN seul projet, rattaché une fois pour toutes
 * (index unique et déclencheur en base, voir db.ts) : supprimer, archiver ou dupliquer un projet ne libère jamais
 * son abonnement. Un abonnement payé mais pas encore rattaché (« en attente de création de projet ») permet de créer
 * exactement un projet, sans repayer.
 *
 * Chaque abonnement est un « compte de facturation » : sa clé (subscriptions.user_id — l'id du client pour un ancien
 * abonnement, un id propre pour un abonnement par projet) porte son budget IA, ses recharges et son relevé. Les
 * fonctions du budget (billing.ts) reçoivent cette clé ; `accountKey` la retrouve à partir du projet.
 */
import { all, now, one, run, tx } from "./db";
import type { Subscription } from "./billing";
import type { PlanId } from "./plans";
import { currentRunScope, runScope } from "./billing-scope";

export type ProjectSubscription = Subscription & {
  owner_user_id: string | null;
  project_id: string | null;
  bound_at: number | null;
  created_at: number | null;
  source: "legacy" | "stripe" | "admin" | null;
  price_cents: number | null;
  cancel_at_period_end: number;
};

/** Statuts qui donnent les droits du forfait (abonnement payé, ou offert par l'administration). */
export const PAID_STATUSES = ["active", "manual"] as const;
/** Statuts d'un abonnement réellement souscrit (payé ou l'ayant été) : il finance son projet, même résilié. */
const SUBSCRIBED_STATUSES = ["active", "manual", "past_due", "canceled", "trial"];

/** Abonnement rattaché au projet (quel que soit son statut), ou null. */
export function subscriptionOfProject(projectId: string): ProjectSubscription | null {
  return one<ProjectSubscription>("SELECT * FROM subscriptions WHERE project_id = ?", projectId) ?? null;
}

/**
 * Ancien abonnement du compte (clé = id du client), souscrit avant les forfaits V2 et pas encore rattaché : il est
 * rattaché au projet qui l'utilise en premier (même règle que la migration), puis plus jamais à un autre.
 */
function bindLegacy(projectId: string): ProjectSubscription | null {
  const p = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId);
  if (!p) return null;
  const legacy = one<ProjectSubscription>("SELECT * FROM subscriptions WHERE user_id = ? AND project_id IS NULL AND status IN ('active','manual','past_due','canceled','trial')", p.user_id);
  if (!legacy) return null;
  try {
    run("UPDATE subscriptions SET project_id = ?, bound_at = ?, owner_user_id = COALESCE(owner_user_id, ?) WHERE user_id = ? AND project_id IS NULL", projectId, now(), p.user_id, p.user_id);
  } catch {
    // Concurrence : un autre projet vient de le prendre (ou celui-ci a déjà un abonnement) — rien n'est rattaché.
  }
  return subscriptionOfProject(projectId);
}

/** Clé de facturation qui finance le projet : son abonnement, sinon une clé sans forfait (aucun droit payant). */
export function projectAccountKey(projectId: string): string {
  const s = subscriptionOfProject(projectId) ?? bindLegacy(projectId);
  return s ? s.user_id : `noplan:${projectId}`;
}

/** Une clé sans forfait (projet sans abonnement) : aucun budget, aucune ligne en base. */
export const isNoPlanKey = (key: string) => key.startsWith("noplan:");

/** Forfait en vigueur pour le projet (abonnement payé ou offert, actif), ou null. */
export function projectPlan(projectId: string): PlanId | null {
  const s = subscriptionOfProject(projectId) ?? bindLegacy(projectId);
  if (!s || !(PAID_STATUSES as readonly string[]).includes(s.status)) return null;
  return (s.plan as PlanId | null) ?? "creer";
}

/** Abonnements du compte client (tous statuts), du plus récent au plus ancien. */
export function subscriptionsOf(userId: string): ProjectSubscription[] {
  return all<ProjectSubscription>("SELECT * FROM subscriptions WHERE owner_user_id = ? AND status != 'none' ORDER BY COALESCE(created_at, updated_at) DESC", userId);
}

/** Abonnements payés du compte pas encore rattachés à un projet (« en attente de création de projet »). */
export function pendingSubscriptions(userId: string): ProjectSubscription[] {
  return all<ProjectSubscription>(
    `SELECT * FROM subscriptions WHERE owner_user_id = ? AND project_id IS NULL AND status IN ('active','manual') ORDER BY COALESCE(created_at, updated_at) ASC`,
    userId,
  );
}

export class NoFreeSubscription extends Error {}

/**
 * Rattache définitivement un projet à un abonnement payé libre du compte, dans la même transaction que sa création
 * (`create` insère le projet). Deux requêtes simultanées ne peuvent pas utiliser le même abonnement : la mise à jour
 * conditionnelle (project_id IS NULL) ne réussit qu'une fois, et la transaction de la seconde est annulée.
 * `subscriptionKey` : abonnement choisi (sinon le plus ancien en attente).
 */
export function createProjectWithSubscription<T>(userId: string, subscriptionKey: string | null, create: () => { projectId: string; result: T }): T {
  return tx(() => {
    const free = pendingSubscriptions(userId);
    const sub = subscriptionKey ? free.find((s) => s.user_id === subscriptionKey) : free[0];
    if (!sub) throw new NoFreeSubscription();
    const { projectId, result } = create();
    const done = run("UPDATE subscriptions SET project_id = ?, bound_at = ? WHERE user_id = ? AND owner_user_id = ? AND project_id IS NULL AND status IN ('active','manual')", projectId, now(), sub.user_id, userId);
    if (done.changes !== 1) throw new NoFreeSubscription();
    run("UPDATE projects SET hidden = 0 WHERE id = ?", projectId);
    return result;
  });
}

/**
 * Projet masqué d'un compte (ancienne découverte gratuite) repris avec un nouvel abonnement libre : il redevient
 * visible et cet abonnement le finance, pour toujours.
 */
export function attachHiddenProject(userId: string, projectId: string, subscriptionKey: string | null): boolean {
  return tx(() => {
    const p = one<{ id: string }>("SELECT id FROM projects WHERE id = ? AND user_id = ? AND hidden = 1 AND archived = 0", projectId, userId);
    if (!p || subscriptionOfProject(projectId)) return false;
    const free = pendingSubscriptions(userId);
    const sub = subscriptionKey ? free.find((s) => s.user_id === subscriptionKey) : free[0];
    if (!sub) throw new NoFreeSubscription();
    const done = run("UPDATE subscriptions SET project_id = ?, bound_at = ? WHERE user_id = ? AND project_id IS NULL", projectId, now(), sub.user_id);
    if (done.changes !== 1) throw new NoFreeSubscription();
    run("UPDATE projects SET hidden = 0, updated_at = ? WHERE id = ?", now(), projectId);
    return true;
  });
}

/** Le compte a-t-il (ou a-t-il eu) un vrai abonnement ? (sinon : découverte gratuite) */
export function hasEverSubscribed(userId: string): boolean {
  return !!one(`SELECT 1 FROM subscriptions WHERE owner_user_id = ? AND status IN (${SUBSCRIBED_STATUSES.map(() => "?").join(",")}) LIMIT 1`, userId, ...SUBSCRIBED_STATUSES);
}

/**
 * Le compte a-t-il en ce moment au moins un abonnement payé (ou offert) en vigueur, rattaché ou en attente de projet ?
 * Sans lui (compte Découverte, abonnement résilié ou impayé) : aucun appel à l'IA, même offert par la plateforme.
 */
export function hasPaidSubscription(userId: string): boolean {
  return !!one(
    `SELECT 1 FROM subscriptions WHERE (owner_user_id = ? OR (owner_user_id IS NULL AND user_id = ?)) AND status IN (${PAID_STATUSES.map(() => "?").join(",")}) LIMIT 1`,
    userId,
    userId,
    ...PAID_STATUSES,
  );
}

/**
 * Compte de facturation qui paie un appel : `key` est l'id du client (ou déjà une clé d'abonnement) ; le projet vient
 * de l'appel, sinon de la tâche en cours. Le projet doit appartenir au client — sinon rien n'est résolu (refus en aval).
 * Sans projet : la clé reçue (ancien comportement, compte sans projet).
 */
export function accountKeyFor(key: string, projectId?: string | null): string {
  if (isNoPlanKey(key)) return key;
  const run = currentRunScope();
  const pid = projectId ?? (run && run.userId === key ? run.projectId : null);
  if (!pid) {
    if (run?.userId === key && run.billingKey) {
      // La portée a été autorisée libre au départ ; si elle est rattachée pendant l'appel, régler la même réserve.
      const pending = one<ProjectSubscription>("SELECT * FROM subscriptions WHERE user_id=? AND owner_user_id=? AND status IN ('active','manual')", run.billingKey, key);
      return pending ? pending.user_id : 'noplan:pending-conversation';
    }
    return key;
  }
  const owner = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", pid);
  // Identifiant qui ne désigne aucun projet (appel interne sans projet réel) : la clé reçue, comme sans projet.
  if (!owner) return key;
  if (owner.user_id !== key) {
    // Déjà une clé d'abonnement : elle doit être celle de ce projet.
    const s = subscriptionOfProject(pid);
    return s && s.user_id === key ? key : `noplan:${pid}`;
  }
  return projectAccountKey(pid);
}

/** Portée native pour le dialogue AVANT projet ; aucun wallet ni droit nouveau. Jamais un identifiant du modèle. */
export function runForPendingSubscription<T>(userId: string, subscriptionKey: string, fn: () => T): T {
  if (!pendingSubscriptions(userId).some(s => s.user_id === subscriptionKey)) throw new NoFreeSubscription();
  return runScope.run({ userId, projectId: null, scope: 'normal', billingKey: subscriptionKey }, fn);
}
