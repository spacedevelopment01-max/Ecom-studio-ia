/**
 * Base de données SQLite (WAL) partagée par le serveur web et le worker.
 * Un seul fichier, aucune installation : `npm run setup` suffit.
 * Les écritures concurrentes (web + worker) sont sérialisées par SQLite ;
 * le verrouillage des tâches utilise des transactions IMMEDIATE.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { customAlphabet } from "nanoid";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const g = globalThis as unknown as { __ecomDb?: Database.Database };

export const id = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  platform TEXT NOT NULL DEFAULT 'shopify',
  sector TEXT,
  product_json TEXT NOT NULL DEFAULT '{}',
  brand_json TEXT NOT NULL DEFAULT '{}',
  strategy_json TEXT NOT NULL DEFAULT '{}',
  settings_json TEXT NOT NULL DEFAULT '{}',
  sources_json TEXT NOT NULL DEFAULT '[]',
  current_theme_version_id TEXT,
  cover_asset_id TEXT,
  store_url TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS projects_user ON projects(user_id);

-- Mémoire du projet : faits, décisions, corrections, préférences, objectifs.
CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,           -- fact | decision | correction | preference | goal | unknown
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  status TEXT NOT NULL,         -- confirmed | inferred | unknown | rejected
  source TEXT NOT NULL,         -- user | photo | link | ai | description
  scope TEXT NOT NULL DEFAULT 'all', -- all | shop | images | video | social | brand
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS memory_project ON memory(project_id);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  type TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued', -- queued | running | done | failed | cancelled | blocked
  progress REAL NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT '',
  result TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  run_at INTEGER NOT NULL,
  locked_by TEXT,
  locked_until INTEGER,
  idempotency_key TEXT UNIQUE,
  parent_id TEXT,
  depends_on TEXT NOT NULL DEFAULT '[]',
  checkpoint TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS jobs_pick ON jobs(status, run_at);
CREATE INDEX IF NOT EXISTS jobs_project ON jobs(project_id, created_at);
CREATE INDEX IF NOT EXISTS jobs_parent ON jobs(parent_id);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_key TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS folders_project ON folders(project_id, parent_id);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,           -- image | video | audio | logo | document | theme | text | archive
  role TEXT,                    -- original | cutout | packshot | detail | scene | banner | social | ad | logo | video | export ...
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  duration REAL,
  storage_key TEXT NOT NULL,
  thumb_key TEXT,
  origin TEXT NOT NULL,         -- upload | generated | import | export | link
  meta TEXT NOT NULL DEFAULT '{}',
  source_asset_id TEXT,         -- média dont celui-ci dérive (l'original est préservé)
  version_of TEXT,              -- première version de la lignée
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ready', -- ready | review | approved | rejected
  starred INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS assets_project ON assets(project_id, folder_id);

CREATE TABLE IF NOT EXISTS asset_usages (
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,    -- theme_section | post | video | campaign | brand
  target_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (asset_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS theme_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  spec TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL,          -- ai | user | system
  parent_id TEXT,
  qc TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS theme_versions_project ON theme_versions(project_id, number);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  thread TEXT NOT NULL,          -- shop | brand | media | social
  role TEXT NOT NULL,            -- user | assistant | system
  content TEXT NOT NULL,
  attachments TEXT NOT NULL DEFAULT '[]',
  selection TEXT,
  theme_version_id TEXT,
  job_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_project ON chat_messages(project_id, thread, created_at);

CREATE TABLE IF NOT EXISTS user_prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sector TEXT NOT NULL,
  category TEXT NOT NULL,
  target TEXT NOT NULL,
  body TEXT NOT NULL,
  based_on TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS prompt_favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, prompt_id)
);

-- Connexions OAuth (réseaux sociaux, Canva, Shopify) — jetons chiffrés.
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,        -- instagram | facebook | tiktok | youtube | pinterest | canva | shopify
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  scopes TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active', -- active | expired | revoked | error
  status_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (user_id, provider, external_id)
);
CREATE TABLE IF NOT EXISTS project_connections (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, connection_id)
);
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  project_id TEXT,
  verifier TEXT,
  redirect TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS content_plans (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  params TEXT NOT NULL,
  strategy TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  job_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_id TEXT,
  campaign_id TEXT,
  connection_id TEXT,
  network TEXT NOT NULL,         -- instagram | facebook | tiktok | youtube | pinterest
  format TEXT NOT NULL,          -- image | carousel | video | reel | story | short | pin | text
  status TEXT NOT NULL DEFAULT 'draft', -- draft | generating | review | scheduled | publishing | published | failed | cancelled
  scheduled_at INTEGER,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  title TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT NOT NULL DEFAULT '',
  link TEXT,
  angle TEXT,
  media TEXT NOT NULL DEFAULT '[]',
  brief TEXT NOT NULL DEFAULT '{}',
  approved_at INTEGER,
  approved_by TEXT,
  auto_approved INTEGER NOT NULL DEFAULT 0,
  publish_job_id TEXT,
  publish_key TEXT UNIQUE,
  remote_id TEXT,
  remote_url TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_project ON posts(project_id, scheduled_at);
CREATE INDEX IF NOT EXISTS posts_due ON posts(status, scheduled_at);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  networks TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  brief TEXT NOT NULL DEFAULT '{}',
  plan TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Facturation : abonnements, portefeuille IA, recharges.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'none', -- none | trial | active | past_due | canceled | manual
  stores INTEGER NOT NULL DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start INTEGER,
  current_period_end INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  monthly_allowance INTEGER NOT NULL DEFAULT 0, -- micro-euros
  monthly_used INTEGER NOT NULL DEFAULT 0,
  topup_balance INTEGER NOT NULL DEFAULT 0,
  topup_period_added INTEGER NOT NULL DEFAULT 0,
  topup_period_used INTEGER NOT NULL DEFAULT 0,
  alert80_sent_at INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,          -- allowance | topup | usage | adjustment | renewal
  bucket TEXT NOT NULL,        -- monthly | topup
  amount INTEGER NOT NULL,     -- micro-euros (signé)
  ref TEXT,
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_ref ON ledger(type, ref) WHERE ref IS NOT NULL;
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,          -- subscription | topup
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  stripe_id TEXT UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  job_id TEXT,
  task TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  unit TEXT NOT NULL,           -- tokens | image | video_second | request | cpu_second
  input_units REAL NOT NULL DEFAULT 0,
  output_units REAL NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,      -- coût fournisseur, micro-euros
  billed INTEGER NOT NULL DEFAULT 0,    -- débité de l'enveloppe, micro-euros
  estimated INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS usage_user ON usage_events(user_id, created_at);

-- Administration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  secret INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS error_log (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  user_id TEXT,
  project_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS worker_heartbeat (
  id TEXT PRIMARY KEY,
  beat_at INTEGER NOT NULL,
  info TEXT
);

-- Comptabilité de l'administration (aide au suivi) : dépenses saisies et charges récurrentes. Montants en centimes.
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,                 -- AAAA-MM-JJ
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  supplier TEXT NOT NULL DEFAULT '',
  amount_ht INTEGER NOT NULL,
  vat_rate INTEGER NOT NULL DEFAULT 2000, -- points de base (2000 = 20 %)
  vat INTEGER NOT NULL DEFAULT 0,
  amount_ttc INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'carte', -- carte | virement | prelevement | especes | autre
  status TEXT NOT NULL DEFAULT 'paid',          -- paid | to_pay
  paid_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  receipt_key TEXT,
  receipt_name TEXT,
  receipt_mime TEXT,
  recurring_id TEXT,
  period_key TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS expenses_date ON expenses(date);
CREATE UNIQUE INDEX IF NOT EXISTS expenses_recurring_period ON expenses(recurring_id, period_key) WHERE recurring_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS recurring_charges (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  supplier TEXT NOT NULL DEFAULT '',
  amount_ht INTEGER NOT NULL,
  vat_rate INTEGER NOT NULL DEFAULT 2000,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- monthly | quarterly | yearly
  day INTEGER NOT NULL DEFAULT 1,             -- 1 à 28
  start_date TEXT NOT NULL,
  end_date TEXT,
  payment_method TEXT NOT NULL DEFAULT 'prelevement',
  auto_paid INTEGER NOT NULL DEFAULT 1,       -- 1 : échéance passée = payée ; 0 : toujours « à payer »
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

/** Colonnes ajoutées après la première version (ajout seulement, jamais de suppression). */
const ADDED_COLUMNS: [table: string, column: string, ddl: string][] = [
  ["projects", "store_type", "TEXT NOT NULL DEFAULT 'mono'"],
  ["projects", "catalog_json", "TEXT NOT NULL DEFAULT '[]'"],
  ["projects", "business_type", "TEXT NOT NULL DEFAULT 'products'"],
  ["projects", "business_json", "TEXT NOT NULL DEFAULT '{}'"],
];

