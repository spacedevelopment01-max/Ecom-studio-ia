/**
 * NIVEAU 3 — PROGRAMMATION ET PUBLICATION (persistantes, côté serveur, navigateur fermé).
 *
 * Fiabilité :
 *  - prise en charge ATOMIQUE (scheduled → publishing, jeton de verrou) : deux workers ne publient jamais la même
 *    publication ; une tâche rejouée après redémarrage ne repart pas si l'état a changé ;
 *  - journal des tentatives (`post_attempts`) : début, fin, résultat, identifiant distant ;
 *  - délai dépassé / réponse perdue : jamais de nouvel envoi à l'aveugle — vérification côté plateforme quand l'API
 *    le permet, sinon état « INCERTAIN » à vérifier par le client ;
 *  - verrou orphelin (worker arrêté pendant l'envoi) : même traitement à la reprise ;
 *  - jeton expiré, compte déconnecté ou révoqué : échec clair, compte marqué à reconnecter, aucune autre tentative ;
 *  - version modifiée après approbation : jamais publiée (retour « à valider ») ;
 *  - calendrier en pause : rien ne part.
 * La publication passe par un `Publisher` injecté : les tests utilisent un publieur simulé (aucun vrai compte).
 */
import crypto from "node:crypto";
import { all, id, now, one, run } from "../db";
import { enqueue, PermanentError } from "../jobs";
import { notify } from "../projects";
import { planOfUserId } from "../plan-gates";
import { L } from "../i18n-server";
import { connectionFor, markConnection, type PostRow } from "../social/publish";
import { approvalValid, type PostRowV2 } from "./approval";
import { platformSpec } from "./platforms";
import type { Publisher } from "./deps";

export const PUBLISH_TIMEOUT_MS = 10 * 60_000;
export const STALE_LOCK_MS = 15 * 60_000;
const RETRY_DELAY_MS = 15 * 60_000;

export type PublishOutcome = { outcome: "published" | "failed" | "retry" | "uncertain" | "skipped"; detail: string; remoteId?: string | null; deduplicated?: boolean };

type Full = PostRow & PostRowV2 & { user_id: string; lock_token: string | null; locked_at: number | null };

function logAttempt(postId: string, attempt: number, token: string, outcome: string, detail = "", remoteId: string | null = null): string {
  const aid = id();
  run("INSERT INTO post_attempts (id, post_id, attempt, lock_token, started_at, ended_at, outcome, detail, remote_id) VALUES (?,?,?,?,?,?,?,?,?)", aid, postId, attempt, token, now(), outcome === "sending" ? null : now(), outcome, detail.slice(0, 500), remoteId);
  return aid;
}
const closeAttempt = (aid: string, outcome: string, detail = "", remoteId: string | null = null) => run("UPDATE post_attempts SET ended_at = ?, outcome = ?, detail = ?, remote_id = ? WHERE id = ?", now(), outcome, detail.slice(0, 500), remoteId, aid);

export class PublishTimeout extends Error {}
const withTimeout = <T,>(p: Promise<T>, ms: number) => new Promise<T>((res, rej) => {
  const t = setTimeout(() => rej(new PublishTimeout(`délai dépassé (${Math.round(ms / 1000)} s)`)), ms);
  p.then((v) => (clearTimeout(t), res(v)), (e) => (clearTimeout(t), rej(e)));
});

/** Refus de la plateforme AVANT toute création (limite de débit) : un nouvel essai ne peut pas créer de doublon. */
const isSafeRetry = (e: unknown) => /limite de débit|rate limit|too many requests|429/i.test(String((e as Error)?.message ?? e));

const isPaused = (planId: string | null) => !!planId && !!one("SELECT 1 FROM content_plans WHERE id = ? AND paused = 1", planId);

/**
 * Publie UNE publication programmée. Rejouable sans risque : seule la tâche qui obtient le verrou envoie.
 */
