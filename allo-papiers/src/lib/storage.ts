import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";
import { ConfigError, sql } from "./db";
import { decryptBlob, encryptBlob } from "./crypto";

/**
 * Stockage privé des fichiers.
 * - Production : bucket PRIVÉ Supabase Storage (région UE choisie à la création du projet).
 *   Aucune URL publique : les fichiers sont lus par le serveur puis transmis après contrôle.
 * - Développement : dossier local .data/storage.
 * Chaque fichier est chiffré (AES-256-GCM) avant de quitter le serveur.
 */
interface Backend {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(keys: string[]): Promise<void>;
}

class LocalBackend implements Backend {
  private root = path.join(process.cwd(), ".data", "storage");
  private file(key: string) {
    if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes("..")) throw new Error("Clé de stockage invalide");
    return path.join(this.root, key);
  }
  async put(key: string, data: Buffer) {
    await fs.mkdir(path.dirname(this.file(key)), { recursive: true });
    await fs.writeFile(this.file(key), data);
  }
  async get(key: string) {
    return fs.readFile(this.file(key));
  }
  async remove(keys: string[]) {
    for (const k of keys) await fs.rm(this.file(k), { force: true });
  }
}

class SupabaseBackend implements Backend {
  private async bucket() {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(env.supabaseUrl!, env.supabaseServiceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    return client.storage.from(env.storageBucket);
  }
  async put(key: string, data: Buffer) {
    const { error } = await (await this.bucket()).upload(key, data, { contentType: "application/octet-stream", upsert: false });
    if (error) throw new Error(`Stockage : envoi refusé (${error.message})`);
  }
  async get(key: string) {
    const { data, error } = await (await this.bucket()).download(key);
    if (error || !data) throw new Error("Stockage : fichier introuvable");
    return Buffer.from(await data.arrayBuffer());
  }
  async remove(keys: string[]) {
    if (keys.length === 0) return;
    const { error } = await (await this.bucket()).remove(keys);
    if (error) throw new Error(`Stockage : suppression refusée (${error.message})`);
  }
}

function backend(): Backend {
  if (env.supabaseUrl && env.supabaseServiceKey) return new SupabaseBackend();
  if (env.isProduction && process.env.ALLOW_LOCAL_STORAGE !== "true") {
    throw new ConfigError("Stockage Supabase non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  return new LocalBackend();
}

export async function putEncrypted(key: string, plain: Buffer) {
  await backend().put(key, encryptBlob(plain, key));
}

export async function getDecrypted(key: string): Promise<Buffer> {
  return decryptBlob(await backend().get(key), key);
}

/**
 * Supprime réellement les fichiers du stockage. En cas d'échec, la clé est notée dans
 * storage_deletions et la suppression est retentée par la tâche planifiée.
 */
export async function deleteFiles(keys: string[]) {
  if (keys.length === 0) return;
  try {
    await backend().remove(keys);
    await sql()`delete from storage_deletions where storage_key = any(${keys})`;
  } catch (e) {
    for (const k of keys) {
      await sql()`
        insert into storage_deletions (storage_key, last_error) values (${k}, ${e instanceof Error ? e.message.slice(0, 200) : "?"})
        on conflict (storage_key) do update set attempts = storage_deletions.attempts + 1, last_error = excluded.last_error`;
    }
  }
}

export async function retryPendingDeletions(): Promise<number> {
  const rows = await sql()<{ storage_key: string }[]>`select storage_key from storage_deletions order by requested_at limit 200`;
  if (rows.length) await deleteFiles(rows.map((r) => r.storage_key));
  return rows.length;
}
