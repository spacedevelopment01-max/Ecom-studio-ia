/**
 * Lot 1 (issue #163, action 03) — sauvegarde cohérente, empreintes, vérification et restauration des données.
 *
 * Ce module ne fait AUCUN appel réseau, ne lance ni le site ni le worker et n'écrit jamais dans le dossier source :
 *  - la base est copiée par l'API de sauvegarde en ligne de SQLite (instantané cohérent même pendant que le site et
 *    le worker écrivent, sans les arrêter ni les bloquer) ;
 *  - les médias (stockage) sont copiés ensuite, puis chaque fichier référencé par l'instantané est contrôlé ;
 *  - le manifeste liste comptages, empreintes SHA-256 et NOMS des réglages secrets, jamais leurs valeurs.
 * La clé APP_SECRET (ou `data/.app-secret` en développement) n'est jamais copiée : elle se garde à part.
 */
import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const MANIFEST = "manifeste.json";
export const DB_NAME = "studio.db";
/** Dossiers de DATA_DIR recopiés (données) ; les autres sont régénérables ou temporaires. */
export const DATA_SUBDIRS = ["video-receipts", "preview-contact-tests"] as const;
/** Non recopiés, avec la raison (écrite dans le manifeste). */
export const SKIPPED = {
  "cache": "régénérable (photos et polices mises en cache)",
  "tmp": "fichiers de travail temporaires",
  "theme-demos": "démonstrations régénérables (`npm run demos:themes`)",
  "backups": "anciennes sauvegardes automatiques (à garder à part si besoin)",
  ".app-secret": "secret de développement : à garder à part, jamais dans une sauvegarde",
} as const;
/** Variables d'environnement utiles au studio : seule leur présence est notée, jamais leur valeur. */
export const ENV_NAMES = ["APP_SECRET", "APP_URL", "ADMIN_EMAIL", "DATA_DIR", "DATABASE_FILE", "STORAGE_DIR", "AI_GATEWAY_PROVIDERS", "SOCIAL_PUBLISH_DISABLED", "WORKER_CONCURRENCY"] as const;

export type FileEntry = { path: string; size: number; sha256: string };
export type TableInfo = { count: number; sha256: string };
export type Fingerprint = { schemaSha256: string; tables: Record<string, TableInfo> };
export type Manifest = {
  format: "ecom-studio-ia/sauvegarde-lot1";
  version: 1;
  createdAt: string;
  codeCommit: string | null;
  database: { file: string; size: number; sha256: string; integrity: string; journalMode: string; billingV2Migrated: boolean; fingerprint: Fingerprint };
  storage: { files: FileEntry[]; referenced: number; missing: { assetId: string; column: "storage_key" | "thumb_key" }[] };
  dataDirs: Record<string, FileEntry[]>;
  skipped: Record<string, string>;
  settings: { key: string; secret: boolean }[];
  env: Record<string, boolean>;
};