export async function publishOne(postId: string, publisher: Publisher, o: { timeoutMs?: number } = {}): Promise<PublishOutcome> {
  const owner = one<{ user_id: string; project_id: string; plan_id: string | null; status: string }>("SELECT pr.user_id, p.project_id, p.plan_id, p.status FROM posts p JOIN projects pr ON pr.id = p.project_id WHERE p.id = ?", postId);
  if (!owner) return { outcome: "skipped", detail: "publication supprimée" };
  // Publication réservée aux forfaits : revérifiée au moment de l'envoi (forfait résilié depuis la programmation).
  if (!planOfUserId(owner.user_id)) {
    const msg = L("Publication non envoyée : la publication sur les réseaux est réservée aux forfaits. Choisissez un forfait dans « Mon compte », puis reprogrammez-la.", "Post not sent: publishing to social networks is included in the plans. Choose a plan in \"My account\", then reschedule it.");
    const moved = run("UPDATE posts SET status = 'review', error = ?, updated_at = ? WHERE id = ? AND status = 'scheduled'", msg, now(), postId);
    if (moved.changes) notify(owner.user_id, owner.project_id, L("Une publication n'a pas été envoyée", "A post was not sent"), msg, "error");
    return { outcome: "skipped", detail: "sans forfait" };
  }
  if (isPaused(owner.plan_id)) {
    run("UPDATE posts SET status = 'paused', updated_at = ? WHERE id = ? AND status = 'scheduled'", now(), postId);
    return { outcome: "skipped", detail: "calendrier en pause" };
  }
  const pre = one<Full>("SELECT p.*, pr.user_id FROM posts p JOIN projects pr ON pr.id = p.project_id WHERE p.id = ?", postId)!;
  // Version différente de celle approuvée : jamais publiée.
  if (pre.status === "scheduled" && !approvalValid(pre)) {
    run("UPDATE posts SET status = 'review', error = ?, updated_at = ? WHERE id = ? AND status = 'scheduled'", L("Contenu modifié après approbation : nouvelle approbation nécessaire.", "Content changed after approval: a new approval is required."), now(), postId);
    return { outcome: "skipped", detail: "version non approuvée" };
  }
  // Prise en charge atomique : une seule tâche peut passer « scheduled → publishing ».
  const token = crypto.randomUUID();
  const claimed = run("UPDATE posts SET status = 'publishing', lock_token = ?, locked_at = ?, attempts = attempts + 1, updated_at = ? WHERE id = ? AND status = 'scheduled'", token, now(), now(), postId);
  if (!claimed.changes) return { outcome: "skipped", detail: "état modifié (annulée, déplacée, déjà prise en charge ou publiée)" };
  const post = one<Full>("SELECT p.*, pr.user_id FROM posts p JOIN projects pr ON pr.id = p.project_id WHERE p.id = ?", postId)!;
  const aid = logAttempt(postId, post.attempts, token, "sending");
  const c = connectionFor(post.connection_id, post.user_id);
  const finish = (status: string, fields: Record<string, unknown> = {}) => {
    const cols = Object.keys(fields);
    run(`UPDATE posts SET status = ?, lock_token = NULL, locked_at = NULL${cols.map((k) => `, ${k} = ?`).join("")}, updated_at = ? WHERE id = ? AND lock_token = ?`, status, ...cols.map((k) => fields[k]), now(), postId, token);
  };
  if (!c || c.status === "revoked" || c.status === "expired" || c.status === "error") {
    const msg = !c ? L("Aucun compte connecté pour cette publication.", "No connected account for this post.") : L(`Le compte ${c.name} doit être reconnecté.`, `The account ${c.name} must be reconnected.`);
    finish("failed", { error: msg });
    closeAttempt(aid, "failed", msg);
    notify(post.user_id, post.project_id, L("Une publication a échoué", "A post failed"), msg, "error");
    return { outcome: "failed", detail: msg };
  }
  if (platformSpec(post.network).level !== "ready_to_connect") {
    const msg = L("Ce réseau n'a pas de publication directe depuis le studio : publiez-la à la main (export).", "This network has no direct publishing from the studio: post it manually (export).");
    finish("approved", { error: msg });
    closeAttempt(aid, "skipped", msg);
    return { outcome: "skipped", detail: msg };
  }
  try {
    // Reprise : une publication déjà créée (vérifiable) n'est jamais renvoyée.
    const existing = publisher.canVerify(c.provider) ? await publisher.findExisting(post, c) : null;
    if (existing) {
      finish("published", { remote_id: existing, published_at: now(), error: null });
      closeAttempt(aid, "published", "déjà présente sur la plateforme (aucun nouvel envoi)", existing);
      return { outcome: "published", detail: "déjà publiée", remoteId: existing, deduplicated: true };
    }
    const r = await withTimeout(publisher.publish(post, c), o.timeoutMs ?? PUBLISH_TIMEOUT_MS);
    if (!r?.remoteId) throw new Error("réponse sans identifiant de publication");
    finish("published", { remote_id: r.remoteId, remote_url: r.url ?? null, published_at: now(), error: r.note ?? null });
    closeAttempt(aid, "published", r.note ?? "", r.remoteId);
    return { outcome: "published", detail: r.note ?? "", remoteId: r.remoteId };
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 500);
    if (e instanceof PermanentError) {
      if (e && (e as { reconnect?: boolean }).reconnect) markConnection(c, "expired", msg);
      finish("failed", { error: msg });
      closeAttempt(aid, "failed", msg);
      notify(post.user_id, post.project_id, L("Une publication a échoué", "A post failed"), `${post.network} : ${msg.slice(0, 200)}`, "error");
      return { outcome: "failed", detail: msg };
    }
    if (isSafeRetry(e)) {
      finish("scheduled", { scheduled_at: now() + RETRY_DELAY_MS, error: msg });
      closeAttempt(aid, "retry", msg);
      return { outcome: "retry", detail: msg };
    }
    return resolveUnknown(post, c, publisher, token, aid, msg);
  }
}

