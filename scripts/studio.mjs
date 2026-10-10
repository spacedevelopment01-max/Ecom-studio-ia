/**
 * Studio en mode PRODUCTION (« npm run studio ») — le mode conseillé pour utiliser le studio (Codespace compris) :
 * environ 3 fois moins de mémoire que « npm run dev » (mesuré : 0,76 Go contre 2,5 Go après 5 onglets), aucune
 * compilation pendant la navigation. En développement, un Codespace à court de mémoire tuait le site sans message
 * (« next dev exited with code 0 »).
 *  - Construit le site (next build) seulement quand le code a changé depuis la dernière construction.
 *  - Lance le site (next start) et le worker, et les SURVEILLE lui-même : un plantage relance seulement la partie
 *    arrêtée (au plus 10 fois en 10 min, puis tout s'arrête avec un message) ; Ctrl+C ou « npm run maj » arrête
 *    vraiment tout (jamais de relance pendant un arrêt demandé, contrairement à l’ancien lanceur à relances automatiques).
 *  - Port déjà pris : message clair, rien n'est lancé (code 1). Numéro du lanceur dans .studio-dev.pid.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { portInUse } from "./dev.mjs";

const PORT = Number(process.env.STUDIO_DEV_PORT || 3000);
const bin = (name) => path.resolve("node_modules/.bin", process.platform === "win32" ? `${name}.cmd` : name);

/** Empreinte du code (version git, fichiers modifiés, dépendances) : on reconstruit seulement quand elle change. */
function codeStamp() {
  const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout?.trim() || "?";
  const dirty = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).stdout || "";
  const lock = fs.existsSync("package-lock.json") ? fs.readFileSync("package-lock.json") : "";
  return crypto.createHash("sha256").update(head).update(dirty).update(lock).digest("hex").slice(0, 16);
}

if (await portInUse(PORT)) {
  console.error(`
Le port ${PORT} est déjà utilisé : le studio tourne sans doute déjà. Rien n'a été relancé.
  - Pour l'utiliser : ouvrez http://localhost:${PORT} (onglet « Ports » de Codespaces).
  - Pour le redémarrer ou le mettre à jour : « npm run maj ».
`);
  process.exit(1);
}

const stampFile = path.resolve(".next", "studio-build-stamp");
const stamp = codeStamp();
const built = fs.existsSync(path.resolve(".next", "BUILD_ID")) && fs.existsSync(stampFile) && fs.readFileSync(stampFile, "utf8") === stamp;
if (!built) {
  console.log("\n▶ Construction du studio (2 à 4 minutes, seulement après une mise à jour)…");
  const r = spawnSync(bin("next"), ["build"], { stdio: "inherit" });
  if (r.status !== 0) {
    console.error("\n✗ La construction a échoué : le studio n'est pas lancé. Copiez les lignes rouges ci-dessus pour le support.");
    process.exit(1);
  }
  fs.writeFileSync(stampFile, stamp);
}

const pidFile = path.resolve(".studio-dev.pid");
fs.writeFileSync(pidFile, String(process.pid));
let stopping = false;
const crashes = [];
const parts = {
  web: { label: "Le site", tag: "[site]   ", cmd: bin("next"), args: ["start", "-p", String(PORT)], child: null },
  worker: { label: "Le worker", tag: "[worker] ", cmd: bin("tsx"), args: ["worker/index.ts"], child: null },
};

function finish() {
  if (Object.values(parts).some((p) => p.child)) return;
  try {
    if (fs.readFileSync(pidFile, "utf8").trim() === String(process.pid)) fs.unlinkSync(pidFile);
  } catch {}
  process.exit(0);
}

function stop() {
  if (stopping) return;
  stopping = true;
  console.log("\n▶ Arrêt du studio…");
  for (const p of Object.values(parts)) p.child?.kill("SIGTERM");
  setTimeout(() => {
    for (const p of Object.values(parts)) p.child?.kill("SIGKILL");
  }, 15_000).unref();
  finish();
}

function start(name) {
  const p = parts[name];
  const child = spawn(p.cmd, p.args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
  p.child = child;
  for (const s of [child.stdout, child.stderr]) s.on("data", (d) => process.stdout.write(String(d).replace(/^(?=.)/gm, p.tag)));
  child.on("exit", (code, signal) => {
    p.child = null;
    if (stopping) return finish();
    const now = Date.now();
    crashes.push(now);
    while (crashes.length && now - crashes[0] > 10 * 60_000) crashes.shift();
    if (crashes.length > 10) {
      console.error(`\n✗ ${p.label} s'est arrêté ${crashes.length} fois en 10 minutes : tout est arrêté. Copiez les dernières lignes pour le support.`);
      return stop();
    }
    console.error(`\n⚠ ${p.label} s'est arrêté (${signal ?? `code ${code}`}) — relance automatique dans 3 s.`);
    setTimeout(() => !stopping && start(name), 3000);
  });
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, stop);
console.log(`\n▶ Studio lancé : http://localhost:${PORT} (Ctrl+C pour l'arrêter)`);
start("web");
start("worker");
