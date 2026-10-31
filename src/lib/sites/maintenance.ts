/**
 * Fiabilité de l'hébergement des sites (#232, lot B) : intégrité des publications, nettoyage des publications
 * interrompues, purge bornée des anciennes versions, quota de stockage, mesure du trafic, sauvegarde vérifiable et
 * diagnostic. Rien ici ne supprime une publication en ligne, ni une demande, ni un média du client.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { all, db, logError, now, one, run, tx } from "../db";
import { L } from "../i18n-server";
import { mailConfigured } from "../mail";
import { ensureSiteTables, livePublication, publicationDir, sitesRoot, addresses, type Publication } from "./store";

/** Publications gardées avec leurs fichiers (en plus de celle en ligne) ; au-delà, seules leurs fiches restent. */
export const KEEP_PUBLICATIONS = 10;
/** Stockage des publications d'un site (fichiers figés), inclus dans tous les forfaits. */
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
/** Repère d'usage raisonnable du trafic mensuel (signalé, jamais coupé ni facturé). */
export const TRAFFIC_NOTICE_BYTES = 50 * 1024 * 1024 * 1024;
const TMP_MAX_AGE_MS = 3600_000;

let ready = false;
export function ensureMaintenanceTables() {
  ensureSiteTables();
  if (ready) return;
  run("CREATE TABLE IF NOT EXISTS site_traffic (project_id TEXT NOT NULL, day TEXT NOT NULL, requests INTEGER NOT NULL, bytes INTEGER NOT NULL, PRIMARY KEY (project_id, day))");
  const cols = new Set(all<{ name: string }>("PRAGMA table_info(site_publications)").map((c) => c.name));
  if (!cols.has("purged_at")) run("ALTER TABLE site_publications ADD COLUMN purged_at INTEGER");
  ready = true;
}

const sha = (data: Buffer | string) => crypto.createHash("sha256").update(data).digest("hex");
type Manifest = { pages: string[]; missing?: string[]; files: Record<string, { sha256: string; bytes: number; type: string }> };

export type Integrity = { ok: boolean; files: number; bytes: number; missing: string[]; corrupt: string[]; manifest: boolean };
/** Chaque fichier d'une publication est présent et identique à son empreinte (dossier racine des sites au choix). */
export function verifyPublication(projectId: string, publicationId: string, root = sitesRoot()): Integrity {
  const dir = path.join(root, projectId, publicationId);
  let m: Manifest;
  try { m = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")); } catch { return { ok: false, files: 0, bytes: 0, missing: [], corrupt: [], manifest: false }; }
  const missing: string[] = [], corrupt: string[] = [];
  let bytes = 0;
  for (const [rel, e] of Object.entries(m.files)) {
    const file = path.join(dir, "files", rel);
    if (!fs.existsSync(file)) { missing.push(rel); continue; }
    const data = fs.readFileSync(file);
    bytes += data.length;
    if (sha(data) !== e.sha256) corrupt.push(rel);
  }
  return { ok: !missing.length && !corrupt.length, files: Object.keys(m.files).length, bytes, missing, corrupt, manifest: true };
}

/** Publications interrompues (processus arrêté pendant l'écriture) : dossiers temporaires de plus d'une heure supprimés. */
export function cleanupInterrupted(maxAgeMs = TMP_MAX_AGE_MS): number {
  const root = sitesRoot();
  let removed = 0;
  if (!fs.existsSync(root)) return 0;
  for (const project of fs.readdirSync(root)) {
    const pdir = path.join(root, project);
    if (!fs.statSync(pdir).isDirectory()) continue;
    for (const name of fs.readdirSync(pdir)) {
      if (!name.startsWith(".tmp-")) continue;
      const full = path.join(pdir, name);
      if (Date.now() - fs.statSync(full).mtimeMs < maxAgeMs) continue;
      fs.rmSync(full, { recursive: true, force: true });
      removed++;
    }
  }
  return removed;
}

export function storageUsed(projectId: string): number {
  ensureMaintenanceTables();
  return one<{ b: number | null }>("SELECT SUM(bytes) b FROM site_publications WHERE project_id = ? AND purged_at IS NULL", projectId)?.b ?? 0;
}

/**
 * Purge des anciennes publications : on garde celle en ligne et les KEEP plus récentes ; au-delà, ou si le stockage
 * dépasse la limite, les fichiers des plus anciennes sont supprimés. Leur fiche et l'historique restent. Une publication
 * purgée ne peut plus être remise en ligne, et l'écran le dit.
 */
export function purgeOldPublications(projectId: string, keep = KEEP_PUBLICATIONS, limit = STORAGE_LIMIT_BYTES): string[] {
  ensureMaintenanceTables();
  const live = livePublication(projectId)?.id;
  const kept = all<Pick<Publication, "id" | "bytes" | "number">>("SELECT id, bytes, number FROM site_publications WHERE project_id = ? AND purged_at IS NULL ORDER BY number DESC", projectId);
  const purge = kept.filter((p, i) => i >= keep && p.id !== live).map((p) => p.id);
  let total = kept.filter((p) => !purge.includes(p.id)).reduce((s, p) => s + p.bytes, 0);
  // Stockage dépassé : les plus anciennes d'abord, jamais celle en ligne ni la plus récente.
  for (const p of [...kept].reverse()) {
    if (total <= limit) break;
    if (p.id === live || p.id === kept[0]?.id || purge.includes(p.id)) continue;
    purge.push(p.id); total -= p.bytes;
  }
  for (const id of purge) {
    tx(() => run("UPDATE site_publications SET purged_at = ? WHERE id = ? AND project_id = ?", now(), id, projectId));
    fs.rmSync(publicationDir(projectId, id), { recursive: true, force: true });
  }
  return purge;
}

// ---------------------------------------------------------------- trafic (compté en mémoire, écrit par lots)
const pending = new Map<string, { requests: number; bytes: number }>();
let flushTimer: NodeJS.Timeout | null = null;
const today = () => new Date().toISOString().slice(0, 10);
export function recordTraffic(projectId: string, bytes: number) {
  const key = `${projectId}|${today()}`;
  const cur = pending.get(key) ?? { requests: 0, bytes: 0 };
  cur.requests++; cur.bytes += bytes;
  pending.set(key, cur);
  if (!flushTimer) { flushTimer = setTimeout(flushTraffic, 30_000); flushTimer.unref?.(); }
}
export function flushTraffic() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (!pending.size) return;
  try {
    ensureMaintenanceTables();
    const batch = [...pending.entries()];
    pending.clear();
    tx(() => { for (const [key, v] of batch) { const [pid, day] = key.split("|"); run("INSERT INTO site_traffic (project_id, day, requests, bytes) VALUES (?,?,?,?) ON CONFLICT(project_id, day) DO UPDATE SET requests = requests + excluded.requests, bytes = bytes + excluded.bytes", pid, day, v.requests, v.bytes); } });
  } catch (e) { logError("sites:traffic", e); }
}
export function traffic(projectId: string, days = 30) {
  ensureMaintenanceTables();
  flushTraffic();
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const rows = all<{ day: string; requests: number; bytes: number }>("SELECT day, requests, bytes FROM site_traffic WHERE project_id = ? AND day >= ? ORDER BY day", projectId, since);
  return { days, requests: rows.reduce((s, r) => s + r.requests, 0), bytes: rows.reduce((s, r) => s + r.bytes, 0), byDay: rows };
}

