-- Allô Papiers — schéma initial
-- À exécuter une fois dans Supabase (SQL Editor) ou via `npm run db:migrate`.
--
-- Principe de sécurité : le navigateur ne parle JAMAIS directement à la base.
-- Toutes les lectures/écritures passent par le serveur Next.js, qui vérifie la session
-- et filtre systématiquement par user_id. En défense supplémentaire, la sécurité au
-- niveau des lignes (RLS) est activée SANS aucune politique : les rôles publics de
-- Supabase (anon, authenticated) ne peuvent donc rien lire ni écrire via l'API REST.

create extension if not exists pgcrypto;

create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

-- ───────────────────────── Comptes ─────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  created_at timestamptz not null default now(),
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'plus')),
  stripe_customer_id text unique,
  -- Conservation des documents (jours). null = jusqu'à suppression manuelle.
  retention_days integer default 365 check (retention_days is null or retention_days between 7 and 3650),
  reminders_enabled boolean not null default true,
  terms_version text,
  terms_accepted_at timestamptz,
  ai_consent_at timestamptz,
  -- Récupération du coffre (perte de toutes les clés d'accès) : délai de sécurité
  vault_recovery_requested_at timestamptz,
  vault_recovery_ready_at timestamptz,
  vault_recovery_token_hash text
);

