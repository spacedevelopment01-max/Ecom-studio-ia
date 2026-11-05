/**
 * #301 — mesure des débordements horizontaux du Studio au téléphone (390 / 360 px) et à l'ordinateur, Encre et Plein
 * cadre, sur un projet de services (onglet « Activité » = produit) et un projet de produits, avec la liste des éléments
 * dont le bord droit dépasse la fenêtre (les plus profonds en premier). Aucun appel IA, stockage isolé, réseau
 * hors boucle locale refusé.
 * Usage : npx tsx scripts/syna301-debordement-mobile.ts <dossier de sortie> [onglet,onglet…]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-debord-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "debord-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "LOCAL_SITE", "FILES", "BUSINESS_CONTENT", "SITE_REQUESTS", "PROMPTS", "AD_DOCUMENT_LOCAL", "EXISTING_LOCAL"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/debordement-mobile");
const TABS = (process.argv[3] ?? "produit,boutique,catalogue,images,publications,publicites,fichiers").split(",");
fs.mkdirSync(out, { recursive: true });

const { account, project } = await import("../tests/conversation209-fixtures");
const { seedAgentUiSite } = await import("./agent211-ui-fixtures");
const { openProjectConversation } = await import("../src/lib/orchestrator/conversation");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { id, run, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
const sessions: { mode: Mode; business: "services" | "products"; pid: string; token: string }[] = [];
for (const mode of ["encre", "plein"] as Mode[]) for (const business of ["services", "products"] as const) {
  const u = await account(), pid = project(u, business);
  openProjectConversation(u, pid); await seedAgentUiSite(pid, business);
  const token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), u.id, now() + 3600000, now());
  writeSynaPrefs(u.id, "account", null, { mode, panel: "collapsed" });
  sessions.push({ mode, business, pid, token });
}

const port = 6100 + Math.floor(Math.random() * 80), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = ""; server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

const rows: Record<string, unknown>[] = [];
try {
  const start = Date.now();
  for (;;) { if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-800)); try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ } await new Promise((r) => setTimeout(r, 1000)); }
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  for (const s of sessions) for (const width of [390, 360, 1440]) {
    const ctx = await b.newContext({ viewport: { width, height: width > 1000 ? 1000 : 844 }, locale: "fr-FR", reducedMotion: "reduce" });
    await ctx.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await ctx.addCookies([{ name: "ecs_session", value: s.token, url: origin }]);
    await ctx.route("**/*", (r) => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
    const page = await ctx.newPage();
    for (const tab of TABS) {
      await page.goto(`${origin}/studio/${s.pid}/${tab}`, { waitUntil: "networkidle", timeout: 180000 });
      await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {});
      await page.waitForTimeout(800);
      const m = await page.evaluate(() => {
        const W = innerWidth, sw = document.documentElement.scrollWidth, list: { sel: string; right: number; w: number; text: string }[] = [];
        if (sw > W) for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
          const r = el.getBoundingClientRect(); if (r.width === 0 || r.right <= W + 0.5) continue;
          // Un ancêtre qui coupe (overflow hidden/auto/clip) empêche le débordement de la page : ignoré.
          let clipped = false; for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o !== "visible") { const pr = p.getBoundingClientRect(); if (pr.right <= W + 0.5) { clipped = true; break; } } }
          if (clipped || getComputedStyle(el).position === "fixed") continue;
          const cls = typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 4).join(".") : "";
          list.push({ sel: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls ? "." + cls : ""}`, right: Math.round(r.right), w: Math.round(r.width), text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 60) });
        }
        // Les plus profonds : ceux dont aucun enfant ne déborde aussi.
        return { W, sw, culprits: list.filter((x, i) => !list.slice(i + 1).some((y) => y.right === x.right && y.w <= x.w && y.sel !== x.sel)).slice(-8) };
      });
      const row = { mode: s.mode, business: s.business, tab, width, ...m };
      rows.push(row);
      const flag = m.sw > m.W ? "✗" : "✓";
      console.log(`${flag} ${s.mode}/${s.business}/${tab} ${width}px : scrollWidth ${m.sw}${m.sw > m.W ? " → " + m.culprits.map((c) => `${c.sel}(${c.right}) « ${c.text} »`).join(" | ") : ""}`);
      if (m.sw > m.W) await page.screenshot({ path: path.join(out, `${s.mode}-${s.business}-${tab}-${width}.png`) });
    }
    await ctx.close();
  }
  await b.close();
} finally {
  stop();
  fs.writeFileSync(path.join(out, "DEBORDEMENTS.json"), JSON.stringify(rows, null, 1) + "\n");
  fs.rmSync(dir, { recursive: true, force: true });
}
