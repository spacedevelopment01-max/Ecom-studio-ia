/**
 * Studio PRIVÉ de recette #492 (jamais déployé) : SINA agent ouvert (STUDIO_SYNA_AGENT=1, coquille SINA),
 * worker actif, comptes fictifs (mot de passe fictif de recette, aucune donnée réelle).
 * Clés : OpenAI / DashScope / fal injectées par le proxy de la session ; la clé Anthropic vient de la variable
 * d'environnement STUDIO_ANTHROPIC_KEY (réglages de l'environnement, jamais dans le code ni le fil) et est
 * enregistrée CHIFFRÉE dans l'administration du Studio privé au démarrage.
 * Usage (depuis la racine du dépôt) :
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt DATA_DIR=<dossier> PORT492=3493 \
 *     setsid nohup node_modules/.bin/tsx scripts/syna-recette/lancer-agent.mts > studio.log 2>&1 < /dev/null &
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const dir = path.resolve(process.env.DATA_DIR ?? "work/agent492");
const port = Number(process.env.PORT492 ?? 3493);
fs.mkdirSync(dir, { recursive: true });
const secretFile = path.join(dir, "app-secret.txt");
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, randomBytes(32).toString("hex"));
process.env.DATA_DIR = dir;
process.env.APP_SECRET = fs.readFileSync(secretFile, "utf8").trim();
const env: Record<string, string> = { OPENAI_API_KEY: "sk-proxy-injected", DASHSCOPE_API_KEY: "sk-proxy-injected", FAL_KEY: "proxy-injected", ANTHROPIC_API_KEY: "", GOOGLE_API_KEY: "" };
Object.assign(process.env, env);

// GARDE-FOU DE DÉPENSE DE L'ESSAI (src/lib/ai/plafond-essai.ts) : STUDIO_ESSAI_PLAFOND_EUROS=1 l'allume (1 € pour tout
// l'essai : appels du client et reprises du Studio, textes, images, recherches). Le début de l'essai est gardé dans
// <DATA_DIR>/essai-debut.txt, pour que les relances du gardien (garder-allume.sh) continuent la même somme ; un nouvel
// essai : effacer ce fichier, ou donner STUDIO_ESSAI_DEBUT (millisecondes ou date ISO). Le site et le worker reçoivent
// les deux réglages. Sans STUDIO_ESSAI_PLAFOND_EUROS, rien ne change.
if (process.env.STUDIO_ESSAI_PLAFOND_EUROS?.trim()) {
  const debutFile = path.join(dir, "essai-debut.txt");
  if (!process.env.STUDIO_ESSAI_DEBUT?.trim()) {
    if (!fs.existsSync(debutFile)) fs.writeFileSync(debutFile, String(Date.now()));
    process.env.STUDIO_ESSAI_DEBUT = fs.readFileSync(debutFile, "utf8").trim();
  }
  console.log(`Garde-fou de l'essai allumé : plafond ${process.env.STUDIO_ESSAI_PLAFOND_EUROS} €, compté depuis ${new Date(Number(process.env.STUDIO_ESSAI_DEBUT) || Date.parse(process.env.STUDIO_ESSAI_DEBUT!)).toISOString()}.`);
}

const PASSWORD = "Recette-492-fictif";
const { one, run } = await import("../../src/lib/db");
const { account } = await import("../../tests/conversation209-fixtures");
const bcrypt = (await import("bcryptjs")).default;
/** Compte fictif, à un forfait donné (« creer », « vendre » ou « dominer » : 2, 3 ou 4 identités proposées). */
async function compte(email: string, nom: string, role: "client" | "admin", plan: "creer" | "vendre" | "dominer" = "vendre") {
  if (one("SELECT 1 FROM users WHERE email=?", email)) return;
  const u = await account();
  run("UPDATE users SET name=?, email=?, password_hash=?, role=? WHERE id=?", nom, email, await bcrypt.hash(PASSWORD, 10), role, u.id);
  run("UPDATE subscriptions SET plan=? WHERE user_id=?", plan, u.id);
  const { syncAllowance } = await import("../../src/lib/billing");
  syncAllowance(u.id);
  console.log(`Compte fictif : ${email} (${role}, forfait ${plan})`);
}
await compte("admin492@example.com", "Admin recette (fictif)", "admin");
// Les clients inventés de l'essai en cours : COMPTES="email:nom:forfait,…" (par défaut, trois clients, un par forfait).
for (const spec of (process.env.COMPTES ?? "client1@example.com:Client un (fictif):creer,client2@example.com:Client deux (fictif):vendre,client3@example.com:Client trois (fictif):dominer").split(",")) {
  const [email, nom, plan] = spec.split(":");
  await compte(email.trim(), (nom ?? "Client fictif").trim(), "client", (["creer", "vendre", "dominer"].includes(plan) ? plan : "vendre") as "creer");
}

// Clé Anthropic de la variable d'environnement → réglage chiffré du Studio privé (jamais affichée).
if (process.env.STUDIO_ANTHROPIC_KEY) {
  const { setSetting } = await import("../../src/lib/settings");
  setSetting("provider.anthropic.apiKey", process.env.STUDIO_ANTHROPIC_KEY.trim(), true);
  console.log("Clé Anthropic enregistrée (chiffrée) depuis STUDIO_ANTHROPIC_KEY.");
} else console.log("STUDIO_ANTHROPIC_KEY absente : Claude indisponible dans le Studio privé.");

// Tarifs vérifiés le 06/11/2026 (prix publics, voir tarifs-verifies.ts) : réappliqués à chaque démarrage.
const { appliquerTarifsVerifies } = await import("./tarifs-verifies");
await appliquerTarifsVerifies();
console.log("Tarifs vérifiés du 06/11/2026 appliqués (recherche web Claude, images OpenAI, taux 0,90).");

const origin = `http://localhost:${port}`;
const common = { ...process.env, ...env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1" };
const web = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "0.0.0.0"], { env: { ...common, NODE_OPTIONS: "--max-old-space-size=4096" }, stdio: "inherit" });
const worker = spawn(path.resolve("node_modules/.bin/tsx"), ["worker/index.ts"], { env: { ...common, WORKER_CONCURRENCY: "5" }, stdio: "inherit" });
console.log(`Studio privé SINA agent : ${origin} — mot de passe des comptes fictifs : ${PASSWORD}`);
const stop = () => { web.kill(); worker.kill(); };
process.on("SIGTERM", stop); process.on("SIGINT", stop);
web.on("exit", (c) => { worker.kill(); process.exit(c ?? 0); });
