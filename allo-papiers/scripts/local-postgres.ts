/**
 * Lance un vrai PostgreSQL local (sans Docker) pour le développement et les tests.
 * Usage : npm run db:local  → affiche la DATABASE_URL à mettre dans .env.local
 */
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import { existsSync } from "node:fs";
import { migrate } from "./migrate";

export async function startLocalPostgres(dir: string, port: number, persistent = true) {
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: "postgres",
    password: "postgres",
    port,
    persistent,
    onLog: () => {},
    onError: () => {},
  });
  if (!existsSync(path.join(dir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase("allopapiers");
  } catch {
    /* existe déjà */
  }
  const url = `postgres://postgres:postgres@127.0.0.1:${port}/allopapiers`;
  await migrate(url, () => {});
  return { pg, url };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = path.join(process.cwd(), ".data", "postgres");
  startLocalPostgres(dir, 54329).then(({ url }) => {
    console.log(`PostgreSQL local prêt.\nDATABASE_URL=${url}\n(Ctrl+C pour arrêter)`);
  });
}