export const sha256File = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** Refuse un dossier qui n'est pas vide (aucune sauvegarde ni restauration ne remplace des fichiers existants). */
export function assertEmptyTarget(dir: string, what: string) {
  if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) throw new Error(`${what} : le dossier ${dir} n'est pas vide, rien n'est remplacé.`);
}
const inside = (child: string, parent: string) => {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

/** Ouvre une base en lecture seule, sans migration (aucune écriture dans la source). */
export const openReadonly = (file: string) => new Database(file, { readonly: true, fileMustExist: true });

const quote = (n: string) => `"${n.replace(/"/g, '""')}"`;
export const userTables = (d: Database.Database) =>
  (d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[]).map((r) => r.name);
export const columnsOf = (d: Database.Database, t: string) => (d.prepare(`PRAGMA table_info(${quote(t)})`).all() as { name: string; pk: number }[]);

/**
 * Empreinte d'une table : lignes triées par clé primaire (ou toutes les colonnes), limitées à `only` si fourni.
 * Deux bases dont les empreintes sont égales contiennent exactement les mêmes valeurs dans ces colonnes.
 */
export function tableFingerprint(d: Database.Database, t: string, only?: string[]): TableInfo {
  const cols = columnsOf(d, t);
  const names = (only ?? cols.map((c) => c.name)).filter((n) => cols.some((c) => c.name === n));
  const pk = cols.filter((c) => c.pk).sort((a, b) => a.pk - b.pk).map((c) => c.name);
  const order = (pk.length ? pk : names).map(quote).join(", ");
  const h = crypto.createHash("sha256");
  let count = 0;
  const sel = names.length ? names.map(quote).join(", ") : "1";
  for (const row of d.prepare(`SELECT ${sel} FROM ${quote(t)} ORDER BY ${order || "rowid"}`).raw().iterate() as Iterable<unknown[]>) {
    count++;
    h.update(JSON.stringify(row.map((v) => (Buffer.isBuffer(v) ? `b64:${v.toString("base64")}` : v))) + "\n");
  }
  return { count, sha256: h.digest("hex") };
}

/** Empreinte de chaque ligne (colonnes `only`) : sert à prouver qu'aucune ligne d'origine n'a disparu ni changé. */
export function rowHashes(d: Database.Database, t: string, only: string[]): Map<string, number> {
  const names = only.filter((n) => columnsOf(d, t).some((c) => c.name === n));
  const seen = new Map<string, number>();
  for (const row of d.prepare(`SELECT ${names.map(quote).join(", ") || "1"} FROM ${quote(t)}`).raw().iterate() as Iterable<unknown[]>) {
    const h = sha(JSON.stringify(row.map((v) => (Buffer.isBuffer(v) ? `b64:${v.toString("base64")}` : v))));
    seen.set(h, (seen.get(h) ?? 0) + 1);
  }
  return seen;
}

export function fingerprint(d: Database.Database): Fingerprint {
  const schema = (d.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all() as { type: string; name: string; sql: string | null }[])
    .map((r) => `${r.type}|${r.name}|${r.sql ?? ""}`).join("\n");
  const tables: Record<string, TableInfo> = {};
  for (const t of userTables(d)) tables[t] = tableFingerprint(d, t);
  return { schemaSha256: sha(schema), tables };
}

function listFiles(root: string): FileEntry[] {
  const out: FileEntry[] = [];
  if (!fs.existsSync(root)) return out;
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      // Fichier en cours d'écriture (`putFile` écrit dans « .<pid>.tmp » puis renomme) : jamais recopié.
      else if (e.isFile() && !/\.\d+\.tmp$/.test(e.name)) out.push({ path: path.relative(root, p).split(path.sep).join("/"), size: fs.statSync(p).size, sha256: sha256File(p) });
    }
  };
  walk(root);
  return out;
}

function copyFiles(src: string, dest: string, files: FileEntry[]): FileEntry[] {
  const copied: FileEntry[] = [];
  for (const f of files) {
    const from = path.join(src, f.path);
    if (!fs.existsSync(from)) continue; // supprimé entre l'inventaire et la copie : signalé plus loin s'il est référencé
    const to = path.join(dest, f.path);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    const digest = sha256File(to);
    copied.push({ path: f.path, size: fs.statSync(to).size, sha256: digest });
  }
  return copied;
}

const gitCommit = () => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

export type BackupOptions = { dataDir: string; dest: string; databaseFile?: string; storageDir?: string; env?: NodeJS.ProcessEnv };

/**
 * Sauvegarde cohérente : instantané SQLite (API de sauvegarde en ligne), puis médias, puis contrôle des références.
 * Le studio peut continuer de tourner : rien n'est verrouillé au-delà des courtes lectures de SQLite.
 */
