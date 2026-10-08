/**
 * Phase 8B (préparé en 8A) — `scripts/benchmark-seo-v2.ts --check` : vérifications seules, compte administrateur
 * choisi automatiquement, e-mail masqué, aucune clé affichée, mots-clés annoncés comme hypothèses, Router V2 par type
 * d'appel, aucun projet ni tâche créés, aucun appel payant.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

function runCheck(dbFile: string, extraEnv: Record<string, string> = {}, extra: string[] = []) {
  const env = { ...process.env, DATABASE_FILE: dbFile, ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "", GOOGLE_API_KEY: "", GEMINI_API_KEY: "", FAL_KEY: "", FAL_API_KEY: "", ...extraEnv };
  try {
    return { code: 0, out: execFileSync("npx", ["tsx", "scripts/benchmark-seo-v2.ts", "--check", ...extra], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    return { code: err.status, out: `${err.stdout}${err.stderr}` };
  }
}

describe("benchmark SEO V2 --check", () => {
  it("choisit l'administrateur, masque l'e-mail, ne montre aucune clé, annonce les hypothèses et ne crée rien", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-seo-check-"));
    const dbFile = path.join(dir, "studio.db");
    runCheck(dbFile);
    const db = new Database(dbFile);
    db.prepare("INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?,?,?,?,?,?)").run("u-admin", "proprietaire@exemple.fr", "P", "x", "admin", Date.now());
    const count = "SELECT (SELECT COUNT(*) FROM projects) p, (SELECT COUNT(*) FROM jobs) j, (SELECT COUNT(*) FROM ai_calls) c, (SELECT COUNT(*) FROM content_documents) d";
    const before = db.prepare(count).get();
    db.close();

    const key = "sk-ant-test-0123456789abcdef";
    const { code, out } = runCheck(dbFile, { ANTHROPIC_API_KEY: key });
    expect(out).toContain("p***@exemple.fr (administrateur, choisi automatiquement)");
    expect(out).not.toContain("proprietaire@");
    expect(out).not.toContain(key);
    expect(out).toMatch(/✓ Phase 8A présente/);
    expect(out).toMatch(/⚠ Données de mots-clés\s+aucun fournisseur de données SEO branché : mots-clés = HYPOTHÈSES/);
    expect(out).toMatch(/write_page → strong:/);
    expect(out).toMatch(/write_meta → standard:/);
    expect(out).toMatch(/✓ Plafond de coût/);
    expect(out).toMatch(/✓ Aucun secret affiché/);
    // Compte sans forfait payant : rédaction locale seulement (aucun passe-droit administrateur).
    expect(out).toMatch(/⚠ Accès IA du compte\s+inactif/);
    expect(out).toContain("aucun projet créé, aucune tâche, aucun appel payant");
    expect(code).toBe(0);
    const db2 = new Database(dbFile);
    expect(db2.prepare(count).get()).toEqual(before);
    db2.close();
    // Options refusées clairement.
    expect(runCheck(dbFile, {}, ["--type", "inconnu"]).out).toMatch(/--type inconnu/);
    expect(runCheck(dbFile, {}, ["--language", "de"]).out).toMatch(/--language inconnue/);
    expect(runCheck(dbFile, {}, ["--fixture", "Z"]).out).toMatch(/Scénario inconnu/);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 180_000);
});
