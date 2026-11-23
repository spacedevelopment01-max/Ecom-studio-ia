/**
 * RATTRAPAGE PAR LE CODE (essai réel de Nadia, 23 novembre 2026) : la carte disait « À ma charge : 0 % de ton budget », et
 * son budget engagé est passé de 17,04 % à 17,97 %. Ce qui suit retrouve, dans les comptes, les dépenses d'une tâche à la
 * charge du Studio qui ont été comptées au client, les lui rend par le chemin des essais ratés rendus
 * (`rendreReservationAuClient`, même calcul que `rendreAuClient`) et les inscrit à la charge du Studio, avec une trace
 * dans le grand livre (« refund » et « studio ») et sur chaque réservation.
 *
 * Ce qui est à la charge du Studio dans une telle tâche (`tacheDuStudio`) :
 *  - toutes les dépenses de la tâche elle-même (texte, images, relectures, idée en mots simples, recherche) ;
 *  - la réponse de SINA qui en présente le résultat, avec sa réécriture et sa relecture (le pas qui suit la fin de la
 *    tâche dans la même demande).
 *
 * Idempotent : une dépense déjà à la charge du Studio n'est jamais rendue deux fois ; relancé, il ne change rien. Sur un
 * projet donné, ou sur toute la base. Aucun appel à l'IA, aucune dépense.
 */
import { all, id, json, now, one, run, tx } from "../db";
import { rendreReservationAuClient } from "../billing";
import { tacheDuStudio } from "./borne-du-studio";

export type RattrapageDuStudio = {
  /** Tâches à la charge du Studio examinées. */
  taches: number;
  /** Dépenses passées à la charge du Studio (réservations, et usages comptés sans réservation). */
  depenses: number;
  /** Ce qui a été rendu au budget du client (micro-euros). */
  renduMicro: number;
  /** Le détail, une ligne par dépense rendue. */
  lignes: { tache: string; projet: string | null; quoi: string; renduMicro: number }[];
};

const NOTE = "rattrapage : dépense d'une tâche à la charge du Studio comptée au client";

/** Les réservations comptées au client pour la réponse de SINA qui présente le résultat de la tâche `jobId`. */
function reservationsDeLaPresentation(jobId: string): string[] {
  const suivi = one<{ run_id: string; conversation_id: string }>("SELECT run_id, conversation_id FROM syna_jobs WHERE job_id=? AND kind='native'", jobId);
  if (!suivi) return [];
  // Le pas qui présente : celui qui suit la fin de l'attente de cette tâche (message « jobs.wait » qui la nomme).
  const fins = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND run_id=? AND role='tool' AND content_json LIKE ?", suivi.conversation_id, suivi.run_id, `%${jobId}%`)
    .map((m) => json<{ tool?: string; key?: string }>(m.content_json, {})).filter((c) => c.tool === "jobs.wait" && /^jobs:\d+$/.test(c.key ?? ""));
  const agents = all<{ job_id: string }>("SELECT job_id FROM syna_jobs WHERE run_id=? AND kind='agent'", suivi.run_id).map((x) => x.job_id);
  if (!fins.length || !agents.length) return [];
  const ids = new Set<string>();
  for (const f of fins) {
    const cle = `syna:${suivi.run_id}:${f.key!.slice("jobs:".length)}`;
    const esc = cle.replace(/[\\%_]/g, (c) => `\\${c}`);
    for (const r of all<{ id: string }>(`SELECT DISTINCT r.id FROM ai_reservations r JOIN ai_calls c ON c.usage_event_id = r.usage_event_id
      WHERE c.job_id IN (${agents.map(() => "?").join(",")}) AND r.studio = 0 AND r.status IN ('settled','reconciled','uncertain')
        AND (c.usage_key = ? OR c.usage_key LIKE ? ESCAPE '\\' OR c.usage_key LIKE ? ESCAPE '\\')`, ...agents, cle, `${esc}:%`, `${esc}~%`)) ids.add(r.id);
  }
  return [...ids];
}

/**
 * Rend au client les dépenses des tâches à la charge du Studio qui lui ont été comptées (sur le projet `projectId`, ou
 * sur toute la base), et les inscrit à la charge du Studio. Idempotent.
 */
