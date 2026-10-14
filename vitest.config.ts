import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { defineConfig } from "vitest/config";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-test-"));
// Données des tests (base, fichiers générés : ~300 Mo par lancement) supprimées à la fin, sinon le disque se remplit.
process.on("exit", () => fs.rmSync(dataDir, { recursive: true, force: true }));

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { include: ["tests/**/*.test.ts"], env: { DATA_DIR: dataDir, STOCK_OFFLINE: "1", AI_PRICES_CHECKEDAT: String(Date.now()) }, pool: "forks", testTimeout: 60_000 },
});
