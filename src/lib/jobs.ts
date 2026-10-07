/**
 * File de tâches persistante (SQLite).
 *  - Exécution par le worker, indépendante du navigateur.
 *  - Bail (lease) renouvelé pendant l'exécution : une tâche abandonnée par un
 *    worker arrêté est reprise automatiquement.
 *  - Clé d'idempotence : une même demande n'est jamais mise deux fois en file.
 *  - Point de reprise (checkpoint) : une reprise ne refait pas — et ne repaie
 *    pas — les étapes déjà terminées.
 *  - Dépendances : une tâche attend que ses prérequis soient terminés.
 */
import os from "node:os";
import { all, id, json, now, one, run, tx } from "./db";
import { jobLiveness } from "./job-liveness";
import { contentLang, hasLangContext, L, userLang } from "./i18n-server";
import { pick } from "./i18n";
import { friendlyToolError } from "./tool-errors";

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled" | "blocked" | "paused";

export type Job = {
  id: string;
  user_id: string;
  project_id: string | null;
  type: string;
  label: string;
  payload: string;
  status: JobStatus;
  progress: number;
  message: string;
  result: string | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  run_at: number;
  locked_by: string | null;
  locked_until: number | null;
  idempotency_key: string | null;
  parent_id: string | null;
  depends_on: string;
  checkpoint: string;
  created_at: number;
  updated_at: number;
  finished_at: number | null;
};

export type EnqueueInput = {
  userId: string;
  projectId?: string | null;
  type: string;
  label?: string;
  payload?: unknown;
  runAt?: number;
  maxAttempts?: number;
  idempotencyKey?: string;
  parentId?: string | null;
  dependsOn?: string[];
};

