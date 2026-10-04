/**
 * Moteur de motion design : chaque image de la vidéo est dessinée (Skia) à
 * partir du détourage réel du produit, des recadrages de détail, des scènes
 * et — si un fournisseur vidéo est configuré — de plans générés. Encodage
 * H.264/AAC (yuv420p, faststart) compatible avec toutes les plateformes.
 * Le produit n'est jamais régénéré : sa fidélité est garantie sur toute la durée.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage, type Image, type SKRSContext2D, type Canvas } from "@napi-rs/canvas";
import { ensureContrast, hsl, isDark, mix, onColor, withLightness } from "../color";
import { font, ensureFonts } from "./fonts";
import { wrapLines } from "./compose";
import type { Palette, Typo } from "./compose";
import { contentLang, L } from "../i18n-server";
import { intlLocale } from "../i18n";

/** Capitales selon la langue des contenus (« fr-FR » en français, comme avant). */
const upper = (s: string) => s.toLocaleUpperCase(intlLocale(contentLang()));

export type VideoFormat = "9:16" | "1:1" | "4:5" | "16:9";
export const VIDEO_SIZES: Record<VideoFormat, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "16:9": { w: 1920, h: 1080 },
};

export type VideoScene =
  | { kind: "title"; duration: number; text: string; sub?: string; bg?: "brand" | "light" | "dark" }
  | { kind: "reveal"; duration: number; headline?: string; motion?: "rise" | "zoom" | "slide" }
  | { kind: "callouts"; duration: number; items: string[]; heading?: string }
  | { kind: "detail"; duration: number; image: number; caption?: string }
  | { kind: "scene"; duration: number; image: number; caption?: string }
  | { kind: "clip"; duration: number; clip: number; caption?: string }
  | { kind: "end"; duration: number; headline: string; cta: string; url?: string }
  /** Ouverture sur une photo (de préférence le produit en situation), plein cadre, titre en bas. */
  | { kind: "hook"; duration: number; image: number; headline: string; tag?: string }
  /** Produit seul sous un projecteur, fond sombre, halo de la couleur de marque. */
  | { kind: "spotlight"; duration: number; headline?: string }
  /** Écran partagé : photo d'un côté, produit détouré et titre de l'autre. */
  | { kind: "split"; duration: number; image: number; headline?: string }
  /** Phrases courtes plein écran, l'une après l'autre, sur fonds alternés. */
  | { kind: "words"; duration: number; items: string[] };

export type VideoSpec = {
  format: VideoFormat;
  fps?: number;
  scenes: VideoScene[];
  transition: "panel" | "fade" | "push";
  music: "calm" | "pulse" | "none";
  captions: boolean;
};

export type VideoAssets = {
  product: Image;
  images: Image[]; // détails et scènes
  clips: string[][]; // chemins d'images extraites de plans vidéo générés
  logo?: Image | null;
  palette: Palette;
  typo: Typo;
  brand: string;
};

// ---------------------------------------------------------------- courbes

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.4, c3 = c1 + 1;
  t = clamp(t);
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const seg = (t: number, start: number, dur: number) => clamp((t - start) / dur);

// ---------------------------------------------------------------- calques

type Ctx = SKRSContext2D;

function layer(w: number, h: number) {
  const c = createCanvas(w, h);
  return { c, ctx: c.getContext("2d") };
}