/**
 * Réponse perdue (délai dépassé, coupure, worker arrêté) : la publication a PEUT-ÊTRE été créée. Vérification côté
 * plateforme quand c'est possible ; sinon état INCERTAIN (aucun nouvel envoi automatique).
 */
async function resolveUnknown(post: Full, c: NonNullable<ReturnType<typeof connectionFor>>, publisher: Publisher, token: string, aid: string, msg: string): Promise<PublishOutcome> {
  const set = (status: string, fields: Record<string, unknown>) => {
    const cols = Object.keys(fields);
    run(`UPDATE posts SET status = ?, lock_token = NULL, locked_at = NULL${cols.map((k) => `, ${k} = ?`).join("")}, updated_at = ? WHERE id = ? AND lock_token = ?`, status, ...cols.map((k) => fields[k]), now(), post.id, token);
  };
  if (publisher.canVerify(c.provider)) {
    let found: string | null = null;
    let verified = true;
    try {
      found = await publisher.findExisting(post, c);
    } catch {
      verified = false;
    }
    if (found) {
      set("published", { remote_id: found, published_at: now(), error: null });
      closeAttempt(aid, "published", `réponse perdue, publication retrouvée sur la plateforme (${msg})`, found);
      return { outcome: "published", detail: "retrouvée après réponse perdue", remoteId: found, deduplicated: true };
    }
    if (verified) {
      set("scheduled", { scheduled_at: now() + RETRY_DELAY_MS, error: msg });
      closeAttempt(aid, "retry", `vérifiée absente sur la plateforme : nouvel essai (${msg})`);
      return { outcome: "retry", detail: msg };
    }
  }
  const why = L(`État incertain après « ${msg} » : vérifiez sur ${platformSpec(post.network).label} si la publication existe, puis indiquez-le dans le studio. Aucun nouvel envoi automatique.`, `Uncertain state after "${msg}": check on ${platformSpec(post.network).label} whether the post exists, then confirm it in the studio. No automatic resend.`);
  set("uncertain", { error: why });
  closeAttempt(aid, "uncertain", msg);
  notify(post.user_id, post.project_id, L("Publication à vérifier", "Post to verify"), why, "error");
  return { outcome: "uncertain", detail: why };
}

/** Verrous orphelins (worker arrêté pendant l'envoi) : traités comme une réponse perdue, jamais renvoyés à l'aveugle. */
export async function recoverStale(publisher: Publisher, staleMs = STALE_LOCK_MS): Promise<number> {
  const stale = all<Full>("SELECT p.*, pr.user_id FROM posts p JOIN projects pr ON pr.id = p.project_id WHERE p.status = 'publishing' AND (p.locked_at IS NULL OR p.locked_at < ?)", now() - staleMs);
  for (const post of stale) {
    const token = post.lock_token ?? crypto.randomUUID();
    if (!post.lock_token) run("UPDATE posts SET lock_token = ? WHERE id = ?", token, post.id);
    const open = one<{ id: string }>("SELECT id FROM post_attempts WHERE post_id = ? AND outcome = 'sending' ORDER BY started_at DESC LIMIT 1", post.id);
    const aid = open?.id ?? logAttempt(post.id, post.attempts, token, "sending", "reprise");
    const c = connectionFor(post.connection_id, post.user_id);
    if (!c) {
      run("UPDATE posts SET status = 'uncertain', lock_token = NULL, locked_at = NULL, error = ?, updated_at = ? WHERE id = ?", L("Envoi interrompu et compte introuvable : vérifiez sur la plateforme.", "Sending interrupted and account not found: check on the platform."), now(), post.id);
      closeAttempt(aid, "uncertain", "worker interrompu, compte introuvable");
      continue;
    }
    await resolveUnknown({ ...post, lock_token: token }, c, publisher, token, aid, "worker interrompu pendant l'envoi");
  }
  return stale.length;
}

/** Le client confirme l'état d'une publication incertaine (après vérification sur la plateforme). */
export function confirmUncertain(postId: string, published: boolean, remoteUrl?: string | null) {
  const r = one<{ status: string }>("SELECT status FROM posts WHERE id = ?", postId);
  if (r?.status !== "uncertain") throw new Error("publication non incertaine");
  if (published) run("UPDATE posts SET status = 'published', remote_url = COALESCE(?, remote_url), published_at = COALESCE(published_at, ?), error = NULL, updated_at = ? WHERE id = ?", remoteUrl ?? null, now(), now(), postId);
  else run("UPDATE posts SET status = 'review', error = ?, updated_at = ? WHERE id = ?", L("Non publiée (confirmé par vous) : reprogrammez-la si besoin.", "Not published (confirmed by you): reschedule it if needed."), now(), postId);
  logAttempt(postId, 0, "client", published ? "published" : "failed", published ? "confirmé publié par le client" : "confirmé non publié par le client");
}

