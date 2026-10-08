/**
 * Rendu d'un document publicitaire (isomorphe) : la MÊME fonction dessine l'aperçu de l'éditeur (canvas du
 * navigateur) et l'export du serveur (@napi-rs/canvas). Aucune dépendance Node ici : l'environnement fournit la
 * correspondance des polices et les images déjà chargées. Ce qui est vu dans l'éditeur est ce qui est exporté.
 */
import type { AdDocument, Fill, ImageLayer, Layer, Shadow, TextLayer } from "./types";

/** Sous-ensemble de CanvasRenderingContext2D commun au navigateur et à @napi-rs/canvas. */
export type Ctx2D = any;

export type RenderEnv = {
  /** Chaîne « font » canvas pour une famille / graisse / taille (alias de polices du serveur, @font-face du navigateur). */
  font: (family: string, weight: number, size: number, italic: boolean) => string;
  /** Images chargées par identifiant d'asset. */
  images: Map<string, { width: number; height: number } & object>;
};

export function wrap(ctx: Ctx2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    let line = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

/** Taille effective d'un texte (ajustement automatique au cadre) et ses lignes. */
export function layoutText(ctx: Ctx2D, l: Pick<TextLayer, "text" | "font" | "w" | "h" | "lineHeight" | "uppercase" | "autoFit" | "letterSpacing">, env: Pick<RenderEnv, "font">): { size: number; lines: string[] } {
  const text = l.uppercase ? l.text.toUpperCase() : l.text;
  const min = l.autoFit ? Math.max(6, l.autoFit.minSize) : l.font.size;
  for (let size = l.font.size; size >= min; size -= 2) {
    ctx.font = env.font(l.font.family, l.font.weight, size, l.font.italic);
    const lines = wrap(ctx, text, l.w);
    if (!l.autoFit || (lines.length * size * l.lineHeight <= l.h + 0.5 && lines.every((x) => ctx.measureText(x).width <= l.w + 0.5))) return { size, lines };
  }
  ctx.font = env.font(l.font.family, l.font.weight, min, l.font.italic);
  return { size: min, lines: wrap(ctx, text, l.w) };
}

function fillStyle(ctx: Ctx2D, f: Fill, x: number, y: number, w: number, h: number) {
  if (typeof f === "string") return f;
  const a = (f.angle * Math.PI) / 180;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = (Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * h) / 2;
  const g = ctx.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  for (const s of f.stops) g.addColorStop(Math.max(0, Math.min(1, s.offset)), s.color);
  return g;
}

function shadowOn(ctx: Ctx2D, s: Shadow | null) {
  ctx.shadowColor = s ? s.color : "rgba(0,0,0,0)";
  ctx.shadowBlur = s?.blur ?? 0;
  ctx.shadowOffsetX = s?.x ?? 0;
  ctx.shadowOffsetY = s?.y ?? 0;
}

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Cadre réellement occupé par une image en « contain » (le produit n'est jamais coupé). */
export function containBox(l: Pick<ImageLayer, "x" | "y" | "w" | "h">, iw: number, ih: number) {
  const s = Math.min(l.w / iw, l.h / ih);
  const w = iw * s;
  const h = ih * s;
  return { x: l.x + (l.w - w) / 2, y: l.y + (l.h - h), w, h };
}

function drawImage(ctx: Ctx2D, l: ImageLayer, env: RenderEnv) {
  const img = l.assetId ? env.images.get(l.assetId) : undefined;
  if (!img) return;
  const c = l.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const sx = c.x * img.width;
  const sy = c.y * img.height;
  const sw = Math.max(1, c.w * img.width);
  const sh = Math.max(1, c.h * img.height);
  ctx.save();
  if (l.fit === "cover") {
    roundRect(ctx, l.x, l.y, l.w, l.h, l.radius);
    ctx.clip();
    const s = Math.max(l.w / sw, l.h / sh);
    const w = sw * s;
    const h = sh * s;
    shadowOn(ctx, null);
    ctx.drawImage(img, sx, sy, sw, sh, l.x + (l.w - w) / 2, l.y + (l.h - h) / 2, w, h);
  } else {
    const b = containBox(l, sw, sh);
    if (l.contactShadow) {
      const rx = b.w * 0.5;
      const ry = Math.max(3, Math.min(rx * 0.13, b.h * 0.06));
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, "rgba(20,14,10,0.38)");
      g.addColorStop(0.45, "rgba(20,14,10,0.14)");
      g.addColorStop(1, "rgba(20,14,10,0)");
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h);
      ctx.scale(1, ry / rx);
      ctx.fillStyle = g;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    }
    shadowOn(ctx, l.shadow);
    ctx.drawImage(img, sx, sy, sw, sh, b.x, b.y, b.w, b.h);
  }
  ctx.restore();
}

