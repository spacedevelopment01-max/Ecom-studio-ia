import sharp from "sharp";
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
import { TENUE_FILES } from "./tenue";

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
  const lib = ["library.css", "library.js", ...TENUE_FILES.css, ...TENUE_FILES.js].map((f) => { try { return Math.round(fs.statSync(path.join(LIBRARY_DIR(), f)).mtimeMs).toString(36); } catch { return "0"; } }).join("");
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
  const lib = ["library.css", "library.js", ...TENUE_FILES.css, ...TENUE_FILES.js].map((f) => { try { return Math.round(fs.statSync(path.join(LIBRARY_DIR(), f)).mtimeMs).toString(36); } catch { return "0"; } }).join("");
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

/**
 * Tout est servi par le Studio lui-même : la bibliothèque de sections, les photos du projet, les polices ; rien d'autre
 * ne sort (les polices en ligne sont remplacées par celles de la marque).
 */
async function serve(page: import("playwright").Page, html: string) {
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
}

/**
 * Plusieurs pages d'un même thème, capturées dans un seul navigateur (planches de contrôle des sections) : l'image de
 * chaque page et son débordement en largeur (0 : rien ne dépasse de l'écran). Sans Chromium : null.
 */
export async function shootPages(html: string, keys: string[], o: { view: "ordinateur" | "téléphone"; quality?: number; maxHeight?: number; /** 2 : capture deux fois plus fine, pour une image à montrer. */ scale?: number }): Promise<{ key: string; data: Buffer; overflow: number }[] | null> {
  const v = VIEWS.find((x) => x.key === o.view)!;
  const opened = await open(html, v, o.scale);
  if (!opened) return null;
  const { browser, page } = opened;
  try {
    const out: { key: string; data: Buffer; overflow: number }[] = [];
    await page.addStyleTag({ content: ".tn-barre{display:none!important}" });
    for (const key of keys) {
      await page.evaluate((k) => { const go = (window as unknown as { ctGo?: (key: string) => void }).ctGo; if (go) go(k); scrollTo(0, 0); }, key);
      await page.waitForTimeout(180);
      const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, vw: innerWidth }));
      const data = await page.screenshot({ type: "jpeg", quality: o.quality ?? 80, fullPage: true, clip: { x: 0, y: 0, width: v.width, height: Math.min(m.h, o.maxHeight ?? v.maxHeight) } });
      out.push({ key, data, overflow: Math.max(0, m.w - m.vw) });
    }
    return out;
  } finally { await browser.close().catch(() => {}); }
}

/**
 * Le contrôle par l'image (ressemblance.ts, 17 novembre 2026) : l'accueil entier, tel que le visiteur le voit une fois
 * descendu jusqu'en bas (photos chargées, éléments révélés), animations et transitions coupées pour que deux captures du
 * même site soient identiques. Jusqu'à `maxHeight` pixels de haut. Sans Chromium : null (jamais une fausse capture).
 */