/** Met en file les publications arrivées à échéance (hors calendriers en pause, hors versions non approuvées). */
export function enqueueDueV2(limit = 50): number {
  const due = all<{ id: string; project_id: string; scheduled_at: number; user_id: string }>(
    `SELECT p.id, p.project_id, p.scheduled_at, pr.user_id FROM posts p JOIN projects pr ON pr.id = p.project_id
      LEFT JOIN content_plans cp ON cp.id = p.plan_id
      WHERE p.status = 'scheduled' AND p.scheduled_at <= ? AND COALESCE(cp.paused, 0) = 0 ORDER BY p.scheduled_at LIMIT ?`,
    now(),
    limit,
  );
  for (const d of due) enqueue({ userId: d.user_id, projectId: d.project_id, type: "post.publish", label: L("Publication programmée", "Scheduled post"), payload: { postId: d.id }, idempotencyKey: `publish:${d.id}:${d.scheduled_at}`, maxAttempts: 1 });
  return due.length;
}

export type ScheduleResult = { scheduled: string[]; refused: { id: string; reason: string }[] };

/**
 * Programme des publications APPROUVÉES (consentement explicite du client : bouton « Programmer » ou règle
 * d'automatisation qu'il a créée). Conditions : version approuvée, compte connecté et actif, réseau publiable depuis
 * le studio, date future, aucun défaut bloquant.
 */
export function schedulePosts(ids: string[], gate: (postId: string) => { blocking: string[] }): ScheduleResult {
  const out: ScheduleResult = { scheduled: [], refused: [] };
  for (const pid of ids) {
    const r = one<Full>("SELECT p.*, pr.user_id FROM posts p JOIN projects pr ON pr.id = p.project_id WHERE p.id = ?", pid);
    if (!r) continue;
    const refuse = (reason: string) => out.refused.push({ id: pid, reason });
    if (!["approved", "paused", "review"].includes(r.status) && !(r.engine === "v1" && r.status === "review")) {
      refuse(`statut ${r.status}`);
      continue;
    }
    if (r.engine === "v2" && !approvalValid(r)) {
      refuse("à approuver (version actuelle non approuvée)");
      continue;
    }
    if (platformSpec(r.network).level !== "ready_to_connect") {
      refuse(`${platformSpec(r.network).label} : publication à faire à la main (export)`);
      continue;
    }
    const c = connectionFor(r.connection_id, r.user_id);
    if (!c) {
      refuse("aucun compte connecté choisi");
      continue;
    }
    if (c.status !== "active") {
      refuse(`compte ${c.name} à reconnecter`);
      continue;
    }
    if (!r.scheduled_at || r.scheduled_at < now() - 60_000) {
      refuse("date passée ou absente");
      continue;
    }
    const g = gate(pid);
    if (g.blocking.length) {
      refuse(g.blocking.join(" ; "));
      continue;
    }
    run("UPDATE posts SET status = 'scheduled', error = NULL, updated_at = ? WHERE id = ?", now(), pid);
    out.scheduled.push(pid);
  }
  return out;
}

/** Déprogrammer (retour « approuvée », rien n'est envoyé). */
export function unschedule(ids: string[]) {
  for (const pid of ids) run("UPDATE posts SET status = CASE WHEN approved_hash IS NOT NULL THEN 'approved' ELSE 'review' END, updated_at = ? WHERE id = ? AND status IN ('scheduled','paused')", now(), pid);
}

/** Pause / reprise d'un calendrier : en pause, aucune publication ne part (les programmées passent « en pause »). */
export function setPlanPaused(planId: string, paused: boolean) {
  run("UPDATE content_plans SET paused = ?, updated_at = ? WHERE id = ?", paused ? 1 : 0, now(), planId);
  if (paused) run("UPDATE posts SET status = 'paused', updated_at = ? WHERE plan_id = ? AND status = 'scheduled'", now(), planId);
  else run("UPDATE posts SET status = 'scheduled', updated_at = ? WHERE plan_id = ? AND status = 'paused' AND scheduled_at > ?", now(), planId, now());
}

export const attemptsOf = (postId: string) => all<{ attempt: number; started_at: number; ended_at: number | null; outcome: string; detail: string; remote_id: string | null }>("SELECT attempt, started_at, ended_at, outcome, detail, remote_id FROM post_attempts WHERE post_id = ? ORDER BY started_at", postId);
