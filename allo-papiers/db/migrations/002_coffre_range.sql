-- Allô Papiers — coffre-fort rangé automatiquement et pièces justificatives jointes en un clic.
-- À exécuter après 001_init.sql (Supabase › SQL Editor, ou `npm run db:migrate`).

-- Nature du document : courrier à comprendre, ou simple pièce à ranger dans le coffre.
alter table documents add column if not exists kind text not null default 'courrier';
alter table documents drop constraint if exists documents_kind_check;
alter table documents add constraint documents_kind_check check (kind in ('courrier', 'piece'));

-- Classement dans le coffre (proposé par l'IA ou choisi par l'utilisateur, toujours modifiable).
alter table documents add column if not exists vault_category text;
alter table documents add column if not exists piece_type text;
alter table documents add column if not exists piece_label text;
alter table documents add column if not exists piece_period text;      -- ex. « 2025 », « mars 2026 »
alter table documents add column if not exists piece_date date;        -- date écrite sur le document
alter table documents add column if not exists valid_until date;       -- uniquement si une date de validité est écrite
alter table documents add column if not exists issuer text;
alter table documents add column if not exists classified_by text;
alter table documents drop constraint if exists documents_classified_by_check;
alter table documents add constraint documents_classified_by_check check (classified_by is null or classified_by in ('ia', 'utilisateur', 'demonstration'));
alter table documents add column if not exists classified_at timestamptz;
create index if not exists documents_vault_idx on documents (user_id, piece_type, piece_date desc nulls last);

-- Pièces jointes choisies pour un courrier (identifiants de documents du coffre) et pièces demandées.
alter table letters add column if not exists attachments jsonb not null default '[]';
alter table letters add column if not exists needs jsonb not null default '[]';

-- Nouveau type de crédit : classement automatique d'une pièce par l'IA.
alter table usage_ledger drop constraint if exists usage_ledger_kind_check;
alter table usage_ledger add constraint usage_ledger_kind_check check (kind in ('document', 'chat', 'compare', 'classement'));

insert into schema_migrations (version) values ('002_coffre_range') on conflict do nothing;
