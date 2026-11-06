/**
 * Studio PRIVÉ de recette #492 (jamais déployé) : SYNA agent ouvert (STUDIO_SYNA_AGENT=1, coquille SYNA),
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
const env: Record<string, string> = { OPENAI_API_KEY: "sk-proxy-injected", DASHSCOPE_API_KEY: "sk-proxy-injected", FAL_KEY: "proxy-injected", ANTHROPIC_API_KEY: "", GOOGLE_API_KEY: "", STUDIO_SYNA_AGENT: "1", STUDIO_SYNA_SHELL: "1" };
Object.assign(process.env, env);

const PASSWORD = "Recette-492-fictif";
const { one, run } = await import("../../src/lib/db");
const { account } = await import("../../tests/conversation209-fixtures");
const bcrypt = (await import("bcryptjs")).default;
async function compte(email: string, nom: string, role: "client" | "admin") {
  if (one("SELECT 1 FROM users WHERE email=?", email)) return;
  const u = await account();
  run("UPDATE users SET name=?, email=?, password_hash=?, role=? WHERE id=?", nom, email, await bcrypt.hash(PASSWORD, 10), role, u.id);
  console.log(`Compte fictif : ${email} (${role})`);
}
await compte("admin492@example.com", "Admin recette 492 (fictif)", "admin");
await compte("boutique492@example.com", "Boutique recette 492 (fictif)", "client");
await compte("vans492@example.com", "Vans recette 492 (fictif)", "client");

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
const worker = spawn(path.resolve("node_modules/.bin/tsx"), ["worker/index.ts"], { env: { ...common, WORKER_CONCURRENCY: "3" }, stdio: "inherit" });
console.log(`Studio privé SYNA agent : ${origin} — mot de passe des comptes fictifs : ${PASSWORD}`);
const stop = () => { web.kill(); worker.kill(); };
process.on("SIGTERM", stop); process.on("SIGINT", stop);
web.on("exit", (c) => { worker.kill(); process.exit(c ?? 0); });