/** Diagnostic lisible d'un site : intégrité de la version en ligne, adresses, stockage, trafic, e-mails des demandes. */
export function siteDiagnostics(projectId: string) {
  ensureMaintenanceTables();
  const live = livePublication(projectId);
  const integrity = live ? verifyPublication(projectId, live.id) : null;
  const t = traffic(projectId);
  const outbox = (() => { try { return all<{ status: string; n: number }>("SELECT status, COUNT(*) n FROM site_request_outbox WHERE project_id = ? GROUP BY status", projectId); } catch { return []; } })();
  const used = storageUsed(projectId);
  const mb = (b: number) => Math.round(b / 1048576);
  const active = addresses(projectId).filter((a) => a.status === "active" || a.status === "verified").map((a) => a.hostname).join(", ");
  const failed = outbox.find((o) => o.status === "failed")?.n ?? 0;
  const checks: { key: string; ok: boolean; detail: string }[] = [
    { key: "live", ok: !!live, detail: live ? L(`Publication ${live.number} en ligne`, `Publication ${live.number} live`) : L("Aucune publication en ligne", "No live publication") },
    { key: "integrity", ok: !live || !!integrity?.ok, detail: !live ? "—" : integrity!.ok ? L(`${integrity!.files} fichiers intacts (empreintes vérifiées)`, `${integrity!.files} intact files (fingerprints checked)`) : L(`${integrity!.missing.length} fichier(s) manquant(s), ${integrity!.corrupt.length} altéré(s)${integrity!.manifest ? "" : ", manifeste illisible"} : republiez ou remettez en ligne une version intacte`, `${integrity!.missing.length} missing file(s), ${integrity!.corrupt.length} altered${integrity!.manifest ? "" : ", unreadable manifest"}: publish again or put an intact version back online`) },
    { key: "address", ok: addresses(projectId).some((a) => a.kind === "studio" && a.status === "active"), detail: active || L("Aucune adresse active", "No active address") },
    { key: "storage", ok: used <= STORAGE_LIMIT_BYTES, detail: L(`${mb(used)} Mo sur ${mb(STORAGE_LIMIT_BYTES)} Mo`, `${mb(used)} MB of ${mb(STORAGE_LIMIT_BYTES)} MB`) },
    { key: "traffic", ok: t.bytes <= TRAFFIC_NOTICE_BYTES, detail: L(`${t.requests} requêtes, ${mb(t.bytes)} Mo sur 30 jours`, `${t.requests} requests, ${mb(t.bytes)} MB over 30 days`) },
    { key: "smtp", ok: mailConfigured(), detail: mailConfigured() ? L("Envoi des e-mails configuré", "Email sending configured") : L("Envoi des e-mails non configuré : les demandes restent dans le studio", "Email sending not configured: requests stay in the studio") },
    { key: "notifications", ok: failed === 0, detail: failed ? L(`${failed} e-mail(s) de demande non envoyé(s) : voir « Demandes reçues »`, `${failed} request email(s) not sent: see “Requests received”`) : L("Aucun e-mail de demande en échec", "No failed request email") },
  ];
  return { checkedAt: now(), ok: checks.every((c) => c.ok), checks, integrity, storage: { used, limit: STORAGE_LIMIT_BYTES }, traffic: t };
}

