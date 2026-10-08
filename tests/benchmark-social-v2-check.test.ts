/**
 * Phase 9B (préparé en 9A) — `scripts/benchmark-social-v2.ts --check` et `--dry-run` : vérifications gratuites,
 * administrateur choisi automatiquement, e-mail masqué, aucune clé affichée ; --check ne crée rien ; --dry-run crée
 * le calendrier (gratuit) sans aucune production payante ni publication.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

function runScript(dbFile: string, extra: string[], env: Record<string, string> = {}) {
  const e = { ...process.env, DATABASE_FILE: dbFile, ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "", GOOGLE_API_KEY: "", GEMINI_API_KEY: "", FAL_KEY: "", FAL_API_KEY: "", ...env };
  try {
    return { code: 0, out: execFileSync("npx", ["tsx", "scripts/benchmark-social-v2.ts", ...extra], { env: e, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (err) {
    const x = err as { status: number; stdout: string; stderr: string };
    return { code: x.status, out: `${x.stdout}${x.stderr}` };
  }
}

describe("benchmark Social V2", () => {
  it("--check : rien créé, aucune clé, aucune publication annoncée ; --dry-run : calendrier gratuit, 0 publication", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-social-"));
    const dbFile = path.join(dir, "studio.db");
    runScript(dbFile, ["--check"]);
    const db = new Database(dbFile);
    db.prepare("INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?,?,?,?,?,?)").run("u-admin", "proprietaire@exemple.fr", "P", "x", "admin", Date.now());
    const count = "SELECT (SELECT COUNT(*) FROM projects) p, (SELECT COUNT(*) FROM jobs) j, (SELECT COUNT(*) FROM ai_calls) c, (SELECT COUNT(*) FROM posts) s";
    const before = db.prepare(count).get();
    db.close();
    const key = "sk-ant-test-0123456789abcdef";
    const { code, out } = runScript(dbFile, ["--check"], { ANTHROPIC_API_KEY: key });
    expect(out).toContain("p***@exemple.fr (administrateur, choisi automatiquement)");
    expect(out).not.toContain(key);
    expect(out).toMatch(/✓ Phase 9A présente/);
    expect(out).toMatch(/Instagram : PRÊT À CONNECTER \(non vérifié\)/);
    expect(out).toMatch(/LinkedIn : EXPORT/);
    expect(out).toMatch(/✓ Publication\s+AUCUNE/);
    expect(out).toContain("aucun projet créé, aucune tâche, aucun appel payant, aucune publication");
    expect(code).toBe(0);
    const db2 = new Database(dbFile);
    expect(db2.prepare(count).get()).toEqual(before);
    db2.close();
    const dry = runScript(dbFile, ["--fixture", "C", "--dry-run", "--days", "3", "--posts-per-day", "2"]);
    expect(dry.out).toMatch(/6 publications planifiées \(3 j × 2\)/);
    expect(dry.out).toMatch(/--dry-run : rien produit/);
    expect(dry.out).toMatch(/publications : 0 \(aucune\)/);
    const db3 = new Database(dbFile);
    expect(db3.prepare("SELECT COUNT(*) n FROM posts WHERE status IN ('scheduled','publishing','published')").get()).toEqual({ n: 0 });
    expect(db3.prepare("SELECT COUNT(*) n FROM ai_calls").get()).toEqual({ n: 0 });
    db3.close();
    expect(runScript(dbFile, ["--posts-per-day", "6"]).out).toMatch(/--posts-per-day : 1 à 5/);
    for (const f of fs.readdirSync("reports").filter((x) => x.startsWith("benchmark-social-v2-C-"))) fs.rmSync(path.join("reports", f));
    fs.rmSync(dir, { recursive: true, force: true });
  }, 240_000);
});
