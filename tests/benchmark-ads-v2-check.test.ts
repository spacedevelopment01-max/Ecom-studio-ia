/**
 * Phase 6B (préparé en 6A) — `scripts/benchmark-ads-v2.ts --check` : vérifications seules, sans e-mail à taper (compte administrateur
 * choisi automatiquement), e-mail masqué, aucune clé affichée, aucun projet ni tâche créés, aucun appel payant.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

function runCheck(dbFile: string, extraEnv: Record<string, string> = {}) {
  const env = { ...process.env, DATABASE_FILE: dbFile, ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "", GOOGLE_API_KEY: "", GEMINI_API_KEY: "", FAL_KEY: "", FAL_API_KEY: "", ...extraEnv };
  try {
    return { code: 0, out: execFileSync("npx", ["tsx", "scripts/benchmark-ads-v2.ts", "--check"], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    const err = e as { status: number; stdout: string };
    return { code: err.status, out: err.stdout };
  }
}

describe("benchmark Pub V2 --check", () => {
  it("choisit l'administrateur sans e-mail, le masque, ne montre aucune clé et ne crée rien", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-ads-check-"));
    const dbFile = path.join(dir, "studio.db");
    // Première exécution : crée la base ; on y ajoute ensuite l'administrateur.
    runCheck(dbFile);
    const db = new Database(dbFile);
    db.prepare("INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?,?,?,?,?,?)").run("u-admin", "proprietaire@exemple.fr", "P", "x", "admin", Date.now());
    const before = (db.prepare("SELECT (SELECT COUNT(*) FROM projects) p, (SELECT COUNT(*) FROM jobs) j, (SELECT COUNT(*) FROM ai_calls) c").get() as { p: number; j: number; c: number });
    db.close();

    const key = "sk-ant-test-0123456789abcdef";
    const { code, out } = runCheck(dbFile, { ANTHROPIC_API_KEY: key });
    expect(out).toContain("p***@exemple.fr (administrateur, choisi automatiquement)");
    expect(out).not.toContain("proprietaire@");
    expect(out).not.toContain(key);
    expect(out).toMatch(/✓ Phase 6A présente/);
    expect(out).toMatch(/✓ Router V2 .*rédaction → anthropic:.*contrôle → anthropic:/);
    expect(out).toMatch(/✓ Plafond de coût/);
    expect(out).toMatch(/✓ Aucun secret affiché/);
    // Compte sans forfait payant : accès IA inactif, signalé comme bloquant (aucun passe-droit administrateur).
    expect(out).toMatch(/✗ Accès IA du compte\s+inactif/);
    expect(out).toContain("aucune recherche, aucun appel payant");
    expect(code).toBe(1);

    const db2 = new Database(dbFile);
    const after = db2.prepare("SELECT (SELECT COUNT(*) FROM projects) p, (SELECT COUNT(*) FROM jobs) j, (SELECT COUNT(*) FROM ai_calls) c").get();
    db2.close();
    expect(after).toEqual(before);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120_000);
});
