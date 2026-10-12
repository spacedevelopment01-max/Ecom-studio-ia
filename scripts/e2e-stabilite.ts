/**
 * Test de stabilité de bout en bout (audit de stabilisation) sur un studio lancé (« npm run studio ») :
 *   BASE=http://localhost:3000 PHOTO=chemin/photo.png OUT=reports/stabilite MINUTES=30 npx tsx scripts/e2e-stabilite.ts
 * Sans aucune clé de fournisseur : tout passe par le moteur local (0 € d'IA, aucune simulation présentée comme réelle).
 *  1. Projet PRODUIT (photo + description) : création, suivi du pilote jusqu'au bout.
 *  2. Projet SERVICES « Sébastien Blanc » : création ; le worker est TUÉ (SIGKILL) pendant le pilote ; le lanceur doit
 *     le relancer et la tâche doit finir (ou échouer avec une raison visible), jamais disparaître.
 *  3. Pendant MINUTES minutes : tous les onglets des deux projets en boucle (ordinateur), puis quelques onglets sur
 *     téléphone. Relevés : temps d'ouverture, erreurs JavaScript, réponses API en erreur (≥ 500), mémoire du site
 *     et du worker chaque minute, arrêts journalisés par le lanceur (data/logs/studio.log).
 * Résultat : OUT/resultats.json (+ quelques captures). Code de sortie 1 si un arrêt du serveur ou une erreur 5xx.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium, devices, type BrowserContext, type Page } from "playwright";
import { one } from "../src/lib/db";
import { createSubscription } from "../src/lib/project-subscriptions";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PHOTO = process.env.PHOTO!;
const OUT = process.env.OUT ?? "reports/stabilite";
const MINUTES = Number(process.env.MINUTES ?? 30);
fs.mkdirSync(OUT, { recursive: true });

const TABS = ["pilote", "produit", "marque", "boutique", "images", "videos", "publicites", "blog", "calendrier", "publications", "fichiers", "prompts", "connexions"];
const res = {
  startedAt: new Date().toISOString(),
  minutes: MINUTES,
  projects: {} as Record<string, unknown>,
  workerKill: {} as Record<string, unknown>,
  tabTimes: {} as Record<string, number[]>,
  jsErrors: [] as string[],
  api5xx: [] as string[],
  apiCalls: 0,
  memory: [] as { at: string; siteMb: number | null; workerMb: number | null }[],
  launcherLog: [] as string[],
  mobileOverflowPx: {} as Record<string, number>,
};

const pids = (pattern: string) => {
  try {
    return execSync(`pgrep -f ${JSON.stringify(pattern)}`, { encoding: "utf8" }).split("\n").map(Number).filter((n) => n && n !== process.pid);
  } catch {
    return [];
  }
};
const rssMb = (pattern: string) => {
  let kb = 0;
  for (const p of pids(pattern)) {
    try {
      kb += Number(/VmRSS:\s+(\d+)/.exec(fs.readFileSync(`/proc/${p}/status`, "utf8"))?.[1] ?? 0);
    } catch {}
  }
  return kb ? Math.round(kb / 1024) : null;
};
const logFile = path.join(process.env.DATA_DIR ?? "data", "logs", "studio.log");
const logStart = fs.existsSync(logFile) ? fs.statSync(logFile).size : 0;

function watch(page: Page, label: string) {
  page.on("pageerror", (e) => res.jsErrors.push(`${label} pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && res.jsErrors.push(`${label} console: ${m.text().slice(0, 300)}`));
  page.on("response", (r) => {
    if (!r.url().includes("/api/")) return;
    res.apiCalls++;
    if (r.status() >= 500) res.api5xx.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, "")}`);
  });
}

async function register(ctx: BrowserContext, name: string) {
  const page = await ctx.newPage();
  watch(page, name);
  await page.goto(`${BASE}/inscription`);
  await page.fill("#name", name);
  const email = `stab-${name.toLowerCase().replace(/\W/g, "")}-${Date.now()}@exemple.fr`;
  await page.fill("#email", email);
  await page.fill("#password", "motdepasse-solide-123");
  await Promise.all([page.waitForURL(/\/studio/, { timeout: 60_000 }), page.click("button[type=submit]")]);
  // Un abonnement = un projet : abonnement offert (comme le fait l'administration) pour pouvoir créer le projet.
  const u = one<{ id: string }>("SELECT id FROM users WHERE email = ?", email);
  if (u) createSubscription(u.id, { plan: "dominer", source: "admin", status: "manual" });
  return page;
}

/** Création par la vraie route (multipart), depuis la page connectée. */
async function createProject(page: Page, fields: Record<string, string>, photo?: string) {
  const b64 = photo ? fs.readFileSync(photo).toString("base64") : null;
  const r = await page.evaluate(async ({ fields, b64 }) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    if (b64) fd.append("photos", new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], "photo.png", { type: "image/png" }));
    const resp = await fetch("/api/projects", { method: "POST", body: fd });
    return { status: resp.status, body: await resp.json() };
  }, { fields, b64 });
  if (r.status !== 200) throw new Error(`création refusée ${r.status} : ${JSON.stringify(r.body)}`);
  return (r.body.id ?? r.body.project?.id) as string;
}

