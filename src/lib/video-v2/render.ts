/**
 * Rendu du document vidéo V2 (serveur) : chaque image est dessinée par le même moteur de calques que l'éditeur
 * publicitaire (`ad-doc/render`) — compositions, textes, carte de fin — avec les photos animées (mouvement de
 * caméra), les vidéos décodées image par image (ffmpeg, sans recompression intermédiaire en JPEG), les transitions,
 * les sous-titres et la mention « générée par IA ». Encodage H.264 / AAC, audio mixé à part (audio.ts).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createCanvas, type Image } from "@napi-rs/canvas";
import { renderDoc, wrap, type RenderEnv } from "../ad-doc/render";
import { serverFont } from "../ad-doc/server";
import type { AdDocument, Layer } from "../ad-doc/types";
import { absoluteCues, timeline } from "./doc";
import type { CameraMove, Clip, VideoDocument } from "./types";
import { TOOL_TIMEOUT_MS } from "../exec-tool";
import { accentOf } from "./promo";
import { GRADE_CANVAS, GRADE_FFMPEG } from "../art-direction";
import type { Palette } from "./doc";

type Ctx = any;
export type VideoSources = { images: RenderEnv["images"]; videos: Map<string, string> };
export type RenderOptions = { scale?: number; fps?: number; burnSubtitles?: boolean; audioFile?: string | null; onProgress?: (p: number) => void };
export type VideoRenderResult = { file: string; durationS: number; width: number; height: number; frames: number; hasAudio: boolean };

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Lecture séquentielle des images d'un plan vidéo (ffmpeg → RGBA), à la taille du rendu. */
class FrameReader {
  // Morceaux reçus de ffmpeg, sans recopie : ffmpeg est mis en pause dès quelques images d'avance (sinon la mémoire
  // tampon grossit sans fin et chaque morceau recopiait tout ce qui attendait — rendu très lent sur un vrai plan).
  private chunks: Buffer[] = [];
  private queued = 0;
  private ended = false;
  private waiters: (() => void)[] = [];
  private last: Buffer | null = null;
  private proc;
  constructor(file: string, inS: number, durS: number, private w: number, private h: number, fps: number, grade: string = GRADE_FFMPEG.default) {
    this.proc = spawn("ffmpeg", ["-v", "error", "-ss", String(Math.max(0, inS)), "-t", String(Math.max(0.05, durS)), "-i", file, "-an", "-vf", `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},fps=${fps},${grade}`, "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"], { stdio: ["ignore", "pipe", "ignore"] });
    this.proc.stdout.on("data", (d: Buffer) => {
      this.chunks.push(d);
      this.queued += d.length;
      if (this.queued >= this.w * this.h * 4 * 4) this.proc.stdout.pause();
      this.wake();
    });
    const end = () => {
      this.ended = true;
      this.wake();
    };
    this.proc.on("close", end);
    this.proc.on("error", end);
  }
  private wake() {
    const w = this.waiters;
    this.waiters = [];
    w.forEach((f) => f());
  }
  /** Image suivante (la dernière est tenue si le plan source est plus court que prévu). */
  async next(): Promise<Buffer | null> {
    const size = this.w * this.h * 4;
    while (this.queued < size && !this.ended) {
      this.proc.stdout.resume();
      await new Promise<void>((r) => this.waiters.push(r));
    }
    if (this.queued >= size) {
      const all = this.chunks.length === 1 ? this.chunks[0] : Buffer.concat(this.chunks, this.queued);
      this.last = Buffer.from(all.subarray(0, size));
      const rest = all.subarray(size);
      this.chunks = rest.length ? [rest] : [];
      this.queued = rest.length;
    }
    if (this.queued < this.w * this.h * 4 * 4) this.proc.stdout.resume();
    return this.last;
  }
  close() {
    if (!this.ended) this.proc.kill("SIGKILL");
  }
}