export async function backup(o: BackupOptions): Promise<Manifest> {
  const dataDir = path.resolve(o.dataDir);
  const dbFile = path.resolve(o.databaseFile ?? path.join(dataDir, DB_NAME));
  const storageDir = path.resolve(o.storageDir ?? path.join(dataDir, "storage"));
  const dest = path.resolve(o.dest);
  if (!fs.existsSync(dbFile)) throw new Error(`Base introuvable : ${dbFile}`);
  if (inside(dest, dataDir) || inside(dest, storageDir)) throw new Error("La sauvegarde doit être rangée hors du dossier de données du studio.");
  assertEmptyTarget(dest, "Sauvegarde");
  fs.mkdirSync(dest, { recursive: true });

  // 1. Base : instantané transactionnel. better-sqlite3 utilise sqlite3_backup ; les écritures concurrentes du site
  // et du worker (mode WAL) continuent, la copie reflète un état validé unique.
  const src = new Database(dbFile, { fileMustExist: true });
  try {
    src.pragma("busy_timeout = 8000");
    await src.backup(path.join(dest, DB_NAME));
  } finally {
    src.close();
  }
  const snap = openReadonly(path.join(dest, DB_NAME));
  let manifest: Manifest;
  try {
    const integrity = String(snap.pragma("integrity_check", { simple: true }));
    if (integrity !== "ok") throw new Error(`Instantané corrompu : ${integrity}`);
    const has = (t: string) => userTables(snap).includes(t);
    const refs = has("assets") ? (snap.prepare("SELECT id, storage_key, thumb_key FROM assets").all() as { id: string; storage_key: string; thumb_key: string | null }[]) : [];

    // 2. Médias : inventaire puis copie (fichiers écrits une fois, renommés atomiquement par `putFile`).
    const storageFiles = copyFiles(storageDir, path.join(dest, "storage"), listFiles(storageDir));
    const present = new Set(storageFiles.map((f) => f.path));
    const missing: Manifest["storage"]["missing"] = [];
    let referenced = 0;
    for (const r of refs) {
      for (const column of ["storage_key", "thumb_key"] as const) {
        const key = r[column];
        if (!key) continue;
        referenced++;
        if (!present.has(key.split(path.sep).join("/"))) missing.push({ assetId: r.id, column });
      }
    }
    const dataDirs: Record<string, FileEntry[]> = {};
    for (const sub of DATA_SUBDIRS) dataDirs[sub] = copyFiles(path.join(dataDir, sub), path.join(dest, "data", sub), listFiles(path.join(dataDir, sub)));

    const env = o.env ?? process.env;
    manifest = {
      format: "ecom-studio-ia/sauvegarde-lot1",
      version: 1,
      createdAt: new Date().toISOString(),
      codeCommit: gitCommit(),
      database: {
        file: DB_NAME,
        size: fs.statSync(path.join(dest, DB_NAME)).size,
        sha256: sha256File(path.join(dest, DB_NAME)),
        integrity,
        journalMode: String(snap.pragma("journal_mode", { simple: true })),
        billingV2Migrated: has("settings") && !!snap.prepare("SELECT 1 FROM settings WHERE key = 'billing.v2.migrated'").get(),
        fingerprint: fingerprint(snap),
      },
      storage: { files: storageFiles, referenced, missing },
      dataDirs,
      skipped: { ...SKIPPED },
      settings: has("settings") ? (snap.prepare("SELECT key, secret FROM settings ORDER BY key").all() as { key: string; secret: number }[]).map((s) => ({ key: s.key, secret: !!s.secret })) : [],
      env: Object.fromEntries(ENV_NAMES.map((n) => [n, !!env[n]])),
    };
  } finally {
    snap.close();
  }
  fs.writeFileSync(path.join(dest, MANIFEST), JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(path.join(dest, `${MANIFEST}.sha256`), `${sha256File(path.join(dest, MANIFEST))}  ${MANIFEST}\n`);
  return manifest;
}

export type Check = { name: string; ok: boolean; detail?: string };

/** Vérifie une sauvegarde (ou une restauration) contre son manifeste : fichiers, empreintes, base et comptages. */
export function verify(dir: string, layout: "backup" | "restored" = "backup"): { manifest: Manifest; checks: Check[] } {
  const root = path.resolve(dir);
  const manifestFile = layout === "backup" ? path.join(root, MANIFEST) : path.join(root, "restauration", MANIFEST);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as Manifest;
  const checks: Check[] = [];
  if (layout === "backup") {
    const expected = fs.readFileSync(path.join(root, `${MANIFEST}.sha256`), "utf8").split(/\s+/)[0];
    checks.push({ name: "manifeste intact", ok: expected === sha256File(manifestFile) });
  }
  const dbFile = path.join(root, manifest.database.file);
  const storageRoot = path.join(root, "storage");
  const dataRoot = layout === "backup" ? path.join(root, "data") : root;
  checks.push({ name: "empreinte de la base", ok: fs.existsSync(dbFile) && sha256File(dbFile) === manifest.database.sha256 });
  const d = openReadonly(dbFile);
  try {
    checks.push({ name: "intégrité SQLite", ok: d.pragma("integrity_check", { simple: true }) === "ok" });
    checks.push({ name: "clés étrangères", ok: (d.pragma("foreign_key_check") as unknown[]).length === 0 });
    const fp = fingerprint(d);
    checks.push({ name: "schéma identique", ok: fp.schemaSha256 === manifest.database.fingerprint.schemaSha256 });
    const diff = Object.entries(manifest.database.fingerprint.tables).filter(([t, v]) => fp.tables[t]?.count !== v.count || fp.tables[t]?.sha256 !== v.sha256).map(([t]) => t);
    checks.push({ name: `tables identiques (${Object.keys(fp.tables).length})`, ok: diff.length === 0, detail: diff.length ? diff.join(", ") : undefined });
  } finally {
    d.close();
  }
  const bad = manifest.storage.files.filter((f) => {
    const p = path.join(storageRoot, f.path);
    return !fs.existsSync(p) || sha256File(p) !== f.sha256;
  });
  checks.push({ name: `médias (${manifest.storage.files.length} fichiers)`, ok: bad.length === 0, detail: bad.length ? `${bad.length} fichier(s) absent(s) ou modifié(s)` : undefined });
  for (const [sub, files] of Object.entries(manifest.dataDirs)) {
    const badSub = files.filter((f) => {
      const p = path.join(dataRoot, sub, f.path);
      return !fs.existsSync(p) || sha256File(p) !== f.sha256;
    });
    checks.push({ name: `${sub} (${files.length} fichiers)`, ok: badSub.length === 0 });
  }
  checks.push({ name: "références médias de l'instantané", ok: manifest.storage.missing.length === 0, detail: manifest.storage.missing.length ? `${manifest.storage.missing.length} fichier(s) référencé(s) absent(s) à la sauvegarde` : undefined });
  return { manifest, checks };
}

/**
 * Restauration dans un NOUVEAU dossier de données (jamais par-dessus un studio existant). La sauvegarde est vérifiée
 * avant la copie, la copie est vérifiée après. Aucune migration n'est lancée : elle a lieu au premier démarrage du
 * code choisi (ou par `essai-migration.ts`).
 */
export function restore(from: string, to: string, opts: { forbid?: string[] } = {}): Check[] {
  const src = path.resolve(from);
  const dest = path.resolve(to);
  for (const f of opts.forbid ?? []) if (f && inside(dest, f)) throw new Error(`Restauration refusée dans ${dest} : dossier de données en service.`);
  const before = verify(src, "backup");
  const ko = before.checks.filter((c) => !c.ok && c.name !== "références médias de l'instantané");
  if (ko.length) throw new Error(`Sauvegarde invalide, rien n'est restauré : ${ko.map((c) => c.name).join(", ")}`);
  assertEmptyTarget(dest, "Restauration");
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(src, DB_NAME), path.join(dest, DB_NAME), fs.constants.COPYFILE_EXCL);
  copyFiles(path.join(src, "storage"), path.join(dest, "storage"), before.manifest.storage.files);
  for (const [sub, files] of Object.entries(before.manifest.dataDirs)) copyFiles(path.join(src, "data", sub), path.join(dest, sub), files);
  fs.mkdirSync(path.join(dest, "restauration"));
  fs.copyFileSync(path.join(src, MANIFEST), path.join(dest, "restauration", MANIFEST));
  return verify(dest, "restored").checks;
}

