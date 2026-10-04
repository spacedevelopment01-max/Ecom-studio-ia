-- À exécuter UNE fois dans Supabase (SQL Editor), après 001_init.sql.
-- Crée le compartiment de stockage PRIVÉ des documents (aucun accès public).
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do update set public = false;

-- Aucune politique d'accès n'est créée : seuls les serveurs d'Allô Papiers, avec la clé
-- « service_role » (jamais envoyée au navigateur), peuvent lire ou écrire des fichiers.