create table if not exists magic_links (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  ip_hash text,
  terms_version text
);
create index if not exists magic_links_email_idx on magic_links (email, created_at desc);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent text,
  ip_hash text,
  -- Vérification renforcée (coffre-fort) valable jusqu'à cette date
  elevated_until timestamptz,
  elevated_method text,
  -- Verrouillage après inactivité (contrôlé par le serveur)
  locked_at timestamptz
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists webauthn_credentials (
  id text primary key,                 -- identifiant de la passkey (base64url)
  user_id uuid not null references users(id) on delete cascade,
  public_key bytea not null,           -- clé PUBLIQUE uniquement ; aucune donnée biométrique
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_type text,
  backed_up boolean not null default false,
  nickname text not null default 'Mon appareil',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists webauthn_user_idx on webauthn_credentials (user_id);

create table if not exists webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  challenge text not null unique,
  purpose text not null check (purpose in ('register', 'stepup')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists email_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  code_hash text not null,
  purpose text not null check (purpose in ('stepup')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz
);

create table if not exists recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists recovery_codes_user_idx on recovery_codes (user_id);

-- Limitation de fréquence (connexion, codes, etc.)
create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- ───────────────────────── Abonnements ─────────────────────────
create table if not exists subscriptions (
  user_id uuid primary key references users(id) on delete cascade,
  stripe_subscription_id text unique,
  status text not null,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Idempotence des webhooks Stripe : un même événement n'est traité qu'une fois
create table if not exists stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ───────────────────────── Dossiers ─────────────────────────
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  goal text,
  organism text,
  next_action text,
  status text not null default 'a_traiter' check (status in ('a_traiter', 'en_attente', 'traite', 'envoye')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists folders_user_idx on folders (user_id);

-- ───────────────────────── Documents ─────────────────────────
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null default 'Document sans titre',
  parcours text not null default 'courrier',
  status text not null default 'uploaded' check (status in ('uploaded', 'analyzing', 'analyzed', 'failed')),
  user_status text not null default 'a_traiter' check (user_status in ('a_traiter', 'en_attente', 'traite', 'envoye')),
  page_count integer not null default 0,
  -- true = même le résultat de l'analyse exige une vérification renforcée
  sensitive boolean not null default false,
  organism text,
  doc_type text,
  urgency text check (urgency in ('vert', 'orange', 'rouge')),
  deadline date,
  deadline_kind text check (deadline_kind in ('ecrite', 'calculee', 'aucune')),
  summary text,
  error_code text,
  expires_at timestamptz
);
create index if not exists documents_user_idx on documents (user_id, created_at desc);

create table if not exists document_files (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  position integer not null,
  storage_key text not null unique,
  mime text not null,
  size_bytes integer not null,
  sha256 text not null,
  page_count integer not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists document_files_doc_idx on document_files (document_id);

-- Fichiers dont la suppression dans le stockage reste à confirmer (reprise automatique)
create table if not exists storage_deletions (
  storage_key text primary key,
  requested_at timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  provider text not null,
  model text not null,
  prompt_version text not null,
  result jsonb not null,
  input_tokens integer,
  output_tokens integer
);
create index if not exists analyses_doc_idx on analyses (document_id, created_at desc);

-- Étapes cochées par l'utilisateur (séparées du résultat de l'IA)
create table if not exists checklist_state (
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  step_index integer not null,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (document_id, step_index)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_doc_idx on chat_messages (document_id, created_at);

create table if not exists comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  document_a uuid not null references documents(id) on delete cascade,
  document_b uuid not null references documents(id) on delete cascade,
  kind text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Quotas ─────────────────────────
-- Une ligne = un crédit consommé (ou réservé pendant une analyse en cours).
-- Les analyses échouées libèrent leur réservation ; les exemples n'en créent jamais.
create table if not exists usage_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  period text not null,                -- mois civil Europe/Paris, ex. '2026-10'
  kind text not null check (kind in ('document', 'chat', 'compare')),
  status text not null check (status in ('reserved', 'consumed')),
  ref_id uuid,                         -- document / comparaison concerné(e)
  created_at timestamptz not null default now()
);
create index if not exists usage_user_period_idx on usage_ledger (user_id, period, kind);
create unique index if not exists usage_one_credit_per_document on usage_ledger (ref_id) where kind = 'document';

-- Réserve un crédit de façon atomique. Le verrou consultatif par utilisateur sérialise
-- les requêtes simultanées : impossible de dépasser le quota en cliquant plusieurs fois.
create or replace function reserve_credit(p_user uuid, p_kind text, p_ref uuid, p_period text, p_limit integer)
returns text
language plpgsql
as $$
declare
  used integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('quota:' || p_user::text, 0));
  if p_kind = 'document' and exists (select 1 from usage_ledger where kind = 'document' and ref_id = p_ref) then
    return 'already_reserved';
  end if;
  select count(*) into used
    from usage_ledger
   where user_id = p_user and period = p_period and kind = p_kind
     and (status = 'consumed' or created_at > now() - interval '15 minutes');
  if used >= p_limit then
    return 'quota_exceeded';
  end if;
  -- Une réservation abandonnée depuis plus de 15 minutes (plantage) est nettoyée.
  delete from usage_ledger
   where user_id = p_user and status = 'reserved' and created_at <= now() - interval '15 minutes';
  insert into usage_ledger (user_id, period, kind, status, ref_id)
  values (p_user, p_period, p_kind, 'reserved', p_ref);
  return 'reserved';
end;
$$;

-- ───────────────────────── Dossiers : chronologie et pièces ─────────────────────────
create table if not exists folder_events (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references folders(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  event_date date not null,
  kind text not null check (kind in ('courrier_recu', 'reponse_envoyee', 'appel', 'rendez_vous', 'autre')),
  label text not null,
  document_id uuid references documents(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists folder_events_idx on folder_events (folder_id, event_date);

create table if not exists folder_pieces (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references folders(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  label text not null,
  status text not null default 'manquante' check (status in ('recue', 'manquante')),
  document_id uuid references documents(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Échéances et rappels ─────────────────────────
create table if not exists deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  folder_id uuid references folders(id) on delete cascade,
  label text not null,
  due_date date not null,
  source text not null check (source in ('document', 'calculee', 'utilisateur')),
  source_quote text,
  -- Un rappel n'est programmé que si l'utilisateur a CONFIRMÉ la date.
  confirmed_at timestamptz,
  remind_days integer[] not null default '{7,2,0}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists deadlines_user_idx on deadlines (user_id, due_date);

create table if not exists reminder_sends (
  deadline_id uuid not null references deadlines(id) on delete cascade,
  days_before integer not null,
  due_date date not null,
  sent_at timestamptz not null default now(),
  primary key (deadline_id, days_before, due_date)
);

-- ───────────────────────── Courriers et rendez-vous ─────────────────────────
create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  template_id text,
  document_id uuid references documents(id) on delete set null,
  folder_id uuid references folders(id) on delete set null,
  title text not null,
  answers jsonb not null default '{}',
  sender jsonb not null default '{}',
  recipient jsonb not null default '{}',
  body text not null default '',
  edited_by_user boolean not null default false,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists letters_user_idx on letters (user_id, updated_at desc);

create table if not exists appointment_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  target text not null check (target in ('france_services', 'organisme', 'avocat', 'notaire', 'service_paie')),
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Envois recommandés ─────────────────────────
create table if not exists send_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  letter_id uuid references letters(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'validated', 'payment_pending', 'paid', 'submitted', 'failed', 'cancelled')),
  provider_mode text not null check (provider_mode in ('test', 'real')),
  service text not null,                -- ex. 'lrar' (lettre recommandée avec avis de réception)
  sender jsonb not null,
  recipient jsonb not null,
  recipient_source text not null check (recipient_source in ('courrier', 'annuaire', 'saisie')),
  body text not null,
  attachments jsonb not null default '[]',
  price_cents integer not null,
  currency text not null default 'eur',
  content_hash text not null,           -- empreinte de (texte, destinataire, pièces, prix, nature)
  validated_hash text,                  -- empreinte au moment de la validation explicite
  validated_at timestamptz,
  validation_statement text,
  validation_ip_hash text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  submitted_at timestamptz,
  provider_reference text,
  tracking_number text,
  tracking_is_fictive boolean not null default false,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists send_requests_user_idx on send_requests (user_id, created_at desc);

create table if not exists send_events (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references send_requests(id) on delete cascade,
  at timestamptz not null default now(),
  status text not null,
  detail text
);

-- ───────────────────────── Journal des accès sensibles ─────────────────────────
-- Ne contient JAMAIS le contenu des documents : uniquement l'action et l'identifiant.
create table if not exists audit_events (
  id bigserial primary key,
  user_id uuid references users(id) on delete cascade,
  at timestamptz not null default now(),
  action text not null,
  target_type text,
  target_id text,
  ip_hash text,
  user_agent text,
  meta jsonb not null default '{}'
);
create index if not exists audit_user_idx on audit_events (user_id, at desc);

-- ───────────────────────── Verrouillage des accès publics ─────────────────────────
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon';
    execute 'revoke all on all functions in schema public from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema public from authenticated';
    execute 'revoke all on all functions in schema public from authenticated';
  end if;
end $$;

insert into schema_migrations (version) values ('001_init') on conflict do nothing;