/**
 * Neutralise une COPIE de recette avant de l'ouvrir dans un studio : plus aucune tâche ne peut partir (pause), aucun
 * calendrier ne publie, et les secrets (Stripe, SMTP, fournisseurs IA, jetons des réseaux sociaux) sont retirés de
 * la copie. Refusé sur le dossier de données en service. Ne s'emploie jamais sur une restauration de reprise réelle.
 */
export function neutralize(dataDir: string, opts: { forbid?: string[] } = {}) {
  const dir = path.resolve(dataDir);
  for (const f of opts.forbid ?? []) if (f && inside(dir, f)) throw new Error("Neutralisation refusée : dossier de données en service.");
  const d = new Database(path.join(dir, DB_NAME), { fileMustExist: true });
  try {
    const tables = new Set(userTables(d));
    const r: Record<string, number> = {};
    d.transaction(() => {
      if (tables.has("jobs")) r.jobsEnPause = d.prepare("UPDATE jobs SET status='paused', locked_by=NULL, locked_until=NULL, message='Copie de recette : tâche suspendue' WHERE status IN ('queued','running','blocked')").run().changes;
      if (tables.has("content_plans") && columnsOf(d, "content_plans").some((c) => c.name === "paused")) r.calendriersEnPause = d.prepare("UPDATE content_plans SET paused=1 WHERE paused=0").run().changes;
      if (tables.has("settings")) r.secretsRetires = d.prepare("DELETE FROM settings WHERE secret=1").run().changes;
      if (tables.has("connections")) r.connexionsCoupees = d.prepare("UPDATE connections SET access_token=NULL, refresh_token=NULL, status='revoked', status_message='Copie de recette' WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL OR status != 'revoked'").run().changes;
      if (tables.has("settings")) d.prepare("INSERT OR REPLACE INTO settings (key, value, secret, updated_at) VALUES ('recette.neutralisee', ?, 0, ?)").run(JSON.stringify(r), Date.now());
    })();
    return r;
  } finally {
    d.close();
  }
}

/** Environnement minimal pour ouvrir une copie de recette : aucune clé héritée, publication et passerelle IA coupées. */
export function recetteEnv(dataDir: string, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "/tmp",
    DATA_DIR: path.resolve(dataDir),
    SOCIAL_PUBLISH_DISABLED: "1",
    STOCK_OFFLINE: "1",
    // Secret différent de celui du studio : les valeurs chiffrées de la copie restent illisibles.
    APP_SECRET: crypto.randomBytes(32).toString("base64url"),
    ...extra,
  };
}