export async function shootAccueil(html: string, view: "ordinateur" | "téléphone", maxHeight: number): Promise<{ image: Buffer; masses: Buffer; sections: { uid: string; role: string; top: number; height: number }[] } | null> {
  const v = VIEWS.find((x) => x.key === view)!;
  const opened = await open(html, v);
  if (!opened) return null;
  const { browser, page } = opened;
  try {
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}.tn-barre{display:none!important}" });
    await page.evaluate(async (max) => {
      for (let y = 0; y < Math.min(document.documentElement.scrollHeight, max); y += Math.round(innerHeight * 0.7)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      scrollTo(0, 0);
      const wait = [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; }));
      await Promise.race([Promise.all(wait), new Promise((r) => setTimeout(r, 4000))]);
    }, maxHeight);
    await page.waitForTimeout(400);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    // Les sections de l'accueil telles qu'elles se voient (place et hauteur dans la page), de haut en bas : l'en-tête, les
    // pièces de la page, le pied. Une section dans une autre n'est pas comptée deux fois.
    const sections = await page.evaluate(() => {
      const list = [...document.querySelectorAll<HTMLElement>("[data-ct]")].filter((e) => !e.parentElement?.closest("[data-ct]"));
      return list.map((e) => { const r = e.getBoundingClientRect(); return { uid: e.dataset.ct ?? "", role: e.dataset.ctRole ?? "", top: Math.round(r.top + scrollY), height: Math.round(r.height) }; })
        .filter((x) => x.height > 8).sort((a, b) => a.top - b.top);
    });
    const clip = { x: 0, y: 0, width: v.width, height: Math.min(h, maxHeight) };
    const image = await page.screenshot({ type: "jpeg", quality: 85, fullPage: true, clip });
    // L'image des masses : les mêmes pixels, chaque photo (posée ou en fond) peinte en gris moyen, les textes posés dessus
    // gardés. Le contrôle compare ainsi la place des photos et la disposition, pas ce que les photos montrent.
    await page.evaluate(() => {
      const st = document.createElement("style");
      st.textContent = "img,video,picture,canvas{filter:brightness(0) invert(.5)!important}";
      document.head.appendChild(st);
      for (const e of document.querySelectorAll<HTMLElement>("body *")) {
        const bg = getComputedStyle(e).backgroundImage;
        if (!/url\(/.test(bg)) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 60 || r.height < 60) continue;
        e.style.setProperty("background-image", bg.split(/,(?![^(]*\))/).filter((x) => !/url\(/.test(x)).join(",") || "none", "important");
        e.style.setProperty("background-color", "rgb(128,128,128)", "important");
      }
    });
    await page.waitForTimeout(150);
    const masses = await page.screenshot({ type: "jpeg", quality: 85, fullPage: true, clip });
    return { image, masses, sections: sections.filter((x) => x.top < maxHeight) };
  } finally { await browser.close().catch(() => {}); }
}

/** Ouvre le thème dans un Chromium local ; tout est servi par le Studio lui-même. */
async function open(html: string, v: (typeof VIEWS)[number], scale?: number) {
  const executablePath = chromiumPath();
  if (!executablePath) return null;
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const context = await browser.newContext({ viewport: { width: v.width, height: v.height }, reducedMotion: "reduce", ...(scale && scale > 1 ? { deviceScaleFactor: scale } : {}) });
    const page = await context.newPage();
    await serve(page, html);
    await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 45_000 });
    return { browser, page };
  } catch (e) { await browser.close().catch(() => {}); throw e; }
}

async function shoot(html: string, v: (typeof VIEWS)[number], pageKey?: string, o: { bottom?: boolean; scale?: number; quality?: number } = {}): Promise<Buffer | null> {
  const opened = await open(html, v, o.scale);
  if (!opened) return null;
  const { browser, page } = opened;
  try {
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

/**
 * Une capture découpée en bandes lisibles, de haut en bas (audit du site du 22 novembre 2026, partie 8) : une page
 * entière envoyée d'un bloc est réduite à 170 points de large, où aucun texte ne se lit. Téléphone : 1 200 points par
 * bande ; quatre bandes au plus.
 */
export async function bandesDeLaCapture(data: Buffer, o: { band?: number; max?: number } = {}): Promise<Buffer[]> {
  const band = o.band ?? 1200, max = o.max ?? 4;
  const meta = await sharp(data).metadata().catch(() => null);
  if (!meta?.width || !meta.height || meta.height <= band) return [data];
  const out: Buffer[] = [];
  for (let top = 0; top < meta.height && out.length < max; top += band) {
    const height = Math.min(band, meta.height - top);
    if (height < 120) break;
    const part = await sharp(data).extract({ left: 0, top, width: meta.width, height }).jpeg({ quality: 78 }).toBuffer().catch(() => null);
    if (part) out.push(part);
  }
  return out.length ? out : [data];
}