export function enqueue(input: EnqueueInput): Job {
  // La langue des contenus voyage avec la tâche (et ses sous-tâches) : choisie pour l'action ou celle du projet.
  if (input.projectId && hasLangContext() && !(input.payload && typeof input.payload === "object" && "lang" in (input.payload as object))) {
    input = { ...input, payload: { ...((input.payload as object) ?? {}), lang: contentLang() } };
  }
  if (input.idempotencyKey) {
    const existing = one<Job>("SELECT * FROM jobs WHERE idempotency_key = ?", input.idempotencyKey);
    if (existing) return existing;
  }
  const jid = id();
  const t = now();
  run(
    `INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, max_attempts, idempotency_key, parent_id, depends_on, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    jid,
    input.userId,
    input.projectId ?? null,
    input.type,
    input.label ?? "",
    JSON.stringify(input.payload ?? {}),
    "queued",
    input.runAt ?? t,
    input.maxAttempts ?? 3,
    input.idempotencyKey ?? null,
    input.parentId ?? null,
    JSON.stringify(input.dependsOn ?? []),
    t,
    t,
  );
  return getJob(jid)!;
}

export const getJob = (jid: string) => one<Job>("SELECT * FROM jobs WHERE id = ?", jid);

// Identifiant propre à chaque démarrage (un conteneur redémarré peut réutiliser le même nom d'hôte et le même pid).
export const WORKER_ID = `${os.hostname()}:${process.pid}:${Math.random().toString(36).slice(2, 8)}`;
export const LEASE_MS = 90_000;
/** Intervalle de renouvellement du bail pendant l'exécution d'une tâche (appels IA longs sans point d'avancement). */
export const LEASE_RENEW_MS = 30_000;

/** Tâches en cours d'exécution dans CE processus : jamais reprises par lui-même, même si leur bail a expiré. */
const inProcess = new Set<string>();
export function markRunning(jid: string) {
  inProcess.add(jid);
}
export function markFinished(jid: string) {
  inProcess.delete(jid);
}

/** Prolonge le bail d'une tâche tenue par ce worker (battement pendant l'exécution). */
export function renewLease(jid: string): boolean {
  return run("UPDATE jobs SET locked_until=? WHERE id=? AND locked_by=? AND status IN ('running','queued','paused')", now() + LEASE_MS, jid, WORKER_ID).changes === 1;
}

/** Réserve atomiquement la prochaine tâche prête dont les dépendances sont terminées. */
export function claimNext(types?: string[]): Job | null {
  return tx(() => {
    const t = now();
    const mine = [...inProcess];
    const candidates = all<Job>(
      `SELECT * FROM jobs
       WHERE ((status = 'queued' AND run_at <= ? AND (locked_until IS NULL OR locked_until < ?)) OR (status = 'running' AND locked_until < ?))
       ${types?.length ? `AND type IN (${types.map(() => "?").join(",")})` : ""}
       ${mine.length ? `AND id NOT IN (${mine.map(() => "?").join(",")})` : ""}
       ORDER BY run_at ASC LIMIT 25`,
      t,
      t,
      t,
      ...(types ?? []),
      ...mine,
    );
    for (const j of candidates) {
      const deps = json<string[]>(j.depends_on, []);
      if (deps.length) {
        const states = all<{ status: string }>(`SELECT status FROM jobs WHERE id IN (${deps.map(() => "?").join(",")})`, ...deps);
        if (states.some((s) => s.status === "failed" || s.status === "cancelled")) {
          run("UPDATE jobs SET status='blocked', message=?, updated_at=? WHERE id=?", pick(userLang(j.user_id), "Une étape préalable a échoué.", "A previous step failed."), t, j.id);
          continue;
        }
        if (states.length < deps.length || states.some((s) => s.status !== "done")) continue;
      }
      const recovered = j.status === "running";
      run(
        "UPDATE jobs SET status='running', locked_by=?, locked_until=?, attempts=attempts+1, updated_at=?, message=? WHERE id=?",
        WORKER_ID,
        t + LEASE_MS,
        t,
        recovered ? pick(userLang(j.user_id), "Reprise après interruption…", "Resuming after an interruption…") : j.message || pick(userLang(j.user_id), "Démarrage…", "Starting…"),
        j.id,
      );
      return getJob(j.id)!;
    }
    return null;
  });
}

/**
 * Portée du décompte des quotas d'une tâche : seule la PREMIÈRE création d'un projet (« creation », visuels non
 * décomptés) en profite. Une relance (`resume`), un nouveau départ sur un projet déjà construit ou toute autre
 * tâche décomptent normalement chaque visuel.
 */
export function jobQuotaScope(job: Pick<Job, "id" | "type" | "payload" | "project_id"> & { parent_id?: string | null }): "creation" | "normal" {
  // Le calendrier de 7 jours lancé par la première création en fait partie (ses images ne sont pas décomptées).
  if (job.type === "calendar.plan" && job.parent_id) {
    const parent = one<Job>("SELECT * FROM jobs WHERE id = ?", job.parent_id);
    return parent && parent.type === "pipeline.run" ? jobQuotaScope(parent) : "normal";
  }
  if (job.type !== "pipeline.run") return "normal";
  if (json<{ initial?: boolean }>(job.payload, {}).initial !== true) return "normal";
  if (job.project_id && one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'pipeline.run' AND status = 'done' AND id != ?", job.project_id, job.id)) return "normal";
  return "creation";
}

/** Une création du pilote est-elle déjà en file, en cours ou en pause pour ce projet ? */
export const pipelineActive = (projectId: string) => !!one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'pipeline.run' AND status IN ('queued','running','paused')", projectId);

export class JobCancelled extends Error {}
/** Levée au prochain point d'avancement quand l'utilisateur met la tâche en pause. */
export class JobPaused extends Error {}

/** Contexte passé aux gestionnaires de tâches. */
export class JobContext {
  constructor(public job: Job) {}
  get payload() {
    return json<any>(this.job.payload, {});
  }
  get checkpoint() {
    return json<Record<string, any>>(this.job.checkpoint, {});
  }
  /** Met à jour l'avancement et prolonge le bail. Lève JobCancelled si annulée. */
  progress(p: number, message?: string) {
    const row = one<{ status: string; locked_by: string | null }>("SELECT status, locked_by FROM jobs WHERE id = ?", this.job.id);
    if (row?.status === "cancelled") throw new JobCancelled(L("Tâche annulée.", "Task canceled."));
    if (row?.status === "paused") throw new JobPaused(L("Tâche mise en pause.", "Task paused."));
    // Pause puis reprise pendant que ce worker travaillait encore : il garde la main (aucun autre ne la prend
    // tant que le bail court) et poursuit, sans refaire ni repayer ce qui est en cours.
    if (row?.status === "queued" && row.locked_by === WORKER_ID) run("UPDATE jobs SET status='running' WHERE id=?", this.job.id);
    run(
      "UPDATE jobs SET progress=?, message=COALESCE(?, message), locked_until=?, updated_at=? WHERE id=?",
      Math.max(0, Math.min(1, p)),
      message ?? null,
      now() + LEASE_MS,
      now(),
      this.job.id,
    );
  }
  /** Enregistre un point de reprise : utilisé pour ne pas refaire une étape coûteuse. */
  save(key: string, value: unknown) {
    const cp = { ...this.checkpoint, [key]: value };
    run("UPDATE jobs SET checkpoint=?, locked_until=?, updated_at=? WHERE id=?", JSON.stringify(cp), now() + LEASE_MS, now(), this.job.id);
    this.job.checkpoint = JSON.stringify(cp);
  }
  async step<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cp = this.checkpoint;
    if (key in cp) return cp[key] as T;
    const v = await fn();
    this.save(key, v);
    return v;
  }
}

/** Le worker rend la main (pause ou annulation constatée) : une reprise peut alors être prise. */
export function releaseJob(jid: string) {
  run("UPDATE jobs SET locked_by=NULL, locked_until=NULL WHERE id=? AND locked_by=?", jid, WORKER_ID);
}

export function completeJob(jid: string, result: unknown) {
  run(
    "UPDATE jobs SET status='done', progress=1, result=?, error=NULL, locked_by=NULL, locked_until=NULL, message=?, finished_at=?, updated_at=? WHERE id=? AND (status IN ('running','paused') OR (status='queued' AND locked_by=?))",
    JSON.stringify(result ?? null),
    L("Terminé", "Done"),
    now(),
    now(),
    jid,
    WORKER_ID,
  );
}

/** Échec : nouvelle tentative avec attente exponentielle, sauf erreur définitive. */
export function failJob(job: Job, err: unknown, opts: { permanent?: boolean } = {}) {
  const message = friendlyToolError(err instanceof Error ? err.message : String(err));
  const permanent = opts.permanent || (err as any)?.permanent === true || job.attempts >= job.max_attempts;
  // Seule une tâche encore tenue (ni annulée, ni mise en pause entre-temps) change d'état : une tâche annulée
  // pendant un appel puis interrompue par une erreur ne revient jamais en file.
  const held = "(status='running' OR (status='queued' AND locked_by=?))";
  if (permanent) {
    run(
      `UPDATE jobs SET status='failed', error=?, message=?, locked_by=NULL, locked_until=NULL, finished_at=?, updated_at=? WHERE id=? AND ${held}`,
      message.slice(0, 4000),
      message.slice(0, 300),
      now(),
      now(),
      job.id,
      WORKER_ID,
    );
  } else {
    const delay = Math.min(15 * 60_000, 20_000 * 2 ** (job.attempts - 1));
    run(
      `UPDATE jobs SET status='queued', error=?, message=?, run_at=?, locked_by=NULL, locked_until=NULL, updated_at=? WHERE id=? AND ${held}`,
      message.slice(0, 4000),
      L(`Nouvelle tentative dans ${Math.round(delay / 1000)} s : ${message.slice(0, 200)}`, `Retrying in ${Math.round(delay / 1000)} s: ${message.slice(0, 200)}`),
      now() + delay,
      now(),
      job.id,
      WORKER_ID,
    );
  }
}

export function cancelJob(jid: string) {
  const cancelled = L("Annulée", "Canceled");
  run("UPDATE jobs SET status='cancelled', message=?, finished_at=?, updated_at=? WHERE id=? AND status IN ('queued','running','blocked')", cancelled, now(), now(), jid);
  // Les sous-tâches en attente sont annulées aussi.
  run("UPDATE jobs SET status='cancelled', message=?, finished_at=?, updated_at=? WHERE parent_id=? AND status IN ('queued','blocked')", cancelled, now(), now(), jid);
}

/**
 * Pause : une tâche en file n'est plus prise ; une tâche en cours s'arrête à son prochain point
 * d'avancement. Les étapes terminées restent enregistrées (points de reprise).
 */
export function pauseJob(jid: string) {
  const t = now();
  // L'essai consommé par une tâche interrompue volontairement n'est pas compté. Le bail du worker est
  // conservé : tant qu'il n'a pas rendu la main, une reprise rapide ne peut pas lancer un second worker.
  const paused = L("En pause", "Paused");
  run("UPDATE jobs SET status='paused', message=?, attempts=MAX(0, attempts-1), updated_at=? WHERE id=? AND status='running'", paused, t, jid);
  run("UPDATE jobs SET status='paused', message=?, updated_at=? WHERE (id=? OR parent_id=?) AND status IN ('queued','blocked')", paused, t, jid, jid);
}

/** Reprise après une pause : repart du dernier point de reprise. */
export function resumeJob(jid: string) {
  run("UPDATE jobs SET status='queued', run_at=?, message=?, updated_at=? WHERE (id=? OR parent_id=?) AND status='paused'", now(), L("Reprise…", "Resuming…"), now(), jid, jid);
}

/** Relance manuelle : repart du dernier point de reprise. */
export function retryJob(jid: string) {
  run(
    "UPDATE jobs SET status='queued', run_at=?, attempts=0, error=NULL, message=?, updated_at=? WHERE id=? AND status IN ('failed','cancelled','blocked')",
    now(),
    L("Relance demandée", "Retry requested"),
    now(),
    jid,
  );
}

export class PermanentError extends Error {
  permanent = true;
}

/** Erreur utilisateur à afficher telle quelle, sans nouvelle tentative. */
export class UserFacingError extends PermanentError {}

export function publicJob(j: Job) {
  return {
    id: j.id,
    type: j.type,
    label: j.label,
    status: j.status,
    progress: j.progress,
    message: j.message,
    error: j.status === "failed" ? j.error : null,
    attempts: j.attempts,
    parentId: j.parent_id,
    result: json(j.result, null),
    createdAt: j.created_at,
    updatedAt: j.updated_at,
    finishedAt: j.finished_at,
    ...jobLiveness(j),
  };
}
