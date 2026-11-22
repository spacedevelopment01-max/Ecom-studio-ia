/**
 * Mission #282, phase 1 — captures « avant » du Studio actuel, onglet par onglet, à l'ordinateur et au téléphone.
 * Studio réel (Next.js en développement, base temporaire, aucune IA, aucun réseau fournisseur), deux projets de
 * démonstration : SILLON (boutique produit) et TABLE SAISON (restaurant, services). Le panneau SYNA est affiché
 * (drapeau d'interface seulement) ; aucun message ne lui est envoyé, donc aucun appel.
 *
 *   npx tsx scripts/syna282-captures-avant.ts <dossier-captures>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, type Page } from "playwright";

if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-syna282-"));
process.env.DATA_DIR = temp;
process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/syna282-avant");
fs.mkdirSync(out, { recursive: true });
const PORT = 3900 + Math.floor(Math.random() * 90), origin = `http://127.0.0.1:${PORT}`;
// Panneau SYNA visible, outils fermés : on montre l'interface, sans pouvoir rien exécuter.
const SYNA_UI = { STUDIO_CONVERSATION_LOT_A: "1", STUDIO_CONVERSATION_AI: "1", STUDIO_CONVERSATION_UI: "1" };
for (const k of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[k] = "";

const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth");
const { runWithLang } = await import("../src/lib/i18n-server");
const { run } = await import("../src/lib/db");
const password = "syna282-" + Math.random().toString(36).slice(2), email = "syna282-avant@example.invalid";
const user = await createUser(email, password, "Captures avant #282");
const projects: { key: string; pid: string }[] = [];
for (const key of ["sillon", "table-saison"]) {
  const f = await runWithLang({ content: "fr", ui: "fr" }, () => demoProject(user.id, key as never));
  run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active',?,?,?,'admin',?,?)", `syna282-${f.pid}`, "dominer", user.id, f.pid, Date.now(), Date.now());
  projects.push({ key, pid: f.pid });
}

const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env: { ...process.env, ...SYNA_UI, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1", APP_URL: origin }, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stopDev = () => { try { process.kill(-dev.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stopDev);
let log = "";
dev.stdout.on("data", (d) => { log += d; });
dev.stderr.on("data", (d) => { log += d; });
const started = Date.now();
for (;;) {
  if (Date.now() - started > 300000) throw new Error("Studio non démarré :\n" + log.slice(-2000));
  try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas prêt */ }
  await new Promise((r) => setTimeout(r, 1500));
}

const TABS: Record<string, string[]> = {
  sillon: ["pilote", "produit", "strategie", "marque", "boutique", "catalogue", "images", "videos", "publications", "calendrier", "publicites", "blog", "fichiers", "prompts", "connexions"],
  "table-saison": ["pilote", "produit", "boutique", "carte", "rendez-vous", "images", "publications"],
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const summary: Record<string, unknown>[] = [];
try {
  for (const [label, viewport] of [["ordinateur", { width: 1440, height: 900 }], ["telephone", { width: 390, height: 844 }]] as const) {
    const context = await browser.newContext({ viewport, locale: "fr-FR" });
    const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } });
    if (!login.ok()) throw new Error(`connexion : ${login.status()}`);
    const page: Page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
    await page.goto(`${origin}/studio`, { waitUntil: "networkidle", timeout: 240000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, `${label}-00-studio-accueil.png`), fullPage: false });
    for (const { key, pid } of projects) {
      for (const tab of TABS[key]) {
        const t0 = Date.now();
        await page.goto(`${origin}/studio/${pid}/${tab}`, { waitUntil: "networkidle", timeout: 240000 }).catch(() => undefined);
        await page.waitForTimeout(1500);
        const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ });
        if (await nudge.count()) await nudge.first().click().catch(() => undefined);
        const file = `${label}-${key}-${tab}.png`;
        await page.screenshot({ path: path.join(out, file), fullPage: false });
        const metrics = await page.evaluate(() => ({
          buttons: document.querySelectorAll("button").length,
          ai: [...document.querySelectorAll("button")].filter((b) => /IA|générer|créer avec/i.test(b.textContent ?? "")).length,
          textareas: document.querySelectorAll("textarea").length,
          height: document.documentElement.scrollHeight,
        }));
        summary.push({ viewport: label, project: key, tab, file, ms: Date.now() - t0, ...metrics });
      }
    }
    summary.push({ viewport: label, pageErrors: errors.slice(0, 10) });
    await context.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, "captures.json"), JSON.stringify(summary, null, 2) + "\n");
  stopDev();
  fs.rmSync(temp, { recursive: true, force: true });
}
console.log(`captures : ${summary.length} lignes dans ${out}`);
process.exit(0);