/** Mouvement de caméra appliqué à une photo (léger, justifié : jamais d'effet gratuit). */
function motionTransform(m: CameraMove, p: number, W: number, H: number) {
  const e = easeInOut(p);
  switch (m) {
    case "push_in":
      return { s: 1 + 0.08 * e, dx: 0, dy: 0 };
    case "pull_out":
      return { s: 1.08 - 0.08 * e, dx: 0, dy: 0 };
    case "pan_left":
      return { s: 1.1, dx: W * 0.04 * (1 - 2 * e), dy: 0 };
    case "pan_right":
      return { s: 1.1, dx: -W * 0.04 * (1 - 2 * e), dy: 0 };
    case "tilt_up":
      return { s: 1.1, dx: 0, dy: H * 0.035 * (1 - 2 * e) };
    case "orbit":
      return { s: 1.06 + 0.03 * Math.sin(e * Math.PI), dx: W * 0.025 * Math.sin(e * Math.PI * 2), dy: 0 };
    case "handheld":
      return { s: 1.05, dx: Math.sin(p * 9.1) * W * 0.004, dy: Math.cos(p * 7.3) * H * 0.003 };
    default:
      return { s: 1, dx: 0, dy: 0 };
  }
}

function drawCover(ctx: Ctx, im: Image, W: number, H: number, crop: { x: number; y: number; w: number; h: number } | null, t: { s: number; dx: number; dy: number }) {
  const sx = crop ? crop.x * im.width : 0;
  const sy = crop ? crop.y * im.height : 0;
  const sw = crop ? crop.w * im.width : im.width;
  const sh = crop ? crop.h * im.height : im.height;
  const r = Math.max(W / sw, H / sh) * t.s;
  const dw = sw * r;
  const dh = sh * r;
  ctx.drawImage(im, sx, sy, sw, sh, (W - dw) / 2 + t.dx, (H - dh) / 2 + t.dy, dw, dh);
}

/** Composition en calques animée : chaque calque apparaît en léger décalé (lisible, sans effet gratuit). */
function animatedDoc(doc: AdDocument, local: number, mode: "rise" | "fade" | "none"): AdDocument {
  if (mode === "none") return doc;
  return {
    ...doc,
    layers: doc.layers.map((l, k): Layer => {
      if (l.role === "background") return l;
      const p = easeOut((local - 0.045 * Math.min(k, 12)) / 0.5);
      return { ...l, opacity: l.opacity * p, y: mode === "rise" ? l.y + (1 - p) * doc.height * 0.03 : l.y } as Layer;
    }),
  };
}

const easeOutBack = (t: number) => {
  const c = 1.6;
  const x = clamp(t) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};
const easeIn = (t: number) => clamp(t) * clamp(t);

/**
 * Calques posés sur un plan (habillage) : chaque calque animé entre à son heure (glisse, monte, se déroule,
 * rebondit) et TOUS sortent en douceur juste avant le plan suivant (sauf sur le dernier plan) — comme un montage
 * fait par un graphiste. Les calques sans animation gardent l'entrée échelonnée simple.
 */
function animatedOverlay(doc: AdDocument, local: number, clipS: number, last: boolean): AdDocument {
  const W = doc.width;
  const H = doc.height;
  const outP = last ? 0 : easeIn((local - (clipS - 0.3)) / 0.3);
  return {
    ...doc,
    layers: doc.layers.map((l, k): Layer => {
      const a = l.anim;
      if (!a) {
        const p = easeOut((local - 0.045 * Math.min(k, 12)) / 0.5);
        return { ...l, opacity: l.opacity * p * (1 - outP), y: l.y + (1 - p) * H * 0.03 - outP * H * 0.015 } as Layer;
      }
      const raw = clamp((local - a.delay) / (a.dur ?? 0.45));
      const p = easeOut(raw);
      let { x, y, w, h } = l;
      let opacity = l.opacity * (a.in === "none" ? 1 : Math.min(1, raw * 2.2)) * (1 - outP);
      let font = (l as { font?: { size: number } }).font;
      if (a.in === "rise") y += (1 - p) * H * 0.045;
      else if (a.in === "drop") y -= (1 - p) * H * 0.045;
      else if (a.in === "left") x -= (1 - p) * W * 0.3;
      else if (a.in === "right") x += (1 - p) * W * 0.3;
      else if (a.in === "grow") {
        if (l.kind === "text") x -= (1 - p) * W * 0.1;
        else w = w * p;
        opacity = l.opacity * (raw > 0 ? 1 : 0) * (1 - outP);
      } else if (a.in === "pop") {
        const s = 0.55 + 0.45 * easeOutBack(raw);
        x += (w * (1 - s)) / 2;
        y += (h * (1 - s)) / 2;
        w *= s;
        h *= s;
        if (font) font = { ...font, size: font.size * s };
      }
      // Sortie : léger glissement vers le haut et fondu.
      y -= outP * H * 0.02;
      return { ...l, x, y, w, h, opacity, ...(font ? { font } : {}) } as Layer;
    }),
  };
}