// ---------------------------------------------------------------- sauvegarde et vérification
export type BackupReport = { dir: string; at: number; database: string; databaseSha: string; publications: number; files: number; bytes: number };

/**
 * Sauvegarde cohérente : copie en ligne de la base (API de sauvegarde de SQLite, sans arrêter le studio) et copie des
 * publications figées (dossiers immuables, publications interrompues exclues), puis rapport signé par empreintes.
 * La sauvegarde complète d'une instance doit aussi inclure les médias des clients (DATA_DIR entier) : voir la doc.
 */
export async function backupSites(dest: string): Promise<BackupReport> {
  ensureMaintenanceTables();
  fs.mkdirSync(dest, { recursive: true });
  const dbFile = path.join(dest, "studio.db");
  await db().backup(dbFile);
  const root = sitesRoot();
  let publications = 0, files = 0, bytes = 0;
  if (fs.existsSync(root)) for (const project of fs.readdirSync(root)) {
    const pdir = path.join(root, project);
    if (!fs.statSync(pdir).isDirectory()) continue;
    for (const name of fs.readdirSync(pdir)) {
      if (name.startsWith(".tmp-")) continue;
      const target = path.join(dest, "sites", project, name);
      if (!fs.existsSync(target)) fs.cpSync(path.join(pdir, name), target, { recursive: true });
      const v = verifyPublication(project, name, path.join(dest, "sites"));
      publications++; files += v.files; bytes += v.bytes;
    }
  }
  const report: BackupReport = { dir: dest, at: now(), database: "studio.db", databaseSha: sha(fs.readFileSync(dbFile)), publications, files, bytes };
  fs.writeFileSync(path.join(dest, "sauvegarde.json"), JSON.stringify(report, null, 1));
  return report;
}

/**
 * Vérifie une sauvegarde sans la restaurer : base lisible et identique à son empreinte, chaque publication non purgée
 * présente et intacte, chaque site en ligne pointant vers une publication présente.
 */
export function verifyBackup(dest: string) {
  const problems: string[] = [];
  let report: BackupReport | null = null;
  try { report = JSON.parse(fs.readFileSync(path.join(dest, "sauvegarde.json"), "utf8")); } catch { problems.push("Rapport de sauvegarde absent ou illisible."); }
  const dbFile = path.join(dest, "studio.db");
  if (!fs.existsSync(dbFile)) return { ok: false, problems: [...problems, "Base absente."], checked: 0 };
  if (report && sha(fs.readFileSync(dbFile)) !== report.databaseSha) problems.push("Base altérée depuis la sauvegarde.");
  const copy = new Database(dbFile, { readonly: true, fileMustExist: true });
  let checked = 0;
  try {
    const hasPurged = copy.prepare("PRAGMA table_info(site_publications)").all().some((c) => (c as { name: string }).name === "purged_at");
    const pubs = copy.prepare(`SELECT id, project_id FROM site_publications${hasPurged ? " WHERE purged_at IS NULL" : ""}`).all() as { id: string; project_id: string }[];
    for (const p of pubs) {
      const v = verifyPublication(p.project_id, p.id, path.join(dest, "sites"));
      checked++;
      if (!v.ok) problems.push(`Publication ${p.id} (projet ${p.project_id}) : ${v.manifest ? `${v.missing.length} manquant(s), ${v.corrupt.length} altéré(s)` : "manifeste absent"}.`);
    }
    for (const l of copy.prepare("SELECT project_id, publication_id FROM site_live").all() as { project_id: string; publication_id: string }[]) {
      if (!pubs.some((p) => p.id === l.publication_id)) problems.push(`Site ${l.project_id} : sa publication en ligne n'est pas dans la sauvegarde.`);
    }
  } finally { copy.close(); }
  return { ok: problems.length === 0, problems, checked };
}
