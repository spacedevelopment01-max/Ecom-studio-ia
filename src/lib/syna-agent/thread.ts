/** LE fil SINA : un par projet (la conversation existante du projet est réutilisée), un brouillon par compte sans projet. */
import { HttpError, type User } from "../auth";
import { id, now, one, run, tx } from "../db";
import { requirePlan } from "../plan-gates";
import { pendingSubscriptions } from "../project-billing";
import { L } from "../i18n-server";
import { threadView } from "./loop";
import { authorizedBudget } from "./store";
import { authorizeBudgetPct, DEFAULT_BUDGET_PCT } from "./budget";

export function threadFor(user: User, projectId: string | null): string {
  if (projectId) {
    const p = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id=?", projectId);
    if (!p || p.user_id !== user.id) throw new HttpError(404, L("Projet introuvable.", "Project not found."));
    requirePlan(user, projectId);
  } else if (!pendingSubscriptions(user.id).length) throw new HttpError(402, L("Un abonnement en attente de projet est nécessaire pour démarrer un nouveau projet avec SINA.", "A subscription awaiting a project is required to start a new project with SINA."), "subscription_required");
  const cid = tx(() => {
    const existing = projectId
      ? one<{ id: string }>("SELECT id FROM agent_conversations WHERE project_id=? AND user_id=?", projectId, user.id)
      : one<{ id: string }>("SELECT id FROM agent_conversations WHERE user_id=? AND project_id IS NULL", user.id);
    if (existing) return existing.id;
    const cid = id(), t = now();
    run("INSERT INTO agent_conversations (id,user_id,project_id,state_json,created_at,updated_at) VALUES (?,?,?,?,?,?)", cid, user.id, projectId, JSON.stringify({ synaAgent: 1 }), t, t);
    return cid;
  });
  // Budget autorisé par défaut (modifiable dans le fil) : SINA travaille sans devis à chaque message.
  if (authorizedBudget(cid) == null) { try { authorizeBudgetPct(user.id, projectId, cid, DEFAULT_BUDGET_PCT); } catch { /* sans budget mesurable : SINA demandera l'accord */ } }
  return cid;
}

export function openThread(user: User, projectId: string | null, subscriptionKey?: string) {
  const cid = threadFor(user, projectId);
  // Brouillon : l'abonnement choisi par le client sur l'accueil sera celui du projet créé par SINA.
  if (!projectId && subscriptionKey && pendingSubscriptions(user.id).some((s) => s.user_id === subscriptionKey)) {
    const st = JSON.parse(one<{ state_json: string | null }>("SELECT state_json FROM agent_conversations WHERE id=?", cid)?.state_json ?? "{}");
    run("UPDATE agent_conversations SET state_json=? WHERE id=?", JSON.stringify({ ...st, subscriptionKey }), cid);
  }
  return threadView(user, cid);
}
