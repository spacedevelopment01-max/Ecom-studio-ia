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
import { redact, redactDeep } from "./redact";

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
CREATE TABLE IF NOT EXISTS pending_registrations (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  language TEXT NOT NULL,
  next_path TEXT NOT NULL,
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
CREATE TABLE IF NOT EXISTS project_link_versions (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_policy',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS asset_cache_entries (
  cache_key TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL
);

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
  origin TEXT NOT NULL,         -- upload | generated | import | export | link | site
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

-- Lot A #209 : échanges uniquement ; les données d'un projet restent dans sa préparation et sa mémoire.
-- Un brouillon avant création ne crée pas de projet et ne consomme aucun abonnement.
CREATE TABLE IF NOT EXISTS agent_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 0,
  state_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS agent_one_draft ON agent_conversations(user_id) WHERE project_id IS NULL;
CREATE TABLE IF NOT EXISTS agent_conversation_turns (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  request_json TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(conversation_id, revision),
  UNIQUE(conversation_id, request_id)
);

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
-- Un abonnement est un « compte de facturation » (clé user_id, historique) : celui d'un ancien compte porte l'id
-- de l'utilisateur, un abonnement souscrit par projet porte son propre id. owner_user_id est le compte client ;
-- project_id le projet unique qu'il finance, rattaché une seule fois et pour toujours (voir billing-migration).
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'none', -- none | trial | active | past_due | canceled | manual
  stores INTEGER NOT NULL DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start INTEGER,
  current_period_end INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY,
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
-- Réservations du coût maximal des appels d'IA payants (voir billing.ts) : held → settled | released | uncertain → reconciled.
CREATE TABLE IF NOT EXISTS ai_reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  res_monthly INTEGER NOT NULL DEFAULT 0,
  res_topup INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  task TEXT,
  provider TEXT,
  model TEXT,
  job_id TEXT,
  project_id TEXT,
  actual INTEGER,
  debit_monthly INTEGER NOT NULL DEFAULT 0,
  debit_topup INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at INTEGER NOT NULL,
  settled_at INTEGER
);
CREATE INDEX IF NOT EXISTS ai_reservations_held ON ai_reservations(user_id, status, created_at);
CREATE TABLE IF NOT EXISTS quota_usage (
  user_id TEXT NOT NULL,
  period_start INTEGER NOT NULL,
  key TEXT NOT NULL,           -- visuals | aiVideos | ugc | blog
  included INTEGER NOT NULL,
  rollover INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period_start, key)
);
CREATE TABLE IF NOT EXISTS pack_balances (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,           -- visuals | aiVideos | ugc | languages
  balance INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, key)
);
CREATE TABLE IF NOT EXISTS pack_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pack TEXT NOT NULL,
  ref TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS quota_events (
  ref TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,          -- subscription | pack | topup (ancien)
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

-- Réalité physique des appels aux fournisseurs (une ligne par appel réellement envoyé, reprises comprises).
-- usage_events reste la facturation (dédoublonnée) ; cette table sert à l'observabilité. Jamais de prompt, d'image
-- ni de clé : seulement la clé du prompt système et son empreinte.
CREATE TABLE IF NOT EXISTS ai_calls (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  project_id TEXT,
  job_id TEXT,
  task TEXT NOT NULL,
  step TEXT,                         -- étape du job (ctx.step), imbriquée « a/b »
  candidate_id TEXT,                 -- candidat évalué (logo, image…) quand l'appel le concerne
  attempt INTEGER NOT NULL DEFAULT 0, -- tentative du candidat (0 = premier essai, 1 = reprise…)
  call_try INTEGER NOT NULL DEFAULT 0, -- essai technique de l'appel (réponse coupée, JSON réparé)
  provider TEXT NOT NULL,
  requested_model TEXT NOT NULL,
  served_model TEXT,
  unit TEXT NOT NULL,                -- tokens | image | video_second | request
  input_tokens INTEGER NOT NULL DEFAULT 0,       -- jetons d'entrée non mis en cache
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 0,  -- images, secondes de vidéo
  latency_ms INTEGER,
  http_attempts INTEGER,             -- requêtes HTTP réellement envoyées (relances du SDK comprises), si connu
  stop_reason TEXT,
  effort TEXT,
  cost INTEGER NOT NULL DEFAULT 0,   -- coût fournisseur, micro-euros
  estimated INTEGER NOT NULL DEFAULT 0,
  usage_key TEXT,
  usage_event_id TEXT,               -- événement de facturation (NULL si déjà compté : reprise)
  billing_dedup INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,              -- ok | error | refused | timeout
  error_kind TEXT,
  prompt_key TEXT,
  prompt_hash TEXT,
  quality_check_id TEXT
);
CREATE INDEX IF NOT EXISTS ai_calls_project ON ai_calls(project_id, created_at);
CREATE INDEX IF NOT EXISTS ai_calls_job ON ai_calls(job_id);
CREATE INDEX IF NOT EXISTS ai_calls_candidate ON ai_calls(candidate_id);

-- Verdicts de la barrière de qualité (un par contrôle d'un candidat). previous_check_id relie une reprise à
-- l'essai précédent : gain de qualité = score − score précédent (calculé, non stocké).
CREATE TABLE IF NOT EXISTS quality_checks (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  project_id TEXT,
  job_id TEXT,
  step TEXT,
  deliverable TEXT NOT NULL,
  candidate_id TEXT,
  asset_id TEXT,
  attempt INTEGER NOT NULL DEFAULT 0,
  checker TEXT NOT NULL,             -- ai | local | metadata | human | none
  checked INTEGER NOT NULL,          -- 0 : contrôle en panne ou impossible
  confidence REAL,                   -- confiance accordée au contrôle (0-1)
  score REAL,
  criteria_json TEXT NOT NULL DEFAULT '{}',
  blocking_json TEXT NOT NULL DEFAULT '[]',
  fatal_json TEXT NOT NULL DEFAULT '[]',
  feedback TEXT NOT NULL DEFAULT '',  -- défauts relevés (consigne d'une reprise)
  verdict TEXT NOT NULL,             -- FINAL | RETRY | PROVISIONAL | REJECTED
  fatal INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL,              -- regenerate | recheck | none
  reason TEXT NOT NULL DEFAULT '',
  policy_version TEXT NOT NULL,
  previous_check_id TEXT
);
CREATE INDEX IF NOT EXISTS quality_checks_project ON quality_checks(project_id, created_at);
CREATE INDEX IF NOT EXISTS quality_checks_candidate ON quality_checks(candidate_id);
CREATE INDEX IF NOT EXISTS quality_checks_asset ON quality_checks(asset_id);

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

-- Articles de blog écrits par l'IA (forfaits Vendre et Dominer).
CREATE TABLE IF NOT EXISTS blog_articles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  cover_asset_id TEXT,
  language TEXT NOT NULL DEFAULT 'fr',
  status TEXT NOT NULL DEFAULT 'draft', -- draft | ready | published
  published_url TEXT,
  platform_ref TEXT,                    -- identifiant de l'article sur la plateforme (Shopify : gid)
  qc_notes TEXT NOT NULL DEFAULT '[]',  -- points du contrôle qualité restant à relire
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS blog_articles_project ON blog_articles(project_id, deleted_at, updated_at);

-- Sessions de paiement ouvertes (forfaits V2) : une actualisation ou un double clic renvoie la même session au lieu
-- d'en créer une seconde ; une session expirée ou abandonnée ne donne aucun droit.
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id TEXT PRIMARY KEY,           -- identifiant Stripe de la session
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,            -- subscription | reactivate | topup | appointment
  plan TEXT,
  billing TEXT,
  project_id TEXT,
  ref TEXT,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | complete | expired
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS checkout_sessions_user ON checkout_sessions(user_id, kind, status, created_at);

-- Rendez-vous téléphoniques (60 min) : créneaux réels ouverts par l'équipe, un rendez-vous par créneau (index unique
-- partiel : deux réservations simultanées ne peuvent pas prendre le même créneau), heure offerte DOMINER une seule
-- fois par compte client (index unique partiel sur les réservations gratuites non annulées).
CREATE TABLE IF NOT EXISTS call_slots (
  id TEXT PRIMARY KEY,
  starts_at INTEGER NOT NULL UNIQUE,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | blocked
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS call_bookings (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  free INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,          -- pending_payment | confirmed | done | canceled
  topic TEXT,
  phone TEXT,
  stripe_session TEXT,
  payment_intent TEXT,
  refunded INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  canceled_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS call_bookings_slot ON call_bookings(slot_id) WHERE status != 'canceled';
CREATE UNIQUE INDEX IF NOT EXISTS call_bookings_free ON call_bookings(user_id) WHERE free = 1 AND status != 'canceled';
CREATE INDEX IF NOT EXISTS call_bookings_user ON call_bookings(user_id, status);

-- Webhook Stripe : journal des événements traités (un événement relivré n'est jamais appliqué deux fois).
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created INTEGER NOT NULL DEFAULT 0, -- horodatage Stripe de l'événement (secondes)
  processed_at INTEGER NOT NULL
);
-- Verrou reprenable des webhooks : aucune donnée de carte, aucun secret ni message fournisseur.
CREATE TABLE IF NOT EXISTS stripe_event_claims (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  lease_until INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
-- L'identité et les paramètres d'une ouverture Checkout survivent à une coupure réseau.
CREATE TABLE IF NOT EXISTS checkout_intents (
  id TEXT PRIMARY KEY,
  signature TEXT NOT NULL,
  user_id TEXT NOT NULL,
  params_json TEXT NOT NULL,
  lease_until INTEGER NOT NULL DEFAULT 0,
  session_id TEXT,
  created_at INTEGER NOT NULL,
  closed_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS checkout_intents_open ON checkout_intents(signature) WHERE closed_at IS NULL;
CREATE TABLE IF NOT EXISTS billing_mutations (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  user_id TEXT NOT NULL,
  path TEXT NOT NULL,
  params_json TEXT NOT NULL,
  response_json TEXT,
  outcome TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  applied_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS billing_mutations_pending ON billing_mutations(scope) WHERE applied_at IS NULL;
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  job_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  request_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, request_key)
);
CREATE INDEX IF NOT EXISTS support_tickets_owner ON support_tickets(user_id, updated_at);
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  staff INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  request_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(ticket_id, user_id, request_key)
);
-- Arrêt des anciens abonnements Stripe (changement de forfait) : réessayé par le worker jusqu'à confirmation.
CREATE TABLE IF NOT EXISTS stripe_cancellations (
  subscription_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_at INTEGER NOT NULL,
  last_error TEXT,
  done_at INTEGER,
  created_at INTEGER NOT NULL
);
-- Limitation de débit persistante (inscriptions, connexions) : partagée par les processus, survit aux redémarrages.
CREATE TABLE IF NOT EXISTS rate_events (
  key TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_events_key ON rate_events(key, at);
-- Réinitialisation du mot de passe : jeton à usage unique (seule son empreinte signée est gardée), valable 1 heure.
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_by TEXT,                    -- 'self' (e-mail) ou identifiant de l'administrateur
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS password_resets_user ON password_resets(user_id);
-- Confirmation de l'accès administrateur (lien signé envoyé à ADMIN_EMAIL, voir admin-claim.ts).
CREATE TABLE IF NOT EXISTS admin_claims (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

-- Plans de tâches (phase 3A) : étapes, dépendances, statuts et routage choisi ; une reprise repart du plan
-- enregistré (rien de fait n'est refait). Aucun prompt ni contenu généré n'y est stocké.
CREATE TABLE IF NOT EXISTS task_plans (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  request_key TEXT NOT NULL,
  intents_json TEXT NOT NULL DEFAULT '[]',
  steps_json TEXT NOT NULL DEFAULT '[]',
  warnings_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,              -- active | done | stopped
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS task_plans_project ON task_plans(project_id, updated_at);

-- Studio Workflow V2 (phase 12A) : une demande globale du client, son devis, son autorisation (montant accepté,
-- plafond), le plan de l'orchestrateur qu'elle suit et les tâches qui l'exécutent. Aucun prompt n'y est stocké.
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  request TEXT NOT NULL,
  intents_json TEXT NOT NULL DEFAULT '[]',
  params_json TEXT NOT NULL DEFAULT '{}',
  estimate_json TEXT NOT NULL DEFAULT '{}',
  approved_micro INTEGER,
  cap_micro INTEGER,
  status TEXT NOT NULL,              -- draft | needs_clarification | queued | running | done | failed | cancelled
  clarification TEXT,
  plan_id TEXT,
  pipeline_job_id TEXT,
  job_id TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS workflows_project ON workflows(project_id, created_at);

-- Identité de marque (phase 12A) : chaque état de la marque (nom, palette, typographies, logo) est daté, pour savoir
-- avec quelle identité chaque création a été faite et proposer une mise à jour contrôlée après un changement.
CREATE TABLE IF NOT EXISTS brand_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS brand_versions_project ON brand_versions(project_id, created_at);

-- Image V2 (phase 5A) : candidats déjà regardés pour un brief (photo de banque ou image générée). Une photo refusée
-- n'est ni retéléchargée ni recontrôlée (rien n'est repayé) ; aucune image, aucun prompt n'y est stocké.
CREATE TABLE IF NOT EXISTS image_candidates (
  project_id TEXT NOT NULL,
  candidate_key TEXT NOT NULL,       -- source:id (banque) ou gen:<empreinte>
  brief_hash TEXT NOT NULL,
  verdict TEXT NOT NULL,             -- FINAL | RETRY | PROVISIONAL | REJECTED
  score REAL,
  codes_json TEXT NOT NULL DEFAULT '[]',
  check_id TEXT,
  asset_id TEXT,
  phash TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, candidate_key, brief_hash)
);

-- Éditeur visuel des publicités : documents en calques versionnés (aucune consigne d'IA, aucune clé). Une lignée
-- (doc_key) = une création ; chaque enregistrement crée une version ; restaurer = recopier une ancienne version.
CREATE TABLE IF NOT EXISTS ad_documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  source TEXT NOT NULL,              -- engine | user | ai_local | ai
  note TEXT NOT NULL DEFAULT '',
  doc_json TEXT NOT NULL,
  rendered_asset_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ad_documents_version ON ad_documents(doc_key, version);
CREATE INDEX IF NOT EXISTS ad_documents_project ON ad_documents(project_id, created_at);

-- Video Engine V2 : documents vidéo (timeline éditable) versionnés, comme les documents publicitaires.
CREATE TABLE IF NOT EXISTS video_documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  source TEXT NOT NULL,              -- engine | user | ai_local | ai
  note TEXT NOT NULL DEFAULT '',
  doc_json TEXT NOT NULL,
  rendered_asset_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS video_documents_version ON video_documents(doc_key, version);
CREATE INDEX IF NOT EXISTS video_documents_project ON video_documents(project_id, created_at);

-- Video Engine V2 : plans produits (empreinte du plan → asset, verdict, coût). Un plan FINAL déjà payé est
-- réutilisé tel quel (reprise, régénération partielle) ; jamais de consigne d'IA ni d'image stockée ici.
CREATE TABLE IF NOT EXISTS video_shots (
  project_id TEXT NOT NULL,
  shot_key TEXT NOT NULL,
  asset_id TEXT,
  method TEXT NOT NULL,
  verdict TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  cost_micro INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, shot_key)
);

-- SEO & Copywriting V2 : documents texte éditables (fiches, pages, articles, FAQ, métadonnées). Chaque
-- enregistrement est une version (rien n'est perdu, restaurer recopie une ancienne version) ; une version du
-- client (source user / ai_local / ai) n'est jamais écrasée par une régénération du moteur.
CREATE TABLE IF NOT EXISTS content_documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  type TEXT NOT NULL,
  lang TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL,              -- engine | user | ai_local | ai
  verdict TEXT,
  note TEXT NOT NULL DEFAULT '',
  doc_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS content_documents_version ON content_documents(doc_key, version);
CREATE INDEX IF NOT EXISTS content_documents_project ON content_documents(project_id, created_at);

-- SEO V2 : mémoire des rédactions (empreinte brief + faits → document produit). Même demande, mêmes faits :
-- rien n'est refait ni repayé (idempotence) ; aucune consigne d'IA stockée ici.
-- Social Engine V2 : journal des tentatives de publication (une ligne par envoi : début, fin, résultat). Sert à la
-- reprise sans doublon et au diagnostic ; aucun jeton ni secret n'y est écrit.
CREATE TABLE IF NOT EXISTS post_attempts (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  lock_token TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  outcome TEXT NOT NULL,             -- sending | published | failed | retry | uncertain | skipped
  detail TEXT NOT NULL DEFAULT '',
  remote_id TEXT
);
CREATE INDEX IF NOT EXISTS post_attempts_post ON post_attempts(post_id, started_at);

-- Social Engine V2 : règles d'automatisation persistantes (préparer la semaine suivante, programmer les contenus
-- approuvés, avertir en cas d'erreur…). Jamais de dépense IA ni de publication non autorisée.
CREATE TABLE IF NOT EXISTS social_automations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active', -- active | paused
  last_run_at INTEGER,
  next_run_at INTEGER,
  last_result TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS social_automations_due ON social_automations(status, next_run_at);

-- Social Engine V2 : métriques RÉELLEMENT fournies par les plateformes (jamais estimées).
CREATE TABLE IF NOT EXISTS post_metrics (
  post_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  source TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, metric)
);

-- Social Autopilot V2 : réglages de « Ma communication automatique » (un par projet) et consentement au pilote.
CREATE TABLE IF NOT EXISTS social_settings (
  project_id TEXT PRIMARY KEY,
  config TEXT NOT NULL,
  autopilot INTEGER NOT NULL DEFAULT 0,
  consent_at INTEGER,
  consent_by TEXT,
  consent_text TEXT,
  paused INTEGER NOT NULL DEFAULT 0,
  last_run_at INTEGER,
  next_run_at INTEGER,
  last_result TEXT,
  updated_at INTEGER NOT NULL
);

-- Mémoire éditoriale : produits présentés, matières, accroches, rôles, publications refusées (rotation sans répétition).
CREATE TABLE IF NOT EXISTS social_memory (
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  key TEXT NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0,
  last_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, kind, key)
);

-- Historique des actions du pilote automatique (traçabilité).
CREATE TABLE IF NOT EXISTS social_autopilot_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS social_autopilot_log_project ON social_autopilot_log(project_id, at);

-- Dernière retouche du calendrier « en une phrase » (une par projet) : état d'avant (rows), copies créées (created)
-- et état d'après (after : id → updated_at) pour « annule ma dernière modification » sans écraser une modification
-- faite entre-temps.
CREATE TABLE IF NOT EXISTS social_edit_undo (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  at INTEGER NOT NULL,
  summary TEXT NOT NULL,
  rows TEXT NOT NULL,
  created TEXT NOT NULL DEFAULT '[]',
  after TEXT NOT NULL DEFAULT '{}'
);

-- Biens immobiliers d'un projet (thème Maison & Horizon, issue #172) : une fiche par bien, saisie une seule fois dans
-- l'onglet « Biens » ; elle alimente l'accueil, les listes, la carte, la fiche, les favoris et l'export. Jamais effacée :
-- « archivé » la retire de tout affichage. Référence unique dans le projet ; toutes les valeurs saisies dans data_json.
CREATE TABLE IF NOT EXISTS biens (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  ref TEXT NOT NULL,
  transaction_type TEXT NOT NULL,          -- vente | location
  status TEXT NOT NULL DEFAULT 'draft',    -- draft | published | withdrawn | sold | rented | archived
  position INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS biens_ref ON biens(project_id, ref);
CREATE INDEX IF NOT EXISTS biens_project ON biens(project_id, status, position);

CREATE TABLE IF NOT EXISTS content_runs (
  project_id TEXT NOT NULL,
  run_key TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  verdict TEXT NOT NULL,
  cost_micro INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, run_key)
);
-- Un seul rédacteur par cible, même avec plusieurs processus. Ce verrou ne contient aucun texte client.
CREATE TABLE IF NOT EXISTS content_target_locks (
  project_id TEXT NOT NULL,
  target TEXT NOT NULL,
  owner TEXT NOT NULL,
  job_id TEXT,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY(project_id, target)
);

-- Idées de prompts propres à chaque produit ou service (écrites à la création du projet, réécrites si le catalogue,
-- les services ou la marque changent) : proposées au client dans la création guidée par l'IA.
CREATE TABLE IF NOT EXISTS prompt_ideas (
  project_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  fingerprint TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
`;

/** Colonnes ajoutées après la première version (ajout seulement, jamais de suppression). */
const ADDED_COLUMNS: [table: string, column: string, ddl: string][] = [
  // Project Brain (phase 2.1) : portée, empreinte du contexte stable et version du Brain de chaque appel d'IA.
  ["ai_calls", "brain_scope", "TEXT"],
  ["ai_calls", "brain_hash", "TEXT"],
  ["ai_calls", "brain_version", "TEXT"],
  // Orchestration (phase 3A) : intention, plan, étape et raison synthétique du routage de chaque appel.
  ["ai_calls", "intent", "TEXT"],
  ["ai_calls", "plan_id", "TEXT"],
  ["ai_calls", "step_id", "TEXT"],
  ["ai_calls", "routing_reason", "TEXT"],
  ["ai_calls", "routing_fallback", "INTEGER NOT NULL DEFAULT 0"],
  ["ai_calls", "routing_escalation", "INTEGER NOT NULL DEFAULT 0"],
  // Compétences (skills) transmises à l'appel : activation vérifiable dans les traces.
  ["ai_calls", "skills", "TEXT"],
  ["projects", "store_type", "TEXT NOT NULL DEFAULT 'mono'"],
  ["projects", "catalog_json", "TEXT NOT NULL DEFAULT '[]'"],
  ["projects", "business_type", "TEXT NOT NULL DEFAULT 'products'"],
  ["projects", "business_json", "TEXT NOT NULL DEFAULT '{}'"],
  ["subscriptions", "plan", "TEXT"], // creer | vendre | dominer (null : ancien abonnement → « Créer »)
  ["subscriptions", "billing", "TEXT"], // month | year
  ["payments", "label", "TEXT"],
  // Webhook Stripe : horodatage (secondes) du dernier événement appliqué à l'abonnement en cours, et de la session
  // de paiement qui l'a créé (un événement plus ancien, relivré ou reçu dans le désordre, est ignoré).
  ["subscriptions", "stripe_event_at", "INTEGER"],
  ["subscriptions", "stripe_checkout_at", "INTEGER"],
  // Début de la période mensuelle précédente : le report des quotas ne vient que de celle-là.
  ["wallets", "prev_period_start", "INTEGER"],
  // Règle budgétaire (40 % du HT du forfait, 50 % du HT des packs) : coûts maximaux réservés, version de la règle.
  ["wallets", "reserved", "INTEGER NOT NULL DEFAULT 0"],
  ["wallets", "rule_version", "INTEGER NOT NULL DEFAULT 0"],
  ["wallets", "reserved_topup", "INTEGER NOT NULL DEFAULT 0"],
  ["ai_reservations", "res_monthly", "INTEGER NOT NULL DEFAULT 0"],
  ["ai_reservations", "res_topup", "INTEGER NOT NULL DEFAULT 0"],
  ["ai_reservations", "usage_event_id", "TEXT"],
  ["ai_reservations", "settled_period_start", "INTEGER"],
  ["ai_reservations", "operation_key", "TEXT"],
  ["ai_reservations", "request_hash", "TEXT"],
  ["ai_reservations", "result", "TEXT"],
  ["ai_reservations", "provider_receipt", "TEXT"],
  ["ai_reservations", "recovery_until", "INTEGER NOT NULL DEFAULT 0"],
  // Décompte d'un quota : période et répartition (mois / packs), pour pouvoir le rendre (image refusée au contrôle).
  ["quota_events", "period_start", "INTEGER"],
  ["quota_events", "from_month", "INTEGER"],
  ["quota_events", "from_pack", "INTEGER"],
  // Blog : requête visée et intention de recherche, conservées pour les réécritures.
  ["blog_articles", "keyword", "TEXT"],
  ["blog_articles", "search_intent", "TEXT"],
  // Migration V2 : empreinte du texte rangé par le moteur V2 (une modification du client n'est jamais écrasée).
  ["blog_articles", "v2_hash", "TEXT"],
  // Mémoire du projet (Project Brain 2B) : clé normalisée (déduplication), état (active / remplacée / rejetée),
  // remplaçante, provenance (utilisateur, contrôle qualité, import, déduction…) et preuves (nombre, dernière fois).
  ["memory", "norm_key", "TEXT"],
  ["memory", "state", "TEXT NOT NULL DEFAULT 'active'"],
  ["memory", "superseded_by", "TEXT"],
  ["memory", "origin", "TEXT"],
  ["memory", "evidence_json", "TEXT NOT NULL DEFAULT '{}'"],
  // Social Engine V2 (phase 9A) : ajouts seulement, les publications existantes restent lisibles telles quelles.
  ["posts", "engine", "TEXT NOT NULL DEFAULT 'v1'"],
  ["posts", "pillar", "TEXT"],
  ["posts", "objective", "TEXT"],
  ["posts", "content_hash", "TEXT"],
  ["posts", "approved_hash", "TEXT"],
  ["posts", "user_edited", "INTEGER NOT NULL DEFAULT 0"],
  ["posts", "lock_token", "TEXT"],
  ["posts", "locked_at", "INTEGER"],
  ["posts", "production", "TEXT NOT NULL DEFAULT '{}'"],
  ["posts", "gate", "TEXT NOT NULL DEFAULT '{}'"],
  ["posts", "group_id", "TEXT"],
  ["content_plans", "engine", "TEXT NOT NULL DEFAULT 'v1'"],
  ["content_plans", "paused", "INTEGER NOT NULL DEFAULT 0"],
  ["content_plans", "updated_at", "INTEGER"],
  // Abonnement par projet (forfaits V2) : compte client, projet financé (rattachement définitif), origine, dates,
  // prix réellement payé (ancien tarif conservé jusqu'au renouvellement) ; projet masqué (ancienne découverte).
  ["subscriptions", "owner_user_id", "TEXT"],
  ["subscriptions", "project_id", "TEXT"],
  ["subscriptions", "bound_at", "INTEGER"],
  ["subscriptions", "created_at", "INTEGER"],
  ["subscriptions", "source", "TEXT"], // legacy | stripe | admin
  ["subscriptions", "price_cents", "INTEGER"],
  ["subscriptions", "cancel_at_period_end", "INTEGER NOT NULL DEFAULT 0"],
  ["projects", "hidden", "INTEGER NOT NULL DEFAULT 0"],
  // Paiements V2 : projet et abonnement (compte de facturation) concernés, paiement Stripe, remboursement.
  ["payments", "project_id", "TEXT"],
  ["payments", "account_key", "TEXT"],
  ["payments", "payment_intent", "TEXT"],
  ["payments", "refunded_cents", "INTEGER NOT NULL DEFAULT 0"],
];

function migrate(db: Database.Database) {
  for (const [table, column, ddl] of ADDED_COLUMNS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (cols.some((c) => c.name === column)) continue;
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    } catch (e) {
      // Deux processus (site et worker, ou tests en parallèle) ouvrent la même base neuve : l'autre a déjà ajouté
      // la colonne entre la lecture et l'ajout. Seule cette erreur est ignorée.
      if (!/duplicate column name/i.test((e as Error).message)) throw e;
    }
  }
  // Index sur des colonnes ajoutées : créés après elles.
  db.exec("CREATE INDEX IF NOT EXISTS memory_active ON memory(project_id, state, norm_key)");
  // Lectures fréquentes (cloche toutes les 30 s, logo / couverture à chaque rafraîchissement du projet, dérivés d'un
  // fichier, réservations d'une tâche reprise) : index au lieu d'un parcours complet de la table. Aucune donnée
  // n'est modifiée.
  db.exec(`CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);
    CREATE INDEX IF NOT EXISTS assets_project_role ON assets(project_id, role, created_at);
    CREATE INDEX IF NOT EXISTS assets_source ON assets(source_asset_id);
    CREATE INDEX IF NOT EXISTS ai_reservations_job ON ai_reservations(job_id, status);
    CREATE UNIQUE INDEX IF NOT EXISTS ai_reservations_operation ON ai_reservations(operation_key) WHERE operation_key IS NOT NULL AND status != 'released';`);
  migrateBillingV2(db);
}

/** Clé étrangère vers users sur une table (anciens schémas de subscriptions et wallets). */
const hasUserFk = (db: Database.Database, table: string) => (db.prepare(`PRAGMA foreign_key_list(${table})`).all() as { table: string }[]).some((f) => f.table === "users");

/**
 * Forfaits V2 (un abonnement = un projet), migration non destructive et rejouable :
 *  1. sauvegarde complète de la base avant toute modification (data/backups) ;
 *  2. subscriptions et wallets reconstruites sans clé étrangère vers users (un abonnement par projet porte son propre
 *     id) — toutes les lignes et colonnes copiées telles quelles ;
 *  3. chaque ancien abonnement est rattaché au compte (owner_user_id) puis, s'il a été payé, au projet actif le plus
 *     récent du compte ; les autres projets actifs d'un compte multi-boutiques restent visibles (régularisation par
 *     l'administration) ; les projets des comptes jamais abonnés (ancienne découverte) sont masqués, pas supprimés ;
 *  4. un projet ne peut être rattaché qu'à un seul abonnement, et ce rattachement ne peut plus jamais changer
 *     (index unique + déclencheur), même par une requête forgée.
 */
export function migrateBillingV2(db: Database.Database) {
  const FK_TABLES = ["subscriptions", "wallets", "quota_usage", "pack_balances", "pack_purchases"];
  if (FK_TABLES.some((t) => hasUserFk(db, t))) {
    const has = (db.prepare("SELECT COUNT(*) n FROM subscriptions").get() as { n: number }).n + (db.prepare("SELECT COUNT(*) n FROM projects").get() as { n: number }).n;
    if (has > 0 && process.env.NODE_ENV !== "test" && !process.env.VITEST) {
      const dir = path.join(DATA_DIR, "backups");
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `avant-forfaits-v2-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
      db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    }
    db.pragma("foreign_keys = OFF");
    try {
      db.transaction(() => {
        for (const table of FK_TABLES) {
          if (!hasUserFk(db, table)) continue;
          const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; type: string; notnull: number; dflt_value: string | null; pk: number }[]);
          // Clé primaire simple ou composée (quota_usage, pack_balances), contraintes UNIQUE recopiées.
          const pk = cols.filter((c) => c.pk).sort((a, b) => a.pk - b.pk).map((c) => c.name);
          const uniques = (db.prepare(`PRAGMA index_list(${table})`).all() as { name: string; unique: number; origin: string }[]).filter((i) => i.unique && i.origin === "u").map((i) => (db.prepare(`PRAGMA index_info(${i.name})`).all() as { name: string }[]).map((c) => c.name));
          const ddl = [
            ...cols.map((c) => `${c.name} ${c.type}${c.pk && pk.length === 1 ? " PRIMARY KEY" : ""}${c.notnull && !c.pk ? " NOT NULL" : ""}${c.dflt_value != null ? ` DEFAULT ${c.dflt_value}` : ""}`),
            ...(pk.length > 1 ? [`PRIMARY KEY (${pk.join(", ")})`] : []),
            ...uniques.map((u) => `UNIQUE (${u.join(", ")})`),
          ].join(", ");
          const names = cols.map((c) => c.name).join(", ");
          db.exec(`CREATE TABLE ${table}__v2 (${ddl}); INSERT INTO ${table}__v2 (${names}) SELECT ${names} FROM ${table}; DROP TABLE ${table}; ALTER TABLE ${table}__v2 RENAME TO ${table};`);
        }
      })();
    } finally {
      db.pragma("foreign_keys = ON");
    }
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_project ON subscriptions(project_id) WHERE project_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS subscriptions_owner ON subscriptions(owner_user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
    CREATE TRIGGER IF NOT EXISTS subscriptions_project_lock BEFORE UPDATE OF project_id ON subscriptions
      WHEN OLD.project_id IS NOT NULL AND NEW.project_id IS NOT OLD.project_id
      BEGIN SELECT RAISE(ABORT, 'subscription project binding is permanent'); END;
    CREATE TRIGGER IF NOT EXISTS subscriptions_owner_lock BEFORE UPDATE OF owner_user_id ON subscriptions
      WHEN OLD.owner_user_id IS NOT NULL AND NEW.owner_user_id IS NOT OLD.owner_user_id
      BEGIN SELECT RAISE(ABORT, 'subscription owner is permanent'); END;
    CREATE TRIGGER IF NOT EXISTS subscriptions_bound_no_delete BEFORE DELETE ON subscriptions
      WHEN OLD.project_id IS NOT NULL
      BEGIN SELECT RAISE(ABORT, 'a subscription bound to a project is never deleted'); END;`);
  // Rattachements (une seule fois par ligne ; rejouable sans effet).
  db.transaction(() => {
    db.exec("UPDATE subscriptions SET owner_user_id = user_id, source = COALESCE(source, 'legacy'), created_at = COALESCE(created_at, updated_at) WHERE owner_user_id IS NULL");
    if ((db.prepare("SELECT value FROM settings WHERE key = 'billing.v2.migrated'").get() as { value: string } | undefined)) return;
    // Anciens abonnés : prix payé conservé jusqu'au prochain renouvellement (budget IA calculé dessus, règle des 40 %).
    db.exec(`UPDATE subscriptions SET price_cents = CASE COALESCE(plan, 'creer')
        WHEN 'vendre' THEN CASE WHEN billing = 'year' THEN 79900 ELSE 7990 END
        WHEN 'dominer' THEN CASE WHEN billing = 'year' THEN 99900 ELSE 9990 END
        ELSE CASE WHEN billing = 'year' THEN 49900 ELSE 4990 END END
      WHERE source = 'legacy' AND price_cents IS NULL AND status IN ('active','past_due','canceled','trial')`);
    const paid = db.prepare("SELECT user_id FROM subscriptions WHERE source = 'legacy' AND project_id IS NULL AND status IN ('active','manual','past_due','canceled','trial')").all() as { user_id: string }[];
    for (const s of paid) {
      const p = db.prepare("SELECT p.id FROM projects p WHERE p.user_id = ? AND p.archived = 0 AND NOT EXISTS (SELECT 1 FROM subscriptions x WHERE x.project_id = p.id) ORDER BY p.updated_at DESC LIMIT 1").get(s.user_id) as { id: string } | undefined;
      if (p) db.prepare("UPDATE subscriptions SET project_id = ?, bound_at = ? WHERE user_id = ? AND project_id IS NULL").run(p.id, Date.now(), s.user_id);
    }
    // Ancienne découverte gratuite (compte jamais abonné) : projets masqués, conservés, rendus visibles à la souscription.
    db.exec(`UPDATE projects SET hidden = 1 WHERE hidden = 0 AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.project_id = projects.id)
      AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.owner_user_id = projects.user_id AND s.status IN ('active','manual','past_due','canceled','trial'))`);
    db.prepare("INSERT OR REPLACE INTO settings (key, value, secret, updated_at) VALUES ('billing.v2.migrated', ?, 0, ?)").run(JSON.stringify(Date.now()), Date.now());
  })();
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
  // Jamais de clé d'API, jeton OAuth, en-tête Authorization ni secret de l'application dans le journal.
  const message = redact(err instanceof Error ? err.message : String(err));
  try {
    run(
      "INSERT INTO error_log (id, scope, message, details, user_id, project_id, created_at) VALUES (?,?,?,?,?,?,?)",
      id(),
      scope,
      message.slice(0, 2000),
      JSON.stringify({ stack: err instanceof Error && err.stack ? redact(err.stack).slice(0, 4000) : undefined, ...(ctx.details ? { ctx: redactDeep(ctx.details) } : {}) }),
      ctx.userId ?? null,
      ctx.projectId ?? null,
      now(),
    );
  } catch {
    /* le journal ne doit jamais faire échouer l'appelant */
  }
}