function drawLayer(ctx: Ctx2D, l: Layer, env: RenderEnv) {
  if (!l.visible || l.opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, l.opacity));
  if (l.rotation) {
    ctx.translate(l.x + l.w / 2, l.y + l.h / 2);
    ctx.rotate((l.rotation * Math.PI) / 180);
    ctx.translate(-(l.x + l.w / 2), -(l.y + l.h / 2));
  }
  if (l.kind === "image") drawImage(ctx, l, env);
  else if (l.kind === "shape") {
    shadowOn(ctx, l.shadow);
    if (l.shape === "line") {
      ctx.strokeStyle = l.stroke?.color ?? (typeof l.fill === "string" ? l.fill : "#000");
      ctx.lineWidth = l.stroke?.width ?? 2;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y + l.h / 2);
      ctx.lineTo(l.x + l.w, l.y + l.h / 2);
      ctx.stroke();
    } else {
      if (l.shape === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(l.x + l.w / 2, l.y + l.h / 2, l.w / 2, l.h / 2, 0, 0, Math.PI * 2);
      } else roundRect(ctx, l.x, l.y, l.w, l.h, l.radius);
      if (l.fill) {
        ctx.fillStyle = fillStyle(ctx, l.fill, l.x, l.y, l.w, l.h);
        ctx.fill();
      }
      if (l.stroke) {
        shadowOn(ctx, null);
        ctx.strokeStyle = l.stroke.color;
        ctx.lineWidth = l.stroke.width;
        ctx.stroke();
      }
    }
  } else if (l.kind === "text") {
    const { size, lines } = layoutText(ctx, l, env);
    ctx.font = env.font(l.font.family, l.font.weight, size, l.font.italic);
    ctx.fillStyle = l.color;
    ctx.textAlign = l.align;
    ctx.textBaseline = "alphabetic";
    ctx.letterSpacing = `${l.letterSpacing}px`;
    shadowOn(ctx, l.shadow);
    const ax = l.align === "center" ? l.x + l.w / 2 : l.align === "right" ? l.x + l.w : l.x;
    lines.forEach((line, i) => ctx.fillText(line, ax, l.y + size * 0.86 + i * size * l.lineHeight));
    ctx.letterSpacing = "0px";
  } else if (l.kind === "button") {
    shadowOn(ctx, l.shadow);
    roundRect(ctx, l.x, l.y, l.w, l.h, l.radius);
    ctx.fillStyle = fillStyle(ctx, l.fill, l.x, l.y, l.w, l.h);
    ctx.fill();
    shadowOn(ctx, null);
    if (l.stroke) {
      ctx.strokeStyle = l.stroke.color;
      ctx.lineWidth = l.stroke.width;
      ctx.stroke();
    }
    // Libellé trop long pour le bouton (texte modifié) : réduit jusqu'à 60 % plutôt que de déborder.
    let size = l.font.size;
    ctx.font = env.font(l.font.family, l.font.weight, size, l.font.italic);
    while (size > l.font.size * 0.6 && ctx.measureText(l.text).width > l.w * 0.86) {
      size -= 1;
      ctx.font = env.font(l.font.family, l.font.weight, size, l.font.italic);
    }
    ctx.fillStyle = l.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(l.text, l.x + l.w / 2, l.y + l.h / 2 + size * 0.05);
  }
  ctx.restore();
}

/** Dessine le document entier, ou seulement les calques choisis (`only`). */
export function renderDoc(ctx: Ctx2D, doc: AdDocument, env: RenderEnv, only?: (l: Layer) => boolean) {
  if (!only) {
    ctx.fillStyle = doc.background;
    ctx.fillRect(0, 0, doc.width, doc.height);
  }
  for (const l of doc.layers) if (!only || only(l)) drawLayer(ctx, l, env);
}