/** Produit + ombre de contact pré-rendus une fois (performances). */
function productLayer(product: Image, height: number, shadowColor: string) {
  const pw = (product.width / product.height) * height;
  const pad = Math.round(height * 0.12);
  const { c, ctx } = layer(Math.ceil(pw + pad * 2), Math.ceil(height + pad * 1.2));
  const baseY = pad * 0.2 + height;
  const g = ctx.createRadialGradient(c.width / 2, baseY, 0, c.width / 2, baseY, pw * 0.62);
  g.addColorStop(0, `${shadowColor}0.38)`);
  g.addColorStop(0.5, `${shadowColor}0.12)`);
  g.addColorStop(1, `${shadowColor}0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(c.width / 2, baseY, pw * 0.62, pw * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(product as any, pad, pad * 0.2, pw, height);
  return { canvas: c, pw, height, baseOffset: baseY };
}

/** Balayage lumineux limité à la silhouette du produit. */
function sweepLayer(product: Image, pw: number, ph: number) {
  const { c, ctx } = layer(Math.ceil(pw), Math.ceil(ph));
  ctx.drawImage(product as any, 0, 0, pw, ph);
  return c;
}

function drawSweep(ctx: Ctx, mask: Canvas, x: number, y: number, progress: number) {
  const w = mask.width, h = mask.height;
  const { c, ctx: l } = layer(w, h);
  l.drawImage(mask as any, 0, 0);
  l.globalCompositeOperation = "source-in";
  const cx = -w * 0.6 + progress * w * 2.2;
  const g = l.createLinearGradient(cx - w * 0.25, 0, cx + w * 0.25, h * 0.4);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  l.fillStyle = g;
  l.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(c as any, x, y);
  ctx.restore();
}

// ---------------------------------------------------------------- texte animé

/** Texte révélé ligne par ligne, mot par mot, depuis un masque. */
function kinetic(ctx: Ctx, text: string, opts: { x: number; y: number; maxW: number; size: number; family: string; weight: number; color: string; t: number; align?: "left" | "center"; lh?: number; uppercase?: boolean; italic?: boolean }) {
  const s = opts.uppercase ? upper(text) : text;
  ctx.font = font(opts.family, opts.weight, opts.size, opts.italic);
  const lines = wrapLines(ctx, s, opts.maxW);
  const lh = opts.size * (opts.lh ?? 1.08);
  let wordIndex = 0;
  lines.forEach((line, li) => {
    const words = line.split(" ");
    const lineW = ctx.measureText(line).width;
    let x = opts.align === "center" ? opts.x - lineW / 2 : opts.x;
    const baseline = opts.y + opts.size + li * lh;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, baseline - opts.size * 1.05, 100000, lh + opts.size * 0.15);
    ctx.clip();
    for (const word of words) {
      const p = easeOut(seg(opts.t, wordIndex * 0.06, 0.55));
      const dy = (1 - p) * lh;
      ctx.globalAlpha = clamp(p * 1.4);
      ctx.fillStyle = opts.color;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(word, x, baseline + dy);
      x += ctx.measureText(word + " ").width;
      wordIndex++;
    }
    ctx.restore();
  });
  ctx.globalAlpha = 1;
  return lines.length * lh;
}

function pill(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------- rendu

type Prepared = {
  W: number;
  H: number;
  safe: { side: number; top: number; bottom: number };
  pal: { bg: string; bgDark: string; brand: string; text: string; textOnDark: string; accent: string };
  big: ReturnType<typeof productLayer>;
  bigSweep: Canvas;
  bgLight: Canvas;
  bgBrand: Canvas;
  bgDark: Canvas;
};

function backgrounds(W: number, H: number, pal: Prepared["pal"]) {
  const mk = (base: string, lightTop: boolean) => {
    const { c, ctx } = layer(W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, lightTop ? withLightness(base, Math.min(0.97, hsl(base)[2] + 0.05)) : base);
    g.addColorStop(1, withLightness(base, Math.max(0.04, hsl(base)[2] - 0.07)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const r = ctx.createRadialGradient(W * 0.3, H * 0.25, 0, W * 0.3, H * 0.25, Math.max(W, H) * 0.8);
    r.addColorStop(0, "rgba(255,255,255,0.18)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, W, H);
    return c;
  };
  return { bgLight: mk(pal.bg, true), bgBrand: mk(pal.brand, false), bgDark: mk(pal.bgDark, false) };
}

function prepare(spec: VideoSpec, a: VideoAssets): Prepared {
  ensureFonts();
  const { w: W, h: H } = VIDEO_SIZES[spec.format];
  const isTall = H / W > 1.6;
  const safe = { side: Math.round(W * 0.08), top: Math.round(H * (isTall ? 0.12 : 0.08)), bottom: Math.round(H * (isTall ? 0.2 : 0.1)) };
  const bg = withLightness(a.palette.light, Math.max(0.9, hsl(a.palette.light)[2]), 0.7);
  const brand = a.palette.primary;
  const bgDark = withLightness(a.palette.dark, 0.09, 0.6);
  const pal = {
    bg,
    bgDark,
    brand,
    text: ensureContrast(withLightness(a.palette.dark, 0.12), bg, 7),
    textOnDark: "#FFFFFF",
    accent: a.palette.accent,
  };
  const ph = Math.min(H * (isTall ? 0.5 : 0.62), W * 0.9 * (a.product.height / a.product.width));
  const big = productLayer(a.product, ph, "rgba(20,14,10,");
  const bigSweep = sweepLayer(a.product, big.pw, big.height);
  return { W, H, safe, pal, big, bigSweep, ...backgrounds(W, H, pal) };
}

function textColorFor(bg: string) {
  return isDark(bg) ? "#FFFFFF" : ensureContrast("#141414", bg, 7);
}

function drawScene(ctx: Ctx, scene: VideoScene, t: number, local: number, P: Prepared, a: VideoAssets, clipFrames: Map<string, Image>) {
  const { W, H, safe, pal } = P;
  const typo = a.typo;
  const headW = typo.headingWeight ?? 600;
  const isTall = H / W > 1.6;
  const headSize = Math.round(W * (isTall ? 0.105 : W > H ? 0.06 : 0.085));
  const bodySize = Math.round(Math.max(W * (W > H ? 0.024 : 0.036), 30));
  const progress = local / scene.duration;

  switch (scene.kind) {
    case "title": {
      const bg = scene.bg === "dark" ? P.bgDark : scene.bg === "light" ? P.bgLight : P.bgBrand;
      const bgColor = scene.bg === "dark" ? pal.bgDark : scene.bg === "light" ? pal.bg : pal.brand;
      ctx.drawImage(bg as any, 0, 0);
      const color = textColorFor(bgColor);
      // Fine ligne qui se trace, puis titre.
      const lw = easeInOut(seg(local, 0.1, 0.7)) * W * 0.18;
      ctx.fillStyle = color;
      ctx.fillRect(W / 2 - lw / 2, H * 0.36, lw, Math.max(3, W * 0.003));
      const used = kinetic(ctx, scene.text, { x: W / 2, y: H * 0.4, maxW: W - safe.side * 2, size: headSize, family: typo.heading, weight: headW, color, t: local - 0.2, align: "center", uppercase: typo.uppercase });
      if (scene.sub) {
        ctx.globalAlpha = easeOut(seg(local, 0.9, 0.6));
        ctx.font = font(typo.body, 400, bodySize);
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        wrapLines(ctx, scene.sub, W - safe.side * 2).slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, H * 0.4 + used + bodySize * (0.8 + i * 1.35)));
        ctx.globalAlpha = 1;
      }
      break;
    }
    case "reveal": {
      ctx.drawImage(P.bgLight as any, 0, 0);
      // Arche de couleur qui se lève derrière le produit.
      const archP = easeOut(seg(local, 0, 0.9));
      const aw = Math.min(W * 0.7, P.big.pw * 1.6);
      const ah = P.big.height * 1.25 * archP;
      const baseY = H - safe.bottom - H * 0.04;
      ctx.fillStyle = mix(pal.brand, pal.bg, 0.55);
      ctx.beginPath();
      ctx.moveTo(W / 2 - aw / 2, baseY);
      ctx.lineTo(W / 2 - aw / 2, baseY - Math.max(0, ah - aw / 2));
      if (ah > aw / 2) ctx.arc(W / 2, baseY - (ah - aw / 2), aw / 2, Math.PI, 0);
      ctx.lineTo(W / 2 + aw / 2, baseY);
      ctx.closePath();
      ctx.fill();
      const motion = scene.motion ?? "rise";
      const p = motion === "zoom" ? easeOut(seg(local, 0.15, 1.1)) : easeOutBack(seg(local, 0.2, 1.0));
      const scale = motion === "zoom" ? 0.82 + 0.18 * p : 1;
      const dy = motion === "rise" ? (1 - p) * H * 0.25 : 0;
      const dx = motion === "slide" ? (1 - p) * W * 0.6 : 0;
      const L = P.big;
      const drift = Math.sin(local * 1.1) * H * 0.004;
      ctx.save();
      ctx.globalAlpha = clamp(seg(local, 0.15, 0.4) * 1.2);
      ctx.translate(W / 2 + dx, baseY + dy + drift);
      ctx.scale(scale, scale);
      ctx.drawImage(L.canvas as any, -L.canvas.width / 2, -L.baseOffset);
      ctx.restore();
      const sweepT = seg(local, 1.0, 1.2);
      if (sweepT > 0 && sweepT < 1) drawSweep(ctx, P.bigSweep, W / 2 + dx - L.pw / 2 * scale, baseY + dy + drift - L.height * scale, sweepT);
      if (scene.headline) {
        const color = pal.text;
        kinetic(ctx, scene.headline, { x: W / 2, y: safe.top, maxW: W - safe.side * 2, size: Math.round(headSize * 0.82), family: typo.heading, weight: headW, color, t: local - 0.5, align: "center", uppercase: typo.uppercase });
      }
      break;
    }
    case "callouts": {
      ctx.drawImage(P.bgLight as any, 0, 0);
      const L = P.big;
      const wide = W > H;
      const pScale = wide ? 0.95 : 1;
      const px = wide ? W * 0.3 : W * 0.34;
      const baseY = H - safe.bottom - H * 0.03;
      ctx.save();
      ctx.translate(px, baseY);
      ctx.scale(pScale, pScale);
      ctx.drawImage(L.canvas as any, -L.canvas.width / 2, -L.baseOffset);
      ctx.restore();
      const pw = L.pw * pScale, ph = L.height * pScale;
      if (scene.heading) kinetic(ctx, scene.heading, { x: safe.side, y: safe.top, maxW: W - safe.side * 2, size: Math.round(headSize * 0.7), family: typo.heading, weight: headW, color: pal.text, t: local, uppercase: typo.uppercase });
      const items = scene.items.slice(0, 3);
      const labelX = wide ? W * 0.55 : W * 0.58;
      const labelW = W - labelX - safe.side;
      items.forEach((item, i) => {
        const start = 0.4 + i * 0.55;
        const p = easeOut(seg(local, start, 0.6));
        if (p <= 0) return;
        const anchorY = baseY - ph * (0.78 - i * 0.26);
        const anchorX = px + pw * 0.32;
        const ly = anchorY;
        ctx.strokeStyle = pal.text;
        ctx.lineWidth = Math.max(2, W * 0.0025);
        ctx.beginPath();
        ctx.moveTo(anchorX, anchorY);
        ctx.lineTo(anchorX + (labelX - 16 - anchorX) * p, ly);
        ctx.stroke();
        ctx.fillStyle = pal.text;
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, Math.max(5, W * 0.007) * p, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = clamp((p - 0.4) / 0.6);
        ctx.font = font(typo.body, 600, bodySize);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const lines = wrapLines(ctx, item, labelW).slice(0, 3);
        lines.forEach((l, k) => ctx.fillText(l, labelX + (1 - p) * 30, ly + (k - (lines.length - 1) / 2) * bodySize * 1.25));
        ctx.globalAlpha = 1;
      });
      break;
    }
    case "detail":
    case "scene": {
      const im = a.images[scene.image] ?? a.images[0];
      if (im) {
        const z = scene.kind === "detail" ? 1.16 - 0.12 * easeInOut(progress) : 1.04 + 0.08 * easeInOut(progress);
        const r = Math.max(W / im.width, H / im.height) * z;
        const dx = (W - im.width * r) / 2 + (scene.kind === "scene" ? (progress - 0.5) * W * 0.04 : 0);
        ctx.drawImage(im as any, dx, (H - im.height * r) / 2, im.width * r, im.height * r);
      } else ctx.drawImage(P.bgLight as any, 0, 0);
      if (scene.caption) {
        const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.72)");
        ctx.fillStyle = g;
        ctx.fillRect(0, H * 0.55, W, H * 0.45);
        kinetic(ctx, scene.caption, { x: safe.side, y: H - safe.bottom - headSize * 2.4, maxW: W - safe.side * 2, size: Math.round(headSize * 0.72), family: typo.heading, weight: headW, color: "#FFFFFF", t: local - 0.2, uppercase: typo.uppercase });
      }
      break;
    }
    case "clip": {
      const frames = a.clips[scene.clip] ?? [];
      const idx = Math.min(frames.length - 1, Math.floor(local * 30));
      const f = frames[idx] ? clipFrames.get(frames[idx]) : null;
      if (f) {
        const r = Math.max(W / f.width, H / f.height);
        ctx.drawImage(f as any, (W - f.width * r) / 2, (H - f.height * r) / 2, f.width * r, f.height * r);
      } else ctx.drawImage(P.bgDark as any, 0, 0);
      if (scene.caption) kinetic(ctx, scene.caption, { x: safe.side, y: H - safe.bottom - headSize * 2.4, maxW: W - safe.side * 2, size: Math.round(headSize * 0.72), family: typo.heading, weight: headW, color: "#FFFFFF", t: local - 0.2, uppercase: typo.uppercase });
      break;
    }
    case "hook": {
      const im = a.images[scene.image] ?? a.images[0];
      if (im) {
        const z = 1.14 - 0.1 * easeOut(progress);
        const r = Math.max(W / im.width, H / im.height) * z;
        ctx.drawImage(im as any, (W - im.width * r) / 2, (H - im.height * r) / 2 - (1 - progress) * H * 0.015, im.width * r, im.height * r);
      } else ctx.drawImage(P.bgDark as any, 0, 0);
      const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.78)");
      ctx.fillStyle = g;
      ctx.fillRect(0, H * 0.45, W, H * 0.55);
      if (scene.tag) {
        ctx.globalAlpha = easeOut(seg(local, 0.2, 0.5));
        const ts = Math.round(bodySize * 0.8);
        ctx.font = font(typo.body, 600, ts);
        const tw = ctx.measureText(scene.tag).width + ts * 1.8;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        pill(ctx, safe.side, safe.top, tw, ts * 2.1);
        ctx.fill();
        ctx.fillStyle = "#141414";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(scene.tag, safe.side + ts * 0.9, safe.top + ts * 1.07);
        ctx.globalAlpha = 1;
      }
      const hs = Math.round(headSize * 0.95);
      ctx.font = font(typo.heading, headW, hs);
      const n = Math.min(3, wrapLines(ctx, typo.uppercase ? upper(scene.headline) : scene.headline, W - safe.side * 2).length);
      kinetic(ctx, scene.headline, { x: safe.side, y: H - safe.bottom - n * hs * 1.08, maxW: W - safe.side * 2, size: hs, family: typo.heading, weight: headW, color: "#FFFFFF", t: local - 0.35, uppercase: typo.uppercase });
      break;
    }
    case "spotlight": {
      ctx.drawImage(P.bgDark as any, 0, 0);
      const L = P.big;
      const baseY = H - safe.bottom - H * 0.05;
      const cy = baseY - L.height * 0.5;
      const glow = easeOut(seg(local, 0, 1.2));
      const rg = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, Math.max(W, H) * 0.55 * glow + 1);
      rg.addColorStop(0, mix(pal.brand, "#FFFFFF", 0.25));
      rg.addColorStop(0.45, pal.brand + "88");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      // Anneau d'orbite qui se trace autour du produit.
      const ringP = easeInOut(seg(local, 0.3, 1.4));
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.beginPath();
      ctx.ellipse(W / 2, baseY - L.height * 0.06, L.pw * 0.75, L.pw * 0.14, 0, Math.PI * 0.5, Math.PI * 0.5 + Math.PI * 2 * ringP);
      ctx.stroke();
      const p = easeOutBack(seg(local, 0.1, 1.1));
      const scale = 0.62 + 0.38 * p;
      const rot = (1 - easeOut(seg(local, 0.1, 1.3))) * -0.14 + Math.sin(local * 1.4) * 0.012;
      ctx.save();
      ctx.globalAlpha = clamp(seg(local, 0.05, 0.35) * 1.5);
      ctx.translate(W / 2, baseY + Math.sin(local * 1.6) * H * 0.006);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.drawImage(L.canvas as any, -L.canvas.width / 2, -L.baseOffset);
      ctx.restore();
      const sw = seg(local, 1.2, 1.1);
      if (sw > 0 && sw < 1) drawSweep(ctx, P.bigSweep, W / 2 - L.pw / 2, baseY - L.height, sw);
      if (scene.headline) kinetic(ctx, scene.headline, { x: W / 2, y: safe.top, maxW: W - safe.side * 2, size: Math.round(headSize * 0.85), family: typo.heading, weight: headW, color: "#FFFFFF", t: local - 0.6, align: "center", uppercase: typo.uppercase });
      break;
    }
    case "split": {
      ctx.drawImage(P.bgLight as any, 0, 0);
      const im = a.images[scene.image] ?? a.images[0];
      const wide = W > H;
      const iw = wide ? W * 0.5 : W, ih = wide ? H : H * 0.5;
      const open = easeInOut(seg(local, 0, 0.8));
      if (im) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, wide ? iw * open : iw, wide ? ih : ih * open);
        ctx.clip();
        const r = Math.max(iw / im.width, ih / im.height) * (1.08 - 0.06 * progress);
        ctx.drawImage(im as any, (iw - im.width * r) / 2, (ih - im.height * r) / 2, im.width * r, im.height * r);
        ctx.restore();
      }
      const L = P.big;
      const zoneX = wide ? W * 0.5 : 0, zoneY = wide ? 0 : H * 0.5, zw = wide ? W * 0.5 : W, zh = wide ? H : H * 0.5;
      const k = Math.min((zh * 0.6) / L.height, (zw * 0.62) / L.pw);
      const p = easeOutBack(seg(local, 0.45, 0.9));
      const bx = zoneX + zw * (wide ? 0.5 : 0.7), by = zoneY + zh - Math.min(safe.bottom * 0.7, zh * 0.12);
      ctx.save();
      ctx.globalAlpha = clamp(seg(local, 0.45, 0.3) * 2);
      ctx.translate(bx + (1 - p) * zw * 0.3, by);
      ctx.scale(k, k);
      ctx.drawImage(L.canvas as any, -L.canvas.width / 2, -L.baseOffset);
      ctx.restore();
      if (scene.headline) {
        const hs = Math.round(headSize * (wide ? 0.7 : 0.62));
        kinetic(ctx, scene.headline, wide
          ? { x: zoneX + safe.side * 0.6, y: safe.top, maxW: zw - safe.side * 1.2, size: hs, family: typo.heading, weight: headW, color: pal.text, t: local - 0.7, uppercase: typo.uppercase }
          : { x: safe.side, y: zoneY + zh * 0.12, maxW: W * 0.42, size: hs, family: typo.heading, weight: headW, color: pal.text, t: local - 0.7, uppercase: typo.uppercase });
      }
      break;
    }
    case "words": {
      const items = scene.items.filter(Boolean).slice(0, 4);
      const per = scene.duration / Math.max(1, items.length);
      const i = Math.min(items.length - 1, Math.floor(local / per));
      const bgs = [P.bgBrand, P.bgDark, P.bgLight];
      const cols = [pal.brand, pal.bgDark, pal.bg];
      ctx.drawImage(bgs[i % 3] as any, 0, 0);
      const color = textColorFor(cols[i % 3]);
      const it = items[i] ?? "";
      const size = Math.round(headSize * (it.length > 28 ? 0.85 : 1.1));
      ctx.font = font(typo.heading, headW, size);
      const n = wrapLines(ctx, typo.uppercase ? upper(it) : it, W - safe.side * 2).length;
      kinetic(ctx, it, { x: W / 2, y: H / 2 - (n * size * 1.08) / 2 - size * 0.1, maxW: W - safe.side * 2, size, family: typo.heading, weight: headW, color, t: local - i * per - 0.05, align: "center", uppercase: typo.uppercase });
      ctx.globalAlpha = 0.7;
      ctx.font = font(typo.body, 600, Math.round(bodySize * 0.75));
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${String(i + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`, W / 2, H - safe.bottom);
      ctx.globalAlpha = 1;
      break;
    }
    case "end": {
      ctx.drawImage(P.bgDark as any, 0, 0);
      const color = "#FFFFFF";
      const L = P.big;
      const pScale = 0.58;
      const p = easeOut(seg(local, 0, 0.8));
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(W / 2, H * (W > H ? 0.66 : 0.6) + (1 - p) * 40);
      ctx.scale(pScale, pScale);
      ctx.drawImage(L.canvas as any, -L.canvas.width / 2, -L.baseOffset);
      ctx.restore();
      ctx.globalAlpha = 1;
      let y = safe.top;
      if (a.logo) {
        const lh = Math.round(H * 0.05);
        const lw = Math.min((a.logo.width / a.logo.height) * lh, W * 0.5);
        ctx.globalAlpha = easeOut(seg(local, 0.1, 0.6));
        ctx.drawImage(a.logo as any, W / 2 - lw / 2, y, lw, (lw / a.logo.width) * a.logo.height);
        ctx.globalAlpha = 1;
        y += lh + H * 0.03;
      }
      kinetic(ctx, scene.headline, { x: W / 2, y, maxW: W - safe.side * 2, size: Math.round(headSize * 0.8), family: typo.heading, weight: headW, color, t: local - 0.3, align: "center", uppercase: typo.uppercase });
      const ctaSize = Math.round(bodySize * 1.05);
      ctx.font = font(typo.body, 600, ctaSize);
      const tw = ctx.measureText(scene.cta).width;
      const bw = tw + ctaSize * 2.8, bh = ctaSize * 2.6;
      const by = H - safe.bottom - bh - (scene.url ? ctaSize * 2 : 0);
      const pulse = 1 + 0.035 * Math.sin(Math.max(0, local - 1.2) * 5);
      const cp = easeOutBack(seg(local, 0.8, 0.6));
      ctx.save();
      ctx.translate(W / 2, by + bh / 2);
      ctx.scale(cp * pulse, cp * pulse);
      ctx.fillStyle = pal.accent;
      pill(ctx, -bw / 2, -bh / 2, bw, bh);
      ctx.fill();
      ctx.fillStyle = onColor(pal.accent);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(scene.cta, 0, ctaSize * 0.05);
      ctx.restore();
      if (scene.url) {
        ctx.globalAlpha = easeOut(seg(local, 1.1, 0.5));
        ctx.font = font(typo.body, 400, Math.round(bodySize * 0.8));
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(scene.url, W / 2, by + bh + ctaSize * 0.8);
        ctx.globalAlpha = 1;
      }
      break;
    }
  }
}

