/**
 * Captures du thème sur mesure pour SINA (audit du 10 novembre 2026, exigence G11 « SINA voit ce qu'elle commente ») :
 * l'accueil sur ordinateur et sur téléphone, rendus par le Studio dans un Chromium local (gratuit, sans IA). Une seule
 * série par version du thème (mise en cache sur disque) : SINA les reçoit à chaque réponse de l'étape 6 sans relancer
 * de navigateur. Sans Chromium installé, rien n'est joint et SINA le dit honnêtement.
 */
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../../db";
import { assetData, getAsset } from "../../library";
import { loadProject } from "../../projects";
import { fontFilePath } from "../../theme/render";
import { chromiumPath } from "../../theme/snapshot";
import { LIBRARY_DIR } from "./library";
import { loadCustomTheme } from "./theme";
import { renderCustomTheme } from "./render";

const ORIGIN = "http://theme.sina";
const VIEWS = [
  { key: "ordinateur", width: 1280, height: 900, maxHeight: 3200 },
  { key: "téléphone", width: 390, height: 844, maxHeight: 3600 },
] as const;

export type ThemeShot = { view: string; data: Buffer };

/** Dépendance remplaçable par les tests (aucun navigateur). */
export const shotDeps: { shoot?: (html: string, view: (typeof VIEWS)[number], pageKey?: string) => Promise<Buffer | null> } = {};

const cacheDir = () => path.join(DATA_DIR, "cache", "custom-theme-shots");

export async function customThemeShots(projectId: string): Promise<ThemeShot[]> {
  const t = loadCustomTheme(projectId);
  if (!t) return [];
  const dir = cacheDir();
  // Version de la bibliothèque (feuille et scripts communs) : une correction des sections refait aussi les captures.
  const lib = ["library.css", "library.js", "tenue.css", "tenue.js"].map((f) => { try { return Math.round(fs.statSync(path.join(LIBRARY_DIR(), f)).mtimeMs).toString(36); } catch { return "0"; } }).join("");
  const key = (v: string) => path.join(dir, `${projectId}-${t.rev}-${lib}-${v === "ordinateur" ? "desk" : "phone"}.jpg`);
  const cached = VIEWS.map((v) => ({ view: v.key, file: key(v.key) })).filter((x) => fs.existsSync(x.file));
  if (cached.length === VIEWS.length) return cached.map((x) => ({ view: x.view, data: fs.readFileSync(x.file) }));
  const html = renderCustomTheme(loadProject(projectId), t, { embed: true });
  const out: ThemeShot[] = [];
  for (const v of VIEWS) {
    const data = await (shotDeps.shoot ?? shoot)(html, v).catch(() => null);
    if (!data) continue;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(key(v.key), data);
    out.push({ view: v.key, data });
  }
  return out;
}

/**
 * Captures sur téléphone de pages précises du thème (regards en image après le montage, lot 8 du 13 novembre 2026) :
 * la page est ouverte comme le fait un lien du site. Une capture par page et par version du thème (cache sur disque).
 * Sans Chromium, rien n'est rendu et c'est dit.
 */
export async function customThemePageShots(projectId: string, keys: string[]): Promise<{ key: string; label: string; data: Buffer }[]> {
  const t = loadCustomTheme(projectId);
  if (!t) return [];
  const dir = cacheDir(), phone = VIEWS[1];
  const lib = ["library.css", "library.js", "tenue.css", "tenue.js"].map((f) => { try { return Math.round(fs.statSync(path.join(LIBRARY_DIR(), f)).mtimeMs).toString(36); } catch { return "0"; } }).join("");
  let html: string | null = null;
  const out: { key: string; label: string; data: Buffer }[] = [];
  for (const key of keys) {
    const pg = t.pages.find((x) => x.key === key);
    if (!pg) continue;
    const file = path.join(dir, `${projectId}-${t.rev}-${lib}-page-${key.replace(/[^a-z0-9-]/g, "")}.jpg`);
    if (fs.existsSync(file)) { out.push({ key, label: pg.label, data: fs.readFileSync(file) }); continue; }
    html ??= renderCustomTheme(loadProject(projectId), t, { embed: true });
    const data = await (shotDeps.shoot ?? shoot)(html, phone, key).catch(() => null);
    if (!data) continue;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, data);
    out.push({ key, label: pg.label, data });
  }
  return out;
}

