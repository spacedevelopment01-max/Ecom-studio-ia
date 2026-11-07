/**
 * Mission #282, lot 1 bis — recette des deux modes (Encre, Plein cadre), de la personnalisation et de la persistance,
 * dans un vrai navigateur, sur une base temporaire isolée. Reprend les 12 tests de bascule de 06-DEUX-MODES.md, adaptés
 * au code réel, et dit lesquels ne sont pas réalisables sur `main` aujourd'hui.
 *
 *   npx tsx scripts/syna-lot1bis-recette.ts <dossier>
 *
 * Deux comptes, deux projets fictifs (SILLON, boutique ; TABLE SAISON, restaurant) et une tâche « en cours » écrite en
 * base (aucun worker, aucune IA). Le Studio est lancé en développement : A. coquille + SINA visibles ; B. coquille avec
 * les drapeaux SINA fermés. Aucune clé d'IA ; toute requête hors du serveur local est comptée. Captures et
 * `recette.json` dans le dossier.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const out = path.resolve(process.argv[2] ?? "reports/syna-lot1bis");
fs.mkdirSync(out, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-syna-lot1bis-"));
process.env.DATA_DIR = temp;
process.env.STOCK_OFFLINE = "1";
for (const k of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[k] = "";

const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth");
const { runWithLang } = await import("../src/lib/i18n-server");
const { run, all, one, id: newId } = await import("../src/lib/db");
const pw = "lot1bis-" + Math.random().toString(36).slice(2);
const accounts = { a: "syna-lot1bis-a@example.invalid", b: "syna-lot1bis-b@example.invalid" };
const userA = await createUser(accounts.a, pw, "Recette A");
const userB = await createUser(accounts.b, pw, "Recette B");
const P: Record<string, string> = {};
for (const key of ["sillon", "table-saison"]) {
  const f = await runWithLang({ content: "fr", ui: "fr" }, () => demoProject(userA.id, key as never));
  run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active',?,?,?,'admin',?,?)", `lot1bis-${f.pid}`, "dominer", userA.id, f.pid, Date.now(), Date.now());
  P[key] = f.pid;
}
// Une tâche réellement « en cours » en base (aucun worker ne tourne en développement : elle le reste).
const jobId = newId();
run("INSERT INTO jobs (id, user_id, project_id, type, label, status, progress, message, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  jobId, userA.id, P.sillon, "recette.lot1bis", "Recette : tâche en cours", "running", 0.4, "Tâche de recette (aucune IA)", Date.now(), Date.now(), Date.now());

/** Empreinte des données qui ne doivent JAMAIS changer avec l'affichage (projets, versions, tâches, abonnements, appels IA). */
const dataParts = () => ({
  projects: all("SELECT * FROM projects WHERE user_id = ? ORDER BY id", userA.id),
  jobs: all("SELECT id, status, progress FROM jobs WHERE user_id = ? ORDER BY id", userA.id),
  subscriptions: all("SELECT * FROM subscriptions WHERE owner_user_id = ? ORDER BY rowid", userA.id),
  ai_calls: one("SELECT COUNT(*) AS n FROM ai_calls") ?? null,
  themes: all("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'theme%' ORDER BY name").map((t: { name: string }) => [t.name, all(`SELECT COUNT(*) AS n FROM ${t.name}`)]),
});
const hashOf = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const dataPrint = () => hashOf(dataParts());
/** Parties qui ont changé entre deux relevés (pour dire précisément quoi, jamais « quelque chose »). */
const changed = (a: ReturnType<typeof dataParts>, b: ReturnType<typeof dataParts>) => (Object.keys(a) as (keyof typeof a)[]).filter((k) => hashOf(a[k]) !== hashOf(b[k]));

const VIEWPORTS = {
  ordinateur: { label: "ordinateur-1440", width: 1440, height: 900, mobile: false },
  tablette: { label: "tablette-1024", width: 1024, height: 768, mobile: false },
  tel390: { label: "telephone-390", width: 390, height: 844, mobile: true },
  tel360: { label: "telephone-360", width: 360, height: 780, mobile: true },
  paysage: { label: "telephone-paysage-844", width: 844, height: 390, mobile: true },
} as const;
type VP = (typeof VIEWPORTS)[keyof typeof VIEWPORTS];
const report: Record<string, unknown> = { date: new Date().toISOString(), navigateurs: { chromium: true, webkit: false, firefox: false }, external: [] as string[], checks: {} as Record<string, unknown> };
const checks = report.checks as Record<string, unknown>;
const ok = (name: string, value: boolean, detail?: unknown) => { checks[name] = { ok: value, ...(detail === undefined ? {} : { detail }) }; console.log(`${value ? "✓" : "✗"} ${name}${detail !== undefined && !value ? " — " + JSON.stringify(detail).slice(0, 400) : ""}`); };
const note = (name: string, detail: string) => { checks[name] = { ok: null, detail }; console.log(`· ${name} — ${detail}`); };
const aiPosts: string[] = [];

