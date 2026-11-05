import {HttpError} from "./auth";
import {assertSafeThemeContent} from "./theme/content-security";
import {assertProjectScope} from "./project-security";
/** Accès aux projets : produit, marque, mémoire, versions du thème. */
import { recordBrandVersion } from "./brand-versions";
import { all, id, json, now, one, run, tx } from "./db";
import type { ProjectRow } from "./auth";
import { emptyProduct, emptyServiceProfile, type Brand, type BusinessType, type CatalogItem, type ProductProfile, type ProjectSettings, type ServiceProfile, type StoreType, type Strategy } from "./project-types";
import type { ThemeSpec } from "./theme/spec";
import { L, uiLang } from "./i18n-server";
import { storedText } from "./step-notes";
import { normalizeMemory, oppositeKey } from "./brain/memory-norm";
import { applyWordingDeep, loadWordingRules } from "./client-wording";

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
  /** Native business_json revision; distinct from any theme or booking revision. */
  servicesVersion: number;
};

export const DEFAULT_SETTINGS: ProjectSettings = {
  mode: "autopilot",
  timezone: "Europe/Paris",
  autopublish: { enabled: false, networks: [], requireApprovalFor: [] },
};

export function loadProject(projectId: string): Project {
  assertProjectScope(projectId);
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
    servicesVersion: Number((row as any).business_version ?? 0),
    services: (() => {
      const s = { ...emptyServiceProfile(), ...json<Partial<ServiceProfile>>((row as any).business_json, {}) };
      return { ...s, services: s.services.map((item, i) => ({ ...item, key: item.key || `legacy-${i}` })) };
    })(),
  };
}

/** Offre de services (entreprises de services). */
export function saveServices(projectId: string, services: ServiceProfile, expectedVersion?:number) {
  return tx(()=>{
    const current=loadProject(projectId),version=current.servicesVersion;
    if(expectedVersion!=null&&expectedVersion!==version)throw new HttpError(409,L("Le profil d’activité a changé. Votre brouillon est conservé ; rechargez avant de modifier.","The business profile changed. Your draft is kept; reload before editing."),"services_conflict");
    const previous=current.services.services;
    services={...services,services:services.services.map(s=>{
      const old=previous.find(x=>s.key?x.key===s.key:x.name===s.name);
      return{...old,...s,key:old?.key||s.key||id(),contentAliases:[...new Set([...(old?.contentAliases??[]),...(s.contentAliases??[]),...(old?[old.name]:[]),s.name])]};
    })};
    const result=run("UPDATE projects SET business_json=?,business_version=business_version+1,updated_at=? WHERE id=? AND business_version=?",JSON.stringify(services),now(),projectId,version);
    if(result.changes!==1)throw new HttpError(409,'Le profil a changé. Rechargez avant de modifier.','services_conflict');
    return version+1;
  });
}

