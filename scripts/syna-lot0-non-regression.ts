/**
 * Mission #282, lot 0 — preuve de non-régression : les écrans actuels du Studio sont identiques avant et après.
 *
 *   npx tsx scripts/syna-lot0-non-regression.ts <dossier> avant=<copie de main> apres=<copie de la branche>
 *
 * Une seule base temporaire (deux projets de démonstration : SILLON et TABLE SAISON), le même compte, les mêmes
 * pages : chaque copie du dépôt est lancée à son tour en développement, puis chaque capture « avant » est comparée
 * pixel par pixel à la capture « après ». Animations coupées pour des captures stables. Aucune IA (clés vides),
 * aucun réseau fournisseur. Le panneau SYNA actuel est affiché par ses drapeaux d'interface sur ce serveur local
 * seulement (aucun message envoyé), pour vérifier que la pastille actuelle est inchangée.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { chromium } from "playwright";

if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const out = path.resolve(process.argv[2] ?? "reports/syna-lot0-non-regression");
const repos = process.argv.slice(3).map((a) => { const [label, dir] = a.split("="); return { label, dir: path.resolve(dir) }; });
if (repos.length !== 2) throw new Error("Deux copies attendues : avant=<dossier> apres=<dossier>");
fs.mkdirSync(out, { recursive: true });

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-syna-lot0-"));
process.env.DATA_DIR = temp;
process.env.STOCK_OFFLINE = "1";
for (const k of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[k] = "";
const SYNA_UI = { STUDIO_CONVERSATION_LOT_A: "1", STUDIO_CONVERSATION_AI: "1", STUDIO_CONVERSATION_UI: "1" };

const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth");
const { runWithLang } = await import("../src/lib/i18n-server");
const { run } = await import("../src/lib/db");
const password = "lot0-" + Math.random().toString(36).slice(2), email = "syna-lot0@example.invalid";
const user = await createUser(email, password, "Non-régression lot 0");
const projects: Record<string, string> = {};
for (const key of ["sillon", "table-saison"]) {
  const f = await runWithLang({ content: "fr", ui: "fr" }, () => demoProject(user.id, key as never));
  run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active',?,?,?,'admin',?,?)", `lot0-${f.pid}`, "dominer", user.id, f.pid, Date.now(), Date.now());
  projects[key] = f.pid;
}

const PAGES = [
  { name: "connexion", url: "/connexion", login: false },
  { name: "studio-accueil", url: "/studio", login: true },
  { name: "sillon-pilote", url: `/studio/${projects.sillon}/pilote`, login: true },
  { name: "sillon-boutique", url: `/studio/${projects.sillon}/boutique`, login: true },
  { name: "sillon-catalogue", url: `/studio/${projects.sillon}/catalogue`, login: true },
  { name: "sillon-images", url: `/studio/${projects.sillon}/images`, login: true },
  { name: "sillon-marque", url: `/studio/${projects.sillon}/marque`, login: true },
  { name: "table-saison-boutique", url: `/studio/${projects["table-saison"]}/boutique`, login: true },
  { name: "table-saison-carte", url: `/studio/${projects["table-saison"]}/carte`, login: true },
] as const;
const VIEWPORTS = [{ label: "ordinateur", width: 1440, height: 900 }, { label: "telephone", width: 390, height: 844 }] as const;
const FREEZE = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}nextjs-portal{display:none!important}";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const errors: Record<string, string[]> = {};
try {
  for (const repo of repos) {
    const port = 4100 + Math.floor(Math.random() * 800), origin = `http://127.0.0.1:${port}`;
    const dev = spawn("npx", ["next", "dev", "-p", String(port), "-H", "127.0.0.1"], { cwd: repo.dir, env: { ...process.env, ...SYNA_UI, DATA_DIR: temp, NEXT_TELEMETRY_DISABLED: "1", APP_URL: origin }, stdio: ["ignore", "pipe", "pipe"], detached: true });
    let log = "";
    dev.stdout.on("data", (d) => { log += d; });
    dev.stderr.on("data", (d) => { log += d; });
    try {
      const t0 = Date.now();
      for (;;) {
        if (Date.now() - t0 > 300000) throw new Error(`${repo.label} : studio non démarré\n${log.slice(-1500)}`);
        try { if ((await fetch(`${origin}/connexion`)).ok) break; } catch { /* pas prêt */ }
        await new Promise((r) => setTimeout(r, 1500));
      }
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, locale: "fr-FR", reducedMotion: "reduce" });
        await context.addInitScript({ content: "try{sessionStorage.setItem('ecsSeen','1')}catch(e){}" });
        const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } });
        if (!login.ok()) throw new Error(`${repo.label} : connexion ${login.status()}`);
        const page = await context.newPage();
        page.on("pageerror", (e) => (errors[`${repo.label}/${vp.label}`] ??= []).push(e.message.slice(0, 160)));
        for (const p of PAGES) {
          await page.goto(origin + p.url, { waitUntil: "networkidle", timeout: 240000 }).catch(() => undefined);
          await page.addStyleTag({ content: FREEZE });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(2500); // une première compilation par page en développement
          await page.screenshot({ path: path.join(out, `${repo.label}--${vp.label}--${p.name}.png`) });
        }
        await context.close();
      }
    } finally {
      try { process.kill(-dev.pid!, "SIGTERM"); } catch { /* arrêté */ }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
} finally {
  await browser.close();
}

// Comparaison pixel par pixel (tolérance de 8 niveaux par canal pour le lissage des polices).
const [a, b] = repos.map((r) => r.label);
const results: { page: string; pixels: number; differing: number; ratio: number }[] = [];
for (const vp of VIEWPORTS) for (const p of PAGES) {
  const name = `${vp.label}--${p.name}`;
  const [x, y] = await Promise.all([a, b].map((l) => sharp(path.join(out, `${l}--${name}.png`)).raw().ensureAlpha().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) { results.push({ page: name, pixels: 0, differing: -1, ratio: 1 }); continue; }
  let diff = 0;
  const mask = Buffer.alloc(x.info.width * x.info.height * 4, 255);
  for (let i = 0; i < x.data.length; i += 4) {
    if (Math.abs(x.data[i] - y.data[i]) > 8 || Math.abs(x.data[i + 1] - y.data[i + 1]) > 8 || Math.abs(x.data[i + 2] - y.data[i + 2]) > 8) { diff++; mask[i] = 220; mask[i + 1] = 30; mask[i + 2] = 30; }
  }
  if (diff) await sharp(mask, { raw: { width: x.info.width, height: x.info.height, channels: 4 } }).png().toFile(path.join(out, `difference--${name}.png`));
  results.push({ page: name, pixels: x.info.width * x.info.height, differing: diff, ratio: diff / (x.info.width * x.info.height) });
}
fs.writeFileSync(path.join(out, "comparaison.json"), JSON.stringify({ avant: a, apres: b, results, errors }, null, 2));
for (const r of results) console.log(`${r.page} : ${r.differing === 0 ? "identique" : r.differing < 0 ? "tailles différentes" : `${r.differing} pixels différents (${(r.ratio * 100).toFixed(3)} %)`}`);
console.log("Erreurs JavaScript :", JSON.stringify(errors));
process.exit(0);
