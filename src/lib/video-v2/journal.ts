/**
 * Journal des vidéos créées par l'IA, signalement et retrait, droits sur la photo (rapport 09 du 22 novembre 2026,
 * point 11 : obligations de « Platform Customer » des conditions de BytePlus pour Seedance, valables pour tous les
 * fabricants). Chaque plan créé par l'IA est inscrit (qui, quoi, quand, quel modèle, droits confirmés). Un plan signalé
 * est retiré tout de suite (jamais plus montré ni monté), avec la raison et qui l'a signalé : la trace reste.
 *
 * Avant d'animer une photo, le client coche « j'ai les droits sur cette photo » : l'accord est gardé, daté, et le moteur
 * n'anime aucune photo sans lui (il garde alors les plans sûrs).
 */
import crypto from "node:crypto";
import { all, id, now, one, run } from "../db";

export const RIGHTS_KEY = "video.rights.confirmed";

/** Accord « j'ai les droits sur cette photo » : gardé, daté, par qui. */
export function confirmPhotoRights(projectId: string, userId: string): number {
  const at = now();
  run("INSERT INTO memory(id,project_id,kind,key,value,status,source,scope,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)", id(), projectId, "decision", RIGHTS_KEY, JSON.stringify({ userId, at }), "confirmed", "user", "video", at, at);
  return at;
}
/** Date du dernier accord sur les droits des photos (null : jamais coché). */
export function photoRightsAt(projectId: string): number | null {
  return one<{ created_at: number }>("SELECT created_at FROM memory WHERE project_id=? AND scope='video' AND key=? ORDER BY created_at DESC LIMIT 1", projectId, RIGHTS_KEY)?.created_at ?? null;
}

export type VideoCreation = { id: string; project_id: string; user_id: string; asset_id: string | null; source_asset_id: string | null; provider: string; model: string; prompt_sha: string; rights_confirmed_at: number | null; status: "ok" | "retire"; report_reason: string | null; reported_by: string | null; reported_at: number | null; created_at: number };

/** Inscrit un plan créé par l'IA. La consigne n'est pas gardée en clair : seulement son empreinte. */
export function journalCreation(o: { projectId: string; userId: string; assetId: string | null; sourceAssetId?: string | null; provider: string; model: string; prompt: string }): string {
  const rid = id();
  run("INSERT INTO video_creations(id,project_id,user_id,asset_id,source_asset_id,provider,model,prompt_sha,rights_confirmed_at,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)", rid, o.projectId, o.userId, o.assetId, o.sourceAssetId ?? null, o.provider, o.model, crypto.createHash("sha256").update(o.prompt).digest("hex"), o.sourceAssetId ? photoRightsAt(o.projectId) : null, "ok", now());
  return rid;
}

export const projectCreations = (projectId: string, limit = 100) => all<VideoCreation>("SELECT * FROM video_creations WHERE project_id=? ORDER BY created_at DESC LIMIT ?", projectId, limit);

/**
 * Signalement et retrait : le plan est retiré tout de suite de la bibliothèque (jamais plus monté ni montré), la
 * raison et l'auteur du signalement sont gardés. Idempotent.
 */
export function withdrawCreation(projectId: string, creationId: string, o: { by: string; reason: string }): VideoCreation | null {
  const c = one<VideoCreation>("SELECT * FROM video_creations WHERE id=? AND project_id=?", creationId, projectId);
  if (!c) return null;
  if (c.status !== "retire") {
    run("UPDATE video_creations SET status='retire', report_reason=?, reported_by=?, reported_at=? WHERE id=?", o.reason.slice(0, 500), o.by, now(), c.id);
    if (c.asset_id) run("UPDATE assets SET deleted_at=COALESCE(deleted_at, ?), status='rejected' WHERE id=? AND project_id=?", now(), c.asset_id, projectId);
  }
  return one<VideoCreation>("SELECT * FROM video_creations WHERE id=?", c.id) ?? null;
}
