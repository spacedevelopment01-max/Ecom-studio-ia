import { currentStrategyInputDigest } from "./marketing-strategy";
import { strategyStamp } from "./strategy-consumption";
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
import { createHash } from "node:crypto";
import { assertJobEntitlements } from "./job-entitlements";
import { all, id, json, now, one, run, tx } from "./db";
import { jobLiveness } from "./job-liveness";
import { jobEstimate } from "./job-estimate";
import { contentLang, hasLangContext, L, userLang } from "./i18n-server";
import { pick } from "./i18n";
import { friendlyToolError } from "./tool-errors";
import { withTrace } from "./ai/trace";

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
  if(input.projectId){const strategy=strategyStamp(input.projectId);input={...input,payload:{...((input.payload as object)??{}),strategyVersion:strategy?.id??null,strategyInputDigest:strategy?currentStrategyInputDigest(input.projectId):null}};}
  const operationKey = input.idempotencyKey ? `job:v2:${createHash("sha256").update(JSON.stringify([input.userId, input.projectId ?? null, input.type, input.idempotencyKey])).digest("hex")}` : null;
  if (operationKey) {
    // Compatibilité des anciennes demandes, toujours dans le même compte, projet et type.
    const existing = one<Job>("SELECT * FROM jobs WHERE idempotency_key IN (?,?) AND user_id=? AND project_id IS ? AND type=?", operationKey, input.idempotencyKey!, input.userId, input.projectId ?? null, input.type);
    if (existing) return scopedDuplicate(existing,input);
  }
  assertJobEntitlements(input.type,input.projectId,input.payload);
  const jid = id();
  const t = now();
  // ON CONFLICT : deux demandes simultanées avec la même clé renvoient la même tâche (au lieu d'une erreur 500).
  const ins = run(
    `INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, max_attempts, idempotency_key, parent_id, depends_on, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(idempotency_key) DO NOTHING`,
    jid,
    input.userId,
    input.projectId ?? null,
    input.type,
    input.label ?? "",
    JSON.stringify(input.payload ?? {}),
    "queued",
    input.runAt ?? t,
    input.maxAttempts ?? 3,
    operationKey,
    input.parentId ?? null,
    JSON.stringify(input.dependsOn ?? []),
    t,
    t,
  );
  if (!ins.changes && operationKey) return scopedDuplicate(one<Job>("SELECT * FROM jobs WHERE idempotency_key = ?", operationKey)!,input);
  return getJob(jid)!;
}

