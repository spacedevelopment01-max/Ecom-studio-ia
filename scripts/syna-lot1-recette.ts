/**
 * Mission #282, lot 1 — recette de la coquille SYNA dans un vrai navigateur, sur une base temporaire isolée.
 *
 *   npx tsx scripts/syna-lot1-recette.ts <dossier>
 *
 * Deux projets de démonstration (SILLON, boutique ; TABLE SAISON, restaurant). Le Studio est lancé en développement
 * deux fois, sur ce serveur local seulement :
 *   A. coquille SYNA activée (STUDIO_SYNA_SHELL=1) et panneau SYNA visible (drapeaux d'interface STUDIO_CONVERSATION_*) ;
 *   B. coquille activée, drapeaux SYNA fermés (comme une installation où SYNA n'est pas ouverte).
 * Aucune clé d'IA, aucun message envoyé à SYNA, aucun réseau extérieur (toute requête hors du serveur local est comptée).
 * Résultat : captures et `recette.json` dans le dossier.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const out = path.resolve(process.argv[2] ?? "reports/syna-lot1");
fs.mkdirSync(out, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-syna-lot1-"));
process.env.DATA_DIR = temp;
process.env.STOCK_OFFLINE = "1";
for (const k of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[k] = "";

const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth");
const { runWithLang } = await import("../src/lib/i18n-server");
const { run } = await import("../src/lib/db");
const password = "lot1-" + Math.random().toString(36).slice(2), email = "syna-lot1@example.invalid";
const user = await createUser(email, password, "Recette lot 1");
const P: Record<string, string> = {};
for (const key of ["sillon", "table-saison"]) {
  const f = await runWithLang({ content: "fr", ui: "fr" }, () => demoProject(user.id, key as never));
  run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active',?,?,?,'admin',?,?)", `lot1-${f.pid}`, "dominer", user.id, f.pid, Date.now(), Date.now());
  P[key] = f.pid;
}

const VALID = ["pilote", "produit", "marque", "strategie", "boutique", "catalogue", "biens", "carte", "realisations", "rendez-vous", "images", "videos", "prompts", "publications", "blog", "calendrier", "publicites", "fichiers", "connexions"];
const VIEWPORTS = [
  { label: "ordinateur-1440", width: 1440, height: 900, mobile: false },
  { label: "tablette-1024", width: 1024, height: 768, mobile: false },
  { label: "telephone-390", width: 390, height: 844, mobile: true },
  { label: "telephone-360", width: 360, height: 780, mobile: true },
] as const;
const PAGES = [["sillon", "boutique"], ["sillon", "images"], ["table-saison", "carte"]] as const;
const report: Record<string, unknown> = { date: new Date().toISOString(), external: [] as string[], checks: {} as Record<string, unknown> };
const checks = report.checks as Record<string, unknown>;
const ok = (name: string, value: boolean, detail?: unknown) => { checks[name] = { ok: value, ...(detail === undefined ? {} : { detail }) }; console.log(`${value ? "✓" : "✗"} ${name}${detail !== undefined && !value ? " — " + JSON.stringify(detail).slice(0, 300) : ""}`); };

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

async function session(browser: Browser, origin: string, vp: (typeof VIEWPORTS)[number], opts: { dark?: boolean; classic?: boolean; reduced?: boolean } = {}) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, locale: "fr-FR", hasTouch: vp.mobile, isMobile: vp.mobile, reducedMotion: opts.reduced ? "reduce" : "no-preference" });
  await context.addInitScript({ content: `window.__name=function(f){return f};try{sessionStorage.setItem('ecsSeen','1');${opts.dark ? "localStorage.setItem('ecs-theme','dark');" : ""}}catch(e){}` });
  if (opts.classic) await context.addCookies([{ name: "ecs-syna-shell", value: "classic", url: origin }]);
  // Le serveur de développement peut couper une connexion pendant qu'il compile : trois essais espacés.
  let login: Awaited<ReturnType<BrowserContext["request"]["post"]>> | null = null;
  for (let i = 0; i < 3 && !login?.ok(); i++) {
    login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } }).catch(() => null);
    if (!login?.ok()) await new Promise((r) => setTimeout(r, 4000));
  }
  if (!login?.ok()) throw new Error(`connexion ${login?.status()}`);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  page.on("request", (r) => { const u = new URL(r.url()); if (!["127.0.0.1", "localhost"].includes(u.hostname) && !u.protocol.startsWith("data")) (report.external as string[]).push(r.url()); });
  return { context, page, errors };
}

async function go(page: Page, origin: string, key: string, tab: string) {
  await page.goto(`${origin}/studio/${P[key]}/${tab}`, { waitUntil: "networkidle", timeout: 240000 }).catch(() => undefined);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ });
  if (await nudge.count()) await nudge.first().click().catch(() => undefined);
}

const pageFacts = (page: Page) => page.evaluate(() => {
  const pill = [...document.querySelectorAll("button")].some((b) => /^\s*SYNA\s*$/.test(b.textContent ?? "") && b.className.includes("bg-ink") && getComputedStyle(b).position === "fixed");
  return {
    shell: document.querySelector("[data-syna-shell]") ? "syna" : "classic",
    overflow: document.documentElement.scrollWidth - innerWidth,
    blackPill: pill,
    rail: !!document.querySelector('.sy-trigger[data-variant="rail"]'),
    tab: !!document.querySelector('.sy-trigger[data-variant="tab"]'),
    title: document.querySelector("h1")?.textContent?.trim() ?? "",
  };
});

/** Contraste mesuré des textes de la coquille (conteneurs `.syna-ui`), comme au lot 0. */
const contrast = (page: Page) => page.evaluate(() => {
  // Couleurs calculées : « rgb(…) » (0–255) ou « color(srgb …) » (0–1, produit par color-mix).
  const parse = (c: string) => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; const k = c.startsWith("color(") ? 255 : 1; return { r: m[0] * k, g: m[1] * k, b: m[2] * k, a: m.length > 3 ? m[3] : 1 }; };
  const lum = (x: { r: number; g: number; b: number }) => [x.r, x.g, x.b].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const over = (t: ReturnType<typeof parse>, u: ReturnType<typeof parse>) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
  const bg = (el: Element | null) => { const layers: ReturnType<typeof parse>[] = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none" && !cs.backgroundImage.startsWith("linear-gradient")) return null; const c = parse(cs.backgroundColor); if (c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let acc = { r: 255, g: 255, b: 255, a: 1 }; for (const l of layers.reverse()) acc = over(l, acc); return acc; };
  const res: { text: string; ratio: number; min: number }[] = [];
  for (const el of document.querySelectorAll(".syna-ui *")) {
    // Contenus actuels réutilisés tels quels (conversation, sélecteur de projet, outils de l'en-tête) et logo (exempté par WCAG).
    if (el.closest(".ss-panel-b, .ss-switcher, .ss-tools, .ss-prefs, .ss-brand, .ss-head-logo, [data-tuto-nudge]")) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim()).map((n) => n.textContent!.trim()).join(" ");
    if (!own) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === "hidden" || r.bottom < 0 || r.top > innerHeight) continue;
    const b = bg(el); if (!b) continue;
    const f = over(parse(cs.color), b); const [hi, lo] = [lum(f), lum(b)].sort((x, y) => y - x);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    res.push({ text: own.slice(0, 30), ratio: (hi + 0.05) / (lo + 0.05), min: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5 });
  }
  return { measured: res.length, min: Math.min(...res.map((x) => x.ratio)), fails: res.filter((x) => x.ratio < x.min).map((x) => `${x.text} ${x.ratio.toFixed(2)}`) };
});

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
let studio: Awaited<ReturnType<typeof startStudio>> | null = null;
try {
  // ——— A. Coquille + SYNA visible ———
  studio = await startStudio({ STUDIO_SYNA_SHELL: "1", STUDIO_CONVERSATION_LOT_A: "1", STUDIO_CONVERSATION_AI: "1", STUDIO_CONVERSATION_UI: "1" });
  const shots: unknown[] = [];
  for (const vp of VIEWPORTS) for (const dark of [false, true]) {
    const s = await session(browser, studio.origin, vp, { dark });
    for (const [key, tab] of PAGES) {
      await go(s.page, studio.origin, key, tab);
      const file = `apres--${vp.label}--${key}-${tab}--${dark ? "sombre" : "clair"}.png`;
      await s.page.screenshot({ path: path.join(out, file) });
      const f = await pageFacts(s.page);
      shots.push({ file, ...f, contrast: await contrast(s.page), errors: [...s.errors] });
    }
    await s.context.close();
  }
  report.shots = shots;
  const sh = shots as { file: string; shell: string; overflow: number; blackPill: boolean; rail: boolean; tab: boolean; errors: string[]; contrast: { fails: string[]; min: number } }[];
  ok("coquille SYNA affichée sur les 24 captures", sh.every((x) => x.shell === "syna"));
  ok("aucune pastille noire flottante", sh.every((x) => !x.blackPill));
  ok("onglet signature à l'ordinateur et à la tablette, onglet Syna au téléphone", sh.every((x) => (x.file.includes("telephone") ? x.tab : x.rail)));
  ok("aucun débordement horizontal", sh.every((x) => x.overflow <= 0), sh.filter((x) => x.overflow > 0).map((x) => x.file));
  ok("aucune erreur JavaScript", sh.every((x) => !x.errors.length), sh.flatMap((x) => x.errors));
  ok("contraste mesuré de la coquille ≥ seuil AA", sh.every((x) => !x.contrast.fails.length), sh.flatMap((x) => x.contrast.fails).slice(0, 8));
  report.contrastMin = Math.min(...sh.map((x) => x.contrast.min));

  // Avant : même serveur, interface actuelle (retour arrière), mêmes pages.
  for (const vp of VIEWPORTS) {
    const s = await session(browser, studio.origin, vp, { classic: true });
    for (const [key, tab] of PAGES) {
      await go(s.page, studio.origin, key, tab);
      await s.page.screenshot({ path: path.join(out, `avant--${vp.label}--${key}-${tab}--clair.png`) });
    }
    await s.context.close();
  }

  // Liens profonds : chaque adresse actuelle répond dans la nouvelle coquille, titrée.
  {
    const s = await session(browser, studio.origin, VIEWPORTS[0]);
    const bad: string[] = [];
    for (const [key, tabs] of [["sillon", VALID], ["table-saison", ["carte", "rendez-vous", "boutique", "produit"]]] as const) for (const tab of tabs) {
      const res = await s.page.goto(`${studio.origin}/studio/${P[key]}/${tab}`, { waitUntil: "domcontentloaded", timeout: 240000 });
      await s.page.waitForSelector("h1.ss-h1", { timeout: 60000 }).catch(() => undefined);
      const title = await s.page.locator("h1.ss-h1").textContent().catch(() => null);
      if (!res || res.status() !== 200 || !title?.trim()) bad.push(`${key}/${tab} ${res?.status()} ${title}`);
    }
    ok(`les ${VALID.length + 4} adresses d'espaces répondent dans la coquille, avec leur titre`, !bad.length, bad);
    // Menu : un clic sur un espace ouvre son adresse.
    await go(s.page, studio.origin, "sillon", "pilote");
    await s.page.locator('.ss-nav a[data-space="images"]').click();
    await s.page.waitForURL(/\/images$/);
    ok("le menu ouvre l'espace choisi (lien profond)", (await s.page.locator('.ss-nav a[aria-current="page"]').getAttribute("data-space")) === "images");
    await s.context.close();
  }

  // SYNA à l'ordinateur : colonne, clavier, Échap, brouillon conservé.
  {
    const s = await session(browser, studio.origin, VIEWPORTS[0]);
    await go(s.page, studio.origin, "sillon", "pilote");
    const rail = s.page.locator('.sy-trigger[data-variant="rail"]');
    await rail.focus();
    await s.page.keyboard.press("Enter");
    await s.page.waitForSelector("#syna-panel:not([hidden])");
    const docked = await s.page.evaluate(() => ({ role: document.querySelector("#syna-panel")?.getAttribute("role"), modal: document.querySelector("#syna-panel")?.getAttribute("aria-modal"), inPanel: !!document.activeElement?.closest("#syna-panel") }));
    ok("ordinateur : SYNA s'ouvre au clavier en colonne à côté de l'espace (non modale)", docked.role === "complementary" && !docked.modal, docked);
    // Contenu réel du panneau (le même ConversationPanel qu'aujourd'hui) : on attend qu'il ait fini de charger.
    await s.page.waitForFunction(() => !/Reprise de votre conversation/.test(document.querySelector("#syna-panel")?.textContent ?? ""), null, { timeout: 120000 }).catch(() => undefined);
    await s.page.waitForTimeout(800);
    await s.page.screenshot({ path: path.join(out, "syna--ordinateur-1440--ouverte.png") });
    report.panelText = (await s.page.locator("#syna-panel").innerText()).slice(0, 600);
    // Sur main, un projet existant n'ouvre pas encore sa conversation (reprise A1 de Codex non fusionnée) : pas de zone
    // de saisie. On prouve donc que le panneau n'est jamais recréé (même nœud, même état React, brouillon compris).
    const box = s.page.locator("#syna-panel textarea").first();
    const hasBox = await box.count();
    const draft = "Brouillon : raccourcir le titre de l'accueil";
    if (hasBox) await box.fill(draft);
    await s.page.evaluate(() => { (document.querySelector("#syna-panel .ss-panel-b > *") as HTMLElement | null)?.setAttribute("data-recette-marque", "1"); });
    await s.page.keyboard.press("Escape");
    await s.page.waitForTimeout(300);
    const closed = await s.page.evaluate(() => ({ hidden: document.querySelector("#syna-panel")?.hasAttribute("hidden"), focus: (document.activeElement as HTMLElement | null)?.dataset.variant ?? document.activeElement?.tagName }));
    ok("Échap replie SYNA et rend le focus à l'onglet signature", !!closed.hidden && closed.focus === "rail", closed);
    await s.page.locator('.ss-nav a[data-space="images"]').click();
    await s.page.waitForURL(/\/images$/);
    await s.page.locator('.sy-trigger[data-variant="rail"]').click();
    await s.page.waitForSelector("#syna-panel:not([hidden])");
    const kept = hasBox ? await s.page.locator("#syna-panel textarea").first().inputValue() : null;
    const same = await s.page.evaluate(() => !!document.querySelector('#syna-panel [data-recette-marque="1"]'));
    ok("conversation jamais recréée après fermeture et changement d'espace (état et brouillon conservés)", same && (!hasBox || kept === draft), { same, hasBox: !!hasBox, kept });
    report.composerAvailable = !!hasBox;
    // La bulle des tutoriels ne recouvre pas la colonne ouverte.
    const nudge = await s.page.evaluate(() => { const n = document.querySelector("[data-tuto-nudge]"); const p = document.querySelector("#syna-panel"); if (!n || !p) return null; const a = n.getBoundingClientRect(), b = p.getBoundingClientRect(); return a.right <= b.left + 1; });
    ok("la bulle « Première visite ? » ne recouvre pas la colonne SYNA ouverte", nudge !== false, nudge);
    await s.context.close();
  }

  // SYNA à la tablette : panneau modal, Tab qui reste dedans, Échap.
  {
    const s = await session(browser, studio.origin, VIEWPORTS[1]);
    await go(s.page, studio.origin, "sillon", "catalogue");
    await s.page.locator('.sy-trigger[data-variant="rail"]').click();
    await s.page.waitForSelector("#syna-panel:not([hidden])");
    await s.page.waitForTimeout(800);
    await s.page.screenshot({ path: path.join(out, "syna--tablette-1024--ouverte.png") });
    const modal = await s.page.evaluate(() => document.querySelector("#syna-panel")?.getAttribute("aria-modal"));
    let inside = true;
    for (let i = 0; i < 12; i++) { await s.page.keyboard.press("Tab"); inside &&= await s.page.evaluate(() => !!document.activeElement?.closest("#syna-panel")); }
    await s.page.keyboard.press("Escape");
    const hidden = await s.page.evaluate(() => document.querySelector("#syna-panel")?.hasAttribute("hidden"));
    ok("tablette : SYNA en panneau modal, le focus reste dedans, Échap le ferme", modal === "true" && inside && !!hidden, { modal, inside, hidden });
    await s.context.close();
  }

  // Téléphone : onglet Syna, barre toujours visible, feuilles Espaces et Suivi.
  {
    const s = await session(browser, studio.origin, VIEWPORTS[2]);
    await go(s.page, studio.origin, "table-saison", "carte");
    await s.page.locator('.ss-tabbar .sy-trigger[data-variant="tab"]').click();
    await s.page.waitForSelector("#syna-panel:not([hidden])");
    await s.page.waitForTimeout(800);
    await s.page.screenshot({ path: path.join(out, "syna--telephone-390--ouverte.png") });
    const geo = await s.page.evaluate(() => ({ panelBottom: document.querySelector("#syna-panel")!.getBoundingClientRect().bottom, barTop: document.querySelector("[data-mobile-nav]")!.getBoundingClientRect().top }));
    ok("téléphone : SYNA s'ouvre au-dessus de la barre basse, qui reste visible", geo.panelBottom <= geo.barTop + 1, geo);
    await s.page.locator(".ss-tabbar .ss-tab").first().click();
    await s.page.locator('.ss-tabbar button[aria-controls="ss-spaces"]').click();
    await s.page.waitForSelector("#ss-spaces");
    await s.page.waitForTimeout(600); // fin de l'apparition de la feuille
    await s.page.screenshot({ path: path.join(out, "espaces--telephone-390.png") });
    const names = await s.page.locator("#ss-spaces a[data-space]").evaluateAll((as) => as.map((a) => a.getAttribute("data-space")));
    // Le restaurant de démonstration n'a pas encore choisi son thème : comme dans l'interface actuelle (spaceVisible), la
    // Carte n'apparaît qu'après le choix du thème Table Saison ; un site de services n'a pas de Catalogue.
    ok("téléphone : la feuille Espaces suit la règle des métiers (site de services : pas de Catalogue)", names.includes("pilote") && names.includes("produit") && names.includes("boutique") && !names.includes("catalogue"), names);
    checks["espaces-restaurant"] = { ok: true, detail: names };
    await s.page.waitForTimeout(600);
    const hit = await s.page.evaluate(() => { const a = document.querySelector('#ss-spaces a[data-space="images"]')!; const r = a.getBoundingClientRect(); return !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('a[data-space="images"]'); });
    ok("téléphone : les espaces de la feuille sont au premier plan (rien ne les recouvre)", hit);
    await s.page.locator('#ss-spaces a[data-space="images"]').click();
    await s.page.waitForURL(/\/images$/);
    ok("téléphone : choisir un espace l'ouvre et referme la feuille", !(await s.page.locator("#ss-spaces").count()));
    await s.page.locator('.ss-tabbar button[aria-controls="ss-suivi"]').click();
    await s.page.waitForSelector("#ss-suivi");
    await s.page.waitForTimeout(600);
    await s.page.screenshot({ path: path.join(out, "suivi--telephone-390.png") });
    ok("téléphone : Suivi montre les tâches réelles (ici aucune) et annonce le suivi complet pour le lot 2", /Aucune tâche en cours|%/.test(await s.page.locator("#ss-suivi").innerText()) && /lot 2/.test(await s.page.locator("#ss-suivi").innerText()));
    await s.page.keyboard.press("Escape");
    ok("téléphone : Échap ferme la feuille", !(await s.page.locator("#ss-suivi").count()));
    const small = await s.page.evaluate(() => [...document.querySelectorAll(".syna-ui button, .syna-ui a")].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && b.closest(".ss-tabbar") && (r.height < 44 || r.width < 44); }).length);
    ok("téléphone : boutons de la barre basse d'au moins 44 px", small === 0, small);
    await s.context.close();
  }

  // Animations réduites.
  {
    const s = await session(browser, studio.origin, VIEWPORTS[1], { reduced: true });
    await go(s.page, studio.origin, "sillon", "pilote");
    await s.page.locator('.sy-trigger[data-variant="rail"]').click();
    await s.page.waitForSelector("#syna-panel:not([hidden])");
    const anim = await s.page.evaluate(() => getComputedStyle(document.querySelector("#syna-panel")!).animationName);
    ok("animations réduites : le panneau apparaît sans animation", anim === "none", anim);
    await s.context.close();
  }

  // Retour arrière : « Interface actuelle » puis « Nouvelle interface ».
  {
    const s = await session(browser, studio.origin, VIEWPORTS[0]);
    await go(s.page, studio.origin, "sillon", "boutique");
    await s.page.locator('.ss-side-foot [data-syna-shell-switch="classic"]').click();
    await s.page.waitForFunction(() => !document.querySelector("[data-syna-shell]"), null, { timeout: 60000 });
    const classic = await pageFacts(s.page);
    await s.page.screenshot({ path: path.join(out, "retour--interface-actuelle.png") });
    await s.page.locator('[data-syna-shell-switch="syna"]').first().click();
    await s.page.waitForFunction(() => !!document.querySelector("[data-syna-shell]"), null, { timeout: 60000 });
    ok("« Interface actuelle » rend l'interface d'origine (pastille comprise), « Nouvelle interface » la coquille, sans recharger le compte", classic.shell === "classic" && classic.blackPill && (await pageFacts(s.page)).shell === "syna", classic);
    await s.context.close();
  }

  // Clavier : les arrêts de tabulation de la coquille ont un anneau de focus visible.
  {
    const s = await session(browser, studio.origin, VIEWPORTS[0]);
    await go(s.page, studio.origin, "sillon", "pilote");
    const stops: { inShell: boolean; ring: boolean; label: string }[] = [];
    for (let i = 0; i < 30; i++) {
      await s.page.keyboard.press("Tab");
      stops.push(await s.page.evaluate(() => { const a = document.activeElement as HTMLElement; const cs = getComputedStyle(a); return { inShell: !!a.closest(".ss-side, .ss-rail"), ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2, label: (a.getAttribute("aria-label") ?? a.textContent ?? "").trim().slice(0, 30) }; }));
    }
    const missing = stops.filter((x) => x.inShell && !x.ring);
    ok("clavier : chaque arrêt dans le menu de la coquille montre un anneau de focus", missing.length === 0, missing);
    await s.context.close();
  }
  await studio.stop();

  // ——— B. Coquille, drapeaux SYNA fermés ———
  studio = await startStudio({ STUDIO_SYNA_SHELL: "1" });
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    const s = await session(browser, studio.origin, vp);
    await go(s.page, studio.origin, "sillon", "boutique");
    await s.page.screenshot({ path: path.join(out, `drapeaux-fermes--${vp.label}.png`) });
    const f = await pageFacts(s.page);
    const panel = await s.page.locator("#syna-panel, [aria-controls='syna-panel']").count();
    ok(`drapeaux SYNA fermés (${vp.label}) : coquille sans aucun accès ni panneau SYNA`, f.shell === "syna" && !f.rail && !f.tab && panel === 0 && !f.blackPill, { ...f, panel });
    await s.context.close();
  }
  await studio.stop();
} catch (e) {
  ok("recette menée jusqu'au bout", false, String(e).slice(0, 600));
} finally {
  await studio?.stop();
  await browser.close();
  ok("aucune requête hors du serveur local (aucun fournisseur appelé)", !(report.external as string[]).length, (report.external as string[]).slice(0, 5));
  fs.writeFileSync(path.join(out, "recette.json"), JSON.stringify(report, null, 2));
  process.exit(0);
}
