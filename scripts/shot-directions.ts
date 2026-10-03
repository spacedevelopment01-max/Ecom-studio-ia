/**
 * Captures de chaque direction sur un projet existant (serveur lancé) :
 *   EMAIL=… PASSWORD=… PROJECT=… DIRS=atelier,nocturne OUT=dossier tsx scripts/shot-directions.ts
 */
import fs from "node:fs";
import sharp from "sharp";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "captures";
const DIRS = (process.env.DIRS ?? "atelier,clinique,brut,terroir,nocturne,pop,galerie,elan").split(",");
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ reducedMotion: "reduce" });
await ctx.request.post(`${BASE}/api/auth/login`, { data: { email: process.env.EMAIL, password: process.env.PASSWORD } });
const P = process.env.PROJECT!;
const idle = async () => { for (let i = 0; i < 200; i++) { const r = await (await ctx.request.get(`${BASE}/api/projects/${P}`)).json(); if (!r.active?.length) return; await new Promise((x) => setTimeout(x, 1500)); } };
for (const d of DIRS) {
  await ctx.request.post(`${BASE}/api/projects/${P}/theme/build`, { data: { direction: d } });
  await new Promise((x) => setTimeout(x, 800));
  await idle();
  const t = await (await ctx.request.get(`${BASE}/api/projects/${P}/theme`)).json();
  const url = `${BASE}/preview/${P}/v/${t.current.versionId}/`;
  for (const [name, vp] of [["bureau", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]] as const) {
    const page = await ctx.newPage();
    await page.setViewportSize(vp);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: ".es-pv-bar{display:none!important}" });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(900);
    const png = await page.screenshot({ fullPage: true });
    const meta = await sharp(png).metadata();
    const h = Math.min(meta.height!, name === "bureau" ? 5400 : 3400);
    await sharp(png).extract({ left: 0, top: 0, width: meta.width!, height: h }).resize({ width: name === "bureau" ? 900 : 390 }).jpeg({ quality: 78 }).toFile(`${OUT}/${d}-${name}.jpg`);
    await page.close();
  }
  console.log(d, "ok");
}
await b.close();
