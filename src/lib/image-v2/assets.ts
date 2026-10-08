/**
 * Bibliothèque et réutilisation (Image V2). Chaque image retenue est enregistrée avec son origine, sa source, son
 * brief (résumé structuré, jamais la consigne envoyée au fournisseur), son rôle, son verdict et sa note, sa licence
 * (photo de banque), sa version, son lien avec le produit et ses corrections. Une image FINAL se réutilise sans être
 * regénérée ; une image refusée ne revient jamais automatiquement (règle unique `isAutoUsable`).
 */
import { all, json, now, one, run } from "../db";
import { saveAsset, type Asset } from "../library";
import { isAutoUsable } from "../quality/usable";
import type { GateMeta } from "../quality/store";
import type { LicenseInfo, VisualBrief, VisualKind } from "./types";

/** Rôle et dossier de la bibliothèque par intention (mêmes rôles que les modules existants). */
export function roleFor(kind: VisualKind, business: "products" | "services"): { role: string; folderKey: string } {
  switch (kind) {
    case "packshot":
    case "product_image":
      return { role: "packshot-v2", folderKey: "images.packshots" };
    case "lifestyle":
    case "usage_scene":
      return { role: "scene", folderKey: "images.scenes" };
    case "ad_image":
      return { role: "ad", folderKey: "images.ads" };
    case "banner":
      return { role: "banner", folderKey: "images.banners" };
    case "social_image":
      return { role: "post-photo", folderKey: "images.social" };
    case "ambiance":
      return { role: "ambiance", folderKey: "images.scenes" };
    default:
      return business === "services" ? { role: "lifestyle", folderKey: "images.scenes" } : { role: "ambiance", folderKey: "images.scenes" };
  }
}

export type ImageV2Meta = {
  version: string;
  origin: "stock" | "generated" | "edited";
  provider: string;
  model: string | null;
  briefHash: string;
  brief: Pick<VisualBrief, "kind" | "support" | "subject" | "action" | "environment" | "artDirection" | "understanding"> & { aspect: string; variant: number | null };
  score: number | null;
  verdict: string;
  codes: string[];
  license: LicenseInfo | null;
  productRef: string | null;
  corrections: string[];
  phash: string;
  attempts: number;
};

/** Résumé du brief gardé avec l'image (structuré ; aucune consigne de génération stockée). */
export const briefSummary = (b: VisualBrief) => ({ kind: b.kind, support: b.support, subject: b.subject.slice(0, 200), action: b.action, environment: b.environment, artDirection: b.artDirection, understanding: b.understanding, aspect: b.format.aspect, variant: b.variant?.index ?? null });

export async function saveImageV2(o: {
  projectId: string;
  userId: string;
  img: Buffer;
  name: string;
  business: "products" | "services";
  brief: VisualBrief;
  meta: ImageV2Meta;
  gate: { meta: { gate: GateMeta } };
  stock?: { source: string; id: string; page: string; author: string; license: string } | null;
  recipe?: string | null;
  status: "review" | "rejected";
  slot?: string | null;
  service?: string | null;
  sourceAssetId?: string | null;
}): Promise<Asset> {
  const { role, folderKey } = roleFor(o.brief.kind, o.business);
  return saveAsset({
    projectId: o.projectId,
    userId: o.userId,
    data: o.img,
    name: o.name,
    mime: "image/jpeg",
    role,
    folderKey,
    origin: o.meta.origin === "stock" ? "import" : "generated",
    sourceAssetId: o.sourceAssetId ?? null,
    status: o.status,
    meta: {
      imageV2: o.meta,
      format: o.brief.format.aspect,
      subject: o.brief.subject.slice(0, 200),
      ...(o.recipe ? { recipe: o.recipe } : {}),
      ...(o.stock ? { stock: o.stock } : {}),
      ...(o.slot ? { slot: o.slot } : {}),
      ...(o.service ? { service: o.service } : {}),
      ...(o.business === "services" ? { business: "services" } : {}),
      ...o.gate.meta,
    },
  });
}

/** Image FINAL déjà faite pour le même brief, réutilisable automatiquement (jamais une image refusée). */
export function reusableFor(projectId: string, briefHash: string): Asset | null {
  const rows = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND deleted_at IS NULL AND status != 'rejected' AND json_extract(meta, '$.imageV2.briefHash') = ? ORDER BY created_at DESC LIMIT 5", projectId, briefHash);
  return rows.find((a) => isAutoUsable(a) && json<any>(a.meta as any, {}).gate?.verdict === "FINAL") ?? null;
}

/** Empreintes des images déjà retenues dans le projet (diversité, doublons). */
export function projectHashes(projectId: string): string[] {
  return all<{ h: string | null }>("SELECT json_extract(meta, '$.imageV2.phash') h FROM assets WHERE project_id = ? AND deleted_at IS NULL AND status != 'rejected' AND json_extract(meta, '$.imageV2.phash') IS NOT NULL", projectId)
    .map((r) => r.h!)
    .filter(Boolean);
}

/** Photos de banque déjà présentes dans le projet (jamais deux fois la même). */
export function usedStockKeys(projectId: string): Set<string> {
  return new Set(all<{ k: string }>("SELECT json_extract(meta, '$.stock.source') || ':' || json_extract(meta, '$.stock.id') k FROM assets WHERE project_id = ? AND json_extract(meta, '$.stock') IS NOT NULL", projectId).map((x) => x.k));
}

// ---------------------------------------------------------------- candidats déjà regardés

export type CandidateMemo = { verdict: string; score: number | null; codes: string[]; check_id: string | null; asset_id: string | null; phash: string | null };

export function memoOf(projectId: string, candidateKey: string, briefHash: string): CandidateMemo | null {
  const r = one<CandidateMemo & { codes_json: string }>("SELECT verdict, score, codes_json, check_id, asset_id, phash FROM image_candidates WHERE project_id = ? AND candidate_key = ? AND brief_hash IN (?, '*')", projectId, candidateKey, briefHash);
  return r ? { ...r, codes: json<string[]>(r.codes_json, []) } : null;
}

/** Candidats refusés pour ce brief (ou illisibles pour tous) : exclus de la recherche suivante. */
export function rejectedKeys(projectId: string, briefHash: string): Set<string> {
  return new Set(all<{ k: string }>("SELECT candidate_key k FROM image_candidates WHERE project_id = ? AND brief_hash IN (?, '*') AND verdict = 'REJECTED'", projectId, briefHash).map((r) => r.k));
}

export function remember(projectId: string, candidateKey: string, briefHash: string, m: Partial<CandidateMemo> & { verdict: string }) {
  run(
    "INSERT OR REPLACE INTO image_candidates (project_id, candidate_key, brief_hash, verdict, score, codes_json, check_id, asset_id, phash, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    projectId,
    candidateKey,
    briefHash,
    m.verdict,
    m.score ?? null,
    JSON.stringify(m.codes ?? []),
    m.check_id ?? null,
    m.asset_id ?? null,
    m.phash ?? null,
    now(),
  );
}
