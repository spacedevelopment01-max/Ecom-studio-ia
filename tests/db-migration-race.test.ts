/**
 * Ouverture simultanée d'une base neuve par deux processus (site + worker, ou tests en parallèle) : la migration
 * qui ajoute des colonnes ne doit jamais échouer sur « duplicate column name ».
 */
import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("migration de la base : ouverture concurrente", () => {
  it("huit processus ouvrent la même base neuve en même temps sans erreur", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "db-race-"));
    const file = path.join(dir, "studio.db");
    const code = `import { one } from "./src/lib/db"; one("SELECT 1"); console.log("ok");`;
    const runs = await Promise.all(
      Array.from({ length: 8 }, () =>
        new Promise<{ code: number | null; out: string }>((resolve) => {
          const p = spawn("npx", ["tsx", "-e", code], { env: { ...process.env, DATABASE_FILE: file }, cwd: process.cwd() });
          let out = "";
          p.stdout.on("data", (d) => (out += d));
          p.stderr.on("data", (d) => (out += d));
          p.on("close", (c) => resolve({ code: c, out }));
        }),
      ),
    );
    for (const r of runs) expect(r.out).not.toMatch(/duplicate column/);
    expect(runs.filter((r) => r.code === 0).length).toBe(8);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120_000);
});