/** Transition graphique : panneau de couleur qui balaie l'écran au moment de la coupe. */
function drawTransition(ctx: Ctx, kind: VideoSpec["transition"], p: number, P: Prepared) {
  const { W, H, pal } = P;
  if (kind === "fade") {
    ctx.fillStyle = `rgba(0,0,0,${Math.sin(p * Math.PI) * 0.9})`;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (kind === "push") {
    // Iris : un disque de la couleur de marque couvre l'écran puis s'ouvre sur le plan suivant.
    const r = Math.sin(p * Math.PI) * Math.hypot(W, H) * 0.55;
    ctx.save();
    ctx.fillStyle = pal.brand;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // p de 0 à 1 : le panneau entre (0 → 0,5) puis sort (0,5 → 1).
  const e = easeInOut(p);
  const x0 = (e * 2 - 1) * W * 1.15;
  ctx.save();
  ctx.fillStyle = pal.brand;
  ctx.beginPath();
  const skew = W * 0.18;
  ctx.moveTo(x0 - W * 0.6, 0);
  ctx.lineTo(x0 + W * 0.6 + skew, 0);
  ctx.lineTo(x0 + W * 0.6, H);
  ctx.lineTo(x0 - W * 0.6 - skew, H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.accent;
  ctx.fillRect(x0 + W * 0.6 - 2, 0, Math.max(6, W * 0.012), H);
  ctx.restore();
}

// ---------------------------------------------------------------- musique

/** Fond musical synthétisé (aucun droit tiers) : nappe d'accords et pulsation légère. */
export function synthMusic(duration: number, kind: "calm" | "pulse", cuts: number[], sampleRate = 44100): Buffer {
  const n = Math.ceil(duration * sampleRate);
  const L = new Float32Array(n), R = new Float32Array(n);
  const chords = [
    [220.0, 277.18, 329.63, 415.3],
    [196.0, 246.94, 293.66, 369.99],
    [174.61, 220.0, 261.63, 329.63],
    [196.0, 246.94, 293.66, 392.0],
  ];
  const bar = kind === "pulse" ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const ci = Math.floor(t / bar) % chords.length;
    const tin = (t % bar) / bar;
    const env = Math.min(1, tin * 6) * (1 - Math.max(0, tin - 0.85) / 0.15 * 0.5);
    let s = 0;
    for (const [k, f] of chords[ci].entries()) {
      const det = 1 + (k % 2 ? 0.003 : -0.003);
      s += (Math.sin(2 * Math.PI * f * det * t) * 0.6 + Math.sin(2 * Math.PI * f * 2 * t) * 0.15) * (0.22 - k * 0.03);
    }
    s *= env * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.25 * t));
    if (kind === "pulse") {
      const beat = (t % 0.5) / 0.5;
      const kick = Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-beat * 30)) * (t % 0.5)) * Math.exp(-beat * 9) * 0.5;
      s += kick;
    }
    // Souffle aux transitions.
    for (const c of cuts) {
      const d = t - (c - 0.35);
      if (d > 0 && d < 0.7) s += (Math.random() * 2 - 1) * Math.sin((d / 0.7) * Math.PI) * 0.08;
    }
    const fade = Math.min(1, t / 0.8, (duration - t) / 1.2);
    s *= Math.max(0, fade) * 0.55;
    L[i] = s * (1 + 0.05 * Math.sin(t * 0.7));
    R[i] = s * (1 - 0.05 * Math.sin(t * 0.7));
  }
  const data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(clamp(L[i], -1, 1) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(clamp(R[i], -1, 1) * 32767), 46 + i * 4);
  }
  return data;
}

