/**
 * Automatisations sociales persistantes (table `social_automations`, exécutées par le worker, navigateur fermé).
 * Aucune ne dépense d'IA : « préparer la semaine suivante » crée des brouillons LOCAUX (niveau 1) ; « programmer
 * les contenus approuvés » ne programme que des versions approuvées par le client (sa règle vaut consentement) ;
 * les autres préviennent. Chaque règle peut être mise en pause et reprise.
 */
import { all, id, json, now, one, run } from "../db";
import { loadProject, notify } from "../projects";
import { L } from "../i18n-server";
import { createPlanV2, type PlanRequest } from "./planner";
import { schedulePosts } from "./scheduler";
import { checkPost } from "./quality";

export const AUTOMATION_KINDS = ["prepare_next_week", "schedule_approved", "notify_errors", "require_validation"] as const;
export type AutomationKind = (typeof AUTOMATION_KINDS)[number];
export type Automation = { id: string; project_id: string; kind: AutomationKind; config: string; status: "active" | "paused"; last_run_at: number | null; next_run_at: number | null; last_result: string };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const EVERY: Record<AutomationKind, number> = { prepare_next_week: 7 * DAY, schedule_approved: HOUR, notify_errors: HOUR, require_validation: DAY };

export function createAutomation(projectId: string, kind: AutomationKind, config: Record<string, unknown> = {}): string {
  const aid = id();
  run("INSERT INTO social_automations (id, project_id, kind, config, status, next_run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)", aid, projectId, kind, JSON.stringify(config), "active", now(), now(), now());
  return aid;
}

export function setAutomationStatus(projectId: string, automationId: string, status: "active" | "paused") {
  run("UPDATE social_automations SET status = ?, next_run_at = CASE WHEN ? = 'active' THEN ? ELSE next_run_at END, updated_at = ? WHERE id = ? AND project_id = ?", status, status, now(), now(), automationId, projectId);
}

export const listAutomations = (projectId: string) => all<Automation>("SELECT * FROM social_automations WHERE project_id = ? ORDER BY created_at", projectId);

const nextMonday = (t: number) => {
  const d = new Date(t);
  const add = ((8 - d.getUTCDay()) % 7) || 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + add)).toISOString().slice(0, 10);
};

export async function runAutomation(a: Automation, at = now()): Promise<string> {
  const p = loadProject(a.project_id);
  const cfg = json<Record<string, unknown>>(a.config, {});
  switch (a.kind) {
    case "prepare_next_week": {
      // Brouillons de la semaine suivante, avec les réglages du dernier calendrier V2 : gratuit, aucun média payant.
      const last = one<{ params: string }>("SELECT params FROM content_plans WHERE project_id = ? AND engine = 'v2' ORDER BY created_at DESC LIMIT 1", p.id);
      if (!last) return "aucun calendrier de référence";
      const base = json<PlanRequest>(last.params, null as never);
      const startDate = nextMonday(at);
      const r = createPlanV2(p, { ...base, startDate, endDate: null, days: 7, ...(cfg.perDay ? { perDay: Number(cfg.perDay) } : {}) }, { planId: `auto-${a.id}-${startDate}` });
      if (r.created) notify(p.userId, p.id, L("Semaine suivante préparée", "Next week prepared"), L(`${r.created} brouillons à relire et approuver (aucune publication sans votre accord).`, `${r.created} drafts to review and approve (nothing is posted without your approval).`));
      return `${r.created} brouillon(s) créés (${r.existing} déjà présents)`;
    }
    case "schedule_approved": {
      const ids = all<{ id: string }>("SELECT id FROM posts WHERE project_id = ? AND engine = 'v2' AND status = 'approved' AND scheduled_at > ?", p.id, at).map((r) => r.id);
      const r = schedulePosts(ids, (pid) => checkPost(p, pid));
      return `${r.scheduled.length} programmée(s), ${r.refused.length} non programmée(s)`;
    }
    case "notify_errors": {
      const since = a.last_run_at ?? at - HOUR;
      const bad = one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id = ? AND status IN ('failed','uncertain') AND updated_at > ?", p.id, since)?.n ?? 0;
      if (bad) notify(p.userId, p.id, L("Publications à vérifier", "Posts to check"), L(`${bad} publication(s) en échec ou à l'état incertain.`, `${bad} post(s) failed or in an uncertain state.`), "error");
      return `${bad} alerte(s)`;
    }
    case "require_validation": {
      const n = one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id = ? AND engine = 'v2' AND status IN ('planned','review') AND scheduled_at BETWEEN ? AND ?", p.id, at, at + 3 * DAY)?.n ?? 0;
      if (n) notify(p.userId, p.id, L("Publications à valider", "Posts to approve"), L(`${n} publication(s) prévues dans les 3 prochains jours attendent votre validation.`, `${n} post(s) due in the next 3 days await your approval.`));
      return `${n} à valider`;
    }
  }
}

/** Exécute les règles actives arrivées à échéance (worker). Une règle en erreur n'arrête pas les autres. */
export async function runDueAutomations(at = now()): Promise<number> {
  const due = all<Automation>("SELECT * FROM social_automations WHERE status = 'active' AND (next_run_at IS NULL OR next_run_at <= ?) LIMIT 20", at);
  for (const a of due) {
    // Prise en charge atomique (deux workers ne lancent pas la même règle).
    const claimed = run("UPDATE social_automations SET next_run_at = ?, updated_at = ? WHERE id = ? AND (next_run_at IS NULL OR next_run_at <= ?)", at + EVERY[a.kind], now(), a.id, at);
    if (!claimed.changes) continue;
    let result: string;
    try {
      result = await runAutomation(a, at);
    } catch (e) {
      result = `erreur : ${(e as Error).message.slice(0, 200)}`;
    }
    run("UPDATE social_automations SET last_run_at = ?, last_result = ? WHERE id = ?", at, result, a.id);
  }
  return due.length;
}
