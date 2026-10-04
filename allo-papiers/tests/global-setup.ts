import { rmSync } from "node:fs";
import { startLocalPostgres } from "../scripts/local-postgres";

/** Démarre un VRAI PostgreSQL local, vierge, pour les tests d'intégration. */
export default async function setup() {
  const dir = "/tmp/ap-test-pg";
  rmSync(dir, { recursive: true, force: true });
  const { pg } = await startLocalPostgres(dir, 54340, false);
  return async () => {
    await pg.stop();
  };
}
