/**
 * Studio d'AUDIT (état des lieux du 12 novembre 2026) : aucune clé de fournisseur, aucun accès réseau sortant.
 * Rien ne peut être dépensé : toutes les clés sont vides et la clé Anthropic de l'environnement n'est pas transmise.
 * Données fictives dans un dossier hors dépôt.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const REPO = process.cwd();
const dir = path.resolve(process.env.AUDIT_DIR!);
const port = Number(process.env.AUDIT_PORT ?? 3493);
fs.mkdirSync(dir, { recursive: true });
const secretFile = path.join(dir, "app-secret.txt");
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, randomBytes(32).toString("hex"));

// Aucune clé : ni celles de l'environnement, ni celles du proxy.
for (const k of ["STUDIO_ANTHROPIC_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY", "HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "NODE_USE_ENV_PROXY", "GLOBAL_AGENT_HTTPS_PROXY", "ANTHROPIC_BASE_URL"]) delete process.env[k];
process.env.DATA_DIR = dir;
process.env.APP_SECRET = fs.readFileSync(secretFile, "utf8").trim();
process.env.STUDIO_SYNA_AGENT = "1";
process.env.STUDIO_SYNA_SHELL = "1";

const PASSWORD = "Audit-fictif-2026";
const { one, run, all } = await import(`${REPO}/src/lib/db`);
const { account, project } = await import(`${REPO}/tests/conversation209-fixtures`);
import { createRequire } from "node:module";
const bcrypt = createRequire(REPO + "/")("bcryptjs");

async function compte(email: string, nom: string, role: "client" | "admin", paid = true) {
  const had = one<{ id: string }>("SELECT id FROM users WHERE email=?", email);
  if (had) return one<any>("SELECT * FROM users WHERE id=?", had.id);
  const u = await account(paid);
  run("UPDATE users SET name=?, email=?, password_hash=?, role=? WHERE id=?", nom, email, await bcrypt.hash(PASSWORD, 10), role, u.id);
  console.log(`Compte fictif : ${email} (${role})`);
  return one<any>("SELECT * FROM users WHERE id=?", u.id);
}
const admin = await compte("admin-audit@example.com", "Admin audit (fictif)", "admin");
const client = await compte("client-audit@example.com", "Client audit (fictif)", "client");
const decouverte = await compte("decouverte-audit@example.com", "Découverte audit (fictif)", "client", false);

// Projets fictifs avec un thème sur mesure de démonstration (compositions d'exemple du dépôt, aucune IA).
const { starterTheme } = await import(`${REPO}/src/lib/syna-agent/custom-theme/starters`);
const { saveCustomTheme, loadCustomTheme } = await import(`${REPO}/src/lib/syna-agent/custom-theme/theme`);
const wanted: [string, "products" | "services", string, string, string][] = [
  ["Audit — Classique", "products", "classique", "classique", "client"],
  ["Audit — Moderne sport chic", "products", "moderne", "sport-chic", "client2"],
  ["Audit — Moderne néon", "products", "moderne", "streetwear-neon", "client3"],
  ["Audit — Services", "services", "classique", "classique", "client4"],
];
const owners: Record<string, any> = { client };
for (const k of ["client2", "client3", "client4"]) owners[k] = await compte(`${k}-audit@example.com`, `Client audit ${k} (fictif)`, "client");
const out: Record<string, string> = {};
const who: Record<string, string> = {};
for (const [name, business, family, style, owner] of wanted) {
  const u = owners[owner];
  let p = one<{ id: string }>("SELECT id FROM projects WHERE user_id=? AND name=?", u.id, name);
  if (!p) {
    let pid: unknown;
    try { pid = await project(u, business); } catch (e) { console.log(`Projet « ${name} » non créé : ${(e as Error)?.message ?? e}`); continue; }
    const row = one<{ id: string }>("SELECT id FROM projects WHERE id=?", pid as string);
    if (!row) { console.log(`Projet « ${name} » introuvable après création`); continue; }
    run("UPDATE projects SET name=? WHERE id=?", name, row.id);
    p = row;
  }
  if (!loadCustomTheme(p.id)) { try { saveCustomTheme(p.id, starterTheme(family as any, style)); } catch (e) { console.log(`Thème d'exemple non posé (${name}) : ${(e as Error)?.message ?? e}`); } }
  out[name] = p.id; who[name] = owner;
}
fs.writeFileSync(path.join(dir, "audit.json"), JSON.stringify({ port, password: PASSWORD, admin: admin.email, client: client.email, client2: owners.client2.email, client3: owners.client3.email, client4: owners.client4.email, decouverte: decouverte.email, projects: out, owners: who, allProjects: all("SELECT id,name,business_type,user_id FROM projects") }, null, 2));
console.log("Projets fictifs :", out);

// Comptes payants SANS projet (pour créer un projet par SINA) et réglages d'essai gratuits.
const extra: Record<string, string> = {};
for (const k of (process.env.AUDIT_EXTRA_PAID ?? "").split(",").filter(Boolean)) extra[k] = (await compte(`${k}-audit@example.com`, `Client audit ${k} (fictif)`, "client")).email;
if (process.env.AUDIT_LOCAL_REPLIES === "1") { const { setSetting } = await import(`${REPO}/src/lib/settings`); setSetting("syna.replies", JSON.stringify("locales")); console.log("Réponses de l'étape 0 : moteur local (gratuit)."); }
{ const f = path.join(dir, "audit.json"); const a = JSON.parse(fs.readFileSync(f, "utf8")); fs.writeFileSync(f, JSON.stringify({ ...a, ...extra }, null, 2)); }
const origin = `http://localhost:${port}`;
const common = { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1" } as Record<string, string>;
const web = spawn(process.execPath, [path.join(REPO, "node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], { cwd: REPO, env: { ...common, NODE_OPTIONS: "--max-old-space-size=4096" }, stdio: "inherit" });
const worker = process.env.AUDIT_WORKER === "1" ? spawn(path.join(REPO, "node_modules/.bin/tsx"), ["worker/index.ts"], { cwd: REPO, env: { ...common, WORKER_CONCURRENCY: "2" }, stdio: "inherit" }) : null;
console.log(`Studio d'audit : ${origin} — sans aucune clé, sans réseau sortant.`);
const stop = () => { web.kill(); worker?.kill(); };
process.on("SIGTERM", stop); process.on("SIGINT", stop);
web.on("exit", (c) => { worker?.kill(); process.exit(c ?? 0); });
