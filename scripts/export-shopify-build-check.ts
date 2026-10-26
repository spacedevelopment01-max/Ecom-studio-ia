/**
 * Theme Check dans le studio COMPILÉ (suivi #194, PR #202) : les essais unitaires et la CI exécutent le code source,
 * pas le build Next. Codex a constaté sur le build servi un Theme Check « indisponible » (empaquetage de createRequire).
 * Ce script démarre le build de production existant (`npm run build` d'abord) sur une base temporaire, démonstration
 * fictive, aucune IA ni réseau, exporte le thème Shopify par la vraie route, puis relit le contrôle enregistré avec
 * l'export : Theme Check doit avoir réellement tourné (nombre d'erreurs mesuré, 0 pour ce thème), sans « indisponible ».
 *
 *   npm run build && npx tsx scripts/export-shopify-build-check.ts [dossier-résultat]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
if (!fs.existsSync(path.join(process.cwd(), ".next", "BUILD_ID"))) throw new Error("Build de production absent : lancez d'abord « npm run build ».");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-export-build-"));
process.env.DATA_DIR = temp;
process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? path.join(temp, "resultat"));
fs.mkdirSync(out, { recursive: true });
const PORT = 3900 + Math.floor(Math.random() * 90), origin = `http://127.0.0.1:${PORT}`;
const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth");
const { runWithLang } = await import("../src/lib/i18n-server");
const { run, one } = await import("../src/lib/db");
const password = "export-" + Math.random().toString(36).slice(2), email = "export-build@example.invalid";
const user = await createUser(email, password, "Vérification export compilé");
const f = await runWithLang({ content: "fr", ui: "fr" }, () => demoProject(user.id, "rive"));
const { saveThemeVersion } = await import("../src/lib/projects");
saveThemeVersion(f.pid, f.spec, "Vérification : export compilé", "user");
run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active',?,?,?,'admin',?,?)", `export-${f.pid}`, "dominer", user.id, f.pid, Date.now(), Date.now());

const server = spawn("npx", ["next", "start", "-p", String(PORT), "-H", "127.0.0.1"], { env: { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1", APP_URL: origin }, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);
let log = "";
server.stdout.on("data", (d) => { log += d; });
server.stderr.on("data", (d) => { log += d; });
const started = Date.now();
for (;;) {
  if (Date.now() - started > 120000) throw new Error("Studio compilé non démarré :\n" + log.slice(-2000));
  try { if ((await fetch(`${origin}/connexion`)).ok) break; } catch { /* pas prêt */ }
  await new Promise((r) => setTimeout(r, 1000));
}
const result: Record<string, unknown> = { projet: f.pid };
try {
  result.version = await (await fetch(`${origin}/api/version`)).json();
  const login = await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email, password }) });
  const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  if (!login.ok || !cookie) throw new Error(`connexion : ${login.status}`);
  const res = await fetch(`${origin}/api/projects/${f.pid}/theme/export?platform=shopify`, { headers: { Cookie: cookie } });
  const body = Buffer.from(await res.arrayBuffer());
  result.export = { statut: res.status, type: res.headers.get("content-type"), octets: body.length, debut: res.ok ? null : body.toString("utf8").slice(0, 300) };
  const asset = one<{ meta: string }>("SELECT meta FROM assets WHERE project_id = ? AND role = 'theme-export' ORDER BY created_at DESC LIMIT 1", f.pid);
  const meta = asset ? (JSON.parse(asset.meta) as { stats?: Record<string, number>; issues?: string[]; gate?: unknown }) : null;
  result.controle = meta ? { themeCheckErrors: meta.stats?.themeCheckErrors ?? null, themeCheckWarnings: meta.stats?.themeCheckWarnings ?? null, problemesThemeCheck: (meta.issues ?? []).filter((i) => /Theme Check/.test(i)) } : null;
} finally {
  stop();
  fs.writeFileSync(path.join(out, "resultat.json"), JSON.stringify(result, null, 1));
  fs.writeFileSync(path.join(out, "serveur.log"), log.replace(new RegExp(password, "g"), "***"));
}
console.log(JSON.stringify(result, null, 1));
const c = result.controle as { themeCheckErrors: number | null; problemesThemeCheck: string[] } | null;
const ok = (result.export as { statut: number }).statut === 200 && !!c && c.themeCheckErrors === 0 && c.problemesThemeCheck.length === 0;
console.log(ok ? "RÉUSSI : Theme Check a tourné dans le build compilé, 0 erreur." : "ÉCHEC");
process.exit(ok ? 0 : 1);
