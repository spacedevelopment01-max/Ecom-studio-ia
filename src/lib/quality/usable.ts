/**
 * Règle unique de réutilisation automatique d'un asset (thème, publicités, publications, montages vidéo) :
 * ce qui est REJECTED ne revient jamais tout seul ailleurs, et un défaut fatal ne devient jamais réutilisable,
 * même après un choix manuel (inspection seulement).
 *
 * Assets antérieurs à la barrière (sans meta.gate : envois du client, rendus locaux, anciens projets) : comportement
 * d'avant, sauf le statut « rejected », toujours exclu.
 */
import { all, json } from "../db";
import type { Asset } from "../library";
import type { GateMeta } from "./store";

const gateOf = (a: Pick<Asset, "meta">): Partial<GateMeta> | null => json<{ gate?: Partial<GateMeta> }>(a.meta as any, {}).gate ?? null;

export function isAutoUsable(a: Pick<Asset, "meta" | "status"> & { deleted_at?: number | null }): boolean {
  if (a.deleted_at) return false;
  const g = gateOf(a);
  if (g?.fatal) return false;
  if (a.status === "rejected") return false;
  if (!g) return true;
  if (g.verdict === "FINAL") return true;
  if (g.verdict === "PROVISIONAL" && g.provisional?.use === "auto") return true;
  // Choix humain : un résultat à reprendre ou provisoire que le client a approuvé reste à sa disposition.
  return a.status === "approved" && (g.verdict === "RETRY" || g.verdict === "PROVISIONAL");
}

/** Le client peut-il sélectionner cet asset à la main pour l'utiliser ? (Un défaut fatal : inspection seulement.) */
export function manuallySelectable(a: Pick<Asset, "meta"> & { deleted_at?: number | null }): boolean {
  return !a.deleted_at && !gateOf(a)?.fatal;
}

/** Assets d'un rôle réutilisables automatiquement (remplace la lecture directe par rôle dans les modules). */
export function usableByRole(projectId: string, role: string, limit = 20): Asset[] {
  return all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT ?", projectId, role, limit * 3)
    .filter(isAutoUsable)
    .slice(0, limit);
}
