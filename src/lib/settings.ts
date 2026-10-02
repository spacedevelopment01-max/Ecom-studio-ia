/** Réglages d'administration persistés (clés chiffrées). */
import { all, now, one, run } from "./db";
import { decrypt, encrypt } from "./secrets";

export function getSetting(key: string): string | null {
  const row = one<{ value: string; secret: number }>("SELECT value, secret FROM settings WHERE key = ?", key);
  if (!row) return process.env[envName(key)] ?? null;
  return row.secret ? decrypt(row.value) : row.value;
}

export function getJsonSetting<T>(key: string, fallback: T): T {
  const v = getSetting(key);
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: string | null, secret = false) {
  if (value == null || value === "") {
    run("DELETE FROM settings WHERE key = ?", key);
    return;
  }
  run(
    "INSERT INTO settings (key, value, secret, updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, secret=excluded.secret, updated_at=excluded.updated_at",
    key,
    secret ? encrypt(value)! : value,
    secret ? 1 : 0,
    now(),
  );
}

export function setJsonSetting(key: string, value: unknown) {
  setSetting(key, JSON.stringify(value));
}

export function listSettingKeys(prefix: string) {
  return all<{ key: string; secret: number; updated_at: number }>(
    "SELECT key, secret, updated_at FROM settings WHERE key LIKE ?",
    `${prefix}%`,
  );
}

/** Une clé « provider.anthropic.apiKey » peut aussi venir de PROVIDER_ANTHROPIC_APIKEY. */
function envName(key: string) {
  return key.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
}

export function appUrl(): string {
  return (getSetting("app.url") || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