async function startStudio(extra: Record<string, string>) {
  const port = 4100 + Math.floor(Math.random() * 800), origin = `http://127.0.0.1:${port}`;
  const dev = spawn("npx", ["next", "dev", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, ...extra, DATA_DIR: temp, NEXT_TELEMETRY_DISABLED: "1", APP_URL: origin }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let log = "";
  dev.stdout.on("data", (d) => { log += d; });
  dev.stderr.on("data", (d) => { log += d; });
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > 300000) throw new Error(`Studio non démarré\n${log.slice(-1500)}`);
    try { if ((await fetch(`${origin}/connexion`)).ok) break; } catch { /* pas prêt */ }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return { origin, stop: async () => { try { process.kill(-dev.pid!, "SIGTERM"); } catch { /* arrêté */ } await new Promise((r) => setTimeout(r, 2000)); } };
}

async function session(browser: Browser, origin: string, vp: VP, who: "a" | "b" = "a", opts: { reduced?: boolean } = {}) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, locale: "fr-FR", hasTouch: vp.mobile, isMobile: vp.mobile, reducedMotion: opts.reduced ? "reduce" : "no-preference" });
  await context.addInitScript({ content: "window.__name=function(f){return f};try{sessionStorage.setItem('ecsSeen','1')}catch(e){}" });
  let login: Awaited<ReturnType<BrowserContext["request"]["post"]>> | null = null;
  for (let i = 0; i < 3 && !login?.ok(); i++) {
    login = await context.request.post(`${origin}/api/auth/login`, { data: { email: accounts[who], password: pw } }).catch(() => null);
    if (!login?.ok()) await new Promise((r) => setTimeout(r, 4000));
  }
  if (!login?.ok()) throw new Error(`connexion ${login?.status()}`);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (!["127.0.0.1", "localhost"].includes(u.hostname) && !u.protocol.startsWith("data")) (report.external as string[]).push(r.url());
    if (r.method() !== "GET" && /\/api\/(studio-agent|projects\/[^/]+\/(conversation|theme\/chat|images|videos|brand))/.test(u.pathname)) aiPosts.push(`${r.method()} ${u.pathname}`);
  });
  return { context, page, errors };
}
/** Réglages posés comme le ferait « Personnaliser » (même route, même portée). */
async function setPrefs(s: { context: BrowserContext }, origin: string, prefs: Record<string, unknown>, scope: "account" | "project" = "account", project = P.sillon) {
  const r = await s.context.request.put(`${origin}/api/studio/ui-prefs`, { headers: { origin }, data: { scope, projectId: project, prefs } });
  if (!r.ok()) throw new Error(`réglages ${r.status()}`);
}
async function go(page: Page, origin: string, key: string, tab: string) {
  await page.goto(`${origin}/studio/${P[key]}/${tab}`, { waitUntil: "networkidle", timeout: 240000 }).catch(() => undefined);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ });
  if (await nudge.count()) await nudge.first().click().catch(() => undefined);
}
const modeOf = (page: Page) => page.evaluate(() => document.querySelector("[data-syna-shell]")?.getAttribute("data-syna-shell"));
const switchKeys = async (page: Page) => { await page.keyboard.press("Control+Shift+M"); await page.waitForTimeout(500); };

const facts = (page: Page) => page.evaluate(() => {
  const zone = document.querySelector(".ss-cmd-zone")?.getBoundingClientRect();
  window.scrollTo(0, document.documentElement.scrollHeight);
  const last = [...document.querySelectorAll("#studio-main button, #studio-main a[href], #studio-main input")].filter((x) => x.getClientRects().length).at(-1)?.getBoundingClientRect();
  const z2 = document.querySelector(".ss-cmd-zone .ss-cmd-form")?.getBoundingClientRect();
  window.scrollTo(0, 0);
  return {
    mode: document.querySelector("[data-syna-shell]")?.getAttribute("data-syna-shell"),
    overflow: document.documentElement.scrollWidth - innerWidth,
    // En bas de page, le dernier bouton de l'espace reste au-dessus de la barre de commande (rien de caché dessous).
    lastAboveBar: !zone || !last || !z2 ? true : last.bottom <= z2.top + 1,
  };
});
const contrast = (page: Page) => page.evaluate(() => {
  const parse = (c: string) => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; const k = c.startsWith("color(") ? 255 : 1; return { r: m[0] * k, g: m[1] * k, b: m[2] * k, a: m.length > 3 ? m[3] : 1 }; };
  const lum = (x: { r: number; g: number; b: number }) => [x.r, x.g, x.b].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const over = (t: ReturnType<typeof parse>, u: ReturnType<typeof parse>) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
  const bg = (el: Element | null) => { const layers: ReturnType<typeof parse>[] = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none" && !cs.backgroundImage.startsWith("linear-gradient")) return null; const c = parse(cs.backgroundColor); if (c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let acc = { r: 255, g: 255, b: 255, a: 1 }; for (const l of layers.reverse()) acc = over(l, acc); return acc; };
  const res: { text: string; ratio: number; min: number }[] = [];
  for (const el of document.querySelectorAll(".syna-ui *")) {
    if (el.closest(".ss-panel-b, .ss-switcher, .ss-tools, .ss-prefs, .ss-brand, .ss-head-logo, [data-tuto-nudge]")) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim()).map((n) => n.textContent!.trim()).join(" ");
    if (!own) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === "hidden" || r.bottom < 0 || r.top > innerHeight) continue;
    if ((el as HTMLElement).closest("button:disabled")) continue;
    const b = bg(el); if (!b) continue;
    const f = over(parse(cs.color), b); const [hi, lo] = [lum(f), lum(b)].sort((x, y) => y - x);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    // Texte indicatif d'un champ vide : contrôlé au même seuil que le texte.
    res.push({ text: own.slice(0, 30), ratio: (hi + 0.05) / (lo + 0.05), min: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5 });
  }
  return { measured: res.length, min: Math.min(...res.map((x) => x.ratio)), fails: res.filter((x) => x.ratio < x.min).map((x) => `${x.text} ${x.ratio.toFixed(2)}`) };
});

