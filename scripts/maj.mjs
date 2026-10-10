/**
 * Mise à jour du studio en une commande (« npm run maj ») — dans le bon ordre, pour ne jamais changer les fichiers
 * sous un studio qui tourne :
 *  1. arrête le studio en cours (lancé par « npm run dev », y compris celui que Codespaces démarre tout seul) ;
 *  2. récupère la dernière version (git pull) ;
 *  3. installe ce qui a changé (npm install) ;
 *  4. vide le cache de compilation (.next) ;
 *  5. relance le studio en mode production (npm run studio : reconstruit puis lance) — ou « npm run maj -- --dev »
 *     pour le mode développement.
 * Les données (base, fichiers, réglages) ne sont jamais touchées.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { portInUse } from "./dev.mjs";

const PORT = Number(process.env.STUDIO_DEV_PORT || 3000);
const say = (m) => console.log(`\n▶ ${m}`);
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    console.error(`\n✗ « ${cmd} ${args.join(" ")} » a échoué (code ${r.status}). Rien d'autre n'a été fait ; le studio est arrêté.`);
    process.exit(r.status ?? 1);
  }
};

// 1. Arrêt du studio en cours.
say("Arrêt du studio en cours…");
const pidFile = path.resolve(".studio-dev.pid");
const pid = fs.existsSync(pidFile) ? Number(fs.readFileSync(pidFile, "utf8").trim()) : 0;
if (pid && alive(pid)) {
  process.kill(pid, "SIGTERM");
  for (let i = 0; i < 40 && (alive(pid) || (await portInUse(PORT))); i++) await wait(500);
}
if (await portInUse(PORT)) {
  console.error(`\n✗ Le port ${PORT} est toujours occupé par un autre programme : fermez le terminal où le studio tourne (Ctrl+C), puis relancez « npm run maj ».`);
  process.exit(1);
}
console.log("  Studio arrêté.");

// 2 à 4. Mise à jour.
if (!process.env.MAJ_SANS_GIT) {
  say("Récupération de la dernière version (git pull)…");
  run("git", ["pull", "--ff-only"]);
}
say("Installation des dépendances (npm install)…");
run("npm", ["install", "--no-audit", "--no-fund"]);
say("Nettoyage du cache de compilation (.next)…");
fs.rmSync(".next", { recursive: true, force: true });

// 5. Relance.
const mode = process.argv.includes("--dev") ? "dev" : "studio";
say(`Relance du studio (npm run ${mode})… (Ctrl+C pour l'arrêter)`);
process.exit(spawnSync("npm", ["run", mode], { stdio: "inherit", shell: process.platform === "win32" }).status ?? 0);