/** Capture de l'écran du bas d'une page sur téléphone (ce que voit le visiteur arrivé en bas : barre d'achat comprise). */
export const shootPageBottom = (html: string, pageKey: string, scale = 1, quality?: number) => shoot(html, VIEWS[1], pageKey, { bottom: true, scale, quality });
/** Capture d'une page entière sur téléphone, à l'échelle voulue (2 : image nette à montrer à quelqu'un). */
export const shootPhonePage = (html: string, pageKey: string, scale = 1, quality?: number) => shoot(html, VIEWS[1], pageKey, { scale, quality });

async function shoot(html: string, v: (typeof VIEWS)[number], pageKey?: string, o: { bottom?: boolean; scale?: number; quality?: number } = {}): Promise<Buffer | null> {
  const executablePath = chromiumPath();
  if (!executablePath) return null;
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const context = await browser.newContext({ viewport: { width: v.width, height: v.height }, reducedMotion: "reduce", ...(o.scale && o.scale > 1 ? { deviceScaleFactor: o.scale } : {}) });
    const page = await context.newPage();
    // Tout est servi par le Studio lui-même : la bibliothèque de sections, les photos du projet, les polices ; rien
    // d'autre ne sort (les polices en ligne sont remplacées par celles de la marque).
    await page.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      if (u.origin !== ORIGIN) return route.abort();
      if (u.pathname === "/") return route.fulfill({ body: html, contentType: "text/html; charset=utf-8" });
      if (u.pathname.startsWith("/sections/")) {
        const f = path.join(LIBRARY_DIR(), decodeURIComponent(u.pathname.slice("/sections/".length)));
        if (!f.startsWith(LIBRARY_DIR()) || !fs.existsSync(f)) return route.fulfill({ status: 404 });
        return route.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : f.endsWith(".webp") ? "image/webp" : "image/jpeg" });
      }
      const file = /^\/api\/files\/([\w-]+)/.exec(u.pathname);
      if (file) { const a = getAsset(file[1]); return a ? route.fulfill({ body: assetData(a), contentType: a.mime }) : route.fulfill({ status: 404 }); }
      const font = /^\/api\/syna\/fonts\/(.+)$/.exec(u.pathname);
      if (font) { const f = fontFilePath(decodeURIComponent(font[1])); return f ? route.fulfill({ body: fs.readFileSync(f), contentType: "font/ttf" }) : route.fulfill({ status: 404 }); }
      return route.fulfill({ status: 404 });
    });
    await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 45_000 });
    // Page précise : ouverte par le même chemin qu'un lien du site.
    if (pageKey) await page.evaluate((k) => { const go = (window as unknown as { ctGo?: (key: string) => void }).ctGo; if (go) go(k); }, pageKey);
    await page.evaluate(async () => {
      for (let y = 0; y < Math.min(document.documentElement.scrollHeight, 6000); y += Math.round(innerHeight * 0.8)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(600);
    const quality = o.quality ?? (o.scale && o.scale > 1 ? 90 : 72);
    if (o.bottom) { await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(700); return await page.screenshot({ type: "jpeg", quality }); }
    // Capture de la page entière : la barre d'achat appartient à l'écran, pas à la page (elle est montrée par la capture du bas).
    await page.addStyleTag({ content: ".tn-barre{display:none!important}" });
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    return await page.screenshot({ type: "jpeg", quality, fullPage: true, clip: { x: 0, y: 0, width: v.width, height: Math.min(h, o.scale && o.scale > 1 ? 6000 : v.maxHeight) } });
  } finally {
    await browser.close().catch(() => {});
  }
}
