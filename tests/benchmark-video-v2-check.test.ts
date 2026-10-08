/**
 * Phase 7B (préparé en 7A) — `scripts/benchmark-video-v2.ts --check` : vérifications seules, compte administrateur choisi
 * automatiquement, e-mail masqué, aucune clé affichée, capacités vidéo vérifiées et tarifs, aucun projet ni tâche
 * créés, aucun appel payant.
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
    return { code: 0, out: execFileSync("npx", ["tsx", "scripts/benchmark-video-v2.ts", "--check"], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    const err = e as { status: number; stdout: string };
    return { code: err.status, out: err.stdout };
  }
}

describe("benchmark Vidéo V2 --check", () => {
  it("choisit l'administrateur sans e-mail, le masque, ne montre aucune clé, annonce les capacités vérifiées et ne crée rien", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-video-check-"));
    const dbFile = path.join(dir, "studio.db");
    runCheck(dbFile);
    const db = new Database(dbFile);
    db.prepare("INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?,?,?,?,?,?)").run("u-admin", "proprietaire@exemple.fr", "P", "x", "admin", Date.now());
    const before = db.prepare("SELECT (SELECT COUNT(*) FROM projects) p, (SELECT COUNT(*) FROM jobs) j, (SELECT COUNT(*) FROM ai_calls) c, (SELECT COUNT(*) FROM video_documents) v").get();
    db.close();

    const key = "sk-ant-test-0123456789abcdef";
    const { code, out } = runCheck(dbFile, { ANTHROPIC_API_KEY: key, FAL_KEY: "fal-test-key-0123456789:abcdef0123456789" });
    expect(out).toContain("p***@exemple.fr (administrateur, choisi automatiquement)");
    expect(out).not.toContain("proprietaire@");
    expect(out).not.toContain(key);
    expect(out).not.toContain("fal-test-key");
    expect(out).toMatch(/✓ Phase 7A présente/);
    expect(out).toMatch(/✓ ffmpeg/);
    expect(out).toMatch(/textToVideo:annoncé/);
    expect(out).toMatch(/imageToVideo:vérifié/);
    expect(out).toMatch(/⚠ Voix off\s+aucun fournisseur de synthèse vocale/);
    expect(out).toMatch(/✓ Plafond de coût/);
    expect(out).toMatch(/✓ Aucun secret affiché/);
    // Compte sans forfait payant : accès IA inactif (aucun passe-droit administrateur).
    expect(out).toMatch(/✗ Accès IA du compte\s+inactif/);
    expect(out).toContain("aucun projet créé, aucune tâche, aucun appel payant");
    expect(code).toBe(1);
    const db2 = new Database(dbFile);
    expect(db2.prepare("SELECT (SELECT COUNT(*) FROM projects) p, (SELECT COUNT(*) FROM jobs) j, (SELECT COUNT(*) FROM ai_calls) c, (SELECT COUNT(*) FROM video_documents) v").get()).toEqual(before);
    db2.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120_000);
});