function drawSubtitle(ctx: Ctx, doc: VideoDocument, text: string, appear: number) {
  const s = doc.subtitles.style;
  const W = doc.width;
  const H = doc.height;
  ctx.save();
  ctx.font = serverFont(s.family, s.weight, s.size, false);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrap(ctx, s.uppercase ? text.toLocaleUpperCase() : text, W - doc.safe.side * 2 - s.size).slice(0, 2);
  const lh = s.size * 1.25;
  const blockH = lines.length * lh;
  const baseY = s.position === "top" ? doc.safe.top + H * 0.04 : s.position === "middle" ? H / 2 - blockH / 2 : H - doc.safe.bottom - blockH - H * 0.02;
  const y0 = Math.max(doc.safe.top, Math.min(H - doc.safe.bottom - blockH, baseY + s.offsetY));
  ctx.globalAlpha = clamp(appear / 0.12);
  lines.forEach((line: string, k: number) => {
    const y = y0 + k * lh + lh / 2;
    const w = ctx.measureText(line).width;
    if (s.background) {
      ctx.fillStyle = s.background;
      const px = s.size * 0.4;
      ctx.beginPath();
      ctx.roundRect(W / 2 - w / 2 - px, y - lh / 2, w + px * 2, lh, s.size * 0.25);
      ctx.fill();
    } else {
      ctx.lineWidth = Math.max(2, s.size * 0.12);
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.strokeText(line, W / 2, y);
    }
    ctx.fillStyle = s.color;
    ctx.fillText(line, W / 2, y);
  });
  ctx.restore();
}

function drawDisclosure(ctx: Ctx, doc: VideoDocument) {
  if (!doc.disclosure) return;
  const size = Math.round(Math.min(doc.width, doc.height) * 0.024);
  ctx.save();
  ctx.font = serverFont(doc.subtitles.style.family, 600, size, false);
  const w = ctx.measureText(doc.disclosure).width + size;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.roundRect(doc.safe.side, doc.safe.top, w, size * 1.7, size * 0.4);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.fillText(doc.disclosure, doc.safe.side + size / 2, doc.safe.top + size * 0.85);
  ctx.restore();
}

