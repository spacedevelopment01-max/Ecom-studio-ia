/** Accès aux projets : produit, marque, mémoire, versions du thème. */
import { all, id, json, now, one, run, tx } from "./db";
import type { ProjectRow } from "./auth";
import { emptyProduct, type Brand, type ProductProfile, type ProjectSettings, type Strategy } from "./project-types";
import type { ThemeSpec } from "./theme/spec";

export type Project = {
  row: ProjectRow;
  id: string;
  userId: string;
  name: string;
  status: string;
  platform: string;
  product: ProductProfile;
  brand: Brand | null;
  strategy: Strategy | null;
  settings: ProjectSettings;
  sources: { type: "photo" | "link" | "description"; ref: string; note?: string }[];
};

export const DEFAULT_SETTINGS: ProjectSettings = {
  mode: "autopilot",
  timezone: "Europe/Paris",
  autopublish: { enabled: false, networks: [], requireApprovalFor: [] },
};

export function loadProject(projectId: string): Project {
  const row = one<ProjectRow>("SELECT * FROM projects WHERE id = ?", projectId);
  if (!row) throw new Error("Projet introuvable.");
  const brand = json<Brand | null>(row.brand_json, null);
  const strategy = json<Strategy | null>(row.strategy_json, null);
  return {
    row,
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status,
    platform: row.platform,
    product: { ...emptyProduct(), ...json<Partial<ProductProfile>>(row.product_json, {}) },
    brand: brand && (brand as any).name ? brand : null,
    strategy: strategy && (strategy as any).angles ? strategy : null,
    settings: { ...DEFAULT_SETTINGS, ...json<Partial<ProjectSettings>>(row.settings_json, {}) },
    sources: json(row.sources_json, []),
  };
}

export function saveProduct(projectId: string, product: ProductProfile) {
  run("UPDATE projects SET product_json = ?, sector = ?, updated_at = ? WHERE id = ?", JSON.stringify(product), product.sector, now(), projectId);
}
export function saveBrand(projectId: string, brand: Brand) {
  run("UPDATE projects SET brand_json = ?, name = CASE WHEN ? != '' THEN ? ELSE name END, updated_at = ? WHERE id = ?", JSON.stringify(brand), brand.name, brand.name, now(), projectId);
}
export function saveStrategy(projectId: string, s: Strategy) {
  run("UPDATE projects SET strategy_json = ?, updated_at = ? WHERE id = ?", JSON.stringify(s), now(), projectId);
}
export function saveSettings(projectId: string, s: ProjectSettings) {
  run("UPDATE projects SET settings_json = ?, updated_at = ? WHERE id = ?", JSON.stringify(s), now(), projectId);
}
export function setStatus(projectId: string, status: string) {
  run("UPDATE projects SET status = ?, updated_at = ? WHERE id = ?", status, now(), projectId);
}

// ---------------------------------------------------------------- mémoire

export type MemoryItem = { id: string; kind: string; key: string; value: string; status: string; source: string; scope: string; created_at: number; updated_at: number };

export function memory(projectId: string, scope?: string): MemoryItem[] {
  return scope
    ? all<MemoryItem>("SELECT * FROM memory WHERE project_id = ? AND status != 'rejected' AND (scope = 'all' OR scope = ?) ORDER BY created_at", projectId, scope)
    : all<MemoryItem>("SELECT * FROM memory WHERE project_id = ? ORDER BY created_at", projectId);
}

/** Ajoute ou met à jour une entrée (clé unique par type). */
export function remember(projectId: string, item: { kind: string; key: string; value: string; status?: string; source: string; scope?: string }) {
  const existing = one<{ id: string }>("SELECT id FROM memory WHERE project_id = ? AND kind = ? AND key = ?", projectId, item.kind, item.key);
  if (existing) {
    run("UPDATE memory SET value = ?, status = ?, source = ?, scope = ?, updated_at = ? WHERE id = ?", item.value, item.status ?? "confirmed", item.source, item.scope ?? "all", now(), existing.id);
    return existing.id;
  }
  const mid = id();
  run(
    "INSERT INTO memory (id, project_id, kind, key, value, status, source, scope, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    mid,
    projectId,
    item.kind,
    item.key,
    item.value,
    item.status ?? "confirmed",
    item.source,
    item.scope ?? "all",
    now(),
    now(),
  );
  return mid;
}

// ---------------------------------------------------------------- thème

export type ThemeVersion = { id: string; project_id: string; number: number; spec: string; summary: string; author: string; parent_id: string | null; qc: string | null; created_at: number };

export function currentTheme(projectId: string): { version: ThemeVersion; spec: ThemeSpec } | null {
  const p = one<{ current_theme_version_id: string | null }>("SELECT current_theme_version_id FROM projects WHERE id = ?", projectId);
  if (!p?.current_theme_version_id) return null;
  const v = one<ThemeVersion>("SELECT * FROM theme_versions WHERE id = ?", p.current_theme_version_id);
  return v ? { version: v, spec: JSON.parse(v.spec) } : null;
}

export function themeVersion(projectId: string, versionId: string): { version: ThemeVersion; spec: ThemeSpec } | null {
  const v = one<ThemeVersion>("SELECT * FROM theme_versions WHERE id = ? AND project_id = ?", versionId, projectId);
  return v ? { version: v, spec: JSON.parse(v.spec) } : null;
}

export function saveThemeVersion(projectId: string, spec: ThemeSpec, summary: string, author: "ai" | "user" | "system", qc?: unknown): ThemeVersion {
  return tx(() => {
    const cur = one<{ current_theme_version_id: string | null }>("SELECT current_theme_version_id FROM projects WHERE id = ?", projectId);
    const n = (one<{ n: number }>("SELECT MAX(number) n FROM theme_versions WHERE project_id = ?", projectId)?.n ?? 0) + 1;
    const vid = id();
    run(
      "INSERT INTO theme_versions (id, project_id, number, spec, summary, author, parent_id, qc, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      vid,
      projectId,
      n,
      JSON.stringify(spec),
      summary,
      author,
      cur?.current_theme_version_id ?? null,
      qc ? JSON.stringify(qc) : null,
      now(),
    );
    run("UPDATE projects SET current_theme_version_id = ?, updated_at = ? WHERE id = ?", vid, now(), projectId);
    return one<ThemeVersion>("SELECT * FROM theme_versions WHERE id = ?", vid)!;
  });
}

export function listThemeVersions(projectId: string) {
  return all<Omit<ThemeVersion, "spec">>("SELECT id, project_id, number, summary, author, parent_id, qc, created_at FROM theme_versions WHERE project_id = ? ORDER BY number DESC LIMIT 100", projectId);
}

export function notify(userId: string, projectId: string | null, title: string, body = "", level = "info") {
  run("INSERT INTO notifications (id, user_id, project_id, level, title, body, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, projectId, level, title, body, now());
}
