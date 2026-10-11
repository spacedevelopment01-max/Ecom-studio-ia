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
 *  - Journal des arrêts (data/logs/studio.log) : pour chaque arrêt non demandé, la VRAIE raison — code de sortie ou
 *    signal, mémoire libre du conteneur, mémoire utilisée par la partie arrêtée juste avant, et si le noyau a tué un
 *    processus faute de mémoire (compteur oom_kill de /proc/vmstat). Un SIGKILL sans arrêt demandé = tué de
 *    l'extérieur (mémoire saturée le plus souvent) ; un code ≠ 0 = plantage du programme (voir les lignes au-dessus).
 */
import fs from "node:fs";
import os from "node:os";
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

// Secret maître : en production (« next start »), le site REFUSE de démarrer sans APP_SECRET, alors que le mode
// développement se rabat sur data/.app-secret. Sans .env.local (Codespace configuré sans « npm run setup »), le mode
// production aurait donc cassé toutes les pages et rendu illisibles les clés d'API chiffrées en développement. Le
// lanceur reprend le MÊME secret que le mode développement et le transmet au site et au worker.
for (const f of [".env.local", ".env"]) if (fs.existsSync(f)) process.loadEnvFile(f);
if (!process.env.APP_SECRET || process.env.APP_SECRET.length < 32) {
  const file = path.join(process.env.DATA_DIR || path.resolve("data"), ".app-secret");
  let value = "";
  try {
    value = fs.readFileSync(file, "utf8").trim();
  } catch {}
  if (value.length < 32) {
    value = crypto.randomBytes(32).toString("base64url");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value + "\n", { mode: 0o600 });
  }
  process.env.APP_SECRET = value;
  console.log("▶ Secret de l'application : celui du mode développement (data/.app-secret), aucun APP_SECRET configuré.");
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

const logFile = path.join(process.env.DATA_DIR || path.resolve("data"), "logs", "studio.log");
/** Ligne datée dans le terminal ET dans data/logs/studio.log (à envoyer au support en cas d'arrêt). */
function journal(line, err = false) {
  (err ? console.error : console.log)(line);
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${line.trim()}\n`);
  } catch {}
}
const mb = (bytes) => Math.round(bytes / 1048576);
/** Processus tués par le noyau faute de mémoire depuis le démarrage de la machine (null si illisible). */
function oomKills() {
  try {
    const m = fs.readFileSync("/proc/vmstat", "utf8").match(/^oom_kill (\d+)/m);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}
/** Mémoire réellement occupée par un processus ET ses sous-processus (Linux), en Mo ; null ailleurs. */
function rssOf(pid) {
  let kb = 0;
  const visit = (p, depth) => {
    try {
      kb += Number(/^VmRSS:\s+(\d+) kB/m.exec(fs.readFileSync(`/proc/${p}/status`, "utf8"))?.[1] ?? 0);
      if (depth > 4) return;
      for (const t of fs.readdirSync(`/proc/${p}/task`)) for (const c of fs.readFileSync(`/proc/${p}/task/${t}/children`, "utf8").split(" ").filter(Boolean)) visit(Number(c), depth + 1);
    } catch {}
  };
  visit(pid, 0);
  return kb ? Math.round(kb / 1024) : null;
}

const pidFile = path.resolve(".studio-dev.pid");
fs.writeFileSync(pidFile, String(process.pid));
let stopping = false;
const crashes = [];
const parts = {
  web: { label: "Le site", tag: "[site]   ", cmd: bin("next"), args: ["start", "-p", String(PORT)], child: null, rss: null, peak: 0, oom: null },
  worker: { label: "Le worker", tag: "[worker] ", cmd: bin("tsx"), args: ["worker/index.ts"], child: null, rss: null, peak: 0, oom: null },
};
// Mémoire de chaque partie relevée toutes les 15 s : en cas d'arrêt, on sait ce qu'elle occupait juste avant.
setInterval(() => {
  for (const p of Object.values(parts)) {
    if (!p.child) continue;
    p.rss = rssOf(p.child.pid);
    if (p.rss) p.peak = Math.max(p.peak, p.rss);
  }
}, 15_000).unref();

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
  journal("▶ Arrêt du studio demandé…");
  for (const p of Object.values(parts)) p.child?.kill("SIGTERM");
  setTimeout(() => {
    for (const p of Object.values(parts)) p.child?.kill("SIGKILL");
  }, 60_000).unref();
  finish();
}

function start(name) {
  const p = parts[name];
  const child = spawn(p.cmd, p.args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
  p.child = child;
  p.oom = oomKills();
  p.peak = 0;
  for (const s of [child.stdout, child.stderr]) s.on("data", (d) => process.stdout.write(String(d).replace(/^(?=.)/gm, p.tag)));
  child.on("exit", (code, signal) => {
    p.child = null;
    if (stopping) return finish();
    const now = Date.now();
    crashes.push(now);
    while (crashes.length && now - crashes[0] > 10 * 60_000) crashes.shift();
    if (crashes.length > 10) {
      journal(`✗ ${p.label} s'est arrêté ${crashes.length} fois en 10 minutes : tout est arrêté. Journal : ${logFile}`, true);
      return stop();
    }
    const kills = oomKills();
    const oomNow = kills != null && p.oom != null && kills > p.oom;
    const why = oomNow
      ? "tué par le système : mémoire du conteneur saturée"
      : signal === "SIGKILL"
        ? kills != null
          ? "tué de l'extérieur (SIGKILL) par un autre programme ou une commande — pas par manque de mémoire (compteur du noyau inchangé)"
          : "tué de l'extérieur (SIGKILL), sans arrêt demandé — le plus souvent la mémoire"
        : signal
          ? `signal ${signal} reçu sans arrêt demandé`
          : code === 0
            ? "sorti sans erreur alors qu'il devait tourner"
            : `plantage du programme (code ${code}) — voir les lignes rouges au-dessus`;
    journal(`⚠ ${p.label} s'est arrêté (${signal ?? `code ${code}`}) : ${why}. Mémoire libre ${mb(os.freemem())} Mo sur ${mb(os.totalmem())} Mo ; ${p.label.toLowerCase()} occupait ${p.rss ?? "?"} Mo (pic ${p.peak || "?"} Mo)${kills != null ? ` ; processus tués faute de mémoire : ${p.oom} → ${kills}` : ""}. Relance automatique dans 3 s.`, true);
    setTimeout(() => !stopping && start(name), 3000);
  });
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, stop);
journal(`▶ Studio lancé : http://localhost:${PORT} (Ctrl+C pour l'arrêter) — mémoire libre ${mb(os.freemem())} Mo sur ${mb(os.totalmem())} Mo, ${os.cpus().length} processeur(s)`);
start("web");
start("worker");
