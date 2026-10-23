/**
 * Prépare les démos intégrales des thèmes (src/lib/theme/theme-demos.ts) : un export statique complet par thème, fait
 * par scripts/reference-static-preview.ts dans un processus à part, avec SA PROPRE base temporaire. Aucune base de projet
 * n'est ouverte, aucun appel IA, rien n'est publié.
 *
 *   npx tsx scripts/prepare-theme-demos.ts            (les cinq thèmes du catalogue actif)
 *   npx tsx scripts/prepare-theme-demos.ts sillon     (un seul)
 *
 * Chaque démo est préparée dans un dossier de travail puis échangée d'un coup avec l'ancienne : le studio sert la démo
 * précédente jusqu'au dernier moment, jamais une démo à moitié écrite. Un thème qui échoue (ex. visuels du kit privé
 * absents) garde son ancienne démo et n'empêche pas les autres.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ALL = ["fraise", "onde", "orbe", "rive", "sillon", "noctil", "traverse", "heuren", "alcove", "museau-club", "souple", "table-saison"];
const dir = process.env.THEME_DEMOS_DIR || path.join(process.env.DATA_DIR || path.join(ROOT, "data"), "theme-demos");
const ids = process.argv.slice(2).filter((x) => ALL.includes(x));
const todo = ids.length ? ids : ALL;
const version = process.env.THEME_DEMOS_VERSION || (() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } })();
const tsx = createRequire(path.join(ROOT, "package.json")).resolve("tsx/cli");
const lock = path.join(dir, ".preparation.json");
fs.mkdirSync(dir, { recursive: true });
// Lancé à la main : le verrou signale la préparation au studio (lancé par le studio : il l'a déjà écrit).
if (!fs.existsSync(lock)) fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, started: Date.now(), themes: todo }));

const work = fs.mkdtempSync(path.join(dir, ".travail-"));
const { DATA_DIR: _d, DATABASE_FILE: _f, ...env } = process.env;
let failed = 0;
try {
  for (const id of todo) {
    const started = Date.now();
    try {
      execFileSync(process.execPath, [tsx, path.join(ROOT, "scripts", "reference-static-preview.ts"), work, `--only=${id}`], { cwd: ROOT, env: { ...env, THEME_DEMOS_VERSION: version }, stdio: ["ignore", "inherit", "inherit"], timeout: 20 * 60_000 });
      const fresh = path.join(work, id);
      if (!fs.existsSync(path.join(fresh, "accueil.html"))) throw new Error("export incomplet (accueil absent)");
      fs.writeFileSync(path.join(fresh, "demo.json"), JSON.stringify({ id, version, date: new Date().toISOString() }, null, 2) + "\n");
      const target = path.join(dir, id), old = path.join(work, `${id}.ancienne`);
      if (fs.existsSync(target)) fs.renameSync(target, old);
      fs.renameSync(fresh, target);
      fs.rmSync(old, { recursive: true, force: true });
      console.log(`[démos] ${id} prête (${Math.round((Date.now() - started) / 1000)} s)`);
    } catch (e) {
      failed++;
      console.error(`[démos] ${id} : échec, démo précédente conservée — ${(e as Error).message}`);
    }
  }
} finally {
  fs.rmSync(work, { recursive: true, force: true });
  fs.rmSync(lock, { force: true });
}
process.exit(failed ? 1 : 0);
