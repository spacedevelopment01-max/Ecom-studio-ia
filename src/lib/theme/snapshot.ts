/**
 * Captures de la boutique rendue (ordinateur et téléphone) pour la relecture visuelle par l'IA.
 * Le thème est exécuté comme dans l'aperçu, sans serveur : un navigateur sans interface reçoit les pages,
 * les médias et les polices directement depuis la spécification. Sans Chromium disponible, rien n'est
 * capturé et la relecture visuelle est simplement sautée.
 */
import fs from "node:fs";
import {accessScope,withAccessScope}from "../access-scope";
import sharp from "sharp";
import { compileTheme, importedBinary, themeAssetBinary } from "./compile";
import { libraryLoader } from "./loader";
import { fontFilePath, renderPage } from "./render";
import type { ThemeSpec } from "./spec";

const ORIGIN = "http://boutique.apercu";
const BASE = "/p";

export function chromiumPath(): string | null {
  // Réglage de test : simuler une installation sans navigateur de captures.
  if (process.env.ES_NO_CHROMIUM === "1") return null;
  for (const c of [process.env.CHROMIUM, "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/opt/pw-browsers/chromium", playwrightChromium()]) if (c && fs.existsSync(c)) return c;
  return null;
}

/** Chromium téléchargé par Playwright (« npx playwright install chromium »), s'il est là. */
function playwrightChromium(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("playwright") as typeof import("playwright")).chromium.executablePath() || null;
  } catch {
    return null;
  }
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
  // Un navigateur partagé émet ses événements hors de la requête qui a créé la capture.
  // Figer les droits autorisés ici : jamais ceux d’un autre compte hérité de son transport.
  const scope={...accessScope()},resourceErrors:unknown[]=[];
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce" });
  await context.route("**/*", async (route) => {
   try{await withAccessScope(scope,async()=>{
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN || !url.pathname.startsWith(BASE)) return route.abort();
    const segs = url.pathname.slice(BASE.length).split("/").filter(Boolean).map(decodeURIComponent);
    if (segs[0] === "assets") {
      const name = segs.slice(1).join("/");
      const bin = spec.files[name] ? await themeAssetBinary(spec, name, libraryLoader) : importedBinary(spec, name);
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
   });}catch(error){
    // Résoudre la requête navigateur, puis remonter l’erreur au propriétaire de la capture.
    // Un rejet dans ce callback serait non géré et laisserait les pages/API en attente.
    if(!resourceErrors.length)resourceErrors.push(error);await route.abort().catch(()=>{});
   }
  });
  return { context, assertResources:()=>{if(resourceErrors.length)throw resourceErrors[0];}, url: (pathname: string) => `${ORIGIN}${BASE}${pathname}` };
}

/** Captures d'une page de la boutique ; `opts` limite le nombre de planches (fiche produit relue en complément de l'accueil). */
export async function snapshotTheme(spec: ThemeSpec, pathname = "/", opts: { desktopSheets?: number; mobileSheets?: number } = {}): Promise<{ desktop: Buffer[]; mobile: Buffer[] } | null> {
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
      const { context, url, assertResources } = await themeContext(browser, spec, { width, height }, mobile);
      const page = await context.newPage();
      await page.goto(url(pathname), { waitUntil: "load", timeout: 60_000 });
      assertResources();
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
      assertResources();
      const buf = await page.screenshot({ fullPage: true, type: "jpeg", quality: 85 });
      assertResources();
      await context.close();
      return buf;
    };
    const desktop = await sheets(await shoot(1440, 900, false), 760, 1500, 2, opts.desktopSheets ?? 3);
    const mobile = await sheets(await shoot(390, 844, true), 390, 1500, 4, opts.mobileSheets ?? 2);
    return { desktop, mobile };
  } finally {
    await browser.close();
  }
}

/** Native render evidence for an explicitly selected, owned Site version. No AI judgment or CMS delivery. */
export type ThemeRenderEvidence={path:string;width:number;height:number;pageHeight:number;scrollWidth:number;horizontalOverflow:boolean;imageCount:number;brokenImageIndexes:number[];potentialCrops:{index:number;naturalWidth:number;naturalHeight:number;width:number;height:number;objectFit:string}[];pageErrors:string[];jpeg:Buffer};
export async function captureThemeEvidence(spec:ThemeSpec,paths:string[],opts:{widths?:(1440|390)[]}={}):Promise<ThemeRenderEvidence[]>{
  const executablePath=chromiumPath();if(!executablePath)throw new Error('theme_capture_browser_unavailable');
  if(paths.length<1||paths.length>2||paths.some(p=>!p.startsWith('/')||p.startsWith('//')||p.includes('?')||p.includes('#')||p.length>300))throw new Error('theme_capture_paths_invalid');
  const widths=opts.widths??[1440,390];if(!widths.length||widths.length>2||widths.some(w=>w!==1440&&w!==390))throw new Error('theme_capture_widths_invalid');
  const {chromium}=await import('playwright');const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking']});const shots:ThemeRenderEvidence[]=[];
  try{for(const pathname of paths)for(const width of widths){
    const {context,url,assertResources}=await themeContext(browser,spec,{width,height:width===390?844:960},width===390);
    try{const page=await context.newPage(),pageErrors:string[]=[];page.on('pageerror',e=>pageErrors.push(e.message));const response=await page.goto(url(pathname),{waitUntil:'load',timeout:45000});if(!response||response.status()>=400)throw new Error('theme_capture_page_unavailable');assertResources();
      await page.evaluate(async()=>{await document.fonts.ready;for(let y=0;y<document.documentElement.scrollHeight;y+=Math.round(innerHeight*.8)){if(y>20000)throw Error('theme_capture_page_too_long');scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,60));}scrollTo({top:0,behavior:'instant'});await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})));});
      assertResources();await page.waitForTimeout(250);const metrics=await page.evaluate(()=>{const imgs=Array.from(document.images),pageHeight=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);return{pageHeight,scrollWidth:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth),imageCount:imgs.length,brokenImageIndexes:imgs.flatMap((i,index)=>i.currentSrc&&(!i.complete||i.naturalWidth===0)?[index]:[]),potentialCrops:imgs.flatMap((i,index)=>{const b=i.getBoundingClientRect(),objectFit=getComputedStyle(i).objectFit;return objectFit==='cover'&&b.width>0&&b.height>0&&i.naturalWidth>0&&Math.abs(i.naturalWidth/i.naturalHeight-b.width/b.height)>.05?[{index,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,width:b.width,height:b.height,objectFit}]:[];})};});
      if(metrics.pageHeight>20000)throw new Error('theme_capture_page_too_long');const jpeg=await page.screenshot({fullPage:true,type:'jpeg',quality:88,animations:'disabled'});if(!jpeg.length)throw new Error('theme_capture_empty');assertResources();
      shots.push({path:pathname,width,height:width===390?844:960,...metrics,horizontalOverflow:metrics.scrollWidth>width+1,pageErrors,jpeg});
    }finally{await context.close();}
  }}finally{await browser.close();}return shots;
}
