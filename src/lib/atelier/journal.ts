/**
 * « MES CRÉATIONS » ET LE JOURNAL DE L'ATELIER (rapport 10, points 1 et 6).
 *
 * Chaque création de l'atelier est inscrite (geste, outil, mode, coût réel, mentions) : « Mes créations » les montre par
 * projet, avec l'outil, la date et le coût en pourcentage, et dit ce qui n'a encore servi nulle part (leçon d'Amazon :
 * la moitié des créations ne sert jamais). Le même journal compte les vidéos du mois pour le plafond du forfait.
 */
import { all, id, json, now, one, run } from "../db";
import type { Mention } from "./mentions";

export type CreationAtelier = {
  id: string; project_id: string; user_id: string; asset_id: string | null; source_asset_id: string | null;
  geste: string; mode: string; kind: "image" | "video"; provider: string; model: string; cost_micro: number;
  status: "ok" | "rate" | "produit_modifie"; mentions: string; created_at: number;
};

export function inscrireCreation(o: { projectId: string; userId: string; assetId: string | null; sourceAssetId?: string | null; geste: string; mode: string; kind: "image" | "video"; provider: string; model: string; costMicro: number; status?: CreationAtelier["status"]; mentions?: Mention[] }): string {
  const cid = id();
  run(
    "INSERT INTO atelier_creations (id, project_id, user_id, asset_id, source_asset_id, geste, mode, kind, provider, model, cost_micro, status, mentions, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    cid, o.projectId, o.userId, o.assetId, o.sourceAssetId ?? null, o.geste, o.mode, o.kind, o.provider, o.model, Math.max(0, Math.round(o.costMicro)), o.status ?? "ok", JSON.stringify(o.mentions ?? []), now(),
  );
  return cid;
}

/**
 * Vidéos de l'atelier faites par l'IA depuis le début de la période du budget (refusées par le contrôle : non comptées ;
 * le montage gratuit de deux vraies photos, fait par le Studio, non plus).
 */
export function videosDuMois(projectId: string, depuis: number): number {
  return one<{ n: number }>("SELECT COUNT(*) n FROM atelier_creations WHERE project_id = ? AND kind = 'video' AND status = 'ok' AND provider <> 'studio' AND created_at >= ?", projectId, depuis)?.n ?? 0;
}

export type MaCreation = {
  id: string; assetId: string | null; url: string | null; thumbUrl: string | null; geste: string; mode: string; kind: "image" | "video";
  outil: string; costMicro: number; status: CreationAtelier["status"]; at: number; servie: boolean; usages: string[]; mentions: Mention[];
};

/** Les créations du projet, les plus récentes d'abord, avec ce qui en a été fait (publication, publicité, site…). */
export function mesCreations(projectId: string, limit = 120): MaCreation[] {
  const rows = all<CreationAtelier & { deleted_at: number | null; thumb_key: string | null }>(
    `SELECT c.*, a.deleted_at, a.thumb_key FROM atelier_creations c LEFT JOIN assets a ON a.id = c.asset_id WHERE c.project_id = ? ORDER BY c.created_at DESC LIMIT ?`,
    projectId, limit,
  );
  const usagesOf = (assetId: string | null) => (assetId ? all<{ target_type: string }>("SELECT target_type FROM asset_usages WHERE asset_id = ?", assetId).map((u) => u.target_type) : []);
  // Une image posée dans une publication compte aussi comme servie (le média de la publication la cite).
  const dansPublication = (assetId: string | null) => !!assetId && !!one("SELECT 1 FROM posts WHERE project_id = ? AND media LIKE ? LIMIT 1", projectId, `%${assetId}%`);
  return rows
    .filter((r) => !r.deleted_at)
    .map((r) => {
      const usages = usagesOf(r.asset_id);
      if (!usages.includes("post") && dansPublication(r.asset_id)) usages.push("post");
      return {
        id: r.id, assetId: r.asset_id, url: r.asset_id ? `/api/files/${r.asset_id}` : null, thumbUrl: r.asset_id && r.thumb_key ? `/api/files/${r.asset_id}?thumb=1` : null,
        geste: r.geste, mode: r.mode, kind: r.kind, outil: `${r.provider}:${r.model}`, costMicro: r.cost_micro, status: r.status, at: r.created_at,
        servie: usages.length > 0, usages: [...new Set(usages)], mentions: json<Mention[]>(r.mentions, []),
      };
    });
}

/** Les créations réussies qui n'ont encore servi nulle part. */
export const nonServies = (c: MaCreation[]) => c.filter((x) => x.status === "ok" && !x.servie && x.assetId);

/** La phrase de SINA sur ce qui dort (« 3 créations n'ont pas encore servi : je les mets dans ton calendrier ? »). */
export function phraseNonServies(n: number, lang: "fr" | "en"): string | null {
  if (n <= 0) return null;
  if (lang === "en") return n === 1 ? "1 creation hasn't been used yet: shall I put it in your calendar?" : `${n} creations haven't been used yet: shall I put them in your calendar?`;
  return n === 1 ? "1 création n'a pas encore servi : je la mets dans ton calendrier ?" : `${n} créations n'ont pas encore servi : je les mets dans ton calendrier ?`;
}