export function rendreLaChargeDuStudio(o: { projectId?: string | null } = {}): RattrapageDuStudio {
  const out: RattrapageDuStudio = { taches: 0, depenses: 0, renduMicro: 0, lignes: [] };
  const taches = all<{ id: string; project_id: string | null; payload: string }>(
    `SELECT id, project_id, payload FROM jobs WHERE payload LIKE '%"studio":true%'${o.projectId ? " AND project_id = ?" : ""} ORDER BY created_at`,
    ...(o.projectId ? [o.projectId] : []),
  ).filter((j) => tacheDuStudio(json(j.payload, {})));
  for (const t of taches) {
    out.taches++;
    const rendre = (rid: string, quoi: string) => {
      const avant = one<{ studio: number }>("SELECT studio FROM ai_reservations WHERE id=?", rid);
      if (!avant || avant.studio) return;
      const rendu = rendreReservationAuClient(rid, `${NOTE} (tâche ${t.id})`);
      out.depenses++; out.renduMicro += rendu;
      out.lignes.push({ tache: t.id, projet: t.project_id, quoi, renduMicro: rendu });
    };
    // 1. Les dépenses de la tâche elle-même.
    for (const r of all<{ id: string; task: string }>("SELECT id, task FROM ai_reservations WHERE job_id=? AND studio=0 AND status IN ('settled','reconciled','uncertain') ORDER BY created_at", t.id)) rendre(r.id, r.task);
    // Une réservation encore ouverte (processus arrêté) : passée à la charge du Studio avant son règlement.
    for (const r of all<{ id: string }>("SELECT id FROM ai_reservations WHERE job_id=? AND studio=0 AND status='held'", t.id)) {
      tx(() => {
        const h = one<{ user_id: string; res_monthly: number; res_topup: number; studio: number; status: string }>("SELECT user_id, res_monthly, res_topup, studio, status FROM ai_reservations WHERE id=?", r.id);
        if (!h || h.studio || h.status !== "held") return;
        run("UPDATE wallets SET reserved = MAX(0, reserved - ?), reserved_topup = MAX(0, reserved_topup - ?), updated_at = ? WHERE user_id = ?", h.res_monthly, h.res_topup, now(), h.user_id);
        run("UPDATE ai_reservations SET studio = 1, res_monthly = 0, res_topup = 0, note = ? WHERE id = ?", `à la charge du Studio — ${NOTE}`, r.id);
        out.depenses++;
        out.lignes.push({ tache: t.id, projet: t.project_id, quoi: "réservation ouverte", renduMicro: h.res_monthly + h.res_topup });
      });
    }
    // Un usage compté sans réservation (débit direct) : rendu, puis rattaché à une réservation du Studio (trace, et la
    // part du Studio de la tâche le compte désormais).
    for (const u of all<{ id: string; user_id: string; project_id: string | null; task: string; provider: string; model: string; billed: number }>(
      "SELECT e.id, e.user_id, e.project_id, e.task, e.provider, e.model, e.billed FROM usage_events e WHERE e.job_id=? AND NOT EXISTS (SELECT 1 FROM ai_reservations r WHERE r.usage_event_id = e.id)", t.id)) {
      tx(() => {
        if (one("SELECT 1 FROM ai_reservations WHERE usage_event_id=?", u.id)) return;
        const debit = one<{ user_id: string; bucket: string; amount: number; created_at: number }>("SELECT user_id, bucket, amount, created_at FROM ledger WHERE type='usage' AND ref=?", `usage:${u.id}`);
        const w = debit ? one<{ period_start: number }>("SELECT period_start FROM wallets WHERE user_id=?", debit.user_id) : null;
        const montant = debit ? -debit.amount : 0;
        const mensuel = debit && debit.bucket === "monthly" && w && debit.created_at >= w.period_start ? montant : 0, packs = debit && debit.bucket === "topup" ? montant : 0;
        const compte = debit?.user_id ?? u.user_id;
        if (mensuel + packs > 0) {
          run("UPDATE wallets SET monthly_used = MAX(0, monthly_used - ?), topup_balance = topup_balance + ?, topup_period_used = MAX(0, topup_period_used - ?), updated_at = ? WHERE user_id = ?", mensuel, packs, packs, now(), compte);
          run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), compte, "refund", packs > 0 ? "topup" : "monthly", mensuel + packs, `rendu-usage:${u.id}`, `Coût d'une tâche du Studio (« À ma charge ») rendu au client — ${NOTE}`, now());
        }
        const rid = id();
        run("INSERT INTO ai_reservations (id, user_id, amount, res_monthly, res_topup, status, task, provider, model, job_id, project_id, created_at, recovery_until, studio, actual, debit_monthly, debit_topup, settled_at, usage_event_id, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          rid, compte, Math.max(1, u.billed), 0, 0, "settled", u.task, u.provider, u.model, t.id, u.project_id, now(), 0, 1, u.billed, 0, 0, now(), u.id, `à la charge du Studio — ${NOTE}`);
        if (u.billed > 0) run("INSERT INTO ledger (id, user_id, type, bucket, amount, ref, note, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), compte, "studio", "none", -u.billed, `studio:${rid}`, `Coût d'une tâche du Studio (« À ma charge ») à la charge du Studio — ${NOTE}`, now());
        out.depenses++; out.renduMicro += mensuel + packs;
        out.lignes.push({ tache: t.id, projet: t.project_id, quoi: `${u.task} (usage sans réservation)`, renduMicro: mensuel + packs });
      });
    }
    // 2. La réponse de SINA qui présente le résultat de la tâche.
    for (const rid of reservationsDeLaPresentation(t.id)) rendre(rid, "réponse de SINA qui présente le résultat");
  }
  return out;
}