// ---------------------------------------------------------------- sous-titres

export function srtFromSpec(spec: VideoSpec): string {
  let t = 0;
  const out: string[] = [];
  const fmt = (s: number) => {
    const ms = Math.round(s * 1000);
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(r).padStart(3, "0")}`;
  };
  let n = 1;
  for (const s of spec.scenes) {
    const text = sceneText(s);
    if (text) out.push(`${n++}\n${fmt(t + 0.2)} --> ${fmt(t + s.duration - 0.1)}\n${text}\n`);
    t += s.duration;
  }
  return out.join("\n");
}

// ---------------------------------------------------------------- encodage

export type RenderResult = { file: string; duration: number; width: number; height: number; frames: number; hasAudio: boolean };

export async function renderVideo(spec: VideoSpec, a: VideoAssets, outFile: string, onProgress?: (p: number) => void): Promise<RenderResult> {
  const fps = spec.fps ?? 30;
  const P = prepare(spec, a);
  const total = spec.scenes.reduce((s, x) => s + x.duration, 0);
  const frames = Math.round(total * fps);
  const starts: number[] = [];
  spec.scenes.reduce((acc, s) => (starts.push(acc), acc + s.duration), 0);
  const cuts = starts.slice(1);

  const clipFrames = new Map<string, Image>();
  for (const clip of a.clips) for (const f of clip) if (!clipFrames.has(f)) clipFrames.set(f, await loadImage(fs.readFileSync(f)));

  const dir = path.dirname(outFile);
  fs.mkdirSync(dir, { recursive: true });
  let audio: string | null = null;
  if (spec.music !== "none") {
    audio = path.join(dir, `music-${Date.now()}.wav`);
    fs.writeFileSync(audio, synthMusic(total, spec.music, cuts));
  }
  const args = ["-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${P.W}x${P.H}`, "-r", String(fps), "-i", "pipe:0"];
  if (audio) args.push("-i", audio);
  args.push("-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1", "-movflags", "+faststart");
  if (audio) args.push("-c:a", "aac", "-b:a", "160k", "-shortest");
  args.push(outFile);
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "pipe"] });
  let stderr = "";
  ff.stderr.on("data", (d) => (stderr = (stderr + d.toString()).slice(-4000)));
  const done = new Promise<void>((resolve, reject) => {
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(L(`Encodage vidéo impossible (ffmpeg ${code}) : ${stderr.slice(-400)}`, `Video encoding failed (ffmpeg ${code}): ${stderr.slice(-400)}`)))));
  });

  const canvas = createCanvas(P.W, P.H);
  const ctx = canvas.getContext("2d");
  const TR = 0.5; // durée de transition (s)
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    let si = starts.findIndex((s, k) => t >= s && t < s + spec.scenes[k].duration);
    if (si < 0) si = spec.scenes.length - 1;
    const local = t - starts[si];
    ctx.save();
    drawScene(ctx, spec.scenes[si], t, local, P, a, clipFrames);
    ctx.restore();
    // Transition centrée sur chaque coupe.
    for (const c of cuts) {
      const d = t - (c - TR / 2);
      if (d >= 0 && d <= TR) drawTransition(ctx, spec.transition, d / TR, P);
    }
    const buf = canvas.data();
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (onProgress && i % 15 === 0) onProgress(i / frames);
  }
  ff.stdin.end();
  await done;
  if (audio) fs.rmSync(audio, { force: true });
  return { file: outFile, duration: total, width: P.W, height: P.H, frames, hasAudio: !!audio };
}

