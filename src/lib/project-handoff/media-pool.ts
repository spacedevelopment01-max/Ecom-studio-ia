/** Un fichier de publication/publicité ne devient jamais un média du site par simple affectation. */
import type { Asset } from "../library";

export function isSocialMedia(role: string | null | undefined, meta: any): boolean {
  return ["ad", "social", "post", "social-post", "ad-visual"].includes(role ?? "") || !!(
    meta?.initialCreative || meta?.initialDiversity || meta?.socialV2 ||
    meta?.finalImage?.purpose === "post" || meta?.finalImage?.purpose === "ad" ||
    ["ad", "social", "publication"].includes(meta?.imageV2?.brief?.support)
  );
}

export const MAX_SITE_MEDIA_LINEAGE = 256;
type LineageAsset = Pick<Asset, "id" | "project_id" | "role" | "meta" | "source_asset_id">;
type LineageCode = "social_pool" | "source_foreign" | "source_missing" | "source_cycle" | "source_depth";
/**
 * Même contrôle pour la validation du site et son contrat. Les parents archivés restent
 * auditables : seule l'utilisabilité du fichier enfant est contrôlée par l'appelant.
 * Une origine non résolue n'est jamais prise pour une preuve d'appartenance au pool site.
 */
export function inspectSiteMediaLineage(asset: LineageAsset, projectId: string, lookup: (id: string) => LineageAsset | null | undefined): { verified: boolean; code: LineageCode | null; issue: string | null } {
  const reject = (code: LineageCode, issue: string) => ({ verified: false, code, issue });
  const visited = new Set<string>();
  let current = asset;
  for (let depth = 0; depth < MAX_SITE_MEDIA_LINEAGE; depth++) {
    if (current.project_id !== projectId) return reject("source_foreign", "La source du média appartient à un autre projet.");
    if (visited.has(current.id)) return reject("source_cycle", "La filiation du média contient une boucle et ne peut pas être vérifiée. Choisissez un média du site avec une source vérifiable.");
    visited.add(current.id);
    let meta: unknown = {};
    try { meta = JSON.parse(current.meta || "{}"); } catch { return reject("source_missing", "Les métadonnées de filiation du média sont illisibles. Vérifiez sa source avant utilisation sur le site."); }
    if (isSocialMedia(current.role, meta)) return reject("social_pool", "Les médias du site sont distincts des publications et publicités : choisissez une création propre au site.");
    if (!current.source_asset_id) return { verified: true, code: null, issue: null };
    const parent = lookup(current.source_asset_id);
    if (!parent) return reject("source_missing", "La filiation du média est incomplète : sa source est introuvable. Choisissez un média du site avec une source vérifiable.");
    current = parent;
  }
  return reject("source_depth", "La filiation du média est trop profonde pour être vérifiée complètement. Aucun résultat non vérifié n’est compté dans les médias du site.");
}