/** Dessine l'image d'un plan à l'instant `local` (secondes depuis son début), en coordonnées du document. */
async function drawClip(ctx: Ctx, doc: VideoDocument, c: Clip, local: number, src: VideoSources, reader: FrameReader | null, scratch: { canvas: any; ctx: Ctx }, scale: number) {
  const W = doc.width;
  const H = doc.height;
  const env: RenderEnv = { font: serverFont, images: src.images };
  const p = c.durationS > 0 ? clamp(local / c.durationS) : 0;
  const s = c.source;
  if (s.kind === "color") {
    ctx.fillStyle = s.color;
    ctx.fillRect(0, 0, W, H);
  } else if (s.kind === "image") {
    const im = src.images.get(s.assetId) as Image | undefined;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    if (im) {
      // Même lumière que les plans filmés (direction artistique de la marque).
      if (doc.grade) ctx.filter = GRADE_CANVAS[doc.grade];
      drawCover(ctx, im, W, H, s.crop, motionTransform(s.motion, p, W, H));
      ctx.filter = "none";
    }
  } else if (s.kind === "video") {
    const frame = reader ? await reader.next() : null;
    if (frame) {
      const id = scratch.ctx.createImageData(scratch.canvas.width, scratch.canvas.height);
      id.data.set(frame);
      scratch.ctx.putImageData(id, 0, 0);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Vidéo habillée : léger zoom lent sur la durée du plan (mouvement de caméra continu, jamais d'arrêt sur image).
      const z = doc.meta.promo ? 1 + 0.06 * easeInOut(p) : 1;
      const cw = scratch.canvas.width;
      const ch = scratch.canvas.height;
      ctx.drawImage(scratch.canvas, (cw - cw * z) / 2, (ch - ch * z) / 2, cw * z, ch * z);
      ctx.restore();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    } else {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
    }
  } else renderDoc(ctx, animatedDoc(s.doc, local, s.animate), env);
  if (c.overlays.length) {
    const ov: AdDocument = { version: 1, width: W, height: H, background: "transparent", safe: doc.safe, format: { platform: null, aspect: doc.aspect }, layers: c.overlays, brand: doc.brand, meta: { conceptId: null, source: "engine", createdFrom: null } };
    renderDoc(ctx, animatedOverlay(ov, local, c.durationS, c === doc.clips[doc.clips.length - 1]), env, (l) => l.visible);
  }
}

/** Transition à l'entrée d'un plan : mélange avec la dernière image du plan précédent (tenue). */
function drawTransition(ctx: Ctx, kind: Clip["transitionIn"]["kind"], p: number, prev: any, W: number, H: number, colors?: { a: string; b: string }) {
  if (!prev || kind === "cut" || p >= 1) return;
  const e = easeInOut(p);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const cw = prev.width;
  const ch = prev.height;
  if (kind === "wipe" && colors) {
    // Balayage aux couleurs de la marque : deux bandes diagonales traversent l'image ; l'ancien plan reste devant
    // la bande, le nouveau apparaît derrière (comme les transitions des modèles d'agence).
    const skew = cw * 0.35;
    const x = -skew + (cw + skew * 2) * e;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(cw + skew, 0);
    ctx.lineTo(cw + skew, ch);
    ctx.lineTo(x - skew, ch);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(prev, 0, 0);
    ctx.restore();
    const band = (off: number, wd: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - off, 0);
      ctx.lineTo(x - off + wd, 0);
      ctx.lineTo(x - off + wd - skew, ch);
      ctx.lineTo(x - off - skew, ch);
      ctx.closePath();
      ctx.fill();
    };
    band(0, cw * 0.09, colors.a);
    band(cw * 0.09, cw * 0.025, colors.b);
    ctx.restore();
    return;
  }
  if (kind === "fade") {
    ctx.globalAlpha = 1 - e;
    ctx.drawImage(prev, 0, 0);
  } else if (kind === "slide") ctx.drawImage(prev, -cw * e, 0);
  else if (kind === "wipe") ctx.drawImage(prev, cw * e, 0, cw * (1 - e), ch, cw * e, 0, cw * (1 - e), ch);
  else if (kind === "zoom") {
    ctx.globalAlpha = 1 - e;
    const z = 1 + 0.15 * e;
    ctx.drawImage(prev, (cw - cw * z) / 2, (ch - ch * z) / 2, cw * z, ch * z);
  }
  ctx.restore();
  void W;
  void H;
}

