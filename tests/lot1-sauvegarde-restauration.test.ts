/**
 * Lot 1 (issue #163, action 03) : sauvegarde cohérente pendant des écritures, restauration vérifiée, refus de
 * remplacer des données, sauvegarde altérée refusée, copie de recette neutralisée, et migration d'une base historique
 * SYNTHÉTIQUE (schéma d'avant les forfaits V2, commit dcfc13b1) par le code actuel, rejouée deux fois.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";
import { backup, neutralize, restore, verify } from "../scripts/lot1/outils";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "lot1-sauvegarde-"));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
const dir = (name: string) => path.join(root, name);

/** Petit dossier de données : base WAL avec deux tables appariées (écrites dans la même transaction) et des médias. */
function makeData(name: string) {
  const data = dir(name);
  fs.mkdirSync(path.join(data, "storage", "p1"), { recursive: true });
  const d = new Database(path.join(data, "studio.db"));
  d.pragma("journal_mode = WAL");
  d.exec(`CREATE TABLE projects (id TEXT PRIMARY KEY, user_id TEXT NOT NULL);
    CREATE TABLE assets (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), storage_key TEXT NOT NULL, thumb_key TEXT);
    CREATE TABLE pairs_a (n INTEGER PRIMARY KEY); CREATE TABLE pairs_b (n INTEGER PRIMARY KEY);
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, secret INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
    CREATE TABLE jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL, locked_by TEXT, locked_until INTEGER, message TEXT NOT NULL DEFAULT '');
    CREATE TABLE connections (id TEXT PRIMARY KEY, access_token TEXT, refresh_token TEXT, status TEXT NOT NULL, status_message TEXT);`);
  d.prepare("INSERT INTO projects VALUES ('p1','u1')").run();
  for (let i = 0; i < 3; i++) {
    fs.writeFileSync(path.join(data, "storage", "p1", `m${i}.webp`), crypto.randomBytes(1024 + i));
    d.prepare("INSERT INTO assets VALUES (?, 'p1', ?, NULL)").run(`a${i}`, `p1/m${i}.webp`);
  }
  d.prepare("INSERT INTO settings VALUES ('stripe.secretKey','chiffre-synthetique',1,0), ('public.url','https://x.invalid',0,0)").run();
  d.prepare("INSERT INTO jobs VALUES ('j1','queued',NULL,NULL,''), ('j2','running','w',1,''), ('j3','done',NULL,NULL,'')").run();
  d.prepare("INSERT INTO connections VALUES ('c1','jeton','renouv','active',NULL)").run();
  d.close();
  return data;
}