export function saveProduct(projectId: string, product: ProductProfile) {
  const previous = loadProject(projectId).product;
  product = { ...product, contentAliases: [...new Set([...(previous.contentAliases ?? []), ...(product.contentAliases ?? []), previous.name, product.name].filter(Boolean))] };
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
  const previous = loadProject(projectId).catalog;
  catalog = catalog.map((c) => ({ ...c, contentAliases: [...new Set([...(previous.find((x) => x.key === c.key)?.contentAliases ?? []), ...(c.contentAliases ?? []), previous.find((x) => x.key === c.key)?.name ?? c.name, c.name])] }));
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
export type RememberInput={kind:string;key:string;value:string;status?:string;source:string;scope?:string;origin?:MemoryOrigin;normKey?:string};
export type RememberPlanRow=MemoryItem&{project_id:string;superseded_by:string|null}&Record<string,unknown>;
const SAME_MEMORY_SQL="SELECT * FROM memory WHERE project_id = ? AND kind = ? AND state = 'active' AND (norm_key = ? OR (norm_key IS NULL AND key = ?) OR (key = ? AND ? IN ('decision','correction'))) ORDER BY created_at DESC";
/** Native readonly decision shared by remember and its consent preview; facts/artifacts use their separate path. */
export function readRememberPlan(projectId:string,item:RememberInput,includeCandidates=false){
 if(item.kind==='artifact'||item.kind==='fact')throw new HttpError(400,'Les faits et artefacts ne relèvent pas de cet aperçu mémoire.');
 const scope=item.scope??'all',status=item.status??'confirmed',origin=item.origin??originOf(item.source);
 const n=item.normKey?{normKey:item.normKey,concept:null,polarity:null}:normalizeMemory(item.kind,scope,item.key,item.value);
 const args=[projectId,item.kind,n.normKey,item.key,item.key,item.kind] as const;
 const same=one<RememberPlanRow>(SAME_MEMORY_SQL+' LIMIT 1',...args);
 const reinforce=!!same&&(!['decision','correction'].includes(item.kind)||same.value===item.value);
 const opposite=reinforce?null:oppositeKey(n);
 const opposites=opposite?all<RememberPlanRow>("SELECT * FROM memory WHERE project_id = ? AND state = 'active' AND norm_key = ?",projectId,opposite):[];
 return{scope,status,origin,n,same,reinforce,replaced:[...(!reinforce&&same?[same]:[]),...opposites],candidates:includeCandidates?all<RememberPlanRow>(SAME_MEMORY_SQL,...args):[]};
}

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
  return tx(() => {
    // Même entrée active (même clé normalisée, ou ancienne ligne sans clé normalisée pour la même clé) : déduplication.
    const plan=readRememberPlan(projectId,item),same=plan.same,n=plan.n;
    if (same && plan.reinforce) {
      const ev = json<{ count?: number }>(same.evidence_json, {});
      run("UPDATE memory SET norm_key = ?, status = ?, scope = ?, evidence_json = ?, updated_at = ? WHERE id = ?", n.normKey, status, scope, JSON.stringify({ ...ev, count: (ev.count ?? 1) + 1, lastAt: now() }), now(), same.id);
      return same.id;
    }
    const mid = insertMemory(projectId, { ...item, scope, status, origin, normKey: n.normKey });
    // Décision remplacée, ou préférence contraire (« je préfère les badges » après « pas de badge ») : historique.
    const replaced = plan.replaced.map(row=>row.id);
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
  assertProjectScope(projectId);
  const p = one<{ current_theme_version_id: string | null }>("SELECT current_theme_version_id FROM projects WHERE id = ?", projectId);
  if (!p?.current_theme_version_id) return null;
  const v = one<ThemeVersion>("SELECT * FROM theme_versions WHERE id = ? AND project_id=?", p.current_theme_version_id,projectId);
  return v ? { version: { ...v, summary: storedText(v.summary, uiLang()) }, spec: JSON.parse(v.spec) } : null;
}

export function themeVersion(projectId: string, versionId: string): { version: ThemeVersion; spec: ThemeSpec } | null {
  assertProjectScope(projectId);
  const v = one<ThemeVersion>("SELECT * FROM theme_versions WHERE id = ? AND project_id = ?", versionId, projectId);
  return v ? { version: { ...v, summary: storedText(v.summary, uiLang()) }, spec: JSON.parse(v.spec) } : null;
}

/** La version de référence d'une modification n'est plus la version en cours (autre onglet, double clic, tâche). */
export class ThemeConflict extends Error { }

/**
 * Nouvelle version du thème. `expectedParent` : la modification a été préparée sur cette version ; si une autre
 * modification est passée entre-temps, rien n'est écrit (ThemeConflict) au lieu d'écraser silencieusement.
 */
/** Même normalisation et sécurité que l’enregistrement, sans version ni écriture. */
export function previewThemeVersionSpec(projectId: string, spec: ThemeSpec): ThemeSpec {
  assertProjectScope(projectId);
  const prepared = applyWordingDeep(spec, loadWordingRules(projectId));
  assertSafeThemeContent(prepared);
  return prepared;
}

export function saveThemeVersion(projectId: string, spec: ThemeSpec, summary: string, author: "ai" | "user" | "system", qc?: unknown, expectedParent?: string | null, options: { activate?: boolean } = {}): ThemeVersion {
  spec = previewThemeVersionSpec(projectId, spec);
  return tx(() => {
    const cur = one<{ current_theme_version_id: string | null }>("SELECT current_theme_version_id FROM projects WHERE id = ?", projectId);
    const gate = (qc as { gate?: { verdict?: string; checked?: boolean } } | null)?.gate;
    const activate = options.activate !== false && gate?.verdict !== "REJECTED" && !(gate?.verdict === "RETRY" && gate.checked !== false);
    if (activate && expectedParent !== undefined && (cur?.current_theme_version_id ?? null) !== expectedParent) throw new ThemeConflict("theme_conflict");
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
    if (activate) run("UPDATE projects SET current_theme_version_id = ?, updated_at = ? WHERE id = ?", vid, now(), projectId);
    return one<ThemeVersion>("SELECT * FROM theme_versions WHERE id = ?", vid)!;
  });
}

export function listThemeVersions(projectId: string) {
  assertProjectScope(projectId);
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
