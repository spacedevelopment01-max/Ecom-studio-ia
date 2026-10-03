/**
 * Captures de la boutique rendue (ordinateur et téléphone) pour la relecture visuelle par l'IA.
 * Le thème est exécuté comme dans l'aperçu, sans serveur : un navigateur sans interface reçoit les pages,
 * les médias et les polices directement depuis la spécification. Sans Chromium disponible, rien n'est
 * capturé et la relecture visuelle est simplement sautée.
 */
import fs from "node:fs";
import sharp from "sharp";
import { compileTheme, themeAssetBinary } from "./compile";
import { libraryLoader } from "./loader";
import { fontFilePath, renderPage } from "./render";
import type { ThemeSpec } from "./spec";

const ORIGIN = "http://boutique.apercu";
const BASE = "/p";

export function chromiumPath(): string | null {
  for (const c of [process.env.CHROMIUM, "/usr/bin/chromium", "/usr/bin/chromium-browser", "/opt/pw-browsers/chromium"]) if (c && fs.existsSync(c)) return c;
  return null;
}

const MIME: Record<string, string> = { css: "text/css; charset=utf-8", js: "application/javascript; charset=utf-8", json: "application/json", svg: "image/svg+xml" };

/** Planche contact : la page entière découpée en colonnes posées côte à côte (lisible une fois réduite pour l'IA). */
async function sheets(shot: Buffer, width: number, colHeight: number, perSheet: number, maxSheets: number): Promise<Buffer[]> {
  const img = sharp(shot).resize({ width });
  const { data, info } = await img.jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
  const cols: Buffer[] = [];
  for (let top = 0; top < info.height && cols.length < perSheet * maxSheets; top += colHeight) {
    const h = Math.min(colHeight, info.height - top);
    cols.push(await sharp(data).extract({ left: 0, top, width: info.width, height: h }).toBuffer());
  }
  const out: Buffer[] = [];
  const gap = 16;
  for (let i = 0; i < cols.length; i += perSheet) {
    const group = cols.slice(i, i + perSheet);
    out.push(
      await sharp({ create: { width: group.length * info.width + (group.length - 1) * gap, height: colHeight, channels: 3, background: "#9aa0ac" } })
        .composite(group.map((input, j) => ({ input, left: j * (info.width + gap), top: 0 })))
        .jpeg({ quality: 82 })
        .toBuffer(),
    );
  }
  return out;
}

/** Contexte de navigateur qui sert la boutique rendue depuis la spécification (pages, médias, polices). */
export async function themeContext(browser: import("playwright").Browser, spec: ThemeSpec, viewport: { width: number; height: number }, mobile = false) {
  const files = compileTheme(spec);
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce" });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN || !url.pathname.startsWith(BASE)) return route.abort();
    const segs = url.pathname.slice(BASE.length).split("/").filter(Boolean).map(decodeURIComponent);
    if (segs[0] === "assets") {
      const name = segs.slice(1).join("/");
      const bin = spec.files[name] ? await themeAssetBinary(spec, name, libraryLoader) : null;
      if (bin) return route.fulfill({ status: 200, contentType: bin.mime, body: bin.data });
      const text = files.get(`assets/${name}`);
      return text === undefined ? route.fulfill({ status: 404, body: "" }) : route.fulfill({ status: 200, contentType: MIME[name.split(".").pop() ?? ""] ?? "text/plain", body: text });
    }
    if (segs[0] === "__fonts") {
      const f = fontFilePath(segs[1] ?? "");
      return f ? route.fulfill({ status: 200, contentType: "font/ttf", body: fs.readFileSync(f) }) : route.fulfill({ status: 404, body: "" });
    }
    if (segs.join("/") === "cart.js") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ item_count: 0, items: [], total_price: 0, currency: "EUR" }) });
    const r = await renderPage({ spec, base: BASE, files, cart: [] }, "/" + segs.join("/"), url.searchParams);
    return route.fulfill({ status: r.status, contentType: "text/html; charset=utf-8", body: r.html });
  });
  return { context, url: (pathname: string) => `${ORIGIN}${BASE}${pathname}` };
}

export async function snapshotTheme(spec: ThemeSpec, pathname = "/"): Promise<{ desktop: Buffer[]; mobile: Buffer[] } | null> {
  const executablePath = chromiumPath();
  if (!executablePath) return null;
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return null;
  }
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const shoot = async (width: number, height: number, mobile: boolean) => {
      const { context, url } = await themeContext(browser, spec, { width, height }, mobile);
      const page = await context.newPage();
      await page.goto(url(pathname), { waitUntil: "load", timeout: 60_000 });
      // Défilement complet : images paresseuses chargées, éléments révélés au défilement affichés.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.8)) {
          scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        scrollTo(0, 0);
      });
      // Animations réduites : tous les contenus « révélés au défilement » sont visibles sur la capture.
      await page.waitForTimeout(500);
      const buf = await page.screenshot({ fullPage: true, type: "jpeg", quality: 85 });
      await context.close();
      return buf;
    };
    const desktop = await sheets(await shoot(1440, 900, false), 760, 1500, 2, 3);
    const mobile = await sheets(await shoot(390, 844, true), 390, 1500, 4, 2);
    return { desktop, mobile };
  } finally {
    await browser.close();
  }
}
