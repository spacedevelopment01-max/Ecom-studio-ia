/** Accès aux projets : produit, marque, mémoire, versions du thème. */
import { recordBrandVersion } from "./brand-versions";
import { all, id, json, now, one, run, tx } from "./db";
import type { ProjectRow } from "./auth";
import { emptyProduct, emptyServiceProfile, type Brand, type BusinessType, type CatalogItem, type ProductProfile, type ProjectSettings, type ServiceProfile, type StoreType, type Strategy } from "./project-types";
import type { ThemeSpec } from "./theme/spec";
import { L, uiLang } from "./i18n-server";
import { storedText } from "./step-notes";
import { normalizeMemory, oppositeKey } from "./brain/memory-norm";

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
  storeType: StoreType;
  catalog: CatalogItem[];
  sources: { type: "photo" | "link" | "description"; ref: string; note?: string }[];
  /** Boutique de produits ou site d'entreprise de services. */
  business: BusinessType;
  services: ServiceProfile;
};

export const DEFAULT_SETTINGS: ProjectSettings = {
  mode: "autopilot",
  timezone: "Europe/Paris",
  autopublish: { enabled: false, networks: [], requireApprovalFor: [] },
};

export function loadProject(projectId: string): Project {
  const row = one<ProjectRow>("SELECT * FROM projects WHERE id = ?", projectId);
  if (!row) throw new Error(L("Projet introuvable.", "Project not found."));
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
    storeType: (["mono", "multi", "niche"].includes(row.store_type) ? row.store_type : "mono") as StoreType,
    catalog: json<CatalogItem[]>(row.catalog_json, []),
    sources: json(row.sources_json, []),
    business: ((row as any).business_type === "services" ? "services" : "products") as BusinessType,
    services: { ...emptyServiceProfile(), ...json<Partial<ServiceProfile>>((row as any).business_json, {}) },
  };
}

/** Offre de services (entreprises de services). */
export function saveServices(projectId: string, services: ServiceProfile) {
  run("UPDATE projects SET business_json = ?, updated_at = ? WHERE id = ?", JSON.stringify(services), now(), projectId);
}

export function saveProduct(projectId: string, product: ProductProfile) {
  run("UPDATE projects SET product_json = ?, sector = ?, updated_at = ? WHERE id = ?", JSON.stringify(product), product.sector, now(), projectId);
}
export function saveBrand(projectId: string, brand: Brand) {
  // Identité datée (phase 12A) : savoir avec quelle marque chaque création a été faite.
  const prev = one<{ brand_json: string | null }>("SELECT brand_json FROM projects WHERE id = ?", projectId);
  recordBrandVersion(projectId, prev?.brand_json ? (JSON.parse(prev.brand_json) as Brand) : null, brand);
  run("UPDATE projects SET brand_json = ?, name = CASE WHEN ? != '' THEN ? ELSE name END, updated_at = ? WHERE id = ?", JSON.stringify(brand), brand.name, brand.name, now(), projectId);
}
export function saveStrategy(projectId: string, s: Strategy) {
  run("UPDATE projects SET strategy_json = ?, updated_at = ? WHERE id = ?", JSON.stringify(s), now(), projectId);
}
export function saveCatalog(projectId: string, catalog: CatalogItem[], storeType?: StoreType) {
  run("UPDATE projects SET catalog_json = ?, store_type = COALESCE(?, store_type), updated_at = ? WHERE id = ?", JSON.stringify(catalog), storeType ?? null, now(), projectId);
}
export function saveSettings(projectId: string, s: ProjectSettings) {
  run("UPDATE projects SET settings_json = ?, updated_at = ? WHERE id = ?", JSON.stringify(s), now(), projectId);
}
export function setStatus(projectId: string, status: string) {
  run("UPDATE projects SET status = ?, updated_at = ? WHERE id = ?", status, now(), projectId);
}

// ---------------------------------------------------------------- mémoire

export type MemoryItem = { id: string; kind: string; key: string; value: string; status: string; source: string; scope: string; created_at: number; updated_at: number; state?: string; norm_key?: string | null; origin?: string | null; evidence_json?: string };
export type MemoryOrigin = "user" | "ai_quality" | "fatal" | "import" | "inference" | "system";

/** Entrées ACTIVES (les décisions remplacées restent en base comme historique, sans être relues comme contraintes). */
export function memory(projectId: string, scope?: string): MemoryItem[] {
  return scope
    ? all<MemoryItem>("SELECT * FROM memory WHERE project_id = ? AND status != 'rejected' AND state = 'active' AND (scope = 'all' OR scope = ?) ORDER BY created_at", projectId, scope)
    : all<MemoryItem>("SELECT * FROM memory WHERE project_id = ? AND state = 'active' ORDER BY created_at", projectId);
}

const originOf = (source: string): MemoryOrigin => (source === "user" ? "user" : source === "ai" ? "inference" : source === "local" ? "system" : "import");

/**
 * Ajoute une entrée à la mémoire du projet.
 *  - artefacts (copies de travail) et journal des faits : une ligne par clé, mise à jour sur place (inchangé) ;
 *  - décisions : une nouvelle valeur REMPLACE l'ancienne, qui reste en base (state = superseded, superseded_by) ;
 *  - préférences, refus, corrections, objectifs : dédupliqués par clé normalisée (« pas de badge » = « badge refusé ») ;
 *    une même entrée répétée renforce les preuves (evidence_json.count) ; la préférence contraire remplace l'ancienne.
 * Provenance honnête : origin (user, inference, import, system…) déduit de la source si non fourni.
 */
