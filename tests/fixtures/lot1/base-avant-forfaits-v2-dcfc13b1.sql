-- Base historique SYNTHÉTIQUE, dcfc13b184cb4f2dc43d4f5473da45f60340b1f9
PRAGMA foreign_keys=OFF;
BEGIN;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  created_at INTEGER NOT NULL
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE projects (
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
, store_type TEXT NOT NULL DEFAULT 'mono', catalog_json TEXT NOT NULL DEFAULT '[]', business_type TEXT NOT NULL DEFAULT 'products', business_json TEXT NOT NULL DEFAULT '{}');
CREATE TABLE memory (
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
, norm_key TEXT, state TEXT NOT NULL DEFAULT 'active', superseded_by TEXT, origin TEXT, evidence_json TEXT NOT NULL DEFAULT '{}');
CREATE TABLE jobs (
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
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_key TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE assets (
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
CREATE TABLE asset_usages (
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,    -- theme_section | post | video | campaign | brand
  target_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (asset_id, target_type, target_id)
);
CREATE TABLE theme_versions (
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
CREATE TABLE chat_messages (
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
CREATE TABLE user_prompts (
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
CREATE TABLE prompt_favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, prompt_id)
);
CREATE TABLE connections (
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
CREATE TABLE project_connections (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, connection_id)
);
CREATE TABLE oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  project_id TEXT,
  verifier TEXT,
  redirect TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE content_plans (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  params TEXT NOT NULL,
  strategy TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  job_id TEXT,
  created_at INTEGER NOT NULL
, engine TEXT NOT NULL DEFAULT 'v1', paused INTEGER NOT NULL DEFAULT 0, updated_at INTEGER);
CREATE TABLE posts (
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
, engine TEXT NOT NULL DEFAULT 'v1', pillar TEXT, objective TEXT, content_hash TEXT, approved_hash TEXT, user_edited INTEGER NOT NULL DEFAULT 0, lock_token TEXT, locked_at INTEGER, production TEXT NOT NULL DEFAULT '{}', gate TEXT NOT NULL DEFAULT '{}', group_id TEXT);
CREATE TABLE campaigns (
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
CREATE TABLE subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'none', -- none | trial | active | past_due | canceled | manual
  stores INTEGER NOT NULL DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start INTEGER,
  current_period_end INTEGER,
  updated_at INTEGER NOT NULL
, plan TEXT, billing TEXT, stripe_event_at INTEGER, stripe_checkout_at INTEGER);
CREATE TABLE wallets (
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
, prev_period_start INTEGER, reserved INTEGER NOT NULL DEFAULT 0, rule_version INTEGER NOT NULL DEFAULT 0, reserved_topup INTEGER NOT NULL DEFAULT 0);
CREATE TABLE ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,          -- allowance | topup | usage | adjustment | renewal
  bucket TEXT NOT NULL,        -- monthly | topup
  amount INTEGER NOT NULL,     -- micro-euros (signé)
  ref TEXT,
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE ai_reservations (
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
CREATE TABLE quota_usage (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start INTEGER NOT NULL,
  key TEXT NOT NULL,           -- visuals | aiVideos | ugc | blog
  included INTEGER NOT NULL,
  rollover INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period_start, key)
);
CREATE TABLE pack_balances (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,           -- visuals | aiVideos | ugc | languages
  balance INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, key)
);
CREATE TABLE pack_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack TEXT NOT NULL,
  ref TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE quota_events (
  ref TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at INTEGER NOT NULL
, period_start INTEGER, from_month INTEGER, from_pack INTEGER);
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,          -- subscription | pack | topup (ancien)
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  stripe_id TEXT UNIQUE,
  created_at INTEGER NOT NULL
, label TEXT);
CREATE TABLE usage_events (
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
CREATE TABLE ai_calls (
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
, brain_scope TEXT, brain_hash TEXT, brain_version TEXT, intent TEXT, plan_id TEXT, step_id TEXT, routing_reason TEXT, routing_fallback INTEGER NOT NULL DEFAULT 0, routing_escalation INTEGER NOT NULL DEFAULT 0);
CREATE TABLE quality_checks (
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
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  secret INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE error_log (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  user_id TEXT,
  project_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE worker_heartbeat (
  id TEXT PRIMARY KEY,
  beat_at INTEGER NOT NULL,
  info TEXT
);
CREATE TABLE expenses (
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
CREATE TABLE recurring_charges (
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
CREATE TABLE blog_articles (
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
, keyword TEXT, search_intent TEXT, v2_hash TEXT);
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created INTEGER NOT NULL DEFAULT 0, -- horodatage Stripe de l'événement (secondes)
  processed_at INTEGER NOT NULL
);
CREATE TABLE stripe_cancellations (
  subscription_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_at INTEGER NOT NULL,
  last_error TEXT,
  done_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE rate_events (
  key TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE TABLE password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_by TEXT,                    -- 'self' (e-mail) ou identifiant de l'administrateur
  created_at INTEGER NOT NULL
);
CREATE TABLE admin_claims (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE task_plans (
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
CREATE TABLE workflows (
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
CREATE TABLE brand_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE image_candidates (
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
CREATE TABLE ad_documents (
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
CREATE TABLE video_documents (
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
CREATE TABLE video_shots (
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
CREATE TABLE content_documents (
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
CREATE TABLE post_attempts (
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
CREATE TABLE social_automations (
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
CREATE TABLE post_metrics (
  post_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  source TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, metric)
);
CREATE TABLE content_runs (
  project_id TEXT NOT NULL,
  run_key TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  verdict TEXT NOT NULL,
  cost_micro INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, run_key)
);
INSERT INTO "asset_usages" VALUES ('a-p-a-mono-1','theme_section','hero','Ouverture',1789462800000);
INSERT INTO "asset_usages" VALUES ('a-p-a-catalogue-1','theme_section','hero','Ouverture',1789462800000);
INSERT INTO "asset_usages" VALUES ('a-p-a-services-1','theme_section','hero','Ouverture',1789462800000);
INSERT INTO "asset_usages" VALUES ('a-p-a-archive-1','theme_section','hero','Ouverture',1789462800000);
INSERT INTO "asset_usages" VALUES ('a-p-b-unique-1','theme_section','hero','Ouverture',1789462800000);
INSERT INTO "asset_usages" VALUES ('a-p-c-decouverte-1','theme_section','hero','Ouverture',1789462800000);
INSERT INTO "assets" VALUES ('a-p-a-mono-0','p-a-mono','u-historique-a','f-p-a-mono','original.webp','image','original','image/webp',4096,1024,1024,NULL,'p-a-mono/original-0.webp','p-a-mono/thumb-original-0.webp','upload','{}',NULL,NULL,1,'approved',0,NULL,1789462800000);
INSERT INTO "assets" VALUES ('a-p-a-mono-1','p-a-mono','u-historique-a','f-p-a-mono','packshot.webp','image','packshot','image/webp',4608,1024,1024,NULL,'p-a-mono/packshot-1.webp','p-a-mono/thumb-packshot-1.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789466400000);
INSERT INTO "assets" VALUES ('a-p-a-mono-2','p-a-mono','u-historique-a','f-p-a-mono','logo.webp','logo','logo','image/webp',5120,1024,1024,NULL,'p-a-mono/logo-2.webp','p-a-mono/thumb-logo-2.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789470000000);
INSERT INTO "assets" VALUES ('a-p-a-catalogue-0','p-a-catalogue','u-historique-a','f-p-a-catalogue','original.webp','image','original','image/webp',4096,1024,1024,NULL,'p-a-catalogue/original-0.webp','p-a-catalogue/thumb-original-0.webp','upload','{}',NULL,NULL,1,'approved',0,NULL,1789462800000);
INSERT INTO "assets" VALUES ('a-p-a-catalogue-1','p-a-catalogue','u-historique-a','f-p-a-catalogue','packshot.webp','image','packshot','image/webp',4608,1024,1024,NULL,'p-a-catalogue/packshot-1.webp','p-a-catalogue/thumb-packshot-1.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789466400000);
INSERT INTO "assets" VALUES ('a-p-a-catalogue-2','p-a-catalogue','u-historique-a','f-p-a-catalogue','logo.webp','logo','logo','image/webp',5120,1024,1024,NULL,'p-a-catalogue/logo-2.webp','p-a-catalogue/thumb-logo-2.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789470000000);
INSERT INTO "assets" VALUES ('a-p-a-services-0','p-a-services','u-historique-a','f-p-a-services','original.webp','image','original','image/webp',4096,1024,1024,NULL,'p-a-services/original-0.webp','p-a-services/thumb-original-0.webp','upload','{}',NULL,NULL,1,'approved',0,NULL,1789462800000);
INSERT INTO "assets" VALUES ('a-p-a-services-1','p-a-services','u-historique-a','f-p-a-services','packshot.webp','image','packshot','image/webp',4608,1024,1024,NULL,'p-a-services/packshot-1.webp','p-a-services/thumb-packshot-1.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789466400000);
INSERT INTO "assets" VALUES ('a-p-a-services-2','p-a-services','u-historique-a','f-p-a-services','logo.webp','logo','logo','image/webp',5120,1024,1024,NULL,'p-a-services/logo-2.webp','p-a-services/thumb-logo-2.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789470000000);
INSERT INTO "assets" VALUES ('a-p-a-archive-0','p-a-archive','u-historique-a','f-p-a-archive','original.webp','image','original','image/webp',4096,1024,1024,NULL,'p-a-archive/original-0.webp','p-a-archive/thumb-original-0.webp','upload','{}',NULL,NULL,1,'approved',0,NULL,1789462800000);
INSERT INTO "assets" VALUES ('a-p-a-archive-1','p-a-archive','u-historique-a','f-p-a-archive','packshot.webp','image','packshot','image/webp',4608,1024,1024,NULL,'p-a-archive/packshot-1.webp','p-a-archive/thumb-packshot-1.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789466400000);
INSERT INTO "assets" VALUES ('a-p-a-archive-2','p-a-archive','u-historique-a','f-p-a-archive','logo.webp','logo','logo','image/webp',5120,1024,1024,NULL,'p-a-archive/logo-2.webp','p-a-archive/thumb-logo-2.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789470000000);
INSERT INTO "assets" VALUES ('a-p-b-unique-0','p-b-unique','u-historique-b','f-p-b-unique','original.webp','image','original','image/webp',4096,1024,1024,NULL,'p-b-unique/original-0.webp','p-b-unique/thumb-original-0.webp','upload','{}',NULL,NULL,1,'approved',0,NULL,1789462800000);
INSERT INTO "assets" VALUES ('a-p-b-unique-1','p-b-unique','u-historique-b','f-p-b-unique','packshot.webp','image','packshot','image/webp',4608,1024,1024,NULL,'p-b-unique/packshot-1.webp','p-b-unique/thumb-packshot-1.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789466400000);
INSERT INTO "assets" VALUES ('a-p-b-unique-2','p-b-unique','u-historique-b','f-p-b-unique','logo.webp','logo','logo','image/webp',5120,1024,1024,NULL,'p-b-unique/logo-2.webp','p-b-unique/thumb-logo-2.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789470000000);
INSERT INTO "assets" VALUES ('a-p-c-decouverte-0','p-c-decouverte','u-decouverte-c','f-p-c-decouverte','original.webp','image','original','image/webp',4096,1024,1024,NULL,'p-c-decouverte/original-0.webp','p-c-decouverte/thumb-original-0.webp','upload','{}',NULL,NULL,1,'approved',0,NULL,1789462800000);
INSERT INTO "assets" VALUES ('a-p-c-decouverte-1','p-c-decouverte','u-decouverte-c','f-p-c-decouverte','packshot.webp','image','packshot','image/webp',4608,1024,1024,NULL,'p-c-decouverte/packshot-1.webp','p-c-decouverte/thumb-packshot-1.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789466400000);
INSERT INTO "assets" VALUES ('a-p-c-decouverte-2','p-c-decouverte','u-decouverte-c','f-p-c-decouverte','logo.webp','logo','logo','image/webp',5120,1024,1024,NULL,'p-c-decouverte/logo-2.webp','p-c-decouverte/thumb-logo-2.webp','generated','{}',NULL,NULL,1,'approved',0,NULL,1789470000000);
INSERT INTO "blog_articles" VALUES ('blog-a-1','p-a-mono','u-historique-a','Article synthétique','article-synthetique','Article','Synthétique','','<p>Texte synthétique.</p>','[]',NULL,'fr','draft',NULL,NULL,'[]',1789462800000,1789462800000,NULL,NULL,NULL,NULL);
INSERT INTO "chat_messages" VALUES ('c-p-a-mono','p-a-mono','shop','user','Mets le bouton en bleu nuit.','[]',NULL,'tv-p-a-mono-2',NULL,1789549200000);
INSERT INTO "chat_messages" VALUES ('c-p-a-catalogue','p-a-catalogue','shop','user','Mets le bouton en bleu nuit.','[]',NULL,'tv-p-a-catalogue-2',NULL,1789549200000);
INSERT INTO "chat_messages" VALUES ('c-p-a-services','p-a-services','shop','user','Mets le bouton en bleu nuit.','[]',NULL,'tv-p-a-services-2',NULL,1789549200000);
INSERT INTO "chat_messages" VALUES ('c-p-a-archive','p-a-archive','shop','user','Mets le bouton en bleu nuit.','[]',NULL,'tv-p-a-archive-2',NULL,1789549200000);
INSERT INTO "chat_messages" VALUES ('c-p-b-unique','p-b-unique','shop','user','Mets le bouton en bleu nuit.','[]',NULL,'tv-p-b-unique-2',NULL,1789549200000);
INSERT INTO "chat_messages" VALUES ('c-p-c-decouverte','p-c-decouverte','shop','user','Mets le bouton en bleu nuit.','[]',NULL,'tv-p-c-decouverte-2',NULL,1789549200000);
INSERT INTO "connections" VALUES ('conn-a-instagram','u-historique-a','instagram','ig-synthetique','Compte synthétique',NULL,'chiffre:synthetique-non-valide',NULL,NULL,'','{}','active',NULL,1789462800000,1789462800000);
INSERT INTO "content_plans" VALUES ('cp-a','p-a-mono','{"days":30}','historique','ready','j-a-done',1789462800000,'v1',0,NULL);
INSERT INTO "folders" VALUES ('f-p-a-mono','p-a-mono',NULL,'Médias','media',1789462800000);
INSERT INTO "folders" VALUES ('f-p-a-catalogue','p-a-catalogue',NULL,'Médias','media',1789462800000);
INSERT INTO "folders" VALUES ('f-p-a-services','p-a-services',NULL,'Médias','media',1789462800000);
INSERT INTO "folders" VALUES ('f-p-a-archive','p-a-archive',NULL,'Médias','media',1789462800000);
INSERT INTO "folders" VALUES ('f-p-b-unique','p-b-unique',NULL,'Médias','media',1789462800000);
INSERT INTO "folders" VALUES ('f-p-c-decouverte','p-c-decouverte',NULL,'Médias','media',1789462800000);
INSERT INTO "jobs" VALUES ('j-a-done','u-historique-a','p-a-mono','pipeline.run','Tâche done','{}','done',1,'',NULL,NULL,0,3,1789462800000,NULL,NULL,'idem-done',NULL,'[]','{}',1789462800000,1789462800000,1789470000000);
INSERT INTO "jobs" VALUES ('j-a-queued','u-historique-a','p-a-mono','social.publish','Tâche queued','{}','queued',0.4,'',NULL,NULL,1,3,1789466400000,NULL,NULL,'idem-queued',NULL,'[]','{}',1789462800000,1789462860000,NULL);
INSERT INTO "jobs" VALUES ('j-a-running','u-historique-a','p-a-mono','pipeline.run','Tâche running','{}','running',0.4,'',NULL,NULL,2,3,1789470000000,'worker-historique',1789466400000,'idem-running',NULL,'[]','{}',1789462800000,1789462920000,NULL);
INSERT INTO "jobs" VALUES ('j-a-paused','u-historique-a','p-a-mono','pipeline.run','Tâche paused','{}','paused',0.4,'',NULL,NULL,3,3,1789473600000,NULL,NULL,'idem-paused',NULL,'[]','{}',1789462800000,1789462980000,NULL);
INSERT INTO "jobs" VALUES ('j-a-failed','u-historique-a','p-a-mono','pipeline.run','Tâche failed','{}','failed',0.4,'',NULL,NULL,4,3,1789477200000,NULL,NULL,'idem-failed',NULL,'[]','{}',1789462800000,1789463040000,NULL);
INSERT INTO "ledger" VALUES ('l-u-historique-a-1','u-historique-a','grant','monthly',2000000,'sub-u-historique-a','Budget IA du mois',1789462800000);
INSERT INTO "ledger" VALUES ('l-u-historique-a-2','u-historique-a','usage','monthly',-500000,'job-u-historique-a','Image IA',1789549200000);
INSERT INTO "ledger" VALUES ('l-u-historique-b-1','u-historique-b','grant','monthly',2000000,'sub-u-historique-b','Budget IA du mois',1789462800000);
INSERT INTO "ledger" VALUES ('l-u-historique-b-2','u-historique-b','usage','monthly',-500000,'job-u-historique-b','Image IA',1789549200000);
INSERT INTO "ledger" VALUES ('l-b-offert','u-historique-b','grant','topup',3000000,NULL,'Ancien budget de création offert',1789462800000);
INSERT INTO "ledger" VALUES ('l-a-recharge','u-historique-a','topup','topup',500000,'pi_synthetique_recharge','Recharge IA 10 €',1789635600000);
INSERT INTO "memory" VALUES ('m-p-a-mono','p-a-mono','correction','vocabulaire','dire « lampe », jamais « luminaire »','confirmed','user','all',1789462800000,1789462800000,NULL,'active',NULL,NULL,'{}');
INSERT INTO "memory" VALUES ('m-p-a-catalogue','p-a-catalogue','correction','vocabulaire','dire « lampe », jamais « luminaire »','confirmed','user','all',1789462800000,1789462800000,NULL,'active',NULL,NULL,'{}');
INSERT INTO "memory" VALUES ('m-p-a-services','p-a-services','correction','vocabulaire','dire « lampe », jamais « luminaire »','confirmed','user','all',1789462800000,1789462800000,NULL,'active',NULL,NULL,'{}');
INSERT INTO "memory" VALUES ('m-p-a-archive','p-a-archive','correction','vocabulaire','dire « lampe », jamais « luminaire »','confirmed','user','all',1789462800000,1789462800000,NULL,'active',NULL,NULL,'{}');
INSERT INTO "memory" VALUES ('m-p-b-unique','p-b-unique','correction','vocabulaire','dire « lampe », jamais « luminaire »','confirmed','user','all',1789462800000,1789462800000,NULL,'active',NULL,NULL,'{}');
INSERT INTO "memory" VALUES ('m-p-c-decouverte','p-c-decouverte','correction','vocabulaire','dire « lampe », jamais « luminaire »','confirmed','user','all',1789462800000,1789462800000,NULL,'active',NULL,NULL,'{}');
INSERT INTO "notifications" VALUES ('n-a','u-historique-a','p-a-mono','info','Création terminée','',NULL,1789462800000);
INSERT INTO "pack_balances" VALUES ('u-historique-a','visuals',12);
INSERT INTO "pack_purchases" VALUES ('pp-a-visuels','u-historique-a','visuals','cs_synthetique_pack',1789635600000);
INSERT INTO "payments" VALUES ('pay-a-0','u-historique-a','subscription',8900,'paid','cs_synthetique_0',1789462800000,'subscription');
INSERT INTO "payments" VALUES ('pay-a-1','u-historique-a','topup',1000,'paid','cs_synthetique_1',1789549200000,'topup');
INSERT INTO "payments" VALUES ('pay-a-2','u-historique-a','pack',1490,'paid','cs_synthetique_2',1789635600000,'pack');
INSERT INTO "payments" VALUES ('pay-b-0','u-historique-b','subscription',129000,'paid','cs_synthetique_b',1789462800000,'subscription');
INSERT INTO "posts" VALUES ('post-a-scheduled','p-a-mono','cp-a',NULL,'conn-a-instagram','instagram','image','scheduled',1792918800000,'Europe/Paris','Publication scheduled','Publication synthétique scheduled','[]',NULL,NULL,'["a-p-a-mono-1"]','{}',NULL,NULL,0,NULL,'pk-scheduled',NULL,NULL,0,NULL,NULL,1789462800000,1789462800000,'v1',NULL,NULL,NULL,NULL,0,NULL,NULL,'{}','{}',NULL);
INSERT INTO "posts" VALUES ('post-a-published','p-a-mono','cp-a',NULL,'conn-a-instagram','instagram','image','published',1793005200000,'Europe/Paris','Publication published','Publication synthétique published','[]',NULL,NULL,'["a-p-a-mono-1"]','{}',NULL,NULL,0,NULL,'pk-published',NULL,NULL,0,NULL,1793005200000,1789462800000,1789462800000,'v1',NULL,NULL,NULL,NULL,0,NULL,NULL,'{}','{}',NULL);
INSERT INTO "posts" VALUES ('post-a-draft','p-a-mono','cp-a',NULL,'conn-a-instagram','instagram','image','draft',1793091600000,'Europe/Paris','Publication draft','Publication synthétique draft','[]',NULL,NULL,'["a-p-a-mono-1"]','{}',NULL,NULL,0,NULL,'pk-draft',NULL,NULL,0,NULL,NULL,1789462800000,1789462800000,'v1',NULL,NULL,NULL,NULL,0,NULL,NULL,'{}','{}',NULL);
INSERT INTO "project_connections" VALUES ('p-a-mono','conn-a-instagram');
INSERT INTO "projects" VALUES ('p-a-mono','u-historique-a','Lampe synthétique','ready','shopify','maison','{"title":"Lampe synthétique","price":"[À compléter : prix]"}','{"name":"Lampe synthétique","palette":["#14213d","#fca311"]}','{"angle":"historique"}','{"lang":"fr"}','[]','tv-p-a-mono-2','a-p-a-mono-1',NULL,0,1789462800000,1789549200000,'mono','[]','products','{}');
INSERT INTO "projects" VALUES ('p-a-catalogue','u-historique-a','Catalogue synthétique','ready','shopify','maison','{"title":"Catalogue synthétique","price":"[À compléter : prix]"}','{"name":"Catalogue synthétique","palette":["#14213d","#fca311"]}','{"angle":"historique"}','{"lang":"fr"}','[]','tv-p-a-catalogue-2','a-p-a-catalogue-1',NULL,0,1789722000000,1789808400000,'multi','[{"id":"x1"},{"id":"x2"}]','products','{}');
INSERT INTO "projects" VALUES ('p-a-services','u-historique-a','Atelier synthétique','ready','shopify','maison','{"title":"Atelier synthétique","price":"[À compléter : prix]"}','{"name":"Atelier synthétique","palette":["#14213d","#fca311"]}','{"angle":"historique"}','{"lang":"fr"}','[]','tv-p-a-services-2','a-p-a-services-1',NULL,0,1789981200000,1790067600000,'mono','[]','services','{"services":[{"name":"Prestation synthétique"}]}');
INSERT INTO "projects" VALUES ('p-a-archive','u-historique-a','Ancien essai archivé','ready','shopify','maison','{"title":"Ancien essai archivé","price":"[À compléter : prix]"}','{"name":"Ancien essai archivé","palette":["#14213d","#fca311"]}','{"angle":"historique"}','{"lang":"fr"}','[]','tv-p-a-archive-2','a-p-a-archive-1',NULL,1,1789549200000,1789635600000,'mono','[]','products','{}');
INSERT INTO "projects" VALUES ('p-b-unique','u-historique-b','Sac synthétique','ready','shopify','maison','{"title":"Sac synthétique","price":"[À compléter : prix]"}','{"name":"Sac synthétique","palette":["#14213d","#fca311"]}','{"angle":"historique"}','{"lang":"fr"}','[]','tv-p-b-unique-2','a-p-b-unique-1',NULL,0,1789635600000,1789722000000,'mono','[]','products','{}');
INSERT INTO "projects" VALUES ('p-c-decouverte','u-decouverte-c','Essai découverte','ready','shopify','maison','{"title":"Essai découverte","price":"[À compléter : prix]"}','{"name":"Essai découverte","palette":["#14213d","#fca311"]}','{"angle":"historique"}','{"lang":"fr"}','[]','tv-p-c-decouverte-2','a-p-c-decouverte-1',NULL,0,1789808400000,1789894800000,'mono','[]','products','{}');
INSERT INTO "quota_usage" VALUES ('u-historique-a',1789462800000,'blog',5,0,2);
INSERT INTO "quota_usage" VALUES ('u-historique-b',1789462800000,'blog',5,0,2);
INSERT INTO "settings" VALUES ('public.url','https://studio.exemple.invalid',0,1789462800000);
INSERT INTO "settings" VALUES ('stripe.secretKey','chiffre:synthetique-non-valide',1,1789462800000);
INSERT INTO "subscriptions" VALUES ('u-historique-a','active',3,'cus_synthetique_a','sub_synthetique_a',1789462800000,1792054800000,1789462800000,'vendre','month',NULL,NULL);
INSERT INTO "subscriptions" VALUES ('u-historique-b','active',1,'cus_synthetique_b','sub_synthetique_b',1789462800000,1820998800000,1789462800000,'dominer','year',NULL,NULL);
INSERT INTO "theme_versions" VALUES ('tv-p-a-mono-1','p-a-mono',1,'{"direction":"orbe","sections":4}','Création','pipeline',NULL,NULL,1789549200000);
INSERT INTO "theme_versions" VALUES ('tv-p-a-mono-2','p-a-mono',2,'{"direction":"orbe","sections":8}','Retouche du client','user','tv-p-a-mono-1',NULL,1789635600000);
INSERT INTO "theme_versions" VALUES ('tv-p-a-catalogue-1','p-a-catalogue',1,'{"direction":"orbe","sections":4}','Création','pipeline',NULL,NULL,1789549200000);
INSERT INTO "theme_versions" VALUES ('tv-p-a-catalogue-2','p-a-catalogue',2,'{"direction":"orbe","sections":8}','Retouche du client','user','tv-p-a-catalogue-1',NULL,1789635600000);
INSERT INTO "theme_versions" VALUES ('tv-p-a-services-1','p-a-services',1,'{"direction":"orbe","sections":4}','Création','pipeline',NULL,NULL,1789549200000);
INSERT INTO "theme_versions" VALUES ('tv-p-a-services-2','p-a-services',2,'{"direction":"orbe","sections":8}','Retouche du client','user','tv-p-a-services-1',NULL,1789635600000);
INSERT INTO "theme_versions" VALUES ('tv-p-a-archive-1','p-a-archive',1,'{"direction":"orbe","sections":4}','Création','pipeline',NULL,NULL,1789549200000);
INSERT INTO "theme_versions" VALUES ('tv-p-a-archive-2','p-a-archive',2,'{"direction":"orbe","sections":8}','Retouche du client','user','tv-p-a-archive-1',NULL,1789635600000);
INSERT INTO "theme_versions" VALUES ('tv-p-b-unique-1','p-b-unique',1,'{"direction":"orbe","sections":4}','Création','pipeline',NULL,NULL,1789549200000);
INSERT INTO "theme_versions" VALUES ('tv-p-b-unique-2','p-b-unique',2,'{"direction":"orbe","sections":8}','Retouche du client','user','tv-p-b-unique-1',NULL,1789635600000);
INSERT INTO "theme_versions" VALUES ('tv-p-c-decouverte-1','p-c-decouverte',1,'{"direction":"orbe","sections":4}','Création','pipeline',NULL,NULL,1789549200000);
INSERT INTO "theme_versions" VALUES ('tv-p-c-decouverte-2','p-c-decouverte',2,'{"direction":"orbe","sections":8}','Retouche du client','user','tv-p-c-decouverte-1',NULL,1789635600000);
INSERT INTO "users" VALUES ('u-historique-a','client-historique-a@exemple.invalid','Client historique A','$2a$10$synthetiquesynthetiquesynthetiquesynthetiqu','client','Europe/Paris',1787734800000);
INSERT INTO "users" VALUES ('u-historique-b','client-historique-b@exemple.invalid','Client historique B','$2a$10$synthetiquesynthetiquesynthetiquesynthetiqu','client','Europe/Paris',1787734800000);
INSERT INTO "users" VALUES ('u-decouverte-c','decouverte-c@exemple.invalid','Ancienne découverte C','$2a$10$synthetiquesynthetiquesynthetiquesynthetiqu','client','Europe/Paris',1787734800000);
INSERT INTO "users" VALUES ('u-admin','admin-synthetique@exemple.invalid','Administrateur synthétique','$2a$10$synthetiquesynthetiquesynthetiquesynthetiqu','admin','Europe/Paris',1787734800000);
INSERT INTO "wallets" VALUES ('u-historique-a',1789462800000,1792054800000,2000000,500000,500000,500000,0,NULL,1789462800000,NULL,0,0,0);
INSERT INTO "wallets" VALUES ('u-historique-b',1789462800000,1792054800000,2000000,500000,3000000,3000000,0,NULL,1789462800000,NULL,0,0,0);
CREATE INDEX projects_user ON projects(user_id);
CREATE INDEX memory_project ON memory(project_id);
CREATE INDEX jobs_pick ON jobs(status, run_at);
CREATE INDEX jobs_project ON jobs(project_id, created_at);
CREATE INDEX jobs_parent ON jobs(parent_id);
CREATE INDEX folders_project ON folders(project_id, parent_id);
CREATE INDEX assets_project ON assets(project_id, folder_id);
CREATE INDEX theme_versions_project ON theme_versions(project_id, number);
CREATE INDEX chat_project ON chat_messages(project_id, thread, created_at);
CREATE INDEX posts_project ON posts(project_id, scheduled_at);
CREATE INDEX posts_due ON posts(status, scheduled_at);
CREATE UNIQUE INDEX ledger_ref ON ledger(type, ref) WHERE ref IS NOT NULL;
CREATE INDEX ai_reservations_held ON ai_reservations(user_id, status, created_at);
CREATE INDEX usage_user ON usage_events(user_id, created_at);
CREATE INDEX ai_calls_project ON ai_calls(project_id, created_at);
CREATE INDEX ai_calls_job ON ai_calls(job_id);
CREATE INDEX ai_calls_candidate ON ai_calls(candidate_id);
CREATE INDEX quality_checks_project ON quality_checks(project_id, created_at);
CREATE INDEX quality_checks_candidate ON quality_checks(candidate_id);
CREATE INDEX quality_checks_asset ON quality_checks(asset_id);
CREATE INDEX expenses_date ON expenses(date);
CREATE UNIQUE INDEX expenses_recurring_period ON expenses(recurring_id, period_key) WHERE recurring_id IS NOT NULL;
CREATE INDEX blog_articles_project ON blog_articles(project_id, deleted_at, updated_at);
CREATE INDEX rate_events_key ON rate_events(key, at);
CREATE INDEX password_resets_user ON password_resets(user_id);
CREATE INDEX task_plans_project ON task_plans(project_id, updated_at);
CREATE INDEX workflows_project ON workflows(project_id, created_at);
CREATE INDEX brand_versions_project ON brand_versions(project_id, created_at);
CREATE UNIQUE INDEX ad_documents_version ON ad_documents(doc_key, version);
CREATE INDEX ad_documents_project ON ad_documents(project_id, created_at);
CREATE UNIQUE INDEX video_documents_version ON video_documents(doc_key, version);
CREATE INDEX video_documents_project ON video_documents(project_id, created_at);
CREATE UNIQUE INDEX content_documents_version ON content_documents(doc_key, version);
CREATE INDEX content_documents_project ON content_documents(project_id, created_at);
CREATE INDEX post_attempts_post ON post_attempts(post_id, started_at);
CREATE INDEX social_automations_due ON social_automations(status, next_run_at);
CREATE INDEX memory_active ON memory(project_id, state, norm_key);
CREATE INDEX notifications_user ON notifications(user_id, created_at);
CREATE INDEX assets_project_role ON assets(project_id, role, created_at);
CREATE INDEX assets_source ON assets(source_asset_id);
CREATE INDEX ai_reservations_job ON ai_reservations(job_id, status);
COMMIT;
