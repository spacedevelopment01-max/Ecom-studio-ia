/**
 * Approbation par VERSION : l'empreinte (`content_hash`) couvre réseau, format, titre, légende, hashtags, lien et
 * médias (dans l'ordre). Approuver enregistre l'empreinte approuvée (`approved_hash`) ; toute modification du texte
 * ou des médias change l'empreinte et rend l'approbation caduque — la publication ne part jamais dans une version
 * différente de celle approuvée. La date et l'heure ne font pas partie de l'empreinte (déplacer ne demande pas de
 * nouvelle approbation).
 */
import crypto from "node:crypto";
import { all, now, one, run, tx } from "../db";

export type HashedFields = { network: string; format: string; title: string; caption: string; hashtags: string; link: string | null; media: string };

export const contentHash = (r: HashedFields) => crypto.createHash("sha256").update(JSON.stringify([r.network, r.format, r.title.trim(), r.caption.trim(), r.hashtags.trim(), r.link ?? "", r.media])).digest("hex").slice(0, 32);

export type PostRowV2 = HashedFields & { id: string; project_id: string; status: string; scheduled_at: number | null; content_hash: string | null; approved_hash: string | null; engine: string; gate: string; connection_id: string | null; plan_id: string | null; user_edited: number };

/** Empreinte recalculée et enregistrée (après toute modification). */
export function refreshHash(postId: string): string {
  const r = one<PostRowV2>("SELECT * FROM posts WHERE id = ?", postId);
  if (!r) throw new Error("publication introuvable");
  const h = contentHash(r);
  if (h !== r.content_hash) run("UPDATE posts SET content_hash = ? WHERE id = ?", h, postId);
  return h;
}

/** L'approbation couvre-t-elle la version actuelle ? (Anciennes publications V1 : approbation par date seulement.) */
export function approvalValid(r: Pick<PostRowV2, "engine" | "approved_hash"> & HashedFields): boolean {
  if (r.engine !== "v2") return true;
  return !!r.approved_hash && r.approved_hash === contentHash(r);
}

/** Statuts qui ne peuvent plus être approuvés (envoyés, en cours, annulés). */
const FROZEN = new Set(["publishing", "published", "uncertain", "cancelled"]);

export type ApproveResult = { approved: string[]; refused: { id: string; reason: string }[] };

/**
 * Approuve des publications (une, une semaine, un calendrier). Refus explicite si la barrière bloque (affirmation
 * inventée, média refusé, information à compléter) : une approbation ne contourne jamais un défaut bloquant.
 */
export function approvePosts(ids: string[], userId: string, gate: (postId: string) => { blocking: string[] }): ApproveResult {
  const out: ApproveResult = { approved: [], refused: [] };
  tx(() => {
    for (const pid of ids) {
      const r = one<PostRowV2>("SELECT * FROM posts WHERE id = ?", pid);
      if (!r) continue;
      if (FROZEN.has(r.status)) {
        out.refused.push({ id: pid, reason: `déjà ${r.status}` });
        continue;
      }
      const g = gate(pid);
      if (g.blocking.length) {
        out.refused.push({ id: pid, reason: g.blocking.join(" ; ") });
        continue;
      }
      const h = contentHash(r);
      run("UPDATE posts SET approved_hash = ?, content_hash = ?, approved_at = ?, approved_by = ?, status = CASE WHEN status IN ('planned','draft','review','failed') THEN 'approved' ELSE status END, updated_at = ? WHERE id = ?", h, h, now(), userId, now(), pid);
      out.approved.push(pid);
    }
  });
  return out;
}

/** Publications d'une semaine (lundi → dimanche, dans le fuseau du plan) ou d'un plan entier. */
export function postsInRange(projectId: string, from: number, to: number, planId?: string | null): string[] {
  return all<{ id: string }>(`SELECT id FROM posts WHERE project_id = ? AND engine = 'v2' AND scheduled_at >= ? AND scheduled_at < ?${planId ? " AND plan_id = ?" : ""} ORDER BY scheduled_at`, ...(planId ? [projectId, from, to, planId] : [projectId, from, to])).map((r) => r.id);
}

/**
 * Après une modification : nouvelle empreinte ; si elle diffère de l'approuvée, la publication revient « à valider »
 * (une publication programmée est déprogrammée). Retourne vrai si une nouvelle approbation est nécessaire.
 */
export function afterEdit(postId: string): boolean {
  const r = one<PostRowV2>("SELECT * FROM posts WHERE id = ?", postId);
  if (!r) return false;
  const h = contentHash(r);
  const stale = !!r.approved_hash && r.approved_hash !== h;
  run(`UPDATE posts SET content_hash = ?, user_edited = 1${stale ? ", status = CASE WHEN status IN ('approved','scheduled','paused') THEN 'review' ELSE status END" : ""}, updated_at = ? WHERE id = ?`, h, now(), postId);
  return stale;
}
