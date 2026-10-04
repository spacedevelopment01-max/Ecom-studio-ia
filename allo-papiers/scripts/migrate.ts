/**
 * Applique les migrations SQL dans l'ordre. Usage : DATABASE_URL=... npm run db:migrate
 * (Sur Supabase, vous pouvez aussi coller le contenu de db/migrations/*.sql dans le SQL Editor.)
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

export async function migrate(url: string, log = console.log) {
  const local = /localhost|127\.0\.0\.1/.test(url);
  const db = postgres(url, { ssl: local ? false : "require", max: 1, onnotice: () => {} });
  try {
    await db`create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())`;
    const dir = path.join(import.meta.dirname, "..", "db", "migrations");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      const version = file.replace(/\.sql$/, "");
      const done = await db`select 1 from schema_migrations where version = ${version}`;
      if (done.length) continue;
      await db.unsafe(readFileSync(path.join(dir, file), "utf8"));
      await db`insert into schema_migrations (version) values (${version}) on conflict do nothing`;
      log(`migration appliquée : ${version}`);
    }
  } finally {
    await db.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL manquant");
    process.exit(1);
  }
  migrate(url).then(() => console.log("Base à jour."));
}
