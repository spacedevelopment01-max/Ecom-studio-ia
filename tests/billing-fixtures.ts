/**
 * Un abonnement = un projet (forfaits V2) : dans un test, le premier projet d'un compte abonné utilise l'abonnement du
 * compte (comme après la migration), chaque projet suivant reçoit son propre abonnement du même forfait.
 */
import { projectAccountKey } from "@/lib/project-billing";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import type { PlanId } from "@/lib/plans";

export function paidProjects(plan: PlanId, ...projectIds: string[]) {
  if (!projectIds.length) return;
  projectAccountKey(projectIds[0]);
  for (const pid of projectIds.slice(1)) grantProjectPlan(pid, plan);
}