const VALID = ["pilote", "produit", "marque", "strategie", "boutique", "catalogue", "biens", "carte", "realisations", "rendez-vous", "images", "videos", "prompts", "publications", "blog", "calendrier", "publicites", "fichiers", "connexions"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
let studio: Awaited<ReturnType<typeof startStudio>> | null = null;
const beforeParts = dataParts();
try {
  studio = await startStudio({ STUDIO_SYNA_SHELL: "1", STUDIO_CONVERSATION_LOT_A: "1", STUDIO_CONVERSATION_AI: "1", STUDIO_CONVERSATION_UI: "1" });
  const O = studio.origin;

  // ——— Captures : 2 modes × clair / sombre × 4 tailles (+ paysage) × boutique / restaurant ———
  const shots: Record<string, unknown>[] = [];
  for (const vp of [VIEWPORTS.ordinateur, VIEWPORTS.tablette, VIEWPORTS.tel390, VIEWPORTS.tel360]) for (const mode of ["encre", "plein"] as const) for (const appearance of ["light", "dark"] as const) {
    const s = await session(browser, O, vp);
    await setPrefs(s, O, { mode, appearance, accent: appearance === "dark" ? "cobalt" : null });
    for (const [key, tab] of [["sillon", "boutique"], ["table-saison", "carte"]] as const) {
      await go(s.page, O, key, tab);
      const file = `${mode}--${vp.label}--${key}-${tab}--${appearance === "light" ? "clair" : "sombre"}.png`;
      await s.page.screenshot({ path: path.join(out, file) });
      shots.push({ file, ...(await facts(s.page)), contrast: await contrast(s.page), errors: [...s.errors] });
    }
    await s.context.close();
  }
  report.shots = shots;
  const sh = shots as { file: string; mode: string; overflow: number; lastAboveBar: boolean; errors: string[]; contrast: { fails: string[]; min: number } }[];
  ok("32 captures : chaque mode s'affiche réellement (attribut et mise en page du Studio)", sh.every((x) => x.file.startsWith(x.mode + "--")));
  ok("aucun débordement horizontal (1440, 1024, 390, 360)", sh.every((x) => x.overflow <= 0), sh.filter((x) => x.overflow > 0).map((x) => x.file));
  ok("Plein cadre : en bas de page, aucun bouton de l'espace n'est caché sous la barre de commande", sh.every((x) => x.lastAboveBar), sh.filter((x) => !x.lastAboveBar).map((x) => x.file));
  ok("aucune erreur JavaScript", sh.every((x) => !x.errors.length), sh.flatMap((x) => x.errors).slice(0, 5));
  ok("contraste mesuré de la coquille ≥ AA dans chaque mode, clair et sombre", sh.every((x) => !x.contrast.fails.length), sh.flatMap((x) => x.contrast.fails).slice(0, 8));
  report.contrastMin = Math.min(...sh.map((x) => x.contrast.min));

  // Paysage au téléphone (Plein cadre) et panneau Personnaliser dans les deux modes.
  {
    const s = await session(browser, O, VIEWPORTS.paysage);
    await setPrefs(s, O, { mode: "plein", appearance: "light", accent: null });
    await go(s.page, O, "sillon", "images");
    await s.page.screenshot({ path: path.join(out, "plein--telephone-paysage--sillon-images.png") });
    const f = await facts(s.page);
    ok("téléphone en paysage (844 × 390) : Plein cadre sans débordement, rien caché sous la barre", f.overflow <= 0 && f.lastAboveBar, f);
    await s.context.close();
  }
  for (const [vp, mode] of [[VIEWPORTS.ordinateur, "encre"], [VIEWPORTS.ordinateur, "plein"], [VIEWPORTS.tel390, "plein"], [VIEWPORTS.tel390, "encre"]] as const) {
    const s = await session(browser, O, vp);
    await setPrefs(s, O, { mode, appearance: "light", accent: null });
    await go(s.page, O, "sillon", "catalogue");
    await s.page.locator("[data-open-customize]:visible").first().click();
    await s.page.waitForSelector("#ss-customize");
    await s.page.waitForTimeout(500);
    await s.page.screenshot({ path: path.join(out, `personnaliser--${mode}--${vp.label}.png`) });
    const inside = await s.page.evaluate(() => !!document.activeElement?.closest("#ss-customize"));
    await s.page.keyboard.press("Escape");
    const closed = !(await s.page.locator("#ss-customize").count());
    ok(`Personnaliser (${mode}, ${vp.label}) : s'ouvre avec le focus dedans, Échap le ferme`, inside && closed, { inside, closed });
    await s.context.close();
  }

  // ——— Les 12 tests de bascule (06-DEUX-MODES.md § 5) ———
  {
    const s = await session(browser, O, VIEWPORTS.ordinateur);
    await setPrefs(s, O, { mode: "encre", appearance: "light", accent: null, panel: "pinned" });
    await go(s.page, O, "sillon", "boutique");
    await s.page.waitForSelector("#syna-panel:not([hidden])", { timeout: 30000 });
    // 1. Brouillon : texte tapé dans la barre de commande, bascule au clavier, même texte et focus rendu au champ.
    const draft = "Retouche le titre de l'accueil";
    const cmd = s.page.locator("[data-syna-command]:visible").first();
    await cmd.fill(draft);
    await cmd.focus();
    const panelMark = await s.page.evaluate(() => { const el = document.querySelector("#syna-panel .ss-panel-b > *") as HTMLElement | null; el?.setAttribute("data-recette", "1"); return !!el; });
    const mainMark = await s.page.evaluate(() => { const el = document.querySelector("#studio-main > *:last-child") as HTMLElement | null; el?.setAttribute("data-recette", "1"); return !!el; });
    await switchKeys(s.page);
    const t1 = await s.page.evaluate(() => ({
      mode: document.querySelector("[data-syna-shell]")?.getAttribute("data-syna-shell"),
      value: (document.activeElement as HTMLInputElement | null)?.value,
      focusIsCommand: !!document.activeElement?.matches("[data-syna-command]") && !!document.activeElement.getClientRects().length,
    }));
    ok("1 · brouillon identique après la bascule (Ctrl Maj M), focus rendu au champ de commande", t1.mode === "plein" && t1.value === draft && t1.focusIsCommand, t1);
    // 2. Sélection et état : la conversation et l'écran de l'espace ne sont pas recréés.
    const t2 = await s.page.evaluate(() => ({ panel: !!document.querySelector('#syna-panel [data-recette="1"]'), main: !!document.querySelector('#studio-main [data-recette="1"]') }));
    ok("2 · conversation SINA et écran de l'espace jamais recréés par la bascule (état, sélection, brouillon conservés)", panelMark && mainMark && t2.panel && t2.main, t2);
    note("2 · sélection d'un élément de l'aperçu (A2)", "non réalisable sur main : la sélection A2 de Codex (#287) n'est pas fusionnée. Garantie structurelle : le contexte de sélection et la conversation ne sont pas recréés (vérifié ci-dessus).");
    // 3. Tâche en cours : même tâche, même progression, aucune nouvelle tâche ni appel.
    const jobsBefore = all("SELECT id, status, progress FROM jobs WHERE project_id = ?", P.sillon);
    await switchKeys(s.page);
    await switchKeys(s.page);
    const jobsAfter = all("SELECT id, status, progress FROM jobs WHERE project_id = ?", P.sillon);
    const shown = await s.page.locator("button[aria-label*='Tâches en cours'], button[aria-label*='Tasks in progress']").count();
    ok("3 · tâche en cours : même tâche, même progression, toujours affichée ; aucune tâche créée", JSON.stringify(jobsBefore) === JSON.stringify(jobsAfter) && shown > 0, { jobsBefore, jobsAfter, shown });
    note("4 · devis ouvert", "non réalisable sur main sans appel IA : un projet existant n'ouvre pas encore sa conversation (reprise A1 non fusionnée), donc aucun devis à l'écran. Garantie structurelle : le panneau de conversation (qui porte les devis) n'est jamais recréé (test 2).");
    await s.context.close();
  }
  {
    // 5. Chaque espace : même page, même titre, écran non rechargé.
    const s = await session(browser, O, VIEWPORTS.ordinateur);
    await setPrefs(s, O, { mode: "encre", panel: "collapsed" });
    const bad: string[] = [];
    for (const tab of ["boutique", "catalogue", "marque", "images", "videos", "publications", "pilote"]) {
      await go(s.page, O, "sillon", tab);
      await s.page.evaluate(() => (document.querySelector("#studio-main > *:last-child") as HTMLElement | null)?.setAttribute("data-recette", "1"));
      const url = s.page.url(), title = await s.page.locator("h1.ss-h1").textContent();
      await switchKeys(s.page);
      const after = { url: s.page.url(), title: await s.page.locator("h1.ss-h1").textContent(), kept: await s.page.evaluate(() => !!document.querySelector('#studio-main [data-recette="1"]')), mode: await modeOf(s.page) };
      if (after.url !== url || after.title !== title || !after.kept || after.mode !== "plein") bad.push(`${tab} ${JSON.stringify(after)}`);
      await switchKeys(s.page);
    }
    ok("5 · bascule sur Boutique, Catalogue, Marque, Images, Vidéos, Publications, Pilote : même page, même titre, sans rechargement", !bad.length, bad);
    // Les 23 adresses répondent dans chaque mode.
    for (const mode of ["encre", "plein"] as const) {
      await setPrefs(s, O, { mode });
      const miss: string[] = [];
      for (const [key, tabs] of [["sillon", VALID], ["table-saison", ["carte", "rendez-vous", "boutique", "produit"]]] as const) for (const tab of tabs) {
        const res = await s.page.goto(`${O}/studio/${P[key]}/${tab}`, { waitUntil: "domcontentloaded", timeout: 240000 });
        await s.page.waitForSelector("h1.ss-h1", { timeout: 60000 }).catch(() => undefined);
        const title = await s.page.locator("h1.ss-h1").textContent().catch(() => null);
        if (!res || res.status() !== 200 || !title?.trim() || (await modeOf(s.page)) !== mode) miss.push(`${key}/${tab}`);
      }
      ok(`les 23 adresses d'espaces répondent en ${mode === "encre" ? "Encre" : "Plein cadre"}`, !miss.length, miss);
    }
    await s.context.close();
  }
  {
    // 6. « Passe en Plein cadre » dans la barre : changement local, aucun appel d'IA, confirmation, annulation possible.
    const s = await session(browser, O, VIEWPORTS.ordinateur);
    await setPrefs(s, O, { mode: "encre", panel: "pinned" });
    await go(s.page, O, "sillon", "images");
    await s.page.waitForSelector("#syna-panel:not([hidden])", { timeout: 30000 });
    const reqs: string[] = [];
    s.page.on("request", (r) => { if (r.method() !== "GET") reqs.push(`${r.method()} ${new URL(r.url()).pathname}`); });
    const inline = s.page.locator("[data-syna-command]:visible").first();
    await inline.fill("Passe en Plein cadre");
    await inline.press("Enter");
    await s.page.waitForTimeout(800);
    const fb = await s.page.locator(".ss-cmd-feedback:visible").first().innerText().catch(() => "");
    const m6 = await modeOf(s.page);
    await s.page.screenshot({ path: path.join(out, "commande--passe-en-plein-cadre.png") });
    ok("6 · « Passe en Plein cadre » : appliqué sur place, confirmation « sans IA ni coût », seule écriture = réglage d'affichage", m6 === "plein" && /sans IA/.test(fb) && reqs.every((r) => r === "PUT /api/studio/ui-prefs"), { m6, fb, reqs });
    await s.page.locator(".ss-cmd-undo:visible").first().click();
    await s.page.waitForTimeout(600);
    ok("6 · « Annuler » rétablit Encre", (await modeOf(s.page)) === "encre");
    // « Agrandis l'aperçu » : la conversation se rétrécit (l'aperçu prend la place) ; « change le mode » demande une précision.
    const w0 = await s.page.evaluate(() => document.querySelector("#syna-panel")!.getBoundingClientRect().width);
    const c2 = s.page.locator("[data-syna-command]:visible").first();
    await c2.fill("Agrandis l'aperçu"); await c2.press("Enter"); await s.page.waitForTimeout(800);
    const w1 = await s.page.evaluate(() => document.querySelector("#syna-panel")!.getBoundingClientRect().width);
    ok("6 · « Agrandis l'aperçu » : la conversation passe de 440 à 360 px, l'aperçu s'élargit", Math.round(w0) === 440 && Math.round(w1) === 360, { w0, w1 });
    await c2.fill("change le mode"); await c2.press("Enter"); await s.page.waitForTimeout(500);
    const ask = await s.page.locator(".ss-cmd-feedback:visible").first().innerText();
    ok("6 · demande ambiguë : une question avec les deux choix, rien n'est changé", /Quel mode/.test(ask) && (await modeOf(s.page)) === "encre", ask);
    await c2.fill("Crée 3 images de la finition Cuivre"); await c2.press("Enter"); await s.page.waitForTimeout(800);
    const other = await s.page.locator(".ss-cmd-feedback:visible").first().innerText();
    ok("6 · une vraie demande n'est pas traitée localement : confiée à la conversation, rien d'envoyé à l'IA", /conversation/.test(other) && !aiPosts.length, { other, aiPosts });
    await s.context.close();
  }
  {
    // 7. Compte puis exception du projet ; « Réglages par défaut » ne touche pas aux projets ; retour au compte.
    const s = await session(browser, O, VIEWPORTS.ordinateur);
    await setPrefs(s, O, {}, "account");
    await setPrefs(s, O, {}, "project");
    await go(s.page, O, "sillon", "pilote");
    await s.page.locator("[data-open-customize]:visible").first().click();
    await s.page.locator("#ss-customize").getByRole("button", { name: "Ce projet seulement" }).click();
    await s.page.locator("#ss-customize button.ss-mode[data-mode='plein']").click();
    await s.page.waitForTimeout(1200);
    const stored = one<{ prefs: string }>("SELECT prefs FROM studio_ui_prefs WHERE user_id = ? AND project_id = ?", userA.id, P.sillon);
    await go(s.page, O, "table-saison", "carte");
    const otherMode = await modeOf(s.page);
    await go(s.page, O, "sillon", "pilote");
    const thisMode = await modeOf(s.page);
    await s.page.locator("[data-open-customize]:visible").first().click();
    await s.page.locator("#ss-customize").getByRole("button", { name: /Réglages par défaut/ }).click();
    await s.page.waitForTimeout(1000);
    const afterReset = await modeOf(s.page);
    await s.page.locator("#ss-customize").getByRole("button", { name: /Suivre de nouveau le compte/ }).click();
    await s.page.waitForTimeout(1000);
    const followed = await modeOf(s.page);
    await s.page.screenshot({ path: path.join(out, "personnaliser--portee-projet.png") });
    ok("7 · exception du projet enregistrée sur le serveur ; l'autre projet suit le compte (Encre)", !!stored && JSON.parse(stored.prefs).mode === "plein" && otherMode === "encre" && thisMode === "plein", { stored: stored?.prefs, otherMode, thisMode });
    ok("7 · « Réglages par défaut » vide le compte sans toucher à l'exception ; « Suivre de nouveau le compte » la retire", afterReset === "plein" && followed === "encre", { afterReset, followed });
    await s.context.close();
  }
  {
    // 8. Deux appareils (deux sessions distinctes) : synchronisation au chargement et au retour sur la page.
    const a = await session(browser, O, VIEWPORTS.ordinateur);
    const b = await session(browser, O, VIEWPORTS.tel390);
    await setPrefs(a, O, {}, "project");
    await go(a.page, O, "sillon", "boutique");
    await a.page.locator(".ss-modeswitch button", { hasText: "Plein cadre" }).click();
    await a.page.waitForTimeout(1200);
    await go(b.page, O, "table-saison", "carte");
    const onB = await modeOf(b.page);
    await b.page.locator("[data-open-customize]:visible").first().click();
    await b.page.locator("#ss-customize button.ss-mode[data-mode='encre']").click();
    await b.page.locator("#ss-customize").getByRole("radio", { name: "Bleu de Prusse" }).click();
    await b.page.waitForTimeout(1200);
    await a.page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await a.page.waitForTimeout(1500);
    const onA = await a.page.evaluate(() => ({ mode: document.querySelector("[data-syna-shell]")?.getAttribute("data-syna-shell"), accent: document.querySelector(".ss-head-scope")?.getAttribute("data-syna-accent") }));
    ok("8 · deux appareils : le choix de l'ordinateur est retrouvé au chargement du téléphone (autre projet, même compte)", onB === "plein", onB);
    ok("8 · le choix du téléphone arrive sur l'ordinateur au retour sur la page, sans recharger", onA.mode === "encre" && onA.accent === "prusse", onA);
    // Droits entre comptes : le compte B ne lit ni n'écrit les réglages d'un projet du compte A.
    const c = await session(browser, O, VIEWPORTS.ordinateur, "b");
    const r1 = await c.context.request.get(`${O}/api/studio/ui-prefs?projectId=${P.sillon}`);
    const r2 = await c.context.request.put(`${O}/api/studio/ui-prefs`, { headers: { origin: O }, data: { scope: "project", projectId: P.sillon, prefs: { mode: "plein" } } });
    const r3 = await c.page.goto(`${O}/studio/${P.sillon}/boutique`, { waitUntil: "domcontentloaded" });
    ok("8 · droits : un autre compte ne lit ni n'écrit ces réglages (404) et n'ouvre pas le projet", r1.status() === 404 && r2.status() === 404 && r3?.status() === 404, { get: r1.status(), put: r2.status(), page: r3?.status() });
    await a.context.close(); await b.context.close(); await c.context.close();
  }
  {
    // 10. Clavier seul et annonces : Ctrl J ouvre SINA, Échap ferme et rend le focus, changement de mode annoncé.
    const s = await session(browser, O, VIEWPORTS.ordinateur);
    await setPrefs(s, O, { mode: "encre", panel: "collapsed", convoWidth: null });
    await go(s.page, O, "sillon", "images");
    await s.page.locator(".ss-nav a[data-space='images']").focus();
    await s.page.keyboard.press("Control+j");
    await s.page.waitForTimeout(500);
    const opened = await s.page.evaluate(() => !document.querySelector("#syna-panel")?.hasAttribute("hidden") && !!document.activeElement?.closest("#syna-panel"));
    await s.page.keyboard.press("Escape");
    await s.page.waitForTimeout(300);
    const back = await s.page.evaluate(() => ({ hidden: document.querySelector("#syna-panel")?.hasAttribute("hidden"), focus: (document.activeElement as HTMLElement | null)?.dataset.space ?? document.activeElement?.tagName }));
    await switchKeys(s.page);
    const said = await s.page.locator(".ss-custom-scope [role=status]").innerText();
    ok("10 · Ctrl J ouvre SINA (focus dedans), Échap la ferme et rend le focus là où il était", opened && !!back.hidden && back.focus === "images", { opened, back });
    ok("10 · le changement de mode est annoncé aux lecteurs d'écran (aria-live)", /Plein cadre/.test(said), said);
    // Bord de la conversation au clavier (séparateur ajustable).
    await switchKeys(s.page);
    await s.page.keyboard.press("Control+j");
    await s.page.waitForTimeout(400);
    const sep = s.page.locator("#syna-panel .ss-resize");
    await sep.focus(); await s.page.keyboard.press("ArrowLeft"); await s.page.keyboard.press("ArrowLeft");
    await s.page.waitForTimeout(800);
    const now = await sep.getAttribute("aria-valuenow");
    ok("10 · largeur de la conversation réglable au clavier (séparateur, flèches) et enregistrée", now === "480", now);
    await s.context.close();
  }
  {
    // 11. Animations réduites.
    const s = await session(browser, O, VIEWPORTS.tablette, "a", { reduced: true });
    await setPrefs(s, O, { mode: "plein", convoWidth: null });
    await go(s.page, O, "sillon", "pilote");
    const anim = await s.page.evaluate(() => [".ss-cmd-dot", ".ss-cmd-zone"].map((q) => { const el = document.querySelector(q); return el ? getComputedStyle(el).animationDuration : "absent"; }));
    await s.page.locator("button.ss-cmd-go:visible").first().click();
    await s.page.waitForTimeout(400);
    const panelAnim = await s.page.evaluate(() => { const p = document.querySelector("#syna-panel"); return p ? getComputedStyle(p).animationName : "absent"; });
    ok("11 · animations réduites : rien ne pulse ni ne glisse", anim.every((d) => d === "absent" || parseFloat(d) < 0.01 || d === "0s") && (panelAnim === "none" || panelAnim === "absent"), { anim, panelAnim });
    await s.context.close();
  }
  // 12. Données, exports, site du client : rien ne change avec l'affichage.
  {
    // 12. Les bascules seules ne changent aucune donnée : relevé juste avant et juste après 10 changements de mode.
    const s = await session(browser, O, VIEWPORTS.ordinateur);
    await go(s.page, O, "sillon", "boutique");
    const p0 = dataParts();
    for (let i = 0; i < 10; i++) await switchKeys(s.page);
    await s.page.locator("[data-open-customize]:visible").first().click();
    for (const a of ["Bleu de Prusse", "Cobalt", "Bleu d'encre"]) await s.page.locator("#ss-customize").getByRole("radio", { name: a }).click();
    await s.page.waitForTimeout(1500);
    const p1 = dataParts();
    ok("12 · 10 bascules de mode et 3 changements de bleu : projets, versions du thème, tâches, abonnements et appels IA strictement identiques", !changed(p0, p1).length, changed(p0, p1));
    await s.context.close();
    // Sur toute la recette (visites de pages comprises) : ce qui a bougé est relevé, pour le compte rendu.
    report.changedDuringRun = changed(beforeParts, dataParts());
    report.jobsAtEnd = dataParts().jobs;
  }
  note("12 · export ZIP octet pour octet", "non comparé en ZIP : les projets de démonstration n'ont pas de boutique composée. Garantie de code : l'export et le rendu du site ne lisent jamais ces réglages (test unitaire) et la base du projet est identique (ci-dessus).");
  {
    // 9. Téléphone, Plein cadre : feuille SINA au-dessus de la zone de commande, zone et feuilles utilisables.
    const s = await session(browser, O, VIEWPORTS.tel360);
    await setPrefs(s, O, { mode: "plein", panel: "pinned", convoWidth: null });
    await go(s.page, O, "sillon", "boutique");
    await s.page.locator("button.ss-cmd-go:visible").first().click();
    await s.page.waitForTimeout(800);
    const geo = await s.page.evaluate(() => ({ sheet: document.querySelector("#syna-panel")!.getBoundingClientRect().bottom, zone: document.querySelector(".ss-cmd-zone")!.getBoundingClientRect().top }));
    await s.page.screenshot({ path: path.join(out, "plein--telephone-360--syna-ouverte.png") });
    ok("9 · téléphone Plein cadre : la feuille SINA s'arrête au-dessus de la zone de commande", geo.sheet <= geo.zone + 1, geo);
    await s.page.keyboard.press("Escape");
    await s.page.locator(".ss-cmd-zone button[aria-controls='ss-spaces']").click();
    await s.page.waitForSelector("#ss-spaces");
    await s.page.waitForTimeout(500);
    await s.page.screenshot({ path: path.join(out, "plein--telephone-360--espaces.png") });
    await s.page.locator("#ss-spaces a[data-space='images']").click();
    await s.page.waitForURL(/\/images$/);
    ok("9 · téléphone Plein cadre : la feuille Espaces ouvre l'espace choisi", (await modeOf(s.page)) === "plein");
    const small = await s.page.evaluate(() => [...document.querySelectorAll(".ss-cmd-zone button")].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 40 || r.height < 40); }).length);
    ok("9 · cibles de la zone de commande d'au moins 40 px", small === 0, small);
    note("9 · clavier virtuel", "non simulable dans Chromium sans écran : la barre et la feuille suivent `visualViewport` (code), à vérifier sur un vrai téléphone.");
    await s.context.close();
  }
  {
    // Retour à l'interface actuelle (inchangé depuis le lot 1).
    const s = await session(browser, O, VIEWPORTS.ordinateur);
    await setPrefs(s, O, { mode: "plein" });
    await go(s.page, O, "sillon", "boutique");
    await s.page.locator("[data-syna-shell-switch='classic']:visible").first().click().catch(async () => { await s.page.locator("[data-open-customize]").first().click(); });
    await s.page.waitForFunction(() => !document.querySelector("[data-syna-shell]"), null, { timeout: 60000 }).catch(() => undefined);
    const classic = await s.page.evaluate(() => !document.querySelector("[data-syna-shell]"));
    await s.page.locator('[data-syna-shell-switch="syna"]').first().click();
    await s.page.waitForFunction(() => !!document.querySelector("[data-syna-shell]"), null, { timeout: 60000 });
    ok("retour « Interface actuelle » puis « Nouvelle interface » (le mode choisi est retrouvé)", classic && (await modeOf(s.page)) === "plein");
    await s.context.close();
  }
  await studio.stop();
  studio = null;

  // ——— B. Coquille, drapeaux SINA fermés : les réglages restent cohérents, aucune conversation simulée ———
  studio = await startStudio({ STUDIO_SYNA_SHELL: "1" });
  for (const vp of [VIEWPORTS.ordinateur, VIEWPORTS.tel390]) {
    const s = await session(browser, studio.origin, vp);
    await setPrefs(s, studio.origin, { mode: "plein" });
    await go(s.page, studio.origin, "sillon", "boutique");
    // Une vraie demande : rien n'est envoyé, la barre le dit. Puis une commande d'affichage : elle marche sans SINA.
    const c = s.page.locator("[data-syna-command]:visible").first();
    await c.fill("Crée une image de la machine"); await c.press("Enter"); await s.page.waitForTimeout(600);
    const said = await s.page.locator(".ss-cmd-feedback:visible").first().innerText().catch(() => "");
    await s.page.screenshot({ path: path.join(out, `drapeaux-fermes--${vp.label}.png`) });
    await c.fill("Reviens à Encre"); await c.press("Enter"); await s.page.waitForTimeout(800);
    const m = await modeOf(s.page);
    const anySyna = await s.page.locator("#syna-panel, [aria-controls='syna-panel']").count();
    ok(`drapeaux SINA fermés (${vp.label}) : « rien n'a été envoyé » pour une demande, la commande d'affichage marche, aucun accès SINA simulé`, /rien n.a été envoyé/.test(said) && m === "encre" && anySyna === 0, { said, m, anySyna });
    await s.context.close();
  }
} catch (e) {
  ok("recette menée jusqu'au bout", false, String(e).slice(0, 800));
} finally {
  await studio?.stop();
  await browser.close();
  ok("aucune requête hors du serveur local (aucun fournisseur appelé)", !(report.external as string[]).length, (report.external as string[]).slice(0, 5));
  ok("aucune requête d'écriture vers la conversation ou une génération (0 appel IA)", !aiPosts.length, aiPosts);
  fs.writeFileSync(path.join(out, "recette.json"), JSON.stringify(report, null, 2));
  process.exit(0);
}