describe("Lot 1 — sauvegarde et restauration", () => {
  it("prend un instantané cohérent pendant que le site et le worker écrivent, sans les arrêter", async () => {
    const data = makeData("concurrence");
    // Processus d'écriture concurrent : chaque transaction insère la même valeur dans deux tables.
    const writer = spawn(process.execPath, ["-e", `
      const D = require("better-sqlite3"); const d = new D(${JSON.stringify(path.join(data, "studio.db"))});
      d.pragma("busy_timeout = 8000"); let n = 0;
      const pair = d.transaction((i) => { d.prepare("INSERT INTO pairs_a VALUES (?)").run(i); d.prepare("INSERT INTO pairs_b VALUES (?)").run(i); });
      const stop = Date.now() + 4000; while (Date.now() < stop) pair(++n);
      process.stdout.write(String(n));`], { cwd: process.cwd(), stdio: ["ignore", "pipe", "inherit"] });
    let written = "";
    writer.stdout.on("data", (c) => (written += c));
    await new Promise((r) => setTimeout(r, 600));
    const m = await backup({ dataDir: data, dest: dir("concurrence-sauvegarde"), env: {} });
    await new Promise((r) => writer.on("exit", r));
    const snap = new Database(path.join(dir("concurrence-sauvegarde"), "studio.db"), { readonly: true });
    const a = (snap.prepare("SELECT COUNT(*) c FROM pairs_a").get() as { c: number }).c;
    const b = (snap.prepare("SELECT COUNT(*) c FROM pairs_b").get() as { c: number }).c;
    snap.close();
    expect(m.database.integrity).toBe("ok");
    expect(a).toBe(b); // aucune transaction à moitié copiée
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(Number(written)); // l'écriture a continué pendant et après la copie
    expect(verify(dir("concurrence-sauvegarde")).checks.every((c) => c.ok)).toBe(true);
    // Le manifeste ne contient que des noms de réglages, jamais de valeur.
    const raw = fs.readFileSync(path.join(dir("concurrence-sauvegarde"), "manifeste.json"), "utf8");
    expect(raw).toContain("stripe.secretKey");
    expect(raw).not.toContain("chiffre-synthetique");
  });

  it("restaure dans un autre dossier, vérifie tout et refuse de remplacer des données ou une sauvegarde altérée", async () => {
    const data = makeData("source");
    await backup({ dataDir: data, dest: dir("sauvegarde"), env: {} });
    const checks = restore(dir("sauvegarde"), dir("restauree"));
    expect(checks.filter((c) => !c.ok)).toEqual([]);
    const r = new Database(path.join(dir("restauree"), "studio.db"), { readonly: true });
    expect(r.prepare("SELECT id, user_id FROM projects").all()).toEqual([{ id: "p1", user_id: "u1" }]);
    r.close();
    expect(fs.readFileSync(path.join(dir("restauree"), "storage", "p1", "m1.webp"))).toEqual(fs.readFileSync(path.join(data, "storage", "p1", "m1.webp")));
    expect(() => restore(dir("sauvegarde"), dir("restauree"))).toThrow(/n'est pas vide/);
    expect(() => restore(dir("sauvegarde"), path.join(data, "copie"), { forbid: [data] })).toThrow(/en service/);
    await expect(backup({ dataDir: data, dest: path.join(data, "sauvegarde-dedans"), env: {} })).rejects.toThrow(/hors du dossier/);
    // Un média altéré après la sauvegarde : restauration refusée, rien n'est copié.
    fs.appendFileSync(path.join(dir("sauvegarde"), "storage", "p1", "m0.webp"), "x");
    expect(() => restore(dir("sauvegarde"), dir("restauree-2"))).toThrow(/Sauvegarde invalide/);
    expect(fs.existsSync(dir("restauree-2"))).toBe(false);
  });

  it("signale un média référencé mais absent au moment de la sauvegarde", async () => {
    const data = makeData("manquant");
    fs.rmSync(path.join(data, "storage", "p1", "m2.webp"));
    const m = await backup({ dataDir: data, dest: dir("manquant-sauvegarde"), env: {} });
    expect(m.storage.missing).toEqual([{ assetId: "a2", column: "storage_key" }]);
    expect(verify(dir("manquant-sauvegarde")).checks.find((c) => c.name.startsWith("références"))?.ok).toBe(false);
  });

  it("neutralise une copie de recette : tâches en pause, secrets et jetons retirés, refus sur les données en service", async () => {
    const data = makeData("recette-source");
    await backup({ dataDir: data, dest: dir("recette-sauvegarde"), env: {} });
    restore(dir("recette-sauvegarde"), dir("recette"));
    expect(() => neutralize(data, { forbid: [data] })).toThrow(/en service/);
    const r = neutralize(dir("recette"));
    expect(r).toMatchObject({ jobsEnPause: 2, secretsRetires: 1, connexionsCoupees: 1 });
    const d = new Database(path.join(dir("recette"), "studio.db"), { readonly: true });
    expect(d.prepare("SELECT id, status FROM jobs ORDER BY id").all()).toEqual([{ id: "j1", status: "paused" }, { id: "j2", status: "paused" }, { id: "j3", status: "done" }]);
    expect(d.prepare("SELECT key FROM settings WHERE secret = 1").all()).toEqual([]);
    expect(d.prepare("SELECT access_token, refresh_token, status FROM connections").get()).toEqual({ access_token: null, refresh_token: null, status: "revoked" });
    d.close();
  });

  it("migre une base historique synthétique d'avant les forfaits V2 sans perte, deux fois de suite, puis la restaure", () => {
    const hist = dir("historique");
    fs.mkdirSync(path.join(hist, "storage"), { recursive: true });
    const d = new Database(path.join(hist, "studio.db"));
    d.exec(fs.readFileSync(path.join(import.meta.dirname, "fixtures", "lot1", "base-avant-forfaits-v2-dcfc13b1.sql"), "utf8"));
    for (const a of d.prepare("SELECT storage_key k FROM assets UNION SELECT thumb_key FROM assets WHERE thumb_key IS NOT NULL").all() as { k: string }[]) {
      fs.mkdirSync(path.dirname(path.join(hist, "storage", a.k)), { recursive: true });
      fs.writeFileSync(path.join(hist, "storage", a.k), crypto.createHash("sha256").update(a.k).digest());
    }
    d.close();
    fs.writeFileSync(path.join(hist, "fabrication.json"), JSON.stringify({ synthetic: true, commit: "dcfc13b184cb4f2dc43d4f5473da45f60340b1f9" }));
    const report = path.join(root, "rapport.json");
    const tsx = path.join(process.cwd(), "node_modules", ".bin", "tsx");
    execFileSync(tsx, ["scripts/lot1/essai-complet.ts", "--source", hist, "--code", process.cwd(), "--travail", dir("essai"), "--rapport", report], { env: { PATH: process.env.PATH } as unknown as NodeJS.ProcessEnv, stdio: "pipe" });
    const r = JSON.parse(fs.readFileSync(report, "utf8"));
    expect(r.reussi).toBe(true);
    expect(r.controles.filter((c: { ok: boolean }) => !c.ok)).toEqual([]);
    // Six projets conservés ; l'ancien abonnement payé du compte A rattaché à un seul projet (règle existante), les
    // autres projets du compte restent visibles ; l'ancienne découverte est masquée, pas supprimée.
    expect(r.projets).toHaveLength(6);
    expect(r.abonnements.map((s: { project_id: string }) => s.project_id).sort()).toEqual(["p-a-services", "p-b-unique"]);
    expect(r.projets.find((p: { id: string }) => p.id === "p-c-decouverte").hidden).toBe(1);
    expect(r.projets.filter((p: { user_id: string; hidden: number }) => p.user_id === "u-historique-a" && p.hidden === 0)).toHaveLength(4);
    expect(r.migration.sauvegardeAutomatique).toHaveLength(1);
    expect(r.restauration).toEqual({ comptes: 4, projets: 6 });
  }, 120_000);
});