/** Idempotency never returns a task belonging to another account, project or operation. */
function scopedDuplicate(job:Job,input:EnqueueInput):Job {
 if(job.user_id!==(input.userId??null)||job.project_id!==(input.projectId??null)||job.type!==input.type)throw new UserFacingError(L('Cette clé de demande est déjà utilisée pour une autre opération.','This request key is already used for another operation.'));
 return job;
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

/**
 * Tâches courtes, sans IA, que le client attend devant l'écran (ex. appliquer le logo choisi) : servies AVANT les
 * longues tâches en file (création complète, série d'images), qui ne passent plus devant elles.
 */
export const QUICK_JOBS = ["brand.logo.v2.choose"] as const;

/** Réserve atomiquement la prochaine tâche prête dont les dépendances sont terminées (tâches courtes d'abord). */
export function claimNext(types?: string[]): (Job & { recovered?: boolean }) | null {
  return tx(() => {
    const t = now();
    const mine = [...inProcess];
    const candidates = all<Job>(
      `SELECT * FROM jobs
       WHERE ((status = 'queued' AND run_at <= ? AND (locked_until IS NULL OR locked_until < ?)) OR (status = 'running' AND locked_until < ?))
       ${types?.length ? `AND type IN (${types.map(() => "?").join(",")})` : ""}
       ${mine.length ? `AND id NOT IN (${mine.map(() => "?").join(",")})` : ""}
       ORDER BY CASE WHEN type IN (${QUICK_JOBS.map((q) => `'${q}'`).join(",")}) THEN 0 ELSE 1 END, run_at ASC LIMIT 200`,
      t,
      t,
      t,
      ...(types ?? []),
      ...mine,
    );
    for (const j of candidates) {
      const deps = json<string[]>(j.depends_on, []);
      if (deps.length) {
        const states = all<{ status: string; user_id: string; project_id: string | null }>(`SELECT status, user_id, project_id FROM jobs WHERE id IN (${deps.map(() => "?").join(",")})`, ...deps);
        if (states.length !== new Set(deps).size || states.some((s) => s.user_id !== j.user_id || s.project_id !== j.project_id)) {
          run("UPDATE jobs SET status='blocked', message=?, updated_at=? WHERE id=?", pick(userLang(j.user_id), "Une étape préalable est indisponible. Les résultats déjà acquis sont conservés.", "A required step is unavailable. Completed results are kept."), t, j.id);
          continue;
        }
        // Prérequis en échec, annulé ou lui-même bloqué : la tâche est bloquée (visible), jamais en attente sans fin.
        if (states.some((s) => s.status === "failed" || s.status === "cancelled" || s.status === "blocked")) {
          run("UPDATE jobs SET status='blocked', message=?, updated_at=? WHERE id=?", pick(userLang(j.user_id), "Une étape préalable a échoué.", "A previous step failed."), t, j.id);
          continue;
        }
        if (states.some((s) => s.status !== "done")) continue;
      }
      const recovered = j.status === "running";
      // Reprise après interruption (worker arrêté ou tué) : bornée par le nombre d'essais. Une tâche qui tue le
      // worker à chaque fois (mémoire…) finit en échec visible au lieu de tourner en boucle « en cours » à jamais.
      if (recovered && j.attempts >= j.max_attempts) {
        const msg = pick(userLang(j.user_id), "Interrompue à répétition (le traitement s'est arrêté plusieurs fois avant la fin). Les étapes terminées sont gardées : « Réessayer » reprend à partir de là.", "Interrupted repeatedly (processing stopped several times before finishing). Completed steps are kept: \"Retry\" resumes from there.");
        run("UPDATE jobs SET status='failed', error=?, message=?, locked_by=NULL, locked_until=NULL, finished_at=?, updated_at=? WHERE id=?", msg, msg.slice(0, 300), t, t, j.id);
        continue;
      }
      run(
        "UPDATE jobs SET status='running', locked_by=?, locked_until=?, attempts=attempts+1, updated_at=?, message=? WHERE id=?",
        WORKER_ID,
        t + LEASE_MS,
        t,
        recovered ? pick(userLang(j.user_id), "Reprise après interruption…", "Resuming after an interruption…") : j.message || pick(userLang(j.user_id), "Démarrage…", "Starting…"),
        j.id,
      );
      return { ...getJob(j.id)!, recovered };
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
  if ((job.type === "calendar.plan" || job.type === "brand.fulllogo") && job.parent_id) {
    const parent = one<Job>("SELECT * FROM jobs WHERE id = ?", job.parent_id);
    return parent && parent.type === "pipeline.run" ? jobQuotaScope(parent) : "normal";
  }
  if (job.type !== "pipeline.run") return "normal";
  if (json<{ initial?: boolean }>(job.payload, {}).initial !== true) return "normal";
  if (job.project_id && one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'pipeline.run' AND status = 'done' AND id != ?", job.project_id, job.id)) return "normal";
  return "creation";
}

/** Une création du pilote est-elle déjà en file, en cours ou en pause pour ce projet ? */
/** Tâche encore en attente ou en cours, du même type et pour le même projet, dont la charge contient ces valeurs. */
export function pendingJob(projectId: string, type: string, match: Record<string, unknown> = {}): Job | null {
  const rows = all<Job>("SELECT * FROM jobs WHERE project_id = ? AND type = ? AND status IN ('queued','running','paused','blocked') ORDER BY created_at DESC", projectId, type);
  return rows.find((j) => { try { const p = JSON.parse(j.payload || "{}"); return Object.entries(match).every(([k, v]) => p[k] === v); } catch { return false; } }) ?? null;
}

export const pipelineActive = (projectId: string) => !!one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'pipeline.run' AND status IN ('queued','running','paused')", projectId);

export class JobCancelled extends Error {}
/**
 * Le bail de ce worker a expiré et un autre worker a repris la tâche : celui-ci s'arrête au prochain point
 * d'avancement, sans rien enregistrer, terminer ni remettre en file (aucun travail ni dépense en double).
 */
export class LeaseLost extends Error {}
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
    if (!row || row.status === "done" || row.status === "failed" || row.status === "blocked") throw new LeaseLost(L("Cette tâche n'est plus en cours.", "This task is no longer running."));
    if (row?.locked_by && row.locked_by !== WORKER_ID) throw new LeaseLost(L("Tâche reprise par un autre processus.", "Task taken over by another process."));
    if (row?.status === "cancelled") throw new JobCancelled(L("Tâche annulée.", "Task canceled."));
    if (row?.status === "paused") throw new JobPaused(L("Tâche mise en pause.", "Task paused."));
    // Pause puis reprise pendant que ce worker travaillait encore : il garde la main (aucun autre ne la prend
    // tant que le bail court) et poursuit, sans refaire ni repayer ce qui est en cours.
    if (row?.status === "queued" && row.locked_by === WORKER_ID) run("UPDATE jobs SET status='running' WHERE id=?", this.job.id);
    run(
      "UPDATE jobs SET progress=?, message=COALESCE(?, message), locked_until=?, updated_at=? WHERE id=? AND (locked_by IS NULL OR locked_by=?)",
      Math.max(0, Math.min(1, p)),
      message ?? null,
      now() + LEASE_MS,
      now(),
      this.job.id,
      WORKER_ID,
    );
  }
  /** Enregistre un point de reprise : utilisé pour ne pas refaire une étape coûteuse. */
  save(key: string, value: unknown) {
    const cp = { ...this.checkpoint, [key]: value };
    // Une réponse arrivée pendant pause/annulation peut encore être conservée tant que ce worker
    // détient son bail. Une tâche terminée ou un autre exécuteur ne sont jamais écrasés.
    const r = run("UPDATE jobs SET checkpoint=?, locked_until=?, updated_at=? WHERE id=? AND ((locked_by=? AND status IN ('running','queued','paused','cancelled')) OR (locked_by IS NULL AND status IN ('queued','running','paused') AND ? IS NULL))", JSON.stringify(cp), now() + LEASE_MS, now(), this.job.id, WORKER_ID, this.job.locked_by);
    if (!r.changes && one("SELECT 1 FROM jobs WHERE id = ?", this.job.id)) throw new LeaseLost(L("Tâche reprise par un autre processus.", "Task taken over by another process."));
    this.job.checkpoint = JSON.stringify(cp);
  }
  async step<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cp = this.checkpoint;
    if (key in cp) return cp[key] as T;
    // Les appels aux fournisseurs faits pendant l'étape lui sont rattachés (trace des coûts par étape).
    const v = await withTrace({ jobId: this.job.id, projectId: this.job.project_id, step: key }, fn);
    this.save(key, v);
    return v;
  }
}

/** Le worker rend la main (pause ou annulation constatée) : une reprise peut alors être prise. */
export function releaseJob(jid: string) {
  run("UPDATE jobs SET locked_by=NULL, locked_until=NULL WHERE id=? AND locked_by=?", jid, WORKER_ID);
}

export function completeJob(jid: string, result: unknown) {
  const delivery = (result as { delivery?: { message?: string; state?: string; progress?:number; expected?:number;delivered?:number } } | null)?.delivery;
  const partial=delivery?.state==="partial";
  const progress=partial?Math.min(.95,Math.max(0,delivery.progress??(delivery.expected?((delivery.delivered??0)/delivery.expected):getJob(jid)?.progress??0))):1;
  const completed = run(
    "UPDATE jobs SET status='done', progress=?, result=?, error=NULL, locked_by=NULL, locked_until=NULL, message=?, finished_at=?, updated_at=? WHERE id=? AND ((status IN ('running','paused') AND (locked_by IS NULL OR locked_by=?)) OR (status='queued' AND locked_by=?))",
    progress,
    JSON.stringify(result ?? null),
    // Message au client porté par le résultat (ex. reprise débitée, annoncée en % du budget IA).
    delivery?.message ?? (typeof (result as { notice?: unknown } | null)?.notice === "string" ? `${L("Terminé", "Done")} · ${(result as { notice: string }).notice}` : L("Terminé", "Done")),
    now(),
    now(),
    jid,
    WORKER_ID,
    WORKER_ID,
  );
  // Reprise débitée : aussi dans les notifications du client (jamais en silence).
  const notice = (result as { notice?: unknown } | null)?.notice;
  const j = completed.changes && typeof notice === "string" ? one<{ user_id: string; project_id: string | null }>("SELECT user_id, project_id FROM jobs WHERE id = ?", jid) : null;
  if (j && typeof notice === "string") run("INSERT INTO notifications (id, user_id, project_id, level, title, body, created_at) VALUES (?,?,?,?,?,?,?)", id(), j.user_id, j.project_id, "info", L("Reprise d'une création par l'IA", "AI creation redone"), notice, now());
}

/** Échec : nouvelle tentative avec attente exponentielle, sauf erreur définitive. */
export function failJob(job: Job, err: unknown, opts: { permanent?: boolean } = {}) {
  const message = friendlyToolError(err instanceof Error ? err.message : String(err));
  const code=err instanceof UserFacingError && typeof err.code==="string" && /^[A-Z_]{3,80}$/.test(err.code)?err.code:null;
  const permanent = opts.permanent || (err as any)?.permanent === true || job.attempts >= job.max_attempts;
  // Seule une tâche encore tenue (ni annulée, ni mise en pause entre-temps) change d'état : une tâche annulée
  // pendant un appel puis interrompue par une erreur ne revient jamais en file.
  // Jamais celle qu'un autre worker a reprise entre-temps (bail expiré) : elle ne revient pas en file sous lui.
  const held = "((status='running' AND (locked_by IS NULL OR locked_by=?)) OR (status='queued' AND locked_by=?))";
  if (permanent) {
    const r = run(
      `UPDATE jobs SET status='failed', error=?, message=?, locked_by=NULL, locked_until=NULL, finished_at=?, updated_at=?, checkpoint=CASE WHEN ? IS NULL THEN json_remove(checkpoint,'$.failureCode') ELSE json_set(checkpoint,'$.failureCode',?) END WHERE id=? AND ${held}`,
      message.slice(0, 4000),
      message.slice(0, 300),
      now(),
      now(),
      code,
      code,
      job.id,
      WORKER_ID,
      WORKER_ID,
    );
    // Échec définitif d'une tâche lancée par le client : notification (cloche du studio) avec la vraie raison,
    // même sur les écrans qui ne suivent pas cette tâche — aucune tâche ne disparaît sans explication.
    if (r.changes && !job.parent_id) {
      const name = job.label || job.type;
      run(
        "INSERT INTO notifications (id, user_id, project_id, level, title, body, created_at) VALUES (?,?,?,?,?,?,?)",
        id(),
        job.user_id,
        job.project_id,
        "error",
        L(`Échec : ${name}`, `Failed: ${name}`).slice(0, 200),
        message.slice(0, 600),
        now(),
      );
    }
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
      WORKER_ID,
    );
  }
}

export function cancelJob(jid: string) {
  const cancelled = L("Annulée", "Canceled");
  run("UPDATE jobs SET status='cancelled', message=?, finished_at=?, updated_at=? WHERE id=? AND status IN ('queued','running','blocked','paused')", cancelled, now(), now(), jid);
  // Les sous-tâches sont annulées aussi, y compris celles en cours (leur worker s'arrête à son prochain point
  // d'avancement : aucune dépense ne continue après « Arrêter »).
  run("UPDATE jobs SET status='cancelled', message=?, finished_at=?, updated_at=? WHERE parent_id=? AND status IN ('queued','blocked','running','paused')", cancelled, now(), now(), jid);
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
  run("UPDATE jobs SET status='paused', message=?, attempts=MAX(0, attempts-1), updated_at=? WHERE (id=? OR parent_id=?) AND status='running'", paused, t, jid, jid);
  run("UPDATE jobs SET status='paused', message=?, updated_at=? WHERE (id=? OR parent_id=?) AND status IN ('queued','blocked')", paused, t, jid, jid);
}

/** Reprise après une pause : repart du dernier point de reprise. */
export function resumeJob(jid: string) {
  const job=getJob(jid);const payload=json<any>(job?.payload,{});
  if(job?.project_id && payload.strategyAwaitingChoice){const stamp=strategyStamp(job.project_id);if(!stamp)throw new UserFacingError(L("Choisissez d’abord votre angle marketing dans Marque.","First choose your marketing angle in Brand."));run("UPDATE jobs SET payload=? WHERE id=?",JSON.stringify({...payload,strategyAwaitingChoice:false,strategyVersion:stamp.id,strategyInputDigest:currentStrategyInputDigest(job.project_id)}),jid);}

  run("UPDATE jobs SET status='queued', run_at=?, message=?, updated_at=? WHERE (id=? OR parent_id=?) AND status='paused'", now(), L("Reprise…", "Resuming…"), now(), jid, jid);
}

/** Relance manuelle : repart du dernier point de reprise. */
export function retryJob(jid: string, opts: { recoveryOnly?: boolean } = {}) {
  if (opts.recoveryOnly) {
    const job = getJob(jid);
    if (!job || job.status !== "failed") return;
    run("UPDATE jobs SET payload=? WHERE id=?", JSON.stringify({ ...json<Record<string, unknown>>(job.payload, {}), recoveryOnly: true }), jid);
    for (const child of all<{id:string;depends_on:string}>("SELECT id,depends_on FROM jobs WHERE status='queued' AND depends_on LIKE ?",`%${jid}%`)) {
      if (json<string[]>(child.depends_on,[]).includes(jid)) run("UPDATE jobs SET status='blocked',message=?,updated_at=? WHERE id=? AND status='queued'",L("Étape conservée en attente d'une confirmation après récupération.","Step kept pending confirmation after recovery."),now(),child.id);
    }
  }
  run(
    "UPDATE jobs SET status='queued', run_at=?, attempts=0, error=NULL, finished_at=NULL, message=?, updated_at=? WHERE id=? AND status IN ('failed','cancelled','blocked')",
    now(),
    L("Relance demandée", "Retry requested"),
    now(),
    jid,
  );
  // Une récupération sans nouvel achat ne réactive pas d'autres tâches potentiellement payantes.
  if (opts.recoveryOnly) return;
  // Les tâches bloquées parce que celle-ci avait échoué attendent de nouveau (elles partiront quand elle aura réussi).
  for (const b of all<{ id: string; depends_on: string }>("SELECT id, depends_on FROM jobs WHERE status='blocked' AND depends_on LIKE ?", `%${jid}%`)) {
    if (json<string[]>(b.depends_on, []).includes(jid)) run("UPDATE jobs SET status='queued', message=?, updated_at=? WHERE id=? AND status='blocked'", L("En attente de l'étape relancée", "Waiting for the retried step"), now(), b.id);
  }
}

export class PermanentError extends Error {
  permanent = true;
}

/** Erreur utilisateur à afficher telle quelle, sans nouvelle tentative. */
export class UserFacingError extends PermanentError {
  constructor(message:string,public readonly code?:string){super(message);}
}

export function publicJob(j: Job) {
  const failure=j.status==="failed"?json<Record<string,any>>(j.checkpoint,{}):null;
  const failureCode=failure?.failureCode??failure?.["ai-post"]?.code;
  return {
    id: j.id,
    type: j.type,
    label: j.label,
    status: j.status,
    progress: j.progress,
    message: j.message,
    error: j.status === "failed" ? j.error : null,
    ...(typeof failureCode==="string" && /^[A-Z_]{3,80}$/.test(failureCode)?{failureCode}:{}),
    attempts: j.attempts,
    parentId: j.parent_id,
    result: json(j.result, null),
    createdAt: j.created_at,
    updatedAt: j.updated_at,
    finishedAt: j.finished_at,
    // Début de l'exécution en cours (création, ou dernière reprise / nouvelle tentative) : temps écoulé affiché.
    startedAt: Math.min(now(), Math.max(j.created_at, j.run_at ?? 0)),
    // Durée habituelle de ce type de tâche (médiane mesurée, sinon ordre de grandeur) : temps restant affiché.
    ...(j.status === "queued" || j.status === "running" || j.status === "paused" ? { estimate: jobEstimate(j.type) } : {}),
    ...jobLiveness(j),
  };
}
