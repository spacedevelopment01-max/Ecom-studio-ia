import "server-only";
import postgres from "postgres";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __apSql: postgres.Sql | undefined;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** Connexion unique à Postgres (Supabase en production). */
export function sql(): postgres.Sql {
  if (globalThis.__apSql) return globalThis.__apSql;
  const url = env.databaseUrl;
  if (!url) throw new ConfigError("DATABASE_URL manquant : la base de données n'est pas configurée.");
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  globalThis.__apSql = postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    ssl: isLocal ? false : "require",
    prepare: false, // compatible avec le pooler Supabase (mode transaction)
    idle_timeout: 20,
    onnotice: () => {},
    transform: { undefined: null },
  });
  return globalThis.__apSql;
}