async function waitPipeline(page: Page, pid: string, maxMs: number) {
  const t0 = Date.now();
  let last: any = null;
  for (;;) {
    last = await page.evaluate(async (u) => (await fetch(`/api/projects/${u}`)).json(), pid).catch(() => null);
    if (last && !(last.active ?? []).length && last.pipeline) break;
    if (Date.now() - t0 > maxMs) break;
    await page.waitForTimeout(3000);
  }
  return { seconds: Math.round((Date.now() - t0) / 1000), status: last?.pipeline?.job?.status, message: last?.pipeline?.job?.message, error: last?.pipeline?.job?.error, steps: (last?.pipeline?.steps ?? []).map((s: any) => `${s.id}:${s.status}`) };
}

async function openTab(page: Page, pid: string, tab: string) {
  const t0 = Date.now();
  await page.goto(`${BASE}/studio/${pid}/${tab}`, { waitUntil: "networkidle", timeout: 90_000 });
  const ms = Date.now() - t0;
  (res.tabTimes[tab] ??= []).push(ms);
  return ms;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
for (const c of [ctxA, ctxB]) await c.addInitScript(() => { try { sessionStorage.setItem("ecsSeen", "1"); } catch {} });

// 1. Projet produit.
const a = await register(ctxA, "Camille");
const pidA = await createProject(a, { businessType: "products", description: "Bougie parfumée artisanale à la cire de soja, 200 g, mèche en coton, parfum figue et cèdre, fabriquée en France.", productName: "Bougie Figue & Cèdre", mode: "autopilot" }, PHOTO);
res.projects.produit = { id: pidA, ...(await waitPipeline(a, pidA, 8 * 60_000)) };
console.log("produit :", JSON.stringify(res.projects.produit));

// 2. Projet services « Sébastien Blanc » + worker tué pendant le pilote.
const b = await register(ctxB, "Sébastien");
const pidB = await createProject(b, { businessType: "services", brandName: "Sébastien Blanc", description: "Plâtrier peintre à Lyon : enduits, plâtrerie, peinture intérieure et extérieure, ravalement de façades. Devis gratuit.", area: "Lyon et 30 km autour", phone: "06 00 00 00 00", contactModes: "call,quote", contactMode: "call", mode: "autopilot" });
await b.waitForTimeout(8000);
const killed = pids("worker/index.ts");
for (const p of killed) try { process.kill(p, "SIGKILL"); } catch {}
const tKill = Date.now();
let restarted = false;
for (let i = 0; i < 40 && !restarted; i++) {
  await b.waitForTimeout(1000);
  restarted = pids("worker/index.ts").some((p) => !killed.includes(p));
}
res.workerKill = { killedPids: killed.length, restartedAfterS: restarted ? Math.round((Date.now() - tKill) / 1000) : null };
res.projects.services = { id: pidB, ...(await waitPipeline(b, pidB, 10 * 60_000)) };
console.log("services :", JSON.stringify(res.projects.services), JSON.stringify(res.workerKill));

// 3. Utilisation prolongée.
const end = Date.now() + MINUTES * 60_000;
let round = 0;
let nextMem = 0;
while (Date.now() < end) {
  for (const [page, pid] of [[a, pidA], [b, pidB]] as const) {
    for (const tab of TABS) {
      if (Date.now() > end) break;
      await openTab(page, pid, tab).catch((e) => res.jsErrors.push(`${tab} : ouverture impossible (${(e as Error).message.slice(0, 120)})`));
      await page.waitForTimeout(1500);
      if (Date.now() > nextMem) {
        res.memory.push({ at: new Date().toISOString(), siteMb: rssMb("next start") ?? rssMb("next-server"), workerMb: rssMb("worker/index.ts") });
        nextMem = Date.now() + 60_000;
      }
    }
  }
  if (round === 0) for (const tab of ["pilote", "marque", "boutique"]) { await openTab(a, pidA, tab); await a.screenshot({ path: path.join(OUT, `ordinateur-${tab}.png`) }); }
  round++;
}

// Téléphone.
const mob = await browser.newContext({ ...devices["iPhone 13"], storageState: await ctxA.storageState() });
const m = await mob.newPage();
watch(m, "mobile");
for (const tab of ["pilote", "marque", "boutique", "images", "calendrier", "fichiers"]) {
  await m.goto(`${BASE}/studio/${pidA}/${tab}`, { waitUntil: "networkidle", timeout: 90_000 });
  res.mobileOverflowPx[tab] = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (["pilote", "marque"].includes(tab)) await m.screenshot({ path: path.join(OUT, `telephone-${tab}.png`) });
}
await browser.close();

if (fs.existsSync(logFile)) res.launcherLog = fs.readFileSync(logFile, "utf8").slice(logStart).split("\n").filter(Boolean);
const summary = {
  ...res,
  rounds: round,
  tabMedianMs: Object.fromEntries(Object.entries(res.tabTimes).map(([k, v]) => [k, [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)]])),
  // L'arrêt du worker provoqué volontairement par ce test (SIGKILL, scénario 2) n'est pas un arrêt subi.
  serverStops: res.launcherLog.filter((l) => /s'est arrêté/.test(l)).filter((l, i, a) => !(res.workerKill.killedPids && /worker s'est arrêté \(SIGKILL\)/.test(l) && a.findIndex((x) => /worker s'est arrêté \(SIGKILL\)/.test(x)) === i)),
};
fs.writeFileSync(path.join(OUT, "resultats.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ rounds: round, api5xx: res.api5xx.length, jsErrors: res.jsErrors.length, serverStops: summary.serverStops.length, memory: res.memory.slice(-1)[0], tabMedianMs: summary.tabMedianMs }, null, 2));
process.exit(summary.serverStops.length || res.api5xx.length ? 1 : 0);
