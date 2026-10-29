/**
 * Hébergement des sites de services (#232) : publications figées, pointeur du site en ligne, journal, adresses et
 * demandes reçues. Tables créées à la première utilisation, sans toucher au schéma commun du studio.
 */
import path from "node:path";
import { DATA_DIR, all, id, now, one, run, tx } from "../db";
import { HttpError } from "../auth";
import { L } from "../i18n-server";
import { sitesDomain } from "./host-match";

let ready = false;
export function ensureSiteTables() {
  if (ready) return;
  run(`CREATE TABLE IF NOT EXISTS site_publications (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id TEXT NOT NULL, number INTEGER NOT NULL,
    theme_version_id TEXT NOT NULL, spec_hash TEXT NOT NULL, theme_fingerprint TEXT NOT NULL, code_commit TEXT NOT NULL,
    status TEXT NOT NULL, pages INTEGER NOT NULL, bytes INTEGER NOT NULL, manifest_sha TEXT NOT NULL, origin TEXT NOT NULL,
    created_at INTEGER NOT NULL)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS site_publications_number ON site_publications(project_id, number)");
  run(`CREATE TABLE IF NOT EXISTS site_live (
    project_id TEXT PRIMARY KEY, publication_id TEXT NOT NULL, updated_at INTEGER NOT NULL)`);
  run(`CREATE TABLE IF NOT EXISTS site_live_history (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, publication_id TEXT, action TEXT NOT NULL, user_id TEXT NOT NULL, at INTEGER NOT NULL)`);
  run(`CREATE TABLE IF NOT EXISTS site_addresses (
    hostname TEXT PRIMARY KEY, project_id TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL,
    verify_token TEXT, verified_at INTEGER, checked_at INTEGER, check_error TEXT, created_at INTEGER NOT NULL)`);
  run("CREATE INDEX IF NOT EXISTS site_addresses_project ON site_addresses(project_id)");
  run(`CREATE TABLE IF NOT EXISTS site_requests (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, publication_id TEXT NOT NULL, hostname TEXT NOT NULL,
    page TEXT NOT NULL, fields TEXT NOT NULL, email TEXT, ip_hash TEXT, created_at INTEGER NOT NULL, read_at INTEGER,
    notified TEXT NOT NULL)`);
  run("CREATE INDEX IF NOT EXISTS site_requests_project ON site_requests(project_id, created_at)");
  // Lot A : type (contact ou devis) et traitement (« traitée » par le professionnel) ; colonnes ajoutées aux bases existantes.
  const cols = new Set(all<{ name: string }>("PRAGMA table_info(site_requests)").map((c) => c.name));
  if (!cols.has("kind")) run("ALTER TABLE site_requests ADD COLUMN kind TEXT");
  if (!cols.has("handled_at")) run("ALTER TABLE site_requests ADD COLUMN handled_at INTEGER");
  ready = true;
}

export type Publication = {
  id: string; project_id: string; user_id: string; number: number; theme_version_id: string; spec_hash: string;
  theme_fingerprint: string; code_commit: string; status: "ready"; pages: number; bytes: number; manifest_sha: string;
  origin: string; created_at: number;
  /** Fichiers supprimés par la purge des anciennes versions (lot B) ; la fiche reste. */
  purged_at?: number | null;
};
export type SiteAddress = {
  hostname: string; project_id: string; kind: "studio" | "custom"; status: "active" | "pending_dns" | "verified" | "disabled";
  verify_token: string | null; verified_at: number | null; checked_at: number | null; check_error: string | null; created_at: number;
};

/** Dossier des publications d'un projet : `DATA_DIR/sites/<projet>/<publication>/`. */
export const sitesRoot = () => path.join(process.env.DATA_DIR || DATA_DIR, "sites");
export const publicationDir = (projectId: string, publicationId: string) => path.join(sitesRoot(), projectId, publicationId);

export function publications(projectId: string): Publication[] {
  ensureSiteTables();
  return all<Publication>("SELECT * FROM site_publications WHERE project_id = ? ORDER BY number DESC", projectId);
}
export function publication(projectId: string, publicationId: string): Publication | undefined {
  ensureSiteTables();
  return one<Publication>("SELECT * FROM site_publications WHERE id = ? AND project_id = ?", publicationId, projectId);
}
export function livePublication(projectId: string): Publication | null {
  ensureSiteTables();
  return one<Publication>("SELECT p.* FROM site_live l JOIN site_publications p ON p.id = l.publication_id WHERE l.project_id = ?", projectId) ?? null;
}
export function history(projectId: string) {
  ensureSiteTables();
  return all<{ id: string; publication_id: string | null; action: string; at: number }>("SELECT id, publication_id, action, at FROM site_live_history WHERE project_id = ? ORDER BY at DESC, rowid DESC LIMIT 50", projectId);
}

/** Mise en ligne, restauration ou retrait : une seule transaction (le site sert l'ancienne ou la nouvelle version, jamais un mélange). */
export function setLive(projectId: string, publicationId: string | null, action: "publish" | "restore" | "unpublish", userId: string) {
  ensureSiteTables();
  tx(() => {
    if (publicationId) run("INSERT INTO site_live (project_id, publication_id, updated_at) VALUES (?,?,?) ON CONFLICT(project_id) DO UPDATE SET publication_id = excluded.publication_id, updated_at = excluded.updated_at", projectId, publicationId, now());
    else run("DELETE FROM site_live WHERE project_id = ?", projectId);
    run("INSERT INTO site_live_history (id, project_id, publication_id, action, user_id, at) VALUES (?,?,?,?,?,?)", id(), projectId, publicationId, action, userId, now());
  });
}

export function addresses(projectId: string): SiteAddress[] {
  ensureSiteTables();
  return all<SiteAddress>("SELECT * FROM site_addresses WHERE project_id = ? ORDER BY kind DESC, created_at", projectId);
}
export function addressOf(hostname: string): SiteAddress | undefined {
  ensureSiteTables();
  return one<SiteAddress>("SELECT * FROM site_addresses WHERE hostname = ?", hostname);
}

/** Mots réservés : jamais une adresse de site (confusion avec le studio ou un service technique). */
const RESERVED = new Set(["www", "studio", "admin", "api", "app", "mail", "smtp", "ftp", "cdn", "static", "assets", "sites", "site", "support", "aide", "help", "status", "test", "demo", "preview", "apercu", "login", "connexion", "compte", "account", "billing", "facturation", "dns", "ns1", "ns2", "mx", "webmail", "blog"]);

/** Adresse de site lisible, issue d'un nom : « Atelier Rive & Fils » → « atelier-rive-fils ». */
export function slugify(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " et ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
}
export function validSlug(slug: string): string | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug) || slug.includes("--")) return L("Adresse : 3 à 40 caractères, lettres minuscules, chiffres et tirets.", "Address: 3 to 40 characters, lowercase letters, digits and hyphens.");
  if (RESERVED.has(slug)) return L("Cette adresse est réservée.", "This address is reserved.");
  return null;
}

/** Adresse du studio du projet (« <adresse>.<SITES_DOMAIN> »), créée à la première publication si besoin. */
export function studioAddress(projectId: string): SiteAddress | null {
  ensureSiteTables();
  return one<SiteAddress>("SELECT * FROM site_addresses WHERE project_id = ? AND kind = 'studio'", projectId) ?? null;
}

/** Choisit (ou change) l'adresse du site sur le domaine des sites. Refus clair si elle est déjà prise. */
export function setStudioAddress(projectId: string, slug: string): SiteAddress {
  ensureSiteTables();
  const domain = sitesDomain();
  if (!domain) throw new HttpError(409, L("L'hébergement des sites n'est pas configuré sur ce studio (SITES_DOMAIN).", "Site hosting isn't configured on this studio (SITES_DOMAIN)."), "sites_not_configured");
  const invalid = validSlug(slug);
  if (invalid) throw new HttpError(400, invalid, "invalid_slug");
  const hostname = `${slug}.${domain}`;
  return tx(() => {
    const taken = one<{ project_id: string }>("SELECT project_id FROM site_addresses WHERE hostname = ?", hostname);
    if (taken && taken.project_id !== projectId) throw new HttpError(409, L("Cette adresse est déjà utilisée par un autre site.", "This address is already used by another site."), "address_taken");
    run("DELETE FROM site_addresses WHERE project_id = ? AND kind = 'studio' AND hostname != ?", projectId, hostname);
    if (!taken) run("INSERT INTO site_addresses (hostname, project_id, kind, status, created_at) VALUES (?,?,?,?,?)", hostname, projectId, "studio", "active", now());
    return one<SiteAddress>("SELECT * FROM site_addresses WHERE hostname = ?", hostname)!;
  });
}

/** Première adresse libre dérivée du nom (« atelier-rive », puis « atelier-rive-2 »…). */
export function defaultStudioAddress(projectId: string, name: string): SiteAddress {
  const existing = studioAddress(projectId);
  if (existing) return existing;
  const domain = sitesDomain();
  let base = slugify(name);
  if (base.length < 3 || validSlug(base)) base = `site-${projectId.slice(0, 8)}`;
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base.slice(0, 36)}-${i}`;
    if (!addressOf(`${slug}.${domain}`)) return setStudioAddress(projectId, slug);
  }
  return setStudioAddress(projectId, `site-${id().slice(0, 10)}`);
}
