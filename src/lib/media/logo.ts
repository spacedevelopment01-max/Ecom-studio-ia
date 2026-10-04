/**
 * Logos vectoriels : rendus par Skia puis exportés en SVG avec le texte
 * converti en tracés — le fichier s'affiche à l'identique partout, sans
 * dépendre des polices installées. Variantes : logotype, empilé,
 * monogramme, emblème.
 */
import { createCanvas, SvgExportFlag, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { ensureFonts, font } from "./fonts";
import { contentLang } from "../i18n-server";
import { intlLocale } from "../i18n";

/** Locale des capitales : langue des contenus (« fr-FR » en français, comme avant). */
const loc = () => intlLocale(contentLang());

export type LogoSpec = {
  name: string;
  tagline?: string;
  family: string;
  weight: number;
  italic?: boolean;
  case: "upper" | "title" | "lower" | "asis";
  tracking: number; // en em (0 à 0,4)
  layout: "wordmark" | "stacked" | "monogram" | "emblem" | "lockup" | "badge";
  emblem: "none" | "circle" | "arch" | "line" | "diamond";
  monogram?: string;
  /** Symbole dessiné (lockup, badge) : une forme simple liée à l'univers du produit. */
  symbol?: SymbolKind;
  color: string;
  /** Couleur d'accent du symbole (sinon couleur du logo). */
  accent?: string;
};

export type SymbolKind = "leaf" | "drop" | "hanger" | "orbit" | "bean" | "paw" | "arch" | "wave" | "facet" | "sun" | "cup" | "spark";
export const SYMBOLS: SymbolKind[] = ["leaf", "drop", "hanger", "orbit", "bean", "paw", "arch", "wave", "facet", "sun", "cup", "spark"];

/**
 * Symboles au trait, construits sur une grille carrée (taille s, coin haut-gauche x, y).
 * Volontairement simples : lisibles à 16 px comme en grand, sans détail superflu.
 */
export function drawSymbol(ctx: SKRSContext2D, kind: SymbolKind, x: number, y: number, s: number, color: string) {
  const lw = Math.max(2, s * 0.065);
  const cx = x + s / 2, cy = y + s / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const stroke = () => ctx.stroke();
  ctx.beginPath();
  switch (kind) {
    case "leaf": {
      ctx.moveTo(x + s * 0.18, y + s * 0.82);
      ctx.bezierCurveTo(x + s * 0.12, y + s * 0.35, x + s * 0.45, y + s * 0.1, x + s * 0.86, y + s * 0.14);
      ctx.bezierCurveTo(x + s * 0.9, y + s * 0.55, x + s * 0.62, y + s * 0.88, x + s * 0.18, y + s * 0.82);
      stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * 0.18, y + s * 0.82);
      ctx.bezierCurveTo(x + s * 0.4, y + s * 0.58, x + s * 0.6, y + s * 0.4, x + s * 0.8, y + s * 0.2);
      stroke();
      break;
    }
    case "drop": {
      ctx.moveTo(cx, y + s * 0.08);
      ctx.bezierCurveTo(x + s * 0.2, y + s * 0.45, x + s * 0.2, y + s * 0.62, x + s * 0.24, y + s * 0.7);
      ctx.arc(cx, y + s * 0.62, s * 0.28, Math.PI * 0.84, Math.PI * 0.16, true);
      ctx.bezierCurveTo(x + s * 0.8, y + s * 0.62, x + s * 0.8, y + s * 0.45, cx, y + s * 0.08);
      stroke();
      ctx.beginPath();
      ctx.arc(cx, y + s * 0.62, s * 0.14, Math.PI * 0.95, Math.PI * 1.45);
      stroke();
      break;
    }
    case "hanger": {
      ctx.arc(cx, y + s * 0.2, s * 0.1, Math.PI * 1.05, Math.PI * 0.45);
      ctx.lineTo(cx, y + s * 0.42);
      ctx.lineTo(x + s * 0.08, y + s * 0.78);
      ctx.lineTo(x + s * 0.92, y + s * 0.78);
      ctx.closePath();
      stroke();
      break;
    }
    case "orbit": {
      ctx.arc(cx, cy, s * 0.24, 0, Math.PI * 2);
      stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 0.46, s * 0.12, -Math.PI / 7, Math.PI * 0.08, Math.PI * 0.92, true);
      stroke();
      ctx.beginPath();
      ctx.arc(cx + s * 0.3, cy - s * 0.32, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bean": {
      ctx.ellipse(cx, cy, s * 0.28, s * 0.4, Math.PI / 7, 0, Math.PI * 2);
      stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.06, y + s * 0.13);
      ctx.bezierCurveTo(cx + s * 0.16, cy - s * 0.12, cx - s * 0.16, cy + s * 0.12, cx + s * 0.06, y + s * 0.87);
      stroke();
      break;
    }
    case "paw": {
      ctx.ellipse(cx, y + s * 0.66, s * 0.2, s * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const [dx, dy, r] of [[-0.28, 0.34, 0.085], [-0.1, 0.2, 0.09], [0.1, 0.2, 0.09], [0.28, 0.34, 0.085]]) {
        ctx.beginPath();
        ctx.ellipse(cx + s * dx, y + s * dy, s * r, s * r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "arch": {
      ctx.moveTo(x + s * 0.14, y + s * 0.9);
      ctx.lineTo(x + s * 0.14, y + s * 0.46);
      ctx.arc(cx, y + s * 0.46, s * 0.36, Math.PI, 0);
      ctx.lineTo(x + s * 0.86, y + s * 0.9);
      stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * 0.34, y + s * 0.9);
      ctx.lineTo(x + s * 0.34, y + s * 0.56);
      ctx.arc(cx, y + s * 0.56, s * 0.16, Math.PI, 0);
      ctx.lineTo(x + s * 0.66, y + s * 0.9);
      stroke();
      break;
    }
    case "wave": {
      for (const k of [0.38, 0.62]) {
        ctx.beginPath();
        ctx.moveTo(x + s * 0.06, y + s * k);
        ctx.bezierCurveTo(x + s * 0.28, y + s * (k - 0.16), x + s * 0.4, y + s * (k + 0.16), cx, y + s * k);
        ctx.bezierCurveTo(x + s * 0.6, y + s * (k - 0.16), x + s * 0.72, y + s * (k + 0.16), x + s * 0.94, y + s * k);
        stroke();
      }
      break;
    }
    case "facet": {
      ctx.moveTo(x + s * 0.24, y + s * 0.22);
      ctx.lineTo(x + s * 0.76, y + s * 0.22);
      ctx.lineTo(x + s * 0.94, y + s * 0.42);
      ctx.lineTo(cx, y + s * 0.88);
      ctx.lineTo(x + s * 0.06, y + s * 0.42);
      ctx.closePath();
      ctx.moveTo(x + s * 0.06, y + s * 0.42);
      ctx.lineTo(x + s * 0.94, y + s * 0.42);
      ctx.moveTo(x + s * 0.36, y + s * 0.22);
      ctx.lineTo(x + s * 0.3, y + s * 0.42);
      ctx.lineTo(cx, y + s * 0.88);
      ctx.lineTo(x + s * 0.7, y + s * 0.42);
      ctx.lineTo(x + s * 0.64, y + s * 0.22);
      stroke();
      break;
    }
    case "sun": {
      ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * s * 0.29, cy + Math.sin(a) * s * 0.29);
        ctx.lineTo(cx + Math.cos(a) * s * 0.43, cy + Math.sin(a) * s * 0.43);
        stroke();
      }
      break;
    }
    case "cup": {
      ctx.moveTo(x + s * 0.14, y + s * 0.46);
      ctx.lineTo(x + s * 0.72, y + s * 0.46);
      ctx.bezierCurveTo(x + s * 0.72, y + s * 0.78, x + s * 0.58, y + s * 0.88, x + s * 0.43, y + s * 0.88);
      ctx.bezierCurveTo(x + s * 0.28, y + s * 0.88, x + s * 0.14, y + s * 0.78, x + s * 0.14, y + s * 0.46);
      stroke();
      ctx.beginPath();
      ctx.arc(x + s * 0.78, y + s * 0.6, s * 0.1, -Math.PI / 2, Math.PI / 2);
      stroke();
      for (const dx of [0.32, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(x + s * dx, y + s * 0.34);
        ctx.bezierCurveTo(x + s * (dx - 0.07), y + s * 0.26, x + s * (dx + 0.07), y + s * 0.2, x + s * dx, y + s * 0.1);
        stroke();
      }
      break;
    }
    case "spark": {
      ctx.moveTo(cx, y + s * 0.06);
      ctx.quadraticCurveTo(cx + s * 0.06, cy - s * 0.06, x + s * 0.94, cy);
      ctx.quadraticCurveTo(cx + s * 0.06, cy + s * 0.06, cx, y + s * 0.94);
      ctx.quadraticCurveTo(cx - s * 0.06, cy + s * 0.06, x + s * 0.06, cy);
      ctx.quadraticCurveTo(cx - s * 0.06, cy - s * 0.06, cx, y + s * 0.06);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function applyCase(s: string, c: LogoSpec["case"]) {
  if (c === "upper") return s.toLocaleUpperCase(loc());
  if (c === "lower") return s.toLocaleLowerCase(loc());
  if (c === "title") return s.replace(/\p{L}+/gu, (w) => w[0].toLocaleUpperCase(loc()) + w.slice(1));
  return s;
}

type Draw = (ctx: SKRSContext2D) => void;

function measure(text: string, family: string, weight: number, size: number, trackingEm: number, italic = false) {
  ensureFonts();
  const c = createCanvas(10, 10).getContext("2d");
  c.font = font(family, weight, size, italic);
  (c as any).letterSpacing = `${trackingEm * size}px`;
  const m = c.measureText(text);
  // L'interlettrage s'ajoute aussi après la dernière lettre : on le retire.
  return { width: m.width - (text.length ? trackingEm * size : 0), ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent };
}

function text(ctx: SKRSContext2D, s: string, x: number, y: number, family: string, weight: number, size: number, trackingEm: number, color: string, italic = false) {
  ctx.font = font(family, weight, size, italic);
  (ctx as any).letterSpacing = `${trackingEm * size}px`;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(s, x, y);
}

function render(width: number, height: number, draw: Draw) {
  const W = Math.ceil(width);
  const H = Math.ceil(height);
  const svgCanvas = createCanvas(W, H, SvgExportFlag.ConvertTextToPaths);
  draw(svgCanvas.getContext("2d"));
  const svg = svgCanvas.getContent().toString("utf8");
  return { svg, width: W, height: H, draw };
}

export function buildLogo(spec: LogoSpec) {
  const name = applyCase(spec.name.trim(), spec.case);
  const color = spec.color;
  const P = 36;
  const fam = spec.family;
  const wt = spec.weight;

  // Symbole + logotype côte à côte (lockup horizontal).
  if (spec.layout === "lockup") {
    const size = 120;
    const m = measure(name, fam, wt, size, spec.tracking, spec.italic);
    const cap = m.ascent;
    const sym = Math.round(cap * 1.9);
    const gap = Math.round(size * 0.32);
    const W = P + sym + gap + m.width + P;
    const H = P + Math.max(sym, m.ascent + m.descent) + P;
    const symY = P + (H - P * 2 - sym) / 2;
    const base = P + (H - P * 2 - (m.ascent + m.descent)) / 2 + m.ascent;
    return render(W, H, (ctx) => {
      drawSymbol(ctx, spec.symbol ?? "spark", P, symY, sym, spec.accent ?? color);
      text(ctx, name, P + sym + gap, base, fam, wt, size, spec.tracking, color, spec.italic);
    });
  }
  // Emblème : symbole dans un cercle, nom et signature centrés dessous.
  if (spec.layout === "badge") {
    const ring = 300;
    const nameSize = 78;
    const words = name.split(/\s+/).filter(Boolean);
    const lines = name.length > 14 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [name];
    const ms = lines.map((l) => measure(l, fam, wt, nameSize, spec.tracking, spec.italic));
    const tag = spec.tagline ? spec.tagline.toLocaleUpperCase(loc()) : "";
    const tagSize = 22;
    const tm = tag ? measure(tag, "Jost", 500, tagSize, 0.26) : null;
    const W = Math.max(ring, ...ms.map((x) => x.width), tm?.width ?? 0) + P * 2;
    const lineGap = nameSize * 1.04;
    const H = P + ring + 44 + ms[0].ascent + lineGap * (lines.length - 1) + ms[ms.length - 1].descent + (tm ? tagSize * 2.6 : 0) + P;
    return render(W, H, (ctx) => {
      const ox = (W - ring) / 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ox + ring / 2, P + ring / 2, ring / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox + ring / 2, P + ring / 2, ring / 2 - 18, 0, Math.PI * 2);
      ctx.stroke();
      drawSymbol(ctx, spec.symbol ?? "spark", ox + ring * 0.27, P + ring * 0.27, ring * 0.46, spec.accent ?? color);
      let y = P + ring + 44 + ms[0].ascent;
      lines.forEach((l, i) => {
        text(ctx, l, (W - ms[i].width) / 2, y, fam, wt, nameSize, spec.tracking, color, spec.italic);
        if (i < lines.length - 1) y += lineGap;
      });
      if (tm) text(ctx, tag, (W - tm.width) / 2, y + ms[ms.length - 1].descent + tagSize * 2, "Jost", 500, tagSize, 0.26, color);
    });
  }

  if (spec.layout === "monogram" || spec.layout === "emblem") {
    const letters = (spec.monogram || name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2)).toLocaleUpperCase(loc());
    const box = 360;
    const size = letters.length > 1 ? 170 : 220;
    const m = measure(letters, fam, wt, size, 0.02, spec.italic);
    const frame = (ctx: SKRSContext2D, ox: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      if (spec.emblem === "circle" || spec.emblem === "none") ctx.arc(ox + box / 2, box / 2, box / 2 - 8, 0, Math.PI * 2);
      if (spec.emblem === "arch") {
        ctx.moveTo(ox + 24, box - 12);
        ctx.lineTo(ox + 24, box / 2);
        ctx.arc(ox + box / 2, box / 2, box / 2 - 24, Math.PI, 0);
        ctx.lineTo(ox + box - 24, box - 12);
      }
      if (spec.emblem === "diamond") {
        ctx.moveTo(ox + box / 2, 10);
        ctx.lineTo(ox + box - 10, box / 2);
        ctx.lineTo(ox + box / 2, box - 10);
        ctx.lineTo(ox + 10, box / 2);
        ctx.closePath();
      }
      if (spec.emblem === "line") {
        ctx.moveTo(ox + 80, box - 70);
        ctx.lineTo(ox + box - 80, box - 70);
      }
      ctx.stroke();
    };
    const mono = (ctx: SKRSContext2D, ox: number) =>
      spec.symbol && spec.layout === "monogram" && spec.monogram === "@symbol"
        ? drawSymbol(ctx, spec.symbol, ox + box * 0.25, box * 0.25, box * 0.5, spec.accent ?? color)
        : text(ctx, letters, ox + (box - m.width) / 2, box / 2 + (m.ascent - m.descent) / 2, fam, wt, size, 0.02, color, spec.italic);
    if (spec.layout === "monogram") {
      return render(box, box, (ctx) => {
        frame(ctx, 0);
        mono(ctx, 0);
      });
    }
    const nameSize = 60;
    const nm = measure(name, fam, wt, nameSize, spec.tracking);
    const W = Math.max(box, nm.width) + P * 2;
    const H = box + 40 + nm.ascent + nm.descent + P;
    return render(W, H, (ctx) => {
      frame(ctx, (W - box) / 2);
      mono(ctx, (W - box) / 2);
      text(ctx, name, (W - nm.width) / 2, box + 40 + nm.ascent, fam, wt, nameSize, spec.tracking, color);
    });
  }

  const size = 120;
  if (spec.layout === "stacked") {
    const words = name.split(/\s+/).filter(Boolean);
    const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [name];
    const ms = lines.map((l) => measure(l, fam, wt, size, spec.tracking, spec.italic));
    const tagSize = 30;
    const tag = spec.tagline ? spec.tagline.toLocaleUpperCase(loc()) : "";
    const tm = tag ? measure(tag, "Jost", 500, tagSize, 0.24) : null;
    const W = Math.max(...ms.map((m) => m.width), tm?.width ?? 0) + P * 2;
    const lineGap = size * 1.02;
    const H = P + ms[0].ascent + lineGap * (lines.length - 1) + ms[ms.length - 1].descent + (tm ? tagSize * 2.4 : 0) + P;
    return render(W, H, (ctx) => {
      let y = P + ms[0].ascent;
      lines.forEach((l, i) => {
        text(ctx, l, (W - ms[i].width) / 2, y, fam, wt, size, spec.tracking, color, spec.italic);
        if (i < lines.length - 1) y += lineGap;
      });
      if (tm) text(ctx, tag, (W - tm.width) / 2, y + ms[ms.length - 1].descent + tagSize * 1.9, "Jost", 500, tagSize, 0.24, color);
    });
  }
  const m = measure(name, fam, wt, size, spec.tracking, spec.italic);
  const ruled = spec.emblem === "line";
  const W = m.width + P * 2;
  const H = P + m.ascent + m.descent + P + (ruled ? 26 : 0);
  return render(W, H, (ctx) => {
    text(ctx, name, P, P + m.ascent, fam, wt, size, spec.tracking, color, spec.italic);
    if (ruled) {
      ctx.fillStyle = color;
      ctx.fillRect(P, P + m.ascent + m.descent + 20, m.width, 5);
    }
  });
}

export function buildLogoSvg(spec: LogoSpec) {
  const b = buildLogo(spec);
  return { svg: b.svg, width: b.width, height: b.height };
}

/** Rendu matriciel net (dessiné directement par Skia). */
export async function logoPng(spec: LogoSpec, width: number): Promise<Buffer> {
  const built = buildLogo(spec);
  const scale = width / built.width;
  const c = createCanvas(Math.round(built.width * scale), Math.round(built.height * scale));
  const ctx = c.getContext("2d");
  ctx.scale(scale, scale);
  built.draw(ctx);
  return c.encode("png");
}

/** Ensemble livrable : logo principal (SVG + PNG), version claire, monogramme et favicon. */
export async function logoSet(spec: LogoSpec, lightColor = "#FFFFFF") {
  // Avec un symbole, la marque réduite (monogramme, favicon) reprend le symbole plutôt que les initiales.
  const withSymbol = !!spec.symbol && (spec.layout === "lockup" || spec.layout === "badge");
  const monoSpec: LogoSpec = { ...spec, layout: "monogram", emblem: spec.emblem === "none" || spec.emblem === "line" ? "circle" : spec.emblem, ...(withSymbol ? { monogram: "@symbol" } : {}) };
  const lightSpec = { ...spec, color: lightColor, accent: lightColor };
  return {
    mainSvg: buildLogo(spec).svg,
    mainPng: await logoPng(spec, 1200),
    lightSvg: buildLogo(lightSpec).svg,
    lightPng: await logoPng(lightSpec, 1200),
    monoSvg: buildLogo(monoSpec).svg,
    monoPng: await logoPng(monoSpec, 800),
    faviconPng: await sharp(await logoPng(monoSpec, 384)).resize(192, 192).png().toBuffer(),
  };
}
