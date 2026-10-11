/**
 * Création et modification des abonnements par projet (paiement Stripe, administration). Chaque abonnement créé ici
 * a sa propre clé de facturation (budget IA, recharges et relevé distincts de ceux des autres projets du compte).
 */
import { id, now, one, run, tx } from "./db";
import { alignPeriod, syncAllowance } from "./billing";
import { subscriptionOfProject, type ProjectSubscription } from "./project-billing";
import type { Billing, PlanId } from "./plans";

export type NewSubscription = {
  plan: PlanId;
  billing?: Billing;
  status?: "active" | "manual" | "past_due" | "canceled";
  source: "stripe" | "admin";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  periodStart?: number | null;
  periodEnd?: number | null;
  priceCents?: number | null;
  /** Rattachement immédiat (abonnement offert pour un projet existant). Sinon : en attente de création de projet. */
  projectId?: string | null;
};

/** Crée un abonnement pour le compte `ownerId` ; renvoie sa clé. Le budget IA du forfait est ouvert aussitôt. */
export function createSubscription(ownerId: string, o: NewSubscription): string {
  const key = `sub_${id()}`;
  tx(() => {
    run(
      `INSERT INTO subscriptions (user_id, owner_user_id, project_id, bound_at, status, stores, plan, billing, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, source, price_cents, created_at, updated_at)
       VALUES (?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?)`,
      key,
      ownerId,
      o.projectId ?? null,
      o.projectId ? now() : null,
      o.status ?? "active",
      o.plan,
      o.billing ?? "month",
      o.stripeCustomerId ?? null,
      o.stripeSubscriptionId ?? null,
      o.periodStart ?? null,
      o.periodEnd ?? null,
      o.source,
      o.priceCents ?? null,
      now(),
      now(),
    );
    if (o.projectId) run("UPDATE projects SET hidden = 0 WHERE id = ?", o.projectId);
  });
  alignPeriod(key, o.periodStart, o.periodEnd);
  syncAllowance(key);
  return key;
}

/**
 * Forfait d'un projet attribué par l'administration (ou par un test) : met à jour l'abonnement du projet s'il en a
 * un, sinon crée un abonnement offert rattaché à ce projet. Ne touche jamais aux autres projets du compte.
 */
export function grantProjectPlan(projectId: string, plan: PlanId, status: "manual" | "active" | "canceled" = "manual"): string {
  const owner = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId);
  if (!owner) throw new Error("projet introuvable");
  const cur: ProjectSubscription | null = subscriptionOfProject(projectId);
  if (!cur) return createSubscription(owner.user_id, { plan, status: status === "canceled" ? "canceled" : status, source: "admin", projectId });
  run("UPDATE subscriptions SET plan = ?, status = ?, updated_at = ? WHERE user_id = ?", plan, status, now(), cur.user_id);
  syncAllowance(cur.user_id);
  return cur.user_id;
}
