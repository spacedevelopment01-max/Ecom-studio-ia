/**
 * Versions de l'identité de marque (phase 12A) : chaque état de la marque (nom, palette, typographies, logo) est daté.
 * On sait ainsi avec quelle identité chaque création (thème, publicité, publication, export) a été faite, et quoi
 * proposer de mettre à jour après un changement — sans jamais rien modifier en silence.
 * Module sans dépendance au projet (appelé par saveBrand).
 */
import crypto from "node:crypto";
import { all, id, json, now, one, run } from "./db";

export type BrandSnapshot = { name: string; palette: Record<string, string>; fonts: { heading: string; body: string } | null; logoAssetId: string | null };

type BrandLike = { name?: string; palette?: Record<string, string>; fonts?: { heading: string; body: string }; logo?: { assetId?: string | null } } | null | undefined;

export function snapshotOf(b: BrandLike): BrandSnapshot | null {
  if (!b) return null;
  return { name: b.name ?? "", palette: { ...(b.palette ?? {}) }, fonts: b.fonts ? { heading: b.fonts.heading, body: b.fonts.body } : null, logoAssetId: b.logo?.assetId ?? null };
}

export const brandFingerprint = (s: BrandSnapshot | null) => (s ? crypto.createHash("sha256").update(JSON.stringify([s.name, Object.entries(s.palette).sort(), s.fonts, s.logoAssetId])).digest("hex").slice(0, 16) : "none");

/**
 * Enregistre l'état de la marque s'il a changé. Premier enregistrement d'un projet existant : l'état PRÉCÉDENT est
 * daté de 0 (identité avec laquelle les créations antérieures ont été faites).
 */
export function recordBrandVersion(projectId: string, previous: BrandLike, next: BrandLike, at = now()) {
  const nextSnap = snapshotOf(next);
  if (!nextSnap) return;
  const last = one<{ fingerprint: string }>("SELECT fingerprint FROM brand_versions WHERE project_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", projectId);
  if (!last) {
    const prevSnap = snapshotOf(previous);
    if (prevSnap && brandFingerprint(prevSnap) !== brandFingerprint(nextSnap)) run("INSERT INTO brand_versions (id, project_id, fingerprint, snapshot_json, created_at) VALUES (?,?,?,?,?)", id(), projectId, brandFingerprint(prevSnap), JSON.stringify(prevSnap), 0);
  }
  const fp = brandFingerprint(nextSnap);
  if (last?.fingerprint === fp) return;
  run("INSERT INTO brand_versions (id, project_id, fingerprint, snapshot_json, created_at) VALUES (?,?,?,?,?)", id(), projectId, fp, JSON.stringify(nextSnap), at);
}

/** Identité en vigueur à un instant (la plus récente enregistrée avant ; à défaut la plus ancienne connue). */
export function brandAt(projectId: string, t: number): { fingerprint: string; snapshot: BrandSnapshot; at: number } | null {
  const r = one<{ fingerprint: string; snapshot_json: string; created_at: number }>("SELECT fingerprint, snapshot_json, created_at FROM brand_versions WHERE project_id = ? AND created_at <= ? ORDER BY created_at DESC, rowid DESC LIMIT 1", projectId, t)
    ?? one<{ fingerprint: string; snapshot_json: string; created_at: number }>("SELECT fingerprint, snapshot_json, created_at FROM brand_versions WHERE project_id = ? ORDER BY created_at ASC, rowid ASC LIMIT 1", projectId);
  return r ? { fingerprint: r.fingerprint, snapshot: json<BrandSnapshot>(r.snapshot_json, null as never), at: r.created_at } : null;
}

export const brandVersions = (projectId: string) => all<{ fingerprint: string; snapshot_json: string; created_at: number }>("SELECT fingerprint, snapshot_json, created_at FROM brand_versions WHERE project_id = ? ORDER BY created_at", projectId).map((r) => ({ fingerprint: r.fingerprint, snapshot: json<BrandSnapshot>(r.snapshot_json, null as never), at: r.created_at }));