export function remember(projectId: string, item: { kind: string; key: string; value: string; status?: string; source: string; scope?: string; origin?: MemoryOrigin; normKey?: string }) {
  const scope = item.scope ?? "all";
  const status = item.status ?? "confirmed";
  const origin = item.origin ?? originOf(item.source);
  if (item.kind === "artifact" || item.kind === "fact") {
    const existing = one<{ id: string }>("SELECT id FROM memory WHERE project_id = ? AND kind = ? AND key = ?", projectId, item.kind, item.key);
    if (existing) {
      run("UPDATE memory SET value = ?, status = ?, source = ?, scope = ?, origin = ?, updated_at = ? WHERE id = ?", item.value, status, item.source, scope, origin, now(), existing.id);
      return existing.id;
    }
    return insertMemory(projectId, { ...item, scope, status, origin, normKey: null });
  }
  const n = item.normKey ? { normKey: item.normKey, concept: null, polarity: null } : normalizeMemory(item.kind, scope, item.key, item.value);
  return tx(() => {
    // Même entrée active (même clé normalisée, ou ancienne ligne sans clé normalisée pour la même clé) : déduplication.
    const same = one<{ id: string; value: string; evidence_json: string }>(
      "SELECT id, value, evidence_json FROM memory WHERE project_id = ? AND kind = ? AND state = 'active' AND (norm_key = ? OR (norm_key IS NULL AND key = ?)) ORDER BY created_at DESC LIMIT 1",
      projectId,
      item.kind,
      n.normKey,
      item.key,
    );
    if (same && (item.kind !== "decision" || same.value === item.value)) {
      const ev = json<{ count?: number }>(same.evidence_json, {});
      run("UPDATE memory SET norm_key = ?, status = ?, scope = ?, evidence_json = ?, updated_at = ? WHERE id = ?", n.normKey, status, scope, JSON.stringify({ ...ev, count: (ev.count ?? 1) + 1, lastAt: now() }), now(), same.id);
      return same.id;
    }
    const mid = insertMemory(projectId, { ...item, scope, status, origin, normKey: n.normKey });
    // Décision remplacée, ou préférence contraire (« je préfère les badges » après « pas de badge ») : historique.
    const opposite = oppositeKey(n);
    const replaced = [...(same ? [same.id] : []), ...(opposite ? all<{ id: string }>("SELECT id FROM memory WHERE project_id = ? AND state = 'active' AND norm_key = ?", projectId, opposite).map((r) => r.id) : [])];
    for (const old of replaced) run("UPDATE memory SET state = 'superseded', superseded_by = ?, updated_at = ? WHERE id = ?", mid, now(), old);
    return mid;
  });
}

function insertMemory(projectId: string, m: { kind: string; key: string; value: string; status: string; source: string; scope: string; origin: string; normKey: string | null }) {
  const mid = id();
  run(
    "INSERT INTO memory (id, project_id, kind, key, value, status, source, scope, norm_key, state, origin, evidence_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    mid,
    projectId,
    m.kind,
    m.key,
    m.value,
    m.status,
    m.source,
    m.scope,
    m.normKey,
    "active",
    m.origin,
    JSON.stringify({ count: 1, lastAt: now() }),
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
  return v ? { version: { ...v, summary: storedText(v.summary, uiLang()) }, spec: JSON.parse(v.spec) } : null;
}

export function themeVersion(projectId: string, versionId: string): { version: ThemeVersion; spec: ThemeSpec } | null {
  const v = one<ThemeVersion>("SELECT * FROM theme_versions WHERE id = ? AND project_id = ?", versionId, projectId);
  return v ? { version: { ...v, summary: storedText(v.summary, uiLang()) }, spec: JSON.parse(v.spec) } : null;
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
  // Résumés enregistrés en deux langues (ou texte ancien) : rendus dans la langue de l'interface.
  return all<Omit<ThemeVersion, "spec">>("SELECT id, project_id, number, summary, author, parent_id, qc, created_at FROM theme_versions WHERE project_id = ? ORDER BY number DESC LIMIT 100", projectId).map((v) => ({ ...v, summary: storedText(v.summary, uiLang()) }));
}

export function notify(userId: string, projectId: string | null, title: string, body = "", level = "info") {
  run("INSERT INTO notifications (id, user_id, project_id, level, title, body, created_at) VALUES (?,?,?,?,?,?,?)", id(), userId, projectId, level, title, body, now());
}

/** Échappe une saisie pour l'insérer telle quelle dans une expression régulière. */
export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Repère les mentions « [À compléter : … <fait> …] » d'un fait que le client vient de confirmer. Le libellé est
 * saisi par le client : il est échappé (un libellé « Poids(g) » ne provoque plus d'erreur 500).
 */
export function factPlaceholderRegex(label: string, factKey: string): RegExp {
  return new RegExp(`\\[(?:À compléter :|To complete:) [^\\]]*(${escapeRegExp(label.split(" ")[0])}|${escapeRegExp(factKey)})[^\\]]*\\]`, "gi");
}
