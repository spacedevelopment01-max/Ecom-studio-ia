/**
 * Courtes vidéos explicatives de la page d'accueil (public/explainers/*.mp4).
 *   npx tsx scripts/build-explainers.ts
 * Les scènes sont des animations CSS (scripts/explainers/explainers.html) bâties sur les démonstrations
 * réellement produites par le studio ; chaque image est figée à un instant précis puis encodée en H.264.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const FPS = 30;
const DURATION = 10;
/** Scènes plus longues que la durée par défaut (en secondes). */
const DURATIONS: Record<string, number> = { chat: 18 };
const SIZE = 960;
const SCENES = process.env.ONLY ? process.env.ONLY.split(",") : ["hero", "photo", "themes", "chat", "formats", "cal"];
const OUT = path.join(process.cwd(), "public", "explainers");
const PAGE = "file://" + path.join(process.cwd(), "scripts", "explainers", "explainers.html");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });

for (const s of SCENES) {
  await page.goto(`${PAGE}?s=${s}`, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
    document.getAnimations().forEach((a) => a.pause());
  });
  const file = path.join(OUT, `${s}.mp4`);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "26", "-movflags", "+faststart", file], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise<void>((res, rej) => ff.on("close", (c) => (c ? rej(new Error(`ffmpeg ${c}`)) : res())));
  const dur = DURATIONS[s] ?? DURATION;
  for (let f = 0; f < FPS * dur; f++) {
    const ms = (f / FPS) * 1000;
    await page.evaluate((t) => document.getAnimations().forEach((a) => (a.currentTime = t)), ms);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f === FPS * dur - 1) fs.writeFileSync(path.join(OUT, `${s}.jpg`), await page.screenshot({ type: "jpeg", quality: 80 }));
  }
  ff.stdin.end();
  await done;
  console.log(`✓ ${s} → ${(fs.statSync(file).size / 1024).toFixed(0)} Ko`);
}
await browser.close();