export async function renderVideoDoc(doc: VideoDocument, src: VideoSources, outFile: string, o: RenderOptions = {}): Promise<VideoRenderResult> {
  const scale = o.scale ?? 1;
  const fps = o.fps ?? doc.fps;
  const OW = Math.round((doc.width * scale) / 2) * 2;
  const OH = Math.round((doc.height * scale) / 2) * 2;
  const { starts, total } = timeline(doc);
  const frames = Math.max(1, Math.round(total * fps));
  const cues = o.burnSubtitles === false || !doc.subtitles.style.enabled ? [] : absoluteCues(doc);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  const args = ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${OW}x${OH}`, "-r", String(fps), "-i", "pipe:0"];
  if (o.audioFile) args.push("-i", o.audioFile);
  args.push("-c:v", "libx264", "-preset", scale < 1 ? "veryfast" : "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart");
  if (o.audioFile) args.push("-c:a", "aac", "-b:a", "192k", "-shortest");
  args.push("-t", String(total), outFile);
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "pipe"] });
  let stderr = "";
  ff.stderr.on("data", (d) => (stderr = (stderr + d.toString()).slice(-3000)));
  // Encodeur bloqué : arrêté au bout de la durée maximale des outils (la tâche échoue au lieu de rester en cours).
  const ffTimer = setTimeout(() => ff.kill("SIGKILL"), TOOL_TIMEOUT_MS);
  ff.on("close", () => clearTimeout(ffTimer));
  const done = new Promise<void>((res, rej) => {
    ff.on("error", rej);
    ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`encodage vidéo impossible (ffmpeg ${code}) : ${stderr.slice(-300)}`))));
  });
  let ffError: unknown = null;
  done.catch((e) => (ffError = e));
  ff.stdin.on("error", () => {});

  const canvas = createCanvas(OW, OH);
  const ctx = canvas.getContext("2d");
  const scratchCanvas = createCanvas(OW, OH);
  const scratch = { canvas: scratchCanvas, ctx: scratchCanvas.getContext("2d") };
  const prevCanvas = createCanvas(OW, OH);
  const prevCtx = prevCanvas.getContext("2d");
  let hasPrev = false;
  let current = -1;
  let reader: FrameReader | null = null;
  try {
    for (let i = 0; i < frames; i++) {
      const t = i / fps;
      let ci = starts.findIndex((s0, k) => t >= s0 && t < s0 + doc.clips[k].durationS);
      if (ci < 0) ci = doc.clips.length - 1;
      const c = doc.clips[ci];
      if (ci !== current) {
        // Changement de plan : la dernière image du plan précédent sert à la transition.
        if (current >= 0) {
          prevCtx.drawImage(canvas, 0, 0);
          hasPrev = true;
        }
        reader?.close();
        reader = c.source.kind === "video" && src.videos.get(c.source.assetId) ? new FrameReader(src.videos.get(c.source.assetId)!, c.source.inS, c.durationS, OW, OH, fps, GRADE_FFMPEG[doc.grade ?? "default"]) : null;
        current = ci;
      }
      const local = t - starts[ci];
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, doc.width, doc.height);
      await drawClip(ctx, doc, c, local, src, reader, scratch, scale);
      if (ci > 0 && hasPrev && c.transitionIn.kind !== "cut" && local < c.transitionIn.durationS) drawTransition(ctx, c.transitionIn.kind, local / c.transitionIn.durationS, prevCanvas, OW, OH, doc.meta.promo ? { a: accentOf(doc.brand.palette as Palette), b: "#FFFFFF" } : undefined);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const cue = cues.find((q) => t >= q.start && t < q.end);
      if (cue) drawSubtitle(ctx, doc, cue.text, t - cue.start);
      drawDisclosure(ctx, doc);
      if (ffError) throw ffError;
      if (!ff.stdin.write(canvas.data())) await Promise.race([new Promise((r) => ff.stdin.once("drain", r)), done.catch(() => {})]);
      if (o.onProgress && i % 15 === 0) o.onProgress(i / frames);
    }
  } finally {
    reader?.close();
    ff.stdin.end();
  }
  await done;
  return { file: outFile, durationS: total, width: OW, height: OH, frames, hasAudio: !!o.audioFile };
}

/** Image fixe d'un instant (affiche, contrôle de qualité, aperçu) : même rendu que la vidéo. */
export async function renderStill(doc: VideoDocument, src: VideoSources, atS: number, scale = 0.5): Promise<Buffer> {
  const { starts } = timeline(doc);
  let ci = starts.findIndex((s0, k) => atS >= s0 && atS < s0 + doc.clips[k].durationS);
  if (ci < 0) ci = doc.clips.length - 1;
  const c = doc.clips[ci];
  const OW = Math.round(doc.width * scale);
  const OH = Math.round(doc.height * scale);
  const canvas = createCanvas(OW, OH);
  const ctx = canvas.getContext("2d");
  const scratchCanvas = createCanvas(OW, OH);
  const local = atS - starts[ci];
  const reader = c.source.kind === "video" && src.videos.get(c.source.assetId) ? new FrameReader(src.videos.get(c.source.assetId)!, c.source.inS + local, 0.5, OW, OH, 2, GRADE_FFMPEG[doc.grade ?? "default"]) : null;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  try {
    await drawClip(ctx, doc, c, local, src, reader, { canvas: scratchCanvas, ctx: scratchCanvas.getContext("2d") }, scale);
  } finally {
    reader?.close();
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const cue = absoluteCues(doc).find((q) => atS >= q.start && atS < q.end);
  if (cue && doc.subtitles.style.enabled) drawSubtitle(ctx, doc, cue.text, 1);
  drawDisclosure(ctx, doc);
  return canvas.encode("jpeg", 88);
}
