/**
 * Films de la page d'accueil (16:9, musique, bruitages).
 *   VO=<dossier des voix> npx tsx scripts/build-film.ts        film commenté (1 min, voix off)
 *   FILM=court npx tsx scripts/build-film.ts                  film explicatif sans voix (scripts/film/film-court.html)
 *   LANG=en FILM=court npx tsx scripts/build-film.ts          version anglaise → film-court.en.mp4 / film-court.en.jpg
 * VO contient s1.wav … s8.wav (voix off de chaque scène, texte dans scripts/film/voiceover.json)
 * et durations.json. Les images sont des animations CSS (scripts/film/film.html) figées image par image.
 * Sortie : public/explainers/film.mp4, film.jpg (affiche), film.vtt (sous-titres) ; film-court.mp4, film-court.jpg.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { synthMusic } from "../src/lib/media/video";
import { QUERY, SUFFIX, enAssets } from "./film/en-assets";

const FPS = 30;
const W = 1920, H = 1080;
const SILENT = process.env.FILM === "court";
let TOTAL = 60;
const SR = 44100;
const VO = process.env.VO;
if (!VO && !SILENT) throw new Error("VO manquant (dossier des voix off)");
if (SUFFIX && !SILENT) throw new Error("LANG=en : seul le film court (FILM=court) a une version anglaise");
const NAME = SILENT ? "film-court" : "film";
const OUT = path.join(process.cwd(), "public", "explainers");
const PAGE = "file://" + path.join(process.cwd(), "scripts", "film", `${NAME}.html`) + (QUERY ? `?${QUERY}` : "");
const OUT_NAME = NAME + SUFFIX;
const tmp = fs.mkdtempSync(path.join(process.env.FILM_TMP ?? "/tmp", "film-"));

// 1. Découpage calé sur la voix : chaque scène dure sa voix + une respiration, la dernière complète la minute.
const lines: { id: string; text: string }[] = SILENT ? [] : JSON.parse(fs.readFileSync(path.join("scripts", "film", "voiceover.json"), "utf8"));
const durations: Record<string, number> = SILENT ? {} : JSON.parse(fs.readFileSync(path.join(VO!, "durations.json"), "utf8"));
const LEAD = 0.6, BREATH = 1.1;
let start = 0;
let timeline: { id: string; start: number; dur: number; voStart: number; voDur: number; text: string; last: boolean }[] = lines.map((l, i) => {
  const last = i === lines.length - 1;
  const voStart = i === 0 ? 0.9 : LEAD;
  const dur = last ? TOTAL - start : voStart + durations[l.id] + BREATH;
  const sc = { id: l.id, start, dur, voStart, voDur: durations[l.id], text: l.text.replace(/I\.A\.(?= [A-ZÉ])/g, "IA.").replace(/I\.A\./g, "IA"), last };
  start += dur;
  return sc;
});
if (start > TOTAL + 0.01) throw new Error(`Voix trop longue : ${start.toFixed(1)} s`);
console.log(timeline.map((s) => `${s.id} ${s.start.toFixed(1)}→${(s.start + s.dur).toFixed(1)}`).join("  "));

// 2. Images.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: W, height: H } });
if (!SILENT) await page.addInitScript((tl) => ((window as any).TIMELINE = tl), timeline);
await page.addInitScript((list) => ((window as any).EN_ASSETS = list), enAssets());
await page.goto(PAGE, { waitUntil: "load" });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
  document.getAnimations().forEach((a) => a.pause());
});
const cues: { t: number; kind: string }[] = await page.evaluate(() => (window as any).sfxCues());
if (SILENT) {
  // Le découpage est défini dans la page.
  timeline = await page.evaluate(() => (window as any).TIMELINE);
  TOTAL = Math.round((await page.evaluate(() => (window as any).TOTAL)) * 10) / 10;
}
if (process.env.PREVIEW) {
  // Aperçu : quelques images fixes, sans rendu complet.
  for (const t of process.env.PREVIEW.split(",").map(Number)) {
    await page.evaluate((x) => (window as any).seek(x), t);
    await page.screenshot({ path: path.join(process.env.PREVIEW_DIR ?? tmp, `film-${t}.jpg`), type: "jpeg", quality: 70 });
  }
  await browser.close();
  process.exit(0);
}
const video = path.join(tmp, "video.mp4");
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "22", video], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise<void>((res, rej) => ff.on("close", (c) => (c ? rej(new Error(`ffmpeg ${c}`)) : res())));
for (let f = 0; f < Math.round(FPS * TOTAL); f++) {
  await page.evaluate((t) => (window as any).seek(t), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 90 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f === Math.round(FPS * ((SILENT ? timeline.find((x) => x.id === "t4")! : timeline[3]).start + 3))) fs.writeFileSync(path.join(OUT, `${OUT_NAME}.jpg`), await page.screenshot({ type: "jpeg", quality: 82 }));
  if (f % 150 === 0) console.log(`  image ${f}/${FPS * TOTAL}`);
}
ff.stdin.end();
await done;
await browser.close();

// 3. Bruitages synthétisés (aucun droit tiers) : souffle, pop, clic, impact, carillon.
const sfx = new Float32Array(Math.ceil(TOTAL * SR));
let seed = 1;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
function add(t0: number, len: number, fn: (t: number, k: number) => number, gain: number) {
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < len * SR && s0 + i < sfx.length; i++) if (s0 + i >= 0) sfx[s0 + i] += fn(i / SR, i / (len * SR)) * gain;
}
const lastAt: Record<string, number> = {};
for (const c of cues) {
  if (c.t - (lastAt[c.kind] ?? -9) < 0.12) continue; // pas de bruitages empilés
  lastAt[c.kind] = c.t;
  if (c.kind === "whoosh") {
    let lp = 0;
    add(c.t - 0.15, 0.55, (t, k) => {
      const cut = 0.04 + 0.25 * Math.sin(Math.PI * k);
      lp += cut * (noise() - lp);
      return lp * Math.sin(Math.PI * k) ** 2;
    }, 0.55);
  } else if (c.kind === "pop") {
    add(c.t, 0.12, (t, k) => Math.sin(2 * Math.PI * (900 - 500 * k) * t) * Math.exp(-t * 38), 0.22);
  } else if (c.kind === "click") {
    add(c.t, 0.05, (t) => (noise() * 0.6 + Math.sin(2 * Math.PI * 2200 * t)) * Math.exp(-t * 120), 0.25);
  } else if (c.kind === "hit") {
    add(c.t, 0.7, (t) => Math.sin(2 * Math.PI * (70 + 60 * Math.exp(-t * 18)) * t) * Math.exp(-t * 6), 0.45);
  } else if (c.kind === "ding") {
    add(c.t, 1.1, (t) => (Math.sin(2 * Math.PI * 1318.5 * t) + 0.5 * Math.sin(2 * Math.PI * 1975.5 * t)) * Math.exp(-t * 5), 0.14);
  }
}
const wav = (data: Float32Array, file: string) => {
  const b = Buffer.alloc(44 + data.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + data.length * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
};
wav(sfx, path.join(tmp, "sfx.wav"));
fs.writeFileSync(path.join(tmp, "music.wav"), synthMusic(TOTAL, "pulse", timeline.slice(1).map((s) => s.start), SR));

// 4. Mixage : voix au premier plan, musique baissée sous la voix, bruitages discrets.
fs.mkdirSync(OUT, { recursive: true });
if (SILENT) {
  // Sans voix : la musique porte le film, les bruitages ponctuent chaque geste.
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", video, "-i", path.join(tmp, "music.wav"), "-i", path.join(tmp, "sfx.wav"), "-filter_complex", `[1:a]volume=0.9,afade=t=in:d=1,afade=t=out:st=${TOTAL - 2.5}:d=2.5[mus];[mus][2:a]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", String(SR), "-t", String(TOTAL), "-movflags", "+faststart", path.join(OUT, `${OUT_NAME}.mp4`)]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`✓ ${OUT_NAME} → ${(fs.statSync(path.join(OUT, `${OUT_NAME}.mp4`)).size / 1024 / 1024).toFixed(1)} Mo`);
  process.exit(0);
}
const inputs = ["-i", video, "-i", path.join(tmp, "music.wav"), "-i", path.join(tmp, "sfx.wav")];
const voLabels: string[] = [];
const filters: string[] = [];
timeline.forEach((s, i) => {
  inputs.push("-i", path.join(VO!, `${s.id}.wav`));
  const ms = Math.round((s.start + s.voStart) * 1000);
  filters.push(`[${3 + i}:a]aresample=${SR},highpass=f=70,adelay=${ms}|${ms}[v${i}]`);
  voLabels.push(`[v${i}]`);
});
filters.push(`${voLabels.join("")}amix=inputs=${voLabels.length}:normalize=0,apad=whole_dur=${TOTAL},asplit=2[vo][vokey]`);
filters.push(`[1:a]volume=0.55,afade=t=in:d=1.5,afade=t=out:st=${TOTAL - 3}:d=3[mus]`);
filters.push(`[mus][vokey]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=600[duck]`);
filters.push(`[vo]volume=1.6[vol]`);
filters.push(`[vol][duck][2:a]amix=inputs=3:normalize=0,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filters.join(";"), "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", String(SR), "-t", String(TOTAL), "-movflags", "+faststart", path.join(OUT, "film.mp4")]);

// 5. Sous-titres (accessibilité).
const ts = (x: number) => new Date(x * 1000).toISOString().slice(11, 23);
fs.writeFileSync(path.join(OUT, "film.vtt"), "WEBVTT\n\n" + timeline.map((s) => `${ts(s.start + s.voStart)} --> ${ts(s.start + s.voStart + s.voDur + 0.3)}\n${s.text}\n`).join("\n"));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`✓ film → ${(fs.statSync(path.join(OUT, "film.mp4")).size / 1024 / 1024).toFixed(1)} Mo`);