function migrate(db: Database.Database) {
  for (const [table, column, ddl] of ADDED_COLUMNS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

function open(): Database.Database {
  const file = process.env.DATABASE_FILE || path.join(DATA_DIR, "studio.db");
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 8000");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

export function db(): Database.Database {
  if (!g.__ecomDb) g.__ecomDb = open();
  return g.__ecomDb;
}

export const now = () => Date.now();

export function one<T = any>(sql: string, ...params: unknown[]): T | undefined {
  return db().prepare(sql).get(...params) as T | undefined;
}
export function all<T = any>(sql: string, ...params: unknown[]): T[] {
  return db().prepare(sql).all(...params) as T[];
}
export function run(sql: string, ...params: unknown[]) {
  return db().prepare(sql).run(...params);
}
export function tx<T>(fn: () => T): T {
  return db().transaction(fn).immediate();
}

export function json<T = any>(v: string | null | undefined, fallback: T): T {
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export function logError(scope: string, err: unknown, ctx: { userId?: string; projectId?: string; details?: unknown } = {}) {
  const message = err instanceof Error ? err.message : String(err);
  try {
    run(
      "INSERT INTO error_log (id, scope, message, details, user_id, project_id, created_at) VALUES (?,?,?,?,?,?,?)",
      id(),
      scope,
      message.slice(0, 2000),
      JSON.stringify({ stack: err instanceof Error ? err.stack?.slice(0, 4000) : undefined, ...(ctx.details ? { ctx: ctx.details } : {}) }),
      ctx.userId ?? null,
      ctx.projectId ?? null,
      now(),
    );
  } catch {
    /* le journal ne doit jamais faire échouer l'appelant */
  }
}