/** Texte lisible d'un plan (sous-titres, storyboard). */
export function sceneText(s: VideoScene): string | undefined {
  switch (s.kind) {
    case "title": return [s.text, s.sub].filter(Boolean).join(". ");
    case "reveal": case "spotlight": case "split": return s.headline;
    case "callouts": return [s.heading, ...s.items].filter(Boolean).join(" · ");
    case "words": return s.items.join(" · ");
    case "hook": return s.headline;
    case "end": return `${s.headline}. ${s.cta}`;
    default: return s.caption;
  }
}

/** Durée totale recommandée et limites par réseau (contrôle avant export). */
export function checkVideoSpec(spec: VideoSpec): string[] {
  const issues: string[] = [];
  const total = spec.scenes.reduce((s, x) => s + x.duration, 0);
  if (total < 5) issues.push(L("Vidéo trop courte (moins de 5 s).", "Video too short (under 5 s)."));
  if (total > 60) issues.push(L("Vidéo de plus de 60 s : trop longue pour une publicité courte.", "Video over 60 s: too long for a short ad."));
  if (!spec.scenes.some((s) => s.kind === "end")) issues.push(L("Aucun écran final avec appel à l'action.", "No end screen with a call to action."));
  for (const s of spec.scenes) if (s.duration < 1.2) issues.push(L(`Plan « ${s.kind} » trop court pour être lu (${s.duration} s).`, `"${s.kind}" shot too short to read (${s.duration} s).`));
  return issues;
}
